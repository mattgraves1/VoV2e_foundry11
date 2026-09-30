/**
 * Advanced Cybernetics (Treasure/Cybernetics - Advanced.md), d20.
 * Rarer/pricier tier than Starting Cybernetics (chargen-data.js's
 * IMPLANTS) — confirmed via the vault no row overlaps between the two
 * tables. Built for work-queue.txt item 1.2.
 *
 * SLOTS RULING 2026-08-23 (Matt) — the vault's own intro text for this
 * table ("occupy multiple Item Slots") is suspected AI elaboration, not
 * confirmed book content (unlike Starting Cybernetics' page, which
 * explicitly and clearly says implants occupy ZERO Item Slots). Matt's
 * call: assume Advanced Cybernetics follows the same rule as Starting
 * Cybernetics until/unless the 2e Preview PDF turns up a real number.
 * 0 slots for all 20 entries, not 2 as originally guessed.
 * RE-CONFIRMED 2026-08-26 — re-raised (an alternate "1 slot per ability
 * in ability_slot" reading was floated) and explicitly upheld: still 0
 * for both tiers. See work-queue.txt item 10.7's Decisions.
 *
 * ABILITY-SLOT EXCLUSIVITY (item 10.7, 2026-08-26) — Cybernetics -
 * Starting.md: "Each Ability may have only one implant assigned to it."
 * Confirmed (Matt) this pool is SHARED across Starting (chargen-data.js's
 * IMPLANTS) and Advanced tables — a multi-ability entry here (e.g.
 * Dreadnaught Carapace, STR+DEX+CON) blocks/is blocked by any implant
 * from EITHER table using any one of those abilities. Enforced in
 * implant-effects.js's checkImplantSlotConflict, which reads
 * `ability_slot` directly (split on "+") — no separate field needed.
 *
 * avBonus / liveAbilityBonus / naturalWeapon / handsBonus (item 10.7,
 * 2026-08-26) — same meanings as chargen-data.js's IMPLANTS fields,
 * EXCEPT ability bonuses here use `liveAbilityBonus` (looked up live,
 * every render, in actor.js) rather than IMPLANTS' baked-once
 * `stat_mod` — Advanced Implants have no chargen-finalize moment to
 * bake into, so an ability bonus here must stop applying immediately
 * if the implant Item is deleted, same reasoning avBonus already uses.
 * `naturalWeapon`/`handsBonus` ARE baked (once, on creation, via the
 * `createItem` hook in implant-effects.js) since neither is expected to
 * auto-revert if the implant is later removed, matching mutations'/
 * Starting-Implants' existing behavior.
 */

export const ADVANCED_IMPLANT_SLOTS = 0;

