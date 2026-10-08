/**
 * The contraction and cure card — foundry-system-index.csv "Affliction
 * Contraction and Cure".
 *
 * One card per exposure. It names the save, carries the roll, and — once the
 * save is resolved — offers the Referee the button that actually infects.
 *
 * ── WHY THE ROLL IS ON THE CARD AND NOT ON THE SHEET ───────────────────────
 *
 * Every other compelled save in this system WAS descriptive: the card said
 * "CON save vs Wrathworms" and the target's own controller clicked their CON
 * button. That convention could not carry this one, for a mechanical reason
 * rather than a stylistic one — the sheet's ability buttons know nothing about
 * what is being resisted, so they cannot apply the DIS the book gives Synths
 * and implanted characters against nanomachine infections. Put to Matt as
 * exactly that, and RULED 2026-09-13: "yes, intention is for them to roll from
 * the affliction card."
 *
 * SINCE 2026-09-16 the compelled-save card and the recurrence card roll the
 * same way, and the roll itself lives in combat/card-save.js; this card hands
 * it the modifiers afflictionSaveModifiers finds — nanomachine DIS as before,
 * and Heightened Immune System's ADV against a disease (RULED 2026-09-16).
 *
 * The PLAYER still rolls. The button is open to whoever owns the actor, and
 * the Referee's own act stays the one below it.
 *
 * ── THE SAVE DOES NOT INFECT ANYBODY ───────────────────────────────────────
 *
 * A failed save ARMS the Infect button; it does not press it. Two reasons, and
 * the second is the one that matters at a table. The Referee may be rolling
 * secretly on the party's behalf — Hivey Hump's own wording is "After battle,
 * secretly CON save for each PC" — and a table may be using a vector the book
 * gives as a chance rather than a save at all. Auto-infecting on a failure
 * would take both of those away.
 *
 * SUPERSEDED 2026-10-05 (Matt, Effect Engine: Shared Pipelines chunk 7, ruling
 * D): the engine's ruling B - a failed save always applies its effect itself -
 * covers contraction too, a secret roll included. A failed save now infects
 * (infectActor); the reasoning above is kept as the record of why it did not.
 *
 * GM-ONLY, BOTH BUTTONS. Infecting and curing are Referee acts. The save is
 * not.
 */

import { afflictionByKey, saveTargetFor } from "./affliction-data.js";
import { contractAffliction, cureAffliction, afflictionSaveModifiers, immunityNoteFor,
         rollContractionDetails, implantsDisplacedBy, sourceKeyFor,
         applyManualEffect } from "./affliction.js";
import { slotsOccupiedBy } from "./affliction-data.js";
import { afflictionOverTimeOf } from "../item/affliction-effects.js";
import { rollCardSave } from "../combat/card-save.js";
import { startActivity } from "../time/activity.js";
import { woundItemsNamed } from "../time/recurrence.js";
import { forgetWoundItems } from "./named-wound.js";
import { statOf } from "../effects/item-stats.js";

const SCOPE = "vaarn";
export const CARD_FLAG = "affliction";
export const SAVE_FLAG = "afflictionSave";

/**
 * The exposure card's body, rebuilt from state on every render.
 *
 * Rendered rather than stored, the same way the vigilance card is, so a roll
 * landing on any client updates the card for everyone without anyone needing
 * write access to a message they did not author.
 */
