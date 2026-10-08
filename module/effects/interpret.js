/**
 * The interpreter's pure half - Effect Engine: Interpreter and Mystic Gifts
 * (foundry-system-index.csv "Effect Engine: Interpreter and Mystic Gifts",
 * BUILD PLAN RULED 2026-10-05 by Matt), chunk 1.
 *
 * Everything here decides; nothing here acts. interpreter.js runs what
 * planUse() returns. Split so tools/test-interpreter.mjs can prove every
 * decision without Foundry, the way sentence.js and vocabulary.js are proven.
 *
 * WHAT CHUNK 1 HANDLES: the "use" trigger; the verbs damage, heal, condition
 * and reminder, and a choice between them; the hp cost; the item state a use
 * requires. Gates and the passive trigger belong to Effect Engine: Weapon Tags
 * (ruling D). A sentence using a word outside HANDLED is refused by name
 * rather than half-run, the same stance the validator takes.
 *
 * Pure: no Foundry global.
 */

import { normalise, validate, EFFECTS_FLAG } from "./sentence.js";
import { defaultModeFor, itemStateDefault, GATES } from "./vocabulary.js";
import { stateByKey } from "./states.js";
import { conditionByKey } from "../actor/condition-data.js";

export const SCOPE = "vaarn";

/** The words this step resolves. The Gift editor offers only these verbs. */
export const HANDLED = {
  triggers: new Set(["use", "passive"]),
  // `toxin` since Implants, Exotica and Figments chunk 3b (2026-10-06): a use that
  // posts TOX saves (Mord-Red's Grail).
  verbs: new Set(["damage", "heal", "condition", "reminder", "toxin"]),
  // Mutations and Ancestry Rules chunk 4 (RULED 2026-10-05/06): the per-day
  // pool (Ink Ducts, Gas Glands), a use that reaches everyone in range, a hold
  // until the holder saves (Silk Production), a save on a use, and the named
  // one-off handlers. `special` is not in `verbs`: its mode is never read -
  // the handler does the work - so it is handled by name, below.
  // Chunk 3b (2026-10-06): an Exotica's usage-die roll and its charge.
  // Consumables chunk 3a (2026-10-06): an Elixir's vial, spent by the drink.
  costs: new Set(["hp", "per-day", "usage-die-step", "charge", "consumed"]),
  targets: new Set(["self", "one-target", "up-to-n", "all-in-range"]),
  durations: new Set(["instant", "rounds", "turns", "hours", "days", "until-referee", "until-saved",
                      // Chunk 3b (2026-10-06): the Fate Inverter's, ended by the combat's end.
                      "until-combat-ends"]),
  resists: new Set(["save", "opposed"]),
  handlers: new Set(["self-save", "hourly-heal", "ambusher", "inheritor", "worm-wise", "repairs", "spores", "bloomboons",
                     // Implants, Exotica and Figments chunk 3a (2026-10-06).
                     "trauma-rig", "berserker-stimrig", "magnetised-palms",
                     // Chunk 3b (2026-10-06): the Exotica one-offs.
                     "amaranthine-sugar", "cybernetics-capsule", "belligerent-paste", "permanent-ability", "field-generator",
                     "blue-rust", "body-change", "metal-pull", "hold", "universal-ration", "save-gated", "combat-av", "combat-auto-hit",
                     // Consumables chunk 3a (2026-10-06): the elixir drinks.
                     "stateful", "grant-ability", "clone", "bifurcate", "set-hp", "spawn", "grant-pick", "grant-roll",
                     "baked-item", "grant-fixed", "permanent-change",
                     // Chunk 3b (2026-10-06): a Bloomboon's growth - a part, a fruit, retainers.
                     "grow"]),
  // Weapon Tags chunk 1 (RULED 2026-10-05): the computed gates the system can
  // read today, and every standing or asked gate - those are answered by a
  // person or a named default, so none needs a reader of its own.
  computedGates: new Set(["creature-type", "is-pc", "target-av", "natural-roll", "wears-metal-armour", "in-combat",
                          "chance", "coin", "has-state", "ability-threshold",
                          // Mutations and Ancestry Rules chunk 2b (2026-10-05).
                          "carries", "ancestry"])
};

