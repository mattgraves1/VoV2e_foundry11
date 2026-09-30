/**
 * Vaarn: Alchemy Brewer
 *
 * GM tool for handing over what the alchemy rules produce — one NAMED Elixir
 * from the book's sample table, or a brewed Antidote — foundry-system-index.csv
 * "Elixir Brewing". Named "Generate Elixir" until 2026-09-19, when antidotes
 * joined it and the name stopped fitting (Matt).
 *
 * WHAT THIS IS THE WHOLE OF, and why it is this small. RULED 2026-09-19
 * (Matt), after a full brewing procedure was planned and rejected: "for
 * brewing, all we need is a mechanism for a GM to add a specific elixir to a
 * character's sheet - everything preceding that can be managed at the table,
 * can make use of the 'Begin an effort' button on the active effects sheet to
 * track the time". The components decided it: the sample table names them in
 * prose ("Sapient creature's tongue") that no inventory item can be matched
 * against, so any automatic ingredient check would be inventing a rule the
 * book does not have.
 *
 * So the book's brewing rule is honoured at the table: the Referee judges the
 * Component and the Essences, the span runs on the effects board's own Begin
 * an effort control (Exploration Turns equal to the Elixir's POT, interrupted
 * means spoiled), and this hands over the finished brew.
 *
 * ANTIDOTES are priced by the book off the toxin die — "a d6 TOX attack
 * requires a POT 1 antidote, a d8 TOX attack requires a POT 2 antidote, and so
 * on" — and drinking one cures that Toxin Die. The rule and the ladder live in
 * module/item/antidote.js; this only picks one.
 *
 * ASSIGNS TO A CHARACTER rather than dropping an unowned Item in the sidebar,
 * which is where every other generate-*.js macro stops (Matt, 2026-08-21).
 * Superseded here only: the brew belongs to whoever brewed it. The Items
 * directory is still offered as a target for stock with no owner yet.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to pick a brew and a recipient.
 */

async function openDialog()
{
  const { ELIXIRS } = await import("/systems/vaarn/module/actor/chargen-data.js");
  const { buildNamedElixir } = await import("/systems/vaarn/module/item/loot-builders.js");
  const { ANTIDOTE_DICE, ANTIDOTE_POTENCY, buildAntidote } =
    await import("/systems/vaarn/module/item/antidote.js");

  const elixirs = [...ELIXIRS].sort((a, b) => a.potency - b.potency || a.name.localeCompare(b.name));
  const elixirOptions = elixirs.map(e => `<option value="${e.name}">POT ${e.potency} — ${e.name}</option>`).join("");
  const antidoteOptions = ANTIDOTE_DICE
    .map(d => `<option value="${d}">POT ${ANTIDOTE_POTENCY[d]} — Antidote (${d} TOX)</option>`).join("");
  const characters = game.actors.filter(a => a.type === "character");
  const targets = [`<option value="">(Items directory — no owner)</option>`]
    .concat(characters.map(a => `<option value="${a.id}">${a.name}</option>`)).join("");

  new Dialog(
  {
    title: "Alchemy Brewer",
    content: `
      <p class="notes">The brewing itself is adjudicated at the table. Use <b>Begin an effort</b>
         on the effects board for the Exploration Turns the brew's POT costs.</p>
      <div class="form-group">
        <label>Brew</label>
        <select id="vaarn-ab-kind">
          <option value="elixir">Elixir (sample table)</option>
          <option value="antidote">Antidote</option>
        </select>
      </div>
      <div class="form-group" id="vaarn-ab-elixir-group">
        <label>Elixir</label>
        <select id="vaarn-ab-elixir">${elixirOptions}</select>
      </div>
      <div class="form-group" id="vaarn-ab-antidote-group">
        <label>Answers</label>
        <select id="vaarn-ab-antidote">${antidoteOptions}</select>
      </div>
      <div class="form-group">
        <label>Give to</label>
        <select id="vaarn-ab-target">${targets}</select>
      </div>
      <p id="vaarn-ab-blurb" class="notes"></p>`,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: async (html) =>
        {
          const kind = html.find("#vaarn-ab-kind").val();
          const data = kind === "antidote"
            ? buildAntidote(html.find("#vaarn-ab-antidote").val())
            : buildNamedElixir(html.find("#vaarn-ab-elixir").val());
          if(!data.length)
          {
            ui.notifications.error("That brew is not on the book's tables.");
            return;
          }
          const actor = game.actors.get(html.find("#vaarn-ab-target").val());
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
      const kind = html.find("#vaarn-ab-kind");
      const elixirSel = html.find("#vaarn-ab-elixir");
      const antidoteSel = html.find("#vaarn-ab-antidote");
      const blurb = html.find("#vaarn-ab-blurb");
      const refresh = () =>
      {
        const isAntidote = kind.val() === "antidote";
        html.find("#vaarn-ab-elixir-group").toggle(!isAntidote);
        html.find("#vaarn-ab-antidote-group").toggle(isAntidote);
        if(isAntidote)
        {
          const die = antidoteSel.val();
          blurb.html(`<b>Component:</b> the venom of the creature it answers.<br>`
                   + `Cures a Toxin Die of ${die} or weaker. The book prices an antidote by the toxin: `
                   + `d6 TOX needs POT 1, d8 needs POT 2, and so on.`);
          return;
        }
        const e = elixirs.find(x => x.name === elixirSel.val());
        blurb.html(e ? `<b>Component:</b> ${e.component}<br>${e.effect}` : "");
      };
      kind.on("change", refresh);
      elixirSel.on("change", refresh);
      antidoteSel.on("change", refresh);
      refresh();
    }
  }, { width: 460 }).render(true);
}

if(!game.user.isGM) ui.notifications.warn("Alchemy Brewer is a GM tool.");
else openDialog();
