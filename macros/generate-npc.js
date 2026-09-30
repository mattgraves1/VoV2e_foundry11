/**
 * Vaarn: Generate NPC
 *
 * GM-only tool: rolls a full civilian NPC's personality and — unlike
 * work-queue.txt item 1 Phase 2's Generate Narrative macro — actually
 * spawns a real world Actor for it, cloned from a matching creature in the
 * Vaarn Bestiary compendium. Ported from npc-generator.html's
 * buildNPC/pickBestiaryStatblock. All the actual roll/clone logic lives in
 * module/actor/npc-builder.js (shared with macros/generate-companion.js's
 * Oracle's Sanctum/Minor Faction Leader categories, which need the exact
 * same "roll a full random NPC" path) — this macro is just the dialog and
 * orchestration.
 *
 * Creates the Actor in a "Generated NPCs" folder. If no Bestiary creature
 * matches (or "Include Bestiary stat block" is unchecked), no Actor is
 * created — the rolled personality is posted as a chat message only, same
 * as the source tool's own text-only fallback.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose Ancestry (or Random), an
 * optional Level to match, whether to include a Bestiary stat block and
 * whether to prefer an ancestry-specific creature over a type-matched one,
 * then Create.
 */

async function generateNPC(ancestry, knownLevel, includeStatBlock, preferAncestry)
{
  const { buildNPC, buildBioHtml, buildAndSpawnNPC } = await import("/systems/vaarn/module/actor/npc-builder.js");

  if(!includeStatBlock)
  {
    const npc = await buildNPC(ancestry);
    const bioHtml = buildBioHtml(npc);
    ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), user: game.user._id, content: `<h3>${npc.name}</h3>${bioHtml}` });
    return;
  }

  const { npc, bioHtml, actor } = await buildAndSpawnNPC(ancestry, knownLevel, preferAncestry, "Generated NPCs");

  if(!actor)
  {
    ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), user: game.user._id, content: `<h3>${npc.name}</h3>${bioHtml}<p><i>No matching Bestiary creature found — no Actor created, personality only.</i></p>` });
    return;
  }

  ui.notifications.info(`Created "${actor.name}" in the "Generated NPCs" folder.`);
}

function openDialog()
{
  const ancestries = ["Cacklemaw Exile", "Cacogen", "Faa Nomad", "Lithling", "Mycomorph", "Neobloom", "Newbeast", "Planeyfolk", "Synth", "True-kin"];
  const ancestryOptions = ["<option value=\"\">Random</option>", ...ancestries.map(a => `<option value="${a}">${a}</option>`)].join("");
  const content = `
    <div class="form-group">
      <label>Ancestry</label>
      <select id="vaarn-npc-ancestry">${ancestryOptions}</select>
    </div>
    <div class="form-group">
      <label>Level to match (optional)</label>
      <input type="number" id="vaarn-npc-level" min="0" placeholder="any">
    </div>
    <div class="form-group">
      <label>Include Bestiary stat block</label>
      <input type="checkbox" id="vaarn-npc-statblock" checked>
    </div>
    <div class="form-group">
      <label>Prefer ancestry-specific creature</label>
      <input type="checkbox" id="vaarn-npc-prefer-ancestry" checked>
    </div>`;

  new Dialog(
  {
    title: "Generate NPC",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const ancestry = html.find("#vaarn-npc-ancestry").val() || null;
          const levelStr = html.find("#vaarn-npc-level").val();
          const level = levelStr === "" ? null : Number(levelStr);
          const includeStatBlock = html.find("#vaarn-npc-statblock").is(":checked");
          const preferAncestry = html.find("#vaarn-npc-prefer-ancestry").is(":checked");
          generateNPC(ancestry, level, includeStatBlock, preferAncestry);
        }
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

openDialog();
