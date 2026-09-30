/**
 * Vaarn Steeds — the 8 steed stat blocks from the Explorer's Guide.
 *
 * Transcribed 2026-09-13 from the CRIMSON HOUND 07-05-26 preview text extract,
 * cross-read against C:\vaarn\vaarn\rules\Steeds\*.md. SIX VALUES CAME FROM THE
 * BOOK AGAINST THE VAULT, which is more than the pets roster needed and is the
 * reason to say so here: three Morale bonuses were sign-flipped in the vault
 * (Burden Bird, Thin Mare and Weeping Lizard all read negative where all three
 * preview editions on disk print positive), and three attack lines used "/"
 * where the book prints "+". The vault was corrected the same day.
 *
 * THE SEPARATOR IS NOT COSMETIC. "+" means both attacks land and "/" means
 * choose between them — the same distinction bestiary-data.js encodes in
 * `routines`. Destrier is (Bite AND Kick) OR Charge, which is why its routines
 * read [[0,1],[2]] rather than [[0],[1],[2]].
 *
 * NOT STALENESS, checked before concluding the vault was wrong: SABLE GECKO
 * 07-04-26 and ONYX LOTUS 29-01-26 print the same values as CRIMSON HOUND, so
 * no edition changed under the transcription. And it is not systemic — the
 * whole 157-creature Bestiary carries no negative Morale at all and
 * bestiary-drift.mjs passes, so the flip is bounded to the two companion files.
 *
 * Schema is bestiary-data.js's, minus and plus the same fields pets-data.js
 * changes, plus one more:
 *   no `enc`           - an encounter count is meaningless for a mount.
 *   itemSlots          - carrying capacity, which every steed prints and which
 *                        is the one structural difference from a creature.
 *                        INERT TODAY, DEFERRED against Container Slot Capacity.
 *   itemSlotsSpecial   - Thin Mare only. See below.
 *
 * HP IS NOT PRINTED FOR ANY STEED. Level x 4, the Bestiary formula default,
 * ruled for pets 2026-09-13 (Matt) and applied here unchanged.
 *   SUPERSEDED 2026-09-18: JADE IBIS prints HP for every steed. Seven match
 *   Level x 4; the Weeping Lizard prints 16 at Level 3, and the printed figure
 *   is used.
 *
 * RE-TRANSCRIBED FROM JADE IBIS 15-09-26 on 2026-09-18, vault first, at Matt's
 * request after the Vehicles turned out an edition stale. Stat changes: Burden
 * Bird Morale +1; Weeping Lizard 16 HP; Destrier's attack is now Gore (d10) /
 * Charge. Every description and rule paragraph was reworded to match.
 *
 * THIN MARE'S CAPACITY: the book's table prints "Special" rather than a number,
 * and its Internal Storage rule then states 100 slots reachable only by a d100
 * touch-search. RULED 2026-09-13 (Matt) to store the usable 100 with a flag
 * marking it special, rather than the literal "Special" — so anything that
 * reads a capacity gets a number, and the flag is what tells it the number is
 * not freely available. tools/steeds-drift.mjs knows the pairing and checks the
 * vault's "Special" against the flag rather than against the 100.
 */

