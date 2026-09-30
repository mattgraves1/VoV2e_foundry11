/**
 * Vault Journal (foundry-system-index.csv row of that name).
 *
 * Turns a vault code into a journal a Referee can run the vault from: one
 * JournalEntry per vault, an overview page, and a page per room listing the
 * room's look, its contents and every exit, each exit linked to the room it
 * leads to.
 *
 *   planVault      grows the layout (vault-layout.js), gives every room its type
 *                  and Contents rolls (room-contents.js), rolls the Vault Details
 *                  and each room's Room Shape, Floors and Walls, picks the
 *                  entrance, numbers the rooms and works out every exit. Pure.
 *   rollVaultText  rolls each room's table results (a Room Feature, a Special
 *                  Room...). Lair creatures and treasure containers are NOT
 *                  created: the page says what is to be rolled (RULED
 *                  2026-09-27, Matt - create only what is necessary).
 *   vaultPages     the pages' HTML, links included. Pure, for the test.
 *   writeVaultJournal  the one step that touches Foundry.
 *
 * The rulings behind the numbering, the exit names and the entrance are on the
 * row. Levels are the book's depths: level N rolls the Depth N tables.
 */

import { DIRS, growVault, parseVaultCode, formatVaultCode, MODULE_DEFAULT, newSeed, randomizeSettings } from "./vault-layout.js";
import { planRoom, isEmptyRoom, roomLines, rollRoomText } from "./room-contents.js";
import { COMPOSITE_GENERATORS } from "../actor/composite-generator-data.js";
import { ROLLTABLES } from "../actor/rolltable-data.js";
import { rollRoomSize } from "./vault-scene-geometry.js";

// Exit names, index for index with DIRS: the lattice laid out with rows running
// east-west (RULED 2026-09-27, Matt). Vault Scene draws it the same way.
export const COMPASS = ["E", "NE", "NW", "W", "SW", "SE"];

const pickFrom = (list, random) => list[Math.floor(random() * list.length)];

/** Vault Entrance, Tunnels and Original Function, each its own d20. */
export function rollVaultDetails(random = Math.random)
{
  const gen = COMPOSITE_GENERATORS.find(g => g.key === "vault_entrance");
  const column = name =>
  {
    for(const t of gen.tables) for(const g of t.groups) if(g.data[name]) return g.data[name];
    throw new Error(`vault_entrance has no column "${name}"`);
  };
  return {
    entrance: pickFrom(column("Vault Entrance"), random),
    tunnels: pickFrom(column("The Tunnels"), random),
    originalFunction: pickFrom(column("Original Function"), random)
  };
}

