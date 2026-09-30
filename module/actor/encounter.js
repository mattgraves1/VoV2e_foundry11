/**
 * ENCOUNTER COMPOSITION FROM ENC (foundry-system-index.csv row of that name,
 * build plan RULED 2026-09-27 by Matt).
 *
 *   "Roll the indicated die when generating encounters with the creature to
 *    discover how many are present."
 *
 * The creature sheet's Roll Encounter control (GM only) rolls the creature's
 * ENC and puts the group in the world: ONE world Actor per kind, and a card
 * whispered to the GM giving how many of each (RULED: the GM drops as many
 * tokens as the card says). Clicked on a creature that is already a world
 * Actor, that Actor is the creature's kind and is not cloned again; clicked
 * in the Bestiary compendium, the creature is cloned out first.
 *
 * What a creature is met with lives in encounter-data.js. This file only
 * rolls it. encounterSpecFor is pure so tools/test-encounter.mjs can check
 * every creature in node; the Foundry work is rollEncounter's alone.
 */

import { ENC_COMPANIONS, PLAIN_ENC, SUMMONED_ONLY_ENC } from "./encounter-data.js";

// The folder the other creature generators already use (monster-generator.js
// GENERATED_FOLDER), named here rather than imported so this file stays
// loadable in node.
const FOLDER = "Generated Creatures";

/**
 * The bestiary name an actor stands for. A world copy may be numbered
 * ("Hegemony Legionary 3", from spawnBeside), so a trailing number is dropped
 * when the whole name matches nothing.
 */
export function encounterKeyOf(name, known = ENC_COMPANIONS)
{
  if(known[name]) return name;
  const bare = String(name ?? "").replace(/\s+\d+$/, "");
  return bare;
}

/**
 * What rolling this creature's encounter does, or null when it has none:
 * { count, companions } - count is a dice formula or a number, as a string.
 * `enc` is the actor's stored ENC. A companion entry wins over the stored
 * string, so a Knight is its data entry whatever the field says; a plain ENC
 * is rolled for the creature alone; "-", blank, or a named ENC with no entry
 * has no encounter.
 */
export function encounterSpecFor(name, enc)
{
  const key = encounterKeyOf(name);
  if(ENC_COMPANIONS[key]) return { count: ENC_COMPANIONS[key].count, companions: ENC_COMPANIONS[key].companions };
  const e = String(enc ?? "").trim();
  if(!e || e === SUMMONED_ONLY_ENC) return null;
  if(PLAIN_ENC.test(e)) return { count: e, companions: [] };
  return null;
}

/** "d8" is not a formula Foundry reads the same everywhere; "1d8" is. */
function formulaOf(dice)
{
  return String(dice).trim().replace(/^d/i, "1d");
}

async function rollQty(dice)
{
  if(/^\d+$/.test(String(dice).trim())) return { total: Number(dice), dice: null };
  const roll = await new Roll(formulaOf(dice)).evaluate({ async: true });
  return { total: roll.total, dice: String(dice) };
}

async function generatedFolder()
{
  return game.folders.find(f => f.name === FOLDER && f.type === "Actor")
    ?? await Folder.create({ name: FOLDER, type: "Actor" });
}

/**
 * Roll the encounter for `actor` (a world Actor or a Bestiary compendium one)
 * and post the card. Returns the card's lines, [{ total, dice, name, actor,
 * note }], or null when the creature has no encounter.
 */
export async function rollEncounter(actor)
{
  const spec = encounterSpecFor(actor.name, actor.system?.enc);
  if(!spec) return null;

  const spawn = await import("./bestiary-spawn.js");
  const folder = (await generatedFolder()).id;
  const lines = [];

  // The creature itself.
  const self = await rollQty(spec.count);
  if(self.total > 0)
  {
    let placed = actor;
    if(actor.pack)
      placed = await spawn.cloneBestiaryActorToWorld({ _id: actor.id }, { folder, packId: actor.pack });
    lines.push({ total: self.total, dice: self.dice, name: placed?.name ?? actor.name, actor: placed });
  }

  for(const c of spec.companions)
  {
    if(c.table)
    {
      lines.push(...await drawCompanionTable(c.table, folder, spawn));
      continue;
    }
    const qty = await rollQty(c.qty);
    if(c.steed)
    {
      const pick = c.steed[Math.floor(Math.random() * c.steed.length)];
      const steed = await spawn.spawnNamedSteed(pick, { folder });
      lines.push({ total: qty.total, dice: qty.dice, name: pick, actor: steed,
        note: c.steed.length > 1 ? `picked from ${c.steed.join(" or ")}` : null });
      continue;
    }
    const made = await spawn.spawnNamedCreature(c.creature, { rename: c.rename, extraBio: c.bio, folder });
    lines.push({ total: qty.total, dice: qty.dice, name: c.rename ?? c.creature, actor: made,
      note: c.rename && c.rename !== c.creature && !c.rename.startsWith(c.creature) ? `stats as ${c.creature}` : null });
  }

  await postCard(actor, lines);
  return lines;
}

/**
 * One draw on a creature encounter table, spawning each creature its result
 * names - the Creedspeaker's Enthralled Synths (Rogue Robots, RULED). Reads
 * the table from rolltable-data.js so the draw is the same whether or not the
 * world's copy of the table has been imported.
 */
async function drawCompanionTable(tableName, folder, spawn)
{
  const { ROLLTABLES } = await import("./rolltable-data.js");
  const { parseLairCreatureMentions, resolveLairCreatureName } = await import("./lair-rooms-roller.js");
  const { LAIR_CREATURE_ALIASES } = await import("./lair-rooms-data.js");
  const table = ROLLTABLES.find(t => t.name === tableName);
  if(!table) return [{ total: 0, dice: null, name: tableName, actor: null, note: "table not found" }];

  const roll = await new Roll(table.formula).evaluate({ async: true });
  const result = table.results.find(r => roll.total >= r.range[0] && roll.total <= r.range[1]);
  const validNames = new Set((await spawn.getBestiaryIndex()).map(c => c.name));
  const lines = [];
  for(const m of parseLairCreatureMentions(result?.text ?? ""))
  {
    const qty = m.qty ? await rollQty(m.qty) : { total: 1, dice: null };
    const name = resolveLairCreatureName(m.name, LAIR_CREATURE_ALIASES, validNames);
    const made = name ? await spawn.spawnNamedCreature(name, { folder }) : null;
    lines.push({ total: qty.total, dice: qty.dice, name: name ?? m.name, actor: made,
      note: `${tableName} ${roll.total}: ${result.text}${name ? "" : " (not in the Bestiary)"}` });
  }
  return lines;
}

async function postCard(actor, lines)
{
  const rows = lines.map(l =>
    `<li><b>${l.total} × ${l.name}</b>${l.dice ? ` (${l.dice})` : ""}`
    + (l.actor ? ` — @UUID[${l.actor.uuid}]{${l.actor.name}}` : "")
    + (l.note ? ` <i>${l.note}</i>` : "") + `</li>`).join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor.pack ? null : actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    content: `<b>Encounter: ${encounterKeyOf(actor.name)}</b> (ENC ${actor.system?.enc || "-"})<ul>${rows}</ul>`
      + `<p><i>One Actor per kind, in "${FOLDER}". Place as many tokens of each as the count says.</i></p>`
  });
}
