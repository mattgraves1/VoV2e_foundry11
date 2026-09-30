/**
 * The Referee's pick for an elixir that grants "a new, permanent Mystic Gift"
 * or "a new, permanent mutation, matching that of the original owner" -
 * Transcendence Tonic and Geneshock Tonic, foundry-system-index.csv
 * "Grant-a-Roll on Another Table", its CHOSEN form.
 *
 * WHY A PICKER. RULED 2026-09-24 (Matt): nothing harvested records which gift
 * or mutation the creature had - a Component is a generic "<creature>
 * Component" Item (Component Harvesting, 2026-09-19) - so "matching the
 * original owner" is the Referee's knowledge, and the Referee chooses.
 *
 * TWO GIFT ROSTERS, RULED 2026-09-24 (Matt): the pick may come from either.
 * The sample roster is the twenty named gifts. The composed roster is a
 * Quality and a Form, each from four columns of twenty, and its picker lets
 * the Referee pick EACH PIECE OF THE NAME separately rather than listing the
 * combinations. A Roll button on each mode fills the pick from the dice, so
 * an elixir found in play from an unknown source can carry a random gift the
 * Referee then keeps or adjusts.
 *
 * THE SOURCE IS THE ELIXIR. RULED 2026-09-24 (Matt): a sample gift's source
 * is not selected here - the Item's `source` names the elixir that granted
 * it. The gift takes a slot like any other (Matt, same day).
 *
 * THE MUTATION IS MADE THE WAY CHARGEN MAKES ONE, so the createItem bake
 * (item-effects.js) applies its ability, HP or slot bonus and creates any
 * natural weapon exactly as it would for a rolled one; nothing is baked here.
 *
 * Each function returns Item data, or null when the Referee cancels. The
 * caller (actor-sheet.js) gates on game.user.isGM, creates the Item, posts
 * the card and spends the vial.
 */
import { GIFT_NAMES, GIFT_QUALITIES_ALL, GIFT_FORMS_ALL } from "./chargen-data.js";
import { MUTATION_TABLE } from "./mutation-data.js";

const d = n => Math.floor(Math.random() * n) + 1;
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** The text a composed gift carries, chargen's own words. */
export const COMPOSED_GIFT_TEXT = "<p>Random Gift — players and referee must collectively agree on the specific effect.</p>";

function columnOptions(grid, selected)
{
  return grid.map((col, ci) =>
    `<optgroup label="Column ${ci + 1}">`
    + col.map(w => `<option value="${esc(w)}"${w === selected ? " selected" : ""}>${esc(w)}</option>`).join("")
    + `</optgroup>`).join("");
}

/** Item data for a gift: a sample name, or a composed Quality + Form. */
export function giftItemData({ name, composed, source })
{
  return {
    name,
    type: "gift",
    system: {
      slots: 1,
      source,
      description: composed ? COMPOSED_GIFT_TEXT : ""
    }
  };
}

/**
 * Item data for a RANDOM composed gift - a Quality and a Form, each from a
 * random column of twenty. Grant-a-Roll's rolled form, shared by the sheet's
 * Amaranthine Sugar and Psybernetic Helm and by the Godsbreath Star's
 * end-of-span PSY Save (2026-09-26), so there is one copy of the roll.
 */
export function randomGiftData()
{
  const quality = GIFT_QUALITIES_ALL[d(4) - 1][d(20) - 1];
  const form = GIFT_FORMS_ALL[d(4) - 1][d(20) - 1];
  return giftItemData({ name: `${quality} ${form}`, composed: true, source: `${quality} / ${form}` });
}

/** Item data for a mutation, the shape chargen writes. */
export function mutationItemData(entry)
{
  return {
    name: entry.name,
    type: "mutation",
    system: { slots: 0, roll: entry.roll, description: `<p><b>d100 roll:</b> ${entry.roll}</p><p>${entry.effect}</p>` }
  };
}

/** The mutation a d100 lands on: a numeric roll, or a [from, to] range. */
export function mutationByRoll(roll)
{
  return MUTATION_TABLE.find(m => Array.isArray(m.roll) ? roll >= m.roll[0] && roll <= m.roll[1] : m.roll === roll) ?? null;
}

/**
 * Ask the Referee which Mystic Gift the elixir grants. Resolves to Item data
 * or null.
 */
