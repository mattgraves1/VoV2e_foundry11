/**
 * Applying a generated poison to a character — foundry-system-index.csv
 * "Toxin and Flora Item Surface", the Toxins half, built 2026-09-19.
 *
 * NOTHING NEW IS MODELLED HERE. Every outcome the Effect column states already
 * has a built mechanism, and this is the front door to them:
 *
 *   a Toxin Die            -> system.toxinDie, raised by the book's own rule
 *   an ability loss        -> woundDamage, which heals with rest
 *   a span in days         -> an Active Effect Board entry that expires
 *   Blind, no Mystic Gifts -> the same entry, carrying the condition key that
 *                             actor-sheet.js and the save cards already read
 *   d8 Max HP              -> a real max-HP write, which Zero Max HP Death
 *                             watches
 *
 * RULED 2026-09-19 (Matt): the save is the toxin rule's where TOX applies (CON
 * vs 10 + the die) and a flat 15 otherwise; the bolded half lands whatever the
 * save does; permanent blindness is a board entry that never expires; and
 * INSTANT DEATH AND PERMANENT LOSS OF LANGUAGE ARE POSTED, NOT APPLIED — "post
 * the other two for you to adjudicate rather than killing a character from a
 * macro".
 */

import { rollCardSave } from "../combat/card-save.js";
import { addEntry, expiryFor } from "../time/effect-board.js";
import { raisedToxinDie } from "./toxin-die.js";
import { saveTargetFor } from "./poison-data.js";
import { MAX_HP_DEFERRED, zeroMaxHpMessage } from "./zero-max-hp.js";

/** Roll a formula and return its total. */
async function rollTotal(formula)
{
  const roll = new Roll(formula);
  await roll.evaluate({ async: true });
  return { total: roll.total, roll };
}

/** Write ability damage, which is what a poison's stat loss is: it heals. */
async function loseAbilities(actor, abilities, amount)
{
  const data = foundry.utils.deepClone(actor.system.abilities);
  for(const key of abilities)
    if(data[key]) data[key].woundDamage = Number(data[key].woundDamage ?? 0) + amount;
  await actor.update({ "system.abilities": data });
}

/** Put a span on the board, with its condition if it has one. */
async function boardEntry(actor, { name, text, amount, unit, condition, permanent })
{
  const now = game.time?.worldTime ?? 0;
  const expiry = permanent ? { expiresAtTime: null, expiresAtRound: null }
                           : expiryFor({ amount, unit, now });
  return addEntry(actor, {
    name,
    text,
    startTime: now,
    unit: permanent ? null : unit,
    amount: permanent ? null : amount,
    expiresAtTime: expiry.expiresAtTime ?? null,
    expiresAtRound: expiry.expiresAtRound ?? null,
    applied: condition ? { conditions: [condition] } : null
  });
}

/**
 * Apply one poison to one character. Rolls the CON Save, lands the bolded half
 * whatever it says, and adds the failed half on top of a failure.
 *
 * Returns { target, passed, lines, after }, where `lines` is what happened in
 * the order it happened — the caller posts them, because one chat card for the
 * whole poison reads as one event and three do not.
 *
 * `after` is the exception that proves it: messages that must be their OWN
 * card and must follow the one above. Only death goes here today. It is not a
 * line in the list because a Referee should not have to read to the end of a
 * bullet list to find out someone died, and it is not left to its own hook
 * because that posts it before the card explaining it — see the maxHp branch.
 */
