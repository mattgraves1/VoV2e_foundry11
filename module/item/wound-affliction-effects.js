/**
 * The wound and affliction translators - Effect Engine: Wounds and
 * Afflictions, chunk 1 (foundry-system-index.csv "Effect Engine: Wounds and
 * Afflictions", BUILD PLAN RULED 2026-10-06 by Matt).
 *
 * A table wound's sentences come from its row (wound-effects-data.js): a wound
 * Item by the name the pipeline gave it, "<row> (Wound xN)" - only rows with
 * slots make an Item, and those names are unique across both tables - and a
 * wound being taken by its table and row. A named wound (namedWound flag) is
 * Effect Engine: Creatures' (ruling B) and gets none here. An affliction's
 * translator is item/affliction-effects.js.
 *
 * The WOUND translator is REGISTERED in chunk 2a (2026-10-06), in the change
 * that moved the wound readers (hp-pipeline.js applyWound and its 0-HP save,
 * the watchdog, stateful-effect.js's held conditions); the affliction one waits
 * for chunk 3, which moves the affliction readers.
 *
 * Pure: no Foundry global.
 */

import { WOUND_EFFECTS } from "../actor/wound-effects-data.js";
import { registerTranslator } from "../effects/interpret.js";
import { normalise } from "../effects/sentence.js";

const tagged = (list, tag) => (list ?? []).map(s => ({ ...s, tag }));
const WOUND_ITEM_NAME = /^(.*) \(Wound x\d+\)$/;

/** A table wound being taken: its row's sentences, by table ("biological" or "synthetic") and row name. */
export function woundRowSentences(table, name)
{
  return tagged(WOUND_EFFECTS[table]?.[name]?.effects, name);
}

/** The row a wound Item was made from, { table, name }, or null (a named wound, or no such row). */
export function woundRowOf(item)
{
  if (item?.type !== "wound" || item?.flags?.vaarn?.namedWound) return null;
  const name = WOUND_ITEM_NAME.exec(String(item?.name ?? ""))?.[1] ?? item?.name;
  for (const table of ["biological", "synthetic"])
    if (WOUND_EFFECTS[table][name]) return { table, name };
  return null;
}

/** A table wound Item's sentences; none for a named wound. */
export function woundSentencesOf(item)
{
  const row = woundRowOf(item);
  return row ? woundRowSentences(row.table, row.name) : [];
}

// The affliction translator moved to item/affliction-effects.js in chunk 2a
// (2026-10-06): this module is read by stateful-effect.js, and importing the
// affliction roster here closed a cycle through affliction-data.js.

registerTranslator("wound", woundSentencesOf);

/** Which wound table an actor takes its wounds from (ruling A: the table still chooses the row). */
export function woundTableKind(actor)
{
  return actor?.system?.creatureTypes?.synthetic ? "synthetic" : "biological";
}

/**
 * What a wound row does, read from its sentences (chunk 2a), in the shape the
 * pipeline took from the row: { instantDeath, maxHpDie, abilityDice,
 * abilityFlat, armorDie, levelLoss, xpReset, rollSubWounds, save, declaredSpan,
 * deathsDoor } - and, since chunk 2b, damagedItem, rerollScores and recurrence.
 * A held condition is heldConditionsOf's. Choosing the row stays the table's
 * (ruling A).
 */
export function woundEffectsOf(table, name)
{
  const list = woundRowSentences(table, name).map(normalise);
  const taken = list.filter(s => s.when?.trigger === "on-contract");
  const held = list.filter(s => s.when?.trigger === "passive");
  const handler = (l, h) => l.find(s => s.do?.verb === "special" && s.do.handler === h)?.do;
  const loss = flat => Object.fromEntries(taken.filter(s => s.do?.verb === "ability-damage" && !!s.do.flat === flat)
    .map(s => [s.do.ability, flat ? Number(s.do.dice) : s.do.dice]));
  const maxHp = taken.find(s => s.do?.verb === "max-hp")?.do.amount;
  const level = taken.find(s => s.do?.verb === "level")?.do.amount;
  const saved = taken.find(s => s.resist);
  const spanOf = s => s?.for?.amount !== undefined ? { amount: s.for.amount, unit: String(s.for.duration).replace(/s$/, "") } : null;
  const abilityDice = loss(false), abilityFlat = loss(true);
  return {
    instantDeath: taken.some(s => s.do?.verb === "kill"),
    maxHpDie: maxHp ? String(maxHp).replace(/^-/, "") : null,
    abilityDice: Object.keys(abilityDice).length ? abilityDice : null,
    abilityFlat: Object.keys(abilityFlat).length ? abilityFlat : null,
    armorDie: handler(taken, "armour-damage")?.dice ?? null,
    levelLoss: level ? Number(String(level).replace(/^-/, "")) : null,
    xpReset: !!handler(taken, "xp-reset"),
    rollSubWounds: handler(taken, "sub-wounds")?.count ?? null,
    save: saved ? { ability: saved.resist.ability, mode: "resist", vs: saved.resist.vs,
                    onFail: { entry: { name: saved.do.name, text: saved.do.effectText } } } : null,
    declaredSpan: spanOf(saved) ?? spanOf(held.find(s => s.do?.verb === "reminder")),
    deathsDoor: !!handler(held, "deaths-door"),
    // Chunk 2b (RULED 2026-10-06, Matt).
    damagedItem: handler(taken, "damaged-item")?.die ?? null,
    rerollScores: handler(taken, "reroll-scores")?.abilities ?? null,
    recurrence: handler(taken, "recurrence")?.key ?? null
  };
}

/** The conditions an Item holds through a passive stateful sentence (a wound's Blind), for stateful-effect.js. */
export function heldConditionsOf(item)
{
  return woundSentencesOf(item).map(normalise)
    .filter(s => s.when?.trigger === "passive" && s.do?.verb === "special" && s.do.handler === "stateful")
    .flatMap(s => s.do.conditions ?? []);
}