export function exposureCard(spec, save, infected)
{
  const entry = afflictionByKey(spec.key);
  if(!entry) return `<div class="vaarn-affliction">Unknown affliction: ${spec.key}</div>`;
  const target = saveTargetFor(entry.virulence);

  const head = `<p><b>${spec.actorName}</b> is exposed to <b>${entry.name}</b>.</p>`
    + `<p><i>${entry.vector}</i></p>`;

  const working = `<p><b>CON save vs ${target}</b> — the Virulence.`
    + (spec.advSources?.length ? ` <b>ADV</b> from ${spec.advSources.join(", ")}.` : "")
    + (spec.disSources?.length ? ` <b>DIS</b> from ${spec.disSources.join(", ")}.` : "")
    + (spec.advSources?.length && spec.disSources?.length ? " They cancel out." : "")
    + `</p>`
    + (spec.immunityNote ? `<p><b>${spec.immunityNote}</b> The Referee decides whether it applies here.</p>` : "");

  if(infected)
    return `<div class="vaarn-affliction">${head}${working}`
      + `<p><b>${spec.actorName} has contracted ${entry.name}.</b></p></div>`;

  const saveLine = save
    ? `<p>Rolled <b>${save.total}</b> vs ${target} — <b>${save.passed ? "resisted" : "failed"}</b>.`
      + `${save.passed ? " The infection never takes hold." : ""}</p>`
    : `<button class="vaarn-afflict-save" data-msg="${spec.msgId ?? ""}">Roll the save</button>`;

  // The Referee's button is offered whatever the save said, because a table
  // may not be using the save at all — see the header. It simply LEADS with
  // what the roll produced.
  const gmLine = `<button class="vaarn-afflict-go" data-msg="${spec.msgId ?? ""}">`
    + `Infect ${spec.actorName}</button>`;

  return `<div class="vaarn-affliction">${head}${working}${saveLine}`
    + `<div class="vaarn-affliction-gm">${gmLine}</div></div>`;
}

/**
 * Post an exposure. `actor` is who is being exposed, not who caused it.
 *
 * `voluntary` skips straight to the Referee's button with no save offered,
 * which exists for Brain Coral — the one affliction in the book that somebody
 * might want, cultivated deliberately by mystics who "can thus infect others".
 */
