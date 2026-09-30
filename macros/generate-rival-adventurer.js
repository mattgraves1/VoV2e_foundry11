/**
 * Vaarn: Generate Rival Adventurer
 *
 * GM-only tool: rolls a full "mini-PC" rival — ancestry (and the Party
 * Role it determines: Warrior/Explorer/Mystic), that ancestry's own
 * appearance/name/manner traits, Transport/Allegiance/Activity, and the
 * matching Equipment Package — and creates a real npc Actor for it.
 * Ported from npc-generator.html's renderRivalAdventurerContent. Built
 * last within work-queue.txt item 1 Phase 3, per the plan: it combines
 * Phase 3's Actor pattern (ancestry traits, same as macros/
 * generate-npc.js's approach) with Phase 1's "reuse an existing pattern"
 * philosophy for the one clean, unambiguous piece of its equipment text —
 * everything else stays flavor text.
 *
 * Two deliberate scope decisions, not oversights:
 *   - The book ties Rival Adventurer Level to "the same Level as the PCs"
 *     (Miscellany/Rival Adventurers.md) — there's no table roll for it at
 *     all, so this macro ASKS for it (a Level field, defaulting to 1 with
 *     an explicit note if left blank) rather than inventing a number.
 *     HP is derived from that Level using the game's general Level->HP
 *     rule (module/actor/hp-by-level.js — Bestiary.md's Stat Block
 *     Reference: "multiply the Level by 4 [average], or 5 if you're
 *     feeling mean... or roll xd8"), with the method chosen by the GM.
 *   - Equipment Package text (e.g. "Sword (d8), Shield (+1 AV), Leather
 *     Armour (AV 13)") mixes weapons/armor/gifts/misc gear in one
 *     comma-separated string with real melee-vs-ranged ambiguity (a
 *     "Pistol (d6)" and a "Dagger (d6)" look identical to a parser) — kept
 *     as flavor text entirely, same conservative call this project has
 *     made every other time free text was this ambiguous (Cybernetic
 *     Implant/Exotica boons, the Bestiary importer's attack parser). The
 *     ONE exception: the armor's own "(AV N)" is a clean, unambiguous
 *     pattern present in every single row, so that number IS extracted
 *     and set as the Actor's real AV — safe because it's not guessing
 *     between categories, just reading a number that's always in the
 *     same format.
 *
 * Creates the Actor in its own "Rival Adventurers" folder (distinct from
 * generate-companion.js/generate-monster.js's "Generated Creatures" and
 * generate-npc.js's "Generated NPCs" — a fully-statted mini-PC opponent is
 * a different enough concept from either to deserve its own folder).
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose Ancestry (or Random) and a
 * Level, then Create.
 */

