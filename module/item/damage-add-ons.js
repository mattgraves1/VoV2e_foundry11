import { MUTATION_TABLE } from "../actor/mutation-data.js";
import { ADVANCED_IMPLANTS } from "../actor/advanced-implants-data.js";
import { ANCESTRY_NATURAL_WEAPONS } from "../actor/ancestry-rules-data.js";
import { IMPLANTS } from "../actor/chargen-data.js";
import { UNARMED_STRIKE, normalizeDamageDice } from "../actor/chargen-app.js";
import { isSuppressed } from "./suppression.js";

/**
 * DAMAGE ADD-ONS — a natural weapon that is a damage BONUS to another attack
 * rather than an attack of its own.
 *
 * Matt's catch 2026-09-07, playing out melee weapon + natural add-on +
 * Hydraulic Biceps: the total came to weapon die + add-on die + 2x STR where
 * the book gives one. The root is that an add-on was modelled as an
 * independent weapon Item, so _implantDamageBonus — which keys only on
 * item.type — paid the implant's ability bonus a second time. A second fault
 * pointed the other way: crit is keyed to the item that rolled the to-hit, so
 * critting with the parent weapon did not double the add-on die even though it
 * is part of the same attack. And a third, found in testing-log 41.3: the
 * add-on's ATTACK icon rolled too, making it a fully independent attack with
 * its own to-hit, which the "roll Damage only" wording never enforced.
 *
 * Option A (suppress the injected bonuses on add-ons) was REJECTED by Matt
 * 2026-09-07 in favour of B — fold the add-on's dice into the parent weapon's
 * single damage roll — because it is the model the book describes ("add an
 * extra d6 of fang damage to the roll") and it makes crit, berserk and every
 * future per-attack modifier come out right for free rather than one at a time.
 *
 * THE SET IS A RULING, NOT A READING. Every one of the seven is an existing Matt
 * ruling recorded in forgettable-effects-data.js, not a fresh interpretation of
 * effect text. Antlers joined 2026-09-26 (Matt): JADE IBIS rewrote it from an
 * extra d6 attack on a charge to +d10 damage on a charge, Horns Rhino's rule.
 * The other natural weapons are separate or replacement attacks and MUST keep
 * the injected bonus — Beak, Horns Ram, Tail Club, Tail Scorpion and Cyber
 * Stinger all carry an explicit "EXTRA attack each round" note. Do not widen
 * the set by pattern-matching descriptions.
 *
 * NO MIGRATION. The index is keyed by the natural weapon's ITEM name and looked
 * up live, the way _implantDamageBonus already reads IMPLANTS by name, so
 * characters already carrying these Items are fixed without being touched.
 */

/**
 * Rosters that can carry a `naturalWeapon`, flattened to one list.
 *
 * `damageAddOn` is read from the ENTRY, not from its `naturalWeapon`. It names
 * the mechanism the entry needs, the same form as `perRound` and `stateful`,
 * and tools/gen-atom-status.mjs derives evidence from top-level keys only — so
 * nested it would be invisible to the generator, and `naturalWeapon` itself is
 * already spoken for by the atom's other dependency, Natural Weapon Item
 * Creation. That row stays: the Item is right, and what was wrong is rolling
 * it separately.
 */
function* naturalWeaponEntries()
{
  const one = (source, kind, e) => ({ source, kind, nw: e.naturalWeapon, addOn: e.damageAddOn ?? null, replacesUnarmed: !!e.replacesUnarmed });
  for(const m of MUTATION_TABLE) if(m.naturalWeapon) yield one(m.name, "mutation", m);
  for(const i of IMPLANTS) if(i.naturalWeapon) yield one(i.name, "implant", i);
  for(const i of ADVANCED_IMPLANTS) if(i.naturalWeapon) yield one(i.name, "implant", i);
  for(const rules of Object.values(ANCESTRY_NATURAL_WEAPONS))
    for(const r of rules) if(r.naturalWeapon) yield one(r.rule, "ancestry", r);
}

/**
 * Item name -> add-on definition, built once at load.
 *
 * Keyed by the WEAPON Item's name (`Rhino Horn`), not the rule's (`Horns,
 * Rhino`), because the Item is what the sheet rolls and therefore what the
 * lookup has in hand.
 */
const ADD_ON_INDEX = (() =>
{
  const map = new Map();
  for(const e of naturalWeaponEntries())
  {
    if(!e.addOn) continue;
    map.set(e.nw.name, {
      itemName: e.nw.name,
      source: e.source,
      dice: normalizeDamageDice(e.nw.damage),
      appliesTo: e.addOn.appliesTo ?? "melee",
      requires: e.addOn.requires ?? null,
      damageTypes: e.addOn.damageTypes ?? null,
    });
  }
  return map;
})();

/**
 * The Item names that ARE this character's unarmed attack.
 *
 * The base Unarmed Strike, plus the three `replacesUnarmed` natural weapons
 * (Crab Claw, Retractable Claws, Poison Spur) which redefine it rather than
 * adding an attack. Bioelectricity reads "your unarmed melee attack causes +d6
 * electrical damage", so on a character whose unarmed attack IS a Crab Claw it
 * adds to the Crab Claw. Derived rather than hardcoded so a new
 * `replacesUnarmed` entry is picked up without editing this file.
 */
