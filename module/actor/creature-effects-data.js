/**
 * Creature behaviour as effect sentences - Effect Engine: Creatures, chunk 1
 * (foundry-system-index.csv "Effect Engine: Creatures", BUILD PLAN RULED
 * 2026-10-06 by Matt).
 *
 * READ THIS BEFORE EDITING:
 *  - RULING A: a creature's sentences are read from the FLAGS the builder wrote
 *    on each Item (bestiary-build.js, generated-specials.js, generated-gear.js,
 *    usable-ability.js, rolled-stat.js) - the bake record - never from the
 *    roster by name: Item names repeat across creatures (Bite x27), spawns are
 *    renamed and carry no roster key, and a generated creature has no entry.
 *    The words are the Item's own text.
 *  - RULING B: what the builder wrote on the ACTOR (creatureFlags,
 *    daemonDefenseFlags, the monster generator's damageRules and toxinDefense)
 *    is read through an actor-level source, as ancestry ruling B - no new Item.
 *  - CHUNK 1 RULES NO VERB. Each flag becomes one sentence carrying its value
 *    whole under a handler named for the flag; a vocabulary verb is used only
 *    where it fits exactly (auto-hit). The reader chunks (2a-2e) rule each verb's
 *    resolve mode against a real creature as they move that flag's reader.
 *  - THE TRIGGER says when the behaviour happens, by Item kind: a weapon's
 *    behaviour on its attack, a rule Item's on its use or each round.
 *  - NAMED WOUNDS (ruling E): only the wound's own effects, by its NAMED_WOUNDS
 *    key; who inflicts it stays where it is. Deathblight's doubling and halving,
 *    applied today by matching its name, is said here in its own sentences.
 *
 * Checked both ways by tools/test-creature-effects.mjs: every flag the builders
 * write is translated here or named in a NOT_TRANSLATED list with its reason.
 *
 * Pure data: no Foundry global.
 */

import { NAMED_WOUNDS } from "./wounds-data.js";
import { PER_ROUND_WORDING, formulaFrom, wordsOf } from "../effects/round-wording.js";

/** holdOnHit -> hold-on-hit: the handler a flag's sentence carries. */
export const handlerFor = key => key.replace(/[A-Z]/g, c => "-" + c.toLowerCase());

/*
 * ITEM FLAGS: key -> { weapon, item } triggers. `weapon` for a weaponMelee or
 * weaponRanged, `item` for a rule or reminder Item; a key that only one kind
 * carries names only that one. `baked` marks what is fixed when the creature
 * is made (rolled at spawn), read as a property rather than run.
 */
export const ITEM_FLAG_TRIGGERS = {
  save:               { weapon: "attack-hit", item: "use" },
  applies:            { weapon: "attack-hit", item: "use" },
  abilityDamage:      { weapon: "attack-hit", item: "use" },
  abilityTick:        { weapon: "attack-hit", item: "use" },
  escalating:         { weapon: "attack-hit", item: "use" },
  targetHeal:         { weapon: "attack-hit", item: "use" },
  hpTick:             { weapon: "each-round", item: "each-round" },
  roundSave:          { item: "each-round" },
  autoHit:            { weapon: "attack-roll" },
  avAsIf:             { weapon: "attack-roll" },
  advantageVs:        { weapon: "attack-roll" },
  holdOnHit:          { weapon: "attack-hit" },
  armourLoss:         { weapon: "attack-hit" },
  followUp:           { weapon: "attack-hit" },
  woundOnHit:         { weapon: "attack-hit" },
  woundOnDamage:      { weapon: "attack-hit" },
  woundRoll:          { weapon: "attack-hit" },
  destroyItemRoll:    { weapon: "attack-hit" },
  drain:              { weapon: "attack-hit" },
  hitProgression:     { weapon: "attack-hit" },
  takesRation:        { weapon: "attack-hit" },
  maxHPLoss:          { weapon: "attack-hit" },
  levelGain:          { weapon: "attack-hit" },
  typedDice:          { weapon: "attack-hit" },
  surgicalArray:      { weapon: "attack-hit" },
  sporeDepletion:     { weapon: "attack-hit" },
  usable:             { item: "use" },
  spawn:              { item: "use" },
  spawnNow:           { item: "use" },
  summonFromDepth:    { item: "use" },
  summonFromLocation: { item: "use" },
  cloneSelf:          { item: "use" },
  avStates:           { item: "use" },
  avStep:             { item: "use" },
  encounterEffect:    { item: "use" },
  levelDrain:         { item: "use" },
  auraAbilityDamage:  { item: "use" },
  activity:           { item: "use" },
  tempHp:             { item: "use" },
  splitOnDamage:      { item: "when-hit" },
  moraleFail:         { item: "on-failed-save" },
  protector:          { item: "passive" },
  watchdog:           { item: "passive" },
  magnetField:        { item: "passive" },
  rolledStat:         { item: "stat", baked: true },
  generate:           { item: "stat", baked: true },
  generatedGear:      { weapon: "stat", item: "stat", baked: true },
  defenseNote:        { item: "passive" }
};

