/**
 * Treasure Cache Generation — foundry-system-index.csv.
 *
 * A cache is not one roll: every line of the book table is rolled for the
 * chosen size and the results composed. RULED 2026-09-19 (Matt): the result
 * is a new `container` actor literally stocked with the Items, created with
 * default ownership None so only the GM sees it. Players are given it with
 * core Configure Ownership when they find it, and take from it with the
 * cache sheet's Take control (container-sheet.js).
 *
 * WHAT EACH LINE BECOMES. Counted consumables (rations, Medgels, Synth
 * Parts, Antitoxin, Grenades) are ONE stacked Item carrying the count
 * (Matt, 2026-09-19). Everything rolled on another table is its own Item per
 * roll, built by loot-builders.js — the same code the generate-* macros run.
 *
 * NOT THE DROPPED ITEMS BOX. The cache is told apart by its own flag,
 * flags.vaarn.cache, never by type: both are `container` actors, and
 * findContainer() finds the box by ITS flag, so a cache can never be
 * mistaken for it in either direction.
 */

import { TREASURE_CACHES, sizesOf } from "./treasure-cache-data.js";
import { TREASURE_ROOMS, treasureRoomColumn, treasureRoomEntry } from "./room-contents-data.js";
import {
  rollFormula, buildStack, buildEquipment, buildWeapon, buildHelm, buildShield,
  buildArmour, buildTradeGood, buildAdvancedExotica, buildDrug, buildFlavor,
  buildCodex, buildElixir, buildGift, buildStartingImplant, buildAdvancedImplant, implantCapsuleData
} from "../item/loot-builders.js";
import { d } from "./chargen-app.js";

const FLAG_SCOPE = "vaarn";
export const CACHE_FLAG = "cache";

/** Is this actor a generated treasure cache? */
export function isCache(actor)
{
  return actor?.type === "container" && !!actor.getFlag?.(FLAG_SCOPE, CACHE_FLAG);
}

/**
 * How many of a line the cache holds. "d6" is a rolled count, "3-in-6" a d6
 * chance of exactly one, "1" exactly one, null the book's dash.
 */
export function resolveCell(cell)
{
  if(cell == null) return { count: 0, roll: null };
  const chance = /^(\d+)-in-(\d+)$/i.exec(cell);
  if(chance)
  {
    const r = d(Number(chance[2]));
    return { count: r <= Number(chance[1]) ? 1 : 0, roll: `${cell}: rolled ${r}` };
  }
  const formula = /^d\d+$/i.test(cell) ? `1${cell}` : cell;
  const count = rollFormula(formula);
  return { count, roll: /d/i.test(cell) ? `${cell}: ${count}` : null };
}

/** Stacked kinds map to a loot-builders STACKABLES key. */
const STACKED = { water: "water", food: "food", medgel: "medgel", synth: "synth", antitoxin: "antitoxin", grenade: "grenade" };

/** The builders for everything rolled once per unit. */
const PER_UNIT =
{
  equipment:     () => buildEquipment(),
  basicWeapon:   () => buildWeapon("Basic"),
  advWeapon:     () => buildWeapon("Advanced"),
  exoticWeapon:  () => buildWeapon("Exotic"),
  helmOrShield:  () => (Math.random() < 0.5 ? buildHelm() : buildShield()),
  // "Helmet and Shield" is one of each; a counted "d6 Helmets and Shields"
  // is that many of each.
  helmAndShield: () => [...buildHelm(), ...buildShield()],
  armour:        () => buildArmour(),
  tradeGood:     () => buildTradeGood(),
  exotica:       () => buildAdvancedExotica(),
  drug:          () => buildDrug(),
  book:          () => buildFlavor("Books"),
  poison:        () => buildFlavor("Vaarnish Poisons"),
  jewellery:     () => buildFlavor("Jewellery"),
  codex:         () => buildCodex(),
  elixir:        () => buildElixir(),
  gift:          () => buildGift(),
  // Found, not installed - a sealed capsule (Metal Item Property, 2026-09-27).
  implant:       () => implantCapsuleData(buildStartingImplant()),
  advImplant:    () => implantCapsuleData(buildAdvancedImplant())
};

/**
 * Roll every line of one cache. Returns the Item data and a per-line log of
 * what was rolled, so the GM's summary can be checked against the page.
 */
