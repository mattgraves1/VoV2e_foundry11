import { sceneOfDropped } from "./dropped-container.js";
import { isCache } from "./treasure-cache.js";
import { handleItemDrop, openMoveDialog } from "./item-transfer.js";
import { markUnidentified, appraise, openIdentifySave, trackItemUse } from "../item/identification.js";

/**
 * The Dropped Items box's sheet — foundry-system-index.csv "Dropped Item
 * Container".
 *
 * Extends core ActorSheet, NOT KnaveActorSheet. The row called for "a short
 * sheet class — inventory and nothing else, a new small sheet rather than a
 * trimmed character sheet", and inheriting the character sheet would bring
 * every roll handler it has: ability saves, morale, armour, weapon attacks.
 * A container has no abilities to save with, so those would be handlers
 * bound to markup that is not there — working code kept alive against a
 * document that cannot feed it.
 *
 * A TAKE CONTROL ON EVERY ROW, for anyone who owns the container (RULED
 * 2026-09-19, Matt, for consistency with treasure caches). This replaced a
 * deliberate no-take design where pickup was a GM action; the reason that
 * design gave — an auditable record of what was dropped — survives, because
 * Take MOVES the Item off the box rather than copying it.
 *
 * GROUPED BY SCENE, because that is the whole reason each Item carries
 * flags.vaarn.dropScene. One flat list of everything ever dropped is the
 * thing the per-scene-container design was trying to avoid; grouping
 * recovers it without the forty empty actors.
 *
 * A TREASURE CACHE USES THIS SHEET TOO (Treasure Cache Generation,
 * 2026-09-19), and differs in two ways. Its Items were never dropped, so they
 * are one plain list rather than scene groups that would all read "Scene no
 * longer exists". Take works the same on both; a cache is simply hidden
 * until the GM shares it with Configure Ownership.
 */
export class VaarnContainerSheet extends ActorSheet
{
  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      classes: ["knave", "sheet", "actor", "container"],
      template: "systems/vaarn/templates/actor/container-sheet.html",
      width: 560,
      height: 520
    });
  }

  /** @override */
  getData()
  {
    const sheet = super.getData();
    sheet.isGM = game.user.isGM;
    sheet.isCache = isCache(this.actor);
    sheet.canTake = this.actor.isOwner;

    if(sheet.isCache)
    {
      const items = Array.from(this.actor.items).sort((a, b) => a.name.localeCompare(b.name));
      sheet.groups = items.length ? [{ name: null, orphan: false, items }] : [];
      sheet.isEmpty = items.length === 0;
      return sheet;
    }

    // Group by the scene each item was dropped in. A scene id that no
    // longer resolves is its own group rather than being hidden or
    // silently folded into another — an orphaned drop is exactly what id
    // linking exists to make findable, so it must be visible when it
    // happens.
    const groups = new Map();
    for(const item of this.actor.items)
    {
      const scene = sceneOfDropped(item);
      const key = scene?.id ?? "__orphan__";
      if(!groups.has(key))
        groups.set(key, { name: scene?.name ?? "Scene no longer exists", orphan: !scene, items: [] });
      groups.get(key).items.push(item);
    }

    sheet.groups = Array.from(groups.values())
      .sort((a, b) => a.orphan - b.orphan || a.name.localeCompare(b.name));
    sheet.isEmpty = sheet.groups.length === 0;
    return sheet;
  }

  /**
   * Same drop override as the character sheet: a drag from another actor
   * moves or is refused (item-transfer.js handleItemDrop).
   * @override
   */
  async _onDropItem(event, data)
  {
    const handled = await handleItemDrop(this.actor, data);
    return handled === undefined ? super._onDropItem(event, data) : handled;
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);
    trackItemUse(html[0], this.actor);

    // Viewing is not editing — everyone who can open the box can open an
    // item in it, which is what makes it an auditable record rather than a
    // GM-only list.
    html.find('.item-view').click(ev =>
    {
      const li = ev.currentTarget.closest(".item");
      this.actor.items.get(li?.dataset.itemId)?.sheet.render(true);
    });

    if(!this.options.editable) return;

    // Take — for anyone who owns the container, the ground box included. The
    // dialog asks which of the user's characters and, for a stack, how many.
    html.find('.item-take').click(ev =>
    {
      const li = ev.currentTarget.closest(".item");
      openMoveDialog(this.actor.items.get(li?.dataset.itemId));
    });

    // GM-only in the template, and re-checked here rather than trusted:
    // this is the control that takes an item out of the record.
    html.find('.item-delete').click(ev =>
    {
      if(!game.user.isGM) return;
      const li = ev.currentTarget.closest(".item");
      return this.actor.items.get(li?.dataset.itemId)?.delete();
    });

    // Exotica Identification — the same three Referee controls the character
    // sheet has, so a found item can be marked before anyone takes it.
    const itemOf = ev => this.actor.items.get(ev.currentTarget.closest(".item")?.dataset.itemId);
    html.find('.item-unidentify').click(ev => { if(game.user.isGM) markUnidentified(itemOf(ev)); });
    html.find('.item-identify').click(ev => { if(game.user.isGM) appraise(itemOf(ev)); });
    html.find('.item-identify-save').click(ev => { if(game.user.isGM) openIdentifySave(itemOf(ev)); });
  }
}