const UNARMED_ITEM_NAMES = (() =>
{
  const names = new Set([UNARMED_STRIKE.name]);
  for(const e of naturalWeaponEntries()) if(e.replacesUnarmed) names.add(e.nw.name);
  return names;
})();

/**
 * The add-on definition for this Item, or null if it is an ordinary weapon.
 *
 * CHARACTERS ONLY, and this is not a tidiness gate — it is load-bearing. The
 * index is keyed by Item NAME, and the Battle Boar's attack line is
 * "Flamethrower Snout (d8, blast, flame) / Tusks (d6)": a real d6 attack that
 * happens to share a name with the Tusks mutation. Without the actor-type
 * check, importing that creature would silently disarm it — its Tusks would
 * render as a reference-only badge and refuse to roll, while the six PC add-ons
 * it has nothing to do with went on working. A creature has no mutation roster
 * behind its weapons, so nothing on an `npc` can be an add-on by construction.
 *
 * An UNOWNED Item (no parent) is also not an add-on: it is a sheet-less
 * document in a directory or compendium, with no attack to fold into.
 */
export function damageAddOnFor(item)
{
  if(!item || (item.type !== "weaponMelee" && item.type !== "weaponRanged")) return null;
  if(item.parent?.type !== "character") return null;
  return ADD_ON_INDEX.get(item.name) ?? null;
}

/** Is this Item a damage add-on — i.e. reference-only, never rolled alone? */
export function isDamageAddOn(item)
{
  return !!damageAddOnFor(item);
}

/**
 * ROCKET BOOSTED — the one add-on that is a TAG on the attacking weapon rather
 * than a second Item, wired 2026-09-22 (Matt).
 *
 * "Contains a small rocket-pack. +d12 damage when charging into melee range.
 * Can be used to gain altitude." (JADE IBIS, EXOTIC_TAGS.) The altitude clause
 * has nothing to read it and is the Referee's.
 *
 * THE FIGURE IS d12, NOT d10. The atom row still says d10, which is the
 * pre-JADE number; the charge-state comment below has said d12 since it was
 * written and the current edition agrees with it.
 *
 * IT RIDES THE ADD-ON FOLD rather than getting a path of its own, and the
 * reason is the reason Option B was chosen for add-ons at all: one die term
 * appended to the parent's single roll takes crit, berserk and every
 * target-side multiplier for free. The alternative — a second roll, or a
 * creation-time die baked into damageDice by applyDamageTagModifiers — is
 * wrong twice over. A second roll is the double-counting model Matt rejected,
 * and baking cannot express a die that is only there on a charge.
 *
 * SYNTHESISED RATHER THAN INDEXED. ADD_ON_INDEX is keyed by Item NAME and
 * every entry in it is a body part the character owns; this one is a property
 * of whatever weapon is swinging, so there is no Item to look up. It therefore
 * carries the parent weapon as its own `item`, which is what makes the chat
 * lines downstream read "Rocket Boosted added" against the right weapon.
 *
 * MELEE ONLY, matching the two existing charge consumers and the book's own
 * "charging into melee range". An exotic tag can land on a ranged weapon, and
 * a rocket-assisted charge with a rifle adds nothing — the same silent-nothing
 * a player would otherwise have to work out, so withheldDamageAddOns does not
 * mention it there either.
 */
export const ROCKET_BOOSTED_TAG = "Rocket Boosted";

const ROCKET_BOOSTED_DEF = { dice: "1d12", source: "Rocket Boosted",
                             appliesTo: "melee", requires: "charge" };

/** The synthetic Rocket Boosted add-on for this weapon, or null. */
function rocketBoostedOn(parentItem)
{
  if(parentItem?.type !== "weaponMelee") return null;
  const tags = parentItem.system?.tags ?? [];
  return tags.includes(ROCKET_BOOSTED_TAG) ? { def: ROCKET_BOOSTED_DEF, item: parentItem } : null;
}

/**
 * Every add-on on `actor` that folds into `parentItem`'s damage roll.
 *
 * An add-on never folds into another add-on, and a conditional one (`requires`)
 * only folds when its condition is currently declared — today that is the
 * charge toggle and nothing else.
 *
 * RETURNS THEM IN ITEM ORDER, and the caller depends on that: it appends one
 * die term per add-on to the damage formula and reads them back positionally
 * out of `roll.dice`.
 *
 * THEY STACK. Matt's ruling 2026-09-07 (Q4): Powerful Jaws and Tusks together
 * is +2d6 on every melee hit. Add-ons add, they do not replace, so they do not
 * contradict one another the way the replacement unarmed attacks do — see
 * Mutation Contradiction Precedence for those.
 */