export async function rollCache(type, sizeIndex)
{
  const cache = TREASURE_CACHES[type];
  if(!cache) throw new Error(`Unknown cache type "${type}"`);
  const sizes = sizesOf(type);
  if(!(sizeIndex >= 0 && sizeIndex < sizes.length)) throw new Error(`${type} caches have no size ${sizeIndex}`);

  const items = [];
  const log = [];
  for(const row of cache.rows)
  {
    const cell = row.cells[sizeIndex];
    if(cell == null) continue;
    const { count, roll } = resolveCell(cell);
    const made = [];
    if(count > 0)
    {
      if(STACKED[row.kind]) made.push(...buildStack(STACKED[row.kind], count));
      else
        for(let i = 0; i < count; i++) made.push(...await PER_UNIT[row.kind]());
    }
    items.push(...made);
    log.push({ label: row.label, cell, roll, count, names: made.map(m => m.system?.quantity > 1 && STACKED[row.kind] ? `${m.name} ×${m.system.quantity}` : m.name) });
  }
  return { items, log };
}

/** The display name of a size column for this type. */
export function sizeLabel(type, sizeIndex)
{
  return TREASURE_CACHES[type]?.sizeLabels?.[sizeIndex] ?? sizesOf(type)[sizeIndex];
}

/**
 * Roll a cache and create it as a GM-only container actor, stocked. Posts
 * the roll-by-roll summary to the GM only — the players have not found it.
 */
export async function createCache(type, sizeIndex)
{
  const { items, log } = await rollCache(type, sizeIndex);
  const size = sizesOf(type)[sizeIndex];

  const actor = await Actor.create({
    name: `${size} ${type} Cache`,
    type: "container",
    img: "icons/svg/chest.svg",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
    flags: { [FLAG_SCOPE]: { [CACHE_FLAG]: { type, size } } },
    items
  });

  const lines = log.map(l =>
    `<li><b>${l.label}</b> (${l.cell}${l.roll && l.cell !== "1" ? ` → ${l.count}` : ""})${l.names.length ? `: ${l.names.join(", ")}` : ": none"}</li>`);
  await ChatMessage.create({
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<p><b>${actor.name}</b> — ${sizeLabel(type, sizeIndex)}. ${items.length} Item${items.length === 1 ? "" : "s"}, GM only until shared with Configure Ownership.</p><ul>${lines.join("")}</ul>`
  });
  return actor;
}

/**
 * A Treasure Room — Generate Room Contents' Contents A "Treasure", RULED
 * 2026-09-21 (Matt): d20 on the Treasure Rooms table (room-contents-data.js)
 * in the column for the vault's depth, following "Roll again from Depth ..."
 * into the deeper column. A cache result is an ordinary cache (createCache).
 * Anything else is stocked into a GM-only container carrying the cache flag,
 * so it is shared and taken exactly as a cache is (Matt, the same day).
 *
 * Returns { steps, actor, names }: steps is every d20 rolled, in order, as
 * { column, roll, cell }; actor the container or cache created; names the
 * Items in it (empty for a cache, whose own summary lists them).
 */
export async function createTreasureRoom(depth)
{
  const steps = [];
  let column = treasureRoomColumn(depth);
  let entry;
  for(;;)
  {
    const roll = d(20);
    const cell = TREASURE_ROOMS[column][roll - 1];
    steps.push({ column, roll, cell });
    entry = treasureRoomEntry(cell);
    if(entry.kind !== "reroll") break;
    column = entry.column;
  }

  if(entry.kind === "cache")
    return { steps, actor: await createCache(entry.type, entry.sizeIndex), names: [] };

  const { count, roll } = resolveCell(String(entry.count));
  if(roll) steps.push({ column: null, roll: null, cell: roll });
  const items = [];
  for(let i = 0; i < count; i++) items.push(...await PER_UNIT[entry.itemKind]());

  const actor = await Actor.create({
    name: `Treasure Room (Depth ${depth})`,
    type: "container",
    img: "icons/svg/chest.svg",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
    flags: { [FLAG_SCOPE]: { [CACHE_FLAG]: { type: "Treasure Room", size: column } } },
    items
  });
  return { steps, actor, names: items.map(i => i.name) };
}
