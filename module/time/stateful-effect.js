/**
 * Stateful Effect Application — foundry-system-index.csv "Stateful Effect
 * Application".
 *
 * An effect that makes a consistent, durational, mechanical change: Plating
 * Potion's +5 AV, Hilarious Strength's +5 STR and -5 EGO, Lithification
 * Syrup's Mineral creature type, Growth Serum's doubling. The change lands
 * when the effect is activated and is gone when its duration ends.
 *
 * SCOPE, RULED 2026-09-09 (Matt): "consistent, durational, mechanical". His
 * words, and they are wider than the "character sheet value" the row was
 * filed with — a clause like Squishflesh Balm's DIS on physical Saves changes
 * no number but is every bit as consistent and durational as a flat +5. Those
 * ride the `conditions` list here; see the caution about readers below.
 *
 * ── THE DELTA IS RESOLVED ONCE AND REVERSED EXACTLY ────────────────────────
 *
 * RULED 2026-09-09 (Matt): "If my str is +3 and we double it to +6, then
 * regardless of what my str is when the effect ends, we should reduce the
 * current value by 3. If my STR got sapped by 2 points during the effect's
 * duration, it would be effectively 4, we wouldn't halve it to 2."
 *
 * So a multiplier is arithmetic performed ONCE, at activation, and what is
 * stored is the flat number it produced. Nothing recomputes it later. A
 * doubling that granted +3 gives back exactly +3 whatever has happened since.
 *
 * ── WHY ALMOST NOTHING IS WRITTEN ──────────────────────────────────────────
 *
 * Matt's rule asks for reversal that survives other effects landing during the
 * duration. The cheapest way to satisfy that is to never write at all: AV and
 * ability scores are already recomputed from scratch on every render in
 * actor.js, so an effect that CONTRIBUTES its delta to that computation
 * reverses by ceasing to exist. There is no reverse write to lose, mis-order
 * or double-apply, which is the entire class of bug this shape removes.
 *
 * The contributors are summed by `activeDeltas` and read by actor.js's
 * prepareDerivedData. An expired entry is swept by the board; `activeDeltas`
 * additionally filters on `hasExpired` so a missed sweep cannot leave a delta
 * applied.
 *
 * ── HP IS THE EXCEPTION, AND IT IS WRITTEN ─────────────────────────────────
 *
 * Both halves of HP are written rather than contributed, and MAX HP is the
 * one that had to be argued. It looks like the ideal contributor — a number
 * with a base and a boost — and it cannot be one, because five callers do
 * read-modify-write on `system.health.max`: item-effects.js's permanent HP
 * bonus, recurrence.js's Labyrinth Pox, the wound table's maxHpDie in two
 * places, and actor-sheet.js's -1. Each reads the field and writes the result
 * back. If the field carried a temporary contributor, any one of them would
 * bake it in permanently, and it would then survive the expiry as free max HP
 * nobody granted. Five silent bugs, found 2026-09-09 while wiring this.
 *
 * So max HP joins the codebase's existing culture for that field: activation
 * adds the delta, expiry subtracts exactly the same delta. Matt's rule is
 * unaffected — a Labyrinth Pox reduction landing mid-effect stays reduced,
 * because what comes off at the end is the number that went on at the start.
 *
 *  - ACTIVATION. Growth Serum doubles max AND current HP. RULED 2026-09-09
 *    (Matt): "I want growth serum to actually double max AND current HP -
 *    this is almost certainly what's intended."
 *  - EXPIRY. RULED 2026-09-09 (Matt): "current HP can be unchanged when it
 *    ends, the only exception is to clamp it back to the max HP it returns
 *    to." That clamp must be WRITTEN. actor.js's existing clamp lives in
 *    _prepareCharacterData, which is derived data — it corrects the display
 *    and never touches the stored value, so without this the stored HP stays
 *    high and reappears the next time max rises. Found 2026-09-09 while
 *    scoping this row.
 *
 * ── THE +10 CEILING ────────────────────────────────────────────────────────
 *
 * RULED 2026-09-09 (Matt): honour the cap. Nothing here enforces it, and that
 * is deliberate — actor.js applies `Math.min(10, ...)` to the boosted total
 * for every live ability source already, so a contributor is clamped by the
 * same line that clamps implants. Doubling a +7 STR therefore shows +10 and
 * returns to +7, and the stored delta stays the honest +7 it granted.
 *
 * ── A CAUTION ON `conditions` ──────────────────────────────────────────────
 *
 * A condition is inert until something READS it. This file publishes the list;
 * it cannot make a save roll consult it. Each distinct condition is its own
 * wiring job at the point it applies, and that work is not part of this
 * mechanism — flagged to Matt 2026-09-09 when the scope widened. `disSaves`
 * is wired, because Encumbrance Penalty already built that channel and this
 * only adds a second contributor to it.
 */

