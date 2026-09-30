/**
 * Room Type Roll (foundry-system-index.csv row of that name).
 *
 * What one vault room holds. A room first gets a TYPE - the node types the
 * book's Node Cluster Maps draw - by Matt's d12 (ROOM_TYPES, RULED 2026-09-27),
 * or chosen by the Referee building a vault by hand. Then it gets exactly the
 * follow-up rolls Creating Vaults gives that type:
 *
 *   uninhabited      Contents A and Contents B, each d6 (step 4), and whatever
 *                    they call for - lair, treasure, hazard, room feature,
 *                    trinket, fauna or flora, hint, special room
 *   lair             a lair at the room's depth, and a room feature (step 5)
 *   treasure         Treasure Rooms at the room's depth (step 7)
 *   lair + treasure  both, and a room feature
 *   special          Special Rooms, and Vault Merchants when it calls for one (step 8)
 *
 * Room features go by the room's TYPE, as the book gives them (RULED
 * 2026-09-27, Matt): an uninhabited room gets one only when Contents B rolls
 * it, even when its Contents A rolled a lair.
 *
 * Three steps, kept apart so a later control can run the last one on demand
 * (Contents Buttons on Vault Pages): planRoom decides what a room holds and is
 * pure; rollRoomText rolls the table results; createRoomDocuments spawns the
 * lair's creatures and the treasure container. Generate Room Contents and the
 * vault journal both call these.
 */

import { CONTENTS_A, CONTENTS_B, ROOM_TYPES } from "../actor/room-contents-data.js";
import { linkTo } from "../actor/room-journal.js";
import { SPECIAL_FOLLOW_UPS, specialNameOf, rollSpecialText, createSpecialDocuments } from "./special-rooms.js";

const d = (n, random) => Math.floor(random() * n) + 1;

/** The ROOM_TYPES entry a d12 result falls in. */
export function roomTypeFor(d12)
{
  return ROOM_TYPES.find(t => d12 >= t.min && d12 <= t.max) ?? null;
}

/** Which follow-ups a room of this type, with these Contents rolls, gets. */
export function followUps(type, contentsA = null, contentsB = null)
{
  const f = { lair: false, treasure: false, special: false, hazard: false, trinket: false, flora: false, hint: false, feature: false };
  if(type === "uninhabited")
  {
    f.lair = contentsA === "Lair";
    f.treasure = contentsA === "Treasure";
    f.hazard = contentsB === "Hazard";
    f.feature = contentsB === "Room Feature";
    f.trinket = contentsB === "Trinket";
    f.flora = contentsB === "Fauna or Flora";
    f.hint = contentsB === "Hint to Hazard or Lair";
    f.special = contentsB === "Special Room";
  }
  if(type === "lair" || type === "lairTreasure") { f.lair = true; f.feature = true; }
  if(type === "treasure" || type === "lairTreasure") f.treasure = true;
  if(type === "special") f.special = true;
  return f;
}

/**
 * A room's type and Contents rolls, and what follows from them. `type` chosen
 * by the Referee skips the d12. Pure given `random`.
 */
export function planRoom({ type = null, random = Math.random } = {})
{
  const d12 = type ? null : d(12, random);
  const entry = type ? ROOM_TYPES.find(t => t.type === type) : roomTypeFor(d12);
  if(!entry) throw new Error(`Unknown room type "${type}".`);
  let contentsA = null, contentsB = null;
  if(entry.type === "uninhabited")
  {
    contentsA = CONTENTS_A[d(6, random) - 1];
    contentsB = CONTENTS_B[d(6, random) - 1];
  }
  return { d12, type: entry.type, label: entry.label, contentsA, contentsB, follow: followUps(entry.type, contentsA, contentsB) };
}

/**
 * An EMPTY room, which can be the vault's entrance (RULED 2026-09-27, Matt, from
 * the book's step 10 'an empty room without hazards or special features'):
 * uninhabited, nothing in Contents A, and no hazard or special room in Contents B.
 */
export function isEmptyRoom(room)
{
  return room.type === "uninhabited" && room.contentsA === "—"
    && room.contentsB !== "Hazard" && room.contentsB !== "Special Room";
}

/**
 * Roll the table results the room's follow-ups call for. Adds them to `room`.
 * `planLairs` also rolls a lair's creatures as text, spawning nothing (a vault
 * journal: Floor Encounter Table, RULED 2026-09-27 by Matt).
 */
