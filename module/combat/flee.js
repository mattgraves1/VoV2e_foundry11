/**
 * Fleeing Combat (foundry-system-index.csv "Fleeing Combat").
 *
 * Combat/Fleeing.md, and JADE IBIS 15-09-26 verbatim:
 *
 *   "To flee combat, each PC rolls d20 and attempts to equal or exceed their
 *    total used item slots. On failure, they may choose to drop items until
 *    the number rolled is a success. These items are either stolen and used by
 *    their adversaries, or remain on the ground in the location until
 *    retrieved. If the PC cannot drop enough items to turn the roll into a
 *    success, they must stay and fight for another round before trying again."
 *
 * REBUILT 2026-09-21 (Jade Ibis Vault Reconciliation). CRIMSON HOUND's rule was
 * a DEX Save vs used slots, with the opponents attacking at ADV on a failure;
 * that is what this module was from 2026-09-11 until now. JADE replaced it
 * whole, and four things follow from the new sentence rather than being added:
 *
 *   - IT IS NOT A SAVE. A bare d20, no ability bonus, so Saving Throws.md's
 *     natural-20 and natural-1 clauses do not apply and resolveSave is no
 *     longer called. Encumbrance Penalty's DIS on DEX saves does not reach it
 *     either - an Encumbered character is punished by the higher target alone.
 *   - EQUAL OR EXCEED. The old rule had to beat the target; this one meets it.
 *   - NOBODY ATTACKS AT ADV. The clause is gone from the book.
 *   - FAILURE IS BOUGHT OFF WITH GEAR. Shed slots until the number rolled
 *     would have succeeded, or stay and fight another round.
 *
 * Wounds occupy item slots and cannot be dropped, so a wounded character both
 * faces a higher target and has less to shed. That is the book's arithmetic.
 *
 * RULED 2026-09-11 (Matt) and still standing:
 *   - WHEN: an on-your-turn decision taken per character, so a character-sheet
 *     button and not a GM dialog - "this is a player-facing mechanic only".
 *   - SUCCESS takes the character out of the combat encounter.
 *   - NO STATE. Nothing on the Active Effect Board, nothing to expire. The
 *     card is the record; the failure card carries the roll it was made with,
 *     and that is the only thing the drop control reads.
 *
 * RULED 2026-09-21 (Matt), the four things JADE's sentence does not state:
 *   1. THE MUTATIONS STILL APPLY, to the d20 itself. Double Muscled and Extra
 *      Legs roll twice and keep the higher; Backwards Legs and Clubfoot keep
 *      the lower. Sources of ADV and DIS cancel, and are states, not counters.
 *   2. DROPPED ITEMS GO TO THE DROPPED ITEMS CONTAINER. "Stolen and used by
 *      their adversaries" is the Referee's to decide from there; the card says
 *      so and nothing picks a creature to receive them.
 *   3. ANYTHING THAT IS GEAR MAY BE DROPPED, worn armour and held weapons
 *      included. Wounds and intrinsic Items may not - isDroppable, the same
 *      test the Drop control uses.
 *   4. A STACK IS DROPPED WHOLE. Splitting one in the picker is not modelled.
 */
import { isDroppable } from "../actor/dropped-container.js";
import { stackSlotsOf, usedSlots, isCargo } from "../actor/item-slots.js";
import { bodyRollMods } from "../effects/body.js";

/**
 * Mutations whose book text names fleeing. Only the fleeing half of each
 * clause reaches here: sneaking has no roll, pursuing is Pursuit Resolution.
 */
export const FLEE_ADV_MUTATIONS = ["Double Muscled", "Extra Legs"];
export const FLEE_DIS_MUTATIONS = ["Backwards Legs", "Clubfoot"];

/** The number the d20 must equal or exceed: every slot in use. */
export function fleeTarget(actor)
{
  return Number(actor?.system?.slotsUsed ?? 0);
}

/**
 * Which mutations bend the roll, and how. Returned with their names so the
 * card can say why the roll went the way it did.
 */
