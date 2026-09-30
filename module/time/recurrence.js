/**
 * Long-Clock Recurrence — foundry-system-index.csv "Long-Clock Recurrence".
 *
 * An effect that fires REPEATEDLY on the exploration clock — every day, every
 * week, every Exploration Turn — for as long as a condition holds, and stops
 * when it is cured or the holder dies.
 *
 * WHY IT IS NOT EITHER OF THE TWO RECURRENCES THAT ALREADY EXIST. Per-Round
 * Effect Reminder and Round-Duration Expiry both tick on COMBAT ROUNDS, and a
 * disease that costs a point of EGO per day cannot use either. And it is not
 * Timed Condition Duration, which schedules ONE event at the end of a span: a
 * recurrence has no end date at all, only an exit condition. Jellybones is the
 * clearest case — it has no duration whatsoever, it simply takes STR and CON
 * every week until cured or dead.
 *
 * A THIRD ENTRY SHAPE ON THE SAME BOARD, discriminated by `kind` exactly as
 * activity.js is. It shares the `vaarn.effects` actor flag, the TIME_HOOK
 * sweep and the activeGM guard, because a Referee looking for what is running
 * on somebody should find all of it in one window. Like an activity, it
 * leaves `expiresAtTime` and `expiresAtRound` null — that is what stops the
 * board's own sweepExpired() from deleting it as a lapsed effect, and it is
 * load-bearing rather than tidiness.
 *
 * WHY AN ABSOLUTE TICK INDEX AND NEVER A COUNTER. Inherited unchanged from the
 * board's own reasoning: a stored number that is incremented is corrupted by a
 * missed or doubled hook and nothing afterwards can tell that it happened. So
 * the tick index is DERIVED from the clock — floor((now - startTime) / period)
 * — and `announcedIndex` is set to that derived value rather than advanced by
 * the number fired. A doubled hook therefore computes the same index twice and
 * the second call finds nothing due.
 *
 * A REWIND UN-FIRES. `delta` is negative when a Referee corrects an
 * over-advance. Winding back past a tick lowers the derived index below
 * `announcedIndex`, and this module lowers `announcedIndex` to match rather
 * than announcing anything — so the tick can fire again when the clock returns
 * to that point. Activity Time Cost needed exactly this fix in testing on
 * 2026-09-08, where a rewind left a finished effort unable to ever report
 * again; this is the same property built in from the start rather than
 * retrofitted.
 *
 * THE TICK ANNOUNCES; A BUTTON ON THE CARD APPLIES. The tick itself never
 * writes to an actor, so a card nobody touches has changed nothing — and for
 * Lumenrot and the Gitch it MUST wait, because the loss is owed only on a
 * failed save. What the buttons do is Matt's, in two rulings a day apart:
 *
 *   2026-09-08  items. Three clauses add or remove a thing that has to EXIST
 *               before a slot can hold it. Gitch Crystals creates a `wound`
 *               Item on the actor — the shape _applyWound has used since the
 *               Wounds table was built, and the book calls it "a Wound: Gitch
 *               Crystals" in as many words. Deathblight and Flab remove one,
 *               because those two tick DOWNWARDS: the recurrence is the
 *               healing, not the harm. Fabricator Stoma's extruded object goes
 *               to the Dropped Items container rather than the sheet, since one
 *               a morning would quietly fill an inventory with picnic plates.
 *
 *   2026-09-09  ability and HP loss, which REVISES the announce-only ruling of
 *               the day before. Matt's question was the argument: there is
 *               already a field for recording ability damage and the base score
 *               is not what moves. So the roll button became an apply button —
 *               see applyTickLosses for what it writes and why "maximum" goes
 *               to woundDamage rather than to the base value.
 *
 * WHAT IS STILL ONLY ANNOUNCED, and it is one half of one clause: Labyrinth
 * Pox's "gains an equal number of new inventory slots". Two slot fields exist
 * with different meanings and neither is plainly the one the book means, so
 * writing either would be settling a question about a model nobody has
 * reconciled. recurrence-data.js carries the reasoning on the entry itself.
 */

import { SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_TURN } from "./vaarn-time.js";
import { SCOPE, entriesOf, setEntries, updateEntry } from "./effect-board.js";
import { RECURRENCES, recurrenceByKey } from "./recurrence-data.js";
import { findContainer, ensureContainer } from "../actor/dropped-container.js";
import { gmHP } from "../actor/hidden-hp.js";
import { MAX_HP_DEFERRED, zeroMaxHpMessage } from "../actor/zero-max-hp.js";
import { applyNamedWound, forgetWoundItems } from "../actor/named-wound.js";
import { TRAPS } from "../combat/trap-data.js";

export { RECURRENCES, recurrenceByKey };

/**
 * Repeat intervals. `week` lives HERE and not in vaarn-time.js's UNITS map,
 * for the reason recurrence-data.js gives at length: nothing in the book
 * authors a duration in weeks, so a week is a repeat interval rather than a
 * unit on the clock's number line. Adding it to UNITS would let a duration be
 * written in it, which is a different mechanism entirely.
 */
export const PERIODS = {
  turn: { label: "Exploration Turn", plural: "Exploration Turns", seconds: SECONDS_PER_TURN },
  hour: { label: "hour",            plural: "hours",             seconds: SECONDS_PER_HOUR },
  day:  { label: "day",             plural: "days",              seconds: SECONDS_PER_DAY },
  week: { label: "week",            plural: "weeks",             seconds: SECONDS_PER_DAY * 7 }
};

/* -------------------------------------------- */
/*  Pure arithmetic — no `game`, so an offline test can reach all of it.      */
/* -------------------------------------------- */

/** Is this board entry a recurrence rather than an effect or an activity? */
export function isRecurrence(entry)
{
  return entry?.kind === "recurrence";
}

