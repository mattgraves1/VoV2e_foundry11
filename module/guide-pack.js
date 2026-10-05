/**
 * IN-GAME PROCEDURES GUIDE (foundry-system-index.csv "In-Game Procedures
 * Guide", RULED 2026-09-27 by Matt). The guide ships as two JournalEntry
 * compendiums, so a new world has it with no import step:
 *
 *   guide/players/*.html  ->  vaarn.guide-players  (every user can read it)
 *   guide/referee/*.html  ->  vaarn.guide-referee  (GM only, like the macros)
 *
 * Each directory becomes ONE JournalEntry and each file one page of it, in
 * file-name order - so a chapter's place is its "NN-" prefix and there is no
 * list here to fall behind. A page's name is the file's first-line comment,
 * "<!-- Vaarn: <Title> -->"; the file name stands in if it is missing.
 *
 * KEPT CURRENT ON EVERY LOAD, the same way vaarn.macros is (pack-build.js,
 * syncMacroPack): a page whose name, text or place differs from its file is
 * rewritten, a missing one created, and one whose file is gone deleted. Only
 * the system's own packs are touched. A journal a GM imported from these
 * packs into the world is never read or written, and an entry or page with
 * no vaarn source flag is not ours and is left alone.
 */

import { withUnlocked } from "./pack-build.js";
import { stableId } from "./stable-id.js";

const GUIDES = [
  { pack: "vaarn.guide-players", dir: "systems/vaarn/guide/players", name: "Player's Guide" },
  { pack: "vaarn.guide-referee", dir: "systems/vaarn/guide/referee", name: "Referee's Guide" },
  // Ancestry Reference Pages (RULED 2026-09-28, Matt): its own player-visible
  // compendium, one journal of ten pages, synced the same way.
  { pack: "vaarn.ancestries", dir: "systems/vaarn/guide/ancestries", name: "Ancestries" },
  // Region Map Legend (Region Generator, RULED 2026-10-03, Matt): a player-visible key to region maps - the
  // Landscapes, location icons, landmarks, vaults, routes and relief - its images drawn by region-paint.js.
  { pack: "vaarn.region-legend", dir: "systems/vaarn/guide/region-legend", name: "Region Map Legend" }
];