import { entriesOf, hasExpired } from "./effect-board.js";
import { immunityTo, conditionAv } from "../actor/condition-data.js";

/** The ability keys a delta may name. Anything else is ignored. */
const ABILITY_KEYS = ["str", "dex", "con", "int", "psy", "ego"];

/**
 * An empty delta set. Shaped rather than null so every caller can sum into it
 * without a presence check, which is what keeps actor.js's read to one line
 * per quantity.
 */
export function emptyDeltas()
{
  return { av: 0, abilities: {}, maxHp: 0, creatureTypes: [], conditions: [], endsOnDamage: [],
           light: [], weightOfWorlds: false };
}

/**
 * Turn a roster's declared `stateful` spec into the concrete numbers this
 * activation grants.
 *
 * THIS IS THE ONLY PLACE A MULTIPLIER EXISTS. Everything downstream sees flat
 * deltas, which is what makes reversal independent of what happened in
 * between.
 *
 * `double` reads the EFFECTIVE ability, not the stored `value` — effective is
 * the number printed on the sheet, so "double your STR" doubles the STR the
 * player can see. ASSUMPTION, not a book statement: the book says only
 * "doubling their HP, STR, and CON" and does not say what a doubling does to a
 * character who is already wounded. Flagged rather than buried.
 */
export function resolveDeltas(actor, spec)
{
  const out = emptyDeltas();
  if (!spec) return out;

  if (Number.isFinite(spec.av))    out.av    += Number(spec.av);
  if (Number.isFinite(spec.maxHp)) out.maxHp += Number(spec.maxHp);

  for (const [key, amount] of Object.entries(spec.abilities ?? {}))
    if (ABILITY_KEYS.includes(key) && Number.isFinite(Number(amount)))
      out.abilities[key] = (out.abilities[key] ?? 0) + Number(amount);

  for (const t of spec.creatureTypes ?? []) out.creatureTypes.push(String(t));
  for (const c of spec.conditions    ?? []) out.conditions.push(String(c));
  for (const d of spec.endsOnDamage  ?? []) out.endsOnDamage.push(String(d).toLowerCase());

  // Actor Token Light Emission. Carried as a SPEC rather than a number because
  // the two things a light is - how bright and what colour - are not additive:
  // token-light.js takes the brightest rather than the sum, since the book
  // never rules on two glows stacking. Declared as one object on the roster,
  // stored as a list so a merge of several entries needs no special case.
  for (const l of [].concat(spec.light ?? []))
    if (l?.tier) out.light.push({ tier: String(l.tier), color: l.color ?? null });

  // The multiplier, resolved here and never again. `double` is expressed as
  // "add what you already have", which is the same number and states plainly
  // that what gets stored is an addend.
  for (const key of spec.double ?? [])
  {
    if (key === "maxHp")
    {
      out.maxHp += Number(actor?.system?.health?.max ?? 0);
      continue;
    }
    if (!ABILITY_KEYS.includes(key)) continue;
    const ability = actor?.system?.abilities?.[key];
    const current = Number(ability?.effective ?? ability?.value ?? 0);
    out.abilities[key] = (out.abilities[key] ?? 0) + current;
  }

  return out;
}