/** Seconds between ticks, or 0 if the entry names no usable period. */
export function periodSeconds(entry)
{
  const per = PERIODS[entry?.periodUnit]?.seconds;
  const n = Number(entry?.periodAmount) || 0;
  if (!per || n <= 0) return 0;
  return per * n;
}

/**
 * How many whole periods have elapsed since the recurrence started.
 *
 * Floor of a difference, so it is a pure function of the clock and carries no
 * memory. Negative when the clock has been wound back before the start, which
 * ticksDue() reads as "nothing is owed" rather than as a fault.
 */
export function tickIndexAt(entry, now)
{
  const period = periodSeconds(entry);
  if (!period) return 0;
  return Math.floor((now - (Number(entry.startTime) || 0)) / period);
}

/**
 * Ticks owed since the last announcement. Never negative — a rewind is
 * handled by lowering `announcedIndex`, not by owing a negative number.
 */
export function ticksDue(entry, now)
{
  return Math.max(0, tickIndexAt(entry, now) - (Number(entry.announcedIndex) || 0));
}

/** Has the clock moved back behind what was already announced? */
export function isRewound(entry, now)
{
  return tickIndexAt(entry, now) < (Number(entry.announcedIndex) || 0);
}

/** Absolute worldTime of the next tick after `now`. */
export function nextTickAt(entry, now)
{
  const period = periodSeconds(entry);
  if (!period) return null;
  const start = Number(entry.startTime) || 0;
  return start + (tickIndexAt(entry, now) + 1) * period;
}

/** Seconds until the next tick. */
export function secondsToNextTick(entry, now)
{
  const next = nextTickAt(entry, now);
  return next === null ? null : next - now;
}

/** "every day", "every 2 weeks" — the interval as a Referee reads it. */
export function formatPeriod(entry)
{
  const p = PERIODS[entry?.periodUnit];
  const n = Number(entry?.periodAmount) || 0;
  if (!p || n <= 0) return "no interval";
  return n === 1 ? `every ${p.label}` : `every ${n} ${p.plural}`;
}

/** "3 days" — how much was skipped, for a card announcing N ticks at once. */
export function formatTicks(entry, n)
{
  const p = PERIODS[entry?.periodUnit];
  if (!p) return `${n} ticks`;
  const amount = n * (Number(entry?.periodAmount) || 1);
  return `${amount} ${amount === 1 ? p.label : p.plural}`;
}

/* -------------------------------------------- */
/*  Thresholds                                                                */
/* -------------------------------------------- */

/**
 * Has this recurrence reached the floor the book gives it?
 *
 * ANNOUNCE ONLY — this returns the book's sentence and never acts on it.
 * RULED 2026-09-08 (Matt). Every one of these floors is a transformation or a
 * death the book states narratively ("they become a Hiveyman NPC", "they
 * dissolve into luminous slime"), and whether that is a new Actor or this one
 * changed is a question the book does not answer. The index has been caught
 * assuming exactly that before, which is why it is not assumed here.
 */
export function thresholdReached(actor, entry)
{
  const def = recurrenceByKey(entry?.recurrenceKey);
  const t = def?.threshold;
  if (!t || !actor) return null;

  const sys = actor.system ?? {};
  switch (t.watch)
  {
    case "ability":
    {
      const score = Number(sys.abilities?.[t.key]?.effective);
      return Number.isFinite(score) && score <= (t.at ?? 0) ? t.text : null;
    }
    case "maxHp":
    {
      const max = Number(sys.health?.max);
      return Number.isFinite(max) && max <= (t.at ?? 0) ? t.text : null;
    }
    case "slotsFull":
    {
      // WOUNDS filling every slot, never gear (RULED 2026-09-25, Matt): the
      // book's "filled with Gitch crystals", and the player drops gear to make
      // room rather than being transformed by a full pack. The wound-slot sum
      // is the one wound-slot death reads (named-wound.js checkWoundDeath).
      const used = (sys.wounds ?? []).reduce((n, w) => n + (Number(w.slots) || 0), 0);
      const cap  = Number(sys.inventorySlots?.value);
      return Number.isFinite(cap) && cap > 0 && used >= cap ? t.text : null;
    }
    case "woundGone":
      return woundItemsNamed(actor, t.wound).length === 0 ? t.text : null;
    default:
      return null;
  }
}

/* -------------------------------------------- */
/*  Suppression — a tick the book itself says does not happen.                */
/* -------------------------------------------- */

/**
 * Why this recurrence should not fire right now, or null if it should.
 *
 * ONE CASE, NAMED EXPLICITLY, and deliberately not a general predicate system.
 * The Toxin Die's clause is conditional in the book — "If the PCs are not in
 * combat, they should roll their TD ... every exploration turn" — because in
 * combat the same die is rolled every round instead, which existing machinery
 * already covers. Firing both would double a poison's damage.
 *
 * The second half is not a rule, it is arithmetic: an actor whose TD has
 * depleted to Cured has no die to roll, so a prompt to roll it is noise.
 *
 * Written as a switch on the affliction rather than as a `skipWhen` flag in
 * recurrence-data.js on purpose. A flag named for a condition invites the next
 * one to be expressed as data too, and the mechanism would then quietly grow a
 * predicate language — the same "a name that describes a subject" trap
 * CLAUDE.md warns about. One case, one branch, visible.
 */
export function suppressedReason(actor, entry)
{
  if (entry?.recurrenceKey !== "toxin-die") return null;
  if (game.combat?.started)
    return "in combat — the TD is rolled each round instead";
  const die = actor?.system?.toxinDie?.die;
  if (!die) return "no Toxin Die — cured";
  return null;
}

/** The live TD size, for the board readout. Null for every other affliction. */
export function toxinDieOf(actor, entry)
{
  if (entry?.recurrenceKey !== "toxin-die") return null;
  return actor?.system?.toxinDie?.die || null;
}

/* -------------------------------------------- */
/*  Ability and HP loss                                                       */
/* -------------------------------------------- */

