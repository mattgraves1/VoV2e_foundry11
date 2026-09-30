/**
 * Temporary HP (foundry-system-index.csv "Temporary HP", RULED 2026-09-26 by
 * Matt).
 *
 * A pool held apart from HP and max HP, in `system.health.temp`. Damage spends
 * it before HP; healing never refills it; nothing expires it. Two book sources:
 * the Zenithlight Negatick's Zenithlight Infusion ("+d8 temporary HP per
 * round ... If temporary HP is more than double the character's maximum HP,
 * they explode into flurries of zenithlight and die") and Carousing's
 * Well-Rested ("Gain an additional +d8 temporary HP"), which stays a text
 * result - the GM types the d8 into the field.
 *
 * A SEPARATE BUCKET, NOT A RAISE TO MAX HP (Matt). The Negatick's death test
 * compares temporary HP WITH max HP, so the two have to stay apart.
 *
 * WHAT SPENDS IT is _resolveHPChange in actor-sheet.js, the one funnel every
 * damage path passes through, and nothing else. Three rulings on the edges:
 *   - a HP value the GM types on the sheet is that HP, and spends nothing;
 *   - a death that SETS HP to 0 (a named wound's zeroHp, the Synthhound
 *     taking its owner's blow, a failed save's death) clears it to 0 too;
 *   - Goldencough's failed-save damage, which used to write HP directly, now
 *     goes through the funnel so it spends it like any other damage.
 *
 * Everything here is pure, so tools/test-temp-hp.mjs drives it in node.
 */

export const TEMP_HP_FIELD = "system.health.temp";

/** The pool an actor holds. An actor built before the field existed has none. */
export function tempHpOf(actor)
{
  const n = Number(actor?.system?.health?.temp);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Damage against the pool: what it soaks, what is left of it, what goes on to HP. */
export function soakDamage(temp, dmg)
{
  const pool = Math.max(0, Number(temp) || 0);
  const hit = Math.max(0, Number(dmg) || 0);
  const soaked = Math.min(pool, hit);
  return { soaked, tempLeft: pool - soaked, dmgLeft: hit - soaked };
}

/**
 * The chat line for a soak. `hide` wraps the pool's figure, so a hidden-HP
 * character (Analgesia) is not told it - the caller passes hidden-hp.js's gmHP.
 */
export function soakLine(s, hide = t => t)
{
  return `<b>${s.soaked}</b> damage absorbed by temporary HP${hide(` (${s.tempLeft} left)`)}`
    + (s.dmgLeft ? ` — ${s.dmgLeft} goes on to HP.` : ".");
}

/**
 * The Zenithlight Infusion's death test: temporary HP MORE than `factor` times
 * max HP. Strictly more - at exactly double the victim holds.
 */
export function burstsAt(temp, max, factor = 2)
{
  return Number(temp) > factor * Math.max(0, Number(max) || 0);
}
