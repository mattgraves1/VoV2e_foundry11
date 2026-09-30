/**
 * Vaarn: Generate Quantum Daemon
 *
 * GM-only tool: rolls a brand-new Quantum Daemon (Identity, and one Attack and
 * Ability for a Lesser, two of each for a Greater) and creates a real npc Actor
 * for it — same "wholly new creature, not a Bestiary lookup" shape as
 * macros/generate-monster.js. Ported from npc-generator.html's
 * QUANTUM_DAEMON_STATS/renderQuantumDaemonContent.
 *
 * LEVEL, AV AND MORALE ARE ROLLED ON THE SHEET, not here. RULED 2026-09-21
 * (Matt): the daemons get the treatment the bestiary gives creatures whose
 * stats are dice (Rolled Creature Stat, module/actor/rolled-stat.js). The
 * Actor is built at the fixed part of each stat - Level 0 and 0 HP, AV 8 or
 * 10, Morale 0 - and carries a Roll for Level, Roll for AV and Roll for Morale
 * Item. Each rolls the book's dice, writes the stat, and is removed. Roll for
 * Level sets HP at four a Level, which is the book's own printed range:
 * "Level d6 (4 - 24 HP)", "Level 3d6 (12 - 72 HP)". The old HP method choice
 * went with it.
 *
 * The book's Lesser/Greater stat block (Miscellany/Quantum Daemons.md) notes
 * that Daemons are "Incorporeal: the Daemon does not actually exist and cannot
 * be harmed nor harm others unless forced to manifest itself." The biography
 * says so, for GM context.
 *
 * The Actor is made by module/actor/quantum-daemon.js (moved there 2026-09-27
 * for vault special rooms), in the same "Generated Creatures" folder macros/
 * generate-companion.js and generate-monster.js use.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose Lesser or Greater, then
 * Create.
 */

async function generateQuantumDaemon(size)
{
  const { createQuantumDaemon } = await import("/systems/vaarn/module/actor/quantum-daemon.js");
  const actor = await createQuantumDaemon(size);
  ui.notifications.info(`Created "${actor.name}" (${size} Quantum Daemon) in the "Generated Creatures" folder. Roll its Level, AV and Morale from its sheet.`);
}

function openDialog()
{
  const content = `
    <div class="form-group">
      <label>Size</label>
      <select id="vaarn-qd-size">
        <option value="Lesser">Lesser</option>
        <option value="Greater">Greater</option>
      </select>
    </div>`;

  new Dialog(
  {
    title: "Generate Quantum Daemon",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) => generateQuantumDaemon(html.find("#vaarn-qd-size").val())
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

openDialog();
