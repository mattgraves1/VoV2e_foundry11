/**
 * Vaarn: Generate Vault
 *
 * GM-only. Grows a whole vault and writes it to a new journal: an overview page
 * (Vault Entrance, Tunnels and Original Function; each level's rooms, arrival
 * and shaft down; the vault code) and a page per room with its Room Shape,
 * Floors and Walls, its contents and every exit, each linked to the room it
 * leads to (Vault Journal and Vault Layout Generator, RULED 2026-09-27 by Matt).
 * Lair creatures and treasure containers are not created: a room's page says
 * what is left to roll. Each corridor rolls 1 in 12 to be obstructed, on its own
 * page (Corridor and Shaft Obstructions); 'Shafts can be obstructed' lets shafts
 * roll too, and is off unless the GM ticks it - the book does not model them.
 *
 * The window: choose a Setting - Module Default (selected), Randomize, or one
 * saved in this world - or paste a Vault code from the Vault Lattice Grower to
 * grow that exact vault. To keep a setting tuned in the Grower, paste its code,
 * name it and press Save Setting; it is kept without its seed, so every vault
 * grown from it is new. The Journal name defaults to the vault's Original
 * Function.
 *
 * The layout rules live in module/vault/vault-layout.js, the rooms in
 * module/vault/room-contents.js, the journal in module/vault/vault-journal.js.
 *
 * Generate with Scenes also makes a hex Scene per level (Vault Scene): a plain
 * outline map as the background, walls and doors, fog and darkness, a GM-only pin
 * per room. The vault journal's Overview can make them later too.
 *
 * Advanced options... opens the Vault Settings Tuner on the chosen setting or
 * pasted code: every layout setting, with the vault it grows drawn as you change
 * them, and its own Save setting and Generate buttons.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it to
 * the hotbar.
 */

async function generate(choice, code, name, shafts, scenes = false)
{
  const V = await import("/systems/vaarn/module/vault/vault-journal.js");
  let settings;
  try { settings = V.settingsFor(choice, code); }
  catch(e) { ui.notifications.error(e.message); return; }
  await V.generateVault(settings, { name, shafts, scenes });
}

// Advanced options: the Vault Settings Tuner, opened on the chosen setting or pasted code.
async function openTuner(choice, code, name, shafts)
{
  const V = await import("/systems/vaarn/module/vault/vault-journal.js");
  const { openVaultTuner } = await import("/systems/vaarn/module/vault/vault-tuner.js");
  let settings;
  try { settings = V.settingsFor(choice, code); }
  catch(e) { ui.notifications.error(e.message); return; }
  openVaultTuner(settings, { name, shafts });
}

async function openDialog(note = "")
{
  const V = await import("/systems/vaarn/module/vault/vault-journal.js");
  const esc = s => Handlebars.escapeExpression(s);
  // Remembered on the GM's own user, like Generate Room Contents' journal name.
  const shafts = game.user.getFlag("vaarn", "vaultShaftObstructions") ?? false;
  const saved = V.savedVaultSettings().map(s => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join("");
  const content = `
    ${note ? `<p>${esc(note)}</p>` : ""}
    <div class="form-group" title="Which rules grow the vault: Module Default (the book&#39;s vaults), Randomize (the shape rules rolled), or a setting saved in this world. A new seed every time.">
      <label>Setting</label>
      <select id="vaarn-gv-setting"><option value="default" selected>Module Default</option><option value="randomize">Randomize</option>${saved}</select>
    </div>
    <div class="form-group" title="Paste a code from a vault&#39;s Overview, the Vault Settings Tuner or the Vault Lattice Grower to grow that exact vault. It wins over the Setting.">
      <label>Vault code</label>
      <input type="text" id="vaarn-gv-code" placeholder="blank = use the setting">
    </div>
    <div class="form-group" title="The new journal&#39;s name. Blank names it after the vault&#39;s Original Function.">
      <label>Journal name</label>
      <input type="text" id="vaarn-gv-name" placeholder="blank = the vault's Original Function">
    </div>
    <div class="form-group" title="Let shafts between levels roll an obstruction too, like corridors. The book does not model them, so it is off unless ticked.">
      <label>Shafts can be obstructed</label>
      <input type="checkbox" id="vaarn-gv-shafts" ${shafts ? "checked" : ""}>
    </div>
    <div class="form-group" title="Type a name, then press Save Setting to keep the Vault code&#39;s rules (without its seed) in the Setting list for every GM of this world.">
      <label>Save code as</label>
      <input type="text" id="vaarn-gv-save" placeholder="a name, then Save Setting">
    </div>`;

  new Dialog(
  {
    title: "Generate Vault",
    content,
    buttons:
    {
      generate:
      {
        label: "Generate",
        callback: (html) =>
        {
          const shaftsOn = html.find("#vaarn-gv-shafts").is(":checked");
          game.user.setFlag("vaarn", "vaultShaftObstructions", shaftsOn);
          generate(String(html.find("#vaarn-gv-setting").val()), String(html.find("#vaarn-gv-code").val() ?? ""),
                   String(html.find("#vaarn-gv-name").val() ?? "").trim(), shaftsOn);
        }
      },
      scenes:
      {
        label: "Generate with Scenes",
        callback: (html) =>
        {
          const shaftsOn = html.find("#vaarn-gv-shafts").is(":checked");
          game.user.setFlag("vaarn", "vaultShaftObstructions", shaftsOn);
          generate(String(html.find("#vaarn-gv-setting").val()), String(html.find("#vaarn-gv-code").val() ?? ""),
                   String(html.find("#vaarn-gv-name").val() ?? "").trim(), shaftsOn, true);
        }
      },
      advanced:
      {
        label: "Advanced options...",
        callback: (html) => openTuner(String(html.find("#vaarn-gv-setting").val()), String(html.find("#vaarn-gv-code").val() ?? ""),
                                      String(html.find("#vaarn-gv-name").val() ?? "").trim(), html.find("#vaarn-gv-shafts").is(":checked"))
      },
      save:
      {
        label: "Save Setting",
        callback: async (html) =>
        {
          const name = String(html.find("#vaarn-gv-save").val() ?? "");
          try
          {
            await V.saveVaultSetting(name, String(html.find("#vaarn-gv-code").val() ?? ""));
            openDialog(`Saved "${name.trim()}".`);
          }
          catch(e) { ui.notifications.error(e.message); openDialog(); }
        }
      }
    },
    default: "generate",
    // Hover tips on the buttons (the fields carry theirs on their rows).
    render: (html) =>
    {
      const tips = {
        generate: "Grow the vault and write its journal: a page per room, its exits linked.",
        scenes: "Generate, and also make a hex Scene per level: an outline map, walls and doors, fog, and a GM-only pin per room.",
        advanced: "Open the Vault Settings Tuner: every layout setting, with a preview of the vault it grows.",
        save: "Keep the Vault code's rules under the name in Save code as."
      };
      const root = html[0]?.closest?.(".app") ?? html.closest(".app")[0];
      for(const [key, tip] of Object.entries(tips)) root?.querySelector(`button[data-button="${key}"]`)?.setAttribute("title", tip);
    }
  },
  { width: 380 }).render(true);
}

openDialog();
