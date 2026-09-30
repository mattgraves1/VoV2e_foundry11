/**
 * Elixir recipes inscribed on a crucible — foundry-system-index.csv
 * "Crucible Recipe Inscription", built 2026-09-19.
 *
 * NOT IN THE BOOK. Vaarn never says a crucible records anything; brewing needs
 * "one component, directly related to the Elixir's intended effect, and
 * essences equal to its potency", all of different types, with POT and effect
 * set by the Referee. The problem this solves is the table's: chargen hands a
 * character a crucible and an Elixir, and the only record of what brews that
 * Elixir was on the Elixir, gone once it is drunk.
 *
 * RULED 2026-09-19 (Matt):
 *  - A RECORD ONLY. Nothing reads the list to allow or refuse a brew; Elixir
 *    Brewing is its own row and was ruled not to gate on it.
 *  - Stored as a flag, so no template change and no relaunch; a crucible made
 *    before this simply has an empty list.
 *  - Chargen's crucible arrives with its paired Elixir inscribed.
 *  - Recipes are added on the crucible sheet, typed in or by dropping an
 *    Elixir item on it: a sample-table Elixir copies in whole, anything else
 *    arrives with its name for the owner to complete.
 *  - Whoever owns the crucible edits it, as with any item.
 *  - Each recipe shows its essence cost, which the book's rule derives.
 */

import { ELIXIRS } from "../actor/chargen-data.js";

export const RECIPES_SCOPE = "vaarn";
export const RECIPES_FLAG = "recipes";

/** A recipe's fields, in display order. */
export function blankRecipe(name = "")
{
  return { name, component: "", potency: null, effect: "" };
}

/** The recipe for a sample-table Elixir, or null if the name is not on it. */
export function sampleRecipe(name)
{
  const e = ELIXIRS.find(x => x.name === String(name ?? "").trim());
  return e ? { name: e.name, component: e.component ?? "", potency: e.potency ?? null, effect: e.effect ?? "" } : null;
}

/** What dropping this Item inscribes: the sample recipe, or its name alone. */
export function recipeFromItem(item)
{
  return sampleRecipe(item?.name) ?? blankRecipe(item?.name ?? "");
}

/**
 * "Essences equal to its potency ... of different types." Blank until the
 * POT is known, since the Referee sets it.
 */
export function essenceNote(potency)
{
  const n = Number(potency);
  if(!Number.isInteger(n) || n < 1) return "";
  return n === 1 ? "Needs 1 Essence" : `Needs ${n} Essences, each of a different type`;
}

/** The crucible's recipes, always an array. */
export function recipesOf(item)
{
  const r = item?.getFlag?.(RECIPES_SCOPE, RECIPES_FLAG);
  return Array.isArray(r) ? r : [];
}

/** The same list with each entry's essence note, for the sheet. */
export function recipesForDisplay(item)
{
  return recipesOf(item).map((r, index) => ({ ...r, index, essenceNote: essenceNote(r.potency) }));
}

async function write(item, list)
{
  return item.setFlag(RECIPES_SCOPE, RECIPES_FLAG, list);
}

/**
 * Inscribe a recipe. Refuses a second copy of a named recipe already there,
 * so dropping the same Elixir twice does not list it twice. Returns true if
 * it was added.
 */
export async function addRecipe(item, recipe)
{
  const list = recipesOf(item);
  const name = String(recipe?.name ?? "").trim();
  if(name && list.some(r => r.name === name)) return false;
  await write(item, [...list, { ...blankRecipe(), ...recipe, name }]);
  return true;
}

/** Change one field of one recipe. POT is stored as a number or null. */
export async function updateRecipe(item, index, field, value)
{
  const list = recipesOf(item).map(r => ({ ...r }));
  if(!list[index] || !(field in blankRecipe())) return;
  if(field === "potency")
  {
    const n = Math.floor(Number(value));
    list[index].potency = Number.isFinite(n) && n > 0 ? n : null;
  }
  else list[index][field] = String(value ?? "");
  await write(item, list);
}

/** Strike one recipe out. */
export async function removeRecipe(item, index)
{
  const list = recipesOf(item).filter((_, i) => i !== index);
  await write(item, list);
}
