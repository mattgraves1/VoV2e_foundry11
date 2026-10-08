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

import { postSaveCard, deathLine, dealDeath } from "../combat/compelled-save.js";
import { poisonSentencesOf } from "./poison-effects-data.js";
import { normalise } from "../effects/sentence.js";
import { toxinModifiers } from "./toxin-die.js";
import { addEntry, expiryFor } from "../time/effect-board.js";
import { raisedToxinDie } from "./toxin-die.js";
import { saveTargetFor } from "./poison-data.js";
import { MAX_HP_DEFERRED, zeroMaxHpMessage } from "./zero-max-hp.js";
import { maxHpChange } from "../effects/max-hp.js";

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
/**
 * POISON THE TARGET ROLLS - Effect Engine: Shared Pipelines, chunk 7 (RULED
 * 2026-10-05 by Matt). Posts the CON save as a card the poisoned actor rolls,
 * and the card's roll runs resolvePoison, so the save and every result land
 * together (ruling C); before chunk 7 the save was rolled on the spot by
 * whoever applied the poison, with no modifiers. The save takes
 * toxinModifiers' ADV for EVERY poison kind (ruling A), and an actor immune to
 * toxins is spared the WHOLE poison, its bolded half included (ruling B) - said
 * here, and checked again by the card in case that changes before the roll.
 * Returns the card, or null for an immune actor.
 */
