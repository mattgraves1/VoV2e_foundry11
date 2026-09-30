/**
 * Exhaustion — foundry-system-index.csv "Exhaustion".
 *
 * WHAT THE BOOK STATES, and it is three sentences (The Desert/Desert
 * Exploration.md, CRIMSON HOUND, identical in both): "At any point during a
 * travel day, the players may declare that they are pushing themselves to
 * travel faster than usual. If the party exerts themselves, they travel double
 * the usual distance in one day and must fill an inventory slot with
 * Exhaustion. Exhaustion is removed from a PC's inventory when the camp in one
 * place for an entire day and night. If a PC has no more spare slots to fill
 * with Exhaustion, they must discard an item to make room. A PC who fills all
 * inventory slots with Exhaustion will die."
 *
 * A SECOND SOURCE, which the row did not name: Desert Foraging row 32 — "You
 * follow a mirage for miles, believing it to be a pond. CON save vs
 * Exhaustion." So Exhaustion is also inflicted involuntarily, on a failed save,
 * and applyExhaustion has to be reachable from outside the travel day. It is
 * the only real book content that drives this mechanism, which is why it was
 * filed as an atom in the same turn (Matt, 2026-09-11) rather than left for the
 * test pass to discover it had nothing to test against.
 *
 * WHY AN ITEM AND NOT A COUNTER. RULED 2026-09-11 (Matt): a real Item that
 * takes item slots. Wounds are the precedent and they work exactly this way —
 * actor-sheet.js pairs every slot-taking Wound with a real `wound` Item
 * precisely so it "count[s] toward the same slot total real gear uses". A
 * counter would have to be taught to compete with gear; an Item already does,
 * because actor.js sums `i.system.slots` over the actor's items and knows
 * nothing about what kind of thing each one is.
 *
 * Encumbrance therefore falls out with no code at all: Exhaustion pushes `used`
 * past 10+CON like any other cargo, so a party that pushes hard starts failing
 * STR/DEX/CON saves. That is the book's trade showing up in the dice without
 * anyone wiring it.
 *
 * THE DEATH RULE IS MATT'S, 2026-09-11, and it is better than the reading the
 * row was filed with: "if the player has no slots available, and no items they
 * can discard to make slots available, they die (players cannot discard
 * intrinsic items or wounds for example)."
 *
 * That is not a threshold count of Exhaustion, and it is why this file counts
 * no Exhaustion at all when deciding death. It asks whether ROOM CAN BE MADE.
 * "All slots full of Exhaustion" is then the limiting case rather than the
 * rule — Exhaustion is itself undiscardable, so a character carrying nothing
 * else has no move left. A character full of Wounds is in the same position for
 * the same reason, which the book never says and this reading answers for free.
 *
 * `isDroppable` from dropped-container.js already IS that test — it refuses
 * intrinsics and refuses wounds, which is Matt's sentence exactly. It is
 * imported rather than restated; a fourth copy of "not intrinsic and not a
 * wound" is how Saving Throw Resolution Duplication happened.
 *
 * WHICH CEILING. `inventorySlots.max`, not the 10+CON figure that
 * _checkWoundDeath uses. "No slots available" is the absolute cap, which
 * item-transfer.js quotes the book on: "It is impossible to carry more than 20
 * slots full of items." 10+CON is the Encumbered line and can be exceeded all
 * day. So Wounds and Exhaustion kill at different numbers, deliberately — that
 * is a property of the two rules, not a drift between them, and nothing here
 * changes the Wounds check.
 *
 * WHAT THIS FILE DOES NOT DECIDE. Whether the player actually discards
 * anything. The book tells them they must; it does not say what happens if
 * they refuse, and the standing ruling across the travel cluster (Matt,
 * 2026-08-29) is that these mechanisms PROMPT rather than compute. So a
 * character who owes a discard is left over the cap, visibly, and the Referee
 * holds the question. Automating a forced discard would be choosing WHICH item
 * to destroy, which is the one decision no one has asked for.
 */

import { isDroppable } from "./dropped-container.js";
import { suppressesDeath, suppressionMsg } from "../combat/fatality.js";

export const EXHAUSTION_TYPE = "exhaustion";
export const EXHAUSTION_NAME = "Exhaustion";

/**
 * The Item's description, written once here so every Exhaustion carries the
 * book's own removal rule on its own sheet. A player looking at the thing
 * filling their pack should be able to read how to get rid of it.
 */
const EXHAUSTION_TEXT =
  "<p>Fills an inventory slot. Removed by camping in one place for an entire "
  + "day and night.</p>";

/** Is this Item an Exhaustion? A type read; see intrinsic.js on why not a name. */
export function isExhaustion(item)
{
  return item?.type === EXHAUSTION_TYPE;
}

/** Every Exhaustion this actor is carrying. */
export function exhaustionItems(actor)
{
  return actor?.items?.filter(isExhaustion) ?? [];
}