/** Flags a creature Item may carry that are not creature behaviour, and why. */
export const ITEM_NOT_TRANSLATED = {
  // Written by other steps' builders onto Items a creature can also carry.
  stagedBy: "an affliction's staged attack (Hiveyhump's swarm) - Wounds and Afflictions",
  namedWound: "the named-wound marker - read by namedWoundSentencesOf, not as a flag sentence",
  conditions: "a named wound's held conditions - none declared (Wounds and Afflictions chunk 2a)",
  effects: "the vaarn.effects list itself, which wins over any translator",
  effectsAdded: "the GM Effect Builder's marker",
  attackRoutine: "the Attack Routine's marker (chunk 2c-ii) - its words are its sentence; the marker only declares it has no control"
};

const WEAPON_TYPES = new Set(["weaponMelee", "weaponRanged"]);
const plain = html => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/*
 * THE VERBS RULED SO FAR, by the chunk that moved the flag's reader. A flag
 * not here keeps chunk 1's named handler. `list` flags are one sentence per
 * element (each needs its own verb parameters); the rest one sentence whole.
 * Chunk 2a (RULED 2026-10-06, Matt): every resolve mode as it works today.
 */
export const ITEM_FLAG_VERBS = {
  autoHit:         { do: () => ({ verb: "auto-hit" }) },
  abilityDamage:   { list: true, do: e => ({ verb: "ability-damage", ability: e.ability, dice: e.dice }) },
  typedDice:       { list: true, do: e => ({ verb: "damage", dice: e.dice, type: (e.damageTypes ?? [])[0] ?? null }) },
  maxHPLoss:       { do: v => ({ verb: "max-hp", amount: `-${v.dice}`, ...(v.permanent ? { permanent: true } : {}) }) },
  levelGain:       { do: v => ({ verb: "level", amount: "+1", max: v.max }),
                     if: v => v.targets?.length ? [{ gate: "creature-type", types: [...v.targets] }] : null },
  armourLoss:      { do: v => ({ verb: "modify", stat: "armour-damage", amount: `${v}` }) },
  woundOnHit:      { do: v => ({ verb: "add-wound", wound: v.wound }) },
  woundOnDamage:   { do: v => ({ verb: "add-wound", wound: v }) },
  woundRoll:       { do: v => ({ verb: "roll-table", table: "Wounds", dice: v }) },
  destroyItemRoll: { do: v => ({ verb: "item-state", state: "destroyed", dice: v }), target: () => ({ who: "item-in-slot" }) },
  followUp:        { do: () => ({ verb: "reminder" }) },
  // Chunk 2b (RULED 2026-10-06, Matt): a save resists, and its do is what a failure brings.
  save:            { list: true, resist: e => e.ability === "morale" ? { type: "morale" }
                       : { type: e.opposed ? "opposed" : "save", ability: e.ability, ...(e.vs ? { vs: e.vs } : {}) },
                     do: e => failureDo(e.onFail) },
  applies:         { list: true, do: a => a.condition ? { verb: "condition", state: a.condition } : { verb: "reminder", lasting: true },
                     for: a => a.amount !== undefined && a.amount !== null && a.amount !== "" ? { duration: `${a.unit ?? "round"}s`, amount: a.amount } : null },
  targetHeal:      { do: v => ({ verb: "heal", amount: v.dice }), target: () => ({ who: "one-target" }) },
  // Chunk 2c-i (RULED 2026-10-06, Matt); every other 2c flag its named handler.
  spawn:             { do: v => ({ verb: "spawn-creature", creature: v.creature, count: v.dice }) },
  spawnNow:          { do: v => ({ verb: "spawn-creature", creature: v.creature, count: v.dice }) },
  moraleFail:        { do: v => ({ verb: "damage", dice: v.dice, ...(v.damageTypes?.[0] ? { type: v.damageTypes[0] } : {}) }), resist: () => ({ type: "morale" }) },
  auraAbilityDamage: { do: v => ({ verb: "ability-damage", ability: v.ability, dice: v.dice }), target: () => ({ who: "all-in-range" }) },
  defenseNote:       { do: () => ({ verb: "reminder" }) }
};

