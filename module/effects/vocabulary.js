/**
 * The effect vocabulary - Effect Engine: Foundations (foundry-system-index.csv
 * "Effect Engine: Foundations", RULED 2026-10-05 by Matt).
 *
 * Every mechanical effect is one or more SENTENCES (see sentence.js):
 *
 *   WHEN trigger [IF gates] -> target -> do verb(params) [RESIST save] [FOR duration] [COST cost]
 *
 * This file is the registry of the words a sentence may use. A word not listed
 * here is refused by the validator, which is what keeps the vocabulary one
 * language instead of a new dialect per item kind. The words are the draft-0
 * list plus the word families the 2026-10-04 full pass of all 1,143 atoms
 * needed (the Claude Doc "Vaarn Effect Vocabulary").
 *
 * WHAT IS RULED AND WHERE:
 *   - default resolve mode per verb (`mode`): auto, card or reminder - the
 *     ruled table (2026-10-05), overridable on one sentence.
 *   - gates are known (computed), standing (asked once, remembered for the
 *     scene or combat) or asked (each roll); the roller is asked about
 *     themselves, the GM about a target; with prompts off a default answer is
 *     used and named on the card (asked gates, 2026-10-04).
 *   - passive sentences name the item state they need; use sentences name
 *     what they require (2026-10-05).
 *
 * `handled` is false for every word in this step: Foundations registers the
 * language and validates it, and the interpreter (step 3) wires handlers. The
 * GM builder offers only handled words.
 *
 * Each verb carries an `example` - a minimal valid `do` - so the offline test
 * can prove every verb's parameter list validates, and a later builder has a
 * template to start from.
 *
 * Pure data: no Foundry global.
 */

/* ---------------- Item states (passive needs / use requires) ---------------- */

export const ITEM_STATES = {
  installed: "part of the body (implants, mutations, ancestry rules, wounds, afflictions, figments)",
  equipped:  "worn or held in hand (weapons, armour, helms, shields)",
  carried:   "anywhere on the actor"
};

/**
 * The default state per Item type, so a sentence rarely has to say it and an
 * Item made before the flags existed still works (RULED 2026-10-05).
 */
export const ITEM_STATE_DEFAULTS = {
  implant: "installed", mutation: "installed", ancestry: "installed", wound: "installed",
  affliction: "installed", figment: "installed", exhaustion: "installed",
  weaponMelee: "equipped", weaponRanged: "equipped", armor: "equipped",
  item: "carried", light: "carried", spell: "carried", gift: "installed", codex: "carried",
  exotica: "carried", crucible: "carried"
};

export function itemStateDefault(itemType)
{
  return ITEM_STATE_DEFAULTS[itemType] ?? "carried";
}

/* ---------------- Triggers (WHEN) ---------------- */

export const TRIGGERS = {
  "passive":        { label: "while in its item state (installed, equipped or carried)" },
  "stat":           { label: "a property of the item itself (damage dice, AV, slots)" },
  "use":            { label: "used from the sheet (activate, drink, read, throw, apply)" },
  "attack-roll":    { label: "when its attack is rolled, before hit or miss is known" },
  "attack-hit":     { label: "its attack hits" },
  "attack-miss":    { label: "its attack misses" },
  "when-hit":       { label: "the bearer is hit or damaged" },
  "when-missed":    { label: "an attack misses the bearer" },
  "when-targeted":  { label: "the bearer is targeted" },
  "when-healed":    { label: "the bearer is healed" },
  "each-round":     { label: "each combat round (its holder's turn)" },
  "each-action":    { label: "each combat action the holder takes" },
  "each-turn":      { label: "each Exploration Turn" },
  "each-hour":      { label: "each hour" },
  "each-day":       { label: "each day" },
  "each-week":      { label: "each week" },
  "on-rest":        { label: "on a rest" },
  "on-kill":        { label: "the bearer kills something" },
  "on-death":       { label: "the bearer dies" },
  "on-level-up":    { label: "the bearer gains a Level" },
  "on-draw":        { label: "the weapon is drawn (equipped)" },
  "on-fall":        { label: "the bearer falls" },
  "on-failed-save": { label: "a save against it fails (chains a second sentence)" },
  "on-passed-save": { label: "a save against it passes" },
  "on-contract":    { label: "an affliction or toxin takes hold" },
  "on-reaction-roll": { label: "a reaction roll is made" },
  "on-rep-gain":    { label: "the party gains REP with a faction" },
  "on-roll":        { label: "any roll the bearer makes" },
  "value-reaches":  { label: "a value (HP, an ability, a stat) reaches a threshold" },
  "hazard":         { label: "the Referee triggers it (a trap, a room)" }
};

