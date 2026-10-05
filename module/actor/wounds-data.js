/**
 * Vaarn Wounds tables (Combat > Wounds - Biological.md / Wounds - Synthetic.md).
 * Indexed by the HP value the character dropped to (0 down to -20).
 * Numeric fields (maxHpDie, abilityDice, abilityFlat, armorDie, levelLoss, xpReset)
 * are auto-applied; everything else is narrative and left to the GM via the
 * effect text posted to chat.
 */

export const BIOLOGICAL_WOUNDS = [
  // The hp-0 row DECLARES its save (Matt, 2026-09-22): dropping to exactly 0
  // posts a CON save card for the character, and a failure puts the d6 rounds
  // of unconsciousness on their board. declaredSpan is that failure's length,
  // which is why the save carries it rather than the Item (the row is slots: 0
  // and reaches no Item at all).
  { hp: 0, name: "Knocked Out", slots: 0, effect: "CON Save vs unconscious for d6 rounds. While unconscious, all attacks automatically hit you." , declaredSpan: { amount: "d6", unit: "round" }, save: { ability: "con", mode: "resist", vs: "unconscious", onFail: { entry: { name: "Unconscious", text: "Unconscious. While unconscious, all attacks against them automatically hit." } } } },
  { hp: -1, name: "Damaged Item", slots: 0, effect: "An item is damaged and unusable until fixed. Roll d20 to determine the item slot affected." },
  { hp: -2, name: "Bloody Mouth", slots: 1, effect: "Your mouth drools blood, and your speech slurs." },
  { hp: -3, name: "Teeth Knocked Out", slots: 1, effect: "DIS on EGO Saves." },
  { hp: -4, name: "Scrambled Nerves", slots: 1, effect: "DIS on PSY Saves." },
  { hp: -5, name: "Addling Wound", slots: 1, effect: "DIS on INT Saves." },
  { hp: -6, name: "Stomach Wound", slots: 1, effect: "DIS on CON Saves." },
  { hp: -7, name: "Crippling Wound", slots: 1, effect: "DIS on DEX Saves." },
  { hp: -8, name: "Weakening Wound", slots: 1, effect: "DIS on STR Saves." },
  { hp: -9, name: "Bloody Gash", slots: 1, effect: "-d8 max HP.", maxHpDie: "1d8" },
  { hp: -10, name: "Major Fracture", slots: 2, effect: "-d6 STR and -d6 DEX.", abilityDice: { str: "1d6", dex: "1d6" } },
  { hp: -11, name: "Eye Lost", slots: 2, effect: "-d6 DEX and -d6 EGO.", abilityDice: { dex: "1d6", ego: "1d6" } },
  { hp: -12, name: "Cracked Skull", slots: 2, effect: "-d8 INT and -d8 PSY. You pass out.", abilityDice: { int: "1d8", psy: "1d8" } },
  { hp: -13, name: "Mangled Guts", slots: 2, effect: "-d8 CON and -d10 max HP. You pass out.", abilityDice: { con: "1d8" }, maxHpDie: "1d10" },
  { hp: -14, name: "Severed Hand", slots: 2, effect: "-d8 STR and -d8 DEX. You pass out.", abilityDice: { str: "1d8", dex: "1d8" } },
  { hp: -15, name: "Severed Arm", slots: 3, effect: "-10 STR and -10 DEX. You pass out.", abilityFlat: { str: 10, dex: 10 } },
  { hp: -16, name: "Severed Leg", slots: 3, effect: "-10 STR and -10 DEX. You pass out.", abilityFlat: { str: 10, dex: 10 } },
  { hp: -17, name: "Brain Damaged", slots: 3, effect: "-10 INT, -10 PSY, and -10 EGO. You pass out.", abilityFlat: { int: 10, psy: 10, ego: 10 } },
  { hp: -18, name: "Bloody Mess", slots: 0, effect: "Roll 3 random Wounds: roll 3d6 three times, treating each result as a negative HP value to look up on this table. You pass out.", rollSubWounds: 3 },
  { hp: -19, name: "Death's Door", slots: 5, effect: "Any further damage is lethal until this wound is healed. You pass out.", deathsDoor: true },
  { hp: -20, name: "Fatality", slots: 0, effect: "You are dead.", instantDeath: true },
];

