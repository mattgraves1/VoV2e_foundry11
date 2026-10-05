/**
 * Build the system compendium packs from tracked source, on first load.
 *
 * THE PROBLEM THIS SOLVES. Before 2026-09-02 a fresh clone of this repo
 * shipped NO compendium content at all. That was verified, not assumed: a
 * clone produced exactly two files, packs/bestiary/000068.ldb and
 * packs/rolltables/000005.ldb, and nothing else.
 *
 * A Foundry v11 pack is a LevelDB, which is three kinds of file:
 *   *.log         write-ahead log; new writes land here first
 *   *.ldb         immutable sorted tables; only ever created and deleted
 *   MANIFEST-*    the index — which .ldb files currently ARE the database
 *   CURRENT       a pointer naming the live MANIFEST
 * Compaction merges the log and the old tables into NEW .ldb files with new
 * numbers, writes a new manifest, and deletes the old tables. So:
 *   - the filenames rotate, and git sees delete+add rather than a
 *     modification, storing a fresh full-size blob every single time
 *   - .gitignore excluded CURRENT and MANIFEST-* on the stated premise that
 *     "the actual compendium data lives in the .ldb files". It does not.
 *     Without the manifest nothing knows those .ldb files exist, so what was
 *     tracked was unreadable.
 *   - worse, the one tracked .ldb was one LevelDB had already deleted. Its
 *     own log says so: "Delete type=2 #68" against tracked 000068.ldb.
 *
 * THE FIX IS NOT TO TRACK IT BETTER. The packs are a BUILD OUTPUT. The real
 * source is already in version control and already the declared source of
 * truth — bestiary-data.js (157 creatures) and rolltable-data.js (79
 * tables) — so the database can simply be rebuilt wherever it is missing.
 * packs/ is now gitignored and this module is the build step.
 *
 * WHY A LOAD HOOK RATHER THAN A CLI BUILD. The goal is that installing the
 * system into a brand-new world yields the book content with no manual step.
 * A user installing from the repo will not run a packaging command, so a
 * build that depends on one does not meet that goal.
 *
 * IDEMPOTENT AND CONSERVATIVE. It builds a pack only when that pack is
 * EMPTY. It never updates, never deletes, and never touches a pack that has
 * anything in it — keeping a pack current is what macros/dev/sync-bestiary.js
 * and macros/dev/sync-rolltables.js are for, and they ask before writing. So a
 * GM who has edited their compendium will never find this quietly
 * overwriting them.
 *
 * TWO EXCEPTIONS, re-synced on every load: vaarn.macros (2026-09-27) to
 * macros/*.js - see syncMacroPack below for why that one is safe - and
 * vaarn.items (2026-10-04) to the rosters - see syncItemPack.
 */

import { BESTIARY } from "./actor/bestiary-data.js";
import { PETS } from "./actor/pets-data.js";
import { STEEDS } from "./actor/steeds-data.js";
import { VEHICLES } from "./actor/vehicles-data.js";
import { buildVehicleDoc } from "./actor/vehicle-build.js";
import { ROLLTABLES } from "./actor/rolltable-data.js";
import { buildCreatureDoc } from "./actor/bestiary-build.js";
import { tokenPath, artAvailable } from "./actor/bestiary-art.js";
import { makeFolderResolver, buildDescription, desiredResults } from "./actor/rolltable-build.js";
import { buildPackItems, planItemSync } from "./item/pack-items.js";
import { MUSIC_PLAYLIST } from "./music-data.js";
import { stableId, withStableIds } from "./stable-id.js";

const BESTIARY_PACK = "vaarn.bestiary";
const PETS_PACK = "vaarn.pets";
const STEEDS_PACK = "vaarn.steeds";
const VEHICLES_PACK = "vaarn.vehicles";
const ROLLTABLE_PACK = "vaarn.rolltables";
const ITEM_PACK = "vaarn.items";

