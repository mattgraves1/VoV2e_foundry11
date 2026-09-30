/**
 * Maximum HP reaching 0 is instant death — foundry-system-index.csv "Zero Max
 * HP Death", moved onto the write 2026-09-19.
 *
 * WHY THIS FILE EXISTS, which is the whole point of it. The ruling is Matt's,
 * 2026-09-03, and the row that records it has always said Annihilating "is not
 * the only writer of system.health.max — item-effects.js already adjusts it,
 * and any future max-HP drain inherits this". It did not inherit: the check
 * was written INSIDE the Annihilating equip branch in actor-sheet.js, so it
 * fired for that one weapon tag and for nothing else.
 *
 * Group 223 measured it. A character built at 8 Max HP drank a row-20 Vaarnish
 * Poison, the bolded d8 landed, max HP was written to 0, current HP followed
 * it down — and nothing was announced. module/actor/poison.js was the second
 * writer the row had been predicting since September 3rd, and the prediction
 * was wrong in the direction nobody checks: the note claimed coverage that the
 * code did not have, and read as settled.
 *
 * So the check now hangs on the WRITE rather than on any one writer. Every
 * current writer is covered by construction — the Annihilating equip, the
 * hpBonus reversal in item-effects.js when an item leaves, applyPoison — and
 * so is every writer added later, which is the property the row wanted.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. No state change: death is GM-adjudicated
 * from a chat message, exactly as _checkWoundDeath announces its two other
 * non-HP causes (no item slots left, an ability bonus below -10). Fatality
 * Suppression is honoured the same way it is everywhere else.
 */

import { suppressesDeath, suppressionMsg } from "../combat/fatality.js";

/**
 * Update-options key naming what drove max HP down, as a phrase.
 *
 * A writer that knows its own cause says so and keeps its wording; a writer
 * that does not gets the plain sentence. This exists because Annihilating's
 * message named the tag ("maximum HP reduced to 0 by <b>Annihilating</b>")
 * before the check moved here, and a message that stops saying WHICH drain
 * killed someone is worse for a Referee than one that never said it.
 */
export const MAX_HP_CAUSE = "vaarnMaxHpCause";

/**
 * Update-options key a writer sets to take the announcement itself.
 *
 * WHY A WRITER WOULD WANT IT. The hook fires inside the write, so its message
 * lands before anything the writer posts afterwards. That is fine for a writer
 * whose own message comes first — Annihilating posts its draw line and then
 * writes — and wrong for one whose message REPORTS the write and therefore
 * cannot exist until it has happened. applyPoison is the second kind: its card
 * says "Loses 8 Max HP — now 0", which is only knowable afterwards, so the
 * hook posting first put "is dead" above the sentence explaining it. Group 224
 * found that and could not reorder its way out.
 *
 * So such a writer sets this, keeps the message it was given, and posts it in
 * its own order. The hook stays silent; nothing else changes.
 */
export const MAX_HP_DEFERRED = "vaarnMaxHpDeferred";

/** Did this update push max HP from above 0 to 0 or below? */
function crossedZero(actor, changed)
{
  const next = foundry.utils.getProperty(changed, "system.health.max");
  if(next === undefined) return false;
  return Number(actor.system?.health?.max ?? 0) > 0 && Number(next) <= 0;
}

/**
 * The message, built in one place so a deferring writer posts the same words.
 *
 * That is the whole reason this is a function rather than a string literal
 * inside `announce`: the moment a second caller writes its own copy of the
 * sentence, the two drift, and the one that drifts is the one nobody reads
 * until someone dies. Same reasoning fatality.js gives for suppressionMsg
 * being built centrally across its six surfaces.
 */
export function zeroMaxHpMessage(actor, cause = null)
{
  const reason = cause ? `maximum HP reduced to 0 by <b>${cause}</b>` : `maximum HP reduced to 0`;
  return suppressesDeath(actor) ? suppressionMsg(reason) : `is <b>dead</b> — ${reason}.`;
}

/**
 * Announce it, once.
 *
 * ONE GM POSTS, not both. Two GM accounts are active during every session on
 * this world — Matt's `Gamemaster` and automation's `claudeGM` — so an
 * unguarded hook posts the message twice, once per client, and chat is synced
 * so both copies are visible to everyone. `activeGM` is Foundry's own answer
 * to which one is nominated.
 */
export async function postZeroMaxHp(actor, cause = null)
{
  await ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: zeroMaxHpMessage(actor, cause)
  });
}

/** Wire the check to every write of system.health.max. */
export function registerZeroMaxHpDeath()
{
  // The pre-update sees the OLD value, which is the only place the transition
  // is visible: by the time updateActor runs, "was it above 0?" is gone. The
  // verdict rides on `options` rather than module state so that two updates
  // landing together cannot read each other's answer.
  Hooks.on("preUpdateActor", (actor, changed, options) =>
  {
    options[MAX_HP_CAUSE + "Fires"] = crossedZero(actor, changed);
  });

  Hooks.on("updateActor", async (actor, changed, options) =>
  {
    if(!options?.[MAX_HP_CAUSE + "Fires"]) return;
    // A writer that took the message posts it itself, in its own order.
    if(options[MAX_HP_DEFERRED]) return;
    if(!game.users.activeGM?.isSelf) return;
    await postZeroMaxHp(actor, options[MAX_HP_CAUSE] ?? null);
  });
}
