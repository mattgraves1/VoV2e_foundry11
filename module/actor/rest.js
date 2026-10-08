/**
 * Rest and Recovery — foundry-system-index.csv "Rest and Recovery".
 *
 * WHAT THE BOOK STATES (Core Rules/Healing.md, CRIMSON HOUND p.31; the vault
 * and the PDF agree word for word):
 *
 *   "When a character is healed, their HP recovers as though starting from 0.
 *    HP can be replenished via Short and Long Rests.
 *    - Short Rest: a quick sit-down, with a ration of water or food.
 *      Replenishes d8 + CON bonus HP.
 *    - Long Rest: a ration of water and a meal, followed by a full night's
 *      sleep in a safe place. This replenishes all lost HP. If HP is already
 *      full, heal one Wound or restore damaged ability bonuses by one point."
 *
 * And, from The Desert/Desert Exploration, the one variant that is also a Rest
 * rule rather than a rule about watches: "Whoever is on watch cannot benefit
 * from a Long Rest; instead they will regain only d8 + CON bonus HP."
 *
 * WHAT "AS THOUGH STARTING FROM 0" MEANS. RULED 2026-09-11 (Matt): healing is
 * ADDITIVE, and the clause is about the floor rather than the addition. It
 * immediately follows the Wounds section, which is the only place the book
 * lets HP go below zero — "their remaining HP drops below 0" — so the missing
 * clause is "if negative": you do not count up from a negative number. A
 * character at -8 who rolls 6 on a Short Rest ends at 6, not at -2.
 *
 * That is load-bearing here rather than theoretical. actor-sheet.js's
 * _resolveHPChange really does store negative HP for characters, clamped at
 * -20, so without the floor every rest taken below zero would be partly eaten
 * by the debt. `healFloor` is that one clause and every heal in this file goes
 * through it.
 *
 * WHO CANNOT REST, and it is two separate rules that look alike:
 *
 *   - DEPRIVED. "A Deprived character cannot heal lost HP or otherwise benefit
 *     from Rests." deprived.js owns this; blocksHealing() is its refusal, and
 *     it is checked BEFORE any roll or any ration is spent, for the reason
 *     that file gives about Photosynthesis — showing a player a number they
 *     did not get reads as a bug rather than as a rule.
 *
 *   - LITHLING AND SYNTH. Both ancestries have their own rule and neither
 *     carries rations at all: Crystalline Flesh gives a Lithling "no food/water
 *     needed", Inevitable gives them "cannot heal lost HP", and a Synth's three
 *     Synth Parts "replace both food and water rations" while Repairs says they
 *     "cannot heal HP from rations". chargen-app.js already starts both on zero
 *     of each. RULED 2026-09-11 (Matt): they never consume a ration and never
 *     gain HP from a Rest, and the refusal names their own rule rather than
 *     reporting an empty pack — a Lithling denied a rest for want of water
 *     would be wrong twice over.
 *
 * THE FULL-HP BRANCH IS STILL OFFERED TO THEM, which is the one place this
 * file is more generous than a literal read of "no effect from a Rest". Matt,
 * same day: "Technically I guess a lithling with full HP could conceivably
 * recover from ability damage, or a wound that it got for something besides
 * going to 0 HP." Nothing in Inevitable or Repairs touches Wounds or ability
 * damage, so refusing those would be inventing a restriction.
 *
 * AND FOR A LITHLING THE PRECONDITION IS WAIVED ENTIRELY. RULED 2026-09-11
 * (Matt): "let's just let lithlings bypass that part altogether, they can
 * always choose to restore damaged abilities or heal a wound during a long
 * rest." Offering a branch that a damaged Lithling can never reach is the
 * same as not offering it; see `offerRecovery` in longRest below.
 *
 * SYNTH IS EXCLUDED FROM THAT WAIVER. RULED 2026-09-11 (Matt), answering the
 * question the previous wording of this comment left open. The waiver exists
 * because full HP is UNREACHABLE, and for a Synth it is not: Repairs heals
 * d8 + CON for one Synth Part, so a Synth can get back to full and qualify
 * the ordinary way. A Lithling has no such route at any price. Repairs is
 * built (synth-repair.js, the Synth Part Repair row), so that route is real.
 *
 * ABILITY RESTORE IS PLURAL. RULED 2026-09-11 (Matt): "restore damaged ability
 * bonuses by one point" gives one point back on EACH damaged ability, not one
 * point spread across them — the noun is plural and the point is not. Never
 * below zero damage, which is the same clamp for the same reason as healFloor.
 *
 * WOUNDS AND ABILITY DAMAGE ARE NOT LINKED, and this file must not link them.
 * Confirmed 2026-09-11 by reading actor-sheet.js's _healWound: it removes the
 * wound and its paired Item and touches woundDamage and max HP not at all. So
 * curing a Wound that arrived with -2 STR returns no STR, which is what Matt
 * wants and what the book's separate "or" implies. The two branches below are
 * alternatives precisely because they are different currencies.
 *
 * WHAT A LONG REST CLEARS. RULED 2026-09-11 (Matt): the day-scale lockouts go
 * with it — hypergeometricLockout ("locked out ... until a Long Rest") and
 * sporeLockout ("cannot release anymore spores that day"). Their checkboxes
 * stay on the sheet rather than being deleted, on the same reasoning
 * deprived.js gives for leaving the HP field ungated: a manual override is the
 * Referee's escape hatch, and a control that silently stops mattering is worse
 * than one that a rest happens to clear.
 *
 * AND THE ITEM-LEVEL DAILY POOLS GO WITH THEM. RULED 2026-09-20 (Matt). Until
 * then a Long Rest cleared the two actor flags and left Ink Ducts and the
 * Trauma-Response Rig spent until somebody clicked their refresh icon, so the
 * same "once per day" was enforced by code on one half of the sheet and left to
 * the table on the other. The refresh buttons stay for exactly the reason the
 * checkboxes do. What a pool refills TO is daily-pool.js's answer, not one this
 * file computes - see its header for why that is not written down twice.
 *
 * THE TWO MODIFIER SEAMS, both for atoms that cannot be finished yet:
 *
 *   - `rotting` doubles a Short Rest, for Mycomorph's Detritivore ("Heals
 *     double HP from Short Rests if the meal you eat is rotting"). The ancestry
 *     IS the signal, exactly as toxin-die.js already decides Detritivore's save
 *     advantage — it is universal to Mycomorphs, so there is no Item to look
 *     for.
 *   - HALF_LONG_REST is a stateful-effect condition, for Janus Lenses ("the
 *     afflicted regain only HALF their maximum HP from a Long Rest"). NOTHING
 *     SETS IT TODAY and that is expected: Nanomachine Infections has no roster,
 *     which ambush.js notes for the same atom. The seam exists so the roster
 *     has somewhere to land rather than so the atom can be marked.
 *
 * WHAT IS DELIBERATELY NOT HERE. Feeding followers, mercenaries, steeds and
 * pets off one button — Matt's idea 2026-09-11 and a good one — has nothing to
 * attach to: there is no pet, steed or follower Actor type, no roster for any
 * of them, and Mycomastiff exists only as roll-table text. Filed as its own
 * mechanism row behind the generation rows that must come first.
 */

