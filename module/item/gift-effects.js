/**
 * Mystic Gift Effect Modelling - foundry-system-index.csv row of that name,
 * BUILD PLAN RULED 2026-09-29 (Matt).
 *
 * The book gives a Gift a name and the table agrees what it does. This file
 * lets a Gift CARRY what the table agreed, so using it resolves that effect.
 *
 * ONE GIFT, A LIST OF EFFECTS (ruled): each entry is one way the Gift can be
 * used. Kept on the Item as a flag, the way Crucible recipes are, so adding
 * the list needed no template change and a Gift with no list is exactly the
 * Gift it always was. Copies of a Gift were considered and rejected: Gleam
 * counts Gifts, and three copies of one Gift would count three times.
 *
 * FIVE KINDS, and "undefined" is the absence of a list:
 *  - prose     - only the HP cost is modelled; the text is shown (Matt).
 *  - damage    - a stated damage type; the card offers only Apply as damage.
 *  - healing   - the card offers only Apply as healing.
 *  - condition - Blinded or Entangled as the real conditions, or a named
 *                effect that goes on the Effect Board as a tracked reminder.
 *                NO SAVE (ruled: Gifts always hit) and NO DURATION (ruled:
 *                it lasts until the Referee ends it).
 *
 * SINCE 2026-10-05 (Effect Engine: Interpreter and Mystic Gifts) the list is
 * stored as effect sentences in vaarn.effects. The entry shape above is still
 * the Effects tab's fields and the suggestions' shape: giftEffectSentence
 * turns one into a sentence and giftEntryOf turns a sentence back, and an old
 * Gift's vaarn.giftEffects is read through the translator, never rewritten.
 *
 * Pure functions at the top so tools/test-gift-effects.mjs can run them
 * without Foundry; the item writes are at the bottom.
 */

import { COMMON_DAMAGE_TYPES } from "./attack-properties.js";
import { CONDITIONS, conditionByKey } from "../actor/condition-data.js";
import { SAMPLE_GIFT_SUGGESTIONS, QUALITY_SUGGESTIONS, FORM_DAMAGE_TYPES } from "./gift-effect-suggestions.js";
import { registerTranslator, sentencesOf } from "../effects/interpret.js";
import { normalise as normaliseSentence, EFFECTS_FLAG } from "../effects/sentence.js";
import { stateForWording } from "../effects/states.js";

export const GIFT_SCOPE = "vaarn";
export const GIFT_EFFECTS_FLAG = "giftEffects";

export const EFFECT_KINDS = [
  { key: "damage",    label: "Damage" },
  { key: "healing",   label: "Healing" },
  { key: "condition", label: "Condition" },
  { key: "prose",     label: "Prose (describe it)" }
];

/** The sentence every Gift condition carries instead of a clock (ruled). */
export const UNTIL_ENDED = "Lasts until the Referee ends it.";

const title = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/** A fresh entry of one kind, with every field present so the sheet can bind to it. */
export function blankEffect(kind = "damage")
{
  return { kind, label: "", damageType: kind === "damage" ? "kinetic" : "", condition: kind === "condition" ? "blind" : "",
           effectName: "", text: "" };
}

/** Fill any missing field, and drop an unknown kind to prose so nothing is lost. */
export function normaliseEffect(e)
{
  const kind = EFFECT_KINDS.some(k => k.key === e?.kind) ? e.kind : "prose";
  const out = { ...blankEffect(kind), ...(e ?? {}), kind };
  if(kind === "damage" && !COMMON_DAMAGE_TYPES.includes(out.damageType)) out.damageType = "kinetic";
  if(kind === "condition" && out.condition && !conditionByKey(out.condition)) out.condition = "";
  return out;
}

/** The short name of an effect - its button on the use dialog. */
export function effectLabel(e)
{
  if(e.label) return e.label;
  switch(e.kind)
  {
    case "damage":    return `${title(e.damageType)} damage`;
    case "healing":   return "Healing";
    case "condition": return e.condition ? conditionByKey(e.condition)?.label ?? "Condition" : (e.effectName || "Named effect");
    default:
    {
      const t = String(e.text ?? "").replace(/<[^>]*>/g, "").trim();
      return t ? (t.length > 40 ? t.slice(0, 37) + "..." : t) : "Described effect";
    }
  }
}

