/**
 * Suggested effects for a generated Exotica - foundry-system-index.csv
 * "Exotica Generator Items", RULED 2026-10-09 (Matt).
 *
 * NONE OF THIS IS THE BOOK'S. The Exotica Generator (Treasure/Exotica
 * Generator.md) gives four words - a Material, a Form, a Theme and an Action -
 * and nothing else; the table agrees what the thing does. These are the
 * creative pass the Gift suggestions got (gift-effect-suggestions.js): starting
 * points the Effects tab OFFERS on an Exotica the Generate Exotica macro made.
 * Nothing is ever set automatically (the Gift ruling of 2026-09-29): a
 * generated Exotica starts with no effect, and a GM adds one with a click,
 * then changes anything in the builder.
 *
 * Every suggestion is a BUILDER RECIPE with its values (effects/builder-
 * recipes.js), so it is exactly a sentence the GM could have composed, resolved
 * by the engine with no new code - and tools/test-exotica-generator.mjs holds
 * every one of them to that. The dice are a plain d6 (the Advanced table's
 * usual) and no cost: the cost is the GM's, through the builder (RULED
 * 2026-10-09 - a usage die, a daily pool, consumed, HP).
 *
 * TWO LISTS:
 *  - ACTION_SUGGESTIONS: the 100 Actions (99 words - Concealing is rolled
 *    twice). The Action is the word that says what the thing does.
 *  - DAMAGE_TYPE_WORDS: the Materials and Themes that name one of the six
 *    Common Damage Types. A Material or Theme is mostly what the thing is made
 *    of or about; one that names fire or acid also offers damage of that type,
 *    as a Gift's Form does. Every word not listed was left out ON PURPOSE.
 */
import { recipeById, assemble, summarise } from "../effects/builder-recipes.js";

const S = (id, values = {}, common = {}) => ({ id, values, common });
const dmg = (type, label, common = {}) => S("use-damage", { dice: "1d6", type }, { target: "one-target", label, ...common });
const burst = (type, label) => dmg(type, label, { target: "all-in-range" });
const heal = label => S("use-heal", { amount: "1d6" }, { target: "one-target", label });
const saveCond = (state, ability, label) => S("use-save-condition", { ability, state }, { target: "one-target", label });
const cond = (state, name, label = name, common = {}) => S("use-condition", { state, name: name === label ? "" : name }, { target: "one-target", duration: "until-referee", label, ...common });
const selfCond = (state, name, label = name) => cond(state, name, label, { target: "self" });
const lasting = (label, text, common = {}) => S("use-reminder", {}, { duration: "until-referee", label, text, ...common });
const say = (label, text) => S("use-reminder", {}, { label, text });
const stat = (statKey, amount, label, target = "self") => S("use-stat-change", { stat: statKey, amount }, { target, label });
const abil = (ability, label) => S("use-ability-damage", { ability, dice: "1d4" }, { target: "one-target", label });
const move = (how, label) => S("use-forced-move", { how }, { target: "one-target", label });
const reveal = (what, label) => S("use-reveal", { what }, { target: "one-target", label });
const conceal = (what, label) => S("use-conceal", { what }, { label });
const teleport = (to, label, target = "one-target") => S("use-teleport", { to }, { target, label });
const compel = (command, label) => S("use-compel", { command }, { target: "one-target", label });
const attack = (name, dice, type, kind) => S("use-grant-attack", { name, dice, type, kind }, { target: "self", label: name });

