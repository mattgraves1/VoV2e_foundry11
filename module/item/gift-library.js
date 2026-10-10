/**
 * The Gift Effect Library - foundry-system-index.csv "Gift Effect Library",
 * PLAN RULED 2026-10-09 (Matt).
 *
 * THE MAP OF MATT'S PICKS. On 2026-10-03 he marked the 100 candidates of the
 * artifact "Gift Effect Library Candidates" (claude.ai/artifact/
 * 5VhgRfgPduaQSKN29t5Mak, collection picks): 58 yes, 24 later, 18 no. This file
 * is the 58, each with what the engine can do about it TODAY:
 *
 *   ready   - a builder sentence resolves it now: offered in the Library.
 *   formula - needs a size formula (+@psy, @cost+@psy) in a stat change: chunk 2.
 *   state   - a passive effect on a target for a span: the states-for-a-while
 *             mechanism of chunk 3 (an entry that carries sentences).
 *   reader  - an existing path to hook up, or a new reader: chunk 4.
 *
 * Until its chunk lands, a pick that is not ready is listed here and offered
 * nowhere; the 24 later picks are not here; the 18 no picks are never offered.
 *
 * THE SIZING is Matt's own notes, not a GM table (ruling 1): size = the die
 * paid + PSY (@cost+@psy) or = PSY; cost by the targets' combined Level (the
 * cost dialog's default die); sustained = the dialog's checkbox, HP per ten
 * minutes. So every entry's sentence costs THE DIE CHOSEN AT THE CAST (a
 * Gift's cost shape), and Add writes it onto that one Gift, where the Referee
 * edits anything in the builder (ruling 1). Nothing is set automatically.
 *
 * Every ready entry is a BUILDER RECIPE with its values, so it is exactly a
 * sentence the Referee could have composed; tools/test-gift-library.mjs holds
 * each to a planned use at a chosen die.
 */
import { recipeById, assemble, summarise } from "../effects/builder-recipes.js";
import { qualityFormOf } from "./gift-effects.js";

export const GROUPS = [
  ["harm", "Harm"], ["protect", "Heal and protect"], ["empower", "Empower"], ["hinder", "Hinder"],
  ["mind", "Mind"], ["space", "Movement and space"], ["sense", "Senses and knowledge"], ["world", "The world"]
];

const CHOSEN = { cost: "hp", costDie: "chosen" };
const R = (id, values = {}, common = {}) => ({ id, values, common: { ...CHOSEN, ...common } });
const cond = (state, name = "", target = "one-target") => R("use-condition", { state, name }, { target, duration: "until-referee" });
const lasting = (label, text, target = "one-target") => R("use-reminder", {}, { label, text, duration: "until-referee", target });
const say = (label, text) => R("use-reminder", {}, { label, text });
const move = how => R("use-forced-move", { how }, { target: "one-target" });

/**
 * One entry per yes pick: its id (the artifact's), group, name, Matt's note
 * (shown in the Library), status, and - when ready - the recipe. `quality`
 * names the Gift Qualities whose word is this effect, so a composed Gift lists
 * them first (ruling 2).
 */
