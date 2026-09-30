/**
 * Harvesting a dead creature for alchemy — foundry-system-index.csv
 * "Component Harvesting", built 2026-09-19.
 *
 * WHAT THE BOOK STATES (JADE IBIS, Alchemy, "Components and Essences"):
 * "Only one component can be harvested from a creature. Components take up
 * one item slot and do not stack." Essences: "One may extract doses of
 * essence equal to the creature's Level. Up to ten of the same essence can
 * stack in one item slot." The type follows the creature type, and "If a
 * creature has two or more listed types, the PCs may choose which essence
 * type is extracted. The other potential dose is lost in the process."
 *
 * THERE IS NO SAVE. Sable Gecko had an INT save vs 10 + Level that spoiled
 * the Component on a failure; Crimson Hound removed it and Jade Ibis agrees.
 *
 * RULED 2026-09-19 (Matt), everything the book leaves open:
 *  - A Component is named "<creature> Component". The book names no part per
 *    creature; specific named components from the sample Elixirs may become
 *    exceptions later.
 *  - An Essence is one stacking Item per type, "<Essence> (Essence)", at a
 *    tenth of a slot per dose — the Units per Slot convention (item-slots.js).
 *  - Each is taken ONCE per body. The book says so for Components; for
 *    Essences it is Matt's ruling, the same guard butchery.js uses.
 *  - A multi-type creature puts ALL its doses into the one chosen type.
 *  - Access and destination are butchery's: a control on the corpse, the
 *    yield into the Dropped Items container.
 *  - Level 0 yields no Essence, by the book's own arithmetic, but still has a
 *    body part to take.
 */

import { findContainer, ensureContainer } from "./dropped-container.js";

export const HARVEST_SCOPE = "vaarn";
export const COMPONENT_FLAG = "componentHarvested";
export const ESSENCE_FLAG = "essenceExtracted";

/** "Up to ten of the same essence can stack in one item slot." */
export const TENTH_OF_A_SLOT = 0.1;

/** Creature type key -> Essence name, in the book's table order. */
export const ESSENCE_BY_TYPE = {
  biological:     "Blood",
  synthetic:      "Blue Ikor",
  fungal:         "Mycelium",
  psychic:        "Psychespinal Fluid",
  hypergeometric: "Manifold Marrow",
  mineral:        "Living Dust",
  outsider:       "Paradox Bile"
};

/** The Item name an Essence stacks under. */
export function essenceItemName(essence)
{
  return `${essence} (Essence)`;
}

/** The Item name of this body's Component. */
export function componentName(actor)
{
  return `${actor.name} Component`;
}

/** Essences this body could give — one per creature type it has. */
export function essenceChoices(actor)
{
  const types = actor?.system?.creatureTypes ?? {};
  return Object.entries(ESSENCE_BY_TYPE)
    .filter(([t]) => types[t])
    .map(([, essence]) => essence);
}

/** Doses of Essence this body yields — "equal to the creature's Level". */
export function essenceYield(actor)
{
  const level = Number(actor?.system?.level?.value ?? 0);
  return level > 0 ? level : 0;
}

/**
 * The reason shared by both halves, or null. A REASON rather than a boolean
 * for butchery.js's reason: the sheet shows it and the player can disagree.
 */
function corpseRefusal(actor)
{
  if(!actor) return "there is no creature here";
  if(actor.type === "container") return "a container is not a creature";
  if(Number(actor.system?.health?.value ?? 0) > 0)
    return `${actor.name} is not dead`;
  return null;
}

/** Why no Component can be taken from this body, or null when one can. */
export function componentRefusal(actor)
{
  const base = corpseRefusal(actor);
  if(base) return base;
  if(actor.getFlag?.(HARVEST_SCOPE, COMPONENT_FLAG) === true)
    return `${actor.name}'s Component has already been harvested`;
  return null;
}

/** Why no Essence can be extracted from this body, or null when it can. */
export function essenceRefusal(actor)
{
  const base = corpseRefusal(actor);
  if(base) return base;
  if(actor.getFlag?.(HARVEST_SCOPE, ESSENCE_FLAG) === true)
    return `${actor.name}'s Essence has already been extracted`;
  if(essenceChoices(actor).length === 0)
    return `${actor.name} has no creature type to give an Essence`;
  if(essenceYield(actor) <= 0)
    return `${actor.name} is Level 0 and yields no Essence`;
  return null;
}

/**
 * Take the Component and put it on the ground. Returns what happened, or
 * null if refused. The flag is set BEFORE the Item is created, as in
 * butchery.js: a crash between the two should leave a body with nothing to
 * give, not one that can be harvested twice.
 */
export async function harvestComponent(actor)
{
  if(componentRefusal(actor)) return null;

  const container = findContainer() ?? await ensureContainer();
  if(!container) return null;

  await actor.setFlag(HARVEST_SCOPE, COMPONENT_FLAG, true);

  // Never merged: "Components take up one item slot and do not stack."
  const name = componentName(actor);
  await container.createEmbeddedDocuments("Item", [{
    name,
    type: "item",
    system: { slots: 1, quantity: 1 }
  }]);

  return { name, container };
}

/**
 * Extract every dose into the chosen Essence and put it on the ground,
 * merged into a stack of the same Essence already there.
 */
export async function extractEssence(actor, essence)
{
  if(essenceRefusal(actor)) return null;
  if(!essenceChoices(actor).includes(essence)) return null;

  const container = findContainer() ?? await ensureContainer();
  if(!container) return null;

  await actor.setFlag(HARVEST_SCOPE, ESSENCE_FLAG, true);

  const doses = essenceYield(actor);
  const name = essenceItemName(essence);
  const existing = container.items.find(i => i.name === name);
  if(existing)
    await existing.update({ "system.quantity": Number(existing.system.quantity ?? 0) + doses });
  else
    await container.createEmbeddedDocuments("Item", [{
      name,
      type: "item",
      system: { slots: TENTH_OF_A_SLOT, quantity: doses }
    }]);

  return { essence, doses, name, container };
}
