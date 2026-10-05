/**
 * Actor Creation from Roll Table — Followers and Mercenaries, 2026-09-18.
 *
 * Rolls one of the two d20 + EGO recruitment tables in hireling-data.js and
 * builds an npc Actor straight from what was rolled. The stats come from the
 * table itself; nothing is borrowed from the Bestiary, which is the whole
 * difference from npc-builder.js's buildAndSpawnNPC.
 *
 * THE ACTOR IS BUILT BY buildCreatureDoc, not by a second builder. The rolled
 * columns are assembled into an entry shaped like a bestiary-data.js entry and
 * handed to the same function pack-build.js, import-bestiary.js and the pets
 * and steeds packs use, so a hireling's weapon, damage types, no-heal rule and
 * biography are made exactly the way a creature's are. bestiary-build.js's
 * header is about why two builders of that shape would drift.
 *
 * WHAT IS ADDED ON TOP, because no creature needed it before:
 *   - the weapon's printed Piercing tag, auto-hit target type and dud chance
 *     (see hireling-data.js for which printed clauses these are), written onto
 *     the weapon Item after the shared builder has made it;
 *   - the `hireling` actor flag, which gives a Follower its item slots and
 *     hides the pet LEVEL UP from both kinds (Matt, 2026-09-18);
 *   - the recruiting PC as Companion Ownership's owner.
 */

import { FOLLOWER_ROWS, MERCENARY_ROWS, HIRELING_RULES } from "./hireling-data.js";
import { buildCreatureDoc } from "./bestiary-build.js";
import { ANCESTRY_CREATURE_TYPES } from "./chargen-data.js";
import { setOwner } from "./companion.js";
import { egoOf, levelLimitCheck, confirmOverLevelLimit } from "./companion-limit.js";

export const HIRELING_KINDS = {
  follower:  { rows: FOLLOWER_ROWS,  label: "Follower",  folder: "Generated Followers" },
  mercenary: { rows: MERCENARY_ROWS, label: "Mercenary", folder: "Generated Mercenaries" },
};

/**
 * The row a d20 + EGO total lands on. Index 0 is the printed "0-1" row, so a
 * total of 1 or less reads it; a total above 30 reads the last row, since the
 * table stops there and a PC with high EGO still recruits someone.
 */
export function rowIndexFor(total)
{
  if(total <= 1) return 0;
  return Math.min(total, 30) - 1;
}

/**
 * The PC's EGO bonus as it stands, wound damage included.
 *
 * MOVED to companion-limit.js 2026-09-19 and re-exported here, because the
 * recruitment roll (d20 + EGO) and the Level limit read the same field for the
 * same reason. Re-exported rather than relocated silently so any importer that
 * knew it by this name still finds it.
 */
export { egoOf };

/**
 * Roll every column on its own. Returns the pieces and the rolls behind them,
 * so the chat card can show where each part came from.
 */
export async function rollHireling(kind, ego)
{
  const { rows } = HIRELING_KINDS[kind];
  const rolls = {};
  const pick = async (col) =>
  {
    const r = await new Roll("1d20 + @ego", { ego }).evaluate({ async: true });
    rolls[col] = r.total;
    return rows[rowIndexFor(r.total)];
  };
  // Name is a flat d30 (Matt, 2026-09-06): every name stays reachable.
  const nameRoll = await new Roll("1d30").evaluate({ async: true });
  rolls.name = nameRoll.total;

  return {
    kind,
    ego,
    rolls,
    name: rows[nameRoll.total - 1].name,
    levelRow: await pick("level"),
    avRow: await pick("av"),
    moraleRow: await pick("morale"),
    attack: (await pick("attack")).attack,
    description: (await pick("description")).description,
  };
}

