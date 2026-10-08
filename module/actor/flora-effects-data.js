/**
 * The Flora of Vaarn as effect sentences - Effect Engine: Consumables, chunk 1
 * (foundry-system-index.csv "Effect Engine: Consumables", BUILD PLAN RULED
 * 2026-10-06 by Matt).
 *
 * One entry per plant that is carried as an Item (flora-data.js FLORA with an
 * `item`), keyed by the Item's name - ruling B: the translator finds a plant by
 * name, so a plant made before reads the same sentences. Checked both ways by
 * tools/test-consumable-effects.mjs. The Martyr Tree is carried by nobody and
 * has no entry.
 *
 * READ THIS BEFORE EDITING:
 *  - THE BOOK'S WORDS ARE THE ROSTER'S: a sentence's text is the plant's `rule`,
 *    or its `note` where the book gives it no rule.
 *  - The four flags buildFlora wrote (toxDie, toxLapses, endGrant, spanApplied)
 *    are sentences here; since chunk 3c (2026-10-06) the readers read these and
 *    buildFlora no longer writes the flags. A plant is "eaten" by starting its
 *    hourglass (round-effects.js activate) - it has no use control and is not
 *    spent, so its use sentence carries no cost.
 *  - A plant whose words change no roll is a passive reminder (ruling B).
 *  - BAKED (ruling A): a weapon plant's damage dice.
 *  - BUILT ON FIRST READ (floraEffects()), not at import: flora-data.js reaches
 *    declared-span.js, which closes a cycle back through the ancestry
 *    translator (Consumables chunk 2) if FLORA is read while modules load.
 *
 * Pure data: no Foundry global.
 */

import { FLORA } from "./flora-data.js";

const plant = name => FLORA.find(f => f.name === name);
const bookText = name => plant(name)?.rule || plant(name)?.note || "";
const spanOf = name => { const d = plant(name)?.declaredSpan; return d ? { for: { duration: `${d.unit}s`, amount: d.amount } } : {}; };
const note = name => ({ when: "passive", do: { verb: "reminder" }, text: bookText(name) });

const build = () => ({
  // Its poison holds only while the bloom is fresh (toxLapses): the span's `for`.
  "Avern Bloom": [{ when: "attack-hit", if: [{ gate: "creature-type", is: "biological" }], do: { verb: "toxin", die: plant("Avern Bloom").toxDie },
                    ...spanOf("Avern Bloom"), text: bookText("Avern Bloom") }],
  "Godsbreath Star": [{ when: "use", target: "self", do: { verb: "special", handler: "end-grant", ...plant("Godsbreath Star").endGrant },
                        ...spanOf("Godsbreath Star"), text: bookText("Godsbreath Star") }],
  "Ickbulb": [{ when: "use", target: "self", do: { verb: "special", handler: "stateful", ...plant("Ickbulb").spanApplied },
                ...spanOf("Ickbulb"), text: bookText("Ickbulb") }],
  "Luftwood Bough": [note("Luftwood Bough")],
  "Lumenwood Bough": [note("Lumenwood Bough")],
  "Seven-Fruit": [note("Seven-Fruit")],
  "Dried Swordgrass Leaf": [{ when: "stat", baked: true, do: { verb: "modify", stat: "damage-dice", amount: `=${plant("Dried Swordgrass Leaf").item.system.damageDice}` }, text: bookText("Dried Swordgrass Leaf") },
                            note("Dried Swordgrass Leaf")],
  "Trundleweed": [note("Trundleweed")],
  "Waterguide": [note("Waterguide")],
});

let cache = null;
/** { [plant Item name]: { effects } }, built on first read. */
export function floraEffects()
{
  return cache ??= Object.fromEntries(Object.entries(build()).map(([name, effects]) => [name, { effects }]));
}
