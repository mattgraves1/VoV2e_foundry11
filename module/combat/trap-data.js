/**
 * Trap Resolution - what each rolled vault hazard's buttons do (foundry-system-
 * index.csv "Trap Resolution", RULED 2026-09-26 by Matt).
 *
 * Keyed by the result's label exactly as its table prints it - "Hazard:" on
 * Vault Hazards, "Obstacle:" on Hallway Obstacles, "Fauna / Flora:" on Vault
 * Fauna and Flora - because the label is all a rolled result carries: it is
 * a chat message, with no Item or actor behind it. `atom` is the atom-index.csv
 * row each entry answers to (Book System "Vault Generator").
 *
 * An entry declares either or both of:
 *   saves   a save card for each targeted token, in the shape every other
 *           save card takes ({ ability, mode, vs, onFail?, targets? })
 *   damage  a button that rolls once and deals that roll to every targeted
 *           token, each part through the target's own resistances
 * and `applies` rides the save card as a failure's board entry.
 *
 * All five shapes live here: A (one save against damage), B (damage each
 * round while exposed), C (each Exploration Turn), D (a system that already
 * exists) and E (the odd ones).
 *
 * Damage types: the book's own word where it prints one ("crushing" as the
 * Bestiary's Charge does); a result printing none is kinetic by default in
 * failDamageFor, the 2026-09-25 ruling.
 */

