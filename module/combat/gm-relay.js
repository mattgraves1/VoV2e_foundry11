/**
 * PLAYER WRITE RELAY TO THE GM (foundry-system-index.csv "Player Write Relay
 * to the GM", RULED 2026-09-27 by Matt: a socket relay, not a GM-clicked
 * button).
 *
 * THE PROBLEM. Foundry lets a user write only to documents they own. A
 * player's attack runs on the PLAYER's client, so its damage write to a
 * monster was refused ("lacks permission to update ActorDelta") while chat
 * still announced the hit and the kill. Group 447.7 measured it; every earlier
 * damage test ran as a GM and so could not.
 *
 * THE FIX. Wrap the write methods of the document classes the combat
 * code writes to - Actor, Item and Combatant, and ChatMessage updates. A write the current user may
 * make goes through untouched. One they may not is sent over the system
 * socket to the ACTIVE GM's client, which makes the same call on the same
 * document (by uuid) and answers. The caller's await resolves after the
 * answer, and Foundry broadcasts every document change before the GM can
 * reply, so code reading the document after the await sees the new value.
 *
 * WRAPPING, NOT REWRITING CALL SITES. The damage path alone touches actors,
 * their items and combatants from dozens of places (setFlag, unsetFlag,
 * embedded creates and deletes, defeat marking); a relay at each would miss
 * the next one written. setFlag and unsetFlag call update, so they are
 * covered without their own wrapper.
 *
 * NOT A SECURITY BOUNDARY, and not meant as one: the GM applies what a player
 * client asks for. CLAUDE.md's "Declined" list settles that the table is not
 * trying to cheat.
 */

const CHANNEL = "system.vaarn";
const TIMEOUT_MS = 10000;
const pending = new Map();

/**
 * May the current user make this write directly? Foundry's own question,
 * canUserModify - NOT isOwner. A chat message is authored, not owned: a
 * player's own message reports isOwner false and canUserModify true, so an
 * isOwner test relayed every player's write to their own cards (Group
 * 450.3). An embedded write is an update of its parent, as Foundry checks it.
 */
function canWriteDirectly(doc, action)
{
  if(game.user.isGM) return true;
  if(!doc?.id || doc.pack) return true;            // unsaved or compendium: not ours to relay
  return doc.canUserModify(game.user, action);
}

/** Plain, socket-safe copy of call arguments. */
function plain(v)
{
  if(v === undefined) return v;
  return JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x.toObject === "function") ? x.toObject() : x));
}

/** Send one write to the active GM and wait for the answer. */
function relay(doc, method, args)
{
  const gm = game.users.activeGM;
  if(!gm)
  {
    const who = doc.name ?? doc.parent?.name ?? "that";
    ui.notifications.warn(`Vaarn: no GM is connected, so the change to ${who} could not be applied. Ask the Referee to log in, or apply it by hand.`);
    return Promise.resolve(undefined);
  }
  const id = foundry.utils.randomID();
  return new Promise(resolve =>
  {
    const timer = setTimeout(() =>
    {
      pending.delete(id);
      console.warn(`Vaarn | GM relay: no answer for ${method} on ${doc.uuid}`);
      ui.notifications.warn(`Vaarn: the Referee's client did not confirm the change to ${doc.name ?? "a document"}.`);
      resolve(undefined);
    }, TIMEOUT_MS);
    pending.set(id, { resolve, timer, doc, method, args });
    game.socket.emit(CHANNEL, { type: "relay", id, from: game.user.id, uuid: doc.uuid, method, args: plain(args) });
  });
}

/**
 * CREATING AN ACTOR (RULED 2026-09-28 by Matt, found on his fresh-world
 * walk-through: a player's Create Character was refused, "lacks permission to
 * create Actor"). A user without Foundry's Create New Actors permission asks
 * the active GM's client to create it, as its OWNER - the ownership Foundry
 * gives a player who creates one themselves. Everything after the create (items,
 * flags) is then the player's own write. Resolves to the world Actor, or null
 * when no GM answered.
 */
export async function createActorAsOwner(data)
{
  const cls = getDocumentClass("Actor");
  if(game.user.isGM || game.user.can("ACTOR_CREATE")) return cls.create(data);
  const actorId = await requestGM("relay-create", { data: plain(data) }, `creating "${data.name}"`);
  return actorId ? game.actors.get(actorId) ?? null : null;
}

