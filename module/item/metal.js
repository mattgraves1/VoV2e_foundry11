/**
 * METAL ITEM PROPERTY - foundry-system-index.csv "Metal Item Property".
 *
 * Every item carries `system.metal`, a checkbox the GM can flip. This file is
 * the one place its DEFAULT is decided, from the rulings Matt made in the
 * 2026-09-27 pass - the Decisions cell of that row holds them, and every list
 * below is one of them. Nothing here is a design choice of this file's own.
 *
 * The default is filled by knave.js's preCreateItem hook, and only when the
 * creation data does not already say. So a builder that knows better (the
 * flavour tables, whose NAME drops the column that decides it) sets the field
 * itself, and an item moved between actors keeps whatever it had.
 *
 * Pure: imports only roster data, so tools/ can load it under Node.
 *
 * WEARING METAL ARMOUR is a separate question from an item being metal
 * (RULED 2026-09-27): a metal Item equipped in the BODY slot, one of three
 * heavy implants installed, or the creature/steed flag. A metal helm, shield
 * or face item is metal but does not make its wearer one wearing metal armour.
 */
import { MELEE_WEAPONS, RANGED_WEAPONS, ARMOUR_TABLE, IMPLANTS } from "../actor/chargen-data.js";
import { ADVANCED_IMPLANTS } from "../actor/advanced-implants-data.js";
// A creature's own flags from its actor-level sentences (Effect Engine: Creatures chunk 2d).
import { creatureActorFlagsOf } from "./creature-effects.js";
import { armourSlotOf, statOf } from "../effects/item-stats.js";

// --- Weapons: metal by base, cleared by a tag -------------------------------
export const NOT_METAL_WEAPON_BASES = new Set(["Whip", "Club", "Sling", "Longbow", "Spore Thrower"]);
/** Basic tags Bone, Crystalline, Fungal, Translucent; exotic tag Hard Light. */
export const WEAPON_OVERRIDE_TAGS = new Set(["Bone", "Crystalline", "Fungal", "Translucent", "Hard Light"]);
// Longest first, so "Great Sword" is found before "Sword".
const WEAPON_BASES = [...MELEE_WEAPONS, ...RANGED_WEAPONS].map(w => w.name)
  .sort((a, b) => b.length - a.length);

// --- Body armour: metal by type, cleared by the quality ---------------------
export const METAL_ARMOUR_TYPES = new Set(["Plate Armour", "Chain Mail", "Brigandine", "Cuirass"]);
/** Quicksilver is "taken non-literally" - no override. */
export const ARMOUR_OVERRIDE_QUALITIES = new Set(["Biomechanical", "Fungal", "Crystalline", "Symbiotic", "Translucent"]);
const ARMOUR_TYPES = ARMOUR_TABLE.map(e => e.type).sort((a, b) => b.length - a.length);

// --- Implants: metal by default ---------------------------------------------
export const NOT_METAL_IMPLANTS = new Set([
  "Alluring Fakeface", "Mercurial Fakeface", "Subdermal Ceramic Plating", "Subdermal Insulation",
  "Hyper-elastic Tendons", "Dazzleskin Filaments",
  "Adaptive Camo-Dermis", "Pseudowomb", "Solar Scaling"
]);
const IMPLANT_NAMES = new Set([...IMPLANTS, ...ADVANCED_IMPLANTS].map(e => e.name));
/** Installed, these count as wearing metal armour. */
export const METAL_ARMOUR_IMPLANTS = new Set(["Ferrosteel Exo-Skeleton", "Dreadnaught Carapace", "Tank Treads"]);
/** The sentence those three carry - Matt: 'we should maybe put that in their descriptions'. */
export const METAL_ARMOUR_NOTE = "Counts as wearing metal armour.";

/** Is this implant metal? False for a name that is not an implant. */
export function implantIsMetal(name)
{
  return IMPLANT_NAMES.has(name) && !NOT_METAL_IMPLANTS.has(name);
}

// --- Everything decided by its exact name -----------------------------------
// Helms and shields default to not metal; these four are the exceptions.
// Gear, exotica and trade goods default to unchecked; these were checked.
export const METAL_BY_NAME = new Set([
  // Helms and shields
  "Brazen Helm", "Golden Helm", "Temple-Forged Shield", "Gladiator's Shield",
  // Starting gear, as gearItemData names it (suffixes stripped)
  "Magnetic Boots", "Grappling Hook & Rope", "Portable Stove", "Caltrops", "Animal Trap",
  "Handheld Drill", "Chain & Manacles", "Crowbar", "EMP Grenade", "Ball Bearings",
  "Cast Iron Skillet", "Lock Picks", "Hammer & Chisel", "Welding Torch", "Motion Sensor",
  "Autoglot Translator Unit",
  // Starting exotica
  "Agoniser", "Visualiser Helm", "Mirror Ring", "A Fool's Head", "Black Heart", "Midas Bomb",
  // Advanced exotica
  "Anti-Gravity Field Generator", "Ardar-Eld's Grail", "Mord-Red's Grail", "Biotic Field Generator",
  "Magnetic Orb", "Tech Wand", "Wand of Annihilation", "Mind Shield", "Mirror Armour", "Mirror Shield",
  "Bedazzling Blade", "Bluescreen Dagger", "Philosopher's Dirk", "Not-Sword", "Ditto Gun", "Snakemaker",
  "Tempest Cannon", "Active Camouflage Ring", "Cat Ring", "Disguise Ring", "Scatter-Shoal Ring",
  "Wind-up Haruspex", "Watchful Ferret", "Hedondroid", "Oneiric Bridge", "Compass of Origin",
  "Presence Drone", "Ammunition Fabricator", "Lithifying Ray", "Babel Bomb", "Lazarus Cap",
  "Hover Boots", "Black Cloud Bomb", "Stasis Bomb", "Phase Grenades",
  // Trade goods
  "Autarchy Coins", "Bells", "Gold", "Silver", "Sky Iron", "Ore", "Munitions", "Synth Parts",
  // The generic metal stack (Part B, 2026-09-27) - loot-builders STACKABLES.scrap
  "Scrap Metal"
]);

