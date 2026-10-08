// Creature flags from their sentences (Effect Engine: Creatures chunk 2c-i).
import { creatureFlagsOf } from "../item/creature-effects.js";
/**
 * Usable Creature Ability - the Items a Bestiary entry's `usable` list builds
 * (foundry-system-index.csv "Spirit Form", 2026-09-27).
 *
 * WHAT IT IS. An ability the creature USES from its sheet rather than attacks
 * with: a "use" icon on the row, and a declared effect on the bearer itself -
 * an HP cost, or HP restored to full - with an optional effect put on a
 * targeted creature through the Apply card. The Unquiet Spirit is the first
 * and only carrier: Manipulate Object (spend d6 HP), Possess (spend d6 + the
 * target's Level, Possessed on the target for one Exploration Turn) and Long
 * Rest (HP to full, no rations - an npc has no rest path, RULED 2026-09-27 by
 * Matt, so the rest is an ability on the sheet).
 *
 * WHY NOT AN `abilities` ENTRY. attacksFromAbilities builds weapons - to-hit
 * and damage icons - and none of these is a strike. Why not a `rules` entry:
 * only per-round rules become Items, and these recur on nothing.
 *
 * THIS FILE IS THE BUILD HALF and touches no Foundry global, so pack-build.js,
 * sync-bestiary.js and the offline tests can import it. The USE half - the
 * roll, the HP change through the sheet's own entry point, the Apply card - is
 * spirit.js, which the sheet reaches at click time.
 *
 * `intrinsic: true` for the reason creature rule reminders carry it: the
 * ability is part of the creature, so Item Transfer refuses to hand it over.
 * `type: "item"`, not a new type, for the reason those reminders give too - a
 * new type is a template change and a relaunch, for no gain.
 */

/** The `usable` list as Items. Empty for every creature without one. */
export function usableItems(entry)
{
  return (entry.usable ?? []).map(u =>
  {
    const lines = [`<p>${u.text}</p>`];
    if(u.hpCost)
      lines.push(`<p><b>Cost:</b> ${u.hpCost.dice}${u.hpCost.plusTargetLevel ? " + the target's Level" : ""} HP, spent when used.</p>`);
    if(u.applies)
      lines.push(`<p><b>On the target:</b> ${u.applies.name}, for ${u.applies.rounds} ${u.applies.unit === "turn" ? "Exploration Turn" : "combat round"}${u.applies.rounds === 1 ? "" : "s"}, through the Apply card.</p>`);
    if(u.restoreHp === "full")
      lines.push(`<p><b>Restores HP to full.</b></p>`);
    const usable = {};
    if(u.hpCost) usable.hpCost = { ...u.hpCost };
    if(u.applies) usable.applies = { ...u.applies };
    if(u.restoreHp) usable.restoreHp = u.restoreHp;
    return {
      name: u.name, type: "item", img: "icons/svg/aura.svg",
      system: { description: lines.join(""), slots: 0, quantity: 1, tradeValue: 0, intrinsic: true },
      flags: { vaarn: { usable } }
    };
  });
}

/** Is this Item one of the above? */
export function isUsable(item)
{
  return !!creatureFlagsOf(item).usable;
}
