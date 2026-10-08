/**
 * The implant, Exotica and figment translators - Effect Engine: Implants,
 * Exotica and Figments, chunk 1 (foundry-system-index.csv "Effect Engine:
 * Implants, Exotica and Figments", BUILD PLAN RULED 2026-10-06 by Matt).
 *
 * An implant's sentences come from its name (implant-effects-data.js), a
 * figment's from its name (figment-effects-data.js), and an Exotica's from its
 * name (exotica-effects-data.js) - whether the Item is an `exotica`, or an
 * armour or weapon made from one (flags.vaarn.exotica). The lookup key is the
 * Item's name, as every roster lookup's is (display-name.js). Each translated
 * sentence carries `tag`, the roster entry it came from, as a mutation's do.
 *
 * REGISTERED in chunk 2 (2026-10-06), in the same change that moved the
 * readers off the old tables (AV, ability bonuses, immunities, rations, damage
 * bonuses, encounters, the Gift block) - registering earlier would have
 * counted them twice. An Exotica WEAPON is not read here yet: its hit effects
 * join the weapon translator in chunk 3b, so they never run twice.
 *
 * Pure: no Foundry global.
 */

import { IMPLANT_EFFECTS } from "../actor/implant-effects-data.js";
import { EXOTICA_EFFECTS } from "../actor/exotica-effects-data.js";
import { FIGMENT_EFFECTS } from "../actor/figment-effects-data.js";
import { registerTranslator } from "../effects/interpret.js";

const tagged = (list, tag) => (list ?? []).map(s => ({ ...s, tag }));

/** An implant Item's sentences, by its name. */
export function implantSentencesOf(item)
{
  return tagged(IMPLANT_EFFECTS[item?.name]?.effects, item?.name);
}

/** A figment Item's sentences, by its name. */
export function figmentSentencesOf(item)
{
  return tagged(FIGMENT_EFFECTS[item?.name]?.effects, item?.name);
}

/** Is this Item an Exotica - its own type, or an armour or weapon made from one? */
export function isExoticaItem(item)
{
  return item?.type === "exotica" || item?.flags?.vaarn?.exotica === true;
}

/** An Exotica's sentences, by its name; none for an Item that is not one. */
export function exoticaSentencesOf(item)
{
  if (!isExoticaItem(item)) return [];
  return tagged(EXOTICA_EFFECTS[item?.name]?.effects, item?.name);
}

registerTranslator("implant", implantSentencesOf);
registerTranslator("figment", figmentSentencesOf);
registerTranslator("exotica", exoticaSentencesOf);
registerTranslator("armor", exoticaSentencesOf);