import { rationTimesOf } from "../item/weapon-tags.js";
// Registers the affliction translator, whose upkeep sentence is the Stoma's draw (Wounds and Afflictions chunk 3).
import "../item/affliction-effects.js";
import { offerWeaponFeeding } from "../item/weapon-feeding.js";
import { blocksHealing, isDeprived, noHealRule, setDeprived } from "./deprived.js";
import { hasCondition } from "../time/stateful-effect.js";
import { MUTATION_TABLE } from "./mutation-data.js";
import { ADVANCED_IMPLANTS } from "./advanced-implants-data.js";
import { isSuppressed } from "../item/suppression.js";
import { refillDailyPools } from "./daily-pool.js";
import { heal, healFloor } from "../effects/heal.js";
import { gmHP } from "./hidden-hp.js";
import { entriesOf } from "../time/effect-board.js";
import { elixirSentencesByName } from "../item/consumable-effects.js";
import { startLapse, stopLapse } from "../time/lapse.js";
import { bodyDiets, rationFreeRuleOf, bodyPassives } from "../effects/body.js";

export const FOOD_RATION  = "Food Ration";
export const WATER_RATION = "Water Ration";
export const RAW_MEAT     = "Raw Meat";
export const FRESH_BLOOD  = "Fresh Blood";

/**
 * What counts as food and what counts as water, in the order it is eaten.
 *
 * RULED 2026-09-23 (Matt): Raw Meat is food and Fresh Blood is water for
 * EVERYONE, not only for the mutations that demand them. Butchery yields them
 * in place of the book's "rations of food or water" from a corpse, so they
 * have to feed a character with no diet as a ration does. FRESH BLOOD IS
 * WATER, not food, because Vampiric's missing blood makes them Deprived, and
 * thirst is the only passive way into that state.
 *
 * THE PLAIN RATION FIRST. RULED 2026-09-23 (Matt), SUPERSEDING his same-day
 * ruling that the perishables go first ("we have no spoiling mechanic. irl,
 * you'd use up the perishables first"). Group 330.10 found what that cost: a
 * character's own Long Rest runs before their companions eat, so an owner
 * with no diet ate the only Raw Meat and their Glue Worm, which can eat
 * nothing else, went hungry with enough in the pack for everyone. Plain
 * first means Raw Meat and Fresh Blood are eaten only when nothing plain is
 * left, which is exactly when a diet has nothing to lose. The Short Rest,
 * the player's choice anyway, lists all four.
 *
 * Keyed by the plain ration's name, so a caller holding FOOD_RATION or
 * WATER_RATION can ask for the group without knowing it is one.
 */
