/**
 * A save rolled FROM A CHAT CARD for the actor the card names — Saving Throw
 * ADV and DIS, the card-borne half.
 *
 * ── WHY A CARD ROLLS AT ALL ────────────────────────────────────────────────
 *
 * The sheet's ability buttons know nothing about what is being resisted. A
 * DEX save clicked on the sheet cannot tell that it is against blindness, so
 * it cannot apply the DIS the book gives Bulbous Eyes and Cyclops; a CON save
 * cannot tell that it is against a disease, so it cannot apply Heightened
 * Immune System's ADV. The affliction card solved this for nanomachine DIS on
 * 2026-09-13 (RULED, Matt: "intention is for them to roll from the affliction
 * card") and the ambush card rolls its PSY saves the same way. This is that
 * roll with the modifiers passed in, so the compelled-save card, the
 * affliction card and the recurrence card all roll one way and name their
 * sources the same way.
 *
 * ── WHAT IT DOES NOT DECIDE ────────────────────────────────────────────────
 *
 * Which items grant ADV or DIS on which save is the caller's question:
 * toxinModifiers, fleeModifiers, afflictionSaveModifiers and
 * conditionSaveModifiers each answer it for their own subject. This only
 * combines what it is handed, cancels sources against each other the way
 * Saving Throws.md says ("Sources of ADV and DIS cancel one another out"),
 * rolls, resolves through combat/saves.js and fires any failed-save
 * consequence the actor carries.
 *
 * `natural` is the KEPT die under ADV/DIS — dice[0].total on a 2d20kh1 or
 * 2d20kl1 is the active result — which is what the natural-20 clause reads.
 */
import { resolveSave, SAVE_TARGET } from "./saves.js";
import { saveDisSources } from "../time/stateful-effect.js";
import { onSaveResolved } from "./save-consequences.js";
import { saveNotesFor, saveModifierSources, askSaveQuestions } from "../actor/save-notes.js";
// Quantum Daemon Debt: Jinxed. Every card save rolls through here, which makes
// this one of the three roll creators that apply it — see curse.js.
import { applyJinx, JINX_BANNER } from "../time/curse.js";

/** Whether the current user may roll for this actor: the Referee, or an owner. */
export function mayRollFor(actor)
{
  return !!(game.user?.isGM || actor?.isOwner);
}

/**
 * The net mode of a set of sources. Pure, so tools/test-card-save.mjs can
 * exercise it: one ADV and one DIS is a plain roll, not a coin flip.
 */
export function saveMode({ advSources = [], disSources = [] } = {})
{
  const adv = advSources.length > 0, dis = disSources.length > 0;
  if (adv && !dis) return "adv";
  if (dis && !adv) return "dis";
  return "plain";
}

/**
 * The d20 formula for a mode and bonus, in the sheet's own spelling.
 *
 * A NEGATIVE BONUS DISPLAYS AS "1d20 +  - 10", AND THAT IS FINE. RULED
 * 2026-09-19 (Matt): Foundry parses "+ -10" correctly and the total is right;
 * only the spelling of the formula in chat looks odd. It has been reported as
 * a finding more than once - do not report it again or "fix" it.
 */
export function saveFormula(mode, bonus)
{
  const die = mode === "adv" ? "2d20kh1" : mode === "dis" ? "2d20kl1" : "1d20";
  return `${die} + ${bonus}`;
}

/** The chat note naming what modified the roll, or "" for a plain one. */
export function sourceNote({ advSources = [], disSources = [] } = {})
{
  const notes = [];
  if (advSources.length) notes.push(`ADV from <b>${advSources.join(", ")}</b>.`);
  if (disSources.length) notes.push(`DIS from <b>${disSources.join(", ")}</b>.`);
  if (advSources.length && disSources.length) notes.push("They cancel out.");
  return notes.join(" ");
}

/**
 * Roll `ability` for `actor` against `target`, post it, and return
 * `{ roll, total, natural, verdict }`.
 *
 * `flags` may be an object or a function of the result, so a card can record
 * the roll's outcome under its own flag without a second message. `rollMode`
 * is a ROLL MODE and never a whisper — Roll#toMessage overwrites whisper from
 * the mode in force (documented on the ambush card, found 2026-09-08).
 */
export async function rollCardSave(actor, {
  ability, label, target = SAVE_TARGET, advSources = [], disSources = [],
  flags = null, rollMode = null, consequences = true, bonus = null } = {})
{
  // `bonus` stands in for an ability score the actor does not have - a Morale
  // Save's ML (compelled-save.js, 2026-09-24).
  bonus = bonus ?? Number(actor?.system?.abilities?.[ability]?.effective ?? 0);
  // The board's DIS (Doom Song on any save, the physical key on STR/DEX/CON),
  // added here so every card that rolls a save honours it - 2026-09-24.
  disSources = [...new Set([...disSources, ...saveDisSources(actor, ability)])];
  // The character's own unconditional rules, as the sheet's buttons take them -
  // Extra Head's ADV, Small Stature's DIS (save-notes.js, Shared Pipelines
  // chunk 7, RULED 2026-10-05). Named in the card's source note below.
  // Albino's "is it daylight?", asked once per scene before the roll (Mutations
  // and Ancestry Rules chunk 2b, ruling C 7).
  await askSaveQuestions(actor, ability);
  const own = saveModifierSources(actor, ability);
  advSources = [...new Set([...advSources, ...own.adv])];
  disSources = [...new Set([...disSources, ...own.dis])];
  const mode = saveMode({ advSources, disSources });
  const roll = new Roll(saveFormula(mode, bonus));
  await roll.evaluate({ async: true });
  const jinxed = applyJinx(actor, roll);
  const natural = roll.dice[0]?.total ?? null;
  const verdict = resolveSave(roll.total, natural, target);
  const result = { roll, total: roll.total, natural, verdict };

  const tag = mode === "adv" ? ' <span class="knave-adv-dis">(ADV)</span>'
    : mode === "dis" ? ' <span class="knave-adv-dis">(DIS)</span>' : "";
  const why = verdict.reason === "nat20" ? " — <b>natural 20 always succeeds</b>"
    : verdict.reason === "nat1" ? " — <b>natural 1 always fails</b>" : "";
  const note = sourceNote({ advSources, disSources });
  const flavor = `${jinxed ? JINX_BANNER : ""}<b>${label}</b> — ${String(ability).toUpperCase()} save vs ${target}${tag}${why}`
    + (note ? `<br>${note}` : "");

  const data = { speaker: ChatMessage.getSpeaker({ actor }), flavor };
  const flagData = typeof flags === "function" ? flags(result) : flags;
  if (flagData) data.flags = { vaarn: flagData };
  await roll.toMessage(data, rollMode ? { rollMode } : {});

  // SAVE NOTES REACH CARD SAVES (chunk 7): the reminders the sheet's buttons
  // post - Albino's daylight, No Quarter - beside this roll, as private as it.
  const notes = saveNotesFor(actor, ability);
  if (notes.length)
  {
    const noteData = { speaker: ChatMessage.getSpeaker({ actor }), content: notes.map(n => `<i>${n}</i>`).join("<br>") };
    if (rollMode) ChatMessage.applyRollMode(noteData, rollMode);
    await ChatMessage.create(noteData);
  }

  // A failed-save consequence fires on every save the actor rolls, whatever
  // it was for — save-consequences.js's header, "whenever they fail a CON
  // save". Every card that rolls through here is one of its call sites.
  if (consequences) await onSaveResolved(actor, ability, verdict);
  return result;
}
