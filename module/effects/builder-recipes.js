/**
 * The builder's table of wired combinations - Effect Engine: GM Effect
 * Builder, chunk 2 (foundry-system-index.csv "Effect Engine: GM Effect
 * Builder", CHUNK 2 PLAN RULED 2026-10-05 by Matt).
 *
 * Each RECIPE is one trigger and verb that some reader acts on today, the
 * Item types it works on, the fields the GM fills, and which of the common
 * slots (conditions, target, duration, cost, state, the tab's placement) it
 * takes. The builder offers When, then only the Do entries wired for that When
 * on that Item type - so nothing it offers does nothing. Each conversion step
 * adds the entries its readers make wired. tools/test-builder-recipes.mjs
 * holds every recipe to its reader.
 *
 * A recipe's build(values) returns the sentence's CORE (when, do, resist and
 * any gate the recipe owns); assemble() adds the common slots. read(core)
 * returns the values back, or null - and an Item's sentence is editable only
 * when read() and build() round-trip it exactly, so the builder never rewrites
 * a sentence it does not fully understand (a tag's, a translated one, one
 * written some other way): those show read-only.
 *
 * Pure: no Foundry global.
 */

import { normalise } from "./sentence.js";
import { STATES, stateByKey } from "./states.js";
import { GATES, itemStateDefault } from "./vocabulary.js";
import { CONDITIONS, conditionByKey } from "../actor/condition-data.js";
import { COMMON_DAMAGE_TYPES, CREATURE_TYPE_KEYS } from "../item/attack-properties.js";
import { giftEffectSentence, GIFT_ROLL, GIFT_COST } from "../item/gift-effects.js";
import { BODY_TYPES } from "./body.js";
import { amountWords, STAT_AMOUNT } from "./interpret.js";

export const WEAPON_TYPES = ["weaponMelee", "weaponRanged"];
/**
 * GM Effect Builder: Widening chunk 1 (RULED 2026-10-09, Matt): a recipe is
 * offered wherever its reader acts. Every Item type the system has, so the
 * table's test can hold each recipe to its reader on each type in its scope.
 */
export const ITEM_TYPES = ["item", "weaponMelee", "weaponRanged", "armor", "light", "spell", "wound", "exhaustion", "affliction",
  "gift", "codex", "implant", "exotica", "crucible", "mutation", "figment", "ancestry"];
/** The kinds whose sheet sets and shows a daily pool (usesRemaining, the refresh control). */
const POOL_TYPES = ["mutation", "implant", "ancestry"];
/** The kinds carrying the usageDie template, whose die a use can step down. */
const USAGE_DIE_TYPES = ["item", "weaponRanged", "armor", "exotica"];
const ABILITY_KEYS = ["str", "dex", "con", "int", "psy", "ego"];
const title = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const sortedJSON = v => Array.isArray(v) ? `[${v.map(sortedJSON).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + sortedJSON(v[k])).join(",")}}`
  : JSON.stringify(v);
export const sameJSON = (a, b) => sortedJSON(a) === sortedJSON(b);

/* ---------------- Choices the fields offer ---------------- */

const opt = (key, label) => ({ key, label });
export const ABILITY_CHOICES = ABILITY_KEYS.map(a => opt(a, a.toUpperCase()));
export const SAVE_CHOICES = [...ABILITY_CHOICES, opt("morale", "Morale")];
export const DAMAGE_TYPE_CHOICES = [opt("", "Untyped"), ...COMMON_DAMAGE_TYPES.map(t => opt(t, title(t)))];
/** The damage properties the damage-type table knows - every one a weapon tag carries. */
export const PROPERTY_CHOICES = ["flame", "electrical", "corrosive", "eroding", "freezing", "fungal", "bludgeoning", "blast",
  "hypergeometric", "anti-paradoxical", "psyche-suppressant"].map(p => opt(p, title(p)));
export const HIT_CONDITION_CHOICES = CONDITIONS.map(c => opt(c.key, c.label));
/**
 * A use's condition: the real conditions, and the registry's states whose
 * board entry is the whole effect - not Berserk, Deprived, Exhaustion,
 * Possessed, Daemon-Possessed or Incorporeal, whose mechanics are built
 * elsewhere and a board entry would not trigger (Gift editor ruling,
 * 2026-10-05, now for every Item).
 */
// Berserk, Deprived and Incorporeal are offered since Gift Effect Library chunk 4b (RULED 2026-10-09): each
// has its boardKey or flag in states.js, so an entry does trigger its mechanics.
const NOT_OFFERED_STATES = new Set(["exhaustion", "possessed", "daemon-possessed"]);
export const USE_CONDITION_CHOICES = [
  ...CONDITIONS.map(c => opt(c.key, c.label)),
  ...STATES.filter(s => !conditionByKey(s.key) && !NOT_OFFERED_STATES.has(s.key)).map(s => opt(s.key, s.label))
];
export const PCS_CHOICES = [opt("any", "Anyone"), opt("pc", "Player characters only"), opt("npc", "Non-player characters only")];
export const SECTION_CHOICES = [opt("Always Active", "Always Active"), opt("On-Demand", "On-Demand")];
export const POLARITY_CHOICES = [opt("Benefit", "Benefit"), opt("Detriment", "Detriment")];
export const NOTE_KIND_CHOICES = [opt("reminder", "Reminder"), opt("adv", "ADV note"), opt("dis", "DIS note")];
export const FORBID_CHOICES = [opt("corrode", "Cannot be corroded"), opt("break", "Cannot break"),
  opt("destroy", "Cannot be destroyed"), opt("use-gift", "Bearer cannot use Mystic Gifts"),
  // Widening chunk 1: read by body.js bodyForbids (the helmet rule).
  opt("wear-helmet", "Bearer cannot wear a helmet")];
// Widening chunk 1: the body readers the builder never offered.
export const ATTACK_KIND_CHOICES = [opt("", "Any attack"), opt("melee", "Melee attacks"), opt("ranged", "Ranged attacks")];
/**
 * The stats the board carries as LIVE deltas (Widening chunk 3b): AV and the six
 * abilities. Max HP is not one - MEASURED in Group 613 (2026-10-09): activeDeltas
 * sums applied.maxHp but nothing folds it into health.max; the board's max HP is
 * a write at the start and a reverse at the end (the elixir handlers), which a
 * GM's entry does not get. Offered again only when that is built.
 */
export const STAT_CHANGE_CHOICES = [opt("av", "AV"), ...ABILITY_KEYS.map(a => opt(a, a.toUpperCase()))];
/** The damage-type table's target properties a body can give (attack-properties.js reads bearerProperties). */
export const BEARER_PROPERTY_CHOICES = [opt("flat", "Flat (double from slashing and piercing, half from bludgeoning)"),
  opt("flammable", "Flammable"), opt("exposedOrgans", "Exposed organs (double from slashing and piercing)"),
  opt("gills", "Gills (cannot drown)"), opt("synthFleshThermal", "Synth flesh (thermal)")];
// Mutations and Ancestry Rules chunk 2c: what an immunity, and an ADV or DIS on saves, can name.
export const IMMUNE_CHOICES = [...CONDITIONS.map(c => opt(c.key, c.label)), opt("ambush", "Ambush")];
export const SAVE_KIND_CHOICES = [opt("all", "Every save"), ...ABILITY_KEYS.map(a => opt(a, `${a.toUpperCase()} saves`)),
  opt("vs:blind", "Saves vs Blindness"), opt("vs:tox", "Saves vs poisons and TOX"), opt("vs:disease", "Saves vs disease"),
  opt("vs:nanomachine", "Saves vs nanomachines")];
const saveScope = which => which === "all" ? {} : which.startsWith("vs:") ? { vs: which.slice(3) } : { abilities: [which] };
const readSaveScope = (d, make) =>
{
  const extra = Object.keys(d).filter(k => !["verb", "on", "vs", "abilities"].includes(k));
  if (extra.length) return null;
  if (d.vs && !d.abilities) return SAVE_KIND_CHOICES.some(o => o.key === `vs:${d.vs}`) ? make(`vs:${d.vs}`) : null;
  if (d.abilities?.length === 1 && !d.vs) return make(d.abilities[0]);
  if (!d.vs && !d.abilities) return make("all");
  return null;
};
export const BAND_CHOICES = [opt("atMost", "AV at most"), opt("atLeast", "AV at least")];
export const BREAK_CHOICES = [opt("broken", "Breaks"), opt("destroyed", "Is destroyed")];
// Stats as Sentences chunk 2e-i: the Stats section's choices.
export const USAGE_DIE_CHOICES = ["d20", "d12", "d10", "d8", "d6", "d4"].map(d => opt(d, `Ud${d.slice(1)}`));
export const METAL_CHOICES = [opt("true", "Metal"), opt("false", "Not metal")];
export const ARMOUR_SLOT_CHOICES = [opt("body", "Body armour"), opt("helm", "Helm"), opt("face", "Face"), opt("shield", "Shield")];
export const FORBID_ATTACK_CHOICES = [opt("underwater", "Cannot attack while the wielder is underwater"),
  opt("submerged", "Cannot attack a submerged target")];

/* ---------------- Recipes ---------------- */

const bioGate = { gate: "creature-type", is: "biological" };
const pcGate = pcs => pcs === "pc" ? [{ gate: "is-pc" }] : pcs === "npc" ? [{ gate: "is-pc", is: false }] : [];
const limitGates = v => [...pcGate(v.pcs), ...(v.bio ? [bioGate] : [])];
const readLimits = ifs =>
{
  const out = { pcs: "any", bio: false };
  for (const g of ifs ?? [])
  {
    if (g.gate === "is-pc" && g.is === undefined) out.pcs = "pc";
    else if (g.gate === "is-pc" && g.is === false) out.pcs = "npc";
    else if (g.gate === "creature-type" && g.is === "biological") out.bio = true;
    else return null;
  }
  return out;
};
const withIf = (core, ifs) => ifs.length ? { ...core, if: ifs } : core;
/** A stat sentence of exactly { verb: modify, stat, amount } - nothing gated, nothing more said. */
const isStatMod = (c, stat) => c.do?.verb === "modify" && c.do.stat === stat && !c.if && Object.keys(c.do).length === 3;
const signed = n => { const x = Number(n) || 0; return x < 0 ? `${x}` : `+${x}`; };
/** A stat amount as stored: a number signed, a formula as typed with its leading sign kept (Gift Effect Library chunk 2). */
const statAmount = a => /^[+-]?\d+$/.test(String(a ?? "").trim()) ? signed(String(a).trim()) : String(a ?? "").trim().replace(/\s+/g, "");
const unsign = a => Number(String(a ?? "").replace(/^\+/, ""));
// No `vs`: the save card falls back to the sentence's text (hitSaveSpecs), which the GM writes.
const resistOf = ability => ability === "morale" ? { type: "morale" } : { type: "save", ability };
const abilityOfResist = r => r?.type === "morale" ? "morale" : r?.ability;

