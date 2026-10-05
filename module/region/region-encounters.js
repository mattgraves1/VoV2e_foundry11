/**
 * Region Generator (foundry-system-index.csv row of that name) - a section's
 * encounters, journal controls step B (RULED 2026-10-03, Matt).
 *
 *   the table      a section's encounter table is its Landscape's book table,
 *                  rolled on a die the GM picks (d4-d20; the harder entries sit
 *                  at the higher numbers, so a smaller die is easier), with the
 *                  local factions of its locations replacing the LOWEST entries
 *                  (Bandit Camp: Bandits; Hegemony Outpost: Hegemony
 *                  Conscripts; Faa Nomad Camp: Faa Nomads; Cacklemaw Den:
 *                  Cacklemaw; Settlement and Trade Post: a Trade Caravan) and a
 *                  Famous Monster section's monster replacing the TOP of the die
 *   where          "The party is in this section", on a section's page or in the
 *                  Exploration Clock window while it is in the Desert, kept as a
 *                  world setting
 *   the clock      with the clock in the Desert and a section recorded, an
 *                  Encounter result rolls that section's table and an Omen names
 *                  what it rolled - as a vault level does (vault-encounters.js) -
 *                  on the per-turn check, the day-start check and the campsite
 *                  surprise; a creature gets the cards' Spawn one button
 *
 * The die picker and editing the table in Foundry's own editor are step E; until
 * then the die is the whole book table.
 *
 * The rules are pure; the Foundry parts are at the bottom.
 */

import { encounterTable, creatureOf } from "./region-data.js";
import { bestiaryNameOf } from "./region-names.js";

export const SECTION_SETTING = "partyRegionSection";
export const SECTION_HOOK = "vaarnPartyRegionSection";
export const DICE = [4, 6, 8, 10, 12, 20];

/** Each location type's local entry in its section's table (RULED 2026-10-03, Matt). */
export const LOCAL_ENTRIES = {
  "Bandit Camp": "Bandits", "Hegemony Outpost": "Hegemony Conscripts", "Faa Nomad Camp": "Faa Nomads",
  "Cacklemaw Den": "Cacklemaw", "Settlement": "Trade Caravan", "Trade Post": "Trade Caravan"
};

/** A section's local entries: one per kind, with where it comes from. Pure. `locs` are { type, name }. */
export function localsOf(locs)
{
  const out = new Map();
  for(const L of locs)
  {
    const text = LOCAL_ENTRIES[L.type];
    if(!text) continue;
    if(!out.has(text)) out.set(text, { text, from: [] });
    out.get(text).from.push(L.name || L.type);
  }
  return [...out.values()];
}

/**
 * The entries a section rolls on, 1 to `die`: the book table's first `die` rows, the locals over the lowest numbers
 * and the famous monster over the top. Each is { text, source, creature } - `source` "table", "local" or "monster";
 * `creature` the Bestiary name it can spawn, or null. Pure.
 */
export function sectionEntries({ table, die, locals = [], famous = null })
{
  const rows = encounterTable(table).results;
  const n = Math.min(die ?? rows.length, rows.length);
  const out = rows.slice(0, n).map(r => ({ text: r.text, source: "table" }));
  const room = famous ? n - 1 : n;
  locals.slice(0, room).forEach((l, i) => { out[i] = { text: `${l.text} (local: ${l.from.join(", ")})`, source: "local", base: l.text }; });
  if(famous && n) out[n - 1] = { text: `${famous} (the famous monster this section is named for)`, source: "monster", base: famous };
  return out.map(e => ({ ...e, creature: bestiaryNameOf(creatureOf(e.base ?? e.text)) }));
}

/**
 * What a desert check's result is: "encounter", "omen" or null. Pure. The desert table words its Encounter "Roll on
 * the local Encounters table", not the vault's "Roll on the current area's encounter table" - the vault's own reader
 * (vault-encounters.js checkKind) knows only the vault's, and with it no desert Encounter was ever seen (found
 * 2026-10-03, 80 checks, Group 495).
 */
export function regionCheckKind(text)
{
  const t = String(text ?? "");
  if(/Encounter\.(<\/b>|<\/strong>|\*\*)?/.test(t) && /Roll on the (local Encounters table|current area)/i.test(t)) return "encounter";
  if(/Omen\.(<\/b>|<\/strong>|\*\*)?/.test(t)) return "omen";
  return null;
}

/** The card line for a rolled section. Pure. An Encounter with a creature carries the cards' spawn marker. */
export function sectionEncounterLine(kind, { region, section, entries, total })
{
  const e = entries[total - 1];
  if(!e) return "";
  if(kind === "omen") return `<p class="vaarn-vault-omen"><b>Omen, ${region}, ${section}:</b> signs of <b>${e.base ?? e.text}</b> (d${entries.length} = ${total}).</p>`;
  return `<p class="vaarn-vault-encounter"><b>${region}, ${section} encounters:</b> d${entries.length} = ${total} - <b>${e.text}</b>.`
    + (e.creature ? `<span class="vaarn-vault-spawn" data-creature="${e.creature}"></span>` : "") + `</p>`;
}

/* ---------- Foundry ---------- */

export function registerRegionLocation()
{
  game.settings.register("vaarn", SECTION_SETTING, {
    scope: "world", config: false, type: Object, default: {},
    onChange: () => Hooks.callAll(SECTION_HOOK)
  });
}

/** Every region journal's sections: { journalId, region, section, name, page }. */
export function regionSections()
{
  const out = [];
  for(const j of game.journal)
  {
    if(!j.getFlag("vaarn", "region")) continue;
    for(const p of j.pages)
    {
      const f = p.getFlag("vaarn", "regionSection");
      if(f) out.push({ journalId: j.id, region: j.name, section: f.section, name: p.name, page: p });
    }
  }
  return out.sort((a, b) => a.region.localeCompare(b.region) || a.section - b.section);
}

