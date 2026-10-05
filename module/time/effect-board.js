/**
 * Active Effect Board — foundry-system-index.csv "Active Effect Board".
 *
 * The register of everything currently running on anybody: elixirs, codex
 * durations, creature rules, toxins. This file is the STATE, the pure
 * arithmetic over it, and the card that announces an expiry; the window that
 * renders it is effect-board-app.js.
 *
 * State and chat sit together here for the reason round-effects.js gives for
 * the same choice: an expiry is one event that must remove the entry AND say
 * so, and splitting them across files means two subscriptions racing over the
 * same flag. The window is separate because it only ever reads.
 *
 * WHY THE STATE IS ON THE ACTOR AND NOT ON THE ITEM. Matt's catch, 2026-09-08,
 * and it stopped a build that was two design rounds along. An elixir is
 * consumed: actor-sheet.js's _onGenericItemUse posts its line and calls
 * item.delete(). A flag written to that Item dies with it. So the item flag
 * Per-Round Effect Reminder has used since it was built could never survive a
 * consumable, and that mechanism has therefore never been reachable for one —
 * a gap invisible for as long as it was, because all 38 of the atom rows ever
 * proven against it are Bestiary creature rules, which live on npc sheets and
 * are never consumed.
 *
 * The pattern this generalises is already in the codebase and already tested:
 * Berserker Brew has set `berserkerActive` on the ACTOR and then deleted its
 * own Item since Group 44. This is that, with a duration and a name attached.
 *
 * WHY ABSOLUTE EXPIRY AND NEVER A COUNTDOWN. Inherited from Round-Duration
 * Expiry's own reasoning and extended to three more units: a stored counter
 * that is decremented is corrupted by a missed or doubled hook, and nothing
 * afterwards can tell that it happened. An absolute expiry cannot be. Matt
 * described the board's buttons as "counting down", and confirmed that meant
 * the DISPLAY — remaining is always computed as expiry minus now.
 *
 * WHY ONE CLOCK RATHER THAN ONE COUNTER PER UNIT. The first sketch had each
 * unit's button advance only the effects stated in that unit. That strands a
 * turn-scale elixir the moment the Referee advances hours, because an hour
 * CONTAINS six Exploration Turns — the units are one number line, not four
 * tracks, which is exactly what fixing a turn at ten minutes bought us. So the
 * buttons move `worldTime` and every clock-scale entry converts to seconds.
 * The authored unit survives for DISPLAY only, so a 6-Exploration-Turn span is
 * never rendered as "1 hour".
 *
 * COMBAT ROUNDS ARE THE ONE REAL EXCEPTION. A fight does not advance the world
 * clock, so a round-scale duration cannot live on the same number line. An
 * entry may therefore carry both scales at once and expire on whichever runs
 * out first. Regeneration Serum is the case that proves it needs to: "regains
 * d6 HP per combat round … the effect lasts for 6 Exploration Turns."
 */

import { SECONDS_PER_TURN, SECONDS_PER_HOUR, SECONDS_PER_DAY, UNITS } from "./vaarn-time.js";
// CIRCULAR, AND DELIBERATELY SO. stateful-effect.js imports entriesOf and
// hasExpired from here, so the two modules reference each other. It is safe
// because neither calls into the other while its module body is evaluating —
// both files define functions at the top level and nothing else — and the
// alternative was duplicating the expiry test in both places, which is the
// kind of pair that drifts silently. Do not "fix" it by copying hasExpired.
import { reverseExpiryHp } from "./stateful-effect.js";

/** Flag scope and key. Flags, not template.json — no schema change, so no
 *  relaunch, and no existing document needs migrating. */
export const SCOPE = "vaarn";
export const KEY = "effects";

/**
 * Units offered at activation, in the order the dialog lists them.
 *
 * "round" is deliberately first and deliberately not in vaarn-time.js's UNITS
 * map: it has no seconds value because it is not on the clock's number line at
 * all. Everything below it converts; it does not.
 */
export const SCALES = {
  round: { label: "combat rounds", seconds: null },
  turn:  { label: "Exploration Turns", seconds: SECONDS_PER_TURN },
  hour:  { label: "hours", seconds: SECONDS_PER_HOUR },
  day:   { label: "days", seconds: SECONDS_PER_DAY }
};

