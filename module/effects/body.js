/**
 * What a body gives its bearer - Effect Engine: Mutations and Ancestry Rules,
 * chunk 2a (foundry-system-index.csv "Effect Engine: Mutations and Ancestry
 * Rules", BUILD PLAN RULED 2026-10-05 by Matt).
 *
 * The passive sentences in force on an actor: every Item's (a mutation, an
 * ancestry rule, a weapon, anything a GM wrote on) in its item state, not
 * suppressed - and, by ruling B, the ancestry rules the actor holds no Item
 * for, read from its ancestry text. The readers that used to look a mutation
 * up by name, or the ancestry up by its text, read these instead.
 *
 * GATES: a sentence with conditions is in force only when `holds(gates, ctx)`
 * says so. The default refuses any gated sentence, so this file needs no
 * gate evaluator and imports nothing that could close a cycle (gates.js reads
 * attack-properties.js, which reads this file). A reader whose sentences carry
 * conditions passes gates.js passiveGatesHold.
 *
 * Imports only pure modules; no Foundry global.
 */

import { sentencesOf, meetsState } from "./interpret.js";
import { normalise } from "./sentence.js";
import { itemStateDefault } from "./vocabulary.js";
import { isSuppressed } from "../item/suppression.js";
import { ancestryTextSentences } from "../actor/mutation-effects.js";
// The implant, figment and Exotica translators register when this loads, as the
// mutation ones do above - every reader of the body then reads them, in Foundry
// and offline alike (Implants, Exotica and Figments chunk 2, 2026-10-06).
import "../item/implant-exotica-effects.js";

const ungated = gates => !(gates ?? []).length;
const trig = s => s?.when?.trigger;

/**
 * Every passive sentence in force on the actor: [{ item, sentence, source }].
 * `item` is null for a rule read from the ancestry text; `source` names
 * whatever gives it (the Item's name, or the rule's).
 */
export function bodyPassives(actor, { verb = null, holds = ungated } = {})
{
  const out = [];
  const keep = (item, s, source) =>
  {
    const n = normalise(s);
    if (trig(n) !== "passive" || n.baked) return;
    if (verb && n.do?.verb !== verb) return;
    if (!holds(n.if, { actor })) return;
    out.push({ item, sentence: n, source });
  };
  for (const item of actor?.items ?? [])
  {
    if (isSuppressed(item)) continue;
    for (const s of sentencesOf(item))
      if (meetsState(item, normalise(s).state ?? itemStateDefault(item.type))) keep(item, s, item.name);
  }
  for (const s of ancestryTextSentences(actor)) keep(null, s, s.tag);
  return out;
}

// Implants, figments and Exotica join the body (Effect Engine: Implants, Exotica
// and Figments chunk 2, 2026-10-06): an implant or figment installed, an Exotica
// carried, an Exotica armour equipped - each read in its item state.
const BODY_TYPES = new Set(["mutation", "ancestry", "implant", "figment", "exotica", "armor"]);

/**
 * The BODY's sentences on one trigger - an attack roll, being hit or missed, a
 * kill (Mutations and Ancestry Rules chunk 3, 2026-10-05): the bearer's
 * mutations and ancestry rule Items, not suppressed, and the ancestry rules
 * read from the text (ruling B). Only the body: a carried weapon's tag
 * sentences belong to that weapon's own attack and are read there. Gates are
 * left on the sentences for the caller, which alone knows the attack.
 * [{ item, sentence, source }]
 */
