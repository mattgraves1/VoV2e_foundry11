/**
 * Vaarn: Resurrect Character
 *
 * GM-only tool for Miscellany/Resurrection and Death - foundry-system-index.csv
 * "Resurrection Options". The Referee says who is dead and picks the route;
 * module/actor/resurrection.js applies what the book states for it. Nothing
 * checks that the character is dead, because nothing in this system records a
 * death (fatality.js).
 *
 * Routes: Mycomorph Spores, Necrotech (Phoenix Core, Lazarus implants),
 * Pseudo-Womb clone, Returning as a Spirit, Ego-Engine Transplant. A route
 * the character's creature type rules out is refused with the reason.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it, choose the character and the route, then Resurrect.
 */

async function openDialog()
{
  if(!game.user.isGM) return ui.notifications.warn("Only the Referee resurrects the dead.");
  const R = await import("/systems/vaarn/module/actor/resurrection.js");

  const pcs = game.actors.filter(a => a.type === "character").sort((a, b) => a.name.localeCompare(b.name));
  if(!pcs.length) return ui.notifications.warn("There is no character to resurrect.");

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const pcOptions = pcs.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("");
  const routeOptions = Object.entries(R.ROUTES)
    .map(([key, r]) => `<option value="${key}"${r.built ? "" : " disabled"}>${esc(r.label)}${r.built ? "" : " (not built yet)"}</option>`).join("");
  const blurbs = Object.fromEntries(Object.entries(R.ROUTES).map(([k, r]) => [k, r.blurb]));

  const content = `
    <div class="form-group">
      <label>Dead character</label>
      <select id="vaarn-res-pc">${pcOptions}</select>
    </div>
    <div class="form-group">
      <label>Route</label>
      <select id="vaarn-res-route">${routeOptions}</select>
    </div>
    <p id="vaarn-res-blurb" style="font-style: italic;">${esc(blurbs.spores)}</p>
    <div id="vaarn-res-clean">
      <div class="form-group"><label><input type="checkbox" id="vaarn-res-wounds"> Remove all wounds</label></div>
      <div class="form-group"><label><input type="checkbox" id="vaarn-res-abil"> Heal all ability damage</label></div>
      <div class="form-group"><label><input type="checkbox" id="vaarn-res-board"> End everything on their Active Effects board (GM reminders stay)</label></div>
    </div>`;

  // The same-sheet routes offer a clean-up (RULED 2026-09-27, Matt); the ticks
  // reset to that route's defaults whenever the route changes.
  const showClean = (html, key) =>
  {
    const d = R.SAME_SHEET[key];
    html.find("#vaarn-res-clean").toggle(!!d);
    if(d)
    {
      html.find("#vaarn-res-wounds").prop("checked", d.wounds);
      html.find("#vaarn-res-abil").prop("checked", d.abilityDamage);
      html.find("#vaarn-res-board").prop("checked", d.board);
    }
  };

  new Dialog({
    title: "Resurrect Character",
    content,
    render: html =>
    {
      showClean(html, html.find("#vaarn-res-route").val());
      html.find("#vaarn-res-route").on("change", ev =>
      {
        html.find("#vaarn-res-blurb").text(blurbs[ev.currentTarget.value] || "");
        showClean(html, ev.currentTarget.value);
      });
    },
    buttons: {
      go: {
        label: "Resurrect",
        callback: async html =>
        {
          const actor = game.actors.get(html.find("#vaarn-res-pc").val());
          const key = html.find("#vaarn-res-route").val();
          if(!actor) return ui.notifications.warn("Choose the dead character.");
          const why = R.refusal(actor, key);
          if(why) return ui.notifications.warn(why);
          await R.resurrect(actor, key, {
            wounds: html.find("#vaarn-res-wounds").prop("checked"),
            abilityDamage: html.find("#vaarn-res-abil").prop("checked"),
            board: html.find("#vaarn-res-board").prop("checked")
          });
          actor.sheet.render(true);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "go"
  }).render(true);
}

openDialog();
