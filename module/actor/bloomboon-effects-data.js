/**
 * The Bloomboons as effect sentences - Effect Engine: Consumables, chunk 1
 * (foundry-system-index.csv "Effect Engine: Consumables", BUILD PLAN RULED
 * 2026-10-06 by Matt).
 *
 * One entry per row of the Neobloom's bloomboon_table (chargen-data.js
 * SPARK_TABLES), keyed by the row's name - which is the Bloomboons rule Item's
 * `variant` (ruling C: read by the variant, never the Item's name, which is
 * always "Bloomboons"). Checked both ways by tools/test-consumable-effects.mjs.
 *
 * READ THIS BEFORE EDITING:
 *  - THE BOOK'S WORDS ARE THE TABLE'S: every text is the row's `effect`.
 *  - A USE is the rule Item's use control, as today. "Once per day" - the five
 *    boons whose words say so - is a per-day cost of 1 (Bloomboon Daily Use,
 *    RULED 2026-10-09, Matt), spent from the rule Item's pool as a once-a-day
 *    mutation's is. It was the table's until then (chunk 3b ruling 1).
 *  - GROWING a part, a fruit or retainers is the `grow` handler carrying the
 *    row's spec (bloomboon-growth.js reads the same shape).
 *  - Mirrored Leaves is the save-gated handler with the row's whole spec, as
 *    the Mirror Shield's (Implants, Exotica and Figments chunk 5).
 *  - Grafting, Luftpods and Vantablossom carry no field: a passive reminder.
 *  - A save the targets make carries the use's line as `says` - "releases
 *    <b>X</b> — <its words>", the line the sheet posted (chunk 3b ruling 2).
 *
 * Pure data: no Foundry global.
 */

import { SPARK_TABLES } from "./chargen-data.js";

const TABLE = SPARK_TABLES["Neobloom"]?.bloomboon_table ?? [];
const row = name => TABLE.find(b => b.name === name);
const bookText = name => row(name)?.effect ?? "";
const bio = { gate: "creature-type", is: "biological" };
const targetsGate = name => (row(name)?.save?.targets ?? []).includes("biological") ? { if: [bio] } : {};

const use = (name, d, extra = {}) => ({ when: "use", ...extra, do: d, text: bookText(name) });
const note = name => ({ when: "passive", do: { verb: "reminder" }, text: bookText(name) });
const grow = name => use(name, { verb: "special", handler: "grow", ...row(name).grows });
// A save the targets make against what the row applies, or against the row's own words.
const compel = (name, d, extra = {}) =>
{
  const s = row(name).save;
  return use(name, d, { target: "all-in-range", ...targetsGate(name), says: `releases <b>${name}</b> — ${bookText(name)}`,
                        resist: { type: "save", ability: s.ability, vs: s.vs }, ...extra });
};
const applied = (name, extra = {}) =>
{
  const a = row(name).applies;
  return compel(name, { verb: "reminder", name: a.effect, effectText: a.text },
    { ...(a.amount ? { for: { duration: `${a.unit}s`, amount: a.amount } } : { for: { duration: "until-referee" } }), ...extra });
};
// The book's "once per day" (Bloomboon Daily Use, 2026-10-09).
const daily = { cost: { kind: "per-day", n: 1 } };

const BLOOMBOON_SENTENCES = {
  "Barbed Bark": [{ when: "when-missed", if: [{ gate: "attack-kind", is: "melee" }], target: "attacker", do: { verb: "damage", dice: "@level" }, text: bookText("Barbed Bark") }],
  "Blast Pods": [grow("Blast Pods")],
  "Empathogen Pollen": [applied("Empathogen Pollen", daily)],
  "Grafting": [note("Grafting")],
  "Glue Resin": [compel("Glue Resin", { verb: "reminder" }, daily)],
  "Lashing Vines": [grow("Lashing Vines")],
  "Luftpods": [note("Luftpods")],
  "Medicinal Fruit": [grow("Medicinal Fruit")],
  "Mirrored Leaves": [use("Mirrored Leaves", { verb: "special", handler: "save-gated", ...row("Mirrored Leaves").saveGated })],
  "Neurotoxic Pollen": [compel("Neurotoxic Pollen", { verb: "reminder" }, daily)],
  "Oily Sap": [applied("Oily Sap", daily)],
  "Puppeteer Roots": [applied("Puppeteer Roots")],
  "Sapling Retainers": [use("Sapling Retainers", { verb: "special", handler: "grow", retainers: row("Sapling Retainers").retainers })],
  "Seed Cannon": [grow("Seed Cannon")],
  "Shield Vines": [grow("Shield Vines")],
  "Soporific Pollen": [applied("Soporific Pollen", daily)],
  "Tesla Bloom": [grow("Tesla Bloom")],
  "Toxic Fruit": [grow("Toxic Fruit")],
  "Vampiric Roots": [use("Vampiric Roots", { verb: "special", handler: "hold", ...row("Vampiric Roots").hold }, { target: "one-target", if: [bio] })],
  "Vantablossom": [note("Vantablossom")],
};

export const BLOOMBOON_EFFECTS = Object.fromEntries(Object.entries(BLOOMBOON_SENTENCES).map(([name, effects]) => [name, { effects }]));
