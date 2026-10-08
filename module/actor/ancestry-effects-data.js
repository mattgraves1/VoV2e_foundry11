/**
 * The ancestry special rules as effect sentences - Effect Engine: Mutations
 * and Ancestry Rules, chunk 1 (foundry-system-index.csv "Effect Engine:
 * Mutations and Ancestry Rules", BUILD PLAN and RULING C LIST RULED
 * 2026-10-05 by Matt).
 *
 * One entry per special rule of every ancestry (chargen-data.js SPARK_TABLES
 * special_rules, checked both ways by tools/test-mutation-effects.mjs). An
 * ancestry rule Item is read by its rule name; a rule with no Item - every
 * character made before the step, and the rules that never had one - is read
 * from the character's ancestry text (ruling B), so nothing is migrated.
 *
 * READ THIS BEFORE EDITING:
 *  - `text` is the book's own words (JADE IBIS, Ancestries).
 *  - BAKED (ruling A): what chargen writes once - creature types, the
 *    Lithling's 10d8 HP, the no-heal rule, the starting kit, the board's GM
 *    reminders, the natural weapon, the ancestry rule Items themselves - is a
 *    `stat` sentence marked `baked: true`, never applied again.
 *  - ONE-OFFS are `special` with a named handler (ruling: Ambusher, Inheritor,
 *    Worm Wise, Repairs, Spores, Bloomboons, as Polymorphic was).
 *  - The damage-type table keeps every multiplier: a rule gives its bearer a
 *    property (flat, flammable, synthFleshThermal); the Synth's and the
 *    Lithling's other immunities come from their creature type, already shared.
 *
 * Pure data: no Foundry global.
 */

const baked = (verb, params, text) => ({ when: "stat", baked: true, do: { verb, ...params }, ...(text ? { text } : {}) });
const prop = (p, text) => ({ when: "passive", do: { verb: "modify", stat: "damage-properties", amount: `+${p}` }, text });
const special = (handler, text, extra = {}) => ({ when: "use", do: { verb: "special", handler, ...extra }, text });
const note = (text, section = "Always Active", polarity = "Benefit", category = "Ancestry") =>
  ({ when: "passive", do: { verb: "reminder" }, text, tab: { section, polarity, category } });
const melee = { gate: "attack-kind", is: "melee" };