export const RATION_GROUPS =
{
  [FOOD_RATION]:  [FOOD_RATION, RAW_MEAT],
  [WATER_RATION]: [WATER_RATION, FRESH_BLOOD]
};

/** The Items that satisfy this need, plain ration first: a group, or the one name. */
export const rationKinds = name => RATION_GROUPS[name] ?? [name];

/**
 * The same, for one actor: the group plus anything an installed implant lets
 * THIS character eat or drink as a ration.
 *
 * OMNIGUTS (Advanced Implants): "Previously inedible materials like stone or
 * metal count as Rations. You must still drink water." RULED 2026-09-23
 * (Matt): stones, and only stones - the pack's Stone Item counts as food for
 * them. His "the funny thing to do" was any non-innate Item in the pack; the
 * narrower reading was his call. Read live off the ADVANCED_IMPLANTS entry's
 * `rationAlso` by name, like dietRationsFor, and skipped while the implant is
 * suppressed.
 *
 * EATEN FIRST, before the plain ration. RULED 2026-09-23 (Matt), reversing
 * the build's own stone-last order, which starved a pet: an owner with one
 * Food Ration and one Stone ate the ration, and the pet, which cannot eat
 * Stone, went hungry although the pack fed both. What only this actor can
 * eat is eaten before what a companion could have had - the same lesson as
 * the Glue Worm's Raw Meat (Group 330.10).
 *
 * Only for the actor's OWN meal. companion-upkeep.js feeds pets from the pack
 * with rationKinds, because an owner's Omniguts do not let a hound eat rocks.
 */
export function rationKindsFor(actor, name)
{
  const key = name === FOOD_RATION ? "food" : name === WATER_RATION ? "water" : null;
  const kinds = [...rationKinds(name)];
  if(!key) return kinds;
  // The body's 'also' - Omniguts' Stone and Scrap Metal - from its upkeep
  // sentence since Implants, Exotica and Figments chunk 2 (2026-10-06), not
  // suppressed, as the roster read was.
  for(const p of bodyPassives(actor, { verb: "upkeep" }))
  {
    if(p.sentence.do.item !== name) continue;
    for(const k of [...(p.sentence.do.also ?? [])].reverse()) if(!kinds.includes(k)) kinds.unshift(k);
  }
  // An ELIXIR's rationAlso, while its row is on the board - the Metallovore
  // Potion's Scrap Metal (Metal Item Property Part B, RULED 2026-09-27 by
  // Matt, replacing the 2026-09-23 free meal now a metal item exists). The
  // board row is the span, so the kind goes when the row does.
  // Its upkeep sentence since Effect Engine: Consumables chunk 2 (2026-10-06).
  for(const entry of entriesOf(actor))
  {
    const extra = elixirSentencesByName(entry.name).filter(s => s.do?.verb === "upkeep" && s.do.item === name).flatMap(s => s.do.also ?? []);
    for(const k of [...extra].reverse()) if(!kinds.includes(k)) kinds.unshift(k);
  }
  return kinds;
}

/**
 * The `slots` value for one item out of a stack the book packs three to a
 * slot: rations of food, rations of water, and Synth Parts.
 *
 * WHAT THE BOOK STATES: "Three days of either type of ration can be carried
 * in a single item slot", and separately "Up to three rations of water can be
 * carried in one item slot". Synth Parts: "You begin play with 3 spare Synth
 * Parts, which stack in one item slot." RULED 2026-09-12 (Matt) that all
 * three take the same rate, which the book gives outright for rations and
 * only implies for Synth Parts.
 *
 * 0.33 RATHER THAN 1/3, and the imprecision is the decision. Matt: "maybe
 * just taking up 0.33 item slots would be close enough in a small space like
 * this (20ish slots) that we don't have to change under-the-hood math." The
 * error never reaches a whole slot inside a 20-slot pack - 60 of them would
 * be needed before the ceiling in actor.js loses a slot, and the cap is 20.
 *
 * A CONSTANT BECAUSE THE VALUE IS THE CONTRACT. actor.js does not look for
 * these three names; it reads any fractional `slots` as a per-unit cost. So
 * this number is what enrols an item in that rule, and a fourth stacking item
 * needs only this value and no code.
 */
export const THIRD_OF_A_SLOT = 0.33;

