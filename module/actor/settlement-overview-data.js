/**
 * Vaarn Settlement Overview source data — Settlements/Settlements.md +
 * Settlements/Settlement Tables.md. Spot-checked against the current
 * vault and found NOT drifted; extracted the normal programmatic way.
 * Used by macros/generate-settlement.js — found late during work-queue.txt
 * item 1 Phase 3: this generator was originally mis-filed as needing
 * Phase 3's Bestiary-spawn helper (it doesn't; it's a pure "compose
 * several already-built RollTables" generator, same shape as Phase 2's
 * work, just not one of the 18 "__xxx_combined__" sentinels) alongside
 * Vault Room Contents (macros/generate-room-contents.js) and Gift Quality
 * & Form (macros/generate-gift.js, a Phase-1-shaped Item generator) — see
 * work-queue.txt for the full correction.
 *
 * SETTLEMENT_GROUPS: same shape as one composite-generator-data.js
 * "table.groups" array — every group here shares ONE roll across its
 * columns (rolls: 1 always; nothing in this generator repeats a roll,
 * unlike some of Phase 2's __xxx_combined__ generators), so
 * macros/generate-settlement.js reuses module/actor/composite-roller.js's
 * rollSingleTable directly on a synthetic { groups: SETTLEMENT_GROUPS }
 * table object rather than re-implementing the same roll logic a third
 * time. Population's Majority/Minority columns are two SEPARATE groups
 * (each its own single-column roll) rather than one shared-row group,
 * because Settlements.md says "Roll 2d6 for each column" — confirmed from
 * the source tool's own rollCols() calls, not guessed.
 *
 * EVERY SETTLEMENT TABLE COLUMN IS ITS OWN ROLL, one group each - RULED
 * 2026-10-08 (Matt): Location, Houses and Industry first, then "all these rolls
 * should be independent" (Praises, Despises and Lacks; Fashion, Festival and
 * Entertainment), where each set used to share one d20 row; the book: "Roll d20
 * on any or all of these tables". Government Type A and B became two rolls the
 * same day (Matt). Water Source & Complication alone shares a row: each
 * complication belongs to its source (RULED, Matt, kept paired). A region-made settlement
 * replaces the Location roll with its section's Landscape (Settlement Location
 * from Section Landscape row; region-details.js settlementLocationIn).
 *
 * POPULATION IS ROLLED ON 2d6 ("dice":"2d6" on both groups, read by
 * composite-roller.js), as the book says - row 0 is a 2. Until 2026-10-07 every
 * row came up evenly; Matt ruled the 2d6 intended (Dice-Sum Column Roll row).
 *
 * Settlement Assets and Building Types are NOT included here — both
 * already exist as plain RollTables in module/actor/rolltable-data.js
 * (Phase 2), and generate-settlement.js reads them from there via
 * module/actor/rolltable-picker.js instead of a third extraction.
 */

