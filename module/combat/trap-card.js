/**
 * Trap Resolution - buttons on a rolled vault hazard (foundry-system-index.csv
 * "Trap Resolution", RULED 2026-09-26 by Matt).
 *
 * A rolled table result is a chat message and nothing else: no Item, no actor,
 * no sheet. So what gets built is a button on that message. The hazard is
 * found by its LABEL in the message text ("Hazard: Laser Grid Trap"), which is
 * what both routes a hazard reaches chat by have in common - Foundry's own
 * RollTable card, which carries the table's markdown-ish text as stored, and
 * Generate Room Contents' card, which has converted it to HTML. Matching the
 * text rather than a flag is what lets one hook serve both without either
 * route changing.
 *
 * The rulings this implements, all Matt's, 2026-09-26:
 * - GM-only. The buttons are drawn only on a GM's client, so a player never
 *   sees one to be refused by.
 * - Reusable: a trap catches different characters at different times, so a
 *   button may be clicked again rather than once per card.
 * - A damage button rolls ONCE and every targeted token takes that roll,
 *   each through its own resistances - one explosion, one number.
 * - Proximity Mines' damage is one mine a click; how many go off is the
 *   Referee's.
 *
 * What each hazard does is data, in trap-data.js.
 */

import { TRAPS } from "./trap-data.js";
import { postMetalReachCard } from "./metal-cards.js";
import { postSaveCardsToTargets, postSaveCard, postToxSave, failDamageFor } from "./compelled-save.js";
import { startAbilityTick } from "./apply-to-target.js";
import { addEntry, entriesOf, updateEntry } from "../time/effect-board.js";
import { hasAnyCreatureType } from "../item/attack-properties.js";
import { startRecurrence, applyTickLosses, alreadyActioned } from "../time/recurrence.js";
import { applyNamedWound } from "../actor/named-wound.js";
import { POISON_EFFECTS } from "../actor/poison-data.js";
import { applyPoison } from "../actor/poison.js";
import { AFFLICTIONS, afflictionByKey } from "../actor/affliction-data.js";
import { postExposure } from "../actor/affliction-card.js";
import { spawnBeside } from "../actor/bestiary-spawn.js";
import { setDeprived } from "../actor/deprived.js";
import { rationKinds, FOOD_RATION } from "../actor/rest.js";
import { DARKNESS_NAME, DARKNESS_TEXT, DARKNESS_CONDITION, partyPCs, actorInDarkness } from "../time/darkness.js";

/** Chat-message flag: what a shape-D card rolled or did, so it is done once. */
const DONE_FLAG = "trapRolled";

/**
 * A table label and the result name after it, in either spelling a rolled
 * result arrives in: "**Hazard:** Broken Glass" as the RollTable stores it,
 * "<b>Hazard:</b> Broken Glass" once the room macro has converted it, and
 * "**Fauna / Flora:** **Swordgrass**" with the name bolded too. The name runs
 * to the next tag, asterisk or line break. A word directly before the label
 * refuses it: the Regional Feature Table prints "Route Hazard: Disease", a
 * desert route and not the vault's Disease room, and the room macro heads its
 * line "Vault Hazard:". tools/test-trap-data.mjs found the first.
 */
const LABEL = /(?<![A-Za-z] )(Hazard|Obstacle|Fauna \/ Flora):\s*(?:<\/(?:b|strong)>|\*\*)?\s*(?:<(?:b|strong)>|\*\*)?\s*([^<*\n]+)/g;

/** Every TRAPS key a message's text names, in order, each once. */
export function trapsIn(content)
{
  const found = [];
  for (const m of String(content ?? "").matchAll(LABEL))
  {
    const key = `${m[1]}: ${m[2].trim()}`;
    if (TRAPS[key] && !found.includes(key)) found.push(key);
  }
  return found;
}

/** The result's own name, without its table label. */
function nameOf(key)
{
  return key.slice(key.indexOf(":") + 1).trim();
}