/**
 * Condition name for the Janus Lenses seam above. A string rather than an
 * enum for the same reason CANNOT_DIE is one: activeDeltas sums whatever
 * `conditions` entries say, so the value IS the contract.
 */
export const HALF_LONG_REST = "halfLongRest";

/**
 * Ancestries that neither spend rations nor gain HP from a Rest, mapped to the
 * rule that says so. The message names the rule, so this is a lookup and not a
 * predicate — "cannot rest" with no reason is the failure this table avoids.
 */
export const RATION_FREE =
{
  "Lithling": "Inevitable",
  "Synth":    "Repairs"
};

/* -------------------------------------------- */
/*  Reads                                                                 */
/* -------------------------------------------- */

// The "as though starting from 0" clause lives with the heal path now
// (effects/heal.js, Shared Pipelines chunk 3); re-exported for its readers.
export { healFloor };

/** The rule name blocking rations for this actor's ancestry, or null. */
export function rationFreeRule(actor)
{
  // The flesh's sentence since Mutations and Ancestry Rules chunk 2c - an Item,
  // or the ancestry text (ruling B). RATION_FREE above is kept as what it was.
  return rationFreeRuleOf(actor);
}

/**
 * How many of a named ration a Long Rest costs this actor, and WHY.
 *
 * Travel and Rations, 2026-09-12. RULED (Matt): the ration rules hang off
 * Rests rather than off a day — "the book may say per day in places, but rests
 * are where the mechanics come in" — so an entry that doubles a character's
 * daily draw doubles what their Long Rest spends.
 *
 * THE LONG REST AND NOT THE SHORT ONE. The book's Long Rest is "a ration of
 * water and a meal, followed by a full night's sleep", which is the daily
 * intake the doubling rules are written against; a Short Rest is "a quick
 * sit-down, with a ration of water OR food" and is not anybody's day. Doubling
 * it too would invent a cost the book never prices.
 *
 * A REASON ALONGSIDE THE NUMBER, like rationFreeRule above: a Long Rest that
 * silently wants two waters is indistinguishable from a bug, and the entry
 * name is what makes the refusal readable.
 *
 * READS THE ROSTER LIVE BY NAME, the same way actor.js resolves avBonus and
 * hpBonus, so a character built before the field existed picks it up with no
 * migration. Mutations, afflictions and implants carry it; the Pets entries
 * would need it too and have no code roster to be read from.
 *
 * IMPLANTS, 2026-09-27 (Matt): Dreadnaught Carapace states "You must consume
 * double rations each day or begin to starve", the same shape as Gills, so the
 * ADVANCED_IMPLANTS entry carries rationDraw and is read here by name. Skipped
 * while the implant is suppressed, as every other implant read in this file is.
 */
export function rationDrawFor(actor, name)
{
  const key = name === WATER_RATION ? "water" : name === FOOD_RATION ? "food" : null;
  if(!key) return { count: 1, sources: [] };

  let count = 1;
  const sources = [];
  for(const item of actor?.items ?? [])
  {
    // Mutations by name; afflictions by key (the Fabricator Stoma, 2026-09-24).
    // A mutation's draw is its upkeep sentence since Mutations and Ancestry
    // Rules chunk 2a (Gills: "Water Ration" x2), read by rationTimesOf below.
    // An implant's draw (Dreadnaught Carapace's double) is its upkeep sentence
    // since Implants, Exotica and Figments chunk 2 (2026-10-06), read by
    // rationTimesOf below with every Item's.
    // A weapon that makes its bearer eat and drink double - Parasitic, Effect
    // Engine: Weapon Tags chunk 5c (Matt, 2026-10-05) - while equipped.
    // Any Item's upkeep sentence since GM Effect Builder chunk 1 (2026-10-05) -
    // a weapon's from its tags, anything else's from what a GM wrote on it.
    const times = isSuppressed(item) ? 1 : rationTimesOf(item, key);
    if(times > count) { count = times; sources.push(item.name); }
    else if(times > 1) sources.push(item.name);
    // An affliction's draw (the Fabricator Stoma's double) is its upkeep
    // sentence since Effect Engine: Wounds and Afflictions chunk 3 (2026-10-06),
    // read by rationTimesOf above with every Item's.
  }
  return { count, sources };
}

