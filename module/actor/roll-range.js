/**
 * Rolling on a WEIGHTED table, where an entry can occupy several results.
 *
 * Rosters used to be positional: the array index was the roll, so a d20 table
 * was read as `TABLE[d(20) - 1]`. CRIMSON HOUND re-rolled Example Elixirs and
 * the Hypergeometric Codex onto weighted d100 tables where common results
 * occupy three numbers and rare ones two, and position no longer determines
 * anything. Entries carry an explicit `roll: [lo, hi]` instead.
 *
 * REPAIRED RANGES. The source prints "43-45" immediately followed by "44-46" in
 * BOTH tables — one propagated layout bug, so rolls of 44 and 45 match two
 * entries and the widths sum to 102 rather than 100. Matt's ruling 2026-08-29:
 * the vault transcribes that faithfully, and the repair happens HERE, where it
 * is visible. The two entries are re-cut to 43-44 and 45-46, which fills the
 * same 43-46 span with no overlap and no gap, and leaves every other range in
 * both tables untouched.
 */

/** Every result the table covers, or NaN if it is not contiguous from 1. */
export function tableSize(table) {
  let max = 0;
  for (const e of table) {
    if (!Array.isArray(e.roll)) return NaN;
    max = Math.max(max, e.roll[1]);
  }
  return max;
}

/**
 * Assert the table tiles its die exactly once — no gaps, no overlaps.
 *
 * This is the check that caught both extraction bugs behind these tables, and
 * it is cheap enough to run at load. A weighted roster that does not tile is
 * either mis-transcribed or carries a source defect, and those look identical
 * from the inside; either way a roll can silently return the wrong entry or
 * nothing at all.
 */
export function validateTable(table, label) {
  const size = tableSize(table);
  if (!Number.isFinite(size)) return [`${label}: an entry has no roll range`];
  const seen = new Array(size + 1).fill(0);
  for (const e of table) for (let n = e.roll[0]; n <= e.roll[1]; n++) seen[n]++;
  const gaps = [], dupes = [];
  for (let n = 1; n <= size; n++) {
    if (seen[n] === 0) gaps.push(n);
    if (seen[n] > 1) dupes.push(n);
  }
  const out = [];
  if (gaps.length) out.push(`${label}: no entry for ${gaps.join(", ")}`);
  if (dupes.length) out.push(`${label}: ${dupes.join(", ")} match more than one entry`);
  return out;
}

/**
 * Resolve a roll against a weighted table.
 * Returns the matching entry, or undefined if the value falls in a gap.
 */
export function resolveRoll(table, value) {
  return table.find(e => Array.isArray(e.roll) && value >= e.roll[0] && value <= e.roll[1]);
}

/**
 * Roll on a weighted table using the caller's die function.
 * `die(n)` should return 1..n, matching the existing chargen helper.
 */
export function rollOnTable(table, die) {
  const size = tableSize(table);
  return resolveRoll(table, die(size));
}
