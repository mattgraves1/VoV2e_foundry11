/**
 * Vaarn composite-generator roll engine — rolls a module/actor/
 * composite-generator-data.js entry (see that file's header for the
 * "list"/"grid" shape) and returns composed HTML. Split out of
 * macros/generate-narrative.js once macros/generate-companion.js needed
 * the exact same engine for Bandit Camp's own flavor table (Bandit Camp
 * is one of the 18 composite generators AND a companion-creature spawn
 * table at once) — same "move it to module/actor/ once it's shared"
 * pattern as npc-builder.js.
 */

function stripMultiplierLabel(col)
{
  return col.replace(/\s*\((?:x2|×2)\)\s*$/i, "");
}

/**
 * Rolls one table entry (one of a "list"-type generator's `tables` array)
 * and returns {html, values} — `values` is a flat {colName: rolledValue}
 * map across every group (last-roll-wins for a repeated column, which only
 * matters for callers that want a single representative value, e.g.
 * generate-companion.js reading Bandit Camp's "Weapons" column).
 */
export function rollSingleTable(table)
{
  const lines = [];
  const values = {};
  for(const group of table.groups)
  {
    const cols = group.cols;
    for(let i = 0; i < group.rolls; i++)
    {
      const pool = group.data[cols[0]];
      const idx = Math.floor(Math.random() * pool.length);
      for(const col of cols)
      {
        const label = stripMultiplierLabel(col);
        const value = group.data[col][idx];
        lines.push(`<p><b>${label}:</b> ${value}</p>`);
        values[label] = value;
      }
    }
  }
  return { html: lines.join(""), values };
}

function rollListGenerator(generator)
{
  return generator.tables.map(table =>
  {
    const { html, values } = rollSingleTable(table);
    return { subheading: table.subheading, html, values };
  });
}

function rollGrid(grid)
{
  const row = grid.rows[Math.floor(Math.random() * grid.rows.length)];
  const cell = row[Math.floor(Math.random() * row.length)];
  return `<p><b>${grid.label}:</b> ${cell}</p>`;
}

/**
 * Rolls a full composite-generator-data.js entry and returns its composed
 * body HTML (no heading — callers wrap that themselves, since
 * generate-companion.js wants a differently-structured card than
 * generate-narrative.js's plain "<h3>heading</h3>body").
 */
export function rollGeneratorHtml(generator)
{
  if(generator.type === "grid")
    return generator.grids.map(rollGrid).join("");

  const sections = rollListGenerator(generator);
  return sections
    .map(s => (s.subheading ? `<p><i>${s.subheading}</i></p>${s.html}` : s.html))
    .join("<hr>");
}

/**
 * Looks up one specific sub-table by subheading within a "list"-type
 * generator's `tables` array (e.g. Minor Faction's "Faction Details",
 * Bandit Camp's "Bandit Camp" as opposed to its "Bandit Camp Drama") —
 * for callers that only want to roll/react to that one sub-table rather
 * than the whole generator, same as npc-generator.html's TABLE_COMPANIONS/
 * TABLE_NPC_COMPANIONS keying to one specific table, not a whole file.
 */
export function findTable(generator, subheading)
{
  return generator.tables.find(t => t.subheading === subheading) || generator.tables[0];
}