export const GIFT_LIBRARY = [
  // ---- Harm ----
  { id: "typed-damage", group: "harm", name: "Typed damage", note: "Choose the damage type on creation; the damage can be divided among targets by hand.",
    status: "ready", quality: ["Bashing", "Burning", "Crushing", "Detonating", "Disintegrating", "Electrifying", "Impaling", "Pulsing", "Whirling", "Liquefying"],
    recipe: R("gift-damage", { type: "kinetic" }, { label: "Typed damage" }) },
  { id: "armour-erosion", group: "harm", name: "Armour erosion", note: "HP by the target's Level; the reduction is the user's PSY; single target.", status: "ready", quality: ["Corroding"], recipe: R("use-armour-erosion", { amount: "+@psy" }, { target: "one-target", label: "Armour erosion" }) },
  { id: "level-drain", group: "harm", name: "Level drain", note: "The book's Level-based cost; no Level gained by the user; a character only, never below Level 1.", status: "ready", quality: ["Draining", "Withering"], recipe: R("use-level-drain", { levels: 1 }, { target: "one-target", label: "Level drain" }) },
  { id: "escalating", group: "harm", name: "Focus beam (escalating)", note: "Starts at 1 damage and doubles each round on the round card, for PSY rounds (the Referee removes it); HP by the target's Level; single target.", status: "ready", recipe: R("use-escalating", { start: 1, factor: 2 }, { target: "one-target", label: "Focus beam" }) },

  // ---- Heal and protect ----
  { id: "healing", group: "protect", name: "Healing", note: "Die + PSY; can be split among targets by hand. Gifts cannot heal their user.",
    status: "ready", quality: ["Healing", "Curing", "Mending", "Invigorating"], recipe: R("gift-heal", {}, { label: "Healing" }) },
  { id: "temp-hp", group: "protect", name: "Temporary HP", note: "Die paid + PSY temp HP; distribute among targets by hand; does not expire. Not a heal (Deprived can take it), but never on the user: the cost is paid from the pool first, so a Gift would mint its own fuel (RULED 2026-10-09).", status: "ready", quality: ["Armouring", "Shielding"], recipe: R("use-temp-hp", { amount: "@cost+@psy" }, { target: "one-target", label: "Temporary HP" }) },
  { id: "av-bonus", group: "protect", name: "AV bonus", note: "Sustained; cost by target Level; AV bonus = the die paid + the user's PSY; distribute among targets by hand.", status: "ready", quality: ["Armouring", "Shielding", "Warding", "Guarding"],
    recipe: R("use-stat-change", { stat: "av", amount: "@cost+@psy" }, { target: "one-target", label: "AV bonus" }) },
  { id: "resist-type", group: "protect", name: "Resist a damage type", note: "One type chosen on creation (not kinetic): half damage from it while the Gift holds.", status: "ready", recipe: R("bestow-resist", { type: "flame" }, { target: "one-target", label: "Resistance" }) },
  { id: "incorporeal", group: "protect", name: "Phase (incorporeal)", note: "As described: neither takes nor deals ordinary damage while it holds.", status: "ready", quality: ["Ghostly", "Disappearing"], recipe: cond("incorporeal", "", "self") },
  { id: "cannot-die", group: "protect", name: "Cannot die", note: "As described.", status: "ready", quality: ["Guarding", "Invulnerable"],
    recipe: cond("cannot-die") },
  { id: "protect-blow", group: "protect", name: "Take the blow", note: "The user is the protector while it holds (the Protect control on their sheet); sustained; cost by the ward's Level.", status: "ready", quality: ["Guarding", "Deflecting", "Absorbing"], recipe: R("bestow-protect", {}, { target: "self", label: "Take the blow" }) },
  { id: "reflect", group: "protect", name: "Reflect attacks", note: "Misses against the ally strike the attacker (beams: a Psychic Mirror is the creature rule).", status: "ready", recipe: R("bestow-reflect", {}, { target: "one-target", label: "Reflection" }) },
  { id: "ward-dis", group: "protect", name: "Warding shroud", note: "Attacks against the ally roll at DIS.", status: "ready", quality: ["Warding"], recipe: R("bestow-ward", {}, { target: "one-target", label: "Warding shroud" }) },
  { id: "save-adv", group: "protect", name: "ADV on saves", note: "As described; narrow it to one ability or one kind in the builder.", status: "ready", recipe: R("bestow-save", { verb: "adv", which: "all" }, { target: "one-target", label: "Blessed" }) },
  { id: "cond-immune", group: "protect", name: "Condition immunity", note: "Choose the condition on creation.", status: "ready", recipe: R("bestow-immune", { to: "blind" }, { target: "one-target", label: "Immunity" }) },
  { id: "alert", group: "protect", name: "Cannot be surprised", note: "As described.", status: "ready", recipe: R("bestow-immune", { to: "ambush" }, { target: "one-target", label: "Alert" }) },
  { id: "cure-tox", group: "protect", name: "Cure poison", note: "Cost by the toxin die step; the user's PSY is the number of steps reduced.", status: "ready", quality: ["Curing"], recipe: R("use-cure", { what: "tox" }, { target: "one-target", label: "Cure poison" }) },
  { id: "cure-affliction", group: "protect", name: "Cure an affliction", note: "As described; which one is chosen on Apply.", status: "ready", quality: ["Curing", "Nullifying"], recipe: R("use-cure", { what: "affliction" }, { target: "one-target", label: "Cure an affliction" }) },
  { id: "mend-wound", group: "protect", name: "Close a Wound", note: "Price by severity (-1 to -6 a d6, -7 or -8 a d8...; the table's call); which wound is chosen on Apply.", status: "ready", quality: ["Mending"], recipe: R("use-mend-wound", {}, { target: "one-target", label: "Close a wound" }) },
  { id: "ability-buff", group: "protect", name: "Ability boost", note: "Sustained by default; the increase is the user's PSY; cost by target Level. Choose the ability.", status: "ready",
    recipe: R("use-stat-change", { stat: "str", amount: "+@psy" }, { target: "one-target", label: "Ability boost" }) },

  // ---- Empower ----
  { id: "auto-hit", group: "empower", name: "Unerring strike", note: "The target's next attack is a natural 20: it hits and deals double damage, and the effect is spent; cost by Level.", status: "ready", recipe: R("use-unerring", {}, { target: "one-target", label: "Unerring strike" }) },
  { id: "adv-hit", group: "empower", name: "ADV to hit", note: "Sustained; cost by the target's Level.", status: "ready", recipe: R("bestow-attack", { verb: "adv", kind: "" }, { target: "one-target", label: "Guided strikes" }) },

  // ---- Hinder ----
  { id: "blind", group: "hinder", name: "Blind", note: "Sustained, cost by Level.", status: "ready", quality: ["Blinding", "Dazzling", "Blackening"], recipe: cond("blind") },
  { id: "entangled", group: "hinder", name: "Entangled", note: "Sustained, cost by Level.", status: "ready", quality: ["Entangling", "Binding", "Adhering", "Grasping", "Fusing"], recipe: cond("entangled") },
  { id: "paralysed", group: "hinder", name: "Paralysed", note: "Choose one creature type it works on at creation (biological, synth...); too strong unlimited.", status: "ready",
    recipe: R("use-condition", { state: "paralysed", name: "" }, { target: "one-target", duration: "until-referee", gates: [{ gate: "creature-type", value: "biological", not: false }] }) },
  { id: "asleep", group: "hinder", name: "Asleep", note: "Sustained, cost by Level.", status: "ready", quality: ["Dreaming"], recipe: cond("asleep") },
  { id: "misfortune", group: "hinder", name: "Misfortune", note: "Sustained, cost by Level: every save and attack at DIS.", status: "ready", quality: ["Hindering", "Mocking", "Saddening"], recipe: cond("misfortune") },
  { id: "vulnerable", group: "hinder", name: "Vulnerable", note: "Sustained, double the normal cost, by Level: takes double damage.", status: "ready", recipe: cond("vulnerable") },
  { id: "deprived", group: "hinder", name: "Stop healing", note: "Sustained, cost by Level: the target is Deprived while it holds.", status: "ready", recipe: cond("deprived") },
  { id: "silence", group: "hinder", name: "Silence", note: "As described.", status: "ready", quality: ["Cacophonous"], recipe: cond("mute", "Silenced") },

  // ---- Mind ----
  { id: "mind-control", group: "mind", name: "Mind control", note: "As described.", status: "ready", recipe: cond("controlled") },
  { id: "command", group: "mind", name: "Single command", note: "As described.", status: "ready", quality: ["Commanding"], recipe: R("use-compel", { command: "obey one command" }, { target: "one-target" }) },
  { id: "charm", group: "mind", name: "Charm", note: "As described.", status: "ready", quality: ["Charming", "Calming", "Enticing", "Mesmerising"], recipe: cond("charmed") },
  { id: "fear", group: "mind", name: "Fear", note: "Sustained, cost by Level, an automatic rout.", status: "ready", quality: ["Horrifying"], recipe: move("flee - an automatic rout") },
  { id: "frenzy", group: "mind", name: "Frenzy", note: "As described: Berserk while it holds - deals and takes double damage.", status: "ready", quality: ["Enraging", "Maddening"], recipe: cond("berserk", "Frenzied") },
  { id: "compulsion", group: "mind", name: "Compulsion", note: "No resist possible; sustained; cost by Level.", status: "ready", recipe: R("use-compel", { command: "spend their turn on the set action" }, { target: "one-target", duration: "until-referee" }) },
  { id: "telepathy", group: "mind", name: "Telepathy", note: "Sustained; cost by distance: d6 same room, d8 same map, d10 another vault level, d12 a neighbouring location, d20 anywhere (the distance table: chunk 5).",
    status: "ready", quality: ["Whispering", "Encoding"], recipe: R("use-reminder", {}, { label: "Telepathy", text: "Sends or reads thoughts at a distance.", duration: "until-referee", target: "self", costBy: "distance" }) },
  { id: "memory", group: "mind", name: "Memory extraction", note: "As described.", status: "ready", recipe: say("Memory extraction", "Draws one memory from the target's mind.") },
  { id: "jinx", group: "mind", name: "Jinx", note: "As described: one number on their d20 becomes a natural 1, the Quantum Daemon's curse.", status: "ready", recipe: R("use-jinx", {}, { target: "one-target", label: "Jinx" }) },

  // ---- Movement and space ----
  { id: "teleport-self", group: "space", name: "Portal", note: "A portal to a visited place, by distance: d6 same room, d8 same map, d10 another vault level, d12 a neighbouring location, d20 anywhere; vanishes when the user goes through (the distance table: chunk 5).",
    status: "ready", quality: ["Teleporting"], recipe: R("use-teleport", { to: "a place the user has visited, as far as the die paid allows, through a portal that vanishes behind them" }, { target: "self", label: "Portal", costBy: "distance" }) },
  { id: "banish", group: "space", name: "Banish", note: "Sustained, cost by Level.", status: "ready", quality: ["Banishing"], recipe: move("be sent elsewhere until the Gift ends") },
  { id: "levitate", group: "space", name: "Levitate or fly", note: "As described.", status: "ready", recipe: cond("floating", "Flying", "self") },
  { id: "gravity", group: "space", name: "Invert gravity", note: "Floating until the Referee ends it (PSY rounds, by hand); the end card says how many rounds they fell - the fall damage is the table's, as the codex's Invert Gravity (RULED 2026-09-26).", status: "ready", quality: ["Inverting"], recipe: cond("floating", "Falling skyward") },
  { id: "disarm", group: "space", name: "Disarm", note: "Instant, cost by Level.", status: "ready", quality: ["Disarming"], recipe: move("drop what they hold") },
  { id: "force-wall", group: "space", name: "Force wall", note: "As described, text only, no temp HP.", status: "ready", recipe: lasting("Force wall", "An invisible barrier blocks passage and missiles while the Gift holds.", "self") },

  // ---- Senses and knowledge ----
  { id: "invisible", group: "sense", name: "Invisibility", note: "As described.", status: "ready", quality: ["Concealing", "Disappearing"], recipe: cond("invisible", "", "self") },
  { id: "illusion", group: "sense", name: "Illusion", note: "As described.", status: "ready", recipe: lasting("Illusion", "A false image the Gift sustains; foes may strike the wrong one.", "self") },
  { id: "disguise", group: "sense", name: "Disguise", note: "As described.", status: "ready", quality: ["Disguising"], recipe: lasting("Disguised", "Looks and sounds like someone else while the Gift holds.") },
  { id: "darksight", group: "sense", name: "See in darkness", note: "As described.", status: "ready", recipe: lasting("Darksight", "Sees in darkness, and the invisible, while the Gift holds.") },
  { id: "scry", group: "sense", name: "Scrying", note: "Sustained; the cost adjudicated.", status: "ready", quality: ["Scrying", "Revealing"], recipe: R("use-reveal", { what: "a distant place or person the user names" }, { target: "self", label: "Scrying" }) },
  { id: "psychometry", group: "sense", name: "Psychometry", note: "Could identify Exotica; cost by how long it has been held: d20 under a turn, d12 a turn, d10 an hour, d8 eight hours, d6 a day or more (chunk 5).",
    status: "ready", recipe: R("use-reveal", { what: "the history of an object the user touches" }, { target: "self", label: "Psychometry", costBy: "held-time" }) },
  { id: "speak", group: "sense", name: "Speak with creatures", note: "Choose a creature type on creation; sustained; cost by Level.", status: "ready", recipe: lasting("Speaks with", "Speaks with creatures of the chosen type while the Gift holds.", "self") },

  // ---- The world ----
  { id: "light", group: "world", name: "Light", note: "As described: the target's token sheds light.", status: "ready", recipe: R("bestow-light", {}, { target: "self", label: "Light" }) },
  { id: "darkness", group: "world", name: "Darkness", note: "Sustained; radius = die + PSY feet. A reminder (RULED 2026-10-09): darkness is the Referee's scene control, not a state on a creature.", status: "ready", quality: ["Blackening"], recipe: lasting("Darkness", "Pitch darkness around the user, die + PSY feet across, while the Gift holds.", "self") },
  { id: "extinguish", group: "world", name: "Extinguish", note: "Instant; cost by the fire's damage die: puts out the fire on the target (a burning creature's entry).", status: "ready", quality: ["Extinguishing"], recipe: R("use-cure", { what: "burning" }, { target: "one-target", label: "Extinguish" }) },
  { id: "sustenance", group: "world", name: "Sustenance", note: "Covers all food and water for one day.", status: "ready", recipe: R("bestow-rations", {}, { target: "one-target", duration: "days", amount: 1, label: "Sustenance" }) },
  { id: "breathe", group: "world", name: "Breathe anywhere", note: "As described.", status: "ready", recipe: R("bestow-breathe", {}, { target: "one-target", label: "Water-breathing" }) },
  { id: "climb", group: "world", name: "Climb walls", note: "As described.", status: "ready", recipe: lasting("Climbs", "Walks up sheer walls and ceilings while the Gift holds.") }
];