/** The biography: description, the clauses the GM runs, the book's rules. */
function hirelingBio(r)
{
  const { label } = HIRELING_KINDS[r.kind];
  const lines = [`<p>${r.description.text}</p>`];
  if(r.description.avBonus)
    lines.push(`<p><i>AV includes the description's +${r.description.avBonus}.</i></p>`);
  if(r.description.rule)
    lines.push(`<p><b>${r.description.rule.name}:</b> ${r.description.rule.text}</p>`);
  lines.push(`<h3>${label} rules</h3>`);
  for(const [head, text] of HIRELING_RULES[r.kind])
    lines.push(`<p><b>${head}:</b> ${text}</p>`);
  const k = r.rolls;
  lines.push(`<p><i>Rolled with EGO ${r.ego >= 0 ? "+" : ""}${r.ego}: name d30 ${k.name}, Level ${k.level}, AV ${k.av}, ` +
             `Morale ${k.morale}, attack ${k.attack}, description ${k.description}.</i></p>`);
  return lines.join("");
}

/** A bestiary-shaped entry, so buildCreatureDoc can build it. */
export function hirelingEntry(r)
{
  const a = r.attack;
  const types = a.damageTypes || [];
  const effects = [{ kind: "damage", dice: a.dice, ...(types.length === 1 ? { damageType: types[0] } : {}) }];
  return {
    name: r.name,
    // The ancestry the DESCRIPTION names, through chargen's own table, so a
    // hireling is typed exactly as a PC of that ancestry is (Matt,
    // 2026-09-19). It follows the description column, not the stats: "a synth"
    // is Synthetic whatever Level it rolled.
    types: [...(ANCESTRY_CREATURE_TYPES[r.description.ancestry] ?? [])],
    level: r.levelRow.level,
    hp: r.levelRow.hp,
    av: r.avRow.av + (r.description.avBonus || 0),
    moraleBonus: r.moraleRow.moraleBonus,
    noHealRule: r.description.noHealRule || "",
    atk: a.text,
    // `ranged` is declared on the roster's ranged attacks (Matt, 2026-10-04:
    // a Sling or Throws Darts was built as a melee weapon), the same field a
    // Bestiary ability uses, so buildCreatureDoc makes it a weaponRanged.
    abilities: [{ name: a.name, text: a.text, effects, ...(types.length ? { damageTypes: types } : {}), ...(a.ranged ? { ranged: true } : {}) }],
    bio: hirelingBio(r),
  };
}

/**
 * The complete Actor document. The printed clauses the shared builder has no
 * field for are written onto the weapon here.
 */
export function hirelingDoc(r)
{
  const doc = buildCreatureDoc(hirelingEntry(r), null);
  const a = r.attack;
  const weapon = doc.items.find(i => i.name === a.name);
  if(weapon)
  {
    if(a.tags) weapon.system.tags = [...a.tags];
    const vaarn = { ...(weapon.flags?.vaarn || {}) };
    if(a.autoHitVs) vaarn.autoHitVs = a.autoHitVs;
    if(a.failChance) vaarn.failChance = a.failChance;
    if(Object.keys(vaarn).length) weapon.flags = { ...(weapon.flags || {}), vaarn };
  }
  doc.flags = { ...(doc.flags || {}), vaarn: { ...(doc.flags?.vaarn || {}), hireling: r.kind } };
  return doc;
}

/** Roll, build and create. Returns { actor, rolled }. */
export async function createHireling(kind, character)
{
  const { folder: folderName } = HIRELING_KINDS[kind];
  const rolled = await rollHireling(kind, egoOf(character));
  const doc = hirelingDoc(rolled);

  // Companion Level Limit (2026-09-19). AFTER the roll and BEFORE Actor.create:
  // the recruit's Level is what the limit weighs and it is not known until the
  // table is rolled, but creating the Actor first would leave a refused recruit
  // littering the world. `kind` is already "follower" or "mercenary", the two
  // pools this path can fill. Nothing to exclude — the recruit does not exist.
  const check = levelLimitCheck(character, kind, rolled.levelRow.level);
  if(!await confirmOverLevelLimit(check, `<b>${rolled.name}</b> (Level ${rolled.levelRow.level})`))
    return { actor: null, rolled, refused: true };

  let folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
  if(!folder) folder = await Folder.create({ name: folderName, type: "Actor" });
  doc.folder = folder.id;

  const actor = await Actor.create(doc);
  if(character) await setOwner(actor, character);
  return { actor, rolled };
}
