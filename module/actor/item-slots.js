/**
 * Item Slots — how much of a character's pack one Item occupies.
 *
 * Split out of actor.js's prepareDerivedData 2026-09-12, with Travel and
 * Rations. The arithmetic used to be one line inside that loop and could only
 * be exercised by rendering a sheet; it now has two callers' worth of rules in
 * it, so it is a pure function that tools/test-item-slots.mjs can drive
 * offline. Same move the Activity Time Cost fix made with survivesCombatEnd,
 * and for the same reason: a rule reachable only from a live world is a rule
 * whose regressions are found by hand.
 *
 * WHAT THE BOOK STATES. "Three days of either type of ration can be carried in
 * a single item slot" (CRIMSON HOUND, Rations), and separately "Up to three
 * rations of water can be carried in one item slot". For Synth Parts: "You
 * begin play with 3 spare Synth Parts, which stack in one item slot."
 *
 * THE RULE, AND IT IS ONE MULTIPLY: `slots` is the cost of ONE unit, and a
 * stack costs that times how many there are. Fractions pool across the whole
 * pack and `usedSlots` rounds up ONCE, which is what the rations rule has
 * always done - "three rations to a slot" is 0.33 each.
 *
 * IT USED TO INFER PER-UNIT-OR-PER-STACK FROM THE MAGNITUDE, and that is what
 * Per-Unit Slot Weight was filed to remove (2026-09-19). Below 1 the number
 * multiplied by quantity; at 1 or above it did not. Two things the book says
 * were therefore unexpressible: a per-unit weight of 2 ("Bulky - 2 slots per
 * hide") read as 2 slots for ALL the hides, and half a slot for a whole stack
 * could not be written at all, because 0.5 already meant half a slot EACH.
 * The second is how it surfaced - Featherlight's "half base slot weight" on a
 * stack of 8 came out at 4 slots instead of 0.5, four times heavier for a
 * rule that halves.
 *
 * MEASURED WHEN IT WAS FIXED: 12 of the 50 trade goods carry an explicit
 * per-unit slot figure in the book and not one was encoded, so 4 hides cost 1
 * slot where the book says 8. Trade good slot weight was decorative.
 *
 * NOTHING FRACTIONAL MOVED. Rations, Synth Parts, Medgel and the rest were
 * already 0.33 x quantity and are arithmetically untouched; counted starting
 * gear was given a per-unit weight of 1/N (gearItemData) so five flashbangs
 * still cost one slot, which Group 209 tested and Matt kept deliberately
 * rather than let one rule quietly rebalance every new character.
 *
 * QUANTITY IS NOT ALWAYS THE COUNT OF THINGS. A trade good's `quantity` holds
 * PRICED GROUPS so that Quantity x Trade Value multiplies out to the stack's
 * worth - 600 olives is quantity 6 - and the pricing group is not the stacking
 * group either (grubs price per 100 and stack per 500). So a trade good
 * records its raw unit count on `flags.vaarn.units` and that is what this
 * multiplies. Anything without the flag uses `quantity`, which for every other
 * Item in the system IS the count of things.
 */

import { companionKindOf, companionLedger } from "./companion.js";

/**
 * The Item flag that says a thing is STOWED rather than carried.
 *
 * Container Slot Capacity, 2026-09-20. It exists for the character case alone.
 * A pet, steed or vehicle holds nothing but cargo as far as slots go - its
 * attack Items and intrinsics cost 0 slots already, so slotCostOf excludes
 * them without being told - but a poxed character's own gear and the contents
 * of their cavity live on the SAME Actor and must not be added together.
 */
export const CARGO_FLAG = "cargo";

/** Is this Item stowed in a cargo compartment rather than carried? */
export function isCargo(item)
{
  return item?.flags?.vaarn?.[CARGO_FLAG] === true;
}

/**
 * The slot cost of one Item, stack included. Per unit times units; fractional —
 * `stackSlotsOf` is what rounds it, stack by stack, for everybody.
 */
export function slotCostOf(item)
{
  const perUnit = Number(item?.system?.slots) || 0;
  if(perUnit <= 0) return 0;
  const units = Number(item?.flags?.vaarn?.units ?? item?.system?.quantity ?? 1);
  return perUnit * (Number.isFinite(units) && units > 0 ? units : 1);
}

/**
 * What ONE stack occupies, as a whole number of slots - Per-Stack Slot
 * Rounding, RULED 2026-09-27 (Matt): "Slots are not fractional." Every stack
 * rounds up on its own, rations and counted gear included, and a stack is one
 * Item document. 49 shells cost 1 slot whatever else is carried; 49 shells and
 * 40 olives cost 2. The book's starting kit reads the same way: "3 rations of
 * water (1 slot), 3 rations of food (1 slot)" - a slot per kind, not a pool.
 *
 * The toFixed is not decoration. 0.33 * 3 is 0.9899999999999999 in binary
 * floating point and 0.3333 * 3 is 0.9999; without it three rations could ceil
 * to 1 while some other exact stack ceils a slot high. Matt ruled the 0.33
 * imprecision acceptable "in a small space like this (20ish slots)" — that is a
 * statement about the third decimal place, not a licence for the float noise
 * below it. A weightless stack stays 0.
 */