export async function postPoison(actor, effect, { label = "Poison" } = {})
{
  const tm = toxinModifiers(actor);
  if(tm.immune)
  {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<b>${label}</b> — ${actor.name} is immune to poison (${tm.sources.join(", ")}). It has no effect.` });
    return null;
  }
  return postSaveCard(null, label, [{ ability: "con", mode: "resist", vs: "poison", target: poisonSaveTarget(effect),
    poison: { effect, label } }], [], { saver: actor });
}

/**
 * What a poison does once its save is known - the card's roll calls this.
 * Returns { target, passed, lines, after }; `after` holds a death the caller
 * posts once its own card is up (Zero Max HP Death, below).
 */
export async function resolvePoison(actor, effect, passed, { label = "Poison" } = {})
{
  // THE EFFECT'S SENTENCES since Effect Engine: Consumables chunk 3c (RULED
  // 2026-10-06, Matt, ruling A): a sentence with no save is the bolded half the
  // book lands whatever the Save says; one with a save is what a failed CON Save
  // adds (poison-effects-data.js). Every line is the one this wrote before.
  const list = poisonSentencesOf(effect).map(normalise);
  const landed = list.filter(s => !s.resist);
  const failedHalf = list.filter(s => s.resist);
  const target = poisonSaveTarget(effect);
  const lines = [];
  const after = [];
  const days = n => `day${n === 1 ? "" : "s"}`;

  // ── TOX: no bolded half at all. The Toxin Die is what a failure costs. ──
  const tox = failedHalf.find(s => s.do?.verb === "toxin");
  if(tox)
  {
    if(passed) lines.push(`The toxin does not take hold.`);
    else
    {
      const held = actor.system?.toxinDie?.die ?? "";
      const next = raisedToxinDie(held, tox.do.die);
      await actor.update({ "system.toxinDie.die": next, "system.toxinDie.source": label });
      lines.push(next === held && held
        ? `Already carrying a <b>${held}</b> Toxin Die, which the book does not raise for a weaker toxin.`
        : `Toxin Die is now <b>${next}</b>.`);
    }
    return { target, passed, lines, after };
  }

  // ── The bolded half, which a Save never prevents ───────────────────────
  for(const s of landed)
  {
    const d = s.do ?? {};
    if(d.verb === "ability-damage")
    {
      const { total } = await rollTotal(d.dice);
      await loseAbilities(actor, [d.ability], total);
      lines.push(`<b>${total} ${d.ability.toUpperCase()} loss</b> (${d.dice}, unavoidable).`);
    }
    else if(d.verb === "reminder" && d.name)
    {
      const { total } = await rollTotal(s.for.amount);
      await boardEntry(actor, { name: d.name, text: s.text, amount: total, unit: "day", condition: d.condition });
      lines.push(`<b>${d.name}</b> for <b>${total}</b> ${days(total)} (unavoidable).`);
    }
    else if(d.verb === "max-hp")
    {
      const { total } = await rollTotal(String(d.amount).replace(/^-/, ""));
      const before = Number(actor.system.health.max ?? 0);
      // The max HP verb (Shared Pipelines chunk 5): a loss, floored at 0, clamps current.
      const change = maxHpChange(actor, { add: -total });
      const max = change["system.health.max"];

      // THE DEATH MESSAGE IS TAKEN, NOT LEFT TO THE HOOK. Zero Max HP Death
      // fires inside this write, so left alone it posts "is dead" before the
      // card below - which is the sentence that says what killed them. The card
      // cannot be posted first: it reports a max HP that does not exist until
      // the write has happened. So the message is deferred here and handed back
      // in `after`, for the caller to post once its card is up.
      await actor.update(change, { [MAX_HP_DEFERRED]: true });
      lines.push(`<b>Loses ${total} Max HP</b> (unavoidable) — now <b>${max}</b>.`);
      // Read AFTER the write, because Fatality Suppression is a condition on the
      // actor and the message differs when it holds.
      if(before > 0 && max <= 0) after.push(zeroMaxHpMessage(actor));
    }
  }

  // ── A single unbolded effect: the Save is the whole question ───────────
  if(!landed.length && failedHalf.length === 1 && failedHalf[0].do?.verb === "reminder" && failedHalf[0].for?.duration === "days")
  {
    if(passed) { lines.push(`The Save avoids it entirely.`); return { target, passed, lines, after }; }
    const s = failedHalf[0];
    const { total } = await rollTotal(s.for.amount);
    await boardEntry(actor, { name: s.do.name, text: s.text, amount: total, unit: "day", condition: s.do.condition });
    lines.push(`<b>${s.do.name}</b> for <b>${total}</b> ${days(total)}.`);
    return { target, passed, lines, after };
  }

  if(passed)
  {
    if(failedHalf.length) lines.push(`The Save prevents the rest.`);
    return { target, passed, lines, after };
  }

  // ── The failed half ────────────────────────────────────────────────────
  for(const s of failedHalf)
  {
    const d = s.do ?? {};
    if(d.verb === "ability-damage" && d.abilities)
    {
      const { total } = await rollTotal(d.dice);
      await loseAbilities(actor, d.abilities, total);
      lines.push(`Save failed: <b>${total}</b> lost from <b>${d.abilities.map(a => a.toUpperCase()).join(" and ")}</b>`
               + `${d.note ? ` (${d.note} — the Referee may rule otherwise)` : ""}.`);
    }
    else if(d.verb === "ability-damage")
    {
      const { total } = await rollTotal(d.dice);
      await loseAbilities(actor, [d.ability], total);
      lines.push(`Save failed: a further <b>${total} ${d.ability.toUpperCase()} loss</b> (${d.dice}).`);
    }
    else if(d.verb === "condition" && s.for?.duration === "permanent")
    {
      await boardEntry(actor, { name: d.name, text: `${d.name} — until the Referee ends it.`, condition: d.state, permanent: true });
      lines.push(`Save failed: <b>${d.name}</b>, with no expiry.`);
    }
    else if(d.verb === "reminder")
      lines.push(`Save failed: <b>${d.name}</b>. Nothing is written — the Referee adjudicates it.`);
    // Poison 20's "Instant Death" through the kill route (chunk 3c, RULED
    // 2026-10-06, Matt): an NPC dies, a character is told (dealDeath's rule).
    // A Max HP loss that already killed has said so; it is not said twice.
    else if(d.verb === "kill")
    {
      lines.push(`Save failed: <b>${d.name ?? "Death"}</b>.`);
      if(!after.length) after.push(deathLine(actor, label, { ability: "con", mode: "resist", vs: "poison", target }));
      await dealDeath(actor);
    }
  }

  return { target, passed, lines, after };
}

/** The CON Save the poison is resisted with - its failed half's target (the toxin rule's, or 15). */
export function poisonSaveTarget(effect)
{
  return poisonSentencesOf(effect).find(s => s.resist)?.resist?.target ?? saveTargetFor(effect);
}
