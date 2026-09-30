import { upgradeDie } from "./usage-die.js";
import { isExotica, valueLabelOf } from "./xp-value.js";
import { kindLabelOf } from "./item-kind.js";
import { conditionalValueOf } from "./tag-modifiers.js";
import { hiddenFrom, STAND_IN_NAME, STAND_IN_IMG } from "./identification.js";
import { recipesForDisplay, recipeFromItem, addRecipe, updateRecipe, removeRecipe,
         blankRecipe } from "./crucible-recipes.js";
import { qualityReadout } from "./trade-good-quality.js";
import { saleSpanOf, openSaleDialog } from "./false-sale.js";
import { effectsOf, addEffect, updateEffect, removeEffect, blankEffect, suggestionsFor, effectSummary,
         EFFECT_KINDS, CONDITION_CHOICES, DAMAGE_TYPE_CHOICES } from "./gift-effects.js";

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
    data.conditionalValue = data.isExotica
      ? null
      : conditionalValueOf(this.item.system?.tradeValue, this.item.system?.tags ?? []);

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
    const usage = this.item.system?.usageDie;
    data.hasUsageDie = !!(usage && (usage.die || usage.max));

    // With the block gone there is no way back to it from the sheet, so one
    // link starts a die. GM-ONLY, RULED 2026-09-20 (Matt): rating an item is
    // the Referee's call, not something a player does to their own gear. A UI
    // gate and not a boundary, on the same terms as the readout above.
    data.canAddUsageDie = data.isGM && !data.hasUsageDie;

    data.standInName = STAND_IN_NAME;
    data.standInImg = STAND_IN_IMG;

    // Mystic Gift Effect Modelling (2026-09-29): the Effects tab. Each entry
    // carries its kind as booleans so the template shows only its own fields.
    if(this.item.type === "gift")
    {
      data.giftEffects = effectsOf(this.item).map((e, index) => ({
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
      const max = html.find('select[name="system.usageDie.max"]').val() || "d20";
      this.item.update({"system.usageDie.die": upgradeDie(die, 1, max)});
    });

    html.find('.usage-die-refill').click(() =>
    {
      const max = html.find('select[name="system.usageDie.max"]').val();
      if(max) this.item.update({"system.usageDie.die": max});
    });

    // Usage Die Field Visibility (2026-09-20). Writes the die AND its max
    // together: `max` is what Refill to Max reads, and a die started without
    // one would refill to the d20 fallback on line 174 rather than to its own
    // rating. d8 because it is the die most of the gear table's "(UdN)"
    // entries carry; the selects are right there to change it. Only the GM's
    // sheet draws this link — see canAddUsageDie in getData.
    html.find('.usage-die-add').click(() =>
      this.item.update({ "system.usageDie.die": "d8", "system.usageDie.max": "d8" }));

    if(this.item.type === "crucible") this._activateRecipeListeners(html);
    if(this.item.type === "gift") this._activateGiftEffectListeners(html);
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
