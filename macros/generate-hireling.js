/**
 * Vaarn: Generate Follower or Mercenary
 *
 * GM-only tool. Rolls the Followers or Mercenaries recruitment table for a
 * chosen PC and creates the npc Actor it describes. Every column rolls its own
 * d20 + that PC's EGO, and the name rolls a flat d30 (Matt, 2026-09-06 and
 * 2026-09-18). The PC becomes the Actor's owner. All the rolling and building
 * lives in module/actor/hireling-builder.js; this macro is the dialog.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it, choose the table and the recruiting PC, then
 * Recruit.
 */

async function recruit(kind, characterId)
{
  const { createHireling, HIRELING_KINDS } = await import("/systems/vaarn/module/actor/hireling-builder.js");
  const character = game.actors.get(characterId);
  if(!character) return ui.notifications.warn("Choose the PC who is recruiting.");

  const { actor, rolled, refused } = await createHireling(kind, character);
  // Companion Level Limit (2026-09-19): the Referee declined the over-limit
  // confirm, which already named the pool and the numbers. No Actor was
  // created, so there is nothing to card and nothing further to say.
  if(refused) return;
  const w = rolled.attack;
  await ChatMessage.create({
    user: game.user._id,
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vaarn-chat-card"><h3>${HIRELING_KINDS[kind].label}: ${actor.name}</h3>` +
             `<p>Level ${actor.system.level.value} (${actor.system.health.max} HP), AV ${actor.system.armor.value}, ` +
             `Morale +${actor.system.morale.value}</p><p>${w.text}</p><p>${rolled.description.text}</p>` +
             `<p><i>Recruited by ${character.name} (EGO ${rolled.ego >= 0 ? "+" : ""}${rolled.ego}).</i></p></div>`
  });
  ui.notifications.info(`Created "${actor.name}" in the "${HIRELING_KINDS[kind].folder}" folder.`);
  actor.sheet.render(true);
}

function openDialog()
{
  if(!game.user.isGM) return ui.notifications.warn("Only the Referee can recruit followers and mercenaries.");
  const pcs = game.actors.filter(a => a.type === "character").sort((a, b) => a.name.localeCompare(b.name));
  if(!pcs.length) return ui.notifications.warn("There is no character to recruit for.");
  const pcOptions = pcs.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
  const content = `
    <div class="form-group">
      <label>Table</label>
      <select id="vaarn-hire-kind"><option value="follower">Follower</option><option value="mercenary">Mercenary</option></select>
    </div>
    <div class="form-group">
      <label>Recruiting PC</label>
      <select id="vaarn-hire-pc">${pcOptions}</select>
    </div>`;
  new Dialog({
    title: "Generate Follower or Mercenary",
    content,
    buttons: {
      recruit: {
        label: "Recruit",
        callback: html => recruit(html.find("#vaarn-hire-kind").val(), html.find("#vaarn-hire-pc").val())
      },
      cancel: { label: "Cancel" }
    },
    default: "recruit"
  }).render(true);
}

openDialog();