// Room Shape, Floors & Walls prints its three columns in one row; the book rolls
// a d20 for each column (RULED 2026-09-27, Matt), so each is taken on its own.
let lookColumns = null;
function roomLookColumns()
{
  if(lookColumns) return lookColumns;
  const table = ROLLTABLES.find(t => t.name === "Room Shape, Floors & Walls");
  lookColumns = { shape: [], floors: [], walls: [] };
  for(const r of table.results)
  {
    const cell = label => (r.text.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]*?)\\s*(?:\\n|$)`)) || [])[1];
    lookColumns.shape.push(cell("Room Shape"));
    lookColumns.floors.push(cell("Floors"));
    lookColumns.walls.push(cell("Walls"));
  }
  return lookColumns;
}
/** Every Room Shape the table can roll, for the test that each has a drawing. */
export function roomShapeNames()
{
  return [...roomLookColumns().shape];
}
export function rollRoomLook(random = Math.random)
{
  const c = roomLookColumns();
  return { shape: pickFrom(c.shape, random), floors: pickFrom(c.floors, random), walls: pickFrom(c.walls, random) };
}

/**
 * Every room's exits: its six lattice directions, and shafts up and down. The
 * corridor length is in cells; 1 is the next cell. `edge` is the layout link.
 */
export function exitsOf(layout)
{
  const exits = layout.rooms.map(() => []);
  layout.edges.forEach((e, edge) =>
  {
    const a = layout.rooms[e.a], b = layout.rooms[e.b];
    if(e.down)
    {
      const [upper, lower] = a.z < b.z ? [a, b] : [b, a];
      exits[upper.id].push({ dir: "down", to: lower.id, len: 1, edge });
      exits[lower.id].push({ dir: "up", to: upper.id, len: 1, edge });
      return;
    }
    const dq = b.q - a.q, dr = b.r - a.r, n = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
    const d = DIRS.findIndex(([x, y]) => x * n === dq && y * n === dr);
    exits[a.id].push({ dir: COMPASS[d], to: b.id, len: e.len, edge });
    exits[b.id].push({ dir: COMPASS[(d + 3) % 6], to: a.id, len: e.len, edge });
  });
  return exits;
}

/* ---------- Corridor and Shaft Obstructions (foundry-system-index.csv row of that name) ---------- */

// 1 in 12 per corridor, whatever its length, and per shaft when the Referee
// allows it (RULED 2026-09-27, Matt; the book marks obstructed hallways on its
// maps and rolls them on Hallway Obstacles, and does not model shafts).
export const OBSTRUCTION_CHANCE = 1 / 12;
// Results that do not read right for a shaft (RULED 2026-09-27, Matt); a shaft
// rolling one of these rolls again.
export const SHAFT_EXCLUDED = ["Collapsed Floor", "Flooded (Fuel)", "Flooded (Supercoolant)", "Flooded (Toxin)",
                               "Flooded (Water)", "Phantom Grass", "Piled Furniture"];

let obstacles = null;
/** The Hallway Obstacles results, each as its name and its text as the table prints it. */
export function hallwayObstacles()
{
  if(obstacles) return obstacles;
  const table = ROLLTABLES.find(t => t.name === "Hallway Obstacles");
  obstacles = table.results.map(r => ({
    name: r.text.match(/\*\*Obstacle:\*\*\s*([^\n]*?)\s*(?:\n|$)/)[1],
    html: r.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\s*\n/g, "<br>")
  }));
  return obstacles;
}

export function rollObstacle(shaft, random = Math.random)
{
  const list = hallwayObstacles().filter(o => !shaft || !SHAFT_EXCLUDED.includes(o.name));
  return pickFrom(list, random);
}

/** Which links of the layout are obstructed, and by what. */
export function rollObstructions(layout, { shafts = false } = {}, random = Math.random)
{
  const out = [];
  layout.edges.forEach((e, edge) =>
  {
    if(e.down && !shafts) return;
    if(random() < OBSTRUCTION_CHANCE) out.push({ edge, a: e.a, b: e.b, shaft: e.down, len: e.len, obstacle: rollObstacle(e.down, random) });
  });
  return out;
}

/**
 * The entrance (RULED 2026-09-27, Matt): a random empty room on level 1, or with
 * none, a random uninhabited room, or with none of those, the room the layout
 * grew from.
 */
export function chooseEntrance(layout, rooms, random = Math.random)
{
  const level1 = layout.rooms.filter(r => r.z === 0).map(r => r.id);
  const empty = level1.filter(id => isEmptyRoom(rooms[id]));
  if(empty.length) return pickFrom(empty, random);
  const uninhabited = level1.filter(id => rooms[id].type === "uninhabited");
  if(uninhabited.length) return pickFrom(uninhabited, random);
  return 0;
}

/**
 * Room numbers per level, outward from where the party arrives (RULED
 * 2026-09-27, Matt): the entrance on level 1, the shaft landings below. Returns
 * [{ level, n, name }] by room id.
 */
export function numberRooms(layout, entranceId)
{
  const flat = layout.rooms.map(() => []);
  const landings = new Map();
  for(const e of layout.edges)
  {
    const a = layout.rooms[e.a], b = layout.rooms[e.b];
    if(!e.down) { flat[a.id].push(b.id); flat[b.id].push(a.id); continue; }
    const lower = a.z < b.z ? b : a;
    if(!landings.has(lower.z)) landings.set(lower.z, []);
    landings.get(lower.z).push(lower.id);
  }
  const out = new Array(layout.rooms.length);
  const levels = [...new Set(layout.rooms.map(r => r.z))].sort((x, y) => x - y);
  for(const z of levels)
  {
    const onLevel = layout.rooms.filter(r => r.z === z).map(r => r.id);
    const starts = z === 0 ? [entranceId] : [...(landings.get(z) ?? [])].sort((x, y) => x - y);
    let n = 0;
    const queue = [];
    const visit = id => { if(out[id]) return; out[id] = { level: z + 1, n: ++n, name: `L${z + 1} Room ${n}` }; queue.push(id); };
    for(const s of [...starts, ...onLevel])
    {
      visit(s);
      while(queue.length) { const id = queue.shift(); for(const nb of flat[id]) visit(nb); }
    }
  }
  return out;
}

/**
 * Everything a vault journal needs, before any table text is rolled. `settings`
 * are a vault code's; `random` drives the contents, the look and the entrance
 * (the layout is grown from the code's own seed).
 */
export function planVault(settings, random = Math.random, { shaftObstructions = false } = {})
{
  const layout = growVault(settings);
  const rooms = layout.rooms.map(() => planRoom({ random }));
  for(const room of rooms) room.look = rollRoomLook(random);
  const details = rollVaultDetails(random);
  const entranceId = chooseEntrance(layout, rooms, random);
  const numbers = numberRooms(layout, entranceId);
  const exits = exitsOf(layout);
  // A hint names a hazard or lair on the same level, when there is one.
  for(const r of layout.rooms)
  {
    const room = rooms[r.id];
    if(!room.follow.hint) continue;
    const targets = layout.rooms.filter(o => o.z === r.z && o.id !== r.id && (rooms[o.id].follow.hazard || rooms[o.id].follow.lair)).map(o => o.id);
    room.hintTo = targets.length ? pickFrom(targets, random) : null;
  }
  const obstructions = rollObstructions(layout, { shafts: shaftObstructions }, random);
  // Vault Scene: the size a room is drawn at, rolled last so the rolls above are unchanged. Not printed on the page (RULED 2026-09-27, Matt).
  for(const room of rooms) room.size = rollRoomSize(random);
  return { settings, code: formatVaultCode(settings), layout, rooms, details, entranceId, numbers, exits, obstructions };
}

/**
 * What Vault Scene draws a level from, kept on the journal as its vaultMap flag:
 * each room's lattice point, level, Room Shape, size, page and name, and every
 * link, and each obstructed corridor's rooms, page and obstacle (for its pin,
 * RULED 2026-09-28 by Matt). Pure. `pageOf` gives a room id's page id,
 * `obstructionPageOf` an obstruction's (by its index in plan.obstructions).
 */
export function vaultMapOf(plan, pageOf, obstructionPageOf = () => null)
{
  const { layout, rooms, numbers } = plan;
  return {
    version: 1, code: plan.code, entrance: plan.entranceId,
    rooms: layout.rooms.map(r => ({ q: r.q, r: r.r, z: r.z, shape: rooms[r.id].look.shape, size: rooms[r.id].size,
                                    page: pageOf(r.id), name: numbers[r.id].name })),
    edges: layout.edges.map(e => ({ a: e.a, b: e.b, down: !!e.down })),
    // A shaft has no corridor on any one level's map, so it gets no pin.
    obstructions: (plan.obstructions ?? []).map((o, k) => ({ a: o.a, b: o.b, shaft: !!o.shaft,
                                                             page: obstructionPageOf(k), obstacle: o.obstacle?.name ?? "" }))
  };
}

/** How many pages the journal has: the Overview, a page per room, a page per obstruction. */
export function pageCount(plan)
{
  return 1 + plan.layout.rooms.length + plan.obstructions.length + (plan.encounters?.length ?? 0);
}

/**
 * Roll each room's table results, and each lair's creatures as text (Floor
 * Encounter Table, RULED 2026-09-27 by Matt), then every level's encounter table.
 * Browser only: the tables and the Bestiary load through Foundry.
 */
export async function rollVaultText(plan)
{
  for(const r of plan.layout.rooms) await rollRoomText(plan.rooms[r.id], r.z + 1, { planLairs: true });
  plan.encounters = await buildEncounterTables(plan);
  return plan;
}

/* ---------- Floor Encounter Table (foundry-system-index.csv row of that name) ---------- */

// The book's step 11: 'using at least d6 creatures from the Bestiary. It is best
// to start with creatures that already exist in the vault, drawing from the lairs
// and hazards generated.' A hazard brings a Bestiary creature only in Sentry Turrets.
export const ENCOUNTER_MIN = 6;
const HAZARD_CREATURES = [{ hazard: "Sentry Turrets", creature: "Sentry Turret" }];

/**
 * A level's encounter entries from its own rooms: its lair creatures, then a
 * creature for each hazard that brings one, in room order, each creature once.
 * Pure. Entries are { name, source: "lair" | "hazard", room }.
 */
export function encounterEntriesFrom(plan, z)
{
  const { layout, rooms, numbers } = plan;
  const onLevel = layout.rooms.filter(r => r.z === z).map(r => r.id).sort((a, b) => numbers[a].n - numbers[b].n);
  const out = [], seen = new Set();
  const add = (name, source, room) => { if(name && !seen.has(name)) { seen.add(name); out.push({ name, source, room }); } };
  for(const id of onLevel) for(const m of rooms[id].lairPlan?.mentions ?? []) add(m.resolvedName, "lair", id);
  for(const id of onLevel) for(const h of HAZARD_CREATURES) if((rooms[id].hazardHtml ?? "").includes(h.hazard)) add(h.creature, "hazard", id);
  return out;
}

/** Every level's encounter table, filled to ENCOUNTER_MIN from Lair Rooms at the level's depth. Browser only. */
export async function buildEncounterTables(plan)
{
  const { planLair } = await import("/systems/vaarn/module/actor/lair-rooms-roller.js");
  const levels = [...new Set(plan.layout.rooms.map(r => r.z))].sort((a, b) => a - b);
  const tables = [];
  for(const z of levels)
  {
    const entries = encounterEntriesFrom(plan, z);
    for(let tries = 0; entries.length < ENCOUNTER_MIN && tries < 60; tries++)
      for(const m of (await planLair(z + 1)).mentions)
        if(m.resolvedName && entries.length < ENCOUNTER_MIN && !entries.some(e => e.name === m.resolvedName))
          entries.push({ name: m.resolvedName, source: "depth", room: null });
    tables.push(entries);
  }
  return tables;
}

/**
 * The journal's pages, overview first. `ids` gives the journal's id and each
 * page's (index 0 the overview, then room id + 1, then one per obstruction), so
 * the pages can link to each other in the one create. Pure.
 */
export function vaultPages(plan, ids)
{
  const { layout, rooms, numbers, exits, details, entranceId } = plan;
  const obstructions = plan.obstructions ?? [];
  const pageId = roomId => ids.pages[roomId + 1];
  const link = roomId => `@UUID[JournalEntry.${ids.journal}.JournalEntryPage.${pageId(roomId)}]{${numbers[roomId].name}}`;
  // An obstruction's page, named for its obstacle and the two rooms it lies between (upper room first for a shaft).
  const ends = o => { const [x, y] = [o.a, o.b].sort((p, q) => numbers[p].level - numbers[q].level || numbers[p].n - numbers[q].n); return [x, y]; };
  const obstructionName = o => { const [x, y] = ends(o); return `Obstruction: ${o.obstacle.name}, ${numbers[x].name} – ${numbers[y].name}`; };
  const obstructionId = k => ids.pages[1 + layout.rooms.length + k];
  const obstructionLink = k => `@UUID[JournalEntry.${ids.journal}.JournalEntryPage.${obstructionId(k)}]{${obstructionName(obstructions[k])}}`;
  const byEdge = new Map(obstructions.map((o, k) => [o.edge, k]));
  // A level's encounter page, after the obstructions in the id list, second in the journal.
  const encounters = plan.encounters ?? [];
  const encounterId = z => ids.pages[1 + layout.rooms.length + obstructions.length + z];
  const encounterLink = z => `@UUID[JournalEntry.${ids.journal}.JournalEntryPage.${encounterId(z)}]{L${z + 1} Encounters}`;
  const order = layout.rooms.map(r => r.id).sort((a, b) => numbers[a].level - numbers[b].level || numbers[a].n - numbers[b].n);

  const pages = [];
  const levels = [...new Set(layout.rooms.map(r => r.z))].sort((a, b) => a - b);
  const overview = [
    `<h2>Vault Details</h2>`,
    `<p><b>Vault Entrance:</b> ${details.entrance}</p>`,
    `<p><b>The Tunnels:</b> ${details.tunnels}</p>`,
    `<p><b>Original Function:</b> ${details.originalFunction}</p>`,
    `<p><b>Entrance:</b> ${link(entranceId)}</p>`,
    `<h2>Levels</h2>`
  ];
  for(const z of levels)
  {
    const onLevel = layout.rooms.filter(r => r.z === z);
    const arrivals = onLevel.filter(r => exits[r.id].some(x => x.dir === "up")).map(r => link(r.id));
    const downs = onLevel.filter(r => exits[r.id].some(x => x.dir === "down")).map(r => link(r.id));
    const parts = layout.pieces[z] > 1 ? ` It is in ${layout.pieces[z]} parts, joined only through the level above.` : "";
    const short = layout.short?.includes(z) ? " Rubble stopped it short of its room count." : "";
    // A shaft's obstruction is listed with the level it goes down from.
    const blocked = obstructions.map((o, k) => [o, k]).filter(([o]) => Math.min(layout.rooms[o.a].z, layout.rooms[o.b].z) === z).map(([, k]) => obstructionLink(k));
    overview.push(`<p><b>Level ${z + 1}</b> (Depth ${z + 1}): ${onLevel.length} rooms.`
      + (z === 0 ? ` Entrance: ${link(entranceId)}.` : ` Arrival from above: ${arrivals.join(", ")}.`)
      + (downs.length ? ` Shaft down: ${downs.join(", ")}.` : "")
      + (blocked.length ? ` Obstructed: ${blocked.join(", ")}.` : "")
      + (encounters[z] ? ` Encounters: ${encounterLink(z)}.` : "") + `${parts}${short}</p>`);
  }
  overview.push(`<h2>Vault Code</h2>`, `<p>Pasting this code into Generate Vault grows the same rooms and exits again; their contents are rolled afresh.</p>`,
                `<p><code>${plan.code}</code></p>`);
  pages.push({ _id: ids.pages[0], name: "Overview", text: overview.join(""), flags: { vaarn: { vaultOverview: true } } });

  // One encounter table per level: roll it when the exploration clock's check says Encounter.
  encounters.forEach((entries, z) =>
  {
    const from = e => e.source === "lair" ? `from the lair in ${link(e.room)}`
                    : e.source === "hazard" ? `from the hazard in ${link(e.room)}` : `from Lair Rooms, Depth ${z + 1}`;
    const text = `<p><b>Level ${z + 1} encounters</b> (Depth ${z + 1}): roll a d${entries.length} when the exploration clock's check says Encounter.</p>`
      + `<ol>${entries.map(e => `<li><b>${e.name}</b>, ${from(e)}</li>`).join("")}</ol>`
      + `<p>An encounter brings one creature; its sheet's Roll Encounter rolls how many by its ENC.</p>`;
    const flagEntries = entries.map(e => ({ name: e.name, source: e.source, room: e.room === null ? null : numbers[e.room].name }));
    pages.push({ _id: encounterId(z), name: `L${z + 1} Encounters`, text, flags: { vaarn: { vaultEncounters: { level: z + 1, entries: flagEntries } } } });
  });

  for(const id of order)
  {
    const r = layout.rooms[id], room = rooms[id], depth = r.z + 1;
    const lines = [];
    if(id === entranceId) lines.push(`<p><b>Entrance.</b> The party arrives here.</p>`);
    const ups = exits[id].filter(x => x.dir === "up");
    if(ups.length) lines.push(`<p><b>Arrival from above:</b> a shaft from ${ups.map(x => link(x.to)).join(", ")}.</p>`);
    lines.push(`<p><b>Room Shape:</b> ${room.look.shape}. <b>Floors:</b> ${room.look.floors}. <b>Walls:</b> ${room.look.walls}.</p>`);
    lines.push(...roomLines(room, depth).page);
    if(room.follow.hint)
      lines.push(room.hintTo === null || room.hintTo === undefined
        ? `<p><b>&rarr; Hint:</b> no hazard or lair on this level to point to.</p>`
        : `<p><b>&rarr; Hint:</b> points to ${link(room.hintTo)} (${rooms[room.hintTo].follow.lair ? "a lair" : "a hazard"}).</p>`);
    const blockedBy = x => byEdge.has(x.edge) ? ` &mdash; obstructed: ${obstructionLink(byEdge.get(x.edge))}` : "";
    const exitLine = x =>
      (x.dir === "down" ? `Shaft down &rarr; ${link(x.to)}`
      : x.dir === "up" ? `Shaft up &rarr; ${link(x.to)}`
      : `${x.dir}${x.len > 1 ? `: corridor, ${x.len} cells` : ""} &rarr; ${link(x.to)}`) + blockedBy(x);
    const rank = x => x.dir === "up" ? 7 : x.dir === "down" ? 8 : ["NE", "E", "SE", "SW", "W", "NW"].indexOf(x.dir);
    lines.push(`<h3>Exits</h3>`, `<ul>${[...exits[id]].sort((a, b) => rank(a) - rank(b)).map(x => `<li>${exitLine(x)}</li>`).join("")}</ul>`);
    // What waits for a control (Contents Buttons on Vault Pages): read by vault-controls.js, never parsed from the text.
    const vaultRoom = { level: r.z + 1, depth, lair: room.follow.lair && !room.lair ? "pending" : null,
                        treasure: room.follow.treasure && !room.treasure ? "pending" : null,
                        special: room.specialCreate && !room.special ? "pending" : null, specialName: room.specialCreate ?? null,
                        lairPlan: room.follow.lair && !room.lair ? (room.lairPlan ?? null) : null };
    pages.push({ _id: pageId(id), name: numbers[id].name, text: lines.join(""), flags: { vaarn: { vaultRoom } } });
  }

  // One page per obstruction, carrying the obstacle as Hallway Obstacles prints it,
  // so Trap Resolution's controls for it sit in this one place.
  obstructions.forEach((o, k) =>
  {
    const [x, y] = ends(o);
    const passage = o.shaft ? "a shaft" : o.len > 1 ? `a corridor, ${o.len} cells` : "a corridor";
    pages.push({ _id: obstructionId(k), name: obstructionName(o),
                 text: `<p><b>Passage:</b> ${passage}, between ${link(x)} and ${link(y)}.</p><p>${o.obstacle.html}</p>` });
  });
  return pages;
}

