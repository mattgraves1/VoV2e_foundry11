/**
 * Vaarn Pets — the 11 pet stat blocks from the Explorer's Guide.
 *
 * Transcribed 2026-09-13 from the CRIMSON HOUND 07-05-26 preview text extract,
 * cross-read against C:\vaarn\vaarn\rules\Core Rules\Pets.md. The book is the
 * source and the vault is a transcription of it, so where the two disagreed the
 * book won: the vault gave Bonsai Triffid Morale -1 and the book prints +1.
 * The vault line was corrected the same day.
 *
 * RE-TRANSCRIBED 2026-09-19 FROM JADE IBIS 15-09-26, ruled by Matt, when the
 * Companion Ration Upkeep build found the Pets chapter had never been brought
 * to JADE. Three stat changes: Volt Rat's Jolt d6 -> d4, Mycomastiff Fungal ->
 * Biological / Fungal, Pet Rock Level 1 (4 HP) -> Level 0 (1 HP). Every bio
 * and rule sentence now matches JADE word for word; two of those carry rules
 * - Hunter fires "when traveling through wilderness" (was "beneath open
 * skies") and Watchdog Protocol answers a "kinetic attack" (was "physical").
 *
 * WHY A SEPARATE ROSTER RATHER THAN MORE OF BESTIARY. A pet is genuinely a
 * Level/AV/Morale stat block — that is why all 11 atoms point at Creature Stat
 * Block Import and why this file needs no reader of its own; buildCreatureDoc
 * builds these unchanged. What differs is what they are FOR. A pet is a thing a
 * PC owns, not a thing they meet, and everything that reads BESTIARY reads it
 * as encounter content. Keeping them apart is also what lets Companion Advancement,
 * Companion Level Limit and Companion Ration Upkeep address "the pets" as a
 * set. RULED 2026-09-13 (Matt): its own compendium, vaarn.pets, with Steeds to
 * follow in vaarn.steeds rather than sharing one.
 *
 * Schema is bestiary-data.js's, minus and plus one field each:
 *   no `enc`    - an encounter count is meaningless for something a PC owns,
 *                 and the book prints none. buildSystem defaults it to "".
 *   itemSlots   - carrying capacity, printed only for Companion Ooze (10).
 *                 INERT TODAY: nothing reads it. Stored anyway because the
 *                 book prints it, so the drift checker can defend it, and
 *                 because Matt's stated goal 2026-09-13 is for the Ooze to
 *                 become an alternative place to drop and retrieve items,
 *                 the way the dropped-items container already works. Filed
 *                 as Container Slot Capacity; this is the number it needs.
 *
 * HP IS NOT PRINTED FOR ANY PET except Exultant's Hawk's explicit "0 (1 HP)".
 * RULED 2026-09-13 (Matt): use the Bestiary's documented formula default,
 * Level x 4, which is Bestiary.md's own "to calculate average HP, multiply
 * Level by 4". Every Level 1 pet is therefore 4 HP. The Hawk carries the
 * book's own number instead, because the book gives one.
 *
 * JADE PRINTS HP FOR EVERY PET, and every figure it prints is Level x 4 (or
 * 1 HP at Level 0), so the ruling above and the book now agree.
 *
 * The levelling rule is Companion Advancement's and is deliberately not encoded
 * here.
 */

