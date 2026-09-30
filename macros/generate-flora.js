/**
 * Vaarn: Generate Flora
 *
 * GM tool for handing over a plant from Appendix F — foundry-system-index.csv
 * "Toxin and Flora Item Surface", the Flora half.
 *
 * NOTHING IS ROLLED HERE, because the book rolls nothing: Appendix F is ten
 * prose entries, not a table. The Referee picks the plant the party found.
 *
 * The Item carries the plant's description and its mechanical clause in the
 * book's own words. Two are real weapons — the avern bloom (three slots, and
 * the book prints no damage die for it) and a dried swordgrass leaf (d6) — and
 * the rest are ordinary items. Martyr Tree is listed and cannot be created:
 * it is a tree, and nothing about it is carried.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to pick a plant.
 */

async function openDialog()
{
  const { FLORA, floraByKey, buildFlora } =
    await import("/systems/vaarn/module/actor/flora-data.js");

  const options = FLORA.map(f =>
    `<option value="${f.key}">${f.plant}${f.item ? "" : " (nothing to carry)"}</option>`).join("");
  const characters = game.actors.filter(a => a.type === "character");
  const targets = [`<option value="">(Items directory — no owner)</option>`]
    .concat(characters.map(a => `<option value="${a.id}">${a.name}</option>`)).join("");

  new Dialog(
  {
    title: "Generate Flora",
    content: `
      <p class="notes">Appendix F is prose, not a table — pick the plant the party found.</p>
      <div class="form-group">
        <label>Plant</label>
        <select id="vaarn-gf-plant">${options}</select>
      </div>
      <div class="form-group">
        <label>Give to</label>
        <select id="vaarn-gf-target">${targets}</select>
      </div>
      <p id="vaarn-gf-blurb" class="notes"></p>`,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: async (html) =>
        {
          const key = html.find("#vaarn-gf-plant").val();
          const data = buildFlora(key);
          if(!data.length)
          {
            ui.notifications.warn(`${floraByKey(key)?.plant ?? "That plant"} is not something a character carries.`);
            return;
          }
          const actor = game.actors.get(html.find("#vaarn-gf-target").val());
          if(actor)
          {
            const [item] = await actor.createEmbeddedDocuments("Item", data);
            ui.notifications.info(`Gave "${item.name}" to ${actor.name}.`);
            return;
          }
          const [item] = await getDocumentClass("Item").createDocuments(data);
          ui.notifications.info(`Created "${item.name}" in the Items directory.`);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "create",
    render: (html) =>
    {
      const sel = html.find("#vaarn-gf-plant");
      const blurb = html.find("#vaarn-gf-blurb");
      const refresh = () =>
      {
        const f = floraByKey(sel.val());
        blurb.html(!f ? "" : `${f.blurb}`
          + (f.rule ? `<br><b>Rule:</b> ${f.rule}` : `<br><i>No mechanical clause — setting colour.</i>`));
      };
      sel.on("change", refresh);
      refresh();
    }
  }, { width: 520 }).render(true);
}

if(!game.user.isGM) ui.notifications.warn("Generate Flora is a GM tool.");
else openDialog();