export function bodySentences(actor, trigger)
{
  const out = [];
  for (const item of actor?.items ?? [])
  {
    if (!BODY_TYPES.has(item.type) || isSuppressed(item)) continue;
    if (!meetsState(item, itemStateDefault(item.type))) continue;
    for (const s of sentencesOf(item))
    {
      const n = normalise(s);
      // Named by the entry it came from: a Bloomboon's by its variant ("Barbed Bark
      // punishes"), not its rule Item's "Bloomboons" (Consumables chunk 2); every
      // other book sentence's tag is its Item's name, and a GM's has none.
      if (!n.baked && trig(n) === trigger) out.push({ item, sentence: n, source: n.tag ?? item.name });
    }
  }
  for (const s of ancestryTextSentences(actor))
  {
    const n = normalise(s);
    if (!n.baked && trig(n) === trigger) out.push({ item: null, sentence: n, source: s.tag });
  }
  return out;
}

/**
 * The body's rows on the Forgettable Effects tab - Mutations and Ancestry Rules
 * chunk 5 (RULED 2026-10-06, Matt): every reminder sentence a mutation or an
 * ancestry rule files on the tab, under its source's name. A suppressed
 * mutation shows none (ruling 2); an ancestry rule with no Item is read from
 * the ancestry text (ruling 1, ruling B). Same shape as a FORGETTABLE_EFFECTS
 * row, plus the Item when there is one.
 *
 * Implants, Exotica and Figments chunk 4 (RULED 2026-10-06, Matt): implants,
 * figments, Exotica and Exotica armour file theirs here too. A suppressed
 * implant shows none, as a suppressed mutation; an Exotica armour not worn
 * still shows, saying to equip it, as a carried weapon's rows do.
 */
export function bodyTabReminders(actor)
{
  const out = [];
  const row = (item, source, n, inForce) =>
    out.push({ name: source, itemType: item?.type ?? "ancestry", category: n.tab.category, section: n.tab.section, polarity: n.tab.polarity,
               note: inForce ? (n.text ?? "") : `${n.text ?? ""} (equip it to use this)`, item });
  const isRow = n => !n.baked && trig(n) === "passive" && n.tab && n.do?.verb === "reminder";
  for (const item of actor?.items ?? [])
  {
    if (!BODY_TYPES.has(item.type) || isSuppressed(item)) continue;
    const inForce = meetsState(item, itemStateDefault(item.type));
    for (const s of sentencesOf(item))
    {
      const n = normalise(s);
      if (isRow(n)) row(item, item.name, n, inForce);
    }
  }
  for (const s of ancestryTextSentences(actor))
  {
    const n = normalise(s);
    if (isRow(n)) row(null, s.tag, n, true);
  }
  return out;
}

const ABILITY_KEYS = new Set(["str", "dex", "con", "int", "psy", "ego"]);

/**
 * The live ability bonuses the body gives, { str: n, ... } - an advanced
 * implant's (Etiquette HeadBank's +2 EGO), an Exotica armour's while worn
 * (Thinking Cap's +2 INT). Implants, Exotica and Figments chunk 2 (2026-10-06):
 * the actor reads this in place of the rosters' liveAbilityBonus.
 */
export function liveAbilityBonusOf(actor)
{
  const out = {};
  for (const p of bodyPassives(actor, { verb: "modify" }))
  {
    const key = p.sentence.do.stat;
    if (!ABILITY_KEYS.has(key)) continue;
    out[key] = (out[key] || 0) + (Number(String(p.sentence.do.amount).replace(/^\+/, "")) || 0);
  }
  return out;
}

/** The Item kinds whose creation bonuses the bake wrote, and which run live behind the marker (Stats as Sentences 2d-ii). */
const LIVE_BONUS_TYPES = new Set(["mutation", "implant", "exotica", "figment", "item"]);

/**
 * THE CREATION BONUSES OF LIVE ITEMS - Stats as Sentences chunk 2d-ii (RULED
 * 2026-10-07, Matt): { abilities: { str: n, ... }, slots, hands, creatureTypes }
 * from every Item carrying flags.vaarn.liveStats, read from its BAKED stat
 * sentences - which such an Item's actor never had written in. Counted always
 * unless the Item is suppressed, as the bake counted them (ruling 2). A rolled
 * amount (Extra Eyes' 1d3) is the roll the marker stored when the Item was
 * made. Max HP, natural weapons and levels still bake (rulings 1 and 2), so
 * they are not here.
 */
