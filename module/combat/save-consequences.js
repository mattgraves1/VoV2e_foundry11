/**
 * Failed-Save Consequence — foundry-system-index.csv.
 *
 * Something a character is carrying fires when one of their OWN saves fails,
 * whatever that save was for. Goldencough is the first and so far only case:
 * "Whenever they fail a CON save, they are overcome by a coughing fit, taking
 * d4 damage and expelling clouds of infectious golden thread into the air."
 *
 * ── WHY THIS IS NOT Compel-a-Target Save, WHICH IS WHERE IT WAS FILED ──────
 *
 * That mechanism's own description is "a chat card telling the target which
 * Save to make". This does not tell anybody to save — it READS the result of a
 * save that happened for some entirely unrelated reason and attaches a
 * consequence to it. The save is not the affliction's; the failure is.
 *
 * ── WHY IT IS A SEPARATE MODULE AND NOT PART OF saves.js ──────────────────
 *
 * saves.js is pure: three clauses, no actor, no side effects, and every one of
 * its six callers can be tested by handing it three numbers. Giving it an
 * actor and letting it write HP would make the rule and the consequence the
 * same function, and the rule is the thing this project has just spent a build
 * getting into ONE place. So resolveSave says whether the save failed and this
 * says what that costs.
 *
 * ── THE THREE CALL SITES, AND WHY IT IS NOT ONE ───────────────────────────
 *
 * MEASURED 2026-09-13. A PC's CON save is rolled in three places and there is
 * no choke point:
 *
 *   1. the ability button on the sheet — the ordinary save, and also the one a
 *      player rolls when the Exploration Clock compels an Exhaustion save,
 *      since that card is descriptive and sends them to their own sheet
 *   2. _onToxSave, which calls _onAbility_Clicked directly and so never passes
 *      through the button's click handler
 *   3. the affliction card's own contraction save
 *
 * SINCE 2026-09-16 site 3 and two more — the compelled-save card and the
 * recurrence card's daily save — roll through combat/card-save.js, which
 * calls this once for all of them. Sites 1 and 2 are unchanged.
 *
 * Each calls this; this decides. That is the same shape the save consolidation
 * settled on — one implementation, several callers — rather than three copies
 * of the Goldencough test.
 *
 * IT FIRES ON THE CONTRACTION SAVE TOO, and that is correct rather than an
 * oversight: a character with Goldencough who fails a CON save resisting some
 * OTHER infection coughs, because the book says "whenever they fail a CON
 * save" and means it. No recursion is possible — the consequence deals damage
 * and damage compels no save.
 */

import { AFFLICTIONS } from "../actor/affliction-data.js";
import { entriesOf } from "../time/effect-board.js";

/**
 * Every failed-save consequence this actor is currently carrying that watches
 * the given ability.
 *
 * Read from the BOARD rather than from Items, for the reason affliction.js
 * gives about NPCs: an NPC carries a board entry and no Item, and there is no
 * reason a creature with Goldencough should be exempt from its own cough.
 */
export function consequencesFor(actor, ability)
{
  const keys = new Set(entriesOf(actor).filter(e => e.kind === "affliction").map(e => e.afflictionKey));
  return AFFLICTIONS
    .filter(a => keys.has(a.key) && a.onFailedSave?.ability === ability)
    .map(a => ({ entry: a, spec: a.onFailedSave }));
}

/**
 * Fire whatever a failed save costs this actor. A no-op for every actor that
 * is carrying nothing, which is almost all of them — so callers can call it
 * unconditionally rather than testing first.
 *
 * `verdict` is resolveSave's return. Taking the verdict rather than a boolean
 * means a caller cannot accidentally invert it, and it leaves room for a
 * consequence that some day cares WHY the save failed: a natural 1 is a
 * different kind of failure from missing the target by one, and `reason`
 * already carries that distinction.
 */
export async function onSaveResolved(actor, ability, verdict)
{
  if(!actor || !verdict || verdict.passed) return [];
  const fired = [];
  for(const { entry, spec } of consequencesFor(actor, ability))
  {
    let amount = 0;
    if(spec.damage)
    {
      const roll = new Roll(spec.damage);
      await roll.evaluate({ async: true });
      amount = roll.total;
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `<b>${entry.name}</b> — ${spec.label ?? "a failed save takes its toll"}`,
      });
      const hp = Number(actor.system?.health?.value ?? 0);
      // Through the HP funnel (2026-09-26, Matt), so temporary HP soaks it and a
      // character taken below 0 meets the Wounds table like any other damage.
      // It used to write HP directly and skip both.
      if(actor.sheet?._resolveHPChange) actor.sheet._resolveHPChange(actor, hp, hp - amount);
      else await actor.update({ "system.health.value": hp - amount });
    }
    if(spec.text)
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><b>${actor.name}</b> ${spec.text}</p>`,
      });
    fired.push({ key: entry.key, amount });
  }
  return fired;
}