export function fleeModifiers(actor)
{
  // From the body's sentences since Mutations and Ancestry Rules chunk 2b
  // (2026-10-05) - the two lists above stay as what they were; Stilt Legs
  // joins by ruling C (9).
  const mods = bodyRollMods(actor, "flee");
  const advSources = mods.adv;
  const disSources = mods.dis;
  return {
    advantage: advSources.length > 0,
    disadvantage: disSources.length > 0,
    advSources,
    disSources
  };
}

/** The dice to roll. ADV and DIS cancel to a plain d20. */
export function fleeFormula(mods)
{
  if(mods.advantage && !mods.disadvantage) return "2d20kh1";
  if(mods.disadvantage && !mods.advantage) return "2d20kl1";
  return "1d20";
}

/** Equal or exceed. `shortfall` is how many slots must go for the roll to stand. */
export function resolveFlee(rolled, target)
{
  const passed = rolled >= target;
  return { passed, shortfall: passed ? 0 : target - rolled };
}

/** The Items a fleeing character could leave behind: gear that occupies a slot. */
export function droppableItems(actor)
{
  return [...(actor?.items ?? [])].filter(i => isDroppable(i) && !isCargo(i) && stackSlotsOf(i) > 0);
}

/**
 * What dropping `dropIds` would leave, measured the way every other reader
 * measures it - usedSlots, each stack rounded up on its own (Per-Stack Slot
 * Rounding, 2026-09-27), stowed cargo left out as actor.js leaves it out - so
 * the picker and the sheet cannot disagree about how full the character is.
 */
export function slotsAfterDropping(actor, dropIds)
{
  const gone = new Set(dropIds);
  return usedSlots([...(actor?.items ?? [])].filter(i => !gone.has(i.id) && !isCargo(i)));
}

/** Would the roll stand with these Items gone? */
export function dropSuffices(actor, dropIds, rolled)
{
  return slotsAfterDropping(actor, dropIds) <= rolled;
}

/**
 * Can ANY selection save this roll? False is the book's last sentence: "they
 * must stay and fight for another round before trying again."
 */
export function canBuyEscape(actor, rolled)
{
  return dropSuffices(actor, droppableItems(actor).map(i => i.id), rolled);
}

/**
 * Take a character out of the current combat encounter.
 *
 * Returns the number of combatants removed, so the caller can tell "escaped
 * the fight" from "was never in one" and say so. A flee attempted outside
 * combat is not an error - the roll still means something at the table, the
 * Referee just has no tracker to remove anyone from.
 *
 * Matches on `actorId` rather than on a resolved `.actor`, because an unlinked
 * token's `.actor` is a synthetic per-token copy and not the Document this
 * sheet holds. A PC is linked and both agree; matching on the id is right
 * either way.
 */
export function combatantIdsOf(actor)
{
  const combat = game.combat;
  if (!combat || !actor) return [];
  return combat.combatants
    .filter(c => c.actorId === actor.id)
    .map(c => c.id);
}

export async function removeFromCombat(actor)
{
  const ids = combatantIdsOf(actor);
  if (!ids.length) return 0;
  await game.combat.deleteEmbeddedDocuments("Combatant", ids);
  return ids.length;
}

/* ------------------------------------------------------------------------ */
/*  The card and the drop picker. Foundry-side; not reached by the offline   */
/*  test, which imports only the pure functions above.                       */
/* ------------------------------------------------------------------------ */

import { dropItem } from "../actor/dropped-container.js";
import { publicNameOf, viewerNameOf } from "../item/identification.js";

const SCOPE = "vaarn";
const FLEE_FLAG = "flee";          // { actorUuid, rolled } on a failure card
const FLEE_DONE_FLAG = "fleeDone"; // set once the drop has been made

const slotWord = n => `${n} used item slot${n === 1 ? "" : "s"}`;

function say(actor, content, flags = null)
{
  return ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    ...(flags ? { flags: { [SCOPE]: flags } } : {})
  });
}

const FLED_FLAG = "fled";          // actor id, on a card whose author could not leave the tracker