// `rollMode` goes to the save roll: the Generate Poison macro is private
// (Roll Card Visibility, RULED 2026-09-27 by Matt), and its card was
// whispered while the save roll it made posted publicly. Null keeps the
// chat default, which the Poisoned Water hazard wants.
export async function applyPoison(actor, effect, { label = "Poison", rollMode = null } = {})
{
  const target = saveTargetFor(effect);
  const { verdict } = await rollCardSave(actor, {
    ability: "con", label: `${label} — ${effect.text}`, target, rollMode
  });
  const passed = !!verdict?.passed;
  const lines = [];
  const after = [];

  // ── TOX: no bolded half at all. The Toxin Die is what a failure costs. ──
  if(effect.kind === "tox")
  {
    if(passed) lines.push(`The toxin does not take hold.`);
    else
    {
      const held = actor.system?.toxinDie?.die ?? "";
      const next = raisedToxinDie(held, effect.die);
      await actor.update({ "system.toxinDie.die": next, "system.toxinDie.source": label });
      lines.push(next === held && held
        ? `Already carrying a <b>${held}</b> Toxin Die, which the book does not raise for a weaker toxin.`
        : `Toxin Die is now <b>${next}</b>.`);
    }
    return { target, passed, lines, after };
  }

  // ── The bolded half, which a Save never prevents ───────────────────────
  if(effect.kind === "ability" && effect.bolded)
  {
    const { total } = await rollTotal(effect.bolded.formula);
    await loseAbilities(actor, [effect.bolded.ability], total);
    lines.push(`<b>${total} ${effect.bolded.ability.toUpperCase()} loss</b> (${effect.bolded.formula}, unavoidable).`);
  }
  else if(effect.kind === "timed" && !effect.avoidable)
  {
    const { total } = await rollTotal(effect.amount);
    await boardEntry(actor, { name: effect.label, text: effect.text, amount: total, unit: effect.unit, condition: effect.condition });
    lines.push(`<b>${effect.label}</b> for <b>${total}</b> day${total === 1 ? "" : "s"} (unavoidable).`);
  }
  else if(effect.kind === "maxHp")
  {
    const { total } = await rollTotal(effect.bolded.formula);
    const before = Number(actor.system.health.max ?? 0);
    const max = Math.max(0, before - total);

    // THE DEATH MESSAGE IS TAKEN, NOT LEFT TO THE HOOK. Zero Max HP Death
    // fires inside this write, so left alone it posts "is dead" before the
    // card below — which is the sentence that says what killed them. The card
    // cannot be posted first: it reports a max HP that does not exist until
    // the write has happened. So the message is deferred here and handed back
    // in `after`, for the caller to post once its card is up.
    await actor.update(
      { "system.health.max": max, "system.health.value": Math.min(actor.system.health.value, max) },
      { [MAX_HP_DEFERRED]: true });
    lines.push(`<b>Loses ${total} Max HP</b> (unavoidable) — now <b>${max}</b>.`);

    // Read AFTER the write, because Fatality Suppression is a condition on the
    // actor and the message differs when it holds.
    if(before > 0 && max <= 0) after.push(zeroMaxHpMessage(actor));
  }
  else if(effect.kind === "timed" && effect.avoidable && passed)
  {
    lines.push(`The Save avoids it entirely.`);
  }

  // ── A single unbolded effect: the Save is the whole question ───────────
  if(effect.kind === "timed" && effect.avoidable && !passed)
  {
    const { total } = await rollTotal(effect.amount);
    await boardEntry(actor, { name: effect.label, text: effect.text, amount: total, unit: effect.unit, condition: effect.condition });
    lines.push(`<b>${effect.label}</b> for <b>${total}</b> day${total === 1 ? "" : "s"}.`);
    return { target, passed, lines, after };
  }

  if(passed)
  {
    if(effect.failed) lines.push(`The Save prevents the rest.`);
    return { target, passed, lines, after };
  }

  // ── The failed half ────────────────────────────────────────────────────
  const f = effect.failed;
  if(!f) return { target, passed, lines };

  if(f.ability)
  {
    const { total } = await rollTotal(f.formula);
    await loseAbilities(actor, [f.ability], total);
    lines.push(`Save failed: a further <b>${total} ${f.ability.toUpperCase()} loss</b> (${f.formula}).`);
  }
  else if(f.kind === "abilities")
  {
    const { total } = await rollTotal(f.formula);
    await loseAbilities(actor, f.abilities, total);
    lines.push(`Save failed: <b>${total}</b> lost from <b>${f.abilities.map(a => a.toUpperCase()).join(" and ")}</b>`
             + `${f.note ? ` (${f.note} — the Referee may rule otherwise)` : ""}.`);
  }
  else if(f.kind === "permanentCondition")
  {
    await boardEntry(actor, { name: f.text, text: `${f.text} — until the Referee ends it.`, condition: f.condition, permanent: true });
    lines.push(`Save failed: <b>${f.text}</b>, with no expiry.`);
  }
  else if(f.kind === "permanent")
  {
    lines.push(`Save failed: <b>${f.text}</b>. Nothing is written — the Referee adjudicates it.`);
  }
  else if(f.kind === "death")
  {
    lines.push(`Save failed: <b>${f.text}</b>. Nothing is written — the Referee adjudicates it.`);
  }

  return { target, passed, lines, after };
}