/** Is this gate one the interpreter can settle - computed by a reader, or answered by a person? */
export function gateHandled(g)
{
  const known = g?.known ?? GATES[g?.gate]?.known;
  if (known === "standing" || known === "asked") return true;
  return HANDLED.computedGates.has(g?.gate);
}

/**
 * RULES THAT BELONG TO A KIND OF SOURCE, not to one sentence. The book, Mystic
 * Gifts: "Gifts always hit in combat" (no resist on a Gift sentence is ever
 * rolled - there is none to write) and "Gifts cannot heal their user's HP".
 * Gift damage also carries the `gift` property beside any type, so Psychic
 * Mirror and the Gift immunities read it (RULED 2026-09-26 and 2026-09-29).
 */
export const SOURCE_RULES = {
  gift: { property: "gift", healsUser: false }
};

export function sourceRules(itemType)
{
  return SOURCE_RULES[itemType] ?? { property: null, healsUser: true };
}

/* ---------------- Reading an Item's sentences ---------------- */

/**
 * Translators by Item type: an Item made before its kind was converted has no
 * vaarn.effects and is read through one of these (RULED 2026-10-05: nothing is
 * migrated). Registered by the module that owns the old shape.
 */
// A HOISTED FUNCTION, NOT A CONST (Mutations and Ancestry Rules chunk 2a,
// 2026-10-05): a translator module can register while this file is still being
// evaluated - interpret.js reads condition-data.js, which reads effects/body.js,
// which loads the mutation translators - and a const is not yet initialised
// then. A function declaration is ready from the start.
function translators()
{
  if (!translators.table) translators.table = {};
  return translators.table;
}

export function registerTranslator(itemType, fn)
{
  translators()[itemType] = fn;
}

/** Has this Item type's old shape a translator yet - is the kind converted? */
export function hasTranslator(itemType)
{
  return typeof translators()[itemType] === "function";
}

/**
 * The Item's sentences, normalised. vaarn.effects wins once it exists - even
 * an empty list, which means "every effect removed", not "never converted".
 */
export function sentencesOf(item)
{
  const own = item?.flags?.[SCOPE]?.[EFFECTS_FLAG];
  const translate = translators()[item?.type];
  // GM Effect Builder ruling 2 (2026-10-05): a list written on an Item whose
  // kind had no translator yet holds only what the GM added, and says so; when
  // its kind is converted, the book's sentences come back in front of it.
  if (Array.isArray(own) && item?.flags?.[SCOPE]?.[EFFECTS_ADDED_FLAG] && translate)
    return [...(translate(item) ?? []), ...own].map(normalise);
  if (Array.isArray(own)) return own.map(normalise);
  return translate ? (translate(item) ?? []).map(normalise) : [];
}

/** The flag ruling 2 sets: this Item's own list does not include its book effects. */
export const EFFECTS_ADDED_FLAG = "effectsAdded";

/** How many of sentencesOf's entries are the book's, read through a translator in front of a GM's additions. */
export function bookCountOf(item)
{
  const own = item?.flags?.[SCOPE]?.[EFFECTS_FLAG];
  const translate = translators()[item?.type];
  if (Array.isArray(own) && item?.flags?.[SCOPE]?.[EFFECTS_ADDED_FLAG] && translate) return (translate(item) ?? []).length;
  return 0;
}

const triggerOf = s => normalise(s)?.when?.trigger;

/** The sentences a sheet click can run, each with its index in the full list. */
export function useSentences(item)
{
  return sentencesOf(item).map((s, index) => ({ s, index })).filter(({ s }) => triggerOf(s) === "use");
}

/* ---------------- Labels ---------------- */

const title = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const plain = t => String(t ?? "").replace(/<[^>]*>/g, "").trim();
const clip = t => t.length > 40 ? t.slice(0, 37) + "..." : t;

/** What a verb does, in a few words - a button when the sentence has no label. */
export function verbLabel(d)
{
  switch (d?.verb)
  {
    case "damage":    return d.type ? `${title(d.type)} damage` : "Damage";
    case "heal":      return "Healing";
    case "condition": return d.name || stateByKey(d.state)?.label || "Condition";
    case "reminder":  return d.name || "";
    default:          return "";
  }
}

