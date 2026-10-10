/**
 * Region Generator (foundry-system-index.csv row of that name) - the journal.
 *
 * Creating a region writes one JournalEntry, GM-only, in the Regions folder:
 *
 *   Overview         the region, its sections (each linked), every route with
 *                    its days and hazard, and the region code
 *   a section page   its Landscape, what it is named for, its landmark, its
 *                    default encounter table listed in full (the GM may choose
 *                    another; RULED 2026-10-03), and its locations, linked
 *   a location page  its type and d20, its section, the details rolled from its
 *                    type's tables (region-details.js), and every route from it
 *                    with days and hazard, each linked to where it leads and to
 *                    its route page. A Vault's page waits for its "Generate
 *                    this vault..." button; the Bestiary creatures its details
 *                    name are in its regionSpawns flag, for Spawn buttons.
 *   a route page     its two ends, its days and its hazard; a Lair hazard waits
 *                    for its "Roll the lair" button (RULED 2026-10-03). Every
 *                    link to a route page gets a Reveal/Hide eye
 *                    (region-controls.js).
 *
 * The journal's `region` flag keeps the region code and the GM's edits (types,
 * names, hazards) with each page's id, so the Scene can be made from it.
 *
 * regionPages is pure, for the test; createRegionJournal is the one step that
 * touches Foundry.
 */

import { rollLocationDetails, detailsHtml, regionSettlementHtml } from "./region-details.js";
import { encounterTable, creatureOf } from "./region-data.js";
import { bestiaryNameOf, settleLocation } from "./region-names.js";
import { rollVaultDetails } from "../vault/vault-journal.js";
import { localsOf, createSectionTables } from "./region-encounters.js";

export const REGION_FOLDER = "Regions";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const letterOf = sec => String.fromCharCode(65 + sec.id);
export const locationTitle = L => `${L.id + 1}. ${L.name || "Unnamed " + L.type}`;
export const sectionTitle = sec => `Section ${letterOf(sec)}: ${sec.name || "Unnamed"}`;
export const routeTitle = (W, R) => `Route ${R.id + 1}: ${W.locs[R.a].name || W.locs[R.a].type} to ${W.locs[R.b].name || W.locs[R.b].type}`;

/** Every page's id: Overview, each section, each location, each route. */
export function pageIds(W, randomId)
{
  return { overview: randomId(), sections: W.sections.map(() => randomId()), locs: W.locs.map(() => randomId()), routes: W.routes.map(() => randomId()) };
}

/**
 * The pages' names, HTML and flags. `details[i]` is location i's details HTML and `spawns[i]` the Bestiary
 * creatures it names (both from rollDetails). `ids` from pageIds; `journalId` for the links. Pure.
 */
