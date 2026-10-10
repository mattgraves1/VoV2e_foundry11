/**
 * The weapon translator - Effect Engine: Weapon Tags, chunk 2 (foundry-
 * system-index.csv "Effect Engine: Weapon Tags", BUILD PLAN RULED 2026-10-05
 * by Matt).
 *
 * A weapon's sentences, rebuilt from its tags by name: each name in
 * `system.tags` that weapon-tag-effects-data.js knows contributes its
 * sentences, in tag order. A weapon carrying its own vaarn.effects is read
 * from that instead (interpret.js sentencesOf), so nothing is migrated and a
 * GM-built weapon is never second-guessed.
 *
 * Names the table does not know - the base damage tags (Slashing, Beam...),
 * which are damage types and wait for Stats as Sentences - contribute nothing
 * here and are still read where they always were.
 */
import { registerTranslator, sentencesOf, meetsState, hasTranslator } from "../effects/interpret.js";
import { itemStateDefault } from "../effects/vocabulary.js";
import { normalise } from "../effects/sentence.js";
import { WEAPON_TAG_EFFECTS } from "./weapon-tag-effects-data.js";
import { EXOTICA_EFFECTS } from "../actor/exotica-effects-data.js";
import { floraEffects } from "../actor/flora-effects-data.js";
import { creatureWeaponSentencesOf } from "./creature-effects.js";
import { bodySentences } from "../effects/body.js";

export const WEAPON_TYPES = ["weaponMelee", "weaponRanged"];

/** The sentences a weapon's tags mean, in tag order. */
export function weaponTagSentences(item)
{
  const out = [];
  for (const tag of item?.system?.tags ?? [])
    for (const s of WEAPON_TAG_EFFECTS[tag]?.effects ?? []) out.push({ ...s, tag });
  // An Exotica weapon's own sentences, by its name - the Philosopher's Dirk's
  // INT loss on a hit, the Tempest Cannon's reload (Implants, Exotica and
  // Figments chunk 3b-ii, 2026-10-06). Tagged with its name, as an Exotica's are.
  if (item?.flags?.vaarn?.exotica === true)
    for (const s of EXOTICA_EFFECTS[item?.name]?.effects ?? []) out.push({ ...s, tag: item.name });
  // A plant weapon's own, by its name - the Avern Bloom's toxin, the Swordgrass
  // leaf's dice (Effect Engine: Consumables chunk 3c, 2026-10-06, ruling B).
  for (const s of floraEffects()[item?.name]?.effects ?? []) out.push({ ...s, tag: item.name });
  return out;
}

/**
 * The sentences the interpreter may apply: everything but the baked stats,
 * which the weapon's own fields already hold (ruling A).
 */
export function liveSentences(list)
{
  return (list ?? []).filter(s => !s.baked);
}

// A creature's attack flags (Effect Engine: Creatures chunk 2a, RULED 2026-10-06,
// Matt) in front of its tags - the moved flags only, read by creatureAttackOf.
const creatureFirst = item => [...creatureWeaponSentencesOf(item), ...weaponTagSentences(item)];
for (const type of WEAPON_TYPES) registerTranslator(type, creatureFirst);

// A creature's sentence carries do.from (Creatures chunk 2a). EXCLUDED AT THE
// SOURCE since chunk 2b (RULED 2026-10-06, Matt): sentencesFor below hands no
// reader here a creature's sentence - creatureFlagsOf reads those - so a creature's
// dice armour loss never meets a tag's fixed sum, its save never posts a second
// card, and nothing counts twice. One rule, in place of 2a's three skips.
const notCreature = s => !s.do?.from;

/* ---------------------------------------------------------------------------
 * THE HIT-TIME READERS - Effect Engine: Weapon Tags, chunk 3 (RULED
 * 2026-10-05 by Matt). What a weapon does on a hit, read from its sentences
 * (its own vaarn.effects, or its tags through the translator) rather than
 * from tables keyed by tag name. Each returns the shape its caller already
 * took, so the save cards, the ability-damage lines and the armour lines are
 * unchanged; tools/test-weapon-tags.mjs holds the sentences to those tables.
 * ------------------------------------------------------------------------- */

