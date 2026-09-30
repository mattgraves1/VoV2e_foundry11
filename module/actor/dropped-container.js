/**
 * Dropped Item Container — foundry-system-index.csv.
 *
 * A Drop control on carried item rows that moves the Item onto a container
 * actor representing the ground, so a player can shed gear without destroying
 * it. Anyone who owns the box — everyone — picks an item back up with Take
 * or by dragging it onto their character (RULED 2026-09-19, Matt, below).
 *
 * WHY THIS EXISTS. Item Control Visibility hid Delete from non-GMs, which
 * removed the only way a player sheds an item — a routine action in a game
 * with a hard slot cap. This is the replacement, and it is a better one than
 * Delete ever was: Delete destroyed the object, so loot dropped in a room
 * simply ceased to exist.
 *
 * ONE BOX PER WORLD, EACH ITEM STAMPED WITH ITS SCENE — Matt, 2026-09-08.
 * This is the alternative the row recorded as a fallback, and a permission
 * check promoted it to the chosen design. The original ruling was one
 * container per scene, created lazily by the drop itself. That cannot work
 * for the case the row's own DONE WHEN names:
 *
 *   Actor creation is not a player permission. v11 sets ACTOR_CREATE's
 *   defaultRole to ASSISTANT (common/constants.mjs), and this world stores
 *   `ACTOR_CREATE: [3,4]` — Assistant and GM. Verified 2026-09-08 by reading
 *   the world's own settings, not assumed from the default.
 *
 * So under per-scene lazy creation the FIRST drop in every scene needs a
 * write only a GM can make, and "a player can drop with no GM present" fails
 * once per scene forever. With one box the creation happens once ever, on a
 * GM client at startup, and every drop after it is an Item write onto an
 * actor the player already owns — no socket relay, which is the property
 * that made this row small in the first place.
 *
 * WHAT IS LOST is opening a container per room. The record is not lost with
 * it: `flags.vaarn.dropScene` moves from the container onto each dropped
 * Item, so where something was left is still recorded per item, which is
 * what the hexcrawl case actually needed.
 *
 * THE NO-ACTIVE-SCENE REFUSAL IS KEPT (Matt ruled it 2026-09-07, and the
 * fallback note said one box would make it unnecessary). It is not
 * unnecessary. With no scene there is no stamp, so the item would land in
 * the box recording nowhere — a hole in exactly the record the box exists to
 * be. Refusing says so and changes nothing, which is the ruling's own shape:
 * do not void the item and do not invent a place.
 *
 * LINK BY SCENE ID, NEVER BY NAME. A name link breaks silently on a scene
 * rename — the lesson already written into macros/dev/backfill-exotica-flag.js,
 * which matched on name for a one-off sweep and says so in its own header.
 * An id also makes orphan detection possible: an item whose scene id no
 * longer resolves is findable, which a name never gives you.
 *
 * USE game.scenes.active, NEVER game.scenes.current. Verified 2026-09-07 by
 * reading v11's own getters: `active` is find(s => s.active), the
 * world-global activated scene, identical for every client. `viewed` is
 * find(s => s.isView) and is per-client. `current` returns VIEWED whenever
 * the canvas is up, so despite the name it is per-client too. A player
 * dropping while looking at one scene and a GM watching another would
 * otherwise disagree about where the item went, and the obvious-looking
 * property is the wrong one.
 *
 * PICKUP CANNOT BE ENFORCED BY PERMISSIONS while players can see the box,
 * and it should not be claimed that it can. Core drag-drop checks the
 * RECEIVING sheet, so a player can drag from anything they can see onto
 * their own sheet. What that produces is a COPY — removing from the box
 * needs ownership of the box — so a player can never empty it, only
 * duplicate out of it. That is the same pre-existing exploit already
 * recorded on Item Transfer Between Actors, not a new hole this opens.
 * Matt's actual goal survives it: no disputes about whether something was
 * picked back up, which comes from the box being an auditable record of
 * what was dropped. That holds whatever the permissions say, and GM-only
 * pickup is then a convention backed by there being no take control.
 *
 * SUPERSEDED 2026-09-19 (Matt): "I want behavior to be consistent." The box
 * now picks up exactly as a treasure cache does — the Take control on its
 * sheet, or a drag onto a character, both through item-transfer.js's move.
 * The copy exploit described above is closed by that same drop override, so
 * picking up REMOVES the Item from the box: the record of what lies on the
 * ground stays true, which was the goal GM-only pickup was protecting.
 */

import { isIntrinsic } from "../item/intrinsic.js";
import { publicNameOf, viewerNameOf } from "../item/identification.js";

/** Flag scope and key, used on the container actor and on every dropped Item. */
const FLAG_SCOPE = "vaarn";
const SCENE_FLAG = "dropScene";
const BOX_FLAG = "dropBox";

/** The container's cosmetic name. Nothing looks it up by this. */
export const CONTAINER_NAME = "Dropped Items";

/**
 * Can this Item be put on the ground at all?
 *
 * Intrinsics cannot — a character cannot put their own hand on the floor —
 * which is why this row is a consumer of Intrinsic Item Marker rather than
 * testing `type`. The base Unarmed Strike is a weaponMelee exactly like a
 * sword, so type answers this wrongly for precisely the items that matter.
 *
 * Wounds cannot either, for the same reason Item Transfer refuses them: they
 * are removed by healing from the Wounds tab, not by being set down.
 */