// The book's own table writes Cacklemaw Exile as the short alias
// "Cacklemaw" (matching its "[[Cacklemaw Exile|Cacklemaw]]" pipe link) —
// needed to resolve ANCESTRY_ROLE's row back to the full ancestry name
// chargen-data.js's SPARK_TABLES/ANCESTRY_CREATURE_TYPES key on.
const ANCESTRY_ALIAS = { "Cacklemaw Exile": "Cacklemaw" };

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function generateRivalAdventurer(ancestryFull, level, hpMethod)
{
  const { ANCESTRY_ROLE, TRANSPORT_ALLEGIANCE_ACTIVITY, EQUIPMENT_PACKAGES } =
    await import("/systems/vaarn/module/actor/rival-adventurer-data.js");
  const { SPARK_TABLES, ANCESTRY_CREATURE_TYPES } = await import("/systems/vaarn/module/actor/chargen-data.js");
  const { pickRowData } = await import("/systems/vaarn/module/actor/npc-builder.js");
  const { computeHP } = await import("/systems/vaarn/module/actor/hp-by-level.js");

  let roleRow;
  if(ancestryFull)
  {
    const alias = ANCESTRY_ALIAS[ancestryFull] || ancestryFull;
    roleRow = ANCESTRY_ROLE.find(r => r.ancestry === alias);
  }
  else
  {
    roleRow = pick(ANCESTRY_ROLE);
  }
  const resolvedAncestryFull = ancestryFull ||
    (Object.entries(ANCESTRY_ALIAS).find(([, short]) => short === roleRow.ancestry)?.[0]) ||
    roleRow.ancestry;
  const role = roleRow.role;

  const travel = pick(TRANSPORT_ALLEGIANCE_ACTIVITY);
  const eqRow = pick(EQUIPMENT_PACKAGES);
  const equipmentText = eqRow[role.toLowerCase()];

  const spark = SPARK_TABLES[resolvedAncestryFull];
  const personalityRow = pickRowData(spark.personality);
  const appearanceRow = pickRowData(spark.appearance);
  const name = personalityRow?.Name || appearanceRow?.Name || `Rival ${role}`;

  const resolvedLevel = level || 1;
  const hp = computeHP(resolvedLevel, hpMethod);

  const avMatch = equipmentText.match(/\(AV (\d+)\)/);
  const avValue = avMatch ? parseInt(avMatch[1]) : 10;

  const abilityValue = Math.min(resolvedLevel, 10);
  const abilities = {};
  for(const k of ["str", "dex", "con", "int", "psy", "ego"]) abilities[k] = { value: abilityValue, max: 10, woundDamage: 0 };

  const creatureFlags = ANCESTRY_CREATURE_TYPES[resolvedAncestryFull] || [];
  const creatureTypes = { biological: false, synthetic: false, psychic: false, fungal: false, mineral: false, hypergeometric: false, outsider: false };
  for(const flag of creatureFlags) creatureTypes[flag] = true;

  const bioLines =
  [
    `<p><b>Ancestry:</b> ${resolvedAncestryFull}</p>`,
    `<p><b>Party Role:</b> ${role}</p>`,
    `<p><b>Transport:</b> ${travel.transport}</p>`,
    `<p><b>Works For:</b> ${travel.workFor}</p>`,
    `<p><b>Currently:</b> ${travel.activity}</p>`,
    `<p><b>Equipment:</b> ${equipmentText}</p>`,
    `<p><i>Equipment is flavor text only — no weapon/armor Items were auto-created (too ambiguous to parse safely; its "(AV N)" was still used for this Actor's real AV). Drag matching Items onto this Actor by hand if needed.</i></p>`
  ];
  if(personalityRow) for(const [k, v] of Object.entries(personalityRow)) if(k !== "Name" && k !== "Manner" && v) bioLines.push(`<p><b>${k}:</b> ${v}</p>`);
  if(appearanceRow) for(const [k, v] of Object.entries(appearanceRow)) if(k !== "Attire" && v) bioLines.push(`<p><b>${k}:</b> ${v}</p>`);
  bioLines.push(`<p><i>Level set to ${resolvedLevel}${level ? "" : " (default — the book says a rival group \"should be the same Level as the PCs\"; re-roll HP/abilities by hand if you change it)"}.</i></p>`);

  let folder = game.folders.find(f => f.name === "Rival Adventurers" && f.type === "Actor");
  if(!folder) folder = await Folder.create({ name: "Rival Adventurers", type: "Actor" });

  const actorCls = getDocumentClass("Actor");
  const actor = await actorCls.create(
  {
    name,
    type: "npc",
    folder: folder.id,
    system:
    {
      level: { value: resolvedLevel, min: 1 },
      health: { value: hp, min: 0, max: hp },
      armor: { value: avValue, bonus: 0 },
      morale: { value: 0, max: 20, min: 0, mode: "", note: "" },
      enc: "1",
      abilities,
      creatureTypes,
      biography: bioLines.join("")
    }
  });

  ui.notifications.info(`Created "${actor.name}" (${role}) in the "Rival Adventurers" folder.`);
}

function openDialog()
{
  const ancestries = ["Cacklemaw Exile", "Cacogen", "Faa Nomad", "Lithling", "Mycomorph", "Neobloom", "Newbeast", "Planeyfolk", "Synth", "True-kin"];
  const ancestryOptions = ["<option value=\"\">Random</option>", ...ancestries.map(a => `<option value="${a}">${a}</option>`)].join("");
  const content = `
    <div class="form-group">
      <label>Ancestry</label>
      <select id="vaarn-ra-ancestry">${ancestryOptions}</select>
    </div>
    <div class="form-group">
      <label>Level (blank = 1)</label>
      <input type="number" id="vaarn-ra-level" min="1" placeholder="match your PCs">
    </div>
    <div class="form-group">
      <label>HP method</label>
      <select id="vaarn-ra-hp-method">
        <option value="average">Average (Level × 4)</option>
        <option value="mean">Mean (Level × 5)</option>
        <option value="random">Random (roll Level d8s)</option>
      </select>
    </div>`;

  new Dialog(
  {
    title: "Generate Rival Adventurer",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const ancestry = html.find("#vaarn-ra-ancestry").val() || null;
          const levelStr = html.find("#vaarn-ra-level").val();
          const level = levelStr === "" ? null : Number(levelStr);
          const hpMethod = html.find("#vaarn-ra-hp-method").val();
          generateRivalAdventurer(ancestry, level, hpMethod);
        }
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

openDialog();
