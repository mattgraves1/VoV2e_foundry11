/**
 * Region Generator (foundry-system-index.csv row of that name) - the book's
 * tables the generator rolls on, read from the module's table data rather than
 * copied, so there is one transcription of each.
 *
 *   Regional Feature Table   The Desert/Region Creation.md - Location Type,
 *                            Landscape, Region Named For, Route Hazard
 *   Landmark Table (d100)    The Desert/Landmark.md
 *
 * Pure: no Foundry, so it runs in Node for the test.
 */

import { ROLLTABLES } from "../actor/rolltable-data.js";
import { COMPOSITE_GENERATORS } from "../actor/composite-generator-data.js";
import { WEATHER_TYPES } from "../time/weather-data.js";

const table = name =>
{
  const t = ROLLTABLES.find(x => x.name === name);
  if(!t) throw new Error(`Region Generator: the table "${name}" is missing from rolltable-data.js.`);
  return t;
};

// One column of a multi-column table, row by row ("**Landscape:** Salt Pan").
function column(t, label)
{
  return t.results.map(r =>
  {
    const m = r.text.match(new RegExp(`\\*\\*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\*\\* ([^\\n]*?)\\s*(?:\\n|$)`));
    if(!m) throw new Error(`Region Generator: "${t.name}" row ${r.range[0]} has no ${label}.`);
    return m[1].trim();
  });
}

const feature = table("Regional Feature Table");

// The table's wikilink shows "Science Mystic's Abode"; the book and its own page
// spell it "Science-Mystic's Abode", which is the name used everywhere else.
const SPELLING = { "Science Mystic's Abode": "Science-Mystic's Abode" };

/** Index = d20 - 1. */
export const TYPES = column(feature, "Location Type").map(t => SPELLING[t] ?? t);
export const LANDSCAPES = column(feature, "Landscape");
export const NAMED_FOR = column(feature, "Region Named For");
export const HAZARDS = column(feature, "Route Hazard");

/** Index = d100 - 1. */
export const LANDMARKS = table("Landmark Table (d100)").results.map(r => r.text.trim());

// ---- names (RULED 2026-10-03, Matt) ----

/** The twelve Place Names columns (The Desert/Place Names.md), each 20 names, d20 order. */
export const PLACE_NAMES = Object.fromEntries([
  ["Settlements, Ruins & Holy Places", ["Settlements", "Ruins", "Holy Places"]],
  ["Faa Nomad, Hegemony & Cacklemaw Places", ["Faa Nomad Places", "Hegemony Places", "Cacklemaw Places"]],
  ["Oases and Lakes, Mountains & Autarchic Places", ["Oases and Lakes", "Mountains", "Autarchic Places"]],
  ["Hidden Places, Titan-Era Facilities & Accursed Places", ["Hidden Places", "Titan-Era Facilities", "Accursed Places"]]
].flatMap(([t, cols]) => cols.map(c => [c, column(table(t), c)])));

/** Each location type's Place Names column. */
export const TYPE_NAME_COLUMN = {
  "Settlement": "Settlements", "Trade Post": "Settlements",
  "Ruin": "Ruins", "Wreck": "Ruins",
  "Holy Place": "Holy Places", "Grave": "Holy Places",
  "Faa Nomad Camp": "Faa Nomad Places", "Hegemony Outpost": "Hegemony Places", "Cacklemaw Den": "Cacklemaw Places",
  "Oasis": "Oases and Lakes", "Fortress": "Autarchic Places",
  "Bandit Camp": "Hidden Places", "Oracle's Sanctum": "Hidden Places", "Science-Mystic's Abode": "Hidden Places", "Bounty Hunter's Camp": "Hidden Places",
  "Vault": "Titan-Era Facilities", "Arcology": "Titan-Era Facilities", "Archive": "Titan-Era Facilities",
  "Lair": "Accursed Places", "Anomaly": "Accursed Places"
};
/** The types that roll Autarchic Places instead one time in five. */
export const AUTARCHIC_TYPES = new Set(["Settlement", "Ruin", "Wreck", "Holy Place", "Grave", "Oasis", "Fortress", "Vault", "Arcology", "Archive", "Anomaly"]);
export const AUTARCHIC_CHANCE = 0.2;