export const STATUSES = ["ready", "formula", "state", "reader"];

/** One ready entry as the sentence Add writes, with its line. */
function sentenceOf(e)
{
  const recipe = recipeById(e.recipe.id);
  if (!recipe) return null;
  const values = { ...Object.fromEntries(recipe.fields.map(f => [f.key, f.default])), ...e.recipe.values };
  const common = { text: e.recipe.common.text ?? `${e.name}.`, ...e.recipe.common };
  const sentence = assemble(recipe, values, common, "gift");
  return { sentence, summary: summarise(sentence, "gift").line };
}

/**
 * The Library as a Gift's Effects tab lists it (ruling 2): the ready entries,
 * grouped; the ones whose word is the Gift's Quality first and marked. Each
 * carries its index into the ready list, which Add reads back.
 */
export function giftLibraryFor(item)
{
  const quality = qualityFormOf(item)?.quality ?? null;
  const ready = GIFT_LIBRARY.filter(e => e.status === "ready");
  const entries = ready.map((e, index) => ({ ...e, index, ...sentenceOf(e), matches: !!quality && (e.quality ?? []).includes(quality) }));
  return GROUPS.map(([key, label]) => ({ key, label, entries: entries.filter(e => e.group === key).sort((a, b) => Number(b.matches) - Number(a.matches)) }))
    .filter(g => g.entries.length);
}

/** The ready entry at an index of the ready list, with its sentence - what Add writes. */
export function giftLibraryEntry(index)
{
  const e = GIFT_LIBRARY.filter(x => x.status === "ready")[index];
  return e ? { ...e, ...sentenceOf(e) } : null;
}
