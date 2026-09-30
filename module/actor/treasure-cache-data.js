/**
 * Treasure Caches — Treasure/Treasure Caches.md, JADE IBIS.
 *
 * Transcribed from the vault page after it was corrected against the Jade
 * Ibis book page on 2026-09-19 (four rows were wrong; see the Treasure Cache
 * Generation row). Every row is one line of the book table: `kind` names
 * what is rolled, `cells` holds one entry per size column in book order.
 *
 * A cell is one of:
 *   null      the book's "—": nothing
 *   "1"       exactly one
 *   "d6"      a count, rolled (d4, d6, d8, d10, 2d6, 3d6 ...)
 *   "3-in-6"  a chance of exactly one, rolled on a d6
 *
 * The book's own wording stays in `label` so a roll can be checked against
 * the page by eye.
 */

export const CACHE_SIZES = ["Small", "Medium", "Large", "Extra-Large"];

export const TREASURE_CACHES =
{
  "Survival":
  {
    blurb: "Medical caches buried by long-dead militias or fellow adventurers.",
    rows:
    [
      { kind: "water",     label: "Water Rations",        cells: ["d6", "2d6", "3d6", "3d6"] },
      { kind: "food",      label: "Dried Food Rations",   cells: ["d6", "2d6", "3d6", "3d6"] },
      { kind: "medgel",    label: "Medgels (d10 Heal)",   cells: ["1", "d4", "d6", "2d6"] },
      { kind: "synth",     label: "Synth Parts",          cells: [null, "d4", "d6", "2d6"] },
      { kind: "antitoxin", label: "Vials of Antitoxin",   cells: [null, "1", "d4", "d6"] },
      { kind: "equipment", label: "Equipment",            cells: ["d4", "d6", "d8", "d8"] },
      { kind: "implant",   label: "Cybernetic Implant",   cells: [null, null, "1-in-6", "3-in-6"] }
    ]
  },
  "Bandit":
  {
    blurb: "The ill-gotten gains of bandit camps or other armed groups.",
    rows:
    [
      { kind: "water",        label: "Water Rations",           cells: ["d4", "d6", "2d6", "3d6"] },
      { kind: "food",         label: "Food Rations",            cells: ["d4", "d6", "2d6", "3d6"] },
      { kind: "basicWeapon",  label: "Basic Weapons",           cells: ["1", "d4", "d6", "d6"] },
      { kind: "advWeapon",    label: "Advanced Weapons",        cells: [null, null, "1", "d4"] },
      { kind: "grenade",      label: "Grenades (d10, blast)",   cells: [null, "d4", "d6", "d10"] },
      { kind: "helmOrShield", label: "Helmet or Shield",        cells: [null, "1", null, null] },
      { kind: "helmAndShield",label: "Helmet and Shield",       cells: [null, null, "1", "d6"] },
      { kind: "tradeGood",    label: "Trade Goods",             cells: ["d4", "d6", "d8", "2d6"] },
      { kind: "exotica",      label: "Exotica",                 cells: [null, null, "3-in-6", "1"] }
    ]
  },
  "Occult":
  {
    blurb: "Represents the collection of a science-mystic or alchemist.",
    rows:
    [
      { kind: "drug",    label: "Rare Drugs",                 cells: ["1", "d4", "d6", "d8"] },
      { kind: "book",    label: "Books",                      cells: ["1", "d4", "d6", "d8"] },
      { kind: "codex",   label: "Hypergeometric Codices",     cells: ["1-in-6", "3-in-6", "1", "d4"] },
      { kind: "elixir",  label: "Elixirs",                    cells: [null, "1", "d4", "d6"] },
      { kind: "poison",  label: "Vials of Poison",            cells: ["1", "d4", "d6", "d8"] },
      { kind: "gift",    label: "Sources of Random Gifts",    cells: ["3-in-6", "1", "d4", "d6"] },
      { kind: "exotica", label: "Exotica",                    cells: [null, "1-in-6", "3-in-6", "1"] }
    ]
  },
  "Lair":
  {
    blurb: "The treasure found in a monster's lair, likely dropped by failed slayers.",
    // The book labels Lair sizes by the lair creature's Level.
    sizeLabels: ["Small (Lvl 0–2)", "Medium (Lvl 3–5)", "Large (Lvl 6–9)", "Extra-Large (Lvl 10+)"],
    rows:
    [
      { kind: "water",        label: "Water Rations",           cells: ["d4", "d6", "2d6", "3d6"] },
      { kind: "food",         label: "Food Rations",            cells: ["d4", "d6", "2d6", "3d6"] },
      { kind: "tradeGood",    label: "Trade Goods",             cells: ["1", "d4", "d6", "2d6"] },
      { kind: "basicWeapon",  label: "Basic Weapons",           cells: ["1", "d4", "d6", "d8"] },
      { kind: "helmOrShield", label: "Helmet or Shield",        cells: [null, "1", null, null] },
      { kind: "helmAndShield",label: "Helmet and Shield",       cells: [null, null, "1", "d4"] },
      { kind: "armour",       label: "Sets of Armour",          cells: [null, "1", "1", "d4"] },
      { kind: "advWeapon",    label: "Advanced Weapons",        cells: [null, null, "1", "d4"] },
      { kind: "implant",      label: "Cybernetic Implants",     cells: ["1-in-6", "3-in-6", "1", "d4"] },
      { kind: "gift",         label: "Sources of Random Gifts", cells: [null, null, "3-in-6", "1"] },
      { kind: "exotica",      label: "Exotica",                 cells: ["1-in-6", "3-in-6", "1", "d4"] }
    ]
  },
  "Tomb":
  {
    blurb: "Burial goods, interred with a deceased notable.",
    rows:
    [
      { kind: "jewellery",    label: "Items of Jewellery",      cells: ["1", "d4", "d6", "d8"] },
      { kind: "basicWeapon",  label: "Basic Weapons",           cells: ["1", "d4", null, null] },
      { kind: "advWeapon",    label: "Advanced Weapons",        cells: [null, null, "1", "d4"] },
      { kind: "helmOrShield", label: "Helmet or Shield",        cells: ["1", "1", null, null] },
      { kind: "helmAndShield",label: "Helmet and Shield",       cells: [null, null, "1", "d4"] },
      { kind: "armour",       label: "Sets of Armour",          cells: ["1", "1", "1", "d4"] },
      { kind: "implant",      label: "Cybernetic Implants",     cells: ["1-in-6", "3-in-6", "1", "d4"] },
      { kind: "codex",        label: "Hypergeometric Codex",    cells: ["1-in-6", "3-in-6", "1", "1"] },
      { kind: "gift",         label: "Source of Random Gift",   cells: ["1-in-6", "3-in-6", "1", "1"] },
      { kind: "exotica",      label: "Exotica",                 cells: ["1-in-6", "3-in-6", "1", "1"] }
    ]
  },
  "Magnificent":
  {
    blurb: "The wealth held in a noble family's vaults or a warlord's treasury.",
    // No Extra-Large column in the book.
    sizes: ["Small", "Medium", "Large"],
    rows:
    [
      { kind: "water",         label: "Water Rations",                   cells: ["3d6", "4d6", "5d6"] },
      { kind: "food",          label: "Food Rations",                    cells: ["3d6", "4d6", "5d6"] },
      { kind: "tradeGood",     label: "Trade Goods",                     cells: ["2d6", "3d6", "4d6"] },
      { kind: "advWeapon",     label: "Advanced Weapons",                cells: ["1", "d4", "d6"] },
      { kind: "exoticWeapon",  label: "Exotic Weapons",                  cells: [null, "1", "d4"] },
      { kind: "jewellery",     label: "Items of Jewellery",              cells: ["d4", "d6", "d8"] },
      { kind: "codex",         label: "Hypergeometric Codices",          cells: ["1", "d4", "d6"] },
      { kind: "elixir",        label: "Elixirs",                         cells: ["1", "d4", "d6"] },
      { kind: "advImplant",    label: "Advanced Cybernetic Implants",    cells: ["1", "d4", "d4"] },
      { kind: "gift",          label: "Sources of Random Gifts",         cells: ["1", "d4", "d6"] },
      { kind: "exotica",       label: "Exotica",                         cells: ["1", "d4", "d6"] }
    ]
  }
};

/** The size columns a cache type has, in book order. */
export function sizesOf(type)
{
  return TREASURE_CACHES[type]?.sizes ?? CACHE_SIZES;
}