function saveLabel(s)
{
  return `${String(s.ability).toUpperCase()} Save vs ${s.vs}`;
}

function damageLabel(trap)
{
  const parts = trap.damage.map(p => `${p.dice.replace(/^1d/, "d")}${p.type ? ` ${p.type}` : ""}`).join(" + ");
  return `Apply ${parts} damage${trap.damageLabel ? ` (${trap.damageLabel})` : ""}`;
}

/** What a per-round tick does, for its button: "d8 damage", "d6 INT". */
function tickWhat(tick)
{
  const dice = tick.dice.replace(/^1d/, "d");
  return tick.ability ? `${dice} ${tick.ability.toUpperCase()}` : `${dice}${tick.type ? ` ${tick.type}` : ""} damage`;
}

/** What this card has already rolled or done for a hazard, or null. */
//
// THE HOLDER is whatever document the controls sit on: the rolled chat message,
// or a JOURNAL PAGE (Hazard Controls on Journal Pages, RULED 2026-09-27 by
// Matt: a room's Poisoned Water keeps its poison across sessions). Both carry
// flags, so the same two functions serve either.
function doneOn(holder, key)
{
  return holder?.getFlag?.("vaarn", DONE_FLAG)?.[key] ?? null;
}

/** Record it, keyed by hazard so a room macro card naming two keeps both. */
async function markDone(holder, key, value)
{
  const all = { ...(holder.getFlag("vaarn", DONE_FLAG) ?? {}), [key]: value };
  await holder.setFlag("vaarn", DONE_FLAG, all);
}

/** Forget it - the journal page's re-roll control, for a fresh roll. */
export async function clearDone(holder, key)
{
  if (!gmOr()) return null;
  const all = { ...(holder.getFlag("vaarn", DONE_FLAG) ?? {}) };
  delete all[key];
  await holder.unsetFlag("vaarn", DONE_FLAG);
  if (Object.keys(all).length) await holder.setFlag("vaarn", DONE_FLAG, all);
  return key;
}

/** A journal page keeps its roll for good, so it offers a way to roll again. */
function rerollFor(key, holder)
{
  if (holder?.documentName !== "JournalEntryPage" || !doneOn(holder, key)) return "";
  return ` <a class="vaarn-trap-reroll" data-trap="${Handlebars.escapeExpression(key)}" title="Forget this roll and roll again next time">re-roll</a>`;
}

/** The shape-D buttons, which read what the card has already rolled. */
function systemButtonsFor(key, trap, message)
{
  const k = Handlebars.escapeExpression(key);
  const done = doneOn(message, key);
  const out = [];
  if (trap.tox)
    out.push(`<button type="button" class="vaarn-trap-tox" data-trap="${k}">TOX save against a ${trap.tox} Toxin Die - targeted tokens</button>`);
  if (trap.spawn)
    out.push(done
      ? `<button type="button" disabled>Created ${done.count} ${trap.spawn.creature}${done.count === 1 ? "" : "s"}</button>`
      : `<button type="button" class="vaarn-trap-spawn" data-trap="${k}">Roll ${trap.spawn.dice.replace(/^1d/, "d")} and create the ${trap.spawn.creature}s</button>`);
  if (trap.poison)
    out.push(`<button type="button" class="vaarn-trap-poison" data-trap="${k}">${done
      ? `Apply "${POISON_EFFECTS[done.index]?.text}" to the targeted tokens`
      : "Roll the poison, then apply it to the targeted tokens"}</button>`);
  if (trap.affliction)
    out.push(`<button type="button" class="vaarn-trap-affliction" data-trap="${k}">${done
      ? `Expose the targeted tokens to ${afflictionByKey(done.key)?.name ?? done.key}`
      : `Roll the ${trap.affliction === "nanomachine" ? "nanomachine infection" : "disease"}, then expose the targeted tokens`}</button>`);
  if (out.length && (trap.spawn || trap.poison || trap.affliction)) out[out.length - 1] += rerollFor(key, message);
  const p = trap.projector;
  if (p?.famine)
    out.push(`<button type="button" class="vaarn-trap-projector" data-trap="${k}">Place the ${p.name} (AV ${p.av}, ${p.hp} HP) and starve the targeted tokens</button>`,
             `<button type="button" class="vaarn-trap-famine" data-trap="${k}">Starve more targeted tokens</button>`);
  if (p?.darkness)
    out.push(`<button type="button" class="vaarn-trap-projector" data-trap="${k}">Place the ${p.name} (AV ${p.av}, ${p.hp} HP) and darken the party</button>`);
  return out;
}

