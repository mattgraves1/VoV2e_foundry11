/**
 * Grafted Limb Creation — foundry-system-index.csv "Grafted Limb Creation".
 *
 * WHAT THE BOOK STATES (JADE IBIS, Bloomboons, Grafting): "You may graft a
 * piece of a biological creature to your branches or trunk, gaining extra
 * attacks or bonuses as appropriate. Every day the grafted part stays alive,
 * lose 1 point of CON."
 *
 * THE RULINGS (Matt, 2026-09-24):
 *   - THE GM MAKES THE GRAFT. The sheet only tells the player the character
 *     has Grafting; the GM adjudicates it in play and puts the part on the
 *     sheet with the Grant Graft macro (macros/grant-graft.js).
 *   - COPY FIRST, BUILD YOUR OWN AS THE FALLBACK. The main route copies one of
 *     a biological Bestiary creature's natural attacks - all of them, the
 *     Item as the pack built it, so its saves, conditions and ability damage
 *     behave for the new host as they did on the creature. The second copies
 *     a roster part whose mechanic is already implemented (a mutation's
 *     natural weapon or AV). The fallback is built by hand, the GM setting the
 *     benefit: an attack, or a trait with an AV bonus and free text.
 *   - ONE ITEM PER GRAFT, named for the part: a creature's "2 x Claw" becomes
 *     "Grafted Claw".
 *   - ONE GRAFT per character - the book says "a piece".
 *   - THE DAILY CON LOSS is Hivey Hump's shape: a Long-Clock Recurrence
 *     (recurrence-data.js "graft") of ordinary ability damage, started with
 *     the graft.
 *   - THE PLAYER CAN REMOVE IT, which ends the graft: the daily loss stops
 *     with the Item (onGraftDeleted, on deleteItem).
 *
 * DECIDED IN THE BUILD, NOT RULED: a mutation copied as a graft carries its
 * natural weapon or its AV and nothing else live. Clauses keyed on the
 * mutation's own name (Quills' no-armour, a crown's no-helmet) stay as text
 * on the graft, because those lookups are by the mutation's name.
 */

import { normalizeDamageDice } from "./chargen-app.js";
import { startRecurrence, stopRecurrence } from "../time/recurrence.js";
import { entriesOf } from "../time/effect-board.js";

const SCOPE = "vaarn";
export const GRAFT_FLAG = "graft";
export const GRAFT_RECURRENCE = "graft";

/** The six damage types a hand-built attack may carry, as weapon tags. */
export const GRAFT_DAMAGE_TYPES = ["Beam", "Blast", "Flame", "Electrical", "TOX"];

/** Whether this Item is a graft. */
export function isGraft(item)
{
  return !!item?.flags?.[SCOPE]?.[GRAFT_FLAG];
}

/** The AV a graft adds, or 0. */
export function graftAv(item)
{
  return Number(item?.flags?.[SCOPE]?.[GRAFT_FLAG]?.av || 0);
}

/** Whether this character has the Grafting Bloomboon. */
export function hasGrafting(actor)
{
  return actor?.items?.some(i => i.type === "ancestry" && i.system?.rule === "Bloomboons"
    && i.system?.variant === "Grafting") ?? false;
}

/** Why this character cannot take a graft, or null. */
export function graftRefusal(actor)
{
  if (!actor || actor.type !== "character") return "Choose a character.";
  if (!hasGrafting(actor)) return `${actor.name} does not have the Grafting Bloomboon.`;
  const held = actor.items.find(isGraft);
  if (held) return `${actor.name} already has a graft (${held.name}); remove it first.`;
  return null;
}

/**
 * Every natural attack on a biological creature in the pack:
 * [{ creature, part, item }]. The pack builds an attack with `carried: false`
 * as an intrinsic weapon Item, which is what marks it a body part.
 */
export function creatureParts(creatures)
{
  const out = [];
  for (const c of creatures ?? [])
  {
    if (!c.system?.creatureTypes?.biological) continue;
    for (const i of c.items ?? [])
      if ((i.type === "weaponMelee" || i.type === "weaponRanged") && i.system?.intrinsic)
        out.push({ creature: c.name, part: i.name, item: i });
  }
  return out.sort((a, b) => a.creature.localeCompare(b.creature) || a.part.localeCompare(b.part));
}

