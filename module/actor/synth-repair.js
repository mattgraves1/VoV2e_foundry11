/**
 * Synth Part Repair — foundry-system-index.csv "Synth Part Repair".
 *
 * WHAT THE BOOK STATES, as the third of the Synth ancestry's special rules
 * (CRIMSON HOUND 07-05-26 p.12, checked against the PDF text rather than only
 * the vault):
 *
 *   "Repairs - You cannot regain HP by consuming rations. You must make
 *    repairs using Synth Parts. You begin play with 3 spare Synth Parts, which
 *    stack in one item slot. A repair takes an hour and uses up one synth part.
 *    Repairs heal d8 + CON HP. If HP is full, heal one Wound. To extract parts
 *    from dead synthetic creatures, make an INT save. On a success, extract
 *    usable synth parts equal to their Level. On failure, extract one usable
 *    part."
 *
 * THREE OF THOSE FIVE SENTENCES WERE ALREADY BUILT ELSEWHERE, and this file is
 * only the fourth: the ration refusal is RATION_FREE in rest.js, and the three
 * starting parts stacking in one slot come out of chargen-app.js. This file is
 * the healing.
 *
 * THE FIFTH IS NOT BUILT AND IS NOT THIS ROW. Extracting parts from a dead
 * synthetic is an INT save with a Level-scaled payout, and it had no atom row
 * at all until 2026-09-12 — the same shape as the weapon tag whose second
 * clause went missing because only the first had a row. RULED 2026-09-12
 * (Matt): file it, build it separately. It is an atom row of its own pointed at
 * Component Harvesting. The rule TEXT on the ancestry Item carries the whole
 * sentence regardless, so a player can read what the code does not do.
 *
 * WHY THIS IS NOT IN rest.js. A repair is not a Rest and is refused by none of
 * the things that refuse Rests — it spends no ration, needs no safe place and
 * no night. It borrows rest.js's healing helpers because those encode the
 * book's floor clause, not because it is a kind of rest.
 *
 * THE HOUR IS NOT ON THE CLOCK, and that is a decision rather than an
 * oversight. RULED 2026-09-12 (Matt): build the healing instant now, file the
 * clock version separately — and file it to cover Photosynthesis too, which is
 * the same shape ("You regain d8 + CON HP for every hour you spend rooted")
 * and was likewise built instant. The two either both run on the activity
 * clock or neither does; deciding it for one of them in passing is how they
 * drift. See the Hour-Long Healing on the Activity Clock row.
 *
 * DEPRIVED BLOCKS THE HP BRANCH AND NOT THE WOUND BRANCH. "A Deprived
 * character cannot heal lost HP or otherwise benefit from Rests" — a repair is
 * not a Rest, so only the first clause reaches it, and at full HP there is no
 * lost HP for it to refuse. That is the same reading rest.js already applies to
 * a Lithling's full-HP branch: nothing in the prohibition touches Wounds, so
 * refusing them would be inventing a restriction.
 */

import { applyHeal, healWound, stacksOf, countOf, spendOne } from "./rest.js";
import { blocksHealing } from "./deprived.js";
import { gmHP } from "./hidden-hp.js";
import { restProofReason } from "./named-wound.js";

/**
 * The Item name chargen-app.js creates and this file spends. A constant for
 * the same reason FOOD_RATION is one — the string IS the link between the two
 * files, and a typo in either is silent.
 */
export const SYNTH_PARTS = "Synth Parts";

/** How many Synth Parts the actor carries, across every stack. */
export function synthPartTotal(actor)
{
  return countOf(actor, SYNTH_PARTS);
}

/** Every stack of Synth Parts the actor carries. */
export function synthPartStacks(actor)
{
  return stacksOf(actor, SYNTH_PARTS);
}

function say(actor, content)
{
  ChatMessage.create({
    user: game.user?._id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content
  });
}

