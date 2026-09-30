/**
 * Referee-Invoked Level Loss (foundry-system-index.csv
 * "Referee-Invoked Level Loss").
 *
 * A control the Referee can reach for to take a Level off an actor, for any
 * reason at all.
 *
 * WHY IT EXISTS. loseLevels and loseCompanionLevels have been built and tested
 * since 2026-09-13, and both were reachable only from a specific piece of
 * CONTENT: the Kronophage's Borrowed Time rule, which is the only levelDrain
 * entry in the whole bestiary, and Terminal Memory Crystal Corruption, which is
 * the only wound row carrying levelLoss. Measured 2026-09-14 — one each. So a
 * Referee who wanted to take a level for any other reason had no way to do it
 * short of the console, and the machinery to do it correctly was already there.
 *
 * IT INVENTS NO RULE. Every consequence of losing a level — which abilities go,
 * how much maximum HP, which granted Items and their companion weapons, what
 * XP is refunded — is decided by the ledger entry the level-up wrote, and this
 * file reads none of it. It asks how many levels and why, and calls the
 * existing function. That is deliberate: a second implementation of "what a
 * level was worth" is exactly the drift this project keeps finding, and the
 * ledger is the only thing that knows the answer for a particular character.
 *
 * TWO ACTOR TYPES, TWO FUNCTIONS, RULED 2026-09-14 (Matt). A character's levels
 * live in system.advancement and a companion's in its own flag ledger, with
 * different contents — a companion level is HP, ability bonuses and a carrying
 * slot, and has no ability PICKS to undo. They are not unified here, only
 * routed between. Unifying them would mean choosing one ledger shape for two
 * different rules.
 *
 * GM ONLY. Losing a level is a Referee's ruling, and the control is absent for
 * a player rather than present and refusing.
 */

import { loseLevels, loseCompanionLevels, companionLedger } from "./advancement.js";
import { ownerOf } from "./companion.js";

/**
 * How many levels this actor could actually lose, or 0.
 *
 * Asked so the dialog can say so before the Referee types a number, rather
 * than accepting 3 and quietly delivering 1. The two paths disagree about
 * where the floor is and both answers are correct for their own rule:
 *
 *   - A CHARACTER stops at Level 1. loseLevels refuses below it, because
 *     Level 1 is the only door in and nothing below it is recorded.
 *   - A COMPANION stops when its ledger runs out, which is Level 0 for one
 *     that never levelled. A companion is not a character and the book gives
 *     it no floor of its own.
 */
export function levelsAvailableToLose(actor)
{
  if(!actor) return 0;
  if(actor.type === "character") return Math.max(0, Number(actor.system.level?.value ?? 1) - 1);
  if(isCompanion(actor)) return companionLedger(actor).length;
  return 0;
}

/**
 * A companion for this purpose is an npc with an owner — the same test the
 * sheet's own LEVEL UP control uses, and for the same reason its comment
 * gives: the rule is a trade against a PC's advancement, so a creature nobody
 * owns has nobody to trade with.
 */
export function isCompanion(actor)
{
  return actor?.type === "npc" && !!ownerOf(actor);
}

/** Does this actor have a level a Referee could take? Backs the sheet gate. */
export function canLoseLevels(actor)
{
  return actor?.type === "character" || isCompanion(actor);
}

/**
 * The dialog, and then the existing function.
 *
 * DEFAULTS TO ONE LEVEL AND KEEPS THE XP, because that is the common case and
 * the destructive options should be typed rather than defaulted into. Wiping
 * the XP tally is offered because loseLevels already takes it — Terminal Memory
 * Crystal Corruption is the one content entry that uses it — and a Referee
 * ruling can want the same.
 */
export async function openLevelLoss(actor)
{
  if(!game.user.isGM)
    return ui.notifications.warn("Only the Referee can take a Level.");
  if(!canLoseLevels(actor))
    return ui.notifications.warn(`${actor?.name ?? "That actor"} has no Levels to lose.`);

  const companion = isCompanion(actor);
  const available = levelsAvailableToLose(actor);

  if(available === 0)
    return ui.notifications.warn(companion
      ? `${actor.name} has no recorded level-ups to undo.`
      : `${actor.name} is Level 1, which is the floor.`);

  const content =
    `<p>Take a Level from <b>${actor.name}</b>.</p>`
  + `<p style="font-size:0.9em;opacity:0.8">`
  + (companion
      ? `Each level undone returns its maximum HP, its ability bonuses and its carrying slot, and refunds the XP it cost.`
      : `Each level undone reverts exactly what that level-up recorded &mdash; the abilities chosen, the HP rolled, anything it granted &mdash; and refunds the XP it cost.`)
  + ` <b>${available}</b> available.</p>`
  + `<div class="form-group"><label>Levels to take</label>`
  + `<input type="number" name="count" value="1" min="1" max="${available}" step="1"/></div>`
  + (companion ? "" :
      `<div class="form-group"><label>Also wipe the XP tally</label>`
    + `<input type="checkbox" name="zeroXp"/></div>`)
  + `<div class="form-group"><label>Reason</label>`
  + `<input type="text" name="reason" placeholder="Shown on the chat card"/></div>`;

  const values = await new Promise(resolve =>
  {
    new Dialog({
      title: "Take a Level",
      content,
      buttons: {
        take: { label: "Take", callback: html => resolve({
          count: Number(html.find('[name="count"]').val()) || 1,
          zeroXp: !!html.find('[name="zeroXp"]').prop("checked"),
          reason: String(html.find('[name="reason"]').val() ?? "").trim()
        }) },
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "take",
      close: () => resolve(null)
    }).render(true);
  });

  if(!values) return;

  // Clamped rather than trusted. The max attribute is a hint a browser can be
  // talked out of, and asking for more levels than exist would otherwise reach
  // loseLevels as a refusal line the Referee did not ask to see.
  const count = Math.min(Math.max(1, values.count), available);

  if(companion) await loseCompanionLevels(actor, count, { reason: values.reason });
  else await loseLevels(actor, count, { zeroXp: values.zeroXp, reason: values.reason });
}