/** How many slots of Exhaustion this actor carries. */
export function exhaustionCount(actor)
{
  return exhaustionItems(actor).length;
}

/**
 * The absolute ceiling and the slots in use, both read off the actor rather
 * than recomputed.
 *
 * NPCs HAVE NEITHER. actor.js derives used/value inside
 * _prepareCharacterData, which runs only for `type === "character"`, so an npc
 * keeps template.json's zeroes forever — the trap item-transfer.js documents.
 * Reading those would make every npc permanently full, so applyExhaustion
 * refuses npcs outright instead of quietly killing one.
 */
function slotState(actor)
{
  const s = actor?.system?.inventorySlots ?? {};
  return { used: Number(s.used ?? 0), max: Number(s.max ?? 20) };
}

/** Is there room for one more slot? */
export function hasFreeSlot(actor)
{
  const { used, max } = slotState(actor);
  return used + 1 <= max;
}

/**
 * The items this character could shed to make room. Matt's rule in one line,
 * and the reason this file imports isDroppable instead of writing its own.
 */
export function discardableItems(actor)
{
  return actor?.items?.filter(isDroppable) ?? [];
}

/**
 * Apply one Exhaustion.
 *
 * Returns a verdict rather than posting the whole story itself, so the caller
 * can build one card for a whole party instead of N cards the Referee reads
 * separately — the same reason rollEncounterCheck leaves posting to its caller.
 *
 * @returns {{outcome: string, owed?: number, cause?: string}}
 *   outcome "added"     — there was room; nothing else to say
 *           "owed"      — no room, but something can be discarded to make it
 *           "died"      — no room and nothing discardable
 *           "suppressed"— the same, but Fatality Suppression held them together
 *           "npc"       — refused; npcs have no slot figures at all
 */
export async function applyExhaustion(actor)
{
  if (!actor) return { outcome: "npc" };
  if (actor.type !== "character") return { outcome: "npc" };

  const room = hasFreeSlot(actor);
  const canShed = discardableItems(actor).length;

  // The Item is created either way, INCLUDING on death. The Exhaustion was
  // incurred; refusing to record it would let a full pack cancel the cost,
  // which is the opposite of what the rule is for. On a suppressed death it
  // also leaves the state honest — suppression stops the dying, not the cause.
  const cls = getDocumentClass("Item");
  await cls.create(
  {
    name: EXHAUSTION_NAME,
    type: EXHAUSTION_TYPE,
    system: { slots: 1, quantity: 1, tradeValue: 0, description: EXHAUSTION_TEXT }
  }, { parent: actor });

  if (room) return { outcome: "added" };
  if (canShed) return { outcome: "owed", owed: canShed };

  const cause = "no item slots remain, and nothing left can be discarded to make room";
  return { outcome: suppressesDeath(actor) ? "suppressed" : "died", cause };
}

/**
 * Clear every Exhaustion — the camp.
 *
 * ALL OF IT, not one slot. RULED 2026-09-11 (Matt). The book writes
 * "Exhaustion is removed from a PC's inventory" as a mass noun with no
 * per-stack language, and one day-and-night is the only span it names.
 *
 * @returns {number} how many slots were freed
 */
export async function clearExhaustion(actor)
{
  const ids = exhaustionItems(actor).map(i => i.id);
  if (!ids.length) return 0;
  await actor.deleteEmbeddedDocuments("Item", ids);
  return ids.length;
}

/**
 * The party, for the party-wide controls.
 *
 * hasPlayerOwner is the PC test and the container guard excludes the ground
 * box, both for the reasons exploration-clock.js's partyEncumbrance already
 * gives at length — this is the same population, so it uses the same test
 * rather than a second one that could disagree with it.
 */
export function party()
{
  return game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
}

/**
 * One line per PC for the Referee's readout: who is carrying how much, and
 * how close each of them is to having no move left.
 *
 * `atRisk` IS BOTH HALVES OF THE DEATH RULE, and it is a field rather than a
 * template condition because the template got it wrong first. Testing
 * 2026-09-11 (125.19) flagged a character carrying 3 Exhaustion in 3 of 20
 * slots as having "nothing left to discard" — true in itself, and completely
 * misleading: they had seventeen free slots and were seventeen pushes from
 * dying, not one. Nothing discardable is only alarming when there is also no
 * room, which is exactly what applyExhaustion tests, so the readout now asks
 * the same question the death check does instead of half of it.
 */
export function exhaustionReadout()
{
  return party().map(a =>
  {
    const { used, max } = slotState(a);
    const shed = discardableItems(a).length;
    return {
      name: a.name,
      count: exhaustionCount(a),
      used, max, shed,
      atRisk: shed === 0 && used + 1 > max
    };
  }).filter(r => r.count > 0);
}
