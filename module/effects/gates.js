/**
 * Gates at the table - Effect Engine: Weapon Tags, chunk 1 (foundry-system-
 * index.csv "Effect Engine: Weapon Tags", RULED 2026-10-05 by Matt; the gate
 * rulings of 2026-10-04 on the Effect Engine row).
 *
 * A sentence's IF gates must all hold for it to apply. Each gate is settled
 * one of three ways (interpret.js holds the pure half):
 *
 *   computed  - a reader works it out (creature type, AV, metal armour...).
 *   standing  - a person answers once; the answer is remembered for the
 *               combat, or the scene outside combat (weather, daylight).
 *   asked     - a person answers each time (darkness, charging, submerged).
 *
 * WHO ANSWERS: the roller about themselves, the GM about a target. A player's
 * question for the GM goes over the system socket to the active GM's client
 * and waits for the answer, as the write relay does (combat/gm-relay.js).
 *
 * PROMPTS ARE A PER-USER SETTING with a world default. With prompts off -
 * or no answer within the timeout, or the dialog closed - the gate's default
 * answer is used, and the card names it ("Assumed no (nobody was asked):
 * Is the Ghoul submerged in water?") so the table can overrule it.
 */
import { gateInfo, gateHolds, defaultFact, assumedLine, questionFor, standingKey, isTargetGate } from "./interpret.js";
import { hasAnyCreatureType } from "../item/attack-properties.js";
import { wearsMetalArmour } from "../item/metal.js";
import { hasCondition } from "../time/stateful-effect.js";

const SCOPE = "vaarn";
const CHANNEL = "system.vaarn";
const TIMEOUT_MS = 30000;
export const PROMPT_SETTING = "gatePrompts";
export const PROMPT_DEFAULT_SETTING = "gatePromptsDefault";
const STANDING_FLAG = "standingGates";
const pending = new Map();

/* ---------------- Settings ---------------- */

export function registerGateSettings()
{
  game.settings.register(SCOPE, PROMPT_DEFAULT_SETTING, {
    name: "Questions the system cannot answer (world default)",
    hint: "Some effects depend on something the system cannot see - darkness, a charge, a submerged target. Ask: the roller (about themselves) or the Referee (about a target) is asked. Assume: the effect's default answer is used and named on the card. Each user can override this.",
    scope: "world", config: true, type: String, default: "ask",
    choices: { ask: "Ask", assume: "Assume the default answer" }
  });
  game.settings.register(SCOPE, PROMPT_SETTING, {
    name: "Questions the system cannot answer (for you)",
    hint: "Whether you are asked when an effect depends on something the system cannot see. The world default is set by the Referee.",
    scope: "client", config: true, type: String, default: "world",
    choices: { world: "Use the world default", ask: "Ask me", assume: "Assume the default answer" }
  });
}

/** Does the current user want to be asked? */
export function promptsOn()
{
  let mine = "world";
  try { mine = game.settings.get(SCOPE, PROMPT_SETTING); } catch(e) { /* not registered yet */ }
  if (mine === "ask") return true;
  if (mine === "assume") return false;
  try { return game.settings.get(SCOPE, PROMPT_DEFAULT_SETTING) !== "assume"; } catch(e) { return true; }
}

/* ---------------- Computed gates ---------------- */

const asActor = t => t?.actor ?? t ?? null;
const list = v => Array.isArray(v) ? v : [v];

/**
 * The fact a computed gate reads, or undefined when it cannot be read here
 * (no target, no roll). `ctx`: { actor, target, targetAV, natural }.
 */
