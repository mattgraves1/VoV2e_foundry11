import { upgradeDie } from "./usage-die.js";
import { isExotica, valueLabelOf } from "./xp-value.js";
import { kindLabelOf } from "./item-kind.js";
import { emitsLight } from "./weapon-tags.js";
import { hiddenFrom, STAND_IN_NAME, STAND_IN_IMG } from "./identification.js";
import { recipesForDisplay, recipeFromItem, addRecipe, updateRecipe, removeRecipe,
         blankRecipe } from "./crucible-recipes.js";
import { saleSpanOf, openSaleDialog } from "./false-sale.js";
import { giftEntryOf, addEffect, updateEffect, removeEffect, blankEffect, suggestionsFor, effectSummary,
         EFFECT_KINDS, CONDITION_CHOICES, DAMAGE_TYPE_CHOICES } from "./gift-effects.js";
import { sentencesOf } from "../effects/interpret.js";
import { effectRows, bindEffectsTab } from "./effect-builder.js";
import { usageDieOf, statNotesOf, sentenceUsageSize, tradeBuyersOf, qualityReadout } from "../effects/item-stats.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class KnaveItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["knave", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template()
  {
    const path = "systems/vaarn/templates/item";
    // Return a single sheet for all item types.
    //return `${path}/item-sheet.html`;
    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.

    // Exotica Identification: a player opening an unidentified item gets a
    // stub that names nothing. Chosen here rather than per template, so every
    // route that opens the sheet — a row, a container, the sidebar — is covered.
    if(hiddenFrom(this.item)) return `${path}/unidentified-sheet.html`;
    return `${path}/${this.item.type}-sheet.html`;
  }

  /** @override The window title names the item, so it hides with it. */
  get title()
  {
    return hiddenFrom(this.item) ? STAND_IN_NAME : super.title;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    let data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    // Exotica are not fungible with trade goods — they are Vaarn's advancement
    // currency. Same field, different label, exactly as displayNameOf renders
    // a name without changing the lookup key. The NUMBER is already right; it
    // was only ever called the wrong thing.
    data.isExotica = isExotica(this.item);
    data.valueLabel = valueLabelOf(this.item);

    // Item Type on Item Sheet (2026-09-20). Derived here rather than stored,
    // and computed beside valueLabel because they are the same shape: one
    // question about the Item, answered once, rendered by the templates.
    // Blank for anything the row did not enumerate - see item-kind.js.
    data.kindLabel = kindLabelOf(this.item);

    // Buyer-conditional worth, shown as a second line under the value: three
    // tags double an item's value only to a named faction, so the figure
    // cannot be baked into tradeValue the way the unconditional ones are.
    // Suppressed for Exotica — those are not fungible with trade goods at
    // all, so 'worth double to Mystics' would be a category error.
    // Weapon Tags chunk 5b (2026-10-05): a weapon that sheds light offers its colour.
    data.emitsLight = emitsLight(this.item);
    data.lightColor = this.item.flags?.vaarn?.lightColor ?? "#cfe0ff";
    // One line per buyer a live trade-value sentence names - a tag's or a GM's
    // (Stats as Sentences chunk 2c, ruling C).
    data.buyerValues = data.isExotica ? [] : tradeBuyersOf(this.item);

    // Units per Slot (Treasure Cache Generation, RULED 2026-09-19): a
    // friendlier face on the Slots field, not a second setting. A fractional
    // Slots value is the cost of ONE unit (item-slots.js), so 3 per slot IS
    // Slots 0.33. Blank for anything billed by the whole stack.
    const slots = Number(this.item.system?.slots) || 0;
    data.unitsPerSlot = slots > 0 && slots < 1 ? Math.round(1 / slots) : "";

    // Crucible Recipe Inscription (2026-09-19). Read only by crucible-sheet.html.
    if(this.item.type === "crucible") data.recipes = recipesForDisplay(this.item);

    // Read only by unidentified-sheet.html.

    // Quality Roll on Generated Good (2026-09-19). THE GATE IS HERE AND NOT
    // ONLY IN THE TEMPLATE, which is the difference between withholding the
    // quality and merely not drawing it: a template gate still ships the
    // value to the client, where it sits in the sheet's data. Gating in
    // getData means a player's sheet is never told what was rolled.
    //
    // RULED 2026-09-19 (Matt): the players do not get "a video-gamey
    // read-out that tells them exactly what to expect" - the Referee reads
    // the quality and writes the goods' description themselves.
    //
    // Still a UI secret rather than a boundary: the flag is on the document
    // and a console can read it, exactly as with flags.vaarn.unidentified.
    data.isGM = game.user.isGM;
    data.qualityReadout = data.isGM ? qualityReadout(this.item) : null;
    // A False good on an actor: the Referee's Sold control (2026-09-24).
    data.falseSale = data.isGM ? saleSpanOf(this.item) : null;

    // Usage Die Field Visibility (2026-09-20). The generic `item` type has to
    // go on composing the usageDie template, because the gear that needs it is
    // of that type: gearItemData parses "(UdN)" out of a starting-gear name
    // and sets the die there. What was wrong was DRAWING it on all of them. A
    // Synth Parts item is not part of the usage die system and said so with
    // two selectors, two status lines and two links (Matt, 2026-09-08).
    //
    // The gate asks the same question the inventory row already asks through
    // the hasUsageDie helper, widened by `max`: an item rated Ud8 whose die
    // has run down to "None" is still a usage-die item with an empty die, and
    // item.js prints "No usage die tracked." for exactly that state. Gating on
    // `die` alone would delete the controls out from under it.
    // Through the sentences since Stats as Sentences chunk 2a: a die sized by a
    // sentence is a usage-die Item whatever its field holds.
    const usage = usageDieOf(this.item);
    data.hasUsageDie = !!(usage.die || usage.max);
    data.statNotes = statNotesOf(this.item);

    // The GM-only '+ Add usage die' link is RETIRED (Stats as Sentences chunk
    // 2e-i, ruled 2026-10-05): the builder's Stats section gives any Item a die.

    data.standInName = STAND_IN_NAME;
    data.standInImg = STAND_IN_IMG;

    // Mystic Gift Effect Modelling (2026-09-29): the Effects tab. Each entry
    // carries its kind as booleans so the template shows only its own fields.
    if(this.item.type === "gift")
    {
      // Interpreter chunk 4 (RULED 2026-10-05): the rows are the Gift's
      // sentences - its own, or an old list read through the translator - shown
      // in the tab's fields; one the fields cannot say is read-only (custom).
      data.giftEffects = sentencesOf(this.item).map(giftEntryOf).map((e, index) => ({
        ...e, index, summary: effectSummary(e),
        isDamage: e.kind === "damage", isHealing: e.kind === "healing",
        isCondition: e.kind === "condition", isNamed: e.kind === "condition" && !e.condition,
        isProse: e.kind === "prose"
      }));
      data.giftSuggestions = suggestionsFor(this.item);
      data.effectKinds = EFFECT_KINDS;
      data.conditionChoices = CONDITION_CHOICES;
      data.damageTypeChoices = DAMAGE_TYPE_CHOICES;
    }

    // GM Effect Builder chunk 2 (ruled 2026-10-05): the Effects tab on every
    // Item sheet - its sentences as plain lines, read-only for players.
    data.isGM = game.user.isGM && this.isEditable;
    data.effectRows = effectRows(this.item, data.isGM);

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Units per Slot writes Slots and nothing else. 3 -> 0.33, matching
    // rest.js's THIRD_OF_A_SLOT, so a GM-ruled third and a built-in third are
    // the same number. Below 2 there is no per-unit cost to express: the
    // stack goes back to costing its Slots value whole, 1.
    html.find('.false-sale').click(async () =>
    {
      const entry = await openSaleDialog(this.item);
      if(entry && !this.item.parent?.items.get(this.item.id)) this.close();
    });

    html.find('.units-per-slot').change(ev =>
    {
      const n = Math.floor(Number(ev.currentTarget.value));
      if(Number.isFinite(n) && n >= 2) return this.item.update({ "system.slots": Math.round(100 / n) / 100 });
      ui.notifications.info(`${this.item.name}: Slots set to 1 — the whole stack costs one slot. Set Slots directly for anything else.`);
      return this.item.update({ "system.slots": 1 });
    });

    // There's no codified refill rule (see usage-die.js) — GMs/players just
    // pick what the in-fiction find warrants: a partial step, or a full
    // refill back to the item's own rated max.
    //
    // Read straight off the <select> elements rather than this.item.system:
    // a <select>'s change only commits to the document on its own `change`
    // event, so picking a value and immediately clicking one of these in the
    // same interaction could otherwise read the stale pre-selection value.
    html.find('.usage-die-step').click(() =>
    {
      const die = html.find('select[name="system.usageDie.die"]').val();
      // A size a sentence sets wins over the field's select (Stats as Sentences chunk 2a, ruling B).
      const max = sentenceUsageSize(this.item) || html.find('select[name="system.usageDie.max"]').val() || "d20";
      this.item.update({"system.usageDie.die": upgradeDie(die, 1, max)});
    });

    html.find('.usage-die-refill').click(() =>
    {
      const max = sentenceUsageSize(this.item) || html.find('select[name="system.usageDie.max"]').val();
      if(max) this.item.update({"system.usageDie.die": max});
    });


    if(this.item.type === "crucible") this._activateRecipeListeners(html);
    if(this.item.type === "gift") this._activateGiftEffectListeners(html);
    bindEffectsTab(this, html);
  }

  /**
   * Mystic Gift Effect Modelling (2026-09-29). Same shape as the recipe
   * editor below: the inputs carry no `name`, so the form submit never sees
   * them, and each writes its one field into the flag on change.
   */
  _activateGiftEffectListeners(html)
  {
    const item = this.item;
    const indexOf = ev => Number(ev.currentTarget.closest("[data-effect-index]")?.dataset.effectIndex);

    html.find(".gift-effect-field").change(ev =>
      updateEffect(item, indexOf(ev), ev.currentTarget.dataset.field, ev.currentTarget.value));
    html.find(".gift-effect-delete").click(ev => removeEffect(item, indexOf(ev)));
    html.find(".gift-effect-add").click(() => addEffect(item, blankEffect(html.find(".gift-effect-add-kind").val() || "damage")));
    html.find(".gift-effect-suggest").click(ev =>
    {
      const s = suggestionsFor(item)[Number(ev.currentTarget.dataset.suggestion)];
      if(s) addEffect(item, s);
    });
  }

  /**
   * Crucible Recipe Inscription (2026-09-19). The recipe inputs carry no
   * `name` attribute, so the sheet's own form submit never sees them; each
   * writes its one field into the flag on change.
   */
  _activateRecipeListeners(html)
  {
    const item = this.item;
    const indexOf = ev => Number(ev.currentTarget.closest("[data-recipe-index]")?.dataset.recipeIndex);

    html.find(".recipe-field").change(ev =>
      updateRecipe(item, indexOf(ev), ev.currentTarget.dataset.field, ev.currentTarget.value));
    html.find(".recipe-delete").click(ev => removeRecipe(item, indexOf(ev)));
    html.find(".recipe-add").click(() => addRecipe(item, blankRecipe()));

    // Dropping an Elixir item inscribes it: whole if it is on the sample
    // table, by name alone otherwise.
    const zone = html.find(".crucible-recipes")[0];
    if(!zone) return;
    zone.addEventListener("dragover", ev => ev.preventDefault());
    zone.addEventListener("drop", async ev =>
    {
      ev.preventDefault();
      ev.stopPropagation();
      const data = TextEditor.getDragEventData(ev);
      if(data?.type !== "Item") return;
      const dropped = await fromUuid(data.uuid);
      if(!dropped || dropped.id === item.id) return;
      const recipe = recipeFromItem(dropped);
      const added = await addRecipe(item, recipe);
      if(!added) ui.notifications.info(`${item.name} already has a recipe for ${recipe.name}.`);
    });
  }
}