// --- The column-built flavour tables ----------------------------------------
export const INSTRUMENT_METAL_TYPES = new Set(["Trumpet", "Tuba", "Saxophone", "Gong", "Horn"]);
export const INSTRUMENT_METAL_MATERIALS = new Set(["Gold", "Clockwork", "Electric"]);
export const INSTRUMENT_NOT_METAL_MATERIALS = new Set(["Bone", "Crystal", "Fungal", "Translucent", "Stone", "Plastic", "Biomechanical"]);
export const JEWELLERY_METAL_HUES = new Set(["Golden", "Silver", "Bronze", "Rust"]);
export const JEWELLERY_NOT_METAL_HUES = new Set(["Bone", "Translucent", "Coral"]);
export const JEWELLERY_NOT_METAL_FORMS = new Set(["Boots", "Slippers"]);

/**
 * A flavour item's default from its rolled COLUMNS - called by buildFlavor,
 * which has them. The finished name cannot answer this: Fine Art's name drops
 * the medium entirely.
 */
export function flavorIsMetal(category, v)
{
  if (category === "Musical Instruments")
  {
    if (INSTRUMENT_METAL_MATERIALS.has(v.instrument_a)) return true;
    if (INSTRUMENT_NOT_METAL_MATERIALS.has(v.instrument_a)) return false;
    return INSTRUMENT_METAL_TYPES.has(v.instrument_b);
  }
  if (category === "Jewellery")
  {
    if (JEWELLERY_METAL_HUES.has(v.hue)) return true;
    return !JEWELLERY_NOT_METAL_HUES.has(v.hue) && !JEWELLERY_NOT_METAL_FORMS.has(v.form);
  }
  if (category === "Fine Art") return v.medium === "Statue (Bronze)";
  return false;
}

/** The weapon base a generated weapon's name ends in, or null. */
function weaponBaseOf(name)
{
  const n = String(name).replace(/\s*\(Fragile\)\s*$/, "");
  return WEAPON_BASES.find(b => n === b || n.endsWith(` ${b}`)) ?? null;
}

/** The body armour type a name ends in, and the quality word before it. */
function armourTypeOf(name)
{
  const n = String(name);
  const type = ARMOUR_TYPES.find(t => n === t || n.endsWith(` ${t}`));
  if (!type) return null;
  return { type, quality: n === type ? null : n.slice(0, n.length - type.length).trim() };
}

/**
 * The default for one item's creation data: `{ name, type, system }`.
 * Innate parts (natural weapons, creature attacks) are never metal - the
 * corrosion card and every thief skip them anyway, so there is nothing to ask.
 */
export function metalDefault(data)
{
  const name = data?.name ?? "";
  const type = data?.type;
  const sys = data?.system ?? {};

  // A capsule is metal when the implant inside is (RULED 2026-09-27). An
  // unopened Cybernetics Pack or Cocoon has no implant yet, so it is not.
  // Implants come before the innate test: every implant is intrinsic, and
  // the field still records what it is made of - isMetalItem is what keeps
  // an INSTALLED one away from the readers.
  if (type === "exotica" && sys.sealedImplant) return implantIsMetal(sys.sealedImplant);
  if (type === "implant") return implantIsMetal(name);
  if (sys.intrinsic) return false;

  if (METAL_BY_NAME.has(name)) return true;

  if (type === "weaponMelee" || type === "weaponRanged")
  {
    const base = weaponBaseOf(name);
    if (!base || NOT_METAL_WEAPON_BASES.has(base)) return false;
    return !(sys.tags ?? []).some(t => WEAPON_OVERRIDE_TAGS.has(t));
  }

  if (type === "armor" && (sys.armorSlot ?? "body") === "body")
  {
    const found = armourTypeOf(name);
    if (!found || !METAL_ARMOUR_TYPES.has(found.type)) return false;
    return !ARMOUR_OVERRIDE_QUALITIES.has(found.quality);
  }

  return false;
}

/** Is this Item metal, as the readers ask it? Installed implants never are. */
export function isMetalItem(item)
{
  if (!item || item.type === "implant") return false;
  // Through the sentences since Stats as Sentences chunk 2c (RULED 2026-10-07).
  return !!statOf(item, "metal");
}

/**
 * Does this actor count as WEARING METAL ARMOUR? Synthetic is a separate
 * condition every reader names on its own, so it is not folded in here.
 */
export function wearsMetalArmour(actor)
{
  if (!actor) return false;
  if (creatureActorFlagsOf(actor).metalArmour) return true;
  for (const i of actor.items ?? [])
  {
    if (i.type === "armor" && armourSlotOf(i) === "body" && i.system?.equipped && statOf(i, "metal")) return true;
    if (i.type === "implant" && METAL_ARMOUR_IMPLANTS.has(i.name)) return true;
  }
  return false;
}
