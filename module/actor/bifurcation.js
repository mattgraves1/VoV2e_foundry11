/**
 * Character Split/Clone — Bifurcating Brew (2026-09-18).
 *
 * JADE IBIS, Example Elixirs 82-83: "Drinker splits into two hypergeometric
 * halves, each with half the character's max HP. They move and act
 * independently. If one half dies, it resurrects with full HP as long as the
 * other half lives. Lasts 4 Exploration Turns."
 *
 * RULED 2026-09-18 (Matt), and none of it is stated by the book beyond the
 * sentence above:
 * - Max HP AND current HP are halved, the drinker rounding up and the half
 *   rounding down: 9/9 -> 5/5 and 4/4.
 * - The half is a second CHARACTER Actor with the same owners. It copies the
 *   drinker's intrinsic Items and Wounds, and none of their carried gear.
 * - It copies no other active state: no board entries, curses, level drains -
 *   nothing in flags.vaarn. It starts with only its own Brew entry.
 * - Both halves are Hypergeometric for the duration, from a board entry each.
 * - At expiry the drinker's max HP comes back through the board's ordinary
 *   reversal, and the expiry card gives the GM a "Remove the half" button.
 *   Whatever happened to the half is the table's to settle.
 * - Characters only.
 * - The resurrection sentence is NOT automated: both halves are characters and
 *   most likely die of Wounds, not at a single threshold.
 */

import { addEntry, expiryFor, SCOPE } from "../time/effect-board.js";
import { isIntrinsic } from "../item/intrinsic.js";
import { declaredSpanOf } from "../time/declared-span.js";
import { gmHP } from "./hidden-hp.js";
import { ELIXIRS } from "./chargen-data.js";

export const BIFURCATING_BREW = "Bifurcating Brew";
const HYPERGEOMETRIC = "hypergeometric";

/** Drink the Brew. Returns the half Actor, or null when refused. */
export async function bifurcate(item, post)
{
  const actor = item?.parent;
  if(!actor) return null;

  if(actor.type !== "character")
  {
    ui.notifications.warn(`Only a character can drink ${item.name} — it has NOT been drunk.`);
    return null;
  }

  const max = Number(actor.system.health.max) || 0;
  if(max < 2)
  {
    ui.notifications.warn(`${actor.name} has ${max} max HP, too little to split — ${item.name} has NOT been drunk.`);
    return null;
  }

  const text = item.system?.description || item.system?.effect || "";
  const span = declaredSpanOf(item);
  const amount = Number(span?.raw);
  if(!span || !(amount > 0))
  {
    ui.notifications.warn(`"${item.name}" states no duration this system could read — it has NOT been drunk.`);
    return null;
  }

  const cur = Number(actor.system.health.value) || 0;
  const keep = { max: Math.ceil(max / 2),  value: cur > 0 ? Math.ceil(cur / 2)  : cur };
  const half = { max: Math.floor(max / 2), value: cur > 0 ? Math.floor(cur / 2) : cur };

  const created = await Actor.create(halfData(actor, half));

  const now = game.time?.worldTime ?? 0;
  const round = game.combat?.round ?? null;
  const stamps = expiryFor({ amount, unit: span.unit, now, round });
  const shared = { text, startTime: now, startRound: round, ...stamps };

  // The entry before the HP write, as _useDurationElixir orders it: if the
  // write came first and the entry failed, nothing would ever give the HP back.
  await addEntry(actor, {
    ...shared, name: item.name,
    note: `the other half is ${created.name}`,
    splitHalfId: created.id,
    applied: { maxHp: keep.max - max, creatureTypes: [HYPERGEOMETRIC] }
  });
  await addEntry(created, {
    ...shared, name: item.name,
    note: `the other half of ${actor.name}`,
    applied: { creatureTypes: [HYPERGEOMETRIC] }
  });
  await actor.update({ "system.health.max": keep.max, "system.health.value": keep.value });

  await placeHalfToken(actor, created);

  post(actor, `drinks <b>${item.name}</b> and splits in two. ${actor.name} keeps ` +
    `${gmHP(actor, `<b>${keep.value}/${keep.max}</b> HP`)}; <b>${created.name}</b> has ${gmHP(actor, `<b>${half.value}/${half.max}</b>`)}. ` +
    `Both are Hypergeometric and act independently until the Brew wears off.`);
  await item.delete();
  return created;
}

/**
 * Drink an elixir whose `clone` spec makes a copy that dissolves with the span
 * - Doppeldraught (2026-09-24): "Drinker vomits a jelly-clone of themself. It
 * is translucent, mute, and follows orders. Dissolves in 4 Exploration Turns."
 *
 * RULED 2026-09-23 (Matt): made the Brew's way - the drinker's intrinsic Items
 * and Wounds carried, gear left behind, the same owners - and removed when the
 * span ends. Where the Brew halves HP because its sentence says so, this one
 * says nothing about HP, so the clone is a copy: current and maximum as they
 * stand, the drinker untouched.
 *
 * THE CLONE'S OWN ROW IS ITS LIFETIME, the Healing Field's shape: its entry
 * carries removesActor, so expiry, a Referee deleting the row and combat's end
 * all dissolve it through the board's one undo, and the Ended card says
 * "removed". The drinker's row is the reminder that the clone exists and
 * takes nothing back, because nothing was written to the drinker. The Brew's
 * "Remove the half" button stays the Brew's: its half is the table's to
 * settle, a jelly-clone is not.
 */