/**
 * THE BESTOW KINDS - Gift Effect Library chunk 3 (RULED 2026-10-09, Matt). Each
 * composes one passive sentence: `inner(v)` the sentence (a passive recipe's
 * own shape where one exists), `read(s)` its values back or null, `name(v)` the
 * bestowed Item's name, `say(v)` the row's words. Two shapes are this chunk's
 * own, read by attack-properties.js: "dis on attacks-against" (the ward) and
 * "modify damage-taken <type> x0.5" (a resisted type).
 */
const ADV_DIS = [opt("adv", "ADV"), opt("dis", "DIS")];
export const BESTOW_KINDS = [
  { key: "immune", label: "immunity to a condition (or ambush)", fields: [{ key: "to", kind: "select", label: "Immune to", choices: IMMUNE_CHOICES, default: "blind" }],
    inner: v => ({ when: "passive", do: { verb: "immune", to: v.to } }),
    read: s => s.do?.verb === "immune" && IMMUNE_CHOICES.some(o => o.key === s.do.to) ? { to: s.do.to } : null,
    name: v => `Immune to ${IMMUNE_CHOICES.find(o => o.key === v.to)?.label ?? v.to}`, say: v => `immunity to ${IMMUNE_CHOICES.find(o => o.key === v.to)?.label.toLowerCase() ?? v.to}` },
  { key: "save", label: "ADV or DIS on saves", fields: [{ key: "verb", kind: "select", label: "Roll with", choices: ADV_DIS, default: "adv" }, { key: "which", kind: "select", label: "On", choices: SAVE_KIND_CHOICES, default: "all" }],
    inner: v => ({ when: "passive", do: { verb: v.verb, on: "save", ...saveScope(v.which) } }),
    read: s => ["adv", "dis"].includes(s.do?.verb) && s.do.on === "save" ? readSaveScope(s.do, v => ({ verb: s.do.verb, which: v })) : null,
    name: v => `${v.verb.toUpperCase()} on saves`, say: v => `${v.verb.toUpperCase()} on ${(SAVE_KIND_CHOICES.find(o => o.key === v.which)?.label ?? "").replace(/^(Every|Saves)/, w => w.toLowerCase())}` },
  { key: "attack", label: "ADV or DIS on their attacks", fields: [{ key: "verb", kind: "select", label: "Roll with", choices: ADV_DIS, default: "adv" }, { key: "kind", kind: "select", label: "On", choices: ATTACK_KIND_CHOICES, default: "" }],
    inner: v => withIf({ when: "attack-roll", do: { verb: v.verb, on: "attack" } }, v.kind ? [{ gate: "attack-kind", is: v.kind }] : []),
    read: s => ["adv", "dis"].includes(s.do?.verb) && s.do.on === "attack" ? { verb: s.do.verb, kind: s.if?.[0]?.gate === "attack-kind" ? s.if[0].is : "" } : null,
    name: v => `${v.verb.toUpperCase()} on attacks`, say: v => `${v.verb.toUpperCase()} on ${v.kind ? v.kind + " " : ""}attacks` },
  { key: "ward", label: "attacks against them at DIS", fields: [],
    inner: () => ({ when: "passive", do: { verb: "dis", on: "attacks-against" } }),
    read: s => s.do?.verb === "dis" && s.do.on === "attacks-against" ? {} : null,
    name: () => "Warded", say: () => "DIS on attacks against them" },
  { key: "resist", label: "half damage from a type", fields: [{ key: "type", kind: "select", label: "Type", choices: DAMAGE_TYPE_CHOICES.filter(o => o.key), default: "flame" }],
    inner: v => ({ when: "passive", do: { verb: "modify", stat: "damage-taken", type: v.type, amount: "x0.5" } }),
    read: s => s.do?.verb === "modify" && s.do.stat === "damage-taken" && s.do.amount === "x0.5" && DAMAGE_TYPE_CHOICES.some(o => o.key && o.key === s.do.type) ? { type: s.do.type } : null,
    name: v => `Resists ${title(v.type)}`, say: v => `half damage from ${v.type}` },
  { key: "reflect", label: "misses against them strike the attacker", fields: [],
    inner: () => ({ when: "when-missed", target: "attacker", do: { verb: "reflect" } }),
    read: s => s.do?.verb === "reflect" ? {} : null,
    name: () => "Reflecting", say: () => "reflected misses" },
  { key: "light", label: "shed light", fields: [],
    inner: () => ({ when: "passive", do: { verb: "emit-light", tier: "source" } }),
    read: s => s.do?.verb === "emit-light" ? {} : null,
    name: () => "Shining", say: () => "light" },
  { key: "rations", label: "needs no rations", fields: [],
    inner: () => ({ when: "passive", do: { verb: "modify", stat: "rations-needed", amount: "x0", rule: "Sustained" } }),
    read: s => s.do?.verb === "modify" && s.do.stat === "rations-needed" ? {} : null,
    name: () => "Sustained", say: () => "no need of rations" },
  { key: "protect", label: "may take a lethal blow aimed at a ward (the protector rule)", fields: [],
    inner: () => ({ when: "passive", do: { verb: "protector" } }),
    read: s => s.do?.verb === "protector" ? {} : null,
    name: () => "Protector", say: () => "the protector rule" },
  { key: "breathe", label: "breathes underwater", fields: [],
    inner: () => ({ when: "passive", do: { verb: "modify", stat: "damage-properties", amount: "+gills" } }),
    read: s => s.do?.verb === "modify" && s.do.stat === "damage-properties" && s.do.amount === "+gills" ? {} : null,
    name: () => "Water-Breathing", say: () => "breathing underwater" }
];
function bestowInner(k, v) { return normalise(k.inner(v)); }

/**
 * Field kinds: dice, number, select (with choices), text, check, color.
 * `item: true` on a field: it lives on the Item, not in the sentence
 * (Luminous's colour, flags.vaarn.lightColor, read by emittedLightOf).
 */