/** The buttons for one hazard. */
function buttonsFor(key, message = null)
{
  const trap = TRAPS[key];
  const k = Handlebars.escapeExpression(key);
  const system = systemButtonsFor(key, trap, message);
  const saves = (trap.saves ?? []).map((s, i) =>
    `<button type="button" class="vaarn-trap-save" data-trap="${k}" data-index="${i}">${saveLabel(s)} - targeted tokens</button>`);
  const damage = trap.damage
    ? [`<button type="button" class="vaarn-trap-damage" data-trap="${k}">${damageLabel(trap)} - targeted tokens</button>`]
    : [];
  const tick = trap.tick
    ? [`<button type="button" class="vaarn-trap-tick" data-trap="${k}">${trap.tick.start ? `When ${trap.tick.start}: s` : "S"}tart ` +
       `${tickWhat(trap.tick)} each round on the targeted tokens</button>`]
    : [];
  const p = trap.projector;
  const projector = p && !p.famine && !p.darkness
    ? [`<button type="button" class="vaarn-trap-projector" data-trap="${k}">Place the ${p.name} (AV ${p.av}, ${p.hp} HP)${p.turn ? " and start it on the targeted tokens" : ""}</button>`,
       ...(p.turn ? [`<button type="button" class="vaarn-trap-turn-start" data-trap="${k}">Start the ${p.name} on more targeted tokens</button>`] : [])]
    : [];
  const turn = trap.turn
    ? [`<button type="button" class="vaarn-trap-turn-start" data-trap="${k}">Start ${trap.turn.what} each Exploration Turn on the targeted tokens</button>`]
    : [];
  const vortex = trap.vortex
    ? [`<button type="button" class="vaarn-trap-vortex" data-trap="${k}">Place the ${trap.vortex.name}</button>`]
    : [];
  // Metal Item Property Part B (2026-09-27): the Electromagnet's pull, listed.
  const metal = trap.metalPull
    ? [`<button type="button" class="vaarn-trap-metal" data-trap="${k}">List the metal it draws in - targeted tokens, or the whole scene</button>`]
    : [];
  return `<div class="vaarn-trap"><p><b>${Handlebars.escapeExpression(nameOf(key))}</b></p>${[...saves, ...damage, ...tick, ...projector, ...turn, ...vortex, ...metal, ...system].join("")}</div>`;
}

/** The round card needs an encounter; say so rather than refuse, as activate() does. */
function warnNoCombat(name)
{
  if (!game.combat)
    ui.notifications.warn(`"${name}" is set to remind each round, but no combat encounter is active — create one and it will start reporting.`);
}

/**
 * SHAPE B - put the hazard on EACH targeted token's board (RULED 2026-09-26,
 * Matt: exposure is per person). A token already carrying it is left alone,
 * and one outside the hazard's creature types is passed over silently.
 */
