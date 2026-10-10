/**
 * LEVEL DRAIN WITHOUT A LEDGER - the pure rules (foundry-system-index.csv
 * "Level Drain Without a Ledger"). level-drain.js applies them; this file has
 * no Foundry global, so tools/test-level-drain-fallback.mjs reads it directly.
 *
 * RULED 2026-10-09 (Matt):
 *  - A character drains through its advancement ledger only when the ledger is
 *    COMPLETE: exactly one entry for each Level from 2 to its current Level.
 *    Anything else - typed levels on top, a gap in the middle, no ledger at all -
 *    takes the book's drain, whatever the order.
 *  - The book's drain: the Level, 1d8 off maximum HP, and 3 points off the
 *    BASE abilities, one each from 3 different abilities (a level-up in
 *    reverse) - the 3 highest, never below 0, ties broken at random.
 *  - Ledger entries above the new Level come out with the drain and are kept
 *    with it, so the ledger never holds a Level the character is not.
 *  - A drained NPC loses a Level and its level-derived stats follow: 4 off
 *    maximum HP (the Bestiary's Level x 4) and every ability set to the new
 *    Level, the mirror of the drainer's own gain.
 */

/** "Abilities may never be raised higher than +10." (advancement.js ABILITY_CAP) */
const ABILITY_CAP = 10;

/** One ledger entry per Level from 2 to `level`, and nothing else. */
export function ledgerComplete(advancement, level)
{
  const levels = (advancement ?? []).map(e => Number(e?.level)).sort((a, b) => a - b);
  const want = Math.max(0, Number(level) - 1);
  return levels.length === want && levels.every((l, i) => l === i + 2);
}

/** The ledger entries for Levels above `level` - what a fallback drain lifts out. */
export function entriesAbove(advancement, level)
{
  return (advancement ?? []).filter(e => Number(e?.level) > Number(level));
}

/**
 * The (up to) three abilities a book drain takes a point from: the highest base
 * scores above 0, ties broken by `random` (Math.random in play). Fewer than
 * three when fewer are above 0.
 */
export function drainedAbilities(abilities, random = Math.random)
{
  return Object.entries(abilities ?? {})
    .map(([key, a]) => ({ key, value: Number(a?.value ?? 0), tie: random() }))
    .filter(a => a.value > 0)
    .sort((x, y) => y.value - x.value || x.tie - y.tie)
    .slice(0, 3)
    .map(a => a.key);
}

/** An NPC's abilities at `level`: its Level, capped, as the Bestiary builds them. */
export function npcAbilityValue(level)
{
  return Math.max(0, Math.min(Number(level), ABILITY_CAP));
}

/** The maximum HP a drained NPC loses per Level: the Bestiary's Level x 4. */
export const NPC_HP_PER_LEVEL = 4;

/**
 * The stored drains to replay, in the order that undoes them: NEWEST first.
 * Each drain took the top of what was left, so the last one taken is the first
 * one back - a ledger re-filled oldest-first would push the Level 5 entry
 * before the Level 4 one, and an NPC restored oldest-first would end on the
 * abilities it had after its first drain, not before it.
 */
export function restoreOrder(drains)
{
  return [...(drains ?? [])].reverse();
}