export const ADVANCED_IMPLANTS = [
  { roll: 1, name: "Adaptive Camo-Dermis", ability_slot: "DEX + CON", effect: "+1 base AV. Your skin is scaled with uncountable colour-changing pixel plates. When motionless, you become invisible.", avBonus: 1 },
  { roll: 2, name: "Etiquette HeadBank", ability_slot: "EGO", effect: "+2 EGO. All reaction rolls are made with ADV.", liveAbilityBonus: { ego: 2 } },
  { roll: 3, name: "Berserker StimRig", ability_slot: "STR + EGO", effect: "During combat, activate the rig to enter an altered state of battle madness. While active, you take and deal double melee damage." },
  { roll: 4, name: "Combat Voxbox", ability_slot: "PSY", effect: "Your vocal cords have been replaced by a combat grade vocoder. Your scream deals d8 damage and triggers a Morale Save in all creatures with ears." },
  { roll: 5, name: "Cyber Stinger", ability_slot: "STR + DEX", effect: "You have a cybernetic scorpion tail. Make an extra melee attack each turn (d8 TOX).", naturalWeapon: { name: "Cyber Stinger Tail", type: "melee", damage: "d8", tags: ["TOX"], note: "TOX damage. Extra attack each turn — self-adjudicated, no per-round attack-count limit exists (item 3.2's Beak/Horns Ram precedent)." } },
  { roll: 6, name: "Dreadnaught Carapace", ability_slot: "STR + DEX + CON", effect: "You are encased in bomb-proof plating. +8 to your base AV.[^dreadnaught-av] You must consume double rations each day or begin to starve. You cannot sneak, jump, swim, or ride a steed.", avBonus: 8, rationDraw: { food: 2, water: 2 } },
  { roll: 7, name: "Dream Artefact Assembler", ability_slot: "PSY", effect: "Each night, make a PSY save to dream a small inanimate object into existence." },
  { roll: 8, name: "Ferrosteel Ankle Anchors", ability_slot: "DEX", effect: "You can immovably anchor yourself to solid surfaces." },
  
  { roll: 9, name: "Magnetised Palms", ability_slot: "DEX", effect: "Your hands and feet can generate a powerful magnetic field. You can stick yourself to metallic objects." },
  { roll: 10, name: "Omniguts", ability_slot: "CON", effect: "Your stomach and digestive tract are replaced with a hardy, mixed-fuel digestive engine. Previously inedible materials like stone or metal count as Rations. You must still drink water.",
    // Diet-Matched Ration Consumption (Matt, 2026-09-23): stones, and only
    // stones - the pack Stone counts as food for them (rest.js rationKindsFor).
    // Scrap Metal joins it (Metal Item Property Part B, RULED 2026-09-27):
    // "Previously inedible materials like stone or metal count as Rations".
    rationAlso: { food: ["Stone", "Scrap Metal"] } },
  { roll: 11, name: "Phoenix Core", ability_slot: "INT", effect: "Your memories are constantly backed-up into a recoverable ego-engine implant. In the event of death, you can be uploaded into a new body, retaining your personality, memories, Ability scores, and Level." },
  { roll: 12, name: "Pseudowomb", ability_slot: "CON", effect: "You have an implanted pseudowomb device. Given a DNA sample, you can incubate a tiny clone of the creature inside your abdomen." },
  { roll: 13, name: "Quantum Tunnelling BlinkPack", ability_slot: "INT + PSY", effect: "Make an INT Save to teleport to a location that you can see." },
  { roll: 14, name: "Roving Eye", ability_slot: "PSY", effect: "One eye is a removable camera, which broadcasts to your visual cortex. You can remove this eye and stick it to any surface, receiving accurate visual data for up to one week." },
  { roll: 15, name: "Helping Hands", ability_slot: "STR + DEX", effect: "You have a second pair of cybernetic arms. You can make one extra attack per round if you equip a second weapon.", handsBonus: 2 },
  { roll: 16, name: "Solar Scaling", ability_slot: "CON + EGO", effect: "Your skin is scaled with innumerable solar panels. +1 base AV and +1 EGO. Regain d6 HP for each hour spent relaxing beneath the sun's red glare.", avBonus: 1, liveAbilityBonus: { ego: 1 } },
  { roll: 17, name: "Tactical Anomaly Scanner", ability_slot: "PSY", effect: "You know the Level, current HP, AV defence, and Morale of any Hypergeometric or outsider creature in visual range." },
  { roll: 18, name: "Tactical Flaw Analysis", ability_slot: "INT", effect: "+2 to INT. Your visual cortex can identify weak points in armour or structures. Gain ADV on to-hit rolls against armoured opponents and vehicles.", liveAbilityBonus: { int: 2 } },
  { roll: 19, name: "Tank Treads", damageAddOn: { appliesTo: "melee", requires: "charge" }, ability_slot: "DEX + CON", effect: "You have replaced your legs with a set of tank treads. You deal an extra +d10 ramming damage when charging into combat. You have ADV on Saves relating to slippery or uneven ground.", naturalWeapon: { name: "Tank Treads Ram", type: "melee", damage: "d10", note: "Only applies when charging - declare the charge on your sheet before rolling damage." } },
  { roll: 20, name: "Vigilance Radar", ability_slot: "INT", effect: "You detect motion through walls. You are not surprised by ambushes.", ambush: "immune" },
];
