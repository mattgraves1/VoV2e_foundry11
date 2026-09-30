/**
 * Vaarn NPC personality builder — shared by macros/generate-npc.js and
 * macros/generate-companion.js's Oracle's Sanctum / Minor Faction Leader
 * categories (both need "roll a full random civilian NPC", ported from
 * npc-generator.html's own `buildNPC({}, true, false)` call for its
 * TABLE_NPC_COMPANIONS feature — same function, not a re-implementation).
 * Split out of generate-npc.js once a second macro needed it too, same
 * "move it to module/actor/ once it's shared" pattern as every other
 * reusable piece in this project.
 *
 * See work-queue.txt item 1 Phase 3 for the full data-source rationale
 * (chargen-data.js's SPARK_TABLES for ancestry-specific traits,
 * npc-generator-data.js for the generic pools, composite-generator-data.js
 * for Virtue/Vice) — not repeated here.
 */

export const ANCESTRIES = ["Cacklemaw Exile", "Cacogen", "Faa Nomad", "Lithling", "Mycomorph", "Neobloom", "Newbeast", "Planeyfolk", "Synth", "True-kin"];

// Neobloom's personality table calls its Voice-equivalent column "Vox-Pod"
// (npc-generator.html's ANCESTRY_META voiceCol) — every other ancestry's
// Voice comes from the generic BASIC_NPC pool instead, derived generically
// below (no column named "Voice" exists in any SPARK_TABLES personality
// table, Neobloom included, so this one exception is hardcoded here rather
// than over-engineering a general voiceCol lookup for a single ancestry).
const VOICE_COLUMN_OVERRIDE = { Neobloom: "Vox-Pod" };

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Exported for macros/generate-rival-adventurer.js, which needs the exact
// same "pick a whole shared row from an ancestry's SPARK_TABLES section"
// logic for its own ancestry-traits roll.
export function pickRowData(table)
{
  if(!table || table.isFlat) return null;
  const row = pick(table.rows);
  const obj = {};
  table.columns.forEach((col, i) => obj[col] = row[i]);
  return obj;
}

export async function buildNPC(ancestry)
{
  const { SPARK_TABLES } = await import("/systems/vaarn/module/actor/chargen-data.js");
  const { BASIC_NPC, FURTHER_DETAILS, NPC_CAREERS, FALLBACK_NAMES } =
    await import("/systems/vaarn/module/actor/npc-generator-data.js");
  const { COMPOSITE_GENERATORS } = await import("/systems/vaarn/module/actor/composite-generator-data.js");

  const resolvedAncestry = ancestry || pick(ANCESTRIES);
  const spark = SPARK_TABLES[resolvedAncestry];
  const personalityRow = pickRowData(spark.personality);
  const appearanceRow = pickRowData(spark.appearance);

  const name = personalityRow?.Name || appearanceRow?.Name || `${pick(FALLBACK_NAMES.givenA)} ${pick(FALLBACK_NAMES.surnameC)}`;
  const manner = personalityRow?.Manner || pick(BASIC_NPC.Manner);
  const voiceCol = VOICE_COLUMN_OVERRIDE[resolvedAncestry];
  const voice = (voiceCol && personalityRow?.[voiceCol]) || pick(BASIC_NPC.Voice);
  const drive = pick(BASIC_NPC.Drive);
  const attire = appearanceRow?.Attire || pick(FURTHER_DETAILS.Attire);
  const bond = pick(FURTHER_DETAILS.Bond);
  const faith = pick(FURTHER_DETAILS.Faith);
  const faction = pick(FURTHER_DETAILS.Faction);
  const career = pick(NPC_CAREERS);

  const virtueVice = COMPOSITE_GENERATORS.find(g => g.key === "virtue_vice");
  const virtueGrid = virtueVice.grids.find(g => g.label === "Virtue");
  const viceGrid = virtueVice.grids.find(g => g.label === "Vice");
  const virtue = pick(pick(virtueGrid.rows));
  const vice = pick(pick(viceGrid.rows));

  const bonus = {};
  if(personalityRow) for(const [k, v] of Object.entries(personalityRow)) if(k !== "Name" && k !== "Manner" && k !== voiceCol) bonus[k] = v;
  if(appearanceRow) for(const [k, v] of Object.entries(appearanceRow)) if(k !== "Attire") bonus[k] = v;
  if(resolvedAncestry === "Newbeast" && spark.appearance?.isFlat) bonus["Animal Form"] = pick(spark.appearance.rows)[0];

  return { ancestry: resolvedAncestry, name, manner, voice, drive, attire, bond, faith, faction, career, virtue, vice, bonus };
}

export function buildBioHtml(npc)
{
  const lines = [
    `<p><b>Ancestry:</b> ${npc.ancestry}</p>`,
    `<p><b>Manner:</b> ${npc.manner}</p>`,
    `<p><b>Voice:</b> ${npc.voice}</p>`,
    `<p><b>Drive:</b> ${npc.drive}</p>`,
    `<p><b>Attire:</b> ${npc.attire}</p>`,
    `<p><b>Bond:</b> ${npc.bond}</p>`,
    `<p><b>Faith:</b> ${npc.faith}</p>`,
    `<p><b>Faction:</b> ${npc.faction}</p>`,
    `<p><b>Virtue:</b> ${npc.virtue}</p>`,
    `<p><b>Vice:</b> ${npc.vice}</p>`,
    `<p><b>Career:</b> ${npc.career.career} — Carries: ${npc.career.items}</p>`,
  ];
  for(const [k, v] of Object.entries(npc.bonus)) if(v) lines.push(`<p><b>${k}:</b> ${v}</p>`);
  return lines.join("");
}

/**
 * Full "roll a personality, clone a matching Bestiary creature, rename it
 * and fold the personality into its biography" pipeline — the common path
 * both generate-npc.js and generate-companion.js's NPC-companion
 * categories need. Returns the created Actor, or null if no Bestiary
 * creature matched (caller should fall back to a personality-only chat
 * message in that case, same as the source tool's own behavior).
 */
export async function buildAndSpawnNPC(ancestry, knownLevel, preferAncestry, folderName)
{
  const npc = await buildNPC(ancestry);
  const bioHtml = buildBioHtml(npc);

  const { getBestiaryIndex, pickBestiaryStatblock, cloneBestiaryActorToWorld } =
    await import("/systems/vaarn/module/actor/bestiary-spawn.js");
  const { ANCESTRY_BESTIARY_MAP } = await import("/systems/vaarn/module/actor/npc-generator-data.js");

  const index = await getBestiaryIndex();
  const picked = pickBestiaryStatblock(index, ANCESTRY_BESTIARY_MAP, npc.ancestry, knownLevel, preferAncestry);

  if(!picked) return { npc, bioHtml, actor: null };

  let folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
  if(!folder) folder = await Folder.create({ name: folderName, type: "Actor" });

  const statNote = `<p><i>Stat block: ${picked.entry.name} (Level ${picked.entry.system.level.value}${picked.levelNote})${picked.source === "ancestry-specific" ? ", ancestry-matched" : ""}.</i></p>`;
  const actor = await cloneBestiaryActorToWorld(picked.entry,
  {
    rename: npc.name,
    extraBio: bioHtml + statNote,
    folder: folder.id
  });

  return { npc, bioHtml, actor };
}
