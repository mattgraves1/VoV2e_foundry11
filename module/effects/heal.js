/**
 * THE HEAL PATH - Effect Engine: Shared Pipelines, chunk 3 (foundry-system-
 * index.csv "Effect Engine: Shared Pipelines", RULED 2026-10-05 by Matt).
 *
 * Every HP gain goes through heal(), in one order:
 *   1. the gate      - Deprived, or a never-heal rule (Inevitable, Repairs),
 *                      refuses the heal and says why (deprived.js blocksHealing)
 *   2. the table     - the damage-type table asked as `healing`; no wildcard
 *                      row reaches it, so nothing that scales damage (Colossal,
 *                      Swarmers, Incorporeal) scales a heal. RULED: "modifying
 *                      heal effects is its own thing"
 *   3. the floor     - "as though starting from 0" (Healing.md): a character at
 *                      -3 healing 5 lands on 5, the debt is not paid first
 *   4. the clamp     - never above max HP
 *   5. scaling       - Deathblight halves the GAIN, per slot (scaleHealing)
 *
 * A HEAL NEVER LOWERS HP. A gain below 0 (HP already above max) writes nothing.
 *
 * A max HP change is NOT a heal (RULED 2026-10-05, its own verb - chunk 5),
 * and a Hull repair is not either (vehicle-sheet.js).
 *
 * WHY A FILE OF ITS OWN. rest.js, compelled-save.js and the sheet all heal,
 * and hp-pipeline.js imports a dozen modules; importing it from them closed an
 * import cycle in chunk 2 (see deal.js). This file imports only the four
 * readers it needs.
 *
 * `gate: false` is for a caller that already gated with its own wording - the
 * Long Rest plan, a Short Rest, companion upkeep, the Universal Ration ("eaten,
 * but no HP"), an hourly heal gated before its roll, an attack's heals - so
 * nobody reads two refusals for one heal.
 */
import { blocksHealing } from "../actor/deprived.js";
import { scaleHealing } from "../actor/healing-multiplier.js";
import { resolveDamageInteractions } from "../item/attack-properties.js";
import { setDefeated } from "./defeated.js";

/** The "as though starting from 0" clause, and nothing else. */
export function healFloor(current)
{
  return Math.max(0, current);
}

/**
 * Heal `target` by `amount`. Returns { before, after, gained, max, note,
 * refused }: `gained` is what landed, which EXCEEDS `amount` whenever HP was
 * negative (the floor doing its work), so a caller reports `gained`, never the
 * roll. `note` is "" or a sentence (leading space included) for the caller's
 * own line - Deathblight's cut, or a table row that stopped the heal.
 * `refused` is true when the gate refused it; the gate has posted why.
 */
export async function heal(target, amount, { label = "healing", gate = true } = {})
{
  const max = Number(target?.system?.health?.max ?? 0);
  const before = Number(target?.system?.health?.value ?? 0);
  const none = (note = "", refused = false) => ({ before, after: before, gained: 0, max, note, refused });
  if (!target) return none();
  if (gate && blocksHealing(target, label)) return none("", true);

  const { mult, immune, applied } = resolveDamageInteractions({ system: { damageTypes: ["healing"] } }, target);
  if (immune) return none(` ${applied.at(-1)?.note ?? "It cannot be healed"}: no HP is restored.`);
  const offered = Math.floor((Number(amount) || 0) * mult);

  const full = Math.min(max, healFloor(before) + offered);
  const { gained: scaled, note } = scaleHealing(target, full - before);
  const gained = Math.max(0, scaled);
  const after = before + gained;
  if (gained > 0) await target.update({ "system.health.value": after });
  // Up from 0 or below: no longer defeated (chunk 4, RULED 2026-10-05). A
  // character is never marked; setDefeated ignores one.
  if (before <= 0 && after > 0) await setDefeated(target, false);
  return { before, after, gained, max, note, refused: false };
}