/**
 * Apply one tick's stated losses to an actor, `ticks` times over.
 *
 * RULED 2026-09-09 (Matt), revising the announce-only ruling of the day
 * before. His question was the whole argument: there is already a field for
 * recording ability damage, and the base score is not the thing that moves.
 * `_applyWound` has done `abilities[key].woundDamage += n` since the Wounds
 * table was built and has never touched `value`, with actor.js deriving
 * `effective = value + bonuses - woundDamage`. So a disease taking a point of
 * CON is the same operation a wound performs, and leaving it to be typed in by
 * hand was the one non-item tick with an established home it was not using.
 *
 * "MAXIMUM" GOES TO woundDamage TOO, and that is a ruling rather than a
 * reading. Lumenrot says "one point of maximum CON" and the book means
 * something by "maximum", but there is no maximum-ability field to reduce —
 * the `defense` field is derived as effective + 10 — so the only alternative
 * was the base score, and reducing that permanently is Permanent Ability Score
 * Change, which is a separate row and not this one's to build.
 *
 * THE QUOTE ABOVE WAS RE-TRANSCRIBED 2026-09-20 and the ruling is untouched.
 * CRIMSON HOUND read "one point of maximum CON DEFENCE"; JADE IBIS 15-09-26
 * drops the word, here and in the four other places the book used it of an
 * ability score or of AV. Note which way that cuts: the old wording was the
 * puzzle this paragraph set out to solve, since "CON defence" named a thing
 * that does exist as a derived field. With the word gone the book simply says
 * "maximum CON", there is still no such field, and the ruling stands on the
 * same ground rather than on a reading of a word that has been withdrawn.
 *
 * MAX HP IS THE EXCEPTION, because it has a real field and wounds already
 * reduce it: Labyrinth Pox writes `health.max` directly, exactly as a Bloody
 * Gash does.
 *
 * A DIE IS ROLLED PER TICK, not once and multiplied. Three days of a d4 loss
 * is three d4s, which is what "loses -d4 per week" says for three weeks.
 */
export async function applyTickLosses(actor, def, ticks = 1)
{
  const spec = def?.applies ?? [];
  if (!spec.length || !actor) return { lines: [], death: null };

  const abilities = foundry.utils.deepClone(actor.system.abilities);
  let maxHp = Number(actor.system.health?.max) || 0;
  // Container Slot Capacity (2026-09-20): slots granted by the same roll that
  // took the HP off, for Labyrinth Pox's "an equal number".
  let cargoGain = 0;
  const lines = [];

  for (const a of spec)
  {
    let total = 0;
    for (let i = 0; i < ticks; i++)
    {
      if (a.formula)
      {
        const r = new Roll(a.formula);
        await r.evaluate({ async: true });
        total += r.total;
      }
      else total += Number(a.amount) || 0;
    }
    if (!total) continue;

    if (a.target === "ability" && abilities[a.key])
    {
      abilities[a.key].woundDamage = (Number(abilities[a.key].woundDamage) || 0) + total;
      lines.push(`${a.label} damage +${total} (total ${abilities[a.key].woundDamage})`);
    }
    else if (a.target === "maxHp")
    {
      // MAXIMUM HP STOPS AT 0 (RULED 2026-09-24, Matt): Labyrinth Pox's Stage 2
      // "lasts until the character's maximum HP is zero", so a roll bigger than
      // what is left takes only what is left, and the slots granted are the HP
      // actually lost - "an equal number" - not the roll.
      const lost = Math.min(total, Math.max(0, maxHp));
      maxHp -= lost;
      const capped = lost < total ? ` (rolled ${total}; maximum HP stops at 0)` : "";
      lines.push(`${a.label} -${lost}${capped}${gmHP(actor, ` (now ${maxHp})`)}`);
      // The same total, never a second roll — see the roster entry.
      if (a.grantsSlots) cargoGain += lost;
    }
  }

  if (!lines.length) return { lines: [], death: null };
  const update = { "system.abilities": abilities };
  // The cargo compartment grows — Container Slot Capacity, 2026-09-20. Only a
  // character has one; no other Actor type carries system.cargo, and nothing
  // in the recurrence roster grants slots to a creature.
  if (cargoGain && actor.type === "character")
  {
    const capacity = (Number(actor.system.cargo?.capacity) || 0) + cargoGain;
    update["system.cargo.capacity"] = capacity;
    lines.push(`Inventory slots +${cargoGain} inside their hollowing body (now ${capacity})`);
  }
  // THE DEATH LINE FOLLOWS THE REPORT (RULED 2026-09-24, Matt; Group 364).
  // The zero-max-HP hook would post "is dead" during the write, before the
  // caller reports the loss that caused it - the poison path's Group 225 fault.
  // So this write defers it and hands the same sentence back for the caller
  // to post after its report.
  const death = Number(actor.system.health?.max) > 0 && maxHp <= 0 ? zeroMaxHpMessage(actor) : null;
  if (maxHp !== actor.system.health.max)
  {
    update["system.health.max"] = maxHp;
    // Clamp current HP the way _prepareCharacterData would on the next render,
    // so a character never sits above a maximum that has just dropped.
    if (Number(actor.system.health.value) > maxHp)
      update["system.health.value"] = maxHp;
  }
  await actor.update(update, death ? { [MAX_HP_DEFERRED]: true } : {});
  return { lines, death };
}

/**
 * Has this card's tick already been actioned through the given counter?
 *
 * Absolute, like everything else here: the card names the tick index it
 * covers, and the entry records the highest index already actioned. A second
 * click on a re-rendered card therefore compares equal and is refused, while a
 * genuinely later tick compares greater and goes through. A boolean "used"
 * flag could not tell those two apart.
 */
export function alreadyActioned(entry, field, index)
{
  return (Number(entry?.[field]) || 0) >= Number(index);
}

/** Does this affliction's loss wait on a failed save? */
export function appliesOnFail(def)
{
  return (def?.applies ?? []).some(a => a.onFail);
}

