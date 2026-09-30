import { KnaveActorSheet } from "./actor-sheet.js";
import { butcher, butcheryRefusal, rationYield, carcassOf } from "./butchery.js";
import { levelTradeValue } from "./level-trade-value.js";
import { componentRefusal, essenceRefusal, essenceChoices, essenceYield,
         harvestComponent, extractEssence } from "./harvesting.js";
import { extractionRefusal, eligibleExtractors, extractSynthParts } from "./synth-extraction.js";

/**
 * NPC/monster sheet. Reuses all of KnaveActorSheet's roll logic (ability
 * saves, morale, armor, weapon attack/damage) unchanged - only the template
 * and default options differ, since npc actors don't have inventorySlots
 * or traits.
 * @extends {KnaveActorSheet}
 */
export class KnaveNpcSheet extends KnaveActorSheet
{
  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      classes: ["knave", "sheet", "actor", "npc"],
      template: "systems/vaarn/templates/actor/npc-sheet.html",
      width: 1000,
      height: 620
    });
  }

  /**
   * @override
   * Travel and Rations (2026-09-12). The yield and the refusal are both
   * derived here rather than in a Handlebars helper, because the refusal is a
   * SENTENCE and the template has no business assembling one — the same string
   * is what the chat message says when the control is somehow reached anyway.
   */
  getData()
  {
    const data = super.getData();
    data.butchery = {
      refusal: butcheryRefusal(this.actor),
      yield: rationYield(this.actor)
    };
    // Component Harvesting (2026-09-19): same shape as butchery.
    data.harvest = {
      componentRefusal: componentRefusal(this.actor),
      essenceRefusal: essenceRefusal(this.actor),
      essenceYield: essenceYield(this.actor),
      // Synth Part Extraction (2026-09-19).
      synthRefusal: extractionRefusal(this.actor)
    };
    // Level-Derived Trade Value: steeds and pets only, null for anything else.
    data.tradeValue = levelTradeValue(this.actor);
    return data;
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);
    if(!this.isEditable) return;
    html.find(".knave-butcher-button").click(() => this._onButcher());
    html.find(".knave-harvest-component-button").click(() => this._onHarvestComponent());
    html.find(".knave-extract-essence-button").click(() => this._onExtractEssence());
    html.find(".knave-extract-synth-button").click(() => this._onExtractSynthParts());
  }

  /**
   * Pick who makes the INT save, then roll it and put the parts on the
   * ground. Matt 2026-09-19: the characters this user owns (all of them for
   * the GM), defaulting to the user's assigned character.
   */
  async _onExtractSynthParts()
  {
    const actor   = this.actor;
    const refusal = extractionRefusal(actor);
    if(refusal)
    {
      ui.notifications.warn(`Cannot extract: ${refusal}.`);
      return;
    }

    const extractors = eligibleExtractors();
    if(!extractors.length)
    {
      ui.notifications.warn("You have no character to make the INT save.");
      return;
    }
    const mine = game.user.character?.id;
    const options = extractors.map(a =>
      `<option value="${a.id}" ${a.id === mine ? "selected" : ""}>${a.name}</option>`).join("");
    const content = `
      <p>INT save vs 15. On a success, <b>${actor.system.level.value}</b> Synth Parts
         (the creature's Level); on a failure, one.</p>
      <div class="form-group">
        <label for="synth-extractor">Who extracts</label>
        <select id="synth-extractor" name="extractor">${options}</select>
      </div>
      <p><i>The parts go into the Dropped Items container for anyone to pick up.</i></p>`;

    new Dialog({
      title: `Extract Synth Parts from ${actor.name}`,
      content,
      buttons: {
        ok: {
          label: "Roll INT Save",
          callback: async (html) =>
          {
            const extractor = game.actors.get(html.find('[name="extractor"]').val());
            const result = await extractSynthParts(actor, extractor);
            if(!result)
            {
              ui.notifications.warn(`Extracting from ${actor.name} failed — the parts may already have been taken.`);
              return;
            }
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: extractor }),
              content: `<p>${extractor.name} ${result.success ? "succeeds" : "fails"}, and extracts `
                     + `<b>${result.parts}</b> Synth Part${result.parts === 1 ? "" : "s"} from `
                     + `${actor.name}` + (result.parts > 0 ? ` — left in <b>${result.container.name}</b>.` : ".")
                     + `</p>`
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "ok"
    }).render(true);
  }

  /** Take the body's one Component and put it on the ground. No choice to make, so no dialog. */
  async _onHarvestComponent()
  {
    const actor   = this.actor;
    const refusal = componentRefusal(actor);
    if(refusal)
    {
      ui.notifications.warn(`Cannot harvest: ${refusal}.`);
      return;
    }
    const result = await harvestComponent(actor);
    if(!result)
    {
      ui.notifications.warn(`Harvesting ${actor.name} failed — the Component may already have been taken.`);
      return;
    }
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><b>${result.name}</b> is harvested from ${actor.name}'s body — `
             + `left in <b>${result.container.name}</b>.</p>`
    });
    this.render(false);
  }

  /**
   * Extract every dose into one Essence. The dialog is the book's choice for
   * a creature with two or more types; with one type it only confirms.
   */
  async _onExtractEssence()
  {
    const actor   = this.actor;
    const refusal = essenceRefusal(actor);
    if(refusal)
    {
      ui.notifications.warn(`Cannot extract: ${refusal}.`);
      return;
    }

    const choices = essenceChoices(actor);
    const doses   = essenceYield(actor);
    const options = choices.map(e => `<option value="${e}">${e}</option>`).join("");
    const content = `
      <p>${actor.name} is Level ${actor.system.level.value}, and yields
         <b>${doses}</b> dose${doses === 1 ? "" : "s"} of Essence.</p>
      ${choices.length > 1
        ? `<p>It has more than one creature type. All the doses go to the one you choose; the other is lost.</p>`
        : ""}
      <div class="form-group">
        <label for="essence-type">Essence</label>
        <select id="essence-type" name="essence">${options}</select>
      </div>
      <p><i>It goes into the Dropped Items container for anyone to pick up.</i></p>`;

    new Dialog({
      title: `Extract Essence from ${actor.name}`,
      content,
      buttons: {
        ok: {
          label: "Extract",
          callback: async (html) =>
          {
            const essence = html.find('[name="essence"]').val();
            const result = await extractEssence(actor, essence);
            if(!result)
            {
              ui.notifications.warn(`Extracting from ${actor.name} failed — the Essence may already have been taken.`);
              return;
            }
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: `<p><b>${result.doses}</b> dose${result.doses === 1 ? "" : "s"} of `
                     + `<b>${result.essence}</b> extracted from ${actor.name}'s body — `
                     + `left in <b>${result.container.name}</b>.</p>`
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "ok"
    }).render(true);
  }

  /**
   * Ask how the yield splits, then put it on the ground.
   *
   * THE DIALOG IS THE RULE'S "OR". Matt ruled 2026-09-12 that whoever
   * processes the body chooses, because the book writes "rations of food or
   * water" and then gives ONE number for the yield — so the split is a choice
   * it hands to the table and not a thing to guess at here.
   *
   * The two inputs are bound to each other so they always sum to the yield.
   * Letting them drift and validating on submit would be the same number of
   * lines and would make the failure a rejection rather than an impossibility.
   */
  async _onButcher()
  {
    const actor   = this.actor;
    const refusal = butcheryRefusal(actor);
    if(refusal)
    {
      ui.notifications.warn(`Cannot process: ${refusal}.`);
      return;
    }

    const total = rationYield(actor);
    // Blood only (the Unicorn, 2026-09-23): the meat field is fixed at 0 and
    // the whole yield is Fresh Blood, with the book's reason shown.
    const carcass = carcassOf(actor);
    const bloodOnly = carcass.yields === "blood";
    const half  = bloodOnly ? 0 : Math.floor(total / 2);

    const content = `
      <p>${actor.name} is Level ${actor.system.level.value}, and yields
         <b>${total}</b> ration${total === 1 ? "" : "s"}.</p>
      ${bloodOnly
        // Group 331.6: the split line contradicted the note below it on a
        // body that has no split to make, so a blood-only body gets one line.
        ? `<p><b>Blood only:</b> ${carcass.why} The whole yield comes off as Fresh Blood.</p>`
        : `<p>Rations of food <i>or</i> water — split them however the processing went.
         Food comes off the body as Raw Meat, water as Fresh Blood.</p>`}
      <div class="form-group">
        <label for="butcher-food">Raw Meat</label>
        <input type="number" id="butcher-food" name="food" value="${half}" min="0" max="${bloodOnly ? 0 : total}"${bloodOnly ? " disabled" : ""}/>
      </div>
      <div class="form-group">
        <label for="butcher-water">Fresh Blood</label>
        <input type="number" id="butcher-water" name="water" value="${total - half}" min="0" max="${total}"${bloodOnly ? " disabled" : ""}/>
      </div>
      <p><i>They go into the Dropped Items container for anyone to pick up.</i></p>`;

    const dlg = new Dialog({
      title: `Process ${actor.name}`,
      content,
      buttons: {
        ok: {
          label: "Process",
          callback: async (html) =>
          {
            const food  = Number(html.find('[name="food"]').val()  ?? 0);
            const water = Number(html.find('[name="water"]').val() ?? 0);
            const result = await butcher(actor, { food, water });
            if(!result)
            {
              ui.notifications.warn(`Processing ${actor.name} failed — the body may already have been processed.`);
              return;
            }
            const parts = [];
            if(result.food  > 0) parts.push(`<b>${result.food}</b> Raw Meat`);
            if(result.water > 0) parts.push(`<b>${result.water}</b> Fresh Blood`);
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: `<p>${actor.name}'s body is processed for `
                     + `${parts.join(" and ") || "nothing"} — left in `
                     + `<b>${result.container.name}</b>.</p>`
            });
            this.render(false);
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "ok",
      render: (html) =>
      {
        // Bound so the pair always sums to the yield — see the method comment.
        const food  = html.find('[name="food"]');
        const water = html.find('[name="water"]');
        const clamp = (v) => Math.max(0, Math.min(total, Math.floor(Number(v) || 0)));
        food.on("change", () => { const f = clamp(food.val()); food.val(f); water.val(total - f); });
        water.on("change", () => { const w = clamp(water.val()); water.val(w); food.val(total - w); });
      }
    });
    dlg.render(true);
  }
}