export async function onTrapTick(key)
{
  const trap = TRAPS[key];
  const tick = trap?.tick;
  if (!tick) return null;
  const name = nameOf(key);
  const tokens = targetsOr(name);
  if (!tokens) return null;

  const started = [], already = [];
  for (const token of tokens)
  {
    const actor = token.actor;
    if (!actor) continue;
    if (tick.targets?.length && !hasAnyCreatureType(actor, tick.targets)) continue;
    if (entriesOf(actor).some(e => e.name === name)) { already.push(actor.name); continue; }
    const text = `${tick.note} Remove it from the board when they leave.`;
    if (tick.ability)
      await startAbilityTick(actor, { name, text, ability: tick.ability, dice: tick.dice });
    else
      await addEntry(actor, {
        name, text, perRound: true,
        hpTick: { dice: tick.dice, ...(tick.type ? { damageTypes: [tick.type] } : {}) },
        startTime: game.time?.worldTime ?? 0,
        startRound: game.combat?.round ?? null,
      });
    started.push(actor.name);
  }
  warnNoCombat(name);
  if (!started.length && !already.length) return null;
  return ChatMessage.create({
    speaker: { alias: name },
    content: `<p><b>${name}</b>: ${tickWhat(tick)} each round.`
      + (started.length ? ` Now on the board of ${started.join(", ")}.` : "")
      + (already.length ? ` <i>Already on: ${already.join(", ")}.</i>` : "") + `</p>`,
  });
}

/**
 * A PROJECTOR (RULED 2026-09-26, Matt): an actor with the book's AV and HP.
 * Its effect is an entry on the projector itself that reaches the targeted
 * tokens, and it names the projector as its own source with endsWithSource,
 * so the kill hook's endEffectsOfSource ends it when the projector reaches 0
 * HP or is deleted - the book's "destroy the generator".
 */
export async function onTrapProjector(key)
{
  const p = TRAPS[key]?.projector;
  if (!p) return null;
  const projector = await Actor.create({
    name: p.name, type: "npc", img: "icons/svg/lightning.svg",
    system: { health: { value: p.hp, max: p.hp }, armor: { value: p.av } },
  });
  if (!projector) return null;
  const whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
  // THE FAMINE FIELD: a projector to destroy, but nothing ends with it -
  // Deprived outlives the machine (RULED 2026-09-27, Matt).
  if (p.famine)
  {
    await ChatMessage.create({ speaker: { alias: p.name }, whisper,
      content: `<p>The <b>${p.name}</b> is created in the Actors directory (AV ${p.av}, ${p.hp} HP). `
        + `Place its token in the room. Destroying it stops the famine; it does not feed anyone.</p>` });
    if (game.user.targets?.size) await onTrapFamine(key);
    return projector;
  }
  // THE DARKNESS PROJECTOR: the party's In Darkness, each entry naming the
  // projector as its endsWithSource source, so destroying it lifts it.
  if (p.darkness)
  {
    const darkened = [];
    for (const actor of partyPCs())
    {
      if (actorInDarkness(actor)) continue;
      await addEntry(actor, { name: DARKNESS_NAME, text: `${DARKNESS_TEXT} From the <b>${p.name}</b>.`,
        applied: { conditions: [DARKNESS_CONDITION] },
        sourceActorId: projector.id, sourceName: projector.name, endsWithSource: true });
      darkened.push(actor.name);
    }
    await ChatMessage.create({ speaker: { alias: p.name }, whisper,
      content: `<p>The <b>${p.name}</b> is created in the Actors directory (AV ${p.av}, ${p.hp} HP). `
        + `Place its token in the room; destroying it restores normal lighting.</p>`
        + `<p>${darkened.length ? `In Darkness: ${darkened.join(", ")}.` : "The party was already in darkness."}</p>` });
    return projector;
  }
  // A PER-CHARACTER projector (the Entropic Field): nothing on the projector
  // itself; each exposed character carries a tick naming it as the source.
  if (p.turn)
  {
    await ChatMessage.create({
      speaker: { alias: p.name },
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `<p>The <b>${p.name}</b> is created in the Actors directory (AV ${p.av}, ${p.hp} HP). `
        + `Place its token in the room; destroying it ends the field for everyone.</p>`,
    });
    if (game.user.targets?.size) await onTrapTurnStart(key);
    return projector;
  }
  await addEntry(projector, {
    name: p.name,
    text: `${p.note} Ends when the projector is destroyed.`,
    perRound: true,
    hpTick: { dice: p.tick.dice, to: "targets", ...(p.tick.targets ? { targetTypes: p.tick.targets } : {}) },
    sourceActorId: projector.id, sourceName: projector.name, endsWithSource: true,
    startTime: game.time?.worldTime ?? 0,
    startRound: game.combat?.round ?? null,
  });
  warnNoCombat(p.name);
  return ChatMessage.create({
    speaker: { alias: p.name },
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    content: `<p>The <b>${p.name}</b> is created in the Actors directory (AV ${p.av}, ${p.hp} HP). `
      + `Place its token in the room; destroying it ends the field.</p>`,
  });
}

