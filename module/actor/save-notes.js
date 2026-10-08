/**
 * WHAT A CHARACTER'S OWN RULES DO TO A SAVE - Effect Engine: Shared Pipelines,
 * chunk 7 (RULED 2026-10-05 by Matt); read from the body's sentences since
 * Effect Engine: Mutations and Ancestry Rules, chunk 2b (2026-10-05).
 *
 * Asked by BOTH ways a save is rolled - the sheet's ability buttons and every
 * chat card (combat/card-save.js rollCardSave).
 *
 *   saveModifierSources - an `adv` or `dis` on saves (Extra Head on INT/PSY/EGO,
 *     Small Stature on STR, Albino on every save in daylight without a
 *     sunshade) whose conditions hold - a modifier the roll takes ITSELF.
 *   saveNotesFor - a reminder on saves (No Quarter's mercy), and a gated
 *     modifier whose question nobody has answered yet in this scene, posted
 *     beside the roll so nothing is silently skipped.
 *   askSaveQuestions - the save button and every card ask those questions
 *     first (Albino's daylight, once per scene - ruling C 7, Matt 2026-10-05);
 *     every other save reads the remembered answer.
 *
 * A save AGAINST something (`vs`: blind, tox, disease, nanomachine) is not
 * here - its own reader asks for it.
 */
import { bodyPassives } from "../effects/body.js";
import { passiveGatesHold, settleGates, standingKnown } from "../effects/gates.js";
import { gateInfo } from "../effects/interpret.js";

const anyGates = () => true;

/** The body's sentences about this ability's saves: [{ sentence, source }]. */
function onSaves(actor, ability, verbs)
{
  return bodyPassives(actor, { holds: anyGates }).filter(({ sentence: s }) =>
    verbs.includes(s.do?.verb) && s.do.on === "save" && !s.do.vs && (!s.do.abilities || s.do.abilities.includes(ability)));
}

/** `{ adv, dis }`: the names of the actor's own rules that give this save ADV or DIS, conditions holding. */
export function saveModifierSources(actor, ability)
{
  const hits = onSaves(actor, ability, ["adv", "dis"]).filter(p => passiveGatesHold(p.sentence.if, { actor }));
  return {
    adv: hits.filter(p => p.sentence.do.verb === "adv").map(p => p.source),
    dis: hits.filter(p => p.sentence.do.verb === "dis").map(p => p.source)
  };
}

const isComputed = g => gateInfo(g).known === "computed";

/** The reminders to post beside this save - never a modifier the roll applied itself. */
export function saveNotesFor(actor, ability)
{
  const notes = onSaves(actor, ability, ["reminder"]).map(p => `${p.source}: ${p.sentence.text ?? ""}`);
  for (const p of onSaves(actor, ability, ["adv", "dis"]))
  {
    const gates = p.sentence.if ?? [];
    if (!gates.length || passiveGatesHold(gates, { actor })) continue;
    // Only while a question is still open: a computed condition that fails (a
    // sunshade carried) or an answered one (not daylight) needs no reminder.
    if (!gates.filter(isComputed).every(g => passiveGatesHold([g], { actor }))) continue;
    if (gates.filter(g => !isComputed(g)).every(g => standingKnown(g) !== undefined)) continue;
    notes.push(`${p.source}: ${p.sentence.text ?? ""}`);
  }
  return notes;
}

/**
 * Ask the open questions of this ability's gated save modifiers - once per
 * scene, remembered (gates.js) - when their computed conditions already hold.
 * The save button and rollCardSave await this before they roll.
 */
export async function askSaveQuestions(actor, ability)
{
  for (const p of onSaves(actor, ability, ["adv", "dis"]))
  {
    const gates = p.sentence.if ?? [];
    const asked = gates.filter(g => !isComputed(g));
    if (!asked.length) continue;
    if (!gates.filter(isComputed).every(g => passiveGatesHold([g], { actor }))) continue;
    await settleGates(asked, { actor, title: `${actor.name}: ${p.source}` });
  }
}
