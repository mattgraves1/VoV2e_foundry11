/**
 * The GM Effect Builder - Effect Engine: GM Effect Builder, chunk 2
 * (foundry-system-index.csv "Effect Engine: GM Effect Builder", CHUNK 2 PLAN
 * RULED 2026-10-05 by Matt).
 *
 * The Effects tab on every Item sheet lists the Item's sentences as plain
 * lines; a GM adds or edits one in a dialog whose slots come from the table
 * of wired combinations (effects/builder-recipes.js), so nothing offered does
 * nothing. Players see the list read-only (ruling 3).
 *
 * THE STORED LIST (rulings 1 and 2, 2026-10-05):
 *  - An Item whose kind has a translator (a Gift's old list, a weapon's tags)
 *    is written, on its first edit, as its translated sentences plus the
 *    change. A weapon's tag rows are kept as rows that can be removed but not
 *    edited; after that its tags no longer change its effects.
 *  - An Item whose kind is not converted yet gets only what the GM adds, and
 *    the flag effectsAdded says so, so that kind's translator puts the book's
 *    sentences back in front when its step lands (interpret.js sentencesOf).
 */

import { sentencesOf, bookCountOf, hasTranslator, EFFECTS_ADDED_FLAG } from "../effects/interpret.js";
import { validate, EFFECTS_FLAG } from "../effects/sentence.js";
import { itemStateDefault } from "../effects/vocabulary.js";
import {
  recipesFor, recipeById, whensFor, gatesFor, assemble, disassemble, summarise, stateChoices,
  TARGET_CHOICES, DURATION_CHOICES, COST_DIE_CHOICES, SECTION_CHOICES, POLARITY_CHOICES,
  CREATURE_TYPE_CHOICES, STATE_GATE_CHOICES
} from "../effects/builder-recipes.js";

const SCOPE = "vaarn";

/* ---------------- The tab's rows ---------------- */

/**
 * The rows the Effects tab lists: every sentence but the baked stats (the
 * Item's fields already hold those; they stay stored, unlisted). `row` is the
 * index in sentencesOf; `own` the index in the stored list, or null for a book
 * sentence read in front of a GM's additions (not removable here).
 */
export function effectRows(item, isGM)
{
  const book = bookCountOf(item);
  return sentencesOf(item).map((s, row) => ({ s, row })).filter(({ s }) => !s.baked).map(({ s, row }) =>
  {
    const own = row >= book ? row - book : null;
    const sum = summarise(s, item.type);
    return {
      row, line: sum.line, fromTag: s.tag ?? null,
      editable: !!(isGM && own !== null && sum.editable),
      removable: !!(isGM && own !== null),
      // "tag" only where it is one - a weapon's (Matt, 2026-10-06); any other
      // kind's tag is the entry's name, said plainly: "from Brain Coral".
      readOnlyNote: isGM && own !== null && !sum.editable
        ? (s.tag ? (["weaponMelee", "weaponRanged"].includes(item.type) ? `from the ${s.tag} tag` : `from ${s.tag}`) : "written outside the builder") : null
    };
  });
}

/* ---------------- Writes ---------------- */

/** The list a write starts from: the stored one, or - first edit - the translated one (ruling 1). */
function baseList(item)
{
  const own = item.flags?.[SCOPE]?.[EFFECTS_FLAG];
  if (Array.isArray(own)) return own.map(s => foundry.utils.deepClone(s));
  return hasTranslator(item.type) ? sentencesOf(item).map(s => foundry.utils.deepClone(s)) : [];
}

async function writeList(item, list, extra = {})
{
  const update = { [`flags.${SCOPE}.${EFFECTS_FLAG}`]: list, ...extra };
  // Ruling 2: no translator yet, so this list is the GM's additions only.
  if (!hasTranslator(item.type)) update[`flags.${SCOPE}.${EFFECTS_ADDED_FLAG}`] = true;
  return item.update(update);
}

/** Map a tab row to its index in the stored list (the first write keeps translated order). */
function ownIndex(item, row)
{
  const i = row - bookCountOf(item);
  return i >= 0 ? i : null;
}

