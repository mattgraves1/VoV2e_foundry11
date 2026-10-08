/**
 * The weapon tags as effect sentences - Effect Engine: Weapon Tags, chunk 2
 * (foundry-system-index.csv "Effect Engine: Weapon Tags", BUILD PLAN RULED
 * 2026-10-05 by Matt).
 *
 * One entry per tag of chargen-data.js's BASIC_TAGS, ADVANCED_TAGS and
 * EXOTIC_TAGS (keyed by the tag's name, checked both ways by
 * tools/test-weapon-tags.mjs), plus Fragile, which every Advanced and Exotic
 * weapon carries. The weapon translator (weapon-tags.js) reads a weapon's
 * `system.tags` and returns these sentences, so a weapon made before the step
 * needs nothing rewritten.
 *
 * READ THIS BEFORE EDITING:
 *  - `text` is the book's own words (JADE IBIS, the tag tables), so a card or
 *    reminder can quote it.
 *  - BAKED (ruling A): a `stat` sentence marked `baked: true` describes what
 *    the weapon's fields already hold - its damage dice, slots, trade value,
 *    metal flag - set once when it was made. The interpreter never applies a
 *    baked sentence again; Stats as Sentences makes them live.
 *  - DAMAGE PROPERTIES: a tag whose effect is a damage property (Flaming is
 *    flame, Electrical is electrical) carries `modify damage-types +<prop>`.
 *    The doubling and immunities that property meets live in ONE place, the
 *    damage-type table (attack-properties.js DAMAGE_INTERACTIONS), shared
 *    with every other source of that property; the sentence does not repeat
 *    them.
 *  - Gates are the vocabulary's (rulings B-D): warm-blooded (Heat-Seeking,
 *    defaulting to the Biological checkbox), submerged and target-is-object
 *    (Electrical, Flaming, Eroding, defaulting to no), charging and
 *    targets-armour (the roller's toggles, Rocket Boosted and Corrosive),
 *    followers (Sacred and Blasphemous).
 *  - Clauses built in this step for the first time (ruling E) and the bugs it
 *    fixes (ruling F) are written here as the book says them; the readers
 *    that act on each arrive in chunks 3 to 5.
 *
 * Pure data: no Foundry global.
 */

const stat = (statName, amount, extra = {}) => ({ when: "stat", baked: true, do: { verb: "modify", stat: statName, amount, ...extra } });
const live = (statName, amount, extra = {}) => ({ when: "stat", do: { verb: "modify", stat: statName, amount, ...extra } });
const prop = p => live("damage-types", `+${p}`);
// The finish the bakes apply (Stats as Sentences chunk 2d-i, RULED 2026-10-07): trade value
// rounded to 2 decimals; slots floored once at the end, at least 1.
const trade = m => stat("trade-value", `x${m}`, { round: 2 });
const slots = m => stat("slots", `x${m}`, { min: 1, floor: true });
const notMetal = () => stat("metal", "false");
// `vs` is what the save card says the roll is against (the roster's wording).
const save = (ability, vs, sentence) => ({ ...sentence, resist: { type: "save", ability, vs } });
const morale = (vs, sentence) => ({ ...sentence, resist: { type: "morale", vs } });
const bio = { gate: "creature-type", is: "biological" };
const strAtLeast = n => ({ when: "passive", if: [{ gate: "ability-threshold", is: { ability: "str", below: n } }],
                         do: { verb: "forbid", what: "equip" }, text: `Minimum STR +${n} to use.` });
// Sacred and Blasphemous hold while the weapon is merely carried (Matt,
// 2026-10-05): the blessing or curse is the weapon's, not the grip's.
const religion = (verb, text) => ({ when: "on-reaction-roll", requires: "carried", if: [{ gate: "followers" }], do: { verb, on: "reaction" }, text });
const stripUndefined = s => JSON.parse(JSON.stringify(s));

