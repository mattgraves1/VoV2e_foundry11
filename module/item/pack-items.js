/**
 * The Item compendium's contents — Item Compendium Packs,
 * foundry-system-index.csv. FILED 2026-09-19, built 2026-09-20.
 *
 * WHY THIS IS NOT A LOOP OVER loot-builders.js. Every builder in that file
 * ROLLS: buildArmour rolls a d20 and a quality, buildHelm rolls a name,
 * buildCodex rolls an equation. They answer "what did this character find?".
 * A compendium answers a different question — "what does the book contain?"
 * — so this file walks each roster entry by entry and asks loot-builders for
 * the SHAPE of one entry. The entry-shaping halves were split out of the
 * rolling builders for exactly this, so a pack Item and a rolled Item of the
 * same entry cannot differ.
 *
 * WHAT MATT RULED, so a later reader does not mistake these for defaults:
 *
 *   - ONE PACK, FOLDERED (2026-09-20), rather than eight packs. Same shape
 *     as the RollTables pack, and it adds one compendium to the sidebar
 *     instead of eight.
 *   - WEAPONS SHIP UNTAGGED (2026-09-19). A tagged weapon stays the Generate
 *     Weapon macro's job — its dialog already picks the base and each tag.
 *     No tag editor is built, so a pack weapon cannot be upgraded in place;
 *     that is the decision, not an omission.
 *   - ARMOUR IS THE SEVEN BASE TYPES, UNQUALIFIED (2026-09-20). ARMOUR_TABLE
 *     carries 20 quality/type pairs across 7 rows; the adjective belongs to
 *     the roll, so "Brigandine" ships and "Golden Brigandine" does not.
 *   - THREE GEAR ENTRIES ARE SKIPPED (2026-09-20), leaving 37 of 40. Gear B's
 *     "Drug (generated below)" has no canonical form at all — it is four d20
 *     rolls. Gear A's "Helmet (+1 AV)" and Gear B's "Shield (+1 AV)" build as
 *     a randomly-NAMED helm or shield, and all forty of those names already
 *     ship in Armour/Helms and Armour/Shields. Their absence from the Gear
 *     folders is deliberate and is not a build that dropped three rows.
 *   - ADVANCED EXOTICA IS INCLUDED, LESS ITS TWO weaponGen ROWS (2026-09-20).
 *     Those two rows do not name an object; they say "generate an Exotic
 *     weapon", which is a roll and not an item. 98 of 100.
 *   - A CODEX IS ITS EQUATION (2026-09-20). 40 equations, no appearance text:
 *     the d20 appearance is rolled when one is FOUND and is not part of what
 *     the equation is.
 *   - THE 20 SAMPLE MYSTIC GIFTS SHIP UNDEFINED (2026-09-29, Mystic Gift
 *     Effect Modelling). No effect is set on any of them; the item sheet's
 *     effect editor offers suggestions for the table to pick from. Composed
 *     Gifts (Quality + Form) are a roll, not a list, and do not ship.
 */

import {
  MELEE_WEAPONS, RANGED_WEAPONS, ARMOUR_TABLE, HELM_TABLE, SHIELD_TABLE,
  GEAR_A, GEAR_B_BASE, GEAR_B_DRUG_INDEX, IMPLANTS, EXOTICA, ELIXIRS, GIFT_NAMES, GIFT_SOURCES
} from "../actor/chargen-data.js";
import { giftItemData } from "../actor/granted-pick.js";
import { ADVANCED_EXOTICA } from "../actor/advanced-exotica-data.js";
import { ADVANCED_IMPLANTS } from "../actor/advanced-implants-data.js";
import { EQUATIONS } from "../actor/codex-data.js";
import { gearItemData, KnaveCharacterCreator } from "../actor/chargen-app.js";
import { buildBaseWeapon } from "../actor/weapon-roller.js";
import {
  armourItemData, helmItemData, shieldItemData, startingImplantData,
  advancedImplantData, startingExoticaData, advancedExoticaData,
  codexItemData, elixirItemData, STACKABLES, buildStack
} from "./loot-builders.js";

/** The gear names that have no fixed Item — see the header. */
const GEAR_SKIP = [KnaveCharacterCreator.GEAR_HELMET, KnaveCharacterCreator.GEAR_SHIELD];

/**
 * Every pack Item, grouped by the folder path it belongs in.
 *
 * Returns [{ folder, docs }]. Creates nothing and touches no Foundry
 * collection, so it can be counted and diffed without a pack — which is what
 * makes the content checkable outside a world.
 */
export async function buildPackItems()
{
  const groups = [];
  const add = (folder, docs) => groups.push({ folder, docs });

  // --- Weapons: the base tables as printed, no tags ---
  const melee = [];
  for(const w of MELEE_WEAPONS) melee.push(await buildBaseWeapon("Melee", w.name));
  add("Weapons/Melee", melee.filter(Boolean));

  const ranged = [];
  for(const w of RANGED_WEAPONS) ranged.push(await buildBaseWeapon("Ranged", w.name));
  add("Weapons/Ranged", ranged.filter(Boolean));

  // --- Armour: 7 body types, then every helm and shield by name ---
  add("Armour", ARMOUR_TABLE.flatMap(e => armourItemData(e, null)));
  add("Armour/Helms", HELM_TABLE.flatMap(name => helmItemData(name)));
  add("Armour/Shields", SHIELD_TABLE.flatMap(name => shieldItemData(name)));

  // --- Starting Gear: both columns, less the three with no fixed form ---
  add("Starting Gear/Gear A", GEAR_A.filter(n => !GEAR_SKIP.includes(n)).map(n => gearItemData(n)));
  add("Starting Gear/Gear B", GEAR_B_BASE
    .filter((n, i) => i !== GEAR_B_DRUG_INDEX && !GEAR_SKIP.includes(n))
    .map(n => gearItemData(n)));

  // --- The counted consumables, one each. A pack Item is a single unit;
  //     the GM sets the count after dragging, and the cache still hands out
  //     its own stacks through buildStack. ---
  add("Consumables", Object.keys(STACKABLES).flatMap(key => buildStack(key, 1)));

  // --- Implants, both tiers ---
  add("Cybernetic Implants/Starting", IMPLANTS.flatMap(e => startingImplantData(e)));
  add("Cybernetic Implants/Advanced", ADVANCED_IMPLANTS.flatMap(e => advancedImplantData(e)));

  // --- Exotica, both tiers. The two weaponGen rows are not objects. ---
  add("Exotica/Starting", EXOTICA.flatMap(e => startingExoticaData(e)));
  const advExotica = [];
  for(const e of ADVANCED_EXOTICA)
  {
    if(e.weaponGen) continue;
    advExotica.push(...await advancedExoticaData(e));
  }
  add("Exotica/Advanced", advExotica);

  // --- Elixirs and Codices ---
  add("Elixirs", ELIXIRS.flatMap(e => elixirItemData(e)));
  add("Hypergeometric Codices", EQUATIONS.flatMap(e => codexItemData(e, null)));

  // --- The sample Mystic Gifts, undefined (see the header) ---
  add("Mystic Gifts", GIFT_NAMES.map((name, i) => giftItemData({ name, composed: false, source: GIFT_SOURCES[i] })));

  return groups;
}
