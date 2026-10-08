/**
 * The Elixirs as effect sentences - Effect Engine: Consumables, chunk 1
 * (foundry-system-index.csv "Effect Engine: Consumables", BUILD PLAN RULED
 * 2026-10-06 by Matt).
 *
 * One entry per ELIXIRS name (chargen-data.js), checked both ways by
 * tools/test-consumable-effects.mjs against every field of the roster.
 *
 * READ THIS BEFORE EDITING:
 *  - THE BOOK'S WORDS ARE THE ROSTER'S: every sentence's text is the entry's
 *    `effect`, read from the roster, never a second transcription.
 *  - DRINKING runs each `use` sentence in order. An elixir is consumed by the
 *    drink (the `consumed` cost, on its first use sentence only).
 *  - A SPAN on the drink (the roster's declaredSpan) is the sentence's `for`.
 *    A passive or reactive sentence with a `for` holds only while the drink's
 *    span lasts - the Metallovore's metal, Hilarious Strength's laughter,
 *    Spineskin's quills, Regeneration's tick - read off the drinker's board
 *    entry of the elixir's name. Each is marked as in the drinker's body
 *    (state or requires "installed"), which a carried vial never is, so the
 *    readers of every carried Item's passives cannot read an undrunk one (found
 *    in Group 554: a carried Metallovore fed its holder Scrap Metal).
 *  - STATEFUL bundles (AV, abilities, doubles, conditions, light, creature
 *    types, ending on damage) are one `stateful` handler carrying the roster's
 *    bundle: the board entry's own machinery, not a verb per part.
 *  - A GRANTED ABILITY (Windsong, the Glitter Cloud, Neural Puppetry, Magnetic
 *    Draw, Exit the Frenzy) is the `grant-ability` handler carrying the roster's
 *    grant - and, where the granted use compels a save, the save and what it
 *    applies.
 *  - RULING D: Hollowheart Hooch's chest slots are the baked-item handler on
 *    the drink; the Item it makes bakes its slots (item-effects.js), as today.
 *  - CHUNK 3a (RULED 2026-10-06, Matt): every drink's first use sentence is the
 *    named handler that does it today (body-uses.js -> the sheet's
 *    _elixirOneOff), so each elixir's chat line stays word for word (ruling 4).
 *    The board-entry drinks - a stateful bundle, a span alone, and the drinks
 *    taken as text (asText, Cloning Jelly smeared rather than drunk, ruling 1)
 *    - are the stateful handler, the one path that posts those lines. Berserker
 *    Brew's "only during combat" is the in-combat gate: a STARTED combat
 *    (ruling 2).
 *
 * Pure data: no Foundry global.
 */

import { ELIXIRS } from "./chargen-data.js";

const entry = name => ELIXIRS.find(e => e.name === name);
const bookText = name => entry(name)?.effect ?? "";
const DRINK = { kind: "consumed" };
const spanOf = name => { const d = entry(name)?.declaredSpan; return d ? { for: { duration: `${d.unit}s`, amount: d.amount } } : {}; };

// The drink itself: consumed, on the drinker unless said otherwise.
const drink = (name, d, extra = {}) => ({ when: "use", cost: [DRINK], target: "self", ...extra, do: d, text: bookText(name) });
// The book's words as the drink's line, nothing tracked (drinkAsText; Cloning Jelly, which is smeared).
const asText = (name, act = null) => [drink(name, { verb: "special", handler: "stateful", asText: true, ...(act ? { act } : {}) })];
// The drink's board entry for its span, carrying the roster's stateful bundle if any.
const stateful = name => drink(name, { verb: "special", handler: "stateful", ...entry(name).stateful }, spanOf(name));
// A span and nothing mechanical: the same board entry, with no bundle.
const lasting = stateful;
const special = (name, handler, params, extra = {}) => drink(name, { verb: "special", handler, ...params }, extra);
// While the drink's span lasts - in the drinker, never in a carried vial.
const whileDrunk = (name, s) => ({ ...s, ...(s.when === "passive" ? { state: "installed" } : { requires: "installed" }), ...spanOf(name), text: bookText(name) });

