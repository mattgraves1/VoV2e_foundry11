/**
 * Work-queue item 12 — the character sheet's "Forgettable Effects" tab.
 * Source of truth is Matt's vetted Google Drive review ("Vaarn Item 12 -
 * Forgettable Effects Review (v3)"), approved 2026-08-28 — every row here
 * is a direct transcription of that CSV's Name/Effect Type/Section/
 * Polarity/Proposed Reminder Text columns. Do not add entries here without
 * updating that CSV first; it's the reviewed record of what's excluded and
 * why.
 *
 * `itemType` says how to match this entry against the actor's owned Items:
 * - "mutation"/"implant"/"exotica" — actor has an owned Item of that
 *   Foundry type whose name equals this entry's `name`
 * - "weaponTag" — actor has an equipped weaponMelee/weaponRanged Item
 *   whose system.tags array includes this entry's `name`
 *
 * Rows whose original rules text mixed both polarities in one clause
 * (e.g. Slug Body, Gills, Wings, Blind, Mirror Armour) were split into two
 * atomic rows in the CSV, one per polarity — that split is preserved here.
 *
 * THE REVIEW CSV IS SUPERSEDED as the record of what is here, 2026-09-16.
 * atom-index.csv holds one row per entry on "Forgettable-Effects Tab", and a
 * deletion is recorded there as SUPERSEDED with the reason. RULED 2026-09-16
 * (Matt): an entry whose clause the sheet now APPLIES leaves this tab - the
 * reminder was for situations the player had to remember, and the effect text
 * is still on the Item. Seven left that day (Backwards Legs, Bulbous Eyes,
 * Cyclops, Double Muscled, Extra Legs, Extra Liver, Heightened Immune System);
 * the rest are swept at the end of wiring, on the row "Save-Modifier Effects
 * on the Forgettable Tab". Cyberliver left 2026-09-16 on the same rule.
 *
 * THE SWEEP RAN 2026-09-27 (Matt approved the list). Eleven entries left
 * because the sheet applies the whole note: Backwards Head, Exposed Organs,
 * Powerful Jaws, Tusks, Horns Rhino, Antlers, Heightened Hearing, Air Current
 * Microsensor, and the applied half of Gills (breathe underwater),
 * Bioluminescence (light source) and Mirror Armour (immune to Beam). Eight
 * compound notes were TRIMMED to the clause the sheet does not apply: Gills,
 * Tank Treads, Starskin, Ultravisor, Echolocation, Ultravision, Vigilance
 * Radar, Dreadnaught Carapace. RULED 2026-09-23 (Matt) and kept deliberately
 * although the Long Rest applies them: Obligate Carnivore, Obligate Lithovore,
 * Vampiric - the player needs to know WHY a Stone or Raw Meat is needed before
 * the rest, not after it fails. The rulings are on each atom's tab row.
 */
export const FORGETTABLE_EFFECTS = [
  // THE MUTATION ROWS LEFT 2026-10-06 (Effect Engine: Mutations and Ancestry
  // Rules chunk 5): each mutation's tab reminders are its own sentences now
  // (mutation-effects-data.js, the same words), read by effects/body.js
  // bodyTabReminders. tools/test-mutation-effects.mjs keeps the 44 rows frozen.
  //
  // THE IMPLANT, EXOTICA AND EXOTICA ARMOUR ROWS LEFT 2026-10-06 (Effect Engine:
  // Implants, Exotica and Figments chunk 4, RULED by Matt): their own sentences
  // now (implant-effects-data.js, exotica-effects-data.js). Seven left the tab
  // because the sheet applies them and Hushboots was trimmed to its sneaking;
  // tools/test-implant-exotica-effects.mjs keeps the 39 rows frozen.

  { name: "Blasphemous", itemType: "weaponTag", category: "Social", section: "Always Active", polarity: "Detriment", note: "DIS on reaction rolls with followers of the religious leader who cursed you." },
  { name: "Sacred", itemType: "weaponTag", category: "Social", section: "Always Active", polarity: "Benefit", note: "ADV on reaction rolls with followers of the religious leader who blessed you." },
  // Rocket Boosted's altitude clause, adjudicated rather than part of firing
  // the weapon (Matt, 2026-10-05). Shown from the weapon's sentences (5a).
  { name: "Rocket Boosted", itemType: "weaponTag", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can be used to gain altitude - the Referee adjudicates how." },
  { name: "Stim-Boosting", itemType: "weaponTag", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Make one extra combat action per round." },

];