/**
 * A PLAYER CANNOT DELETE A COMBATANT. Found in live testing 2026-09-21 (item
 * 287.12): this is a player-facing control, and the player's own client is
 * refused when it tries to take the character out of the tracker - which the
 * 2026-09-11 build never met, because Group 122 fled as the GM. So a player's
 * card carries the actor id as a flag and the ACTIVE GM's client does the
 * removal when the card arrives. activeGM, not isGM: two GM clients are the
 * standing condition here and one of them must act, not both.
 *
 * Returns the number removed; DELEGATED when the active GM will do it; -1 when
 * nobody can, and the card then says so.
 */
const DELEGATED = -2;
async function leaveCombat(actor)
{
  if(!combatantIdsOf(actor).length) return 0;
  if(game.user.isGM)
  {
    try { return await removeFromCombat(actor); }
    catch(err) { console.warn("vaarn | could not remove the fleeing combatant", err); return -1; }
  }
  return game.users.activeGM ? DELEGATED : -1;
}

const outSentence = removed => (removed > 0 || removed === DELEGATED) ? " They are <b>out of the combat</b>."
  : removed < 0 ? " They get away. (No Referee is connected — they must be removed from the tracker by hand.)"
  : " They get away. (Not in a tracked combat — nothing to leave.)";

const fledFlag = (actor, removed) => removed === DELEGATED ? { [FLED_FLAG]: actor.id } : null;

/**
 * Roll to flee and post the result. `roll` is an evaluated Roll of
 * fleeFormula(mods); the sheet makes it so the Jinx can reach it.
 */
export async function resolveFleeAttempt(actor, roll, mods)
{
  const target = fleeTarget(actor);
  const rolled = roll.total;
  const { passed, shortfall } = resolveFlee(rolled, target);

  const notes = [];
  if(mods.advSources.length) notes.push(`Rolled twice, kept the higher — <b>${mods.advSources.join(", ")}</b>.`);
  if(mods.disSources.length) notes.push(`Rolled twice, kept the lower — <b>${mods.disSources.join(", ")}</b>.`);
  if(mods.advSources.length && mods.disSources.length) { notes.length = 0; notes.push(`<b>${mods.advSources.join(", ")}</b> and <b>${mods.disSources.join(", ")}</b> cancel out.`); }
  const modNote = notes.length ? ` ${notes.join(" ")}` : "";
  const line = `rolled <b>${rolled}</b> against ${slotWord(target)}`;

  if(passed)
  {
    const removed = await leaveCombat(actor);
    return say(actor, `<b>flees</b> — ${line}.${modNote}${outSentence(removed)}`, fledFlag(actor, removed));
  }

  if(!canBuyEscape(actor, rolled))
    return say(actor, `<b>fails to flee</b> — ${line}.${modNote} Even dropping everything they carry would not be enough: they must <b>stay and fight another round</b> before trying again.`);

  return say(actor,
    `<b>fails to flee</b> — ${line}.${modNote} They may <b>drop ${shortfall} slot${shortfall === 1 ? "" : "s"}</b> of items to get away, or stay and fight another round.`
    + `<div><button type="button" class="vaarn-flee-drop">Drop items and flee</button></div>`,
    { [FLEE_FLAG]: { actorUuid: actor.uuid, rolled } });
}