export const RECIPES = [
  /* ---- USE on a Gift: the Gift tab's four kinds, as presets (Interpreter chunk 4). First, so a Gift's chosen-die sentence is read as a preset before a generic use (Gift Effect Library chunk 1) ---- */
  { id: "gift-damage", when: "use", scope: "gift", label: "Gift damage (die + PSY)",
    fields: [{ key: "type", kind: "select", label: "Type", choices: DAMAGE_TYPE_CHOICES.filter(o => o.key), default: "kinetic" }],
    slots: ["gates-use", "label"],
    build: v => giftCore({ kind: "damage", damageType: v.type }),
    read: c => giftRead(c, "damage", e => ({ type: e.damageType })),
    say: v => `${v.type} damage (die + PSY)` },
  { id: "gift-heal", when: "use", scope: "gift", label: "Gift healing (die + PSY)", fields: [], slots: ["gates-use", "label"],
    build: () => giftCore({ kind: "healing" }),
    read: c => giftRead(c, "healing", () => ({})),
    say: () => "healing (die + PSY)" },
  { id: "gift-condition", when: "use", scope: "gift", label: "Gift condition",
    fields: [{ key: "condition", kind: "select", label: "Condition", choices: [...CONDITIONS.map(c => opt(c.key, c.label)), opt("", "Named effect...")], default: "blind" },
             { key: "effectName", kind: "text", label: "Effect name (a named effect)", default: "" }],
    slots: ["gates-use", "label"],
    build: v => giftCore({ kind: "condition", condition: v.condition, effectName: v.condition ? "" : v.effectName }),
    read: c => giftRead(c, "condition", e => ({ condition: e.condition, effectName: e.effectName })),
    say: v => v.condition ? conditionByKey(v.condition)?.label : (v.effectName || "a named effect") },
  { id: "gift-prose", when: "use", scope: "gift", label: "Gift described effect", fields: [], slots: ["gates-use", "label"],
    build: () => giftCore({ kind: "prose" }),
    read: c => giftRead(c, "prose", () => ({})),
    say: () => "a described effect" },

  /* ---- USE, any Item: the generic Use control (chunk 1). On a Gift too since
     Widening chunk 1 (RULED 2026-10-09, Matt): fixed dice with any cost kind
     is how a Gift gets other ways to pay; the die + PSY presets stay Gifts'. ---- */
  { id: "use-damage", when: "use", scope: "any", label: "Deal damage",
    fields: [{ key: "dice", kind: "dice", label: "Dice", default: "1d6" }, { key: "type", kind: "select", label: "Type", choices: DAMAGE_TYPE_CHOICES, default: "" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "damage", dice: v.dice, ...(v.type ? { type: v.type } : {}) } }),
    read: c => c.do?.verb === "damage" && !c.if ? { dice: c.do.dice, type: c.do.type ?? "" } : null,
    say: v => `${v.dice}${v.type ? " " + v.type : ""} damage` },
  { id: "use-heal", when: "use", scope: "any", label: "Heal",
    fields: [{ key: "amount", kind: "dice", label: "Amount", default: "1d6" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "heal", amount: v.amount } }),
    read: c => c.do?.verb === "heal" && !c.if ? { amount: c.do.amount } : null,
    say: v => `heals ${v.amount}` },
  { id: "use-condition", when: "use", scope: "any", label: "Apply a condition",
    fields: [{ key: "state", kind: "select", label: "Condition", choices: USE_CONDITION_CHOICES, default: "blind" },
             { key: "name", kind: "text", label: "Its wording (optional)", default: "" }],
    slots: ["gates-use", "target", "duration", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "condition", state: v.state, ...(v.name ? { name: v.name } : {}) } }),
    read: c => c.do?.verb === "condition" && !c.if && USE_CONDITION_CHOICES.some(o => o.key === c.do.state) ? { state: c.do.state, name: c.do.name ?? "" } : null,
    say: v => v.name || stateByKey(v.state)?.label || v.state },
  { id: "use-reminder", when: "use", scope: "any", label: "Post a reminder",
    fields: [], slots: ["gates-use", "duration-optional", "cost", "label"],
    build: () => ({ when: "use", do: { verb: "reminder" } }),
    read: c => c.do?.verb === "reminder" && !c.do.name && !c.if ? {} : null,
    say: () => "a reminder" },
  // Widening chunk 3a (RULED 2026-10-09): ability damage and a kill on a use, the
  // effect card's Apply per target (card, the default to test).
  { id: "use-ability-damage", when: "use", scope: "any", label: "Ability damage",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "str" },
             { key: "dice", kind: "dice", label: "Dice", default: "1d4" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "ability-damage", ability: v.ability, dice: v.dice } }),
    read: c => c.do?.verb === "ability-damage" && !c.resist && !c.if && Object.keys(c.do).length === 3 ? { ability: c.do.ability, dice: c.do.dice } : null,
    say: v => `${v.dice} ${v.ability.toUpperCase()} damage` },
  { id: "use-kill", when: "use", scope: "any", label: "Target dies (no save)", fields: [],
    slots: ["gates-use", "target", "cost", "label"],
    build: () => ({ when: "use", do: { verb: "kill" } }),
    read: c => c.do?.verb === "kill" && !c.resist && !c.if && Object.keys(c.do).length === 1 ? {} : null,
    say: () => "the target dies" },
  // Widening chunk 3b (RULED 2026-10-09): a stat change for a while - a board
  // entry's applied deltas; at once on the user, a card on a target; no span
  // means until the Referee ends it.
  { id: "use-stat-change", when: "use", scope: "any", label: "Change a stat for a while",
    fields: [{ key: "stat", kind: "select", label: "Stat", choices: STAT_CHANGE_CHOICES, default: "av" },
             // A number, or a formula filled at the use: +@psy, @cost+@psy, +1d4 (Gift Effect Library chunk 2).
             { key: "amount", kind: "dice", label: "By (a number, or +@psy, @cost+@psy, +1d4)", default: "+2" }],
    slots: ["gates-use", "target", "duration-until-referee", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "modify", stat: v.stat, amount: statAmount(v.amount) } }),
    read: c => c.do?.verb === "modify" && STAT_CHANGE_CHOICES.some(o => o.key === c.do.stat) && Object.keys(c.do).length === 3 && !c.if
      && STAT_AMOUNT.test(String(c.do.amount)) ? { stat: c.do.stat, amount: statAmount(c.do.amount) } : null,
    say: v => `${amountWords(v.amount)} ${STAT_CHANGE_CHOICES.find(o => o.key === v.stat)?.label ?? v.stat}` },
  // Widening chunk 3c (RULED 2026-10-09): an attack state for a while - a board
  // entry that sets the actor's state and clears it when it ends; at once on the
  // user, a card on a target; no span means until the Referee ends it.
  { id: "use-auto-hit", when: "use", scope: "any", label: "Attacks auto-hit for a while",
    fields: [{ key: "kind", kind: "select", label: "Which attacks", choices: ATTACK_KIND_CHOICES, default: "" }],
    slots: ["gates-use", "target", "duration-until-referee", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "auto-hit", kind: v.kind || "any" } }),
    read: c => c.do?.verb === "auto-hit" && !c.if && Object.keys(c.do).length === 2 && ["any", "melee", "ranged"].includes(c.do.kind) ? { kind: c.do.kind === "any" ? "" : c.do.kind } : null,
    say: v => `${v.kind ? v.kind + " " : ""}attacks auto-hit` },
  { id: "use-ignore-armour", when: "use", scope: "any", label: "Attacks ignore armour for a while",
    fields: [{ key: "kind", kind: "select", label: "Which attacks", choices: ATTACK_KIND_CHOICES, default: "" }],
    slots: ["gates-use", "target", "duration-until-referee", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "ignore-armour", kind: v.kind || "any" } }),
    read: c => c.do?.verb === "ignore-armour" && !c.if && Object.keys(c.do).length === 2 && ["any", "melee", "ranged"].includes(c.do.kind) ? { kind: c.do.kind === "any" ? "" : c.do.kind } : null,
    say: v => `${v.kind ? v.kind + " " : ""}attacks ignore armour` },
  // Widening chunk 3e (RULED 2026-10-09): a natural weapon for a while - a board
  // entry that grants the Item and removes it when it ends; at once on the user,
  // a card on a target; no span means until the Referee ends it.
  { id: "use-grant-attack", when: "use", scope: "any", label: "Grant an attack for a while",
    fields: [{ key: "name", kind: "text", label: "Its name", default: "Claws" },
             { key: "dice", kind: "dice", label: "Damage", default: "1d6" },
             { key: "type", kind: "select", label: "Type", choices: DAMAGE_TYPE_CHOICES, default: "" },
             { key: "kind", kind: "select", label: "Melee or ranged", choices: [opt("melee", "Melee"), opt("ranged", "Ranged")], default: "melee" }],
    slots: ["gates-use", "target", "duration-until-referee", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "grant-attack", name: v.name, dice: v.dice, kind: v.kind, ...(v.type ? { type: v.type } : {}) } }),
    read: c => c.do?.verb === "grant-attack" && !c.if && ["melee", "ranged"].includes(c.do.kind) && Object.keys(c.do).every(k => ["verb", "name", "dice", "kind", "type"].includes(k))
      ? { name: c.do.name ?? "", dice: c.do.dice, type: c.do.type ?? "", kind: c.do.kind } : null,
    say: v => `grants ${v.name || "an attack"} (${v.dice}${v.type ? " " + v.type : ""}, ${v.kind})` },
  // Gift Effect Library chunk 4a (RULED 2026-10-09): the hooks to what exists, each
  // the effect card's Apply per target (effect-card.js) - temporary HP (never a
  // heal), a cure, a wound closed, a Level drained, armour eroded, the escalating
  // beam, a jinx.
  { id: "use-temp-hp", when: "use", scope: "any", label: "Grant temporary HP",
    fields: [{ key: "amount", kind: "dice", label: "Amount (dice, or @cost+@psy)", default: "1d6" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "temp-hp", amount: v.amount } }),
    read: c => c.do?.verb === "temp-hp" && !c.if && Object.keys(c.do).length === 2 ? { amount: c.do.amount } : null,
    say: v => `${v.amount} temporary HP` },
  { id: "use-cure", when: "use", scope: "any", label: "Cure",
    fields: [{ key: "what", kind: "select", label: "Cure", choices: [opt("tox", "Poison (the Toxin Die down PSY steps)"), opt("affliction", "An affliction (chosen on Apply)"), opt("burning", "A fire (extinguish)")], default: "tox" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "cure", what: v.what, ...(v.what === "tox" ? { steps: "@psy" } : {}) } }),
    read: c => c.do?.verb === "cure" && !c.if && ["tox", "affliction", "burning"].includes(c.do.what) && (c.do.what !== "tox" || c.do.steps === "@psy") ? { what: c.do.what } : null,
    say: v => v.what === "tox" ? "cures poison (the Toxin Die down PSY steps)" : v.what === "burning" ? "puts out a fire" : "cures an affliction" },
  { id: "use-mend-wound", when: "use", scope: "any", label: "Close a wound", fields: [],
    slots: ["gates-use", "target", "cost", "label"],
    build: () => ({ when: "use", do: { verb: "remove-wound", count: 1 } }),
    read: c => c.do?.verb === "remove-wound" && !c.if && Number(c.do.count) === 1 ? {} : null,
    say: () => "closes one wound" },
  { id: "use-level-drain", when: "use", scope: "any", label: "Drain a Level",
    fields: [{ key: "levels", kind: "number", label: "Levels", default: 1 }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "level", amount: `-${Math.max(1, Number(v.levels) || 1)}` } }),
    read: c => c.do?.verb === "level" && !c.if && /^-\d+$/.test(String(c.do.amount)) && Object.keys(c.do).length === 2 ? { levels: Math.abs(Number(c.do.amount)) } : null,
    say: v => `drains ${v.levels} Level${Number(v.levels) === 1 ? "" : "s"}` },
  { id: "use-armour-erosion", when: "use", scope: "any", label: "Erode armour",
    fields: [{ key: "amount", kind: "dice", label: "AV eroded (a number, +@psy, or dice)", default: "+@psy" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "modify", stat: "armour-damage", amount: statAmount(v.amount) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "armour-damage" && !c.if && Object.keys(c.do).length === 3 && STAT_AMOUNT.test(String(c.do.amount)) ? { amount: statAmount(c.do.amount) } : null,
    say: v => `erodes ${amountWords(v.amount).replace(/^\+/, "")} AV of armour` },
  { id: "use-escalating", when: "use", scope: "any", label: "Escalating beam",
    fields: [{ key: "start", kind: "number", label: "Damage now", default: 1 }, { key: "factor", kind: "number", label: "Multiplied each round by", default: 2 }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "damage", dice: String(Math.max(1, Number(v.start) || 1)), escalating: { factor: Math.max(2, Number(v.factor) || 2) } } }),
    read: c => c.do?.verb === "damage" && c.do.escalating && !c.if && /^\d+$/.test(String(c.do.dice)) ? { start: Number(c.do.dice), factor: Number(c.do.escalating.factor) || 2 } : null,
    say: v => `${v.start} unblockable damage, x${v.factor} each round` },
  // Chunk 4c (RULED 2026-10-09): the next attack is a natural 20, spent by it.
  { id: "use-unerring", when: "use", scope: "any", label: "Their next attack is a natural 20", fields: [],
    slots: ["gates-use", "target", "duration-until-referee", "cost", "label"],
    build: () => ({ when: "use", do: { verb: "auto-hit", next: true } }),
    read: c => c.do?.verb === "auto-hit" && c.do.next === true && !c.if && Object.keys(c.do).length === 2 ? {} : null,
    say: () => "their next attack is a natural 20" },
  { id: "use-jinx", when: "use", scope: "any", label: "Jinx", fields: [],
    slots: ["gates-use", "target", "cost", "label"],
    build: () => ({ when: "use", do: { verb: "special", handler: "jinx" } }),
    read: c => c.do?.verb === "special" && c.do.handler === "jinx" && !c.if ? {} : null,
    say: () => "jinxes them (one number on their d20 becomes a 1)" },
  // Gift Effect Library chunk 3 (RULED 2026-10-09): a passive effect bestowed for
  // a while - the entry grants an intrinsic Item carrying the sentence, read by
  // every reader of the bearer's Items, gone when the entry ends. One recipe per
  // KIND (the Do list), its VALUE the field; each inner sentence is a passive
  // recipe's own, built through it (bestowInner), so it resolves as that does.
  ...BESTOW_KINDS.map(k => ({
    id: `bestow-${k.key}`, when: "use", scope: "any", label: `Bestow: ${k.label}`,
    fields: k.fields,
    slots: ["gates-use", "target", "duration-until-referee", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "bestow", name: k.name(v), effects: [bestowInner(k, v)] } }),
    read: c =>
    {
      if (c.do?.verb !== "bestow" || c.if || c.do.effects?.length !== 1) return null;
      const values = k.read(c.do.effects[0]);
      return values && c.do.name === k.name(values) ? values : null;
    },
    say: v => `bestows ${k.say(v)}`
  })),
  // Widening chunk 3d (RULED 2026-10-09): a compulsion is a board entry (a card
  // with Apply); a teleport, a forced move, a reveal or a conceal is said to the
  // targets in the sentence's words.
  { id: "use-compel", when: "use", scope: "any", label: "Compel the target",
    fields: [{ key: "command", kind: "text", label: "To...", default: "obey one command" }],
    slots: ["gates-use", "target", "duration-optional", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "compel", command: v.command } }),
    read: c => c.do?.verb === "compel" && !c.if && Object.keys(c.do).length === 2 ? { command: c.do.command } : null,
    say: v => `compelled to ${v.command}` },
  { id: "use-teleport", when: "use", scope: "any", label: "Teleport the target",
    fields: [{ key: "to", kind: "text", label: "To...", default: "a place the user can see" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "teleport", to: v.to } }),
    read: c => c.do?.verb === "teleport" && !c.if && Object.keys(c.do).length === 2 ? { to: c.do.to } : null,
    say: v => `teleported ${v.to}` },
  { id: "use-forced-move", when: "use", scope: "any", label: "Force the target to move",
    fields: [{ key: "how", kind: "text", label: "How", default: "flee" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "forced-move", how: v.how } }),
    read: c => c.do?.verb === "forced-move" && !c.if && Object.keys(c.do).length === 2 ? { how: c.do.how } : null,
    say: v => `forced to ${v.how}` },
  { id: "use-reveal", when: "use", scope: "any", label: "Reveal something about the target",
    fields: [{ key: "what", kind: "text", label: "What", default: "level, AV and HP" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "reveal", what: v.what } }),
    read: c => c.do?.verb === "reveal" && !c.if && Object.keys(c.do).length === 2 ? { what: c.do.what } : null,
    say: v => `reveals ${v.what}` },
  { id: "use-conceal", when: "use", scope: "any", label: "Conceal something",
    fields: [{ key: "what", kind: "text", label: "What", default: "the user" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "conceal", what: v.what } }),
    read: c => c.do?.verb === "conceal" && !c.if && Object.keys(c.do).length === 2 ? { what: c.do.what } : null,
    say: v => `conceals ${v.what}` },
  // Widening chunk 1: a save on a use (Mutations and Ancestry Rules chunk 4's
  // reader) - the targets roll, a failure puts the condition on. The only
  // recipe whose duration may be "until saved": the save that ends it is this one.
  { id: "use-save-condition", when: "use", scope: "any", label: "Target saves or takes a condition",
    fields: [{ key: "ability", kind: "select", label: "Save", choices: SAVE_CHOICES, default: "dex" },
             { key: "state", kind: "select", label: "Condition", choices: HIT_CONDITION_CHOICES, default: "blind" }],
    slots: ["gates-use", "target", "duration-optional", "duration-saved", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "condition", state: v.state }, resist: resistOf(v.ability) }),
    read: c => c.do?.verb === "condition" && c.resist && !c.do.name && !c.if && HIT_CONDITION_CHOICES.some(o => o.key === c.do.state)
      ? { ability: abilityOfResist(c.resist), state: c.do.state } : null,
    say: v => `target ${v.ability.toUpperCase()} save or ${conditionByKey(v.state)?.label}` },

  /* ---- PASSIVE, any Item: held while the Item is in its state (chunk 1's readers) ---- */
  { id: "passive-av", when: "passive", scope: "any", label: "Change the bearer's AV",
    fields: [{ key: "amount", kind: "number", label: "AV", default: 1 }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "modify", stat: "av", amount: signed(v.amount) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "av" && Object.keys(c.do).length === 3 && !c.if ? { amount: unsign(c.do.amount) } : null,
    say: v => `${signed(v.amount)} AV` },
  { id: "passive-light", when: "passive", scope: "any", label: "Shed light",
    fields: [{ key: "lightColor", kind: "color", label: "Colour", default: "", item: true }],
    slots: ["state", "gates-passive"],
    build: () => ({ when: "passive", do: { verb: "emit-light", tier: "source" } }),
    read: c => c.do?.verb === "emit-light" && c.do.tier === "source" && !c.if ? {} : null,
    say: () => "sheds light" },
  { id: "passive-rations", when: "passive", scope: "any", label: "Eat and drink more rations",
    fields: [{ key: "times", kind: "number", label: "Times as many", default: 2 }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "upkeep", item: "Ration", per: "day", times: Number(v.times) } }),
    read: c => c.do?.verb === "upkeep" && c.do.item === "Ration" && c.do.per === "day" && !c.if ? { times: Number(c.do.times) } : null,
    say: v => `eats and drinks ${v.times}x rations` },
  { id: "passive-forbid", when: "passive", scope: "any", label: "Forbid something",
    fields: [{ key: "what", kind: "select", label: "What", choices: FORBID_CHOICES, default: "corrode" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "forbid", what: v.what } }),
    read: c => c.do?.verb === "forbid" && FORBID_CHOICES.some(o => o.key === c.do.what) && !c.if ? { what: c.do.what } : null,
    say: v => FORBID_CHOICES.find(o => o.key === v.what)?.label.toLowerCase() },
  { id: "passive-note", when: "passive", scope: "any", label: "A note on the Forgettable Effects tab",
    fields: [{ key: "kind", kind: "select", label: "Kind", choices: NOTE_KIND_CHOICES, default: "reminder" }],
    slots: ["state", "gates-passive", "tab", "label"],
    build: v => ({ when: "passive", do: v.kind === "reminder" ? { verb: "reminder" } : { verb: v.kind, on: "noted" } }),
    read: c => (c.do?.verb === "reminder" && !c.do.name) || (["adv", "dis"].includes(c.do?.verb) && c.do.on === "noted")
      ? (c.if ? null : { kind: c.do.verb }) : null,
    say: v => v.kind === "reminder" ? "a reminder" : `${v.kind.toUpperCase()} note` },

  /* ---- PASSIVE, any Item: the words Mutations and Ancestry Rules chunk 2c wired (2026-10-05) ---- */
  { id: "passive-immune", when: "passive", scope: "any", label: "Immunity",
    fields: [{ key: "to", kind: "select", label: "Immune to", choices: IMMUNE_CHOICES, default: "blind" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "immune", to: v.to } }),
    read: c => c.do?.verb === "immune" && IMMUNE_CHOICES.some(o => o.key === c.do.to) && !c.if ? { to: c.do.to } : null,
    say: v => `immune to ${IMMUNE_CHOICES.find(o => o.key === v.to)?.label.toLowerCase()}` },
  { id: "passive-save", when: "passive", scope: "any", label: "ADV or DIS on saves",
    fields: [{ key: "verb", kind: "select", label: "Roll with", choices: [opt("adv", "ADV"), opt("dis", "DIS")], default: "adv" },
             { key: "which", kind: "select", label: "On", choices: SAVE_KIND_CHOICES, default: "all" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: v.verb, on: "save", ...saveScope(v.which) } }),
    read: c => ["adv", "dis"].includes(c.do?.verb) && c.do.on === "save" && !c.if ? readSaveScope(c.do, v => ({ verb: c.do.verb, which: v })) : null,
    say: v => `${v.verb.toUpperCase()} on ${(SAVE_KIND_CHOICES.find(o => o.key === v.which)?.label ?? "").replace(/^(Every|Saves)/, w => w.toLowerCase())}` },
  { id: "passive-flee", when: "passive", scope: "any", label: "ADV or DIS when fleeing",
    fields: [{ key: "verb", kind: "select", label: "Roll with", choices: [opt("adv", "ADV"), opt("dis", "DIS")], default: "adv" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: v.verb, on: "flee" } }),
    read: c => ["adv", "dis"].includes(c.do?.verb) && c.do.on === "flee" && Object.keys(c.do).length === 2 && !c.if ? { verb: c.do.verb } : null,
    say: v => `${v.verb.toUpperCase()} when fleeing` },
  { id: "passive-escape", when: "passive", scope: "any", label: "ADV to escape a hold", fields: [],
    slots: ["state", "gates-passive"],
    build: () => ({ when: "passive", do: { verb: "adv", on: "escape" } }),
    read: c => c.do?.verb === "adv" && c.do.on === "escape" && Object.keys(c.do).length === 2 && !c.if ? {} : null,
    say: () => "ADV on saves to escape a hold" },

  /* ---- PASSIVE, any Item: the body readers the builder never offered (Widening chunk 1, RULED 2026-10-09) ---- */
  { id: "passive-ability", when: "passive", scope: "any", label: "Change an ability bonus",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "str" },
             { key: "amount", kind: "number", label: "Bonus", default: 1 }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "modify", stat: v.ability, amount: signed(v.amount) } }),
    read: c => c.do?.verb === "modify" && ABILITY_KEYS.includes(c.do.stat) && Object.keys(c.do).length === 3 && !c.if
      ? { ability: c.do.stat, amount: unsign(c.do.amount) } : null,
    say: v => `${signed(v.amount)} ${v.ability.toUpperCase()}` },
  { id: "passive-attack", when: "attack-roll", scope: "body", label: "ADV or DIS on the bearer's attacks",
    fields: [{ key: "verb", kind: "select", label: "Roll with", choices: [opt("adv", "ADV"), opt("dis", "DIS")], default: "adv" },
             { key: "kind", kind: "select", label: "On", choices: ATTACK_KIND_CHOICES, default: "" }],
    slots: [],
    build: v => withIf({ when: "attack-roll", do: { verb: v.verb, on: "attack" } }, v.kind ? [{ gate: "attack-kind", is: v.kind }] : []),
    read: c =>
    {
      if (!["adv", "dis"].includes(c.do?.verb) || c.do.on !== "attack" || Object.keys(c.do).length !== 2) return null;
      if (!c.if) return { verb: c.do.verb, kind: "" };
      const g = c.if.length === 1 ? c.if[0] : null;
      return g?.gate === "attack-kind" && ATTACK_KIND_CHOICES.some(o => o.key && o.key === g.is) && Object.keys(g).length === 2 ? { verb: c.do.verb, kind: g.is } : null;
    },
    say: v => `${v.verb.toUpperCase()} on ${v.kind ? `${v.kind} attacks` : "attacks"}` },
  { id: "passive-encounter", when: "passive", scope: "any", label: "DIS on encounter rolls",
    fields: [{ key: "why", kind: "text", label: "Why (shown on the clock)", default: "" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "dis", on: "encounter", ...(v.why ? { why: v.why } : {}) } }),
    read: c => c.do?.verb === "dis" && c.do.on === "encounter" && !c.if && Object.keys(c.do).every(k => ["verb", "on", "why"].includes(k))
      ? { why: c.do.why ?? "" } : null,
    say: v => `DIS on encounter rolls${v.why ? ` (${v.why})` : ""}` },
  { id: "passive-ration-free", when: "passive", scope: "any", label: "Needs no rations",
    fields: [{ key: "rule", kind: "text", label: "The rule's name (on the rest card)", default: "No rations needed" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "modify", stat: "rations-needed", amount: "x0", rule: v.rule || "No rations needed" } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "rations-needed" && c.do.amount === "x0" && !c.if ? { rule: c.do.rule ?? "" } : null,
    say: () => "needs no rations" },
  { id: "passive-hide-hp", when: "passive", scope: "any", label: "Hide the bearer's HP from its players", fields: [],
    slots: ["state", "gates-passive"],
    build: () => ({ when: "passive", do: { verb: "conceal", what: "hp" } }),
    read: c => c.do?.verb === "conceal" && c.do.what === "hp" && !c.if ? {} : null,
    say: () => "HP hidden from the players" },
  { id: "passive-base-av", when: "passive", scope: "any", label: "Set the bearer's base AV",
    fields: [{ key: "base", kind: "number", label: "Base AV", default: 12 },
             { key: "level", kind: "check", label: "Plus the bearer's Level", default: false },
             { key: "max", kind: "number", label: "Maximum (blank: none)", default: "" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "modify", stat: "base-av", amount: `=${Number(v.base)}${v.level ? "+@level" : ""}`,
                                          ...(v.max !== "" && v.max !== undefined && v.max !== null ? { max: Number(v.max) } : {}) } }),
    read: c =>
    {
      const m = c.do?.verb === "modify" && c.do.stat === "base-av" && !c.if ? /^=(\d+)(\+@level)?$/.exec(String(c.do.amount)) : null;
      return m ? { base: Number(m[1]), level: !!m[2], max: c.do.max ?? "" } : null;
    },
    say: v => `base AV ${v.base}${v.level ? " + Level" : ""}${v.max !== "" ? ` (max ${v.max})` : ""}` },
  { id: "passive-helmets", when: "passive", scope: "any", label: "Extra helmets the bearer can wear",
    fields: [{ key: "amount", kind: "number", label: "Extra helmets", default: 1 }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "modify", stat: "helmets", amount: signed(v.amount) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "helmets" && Object.keys(c.do).length === 3 && !c.if ? { amount: unsign(c.do.amount) } : null,
    say: v => `${signed(v.amount)} helmet${Math.abs(Number(v.amount)) === 1 ? "" : "s"}` },
  { id: "passive-property", when: "passive", scope: "any", label: "The bearer takes damage as if...",
    fields: [{ key: "property", kind: "select", label: "Property", choices: BEARER_PROPERTY_CHOICES, default: "flat" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "modify", stat: "damage-properties", amount: `+${v.property}` } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "damage-properties" && !c.if && BEARER_PROPERTY_CHOICES.some(o => `+${o.key}` === c.do.amount)
      ? { property: String(c.do.amount).slice(1) } : null,
    say: v => `takes damage as ${(BEARER_PROPERTY_CHOICES.find(o => o.key === v.property)?.label ?? v.property).replace(/\s*\(.*\)$/, "").toLowerCase()}` },

  // Gift Effect Library chunk 3's two readers as passive recipes on any Item, so a
  // bestowed Warded or Resists item's Effects tab reads them (Group 619: "passive: dis").
  { id: "passive-ward", when: "passive", scope: "any", label: "Attacks against the bearer at DIS", fields: [],
    slots: ["state", "gates-passive"],
    build: () => ({ when: "passive", do: { verb: "dis", on: "attacks-against" } }),
    read: c => c.do?.verb === "dis" && c.do.on === "attacks-against" && Object.keys(c.do).length === 2 && !c.if ? {} : null,
    say: () => "attacks against the bearer at DIS" },
  { id: "passive-resist", when: "passive", scope: "any", label: "Half damage from a type",
    fields: [{ key: "type", kind: "select", label: "Type", choices: DAMAGE_TYPE_CHOICES.filter(o => o.key), default: "flame" }],
    slots: ["state", "gates-passive"],
    build: v => ({ when: "passive", do: { verb: "modify", stat: "damage-taken", type: v.type, amount: "x0.5" } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "damage-taken" && c.do.amount === "x0.5" && !c.if && DAMAGE_TYPE_CHOICES.some(o => o.key && o.key === c.do.type) ? { type: c.do.type } : null,
    say: v => `half damage from ${v.type}` },

  /* ---- REACTION ROLLS, any Item carried (Reaction Roll Button, chunk 1) ---- */
  { id: "reaction", when: "on-reaction-roll", scope: "any", label: "ADV or DIS on reaction rolls",
    fields: [{ key: "verb", kind: "select", label: "Roll with", choices: [opt("adv", "ADV"), opt("dis", "DIS")], default: "adv" },
             { key: "followers", kind: "check", label: "Only with followers of the religion that blessed or cursed it (the GM is asked)", default: false }],
    slots: [],
    build: v => withIf({ when: "on-reaction-roll", requires: "carried", do: { verb: v.verb, on: "reaction" } }, v.followers ? [{ gate: "followers" }] : []),
    read: c => ["adv", "dis"].includes(c.do?.verb) && c.do.on === "reaction" && c.requires === "carried"
      && (!c.if || (c.if.length === 1 && c.if[0].gate === "followers" && Object.keys(c.if[0]).length === 1))
      ? { verb: c.do.verb, followers: !!c.if } : null,
    say: v => `${v.verb.toUpperCase()} on reaction rolls${v.followers ? " with the followers of its religion" : ""}` },

  /* ---- WEAPONS: on a hit (Weapon Tags chunk 3 readers) ---- */
  { id: "hit-save-condition", when: "attack-hit", scope: "attack", label: "Target saves or takes a condition",
    fields: [{ key: "ability", kind: "select", label: "Save", choices: SAVE_CHOICES, default: "dex" },
             { key: "state", kind: "select", label: "Condition", choices: HIT_CONDITION_CHOICES, default: "blind" },
             { key: "rounds", kind: "number", label: "Rounds (blank: until the Referee ends it)", default: "" },
             { key: "pcs", kind: "select", label: "Who", choices: PCS_CHOICES, default: "any" },
             { key: "bio", kind: "check", label: "Biological targets only", default: false }],
    slots: [],
    build: v => withIf({ when: "attack-hit", do: { verb: "condition", state: v.state },
      ...(Number(v.rounds) > 0 ? { for: { duration: "rounds", amount: Number(v.rounds) } } : {}),
      resist: resistOf(v.ability) }, limitGates(v)),
    read: c => c.do?.verb === "condition" && c.resist && HIT_CONDITION_CHOICES.some(o => o.key === c.do.state) && readLimits(c.if)
      ? { ability: abilityOfResist(c.resist), state: c.do.state, rounds: c.for?.duration === "rounds" ? Number(c.for.amount) : "", ...readLimits(c.if) } : null,
    say: v => `target ${v.ability.toUpperCase()} save or ${conditionByKey(v.state)?.label}${Number(v.rounds) > 0 ? ` for ${v.rounds} round(s)` : ""}` },
  { id: "hit-save-kill", when: "attack-hit", scope: "attack", label: "Target saves or dies",
    fields: [{ key: "ability", kind: "select", label: "Save", choices: SAVE_CHOICES, default: "con" },
             { key: "pcs", kind: "select", label: "Who", choices: PCS_CHOICES, default: "any" },
             { key: "bio", kind: "check", label: "Biological targets only", default: false }],
    slots: [],
    build: v => withIf({ when: "attack-hit", do: { verb: "kill" }, resist: resistOf(v.ability) }, limitGates(v)),
    read: c => c.do?.verb === "kill" && Object.keys(c.do).length === 1 && c.resist && readLimits(c.if)
      ? { ability: abilityOfResist(c.resist), ...readLimits(c.if) } : null,
    say: v => `target ${v.ability.toUpperCase()} save or dies` },
  { id: "hit-ability-damage", when: "attack-hit", scope: "attack", label: "Ability damage",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "str" },
             { key: "dice", kind: "dice", label: "Dice", default: "1d4" },
             { key: "bio", kind: "check", label: "Biological targets only", default: false }],
    slots: [],
    build: v => withIf({ when: "attack-hit", do: { verb: "ability-damage", ability: v.ability, dice: v.dice } }, v.bio ? [bioGate] : []),
    read: c => c.do?.verb === "ability-damage" && !c.resist && (!c.if || (c.if.length === 1 && sameJSON(c.if[0], bioGate)))
      ? { ability: c.do.ability, dice: c.do.dice, bio: !!c.if } : null,
    say: v => `${v.dice} ${v.ability.toUpperCase()} damage${v.bio ? " to biological targets" : ""}` },
  { id: "hit-armour-loss", when: "attack-hit", scope: "attack", label: "Strip the target's armour",
    fields: [{ key: "amount", kind: "number", label: "AV lost", default: 1 }], slots: [],
    build: v => ({ when: "attack-hit", do: { verb: "modify", stat: "armour-damage", amount: signed(v.amount) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "armour-damage" && !c.do.instead && !c.if ? { amount: unsign(c.do.amount) } : null,
    say: v => `target loses ${v.amount} AV` },
  { id: "hit-target-av", when: "attack-hit", scope: "attack", label: "Target gains AV (each hit)",
    fields: [{ key: "amount", kind: "number", label: "AV gained", default: 1 }], slots: [],
    build: v => ({ when: "attack-hit", do: { verb: "modify", stat: "av", amount: signed(v.amount) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "av" && !c.if ? { amount: unsign(c.do.amount) } : null,
    say: v => `target gains ${signed(v.amount)} AV` },
  { id: "hit-av-band", when: "attack-hit", scope: "attack", label: "Extra damage dice against an AV band",
    fields: [{ key: "dice", kind: "number", label: "Extra dice", default: 1 },
             { key: "band", kind: "select", label: "When the target's", choices: BAND_CHOICES, default: "atMost" },
             { key: "av", kind: "number", label: "AV", default: 13 }],
    slots: [],
    build: v => ({ when: "attack-hit", if: [{ gate: "target-av", is: { [v.band]: Number(v.av) } }], do: { verb: "modify", stat: "damage-dice", amount: signed(v.dice) } }),
    read: c =>
    {
      if (c.do?.verb !== "modify" || c.do.stat !== "damage-dice" || c.if?.length !== 1 || c.if[0].gate !== "target-av") return null;
      const band = Object.keys(c.if[0].is ?? {})[0];
      return BAND_CHOICES.some(o => o.key === band) ? { dice: unsign(c.do.amount), band, av: c.if[0].is[band] } : null;
    },
    say: v => `${signed(v.dice)} damage dice against AV ${v.band === "atMost" ? "at most" : "at least"} ${v.av}` },
  { id: "hit-ability-to-damage", when: "attack-hit", scope: "attack", label: "Add an ability to damage",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "ego" }], slots: [],
    build: v => ({ when: "attack-hit", do: { verb: "modify", stat: "damage", amount: `+@${v.ability}` } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "damage" && /^\+@[a-z]{3}$/.test(String(c.do.amount)) && !c.if ? { ability: String(c.do.amount).slice(2) } : null,
    say: v => `adds ${v.ability.toUpperCase()} to damage` },
  { id: "hit-heal-half", when: "attack-hit", scope: "attack", label: "Wielder heals half the damage dealt",
    fields: [{ key: "bio", kind: "check", label: "Biological targets only", default: true }], slots: [],
    build: v => withIf({ when: "attack-hit", target: "self", do: { verb: "heal", amount: "half-dealt" } }, v.bio ? [bioGate] : []),
    read: c => c.do?.verb === "heal" && c.do.amount === "half-dealt" && (!c.if || (c.if.length === 1 && sameJSON(c.if[0], bioGate))) ? { bio: !!c.if } : null,
    say: v => `wielder heals half the damage dealt${v.bio ? " to biological targets" : ""}` },
  { id: "hit-note", when: "attack-hit", scope: "attack", label: "A note after the attack", fields: [], slots: ["label"],
    build: () => ({ when: "attack-hit", do: { verb: "reminder" } }),
    read: c => c.do?.verb === "reminder" && !c.if ? {} : null,
    say: () => "a note" },

  /* ---- WEAPONS: what its damage is (a live stat, read on every hit) ---- */
  { id: "stat-property", when: "stat", scope: "weapon", label: "Add a damage property",
    fields: [{ key: "property", kind: "select", label: "Property", choices: PROPERTY_CHOICES, default: "flame" }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "damage-types", amount: `+${v.property}` } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "damage-types" && !c.baked && PROPERTY_CHOICES.some(o => `+${o.key}` === c.do.amount)
      ? { property: String(c.do.amount).slice(1) } : null,
    say: v => `${v.property} damage` },


  /* ---- STATS: what the Item is (Stats as Sentences chunk 2e-i, RULED 2026-10-07) - each read by statOf ---- */
  { id: "stat-usage-die", when: "stat", scope: "any", label: "Give it a usage die",
    fields: [{ key: "die", kind: "select", label: "Usage die", choices: USAGE_DIE_CHOICES, default: "d8" }], slots: [],
    build: v => ({ when: "stat", do: { verb: "usage-die", die: v.die } }),
    read: c => c.do?.verb === "usage-die" && Object.keys(c.do).length === 2 && !c.if && USAGE_DIE_CHOICES.some(o => o.key === c.do.die) ? { die: c.do.die } : null,
    say: v => `usage die Ud${String(v.die).slice(1)}` },
  { id: "stat-slots", when: "stat", scope: "any", label: "Set its slots",
    fields: [{ key: "slots", kind: "number", label: "Slots", default: 1 }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "slots", amount: `=${Number(v.slots)}` } }),
    read: c => isStatMod(c, "slots") && /^=-?[\d.]+$/.test(c.do.amount) ? { slots: Number(c.do.amount.slice(1)) } : null,
    say: v => `${v.slots} slot${Number(v.slots) === 1 ? "" : "s"}` },
  { id: "stat-trade", when: "stat", scope: "any", label: "Multiply its trade value",
    fields: [{ key: "times", kind: "number", label: "Times", default: 2 }, { key: "buyer", kind: "text", label: "Only to (blank for anyone)", default: "" }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "trade-value", amount: `x${Number(v.times)}`, ...(v.buyer ? { to: v.buyer } : {}) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "trade-value" && /^x[\d.]+$/.test(c.do.amount) && !c.if
      && Object.keys(c.do).every(k => ["verb", "stat", "amount", "to"].includes(k)) ? { times: Number(c.do.amount.slice(1)), buyer: c.do.to ?? "" } : null,
    say: v => `trade value x${v.times}${v.buyer ? ` to ${v.buyer}` : ""}` },
  { id: "stat-metal", when: "stat", scope: "any", label: "Make it metal, or not",
    fields: [{ key: "metal", kind: "select", label: "It is", choices: METAL_CHOICES, default: "true" }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "metal", amount: `=${v.metal}` } }),
    read: c => isStatMod(c, "metal") && ["=true", "=false"].includes(c.do.amount) ? { metal: c.do.amount.slice(1) } : null,
    say: v => v.metal === "true" ? "metal" : "not metal" },
  { id: "stat-damage-set", when: "stat", scope: "weapon", label: "Set its damage dice",
    fields: [{ key: "dice", kind: "dice", label: "Damage", default: "1d8" }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "damage-dice", amount: `=${v.dice}` } }),
    read: c => isStatMod(c, "damage-dice") && /^=/.test(c.do.amount) ? { dice: c.do.amount.slice(1) } : null,
    say: v => `damage ${v.dice}` },
  { id: "stat-damage-more", when: "stat", scope: "weapon", label: "More (or fewer) damage dice",
    fields: [{ key: "dice", kind: "number", label: "Dice", default: 1 }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "damage-dice", amount: signed(v.dice) } }),
    read: c => isStatMod(c, "damage-dice") && /^[+-]\d+$/.test(c.do.amount) ? { dice: unsign(c.do.amount) } : null,
    say: v => `${signed(v.dice)} damage dice` },
  { id: "stat-damage-times", when: "stat", scope: "weapon", label: "Multiply its damage dice",
    fields: [{ key: "times", kind: "number", label: "Times", default: 2 }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "damage-dice", amount: `x${Number(v.times)}` } }),
    read: c => isStatMod(c, "damage-dice") && /^x\d+$/.test(c.do.amount) ? { times: Number(c.do.amount.slice(1)) } : null,
    say: v => `damage dice x${v.times}` },
  { id: "stat-hands", when: "stat", scope: "holdable", label: "Set the hands it takes",
    fields: [{ key: "hands", kind: "number", label: "Hands", default: 2 }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "hands", amount: `=${Number(v.hands)}` } }),
    read: c => isStatMod(c, "hands") && /^=\d+$/.test(c.do.amount) ? { hands: Number(c.do.amount.slice(1)) } : null,
    say: v => `takes ${v.hands} hand${Number(v.hands) === 1 ? "" : "s"}` },
  { id: "stat-armour-av", when: "stat", scope: "armor", label: "Change its own AV bonus",
    fields: [{ key: "amount", kind: "number", label: "AV", default: 1 }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "av", amount: signed(v.amount) } }),
    read: c => isStatMod(c, "av") && /^[+-]\d+$/.test(c.do.amount) ? { amount: unsign(c.do.amount) } : null,
    say: v => `${signed(v.amount)} AV bonus` },
  { id: "stat-armour-slot", when: "stat", scope: "armor", label: "Set where it is worn",
    fields: [{ key: "slot", kind: "select", label: "Worn as", choices: ARMOUR_SLOT_CHOICES, default: "helm" }], slots: [],
    build: v => ({ when: "stat", do: { verb: "modify", stat: "armour-slot", amount: `=${v.slot}` } }),
    read: c => isStatMod(c, "armour-slot") && ARMOUR_SLOT_CHOICES.some(o => `=${o.key}` === c.do.amount) ? { slot: c.do.amount.slice(1) } : null,
    say: v => `worn as ${ARMOUR_SLOT_CHOICES.find(o => o.key === v.slot)?.label ?? v.slot}` },

  /* ---- WEAPONS: the attack roll (Weapon Tags chunk 4 readers) ---- */
  { id: "roll-to-hit", when: "attack-roll", scope: "attack", label: "Roll to hit with an ability",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "psy" }], slots: [],
    build: v => ({ when: "attack-roll", do: { verb: "modify", stat: "to-hit-ability", amount: v.ability } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "to-hit-ability" && !c.if ? { ability: c.do.amount } : null,
    say: v => `rolls to hit with ${v.ability.toUpperCase()}` },
  { id: "roll-ignore-armour", when: "attack-roll", scope: "attack", label: "Hit as though the target were unarmoured", fields: [], slots: [],
    build: () => ({ when: "attack-roll", do: { verb: "ignore-armour" } }),
    read: c => c.do?.verb === "ignore-armour" && !c.if ? {} : null,
    say: () => "ignores armour" },
  { id: "roll-break", when: "attack-roll", scope: "weapon", label: "Breaks on a low natural roll",
    fields: [{ key: "atMost", kind: "number", label: "On a natural roll of at most", default: 1 },
             { key: "state", kind: "select", label: "Then it", choices: BREAK_CHOICES, default: "broken" }],
    slots: [],
    build: v => ({ when: "attack-roll", if: [{ gate: "natural-roll", is: Number(v.atMost) === 1 ? { equals: 1 } : { atMost: Number(v.atMost) } }],
                   target: "this-item", do: { verb: "item-state", state: v.state, by: "break" } }),
    read: c =>
    {
      if (c.do?.verb !== "item-state" || c.do.by !== "break" || c.if?.length !== 1 || c.if[0].gate !== "natural-roll") return null;
      const n = c.if[0].is?.equals ?? c.if[0].is?.atMost;
      return BREAK_CHOICES.some(o => o.key === c.do.state) ? { atMost: n, state: c.do.state } : null;
    },
    say: v => `${v.state === "broken" ? "breaks" : "is destroyed"} on a natural ${Number(v.atMost) === 1 ? "1" : `1-${v.atMost}`}` },
  { id: "roll-forbid", when: "attack-roll", scope: "attack", label: "Cannot attack underwater",
    fields: [{ key: "gate", kind: "select", label: "Forbid", choices: FORBID_ATTACK_CHOICES, default: "underwater" }], slots: [],
    build: v => ({ when: "attack-roll", if: [{ gate: v.gate }], do: { verb: "forbid", what: "attack" } }),
    read: c => c.do?.verb === "forbid" && c.do.what === "attack" && c.if?.length === 1 && FORBID_ATTACK_CHOICES.some(o => o.key === c.if[0].gate)
      && Object.keys(c.if[0]).length === 1 ? { gate: c.if[0].gate } : null,
    say: v => FORBID_ATTACK_CHOICES.find(o => o.key === v.gate)?.label.toLowerCase() },

  /* ---- WEAPONS: misses, kills, drawing, equipping (chunks 4 and 5a) ---- */
  { id: "missed-reflect", when: "when-missed", scope: "attack", label: "A miss against the wielder strikes the attacker", fields: [], slots: [],
    build: () => ({ when: "when-missed", target: "attacker", do: { verb: "reflect" } }),
    read: c => c.do?.verb === "reflect" && !c.if ? {} : null,
    say: () => "misses against the wielder strike the attacker" },
  { id: "kill-heal", when: "on-kill", scope: "attack", label: "A kill heals the wielder the victim's max HP",
    fields: [{ key: "bio", kind: "check", label: "Biological victims only", default: true }], slots: [],
    build: v => withIf({ when: "on-kill", target: "self", do: { verb: "heal", amount: "victim-max-hp" } }, v.bio ? [bioGate] : []),
    read: c => c.do?.verb === "heal" && c.do.amount === "victim-max-hp" && (!c.if || (c.if.length === 1 && sameJSON(c.if[0], bioGate))) ? { bio: !!c.if } : null,
    say: v => `a kill${v.bio ? " of a biological creature" : ""} heals the wielder its max HP` },
  { id: "draw-max-hp", when: "on-draw", scope: "weapon", label: "Drawing it costs max HP",
    fields: [{ key: "amount", kind: "number", label: "Max HP lost", default: 1 }], slots: [],
    build: v => ({ when: "on-draw", target: "self", do: { verb: "max-hp", amount: signed(-Math.abs(Number(v.amount) || 0)) } }),
    read: c => c.do?.verb === "max-hp" && !c.if ? { amount: Math.abs(unsign(c.do.amount)) } : null,
    say: v => `drawing it costs ${v.amount} max HP` },
  { id: "equip-locked", when: "passive", scope: "weapon", label: "Cannot be unequipped", fields: [], slots: [],
    build: () => ({ when: "passive", do: { verb: "forbid", what: "unequip" } }),
    read: c => c.do?.verb === "forbid" && c.do.what === "unequip" && !c.if ? {} : null,
    say: () => "cannot be unequipped" },
  { id: "equip-str", when: "passive", scope: "weapon", label: "Needs a minimum STR to equip",
    fields: [{ key: "str", kind: "number", label: "Minimum STR", default: 3 }], slots: [],
    build: v => ({ when: "passive", if: [{ gate: "ability-threshold", is: { ability: "str", below: Number(v.str) } }], do: { verb: "forbid", what: "equip" } }),
    read: c => c.do?.verb === "forbid" && c.do.what === "equip" && c.if?.length === 1 && c.if[0].gate === "ability-threshold"
      && c.if[0].is?.ability === "str" && c.if[0].is?.below !== undefined ? { str: c.if[0].is.below } : null,
    say: v => `needs STR +${v.str} to equip` },

  /* ---- RANGED WEAPONS: the ammo die (chunk 5c) ---- */
  { id: "ammo-no-reload", when: "passive", scope: "ranged", label: "Never needs reloading", fields: [], slots: [],
    build: () => ({ when: "passive", do: { verb: "forbid", what: "deplete-ammo" } }),
    read: c => c.do?.verb === "forbid" && c.do.what === "deplete-ammo" && !c.if ? {} : null,
    say: () => "its ammo die is never rolled down" },
  { id: "ammo-feed", when: "on-rest", scope: "ranged", label: "Fed a food ration at a rest", fields: [], slots: [],
    build: () => ({ when: "on-rest", do: { verb: "refill", what: "ammo", steps: 1 }, cost: { kind: "item", item: "Food Ration" } }),
    read: c => c.do?.verb === "refill" && c.do.what === "ammo" && !c.if ? {} : null,
    say: () => "fed a food ration at a rest, its ammo die steps up" }
];

