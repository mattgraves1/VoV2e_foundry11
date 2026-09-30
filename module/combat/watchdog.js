/**
 * Lethal Blow Redirection — a killing blow lands on a companion instead.
 *
 * THE BOOK'S WHOLE TEXT, Jade Ibis, Pets, Synthhound: "If a kinetic attack
 * would kill the synthhound's owner, it kills the synthhound instead."
 * Crimson Hound said "physical"; Jade narrowed it to kinetic, and the roster
 * and vault were re-transcribed to match on 2026-09-19.
 *
 * WHY IT IS NOT Kill/Death-Detection Hook, ruled 2026-09-10 (Matt): "in the
 * killer-killed relationship, it's a 3rd party". That hook REPORTS a death
 * that has already happened. This one has to intervene BEFORE the HP write,
 * because once the owner is dead there is nothing left to redirect.
 *
 * IT WAS BLOCKED ON OWNERSHIP and is not any more. The second half of the
 * 2026-09-10 ruling was "our system has no concept of who its owner is" — a
 * prerequisite this row could not meet alone. Companion Ownership was built
 * 2026-09-13 for the five rows that all wanted it, and `ownerOf` /
 * `companionsOf` are what unblocked this one.
 *
 * KEYED ON A DECLARED FLAG, NOT ON THE CREATURE'S NAME (Matt, 2026-09-19).
 * `pets-data.js` marks the rule `watchdog: true`, `ruleItems` turns that into
 * an Item carrying `flags.vaarn.watchdog`, and this module looks for the Item.
 * So a Synthhound renamed at the table keeps its protocol — the fault Group
 * 194 found in the Vimana — and a later creature with the same clause needs no
 * code at all.
 */

import { companionsOf } from "../actor/companion.js";
import { suppressesDeath } from "./fatality.js";
import { soakDamage, tempHpOf } from "./temp-hp.js";
import { hasAttackProperty } from "../item/attack-properties.js";
import { BIOLOGICAL_WOUNDS, SYNTHETIC_WOUNDS, getWound } from "../actor/wounds-data.js";

const SCOPE = "vaarn";
const WATCHDOG_FLAG = "watchdog";

/** Does this creature carry a rule Item declaring the protocol? */
export function hasWatchdogProtocol(actor)
{
  const items = actor?.items?.contents ?? actor?.items ?? [];
  return items.some(i => i.getFlag?.(SCOPE, WATCHDOG_FLAG) ?? i.flags?.[SCOPE]?.[WATCHDOG_FLAG]);
}

/**
 * Would this much damage KILL this character, as opposed to wounding them?
 *
 * A MIRROR OF `_resolveHPChange`'s character branch, deliberately, branch for
 * branch and in the same order. The question "would this kill them" has
 * exactly one correct answer in this system and it is whatever that method
 * does; a second, independently-reasoned version of the rule would be a second
 * thing to keep in step, and it would drift silently because nothing compares
 * two predicates. If that method's branch order changes, this follows it.
 *
 * The four outcomes it mirrors:
 *   newHP above 0              — a wound at worst, never a death
 *   newHP exactly 0 from above — the row-0 wound, which does not kill
 *   Death's Door already borne — "any further damage is lethal"
 *   otherwise                  — the row for newHP, killing iff instantDeath
 *
 * BIOLOGICAL DIES AT -20 AND SYNTHETIC AT -19, which is not a special case
 * here but a consequence of reading the tables: Fatality is the only
 * `instantDeath` row on one and General Systems Failure sits a row higher on
 * the other. Bloody Mess cannot reach either — its 3d6 sub-wounds bottom out
 * at -18 — so no redirect can be owed by a wound rolled inside another wound.
 *
 * SUPPRESSED DEATH IS NOT A DEATH. If the owner is carrying Immortality
 * Injector's cannotDie, nothing would kill them, so nothing is redirected and
 * the synthhound lives. That falls out of the rule rather than being an
 * exception to it: the book's trigger is "would kill".
 */