export async function rollRoomText(room, depth, { planLairs = false } = {})
{
  const { pickRandomResult, pickRandomResultHtml, pickRangeResult } = await import("/systems/vaarn/module/actor/rolltable-picker.js");
  const f = room.follow;
  if(f.feature) room.featureHtml = await pickRandomResultHtml("Room Features");
  if(f.special)
  {
    const special = await pickRandomResult("Special Rooms");
    room.specialHtml = special.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
    if(special.text.includes("Vault Merchant")) room.merchantHtml = await pickRandomResultHtml("Vault Merchants");
    // Special Room Follow-ups: a text one is rolled now; an item or the daemon is made by createRoomDocuments.
    room.specialName = specialNameOf(special.text);
    const follow = SPECIAL_FOLLOW_UPS[room.specialName];
    if(follow?.kind === "text") room.specialFollowHtml = await rollSpecialText(room.specialName);
    else if(follow) room.specialCreate = room.specialName;
  }
  if(f.hazard)
  {
    room.hazardBase = d(20, Math.random);
    room.hazardTotal = room.hazardBase + depth;
    room.hazardHtml = await pickRangeResult("Vault Hazards", room.hazardTotal);
  }
  if(f.trinket) room.trinketHtml = await pickRandomResultHtml("Vault Trinkets");
  if(f.flora) room.floraHtml = await pickRandomResultHtml("Vault Fauna and Flora");
  if(planLairs && f.lair && !room.lairPlan)
  {
    const { planLair } = await import("/systems/vaarn/module/actor/lair-rooms-roller.js");
    room.lairPlan = await planLair(depth);
  }
  return room;
}

/**
 * Spawn the lair's creatures, create the treasure container, and make a special
 * room's item or daemon. Adds them to `room`. `label` names a special room's
 * container after the room (a vault page's name).
 */
export async function createRoomDocuments(room, depth, { label = "" } = {})
{
  if(room.follow.lair)
  {
    const { rollAndSpawnLairInhabitants, spawnPlannedLair } = await import("/systems/vaarn/module/actor/lair-rooms-roller.js");
    let folder = game.folders.find(f => f.name === "Generated Creatures" && f.type === "Actor");
    if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });
    // A lair rolled earlier as text (a vault journal) spawns exactly what was rolled.
    room.lair = room.lairPlan ? await spawnPlannedLair(room.lairPlan, folder.id) : await rollAndSpawnLairInhabitants(depth, folder.id);
  }
  if(room.follow.treasure)
  {
    const { createTreasureRoom } = await import("/systems/vaarn/module/actor/treasure-cache.js");
    room.treasure = await createTreasureRoom(depth);
  }
  if(room.specialCreate && !room.special) room.special = await createSpecialDocuments(room.specialCreate, label);
  return room;
}

/**
 * The room as lines for the chat card and for its journal page. The page links
 * what the roll created rather than naming it; the hazard lines read as the
 * table prints them, so Hazard Controls on Journal Pages draws their controls.
 */
export function roomLines(room, depth)
{
  const chat = [], page = [`<p><b>Floor / Depth:</b> ${depth}</p>`];
  const both = (chatLine, pageLine = chatLine) => { chat.push(chatLine); page.push(pageLine); };
  both(room.d12 === null ? `<p><b>Room Type:</b> ${room.label} (chosen)</p>` : `<p><b>Room Type:</b> d12 (${room.d12}) ${room.label}</p>`);
  if(room.type === "uninhabited")
  {
    both(`<p><b>Contents A:</b> ${room.contentsA}</p>`);
    both(`<p><b>Contents B:</b> ${room.contentsB}</p>`);
  }
  if(room.featureHtml) both(`<p><b>Room Feature:</b> ${room.featureHtml}</p>`);
  // A vault journal leaves the lair and the treasure for the Referee to roll
  // when the room is reached (RULED 2026-09-27, Matt); the page says so.
  if(room.follow.lair && !room.lair)
    both(room.lairPlan ? `<p><b>&rarr; Lair (Depth ${depth}):</b> ${plannedLairText(room.lairPlan)} - not yet spawned</p>`
                       : `<p><b>&rarr; Lair (Depth ${depth}):</b> not yet rolled</p>`);
  if(room.follow.treasure && !room.treasure) both(`<p><b>&rarr; Treasure Room (Depth ${depth}):</b> not yet rolled</p>`);
  if(room.lair) { const l = lairLines(room.lair, depth); chat.push(...l.chat); page.push(...l.page); }
  if(room.treasure) { const t = treasureLines(room.treasure); chat.push(...t.chat); page.push(...t.page); }
  if(room.specialHtml)
  {
    both(`<p><b>&rarr; Special Room:</b> ${room.specialHtml}</p>`);
    if(room.merchantHtml) both(`<p><b>&rarr; Vault Merchant:</b> ${room.merchantHtml}</p>`);
    if(room.specialFollowHtml) both(`<p><b>&rarr; ${room.specialName}:</b> ${room.specialFollowHtml}</p>`);
    if(room.special) { const s = specialLines(room.special, room.specialName); chat.push(...s.chat); page.push(...s.page); }
    else if(room.specialCreate) both(`<p><b>&rarr; ${room.specialCreate}:</b> not yet created</p>`);
  }
  if(room.follow.hazard)
    both(`<p><b>&rarr; Vault Hazard:</b> d20 (${room.hazardBase}) + Floor (${depth}) = ${room.hazardTotal}</p><p>${room.hazardHtml ?? "no matching row found"}</p>`);
  if(room.trinketHtml) both(`<p><b>&rarr; Trinket:</b> ${room.trinketHtml}</p>`);
  if(room.floraHtml) both(`<p><b>&rarr; Fauna or Flora:</b> ${room.floraHtml}</p>`);
  return { chat, page };
}

