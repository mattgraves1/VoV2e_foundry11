/**
 * Bloomboon Growth — foundry-system-index.csv "Bloomboon Growth".
 *
 * WHAT THE BOOK STATES (JADE IBIS, the Bloomboons list). Five Bloomboons are
 * paid for in ability points and grow a part: Shield Vines (+1 AV), Lashing
 * Vines (+1 melee attack, d6), Seed Cannon (ranged, d6), Tesla Bloom (ranged
 * electrical, d6, ADV to hit synthetics) and Blast Pods (ranged, d10 blast);
 * the points "cannot be healed until all [parts] are shed". Two are paid for
 * in d6 HP and grow a one-slot fruit that spoils after one day: Medicinal
 * Fruit heals the HP used to grow it, Toxic Fruit causes d6 TOX damage.
 *
 * THE RULINGS (Matt, 2026-09-24):
 *   - THE COST LOWERS THE BASE SCORE, it is not ability damage, so nothing has
 *     to stop ability damage healing while a part lives. The part Item carries
 *     the malus itself (flags.vaarn.grownPart) and actor.js subtracts it live,
 *     the way an implant's liveAbilityBonus is added — nothing is written to
 *     the score, so the malus cannot drift from the parts.
 *   - SHEDDING restores the base and turns the same amount into ordinary
 *     ability damage. Shed is a control on the part, usable any time, and
 *     deleting the part is shedding too: the conversion runs on deleteItem, so
 *     every route to removing a part pays it.
 *   - SEVERAL of the same part may be grown, each its own Item.
 *   - REFUSED if the cost would take the base below 0.
 *   - A FRUIT may be grown at any positive HP. The HP is paid through the
 *     sheet's damage funnel, so a roll that reaches 0 or below gives a Wound
 *     exactly as combat damage does.
 *   - GROWING TAKES NO ACTION.
 *   - A FRUIT SPOILS at the next Start the day (module/time/perishable.js,
 *     "Perishable Spoiling"). A spoiled fruit's only use is as a rotting meal,
 *     and it can still be discarded.
 */

import { SPARK_TABLES } from "./chargen-data.js";
import { postToxSave } from "../combat/compelled-save.js";
import { PERISHABLE_FLAG, isSpoiled } from "../time/perishable.js";

const SCOPE = "vaarn";
export const GROWN_FLAG = "grownPart";
export const FRUIT_FLAG = "fruit";

const LABEL = { str: "STR", dex: "DEX", con: "CON", int: "INT", psy: "PSY", ego: "EGO" };

/** The Bloomboon roster row by name, or null. */
export function bloomboonEntry(name)
{
  return (SPARK_TABLES["Neobloom"]?.bloomboon_table ?? []).find(b => b.name === name) ?? null;
}

/** Whether this Item is a grown part. */
export function isGrownPart(item)
{
  return !!item?.flags?.[SCOPE]?.[GROWN_FLAG];
}

/** Whether this Item is a grown fruit. */
export function isGrownFruit(item)
{
  return !!item?.flags?.[SCOPE]?.[FRUIT_FLAG];
}

/** The live base-score malus every grown part on these Items adds up to: {dex: 4}. */
export function grownPartMalus(items)
{
  const out = {};
  for (const i of items ?? [])
  {
    const g = i.flags?.[SCOPE]?.[GROWN_FLAG];
    if (!g?.ability) continue;
    out[g.ability] = (out[g.ability] || 0) + Number(g.cost || 0);
  }
  return out;
}

/** The AV one grown part adds (Shield Vine), or 0. */
export function grownPartAv(item)
{
  return Number(item?.flags?.[SCOPE]?.[GROWN_FLAG]?.av || 0);
}

/**
 * Why this Bloomboon cannot be grown right now, or null. An ability cost may
 * not take the base below 0, counting the parts already grown; a fruit needs
 * positive HP.
 */
export function growthRefusal(actor, grows)
{
  const cost = grows?.cost ?? {};
  if (cost.ability)
  {
    const base = Number(actor.system.abilities?.[cost.ability]?.value ?? 0);
    const held = grownPartMalus(actor.items)[cost.ability] || 0;
    const left = base - held;
    if (left - cost.amount < 0)
      return `${actor.name} cannot grow a ${grows.part.name}: it costs ${cost.amount} ${LABEL[cost.ability]}, `
           + `and their ${LABEL[cost.ability]} base is ${left}${held ? ` after the parts already grown` : ""}.`;
    return null;
  }
  if (cost.hp && Number(actor.system.health?.value ?? 0) <= 0)
    return `${actor.name} has no HP to spend on a ${grows.fruit.name}.`;
  return null;
}

