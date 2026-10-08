/**
 * The remaining sources as effect sentences - Effect Engine: Remaining Sources,
 * chunk 1 (foundry-system-index.csv "Effect Engine: Remaining Sources", BUILD
 * PLAN RULED 2026-10-07 by Matt).
 *
 * READ THIS BEFORE EDITING:
 *  - RULING A: a source that is no Item - a trap, hazard or obstacle; a weather;
 *    a Codex mishap; a faction standing - has sentences KEYED by its roster entry
 *    (the trap's label, the weather's key, the mishap's name, the standing's
 *    key), read like the named wounds: no new Item, no stored data.
 *  - RULING B: a Codex Item's sentences come from the equation it records
 *    (system.equation - the roster key, not its display name).
 *  - RULING D: actor states written in play are read through an actor-level
 *    source, as creature ruling B.
 *  - CHUNK 1 RULES NO VERB, as Creatures chunk 1: each field or flag becomes one
 *    sentence carrying its value whole under a handler named for it. The reader
 *    chunks (2a-2d) rule each verb against a real source. TWO EXCEPTIONS, each a
 *    shape already ruled: the faction standings' ADV and DIS (Reaction Roll from
 *    Faction Standing, RULED 2026-10-07) and the Oxygen Mask's damage property
 *    (Starskin's ruled sentence, Implants, Exotica and Figments chunk 2).
 *  - Every roster field and flag is translated here or named in a
 *    NOT_TRANSLATED list with its reason - tools/test-remaining-effects.mjs
 *    fails on one in neither.
 *
 * Pure data: no Foundry global.
 */

import { EQUATIONS, MISHAPS } from "./codex-data.js";
import { TRAPS } from "../combat/trap-data.js";
import { WEATHER_TYPES, BEAM_STORMS } from "../time/weather-data.js";
import { TRADE_GOOD_QUALITIES } from "../item/trade-good-quality.js";
import { handlerFor } from "./creature-effects-data.js";

const plain = html => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/**
 * One field -> sentences, by a trigger table: [{ when, do: { verb: "special",
 * handler, from, value }, text }]. A field whose value is a list is one sentence
 * per element. `from` and `value` are the bake record, so the field reads back.
 */
function fieldSentences(entry, triggers, text)
{
  const out = [];
  for (const [key, when] of Object.entries(triggers))
  {
    const value = entry?.[key];
    if (value === undefined || value === null || value === false) continue;
    const one = v => out.push({ when, do: { verb: "special", handler: handlerFor(key), from: key, value: v }, text });
    if (Array.isArray(value)) value.forEach(one); else one(value);
  }
  return out;
}

/** Sentences back to the fields they came from: { field: value } (a list field gathered in order). */
export function fieldsFromSentences(list, listFields = new Set())
{
  const out = {};
  for (const s of list ?? [])
  {
    const key = s.do?.from;
    if (!key) continue;
    if (listFields.has(key)) (out[key] ??= []).push(s.do.value);
    else out[key] = s.do.value;
  }
  return out;
}

/** The words of a source as its reminder, when it has any. */
const words = (when, text) => text ? [{ when, do: { verb: "reminder", from: "words" }, text }] : [];

/* -------------------------------------------------------------------------- */
/* HYPERGEOMETRIC CODEX (rulings A and B)                                      */
/* -------------------------------------------------------------------------- */

/** An equation's fields: all happen when the Codex is read (a passed read). */
export const CODEX_EQUATION_TRIGGERS = { applies: "use", save: "use", targetDamage: "use" };
/**
 * A mishap's fields: on a failed read - the natural 1 picks the d20 mishap
 * (chunk 2a, RULED 2026-10-07: on-failed-save, not use).
 */
export const CODEX_MISHAP_TRIGGERS = { applies: "on-failed-save" };
export const CODEX_NOT_TRANSLATED = {
  roll: "the d100 range that picks it - the table, not the effect",
  name: "its key (an equation's is what a Codex Item records in system.equation)",
  effect: "its words - every sentence's text, and its reminder"
};

/*
 * THE VERBS - chunk 2a (RULED 2026-10-07, Matt; creature 2b's applies and save
 * rulings): applies with a Combat Condition is condition {state} for its span,
 * with an effect a reminder lasting on the board; a save resists in its ability
 * against its words and its do is the failure - Radiance's applies; Freeze's
 * targetDamage is ability-damage on the targeted tokens. "INT" stays in the
 * value, filled with the reader's INT at the read. Every resolve mode as today.
 */
