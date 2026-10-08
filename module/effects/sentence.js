/**
 * The effect sentence - Effect Engine: Foundations (foundry-system-index.csv
 * "Effect Engine: Foundations", format RULED 2026-10-05 by Matt).
 *
 * An Item's effects are a list of sentences in one flag, `vaarn.effects`. One
 * sentence:
 *
 *   {
 *     when:     "attack-hit"             trigger (a word in vocabulary.js TRIGGERS),
 *               or { trigger, attack, value, threshold }
 *     state:    "equipped"               passive only: the item state it needs
 *     requires: "carried"                use only: the item state the use needs
 *     if:       [{ gate, is, ask, default }]   gates, all of which must hold
 *     target:   "one-target"             or { who, range, n, die, by }
 *     do:       { verb, ...params }      the verb and its parameters
 *     resist:   { type: "save", ability, vs } | { type: "morale" } | { type: "opposed", ability }
 *     for:      "until-referee"          or { duration, amount }
 *     cost:     [{ kind, ... }]          one cost or a list
 *     mode:     "card"                   overrides the verb's default resolve mode
 *     text:     "the book's own words"   quoted by cards and reminders
 *     label:    "Burst of flame"         the use's button name (Interpreter step, 2026-10-05)
 *     baked:    true                     a stat sentence the Item's fields already include -
 *                                        never applied again (Weapon Tags ruling A, 2026-10-05)
 *     tag:      "Blinding"               the weapon tag a translated sentence came from
 *     tab:      { section, polarity }    where the Forgettable Effects tab files a note
 *                                        (GM Effect Builder, ruled 2026-10-05)
 *     then:     [sentence, ...]          chained on a failed/passed save (their `when`
 *                                        is on-failed-save or on-passed-save)
 *     delay:    { until, if }            mark now, resolve later only if it still holds
 *     count:    { n, of, then: [...] }   "unfed three days in a row, then ..."
 *     choice:   [[sentence...], ...]     the actor picks one branch
 *     alternate: [[sentence...], ...]    branches taken in turn
 *   }
 *
 * Shorthand strings are accepted where a single word says it all (`when`,
 * `target`, `for`); normalise() expands them so everything downstream reads
 * one shape.
 *
 * validate() returns a list of problems, empty when the sentence is sound. An
 * unregistered word is a problem: the registry in vocabulary.js is the
 * language, and a sentence outside it is refused rather than half-run.
 *
 * Pure: no Foundry global.
 */

import { TRIGGERS, GATES, TARGETS, VERBS, RESISTS, DURATIONS, COSTS, MODES, ITEM_STATES, ABILITIES } from "./vocabulary.js";
import { stateByKey } from "./states.js";

export const EFFECTS_FLAG = "effects";

const TOP_KEYS = new Set(["when", "state", "requires", "if", "target", "do", "resist", "for", "cost", "mode", "text", "label", "baked", "tag", "tab",
                          "then", "delay", "count", "choice", "alternate", "id",
                          // The chat line a use posts, "<Actor> says" - an Exotica's hand-written use line
                          // (Implants, Exotica and Figments chunk 3b, RULED 2026-10-06). Replaces the default line.
                          "says"]);
const CHAIN_TRIGGERS = new Set(["on-failed-save", "on-passed-save"]);

/** One shape for everything downstream: shorthand strings expanded. Never mutates. */
export function normalise(s)
{
  if (!s || typeof s !== "object") return s;
  const out = { ...s };
  if (typeof out.when === "string") out.when = { trigger: out.when };
  if (typeof out.target === "string") out.target = { who: out.target };
  if (typeof out.for === "string") out.for = { duration: out.for };
  if (out.cost && !Array.isArray(out.cost)) out.cost = [out.cost];
  if (out.if && !Array.isArray(out.if)) out.if = [out.if];
  return out;
}

/**
 * The size of a per-day pool: its number, or the bearer's Level for "@level";
 * null when the sentence has no per-day cost. Here rather than in interpret.js
 * so daily-pool.js, which item.js loads early, reads it without the
 * interpreter's import chain (Mutations and Ancestry Rules chunk 4).
 */
export function perDaySizeOf(sentence, level)
{
  const c = (normalise(sentence)?.cost ?? []).find(x => x.kind === "per-day");
  if (!c) return null;
  return c.n === "@level" ? (Number(level) || 1) : Number(c.n);
}

