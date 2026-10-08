/**
 * Companion Ration Upkeep — foundry-system-index.csv "Companion Ration Upkeep",
 * built 2026-09-19.
 *
 * WHAT THE BOOK STATES (JADE IBIS 15-09-26), and the four cases differ:
 *
 *   FOLLOWERS  "Each Follower requires a ration of food and water each
 *               adventuring day. Followers not fed for three days in a row
 *               desert at the first opportunity."
 *   MERCENARIES the same ration and the same three days.
 *   PETS       "A pet requires a ration of food and water each adventuring
 *               day. Pets who are not fed for seven days in a row abandon
 *               their owner at the first opportunity."
 *   STEEDS     "The Steed must consume one ration per day, although what this
 *               consists of is dependent upon the Steed. Steeds who are not
 *               fed for seven days run away at the first chance they get."
 *
 * THE RULINGS THIS FILE CARRIES (Matt; the reasoning is on the row):
 *   - THE CHARACTER'S OWN LONG REST CASCADES (2026-09-13). The companions eat
 *     from that character's pack and rest alongside them; there is no rest
 *     control on the companion.
 *   - ONLY A LONG REST (2026-09-19) feeds, heals and moves the unfed count.
 *   - SCARCITY PROMPTS THE PLAYER TO ALLOCATE (2026-09-13). No fixed order -
 *     an order would be ours and not the book's.
 *   - PETS FOLLOW JADE (2026-09-19): food and water, seven days.
 *   - A STEED EATS ONE FOOD RATION (2026-09-19); what a particular steed eats
 *     is Diet-Matched Ration Consumption's.
 *   - THE GLUE WORM EATS RAW MEAT (2026-09-23), "must be fed raw meat": its
 *     roster's `dietRation`, carried as flags.vaarn.dietRation, takes the
 *     place of its Food Ration. It still needs its Water Ration.
 *   - PET ROCK AND CRYSTEED ARE TOTAL EXCEPTIONS (2026-09-13, 2026-09-19):
 *     never fed, never rested, never unfed. The roster's `rationFree` names
 *     the rule, carried as flags.vaarn.rationFree.
 *   - AT THE FUSE (2026-09-19) the owner's chat is warned and the owner is
 *     cleared, so the creature leaves that character's companion list.
 *
 * DECIDED IN THE BUILD, NOT RULED - told to Matt the same day, so each can be
 * overturned without archaeology:
 *   - Upkeep runs only after the character's Long Rest SUCCEEDS. A refused
 *     rest is a night that did not happen, so no day passes for anyone.
 *   - A companion is fed WHOLE or not at all: a pet given food but no water
 *     has not received "a ration of food and water".
 *   - A fed companion heals as a Long Rest heals - to full - unless its own
 *     no-heal rule forbids it. An unfed one does not heal: the ration is the
 *     precondition of the rest, as rest.js makes it for a character.
 *   - A companion whose kind is not set is skipped and named, with no count
 *     moved: its fuse is unknown, and guessing one is the wrong failure.
 *   - Closing the allocation dialog feeds nobody, and says so on the card.
 */

import { companionsOf, companionKindOf, clearOwner, COMPANION_KINDS } from "./companion.js";
import { FOOD_RATION, WATER_RATION, applyHeal } from "./rest.js";
import { noHealRule } from "./deprived.js";
// A creature's own flags from its actor-level sentences (Effect Engine: Creatures chunk 2d).
import { creatureActorFlagsOf } from "../item/creature-effects.js";

/** Per kind: what one day costs, how many unfed days in a row it takes, and
 *  the book's own verb for leaving. */
export const UPKEEP =
{
  pet:       { needs: [FOOD_RATION, WATER_RATION], fuse: 7, leaves: "abandons its owner" },
  follower:  { needs: [FOOD_RATION, WATER_RATION], fuse: 3, leaves: "deserts" },
  mercenary: { needs: [FOOD_RATION, WATER_RATION], fuse: 3, leaves: "deserts" },
  steed:     { needs: [FOOD_RATION],               fuse: 7, leaves: "runs away" }
};

const UNFED_FLAG = "unfedDays";

/** The rule that says this creature neither eats nor drinks, or null. */
export function companionRationFree(actor)
{
  const rule = creatureActorFlagsOf(actor).rationFree;
  return (typeof rule === "string" && rule.trim()) ? rule.trim() : null;
}

/**
 * The Item this companion eats in place of a Food Ration, or null.
 *
 * Diet-Matched Ration Consumption, 2026-09-23 (Matt): the Glue Worm "must be
 * fed raw meat". The diet REPLACES the food half of the day's ration, as it
 * replaces a Carnivore's meal in rest.js; the water half is untouched.
 */
export function companionDiet(actor)
{
  const item = creatureActorFlagsOf(actor).dietRation;
  return (typeof item === "string" && item.trim()) ? item.trim() : null;
}