/* -------------------------------------------- */
/*  Pure arithmetic — no `game`, so this is the half an offline test can       */
/*  reach. tools/test-effect-board.mjs imports exactly these.                  */
/* -------------------------------------------- */

/**
 * A span of seconds rendered in the largest sensible unit NOT larger than the
 * one it was authored in.
 *
 * Authored unit is the ceiling, never the floor. A span written as "6
 * Exploration Turns" must never display as "1 hour" — commit 643ecf4 was a bug
 * where the readout lied about the time, and re-expressing an authored span in
 * a unit nobody wrote is the same failure wearing a tidier coat. But dropping
 * DOWN is fine and is what a reader wants: a one-day effect with fifteen hours
 * left reads better as "15 hours" than as "1 day".
 *
 * Rounds up, so a live effect never displays as 0 of anything.
 */
export function formatSpan(seconds, authoredUnit = "turn", authoredAmount = null)
{
  if (!(seconds > 0)) return "expiring";

  // Candidates no larger than the authored unit, largest first.
  const order = ["day", "hour", "turn"];
  const cap = order.indexOf(authoredUnit);
  const candidates = cap === -1 ? order : order.slice(cap);

  for (const u of candidates)
  {
    const per = UNITS[u];
    if (seconds >= per)
    {
      let n = Math.ceil(seconds / per);
      // CAPPED AT WHAT WAS AUTHORED. Rounding up stops a live effect reading
      // "0", but on its own it also lets a span read as MORE than it ever
      // was: a 1-day Fakeface Paste with 24h20m left ceils to "2 days".
      // Found on the board during Group 105 — a Referee who reads that has
      // been told something untrue about the fiction, which is the same
      // class of fault as commit 643ecf4's stale clock readout.
      if (u === authoredUnit && Number.isFinite(authoredAmount) && authoredAmount > 0)
        n = Math.min(n, authoredAmount);
      return `${n} ${n === 1 ? oneOf(u) : manyOf(u)}`;
    }
  }
  return `under 1 ${oneOf(candidates[candidates.length - 1])}`;
}

function oneOf(u)  { return { day: "day", hour: "hour", turn: "Exploration Turn" }[u]; }
function manyOf(u) { return { day: "days", hour: "hours", turn: "Exploration Turns" }[u]; }

/** Seconds left on an entry's clock-scale span, or null if it has none. */
export function clockRemaining(entry, now)
{
  if (!Number.isFinite(entry?.expiresAtTime)) return null;
  return entry.expiresAtTime - now;
}

/** Rounds left on an entry's round-scale span, or null if it has none. */
export function roundsRemaining(entry, round)
{
  if (!Number.isFinite(entry?.expiresAtRound)) return null;
  return entry.expiresAtRound - round;
}

/**
 * Has this entry run out? An entry carrying both scales expires on whichever
 * lands first, which is the behaviour Regeneration Serum needs: a fight long
 * enough to burn its rounds ends it even though no world time has passed.
 *
 * `round` is null outside combat, which must NOT expire a round-scale entry —
 * ending an encounter is not the same as the duration elapsing, and the
 * existing deleteCombat sweep is what handles that case.
 */
export function hasExpired(entry, { now = 0, round = null } = {})
{
  const t = clockRemaining(entry, now);
  if (t !== null && t <= 0) return true;
  if (round !== null)
  {
    const r = roundsRemaining(entry, round);
    if (r !== null && r <= 0) return true;
  }
  return false;
}

/**
 * What a given viewer may see of an entry, as one of three answers rather than
 * a boolean — "shown in full" and "shown without its source" are genuinely
 * different rows on the board, not a rendering detail.
 *
 * VISIBILITY FOLLOWS ORIGIN. Matt's 2026-09-08 ruling, carried unchanged off
 * the chat card and onto the board: a PC-sheet effect is public because the
 * player chose it, a creature-sheet effect is the Referee's because a player
 * may be subject to something without knowing what is doing it.
 *
 * REVEALED is the Referee's override, and what it shows is narrower than what
 * a public entry shows. RULED 2026-09-08 (Matt): a revealed entry shows
 * NEITHER the time left NOR the owning actor. The reasoning is the principle
 * the whole rule now rests on — you know the duration of effects you brought
 * on yourself. A character who has been blinded does not know it has four
 * rounds to run, so a revealed row is a status line, not a countdown.
 *
 * AND IT DOES NOT SHOW THE ENTRY'S NAME EITHER. Matt, 2026-09-08, after the
 * first version shipped showing it: an entry is named for its SOURCE — the
 * creature ability, the elixir — so "Blinding Pelt" hands the player the one
 * thing the origin ruling exists to protect, while never saying what is
 * actually happening to them. His framing settled it: keeping this on a
 * physical board you would write "Blinded: Reid".
 *
 * So a revealed entry carries its own player-facing label, written by the
 * Referee at the moment of revealing, and that label is the whole row. This
 * also removes the need to reveal per-player: a label naming who it is on is
 * true for everyone reading the board, where the old hardcoded "affecting
 * you" was false for every viewer except one.
 */