/** One line saying what an effect does - the editor's summary and the suggestion list. */
export function effectSummary(e)
{
  switch(e.kind)
  {
    case "damage":    return `${title(e.damageType)} damage (die + PSY)`;
    case "healing":   return "Healing (die + PSY)";
    case "condition": return e.condition ? `${conditionByKey(e.condition)?.label}` : `${e.effectName || "Named effect"}${e.text ? ": " + e.text : ""}`;
    default:          return String(e.text ?? "").replace(/<[^>]*>/g, "").trim() || "Described effect";
  }
}

/**
 * The Quality and Form of a composed Gift, or null. Read from `source` first
 * ("Burning / Fire", what every generator writes), then from the name.
 */
export function qualityFormOf(item)
{
  const src = String(item?.system?.source ?? "");
  const m = /^\s*([A-Za-z-]+)\s*\/\s*([A-Za-z-]+)\s*$/.exec(src);
  if(m && QUALITY_SUGGESTIONS[m[1]]) return { quality: m[1], form: m[2] };
  const parts = String(item?.name ?? "").trim().split(/\s+/);
  if(parts.length === 2 && QUALITY_SUGGESTIONS[parts[0]]) return { quality: parts[0], form: parts[1] };
  return null;
}

/** Every suggestion for this Gift, each with a `from` saying why it is offered. */
export function suggestionsFor(item)
{
  const out = [];
  const sample = SAMPLE_GIFT_SUGGESTIONS[item?.name];
  if(sample) out.push(...sample.map(s => ({ ...s, from: item.name })));
  const qf = qualityFormOf(item);
  if(qf)
  {
    out.push(...(QUALITY_SUGGESTIONS[qf.quality] ?? []).map(s => ({ ...s, from: qf.quality })));
    const type = FORM_DAMAGE_TYPES[qf.form];
    if(type) out.push({ kind: "damage", damageType: type, label: `${qf.form} (${title(type)} damage)`, from: qf.form });
  }
  return out.map(normaliseEffect).map((s, i) => ({ ...s, index: i, summary: effectSummary(s) }));
}

/**
 * The cost die the combined Level of the targets calls for, per the book's
 * table (RULED 2026-09-28: the table's second use, for any effect that is not
 * damage or healing). Null when nothing is targeted.
 */
export function costDieForLevels(total)
{
  if(!(total > 0)) return null;
  if(total <= 2) return "1d6";
  if(total <= 4) return "1d8";
  if(total <= 6) return "1d10";
  if(total <= 8) return "1d12";
  return "1d20";
}

