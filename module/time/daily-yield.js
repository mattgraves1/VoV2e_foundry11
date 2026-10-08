/**
 * A companion that brings its owner something each travel day —
 * foundry-system-index.csv "Travel and Rations", built 2026-09-23 for the
 * Exultant's Hawk.
 *
 * WHAT THE BOOK STATES (JADE IBIS): "Hunter: When traveling through
 * wilderness, the hawk brings its owner one ration of bird meat per day."
 *
 * THE RULINGS (Matt, 2026-09-23):
 *   - BIRD MEAT IS RAW MEAT, which feeds anyone as food (rest.js
 *     RATION_GROUPS), so the hawk needs no Item of its own.
 *   - IT FIRES FROM START THE DAY. That button only shows while the
 *     Exploration Clock is set to Desert, which is the book's "wilderness":
 *     a party in a vault gets nothing, with no second check here to drift.
 *     This OVERRULES the 2026-09-12 ruling that the button is "rolls only";
 *     that ruling was about not rivalling the Rest's ration draw, and the
 *     hawk gives rather than draws.
 *   - IT GOES INTO THE OWNER'S INVENTORY, not the Dropped Items container.
 *     Item slots allow going over, so a full pack takes it and is simply
 *     over-encumbered.
 *
 * DECIDED IN THE BUILD, NOT RULED:
 *   - A creature with no resolvable owner brings nothing, and the card names
 *     it, so a hawk whose owner was never set is visible rather than silent.
 *   - A creature at 0 HP or below brings nothing and is named: a dead hawk
 *     does not hunt. CONFIRMED BY MATT the same day - a companion is an npc
 *     Actor, which dies at 0 HP; Wounds and negative HP are a PC's alone.
 *
 * WHICH CREATURES: any Actor carrying flags.vaarn.dailyYield, which
 * bestiary-build.js's creatureFlags copies from a roster's `dailyYield`
 * field - a flag and not a name lookup, so a renamed hawk still hunts.
 */

import { ownerOf } from "../actor/companion.js";
import { THIRD_OF_A_SLOT } from "../actor/rest.js";
// A creature's own flags from its actor-level sentences (Effect Engine: Creatures chunk 2d).
import { creatureActorFlagsOf } from "../item/creature-effects.js";

const SCOPE = "vaarn";
export const DAILY_YIELD_FLAG = "dailyYield";

/** The yield this creature brings, or null. {rule, item, count} */
export function dailyYieldOf(actor)
{
  const y = creatureActorFlagsOf(actor)[DAILY_YIELD_FLAG];
  return (y?.item && Number(y.count) > 0) ? { rule: y.rule ?? "", item: y.item, count: Number(y.count) } : null;
}

/** Add `count` of a stacked Item to an actor, merging into a stack already there. */
async function giveStacked(actor, name, count)
{
  const stack = actor.items.find(i => i.name === name && i.type === "item");
  if(stack)
  {
    await stack.update({ "system.quantity": Number(stack.system.quantity ?? 0) + count });
    return;
  }
  await actor.createEmbeddedDocuments("Item", [{ name, type: "item", system: { slots: THIRD_OF_A_SLOT, quantity: count } }]);
}

/**
 * Every yielding creature brings its owner the day's catch. Posts one public
 * card if any creature carries a yield. Returns what happened.
 */
export async function bringDailyYields()
{
  const brought = [];
  const skipped = [];
  for(const creature of game.actors.filter(a => a.type === "npc" && dailyYieldOf(a)))
  {
    const y = dailyYieldOf(creature);
    const owner = ownerOf(creature);
    if(!owner) { skipped.push({ creature, why: "has no owner" }); continue; }
    if(Number(creature.system?.health?.value ?? 1) <= 0) { skipped.push({ creature, why: "is dead" }); continue; }
    await giveStacked(owner, y.item, y.count);
    brought.push({ creature, owner, ...y });
  }
  if(!brought.length && !skipped.length) return null;

  const lines = [
    ...brought.map(b => `<li><b>${b.creature.name}</b> brings <b>${b.owner.name}</b> `
      + `${b.count === 1 ? "one" : b.count} <b>${b.item}</b>${b.rule ? ` (<b>${b.rule}</b>)` : ""}.</li>`),
    ...skipped.map(s => `<li><b>${s.creature.name}</b> ${s.why}, and brings nothing.</li>`)
  ];
  await ChatMessage.create({
    content: `<div class="vaarn-chat-card"><h3>The day's catch</h3><ul>${lines.join("")}</ul></div>`
  });

  return { brought: brought.map(b => ({ creature: b.creature.name, owner: b.owner.name, item: b.item, count: b.count })),
           skipped: skipped.map(s => ({ creature: s.creature.name, why: s.why })) };
}
