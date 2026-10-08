/**
 * An Item's stats as sentences - Effect Engine: Stats as Sentences
 * (foundry-system-index.csv "Effect Engine: Stats as Sentences"; CHUNK 1 and
 * CHUNK 2a PLANS RULED 2026-10-07 by Matt).
 *
 * The fields stay what the sheet edits (ruling B): no template change, no
 * migration. A translator reads each stat field into one stat sentence that
 * sets it, marked `from: "field"`, and statOf() answers a stat from those
 * sentences plus the Item's own live stat sentences - so a GM's sentence can
 * override a field and a modify can add to it.
 *
 * READ THIS BEFORE EDITING:
 *  - Field sentences are a SEPARATE STREAM, never in sentencesOf: the builder
 *    lists an Item's sentences as its effects, and every stat is not an effect.
 *  - THE USAGE DIE (chunk 2a, ruling A): the field's `die` is the CURRENT die -
 *    state, stepped by every roll, expended, reloaded - and stays the field.
 *    The stat is the die's SIZE (the field's `max`): { verb: "usage-die", die }.
 *    usageDieOf() gives both; an Item whose field has no current die and whose
 *    size comes from a sentence starts full.
 *  - DICE ARITHMETIC (chunk 2a, ruling B): +N adds dice, xN multiplies the
 *    count, damage-die-size -N step shrinks the die (d4 the floor), on the
 *    formula's ONE dice term - (@lvl)d4 +1 is (@lvl+1)d4. Two or more dice
 *    terms: unchanged, and statDetail() names the sentence it could not apply.
 *  - A TRADE GOOD'S QUALITY (chunk 2c, ruling B) adds its stat sentences: the
 *    slot multiplier baked (already in the field), the value multiplier an
 *    APPRAISAL - skipped unless the caller asks ({ appraise: true }), because
 *    it is the GM's, never applied to the field a player reads (2026-09-19).
 *
 * Pure: no Foundry global.
 */

import { normalise } from "./sentence.js";
import { sentencesOf } from "./interpret.js";
import { QUALITY_EFFECTS } from "../actor/remaining-effects-data.js";
import { qualityOf } from "../item/trade-good-quality.js";
import { TIER_SENTENCES } from "../item/weapon-tag-effects-data.js";

const SCOPE = "vaarn";

/**
 * The stat sentences a field becomes: stat name -> where it is read and what
 * kind of value it holds. `kind` turns the sentence's amount back into the
 * field's type (an amount is a string: "=0.5", "=false").
 */
export const STAT_FIELDS = {
  "damage-dice": { read: i => i?.system?.damageDice, kind: "dice" },
  "hands":       { read: i => i?.system?.hands,      kind: "number" },
  "av":          { read: i => i?.system?.avBonus,    kind: "number" },
  "armour-slot": { read: i => i?.system?.armorSlot,  kind: "text" },
  "slots":       { read: i => i?.system?.slots,      kind: "number" },
  "trade-value": { read: i => i?.system?.tradeValue, kind: "number" },
  "metal":       { read: i => i?.system?.metal,      kind: "boolean" },
  "units":       { read: i => i?.flags?.[SCOPE]?.units, kind: "number" }
};

/** The usage die's verb and stat name: its size. */
export const USAGE_DIE = "usage-die";

/** The die sizes a damage die steps through (the tag bakes' chain). */
const DAMAGE_DIE_SIZES = [4, 6, 8, 10, 12, 20];

const asKind = (kind, raw) =>
  kind === "number" ? Number(raw) : kind === "boolean" ? raw === true || raw === "true" : String(raw);

/** The usage die's size from its field: the max, or a die set with no max. */
function fieldUsageSize(ud)
{
  if (!ud || typeof ud !== "object") return "";
  if (ud.max) return String(ud.max);
  return ud.die && ud.die !== "expended" ? String(ud.die) : "";
}

