/**
 * Vaarn: Generate Companion
 *
 * GM-only tool for the table-level "companion creature/NPC" feature from
 * npc-generator.html: certain location generators always attach a
 * creature stat block (or a full rolled NPC) alongside their flavor text,
 * regardless of what the rolled cell text says. Ported from that tool's
 * TABLE_COMPANIONS/TABLE_NPC_COMPANIONS config + renderCompanions/
 * renderNpcCompanions (npc-generator.html) — work-queue.txt item 1 Phase
 * 3's second real consumer of the shared Bestiary-spawn helper
 * (module/actor/bestiary-spawn.js) and the NPC builder (module/actor/
 * npc-builder.js), after macros/generate-npc.js.
 *
 * Six categories, each rolling its own location flavor text and then
 * spawning a companion:
 *   - Bandit Camp -> 1 Bandit (its "Weapons" column becomes a bio note on
 *     the spawned Actor, standing in for the book's "generate p.xx"
 *     reference, same as the source tool's attackFromColumn).
 *   - Faa Nomad Camp -> 1 Faa Nomad (note: "A group of eight or more
 *     includes a Level 2 leader" — informational only, this always spawns
 *     exactly one stat-block reference for the GM to reuse/duplicate by
 *     hand, same as the source tool; no automatic group-size roll exists
 *     in the source tool either).
 *   - Hegemony Outpost -> 1 creature randomly picked from [Hegemony
 *     Centurion, Hegemony Ordinator] (the source tool's "pool" mode).
 *   - Science-Mystic's Abode -> 1 Mystic.
 *   - Oracle's Sanctum -> 1 full rolled civilian NPC (ancestry/career/
 *     etc. all random, since the source table gives no ancestry hint —
 *     reuses module/actor/npc-builder.js's buildAndSpawnNPC exactly like
 *     macros/generate-npc.js's random-everything path).
 *   - Minor Faction Leader -> 1 full rolled civilian NPC, same as above,
 *     rolling only the "Faction Details" half of the Minor Faction
 *     composite generator (Reputation/Type/Goal flavor is available
 *     separately via macros/generate-narrative.js's "Minor Faction").
 *
 * Bandit Camp and Minor Faction Leader pull their flavor text from
 * module/actor/composite-generator-data.js (they're two of Phase 2's 18
 * composite generators) via module/actor/composite-roller.js; the other
 * four pull from module/actor/rolltable-data.js by name via module/actor/
 * rolltable-picker.js (already-built plain RollTables from Phase 2 — read
 * directly from that data file rather than via a live RollTable.draw(),
 * so this macro doesn't depend
 * on macros/dev/import-rolltables.js having been run first).
 *
 * Fixed/pool creature spawns go in a "Generated Creatures" folder; the
 * two full-NPC categories reuse generate-npc.js's "Generated NPCs" folder.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose a Category, then Create.
 */

const CONFIG = {
  bandit_camp:
  {
    label: "Bandit Camp", kind: "composite", generatorKey: "bandit_camp", subheading: "Bandit Camp",
    spawn: { mode: "fixed", creatures: ["Bandit"], attackFromColumn: "Weapons" }
  },
  faa_nomad_camp:
  {
    label: "Faa Nomad Camp", kind: "rolltable", tableName: "Faa Nomad Camp Generator",
    spawn: { mode: "fixed", creatures: ["Faa Nomad"] },
    note: "A group of eight or more includes a Level 2 leader."
  },
  hegemony_outpost:
  {
    label: "Hegemony Outpost", kind: "rolltable", tableName: "Hegemony Outpost Generator (d20)",
    spawn: { mode: "pool", pool: ["Hegemony Centurion", "Hegemony Ordinator"] }
  },
  science_mystic_abode:
  {
    label: "Science-Mystic's Abode", kind: "rolltable", tableName: "Science-Mystic's Abode Generator (d20)",
    spawn: { mode: "fixed", creatures: ["Mystic"] }
  },
  oracle_sanctum:
  {
    label: "Oracle's Sanctum", kind: "rolltable", tableName: "Oracle's Sanctum Generator (d20)",
    spawn: { mode: "npc" }
  },
  minor_faction_leader:
  {
    label: "Minor Faction Leader", kind: "composite", generatorKey: "minor_factions", subheading: "Faction Details",
    spawn: { mode: "npc" }
  }
};

async function rollFlavor(config)
{
  if(config.kind === "rolltable")
  {
    const { pickRandomResultHtml } = await import("/systems/vaarn/module/actor/rolltable-picker.js");
    const html = await pickRandomResultHtml(config.tableName);
    return { html: `<p>${html}</p>`, values: {} };
  }

  const { COMPOSITE_GENERATORS } = await import("/systems/vaarn/module/actor/composite-generator-data.js");
  const { rollSingleTable, findTable } = await import("/systems/vaarn/module/actor/composite-roller.js");
  const generator = COMPOSITE_GENERATORS.find(g => g.key === config.generatorKey);
  const table = findTable(generator, config.subheading);
  return rollSingleTable(table);
}

async function spawnFixedOrPool(spawn, values)
{
  const { spawnNamedCreature } = await import("/systems/vaarn/module/actor/bestiary-spawn.js");

  let folder = game.folders.find(f => f.name === "Generated Creatures" && f.type === "Actor");
  if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });

  const names = spawn.mode === "fixed" ? spawn.creatures : [spawn.pool[Math.floor(Math.random() * spawn.pool.length)]];
  const actors = [];
  for(const name of names)
  {
    const extraBio = (spawn.attackFromColumn && values?.[spawn.attackFromColumn])
      ? `<p><i>This camp's weapons: ${values[spawn.attackFromColumn]}</i></p>`
      : "";
    const actor = await spawnNamedCreature(name, { extraBio, folder: folder.id });
    if(actor) actors.push(actor);
  }
  return actors;
}

async function generateCompanion(key)
{
  const config = CONFIG[key];
  const { html: flavorHtml, values } = await rollFlavor(config);

  const noteHtml = config.note ? `<p><i>${config.note}</i></p>` : "";
  let resultHtml;

  if(config.spawn.mode === "npc")
  {
    const { buildAndSpawnNPC } = await import("/systems/vaarn/module/actor/npc-builder.js");
    const { npc, bioHtml, actor } = await buildAndSpawnNPC(null, null, false, "Generated NPCs");
    resultHtml = actor
      ? `<p><b>&rarr; ${npc.name}</b> (Actor created in "Generated NPCs")</p>`
      : `<p><b>&rarr; ${npc.name}</b></p>${bioHtml}<p><i>No matching Bestiary creature found — no Actor created, personality only.</i></p>`;
  }
  else
  {
    const actors = await spawnFixedOrPool(config.spawn, values);
    resultHtml = actors.length
      ? `<p><b>&rarr; ${actors.map(a => a.name).join(", ")}</b> (Actor${actors.length > 1 ? "s" : ""} created in "Generated Creatures")</p>`
      : `<p><i>No matching Bestiary creature found — no Actor created.</i></p>`;
  }

  const content = `<h3>${config.label}</h3>${flavorHtml}${noteHtml}${resultHtml}`;
  ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), user: game.user._id, content });
}

function openDialog()
{
  const options = Object.entries(CONFIG).map(([key, c]) => `<option value="${key}">${c.label}</option>`).join("");
  const content = `
    <div class="form-group">
      <label>Category</label>
      <select id="vaarn-gc-category">${options}</select>
    </div>`;

  new Dialog(
  {
    title: "Generate Companion",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const key = html.find("#vaarn-gc-category").val();
          generateCompanion(key);
        }
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

openDialog();