/** What a failed save brings, as a verb - the first that applies, the whole failure riding in the sentence's value. */
function failureDo(f)
{
  if (!f) return { verb: "reminder" };
  if (f.graft) return { verb: "special", handler: "graft" };
  if (f.hold) return { verb: "special", handler: "hold" };
  if (f.eatsRation) return { verb: "special", handler: "eats-ration" };
  if (f.wound) return { verb: "add-wound", wound: f.wound };
  if (f.contracts) return { verb: "add-affliction", affliction: f.contracts };
  if (f.mutation) return { verb: "add-mutation", random: true };
  if (f.damage) return { verb: "damage", dice: f.damage.dice, ...(f.damage.type ? { type: f.damage.type } : {}) };
  return { verb: "reminder" };
}

/**
 * The flags whose readers read their sentences - chunk 2a (2026-10-06): the
 * attack flags. Grows with each reader chunk; only these reach the weapon
 * translator, so nothing is read before its reader moves.
 */
export const MOVED_FLAGS = new Set(["autoHit", "avAsIf", "advantageVs", "followUp", "abilityDamage", "typedDice", "maxHPLoss",
  "levelGain", "armourLoss", "holdOnHit", "woundOnHit", "woundOnDamage", "woundRoll", "destroyItemRoll", "drain",
  "hitProgression", "takesRation", "sporeDepletion", "surgicalArray",
  // Chunk 2b (2026-10-06): compelled saves and the apply card.
  "save", "applies", "abilityTick", "escalating", "targetHeal",
  // Chunk 2c-i (2026-10-06): every other Item flag - rule-Item controls, per-round, summons, built at spawn.
  "hpTick", "roundSave", "magnetField", "spawn", "spawnNow", "summonFromDepth", "summonFromLocation", "cloneSelf", "splitOnDamage",
  "avStates", "avStep", "levelDrain", "auraAbilityDamage", "encounterEffect", "activity", "tempHp", "rolledStat", "protector",
  "watchdog", "moraleFail", "usable", "generate", "generatedGear", "defenseNote",
  // Chunk 2c-ii (2026-10-06): a creature rule Item's words - per-round and its dice.
  "words"]);

/**
 * One Item's flags as sentences: [{ when, do, if?, text, baked? }]. Every
 * sentence's `do` carries `from` (the flag) and `value` (its value, or a list
 * flag's element) - the bake record, so the flag reads back exactly and a
 * reader can tell a creature's sentence from a weapon tag's sharing its verb.
 * `type` and `description` are the Item's; a creature Item with no behaviour
 * flag (a countdown, an ongoing ability's reminder) is its words as a reminder.
 */
export function creatureItemSentencesFrom(flags, { type = "item", description = "", effect = "", rule = false } = {})
{
  const text = plain(description);
  const kind = WEAPON_TYPES.has(type) ? "weapon" : "item";
  const out = [];
  for (const [key, value] of Object.entries(flags ?? {}))
  {
    const spec = ITEM_FLAG_TRIGGERS[key];
    if (!spec) continue;
    const when = spec[kind] ?? spec.weapon ?? spec.item;
    const verb = ITEM_FLAG_VERBS[key];
    const one = v =>
    {
      const gates = verb?.if?.(v), target = verb?.target?.(v), resist = verb?.resist?.(v), span = verb?.for?.(v);
      out.push({ when, ...(resist ? { resist } : {}), do: { ...(verb ? verb.do(v) : { verb: "special", handler: handlerFor(key) }), from: key, value: v },
                 ...(gates ? { if: gates } : {}), ...(target ? { target } : {}), ...(span ? { for: span } : {}), ...(spec.baked ? { baked: true } : {}), text });
    };
    if (verb?.list && Array.isArray(value)) value.forEach(one); else one(value);
  }
  // A CREATURE RULE ITEM'S WORDS (chunk 2c-ii, RULED 2026-10-06, Matt): read once,
  // here, into its sentence - whether they tick each round and the first dice they
  // name - since a built Item records no roster entry and its words are the only
  // source. The round toggle, activation and prompt read this sentence.
  if (rule && (text || effect))
  {
    const item = { system: { description, effect } };
    const perRound = PER_ROUND_WORDING.test(wordsOf(item));
    out.push({ when: perRound ? "each-round" : "passive",
               do: { verb: "reminder", from: "words", value: { perRound, formula: formulaFrom(item) } }, text });
  }
  else if (!out.length && text) out.push({ when: "passive", do: { verb: "reminder" }, text });
  return out;
}