/** The field sentences of one Item: one per stat field it holds, plus its usage die's size. */
export function fieldStatSentences(item)
{
  const out = [];
  for (const [stat, f] of Object.entries(STAT_FIELDS))
  {
    const v = f.read(item);
    if (v === undefined || v === null) continue;
    out.push({ when: "stat", do: { verb: "modify", stat, amount: `=${v}`, from: "field" } });
  }
  // The STORED die (_source): item.js fills the prepared current die from a sentence's size
  // for the sheet (2e-i), and that display value is not the field's own size.
  const size = fieldUsageSize(item?._source?.system?.usageDie ?? item?.system?.usageDie);
  if (size) out.push({ when: "stat", do: { verb: USAGE_DIE, die: size, from: "field" } });
  return out;
}

const isStat = s => s?.when?.trigger === "stat";

/**
 * The Item's own live stat sentences that statOf applies - through sentencesOf,
 * so an Item made before its kind was converted is read through its translator
 * (Bone's x2 to Cacklemaw on an old weapon). Baked ones are already in the
 * field; a gated one is the attack readers' (the damage-dice boost band).
 *
 * AN ITEM MADE LIVE (chunk 2d, ruling 4: flags.vaarn.liveStats) holds its BASE
 * in its fields, so its baked sentences are NOT in them yet - they apply here,
 * with its tier's (2d-i: an Advanced weapon's x2 trade value).
 */
function ownStatSentences(item)
{
  const live = isLive(item);
  return [...sentencesOf(item), ...qualityStatSentences(item), ...(live ? tierStatSentences(item) : [])]
    .filter(s => isStat(s) && (!s.baked || live) && !(s.if?.length));
}

/** Was this Item made live - its fields its base, its creation bonuses read from its sentences? (chunk 2d, ruling 4) */
export function isLive(item)
{
  return !!item?.flags?.[SCOPE]?.[LIVE_FLAG];
}

/** The marker (chunk 2d, ruling 4). */
export const LIVE_FLAG = "liveStats";

/** A live weapon's tier as stat sentences (chunk 2d-i): the tier it was made at, recorded beside the marker. */
function tierStatSentences(item)
{
  const tier = item?.flags?.[SCOPE]?.tier;
  return tier ? (TIER_SENTENCES[tier] ?? []).map(normalise).map(s => ({ ...s, tag: `${tier} tier` })) : [];
}

/** A trade good's quality, as stat sentences (chunk 2c, ruling B) - baked ones included. */
function qualityStatSentences(item)
{
  const q = item?.flags?.[SCOPE]?.quality;
  return q ? (QUALITY_EFFECTS[q] ?? []).map(normalise).filter(isStat).map(s => ({ ...s, tag: q })) : [];
}

/* ---------------- Dice arithmetic (chunk 2a, ruling B) ---------------- */

// A dice term: an optional count - digits or a parenthesised expression - then dN.
const DICE_TERM = /(\d+|\([^()]*\))?d(\d+)/g;

/** The formula's dice terms. */
function diceTerms(formula)
{
  return [...String(formula ?? "").matchAll(DICE_TERM)];
}

/** The formula with its one dice term rewritten by fn(count, size) -> [count, size]; null with any other number of terms. */
function withOneTerm(formula, fn)
{
  const terms = diceTerms(formula);
  if (terms.length !== 1) return null;
  const [whole, count, size] = terms[0];
  const [c, s] = fn(count ?? "1", Number(size));
  const i = terms[0].index;
  return `${formula.slice(0, i)}${c}d${s}${formula.slice(i + whole.length)}`;
}

/** A count changed by an operator: a number stays a number, an expression gains the operation. */
function countOp(count, op, n)
{
  if (/^\d+$/.test(count)) return String(op === "+" ? Math.max(1, Number(count) + n) : Math.max(1, Math.round(Number(count) * n)));
  const inner = count.replace(/^\(|\)$/g, "");
  return op === "+" ? `(${inner}${n < 0 ? "-" : "+"}${Math.abs(n)})` : `(${inner}*${n})`;
}

