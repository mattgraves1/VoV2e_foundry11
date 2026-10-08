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

export const WEAPON_TYPES = ["weaponMelee", "weaponRanged"];
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
const NOT_OFFERED_STATES = new Set(["berserk", "deprived", "exhaustion", "possessed", "daemon-possessed", "incorporeal"]);
export const USE_CONDITION_CHOICES = [
  ...CONDITIONS.map(c => opt(c.key, c.label)),
  ...STATES.filter(s => !conditionByKey(s.key) && !NOT_OFFERED_STATES.has(s.key)).map(s => opt(s.key, s.label))
];
export const PCS_CHOICES = [opt("any", "Anyone"), opt("pc", "Player characters only"), opt("npc", "Non-player characters only")];
export const SECTION_CHOICES = [opt("Always Active", "Always Active"), opt("On-Demand", "On-Demand")];
export const POLARITY_CHOICES = [opt("Benefit", "Benefit"), opt("Detriment", "Detriment")];
export const NOTE_KIND_CHOICES = [opt("reminder", "Reminder"), opt("adv", "ADV note"), opt("dis", "DIS note")];
export const FORBID_CHOICES = [opt("corrode", "Cannot be corroded"), opt("break", "Cannot break"),
  opt("destroy", "Cannot be destroyed"), opt("use-gift", "Bearer cannot use Mystic Gifts")];
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
const unsign = a => Number(String(a ?? "").replace(/^\+/, ""));
// No `vs`: the save card falls back to the sentence's text (hitSaveSpecs), which the GM writes.
const resistOf = ability => ability === "morale" ? { type: "morale" } : { type: "save", ability };
const abilityOfResist = r => r?.type === "morale" ? "morale" : r?.ability;

/**
 * Field kinds: dice, number, select (with choices), text, check, color.
 * `item: true` on a field: it lives on the Item, not in the sentence
 * (Luminous's colour, flags.vaarn.lightColor, read by emittedLightOf).
 */