const spanOf = a => a?.amount !== undefined && a?.amount !== null && a?.amount !== ""
  ? { duration: `${a.unit ?? "round"}s`, amount: String(a.amount) } : null;
const appliesDo = a => a?.condition ? { verb: "condition", state: a.condition } : { verb: "reminder", lasting: true };

/** An equation's or mishap's sentences: [save-with-its-failure | applies], targetDamage, its words. */
function codexSentences(entry, triggers)
{
  const out = [];
  const a = entry.applies, s = entry.save, td = entry.targetDamage;
  const span = spanOf(a);
  if (s)
    out.push({ when: triggers.save, resist: { type: "save", ability: s.ability, vs: s.vs },
               do: { ...appliesDo(a), from: "save", value: s, ...(a ? { applies: a } : {}) }, ...(span ? { for: span } : {}), text: entry.effect });
  else if (a)
    out.push({ when: triggers.applies, do: { ...appliesDo(a), from: "applies", value: a }, ...(span ? { for: span } : {}), text: entry.effect });
  if (td)
    out.push({ when: triggers.targetDamage, target: { who: "one-target" },
               do: { verb: "ability-damage", ability: td.ability, dice: `${td.count}d${td.die}`, from: "targetDamage", value: td }, text: entry.effect });
  return [...out, ...words(triggers.applies ?? "use", entry.effect)];
}

/** A Codex sentence list back to its fields: { save, applies, targetDamage } - a save's failure is its applies. */
export function codexFieldsFromSentences(list)
{
  const out = {};
  for (const s of list ?? [])
  {
    const from = s.do?.from;
    if (from === "save") { out.save = s.do.value; if (s.do.applies) out.applies = s.do.applies; }
    else if (from === "applies") out.applies = s.do.value;
    else if (from === "targetDamage") out.targetDamage = s.do.value;
  }
  return out;
}

/** { [equation name]: sentences }. */
export const CODEX_EQUATION_EFFECTS = Object.fromEntries(EQUATIONS.map(e => [e.name, codexSentences(e, CODEX_EQUATION_TRIGGERS)]));

/** { [mishap name]: sentences }. */
export const CODEX_MISHAP_EFFECTS = Object.fromEntries(MISHAPS.map(m => [m.name, codexSentences(m, CODEX_MISHAP_TRIGGERS)]));

/* -------------------------------------------------------------------------- */
/* TRAPS, HAZARDS AND OBSTACLES (ruling A) - keyed by the label as printed     */
/* -------------------------------------------------------------------------- */

/**
 * `hazard` is the vocabulary's "the Referee triggers it (a trap, a room)": the
 * card's buttons. A tick runs each round of exposure, a turn effect and a vortex
 * each Exploration Turn; `applies` is what a failed save puts on.
 */
export const TRAP_TRIGGERS = {
  saves: "hazard", damage: "hazard", applies: "on-failed-save", tick: "each-round", turn: "each-turn",
  projector: "hazard", vortex: "each-turn", tox: "hazard", spawn: "hazard", poison: "hazard",
  metalPull: "hazard", affliction: "hazard"
};
/** Trap fields that are lists: one sentence per element. */
export const TRAP_LIST_FIELDS = new Set(["saves", "damage", "applies"]);
export const TRAP_NOT_TRANSLATED = {
  atom: "the atom-index.csv row it answers to - tracking, not behaviour"
};
/**
 * Carried, not a field of its own: damageLabel is the damage button's words, the
 * damage sentences' `label` (chunk 2b corrected chunk 1, RULED 2026-10-07).
 */
export const TRAP_CARRIED = ["damageLabel"];

/*
 * THE VERBS - chunk 2b (RULED 2026-10-07, Matt). A save resists and its do is
 * its failure (creature 2b); applies a condition or a lasting reminder; damage
 * per part; a tick ability damage or damage, gated on its creature types; a
 * turn's save, TOX, wound or ability losses; tox, spawn and affliction their
 * verbs; projector, vortex, poison and metalPull named handlers (one-off
 * mechanics, as creature 2c-i). Every resolve mode as today.
 */
