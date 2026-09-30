/**
 * Vaarn: Generate Starting Implant
 *
 * GM-only tool for handing out a Starting Cybernetic Implant during play
 * (work-queue.txt item 16 — the Starting tier, chargen-data.js's IMPLANTS,
 * previously only obtainable as a chargen boon or via Foundry's own generic
 * "Create Item" button with an exact matching name). Ported from Character
 * Creation/Cybernetics - Starting.md's 20-row table.
 *
 * Creates an UNOWNED `implant` Item in the Items sidebar (same "no
 * assign-to-actor prompt" convention as every other Phase 1 macro, Matt's
 * ruling 2026-08-21) for the GM to drag onto an actor by hand. No dialog —
 * this table has no per-field choice worth locking, same shape as
 * Generate Advanced Implant/Armour/Crucible/etc.
 *
 * SLOTS: 0 — Cybernetics - Starting.md: implants do NOT occupy Item Slots
 * (work-queue item 15, 2026-08-26, fixed the matching chargen-side bug).
 *
 * `usesRemaining` is seeded to 1 for Trauma-Response Rig (its once-per-day
 * pool), 0 otherwise — matches chargen-app.js's own implant item creation.
 * item-effects.js's createItem hook (work-queue item 15) bakes this
 * implant's stat_mod/hp_bonus/naturalWeapon onto whichever actor it's later
 * dragged onto; its preCreateItem hook blocks the drop if that actor
 * already has another implant (Starting or Advanced) occupying the same
 * Ability slot.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create one Item immediately.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
async function generateStartingImplant()
{
  const { buildStartingImplant } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(await buildStartingImplant());
  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateStartingImplant();