/**
 * The dietary restrictions this actor eats under, each naming the Item that
 * satisfies it and what happens if it does not.
 *
 * Diet-Matched Ration Consumption, 2026-09-19. Matt's proposal of 2026-09-15
 * in its own words: "both obligate mutations and vampiric would be
 * implementable if we created unique items to represent the various ration
 * requirements. Then we'd have to wire their rest mechanisms to those items
 * instead of the regular ration item."
 *
 * READS THE ROSTER LIVE BY NAME, exactly as rationDrawFor above does and for
 * the same reason: a character built before the field existed picks it up with
 * no migration, and nothing is ever swept over existing world documents.
 *
 * A LIST AND NOT THE FIRST MATCH. Nothing in the book makes the three dietary
 * mutations exclusive - the Mutations page's only note about them is a
 * transcription record - so a character can roll two, and a Vampiric Obligate
 * Carnivore needs meat AND blood. Taking the first would silently drop the
 * second requirement, which is the kind of quiet wrong answer that never
 * reports itself.
 *
 * THE LONG REST AND NOT THE SHORT ONE, inheriting the Travel and Rations
 * ruling of 2026-09-12 rather than making a new one: the ration rules hang off
 * Rests, and the Long Rest is the day these clauses are written against. A
 * Short Rest is "a quick sit-down" and is not anybody's day.
 */
export function dietRationsFor(actor)
{
  // The body's diet sentences since Mutations and Ancestry Rules chunk 2c
  // (Obligate Carnivore, Obligate Lithovore, Vampiric), not suppressed.
  return bodyDiets(actor);
}

/**
 * Every non-empty stack of a named Item the actor is carrying.
 *
 * NAMED NEUTRALLY BECAUSE IT IS NOT ABOUT RATIONS. It was, until
 * synth-repair.js needed exactly the same three operations for Synth Parts -
 * find the stacks, count them, spend one. Copying twenty lines to say "Synth
 * Part" instead of "ration" is the shape of Saving Throw Resolution
 * Duplication, which is a PARTIALLY BUILT row for that reason. The
 * ration-named wrappers below keep every existing caller reading as it did.
 */
export function stacksOf(actor, name)
{
  return actor.items.filter(i => i.name === name && (i.system?.quantity ?? 0) > 0);
}

/** How many of a named Item the actor has, across every stack. */
export function countOf(actor, name)
{
  return stacksOf(actor, name).reduce((sum, i) => sum + (i.system.quantity ?? 0), 0);
}

/** Every stack of a named ration the actor is carrying. */
export function rationStacks(actor, name)
{
  return stacksOf(actor, name);
}

/** How many of a named ration the actor has, across every stack. */
export function rationTotal(actor, name)
{
  return countOf(actor, name);
}

/**
 * Abilities carrying wound damage, as [{key, damage}].
 *
 * woundDamage is stored POSITIVE and subtracted from the bonus, which is why
 * healing it counts DOWN. actor.js derives `effective` from the pair; nothing
 * here writes `effective` directly.
 */
export function damagedAbilities(actor)
{
  return Object.entries(actor.system.abilities)
    .filter(([, a]) => (a.woundDamage ?? 0) > 0)
    .map(([key, a]) => ({ key, damage: a.woundDamage }));
}

/* -------------------------------------------- */
/*  Writes                                                                */
/* -------------------------------------------- */

/**
 * A rest's heal, through the one heal path (effects/heal.js, Shared Pipelines
 * chunk 3). Ungated there: every caller has already refused a Deprived or
 * never-healing actor with its own wording. Returns { before, after, gained,
 * max, note } - `gained` EXCEEDS `amount` whenever HP was negative, so the
 * caller reports `gained` and never the roll.
 */
export async function applyHeal(actor, amount)
{
  return heal(actor, amount, { gate: false });
}

/**
 * Spend one of a named Item, deleting the stack when it empties.
 *
 * Takes from the SMALLEST stack first, so a split pile is consolidated by use
 * rather than leaving a scatter of ones behind. Returns false if there was
 * none, which the callers below treat as a refusal rather than a silent skip.
 */
export async function spendOne(actor, name)
{
  const stacks = stacksOf(actor, name)
    .sort((a, b) => (a.system.quantity ?? 0) - (b.system.quantity ?? 0));
  const stack = stacks[0];
  if(!stack) return false;

  const left = (stack.system.quantity ?? 0) - 1;
  if(left <= 0) await stack.delete();
  else await stack.update({ "system.quantity": left });
  return true;
}

/** Spend one of a named ration. See stacksOf for why the neutral name exists. */
export async function spendRation(actor, name)
{
  return spendOne(actor, name);
}

/**
 * How much food or water the actor carries, counting every Item that is one
 * FOR THEM (rationKindsFor). Pass `kinds` to count for somebody else - a
 * companion eating from this actor's pack.
 */
export function supplyTotal(actor, name, kinds = rationKindsFor(actor, name))
{
  return kinds.reduce((sum, kind) => sum + countOf(actor, kind), 0);
}

/**
 * Spend one food or one water, the plain ration first (RATION_GROUPS). Returns
 * the name of the Item spent, or null when there was none.
 */
export async function spendSupply(actor, name, kinds = rationKindsFor(actor, name))
{
  const kind = kinds.find(k => countOf(actor, k) > 0);
  if(!kind) return null;
  await spendOne(actor, kind);
  return kind;
}