const trig = s => (typeof s.when === "string" ? s.when : s.when?.trigger);
const gates = s => s.if ?? [];
const hasGate = (s, name) => gates(s).some(g => g.gate === name);

/**
 * An Item's sentences for the hit readers: its own vaarn.effects, else its
 * tags - read from ANY Item that carries tags, as the old tag readers did, so
 * an Exotica that is not a weapon type keeps its tags' effects.
 *
 * GM Effect Builder chunk 1 (2026-10-05): every reader below reads ANY Item
 * type, so an Item whose type has its own translator (a Gift, and each kind
 * as its conversion step lands) is read through that one, not through tags.
 */
function sentencesFor(item)
{
  if (Array.isArray(item?.flags?.vaarn?.effects) || hasTranslator(item?.type)) return sentencesOf(item).filter(notCreature);
  return weaponTagSentences(item).map(normalise);
}

/**
 * THE BEARER'S BODY ON AN ATTACK - GM Effect Builder: Widening chunk 2 (RULED
 * 2026-10-09, Matt). A worn or carried Item's hit and roll sentences reach
 * every attack its bearer makes; a weapon's are its own attack's and are never
 * read from another weapon's (ruling 1) - body.js BODY_TYPES has no weapon.
 * Each body sentence is tagged by its own Item, so the save card, the ability-
 * damage line and the note name the monocle, not the dagger. Read from the
 * attacking Item's owner (an owned Item's parent); an unowned Item has no body.
 */
function bodyFor(item, trigger)
{
  const actor = item?.parent;
  if (!actor?.items) return [];
  return bodySentences(actor, trigger).filter(p => !p.item || p.item.id !== item.id)
    .map(p => ({ ...p.sentence, tag: p.sentence.tag ?? p.source }));
}

/** The live sentences an attack-hit runs: the Item's own and the bearer's body's. */
export function hitSentences(item)
{
  return [...liveSentences(sentencesFor(item)).filter(s => trig(s) === "attack-hit"), ...bodyFor(item, "attack-hit")];
}

/** Who a sentence's gates limit it to, in the old spec words. */
function limits(s)
{
  const out = {};
  if (gates(s).some(g => g.gate === "creature-type" && g.is === "biological")) out.targets = ["biological"];
  const pc = gates(s).find(g => g.gate === "is-pc");
  if (pc) out.actorTypes = pc.is === false ? ["npc"] : ["character"];
  return out;
}

/**
 * The saves a hit compels, one entry per source (a tag, or the Item):
 * [{ source, saves: [{ ability, mode, vs, targets?, actorTypes?, onFail? }],
 *    applies: [{ condition, amount?, unit? }] }] - what postSaveCard takes.
 */
export function hitSaveSpecs(item)
{
  const bySource = new Map();
  for (const s of hitSentences(item).filter(x => x.resist))
  {
    const source = s.tag ?? item?.name ?? "";
    const entry = bySource.get(source) ?? { source, saves: [], applies: [] };
    const ability = s.resist.type === "morale" ? "morale" : s.resist.ability;
    // A GM's sentence has no `vs`: its own words stand in, without a closing
    // full stop the card adds itself (GM Effect Builder, Group 536.5).
    const save = { ability, mode: "resist", vs: s.resist.vs ?? String(s.text ?? "").replace(/\.\s*$/, ""), ...limits(s) };
    if (s.do?.verb === "kill") save.onFail = { death: true };
    entry.saves.push(save);
    if (s.do?.verb === "condition")
      entry.applies.push(s.for?.duration === "rounds" ? { condition: s.do.state, amount: Number(s.for.amount), unit: "round" } : { condition: s.do.state });
    bySource.set(source, entry);
  }
  return [...bySource.values()];
}

/** The ability damage a hit deals: [{ ability, dice, targets?, source, tag }]. */
export function hitAbilityDamage(item)
{
  return hitSentences(item).filter(s => s.do?.verb === "ability-damage" && !s.resist)
    .map(s => ({ ability: s.do.ability, dice: s.do.dice, ...(limits(s).targets ? { targets: limits(s).targets } : {}),
                 source: s.tag ?? item?.name ?? "", tag: s.tag ?? null }));
}

