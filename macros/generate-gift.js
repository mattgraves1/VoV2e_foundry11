/**
 * Vaarn: Generate Gift
 *
 * GM-only tool for handing out a rolled Mystic Gift (loot, a shop's stock,
 * a quest reward, an NPC's ability) without going through full character
 * creation or rolling a Boon. Ported from the standalone GM-tools
 * generator (C:\Vaarn\Vaarn\npc-generator.html's "Gift Quality & Form"
 * bespoke generator, Core Rules/Mystic Gifts.md) — same GIFT_QUALITIES_ALL/
 * GIFT_FORMS_ALL 4x20 grids chargen-app.js's _rollGift "random" mode
 * already uses (pick one of 4 columns, then roll d20 within it,
 * independently for Quality and Form), reusing chargen's exact `gift`
 * Item-creation code.
 *
 * Found late during work-queue.txt item 1 Phase 3 — this was originally
 * mis-filed as needing Phase 3's Bestiary-spawn helper (it doesn't; it's
 * pure Item creation, no Actor involved at all) alongside Settlement
 * Overview and Vault Room Contents (see macros/generate-settlement.js and
 * macros/generate-room-contents.js for those two, same correction).
 *
 * Creates an UNOWNED `gift`-type Item in the Items sidebar (Matt's call,
 * 2026-08-21 for the whole Phase 1 batch — no "assign to actor" prompt),
 * same as every Phase 1 macro. No dialog — nothing to configure, so this
 * macro runs immediately, same as Generate Starting Gear/Crucible/Drug/
 * Armour.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create the item.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
async function generateGift()
{
  const { buildGift } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(await buildGift());
  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateGift();
