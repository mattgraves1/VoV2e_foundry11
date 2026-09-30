/**
 * Vaarn: Generate Armour
 *
 * GM-only tool for handing out a rolled piece of starting-tier armour
 * (loot, a shop's stock, a quest reward) without going through full
 * character creation. Same gap as macros/generate-weapon.js closed for
 * weapons, found while scoping work-queue.txt item 1 Phase 2: Character
 * Creation/Armour - Starting.md's "Armour Type & Quality" table is a plain
 * Browse entry in the standalone tool with no bespoke "generator" wrapping
 * it, so it wasn't caught by the original generator-level audit — but it's
 * the exact same ARMOUR_TABLE chargen-app.js's _rollArmour already uses,
 * so this reuses that logic directly, no new data.
 *
 * Creates an UNOWNED `armor`-type Item in the Items sidebar (Matt's call,
 * 2026-08-21 for the whole Phase 1 batch — no "assign to actor" prompt)
 * for the GM to drag onto an actor by hand. Nothing to configure, so this
 * macro runs immediately with no picker dialog, same as Generate Starting
 * Gear/Crucible/Drug.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create the item.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
async function generateArmour()
{
  const { buildArmour } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(await buildArmour());
  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateArmour();