/** The party's recorded section, resolved - or null. */
export function partySection()
{
  const loc = game.settings.get("vaarn", SECTION_SETTING) ?? {};
  if(!loc.journalId) return null;
  return regionSections().find(s => s.journalId === loc.journalId && s.section === loc.section) ?? null;
}

export async function setPartySection(journalId, section)
{
  await game.settings.set("vaarn", SECTION_SETTING, journalId ? { journalId, section: Number(section) } : {});
}

// ---- the section's RollTable (step E, RULED 2026-10-03, Matt) ----

export const TABLE_FOLDER = "Region Tables";

/** A Foundry RollTable's results as entries, in range order, up to its die. */
function entriesOfTable(table, die)
{
  return [...table.results].sort((a, b) => a.range[0] - b.range[0]).filter(r => r.range[0] <= die)
    .map(r => ({ text: r.text, source: r.getFlag("vaarn", "regionMonster") ? "monster" : r.getFlag("vaarn", "regionLocal") ? "local" : "table",
                 creature: bestiaryNameOf(creatureOf(r.text)) }));
}
/** The die a section rolls: its RollTable's formula, or its flag's. */
const dieOf = (table, f) => Number(String(table?.formula ?? "").match(/d(\d+)/)?.[1]) || f.die;

/**
 * A section page's entries, 1 to its die: from its RollTable when it has one (the GM may have edited it), from the
 * book table otherwise (a region made before step E).
 */
export async function entriesOfPage(page)
{
  const f = page.getFlag("vaarn", "regionSection");
  const table = f.rollTable ? await fromUuid(f.rollTable) : null;
  return table ? entriesOfTable(table, dieOf(table, f)) : sectionEntries(f);
}

/** Roll a section page's table: { total, entries, entry }. */
export async function rollSection(page)
{
  const entries = await entriesOfPage(page);
  const roll = await new Roll(`1d${entries.length}`).evaluate();
  return { total: roll.total, entries, entry: entries[roll.total - 1] };
}

async function tableFolder(regionName)
{
  let top = game.folders.find(f => f.type === "RollTable" && f.name === TABLE_FOLDER && !f.folder);
  if(!top) top = await Folder.create({ name: TABLE_FOLDER, type: "RollTable" });
  return game.folders.find(f => f.type === "RollTable" && f.name === regionName && f.folder?.id === top.id)
    ?? await Folder.create({ name: regionName, type: "RollTable", folder: top.id });
}

/** Make each section's RollTable, GM-only, in Region Tables / <region>, and point its page at it. */
export async function createSectionTables(journal)
{
  const folder = await tableFolder(journal.name);
  for(const page of journal.pages)
  {
    const f = page.getFlag("vaarn", "regionSection");
    if(!f || f.rollTable) continue;
    const entries = sectionEntries(f);
    const table = await RollTable.create({
      name: `${journal.name}: ${page.name}`, folder: folder.id, formula: `1d${entries.length}`,
      description: `${page.name}'s encounters. The die is set on its page; a smaller die rolls only the lower, easier entries.`,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      results: entries.map((e, i) => ({ type: CONST.TABLE_RESULT_TYPES.TEXT, text: e.text, range: [i + 1, i + 1], weight: 1,
        flags: { vaarn: { ...(e.source === "monster" ? { regionMonster: true } : {}), ...(e.source === "local" ? { regionLocal: true } : {}) } } })),
      flags: { vaarn: { regionSectionTable: { journalId: journal.id, page: page.id } } }
    });
    await page.setFlag("vaarn", "regionSection", { ...f, rollTable: table.uuid, die: entries.length });
  }
}

/**
 * Set a section's die. The famous monster stays the top of the die (RULED): it swaps places with the entry at the
 * new top, so the GM's own edits to the table survive.
 */
export async function setSectionDie(page, die)
{
  const f = page.getFlag("vaarn", "regionSection");
  const table = f?.rollTable ? await fromUuid(f.rollTable) : null;
  if(!table) throw new Error("This section has no RollTable.");
  const size = table.results.size;
  die = Math.min(Number(die), size);
  const monster = table.results.find(r => r.getFlag("vaarn", "regionMonster"));
  const atTop = table.results.find(r => r.range[0] === die);
  if(monster && atTop && monster.id !== atTop.id)
    await table.updateEmbeddedDocuments("TableResult", [{ _id: monster.id, range: [die, die] }, { _id: atTop.id, range: [...monster.range] }]);
  await table.update({ formula: `1d${die}` });
  // the page's prose names the die too ("rolled on a d12"), written at creation (Matt, 2026-10-04)
  const text = withSectionDie(page.text.content, die);
  await page.update({ "flags.vaarn.regionSection": { ...f, die }, ...(text !== page.text.content ? { "text.content": text } : {}) });
}

/** A section page's text with its "rolled on a dN" set to `die`. Pure. */
export function withSectionDie(html, die)
{
  return String(html ?? "").replace(/rolled on a d\d+\./, `rolled on a d${Number(die)}.`);
}

/** The line an "encounter" or "omen" gets in the Desert with a section recorded, or "". */
export async function regionExtra(envKey, kind)
{
  if(envKey !== "desert" || !kind) return "";
  const loc = partySection();
  if(!loc) return "";
  const { total, entries } = await rollSection(loc.page);
  return sectionEncounterLine(kind, { region: loc.region, section: loc.name, entries, total });
}

/** The extra line a check result gets from its text: see regionExtra. */
export async function regionCheckExtra(envKey, text)
{
  return regionExtra(envKey, regionCheckKind(text));
}
