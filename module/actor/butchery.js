/**
 * Processing a dead creature for rations — foundry-system-index.csv
 * "Travel and Rations", built 2026-09-12.
 *
 * WHAT THE BOOK STATES, quoted rather than summarised: "Rations of food or
 * water can be processed from the bodies of dead Biological-type creatures.
 * Dead creatures grant rations equal to double their Level." (CRIMSON HOUND,
 * Rations.) That is the whole rule — two sentences, one number, and an "or"
 * that the book never resolves.
 *
 * RULED 2026-09-12 (Matt), both of the questions the rule leaves open:
 *
 *  - THE YIELD GOES TO THE GROUND, not to a nominated pack. A control on the
 *    dead creature puts the rations in the Dropped Items container and players
 *    pick them up through the transfer path they already use. That reuses two
 *    BUILT mechanisms and means this file needs no recipient prompt, no
 *    targeting and no opinion about who did the butchering.
 *  - THE SPLIT IS THE PROCESSOR'S. "Rations of food OR water" with one number
 *    for the yield is a choice the book hands to the table, so the dialog asks
 *    how many of each rather than guessing. Water out of a body is the odd
 *    half of that sentence and it is the book's, not ours.
 *
 * RAW MEAT AND FRESH BLOOD, NOT RATIONS. RULED 2026-09-23 (Matt): a body yields
 * Raw Meat for its food half and Fresh Blood for its water half. Both feed
 * anybody as a ration does (rest.js RATION_GROUPS), so nothing the book prices
 * changes; the names follow what a corpse actually gives, and they are what an
 * Obligate Carnivore, a Vampiric character or a Glue Worm needs. The split is
 * still the processor's, as ruled above.
 *
 * THE ONCE-ONLY FLAG IS NOT IN THE BOOK. Nothing in Vaarn says a body can be
 * processed once, and nothing says it cannot be processed twice either. A
 * control with no guard is not neutral, though — it is an unlimited ration
 * fountain off one dead lizard, which is a rule nobody chose. The flag is
 * therefore the conservative reading and is deliberately visible here rather
 * than buried: if Matt rules that a body can be returned to, delete the flag
 * and its two readers and nothing else changes.
 *
 * WHY NOT A KILL-CARD BUTTON. Kill/Death-Detection Hook fires on a killing
 * BLOW, so a creature that died to a failed save, a fall or a GM's manual HP
 * edit would never offer the control. The corpse is the thing the rule is
 * about, so the corpse carries the control.
 */

import { RAW_MEAT, FRESH_BLOOD, THIRD_OF_A_SLOT } from "./rest.js";
import { findContainer, ensureContainer } from "./dropped-container.js";
// A creature's own flags from its actor-level sentences (Effect Engine: Creatures chunk 2d).
import { creatureActorFlagsOf } from "../item/creature-effects.js";

/** Flag scope and key marking a body already processed. */
export const BUTCHERY_SCOPE = "vaarn";
export const BUTCHERED_FLAG = "butchered";

/**
 * How many rations this body yields — "double their Level".
 *
 * Returns 0 rather than null for an ineligible body, so a caller can add it
 * up without branching. Level 0 creatures therefore yield nothing, which the
 * book's own arithmetic says and this file does not need to rule on.
 */
export function rationYield(actor)
{
  const level = Number(actor?.system?.level?.value ?? 0);
  return level > 0 ? level * 2 : 0;
}

/**
 * What the book lets Butchery take from this body: "any" (the default),
 * "blood" only, or "nothing", with the book sentence that says why.
 *
 * RULED 2026-09-23 (Matt). The Blightbeast: "Their corpses cannot be used as
 * a source of rations" - refused outright. The Unicorn: "their flesh is full
 * of glitter, rendering it inedible" - the book is silent on its blood, and
 * Matt allows it, so the whole yield comes off as Fresh Blood. Read from
 * flags.vaarn.carcass, which bestiary-build.js copies from the roster.
 */
