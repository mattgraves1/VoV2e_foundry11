/**
 * The Wounds tables as effect sentences - Effect Engine: Wounds and
 * Afflictions, chunk 1 (foundry-system-index.csv "Effect Engine: Wounds and
 * Afflictions", BUILD PLAN RULED 2026-10-06 by Matt).
 *
 * One entry per row of BIOLOGICAL_WOUNDS and SYNTHETIC_WOUNDS (wounds-data.js),
 * by table and row name, checked both ways by tools/test-wound-effects.mjs.
 * Which row a creature takes stays the table's HP-threshold lookup (ruling A);
 * what the row DOES is here. The ten NAMED_WOUNDS move with Effect Engine:
 * Creatures (ruling B) and have no entry.
 *
 * READ THIS BEFORE EDITING:
 *  - THE BOOK'S WORDS ARE THE TABLE'S: every text is the row's `effect`.
 *  - `on-contract` is the wound being TAKEN - the pipeline's one-off rolls
 *    (ability dice and flat losses, max HP, armour damage, Level and XP, the
 *    sub-wound rolls, death, the Knocked Out save).
 *  - `passive` is the wound HELD - on its paired Item while it has slots: its
 *    Death's Door, its condition (Vischip Disabled's Blind, the stateful
 *    bundle stateful-effect.js reads), its span, and its words as a reminder.
 *  - RULED 2026-10-06 (Matt, from chunk 1's list; built in chunk 2b): the six
 *    DIS-on-one-save wounds hold their DIS (Small Stature's shape); Damaged Item
 *    rolls its d20 and names the item in that slot as damaged (nothing is
 *    destroyed); Supercoolant Leak holds Deprived and Synthskin Damaged holds
 *    double damage taken (the stateful conditions); Personality Nexus Scrambled
 *    posts new INT, PSY and EGO scores for the Referee to apply; Cascading
 *    Kinesthetics starts its daily recurrence. "You pass out" and the flavour
 *    rows stay reminders (ruled the same day). RULED_ADDITIONS names them.
 *
 * Pure data: no Foundry global.
 */

import { BIOLOGICAL_WOUNDS, SYNTHETIC_WOUNDS } from "./wounds-data.js";

// The behaviours ruled from chunk 1's list (2026-10-06, Matt), by row name.
export const RULED_ADDITIONS = {
  "Damaged Item": [{ when: "on-contract", target: "self", do: { verb: "special", handler: "damaged-item", die: "1d20" } }],
  "Supercoolant Leak": [{ when: "passive", do: { verb: "special", handler: "stateful", conditions: ["Deprived"] } }],
  "Synthskin Damaged": [{ when: "passive", do: { verb: "special", handler: "stateful", conditions: ["takesDoubleDamage"] } }],
  "Personality Nexus Scrambled": [{ when: "on-contract", target: "self", do: { verb: "special", handler: "reroll-scores", abilities: ["int", "psy", "ego"] } }],
  "Cascading Kinesthetics Debilitation": [{ when: "on-contract", target: "self", do: { verb: "special", handler: "recurrence", key: "cascading-kinesthetics" } }]
};
// "DIS on <ABILITY> Saves." - the six that hold it.
const SAVE_DIS = /^DIS on (STR|DEX|CON|INT|PSY|EGO) Saves\.$/;

function sentencesFor(row)
{
  const take = d => ({ when: "on-contract", target: "self", do: d, text: row.effect });
  const held = (d, extra = {}) => ({ when: "passive", ...extra, do: d, text: row.effect });
  const span = row.declaredSpan ? { for: { duration: `${row.declaredSpan.unit}s`, amount: row.declaredSpan.amount } } : {};
  const out = [];
  for (const s of RULED_ADDITIONS[row.name] ?? []) out.push({ ...s, text: row.effect });
  const saveDis = SAVE_DIS.exec(row.effect);
  if (saveDis) out.push(held({ verb: "dis", on: "save", abilities: [saveDis[1].toLowerCase()] }));

  if (row.instantDeath) out.push(take({ verb: "kill" }));
  if (row.maxHpDie) out.push(take({ verb: "max-hp", amount: `-${row.maxHpDie}` }));
  for (const [ability, dice] of Object.entries(row.abilityDice ?? {})) out.push(take({ verb: "ability-damage", ability, dice }));
  for (const [ability, n] of Object.entries(row.abilityFlat ?? {})) out.push(take({ verb: "ability-damage", ability, dice: String(n), flat: true }));
  if (row.armorDie) out.push(take({ verb: "special", handler: "armour-damage", dice: row.armorDie }));
  if (row.levelLoss) out.push(take({ verb: "level", amount: `-${row.levelLoss}` }));
  if (row.xpReset) out.push(take({ verb: "special", handler: "xp-reset" }));
  if (row.rollSubWounds) out.push(take({ verb: "special", handler: "sub-wounds", count: row.rollSubWounds }));
  if (row.save)
  {
    const e = row.save.onFail?.entry ?? {};
    out.push({ ...take({ verb: "reminder", name: e.name, effectText: e.text }), ...span,
               resist: { type: "save", ability: row.save.ability, vs: row.save.vs } });
  }

  if (row.slots > 0)
  {
    if (row.deathsDoor) out.push(held({ verb: "special", handler: "deaths-door" }));
    if (row.conditions?.length) out.push(held({ verb: "special", handler: "stateful", conditions: [...row.conditions] }));
    out.push(held({ verb: "reminder" }, span));
  }
  // A row with no Item and nothing rolled (Damaged Item) is its words when taken.
  if (!out.length) out.push(take({ verb: "reminder" }));
  return out;
}

const table = rows => Object.fromEntries(rows.map(r => [r.name, { effects: sentencesFor(r) }]));

export const WOUND_EFFECTS = {
  biological: table(BIOLOGICAL_WOUNDS),
  synthetic: table(SYNTHETIC_WOUNDS)
};
