/**
 * The Thin Mare's Internal Storage - foundry-system-index.csv "Container Slot
 * Capacity", RULED 2026-09-25 (Matt).
 *
 * The book (JADE IBIS, Steeds): "Up to 100 item slots exist within the mare's
 * hypergeometric belly. However, they are invisible, and items must be located
 * by touch alone. Roll d100 and compare it with the desired item's slot number.
 * If the roll is higher than the slot number, you find the item easily. If the
 * roll is lower, you pull out whatever item is indicated by the roll instead."
 *
 * The rulings that shape this file:
 *  - A REACH-IN CONTROL on each item, which rolls and ANNOUNCES. Nothing moves:
 *    the player drags out what came out, as Item Transfer Between Actors
 *    already allows (honour system).
 *  - The inventory stays visible. "Invisible" is a table secret; the d100 is
 *    the fumbling, not a hidden list.
 *  - Anyone who owns the mare, or the Referee, reaches in.
 *
 * SLOT NUMBERS are counted down the belly in sheet order, each item taking as
 * many numbers as it has slots (rounded up, and at least one - a weightless
 * thing is still somewhere). An item's slot number is its FIRST. A roll equal
 * to it finds it: the roll then "indicates" that very item. Intrinsic items -
 * the mare's own Bite - are its body, not its cargo, and are not counted.
 * A roll below the wanted item's number always lands on something, because
 * every number before it is filled; a roll past the last item cannot be lower
 * than the wanted one, so there is no empty-slot case.
 */

import { slotCostOf } from "./item-slots.js";

/** Does this actor's cargo sit behind the touch-search? */
export function isTouchSearched(actor)
{
  return !!actor?.system?.itemSlotsSpecial;
}

/** The belly's contents with their slot ranges: [{ item, first, last }], in sheet order. */
export function bellySlots(actor)
{
  const out = [];
  let cursor = 0;
  for (const item of actor?.items?.contents ?? actor?.items ?? [])
  {
    if (item?.system?.intrinsic) continue;
    const span = Math.max(1, Math.ceil(slotCostOf(item)));
    out.push({ item, first: cursor + 1, last: cursor + span });
    cursor += span;
  }
  return out;
}

/**
 * Resolve one reach-in. Pure, so the offline test can sweep the boundary.
 * Returns { found, wanted, pulled, slot } - `pulled` is the item that came out.
 */
export function resolveTouchSearch(actor, wantedItem, roll)
{
  const slots = bellySlots(actor);
  const wanted = slots.find(s => s.item === wantedItem || s.item?.id === wantedItem?.id);
  if (!wanted) return null;
  if (roll >= wanted.first) return { found: true, wanted, pulled: wanted.item, slot: wanted.first };
  const hit = slots.find(s => roll >= s.first && roll <= s.last);
  return { found: false, wanted, pulled: hit?.item ?? null, slot: wanted.first };
}

/** Roll the d100 and post what came out. */
export async function touchSearch(actor, item, speakerActor = actor)
{
  const roll = await new Roll("1d100").evaluate();
  const r = resolveTouchSearch(actor, item, roll.total);
  if (!r) return null;
  const who = game.user?.character?.name ?? game.user?.name ?? "Someone";
  const line = r.found
    ? `reaches into <b>${actor.name}</b> for the <b>${item.name}</b> (slot ${r.slot}) and finds it easily.`
    : `reaches into <b>${actor.name}</b> for the <b>${item.name}</b> (slot ${r.slot}) and pulls out the <b>${r.pulled?.name ?? "nothing"}</b> instead.`;
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: speakerActor }),
    flavor: `<b>Internal Storage</b> — d100 vs slot ${r.slot}` });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: speakerActor }),
    content: `<p><b>${who}</b> ${line}</p>` });
  return r;
}