function tag(flags, graft)
{
  const f = foundry.utils.deepClone(flags ?? {});
  f[SCOPE] = { ...(f[SCOPE] ?? {}), [GRAFT_FLAG]: graft };
  return f;
}

/** A graft copied from a creature's attack Item. `ranged` switches the type. */
export function graftFromCreaturePart(creature, item, { ranged = false } = {})
{
  const src = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
  return {
    name: `Grafted ${src.name}`,
    type: ranged ? "weaponRanged" : "weaponMelee",
    img: src.img,
    system: { ...src.system, slots: 0, hands: 0, equipped: true, intrinsic: true,
              description: `<p>Grafted from a <b>${creature}</b>'s ${src.name}.</p>${src.system?.description ?? ""}` },
    flags: tag(src.flags, { source: "creature", creature, part: src.name })
  };
}

/** A graft copied from a mutation roster entry: its natural weapon or its AV. */
export function graftFromMutation(entry)
{
  const text = `<p>Grafted from the <b>${entry.name}</b> mutation.</p><p>${entry.effect}</p>`;
  if (entry.naturalWeapon)
  {
    const nw = entry.naturalWeapon;
    return {
      name: `Grafted ${nw.name}`,
      type: nw.type === "ranged" ? "weaponRanged" : "weaponMelee",
      system: { slots: 0, equipped: true, hands: 0, intrinsic: true, damageDice: normalizeDamageDice(nw.damage),
                base_tags: [...(nw.tags ?? [])], description: text + (nw.note ? `<p>${nw.note}</p>` : "") },
      flags: tag({}, { source: "mutation", mutation: entry.name })
    };
  }
  return {
    name: `Grafted ${entry.name}`,
    type: "item",
    system: { slots: 0, intrinsic: true, description: text },
    flags: tag({}, { source: "mutation", mutation: entry.name, av: Number(entry.avBonus || 0) })
  };
}

/**
 * A graft built by hand. kind "attack": { name, ranged, die, damageType };
 * kind "trait": { name, av, text }.
 */
export function graftCustom(spec)
{
  const name = `Grafted ${String(spec.name || "Part").trim()}`;
  const text = spec.text ? `<p>${spec.text}</p>` : "";
  if (spec.kind === "attack")
    return {
      name,
      type: spec.ranged ? "weaponRanged" : "weaponMelee",
      system: { slots: 0, equipped: true, hands: 0, intrinsic: true, damageDice: normalizeDamageDice(spec.die || "d6"),
                base_tags: spec.damageType ? [spec.damageType] : [],
                description: `<p>A grafted body part, built by the Referee.</p>${text}` },
      flags: tag({}, { source: "custom" })
    };
  return {
    name,
    type: "item",
    system: { slots: 0, intrinsic: true, description: `<p>A grafted body part, built by the Referee.</p>${text}` },
    flags: tag({}, { source: "custom", av: Math.max(0, Number(spec.av) || 0) })
  };
}

/**
 * Put the graft on the character and start its daily CON loss. Returns
 * { error } or { item }.
 */
export async function createGraft(actor, data)
{
  const refusal = graftRefusal(actor);
  if (refusal) return { error: refusal };
  const [made] = await actor.createEmbeddedDocuments("Item", [data]);
  await startRecurrence(actor, { recurrenceKey: GRAFT_RECURRENCE, itemId: made.id, name: `Graft (${made.name})` });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
    content: `takes a graft: <b>${made.name}</b> — 1 CON lost every day it stays alive.` });
  return { item: made };
}

/**
 * THE GRAFT ENDS WITH ITS ITEM, on deleteItem: the daily CON loss stops. Only
 * the deleting client writes, so two GMs connected do not stop it twice.
 */
export async function onGraftDeleted(item, options, userId)
{
  if (userId !== game.user.id || !isGraft(item)) return;
  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;
  for (const e of entriesOf(actor).filter(e => e.kind === "recurrence" && e.itemId === item.id))
    await stopRecurrence(actor, e.id);
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
    content: `removes the <b>${item.name}</b> — the graft ends, and so does its daily CON loss.` });
}
