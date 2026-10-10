/**
 * Settlement Creation (foundry-system-index.csv row of that name) - the journal, chunk 2 of the build plan
 * (RULED 2026-10-08, Matt): an Overview page and a page per marked location, as a region journal is.
 *
 *   Overview   the name; the overview columns; the seat of power and water source in brief, linked; Religious
 *              Reformation's second faith; the gathering places; local value fluctuations; the founder's other
 *              settlements, linked ("Yasuke also founded ..."); every location, linked
 *   a location its own page: what was rolled for it, with Make an NPC here (region-controls.js npcBox); the
 *              major problem's page is GM-only on the map too (chunk 4 reveals the others)
 *
 * Every result is a "<p><b>Label:</b> value</p>" line, the shape the follow-up buttons read (chunk 6). The journal
 * is GM-only and carries a `settlement` flag (its seed, settings, name key and founder) for the later chunks and
 * the world's no-repeat names; each location page carries `settlementLocation` (its id and kind).
 *
 * settlementPages is pure, for the test; createSettlementJournal is the one step that touches Foundry.
 */

export const SETTLEMENT_FOLDER = "Settlements";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// the book's own page references ("Titan Cult (p.xx)") point at nothing in Foundry
const clean = s => String(s ?? "").replace(/\s*\(p\.\s*xx\)/gi, "").trim();
const line = (label, value) => `<p><b>${esc(label)}:</b> ${esc(clean(value))}</p>`;
const ORDER = ["seat", "water", "asset", "problem", "building", "landmark"];

/** A location page's title. */
export const locationTitle = d => `${{ seat: "Seat of Power", water: "Water Source", asset: "Major Asset", problem: "Major Problem", building: "Building", landmark: "Landmark" }[d.kind]}: ${clean(d.name)}`;

/** Each location's page id, and the Overview's. */
export function pageIds(g, randomId)
{
  return { overview: randomId(), locations: Object.fromEntries(g.locations.map(d => [d.id, randomId()])) };
}

/** One location's page HTML. */
function locationHtml(d, g)
{
  const out = [`<h3>${esc(d.label)}</h3>`];
  switch(d.kind)
  {
    case "seat":
      out.push(line("Government Type A", d.typeA), line("Government Type B", d.typeB), `<p>${esc(d.desc)}</p>`,
        `<p class="settlement-dice"><i>The seat's d20: ${d.roll} (Type B); a second d20: ${d.rollA} (Type A).</i></p>`);
      break;
    case "water":
      out.push(line("Water Source", d.name), line("Complication", d.complication), `<p class="settlement-dice"><i>d8: ${d.roll}.</i></p>`);
      break;
    case "asset":
      out.push(line("Major Asset", d.name), `<p>${esc(clean(d.desc))}</p>`, `<p class="settlement-dice"><i>d20: ${d.roll}.</i></p>`);
      break;
    case "problem":
      out.push(line("Major Problem", d.name), `<p>${esc(clean(d.desc))}</p>`);
      if(g.reformation) out.push(line("The Upstart Faith", g.reformation));
      out.push(`<p class="settlement-dice"><i>d20: ${d.roll}. Only the GM sees this location on the map.</i></p>`);
      break;
    case "building":
      out.push(line("Building Type", d.type), line("Building", d.name), `<p class="settlement-dice"><i>d12: ${d.roll}; then d20 on the ${esc(d.type)} column: ${d.rollB}.</i></p>`);
      break;
    case "landmark":
      out.push(line("Landmark", d.name), `<p class="settlement-dice"><i>d100: ${d.roll}.</i></p>`);
      break;
  }
  return out.join("");
}

/**
 * The pages' names, HTML and flags. `fluctuations` is the Local Value Fluctuations block (Foundry-rolled, so it is
 * passed in); `founderLinks` are the founder's other settlements, as [{ uuid, name }].
 */