export const RECIPES = [
  /* ---- USE, any Item but a Gift: the generic Use control (chunk 1) ---- */
  { id: "use-damage", when: "use", scope: "not-gift", label: "Deal damage",
    fields: [{ key: "dice", kind: "dice", label: "Dice", default: "1d6" }, { key: "type", kind: "select", label: "Type", choices: DAMAGE_TYPE_CHOICES, default: "" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "damage", dice: v.dice, ...(v.type ? { type: v.type } : {}) } }),
    read: c => c.do?.verb === "damage" && !c.if ? { dice: c.do.dice, type: c.do.type ?? "" } : null,
    say: v => `${v.dice}${v.type ? " " + v.type : ""} damage` },
  { id: "use-heal", when: "use", scope: "not-gift", label: "Heal",
    fields: [{ key: "amount", kind: "dice", label: "Amount", default: "1d6" }],
    slots: ["gates-use", "target", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "heal", amount: v.amount } }),
    read: c => c.do?.verb === "heal" && !c.if ? { amount: c.do.amount } : null,
    say: v => `heals ${v.amount}` },
  { id: "use-condition", when: "use", scope: "not-gift", label: "Apply a condition",
    fields: [{ key: "state", kind: "select", label: "Condition", choices: USE_CONDITION_CHOICES, default: "blind" },
             { key: "name", kind: "text", label: "Its wording (optional)", default: "" }],
    slots: ["gates-use", "target", "duration", "cost", "label"],
    build: v => ({ when: "use", do: { verb: "condition", state: v.state, ...(v.name ? { name: v.name } : {}) } }),
    read: c => c.do?.verb === "condition" && !c.if && USE_CONDITION_CHOICES.some(o => o.key === c.do.state) ? { state: c.do.state, name: c.do.name ?? "" } : null,
    say: v => v.name || stateByKey(v.state)?.label || v.state },
  { id: "use-reminder", when: "use", scope: "not-gift", label: "Post a reminder",
    fields: [], slots: ["gates-use", "duration-optional", "cost", "label"],
    build: () => ({ when: "use", do: { verb: "reminder" } }),
    read: c => c.do?.verb === "reminder" && !c.do.name && !c.if ? {} : null,
    say: () => "a reminder" },

  /* ---- USE on a Gift: the Gift tab's four kinds, as presets (Interpreter chunk 4) ---- */
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
  { id: "hit-save-condition", when: "attack-hit", scope: "weapon", label: "Target saves or takes a condition",
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
  { id: "hit-save-kill", when: "attack-hit", scope: "weapon", label: "Target saves or dies",
    fields: [{ key: "ability", kind: "select", label: "Save", choices: SAVE_CHOICES, default: "con" },
             { key: "pcs", kind: "select", label: "Who", choices: PCS_CHOICES, default: "any" },
             { key: "bio", kind: "check", label: "Biological targets only", default: false }],
    slots: [],
    build: v => withIf({ when: "attack-hit", do: { verb: "kill" }, resist: resistOf(v.ability) }, limitGates(v)),
    read: c => c.do?.verb === "kill" && Object.keys(c.do).length === 1 && c.resist && readLimits(c.if)
      ? { ability: abilityOfResist(c.resist), ...readLimits(c.if) } : null,
    say: v => `target ${v.ability.toUpperCase()} save or dies` },
  { id: "hit-ability-damage", when: "attack-hit", scope: "weapon", label: "Ability damage",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "str" },
             { key: "dice", kind: "dice", label: "Dice", default: "1d4" },
             { key: "bio", kind: "check", label: "Biological targets only", default: false }],
    slots: [],
    build: v => withIf({ when: "attack-hit", do: { verb: "ability-damage", ability: v.ability, dice: v.dice } }, v.bio ? [bioGate] : []),
    read: c => c.do?.verb === "ability-damage" && !c.resist && (!c.if || (c.if.length === 1 && sameJSON(c.if[0], bioGate)))
      ? { ability: c.do.ability, dice: c.do.dice, bio: !!c.if } : null,
    say: v => `${v.dice} ${v.ability.toUpperCase()} damage${v.bio ? " to biological targets" : ""}` },
  { id: "hit-armour-loss", when: "attack-hit", scope: "weapon", label: "Strip the target's armour",
    fields: [{ key: "amount", kind: "number", label: "AV lost", default: 1 }], slots: [],
    build: v => ({ when: "attack-hit", do: { verb: "modify", stat: "armour-damage", amount: signed(v.amount) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "armour-damage" && !c.do.instead && !c.if ? { amount: unsign(c.do.amount) } : null,
    say: v => `target loses ${v.amount} AV` },
  { id: "hit-target-av", when: "attack-hit", scope: "weapon", label: "Target gains AV (each hit)",
    fields: [{ key: "amount", kind: "number", label: "AV gained", default: 1 }], slots: [],
    build: v => ({ when: "attack-hit", do: { verb: "modify", stat: "av", amount: signed(v.amount) } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "av" && !c.if ? { amount: unsign(c.do.amount) } : null,
    say: v => `target gains ${signed(v.amount)} AV` },
  { id: "hit-av-band", when: "attack-hit", scope: "weapon", label: "Extra damage dice against an AV band",
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
  { id: "hit-ability-to-damage", when: "attack-hit", scope: "weapon", label: "Add an ability to damage",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "ego" }], slots: [],
    build: v => ({ when: "attack-hit", do: { verb: "modify", stat: "damage", amount: `+@${v.ability}` } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "damage" && /^\+@[a-z]{3}$/.test(String(c.do.amount)) && !c.if ? { ability: String(c.do.amount).slice(2) } : null,
    say: v => `adds ${v.ability.toUpperCase()} to damage` },
  { id: "hit-heal-half", when: "attack-hit", scope: "weapon", label: "Wielder heals half the damage dealt",
    fields: [{ key: "bio", kind: "check", label: "Biological targets only", default: true }], slots: [],
    build: v => withIf({ when: "attack-hit", target: "self", do: { verb: "heal", amount: "half-dealt" } }, v.bio ? [bioGate] : []),
    read: c => c.do?.verb === "heal" && c.do.amount === "half-dealt" && (!c.if || (c.if.length === 1 && sameJSON(c.if[0], bioGate))) ? { bio: !!c.if } : null,
    say: v => `wielder heals half the damage dealt${v.bio ? " to biological targets" : ""}` },
  { id: "hit-note", when: "attack-hit", scope: "weapon", label: "A note after the attack", fields: [], slots: ["label"],
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
  { id: "roll-to-hit", when: "attack-roll", scope: "weapon", label: "Roll to hit with an ability",
    fields: [{ key: "ability", kind: "select", label: "Ability", choices: ABILITY_CHOICES, default: "psy" }], slots: [],
    build: v => ({ when: "attack-roll", do: { verb: "modify", stat: "to-hit-ability", amount: v.ability } }),
    read: c => c.do?.verb === "modify" && c.do.stat === "to-hit-ability" && !c.if ? { ability: c.do.amount } : null,
    say: v => `rolls to hit with ${v.ability.toUpperCase()}` },
  { id: "roll-ignore-armour", when: "attack-roll", scope: "weapon", label: "Hit as though the target were unarmoured", fields: [], slots: [],
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
  { id: "roll-forbid", when: "attack-roll", scope: "weapon", label: "Cannot attack underwater",
    fields: [{ key: "gate", kind: "select", label: "Forbid", choices: FORBID_ATTACK_CHOICES, default: "underwater" }], slots: [],
    build: v => ({ when: "attack-roll", if: [{ gate: v.gate }], do: { verb: "forbid", what: "attack" } }),
    read: c => c.do?.verb === "forbid" && c.do.what === "attack" && c.if?.length === 1 && FORBID_ATTACK_CHOICES.some(o => o.key === c.if[0].gate)
      && Object.keys(c.if[0]).length === 1 ? { gate: c.if[0].gate } : null,
    say: v => FORBID_ATTACK_CHOICES.find(o => o.key === v.gate)?.label.toLowerCase() },

  /* ---- WEAPONS: misses, kills, drawing, equipping (chunks 4 and 5a) ---- */
  { id: "missed-reflect", when: "when-missed", scope: "weapon", label: "A miss against the wielder strikes the attacker", fields: [], slots: [],
    build: () => ({ when: "when-missed", target: "attacker", do: { verb: "reflect" } }),
    read: c => c.do?.verb === "reflect" && !c.if ? {} : null,
    say: () => "misses against the wielder strike the attacker" },
  { id: "kill-heal", when: "on-kill", scope: "weapon", label: "A kill heals the wielder the victim's max HP",
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
  "attack-hit": "When its attack hits",
  "stat": "Its stats (damage, slots, value, a usage die...)",
  "attack-roll": "When its attack is rolled",
  "when-missed": "When an attack misses its wielder",
  "on-kill": "When the wielder kills",
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
  opt("one-target", "One targeted creature"), opt("up-to-n", "Up to N targeted creatures")];
export const DURATION_CHOICES = [opt("rounds", "Rounds"), opt("turns", "Exploration Turns"), opt("hours", "Hours"), opt("days", "Days"),
  opt("until-referee", "Until the Referee ends it")];
export const COST_DIE_CHOICES = [opt("", "No cost"), ...["1d4", "1d6", "1d8", "1d10", "1d12", "1d20"].map(d => opt(d, `${d} HP`))];

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
  if ((has("duration") || has("duration-optional")) && common.duration)
    s.for = common.duration === "until-referee" ? "until-referee" : { duration: common.duration, amount: Number(common.amount) || 1 };
  if (has("cost") && common.costDie) s.cost = { kind: "hp", die: common.costDie };
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
    costDie: n.cost?.find(c => c.kind === "hp")?.die ?? "",
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
  if ((has("duration") || has("duration-optional")) && common.duration)
    extra.push(common.duration === "until-referee" ? "until the Referee ends it" : `for ${common.amount} ${common.duration}`);
  if (has("cost") && common.costDie) extra.push(`costs ${common.costDie} HP`);
  // A note is its words: say them, or the row reads only "a note".
  const said = NOTE_RECIPES.has(recipe.id) && common.text ? `${recipe.say(values)}: ${plain(common.text)}` : recipe.say(values);
  const what = common.label && recipe.slots.includes("label") ? `${common.label} - ${said}` : said;
  const line = `${prefix}: ${what}${extra.length ? ` (${extra.join(", ")})` : ""}${gates.length ? ` - if ${gates.join(" and ")}` : ""}`;
  return { line, editable };
}
