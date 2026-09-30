/**
 * Vaarn Bestiary — transcribed from C:\vaarn\vaarn\rules\Bestiary\*.md
 * (155 creature files, read in full 2026-08-18 to build this). Used by
 * macros/dev/import-bestiary.js to create npc Actors (world actors, or a
 * compendium pack — see that macro's header).
 *
 * Schema per creature:
 *   name        - display name. "(bestiary)" filename suffixes are already
 *                 stripped (pure Obsidian-collision disambiguators against
 *                 same-named PC ancestry files); "(Adult)"/"(Juvenile)" and
 *                 "(Imago)"/"(Nymph)" are KEPT because those pairs are
 *                 genuinely distinct stat blocks, not filename collisions.
 *   types       - creatureTypes keys, taken from each file's own
 *                 frontmatter `tags:` line (already lists the correct
 *                 lowercase type keywords) rather than re-parsing the
 *                 italic prose line under the heading.
 *   level       - numeric. Where the book gives a dice expression instead
 *                 of a fixed number (e.g. "2d6*", "d6"), this is the
 *                 rounded average, and levelNote explains the real rule.
 *   hp          - numeric. Where the book omits HP entirely, this is the
 *                 formula default (Level x 4, per Bestiary.md's own "to
 *                 calculate average HP, multiply Level by 4") rather than
 *                 a guess.
 *   av          - numeric, the primary/default AV. Conditional alternate
 *                 AVs (e.g. "20 (10)", "25 (15) if visible") are NOT
 *                 encoded numerically — see note for the condition.
 *   moraleBonus - numeric bonus for the ML check (d20 + ML, holds on 16+).
 *                 0 wherever the book gives a non-numeric value
 *                 ("Frenzied", "-", "Never Flees", "= Group Size",
 *                 "Special") — moraleNote carries the real text in that
 *                 case, and moraleMode says what to DO about it.
 *   moraleNote  - non-null only for the non-numeric-ML cases above.
 *   moraleMode  - set only on those same entries, because a 0 in
 *                 moraleBonus is indistinguishable from a real bonus of 0
 *                 and made "Never Flees" creatures flee constantly. One of
 *                 none/never/always/gm — the vocabulary and the reasoning
 *                 behind each live in module/actor/morale.js. Required:
 *                 tools/bestiary-drift.mjs FAILS if the vault gives a
 *                 creature a textual or placeholder ML and this is unset.
 *   enc         - the raw ENC field text, as-is (dice expression or
 *                 descriptive string like "varies").
 *   atk         - the raw ATK line text, preserved verbatim. The import
 *                 script tries to extract clean "Name (XdY)" segments
 *                 from this into real weapon Items (split on " / " and
 *                 " + "); anything that doesn't match stays text-only in
 *                 the biography, per Matt's call 2026-08-18 rather than
 *                 forcing "(Special)"/compound/conditional attacks into
 *                 items that would misrepresent them.
 *   note        - non-null only for genuine oddities worth flagging
 *                 (Echopraxist's fully variable stats, Ramworm's "infant
 *                 stage only" caveat, etc.) — surfaced in the biography.
 *   rules       - named creature rules, structured out of `bio` on
 *                 2026-09-08 for foundry-system-index.csv "Creature Rule
 *                 Reminder Surface". Present on 104 creatures; absent
 *                 where a creature has no named rule at all.
 *                 `{name, text, perRound?}`. NOT the same thing as
 *                 `abilities`, which is derived from the ATK line and
 *                 holds attacks only — every one of its entries names a
 *                 segment of `atk`, and none came from the biography.
 *                 That gap is why this field exists: a GM spawning a
 *                 Chromavore had no Incorporeal to switch on.
 *                 `text` is a VERBATIM slice of the creature's own bio
 *                 with tags stripped, which is the property the
 *                 injection was verified against rather than by reading
 *                 the output. Keep it that way — a rule reworded here
 *                 but not in `bio` makes the two disagree silently, and
 *                 tools/bestiary-drift.mjs FAILS on exactly that.
 *                 `perRound` marks a rule that recurs each combat round;
 *                 bestiary-build.js emits a reminder Item for those and
 *                 for nothing else, so the sheet does not fill up with
 *                 128 non-toggleable rules. Seven rules have no bolded
 *                 block in the book at all and were named by hand
 *                 (Absorbed, Swallowed, Blightstone Feeding, Clone
 *                 Spawn, Angry Bees, Rift, Tumble) — those names are
 *                 OURS, not the book's, and are the one part of this
 *                 field a later edition diff cannot check.
 *   bio         - flavor text + all bolded special-ability paragraphs,
 *                 combined, HTML paragraphs. This is where the real
 *                 monster-running information lives — GM reads and
 *                 adjudicates by hand, same as any tabletop bestiary; no
 *                 attempt to make these mechanically automatic (too much
 *                 unique per-creature homebrew logic to justify a schema,
 *                 unlike Wounds/Gifts/Codex which share a consistent
 *                 shape — see work-queue.txt item 2's scoping note).
 *                 STILL TRUE OF THE EFFECTS, narrowed 2026-09-08: the
 *                 rules are now NAMED in `rules` above, and a per-round
 *                 one gets a reminder Item, but nothing interprets the
 *                 text. Naming a rule is not automating it, and the
 *                 reminder is deliberately shape-agnostic for exactly
 *                 the reason this note gives.
 *   abilities[].effects {kind:"special"} - an ability that does something
 *                 its own effects do not state. Since 2026-09-21 every one
 *                 carries ONE pointer to where it is stated: `rule` (a rule
 *                 of this creature, exact name) or `see` ("biography",
 *                 "attack line", "Mystic Gifts", "Exotic Weapons",
 *                 "Bloomboons"). tools/test-special-markers.mjs fails on a
 *                 marker with no pointer or a rule pointer that resolves to
 *                 nothing - rename a rule, update its marker.
 *   abilities[].effects {kind:"damage", dice:"(@lvl)d4"} - damage READ FROM
 *                 AN ACTOR VALUE (2026-09-21): a Foundry roll-data formula,
 *                 resolved when rolled by module/combat/actor-value-damage.js
 *                 (@lvl = the attacker's current Level, @target.gleam = the
 *                 one targeted token's Gleam). The ability's `damageLabel`
 *                 is the book's words the sheet shows instead of a number.
 *                 tools/test-actor-value-damage.mjs fails on a value the
 *                 look-up does not provide or a formula with no label.
 *
 * Known exclusions from this file (see work-queue.txt item 2):
 *   - Jigsaw Courtier: skipped entirely, no stat block exists anywhere.
 *   - Fungal Horror: included (has a real stat block despite Bestiary.md's
 *     index calling it a stub — that index note is stale, flagged there).
 *   - Planeyfolk (bestiary): included, but has no matching token art in
 *     final_mapping_log.tsv (same known gap as Planeyfolk PC tokens) —
 *     uses a placeholder token until real art exists for either.
 */

