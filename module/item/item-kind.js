import { isExotica } from "./xp-value.js";
import { armourSlotOf } from "../effects/item-stats.js";

/**
 * Item Type on Item Sheet — what KIND of thing an Item is, in words, on its
 * own sheet.
 *
 * WHY IT EXISTS. Filed 2026-09-07 (Matt) as the other half of Inventory Label
 * Category Prefix: the inventory list is colour-coded by type, so a category
 * ahead of the name is redundant there and comes off. It still has to be
 * recorded somewhere, and the item sheet is where a player looks when they
 * want to know what they are holding. Stripping the prefixes is safe only once
 * this exists, which is the whole dependency between the two rows.
 *
 * DERIVED, NOT STORED. RULED 2026-09-20 (Matt). Every discriminator a kind
 * needs is already on the Item: its `type`, `armorSlot` for the armour
 * shapes, and isExotica's flag/type/tag test. A stored field would have to be
 * taught to twenty-odd creation sites and would read EMPTY on everything built
 * before today, which a backfill is the standing answer against. Derivation
 * costs the ability to override one item by hand; nothing has wanted that.
 *
 * THE DUAL-TYPE CASE IS THE ONE THAT SHAPED IT, and it was Matt's own
 * qualifier at filing: an Exotica roll carrying an `armorType` is CREATED as a
 * real `armor` Item with flags.vaarn.exotica, so a Mind Shield is genuinely
 * both. Its sheet said "Helm" and, obliquely, "XP Value"; the word Exotica
 * appeared nowhere. So a kind is a LIST, not a single label, and Exotica leads
 * because it is the rarer half of the pair.
 *
 * SILENCE IS DELIBERATE FOR EVERYTHING THE ROW DID NOT ENUMERATE. The filing
 * names twelve kinds - melee weapon, ranged weapon, armour, shield, helm,
 * mutation, implant, exotica, gift, codex, crucible and ancestry rule - and
 * this answers for those and no others. Plain gear has no category, which is
 * why it never carried a prefix either, and inventing one here would be a
 * design decision nobody made. An unidentified item cannot reach this at all:
 * item-sheet.js routes it to unidentified-sheet.html before a type template
 * is ever chosen.
 */

/** The twelve kinds the row enumerates, by Item type. Armour answers separately. */
const KIND_BY_TYPE = {
  weaponMelee:  "Melee Weapon",
  weaponRanged: "Ranged Weapon",
  mutation:     "Mutation",
  implant:      "Cybernetic Implant",
  gift:         "Mystic Gift",
  codex:        "Hypergeometric Codex",
  crucible:     "Crucible",
  ancestry:     "Ancestry Rule",
};

/**
 * Armour's three shapes. DEFAULTS TO BODY on a missing slot, which is the same
 * default actor-sheet.js already applies when it counts equipped armour - a
 * kind that disagreed with the equip rules about what a slotless Item is would
 * be worse than one that is merely terse.
 */
const ARMOUR_KIND = { body: "Body Armour", helm: "Helm", shield: "Shield",
  // Face Armour Slot, RULED 2026-09-27 (Matt): masks and goggles.
  face: "Face Gear" };

/**
 * Every kind this Item is, outermost first. Empty for anything the row does
 * not enumerate.
 */
export function kindsOf(item)
{
  if(!item) return [];

  const kinds = [];
  if(isExotica(item)) kinds.push("Exotica");

  if(item.type === "armor") kinds.push(ARMOUR_KIND[armourSlotOf(item)] ?? ARMOUR_KIND.body);
  else if(KIND_BY_TYPE[item.type]) kinds.push(KIND_BY_TYPE[item.type]);

  return kinds;
}

/**
 * The one line a sheet renders, or "" when this Item has no enumerated kind.
 * A middot rather than a comma: two kinds are one fact about one object, and
 * a comma reads as a list of things the item might be.
 */
export function kindLabelOf(item)
{
  return kindsOf(item).join(" \u00b7 ");
}
