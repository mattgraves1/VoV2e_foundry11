/**
 * Vaarn: Generate Poison
 *
 * GM tool for the Vaarnish Poisons generator — foundry-system-index.csv
 * "Toxin and Flora Item Surface".
 *
 * FOUR INDEPENDENT d20 ROLLS, one per column, which is what the table is
 * (Matt, 2026-09-19). Each column can be rerolled on its own or set by hand,
 * so a Referee who wants "the black oil they were warned about" can build it
 * rather than roll until it appears.
 *
 * It creates the poison as an Item — a dose, one slot, carrying the book's
 * colour, form, delivery and effect — and can apply the effect to a character
 * straight away. Applying rolls the CON Save through the same card every save
 * uses: the toxin rule's target where TOX applies, a flat 15 otherwise.
 *
 * The rules live in module/actor/poison-data.js (the table) and
 * module/actor/poison.js (what applying one does). This macro only picks.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll a poison.
 */

async function openDialog()
{
  const { POISON_COLOURS, POISON_FORMS, POISON_DELIVERY, POISON_EFFECTS, poisonName, poisonItemData }
    = await import("/systems/vaarn/module/actor/poison-data.js");
  const { applyPoison } = await import("/systems/vaarn/module/actor/poison.js");

  const d20 = () => Math.floor(Math.random() * 20);
  const state = { colour: d20(), form: d20(), delivery: d20(), effect: d20() };

  const options = (list, sel, labeller = (v, i) => `${i + 1} — ${v}`) =>
    list.map((v, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${labeller(v, i)}</option>`).join("");
  const characters = game.actors.filter(a => a.type === "character");
  const targets = [`<option value="">(nobody — just make the dose)</option>`]
    .concat(characters.map(a => `<option value="${a.id}">${a.name}</option>`)).join("");

  const body = () => `
    <p class="notes">Four independent d20 rolls. Reroll any column on its own, or set it by hand.</p>
    ${[["colour", "Colour", POISON_COLOURS], ["form", "Form", POISON_FORMS],
       ["delivery", "Delivery", POISON_DELIVERY]].map(([key, label, list]) => `
      <div class="form-group">
        <label>${label}</label>
        <select id="vaarn-gp-${key}">${options(list, state[key])}</select>
        <a class="vaarn-gp-reroll" data-col="${key}" title="Reroll this column"><i class="fas fa-dice-d20"></i></a>
      </div>`).join("")}
    <div class="form-group">
      <label>Effect</label>
      <select id="vaarn-gp-effect">${options(POISON_EFFECTS, state.effect, (e, i) => `${i + 1} — ${e.text}`)}</select>
      <a class="vaarn-gp-reroll" data-col="effect" title="Reroll this column"><i class="fas fa-dice-d20"></i></a>
    </div>
    <div class="form-group">
      <label>Apply to</label>
      <select id="vaarn-gp-target">${targets}</select>
    </div>
    <p id="vaarn-gp-blurb" class="notes"></p>`;

  const dlg = new Dialog(
  {
    title: "Generate Poison",
    content: body(),
    buttons:
    {
      create:
      {
        label: "Create",
        callback: async (html) =>
        {
          const read = k => Number(html.find(`#vaarn-gp-${k}`).val());
          const colour = POISON_COLOURS[read("colour")];
          const form = POISON_FORMS[read("form")];
          const delivery = POISON_DELIVERY[read("delivery")];
          const effect = POISON_EFFECTS[read("effect")];
          const name = poisonName(colour, form);

          const [item] = await getDocumentClass("Item").createDocuments([poisonItemData(colour, form, delivery, effect)]);
          ui.notifications.info(`Created "${item.name}" in the Items directory.`);

          const actor = game.actors.get(html.find("#vaarn-gp-target").val());
          if(!actor) return;

          const { target, passed, lines, after } = await applyPoison(actor, effect, { label: name, rollMode: CONST.DICE_ROLL_MODES.PRIVATE });
          // AWAITED, and `after` posted only once it has landed. Chat orders by
          // creation, so a death handed back in `after` would otherwise race the
          // card that explains it — which is the whole reason applyPoison hands
          // it back rather than letting the Zero Max HP Death hook post it.
          await ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"),
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<p><b>${name}</b> — ${delivery.toLowerCase()}. <i>${effect.text}</i></p>`
                   + `<p>CON Save vs ${target}: <b>${passed ? "passed" : "failed"}</b>.</p>`
                   + `<ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>`
          });
          for(const content of after ?? [])
            await ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), speaker: ChatMessage.getSpeaker({ actor }), content });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "create",
    render: (html) =>
    {
      const blurb = html.find("#vaarn-gp-blurb");
      const refresh = () =>
      {
        const e = POISON_EFFECTS[Number(html.find("#vaarn-gp-effect").val())];
        blurb.html(`<b>Resisted with:</b> CON Save vs ${saveTargetFor(e)}.`
                 + (e.failed ? ` The bolded half lands even on a success.` : ``)
                 + (e.avoidable ? ` A successful Save avoids it entirely.` : ``));
      };
      html.find("#vaarn-gp-effect").on("change", refresh);
      html.find(".vaarn-gp-reroll").on("click", ev =>
      {
        const col = ev.currentTarget.dataset.col;
        html.find(`#vaarn-gp-${col}`).val(String(d20()));
        refresh();
      });
      refresh();
    }
  }, { width: 520 });
  dlg.render(true);
}

if(!game.user.isGM) ui.notifications.warn("Generate Poison is a GM tool.");
else openDialog();
