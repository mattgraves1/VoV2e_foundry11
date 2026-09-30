/**
 * Item Transfer Between Actors — foundry-system-index.csv.
 *
 * Moving a carried Item from one actor to another as a single operation.
 * GM-INITIATED ONLY, per Matt's scoping 2026-09-07: a player has no write
 * permission on another player's actor, so a player-initiated give cannot
 * complete client-side and would need a socket relay this system does not
 * have. That half has no known consumer since the Frog Tongue snatch was
 * withdrawn, so it is not merely the chosen scope but a sufficient one.
 *
 * WHAT THIS REPLACES. Core Foundry's cross-actor drag CREATES on the target
 * and never deletes from the source, so dragging between two sheets
 * duplicates the item — and its ownership check is on the RECEIVING sheet,
 * so anyone who can open another character's sheet can mint a copy off it.
 * Since 2026-09-19 the drop override below replaces that behaviour on every
 * actor sheet this system registers: a cross-actor drag MOVES, or is refused.
 *
 * THE SLOT NUMBERS ARE INFORMATIONAL, NEVER BLOCKING (Matt, 2026-09-07):
 * show the figures and let the GM decide. That matches chargen, which warns
 * rather than refusing when starting gear exceeds the maximum.
 *
 * AND THERE ARE TWO LIMITS, NOT ONE — Core Rules/Item Slots.md:
 *
 *   - `inventorySlots.value` = 10 + CON. Carrying MORE than this is
 *     Encumbered, which is DIS on STR, DEX and CON saves and is live code
 *     since Encumbrance Penalty was built. This is the one with a
 *     consequence attached, so it is the one the dialog leads on.
 *   - `inventorySlots.max` = 20, raised by slotBonus from Centaur (+4),
 *     Kangaroo Pouch (+2) and the Manifold Box (+10). The book calls this
 *     absolute: "It is impossible to carry more than 20 slots full of
 *     items." Shown as the harder of the two warnings.
 *
 * Neither is a constant and neither is derivable from the other, so both are
 * read off the actor. The row's own note named only the ceiling; it predates
 * Encumbrance Penalty landing.
 *
 * NPCs DID NOT HAVE SLOT FIGURES AT ALL, and that stopped being true on
 * 2026-09-20 with Container Slot Capacity. It was: actor.js computed
 * used/value only inside _prepareCharacterData, so an npc kept template.json's
 * defaults of used 0 / value 0 forever, and printing those would have been a
 * confident wrong answer — so an npc target said slots are not tracked.
 *
 * A PET, STEED, FOLLOWER OR VEHICLE NOW HAS A REAL CAPACITY, and this dialog
 * is THE route by which anything gets into one: the compartment on those
 * Actors is not a flag on a carried Item the way a character's pox cavity is,
 * it is the Item genuinely moving to another Actor, which is what this
 * function does. Saying "does not track item slots" while the Ooze's own sheet
 * reads 0/10 was two surfaces contradicting each other on the one route that
 * matters in play. Found by Matt asking how a player actually uses the thing,
 * which the Group 246 regression check had failed to make obvious.
 *
 * STILL NOT TRACKED for a creature with no compartment — a Mercenary, who will
 * not carry baggage, and every plain Bestiary creature. cargoCapacityOf
 * returning null is the same gate the sheets use, so the dialog and the sheet
 * cannot disagree again.
 *
 * NO HARD CEILING OFF A CHARACTER. The 20 is the character rule; a hold has
 * one number and going over it is shown, never refused.
 */

import { isIntrinsic } from "../item/intrinsic.js";
import { publicNameOf, viewerNameOf } from "../item/identification.js";
import { stackSlotsOf, usedSlots, cargoCapacityOf, isCargo } from "./item-slots.js";
import { findContainer, dropItem } from "./dropped-container.js";

