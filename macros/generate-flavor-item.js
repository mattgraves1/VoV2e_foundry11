/**
 * Vaarn: Generate Flavor Item
 *
 * GM-only tool for handing out a rolled piece of flavor treasure (loot, a
 * shop's stock, a quest reward) without going through full character
 * creation. Ported from six standalone GM-tools generators
 * (C:\Vaarn\Vaarn\npc-generator.html's Fine Clothing / Musical Instruments /
 * Vaarnish Poisons / Books / Fine Art / Jewellery combined tables,
 * Miscellany/*.md + Core Rules/Toxins.md) — data tables live in
 * chargen-data.js (FINE_CLOTHING, MUSICAL_INSTRUMENTS, VAARNISH_POISONS,
 * BOOKS, FINE_ART, JEWELLERY), same convention as every other table this
 * project ports. Combined into one macro with a Category picker rather than
 * six near-identical macros, since (per Matt's 2026-08-21 decision) all six
 * create the exact same shape of thing: a 1-slot flavor `item`-type Item
 * with no mechanical fields, name + description only.
 *
 * BUG FIX 2026-08-21 (found while adding manual override, before this macro
 * had ever been tested live — see testing-checklist.txt Group 15): this
 * macro originally rolled ONE shared row per category and read every field
 * off it, but the source tool's own INDEPENDENT_ROLL_CONFIGS confirms all
 * six of these categories roll EACH column independently ("Roll d20 for
 * each column" — Fine Clothing/Musical Instruments/Vaarnish Poisons/Books/
 * Fine Art/Jewellery all list every column as its own single-column group).
 * Every field below now gets its own independent roll by default.
 *
 * Every field is also manually overridable (Matt's call, 2026-08-21 while
 * scoping work-queue.txt item 2 — this per-field "leave it on Random, or
 * lock a specific value" capability is what makes a static Item compendium
 * unnecessary). Choose a Category first; that category's own field
 * dropdowns (each with every real option from its table, plus Random)
 * appear below it.
 *
 * Creates an UNOWNED Item in the Items sidebar (Matt's call, 2026-08-21 —
 * no "assign to actor" prompt) for the GM to drag onto an actor by hand.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose a Category, lock any fields
 * you want, then Create.
 */

// The six tables' fields and name/description builders live in
// module/item/loot-builders.js (FLAVOR_CATEGORIES) since 2026-09-19, shared
// with Treasure Cache Generation, which rolls Books, Jewellery and Vaarnish
// Poisons from them.
let CATEGORIES = null;

function fieldId(category, key)
{
  return `vaarn-fi-${category.replace(/\s+/g, "_")}-${key}`;
}

async function generateFlavorItem(category, overrides)
{
  const { buildFlavor } = await import("/systems/vaarn/module/item/loot-builders.js");
  const [item] = await getDocumentClass("Item").createDocuments(buildFlavor(category, overrides));
  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

function openDialog()
{
  Promise.all([
    import("/systems/vaarn/module/actor/chargen-data.js"),
    import("/systems/vaarn/module/item/loot-builders.js")
  ]).then(([data, builders]) =>
  {
    CATEGORIES = builders.FLAVOR_CATEGORIES;
    const categoryOptions = Object.keys(CATEGORIES).map(c => `<option value="${c}">${c}</option>`).join("");

    const fieldGroups = Object.entries(CATEGORIES).map(([category, config]) =>
    {
      const table = data[config.table];
      const fieldRows = config.fields.map((f) =>
      {
        const seen = new Set();
        const optionsHtml = table.map(row => row[f.key]).filter(v => v && !seen.has(v) && seen.add(v))
          .map(v => `<option value="${v.replace(/"/g, "&quot;")}">${builders.stripWikilinks(v)}</option>`).join("");
        return `<div class="form-group"><label>${f.label}</label><select id="${fieldId(category, f.key)}"><option value="">Random</option>${optionsHtml}</select></div>`;
      }).join("");
      return `<div class="vaarn-fi-category-fields" data-category="${category}" style="display:none;">${fieldRows}</div>`;
    }).join("");

    const content = `
      <div class="form-group">
        <label>Category</label>
        <select id="vaarn-fi-category">${categoryOptions}</select>
      </div>
      ${fieldGroups}`;

    new Dialog(
    {
      title: "Generate Flavor Item",
      content,
      buttons:
      {
        create:
        {
          label: "Create",
          callback: (html) =>
          {
            const category = html.find("#vaarn-fi-category").val();
            const overrides = {};
            for(const f of CATEGORIES[category].fields)
              overrides[f.key] = html.find(`#${fieldId(category, f.key)}`).val() || null;
            generateFlavorItem(category, overrides);
          }
        }
      },
      default: "create",
      render: (html) =>
      {
        const updateVisibility = () =>
        {
          const category = html.find("#vaarn-fi-category").val();
          html.find(".vaarn-fi-category-fields").each((_, el) =>
          {
            const $el = $(el);
            $el.toggle($el.data("category") === category);
          });
        };
        html.find("#vaarn-fi-category").on("change", updateVisibility);
        updateVisibility();
      }
    },
    { width: 360 }).render(true);
  });
}

openDialog();