/* -------------------------------------------- */
/*  Items — the other thing a tick may write, and only via a button.          */
/* -------------------------------------------- */

/**
 * Every `wound` Item on the actor carrying the given affliction's name.
 *
 * Prefix match, because _applyWound names its Items "<name> (Wound xN)" and
 * this module creates them the same way. Matching the bare name would miss
 * every one of them.
 */
export function woundItemsNamed(actor, name)
{
  if (!actor || !name) return [];
  return actor.items.filter(i => i.type === "wound" && i.name.startsWith(name));
}

/**
 * Create one slot of a named wound on the actor.
 *
 * A WOUND THAT REDUCES AN ABILITY - Gitch Crystals, RULED 2026-09-22 (Matt):
 * "this should be able to work exactly like any other wound that reduces an
 * ability". So a spec declaring `abilityPerSlot` writes that many points to
 * woundDamage per slot marked, as _applyWound's abilityFlat does for the
 * Wounds table, with the same chat line. The ability is the affliction's
 * INFECTED one - `bookSlot`, rolled at contraction - never `abilitySlot`,
 * which also holds any slots borrowed from displaced implants.
 */
export async function addWoundSlot(actor, spec, afflictionKey = null)
{
  const slots = Math.max(1, Number(spec?.slots) || 1);
  // THROUGH THE NAMED-WOUND PATH since 2026-09-25 (RULED, Matt), so the
  // crystals reach the Wounds tab and wound-slot death - which, with a
  // threshold that turns the holder into a creature, posts the Gitchghast
  // instead of killing them. Rest-proof: debridement is their removal.
  const becomes = recurrenceByKey(afflictionKey)?.threshold?.becomes ?? null;
  const made = await applyNamedWound(actor, { key: spec.key ?? spec.name, name: spec.name, slots,
    effect: spec.description ?? "", ...(spec.restProof ? { restProof: spec.restProof } : {}),
    ...(becomes ? { becomes } : {}) });
  if (!made) return null;

  if (spec?.abilityPerSlot && afflictionKey)
  {
    const aff = actor.items.find(i => i.system?.afflictionKey === afflictionKey);
    const key = String(aff?.system?.bookSlot ?? "").trim().toLowerCase();
    if (["str", "dex", "con", "int", "psy", "ego"].includes(key))
    {
      const amount = Number(spec.abilityPerSlot) * slots;
      const ability = actor.system?.abilities?.[key];
      const total = Number(ability?.woundDamage ?? 0) + amount;
      await actor.update({ [`system.abilities.${key}.woundDamage`]: total });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<b>${spec.name}</b> — ${key.toUpperCase()} wound damage +${amount} `
               + `(total ${total}, effective bonus now ${Number(ability?.value ?? 0) - total})`
      });
    }
  }
  return made;
}

/**
 * Remove one slot of a named wound. Returns the Item removed, or null when
 * there was none left — which is the normal way a fading affliction ends, not
 * an error.
 */
export async function removeWoundSlot(actor, name)
{
  const held = woundItemsNamed(actor, name);
  if (!held.length) return null;
  const item = held[0];
  const info = { id: item.id, name: item.name };
  await item.delete();
  await forgetWoundItems(actor, [info.id]);
  return info;
}

/**
 * A LOSS THAT FADES RATHER THAN HEALS - the Occulith's Lithifying Gaze, Live
 * AV Computation wiring, RULED 2026-09-25 (Matt): "Target loses d6 DEX and
 * gains +2 AV per round ... Both effects fade at the rate of one point per
 * day."
 *
 * ONE RECURRENCE ENTRY holds both halves as `applied` deltas - AV up, the
 * ability down - so activeDeltas feeds them to the sheet with no reader of
 * its own, and rest cannot heal the loss the way it heals woundDamage: the
 * book gives it one way out, the fade. The gaze's first hit and each round's
 * button add to the same entry; the daily card's Fade button takes a point off
 * each half, and the entry goes when both reach zero.
 */
export async function addFading(actor, recurrenceKey, { ability = null, amount = 0, av = 0 } = {})
{
  const def = recurrenceByKey(recurrenceKey);
  if (!def || !actor) return null;
  let entry = entriesOf(actor).find(e => isRecurrence(e) && e.recurrenceKey === recurrenceKey);
  if (!entry) entry = await startRecurrence(actor, { recurrenceKey });
  const applied = { av: 0, abilities: {}, ...(entry.applied ?? {}) };
  applied.av = Number(applied.av || 0) + Number(av || 0);
  if (ability && amount)
    applied.abilities = { ...applied.abilities,
      [ability]: Number(applied.abilities?.[ability] || 0) - Number(amount) };
  await updateEntry(actor, entry.id, { applied });
  return applied;
}

/**
 * One day's fade: every half of the entry moves a point toward zero. Returns
 * what is left, or null once nothing is and the entry is gone.
 */
export async function fadeOnce(actor, entryId)
{
  const entry = entriesOf(actor).find(e => e.id === entryId);
  if (!entry) return null;
  const toward0 = n => n > 0 ? n - 1 : n < 0 ? n + 1 : 0;
  const applied = { ...(entry.applied ?? {}) };
  applied.av = toward0(Number(applied.av || 0));
  applied.abilities = Object.fromEntries(Object.entries(applied.abilities ?? {})
    .map(([k, v]) => [k, toward0(Number(v))]).filter(([, v]) => v !== 0));
  if (!applied.av && !Object.keys(applied.abilities).length)
  {
    await setEntries(actor, entriesOf(actor).filter(e => e.id !== entryId));
    return null;
  }
  await updateEntry(actor, entryId, { applied });
  return applied;
}

/** "+3 AV, -4 DEX" for a fading entry's current deltas. */
export function fadingSummary(applied)
{
  const bits = [];
  if (applied?.av) bits.push(`${applied.av > 0 ? "+" : ""}${applied.av} AV`);
  for (const [k, v] of Object.entries(applied?.abilities ?? {}))
    bits.push(`${v > 0 ? "+" : ""}${v} ${k.toUpperCase()}`);
  return bits.join(", ") || "nothing";
}

/**
 * Put an extruded object in the Dropped Items container.
 *
 * RULED 2026-09-08 (Matt). The box rather than the sheet, so a month of
 * Fabricator Stoma does not quietly consume thirty inventory slots, and so
 * picking it up is the player's deliberate act through the transfer path that
 * Item Transfer Between Actors already provides.
 */
export async function extrudeObject(actor, label)
{
  await ensureContainer();
  const box = findContainer();
  if (!box)
  {
    ui.notifications?.warn("No Dropped Items container — the object could not be extruded.");
    return null;
  }
  const cls = getDocumentClass("Item");
  return cls.create({
    name: label,
    type: "item",
    system: {
      slots: 1,
      description: `Extruded through ${actor?.name ?? "a host"}'s Fabricator Stoma.`
    }
  }, { parent: box });
}

