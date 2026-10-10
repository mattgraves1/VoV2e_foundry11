/**
 * Region Generator (foundry-system-index.csv row of that name) - each
 * location's details, rolled from its type's own tables in The Desert when the
 * region is created (RULED 2026-10-03, Matt: every type gets a page).
 *
 *   thirteen types   their tables in rolltable-data.js (Ruin's two, Faa Nomad
 *                    Camp's two, Lair's d100, Grave's, ...): EACH COLUMN IS
 *                    ROLLED SEPARATELY (RULED 2026-10-03, as Room Shape, Floors
 *                    and Walls was), a column marked (x2) twice
 *   seven types      composite generators in composite-generator-data.js (Bandit
 *                    Camp, Oasis, Fortress, Trade Post, Archive, Arcology,
 *                    Anomaly), which already roll each column on its own
 *   Settlement       its settlement's overview (regionSettlementHtml); the page
 *                    builds the whole settlement when wanted (RULED)
 *   Vault            Vault Entrance, Tunnels and Original Function; the vault
 *                    itself is generated from its page when wanted (RULED)
 *
 * rollLocationDetails is pure given a random function, for the test.
 */

import { ROLLTABLES } from "../actor/rolltable-data.js";
import { COMPOSITE_GENERATORS } from "../actor/composite-generator-data.js";
import { SETTLEMENT_GROUPS } from "../actor/settlement-overview-data.js";
import { LANDSCAPE_SETTLEMENT_LOCATION, LANDSCAPE_SETTING, SITE_FEATURE_ROWS, SITE_FEATURE_CHANCE } from "./region-data.js";

/** The book's Location of Settlement column, index = d20 - 1. */
const SETTLEMENT_LOCATIONS = SETTLEMENT_GROUPS.find(g => g.cols[0] === "Location of Settlement").data["Location of Settlement"];

const COMPOSITE_KEY = { "Bandit Camp": "bandit_camp", "Oasis": "oasis", "Fortress": "fortress", "Trade Post": "trade_post",
  "Archive": "archive", "Arcology": "arcology", "Anomaly": "anomaly" };

/** A location type's tables in rolltable-data.js: every table of its The Desert page. */
export const typeTables = type => ROLLTABLES.filter(t => t.source.startsWith(`The Desert/${type}.md :: `));

const labelled = text => text.split(/\s*\n/).map(l => l.match(/^\*\*(.+?):\*\*\s*(.*)$/)).filter(Boolean).map(m => [m[1], m[2].trim()]);
const twice = label => /\((?:x2|×2)\)\s*$/i.test(label);
const bare = label => label.replace(/\s*\((?:x2|×2)\)\s*$/i, "");

/** Roll each column of a multi-column table on its own; a column marked (x2) twice. Returns [{ label, values }]. */
export function rollColumns(table, random = Math.random)
{
  const cols = labelled(table.results[0].text).map(([l]) => l);
  if(!cols.length) return [{ label: table.name, values: [table.results[Math.floor(random() * table.results.length)].text.trim()] }];
  return cols.map(label =>
  {
    const values = [];
    for(let i = 0; i < (twice(label) ? 2 : 1); i++)
    {
      const row = table.results[Math.floor(random() * table.results.length)];
      values.push(labelled(row.text).find(([l]) => l === label)?.[1] ?? "");
    }
    return { label: bare(label), values };
  });
}

/** Roll a composite generator: its groups as the data file defines them. Returns [{ heading, lines: [{ label, values }] }]. */
function rollComposite(gen, random)
{
  return gen.tables.map(t =>
  {
    const lines = [];
    for(const g of t.groups)
    {
      const rolls = Array.from({ length: g.rolls }, () => Math.floor(random() * g.data[g.cols[0]].length));
      for(const col of g.cols) lines.push({ label: bare(col), values: rolls.map(i => g.data[col][i]) });
    }
    return { heading: t.subheading ?? gen.heading, lines };
  });
}

/**
 * A location's details: [{ heading, lines: [{ label, values }] }], or null for Settlement and Vault,
 * whose details are rolled elsewhere (regionSettlementHtml from its settlement, and the Vault's own button).
 */
export function rollLocationDetails(type, random = Math.random)
{
  if(type === "Settlement" || type === "Vault") return null;
  if(COMPOSITE_KEY[type])
  {
    const gen = COMPOSITE_GENERATORS.find(g => g.key === COMPOSITE_KEY[type]);
    if(!gen) throw new Error(`Region Generator: the ${type} generator is missing from composite-generator-data.js.`);
    return rollComposite(gen, random);
  }
  const tables = typeTables(type);
  if(!tables.length) throw new Error(`Region Generator: no table for ${type} in rolltable-data.js.`);
  return tables.map(t => ({ heading: t.name.replace(/\s*\(d\d+\)$/, ""), lines: rollColumns(t, random) }));
}

/** Every type the region can roll has its details' source. Pure, for the test. */
export const detailSourceOf = type =>
  type === "Settlement" ? "Generate Settlement" : type === "Vault" ? "Vault Entrance, Tunnels and Original Function"
    : COMPOSITE_KEY[type] ? `composite generator ${COMPOSITE_KEY[type]}` : typeTables(type).map(t => t.name).join(", ");

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/** Details as page HTML. */
export const detailsHtml = details => details.map(d =>
  `<h3>${esc(d.heading)}</h3>` + d.lines.map(l => `<p><b>${esc(l.label)}:</b> ${l.values.map(esc).join("; ")}</p>`).join("")).join("");

/**
 * A region Settlement's Location of Settlement (Settlement Location from Section
 * Landscape row, RULED 2026-10-08, Matt): one time in four a site feature from the
 * book's column, rolled evenly, with its terrain named; otherwise the section
 * Landscape's own location. Pure given a random function, for the test.
 */
export function settlementLocationIn(landscape, random = Math.random)
{
  if(random() < SITE_FEATURE_CHANCE)
  {
    const row = SITE_FEATURE_ROWS[Math.floor(random() * SITE_FEATURE_ROWS.length)];
    return `${SETTLEMENT_LOCATIONS[row - 1]}, ${LANDSCAPE_SETTING[landscape]}`;
  }
  return LANDSCAPE_SETTLEMENT_LOCATION[landscape];
}

/**
 * A region Settlement's page details (Settlement Creation chunk 7, RULED 2026-10-08, Matt): its settlement's
 * overview - every column as the settlement's own journal prints it - and the line Build this settlement replaces.
 * `g` is the settlement settleLocation (region-names.js) made in the preview. Pure.
 */
export const SETTLEMENT_PENDING = /<p class="region-settlement-pending">.*?<\/p>/;
export function regionSettlementHtml(g)
{
  const clean = v => String(v ?? "").replace(/\s*\(p\.\s*xx\)/gi, "").trim();
  return `<h3>Settlement</h3>${g.overview.flatMap(o => o.cols.map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(clean(v))}</p>`)).join("")}`
    + `<p class="region-settlement-pending"><i>The settlement itself is not built yet: Build this settlement makes its places, its people and its map.</i></p>`;
}
