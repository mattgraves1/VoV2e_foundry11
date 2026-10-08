/**
 * Readers for sentences a GM writes on ANY Item - Effect Engine: GM Effect
 * Builder, chunk 1 (foundry-system-index.csv "Effect Engine: GM Effect
 * Builder", BUILD PLAN RULED 2026-10-05 by Matt).
 *
 * The weapon readers (item/weapon-tags.js) already read any Item they are
 * handed; chunk 1 hands them every Item instead of only weapons. What is here
 * is the two things no weapon reader covered, because every weapon sentence
 * came from a tag and the tag's own surfaces showed it:
 *  - a USE sentence with no tag gets a Use control on the sheet, on any Item
 *    but a Gift (a Gift has its own use, with the HP cost dialog);
 *  - a PASSIVE reminder (or ADV/DIS note) with no tag shows on the
 *    Forgettable Effects tab under its Item's name.
 *
 * Pure: no Foundry global, so tools/test-item-readers.mjs runs it offline.
 */

import { sentencesOf, useSentences, meetsState } from "./interpret.js";
import { itemStateDefault } from "./vocabulary.js";

const trig = s => (typeof s.when === "string" ? s.when : s.when?.trigger);

/**
 * CAN THIS ITEM BE EQUIPPED? - Stats as Sentences chunk 2e-ii (RULED 2026-10-07,
 * Matt). Weapons and armour, as always; and any CARRIED kind (a basic item, an
 * Exotica, a light, a codex, a crucible) that has a hands effect or any effect
 * needing it equipped - without the toggle such an effect could be written and
 * never met. Body Items are installed, so equipping them means nothing. An
 * intrinsic Item never (the sheet helper checks that, as before).
 */
export function isEquippableItem(item)
{
  if (["weaponMelee", "weaponRanged", "armor"].includes(item?.type)) return true;
  if (itemStateDefault(item?.type) !== "carried") return false;
  return sentencesOf(item).some(s =>
    (trig(s) === "stat" && s.do?.verb === "modify" && s.do.stat === "hands")
    || s.state === "equipped" || s.requires === "equipped");
}

/** The use sentences the generic Use control runs: untagged, on any Item but a Gift. */
export function effectUses(item)
{
  if (item?.type === "gift") return [];
  return useSentences(item).filter(({ s }) => !s.tag && !s.baked);
}

/** Does this Item get the generic Use control? */
export function hasEffectUse(item)
{
  return effectUses(item).length > 0;
}

/**
 * Does this mutation or ancestry rule get its use control? Mutations and
 * Ancestry Rules chunk 4 (2026-10-06): it has a use sentence, read through the
 * translator - the name lists (knave.js MUTATIONS_WITH_USE_ICON, the passive
 * rules' set) are gone from the gate.
 */
export function hasBodyUse(item)
{
  // Implants and figments since Implants, Exotica and Figments chunk 3a (2026-10-06).
  if (!["mutation", "ancestry", "implant", "figment"].includes(item?.type)) return false;
  return useSentences(item).some(({ s }) => !s.baked);
}

const REMINDER_VERBS = { reminder: "Benefit", adv: "Benefit", dis: "Detriment" };

/**
 * The Forgettable Effects tab entries an Item's own untagged passive
 * reminders give: { name, note, polarity, inForce }. A sentence needing the
 * Item in a state it is not in is listed with inForce false, so the tab can
 * say so, as it does for a carried weapon (Matt, 2026-10-05).
 */
export function builtReminders(item)
{
  return sentencesOf(item)
    .filter(s => !s.tag && !s.baked && trig(s) === "passive" && REMINDER_VERBS[s.do?.verb])
    .map(s => ({
      name: s.label || item?.name || "",
      note: s.text ?? "",
      // The GM picks the section and polarity in the builder (Matt, 2026-10-05);
      // a sentence naming neither keeps chunk 1's default.
      section: s.tab?.section ?? "Always Active",
      category: s.tab?.category ?? "Item Effects",
      polarity: s.tab?.polarity ?? REMINDER_VERBS[s.do.verb],
      inForce: meetsState(item, s.state ?? itemStateDefault(item?.type))
    }));
}

/**
 * The words of an asked auto-hit's card (Remaining Sources chunk 3, RULED
 * 2026-10-07): Heat-Seeking in its own words; any other reason - the Ultravisor's
 * activation, a GM's auto-hit sentence - says why. `reason` is { tag, text } or
 * null (no reason recorded reads as Heat-Seeking, the card's old words).
 */
export function askedAutoHitLine(weapon, target, reason = null)
{
  if (!reason || reason.tag === "Heat-Seeking")
    return `<b>${weapon}</b> arcs around and strikes ${target} anyway — Heat-Seeking never misses a warm-blooded target. Roll damage!`;
  const why = reason.text ? String(reason.text).replace(/<[^>]*>/g, "").trim().replace(/\.$/, "") : `its ${reason.tag ?? "effect"} always hits`;
  return `<b>${weapon}</b> strikes ${target} anyway — ${why}. Roll damage!`;
}