const ELIXIR_SENTENCES = {
  "Babel Beer": asText("Babel Beer"),
  "Lumensoup": [stateful("Lumensoup")],
  "Oblivion Brew": asText("Oblivion Brew"),
  "Glassflesh Paste": [stateful("Glassflesh Paste")],
  "Fellowship Potion": [lasting("Fellowship Potion")],
  "Greentongue Potion": [lasting("Greentongue Potion")],
  "False Death Draught": [lasting("False Death Draught")],
  "Windsong Potion": [special("Windsong Potion", "grant-ability", { ...entry("Windsong Potion").grants }, spanOf("Windsong Potion"))],
  "Doppeldraught": [special("Doppeldraught", "clone", { ...entry("Doppeldraught").clone }, spanOf("Doppeldraught"))],
  "Spineskin Syrup": [stateful("Spineskin Syrup"),
    whileDrunk("Spineskin Syrup", { when: "when-missed", if: [{ gate: "attack-kind", is: "melee" }], target: "attacker", do: { verb: "damage", dice: "1d4" } })],
  "Hilarious Strength": [stateful("Hilarious Strength"),
    whileDrunk("Hilarious Strength", { when: "passive", do: { verb: "dis", on: "encounter", why: "laughing endlessly" } })],
  "Squishflesh Balm": [stateful("Squishflesh Balm")],
  "Metallovore Potion": [lasting("Metallovore Potion"),
    whileDrunk("Metallovore Potion", { when: "passive", do: { verb: "upkeep", item: "Food Ration", per: "day", also: ["Scrap Metal"] } })],
  "Plating Potion": [stateful("Plating Potion")],
  "Glittercough Tonic": [special("Glittercough Tonic", "grant-ability", { ...entry("Glittercough Tonic").grants,
    save: entry("Glittercough Tonic").save, applies: entry("Glittercough Tonic").applies })],
  "Growth Serum": [stateful("Growth Serum")],
  "Magnetic Stew": [special("Magnetic Stew", "grant-ability", { ...entry("Magnetic Stew").grants }, spanOf("Magnetic Stew"))],
  "Death Draught": [special("Death Draught", "set-hp", { amount: 0 })],
  "Puppeteer Potion": [special("Puppeteer Potion", "grant-ability", { ...entry("Puppeteer Potion").grants,
    save: entry("Puppeteer Potion").save, applies: entry("Puppeteer Potion").applies })],
  "Fakeface Paste": [lasting("Fakeface Paste")],
  "Skulk Salve": [lasting("Skulk Salve")],
  "Berserker Brew": [special("Berserker Brew", "grant-ability", { ...entry("Berserker Brew").grants }, { if: [{ gate: "in-combat" }] })],
  "Phasing Potion": [stateful("Phasing Potion")],
  "Lithification Syrup": [stateful("Lithification Syrup")],
  "Geneshock Tonic": [special("Geneshock Tonic", "grant-pick", { ...entry("Geneshock Tonic").grantsPick })],
  "Regeneration Serum": [stateful("Regeneration Serum"),
    whileDrunk("Regeneration Serum", { when: "each-round", target: "self", do: { verb: "heal", amount: "1d6" } })],
  "Obsession Philtre": asText("Obsession Philtre"),
  "Broodling Broth": [special("Broodling Broth", "spawn", { creature: entry("Broodling Broth").spawns.creature, count: entry("Broodling Broth").spawns.dice, loyal: entry("Broodling Broth").spawns.loyal })],
  "Biothermal Amplifier Tonic": [stateful("Biothermal Amplifier Tonic"),
    ...entry("Biothermal Amplifier Tonic").grants.map(g => whileDrunk("Biothermal Amplifier Tonic", { when: "use", target: "self", do: { verb: "add-gift", name: g.name } }))],
  "Lazarus Tonic": asText("Lazarus Tonic"),
  "Kalotoxin Injector": asText("Kalotoxin Injector"),
  "Bifurcating Brew": [special("Bifurcating Brew", "bifurcate", {}, spanOf("Bifurcating Brew"))],
  "Hollowheart Hooch": [special("Hollowheart Hooch", "baked-item", { item: entry("Hollowheart Hooch").bakedItem.name, slotBonus: entry("Hollowheart Hooch").bakedItem.slotBonus })],
  "Autarch's Ambrosia": [special("Autarch's Ambrosia", "permanent-ability", { ...entry("Autarch's Ambrosia").permanentAbility })],
  "Metamorphic Syrup": [special("Metamorphic Syrup", "grant-roll", { ...entry("Metamorphic Syrup").grantsRoll })],
  "Cloning Jelly": asText("Cloning Jelly", "uses"),
  "Transcendence Tonic": [special("Transcendence Tonic", "grant-pick", { ...entry("Transcendence Tonic").grantsPick })],
  "Recursive Infusion": [special("Recursive Infusion", "grant-fixed", { type: entry("Recursive Infusion").grantsFixed.type, name: entry("Recursive Infusion").grantsFixed.name, giftText: entry("Recursive Infusion").grantsFixed.text })],
  "Planeyfication Potion": [special("Planeyfication Potion", "permanent-change", { ...entry("Planeyfication Potion").permanentChange })],
  "Immortality Injector": [stateful("Immortality Injector")],
};

export const ELIXIR_EFFECTS = Object.fromEntries(Object.entries(ELIXIR_SENTENCES).map(([name, effects]) => [name, { effects }]));