const RULE_SENTENCES = {
  /* ---------------- True-kin ---------------- */
  "Pure of Blood": [
    // Ruling C (6): the GM is asked; not skipped for a visibly mutated character (Matt).
    { when: "on-reaction-roll", if: [{ gate: "creature-kind", is: "true-kin" }], do: { verb: "adv", on: "reaction" },
      text: "You have ADV on reaction and persuasion rolls when you encounter other true-kin." },
    baked("special", { handler: "gm-reminder" }, "You have ADV on reaction and persuasion rolls when you encounter other true-kin. You lose this bonus if you are visibly mutated.")],
  "Inheritor": [special("inheritor", "When you encounter pre-Collapse security systems or guard synths, make an opposed EGO Save. On success, the machine is convinced you are its new master and will serve you in any way it is able. On failure, the machine becomes implacably hostile.")],

  /* ---------------- Cacogen ---------------- */
  "Corrupted Blood": [baked("special", { handler: "mutation-precedence" }, "At character creation, roll d100 three times for mutations. If any effects contradict one another, the more recently rolled mutation takes precedence.")],
  "Proteus": [{ when: "on-level-up", do: { verb: "special", handler: "proteus" }, text: "When you gain a Level, you may roll for another mutation instead of increasing HP and Ability scores." },
              note("DIS on Saves to resist mutation and other metamorphic effects.", "Always Active", "Detriment")],

  /* ---------------- Synth ---------------- */
  "Synthetic Flesh": [
    baked("add-creature-type", { type: "synthetic" }, "You are metal and plastic."),
    prop("synthFleshThermal", "You are immune to ... extreme temperatures."),
    { when: "passive", do: { verb: "modify", stat: "rations-needed", amount: "x0", rule: "Repairs" }, text: "You need not eat or breathe." },
    note("When you receive wounds, use the Synthetic Wounds table.", "Always Active", "Detriment")],
  "Synthetic Mind": [
    { when: "passive", do: { verb: "dis", on: "save", vs: "nanomachine" }, text: "You are vulnerable to attacks targeting the LogLang syntax that powers you." },
    baked("special", { handler: "gm-reminder" }, "You are vulnerable to attacks targeting the LogLang syntax that powers you. These include strobing basilisk patterns, malicious infoglyphs, and ancient Titan-era language viruses. You suffer d6 INT damage per round from magnetic fields.")],
  "Repairs": [
    baked("create-item", { item: "Synth Part", count: 3 }, "You begin play with 3 synth parts."),
    special("repairs", "Repair takes one hour and uses one synth part. Repairs heal d8 + CON HP. If your HP is full, repair one wound.")],

  /* ---------------- Newbeast ---------------- */
  "Beasthood": [baked("special", { handler: "gm-reminder" }, "You gain ADV on saves whenever it would make sense for your animal nature to provide it. Your referee may impose DIS in circumstances where your animal nature might prove unhelpful.")],
  "Kinship": [baked("special", { handler: "gm-reminder" }, "You can speak to all creatures that share your underlying animal form, even if they would not normally be able to communicate.")],

  /* ---------------- Neobloom ---------------- */
  "Photosynthesis": [
    { when: "use", if: [{ gate: "daylight" }], target: "self", do: { verb: "special", handler: "hourly-heal", dice: "1d8+@con", hour: "one hour rooted in damp soil under Urth's sun", says: "photosynthesises", doing: "photosynthesising" },
      text: "You regain d8 + CON HP for every hour you spend rooted in damp soil under the light of Urth's sun. Artificial lighting does not suffice." },
    note("If you do not photosynthesise for three days in a row, you perish.", "Always Active", "Detriment")],
  "Flammable": [prop("flammable", "You take double damage from flames and heat-based attacks."),
                note("Once hit by flames, you suffer d8 burning damage per round until extinguished.", "Always Active", "Detriment")],
  "Bloomboons": [special("bloomboons", "At character creation, roll d20 to determine your bloomboon. When you gain a Level, you may choose to roll for a bloomboon instead of gaining HP and increasing your Ability scores."),
                 // The level-up trade, as Proteus's (chunk 6, RULED 2026-10-06): advancement.js tradeFor reads it.
                 { when: "on-level-up", do: { verb: "special", handler: "bloomboon" }, text: "When you gain a Level, you may choose to roll for a bloomboon instead of gaining HP and increasing your Ability scores." }],

  /* ---------------- Mycomorph ---------------- */
  "Twice Born": [special("self-save", "You may make INT Saves to recall information your original body knew.", { ability: "int" })],
  "Detritivore": [
    { when: "passive", do: { verb: "adv", on: "save", vs: "tox" }, text: "You have ADV on all Saves against poison and toxins." },
    { when: "on-rest", do: { verb: "special", handler: "rotting-meal" }, text: "You heal double from Short Rests, if the meal you eat is rotting." }],
  "Spores": [special("spores", "You may release spores, which affect a number of biological targets equal to your Level. When you do, make a CON Save. On failure, you are unable to release anymore spores that day.")],

  /* ---------------- Faa Nomad ---------------- */
  "Desert Metabolism": [{ when: "passive", do: { verb: "upkeep", item: "Water Ration", per: "day", lapse: "faa-water" },
                          text: "You become Deprived from thirst after three days without drinking, and it will be three weeks before you die." }],
  "Ambusher": [special("ambusher", "When in the blue desert, you can make an opposed PSY Save to attempt to ambush a hostile encounter.")],
  "Worm Wise": [special("worm-wise", "When encountering a Sandworm, you may attempt to charm it using your knowledge of their moods and pheromones. Make an EGO Save.")],

  /* ---------------- Cacklemaw Exile ---------------- */
  "No Quarter": [{ when: "passive", do: { verb: "reminder", on: "save", abilities: ["ego"] }, text: "You must EGO Save to show mercy to a defeated foe or to retreat from a fight." }],
  "Biter": [baked("create-item", { item: "Biter Fangs", natural: true }, "If you hit a foe with a melee attack, you may add d6 fang damage to the roll."),
            { when: "attack-hit", if: [melee], do: { verb: "damage", dice: "1d6", addOn: true }, text: "If you hit a foe with a melee attack, you may add d6 fang damage to the roll." }],
  "Overkill": [{ when: "on-kill", if: [melee], do: { verb: "reminder" }, text: "When you kill a foe with a melee attack, you may immediately make another melee attack against a nearby target." }],

  /* ---------------- Planeyfolk ---------------- */
  "Flat": [prop("flat", "You take half damage from bludgeoning attacks and double damage from slashing or piercing attacks.")],
  "Attune with Matter": [{ when: "passive", do: { verb: "special", handler: "attunes" },
                           text: "You struggle to hold 3D objects and must make a DEX Save to do so. Given an hour of quiet concentration, you can attune yourself with an item and add it to your inventory." }],

  /* ---------------- Lithling ---------------- */
  "Crystalline Flesh": [
    baked("add-creature-type", { type: "mineral" }, "You are living crystal."),
    // Base AV, apart from worn armour and other bonuses - Quills never touches it (Matt, 2026-10-05).
    { when: "passive", do: { verb: "modify", stat: "base-av", amount: "=10+@level", max: 20 }, text: "Your base AV is 10 + your Level (maximum 20)." },
    { when: "passive", do: { verb: "modify", stat: "rations-needed", amount: "x0", rule: "Inevitable" }, text: "You do not need to eat or drink." }],
  "Inevitable": [
    baked("modify", { stat: "max-hp", amount: "=10d8", noLevelGain: true }, "During character generation, roll 10d8. This number is your starting and maximum HP."),
    { when: "passive", do: { verb: "forbid", what: "heal" }, text: "You cannot heal HP through any means." },
    { when: { trigger: "value-reaches", value: "hp", threshold: 0 }, do: { verb: "special", handler: "crumble" },
      text: "When your HP reaches zero, you crumble into iridescent dust, leaving behind a pebble-sized lithling seed." }]
};

const stripUndefined = s => JSON.parse(JSON.stringify(s));

// Each rule as { effects: [...] }, validated with every other roster.
export const ANCESTRY_RULE_EFFECTS = Object.fromEntries(
  Object.entries(RULE_SENTENCES).map(([rule, list]) => [rule, { effects: list.map(stripUndefined) }]));
