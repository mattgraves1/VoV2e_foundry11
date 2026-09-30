/**
 * Vaarn Followers and Mercenaries — the two d20 + EGO recruitment tables.
 *
 * Transcribed 2026-09-18 from the vault's Core Rules/Followers.md and
 * Mercenaries.md, whose prose and tables were brought to JADE IBIS 15-09-26
 * the same day. The rows were parsed out of the vault tables by script rather
 * than retyped, and every structured field below is derived from the printed
 * attack or description text on the same row.
 *
 * A ROW IS NOT A CHARACTER. RULED 2026-09-06 and 2026-09-18 (Matt): every
 * column rolls its own d20 + EGO, and Name alone rolls a flat d30, "because
 * gating an NPC's name on the PC's EGO is nonsensical". So a generated
 * follower takes its Level from one row, its AV from another, its attack from
 * a third. Rows are kept whole here only because that is how the book prints
 * them and how the drift checkers can compare them. `roll` is the printed key;
 * index 0 is the "0-1" row, index N is roll N.
 *
 * WHAT THE STRUCTURED FIELDS ARE, and what they deliberately are not:
 *   attack.dice          the printed die, which is the damage. RULED
 *                        2026-09-18 (Matt): the weapon NAME is recorded and
 *                        never read for tags. "Nano-edged Greatsword (2d8)" is
 *                        not a Nano-edged weapon; see Composed Follower and
 *                        Mercenary Generation for why these names cannot be
 *                        read as the book's tags.
 *   attack.damageTypes   printed inside the parentheses: beam, blast, flame,
 *                        electrical, TOX, hypergeometric.
 *   attack.tags          only Piercing, which the Railgun prints inside the
 *                        parentheses as a rule, not in its name.
 *   attack.autoHitVs     the Tesla Cannon's "auto-hit synth targets".
 *   attack.failChance    the Ancient Grenades' "50% chance to not detonate".
 *   description.ancestry the ancestry the description names ("Boxy synth ...").
 *                        Written by script 2026-09-19 and checked: each of the
 *                        60 names exactly one. Read through chargen's
 *                        ANCESTRY_CREATURE_TYPES for the creature type, so the
 *                        type follows the DESCRIPTION column, not the stats.
 *   description.avBonus  a printed "+N AV", added to the rolled AV.
 *   description.noHealRule  Vanise is a lithling who "cannot heal": the
 *                        Lithling rule's name, Inevitable, as chargen uses it.
 *   description.rule     a clause the GM runs, written into the biography.
 *
 * HP is the book's number printed beside each Level, not rolled (Matt,
 * 2026-09-18).
 */

/**
 * The prose rules each kind of hireling carries in its biography, from the
 * vault files as brought to JADE IBIS 2026-09-18. RULED 2026-09-18 (Matt):
 * item slots are the only one of these that gets a mechanic; the rest are
 * text the GM reads.
 */
export const HIRELING_RULES = {
  follower: [
    ["Level Limit", "The combined Level of all Followers under a PC's command cannot exceed that PC's EGO."],
    ["Rations", "Each Follower requires a ration of food and water each adventuring day. Followers not fed for three days in a row desert at the first opportunity."],
    ["Combat", "Followers will fight alongside PCs, taking orders from their leader, but must pass a Morale Save upon witnessing an allied character's death. They use their own Morale or their leader's EGO, whichever is highest. On failure, the Follower flees and hides for the rest of the combat."],
    ["Burdens", "Followers have item slots equal to 10 + their Level. They will carry whatever they are bidden."],
    ["Advancement", "Followers may be given XP by the PC who leads them. They advance at the same rate as PCs and gain +4 HP for each new Level."],
  ],
  mercenary: [
    ["Level Limit", "The combined Level of all Mercenaries under a PC's command cannot exceed that PC's EGO."],
    ["Rations and Payment", "Each Mercenary requires a ration of food and water each adventuring day. Mercenaries who are not fed for three days in a row desert at the first opportunity. Mercenaries expect to be paid an Exotica (or similar value) after each expedition. If a Mercenary does not receive payment, they leave the group and become a sworn foe of the PCs. The Referee should consider how they intend to take revenge."],
    ["Combat", "Mercenaries will fight alongside the PCs. They take orders from the PC who hired them, refusing obviously suicidal orders. Mercenaries are used to danger but make a Morale Save in extreme circumstances, such as all PCs being incapacitated."],
    ["Burdens", "Mercenaries are not porters and will not carry baggage for you."],
    ["Advancement", "The destinies of Mercenaries are separate from those of the PCs, and they do not gain Levels while in service."],
  ],
};