/** One dice sentence applied to a formula: the new formula, or null when it cannot apply. */
function applyDice(formula, d)
{
  const a = String(d.amount ?? "").trim();
  if (d.stat === "damage-dice" && a.startsWith("=")) return a.slice(1);
  if (formula === undefined || formula === null || formula === "") return null;
  if (d.stat === "damage-die-size")
  {
    const m = a.match(/^([+-])(\d+)\s*steps?$/);
    if (!m) return null;
    const by = (m[1] === "-" ? -1 : 1) * Number(m[2]);
    const floor = Number(String(d.min ?? "d4").replace(/^d/, ""));
    return withOneTerm(formula, (c, s) =>
    {
      const at = DAMAGE_DIE_SIZES.indexOf(s);
      if (at === -1) return [c, s];
      const next = DAMAGE_DIE_SIZES[Math.min(DAMAGE_DIE_SIZES.length - 1, Math.max(0, at + by))];
      return [c, Math.max(floor, next)];
    });
  }
  if (/^[+-]\d+$/.test(a)) return withOneTerm(formula, (c, s) => [countOp(c, "+", Number(a)), s]);
  if (/^x\d+(\.\d+)?$/.test(a)) return withOneTerm(formula, (c, s) => [countOp(c, "x", Number(a.slice(1))), s]);
  return null;
}

/* ---------------- Reading a stat ---------------- */

/** One modify applied to a value of the stat's kind. The floor, minimum and rounding are the finish's, not one sentence's. */
function applyModify(value, d, kind)
{
  const a = String(d.amount ?? "");
  if (a.startsWith("=")) return asKind(kind, a.slice(1));
  if (kind === "number" && /^[+-]/.test(a)) return (Number(value) || 0) + Number(a);
  if (kind === "number" && a.startsWith("x")) return (Number(value) || 0) * Number(a.slice(1));
  return value;
}

/**
 * THE ORDER (RULED 2026-10-07, Matt; amending 2a's list order): the field, then
 * die-size steps, then x, then +, then the finish (floor, minimum, rounding),
 * then = LAST - the bake's own order, so Hard Light's slots =0 beats Heavy's
 * minimum of 1, and a GM's = is the final word. Stable within a rank.
 */
function rankOf(s)
{
  const a = String(s.do?.amount ?? "").trim();
  if (s.do?.stat === "damage-die-size") return 0;
  if (a.startsWith("=")) return 3;
  if (a.startsWith("x")) return 1;
  return 2;
}

/** The finish of a number stat: a floor if any applied sentence asks one, the highest minimum, the finest rounding asked. */
function finish(value, applied)
{
  if (value === undefined || !applied.length) return value;
  let out = Number(value);
  if (applied.some(d => d.floor)) out = Math.floor(out);
  const mins = applied.filter(d => d.min !== undefined).map(d => Number(d.min));
  if (mins.length) out = Math.max(Math.max(...mins), out);
  const rounds = applied.filter(d => d.round !== undefined).map(d => Number(d.round));
  if (rounds.length) { const p = 10 ** Math.max(...rounds); out = Math.round(out * p) / p; }
  return out;
}

/** The stat names a stat's sentences may use: damage dice also take the die-size steps. */
const statNames = stat => stat === "damage-dice" ? ["damage-dice", "damage-die-size"] : [stat];

/**
 * One stat of an Item in full: { field, value, changed, unapplied }. `value`
 * is the field's sentence, then the Item's own live stat sentences in order;
 * `unapplied` the texts of the sentences that could not apply (a dice
 * sentence on a formula with two dice terms). A sentence for one buyer (`to`)
 * applies only when that buyer is asked for; an appraisal (chunk 2c) only when
 * `appraise` is asked for.
 */