const typeGate = types => types?.length ? { if: [{ gate: "creature-type", is: [...types] }] } : {};
/** What a failed save brings: damage, death, a hold - the whole failure in the value. */
function trapFailure(f)
{
  if (f?.damage) return { verb: "damage", dice: f.damage.dice, ...(f.damage.type ? { type: f.damage.type } : {}) };
  if (f?.death) return { verb: "kill" };
  if (f?.hold) return { verb: "special", handler: "hold" };
  return { verb: "reminder" };
}
const resisted = (when, s, from, value, text) =>
  ({ when, resist: { type: "save", ability: s.ability, vs: s.vs }, do: { ...trapFailure(s.onFail), from, value }, ...typeGate(s.targets), text });
/** A turn's verb, by the kind it is. */
function turnDo(t)
{
  if (t.tox) return { verb: "toxin", die: t.tox };
  if (t.wound) return { verb: "add-wound", wound: t.wound };
  return { verb: "special", handler: "tick-losses" };
}

function trapSentences(label, t)
{
  const out = [];
  for (const s of t.saves ?? []) out.push(resisted("hazard", s, "saves", s, label));
  for (const a of t.applies ?? [])
    out.push({ when: "on-failed-save", do: { ...appliesDo(a), from: "applies", value: a }, ...(spanOf(a) ? { for: spanOf(a) } : {}), text: a.text ?? label });
  for (const p of t.damage ?? [])
    out.push({ when: "hazard", do: { verb: "damage", dice: p.dice, ...(p.type ? { type: p.type } : {}), from: "damage", value: p },
               ...(t.damageLabel ? { label: t.damageLabel } : {}), text: label });
  if (t.tick)
    out.push({ when: "each-round", do: { ...(t.tick.ability ? { verb: "ability-damage", ability: t.tick.ability, dice: t.tick.dice }
                                                        : { verb: "damage", dice: t.tick.dice, ...(t.tick.type ? { type: t.tick.type } : {}) }),
                                         from: "tick", value: t.tick }, ...typeGate(t.tick.targets), text: t.tick.note ?? label });
  if (t.turn)
    out.push(t.turn.save ? resisted("each-turn", t.turn.save, "turn", t.turn, t.turn.note ?? label)
                         : { when: "each-turn", do: { ...turnDo(t.turn), from: "turn", value: t.turn }, text: t.turn.note ?? label });
  if (t.tox) out.push({ when: "hazard", do: { verb: "toxin", die: t.tox, from: "tox", value: t.tox }, text: label });
  if (t.spawn) out.push({ when: "hazard", do: { verb: "spawn-creature", creature: t.spawn.creature, count: t.spawn.dice, from: "spawn", value: t.spawn }, text: label });
  if (t.affliction) out.push({ when: "hazard", do: { verb: "add-affliction", affliction: "random", kind: t.affliction, from: "affliction", value: t.affliction }, text: label });
  for (const k of ["projector", "vortex", "poison", "metalPull"])
    if (t[k] !== undefined && t[k] !== null && t[k] !== false)
      out.push({ when: TRAP_TRIGGERS[k], do: { verb: "special", handler: handlerFor(k), from: k, value: t[k] }, text: t[k]?.note ?? label });
  return out;
}

/** { [label]: sentences }. A trap carries no words of its own: the rolled result's text is them. */
export const TRAP_EFFECTS = Object.fromEntries(Object.entries(TRAPS).map(([label, t]) => [label, trapSentences(label, t)]));

/** A trap's sentences back to its fields, in the roster's shape - damageLabel from the damage sentences' label. */
export function trapFieldsFromSentences(list)
{
  const out = fieldsFromSentences(list.filter(s => TRAP_TRIGGERS[s.do?.from]), TRAP_LIST_FIELDS);
  const label = list.find(s => s.do?.from === "damage" && s.label)?.label;
  if (label) out.damageLabel = label;
  return out;
}

/* -------------------------------------------------------------------------- */
/* WEATHER (ruling A) - keyed by the weather's key                             */
/* -------------------------------------------------------------------------- */

export const WEATHER_TRIGGERS = { vigilance: "each-day" };
export const WEATHER_NOT_TRANSLATED = {
  n: "its number on the chart", key: "its key", name: "its name",
  text: "its description - the words a weather card shows"
};

