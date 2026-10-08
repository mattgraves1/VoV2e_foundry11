/**
 * The book's long-clock recurrences — foundry-system-index.csv
 * "Long-Clock Recurrence".
 *
 * Nine clauses that fire REPEATEDLY on the exploration clock and stop on a
 * cure rather than on a date. Every one of them is transcribed from the
 * vault below; the `tick` string is the book's own wording, trimmed to the
 * clause that recurs, and nothing here interprets it.
 *
 * WHAT IS DELIBERATELY NOT HERE. How a character CATCHES one of these is
 * Affliction Contraction and Cure, which sits below this row in
 * build-order.txt Phase 3 — so a recurrence is started by hand today. The
 * staging of Labyrinth Pox (three days to Stage 2, three more from Stage 3
 * to gone) and the day-three/day-seven swarm escalation of Hivey Hump are
 * both thresholds on elapsed time rather than recurrences, and are left to
 * that row as well; only the clause that repeats is modelled here.
 *
 * WEEK IS A PERIOD, NOT A CLOCK UNIT. It is not in vaarn-time.js's UNITS
 * map and must not be added to it: nothing in the book authors a DURATION
 * in weeks, and a unit on the clock's number line is a thing durations are
 * written in. Seven days is a repeat interval, which is a different idea
 * wearing the same noun. recurrence.js converts it and the clock never
 * learns the word.
 *
 * SAVE TARGETS COME FROM VIRULENCE, and that is the book's own general rule
 * rather than an invention. JADE IBIS 15-09-26: "All diseases have a Virulence
 * rating; this is the target number for Saves to resist and treat the
 * infection." CRIMSON HOUND printed ratings 10 lower and said to add 10; the
 * values here were rebased 2026-09-16 and no target moved. The card still
 * names the Virulence as the source of the number, so a Referee who reads that
 * clause more narrowly can override it at the table.
 */

/**
 * Threshold shapes, evaluated by recurrence.js against a live actor.
 *
 * ANNOUNCE ONLY. RULED 2026-09-08 (Matt). Reaching one of these is reported
 * and nothing acts on it — every one of them is a transformation or a death
 * the book describes narratively ("they become a Hiveyman NPC", "they
 * dissolve into luminous slime"), and whether that is a new Actor or this
 * one changed is a question the book does not answer.
 *
 *   ability   — system.abilities[key].effective has reached `at`
 *   maxHp     — system.health.max has reached `at`
 *   slotsFull — every inventory slot is occupied
 *   woundGone — no Item of the named wound remains
 */

