/**
 * The creature translators - Effect Engine: Creatures, chunk 1
 * (foundry-system-index.csv "Effect Engine: Creatures", BUILD PLAN RULED
 * 2026-10-06 by Matt).
 *
 * A creature Item's sentences come from the flags its builder wrote (ruling A);
 * a creature's actor-level behaviour from its actor flags (ruling B); a named
 * wound's from its NAMED_WOUNDS key (ruling E). See creature-effects-data.js.
 *
 * COMPOSED, NOT REGISTERED ON ITS OWN. Each reader chunk composes these into
 * the translators of the Item types it moves - so a creature's sentences are
 * never read before their reader moves, and nothing counts twice:
 *  - chunk 2a (RULED 2026-10-06, Matt): weaponMelee and weaponRanged, in front
 *    of the weapon-tag sentences (weapon-tags.js registers the composition),
 *    for the flags in MOVED_FLAGS only.
 *  - chunk 2b (RULED 2026-10-06, Matt): item - a rule or reminder Item - in front
 *    of the consumable sentences (consumable-effects.js composes it), the same way.
 *
 * Pure: no Foundry global.
 */

import { creatureItemSentencesFrom, creatureActorSentencesFrom, NAMED_WOUND_EFFECTS, MOVED_FLAGS, flagsFromSentences, actorFlagsFromSentences }
  from "../actor/creature-effects-data.js";
import { sentencesOf } from "../effects/interpret.js";
import { normalise } from "../effects/sentence.js";
import { statOf } from "../effects/item-stats.js";
import { PER_ROUND_WORDING, formulaFrom, wordsOf } from "../effects/round-wording.js";
import { NAMED_WOUNDS } from "../actor/wounds-data.js";

const tagged = (list, tag) => (list ?? []).map(s => ({ ...s, tag }));

/**
 * A creature RULE Item - one the creature builders make: an intrinsic `item` on an
 * NPC, or built and not yet owned (chunk 2c-ii). Its words are read into its
 * sentence; a character's gear and an NPC's carried kit are not rule Items.
 */
export function isCreatureRuleItem(item)
{
  return item?.type === "item" && !!item?.system?.intrinsic && (!item?.parent || item.parent.type === "npc");
}

/** A creature Item's sentences, from its flags (and a rule Item's words); none for an Item with no creature behaviour. */
export function creatureItemSentencesOf(item)
{
  return tagged(creatureItemSentencesFrom(item?.flags?.vaarn, { type: item?.type, description: item?.system?.description,
    effect: item?.system?.effect ?? "", rule: isCreatureRuleItem(item) }), item?.name);
}

/**
 * What an Item's words say about a round: { perRound, formula }. A creature rule
 * Item's from its sentence (chunk 2c-ii). Any other Item - an elixir, gear, an
 * Exotica - ticks when one of its sentences ticks each round OR its words do,
 * and a ticking sentence's dice are the formula (Remaining Sources chunk 2c-ii,
 * RULED 2026-10-07, Matt: 17 Items keep their per-round part in another
 * sentence - a hold's damage, an ability tick - and keep the toggle; a GM's
 * each-round sentence turns it on).
 */
export function roundWordingOf(item)
{
  if (isCreatureRuleItem(item)) return creatureFlagsOf(item).words ?? { perRound: false, formula: null };
  const ticking = sentencesOf(item).find(s => s.when?.trigger === "each-round");
  if (ticking) return { perRound: true, formula: String(ticking.do?.dice ?? ticking.do?.amount ?? "") || formulaFrom(item) };
  return { perRound: PER_ROUND_WORDING.test(wordsOf(item)), formula: formulaFrom(item) };
}

/**
 * What a translator gains (weapons in chunk 2a, rule Items in 2b): the creature
 * sentences of the flags whose readers have moved, and since 2c-ii a rule Item's
 * words. A weapon's words-only reminder never joins - every creature weapon's text
 * would reach the Forgettable Effects tab.
 */
export function creatureMovedSentencesOf(item)
{
  return creatureItemSentencesOf(item).filter(s => MOVED_FLAGS.has(s.do?.from));
}
export const creatureWeaponSentencesOf = creatureMovedSentencesOf;

/**
 * A creature Item's moved behaviour, read from its sentences, in the shape the
 * readers took from its flags: { autoHit, save, applies, holdOnHit, ... } -
 * absent where it has none. PER FLAG, the Item's own sentences win; a moved flag
 * they say nothing about - a stored effects list written before that flag's
 * chunk moved it (a GM edited a creature weapon in between) - is read through
 * the translator from the flag, so nothing it did is lost: the bake record
 * honoured (chunk 2b, 2026-10-06).
 */
