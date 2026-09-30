/**
 * Vaarn: Generate Crucible
 *
 * GM-only tool for handing out a rolled Alchemist's Crucible (loot, a
 * shop's stock, a quest reward) without going through full character
 * creation or rolling a Boon. Ported from the standalone GM-tools
 * generator (C:\Vaarn\Vaarn\npc-generator.html's "Crucible Quality and
 * Shape" combined table, Core Rules/Alchemy.md) — same CRUCIBLE_QUALITIES/
 * CRUCIBLE_SHAPES roll chargen-app.js's _rollCrucible already uses, MINUS
 * the auto-paired Elixir roll: unlike chargen's "Alchemist's Crucible and
 * an Elixir" Boon, this standalone table only rolls Quality and Shape, no
 * Elixir (confirmed against the standalone tool during work-queue.txt item
 * 1's audit — not an oversight).
 *
 * Creates an UNOWNED Item in the Items sidebar (Matt's call, 2026-08-21 —
 * no "assign to actor" prompt) for the GM to drag onto an actor by hand.
 * Nothing to configure, so this macro runs immediately with no picker
 * dialog, same as Generate Starting Gear.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and create the item.
 */

async function generateCrucible()
{
  const { CRUCIBLE_QUALITIES, CRUCIBLE_SHAPES } =
    await import("/systems/vaarn/module/actor/chargen-data.js");
  const { d } = await import("/systems/vaarn/module/actor/chargen-app.js");

  const quality = CRUCIBLE_QUALITIES[d(20) - 1];
  const shape = CRUCIBLE_SHAPES[d(20) - 1];
  const fullName = `${quality} ${shape}`;

  const itemCls = getDocumentClass("Item");
  const item = await itemCls.create(
  {
    name: fullName,
    type: "crucible",
    system:
    {
      slots: 1,
      description: `<p>Alchemist's Crucible — ${quality} quality, ${shape}-shaped. No recipes inscribed yet: see the Recipes tab.</p>`
    }
  });

  ui.notifications.info(`Created "${item.name}" in the Items directory.`);
  return item;
}

generateCrucible();