/** The picker. Confirm is refused until the selection makes the roll stand. */
export async function openFleeDropPicker(message)
{
  const spec = message.getFlag(SCOPE, FLEE_FLAG);
  if(!spec) return;
  if(message.getFlag(SCOPE, FLEE_DONE_FLAG))
    return ui.notifications.warn("This escape has already been made.");
  const actor = await fromUuid(spec.actorUuid);
  if(!actor) return ui.notifications.warn("That character no longer exists.");
  if(!actor.isOwner) return ui.notifications.warn(`Only ${actor.name}'s player or the Referee can drop their items.`);

  const rolled = Number(spec.rolled);
  if(fleeTarget(actor) <= rolled)
    return ui.notifications.info(`${actor.name} now carries little enough for a ${rolled} to stand — roll to flee again is not needed; tell the Referee.`);
  if(!canBuyEscape(actor, rolled))
    return ui.notifications.warn(`${actor.name} can no longer drop enough to make a ${rolled} stand.`);

  const items = droppableItems(actor).sort((a, b) => stackSlotsOf(b) - stackSlotsOf(a));
  const fmt = n => Number(n.toFixed(2));
  const rows = items.map(i =>
    `<label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" name="drop" value="${i.id}"/>`
    + `<span style="flex:1;">${viewerNameOf(i)}${i.system?.equipped ? " <i>(equipped)</i>" : ""}</span><span>${fmt(stackSlotsOf(i))}</span></label>`).join("");
  const content = `<form><p>${actor.name} rolled <b>${rolled}</b> and is using <b>${fleeTarget(actor)}</b> slots.`
    + ` Choose what to leave behind. A stack is dropped whole.</p>${rows}`
    + `<p class="vaarn-flee-tally" style="margin-top:6px;"></p></form>`;

  const chosen = await new Promise(resolve =>
  {
    const selected = html => html.find('input[name="drop"]:checked').map((_, el) => el.value).get();
    const d = new Dialog({
      title: `Drop items and flee — ${actor.name}`,
      content,
      buttons: {
        drop: { label: "Drop and flee", callback: html => resolve(selected(html)) },
        stay: { label: "Stay and fight", callback: () => resolve(null) }
      },
      default: "stay",
      close: () => resolve(null),
      render: html =>
      {
        const refresh = () =>
        {
          const ids = selected(html);
          const left = slotsAfterDropping(actor, ids);
          const ok = left <= rolled;
          html.find('.vaarn-flee-tally').html(ok
            ? `Would carry <b>${left}</b> slots — a ${rolled} stands.`
            : `Would carry <b>${left}</b> slots — <b>${left - rolled} more</b> must go.`);
          html.closest('.dialog').find('button.drop').prop('disabled', !ok);
        };
        html.find('input[name="drop"]').on('change', refresh);
        refresh();
      }
    });
    d.render(true);
  });
  if(!chosen || !chosen.length) return;
  if(!dropSuffices(actor, chosen, rolled)) return ui.notifications.warn("That is not enough to get away.");

  const left = [];
  for(const id of chosen)
  {
    const item = actor.items.get(id);
    if(!item) continue;
    const name = publicNameOf(item);
    const landed = await dropItem(item);
    if(!landed)
    {
      // dropItem has already said why. Whatever did land is on the ground;
      // the character has not got away, and the card stays live.
      if(left.length) await say(actor, `drops <b>${left.join(", ")}</b> but cannot shed the rest — they have <b>not</b> got away.`);
      return;
    }
    left.push(name);
  }

  await message.setFlag(SCOPE, FLEE_DONE_FLAG, true);
  const removed = await leaveCombat(actor);
  await say(actor, `<b>drops ${left.join(", ")}</b> and <b>flees</b> — a ${rolled} now stands against ${slotWord(fleeTarget(actor))}.${outSentence(removed)}`
    + ` What was dropped stays on the ground here unless their adversaries take it.`, fledFlag(actor, removed));
}

/** The failure card's button. Spent state is an ATTRIBUTE, per Group 115.6. */
export function registerFleeCardButtons()
{
  // The active GM takes a player's fled character out of the tracker.
  Hooks.on('createChatMessage', message =>
  {
    if(!game.users.activeGM?.isSelf) return;
    const id = message.getFlag(SCOPE, FLED_FLAG);
    const actor = id ? game.actors.get(id) : null;
    if(actor) removeFromCombat(actor).catch(err => console.warn("vaarn | could not remove the fleeing combatant", err));
  });

  Hooks.on('renderChatMessage', (message, html) =>
  {
    const button = html.find('.vaarn-flee-drop');
    if(!button.length) return;
    if(message.getFlag(SCOPE, FLEE_DONE_FLAG))
    {
      button.attr('disabled', 'disabled');
      button.prop('disabled', true);
      button.text("Dropped and fled");
      return;
    }
    button.click(() => openFleeDropPicker(message));
  });
}