export async function cloneFromElixir(item, post)
{
  const actor = item?.parent;
  const spec = ELIXIRS.find(e => e.name === item?.name)?.clone;
  if(!actor || !spec) return null;

  if(actor.type !== "character")
  {
    ui.notifications.warn(`Only a character can drink ${item.name} — it has NOT been drunk.`);
    return null;
  }

  const text = item.system?.description || item.system?.effect || "";
  const span = declaredSpanOf(item);
  const amount = Number(span?.raw);
  if(!span || !(amount > 0))
  {
    ui.notifications.warn(`"${item.name}" states no duration this system could read — it has NOT been drunk.`);
    return null;
  }

  const hp = { max: Number(actor.system.health.max) || 0, value: Number(actor.system.health.value) || 0 };
  const created = await Actor.create(halfData(actor, hp, spec.suffix || "Clone"));

  const now = game.time?.worldTime ?? 0;
  const round = game.combat?.round ?? null;
  const stamps = expiryFor({ amount, unit: span.unit, now, round });
  const shared = { text, startTime: now, startRound: round, ...stamps };

  await addEntry(actor, { ...shared, name: item.name, note: `the clone is ${created.name}` });
  await addEntry(created, {
    ...shared, name: item.name,
    note: `a jelly-clone of ${actor.name}`,
    removesActor: !!spec.dissolves
  });

  await placeHalfToken(actor, created);

  post(actor, `drinks <b>${item.name}</b> and vomits up <b>${created.name}</b> — translucent, mute, and following orders, ` +
    `with ${gmHP(actor, `<b>${hp.value}/${hp.max}</b> HP`)}. It dissolves when the ${item.name} wears off.`);
  await item.delete();
  return created;
}

/**
 * The half's creation data: the drinker as they stand, minus carried gear and
 * active state.
 *
 * A BONUS BAKED IN BY GEAR IS TAKEN BACK. Exotica write flat numbers into
 * system at creation and record them on the Item; the half copies system but
 * not the Item, so it would otherwise keep a bonus from something it is not
 * carrying. Abilities, item slots and hands are subtracted. HP is not: the book
 * halves "the character's max HP" as it stands.
 */
function halfData(actor, hp, suffix = "Half")
{
  const data = actor.toObject();
  delete data._id;
  data.name = `${actor.name} (${suffix})`;

  const kept = [], left = [];
  for(const it of data.items ?? [])
    (isIntrinsic(it) || it.type === "wound" ? kept : left).push(it);
  data.items = kept;

  for(const it of left)
  {
    const rec = it.flags?.vaarn?.bakedEffects;
    if(!rec) continue;
    for(const [key, amount] of Object.entries(rec.abilities || {}))
      if(data.system.abilities?.[key])
        data.system.abilities[key].value = Number(data.system.abilities[key].value) - Number(amount);
    if(rec.slotBonus)  data.system.inventorySlots.max = Number(data.system.inventorySlots.max) - rec.slotBonus;
    if(rec.handsBonus) data.system.hands.max = Number(data.system.hands.max) - rec.handsBonus;
  }

  data.system.health.max = hp.max;
  data.system.health.value = hp.value;

  // No active state: board entries, curses, drains and every other runtime
  // flag live here. The half's own Brew entry is added after creation.
  if(data.flags) delete data.flags[SCOPE];

  data.prototypeToken = { ...(data.prototypeToken ?? {}), name: data.name, actorLink: true };
  return data;
}

/** A linked token beside the drinker's, on the scene the drinker stands in. */
async function placeHalfToken(actor, created)
{
  const token = actor.getActiveTokens(false, true)[0];
  const scene = token?.parent;
  if(!scene) return;
  const grid = scene.grid?.size ?? 100;
  const tokenData = (await created.getTokenDocument({ x: token.x + grid, y: token.y })).toObject();
  tokenData.actorLink = true;
  await scene.createEmbeddedDocuments("Token", [tokenData]);
}

/**
 * The GM's "Remove the half" button on the expiry card. Deletes the half's
 * tokens on every scene, then the Actor. Linked tokens are not removed with
 * their Actor in Foundry, so they have to go first or they are left orphaned.
 */
export async function removeHalf(actorId)
{
  if(!game.user.isGM) return ui.notifications.warn("Only the Referee removes a half.");
  const half = game.actors.get(actorId);
  if(!half) return ui.notifications.info("That half has already been removed.");
  for(const scene of game.scenes)
  {
    const ids = scene.tokens.filter(t => t.actorId === actorId).map(t => t.id);
    if(ids.length) await scene.deleteEmbeddedDocuments("Token", ids);
  }
  const name = half.name;
  await half.delete();
  ChatMessage.create({ content: `<b>${name}</b> is gone — the Bifurcating Brew has worn off.` });
}
