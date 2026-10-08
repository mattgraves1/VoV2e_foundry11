/**
 * The Vaarnish Poisons' effects as sentences - Effect Engine: Consumables,
 * chunk 1 (foundry-system-index.csv "Effect Engine: Consumables", BUILD PLAN
 * RULED 2026-10-06 by Matt).
 *
 * One entry per POISON_EFFECTS row (poison-data.js), keyed by its `atom` -
 * ruling A: a poison dose stays description-only, and what converts is the
 * effect, which postPoison resolves; no Item carries it. Checked both ways by
 * tools/test-consumable-effects.mjs.
 *
 * READ THIS BEFORE EDITING:
 *  - The trigger is `hazard`: the poison landing on the poisoned creature
 *    (`self`), from a dose, a trap or a vault room.
 *  - A sentence with no `resist` is the BOLDED half the book lands whatever the
 *    Save says; a sentence with a `resist` is what a FAILED CON Save adds. Its
 *    target is the toxin rule's (10 + the die) or a flat 15 (saveTargetFor).
 *  - An AVOIDABLE effect has no bolded half: the Save is the whole question.
 *  - The board entries keep the row's label, condition and span.
 *
 * Pure data: no Foundry global.
 */

import { POISON_EFFECTS, saveTargetFor } from "./poison-data.js";

const days = amount => ({ for: { duration: "days", amount } });

function sentencesFor(e)
{
  const landed = (d, extra = {}) => ({ when: "hazard", target: "self", ...extra, do: d, text: e.text });
  const failed = (d, extra = {}) => landed(d, { resist: { type: "save", ability: "con", vs: "poison", target: saveTargetFor(e) }, ...extra });
  const timed = () => ({ verb: "reminder", name: e.label, ...(e.condition ? { condition: e.condition } : {}) });

  if (e.kind === "tox") return [failed({ verb: "toxin", die: e.die })];
  // Poison 20's failed half is a death through the kill route (chunk 3c, RULED 2026-10-06, Matt).
  if (e.kind === "maxHp") return [landed({ verb: "max-hp", amount: `-${e.bolded.formula}` }), failed({ verb: "kill", name: e.failed.text })];
  if (e.kind === "timed" && e.avoidable) return [failed(timed(), days(e.amount))];

  const out = [];
  if (e.kind === "ability") out.push(landed({ verb: "ability-damage", ability: e.bolded.ability, dice: e.bolded.formula }));
  if (e.kind === "timed") out.push(landed(timed(), days(e.amount)));
  const f = e.failed;
  if (f?.ability) out.push(failed({ verb: "ability-damage", ability: f.ability, dice: f.formula }));
  // One roll applied to every score named (Poison 12's d8 to INT and PSY).
  if (f?.kind === "abilities") out.push(failed({ verb: "ability-damage", ability: f.abilities[0], dice: f.formula, abilities: f.abilities, ...(f.note ? { note: f.note } : {}) }));
  if (f?.kind === "permanent") out.push(failed({ verb: "reminder", name: f.text }, { for: { duration: "permanent" } }));
  if (f?.kind === "permanentCondition") out.push(failed({ verb: "condition", state: f.condition, name: f.text }, { for: { duration: "permanent" } }));
  return out;
}

export const POISON_EFFECT_SENTENCES = Object.fromEntries(POISON_EFFECTS.map(e => [e.atom, { effects: sentencesFor(e) }]));

/** A poison effect's sentences, by its POISON_EFFECTS row (its `atom`), each tagged with it. */
export function poisonSentencesOf(effect)
{
  return (POISON_EFFECT_SENTENCES[effect?.atom]?.effects ?? []).map(s => ({ ...s, tag: effect.atom }));
}