/**
 * One point back on every damaged ability. Returns the keys actually restored,
 * so a caller can say "STR and CON" rather than "some abilities".
 */
export async function restoreAbilityPoints(actor)
{
  const damaged = damagedAbilities(actor);
  if(!damaged.length) return [];

  const patch = {};
  for(const { key, damage } of damaged)
    patch[`system.abilities.${key}.woundDamage`] = Math.max(0, damage - 1);

  await actor.update(patch);
  return damaged.map(d => d.key);
}

/**
 * Remove the wound at `index`, deleting its paired Item.
 *
 * THE ONLY COPY. actor-sheet.js's Wounds-tab control delegates here rather
 * than keeping its own, because a second implementation of "splice the array
 * and delete the Item" is exactly the shape of Saving Throw Resolution
 * Duplication. It lives in this file because a Long Rest is the book's only
 * route to healing a Wound; the sheet's button is a Referee convenience over
 * the same operation.
 *
 * Restores no ability or max-HP damage the wound applied — see the header.
 */
export async function healWound(actor, index)
{
  const wounds = duplicate(actor.system.wounds);
  const wound  = wounds[index];
  if(!wound) return null;

  wounds.splice(index, 1);

  if(wound.itemId)
  {
    const item = actor.items.get(wound.itemId);
    if(item) await item.delete();
  }

  await actor.update({ "system.wounds": wounds });
  // "Deprived until the Wound is cured" - Amaranthine Venom (2026-09-25).
  // Only a wound that switched Deprived on carries the mark, so healing it
  // never clears a Deprived that thirst or hunger set.
  if(wound.clearsDeprived) await setDeprived(actor, false);
  return wound;
}

/**
 * " Clears a, b and c." for a rest card, or "" when a rest moved nothing.
 *
 * A COMMA LIST, not join(" and "). Two lockouts read fine chained with "and";
 * the item pools joining them in 2026-09-20 made three and four a real shape,
 * and "x and y and z" is the sentence nobody writes on purpose.
 */
function clearedTail(cleared)
{
  if(!cleared.length) return "";
  const last = cleared[cleared.length - 1];
  const head = cleared.slice(0, -1);
  return head.length ? ` Clears ${head.join(", ")} and ${last}.` : ` Clears ${last}.`;
}

/**
 * Clear the day-scale state a Long Rest ends - the two actor lockouts and every
 * spent item-level daily pool. Returns what it actually moved, phrase by phrase,
 * for the rest card to name; state that was already clear says nothing rather
 * than reporting a change that did not happen.
 */
export async function clearLongRestMarkers(actor)
{
  const cleared = [];
  const patch = {};

  if(actor.system.hypergeometricLockout)
  {
    patch["system.hypergeometricLockout"] = false;
    cleared.push("the hypergeometric lockout");
  }
  if(actor.system.sporeLockout)
  {
    patch["system.sporeLockout"] = false;
    cleared.push("spore depletion");
  }

  if(cleared.length) await actor.update(patch);

  // AFTER the actor update, and separately from it: the pools live on Items, so
  // they are their own writes and cannot ride along in this patch.
  cleared.push(...await refillDailyPools(actor));

  return cleared;
}

/* -------------------------------------------- */
/*  Messages                                                              */
/* -------------------------------------------- */

function say(actor, content)
{
  ChatMessage.create({
    user: game.user?._id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content
  });
}

/**
 * Refuse a rest for want of supplies, naming what is missing.
 *
 * The book requires "a ration of water or food" for a Short Rest and "a ration
 * of water and a meal" for a Long one, so the two refusals differ in more than
 * wording and the caller passes the list it actually needs.
 */
/**
 * `carried` is the tail of the sentence and defaults to the absolute claim
 * this function used to hardcode.
 *
 * IT STOPPED BEING TRUE ON 2026-09-12, found live by test 129.19. "and none is
 * carried" was correct while every requirement was exactly one ration, so a
 * refusal could only ever mean zero. A Gills character needs TWO waters, and a
 * Gills character holding ONE was told they carried none — a sentence the
 * player can see is false, about the one number they most need to trust.
 *
 * A Short Rest still passes the default and is still right to: it refuses only
 * when BOTH ration types are empty.
 */
function refuseForSupplies(actor, restLabel, missing, carried = "and none is carried")
{
  say(actor, `<b>${restLabel}</b> — no rest is taken. `
           + `It requires ${missing}, ${carried}.`);
  return null;
}

/* -------------------------------------------- */
/*  The two Rests                                                         */
/* -------------------------------------------- */