export function statDetail(item, stat, { buyer = null, appraise = false } = {})
{
  const forBuyer = s => (!s.do.to || (buyer && s.do.to === buyer)) && (!s.do.appraisal || appraise);
  const fields = fieldStatSentences(item).map(normalise);
  const all = [...fields, ...ownStatSentences(item)];
  const unapplied = [];

  if (stat === USAGE_DIE)
  {
    let value;
    for (const s of all) if (s.do?.verb === USAGE_DIE && forBuyer(s)) value = String(s.do.die ?? "");
    const field = fields.find(s => s.do.verb === USAGE_DIE)?.do.die;
    return { field, value, changed: value !== field, unapplied };
  }

  const names = statNames(stat);
  const kind = STAT_FIELDS[stat]?.kind ?? "number";
  const applies = s => s.do?.verb === "modify" && names.includes(s.do.stat) && forBuyer(s);
  // The field first, as the base; then the Item's own by rank (rankOf), = last.
  const base = fields.filter(applies);
  const own = all.slice(fields.length).filter(applies)
    .map((s, i) => ({ s, i, r: rankOf(s) })).sort((a, b) => a.r - b.r || a.i - b.i).map(x => x.s);
  const step = (value, s) =>
  {
    if (kind !== "dice") return applyModify(value, s.do, kind);
    const next = applyDice(value, s.do);
    if (next === null) { if (s.do.from !== "field") unapplied.push(s.text ?? `${s.do.stat} ${s.do.amount}`); return value; }
    return next;
  };
  let value = base.reduce(step, undefined);
  const before = own.filter(s => rankOf(s) < 3), last = own.filter(s => rankOf(s) === 3);
  value = before.reduce(step, value);
  if (kind === "number") value = finish(value, before.map(s => s.do));
  value = last.reduce(step, value);
  const raw = STAT_FIELDS[stat]?.read(item);
  const field = raw === undefined || raw === null ? undefined : asKind(kind === "dice" ? "text" : kind, raw);
  return { field, value, changed: value !== field, unapplied };
}

/** One stat of an Item, from its sentences; undefined when no field holds it and no sentence sets it. */
export function statOf(item, stat, opts = {})
{
  return statDetail(item, stat, opts).value;
}

/**
 * The usage die: { die, max } - `die` the current die (the field's state),
 * `max` the size (the stat). An Item with no current die in its field whose
 * size comes from its own sentence starts full; one whose size is only its
 * field's keeps today's meaning of an empty die (none tracked).
 */
export function usageDieOf(item)
{
  const max = statOf(item, USAGE_DIE) ?? "";
  const current = (item?._source?.system?.usageDie ?? item?.system?.usageDie)?.die ?? "";
  const sentenceSized = ownStatSentences(item).some(s => s.do?.verb === USAGE_DIE);
  return { die: current || (sentenceSized ? max : ""), max };
}

/**
 * The item sheets' line under a stat a sentence changes (chunk 2a, ruling D;
 * 2b; 2c): { damage, hands, usageDie, av, armourSlot, slots, tradeValue, metal }
 * - each null when the field is what is in effect.
 * Shown to everyone; a GM's change to a stat is no secret.
 */
export function statNotesOf(item)
{
  const note = d => d.changed && d.value !== undefined ? `In effect: ${d.value} — an effect changes it.` : null;
  const dice = statDetail(item, "damage-dice");
  const unapplied = dice.unapplied.length
    ? `An effect could not apply — the formula has more than one dice term: ${dice.unapplied.join("; ")}`
    : null;
  const ud = statDetail(item, USAGE_DIE);
  return {
    damage: [note(dice), unapplied].filter(Boolean).join(" ") || null,
    hands: note(statDetail(item, "hands")),
    // Chunk 2b (RULED 2026-10-07): the armour sheet's AV and slot.
    av: note(statDetail(item, "av")),
    armourSlot: note(statDetail(item, "armour-slot")),
    // Chunk 2c (RULED 2026-10-07): every item sheet's Slots, Trade Value and Metal.
    slots: note(statDetail(item, "slots")),
    tradeValue: note(statDetail(item, "trade-value")),
    metal: (d => d.changed && d.value !== undefined ? `In effect: ${d.value ? "metal" : "not metal"} — an effect changes it.` : null)(statDetail(item, "metal")),
    usageDie: ud.changed && ud.value ? `In effect: Ud${String(ud.value).replace(/^d/, "")} — an effect sets its size.` : null
  };
}

