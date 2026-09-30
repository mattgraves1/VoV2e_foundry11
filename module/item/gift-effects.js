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
 * Pure functions at the top so tools/test-gift-effects.mjs can run them
 * without Foundry; the item writes are at the bottom.
 */

import { COMMON_DAMAGE_TYPES } from "./attack-properties.js";
import { CONDITIONS, conditionByKey } from "../actor/condition-data.js";
import { SAMPLE_GIFT_SUGGESTIONS, QUALITY_SUGGESTIONS, FORM_DAMAGE_TYPES } from "./gift-effect-suggestions.js";

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

async function writeEffects(item, list)
{
  return item.update({ [`flags.${GIFT_SCOPE}.${GIFT_EFFECTS_FLAG}`]: list.map(normaliseEffect) });
}

export async function addEffect(item, effect)
{
  const { from, index, summary, ...clean } = effect ?? {};
  return writeEffects(item, [...effectsOf(item), normaliseEffect(clean)]);
}

export async function updateEffect(item, index, field, value)
{
  const list = effectsOf(item);
  if(!list[index]) return null;
  let next = { ...list[index], [field]: value };
  // A new kind starts from that kind's blank, keeping only the label and text.
  if(field === "kind") next = { ...blankEffect(value), label: list[index].label, text: list[index].text };
  list[index] = next;
  return writeEffects(item, list);
}

export async function removeEffect(item, index)
{
  const list = effectsOf(item);
  list.splice(index, 1);
  return writeEffects(item, list);
}