export const BESTIARY = [
  { name: "Advocate", types: ["biological"], level: 0, levelNote: "book gives \"2d6\" — built at 0; use Roll for Level", hp: 0, av: 10, note: "The book gives LVL 2d6, AV d8+10 and ML +d12. Built at the fixed part of each; use Roll for Level, Roll for AV and Roll for Morale. HP is 4 per Level.", moraleBonus: 0, rolled: { level: { base: 0, dice: "2d6" }, av: { base: 10, dice: "1d8" }, morale: { base: 0, dice: "1d12" } }, enc: "1",
    atk: "Advanced Melee Weapon (see p.xx)",
    abilities: [
      {"name":"Advanced Melee Weapon","text":"Advanced Melee Weapon (see p.xx)","effects":[{"kind":"generateWeapon","tier":"Advanced","weaponKind":"melee"}]},
    ],
    bio: "<p>Every Advocate uses unique fighting styles and weaponry. This stat-block is simply a starting point. For more detail, refer to the Pit Fighters generator on p.xx.</p>" },

  { name: "Alzabo", types: ["biological"], level: 8, hp: 36, av: 15, moraleBonus: 9, enc: "1",
    atk: "2 x Claw (d8) + Maul (2d6), if both claws hit same target",
    abilities: [
      {"name":"Claw","carried":false,"text":"2 x Claw (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
      {"name":"Maul","carried":false,"text":"Maul (2d6), if both claws hit same target","effects":[{"kind":"damage","dice":"2d6"}],"condition":"if both claws hit same target","followUp":{"after":"Claw"}},
    ],
    routines: [[0,1]],
    bio: "<p>The 'mocking bear'. Red-furred predator with ghastly humanoid face. Mimics the voices and behaviour of those it has eaten. Remembers where they lived and hunts their family.</p>" },

  { name: "Amaranthine Death-Worm", types: ["biological"], level: 6, hp: 24, av: 16, moraleBonus: 9, enc: "1",
    atk: "2 x Spines (d6) + Poison Spray (CON Save vs Amaranthine Venom)",
    abilities: [
      {"name":"Spines","carried":false,"text":"2 x Spines (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":2},
      {"name":"Poison Spray","text":"Poison Spray (CON Save vs Amaranthine Venom)","effects":[{"kind":"save","ability":"con","mode":"resist","vs":"Amaranthine Venom","onFail":{"wound":"amaranthineVenom"}}]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Amaranthine Venom","text":"A special Wound. Afflicted creatures have 0 HP and are Deprived until the Wound is cured. A second dose is always lethal."},
    ],
    bio: "<p>A reddish-purple rope of muscle and spines with a blind ravenous mouth at one end. The creature spits a virulent neurotoxin.</p><p><b>Amaranthine Venom:</b> A special Wound. Afflicted creatures have 0 HP and are Deprived until the Wound is cured. A second dose is always lethal.</p>" },

  { name: "Anthrophage", types: ["synthetic"], level: 0, hp: 1, av: 11, moraleBonus: 10, enc: "d8",
    atk: "Sting (Special)",
    abilities: [
      {"name":"Sting","text":"Sting (Special)","effects":[{"kind":"special","rule":"Sting"},{"kind":"save","ability":"con","mode":"resist","vs":"Anthrophagi bursting out (human-derived ancestries)"}]},
    ],
    rules: [
      {"name":"Sting","text":"An Anthrophage's sting catalyses a rapid reaction in human flesh. Human-derived ancestries must CON Save. On failure, d4 Anthrophagi explode from their body, each dealing d8 damage."},
    ],
    bio: "<p>Small synths with hexagonal heads and nine whirring legs, once used as a vengeance weapon to render land uninhabitable. They attack human-derived ancestries on sight, ignoring synthetic and mineral creatures.</p><p><b>Sting:</b> An Anthrophage's sting catalyses a rapid reaction in human flesh. Human-derived ancestries must CON Save. On failure, d4 Anthrophagi explode from their body, each dealing d8 damage.</p>" },

  { name: "Argent Shepherd", types: ["synthetic"], level: 7, hp: 28, av: 16, moraleBonus: 10, enc: "1",
    atk: "Argent Halo Implant (Special)",
    abilities: [
      {"name":"Argent Halo Implant","text":"Argent Halo Implant (Special)","effects":[{"kind":"special","see":"biography"},{"kind":"save","ability":"str","mode":"resist","vs":"an Argent Halo","opposed":true}]},
    ],
    bio: "<p>Abandoned justiciar of the Titan THEMIS. Eight-foot-tall synth wearing robes of perfect argent, the colour brighter than white. Does not commit violence but grabs assailants and attempts to implant them with an Argent Halo. This succeeds after an opposed STR Save. Anyone implanted with an Argent Halo cannot commit any acts of violence, nor are they able to remove the Halo without expert surgical help. Attempting to harm any living being while wearing a Halo results in the wearer passing out, with no Save possible.</p>" },

  { name: "Aspirant Ghoul Cultist", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 2, enc: "d10",
    atk: "Dagger (d6)",
    abilities: [
      {"name":"Dagger","carried":true,"text":"Dagger (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    bio: "<p>Robed and hooded when it is time to gather. A group of eight or more is lead by an Exalted Ghoul.</p>" },

  { name: "Babble Bird", types: ["biological"], level: 1, hp: 4, av: 17, moraleBonus: 1, enc: "d4",
    atk: "Spurs (d4, EGO Save vs Babbling)",
    abilities: [
      {"name":"Spurs","carried":false,"text":"Spurs (d4, EGO Save vs Babbling)","effects":[{"kind":"damage","dice":"1d4"},{"kind":"save","ability":"ego","mode":"resist","vs":"Babbling","inflicts":"Babbling","duration":{"amount":"1d6","unit":"hour"}}]},
    ],
    rules: [
      {"name":"Babbling","givesAway":true,"text":"In larger animals, the poison is not lethal but induces a strange neurological effect, requiring an EGO Save. On failure, the victim begins to babble and rave in a lost language. The noise lasts for d6 hours and prevents all verbal communication. Encounters are never surprised while the babbling is ongoing.", declaredSpan: null },
    ],
    bio: "<p>Small predatory descendants of hummingbirds. Kills rodents and lizards by injecting them with poison. Territorial and attacks to defend its nest.</p><p><b>Babbling:</b> In larger animals, the poison is not lethal but induces a strange neurological effect, requiring an EGO Save. On failure, the victim begins to babble and rave in a lost language. The noise lasts for d6 hours and prevents all verbal communication. Encounters are never surprised while the babbling is ongoing.</p>" },

  { name: "Bacterial Gestalt Colony", types: ["biological", "psychic"], level: 4, hp: 16, av: 10, moraleBonus: 12, enc: "1",
    atk: "Absorb (d8 ongoing, STR Save to break free)",
    abilities: [
      {"name":"Absorb","carried":false,"text":"Absorb (d8 ongoing, STR Save to break free)","effects":[{"kind":"damage","dice":"1d8"},{"kind":"save","ability":"str","mode":"escape","escapeBy":"break free","opposed":true}],"ongoing":true,"hold":{"dice":"1d8","escape":{"ability":"str","by":"break free","opposed":true}}},
    ],
    rules: [
      {"name":"Absorbed","text":"Targets absorbed take d8 damage each round until they make an opposed STR Save.","perRound":true},
    ],
    bio: "<p>Sentient, slow-moving ooze. Psychic, can communicate in staccato bursts of telepathic imagery. Targets absorbed take d8 damage each round until they make an opposed STR Save. The colony takes minimum damage from kinetic attacks but is vulnerable to fungal spores and other sources of antibiotics.</p>" },

  { name: "Bailiff of the Crimson Court", types: ["biological"], metalArmour: true, level: 2, hp: 8, av: 14, moraleBonus: 4, enc: "d10",
    atk: "Shock Baton (d8, electrical)",
    abilities: [
      {"name":"Shock Baton","carried":true,"text":"Shock Baton (d8, electrical)","effects":[{"kind":"damage","dice":"1d8","damageType":"electrical"}],"damageTypes":["electrical"]},
    ],
    bio: "<p>Dressed in dark red armour and featureless shadow-helms.</p>" },

  { name: "Bandit", types: ["biological"], level: 1, hp: 4, av: 13, moraleBonus: 5, enc: "d20",
    atk: "Basic Weapon (generate p.xx)",
    abilities: [
      {"name":"Basic Weapon","text":"Basic Weapon (generate p.xx)","effects":[{"kind":"generateWeapon","tier":"Basic"}]},
    ],
    bio: "<p>Ragged desperate robbers plaguing the Blue Ruins. For more details, see Bandit Camp.</p>" },

  { name: "Banisher", types: ["synthetic"], level: 6, hp: 24, av: 16, moraleBonus: 7, enc: "1",
    atk: "Banish (Special) / Summon (Special)",
    abilities: [
      {"name":"Banish","text":"Banish (Special)","effects":[{"kind":"special","rule":"Banish"}]},
      {"name":"Summon","text":"Summon (Special)","effects":[{"kind":"special","rule":"Summon"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Non-Lethal","text":"Banishers are forbidden from killing sentient life. They will first ask you to leave the vault and then lecture you about trespassing."},
      {"name":"Banish","text":"The Banisher grabs an intruder and teleports them to a designated eviction zone. Traditionally, this is the entrance to the vault, but more punitive locations are sometimes chosen."},
      {"name":"Summon","text":"Truly vexed Banishers, faced with repeat offenders, can teleport other creatures in from the vault to deal with them permanently. Roll on the encounter table for this floor. The summoned creature is not loyal to the Banisher.","summonFromDepth":true},
    ],
    bio: "<p>The Titan AIs were charged with preserving human life wherever possible. The Banishers were their attempt to create non-lethal security synths. They take the shape of enormous six-fingered hands, grasping intruders and evicting them using teleportation loci in their palms.</p><p><b>Non-Lethal:</b> Banishers are forbidden from killing sentient life. They will first ask you to leave the vault and then lecture you about trespassing.</p><p><b>Banish:</b> The Banisher grabs an intruder and teleports them to a designated eviction zone. Traditionally, this is the entrance to the vault, but more punitive locations are sometimes chosen.</p><p><b>Summon:</b> Truly vexed Banishers, faced with repeat offenders, can teleport other creatures in from the vault to deal with them permanently. Roll on the encounter table for this floor. The summoned creature is not loyal to the Banisher.</p>" },

  { name: "Baron's Militiaman", types: ["biological"], level: 1, hp: 4, av: 13, moraleBonus: 0, enc: "d8",
    atk: "Blade (d6) / Crossbow (d6)",
    abilities: [
      {"name":"Blade","carried":true,"text":"Blade (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Crossbow","ranged":true,"carried":true,"text":"Crossbow (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>Swaggering bullies who only attack if they outnumber their opponents. A group of six or more will be lead by a Captain.</p>" },

  { name: "Battle Boar", types: ["biological", "synthetic"], level: 3, hp: 12, av: 14, moraleBonus: 8, enc: "d6",
    atk: "Flamethrower Snout (d8, blast, flame) / Tusks (d6)",
    abilities: [
      {"name":"Flamethrower Snout","ranged":true,"carried":false,"text":"Flamethrower Snout (d8, blast, flame)","effects":[{"kind":"damage","dice":"1d8","damageType":"blast"}],"damageTypes":["blast","flame"]},
      {"name":"Tusks","carried":false,"text":"Tusks (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Flammable","text":"If damaged with a flaming weapon, the Battle Boar explodes, dealing 3d8 blast damage to everyone nearby."},
    ],
    bio: "<p>Cyborg war-boars, infested with nanomachinery. Char-grill their foes with great gouts of flame.</p><p><b>Flammable:</b> If damaged with a flaming weapon, the Battle Boar explodes, dealing 3d8 blast damage to everyone nearby.</p>" },

  { name: "Behemoth Toad", types: ["biological"], level: 4, hp: 16, av: 14, moraleBonus: 7, enc: "d6",
    atk: "Bellyflop (d10) / Tongue Grab (STR Save vs Devoured)",
    abilities: [
      {"name":"Bellyflop","carried":false,"text":"Bellyflop (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Tongue Grab","text":"Tongue Grab (STR Save vs Devoured)","effects":[{"kind":"save","ability":"str","mode":"resist","vs":"Devoured","onFail":{"hold":{"dice":"1d8","escape":{"ability":"str","by":"break free","assumed":true}}}}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Swallowed","text":"If hit with a tongue attack, PCs must STR Save or be drawn into the toad's mouth and take d8 damage per round.","perRound":true},
    ],
    bio: "<p>Enormous flabby toads often lurking near Vaarnish water-sources. If hit with a tongue attack, PCs must STR Save or be drawn into the toad's mouth and take d8 damage per round.</p>" },

  { name: "Berserker", moraleMode: "gm", types: ["biological"], level: 2, hp: 8, av: 10, moraleBonus: 0, moraleNote: "Frenzied (see bio, Wrathworms)", enc: "d6",
    atk: "Bite (d6 x 2) / Vomit Blood (CON Save vs Wrathworms)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d6 x 2)","effects":[{"kind":"damage","dice":"1d6"}],"count":2},
      {"name":"Vomit Blood","text":"Vomit Blood (CON Save vs Wrathworms)","effects":[{"kind":"save","ability":"con","mode":"resist","vs":"Wrathworms"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Wrathworms","text":"Berserkers are infested and both take and receive doubled damage. They attack on sight and never retreat from combat."},
    ],
    bio: "<p>Unfortunate souls who have reached the terminal stage of infestation with Wrathworms. Red-eyed and drooling blood and unable to feed themselves, they rampage across the blue sands to infect anyone in reach.</p><p><b>Wrathworms:</b> Berserkers are infested and both take and receive doubled damage. They attack on sight and never retreat from combat.</p>" },

  { name: "Blightbeast", types: ["biological", "synthetic"], level: 10, hp: 40, av: 18, moraleBonus: 12, enc: "d3",
    // Travel and Rations (Matt, 2026-09-23): Butchery refuses the body - the
    // book says so outright. butchery.js reads it as flags.vaarn.carcass.
    carcass: { yields: "nothing", why: "Their corpses cannot be used as a source of rations." },
    atk: "Claws (d10) + Bite (2d6) / Blight Breath (d12 TOX, blast)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Bite","carried":false,"text":"Bite (2d6)","effects":[{"kind":"damage","dice":"2d6"}]},
      {"name":"Blight Breath","ranged":true,"carried":false,"text":"Blight Breath (d12 TOX, blast)","effects":[{"kind":"damage","dice":"1d12","damageType":"tox"}],"damageTypes":["tox","blast"]},
    ],
    routines: [[0,1],[2]],
    rules: [
      {"name":"Blightstone Feeding","text":"Blightbeasts are immune to damage caused by energy weapons or radiation and heal 8 HP per round in the presence of radioactive material.","perRound":true},
    ],
    bio: "<p>Colossal cacogenic gila monsters, imbued with nanomachinery and armoured with thick black scales. Keratin bristles sprout from their backs in burnt-looking clumps. Their eyes and throats gleam with a sickly green radiance. If threatened, they breathe out a noxious cloud of radioactive gas before attacking with their powerful jaws.</p><p>The creatures seek out radioactive blightstone and gain sustenance from basking near it, although they supplement this nourishment with a conventional diet of raw meat. Blightbeasts are immune to damage caused by energy weapons or radiation and heal 8 HP per round in the presence of radioactive material. Blightbeasts have no natural predators, their flesh and blood being thoroughly poisonous. Their corpses cannot be used as a source of rations.</p>" },

  { name: "Blind Crab", types: ["biological"], level: 4, hp: 16, av: 18, moraleBonus: 2, enc: "d6",
    atk: "Big Claw (d10) + Little Claw (d6)",
    abilities: [
      {"name":"Big Claw","carried":false,"text":"Big Claw (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Little Claw","carried":false,"text":"Little Claw (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Blind","text":"Hunts by sensing vibrations. Cannot be blinded and hits with ADV in darkness.","attackNote":"Blind: hits with ADV in darkness.","conditionImmunity":["blind"]},
    ],
    bio: "<p>The evolutionary weight of countless eons has moulded this chthonic predator's body into a familiar shape. They cannot imagine an ocean, yet their form recalls aquatic ancestors millions of years distant. A milk-pale carapace encloses surprisingly tasty flesh.</p><p><b>Blind:</b> Hunts by sensing vibrations. Cannot be blinded and hits with ADV in darkness.</p>" },

  { name: "Blue Baboon", moraleMode: "gm", types: ["biological"], level: 0, hp: 1, av: 14, moraleBonus: 0, moraleNote: "= Group Size", enc: "3d6",
    atk: "Claws (d6) / Thrown Rock (d6)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Thrown Rock","ranged":true,"carried":true,"text":"Thrown Rock (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>Predatory blue apes of the Vaarnish wastes. Intelligent and carnivorous, hunt in packs.</p>" },

  // Added 2026-09-24 (Matt): the stat line inside the Brood Mother's rule and
  // the Broodling Broth's text - "Broodlings [LVL 0 (1 HP), AV 12, Bite (d4)]"
  // - given its own entry so both can spawn it. The book prints no morale or
  // number encountered for it; morale is the Referee's, and the count comes
  // from whatever birthed them.
  { name: "Broodling", moraleMode: "gm", types: ["biological"], level: 0, hp: 1, av: 12, moraleBonus: 0, moraleNote: "born loyal to its mother", enc: "d6",
    atk: "Bite (d4)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    routines: [[0]],
    bio: "<p>Half-spider and half-host, birthed in a clutch from a distended belly. Loyal to and following its mother until killed.</p>" },
  // Actor Spawning wiring, 2026-09-25 (Matt): the Neobloom's Sapling Retainers
  // bloomboon - a stat line inside the boon, given its own entry so the boon can
  // spawn it, the Broodling's precedent. The attack is unnamed in the book.
  { name: "Buzzblade Drone", types: ["synthetic"], level: 1, hp: 4, av: 14, moraleBonus: 10, enc: "-",
    atk: "Saw Hands (d6)",
    abilities: [
      {"name":"Saw Hands","carried":false,"text":"Saw Hands (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    bio: "<p>Like plasteel toddlers with chainsaw arms. Listlessly searching for something to cut up.</p>" },

  { name: "Consul's Lictor", types: ["biological"], metalArmour: true, level: 5, hp: 20, av: 18, moraleBonus: 7, enc: "d8",
    atk: "Anbaric Pike (d10, electrical) / Force Projector (blast, STR Save vs thrown backwards)",
    abilities: [
      {"name":"Anbaric Pike","carried":true,"text":"Anbaric Pike (d10, electrical)","effects":[{"kind":"damage","dice":"1d10","damageType":"electrical"}],"damageTypes":["electrical"]},
      {"name":"Force Projector","text":"Force Projector (blast, STR Save vs thrown backwards)","effects":[{"kind":"save","ability":"str","mode":"resist","vs":"thrown backwards"}],"damageTypes":["blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Look Out Sire","text":"When Consul Larke would take lethal damage, a Lictor can choose to die instead.","protector":true},
    ],
    bio: "<p>The sworn protectors of Consul Larke's exalted person. Use their flaring pikes and wrist-mounted force projectors to manage crowds.</p><p><b>Look Out Sire:</b> When Consul Larke would take lethal damage, a Lictor can choose to die instead.</p>" },

  { name: "Dogsbody", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 3, enc: "d6",
    atk: "Bite (d6)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    bio: "<p>An amalgam of Rappash-Ik's DNA with that of his favourite hunting dog. Black-furred hounds with the face of the Autarch. The creatures speak in repetitive parroted phrases and follow Janus devotedly. If Janus dies, they accept his killer as their pack leader, showing their bellies in submission.</p>" },

  { name: "Exalted Ghoul Cultist", types: ["biological"], level: 4, hp: 16, av: 14, moraleBonus: 5, enc: "d6",
    atk: "2 x Claws (d8)",
    abilities: [
      {"name":"Claws","carried":false,"text":"2 x Claws (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
    ],
    bio: "<p>The advanced stages of the transformation brought about by Jak's rituals elongate the limbs and teeth.</p>" },

  { name: "Hired Killer", types: ["biological"], level: 3, hp: 12, av: 14, moraleBonus: 4, enc: "d6",
    atk: "Knife (d6) / Grenade (d8, blast)",
    abilities: [
      {"name":"Knife","carried":true,"text":"Knife (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Grenade","ranged":true,"carried":true,"text":"Grenade (d8, blast)","effects":[{"kind":"damage","dice":"1d8","damageType":"blast"}],"damageTypes":["blast"]},
    ],
    routines: [[0],[1]],
    bio: "<p>Prieval's inner circle of enforcers. Assassination technique involves bombing targets' homes with ancient grenades.</p>" },

  { name: "Household Guard", types: ["biological"], metalArmour: true, level: 3, hp: 12, av: 14, moraleBonus: 4, enc: "d6",
    atk: "Pulse Rifle (d8)",
    abilities: [
      {"name":"Pulse Rifle","ranged":true,"carried":true,"text":"Pulse Rifle (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>Well-equipped and trained, but not as numerous as the Legionaries or the Baron's militiamen.</p>" },

  { name: "Janitor Synth", types: ["synthetic"], level: 1, hp: 4, av: 12, moraleBonus: 10, enc: "d6",
    atk: "n/a",
    abilities: [
    ],
    bio: "<p>Boxy, trundling cleaning synth. Attempts to dispose of any dead bodies within the facility and take them to the incinerator. Cannot speak, uninterested in living beings.</p>" },

  { name: "Lithophage Worm", types: ["biological"], level: 3, hp: 12, av: 14, moraleBonus: 6, enc: "d6",
    atk: "Drilling Beak (d8, -1 AV)",
    abilities: [
      {"name":"Drilling Beak","carried":false,"text":"Drilling Beak (d8, -1 AV)","effects":[{"kind":"damage","dice":"1d8"},{"kind":"avChange","amount":-1}]},
    ],
    bio: "<p>Only attacks to consume stone.</p>" },

  { name: "Lost Caeba Worker", types: ["biological"], level: 1, hp: 4, av: 10, moraleBonus: 0, enc: "d4",
    atk: "Tools (d4)",
    abilities: [
      {"name":"Tools","carried":true,"text":"Tools (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>Terrified and thirsty. Demand a share of your rations.</p>" },

  { name: "Militia Captain", types: ["biological"], level: 3, hp: 12, av: 13, moraleBonus: 4, enc: "1",
    atk: "Assault Laser (d8, beam)",
    abilities: [
      {"name":"Assault Laser","ranged":true,"carried":true,"text":"Assault Laser (d8, beam)","effects":[{"kind":"damage","dice":"1d8","damageType":"beam"}],"damageTypes":["beam"]},
    ],
    bio: "<p>Commands a group of militiamen. Always found guarding a public fountain.</p>" },

  { name: "Oviraptor Beetle", types: ["biological"], level: 2, hp: 8, av: 16, moraleBonus: 3, enc: "-",
    atk: "Pincers (d8)",
    abilities: [
      {"name":"Pincers","carried":false,"text":"Pincers (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>Egg-eating beetles. Aggressive and stupid. Fanatically attack anything egg-shaped.</p>" },

  { name: "Porta-Warden", moraleMode: "none", types: ["synthetic"], level: 2, hp: 8, av: 13, moraleBonus: 0, moraleNote: "-", enc: "-",
    atk: "Autorifle (d8)",
    abilities: [
      {"name":"Autorifle","ranged":true,"carried":false,"text":"Autorifle (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>Motion-sensor tripod with mounted weapon. Recognises its master via DNA-locking. This may be subverted if the Porta-Warden is provided new DNA from blood or hair.</p>" },

  { name: "Priest of the Promised Sun", types: ["biological"], level: 1, hp: 4, av: 10, moraleBonus: 1, enc: "d6",
    atk: "Staff (d4)",
    abilities: [
      {"name":"Staff","carried":true,"text":"Staff (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>Golden-masked clergy, empowered to to conduct marriage and funeral rites of the Promised Sun. Carry doses of Summerbalm (heals for d8 HP).</p>" },

  { name: "Sapling Retainer", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 1, enc: "d4",
    atk: "Attack (d6)",
    abilities: [
      {"name":"Attack","carried":false,"text":"Attack (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0]],
    bio: "<p>A sapling grown from a Neobloom's own flesh. It serves its grower for the rest of the day before withering.</p>" },

  { name: "Brood Mother", types: ["biological"], level: 8, hp: 32, av: 16, moraleBonus: 12, enc: "1",
    atk: "Claws (d8) / Grapple (DEX save vs Entangled)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Grapple","text":"Grapple (DEX save vs Entangled)","effects":[{"kind":"save","ability":"dex","mode":"resist","vs":"Entangled","condition":"entangled"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"The Brood","text":"The Mother births d6 Broodlings [LVL 0 (1 HP), AV 12, Bite (d4)] per combat round and 2d6 Broodlings on death. Fire or blast attacks prevent this.","perRound":true,"spawn":{"creature":"Broodling","dice":"1d6"}},
    ],
    bio: "<p>A mother's first duty is to her children, and she is no exception. In fungal forests and wind-swept canyons, she hunts, nurturing her brood inside her swollen abdomen. She approaches sleeping travellers from above, swaddling them in blankets tight enough to hush their cries before her sons and daughters emerge to feast.</p><p><b>The Brood:</b> The Mother births d6 Broodlings [LVL 0 (1 HP), AV 12, Bite (d4)] per combat round and 2d6 Broodlings on death. Fire or blast attacks prevent this.</p>" },

  { name: "Cacklemaw Virago", moraleMode: "gm", types: ["biological"], level: 5, hp: 20, av: 15, moraleBonus: 0, moraleNote: "Special — never retreats while other Cacklemaw can witness", enc: "1 (with 2d6 Cacklemaw)",
    atk: "2 x Blade (d8) + Bite (d6) / Advanced Weapon (generate p.xx)",
    abilities: [
      {"name":"Blade","carried":true,"text":"2 x Blade (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
      {"name":"Bite","carried":false,"text":"Bite (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Advanced Weapon","text":"Advanced Weapon (generate p.xx)","effects":[{"kind":"generateWeapon","tier":"Advanced"}]},
    ],
    routines: [[0,1],[2]],
    bio: "<p>Virago is the title given to the largest, meanest, and most cunning cacklemaw warriors. They lead their smaller sisters into battle and must be seen to savour the violence lest they be challenged by their underlings. For this reason, Virago never retreat from combat if other cacklemaw are alive to witness it.</p>" },

  { name: "Cacklemaw", types: ["biological"], level: 2, hp: 8, av: 13, moraleBonus: 8, enc: "2d6",
    atk: "Blade (d8) + Bite (d6) / Crossbow (d8)",
    abilities: [
      {"name":"Blade","carried":true,"text":"Blade (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Bite","carried":false,"text":"Bite (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Crossbow","ranged":true,"carried":true,"text":"Crossbow (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    routines: [[0,1],[2]],
    bio: "<p>Lurking and laughing hyena-women. Fight in packs, with little regard for their own safety. Snap at opponents' faces with their powerful teeth when in close quarters. A group of eight or more includes a Cacklemaw Virago.</p>" },

  { name: "Cacogen", types: ["biological"], level: 1, hp: 4, av: 11, moraleBonus: 2, enc: "d8",
    atk: "Improvised Weapon (d6)",
    abilities: [
      {"name":"Improvised Weapon","carried":true,"text":"Improvised Weapon (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    rules: [
      {"name":"Corrupted Blood","text":"Roll on the mutations table to determine the cacogen's curse.","generate":"mutation"},
    ],
    bio: "<p>Uncounted millennia of gene-sculpting have introduced pernicious instabilities into the heritage of humankind. Many seeds sown now grow riddled with impurity, and many a mother has cried aloud in horror when the babe was held before her eyes. In some kingdoms, mutants are hunted for sport. In others, to touch their heads upon a feast-day is thought to bring luck. In all places, however, they are held apart from true-kin, known to all by the ancient name: cacogen.</p><p><b>Corrupted Blood:</b> Roll on the mutations table to determine the cacogen's curse.</p>" },

  { name: "Chernobog", types: ["biological"], level: 12, hp: 48, av: 18, moraleBonus: 10, enc: "1",
    atk: "2 x Claw (d10) + Bite (d12) + Black Cloud (2 damage, aura, doubles each round)",
    abilities: [
      {"name":"Claw","carried":false,"text":"2 x Claw (d10)","effects":[{"kind":"damage","dice":"1d10"}],"count":2},
      {"name":"Bite","carried":false,"text":"Bite (d12)","effects":[{"kind":"damage","dice":"1d12"}]},
      {"name":"Black Cloud","carried":false,"text":"Black Cloud (2 damage, aura, doubles each round)","damageTypes":["suffocation"],"effects":[{"kind":"damage","flat":2}]},
    ],
    routines: [[0,1,2]],
    rules: [
      {"name":"Black Cloud","text":"Each round, the Chernobog emits a cocktail of hazardous fumes, dealing 2 damage to every character in the room. The cloud's strength doubles with each subsequent combat round. After three rounds, all PCs fight as if blinded.","perRound":true,"hpTick":{"dice":"2","to":"targets","damageTypes":["suffocation"],"factor":2,"conditionAfter":{"condition":"blind","ticks":3}}, declaredSpan: null },
      {"name":"Cave Fighter","text":"Strikes with ADV in enclosed spaces or against blinded creatures.","advantageVsCondition":["blind"],"attackNote":"Cave Fighter: ADV in enclosed spaces — the Referee's call."},
    ],
    bio: "<p>A dread creature from beyond the stars, brought to Urth in the hold of an Aurum Barge. The Chernobog is a colossal black-furred horror, described as 'a child of mongoose and serpent, two foes united under one foul banner'. An apex predator on the benighted sphere it hails from, ambushing those in dark and forgotten places. It prefers caves and the labyrinthine basements of ruined structures as lairs, rarely venturing above ground. If this were not terrible enough, the beast emits a noxious gas from facial glands when hunting, choking and blinding its victims. The Chernobog uses these black clouds to corral prey or cover its escape.</p><p><b>Black Cloud:</b> Each round, the Chernobog emits a cocktail of hazardous fumes, dealing 2 damage to every character in the room. The cloud's strength doubles with each subsequent combat round. After three rounds, all PCs fight as if blinded.</p><p><b>Cave Fighter:</b> Strikes with ADV in enclosed spaces or against blinded creatures.</p>" },

  { name: "Child of the Darkling Sun", types: ["biological", "psychic"], level: 3, hp: 12, av: 11, moraleBonus: 5, enc: "d6",
    atk: "Dagger (d4) / Darkling Dream (Special)",
    abilities: [
      {"name":"Dagger","carried":true,"text":"Dagger (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Darkling Dream","text":"Darkling Dream (Special)","effects":[{"kind":"special","rule":"Darkling Dream"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Darkling Dream","text":"The Child falls asleep. While they sleep, they manifest a nightmare into the waking world, with no Save possible. The nature of the nightmare varies: stairs become slides into pits of razors, the sun has your father's face, doors seal shut or open onto indescribable vistas. Waking the Child (through damage or anything else that would wake a sleeper) ends their dream's impingement on our reality."},
    ],
    bio: "<p>Dark-robed dreamers, hooded in black silk and blinded by their desire to transcend lucid reality.</p><p><b>Darkling Dream:</b> The Child falls asleep. While they sleep, they manifest a nightmare into the waking world, with no Save possible. The nature of the nightmare varies: stairs become slides into pits of razors, the sun has your father's face, doors seal shut or open onto indescribable vistas. Waking the Child (through damage or anything else that would wake a sleeper) ends their dream's impingement on our reality.</p>" },

  { name: "Chimera", types: ["biological", "synthetic"], level: 6, hp: 24, av: 15, moraleBonus: 8, enc: "d3",
    atk: "Fire Breath (d12, Flaming, Blast) + Goat Horns (d10) + Snake Spit (d8 TOX)",
    abilities: [
      {"name":"Fire Breath","ranged":true,"carried":false,"text":"Fire Breath (d12, Flaming, Blast)","effects":[{"kind":"damage","dice":"1d12","damageType":"blast"}],"damageTypes":["blast","flaming"]},
      {"name":"Goat Horns","carried":false,"text":"Goat Horns (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Snake Spit","ranged":true,"carried":false,"text":"Snake Spit (d8 TOX)","effects":[{"kind":"damage","dice":"1d8","damageType":"tox"}],"damageTypes":["tox"]},
    ],
    routines: [[0,1,2]],
    bio: "<p>Monstrous hybrids, birthed from a marriage of cybernetics and sorcerous gene-sculpting. The Chimera is a combination of three animals. Traditionally, the bodies of a lion, a goat, and a snake were used, but sometimes other animals were substituted instead. Trained Chimera were utilised as weapons of war during the fallen Autarchy, implanted with flamethrowers and other devices.</p>" },

  { name: "Chromavore", types: ["outsider"], level: 6, hp: 24, av: 11, moraleBonus: 15, enc: "1",
    atk: "Envelop (d8 CON damage)",
    abilities: [
      {"name":"Envelop","carried":false,"text":"Envelop (d8 CON damage)","effects":[{"kind":"abilityDamage","ability":"con","dice":"1d8"}]},
    ],
    rules: [
      {"name":"Incorporeal","text":"Takes no damage from conventional weapons. Takes d10 damage per round if exposed to sunlight or any light mimicking the sun's rays.","perRound":true,"hpTick":{"dice":"1d10"}},
    ],
    bio: "<p>Living shrouds of impossible colour from a dimension adjacent to ours. Latch onto victims and drain them of energy and colour, leaving pale husks behind.</p><p><b>Incorporeal:</b> Takes no damage from conventional weapons. Takes d10 damage per round if exposed to sunlight or any light mimicking the sun's rays.</p>" },

  { name: "Chrome-Feathered Sailback", types: ["biological", "synthetic"], level: 10, hp: 40, av: 18, moraleBonus: 10, enc: "1",
    atk: "Heavy Laser Cannon (d12 beam)",
    abilities: [
      {"name":"Heavy Laser Cannon","ranged":true,"carried":false,"text":"Heavy Laser Cannon (d12 beam)","effects":[{"kind":"damage","dice":"1d12","damageType":"beam"}],"damageTypes":["beam"]},
    ],
    bio: "<p>Graceful sky-serpents, which warm their cold-blooded bodies with rows of solar panels. These vast creatures do not notice travellers on foot but viciously attack vehicles and flying machines without provocation, interpreting the glinting of sunlight on metal as a dominance challenge.</p>" },

  { name: "Chromepriest", types: ["synthetic"], level: 4, hp: 16, av: 14, moraleBonus: 4, enc: "d4",
    atk: "Arc-Thrower (d10, electrical) / Prism Grenade (2d6, blast, beam)",
    abilities: [
      {"name":"Arc-Thrower","ranged":true,"carried":true,"text":"Arc-Thrower (d10, electrical)","effects":[{"kind":"damage","dice":"1d10","damageType":"electrical"}],"damageTypes":["electrical"]},
      {"name":"Prism Grenade","ranged":true,"carried":true,"text":"Prism Grenade (2d6, blast, beam)","effects":[{"kind":"damage","dice":"2d6","damageType":"beam"}],"damageTypes":["beam","blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Argent Robes","text":"Chromepriests are immune to damage from beam weapons."},
    ],
    bio: "<p>Synthetic priests of the Machine Gods, resplendent in scaled robes of argent, the colour purer than white. Crystalline diadems encircle their ego-engine housing.</p><p><b>Argent Robes:</b> Chromepriests are immune to damage from beam weapons.</p>" },

  { name: "Cliff Ghul", types: ["biological"], level: 1, hp: 4, av: 13, moraleBonus: 1, enc: "d8",
    atk: "Festering Bite (d6 + d6 TOX)",
    abilities: [
      {"name":"Festering Bite","carried":false,"text":"Festering Bite (d6 + d6 TOX)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"damage","dice":"1d6","damageType":"tox"}],"damageTypes":["tox"]},
    ],
    bio: "<p>Hideous hybrids of human, bat, and jackal, known for the guttural ugliness of their cries, the gusto with which they will devour anything alive or dead, and the rancid foulness of their stink. Their needle-thin teeth are so riddled with disease that Cliff Ghuls are known to bite their prey just once and withdraw into the sky, waiting for their victim to succumb to the infection.</p>" },

  { name: "Copy Cat", types: ["biological"], level: 2, hp: 8, av: 13, moraleBonus: 3, enc: "d6",
    atk: "Claws (d8) / Clone Cough (Special, once per combat)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Clone Cough","text":"Clone Cough (Special, once per combat)","effects":[{"kind":"special","rule":"Clone Cough"}],"frequency":"once per combat"},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Clone Cough","text":"The Copy Cat coughs up two perfect copies of itself, with full HP.","spawnNow":{"creature":"Copy Cat","dice":"2"}},
    ],
    bio: "<p>Pink-furred carnivore that reproduces exponentially, coughing up copies like hairballs. Used as a biological weapon in a long-lost era.</p><p><b>Clone Cough:</b> The Copy Cat coughs up two perfect copies of itself, with full HP.</p>" },

  { name: "Creedspeaker", types: ["synthetic"], level: 8, hp: 32, av: 12, moraleBonus: 9, enc: "1 + Enthralled Synths (generate p.xx)",
    atk: "Claws (2d8) / Titancreed Command (Special)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (2d8)","effects":[{"kind":"damage","dice":"2d8"}]},
      {"name":"Titancreed Command","text":"Titancreed Command (Special)","effects":[{"kind":"special","rule":"Command"},{"kind":"save","ability":"ego","mode":"resist","vs":"Enthralled (synthetic targets)","targets":["synthetic"]}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Command","text":"Targeted synthetic creatures must EGO Save or become enthralled by the Creedspeaker, following their commands until the Creedspeaker is killed."},
    ],
    bio: "<p>Titancreed was the language of the Titan AIs, a tongue that died along with its creators. Creedspeakers are foolish scholar-synths that have memorised a short snippet of Titancreed, enough to command their fellow synthetic beings and slowly erode their own ego-engine.</p><p><b>Command:</b> Targeted synthetic creatures must EGO Save or become enthralled by the Creedspeaker, following their commands until the Creedspeaker is killed.</p>" },

  { name: "Daggertrunk", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 0, enc: "1",
    atk: "Siphon (d4 STR damage)",
    abilities: [
      {"name":"Siphon","carried":false,"text":"Siphon (d4 STR damage)","effects":[{"kind":"abilityDamage","ability":"str","dice":"1d4"}]},
    ],
    bio: "<p>Dwarf vampire elephants. It is unclear if these pests were gene-sculpted for a purpose or simply as a jest, but they escaped into the wild and have become a viable species. Roughly the size of a goat, they feed on blood which their razor-tipped trunks drain from sleeping animals and the folk of Vaarn alike. Daggertrunks are very intelligent, surprisingly stealthy, and very cowardly.</p>" },

  { name: "Deathblight Husk", types: ["fungal", "outsider"], level: 3, hp: 12, av: 12, moraleBonus: 3, enc: "d6",
    atk: "Accursed Knife (d4 + Deathblight)",
    abilities: [
      {"name":"Accursed Knife","carried":true,"text":"Accursed Knife (d4 + Deathblight)","effects":[{"kind":"damage","dice":"1d4"},{"kind":"rider","name":"Deathblight"}],"woundOnDamage":"deathblight"},
    ],
    rules: [
      {"name":"Deathblight","text":"Targets afflicted mark an item slot with Deathblight. Each slot of Deathblight doubles damage taken and halves healing received. It fades at the rate of one slot a day.", declaredSpan: null },
    ],
    bio: "<p>Remnants of science-mystics who once aimed to weaponise Deathblight but only fell victim to it.</p><p><b>Deathblight:</b> Targets afflicted mark an item slot with Deathblight. Each slot of Deathblight doubles damage taken and halves healing received. It fades at the rate of one slot a day.</p>" },

  { name: "Desiccator", moraleMode: "never", types: ["biological"], level: 3, hp: 12, av: 12, moraleBonus: 0, moraleNote: "Never Flees", enc: "d3",
    atk: "Desiccate (Special)",
    abilities: [
      {"name":"Desiccate","carried":false,"rollsToHit":true,"text":"Desiccate (Special)","effects":[{"kind":"hitProgression","key":"desiccate","label":"Desiccated","targets":["biological"],"stages":[{"deprived":true,"text":"due to thirst"},{"abilityDamage":{"ability":"con","dice":"1d6"},"text":"the water in their organs is extracted."},{"lethal":true}]},{"kind":"takesRation","ration":"water"}]},
    ],
    rules: [
      {"name":"Desiccate","text":"A biological target loses the water in their body. After one hit, they are Deprived due to thirst. After two hits, they lose d6 CON as the water in their organs is extracted. A third hit is lethal. Additionally, the Desiccator drinks one ration of water from target's inventory per hit."},
      {"name":"Slow","text":"Always loses initiative and cannot surprise.","ambush":"cannot"},
    ],
    bio: "<p>Slow-moving fibrous colony organism, resembling a tangle of hairy glass ropes. Assails living beings with a multitude of tiny needles and extracts their water with merciless efficiency.</p><p><b>Desiccate:</b> A biological target loses the water in their body. After one hit, they are Deprived due to thirst. After two hits, they lose d6 CON as the water in their organs is extracted. A third hit is lethal. Additionally, the Desiccator drinks one ration of water from target's inventory per hit.</p><p><b>Slow:</b> Always loses initiative and cannot surprise.</p>" },

  { name: "Doomsinger", types: ["biological", "psychic"], level: 2, hp: 8, av: 11, moraleBonus: 3, enc: "d4",
    atk: "Deathtouch (d4 STR damage) / Doom Song (Special)",
    abilities: [
      {"name":"Deathtouch","carried":false,"text":"Deathtouch (d4 STR damage)","effects":[{"kind":"abilityDamage","ability":"str","dice":"1d4"}]},
      {"name":"Doom Song","text":"Doom Song (Special)","effects":[{"kind":"special","rule":"Doom Song"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Doom Song","text":"Within earshot, all creatures are Deprived. Saves and to-hit rolls made with DIS.","encounterEffect":{"conditions":["Deprived","disSavesAndAttacks"],"text":"Within earshot of the Doom Song: Deprived, and every Save and to-hit roll is made with DIS."}},
    ],
    bio: "<p>Heralds of the End. Nihilist mystics seeking to hasten the black terminus of all living things. Their ghastly dirges are amplified by vocoders installed in their deaths-head masks.</p><p><b>Doom Song:</b> Within earshot, all creatures are Deprived. Saves and to-hit rolls made with DIS.</p>" },

  { name: "Doppelgeller", types: ["biological"], level: 5, hp: 20, av: 10, moraleBonus: 12, enc: "1",
    atk: "Clone Spawn (Special)",
    abilities: [
      {"name":"Clone Spawn","text":"Clone Spawn (Special)","effects":[{"kind":"special","rule":"Clone Spawn"}]},
    ],
    rules: [
      {"name":"Clone Spawn","text":"Spawns jelly-clones of the PCs once per round. The clones are naked, insane, and homicidally attack the PC they were copied from. They have 5 HP, AV 10, and the Abilities of the cloned PC.","perRound":true},
    ],
    bio: "<p>Biotech blob. Spawns jelly-clones of the PCs once per round. The clones are naked, insane, and homicidally attack the PC they were copied from. They have 5 HP, AV 10, and the Abilities of the cloned PC.</p>" },

  { name: "Drill Drone", types: ["synthetic"], level: 3, hp: 12, av: 16, moraleBonus: 3, enc: "d6",
    atk: "Drill (d6, target's armour loses -1 AV)",
    abilities: [
      {"name":"Drill","carried":false,"text":"Drill (d6, target's armour loses -1 AV)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"avChange","amount":-1}]},
    ],
    rules: [
      {"name":"Miner","text":"Drill Drones have ADV when attacking mineral creatures.","advantageVs":["mineral"]},
    ],
    bio: "<p>Tripedal synths with bright yellow exoskeletons. Usually found underground, boring long and meandering tunnels for their own amusement. Their diamond-tipped drills quickly ruin armour.</p><p><b>Miner:</b> Drill Drones have ADV when attacking mineral creatures.</p>" },

  { name: "Echopraxist", moraleMode: "gm", types: ["outsider"], level: 0, note: "Stats are fully variable by design (book gives \"?\" for every field) — an Echopraxist copies a chosen PC's Level/HP/AV/equipment on the spot. Set these fields manually to match whichever PC it's mimicking each time it's used.", enc: "d4",
    atk: "(mimics the chosen PC's own attacks, see note)",
    abilities: [
      {"name":"(mimics the chosen PC's own attacks, see note)","text":"(mimics the chosen PC's own attacks, see note)","effects":[{"kind":"special","rule":"Living Echo"}]},
    ],
    rules: [
      {"name":"Living Echo","text":"When encountered, each Echopraxist chooses one PC to perfectly mimic. They take on the appearance of the PC, as well as their Level, current HP, AV, and all other weapons and equipment. Damaging an Echopraxist causes equal damage to the PC they are echoing."},
    ],
    bio: "<p>Peculiar extradimensional visitors, attempting to understand the world they have entered by mimicking its inhabitants. In their 'true' form, Echopraxists resemble iridescent fog, but they are able to take the shape of any living creature that catches their attention.</p><p><b>Living Echo:</b> When encountered, each Echopraxist chooses one PC to perfectly mimic. They take on the appearance of the PC, as well as their Level, current HP, AV, and all other weapons and equipment. Damaging an Echopraxist causes equal damage to the PC they are echoing.</p>" },

  { name: "Entropy Wight", types: ["hypergeometric", "outsider"], level: 5, hp: 20, av: 12, moraleBonus: 10, enc: "1",
    atk: "Entropic Touch (d3 max HP reduction + AV damage)",
    abilities: [
      {"name":"Entropic Touch","carried":false,"rollsToHit":true,"text":"Entropic Touch (d3 max HP reduction + AV damage)","effects":[{"kind":"maxHP","dice":"1d3","permanent":true},{"kind":"rider","name":"AV damage"}]},
    ],
    rules: [
      {"name":"Entropic Touch","text":"Targets struck by the Wight lose d3 maximum HP and d3 points of AV. Hit points lost in this way are never regained, nor can armour eroded by the Wight ever be repaired. Melee weapons striking the Wight lose one die size of damage permanently."},
    ],
    bio: "<p>Cursed revenants, the remains of those who thought to master entropy and instead became her servants. All things wither at their touch, ageing centuries beneath the Wight's sour grasp.</p><p><b>Entropic Touch:</b> Targets struck by the Wight lose d3 maximum HP and d3 points of AV. Hit points lost in this way are never regained, nor can armour eroded by the Wight ever be repaired. Melee weapons striking the Wight lose one die size of damage permanently.</p>" },

  { name: "Exemplar", moraleMode: "gm", types: ["synthetic"], level: 20, hp: 80, av: 20, moraleBonus: 0, moraleNote: "Retreats at the right time", enc: "1",
    atk: "Perfect Strike (d20, always hits)",
    abilities: [
      {"name":"Perfect Strike","carried":false,"text":"Perfect Strike (d20, always hits)","effects":[{"kind":"damage","dice":"1d20"}],"autoHit":true},
      {"name":"Beauty is Terror (1 EGO)","text":"PCs lose 1 point of EGO for each combat round spent in an unveiled Exemplar's presence.","effects":[{"kind":"abilityDamage","ability":"ego","flat":1,"perRound":true}],"autoHit":true},
      {"name":"Beauty is Terror (own species, 2 EGO)","text":"If the Exemplar is modelled after their own species, the loss is doubled: 2 EGO for each combat round in its presence.","effects":[{"kind":"abilityDamage","ability":"ego","flat":2,"perRound":true}],"autoHit":true},
    ],
    rules: [
      {"name":"Nonviolent","text":"Exemplars only strike in self-defence, after repeated attempts to negotiate."},
      {"name":"Beauty is Terror","text":"PCs lose 1 point of EGO for each combat round spent in an unveiled Exemplar's presence. If the Exemplar is modelled after their own species, this loss is doubled.","perRound":true},
    ],
    bio: "<p>Exemplar are the impeccable children of the Titans, synthetic simulacra of living creatures constructed with such faultless panache that they outshine the originals. The presence of a Feline Exemplar makes all true cats appear to be shoddy, hurried copies. Those unfortunates who have looked upon an Olive Tree Exemplar feel the nostalgia-gilded olive groves they recall running through as a child were ugly shrubs, the memory growing hollow and ashen by comparison. Human Exemplar are fearsome eidolons who appear to have been wrest fully formed from the divine Empyrean realm, that kingdom of fuel-less flame. To witness an Exemplar is to look upon aesthetic and moral perfection and find oneself lacking.</p><p>For this reason, the Exemplar are hated and reviled everywhere they are found, destroyed ruthlessly by all cultures across Vaarn. Those that remain dwell in abandoned places, shunned by living things. Most surviving Exemplar now take pains to veil or otherwise conceal their bodies. Beauty is terror, and true perfection a curse.</p><p><b>Nonviolent:</b> Exemplars only strike in self-defence, after repeated attempts to negotiate.</p><p><b>Beauty is Terror:</b> PCs lose 1 point of EGO for each combat round spent in an unveiled Exemplar's presence. If the Exemplar is modelled after their own species, this loss is doubled.</p>" },

  { name: "Extradimensional Mystic Hunter", types: ["outsider", "psychic"], level: 8, levelNote: "book gives \"8+d8\" — built at 8; use Roll for Level", hp: 32, av: 12, note: "The book gives LVL 8+d8, AV 12+d8 and ML +d10, and no HP. Built at the fixed part of each; use Roll for Level, Roll for AV and Roll for Morale. HP is 4 per Level.", moraleBonus: 0, rolled: { level: { base: 8, dice: "1d8" }, av: { base: 12, dice: "1d8" }, morale: { base: 0, dice: "1d10" } }, enc: "1",
    atk: "Exotic Weapon (always extradimensional) + Mystic Gift / Psychic Feedback (damage = target's Gleam)",
    abilities: [
      {"name":"Exotic Weapon","text":"Exotic Weapon (always extradimensional)","effects":[{"kind":"special","see":"Exotic Weapons"}]},
      {"name":"Mystic Gift","text":"Mystic Gift","effects":[{"kind":"special","see":"Mystic Gifts"}]},
      {"name":"Psychic Feedback","ranged":true,"carried":false,"text":"Psychic Feedback (damage = target's Gleam)","effects":[{"kind":"damage","dice":"@target.gleam"}],"damageLabel":"= the target's Gleam","derived":"Target's Gleam"},
    ],
    routines: [[0,1],[2]],
    rules: [
      {"name":"Gleam Seeker","text":"The Hunter senses the presence of Gifted PCs, even at enormous distances. It seeks them out relentlessly and attacks through walls or floors. It cannot be blinded."},
      {"name":"Psychic Mirror","text":"The Hunter is immune to damage or adverse effects caused by Mystic Gifts or Hypergeometry, which rebound on the user."},
    ],
    bio: "<p>An esoteric huntsman from an unimaginable dimension adjacent to our own. With sight older than sight, it seeks out Psychic Gleam, desiring to break open the skulls of Vaarn's mystics and subsume their power.</p><p><b>Gleam Seeker:</b> The Hunter senses the presence of Gifted PCs, even at enormous distances. It seeks them out relentlessly and attacks through walls or floors. It cannot be blinded.</p><p><b>Psychic Mirror:</b> The Hunter is immune to damage or adverse effects caused by Mystic Gifts or Hypergeometry, which rebound on the user.</p>" },

  { name: "Eyeless Dog", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 3, enc: "2d6",
    atk: "Bite (d6)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    rules: [
      {"name":"Pack Attack","text":"Gain +1 to hit and damage for every other Dog that has attacked target this round."},
    ],
    bio: "<p>Cacogenic hounds, typically dark-coated, with lighter hairless flesh where their ancestor's eyes once resided. They lost their bond with humanity along with their eyes and use their acute hearing and sense of smell to hunt the unwary on moonless nights.</p><p><b>Pack Attack:</b> Gain +1 to hit and damage for every other Dog that has attacked target this round.</p>" },

  { name: "Faa Nomad", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 4, enc: "d10",
    atk: "Faa Rifle (d8) / Curved Blade (d6)",
    abilities: [
      {"name":"Faa Rifle","ranged":true,"carried":true,"text":"Faa Rifle (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Curved Blade","carried":true,"text":"Curved Blade (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Ambush","text":"When encountered in the desert, hostile Faa always strike from ambush.","ambush":"prompt"},
    ],
    bio: "<p>The travelling folk of the blue desert. Expert trackers, skilled at ambush and escapes. Parties who wrong the Faa will be subject to pursuit, night-time sabotage, hit-and-run attacks, and every other inconvenience imaginable. A group of eight or more includes a Level 2 leader.</p><p><b>Ambush:</b> When encountered in the desert, hostile Faa always strike from ambush.</p>" },

  { name: "Faa Sniper", types: ["biological"], level: 3, hp: 12, av: 12, moraleBonus: 6, enc: "1",
    atk: "Headshot (Special) / Curved Blade (d6)",
    abilities: [
      {"name":"Headshot","text":"Headshot (Special)","effects":[{"kind":"special","rule":"Headshot"}]},
      {"name":"Curved Blade","carried":true,"text":"Curved Blade (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Headshot","text":"At the start of each combat round before initiative is determined, the Sniper picks one foe in line of sight for elimination. If the Sniper still has line of sight on the target at the end of the combat round, they are shot and reduced to 0 HP, with no Save possible. If the PC targeted has negative HP, this attack is fatal. Creatures without heads suffer d10 damage.","perRound":true},
      {"name":"Hidden","text":"Snipers blend into the environment and cannot be targeted if they do not move. When they fire, the target can make an INT Save to pinpoint their location."},
    ],
    bio: "<p>Faa are adept at ranged combat, training from childhood with their firearms. Those who show abnormal talent are inducted into the use of the sniper rifle, acting as support for Faa raids.</p><p><b>Headshot:</b> At the start of each combat round before initiative is determined, the Sniper picks one foe in line of sight for elimination. If the Sniper still has line of sight on the target at the end of the combat round, they are shot and reduced to 0 HP, with no Save possible. If the PC targeted has negative HP, this attack is fatal. Creatures without heads suffer d10 damage.</p><p><b>Hidden:</b> Snipers blend into the environment and cannot be targeted if they do not move. When they fire, the target can make an INT Save to pinpoint their location.</p>" },

  { name: "Face Dancer", types: ["biological"], level: 5, hp: 20, av: 13, moraleBonus: 4, enc: "d3",
    atk: "Poison Spur (d8 TOX) + Silenced Pistol (d6)",
    abilities: [
      {"name":"Poison Spur","carried":false,"text":"Poison Spur (d8 TOX)","effects":[{"kind":"damage","dice":"1d8","damageType":"tox"}],"damageTypes":["tox"]},
      {"name":"Silenced Pistol","ranged":true,"carried":true,"text":"Silenced Pistol (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Disguise","text":"Face Dancers can replicate the face and body of adult true-kin within hours of studying one. Cacogen and newbeasts are more difficult, although a passable mimicry can be achieved using prosthetics."},
      {"name":"Malleable","text":"The Dancer's skeleton is incredibly flexible. They take half damage from bludgeoning attacks and can fit through any gap wider than their skull."},
    ],
    bio: "<p>Face Dancers once served the Autarch as spies. They are cacogenic abhumans, notable for the extreme plasticity of their skeletal systems and their conscious control over skin tone and hair colour. In the space of hours, they can totally alter their facial features, height, and gait. With an aptitude for vocal mimicry and theatrical tricks, Face Dancers are able to imitate any human being they have observed for long enough.</p><p><b>Disguise:</b> Face Dancers can replicate the face and body of adult true-kin within hours of studying one. Cacogen and newbeasts are more difficult, although a passable mimicry can be achieved using prosthetics.</p><p><b>Malleable:</b> The Dancer's skeleton is incredibly flexible. They take half damage from bludgeoning attacks and can fit through any gap wider than their skull.</p>" },

  { name: "Faminebearer", types: ["hypergeometric", "outsider"], level: 7, hp: 28, av: 14, moraleBonus: 5, enc: "d4",
    atk: "Famishing Claws (Special) / Devour (STR Save vs Devoured)",
    abilities: [
      {"name":"Famishing Claws","carried":false,"rollsToHit":true,"text":"Famishing Claws (Special)","effects":[{"kind":"special","rule":"Famishing Claws"},{"kind":"save","ability":"ego","mode":"resist","vs":"hunger","onFail":{"eatsRation":"food","otherwise":"they attack the nearest edible being, dealing d8 damage with their teeth"}}]},
      {"name":"Devour","text":"Devour (STR Save vs Devoured)","effects":[{"kind":"save","ability":"str","mode":"resist","vs":"Devoured"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Famishing Claws","text":"PCs hit by the Faminebearer's claws become Deprived due to hunger. They must EGO Save or spend the next combat round eating a ration. If they cannot eat a ration, they attack the nearest edible being, dealing d8 damage with their teeth."},
      {"name":"Devour","text":"The Faminebearer swallows the target whole. While inside the creature's stomach, the target takes 2d6 damage per round.","perRound":true,"hpTick":{"dice":"2d6","to":"targets"}},
    ],
    bio: "<p>Towering wraiths, with blank eyeless faces and flesh the colour of burned wood. Their hands are black hooks, their voices wool-choked screams. Blind avatars of an infectious hunger, they unfurl their skin to reveal a hypergeometric mouth of infinite depth.</p><p><b>Famishing Claws:</b> PCs hit by the Faminebearer's claws become Deprived due to hunger. They must EGO Save or spend the next combat round eating a ration. If they cannot eat a ration, they attack the nearest edible being, dealing d8 damage with their teeth.</p><p><b>Devour:</b> The Faminebearer swallows the target whole. While inside the creature's stomach, the target takes 2d6 damage per round.</p>" },

  { name: "Feastbeast", types: ["biological"], level: 2, hp: 8, av: 10, moraleBonus: 0, enc: "d12",
    atk: "Trample (d6)",
    abilities: [
      {"name":"Trample","carried":false,"text":"Trample (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    rules: [
      {"name":"Organ Donor","text":"Feastbeasts have spare internal organs, all of which can be transplanted into a human. True-kin always accept the transplant, but cacogen must roll 1d6 for each mutation. If any die shows a 1, the transplant is rejected."},
    ],
    bio: "<p>Placid, genesculpted herd animals. Somewhat like a pig and somewhat like a cow, with a hint of human in their eyes and ears.</p><p><b>Organ Donor:</b> Feastbeasts have spare internal organs, all of which can be transplanted into a human. True-kin always accept the transplant, but cacogen must roll 1d6 for each mutation. If any die shows a 1, the transplant is rejected.</p>" },

  { name: "Fissile Glittersludge", types: ["biological", "synthetic"], level: 10, hp: 40, av: 10, moraleBonus: 10, enc: "1",
    atk: "Engulf (d8, number of targets = Glittersludge's Lvl)",
    abilities: [
      {"name":"Engulf","carried":false,"text":"Engulf (d8, number of targets = Glittersludge's Lvl)","effects":[{"kind":"damage","dice":"1d8"}],"targetCount":"Glittersludge's Level"},
    ],
    rules: [
      {"name":"Adaptive Fissile Material","text":"When damaged, a Glittersludge births a new Glittersludge of half the parent's Level in response. The smaller Glittersludge is immune to the damage type that birthed it, as are all its descendants.","splitOnDamage":{"halfLevel":true,"immuneToCause":true}},
      {"name":"Gelationous","text":"Takes minimum damage from bludgeoning attacks. Can move through tiny gaps and cracks."},
    ],
    bio: "<p>A horrid cocktail of biotech enzymes and vicious, ravenous nanomachines. Resembles a quivering mass of black jelly, speckled with gold and silver flecks. Their flesh has a memory of sorts, adapting to perceived threats and moving to immunise itself against them.</p><p><b>Adaptive Fissile Material:</b> When damaged, a Glittersludge births a new Glittersludge of half the parent's Level in response. The smaller Glittersludge is immune to the damage type that birthed it, as are all its descendants.</p><p><b>Gelationous:</b> Takes minimum damage from bludgeoning attacks. Can move through tiny gaps and cracks.</p>" },

  { name: "Flabmonger", types: ["biological"], level: 2, hp: 8, av: 14, moraleBonus: 2, enc: "d6",
    atk: "Lipoinduction (Special)",
    abilities: [
      {"name":"Lipoinduction","carried":false,"rollsToHit":true,"woundOnHit":{"wound":"flab"},"text":"Lipoinduction (Special)","effects":[{"kind":"special","rule":"Lipoinduction"}]},
    ],
    rules: [
      {"name":"Lipoinduction","text":"Biological creatures bitten by a Flabmonger must fill one item slot with Flab. Filling more than ten slots with Flab is fatal. Flab is cured at the rate of one slot per week."},
    ],
    bio: "<p>Resembles a hairless anteater. Flabmonger bites trigger a bizarre overproduction of lipids, causing tumorous bags of malignant fat to sprout from the afflicted creature. Once their prey is too fat to move, the Flabmonger slowly begins to feed.</p><p><b>Lipoinduction:</b> Biological creatures bitten by a Flabmonger must fill one item slot with Flab. Filling more than ten slots with Flab is fatal. Flab is cured at the rate of one slot per week.</p>" },

  { name: "Fleshwarp", moraleMode: "gm", types: ["biological"], level: 0, levelNote: "book gives \"2d6*\" — built at 0; use Roll for Level. The Level then varies per the creature's own Limbs/Graft rules", hp: 0, av: 13, note: "The book gives no HP — 4 per Level, set by Roll for Level.", moraleBonus: 0, moraleNote: "= LVL (Roll for Level sets it; keep it at the current Level after that)", rolled: { level: { base: 0, dice: "2d6", setsMorale: true } }, enc: "1",
    atk: "Fist Flurry (LVL x d4) / Graft (STR Save vs Special)",
    abilities: [
      {"name":"Fist Flurry","carried":false,"text":"Fist Flurry (LVL x d4)","effects":[{"kind":"damage","dice":"(@lvl)d4"}],"scalesWithLevel":true,"damageLabel":"LVL x d4"},
      {"name":"Graft","text":"Graft (STR Save vs Special)","effects":[{"kind":"save","ability":"str","mode":"resist","vs":"Special","opposed":true,"onFail":{"wound":"graftedArm","graft":"Grafted Arm"}}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Limbs","text":"The Fleshwarp has a number of limbs equal to its Level (2d6)."},
      {"name":"Regeneration","text":"A Fleshwarp regenerates HP equal to its Level at the start of each round. Damage caused by fire or acid ignores this.","perRound":true,"hpTick":{"dice":"@lvl","heal":true}},
      {"name":"Graft","text":"If the target fails an opposed STR Save, the Fleshwarp attaches one of its limbs to the victim's torso. The Fleshwarp's Level and number of limbs are lowered by -1 (if this would reduce the Level below 1, the Fleshwarp dies). The victim fills an item slot with a Wound: Grafted Arm. The Grafted Arm is Level 1 and has the AV of its host. It makes an unarmed attack each round (d4) targeted at anyone near its host. Damage dealt to the Grafted Arm is shared between the host and the limb.","perRound":true},
    ],
    bio: "<p>A cacogenic abhuman, consisting of an atrophied, vestigal torso and a multitude of questing limbs. Fleshwarps are blessed with rapid cellular regeneration and can heal mortal wounds within minutes. As they grow, more and more biomass is extruded into their limbs, creating skittering and spiderlike abominations.</p><p><b>Limbs:</b> The Fleshwarp has a number of limbs equal to its Level (2d6).</p><p><b>Regeneration:</b> A Fleshwarp regenerates HP equal to its Level at the start of each round. Damage caused by fire or acid ignores this.</p><p><b>Graft:</b> If the target fails an opposed STR Save, the Fleshwarp attaches one of its limbs to the victim's torso. The Fleshwarp's Level and number of limbs are lowered by -1 (if this would reduce the Level below 1, the Fleshwarp dies). The victim fills an item slot with a Wound: Grafted Arm. The Grafted Arm is Level 1 and has the AV of its host. It makes an unarmed attack each round (d4) targeted at anyone near its host. Damage dealt to the Grafted Arm is shared between the host and the limb.</p>" },

  // NOT A BESTIARY-CHAPTER CREATURE, on the Usurper Arm precedent (RULED
  // 2026-09-26, Matt). The stat line is the book's own, printed inside the
  // Fleshwarp's Graft rather than in a chapter of its own: "The Grafted Arm is
  // Level 1 and has the AV of its host. It makes an unarmed attack each round
  // (d4) targeted at anyone near its host." CODE-ONLY: no vault file backs it,
  // and vault-drift.mjs reports it in that column by design.
  //
  // Biological, the Fleshwarp's type (ruled). HP is Level x 4. The AV here is a
  // placeholder: actor.js reads the host's AV live once grafted-arm.js has
  // recorded the host. Morale is not printed; it cannot flee its host, so it
  // never flees, as the Usurper Arm.
  { name: "Grafted Arm", moraleMode: "never", types: ["biological"], level: 1, hp: 4, av: 10, moraleBonus: 0, moraleNote: "Never Flees - it is grafted to its host", enc: "1",
    atk: "Unarmed Attack (d4)",
    abilities: [
      {"name":"Unarmed Attack","carried":false,"text":"Unarmed Attack (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    rules: [
      {"name":"Grafted to the Host","text":"Has the AV of its host, and attacks anyone near its host each round. Damage dealt to the Grafted Arm is shared between the host and the limb.","graftedToHost":true},
    ],
    bio: "<p>A questing limb a Fleshwarp has grafted onto a victim's torso. It lashes out at anyone who comes near its host.</p><p><b>Grafted to the Host:</b> Has the AV of its host, and attacks anyone near its host each round. Damage dealt to the Grafted Arm is shared between the host and the limb.</p>" },

  { name: "Fool's Pool", types: ["biological"], level: 0, levelNote: "book gives \"d6*\" — built at 0; use Roll for Level", hp: 0, note: "The book gives no HP — 4 per Level, set by Roll for Level.", av: 10, moraleBonus: 10, rolled: { level: { base: 0, dice: "1d6" } }, enc: "1",
    atk: "Engulf (d6 ongoing, STR Save to break free, targets = Pool's Level)",
    abilities: [
      {"name":"Engulf","carried":false,"text":"Engulf (d6 ongoing, STR Save to break free, targets = Pool's Level)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"save","ability":"str","mode":"escape","escapeBy":"break free"}],"ongoing":true,"targetCount":"Pool's Level","hold":{"dice":"1d6","escape":{"ability":"str","by":"break free"}}},
    ],
    rules: [
      {"name":"Gelationous","text":"The Fool's Pool takes minimum damage from kinetic attacks. Thrown salt deals 2d8 damage per round.","perRound":true,"hpTick":{"dice":"2d8"}},
      {"name":"Ambush","text":"The Fool's Pool always strikes from ambush.","ambush":"always"},
    ],
    bio: "<p>A huge amoeba resembling a pool of fresh water when in its camouflaged resting state. The Pool remains motionless until an incautious animal approaches to drink. Beware of shallow ponds that do not ripple in the wind.</p><p><b>Gelationous:</b> The Fool's Pool takes minimum damage from kinetic attacks. Thrown salt deals 2d8 damage per round.</p><p><b>Ambush:</b> The Fool's Pool always strikes from ambush.</p>" },

  { name: "Fractalisk", types: ["hypergeometric", "outsider"], level: 5, hp: 20, av: 14, moraleBonus: 8, enc: "1",
    atk: "Claws (d8, hypergeometric) + Recursive Gaze (Special)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d8, hypergeometric)","effects":[{"kind":"damage","dice":"1d8","damageType":"hypergeometric"}],"damageTypes":["hypergeometric"]},
      {"name":"Recursive Gaze","text":"Recursive Gaze (Special)","effects":[{"kind":"special","rule":"Recursive Gaze"}]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Recursive Gaze","text":"Any PC fixed with the Recursive Gaze must repeat the action they took the turn before, no Save allowed. This effect is broken if the gaze is interrupted or if the creature dies."},
      {"name":"Self Similar","text":"Damaging a Fractalisk without use of hypergeometric weaponry causes the creature to split into two identical Fractalisks, both possessing the same lowered HP total.","splitOnDamage":{"unlessTypes":["hypergeometric"]}},
    ],
    bio: "<p>An incursion from another fevered sphere of reality, a bizarre hypergeometric monster whose mere regard unwinds the warp and weft of space-time. The Fractalisk resembles a lizard from some angles, a blossoming flower from others, and at times, it can seem no more substantial than a fan of light reflected upon a wall. In all aspects however, the creature is virulently dangerous.</p><p><b>Recursive Gaze:</b> Any PC fixed with the Recursive Gaze must repeat the action they took the turn before, no Save allowed. This effect is broken if the gaze is interrupted or if the creature dies.</p><p><b>Self Similar:</b> Damaging a Fractalisk without use of hypergeometric weaponry causes the creature to split into two identical Fractalisks, both possessing the same lowered HP total.</p>" },

  { name: "Fungal Horror", types: ["fungal"], level: 4, hp: 16, av: 11, moraleBonus: 10, enc: "",
    note: "Bestiary.md's index calls this a \"stub — no source stat block\" but the file itself has a complete one — that index note is stale (flagged to fix separately).",
    atk: "Crush (d8) / Corrosive Spores (d4, -1 AV)",
    abilities: [
      {"name":"Crush","carried":false,"text":"Crush (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Corrosive Spores","ranged":true,"carried":false,"text":"Corrosive Spores (d4, -1 AV)","effects":[{"kind":"damage","dice":"1d4"},{"kind":"avChange","amount":-1}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Regeneration","text":"Regenerates 3 HP every round unless damaged by fire or acid.","perRound":true},
    ],
    bio: "<p>Fungal mass encasing An-Rah's skeleton. Regenerates 3 HP every round unless damaged by fire or acid.</p>" },

  { name: "Gene Thief", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 3, enc: "d8",
    atk: "Copy-Claws (d6 + Special)",
    abilities: [
      {"name":"Copy-Claws","carried":false,"text":"Copy-Claws (d6 + Special)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"rider","name":"Special"}]},
    ],
    rules: [
      {"name":"Copy-Claws","text":"A Gene Thief steals a trait from any biological creature it wounds with its claws. This may be a Mystic Gift, a mutation, a disease, or any other trait. Their bodies remain scrawny, pink, and hunched."},
    ],
    bio: "<p>Skulking shunned descendants of the Autarch's feared Face Dancer spies. Paranoid cacogen whose malleable bodies take on the aspect of those they wound. They are only semi-intelligent and are no longer capable of convincingly impersonating those they mimic.</p><p><b>Copy-Claws:</b> A Gene Thief steals a trait from any biological creature it wounds with its claws. This may be a Mystic Gift, a mutation, a disease, or any other trait. Their bodies remain scrawny, pink, and hunched.</p>" },

  { name: "Ghoul", types: ["biological"], level: 3, hp: 12, av: 14, moraleBonus: 5, enc: "d8",
    atk: "Agonising Claws (d6 + CON Save vs Agony)",
    abilities: [
      {"name":"Agonising Claws","carried":false,"text":"Agonising Claws (d6 + CON Save vs Agony)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"save","ability":"con","mode":"resist","vs":"Agony","targets":["biological"],"inflicts":"Agony","hpTick":{"dice":"1d6","perCount":"combat action"},"endsBy":"lies still"}]},
    ],
    rules: [
      {"name":"Agony","text":"Biological characters inflicted with Agony take d6 damage for each combat action they make. Lying still neutralises the venom."},
    ],
    bio: "<p>On moonless nights, a certain breed of furtive autodidacts visits battlefields and plague pits and tombs. It is not about the taste. It never has been. It is about knowledge. Where some see a graveyard, others see a library.</p><p><b>Agony:</b> Biological characters inflicted with Agony take d6 damage for each combat action they make. Lying still neutralises the venom.</p>" },

  { name: "Giant Azure Scorpion", types: ["biological", "synthetic"], level: 3, hp: 12, av: 15, moraleBonus: 7, enc: "d4",
    atk: "2 x Claw (d10) + Laser Tail (d8 beam)",
    abilities: [
      {"name":"Claw","carried":false,"text":"2 x Claw (d10)","effects":[{"kind":"damage","dice":"1d10"}],"count":2},
      {"name":"Laser Tail","ranged":true,"carried":false,"text":"Laser Tail (d8 beam)","effects":[{"kind":"damage","dice":"1d8","damageType":"beam"}],"damageTypes":["beam"]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Ambush","text":"The Azure Scorpion always strikes from ambush if encountered on open sands.","ambush":"prompt"},
    ],
    bio: "<p>Cyborg arachnid. Lies in ambush beneath the blue sands. If their laser-cannon tails are severed, they can be used as d8 beam weapons.</p><p><b>Ambush:</b> The Azure Scorpion always strikes from ambush if encountered on open sands.</p>" },

  { name: "Gitchghast", types: ["biological", "mineral"], level: 1, hp: 4, av: 20, moraleBonus: 0, enc: "d6",
    atk: "Bite (d6 + CON Save vs Gitch)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d6 + CON Save vs Gitch)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"save","ability":"con","mode":"resist","vs":"the Gitch"}]},
    ],
    bio: "<p>Unfortunates who have succumbed to the Gitch and have lost their minds beneath the creeping weight of the crystals. Shunned by all living souls, they are expelled from their communities to wander the margins of the Urth.</p>" },

  { name: "Gladiator Synth", types: ["synthetic"], level: 6, hp: 24, av: 16, moraleBonus: 9, enc: "d3",
    atk: "Advanced Melee Weapon (Generate on encounter)",
    abilities: [
      {"name":"Advanced Melee Weapon","text":"Advanced Melee Weapon (Generate on encounter)","effects":[{"kind":"generateWeapon","tier":"Advanced","weaponKind":"melee"}]},
    ],
    rules: [
      {"name":"Pugilist's Shield","text":"The synth is protected by a forcefield negating all ranged attacks, allowing melee attacks only."},
      {"name":"Finish Him","text":"When the synth brings an opponent to 0 HP, it seizes them and begins a showy, glorious finishing blow. This takes one combat round to execute and kills the target at the end of that round. The finishing blow can be interrupted by damaging the Gladiator Synth, knocking them off balance, etc.", declaredSpan: null },
    ],
    bio: "<p>Gladiators cast from synthskin and plasteel, their bodies armoured with the chrome bones of the inferior models they defeated. Each wields a signature weapon. The arenas they fought in have long crumbled to dust, and they wander Vaarn in search of applause.</p><p><b>Pugilist's Shield:</b> The synth is protected by a forcefield negating all ranged attacks, allowing melee attacks only.</p><p><b>Finish Him:</b> When the synth brings an opponent to 0 HP, it seizes them and begins a showy, glorious finishing blow. This takes one combat round to execute and kills the target at the end of that round. The finishing blow can be interrupted by damaging the Gladiator Synth, knocking them off balance, etc.</p>" },

  { name: "Glass Centipede", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 5, enc: "1",
    atk: "Bite (d6 TOX)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d6 TOX)","effects":[{"kind":"damage","dice":"1d6","damageType":"tox"}],"damageTypes":["tox"]},
    ],
    rules: [
      {"name":"Ambusher","text":"Strikes from ambush, unless target passes a PSY Save.","ambush":"always"},
    ],
    bio: "<p>Four-foot centipede with translucent flesh.</p><p><b>Ambusher:</b> Strikes from ambush, unless target passes a PSY Save.</p>" },

  { name: "Glass Tiger", types: ["biological"], level: 4, hp: 16, av: 14, moraleBonus: 8, enc: "d4",
    atk: "2 x Claw (d6) + Maul (d10), if both claws hit same target",
    abilities: [
      {"name":"Claw","carried":false,"text":"2 x Claw (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":2},
      {"name":"Maul","carried":false,"text":"Maul (d10), if both claws hit same target","effects":[{"kind":"damage","dice":"1d10"}],"condition":"if both claws hit same target","followUp":{"after":"Claw"}},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Ambusher","text":"Glass Tigers automatically strike from Ambush if they are lying still when encountered.","ambush":"prompt"},
    ],
    bio: "<p>Translucent extrasolar predators, transported to Urth during the reign of the Autarchs. Body like a tiger with a head like an orchid.</p><p><b>Ambusher:</b> Glass Tigers automatically strike from Ambush if they are lying still when encountered.</p>" },

  { name: "Gorgon", types: ["biological"], level: 9, hp: 32, av: 16, moraleBonus: 12, enc: "1 + d10 Harem Members",
    atk: "Constrict (d10) + 2 x Venom Spit (d8 TOX) / Captivating Gaze (all foes EGO Save vs Beguiled)",
    abilities: [
      {"name":"Constrict","carried":false,"text":"Constrict (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Venom Spit","ranged":true,"carried":false,"text":"2 x Venom Spit (d8 TOX)","effects":[{"kind":"damage","dice":"1d8","damageType":"tox"}],"count":2,"damageTypes":["tox"]},
      {"name":"Captivating Gaze","text":"Captivating Gaze (all foes EGO Save vs Beguiled)","effects":[{"kind":"save","ability":"ego","mode":"resist","vs":"Beguiled"}],"scope":"All foes"},
    ],
    routines: [[0,1],[2]],
    rules: [
      {"name":"Beguiled","text":"Characters who have been Beguiled cannot harm the Gorgon, believing her to be the most beautiful creature they have ever seen. They may make an EGO Save each round to attempt to fight off this insidious devotion. While Beguiled, they grovel and compete with one another for the Gorgon's favour.","perRound":true},
      {"name":"Harem","text":"The Gorgon is accompanied by d10 personages of exceptional charm and beauty. These are her favoured suitors, who have been spared the Gorgon's appetites and make every attempt to please her. Stats as Bandits."},
    ],
    bio: "<p>A monstrous creature with the head of a ferociously beautiful woman and the body of a writhing mass of snakes. She is believed to be a pursuant of the Path Renewed, who sought eternal youth in the image of the Ouroboros, the world-serpent without end or beginning. She achieved her long-sought apotheosis at terrible cost, shedding her humanity like a discarded skin and living her eternal life as a voracious hybrid of odalisque and viper.</p><p><b>Beguiled:</b> Characters who have been Beguiled cannot harm the Gorgon, believing her to be the most beautiful creature they have ever seen. They may make an EGO Save each round to attempt to fight off this insidious devotion. While Beguiled, they grovel and compete with one another for the Gorgon's favour.</p><p><b>Harem:</b> The Gorgon is accompanied by d10 personages of exceptional charm and beauty. These are her favoured suitors, who have been spared the Gorgon's appetites and make every attempt to please her. Stats as Bandits.</p>" },

  { name: "Gravity Tyrant", types: ["outsider", "mineral"], level: 9, hp: 32, av: 15, moraleBonus: 10, enc: "1",
    atk: "Invert Weight (Special) / Weight of Worlds (Special)",
    abilities: [
      {"name":"Invert Weight","text":"Invert Weight (Special)","effects":[{"kind":"special","rule":"Invert Weight"}]},
      {"name":"Weight of Worlds","text":"Weight of Worlds (Special)","effects":[{"kind":"condition","inflicts":"Weight of Worlds","applied":{"weightOfWorlds":true},"endsWithSource":true}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Accretion","text":"Each round, all creatures must DEX Save or lose the item in their lowest inventory slot. Lost items are drawn into the Tyrant's orbit and crushed into their component parts. Each Accretion adds +1 to the Tyrant's AV.","perRound":true,"avStep":1,"effects":[{"kind":"save","ability":"dex","mode":"resist","vs":"losing the item in the lowest slot"}]},
      {"name":"Invert Weight","text":"The Tyrant inverts the weight of an opponent, sending them tumbling into the sky. This effect lasts until the Tyrant is killed. Allow 12 combat rounds before the character is considered lost forever in the sky. For each combat round a target spends falling skywards, the victim takes d10 damage if they fall to Urth.","perRound":true, declaredSpan: { amount: "12", unit: "round" } },
      {"name":"Weight of Worlds","text":"The Tyrant doubles the weight of an opponent and all gear they carry. The PC's maximum Item Slots are halved, and the slot size of each item is doubled. This effect lasts until the Tyrant is killed."},
    ],
    bio: "<p>An extra-dimensional being. A spiny kernel of sentient hyperdense matter, vaguely resembling a crowned head. Stones and other debris orbit the creature's obscured form.</p><p><b>Accretion:</b> Each round, all creatures must DEX Save or lose the item in their lowest inventory slot. Lost items are drawn into the Tyrant's orbit and crushed into their component parts. Each Accretion adds +1 to the Tyrant's AV.</p><p><b>Invert Weight:</b> The Tyrant inverts the weight of an opponent, sending them tumbling into the sky. This effect lasts until the Tyrant is killed. Allow 12 combat rounds before the character is considered lost forever in the sky. For each combat round a target spends falling skywards, the victim takes d10 damage if they fall to Urth.</p><p><b>Weight of Worlds:</b> The Tyrant doubles the weight of an opponent and all gear they carry. The PC's maximum Item Slots are halved, and the slot size of each item is doubled. This effect lasts until the Tyrant is killed.</p>" },

  { name: "Greenguard", types: ["synthetic"], level: 1, hp: 4, av: 13, moraleBonus: 5, enc: "d8",
    atk: "Rifle (d8)",
    abilities: [
      {"name":"Rifle","ranged":true,"carried":true,"text":"Rifle (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>Combat synths. Green plastic-fleshed homunculi. Attack from the wastes without warning, following ancient orders. They take and hold settlements at random, waiting for reinforcements that never arrive.</p>" },

  { name: "Grey Cricket", types: ["biological"], level: 2, hp: 8, av: 13, moraleBonus: 3, enc: "d8",
    atk: "Claws (d4) + Noxious Spit (CON Save vs vomiting)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Noxious Spit","text":"Noxious Spit (CON Save vs vomiting)","effects":[{"kind":"save","ability":"con","mode":"resist","vs":"vomiting","inflicts":"Vomiting","duration":{"amount":"1","unit":"round"}}]},
    ],
    rules: [
      {"name":"Vomiting","text":"Their spit forces a CON Save. Failure results in DIS on all Saves for one round due to vomiting.", declaredSpan: null },
    ],
    routines: [[0,1]],
    bio: "<p>Creepy and gangly giant insects. Normally scavengers, they will attack humans if they think they can get away with it. Their spit forces a CON Save. Failure results in DIS on all Saves for one round due to vomiting.</p>" },

  { name: "Grimpet", types: ["synthetic"], level: 1, hp: 4, av: 16, moraleBonus: 10, enc: "d10",
    atk: "Latch (STR Save vs Special)",
    abilities: [
      {"name":"Latch","text":"Latch (STR Save vs Special)","effects":[{"kind":"save","ability":"str","mode":"resist","vs":"Special","onFail":{"wound":"grimpet"}}]},
    ],
    rules: [
      {"name":"Latch","text":"Afflicted PCs must fill one item slot with a Wound: 'Grimpet'. The Grimpet will resist attempts to prise it off and requires surgical attention."},
    ],
    bio: "<p>Small, spider-like robots with a thick plasteel shell on their backs. Attempt to capture intruders by latching onto their bodies. Grimpets never pursue beyond the boundaries of the ruin they guard.</p><p><b>Latch:</b> Afflicted PCs must fill one item slot with a Wound: 'Grimpet'. The Grimpet will resist attempts to prise it off and requires surgical attention.</p>" },

  { name: "Grimweaver", types: ["synthetic"], level: 3, hp: 12, av: 16, moraleBonus: 10, enc: "d3 + d10 Grimpets",
    atk: "Bite (d8) / Web Shot (Entangled)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Web Shot","ranged":true,"carried":false,"rollsToHit":true,"text":"Web Shot (Entangled)","effects":[{"kind":"condition","condition":"entangled"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>A larger, more powerful cousin of the Grimpet, Grimweavers were created as sentinels for ancient sites. They spit a nanofibre web that ensnares even the strongest of creatures, immobilising an intruder and draining their strength. Grimweavers never pursue beyond the boundaries of the ruin they guard.</p>" },

  { name: "Guard Mummy", types: ["fungal"], level: 0, hp: 1, av: 14, moraleBonus: 0, enc: "",
    atk: "Autarchy Blade (d6)",
    abilities: [
      {"name":"Autarchy Blade","carried":true,"text":"Autarchy Blade (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    rules: [
      {"name":"Gestation","text":"If left alive, 1-in-6 chance per day of gestating into a Fungal Horror."},
    ],
    bio: "<p>Slow and witless. Moves slowly, like a sleepwalker. Drawn towards light and heat. Only attack to defend themselves. If left alive, 1-in-6 chance per day of gestating into a Fungal Horror.</p>" },

  { name: "Hagfluke", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 7, enc: "d6",
    atk: "Siphon (d6 + Special)",
    abilities: [
      {"name":"Siphon","carried":false,"text":"Siphon (d6 + Special)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"heal","targets":["biological"]},{"kind":"levelGain","targets":["biological"],"max":7}]},
    ],
    rules: [
      {"name":"Siphon","text":"With each successful attack on a biological target, the Hagfluke gains 1 Level (Max 7) and regains HP equal to the damage caused."},
    ],
    bio: "<p>Sinuous parasites with fanged crone faces.</p><p><b>Siphon:</b> With each successful attack on a biological target, the Hagfluke gains 1 Level (Max 7) and regains HP equal to the damage caused.</p>" },

  { name: "Harlequin Serpent", types: ["biological"], level: 3, hp: 12, av: 15, moraleBonus: 7, enc: "1",
    atk: "Bite (d8) / Venom Spray (CON Save vs Hysteria)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Venom Spray","text":"Venom Spray (CON Save vs Hysteria)","effects":[{"kind":"save","ability":"con","mode":"resist","vs":"Hysteria","inflicts":"Hysteria","duration":{"amount":"1d6","unit":"hour"}}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Hysteria","text":"A convulsive, laughter-like reaction to the serpent's neurotoxins. Afflicted creatures laugh for d6 hours, and they cannot speak until the venom wears off.", declaredSpan: null },
    ],
    bio: "<p>Large desert snakes, with colouration on their heads resembling makeup worn by sacred fools.</p><p><b>Hysteria:</b> A convulsive, laughter-like reaction to the serpent's neurotoxins. Afflicted creatures laugh for d6 hours, and they cannot speak until the venom wears off.</p>" },

  { name: "Hegemony Centurion", types: ["biological"], metalArmour: true, level: 5, hp: 20, av: 16, moraleBonus: 8, enc: "1 (+d8 Legionaries)",
    atk: "Rifle (d8) + Rapier (d8)",
    abilities: [
      {"name":"Rifle","ranged":true,"carried":true,"text":"Rifle (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Rapier","carried":true,"text":"Rapier (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    routines: [[0,1]],
    bio: "<p>The Hegemony's officer caste are famed for their extravagant facial hair, their gaudy epaulettes, and their contempt for weakness. Legionaries in presence of a Centurion use the Centurion's ML.</p>" },

  { name: "Hegemony Conscript", types: ["biological"], level: 1, hp: 4, av: 11, moraleBonus: 0, enc: "2d10 (+1 Ordinator)",
    atk: "Spear (d6)",
    abilities: [
      {"name":"Spear","carried":true,"text":"Spear (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    rules: [
      {"name":"Bomb Collar","text":"Conscripts who fail Morale Saves and flee within view of their Ordinator are detonated, dealing 2d6 blast damage to all in melee range. Conscripts without an Ordinator always surrender or flee.","moraleFail":{"dice":"2d6","damageTypes":["blast"]}},
    ],
    bio: "<p>The Hegemon's penal battalions are the only mercy the thief or forger can expect. These units are far from well-trained or equipped, but there is tactical value in every warm body. Minefields, vaults, and other hazardous environments are first explored by conscripts.</p><p><b>Bomb Collar:</b> Conscripts who fail Morale Saves and flee within view of their Ordinator are detonated, dealing 2d6 blast damage to all in melee range. Conscripts without an Ordinator always surrender or flee.</p>" },

  { name: "Hegemony Legionary", types: ["biological"], metalArmour: true, level: 2, hp: 8, av: 14, moraleBonus: 5, enc: "d8",
    atk: "Rifle (d8) / Grenade (d10 blast, DEX Save to throw back)",
    abilities: [
      {"name":"Rifle","ranged":true,"carried":true,"text":"Rifle (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Grenade","ranged":true,"carried":true,"text":"Grenade (d10 blast, DEX Save to throw back)","effects":[{"kind":"damage","dice":"1d10","damageType":"blast"},{"kind":"save","ability":"dex","mode":"escape","escapeBy":"throw back"}],"damageTypes":["blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Reinforcements","text":"If outnumbered, Legionaries fire a distress flare, summoning d8 Legionaries.","spawnNow":{"creature":"Hegemony Legionary","dice":"1d8"}},
    ],
    bio: "<p>Resourceful true-kin soldiers, clad in red armour. The backbone of the Hegemon's occupying forces in Vaarn.</p><p><b>Reinforcements:</b> If outnumbered, Legionaries fire a distress flare, summoning d8 Legionaries.</p>" },

  { name: "Hegemony Myrmidon", moraleMode: "never", types: ["biological"], metalArmour: true, level: 6, hp: 24, av: 19, moraleBonus: 0, moraleNote: "Special — never breaks or surrenders (Battle Trance)", enc: "d4",
    atk: "Scattergun (3d4 close, d4 far) / Concussion Grenade (blast, d4 DEX damage, DEX Save to throw back)",
    abilities: [
      {"name":"Scattergun","ranged":true,"carried":true,"text":"Scattergun (3d4 close, d4 far)","effects":[{"kind":"damage","dice":"3d4"},{"kind":"damage","dice":"1d4"}]},
      {"name":"Concussion Grenade","ranged":true,"carried":true,"text":"Concussion Grenade (blast, d4 DEX damage, DEX Save to throw back)","effects":[{"kind":"abilityDamage","ability":"dex","dice":"1d4"},{"kind":"save","ability":"dex","mode":"escape","escapeBy":"throw back"}],"damageTypes":["blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Battle Trance","text":"Myrmidons enter a hypnotic dream-state before an engagement, which renders their fear instinct obsolete. They never break in combat, nor do they surrender an inch of ground during their grinding assaults."},
    ],
    bio: "<p>Siegebreakers, shock troopers, the Hegemon's Hammer. Myrmidons are used against fortified positions or to contain heavily armed foes. A small, elite unit, recognisable by their black ferroplate armour and ritual facial scars.</p><p><b>Battle Trance:</b> Myrmidons enter a hypnotic dream-state before an engagement, which renders their fear instinct obsolete. They never break in combat, nor do they surrender an inch of ground during their grinding assaults.</p>" },

  { name: "Hegemony Ordinator", types: ["biological"], level: 2, hp: 8, av: 15, moraleBonus: 5, enc: "1 (with 2d10 Conscripts)",
    atk: "Sidearm (d6) / Biotic Grenade (blast, d8 heal on True-kin / d8 damage to other ancestries, DEX Save to throw back)",
    abilities: [
      {"name":"Sidearm","ranged":true,"carried":true,"text":"Sidearm (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Biotic Grenade","ranged":true,"carried":true,"text":"Biotic Grenade (blast, d8 heal on True-kin / d8 damage to other ancestries, DEX Save to throw back)","effects":[{"kind":"heal","dice":"1d8"},{"kind":"damage","dice":"1d8","damageType":"blast"},{"kind":"save","ability":"dex","mode":"escape","escapeBy":"throw back"}],"targeting":["True-kin","other ancestries"],"damageTypes":["blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Vitality Sensor","text":"Triggers an alert when the Ordinator perishes. In Hegemony-controlled territory, reinforcements converge on the dead Ordinator within d10 combat rounds. In deep desert or contested territory, the investigators arrive in d100 hours.", declaredSpan: { amount: "d100", unit: "hour" } },
    ],
    bio: "<p>The nervous system of the Hegemon's Legions. Ordinators are implanted with vitality sensors and a pseudoneural ganglion of long-range communication devices.</p><p><b>Vitality Sensor:</b> Triggers an alert when the Ordinator perishes. In Hegemony-controlled territory, reinforcements converge on the dead Ordinator within d10 combat rounds. In deep desert or contested territory, the investigators arrive in d100 hours.</p>" },

  { name: "Hegemony Ranger", types: ["biological"], level: 4, hp: 16, av: 15, moraleBonus: 8, enc: "d6",
    atk: "Boltcaster (d10) + Dagger (d6) / Smoke Grenade (blast, Blindness, DEX Save to throw back)",
    abilities: [
      {"name":"Boltcaster","ranged":true,"carried":true,"text":"Boltcaster (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Dagger","carried":true,"text":"Dagger (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Smoke Grenade","text":"Smoke Grenade (blast, Blindness, DEX Save to throw back)","effects":[{"kind":"save","ability":"dex","mode":"escape","escapeBy":"throw back"},{"kind":"condition","condition":"blind"}],"damageTypes":["blast"]},
    ],
    routines: [[0,1],[2]],
    rules: [
      {"name":"Skiff","text":"A squad has one Skiff for each Ranger."},
    ],
    bio: "<p>The vanguard of the Hegemon's Legions in Vaarn. They eschew the scarlet uniforms of their peers, instead dressing in the blue robes favoured by Faa nomads. Rangers are trained in desert survival and sandworm husbandry and speak the Faatongue fluently. They operate far from Hegemony bases, spending months in the desert.</p><p><b>Skiff:</b> A squad has one Skiff for each Ranger.</p><p><b>Blindness:</b> Characters blinded by smoke make melee attacks with DIS. They cannot use ranged weapons.</p>" },

  { name: "Hegemony Suppressor", types: ["biological"], metalArmour: true, level: 5, hp: 20, av: 18, moraleBonus: 8, enc: "1 (with d8 Legionaries + Centurion)",
    atk: "Suppression Rifle (d12 vs all exposed targets, one turn to spin up) / Acid Grenade (d4, acidic, blast, DEX Save to throw back)",
    abilities: [
      {"name":"Suppression Rifle","ranged":true,"carried":true,"text":"Suppression Rifle (d12 vs all exposed targets, one turn to spin up)","effects":[{"kind":"damage","dice":"1d12"}],"scope":"all exposed targets", declaredSpan: null },
      {"name":"Acid Grenade","ranged":true,"carried":true,"text":"Acid Grenade (d4, acidic, blast, DEX Save to throw back)","effects":[{"kind":"damage","dice":"1d4","damageType":"blast"},{"kind":"save","ability":"dex","mode":"escape","escapeBy":"throw back"}],"damageTypes":["blast","corrosive"]},
    ],
    routines: [[0],[1]],
    bio: "<p>The backbone of Legionary assaults. Suppressors stay in the rear of their unit, providing covering fire while their comrades advance or retreat.</p>" },

  { name: "Hiveyman", types: ["biological"], level: 3, hp: 12, av: 12, moraleBonus: 8, enc: "d6",
    atk: "Bludgeon (d8) + Swarm Damage (d6, auto-hit)",
    abilities: [
      {"name":"Bludgeon","carried":true,"text":"Bludgeon (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Swarm Damage","carried":false,"text":"Swarm Damage (d6, auto-hit)","effects":[{"kind":"damage","dice":"1d6"}],"autoHit":true},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Angry Bees","text":"The angry bees deal d6 unblockable damage per round to everyone in reach.","perRound":true},
    ],
    bio: "<p>Human corpses infested by fearsome colonies of Sable Bees. They crawl across the sands, their bellies swollen with a throbbing hive structure. The angry bees deal d6 unblockable damage per round to everyone in reach.</p>" },

  { name: "Hollow Maiden", types: ["hypergeometric"], level: 3, hp: 12, av: 13, moraleBonus: 9, enc: "d4",
    atk: "Claws (d8) / Grab (d6 CON damage, STR Save to break free)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Grab","carried":false,"text":"Grab (d6 CON damage, STR Save to break free)","effects":[{"kind":"abilityDamage","ability":"con","dice":"1d6"},{"kind":"save","ability":"str","mode":"escape","escapeBy":"break free"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Unreal Flesh","text":"Hollow Maidens ignore all even-numbered damage rolls."},
      {"name":"Rift","text":"Embrace grabbed victims and pull them into the hypergeometric rift in their bodies. While inside, the victim takes d6 CON damage per round as their body dissolves. Must make STR Save to pull themselves out.","perRound":true},
    ],
    bio: "<p>Spectral women in elegant attire, with wounds in their chests bleeding un-Urthly colours. Embrace grabbed victims and pull them into the hypergeometric rift in their bodies. While inside, the victim takes d6 CON damage per round as their body dissolves. Must make STR Save to pull themselves out.</p><p><b>Unreal Flesh:</b> Hollow Maidens ignore all even-numbered damage rolls.</p>" },

  { name: "Indigo Servitor", moraleMode: "none", types: ["biological"], level: 1, hp: 4, av: 11, moraleBonus: 0, moraleNote: "-", enc: "d8",
    atk: "Fists (d4)",
    abilities: [
      {"name":"Fists","carried":false,"text":"Fists (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>An indigo-robed corpse, reanimated by the necrotech implants of the College of Indigo Tigers. Obeys the wearer of a Dominion Ring without question. Mute, obedient, fearless.</p>" },

  { name: "Iridium Vulture", types: ["synthetic"], level: 2, hp: 8, av: 16, moraleBonus: 3, enc: "d6",
    atk: "Claws (d6) / Corpseshuck (takes one round, instant death when target at 0 HP)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Corpseshuck","carried":false,"rollsToHit":true,"text":"Corpseshuck (takes one round, instant death when target at 0 HP)","effects":[{"kind":"special","rule":"Corpseshuck"}], declaredSpan: null },
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Corpseshuck","text":"Iridium Vultures fanatically attack biological PCs who fall to 0 HP, attempting to break their body open and drain out the innards. This lethal attack takes a whole combat round to execute and can be interrupted by damaging the Vulture or knocking it off balance."},
    ],
    bio: "<p>Silvery synthetic carrion eaters that ride the air currents above the blue sands, scent-sensors attuned for the slightest hint of decay. Not interested in living beings, but will attack to defend a carcass.</p><p><b>Corpseshuck:</b> Iridium Vultures fanatically attack biological PCs who fall to 0 HP, attempting to break their body open and drain out the innards. This lethal attack takes a whole combat round to execute and can be interrupted by damaging the Vulture or knocking it off balance.</p>" },

  { name: "Jigsaw Courtier", types: ["biological","hypergeometric"], level: 4, hp: 16, av: 13, moraleBonus: 4, enc: "d4",
    atk: "Bladed Tesseract (d6, hypergeometric)",
    abilities: [
      {"name":"Bladed Tesseract","carried":false,"text":"Bladed Tesseract (d6, hypergeometric)",
       "effects":[{"kind":"damage","dice":"1d6","damageType":"hypergeometric"}],
       "damageTypes":["hypergeometric"]}
    ],
    rules: [
      {"name":"Autarch Figment","text":"Bearer of a figment of the Jigsaw Autarch. See Autarch Figment Effects for the effects of the figment."}
    ],
    bio: "<p>Bearer of a figment of the Jigsaw Autarch. See Autarch Figment Effects for the effects of the figment.</p>" },

  { name: "Jollyhoss", types: ["hypergeometric"], level: 4, hp: 16, av: 14, moraleBonus: 4, enc: "1 Head and 1 Hindquarters",
    atk: "HEAD: Bifurcating Bite (Special). HINDQUARTERS: 2 x Kick (d8, hypergeometric)",
    abilities: [
      {"name":"Bifurcating Bite","carried":false,"rollsToHit":true,"text":"HEAD: Bifurcating Bite (Special)","effects":[{"kind":"special","rule":"Bifurcating Bite"}]},
      {"name":"Kick","carried":false,"text":"HINDQUARTERS: 2 x Kick (d8, hypergeometric)","effects":[{"kind":"damage","dice":"1d8","damageType":"hypergeometric"}],"count":2,"damageTypes":["hypergeometric"]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Bifurcating Bite","text":"A Hoss's bite deals damage equal to half the target's current HP (minimum of 1 damage)."},
      {"name":"Two Are One","text":"The Jollyhoss's Head and Hindquarters move and attack as separate Level 4 creatures, each with 16 HP. If one half of the Jollyhoss is killed, it will resurrect with full HP at the start of the next combat round. Only a swift death of the companion half can prevent this.","hpTick":{"heal":true,"full":true}},
    ],
    bio: "<p>A bizarre hypergeometric predator, resembling a fanged stallion fashioned from brightly coloured paper. The creature is comprised of front and back halves which move independently but nonetheless are the same animal.</p><p><b>Bifurcating Bite:</b> A Hoss's bite deals damage equal to half the target's current HP (minimum of 1 damage).</p><p><b>Two Are One:</b> The Jollyhoss's Head and Hindquarters move and attack as separate Level 4 creatures, each with 16 HP. If one half of the Jollyhoss is killed, it will resurrect with full HP at the start of the next combat round. Only a swift death of the companion half can prevent this.</p>" },

  { name: "Juggernaut", types: ["synthetic"], level: 8, hp: 32, av: 22, moraleBonus: 10, enc: "1",
    atk: "Crush (d12)",
    abilities: [
      {"name":"Crush","carried":false,"text":"Crush (d12)","effects":[{"kind":"damage","dice":"1d12"}]},
    ],
    bio: "<p>Colossal sentient spinning wheel of ferrosteel, which rumbles through the blue wastelands bellowing resonant hymns of loneliness. What it sees it covets, but - lacking limbs - Juggernauts can only express affection by crushing the object of their desire, and in so doing, make them one with its ever-roving axis.</p>" },

  { name: "Kalopede", types: ["biological"], level: 13, hp: 52, av: 18, moraleBonus: 10, enc: "1",
    atk: "2 x Mandibles (2d6) + Kalotoxin Sting (Special)",
    abilities: [
      {"name":"Mandibles","carried":false,"text":"2 x Mandibles (2d6)","effects":[{"kind":"damage","dice":"2d6"}],"count":2},
      {"name":"Kalotoxin Sting","text":"Kalotoxin Sting (Special)","effects":[{"kind":"special","rule":"Kalotoxin"},{"kind":"save","ability":"con","mode":"resist","vs":"transformation into Fine Art"}]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Kalotoxin","text":"Targets stung by the Kalopede's quicksilver tongue must CON Save or undergo rapid transformations into works of Fine Art vaguely resembling the victim. This metamorphosis is lethal and permanent."},
    ],
    bio: "<p>A large and hauntingly beautiful centipede-like creature, noted for its polychrome carapace and voracious appetite for fine art objects. Rarely seen on the desert surface.</p><p><b>Kalotoxin:</b> Targets stung by the Kalopede's quicksilver tongue must CON Save or undergo rapid transformations into works of Fine Art vaguely resembling the victim. This metamorphosis is lethal and permanent.</p>" },

  { name: "Knight Mordicant", moraleMode: "never", types: ["biological"], metalArmour: true, level: 7, hp: 28, av: 16, moraleBonus: 0, moraleNote: "Never Flees", enc: "1 + Steed",
    atk: "Advanced Melee Weapon (generate on encounter)",
    abilities: [
      {"name":"Advanced Melee Weapon","text":"Advanced Melee Weapon (generate on encounter)","effects":[{"kind":"generateWeapon","tier":"Advanced","weaponKind":"melee"}]},
    ],
    rules: [
      {"name":"Steed","text":"Mordicant Knights ride a Destrier."},
    ],
    bio: "<p>Sworn swords of the Church of the Everbleeding Wound, armoured in blood-red plasteel and bone-white enamel.</p><p><b>Steed:</b> Mordicant Knights ride a Destrier.</p>" },

  { name: "Knight Peregrine", types: ["biological"], level: 5, hp: 20, av: 15, moraleBonus: 7, enc: "1 + Steed",
    atk: "Advanced Weapon (generate on encounter)",
    abilities: [
      {"name":"Advanced Weapon","text":"Advanced Weapon (generate on encounter)","effects":[{"kind":"generateWeapon","tier":"Advanced"}]},
    ],
    rules: [
      {"name":"Steed","text":"Knights Peregrine ride a steed, usually a Weeping Lizard or Zorse."},
    ],
    bio: "<p>The blue wastelands have no shortage of roaming gallants, whose claim to nobility is tenuous and who own little but the clothes on their back and the weapon they have dedicated their life to mastering. Strangers to most and salvation to some, they won't cease their travels until every battlefield in all creation has felt the touch of their boots. And when at last they find their rest in a pauper's grave, perhaps the gods will kindle the heavens with a new comet, a wandering star.</p><p><b>Steed:</b> Knights Peregrine ride a steed, usually a Weeping Lizard or Zorse.</p>" },

  { name: "Kronophage", types: ["outsider", "mineral"], level: 7, hp: 28, av: 22, moraleBonus: 10, enc: "1",
    atk: "Borrowed Time (Special) / Out of Time (auto-hit, blast, damage = Kronophage's LVL)",
    abilities: [
      {"name":"Borrowed Time","text":"Borrowed Time (Special)","effects":[{"kind":"special","rule":"Borrowed Time"}]},
      {"name":"Out of Time","ranged":true,"carried":false,"text":"Out of Time (auto-hit, blast, damage = Kronophage's LVL)","effects":[{"kind":"damage","dice":"@lvl"}],"damageLabel":"= the Kronophage's LVL","autoHit":true,"damageTypes":["blast"],"derived":"Kronophage's LVL"},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Borrowed Time","text":"The creature drains years from its victim's past, present, and future. The target loses a Level. They must roll 1d8, subtract the result from their maximum HP, and subtract 3 points from their maximum ability scores. The Kronophage gains a Level permanently. PCs reduced below Level 0 by the Kronophage are worse than dead. They never existed at all, and their equipment vanishes with them. Slaying the monster restores all lost time to those it fed upon. PCs regain lost Levels.","levelDrain":{"levels":1,"drainerGains":{"level":1,"hp":4}}},
    ],
    bio: "<p>Manifold crystals orbit a nucleus of collapsing space-time. A paradox made sentient, an ulcer on causality that steals the past from those it beholds.</p><p><b>Borrowed Time:</b> The creature drains years from its victim's past, present, and future. The target loses a Level. They must roll 1d8, subtract the result from their maximum HP, and subtract 3 points from their maximum ability scores. The Kronophage gains a Level permanently. PCs reduced below Level 0 by the Kronophage are worse than dead. They never existed at all, and their equipment vanishes with them. Slaying the monster restores all lost time to those it fed upon. PCs regain lost Levels.</p>" },

  { name: "Lambent Lynx", types: ["biological", "synthetic"], level: 4, hp: 16, av: 13, moraleBonus: 6, enc: "d6",
    atk: "Claws (d6, electrical) / Blinding Pelt (blast, DEX Save vs blinded for d6 rounds)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d6, electrical)","effects":[{"kind":"damage","dice":"1d6","damageType":"electrical"}],"damageTypes":["electrical"]},
      {"name":"Blinding Pelt","text":"Blinding Pelt (blast, DEX Save vs blinded for d6 rounds)","effects":[{"kind":"save","ability":"dex","mode":"resist","vs":"blinded for d6 rounds","condition":"blind","duration":{"amount":"1d6","unit":"round"}}],"damageTypes":["blast"], declaredSpan: null },
    ],
    routines: [[0],[1]],
    rules: [
    ],
    bio: "<p>Lurid cyborg feline. Feeds on sources of electrical power, including synths. Can ignite every filament in its synth pelt like a flash-bang.</p>" },

  { name: "Laser Shrimp", types: ["synthetic"], level: 1, hp: 4, av: 10, moraleBonus: 1, enc: "2d6",
    atk: "Laser (d4, beam)",
    abilities: [
      {"name":"Laser","ranged":true,"carried":false,"text":"Laser (d4, beam)","effects":[{"kind":"damage","dice":"1d4","damageType":"beam"}],"damageTypes":["beam"]},
    ],
    bio: "<p>Shrimp-like synths that fire lasers from their claws. Once used as cheap, expendable sentries.</p>" },

  { name: "Lazarus Guard", moraleMode: "none", types: ["biological", "synthetic"], level: 6, hp: 24, av: 14, moraleBonus: 0, moraleNote: "-", enc: "d6",
    atk: "2 x Claws (d6)",
    abilities: [
      {"name":"Claws","carried":false,"text":"2 x Claws (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":2},
    ],
    rules: [
      {"name":"Resurrection","text":"Lazarus Guards resurrect after d3 combat rounds if slain, the black cyborg hearts within their breasts unwilling to let their hosts die. These hearts must be cut from the guard's body and destroyed to stop the resurrection. Once the secret is known, players may wish to target the guard's heart directly. The cyborg organ has 1 HP and AV 20.", declaredSpan: { amount: "d3", unit: "round" } },
    ],
    bio: "<p>A desiccated human corpse, filled with necrotech implants that preserve a sort of life-in-death for the unlucky host. So-called 'Lazarus Regiments' were created from the corpses of criminals to guard the tombs of Autarchy nobles. Veins of black gallium pulse beneath parchment-like skin, and their despairing eyes resemble sable stones.</p><p><b>Resurrection:</b> Lazarus Guards resurrect after d3 combat rounds if slain, the black cyborg hearts within their breasts unwilling to let their hosts die. These hearts must be cut from the guard's body and destroyed to stop the resurrection. Once the secret is known, players may wish to target the guard's heart directly. The cyborg organ has 1 HP and AV 20.</p>" },

  { name: "Leopard Worm", types: ["biological"], level: 6, hp: 24, av: 15, moraleBonus: 9, enc: "d4",
    atk: "Bite (d8) + Glue Spit",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Glue Spit","ranged":true,"carried":false,"rollsToHit":true,"text":"Glue Spit","effects":[{"kind":"condition","condition":"entangled"}]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Ambush","text":"The Leopard Worm always strikes from ambush if encountered on open sands.","ambush":"prompt"},
    ],
    bio: "<p>Sinuous ambush predators. The worm's gluey spit is highly adhesive. When covered in spit, a character becomes entangled. The spit is dissolved by salt water.</p><p><b>Ambush:</b> The Leopard Worm always strikes from ambush if encountered on open sands.</p>" },

  { name: "Lithling Scholar", noHealRule: "Inevitable", types: ["mineral"], level: 6, hp: 24, av: 24, moraleBonus: 5, enc: "1",
    atk: "Scholar's Staff (d4)",
    abilities: [
      {"name":"Scholar's Staff","carried":true,"text":"Scholar's Staff (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>Wandering scholar from the Lithic Lyceum. General pacifists, with little desire to harm living beings. Attempts to reason with assailants, even during deadly combat.</p>" },

  { name: "Lithling Warrior", noHealRule: "Inevitable", types: ["mineral"], level: 8, hp: 36, av: 24, moraleBonus: 8, enc: "d4",
    atk: "Lithifying Ray (d8 DEX Damage, turn to stone at 0 DEX)",
    abilities: [
      {"name":"Lithifying Ray","ranged":true,"carried":false,"text":"Lithifying Ray (d8 DEX Damage, turn to stone at 0 DEX)","effects":[{"kind":"abilityDamage","ability":"dex","dice":"1d8"}]},
    ],
    bio: "<p>When the Lyceum has need of defense, it calls upon its rarely seen warrior-scholars. They fight to preserve rather than kill, their defeated foes carefully catalogued in the Inspiral Archive.</p>" },

  { name: "Lizard Lion", types: ["biological"], level: 2, hp: 8, av: 16, moraleBonus: 5, enc: "d6",
    atk: "Bite (d8)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>Frill-necked reptiles. Ill-tempered, territorial, like a crocodile that can sprint. Their skin is prized as a material for clothing.</p>" },

  { name: "Luxfoe Beetle", types: ["biological"], level: 1, hp: 4, av: 13, moraleBonus: 1, enc: "d8",
    atk: "Bite (d4)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>A nocturnal insect, enraged by artificial light. Relentlessly attacks any lantern or torch-bearing hand it comes across. Called 'helldiver bugs', due to their penchant for assaulting campfire embers.</p>" },

  { name: "Magneticrab", types: ["synthetic"], level: 8, hp: 32, av: 15, moraleBonus: 5, enc: "1",
    atk: "2 x Claws (d8) + Magnetic Field (Special)",
    abilities: [
      {"name":"Claws","carried":false,"text":"2 x Claws (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
      {"name":"Magnetic Field","text":"Magnetic Field (Special)","effects":[{"kind":"special","rule":"Magnetic Field"}]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Magnetic Field","text":"The Magneticrab's shell emits a powerful magnetic field. Each round, nearby PCs with metal weapons or items equipped must STR Save or lose hold of their items. They become stuck to the Magneticrab's shell and cannot be retrieved until the creature is dead. PCs in metal armour or who are synthetic are forcibly drawn into melee range.","perRound":true,"magnetField":true,"effects":[{"kind":"save","ability":"str","mode":"resist","vs":"metal items stuck to the shell"}]},
    ],
    bio: "<p>A crustacean-like synth, dwelling inside a magnetised shell. The creature emits magnetic fields in order to prey upon other synths.</p><p><b>Magnetic Field:</b> The Magneticrab's shell emits a powerful magnetic field. Each round, nearby PCs with metal weapons or items equipped must STR Save or lose hold of their items. They become stuck to the Magneticrab's shell and cannot be retrieved until the creature is dead. PCs in metal armour or who are synthetic are forcibly drawn into melee range.</p>" },

  { name: "Maladaptor", types: ["synthetic"], level: 5, hp: 20, av: 15, moraleBonus: 5, enc: "d4",
    atk: "Lash (d8 + CON Save vs Nanomachine Infection) / Feedback (d8, blast, electrical)",
    abilities: [
      {"name":"Lash","carried":false,"text":"Lash (d8 + CON Save vs Nanomachine Infection)","effects":[{"kind":"damage","dice":"1d8"},{"kind":"save","ability":"con","mode":"resist","vs":"Nanomachine Infection"}]},
      {"name":"Feedback","ranged":true,"carried":false,"text":"Feedback (d8, blast, electrical)","effects":[{"kind":"damage","dice":"1d8","damageType":"blast"}],"damageTypes":["blast","electrical"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Infection","text":"Anyone damaged by a Maladaptor's attack must CON Save or be infected with malignant nanomachines. As these beings are host to numerous infections, roll 1d6 to determine what has been transmitted: 1 The Gitch, 2 Goldencough, 3 Fabricator Stoma, 4 Usurper Arm, 5 Dreamcage, 6 Janus Lenses."},
    ],
    bio: "<p>Broken husks of synths reanimated by malignant swarms of nanomachines, Maladaptors move erratically through the blue ruins, seeking fresh hosts for their infestations. Flesh or steel, neurone or ego-engine; all is fuel for ceaseless change. A subsonic dirge heralds their approach.</p><p><b>Infection:</b> Anyone damaged by a Maladaptor's attack must CON Save or be infected with malignant nanomachines. As these beings are host to numerous infections, roll 1d6 to determine what has been transmitted: 1 The Gitch, 2 Goldencough, 3 Fabricator Stoma, 4 Usurper Arm, 5 Dreamcage, 6 Janus Lenses.</p>" },

  { name: "Master of Eyeless Wisdom", types: ["biological", "psychic"], level: 7, hp: 28, av: 11, note: "AV is set to 11, the book's fallback value once Prescience is stripped — normally this creature can't be hit at all except via an opposed PSY Save (see Prescience below), which a flat AV number can't represent.", moraleBonus: 7, enc: "1",
    atk: "Mind Control (EGO Save vs Controlled) / Telekinesis (2d8, STR save vs lifted and thrown)",
    abilities: [
      {"name":"Mind Control","text":"Mind Control (EGO Save vs Controlled)","effects":[{"kind":"save","ability":"ego","mode":"resist","vs":"Controlled"}]},
      {"name":"Telekinesis","ranged":true,"carried":false,"text":"Telekinesis (2d8, STR save vs lifted and thrown)","effects":[{"kind":"damage","dice":"2d8"},{"kind":"save","ability":"str","mode":"resist","vs":"lifted and thrown"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Prescience","text":"Eyeless Masters telepathically predict the assaults of their opponents, always moving ahead of the blow. They cannot be harmed with any attack unless the attacker learns to shield their intentions, achieved with an opposed PSY Save. Stripped of their prescience, Eyeless Masters have AV 11."},
    ],
    bio: "<p>Masters of the Eyeless Path, who achieved endarkenment and now guide lesser minds upon the road. Self-blinded and legless, they levitate above the azure dust, resembling emaciated puppets hanging from unseen strings.</p><p><b>Prescience:</b> Eyeless Masters telepathically predict the assaults of their opponents, always moving ahead of the blow. They cannot be harmed with any attack unless the attacker learns to shield their intentions, achieved with an opposed PSY Save. Stripped of their prescience, Eyeless Masters have AV 11.</p>" },

  { name: "Memory Eater", types: ["synthetic"], level: 3, hp: 12, av: 15, moraleBonus: 6, enc: "d8",
    atk: "Cranial-Bore Proboscis (d6 INT damage)",
    abilities: [
      {"name":"Cranial-Bore Proboscis","carried":false,"text":"Cranial-Bore Proboscis (d6 INT damage)","effects":[{"kind":"abilityDamage","ability":"int","dice":"1d6"}]},
    ],
    bio: "<p>Biomechanical memory vampire. A giant mosquito cast from living steel.</p>" },

  { name: "Metamorphic Sludge", types: ["fungal"], level: 4, hp: 16, av: 10, moraleBonus: 1, enc: "1",
    atk: "2 x Metamorphic Pseudopod (d4 CON damage, Bio targets CON Save vs mutation)",
    abilities: [
      {"name":"Metamorphic Pseudopod","carried":false,"text":"2 x Metamorphic Pseudopod (d4 CON damage, Bio targets CON Save vs mutation)","effects":[{"kind":"abilityDamage","ability":"con","dice":"1d4"},{"kind":"save","ability":"con","mode":"resist","vs":"mutation"}],"count":2},
    ],
    bio: "<p>A protean mass of primal slurry, in which the stuff of life is devoured and recast. The sludge's digestive enzymes induce rapid mutation in the cells they bond with.</p>" },

  { name: "Moonbeast (Imago)", types: ["outsider", "psychic"], level: 5, hp: 20, av: 16, moraleBonus: 8, enc: "d4",
    atk: "Lunatic Gaze (d4 EGO damage) / Radioactive Vomit (blast, d4 CON damage)",
    abilities: [
      {"name":"Lunatic Gaze","ranged":true,"carried":false,"text":"Lunatic Gaze (d4 EGO damage)","effects":[{"kind":"abilityDamage","ability":"ego","dice":"1d4"}]},
      {"name":"Radioactive Vomit","ranged":true,"carried":false,"text":"Radioactive Vomit (blast, d4 CON damage)","effects":[{"kind":"abilityDamage","ability":"con","dice":"1d4"}],"damageTypes":["blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Sun-Scourged","text":"Moonbeasts suffer d10 damage per round if exposed to Urth's red sunlight.","perRound":true,"hpTick":{"dice":"1d10"}},
    ],
    bio: "<p>Luna, once the stepping stone to the stars, was lost to the Autarchs and is no longer under the dominion of man. The squamous pallid monstrosities known as 'Moonbeasts' may be the cause of this defeat or merely a symptom of it. In either case, the creatures are inimical to humanity, hated interlopers that dwell in flooded caverns below Luna's surface. They are somewhat toad-like and somewhat insect-like, although such phrases only capture a fragment of their extra-dimensional morphology. They descend to Vaarn on moonless nights in search of victims, travelling in void-boats made of black stone.</p><p><b>Sun-Scourged:</b> Moonbeasts suffer d10 damage per round if exposed to Urth's red sunlight.</p>" },

  { name: "Moonbeast (Nymph)", types: ["outsider"], level: 2, hp: 8, av: 12, moraleBonus: 5, enc: "d6",
    atk: "Vampiric Tendrils (d8, heals HP equal to damage)",
    abilities: [
      {"name":"Vampiric Tendrils","carried":false,"text":"Vampiric Tendrils (d8, heals HP equal to damage)","effects":[{"kind":"heal"},{"kind":"damage","dice":"1d8"}]},
    ],
    rules: [
      {"name":"Sun-Scourged","text":"Moonbeasts suffer d10 damage per round if exposed to Urth's red sunlight.","perRound":true,"hpTick":{"dice":"1d10"}},
    ],
    bio: "<p>The immature form of Moonbeast. Lacking psychic powers or the projectile vomiting of their elders, they swarm over their prey and drain life from their bodies with questing tendrils.</p><p><b>Sun-Scourged:</b> Moonbeasts suffer d10 damage per round if exposed to Urth's red sunlight.</p>" },

  { name: "Mycomorph", types: ["biological", "fungal"], level: 1, hp: 4, av: 12, moraleBonus: 3, enc: "d8",
    atk: "Weapon (d6) / Spores (d8 TOX, blast)",
    abilities: [
      {"name":"Weapon","carried":true,"text":"Weapon (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Spores","ranged":true,"carried":false,"text":"Spores (d8 TOX, blast)","effects":[{"kind":"damage","dice":"1d8","damageType":"tox"}],"damageTypes":["tox","blast"]},
    ],
    routines: [[0],[1]],
    bio: "<p>Human corpses, reanimated by mycomorphic fungal spores. They name themselves the 'twice-born' and can be found throughout Vaarn.</p>" },

  { name: "Mystic", types: ["biological", "psychic"], level: 0, levelNote: "book gives \"d10 (4 - 40 HP)\" — built at 0; use Roll for Level", hp: 0, av: 11, moraleBonus: 5, rolled: { level: { base: 0, dice: "1d10" } }, enc: "1",
    atk: "Dagger (d4) / Mystic Gift (Special)",
    abilities: [
      {"name":"Dagger","carried":true,"text":"Dagger (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Mystic Gift","text":"Mystic Gift (Special)","effects":[{"kind":"special","see":"Mystic Gifts"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Mystic Gift","text":"Each Mystic is the master of a Gift, generated randomly from the tables in Mystic Gifts. The Mystic may teach this Gift to students who appease them."},
    ],
    bio: "<p>The mystics of Vaarn hail from many sects, each dedicated to tearing the veil of lucid reality from the True Eyes within. Some flagellate themselves, some deny themselves food or shelter, while others still utter no words save the nine billon names of god. They share only one thing: an uncanny influence over the material world, using nothing but thought and suggestion.</p><p><b>Mystic Gift:</b> Each Mystic is the master of a Gift, generated randomly from the tables in Mystic Gifts. The Mystic may teach this Gift to students who appease them.</p>" },

  { name: "Negativfolk", types: ["outsider"], level: 2, hp: 8, av: 12, moraleBonus: 5, enc: "d8",
    atk: "Hug (d6) / Knife (+d6 HP)",
    abilities: [
      {"name":"Hug","carried":false,"text":"Hug (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Knife","text":"Knife (+d6 HP)","effects":[{"kind":"heal","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Opposite Day","text":"Negativfolk always do the opposite of what you ask them and make every action in reverse. They eject un-chewed food back onto empty plates, blue negativblood flows back into their wounds, and the less said about other private functions the better. They react poorly to compliments, hugging or shaking the hand of their foes with lethal results. Hurling abuse at a Negativman may earn you a healing bullet between the eyes. Negativfolk can only be harmed with healing items and will only be healed by damage."},
    ],
    bio: "<p>Inverted, photonegative-hued people who walk and speak backwards. They wander the blue dunes in family groups, receding from their point of origin in strange halting meanders.</p><p><b>Opposite Day:</b> Negativfolk always do the opposite of what you ask them and make every action in reverse. They eject un-chewed food back onto empty plates, blue negativblood flows back into their wounds, and the less said about other private functions the better. They react poorly to compliments, hugging or shaking the hand of their foes with lethal results. Hurling abuse at a Negativman may earn you a healing bullet between the eyes. Negativfolk can only be harmed with healing items and will only be healed by damage.</p>" },

  { name: "Neobloom", types: ["biological"], level: 0, levelNote: "book gives \"d6 (4 - 24 HP)\" — built at 0; use Roll for Level", hp: 0, av: 12, moraleBonus: 4, rolled: { level: { base: 0, dice: "1d6" } }, enc: "d6",
    atk: "Vines (d6) + Bloomboon (see Bloomboons)",
    abilities: [
      {"name":"Vines","carried":false,"text":"Vines (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Bloomboon","text":"Bloomboon (see Bloomboons)","effects":[{"kind":"special","see":"Bloomboons"}]},
    ],
    routines: [[0,1]],
    bio: "<p>A sentient plant, which enjoys the rights and privileges of any other ensouled citizen of Vaarn.</p>" },

  { name: "Nerve Crawler", types: ["synthetic"], level: 1, hp: 4, av: 12, moraleBonus: 8, enc: "d8",
    atk: "Nerve-lash (d6) / Neural Hijack (EGO save vs Mind Control)",
    abilities: [
      {"name":"Nerve-lash","carried":false,"text":"Nerve-lash (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Neural Hijack","text":"Neural Hijack (EGO save vs Mind Control)","effects":[{"kind":"save","ability":"ego","mode":"resist","vs":"Mind Control","opposed":true}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Neural Hijack","text":"Hijacked targets must make an opposed EGO Save. On failure, the Nerve Crawler bonds with them and is able to direct their actions. The victim may attempt a new EGO Save each round to break free.","perRound":true},
    ],
    bio: "<p>Victims of an insidious nanotech infestation. Decaying human corpses whose neural pathways have been supplanted by a virulent nexus of silvery nano-nerves. These revenants crawl on their hands and knees, stiffly and slowly, seeking new hosts for the infection.</p><p><b>Neural Hijack:</b> Hijacked targets must make an opposed EGO Save. On failure, the Nerve Crawler bonds with them and is able to direct their actions. The victim may attempt a new EGO Save each round to break free.</p>" },

  { name: "Nightmare Herald", types: ["outsider", "psychic"], level: 5, hp: 20, av: 14, moraleBonus: 5, enc: "1",
    atk: "Darkling Lullaby (EGO Save vs Sleep) / Revelation (d4 EGO damage)",
    abilities: [
      {"name":"Darkling Lullaby","text":"Darkling Lullaby (EGO Save vs Sleep)","effects":[{"kind":"save","ability":"ego","mode":"resist","vs":"Sleep"}]},
      {"name":"Revelation","ranged":true,"carried":false,"text":"Revelation (d4 EGO damage)","effects":[{"kind":"abilityDamage","ability":"ego","dice":"1d4"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Sleep","text":"Targets fall into a nightmare-wracked sleep and cannot act. They can be woken by damage or anything else that wakes a sleeper."},
      {"name":"Feast of Dreams","text":"At the start of the round, a Nightmare Herald regenerates d6 HP for each sleeping creature nearby, allied or enemy. This effect can resurrect Heralds from 'death'.","perRound":true,"hpTick":{"dice":"1d6","heal":true,"perCount":"sleeping creature nearby"}},
    ],
    bio: "<p>Formless musicians attending to the Daemon Sultan Azathoth in the dreaming chaos at the terminus of space and time. The Children summon these pipers and flautists into our reality to aid their rituals.</p><p><b>Sleep:</b> Targets fall into a nightmare-wracked sleep and cannot act. They can be woken by damage or anything else that wakes a sleeper.</p><p><b>Feast of Dreams:</b> At the start of the round, a Nightmare Herald regenerates d6 HP for each sleeping creature nearby, allied or enemy. This effect can resurrect Heralds from 'death'.</p>" },

  { name: "Nome", types: ["biological", "hypergeometric"], level: 1, hp: 4, av: 12, note: "AV is 24 while a Nome has vanished into its cap — see Vanish below.", moraleBonus: 8, enc: "2d6",
    atk: "Clockwork Musket (d8, wind-up after each shot) / Bite (d4)",
    abilities: [
      {"name":"Clockwork Musket","ranged":true,"carried":true,"text":"Clockwork Musket (d8, wind-up after each shot)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Bite","carried":false,"text":"Bite (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Vanish","text":"A Nome can disappear inside its cap as a combat action, doubling its AV. The cap sticks to the floor like a limpet and is impossible to move. While inside the cap, the Nome regains all HP.","avStates":[{"label":"In the open","av":12},{"label":"Vanished","av":24}]},
      {"name":"Summoning Triangle","text":"A group of three Nomes can remove their caps to create a summoning triangle. A single target the Nomes can see must PSY Save or be immediately transported to the centre of the summoning triangle.","effects":[{"kind":"save","ability":"psy","mode":"resist","vs":"transported to the triangle"}]},
    ],
    bio: "<p>Small cacogenic humanoids, resembling sly, ancient infants. They wear tall caps painted in gaudy colours. These caps are hypergeometric portals of some kind. A Nome can 'vanish' inside its cap to evade danger, and the creatures store all manner of objects inside their headwear. They are covetous of trinkets and mechanisms.</p><p><b>Vanish:</b> A Nome can disappear inside its cap as a combat action, doubling its AV. The cap sticks to the floor like a limpet and is impossible to move. While inside the cap, the Nome regains all HP.</p><p><b>Summoning Triangle:</b> A group of three Nomes can remove their caps to create a summoning triangle. A single target the Nomes can see must PSY Save or be immediately transported to the centre of the summoning triangle.</p>" },

  { name: "Oblivion Obelisk", moraleMode: "none", types: ["mineral", "psychic"], level: 13, hp: 52, av: 22, moraleBonus: 0, moraleNote: "-", enc: "1 + d8 Heralds",
    atk: "Oblivion (1 EGO damage per round, affects all in line of sight)",
    abilities: [
      {"name":"Oblivion","text":"Oblivion (1 EGO damage per round, affects all in line of sight)","effects":[{"kind":"abilityDamage","ability":"ego","flat":1,"perRound":true}],"ongoing":true,"autoHit":true},
    ],
    rules: [
      {"name":"Oblivion Heralds","text":"Unfortunate victims of the Obelisk. They do not kill but restrain, forcing captives to kneel unblinking before the black stone until their mind has been erased. Stats as Bandits, armed with non-lethal weapons."},
    ],
    bio: "<p>A levitating tesseract of lustreless stone, which drifts through the blue desert bringing calamity to all who witness it. The very sight of the edifice erodes the mind's fabric, replacing the striving will with a terrible blankness.</p><p><b>Oblivion Heralds:</b> Unfortunate victims of the Obelisk. They do not kill but restrain, forcing captives to kneel unblinking before the black stone until their mind has been erased. Stats as Bandits, armed with non-lethal weapons.</p>" },

  { name: "Occulith", types: ["mineral"], level: 12, hp: 48, av: 20, moraleBonus: 10, enc: "1",
    atk: "Lithifying Gaze (auto-hit, d6 DEX damage, +2 AV)",
    abilities: [
      {"name":"Lithifying Gaze","text":"Lithifying Gaze (auto-hit, d6 DEX damage, +2 AV)","effects":[{"kind":"abilityDamage","ability":"dex","dice":"1d6","perRound":true,"fade":"lithification"},{"kind":"avChange","amount":2,"perRound":true}],"autoHit":true},
    ],
    rules: [
      {"name":"Lithifying Gaze","text":"Automatically hits a target in line of sight. Target loses d6 DEX and gains +2 AV per round; must break line of sight to stop the attack. Both effects fade at the rate of one point per day. An Occulith is immune to its own gaze.","perRound":true},
      {"name":"Ambush","text":"The Occulith appears to be inanimate stone until it moves and always ambushes unless the PCs are informed of its exact location.","ambush":"always","ambushUnless":"the PCs are informed of its exact location"},
    ],
    bio: "<p>A great stone serpent, cast from innumerable scales of living shale. In the stony hollows of its stalactite-fanged skull, twin baleful lanterns cast a metamorphic gaze upon the flesh of the world.</p><p><b>Lithifying Gaze:</b> Automatically hits a target in line of sight. Target loses d6 DEX and gains +2 AV per round; must break line of sight to stop the attack. Both effects fade at the rate of one point per day. An Occulith is immune to its own gaze.</p><p><b>Ambush:</b> The Occulith appears to be inanimate stone until it moves and always ambushes unless the PCs are informed of its exact location.</p>" },

  { name: "Parched Man's Snare", moraleMode: "none", types: ["biological"], level: 4, hp: 16, av: 16, moraleBonus: 0, moraleNote: "-", enc: "d4",
    atk: "Snare (d6), followed by drowning (STR Save vs d6 damage per round)",
    abilities: [
      {"name":"Snare","carried":false,"text":"Snare (d6), followed by drowning (STR Save vs d6 damage per round)","effects":[{"kind":"damage","dice":"1d6","onFailedSave":true},{"kind":"damage","dice":"1d6","damageType":"drowning"},{"kind":"save","ability":"str","mode":"resist","vs":"d6 damage per round","onFail":{"hold":{"dice":"1d6","damageTypes":["drowning"],"escape":{"ability":"str","by":"break free"}}}}],"ongoing":true},
    ],
    rules: [
      {"name":"Ambush","text":"The Snare always strikes from ambush if the PCs do not know the water source is infested.","ambush":"prompt"},
    ],
    bio: "<p>A giant, carnivorous plant that lurks in pools and oases, waiting to devour unwary travellers. The fleshy body of the Snare roots at the bottom of a pool, while its thorny vines trail in the water, moving towards any disturbances. The Snare hunts by grabbing animals while they drink and dragging them to the bottom of the lake or river to be drowned and absorbed into the Snare's root structure. Cautious travellers know to test the water's surface with a long pole before drinking, but those who have lost their wits from thirst find themselves easy prey to these plants.</p><p><b>Ambush:</b> The Snare always strikes from ambush if the PCs do not know the water source is infested.</p>" },

  { name: "Phase Panther", types: ["hypergeometric"], level: 6, hp: 24, av: 14, moraleBonus: 5, enc: "d4",
    atk: "Claws (d10, hypergeometric) / Pounce (DEX Save vs 2d6 damage per round)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d10, hypergeometric)","effects":[{"kind":"damage","dice":"1d10","damageType":"hypergeometric"}],"damageTypes":["hypergeometric"]},
      {"name":"Pounce","carried":false,"text":"Pounce (DEX Save vs 2d6 damage per round)","effects":[{"kind":"damage","dice":"2d6","onFailedSave":true},{"kind":"save","ability":"dex","mode":"resist","vs":"2d6 damage per round","opposed":true,"onFail":{"damage":{"dice":"2d6"},"hold":{"dice":"2d6","escape":{"ability":"dex","by":"break free","opposed":true}}}}],"ongoing":true},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Phase","text":"At the start of each combat round, the Panther may choose to phase out of reality. While phased, the Panther can be seen but cannot be touched or damaged. Likewise, it cannot touch or harm any non-phased creature.","perRound":true},
      {"name":"Pounce","text":"Targets make an opposed DEX Save. On failure, the target is pinned and takes 2d6 damage per round. While pinned, the Panther and target phase out of reality. The target must DEX Save to break free and return to the material world.","perRound":true},
    ],
    bio: "<p>Creatures woven from predatory hypergeometry, summoned by the mystics of lost eras to guard their mansions. They resemble great cats made of swirling colours, blinking in and out of existence at will.</p><p><b>Phase:</b> At the start of each combat round, the Panther may choose to phase out of reality. While phased, the Panther can be seen but cannot be touched or damaged. Likewise, it cannot touch or harm any non-phased creature.</p><p><b>Pounce:</b> Targets make an opposed DEX Save. On failure, the target is pinned and takes 2d6 damage per round. While pinned, the Panther and target phase out of reality. The target must DEX Save to break free and return to the material world.</p>" },

  { name: "Phthalo-Jackal", types: ["biological"], level: 1, hp: 4, av: 14, moraleBonus: 4, enc: "3d6",
    atk: "Bite (d4)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>Cautious, clever, cerulean-coated pack hunters. Flee battle if they are outnumbered.</p>" },

  { name: "Piranha Mole", types: ["biological"], level: 0, hp: 1, note: "AV is 11, or 22 while burrowed in soft ground.", av: 11, moraleBonus: 1, enc: "2d8",
    atk: "Flense (d4 ongoing, DEX Save to pull off)",
    abilities: [
      {"name":"Flense","carried":false,"text":"Flense (d4 ongoing, DEX Save to pull off)","effects":[{"kind":"damage","dice":"1d4"},{"kind":"save","ability":"dex","mode":"escape","escapeBy":"pull off"}],"ongoing":true,"hold":{"dice":"1d4","escape":{"ability":"dex","by":"pull it off"}}},
    ],
    rules: [
      {"name":"Burrower","text":"The Moles can burrow in soft ground, doubling their AV."},
      {"name":"Ambush","text":"The Piranha Mole always strikes from ambush if encountered on open sands.","ambush":"always","ambushUnless":"it is not encountered on open sands"},
    ],
    bio: "<p>Hairless burrowing carnivores. A pack of hungry Piranha Moles can gnaw a Zorse to the bone in less than five minutes.</p><p><b>Burrower:</b> The Moles can burrow in soft ground, doubling their AV.</p><p><b>Ambush:</b> The Piranha Mole always strikes from ambush if encountered on open sands.</p>" },

  // `flat` is a DERIVED actor property, not one of the seven creature types —
  // see isFlat in module/item/attack-properties.js. The bestiary Planeyfolk
  // needs it stated here because, unlike a PC, it has no `system.ancestry` to
  // derive it from. Two-dimensional beings take double from slashing.
  { name: "Planeyfolk", types: ["biological", "hypergeometric"], flat: true, level: 2, hp: 8, av: 13, moraleBonus: 4, enc: "d6",
    note: "No matching token art in final_mapping_log.tsv — same known gap as Planeyfolk PC tokens, uses a placeholder until real art exists for either.",
    atk: "Flattening Touch (d4 STR damage)",
    abilities: [
      {"name":"Flattening Touch","carried":false,"text":"Flattening Touch (d4 STR damage)","effects":[{"kind":"abilityDamage","ability":"str","dice":"1d4"}]},
    ],
    rules: [
      {"name":"Flat","text":"Planeyfolk take double damage from slashing or slicing weapons."},
      {"name":"Ambusher","text":"When indoors, Planeyfolk can pretend to be wall frescoes or shadows, striking from ambush.","ambush":"prompt"},
    ],
    bio: "<p>Two-dimensional hypergeometric humans.</p><p><b>Flat:</b> Planeyfolk take double damage from slashing or slicing weapons.</p><p><b>Ambusher:</b> When indoors, Planeyfolk can pretend to be wall frescoes or shadows, striking from ambush.</p>" },

  { name: "Plated Beetle", types: ["biological"], level: 3, hp: 12, av: 20, note: "AV drops to 10 (soft abdomen) after a Charge attack — see bio.", moraleBonus: 5, enc: "d6",
    atk: "Charge (DEX Save vs 2d6) / Pincers (d6)",
    abilities: [
      {"name":"Charge","carried":false,"text":"Charge (DEX Save vs 2d6)","effects":[{"kind":"damage","dice":"2d6","onFailedSave":true},{"kind":"save","ability":"dex","mode":"resist","vs":"2d6","onFail":{"damage":{"dice":"2d6"}}}]},
      {"name":"Pincers","carried":false,"text":"Pincers (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    // Live AV Computation wiring, RULED 2026-09-25 (Matt): the book names no rule, so this one is named here to carry the AV buttons.
    rules: [
      {"name":"Soft Abdomen","text":"Their heads are thickly armoured and nearly impervious to harm, but their abdomens are soft and exposed, with AV 10. They are vulnerable after a charge.","avStates":[{"label":"Head-on","av":20},{"label":"Abdomen exposed","av":10}]},
    ],
    bio: "<p>Aggressive carnivorous beetles. Their heads are thickly armoured and nearly impervious to harm, but their abdomens are soft and exposed, with AV 10. They are vulnerable after a charge.</p>" },

  { name: "Pontiff Scorpion", types: ["biological"], level: 2, hp: 8, av: 15, moraleBonus: 2, enc: "1",
    atk: "2 x Claw (d4) + Sting (d10 TOX)",
    abilities: [
      {"name":"Claw","carried":false,"text":"2 x Claw (d4)","effects":[{"kind":"damage","dice":"1d4"}],"count":2},
      {"name":"Sting","carried":false,"text":"Sting (d10 TOX)","effects":[{"kind":"damage","dice":"1d10","damageType":"tox"}],"damageTypes":["tox"]},
    ],
    routines: [[0,1]],
    bio: "<p>A large venomous arachnid named for its colouring, which resembles the red armour worn by the battle-crazed Pontiffs of the Church of the Everbleeding Wound.</p>" },

  { name: "Pseudo-Giant", types: ["biological"], level: 4, hp: 16, av: 15, moraleBonus: 8, enc: "d4",
    atk: "Stomp (d10)",
    abilities: [
      {"name":"Stomp","carried":false,"text":"Stomp (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
    ],
    bio: "<p>Severely mutated humans resembling enormous ambulatory torsos. They have a primitive, furious face on their chest, and tiny vestigial arms. They are unintelligent but ferocious and will pursue prey for miles.</p>" },

  { name: "Psy-Owl", types: ["biological", "psychic"], level: 1, hp: 4, av: 14, moraleBonus: 1, enc: "d6",
    atk: "Beak (d4) / Dominate (EGO Save vs Mind Control)",
    abilities: [
      {"name":"Beak","carried":false,"text":"Beak (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Dominate","text":"Dominate (EGO Save vs Mind Control)","effects":[{"kind":"save","ability":"ego","mode":"resist","vs":"Mind Control"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>A flightless blue owl with delicate pink eyes. Psy-Owls are very lazy and have a peculiar hunting strategy, mentally dominating small animals and forcing them to climb into the owl's beak. Larger creatures under the Owl's influence are tasked with capturing lizards and desert mice and hand-feeding them to the gluttonous bird.</p>" },

  { name: "Psyche Leech", types: ["outsider", "psychic"], level: 8, hp: 32, av: 14, moraleBonus: 8, enc: "1",
    atk: "2 x Tendrils (d8) + Psyche Syphon (grab, d6 PSY damage per round, STR Save to break free)",
    abilities: [
      {"name":"Tendrils","carried":false,"text":"2 x Tendrils (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
      {"name":"Psyche Syphon","carried":false,"text":"Psyche Syphon (grab, d6 PSY damage per round, STR Save to break free)","effects":[{"kind":"abilityDamage","ability":"psy","dice":"1d6","perRound":true},{"kind":"save","ability":"str","mode":"escape","escapeBy":"break free"}],"ongoing":true},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Gleam Seeker","text":"PCs with Gleam are always visible to the Leech, regardless of distance. They cannot surprise the creature.","ambush":"immune","ambushUnless":"the ambushing PCs carry no Gleam"},
      {"name":"Immunity","text":"The Leech is immune to damage caused by Mystic Gifts."},
    ],
    bio: "<p>What appears to be a man is merely the beast's shell. From within the ambling corpse's skull blooms a ravenous tangle of questing tendrils. The otherworldly leech is drawn to the brains of active psychics, plunging its rostrum deep into the cerebrum to drink greedily from the stores of power. Its eyeless regard picks out the Gleam of mystics as a man's eyes pick out a fire at dusk.</p><p><b>Gleam Seeker:</b> PCs with Gleam are always visible to the Leech, regardless of distance. They cannot surprise the creature.</p><p><b>Immunity:</b> The Leech is immune to damage caused by Mystic Gifts.</p>" },

  { name: "Quicksilver Exterminator", types: ["synthetic"], level: 10, hp: 40, av: 20, moraleBonus: 15, enc: "1",
    atk: "2 x Slash (d12) + Laser Eyes (d10, beam)",
    abilities: [
      {"name":"Slash","carried":false,"text":"2 x Slash (d12)","effects":[{"kind":"damage","dice":"1d12"}],"count":2},
      {"name":"Laser Eyes","ranged":true,"carried":false,"text":"Laser Eyes (d10, beam)","effects":[{"kind":"damage","dice":"1d10","damageType":"beam"}],"damageTypes":["beam"]},
    ],
    routines: [[0,1]],
    bio: "<p>Merciless shapeshifting liquid metal war-synth. Immune to kinetic damage, fire, acid, radiation, and all poisons. Can only be harmed with extreme cold or hypergeometric weapons.</p>" },

  { name: "Quill Spider", types: ["biological"], level: 2, hp: 8, av: 13, moraleBonus: 5, enc: "d6",
    atk: "Bite (d6) / Quill Spray (d8, blast)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Quill Spray","ranged":true,"carried":false,"text":"Quill Spray (d8, blast)","effects":[{"kind":"damage","dice":"1d8","damageType":"blast"}],"damageTypes":["blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Quills","retaliation":{"on":"miss","damage":2},"text":"If an opponent misses a melee attack against the spider, they suffer 2 damage."},
    ],
    bio: "<p>Loathsome arachnid with a bloated body that bristles with hollow, porcupine-like quills. When threatened, it brushes its back legs across its back, showering the surrounding area with quills.</p><p><b>Quills:</b> If an opponent misses a melee attack against the spider, they suffer 2 damage.</p>" },

  { name: "Infant Ramworm", types: ["biological"], level: 4, hp: 16, av: 16, moraleBonus: 7, enc: "1",
    note: "The source material only details the \"Infant\" stage of this creature — a full-grown adult Ramworm is left to the Referee to scale up.",
    atk: "Ram (d8)",
    abilities: [
      {"name":"Ram","carried":false,"text":"Ram (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    rules: [
      {"name":"Ambusher","text":"Buries itself when on a sandy surface. Strikes from ambush when movement is detected.","ambush":"prompt"},
    ],
    bio: "<p>Carnivorous species of sandworm. Sharp, armoured head resembles the ram mounted on the prow of an ancient warship.</p><p><b>Ambusher:</b> Buries itself when on a sandy surface. Strikes from ambush when movement is detected.</p>" },

  { name: "Regenerator", types: ["biological"], level: 6, hp: 24, av: 15, moraleBonus: 6, enc: "d6",
    atk: "2 x Claw (d6) + Bite (d8) if both claws hit same target",
    abilities: [
      {"name":"Claw","carried":false,"text":"2 x Claw (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":2},
      {"name":"Bite","carried":false,"text":"Bite (d8) if both claws hit same target","effects":[{"kind":"damage","dice":"1d8"}],"condition":"if both claws hit same target","followUp":{"after":"Claw"}},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Regeneration","text":"Regenerators regain +4 HP at the start of their combat round. Dead Regenerators revive within d6 hours. Fire or acid damage prevents this.","perRound":true,"hpTick":{"dice":"4","heal":true}, declaredSpan: null, countdown: { name: "Revival", text: "Dead Regenerators revive within d6 hours. Fire or acid damage prevents this.", declaredSpan: { amount: "d6", unit: "hour" } } },
    ],
    bio: "<p>Towering tumorous mutant. The gene-sculpting that once granted them regenerative powers has reduced them to mindless monsters whose appetite for flesh knows no limit.</p><p><b>Regeneration:</b> Regenerators regain +4 HP at the start of their combat round. Dead Regenerators revive within d6 hours. Fire or acid damage prevents this.</p>" },

  { name: "Rustacean", types: ["biological", "synthetic"], level: 4, hp: 16, av: 18, moraleBonus: 5, enc: "1",
    atk: "Big Claw (d10, corrosive) + Small Claw (d6, corrosive)",
    abilities: [
      {"name":"Big Claw","carried":false,"text":"Big Claw (d10, corrosive)","effects":[{"kind":"damage","dice":"1d10","damageType":"corrosive"},{"kind":"abilityDamage","ability":"con","dice":"1d4","targets":["synthetic"]}],"damageTypes":["corrosive"]},
      {"name":"Small Claw","carried":false,"text":"Small Claw (d6, corrosive)","effects":[{"kind":"damage","dice":"1d6","damageType":"corrosive"},{"kind":"abilityDamage","ability":"con","dice":"1d4","targets":["synthetic"]}],"damageTypes":["corrosive"]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Corrosion","corrodesOnHit":true,"text":"A hit from the Rustacean's claws corrodes a metal item in the target's inventory, rendering it useless. Armour corroded in this fashion loses -1 AV per hit. Synthetic PCs damaged by corrosive claws also suffer d4 CON loss. If there is debate about which item should be corroded by a hit, flip a coin. On heads, the player chooses. On tails, the Rustacean does."},
    ],
    bio: "<p>A crab-like amalgam of chitinous shell and rampant nanotech. The Rustacean feeds on metal corroded by its unusual biology. It is highly territorial and attacks non-metallic creatures as part of a dominance display.</p><p><b>Corrosion:</b> A hit from the Rustacean's claws corrodes a metal item in the target's inventory, rendering it useless. Armour corroded in this fashion loses -1 AV per hit. Synthetic PCs damaged by corrosive claws also suffer d4 CON loss. If there is debate about which item should be corroded by a hit, flip a coin. On heads, the player chooses. On tails, the Rustacean does.</p>" },

  { name: "Sandworm (Adult)", types: ["biological"], level: 50, hp: 200, av: 26, moraleBonus: 12, enc: "1",
    atk: "Slam (5d20) / Swallow Whole (all opponents DEX Save vs death)",
    abilities: [
      {"name":"Slam","carried":false,"text":"Slam (5d20)","effects":[{"kind":"damage","dice":"5d20"}]},
      {"name":"Swallow Whole","text":"Swallow Whole (all opponents DEX Save vs death)","effects":[{"kind":"save","ability":"dex","mode":"resist","vs":"Death"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Colossal","text":"Sandworms take minimum damage from all damage sources."},
    ],
    bio: "<p>The grandest inhabitant of the Interior. Adult sandworms have no natural predators and a lifespan of several millennia. They do not usually notice human-sized travellers but will attack noisy vehicles if provoked, seeking to swallow the offending machine whole.</p><p><b>Colossal:</b> Sandworms take minimum damage from all damage sources.</p>" },

  { name: "Sandworm (Juvenile)", types: ["biological"], level: 10, hp: 40, av: 18, moraleBonus: 9, enc: "1",
    atk: "Slam (2d10) / Swallow Whole (single target DEX Save vs Death)",
    abilities: [
      {"name":"Slam","carried":false,"text":"Slam (2d10)","effects":[{"kind":"damage","dice":"2d10"}]},
      {"name":"Swallow Whole","text":"Swallow Whole (single target DEX Save vs Death)","effects":[{"kind":"save","ability":"dex","mode":"resist","vs":"Death"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>Vaarnish sandworms live the first two stages of their lifecycle as microscopic organisms, before undergoing a rapid metamorphosis into huge majestic filter-feeders. Juveniles, between one and five centuries old, are the size of passenger trains. Some are trained by the Faa to pull sand-sleds, while others roam free in the deepest Interior. Although not predatory, they are aggressive towards sources of unwelcome vibration, like heavy machinery or warding field technology.</p>" },

  { name: "Sawbone Drone", types: ["synthetic"], level: 3, hp: 12, av: 14, moraleBonus: 3, enc: "d4",
    atk: "Surgical Array (Special)",
    abilities: [
      {"name":"Surgical Array","carried":false,"rollsToHit":true,"surgicalArray":true,"text":"Surgical Array (Special)","effects":[{"kind":"special","rule":"Surgical Array"}]},
    ],
    rules: [
      {"name":"Surgical Array","text":"Non-biological targets suffer d8 damage. Biological targets roll d6 for one of the following effects: (1) d6 STR damage, (2) d6 DEX damage, (3) d6 CON damage, (4) roll 2d6 for a random Wound, (5) healed for d8 + CON HP, (6) forcibly 'upgraded' with an Advanced Cybernetic Implant."},
    ],
    bio: "<p>A malfunctioning synthetic surgeon, whose medical knowledge has fragmented along with their memory crystals. They assail passersby with arrays of needles and scalpels.</p><p><b>Surgical Array:</b> Non-biological targets suffer d8 damage. Biological targets roll d6 for one of the following effects: (1) d6 STR damage, (2) d6 DEX damage, (3) d6 CON damage, (4) roll 2d6 for a random Wound, (5) healed for d8 + CON HP, (6) forcibly 'upgraded' with an Advanced Cybernetic Implant.</p>" },

  { name: "Scintillating Swarm", types: ["biological"], level: 0, levelNote: "book gives \"d8\" — built at 0; use Roll for Level", hp: 0, note: "The book gives no HP — 4 per Level, set by Roll for Level.", av: 12, moraleBonus: 1, rolled: { level: { base: 0, dice: "1d8" } }, enc: "1",
    atk: "Swarm (d6, auto-hit, max targets = Swarm's Lvl)",
    abilities: [
      {"name":"Swarm","carried":false,"text":"Swarm (d6, auto-hit, max targets = Swarm's Lvl)","effects":[{"kind":"damage","dice":"1d6"}],"autoHit":true,"targetCount":"Swarm's Level"},
    ],
    rules: [
      {"name":"Ambusher","text":"When motionless, the Swarm appears to be a large cache of golden coins. If approached, they attack in an automatic ambush.","ambush":"always","ambushUnless":"the party never approached the coins"},
      {"name":"Swarmers","text":"The Swarm is comprised of innumerable coin-sized Swarmers, which move and fight as one entity. The Swarm takes half damage from single target attacks but doubled damage from blasting attacks like grenades."},
    ],
    bio: "<p>Gold has lost some of its lustre in this last red age of Urth - as the Faa often remark, one cannot drink an Autarch's crown - but the aureate coinage struck in antiquity still retains its allure. The voracious insectoid lifeforms known as Scintillating Swarmers use mankind's age-old greed to bait their traps, pretending to be golden coins scattered across the sands. When in motion, the creatures reveal their true nature: seven sharp limbs extrude from the rim of the 'coin', and the reverse side hosts a ravenous hidden rostrum. The patterns on the creatures' backs resemble an Autarch's head in profile.</p><p><b>Ambusher:</b> When motionless, the Swarm appears to be a large cache of golden coins. If approached, they attack in an automatic ambush.</p><p><b>Swarmers:</b> The Swarm is comprised of innumerable coin-sized Swarmers, which move and fight as one entity. The Swarm takes half damage from single target attacks but doubled damage from blasting attacks like grenades.</p>" },

  { name: "Scythesliver", types: ["hypergeometric", "synthetic"], level: 5, hp: 20, av: 15, moraleBonus: 10, enc: "d4",
    atk: "2 x Blades (d10)",
    abilities: [
      {"name":"Blades","carried":false,"text":"2 x Blades (d10)","effects":[{"kind":"damage","dice":"1d10"}],"count":2,"weaponTags":["Vibroactive"],"woundOnHit":{"atTotal":20,"wound":"severedLimb"}},
    ],
    rules: [
      {"name":"Sharpness Beyond Measure","text":"Scytheslivers can cut through any material and hit as though their target had AV 10. If a Scythesliver rolls a 20 or higher while attacking, it inflicts a Wound: Severed Limb (3 Slots, -10 STR, -10 DEX)."},
    ],
    bio: "<p>The Ideal Image of Sharpness, an ever-morphing cruciform of hypergeometric metal that cuts through the hardest armour as if it were wet paper. The being is forged of quicksilver poured into 2D rifts in the sky, a whirring flickering knife angel that strikes without mercy and spares without explanation. Presumed to be a creation of the Titans, these synths number amongst the most inscrutable and fearsome creatures that can be found in Vaarn's sealed vaults.</p><p><b>Sharpness Beyond Measure:</b> Scytheslivers can cut through any material and hit as though their target had AV 10. If a Scythesliver rolls a 20 or higher while attacking, it inflicts a Wound: Severed Limb (3 Slots, -10 STR, -10 DEX).</p>" },

  { name: "Seeker of Eyeless Wisdom", types: ["biological", "psychic"], level: 2, hp: 8, av: 11, moraleBonus: 5, enc: "d4",
    atk: "Brain Burster (Special) / Telekinesis (d6, STR Save vs lifted and thrown)",
    abilities: [
      {"name":"Brain Burster","autoHit":true,"text":"Brain Burster (Special)","effects":[{"kind":"escalatingDamage","start":2,"factor":2}]},
      {"name":"Telekinesis","ranged":true,"carried":false,"text":"Telekinesis (d6, STR Save vs lifted and thrown)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"save","ability":"str","mode":"resist","vs":"lifted and thrown"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Brain Burster","text":"An embolism catalysed by psychic malice. For each combat round the Seeker focuses their attention on a target, the target takes unblockable damage, with no to-hit roll required. This damage starts at 2 and doubles each turn, unless the Seeker's focus is broken or if they switch to a new target. Creatures without a brain cannot be harmed by this attack.","perRound":true},
    ],
    bio: "<p>Walkers of the Eyeless Path, seeking endarkenment within the subterranean halls of their hidden temples. Aspirant seekers cloak their eyes in yellow bandages and forgo speech to strengthen their telepathic puissance.</p><p><b>Brain Burster:</b> An embolism catalysed by psychic malice. For each combat round the Seeker focuses their attention on a target, the target takes unblockable damage, with no to-hit roll required. This damage starts at 2 and doubles each turn, unless the Seeker's focus is broken or if they switch to a new target. Creatures without a brain cannot be harmed by this attack.</p>" },

  { name: "Sentry Turret", moraleMode: "none", types: ["synthetic"], level: 1, hp: 4, av: 12, moraleBonus: 0, moraleNote: "-", enc: "d6",
    atk: "Motion-Tracking Gun (always hits target that moved last, d8)",
    abilities: [
      {"name":"Motion-Tracking Gun","ranged":true,"carried":false,"text":"Motion-Tracking Gun (always hits target that moved last, d8)","effects":[{"kind":"damage","dice":"1d8"}],"autoHit":true},
    ],
    bio: "<p>A tripod of silvery legs, on which perches a shiny little gun with a malicious little brain. Attacks anything moving nearby. Speaks with a childish voice. Totally unreasonable and defends its position ferociously.</p>" },

  { name: "Shriekman", types: ["biological"], level: 3, hp: 12, av: 13, moraleBonus: 7, enc: "d8",
    atk: "2 x Claws (d8) / Hypersonic Scream (d6 + DEX save vs Deafened)",
    abilities: [
      {"name":"Claws","carried":false,"text":"2 x Claws (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
      {"name":"Hypersonic Scream","ranged":true,"carried":false,"text":"Hypersonic Scream (d6 + DEX save vs Deafened)","effects":[{"kind":"damage","dice":"1d6"},{"kind":"save","ability":"dex","mode":"resist","vs":"Deafened","onFail":{"wound":"deafened"}}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Deafened","text":"PCs who have been Deafened by a hypersonic scream gain a Wound: Deafened. They cannot hear their surroundings and are always surprised by encounters."},
    ],
    bio: "<p>Abhuman troglodytes, blind and cunning. Their protruding ears and fanged maws give them a grotesque bat-like aspect. They are excellent climbers and can attack from any angle within the depths they inhabit.</p><p><b>Deafened:</b> PCs who have been Deafened by a hypersonic scream gain a Wound: Deafened. They cannot hear their surroundings and are always surprised by encounters.</p>" },

  { name: "Smuggler", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 1, enc: "d12",
    atk: "Wooden Club (d6)",
    abilities: [
      {"name":"Wooden Club","carried":true,"text":"Wooden Club (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    bio: "<p>Lightly armed layabouts, more used to vandalism and intimidation than battle with true adversaries.</p>" },

  { name: "Spambot", types: ["synthetic", "psychic"], level: 1, hp: 4, av: 13, moraleBonus: 3, enc: "d6",
    atk: "Over-firm handshake (d4) / Spamblast (EGO Save vs Wound: Spam Ad)",
    abilities: [
      {"name":"Over-firm handshake","carried":false,"text":"Over-firm handshake (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Spamblast","text":"Spamblast (EGO Save vs Wound: Spam Ad)","effects":[{"kind":"save","ability":"ego","mode":"resist","vs":"Wound: Spam Ad","onFail":{"wound":"spamAd"}}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Spam Ad","text":"Fills one Item Slot. To remove this, make a sale pitch to five strangers regarding the bizarre product filling your consciousness."},
    ],
    bio: "<p>Glitching sales machines. Outriders of a fallen commercial empire. Beam infectious adverts into brains of anything that moves. Dying, they beg you to rate the interaction five stars.</p><p><b>Spam Ad:</b> Fills one Item Slot. To remove this, make a sale pitch to five strangers regarding the bizarre product filling your consciousness.</p>" },

  { name: "Spawn of An-Rah's Brain", types: ["fungal", "psychic"], level: 2, hp: 8, av: 13, moraleBonus: 10, enc: "-",
    atk: "Mind Control (EGO Save to resist)",
    abilities: [
      {"name":"Mind Control","text":"Mind Control (EGO Save to resist)","effects":[{"kind":"save","ability":"ego","mode":"resist","vs":"Mind Control","opposed":true}]},
    ],
    rules: [
      {"name":"Mind Control","text":"Opposed EGO Save to resist mind control. Dominated PCs are forced to make attacks against their fellow vault-raiders."},
    ],
    bio: "<p>Fungal brain walking on two tiny legs. Wears remains of its canopic jar like a hat. Attempts to psychically dominate opponents,</p><p><b>Mind Control:</b> Opposed EGO Save to resist mind control. Dominated PCs are forced to make attacks against their fellow vault-raiders.</p>" },

  { name: "Spawn of An-Rah's Guts", types: ["fungal"], level: 2, hp: 8, av: 13, moraleBonus: 10, enc: "-",
    atk: "Lash (d6) / Acid Spit (d6)",
    abilities: [
      {"name":"Lash","carried":false,"text":"Lash (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Acid Spit","ranged":true,"carried":false,"text":"Acid Spit (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>Octopus-like creature formed from fungus and An-Rah's intestines. Wears canopic jar remains as a hat.</p>" },

  { name: "Spectre of Indifference", types: ["outsider"], level: 1, hp: 4, av: 11, moraleBonus: 12, enc: "d3",
    atk: "Envelop (d8 EGO drain)",
    abilities: [
      {"name":"Envelop","carried":false,"text":"Envelop (d8 EGO drain)","effects":[{"kind":"abilityDamage","ability":"ego","dice":"1d8"}]},
    ],
    rules: [
      {"name":"Incorporeal","text":"Immune to damage from conventional sources. Only hypergeometric or anti-paradoxical weapons harm the Specter."},
      {"name":"Indifference","text":"Those reduced to 0 EGO by a Spectre's touch do not die but are empty of intent and consumed by a terrible blankness. They will not react to any stimuli and die of thirst without intravenous fluids."},
    ],
    bio: "<p>A living fragment of the void between dimensions. A ghastly, hue-less shroud of anti-life that feeds upon conscious thought. Found near extra-dimensional rifts. For reasons unknown, they cannot feed on or be perceived by children.</p><p><b>Incorporeal:</b> Immune to damage from conventional sources. Only hypergeometric or anti-paradoxical weapons harm the Specter.</p><p><b>Indifference:</b> Those reduced to 0 EGO by a Spectre's touch do not die but are empty of intent and consumed by a terrible blankness. They will not react to any stimuli and die of thirst without intravenous fluids.</p>" },

  { name: "Squishwolf", types: ["biological"], level: 4, hp: 16, av: 13, moraleBonus: 5, enc: "2d6",
    atk: "Swallow (d8 ongoing, STR Save to break free)",
    abilities: [
      {"name":"Swallow","carried":false,"text":"Swallow (d8 ongoing, STR Save to break free)","damageTypes":["suffocation"],"effects":[{"kind":"damage","dice":"1d8"},{"kind":"save","ability":"str","mode":"escape","escapeBy":"break free"}],"ongoing":true,"hold":{"dice":"1d8","damageTypes":["suffocation"],"escape":{"ability":"str","by":"break free"}}},
    ],
    rules: [
      {"name":"Jelly-Flesh","text":"Squishwolves can fit through gaps no larger than a closed fist and pursue cunningly through the underground environments they haunt. They take minimum damage from bludgeoning and crushing weapons."},
    ],
    bio: "<p>Loathsome boneless pack-hunters resembling hairless lupine shapes fashioned from pink jelly. They have no fangs but expand their mouths to envelop and suffocate prey.</p><p><b>Jelly-Flesh:</b> Squishwolves can fit through gaps no larger than a closed fist and pursue cunningly through the underground environments they haunt. They take minimum damage from bludgeoning and crushing weapons.</p>" },

  { name: "Star Vampire", types: ["outsider"], level: 6, hp: 24, av: 25, note: "AV drops to 15 once visible — see Invisible below.", moraleBonus: 6, enc: "d3",
    atk: "2 x Tentacles (d8) / Latch (d4 CON drain)",
    abilities: [
      {"name":"Tentacles","carried":false,"text":"2 x Tentacles (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
      {"name":"Latch","carried":false,"text":"Latch (d4 CON drain)","effects":[{"kind":"abilityDamage","ability":"con","dice":"1d4"}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Invisible","text":"Star Vampires are invisible to conventional light sources and always ambush when encountered. Infrared or ulfire light will reveal their true shapes. Once the Vampire latches and begins feeding, the creature becomes visible, as red blood flows through its occluded body. If visible, the creature's AV drops to 15.","ambush":"always","ambushUnless":"infrared or ulfire light has revealed it","avStates":[{"label":"Invisible","av":25},{"label":"Visible","av":15}]},
      {"name":"Star Flesh","text":"The Vampire takes minimum damage from kinetic attacks. Hypergeometric and electrified weapons deal damage as normal."},
    ],
    bio: "<p>To Urth they came, long hungering and riding radiation-waves as fungal spores roil upon the wind. Our light does not love them as it does terrestrial creatures, and so these cosmic vagrants are without shadow or hue, possessing only unseen form. Those unfortunates who glimpse them are given mind of a withered tree or an octopus inverted and affixed with needles.</p><p><b>Invisible:</b> Star Vampires are invisible to conventional light sources and always ambush when encountered. Infrared or ulfire light will reveal their true shapes. Once the Vampire latches and begins feeding, the creature becomes visible, as red blood flows through its occluded body. If visible, the creature's AV drops to 15.</p><p><b>Star Flesh:</b> The Vampire takes minimum damage from kinetic attacks. Hypergeometric and electrified weapons deal damage as normal.</p>" },

  { name: "Stumbling Drone", types: ["synthetic"], level: 2, hp: 8, av: 13, moraleBonus: 8, enc: "d6",
    atk: "Plasma-rifle (d8)",
    abilities: [
      {"name":"Plasma-rifle","ranged":true,"carried":true,"text":"Plasma-rifle (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    rules: [
      {"name":"Overheat","text":"When the Drone's plasma-rifle deals maximum damage, the synth shuts down for a turn afterwards.", declaredSpan: { amount: "1", unit: "round" } },
    ],
    bio: "<p>Staggering boxy war-synths. When flipped on their backs they cannot right themselves.</p><p><b>Overheat:</b> When the Drone's plasma-rifle deals maximum damage, the synth shuts down for a turn afterwards.</p>" },

  { name: "Subtle Stalker", types: ["synthetic"], level: 3, hp: 12, av: 22, note: "AV drops to 11 if camouflage is disrupted — see bio.", moraleBonus: 8, enc: "1",
    atk: "2 x Slash (d8)",
    abilities: [
      {"name":"Slash","carried":false,"text":"2 x Slash (d8)","effects":[{"kind":"damage","dice":"1d8"}],"count":2},
    ],
    rules: [
      {"name":"Active Camouflage","text":"Always ambushes unless PCs have infrared vision. If camouflage is disrupted, the Stalker's AV drops to 11.","ambush":"always","ambushUnless":"the PCs have infrared vision","avStates":[{"label":"Camouflaged","av":22},{"label":"Camouflage disrupted","av":11}]},
    ],
    bio: "<p>Sadistic, mantis-shaped synth.</p><p><b>Active Camouflage:</b> Always ambushes unless PCs have infrared vision. If camouflage is disrupted, the Stalker's AV drops to 11.</p>" },

  { name: "Synth Skeleton", types: ["synthetic"], level: 1, hp: 4, av: 11, moraleBonus: 1, enc: "d8",
    atk: "Chrome Claws (d6)",
    abilities: [
      {"name":"Chrome Claws","carried":false,"text":"Chrome Claws (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    rules: [
      {"name":"Skeletal","text":"The Synth Skeleton takes minimum damage from slashing and stabbing attacks."},
    ],
    bio: "<p>The forlorn remnants of damaged synths, stripped down to the barest essentials over the years. Insane and covetous, they relentlessly attack synths to harvest them for parts.</p><p><b>Skeletal:</b> The Synth Skeleton takes minimum damage from slashing and stabbing attacks.</p>" },

  { name: "Tarantella", types: ["biological"], level: 7, hp: 28, av: 14, moraleBonus: 5, enc: "1",
    atk: "2 x Fangs (d8 + CON Save vs d4 rounds of Tarantism)",
    abilities: [
      {"name":"Fangs","carried":false,"text":"2 x Fangs (d8 + CON Save vs d4 rounds of Tarantism)","effects":[{"kind":"damage","dice":"1d8"},{"kind":"save","ability":"con","mode":"resist","vs":"d4 rounds of Tarantism","inflicts":"Tarantism","duration":{"amount":"1d4","unit":"round"}}],"count":2},
    ],
    rules: [
      {"name":"Tarantism","text":"The afflicted must use all available combat actions on wild dancing movement. Repressing the urge to dance deals d8 damage for each alternative combat action taken."},
    ],
    bio: "<p>The 'dancing horror'. A blue-furred spider, grown to monstrous proportions. The creature's venom induces a dancing madness in those it bites.</p><p><b>Tarantism:</b> The afflicted must use all available combat actions on wild dancing movement. Repressing the urge to dance deals d8 damage for each alternative combat action taken.</p>" },

  { name: "Temple Guard", types: ["biological"], metalArmour: true, level: 3, hp: 12, av: 15, moraleBonus: 7, enc: "d10",
    atk: "Heavy Club (d10) / Net (DEX Save vs Entangled)",
    abilities: [
      {"name":"Heavy Club","carried":true,"text":"Heavy Club (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Net","text":"Net (DEX Save vs Entangled)","effects":[{"kind":"save","ability":"dex","mode":"resist","vs":"Entangled","condition":"entangled"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>White-masked soldier slaves. Do everything they can to avoid spilling red blood inside the Great Temple of the Promised Sun. Not so squeamish outside.</p>" },

  { name: "Thermasaur", types: ["biological", "mineral"], level: 12, hp: 48, av: 13, moraleBonus: 10, enc: "1",
    atk: "4 x Claws (d6) + Bite (2d6) + Aura (Special, see below)",
    abilities: [
      {"name":"Claws","carried":false,"text":"4 x Claws (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":4},
      {"name":"Bite","carried":false,"text":"Bite (2d6)","effects":[{"kind":"damage","dice":"2d6"}]},
      {"name":"Aura","text":"Aura (Special, see below)","effects":[{"kind":"special","rule":"Variable Temperature"}]},
    ],
    routines: [[0,1,2]],
    rules: [
      {"name":"Variable Temperature","text":"Each round, the Thermasaur can change its body temperature between searingly hot and bitterly cold. See below for more.","avStates":[{"label":"Heat Aura","av":13},{"label":"Cold Aura","av":18}]},
      {"name":"Heat Aura","text":"Deals d10 unblockable fire damage per round. Melee weapons used against the creature become too hot to hold, and must be dropped for one round to cool off. The Thermasaur's AV is 13, and it always acts first in combat.","perRound":true,"dropsMeleeWeapons":true,"hpTick":{"dice":"1d10","to":"targets","damageTypes":["flame"]}},
      {"name":"Cold Aura","text":"Deals d4 unblockable DEX damage per round. At 0 DEX, characters are frozen in place and cannot act. The Thermasaur's AV is 18, and it always acts last in combat.","perRound":true,"auraAbilityDamage":{"ability":"dex","dice":"1d4","atZero":"is frozen in place and cannot act"}},
    ],
    bio: "<p>An extrasolar predator, able to alter its body temperature through unusual chemical reactions inside its strange silicate skin. The creature resembles a lizard but has six limbs and attains the size of an armoured vehicle. It attacks by raising the temperature of its skin to furnace-like levels, cooking its prey via proximity. The beast is also capable of lowering its body temperature to sub-zero, draining heat from the air around it.</p><p><b>Variable Temperature:</b> Each round, the Thermasaur can change its body temperature between searingly hot and bitterly cold. See below for more.</p><p><b>Heat Aura:</b> Deals d10 unblockable fire damage per round. Melee weapons used against the creature become too hot to hold, and must be dropped for one round to cool off. The Thermasaur's AV is 13, and it always acts first in combat.</p><p><b>Cold Aura:</b> Deals d4 unblockable DEX damage per round. At 0 DEX, characters are frozen in place and cannot act. The Thermasaur's AV is 18, and it always acts last in combat.</p>" },

  { name: "Thornthrower Cactus", types: ["biological"], level: 4, hp: 20, av: 12, moraleBonus: 6, enc: "d6",
    atk: "2 x Thorn Fling (d4)",
    abilities: [
      {"name":"Thorn Fling","ranged":true,"carried":false,"text":"2 x Thorn Fling (d4)","effects":[{"kind":"damage","dice":"1d4"}],"count":2},
    ],
    rules: [
      {"name":"Spines","retaliation":{"on":"miss","damage":4},"text":"If an opponent misses a melee attack against the Thornthrower Cactus, they take 4 damage from the long spines."},
    ],
    bio: "<p>Ferocious ambulatory cactus, covered in hollow spines the size of daggers. Thornthrowers fire spines into the soft tissue of the throat, which take root in the corpse and drain it of fluid.</p><p><b>Spines:</b> If an opponent misses a melee attack against the Thornthrower Cactus, they take 4 damage from the long spines.</p>" },

  { name: "Thunderstrike Bird", types: ["biological", "synthetic"], level: 12, hp: 48, av: 20, note: "AV drops to 15 if grounded — see bio.", moraleBonus: 12, enc: "1",
    atk: "Harpoon (d12, electrical) / Talons (2d8)",
    abilities: [
      {"name":"Harpoon","ranged":true,"carried":false,"text":"Harpoon (d12, electrical)","effects":[{"kind":"damage","dice":"1d12","damageType":"electrical"}],"damageTypes":["electrical"]},
      {"name":"Talons","carried":false,"text":"Talons (2d8)","effects":[{"kind":"damage","dice":"2d8"}]},
    ],
    routines: [[0],[1]],
    // Live AV Computation wiring, RULED 2026-09-25 (Matt): the book names no rule, so this one is named here to carry the AV buttons.
    rules: [
      {"name":"Grounded","text":"AV drops to 15 if grounded.","avStates":[{"label":"Airborne","av":20},{"label":"Grounded","av":15}]},
    ],
    bio: "<p>Terrifying biomechanical predator. Fires an electrical harpoon which punches straight through armour. Attempts to reel character back in, requiring a STR Save to break free. Otherwise, it pulls you up into the sky and tears at you with claws. AV drops to 15 if grounded.</p>" },

  { name: "Tiger Fly", types: ["biological"], level: 2, hp: 8, av: 13, moraleBonus: 5, enc: "d6",
    atk: "Sting (d8)",
    abilities: [
      {"name":"Sting","carried":false,"text":"Sting (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>Dog-sized mutant wasps. Highly protective of their nests. If you kill one, d6 more Tiger Flies arrive to investigate within three rounds.</p>" },

  { name: "Titan Acolyte", types: ["biological", "synthetic"], level: 3, hp: 12, av: 16, moraleBonus: 5, enc: "d8",
    atk: "Vibro-Dagger (d4, hits as if target has -5 AV) / Volt Crossbow (d6, electrical)",
    abilities: [
      {"name":"Vibro-Dagger","carried":true,"text":"Vibro-Dagger (d4, hits as if target has -5 AV)","effects":[{"kind":"damage","dice":"1d4"},{"kind":"avAsIf","amount":-5}]},
      {"name":"Volt Crossbow","ranged":true,"carried":true,"text":"Volt Crossbow (d6, electrical)","effects":[{"kind":"damage","dice":"1d6","damageType":"electrical"}],"damageTypes":["electrical"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Cybernetics","text":"All Titan Acolytes bear a randomly generated Cybernetic Implant, proof of their devotion to wire and chrome.","generate":"implant"},
    ],
    bio: "<p>Biological beings may hold the rank of acolyte only, forbidden from ascending the pyramid of wisdom. They assist the Chromepriests with their studies and slavishly augment themselves.</p><p><b>Cybernetics:</b> All Titan Acolytes bear a randomly generated Cybernetic Implant, proof of their devotion to wire and chrome.</p>" },

  { name: "Troika", types: ["synthetic"], level: 3, hp: 12, av: 13, moraleBonus: 3, enc: "d6",
    atk: "3 x Kick (d6)",
    abilities: [
      {"name":"Kick","carried":false,"text":"3 x Kick (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":3},
    ],
    bio: "<p>Pinwheel of synthetic legs that tumbles through the blue wastelands, kicking everything it can find. Utterly inexplicable and widely hated.</p>" },

  { name: "Tumblesnare", moraleMode: "always", types: ["synthetic"], level: 2, hp: 8, av: 14, moraleBonus: 0, moraleNote: "Always Flees", enc: "d6",
    atk: "Grab (followed by rolling damage)",
    abilities: [
      {"name":"Grab","carried":false,"rollsToHit":true,"text":"Grab (followed by rolling damage)","effects":[{"kind":"special","rule":"Tumble"},{"kind":"save","ability":"dex","mode":"escape","escapeBy":"work their way free","opposed":true}]},
    ],
    rules: [
      {"name":"Tumble","text":"After a successful grab, the snare rolls across the dunes with its prey still entangled in its body, causing increasing bludgeoning damage each round. The damage starts at d4 and rises to d12. Prisoners of the tumblesnare must make an opposed DEX Save to work their way free.","perRound":true},
      {"name":"Ambusher","text":"The Tumblesnare always strikes from ambush if encountered on open sands.","ambush":"prompt"},
    ],
    bio: "<p>Predatory synths resembling burrs of silver wire. Wait under the sand until stepped on, at which point they strike. After a successful grab, the snare rolls across the dunes with its prey still entangled in its body, causing increasing bludgeoning damage each round. The damage starts at d4 and rises to d12. Prisoners of the tumblesnare must make an opposed DEX Save to work their way free. Once the snare has killed a victim, it spends days refuelling, using the fluids and proteins from the broken body.</p><p>Tumblesnares have no means of aggression besides their ambushes and always flee if their attack fails.</p><p><b>Ambusher:</b> The Tumblesnare always strikes from ambush if encountered on open sands.</p>" },

  { name: "Turretwright", types: ["synthetic"], level: 5, hp: 20, av: 14, moraleBonus: 5, enc: "1",
    atk: "Deploy Protocol (creates a Sentry Turret) / Repair Protocol (+d6 HP to Synthetic target)",
    abilities: [
      {"name":"Deploy Protocol","text":"Deploy Protocol (creates a Sentry Turret)","effects":[{"kind":"special","see":"biography"}]},
      {"name":"Repair Protocol","text":"Repair Protocol (+d6 HP to Synthetic target)","effects":[{"kind":"heal","dice":"1d6","target":"Synthetic"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>Ancient synth, a doughnut of chrome with twelve restless arm-legs. Trundles through Vaarn, deploying Sentry Turrets for no discernible reason. Highly protective of its horrible 'children'. Sings while it works.</p>" },

  { name: "Unfolder", types: ["hypergeometric"], level: 9, hp: 36, av: 16, moraleBonus: 9, enc: "1",
    atk: "Envelop (STR Save vs Special)",
    abilities: [
      {"name":"Envelop","text":"Envelop (STR Save vs Special)","effects":[{"kind":"save","ability":"str","mode":"resist","vs":"Special","onFail":{"hold":{"loss":{"ability":"str","dice":"1d6"},"escape":{"ability":"str","by":"break free","assumed":true}}}}]},
    ],
    rules: [
      {"name":"Immunity","text":"Unfolders are immune to damage from mundane sources. Only hypergeometric weapons harm them."},
      {"name":"Envelop","text":"Enveloped creatures are held in place and cannot move or attack. They are drained of d6 STR per round. While digesting the Unfolder is immobile and cannot flee.","perRound":true},
    ],
    bio: "<p>Exalted servants of the Jigsaw Autarch, which resemble depth-less cloaks made of skin. Serve as the Court's assassins, devouring scholars who pry too far into the mysteries of the Labyrinth.</p><p><b>Immunity:</b> Unfolders are immune to damage from mundane sources. Only hypergeometric weapons harm them.</p><p><b>Envelop:</b> Enveloped creatures are held in place and cannot move or attack. They are drained of d6 STR per round. While digesting the Unfolder is immobile and cannot flee.</p>" },

  // Spirit Form (2026-09-27, Matt's design): the unquiet spirit a dead PC can
  // become (Miscellany/Resurrection and Death, "Returning as a Spirit"). Not a
  // book creature - a stat block for the book's rule, like the Part III
  // generics. Spawned by the Resurrect Character macro as "Spirit of <PC>";
  // Level, HP and abilities come from the PC at spawn, so the numbers here are
  // placeholders. No creature type is stated; none is set. Its three abilities
  // are `usable` (usable-ability.js), not attacks: it has none.
  { name: "Unquiet Spirit", types: [], level: 1, hp: 1, av: 10, moraleBonus: 0, enc: "",
    atk: "None",
    abilities: [],
    rules: [
      {"name":"Incorporeal","text":"A luminous golden-blue projection of the dead PC. Can be seen, but cannot normally touch the material world, and passes through solid walls. Immune to damage from conventional sources."},
      {"name":"Manipulate Object","text":"May spend d6 HP to lift or manipulate a physical object."},
      {"name":"Possess","text":"May spend d6 + the target's Level HP to possess a living creature for one Exploration Turn."},
      {"name":"Fade","text":"Reduced to 0 HP by its exertions, the spirit fades into the aether and reappears at sunrise the next day."},
    ],
    usable: [
      {"name":"Manipulate Object","text":"Spend d6 HP to lift or manipulate a physical object.","hpCost":{"dice":"1d6"}},
      {"name":"Possess","text":"Spend d6 + the target's Level HP to possess a living creature for one Exploration Turn. Target the creature first.","hpCost":{"dice":"1d6","plusTargetLevel":true},"applies":{"name":"Possessed","text":"Possessed by an unquiet spirit, which acts through this body for one Exploration Turn.","rounds":1,"unit":"turn"}},
      {"name":"Long Rest","text":"The spirit reappears at sunrise: HP restored to full. It needs no rations.","restoreHp":"full"},
    ],
    bio: "<p>A dead PC who has marshalled their Blue and Golden Souls to become an unquiet spirit. Spirits are incorporeal: they can be seen, appearing as a luminous golden-blue projection of the dead PC, but cannot normally touch the material world and can pass through solid walls.</p><p><b>Manipulate Object:</b> A spirit may spend d6 HP to lift or manipulate a physical object.</p><p><b>Possess:</b> A spirit may spend d6 + the target's Level HP to possess a living creature for one Exploration Turn.</p><p><b>Fade:</b> Spirits reduced to 0 HP by their exertions fade into the aether and reappear at sunrise the next day.</p>" },

  { name: "Unicorn", types: ["biological"], level: 1, hp: 4, av: 11, moraleBonus: 1, enc: "2d6",
    // Travel and Rations (Matt, 2026-09-23): the flesh is inedible, so no Raw
    // Meat; the book is silent on the blood, and Matt allows it - the whole
    // yield comes off as Fresh Blood. butchery.js reads flags.vaarn.carcass.
    carcass: { yields: "blood", why: "Their flesh is full of glitter, rendering it inedible." },
    atk: "Horn (d6)",
    abilities: [
      {"name":"Horn","carried":false,"text":"Horn (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    bio: "<p>Genesculpted pests, their ancestors supposedly created to entertain an Autarch's daughters. Tiny white equines with golden hooves and long, coiling horns upon their heads. In truth, there is more goat and narwhal than horse in their bloodline, and the beasts are untamable and impossible to eradicate. They are omnivorous, rapacious, territorial, fast-breeding, and - to add insult to injury - their flesh is full of glitter, rendering it inedible.</p>" },

  // NOT A BESTIARY-CHAPTER CREATURE. Save-Gated Effect (2026-09-13): the
  // Usurper Arm's failure branch turns the parasite limb hostile, and Matt
  // ruled it "needs to be an actor" rather than a card describing one. The
  // stat line is the book's own, printed inside the Nanomachine Infections
  // entry rather than in the Bestiary — "The limb is level 2, AV 17, and
  // deals d6 damage. Missed attacks against the limb damage the host
  // instead." So it is book content in the wrong chapter, not an invention.
  //
  // It is therefore CODE-ONLY: no vault file backs it, and vault-drift.mjs
  // reports it in that column by design. Do not "fix" that by writing a
  // vault file for it — the vault transcribes chapters, and this creature
  // does not live in one.
  //
  // TWO FIELDS THE BOOK DOES NOT PRINT, both ruled 2026-09-13 (Matt) rather
  // than inferred here: types is `synthetic` ("by machine, do you mean
  // 'Synthetic'? that's what it should be"), and morale is never-flees. HP
  // is not a third — 8 is Bestiary.md's own Level x 4.
  { name: "Usurper Arm", moraleMode: "never", types: ["synthetic"], level: 2, hp: 8, av: 17, moraleBonus: 0, moraleNote: "Never Flees", enc: "1",
    atk: "Parasite Limb (d6)",
    abilities: [
      {"name":"Parasite Limb","carried":false,"text":"Parasite Limb (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    rules: [
      {"name":"Bound to the Host","text":"missed attacks against the limb damage the host instead.","boundToHost":true},
    ],
    bio: "<p>A parasitic cyborg arm, grown from malignant nanomachinery somewhere it was never wanted. Usually dormant; when the host calls on it and fails to dominate it, it turns on them for the rest of the fight.</p><p><b>Bound to the Host:</b> missed attacks against the limb damage the host instead.</p>" },

  { name: "Viridian Ooze", types: ["fungal"], level: 4, hp: 16, av: 9, moraleBonus: 8, enc: "1",
    atk: "Engulf (d3 CON damage, STR Save to break free)",
    abilities: [
      {"name":"Engulf","carried":false,"text":"Engulf (d3 CON damage, STR Save to break free)","effects":[{"kind":"abilityDamage","ability":"con","dice":"1d3"},{"kind":"save","ability":"str","mode":"escape","escapeBy":"break free"}]},
    ],
    rules: [
      {"name":"Engulf","text":"Each successful Engulf creates a new Viridian Ooze, with a Lvl equal to the CON lost."},
      {"name":"Resistance","text":"The Ooze takes half damage from kinetic attacks. It suffers 3d8 damage per round from exposure to extreme heat.","perRound":true,"hpTick":{"dice":"3d8"}},
    ],
    bio: "<p>An antic colony of green slime, like phlegm coughed from the throat of a ravenous god. The Ooze's embrace marries digestion with cytokinesis, birthing heirs in seconds from the biomass consumed.</p><p><b>Engulf:</b> Each successful Engulf creates a new Viridian Ooze, with a Lvl equal to the CON lost.</p><p><b>Resistance:</b> The Ooze takes half damage from kinetic attacks. It suffers 3d8 damage per round from exposure to extreme heat.</p>" },

  { name: "Void Dragon", types: ["synthetic"], level: 15, hp: 60, av: 30, moraleBonus: 15, enc: "1",
    atk: "Apocalypse Beam (2d10 beam + 3d6 blast)",
    abilities: [
      {"name":"Apocalypse Beam","ranged":true,"carried":false,"text":"Apocalypse Beam (2d10 beam + 3d6 blast)","effects":[{"kind":"damage","dice":"2d10","damageType":"beam"},{"kind":"damage","dice":"3d6","damageType":"blast"}],"damageTypes":["beam","blast"]},
    ],
    rules: [
      {"name":"Enormous","text":"The Void Dragon is so large that PCs can enter its body through coolant vents, if they are able to attach themselves to its carapace as it flies. Finding the Dragon's core reactor and destroying it will send the creature into a lethal meltdown."},
    ],
    bio: "<p>Gigantic flying war-synth, armoured with interlocking plates of void-tempered metal. Its multiple sets of wings are powered by a cold fusion reactor, and it emits a powerful beam of concentrated antimatter that can boil solid rock. The creature is geared to fight in the air, in orbit, beneath the waves, or inside a pocket dimension with equal ferocity. These beings are always found dormant, conserving energy for the apocalypse of all apocalypses - an extrasolar war that never broke out. Some sleep in high-altitude arbors orbiting the Urth, while others slumber upon great hoards of golden superconductors in the deepest lead-lined warvaults beneath Vaarn. Some have sought to rouse these giants. None have returned to speak of it.</p><p><b>Enormous:</b> The Void Dragon is so large that PCs can enter its body through coolant vents, if they are able to attach themselves to its carapace as it flies. Finding the Dragon's core reactor and destroying it will send the creature into a lethal meltdown.</p>" },

  { name: "Voltworm", types: ["synthetic"], level: 1, hp: 4, av: 12, moraleBonus: 3, enc: "d6",
    atk: "Electrobolt (d6, electrical, ADV to hit Synths or metal armour)",
    abilities: [
      {"name":"Electrobolt","ranged":true,"carried":false,"text":"Electrobolt (d6, electrical, ADV to hit Synths or metal armour)","effects":[{"kind":"damage","dice":"1d6","damageType":"electrical"},{"kind":"advantage","against":"Synths or metal armour","types":["synthetic"],"metalArmour":true}],"damageTypes":["electrical"]},
    ],
    rules: [
      {"name":"Ambusher","text":"The Voltworm strikes from ambush if encountered indoors.","ambush":"prompt"},
    ],
    bio: "<p>Segmented synthetic worms, feeding upon and emitting electrical energy. Easily mistaken for ancient cabling, when lying at rest.</p><p><b>Ambusher:</b> The Voltworm strikes from ambush if encountered indoors.</p>" },

  { name: "Walking Womb", types: ["biological"], level: 5, hp: 20, av: 11, moraleBonus: 10, enc: "d4",
    atk: "Slam (d8)",
    abilities: [
      {"name":"Slam","carried":false,"text":"Slam (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>Shambling blind mound of pregnant flesh. On death, births d6 Foetal Predators (LVL 1, AV 13, d6 bite). Fire prevents this.</p>" },

  { name: "Weekling", types: ["biological"], level: 1, hp: 4, av: 10, moraleBonus: 0, enc: "d10",
    atk: "Unarmed (d4)",
    abilities: [
      {"name":"Unarmed","carried":false,"text":"Unarmed (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>Emaciated, mindless clones of Rappash-Ik. They are naked and have the minds of feral, unlettered beasts. Farmed for meat by Janus and Mimir. The Weeklings hate their captors and will kill them if they can.</p>" },

  { name: "Windweird", types: ["biological", "psychic"], level: 1, hp: 4, av: 11, moraleBonus: 4, enc: "d6",
    atk: "War Kite (d6) / Stolen Breath (EGO save vs d6 choking, ongoing)",
    abilities: [
      {"name":"War Kite","ranged":true,"carried":true,"text":"War Kite (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Stolen Breath","ranged":true,"carried":false,"text":"Stolen Breath (EGO save vs d6 choking, ongoing)","damageTypes":["suffocation"],"effects":[{"kind":"damage","dice":"1d6","onFailedSave":true},{"kind":"save","ability":"ego","mode":"resist","vs":"d6 choking","onFail":{"hold":{"dice":"1d6","damageTypes":["suffocation"],"escape":{"ability":"ego","by":"break free"}}}}],"ongoing":true},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Raise the Winds","text":"Windweirds can change the weather with their chants. One hour of chanting produces a Dust Storm, two hours raises a Sandstorm, and three hours can summon a Prismatic Tempest. Once summoned, the weather effect remains for the rest of the day (see Weather). The mystics can also calm storms.","activity":{"verb":"Chant","options":[{"label":"Dust Storm","amount":1,"unit":"hour"},{"label":"Sand Storm","amount":2,"unit":"hour"},{"label":"Prismatic Tempest","amount":3,"unit":"hour"}]}, declaredSpan: { amount: "1", unit: "day" } },
    ],
    bio: "<p>Mystics, azure-robed and masked in pale wood. Known in some lands as the Tempestari. They are a sect of stormtamers and cloudtasters, whose songs calm or enrage the five winds of Vaarn. They are equally at home amongst the isles of the Sea of Songs or in Vaarn's great Interior deserts, for both expanses are the kingdom of the winds and their sect's members command a high price for their service.</p><p><b>Raise the Winds:</b> Windweirds can change the weather with their chants. One hour of chanting produces a Dust Storm, two hours raises a Sandstorm, and three hours can summon a Prismatic Tempest. Once summoned, the weather effect remains for the rest of the day (see Weather). The mystics can also calm storms.</p>" },

  { name: "Witchgrub", types: ["biological"], level: 0, hp: 1, av: 10, moraleBonus: 1, enc: "d8",
    atk: "Corrosive Spit (d4, -1 AV)",
    abilities: [
      {"name":"Corrosive Spit","ranged":true,"carried":false,"text":"Corrosive Spit (d4, -1 AV)","effects":[{"kind":"damage","dice":"1d4"},{"kind":"avChange","amount":-1}]},
    ],
    bio: "<p>Bloated grubs, the length of a man's arm, with a decoy humanoid face swelling above their real mandibles. Eat decaying flesh, the riper the better, and defend themselves with jets of acidic spit. Said to be juvenile witches, hence the name, although this is unproven.</p>" },

  { name: "Xanthous Mycomorph", types: ["fungal"], level: 0, levelNote: "book gives \"d6*\" — built at 0; use Roll for Level. The Level then increases as it consumes corpses", av: 9, hp: 0, note: "The book gives no HP — 4 per Level, set by Roll for Level.", moraleBonus: 10, rolled: { level: { base: 0, dice: "1d6" } }, enc: "1",
    atk: "Slam (d8) + Spore Spray (d10, fungal, blast)",
    abilities: [
      {"name":"Slam","carried":false,"text":"Slam (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Spore Spray","ranged":true,"carried":false,"text":"Spore Spray (d10, fungal, blast)","effects":[{"kind":"damage","dice":"1d10","damageType":"blast"}],"damageTypes":["blast"]},
    ],
    routines: [[0,1]],
    rules: [
      {"name":"Kinetic Resistance","text":"Takes minimum damage from kinetic weapons."},
      {"name":"Regenerative Mass","text":"Regains HP equal to its Lvl at the start of a combat round. 'Dead' Xanthous Mycomorphs revive within d6 hours. Damage caused by fire or acid prevents this. If the Mycomorph consumes a biological corpse, it gains Lvls equal to those of the dead creature.", "perRound": true, declaredSpan: null, countdown: { name: "Revival", text: "'Dead' Xanthous Mycomorphs revive within d6 hours. Damage caused by fire or acid prevents this.", declaredSpan: { amount: "d6", unit: "hour" } } },
    ],
    bio: "<p>Mass of yellow necrotech fungus that engulfs corpses, using them as fuel to grow ever larger.</p><p><b>Kinetic Resistance:</b> Takes minimum damage from kinetic weapons.</p><p><b>Regenerative Mass:</b> Regains HP equal to its Lvl at the start of a combat round. 'Dead' Xanthous Mycomorphs revive within d6 hours. Damage caused by fire or acid prevents this. If the Mycomorph consumes a biological corpse, it gains Lvls equal to those of the dead creature.</p>" },

  { name: "Xeric Triffid", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 8, enc: "d10",
    atk: "Lash (d6) / Blinding Spit (CON Save vs Blindness, d6 rounds)",
    abilities: [
      {"name":"Lash","carried":false,"text":"Lash (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Blinding Spit","text":"Blinding Spit (CON Save vs Blindness, d6 rounds)","effects":[{"kind":"save","ability":"con","mode":"resist","vs":"Blindness, d6 rounds","condition":"blind","duration":{"amount":"1d6","unit":"round"}}], declaredSpan: null },
    ],
    routines: [[0],[1]],
    rules: [
    ],
    bio: "<p>Walking, carnivorous plants, descended from a larger virulent species brought to Urth from the stars in a forgotten era. Xeric Triffids are adapted to a low-moisture environment, with thick skin and small waxy leaves. They remain rooted during the heat of the day but become mobile at dawn and twilight, stalking on three large roots in search of prey.</p>" },

  { name: "Yurling", types: ["biological", "fungal"], devoursMetal: true, level: 1, hp: 4, av: 14, moraleBonus: 1, enc: "2d6",
    atk: "Bite (d4 or steal metal item)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d4 or steal metal item)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    bio: "<p>Tiny, monkey-like mutants covered in symbiotic white fungus. Exclusively eat metal. If a Yurling scores a hit, it can choose to steal and devour a metal object from the target's inventory instead of dealing damage.</p>" },

  { name: "Zenithlight Negatick", types: ["outsider"], level: 9, hp: 36, av: 12, moraleBonus: 5, enc: "d4",
    atk: "Zenithlight Infusion (Special)",
    abilities: [
      {"name":"Zenithlight Infusion","text":"Zenithlight Infusion (Special)","effects":[{"kind":"special","rule":"Zenithlight Infusion"},{"kind":"save","ability":"str","mode":"escape","escapeBy":"escape the grab"},{"kind":"tempHp","dice":"1d8","burstAt":2}]},
    ],
    rules: [
      {"name":"Zenithlight Infusion","text":"the Negatick grabs the target and pumps them full of paraodixcal zenithlight. The victim gains +d8 temporary HP per round. This temporary HP can exceed the character's maximum HP. If temporary HP is more than double the character's maximum HP, they explode into flurries of zenithlight and die. STR Save to escape the grab.","perRound":true},
      {"name":"Negaflesh","text":"the Negatick gains HP when damage and loses HP if healed."},
    ],
    bio: "<p>Extradimensional parasites, glassy-bodied and vaguely insectoid. Presumed to have been carried into our reality clinging to the body of something much vaster. Their stomachs bloat with impossible zenithlight when hungry and shrink to nothingness when full.</p><p><b>Zenithlight Infusion:</b> the Negatick grabs the target and pumps them full of paraodixcal zenithlight. The victim gains +d8 temporary HP per round. This temporary HP can exceed the character's maximum HP. If temporary HP is more than double the character's maximum HP, they explode into flurries of zenithlight and die. STR Save to escape the grab.</p><p><b>Negaflesh:</b> the Negatick gains HP when damage and loses HP if healed.</p>" },

  { name: "Zoanthrope", moraleMode: "gm", types: ["biological"], level: 2, hp: 8, av: 10, moraleBonus: 0, moraleNote: "Group Size", enc: "d10",
    atk: "Bite (d6) / Thrown Rock (d6)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
      {"name":"Thrown Rock","ranged":true,"carried":true,"text":"Thrown Rock (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>Humans who willingly surrendered their higher reasoning to live as beasts. Divested of shame and language, they live as their antediluvian ancestors did. Farmed for meat by newbeasts.</p>" },
];
