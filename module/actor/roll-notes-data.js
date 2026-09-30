/**
 * Shared roll-note mechanism (work-queue item 14): attaches a rules-reminder
 * note to a roll's chat card instead of writing detection/resolver code for
 * every weapon tag or mutation — the GM/player reads the note and applies
 * the effect by hand.
 *
 * These three tables are the mechanism's data side. SAVE_NOTES is wired up
 * with item 3.5's 3 mutations; DAMAGE_NOTES is still empty and TO_HIT_NOTES holds Flaming —
 * populating them with item 4's ~30 weapon tags is separate follow-on work.
 */

// weapon tag name -> reminder text, shown after a damage roll
export const DAMAGE_NOTES = {};

// weapon tag name -> reminder text, shown after a to-hit roll
//
// Flaming, 2026-09-23 (Matt): the tag and the Flame damage type are one rule,
// as Electrical's are (2026-09-05). Its leftover clauses have no state and are
// about USING the weapon, so they ride the attack roll - Electrical's, which
// change the damage, ride the damage card instead.
export const TO_HIT_NOTES = {
  "Flaming": "Flaming: cannot be used underwater or against a submerged target. Ignites flammable objects.",
};

// weapon tag name -> reminder text, shown ONCE PER TARGET ACTUALLY HIT.
//
// Matt's ruling 2026-09-03, deciding what this channel is for before it
// fills up: a note whose effect only happens on a hit belongs here, not
// in DAMAGE_NOTES. `damage` is a SEPARATE BUTTON from `attack` in this
// sheet, so a DAMAGE_NOTES entry fires whenever damage is rolled, hit or
// miss — wrong for anything phrased "target must ... when struck".
// The rejected alternatives, so they are not re-proposed: gating the
// DAMAGE_NOTES post on #_hitTargets goes silent in untargeted play, and
// wording the note conditionally ("on a hit, ...") leaves it firing on
// misses and relies on the reader.
//
// Posted from _checkToHitTargets' hit branch rather than from
// _createHitMsg, so a Heat-Seeking auto-hit — which takes its own
// message path — still gets the note.
//
// EMPTY since 2026-09-24: Annihilating, its only entry, rolls a real CON save
// from a card on each hit (Compel-a-Target Save, RULED by Matt), and a
// failure is a death. The channel stays for the next hit-only reminder.
export const HIT_NOTES = {};

// mutation-name-keyed Save reminders. `abilities: null` means the note
// applies regardless of which ability button was clicked (e.g. Albino's
// "all Saves"); otherwise a list of the lowercase ability keys it applies to
// (e.g. Extra Head: ["int", "psy", "ego"]).
//
// An entry may name an ANCESTRY instead (ancestryName + rule), 2026-09-24: the
// Cacklemaw Exile's No Quarter is a save the character makes at a moment the
// sheet cannot see - showing mercy, or retreating - so it rides every EGO Save
// as a reminder rather than being compelled by anything.
export const SAVE_NOTES = [
  { mutationName: "Albino", abilities: null, note: "Albino: DIS on this Save during daylight hours unless you're carrying a sunshade." },
  { mutationName: "Extra Head", abilities: ["int", "psy", "ego"], note: "Extra Head: ADV on this Save." },
  { mutationName: "Small Stature", abilities: ["str"], note: "Small Stature: DIS on this Save." },
  { ancestryName: "Cacklemaw Exile", rule: "No Quarter", abilities: ["ego"], note: "No Quarter: you must pass an EGO Save to show mercy to a defeated foe or to retreat from a fight." },
];