/**
 * Run a write against a pack with its lock explicitly taken and restored.
 *
 * The lock DOES block writes, and consistently. Tested 2026-09-02 on locked
 * vaarn.rolltables by running the identical write twice, locked then
 * unlocked: locked, both Document#update and Document.create throw "You may
 * not modify the ... Compendium which is currently locked" and nothing is
 * written; unlocked, the same write succeeds.
 *
 * An earlier note here said the opposite — that writes went through a lock
 * anyway. That was wrong, and believing it had a real cost: sync-rolltables.js
 * had no unlock, so its pack mode reported "Updated 1" and wrote nothing. The
 * likeliest source of the mistake is that world.vaarn-rolltables is a WORLD
 * compendium reporting locked:false, so a run believed to be writing through
 * a lock was writing to the unlocked pack beside it.
 *
 * Restore in a finally regardless, so a failed build never leaves a published
 * pack open. Same pattern as sync-bestiary.js, tested against a forced
 * mid-loop failure.
 *
 * ONE AT A TIME, ACROSS EVERY PACK (2026-09-29, found testing Music Playlist).
 * A pack's lock is not its own: every compendium's lock lives in ONE world
 * setting, core.compendiumConfiguration, and configure() reads that whole
 * object, changes one key and writes it all back. Two unlock/relock sections
 * running at once lose each other's writes. On load the guide sync
 * (guide-pack.js, its own ready hook) relocked a guide pack with a copy read
 * before the music sync unlocked vaarn.music, so the music delete was refused
 * as locked. So every section queues behind the last one. Never call this
 * from inside fn - it would wait on itself.
 */
let unlockQueue = Promise.resolve();

export function withUnlocked(pack, fn)
{
  const run = unlockQueue.then(async () =>
  {
    const wasLocked = pack.locked;
    if(wasLocked) await pack.configure({ locked: false });
    try { return await fn(); }
    finally { if(wasLocked) await pack.configure({ locked: true }); }
  });
  unlockQueue = run.catch(() => {});
  return run;
}

export async function buildBestiary(pack, useArt)
{
  // Document shape lives in bestiary-build.js so this and sync-bestiary.js
  // cannot build a creature differently — see buildCreatureDoc.
  const docs = BESTIARY.map(entry => buildCreatureDoc(entry, useArt ? tokenPath(entry.name) : null));

  // One createDocuments call rather than 157 — this runs during world load,
  // where the difference is felt.
  await Actor.createDocuments(withStableIds(pack.collection, docs), { pack: pack.collection, keepId: true });
  return docs.length;
}

/**
 * The pets pack — Pet Stat Block Import, 2026-09-13.
 *
 * Same builder as the Bestiary, deliberately: a pet IS a Level/AV/Morale stat
 * block, which is why all 11 atoms point at Creature Stat Block Import and why
 * a second document shape would be a second thing to keep in step for no gain.
 * See pets-data.js on why the ROSTER is separate even though the build is not.
 *
 * NO ART, and this is not the degradation path. The Bestiary passes art when
 * tokens/Bestiary is installed; no pet has a token in that directory at all,
 * so there is nothing to pass and every pet uses Foundry's default icon. Filed
 * as Pet Token Art. Deliberately not wired to artAvailable(): that function
 * answers "is the Bestiary art installed?", and a true from it would say
 * nothing about pets.
 */
/**
 * Level-Derived Trade Value (2026-09-18): a steed or pet is marked here, at
 * build, because once it is in the world it is a plain npc and nothing else
 * says what it is. Matt ruled only these two have a Level-based trade value.
 */
function markLevelTradeValue(doc)
{
  doc.flags = foundry.utils.mergeObject(doc.flags ?? {}, { vaarn: { levelTradeValue: true } });
  return doc;
}

/**
 * Companion kind (2026-09-19, Companion Ownership): stamped here for the same
 * reason as the trade-value mark above - once in the world a pet is a plain
 * npc and nothing else says what it is. See companion.js companionKindOf.
 *
 * ONE DOCUMENT BUILDER PER PACK, shared by the build below and by
 * macros/dev/sync-pets-steeds.js, so a synced document can never differ from a
 * freshly built one.
 */
function markCompanionKind(doc, kind)
{
  doc.flags = foundry.utils.mergeObject(doc.flags ?? {}, { vaarn: { companionKind: kind } });
  return doc;
}

export function buildPetDoc(entry)
{
  return markCompanionKind(markLevelTradeValue(buildCreatureDoc(entry, null)), "pet");
}