export function regionPages(W, { name, details, spawns = [], ids, journalId })
{
  const link = (pid, text) => `@UUID[JournalEntry.${journalId}.JournalEntryPage.${pid}]{${text}}`;
  const locLink = L => link(ids.locs[L.id], esc(L.name || "Unnamed " + L.type));
  const secLink = s => link(ids.sections[s.id], esc(sectionTitle(s)));
  const routeLink = (R, text) => link(ids.routes[R.id], text);
  const hazard = R => R.hazard ? `${esc(R.hazard)} (Route Hazard ${R.hazardRoll})` : "safe";
  const haz = W.routes.filter(r => r.hazard).length;

  const overview = `<h2>${esc(name)}</h2>
<p>${W.locs.length} locations in ${W.sections.length} section${W.sections.length === 1 ? "" : "s"}, joined by ${W.routes.length} routes (${haz} hazardous). One hex is one day's travel.</p>
<h3>Sections</h3>
<ul>${W.sections.map(s => `<li>${secLink(s)}: ${esc(s.landscape)}; ${s.locs.length} location${s.locs.length === 1 ? "" : "s"}${s.landmark ? `; landmark: ${esc(s.landmark.name)}` : ""}</li>`).join("")}</ul>
<h3>Routes</h3>
<table><thead><tr><th>Route</th><th>From</th><th>To</th><th>Days</th><th>Hazard</th></tr></thead><tbody>
${W.routes.map(R => `<tr><td>${routeLink(R, String(R.id + 1))}</td><td>${locLink(W.locs[R.a])}</td><td>${locLink(W.locs[R.b])}</td><td>${R.days}</td><td>${hazard(R)}</td></tr>`).join("\n")}
</tbody></table>
<p><b>Region code:</b> <code>${esc(W.code)}</code></p>`;

  // the table a section rolls (region-encounters.js): its Landscape's book table, locals over the lowest entries,
  // the famous monster over the top
  const sectionFlag = s => ({ section: s.id, table: s.encounters.table, die: encounterTable(s.encounters.table).results.length,
    locals: localsOf(s.locs), famous: s.encounters.added[0]?.text ?? null });
  const sectionPage = s =>
  {
    const f = sectionFlag(s);
    return `<p><b>Landscape:</b> ${esc(s.landscape)}</p>
<p><b>Named for:</b> ${esc(s.named)}${s.nameFrom ? ` (name rolled from ${esc(s.nameFrom)})` : ""}</p>
${s.landmark ? `<p><b>Landmark:</b> ${esc(s.landmark.name)} (Landmark Table ${s.landmark.roll})</p>` : ""}
<h3>Encounters</h3>
<p>From <b>${esc(s.encounters.table)}</b>, rolled on a d${f.die}. ${f.locals.length ? "Local factions replace the lowest entries" : ""}${f.locals.length && f.famous ? "; " : f.locals.length ? "." : ""}${f.famous ? `the famous monster, from ${esc(s.encounters.added[0].table)}, replaces the top.` : ""}</p>
<p>The table is a RollTable in the Region Tables folder - edit it there. The box at the top of this page sets its die and shows the entries the die can reach.</p>
<h3>Locations</h3>
<ul>${s.locs.map(L => `<li>${locLink(L)} (${esc(L.type)})</li>`).join("")}</ul>`;
  };

  const locationPage = L =>
  {
    const routes = W.routes.filter(R => R.a === L.id || R.b === L.id);
    return `<p><b>Type:</b> ${esc(L.type)} (${L.edited ? "chosen by the Referee; its Regional Feature roll was " : "Regional Feature "}${L.roll}, ${L.roll % 2 ? "odd" : "even"})</p>
<p><b>Section:</b> ${secLink(W.sections[L.section])}</p>
${details[L.id] ?? ""}
<h3>Routes</h3>
<ul>${routes.map(R => { const o = W.locs[R.a === L.id ? R.b : R.a]; return `<li>To ${locLink(o)} (${esc(o.type)}): ${R.days} day${R.days === 1 ? "" : "s"}, ${hazard(R)} - ${routeLink(R, "route " + (R.id + 1))}</li>`; }).join("")}</ul>`;
  };

  const routePage = R => `<p><b>From:</b> ${locLink(W.locs[R.a])} (${esc(W.locs[R.a].type)})</p>
<p><b>To:</b> ${locLink(W.locs[R.b])} (${esc(W.locs[R.b].type)})</p>
<p><b>Days:</b> ${R.days}</p>
<p><b>Hazard:</b> ${hazard(R)}</p>
${R.hazard === "Lair" ? `<p class="region-lair-pending"><i>The lair on this route is not rolled yet.</i></p>` : ""}`;

  return [
    { _id: ids.overview, name: "Overview", text: overview },
    ...W.sections.map(s => ({ _id: ids.sections[s.id], name: sectionTitle(s), text: sectionPage(s), flags: { vaarn: { regionSection: sectionFlag(s) } } })),
    ...W.locs.map(L => ({ _id: ids.locs[L.id], name: locationTitle(L), text: locationPage(L),
      flags: { vaarn: { regionLocation: { loc: L.id, type: L.type }, ...(L.type === "Vault" ? { regionVault: { name: L.name || "", generated: null } } : {}),
                        // what Build this settlement makes the same settlement from (Settlement Creation chunk 7)
                        ...(L.type === "Settlement" && L.settlement ? { regionSettlement: { ...L.settlement, name: L.name || "", journal: null } } : {}),
                        ...(spawns[L.id]?.length ? { regionSpawns: spawns[L.id] } : {}) } } })),
    ...W.routes.map(R => ({ _id: ids.routes[R.id], name: routeTitle(W, R), text: routePage(R),
      flags: { vaarn: { regionRoute: { route: R.id, lair: R.hazard === "Lair" ? { rolled: false } : null } } } }))
  ];
}