export function computeGate(g, ctx = {})
{
  const target = asActor(ctx.target);
  switch (g?.gate)
  {
    case "creature-type":      return target ? hasAnyCreatureType(target, list(g.is)) : undefined;
    case "is-pc":              return target ? target.type === "character" : undefined;
    case "wears-metal-armour": return target ? !!wearsMetalArmour(target) : undefined;
    case "has-state":          return target ? !!hasCondition(target, g.is) : undefined;
    case "in-combat":          return !!game.combat?.started;
    // The speaker's standing with the faction the GM named (Reaction Roll from
    // Faction Standing, RULED 2026-10-07): the caller passes it, so this module
    // never imports the faction module, which needs Foundry.
    case "faction-rep":        return ctx.standing ? ctx.standing === g.is : undefined;
    // Mutations and Ancestry Rules chunk 2b (2026-10-05). The bearer carries an
    // item of this name - Albino's sunshade ({ gate: "carries", item, is: false }).
    case "carries":            return (ctx.actor?.items ? [...ctx.actor.items] : []).some(i => i.name === (g.item ?? g.is));
    // The target's ancestry (ruling E: the vocabulary had the word and no reader).
    case "ancestry":           return target ? target.system?.ancestry === g.is : undefined;
    // The WIELDER's ability against a value (Heavy and Colossal's STR to
    // equip, Weapon Tags chunk 5a): { ability, below | atMost | atLeast }.
    case "ability-threshold":
    {
      const v = ctx.actor?.system?.abilities?.[g.is?.ability]?.effective;
      if (v === undefined || v === null) return undefined;
      if (g.is.below !== undefined) return Number(v) < g.is.below;
      if (g.is.atMost !== undefined) return Number(v) <= g.is.atMost;
      if (g.is.atLeast !== undefined) return Number(v) >= g.is.atLeast;
      return undefined;
    }
    case "coin":               return Math.random() < 0.5;
    case "chance":
    {
      const of = Number(g.is?.of ?? 6), in_ = Number(g.is?.in ?? 1);
      return Math.ceil(Math.random() * of) <= in_;
    }
    case "target-av":
    {
      const av = ctx.targetAV ?? target?.system?.armor?.value;
      if (av === undefined || av === null) return undefined;
      if (g.is?.atMost !== undefined) return av <= g.is.atMost;
      if (g.is?.atLeast !== undefined) return av >= g.is.atLeast;
      return undefined;
    }
    case "natural-roll":
    {
      const n = ctx.natural;
      if (n === undefined || n === null) return undefined;
      if (g.is?.atMost !== undefined) return n <= g.is.atMost;
      if (g.is?.equals !== undefined) return n === g.is.equals;
      return undefined;
    }
    default: return undefined;
  }
}

/**
 * Whether a computed gate holds. Its `is` is already folded in by the reader
 * (creature-type "biological"), except a plain true/false, which flips it.
 */
function computedHolds(g, ctx)
{
  const fact = computeGate(g, ctx);
  if (fact === undefined) return false;
  return g.is === false ? !fact : !!fact;
}

/* ---------------- Standing answers ---------------- */

/** Where a standing answer lives: the running combat, else the viewed scene. */
function standingHome()
{
  return game.combat?.started ? game.combat : (game.scenes?.viewed ?? null);
}

function standingAnswer(key)
{
  return standingHome()?.getFlag?.(SCOPE, STANDING_FLAG)?.[key];
}

async function rememberStanding(key, fact)
{
  const home = standingHome();
  if (!home?.setFlag) return;
  await home.setFlag(SCOPE, STANDING_FLAG, { ...(home.getFlag(SCOPE, STANDING_FLAG) ?? {}), [key]: fact });
}

/* ---------------- Asking ---------------- */

/** Ask the current user a yes/no question. Resolves true, false, or undefined if closed. */
function askHere(question, title)
{
  return new Promise(resolve =>
  {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    new Dialog({
      title, content: `<p>${question}</p>`,
      buttons: { yes: { label: "Yes", callback: () => finish(true) }, no: { label: "No", callback: () => finish(false) } },
      default: "yes", close: () => finish(undefined)
    }).render(true);
  });
}