/* ---------------- Gates (IF) ---------------- */
// known: "computed" (the system works it out), "standing" (asked once and
// remembered for the scene or combat), "asked" (each roll). ask: who answers
// an asked or standing gate - "roller" about themselves, "gm" about a target.

export const GATES = {
  "creature-type":   { known: "computed", label: "the target is of a creature type" },
  "damage-type":     { known: "computed", label: "the damage is of a type" },
  "damage-source":   { known: "computed", label: "what dealt the damage" },
  "attack-kind":     { known: "computed", label: "melee, ranged or unarmed" },
  "item-metal":      { known: "computed", label: "the item is metal" },
  "wears-metal-armour": { known: "computed", label: "the target wears metal armour" },
  "armoured":        { known: "computed", label: "the target wears armour" },
  "ancestry":        { known: "computed", label: "the target's ancestry" },
  "is-pc":           { known: "computed", label: "the target is a player character" },
  "same-species":    { known: "computed", label: "the target is the same species" },
  "faction-rep":     { known: "computed", label: "the party's REP with a faction" },
  "ability-threshold": { known: "computed", label: "an ability is at or below a value" },
  "natural-roll":    { known: "computed", label: "the natural die result" },
  "target-av":       { known: "computed", label: "the target's AV" },
  "damage-roll":     { known: "computed", label: "the damage roll (maximum, even)" },
  "would-be-lethal": { known: "computed", label: "the damage would kill" },
  "chance":          { known: "computed", label: "an x-in-N chance" },
  "coin":            { known: "computed", label: "a coin flip" },
  "has-state":       { known: "computed", label: "the target has a named state" },
  "in-combat":       { known: "computed", label: "a combat is running" },
  "weather":         { known: "standing", ask: "gm", label: "the weather is", question: "Is the weather {is}?" },
  "daylight":        { known: "standing", ask: "gm", label: "in daylight or sunlight, under open sky", question: "Is it daylight, under open sky?" },
  "terrain":         { known: "standing", ask: "gm", label: "the terrain is", question: "Is the terrain {is}?" },
  "darkness":        { known: "asked",    ask: "roller", label: "in darkness (asked per roll: there are many ways to make light)", question: "Is {subject} in darkness?" },
  "sneaking":        { known: "asked",    ask: "roller", label: "sneaking or hiding", question: "Is {subject} sneaking or hiding?" },
  "charging":        { known: "asked",    ask: "roller", label: "charging", question: "Is {subject} charging?" },
  "moved":           { known: "asked",    ask: "roller", label: "moved (or stayed still) this round", question: "Has {subject} moved this round?" },
  "movement":        { known: "asked",    ask: "roller", label: "airborne, swimming or climbing", question: "Is {subject} {is}?" },
  "asleep":          { known: "asked",    ask: "roller", label: "asleep", question: "Is {subject} asleep?" },
  // Standing since Weapon Tags chunk 4 (RULED 2026-10-05): a creature's blood does not change mid-fight.
  "warm-blooded":    { known: "standing", ask: "gm", label: "the target is warm-blooded", question: "Is {subject} warm-blooded?" },
  "has-eyes":        { known: "asked",    ask: "gm", label: "the target has eyes", question: "Does {subject} have eyes?" },
  "has-brain":       { known: "asked",    ask: "gm", label: "the target has a brain", question: "Does {subject} have a brain?" },
  "target-is-object": { known: "asked",   ask: "gm", label: "the target is an object", question: "Is {subject} an object or a static structure?" },
  // Electrical against a submerged target, Flaming underwater (Weapon Tags ruling C, 2026-10-05).
  "submerged":       { known: "asked",    ask: "gm", label: "the target is submerged in water", question: "Is {subject} submerged in water?" },
  // Flaming's "cannot be used underwater" - the WIELDER, asked of the GM (Weapon Tags chunk 4, 2026-10-05).
  "underwater":      { known: "asked",    ask: "gm", label: "the wielder is underwater", question: "Is {subject} underwater?" },
  "range":           { known: "asked",    ask: "roller", label: "close or far", question: "Is {subject}'s target {is}?" },
  // Weapon Tags (RULED 2026-10-05): Corrosive's armour toggle is the roller's
  // answer (ruling D); Sacred and Blasphemous ask whether the creatures met
  // follow the religion that blessed or cursed the weapon (ruling E).
  "targets-armour":  { known: "asked",    ask: "roller", label: "going for the armour instead of damage", question: "Is {subject} going for the target's armour instead of dealing damage?" },
  // Asked of the creature met, per weapon (`is` names it), remembered for the
  // scene - Reaction Roll Button (2026-10-05).
  "followers":       { known: "standing", ask: "gm", label: "the creatures met follow the religion that blessed or cursed the weapon", question: "Does {subject} follow the religion that blessed or cursed {is}?" },
  // Effect Engine: Mutations and Ancestry Rules (ruling C, 2026-10-05, Matt).
  // A kind of creature the book names and no checkbox records - antlered,
  // bird-like, furry, true-kin - asked of the GM once per creature (`is` names
  // the kind), as the followers question is.
  "creature-kind":   { known: "standing", ask: "gm", label: "the creature met is of a kind", question: "Is {subject} {is}?" },
  // The bearer carries an item of this name (`is`): Albino's sunshade.
  "carries":         { known: "computed", label: "the bearer carries an item of this name" },
  // The attack is a bite (the Ickbulb's BITE_WORDS): Toxic Flesh.
  "attack-is-bite":  { known: "computed", label: "the attack is a bite" }
};