/**
 * A rolled lair's lines, for the card and for the page. Contents Buttons on
 * Vault Pages writes the page lines over a room's "not yet rolled" line.
 */
export function lairLines(lair, depth)
{
  const chat = [], page = [];
  const both = (chatLine, pageLine = chatLine) => { chat.push(chatLine); page.push(pageLine); };
  const { result, redirects, finalDepth, mentions } = lair;
  both(`<p><b>&rarr; Lair (Depth ${depth}):</b></p>`);
  if(redirects.length) both(`<p><i>${redirects.join(" → ")}</i></p>`);
  both(`<p>${result} <i>(final: Depth ${finalDepth})</i></p>`);
  if(!mentions.length) both(`<p><i>Empty node — no creature here.</i></p>`);
  for(const m of mentions)
  {
    both(`<p><b>${m.raw}</b>${m.rolledQty !== null ? ` (rolled: ${m.rolledQty})` : ""}</p>`);
    if(m.actor)
      both(`<p>Created "${m.actor.name}" in the "Generated Creatures" folder.</p>`,
           `<p>${linkTo(m.actor)} (in the "Generated Creatures" folder)</p>`);
    else both(`<p><i>${m.name} — not found in Bestiary.</i></p>`);
  }
  return { chat, page };
}

/** A created treasure room's lines, for the card and for the page. */
export function treasureLines(treasure)
{
  const chat = [], page = [];
  const both = (chatLine, pageLine = chatLine) => { chat.push(chatLine); page.push(pageLine); };
  const { steps, actor, names } = treasure;
  const rolled = steps.map(s => s.column ? `${s.column} d20 (${s.roll}): ${s.cell}` : s.cell).join(" → ");
  both(`<p><b>&rarr; Treasure Room:</b> ${rolled}</p>`);
  both(names.length
    ? `<p>Created "${actor.name}", GM only: ${names.join(", ")}</p>`
    : `<p>Created "${actor.name}", GM only — its contents are whispered to the GM.</p>`,
    `<p>${linkTo(actor)}, GM only${names.length ? `: ${names.join(", ")}` : ""}</p>`);
  return { chat, page };
}

/** A special room's made item container or daemon, for the card and for the page. */
export function specialLines(special, name)
{
  const { actor, names } = special;
  if(actor.type === "container")
    return { chat: [`<p><b>&rarr; ${name}:</b> Created "${actor.name}", GM only: ${names.join(", ")}</p>`],
             page: [`<p><b>&rarr; ${name}:</b> ${linkTo(actor)}, GM only: ${names.join(", ")}</p>`] };
  return { chat: [`<p><b>&rarr; ${name}:</b> Created "${actor.name}" in the "Generated Creatures" folder.</p>`],
           page: [`<p><b>&rarr; ${name}:</b> ${linkTo(actor)} (in the "Generated Creatures" folder)</p>`] };
}

/** A planned lair in one line: the result, and each rolled quantity. */
export function plannedLairText(plan)
{
  const qty = plan.mentions.filter(m => m.rolledQty !== null).map(m => `${m.raw}: ${m.rolledQty}`);
  return `${plan.result}${qty.length ? ` (rolled ${qty.join(", ")})` : ""}`;
}
