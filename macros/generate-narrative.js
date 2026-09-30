/**
 * Vaarn: Generate Narrative
 *
 * GM-only tool combining the 18 remaining "roll each column independently"
 * generators from C:\Vaarn\Vaarn\npc-generator.html (Fine Dining, Names of
 * Vaarn, Story Seeds, Assassins, Petty Gods, Autarch, You Found a Corpse,
 * Fortress, Oasis, Trade Post, Minor Faction, Anomaly, Archive, Arcology,
 * Bandit Camp, Trade Caravan, Vault Entrance/Tunnels/Original Function,
 * NPC Virtues and Vices) into one macro with a Category picker — same
 * "one macro, N categories via dropdown" shape as macros/
 * generate-flavor-item.js, since every one of these is narrative/GM-
 * reference content rather than a physical object, so this posts a chat
 * message instead of creating an Item.
 *
 * Data lives in module/actor/composite-generator-data.js (extracted from
 * the tool's own DATA JSON, group/roll shape copied from its
 * INDEPENDENT_ROLL_CONFIGS — see that file's header). The actual roll
 * engine lives in module/actor/composite-roller.js (shared with macros/
 * generate-companion.js, which needs the same engine for Bandit Camp's own
 * flavor table alongside its companion-creature spawn) — this macro is
 * just the dialog and chat-posting.
 *
 * A few of these (Minor Faction's Leader, Bandit Camp) also spawn a
 * companion creature/NPC in the original tool — see macros/
 * generate-companion.js (work-queue.txt item 1 Phase 3) for that half;
 * this macro only produces the flavor text.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose a Category, then Create.
 */

async function generateNarrative(key)
{
  const { rollGeneratorHtml } = await import("/systems/vaarn/module/actor/composite-roller.js");
  const generator = COMPOSITE_GENERATORS_CACHE.find(g => g.key === key);

  const content = `<h3>${generator.heading}</h3>${rollGeneratorHtml(generator)}`;
  ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), user: game.user._id, content });
}

function openDialog()
{
  const options = COMPOSITE_GENERATORS_CACHE.map(g => `<option value="${g.key}">${g.heading}</option>`).join("");
  const content = `
    <div class="form-group">
      <label>Category</label>
      <select id="vaarn-gn-category">${options}</select>
    </div>`;

  new Dialog(
  {
    title: "Generate Narrative",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const key = html.find("#vaarn-gn-category").val();
          generateNarrative(key);
        }
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

let COMPOSITE_GENERATORS_CACHE;
(async () =>
{
  const { COMPOSITE_GENERATORS } = await import("/systems/vaarn/module/actor/composite-generator-data.js");
  COMPOSITE_GENERATORS_CACHE = COMPOSITE_GENERATORS;
  openDialog();
})();
