/**
 * PLAYER TOKEN PLACEMENT (foundry-system-index.csv "Player Token Placement",
 * RULED 2026-09-28 by Matt). Roll20 players expect to drag their own token out,
 * and Foundry v11 gives token creation to Assistant GMs and up: the Actors tab
 * will not even start the drag, and the canvas refuses the drop.
 *
 * A player may now drag an Actor they OWN from the Actors tab onto the Scene
 * they are viewing; the active GM's client places the token (gm-relay.js,
 * createTokenAsOwner), the way a player's character is created. Everything
 * else is as Foundry has it: an Actor they do not own is refused with Foundry's
 * own words, a compendium creature is the Referee's to place, and a user who
 * HAS Create New Tokens goes through Foundry's own drop untouched.
 *
 * Removing it: the Delete key on their selected tokens of Actors they own is
 * relayed the same way (deleteTokensAsOwner), since v11 also keeps token
 * deletion from players and skips such tokens with no message.
 *
 * Joining a fight is relayed in gm-relay.js (Combat.createEmbeddedDocuments):
 * v11's server refuses a player's Combatant in the GM's Combat, whatever
 * BaseCombatant's own permission says (Group 474.6).
 */
import { createTokenAsOwner, deleteTokensAsOwner } from "../combat/gm-relay.js";

/** Called from knave.js at init, before the sidebar is built. */
export function registerTokenPlacement()
{
  // The drag. ActorDirectory's constructor gates dragstart on TOKEN_CREATE;
  // the drop target decides what a drag may do, so any user may start one.
  const Base = CONFIG.ui.actors;
  CONFIG.ui.actors = class VaarnActorDirectory extends Base
  {
    constructor(...args)
    {
      super(...args);
      this._dragDrop[0].permissions.dragstart = () => true;
    }
    _canDragStart(selector) { return true; }
  };

  // The drop.
  const original = TokenLayer.prototype._onDropActorData;
  TokenLayer.prototype._onDropActorData = async function(event, data)
  {
    if(game.user.can("TOKEN_CREATE")) return original.call(this, event, data);

    const actor = await Actor.implementation.fromDropData(data);
    if(!actor) return;
    if(actor.compendium || actor.pack)
      return ui.notifications.warn(`Only the Referee can place ${actor.name} from a compendium.`);
    if(!actor.isOwner)
      return ui.notifications.warn(`You do not have permission to create a new Token for the ${actor.name} Actor.`);

    // Placed as Foundry's own drop places it: snapped to the grid unless Shift.
    const td = await actor.getTokenDocument({ x: data.x, y: data.y, hidden: false });
    if(event.shiftKey) td.updateSource({ x: td.x - (td.width * canvas.grid.w / 2), y: td.y - (td.height * canvas.grid.h / 2) });
    else td.updateSource(canvas.grid.getSnappedPosition(td.x - (td.width * canvas.grid.w / 2), td.y - (td.height * canvas.grid.h / 2)));
    if(!canvas.dimensions.rect.contains(td.x, td.y)) return false;

    this.activate();
    return createTokenAsOwner(canvas.scene, td.toObject());
  };

  // Taking it off again (RULED 2026-09-28, Matt). v11's Delete key skips any
  // token the user may not delete, silently; a player without Delete Tokens
  // has the GM's client remove the selected tokens of Actors they own.
  const originalDelete = TokenLayer.prototype._onDeleteKey;
  TokenLayer.prototype._onDeleteKey = async function(event)
  {
    if(game.user.isGM || game.user.can("TOKEN_DELETE")) return originalDelete.call(this, event);
    const dragging = MouseInteractionManager.INTERACTION_STATES.DRAG;
    const ids = this.controlled
      .filter(t => t.interactionState !== dragging && !t.document.locked && t.actor?.isOwner)
      .map(t => t.id);
    if(!ids.length) return;
    if(ids.includes(this.hover?.id)) this.hover = null;
    return deleteTokensAsOwner(canvas.scene, ids);
  };
}