/** Each Landscape's word in a section's name ("the Ossino Riverbed"). */
export const LANDSCAPE_WORD = {
  "Featureless Sands": "Sands", "Salt Pan": "Salt Flats", "Rocky Plain": "Plain", "Dried-Up Lake": "Lakebed",
  "Dried-Up River": "Riverbed", "Towering Monoliths": "Monoliths", "Mesas": "Mesas", "Hills": "Hills",
  "Lone Mountain": "Mountain", "Toxic Lake": "Lake", "Toxic River": "River", "Fungal Forest": "Forest",
  "Crystal Growths": "Crystals", "Windswept Plateau": "Plateau", "Mountainous": "Mountains", "Winding Canyons": "Canyons",
  "Abandoned City": "City", "Cactus Fields": "Fields", "Riddled with Caves": "Caves", "Garbage-Strewn Wastes": "Wastes"
};

/**
 * A region Settlement's Location of Settlement, from its section's Landscape
 * (Settlement Location from Section Landscape row, RULED 2026-10-08, Matt).
 * Fifteen are the book's own Location rows; the five marked new are Claude's
 * wording, approved. LANDSCAPE_SETTING names the terrain beside a site feature
 * ("Ancient Bomb Crater, among the Mesas") - Claude's wording, after Matt ruled
 * that a site feature names its terrain.
 */
export const LANDSCAPE_SETTLEMENT_LOCATION = {
  "Featureless Sands": "Amongst Rolling Dunes", "Salt Pan": "On Salt Plains",
  "Rocky Plain": "On a Rocky Plain",                       // new
  "Dried-Up Lake": "Dried-up Lake Bed",
  "Dried-Up River": "Beside a Dried-Up Riverbed",          // new
  "Towering Monoliths": "Surrounded by Monoliths",
  "Mesas": "Atop a Mesa",                                  // new
  "Hills": "On a Windswept Hill", "Lone Mountain": "Foot of a Lone Mountain",
  "Toxic Lake": "Shores of a Toxic Lake", "Toxic River": "Banks of a Toxic River",
  "Fungal Forest": "Surrounded by Fungal Groves", "Crystal Growths": "Amongst Huge Floating Crystals",
  "Windswept Plateau": "On a Windswept Plateau",           // new
  "Mountainous": "Nestled in a Valley", "Winding Canyons": "Amongst Desert Canyons",
  "Abandoned City": "Within Ruins of Larger Settlement", "Cactus Fields": "Amongst Cactus Groves",
  "Riddled with Caves": "Amidst Cave-Riddled Rock",        // new
  "Garbage-Strewn Wastes": "Amongst Garbage-Strewn Sands"
};
export const LANDSCAPE_SETTING = {
  "Featureless Sands": "in the Featureless Sands", "Salt Pan": "on the Salt Pan", "Rocky Plain": "on the Rocky Plain",
  "Dried-Up Lake": "on the Dried-Up Lake", "Dried-Up River": "by the Dried-Up River", "Towering Monoliths": "among the Towering Monoliths",
  "Mesas": "among the Mesas", "Hills": "in the Hills", "Lone Mountain": "by the Lone Mountain", "Toxic Lake": "by the Toxic Lake",
  "Toxic River": "by the Toxic River", "Fungal Forest": "in the Fungal Forest", "Crystal Growths": "among the Crystal Growths",
  "Windswept Plateau": "on the Windswept Plateau", "Mountainous": "in the Mountains", "Winding Canyons": "in the Winding Canyons",
  "Abandoned City": "in the Abandoned City", "Cactus Fields": "in the Cactus Fields", "Riddled with Caves": "among the Caves",
  "Garbage-Strewn Wastes": "in the Garbage-Strewn Wastes"
};
/** The Location of Settlement rows (d20) that are site features, not terrain: one of them one time in four. */
export const SITE_FEATURE_ROWS = [1, 2, 6, 9, 20];
export const SITE_FEATURE_CHANCE = 0.25;

/**
 * Each Landscape's encounter table - a section's default table, which the GM
 * may change, and the source of a Local Wildlife section name's creature.
 * Environment Encounter Tables are d20, the themed Encounter Tables d12.
 */