export function settlementPages(g, { ids, journalId, fluctuations = "", founderLinks = [] })
{
  const link = d => `@UUID[JournalEntry.${journalId}.JournalEntryPage.${ids.locations[d.id]}]{${esc(clean(d.name))}}`;
  const sorted = [...g.locations].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const of = kind => sorted.filter(d => d.kind === kind);
  const seat = of("seat")[0], water = of("water")[0];
  const crossings = g.gathers.filter(x => x.how === "crossing").length, meets = g.gathers.length - crossings;
  const overview = [
    `<h2>${esc(g.name)}</h2>`,
    ...(g.founder && founderLinks.length ? [`<p><i>${esc(g.founder)} also founded ${founderLinks.map(f => `@UUID[${f.uuid}]{${esc(f.name)}}`).join(", ")}.</i></p>`] : []),
    `<h3>Overview</h3>`,
    ...g.overview.flatMap(o => o.cols.map(([k, v]) => line(k, v))),
    ...(g.larger ? [`<p><i>A larger settlement: two more assets and six more buildings.</i></p>`] : []),
    `<h3>Seat of Power and Water</h3>`,
    `<p><b>Government:</b> ${link(seat)}</p>`, `<p><b>Water Source:</b> ${link(water)} (${esc(water.complication)})</p>`,
    ...(g.reformation ? [`<p><b>The Upstart Faith:</b> ${esc(clean(g.reformation))} - challenging ${esc(clean(g.values["Dominant Faith"]))} (Religious Reformation)</p>`] : []),
    `<h3>Locations</h3>`,
    `<ul>${sorted.map(d => `<li>${esc(d.label)}: ${link(d)}${d.kind === "building" ? ` (${esc(d.type)})` : ""}</li>`).join("")}</ul>`,
    `<h3>Gathering Places</h3>`,
    `<p>${g.gathers.length ? `${crossings} where roads cross${meets ? `, and ${meets} where a road meets the main road` : ""}: a market, a courtyard.` : "None."}</p>`,
    fluctuations,
  ].join("");
  return [
    { _id: ids.overview, name: "Overview", text: overview },
    ...sorted.map(d => ({ _id: ids.locations[d.id], name: locationTitle(d), text: locationHtml(d, g),
      flags: { vaarn: { settlementLocation: { id: d.id, kind: d.kind, gmOnly: d.kind === "problem" } } } }))
  ];
}

/** What the journal keeps: enough to rebuild its map (chunk 3) and to keep the world's names from repeating. */
export function settlementFlag(g, ids, moves = null)
{
  return { version: 1, seed: g.settings.seed, settings: g.settings, name: g.name, nameKey: g.nameKey, founder: g.founder,
    moves: moves ? Object.fromEntries(moves) : {}, pages: ids,
    // what a weapon resolved this settlement's generic faith to (Faith-Named Religious Weapon Tags, 2026-10-09)
    ...(g.faiths ? { faiths: g.faiths } : {}) };
}

/** The name keys every settlement journal in the world has spent. Foundry only. */
export function usedSettlementNames()
{
  return new Set(game.journal.map(j => j.getFlag("vaarn", "settlement")?.nameKey).filter(Boolean));
}

async function settlementFolder()
{
  return game.folders.find(f => f.type === "JournalEntry" && f.name === SETTLEMENT_FOLDER && !f.folder)
    ?? await Folder.create({ name: SETTLEMENT_FOLDER, type: "JournalEntry" });
}

/** Write a settlement's journal, GM-only, and return it; a founder's other settlements are linked both ways. Foundry only. */
export async function createSettlementJournal(g, { moves = null } = {})
{
  const { fluctuationHtml } = await import("../actor/settlement-fluctuation.js");
  const others = g.founder ? game.journal.filter(j => j.getFlag("vaarn", "settlement")?.founder === g.founder) : [];
  const folder = await settlementFolder();
  const journal = await JournalEntry.create({ name: g.name, folder: folder.id, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE } });
  const ids = pageIds(g, () => foundry.utils.randomID());
  const pages = settlementPages(g, { ids, journalId: journal.id, fluctuations: fluctuationHtml(), founderLinks: others.map(j => ({ uuid: j.uuid, name: j.name })) })
    .map((p, i) => ({ _id: p._id, name: p.name, type: "text", sort: (i + 1) * 100, text: { content: p.text }, flags: p.flags ?? {} }));
  await journal.createEmbeddedDocuments("JournalEntryPage", pages, { keepId: true });
  await journal.setFlag("vaarn", "settlement", settlementFlag(g, ids, moves));
  // the founder's earlier settlements learn of this one (RULED 2026-10-08: the thread is linked from the page)
  for(const j of others)
  {
    const page = j.pages.get(j.getFlag("vaarn", "settlement")?.pages?.overview);
    if(!page) continue;
    await page.update({ "text.content": (page.text.content ?? "") + `<p><i>${esc(g.founder)} also founded @UUID[${journal.uuid}]{${esc(g.name)}}.</i></p>` });
  }
  return journal;
}
