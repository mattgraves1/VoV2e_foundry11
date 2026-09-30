/**
 * Vaarn: Generate Trade Good
 *
 * GM-only tool for rolling a found cache of Trade Goods during play
 * (work-queue.txt item 1.2). Ported from Treasure/Trade Goods.md's 50-row
 * d100 table.
 *
 * Creates an UNOWNED generic `item` Item in the Items sidebar. Vaarn has
 * no currency (Treasure/Barter.md — pure barter, no coin), so this stores
 * a plain `tradeValue` number (item 13's field, replacing the old
 * Knave-fork `coppers`) rather than anything currency-like.
 *
 * QUANTITY/VALUE DESIGN (see trade-goods-data.js's own header for the
 * full reasoning): the table prices some goods per single unit ("1 per
 * chunk") and others per group ("1 per 100 grubs", "1 per 20 shells").
 * Rather than silently collapse that into one number, this macro rolls
 * the raw found count AND the per-unit-group value separately, then
 * sets the created Item's `quantity` to the number of PRICED GROUPS
 * (raw count / group size) and `tradeValue` to the rolled per-group
 * value — so the sheet's own Quantity x Trade Value multiply out to the
 * stack's real worth with no hidden math, while the raw found count and
 * the book's own wording both still appear in the description.
 *
 * No dialog — no per-field choice worth locking for this table.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create one Item immediately.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
async function generateTradeGood()
{
  const { buildTradeGood } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(await buildTradeGood());
  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateTradeGood();