/* ---------------- Targets ---------------- */

export const TARGETS = {
  "self":          { label: "the bearer" },
  "one-target":    { label: "one targeted creature" },
  "up-to-n":       { label: "up to N targeted creatures" },
  "attacker":      { label: "the attacker" },
  "all-in-range":  { label: "everyone in range (earshot, nearby, line of sight)" },
  "everyone-else": { label: "everyone but the bearer" },
  "allies-nearby": { label: "the bearer's allies nearby" },
  "host":          { label: "the creature it is attached to" },
  "party":         { label: "the whole party" },
  "this-item":     { label: "the item itself" },
  "item-in-slot":  { label: "the item in a rolled slot" },
  "chosen-item":   { label: "an item chosen by the player, the GM or a coin" }
};

/* ---------------- Verbs (DO) ---------------- */
// mode: the default resolve mode (RULED 2026-10-05). `hitMode` overrides it
// when the trigger is an attack hit (damage and heal land on the damage click).
// params: required keys of `do`. example: a minimal valid `do`.

export const VERBS = {
  "modify":           { mode: "auto", params: ["stat", "amount"], example: { stat: "av", amount: "+2" },
                        note: "Optional: min (the lowest it may be), floor (round down at the end), round (decimal places), to (one buyer only), appraisal (a GM's appraisal, read only when asked - Stats as Sentences 2c, 2026-10-07)." },
  "max-hp":           { mode: "auto", params: ["amount"], example: { amount: "+5" },
                        note: "Its own verb, neither healing nor damage: current takes the same operation; a loss only clamps (2026-10-05)." },
  "immune":           { mode: "auto", params: ["to"], example: { to: "fire" } },
  "forbid":           { mode: "auto", params: ["what"], example: { what: "wear-helmet" } },
  "adv":              { mode: "auto", params: ["on"], example: { on: "save:con" } },
  "dis":              { mode: "auto", params: ["on"], example: { on: "attack" } },
  "level":            { mode: "auto", params: ["amount"], example: { amount: "+1", max: 7 } },
  "add-creature-type": { mode: "auto", params: ["type"], example: { type: "hypergeometric" } },
  "usage-die":        { mode: "auto", params: ["die"], example: { die: "d8" } },
  "upkeep":           { mode: "auto", params: ["item"], example: { item: "Water Ration", per: "day", unpaid: "deprived" } },
  "toxin":            { mode: "auto", params: ["die"], example: { die: "d6" } },
  "damage":           { mode: "card", hitMode: "auto", params: ["dice"], example: { dice: "1d6", type: "kinetic" } },
  "heal":             { mode: "card", hitMode: "auto", params: ["amount"], example: { amount: "1d8" } },
  "ability-damage":   { mode: "card", hitMode: "auto", params: ["ability", "dice"], example: { ability: "str", dice: "1d6" } },
  "condition":        { mode: "card", params: ["state"], example: { state: "blind" } },
  "kill":             { mode: "card", params: [], example: {} },
  "roll-table":       { mode: "card", params: ["table"], example: { table: "Wounds - Biological" } },
  "create-item":      { mode: "card", params: ["item"], example: { item: "Medgel" } },
  "spawn-creature":   { mode: "card", params: ["creature"], example: { creature: "Broodling", count: "1d6" } },
  "add-mutation":     { mode: "card", params: [], example: { random: true } },
  "add-implant":      { mode: "card", params: [], example: { random: true } },
  "add-gift":         { mode: "card", params: [], example: { random: true } },
  "add-wound":        { mode: "card", params: ["wound"], example: { wound: "Grimpet" } },
  "add-affliction":   { mode: "card", params: ["affliction"], example: { affliction: "Wrathworms" } },
  "grant-trait":      { mode: "card", params: ["trait"], example: { trait: "Flat" } },
  "item-state":       { mode: "card", params: ["state"], example: { state: "useless" } },
  "refill":           { mode: "card", params: ["what"], example: { what: "ammo" } },
  "compel":           { mode: "card", params: ["command"], example: { command: "obey one verbal command" } },
  "teleport":         { mode: "card", params: [], example: { to: "a random location" } },
  "grant-attack":     { mode: "auto", params: ["dice"], example: { dice: "1d6", type: "kinetic" } },
  "reflect":          { mode: "card", params: [], example: {} },
  "resurrect":        { mode: "card", params: [], example: {} },
  "auto-hit":         { mode: "auto", params: [], example: {} },
  "ignore-armour":    { mode: "auto", params: [], example: {} },
  "ambush":           { mode: "auto", params: [], example: {} },
  "share-damage":     { mode: "auto", params: ["with"], example: { with: "host" } },
  "invert-roll":      { mode: "card", params: [], example: {} },
  "set-roll":         { mode: "card", params: ["result"], example: { result: 1 } },
  "remove-wound":     { mode: "card", params: [], example: { count: 1 } },
  "cure":             { mode: "card", params: [], example: { what: "affliction" } },
  "set-weather":      { mode: "card", params: ["weather"], example: { weather: "Sandstorm" } },
  "emit-light":       { mode: "auto", params: [], example: { radius: "near" } },
  "forced-move":      { mode: "reminder", params: ["how"], example: { how: "flee" } },
  "transform":        { mode: "reminder", params: ["into"], example: { into: "Gitchghast" } },
  "reveal":           { mode: "reminder", params: ["what"], example: { what: "level, AV and HP" } },
  "conceal":          { mode: "reminder", params: ["what"], example: { what: "Gleam" } },
  "reminder":         { mode: "reminder", params: [], example: {} },
  "special":          { mode: "card", params: ["handler"], example: { handler: "echopraxist" },
                        note: "A named one-off handler (Echopraxist, Map of Fate, Bifurcating Brew, Brewing an Elixir, Antidotes, Thin Mare)." }
};

