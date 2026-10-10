/**
 * Vaarn: Generate Exotica
 *
 * GM-only tool for making a WHOLLY NEW Exotica from the book's Exotica
 * Generator (Treasure/Exotica Generator.md): d100 on each of its four columns -
 * a Material, a Form, a Theme and an Action - rolled independently, as the
 * book says, and made into an `exotica` Item named Material + Form ("Coral
 * Anchor") with the four words in its description.
 *
 * foundry-system-index.csv "Exotica Generator Items", RULED 2026-10-09 (Matt):
 * made only here, so a Referee adds curated things to their world where and
 * when they want; worth 1 XP by its type, as every Exotica is; no usage die
 * and no effect until the Referee gives it them - the Effects tab offers
 * suggestions from its words (exotica-generator-suggestions.js), and the
 * builder sets its cost (a usage die, a daily pool, consumed, HP).
 *
 * Creates an UNOWNED Item in the Items sidebar (Matt's call, 2026-08-21, as
 * every Phase 1 generator). No dialog - nothing to configure.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create the item.
 */

async function generateExotica()
{
  const { buildGeneratedExotica } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(buildGeneratedExotica());
  ui.notifications.info(`Created "${item.name}" in the Items directory - open its Effects tab for suggestions.`);
  return item;
}

generateExotica();