/* ---------------- Gift presets: one shape with the Gift tab ---------------- */

/**
 * The Gift tab's sentence (giftEffectSentence) without the label and text,
 * which are the builder's common slots. The HP cost of the chosen die, the
 * die + PSY roll and a condition's "until the Referee ends it" are the
 * preset's own (Mystic Gifts, ruled 2026-09-29).
 */
function giftCore(entry)
{
  const { label, text, ...core } = normalise(giftEffectSentence({ ...entry, text: "x" }));
  return core;
}

const isGiftCost = c => c.cost?.length === 1 && c.cost[0].kind === GIFT_COST.kind && c.cost[0].die === GIFT_COST.die;

function giftRead(core, kind, pick)
{
  if (core.if || !isGiftCost(core)) return null;
  const d = core.do ?? {};
  let e = null;
  if (kind === "damage" && d.verb === "damage" && d.dice === GIFT_ROLL && d.type && !core.for) e = { damageType: d.type };
  else if (kind === "healing" && d.verb === "heal" && d.amount === GIFT_ROLL && !core.for) e = {};
  else if (kind === "prose" && d.verb === "reminder" && !d.name && !core.for) e = {};
  else if (kind === "condition" && core.for?.duration === "until-referee")
  {
    if (d.verb === "condition" && conditionByKey(d.state) && !d.name) e = { condition: d.state, effectName: "" };
    else if (d.verb === "condition" && d.name) e = { condition: "", effectName: d.name };
    else if (d.verb === "reminder" && d.name) e = { condition: "", effectName: d.name };
  }
  return e ? pick(e) : null;
}