export function buildSteedDoc(entry)
{
  return markCompanionKind(markLevelTradeValue(buildCreatureDoc(entry, null)), "steed");
}

export async function buildPets(pack)
{
  const docs = PETS.map(buildPetDoc);
  await Actor.createDocuments(withStableIds(pack.collection, docs), { pack: pack.collection, keepId: true });
  return docs.length;
}

/**
 * The steeds pack — Steed Stat Block Import, 2026-09-13.
 *
 * Same builder and the same reasoning as buildPets: a steed IS a
 * Level/AV/Morale stat block, which is why all 8 atoms point at Creature Stat
 * Block Import. Its one structural addition, the Item Slots capacity, rides in
 * the roster and is read by nothing yet — see Container Slot Capacity.
 *
 * NO ART, and unlike the pets that is a DECISION rather than an absence: seven
 * of the eight do have tokens sitting in tokens/Steeds. RULED 2026-09-13 (Matt)
 * to ship without them and file it, keeping this row to loading stat blocks.
 * See Steed Token Art, and read CLAUDE.md's tokens/ licensing constraint before
 * wiring them anywhere that gets published.
 */
export async function buildSteeds(pack)
{
  const docs = STEEDS.map(buildSteedDoc);
  await Actor.createDocuments(withStableIds(pack.collection, docs), { pack: pack.collection, keepId: true });
  return docs.length;
}

/**
 * The vehicles pack — Vehicle Stat Block Import, 2026-09-18.
 *
 * Its own builder, unlike pets and steeds: a vehicle has Hull where a
 * creature has Level, and crew slots nothing else has. See vehicle-build.js.
 * No art; nothing in tokens/ is a vehicle.
 */
export async function buildVehicles(pack)
{
  const docs = VEHICLES.map(buildVehicleDoc);
  await Actor.createDocuments(withStableIds(pack.collection, docs), { pack: pack.collection, keepId: true });
  return docs.length;
}

export async function buildRollTables(pack)
{
  // Folders first, and one at a time: each level needs its parent's id, so
  // this genuinely is sequential. 17 distinct paths, not 79.
  const resolve = makeFolderResolver(pack.collection);
  const folderIds = new Map();
  for(const path of new Set(ROLLTABLES.map(e => e.folder)))
    folderIds.set(path, (await resolve(path)).id);

  const docs = ROLLTABLES.map(entry => ({
    name: entry.name,
    folder: folderIds.get(entry.folder),
    formula: entry.formula,
    description: buildDescription(entry),
    results: desiredResults(entry)
  }));

  await RollTable.createDocuments(withStableIds(pack.collection, docs), { pack: pack.collection, keepId: true });
  return docs.length;
}

/**
 * The Item pack — Item Compendium Packs, 2026-09-20; KEPT CURRENT ON EVERY
 * LOAD since Item Pack Repair (RULED 2026-10-04 by Matt), like vaarn.macros.
 *
 * Built only-when-empty until then, so a world whose pack predated a roster's
 * growth never caught up: the ninth regression run found the test world 20
 * Items and a folder behind. Now a missing Item is created, one that differs
 * from its roster is put back, and one no roster names is deleted - a GM's
 * edits inside the pack included. A GM keeps customised Items in a compendium
 * of their own or in the world's Items, which this never reads; Items on a
 * character sheet are copies, and links into the pack survive because the ids
 * are stable. An empty pack is simply the case where every Item is created.
 *
 * WHAT IS IN HERE AND WHY IS NOT DECIDED HERE. pack-items.js holds the
 * roster walk and every ruling behind it, and the comparison (planItemSync);
 * this function only reads the pack and writes what the plan says.
 *
 * Folders one at a time for the same reason buildRollTables does it: each
 * level needs its parent's id. A folder no roster names is deleted once it is
 * empty.
 */
function folderPath(folder)
{
  const parts = [];
  for(let f = folder; f; f = f.folder) parts.unshift(f.name);
  return parts.join("/");
}