/* -------------------------------------------- */
/*  Operations                                                                */
/* -------------------------------------------- */

/**
 * Begin a recurrence on an actor.
 *
 * `announcedIndex` starts at 0 and the first tick therefore lands one whole
 * period after the start, never immediately. That is the reading the book's
 * wording supports — "loses one point of EGO per day" is a day of having it,
 * not a point on contraction — and it also keeps starting one from doing
 * anything to a character in the same click.
 */
export async function startRecurrence(actor, data)
{
  const now = game.time?.worldTime ?? 0;
  const def = recurrenceByKey(data?.recurrenceKey);
  const period = def?.period ?? {};
  const entry = {
    id: foundry.utils.randomID(),
    kind: "recurrence",
    name: String(data.name ?? def?.name ?? "Recurrence"),
    text: String(data.text ?? def?.tick ?? ""),
    note: String(data.note ?? ""),
    itemId: data.itemId ?? null,
    origin: actor.type === "npc" ? "npc" : "pc",
    revealed: false,
    revealLabel: "",
    recurrenceKey: data.recurrenceKey ?? null,
    periodAmount: Math.max(1, Number(data.periodAmount ?? period.amount) || 1),
    periodUnit: data.periodUnit ?? period.unit ?? "day",
    // The Fabricator Stoma object, rolled once at contraction because the
    // book says "It is always the same object".
    objectLabel: data.objectLabel ?? null,
    // Gift Sustained Use Cost. The FACES rather than a formula string, so the
    // multi-tick roll is `${ticks}d${faces}` and there is one source for the
    // die instead of a display copy and a parsed one that can disagree.
    // Null on every affliction, which is what isGiftSustain() reads.
    giftDieFaces: Number(data.giftDieFaces) || null,
    // A VAULT HAZARD's tick (Trap Resolution, shape C, RULED 2026-09-26 by
    // Matt): the trap-data.js key its buttons come from, and for the
    // Hypergeometric Vortex which half its first tick is. A projector's
    // per-character tick names the projector as an endsWithSource source, so
    // destroying it ends every one. Null on every affliction and Gift.
    trapKey: data.trapKey ?? null,
    vortexFirst: data.vortexFirst ?? null,
    sourceActorId: data.sourceActorId ?? null,
    sourceName: data.sourceName ?? null,
    endsWithSource: !!data.endsWithSource,
    startTime: now,
    announcedIndex: 0,
    // WHAT HAS ALREADY BEEN APPLIED, as absolute tick indices rather than as
    // a DOM flag on the button. Found in live testing 2026-09-09: disabling
    // the button after a click is not stored in the chat message, so any
    // re-render — a new message arriving, a scroll, an F5 — brings the card
    // back with its buttons live and the same tick can be applied twice.
    // Double-applying a disease tick is silent and wrong, and the card looks
    // identical either way. Two counters rather than one, because the apply
    // and item buttons sit on the same card and neither should block the other.
    appliedIndex: 0,
    itemIndex: 0,
    // Never on either expiry number line. Same reason activity.js says so in
    // its own comment: this is what keeps the board's sweep from deleting it.
    unit: null,
    amount: null,
    startRound: null,
    expiresAtTime: null,
    expiresAtRound: null
  };
  await setEntries(actor, [...entriesOf(actor), entry]);
  return entry;
}

/**
 * Start a sustained Mystic Gift — foundry-system-index.csv "Gift Sustained
 * Use Cost".
 *
 * WHAT THE BOOK STATES, and it is one sentence in Core Rules/Mystic Gifts.md:
 * "Some Gifts, such as mind control or force barriers, can be used for
 * extended durations. In such cases the character must pay HP for each
 * ten-minute period that the Gift is active." A ten-minute period is one
 * Exploration Turn on this clock, which is why this is a recurrence and not a
 * second timing mechanism — see vaarn-time.js for why ten minutes.
 *
 * THREE THINGS THE BOOK DOES NOT SAY, all ruled by Matt 2026-09-13:
 *
 *   THE DIE is the same one the cast paid. The HP Cost table is keyed to the
 *   LEVEL OF THE TARGET, and a target's Level does not change while the Gift
 *   is held — so re-deriving it every period would ask a question whose answer
 *   cannot have moved.
 *
 *   THE CAST COVERS THE FIRST PERIOD. `startTime` is now, so tick index 1
 *   lands one Exploration Turn after the cast and the first sustain charge is
 *   the second time HP is paid, not the first. This is why a Gift used briefly
 *   costs exactly what it costs today: nothing about the existing path changes
 *   for anyone who does not tick the box.
 *
 *   IT DOES NOT STOP AT 0 HP. "Apply it and keep ticking - and this should
 *   start causing wounds." Nothing in CRIMSON HOUND forbids using a Gift at 0
 *   HP — the only three Gift prohibitions in the book are Mind Shield,
 *   Psyche-Suppressant and the Normality Field Projector, and none of them is
 *   about HP. So the charge needs no special case at all: the pay button routes
 *   through _resolveHPChange, which already sends a character below 0 to the
 *   Wounds table. A wielder who will not let go can wound and kill themselves,
 *   and that is the rule working rather than a gap in it.
 *
 * WHAT STOPS IT is the board's own `.vaarn-effect-end` control, which already
 * ends any entry. No new control, and deliberately no automatic exit: the
 * book gives a sustained Gift no duration, only a cost per period.
 */