export const SYNTHETIC_WOUNDS = [
  { hp: 0, name: "Update Required", slots: 0, effect: "CON Save vs unconscious for d6 rounds. While unconscious, all attacks automatically hit you." , declaredSpan: { amount: "d6", unit: "round" }, save: { ability: "con", mode: "resist", vs: "unconscious", onFail: { entry: { name: "Unconscious", text: "Unconscious. While unconscious, all attacks against them automatically hit." } } } },
  { hp: -1, name: "Damaged Item", slots: 0, effect: "An item is damaged and is unusable until fixed. Roll d20 to determine the item slot affected." },
  { hp: -2, name: "Supercoolant Leak", slots: 1, effect: "You are leaking supercoolant. You are Deprived and cannot regain HP until this Wound is fixed." },
  { hp: -3, name: "Ego-Engine Stutter", slots: 1, effect: "-d4 EGO.", abilityDice: { ego: "1d4" } },
  { hp: -4, name: "Quantum-Reasoning Overflow", slots: 1, effect: "-d4 PSY.", abilityDice: { psy: "1d4" } },
  { hp: -5, name: "Memory Crystal Fracture", slots: 1, effect: "-d4 INT.", abilityDice: { int: "1d4" } },
  { hp: -6, name: "Coolant Loop Overheat", slots: 1, effect: "-d4 CON.", abilityDice: { con: "1d4" } },
  { hp: -7, name: "Kinesthetics Drive Failure", slots: 1, effect: "-d4 DEX.", abilityDice: { dex: "1d4" } },
  { hp: -8, name: "Limb Hydraulics Compromised", slots: 1, effect: "-d4 STR.", abilityDice: { str: "1d4" } },
  { hp: -9, name: "Synthskin Damaged", slots: 2, effect: "-d4 AV. Suffer double damage.", armorDie: "1d4" },
  { hp: -10, name: "Incompatible Motion Interface", slots: 2, effect: "A limb is no longer compatible with your core software. -d6 STR and -d6 DEX until fixed.", abilityDice: { str: "1d6", dex: "1d6" } },
  { hp: -11, name: "Personality Nexus Scrambled", slots: 2, effect: "Reroll INT, PSY, and EGO scores. Your voice and personality are altered." },
  // JADE prints the Blind mechanics inside the wound; the wound now DECLARES
  // the condition (RULED 2026-09-16, Matt) and condition-data.js is what the
  // readers consult. The printed text stays, being the book's own words.
  { hp: -12, name: "Vischip Disabled", slots: 3, effect: "You are blind. You cannot make ranged attacks and make melee attacks with DIS.", conditions: ["blind"] },
  { hp: -13, name: "Emotive Language Export Corruption", slots: 3, effect: "Your emotions and speech are encrypted and do not match what you intended to communicate." },
  { hp: -14, name: "Infinite Practical Memory Loop", slots: 4, effect: "You repeat your last action step by step for the next d6 hours." , declaredSpan: { amount: "d6", unit: "hour" } },
  { hp: -15, name: "Cascading Kinesthetics Debilitation", slots: 4, effect: "Lose -2 STR and DEX per day. At 0 STR or DEX, you can no longer move at all until this Wound is repaired by someone else." },
  { hp: -16, name: "Motive Drive Inhibited", slots: 5, effect: "-10 STR, -10 DEX, and -10 CON. You shut down for d6 hours.", abilityFlat: { str: 10, dex: 10, con: 10 } , declaredSpan: { amount: "d6", unit: "hour" } },
  { hp: -17, name: "Personality Nexus Damaged", slots: 5, effect: "-10 INT, -10 PSY, and -10 EGO. You shut down for d6 hours.", abilityFlat: { int: 10, psy: 10, ego: 10 } , declaredSpan: { amount: "d6", unit: "hour" } },
  { hp: -18, name: "Terminal Memory Crystal Corruption", slots: 6, effect: "You lose 1 Level and all XP. This loss is permanent, even when the Wound is fixed.", levelLoss: 1, xpReset: true },
  { hp: -19, name: "General Systems Failure", slots: 0, effect: "You are dead. If your ego-engine is removed from your body, it can be installed in a new shell.", instantDeath: true },
  { hp: -20, name: "Ego-Engine Destroyed", slots: 0, effect: "You are dead. Your ego-engine is damaged beyond repair. You cannot be rebooted.", instantDeath: true },
];

/**
 * NAMED SPECIAL WOUNDS — a Wound the book names rather than a table row.
 * RULED 2026-09-25 (Matt), Wound-Table Resolution wiring. named-wound.js
 * applies them: the Wounds tab entry and the slot Item, exactly as a table
 * wound gets. A slot count the book does not print is 1 (ruled the same day).
 *
 *   restProof        — why a Long Rest will not heal it; the picker says so
 *   abilityFlat      — wound damage, as the table rows' field
 *   alwaysSurprised  — the ambush roster counts the holder as failing
 *   zeroHp           — the holder's HP is set to 0 (no wound roll)
 *   deprived         — the holder becomes Deprived; healing the wound clears it
 *   secondDoseLethal — taking it again while it is held kills
 *
 * Gitch Crystals is not here: its spec is the affliction's producesWound in
 * recurrence-data.js, and recurrence.js routes it through the same path.
 */