/** Write the vault as a new journal. Returns the JournalEntry. */
export async function writeVaultJournal(plan, name)
{
  const journal = await JournalEntry.create({ name: name || `Vault: ${plan.details.originalFunction}` });
  const ids = { journal: journal.id, pages: Array.from({ length: pageCount(plan) }, () => foundry.utils.randomID()) };
  const pages = vaultPages(plan, ids).map((p, i) => ({ _id: p._id, name: p.name, type: "text", sort: (i + 1) * 100, text: { content: p.text }, flags: p.flags ?? {} }));
  await journal.createEmbeddedDocuments("JournalEntryPage", pages, { keepId: true });
  await journal.setFlag("vaarn", "vaultMap", vaultMapOf(plan, id => ids.pages[id + 1],
                                                        k => ids.pages[1 + plan.layout.rooms.length + k]));
  return journal;
}

/**
 * Generate a whole vault from settings: plan, roll, write the journal, whisper
 * the GM a card, open it - and with `scenes`, make a Scene per level (Vault
 * Scene). The Generate Vault window and the Vault Settings Tuner both end here.
 */
export async function generateVault(settings, { name = "", shafts = false, scenes = false } = {})
{
  const plan = planVault(settings, Math.random, { shaftObstructions: shafts });
  await rollVaultText(plan);
  const journal = await writeVaultJournal(plan, name);
  const levels = [...new Set(plan.layout.rooms.map(r => r.z))].length;
  ChatMessage.create({
    user: game.user._id, whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<h3>Generate Vault</h3><p>@UUID[${journal.uuid}]{${journal.name}}: ${plan.layout.rooms.length} rooms on ${levels} level${levels > 1 ? "s" : ""}, ${plan.obstructions.length} obstructed.</p>`
      + `<p><b>Vault code:</b> <code>${plan.code}</code></p>`
  });
  journal.sheet.render(true);
  if(!scenes) return journal;
  try
  {
    const { makeVaultScenes } = await import("./vault-scene.js");
    const made = await makeVaultScenes(journal);
    ui.notifications.info(`Made ${made.length} Scene${made.length === 1 ? "" : "s"} for ${journal.name}, in the Vault Scenes folder.`);
  }
  catch(e) { console.error(e); ui.notifications.error(`Making the Scenes failed: ${e.message}`); }
  return journal;
}

/* ---------- The Generate Vault window's settings ---------- */

// Saved settings (RULED 2026-09-27, Matt): rules only, no seed, as a world
// setting every GM of the world sees. Each is { name, code }.
export const SAVED_SETTING = "vaultSettings";

export function registerVaultSettings()
{
  game.settings.register("vaarn", SAVED_SETTING, { scope: "world", config: false, type: Array, default: [] });
}

export function savedVaultSettings()
{
  return game.settings.get("vaarn", SAVED_SETTING) ?? [];
}

/** Save a code's rules under a name, replacing one of the same name. Throws on a bad code. */
export async function saveVaultSetting(name, code)
{
  const trimmed = String(name ?? "").trim();
  if(!trimmed) throw new Error("Give the setting a name.");
  const rules = formatVaultCode({ ...parseVaultCode(code), seed: "-" });
  const list = savedVaultSettings().filter(s => s.name !== trimmed);
  list.push({ name: trimmed, code: rules });
  await game.settings.set("vaarn", SAVED_SETTING, list);
  return list;
}

/**
 * The settings a choice in the window stands for: "default" (Module Default),
 * "randomize" (Module Default's size rules, shape rules rolled), or a saved
 * setting's name - each with a new seed. A pasted code wins over all of them and
 * keeps its own seed.
 */
export function settingsFor(choice, pastedCode = "")
{
  if(String(pastedCode).trim()) return parseVaultCode(pastedCode);
  if(choice === "randomize") return randomizeSettings(MODULE_DEFAULT);
  const saved = savedVaultSettings().find(s => s.name === choice);
  const base = saved ? parseVaultCode(saved.code) : MODULE_DEFAULT;
  return { ...base, seed: newSeed() };
}