export async function startGiftSustain(actor, item, faces)
{
  return startRecurrence(actor, {
    name: `${item.name} (sustained)`,
    text: `Sustaining <b>${item.name}</b> — d${faces} HP for each ten-minute period it stays active.`,
    itemId: item.id ?? null,
    periodAmount: 1,
    periodUnit: "turn",
    giftDieFaces: faces
  });
}

/** Is this recurrence a held Gift rather than an affliction? */
export function isGiftSustain(entry)
{
  return isRecurrence(entry) && Number(entry?.giftDieFaces) > 0;
}

/** Stop a recurrence — a cure, or the Referee ending it. */
export async function stopRecurrence(actor, id)
{
  const entries = entriesOf(actor);
  const entry = entries.find(e => e.id === id);
  if (!entry) return null;
  await setEntries(actor, entries.filter(e => e.id !== id));
  return entry;
}

/** Every recurrence in the world, paired with its actor. */
export function collectRecurrences()
{
  const out = [];
  for (const actor of game.actors)
    for (const entry of entriesOf(actor))
      if (isRecurrence(entry)) out.push({ actor, entry });
  return out;
}

/**
 * Work out what is owed, and record that it has been announced.
 *
 * Writes `announcedIndex` to the DERIVED index rather than adding the number
 * fired, which is what makes a doubled hook a no-op. A rewind lowers it and
 * announces nothing.
 */
export async function claimDueTicks({ now = null } = {})
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  const due = [];
  for (const { actor, entry } of collectRecurrences())
  {
    if (isRewound(entry, t))
    {
      await updateEntry(actor, entry.id, { announcedIndex: tickIndexAt(entry, t) });
      continue;
    }
    const n = ticksDue(entry, t);
    if (n <= 0) continue;

    // CLAIMED EVEN WHEN SUPPRESSED, which is the whole point of separating the
    // two. The time genuinely passed and the book's clause genuinely did not
    // apply, so those ticks are spent rather than owed — leaving them unclaimed
    // would bank a backlog and dump it the moment combat ended or a new Toxin
    // Die was incurred, reporting rolls for turns the rule never covered.
    await updateEntry(actor, entry.id, { announcedIndex: tickIndexAt(entry, t) });
    if (suppressedReason(actor, entry)) continue;
    due.push({ actor, entry, ticks: n, index: tickIndexAt(entry, t) });
  }
  return due;
}

/* -------------------------------------------- */
/*  Announcements                                                             */
/* -------------------------------------------- */

/**
 * The save line, with its Virulence working shown so a Referee can override,
 * and — since 2026-09-16 — the button that rolls it. The daily save was text
 * until Save-Modifier Effects on the Forgettable Tab asked how Heightened
 * Immune System could reach it; the answer is the same as the exposure card's:
 * a roll made from the card knows what it is against. The handler is in
 * knave.js beside the tick's other buttons. One button rolls every owed tick.
 */
function saveLine(actor, entry, def, ticks, index)
{
  if (!def?.save) return "";
  // JADE IBIS: the Virulence IS the target (see saveTargetFor in
  // affliction-data.js, rebased 2026-09-16).
  const target = Number.isFinite(def.virulence) ? def.virulence : null;
  const vs = target === null
    ? ""
    : ` vs ${target} <span class="vaarn-recur-working">(the Virulence)</span>`;
  const button = `<button type="button" class="vaarn-recur-save-roll" data-actor-id="${actor.id}"
           data-entry-id="${entry.id}" data-ticks="${ticks}" data-tick-index="${index}"
           >Roll the save${ticks > 1 ? ` ×${ticks}` : ""}</button>`;
  return `<div class="vaarn-recur-save"><b>${def.save.ability} save</b>${vs} — on failure: ${def.save.onFail} ${button}</div>`;
}

/**
 * The button that applies a tick's stated losses.
 *
 * ONE BUTTON FOR THE WHOLE TICK, not one per ability. Jellybones takes STR and
 * CON together in a single weekly event, and two buttons would let half of it
 * be applied and leave no trace that the other half was not.
 *
 * It still WAITS for a click rather than firing on the tick, which is what
 * keeps the Referee's override. Matt's 2026-09-09 ruling changed what the
 * button does, not whether there is one — and for Lumenrot and the Gitch it
 * has to wait, because the loss is owed only on a failed save.
 */
function applyButton(actor, def, ticks, index)
{
  const spec = def?.applies ?? [];
  if (!spec.length) return "";
  const what = spec.map(a =>
    `${a.formula ? a.formula : a.amount} ${a.label}`).join(", ");
  const when = appliesOnFail(def) ? " on failure" : "";
  const many = ticks > 1 ? ` ×${ticks}` : "";
  return `<button type="button" class="vaarn-recur-apply" data-actor-id="${actor.id}"
           data-entry-id="${entryIdOf(actor, def)}" data-ticks="${ticks}"
           data-tick-index="${index}"
           >Apply${when}: ${what}${many}</button>`;
}

/** The entry id for this actor's running instance of `def`. */
function entryIdOf(actor, def)
{
  return entriesOf(actor).find(e => isRecurrence(e) && e.recurrenceKey === def?.key)?.id ?? "";
}

/**
 * The one button a tick offers that writes something, if it has one.
 *
 * `data-ticks` carries the number owed so a multi-tick card can apply the
 * right number of slots in one click rather than making the Referee press it
 * N times. Only ever reachable for the Toxin Die in practice — see the clock
 * analysis on the row — but the arithmetic is the same either way.
 */