export const ACTION_SUGGESTIONS = {
  "Absorbing":      [stat("av", 2, "Absorbs blows"), say("Absorbs", "Absorbs the liquid, light or sound it is held against.")],
  "Armouring":      [stat("av", 2, "Armours the bearer")],
  "Banishing":      [move("flee from the bearer", "Banishes")],
  "Bashing":        [dmg("kinetic", "Bashing blow")],
  "Binding":        [saveCond("entangled", "str", "Binds")],
  "Blinding":       [saveCond("blind", "dex", "Blinds")],
  "Burning":        [dmg("flame", "Burns")],
  "Choking":        [cond("mute", "Choking", "Chokes")],
  "Concealing":     [conceal("the bearer", "Conceals")],
  "Consuming":      [dmg("tox", "Consumes flesh")],
  "Corroding":      [dmg("tox", "Corrodes"), say("Eats metal", "Eats through metal it is held against.")],
  "Countering":     [say("Counters", "Counters one effect, Gift or device the bearer names, for a moment.")],
  "Crushing":       [dmg("kinetic", "Crushes")],
  "Curing":         [heal("Cures"), say("Cures an affliction", "Cures one disease, poison or infection.")],
  "Cushioning":     [S("passive-note", { kind: "reminder" }, { label: "Cushions", text: "The bearer takes no damage from a fall." })],
  "Dazzling":       [saveCond("blind", "dex", "Dazzles")],
  "Deafening":      [lasting("Deafened", "Cannot hear.")],
  "Deflecting":     [stat("av", 1, "Deflects"), S("missed-reflect", {}, { label: "Deflects back" })],
  "Detonating":     [burst("blast", "Detonates")],
  "Disappearing":   [selfCond("invisible", "Invisible", "Disappears")],
  "Disarming":      [move("drop what they hold", "Disarms")],
  "Disguising":     [lasting("Disguised", "Looks like someone or something else.", { target: "self" })],
  "Disintegrating": [dmg("beam", "Disintegrates")],
  "Dividing":       [say("Divides", "Splits one thing cleanly in two.")],
  "Draining":       [dmg("tox", "Drains"), abil("con", "Drains vigour")],
  "Electrifying":   [dmg("electrical", "Electrifies")],
  "Entangling":     [saveCond("entangled", "str", "Entangles")],
  "Excruciating":   [cond("agony", "In Agony", "Excruciates")],
  "Freezing":       [saveCond("entangled", "str", "Freezes in place"), dmg("kinetic", "Frostbite")],
  "Fusing":         [say("Fuses", "Fuses two things it touches into one.")],
  "Grasping":       [cond("held", "Grasped", "Grasps")],
  "Guarding":       [stat("av", 2, "Guards", "one-target")],
  "Haunting":       [cond("hallucinating", "Haunted", "Haunts")],
  "Healing":        [heal("Heals")],
  "Hindering":      [stat("dex", -1, "Hinders", "one-target")],
  "Impaling":       [dmg("kinetic", "Impales")],
  "Imprisoning":    [cond("held", "Imprisoned", "Imprisons")],
  "Infecting":      [dmg("tox", "Infects"), lasting("Infected", "Carries the thing's sickness.", { target: "one-target" })],
  "Inflating":      [cond("floating", "Inflated", "Inflates")],
  "Inverting":      [say("Inverts", "Inverts one thing: up and down, hot and cold, friend and foe.")],
  "Invigorating":   [stat("str", 1, "Invigorates", "one-target"), heal("Invigorates")],
  "Liquefying":     [say("Liquefies", "Liquefies solid matter it touches.")],
  "Mending":        [heal("Mends"), say("Mends an object", "Mends a broken object.")],
  "Nullifying":     [say("Nullifies", "Nullifies one effect, Gift or device for a while.")],
  "Shielding":      [stat("av", 2, "Shields", "one-target")],
  "Teleporting":    [teleport("a place the bearer can see", "Teleports")],
  "Transmuting":    [say("Transmutes", "Transmutes one material into another.")],
  "Warding":        [S("passive-save", { verb: "adv", which: "all" }, { label: "Wards" })],
  "Whispering":     [reveal("a secret about the target", "Whispers")],
  "Withering":      [abil("str", "Withers"), dmg("tox", "Withers")],
  "Abducting":      [teleport("the bearer's side", "Abducts")],
  "Addicting":      [lasting("Addicted", "Craves the thing; suffers without it.", { target: "one-target" })],
  "Adhering":       [saveCond("entangled", "str", "Sticks fast")],
  "Bewildering":    [cond("hallucinating", "Bewildered", "Bewilders")],
  "Blackening":     [conceal("everything within sight, in darkness", "Blackens")],
  "Blossoming":     [heal("Blossoms")],
  "Calming":        [cond("charmed", "Calmed", "Calms")],
  "Charming":       [cond("charmed", "Charmed", "Charms")],
  "Commanding":     [compel("obey one command", "Commands")],
  "Dancing":        [cond("tarantism", "Dancing", "Sets dancing")],
  "Dissolving":     [dmg("tox", "Dissolves")],
  "Distracting":    [lasting("Distracted", "DIS on their next roll.", { target: "one-target", duration: "rounds", amount: 1 })],
  "Dreaming":       [cond("asleep", "Asleep", "Sends to sleep")],
  "Duplicating":    [say("Duplicates", "Makes a copy of one small object.")],
  "Encoding":       [say("Encodes", "Encodes a message only its intended reader can read.")],
  "Enraging":       [cond("hysteria", "Enraged", "Enrages")],
  "Enticing":       [cond("charmed", "Enticed", "Entices")],
  "Evolving":       [say("Evolves", "Evolves the target: one mutation of the Referee's choice.")],
  "Extinguishing":  [say("Extinguishes", "Extinguishes every fire within sight.")],
  "Fixing":         [heal("Fixes"), say("Fixes an object", "Repairs a broken object.")],
  "Flying":         [selfCond("floating", "Flying", "Flies")],
  "Folding":        [teleport("through a fold in space, to a place the bearer knows", "Folds space", "self")],
  "Horrifying":     [cond("hysteria", "Horrified", "Horrifies"), move("flee in terror", "Horrifies")],
  "Hybridising":    [say("Hybridises", "Joins two creatures' traits into one.")],
  "Maddening":      [cond("hallucinating", "Maddened", "Maddens")],
  "Mesmerising":    [cond("charmed", "Mesmerised", "Mesmerises")],
  "Mocking":        [say("Mocks", "Mocks the target with an insult it cannot ignore.")],
  "Pulling":        [move("be pulled to the bearer", "Pulls")],
  "Pulsing":        [burst("blast", "Pulses")],
  "Reflecting":     [S("missed-reflect", {}, { label: "Reflects" })],
  "Repelling":      [move("be pushed away from the bearer", "Repels")],
  "Revealing":      [reveal("level, AV and HP", "Reveals"), reveal("what is hidden nearby", "Reveals the hidden")],
  "Reversing":      [say("Reverses", "Reverses one thing: a fall, a flow, a word spoken.")],
  "Saddening":      [lasting("Saddened", "Weighed down by sorrow.", { target: "one-target" })],
  "Scrying":        [reveal("a distant place the bearer names", "Scries")],
  "Seeking":        [reveal("the way to a thing the bearer names", "Seeks")],
  "Shooting":       [attack("Shot", "1d6", "kinetic", "ranged")],
  "Silencing":      [cond("mute", "Silenced", "Silences")],
  "Slithering":     [S("passive-escape", {}, { label: "Slithers free" })],
  "Soaring":        [selfCond("floating", "Soaring", "Soars")],
  "Sparking":       [dmg("electrical", "Sparks")],
  "Violating":      [abil("ego", "Violates")],
  "Weaving":        [say("Weaves", "Weaves thread, light or lies into a shape.")],
  "Weeping":        [say("Weeps", "Weeps a liquid of its theme's kind.")],
  "Whirling":       [burst("kinetic", "Whirls"), move("be flung aside", "Whirls")],
  "Whistling":      [say("Whistles", "Whistles a call every creature within earshot hears.")],
  "Wrestling":      [cond("held", "Wrestled down", "Wrestles")],
  "Writing":        [say("Writes", "Writes what the bearer wills on any surface.")],
  "Yearning":       [cond("charmed", "Yearning", "Fills with yearning")]
};