export function pickGift(actor, elixirName)
{
  const sampleOptions = GIFT_NAMES.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  const content = `<form class="vaarn-granted-pick">
    <p>${esc(actor.name)} drinks <b>${esc(elixirName)}</b> and gains a permanent Mystic Gift. Which?</p>
    <div class="form-group">
      <label><input type="radio" name="mode" value="sample" checked> Sample gift</label>
      <label><input type="radio" name="mode" value="composed"> Composed gift (Quality + Form)</label>
    </div>
    <fieldset data-mode="sample">
      <div class="form-group"><label>Gift</label><select name="sample">${sampleOptions}</select>
        <button type="button" class="vaarn-pick-roll" data-roll="sample" title="d20 on the sample gifts">Roll</button></div>
    </fieldset>
    <fieldset data-mode="composed" style="display:none">
      <div class="form-group"><label>Quality</label><select name="quality">${columnOptions(GIFT_QUALITIES_ALL)}</select></div>
      <div class="form-group"><label>Form</label><select name="form">${columnOptions(GIFT_FORMS_ALL)}</select>
        <button type="button" class="vaarn-pick-roll" data-roll="composed" title="a column and a d20 for each">Roll</button></div>
    </fieldset>
  </form>`;
  return new Promise(resolve => new Dialog({
    title: `${elixirName} — ${actor.name}`,
    content,
    render: html =>
    {
      const show = () => { const mode = html.find('[name="mode"]:checked').val(); html.find("fieldset").each((_, f) => { f.style.display = f.dataset.mode === mode ? "" : "none"; }); };
      html.find('[name="mode"]').on("change", show);
      html.find(".vaarn-pick-roll").on("click", ev =>
      {
        if(ev.currentTarget.dataset.roll === "sample")
          html.find('[name="sample"]').val(GIFT_NAMES[d(20) - 1]);
        else
        {
          html.find('[name="quality"]').val(GIFT_QUALITIES_ALL[d(4) - 1][d(20) - 1]);
          html.find('[name="form"]').val(GIFT_FORMS_ALL[d(4) - 1][d(20) - 1]);
        }
      });
      show();
    },
    buttons: {
      grant: {
        label: "Grant",
        callback: html =>
        {
          const mode = html.find('[name="mode"]:checked').val();
          if(mode === "sample")
            resolve(giftItemData({ name: html.find('[name="sample"]').val(), composed: false, source: elixirName }));
          else
          {
            const quality = html.find('[name="quality"]').val();
            const form = html.find('[name="form"]').val();
            resolve(giftItemData({ name: `${quality} ${form}`, composed: true, source: elixirName }));
          }
        }
      },
      cancel: { label: "Cancel", callback: () => resolve(null) }
    },
    default: "grant",
    close: () => resolve(null)
  }, { width: 460 }).render(true));
}

/**
 * Ask the Referee which mutation the elixir grants. Resolves to Item data or
 * null.
 */
export function pickMutation(actor, elixirName)
{
  const label = m => `${Array.isArray(m.roll) ? `${m.roll[0]}-${m.roll[1]}` : m.roll} — ${m.name}`;
  const options = MUTATION_TABLE.map(m => `<option value="${esc(m.name)}">${esc(label(m))}</option>`).join("");
  const content = `<form class="vaarn-granted-pick">
    <p>${esc(actor.name)} drinks <b>${esc(elixirName)}</b> and gains a permanent mutation. Which?</p>
    <div class="form-group"><label>Mutation</label><select name="mutation">${options}</select>
      <button type="button" class="vaarn-pick-roll" title="d100 on the mutation table">Roll</button></div>
  </form>`;
  return new Promise(resolve => new Dialog({
    title: `${elixirName} — ${actor.name}`,
    content,
    render: html => html.find(".vaarn-pick-roll").on("click", () =>
    {
      const m = mutationByRoll(d(100));
      if(m) html.find('[name="mutation"]').val(m.name);
    }),
    buttons: {
      grant: {
        label: "Grant",
        callback: html =>
        {
          const entry = MUTATION_TABLE.find(m => m.name === html.find('[name="mutation"]').val());
          resolve(entry ? mutationItemData(entry) : null);
        }
      },
      cancel: { label: "Cancel", callback: () => resolve(null) }
    },
    default: "grant",
    close: () => resolve(null)
  }, { width: 460 }).render(true));
}
