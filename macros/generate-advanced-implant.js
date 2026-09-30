/**
 * Vaarn: Generate Advanced Implant
 *
 * GM-only tool for handing out an Advanced Cybernetic Implant during play
 * (work-queue.txt item 1.2 — a rarer/pricier tier than Starting
 * Cybernetics, found via play rather than rolled at character creation).
 * Ported from Treasure/Cybernetics - Advanced.md's 20-row table.
 *
 * Creates an UNOWNED `implant` Item in the Items sidebar (same "no
 * assign-to-actor prompt" convention as every other Phase 1 macro,
 * Matt's ruling 2026-08-21) for the GM to drag onto an actor by hand.
 * No dialog — this table has no per-field choice worth locking (unlike
 * Generate Weapon/Generate Flavor Item's multi-column rolls), same shape
 * as Generate Armour/Generate Crucible/etc.
 *
 * SLOTS: see advanced-implants-data.js's own header — Matt's ruling
 * 2026-08-23: these follow the same 0-slot rule as Starting Cybernetics
 * (the vault's "occupy multiple Item Slots" line is suspected AI
 * elaboration, not confirmed book content).
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create one Item immediately.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
async function generateAdvancedImplant()
{
  const { buildAdvancedImplant } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(await buildAdvancedImplant());
  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateAdvancedImplant();
