/**
 * Vaarn: Generate Starting Gear
 *
 * GM-only tool for handing out a rolled pair of adventuring gear (loot, a
 * shop's stock, a quest reward) without going through full character
 * creation. Ported from the standalone GM-tools generator
 * (C:\Vaarn\Vaarn\npc-generator.html's "Starting Gear" combined table,
 * Character Creation/Gear - Starting.md) — same GEAR_A/GEAR_B_BASE roll
 * chargen-app.js's _rollGear already uses, including the Gear B "Drug
 * (generated below)" sub-roll into a full Vaarnish Drug via _generateDrug's
 * DRUG_* tables.
 *
 * Creates UNOWNED Item(s) in the Items sidebar (Matt's call, 2026-08-21 —
 * no "assign to actor" prompt) for the GM to drag onto an actor by hand.
 * There's nothing to configure — both columns are always rolled — so this
 * macro runs immediately with no picker dialog, unlike Generate Weapon.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create the item(s).
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
async function generateGear()
{
  const { buildGear } = await import("/systems/vaarn/module/item/loot-builders.js");
  const created = await getDocumentClass("Item").createDocuments(buildGear());
  ui.notifications.info(`Created ${created.map(i => `"${i.name}"`).join(" and ")} in the Items directory.`);
  return created;
}

generateGear();
