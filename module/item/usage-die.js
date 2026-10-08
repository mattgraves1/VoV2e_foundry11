/**
 * Vaarn Usage Die (Core Rules > Usage Die.md): tracks ammo and consumable
 * supplies without counting individual uses. Shared by ranged weapon ammo,
 * starting gear, and Exotica — any item using the `usageDie` template.
 *
 * Chain, largest to smallest: Expended <- d4 <- d6 <- d8 <- d10 <- d12 <- d20.
 * Rolling the die: on a 1-2 it depletes one step down the chain. Ranged
 * weapons roll once per combat (see the deleteCombat hook in knave.js);
 * per-use items (gear/Exotica) roll on each use.
 *
 * There's no codified rule for refilling a usage die (per Matt, 2026-08-14) —
 * individual items describe their own refill in flavor text (e.g. the
 * Fungal weapon tag "regains ammo die step", the Ammunition Fabricator
 * refills to full). upgradeDie() supports both: step it by 1 for a partial
 * refill, or jump straight to the item's own `max` for a full one.
 */

import { itemForbids } from "./weapon-tags.js";
import { usageDieOf } from "../effects/item-stats.js";
export const USAGE_DIE_CHAIN = ["d20", "d12", "d10", "d8", "d6", "d4"];

function dieSize(die)
{
  return Number(die?.slice(1)) || 0;
}

// "" (None/not set) and "expended" both sit one step below d4 for the
// purpose of stepping/upgrading — a fresh item and a used-up item are the
// same "nothing left" starting point for a refill. They stay distinct
// everywhere else (rollUsageDie and the ranged-attack check both still
// treat "" as "unlimited, no tracking" vs "expended" as "blocked").
function chainIndex(die)
{
  if(!die || die === "expended") return USAGE_DIE_CHAIN.length;
  return USAGE_DIE_CHAIN.indexOf(die);
}

/** Chance (0-1) that the next roll of this die depletes it. */
export function depletionChance(die)
{
  const size = dieSize(die);
  return size ? 2 / size : 0;
}

/** Expected number of remaining rolls before this die reaches Expended. */
export function expectedUsesRemaining(die)
{
  const idx = chainIndex(die);
  if(idx === -1 || idx >= USAGE_DIE_CHAIN.length) return 0;
  return USAGE_DIE_CHAIN.slice(idx).reduce((sum, d) => sum + dieSize(d) / 2, 0);
}

/** One step smaller, or "expended" if already at d4. */
export function downgradeDie(die)
{
  const idx = chainIndex(die);
  if(idx === -1) return die;
  return idx >= USAGE_DIE_CHAIN.length - 1 ? "expended" : USAGE_DIE_CHAIN[idx + 1];
}

/** One (or more) steps bigger, capped at `ceiling` (defaults to Ud20). */
export function upgradeDie(die, steps = 1, ceiling = "d20")
{
  const idx = chainIndex(die);
  if(idx === -1) return die;
  const ceilIdx = Math.max(0, chainIndex(ceiling));
  const newIdx = Math.max(ceilIdx, idx - steps);
  return USAGE_DIE_CHAIN[newIdx];
}

/**
 * Roll an item's usage die and post the result to chat. On a 1-2 it
 * depletes one step and the item is updated. No-ops (returns null) if the
 * item has no die set or is already Expended.
 */
export async function rollUsageDie(item, actor)
{
  // The current die, which a die sized by a sentence starts at full (Stats as Sentences chunk 2a).
  const die = usageDieOf(item).die;
  if(!die || die === "expended") return null;

  const roll = new Roll(`1${die}`);
  roll.evaluate({async: false});

  const depleted = roll.total <= 2;
  const newDie = depleted ? downgradeDie(die) : die;

  let flavor = `<b>${item.name}</b> — usage die (${die})`;
  if(depleted)
  {
    flavor += newDie === "expended"
      ? ' — <span class="knave-ability-crit knave-ability-critFailure">used up!</span>'
      : ` — depletes to ${newDie}`;
  }

  roll.toMessage({speaker: ChatMessage.getSpeaker({actor}), flavor});

  if(depleted)
    await item.update({"system.usageDie.die": newDie});

  return {roll, depleted, newDie};
}

const COMBAT_FLAG_SCOPE = "vaarn";
const COMBAT_FLAG_KEY = "usageDieCombatId";

/** Mark a ranged weapon as fired this combat, to be resolved on deleteCombat. */
export async function flagWeaponFiredInCombat(item, combatId)
{
  await item.setFlag(COMBAT_FLAG_SCOPE, COMBAT_FLAG_KEY, combatId);
}

/**
 * deleteCombat hook handler: rolls the usage die once for every item flagged
 * as fired during this encounter, then clears the flag. Per Usage Die.md,
 * ranged weapons roll once per combat, not once per shot — and only for
 * weapons actually fired, not every ranged weapon an actor happens to own.
 */
export async function resolveCombatUsageDice(combat)
{
  for(const combatant of combat.combatants)
  {
    const actor = combatant.actor;
    if(!actor) continue;

    for(const item of actor.items)
    {
      if(item.getFlag(COMBAT_FLAG_SCOPE, COMBAT_FLAG_KEY) !== combat.id) continue;

      // A weapon that never needs reloading - Parasitic, Effect Engine: Weapon
      // Tags chunk 5c (Matt, 2026-10-05) - is not rolled down.
      if(itemForbids(item, "deplete-ammo"))
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
          content: `<b>${item.name}</b> needs no reloading — its ammo die is not rolled after the fight.` });
      else
        await rollUsageDie(item, actor);
      await item.unsetFlag(COMBAT_FLAG_SCOPE, COMBAT_FLAG_KEY);
    }
  }
}