/** The guide's page files in one directory as { file, name, content }, read fresh. */
export async function readGuidePages(dir)
{
  let listing;
  // A directory with no chapters yet is not an error - it has nothing to sync.
  try { listing = await FilePicker.browse("data", dir); }
  catch(err) { return []; }
  const paths = (listing?.files ?? []).map(f => decodeURIComponent(String(f))).filter(f => f.endsWith(".html"));
  const out = [];
  for(const path of paths)
  {
    const file = path.split("/").pop();
    // Cachebust, or the browser can serve last load's copy (see readShippedMacros).
    const res = await fetch(`/${path}?cb=${Date.now()}`);
    if(!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    let content = (await res.text()).replace(/\r\n?/g, "\n").trim();
    const header = content.match(/^<!--\s*Vaarn:\s*(.+?)\s*-->\s*/);
    if(header) content = content.slice(header[0].length).trim();
    const name = header ? header[1]
      : file.replace(/\.html$/, "").replace(/^\d+-/, "").split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
    out.push({ file, name, content });
  }
  out.sort((a, b) => a.file.localeCompare(b.file));
  return out.map((p, i) => ({ ...p, sort: (i + 1) * 100000 }));
}

function pageData(p, pack)
{
  return { _id: stableId(pack, p.file), name: p.name, type: "text", sort: p.sort, title: { show: true, level: 1 },
           text: { format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: p.content },
           flags: { vaarn: { sourceFile: p.file } } };
}

/** Bring one guide pack into line with its directory. Returns counts. */
async function syncGuide(guide)
{
  const counts = { created: 0, updated: 0, deleted: 0 };
  const pack = game.packs.get(guide.pack);
  if(!pack) return counts;

  const pages = await readGuidePages(guide.dir);
  const entries = await pack.getDocuments();
  const entry = entries.find(e => e.getFlag("vaarn", "sourceDir") === guide.dir);

  // Through pack-build.js's queue: the lock is shared world state, and this
  // hook runs beside the pack build's (see withUnlocked there).
  return withUnlocked(pack, async () =>
  {
    if(!entry)
    {
      if(!pages.length) return counts;
      await JournalEntry.create({ _id: stableId(pack.collection, guide.dir), name: guide.name,
                                  pages: pages.map(p => pageData(p, pack.collection)),
                                  flags: { vaarn: { sourceDir: guide.dir } } }, { pack: pack.collection, keepId: true });
      counts.created = pages.length;
      return counts;
    }

    if(entry.name !== guide.name) await entry.update({ name: guide.name });

    const byFile = new Map();
    for(const pg of entry.pages)
    {
      const src = pg.getFlag("vaarn", "sourceFile");
      if(src) byFile.set(src, pg);
    }
    const toCreate = [], toUpdate = [], toDelete = [];
    for(const p of pages)
    {
      const have = byFile.get(p.file);
      if(!have) { toCreate.push(pageData(p, pack.collection)); continue; }
      byFile.delete(p.file);
      const same = have.name === p.name && have.sort === p.sort
        && String(have.text?.content ?? "").replace(/\r\n?/g, "\n").trim() === p.content;
      if(!same) toUpdate.push({ _id: have.id, name: p.name, sort: p.sort, "text.content": p.content });
    }
    for(const orphan of byFile.values()) toDelete.push(orphan.id);

    if(toCreate.length) await entry.createEmbeddedDocuments("JournalEntryPage", toCreate, { keepId: true });
    if(toUpdate.length) await entry.updateEmbeddedDocuments("JournalEntryPage", toUpdate);
    if(toDelete.length) await entry.deleteEmbeddedDocuments("JournalEntryPage", toDelete);
    Object.assign(counts, { created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length });
    return counts;
  });
}

/** Sync every guide pack. Returns a report per guide name, or null when this client is not the one to do it. */
export async function syncGuidePacks()
{
  if(!game.user.isGM) return null;
  const designated = game.users?.activeGM;               // same guard as buildEmptyPacks
  if(designated && designated.id !== game.user.id) return null;
  const report = {};
  for(const guide of GUIDES) report[guide.name] = await syncGuide(guide);
  return report;
}

/** Wire the sync into world load. Called from knave.js. */
export function registerGuidePacks()
{
  Hooks.once("ready", async () =>
  {
    let report;
    try { report = await syncGuidePacks(); }
    catch(err)
    {
      console.error("Vaarn | guide pack sync failed:", err);
      ui.notifications.error(`Vaarn: could not update the guide compendiums — ${err.message}. See the console.`);
      return;
    }
    if(!report) return;
    for(const [name, c] of Object.entries(report))
    {
      const parts = [];
      if(c.created) parts.push(`added ${c.created}`);
      if(c.updated) parts.push(`updated ${c.updated}`);
      if(c.deleted) parts.push(`removed ${c.deleted}`);
      if(parts.length) ui.notifications.info(`Vaarn: ${name} pages ${parts.join(", ")} to match the system's guide files.`);
    }
  });

  // CHAPTER NUMBERS (Matt, 2026-09-28, fresh-world walk-through). Foundry's
  // page list numbers pages from 0 within each journal, while the guide's
  // "chapter N" references run 1-18 across both guides, by file prefix. A
  // guide page shows its file's number instead - imported copies too, since
  // the source flag travels with the page. Other journals are untouched.
  Hooks.on("renderJournalSheet", (app, html) =>
  {
    html.find(".pages-list li[data-page-id]").each((i, li) =>
    {
      const file = app.document?.pages?.get(li.dataset.pageId)?.getFlag("vaarn", "sourceFile");
      const n = /^(\d+)-/.exec(file ?? "")?.[1];
      const span = li.querySelector(".page-number");
      if(n && span) span.textContent = `${Number(n)}.`;
    });
  });
}