export function wouldBeLethal(actor, dmg)
{
  if(!actor || actor.type !== "character") return false;
  if(!(dmg > 0)) return false;
  if(suppressesDeath(actor)) return false;

  // TEMPORARY HP (2026-09-26) is spent first, in the funnel's own first step,
  // so only what gets past it can kill. Without this the hound would die for
  // an owner the blow was never going to reach.
  const currentHP = actor.system.health.value;
  const newHP = currentHP - soakDamage(tempHpOf(actor), dmg).dmgLeft;

  if(newHP === currentHP) return false;
  if(newHP > 0) return false;
  if(newHP === 0 && currentHP > 0) return false;
  if((actor.system.wounds ?? []).some(w => w.deathsDoor)) return true;

  const table = actor.system.creatureTypes?.synthetic ? SYNTHETIC_WOUNDS : BIOLOGICAL_WOUNDS;
  return !!getWound(table, newHP)?.instantDeath;
}

/**
 * The companion that would take the blow, or null.
 *
 * FIRST BY NAME when a character owns more than one (Matt, 2026-09-19). The
 * book gives no tie-break at all, and `companionsOf` already sorts by name for
 * its own reasons, so the choice is at least stable between calls rather than
 * depending on actor creation order. The card names which one, so a Referee
 * who wants the other can say so.
 *
 * A DEAD ONE DOES NOT COUNT. It cannot be killed instead, having already been
 * killed, and a creature at 0 HP is dead outright under JADE p.30.
 */
export function watchdogFor(character)
{
  if(!character) return null;
  return companionsOf(character)
    .find(c => (c.system?.health?.value ?? 0) > 0 && hasWatchdogProtocol(c)) ?? null;
}

/**
 * Is this blow redirected, and to whom?
 *
 * Returns the companion that dies, or null when the rule does not fire. The
 * CALLER does the killing — see `_doDamage` — so that the death travels the
 * one path every other death travels and Kill/Death-Detection attributes it
 * without a second copy of that logic here.
 *
 * KINETIC INCLUDES ITS SUBTYPES, and that was put to Matt rather than assumed
 * (2026-09-19, agreed). `hasAttackProperty(item, "kinetic")` is true for a
 * plain weapon and also for a corrosive or piercing one, because
 * `IMPLIES_KINETIC` folds the physical subtypes in. A beam or a psychic attack
 * is not kinetic and is not redirected.
 *
 * A NULL ITEM IS KINETIC, which is the deliberate design of
 * `attackPropertiesOrKinetic` rather than an oversight here: kinetic is the
 * ABSENCE of a special property, so an unarmed blow qualifies.
 */
export function watchdogRedirect(target, dmg, item)
{
  if(!hasAttackProperty(item, "kinetic")) return null;
  if(!wouldBeLethal(target, dmg)) return null;
  return watchdogFor(target);
}

/**
 * The button for a redirect the damaging client cannot finish itself.
 *
 * WHY A BUTTON AND NOT A WRITE. A player who rolled the attack usually has no
 * permission to write to the synthhound, and when this was built there was no
 * socket relay (combat/gm-relay.js since 2026-09-27; the button was kept) —
 * the same constraint `.vaarn-recur-apply` and `.vaarn-drain-restore` were
 * both built around, and the Referee's CLICK is what carries the permission.
 *
 * THE OWNER IS ALREADY SAFE BY THE TIME THIS POSTS, which is what makes the
 * split acceptable. The protection is a write that does NOT happen, so it
 * needs no permission at all; only the death needs one. A card nobody clicks
 * leaves a live synthhound and a live owner, which is visibly unfinished
 * rather than silently wrong.
 */
export function watchdogKillButton(dog)
{
  return `<button type="button" class="vaarn-watchdog-kill" data-dog-id="${dog.id}">`
       + `Kill ${dog.name}</button>`;
}
