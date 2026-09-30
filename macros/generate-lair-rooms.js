/**
 * Vaarn: Generate Lair Rooms
 *
 * GM-only tool for the "inhabited vault node" roll: given a floor depth
 * (1-10), rolls that depth's column, following any "Roll on Depth N"
 * redirects to a final real result, then parses the result text for
 * individual creature mentions ("D4 Babble Birds", "2d6 Cacklemaw +
 * Virago" is TWO mentions — Cacklemaw and Virago, each parsed and
 * resolved separately), rolls each mention's quantity, and spawns a
 * matching Bestiary creature for each one that resolves. All of that
 * roll/parse/resolve/spawn logic lives in module/actor/
 * lair-rooms-roller.js (shared with macros/generate-room-contents.js,
 * which needs the exact same cascade for its own "Contents A: Lair"
 * branch) — this macro is just the dialog and chat-formatting. Ported
 * from npc-generator.html's rollLairRoomsAtDepth/
 * parseLairCreatureMentions/resolveLairCreatureName/
 * renderLairInhabitantCascade.
 *
 * Same "spawn one stat-block reference per mention, note the rolled
 * quantity, let the GM duplicate by hand" pattern as macros/
 * generate-companion.js's fixed-mode creatures — no automatic multi-actor
 * creation even for "D10 Grimpets" (one Grimpets Actor created, with a
 * "Rolled: N" note for how many the GM should treat it as representing).
 *
 * A mention that doesn't resolve to any Bestiary creature (after trying
 * the name as-is, a small alias table for irregular/renamed names, and
 * common singularization patterns) is reported as text only, same as the
 * source tool's "(not found in Bestiary)" fallback — "Blightstone Knight"
 * and "Glider Spiders" are confirmed genuine book-content gaps this way
 * (module/actor/lair-rooms-data.js's header), not something to guess at.
 * An empty node ("—") or a mount/vehicle mention (Steeds & Vehicles has no
 * Actor type yet — work-queue.txt's own "out of scope" call) also falls
 * through to text-only.
 *
 * Creates spawned Actors in the same "Generated Creatures" folder macros/
 * generate-companion.js and generate-monster.js use.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose a Depth (1-10), then Create.
 */

async function generateLairRooms(depth)
{
  const { rollAndSpawnLairInhabitants } = await import("/systems/vaarn/module/actor/lair-rooms-roller.js");

  let folder = game.folders.find(f => f.name === "Generated Creatures" && f.type === "Actor");
  if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });

  const { result, redirects, finalDepth, mentions } = await rollAndSpawnLairInhabitants(depth, folder.id);

  const lines = [`<h3>Lair Rooms — Depth ${depth}</h3>`];
  if(redirects.length) lines.push(`<p><i>${redirects.join(" → ")}</i></p>`);
  lines.push(`<p><b>Result:</b> ${result} <i>(final: Depth ${finalDepth})</i></p>`);

  if(!mentions.length)
  {
    lines.push(`<p><i>Empty node — no creature here.</i></p>`);
  }
  else
  {
    for(const m of mentions)
    {
      lines.push(`<p><b>&rarr; ${m.raw}</b>${m.rolledQty !== null ? ` (rolled: ${m.rolledQty})` : ""}</p>`);
      lines.push(m.actor
        ? `<p>Created "${m.actor.name}" in the "Generated Creatures" folder.</p>`
        : `<p><i>${m.name} — not found in Bestiary.</i></p>`);
    }
  }

  ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), user: game.user._id, content: lines.join("") });
}

function openDialog()
{
  const options = Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}">Depth ${n}</option>`).join("");
  const content = `
    <div class="form-group">
      <label>Depth</label>
      <select id="vaarn-lr-depth">${options}</select>
    </div>`;

  new Dialog(
  {
    title: "Generate Lair Rooms",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const depth = Number(html.find("#vaarn-lr-depth").val());
          generateLairRooms(depth);
        }
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

openDialog();