/**
 * Begin a repair.
 *
 * Returns one of three things, and the caller only has work to do for the
 * third:
 *
 *   null                      - refused, and the reason is already in chat
 *   { branch: "hp", ... }     - done; HP was restored
 *   { branch: "wound", wounds } - the caller must ask WHICH Wound, then call
 *                                 repairWound()
 *
 * THE WOUND BRANCH DOES NOT SPEND THE PART HERE. The book makes the Wound a
 * single choice out of however many the character is carrying, and a choice
 * belongs to whoever clicked. Spending the part before the pick would charge
 * for a dialog the player can still cancel. This is the same handshake
 * longRest uses for `offerRecovery`, for the same reason.
 */
export async function repair(actor)
{
  if(synthPartTotal(actor) <= 0)
  {
    say(actor, `<b>Repairs</b> — no repair is made. It uses one <b>Synth Part</b>, and none is carried.`);
    return null;
  }

  const max    = actor.system.health.max;
  const before = actor.system.health.value;

  if(before < max)
  {
    // GATED BEFORE THE ROLL AND BEFORE THE SPEND, the same order Photosynthesis
    // uses: rolling d8 + CON and then refusing the HP shows the player a number
    // they did not get, which reads as a bug rather than as a rule. Refusing
    // first also means a Deprived Synth is not charged a part for nothing.
    if(blocksHealing(actor, "a repair")) return null;

    await spendOne(actor, SYNTH_PARTS);

    const con  = actor.system.abilities.con.effective;
    const roll = new Roll(`1d8 + ${con}`);
    await roll.evaluate({ async: true });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: "<b>Repairs</b> — an hour's work and one Synth Part, for d8 + CON"
    });

    // applyHeal carries the "as though starting from 0" floor, so a Synth at
    // -3 gets the whole roll rather than three points of it eaten by the debt.
    // `gained` and not `roll.total` is what gets reported, for that reason.
    const { gained, after, note } = await applyHeal(actor, roll.total);
    say(actor, gained > 0
      ? `makes <b>repairs</b> — restores <b>${gained}</b> HP${gmHP(actor, ` (now ${after}/${max})`)}, and one Synth Part is used up.${note}`
      : note
        ? `makes <b>repairs</b> — restores no HP, and one Synth Part is used up.${note}`
        : `makes <b>repairs</b>, but is already at full HP.`);

    return { branch: "hp", gained, after, max, partsLeft: synthPartTotal(actor) };
  }

  const wounds = actor.system.wounds ?? [];

  // REFUSED RATHER THAN SPENT. RULED 2026-09-12 (Matt): at full HP with no
  // Wound to heal there is nothing for the part to buy, and a consumable
  // silently spent for no effect reads as a bug. The book makes a repair heal
  // one or the other; it does not describe a repair that does neither.
  if(!wounds.length)
  {
    say(actor, `<b>Repairs</b> — no repair is made. ${actor.name} is already at full HP `
             + `and carries no Wounds, so the Synth Part is not spent.`);
    return null;
  }

  return { branch: "wound", wounds };
}

/**
 * Finish the full-HP branch: spend the part and heal the chosen Wound.
 *
 * Separate from repair() because the pick happens in a dialog between the two,
 * and the part is spent HERE so that cancelling costs nothing.
 */
export async function repairWound(actor, index)
{
  if(synthPartTotal(actor) <= 0) return null;

  // A REST-PROOF WOUND IS REPAIR-PROOF TOO (RULED 2026-09-25, Matt): Repairs
  // are the Synth's rest, so Grimpet, Gitch Crystals and Amaranthine Venom
  // refuse here as they do in the Long Rest picker - and no part is spent.
  const wound = (actor.system.wounds ?? [])[index];
  const proof = restProofReason(wound);
  if(proof)
  {
    ui.notifications.warn(`Repairs will not heal ${wound.name} — ${proof}. Choose something else.`);
    return { refused: true };
  }

  const healed = await healWound(actor, index);
  if(!healed) return null;

  await spendOne(actor, SYNTH_PARTS);

  say(actor, `makes <b>repairs</b> at full HP — recovers from <b>${healed.name}</b>, `
           + `and one Synth Part is used up.`);

  return { branch: "wound", healed, partsLeft: synthPartTotal(actor) };
}