export const RECURRENCES = [
  {
    key: "jellybones",
    atoms: ["Jellybones"],
    name: "Jellybones",
    book: "Miscellany/Diseases.md",
    virulence: 12,
    period: { amount: 1, unit: "week" },
    tick: "Infected characters lose -d4 STR and -d4 CON per week.",
    applies: [
      { target: "ability", key: "str", label: "STR", formula: "1d4" },
      { target: "ability", key: "con", label: "CON", formula: "1d4" }
    ],
    threshold: null,
    cure: "A Stiff Drink — liquor, wet cement, and the crushed shards of a Lithling."
  },

  {
    key: "labyrinth-pox",
    atoms: ["Labyrinth Pox"],
    name: "Labyrinth Pox (Stage 2)",
    book: "Miscellany/Diseases.md",
    virulence: 14,
    // PER DAY in JADE IBIS 15-09-26; CRIMSON HOUND said per week. RULED
    // 2026-09-21 (Matt): follow JADE.
    period: { amount: 1, unit: "day" },
    tick: "The character loses d8 maximum HP per day and gains an equal number of new inventory slots, located inside their hollowing body.",
    // ONE ROLL, TWO EFFECTS. "Loses d8 maximum HP per day and gains an EQUAL
    // NUMBER of new inventory slots" - so grantsSlots takes the total this
    // entry already rolled rather than rolling its own d8, which would make
    // the two halves disagree in the one way the book forbids.
    applies: [
      { target: "maxHp", label: "max HP", formula: "1d8", grantsSlots: true }
    ],
    // THE SLOT GAIN IS NOW APPLIED. It was announced-and-not-applied from
    // 2026-09-13, because the two slot numbers on an actor mean different
    // things and writing either one alone would have been picking a reading of
    // an unreconciled model. RULED 2026-09-20 (Matt): it moves NEITHER. The
    // slots are a cargo compartment - the book says they are "located inside
    // their hollowing body" - so they hold things without changing what the
    // character can carry, and inventorySlots.value and .max are untouched.
    // Container Slot Capacity carries it.
    //
    // THE SPLIT FROM HOLLOWHEART HOOCH IS DELIBERATE. That elixir grants "2 new
    // hypergeometric Item Slots, located inside their chest" in nearly these
    // words and IS a slotBonus bake, because its slots have no end condition
    // and so extend the character's own capacity. These end when the pox is
    // cured or the character dies.
    threshold: {
      watch: "maxHp", at: 0,
      text: "Maximum HP is zero — Stage 2 ends and Stage 3 begins."
    },
    cure: "Excision with a hypergeometric blade, or exposure to Normality Fields or other anti-hypergeometry measures. Arrests rather than reverses."
  },

  {
    key: "hivey-hump",
    atoms: ["Hiveyhump"],
    name: "Hiveyhump",
    book: "Miscellany/Diseases.md",
    virulence: 13,
    period: { amount: 1, unit: "day" },
    tick: "An infected character loses one point of EGO per day.",
    applies: [
      { target: "ability", key: "ego", label: "EGO", amount: 1 }
    ],
    threshold: {
      watch: "ability", key: "ego", at: 0,
      text: "At 0 EGO they become a Hiveyman NPC, a slave to the bees.",
      // Actor Spawning wiring, RULED 2026-09-25 (Matt): the creature takes the PC's spot.
      becomes: "Hiveyman"
    },
    cure: "Fumigation of the afflicted, with special herbs burned in the fumigate fires. All desert cultures know how to prepare this mixture."
  },

  {
    key: "lumenrot",
    atoms: ["Lumenrot"],
    name: "Lumenrot",
    book: "Miscellany/Diseases.md",
    virulence: 15,
    period: { amount: 1, unit: "day" },
    tick: "Lumenrot victims must CON save at the start of each day. On failure, they lose one point of maximum CON.",
    save: { ability: "CON", onFail: "Lose one point of maximum CON." },
    // RULED 2026-09-09 (Matt): "maximum" here goes to woundDamage like every
    // other ability loss, not to the base value. There is no "maximum ability"
    // field to reduce — defence is derived as effective + 10 — and reducing
    // the base score permanently is Permanent Ability Score Change, a separate
    // row. onFail marks it as owed only when the save is failed, which is why
    // it waits behind a button rather than applying on the tick.
    //
    // RE-CONFIRMED 2026-09-13 (Matt), unprompted, while Goldencough’s
    // identical wording was being re-ruled the other way: "lumenrot is another
    // one that mentions ‘CON defense’, but in this case I would just do 1 point
    // of CON damage, which CAN be restored by long rest method."
    //
    // THE WORDING HE IS QUOTING IS GONE FROM THE BOOK, 2026-09-20. JADE IBIS
    // 15-09-26 reads "one point of maximum CON"; the `tick` and `save.onFail`
    // above were re-transcribed to match. His words are left exactly as he said
    // them, because a ruling is a record of what was decided and when, not a
    // description of the current text — and "mentions ‘CON defense’" is the
    // whole reason the question was put to him at all. The ruling is unaffected:
    // it sends the loss to woundDamage, which the new wording asks for just as
    // plainly as the old.
    //
    // SO THE PHRASE DOES NOT GET ONE UNIFORM TREATMENT, and that is deliberate
    // rather than an oversight. Lumenrot’s loss is recoverable and
    // Goldencough’s is not. Anyone later tempted to unify them should read both
    // rulings first; they were made four days apart by the same person who knew
    // what the other said.
    //
    // THIS PARAGRAPH USED TO COUNT THE PHRASE, and the count is why it is being
    // corrected rather than left: it said "'Maximum CON defence' appears at
    // least three times in the book — here, on Goldencough, and on the
    // Kronophage's Borrowed Time". MEASURED 2026-09-20 against the JADE IBIS
    // 15-09-26 text extract: the phrase appears ZERO times now, and it was five
    // places rather than three even in CRIMSON HOUND — Jellybones and the Gitch
    // say it of AV, and the Kronophage said "ability defences" rather than "CON
    // defence" anyway. A count of book occurrences inside a code comment is the
    // same trap as an absence claim: nothing rechecks it, and it inverts on the
    // next edition without a single test going red. The DISTINCTION the
    // paragraph exists to protect is unaffected, which is why it is kept above.
    applies: [
      { target: "ability", key: "con", label: "CON", amount: 1, onFail: true }
    ],
    threshold: {
      watch: "ability", key: "con", at: 0,
      text: "At 0 CON they dissolve into luminous slime."
    },
    cure: "Three injections, stocked by Vaarnish apothecaries. Ulfire light arrests the spread but will not cure it."
  },

  {
    key: "the-gitch",
    atoms: ["The Gitch"],
    name: "The Gitch",
    book: "Miscellany/Nanomachine Infections.md",
    virulence: 15,
    period: { amount: 1, unit: "day" },
    tick: "At the start of each day of infection, the PC must make a CON save. On failure, they mark an item slot with a Wound: Gitch Crystals.",
    save: { ability: "CON", onFail: "Mark an item slot with a Wound: Gitch Crystals." },
    producesWound: {
      name: "Gitch Crystals",
      slots: 1,
      description: "For each item slot filled with Crystals, the PC gains one point of AV, and loses one point of the Ability infected by the Gitch.",
      // RULED 2026-09-22 (Matt): like any wound that reduces an ability - one
      // point of woundDamage to the infected ability per slot marked. The +1 AV
      // per slot is avPerSlot below.
      abilityPerSlot: 1,
      // Live AV Computation wiring, 2026-09-25 (Matt): "the PC gains one point
      // of AV" per slot. Read live by actor.js from the wound Items held, so
      // debridement removing a slot removes its point with nothing to undo.
      avPerSlot: 1,
      // Wound-Table Resolution wiring, RULED 2026-09-25 (Matt): a Long Rest
      // does not heal a crystal - debridement removes them.
      restProof: "only crystal debridement removes them"
    },
    threshold: {
      watch: "slotsFull",
      text: "When all available slots are filled with Gitch crystals, the character becomes a mindless Gitchghast.",
      // Actor Spawning wiring, RULED 2026-09-25 (Matt): the creature takes the PC's spot.
      becomes: "Gitchghast"
    },
    cure: "Crystal debridement by a Gitch Doctor, taking one day for each item slot occupied by crystals."
  },

  {
    // Grafted Limb Creation, RULED 2026-09-24 (Matt): "like Hivey Hump" -
    // ordinary CON damage from the daily card. Started by graft.js when the
    // graft is made, stopped when its Item is removed.
    key: "graft",
    atoms: ["Grafting"],
    name: "Graft",
    book: "Character Creation/Bloomboons.md",
    period: { amount: 1, unit: "day" },
    tick: "Every day the grafted part stays alive, lose 1 point of CON.",
    applies: [
      { target: "ability", key: "con", label: "CON", amount: 1 }
    ],
    threshold: null,
    cure: "Remove the grafted part."
  },

  {
    key: "fabricator-stoma",
    atoms: ["Fabricator Stoma"],
    name: "Fabricator Stoma",
    book: "Miscellany/Nanomachine Infections.md",
    virulence: 14,
    period: { amount: 1, unit: "day" },
    tick: "Each morning, a finished object is painfully extruded through the stoma. It is always the same object, mass produced inside the PC's guts. The host must also consume double rations each day or become Deprived.",
    // The extruded object is rolled ONCE at exposure, not per tick — "It is
    // always the same object". JADE IBIS 15-09-26: "Roll 1d100 on the Vault
    // Trinkets table (p.xx) to determine what is produced." CRIMSON HOUND
    // printed a d6 list of its own; RULED 2026-09-21 (Matt): follow JADE. The
    // expose dialog rolls this RollTable and the Referee may overwrite it.
    objectTable: "Vault Trinkets",
    producesObject: true,
    threshold: null,
    cure: "Removal by an experienced cybernetics surgeon. The operation is not cheap."
  },

  {
    key: "deathblight",
    atoms: ["Deathblight Husk"],
    name: "Deathblight",
    book: "Bestiary/Deathblight Husk.md",
    period: { amount: 1, unit: "day" },
    tick: "Deathblight fades at the rate of one slot a day. Each slot of Deathblight doubles damage taken and halves healing received.",
    consumesWound: { name: "Deathblight" },
    threshold: {
      watch: "woundGone", wound: "Deathblight",
      text: "No Deathblight remains — the affliction has faded completely."
    },
    cure: "It fades on its own; no treatment is given."
  },

  {
    // Live AV Computation wiring, RULED 2026-09-25 (Matt). The gaze's DEX loss
    // and AV gain accumulate on this entry (addFading) and fade a point a day
    // each; the entry ends itself when both are gone.
    key: "lithification",
    atoms: ["Occulith"],
    name: "Lithification",
    book: "Bestiary/Occulith.md",
    period: { amount: 1, unit: "day" },
    tick: "Both effects fade at the rate of one point per day.",
    fades: true,
    cure: "It fades on its own; no treatment is given."
  },

  {
    // Generated Gear and Attacks as Items, RULED 2026-10-04 (Matt): a generated
    // monster's Parasite Implant deals d6 damage per day while the wound is held.
    key: "parasite",
    atoms: [],
    name: "Parasite",
    book: "Monster Generator (Special Attacks)",
    period: { amount: 1, unit: "day" },
    tick: "The parasite feeds: d6 damage. It goes on each day until the Parasite wound is removed.",
    applies: [{ target: "hp", label: "HP", formula: "1d6" }],
    threshold: {
      watch: "woundGone", wound: "Parasite", stops: true,
      text: "The Parasite has been removed - it does no more damage."
    },
    cure: "Removing the parasite, as the Referee decides. Removing it does not heal the damage it dealt."
  },

  {
    // Wounds and Afflictions chunk 2b (RULED 2026-10-06, Matt): the wound's daily
    // loss, started when it is taken (hp-pipeline.js), ended when it is repaired.
    key: "cascading-kinesthetics",
    atoms: ["Synthetic: Cascading Kinesthetics Debilitation"],
    name: "Cascading Kinesthetics Debilitation",
    book: "Combat/Wounds - Synthetic.md",
    period: { amount: 1, unit: "day" },
    tick: "Lose -2 STR and DEX per day. At 0 STR or DEX, you can no longer move at all until this Wound is repaired by someone else.",
    applies: [
      { target: "ability", key: "str", label: "STR", amount: 2 },
      { target: "ability", key: "dex", label: "DEX", amount: 2 }
    ],
    threshold: {
      watch: "woundGone", wound: "Cascading Kinesthetics Debilitation", stops: true,
      text: "The Wound has been repaired - the debilitation stops."
    },
    cure: "Repaired by someone else."
  },

  {
    key: "flab",
    atoms: ["Flabmonger"],
    name: "Flab (Lipoinduction)",
    book: "Bestiary/Flabmonger.md",
    period: { amount: 1, unit: "week" },
    tick: "Flab is cured at the rate of one slot per week. Filling more than ten slots with Flab is fatal.",
    consumesWound: { name: "Flab" },
    threshold: {
      watch: "woundGone", wound: "Flab",
      text: "No Flab remains — the affliction has cleared completely."
    },
    cure: "It clears on its own at one slot per week."
  },

  {
    key: "toxin-die",
    atoms: ["Poison 01: D6 TOX damage"],
    name: "Toxin Die",
    book: "Core Rules/Toxins.md",
    period: { amount: 1, unit: "turn" },
    tick: "If the PCs are not in combat, they should roll their TD and subtract the result from their HP every exploration turn.",
    // THE ODD ONE OUT, and deliberately so. RULED 2026-09-08 (Matt): "the
    // board should only record that a toxin die is active, all the rolling
    // and depletion can be managed from the character sheet." So this entry
    // carries no formula and creates no Item — the TD size, the roll and the
    // dice-chain depletion all stay in toxin-die.js and on the sheet, which
    // is the one place they are already correct. What the recurrence adds is
    // the PROMPT the book's out-of-combat clause has never had.
    sheetDriven: true,
    threshold: null,
    cure: "Varies by source; the TD depletes down the dice chain on a roll of 1-2 and clears at Cured."
  }
];

/** One recurrence by key, or null. */
export function recurrenceByKey(key)
{
  return RECURRENCES.find(r => r.key === key) ?? null;
}