/** What the journal keeps to make the Scene: the code and the GM's edits, with each page's id. */
export function regionFlag(W, name, ids)
{
  return {
    name, code: W.code,
    locs: W.locs.map(L => ({ type: L.type, name: L.name, page: ids.locs[L.id] })),
    sections: W.sections.map(s => ({ name: s.name, page: ids.sections[s.id] })),
    routes: W.routes.map(R => ({ hazard: R.hazard, hazardRoll: R.hazardRoll, page: ids.routes[R.id] })),
    overview: ids.overview
  };
}

/** The Bestiary creatures named by rolled details' values: [{ text, name }], each name once. Pure. */
export function spawnsOf(details)
{
  const out = [], seen = new Set();
  for(const d of details ?? []) for(const l of d.lines) for(const v of l.values)
  {
    const name = bestiaryNameOf(creatureOf(v));
    if(name && !seen.has(name)) { seen.add(name); out.push({ text: v, name }); }
  }
  return out;
}

/** Each location's details HTML and the creatures they name, rolled now. Foundry only, for Settlement. */
export async function rollDetails(W, random = Math.random)
{
  const html = [], spawns = [];
  for(const L of W.locs)
  {
    if(L.type === "Settlement")
    {
      // its settlement, as the preview rolled it (region-names.js settleLocation); a location the GM made a Settlement
      // in the preview gets one now, and keeps the name it had
      if(!L.settlement) { const name = L.name; settleLocation(W, L); if(name) L.name = name; }
      const { generateSettlement } = await import("../settlement/settlement-generator.js");
      html.push(regionSettlementHtml(generateSettlement({ seed: L.settlement.seed }, { location: L.settlement.location ?? undefined })));
      spawns.push([]);
    }
    else if(L.type === "Vault")
    {
      const v = rollVaultDetails(random);
      html.push(`<h3>Vault</h3><p><b>Vault Entrance:</b> ${esc(v.entrance)}</p><p><b>The Tunnels:</b> ${esc(v.tunnels)}</p><p><b>Original Function:</b> ${esc(v.originalFunction)}</p>`
        + `<p class="region-vault-pending"><i>The vault itself is not generated yet.</i></p>`);
      spawns.push([]);
    }
    else { const d = rollLocationDetails(L.type, random); html.push(detailsHtml(d)); spawns.push(spawnsOf(d)); }
  }
  return { html, spawns };
}

async function regionFolder()
{
  return game.folders.find(f => f.type === "JournalEntry" && f.name === REGION_FOLDER && !f.folder)
    ?? await Folder.create({ name: REGION_FOLDER, type: "JournalEntry" });
}

/** Write the region's journal, GM-only, and return it. */
export async function createRegionJournal(W, name)
{
  const { html, spawns } = await rollDetails(W);
  const folder = await regionFolder();
  const journal = await JournalEntry.create({ name, folder: folder.id, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE } });
  const ids = pageIds(W, () => foundry.utils.randomID());
  const pages = regionPages(W, { name, details: html, spawns, ids, journalId: journal.id })
    .map((p, i) => ({ _id: p._id, name: p.name, type: "text", sort: (i + 1) * 100, text: { content: p.text }, flags: p.flags ?? {} }));
  await journal.createEmbeddedDocuments("JournalEntryPage", pages, { keepId: true });
  await journal.setFlag("vaarn", "region", regionFlag(W, name, ids));
  // each section's encounter table as a RollTable (step E)
  await createSectionTables(journal);
  return journal;
}
