/**
 * Vaarn: Generate Advanced Exotica
 *
 * GM-only tool for handing out an Advanced Exotica during play (work-queue
 * item 1.2 — a rarer/bigger tier than Starting Exotica, 100 rows vs 20).
 * Ported from Treasure/Exotica - Advanced.md.
 *
 * Creates an UNOWNED `exotica` Item in the Items sidebar (same "no
 * assign-to-actor prompt" convention as every other Phase 1 macro), with
 * the table's own Slots number, the raw Uses text folded into the
 * description for flavor, and — work-queue item 10.3.3, 2026-08-27 — a
 * REAL tracked `usageDie`/`usesRemaining` field when the entry has one
 * (see advanced-exotica-data.js's header for the full mechanic). Entries
 * with neither (Unlimited/unique text) get no mechanical field, same as
 * before.
 *
 * SPECIAL CASE — rows 08/09 ("Exotic Melee/Ranged Weapon") explicitly say
 * to generate an Exotic-tier weapon instead of a flavor item. This macro
 * reuses module/actor/weapon-roller.js's rollWeapon() (same function
 * Generate Weapon's Exotic quality uses) to create a real tagged weapon
 * Item in that case, rather than a generic "exotica" Item.
 *
 * No dialog — no per-field choice worth locking for this table.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create one Item immediately.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache so the two
// can never drift. This macro only creates what the builder returns.
// An Exotic-weapon row yields the weapon and, when Polymorphic, its paired
// alt form, both carrying the name link in their flags already.
async function generateAdvancedExotica()
{
  const { buildAdvancedExotica } = await import("/systems/vaarn/module/item/loot-builders.js");
  const data = await buildAdvancedExotica();
  const entry = data.exoticaEntry;
  const created = await getDocumentClass("Item").createDocuments(data);
  const names = created.map(i => `"${i.name}"`).join(" and its Polymorphic pair ");
  if(entry?.weaponGen)
    ui.notifications.info(`Advanced Exotica roll "${entry.name}" (${entry.roll}) generated an Exotic weapon: created ${names}${data.baseNote ?? ""} in the Items directory.`);
  else
    ui.notifications.info(`Created ${names}${created[0].type === "armor" ? " (armor)" : ""} in the Items directory.`);
  return created[0];
}

generateAdvancedExotica();