export const FOLLOWER_ROWS = [
  { roll: "0–1", name: "Herta", level: 0, hp: 1, av: 10, moraleBonus: 0,
    attack: {"name":"Rolling Pin","text":"Rolling Pin (d4)","dice":"1d4"},
    description: {"text":"Elderly new-falcon wearing a glitching video-mask","ancestry":"Newbeast"} },
  { roll: "2", name: "Kinmoon", level: 0, hp: 1, av: 10, moraleBonus: 0,
    attack: {"name":"Bookbinder's Awl","text":"Bookbinder's Awl (d4)","dice":"1d4"},
    description: {"text":"Aged mycomorph with a brittle, spiny body","ancestry":"Mycomorph"} },
  { roll: "3", name: "Ophinus", level: 0, hp: 1, av: 10, moraleBonus: 0,
    attack: {"name":"Sling","text":"Sling (d4)","dice":"1d4"},
    description: {"text":"True-kin with virulent facial rash","ancestry":"True-kin"} },
  { roll: "4", name: "Wellet", level: 0, hp: 1, av: 10, moraleBonus: 0,
    attack: {"name":"Heavy Stick","text":"Heavy Stick (d4)","dice":"1d4"},
    description: {"text":"Cacogen with long flexible limbs","ancestry":"Cacogen"} },
  { roll: "5", name: "Roscar", level: 0, hp: 1, av: 10, moraleBonus: 0,
    attack: {"name":"Dried Cactus in Sock","text":"Dried Cactus in Sock (d4)","dice":"1d4"},
    description: {"text":"Synth with barrel-shaped body, leaks blue ikor","ancestry":"Synth"} },
  { roll: "6", name: "Antfancy", level: 0, hp: 1, av: 10, moraleBonus: 1,
    attack: {"name":"Throws Darts","text":"Throws Darts (d4)","dice":"1d4"},
    description: {"text":"Cacogen with broad yellow leaves for hair","ancestry":"Cacogen"} },
  { roll: "7", name: "Lusaki", level: 0, hp: 1, av: 10, moraleBonus: 1,
    attack: {"name":"Gardener's Trowel","text":"Gardener's Trowel (d4)","dice":"1d4"},
    description: {"text":"Mycomorph with enormous, damp black head","ancestry":"Mycomorph"} },
  { roll: "8", name: "Scula", level: 0, hp: 1, av: 10, moraleBonus: 1,
    attack: {"name":"Bag of Worthless Coins","text":"Bag of Worthless Coins (d4)","dice":"1d4"},
    description: {"text":"True-kin with braided hair and a missing eye","ancestry":"True-kin"} },
  { roll: "9", name: "Caleon", level: 1, hp: 4, av: 10, moraleBonus: 1,
    attack: {"name":"Leather Belt","text":"Leather Belt (d4)","dice":"1d4"},
    description: {"text":"New-cat wearing a mirrored mask","ancestry":"Newbeast"} },
  { roll: "10", name: "Teleo", level: 1, hp: 4, av: 10, moraleBonus: 1,
    attack: {"name":"Screwdriver","text":"Screwdriver (d4)","dice":"1d4"},
    description: {"text":"Synth with a rusty falcon-like body","ancestry":"Synth"} },
  { roll: "11", name: "Abrax", level: 1, hp: 4, av: 11, moraleBonus: 2,
    attack: {"name":"Blunt Training Sword","text":"Blunt Training Sword (d4)","dice":"1d4"},
    description: {"text":"Cacogen with short blunt horns","ancestry":"Cacogen"} },
  { roll: "12", name: "Greyoul", level: 1, hp: 4, av: 11, moraleBonus: 2,
    attack: {"name":"Broken Trumpet","text":"Broken Trumpet (d4)","dice":"1d4"},
    description: {"text":"Corpulent true-kin with crimson eyes","ancestry":"True-kin"} },
  { roll: "13", name: "Bluebliss", level: 1, hp: 4, av: 11, moraleBonus: 2,
    attack: {"name":"Hypodermic Needle","text":"Hypodermic Needle (d4)","dice":"1d4"},
    description: {"text":"New-toad with cheap cybernetic limbs","ancestry":"Newbeast"} },
  { roll: "14", name: "Greeze", level: 1, hp: 4, av: 11, moraleBonus: 2,
    attack: {"name":"Rusted Dagger","text":"Rusted Dagger (d4)","dice":"1d4"},
    description: {"text":"Boxy synth with a missing head","ancestry":"Synth"} },
  { roll: "15", name: "Henex", level: 1, hp: 4, av: 11, moraleBonus: 2,
    attack: {"name":"Carpenter's Saw","text":"Carpenter's Saw (d4)","dice":"1d4"},
    description: {"text":"Mycomorph with soft, greying flesh","ancestry":"Mycomorph"} },
  { roll: "16", name: "Longdream", level: 1, hp: 4, av: 11, moraleBonus: 3,
    attack: {"name":"Old Revolver","text":"Old Revolver (d6)","dice":"1d6"},
    description: {"text":"True-kin with a tiny body and hunched back","ancestry":"True-kin"} },
  { roll: "17", name: "Chattan", level: 2, hp: 8, av: 11, moraleBonus: 3,
    attack: {"name":"Ancestral Sword","text":"Ancestral Sword (d6)","dice":"1d6"},
    description: {"text":"New-anenome with a sorrowful crone mask","ancestry":"Newbeast"} },
  { roll: "18", name: "Xaphor", level: 2, hp: 8, av: 11, moraleBonus: 3,
    attack: {"name":"Shepherd's Staff","text":"Shepherd's Staff (d6)","dice":"1d6"},
    description: {"text":"Cacogen with five legs","ancestry":"Cacogen"} },
  { roll: "19", name: "Naigallow", level: 2, hp: 8, av: 11, moraleBonus: 3,
    attack: {"name":"Axe","text":"Axe (d6)","dice":"1d6"},
    description: {"text":"Synth with a silver, childlike body","ancestry":"Synth"} },
  { roll: "20", name: "Willing", level: 2, hp: 8, av: 11, moraleBonus: 3,
    attack: {"name":"Wooden Club","text":"Wooden Club (d6)","dice":"1d6"},
    description: {"text":"Glowering true-kin wearing plastic clothes","ancestry":"True-kin"} },
  { roll: "21", name: "Aalder", level: 2, hp: 8, av: 12, moraleBonus: 4,
    attack: {"name":"Sharp Crystal","text":"Sharp Crystal (d6)","dice":"1d6"},
    description: {"text":"Cacogen with a prehensile beard","ancestry":"Cacogen"} },
  { roll: "22", name: "Daeros", level: 2, hp: 8, av: 12, moraleBonus: 4,
    attack: {"name":"Whip","text":"Whip (d6)","dice":"1d6"},
    description: {"text":"New-addax with ritual scars","ancestry":"Newbeast"} },
  { roll: "23", name: "Erken", level: 2, hp: 8, av: 12, moraleBonus: 4,
    attack: {"name":"Bow","text":"Bow (d6)","dice":"1d6"},
    description: {"text":"Mycomorph with an eyeless crimson head","ancestry":"Mycomorph"} },
  { roll: "24", name: "Goldwin", level: 2, hp: 8, av: 12, moraleBonus: 4,
    attack: {"name":"Volt Baton","text":"Volt Baton (d6, electrical)","dice":"1d6","damageTypes":["electrical"]},
    description: {"text":"Synth with an ape-like body emitting smoke","ancestry":"Synth"} },
  { roll: "25", name: "Patina", level: 3, hp: 12, av: 12, moraleBonus: 4,
    attack: {"name":"Pick Axe","text":"Pick Axe (d6)","dice":"1d6"},
    description: {"text":"True-kin with long blonde hair and lacy attire","ancestry":"True-kin"} },
  { roll: "26", name: "Magdan", level: 3, hp: 12, av: 12, moraleBonus: 5,
    attack: {"name":"Shovel","text":"Shovel (d6)","dice":"1d6"},
    description: {"text":"Cacogen with plated head (+1 AV)","ancestry":"Cacogen","avBonus":1} },
  { roll: "27", name: "Khawari", level: 3, hp: 12, av: 12, moraleBonus: 5,
    attack: {"name":"Hammer","text":"Hammer (d6)","dice":"1d6"},
    description: {"text":"New-mantis with child's face mask","ancestry":"Newbeast"} },
  { roll: "28", name: "Yarsan", level: 3, hp: 12, av: 12, moraleBonus: 5,
    attack: {"name":"Nomad's Rifle","text":"Nomad's Rifle (d8)","dice":"1d8"},
    description: {"text":"Mycomorph with a speckled, leathery head","ancestry":"Mycomorph"} },
  { roll: "29", name: "Cheontra", level: 3, hp: 12, av: 12, moraleBonus: 5,
    attack: {"name":"3 Ancient Grenades","text":"3 Ancient Grenades (d8, blast, 50% chance to not detonate)","dice":"1d8","damageTypes":["blast"],"failChance":{"percent":50,"text":"50% chance to not detonate"}},
    description: {"text":"Synth with white priest-like body, worships a bee hive","ancestry":"Synth"} },
  { roll: "30", name: "Audrew", level: 3, hp: 12, av: 12, moraleBonus: 5,
    attack: {"name":"Lasrifle","text":"Lasrifle (d8, beam)","dice":"1d8","damageTypes":["beam"]},
    description: {"text":"True-kin with expensive ape-fur clothing","ancestry":"True-kin"} },
];