export function visibilityFor(entry, viewerIsGM)
{
  if (viewerIsGM) return "full";
  // Quantum Daemon Debt (2026-09-17): a curse is the Referee's whoever it is
  // on. The pc-origin rule below rests on "the player chose it", and a player
  // did not choose a curse, so a gmOnly entry skips that clause and is either
  // revealed as a status line or not shown at all.
  if (entry?.gmOnly) return entry?.revealed ? "status" : "hidden";
  if (entry?.origin === "pc") return "full";
  if (entry?.revealed) return "status";
  return "hidden";
}

/**
 * Work out the expiry stamps for a new entry. Split out from `activate` purely
 * so the offline test can reach it — every branch here is arithmetic, and the
 * bug it is guarding against (a span landing on the wrong number line) is
 * invisible in a live world until something fails to expire hours later.
 */
export function expiryFor({ amount, unit, now = 0, round = null })
{
  const n = Number(amount);
  const out = { expiresAtTime: null, expiresAtRound: null, unit, amount: null };
  if (!Number.isFinite(n) || n <= 0) return out;
  out.amount = n;

  if (unit === "round")
  {
    // "The rest of the round it started in, plus that many full rounds" — the
    // reading Round-Duration Expiry already settled.
    //
    // OUTSIDE COMBAT, COUNT FROM ROUND 0, which is what the old item-flag
    // code did and what this briefly stopped doing. Leaving it unstamped
    // looked tidier and was wrong twice over: the effect would then remind
    // forever, and the warning shown at activation explicitly promises that
    // creating an encounter will make it start reporting. Counting from 0
    // means a 4-round span activated before the fight expires at round 5,
    // which is the first fight's round 4 — the answer a Referee expects.
    // Found in live testing 2026-09-08, where the board read "ticks each
    // round, no stated end" for a span that plainly had one.
    out.expiresAtRound = (round ?? 0) + n + 1;
    return out;
  }

  const per = SCALES[unit]?.seconds;
  if (!per) return out;
  out.expiresAtTime = now + Math.round(n * per);
  return out;
}

/**
 * The duration an item's own text implies, as a raw token and a unit — or null
 * if it states none.
 *
 * A PREFILL, NOT A CONTRACT. It decides what number the dialog opens with, and
 * the Referee can overwrite it. A miss costs one typed number; a wrong hit
 * costs one corrected number. So it is deliberately simple, and deliberately
 * does NOT resolve dice: "d6" comes back as the string, because rolling needs
 * Foundry and this half is the testable half. The sheet resolves it.
 *
 * CLOCK-SCALE WINS WHEN BOTH ARE PRESENT, and Regeneration Serum is why:
 * "regains d6 HP per combat round … lasts for 6 Exploration Turns" states a
 * per-round TICK and a clock-scale SPAN, and the span is the duration. Whether
 * it ticks is a separate question answered by PER_ROUND_WORDING, not by this.
 */
/**
 * Numbers the book writes as words.
 *
 * ADDED 2026-09-08, and it was not a nicety. Without these, Fakeface Paste
 * ("The face remains convincing for one day") had NO CONTROL ON THE SHEET AT
 * ALL — the hourglass appears only when the item states a duration something
 * can read, so a parser gap did not degrade the prefill, it removed the whole
 * feature for that item. That is invisible: a missing control looks exactly
 * like an item with no duration. Found by working the checklist, not by
 * reading the parser, which had a passing test asserting the gap was benign.
 *
 * "a" and "an" are here because the book uses them as freely as "one" —
 * "lasts for a day", "an hour of concentration". The unit word must follow
 * immediately, which is what keeps "a light source" from matching.
 */
