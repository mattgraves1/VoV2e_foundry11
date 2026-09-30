/**
 * Vaarn: Generate Drug
 *
 * GM-only tool for handing out a rolled Vaarnish drug (loot, a shop's
 * stock, a quest reward) without going through full character creation.
 * Ported from the standalone GM-tools generator (C:\Vaarn\Vaarn\
 * npc-generator.html's "Vaarnish Drugs" combined table) — this is a
 * standalone generator in its own right (Colour/Form/Ingested By each
 * rolled independently, Effect rolled twice and combined), separate from
 * the Gear B "Drug (generated below)" sub-roll that Generate Starting Gear
 * also reaches for the same result via the identical DRUG_HUES/DRUG_FORMS/
 * DRUG_INGESTED/DRUG_EFFECTS tables chargen-app.js's _generateDrug uses.
 * The duplicate-effect reroll (no drug gets the same effect twice) mirrors
 * _generateDrug's own behaviour rather than the standalone tool's, which
 * doesn't dedupe — kept consistent with the rest of this codebase.
 *
 * Creates an UNOWNED Item in the Items sidebar (Matt's call, 2026-08-21 —
 * no "assign to actor" prompt) for the GM to drag onto an actor by hand.
 * Nothing to configure, so this macro runs immediately with no picker
 * dialog, same as Generate Starting Gear/Crucible.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create the item.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
async function generateDrug()
{
  const { buildDrug } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(await buildDrug());
  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateDrug();
