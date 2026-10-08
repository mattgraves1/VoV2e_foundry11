/**
 * Item Attunement Gate — `system.attuned`, foundry-system-index.csv row of
 * that name.
 *
 * A Planeyfolk lacks a third dimension and cannot simply pick up a 3D object
 * and use it. CRIMSON HOUND, Attune with Matter: "You struggle to hold 3D
 * objects, and must make a DEX save to do so. However, with certain mental
 * techniques you can draw 3D objects into your flattened reality. Given an
 * hour of quiet concentration, you can attune yourself with an item and add
 * it to your inventory."
 *
 * WHAT THIS DELIBERATELY DOES NOT DO, and it is a bend Matt chose with the
 * alternative costed. Read strictly, attuning is what ADDS the item to the
 * inventory, so an unattuned item is not carried at all. That reading was
 * rejected on his own objection — the give button. Handing an item to a
 * Planeyfolk would mean it cannot arrive, which reads as a broken control
 * rather than as a rule.
 *
 * The deeper cost was state, not gating. Interception is cheap: knave.js
 * already runs a creation hook. But "held yet not in inventory" is a new
 * state that slot counting, encumbrance, the sheet lists, transfer, the
 * dropped container and hands accounting would each have to respect, and
 * missing it in any one of them produces a WRONG NUMBER rather than an
 * error — the failure shape this codebase keeps being caught by, and the one
 * no test finds unless it is looking for it.
 *
 * So an unattuned item is carried, given, dropped and counted exactly like
 * any other. Only using and equipping it are refused.
 *
 * IT STILL TAKES SLOTS. Matt, 2026-09-08: "we have to make them take slots,
 * otherwise planeyfolk becomes the party's bag of holding." Nothing here
 * touches slot counting, which is how that holds — the gate is a read, and
 * inventory arithmetic never consults it.
 *
 * INTRINSIC ITEMS ARE EXEMPT, never needing attunement. Matt agreed the
 * reading 2026-09-08: a mutation, a natural weapon, an ancestry rule or a
 * Mystic Gift is part of the character rather than a 3D object drawn into
 * their reality, so there is nothing to attune. This falls out of the
 * predicate rather than being special-cased anywhere, which is the whole
 * value of Intrinsic Item Marker existing first — without that field this
 * gate would have refused a Planeyfolk their own claws.
 */

import { isIntrinsic } from "./intrinsic.js";
import { startActivity } from "../time/activity.js";
import { hasCondition } from "../time/stateful-effect.js";
import { bodySentences } from "../effects/body.js";

/**
 * The ancestry this applies to. A named constant rather than a literal at the
 * call site because it is compared against stored character data — chargen
 * writes `system.ancestry` — and a typo in a string comparison fails silently
 * by never gating anything, which looks exactly like the rule not existing.
 */
export const ATTUNING_ANCESTRY = "Planeyfolk";

/** Is this Item attuned to its bearer? Intrinsics are always effectively so. */
export function isAttuned(doc)
{
  return doc?.system?.attuned === true || isIntrinsic(doc);
}

/**
 * The ancestry rule that carries the gate, as an Item. A Planeyfication
 * Potion (RULED 2026-09-23, Matt) grants the Planeyfolk rules BESIDE the
 * drinker's own ancestry, so the string above stays whatever it was and the
 * Item is what says they now attune. A chargen-built Planeyfolk carries the
 * same Item, so both reads agree for them.
 */
export const ATTUNING_RULE = "Attune with Matter";

/**
 * The same rule as a board CONDITION, for a span - the Planeyfied mishap's
 * [INT] days (RULED 2026-09-25, Matt: "Planeyfolk special rules" includes
 * Attune with Matter). It lapses with the row, so nothing has to remove it.
 */
export const ATTUNING_CONDITION = "attuneWithMatter";

/** Does this actor attune at all - by ancestry, by the rule gained later, or for a span? */
export function attunes(actor)
{
  // Mutations and Ancestry Rules chunk 6 (RULED 2026-10-06): Attune with
  // Matter's own sentence, from its rule Item or - a Planeyfolk made before
  // its rule Items - the ancestry text (ruling B), in place of the ancestry
  // name and the rule name. The two constants above name what that reads.
  return bodySentences(actor, "passive").some(p => p.sentence.do?.verb === "special" && p.sentence.do.handler === "attunes")
    || hasCondition(actor, ATTUNING_CONDITION);
}