/** The tokens the Referee has targeted, or null after telling them to target some. */
function targetsOr(name)
{
  const tokens = Array.from(game.user?.targets ?? []);
  if (tokens.length) return tokens;
  ui.notifications.warn(`Target the tokens ${name} reaches, then click again.`);
  return null;
}

/** One save card per targeted token, posted in the hazard's own name. */
export async function onTrapSave(key, index)
{
  const trap = TRAPS[key];
  const save = trap?.saves?.[index];
  if (!save) return null;
  if (!targetsOr(nameOf(key))) return null;
  return postSaveCardsToTargets(null, nameOf(key), [save], [], trap.applies ?? []);
}

/**
 * Roll each damage part once and deal it to every targeted token, through the
 * same table a failed save's damage goes through (failDamageFor) and the
 * sheet's HP funnel, so immunities, halving, Wounds and death at 0 all hold.
 */
export async function onTrapDamage(key)
{
  const trap = TRAPS[key];
  if (!trap?.damage) return null;
  const name = nameOf(key);
  const tokens = targetsOr(name);
  if (!tokens) return null;

  const rolls = [];
  for (const part of trap.damage) rolls.push({ part, roll: await new Roll(part.dice).evaluate() });

  const lines = [];
  for (const token of tokens)
  {
    const actor = token.actor;
    if (!actor) continue;
    let total = 0;
    for (const { part, roll } of rolls)
    {
      const r = await failDamageFor(actor, part, name, roll);
      total += r.amount;
      lines.push(r.line + (part.type ? ` <i>(${part.type})</i>` : ""));
    }
    if (total > 0)
    {
      const hp = Number(actor.system?.health?.value ?? 0);
      await actor.sheet?._resolveHPChange(actor, hp, hp - total);
    }
  }

  const rolled = rolls.map(({ part, roll }) => `${part.dice}${part.type ? ` ${part.type}` : ""} = ${roll.total}`).join(", ");
  return ChatMessage.create({
    speaker: { alias: name },
    content: `<p><b>${name}</b>: ${rolled}.</p><p>${lines.join("<br>")}</p>`,
  });
}

/**
 * SHAPE C - start a per-Exploration-Turn tick on each targeted token (the B
 * ruling carried over: exposure is per person). A projector's tick names the
 * newest projector of that name as its endsWithSource source; with none
 * placed, it refuses rather than start a field nothing can end.
 */
export async function onTrapTurnStart(key)
{
  const trap = TRAPS[key];
  const p = trap?.projector;
  const turn = trap?.turn ?? p?.turn;
  if (!turn) return null;
  const name = nameOf(key);
  let source = {};
  if (p)
  {
    const projector = game.actors.filter(a => a.name === p.name).at(-1);
    if (!projector) return ui.notifications.warn(`Place the ${p.name} first - destroying it is what ends the field.`);
    source = { sourceActorId: projector.id, sourceName: projector.name, endsWithSource: true };
  }
  const tokens = targetsOr(name);
  if (!tokens) return null;
  const note = trap.turn?.note ?? p?.note ?? "";
  const started = [], already = [];
  for (const token of tokens)
  {
    const actor = token.actor;
    if (!actor) continue;
    if (entriesOf(actor).some(e => e.trapKey === key)) { already.push(actor.name); continue; }
    await startRecurrence(actor, { name, text: `${note} Remove it from the board when they leave.`,
                                   periodAmount: 1, periodUnit: "turn", trapKey: key, ...source });
    started.push(actor.name);
  }
  if (!started.length && !already.length) return null;
  return ChatMessage.create({
    speaker: { alias: name },
    content: `<p><b>${name}</b>: ${turn.what} each Exploration Turn.`
      + (started.length ? ` Now on the board of ${started.join(", ")}.` : "")
      + (already.length ? ` <i>Already on: ${already.join(", ")}.</i>` : "") + `</p>`,
  });
}