/* ---------------- Which recipes an Item gets ---------------- */

export const WHEN_LABELS = {
  "use": "When used (the Use control)",
  "passive": "Always, while in its state",
  "on-reaction-roll": "On a reaction roll",
  "attack-hit": "When an attack hits (its own, or the bearer's)",
  "stat": "Its stats (damage, slots, value, a usage die...)",
  "attack-roll": "When an attack is rolled (its own, or the bearer's)",
  "when-missed": "When an attack misses the bearer",
  "on-kill": "When the bearer kills",
  "on-draw": "When it is drawn (equipped)",
  "on-rest": "At a rest"
};

export function inScope(recipe, itemType)
{
  switch (recipe.scope)
  {
    case "any": return true;
    case "not-gift": return itemType !== "gift";
    case "gift": return itemType === "gift";
    case "weapon": return WEAPON_TYPES.includes(itemType);
    case "ranged": return itemType === "weaponRanged";
    case "armor": return itemType === "armor";
    // A weapon, or a carried kind a GM may make equippable (2e-ii).
    case "holdable": return WEAPON_TYPES.includes(itemType) || itemStateDefault(itemType) === "carried";
    // What body.js bodySentences reads (Widening chunk 1).
    case "body": return BODY_TYPES.has(itemType);
    // A weapon (its own attack) or a body kind (every attack the bearer makes) - Widening chunk 2, ruling 1.
    case "attack": return WEAPON_TYPES.includes(itemType) || BODY_TYPES.has(itemType);
    default: return false;
  }
}