/**
 * What refills a spent usage die without an attack - the Tempest Cannon's three
 * Water Rations - from the weapon's refill sentence (chunk 3b-ii, 2026-10-06):
 * { item, count }, or null.
 */
export function reloadOf(item)
{
  const s = sentencesFor(item).find(x => trig(x) === "use" && x.do?.verb === "refill" && x.do.item);
  return s ? { item: s.do.item, count: Number(s.do.count ?? 1) } : null;
}

/** The armour a hit strips on its own (Ultra-Corrosive's -2), not the declared Corrosive choice. */
export function hitArmourLoss(item)
{
  return hitSentences(item).filter(s => s.do?.verb === "modify" && s.do.stat === "armour-damage" && !hasGate(s, "targets-armour"))
    .reduce((n, s) => n + Number(String(s.do.amount).replace("+", "")), 0);
}

/** Does this weapon offer the Corrosive choice - armour instead of damage, the roller's toggle (ruling D)? */
export function offersArmourChoiceFromSentences(item)
{
  return hitSentences(item).some(s => hasGate(s, "targets-armour"));
}

/** Mauling and Piercing: the AV-band sentences, as { boost: [s], halve: [s] }. */
export function avBandSentences(item)
{
  const band = hitSentences(item).filter(s => hasGate(s, "target-av"));
  return {
    boost: band.filter(s => s.do?.stat === "damage-dice"),
    halve: band.filter(s => s.do?.stat === "damage" && s.do.amount === "x0.5")
  };
}

/** A hit that changes the TARGET's AV (Lithifying's +1, ruled per hit and stacking). */
export function hitTargetAv(item)
{
  return hitSentences(item).filter(s => s.do?.verb === "modify" && s.do.stat === "av");
}

/** "At 0 DEX ..." - the value-reaches sentences a weapon carries (Freezing, Lithifying). */
export function valueReachesSentences(item)
{
  return liveSentences(sentencesFor(item)).filter(s => trig(s) === "value-reaches");
}

/* ---------------------------------------------------------------------------
 * THE ATTACK READERS - Effect Engine: Weapon Tags, chunk 4 (RULED 2026-10-05
 * by Matt). The attack roll, the natural 1, a miss against the wielder, the
 * heal a hit or a kill gives. Gates are left on the sentences: the caller
 * settles them (gates.js), since only it knows the target and the roll.
 * ------------------------------------------------------------------------- */

const liveOf = item => liveSentences(sentencesFor(item));

/**
 * The Item's OWN attack-roll sentences: the to-hit ability (what the attack
 * is), auto-hits, natural rolls - about this attack, not the bearer.
 */
export function attackRollSentences(item)
{
  return liveOf(item).filter(s => trig(s) === "attack-roll");
}

/** The attack-roll sentences the bearer's body adds to every attack (Widening chunk 2): armour ignored, forbids. */
export function bearerAttackRollSentences(item)
{
  return [...attackRollSentences(item), ...bodyFor(item, "attack-roll")];
}

/**
 * The to-hit abilities the bearer's body OFFERS for this attack (Widening
 * chunk 2, ruling 2): [{ ability, source }]. An offer never makes the attack
 * worse - the caller rolls with the highest bonus among the weapon's default
 * and these - and a weapon's own to-hit ability (toHitAbility) replaces the
 * default and ignores them.
 */
export function toHitOffers(item)
{
  return bodyFor(item, "attack-roll").filter(s => s.do?.verb === "modify" && s.do.stat === "to-hit-ability")
    .map(s => ({ ability: s.do.amount, source: s.tag }));
}

/** The ability the to-hit roll uses instead of STR/DEX (Psionic's PSY), or null. */
export function toHitAbility(item)
{
  return attackRollSentences(item).find(s => s.do?.verb === "modify" && s.do.stat === "to-hit-ability")?.do.amount ?? null;
}

/** An ability added to damage (Psionic's EGO): [{ ability, tag }]. */
export function damageAbilityBonus(item)
{
  return hitSentences(item).filter(s => s.do?.verb === "modify" && s.do.stat === "damage" && /^\+@/.test(String(s.do.amount)))
    .map(s => ({ ability: String(s.do.amount).slice(2), tag: s.tag ?? item?.name ?? "" }));
}