export function isDroppable(item)
{
  if(!item) return false;
  if(item.type === "wound") return false;
  return !isIntrinsic(item);
}

/**
 * The world's one container, or null.
 *
 * Found by flag rather than by name so a GM renaming it in the sidebar — or
 * a second actor being called "Dropped Items" — cannot break or hijack the
 * lookup. The type check is what keeps a flagged character out of it.
 */
export function findContainer()
{
  return game.actors?.find(a =>
    a.type === "container" && a.getFlag(FLAG_SCOPE, BOX_FLAG) === true) ?? null;
}

/**
 * Create the container. GM-only by permission, so every caller must have
 * checked first — this does not check, it just fails the way Foundry fails.
 *
 * OWNERSHIP IS THE WHOLE POINT. `default: OWNER` is what lets a player write
 * their own dropped item onto it with no socket relay. It is also why the
 * container had to become a real Actor type rather than a flag on an npc:
 * module/combat/initiative.js reads hasPlayerOwner as "on the players'
 * side", so a player-owned box would otherwise be a player-side combatant
 * by construction. See the type guard in sideOf().
 */
export async function createContainer()
{
  return Actor.create({
    name: CONTAINER_NAME,
    type: "container",
    img: "icons/svg/chest.svg",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    flags: { [FLAG_SCOPE]: { [BOX_FLAG]: true } }
  });
}

/**
 * Make the box if it is missing. Runs on exactly one GM client at startup.
 *
 * `game.users.activeGM` sorts active GMs by id and returns the first
 * (v11 client/data/collections/users.js), so with two GM clients connected
 * this is true on one of them and false on the other. Without that, both
 * would create a box and the world would have two — and `findContainer`
 * would then return whichever the collection happened to order first, which
 * is the kind of intermittent wrong answer that never gets diagnosed.
 */
export async function ensureContainer()
{
  if(game.users?.activeGM !== game.user) return null;
  if(findContainer()) return null;
  return createContainer();
}

/**
 * Which scene an already-dropped Item was left in. Returns the Scene, or
 * null when the id no longer resolves — a scene deleted after the drop.
 * That is the orphan case id-linking exists to make findable.
 */
export function sceneOfDropped(item)
{
  const id = item?.getFlag?.(FLAG_SCOPE, SCENE_FLAG) ?? item?.flags?.[FLAG_SCOPE]?.[SCENE_FLAG];
  return id ? (game.scenes?.get(id) ?? null) : null;
}

/**
 * Put a carried Item on the ground.
 *
 * Create on the container FIRST, and only delete from the source once that
 * has actually returned a document — the same ordering, for the same reason,
 * as transferItem(). There is no cross-document transaction in Foundry, so
 * this cannot be atomic; ordering it this way picks which way it breaks. A
 * failed create leaves the source untouched, a failed delete leaves a
 * duplicate, and the item is never destroyed. Losing a player's gear is
 * unrecoverable; a duplicate is a GM deleting one.
 */
export async function dropItem(item)
{
  const source = item?.parent;
  if(!item || !source) return null;

  if(!isDroppable(item))
  {
    ui.notifications.warn(`${viewerNameOf(item)} is part of ${source.name} and cannot be dropped.`);
    return null;
  }

  // Refused, per Matt's ruling: with no active scene there is nowhere to
  // record, so say so and change nothing rather than banking an item that
  // remembers no place.
  const scene = game.scenes?.active ?? null;
  if(!scene)
  {
    ui.notifications.warn(`No scene is active, so there is nowhere to drop ${viewerNameOf(item)}. Activate a scene first — nothing was changed.`);
    return null;
  }

  let box = findContainer();
  if(!box)
  {
    if(!game.user.can("ACTOR_CREATE"))
    {
      ui.notifications.error(`There is no ${CONTAINER_NAME} actor in this world and you cannot create one. Ask the GM to log in once — nothing was changed.`);
      return null;
    }
    try { box = await createContainer(); }
    catch(err)
    {
      ui.notifications.error(`Could not create ${CONTAINER_NAME} — ${err.message}. Nothing was changed.`);
      return null;
    }
  }

  const data = item.toObject();
  delete data._id;
  // Lands unequipped, so it never reads as worn by the ground and never
  // silently consumes anyone's hands budget if it is later picked up.
  // Charges need no handling — toObject() carries system data, so a
  // part-used usage die or usesRemaining travels with the item already.
  data.system = data.system ?? {};
  data.system.equipped = false;
  data.flags = data.flags ?? {};
  data.flags[FLAG_SCOPE] = { ...(data.flags[FLAG_SCOPE] ?? {}), [SCENE_FLAG]: scene.id };

  let created;
  try { created = (await box.createEmbeddedDocuments("Item", [data]))?.[0]; }
  catch(err)
  {
    ui.notifications.error(`Could not drop ${viewerNameOf(item)} — ${err.message}. Nothing was changed.`);
    return null;
  }
  if(!created)
  {
    ui.notifications.error(`Could not drop ${viewerNameOf(item)}. Nothing was changed.`);
    return null;
  }

  const droppedName = publicNameOf(item);
  try { await item.delete(); }
  catch(err)
  {
    ui.notifications.error(`${droppedName} reached ${CONTAINER_NAME} but could NOT be removed from ${source.name} — there are now two. Delete one by hand.`);
    return created;
  }

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: source }),
    content: `<b>${source.name}</b> drops <b>${droppedName}</b> in <b>${scene.name}</b>.`
  });
  return created;
}
