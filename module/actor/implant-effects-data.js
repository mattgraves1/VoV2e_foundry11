/**
 * The implants as effect sentences - Effect Engine: Implants, Exotica and
 * Figments, chunk 1 (foundry-system-index.csv "Effect Engine: Implants, Exotica
 * and Figments", BUILD PLAN and RULING C LIST RULED 2026-10-06 by Matt).
 *
 * One entry per IMPLANTS (chargen-data.js) and ADVANCED_IMPLANTS name, checked
 * both ways by tools/test-implant-exotica-effects.mjs. The implant translator
 * (implant-exotica-effects.js) reads an implant Item's name and returns these,
 * so an implant made before the step needs nothing rewritten.
 *
 * READ THIS BEFORE EDITING:
 *  - `text` is the book's own words (the roster's `effect`), so a card or
 *    reminder can quote them.
 *  - BAKED (ruling A): what is written once when the implant is installed -
 *    its ability changes, max HP, hands, its natural weapon - is a `stat`
 *    sentence marked `baked: true`. The ability-slot conflict stays the
 *    install check it is. Nothing applies a baked sentence again.
 *  - DAMAGE TAKEN: an implant that changes the damage its bearer takes gives
 *    the bearer a property the damage-type table knows, and the table keeps
 *    every multiplier (Mutations ruling C's design).
 *  - REMINDERS: each row the Forgettable Effects tab shows for an implant is a
 *    passive reminder here with its tab placement, word for word.
 *  - Ruling C's new effects (Subdermal Insulation, Dazzleskin Filaments,
 *    Etiquette HeadBank, Tactical Flaw Analysis, Solar Scaling) are written in
 *    as ruled; their readers arrive in chunks 2 and 3.
 *
 * Pure data: no Foundry global.
 */

const baked = (statName, amount, extra = {}) => ({ when: "stat", baked: true, do: { verb: "modify", stat: statName, amount, ...extra } });
const natural = (item, text) => ({ when: "stat", baked: true, do: { verb: "create-item", item, natural: true }, text });
const av = (n, text) => ({ when: "passive", do: { verb: "modify", stat: "av", amount: `+${n}` }, text });
const live = (ability, n, text) => ({ when: "passive", do: { verb: "modify", stat: ability, amount: `+${n}` }, text });
const prop = (p, text) => ({ when: "passive", do: { verb: "modify", stat: "damage-properties", amount: `+${p}` }, text });
const immune = (to, text) => ({ when: "passive", do: { verb: "immune", to }, text });
const note = (text, section, polarity, category) => ({ when: "passive", do: { verb: "reminder" }, text, tab: { section, polarity, category } });
const selfSave = (ability, text) => ({ when: "use", do: { verb: "special", handler: "self-save", ability }, text });
const melee = { gate: "attack-kind", is: "melee" };
const ranged = { gate: "attack-kind", is: "ranged" };
const charging = { gate: "charging" };