const WORDS = {
  a: "1", an: "1", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10"
};

export function parseDuration(text)
{
  if (!text) return null;
  // A LOOKBEHIND, NOT \b. Written first with a leading \b, which silently
  // matched nothing for "[INT] hours" — \b needs a word/non-word transition
  // and there is none between a space and a "[". Both [INT] cases came back
  // null while every numeric case passed, so the parser looked correct on
  // most of its inputs. This is the same \b failure the project's own notes
  // record from the edition-diff tools, in a new place.
  const re = /(?<![A-Za-z0-9])(\d+|d\d+|\[INT\]|an?|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:combat\s+)?(exploration turns?|turns?|hours?|days?|rounds?)\b/gi;
  const found = [];
  for (const m of String(text).matchAll(re))
  {
    const word = m[2].toLowerCase();
    const unit = /^exploration turn/.test(word) ? "turn"
               : /^turn/.test(word) ? "turn"
               : /^hour/.test(word) ? "hour"
               : /^day/.test(word)  ? "day"
               : "round";
    found.push({ raw: WORDS[m[1].toLowerCase()] ?? m[1], unit });
  }
  if (!found.length) return null;
  return found.find(f => f.unit !== "round") ?? found[0];
}

/* -------------------------------------------- */
/*  World state                                                               */
/* -------------------------------------------- */

/**
 * How a board row or a round-card button names its actor, and back.
 *
 * An UNLINKED token's actor is the token's own synthetic copy: it shares the
 * world actor's id but holds its own flags, so an id resolves to the wrong
 * document. Its uuid (Scene.….Token.….Actor.…) resolves to the copy. A world
 * actor keeps its plain id, so cards posted before 2026-10-01 still resolve.
 */
export function actorRef(actor)
{
  return actor?.isToken ? actor.uuid : actor?.id;
}

/** What a line calls the actor: an unlinked token by its own name, so two of one creature read apart. */
export function nameOf(actor)
{
  return actor?.token?.name ?? actor?.name ?? "";
}

export function actorFromRef(ref)
{
  if (!ref) return null;
  return String(ref).includes(".") ? fromUuidSync(ref) : game.actors.get(ref);
}

/** Every entry on one actor. Always an array, never null. */
export function entriesOf(actor)
{
  const raw = actor?.getFlag?.(SCOPE, KEY);
  return Array.isArray(raw) ? raw : [];
}

/**
 * Replace an actor's whole entry list.
 *
 * The whole array every time, because that is what a Foundry array flag
 * supports. Writers are few and rarely simultaneous — activation is one user
 * clicking, and every automatic sweep is guarded to the single activeGM — so
 * the lost-update window this opens is real but not reachable in practice.
 * Worth knowing it is there if a future caller writes from a broadcast hook.
 */
export async function setEntries(actor, entries)
{
  return actor.setFlag(SCOPE, KEY, entries);
}

