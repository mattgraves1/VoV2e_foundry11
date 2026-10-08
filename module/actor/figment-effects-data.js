/**
 * The Autarch figments as effect sentences - Effect Engine: Implants, Exotica
 * and Figments, chunk 1 (foundry-system-index.csv "Effect Engine: Implants,
 * Exotica and Figments", BUILD PLAN RULED 2026-10-06 by Matt).
 *
 * One entry per FIGMENTS name (figments.js, a view over rolltable-data.js's
 * "Autarch Figment Effects"), checked both ways by
 * tools/test-implant-exotica-effects.mjs.
 *
 * READ THIS BEFORE EDITING:
 *  - `text` is the book's own words, from the figment's Effect line.
 *  - BAKED (ruling A): the Hypergeometric creature type, Gut's +1 Level,
 *    Nerves' ability changes and the Eye's and Maw's natural weapons are
 *    written once when the figment is gained, and taken back when it goes
 *    (item-effects.js). Gut's +3 AV is live, as an implant's AV is.
 *
 * Pure data: no Foundry global.
 */

const baked = (verb, params, text) => ({ when: "stat", baked: true, do: { verb, ...params }, ...(text ? { text } : {}) });
const hypergeometric = () => baked("add-creature-type", { type: "hypergeometric" }, "Bearer gains the Hypergeometric creature type.");

const FIGMENT_SENTENCES = {
  "Autarch Figment: Eye": [
    baked("create-item", { item: "Paradox Lance", natural: true }, "Bearer can cry lances of paradox energy (d10, beam, hypergeometric)."),
    hypergeometric()],
  "Autarch Figment: Gut": [
    { when: "passive", do: { verb: "modify", stat: "av", amount: "+3" }, text: "Bearer gains +3 AV and +1 Level." },
    baked("level", { amount: "+1" }, "Bearer gains +3 AV and +1 Level."),
    hypergeometric()],
  "Autarch Figment: Maw": [
    baked("create-item", { item: "Autarch Maw", natural: true }, "At close range, they make an additional bite attack every round (d10, hypergeometric)."),
    hypergeometric()],
  "Autarch Figment: Nerves": [
    baked("modify", { stat: "int", amount: "+1" }), baked("modify", { stat: "psy", amount: "+1" }), baked("modify", { stat: "ego", amount: "+1" }),
    { when: "use", target: "one-target", resist: { type: "save", ability: "dex", vs: "entangled" },
      do: { verb: "condition", state: "entangled" }, for: { duration: "until-referee" },
      text: "Bearer may extrude the Autarch's nerves to snare an opponent (DEX Save vs entangled)." },
    hypergeometric()]
};

const stripUndefined = s => JSON.parse(JSON.stringify(s));

export const FIGMENT_EFFECTS = Object.fromEntries(
  Object.entries(FIGMENT_SENTENCES).map(([name, list]) => [name, { effects: list.map(stripUndefined) }]));