export async function removeEffectRow(item, row)
{
  const i = ownIndex(item, row);
  if (i === null) return null;
  const list = baseList(item);
  list.splice(i, 1);
  return writeList(item, list);
}

async function saveSentence(item, row, sentence, itemFlags = {})
{
  const list = baseList(item);
  const i = row === null ? null : ownIndex(item, row);
  if (i === null) list.push(sentence);
  else list[i] = sentence;
  const extra = {};
  for (const [k, v] of Object.entries(itemFlags)) extra[`flags.${SCOPE}.${k}`] = v;
  return writeList(item, list, extra);
}

/* ---------------- The dialog ---------------- */

const blankCommon = itemType => ({ gates: [], target: "", n: 2, duration: "", amount: 1, costDie: "", state: itemStateDefault(itemType),
                                   label: "", text: "", section: "", polarity: "" });

function defaultsOf(recipe, item)
{
  const v = {};
  for (const f of recipe.fields) v[f.key] = f.item ? (item.flags?.[SCOPE]?.[f.key] ?? f.default) : f.default;
  return v;
}

export class EffectBuilder extends FormApplication
{
  /** `row` null adds a sentence; a number edits that row. */
  constructor(item, row = null, options = {})
  {
    super(item, options);
    this.item = item;
    this.row = row;
    const parts = row === null ? null : disassemble(sentencesOf(item)[row], item.type);
    const first = recipesFor(item.type)[0];
    this.state = parts
      ? { recipeId: parts.recipe.id, values: { ...defaultsOf(parts.recipe, item), ...parts.values }, common: { ...blankCommon(item.type), ...parts.common } }
      : { recipeId: first?.id, values: first ? defaultsOf(first, item) : {}, common: blankCommon(item.type) };
  }