/**
 * The one predicate. True when this actor may NOT freely use or equip this
 * item because it has not been attuned.
 *
 * False for every character of every other ancestry, which is what keeps the
 * blast radius of this mechanism to one ancestry: nothing else in the system
 * behaves differently because this field exists.
 */
export function needsAttunement(actor, item)
{
  return attunes(actor) && !isAttuned(item);
}

/**
 * USING something is gated more loosely than equipping it: attuned OR already
 * in hand.
 *
 * This is the DEX save's consequence rather than a convenience. The book's
 * save is for HOLDING a 3D object — "You struggle to hold 3D objects, and must
 * make a DEX save to do so" — so once the Referee has allowed a Planeyfolk to
 * take something up, swinging it needs no second adjudication. Let go and the
 * next attempt is a fresh save, which is the state Matt asked to preserve:
 * nothing is written to the item, so unequipping restores the refusal by
 * itself.
 *
 * THE LOOPHOLE THIS OPENS, and why un-attuning unequips. If the Referee could
 * un-attune something while it was equipped, this clause would leave it
 * usable — un-attunement would mean nothing at all. So the un-attune control
 * clears `equipped` in the same update. Both halves are needed; either alone
 * is wrong.
 */
export function needsAttunementToUse(actor, item)
{
  if (item?.system?.equipped === true) return false;
  return needsAttunement(actor, item);
}

/**
 * Why a control was refused, as a sentence for a notification.
 *
 * Named rather than inlined so the refusal reads the same wherever it comes
 * from. A gate that says different things at different buttons teaches a
 * player that some refusals are bugs.
 */
export function refusalFor(actor, item, verb)
{
  return `${actor.name} has not attuned ${item.name}, so cannot ${verb} it.`
       + ` Attuning takes an hour of quiet concentration.`;
}

/* -------------------------------------------- */
/*  Becoming attuned                                                          */
/* -------------------------------------------- */

/**
 * The tag an attunement effort carries, so the completion listener can tell
 * one from every other kind of effort on the board.
 */
export const ATTUNE_PURPOSE = "attune";

/**
 * The book's own route: an hour of quiet concentration.
 *
 * Starts an effort on the Active Effect Board and NOTHING ELSE — no clock
 * moves, per Matt's ruling that there is no automatic advancement. So a player
 * may start this themselves: it states an intention the Referee can see, and
 * it cannot advance time on its own.
 *
 * The hour is not spent here. It accrues as the Referee moves the clock, and
 * is paused or reset if the party is interrupted, which is the whole point of
 * Activity Time Cost being a finish line rather than a cost.
 */
export async function startAttunement(actor, item)
{
  return startActivity(actor, {
    name: `Attuning: ${item.name}`,
    text: "An hour of quiet concentration to draw a 3D object into a flattened reality.",
    itemId: item.id,
    required: 3600,
    unit: "hour",
    amount: 1,
    // Pause, not reset. The book states "cannot be truncated" for brewing and
    // says nothing of the kind here, so the lenient default applies and the
    // Referee still has both controls on the row.
    onInterrupt: "pause",
    purpose: ATTUNE_PURPOSE
  });
}

/**
 * An effort reached its finish line. Attune the item if that is what it was
 * for, and otherwise do nothing at all.
 *
 * Registered in knave.js against the activity module's completion hook rather
 * than called from it, so that module never learns what any particular effort
 * is for.
 */
export async function onActivityComplete({ actor, entry } = {})
{
  if (entry?.purpose !== ATTUNE_PURPOSE) return;
  const item = actor?.items?.get(entry.itemId);
  // The item can be gone — given away, dropped, consumed — while the effort
  // ran. That is not an error and must not throw: an hour spent attuning
  // something you no longer have is simply an hour spent.
  if (!item) return;
  await item.update({ "system.attuned": true });
  return ChatMessage.create({
    content: `<p><b>${actor.name}</b> is now attuned with <b>${item.name}</b>.</p>`
  });
}