export async function syncItemPack()
{
  if(!game.user.isGM) return null;
  const designated = game.users?.activeGM;               // same guard as buildEmptyPacks
  if(designated && designated.id !== game.user.id) return null;
  const pack = game.packs.get(ITEM_PACK);
  if(!pack) return null;

  const groups = await buildPackItems();
  const want = withStableIds(pack.collection, groups.flatMap(g => g.docs.map(doc => ({ ...doc, folder: g.folder }))));
  const pathOf = new Map(pack.folders.map(f => [f.id, folderPath(f)]));
  const have = (await pack.getDocuments()).map(d =>
  {
    const o = d.toObject();
    return { ...o, folder: o.folder ? (pathOf.get(o.folder) ?? null) : null };
  });
  const plan = planItemSync(want, have);

  const wantedPaths = new Set();
  for(const g of groups)
  {
    const parts = g.folder.split("/");
    for(let i = 1; i <= parts.length; i++) wantedPaths.add(parts.slice(0, i).join("/"));
  }
  const staleFolders = () => pack.folders.filter(f => !wantedPaths.has(folderPath(f)));
  const missingFolders = [...new Set(groups.map(g => g.folder))]
    .filter(p => ![...pathOf.values()].includes(p));

  const writes = plan.create.length + plan.update.length + plan.recreate.length + plan.remove.length;
  if(!writes && !missingFolders.length && !staleFolders().length) return null;

  let foldersRemoved = 0;
  await withUnlocked(pack, async () =>
  {
    const resolve = makeFolderResolver(pack.collection, "Item");
    const folderIds = new Map();
    for(const g of groups) folderIds.set(g.folder, (await resolve(g.folder)).id);
    const placed = docs => docs.map(d => ({ ...d, folder: folderIds.get(d.folder) }));

    const opts = { pack: pack.collection };
    const gone = [...plan.remove, ...plan.recreate.map(d => d._id)];
    if(gone.length) await Item.deleteDocuments(gone, opts);
    const fresh = [...plan.create, ...plan.recreate];
    if(fresh.length) await Item.createDocuments(placed(fresh), { ...opts, keepId: true });
    if(plan.update.length) await Item.updateDocuments(placed(plan.update), opts);

    // Deepest first. Every Item no roster names is already gone, so a folder
    // no roster names is empty by now.
    const stale = staleFolders()
      .sort((a, b) => folderPath(b).split("/").length - folderPath(a).split("/").length);
    for(const f of stale) { await f.delete(); foldersRemoved++; }
  });
  return { created: plan.create.length, updated: plan.update.length + plan.recreate.length,
           deleted: plan.remove.length, foldersRemoved };
}

/**
 * Populate any declared pack that is empty. Safe to call on every load.
 * Returns a short report, or null when there was nothing to do.
 */
