/**
 * Vaarn: Generate Settlement
 *
 * GM-only tool: makes a settlement by the book's Mapping a Settlement procedure (Settlements, JADE IBIS) and
 * writes it as a journal in the "Settlements" folder - an Overview page and a page per marked location (the
 * seat of power, water source, major assets, the major problem, notable buildings and landmark), each location
 * with Make an NPC here. Settlement Creation, foundry-system-index.csv; the generator is
 * module/settlement/settlement-generator.js and the journal module/settlement/settlement-journal.js.
 *
 * REPLACED 2026-10-08, and this CHANGED what the macro does: until then it posted a GM-whispered chat card of
 * the overview, a major asset, four buildings and a landmark. RULED 2026-10-03 (Matt): the macro keeps its name
 * and runs Settlement Creation instead, so a GM who already uses it finds it still works. The settings are
 * Matt's ruled defaults. Since chunk 5 (2026-10-08) it opens the preview window first (settlement-window.js), where
 * the GM changes them, drags places and renames the town, then presses Create settlement.
 * Since chunk 3 (2026-10-08) it also makes the map Scene in Settlement Scenes (settlement-scene.js): the town's
 * layout painted, every place a hidden icon and label for the GM to reveal, and a GM pin per place.
 *
 * A settlement's name never repeats one already in the world's Settlements (by what the name is built on), and
 * a founder who already founded one is linked both ways.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it to the hotbar.
 */

async function generateSettlement()
{
  const { openSettlementWindow } = await import("/systems/vaarn/module/settlement/settlement-window.js");
  return openSettlementWindow();
}

generateSettlement();
