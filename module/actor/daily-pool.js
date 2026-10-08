/**
 * Per-Item Daily Refresh Control — where a once-per-day ability's spent state
 * lives, and what clears it.
 *
 * RULED 2026-09-07 (Matt), and reversed the same day to the shape below: state
 * that no single Item owns stays on the ACTOR (hypergeometricLockout is a
 * lockout on reading any equation, sporeLockout deliberately leaves room for a
 * character holding more than one kind of spore), and state that one Item owns
 * stays on the ITEM. Nothing moved; the distinction is the ruling.
 *
 * RULED 2026-09-20 (Matt): a Long Rest refills the item-level pools too. Until
 * today the two halves disagreed about the OTHER question — rest.js cleared the
 * actor-level lockouts automatically while the item pools came back only when
 * somebody clicked the refresh icon, so "once per day" was code-enforced on one
 * side of the sheet and adjudicated on the other. The refresh buttons stay, on
 * the same reasoning clearLongRestMarkers already gives for leaving the lockout
 * checkboxes in place: a manual override is the Referee's escape hatch, and the
 * timing of "a day" is still theirs to call.
 *
 * WHY THE SPEC IS HERE AND NOT IN knave.js. The pool membership was a curated
 * name list in knave.js and the refill formula was hardcoded a second time in
 * each of actor-sheet.js's two refresh handlers. Teaching rest.js to refill
 * would have written a THIRD copy, which is the exact shape knave.js's own
 * ITEMS_WITH_USE_ICON comment records being bitten by: a gate and its mechanism
 * drifted apart, and the result was a mechanism that worked and could not be
 * reached. So the membership and the size are one answer asked in one place,
 * and the sheet gate, the button and the rest path all read it.
 *
 * ADDING AN ABILITY WITH A DAILY POOL is one entry below and no other edit.
 */

import { MUTATION_EFFECTS } from "./mutation-effects-data.js";
import { IMPLANT_EFFECTS } from "./implant-effects-data.js";
import { perDaySizeOf } from "../effects/sentence.js";

/**
 * Every Item that owns a daily use pool. `size` is the full pool, evaluated
 * against the bearer — Ink Ducts is Level-scaled, Trauma-Response Rig is a flat
 * 1-per-day from its own text ("once per day"), and the difference lives here
 * rather than in the two handlers that used to each hardcode one of them.
 *
 * Matched on `item.name`, the same key the sheet gates render on, so an entry
 * that gets a refresh icon is by construction an entry a rest can refill.
 */
export const DAILY_POOLS = [
  // A mutation's pool is its use sentence's per-day cost (Mutations and
  // Ancestry Rules chunk 4, 2026-10-06): Ink Ducts' Level, and Gas Glands'
  // once a day (RULED 2026-10-06, Matt). The interpreter spends from it.
  ...Object.entries(MUTATION_EFFECTS).flatMap(([name, { effects }]) =>
  {
    const use = effects.find(s => perDaySizeOf(s, 1) !== null);
    return use ? [{ type: "mutation", name, size: actor => perDaySizeOf(use, actor.system.level.value) }] : [];
  }),
  // An implant's from its use sentence's per-day cost since Implants, Exotica
  // and Figments chunk 3a (2026-10-06): the Trauma-Response Rig's once a day.
  ...Object.entries(IMPLANT_EFFECTS).flatMap(([name, { effects }]) =>
  {
    const use = effects.find(s => perDaySizeOf(s, 1) !== null);
    return use ? [{ type: "implant", name, size: actor => perDaySizeOf(use, actor?.system?.level?.value) }] : [];
  }),
];

/**
 * The two name lists knave.js's hasMutationUsePool/hasImplantUsePool helpers
 * gate on, DERIVED from the spec above rather than written out again beside it.
 */
export const MUTATIONS_WITH_USE_POOL = DAILY_POOLS.filter(p => p.type === "mutation").map(p => p.name);
export const IMPLANTS_WITH_USE_POOL  = DAILY_POOLS.filter(p => p.type === "implant").map(p => p.name);

/**
 * "Ink Ducts'" rather than "Ink Ducts's" - measured in Group 241, where the
 * naive apostrophe-s put the first one straight on a rest card. Both names with
 * a pool today are plural-looking, so this is the common case rather than the
 * edge one.
 */
function possessive(name)
{
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

/** The full pool this Item refills to for this bearer, or null if it has none. */
export function dailyPoolSize(actor, item)
{
  const spec = DAILY_POOLS.find(p => p.type === item?.type && p.name === item?.name);
  return spec ? spec.size(actor) : null;
}

/**
 * Refill every spent daily pool on this actor. Returns a phrase per pool it
 * actually moved, for the Long Rest card to name — an untouched pool says
 * nothing rather than reporting a refill that changed no number.
 *
 * REFILLS, NEVER DRAINS. A pool already at or above its size is left alone, so
 * a rest taken after a Level drop does not quietly take Ink Ducts uses away;
 * the refresh button still sets the pool to exactly its size, which is the
 * deliberate difference between an override and a rest.
 */
export async function refillDailyPools(actor)
{
  const refilled = [];

  for(const item of actor.items)
  {
    const size = dailyPoolSize(actor, item);
    if(size === null) continue;
    if((item.system.usesRemaining ?? 0) >= size) continue;

    await item.update({ "system.usesRemaining": size });
    refilled.push(`${possessive(item.name)} spent uses`);
  }

  return refilled;
}
