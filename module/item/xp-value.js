/**
 * XP VALUE — what an item is worth in ADVANCEMENT, as distinct from barter.
 *
 * Vaarn's level-up system IS trading Exotica away (Matt's point, 2026-09-05,
 * and the book states it outright):
 *
 *   "All new characters start at Level 1 and advance by trading in Exotica at
 *    settlements or oases. Trading in an item of Exotica will grant one
 *    experience point (XP)."
 *
 * So "Exotica are unique and priceless" is not hyperbole about being expensive.
 * Exotica are simply not on the barter axis at all — pricing one in olives is a
 * category error, not an underestimate. Their worth is 1 XP.
 *
 * EXOTIC WEAPONS COUNT. The Exotic Weapons section carries its own "XP Value"
 * heading: "Exotic Weapons count as Exotica for the purposes of gaining XP."
 * That is also why Advanced Exotica rows 8/9 generating Exotic weapons as
 * Exotica is not an inconsistency — it is the book saying this twice.
 *
 * VALUE TAGS MOVE THE XP, NOT A PRICE (Matt, 2026-09-05). An Exotic weapon
 * still rolls a Basic tag, which may be a value-altering one. Rather than let
 * that clause go inert, it multiplies the XP: a Bejewelled Exotic weapon is
 * worth 3 XP, an Ancient one 0.5. Both the actor's xp.value and the item sheet
 * render with data-dtype="Number", so fractional XP is already supported.
 *
 * DERIVED, NOT STORED — same reasoning as display-name.js. Nothing is written
 * to the item, so nothing can go stale, and re-tagging an item moves its XP
 * automatically.
 */

import { EXOTIC_TAGS } from "../actor/chargen-data.js";
import { applyTradeValueTagModifiers } from "./tag-modifiers.js";

/**
 * Verified 2026-09-05 to be disjoint from BASIC_TAGS, ADVANCED_TAGS and every
 * weapon base's base_tags, so a tag match cannot false-positive a Basic weapon
 * into Exotica. Re-check that if a tag is ever renamed — it is the same
 * homonym trap as Fungal/Hypergeometric.
 */
const EXOTIC_TAG_NAMES = new Set(EXOTIC_TAGS.map(t => t.name));

/**
 * True for Exotica items, and for any weapon carrying an Exotic tag.
 *
 * EXPLICIT OVERRIDE, same shape as display-name.js honouring system.displayName:
 * flags.vaarn.exotica marks an item Exotica that neither test would catch. Some
 * Exotica rolls produce a real Item of another type — Mind Shield becomes an
 * `armor` — and armor carries no `tags` field, so nothing about it says Exotica.
 * The flag is the escape hatch rather than a reason to bake XP onto every item.
 */
export function isExotica(doc)
{
  if(!doc) return false;
  if(doc.flags?.vaarn?.exotica) return true;
  if(doc.type === "exotica") return true;
  const tags = doc.system?.tags ?? [];
  return tags.some(t => EXOTIC_TAG_NAMES.has(t));
}

/**
 * The LABEL for an item's value field. Same shape as displayNameOf: one
 * common field, rendered differently (Matt, 2026-09-05).
 *
 * The number needs no separate derivation, because it is already correct.
 * "Trading in an item of Exotica will grant one experience point", and every
 * item's tradeValue starts at the template default of 1, with the same
 * value-altering tags multiplying it that would have multiplied a price. So
 * an Exotic weapon's stored 3 IS its 3 XP. Only the label was ever wrong.
 *
 * Deriving a SECOND number instead would have made Exotica the one item type
 * whose value is computed live while every other item bakes it at creation,
 * alongside slots and damage dice. One field, one convention.
 */
export function valueLabelOf(doc)
{
  return isExotica(doc) ? "XP Value" : "Trade Value";
}