export const STEEDS = [
  { name: "Burden Bird", types: ["biological"], level: 2, hp: 8, av: 12, moraleBonus: 1, itemSlots: 20,
    atk: "Peck (d6)",
    abilities: [
      {"name":"Peck","carried":false,"text":"Peck (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    bio: "<p>A large flightless bird. Often blinkered as they spook easily. They eat most things, but are fondest of honeyed grubs.</p>" },

  { name: "Crysteed", types: ["mineral"], level: 7, hp: 28, av: 22, moraleBonus: 5, itemSlots: 70,
    noHealRule: "Inevitable",
    // Companion Ration Upkeep (2026-09-19, Matt: the same total exception as
    // Pet Rock). The book's clause is an unnamed sentence of its description,
    // so this quotes it rather than inventing a rule name.
    rationFree: "Do not eat or drink",
    atk: "3 x Kick (d6)",
    abilities: [
      {"name":"Kick","carried":false,"text":"3 x Kick (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":3},
    ],
    rules: [
      {"name":"Inevitable","text":"Crysteeds cannot recover HP by any means, natural or supernatural. At 0 HP, they shatter into gleaming dust."},
    ],
    bio: "<p>The tripedal steeds favoured by scholars of Lithic Lyceum. Resemble crystalline thrones with three sharp and gleaming legs. Do not eat or drink.</p><p><b>Inevitable:</b> Crysteeds cannot recover HP by any means, natural or supernatural. At 0 HP, they shatter into gleaming dust.</p>" },

  // routines [[0],[1]] — JADE IBIS's "Gore (d10) / Charge (...)": one or the
  // other. Until 2026-09-18 it was "Bite (d8) + Kick (d10) / Charge", which is
  // why [[0,1],[2]] was once the right answer.
  { name: "Destrier", types: ["biological"], level: 10, hp: 40, av: 18, moraleBonus: 10, itemSlots: 20,
    atk: "Gore (d10) / Charge (DEX Save vs 3d8 crushing damage, needs running start)",
    // "crushing" reads as bludgeoning (Matt, 2026-09-18) through the attack
    // property table, so a Mineral target takes double from the charge.
    abilities: [
      {"name":"Gore","carried":false,"text":"Gore (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Charge","carried":false,"text":"Charge (DEX Save vs 3d8 crushing damage, needs running start)","effects":[{"kind":"damage","dice":"3d8","onFailedSave":true,"damageType":"crushing"},{"kind":"save","ability":"dex","mode":"resist","vs":"3d8 crushing damage","onFail":{"damage":{"dice":"3d8","type":"crushing"}}}],"condition":"needs running start","damageTypes":["crushing"]},
    ],
    routines: [[0],[1]],
    bio: "<p>All that once was shall be again, and the cavalry charge has re-established itself in this last red age. These genesculpted equine-derivatives can achieve speeds exceeding 150 mph on open ground. They are bred for battle, with long-fanged muzzles and running spikes supplanting the obsolete hoof. Few lines of infantry on Urth can stand firm against a Destrier charge.</p>" },

  { name: "Stridingfool", types: ["biological"], level: 4, hp: 16, av: 12, moraleBonus: 4, itemSlots: 40,
    atk: "2 x Fists (d6)",
    abilities: [
      {"name":"Fists","carried":false,"text":"2 x Fists (d6)","effects":[{"kind":"damage","dice":"1d6"}],"count":2},
    ],
    rules: [
      {"name":"Abomination","text":"While riding a Stridingfool, reaction rolls when encountering true-kin characters are made with DIS.","ownerReminder":true},
    ],
    bio: "<p>An eight-foot-tall hominid, genesculpted to act as a mount. Stridingfools are descended from human stock but lack wit and language, being simian in their aspect. Their human ancestry makes them disagreeable to most true-kin, and the Hegemony outlaws these mounts, but newbeasts of Vaarn are known to ride such creatures.</p><p><b>Abomination:</b> While riding a Stridingfool, reaction rolls when encountering true-kin characters are made with DIS.</p>" },

  // `flat` is the Planeyfolk precedent (2026-09-05), carried as a creature flag
  // rather than a creature type — see creatureFlags in bestiary-build.js.
  { name: "Thin Mare", types: ["hypergeometric"], flat: true, level: 5, hp: 20, av: 12, moraleBonus: 5,
    itemSlots: 100, itemSlotsSpecial: true,
    atk: "Bite (d8, hypergeometric)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d8, hypergeometric)","effects":[{"kind":"damage","dice":"1d8","damageType":"hypergeometric"}],"damageTypes":["hypergeometric"]},
    ],
    rules: [
      {"name":"Thin","text":"The mare is 2D and can slide through even the narrowest of gaps. When it stands sideways, it is invisible except for its shadow."},
      {"name":"Internal Storage","text":"Up to 100 item slots exist within the mare's hypergeometric belly. However, they are invisible, and items must be located by touch alone. Roll d100 and compare it with the desired item's slot number. If the roll is higher than the slot number, you find the item easily. If the roll is lower, you pull out whatever item is indicated by the roll instead."},
    ],
    bio: "<p>A strange hypergeometric mount. Less a horse and more the suggestion of one, like a child's charcoal sketch come to life. It is not comfortable to ride but makes up for this with other surprising utilities.</p><p><b>Thin:</b> The mare is 2D and can slide through even the narrowest of gaps. When it stands sideways, it is invisible except for its shadow.</p><p><b>Internal Storage:</b> Up to 100 item slots exist within the mare's hypergeometric belly. However, they are invisible, and items must be located by touch alone. Roll d100 and compare it with the desired item's slot number. If the roll is higher than the slot number, you find the item easily. If the roll is lower, you pull out whatever item is indicated by the roll instead.</p>" },

  { name: "War Camel", types: ["biological"], metalArmour: true, level: 4, hp: 16, av: 15, moraleBonus: 4, itemSlots: 40,
    atk: "Hump-Mounted Turret (d10) + Kick (d6)",
    abilities: [
      {"name":"Hump-Mounted Turret","carried":true,"text":"Hump-Mounted Turret (d10)","effects":[{"kind":"damage","dice":"1d10"}]},
      {"name":"Kick","carried":false,"text":"Kick (d6)","effects":[{"kind":"damage","dice":"1d6"}]},
    ],
    routines: [[0,1]],
    bio: "<p>Camels are still an excellent choice of desert mount, even in this late red era of Urth. War camels, fitted with mirror-armour and implanted flechette cannons, are used by Faa nomad raiders and Hegemony troops alike, and camel trains are one of the cheapest ventures a Vaarnish merchant can finance.</p>" },

  { name: "Weeping Lizard", types: ["biological"], level: 3, hp: 16, av: 16, moraleBonus: 3, itemSlots: 30,
    atk: "Bite (d8) + Tear Spray (CON Save vs Blindness)",
    abilities: [
      {"name":"Bite","carried":false,"text":"Bite (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
      {"name":"Tear Spray","text":"Tear Spray (CON Save vs Blindness)","effects":[{"kind":"save","ability":"con","mode":"resist","vs":"Blindness","condition":"blind"}]},
    ],
    routines: [[0,1]],
    bio: "<p>For journeys in the Lazul mountains of Vaarn where flickering lattices of hard light make flight untenable, the Weeping Lizard is favoured as a steed. Named for the toxin they extrude from their tear ducts when enraged, these truculent black pseudo-geckos can carry passengers up surfaces sheer as glass.</p>" },

  { name: "Zorse", types: ["biological"], level: 5, hp: 20, av: 13, moraleBonus: 4, itemSlots: 50,
    atk: "Kick (d8)",
    abilities: [
      {"name":"Kick","carried":false,"text":"Kick (d8)","effects":[{"kind":"damage","dice":"1d8"}]},
    ],
    bio: "<p>The dominant equine strain remaining on Urth. The zorse boasts a handsome bevy of stripes on its flanks and is bred in a variety of hues. The most common has an indigo coat with coral pink stripes, but many other colourations are available. Zorses are intolerant of extreme heat and deprivation and are rarely ridden in deserts but are not uncommon in the badlands or mountainous regions.</p>" },
];