/** How many of this Item there are. An Item with no quantity is one. */
export function quantityOf(item)
{
  const q = Number(item?.system?.quantity);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

/** A stand-in for the part of `item` that moves, for slot arithmetic only. */
function movingPart(item, quantity)
{
  const q = quantity ?? quantityOf(item);
  return { system: { slots: item?.system?.slots ?? 0, quantity: q } };
}

/**
 * Can this Item be given away at all?
 *
 * Intrinsics cannot: a body part is not gear, and the whole reason Intrinsic
 * Item Marker exists is that `type` cannot answer this — the base Unarmed
 * Strike is a weaponMelee exactly like a sword. Wounds cannot either; they
 * are removed by healing from the Wounds tab, not by being handed over.
 */
export function isTransferable(item)
{
  if(!item) return false;
  if(item.type === "wound") return false;
  return !isIntrinsic(item);
}

/**
 * The four numbers the dialog must show, plus the two threshold crossings.
 * Returns `tracked: false` for any actor whose slots are never computed.
 */
export function slotPicture(target, item, quantity = null)
{
  // The part that is actually moving. A fractional-slot stack is billed per
  // unit (item-slots.js), so part of a stack of rations costs less than the
  // whole — reading `system.slots` alone showed 0.33 for nine of them.
  const moving = movingPart(item, quantity);
  // Per-Stack Slot Rounding (2026-09-27): every stack rounds up on its own, so
  // what the move costs depends on where it lands. moveItem JOINS a matching
  // fractional stack already on the target (joinableStack), so the picture
  // does too - 1 ration joining 1 ration costs 0 more, not a slot of its own.
  const join = target ? joinableStack(target, item) : null;
  const joined = join ? { system: { slots: join.system?.slots, quantity: quantityOf(join) + quantityOf(moving) } } : null;
  const cost = join ? stackSlotsOf(joined) - stackSlotsOf(join) : stackSlotsOf(moving);
  if(!target) return { tracked: false, cost };
  const landing = (items) => join ? [...items.filter(i => i.id !== join.id), joined] : [...items, moving];

  // A holder that is not a character: one capacity, no encumbrance threshold
  // and no hard 20. null means it has no compartment at all.
  if(target.type !== "character")
  {
    const capacity = cargoCapacityOf(target);
    if(capacity === null) return { tracked: false, cost };
    const items = target.items?.contents ?? [];
    const usedNow = usedSlots(items);
    const afterNow = usedSlots(landing(items));
    return { tracked: true, hold: true, cost, used: usedNow, after: afterNow,
             threshold: capacity, ceiling: capacity,
             alreadyEncumbered: false, willEncumber: false,
             overCeiling: afterNow > capacity };
  }

  const s = target.system?.inventorySlots ?? {};
  const used = Number(s.used ?? 0);
  const threshold = Number(s.value ?? 0);
  const ceiling = Number(s.max ?? 20);
  // Recomputed through usedSlots over what the pack will hold, not used +
  // cost, so it is the same sum actor.js makes. Stowed cargo is left out, as
  // actor.js leaves it out of `used`.
  // Joining a stack that is stowed as cargo leaves the pack as it was.
  const after = join && isCargo(join) ? used
    : usedSlots(landing((target.items?.contents ?? []).filter(i => !isCargo(i))));

  return {
    tracked: true, cost, used, after, threshold, ceiling,
    alreadyEncumbered: used > threshold,
    willEncumber: after > threshold,
    overCeiling: after > ceiling
  };
}

/** The summary block, rebuilt whenever the chosen target changes. */
function summaryHtml(target, item, quantity = null)
{
  const p = slotPicture(target, item, quantity);
  if(!p.tracked)
    return `<p><b>${target?.name ?? "—"}</b> does not track item slots (${target?.type ?? "?"}). This item costs <b>${p.cost}</b> ${p.cost === 1 ? "slot" : "slots"}.</p>`;

  // A hold reads differently because it IS different: one capacity, and going
  // over it is reported rather than warned about, since nothing refuses it.
  const lines = p.hold
    ? [`<p><b>${target.name}</b> — cargo <b>${p.used}</b> &rarr; <b>${p.after}</b> of ${p.threshold} (this item costs ${p.cost}).</p>`]
    : [
    `<p><b>${target.name}</b> — slots <b>${p.used}</b> &rarr; <b>${p.after}</b> (this item costs ${p.cost}). Encumbered above ${p.threshold}; hard limit ${p.ceiling}.</p>`
  ];
  if(p.overCeiling)
    lines.push(`<p class="knave-capped"><b>Over the hard limit of ${p.ceiling} slots.</b> The book calls this impossible — transfer anyway only deliberately.</p>`);
  else if(p.willEncumber && !p.alreadyEncumbered)
    lines.push(`<p class="knave-encumbered"><b>This transfer would leave ${target.name} Encumbered</b> — DIS on all STR, DEX and CON saves.</p>`);
  else if(p.alreadyEncumbered)
    lines.push(`<p class="knave-encumbered">${target.name} is <b>already Encumbered</b>.</p>`);
  return lines.join("");
}

/**
 * Move the Item. Create on the target FIRST, and only delete from the source
 * once that has actually returned a document.
 *
 * There is no cross-document transaction in Foundry, so this cannot be made
 * atomic. Ordering it this way picks which way it breaks: a failed create
 * leaves the source untouched, and a failed delete leaves a duplicate. The
 * item is never destroyed, which is the failure worth designing against —
 * losing a player's gear is unrecoverable, a duplicate is a GM deleting one.
 */
export async function transferItem(item, target)
{
  const source = item?.parent;
  if(!item || !source || !target) return null;

  if(!isTransferable(item))
  {
    ui.notifications.warn(`${viewerNameOf(item)} is part of ${source.name} and cannot be given away.`);
    return null;
  }
  if(target.id === source.id) return null;

  const data = item.toObject();
  delete data._id;
  // Arrives unequipped rather than inheriting the giver's state, so it never
  // silently consumes the recipient's hands budget. Charges need no handling
  // at all — toObject() carries system data, so a part-used usage die or
  // usesRemaining travels with the item already.
  data.system = data.system ?? {};
  data.system.equipped = false;

  let created;
  try { created = (await target.createEmbeddedDocuments("Item", [data]))?.[0]; }
  catch(err)
  {
    ui.notifications.error(`Could not give ${viewerNameOf(item)} to ${target.name} — ${err.message}. Nothing was changed.`);
    return null;
  }
  if(!created)
  {
    ui.notifications.error(`Could not give ${viewerNameOf(item)} to ${target.name}. Nothing was changed.`);
    return null;
  }

  const givenName = publicNameOf(item);
  try { await item.delete(); }
  catch(err)
  {
    ui.notifications.error(`${givenName} reached ${target.name} but could NOT be removed from ${source.name} — there are now two. Delete one by hand.`);
    return created;
  }

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: source }),
    content: `<b>${source.name}</b> gives <b>${givenName}</b> to <b>${target.name}</b>.`
  });
  return created;
}