/** Add one entry. Returns the entry as stored, id included. */
export async function addEntry(actor, data)
{
  const entry = {
    id: foundry.utils.randomID(),
    name: String(data.name ?? "Effect"),
    text: String(data.text ?? ""),
    note: String(data.note ?? ""),
    itemId: data.itemId ?? null,
    origin: actor.type === "npc" ? "npc" : "pc",
    revealed: false,
    // What players see when this is revealed. Never the entry name, which
    // is the source. Written by the Referee at reveal time.
    revealLabel: "",
    perRound: !!data.perRound,
    formula: data.formula ?? null,
    // A per-round ability loss (Ability Damage pass 3, 2026-09-22): the
    // round card's button rolls `formula` and writes it to this ability's
    // wound damage. Null for every other entry.
    abilityDamage: data.abilityDamage ?? null,
    // An ESCALATING per-round HP loss (Brain Burster, 2026-09-22):
    // { amount, factor }, where `amount` is what the NEXT application deals
    // and the round card's button multiplies it on its way out. Named here
    // because this constructor is a WHITELIST — a field the caller passes and
    // this list does not name is dropped silently, and the entry then looks
    // correct on the board while doing nothing. That is exactly what happened
    // when this was first wired: the effect applied its opening 2, appeared on
    // the board, and offered no button ever again.
    escalating: data.escalating ?? null,
    // A per-round HP change the round card's button applies (Direct HP
    // Adjustment, 2026-09-23): { to, heal, dice?, full?, perCount?,
    // damageTypes? }. Named here for the escalating reason above.
    hpTick: data.hpTick ?? null,
    // A per-round SPAWN the round card's button performs (Actor Spawning
    // from Bestiary, 2026-09-24): { creature, dice }. The Brood Mother's
    // Brood. Named here for the escalating reason above.
    spawn: data.spawn ?? null,
    // A per-round SAVE the round card's button posts to the targeted tokens
    // (Failed-Save Consequence, 2026-09-25): a compelled-save spec. The
    // Space-Time Vortex's "DEX Save vs 3d8 damage". Named here for the
    // escalating reason above.
    save: data.save ?? null,
    // A save the END card offers and what a success grants (Grant-a-Roll on
    // Another Table, 2026-09-26): { save, roster }. The Godsbreath Star's PSY
    // Save for a random Mystic Gift. Named here for the escalating reason above.
    endGrant: data.endGrant ?? null,
    // The span's end strips the TOX from the Item it times (Toxin Die wiring,
    // 2026-09-26): the Avern Bloom's one day of poison. Named here for the
    // escalating reason above.
    toxLapses: !!data.toxLapses,
    // The Magneticrab's field (Metal Item Property Part B, 2026-09-27): the
    // round card lists who holds metal and who is pulled. Named here for the
    // escalating reason above.
    magnetField: !!data.magnetField,
    // Ends when the combat does, whatever its round count (the Fate Invertor,
    // RULED 2026-09-26 by Matt). survivesCombatEnd reads it.
    endsWithCombat: !!data.endsWithCombat,
    clearFlag: data.clearFlag ?? null,
    // An ONGOING HOLD (Per-Round Effect Reminder wiring, 2026-09-25): the
    // escape save the round card offers the held one, and who holds them.
    hold: data.hold ?? null,
    sourceActorId: data.sourceActorId ?? null,
    // The source's name as it was, so the round card's turn tag can still
    // name a source that has since been deleted (Turn-Timed Round Card,
    // RULED 2026-09-26 by Matt). Named here for the escalating reason above.
    sourceName: data.sourceName ?? null,
    // Ends when sourceActorId's creature dies or is deleted - the Gravity
    // Tyrant's Weight of Worlds, "until the Tyrant is killed" (2026-09-25).
    endsWithSource: !!data.endsWithSource,
    // Stateful Effect Application (2026-09-09). The deltas this activation
    // granted, already resolved to flat numbers — a doubling is arithmetic
    // done once, at activation, and never recomputed. Null for every ordinary
    // reminder entry, which is most of them.
    applied: data.applied ?? null,
    startTime: data.startTime ?? 0,
    startRound: data.startRound ?? null,
    expiresAtTime: data.expiresAtTime ?? null,
    expiresAtRound: data.expiresAtRound ?? null,
    unit: data.unit ?? null,
    amount: data.amount ?? null,
    // Character Split/Clone (2026-09-18): the Bifurcating Brew's second
    // Actor, so the expiry card can offer to remove it. Null otherwise.
    splitHalfId: data.splitHalfId ?? null,
    // Healing Field (2026-09-22): the entry IS the field's lifetime, so its
    // end deletes the actor holding it - see undoEntryEffects and clearAll.
    removesActor: !!data.removesActor,
    // A sold False good (2026-09-24): the Referee's whoever it is on.
    gmOnly: !!data.gmOnly,
    // Elixir-Granted Ability Item (2026-09-23): the Item a drink put on the
    // sheet, which this entry's span times. Its end deletes the Item, by
    // every path an entry ends by - see undoEntryEffects and clearAll.
    grantedItemId: data.grantedItemId ?? null,
    // Several at once (Biothermal Amplifier Tonic's two gifts, 2026-09-24).
    // The single field above stays for the entries already written.
    grantedItemIds: Array.isArray(data.grantedItemIds) ? [...data.grantedItemIds] : [],
    // A per-target hit count (Hit-Count Progression, 2026-09-27): { key, count }.
    // The Desiccator's Desiccate. Named here for the escalating reason above.
    hitCount: data.hitCount ?? null,
    // An end the holder chooses (the Ghoul's Agony, 2026-09-27): the round
    // card offers "<holder> lies still", which removes the entry. Named here
    // for the escalating reason above.
    endsBy: data.endsBy ?? null
  };
  await setEntries(actor, [...entriesOf(actor), entry]);
  return entry;
}

