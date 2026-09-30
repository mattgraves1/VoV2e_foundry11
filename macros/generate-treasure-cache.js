/**
 * Vaarn: Generate Treasure Cache
 *
 * GM-only. Pick a cache type (Survival, Bandit, Occult, Lair, Tomb,
 * Magnificent) and a size; every line of that column of the Treasure Caches
 * table is rolled and a new container actor is created, stocked with the
 * Items. Lair sizes are shown by the lair creature's Level, as the book
 * labels them. Magnificent has no Extra-Large.
 *
 * The cache starts with default ownership None, so the players cannot see
 * it. When they find it, give it to them with the actor's Configure
 * Ownership (Owner lets a player Take from it). The roll-by-roll summary is
 * whispered to the GM.
 *
 * All the logic is in module/actor/treasure-cache.js (Treasure Cache
 * Generation, foundry-system-index.csv); this file is only the picker.
 */

async function openDialog()
{
  const { TREASURE_CACHES, sizesOf } = await import("/systems/vaarn/module/actor/treasure-cache-data.js");
  const { createCache, sizeLabel } = await import("/systems/vaarn/module/actor/treasure-cache.js");

  const types = Object.keys(TREASURE_CACHES);
  const sizeOptions = (type) => sizesOf(type)
    .map((_, i) => `<option value="${i}">${sizeLabel(type, i)}</option>`).join("");

  new Dialog(
  {
    title: "Generate Treasure Cache",
    content: `
      <div class="form-group">
        <label>Cache</label>
        <select id="vaarn-tc-type">${types.map(t => `<option value="${t}">${t}</option>`).join("")}</select>
      </div>
      <div class="form-group">
        <label>Size</label>
        <select id="vaarn-tc-size">${sizeOptions(types[0])}</select>
      </div>
      <p id="vaarn-tc-blurb" class="notes"></p>`,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: async (html) =>
        {
          const type = html.find("#vaarn-tc-type").val();
          const size = Number(html.find("#vaarn-tc-size").val());
          const actor = await createCache(type, size);
          ui.notifications.info(`Created "${actor.name}" with ${actor.items.size} Items, GM only.`);
          actor.sheet.render(true);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "create",
    render: (html) =>
    {
      const typeSel = html.find("#vaarn-tc-type");
      const sizeSel = html.find("#vaarn-tc-size");
      const blurb = html.find("#vaarn-tc-blurb");
      const refresh = () =>
      {
        const type = typeSel.val();
        const keep = Number(sizeSel.val());
        sizeSel.html(sizeOptions(type));
        if(keep < sizesOf(type).length) sizeSel.val(String(keep));
        blurb.text(TREASURE_CACHES[type].blurb);
      };
      typeSel.on("change", refresh);
      refresh();
    }
  }, { width: 380 }).render(true);
}

if(!game.user.isGM) ui.notifications.warn("Generate Treasure Cache is a GM tool.");
else openDialog();