  static get defaultOptions()
  {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["knave", "sheet", "vaarn-effect-builder"],
      template: "systems/vaarn/templates/item/effect-builder.html",
      width: 520, height: "auto", closeOnSubmit: false, submitOnChange: false
    });
  }

  get title() { return `${this.row === null ? "Add an effect to" : "Edit an effect on"} ${this.item.name}`; }

  getData()
  {
    const type = this.item.type;
    const recipe = recipeById(this.state.recipeId);
    const when = recipe?.when;
    const has = slot => !!recipe?.slots.includes(slot);
    const sel = (choices, cur) => choices.map(c => ({ ...c, selected: String(c.key) === String(cur ?? "") }));
    const gateDefs = recipe ? gatesFor(recipe) : [];
    const c = this.state.common;
    let preview = null, problems = [];
    if (recipe)
    {
      const s = assemble(recipe, this.state.values, c, type);
      problems = validate(s);
      preview = summarise(s, type).line;
    }
    return {
      whens: sel(whensFor(type), when),
      recipes: sel(recipesFor(type).filter(r => r.when === when).map(r => ({ key: r.id, label: r.label })), this.state.recipeId),
      fields: (recipe?.fields ?? []).map(f => ({
        ...f, value: this.state.values[f.key],
        isSelect: f.kind === "select", isCheck: f.kind === "check", isColor: f.kind === "color",
        isNumber: f.kind === "number", isText: f.kind === "text" || f.kind === "dice",
        options: f.choices ? sel(f.choices, this.state.values[f.key]) : null
      })),
      hasGates: gateDefs.length > 0,
      gates: c.gates.map((g, i) =>
      {
        const def = gateDefs.find(d => d.gate === g.gate);
        return { i, ...g, choices: sel(gateDefs.map(d => ({ key: d.gate, label: d.label })), g.gate),
                 isCreature: def?.value === "creature-type", isState: def?.value === "state", isText: def?.value === "text",
                 isChance: def?.value === "chance", canNot: !def?.value,
                 creatureChoices: sel(CREATURE_TYPE_CHOICES, g.value), stateChoices: sel(STATE_GATE_CHOICES, g.value) };
      }),
      hasTarget: has("target"), targets: sel(TARGET_CHOICES, c.target), isUpToN: c.target === "up-to-n", n: c.n,
      hasDuration: has("duration") || has("duration-optional"), durationOptional: has("duration-optional"),
      durations: sel(DURATION_CHOICES, c.duration), durationAmount: !!c.duration && c.duration !== "until-referee", amount: c.amount,
      hasCost: has("cost"), costs: sel(COST_DIE_CHOICES, c.costDie),
      hasState: has("state"), states: sel(stateChoices(type), c.state),
      hasLabel: has("label") || has("tab"), label: c.label,
      hasTab: has("tab"), sections: sel(SECTION_CHOICES, c.section || "Always Active"), polarities: sel(POLARITY_CHOICES, c.polarity || "Benefit"),
      text: c.text, preview, problems
    };
  }

  activateListeners(html)
  {
    super.activateListeners(html);
    html.on("change", "select, input, textarea", ev => { this._sync(html, ev.currentTarget.name); this.render(); });
    html.find(".effect-gate-add").click(() => { this._sync(html); const d = gatesFor(recipeById(this.state.recipeId))[0];
      if (d) this.state.common.gates.push({ gate: d.gate, value: "", not: false }); this.render(); });
    html.find(".effect-gate-remove").click(ev => { this._sync(html); this.state.common.gates.splice(Number(ev.currentTarget.dataset.i), 1); this.render(); });
  }

  /** Read the form into this.state; a new When or Do resets what depends on it. */
  _sync(html, changed = null)
  {
    const data = new FormDataExtended(this.form).object;
    const type = this.item.type;
    if (changed === "when")
    {
      const r = recipesFor(type).find(x => x.when === data.when);
      this.state = { recipeId: r?.id, values: r ? defaultsOf(r, this.item) : {}, common: { ...blankCommon(type), text: this.state.common.text } };
      return;
    }
    if (changed === "recipe")
    {
      const r = recipeById(data.recipe);
      this.state = { recipeId: r?.id, values: r ? defaultsOf(r, this.item) : {}, common: { ...blankCommon(type), text: this.state.common.text } };
      return;
    }
    const recipe = recipeById(this.state.recipeId);
    for (const f of recipe?.fields ?? [])
    {
      const raw = data[`v.${f.key}`];
      this.state.values[f.key] = f.kind === "check" ? !!raw : (raw ?? this.state.values[f.key]);
    }
    const c = this.state.common;
    for (const k of ["target", "n", "duration", "amount", "costDie", "state", "label", "text", "section", "polarity"])
      if (data[`c.${k}`] !== undefined) c[k] = data[`c.${k}`];
    c.gates = c.gates.map((g, i) => ({
      gate: data[`g.${i}.gate`] ?? g.gate, value: data[`g.${i}.value`] ?? "", not: !!data[`g.${i}.not`],
      in: data[`g.${i}.in`] ?? g.in ?? 1, of: data[`g.${i}.of`] ?? g.of ?? 6
    }));
  }

  async _updateObject(event, formData)
  {
    const html = this.element;
    this._sync(html);
    const recipe = recipeById(this.state.recipeId);
    if (!recipe) return;
    const sentence = assemble(recipe, this.state.values, this.state.common, this.item.type);
    const problems = validate(sentence);
    if (problems.length) return ui.notifications.warn(`This effect is not complete: ${problems[0]}`);
    const itemFlags = {};
    for (const f of recipe.fields) if (f.item) itemFlags[f.key] = this.state.values[f.key] || null;
    await saveSentence(this.item, this.row, sentence, itemFlags);
    this.close();
  }
}

/** The Effects tab's controls, bound by the item sheet. GM-only (ruling 3); the tab stays readable for everyone. */
export function bindEffectsTab(sheet, html)
{
  if (!game.user.isGM) return;
  const item = sheet.item;
  html.find(".effect-add").click(ev => { ev.preventDefault(); new EffectBuilder(item, null).render(true); });
  html.find(".effect-edit").click(ev => { ev.preventDefault(); new EffectBuilder(item, Number(ev.currentTarget.closest("[data-row]").dataset.row)).render(true); });
  html.find(".effect-delete").click(ev => { ev.preventDefault(); removeEffectRow(item, Number(ev.currentTarget.closest("[data-row]").dataset.row)); });
}