export function liveBodyBonusesOf(actor)
{
  const out = { abilities: {}, slots: 0, hands: 0, creatureTypes: [] };
  for (const item of actor?.items ?? [])
  {
    const live = item?.flags?.vaarn?.liveStats;
    if (!live || !LIVE_BONUS_TYPES.has(item.type) || isSuppressed(item)) continue;
    const rolled = (typeof live === "object" ? live.rolled : null) ?? {};
    for (const s of sentencesOf(item))
    {
      const n = normalise(s);
      if (!n.baked || trig(n) !== "stat") continue;
      const d = n.do ?? {};
      if (d.verb === "add-creature-type") { if (!out.creatureTypes.includes(d.type)) out.creatureTypes.push(d.type); continue; }
      if (d.verb !== "modify") continue;
      const amount = /^[+-]?\d+(\.\d+)?$/.test(String(d.amount)) ? Number(d.amount) : Number(rolled[d.stat] ?? 0);
      if (ABILITY_KEYS.has(d.stat)) out.abilities[d.stat] = (out.abilities[d.stat] || 0) + amount;
      else if (d.stat === "inventory-slots") out.slots += amount;
      else if (d.stat === "hands") out.hands += amount;
    }
  }
  return out;
}

/** What the body says about encounters - the Presence Drone's DIS: [{ source, why }]. */
export function encounterDisOf(actor)
{
  return bodyPassives(actor, { verb: "dis" }).filter(p => p.sentence.do.on === "encounter")
    .map(p => ({ source: p.source, why: p.sentence.do.why ?? p.sentence.text ?? "" }));
}

/** Does an attack-kind gate hold for this attack? Melee covers unarmed; `kind` is "melee" or "ranged". */
export function attackKindHolds(gate, kind)
{
  return gate.is === kind || (gate.is === "unarmed" && kind === "melee");
}

/** The damage-type table's target properties the actor's body gives it (flat, gills, exposedOrgans...). */
export function bearerProperties(actor)
{
  return new Set(bodyPassives(actor, { verb: "modify" })
    .filter(p => p.sentence.do.stat === "damage-properties")
    .map(p => String(p.sentence.do.amount).replace(/^\+/, "")));
}

/** The sources forbidding something to the bearer (wear-helmet, wear-body-armour, wield-two-handed...). */
export function bodyForbids(actor, what)
{
  return bodyPassives(actor, { verb: "forbid" }).filter(p => p.sentence.do.what === what);
}

/** Is worn armour's AV zeroed by the body (Quills: "You cannot wear armour")? */
export function wornArmourAvZeroed(actor)
{
  return bodyPassives(actor, { verb: "modify" }).some(p => p.sentence.do.stat === "worn-armour-av" && p.sentence.do.amount === "x0");
}

/**
 * The base AV - 10, or what a body sentence sets it to (Crystalline Flesh:
 * "=10+@level", maximum 20). Only the base: worn armour and every other bonus
 * add on top, and Quills never touches it (Matt, 2026-10-05).
 */
export function baseAvOf(actor)
{
  const s = bodyPassives(actor, { verb: "modify" }).find(p => p.sentence.do.stat === "base-av")?.sentence;
  if (!s) return 10;
  const level = Number(actor?.system?.level?.value) || 0;
  const m = /^=(\d+)(?:\+@level)?$/.exec(String(s.do.amount));
  if (!m) return 10;
  const v = Number(m[1]) + (/@level/.test(s.do.amount) ? level : 0);
  return s.do.max !== undefined ? Math.min(Number(s.do.max), v) : v;
}