/** The GM-facing picker. Every other actor is a candidate, including npcs. */
export function openTransferDialog(item)
{
  const source = item?.parent;
  if(!item || !source) return;

  if(!isTransferable(item))
  {
    ui.notifications.warn(`${viewerNameOf(item)} is part of ${source.name} and cannot be given away.`);
    return;
  }

  const targets = game.actors.filter(a => a.id !== source.id);
  if(!targets.length)
  {
    ui.notifications.warn("There is no other actor to give this to.");
    return;
  }

  const options = targets
    .map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`)
    .join("");

  new Dialog(
  {
    title: `Give ${viewerNameOf(item)}`,
    content: `<form>
        <div class="form-group">
          <label>Give <b>${viewerNameOf(item)}</b> from ${source.name} to</label>
          <select name="target">${options}</select>
        </div>
        <hr/>
        <div class="vaarn-transfer-summary"></div>
      </form>`,
    buttons:
    {
      transfer:
      {
        label: "Give",
        callback: html => transferItem(item, game.actors.get(html.find('select[name="target"]').val()))
      },
      cancel: { label: "Cancel" }
    },
    default: "transfer",
    render: html =>
    {
      const sel = html.find('select[name="target"]');
      const box = html.find('.vaarn-transfer-summary');
      const paint = () => box.html(summaryHtml(game.actors.get(sel.val()), item));
      sel.on("change", paint);
      paint();
    }
  }).render(true);
}

/*
 * MOVING, NOT COPYING — Treasure Cache Generation, RULED 2026-09-19 (Matt).
 *
 * Two doors lead here: the Take control on a container sheet (a treasure
 * cache or the Dropped Items box), and a
 * cross-actor drag onto any actor sheet (the drop override). Both move the
 * Item — create on the target, then remove from the source — and both treat
 * the slot cap exactly as transferItem does: shown, never blocking.
 *
 * WHY A PLAYER CAN DO THIS WITHOUT A SOCKET RELAY. The GM-only scoping above
 * was about PERMISSION: a player cannot write to another player's actor. A
 * move needs write access to both ends, so this runs only when the user owns
 * the source AND the target. A player given Owner on a cache has both; a
 * player dragging off someone else's sheet has neither, and is refused
 * rather than handed a copy — which is what closes the duplication exploit
 * recorded on Item Transfer Between Actors.
 *
 * A STACK CAN BE SPLIT: the dialog asks how many (Matt, 2026-09-19), so a
 * party can divide rations. A split part joins a stack of the same name
 * already on the target when both are fractional-slot stacks, because
 * rest.js and synth-repair.js read rations and Synth Parts across stacks by
 * name and one stack is what the sheet should show.
 */

/** A same-named fractional-slot stack on the target that `item` can join. */
function joinableStack(target, item)
{
  const slots = Number(item?.system?.slots) || 0;
  if(!(slots > 0 && slots < 1)) return null;
  return target.items.find(i => i.name === item.name && i.type === item.type
    && Number(i.system?.slots) === slots) ?? null;
}

/**
 * Move `quantity` of `item` onto `target`. Create first, then take from the
 * source, for the reason transferItem gives: a failure leaves a duplicate,
 * never a loss.
 */
export async function moveItem(item, target, quantity = null)
{
  const source = item?.parent;
  if(!item || !source || !target || source.id === target.id) return null;
  if(!isTransferable(item))
  {
    ui.notifications.warn(`${viewerNameOf(item)} is part of ${source.name} and cannot be moved.`);
    return null;
  }

  const have = quantityOf(item);
  const q = Math.max(1, Math.min(have, Math.floor(Number(quantity ?? have)) || have));
  const whole = q >= have;
  const hasQuantity = item.system?.quantity !== undefined;
  const name = publicNameOf(item);

  let landed;
  try
  {
    const stack = joinableStack(target, item);
    if(stack)
    {
      await stack.update({ "system.quantity": quantityOf(stack) + q });
      landed = stack;
    }
    else
    {
      const data = item.toObject();
      delete data._id;
      data.system = data.system ?? {};
      data.system.equipped = false;
      if(hasQuantity) data.system.quantity = q;
      // Picked up off the ground: the scene stamp describes where it LAY, so
      // it does not travel onto a character. Drop stamps afresh.
      if(data.flags?.vaarn?.dropScene) delete data.flags.vaarn.dropScene;
      landed = (await target.createEmbeddedDocuments("Item", [data]))?.[0];
    }
  }
  catch(err)
  {
    ui.notifications.error(`Could not move ${name} to ${target.name} — ${err.message}. Nothing was changed.`);
    return null;
  }
  if(!landed)
  {
    ui.notifications.error(`Could not move ${name} to ${target.name}. Nothing was changed.`);
    return null;
  }

  try
  {
    if(whole) await item.delete();
    else await item.update({ "system.quantity": have - q });
  }
  catch(err)
  {
    ui.notifications.error(`${name} reached ${target.name} but could NOT be taken off ${source.name} — there are now too many. Fix it by hand.`);
    return landed;
  }

  const count = hasQuantity && (q > 1 || !whole) ? `${q} × ` : "";
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: target }),
    content: `<b>${count}${name}</b> moves from <b>${source.name}</b> to <b>${target.name}</b>.`
  });
  return landed;
}

/**
 * The move dialog. With a `target`, it confirms that target (the drop
 * case). Without one, it offers every character the user owns (the Take
 * case) — the GM owns them all. Asks how many only when there is more than
 * one to take.
 */
export function openMoveDialog(item, target = null)
{
  const source = item?.parent;
  if(!item || !source) return;
  if(!isTransferable(item))
  {
    ui.notifications.warn(`${viewerNameOf(item)} is part of ${source.name} and cannot be moved.`);
    return;
  }

  const candidates = target ? [target]
    : game.actors.filter(a => a.type === "character" && a.isOwner && a.id !== source.id);
  if(!candidates.length)
  {
    ui.notifications.warn("You own no character to take this with.");
    return;
  }
  const preferred = game.user.character && candidates.includes(game.user.character) ? game.user.character : candidates[0];

  const verb = target ? "Move" : "Take";
  const have = quantityOf(item);
  const askQuantity = item.system?.quantity !== undefined && have > 1;
  const options = candidates
    .map(a => `<option value="${a.id}" ${a === preferred ? "selected" : ""}>${a.name}</option>`).join("");

  new Dialog(
  {
    title: `${verb} ${viewerNameOf(item)}`,
    content: `<form>
        <div class="form-group">
          <label>${verb} <b>${viewerNameOf(item)}</b> from ${source.name} to</label>
          <select name="target">${options}</select>
        </div>
        ${askQuantity ? `<div class="form-group">
          <label>How many (of ${have})</label>
          <input type="number" name="quantity" min="1" max="${have}" step="1" value="${have}"/>
        </div>` : ""}
        <hr/>
        <div class="vaarn-transfer-summary"></div>
      </form>`,
    buttons:
    {
      take:
      {
        label: verb,
        callback: html => moveItem(item, game.actors.get(html.find('select[name="target"]').val()),
          askQuantity ? Number(html.find('input[name="quantity"]').val()) : have)
      },
      cancel: { label: "Cancel" }
    },
    default: "take",
    render: html =>
    {
      const sel = html.find('select[name="target"]');
      const qty = html.find('input[name="quantity"]');
      const box = html.find('.vaarn-transfer-summary');
      const paint = () =>
      {
        const q = askQuantity ? Math.max(1, Math.min(have, Math.floor(Number(qty.val())) || 1)) : have;
        box.html(summaryHtml(game.actors.get(sel.val()), item, q));
      };
      sel.on("change", paint);
      qty.on("input change", paint);
      paint();
    }
  }).render(true);
}

/**
 * The drop override, shared by every actor sheet this system registers.
 * Returns undefined to hand the drop back to core unchanged — a drop from
 * the sidebar or a compendium, or a re-sort within one actor — and a value
 * when it has dealt with the drop itself.
 */
export async function handleItemDrop(target, data)
{
  if(!target?.isOwner) return undefined;
  const item = await Item.implementation.fromDropData(data);
  const source = item?.parent;
  // Only an Item embedded on a WORLD actor is a move. A sidebar Item has no
  // parent and a compendium actor's Item is not anybody's to lose: both stay
  // core copies.
  if(!item || !(source instanceof Actor) || source.pack || item.pack) return undefined;
  if(source.uuid === target.uuid) return undefined;

  // The Dropped Items box is NOT excepted (Matt, 2026-09-19: consistent with
  // caches). Everyone owns it, so the owner test below lets anyone pick up.
  if(!source.isOwner)
  {
    ui.notifications.warn(`${viewerNameOf(item)} belongs to ${source.name}, which you do not own — ask the GM to move it.`);
    return false;
  }
  // Onto the ground goes through Drop, so the Item gets its scene stamp.
  if(target === findContainer())
  {
    await dropItem(item);
    return true;
  }
  openMoveDialog(item, target);
  return true;
}