export function carcassOf(actor)
{
  const c = creatureActorFlagsOf(actor).carcass;
  return (c?.yields === "nothing" || c?.yields === "blood") ? { yields: c.yields, why: c.why ?? "" } : { yields: "any", why: "" };
}

/** Has this body already been processed? */
export function isButchered(actor)
{
  return actor?.getFlag?.(BUTCHERY_SCOPE, BUTCHERED_FLAG) === true;
}

/**
 * Why this body cannot be processed, or null when it can.
 *
 * A REASON AND NOT A BOOLEAN, for the same reason rationFreeRule is a lookup:
 * "you cannot butcher this" with no cause is the failure this shape avoids,
 * and three of the four causes are things the player can see and disagree
 * with. The sheet uses the same strings the chat refusal does.
 */
export function butcheryRefusal(actor)
{
  if(!actor) return "there is no creature here";
  if(actor.type === "container") return "a container is not a creature";
  if(!actor.system?.creatureTypes?.biological)
    return `${actor.name} is not a Biological creature`;
  if(Number(actor.system?.health?.value ?? 0) > 0)
    return `${actor.name} is not dead`;
  if(isButchered(actor)) return `${actor.name} has already been processed`;
  const carcass = carcassOf(actor);
  if(carcass.yields === "nothing")
    return `${actor.name} cannot be used as a source of rations${carcass.why ? ` (${carcass.why})` : ""}`;
  if(rationYield(actor) <= 0)
    return `${actor.name} is Level 0 and yields nothing`;
  return null;
}

/** Can this body be processed right now? */
export function canButcher(actor)
{
  return butcheryRefusal(actor) === null;
}

/**
 * Add rations to the ground box, merging into a stack already there.
 *
 * MERGES RATHER THAN PILING UP SEPARATE STACKS, because the slot rule counts
 * quantity now — three separate Food Ration Items of 1 each would cost three
 * slots to whoever picked them all up, and one stack of 3 costs one. Before
 * 2026-09-12 that distinction did not exist and either shape behaved the same.
 */
async function addRations(container, name, count)
{
  if(count <= 0) return 0;

  const existing = container.items.find(i => i.name === name);
  if(existing)
  {
    await existing.update({ "system.quantity": Number(existing.system.quantity ?? 0) + count });
    return count;
  }

  await container.createEmbeddedDocuments("Item", [{
    name,
    type: "item",
    system: { slots: THIRD_OF_A_SLOT, quantity: count }
  }]);
  return count;
}

/**
 * Process a body into rations on the ground. Returns what happened, or null
 * if it was refused — the caller reports, this does not.
 *
 * THE FLAG IS SET BEFORE THE ITEMS ARE CREATED, which is the opposite ordering
 * to dropItem() and deliberately so. There, the failure to protect against was
 * destroying a player's gear, so the create comes first and a crash leaves a
 * duplicate. Here the failure to protect against is the fountain: a crash
 * between the two should leave a body that yields nothing, not one that can be
 * processed again for a second full payout.
 */
export async function butcher(actor, { food = 0, water = 0 } = {})
{
  if(!canButcher(actor)) return null;

  const yieldTotal = rationYield(actor);
  const wantFood  = Math.max(0, Math.floor(Number(food) || 0));
  const wantWater = Math.max(0, Math.floor(Number(water) || 0));
  if(wantFood + wantWater !== yieldTotal) return null;
  // Blood only (the Unicorn): no Raw Meat, whatever the caller asked for.
  if(carcassOf(actor).yields === "blood" && wantFood > 0) return null;

  const container = findContainer() ?? await ensureContainer();
  if(!container) return null;

  await actor.setFlag(BUTCHERY_SCOPE, BUTCHERED_FLAG, true);

  await addRations(container, RAW_MEAT, wantFood);
  await addRations(container, FRESH_BLOOD, wantWater);

  return { total: yieldTotal, food: wantFood, water: wantWater, container };
}