export async function postExposure(actor, key, { voluntary = false, stomaObject = null } = {})
{
  const entry = afflictionByKey(key);
  if(!entry) return null;
  const mods = afflictionSaveModifiers(actor, entry);

  const spec = {
    key,
    actorUuid: actor.uuid,
    actorName: actor.name,
    // `dis`/`disSources` kept as they were so cards already in the log still
    // render; `advSources` joined them 2026-09-16.
    dis: mods.disSources.length > 0,
    disSources: mods.disSources,
    advSources: mods.advSources,
    immunityNote: immunityNoteFor(actor, entry),
    voluntary: voluntary && !!entry.voluntary,
    // The Referee's choice from the expose dialog; contraction rolls one when
    // this is empty.
    stomaObject: stomaObject || null,
  };

  const msg = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="vaarn-affliction-card"></div>`,
    flags: { [SCOPE]: { [CARD_FLAG]: spec } },
  });
  return msg;
}

/** Roll the contraction save for the actor a card names. */
export async function rollAfflictionSave(message)
{
  const spec = message.getFlag(SCOPE, CARD_FLAG);
  if(!spec) return null;
  if(saveFor(message.id)) return null;              // already rolled

  const actor = await fromUuid(spec.actorUuid);
  const entry = afflictionByKey(spec.key);
  if(!actor || !entry) return null;

  const target = saveTargetFor(entry.virulence);
  // A card posted before 2026-09-16 carries dis/disSources and no advSources;
  // an older card with `dis` and an empty list still gets its DIS.
  const disSources = spec.disSources?.length ? spec.disSources : (spec.dis ? ["nanomachine DIS"] : []);
  // The roll, the message, the natural-20 clause and the Goldencough
  // consequence (site 3 of save-consequences.js) all live in card-save.js.
  const { roll, verdict } = await rollCardSave(actor, {
    ability: "con",
    label: entry.name,
    target,
    advSources: spec.advSources ?? [],
    disSources,
    flags: r => ({ [SAVE_FLAG]: {
      cardId: message.id, total: r.total, passed: !!r.verdict?.passed,
      reason: r.verdict?.reason ?? "total" } }),
  });
  // A FAILED SAVE INFECTS BY ITSELF (Shared Pipelines chunk 7, RULED D
  // 2026-10-05) - a secret roll the Referee makes for a PC included. The
  // Infect button stays for the Referee, and refuses a second infection.
  if(!verdict?.passed && !(await infectedFor(spec)))
  {
    await infectActor(actor, spec.key, { stomaObject: spec.stomaObject ?? null });
    ui.chat?.updateMessage?.(message);
  }
  return roll;
}

/** The resolved save for a card, read back out of the log. */
export function saveFor(cardId, messages = null)
{
  const list = messages ?? game.messages.contents;
  for(let i = list.length - 1; i >= 0; i--)
  {
    const s = list[i].getFlag(SCOPE, SAVE_FLAG);
    if(s?.cardId === cardId) return s;
  }
  return null;
}

/** Has this card already infected somebody? Read from the actor, not the card. */
export async function infectedFor(spec)
{
  const actor = await fromUuid(spec.actorUuid);
  if(!actor) return false;
  const { afflictionsOn } = await import("./affliction.js");
  return afflictionsOn(actor).some(e => e.afflictionKey === spec.key);
}

/**
 * Carry out the infection a card offers.
 *
 * GUARDED ON THE ACTOR, not on the button's disabled state. Two GMs are the
 * standing condition of this table rather than an edge case — Matt is logged
 * in as Gamemaster the whole time automation runs as claudeGM — so two
 * Referees can reach the same card, and a disabled attribute is not stored in
 * the message anyway. contractAffliction refuses a duplicate itself; this
 * reports it rather than letting it look like nothing happened.
 */
export async function onInfectClick(message)
{
  const spec = message.getFlag(SCOPE, CARD_FLAG);
  if(!spec) return;
  const actor = await fromUuid(spec.actorUuid);
  if(!actor) return;
  await infectActor(actor, spec.key, { stomaObject: spec.stomaObject ?? null });
  ui.chat?.updateMessage?.(message);
}

/**
 * Contract an affliction and post what it did - the Infect button's work,
 * shared since Shared Pipelines chunk 7 (2026-10-05) with every failed
 * contraction save, which now infects by itself (RULED D: ruling B supersedes
 * this card's 2026-09-13 "the save does not infect anybody"). Returns the
 * report, or null when there was nothing to do.
 */
export async function infectActor(actor, key, { stomaObject = null } = {})
{
  const entry = afflictionByKey(key);
  if(!actor || !entry) return null;

  const details = await rollContractionDetails(entry);
  const slots = slotsOccupiedBy(entry, details.abilitySlot);
  const willDisplace = implantsDisplacedBy(actor, slots).map(i => i.name);

  const report = await contractAffliction(actor, key, { details, stomaObject });
  if(report.error) { ui.notifications.warn(report.error); return null; }

  const bits = [`<p><b>${actor.name}</b> has contracted <b>${entry.name}</b>.</p>`];
  if(report.heldSlots?.length)
    bits.push(`<p>It occupies the <b>${report.heldSlots.join(" + ")}</b> ability slot${report.heldSlots.length === 1 ? "" : "s"}.</p>`);
  // Said out loud, because a slot the BOOK does not print is the surprising
  // half. The infection keeps a displaced implant’s other slots warm so that
  // curing it cannot put the implant back on top of something installed while
  // it was away - Matt’s catch, 2026-09-13.
  if(report.borrowedSlots?.length)
    bits.push(`<p><b>${report.borrowedSlots.join(" + ")}</b> ${report.borrowedSlots.length === 1 ? "is" : "are"} held too,`
      + ` because a displaced implant was using ${report.borrowedSlots.length === 1 ? "it" : "them"}. Nothing can be installed there until this is cured.</p>`);
  if(details.location) bits.push(`<p><b>Location:</b> ${details.location}</p>`);
  // Matt's timeline puts the displaced implants ON THIS CARD specifically, and
  // it is the half a player most needs to see: an implant they paid for has
  // just left their sheet.
  if(willDisplace.length)
    bits.push(`<p><b>Displaced:</b> ${willDisplace.join(", ")} — removed while the`
      + ` infection runs, and restored when it is cured.</p>`);
  if(report.suppressed)
    bits.push(`<p><b>Suppressed:</b> ${report.suppressed} innate item(s) stop working.</p>`);
  if(!report.isPC)
    bits.push(`<p><i>Tracked on the effect board only — no Item is created for a non-player actor.</i></p>`);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: bits.join(""),
  });
  return report;
}

/**
 * Apply an affliction's onset and post what it rolled.
 *
 * The roll goes to chat as a real Roll so the dice are visible — this is a
 * number that changes a character sheet, and a Referee announcing "you lose 5
 * STR" with no die behind it is the thing every other card in this system
 * avoids.
 */
export async function applyOnsetAndReport(actor, key)
{
  const report = await applyManualEffect(actor, key);
  if(report.error) return ui.notifications.warn(report.error);

  const gained = report.gained
    ? ` and gains <b>${report.amount} ${report.gained.toUpperCase()}</b>` : "";
  await report.roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<b>${report.entry.name}</b> takes hold — ${actor.name} loses`
          + ` <b>${report.amount} ${report.lost.toUpperCase()}</b>${gained}.`,
  });
  // WHAT SURVIVES THE CURE IS THE HALF A PLAYER WILL ASK ABOUT, and it now
  // differs per affliction rather than per side, so the sentence is built from
  // the spec instead of assumed. Brain Coral’s loss ends with the disease;
  // Goldencough’s does not.
  const fate = kind => kind === "ongoing"
    ? "lasts only while the affliction does"
    : "is ability damage and heals with rest, even after a cure";
  const parts = [`The ${report.lost.toUpperCase()} loss ${fate(report.lostLasting)}`];
  if(report.gained) parts.push(`the ${report.gained.toUpperCase()} ${fate(report.gainLasting)}`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><i>${parts.join(", and ")}.</i></p>`,
  });
  return report;
}

/** Cure an affliction and say what came back. */
export async function cureAndReport(actor, key)
{
  const report = await cureAffliction(actor, key);
  if(report.error) return ui.notifications.warn(report.error);

  const bits = [`<p><b>${actor.name}</b> is cured of <b>${report.entry.name}</b>.</p>`];
  if(report.restored.length)
    bits.push(`<p><b>Restored:</b> ${report.restored.join(", ")}.</p>`);
  if(report.released)
    bits.push(`<p><b>Released:</b> ${report.released} innate item(s) work again.</p>`);
  // Said plainly because it is the one thing a cure does NOT undo, and a
  // player who expects their STR back needs to know where it went.
  bits.push(`<p><i>Ability damage does not come back with the cure — it heals`
    + ` normally with rest.</i></p>`);
  if(report.overTime?.cureReversesDeparture)
    bits.push(`<p><i>Note: the book says this cure ARRESTS rather than reverses.`
      + ` This table reverses it.</i></p>`);

  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: bits.join("") });
  return report;
}

export function registerAfflictionCardButtons()
{
  Hooks.on("renderChatMessage", async (message, html) =>
  {
    const spec = message.getFlag(SCOPE, CARD_FLAG);
    if(!spec) return;
    const withId = { ...spec, msgId: message.id };
    const infected = await infectedFor(spec);

    html.find(".vaarn-affliction-card")
      .replaceWith(exposureCard(withId, saveFor(message.id), infected));

    // A voluntary exposure offers no save at all - Brain Coral is cultivated
    // on purpose, and asking a mystic to resist an infection they sought is
    // the wrong question.
    if(spec.voluntary) html.find(".vaarn-afflict-save").remove();
    html.find(".vaarn-affliction-gm").toggle(!!game.user.isGM);

    html.find(".vaarn-afflict-save").click(() => rollAfflictionSave(message));
    html.find(".vaarn-afflict-go").click(() => onInfectClick(message));
  });

  // A save landing re-renders its OWN card so the button becomes the result on
  // every client. Never the message that triggered the hook - see
  // day-start.js's comment for what refreshing that one does, which is post a
  // second copy of it.
  Hooks.on("createChatMessage", message =>
  {
    const s = message.getFlag(SCOPE, SAVE_FLAG);
    if(!s?.cardId) return;
    const card = game.messages.get(s.cardId);
    if(card && card.id !== message.id) ui.chat?.updateMessage?.(card);
  });
}

/* ------------------------------------------------------------------ *
 * A TREATMENT THAT TAKES TIME - Activity Time Cost, RULED 2026-09-24 (Matt).
 * The Gitch: "Curing the Gitch involves painful sessions of crystal
 * debridement, taking one day for each item slot occupied by crystals."
 * ------------------------------------------------------------------ */

/** The purpose tag an affliction's treatment effort carries. */
export const TREATMENT_PURPOSE = "treat:";

/**
 * Start the treatment on the board. The span is FIXED at the slots the
 * crystals hold now, even if another grows while it runs (RULED, Matt). The
 * effort pauses when interrupted - the book says nothing of starting over.
 */
export async function startTreatment(actor, key)
{
  const entry = afflictionByKey(key);
  // The Gitch's debridement from its treatment sentence since chunk 4 (2026-10-06).
  const spec = afflictionOverTimeOf(actor, key).treatment;
  if(!spec) return ui.notifications.warn(`${entry?.name ?? key} has no treatment that takes time.`);
  const purpose = TREATMENT_PURPOSE + key;
  if((actor.getFlag("vaarn", "effects") ?? []).some(e => e.kind === "activity" && e.purpose === purpose))
    return ui.notifications.warn(`${actor.name} is already being treated for ${entry.name}.`);
  const slots = woundItemsNamed(actor, spec.perSlotOf).reduce((n, i) => n + (Number(statOf(i, "slots")) || 1), 0);
  if(!slots)
    return ui.notifications.warn(`${actor.name} has no ${spec.perSlotOf} to remove — use the Cured control.`);
  await startActivity(actor, {
    name: `${spec.name} — ${slots} ${spec.unit}${slots === 1 ? "" : "s"}`,
    text: entry.cure,
    required: slots * 86400,
    unit: spec.unit,
    amount: slots,
    onInterrupt: "pause",
    purpose
  });
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><b>${actor.name}</b> begins ${spec.name} for <b>${entry.name}</b>: `
      + `${slots} ${spec.unit}${slots === 1 ? "" : "s"}, one for each slot of ${spec.perSlotOf}.</p>`
  });
}

/**
 * The treatment reached its finish line: cure it, and remove the wounds it
 * names (debridement IS the removal of the crystals). Registered in knave.js
 * against the activity completion hook, like attunement.
 */
export async function onTreatmentComplete({ actor, entry } = {})
{
  const purpose = String(entry?.purpose ?? "");
  if(!purpose.startsWith(TREATMENT_PURPOSE) || !actor) return;
  const key = purpose.slice(TREATMENT_PURPOSE.length);
  const spec = afflictionOverTimeOf(actor, key).treatment;
  if(!spec) return;
  const held = (actor.getFlag("vaarn", "effects") ?? []).some(e => e.afflictionKey === key);
  if(held) await cureAndReport(actor, key);
  const wounds = spec.removesWound ? woundItemsNamed(actor, spec.removesWound) : [];
  if(wounds.length)
  {
    await actor.deleteEmbeddedDocuments("Item", wounds.map(i => i.id));
    // Their Wounds-tab entries go with them (named wounds, 2026-09-25).
    await forgetWoundItems(actor, wounds.map(i => i.id));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p>The ${spec.removesWound} are cut away — ${wounds.length} slot${wounds.length === 1 ? "" : "s"} freed.</p>`
    });
  }
}
