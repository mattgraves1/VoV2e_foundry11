/**
 * GENERATED GEAR AS ITEMS (foundry-system-index.csv "Generated Gear and
 * Attacks as Items", RULED 2026-10-04 by Matt). A generator's gear line - a
 * Generate NPC career's "Carries", a Rival Adventurer's equipment package -
 * is one comma-separated string of what the character has:
 *
 *   "Hazard Wrap (AV 12), Vial of Acid, Vial of Poison (d10 TOX)"
 *   "Sword (d8), Shield (+1 AV), Leather Armour (AV 13)"
 *
 * Each piece becomes an Item. The ruling: a piece whose NAME the system's
 * own lists know becomes that full Item (a weapon base, a body armour, a
 * helm or shield, a Starting Gear entry); anything else becomes a plain
 * Item holding its text - a weapon if it gives a damage die, armour if it
 * gives an AV, a Gift if it says GIFT:, otherwise gear.
 * tools/test-generated-gear.mjs lists every piece that falls through to a
 * plain Item, so the fall-throughs stay visible.
 *
 * ARMOUR IS LOOT (RULED): body armour, helms and shields arrive unequipped.
 * The creature's AV stays as its stat says, so nothing is counted twice;
 * Referee's Guide chapter 7 says so, because a GM may expect worn armour to
 * set the AV. Weapons arrive equipped so the GM can roll them - decided in
 * the build, Matt's to overturn.
 *
 * READING THE PARENTHESES. "(d8, 2 slots)", "(AV 13, 3 slots)", "(3 doses,
 * induces intense grief)": each comma part is read on its own - a count, a
 * slot cost, an AV, a +N AV bonus, a damage die with what follows it - and
 * whatever is left is the Item's description. A die is a weapon's damage
 * only when nothing after it says otherwise: "d6 EGO damage" (ability
 * damage), "d8 heal", "3d20 rations" and a poison's "d10 TOX" stay gear,
 * since a weapon Item would deal them to HP. A TOX die on a named weapon
 * ("Poisoned Dagger (d6 TOX)") is a weapon dealing TOX. Five such pieces
 * work as declared in GEAR_DECLARATIONS below (chunk 5, RULED by Matt).
 *
 * Each Item carries flags.vaarn.generatedGear = { text, match }: the piece
 * as written and how it was read ("weapon", "armour", "helm", "shield",
 * "gear" for a list match; "plain-weapon", "plain-armour", "gift",
 * "plain-gear" for a fall-through). A piece that is no possession at all -
 * "Always Naked (AV 10)" - gives no Item.
 *
 * Relative imports, so the test can load it in node.
 */

import { MELEE_WEAPONS, RANGED_WEAPONS, ARMOUR_TABLE, HELM_TABLE, SHIELD_TABLE, GEAR_A, GEAR_B_BASE } from "./chargen-data.js";
import { gearItemData, normalizeDamageDice } from "./chargen-app.js";
import { buildBaseWeapon } from "./weapon-roller.js";
import { armourItemData, helmItemData, shieldItemData, buildStack } from "../item/loot-builders.js";
import { attackPropertiesOf } from "../item/attack-properties.js";
import { buildCreatureItems } from "./bestiary-build.js";

const lc = s => String(s ?? "").trim().toLowerCase();

