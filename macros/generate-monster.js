/**
 * Vaarn: Generate Monster
 *
 * GM-only tool: rolls a brand-new procedurally-generated creature and
 * creates a real npc Actor for it — unlike macros/generate-npc.js and
 * generate-companion.js, this does NOT look anything up in the Vaarn
 * Bestiary compendium; it's a wholly new creature composed from Bestiary/
 * Monster Generators.md's own tables. Ported from npc-generator.html's
 * buildMonster, then rebuilt 2026-09-17 on JADE IBIS 15-09-26's Creature
 * Generator (printed pp. 223-224), which restructured the tables:
 *
 *   - ONE d20 roll gives Level, HP, AV, Morale and the number encountered.
 *   - The creature's TYPE is rolled TWICE on the Type column and both are
 *     recorded; a duplicate second roll is ignored. The picker's Type choice
 *     fixes the first roll only.
 *   - Attacks: Level 5+ rolls twice and keeps the higher; Level 8+ rolls
 *     three times and keeps the two highest as two separate attacks.
 *   - The Attacks table's third column is a SPECIAL DEFENSE. The old Psychic
 *     Power column is gone; the book says Psychic creatures generate a
 *     random Mystic Gift instead, which is posted as a note, not rolled.
 *   - A physical form is rolled once per type, on that type's form table.
 *
 * Data lives in module/actor/monster-generator-data.js; the rolling itself in
 * module/actor/monster-generator.js (2026-09-24), shared with the sheet.
 *
 * No weapon Item is created for the rolled attack (its "Weak Melee (d4)"-
 * style name is a category tag, not a specific weapon name worth a real
 * Item — same conservative call the Bestiary importer's attack parser
 * already makes for ambiguous cases). Full attack/special/defense text
 * goes in the Actor's biography instead.
 *
 * Creates the Actor in the same "Generated Creatures" folder macros/
 * generate-companion.js's fixed/pool creature spawns use.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose a Type (or Random), then
 * Create.
 */

// The rolling and the Actor creation live in module/actor/monster-generator.js
// since 2026-09-24, so the Metamorphic Syrup's drink can run the same path
// from the sheet. This macro keeps only the picker. The import is the same
// one every generator macro makes into module/ code.
async function generateMonster(knownType)
{
  const { generateMonster: roll } = await import("/systems/vaarn/module/actor/monster-generator.js");
  return roll(knownType);
}

async function openDialog()
{
  const { CORE_STATS } = await import("/systems/vaarn/module/actor/monster-generator-data.js");
  const types = [...new Set(CORE_STATS.map(c => c.type))];
  const options = ["<option value=\"\">Random</option>", ...types.map(t => `<option value="${t}">${t}</option>`)].join("");

  const content = `
    <div class="form-group">
      <label>First Type</label>
      <select id="vaarn-mg-type">${options}</select>
    </div>
    <p class="notes">The second type is always rolled; a duplicate is ignored.</p>`;

  new Dialog(
  {
    title: "Generate Monster",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const type = html.find("#vaarn-mg-type").val() || null;
          generateMonster(type);
        }
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

openDialog();
