/**
 * Spirit Form (foundry-system-index.csv "Spirit Form") - the unquiet spirit a
 * dead PC can become (Miscellany/Resurrection and Death, "Returning as a
 * Spirit"). RULED 2026-09-27 (Matt), his design:
 *
 *   - a compendium Actor, "Unquiet Spirit" in the Bestiary, spawned by the
 *     Resurrect Character macro as "Spirit of <PC name>", Level and max HP from
 *     the PC, owned by the PC's player;
 *   - Incorporeal, no attack; three usable abilities on its sheet - Manipulate
 *     Object (spend d6 HP), Possess (spend d6 + the target's Level HP, Possessed
 *     on the target for one Exploration Turn) and Long Rest (HP to full, no
 *     rations; an npc has no rest path, so the rest is an ability);
 *   - at 0 HP it fades into the aether until sunrise - the npc death surface
 *     posts that instead of a kill, and nothing died.
 *
 * NO DEAD STATE, as with every route: the dead PC's Actor is left as it is.
 *
 * THE HP SPEND GOES THROUGH THE SHEET'S OWN ENTRY POINT (_resolveHPChange),
 * not a direct write, so reaching 0 posts the fade through the one surface
 * that knows about suppression and kills. Abilities are the PC's own values -
 * the spirit IS the dead PC, and the book gives it no others (a reading, not
 * book text).
 */

import { spawnNamedCreature } from "./bestiary-spawn.js";
import { postApplyCard } from "../combat/apply-to-target.js";

export const SPIRIT_NAME = "Unquiet Spirit";
export const SPIRIT_TARGET = 16;

/** Is this actor a PC's spirit? Set at spawn, so a rename keeps it. */
export function isSpirit(actor)
{
  return !!actor?.flags?.vaarn?.spirit;
}

/** What the npc death surface posts for a spirit at 0 HP. */
export function fadeMessage()
{
  return `<b>fades into the aether</b>, reduced to 0 HP by its exertions. It can reappear at sunrise the next day (its Long Rest).`;
}

/** The book's roll: d20 + the PC's Level, 16 or more. Posts the roll. */
export async function spiritRoll(pc)
{
  const level = Number(pc.system.level?.value ?? 1);
  const roll = new Roll("1d20 + @lvl", { lvl: level });
  await roll.evaluate({ async: true });
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: pc }),
    flavor: `<b>Returning as a Spirit</b> — d20 + Level ${level} vs ${SPIRIT_TARGET}`
  });
  return { roll, total: roll.total, success: roll.total >= SPIRIT_TARGET };
}

/**
 * Spawn the spirit of a dead PC from the compendium. Null when the Bestiary
 * pack has no Unquiet Spirit (a pack not yet synced).
 */
export async function spawnSpirit(pc)
{
  const actor = await spawnNamedCreature(SPIRIT_NAME, { rename: `Spirit of ${pc.name}` });
  if(!actor) return null;
  const hp = Math.max(1, Number(pc.system.health?.max ?? 1));
  const level = Math.max(1, Number(pc.system.level?.value ?? 1));
  const abilities = {};
  for(const key of ["str", "dex", "con", "int", "psy", "ego"])
    abilities[key] = { value: Number(pc.system.abilities?.[key]?.value ?? 0), max: 10, woundDamage: 0 };
  await actor.update({
    "system.level.value": level,
    "system.health.max": hp,
    "system.health.value": hp,
    "system.abilities": abilities,
    ownership: foundry.utils.deepClone(pc.ownership ?? {}),
    "flags.vaarn.spirit": { of: pc.id, name: pc.name }
  });
  return actor;
}

function card(actor, body)
{
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="vaarn-chat-card">${body}</div>`
  });
}

/**
 * The "use" icon of a usable ability. Spends or restores the bearer's HP as
 * the Item declares, and posts the Apply card for anything it puts on a
 * target. Returns what it did, for tests.
 */
export async function useAbility(actor, item)
{
  const u = item?.flags?.vaarn?.usable;
  if(!u || !actor) return null;

  if(u.restoreHp === "full")
  {
    const max = Number(actor.system.health.max);
    const before = Number(actor.system.health.value);
    await actor.update({ "system.health.value": max });
    await card(actor, `<p><b>${actor.name}</b> — <b>${item.name}</b>: HP restored to full (${before} → ${max}). No rations.</p>`);
    return { restored: max - before };
  }

  if(u.hpCost)
  {
    let target = null;
    if(u.hpCost.plusTargetLevel)
    {
      const targets = Array.from(game.user?.targets ?? []);
      if(targets.length !== 1)
      {
        ui.notifications.warn(`Target exactly one creature to use ${item.name}.`);
        return null;
      }
      target = targets[0];
    }
    const roll = new Roll(u.hpCost.dice);
    await roll.evaluate({ async: true });
    const targetLevel = target ? Number(target.actor?.system?.level?.value ?? 0) : 0;
    const cost = roll.total + targetLevel;
    const current = Number(actor.system.health.value);
    const after = Math.max(0, current - cost);
    const how = `${u.hpCost.dice} = ${roll.total}` + (target ? ` + ${target.name}'s Level ${targetLevel}` : "");
    await card(actor, `<p><b>${actor.name}</b> — <b>${item.name}</b>: spends <b>${cost} HP</b> (${how}), ${current} → ${after}.` +
      (target ? ` Target: <b>${target.name}</b>.` : "") + `</p><p><i>${u.text ?? item.system?.description?.replace(/<[^>]+>/g, "") ?? ""}</i></p>`);
    // The sheet's entry point: at 0 HP it posts the fade, and nothing died.
    await actor.sheet._resolveHPChange(actor, current, current - cost);
    if(u.applies && target)
      await postApplyCard({
        source: actor,
        spec: { name: u.applies.name, text: `${u.applies.text} From <b>${actor.name}</b>.`, rounds: u.applies.rounds, unit: u.applies.unit },
        target: target.document ?? target
      });
    return { cost, roll: roll.total, targetLevel, after };
  }
  return null;
}