function itemButton(actor, entry, def, ticks, index)
{
  const base = `data-actor-id="${actor.id}" data-entry-id="${entry.id}" data-ticks="${ticks}" data-tick-index="${index}"`;
  if (def?.producesWound)
    return `<button type="button" class="vaarn-recur-item" data-op="addWound" ${base}>Mark ${ticks === 1 ? "a slot" : `${ticks} slots`} — ${def.producesWound.name}</button>`;
  if (def?.consumesWound)
    return `<button type="button" class="vaarn-recur-item" data-op="removeWound" ${base}>Clear ${ticks === 1 ? "one slot" : `${ticks} slots`} — ${def.consumesWound.name}</button>`;
  if (def?.producesObject)
    return `<button type="button" class="vaarn-recur-item" data-op="extrude" ${base}>Extrude to Dropped Items</button>`;
  if (def?.fades)
    return `<button type="button" class="vaarn-recur-item" data-op="fade" ${base}>Fade ${ticks === 1 ? "one point" : `${ticks} points`} — now ${fadingSummary(entry.applied)}</button>`;
  return "";
}

/**
 * A held Gift's block on the tick card — Gift Sustained Use Cost.
 *
 * ITS OWN BLOCK rather than a branch inside tickBlock, because almost nothing
 * below applies: a Gift has no roster def, so the save line, the threshold,
 * the announces-only line and both affliction buttons would each resolve to
 * the empty string, and reading four dead lookups to render two lines is how
 * the next person concludes a Gift IS an affliction with unusual data.
 *
 * ONE BUTTON, and it charges rather than announcing. Matt 2026-09-13, and it
 * is the same shape as the 2026-09-09 revision that made the affliction card
 * apply ability damage: there is an existing path that writes this, and the
 * base value is not what moves. `data-tick-index` carries the guard the
 * affliction buttons already use — a re-rendered card must not charge twice.
 */
function giftTickBlock({ actor, entry, ticks, index })
{
  const many = ticks > 1
    ? ` <span class="vaarn-recur-count">×${ticks} — ${formatTicks(entry, ticks)} passed</span>`
    : "";
  const text = entry.text ? `<div class="vaarn-recur-text">${entry.text}</div>` : "";
  const cost = ticks === 1 ? `d${entry.giftDieFaces}` : `${ticks}d${entry.giftDieFaces}`;
  const button = `<button type="button" class="vaarn-recur-pay" data-actor-id="${actor.id}"
           data-entry-id="${entry.id}" data-ticks="${ticks}"
           data-tick-index="${index}"
           >Pay ${cost} HP</button>`;

  return `<li class="vaarn-recur-entry">
    <b>${actor.name} — ${entry.name}</b>${many}
    ${text}
    <div class="vaarn-recur-controls">${button}</div>
  </li>`;
}

/** Is this recurrence a vault hazard's tick rather than an affliction? */
export function isTrapTick(entry)
{
  return isRecurrence(entry) && !!entry?.trapKey;
}

/**
 * Which half of the Hypergeometric Vortex each owed tick is (RULED 2026-09-26,
 * Matt: alternating, from a random first). Tick 1 is `first`, tick 2 the other,
 * and so on - derived from the absolute tick index, so a card covering several
 * turns counts both halves correctly. Exported for the offline test.
 */
export function vortexHalves(first, index, ticks)
{
  const one = first === "spit" ? "spit" : "draw";
  const other = one === "draw" ? "spit" : "draw";
  let draw = 0, spit = 0;
  for (let i = index - ticks + 1; i <= index; i++)
    ((i % 2 === 1) ? one : other) === "draw" ? draw++ : spit++;
  return { draw, spit };
}

/**
 * A vault hazard's block on the tick card - Trap Resolution, shape C. Its own
 * block for the Gift's reason: no affliction roster def applies. The button
 * says what the hazard's `turn` declares and carries the tick guard every
 * other tick button carries; trap-card.js does the work.
 */
function trapTickBlock({ actor, entry, ticks, index })
{
  const trap = TRAPS[entry.trapKey];
  const many = ticks > 1
    ? ` <span class="vaarn-recur-count">×${ticks} — ${formatTicks(entry, ticks)} passed</span>`
    : "";
  const text = entry.text ? `<div class="vaarn-recur-text">${entry.text}</div>` : "";
  const base = `data-actor-id="${actor.id}" data-entry-id="${entry.id}" data-ticks="${ticks}" data-tick-index="${index}"`;
  const turn = trap?.turn ?? trap?.projector?.turn;
  let controls = "";
  if (turn)
    controls = `<button type="button" class="vaarn-trap-turn" ${base}>${turn.save || turn.tox ? "Post" : "Apply"}: ${turn.what}${ticks > 1 ? ` ×${ticks}` : ""}</button>`;
  else if (trap?.vortex)
  {
    const { draw, spit } = vortexHalves(entry.vortexFirst, index, ticks);
    controls = (draw ? `<button type="button" class="vaarn-trap-vortex-draw" ${base} data-draws="${draw}">`
                     + `STR Save vs being teleported - targeted tokens${draw > 1 ? ` ×${draw}` : ""}</button>` : "")
             + (spit ? `<div class="vaarn-recur-text">The vortex spits out a random creature${spit > 1 ? ` (${spit} times)` : ""} - roll on any encounter table.</div>` : "");
  }
  return `<li class="vaarn-recur-entry">
    <b>${actor.name} — ${entry.name}</b>${many}
    ${text}
    ${controls ? `<div class="vaarn-recur-controls">${controls}</div>` : ""}
  </li>`;
}

