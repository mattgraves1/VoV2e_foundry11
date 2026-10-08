/**
 * The named one-off handlers a mutation's or an ancestry rule's use runs -
 * Effect Engine: Mutations and Ancestry Rules, chunk 4 (foundry-system-index.csv
 * "Effect Engine: Mutations and Ancestry Rules", BUILD PLAN RULED 2026-10-05,
 * CHUNK 4 RULED 2026-10-06 by Matt).
 *
 * The sheet's use controls run the Item's use sentence through the
 * interpreter (runUse), which settles its gates and pays its cost first - the
 * daylight question for Leaves and Photosynthesis, Ink Ducts' and Gas Glands'
 * daily pool. A `special` sentence then lands here by its handler name.
 *
 *  - self-save: the bearer's own Save (Frog Tongue, Twice Born), with the
 *    body's save modifiers as every Save takes them (RULED 2026-10-06).
 *  - hourly-heal: one hour's healing (Leaves, Photosynthesis); the hour is
 *    the table's (Hour-Long Healing on the Activity Clock, DECLINED).
 *  - the ancestry one-offs (Ambusher, Inheritor, Worm Wise, Repairs, Spores,
 *    Bloomboons) keep the code they had, which lives on the sheet beside the
 *    roller and the dialogs it uses.
 */
import { registerUseHandler } from "../effects/interpreter.js";
import { fillFormula } from "../effects/interpret.js";

const ABILITIES = ["str", "dex", "con", "int", "psy", "ego"];

registerUseHandler("self-save", ({ actor, item, params, event }) =>
{
  const ability = params.ability;
  actor.sheet._rollD20(actor.system.abilities[ability].effective, `${item.name} — ${ability.toUpperCase()} Save`,
                       event, ...actor.sheet._ownSaveMods(ability));
});

registerUseHandler("hourly-heal", ({ actor, item, params }) =>
{
  const abilities = Object.fromEntries(ABILITIES.map(a => [a, actor.system.abilities?.[a]?.effective ?? null]));
  const { formula } = fillFormula(params.dice, { abilities });
  return actor.sheet._hourlyHeal(actor, formula, `<b>${item.name}</b> — ${params.hour}`, params.says, params.doing);
});

for (const handler of ["ambusher", "inheritor", "worm-wise", "repairs", "spores", "bloomboons"])
  registerUseHandler(handler, ({ actor, item, event }) => actor.sheet._ancestryOneOff(handler, item, event));

// The implant one-offs (Implants, Exotica and Figments chunk 3a, 2026-10-06):
// their code stays on the sheet, keyed by handler.
for (const handler of ["trauma-rig", "berserker-stimrig", "magnetised-palms"])
  registerUseHandler(handler, ({ actor, item, event }) => actor.sheet._implantOneOff(handler, item, event));

// The Exotica one-offs (Implants, Exotica and Figments chunk 3b, 2026-10-06):
// their code stays on the sheet, keyed by handler, their figures from the
// sentence. A handler answering { keep: true } keeps its charge.
for (const handler of ["amaranthine-sugar", "cybernetics-capsule", "belligerent-paste", "field-generator",
                       "blue-rust", "body-change", "metal-pull", "hold", "universal-ration", "save-gated", "combat-av", "combat-auto-hit"])
  registerUseHandler(handler, ({ actor, item, params, event }) => actor.sheet._exoticaOneOff(handler, item, params, event));

// The elixir drinks (Effect Engine: Consumables chunk 3a, 2026-10-06): their code
// stays on the sheet, keyed by handler, their figures from the sentence. An
// Elixir is a generic Item; the permanent-ability handler is also an Exotica's
// (Autarch's Nectar), so it is routed by the Item's type.
for (const handler of ["stateful", "grant-ability", "clone", "bifurcate", "set-hp", "spawn", "grant-pick", "grant-roll",
                       "baked-item", "grant-fixed", "permanent-change"])
  registerUseHandler(handler, ({ actor, item, params, sentence }) => actor.sheet._elixirOneOff(handler, item, params, sentence));
// A Bloomboon's growth (Consumables chunk 3b, 2026-10-06): the sentence's spec to
// the sheet's growth and retainer code, as the table row used to be.
registerUseHandler("grow", ({ actor, item, params, sentence }) => actor.sheet._bloomboonGrow(item, params, sentence));
registerUseHandler("permanent-ability", ({ actor, item, params, event, sentence }) => item.type === "item"
  ? actor.sheet._elixirOneOff("permanent-ability", item, params, sentence)
  : actor.sheet._exoticaOneOff("permanent-ability", item, params, event));
