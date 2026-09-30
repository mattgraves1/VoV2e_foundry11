/**
 * Gambit Resolution (foundry-system-index.csv "Gambit Resolution").
 *
 * Book content, transcribed from Combat/Gambits.md and confirmed against
 * the CRIMSON HOUND extract — the two agree word for word.
 *
 * This file is DATA ONLY. What the system does with it is settled by
 * Matt's build ruling 2026-09-11 and is deliberately narrow:
 *
 *   - the reminder fires for EVERYONE, not just player-controlled
 *     actors, because the book says "Intelligent NPCs and monsters can
 *     use gambits against their targets"
 *   - it fires only when the attack HIT, because the rule reads "in
 *     addition to rolling their attack's damage"
 *   - it ROLLS NOTHING. The Saves below are printed as text for the
 *     table to resolve by hand. Automating the Save, and the
 *     forgo-damage-to-deny-it trade, was considered and deferred the
 *     same day — see the row.
 *
 * So this is a Roll-Notes-shaped reminder rather than a resolver, and
 * the note text must stay self-contained enough to act on without
 * opening the book.
 */

// "higher than 20 after applying all bonuses" — so 21 and up, NOT 20.
// The comparison in actor-sheet.js is `>`, and this is the number it
// compares against; do not restate it as 21 here.
export const GAMBIT_THRESHOLD = 20;

// The book's seven named examples, in the book's own order.
// `save` is null where the book names no Save (Moving for a second
// time is the only one) — the renderer prints nothing rather than
// inventing an ability for it.
//
// `targetSave` is the save the card ROLLS when the attacker picks the gambit
// and keeps their damage (Gambit Resolution, reopened 2026-09-24, RULED by
// Matt); `save` stays the book's printed wording, which the menu shows and
// tools/test-gambits.mjs checks against the vault. A failed save - or a save
// denied by forgoing damage - puts on what the gambit declares: Blind's
// condition, Damage armour's -1 AV. The rest are a line on the card, the
// Concussive ruling: the book gives them no state to change.
export const GAMBITS = [
  { name: "Disarm",        save: "STR Save",                    detail: "Disarm an opponent.",
    targetSave: { ability: "str", mode: "resist", vs: "being disarmed" } },
  { name: "Damage armour", save: "STR Save vs -1 AV",           detail: "Damage an opponent's armour.",
    targetSave: { ability: "str", mode: "resist", vs: "-1 AV", onFail: { armourLoss: 1 } } },
  { name: "Move again",    save: null,                          detail: "Move for a second time, even if you could not ordinarily move this turn." },
  { name: "Forced move",   save: "STR Save",                    detail: "Forcibly move an opponent, or prevent them from moving.",
    targetSave: { ability: "str", mode: "resist", vs: "being forcibly moved" } },
  // The one gambit that inflicts a defined Combat Condition.
  { name: "Blind",         save: "DEX Save vs Blinded for one turn", detail: "Blind an opponent with thrown sand or reflected light.", applies: { condition: "blind", amount: 1, unit: "round" },
    targetSave: { ability: "dex", mode: "resist", vs: "Blinded for one turn" } },
  { name: "Steal",         save: "DEX Save",                    detail: "Steal an item from an opponent.",
    targetSave: { ability: "dex", mode: "resist", vs: "having an item stolen" } },
  { name: "Dismount",      save: "STR Save",                    detail: "Dismount an opponent from a steed or vehicle.",
    targetSave: { ability: "str", mode: "resist", vs: "being dismounted" } },
];

// The book's closing clauses, printed under the list. The open-ended
// "any comparable physical feat" is part of the rule, not flavour —
// without it the seven above read as an exhaustive menu, which they
// are not.
export const GAMBIT_OPEN_CLAUSE = "…or any comparable physical feat.";
export const GAMBIT_SAVE_CLAUSE =
  "The target may Save against a gambit — but the attacker may forgo this attack's damage to deny the Save.";