/**
 * THE HYPERGEOMETRIC VORTEX (RULED 2026-09-26, Matt): an actor with no AV or
 * HP carrying one per-turn tick for the room, and a d2 for which half comes
 * first - named on the placement message.
 */
export async function onTrapVortex(key)
{
  const v = TRAPS[key]?.vortex;
  if (!v) return null;
  const d2 = (await new Roll("1d2").evaluate()).total;
  const first = d2 === 1 ? "draw" : "spit";
  const vortex = await Actor.create({
    name: v.name, type: "npc", img: "icons/svg/portal.svg",
    system: { health: { value: 0, max: 0 }, armor: { value: 0 } },
  });
  if (!vortex) return null;
  await startRecurrence(vortex, { name: v.name, text: `${v.note} It cannot be destroyed; remove it from the board to end it.`,
                                  periodAmount: 1, periodUnit: "turn", trapKey: key, vortexFirst: first });
  return ChatMessage.create({
    speaker: { alias: v.name },
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    content: `<p>The <b>${v.name}</b> is created in the Actors directory. Rolled ${d2} on a d2: on its first `
      + `Exploration Turn it ${first === "draw" ? "tries to draw someone in" : "spits out a random creature"}, `
      + `and it alternates from there.</p>`,
  });
}

/* -------------------------------------------- */
/*  Shape D - a system that already exists                                    */
/* -------------------------------------------- */

/** GM-only, as every button drawn on a rolled hazard is. */
function gmOr()
{
  if (game.user.isGM) return true;
  ui.notifications.warn("Only the Referee does this.");
  return false;
}

/** The Toxic Liquid Pool: a TOX card per targeted token, in the pool's name. */
export async function onTrapTox(key)
{
  const trap = TRAPS[key];
  const name = nameOf(key);
  const tokens = gmOr() && targetsOr(name);
  if (!tokens || !trap?.tox) return null;
  for (const token of tokens) await postToxSave(null, { name }, token, trap.tox);
  return tokens.length;
}

/** Sentry Turrets: roll the count and create them, once per card. */
export async function onTrapSpawn(key, message)
{
  const spec = TRAPS[key]?.spawn;
  if (!spec || !gmOr()) return null;
  if (doneOn(message, key)) return ui.notifications.warn(`This card has already created its ${spec.creature}s.`);
  const roll = await new Roll(spec.dice).evaluate();
  const made = await spawnBeside(null, spec.creature, roll.total) ?? [];
  await markDone(message, key, { count: made.length });
  return ChatMessage.create({ speaker: { alias: nameOf(key) },
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    content: `<p><b>${nameOf(key)}</b>: rolled ${roll.total} on a ${spec.dice.replace(/^1d/, "d")}. `
      + `Created ${made.map(a => a.name).join(", ") || "nothing"} in the Actors directory - place them watching the entrances.</p>` });
}

/** Roll once per card, or read back what the card rolled. */
async function rolledOnce(message, key, roll)
{
  const had = doneOn(message, key);
  if (had) return had;
  const value = await roll();
  await markDone(message, key, value);
  return value;
}