/** True if a resolved delta set would actually change anything. */
export function isEmptyDeltas(d)
{
  return !d
    || (!d.av && !d.maxHp
        && !Object.keys(d.abilities ?? {}).length
        && !(d.creatureTypes ?? []).length
        && !(d.conditions ?? []).length
        && !(d.endsOnDamage ?? []).length
        && !(d.light ?? []).length
        && !d.weightOfWorlds);
}

/**
 * Sum every live entry's stored deltas for one actor.
 *
 * Called from prepareDerivedData, so it must be synchronous, cheap and safe
 * before `game` is ready — hence the optional chaining on the clock. An entry
 * with no `applied` payload is an ordinary reminder and contributes nothing,
 * which is how this coexists with every entry the board already holds.
 *
 * It filters expired entries itself rather than trusting the sweep. The sweep
 * is the thing that REMOVES them and posts the card; this is a second line of
 * defence so that a sweep which has not run yet cannot leave a +5 AV standing
 * after its time is up.
 *
 * `maxHp` IS SUMMED HERE BUT DRIVES NOTHING. It is reported so the board and
 * the sheet can say what a boost is worth; the actual max HP is written, for
 * the read-modify-write reason in this file's header. Do not wire it into
 * prepareDerivedData — that is precisely the change that would bake a
 * temporary boost in permanently.
 */
export function activeDeltas(actor)
{
  const out = emptyDeltas();
  const now = game?.time?.worldTime ?? 0;
  const round = game?.combat?.round ?? null;

  for (const entry of entriesOf(actor))
  {
    const applied = entry?.applied;
    if (!applied) continue;
    if (hasExpired(entry, { now, round })) continue;

    out.av    += Number(applied.av    ?? 0);
    out.maxHp += Number(applied.maxHp ?? 0);

    for (const [key, amount] of Object.entries(applied.abilities ?? {}))
      out.abilities[key] = (out.abilities[key] ?? 0) + Number(amount ?? 0);

    for (const t of applied.creatureTypes ?? [])
      if (!out.creatureTypes.includes(t)) out.creatureTypes.push(t);

    // Combat Conditions (condition-data.js, 2026-09-16): a condition the
    // actor is IMMUNE to is dropped here, before any reader sees it, so the
    // Blind mutation's holder can carry a Blind row that does nothing and no
    // applier has to know. A condition that file does not define has no
    // immunity list and passes through exactly as before.
    for (const c of applied.conditions ?? [])
      if (!out.conditions.includes(c) && !immunityTo(actor, c)) out.conditions.push(c);

    for (const d of applied.endsOnDamage ?? [])
      if (!out.endsOnDamage.includes(d)) out.endsOnDamage.push(d);

    // The expiry filter above is what takes an elixir's glow off the token:
    // the entry stops contributing, token-light.js sees no light, and the
    // stashed original goes back. Nothing has to remember to switch it off.
    for (const l of applied.light ?? [])
      if (l?.tier) out.light.push(l);

    // The Gravity Tyrant's Weight of Worlds (2026-09-25): actor.js halves the
    // slot maximum and doubles every item's slots while any entry carries it.
    if (applied.weightOfWorlds) out.weightOfWorlds = true;
  }

  // A WOUND THAT IS A CONDITION (2026-09-16, Matt: "let the wound declare the
  // condition instead"). wounds-data.js declares it, _applyWound writes it
  // onto the wound Item's flag, and it is read here so the same readers see
  // it. Permanent by construction - it ends when the wound Item goes - and
  // immunity applies exactly as for a board entry.
  for (const item of actor?.items ?? [])
    for (const c of item?.flags?.vaarn?.conditions ?? [])
      if (!out.conditions.includes(c) && !immunityTo(actor, c)) out.conditions.push(c);

  // A named Combat Condition contributes its AV FROM THE DEFINITION, not
  // from a number typed on the entry - Entangled's -5 lives in one place.
  // Summed over the surviving keys, so an immune condition contributes
  // nothing and a condition carried twice contributes once.
  out.av += conditionAv(out.conditions);

  return out;
}