/**
 * Undo everything an entry's activation did outside the entry itself.
 *
 * THERE ARE TWO PATHS OUT AND THEY MUST NOT DIVERGE. `removeEntry` handles a
 * Referee deleting a row or an item being toggled off; `sweepExpired` handles
 * the duration running out, and it does NOT call removeEntry — it writes the
 * kept list in one go, which is what makes a multi-entry sweep one flag write
 * instead of N. So an undo added to only one of them silently covers half the
 * ways an effect can end.
 *
 * That is not hypothetical: the max-HP reversal was added to removeEntry alone
 * on 2026-09-09 and Growth Serum expired leaving a permanently doubled maximum,
 * because the ordinary expiry path never went near it. Caught by testing
 * 111.6. Both paths now call this, and neither does the work itself.
 *
 * Only things that were WRITTEN need undoing here. AV, abilities and creature
 * types are contributed live from the entry, so dropping the entry is already
 * the whole of their reversal — which is the point of contributing rather than
 * writing.
 */
async function undoEntryEffects(actor, entry)
{
  await clearNamedFlag(actor, entry);
  if (entry?.applied) await reverseExpiryHp(actor, entry.applied);
  for (const id of grantedItemIdsOf(entry)) await removeGrantedItem(actor, id);
  if (entry?.removesActor) await removeActorAndTokens(actor);
  if (entry?.toxLapses) await stripTox(actor, entry.itemId);
}

/**
 * The poison is spent: take TOX off the Item's damage types and drop its
 * declared toxin die, leaving the weapon itself. The Avern Bloom, RULED
 * 2026-09-26 (Matt). Either path out of the span strips it, per the note on
 * undoEntryEffects - switching the hourglass off early ends the day early.
 */
async function stripTox(actor, itemId)
{
  const item = itemId ? actor.items.get(itemId) : null;
  if (!item) return;
  const types = (item.system.damageTypes ?? []).filter(t => String(t).toLowerCase() !== "tox");
  await item.update({ "system.damageTypes": types, "flags.vaarn.-=toxDie": null, "flags.vaarn.-=toxLapses": null });
}

/** Every Item id an entry's span is timing, old single field and new list. */
export function grantedItemIdsOf(entry)
{
  const ids = Array.isArray(entry?.grantedItemIds) ? entry.grantedItemIds : [];
  return entry?.grantedItemId ? [entry.grantedItemId, ...ids.filter(i => i !== entry.grantedItemId)] : ids;
}

/**
 * Delete the Item an entry's span was timing (Elixir-Granted Ability Item,
 * 2026-09-23). Tolerant of the Item already being gone - a single-use
 * ability spends itself, and a successful frenzy save removes its own Item -
 * because the entry's end is not the only way out. Exported for
 * round-effects.js's clearAll, the third path an entry ends by.
 */
export async function removeGrantedItem(actor, itemId)
{
  const item = actor?.items?.get(itemId);
  if (item) await item.delete();
}

/**
 * Delete an actor whose whole existence was one board entry - the Biotic
 * Field (Healing Field, 2026-09-22). Its tokens go first: linked tokens are
 * not removed with their Actor, the reason removeHalf gives. Exported for
 * round-effects.js's clearAll, the third path an entry ends by.
 */
export async function removeActorAndTokens(actor)
{
  // An unlinked token's copy is that one token, never the world actor and
  // every other token of it (2026-10-01).
  if (actor?.isToken) return actor.token?.delete();
  if (!game.actors.get(actor?.id)) return;
  for (const scene of game.scenes)
  {
    const ids = scene.tokens.filter(t => t.actorId === actor.id).map(t => t.id);
    if (ids.length) await scene.deleteEmbeddedDocuments("Token", ids);
  }
  await actor.delete();
}

/** Remove one entry by id, undoing whatever its activation did. */
export async function removeEntry(actor, id)
{
  const entries = entriesOf(actor);
  const entry = entries.find(e => e.id === id);
  if (!entry) return null;
  await setEntries(actor, entries.filter(e => e.id !== id));
  await undoEntryEffects(actor, entry);
  return entry;
}