/** Consecutive Long Rests this companion has gone unfed. */
export function unfedDaysOf(actor)
{
  return Number(actor?.getFlag?.("vaarn", UNFED_FLAG) ?? 0) || 0;
}

/** Who needs feeding, and who is outside the rule and why. Reads only. */
export function upkeepPlan(character)
{
  const plan = { eaters: [], exempt: [], unknown: [] };
  for(const c of companionsOf(character))
  {
    const free = companionRationFree(c);
    if(free) { plan.exempt.push({ actor: c, rule: free }); continue; }
    const kind = companionKindOf(c);
    if(!kind) { plan.unknown.push({ actor: c }); continue; }
    const diet  = companionDiet(c);
    const needs = diet ? UPKEEP[kind].needs.map(n => n === FOOD_RATION ? diet : n) : UPKEEP[kind].needs;
    plan.eaters.push({ actor: c, kind, ...UPKEEP[kind], needs });
  }
  return plan;
}

const nameOf = n => n === FOOD_RATION ? "food" : n === WATER_RATION ? "water" : n;
const needText = needs => needs.map(nameOf).join(" and ");


/**
 * Run the day's upkeep for a character who has just taken a Long Rest.
 * Posts one card. Returns the outcome for a caller or a test.
 */
export async function companionUpkeep(character, restPlan = null)
{
  const plan = upkeepPlan(character);
  if(!plan.eaters.length && !plan.exempt.length && !plan.unknown.length) return null;

  // THE PORTIONING IS THE LONG REST DIALOG'S NOW (RULED 2026-09-24, Matt):
  // who eats was chosen there, and longRest already spent every ration by the
  // one plan (rest-plan.js, strict needs first). So nothing is asked or spent
  // here - this applies the outcome and posts the card. The allocation dialog
  // that used to open when the pack ran short is superseded by that dialog.
  const fedSet = new Set((restPlan?.companions ?? []).filter(e => e.fed).map(e => e.actor.id));
  const fed = plan.eaters.filter(e => fedSet.has(e.actor.id));
  const allocated = fed.length < plan.eaters.length;

  const lines = [];
  const left = [];
  for(const e of plan.eaters)
  {
    const c = e.actor;
    if(fedSet.has(c.id))
    {
      if(unfedDaysOf(c)) await c.unsetFlag("vaarn", UNFED_FLAG);
      // Spore depletion (the Mycomastiff, RULED 2026-09-24, Matt): "no more
      // spores can be expelled without a Long Rest". A fed companion has had
      // its Long Rest, so the lockout ends here - named only when it was set.
      let spores = "";
      if(c.system.sporeLockout)
      {
        await c.update({ "system.sporeLockout": false });
        spores = " Its spores return.";
      }
      const rule = noHealRule(c);
      if(rule)
      {
        lines.push(`<li><b>${c.name}</b> eats (${needText(e.needs)}) but regains no HP (<b>${rule}</b>).${spores}</li>`);
        continue;
      }
      const { gained, after, max, note } = await applyHeal(c, c.system.health.max);
      lines.push(`<li><b>${c.name}</b> eats (${needText(e.needs)})`
        + (gained > 0 ? ` and rests, restoring <b>${gained}</b> HP (now ${after}/${max}).` : ` and rests.`) + note + spores + `</li>`);
      continue;
    }

    const days = unfedDaysOf(c) + 1;
    if(days >= e.fuse)
    {
      await c.unsetFlag("vaarn", UNFED_FLAG);
      await clearOwner(c);
      left.push(c.name);
      lines.push(`<li style="color:#8c4a4a"><b>${c.name}</b> has gone unfed for ${days} days in a row and `
        + `${e.leaves} at the first opportunity. It no longer belongs to ${character.name}.</li>`);
    }
    else
    {
      await c.setFlag("vaarn", UNFED_FLAG, days);
      lines.push(`<li><b>${c.name}</b> goes unfed and does not heal - ${days} of ${e.fuse} days `
        + `before it ${e.leaves}.</li>`);
    }
  }
  for(const x of plan.exempt)
    lines.push(`<li><b>${x.actor.name}</b> neither eats nor rests (<b>${x.rule}</b>).</li>`);
  for(const x of plan.unknown)
    lines.push(`<li><b>${x.actor.name}</b> is skipped - its kind is not set, so its rations are unknown. `
      + `Set it in the Belongs To dialog on its sheet.</li>`);

  const head = allocated && !fed.length
    ? `<p>No companion was given a share of the rations.</p>` : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: character }),
    content: `<div class="vaarn-chat-card"><h3>${character.name}'s companions</h3>${head}<ul>${lines.join("")}</ul></div>`
  });

  return { fed: fed.map(e => e.actor.name), left, exempt: plan.exempt.map(x => x.actor.name),
           unknown: plan.unknown.map(x => x.actor.name) };
}
