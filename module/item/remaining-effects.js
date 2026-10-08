/**
 * The remaining-source translators - Effect Engine: Remaining Sources, chunk 1
 * (foundry-system-index.csv "Effect Engine: Remaining Sources", BUILD PLAN
 * RULED 2026-10-07 by Matt). See actor/remaining-effects-data.js.
 *
 * A Codex Item's sentences from the equation it records (ruling B); a trap's,
 * a weather's, a Codex mishap's and a faction standing's by their key (ruling A);
 * the leftover Item flags and the actor states written in play from the flags
 * themselves (ruling D).
 *
 * Composed into each reader as its chunk moves it, so nothing is read before
 * its reader moves: chunk 2a (2026-10-07) registers the codex translator and
 * moves the Codex read; the rest are imported by nothing yet.
 *
 * Pure: no Foundry global.
 */

import { CODEX_EQUATION_EFFECTS, CODEX_MISHAP_EFFECTS, TRAP_EFFECTS, WEATHER_EFFECTS, QUALITY_EFFECTS, GEAR_EFFECTS,
  standingSentencesFrom, exhaustionSentencesFrom, itemFlagSentencesFrom, actorStateSentencesFrom, codexFieldsFromSentences,
  trapFieldsFromSentences, fieldsFromSentences, ITEM_FLAG_TRIGGERS, ACTOR_STATE_LIST_FIELDS }
  from "../actor/remaining-effects-data.js";
import { sentencesOf, registerTranslator } from "../effects/interpret.js";
import { normalise } from "../effects/sentence.js";

const tagged = (list, tag) => (list ?? []).map(s => ({ ...s, tag }));

/** A Codex Item's sentences, from the equation it records; none for an unknown equation or another Item. */
export function codexSentencesOf(item)
{
  const eq = item?.type === "codex" ? item?.system?.equation : null;
  return eq ? tagged(CODEX_EQUATION_EFFECTS[eq], eq) : [];
}

// Chunk 2a (RULED 2026-10-07, Matt): the codex translator is registered, so a
// Codex Item's own sentences win and a GM can write a homebrew equation in the
// Effect Builder. Tagged, so the generic Use control and the Effects tab - which
// read untagged sentences only - stay as they were.
registerTranslator("codex", codexSentencesOf);

/** A Codex mishap's sentences, by its name. */
export function mishapSentencesOf(name)
{
  return tagged(CODEX_MISHAP_EFFECTS[name], name);
}

const CODEX_FROM = new Set(["save", "applies", "targetDamage", "words"]);
const fieldsAndWords = list => ({ ...codexFieldsFromSentences(list), words: list.find(s => s.do?.from === "words")?.text ?? null });

/**
 * What a Codex Item does when read, from its sentences: { save, applies,
 * targetDamage, words } in the shape the reader took from the roster - or null
 * for a Codex that says nothing (an unknown equation with no sentences: the
 * reader falls back to its description). PER FIELD, the Item's own sentences
 * win; a field they say nothing of comes from the translator, as creatureFlagsOf.
 */
export function codexOf(item)
{
  if (item?.type !== "codex") return null;
  // The GM's own (untagged) sentences first - sentencesOf puts the book's in
  // front of what a GM added (GM Effect Builder ruling 2) - then the book's,
  // then the translator for anything the stored list predates; each field once.
  const all = sentencesOf(item).filter(s => CODEX_FROM.has(s.do?.from));
  const candidates = [...all.filter(s => !s.tag), ...all.filter(s => s.tag), ...codexSentencesOf(item).map(normalise)];
  const said = new Set(), list = [];
  for (const s of candidates)
  {
    const fields = s.do.from === "save" && s.do.applies ? ["save", "applies"] : [s.do.from];
    if (fields.some(f => said.has(f))) continue;
    fields.forEach(f => said.add(f));
    list.push(s);
  }
  return list.length ? fieldsAndWords(list) : null;
}

/** A mishap, from its sentences: { applies, words } - null for an unknown name. */
export function mishapOf(name)
{
  const list = mishapSentencesOf(name).map(normalise);
  return list.length ? fieldsAndWords(list) : null;
}