export function recipesFor(itemType)
{
  return RECIPES.filter(r => inScope(r, itemType));
}

export function recipeById(id)
{
  return RECIPES.find(r => r.id === id) ?? null;
}

/** The When choices an Item type gets, in table order, each with its label. */
export function whensFor(itemType)
{
  const seen = [];
  for (const r of recipesFor(itemType)) if (!seen.includes(r.when)) seen.push(r.when);
  return seen.map(w => opt(w, WHEN_LABELS[w] ?? w));
}

/* ---------------- The common slots ---------------- */

/** The item states a passive sentence may name on this type (Matt: installed / equipped / carried). */
export function stateChoices(itemType)
{
  const def = itemStateDefault(itemType);
  const out = [];
  if (def === "installed") out.push(opt("installed", "Installed (part of the body)"));
  // A carried kind may be equipped since Stats as Sentences chunk 2e-ii (RULED 2026-10-07).
  if (WEAPON_TYPES.includes(itemType) || itemType === "armor" || def === "carried") out.push(opt("equipped", "Equipped (worn or in hand)"));
  out.push(opt("carried", "Carried (anywhere on the bearer)"));
  return out;
}

export const TARGET_CHOICES = [opt("", "Nobody named (the table decides)"), opt("self", "The user"),
  opt("one-target", "One targeted creature"), opt("up-to-n", "Up to N targeted creatures"),
  // Widening chunk 1: every creature targeted (the interpreter's all-in-range).
  opt("all-in-range", "Every targeted creature")];