/**
 * Live entries this actor carries that END when damage of one of the given
 * attack properties lands on them.
 *
 * RULED 2026-09-11 (Matt), on Regeneration Serum's "regains d6 HP per combat
 * round, unless damaged by fire or acid": "fire/acid damage could prematurely
 * end the effect ... if the effect is active, taking one of these damage types
 * ends it." The book's own wording is ambiguous between that and a skipped
 * tick; this is his reading, recorded as a ruling rather than as the text.
 *
 * The same phrase appears on the Regenerator creature the serum is brewed
 * from — "Dead Regenerators will revive within d6 hours; damage caused by fire
 * or acid prevents this" — so the pairing is the book's, even though what it
 * gates there is a revival rather than a tick.
 *
 * RETURNS ENTRIES, not a merged delta set, because the caller must REMOVE the
 * specific entry: removeEntry runs undoEntryEffects, so an early end reverses
 * exactly what the activation granted. A merged list could not say which row
 * to take off the board.
 *
 * Takes the properties rather than the Item so the caller can pass ONE
 * COMPONENT's types — a folded Bioelectricity die on a flaming weapon must not
 * end an effect the electrical half never touched, which is the same
 * per-component reasoning the damage table already runs on.
 */
export function entriesEndedByDamage(actor, props)
{
  const now = game?.time?.worldTime ?? 0;
  const round = game?.combat?.round ?? null;
  const carried = (props ?? []).map(p => String(p).toLowerCase());
  if (!carried.length) return [];

  return entriesOf(actor).filter(entry =>
  {
    const ends = entry?.applied?.endsOnDamage;
    if (!ends?.length) return false;
    if (hasExpired(entry, { now, round })) return false;
    return ends.some(d => carried.includes(d));
  });
}

/**
 * The activation write: raise max HP by the delta, and current HP with it.
 *
 * Current rises in the SAME PROPORTION the maximum did, so a doubling doubles
 * it and a smaller boost does not overshoot. Growth Serum is the only entry
 * that currently exercises this, and for it the proportion is exactly 2.
 *
 * A character at or below 0 HP is bleeding out, not growing: their maximum
 * still rises, but nothing is added to a current HP the wound table has
 * already resolved, because scaling a negative would deepen it.
 *
 * Returns `{ maxAdded, hpAdded }` for the activation line in chat.
 */
export async function applyActivationHp(actor, applied)
{
  const gain = Number(applied?.maxHp ?? 0);
  if (!(gain > 0)) return { maxAdded: 0, hpAdded: 0 };
  if (actor?.type !== "character") return { maxAdded: 0, hpAdded: 0 };

  const oldMax  = Number(actor.system?.health?.max ?? 0);
  const current = Number(actor.system?.health?.value ?? 0);
  if (!(oldMax > 0)) return { maxAdded: 0, hpAdded: 0 };

  const hpAdded = current > 0 ? Math.round(current * (gain / oldMax)) : 0;

  await actor.update({
    "system.health.max":   oldMax + gain,
    "system.health.value": current + hpAdded
  });
  return { maxAdded: gain, hpAdded };
}

/**
 * The expiry write: take back exactly the max HP this effect granted, then
 * clamp current HP to what the maximum returns to.
 *
 * RULED 2026-09-09 (Matt): current HP is otherwise UNCHANGED. It is not
 * halved and it is not reduced by the delta. A character who ends a doubling
 * at 8 of 20 keeps 8 of 10; one who ends at 18 of 20 is clamped to 10.
 *
 * EXACTLY THE GRANTED DELTA, never a recomputed half. If something reduced
 * max HP during the duration — Labyrinth Pox, a Bloody Gash — that reduction
 * survives, because this subtracts the number that was added rather than
 * halving whatever the maximum has since become. That is Matt's STR rule
 * applied to the one quantity that is written instead of contributed.
 *
 * The floor of 1 stops a max-HP reduction landing mid-effect from expiring
 * into a zero or negative maximum, which Zero Max HP Death reads as dead — an
 * effect wearing off must not kill.
 *
 * Returns `{ max, value }` as written, or null when there was nothing to do.
 */