/** Sentences back to the flags they came from: { flag: value } (a list flag gathered in order). */
export function flagsFromSentences(list)
{
  const out = {};
  for (const s of list ?? [])
  {
    const key = s.do?.from;
    if (!key) continue;
    if (ITEM_FLAG_VERBS[key]?.list) (out[key] ??= []).push(s.do.value);
    else out[key] = s.do.value;
  }
  return out;
}

/*
 * ACTOR FLAGS: key -> trigger. Read through the actor-level source (ruling B).
 */
export const ACTOR_FLAG_TRIGGERS = {
  flat:                 "passive",
  ambush:               "passive",
  rationFree:           "passive",
  dietRation:           "passive",
  dailyYield:           "each-day",
  metalArmour:          "passive",
  devoursMetal:         "attack-hit",
  carcass:              "passive",
  damageRuleKey:        "passive",
  damageRules:          "passive",
  toxinDefense:         "passive",
  advantageVs:          "attack-roll",
  advantageVsCondition: "attack-roll",
  conditionImmunity:    "passive",
  attackNotes:          "attack-roll",
  boundToHost:          "passive",
  graftedToHost:        "passive",
  corrodesOnHit:        "when-hit",
  retaliation:          "when-missed",
  dropsMeleeWeapons:    "passive",
  ownerReminders:       "passive"
};

/** Actor flags that are not creature behaviour, and why. */
export const ACTOR_NOT_TRANSLATED = {
  companionKind: "which roster a companion came from (pack-build.js) - identity, not behaviour",
  levelTradeValue: "a pack marker for the level-derived trade value - a stat (Stats as Sentences)",
  regionParty: "the Region Generator's party marker",
  toxinDefenseName: "the name of the defense toxinDefense comes from - its words, not a behaviour",
  effects: "the effect board's own storage"
};

/** An actor's flags as sentences: [{ when, do, text }]. */
/*
 * THE ACTOR VERBS RULED - chunk 2d (RULED 2026-10-07, Matt); a flag not here keeps
 * its named handler. `list` flags are one sentence per element. Every resolve
 * mode as today.
 */
export const ACTOR_FLAG_VERBS = {
  ambush:               { do: v => ({ verb: "ambush", mode: v.mode }) },
  conditionImmunity:    { list: true, do: c => ({ verb: "immune", to: c }) },
  advantageVs:          { list: true, do: () => ({ verb: "adv", on: "attack" }), if: e => [{ gate: "creature-type", is: [...(e.types ?? [])] }] },
  advantageVsCondition: { list: true, do: () => ({ verb: "adv", on: "attack" }), if: e => (e.conditions ?? []).map(c => ({ gate: "has-state", is: c })) },
  retaliation:          { list: true, do: e => ({ verb: "damage", dice: String(e.damage) }), target: () => ({ who: "attacker" }),
                          when: e => e.on === "miss" ? "when-missed" : "when-hit" },
  rationFree:           { do: v => ({ verb: "modify", stat: "rations-needed", amount: "x0", rule: v }) },
  dietRation:           { do: v => ({ verb: "upkeep", item: v, per: "day" }) },
  attackNotes:          { list: true, do: () => ({ verb: "reminder" }) },
  ownerReminders:       { list: true, do: () => ({ verb: "reminder" }) }
};

/** An actor's flags as sentences: [{ when, do, if?, target?, text }], each do carrying from and value. */
export function creatureActorSentencesFrom(flags)
{
  const out = [];
  for (const [key, value] of Object.entries(flags ?? {}))
  {
    const trigger = ACTOR_FLAG_TRIGGERS[key];
    if (!trigger) continue;
    const verb = ACTOR_FLAG_VERBS[key];
    const textOf = v => typeof v === "object" && v !== null && !Array.isArray(v) && v.text ? v.text
      : Array.isArray(v) ? v.map(x => x?.text ?? x?.rule ?? "").filter(Boolean).join(" ") : "";
    const one = v =>
    {
      const gates = verb?.if?.(v), target = verb?.target?.(v);
      out.push({ when: verb?.when?.(v) ?? trigger,
                 do: { ...(verb ? verb.do(v) : { verb: "special", handler: handlerFor(key) }), from: key, value: v },
                 ...(gates?.length ? { if: gates } : {}), ...(target ? { target } : {}),
                 text: textOf(verb?.list ? [v] : v) || textOf(value) });
    };
    if (verb?.list && Array.isArray(value)) value.forEach(one); else one(value);
  }
  return out;
}