/** The use's button name. */
export function sentenceLabel(s)
{
  const n = normalise(s);
  if (n?.label) return n.label;
  if (n?.choice) return n.choice.map(b => verbLabel(normalise(b[0])?.do)).filter(Boolean).join(" or ") || "Choice";
  return verbLabel(n?.do) || clip(plain(n?.text)) || "Described effect";
}

/* ---------------- Item state ---------------- */

/**
 * Does the Item meet a state? `installed` is the Item type's own default
 * state (an implant, a mutation, a Gift); `equipped` is worn or in hand;
 * `carried` is anywhere on the actor, which every owned Item is.
 */
export function meetsState(item, need)
{
  if (need === "equipped") return item?.system?.equipped === true;
  if (need === "installed") return itemStateDefault(item?.type) === "installed";
  return true;
}

/** The state a use sentence requires: its own, else its Item type's default. */
export function requiredState(item, s)
{
  return normalise(s)?.requires ?? itemStateDefault(item?.type);
}

/* ---------------- Formulas ---------------- */

const VAR = /@(cost|str|dex|con|int|psy|ego)\b/g;

/**
 * A dice expression with its variables filled in: @cost is the die paid for
 * the use, @str..@ego the user's ability bonus. A Gift's damage is
 * "@cost+@psy": "roll damage dice of the same size the user paid in HP,
 * adding the user's PSY bonus" (Mystic Gifts). A missing value is an error,
 * never a silent 0.
 */
export function fillFormula(expr, { cost = null, abilities = {} } = {})
{
  const missing = [];
  const out = String(expr ?? "").replace(VAR, (_, v) =>
  {
    const val = v === "cost" ? cost : abilities[v];
    if (val === null || val === undefined || val === "") { missing.push(`@${v}`); return "0"; }
    return String(val);
  }).replace(/\+\s*-/g, "-");
  return { formula: out, missing };
}

/** The expression as a player reads it on a roll: "1d8+PSY". */
export function readableFormula(expr, cost = null)
{
  return String(expr ?? "").replace(VAR, (_, v) => v === "cost" ? (cost ?? "the cost die") : v.toUpperCase());
}

/** Does any part of the sentence use @cost - so the cost must be a die, not a flat figure? */
export function usesCost(s)
{
  return JSON.stringify(s ?? {}).includes("@cost");
}

/* ---------------- Durations ---------------- */

const UNITS = { rounds: "round", turns: "turn", hours: "hour", days: "day" };

/** The ruled sentence for "until the Referee ends it" (Mystic Gift conditions, 2026-09-29). */
export const UNTIL_ENDED = "Lasts until the Referee ends it.";

/**
 * A board clock for a sentence's `for`: { rounds, unit, until }. No `for` on a
 * condition means it lasts until the Referee ends it - the ruled Gift default,
 * and the safe reading of any condition the source gave no clock.
 */
export function clockFor(s)
{
  const f = normalise(s)?.for;
  if (!f || f.duration === "until-referee") return { rounds: null, unit: "round", until: UNTIL_ENDED };
  // Ended by the combat's end (Implants, Exotica and Figments chunk 3b).
  if (f.duration === "until-combat-ends") return { rounds: null, unit: "round", until: "", endsWithCombat: true };
  // `amount` kept as written, so a dice span (d6 rounds) is rolled when used (chunk 3b).
  if (UNITS[f.duration]) return { rounds: Number(f.amount), amount: f.amount, unit: UNITS[f.duration], until: "" };
  return { rounds: null, unit: "round", until: "" };
}

/* ---------------- Planning ---------------- */