export const NAMED_WOUNDS = {
  // Grimpet, Latch: "fill one item slot with a Wound: 'Grimpet'. The Grimpet
  // will resist attempts to prise it off and requires surgical attention."
  grimpet: { name: "Grimpet", slots: 1,
    effect: "A Grimpet has latched on. It resists attempts to prise it off and requires surgical attention.",
    restProof: "it requires surgical attention" },
  // Shriekman, Hypersonic Scream.
  deafened: { name: "Deafened", slots: 1,
    effect: "You cannot hear your surroundings and are always surprised by encounters.",
    alwaysSurprised: true },
  // Fleshwarp, Graft: "The victim fills an item slot with a Wound: Grafted
  // Arm." The limb itself is an Actor (grafted-arm.js); healing this wound
  // does not remove it, and its death does not remove this (RULED 2026-09-26).
  graftedArm: { name: "Grafted Arm", slots: 1,
    effect: "A Fleshwarp's limb is grafted to your torso. It attacks anyone near you each round, and damage dealt to it is shared with you." },
  // Amaranthine Death-Worm, Poison Spray. Rest-proof by ruling: "I would
  // probably make players use an antitoxin, or make an antidote".
  amaranthineVenom: { name: "Amaranthine Venom", slots: 1,
    effect: "You have 0 HP and are Deprived until this Wound is cured. A second dose is always lethal.",
    restProof: "it needs an antitoxin or an antidote",
    zeroHp: true, deprived: true, secondDoseLethal: true },
  // Scythesliver, Sharpness Beyond Measure: "Wound: Severed Limb (3 Slots,
  // -10 STR, -10 DEX)". A Synth takes it too (Matt).
  severedLimb: { name: "Severed Limb", slots: 3,
    effect: "-10 STR and -10 DEX.", abilityFlat: { str: 10, dex: 10 } },
  // Encumbrance Penalty wiring, RULED 2026-09-25 (Matt). Three creatures that
  // fill a character's slots, each a named wound so the slot, the Wounds tab
  // and wound-slot death come for free, and Encumbrance reads the slot.
  //   recurrence  - the Long-Clock Recurrence that clears it, started on the
  //                 holder if it is not already running
  //   onlyTypes   - creature types it reaches; any other target gets nothing
  //                 and no line ("don't telegraph")
  //   lethalAbove - holding this many already, the next one kills
  //   tally       - a count the holder clicks up; at the count it is removed
  // Deathblight Husk, Accursed Knife: "Targets afflicted mark an item slot with
  // Deathblight" - on a hit that deals damage (Matt: "tie this to the damage").
  deathblight: { name: "Deathblight", slots: 1,
    effect: "Each slot of Deathblight doubles damage taken and halves healing received. It fades at the rate of one slot a day.",
    restProof: "it fades one slot a day", recurrence: "deathblight" },
  // Flabmonger, Lipoinduction: "Biological creatures bitten by a Flabmonger
  // must fill one item slot with Flab. Filling more than ten slots with Flab is
  // fatal. Flab is cured at the rate of one slot per week."
  flab: { name: "Flab", slots: 1,
    effect: "Filling more than ten slots with Flab is fatal. Flab is cured at the rate of one slot per week.",
    restProof: "it is cured at one slot per week", recurrence: "flab", onlyTypes: ["biological"], lethalAbove: 10 },
  // Spambot, Spamblast: "Fills one Item Slot. To remove this, make a sale pitch
  // to five strangers regarding the bizarre product filling your
  // consciousness." The pitches are a tally the holder clicks (Matt: "b").
  // Generate Monster's Parasite Implant (Generated Gear and Attacks as Items,
  // RULED 2026-10-04 by Matt): "Fills 1 slot, d6 damage per day". Not healed by
  // rest - removing it is adjudicated - and removing it heals nothing already
  // dealt. The daily d6 is its recurrence, which ends when the wound is gone.
  parasite: { name: "Parasite", slots: 1,
    effect: "A parasite has been implanted. It deals d6 damage each day until it is removed; removing it does not heal the damage it dealt.",
    restProof: "it must be removed - the Referee decides how", recurrence: "parasite" },
  // A Quantum Daemon's Parasite Seed: the same, d6 each ROUND - the hit also puts
  // a per-round damage line on the victim's round card (generated-specials.js).
  parasiteSeed: { name: "Parasite Seed", slots: 1,
    effect: "A Daemon's seed has been implanted. It deals d6 damage each round until it is removed; removing it does not heal the damage it dealt.",
    restProof: "it must be removed - the Referee decides how" },
  spamAd: { name: "Spam Ad", slots: 1,
    effect: "To remove this, make a sale pitch to five strangers regarding the bizarre product filling your consciousness.",
    restProof: "it goes only after a sale pitch to five strangers", tally: { count: 5, label: "makes a sale pitch" } },
};

/**
 * Look up the wound row matching an HP value, clamped to the table's floor of -20.
 */
export function getWound(table, hpValue) {
  const clamped = Math.max(hpValue, -20);
  return table.find(w => w.hp === clamped);
}
