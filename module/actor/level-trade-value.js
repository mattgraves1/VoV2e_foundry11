/**
 * Level-Derived Trade Value — 2026-09-18.
 *
 * Barter: "Vehicles, Steeds, and other animals have a Trade Value equal to
 * their Level or current Hull Points multiplied by ten."
 *
 * DERIVED, NEVER STORED. That is the whole difference from Trade-Value
 * Modifier, which bakes an Item's number at creation: a wounded steed or a
 * damaged skuggy is worth less, so the value is read from the live stat every
 * time the sheet draws.
 *
 * Matt's rulings, 2026-09-18:
 *   - Which actors: every vehicle (current Hull), and the steeds and pets —
 *     marked `flags.vaarn.levelTradeValue` when their packs are built
 *     (current Level). No other NPC has one.
 *   - Level means CURRENT Level: a levelled pet is worth more, a drained one
 *     less.
 *   - A vehicle may carry `flags.vaarn.materialsValue` instead. The Vimana
 *     does: Hull 1 x 10 would tell players a throne wars are fought over is
 *     worth 10, so it shows only what Matt would pay for a destroyed one.
 *
 * Returns { value, materials } or null when the actor has no trade value.
 */
export function levelTradeValue(actor)
{
  if(!actor) return null;
  if(actor.type === "vehicle")
  {
    const materials = actor.getFlag?.("vaarn", "materialsValue");
    if(materials != null) return { value: Number(materials), materials: true };
    return { value: Math.max(0, Number(actor.system.health?.value) || 0) * 10, materials: false };
  }
  if(actor.type === "npc" && actor.getFlag?.("vaarn", "levelTradeValue"))
    return { value: Math.max(0, Number(actor.system.level?.value) || 0) * 10, materials: false };
  return null;
}
