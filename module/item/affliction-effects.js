/**
 * The affliction translator - Effect Engine: Wounds and Afflictions, chunk 1
 * (foundry-system-index.csv "Effect Engine: Wounds and Afflictions", BUILD
 * PLAN RULED 2026-10-06 by Matt).
 *
 * An affliction's sentences come from its key (affliction-effects-data.js),
 * read off system.afflictionKey on whatever Item carries it (Brain Coral's
 * helm). Split from wound-affliction-effects.js in chunk 2a (2026-10-06): the
 * wound translator is read by stateful-effect.js, and importing the affliction
 * roster from there closed a cycle (affliction-data.js reads stateful-effect.js).
 *
 * REGISTERED in chunk 3 (RULED 2026-10-06, Matt) for affliction Items, in the
 * change that moved the always-on readers: AV and light and rations through the
 * generic passive readers, conditions through stateful-effect.js. Brain Coral's
 * helm (an armor Item) gained the affliction's sentences in chunk 4, with the
 * over-time readers below.
 *
 * Pure: no Foundry global.
 */

import { afflictionEffects } from "../actor/affliction-effects-data.js";
import { registerTranslator, sentencesOf } from "../effects/interpret.js";
import { gearSentencesOf } from "./remaining-effects.js";
// Loaded first, so the armor translator it registers is the one composed below.
import { exoticaSentencesOf } from "./implant-exotica-effects.js";

const tagged = (list, tag) => (list ?? []).map(s => ({ ...s, tag }));

/**
 * An affliction's sentences, by the key its Item carries; none for an Item that
 * carries none. Tagged with the affliction's NAME, as every other kind is with
 * its entry's (Matt, 2026-10-06: the Effects tab said "the brain-coral tag").
 */
export function afflictionSentencesOf(item)
{
  const key = item?.system?.afflictionKey;
  const entry = key ? afflictionEffects()[key] : null;
  return entry ? tagged(entry.effects, entry.name) : [];
}

registerTranslator("affliction", afflictionSentencesOf);
// Brain Coral's helm (chunk 4, RULED 2026-10-06, Matt): an armor Item carrying
// an afflictionKey reads the affliction's sentences after any Exotica's.
// The Oxygen Mask's suffocation property (Remaining Sources chunk 2c-ii, RULED 2026-10-07):
// its sentence, found for an old Item by its name, as every translator finds its entry.
registerTranslator("armor", item => [...(exoticaSentencesOf(item) ?? []), ...afflictionSentencesOf(item), ...gearSentencesOf(item)]);

/*
 * THE OVER-TIME READ - chunk 4 (RULED 2026-10-06, Matt). An affliction runs on
 * its Item's sentences when the actor carries one (a GM's edit there counts), else
 * the book's by key - a creature has only the board entry. Chunk 3's rule.
 */

/** The sentences an affliction runs on for this actor, normalised. */
export function afflictionRunSentences(actor, key)
{
  const item = (actor?.items ?? []).find(i => i?.system?.afflictionKey === key);
  return sentencesOf(item ?? { type: "affliction", system: { afflictionKey: key } });
}

const handler = (list, trigger, name) =>
{
  const s = list.find(x => x.when?.trigger === trigger && x.do?.verb === "special" && x.do.handler === name);
  if (!s) return null;
  const { verb, handler: h, ...spec } = s.do;
  return { spec, sentence: s };
};

/**
 * What an affliction does over time, read from its sentences, in the shape the
 * readers took from the roster: { recurrenceKey, stages, cureReversesDeparture,
 * declaredSpan, manualEffect, treatment, onFailedSave } - null where it has none.
 * The recurrence's own figures stay in recurrence-data.js (ruling C).
 */
export function afflictionOverTimeOf(actor, key)
{
  const list = afflictionRunSentences(actor, key);
  const rec = handler(list, "each-day", "recurrence");
  const span = rec?.sentence.for?.amount !== undefined
    ? { amount: rec.sentence.for.amount, unit: String(rec.sentence.for.duration).replace(/s$/, "") } : null;
  return {
    recurrenceKey: rec?.spec.key ?? null,
    stages: rec?.spec.stages ?? null,
    cureReversesDeparture: rec?.spec.cureReversesDeparture ?? null,
    declaredSpan: span,
    manualEffect: handler(list, "use", "manual-effect")?.spec ?? null,
    treatment: handler(list, "use", "treatment")?.spec ?? null,
    onFailedSave: handler(list, "on-failed-save", "failed-save")?.spec ?? null
  };
}