/**
 * { [weather key]: sentences }: the Vigilance Die's DIS, the rule as a reminder
 * while it lasts (RULED 2026-09-23: the weather's rules are the Referee's), and
 * a sandstorm's Beam note on an attack (BEAM_STORMS, RULED 2026-09-23).
 */
/*
 * THE VERBS - chunk 2c-i (RULED 2026-10-07, Matt): the Vigilance Die's DIS is
 * dis on the Vigilance Die; the sandstorm's Beam note a reminder gated on a
 * beam attack, its words the ones beamStormNote posts; the rule a reminder.
 */
export const WEATHER_EFFECTS = Object.fromEntries(WEATHER_TYPES.map(w =>
  [w.key, [
    ...(w.vigilance === "disadvantage"
      ? [{ when: "each-day", do: { verb: "dis", on: "vigilance-die", from: "vigilance", value: w.vigilance }, text: w.rule ?? w.text }]
      : w.vigilance ? fieldSentences(w, WEATHER_TRIGGERS, w.rule ?? w.text) : []),
    ...words("passive", w.rule),
    ...(BEAM_STORMS.has(w.key) ? [{ when: "attack-roll", if: [{ gate: "damage-type", is: "beam" }],
                                   do: { verb: "reminder", from: "beamStorm", value: true },
                                   text: `${w.name}: beam attacks are not effective during sandstorms — resolve by hand.` }] : [])
  ]]));

/* -------------------------------------------------------------------------- */
/* FACTION STANDINGS (ruling A; Reaction Roll from Faction Standing, RULED     */
/* 2026-10-07) - keyed by the standing's key                                   */
/* -------------------------------------------------------------------------- */

/** The two standings the book gives dice: Liked ADV, Disliked DIS (Matt, 2026-10-07). */
export const STANDING_VERBS = { liked: "adv", disliked: "dis" };
export const STANDING_NOT_TRANSLATED = {
  min: "the REP the standing starts at - the reader picks the standing from REP",
  label: "its name"
};

/**
 * A standing's sentences on the reaction roll, from its STANDINGS entry
 * (faction-reputation.js - passed in, since that module needs Foundry): ADV or
 * DIS for Liked and Disliked, the book's guidance as a reminder for the rest
 * (Matt, 2026-10-07: "sure, sounds good"). Gated on the speaker's REP.
 */
export function standingSentencesFrom(standing)
{
  if (!standing?.key) return [];
  const gate = [{ gate: "faction-rep", is: standing.key }];
  const verb = STANDING_VERBS[standing.key];
  return [{ when: "on-reaction-roll", if: gate, do: { verb: verb ?? "reminder", ...(verb ? { on: "reaction" } : {}), from: "standing", value: standing.key },
            text: standing.effect }];
}

/* -------------------------------------------------------------------------- */
/* TRADE GOOD QUALITIES - keyed by the quality's name (flags.vaarn.quality)    */
/* -------------------------------------------------------------------------- */

export const QUALITY_TRIGGERS = { declaredSpan: "passive" };
export const QUALITY_NOT_TRANSLATED = {
  roll: "the d20 that picks it", name: "its key (the Item records it in flags.vaarn.quality)",
  effect: "its words", value: "a trade-value multiplier - a stat (Stats as Sentences)",
  slot: "a slot multiplier - a stat (Stats as Sentences)", buyer: "who pays the multiplied value - part of the value stat"
};
/** False's sale span - chunk 2c-ii (RULED 2026-10-07): a reminder lasting its span, the clock false-sale.js starts. */
// Stats as Sentences chunk 2c (RULED 2026-10-07): the slot multiplier baked (slotsWithQuality
// wrote it into Slots at creation); the value multiplier an APPRAISAL, the GM's - statOf skips
// it unless asked, so a player reads the base (2026-09-19). Occult's is to Mystics only.
const qualitySentences = q => [
  ...(q.slot ? [{ when: "stat", baked: true, do: { verb: "modify", stat: "slots", amount: `x${q.slot}` } }] : []),
  ...(q.value !== undefined ? [{ when: "stat", do: { verb: "modify", stat: "trade-value", amount: `x${q.value}`, appraisal: true,
                                                    ...(q.buyer ? { to: q.buyer } : {}) } }] : []),
  ...(q.declaredSpan ? [{ when: "passive", do: { verb: "reminder", lasting: true, from: "declaredSpan", value: q.declaredSpan },
                          for: { duration: `${q.declaredSpan.unit ?? "day"}s`, amount: String(q.declaredSpan.amount) }, text: q.effect }] : []),
  ...words("passive", q.effect)];
