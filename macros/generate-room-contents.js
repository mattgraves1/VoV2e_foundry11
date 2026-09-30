/**
 * Vaarn: Generate Room Contents
 *
 * GM-only tool for filling in vault rooms. Each room first gets a type -
 * uninhabited, lair, treasure, lair and treasure, or special - by a d12
 * (Room Type Roll, RULED 2026-09-27 by Matt) or chosen by the Referee building
 * a vault by hand, and then exactly the follow-up rolls the book's Creating
 * Vaults gives that type: an uninhabited room rolls Contents A and Contents B
 * (step 4) and follows up whatever they call for; a lair room rolls Lair Rooms
 * by depth and a Room Feature; a treasure room rolls Treasure Rooms by depth
 * (RULED 2026-09-21, Matt) into a GM-only container or a cache; a special room
 * rolls Special Rooms, and Vault Merchants when that calls for one. The rolling
 * lives in module/vault/room-contents.js, which the vault journal also uses.
 * Before 2026-09-27 this macro treated every room as uninhabited and always
 * added a Room Feature; the book gives features by the room's type.
 *
 * Whispers the results to the GM, spawning creature Actors only for a lair (into
 * the same "Generated Creatures" folder every other creature-spawn macro uses),
 * and a container Actor for treasure.
 *
 * Given a Vault journal name, it ALSO writes each room as a page of that
 * journal - created if it does not exist - named from the Room field or the
 * next "Room N" (Room Contents Written to a Journal, RULED 2026-09-27 by
 * Matt). The page links the creatures and treasure container, and its hazard
 * lines carry their controls there. See module/actor/room-journal.js.
 *
 * Rooms (RULED 2026-09-27, Matt) rolls several rooms in one run, each with its
 * own d12 unless a type is chosen, each to its own numbered page; the chat gets
 * one card for the run.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose a Floor/Depth (used by the
 * Lair, Treasure and Hazard follow-ups), a room type or the d12, how many rooms,
 * optionally a Vault journal and Room, then Create.
 */

async function generateRoomContents(floor, type, count, vaultName = "", roomName = "")
{
  const { planRoom, rollRoomText, createRoomDocuments, roomLines } = await import("/systems/vaarn/module/vault/room-contents.js");
  const { writeRoomPage, linkTo } = await import("/systems/vaarn/module/actor/room-journal.js");

  const card = [count > 1 ? `<h3>Generate Room Contents: ${count} rooms</h3>` : `<h3>Generate Room Contents</h3>`];
  for(let i = 0; i < count; i++)
  {
    const room = planRoom({ type: type || null });
    await rollRoomText(room, floor);
    await createRoomDocuments(room, floor);
    const { chat, page } = roomLines(room, floor);

    // Several rooms take the next numbers; a name only fits one room.
    const written = await writeRoomPage(vaultName, count > 1 ? "" : roomName, page.join(""));
    if(count > 1) card.push(`<h4>${written ? written.name : `Room ${i + 1}`}</h4>`);
    card.push(...chat);
    if(written) card.push(`<p><b>Written to</b> ${linkTo(written, `${written.parent.name}: ${written.name}`)}.</p>`);
  }

  // Whispered to the GM (Matt, 2026-09-21): the card names what a room holds,
  // Treasure Room Items included, before the players have found any of it.
  ChatMessage.create({ user: game.user._id, whisper: ChatMessage.getWhisperRecipients("GM"), content: card.join("") });
}

async function openDialog()
{
  const { ROOM_TYPES } = await import("/systems/vaarn/module/actor/room-contents-data.js");
  // The vault journal's name is remembered on the GM's own user between runs,
  // since a vault is prepared a room at a time.
  const lastVault = game.user.getFlag("vaarn", "lastVaultJournal") ?? "";
  const typeOptions = ROOM_TYPES.map(t => `<option value="${t.type}">${t.label} (d12 ${t.min === t.max ? t.min : `${t.min}-${t.max}`})</option>`).join("");
  const content = `
    <div class="form-group">
      <label>Floor / Depth</label>
      <input type="number" id="vaarn-rc-floor" min="1" value="1">
    </div>
    <div class="form-group">
      <label>Room type</label>
      <select id="vaarn-rc-type"><option value="">Roll the d12</option>${typeOptions}</select>
    </div>
    <div class="form-group">
      <label>Rooms</label>
      <input type="number" id="vaarn-rc-count" min="1" max="50" value="1">
    </div>
    <div class="form-group">
      <label>Vault journal</label>
      <input type="text" id="vaarn-rc-vault" value="${Handlebars.escapeExpression(lastVault)}" placeholder="blank = chat only">
    </div>
    <div class="form-group">
      <label>Room</label>
      <input type="text" id="vaarn-rc-room" placeholder="blank = next number">
    </div>`;

  new Dialog(
  {
    title: "Generate Room Contents",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const floor = Number(html.find("#vaarn-rc-floor").val()) || 1;
          const type = String(html.find("#vaarn-rc-type").val() ?? "");
          const count = Math.min(50, Math.max(1, Math.round(Number(html.find("#vaarn-rc-count").val())) || 1));
          const vault = String(html.find("#vaarn-rc-vault").val() ?? "").trim();
          const room = String(html.find("#vaarn-rc-room").val() ?? "").trim();
          game.user.setFlag("vaarn", "lastVaultJournal", vault);
          generateRoomContents(floor, type, count, vault, room);
        }
      }
    },
    default: "create"
  },
  { width: 340 }).render(true);
}

openDialog();
