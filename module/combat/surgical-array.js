/**
 * The Sawbone Drone's Surgical Array — foundry-system-index.csv "Wound-Table
 * Resolution" (with "Creature-Type Checkboxes" for the biological read),
 * RULED 2026-09-25 (Matt).
 *
 * WHAT THE BOOK STATES: "Non-biological targets suffer d8 damage. Biological
 * targets roll d6 for one of the following effects: 1 d6 STR damage, 2 d6 DEX
 * damage, 3 d6 CON damage, 4 Roll 2d6 for a random Wound, 5 Healed for d8 +
 * CON HP, 6 Forcibly 'upgraded' with an Advanced Cybernetic Implant."
 *
 * THE RULINGS:
 *   - Resolved per target HIT, on the attacker's client - the Referee's, since
 *     a creature attacks. Nothing waits on a click.
 *   - 4 applies straight away: 2d6 read as a negative HP value on the TARGET'S
 *     own table (Biological, or Synthetic for a synth), HP left alone - the
 *     Referee-chosen wound's route through _applyWound.
 *   - 6 is a random ADVANCED implant. An implant already in one of its ability
 *     slots is uninstalled into a carried capsule (1 slot) the character can
 *     reinstall from - into the dropped-items box when the pack is full. An
 *     INFECTION holding the slot is removed by it: "this is a medical drone
 *     after all - not a traditional cure, but an interesting interaction to
 *     discover". Its crystals or other wounds stay; only the slot is freed.
 */
import { ADVANCED_IMPLANTS, ADVANCED_IMPLANT_SLOTS } from "../actor/advanced-implants-data.js";
import { implantsDisplacedBy, afflictionSlots, cureAffliction } from "../actor/affliction.js";
import { failDamageFor } from "./compelled-save.js";
import { abilityBonus } from "./ambush.js";
import { applyHeal } from "../actor/rest.js";
import { blocksHealing } from "../actor/deprived.js";
import { dropItem } from "../actor/dropped-container.js";

const SOURCE = "Surgical Array";

function post(actor, content)
{
  return ChatMessage.create({ user: game.user?._id, speaker: ChatMessage.getSpeaker({ actor }), content });
}

async function rolled(formula)
{
  return (await new Roll(formula).evaluate()).total;
}

/** Resolve one hit of the array on `target`. */
export async function resolveSurgicalArray(attacker, target)
{
  if (!target) return;
  const who = `<b>${attacker?.name ?? "The Sawbone Drone"}</b>'s ${SOURCE} on <b>${target.name}</b>`;

  if (!target.system?.creatureTypes?.biological)
  {
    const dmg = await failDamageFor(target, { dice: "1d8" }, SOURCE);
    await post(target, `${who} — not biological: ${dmg.line ?? `${dmg.amount} damage.`}`);
    const hp = Number(target.system?.health?.value ?? 0);
    if (dmg.amount > 0) await target.sheet?._resolveHPChange(target, hp, hp - dmg.amount);
    return;
  }

  const d6 = await rolled("1d6");
  if (d6 <= 3)
  {
    const key = ["str", "dex", "con"][d6 - 1];
    const amount = await rolled("1d6");
    const ability = target.system?.abilities?.[key];
    const total = Number(ability?.woundDamage ?? 0) + amount;
    await target.update({ [`system.abilities.${key}.woundDamage`]: total });
    return post(target, `${who} rolls <b>${d6}</b> — ${key.toUpperCase()} wound damage +${amount} `
      + `(total ${total}, effective bonus now ${Number(ability?.value ?? 0) - total}).`);
  }

  if (d6 === 4)
  {
    if (target.type !== "character")
      return post(target, `${who} rolls <b>4</b> — a random Wound, but creatures do not suffer Wounds.`);
    const r = await rolled("2d6");
    await post(target, `${who} rolls <b>4</b> — a random Wound (2d6: ${r}).`);
    return target.sheet?._applyWound(target, -r, 0, { setHP: false });
  }

  if (d6 === 5)
  {
    const amount = Math.max(0, (await rolled("1d8")) + abilityBonus(target, "con"));
    if (blocksHealing(target, `the ${SOURCE}`)) return;
    const res = await applyHeal(target, amount);
    return post(target, `${who} rolls <b>5</b> — healed <b>${res.gained} HP</b> (d8 + CON = ${amount})${res.note ? ` ${res.note}` : ""}.`);
  }

  if (target.type !== "character")
    return post(target, `${who} rolls <b>6</b> — a forced cybernetic upgrade, which a creature's sheet does not track.`);
  return forceImplant(target, who);
}

/**
 * Install a random Advanced implant whatever occupies its slots. Exported for
 * the offline test's sake as much as anything: it is the one part of the
 * array with a decision in it.
 */
export async function forceImplant(actor, who = `<b>${actor.name}</b>`)
{
  const entry = ADVANCED_IMPLANTS[Math.floor(Math.random() * ADVANCED_IMPLANTS.length)];
  const slots = entry.ability_slot.split("+").map(s => s.trim().toUpperCase()).filter(Boolean);
  const lines = [`${who} rolls <b>6</b> — forcibly upgraded with <b>${entry.name}</b> (${entry.ability_slot}).`];

  // An infection in the slot is cut out first. Its cure restores any implants
  // IT displaced, and those are handled with the rest just below.
  for (const inf of (actor.items ?? []).filter(i => i.type === "affliction" && afflictionSlots(i).some(s => slots.includes(s))))
  {
    const key = inf.system?.afflictionKey;
    const report = key ? await cureAffliction(actor, key) : null;
    if (!report || report.error) { await inf.delete(); lines.push(`<b>${inf.name}</b> is removed from the slot.`); }
    else lines.push(`<b>${report.entry.name}</b> is removed from the slot — the drone's work, not a cure anyone planned.`);
  }

  for (const old of implantsDisplacedBy(actor, slots))
  {
    const name = old.name;
    await old.delete();
    const [capsule] = await actor.createEmbeddedDocuments("Item", [{
      name: `Removed Implant (${name})`,
      type: "exotica",
      system: { slots: 1, attuned: true, sealedImplant: name,
                description: `<p>An implant the Sawbone Drone tore out to make room. Use it to reinstall: <b>${name}</b>.</p>` }
    }]);
    const s = actor.system.inventorySlots;
    const full = s && Number(s.used) > Number(s.max);
    if (full && capsule && await dropItem(capsule))
      lines.push(`<b>${name}</b> is uninstalled — no room to carry it, so it is left in the Dropped Items.`);
    else
      lines.push(`<b>${name}</b> is uninstalled and carried as a capsule, ready to reinstall.`);
  }

  await actor.createEmbeddedDocuments("Item", [{
    name: entry.name,
    type: "implant",
    system: { slots: ADVANCED_IMPLANT_SLOTS, description: `<p><b>Ability Slot:</b> ${entry.ability_slot}</p><p>${entry.effect}</p>` }
  }]);
  return post(actor, lines.join("<br>"));
}