/** How many helmets the bearer can wear: 0 if anything forbids one, else 1 plus Extra Head's. */
export function helmetCapOf(actor)
{
  if (bodyForbids(actor, "wear-helmet").length) return 0;
  return 1 + bodyPassives(actor, { verb: "modify" }).filter(p => p.sentence.do.stat === "helmets")
    .reduce((n, p) => n + (Number(String(p.sentence.do.amount).replace(/^\+/, "")) || 0), 0);
}

/**
 * Why a helm cannot go on, or null - the ONE helmet rule, read by the equip
 * control and by the affliction that equips a helm (ruling D, 2026-10-05: it
 * used to be written twice). `worn` is how many helms are on already.
 */
export function helmRefusal(actor, worn)
{
  const blocker = bodyForbids(actor, "wear-helmet")[0];
  if (blocker) return `${actor.name} cannot wear helmets - ${blocker.source}.`;
  const cap = helmetCapOf(actor);
  if (worn >= cap) return `${actor.name} already has ${cap === 1 ? "a helm" : `${cap} helms`} equipped - unequip one first.`;
  return null;
}

/**
 * The body's ADV and DIS on one kind of roll - `on` is "save" with `vs` (tox,
 * disease, nanomachine, blind), "flee" or "escape". Ungated sentences only:
 * a gated one goes through its own reader (save-notes.js). `{ adv, dis }` of
 * source names (Mutations and Ancestry Rules chunk 2b, 2026-10-05).
 */
export function bodyRollMods(actor, on, vs = undefined)
{
  const hits = bodyPassives(actor).filter(p => (p.sentence.do.verb === "adv" || p.sentence.do.verb === "dis")
    && p.sentence.do.on === on && p.sentence.do.vs === vs);
  return { adv: hits.filter(p => p.sentence.do.verb === "adv").map(p => p.source),
           dis: hits.filter(p => p.sentence.do.verb === "dis").map(p => p.source) };
}

const RATION_ITEMS = new Set(["Ration", "Food Ration", "Water Ration"]);

/**
 * The diets the body demands (Mutations and Ancestry Rules chunk 2c): an upkeep
 * of something other than a plain ration - Raw Meat, a Stone, Fresh Blood -
 * as rest.js dietRationsFor returns them: [{ item, onMiss, replaces, source }].
 */
export function bodyDiets(actor)
{
  const ON_MISS = { "no-heal": "noHeal", deprived: "deprived" };
  const out = [];
  for (const p of bodyPassives(actor, { verb: "upkeep" }))
  {
    const d = p.sentence.do;
    if (RATION_ITEMS.has(d.item) || !ON_MISS[d.unpaid] || out.some(x => x.item === d.item)) continue;
    out.push({ item: d.item, onMiss: ON_MISS[d.unpaid], replaces: d.replaces ?? "food", source: p.source });
  }
  return out;
}

/** The rule that says the bearer needs no rations (Synth: Repairs, Lithling: Inevitable), or null. */
export function rationFreeRuleOf(actor)
{
  return bodyPassives(actor, { verb: "modify" }).find(p => p.sentence.do.stat === "rations-needed" && p.sentence.do.amount === "x0")
    ?.sentence.do.rule ?? null;
}

/** The water lapse the body runs instead of plain thirst (the Faa's Desert Metabolism: "faa-water"), or null. */
export function waterLapseOf(actor)
{
  const p = bodyPassives(actor, { verb: "upkeep" }).find(x => x.sentence.do.item === "Water Ration" && x.sentence.do.lapse);
  return p ? { key: p.sentence.do.lapse, source: p.source } : null;
}

/** Does the body hide the bearer's HP from its players (Analgesia)? */
export function concealsHp(actor)
{
  return bodyPassives(actor, { verb: "conceal" }).some(p => p.sentence.do.what === "hp");
}

/** The sources making the bearer immune to something (blind, ambush...). */
export function bodyImmunities(actor, to)
{
  return bodyPassives(actor, { verb: "immune" }).filter(p => p.sentence.do.to === to);
}