export const DURATION_CHOICES = [opt("rounds", "Rounds"), opt("turns", "Exploration Turns"), opt("hours", "Hours"), opt("days", "Days"),
  opt("until-referee", "Until the Referee ends it"),
  // Widening chunk 1: ended by the combat's end (clockFor) - the direct path only;
  // a resisted condition's card carries no combat clock, so not with a save.
  opt("until-combat-ends", "Until the combat ends")];
/** Only with a save on the use (slot duration-saved): the target saves on its turn to end it. */
export const UNTIL_SAVED_CHOICE = opt("until-saved", "Until the target saves to end it");
export const COST_DIE_CHOICES = ["1d4", "1d6", "1d8", "1d10", "1d12", "1d20"].map(d => opt(d, `${d} HP`));
/** A Gift's cost: the die chosen when it is used (its dialog asks), rolled as @cost (Gift Effect Library chunk 1). */
export const CHOSEN_DIE_CHOICE = opt("chosen", "The die chosen when it is used (a Gift)");
export function costDieChoices(itemType)
{
  return itemType === "gift" ? [CHOSEN_DIE_CHOICE, ...COST_DIE_CHOICES] : COST_DIE_CHOICES;
}
/**
 * The cost kinds the interpreter pays (interpret.js HANDLED.costs), each
 * offered where its reader acts (Widening chunk 1): HP anywhere; a daily pool
 * where the sheet sets and refreshes one; a usage-die step where the Item has
 * the die; consumed (the Item goes) on a carried or equipped kind. A charge
 * is an Exotica's shape (the Item goes at none, set at generation, no sheet
 * field) and is not offered.
 */
export const COST_KIND_CHOICES = [opt("", "No cost"), opt("hp", "HP (a die)"), opt("per-day", "One use from a daily pool"),
  opt("usage-die-step", "Roll its usage die"), opt("consumed", "Used up (the Item is removed)")];
export function costKindChoices(itemType)
{
  return COST_KIND_CHOICES.filter(o => o.key !== "per-day" || POOL_TYPES.includes(itemType))
    .filter(o => o.key !== "usage-die-step" || USAGE_DIE_TYPES.includes(itemType))
    .filter(o => o.key !== "consumed" || itemStateDefault(itemType) !== "installed");
}
/** The durations a recipe's duration slot offers. */
export function durationChoices(recipe)
{
  const list = recipe?.slots.includes("duration-saved") ? [...DURATION_CHOICES.filter(o => o.key !== "until-combat-ends"), UNTIL_SAVED_CHOICE] : DURATION_CHOICES;
  return list;
}

/**
 * The conditions a slot accepts: `value` is the extra the GM gives (a creature
 * type, a state, a weather...). Use: any gate the interpreter settles - about
 * the user or the moment, or about each target. Passive: only gates settled
 * without asking anyone (activePassives: computed, or a remembered standing
 * answer, else the default).
 */
