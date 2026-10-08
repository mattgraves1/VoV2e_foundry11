/**
 * Vaarn: Create Codex Item
 *
 * GM-only tool for introducing Hypergeometric Codex items into the world.
 * The `codex` item sheet deliberately has no editable equation dropdown
 * (that would let players browse every possibility or reassign an
 * already-found codex), so this macro is the one place equations get set.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: create one specific known equation,
 * batch-create every known equation at once, or create a custom/homebrew
 * equation (INT-save resolution still works automatically either way — it's
 * keyed off the reader at read time, not baked into the item).
 *
 * The known equations are the roster itself, codex-data.js EQUATIONS (40 in
 * the Jade Ibis draft) - this list once held the original 20 by hand and fell
 * behind (Remaining Sources chunk 2a, 2026-10-07).
 */

const { EQUATIONS } = await import("/systems/vaarn/module/actor/codex-data.js");
const EQUATION_NAMES = EQUATIONS.map(e => e.name);

async function createCodex(equationName, description = "")
{
  const cls = getDocumentClass("Item");
  return cls.create(
  {
    name: `Hypergeometric Codex (${equationName})`,
    type: "codex",
    system: { slots: 1, equation: equationName, description }
  });
}

async function createAllKnown()
{
  const cls = getDocumentClass("Item");
  const items = EQUATION_NAMES.map(name => (
  {
    name: `Hypergeometric Codex (${name})`,
    type: "codex",
    system: { slots: 1, equation: name, description: "" }
  }));
  await cls.create(items);
  ui.notifications.info(`Created all ${items.length} known-equation Codex items in the Items directory.`);
}

function openDialog()
{
  const options = EQUATION_NAMES.map(n => `<option value="${n}">${n}</option>`).join("");
  const content = `
    <p>Pick a known equation to create a single Codex item, create all ${EQUATION_NAMES.length} at once, or enter a custom/homebrew equation.</p>
    <div class="form-group">
      <label>Known equation</label>
      <select id="vaarn-codex-select">${options}</select>
    </div>
    <hr/>
    <p><i>— or, for a custom/homebrew equation (INT-save resolution still works automatically) —</i></p>
    <div class="form-group">
      <label>Custom equation name</label>
      <input type="text" id="vaarn-codex-custom-name" placeholder="e.g. Fold the Third Wall"/>
    </div>
    <div class="form-group">
      <label>Effect description (use [INT] as a placeholder for the reader's INT bonus)</label>
      <textarea id="vaarn-codex-custom-desc" style="width:100%;height:80px;"></textarea>
    </div>`;

  new Dialog(
  {
    title: "Create Codex Item(s)",
    content,
    buttons:
    {
      one:
      {
        label: "Create Selected Known Equation",
        callback: async (html) =>
        {
          const name = html.find("#vaarn-codex-select").val();
          const item = await createCodex(name);
          ui.notifications.info(`Created "${item.name}".`);
        }
      },
      all:
      {
        label: `Create All ${EQUATION_NAMES.length} Known Equations`,
        callback: () => createAllKnown()
      },
      custom:
      {
        label: "Create Custom Equation",
        callback: async (html) =>
        {
          const name = html.find("#vaarn-codex-custom-name").val()?.trim();
          const desc = html.find("#vaarn-codex-custom-desc").val()?.trim();
          if(!name)
          {
            ui.notifications.warn("Enter a custom equation name first.");
            return;
          }
          const item = await createCodex(name, desc ? `<p>${desc}</p>` : "");
          ui.notifications.info(`Created "${item.name}".`);
        }
      }
    },
    default: "one"
  },
  { width: 480 }).render(true);
}

openDialog();