export const MERCENARY_ROWS = [
  { roll: "0–1", name: "Ekateria", level: 2, hp: 8, av: 12, moraleBonus: 5,
    attack: {"name":"Jewelled Dagger","text":"Jewelled Dagger (d6)","dice":"1d6"},
    description: {"text":"Cacogen with vestigial feathered wings","ancestry":"Cacogen"} },
  { roll: "2", name: "Whiss", level: 2, hp: 8, av: 12, moraleBonus: 5,
    attack: {"name":"Crystal Club","text":"Crystal Club (d6)","dice":"1d6"},
    description: {"text":"New-wolf wearing a necklace of human teeth","ancestry":"Newbeast"} },
  { roll: "3", name: "Nevermont", level: 2, hp: 8, av: 12, moraleBonus: 5,
    attack: {"name":"Holy Flail","text":"Holy Flail (d6)","dice":"1d6"},
    description: {"text":"True-kin wearing a fearsome, gilded mask","ancestry":"True-kin"} },
  { roll: "4", name: "Clori", level: 2, hp: 8, av: 12, moraleBonus: 5,
    attack: {"name":"Laspistol","text":"Laspistol (d6, beam)","dice":"1d6","damageTypes":["beam"]},
    description: {"text":"Synth with a chrome, pyramid-shaped body","ancestry":"Synth"} },
  { roll: "5", name: "Groak", level: 3, hp: 12, av: 12, moraleBonus: 5,
    attack: {"name":"Black War-Fan","text":"Black War-Fan (d6)","dice":"1d6"},
    description: {"text":"Mycomorph with a glossy, skull-like head","ancestry":"Mycomorph"} },
  { roll: "6", name: "Ulfendrop", level: 3, hp: 12, av: 13, moraleBonus: 6,
    attack: {"name":"Venomous Knife","text":"Venomous Knife (d6 TOX)","dice":"1d6","damageTypes":["tox"]},
    description: {"text":"Faa nomad with a long blue beard","ancestry":"Faa Nomad"} },
  { roll: "7", name: "Panaga", level: 3, hp: 12, av: 13, moraleBonus: 6,
    attack: {"name":"Chrome Revolver","text":"Chrome Revolver (d6)","dice":"1d6"},
    description: {"text":"Cacklemaw wearing a wedding dress","ancestry":"Cacklemaw Exile"} },
  { roll: "8", name: "Sunrise", level: 3, hp: 12, av: 13, moraleBonus: 6,
    attack: {"name":"Quicksilver Sling","text":"Quicksilver Sling (d6)","dice":"1d6"},
    description: {"text":"Handsome true-kin, claims descent from an Autarch","ancestry":"True-kin"} },
  { roll: "9", name: "Lupe", level: 4, hp: 16, av: 13, moraleBonus: 6,
    attack: {"name":"Nomad's Rifle","text":"Nomad's Rifle (d8)","dice":"1d8"},
    description: {"text":"Warty cacogen with infravision","ancestry":"Cacogen"} },
  { roll: "10", name: "Mud", level: 4, hp: 16, av: 13, moraleBonus: 6,
    attack: {"name":"Nomad's Mace","text":"Nomad's Mace (d8)","dice":"1d8"},
    description: {"text":"Synth with a transparent, serpent-like body","ancestry":"Synth"} },
  { roll: "11", name: "Ratch", level: 4, hp: 16, av: 14, moraleBonus: 7,
    attack: {"name":"Biomechanical Sword","text":"Biomechanical Sword (d8)","dice":"1d8"},
    description: {"text":"New-gibbon wearing quicksilver rings","ancestry":"Newbeast"} },
  { roll: "12", name: "Xharo", level: 4, hp: 16, av: 14, moraleBonus: 7,
    attack: {"name":"Ornate Lasrifle","text":"Ornate Lasrifle (d8, beam)","dice":"1d8","damageTypes":["beam"]},
    description: {"text":"Mycomorph with a pink, veil-like head","ancestry":"Mycomorph"} },
  { roll: "13", name: "Episgrasso", level: 5, hp: 20, av: 14, moraleBonus: 7,
    attack: {"name":"Plasma Rapier","text":"Plasma Rapier (d8)","dice":"1d8"},
    description: {"text":"Cadaverous Faa nomad, coughing (1-in-6 chance to die each week)","ancestry":"Faa Nomad","rule":{"name":"Coughing","text":"1-in-6 chance to die each week."}} },
  { roll: "14", name: "Charity", level: 5, hp: 20, av: 14, moraleBonus: 7,
    attack: {"name":"Ritual Crossbow","text":"Ritual Crossbow (d8)","dice":"1d8"},
    description: {"text":"Cacklemaw with blackened nubs for teeth","ancestry":"Cacklemaw Exile"} },
  { roll: "15", name: "Aret", level: 5, hp: 20, av: 14, moraleBonus: 7,
    attack: {"name":"Fungal Spear","text":"Fungal Spear (d8)","dice":"1d8"},
    description: {"text":"True-kin with heavily burned face","ancestry":"True-kin"} },
  { roll: "16", name: "Imehnit", level: 5, hp: 20, av: 15, moraleBonus: 8,
    attack: {"name":"Sky-Iron Greatsword","text":"Sky-Iron Greatsword (d10)","dice":"1d10"},
    description: {"text":"Cacogen with powerful, horse-like legs","ancestry":"Cacogen"} },
  { roll: "17", name: "Lementer", level: 6, hp: 24, av: 15, moraleBonus: 8,
    attack: {"name":"Blasphemous Shotgun","text":"Blasphemous Shotgun (d10)","dice":"1d10"},
    description: {"text":"Synth with tank-treads","ancestry":"Synth"} },
  { roll: "18", name: "Vasildos", level: 6, hp: 24, av: 15, moraleBonus: 8,
    attack: {"name":"Obsidian Trident","text":"Obsidian Trident (d10)","dice":"1d10"},
    description: {"text":"New-wolf, committed vegetarian","ancestry":"Newbeast"} },
  { roll: "19", name: "Damatra", level: 6, hp: 24, av: 15, moraleBonus: 8,
    attack: {"name":"Plasma Rifle","text":"Plasma Rifle (d10)","dice":"1d10"},
    description: {"text":"Mycomorph with poisonous, peach-pink flesh","ancestry":"Mycomorph"} },
  { roll: "20", name: "Inthus", level: 6, hp: 24, av: 15, moraleBonus: 8,
    attack: {"name":"Luminous War Hammer","text":"Luminous War Hammer (d10)","dice":"1d10"},
    description: {"text":"Faa nomad with implanted night-vision lenses","ancestry":"Faa Nomad"} },
  { roll: "21", name: "Goosehilda", level: 7, hp: 28, av: 16, moraleBonus: 9,
    attack: {"name":"Grenade Launcher","text":"Grenade Launcher (d10, blast)","dice":"1d10","damageTypes":["blast"]},
    description: {"text":"Cacklemaw with lustrous fur, always combing it","ancestry":"Cacklemaw Exile"} },
  { roll: "22", name: "Kanak", level: 7, hp: 28, av: 16, moraleBonus: 9,
    attack: {"name":"Inferno Cannon","text":"Inferno Cannon (d10, flame)","dice":"1d10","damageTypes":["flame"]},
    description: {"text":"Short true-kin with golden teeth","ancestry":"True-kin"} },
  { roll: "23", name: "Birksop", level: 7, hp: 28, av: 16, moraleBonus: 9,
    attack: {"name":"Heavy Lasgun","text":"Heavy Lasgun (d10, beam)","dice":"1d10","damageTypes":["beam"]},
    description: {"text":"Headless cacogen, four purple eyes on chest","ancestry":"Cacogen"} },
  { roll: "24", name: "Mannoch", level: 7, hp: 28, av: 16, moraleBonus: 9,
    attack: {"name":"Tesla Cannon","text":"Tesla Cannon (d10, electrical, auto-hit synth targets)","dice":"1d10","damageTypes":["electrical"],"autoHitVs":"synthetic"},
    description: {"text":"Synth with one cyclopean black eye","ancestry":"Synth"} },
  { roll: "25", name: "Croxley", level: 8, hp: 32, av: 16, moraleBonus: 9,
    attack: {"name":"Railgun","text":"Railgun (d12, piercing)","dice":"1d12","tags":["Piercing"]},
    description: {"text":"New-raven wearing funeral attire","ancestry":"Newbeast"} },
  { roll: "26", name: "Nussof", level: 8, hp: 32, av: 17, moraleBonus: 10,
    attack: {"name":"Port-A-Cannon","text":"Port-A-Cannon (d12, blast)","dice":"1d12","damageTypes":["blast"]},
    description: {"text":"Mycomorph with a black, spiny body","ancestry":"Mycomorph"} },
  { roll: "27", name: "Uck", level: 8, hp: 32, av: 17, moraleBonus: 10,
    attack: {"name":"Nano-edged Greatsword","text":"Nano-edged Greatsword (2d8)","dice":"2d8"},
    description: {"text":"Faa nomad with a silver tongue","ancestry":"Faa Nomad"} },
  { roll: "28", name: "Ricola", level: 8, hp: 32, av: 17, moraleBonus: 10,
    attack: {"name":"Doom Gauntlets","text":"Doom Gauntlets (2d6)","dice":"2d6"},
    description: {"text":"Cacklemaw with three rows of teeth","ancestry":"Cacklemaw Exile"} },
  { roll: "29", name: "Yarrange", level: 9, hp: 36, av: 18, moraleBonus: 10,
    attack: {"name":"Annihilation Ray","text":"Annihilation Ray (d12, beam)","dice":"1d12","damageTypes":["beam"]},
    description: {"text":"Planeywoman with luminous veins","ancestry":"Planeyfolk"} },
  { roll: "30", name: "Vanise", level: 9, hp: 36, av: 19, moraleBonus: 10,
    attack: {"name":"Neon Hypersword","text":"Neon Hypersword (d12, hypergeometric)","dice":"1d12","damageTypes":["hypergeometric"]},
    description: {"text":"Tall yellow lithling (+5 AV, cannot heal)","ancestry":"Lithling","avBonus":5,"noHealRule":"Inevitable"} },
];