/* ---------------- Resist, duration, cost ---------------- */

export const ABILITIES = ["str", "dex", "con", "int", "psy", "ego"];

export const RESISTS = {
  "save":    { label: "a save in one ability", params: ["ability"] },
  "morale":  { label: "a Morale save", params: [] },
  "opposed": { label: "an opposed save (10 + the poster's score)", params: ["ability"] }
};

export const DURATIONS = {
  "instant":          { label: "instant" },
  "rounds":           { label: "N combat rounds (counted on the holder's turns in combat)", amount: true },
  "turns":            { label: "N Exploration Turns", amount: true },
  "hours":            { label: "N hours", amount: true },
  "days":             { label: "N days", amount: true },
  "weeks":            { label: "N weeks", amount: true },
  "until-rest":       { label: "until a rest" },
  "until-cured":      { label: "until cured or repaired" },
  "until-referee":    { label: "until the Referee ends it" },
  "while-state":      { label: "while its item stays in its item state" },
  "until-combat-ends": { label: "until combat ends" },
  "until-source-dies": { label: "until the source dies" },
  "until-saved":      { label: "until the holder saves (a save each round)" },
  "until-damaged":    { label: "until the holder is damaged" },
  "while-in-area":    { label: "while the holder stays in the area" },
  "until-sunrise":    { label: "until sunrise" },
  "permanent":        { label: "permanent" }
};