/** Words in a sentence (and its choice branches) that this step does not resolve. */
export function unhandledWords(s)
{
  const n = normalise(s);
  const out = [];
  if (n.when?.trigger && !HANDLED.triggers.has(n.when.trigger)) out.push(`trigger "${n.when.trigger}"`);
  for (const c of n.cost ?? []) if (!HANDLED.costs.has(c.kind)) out.push(`cost "${c.kind}"`);
  for (const g of n.if ?? []) if (!gateHandled(g)) out.push(`gate "${g?.gate}"`);
  // A save on a use: the targets' save cards, a failure applying the condition.
  // Chunk 3b: a failed save's EGO damage (Bluescreen Dagger), its death (Singularity Bomb), a lasting effect (Empathy Bomb).
  if (n.resist && !(HANDLED.resists.has(n.resist.type) && RESIST_VERBS.has(n.do?.verb))) out.push("resist");
  if (n.target && !HANDLED.targets.has(n.target.who)) out.push(`target "${n.target.who}"`);
  // A named handler owns its whole sentence, its duration too (the Berserker
  // StimRig ends with the combat in its own code - chunk 3a, 2026-10-06).
  if (n.for && n.do?.verb !== "special" && !HANDLED.durations.has(n.for.duration)) out.push(`duration "${n.for.duration}"`);
  if (n.do?.verb === "special") { if (!HANDLED.handlers.has(n.do.handler)) out.push(`handler "${n.do.handler}"`); }
  // A failed save's harm (ability-damage, kill) is handled only on a save (chunk 3b).
  else if (n.do && !HANDLED.verbs.has(n.do.verb) && !(n.resist && RESIST_VERBS.has(n.do.verb))) out.push(`verb "${n.do.verb}"`);
  for (const k of ["then", "delay", "count", "alternate"]) if (n[k]) out.push(k);
  for (const branch of n.choice ?? [])
    for (const b of branch) out.push(...unhandledWords({ when: "use", ...b }));
  return [...new Set(out)];
}

/** The verbs a save on a use can carry (chunk 4; chunk 3b of Implants, Exotica and Figments). */
const RESIST_VERBS = new Set(["condition", "reminder", "ability-damage", "kill"]);

/** The resolve mode of one verb sentence: its own, else the verb's default on its trigger. */
export function modeOf(s)
{
  const n = normalise(s);
  return n.mode ?? defaultModeFor(n.do?.verb, n.when?.trigger) ?? "card";
}

/**
 * The options one use offers: a plain sentence is one option, a choice is
 * one per branch (each branch's first sentence; the "Other use" choice is one
 * roll offered as damage or healing). Each option: { verb, expr, type, state,
 * name, text, mode }.
 */
export function optionsOf(s)
{
  const n = normalise(s);
  const branches = n.choice ? n.choice.map(b => normalise({ when: n.when?.trigger ?? "use", ...b[0] })) : [n];
  return branches.map(b => ({
    verb: b.do?.verb,
    expr: b.do?.verb === "damage" ? b.do.dice : b.do?.verb === "heal" ? b.do.amount : null,
    type: b.do?.type ?? null,
    state: b.do?.state ?? null,
    // What a lasting effect writes on the board, and a TOX use's die (chunk 3b).
    effectText: b.do?.effectText ?? null,
    die: b.do?.die ?? null,
    // A named one-off (chunk 4): the handler and its parameters, the do as written.
    special: b.do?.verb === "special" ? b.do : null,
    name: b.do?.name ?? null,
    text: b.text ?? n.text ?? "",
    label: b.label ?? verbLabel(b.do),
    mode: b.mode ?? n.mode ?? modeOf(b),
    clock: clockFor(b.for ? b : n),
    // A reminder with a duration lasts: it is a board entry, not a chat line
    // (engine ruling 2026-10-04: every lasting effect is one board entry).
    lasting: !!(b.for ?? n.for)
  }));
}

/**
 * Everything the runtime needs to resolve one use, or a refusal. `ctx`:
 * { costDie, sustained } - the die the user chose for an hp cost of
 * `die: "chosen"`, and whether they are sustaining it.
 */
