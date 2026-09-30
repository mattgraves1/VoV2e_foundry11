/**
 * The Vaarnish Poisons generator — foundry-system-index.csv "Toxin and Flora
 * Item Surface", the Toxins half, built 2026-09-19.
 *
 * FOUR INDEPENDENT d20 COLUMNS, not twenty poisons. Matt, 2026-09-19: "the
 * poisons table is not a list of 20 poisons with one row for each - it is a
 * generator where you roll a d20 on each column independently to create unique
 * poisons." Colour, Form and Delivery are flavour; only Effect carries rules,
 * and the twenty atom rows in atom-index.csv are the Effect column.
 *
 * TRANSCRIBED FROM THE VAULT, Core Rules/Toxins.md, which is the current
 * transcription of JADE IBIS pp.55-56 — those two pages are IMAGES in the PDF
 * and are absent from the text extract entirely, so the vault outranks every
 * edition text on disk here. See the Source Reconciliation row.
 *
 * ── HOW A SAVE READS ──────────────────────────────────────────────────────
 *
 * The book: "Where multiple poison effects are given, the bolded effect cannot
 * be avoided with a CON Save." So a two-part effect always lands its bolded
 * half, and a FAILED save adds the second half on top. RULED 2026-09-19
 * (Matt): confirmed, and the save target is the toxin rule where TOX applies —
 * CON vs 10 + the toxin die — and a flat 15 for everything else.
 *
 * A SINGLE EFFECT THAT IS NOT BOLDED IS AVOIDABLE, which is this file's one
 * reading rather than a quoted rule: rows 16-19 print one effect in ordinary
 * type, and the bolding note exists precisely to mark what a save cannot stop.
 * `avoidable: true` is where that reading lives, so flipping it is one edit.
 */

import { BLIND } from "./condition-data.js";
import { NO_GIFTS } from "./affliction-data.js";
import { TAKES_DOUBLE_DAMAGE } from "../item/attack-properties.js";

export const POISON_COLOURS = [
  "Crimson", "Azure", "Ochre", "Ash-grey", "Black",
  "White", "Jade", "Golden", "Silver", "Brassy",
  "Colourless", "Pink", "Indigo", "Purple", "Iridescent",
  "Orange", "Teal", "Brown", "Turquoise", "Octarine"
];

export const POISON_FORMS = [
  "Liquid", "Liquid", "Liquid", "Oil", "Oil",
  "Oil", "Oil", "Powder", "Powder", "Powder",
  "Paste", "Paste", "Paste", "Sand", "Glass",
  "Leaf", "Blood", "Crystal", "Fungus", "Sugar"
];

export const POISON_DELIVERY = [
  "Must be ingested", "Must be ingested", "Must be ingested", "Must be ingested", "Must be ingested",
  "Must be ingested", "Must be ingested", "Must be ingested", "Contact with skin", "Contact with skin",
  "Contact with skin", "Airborne", "Airborne", "Coated on weapon", "Coated on weapon",
  "Coated on weapon", "Coated on weapon", "Coated on weapon", "Harmless until mixed with catalyst",
  "Harmless until mixed with catalyst"
];

/**
 * The Effect column. `text` is the book's own wording for the Item and the
 * card; everything else is what applying it needs.
 *
 *   tox      — a Toxin Die, with the toxin rule's own save (10 + die size).
 *   ability  — `bolded` always, `failed` as well on a failed Save.
 *   timed    — a span on the Active Effect Board, optionally carrying a
 *              condition other code already reads.
 *   maxHp    — the one row that can kill outright.
 *
 * `atom` is the atom-index.csv Atom Name, so a row and its atom can be joined
 * without matching prose.
 */