/** Materials and Themes that name a damage type: the thing also offers damage of that type. */
export const DAMAGE_TYPE_WORDS = {
  "Magma": "flame", "Flame": "flame", "Fire": "flame", "Plasma": "flame", "Volcanoes": "flame",
  "Acid": "tox", "Poison": "tox",
  "Hard Light": "beam", "Light": "beam", "Beams": "beam",
  "Antimatter": "blast", "Tempests": "electrical",
  "Ice": "kinetic", "Steel": "kinetic", "Obsidian": "kinetic", "Stone": "kinetic"
};

/** The four words a generated Exotica's source carries: "Material / Form / Theme / Action". */
export function exoticaWordsOf(item)
{
  const parts = String(item?.system?.source ?? "").split("/").map(s => s.trim());
  if (parts.length !== 4 || parts.some(p => !p)) return null;
  const [material, form, theme, action] = parts;
  return { material, form, theme, action };
}

/** One suggestion as the sentence the builder would write, with its line and where it came from. */
function sentenceOf(s, from, words)
{
  const recipe = recipeById(s.id);
  if (!recipe) return null;
  const values = { ...Object.fromEntries(recipe.fields.map(f => [f.key, f.default])), ...s.values };
  // The words a card quotes: the suggestion's own line, not the Item's name again (Group 616: "Ochre Carpet Ochre Carpet: binding").
  const common = { text: s.common.text ?? `${s.common.label ?? from}.`, ...s.common };
  const sentence = assemble(recipe, values, common, "exotica");
  return { sentence, summary: summarise(sentence, "exotica").line, from };
}

/** Every suggestion for a generated Exotica: its Action's, then a damage type its Material or Theme names. */
export function exoticaSuggestionsFor(item)
{
  const words = exoticaWordsOf(item);
  if (!words || item?.type !== "exotica") return [];
  const out = [];
  for (const s of ACTION_SUGGESTIONS[words.action] ?? []) { const x = sentenceOf(s, words.action, words); if (x) out.push(x); }
  for (const word of [words.material, words.theme])
  {
    const type = DAMAGE_TYPE_WORDS[word];
    if (!type) continue;
    const x = sentenceOf(dmg(type, `${word} (${type} damage)`), word, words);
    if (x) out.push(x);
  }
  return out.map((s, index) => ({ ...s, index }));
}
