/**
 * Settlement Creation (foundry-system-index.csv row of that name) - the data the generator reads that is not
 * already in the module's tables. The book's own tables (Settlement Tables, Water Source, Government, Assets,
 * Problems, Building Types, Buildings, Landmark) are read from settlement-overview-data.js and rolltable-data.js,
 * so there is one transcription of each.
 *
 *   GOVERNMENT_DESCRIPTIONS  Settlements/Government Types.md (JADE IBIS), extracted from the vault 2026-10-08,
 *                            wiki links reduced to their text. Type B of the Government table names the entry.
 *   the naming word lists    RULED 2026-10-08 (Matt): accepted as the Settlement Lab showed them (version 14);
 *                            not the book's. Players' suggestions may replace words that do not play well.
 *   DWELLINGS                RULED 2026-10-08 (Matt): small dwellings drawn by Size; a Boomtown is 10 doubled
 *                            d4-1 times.
 *   SETTLEMENT_DEFAULTS      RULED 2026-10-08 (Matt): his Settlement Lab settings (seed bone-9620) are the
 *                            generator's defaults; the preview window keeps the controls.
 *
 * Pure: no Foundry, so it runs in Node for the test.
 */

export const GOVERNMENT_DESCRIPTIONS = {
  "Tyranny": "The settlement is firmly under the boot of a sole tyrant. All decisions are made by this individual, who allows no dissent. All military, legal, economic, cultural, and religious institutions serve the will of the tyrant.",
  "Synarchism": "The settlement is ruled by a secret society. The mechanisms by which this is carried out vary. There may be a 'mayor' or 'monarch' who is merely a puppet of the true rulers. Alternately, the existence of the ruling group is public knowledge but the members' identities are not. For an extra twist, the members of this secret society may not know one another's identities.",
  "Noocracy": "The settlement is ruled by a council of the wisest residents. It is up to you exactly how the population quantifies 'wisdom' and who is judged to possess it.",
  "Theocracy": "The settlement is ruled according to strict religious tenets. The dominant faith is also the controlling political entity. Religious prohibitions and taboos are enforced by the state, and residents who do not profess the faith are persecuted.",
  "Aristocracy": "The settlement is ruled by a class of landed hereditary aristocrats. While the nominal political structure might be democratic, in practise only those from an aristocratic family have any hope of governing.",
  "Gerontocracy": "The settlement is ruled by its oldest residents. Authority and social standing are directly correlated with old age. The political culture is likely to be calcified and resistant to change.",
  "Oligarchy": "The settlement is ruled by its wealthiest residents. Authority and social standing are directly correlated with material possessions. The politics and social life of the settlement are obsessed with accumulating the resource that makes one appear wealthy. This resource is probably not coinage, roll on the Trade Goods table for inspiration.",
  "Commune": "The settlement is governed by a non-hierarchical council of equals, who meet regularly to vote on matters of community concern. Possessions and labour are divided totally equally (at least in theory). While some voices may be much louder in the council than others, there is no single authority figure.",
  "Kleptocracy": "The settlement is ruled by thieves. This is not metaphorical. You must be an accomplished thief to be part of the ruling apparatus. Authority is gained by demonstrating your thieving prowess, either through organised trials or just by stealing from other communities.",
  "Technocracy": "The settlement is ruled by the technologically adept. They may be a small caste of science-mystics who cow the populace with their knowledge, programmers of an ancient AI which makes all the actual decisions, or simply a group who know how an ancient machine works and leverage that knowledge to gain political power.",
  "Monarchy": "The settlement is ruled by a hereditary monarch, who claims unbroken descent from a line of royalty stretching into antiquity. The truth of this claim is likely false, but it keeps everyone happy to pretend the monarch is descended from the ancient Autarchs. The monarch may be strong politically (in which case see Tyranny above) or weak and controlled by others (in which case see Oligarchy or Synarchism).",
  "Kritarchy": "The settlement is ruled by judges and the legal apparatus, who both make the law and pass judgement upon those who violate it. The text of the law may have been written long in the past, or it may be an ever-evolving document. In either case, the penalties for breaking the law are serious.",
  "Matriarchy": "The settlement is ruled by women, with particular authority given to the eldest and most experienced. If the population is made up of ancestries without a gender binary, they assign authority based on another set of perceived traits.",
  "Patriarchy": "The settlement is ruled by men, with particular authority given to the eldest and most experienced. If the population is made up of ancestries without a gender binary, they assign authority based on another set of perceived traits.",
  "Democracy": "The settlement is ruled by elected officials. The elections may not be fair, the franchise may not be extended to all residents, and officials may be incompetent or corrupt, but the candle of democracy still burns amongst the blue ruins.",
  "Sortition": "The settlement is ruled by selected officials, who are chosen by lottery. To really spice up the system, they are also deselected at random times, meaning the leadership class is constantly in flux. The settlement's political culture is likely chaotic, contradictory, and short-termist.",
  "Kratocracy": "The settlement is ruled by the strongest. At any time, one may challenge the current leader to a trial of strength, and the winner will be placed in charge. Ambitious citizens rise at dawn to begin training, lifting huge weights and grunting loud enough to wake the dead.",
  "Ochlocracy": "The settlement is ruled by mobs. Although there may be another form of nominal authority, they are cowed by the riotous population and go along with whatever the mob demands on that day. Mass brawls, vandalism, and arson are accepted ways of settling political disputes.",
  "Kakistocracy": "The settlement is ruled by the most foolish and least-qualified citizens. How exactly this unusual state of affairs came to pass is not recorded, as the reign of these Fool Autarchs has been turbulent indeed, but the arrangement has held for generations. Looking foolish and acting recklessly have become prized traits, and social gatherings inevitably devolve into irritating competitive displays of lunacy.",
  "Hive-Mind": "The settlement is ruled by a psychic gestalt mind. Most, if not all, of the residents are but appendages of a Hive-Mind. The Hive-Mind may be rational and benign or irrational and malignant, actively seeking new hosts to inhabit. In either case, no other source of authority can co-exist with such an entity.",
};