/** Does the attack hit as though the target were unarmoured (Vibroactive)? */
export function ignoresArmour(item)
{
  // The weapon's own, or a body Item's (Widening chunk 2, ruling 3: the sentence, not yet an actor state).
  return bearerAttackRollSentences(item).some(s => s.do?.verb === "ignore-armour");
}

/** The auto-hit sentences (Heat-Seeking), gated per target. */
export function autoHitSentences(item)
{
  return attackRollSentences(item).filter(s => s.do?.verb === "auto-hit");
}

/** The sentences that forbid the attack (Flaming underwater / against the submerged). */
export function attackForbids(item)
{
  return bearerAttackRollSentences(item).filter(s => s.do?.verb === "forbid" && s.do.what === "attack");
}

/** What the natural roll sets off: item-state breakages and an explosion's damage. */
export function naturalRollSentences(item)
{
  return attackRollSentences(item).filter(s => hasGate(s, "natural-roll"));
}

/** Does this Item forbid something of itself - break, destroy, corrode (Strong, Indestructible, Laquered)? */
export function itemForbids(item, what)
{
  return liveOf(item).some(s => trig(s) === "passive" && s.do?.verb === "forbid" && s.do.what === what);
}

/** A miss against the wielder that strikes back (Reflecting). */
export function reflectsMisses(item)
{
  return liveOf(item).some(s => trig(s) === "when-missed" && s.do?.verb === "reflect");
}

/** The body Items that strike a miss against the bearer back (Widening chunk 2): [{ item, source }]. */
export function bodyReflects(actor)
{
  return bodySentences(actor, "when-missed").filter(p => p.sentence.do?.verb === "reflect").map(p => ({ item: p.item, source: p.source }));
}

/** The heal a hit gives the wielder (Vampiric's half the damage dealt), gated per target. */
export function hitHealSentences(item)
{
  return hitSentences(item).filter(s => s.do?.verb === "heal");
}

/** The heal a kill gives the wielder (Blood-Rapturous's victim's max HP), gated per victim. */
export function killHealSentences(item)
{
  return [...liveOf(item).filter(s => trig(s) === "on-kill" && s.do?.verb === "heal"), ...bodyFor(item, "on-kill").filter(s => s.do?.verb === "heal")];
}

/* ---------------------------------------------------------------------------
 * THE PASSIVE, EQUIP AND DECLARED READERS - Effect Engine: Weapon Tags chunk
 * 5a (RULED 2026-10-05 by Matt).
 * ------------------------------------------------------------------------- */

/** The equip forbids, each with its gate (Heavy and Colossal: STR below +3 / +6). */
export function equipForbids(item)
{
  return liveOf(item).filter(s => trig(s) === "passive" && s.do?.verb === "forbid" && s.do.what === "equip");
}

/** What drawing (equipping) the weapon does to its wielder (Annihilating's -1 max HP). */
export function drawSentences(item)
{
  return liveOf(item).filter(s => trig(s) === "on-draw");
}

/** The named one-off handlers a set of tag names carries (Polymorphic), read before the Item exists. */
export function specialHandlersOfTags(tags)
{
  return (tags ?? []).flatMap(t => (WEAPON_TAG_EFFECTS[t]?.effects ?? []).filter(s => s.do?.verb === "special").map(s => s.do.handler));
}

/**
 * The AV a held weapon's passive sentences give its bearer (Aegis-Bearing's
 * +5, ruling F: any holder) - counted only while the weapon is in its state.
 */
export function passiveAvOf(item)
{
  return liveOf(item)
    .filter(s => trig(s) === "passive" && s.do?.verb === "modify" && s.do.stat === "av" && meetsState(item, s.state ?? itemStateDefault(item?.type)))
    .reduce((n, s) => n + (Number(String(s.do.amount).replace("+", "")) || 0), 0);
}

/**
 * The reminders a weapon shows on the Forgettable Effects tab, by tag: its
 * passive reminders, its reaction-roll rules (Sacred, Blasphemous) and its
 * adjudicated use reminders (Rocket Boosted's altitude). `inForce` is false
 * when the sentence needs the weapon in a state it is not in - the tab then
 * says "(equip it to use this)" (Matt, 2026-10-05).
 */