/** An armour Item's slot through its sentences - "body" when nothing names one, as every reader defaulted. */
export function armourSlotOf(item)
{
  return statOf(item, "armour-slot") || "body";
}

/** The usage die's size when the Item's own sentence sets it, else null - the field's select is the size otherwise. */
export function sentenceUsageSize(item)
{
  const d = statDetail(item, USAGE_DIE);
  return d.changed && d.value ? d.value : null;
}

/**
 * The buyer lines under trade value (chunk 2c, ruling C): one per buyer a live
 * trade-value sentence names - a tag's (Bone's Cacklemaw and Ghouls) or a GM's.
 * An appraisal is the GM readout's, never a line here.
 */
export function tradeBuyersOf(item)
{
  const buyers = [...new Set(ownStatSentences(item)
    .filter(s => s.do?.verb === "modify" && s.do.stat === "trade-value" && s.do.to && !s.do.appraisal).map(s => s.do.to))];
  return buyers.map(buyer => ({ buyer, value: Math.round(Number(statOf(item, "trade-value", { buyer }) ?? 0) * 100) / 100 }));
}

/**
 * The GM-only quality readout: what was rolled, and what it does to this Item -
 * null for an Item with no quality, so the sheet block disappears. Moved from
 * trade-good-quality.js in chunk 2c (ruling B): its numbers are the quality's
 * sentences - the appraisal and the baked slot multiplier - not the table's.
 *
 * EVERY LINE SAYS WHETHER IT WAS APPLIED. A Referee reading "x3 trade value"
 * cannot otherwise tell whether the field beside it already includes it, and
 * that is the single most likely way to mis-price a good at the table.
 */
export function qualityReadout(item)
{
  const q = qualityOf(item);
  if (!q) return null;
  const own = qualityStatSentences(item);
  const appraisal = own.find(s => s.do?.verb === "modify" && s.do.stat === "trade-value" && s.do.appraisal);
  const slot = own.find(s => s.do?.verb === "modify" && s.do.stat === "slots" && s.baked);
  const mult = appraisal ? Number(String(appraisal.do.amount).replace(/^x/, "")) : undefined;
  const buyer = appraisal?.do.to ?? null;
  const shown = Number(statOf(item, "trade-value"));
  const value = Number.isFinite(shown) ? shown : 1;
  const worth = mult === undefined ? null : Math.round(value * mult * 100) / 100;
  const lines = [];

  if (mult !== undefined && !buyer)
    lines.push(`Trade value x${mult} — worth ${worth}`
             + `, not the ${value} shown. NOT applied to the field: the player reads the base.`);

  if (buyer)
    lines.push(`Trade value x${mult} to ${buyer} only — worth `
             + `${worth} to them, ${value} to anyone else. NOT applied.`);

  if (slot)
    lines.push(`Slot weight x${String(slot.do.amount).replace(/^x/, "")} — already applied to Slots, which is the cost `
             + `of ONE unit.`);

  if (q.effect && !lines.length)
    lines.push(`${q.effect} — nothing on this sheet changes; resolve it at the table.`);

  if (!q.effect)
    lines.push(`The table prints this one with no stated effect. It still matters: a settlement `
             + `may prize or despise any quality.`);

  return { name: q.name, effect: q.effect, lines };
}