export const LANDSCAPE_ENCOUNTERS = {
  "Featureless Sands": "Featureless Sands", "Salt Pan": "Featureless Sands", "Rocky Plain": "Ambushers",
  "Dried-Up Lake": "Featureless Sands", "Windswept Plateau": "Featureless Sands",
  "Dried-Up River": "Desert Canyons", "Mesas": "Desert Canyons", "Winding Canyons": "Desert Canyons",
  "Hills": "Hills and Mountains", "Lone Mountain": "Hills and Mountains", "Mountainous": "Hills and Mountains",
  "Toxic River": "Blighted Deathlands", "Fungal Forest": "Fungal Forests", "Abandoned City": "Ruined City",
  "Garbage-Strewn Wastes": "Garbage Wastes", "Towering Monoliths": "Sky Islands",
  "Toxic Lake": "Poison and Diseases", "Cactus Fields": "Small and Annoying",
  "Crystal Growths": "Psychic Creatures", "Riddled with Caves": "Cave System"
};
/** A Famous Monster section's table gains an entry from this table, and its name uses that creature. */
export const FAMOUS_MONSTER_TABLE = "Alone and Dangerous";

/** An encounter table's entries, by name: [{ range, text }]. */
export function encounterTable(name)
{
  // by its book name: the environment tables are stored as "<name> Encounters"
  const t = ROLLTABLES.find(x => /^Bestiary\/(Environment )?Encounter Tables\.md :: /.test(x.source) && x.source.endsWith(":: " + name));
  if(!t) throw new Error(`Region Generator: no encounter table "${name}" in rolltable-data.js.`);
  return t;
}
/**
 * The creature an entry names: "d4 Moonbeasts (Imagos)" is "Moonbeasts", "D4 Alzabo" is "Alzabo", and "D6 Deserters
 * (as Bandits)" is "Bandits" - the stat block it is run as.
 */
export const creatureOf = text =>
{
  const t = String(text).replace(/^\d*d\d+\s+/i, "");
  const as = t.match(/\(as ([^)]+)\)\s*$/i);
  return (as ? as[1] : t.replace(/\s*\([^)]*\)\s*$/, "")).trim();
};
// The Hegemony's rank and file, named on their own in a location's table.
export const CREATURE_ALIASES = { "Conscripts": "Hegemony Conscript", "Legionaries": "Hegemony Legionary" };

/** Given names (Names of Vaarn, Names A and B), for a Famous Resident. */
export const GIVEN_NAMES = (() =>
{
  const g = COMPOSITE_GENERATORS.find(x => x.key === "names_of_vaarn");
  if(!g) throw new Error("Region Generator: Names of Vaarn is missing from composite-generator-data.js.");
  const cols = Object.assign({}, ...g.tables.flatMap(t => t.groups.map(gr => gr.data)));
  return [...cols["Names A"], ...cols["Names B"]];
})();

/** Trade goods that come from the land, for a Natural Resource section (RULED, from Treasure/Trade Goods.md). */
export const LAND_RESOURCES = ["Gold", "Silver", "Ore", "Sky Iron", "Jewels", "Hard Light Shard", "Memory Crystals",
  "Rare Wood", "Rare Flowers", "Edible Fungus", "Dried Cactus", "Honey", "Ambergris", "Animal Hides", "Lizardskin",
  "Sandworm Baleen", "Shells", "Silk", "Eggs", "Dried Grubs", "Toxins", "Synth Parts"];

/** A resource's own form in a section name, where "<Word> of <resource>" reads badly (Matt, 2026-10-03). */
export const RESOURCE_NAME_FORM = { "Synth Parts": "the Scrap {word}", "Hard Light Shard": "{word} of Hard Light" };

/** The weathers of the Weather chart, for a Local Weather section. */
export const WEATHER_NAMES = WEATHER_TYPES.map(w => w.name);

/** Landscapes whose Natural Wonder is a mountain or a body of water rather than the landmark. */
export const MOUNTAIN_LANDSCAPES = new Set(["Lone Mountain", "Mountainous"]);
export const WATER_LANDSCAPES = new Set(["Dried-Up Lake", "Dried-Up River", "Toxic Lake", "Toxic River"]);