/**
 * PLACING A TOKEN (foundry-system-index.csv "Player Token Placement", RULED
 * 2026-09-28 by Matt: Roll20 players expect to drag out their own tokens, and
 * v11 gives token creation to Assistant GMs and up). A player without Create
 * New Tokens asks the active GM's client to place a token of an Actor they
 * own on the Scene they are viewing. Resolves to the TokenDocument, or null.
 */
export async function createTokenAsOwner(scene, data)
{
  if(game.user.isGM || game.user.can("TOKEN_CREATE"))
    return (await scene.createEmbeddedDocuments("Token", [data]))[0] ?? null;
  const tokenId = await requestGM("relay-create-token", { sceneId: scene.id, data: plain(data) },
                                      `placing ${data.name ?? "a token"}`);
  return tokenId ? scene.tokens.get(tokenId) ?? null : null;
}

/**
 * REMOVING A TOKEN (Player Token Placement, RULED 2026-09-28 by Matt: a player
 * who can place their token can take it off again). v11 gives token deletion
 * to Assistant GMs too. A player without Delete Tokens asks the active GM's
 * client to delete tokens of Actors they own. Resolves to true, or null.
 */
export async function deleteTokensAsOwner(scene, ids)
{
  if(!ids?.length) return null;
  if(game.user.isGM || game.user.can("TOKEN_DELETE"))
    return !!(await scene.deleteEmbeddedDocuments("Token", ids)).length;
  const done = await requestGM("relay-delete-token", { sceneId: scene.id, ids }, "removing your token");
  return done ? true : null;
}

/** The GM's side of a player's token removal: only tokens of Actors that player owns. */
async function onDeleteTokenRequest(msg)
{
  let ok = true, error = "", ids;
  try
  {
    const scene = game.scenes.get(msg.sceneId);
    if(!scene) throw new Error("that Scene no longer exists");
    const user = game.users.get(msg.from);
    const theirs = (msg.ids ?? []).filter(id =>
    {
      const t = scene.tokens.get(id);
      return t && user && t.actor?.testUserPermission(user, "OWNER");
    });
    if(!theirs.length) throw new Error(`${user?.name ?? "that player"} owns none of those tokens`);
    ids = (await scene.deleteEmbeddedDocuments("Token", theirs)).map(t => t.id);
  }
  catch(err)
  {
    ok = false;
    error = err.message;
    console.error("Vaarn | GM relay token removal failed:", msg, err);
  }
  game.socket.emit(CHANNEL, { type: "relay-done", id: msg.id, to: msg.from, ok, error, ids });
}

/** Ask the active GM to create or remove something; resolves to the first id, or null. */
async function requestGM(type, payload, what)
{
  if(!game.users.activeGM)
  {
    ui.notifications.warn(`Vaarn: ${what} needs the Referee logged in. Ask them to log in, then try again.`);
    return null;
  }
  const id = foundry.utils.randomID();
  return new Promise(resolve =>
  {
    const timer = setTimeout(() =>
    {
      pending.delete(id);
      ui.notifications.warn(`Vaarn: the Referee's client did not confirm ${what}.`);
      resolve(null);
    }, TIMEOUT_MS);
    pending.set(id, { resolve, timer, create: true });
    game.socket.emit(CHANNEL, { type, id, from: game.user.id, ...payload });
  });
}

/** The GM's side of a player's token placement: only a token of an Actor that player owns. */
async function onCreateTokenRequest(msg)
{
  let ok = true, error = "", ids;
  try
  {
    const scene = game.scenes.get(msg.sceneId);
    if(!scene) throw new Error("that Scene no longer exists");
    const actor = game.actors.get(msg.data?.actorId);
    const user = game.users.get(msg.from);
    if(!actor || !user || !actor.testUserPermission(user, "OWNER"))
      throw new Error(`${user?.name ?? "that player"} does not own ${actor?.name ?? "that actor"}`);
    const [token] = await scene.createEmbeddedDocuments("Token", [msg.data]);
    ids = [token.id];
  }
  catch(err)
  {
    ok = false;
    error = err.message;
    console.error("Vaarn | GM relay token placement failed:", msg, err);
  }
  game.socket.emit(CHANNEL, { type: "relay-done", id: msg.id, to: msg.from, ok, error, ids });
}