/** Patch one entry in place. */
export async function updateEntry(actor, id, patch)
{
  const entries = entriesOf(actor);
  if (!entries.some(e => e.id === id)) return null;
  await setEntries(actor, entries.map(e => e.id === id ? { ...e, ...patch } : e));
  return true;
}

/**
 * Unset the one external flag an entry named at activation, if it named one.
 *
 * The mechanism never learns what the flag MEANS. It was told a path and it
 * unsets that path — which is what keeps this one implementation rather than
 * fifty. Flatten's `vaarn.flat` is the case it exists for: `isFlat` already
 * reads that flag, so the two-dimensional state needs only setting and
 * clearing on a timer, and that is the whole of its wiring.
 */
async function clearNamedFlag(actor, entry)
{
  if (!entry?.clearFlag) return;
  const [scope, ...rest] = String(entry.clearFlag).split(".");
  const key = rest.join(".");
  if (!scope || !key) return;
  try { await actor.unsetFlag(scope, key); }
  catch (err) { console.warn(`Vaarn | could not clear flag "${entry.clearFlag}"`, err); }
}

/**
 * Every entry in the world, paired with the actor holding it.
 *
 * Walks all actors rather than this combat's combatants, for the reason
 * knave.js gives for the Berserker cleanup: an entry can exist for an actor
 * who was never added to the tracker, so scoping to combatants would silently
 * skip effects that are genuinely running.
 */
/**
 * UNLINKED TOKENS (bug report 2026-10-01, Matt: a gambit's Blind on a creature
 * never reached the board). A creature dragged from the Bestiary gets an
 * unlinked token, and an effect put on it lands on the token's own synthetic
 * actor, which game.actors never holds - so the board, the round card, expiry
 * and the combat-end clear all missed it. Every walk over the board's state
 * takes the token copies from here, so they cannot disagree about which exist.
 *
 * A token inherits its world actor's entries, and those are walked with the
 * world actor already; `own` is what the token holds of its OWN, the only
 * entries a walk over the copy may report or change.
 */
export function tokenCopies()
{
  const out = [];
  for (const scene of game.scenes ?? [])
    for (const token of scene.tokens)
    {
      if (token.actorLink || !token.actor) continue;
      const inherited = new Set(entriesOf(game.actors.get(token.actorId)).map(e => e.id));
      out.push({ actor: token.actor, own: e => !inherited.has(e.id) });
    }
  return out;
}

export function collectAll()
{
  const out = [];
  for (const actor of game.actors)
    for (const entry of entriesOf(actor))
      out.push({ actor, entry });
  for (const { actor, own } of tokenCopies())
    for (const entry of entriesOf(actor))
      if (own(entry)) out.push({ actor, entry });
  return out;
}

/**
 * Remove everything that has run out, and hand back what was removed so the
 * caller can announce it.
 *
 * Expiry is evaluated BEFORE any reminder is posted, so an effect that ends
 * now is announced as ended rather than reminded about and then quietly
 * removed. The two readings look identical in the log and mean opposite
 * things — the same ordering point round-effects.js already makes.
 */
export async function sweepExpired({ now = null, round = null } = {})
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  const expired = [];
  for (const actor of game.actors)
  {
    const entries = entriesOf(actor);
    if (!entries.length) continue;
    const keep = [];
    for (const entry of entries)
    {
      if (hasExpired(entry, { now: t, round })) expired.push({ actor, entry });
      else keep.push(entry);
    }
    if (keep.length !== entries.length)
    {
      await setEntries(actor, keep);
      for (const { entry } of expired.filter(e => e.actor === actor))
        await undoEntryEffects(actor, entry);
    }
  }
  // The same on every unlinked token's own entries (see tokenCopies).
  for (const { actor, own } of tokenCopies())
  {
    const entries = entriesOf(actor);
    const gone = entries.filter(e => own(e) && hasExpired(e, { now: t, round }));
    if (!gone.length) continue;
    await setEntries(actor, entries.filter(e => !gone.includes(e)));
    for (const entry of gone)
    {
      expired.push({ actor, entry });
      await undoEntryEffects(actor, entry);
    }
  }
  return expired;
}

/** Everything the given actor is running. Convenience for the sheet. */
export function activeOn(actor)
{
  return entriesOf(actor);
}

/* -------------------------------------------- */
/*  Announcements                                                             */
/* -------------------------------------------- */