/** A target's Level: characters and creatures both keep it at system.level.value. */
export function levelOf(actor)
{
  const n = Number(actor?.system?.level?.value ?? actor?.system?.level ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The Apply Effect to Target spec for a condition effect. No clock and no
 * save, both ruled; the text says who ends it. A real condition keeps its
 * book sentence and its key in `applied`, so every reader of Blind and
 * Entangled sees it; a named effect is text only.
 */
export function giftConditionSpec(effect, source)
{
  const from = source ? ` From <b>${source}</b>.` : "";
  const def = effect.condition ? conditionByKey(effect.condition) : null;
  if(def) return { name: def.label, text: `${def.book}${from} <b>${UNTIL_ENDED}</b>`, rounds: null, unit: "round",
                   applied: { conditions: [def.key] } };
  const name = effect.effectName || effectLabel(effect);
  return { name, text: `${effect.text ?? ""}${from} <b>${UNTIL_ENDED}</b>`.trim(), rounds: null, unit: "round" };
}

/* -------------------------------------------- */
/*  The translator - Effect Engine: Interpreter and Mystic Gifts, chunk 2     */
/* -------------------------------------------- */

/**
 * A Gift's roll: "roll damage dice of the same size the user paid in HP,
 * adding the user's PSY bonus ... the same ratio applies if trying to heal"
 * (Mystic Gifts). @cost is the die the user chose in the cost dialog.
 */
export const GIFT_ROLL = "@cost+@psy";
/**
 * A Gift sentence's own PRICE TABLE - Gift Effect Library chunk 5 (RULED
 * 2026-10-09, Matt, from his picks): cost: { kind: "hp", die: "chosen", by }
 * names which table the cost dialog offers instead of the Level default. The
 * smallest die is the default; the Referee can still pick any.
 */
export const PRICE_TABLES = {
  distance: { label: "distance", tiers: [
    { die: "1d6", faces: 6, label: "d6 — the same room" }, { die: "1d8", faces: 8, label: "d8 — the same map" },
    { die: "1d10", faces: 10, label: "d10 — another level of a vault" }, { die: "1d12", faces: 12, label: "d12 — a neighbouring location" },
    { die: "1d20", faces: 20, label: "d20 — anywhere in the world" }] },
  "held-time": { label: "how long it has been held", tiers: [
    { die: "1d6", faces: 6, label: "d6 — held a day or more" }, { die: "1d8", faces: 8, label: "d8 — held eight hours" },
    { die: "1d10", faces: 10, label: "d10 — held an hour" }, { die: "1d12", faces: 12, label: "d12 — held one Exploration Turn" },
    { die: "1d20", faces: 20, label: "d20 — held under a turn" }] }
};
export const PRICE_BY_CHOICES = [{ key: "", label: "The targets' Level (the default)" }, { key: "distance", label: "Distance" }, { key: "held-time", label: "How long it has been held" }];
/** The price table a sentence names, or null. */
export function priceTableOf(sentence)
{
  const cost = [].concat(sentence?.cost ?? []).find(c => c?.kind === "hp");
  return cost?.by && PRICE_TABLES[cost.by] ? PRICE_TABLES[cost.by] : null;
}
export const GIFT_COST = { kind: "hp", die: "chosen" };

/**
 * One old effect-list entry as a sentence (RULED 2026-10-05: an old Gift is
 * read through this, and nothing on an actor is rewritten).
 *  - damage    -> damage of its type, rolled as GIFT_ROLL
 *  - healing   -> heal, rolled as GIFT_ROLL
 *  - condition -> Blinded or Entangled as the real condition; a named effect
 *                 whose wording is a registered state becomes that state with
 *                 the Gift's wording kept (ruling C); any other named effect
 *                 is a lasting reminder - a board entry with no mechanics, as
 *                 it always was. All until the Referee ends it (2026-09-29).
 *  - prose     -> a reminder: the text in chat, only the cost modelled.
 * No resist anywhere: Gifts always hit (ruled 2026-09-29).
 */
export function giftEffectSentence(entry)
{
  const e = normaliseEffect(entry);
  const s = { when: "use", cost: { ...GIFT_COST } };
  if(e.label) s.label = e.label;
  switch(e.kind)
  {
    case "damage":  s.do = { verb: "damage", dice: GIFT_ROLL, type: e.damageType }; break;
    case "healing": s.do = { verb: "heal", amount: GIFT_ROLL }; break;
    case "condition":
    {
      s.for = "until-referee";
      if(e.condition) { s.do = { verb: "condition", state: e.condition }; break; }
      const name = e.effectName || "Named effect";
      const state = stateForWording(name);
      s.do = state ? { verb: "condition", state: state.key, name } : { verb: "reminder", name };
      if(e.text) s.text = e.text;
      break;
    }
    default:
      s.do = { verb: "reminder" };
      s.text = e.text ?? "";
  }
  return s;
}

/** An old Gift's effect list as sentences - the translator the interpreter reads. */
export function giftSentencesOf(item)
{
  return effectsOf(item).map(giftEffectSentence);
}

registerTranslator("gift", giftSentencesOf);

/**
 * "Other use": the freeform cast every Gift has - one roll, which the table
 * applies as damage or as healing, untyped (RULED 2026-09-26; kept as a
 * sentence the interpreter runs, ruling B 2026-10-05).
 */
export const OTHER_USE = {
  when: "use", cost: { ...GIFT_COST }, label: "Other use",
  choice: [[{ when: "use", do: { verb: "damage", dice: GIFT_ROLL } }], [{ when: "use", do: { verb: "heal", amount: GIFT_ROLL } }]]
};

/** Every suggestion for this Gift as a sentence, with `from` and `summary` kept for the editor. */
export function suggestionSentencesFor(item)
{
  return suggestionsFor(item).map(({ from, index, summary, ...e }) => ({ sentence: giftEffectSentence(e), from, index, summary }));
}

/** What the effect editor lists for its selects. */
export const CONDITION_CHOICES = [...CONDITIONS.map(c => ({ key: c.key, label: c.label })), { key: "", label: "Named effect..." }];
export const DAMAGE_TYPE_CHOICES = COMMON_DAMAGE_TYPES.map(t => ({ key: t, label: title(t) }));

/* -------------------------------------------- */
/*  Item reads and writes                                                     */
/* -------------------------------------------- */

export function effectsOf(item)
{
  const list = item?.flags?.[GIFT_SCOPE]?.[GIFT_EFFECTS_FLAG];
  return Array.isArray(list) ? list.map(normaliseEffect) : [];
}

/* -------------------------------------------- */
/*  The editor writes sentences - Interpreter chunk 4 (RULED 2026-10-05)      */
/* -------------------------------------------- */

const sortedJSON = v => Array.isArray(v) ? `[${v.map(sortedJSON).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + sortedJSON(v[k])).join(",")}}`
  : JSON.stringify(v);

/**
 * A sentence as the Effects tab shows it: the old entry shape, which is the
 * tab's fields. The inverse of giftEffectSentence. `custom` is true when the
 * tab's fields cannot say it - a sentence written some other way, which the
 * tab shows read-only rather than rewrite and lose what it said.
 */
export function giftEntryOf(sentence)
{
  const n = normaliseSentence(sentence) ?? {};
  const d = n.do ?? {};
  let e;
  if(d.verb === "damage") e = { kind: "damage", damageType: d.type ?? "" };
  else if(d.verb === "heal") e = { kind: "healing" };
  else if(d.verb === "condition" && conditionByKey(d.state)) e = { kind: "condition", condition: d.state };
  else if(d.verb === "condition" || (d.verb === "reminder" && n.for))
    e = { kind: "condition", condition: "", effectName: d.name ?? "", text: n.text ?? "" };
  else e = { kind: "prose", text: n.text ?? "" };
  e = normaliseEffect({ ...e, label: n.label ?? "" });
  const custom = sortedJSON(normaliseSentence(giftEffectSentence(e))) !== sortedJSON(n);
  return { ...e, custom };
}

/** The list the tab edits: the Gift's own sentences, or an old list read through the translator. */
function editableList(item)
{
  return sentencesOf(item);
}

/**
 * Write the whole list to vaarn.effects. The first edit of an old Gift writes
 * its translated list here, beside the untouched vaarn.giftEffects, which is
 * ignored from then on (ruling A, 2026-10-05).
 */
async function writeSentences(item, list)
{
  return item.update({ [`flags.${GIFT_SCOPE}.${EFFECTS_FLAG}`]: list });
}

/** Add one entry (a blank of a kind, or a suggestion) as a sentence. */
export async function addEffect(item, effect)
{
  const { from, index, summary, custom, ...clean } = effect ?? {};
  return writeSentences(item, [...editableList(item), giftEffectSentence(clean)]);
}

/** Change one field of one entry; a new kind starts from that kind's blank, keeping the label and text. */
export async function updateEffect(item, index, field, value)
{
  const list = editableList(item);
  if(!list[index]) return null;
  const { custom, ...cur } = giftEntryOf(list[index]);
  if(custom) return null;
  let next = { ...cur, [field]: value };
  if(field === "kind") next = { ...blankEffect(value), label: cur.label, text: cur.text };
  list[index] = giftEffectSentence(next);
  return writeSentences(item, list);
}

export async function removeEffect(item, index)
{
  const list = editableList(item);
  list.splice(index, 1);
  return writeSentences(item, list);
}