/** A trap, hazard or obstacle's sentences, by its label as the table prints it. */
export function trapSentencesOf(label)
{
  return tagged(TRAP_EFFECTS[label], label);
}

/**
 * A trap's fields from its sentences, in the roster's shape ({ saves, damage,
 * damageLabel, tick, turn, projector, ... }) - or null for a label that is no
 * trap (chunk 2b, RULED 2026-10-07: a label is a trap when it has sentences).
 */
export function trapOf(label)
{
  const list = trapSentencesOf(label).map(normalise);
  return list.length ? trapFieldsFromSentences(list) : null;
}

/** A weather's sentences, by its key. */
export function weatherSentencesOf(key)
{
  return tagged(WEATHER_EFFECTS[key], key);
}

/** A faction standing's sentences on the reaction roll, from its STANDINGS entry. */
export function standingSentencesOf(standing)
{
  return tagged(standingSentencesFrom(standing), standing?.label);
}

/** A trade good's quality sentences, by the quality its Item records. */
export function qualitySentencesOf(item)
{
  const q = item?.flags?.vaarn?.quality;
  return q ? tagged(QUALITY_EFFECTS[q], q) : [];
}

/** Gear a rule finds by name today (the Oxygen Mask) - an old Item by its name, as every translator finds its entry. */
export function gearSentencesOf(item)
{
  return tagged(GEAR_EFFECTS[item?.name], item?.name);
}

/** An Exhaustion Item's sentence. */
export function exhaustionSentencesOf(item)
{
  return item?.type === "exhaustion" ? tagged(exhaustionSentencesFrom(item?.system?.description), item?.name) : [];
}

/** An Item's leftover behaviour flags (useHeal, lightSource, fruit, perishable...) as sentences. */
export function remainingItemSentencesOf(item)
{
  return tagged(itemFlagSentencesFrom(item?.flags?.vaarn, item?.system?.description), item?.name);
}

/**
 * An Item's leftover behaviour, read from its sentences in the shape the readers
 * took from its flags: { autoHitVs, failChance, ... } - PER FLAG, the Item's own
 * sentences win and the translator answers for a flag they say nothing of, as
 * creatureFlagsOf (chunk 2c-ii).
 */
export function remainingItemFlagsOf(item)
{
  if (!item) return {};
  const keys = new Set(Object.keys(ITEM_FLAG_TRIGGERS));
  // Cheap exit - actor.js asks this of every Item on every prepare: an Item with
  // none of these flags and no stored sentences has nothing to say.
  const vaarn = item.flags?.vaarn ?? {};
  if (!Array.isArray(vaarn.effects) && !Object.keys(vaarn).some(k => keys.has(k))) return {};
  const own = sentencesOf(item).filter(s => keys.has(s.do?.from));
  const said = new Set(own.map(s => s.do.from));
  const rest = remainingItemSentencesOf(item).map(normalise).filter(s => !said.has(s.do?.from));
  return fieldsFromSentences([...own, ...rest]);
}

/** The span a trade good's quality starts on its sale (False's d4 days), from its sentence; null for none. */
export function qualitySpanOf(item)
{
  return qualitySentencesOf(item).find(s => s.do?.from === "declaredSpan")?.do.value ?? null;
}

/**
 * An actor's states written in play, read from its sentences in the shape the
 * readers took from its flags: { immuneTo, withersAtDayStart, autoHitAttacks }
 * (chunk 2d). Actor-level, read from the flags themselves (ruling D) - nothing
 * is stored on an actor under the board's key.
 */
export function remainingActorFlagsOf(actor)
{
  return fieldsFromSentences(remainingActorSentencesOf(actor), ACTOR_STATE_LIST_FIELDS);
}

/** An actor's states written in play (immuneTo, withersAtDayStart, autoHitAttacks) as sentences. */
export function remainingActorSentencesOf(actor)
{
  return tagged(actorStateSentencesFrom(actor?.flags?.vaarn), actor?.name);
}