export function stackSlotsOf(item)
{
  const cost = slotCostOf(item);
  return cost > 0 ? Math.ceil(Number(cost.toFixed(4))) : 0;
}

/**
 * What a whole inventory occupies, as a WHOLE number of slots: every stack
 * rounded on its own (stackSlotsOf), then added.
 *
 * EVERY READER TAKES THIS FIGURE. The displayed count, the Encumbered flag and
 * the Fleeing Combat save target all read it (actor.js does the same sum for a
 * character, cargo included). Rounding at each reader instead is precisely the
 * drift the >= / > fix closed on 2026-09-07. Until 2026-09-27 the fractions
 * pooled across the pack and rounded ONCE here (Per-Unit Slot Weight's ruling
 * of 2026-09-19); Per-Stack Slot Rounding replaced that.
 */
export function usedSlots(items)
{
  let used = 0;
  for(const i of items ?? []) used += stackSlotsOf(i);
  return used;
}

/**
 * The slots a PET has earned by levelling.
 *
 * "When gaining a Level, pets gain +4 HP and add +1 slot to item carrying
 * capacity" (Core Rules/Pets.md, Advancement). Summed off the level-up ledger
 * rather than off the current Level, because the ledger is the only honest
 * record of levels GAINED - a pet imported at Level 3 has gained none, and the
 * roster's starting Level cannot be looked up by name (matching a companion
 * against a roster by name was declined 2026-09-19: a renamed pet would stop
 * being one). advancement.js has been writing the grant into that ledger since
 * 2026-09-13 precisely so this function could read it.
 */
function petLevelSlots(actor)
{
  let earned = 0;
  for(const e of companionLedger(actor)) earned += Number(e?.slots) || 0;
  return earned;
}

/**
 * How many slots of cargo this Actor can hold ON SOMEONE ELSE'S BEHALF, or
 * null for one that holds none. Container Slot Capacity, 2026-09-20.
 *
 * This is NOT the owner's own carrying capacity. A character's 10 + CON and
 * the absolute 20 are inventorySlots.value and .max and are untouched by
 * everything here; a rule that changes what the owner themselves can carry
 * belongs to Baked Flat-Bonus Fields, which is where Hollowheart Hooch and the
 * Kangaroo Pouch sit.
 *
 * FOUR HOLDERS, and each takes its number from a different place because the
 * book does:
 *   - FOLLOWER: 10 + Level. "Followers have item slots equal to 10 + their
 *     Level" (Followers.md). Derived off the CURRENT Level so the capacity
 *     follows a hand-levelled Follower. Built 2026-09-18 under Actor Creation
 *     from Roll Table and folded in here unchanged.
 *   - PET: what the stat block prints, plus +1 per Level gained. Only the
 *     Companion Ooze prints anything (10); RULED 2026-09-20 (Matt) that every
 *     other pet's base is 0, the book printing no figure for them.
 *   - STEED: what the stat block prints, all 8 of them, 20 to 100. The Thin
 *     Mare prints "Special" and carries itemSlotsSpecial alongside its 100 -
 *     the flag says the capacity is not freely available, and honouring THAT
 *     is not this function's job.
 *   - VEHICLE: what the stat block prints, all 11, from a Skiff's 10 to a Wind
 *     Barge's 2000.
 * A MERCENARY GETS NONE BY RULE, not by omission: the book says they will not
 * carry baggage. Every other npc gets none because a creature has no printed
 * capacity at all.
 *
 * A CHARACTER ONLY HAS ONE ONCE SOMETHING GRANTS IT - today, Labyrinth Pox
 * Stage 2 hollowing them out. Zero reads as "no compartment" rather than "an
 * empty one", so an unpoxed character's sheet shows nothing new.
 */
export function cargoCapacityOf(actor)
{
  if(!actor) return null;
  if(actor.type === "vehicle") return Number(actor.system?.itemSlots) || 0;
  if(actor.type === "character")
  {
    const cap = Number(actor.system?.cargo?.capacity) || 0;
    return cap > 0 ? cap : null;
  }
  if(actor.type !== "npc") return null;

  switch(companionKindOf(actor))
  {
    case "follower": return 10 + Number(actor.system?.level?.value ?? 0);
    case "steed":    return Number(actor.system?.itemSlots) || 0;
    case "pet":      return (Number(actor.system?.itemSlots) || 0) + petLevelSlots(actor);
    default:         return null;
  }
}