export function creatureFlagsOf(item)
{
  if (!item) return {};
  const own = sentencesOf(item).filter(s => s.do?.from && MOVED_FLAGS.has(s.do.from));
  const said = new Set(own.map(s => s.do.from));
  const rest = creatureMovedSentencesOf(item).filter(s => !said.has(s.do.from)).map(normalise);
  return flagsFromSentences([...own, ...rest]);
}
/** Chunk 2a's name for it, kept at the attack readers. */
export const creatureAttackOf = creatureFlagsOf;

/** A creature's actor-level sentences, from its actor flags. */
export function creatureActorSentencesOf(actor)
{
  return tagged(creatureActorSentencesFrom(actor?.flags?.vaarn), actor?.name);
}

/**
 * What a creature itself declares, read from its actor-level sentences, in the
 * shape the readers took from its actor flags: { ambush, retaliation,
 * damageRules, ... } (chunk 2d, RULED 2026-10-07, Matt - ruling B). Any actor:
 * the flags other code writes (a grafted or bound limb, a generated creature's
 * damage rules, a companion's upkeep) read the same way.
 */
export function creatureActorFlagsOf(actor)
{
  return actorFlagsFromSentences(creatureActorSentencesOf(actor));
}

/*
 * NAMED WOUNDS FROM THEIR SENTENCES - chunk 2e (RULED 2026-10-07, Matt). Wherever
 * a wound's key resolves, its sentences are read; a copy stored on its Item or
 * Wounds-tab entry counts only for a wound with no key (the Gitch's crystals).
 */

/** A named wound's effects from its sentences, in the roster's shape ({ key, name, slots, effect, ... }); null for an unknown key. */
export function namedWoundEffectsOf(key)
{
  const entry = NAMED_WOUND_EFFECTS[key];
  if (!entry || !NAMED_WOUNDS[key]) return null;
  const list = entry.effects.map(normalise);
  const h = name => list.find(s => s.do?.verb === "special" && s.do.handler === name)?.do;
  const flat = Object.fromEntries(list.filter(s => s.do?.verb === "ability-damage" && s.do.flat).map(s => [s.do.ability, Number(s.do.dice)]));
  // The Item it makes is creation, not an effect: its slots stay the roster's.
  const out = { key, name: entry.name, slots: NAMED_WOUNDS[key].slots, effect: list.find(s => s.do?.verb === "reminder")?.text ?? "" };
  if (Object.keys(flat).length) out.abilityFlat = flat;
  if (h("zero-hp")) out.zeroHp = true;
  if (h("stateful")?.conditions?.includes("Deprived")) out.deprived = true;
  if (h("second-dose-lethal")) out.secondDoseLethal = true;
  if (h("always-surprised")) out.alwaysSurprised = true;
  if (h("rest-proof")) out.restProof = h("rest-proof").why;
  if (h("recurrence")) out.recurrence = h("recurrence").key;
  if (h("only-types")) out.onlyTypes = [...h("only-types").types];
  if (h("lethal-above")) out.lethalAbove = h("lethal-above").count;
  if (h("tally")) out.tally = { count: h("tally").count, label: h("tally").label };
  return out;
}

/** A wound Item's held effects: its key's, from the sentences; a keyless wound's stored marker. */
export function namedWoundHeldOf(item)
{
  const marker = item?.flags?.vaarn?.namedWound;
  return namedWoundEffectsOf(marker?.key) ?? marker ?? null;
}

/**
 * The per-slot factor a held named wound puts on something - "damage-taken-per-slot"
 * or "healing-per-slot" (Deathblight's x2 and x0.5) - grouped by wound:
 * [{ name, slots, perSlot }]. From each wound Item's sentences by its key, never its
 * name, so a renamed Item still counts and nothing else named alike does.
 */
export function namedWoundPerSlot(actor, handler)
{
  const by = new Map();
  for (const item of actor?.items ?? [])
  {
    if (item?.type !== "wound") continue;
    const s = namedWoundSentencesOf(item).map(normalise).find(x => x.do?.verb === "special" && x.do.handler === handler);
    if (!s) continue;
    const key = item.flags.vaarn.namedWound.key;
    const row = by.get(key) ?? { name: NAMED_WOUND_EFFECTS[key].name, slots: 0, perSlot: Number(s.do.factor) };
    row.slots += Math.max(1, Number(statOf(item, "slots")) || 1);
    by.set(key, row);
  }
  return [...by.values()];
}

/** A named wound Item's sentences, by the key its marker carries; none for any other Item. */
export function namedWoundSentencesOf(item)
{
  const key = item?.flags?.vaarn?.namedWound?.key;
  const entry = key ? NAMED_WOUND_EFFECTS[key] : null;
  return entry ? tagged(entry.effects, entry.name) : [];
}