export async function buildEmptyPacks()
{
  if(!game.user.isGM) return null;

  // ONE client builds, not every GM. isGM alone is not enough: this world has
  // two GM-privileged accounts (Matt's Gamemaster and the `claude` automation
  // account), and two GMs loading an empty world within a few seconds of each
  // other would both see "pack is empty", both build, and produce 314
  // creatures instead of 157 — the emptiness check cannot help, because
  // neither has written yet when both look. activeGM designates exactly one
  // connected GM deterministically. The realistic trigger is not two people:
  // it is automation logging in while a fresh world is launching, which is
  // precisely what group 71 testing does.
  //
  // FAIL OPEN, NOT CLOSED. Compare ids rather than documents, and treat a
  // missing activeGM as "go ahead" rather than "stop". If this property ever
  // moves or is undefined on a given core version, a strict check would make
  // the build silently never run — an empty compendium and no error, which is
  // a far worse failure than the duplicate it guards against.
  const designated = game.users?.activeGM;
  if(designated && designated.id !== game.user.id) return null;

  const bestiary = game.packs.get(BESTIARY_PACK);
  const pets = game.packs.get(PETS_PACK);
  const steeds = game.packs.get(STEEDS_PACK);
  const vehicles = game.packs.get(VEHICLES_PACK);
  const rolltables = game.packs.get(ROLLTABLE_PACK);
  const todo = [];
  if(bestiary && bestiary.index.size === 0) todo.push("bestiary");
  if(pets && pets.index.size === 0) todo.push("pets");
  if(steeds && steeds.index.size === 0) todo.push("steeds");
  if(vehicles && vehicles.index.size === 0) todo.push("vehicles");
  if(rolltables && rolltables.index.size === 0) todo.push("rolltables");
  if(!todo.length) return null;

  const report = { creatures: 0, pets: 0, steeds: 0, vehicles: 0, tables: 0, art: false, errors: [] };

  if(todo.includes("bestiary"))
  {
    // Checked once, and only when there is actually a bestiary to build.
    report.art = await artAvailable();
    try { report.creatures = await withUnlocked(bestiary, () => buildBestiary(bestiary, report.art)); }
    catch(err)
    {
      // A failed build must not take the world down with it. The GM empties
      // the pack and reloads (the notice below says so); in this repo,
      // macros/dev/import-bestiary.js is a further fallback that never ships.
      console.error("Vaarn | building the Bestiary pack failed:", err);
      report.errors.push(`Bestiary: ${err.message}`);
    }
  }

  if(todo.includes("pets"))
  {
    try { report.pets = await withUnlocked(pets, () => buildPets(pets)); }
    catch(err)
    {
      console.error("Vaarn | building the Pets pack failed:", err);
      report.errors.push(`Pets: ${err.message}`);
    }
  }

  if(todo.includes("steeds"))
  {
    try { report.steeds = await withUnlocked(steeds, () => buildSteeds(steeds)); }
    catch(err)
    {
      console.error("Vaarn | building the Steeds pack failed:", err);
      report.errors.push(`Steeds: ${err.message}`);
    }
  }

  if(todo.includes("vehicles"))
  {
    try { report.vehicles = await withUnlocked(vehicles, () => buildVehicles(vehicles)); }
    catch(err)
    {
      console.error("Vaarn | building the Vehicles pack failed:", err);
      report.errors.push(`Vehicles: ${err.message}`);
    }
  }

  if(todo.includes("rolltables"))
  {
    try { report.tables = await withUnlocked(rolltables, () => buildRollTables(rolltables)); }
    catch(err)
    {
      console.error("Vaarn | building the RollTables pack failed:", err);
      report.errors.push(`RollTables: ${err.message}`);
    }
  }

  return report;
}

/**
 * MACRO PACKAGING (foundry-system-index.csv "Macro Packaging", RULED
 * 2026-09-27 by Matt). The play-aid macros ship as the vaarn.macros compendium,
 * so a new world has them with no paste step.
 *
 * THE SOURCE IS THE DIRECTORY. Every .js file directly in macros/ ships;
 * macros/dev/ holds the build tools and is not read. A file is sorted by where
 * it is saved, so there is no ship list here to fall behind. Each Macro's name
 * is the file's own " * Vaarn: <Name>" header line - the name its World Macro
 * already carries - and the file name stands in if the header is missing.
 *
 * UNLIKE THE OTHER PACKS, THIS ONE IS KEPT CURRENT ON EVERY LOAD, not only
 * built when empty: a Macro whose script or name differs from its file is
 * rewritten, a missing one is created, and one whose file is gone is deleted.
 * That touches only the system's own pack. A world's Macros - including any a
 * GM dragged out of this compendium and then edited for house rules - are
 * never read or written, which was the 2026-08-26 objection to a load hook.
 * A Macro in the pack with no sourceFile flag is not ours and is left alone.
 */
const MACRO_PACK = "vaarn.macros";
const MACRO_DIR = "systems/vaarn/macros";
const MACRO_ICON = "icons/svg/dice-target.svg";