export const QUALITY_EFFECTS = Object.fromEntries(TRADE_GOOD_QUALITIES.map(q => [q.name, qualitySentences(q)]));

/* -------------------------------------------------------------------------- */
/* STARTING GEAR found by name today (ruling F)                                */
/* -------------------------------------------------------------------------- */

/**
 * Gear whose rule code finds it BY NAME. The translator reads an old Item by its
 * name, as every translator finds its roster entry (the 2026-10-05 build plan);
 * chunk 2c writes the sentence on new ones, and the reader then asks the
 * sentence, never the name (ruling F). The Oxygen Mask: suffocation only, worn
 * (RULED - a mask is not a way to breathe underwater); Starskin's shape.
 */
export const GEAR_EFFECTS = {
  "Oxygen Mask": [{ when: "passive", state: "equipped", do: { verb: "modify", stat: "damage-properties", amount: "+oxygenMask" },
                    text: "Immune to suffocation while worn - roll its usage die, once per encounter or room where it protects." }]
};

/* -------------------------------------------------------------------------- */
/* EXHAUSTION - an Item type with no translator                                */
/* -------------------------------------------------------------------------- */

/** An Exhaustion Item's sentence: the state it is, while held - its words the Item's own (exhaustion.js EXHAUSTION_TEXT). */
export function exhaustionSentencesFrom(description = "")
{
  return [{ when: "passive", do: { verb: "special", handler: "exhaustion", from: "exhaustion", value: true }, text: plain(description) }];
}

/* -------------------------------------------------------------------------- */
/* LEFTOVER ITEM FLAGS                                                         */
/* -------------------------------------------------------------------------- */

/** Item flags with behaviour and no translator: key -> trigger. */
export const ITEM_FLAG_TRIGGERS = {
  useHeal: "use",                 // the Medgel's and Gourds' heal on use (loot-builders.js, generated-gear.js)
  lightSource: "passive",         // the Chemcell Torch's light (light-source.js)
  fruit: "use",                   // a Bloomboon fruit, eaten (bloomboon-growth.js)
  perishable: "each-day",         // spoils (perishable.js, day-start.js)
  bodyChange: "passive",          // a permanent body change - the Lithifying Ray's AV and ability loss
  graft: "passive",               // a grafted trait's AV and attack (graft.js)
  grownPart: "passive",           // a Bloomboon grown part's AV (bloomboon-growth.js)
  polymorphicPairName: "on-draw", // drawing one form puts its sibling away (actor-sheet.js)
  autoHitVs: "attack-roll",       // a hireling weapon's auto-hit against a creature type (hireling-builder.js)
  failChance: "attack-roll"       // a hireling weapon's chance to fail (hireling-builder.js)
};
export const ITEM_NOT_TRANSLATED = {
  lightColor: "the light's colour the sheet sets - a choice on the Item, not a behaviour",
  giftUnlocked: "the once-only guard on an on-draw add-gift sentence - a ledger",
  grantedBy: "the elixir that granted the Item - a link",
  bakedEffects: "the bake record every translator reads so nothing counts twice",
  quality: "the trade-good quality's name - the key QUALITY_EFFECTS is read by",
  units: "how many units the Item holds - a stat (Stats as Sentences)"
};

/*
 * THE VERBS RULED SO FAR, by the chunk that moved the flag's reader; a flag not
 * here keeps chunk 1's named handler. Chunk 2c-ii (RULED 2026-10-07, Matt): a
 * hireling weapon's autoHitVs is auto-hit gated on the target's creature type;
 * failChance the named handler fail-chance (a one-off: the dud).
 */