/** Split a gear line on commas that are not inside parentheses. */
export function splitGear(text)
{
  const out = [];
  let depth = 0, cur = "";
  for(const ch of String(text ?? ""))
  {
    if(ch === "(") depth++;
    if(ch === ")") depth = Math.max(0, depth - 1);
    if(ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim().replace(/\.$/, "").trim()).filter(Boolean);
}

/**
 * One piece read into its parts. "3 Plasma Grenades (d10 blast)" ->
 * { name: "Plasma Grenades", count: 3, die: "d10", dieWords: ["blast"], ... }.
 */
export function parsePiece(piece)
{
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(piece);
  let name = (m ? m[1] : piece).trim();
  const inner = m ? m[2].trim() : "";
  const out = { name, inner, count: null, slots: null, av: null, avBonus: null, usage: null, die: null, dieWords: [], rest: [] };
  // a leading count: "3 Cleansing Orbs", "2x Revolver"
  const lead = /^(\d+)\s*x?\s+(.+)$/i.exec(name);
  if(lead && Number(lead[1]) > 1) { out.count = Number(lead[1]); out.name = name = lead[2].trim(); }
  for(const raw of inner ? inner.split(",") : [])
  {
    const part = raw.trim();
    let r;
    if(!part) continue;
    if((r = /^[×x]?\s*(\d+)$/i.exec(part)) || (r = /^(\d+)\s+(?:doses?|syringes?|rations?|charges?|uses?)$/i.exec(part))) out.count = Number(r[1]);
    else if((r = /^(\d+)\s*slots?$/i.exec(part))) out.slots = Number(r[1]);
    else if((r = /^(?:\+(\d+)\s*AV|AV\s*\+(\d+))$/i.exec(part))) out.avBonus = Number(r[1] ?? r[2]);
    else if((r = /^(?:AV\s*(\d+)|(\d+)\s*AV)$/i.exec(part))) out.av = Number(r[1] ?? r[2]);
    else if((r = /^Ud(\d+)$/i.exec(part))) out.usage = `Ud${r[1]}`;
    else if(!out.die && (r = /^(\d*d\d+)(?:\s+(.+))?$/i.exec(part))) { out.die = r[1]; out.dieWords = (r[2] ?? "").split(/\s+/).filter(Boolean); }
    else out.rest.push(part);
  }
  // "(d10, blast)": a damage type in a part of its own belongs to the die
  if(out.die)
    for(const part of [...out.rest]) if(isDamageType(part)) { out.dieWords.push(part); out.rest.splice(out.rest.indexOf(part), 1); }
  return out;
}

// Weapon names that shoot or are thrown; anything else with a die is melee.
// "-gun" and "cannon" catch Sporegun and Handcannon; plurals catch "Two Duelling Pistols".
const RANGED_WORDS = /(\b(pistols?|revolvers?|rifles?|shotguns?|muskets?|carbines?|blasters?|bows?|crossbows?|slings?|darts?|javelins?|launchers?|throw(?:s|n|ing)?|harpoons?|fusils?|blunderbore|flamethrowers?|grenades?|rays?)\b|gun\b|cannon\b)/i;
const ABILITY = /^(str|dex|con|int|psy|ego)$/i;
const isDamageType = w => attackPropertiesOf({ damageTypes: [w] }).length > 0;

const meleeBase = name => MELEE_WEAPONS.find(w => lc(w.name) === lc(name));
const rangedBase = name => RANGED_WEAPONS.find(w => lc(w.name) === lc(name));
// a weapon word in the name: "Poisoned Dagger" holds Dagger
const holdsWeaponWord = name => [...MELEE_WEAPONS, ...RANGED_WEAPONS].some(w => new RegExp(`\\b${w.name}s?\\b`, "i").test(name));
const armourBase = name => ARMOUR_TABLE.find(a => lc(a.type) === lc(name));
const isHelm = name => HELM_TABLE.some(h => lc(h) === lc(name)) || /\bhelm(et)?\b/i.test(name);
const isShield = name => SHIELD_TABLE.some(s => lc(s) === lc(name)) || /\bshield\b/i.test(name);
// A Starting Gear entry by name, its own suffix ("(Ud8)", "(×3)") dropped for the match.
const gearBase = name => [...GEAR_A, ...GEAR_B_BASE].find(g => lc(g.replace(/\s*\([^)]*\)\s*$/, "")) === lc(name));

const desc = parts => parts.length ? `<p>${parts.join(", ")}</p>` : "";
const addDesc = (item, parts) => { if(parts.length) item.system.description = (item.system.description ?? "") + desc(parts); return item; };
const tag = (item, text, match) => ({ ...item, flags: { ...(item.flags ?? {}), vaarn: { ...(item.flags?.vaarn ?? {}), generatedGear: { text, match } } } });
const unequip = item => ({ ...item, system: { ...item.system, equipped: false } });
const counted = (item, p) => { if(p.count > 1) item.system.quantity = p.count; return item; };

/**
 * Is a die a weapon's damage? Only when every word after it is a damage type
 * (or "weapon"/"damage" beside one), or there are none. TOX counts only on a
 * piece named for a weapon.
 */
function weaponDie(p)
{
  if(!p.die) return null;
  const words = p.dieWords.map(lc).filter(w => w !== "weapon" && w !== "damage");
  if(words.some(w => ABILITY.test(w))) return null;
  if(words.includes("tox") && !holdsWeaponWord(p.name)) return null;
  if(!words.every(isDamageType)) return null;
  return { die: p.die, types: [...new Set(words.flatMap(w => attackPropertiesOf({ damageTypes: [w] })))] };
}

/** A dice expression rolled here, so the reader still runs in node: "3d20", "d8", "2". */
function rollDice(expr)
{
  const m = /^(\d*)d(\d+)$/i.exec(String(expr).trim());
  if(!m) return Number(expr) || 0;
  let total = 0;
  for(let i = 0; i < (Number(m[1]) || 1); i++) total += 1 + Math.floor(Math.random() * Number(m[2]));
  return total;
}

/**
 * CHUNK 5 (step 3, RULED 2026-10-04 by Matt on the rulings sheet): the NPC gear
 * pieces whose die is not HP damage, each declared by its exact text as
 * generated-specials.js declares a creature's - nothing reads the words.
 */