async function onCreateRequest(msg)
{
  let ok = true, error = "", ids;
  try
  {
    const data = msg.data ?? {};
    // An ownership object replaces the default one, so it states default too.
    data.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, ...(data.ownership ?? {}),
                       [msg.from]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER };
    const actor = await getDocumentClass("Actor").create(data);
    ids = [actor.id];
  }
  catch(err)
  {
    ok = false;
    error = err.message;
    console.error("Vaarn | GM relay create failed:", msg, err);
  }
  game.socket.emit(CHANNEL, { type: "relay-done", id: msg.id, to: msg.from, ok, error, ids });
}

/** What the caller gets back, rebuilt on the player's side from the GM's answer. */
function resultFor(p, ids)
{
  const { doc, method, args } = p;
  if(method === "createEmbeddedDocuments" || method === "updateEmbeddedDocuments")
  {
    const coll = doc.getEmbeddedCollection(args[0]);
    return (ids ?? []).map(i => coll.get(i)).filter(Boolean);
  }
  if(method === "deleteEmbeddedDocuments") return ids ?? [];
  return doc;
}

async function onMessage(msg)
{
  if(msg?.type === "relay-done")
  {
    if(msg.to !== game.user.id) return;
    const p = pending.get(msg.id);
    if(!p) return;
    clearTimeout(p.timer);
    pending.delete(msg.id);
    if(!msg.ok) ui.notifications.warn(`Vaarn: the Referee's client could not apply a change — ${msg.error}`);
    if(p.create) p.resolve(msg.ok ? msg.ids?.[0] ?? null : null);
    else p.resolve(msg.ok ? resultFor(p, msg.ids) : undefined);
    return;
  }
  if(msg?.type !== "relay" && msg?.type !== "relay-create" && msg?.type !== "relay-create-token" && msg?.type !== "relay-delete-token") return;
  if(!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  if(msg.type === "relay-create") return onCreateRequest(msg);
  if(msg.type === "relay-create-token") return onCreateTokenRequest(msg);
  if(msg.type === "relay-delete-token") return onDeleteTokenRequest(msg);

  let ok = true, error = "", ids;
  try
  {
    const doc = await fromUuid(msg.uuid);
    if(!doc) throw new Error(`no document ${msg.uuid}`);
    const out = await doc[msg.method](...(msg.args ?? []));
    if(Array.isArray(out)) ids = out.map(d => d?.id ?? d);
  }
  catch(err)
  {
    ok = false;
    error = err.message;
    console.error("Vaarn | GM relay failed:", msg, err);
  }
  game.socket.emit(CHANNEL, { type: "relay-done", id: msg.id, to: msg.from, ok, error, ids });
}

/** Wrap one method so a write the user may not make is relayed. */
function wrap(cls, method)
{
  const original = cls.prototype[method];
  if(typeof original !== "function") return;
  const action = method === "delete" ? "delete" : "update";
  cls.prototype[method] = function(...args)
  {
    if(canWriteDirectly(this, action)) return original.apply(this, args);
    return relay(this, method, args);
  };
}

/** Called from knave.js at init. */
export function registerGmRelay()
{
  for(const cls of [CONFIG.Actor.documentClass, CONFIG.Item.documentClass, CONFIG.Combatant.documentClass])
  {
    wrap(cls, "update");
    wrap(cls, "delete");
  }
  for(const method of ["createEmbeddedDocuments", "updateEmbeddedDocuments", "deleteEmbeddedDocuments"])
    wrap(CONFIG.Actor.documentClass, method);
  // JOINING A FIGHT (Player Token Placement, 2026-09-28). The token HUD's
  // combat toggle adds a Combatant to the GM's Combat, and v11's server
  // refuses that for a player (the parent Combat is the GM's), whatever the
  // Combatant's own permission says - found in Group 474.6. Relayed like any
  // other write. Foundry itself keeps removal to the GM.
  wrap(CONFIG.Combat.documentClass, "createEmbeddedDocuments");
  // CHAT MESSAGE UPDATES (RULED 2026-09-27 by Matt, from Group 449's research).
  // A card button that records "already applied" on the card writes to a
  // message the GM's client posted - the round card's per-round ability and
  // escalating HP buttons, and a Gift or codex damage card the GM rolled for
  // a player - and a player may update only their own messages, so the click
  // was refused before anything landed. update covers setFlag. Creating a
  // message needs no relay; players may post.
  wrap(CONFIG.ChatMessage.documentClass, "update");
  Hooks.once("ready", () => game.socket.on(CHANNEL, onMessage));
}