/** The shipped macro files as { file, name, command }, read fresh from disk. */
export async function readShippedMacros()
{
  const listing = await FilePicker.browse("data", MACRO_DIR);
  const paths = (listing?.files ?? []).map(f => decodeURIComponent(String(f))).filter(f => f.endsWith(".js"));
  const out = [];
  for(const path of paths)
  {
    const file = path.split("/").pop();
    // Cachebust, or the browser can serve the copy it fetched last load and
    // the pack would be "synced" to a stale file.
    const res = await fetch(`/${path}?cb=${Date.now()}`);
    if(!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    const command = (await res.text()).replace(/\r\n?/g, "\n").replace(/\s+$/, "");
    const header = command.match(/^\s*\*\s*Vaarn:\s*(.+?)\s*$/m);
    const name = header ? header[1]
      : file.replace(/\.js$/, "").split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
    out.push({ file, name, command });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Bring vaarn.macros into line with macros/*.js. Returns { created, updated,
 * deleted } counts, or null when this client is not the one to do it.
 */
export async function syncMacroPack()
{
  if(!game.user.isGM) return null;
  const designated = game.users?.activeGM;               // same guard as above
  if(designated && designated.id !== game.user.id) return null;
  const pack = game.packs.get(MACRO_PACK);
  if(!pack) return null;

  const shipped = await readShippedMacros();
  const existing = await pack.getDocuments();
  const byFile = new Map();
  for(const m of existing)
  {
    const src = m.getFlag("vaarn", "sourceFile");
    if(src) byFile.set(src, m);
  }

  const toCreate = [], toUpdate = [], toDelete = [];
  for(const s of shipped)
  {
    const have = byFile.get(s.file);
    if(!have)
    {
      toCreate.push({ _id: stableId(pack.collection, s.file), name: s.name, type: "script", scope: "global", img: MACRO_ICON,
                      command: s.command, flags: { vaarn: { sourceFile: s.file } } });
      continue;
    }
    byFile.delete(s.file);
    const same = have.name === s.name
      && String(have.command ?? "").replace(/\r\n?/g, "\n").replace(/\s+$/, "") === s.command;
    if(!same) toUpdate.push({ _id: have.id, name: s.name, command: s.command });
  }
  for(const orphan of byFile.values()) toDelete.push(orphan.id);

  if(toCreate.length || toUpdate.length || toDelete.length)
    await withUnlocked(pack, async () =>
    {
      if(toCreate.length) await Macro.createDocuments(toCreate, { pack: pack.collection, keepId: true });
      if(toUpdate.length) await Macro.updateDocuments(toUpdate, { pack: pack.collection });
      if(toDelete.length) await Macro.deleteDocuments(toDelete, { pack: pack.collection });
    });
  return { created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length };
}

/**
 * MUSIC PLAYLIST (foundry-system-index.csv "Music Playlist", RULED 2026-09-28
 * by Matt). One Playlist in vaarn.music, built from music-data.js.
 *
 * KEPT CURRENT ON EVERY LOAD, like vaarn.macros and for the same reason: more
 * tracks are expected, and an empty-only build would need the GM to empty the
 * pack by hand to see them. Only the system's own pack is touched; a playlist
 * a GM imported into their world is a copy and is never read or written.
 *
 * When the playlist differs from the data it is deleted and rebuilt rather
 * than patched sound by sound. Its id changes, which nothing depends on: a
 * world copy keeps playing its own files.
 */
const MUSIC_PACK = "vaarn.music";
const MUSIC_DIR = "systems/vaarn/audio/music";

export function buildMusicPlaylistDoc()
{
  const p = MUSIC_PLAYLIST;
  return {
    name: `${p.name} — music by ${p.composer}`,
    description: `<p>Music by ${p.composer}. Licensed <a href="${p.licenceUrl}">${p.licence}</a>: free to use and share, with credit to ${p.composer}.</p>`,
    mode: CONST.PLAYLIST_MODES.SEQUENTIAL,
    sounds: p.tracks.map((t, i) => ({
      name: t.name,
      path: `${MUSIC_DIR}/${t.file}`,
      description: `By ${p.composer}.`,
      volume: 0.5,
      sort: (i + 1) * 100000
    })),
    flags: { vaarn: { musicPlaylist: true } }
  };
}

/** The fields that decide whether the pack's playlist matches the data. */
function musicSignature(doc)
{
  const sounds = [...(doc.sounds ?? [])]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map(s => `${s.name}|${s.path}|${s.description ?? ""}`);
  return JSON.stringify([doc.name, doc.description ?? "", doc.mode, sounds]);
}

export async function syncMusicPack()
{
  if(!game.user.isGM) return null;
  const designated = game.users?.activeGM;               // same guard as above
  if(designated && designated.id !== game.user.id) return null;
  const pack = game.packs.get(MUSIC_PACK);
  if(!pack) return null;

  const want = buildMusicPlaylistDoc();
  const existing = await pack.getDocuments();
  const ours = existing.filter(d => d.getFlag("vaarn", "musicPlaylist"));
  if(ours.length === 1 && musicSignature(ours[0].toObject()) === musicSignature(want)) return null;

  await withUnlocked(pack, async () =>
  {
    if(ours.length) await Playlist.deleteDocuments(ours.map(d => d.id), { pack: pack.collection });
    await Playlist.create({ ...want, _id: stableId(pack.collection, "playlist") }, { pack: pack.collection, keepId: true });
  });
  return { tracks: want.sounds.length, rebuilt: ours.length > 0 };
}

/** Wire the build into world load. Called from knave.js. */
export function registerPackBuild()
{
  Hooks.once("ready", async () =>
  {
    // The macro pack first and on its own: it runs on every load, and a
    // failure in it must not stop the empty-pack build below, or the reverse.
    try
    {
      const m = await syncMacroPack();
      if(m && (m.created || m.updated || m.deleted))
      {
        const parts = [];
        if(m.created) parts.push(`added ${m.created}`);
        if(m.updated) parts.push(`updated ${m.updated}`);
        if(m.deleted) parts.push(`removed ${m.deleted}`);
        ui.notifications.info(`Vaarn: Vaarn Macros compendium ${parts.join(", ")} to match the system's macro files.`);
      }
    }
    catch(err)
    {
      console.error("Vaarn | macro pack sync failed:", err);
      ui.notifications.error(`Vaarn: could not update the Vaarn Macros compendium — ${err.message}. See the console.`);
    }

    // Music on its own for the same reason.
    try
    {
      const m = await syncMusicPack();
      if(m) ui.notifications.info(`Vaarn: Vaarn Music compendium ${m.rebuilt ? "updated" : "built"} (${m.tracks} tracks).`);
    }
    catch(err)
    {
      console.error("Vaarn | music pack sync failed:", err);
      ui.notifications.error(`Vaarn: could not update the Vaarn Music compendium — ${err.message}. See the console.`);
    }

    // Items on their own too (Item Pack Repair, 2026-10-04).
    try
    {
      const m = await syncItemPack();
      if(m)
      {
        const parts = [];
        if(m.created) parts.push(`added ${m.created}`);
        if(m.updated) parts.push(`updated ${m.updated}`);
        if(m.deleted) parts.push(`removed ${m.deleted}`);
        if(m.foldersRemoved) parts.push(`removed ${m.foldersRemoved} empty folder${m.foldersRemoved === 1 ? "" : "s"}`);
        if(!parts.length) parts.push("rebuilt its folders");
        ui.notifications.info(`Vaarn: Vaarn Items compendium ${parts.join(", ")} to match the system's data.`);
      }
    }
    catch(err)
    {
      console.error("Vaarn | item pack sync failed:", err);
      ui.notifications.error(`Vaarn: could not update the Vaarn Items compendium — ${err.message}. See the console.`);
    }

    let report;
    try { report = await buildEmptyPacks(); }
    catch(err)
    {
      console.error("Vaarn | pack build failed:", err);
      return;
    }
    if(!report) return;                            // packs already populated

    const built = [];
    if(report.creatures) built.push(`${report.creatures} creatures`);
    if(report.pets) built.push(`${report.pets} pets`);
    if(report.steeds) built.push(`${report.steeds} steeds`);
    if(report.vehicles) built.push(`${report.vehicles} vehicles`);
    if(report.tables) built.push(`${report.tables} RollTables`);

    if(built.length)
    {
      // Say when art was skipped. Silence here would look identical to a
      // build that simply had no art to place, and the GM should know which
      // they got before wondering where the tokens went.
      const artNote = report.creatures && !report.art
        ? " Token art is not installed, so creatures use Foundry's default icon."
        : "";
      ui.notifications.info(`Vaarn: built ${built.join(" and ")} into the system compendiums.${artNote}`);
    }
    if(report.errors.length)
      // Only what a release install contains (foundry-system-index.csv "Pack
      // Build Error Names Only Shipped Files", RULED 2026-09-27 by Matt):
      // macros/dev/ never ships, so the fallback is the build itself - it
      // refills any EMPTY pack on the next load, and a failed build may have
      // left one half-filled.
      ui.notifications.error(`Vaarn: pack build had errors — ${report.errors.join("; ")}. To try again, empty the compendium and reload the world. Details are in the console (F12).`);
  });
}