/** Poisoned Water: one poison for the card, applied to each targeted token. */
export async function onTrapPoison(key, message)
{
  if (!gmOr()) return null;
  const name = nameOf(key);
  const tokens = targetsOr(name);
  if (!tokens) return null;
  const { index } = await rolledOnce(message, key,
    async () => ({ index: (await new Roll(`1d${POISON_EFFECTS.length}`).evaluate()).total - 1 }));
  const effect = POISON_EFFECTS[index];
  for (const token of tokens)
  {
    const actor = token.actor;
    if (!actor) continue;
    const { target, passed, lines, after } = await applyPoison(actor, effect, { label: name });
    // Awaited, and `after` posted once it has landed - generate-poison.js's reason.
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><b>${name}</b> - <i>${effect.text}</i></p>`
             + `<p>CON Save vs ${target}: <b>${passed ? "passed" : "failed"}</b>.</p>`
             + `<ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>` });
    for (const content of after ?? []) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }
  return effect;
}

/** Disease or Nanomachine Infection: one for the card, an exposure card each. */
export async function onTrapAffliction(key, message)
{
  const kind = TRAPS[key]?.affliction;
  if (!kind || !gmOr()) return null;
  const tokens = targetsOr(nameOf(key));
  if (!tokens) return null;
  const pool = AFFLICTIONS.filter(a => a.kind === kind);
  const { key: picked } = await rolledOnce(message, key,
    async () => ({ key: pool[(await new Roll(`1d${pool.length}`).evaluate()).total - 1].key }));
  for (const token of tokens) if (token.actor) await postExposure(token.actor, picked);
  return picked;
}

/**
 * The Famine Field on each targeted token: Deprived, and their food gone -
 * "All food rations brought into the room instantly decompose" (RULED
 * 2026-09-27, Matt: remove them). Food is the ration group's, Raw Meat with
 * the Food Ration; water is untouched.
 */
export async function onTrapFamine(key)
{
  if (!gmOr()) return null;
  const name = nameOf(key);
  const tokens = targetsOr(name);
  if (!tokens) return null;
  const food = rationKinds(FOOD_RATION);
  const lines = [];
  for (const token of tokens)
  {
    const actor = token.actor;
    if (!actor) continue;
    await setDeprived(actor, true);
    const gone = actor.items.filter(i => food.includes(i.name));
    const count = gone.reduce((n, i) => n + (Number(i.system?.quantity) || 1), 0);
    if (gone.length) await actor.deleteEmbeddedDocuments("Item", gone.map(i => i.id));
    lines.push(`<b>${actor.name}</b> is Deprived${count ? `, and ${count} food ration${count === 1 ? "" : "s"} decompose` : ""}.`);
  }
  return ChatMessage.create({ speaker: { alias: name }, content: `<p><b>${name}</b>:<br>${lines.join("<br>")}</p>` });
}

/** The entry a tick button names, with the tick guard applied, or null. */
async function claimTick(btn)
{
  if (!game.user.isGM) { ui.notifications.warn("Only the Referee applies this."); return null; }
  const actor = game.actors.get(btn.dataset.actorId);
  const entry = actor ? entriesOf(actor).find(e => e.id === btn.dataset.entryId) : null;
  if (!entry) { ui.notifications.warn("That hazard is no longer on the board."); return null; }
  const index = Number(btn.dataset.tickIndex);
  if (alreadyActioned(entry, "appliedIndex", index))
  { ui.notifications.warn(`${entry.name} has already been applied for this turn.`); return null; }
  await updateEntry(actor, entry.id, { appliedIndex: index });
  return { actor, entry, ticks: Math.max(1, Number(btn.dataset.ticks) || 1) };
}

/** A hazard tick's button on the clock's card: what its `turn` declares, per tick owed. */
export async function onTrapTurn(btn)
{
  const claim = await claimTick(btn);
  if (!claim) return null;
  const { actor, entry, ticks } = claim;
  const trap = TRAPS[entry.trapKey];
  const turn = trap?.turn ?? trap?.projector?.turn;
  if (!turn) return null;
  for (let i = 0; i < (turn.applies ? 0 : ticks); i++)
  {
    if (turn.save) await postSaveCard(null, entry.name, [turn.save], [], { saver: actor });
    else if (turn.tox) await postToxSave(null, { name: entry.name }, null, turn.tox, { saver: actor });
    else if (turn.wound) await applyNamedWound(actor, turn.wound, { source: entry.name });
  }
  if (turn.applies)
  {
    const { lines, death } = await applyTickLosses(actor, { applies: turn.applies }, ticks);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<b>${actor.name}</b> — <b>${entry.name}</b>${ticks > 1 ? ` ×${ticks}` : ""}: ${lines.join("; ") || "nothing lost"}.` });
    if (death) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: death });
  }
  return entry;
}