/** One recurrence's block on the tick card. */
function tickBlock({ actor, entry, ticks, index }, now)
{
  if (isGiftSustain(entry)) return giftTickBlock({ actor, entry, ticks, index });
  if (isTrapTick(entry)) return trapTickBlock({ actor, entry, ticks, index });

  const def = recurrenceByKey(entry.recurrenceKey);
  const many = ticks > 1
    ? ` <span class="vaarn-recur-count">×${ticks} — ${formatTicks(entry, ticks)} passed</span>`
    : "";
  const text = entry.text ? `<div class="vaarn-recur-text">${entry.text}</div>` : "";
  const announced = def?.announcesOnly
    ? `<div class="vaarn-recur-announced">Also, and not applied: ${def.announcesOnly}.</div>`
    : "";
  const object = entry.objectLabel
    ? `<div class="vaarn-recur-object">Extrudes: <i>${entry.objectLabel}</i></div>`
    : "";
  // RULED 2026-09-08 (Matt): "the board should only record that a toxin die is
  // active, all the rolling and depletion can be managed from the character
  // sheet." So this card counts what is owed and names the die, and offers no
  // roll of its own — the sheet's own control is the one place the dice chain
  // depletes correctly, and a second roller would be a second implementation
  // of it.
  const die = toxinDieOf(actor, entry);
  const sheet = die
    ? `<div class="vaarn-recur-sheet">Toxin Die <b>${die}</b> — roll it ${
        ticks === 1 ? "once" : `${ticks} times`} from the character sheet and subtract from HP.</div>`
    : "";

  const crossed = thresholdReached(actor, entry);
  // A threshold that turns the character INTO a creature carries the Referee's
  // button to do it (Actor Spawning wiring, RULED 2026-09-25 by Matt: the
  // creature takes the PC's spot). The PC Actor is never deleted.
  const becomes = crossed && def?.threshold?.becomes
    ? `<button type="button" class="vaarn-recur-becomes" data-actor-id="${actor.id}" data-creature="${def.threshold.becomes}">`
      + `${actor.name} becomes a ${def.threshold.becomes}</button>`
    : "";
  const threshold = crossed
    ? `<div class="vaarn-recur-threshold"><b>Threshold reached:</b> ${crossed}${becomes}</div>`
    : "";
  const controls = [applyButton(actor, def, ticks, index), itemButton(actor, entry, def, ticks, index)]
    .filter(Boolean).join(" ");

  return `<li class="vaarn-recur-entry">
    <b>${actor.name} — ${entry.name}</b>${many}
    ${text}${object}${announced}${sheet}${saveLine(actor, entry, def, ticks, index)}${threshold}
    ${controls ? `<div class="vaarn-recur-controls">${controls}</div>` : ""}
  </li>`;
}

/**
 * Announce a batch of ticks. ONE CARD per advance, and one BLOCK per
 * recurrence inside it naming how many periods passed — not N cards.
 *
 * RULED 2026-09-08 (Matt), and the clock makes it near-moot for everything but
 * the Toxin Die: the largest single advance the clock window offers is +1 day,
 * which crosses exactly one day boundary and can never cross a week boundary.
 * Only the per-Exploration-Turn Toxin Die routinely accumulates more than one,
 * where +1 day is 144 turns. The free-typed turn count is the one other route
 * and needs a deliberately large number.
 *
 * Split by ORIGIN, exactly as the board's expiry card is — an affliction
 * running on a creature is the Referee's information.
 *
 * AND BY KIND, added 2026-09-13 with Gift Sustained Use Cost. A held Gift is
 * not an affliction, and the heading is not decoration: it is the only thing
 * on the card that says what the list is, so one card carrying both under
 * "Ongoing afflictions" would misname the Gift every single time it posted.
 * Four groups rather than two, most of them empty on any given advance.
 */
export async function announceTicks(due, now)
{
  if (!due.length) return;
  // A vault hazard is neither an affliction nor a Gift (Trap Resolution,
  // 2026-09-26) - the same misnaming the Gift split exists to prevent.
  const kindOf = e => isGiftSustain(e) ? "gift" : isTrapTick(e) ? "trap" : "affliction";
  const groups = [
    { title: "Ongoing afflictions", gmOnly: true,  kind: "affliction" },
    { title: "Ongoing afflictions", gmOnly: false, kind: "affliction" },
    { title: "Sustained Gifts",     gmOnly: true,  kind: "gift" },
    { title: "Sustained Gifts",     gmOnly: false, kind: "gift" },
    { title: "Vault hazards",       gmOnly: true,  kind: "trap" },
    { title: "Vault hazards",       gmOnly: false, kind: "trap" }
  ];

  for (const { title, gmOnly, kind } of groups)
  {
    const batch = due.filter(d =>
      (d.entry.origin === "npc") === gmOnly && kindOf(d.entry) === kind);
    if (!batch.length) continue;
    await ChatMessage.create({
      content: `<p><b>${title}:</b></p><ul class="vaarn-recur-list">${
        batch.map(d => tickBlock(d, now)).join("")}</ul>`,
      whisper: gmOnly ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [],
      flags: { [SCOPE]: { recurrenceTick: true } }
    });
  }
}

/**
 * The clock moved. Fire whatever is owed and say so.
 *
 * NO EARLY RETURN ON A REWIND, unlike the board's own sweep. The board can
 * return immediately on a negative delta because expiring is the only thing it
 * does. This module has to keep going, because a rewind must LOWER
 * `announcedIndex` so the tick can fire again when the clock comes back — and
 * that is exactly the bug activity.js shipped and had to fix in testing on
 * 2026-09-08, where a rewind stranded a finished effort permanently.
 *
 * Announcing is unconditional and safe: claimDueTicks yields nothing for an
 * entry it rewound, so a pure rewind produces an empty batch and announces
 * nothing anyway. A tick that IS owed on a non-positive delta was genuinely
 * missed earlier, and reporting it late beats swallowing it.
 */
export async function onTimeAdvance()
{
  const now = game.time.worldTime;
  const due = await claimDueTicks({ now });
  await announceTicks(due, now);
}