export const GEAR_DECLARATIONS = {
  // A stack of 3; the use control heals its user d8 and spends one (the Medgel's heal die).
  "Medicinal Gourds (3, d8 heal)": () => ({ name: "Medicinal Gourds", type: "item",
    system: { slots: 1, quantity: 3, consumable: true, description: "<p>Each heals d8 HP when eaten.</p>" },
    flags: { vaarn: { useHeal: "1d8" } } }),
  // 3d20 rolled when the NPC is made: that many Water Rations, which rest spends.
  "Water Wealth (3d20 rations)": () => buildStack("water", Math.max(1, rollDice("3d20")))[0],
  // RULED untyped: no sonic damage type. Ranged, as the Shriekman's Hypersonic Scream.
  "Vocal Amplifier (d6 sonic weapon)": () => ({ name: "Vocal Amplifier", type: "weaponRanged",
    system: { damageDice: "1d6", slots: 1, hands: 1, tags: [], equipped: true, description: "<p>A sonic weapon.</p>" } }),
  // A carried weapon whose hit deals d6 EGO damage and no HP - the Daemon's
  // Ego-Death Ray (generated-specials.js), built carried: lootable, one slot, one hand.
  "Ego-Death Ray (d6 EGO damage)": () =>
  {
    const ray = buildCreatureItems({ name: "Ego-Death Ray", types: [], level: 0, rules: [],
      abilities: [{ name: "Ego-Death Ray", carried: true, ranged: true, text: "Ego-Death Ray (d6 EGO damage)",
        effects: [{ kind: "abilityDamage", ability: "ego", dice: "1d6" }] }] }).find(i => i.type.startsWith("weapon"));
    return { ...ray, system: { ...ray.system, slots: 1, hands: 1 } };
  },
  // The lizard is a Bestiary creature (War Lizard). The Referee's control places
  // it beside the NPC, loyal, and this Item then removes itself.
  "Tame War Lizard (Level 1, AV 14, d6 bite)": () => ({ name: "Tame War Lizard", type: "item", img: "icons/svg/pawprint.svg",
    system: { slots: 0, quantity: 1, tradeValue: 0, intrinsic: true,
      description: "<p>A tame War Lizard (Level 1, AV 14, d6 bite). The Referee's control places it beside its owner, loyal to them, and this Item is removed.</p>" },
    flags: { vaarn: { spawnNow: { creature: "War Lizard", dice: "1", loyal: true, removesItem: true } } } })
};

/** One piece of a gear line as Item data, or null for a piece that is no possession. */
export async function gearPieceItem(piece)
{
  const text = piece;
  const declared = GEAR_DECLARATIONS[piece];
  if(declared) return tag(declared(), text, "declared");
  // A Mystic Gift. Named like the sample Gifts, so the Effects tab suggests theirs.
  const gift = /^gift\s*:\s*(.+)$/i.exec(piece);
  if(gift)
    return tag({ name: gift[1].trim(), type: "gift", system: { slots: 1, source: "", description: "<p>A Mystic Gift. Set what it does on its Effects tab.</p>" } }, text, "gift");

  const p = parsePiece(piece);
  const dieText = p.die ? [p.die, ...p.dieWords].join(" ") : null;
  const weapon = weaponDie(p);

  // A weapon base by name. The book's die for THIS character wins over the base's.
  const base = meleeBase(p.name) ?? rangedBase(p.name);
  if(base)
  {
    const item = await buildBaseWeapon(meleeBase(p.name) ? "Melee" : "Ranged", base.name);
    if(weapon && normalizeDamageDice(weapon.die) !== item.system.damageDice) item.system.damageDice = normalizeDamageDice(weapon.die);
    if(weapon?.types.length) item.system.damageTypes = weapon.types;
    item.system.equipped = true;
    return tag(counted(addDesc(item, p.rest), p), text, "weapon");
  }

  if(isShield(p.name)) return tag(counted(addDesc(unequip(shieldItemData(p.name)[0]), p.rest), p), text, "shield");
  // A helm, or anything worn for a "+1 AV" (a mask, a headdress).
  if(isHelm(p.name) || (p.avBonus && !p.av)) return tag(counted(addDesc(unequip(helmItemData(p.name)[0]), p.rest), p), text, "helm");

  // A creature, not a possession: an undeclared "(Level N, ...)" piece is text
  // only. The one the generators roll, the Tame War Lizard, is declared above.
  const creature = p.rest.some(r => /^level\s*\d+$/i.test(r));

  // A body armour by name; the AV the book gives here wins over the table's.
  const armour = armourBase(p.name);
  if(armour && !creature)
    return tag(addDesc(unequip(armourItemData({ ...armour, ...(p.av ? { av: p.av } : {}), ...(p.slots ? { slots: p.slots } : {}) })[0]), p.rest), text, "armour");

  if(weapon && !creature)
    return tag(counted({ name: p.name, type: RANGED_WORDS.test(p.name) ? "weaponRanged" : "weaponMelee",
      system: { damageDice: normalizeDamageDice(weapon.die), slots: p.slots ?? 1, hands: 1, tags: [], equipped: true, description: desc(p.rest),
        ...(weapon.types.length ? { damageTypes: weapon.types } : {}) } }, p), text, "plain-weapon");

  if(p.av && !creature)
  {
    // AV 10 is no armour at all ("Always Naked"): nothing to carry.
    if(p.av <= 10) return null;
    // Slots: as written, else the body armour table's own scale - AV 11 is 1 slot, each AV above it one more.
    return tag(addDesc(unequip(armourItemData({ type: p.name, av: p.av, slots: p.slots ?? Math.max(1, p.av - 10), special: null })[0]), p.rest), text, "plain-armour");
  }

  // Gear. A count or usage die is passed in gearItemData's own "(×N)" / "(Ud8)" form.
  const listed = gearBase(p.name);
  const usage = p.usage ?? (listed && /\(Ud\d+\)/i.exec(listed)?.[0].slice(1, -1));
  const source = p.count > 1 ? `${p.name} (×${p.count})` : usage ? `${p.name} (${usage})` : p.name;
  const item = gearItemData(source);
  if(p.slots) item.system.slots = p.count > 1 ? Math.round((p.slots / p.count) * 10000) / 10000 : p.slots;
  const extra = [...(dieText ? [dieText] : []), ...p.rest, ...(p.av ? [`AV ${p.av}`] : [])];
  return tag(addDesc(item, extra), text, listed ? "gear" : "plain-gear");
}