/**
 * Short Rest: a sit-down and a ration, for d8 + CON bonus HP.
 *
 * `ration` names which of the two to spend, because the book's "water or food"
 * is a choice and water is the scarcer of the two in Vaarn — it is what the
 * deprivation clock runs on. Burning water while food is in the pack would be
 * a decision this file has no business making, so it is the player's.
 */
/** Is this ration a meal for this actor - food, or a food diet? */
export function isMealFor(actor, ration)
{
  if(!ration) return false;
  return rationKindsFor(actor, FOOD_RATION).includes(ration)
      || dietRationsFor(actor).some(d => d.replaces !== "water" && d.item === ration);
}

export async function shortRest(actor, { ration = null, rotting = false } = {})
{
  if(blocksHealing(actor, "a Short Rest")) return null;

  const rule = rationFreeRule(actor);
  if(rule)
  {
    say(actor, `<b>Short Rest</b> — ${actor.name} neither eats nor drinks, and `
             + `regains no HP (<b>${rule}</b>).`);
    return null;
  }

  // Any of the four, and with no choice given, food before water and the
  // plain ration of each first (RATION_GROUPS, 2026-09-23).
  const carried = [...rationKindsFor(actor, FOOD_RATION), ...rationKindsFor(actor, WATER_RATION)].find(k => rationTotal(actor, k) > 0) ?? null;

  // The Metallovore Potion's free meal (2026-09-23) lived here until Scrap
  // Metal replaced it, RULED 2026-09-27 (Matt); its drinker now spends Scrap
  // Metal like any food kind - see rationKindsFor.
  const pick = ration ?? carried;

  if(!pick || rationTotal(actor, pick) <= 0)
    return refuseForSupplies(actor, "Short Rest", "a ration of water or food");

  await spendRation(actor, pick);
  const on = pick.toLowerCase();
  // DETRITIVORE DOUBLES A MEAL, NOT A DRINK (fixed 2026-09-24, Matt): "Heals
  // double HP from Short Rests if the MEAL you eat is rotting". The box is
  // ignored when the ration spent is water; the dialog greys it out as well.
  rotting = rotting && isMealFor(actor, pick);

  // THE DOUBLING IS APPLIED IN CODE, NOT IN THE FORMULA, and that is not a
  // style preference. Rolling `(1d8 + CON) * 2` works arithmetically but
  // Foundry collapses the parenthetical to a NumericTerm before the message is
  // built, so the card's visible formula reads "5 * 2" — the die and the CON
  // bonus both vanish, and the d8 survives only inside the expandable tooltip.
  // Found in testing 2026-09-11 (group 126.9), where the total was correct and
  // the card was unreadable. Rolling d8 + CON plainly keeps the card honest and
  // the flavor says what was done to it.
  const con = actor.system.abilities.con.effective;
  const roll = new Roll(`1d8 + ${con}`);
  await roll.evaluate({ async: true });
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<b>Short Rest</b> — d8 + CON${rotting ? ", doubled by <b>Detritivore</b>" : ""}`
  });

  const healed = rotting ? roll.total * 2 : roll.total;
  const { gained, after, max, note } = await applyHeal(actor, healed);
  say(actor, gained > 0
    ? `takes a <b>Short Rest</b> on ${on} — restores <b>${gained}</b> HP${gmHP(actor, ` (now ${after}/${max})`)}.${note}`
    : note
      ? `takes a <b>Short Rest</b> on ${on} — restores no HP.${note}`
      : `takes a <b>Short Rest</b> on ${on}, but is already at full HP.`);

  // A weapon that can be fed at a rest (Fungal, Weapon Tags chunk 5c).
  offerWeaponFeeding(actor);
  return { gained, after, max, spent: pick };
}

/**
 * Long Rest: water, a meal and a night's sleep somewhere safe.
 *
 * Returns `offerRecovery` so the caller knows to offer the Wound-or-abilities
 * choice. That branch is NOT resolved here: the book makes it a decision, and
 * a decision belongs to whoever clicked, not to the function that noticed it
 * was available.
 *
 * FULLNESS IS MEASURED BEFORE ANY HEALING, which is what the book's "if HP is
 * already full" says and not what "if HP is full afterwards" would say. Every
 * successful Long Rest below full HP ends at full, so the second reading would
 * hand out a free Wound cure with every single rest.
 */
export async function longRest(actor, { onWatch = false, picks = null } = {})
{
  // EVERY DECISION IS rest-plan.js's (the pre-rest preview, RULED 2026-09-24
  // by Matt): the dialog shows that plan and this carries it out, so the two
  // cannot disagree. The rationale behind each rule - diets, doubled draws,
  // Deprived, the Faa's lapse, going without - is in that file's header.
  //
  // NEVER REFUSED FOR RATIONS any more (RULED 2026-09-24, Matt): each person
  // takes their own share, and whoever goes without pays that shortfall's
  // price. The one refusal left is a pick the pack cannot cover, which the
  // dialog already stops; this is the guard for any other caller.
  // LOADED HERE, NOT AT THE TOP: rest-plan.js reads companion-upkeep.js, which
  // reads this file, and a static import closes that loop before this file's
  // constants exist.
  const { planLongRest, FAA_WATER_LAPSE } = await import("./rest-plan.js");
  const plan = planLongRest(actor, picks, { onWatch });
  if(plan.over.length)
    return refuseForSupplies(actor, "Long Rest", plan.over.map(o => `${o.who}'s ${o.text}`).join("; "), "as portioned");

  const c = plan.character;
  const max = actor.system.health.max;

  for(const s of plan.spends)
    for(let n = 0; n < s.count; n++) await spendOne(actor, s.item);

  if(c.rationFree)
  {
    // CLEARED BEFORE THE CARD (2026-09-20): the card names what cleared.
    const cleared = await clearLongRestMarkers(actor);
    say(actor, `<b>Long Rest</b> — ${actor.name} neither eats nor drinks, and `
             + `regains no HP (<b>${c.rationFree}</b>).${clearedTail(cleared)}`);
    offerWeaponFeeding(actor);
    return { gained: 0, after: actor.system.health.value, max, atFullHp: c.atFullHp,
             offerRecovery: c.offerRecovery, cleared, rationFree: true, plan };
  }

  let gained = 0;
  let after  = actor.system.health.value;
  let note   = "";
  let how;

  if(!c.benefit)
    how = `gains nothing from it (${c.noBenefitWhy.join(", ")})`;
  else if(c.healWhy)
    how = c.healWhy.startsWith("ate no") ? c.healWhy : `rests, but regains no HP (<b>${c.healWhy}</b>)`;
  else if(c.heal === "watch")
  {
    // Night Watches. The watcher ate and drank like everyone else — they
    // simply did not sleep.
    const con = actor.system.abilities.con.effective;
    const roll = new Roll(`1d8 + ${con}`);
    await roll.evaluate({ async: true });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: "<b>Long Rest</b> — on watch, so d8 + CON rather than a full night"
    });
    ({ gained, after, note } = await applyHeal(actor, roll.total));
    how = "stood watch, and regains only d8 + CON";
  }
  else if(c.heal === "half")
  {
    // Janus Lenses: HALF of MAX, an amount rather than a target.
    ({ gained, after, note } = await applyHeal(actor, Math.floor(max / 2)));
    how = "sleeps badly, and regains only half their maximum HP";
  }
  else
  {
    ({ gained, after, note } = await applyHeal(actor, max));
    how = note ? "rests, but cannot replenish all lost HP" : "replenishes all lost HP";
  }

  const cleared = c.clears ? await clearLongRestMarkers(actor) : [];
  const tail = clearedTail(cleared);
  // WHAT THEY ATE AND DRANK, said: a portioned rest is the player's choice,
  // and the card is where the table reads what that choice spent.
  const ateList = (c.spends ?? []).map(s => `${s.count} ${s.item}`);
  const ate = ateList.length ? ` <i>(on ${ateList.join(", ")})</i>` : " <i>(nothing eaten or drunk)</i>";

  say(actor, gained > 0
    ? `takes a <b>Long Rest</b> — ${how}, restoring <b>${gained}</b> HP${gmHP(actor, ` (now ${after}/${max})`)}.${note}${ate}${tail}`
    : `takes a <b>Long Rest</b> — ${how}.${note}${ate}${tail}`);

  // AFTER THE REST CARD (Group 222): the night they ate and slept for comes
  // first, and they wake Deprived.
  for(const why of c.deprived)
  {
    await setDeprived(actor, true);
    say(actor, `${why}, and is now <b>Deprived</b>.`);
  }

  // THE FAA NOMAD'S WATER LAPSE (Desert Metabolism). A night without water
  // starts the three-day count if it is not already running; a night they
  // drank ends it - the book's reset, which the rest now knows. Decided in
  // the build 2026-09-24 and told to Matt.
  const running = entriesOf(actor).find(e => e.kind === "lapse" && e.lapseKey === FAA_WATER_LAPSE);
  if(c.faaLapse && !running)
  {
    await startLapse(actor, { key: FAA_WATER_LAPSE });
    say(actor, `goes without water — the <b>Faa Nomad</b>'s three days to Deprived begin.`);
  }
  else if(c.faaDrank && running)
    await stopLapse(actor, running.id);

  // A weapon that can be fed at a rest (Fungal, Weapon Tags chunk 5c).
  offerWeaponFeeding(actor);
  return { gained, after, max, atFullHp: c.atFullHp, offerRecovery: c.offerRecovery, cleared, plan };
}
