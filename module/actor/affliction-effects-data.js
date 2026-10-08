/**
 * The Diseases and Nanomachine Infections as effect sentences - Effect Engine:
 * Wounds and Afflictions, chunk 1 (foundry-system-index.csv "Effect Engine:
 * Wounds and Afflictions", BUILD PLAN RULED 2026-10-06 by Matt).
 *
 * One entry per AFFLICTIONS row (affliction-data.js), by its `key` - which an
 * affliction's Item carries as system.afflictionKey, whatever its type (Brain
 * Coral's is a helm). Checked both ways by tools/test-wound-effects.mjs.
 *
 * READ THIS BEFORE EDITING:
 *  - THE BOOK'S WORDS ARE THE ROSTER'S: every text is the row's `effects`.
 *  - `passive` is the affliction HELD: its AV, its stateful conditions (the
 *    bundle stateful-effect.js reads, as an elixir's), its light, the
 *    mutations it suppresses, its ambush immunity asleep, its double rations.
 *  - `stat` (baked) is fixed when it is caught: the ability slot it takes and
 *    the order a d6 slot is rolled in, the Usurper Arm's possible locations.
 *  - The time engines (ruling C) are named handlers carrying the row's spec:
 *    the recurring save and its stages (`recurrence`), the Gitch's debridement
 *    (`treatment`), the trades the Referee applies by hand (`manual-effect`),
 *    a failed save's consequence (Goldencough's coughing fit).
 *  - NOT HERE, by ruling D or as creation: who catches it and how (kind,
 *    virulence, vector, voluntary), the cure's words, the Item made (item),
 *    the book reference. tools/test-wound-effects.mjs names each.
 *  - BUILT ON FIRST READ (afflictionEffects()), not at import: affliction-data.js
 *    reaches stateful-effect.js, which reads the wound translator (chunk 2a), so
 *    reading AFFLICTIONS while modules load closes a cycle - the flora's shape.
 *
 * Pure data: no Foundry global.
 */

import { AFFLICTIONS } from "./affliction-data.js";

function sentencesFor(a)
{
  const held = (d, extra = {}) => ({ when: "passive", ...extra, do: d, text: a.effects });
  const fixed = d => ({ when: "stat", baked: true, do: d, text: a.effects });
  const use = d => ({ when: "use", do: d, text: a.effects });
  const out = [];

  if (Number.isFinite(a.av)) out.push(held({ verb: "modify", stat: "av", amount: `${a.av < 0 ? "" : "+"}${a.av}` }));
  if (a.conditions?.length) out.push(held({ verb: "special", handler: "stateful", conditions: [...a.conditions] }));
  if (a.light) out.push(held({ verb: "emit-light", ...a.light }));
  if (a.suppresses?.length) out.push(held({ verb: "special", handler: "suppress", names: [...a.suppresses] }));
  if (a.ambush === "immuneAsleep") out.push(held({ verb: "immune", to: "ambush" }, { if: [{ gate: "asleep" }] }));
  if (a.rationDraw)
  {
    if (a.rationDraw.food) out.push(held({ verb: "upkeep", item: "Food Ration", per: "day", times: a.rationDraw.food, unpaid: "deprived" }));
    if (a.rationDraw.water) out.push(held({ verb: "upkeep", item: "Water Ration", per: "day", times: a.rationDraw.water, unpaid: "deprived" }));
  }
  if (a.abilitySlot) out.push(fixed({ verb: "special", handler: "ability-slot", slot: a.abilitySlot, ...(a.slotRollOrder ? { rollOrder: [...a.slotRollOrder] } : {}) }));
  if (a.locations) out.push(fixed({ verb: "special", handler: "location", locations: [...a.locations] }));
  if (a.saveGated) out.push(use({ verb: "special", handler: "save-gated", ...a.saveGated }));
  if (a.manualEffect) out.push(use({ verb: "special", handler: "manual-effect", ...a.manualEffect }));
  if (a.treatment) out.push(use({ verb: "special", handler: "treatment", ...a.treatment }));
  if (a.onFailedSave) out.push({ when: "on-failed-save", do: { verb: "special", handler: "failed-save", ...a.onFailedSave }, text: a.effects });
  if (a.recurrenceKey || a.stages)
  {
    const span = a.declaredSpan ? { for: { duration: `${a.declaredSpan.unit}s`, amount: a.declaredSpan.amount } } : {};
    out.push({ when: "each-day", do: { verb: "special", handler: "recurrence",
      ...(a.recurrenceKey ? { key: a.recurrenceKey } : {}), ...(a.stages ? { stages: a.stages.map(s => ({ ...s })) } : {}),
      ...(a.cureReversesDeparture ? { cureReversesDeparture: a.cureReversesDeparture } : {}) }, ...span, text: a.effects });
  }
  // The words, held: every affliction's whole entry as a reminder.
  out.push(held({ verb: "reminder" }));
  return out;
}

let cache = null;
/** { [affliction key]: { name, effects } }, built on first read. */
export function afflictionEffects()
{
  return cache ??= Object.fromEntries(AFFLICTIONS.map(a => [a.key, { name: a.name, effects: sentencesFor(a) }]));
}

// Chunk 3 (RULED 2026-10-06, Matt): what contraction reads, by key - there is
// no Item yet when it is rolled, so these are the book's sentences, not an Item's.
const handlerOf = (key, when, handler) =>
  (afflictionEffects()[key]?.effects ?? []).find(s => s.when === when && s.do?.handler === handler)?.do ?? null;

/** The baked slot and location an affliction is caught with: { abilitySlot, slotRollOrder, locations }. */
export function afflictionFixedOf(key)
{
  const slot = handlerOf(key, "stat", "ability-slot");
  const loc = handlerOf(key, "stat", "location");
  return { abilitySlot: slot?.slot ?? null, slotRollOrder: slot?.rollOrder ?? null, locations: loc?.locations ?? null };
}

/** The mutation names an affliction suppresses while held (Jellybones), or []. */
export function afflictionSuppressesOf(key)
{
  return handlerOf(key, "passive", "suppress")?.names ?? [];
}