export function tabReminders(item)
{
  return liveOf(item)
    .filter(s => s.tag && ["passive", "on-reaction-roll", "use"].includes(trig(s)) && ["reminder", "adv", "dis"].includes(s.do?.verb))
    .map(s =>
    {
      const need = trig(s) === "passive" ? (s.state ?? itemStateDefault(item?.type)) : (s.requires ?? "carried");
      return { tag: s.tag, text: s.text ?? "", inForce: meetsState(item, need) };
    });
}

/** The hit reminders posted after an attack roll (Flaming's "ignites flammable objects"). */
export function hitReminders(item)
{
  // A GM's note (no tag) is named by its label or its Item - GM Effect Builder chunk 2.
  // A body note (Widening chunk 2) is tagged by its Item; a label the GM gave it heads the line.
  return hitSentences(item).filter(s => s.do?.verb === "reminder").map(s => `${s.label ?? s.tag ?? item?.name ?? ""}: ${s.text ?? ""}`);
}

/** A charge's extra damage die (Rocket Boosted's +d12), the charge toggle answering its gate (ruling D). */
export function chargeDamage(item)
{
  return hitSentences(item).find(s => s.do?.verb === "damage" && hasGate(s, "charging")) ?? null;
}

/* ---------------------------------------------------------------------------
 * LIGHT - Effect Engine: Weapon Tags chunk 5b (Matt, 2026-10-05): Luminous
 * sheds light from the bearer's token while equipped, in the weapon's colour.
 * ------------------------------------------------------------------------- */

/** Does this weapon carry an emit-light sentence at all (the sheet offers a colour)? */
export function emitsLight(item)
{
  return liveOf(item).some(s => trig(s) === "passive" && s.do?.verb === "emit-light");
}

/** The light this weapon gives its bearer now - { tier, color, source } - or null. */
export function emittedLightOf(item)
{
  const s = liveOf(item).find(x => trig(x) === "passive" && x.do?.verb === "emit-light" && meetsState(item, x.state ?? itemStateDefault(item?.type)));
  if (!s) return null;
  // A colour the sentence names (Lumenrot's green, Wounds and Afflictions chunk 3)
  // unless the sheet set one (Luminous).
  return { tier: s.do.tier ?? "source", color: item?.flags?.vaarn?.lightColor ?? s.do.color ?? null, source: item?.name ?? null };
}

/* ---------------------------------------------------------------------------
 * RATIONS AND AMMO - Effect Engine: Weapon Tags chunk 5c (Matt, 2026-10-05).
 * ------------------------------------------------------------------------- */

/** How many rations a day this weapon makes its bearer eat and drink (Parasitic's double), or 1. */
export function rationTimesOf(item, key = null)
{
  // WHICH RATION (Mutations and Ancestry Rules chunk 2a, 2026-10-05): Parasitic's
  // upkeep names "Ration" - food and water both; Gills' names "Water Ration" and
  // doubles only water. `key` is "food" or "water"; none counts any.
  const counts = s => !key || s.do.item === "Ration" || s.do.item === (key === "water" ? "Water Ration" : "Food Ration");
  return Math.max(1, ...liveOf(item).filter(x => trig(x) === "passive" && x.do?.verb === "upkeep" && counts(x)
    && meetsState(item, x.state ?? itemStateDefault(item?.type))).map(x => Number(x.do.times ?? 1)));
}

/** The rest-time refill a weapon can be fed for (Fungal), or null. */
export function restFeedOf(item)
{
  return liveOf(item).find(x => trig(x) === "on-rest" && x.do?.verb === "refill" && x.do.what === "ammo") ?? null;
}

/* ---------------------------------------------------------------------------
 * REACTION ROLLS - Reaction Roll Button (2026-10-05): what a weapon carried by
 * the speaking PC does to a reaction roll (Sacred's ADV, Blasphemous's DIS).
 * ------------------------------------------------------------------------- */

/** The on-reaction-roll sentences a weapon carries in its required state. */
export function reactionSentences(item)
{
  return liveOf(item).filter(s => trig(s) === "on-reaction-roll" && meetsState(item, s.requires ?? "carried"));
}