export function collectDamageAddOns(actor, parentItem)
{
  if(!actor || !parentItem) return [];
  if(isDamageAddOn(parentItem)) return [];

  const parentIsMelee = parentItem.type === "weaponMelee";
  const parentIsUnarmed = parentIsMelee && UNARMED_ITEM_NAMES.has(parentItem.name);
  const charging = isCharging(actor);

  const out = [];
  for(const item of actor.items)
  {
    const def = damageAddOnFor(item);
    if(!def) continue;
    // Innate Item Suppression (2026-09-13). Gated HERE and in
    // withheldDamageAddOns rather than inside damageAddOnFor, deliberately:
    // that function is pure classification, and a suppressed add-on answering
    // "not an add-on" would make the sheet offer it as an independent attack —
    // the exact fault this module was built to remove. It stays a
    // reference-only badge and simply folds nothing.
    if(isSuppressed(item)) continue;
    if(def.appliesTo === "unarmed" ? !parentIsUnarmed : !parentIsMelee) continue;
    if(def.requires === "charge" && !charging) continue;
    out.push({ def, item });
  }
  // The parent's own Rocket Boosted tag, appended LAST so it keeps the
  // positional read in _onItemRoll honest: the dice are read back from the end
  // of roll.dice in this order, and a tag die inserted mid-list would be
  // attributed to whichever body part happened to follow it.
  const rocket = charging ? rocketBoostedOn(parentItem) : null;
  if(rocket) out.push(rocket);
  // A DIE THE WEAPON TYPES APART - the Parched Man's Snare's drowning d6
  // (Breathing and Suffocation, RULED 2026-09-27 by Matt). Rocket Boosted's
  // shape: an add-on the parent carries itself, so any actor rolls it, and
  // the component split gives it its own damage type.
  for(const t of parentItem.flags?.vaarn?.typedDice ?? [])
    out.push({ def: { dice: t.dice, source: t.source, damageTypes: t.damageTypes }, item: parentItem });
  return out;
}

/**
 * Add-ons that would fold in but for their unmet condition.
 *
 * Used only to explain a MISSING die on the chat card. A player who forgot to
 * declare the charge otherwise just sees a smaller number with nothing saying
 * why, which is the same silent-difference complaint Matt raised about a bigger
 * one (Q5).
 */
export function withheldDamageAddOns(actor, parentItem)
{
  if(!actor || !parentItem || isDamageAddOn(parentItem)) return [];
  if(parentItem.type !== "weaponMelee") return [];
  if(isCharging(actor)) return [];

  const out = [];
  for(const item of actor.items)
  {
    if(isSuppressed(item)) continue;
    const def = damageAddOnFor(item);
    if(def?.requires === "charge") out.push({ def, item });
  }
  // A forgotten charge withholds the weapon's own Rocket Boosted die exactly
  // as it withholds a Rhino Horn, and for the same reason it is reported: the
  // player sees a smaller number with nothing saying why.
  const rocket = rocketBoostedOn(parentItem);
  if(rocket) out.push(rocket);
  return out;
}

/* ------------------------------------------------------------------ *
 * CHARGE DECLARATION STATE
 * ------------------------------------------------------------------ */

/**
 * A player-declared "I am charging" state that conditional attack effects read.
 *
 * RULED 2026-09-07 (Matt): a TOGGLE, not a prompt. Off by default; the player
 * declares the charge by turning it on; rolling the damage die auto-clears it
 * back off. That last clause is the load-bearing half — it makes the toggle
 * self-cleaning, so a charge cannot silently persist into later rounds and
 * quietly inflate every subsequent hit, which is exactly how a sticky flag goes
 * wrong.
 *
 * Nothing in this system models movement, so this is PLAYER DECLARATION, not
 * detection, and the sheet says so.
 *
 * FOUR CONSUMERS, which is why it is its own mechanism rather than a field on
 * the add-ons: Horns Rhino, Tank Treads and Antlers are damage add-ons folded
 * into a parent attack; Rocket Boosted is a WEAPON TAG whose +d12 belongs to
 * its own weapon's roll and involves no second Item at all. Antlers was a
 * separate extra attack until JADE IBIS made it +d10 on a charge (wired here
 * 2026-09-26, Matt). The three add-ons are wired here; Rocket Boosted is its
 * own atom row.
 *
 * Stored as an actor flag rather than a schema field, following
 * `berserkerActive`: it is transient combat state, so it needs no relaunch and
 * leaves nothing behind on a character that never charges.
 */
export const CHARGE_FLAG = "chargeDeclared";

export function isCharging(actor)
{
  return !!actor?.getFlag("vaarn", CHARGE_FLAG);
}

export async function setCharging(actor, on)
{
  if(!actor) return;
  if(on) await actor.setFlag("vaarn", CHARGE_FLAG, true);
  else await actor.unsetFlag("vaarn", CHARGE_FLAG);
}

/**
 * Clear a declared charge, reporting whether there was one to clear.
 *
 * Called from the damage-roll path — the auto-clear half of the ruling above.
 * Returns false when nothing was set, so the caller can stay silent rather than
 * announcing a charge that was never declared.
 */
export async function clearCharge(actor)
{
  if(!isCharging(actor)) return false;
  await actor.unsetFlag("vaarn", CHARGE_FLAG);
  return true;
}