export function planUse(item, sentence, ctx = {})
{
  const s = normalise(sentence);
  const problems = validate(s);
  if (problems.length) return { refused: `this effect is not well formed (${problems[0]})` };
  const unhandled = unhandledWords(s);
  if (unhandled.length) return { refused: `this effect uses words the system does not resolve yet: ${unhandled.join(", ")}` };
  if (s.when?.trigger !== "use") return { refused: "this effect is not used from the sheet" };

  const need = requiredState(item, s);
  if (!meetsState(item, need)) return { refused: `it must be ${need} to be used` };

  const costs = (s.cost ?? []).map(c => ({ ...c }));
  const hp = costs.find(c => c.kind === "hp");
  let costDie = null;
  if (hp)
  {
    costDie = hp.die === "chosen" || !hp.die ? (ctx.costDie ?? null) : hp.die;
    if (!costDie) return { refused: "the HP cost die was not chosen" };
  }
  if (usesCost(s) && !costDie) return { refused: "its roll uses the cost die, and it has no HP cost" };

  const rules = sourceRules(item?.type);
  const options = optionsOf(s);
  return {
    refused: null,
    label: sentenceLabel(s),
    costDie,
    // Gift Sustained Use Cost: paying the same die again each Exploration
    // Turn is the user's choice at the cast, so it rides on the context.
    sustain: !!(hp && ctx.sustained),
    target: s.target?.who ?? null,
    options,
    rules,
    rolls: [...new Set(options.map(o => o.expr).filter(Boolean))],
    // Chunk 4: a per-day cost spends one use from the Item's daily pool
    // (daily-pool.js sizes it); a resist puts the condition on through the
    // targets' save cards (saveCardOf).
    perDay: costs.some(c => c.kind === "per-day"),
    // Chunk 3b: an Exotica's usage-die roll, rolled before the effect, and its
    // charge, spent after it unless a handler keeps it (a refused drink).
    usageDie: costs.some(c => c.kind === "usage-die-step"),
    charge: costs.some(c => c.kind === "charge"),
    // Consumables chunk 3a: an Elixir's vial, spent after the drink unless a handler keeps it.
    consumed: costs.some(c => c.kind === "consumed"),
    says: s.says ?? null,
    resist: s.resist ? saveCardOf(s) : null
  };
}

/**
 * A use's save, as the save card takes it - Mutations and Ancestry Rules chunk
 * 4. The targets roll; a failure puts the condition on (compelled-save.js).
 * Returns { save, applies } in the shape the mutation roster wrote by hand
 * (Ink Ducts, Gas Glands, Silk Production), which tools/test-mutation-effects
 * holds it equal to. A creature-type gate rides the save as its `targets`, so
 * an open card refuses a roller the effect cannot reach.
 */
export function saveCardOf(sentence)
{
  const s = normalise(sentence);
  const r = s.resist;
  if (!r) return null;
  const types = (s.if ?? []).filter(g => g?.gate === "creature-type").map(g => g.is);
  const save = { ability: r.ability, mode: "resist", vs: r.vs,
                 ...(r.type === "opposed" ? { opposed: true } : {}),
                 ...(types.length ? { targets: types } : {}) };
  const f = s.for ?? {};
  // A failed save's harm with no condition (chunk 3b): Bluescreen Dagger's
  // EGO damage, the Singularity Bomb's death - on the save, as the roster wrote it.
  if (s.do?.verb === "ability-damage") return { save: { ...save, onFail: { abilityDamage: { ability: s.do.ability, dice: s.do.dice } } }, applies: null };
  if (s.do?.verb === "kill") return { save: { ...save, onFail: { death: true } }, applies: null };
  const def = conditionByKey(s.do?.state);
  let applies;
  if (s.do?.verb === "reminder" && s.do.name)
  {
    // A lasting effect a failure puts on (Empathy Bomb, the Pacifying Glove).
    applies = { effect: s.do.name, text: s.do.effectText ?? "", ...(UNITS[f.duration] ? { amount: f.amount, unit: UNITS[f.duration] } : {}), viaSave: true };
    return { save, applies };
  }
  // A plain reminder names nothing to put on: the save alone, against its words
  // (Glue Resin, Neurotoxic Pollen - Consumables chunk 3b; found in Group 556,
  // where it put an "undefined." effect on a failed save).
  if (s.do?.verb === "reminder") return { save, applies: null };
  if (f.duration === "until-saved")
    applies = { condition: def?.key ?? s.do?.state, escape: { ability: f.ability, by: f.by } };
  else
  {
    const clock = UNITS[f.duration] ? { amount: f.amount, unit: UNITS[f.duration] } : {};
    applies = def ? { condition: def.key, ...clock }
                  : { effect: stateByKey(s.do?.state)?.label ?? s.do?.state, text: `${stateByKey(s.do?.state)?.label ?? s.do?.state}.`, ...clock, viaSave: true };
  }
  return { save, applies };
}

/** The damage types an option carries: its type, plus the source's property. */
export function typesFor(option, rules)
{
  const out = [];
  if (rules?.property) out.push(rules.property);
  if (option.type) out.push(option.type);
  return out.length ? out : null;
}

/**
 * The Apply spec for a condition option. Blind and Entangled are the real
 * conditions, keeping their book sentence and key so every reader sees them;
 * any other state is a board entry under the source's wording (ruling C:
 * the state underneath is the registry's, the wording on the board the
 * source's own).
 */