/** The vortex's drawing-in turn: a STR save for each targeted token, per draw owed. */
export async function onTrapVortexDraw(btn)
{
  if (!game.user.targets?.size) return ui.notifications.warn("Target the one the vortex tries to draw in, then click again.");
  const claim = await claimTick(btn);
  if (!claim) return null;
  const v = TRAPS[claim.entry.trapKey]?.vortex;
  const draws = Math.max(1, Number(btn.dataset.draws) || 1);
  for (let i = 0; i < draws; i++) await postSaveCardsToTargets(null, v.name, [v.draw]);
  return claim.entry;
}

export function registerTrapCardButtons()
{
  // The clock's tick card: bound for everyone, refused for players in
  // claimTick, as the round card's buttons refuse.
  Hooks.on("renderChatMessage", (message, html) =>
  {
    html.find(".vaarn-trap-turn").click(ev => onTrapTurn(ev.currentTarget));
    html.find(".vaarn-trap-vortex-draw").click(ev => onTrapVortexDraw(ev.currentTarget));
  });
  Hooks.on("renderChatMessage", (message, html) =>
  {
    if (!game.user.isGM) return;
    const box = trapBox(message, message.content);
    if (box) html.find(".message-content").append(box);
  });

  // HAZARD CONTROLS ON JOURNAL PAGES (RULED 2026-09-27, Matt): a prepared
  // room's pinned journal page carries the same controls, so the Referee drives
  // a hazard from the room rather than hunting its card up the chat log. Only
  // while VIEWED - Foundry reports a page open for editing as editable - and
  // only for the GM. Foundry 11 hands this hook the page's top-level nodes
  // (its header and its content section) rather than one wrapper.
  Hooks.on("renderJournalPageSheet", (sheet, html) =>
  {
    if (!game.user.isGM || sheet.isEditable) return;
    const page = sheet.document;
    const box = trapBox(page, page?.text?.content);
    if (!box) return;
    const content = html.filter(".journal-page-content").add(html.find(".journal-page-content"));
    (content.length ? content : html.last()).append(box);
  });
}

/**
 * The controls for every hazard a text names, bound, or null when it names
 * none. `holder` is the document they sit on - a chat message or a journal
 * page - and is where a roll-once hazard keeps what it rolled.
 */
function trapBox(holder, content)
{
  const keys = trapsIn(content);
  if (!keys.length) return null;
  const box = $(`<div class="vaarn-trap-card">${keys.map(k => buttonsFor(k, holder)).join("")}</div>`);
  const on = (cls, fn) => box.find(cls).click(ev => { ev.preventDefault(); fn(ev.currentTarget.dataset.trap, ev.currentTarget); });
  on(".vaarn-trap-save", (k, el) => onTrapSave(k, Number(el.dataset.index)));
  on(".vaarn-trap-damage", k => onTrapDamage(k));
  on(".vaarn-trap-tick", k => onTrapTick(k));
  on(".vaarn-trap-projector", k => onTrapProjector(k));
  on(".vaarn-trap-turn-start", k => onTrapTurnStart(k));
  on(".vaarn-trap-vortex", k => onTrapVortex(k));
  on(".vaarn-trap-metal", k => postMetalReachCard(null, nameOf(k)));
  on(".vaarn-trap-tox", k => onTrapTox(k));
  on(".vaarn-trap-spawn", k => onTrapSpawn(k, holder));
  on(".vaarn-trap-poison", k => onTrapPoison(k, holder));
  on(".vaarn-trap-affliction", k => onTrapAffliction(k, holder));
  on(".vaarn-trap-famine", k => onTrapFamine(k));
  on(".vaarn-trap-reroll", k => clearDone(holder, k));
  return box;
}