/** Ask the active GM, from a player's client. Resolves the answer, or undefined. */
function askGM(question, title)
{
  const gm = game.users.activeGM;
  if (!gm) return Promise.resolve(undefined);
  const id = foundry.utils.randomID();
  return new Promise(resolve =>
  {
    const timer = setTimeout(() => { pending.delete(id); resolve(undefined); }, TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    game.socket.emit(CHANNEL, { type: "gate-ask", id, from: game.user.id, question, title });
  });
}

async function onSocket(msg)
{
  if (msg?.type === "gate-answer")
  {
    if (msg.to !== game.user.id) return;
    const p = pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.timer);
    pending.delete(msg.id);
    p.resolve(msg.fact);
    return;
  }
  if (msg?.type !== "gate-ask") return;
  if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  // The answering GM's own setting decides whether they are asked.
  const fact = promptsOn() ? await askHere(msg.question, msg.title) : undefined;
  game.socket.emit(CHANNEL, { type: "gate-answer", id: msg.id, to: msg.from, fact: fact ?? null });
}

/** Called from knave.js at init. */
export function registerGateSocket()
{
  Hooks.once("ready", () => game.socket.on(CHANNEL, onSocket));
}

/**
 * The fact for one standing or asked gate: remembered, asked, or the default.
 * Returns { fact, line } - `line` names a default when one was used.
 */
async function personFact(g, ctx)
{
  const info = gateInfo(g);
  // The subject is the target for a gate about a target, else the user.
  const subjectDoc = isTargetGate(g) ? asActor(ctx.target) : ctx.actor;
  const subject = subjectDoc?.name ?? "";
  const key = standingKey(g, isTargetGate(g) ? (subjectDoc?.uuid ?? "") : "");
  if (info.known === "standing")
  {
    const remembered = standingAnswer(key);
    if (remembered === true || remembered === false) return { fact: remembered, line: "" };
  }
  const question = questionFor(g, subject);
  const title = ctx.title ?? "A question";
  let fact;
  if (info.ask === "gm" && !game.user.isGM) fact = await askGM(question, title);
  else if (promptsOn()) fact = await askHere(question, title);
  if (fact === true || fact === false)
  {
    if (info.known === "standing") await rememberStanding(key, fact);
    return { fact, line: "" };
  }
  const assumed = defaultFact(g, d => computeGate(d, ctx));
  return { fact: assumed, line: assumedLine(g, subject, assumed) };
}

/**
 * Settle a list of gates for one subject. `ctx`: { actor, target, targetAV,
 * natural, title }. Returns { pass, lines } - `lines` are the assumed
 * defaults to show on the card. Stops at the first gate that fails, so nobody
 * is asked a question whose answer cannot matter.
 */
export async function settleGates(gates, ctx = {})
{
  const lines = [];
  for (const g of gates ?? [])
  {
    const info = gateInfo(g);
    if (info.known === "computed")
    {
      if (!computedHolds(g, ctx)) return { pass: false, lines };
      continue;
    }
    const { fact, line } = await personFact(g, ctx);
    if (line) lines.push(line);
    if (!gateHolds(g, fact)) return { pass: false, lines };
  }
  return { pass: true, lines };
}

/**
 * A passive sentence's gates, settled WITHOUT asking anyone - a passive is
 * read while a sheet is drawn or a roll is made, where a dialog cannot wait.
 * A standing gate uses its remembered answer; anything unanswered takes its
 * default. Synchronous.
 */
/**
 * A standing gate's remembered answer for the scene or combat - true, false, or
 * undefined when nobody has been asked yet (Mutations and Ancestry Rules chunk
 * 2b: a save posts Albino's reminder only while daylight is unanswered).
 */
export function standingKnown(g)
{
  const r = standingAnswer(standingKey(g, ""));
  return r === true || r === false ? r : undefined;
}

export function passiveGatesHold(gates, ctx = {})
{
  for (const g of gates ?? [])
  {
    const info = gateInfo(g);
    let holds;
    if (info.known === "computed") holds = computedHolds(g, ctx);
    else
    {
      const key = standingKey(g, "");
      const remembered = info.known === "standing" ? standingAnswer(key) : undefined;
      const fact = (remembered === true || remembered === false) ? remembered : defaultFact(g, d => computeGate(d, ctx));
      holds = gateHolds(g, fact);
    }
    if (!holds) return false;
  }
  return true;
}