export const TRAPS = {
  "Hazard: Broken Glass": {
    atom: "Hazard: Broken Glass",
    saves: [{ ability: "dex", mode: "resist", vs: "d4 damage", onFail: { damage: { dice: "1d4" } } }],
  },
  "Hazard: Lightning Gun": {
    atom: "Hazard: Lightning Gun",
    // The book prints no save and no to-hit: the pad fires at whoever touches it.
    damage: [{ dice: "1d10", type: "electrical" }],
  },
  "Hazard: Unstable Ceiling": {
    atom: "Hazard: Unstable Ceiling",
    saves: [{ ability: "dex", mode: "resist", vs: "3d6 crushing damage", onFail: { damage: { dice: "3d6", type: "crushing" } } }],
  },
  "Hazard: Unstable Floor": {
    atom: "Hazard: Unstable Floor",
    // "fall through it into pit (3d6 damage) or into lower strata of vault" -
    // which of the two is the Referee's; the button deals the pit's.
    saves: [{ ability: "dex", mode: "resist", vs: "falling into a pit (3d6 damage)", onFail: { damage: { dice: "3d6" } } }],
  },
  "Hazard: Proximity Mines": {
    atom: "Hazard: Proximity Mines",
    // How many mines a failed search sets off is the Referee's (RULED
    // 2026-09-26, Matt: they are scattered through the room), so the save
    // carries no damage and the damage is one mine a click.
    saves: [{ ability: "psy", mode: "resist", vs: "setting off a mine while searching" }],
    damage: [{ dice: "1d6", type: "blast" }],
    damageLabel: "one mine - click once per mine triggered",
  },
  "Hazard: Laser Grid Trap": {
    atom: "Hazard: Laser Grid Trap",
    saves: [{ ability: "dex", mode: "resist", vs: "3d6 beam damage", onFail: { damage: { dice: "3d6", type: "beam" } } }],
  },
  "Hazard: Neurotoxin Gas Trap": {
    atom: "Hazard: Neurotoxin Gas Trap",
    saves: [{ ability: "con", mode: "resist", vs: "Death", targets: ["biological"], onFail: { death: true } }],
  },
  "Hazard: Mind-Slaving Hypnoscreen": {
    atom: "Hazard: Mind-Slaving Hypnoscreen",
    // A failure paralyses, and the held one saves each round to shake it off
    // (RULED 2026-09-26, Matt) - the round card's escape button.
    saves: [{ ability: "ego", mode: "resist", vs: "paralysis" }],
    applies: [{ effect: "Paralysed", amount: null,
                text: "Paralysed by the Mind-Slaving Hypnoscreen.",
                escape: { ability: "ego", by: "shake off the paralysis" } }],
  },
  "Hazard: Gas Leak": {
    atom: "Hazard: Gas Leak",
    // Only when a flame ignites the room - the Referee clicks it then.
    damage: [{ dice: "5d10", type: "blast" }, { dice: "5d10", type: "flame" }],
    damageLabel: "the room ignites",
  },
  // SHAPE B - damage each round while exposed. `tick` puts an entry on EACH
  // targeted token's board (RULED 2026-09-26, Matt: exposure is per person,
  // as burning is); the round card then gives each their own apply button on
  // their own turn, and the Referee removes it as they leave. `dice` + `type`
  // is an HP tick, `ability` + `dice` an ability loss; `targets` limits it to
  // creature types, passing the rest over silently. Acid and corrosive are
  // not damage types in this system, so the lichens deal untyped damage.
  "Hazard: Vault Hornet Hive": {
    atom: "Hazard: Vault Hornet Hive",
    tick: { dice: "1d8", note: "d8 unblockable damage each round while near the hive; the hornets do not pursue outside the room." },
  },
  "Hazard: Electromagnet": {
    atom: "Hazard: Electromagnet",
    tick: { ability: "int", dice: "1d6", targets: ["synthetic"],
            note: "d6 INT damage each round to synths near it; it draws all metal objects towards it." },
    // Metal Item Property Part B (RULED 2026-09-27, Matt): a button that lists
    // the metal in reach. Nothing is moved.
    metalPull: true,
  },
  "Hazard: Vampiric Vines": {
    atom: "Hazard: Vampiric Vines",
    // No escape save (RULED 2026-09-26, Matt): cutting them loose is someone
    // else's act, so the Referee ends the hold by hand.
    saves: [{ ability: "dex", mode: "resist", vs: "entanglement",
              onFail: { hold: { loss: { ability: "str", dice: "1d4" }, escape: null, endsBy: "cut loose" } } }],
  },
  "Hazard: Corrosive Lichen": {
    atom: "Hazard: Corrosive Lichen",
    tick: { dice: "1d4", note: "d4 acid damage each round exposed to the lichen." },
  },
  "Hazard: Normality Field Projector": {
    atom: "Hazard: Normality Field Projector",
    // A PROJECTOR (RULED 2026-09-26, Matt): the button places it as an actor
    // with the book's AV and HP, its per-round damage sits on the projector
    // and reaches the targeted tokens of the named types, and destroying it
    // ends the effect.
    projector: { name: "Normality Field Projector", av: 20, hp: 40,
                 tick: { dice: "1d10", targets: ["hypergeometric", "outsider"] },
                 note: "Prevents use of Mystic Gifts and Hypergeometric Codexes. Hypergeometric or outsider creatures take d10 damage each round inside the field." },
  },
  // SHAPE C - each Exploration Turn. `turn` starts a per-turn recurrence on
  // EACH targeted token (the B ruling, carried over), and the clock's tick card
  // offers what the entry declares: `save` a save card for that character,
  // `applies` the recurrence roster's ability and maximum-HP losses, `tox` a
  // TOX save against that Toxin Die, `wound` a named wound (Deathblight, which
  // already fades one slot a day).
  "Hazard: Fungal Growths": {
    atom: "Hazard: Fungal Growths",
    // Suffocation, RULED 2026-09-27 (Matt, Breathing and Suffocation): so a
    // Synth, a Lithling or an Oxygen Mask is not asked the save at all.
    turn: { save: { ability: "con", mode: "resist", vs: "d8 choking damage", onFail: { damage: { dice: "1d8", type: "suffocation" } } },
            what: "a CON Save vs d8 choking damage",
            note: "Air filled with spores: CON Save vs d8 choking damage each Exploration Turn." },
  },
  "Hazard: Deathblight Urn": {
    atom: "Hazard: Deathblight Urn",
    turn: { wound: "deathblight", what: "a point of Deathblight",
            note: "Deathblight smoke: one point of Deathblight each Exploration Turn. Each point doubles damage taken and halves healing; it fades one point a day." },
  },
  "Hazard: Supercoolant Leak": {
    atom: "Hazard: Supercoolant Leak",
    turn: { applies: [{ target: "ability", key: "dex", label: "DEX", amount: 1 }], what: "1 DEX damage",
            note: "Extremely cold liquid: 1 DEX damage each Exploration Turn." },
  },
  "Hazard: Entropic Field Projector": {
    atom: "Hazard: Entropic Field Projector",
    // A projector whose effect is per CHARACTER, unlike the Normality Field's
    // targets tick: each exposed character carries its own recurrence, all
    // naming the projector as their endsWithSource source.
    projector: { name: "Entropic Field Projector", av: 25, hp: 50,
                 turn: { applies: [{ target: "maxHp", label: "Maximum HP", amount: 1 }], what: "1 maximum HP" },
                 note: "While here, lose 1 maximum HP each Exploration Turn. It cannot be regained." },
  },
  "Hazard: Hypergeometric Vortex": {
    atom: "Hazard: Hypergeometric Vortex",
    // One event a turn for the ROOM (RULED 2026-09-26, Matt): an actor with no
    // AV or HP carries the tick; which half comes first is a d2 at placement.
    vortex: { name: "Hypergeometric Vortex",
              draw: { ability: "str", mode: "resist", vs: "being teleported to a random location in Vaarn" },
              note: "An unstable patch of space-time. Each Exploration Turn it alternates between drawing someone in (STR Save to resist being teleported to a random location in Vaarn) and spitting out a random creature (roll on any encounter table)." },
  },
  // SHAPE D - a button that runs a system that already exists (RULED
  // 2026-09-26/27, Matt). `tox` the TOX card; `spawn` Bestiary creatures, once
  // per card; `poison` and `affliction` roll ONCE per card and the card keeps
  // what it rolled, so everyone exposed from it meets the same poison or
  // disease; a `famine` projector makes the targeted Deprived and removes their
  // food (Deprived outlives the projector); a `darkness` projector darkens the
  // whole party through the existing In Darkness state, lifted when it dies.
  "Hazard: Toxic Liquid Pool": {
    atom: "Hazard: Toxic Liquid Pool",
    tox: "d10",
  },
  "Hazard: Sentry Turrets": {
    atom: "Hazard: Sentry Turrets",
    spawn: { creature: "Sentry Turret", dice: "1d4" },
  },
  "Hazard: Poisoned Water": {
    atom: "Hazard: Poisoned Water",
    poison: true,
  },
  "Hazard: Disease": {
    atom: "Hazard: Disease",
    affliction: "disease",
  },
  "Hazard: Nanomachine Infection": {
    atom: "Hazard: Nanomachine Infection",
    affliction: "nanomachine",
  },
  "Hazard: Famine Field Projector": {
    atom: "Hazard: Famine Field Projector",
    projector: { name: "Famine Field Projector", av: 20, hp: 20, famine: true,
                 note: "All characters who enter become Deprived due to hunger, and food rations brought in decompose." },
  },
  "Hazard: Darkness Projector": {
    atom: "Hazard: Darkness Projector",
    projector: { name: "Darkness Projector", av: 20, hp: 40, darkness: true,
                 note: "Pitch black; no light pierces it and all actions are taken as if blind. Destroy the generator to restore normal lighting." },
  },
  "Obstacle: Flooded (Supercoolant)": {
    atom: "Hallway: Flooded (Supercoolant)",
    turn: { applies: [{ target: "ability", key: "dex", label: "DEX", formula: "1d4" }], what: "d4 DEX damage",
            note: "Waist-deep supercoolant: d4 DEX damage each Exploration Turn without insulation. At 0 DEX they freeze solid and must be pulled out." },
  },
  "Obstacle: Flooded (Toxin)": {
    atom: "Hallway: Flooded (Toxin)",
    turn: { tox: "d8", what: "a TOX save against a d8 Toxin Die",
            note: "Waist-deep toxic fluid: d8 TOX each Exploration Turn without protection." },
  },
  "Obstacle: Corrosive Lichen": {
    atom: "Hallway: Corrosive Lichen",
    tick: { dice: "1d4", note: "d4 corrosive damage each round exposed to the lichen." },
  },
  "Obstacle: Flooded (Fuel)": {
    atom: "Hallway: Flooded (Fuel)",
    tick: { dice: "1d10", type: "flame", start: "the fuel ignites",
            note: "d10 fire damage each round while immersed in the burning oil. Anyone who walked through it stays flammable until cleaned." },
  },
  "Obstacle: Fungal Growth": {
    atom: "Hallway: Fungal Growth",
    tick: { dice: "1d8", start: "the fungus is disturbed",
            note: "d8 unblockable damage each round from the spores; fire kills the fungus." },
  },
  "Obstacle: Security Turret": {
    atom: "Hallway: Security Turret",
    tick: { dice: "1d8", type: "kinetic", note: "d8 kinetic damage each round to anyone who moves in the hallway." },
  },
  "Obstacle: Vault Hornet Hive": {
    atom: "Hallway: Vault Hornet Hive",
    tick: { dice: "1d8", note: "d8 unblockable damage each round while near the hive." },
  },
  "Obstacle: Laser Grid Trap": {
    atom: "Hallway: Laser Grid Trap",
    saves: [{ ability: "dex", mode: "resist", vs: "3d6 beam damage", onFail: { damage: { dice: "3d6", type: "beam" } } }],
  },
  "Obstacle: Loose Wires": {
    atom: "Hallway: Loose Wires",
    saves: [{ ability: "dex", mode: "resist", vs: "2d6 electrical damage", onFail: { damage: { dice: "2d6", type: "electrical" } } }],
  },
  "Fauna / Flora: Swordgrass": {
    atom: "Flora: Swordgrass",
    saves: [{ ability: "dex", mode: "resist", vs: "d4 damage", onFail: { damage: { dice: "1d4" } } }],
  },
};