export async function reverseExpiryHp(actor, applied)
{
  const granted = Number(applied?.maxHp ?? 0);
  if (actor?.type !== "character") return null;

  // A REDUCTION GIVES BACK the max HP it took (Bifurcating Brew, 2026-09-18),
  // and current HP is left alone - the same "otherwise unchanged" rule as the
  // doubling below. The split's HP loss is not undone by the expiry; the
  // table settles what the two halves went through.
  if (granted < 0)
  {
    const restoredMax = Number(actor.system?.health?.max ?? 0) - granted;
    await actor.update({ "system.health.max": restoredMax });
    return { max: restoredMax, value: Number(actor.system?.health?.value ?? 0) };
  }
  if (!(granted > 0)) return null;

  const oldMax = Number(actor.system?.health?.max ?? 0);
  const restoredMax = Math.max(1, oldMax - granted);

  const current = Number(actor.system?.health?.value ?? 0);
  // Never raises HP, and never touches a character at or below 0.
  const restoredValue = current > restoredMax ? restoredMax : current;

  const update = { "system.health.max": restoredMax };
  if (restoredValue !== current) update["system.health.value"] = restoredValue;

  await actor.update(update);
  return { max: restoredMax, value: restoredValue };
}

/**
 * Does this actor currently carry the named condition?
 *
 * The read side of the `conditions` list. Deliberately a plain string test
 * with no vocabulary enforced here — the mechanism never learns what a
 * condition MEANS, exactly as effect-board.js's clearFlag never learns what a
 * flag means, and for the same reason: it is what keeps this one
 * implementation instead of fifty.
 */
export function hasCondition(actor, name)
{
  return activeDeltas(actor).conditions.includes(name);
}

/**
 * DIS ON EVERY SAVE AND TO-HIT ROLL - the Doomsinger's Doom Song, RULED
 * 2026-09-24 (Matt). One key for both halves: in this game every d20 a
 * creature rolls is one or the other, so the sheet's _rollD20 reads it for all
 * of them, and a save card for its saves.
 */
export const DIS_SAVES_AND_ATTACKS = "disSavesAndAttacks";
/** The older, narrower key: DIS on STR, DEX and CON saves (Synthskin Damaged). */
export const DIS_PHYSICAL_SAVES = "disPhysicalSaves";
/**
 * DIS ON EVERY SAVE, AND ONLY SAVES - a Quantum Daemon's Misfortune Aura, "All
 * Saves made with DIS" (Generated Gear and Attacks as Items, RULED 2026-10-04 by
 * Matt: saves only, so not the Doom Song key, which also hits to-hit rolls).
 * Morale saves count.
 */
export const DIS_SAVES = "disSaves";

/**
 * The NAMES of the running board entries that carry `key`, for a roll's
 * "DIS from ..." line - an empty list when the actor does not carry it at all
 * (immunity and expiry already applied, via hasCondition).
 */
export function conditionSourceNames(actor, key)
{
  if (!hasCondition(actor, key)) return [];
  const names = entriesOf(actor).filter(e => (e?.applied?.conditions ?? []).includes(key)).map(e => e.name);
  for (const item of actor?.items ?? [])
    if ((item?.flags?.vaarn?.conditions ?? []).includes(key)) names.push(item.name);
  return [...new Set(names.length ? names : ["an effect on you"])];
}

/**
 * The board's DIS sources on a save in `ability` - Doom Song on any save,
 * the physical key on STR, DEX and CON. Read by card-save.js, so a compelled
 * or affliction card honours the board as the sheet's own buttons do (RULED
 * 2026-09-24, Matt: the physical key reaching cards too is a fix).
 */
export function saveDisSources(actor, ability)
{
  const out = conditionSourceNames(actor, DIS_SAVES_AND_ATTACKS);
  out.push(...conditionSourceNames(actor, DIS_SAVES));
  if (["str", "dex", "con"].includes(ability)) out.push(...conditionSourceNames(actor, DIS_PHYSICAL_SAVES));
  return [...new Set(out)];
}