// ---- names (RULED 2026-10-08, Matt): every settlement's name is built from its details ----

/** The Houses, as a noun ("Jakara of the Golden Domes", "Bethod's Domes"). */
export const HOUSE_NOUN = { "Hide Yurts": "Yurts", "Clay Brick Huts": "Brick Huts", "Sunken Warren": "Warren", "Made from Trash": "Trash Heaps",
  "Plastic Cubes": "Plastic Cubes", "Grimy Towers": "Grimy Towers", "Vine-covered Villas": "Villas", "Golden Domes": "Golden Domes",
  "Chrome Spindles": "Chrome Spindles", "Repurposed Vehicles": "Wrecks", "Repurposed Weapon Arrays": "Gun Towers", "Moulded From Glass": "Glass Houses",
  "Hang From Wires": "Wires", "Atop Stilts": "Stilts", "Made from Bone": "Bone Houses", "Living Biotech Structures": "Living Halls",
  "Inside a Cave": "Caves", "Inside a Huge Skeleton": "Skeleton", "Atop a Huge Tree": "Great Tree", "Large Communal Blocks": "Blocks" };

/** Industry, as [a trade ("Glassblowers' Thill"), a place word ("Bethod's Kilns")]. */
export const INDUSTRY_WORDS = { "Hunting and Scavenging": ["Scavengers'", "Camp"], "Agriculture (Fungi)": ["Fungus-Farmers'", "Fungus Beds"],
  "Agriculture (Cacti)": ["Cactus-Growers'", "Cactus Rows"], "Agriculture (Seven-Fruit Trees)": ["Orchard", "Orchard"],
  "Glassmaking": ["Glassblowers'", "Kilns"], "Metalworking": ["Smiths'", "Forge"], "Mining (Glowstone)": ["Glowstone", "Glowpit"],
  "Mining (Plastics)": ["Plastic-Diggers'", "Diggings"], "Mining (Sky-Seeking Stone)": ["Skystone", "Quarry"],
  "Mining (Synth Parts)": ["Synth-Pickers'", "Scrapyard"], "Leatherworking": ["Tanners'", "Tannery"], "Breeding Packbeasts": ["Packbeast", "Stables"],
  "Breeding Fighting Beasts": ["Beastfighters'", "Pits"], "Pottery": ["Potters'", "Kilns"], "Carpet Weaving": ["Weavers'", "Looms"],
  "Herding (Lizards)": ["Lizard", "Pens"], "Herding (Zoxen)": ["Zox", "Fold"], "Herding (Land Parrots)": ["Parrot", "Roost"],
  "Herding (Giant Snails)": ["Snail", "Snailery"], "Brewing": ["Brewers'", "Brewery"] };

/** Location of Settlement, as a descriptive name; the last five are the region-only locations (Settlement Location from Section Landscape). */
export const LOCATION_NAME = { "Base of Huge Statue": "Statuefoot", "Amongst Broken War Machines": "Wreckfield", "Dried-up Lake Bed": "Lakebed",
  "On Salt Plains": "Saltpan", "Amongst Rolling Dunes": "Dunehollow", "Surrounded by Graves": "Gravesend", "Surrounded by Monoliths": "Stonering",
  "Surrounded by Fungal Groves": "Sporewood", "Surrounded by Dead Trees": "Deadwood", "Shores of a Toxic Lake": "Sourshore",
  "Banks of a Toxic River": "Bitterbank", "Amongst Huge Floating Crystals": "Crystalhang", "On a Windswept Hill": "Windhill",
  "Nestled in a Valley": "Lowvale", "Within Ruins of Larger Settlement": "Oldtown", "Amongst Cactus Groves": "Thornrow",
  "Amongst Garbage-Strewn Sands": "Scrapsands", "Foot of a Lone Mountain": "Mountainfoot", "Amongst Desert Canyons": "Canyonmouth",
  "Ancient Bomb Crater": "Crater Town",
  "On a Rocky Plain": "Stonefield", "Beside a Dried-Up Riverbed": "Dryford", "Atop a Mesa": "Mesatop", "On a Windswept Plateau": "Windtop",
  "Amidst Cave-Riddled Rock": "Holerock" };

