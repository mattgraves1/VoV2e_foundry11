/**
 * Extracting Synth Parts from a dead synthetic creature —
 * foundry-system-index.csv "Synth Part Extraction", built 2026-09-19.
 *
 * WHAT THE BOOK STATES (JADE IBIS, Synth / Repairs): "To extract parts from
 * dead synthetic creatures, make an INT Save. On a success, extract synth
 * parts equal to the creature's Level. On failure, extract one synth part."
 *
 * The target is the book's general one — Saving Throws: "If the total exceeds
 * 15, the character succeeds" — so this rolls through rollCardSave at its
 * default SAVE_TARGET, and natural 1/20, Jinxed and failed-save consequences
 * behave as on every other save.
 *
 * RULED 2026-09-19 (Matt):
 *  - vs 15, the general save rule.
 *  - The roller is picked in a dialog from the characters the user owns (the
 *    GM sees all), defaulting to their assigned character.
 *  - Any character may extract, not only a Synth.
 *  - The parts are the same "Synth Parts" Item chargen and caches make, a
 *    third of a slot each, so Synth Part Repair counts them; they go to the
 *    Dropped Items container, merged into a stack already there.
 *  - Once per body, like butchery and harvesting.
 *  - Level 0 is read literally: a success gives 0 parts, a failure 1.
 */

import { findContainer, ensureContainer } from "./dropped-container.js";
import { STACKABLES } from "../item/loot-builders.js";
import { rollCardSave } from "../combat/card-save.js";

export const EXTRACTION_SCOPE = "vaarn";
export const EXTRACTED_FLAG = "synthPartsExtracted";

/** Parts on each outcome — "equal to the creature's Level", or one. */
export function partsYield(actor, success)
{
  if(!success) return 1;
  const level = Number(actor?.system?.level?.value ?? 0);
  return level > 0 ? level : 0;
}

/** Why this body cannot be extracted from, or null when it can. */
export function extractionRefusal(actor)
{
  if(!actor) return "there is no creature here";
  if(actor.type === "container") return "a container is not a creature";
  if(!actor.system?.creatureTypes?.synthetic)
    return `${actor.name} is not a Synthetic creature`;
  if(Number(actor.system?.health?.value ?? 0) > 0)
    return `${actor.name} is not dead`;
  if(actor.getFlag?.(EXTRACTION_SCOPE, EXTRACTED_FLAG) === true)
    return `${actor.name}'s Synth Parts have already been extracted`;
  return null;
}

/** Characters this user may roll for: every one for the GM, owned ones otherwise. */
export function eligibleExtractors(user = game.user)
{
  return game.actors.filter(a => a.type === "character"
    && (user.isGM || a.testUserPermission(user, "OWNER")));
}

/**
 * Roll the extractor's INT save and put the parts on the ground. Returns what
 * happened, or null if refused. The flag is set BEFORE the roll, as in
 * butchery.js: a crash part-way should leave a body with nothing more to
 * give, not one that can be rolled for again.
 */
export async function extractSynthParts(corpse, extractor)
{
  if(extractionRefusal(corpse) || !extractor) return null;

  const container = findContainer() ?? await ensureContainer();
  if(!container) return null;

  await corpse.setFlag(EXTRACTION_SCOPE, EXTRACTED_FLAG, true);

  const { verdict } = await rollCardSave(extractor, {
    ability: "int",
    label: `Extract Synth Parts from ${corpse.name}`
  });
  const success = !!verdict?.passed;
  const parts = partsYield(corpse, success);

  if(parts > 0)
  {
    const s = STACKABLES.synth;
    const existing = container.items.find(i => i.name === s.name);
    if(existing)
      await existing.update({ "system.quantity": Number(existing.system.quantity ?? 0) + parts });
    else
      await container.createEmbeddedDocuments("Item", [{
        name: s.name, type: "item", system: { ...s.system, quantity: parts }
      }]);
  }

  return { success, parts, container };
}
