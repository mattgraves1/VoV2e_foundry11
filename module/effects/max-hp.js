/**
 * THE MAX HP VERB - Effect Engine: Shared Pipelines, chunk 5 (foundry-system-
 * index.csv "Effect Engine: Shared Pipelines", RULED 2026-10-05 by Matt).
 *
 * A change to max HP is its own verb, neither healing nor damage:
 *   - A GAIN gives current HP the same operation: +N max is +N current, x2 max
 *     is x2 current (Growth Serum). It skips the healing gate, Deathblight and
 *     the heal-from-0 floor. It never LOWERS current (RULED A): at 0 or below,
 *     a doubling leaves current where it is, since x2 would deepen a negative.
 *   - A LOSS only clamps current to the new max - no Wounds, no temp HP soak -
 *     keeping 2026-09-13's "max only, current stays".
 *   - Max HP 0 follows the death rules: zero-max-hp.js hangs on the write.
 *   - Inevitable (Lithling, Crysteed) gains no max HP from levels (advancement
 *     decides that before calling here); any other gain raises max and current
 *     like anyone's.
 *
 * PURE: it returns the two fields for the caller to spread into the update it
 * is already making, so a level-up's level, abilities and HP still land in one
 * write. `floor` is the lowest max the change may leave - 0 for a loss, 1 for
 * an elixir's expiry so an expiry cannot kill.
 */
export function maxHpChange(actor, { add = 0, times = null, floor = 0 } = {})
{
  const oldMax = Number(actor?.system?.health?.max ?? 0) || 0;
  const current = Number(actor?.system?.health?.value ?? 0) || 0;
  const raw = times != null ? Math.round(oldMax * times) : oldMax + (Number(add) || 0);
  const max = Math.max(floor, raw);

  let value = current;
  if (max > oldMax)
    value = times != null ? (current > 0 ? Math.round(current * times) : current) : current + (max - oldMax);
  else if (max < oldMax)
    value = Math.min(current, max);

  return { "system.health.max": max, "system.health.value": value };
}