/** The Item data for a grown part. */
export function partItemData(boon)
{
  const part = boon.grows.part;
  const { ability, amount } = boon.grows.cost;
  const description = `<p>Grown from the <b>${boon.name}</b> Bloomboon. `
    + `Its ${LABEL[ability]} ${amount} is off your base while it lives; shedding it turns that into ordinary ${LABEL[ability]} damage.</p>`
    + `<p><b>${boon.name}:</b> ${boon.effect}</p>`;
  const flags = { [SCOPE]: { [GROWN_FLAG]: { bloomboon: boon.name, ability, cost: amount, av: part.av || 0 } } };
  if (part.advantageVs?.length)
    flags[SCOPE].advantageVs = [{ rule: part.name, types: part.advantageVs }];

  if (part.weapon)
    return {
      name: part.name,
      type: part.weapon.type === "ranged" ? "weaponRanged" : "weaponMelee",
      system: { slots: 0, equipped: true, hands: 0, intrinsic: true, damageDice: `1${part.weapon.damage}`,
                base_tags: [...(part.weapon.tags ?? [])], description },
      flags
    };
  return { name: part.name, type: "item", system: { slots: 0, intrinsic: true, description }, flags };
}

/** The Item data for a grown fruit, recording the HP it cost. */
export function fruitItemData(boon, hpSpent)
{
  const fruit = boon.grows.fruit;
  const eaten = fruit.eaten === "heal"
    ? `Eaten, it heals ${hpSpent} HP (the HP used to grow it).`
    : `Eaten, it causes ${fruit.tox} TOX damage.`;
  return {
    name: fruit.name,
    type: "item",
    system: { slots: 1, description: `<p>Grown from the <b>${boon.name}</b> Bloomboon for ${hpSpent} HP. ${eaten} It spoils at the next Start the day.</p>`
                                   + `<p><b>${boon.name}:</b> ${boon.effect}</p>` },
    flags: { [SCOPE]: {
      [FRUIT_FLAG]: { bloomboon: boon.name, eaten: fruit.eaten, hp: hpSpent, tox: fruit.tox ?? null },
      [PERISHABLE_FLAG]: { grownAt: game.time?.worldTime ?? 0, spoiled: false }
    } }
  };
}

/**
 * Eat a grown fruit: Medicinal heals the recorded HP up to max, Toxic posts
 * the eater's own TOX save. A spoiled fruit is refused and kept. Returns a
 * refusal string, or null once eaten.
 */
export async function eatFruit(actor, item)
{
  const fruit = item.flags?.[SCOPE]?.[FRUIT_FLAG];
  if (!fruit) return null;
  if (isSpoiled(item))
    return `${item.name} is only good as a rotting meal now.`;

  if (fruit.eaten === "heal")
  {
    const hp = Number(actor.system.health.value);
    const max = Number(actor.system.health.max);
    const healed = Math.max(0, Math.min(max, hp + Number(fruit.hp)) - hp);
    await actor.update({ "system.health.value": hp + healed });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `eats a <b>${item.name}</b> and heals <b>${healed}</b> HP.` });
  }
  else
  {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `eats a <b>${item.name}</b> — ${fruit.tox} TOX damage.` });
    await postToxSave(actor, item, null, fruit.tox, { saver: actor });
  }
  await item.delete();
  return null;
}

/**
 * THE SHED, on deleteItem: the part's malus comes off the base (the Item is
 * gone, so actor.js stops subtracting it) and the same amount lands as
 * ordinary ability damage. Only the deleting client writes, so two GMs
 * connected do not pay it twice.
 */
export async function onGrownPartDeleted(item, options, userId)
{
  if (userId !== game.user.id) return;
  const g = item.flags?.[SCOPE]?.[GROWN_FLAG];
  const actor = item.parent;
  if (!g?.ability || !actor || actor.documentName !== "Actor") return;
  const key = `system.abilities.${g.ability}.woundDamage`;
  const now = Number(actor.system.abilities?.[g.ability]?.woundDamage ?? 0);
  await actor.update({ [key]: now + Number(g.cost) });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
    content: `sheds a <b>${item.name}</b> — its ${g.cost} ${LABEL[g.ability]} returns to the base as ordinary ${LABEL[g.ability]} damage.` });
}
