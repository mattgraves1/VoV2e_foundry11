/**
 * Chosen Protector - the Consul's Lictor's Look Out Sire, on Lethal Blow
 * Redirection (foundry-system-index.csv), RULED 2026-09-26 by Matt.
 *
 * THE BOOK, JADE IBIS: "When Consul Larke would take lethal damage, a Lictor
 * can choose to die instead." Consul Larke is a named NPC kept out of the
 * Bestiary, so the rule is generalised, and every point below is Matt's:
 *   - a PROTECT control on the Lictor records the token the GM has targeted;
 *   - a lethal blow on that token is HELD, and a GM card offers each living
 *     protector's death in its place, or lets the blow land - "can choose";
 *   - any attack, not kinetic only as the Synthhound's is;
 *   - the protectee may be an NPC as well as a character;
 *   - several protectors may guard one actor;
 *   - the protector's death is the attacker's kill (Blood-Rapturous reads it),
 *     as the Synthhound's is.
 *
 * WHO IS PROTECTED is a token or an actor. A linked token IS its actor, so it
 * is stored by actor id; an unlinked one - most spawned creatures - is its own
 * synthetic actor, so it is stored by the token's uuid.
 *
 * The decisions here are pure (no document writes), so tools/test-protector.mjs
 * drives them in node. The card buttons and the Protect control live in
 * knave.js and actor-sheet.js.
 */

import { soakDamage, tempHpOf } from "./temp-hp.js";
import { suppressesDeath } from "./fatality.js";
import { wouldBeLethal } from "./watchdog.js";

export const PROTECTOR_RULE_FLAG = "protector";
export const PROTECTING_FLAG = "protecting";
export const HELD_BLOW_FLAG = "heldBlow";

/** Does this actor carry a rule Item declaring the protector's rule? */
export function hasProtectorRule(actor)
{
  const items = actor?.items?.contents ?? actor?.items ?? [];
  return items.some(i => i.flags?.vaarn?.[PROTECTOR_RULE_FLAG]);
}

/** What a protector records about the token it guards. */
export function protecteeRecord(tokenDoc)
{
  const linked = !!tokenDoc?.actorLink;
  return {
    name: tokenDoc?.name ?? tokenDoc?.actor?.name ?? "someone",
    ...(linked ? { actorId: tokenDoc.actor?.id ?? tokenDoc.actorId } : { tokenUuid: tokenDoc?.uuid }),
  };
}

/** Is `record` the token (or its actor) that is being struck? */
export function recordMatches(record, tokenDoc, actor)
{
  if(!record) return false;
  if(record.tokenUuid) return !!tokenDoc?.uuid && record.tokenUuid === tokenDoc.uuid;
  if(record.actorId) return !!actor?.id && record.actorId === actor.id && !actor.isToken;
  return false;
}

/** A protector that can still die in someone's place. */
export function canStandIn(protector)
{
  return hasProtectorRule(protector) && (Number(protector?.system?.health?.value) || 0) > 0;
}

/**
 * Would this much damage (already after the target's own rules) kill it?
 * A character is the Wounds table's answer, which watchdog.js already mirrors;
 * a creature dies at 0 HP (JADE p.30). Temporary HP is spent first in both.
 * The Immortality Injector means nothing kills, so there is nothing to offer.
 */
export function wouldKill(actor, dmg)
{
  if(!actor || !(dmg > 0)) return false;
  if(actor.type === "character") return wouldBeLethal(actor, dmg);
  if(actor.type === "vehicle") return false;
  if(suppressesDeath(actor)) return false;
  const hp = Number(actor.system?.health?.value) || 0;
  if(hp <= 0) return false;
  return hp - soakDamage(tempHpOf(actor), dmg).dmgLeft <= 0;
}

/**
 * Every living protector guarding this token. World actors and the scene's
 * unlinked tokens are both searched, since a Lictor spawned onto the map is
 * usually an unlinked token with its own synthetic actor.
 */
export function protectorsOf(tokenDoc, actor, { worldActors = [], sceneTokens = [] } = {})
{
  const seen = new Set();
  const out = [];
  const consider = a => {
    if(!a || seen.has(a.uuid) || a === actor) return;
    seen.add(a.uuid);
    if(canStandIn(a) && recordMatches(a.flags?.vaarn?.[PROTECTING_FLAG], tokenDoc, actor)) out.push(a);
  };
  for(const a of worldActors) consider(a);
  for(const t of sceneTokens) if(!t.actorLink) consider(t.actor);
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

/** The GM card's body: one button per protector, and one to let the blow land. */
export function heldBlowCard(protectee, protectors, dmg, attackerName, itemName)
{
  const buttons = protectors.map(p =>
    `<button type="button" class="vaarn-protector-die" data-protector-uuid="${p.uuid}">${p.name} dies instead</button>`).join("");
  return `<p><b>Look Out Sire</b> — ${attackerName}'s <b>${itemName}</b> would kill <b>${protectee.name}</b> (${dmg} damage). `
    + `The blow is held until the Referee chooses.</p>${buttons}`
    + `<button type="button" class="vaarn-protector-land">Let it land</button>`;
}