export const PETS = [
  { name: "Bonsai Triffid", types: ["biological"], level: 1, hp: 4, av: 11, moraleBonus: 1,
    atk: "Vines (d4) / Blinding Spit (DEX Save vs Blinded for 1 round)",
    abilities: [
      {"name":"Vines","carried":false,"text":"Vines (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Blinding Spit","text":"Blinding Spit (DEX Save vs Blinded for 1 round)","effects":[{"kind":"save","ability":"dex","mode":"resist","vs":"Blinded for 1 round","condition":"blind","duration":{"amount":1,"unit":"round"}}], declaredSpan: null },
    ],
    routines: [[0],[1]],
    bio: "<p>A walking carnivorous plant, pruned into reluctant obedience over many years. Like its larger siblings, it can spit toxic liquid, blinding the unwary.</p>" },

  { name: "Citrine-Coated Volt Rat", types: ["biological"], level: 1, hp: 4, av: 13, moraleBonus: 3,
    atk: "Jolt (d4, electrical)",
    abilities: [
      {"name":"Jolt","carried":false,"text":"Jolt (d4, electrical)","effects":[{"kind":"damage","dice":"1d4","damageType":"electrical"}],"damageTypes":["electrical"]},
    ],
    bio: "<p>A yellow-furred rodent, able to generate bioelectric charges from its forked tail. Traditionally held inside a prison orb and released to fight other small beasts.</p>" },

  { name: "Companion Ooze", types: ["biological"], level: 1, hp: 4, av: 9, moraleBonus: 5, itemSlots: 10,
    atk: "Engulf (d4 ongoing, STR Save to break free)",
    abilities: [
      {"name":"Engulf","carried":false,"text":"Engulf (d4 ongoing, STR Save to break free)","effects":[{"kind":"damage","dice":"1d4"},{"kind":"save","ability":"str","mode":"escape","escapeBy":"break free"}],"ongoing":true},
    ],
    rules: [
      {"name":"Gelatinous","text":"Immune to bludgeoning or crushing damage. Given time, the ooze can work its way through any fissure or keyhole."},
    ],
    bio: "<p>A friendly ooze, which loves to hold shiny things inside its body. A good place to store excess valuables, if you don't mind them getting sticky.</p><p><b>Gelatinous:</b> Immune to bludgeoning or crushing damage. Given time, the ooze can work its way through any fissure or keyhole.</p>" },

  { name: "Exultant's Hawk", types: ["biological", "synthetic"], level: 0, hp: 1, av: 16, moraleBonus: 3,
    // Travel and Rations (Matt, 2026-09-23): the Hunter rule's "ration of bird
    // meat" is Raw Meat, brought to the owner by Start the day (daily-yield.js).
    dailyYield: { rule: "Hunter", item: "Raw Meat", count: 1 },
    atk: "Claws (d4)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    rules: [
      {"name":"Hunter","text":"When traveling through wilderness, the hawk brings its owner one ration of bird meat per day."},
    ],
    bio: "<p>A hunting hawk, enhanced with flesh-machine interfaces. Only bred for the Exultants of the New Hegemony; this example was presumably stolen.</p><p><b>Hunter:</b> When traveling through wilderness, the hawk brings its owner one ration of bird meat per day.</p>" },

  { name: "Glue Worm", types: ["biological"], level: 1, hp: 4, av: 11, moraleBonus: 1,
    // Diet-Matched Ration Consumption (Matt, 2026-09-23): "Must be fed raw
    // meat." Raw Meat takes the place of its Food Ration and it still drinks,
    // as the rule replaces a Carnivore's meal rather than adding to it.
    dietRation: "Raw Meat",
    atk: "Nip (d4) / Glue Spit (STR Save vs Entangled)",
    abilities: [
      {"name":"Nip","carried":false,"text":"Nip (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Glue Spit","text":"Glue Spit (STR Save vs Entangled)","effects":[{"kind":"save","ability":"str","mode":"resist","vs":"Entangled","condition":"entangled"}]},
    ],
    routines: [[0],[1]],
    bio: "<p>A tiny, tamed relative of the predatory Leopard Worms of Vaarn. Must be fed raw meat.</p>" },

  { name: "Little Torino", types: ["biological"], level: 1, hp: 4, av: 15, moraleBonus: 5,
    atk: "Little Horn (d6)",
    abilities: [
      {"name":"Little Horn","carried":false,"text":"Little Horn (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    bio: "<p>The ancients delighted in making pets of all Urth's inhabitants. The little torino is a toy species of rhino, the size of a french bulldog.</p>" },

  { name: "Mycomastiff", types: ["biological", "fungal"], level: 1, hp: 4, av: 12, moraleBonus: 3,
    atk: "Bite (d4) / Spores (d4 TOX, Blast)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Spores","carried":false,"text":"Spores (d4 TOX, Blast)","effects":[{"kind":"damage","dice":"1d4","damageType":"tox"},{"kind":"sporeDepletion"}],"damageTypes":["tox","blast"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Spores","text":"After each spore attack, the Mycomastiff must CON Save. On failure, no more spores can be expelled without a Long Rest."},
    ],
    bio: "<p>Most mycomorphic fungal strains were designed to resurrect human cadavers and are incompatible with other species. However, a rare substrain exclusively reanimates canine corpses.</p><p><b>Spores:</b> After each spore attack, the Mycomastiff must CON Save. On failure, no more spores can be expelled without a Long Rest.</p>" },

  // No `abilities`. The book gives this one a SENTENCE where every other entry
  // gives a named attack, and bestiary-data.js's convention for that (Matt,
  // 2026-08-18) is to keep `atk` verbatim and let it stay text-only in the
  // biography rather than invent a segment name to hang a weapon Item on.
  { name: "Pet Rock", types: ["mineral"], level: 0, hp: 1, av: 20, moraleBonus: 10,
    noHealRule: "Living Stone",
    // Companion Ration Upkeep (2026-09-19): "does not eat, drink, or breathe",
    // so it is neither fed nor rested and can never go unfed. Names the rule,
    // as rest.js's RATION_FREE does for a Lithling or a Synth.
    rationFree: "Living Stone",
    atk: "The pet rock is innocent of violence but may be thrown for d4 damage.",
    rules: [
      {"name":"Living Stone","text":"The pet rock does not eat, drink, or breathe. It cannot regain HP by any means."},
    ],
    bio: "<p>A humble blue stone of Vaarn, granted sentience and mobility by powers unknown. It rolls after its master in the manner of some lithic supplicant, eager to help however it can. It cannot make a sound but will warn of danger by bumping politely into one's shin.</p><p><b>Living Stone:</b> The pet rock does not eat, drink, or breathe. It cannot regain HP by any means.</p>" },

  { name: "Ray Cat", types: ["biological"], level: 1, hp: 4, av: 13, moraleBonus: 4,
    atk: "Claws (d4) / Laser Eyes (d4, beam)",
    abilities: [
      {"name":"Claws","carried":false,"text":"Claws (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Laser Eyes","carried":false,"text":"Laser Eyes (d4, beam)","effects":[{"kind":"damage","dice":"1d4","damageType":"beam"}],"damageTypes":["beam"]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Geiger Kitty","text":"Ray cats change colour in the presence of hazardous radiation, fur shifting from blue to red."},
    ],
    bio: "<p>One of the delicate blue cats of Vaarn. Ray cats are bred to absorb ambient radiation from the atmosphere and emit it in beautiful searing rays.</p><p><b>Geiger Kitty:</b> Ray cats change colour in the presence of hazardous radiation, fur shifting from blue to red.</p>" },

  { name: "Skunkey", types: ["biological"], level: 1, hp: 4, av: 12, moraleBonus: 1,
    atk: "Thrown Rock (d4) / Stench Spray (CON Save vs vomiting)",
    abilities: [
      {"name":"Thrown Rock","carried":true,"text":"Thrown Rock (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
      {"name":"Stench Spray","text":"Stench Spray (CON Save vs vomiting)","effects":[{"kind":"save","ability":"con","mode":"resist","vs":"vomiting","inflicts":"Stench Spray","applied":{"conditions":["disSavesAndAttacks"]},"duration":{"amount":"1","unit":"round"},"targets":["biological"]}]},
    ],
    routines: [[0],[1]],
    rules: [
      {"name":"Stench Spray","text":"Biological targets must CON Save. On failure, they are wracked by vomiting, taking DIS on all Saves and attack rolls during the next turn. Creatures without noses or digestive tracts are immune."},
    ],
    bio: "<p>A lithe black-furred primate with a bold white stripe down its back. The skunkey defends itself with a repulsive chemical spray, so pungent prospective predators sometimes die from vomiting.</p><p><b>Stench Spray:</b> Biological targets must CON Save. On failure, they are wracked by vomiting, taking DIS on all Saves and attack rolls during the next turn. Creatures without noses or digestive tracts are immune.</p>" },

  { name: "Synthhound", types: ["synthetic"], level: 1, hp: 4, av: 13, moraleBonus: 10,
    atk: "Bite (d4)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d4)","effects":[{"kind":"damage","dice":"1d4"}]},
    ],
    rules: [
      {"name":"Watchdog Protocol","text":"If a kinetic attack would kill the synthhound's owner, it kills the synthhound instead.","watchdog":true},
    ],
    bio: "<p>A synthetic hound, programmed to display suicidal loyalty to its owner. Pants to cool its ego-engines.</p><p><b>Watchdog Protocol:</b> If a kinetic attack would kill the synthhound's owner, it kills the synthhound instead.</p>" },
];
