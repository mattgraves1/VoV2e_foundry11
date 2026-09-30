/**
 * Vaarn: Generate Mutation
 *
 * GM-only tool for granting a single mutation during play (work-queue.txt
 * item 16 — a character being mutated outside chargen: Cacogen's own
 * "Proteus" text names re-rolling a mutation at level-up as a real rule,
 * and any character can become mutated through other in-play events too).
 * Not for chargen's own "Corrupted Blood" flow (Cacogen rolls THREE of
 * these at character creation via the wizard's own Step 2 — see
 * chargen-app.js's `_rollMutations()`); this macro is for granting exactly
 * ONE mutation to an already-existing character. `MUTATION_TABLE` is a
 * single universal d100 table with no ancestry-specific variant — nothing
 * here needs to ask which ancestry the target belongs to.
 *
 * Creates an UNOWNED `mutation` Item in the Items sidebar (same "no
 * assign-to-actor prompt" convention as every other Phase 1 macro, Matt's
 * ruling 2026-08-21) for the GM to drag onto an actor by hand. No dialog —
 * same shape as Generate Advanced Implant/Starting Implant, and same
 * plain `{slots, roll, description}` shape chargen-app.js's own mutation
 * Item creation already uses — no per-entry mechanical fields are stored
 * on the Item itself (item-effects.js's bake hook looks these up by NAME
 * against the static MUTATION_TABLE once the Item lands on an actor, same
 * as every other mutation/implant regardless of how it was created).
 *
 * EXTRA EYES (roll 33) is the one entry whose bonus is itself randomized
 * (d3 extra eyes, +1 PSY each) rather than a fixed number in
 * mutation-data.js. Deliberately NOT special-cased here — rolling it at
 * MACRO time and storing it on this still-unowned Item would do nothing,
 * since item-effects.js's bake hook reads the static table by name, not
 * the Item's own data. It's special-cased once, in item-effects.js
 * itself, at the moment the Item actually lands on an actor — the one
 * place that's true no matter how the Item was created (this macro, a
 * future level-up reroll, or a GM's own manual Item creation).
 *
 * item-effects.js's createItem hook (work-queue item 15) bakes this
 * mutation's abilityMod/hpBonus/slotBonus/handsBonus/naturalWeapon onto
 * whichever actor it's later dragged onto.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create one Item immediately.
 */

async function generateMutation()
{
  const { MUTATION_TABLE } = await import("/systems/vaarn/module/actor/mutation-data.js");
  const { d } = await import("/systems/vaarn/module/actor/chargen-app.js");

  const roll = d(100);
  const entry = MUTATION_TABLE[roll - 1];

  const itemCls = getDocumentClass("Item");
  const item = await itemCls.create(
  {
    name: entry.name,
    type: "mutation",
    system:
    {
      slots: 0,
      roll,
      description: `<p><b>d100 roll:</b> ${roll}</p><p>${entry.effect}</p>`
    }
  });

  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateMutation();