/** Problems with one sentence; [] when it is sound. `at` prefixes each message. */
export function validate(sentence, at = "sentence")
{
  const errs = [];
  const err = m => errs.push(`${at}: ${m}`);
  if (!sentence || typeof sentence !== "object" || Array.isArray(sentence)) { err("not an object"); return errs; }
  const s = normalise(sentence);

  for (const k of Object.keys(s)) if (!TOP_KEYS.has(k)) err(`unknown key "${k}"`);

  // WHEN
  const trigger = s.when?.trigger;
  if (!trigger) err("no trigger (when)");
  else if (!TRIGGERS[trigger]) err(`unregistered trigger "${trigger}"`);

  // Item state: passive needs one (or takes the item type's default); use may require one.
  if (s.state !== undefined)
  {
    if (!ITEM_STATES[s.state]) err(`unknown item state "${s.state}"`);
    if (trigger && trigger !== "passive") err(`"state" is for passive sentences; a ${trigger} sentence uses "requires"`);
  }
  if (s.requires !== undefined)
  {
    if (!ITEM_STATES[s.requires]) err(`unknown item state "${s.requires}" in requires`);
    if (trigger === "passive") err(`a passive sentence names its item state with "state", not "requires"`);
  }

  // IF
  for (const [i, g] of (s.if ?? []).entries())
  {
    if (!g || typeof g !== "object") { err(`gate ${i} is not an object`); continue; }
    if (!GATES[g.gate]) err(`unregistered gate "${g.gate}"`);
    if (g.ask !== undefined && !["roller", "gm"].includes(g.ask)) err(`gate "${g.gate}": ask must be roller or gm`);
    if (g.known !== undefined && !["computed", "standing", "asked"].includes(g.known)) err(`gate "${g.gate}": unknown "known" ${g.known}`);
  }

  // TARGET
  if (s.target !== undefined)
  {
    if (!s.target?.who) err("target has no who");
    else if (!TARGETS[s.target.who]) err(`unregistered target "${s.target.who}"`);
  }

  // DO - a verb is required unless the sentence is only a structure.
  const structural = s.choice || s.alternate || s.count || s.delay;
  if (!s.do && !structural) err("no verb (do)");
  if (s.do)
  {
    const v = VERBS[s.do.verb];
    if (!s.do.verb) err("do has no verb");
    else if (!v) err(`unregistered verb "${s.do.verb}"`);
    else
    {
      for (const p of v.params) if (s.do[p] === undefined) err(`verb "${s.do.verb}" needs "${p}"`);
      if (s.do.verb === "condition" && s.do.state && !stateByKey(s.do.state))
        err(`unregistered state "${s.do.state}"`);
      if (s.do.verb === "ability-damage" && s.do.ability && !ABILITIES.includes(s.do.ability))
        err(`unknown ability "${s.do.ability}"`);
    }
  }

  // RESIST
  if (s.resist !== undefined)
  {
    const r = RESISTS[s.resist?.type];
    if (!r) err(`unregistered resist "${s.resist?.type}"`);
    else for (const p of r.params) if (s.resist[p] === undefined) err(`resist "${s.resist.type}" needs "${p}"`);
    if (s.resist?.ability && !ABILITIES.includes(s.resist.ability)) err(`unknown ability "${s.resist.ability}" in resist`);
  }

  // FOR
  if (s.for !== undefined)
  {
    const d = DURATIONS[s.for?.duration];
    if (!d) err(`unregistered duration "${s.for?.duration}"`);
    else if (d.amount && s.for.amount === undefined) err(`duration "${s.for.duration}" needs an amount`);
  }

  // COST
  for (const [i, c] of (s.cost ?? []).entries())
    if (!COSTS[c?.kind]) err(`unregistered cost "${c?.kind}" (cost ${i})`);

  if (s.mode !== undefined && !MODES.includes(s.mode)) err(`unknown mode "${s.mode}"`);
  if (s.text !== undefined && typeof s.text !== "string") err("text is not a string");
  if (s.label !== undefined && typeof s.label !== "string") err("label is not a string");
  if (s.says !== undefined && typeof s.says !== "string") err("says is not a string");
  if (s.baked !== undefined && s.baked !== true) err("baked is true or absent");
  if (s.baked && trigger !== "stat") err("only a stat sentence is baked");
  // Where the Forgettable Effects tab files a GM's note (GM Effect Builder, ruled 2026-10-05).
  if (s.tab !== undefined)
  {
    if (!s.tab || typeof s.tab !== "object") err("tab is not an object");
    else
    {
      if (s.tab.section !== undefined && !["Always Active", "On-Demand"].includes(s.tab.section)) err(`unknown tab section "${s.tab.section}"`);
      if (s.tab.polarity !== undefined && !["Benefit", "Detriment"].includes(s.tab.polarity)) err(`unknown tab polarity "${s.tab.polarity}"`);
      if (s.tab.category !== undefined && typeof s.tab.category !== "string") err("tab category is not a string");
    }
  }

  // Nested sentences.
  for (const [i, t] of (s.then ?? []).entries())
  {
    const tw = normalise(t)?.when?.trigger;
    if (tw && !CHAIN_TRIGGERS.has(tw)) err(`then[${i}] must trigger on-failed-save or on-passed-save, not "${tw}"`);
    errs.push(...validate(t, `${at}.then[${i}]`));
  }
  for (const key of ["choice", "alternate"])
    for (const [i, branch] of (s[key] ?? []).entries())
    {
      if (!Array.isArray(branch)) { err(`${key}[${i}] is not a list of sentences`); continue; }
      branch.forEach((b, j) => errs.push(...validate(b, `${at}.${key}[${i}][${j}]`)));
    }
  if (s.count)
  {
    if (!(Number(s.count.n) > 0)) err("count needs n > 0");
    (s.count.then ?? []).forEach((t, i) => errs.push(...validate(t, `${at}.count.then[${i}]`)));
  }
  if (s.delay && !s.delay.until) err("delay needs until");

  return errs;
}

/** Problems with an Item's whole effects list. */
export function validateEffects(list, at = "effects")
{
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) return [`${at}: not a list`];
  return list.flatMap((s, i) => validate(s, `${at}[${i}]`));
}