const IMPLANT_SENTENCES = {
  /* ---------------- Starting implants ---------------- */
  "Air Current Microsensor": [immune("blind", "You suffer no navigation or combat penalties from blindness or darkness.")],
  "Alluring Fakeface": [selfSave("ego", "You are extraordinarily beautiful. EGO save to enthrall a Biological creature. They will never harm you.")],
  "Autoglot HeadBank": [baked("int", "+2"),
                        note("Understands all languages.", "Always Active", "Benefit", "Social")],
  "Backup Heart": [baked("con", "+2"), baked("max-hp", "+5")],
  "Carbide Knucklebones": [natural("Carbide Fists", "Your bare fists deal 2d4 damage.")],
  "Cyberliver": [{ when: "passive", do: { verb: "adv", on: "save", vs: "tox" }, text: "ADV on Saves against TOX damage and poisons. You cannot get drunk." }],
  // Ruling C (2): 'laser beams and energy weapons' is beam damage, x0 - Mirror Armour's shape.
  // Chunk 4 (RULED 2026-10-06, Matt): the immunity's tab row left - the sheet applies it.
  "Dazzleskin Filaments": [prop("dazzleskin", "You are immune to laser beams and energy weapons."),
                           note("DIS when hiding.", "Always Active", "Detriment", "Movement & Environment")],
  "Dopamine Synthesizer": [baked("ego", "+2"),
                           note("Immune to fear, panic, and embarrassment.", "Always Active", "Benefit", "Saves")],
  "Dorsal Jump-pack": [note("Can fly slowly and loudly via hover-jets.", "On-Demand", "Benefit", "Movement & Environment")],
  "Ferrosteel Exo-Skeleton": [baked("str", "+2"), baked("dex", "-4"), av(2, "Add +2 to AV and STR. Subtract −4 DEX. You cannot swim."),
                              note("Cannot swim.", "Always Active", "Detriment", "Movement & Environment")],
  "Finger Syringe": [note("Hidden finger injector - can be loaded with any elixir or poison.", "On-Demand", "Benefit", "Utility")],
  "Hydraulic Biceps": [{ when: "attack-hit", if: [melee], do: { verb: "damage", dice: "@str", addOn: true }, text: "Add STR bonus to melee weapon damage" }],
  "Hyper-elastic Tendons": [baked("dex", "+2"),
                            note("Can jump across huge distances.", "Always Active", "Benefit", "Movement & Environment")],
  "Merciless Cybereyes": [{ when: "attack-hit", if: [ranged], do: { verb: "damage", dice: "@dex", addOn: true }, text: "Add DEX bonus to ranged weapon damage" }],
  "Mercurial Fakeface": [note("Face can alter its features/color at will.", "On-Demand", "Benefit", "Social")],
  "Subdermal Ceramic Plating": [av(2, "+2 to base AV. Cannot be removed.")],
  // Ruling C (1): flame, freezing and electrical damage x0.
  // Chunk 4 (RULED 2026-10-06, Matt): the tab row left - the sheet applies it.
  "Subdermal Insulation": [prop("subdermalInsulation", "Immunity to damage from flames, cold, and electricity. Cannot be removed.")],
  "Tactical Bioscanner": [note("Know the Level/AV/HP of any Biological or Fungal creature.", "Always Active", "Benefit", "Utility")],
  "Tactical Technoscanner": [note("Know the Level/AV/HP of any Synthetic creature.", "Always Active", "Benefit", "Utility")],
  "Trauma-Response Rig": [{ when: "use", cost: { kind: "per-day", n: 1 }, do: { verb: "special", handler: "trauma-rig" },
                            text: "Negate the effects of a Wound. Can be activated once per day." }],

  /* ---------------- Advanced implants ---------------- */
  "Adaptive Camo-Dermis": [av(1, "+1 base AV."),
                           note("When motionless, you become invisible.", "Always Active", "Benefit", "Movement & Environment")],
  // Ruling C (5): ADV on every reaction roll, no gate. Its tab row left in chunk 4 (RULED 2026-10-06, Matt).
  "Etiquette HeadBank": [live("ego", 2, "+2 EGO."),
                         { when: "on-reaction-roll", do: { verb: "adv", on: "reaction" }, text: "All reaction rolls are made with ADV." }],
  "Berserker StimRig": [{ when: "use", if: [{ gate: "in-combat" }], target: "self", do: { verb: "special", handler: "berserker-stimrig" },
                          for: { duration: "until-combat-ends" },
                          text: "During combat, activate the rig to enter an altered state of battle madness. While active, you take and deal double melee damage." }],
  "Combat Voxbox": [{ when: "use", target: "all-in-range", do: { verb: "damage", dice: "1d8" }, mode: "reminder",
                      text: "Your scream deals d8 damage and triggers a Morale Save in all creatures with ears." }],
  "Cyber Stinger": [natural("Cyber Stinger Tail", "You have a cybernetic scorpion tail. Make an extra melee attack each turn (d8 TOX)."),
                    note("This is an EXTRA attack each round - not a replacement for your normal attack.", "Always Active", "Benefit", "Combat")],
  "Dreadnaught Carapace": [av(8, "You are encased in bomb-proof plating. +8 to your base AV."),
                           { when: "passive", do: { verb: "upkeep", item: "Food Ration", per: "day", times: 2, unpaid: "deprived" },
                             text: "You must consume double rations each day or begin to starve." },
                           { when: "passive", do: { verb: "upkeep", item: "Water Ration", per: "day", times: 2, unpaid: "deprived" },
                             text: "You must consume double rations each day or begin to starve." },
                           note("Cannot sneak, jump, swim, or ride a steed.", "Always Active", "Detriment", "Movement & Environment")],
  "Dream Artefact Assembler": [selfSave("psy", "Each night, make a PSY save to dream a small inanimate object into existence.")],
  "Ferrosteel Ankle Anchors": [note("Can immovably anchor yourself to solid surfaces.", "On-Demand", "Benefit", "Movement & Environment")],
  "Magnetised Palms": [{ when: "use", do: { verb: "special", handler: "magnetised-palms" },
                         text: "Your hands and feet can generate a powerful magnetic field. You can stick yourself to metallic objects." },
                       note("Can stick yourself to metallic objects.", "On-Demand", "Benefit", "Movement & Environment")],
  // Chunk 4 (RULED 2026-10-06, Matt): the tab row left whole - the food is applied, and
  // 'must still drink water' is no change, so a reminder of it would read as a rule.
  "Omniguts": [{ when: "passive", do: { verb: "upkeep", item: "Food Ration", per: "day", also: ["Stone", "Scrap Metal"] },
                 text: "Previously inedible materials like stone or metal count as Rations. You must still drink water." }],
  "Phoenix Core": [note("On death, you can be uploaded into a new body, retaining personality/memories/Abilities/Level.", "Always Active", "Benefit", "Combat")],
  "Pseudowomb": [note("Given a DNA sample, can incubate a tiny clone of that creature.", "On-Demand", "Benefit", "Utility")],
  "Quantum Tunnelling BlinkPack": [selfSave("int", "Make an INT Save to teleport to a location that you can see.")],
  "Roving Eye": [note("Removable camera eye - can stick it to a surface for up to a week of visual feed.", "On-Demand", "Benefit", "Utility")],
  "Helping Hands": [baked("hands", "+2"),
                    note("With a second weapon equipped, you can make an extra attack each round.", "Always Active", "Benefit", "Combat")],
  // Ruling C (8): a use control, one hour in sunlight, as Leaves. Its tab row left in chunk 4 (RULED 2026-10-06, Matt).
  "Solar Scaling": [av(1, "+1 base AV."), live("ego", 1, "+1 EGO."),
                    { when: "use", if: [{ gate: "daylight" }], target: "self",
                      do: { verb: "special", handler: "hourly-heal", dice: "1d6", hour: "one hour relaxing beneath the sun's red glare", says: "relaxes beneath the sun", doing: "relaxing beneath the sun" },
                      text: "Regain d6 HP for each hour spent relaxing beneath the sun's red glare." }],
  "Tactical Anomaly Scanner": [note("Know the Level/HP/AV/Morale of any Hypergeometric or Outsider creature in visual range.", "Always Active", "Benefit", "Utility")],
  // Ruling C (7): a judgement call, asked of the GM once per creature (Matt), not the computed armoured gate.
  // Its tab row left in chunk 4 (RULED 2026-10-06, Matt).
  "Tactical Flaw Analysis": [live("int", 2, "+2 to INT."),
                             { when: "attack-roll", if: [{ gate: "creature-kind", is: "armoured or a vehicle" }], do: { verb: "adv", on: "attack" },
                               text: "Gain ADV on to-hit rolls against armoured opponents and vehicles." }],
  "Tank Treads": [natural("Tank Treads Ram", "You deal an extra +d10 ramming damage when charging into combat."),
                  { when: "attack-hit", if: [melee, charging], do: { verb: "damage", dice: "1d10", addOn: true }, text: "You deal an extra +d10 ramming damage when charging into combat." },
                  note("ADV on Saves relating to slippery or uneven ground.", "Always Active", "Benefit", "Combat")],
  "Vigilance Radar": [immune("ambush", "You are not surprised by ambushes."),
                      note("Detect motion through walls.", "Always Active", "Benefit", "Combat")]
};

const stripUndefined = s => JSON.parse(JSON.stringify(s));

// Each implant as { effects: [...] } - the shape every roster entry carries.
export const IMPLANT_EFFECTS = Object.fromEntries(
  Object.entries(IMPLANT_SENTENCES).map(([name, list]) => [name, { effects: list.map(stripUndefined) }]));