/**
 * A CREATURE'S ROLLED ATTACK as a natural weapon (step 2, RULED 2026-10-04 by
 * Matt): Generate Monster's attack and special-attack columns and Generate
 * Quantum Daemon's attacks. Only an attack whose parentheses are a damage die
 * and damage types is a weapon here - "Melee (d6)", "Lightning (d8,
 * electrical)", "Poison Cloud (d10 TOX, area)"; anything else ("Enfeebling
 * Touch (d6 STR damage)", "Swallow Whole (...)", "Special Attack (See next
 * column)") returns null and stays text until step 3 mechanises it.
 *
 * A natural weapon: intrinsic, no slots, no hands, equipped - the shape a
 * creature's own attack has in bestiary-build.js. TOX is a creature attack's
 * damage like any other, unlike a carried poison's. Melee, Ranged and Area say
 * their own reach; Area is ranged. DECIDED IN THE BUILD, Matt's to overturn:
 * the book's "fire" is the system's flame, and a breath, ray, spit, spray,
 * cloud, lightning or eyes attack is ranged.
 */
const CREATURE_RANGED = /\b(ranged|area|breath|ray|spit|spray|cloud|lightning|eyes)\b/i;
const RANGE_WORDS = new Set(["area", "close"]);
const ALIAS = { fire: "flame" };
export function attackWeaponItem(text)
{
  const p = parsePiece(text);
  // "(2d8, fire)", "(d10 TOX, area)": an aliased type or a reach word in a part of its own belongs to the die
  const own = p.rest.filter(r => ALIAS[lc(r)] || RANGE_WORDS.has(lc(r)));
  const rest = p.rest.filter(r => !own.includes(r));
  if(!p.die || rest.length || p.count || p.slots || p.av || p.avBonus || p.usage) return null;
  p.dieWords = [...p.dieWords, ...own];
  const words = p.dieWords.map(lc).map(w => ALIAS[w] ?? w).filter(w => !RANGE_WORDS.has(w));
  if(!words.every(isDamageType)) return null;
  const types = [...new Set(words.flatMap(w => attackPropertiesOf({ damageTypes: [w] })))];
  const ranged = /\bmelee\b/i.test(p.name) ? false : CREATURE_RANGED.test(p.name) || p.dieWords.some(w => lc(w) === "area");
  return tag({ name: p.name, type: ranged ? "weaponRanged" : "weaponMelee",
    system: { damageDice: normalizeDamageDice(p.die), slots: 0, hands: 0, tags: [], equipped: true, intrinsic: true,
      description: `<p>${text}</p>`, ...(types.length ? { damageTypes: types } : {}) } }, text, "attack");
}

/** Every piece of a gear line as Item data, in order; pieces that are no possession are left out. */
export async function gearItems(text)
{
  const out = [];
  for(const piece of splitGear(text))
  {
    const item = await gearPieceItem(piece);
    if(item) out.push(item);
  }
  return out;
}