export const ITEM_FLAG_VERBS = {
  autoHitVs:  { do: () => ({ verb: "auto-hit" }), if: v => [{ gate: "creature-type", is: [v] }] },
  failChance: { do: () => ({ verb: "special", handler: "fail-chance" }) },
  // Chunk 2d (RULED 2026-10-07, Matt): every resolve mode as today.
  useHeal:             { do: v => ({ verb: "heal", amount: String(v) }), target: () => ({ who: "self" }) },
  lightSource:         { do: v => ({ verb: "emit-light", radius: v?.dimSquares ?? null }) },
  fruit:               { do: v => v?.eaten === "heal" ? { verb: "heal", amount: String(v.hp ?? 0) } : { verb: "toxin", die: String(v?.tox ?? "") },
                         target: () => ({ who: "self" }) },
  perishable:          { do: () => ({ verb: "item-state", state: "spoiled" }), target: () => ({ who: "this-item" }) },
  bodyChange:          { do: v => ({ verb: "modify", stat: "av", amount: `+${Number(v?.av || 0)}` }) },
  graft:               { do: v => ({ verb: "modify", stat: "av", amount: `+${Number(v?.av || 0)}` }) },
  grownPart:           { do: v => ({ verb: "modify", stat: "av", amount: `+${Number(v?.av || 0)}` }) },
  polymorphicPairName: { do: () => ({ verb: "special", handler: "polymorphic-pair" }) }
};

/** One Item's leftover flags as sentences. */
export function itemFlagSentencesFrom(flags, text = "")
{
  const t = plain(text);
  return fieldSentences(flags ?? {}, ITEM_FLAG_TRIGGERS, t).map(s =>
  {
    const verb = ITEM_FLAG_VERBS[s.do.from];
    if (!verb) return s;
    const gates = verb.if?.(s.do.value), target = verb.target?.(s.do.value);
    return { ...s, do: { ...verb.do(s.do.value), from: s.do.from, value: s.do.value }, ...(gates ? { if: gates } : {}), ...(target ? { target } : {}) };
  });
}

/* -------------------------------------------------------------------------- */
/* ACTOR STATES WRITTEN IN PLAY (ruling D)                                     */
/* -------------------------------------------------------------------------- */

export const ACTOR_STATE_TRIGGERS = {
  immuneTo: "passive",            // a split-born Glittersludge's immunity to the type that split it (bestiary-spawn.js)
  withersAtDayStart: "each-day",  // a spawn that withers at the next dawn (bestiary-spawn.js)
  autoHitAttacks: "attack-roll"   // an actor's attacks auto-hit while the state holds (actor-sheet.js)
};
/** Actor states that are lists: one sentence per element. */
export const ACTOR_STATE_LIST_FIELDS = new Set(["immuneTo"]);
export const ACTOR_STATE_NOT_TRANSLATED = {
  immuneToRule: "the name of the rule immuneTo comes from - its words",
  levelDrains: "the Levels a drainer took, kept to give back - a ledger",
  spirit: "the Spirit Form marker - identity",
  hireling: "which hireling roster the actor came from - identity",
  combatAv: "the store the Active Camouflage Ring's board entry clears (Shared Pipelines chunk 6 ruling A: the flags stay as the store their readers use)",
  metal: "a vehicle's metal - a stat (Stats as Sentences)",
  materialsValue: "a vehicle's materials value - a stat (Stats as Sentences)",
  corrosiveDegradeDeclared: "a declared answer to a standing gate - the roller's choice, not behaviour",
  chargeDeclared: "a declared answer to a standing gate - the roller's choice, not behaviour"
};

/*
 * THE VERBS - chunk 2d (RULED 2026-10-07, Matt): immuneTo immune {to} one per
 * type; withersAtDayStart the named handler withers; autoHitAttacks auto-hit
 * gated on the attack kind. Every resolve mode as today.
 */
export const ACTOR_STATE_VERBS = {
  immuneTo:          { do: v => ({ verb: "immune", to: v }) },
  withersAtDayStart: { do: () => ({ verb: "special", handler: "withers" }) },
  autoHitAttacks:    { do: () => ({ verb: "auto-hit" }), if: v => [{ gate: "attack-kind", is: v }] }
};

/** An actor's play-written states as sentences. */
export function actorStateSentencesFrom(flags)
{
  const f = flags ?? {};
  return fieldSentences(f, ACTOR_STATE_TRIGGERS, f.immuneToRule ? String(f.immuneToRule) : "").map(s =>
  {
    const verb = ACTOR_STATE_VERBS[s.do.from];
    if (!verb) return s;
    const gates = verb.if?.(s.do.value);
    return { ...s, do: { ...verb.do(s.do.value), from: s.do.from, value: s.do.value }, ...(gates ? { if: gates } : {}) };
  });
}