const G = (gate, value = null) => ({ gate, value, label: GATES[gate]?.label ?? gate });
export const USE_GATES = [
  G("in-combat"), G("chance", "chance"), G("daylight"), G("weather", "text"), G("terrain", "text"),
  G("darkness"), G("sneaking"), G("moved"), G("asleep"), G("charging"), G("underwater"),
  G("creature-type", "creature-type"), G("is-pc"), G("has-state", "state"), G("wears-metal-armour"),
  G("warm-blooded"), G("has-eyes"), G("has-brain"), G("submerged"), G("target-is-object")
];
export const PASSIVE_GATES = [G("in-combat"), G("daylight"), G("weather", "text"), G("terrain", "text")];
export const CREATURE_TYPE_CHOICES = CREATURE_TYPE_KEYS.map(k => opt(k, title(k)));
export const STATE_GATE_CHOICES = CONDITIONS.map(c => opt(c.key, c.label));

export function gatesFor(recipe)
{
  if (recipe.slots.includes("gates-use")) return USE_GATES;
  if (recipe.slots.includes("gates-passive")) return PASSIVE_GATES;
  return [];
}

/** One condition row as the dialog holds it -> the stored gate. */
export function gateFromRow(row)
{
  const g = { gate: row.gate };
  const def = USE_GATES.find(x => x.gate === row.gate);
  if (def?.value === "creature-type" || def?.value === "state" || def?.value === "text") { if (row.value) g.is = row.value; }
  else if (def?.value === "chance") g.is = { in: Number(row.in) || 1, of: Number(row.of) || 6 };
  if (row.not && g.is === undefined) g.is = false;
  return g;
}

/** A stored gate -> the dialog's row, or null when the builder cannot show it. */
export function rowFromGate(g, allowed)
{
  const def = allowed.find(x => x.gate === g?.gate);
  if (!def) return null;
  const keys = Object.keys(g).filter(k => k !== "gate" && k !== "is");
  if (keys.length) return null;
  if (def.value === "chance") return g.is && typeof g.is === "object" ? { gate: g.gate, in: g.is.in, of: g.is.of, not: false } : null;
  if (def.value) return typeof g.is === "string" ? { gate: g.gate, value: g.is, not: false } : (g.is === undefined ? { gate: g.gate, value: "", not: false } : null);
  if (g.is === false) return { gate: g.gate, not: true };
  return g.is === undefined ? { gate: g.gate, not: false } : null;
}

/**
 * The whole sentence from the dialog: the recipe's core plus the common slots
 * it takes. `common`: { gates: [rows], target, n, duration, amount, costDie,
 * state, label, text, section, polarity }.
 */
export function assemble(recipe, values, common = {}, itemType = null)
{
  const s = { ...recipe.build(values) };
  const has = slot => recipe.slots.includes(slot);
  const rows = (common.gates ?? []).filter(r => r?.gate);
  if (rows.length && (has("gates-use") || has("gates-passive"))) s.if = [...(s.if ?? []), ...rows.map(gateFromRow)];
  if (has("target") && common.target) s.target = common.target === "up-to-n" ? { who: "up-to-n", n: Number(common.n) || 2 } : common.target;
  if ((has("duration") || has("duration-optional") || has("duration-until-referee")) && common.duration)
  {
    if (common.duration === "until-referee" || common.duration === "until-combat-ends") s.for = common.duration;
    // Until saved (duration-saved): the save that ends it is the recipe's own resist.
    else if (common.duration === "until-saved" && has("duration-saved"))
      s.for = { duration: "until-saved", ability: abilityOfResist(s.resist) ?? "con", by: common.escapeBy || "shake it off" };
    else if (common.duration !== "until-saved") s.for = { duration: common.duration, amount: Number(common.amount) || 1 };
  }
  // The cost slot (Widening chunk 1): one of the kinds the interpreter pays.
  if (has("cost") && common.cost)
  {
    if (common.cost === "hp") s.cost = { kind: "hp", die: common.costDie || "1d6", ...(common.costDie === "chosen" && common.costBy ? { by: common.costBy } : {}) };
    else if (common.cost === "per-day") s.cost = { kind: "per-day", n: common.costN === "@level" ? "@level" : (Number(common.costN) || 1) };
    else s.cost = { kind: common.cost };
  }
  if (has("state") && common.state && common.state !== itemStateDefault(itemType)) s.state = common.state;
  if (common.label && (has("label") || has("tab"))) s.label = common.label;
  if (common.text) s.text = common.text;
  if (has("tab") && (common.section || common.polarity)) s.tab = { section: common.section || "Always Active", polarity: common.polarity || "Benefit" };
  return s;
}

/** Split a stored sentence into what the dialog shows, or null when the builder cannot edit it. */
export function disassemble(sentence, itemType)
{
  const n = normalise(sentence);
  if (!n || n.tag || n.baked || n.then || n.choice || n.alternate || n.count || n.delay || n.mode || n.id) return null;
  for (const recipe of recipesFor(itemType))
  {
    if ((n.when?.trigger) !== recipe.when) continue;
    const allowed = gatesFor(recipe);
    // The recipe's own gates are its core; any others must be common rows.
    const core = { when: recipe.when };
    for (const k of ["do", "resist", "requires", "cost", "for", "target"]) if (n[k] !== undefined) core[k] = n[k];
    const tryRead = (coreIf, extraIf) =>
    {
      const c = { ...core, ...(coreIf.length ? { if: coreIf } : {}) };
      const commonKeys = { target: recipe.slots.includes("target"), for: recipe.slots.some(x => x.startsWith("duration")), cost: recipe.slots.includes("cost") };
      for (const k of Object.keys(commonKeys)) if (commonKeys[k]) delete c[k];
      const values = recipe.read(c);
      if (!values) return null;
      const rows = extraIf.map(g => rowFromGate(g, allowed));
      if (rows.some(r => !r)) return null;
      const common = commonOf(n, recipe, rows, itemType);
      // A cost the slot does not offer on this type is not this recipe's (a chosen die is a Gift's alone).
      if (commonKeys.cost && common.cost === "hp" && !costDieChoices(itemType).some(o => o.key === common.costDie)) return null;
      if (!sameJSON(normalise(assemble(recipe, values, common, itemType)), n)) return null;
      return { recipe, values, common };
    };
    const ifs = n.if ?? [];
    const found = allowed.length ? tryRead([], ifs) ?? tryRead(ifs, []) : tryRead(ifs, []);
    if (found) return found;
  }
  return null;
}

function commonOf(n, recipe, rows, itemType)
{
  const t = n.target;
  return {
    gates: rows,
    target: t ? t.who : "",
    n: t?.n ?? "",
    duration: n.for ? n.for.duration : "",
    amount: n.for?.amount ?? "",
    escapeBy: n.for?.by ?? "",
    cost: n.cost?.[0]?.kind ?? "",
    costDie: n.cost?.find(c => c.kind === "hp")?.die ?? "",
    costBy: n.cost?.find(c => c.kind === "hp")?.by ?? "",
    costN: n.cost?.find(c => c.kind === "per-day")?.n ?? "",
    state: n.state ?? itemStateDefault(itemType),
    label: n.label ?? "",
    text: n.text ?? "",
    section: n.tab?.section ?? "",
    polarity: n.tab?.polarity ?? ""
  };
}

/* ---------------- The sentence as the tab says it ---------------- */

const WHEN_PREFIX = {
  "use": "Use", "passive": "While {state}", "on-reaction-roll": "Reaction rolls", "attack-hit": "On a hit", "stat": "Stat",
  "attack-roll": "Attack roll", "when-missed": "When missed", "on-kill": "On a kill", "on-draw": "When drawn", "on-rest": "At a rest"
};

const NOTE_RECIPES = new Set(["use-reminder", "passive-note", "hit-note", "gift-prose"]);

/** One line for the tab: "While equipped: +1 AV", or the stored text when the builder cannot read it. */
export function summarise(sentence, itemType)
{
  const n = normalise(sentence);
  const plain = t => String(t ?? "").replace(/<[^>]*>/g, "").trim();
  let parts = disassemble(n, itemType);
  // A tag's row (or another the builder will not edit) is still said in the
  // builder's words when its shape is one of the table's - Flaming's property
  // reads "Damage: flame damage", not its stored verb - and stays read-only.
  let editable = !!parts;
  if (!parts && n?.tag && !n.baked) { const { tag, ...rest } = n; parts = disassemble(rest, itemType); }
  if (!parts) return { line: plain(n?.text) || `${n?.when?.trigger ?? "?"}: ${n?.do?.verb ?? "effect"}`, editable: false };
  const { recipe, values, common } = parts;
  const has = slot => recipe.slots.includes(slot);
  const prefix = (WHEN_PREFIX[recipe.when] ?? recipe.when).replace("{state}", common.state || itemStateDefault(itemType));
  // A gate's label without its explanation in brackets (darkness's "asked per roll ...").
  const gates = (common.gates ?? []).map(r => `${r.not ? "not " : ""}${(GATES[r.gate]?.label ?? r.gate).replace(/\s*\(.*\)\s*$/, "")}${r.value ? ` ${r.value}` : ""}`);
  const extra = [];
  // Only the slots the recipe takes: a hit save's rounds are already in its own words.
  if (has("target") && common.target)
    extra.push(common.target === "up-to-n" ? `up to ${common.n || "N"} targeted creatures` : TARGET_CHOICES.find(o => o.key === common.target)?.label.toLowerCase());
  if ((has("duration") || has("duration-optional") || has("duration-until-referee")) && common.duration)
    extra.push(common.duration === "until-referee" ? "until the Referee ends it"
      : common.duration === "until-combat-ends" ? "until the combat ends"
      : common.duration === "until-saved" ? `until the target saves to ${common.escapeBy || "shake it off"}`
      : `for ${common.amount} ${common.duration}`);
  if (has("cost") && common.cost)
    extra.push(common.cost === "hp" ? (common.costDie === "chosen" ? `costs the die chosen when used${common.costBy ? ", priced by " + (common.costBy === "held-time" ? "how long it has been held" : common.costBy) : ""}` : `costs ${common.costDie} HP`) : common.cost === "per-day" ? `one use a day${common.costN === "@level" ? " per Level" : Number(common.costN) > 1 ? ` of ${common.costN}` : ""}`
      : common.cost === "usage-die-step" ? "rolls its usage die" : "used up");
  // A note is its words: say them, or the row reads only "a note".
  const said = NOTE_RECIPES.has(recipe.id) && common.text ? `${recipe.say(values)}: ${plain(common.text)}` : recipe.say(values);
  const what = common.label && recipe.slots.includes("label") ? `${common.label} - ${said}` : said;
  const line = `${prefix}: ${what}${extra.length ? ` (${extra.join(", ")})` : ""}${gates.length ? ` - if ${gates.join(" and ")}` : ""}`;
  return { line, editable };
}