const TAG_SENTENCES = {
  /* ---------------- Basic ---------------- */
  "Ancient":     [trade(0.5)],
  "Bejewelled":  [trade(3)],
  "Blasphemous": [religion("dis", "Cursed by a religious leader. DIS on reaction rolls when encountering followers of said religion.")],
  "Bone":        [live("trade-value", "x2", { to: "Cacklemaw and Ghouls" }), notMetal()],
  "Corroded":    [trade(0.5)],
  "Crystalline": [trade(2), notMetal(),
                  { when: "attack-roll", if: [{ gate: "natural-roll", is: { equals: 1 } }], target: "this-item", do: { verb: "item-state", state: "destroyed", by: "break" },
                    text: "If a natural 1 is rolled, the weapon shatters beyond repair." }],
  "Delicate":    [slots(0.5),
                  { when: "attack-roll", if: [{ gate: "natural-roll", is: { atMost: 2 } }], target: "this-item", do: { verb: "item-state", state: "broken", by: "break" },
                    text: "Breaks on a to-hit roll of 1-2." }],
  "Elegant":     [slots(0.5)],
  "Fungal":      [prop("fungal"), notMetal(),
                  // Chunk 5c (Matt, 2026-10-05): fed at a Short or Long Rest - one
                  // organic food ration, once per rest - its ammo die steps up.
                  { when: "on-rest", do: { verb: "refill", what: "ammo", steps: 1 }, cost: { kind: "item", item: "Food Ration" },
                    text: "Regains an Ammo die step when fed organic matter." }],
  "Gilded":      [trade(2)],
  "Laquered":    [trade(2), { when: "passive", do: { verb: "forbid", what: "corrode" }, text: "Cannot rust or be corroded." }],
  // Chunk 5b (Matt, 2026-10-05): sheds light from the bearer's token while
  // EQUIPPED, at the tier a carried light source uses; its colour is the
  // weapon's own (flags.vaarn.lightColor), set on the weapon sheet.
  "Luminous":    [trade(2), { when: "passive", do: { verb: "emit-light", tier: "source" }, text: "Can be used as a light source." }],
  "Nomad's":     [live("trade-value", "x2", { to: "Faa Nomads" })],
  "Ornate":      [trade(2)],
  "Polychrome":  [trade(2)],
  "Quicksilver": [slots(0.5)],
  "Ritual":      [live("trade-value", "x2", { to: "Mystics" })],
  "Sacred":      [religion("adv", "Blessed by a religious leader. ADV on reaction rolls when encountering followers of said religion.")],
  "Shoddy":      [stat("damage-die-size", "-1 step", { min: "d4" })],
  "Translucent": [trade(2), notMetal()],

  /* ---------------- Advanced ---------------- */
  "Agonising": [
    save("ego", "moving away from the wielder", { when: "attack-hit", if: [{ gate: "is-pc" }], do: { verb: "forced-move", how: "move away from the wielder" },
                  text: "PCs damaged must EGO save or move away from the user." }),
    morale("fleeing the wielder", { when: "attack-hit", if: [{ gate: "is-pc", is: false }, bio], do: { verb: "forced-move", how: "flee the wielder" },
             text: "Biological targets must Morale save or flee the wielder." })],
  "Anti-Paradoxical": [prop("anti-paradoxical")],
  "Blasting":  [prop("blast"), { when: "attack-roll", do: { verb: "reminder" }, text: "Can hit multiple targets in the same area. Roll to-hit once and compare to the AV score of all targets." }],
  "Blinding":  [save("dex", "a round of blindness", { when: "attack-hit", do: { verb: "condition", state: "blind" }, for: { duration: "rounds", amount: 1 }, text: "Targets DEX Save vs a round of blindness." })],
  "Concussive": [prop("bludgeoning"),
                 save("str", "being moved away from their location", { when: "attack-hit", do: { verb: "forced-move", how: "moved away from their location" }, text: "Targets STR save or are moved away from their location." })],
  "Corrosive": [prop("corrosive"),
                { when: "attack-hit", if: [{ gate: "targets-armour" }], do: { verb: "modify", stat: "armour-damage", amount: "+1", instead: "damage" },
                  text: "Degrades AV. On hit, either deals damage or reduces target's AV score by one (attacker's choice)." }],
  "Electrical": [prop("electrical"),
                 { when: "attack-hit", if: [{ gate: "submerged" }], do: { verb: "modify", stat: "damage", amount: "x2" },
                   text: "Double damage to ... targets submerged in water." }],
  "Entangling": [save("dex", "becoming Entangled", { when: "attack-hit", do: { verb: "condition", state: "entangled" }, text: "Targets DEX Save or become Entangled." })],
  "Eroding":   [prop("eroding"),
                { when: "attack-hit", if: [{ gate: "target-is-object" }], do: { verb: "modify", stat: "damage", amount: "x2" },
                  text: "Double damage to ... static structures." }],
  "Flaming":   [prop("flame"),
                // Chunk 4 ruling 2: asked before the roll - the wielder underwater
                // stops the attack, a submerged target is left out.
                { when: "attack-roll", if: [{ gate: "underwater" }], do: { verb: "forbid", what: "attack" },
                  text: "Cannot be used underwater." },
                { when: "attack-roll", if: [{ gate: "submerged" }], do: { verb: "forbid", what: "attack" },
                  text: "Cannot be used against submerged opponents." },
                { when: "attack-hit", do: { verb: "reminder" }, text: "Ignites flammable objects." }],
  "Freezing":  [prop("freezing"),
                { when: "attack-hit", do: { verb: "ability-damage", ability: "dex", dice: "1d4" }, text: "Targets suffer d4 DEX damage in addition to base damage." },
                { when: { trigger: "value-reaches", value: "dex", threshold: 0 }, do: { verb: "condition", state: "paralysed", name: "Frozen solid" },
                  text: "At 0 DEX, they are frozen solid and cannot move." }],
  "Heavy":     [stat("damage-dice", "+1"), slots(2), strAtLeast(3)],
  "Hypergeometric": [prop("hypergeometric")],
  "Mauling":   [{ when: "attack-hit", if: [{ gate: "target-av", is: { atMost: 13 } }], do: { verb: "modify", stat: "damage-dice", amount: "+1" },
                  text: "Extra die of damage against targets with AV 13 or lower." },
                { when: "attack-hit", if: [{ gate: "target-av", is: { atLeast: 16 } }], do: { verb: "modify", stat: "damage", amount: "x0.5" },
                  text: "Deals halved damage to opponents with AV 16 or higher." }],
  "Parasitic": [{ when: "passive", do: { verb: "forbid", what: "unequip" }, text: "The weapon is alive and cannot be unequipped without surgery." },
                { when: "passive", do: { verb: "upkeep", item: "Ration", per: "day", times: 2 }, text: "The user must consume double rations each day." },
                // Chunk 5c (Matt, 2026-10-05): "reloading" is the ammo die, so the
                // die is never rolled down at the end of a combat.
                { when: "passive", do: { verb: "forbid", what: "deplete-ammo" }, text: "It does not need to reload." }],
  "Piercing":  [{ when: "attack-hit", if: [{ gate: "target-av", is: { atLeast: 16 } }], do: { verb: "modify", stat: "damage-dice", amount: "+1" },
                  text: "Extra die of damage against targets with AV 16 or higher." },
                { when: "attack-hit", if: [{ gate: "target-av", is: { atMost: 13 } }], do: { verb: "modify", stat: "damage", amount: "x0.5" },
                  text: "Deals halved damage to opponents with AV 13 or lower." }],
  "Psyche-Suppressant": [prop("psyche-suppressant"),
                { when: "passive", do: { verb: "forbid", what: "use-gift" }, text: "Cannot use Mystic Gifts while holding." }],
  "Strong":    [stat("damage-dice", "+1"), { when: "passive", state: "carried", do: { verb: "forbid", what: "break" }, text: "If the weapon would break, it does not." }],
  // Ruling F: on ANY natural 1, not only when the weapon also breaks.
  "Unstable":  [{ when: "attack-roll", if: [{ gate: "natural-roll", is: { equals: 1 } }], target: "self", do: { verb: "damage", dice: "2d6" }, mode: "auto",
                  text: "If user rolls a 1, the weapon explodes and deals 2d6 damage to the wielder." },
                { when: "attack-roll", if: [{ gate: "natural-roll", is: { equals: 1 } }], target: "this-item", do: { verb: "item-state", state: "destroyed", by: "explode" },
                  text: "the weapon explodes" }],
  "Vampiric":  [{ when: "attack-hit", if: [bio], target: "self", do: { verb: "heal", amount: "half-dealt" },
                  text: "When damaging biological creatures, wielder regains HP equal to half damage inflicted." }],

  /* ---------------- Exotic ---------------- */
  // Ruling F: any holder, NPCs included ("while held").
  "Aegis-Bearing": [{ when: "passive", do: { verb: "modify", stat: "av", amount: "+5" }, text: "Projects a personal warding field. Grants +5 AV while held." }],
  "Annihilating": [save("con", "crumbling to dust", { when: "attack-hit", do: { verb: "kill", how: "crumble to dust" }, text: "Target must CON save or crumble to dust." }),
                   { when: "on-draw", target: "self", do: { verb: "max-hp", amount: "-1" }, text: "Wielder loses 1 max HP each time this weapon is drawn." }],
  "Autarch's":   [stat("damage-dice", "+3")],
  "Blood-Rapturous": [{ when: "on-kill", if: [bio], target: "self", do: { verb: "heal", amount: "victim-max-hp" },
                        text: "When a Biological creature is killed with this weapon, the user heals for the victim's maximum HP." }],
  "Colossal":    [stat("damage-dice", "x3"), slots(3), strAtLeast(6)],
  "Extra-Dimensional": [trade(5), prop("hypergeometric"), prop("anti-paradoxical")],
  "Hard Light":  [stat("slots", "=0"), notMetal()],
  "Heat-Seeking": [{ when: "attack-roll", if: [{ gate: "warm-blooded", default: { gate: "creature-type", is: "biological" } }], do: { verb: "auto-hit" },
                     text: "Always hits when targeting warm-blooded creatures." }],
  // Ruling F: never offered to a corrosion card either.
  // Chunk 4 ruling 1: Indestructible keeps an exploding Unstable weapon whole
  // ("destroy"); Strong forbids only breaking.
  "Indestructible": [{ when: "passive", state: "carried", do: { verb: "forbid", what: "break" }, text: "Cannot be broken or destroyed by any means, natural or supernatural." },
                     { when: "passive", state: "carried", do: { verb: "forbid", what: "destroy" }, text: "Cannot be broken or destroyed by any means, natural or supernatural." },
                     { when: "passive", state: "carried", do: { verb: "forbid", what: "corrode" }, text: "Cannot be broken or destroyed by any means, natural or supernatural." }],
  "Lithifying": [{ when: "attack-hit", do: { verb: "ability-damage", ability: "dex", dice: "1d8" }, text: "Targets take d8 DEX damage." },
                 { when: "attack-hit", do: { verb: "modify", stat: "av", amount: "+1" }, text: "Targets ... gain +1 AV." },
                 { when: { trigger: "value-reaches", value: "dex", threshold: 0 }, do: { verb: "condition", state: "paralysed", name: "Turned to stone" },
                   text: "At 0 DEX they turn to stone." }],
  "Nano-edged":  [stat("damage-dice", "+2")],
  "Necrotic":    [{ when: "attack-hit", if: [bio], do: { verb: "ability-damage", ability: "str", dice: "1d8" }, text: "Biological targets suffer d8 STR damage alongside base damage." }],
  "Neurotoxic":  [save("con", "instant death", { when: "attack-hit", if: [bio], do: { verb: "kill" }, text: "Biological targets CON Save vs instant death." })],
  "Polymorphic": [{ when: "passive", state: "carried", do: { verb: "special", handler: "polymorphic" },
                    text: "Can swap between two forms at will. Choose an alternate base melee type or base ranged type." }],
  "Reflecting":  [{ when: "when-missed", target: "attacker", do: { verb: "reflect" }, text: "Missed attacks against the wielder damage the attacker instead." }],
  "Psionic":     [{ when: "attack-roll", do: { verb: "modify", stat: "to-hit-ability", amount: "psy" }, text: "To-hit rolls made with PSY." },
                  { when: "attack-hit", do: { verb: "modify", stat: "damage", amount: "+@ego" }, text: "EGO added to damage." }],
  "Rocket Boosted": [{ when: "attack-hit", if: [{ gate: "charging" }, { gate: "attack-kind", is: "melee" }], do: { verb: "damage", dice: "1d12" },
                       text: "+d12 damage when charging into melee range." },
                     { when: "use", do: { verb: "reminder" }, text: "Can be used to gain altitude." }],
  "Stim-Boosting": [{ when: "passive", do: { verb: "reminder" }, text: "Boosts the wielder's reaction times. Make one extra combat action per round." }],
  "Ultra-Corrosive": [prop("corrosive"),
                      { when: "attack-hit", do: { verb: "modify", stat: "armour-damage", amount: "+2" }, text: "Reduces AV by -2 on a hit." },
                      { when: "attack-hit", do: { verb: "ability-damage", ability: "con", dice: "1d8" }, text: "Targets take d8 CON damage alongside base damage." }],
  "Vibroactive": [{ when: "attack-roll", do: { verb: "ignore-armour" }, text: "Hits as though target was unarmoured." }],

  /* ---------------- Not a roster tag: every Advanced and Exotic weapon ---------------- */
  "Fragile": [{ when: "attack-roll", if: [{ gate: "natural-roll", is: { equals: 1 } }], target: "this-item", do: { verb: "item-state", state: "broken", by: "break" },
                text: "If the wielder rolls a 1 while making an attack roll, the weapon breaks." }]
};

// Plain data throughout: a JSON round trip changes nothing, so the stored
// form and this file always agree.
// Each tag as { effects: [...] } - the shape every roster entry carries, so
// tools/test-effect-vocabulary.mjs validates these with every other roster.
export const WEAPON_TAG_EFFECTS = Object.fromEntries(
  Object.entries(TAG_SENTENCES).map(([name, list]) => [name, { effects: list.map(stripUndefined) }]));

/**
 * A weapon's TIER as stat sentences (Stats as Sentences chunk 2d-i, RULED
 * 2026-10-07): an Advanced weapon is worth double, after its tags (Matt,
 * 2026-09-05 - tag-modifiers.js TIER_TRADE_MULTIPLIERS, which
 * tools/test-weapon-tags.mjs holds this to). Exotic is deliberately not here.
 * Read only for a live weapon, beside its flags.vaarn.tier.
 */
export const TIER_SENTENCES = {
  "Advanced": [trade(2)]
};