// ---- the map ----

/** Small dwellings by Size (RULED 2026-10-08, Matt); a Boomtown rolls its own (dwellingsFor). */
export const DWELLINGS = { "Hamlet": 10, "Village": 15, "Small Town": 30, "Large Town": 60, "City-State": 120 };

/** The marked locations, by the die the book drops for each. */
export const KINDS = {
  seat:     { die: 20,  label: "Seat of Power" },
  water:    { die: 8,   label: "Water Source" },
  asset:    { die: 20,  label: "Major Asset" },
  problem:  { die: 20,  label: "Major Problem" },
  building: { die: 12,  label: "Notable Building" },
  landmark: { die: 100, label: "Landmark" },
};

/**
 * The generator's defaults (RULED 2026-10-08, Matt, from his Settlement Lab settings, seed bone-9620). Sizes are
 * fractions of the shorter side of the sheet. The sheet is A4 landscape, as the book's procedure says.
 */
export const SETTLEMENT_DEFAULTS = Object.freeze({
  seed: "-",
  larger: "size",       // the book's larger option: "size" = automatic for a Large Town or City-State; "yes"; "no"
  drop: "scatter",      // "scatter" anywhere on the sheet evenly, or "throw" around a point per handful
  spread: 0.30,         // a throw's spread
  gap: 0.10,            // the least room between two dice
  network: "tree",      // minor roads: "nearest" (the book's minimum), "tree" (one network), "loops" (one, plus loops)
  loops: 3,
  majorLink: "cross",   // a minor road crosses the main road (RULED)
  curve: 0.14,          // how much a road bends
  wall: "hull",         // "hull" straight sides, "round", "hug"
  wallPad: 0.15,        // room inside the wall
  dwellingScale: 1,     // a multiple of the Size's dwellings
});

/** The sheet the dice land on, A4 landscape, in sheet units. */
export const SHEET = { width: 1414, height: 1000 };

/**
 * Each place's map icon in module/icons/settlement (game-icons.net, CC BY 3.0 - credits.txt), baked onto its kind's
 * coloured disc. Approved by Matt 2026-10-08 as the Settlement Lab showed them. A building shows its type's icon.
 * The major problem has none: it is a GM-only pin (RULED).
 */
export const ICON_FILES = {
  "building": {
    "Abandoned Building": "building-abandoned-building.svg",
    "Residential Building": "building-residential-building.svg",
    "Artisanal Building": "building-artisanal-building.svg",
    "Commercial Building": "building-commercial-building.svg",
    "Religious Building": "building-religious-building.svg",
    "Cultural Building": "building-cultural-building.svg",
    "Ancient Building": "building-ancient-building.svg",
    "Criminal Building": "building-criminal-building.svg",
    "Agricultural Building": "building-agricultural-building.svg",
    "Occult Building": "building-occult-building.svg",
    "Military Building": "building-military-building.svg",
    "Government Building": "building-government-building.svg"
  },
  "seat": {
    "Seat of power": "seat-seat-of-power.svg"
  },
  "water": {
    "Oasis": "water-oasis.svg",
    "Atmospheric Condensation Machines": "water-atmospheric-condensation-machines.svg",
    "Deep Wells": "water-deep-wells.svg",
    "Underground Aqueduct": "water-underground-aqueduct.svg",
    "Secret Reservoir": "water-secret-reservoir.svg",
    "Water Recycling Machines": "water-water-recycling-machines.svg",
    "Flows From Hypergeometric Gate": "water-flows-from-hypergeometric-gate.svg",
    "Holy Relic Weeps Water": "water-holy-relic-weeps-water.svg"
  },
  "asset": {
    "Matter Fabricator": "asset-matter-fabricator.svg",
    "Beast Breeding Stables": "asset-beast-breeding-stables.svg",
    "Exotic Weapon": "asset-exotic-weapon.svg",
    "Notable Monastery": "asset-notable-monastery.svg",
    "Pilgrimage Site": "asset-pilgrimage-site.svg",
    "Famous Tavern": "asset-famous-tavern.svg",
    "Verdant Orchards": "asset-verdant-orchards.svg",
    "Fighting Pit": "asset-fighting-pit.svg",
    "Hypergeometric Building": "asset-hypergeometric-building.svg",
    "Ancient Spacecraft": "asset-ancient-spacecraft.svg",
    "Vault Entrance": "asset-vault-entrance.svg",
    "Great Waste Pit": "asset-great-waste-pit.svg",
    "Synth Repair Facility": "asset-synth-repair-facility.svg",
    "Mystic Lodge": "asset-mystic-lodge.svg",
    "House of Healing": "asset-house-of-healing.svg",
    "Master Alchemist's Workshop": "asset-master-alchemist-s-workshop.svg",
    "Grand Theatre": "asset-grand-theatre.svg",
    "Pleasure Gardens": "asset-pleasure-gardens.svg",
    "Stylite's Pillar": "asset-stylite-s-pillar.svg",
    "Orbital Defence Cannon": "asset-orbital-defence-cannon.svg"
  },
  "landmark": {
    "Landmark": "landmark-landmark.svg"
  }
};