/**
 * One ended entry's line. Says what it was and how long it ran, because the
 * elapsed figure is free from an absolute stamp and is the thing a Referee
 * actually asks afterwards.
 *
 * It does NOT say what to undo. Removing the +5 AV an elixir granted is
 * Stateful Effect Application's job and that row is not built, so the honest
 * card names the effect and lets the Referee act. When that row lands this is
 * where its wording changes.
 */
function expiryLine({ actor, entry }, now)
{
  const ran = Number.isFinite(entry.startTime) && entry.expiresAtTime
    ? ` (ran ${formatSpan(entry.expiresAtTime - entry.startTime, entry.unit ?? "turn")})`
    : "";
  const note = entry.note ? ` — ${entry.note}` : "";
  // Character Split/Clone: the GM ends the split by hand (Matt 2026-09-18).
  const half = entry.splitHalfId && game.actors.get(entry.splitHalfId);
  const remove = half
    ? ` <button type="button" class="vaarn-remove-half" data-actor-id="${half.id}">Remove the half</button>`
    : "";
  // Grant-a-Roll on Another Table (2026-09-26): the save the span ends on.
  const grant = entry.endGrant
    ? ` <button type="button" class="vaarn-end-grant" data-actor-id="${actor.id}" data-entry-id="${entry.id}"`
      + ` data-save="${entry.endGrant.save}" data-roster="${entry.endGrant.roster}" data-label="${entry.name}">`
      + `${String(entry.endGrant.save).toUpperCase()} Save</button>`
    : "";
  const spent = entry.toxLapses ? " — its poison is spent (no longer TOX)" : "";
  return `<li><b>${endedLabel({ actor, entry })}</b>${ran}${note}${spent}${remove}${grant}</li>`;
}

/**
 * Who and what ended, for both expiry cards (this board's and the round
 * card). "Biotic Field — removed" for an entry that took its actor with it
 * (Healing Field, 2026-09-22) - the old "Biotic Field — Biotic Field —
 * Biotic Field removed" said the name three times.
 */
export function endedLabel({ actor, entry })
{
  if (entry.removesActor) return `${nameOf(actor)} — removed`;
  return `${nameOf(actor)} — ${entry.name}`;
}

/**
 * Announce a batch of expiries. ONE card per advance, not one per entry and
 * not one per turn inside a multi-turn span: pressing "+8 hours" is a single
 * act and reads as a single event. The clock's own encounter check already
 * settled this shape for the same window.
 *
 * Split by ORIGIN, not by who is affected — a creature-owned effect ending is
 * the Referee's information even when the thing it was doing happened to a
 * player. That is the 2026-09-08 visibility ruling, unchanged.
 */
export async function announceExpired(expired, now)
{
  if (!expired.length) return;
  // gmOnly joins the whisper (2026-09-24, a sold False good): an entry hidden
  // from the players while it runs must not announce itself when it ends.
  const secret = e => e.entry.origin === "npc" || e.entry.gmOnly;
  const gm   = expired.filter(secret);
  const open = expired.filter(e => !secret(e));

  for (const [batch, gmOnly] of [[gm, true], [open, false]])
  {
    if (!batch.length) continue;
    await ChatMessage.create({
      content: `<p><b>Ended:</b></p><ul>${batch.map(e => expiryLine(e, now)).join("")}</ul>`,
      whisper: gmOnly ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [],
      flags: { [SCOPE]: { effectExpiry: true } }
    });
  }
}

/**
 * The clock moved. Sweep whatever ran out and say so.
 *
 * A REWIND EXPIRES NOTHING. `delta` is negative when a Referee corrects an
 * over-advance, and vaarn-time.js hands consumers the sign precisely so they
 * can honour it. Sweeping on a rewind would end effects because time went
 * backwards, which is the opposite of what the correction meant.
 *
 * Both scales are evaluated on both hooks rather than one each. An entry that
 * should already have gone is then caught by whichever fires next, instead of
 * waiting for its own hook — which matters most when combat ends mid-span and
 * no round event will ever fire again.
 */
export async function onTimeAdvance({ delta } = {})
{
  if (!(delta > 0)) return;
  const now = game.time.worldTime;
  const expired = await sweepExpired({ now, round: game.combat?.round ?? null });
  await announceExpired(expired, now);
}