export const COSTS = {
  "hp":              { label: "HP (dice, optionally + the target's Level)" },
  "ability":         { label: "points of an ability" },
  "usage-die-step":  { label: "a usage-die roll" },
  "charge":          { label: "a charge" },
  "per-day":         { label: "uses per day" },
  "per-combat":      { label: "uses per combat" },
  "consumed":        { label: "the item is used up" },
  "item":            { label: "N of a named item" }
};

export const MODES = ["auto", "card", "reminder"];

/**
 * The verbs whose default mode Matt ruled (2026-10-05). Every other verb's
 * `mode` above is PROVISIONAL - a draft offered for ruling, not a decision -
 * and the offline test lists them so they cannot quietly become settled.
 */
export const RULED_MODE_VERBS = new Set([
  "modify", "immune", "forbid", "adv", "dis", "level", "add-creature-type", "usage-die", "upkeep", "toxin",
  "damage", "heal", "condition", "roll-table", "create-item", "spawn-creature",
  "add-mutation", "add-implant", "add-gift", "item-state", "compel", "teleport",
  "reminder", "forced-move", "transform", "reveal",
  // Weapon Tags (2026-10-05): ability-damage, kill, reflect, auto-hit,
  // ignore-armour and max-hp ruled as today's behaviour (ruling G); emit-light
  // auto, the token lighting itself (chunk 5b).
  "ability-damage", "kill", "reflect", "auto-hit", "ignore-armour", "max-hp", "emit-light",
  // refill a card: Fungal's feeding is offered after a rest, the table chooses (chunk 5c).
  "refill"
]);

/** The default resolve mode for a verb on a trigger (hit-triggered damage and heal are auto). */
export function defaultModeFor(verb, trigger)
{
  const v = VERBS[verb];
  if (!v) return null;
  if (v.hitMode && trigger === "attack-hit") return v.hitMode;
  return v.mode;
}