export const SETTLEMENT_GROUPS = [{"cols":["Water Source","Complication"],"rolls":1,"data":{"Water Source":["Oasis","Atmospheric Condensation Machines","Deep Wells","Underground Aqueduct","Secret Reservoir","Water Recycling Machines","Flows From Hypergeometric Gate","Holy Relic Weeps Water"],"Complication":["Poisonous algae or spilled chemicals","Slow, require repairs, spare parts rare","Slow and arduous to gather water","Blockage or diversion","Beginning to run dry","Require repairs, spare parts rare","Gateway capricious, sometimes closes up","Target of relic thieves"]}},{"cols":["Size"],"rolls":1,"data":{"Size":["Hamlet","Boomtown (doubles in size each month for d6 months)","Village","Small Town","Large Town","City-State (Smaller settlements pay tribute)"]}},{"cols":["Majority Population"],"rolls":1,"dice":"2d6","data":{"Majority Population":["Lithlings","Cacklemaw Exiles","True-Kin","Synths","Newbeasts","Cacogen","Faa Nomads","Mycomorphs","Neoblooms","Planeyfolk","Extradimensional Outsiders"]}},{"cols":["Minority Population"],"rolls":1,"dice":"2d6","data":{"Minority Population":["Tame Monsters","Planeyfolk","Neoblooms","Mycomorphs","Faa Nomads","Cacogen","Newbeasts","Synths","True-Kin","Cacklemaw Exiles","Lithlings"]}},{"cols":["Location of Settlement"],"rolls":1,"data":{"Location of Settlement":["Base of Huge Statue","Amongst Broken War Machines","Dried-up Lake Bed","On Salt Plains","Amongst Rolling Dunes","Surrounded by Graves","Surrounded by Monoliths","Surrounded by Fungal Groves","Surrounded by Dead Trees","Shores of a Toxic Lake","Banks of a Toxic River","Amongst Huge Floating Crystals","On a Windswept Hill","Nestled in a Valley","Within Ruins of Larger Settlement","Amongst Cactus Groves","Amongst Garbage-Strewn Sands","Foot of a Lone Mountain","Amongst Desert Canyons","Ancient Bomb Crater"]}},{"cols":["The Houses"],"rolls":1,"data":{"The Houses":["Hide Yurts","Clay Brick Huts","Sunken Warren","Made from Trash","Plastic Cubes","Grimy Towers","Vine-covered Villas","Golden Domes","Chrome Spindles","Repurposed Vehicles","Repurposed Weapon Arrays","Moulded From Glass","Hang From Wires","Atop Stilts","Made from Bone","Living Biotech Structures","Inside a Cave","Inside a Huge Skeleton","Atop a Huge Tree","Large Communal Blocks"]}},{"cols":["Industry"],"rolls":1,"data":{"Industry":["Hunting and Scavenging","Agriculture (Fungi)","Agriculture (Cacti)","Agriculture (Seven-Fruit Trees)","Glassmaking","Metalworking","Mining (Glowstone)","Mining (Plastics)","Mining (Sky-Seeking Stone)","Mining (Synth Parts)","Leatherworking","Breeding Packbeasts","Breeding Fighting Beasts","Pottery","Carpet Weaving","Herding (Lizards)","Herding (Zoxen)","Herding (Land Parrots)","Herding (Giant Snails)","Brewing"]}},{"cols":["Government Type A"],"rolls":1,"data":{"Government Type A":["Secretive","Bloodthirsty","Decrepit","Paranoid","Decadent","Unstable","Psychic","Diseased","Nostalgic","Eccentric","Feud-riven","Peaceful","Collapsing","Incompetent","Drunken","Militaristic","Gloomy","Ruthless","Cheerful","Manic"]}},{"cols":["Government Type B"],"rolls":1,"data":{"Government Type B":["Tyranny","Synarchism","Noocracy","Theocracy","Aristocracy","Gerontocracy","Oligarchy","Commune","Kleptocracy","Technocracy","Monarchy","Kritarchy","Matriarchy","Patriarchy","Democracy","Kratocracy","Ochlocracy","Sortition","Kakistocracy","Hive-Mind"]}},{"cols":["Dominant Faith"],"rolls":1,"data":{"Dominant Faith":["Church of the Promised Sun","Church of the Everbleeding Wound","Vaa, Blue Goddess of Empty Spaces","Seekers of Eyeless Wisdom","The Binary Devotion","Titan Cult (p.xx)","Autarch Cult (p.xx)","Church of Sevenscore Moons","Hidden Ghoul Cult","Worship Local Monster (p.xx)","Worship a Void Saint","Worship a Fungal Saint","Worship a local Petty God (p.xx)","Ancestor Worship","Worship a Quantum Daemon (p.xx)","Children of the Darkling Sun","Worship a Bomb","Worship a Planeyman","Worship Giant Animal","Militant Atheists"]}},{"cols":["Settlement Praises"],"rolls":1,"data":{"Settlement Praises":["Acts of Violence","Cunning and Cowardice","Motherhood and Fertility","Meteors and Tempests","Strangers and Travellers","Skilled Hunters","A Despotic Autarch","Silence and Watchfulness","The Elderly","The Young","Heroic Failures","Expert Artisans","Orphans and Widows","Jovial Bullies","Pious Lunatics","Drunkards","The Mystically Gifted","Those Who Sleep Outdoors","The Sick and Dying","Law Abiding Dullards"]}},{"cols":["Settlement Despises"],"rolls":1,"data":{"Settlement Despises":["Law Abiding Dullards","The Sick and Dying","Those Who Sleep Outdoors","The Mystically Gifted","Drunkards","Pious Lunatics","Jovial Bullies","Orphans and Widows","Expert Artisans","Heroic Failures","The Young","The Elderly","Silence and Watchfulness","A Despotic Autarch","Skilled Hunters","Strangers and Travellers","Meteors and Tempests","Motherhood and Fertility","Cunning and Cowardice","Acts of Violence"]}},{"cols":["Settlement Lacks"],"rolls":1,"data":{"Settlement Lacks":["History","Stories","Weapons","Men","Women","Children","Music","Silence","Livestock","Maps","Faith","Fuel","Imagination","Drugs","Sanity","Medicine","Information","New Blood","Vital Machine Parts","Joy"]}},{"cols":["In Fashion"],"rolls":1,"data":{"In Fashion":["Platform Shoes","Beards, False or Real","Extra Eyes, False or Real","Teeth, False or Real","Veils and Wigs","Masks and Concealment","Unusual Eyeglasses","Huge Bangles","Elongated Necks","Elongated Hands","Paleness in General","Tall Colourful Caps","Feathered Garments","Loads of Amulets","Pointed Shoes","Embroidered Tabards","Garlands of Flowers","Garlands of Chains","Silken Scarves","Transparent Clothing"]}},{"cols":["Annual Festival Of"],"rolls":1,"data":{"Annual Festival Of":["Masks","Gluttony","The Dead","Fog","Scorpions","Remembrance","Forgetfulness","Lost Items","Vultures","Jackals","Meteorites","Cleansing Flame","Cleansing Ice","Machinery","Abstinence","Competitive Gifting","Competitive Eating","Partner Swapping","Poetry and Song","General Misrule"]}},{"cols":["Local Entertainment"],"rolls":1,"data":{"Local Entertainment":["Card Game","Dice Game","Bluffing Game","Game of Chance","Oracular Game","Competitive Storytelling","Competitive Poetry","Competitive Dance","Competitive Singing","Marksmanship Contests","Culinary Contests","Competitive Eating","Boxing","Dance Combat","Hologram Game","Foot Races","Vehicle Races","Ball Game","Racquet Game","Wrestling"]}}];
