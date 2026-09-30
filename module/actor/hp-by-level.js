/**
 * Vaarn's general Level -> HP rule for building creatures, shared by any
 * generator that needs to derive HP from a Level it just rolled/computed
 * itself (macros/generate-quantum-daemon.js, macros/
 * generate-rival-adventurer.js — Monster Generator doesn't need this, its
 * Core Stats table already has real book HP values baked in per row).
 *
 * Found 2026-08-21 (Matt's memory, confirmed against the book) — quoted
 * verbatim from Bestiary/Bestiary.md's Stat Block Reference: "Level (Lvl)
 * is a measure of the creature's power, used to determine its Hit Points
 * (HP) and ability bonuses. To calculate average HP, multiply the Level
 * by 4 (or 5 if you're feeling mean). Generate randomised HP by rolling
 * xd8, where x equals the creature's Level." Cross-checked against
 * Bestiary/Monster Generators.md's own Core Stats table (matches ×4
 * exactly at every row) and an empirical sweep of the ~160 real Bestiary
 * creatures (the ×4 case fits almost everywhere; a handful of named
 * creatures deviate by a few HP, consistent with the text's own "or 5 if
 * you're feeling mean" GM-discretion clause rather than a different rule).
 *
 * Level 0 is a special floor case — every Level-0 Bestiary creature has
 * 1 HP, never 0 (0 × 4 would otherwise round down to nothing), so this
 * always returns at least 1.
 */
export function computeHP(level, method)
{
  if(method === "mean") return Math.max(1, level * 5);
  if(method === "random")
  {
    let total = 0;
    for(let i = 0; i < level; i++) total += Math.floor(Math.random() * 8) + 1;
    return Math.max(1, total);
  }
  return Math.max(1, level * 4); // "average", the default
}