export function conditionSpec(option, sourceName)
{
  const from = sourceName ? ` From <b>${sourceName}</b>.` : "";
  const until = option.clock.until ? ` <b>${option.clock.until}</b>` : "";
  const clock = { rounds: option.clock.rounds, unit: option.clock.unit };
  const def = conditionByKey(option.state);
  const ends = option.clock.endsWithCombat ? { endsWithCombat: true } : {};
  if (def) return { name: def.label, text: `${def.book}${from}${until}`, ...clock, ...ends, applied: { conditions: [def.key] } };
  const state = stateByKey(option.state);
  const name = option.name || state?.label || option.label || "Effect";
  // A lasting effect's own board text where it names one (chunk 3b), else its sentence's.
  return { name, text: `${option.effectText ?? option.text ?? ""}${from}${until}`.trim(), ...clock, ...ends };
}

/* ---------------- Gates - Weapon Tags chunk 1 (RULED 2026-10-05) ---------------- */

/**
 * A gate in full: its own fields over the vocabulary's. known is computed,
 * standing (asked once, remembered for the scene or combat) or asked (each
 * roll); ask is who answers - the roller about themselves, the GM about a
 * target (engine ruling, 2026-10-04).
 */
export function gateInfo(g)
{
  const def = GATES[g?.gate] ?? {};
  return { gate: g?.gate, known: g?.known ?? def.known, ask: g?.ask ?? def.ask ?? "gm", label: def.label ?? g?.gate,
           question: def.question ?? `${def.label ?? g?.gate}?`, is: g?.is, default: g?.default };
}

/** Gates about a TARGET are settled once per target; the rest once per use. */
const TARGET_GATES = new Set(["creature-type", "is-pc", "target-av", "wears-metal-armour", "has-state", "armoured", "ancestry",
                              "same-species", "warm-blooded", "has-eyes", "has-brain", "target-is-object", "submerged", "followers",
                              "creature-kind"]);

export function isTargetGate(g)
{
  // The listed gates only: a GM-asked gate is not therefore about a target -
  // "Is the wielder underwater?" is the GM's question about the wielder.
  return TARGET_GATES.has(g?.gate);
}

/** The question a person is asked, with the subject's name and the gate's value filled in. */
export function questionFor(g, subject)
{
  const info = gateInfo(g);
  const is = typeof g?.is === "string" ? g.is : "";
  return info.question.replace("{subject}", subject || "the target").replace("{is}", is).replace(/ +\?$/, "?");
}

/**
 * Whether a gate HOLDS, given the fact as answered. An asked gate's question is
 * the plain fact ("Is it submerged?"); `is: false` makes the gate hold when the
 * answer is no. Any other `is` (a weather, a terrain) is already in the
 * question, so a yes holds.
 */
export function gateHolds(g, fact)
{
  if (fact === undefined || fact === null) return false;
  return g?.is === false ? fact === false : fact === true;
}

/**
 * The fact a gate assumes when nobody is asked: its `default` - true, false,
 * or another gate to compute instead (ruling B: Heat-Seeking's warm-blooded
 * defaults to the Biological checkbox). No default: no.
 */
export function defaultFact(g, compute = () => undefined)
{
  const d = g?.default;
  if (d === true || d === false) return d;
  if (d && typeof d === "object") { const v = compute(d); return v === undefined ? false : !!v; }
  return false;
}

/** The line a card carries when a default answer was used, so the table can see it and overrule it. */
export function assumedLine(g, subject, fact)
{
  return `Assumed ${fact ? "yes" : "no"} (nobody was asked): ${questionFor(g, subject)}`;
}

/**
 * The key a standing answer is remembered under - per gate, per value and per
 * subject, so "Is it daylight?" is one answer for the scene and "Is the
 * Ghoul warm-blooded?" one per creature.
 */
export function standingKey(g, subjectId = "")
{
  // NO DOTS: the key is a flag key, and Foundry reads a dot in one as nesting -
  // "Actor.abc" was stored as {Actor: {abc: ...}} and never found again, so the
  // GM was asked every time (Group 530.3).
  return [g?.gate, typeof g?.is === "string" ? g.is : "", subjectId].join("|").replace(/\./g, "_");
}