/** Actor sentences back to their flags: { flag: value } (a list flag gathered in order). */
export function actorFlagsFromSentences(list)
{
  const out = {};
  for (const s of list ?? [])
  {
    const key = s.do?.from;
    if (!key || !ACTOR_FLAG_TRIGGERS[key]) continue;
    if (ACTOR_FLAG_VERBS[key]?.list) (out[key] ??= []).push(s.do.value);
    else out[key] = s.do.value;
  }
  return out;
}

/*
 * NAMED WOUNDS (ruling E): field -> sentence. `slots`, `name` and `effect` are
 * the Item the wound makes and its words.
 */
const NAMED_WOUND_FIELDS = {
  abilityFlat:      (v, t) => Object.entries(v).map(([ability, n]) => ({ when: "on-contract", do: { verb: "ability-damage", ability, dice: Number(n), flat: true }, text: t })),
  zeroHp:           (v, t) => [{ when: "on-contract", do: { verb: "special", handler: "zero-hp" }, text: t }],
  deprived:         (v, t) => [{ when: "passive", do: { verb: "special", handler: "stateful", conditions: ["Deprived"] }, text: t }],
  secondDoseLethal: (v, t) => [{ when: "on-contract", do: { verb: "special", handler: "second-dose-lethal" }, text: t }],
  alwaysSurprised:  (v, t) => [{ when: "passive", do: { verb: "special", handler: "always-surprised" }, text: t }],
  restProof:        (v, t) => [{ when: "passive", do: { verb: "special", handler: "rest-proof", why: v }, text: t }],
  recurrence:       (v, t) => [{ when: "on-contract", do: { verb: "special", handler: "recurrence", key: v }, text: t }],
  onlyTypes:        (v, t) => [{ when: "on-contract", do: { verb: "special", handler: "only-types", types: [...v] }, text: t }],
  lethalAbove:      (v, t) => [{ when: "on-contract", do: { verb: "special", handler: "lethal-above", count: v }, text: t }],
  tally:            (v, t) => [{ when: "use", do: { verb: "special", handler: "tally", ...v }, text: t }]
};

/** Named-wound fields not translated, and why. */
export const NAMED_WOUND_NOT_TRANSLATED = {
  name: "the Item's name", slots: "the Item the wound makes (creation)", effect: "every sentence's text"
};

/*
 * WHAT CODE APPLIES BY NAME, said as sentences: Deathblight's "Each slot of
 * Deathblight doubles damage taken and halves healing received" (attack-
 * properties.js and healing-multiplier.js match the wound's name today).
 */
const NAMED_WOUND_BY_NAME = {
  deathblight: t => [
    { when: "passive", do: { verb: "special", handler: "damage-taken-per-slot", factor: 2 }, text: t },
    { when: "passive", do: { verb: "special", handler: "healing-per-slot", factor: 0.5 }, text: t }
  ]
};

function namedWoundSentencesFor(key, w)
{
  const out = [];
  for (const [field, build] of Object.entries(NAMED_WOUND_FIELDS))
    if (w[field] !== undefined && w[field] !== false) out.push(...build(w[field], w.effect));
  out.push(...(NAMED_WOUND_BY_NAME[key]?.(w.effect) ?? []));
  out.push({ when: "passive", do: { verb: "reminder" }, text: w.effect });
  return out;
}

/** { [named-wound key]: { name, effects } }. */
export const NAMED_WOUND_EFFECTS = Object.fromEntries(
  Object.entries(NAMED_WOUNDS).map(([key, w]) => [key, { name: w.name, effects: namedWoundSentencesFor(key, w) }]));

/*
 * BOOK DATA NO CODE APPLIES (ruling D, 2026-10-06): fields the rosters carry
 * that no reader consults. RULED 2026-10-06 (Matt): `routines` becomes a
 * reminder on the creature's sheet (built with the rule-Item reminders, chunk
 * 2c); the ability fields are said in the ability's own words, which its
 * sentences carry - left as they are, nothing built.
 * tools/test-creature-effects.mjs fails on a roster field in neither this list
 * nor its own list of fields some code reads, so a new one cannot slip past.
 */
export const UNREAD_ROSTER_FIELDS = {
  // routines left this list in chunk 2c-ii: bestiary-build.js attackRoutineItems reads it.
  entry: {},
  ability: {
    targetCount: "how many targets an ability takes (\"Glittersludge's Level\")",
    scope: "who an ability reaches (\"All foes\")",
    targeting: "which targets an ability affects (Biotic Grenade: True-kin, other ancestries)",
    derived: "what a damage figure is derived from (\"Target's Gleam\", \"Kronophage's LVL\")",
    scalesWithLevel: "the damage scales with Level (Fleshwarp's Fist Flurry)"
  }
};