export const POISON_EFFECTS = [
  { roll: 1, atom: "Poison 01: D6 TOX damage",  text: "d6 TOX damage",  kind: "tox", die: "d6" },
  { roll: 2, atom: "Poison 02: D8 TOX damage",  text: "d8 TOX damage",  kind: "tox", die: "d8" },
  { roll: 3, atom: "Poison 03: D10 TOX damage", text: "d10 TOX damage", kind: "tox", die: "d10" },
  { roll: 4, atom: "Poison 04: D12 TOX damage", text: "d12 TOX damage", kind: "tox", die: "d12" },
  { roll: 5, atom: "Poison 05: D20 TOX damage", text: "d20 TOX damage", kind: "tox", die: "d20" },

  { roll: 6,  atom: "Poison 06: STR loss", text: "d4 STR loss / d10 STR loss",
    kind: "ability", bolded: { ability: "str", formula: "1d4" }, failed: { ability: "str", formula: "1d10" } },
  { roll: 7,  atom: "Poison 07: DEX loss", text: "d4 DEX loss / d10 DEX loss",
    kind: "ability", bolded: { ability: "dex", formula: "1d4" }, failed: { ability: "dex", formula: "1d10" } },
  { roll: 8,  atom: "Poison 08: CON loss", text: "d4 CON loss / d10 CON loss",
    kind: "ability", bolded: { ability: "con", formula: "1d4" }, failed: { ability: "con", formula: "1d10" } },
  { roll: 9,  atom: "Poison 09: INT loss", text: "d4 INT loss / d10 INT loss",
    kind: "ability", bolded: { ability: "int", formula: "1d4" }, failed: { ability: "int", formula: "1d10" } },
  { roll: 10, atom: "Poison 10: PSY loss", text: "d4 PSY loss / d10 PSY loss",
    kind: "ability", bolded: { ability: "psy", formula: "1d4" }, failed: { ability: "psy", formula: "1d10" } },
  { roll: 11, atom: "Poison 11: EGO loss", text: "d4 EGO loss / d10 EGO loss",
    kind: "ability", bolded: { ability: "ego", formula: "1d4" }, failed: { ability: "ego", formula: "1d10" } },

  // "d8 INT + PSY loss" is ONE roll against both scores, which is a reading of
  // a line that could also mean two rolls. Stated on the card either way, so
  // the Referee can rule the other reading without the code hiding it.
  { roll: 12, atom: "Poison 12: Hallucinations", text: "Hallucinations for d6 days / d8 INT + PSY loss",
    kind: "timed", label: "Hallucinations", amount: "1d6", unit: "day",
    failed: { kind: "abilities", formula: "1d8", abilities: ["int", "psy"],
              note: "one d8 applied to both scores" } , declaredSpan: null },

  { roll: 13, atom: "Poison 13: Mute / Loss of Language", text: "Mute for d6 days / Permanent Loss of Language",
    kind: "timed", label: "Mute", amount: "1d6", unit: "day",
    failed: { kind: "permanent", text: "Permanent Loss of Language" } , declaredSpan: null },

  { roll: 14, atom: "Poison 14: Blindness", text: "Blind for d6 days / Permanent Blindness",
    kind: "timed", label: "Blind", condition: BLIND, amount: "1d6", unit: "day",
    failed: { kind: "permanentCondition", condition: BLIND, label: "Blind", text: "Permanent Blindness" } , declaredSpan: null },

  { roll: 15, atom: "Poison 15: Vomiting", text: "Vomiting for d6 days, cannot eat / d8 CON loss",
    kind: "timed", label: "Vomiting — cannot eat", amount: "1d6", unit: "day",
    failed: { kind: "abilities", formula: "1d8", abilities: ["con"] } , declaredSpan: null },

  { roll: 16, atom: "Poison 16: Mystic Gifts Suppressed", text: "Unable to use Mystic Gifts for d6 days",
    kind: "timed", label: "Unable to use Mystic Gifts", condition: NO_GIFTS,
    amount: "1d6", unit: "day", avoidable: true , declaredSpan: null },
  { roll: 17, atom: "Poison 17: Paralysis", text: "Death-like Paralysis for d6 days",
    kind: "timed", label: "Death-like Paralysis", amount: "1d6", unit: "day", avoidable: true , declaredSpan: null },
  { roll: 18, atom: "Poison 18: Command Compulsion", text: "Cannot refuse commands for d6 days",
    kind: "timed", label: "Cannot refuse commands", amount: "1d6", unit: "day", avoidable: true , declaredSpan: null },
  // The condition key is what makes this real rather than a reminder: _doDamage
  // reads it through incomingDamageMultiplier. Wired 2026-09-19; until then
  // this row posted a labelled span and nothing doubled anything.
  { roll: 19, atom: "Poison 19: Double Damage Taken", text: "Suffer double damage for d6 days",
    kind: "timed", label: "Suffers double damage", condition: TAKES_DOUBLE_DAMAGE,
    amount: "1d6", unit: "day", avoidable: true , declaredSpan: null },

  { roll: 20, atom: "Poison 20: Max HP Loss", text: "Lose d8 Max HP / Instant Death",
    kind: "maxHp", bolded: { formula: "1d8" }, failed: { kind: "death", text: "Instant Death" } }
];

/** The CON Save this effect is resisted with — the toxin rule, or a flat 15. */
export function saveTargetFor(effect)
{
  return effect?.kind === "tox" ? 10 + (Number(String(effect.die).slice(1)) || 0) : 15;
}

/** Is there anything a successful Save prevents? */
export function hasAvoidableHalf(effect)
{
  return !!effect?.failed || !!effect?.avoidable;
}

/** A generated poison's name, e.g. "Ash-grey Oil". */
export function poisonName(colour, form)
{
  return `${colour} ${form}`;
}

/**
 * A poison dose as Item data: one slot, the book's delivery and effect, and the
 * CON Save note. Generate Poison makes its dose with this, and so does a vault's
 * Poison special room (Special Room Follow-ups, 2026-09-27: 'Generate from
 * Toxins'), which rolls each column on its own d20 through rollPoisonItemData.
 */
export function poisonItemData(colour, form, delivery, effect)
{
  return {
    name: poisonName(colour, form),
    type: "item",
    system: {
      slots: 1,
      description: `<p><b>${delivery}.</b></p><p><b>Effect:</b> ${effect.text}</p>`
                 + `<p class="notes">CON Save vs ${saveTargetFor(effect)} to resist`
                 + `${effect.failed ? "; the bolded half lands anyway" : ""}.</p>`
    }
  };
}

export function rollPoisonItemData(random = Math.random)
{
  const pick = list => list[Math.floor(random() * list.length)];
  return poisonItemData(pick(POISON_COLOURS), pick(POISON_FORMS), pick(POISON_DELIVERY), pick(POISON_EFFECTS));
}
