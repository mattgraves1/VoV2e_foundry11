/**
 * Vaarn RollTable picker — reads directly from module/actor/
 * rolltable-data.js's already-built plain tables (Phase 2) rather than a
 * live RollTable.draw(), so callers don't depend on macros/
 * import-rolltables.js having been run first in the same world. Shared by
 * macros/generate-companion.js, generate-settlement.js, and
 * generate-room-contents.js — all three compose several of Phase 2's
 * plain tables into one result, a need that first came up building
 * generate-companion.js (which originally inlined this lookup) and got
 * pulled out here once two more macros needed the exact same thing.
 */

function markdownishToHtml(text)
{
  return text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
}

async function getTable(name)
{
  const { ROLLTABLES } = await import("/systems/vaarn/module/actor/rolltable-data.js");
  const table = ROLLTABLES.find(t => t.name === name);
  if(!table) throw new Error(`RollTable "${name}" not found in rolltable-data.js.`);
  return table;
}

/** Rolls a table and returns its raw result {range, text} (text still has any "**Col:**"/"\n" markdown-ish formatting from rolltable-data.js). */
export async function pickRandomResult(name)
{
  const table = await getTable(name);
  return table.results[Math.floor(Math.random() * table.results.length)];
}

/** Same as pickRandomResult, but returns text with "**bold**" converted to <b> and newlines to <br>, ready to drop straight into a chat card. */
export async function pickRandomResultHtml(name)
{
  const result = await pickRandomResult(name);
  return markdownishToHtml(result.text);
}

/** Finds the result whose range contains `value` — for tables like Vault Hazards keyed on "d20 + Floor" rather than a plain roll. */
export async function pickRangeResult(name, value)
{
  const table = await getTable(name);
  const result = table.results.find(r => value >= r.range[0] && value <= r.range[1]);
  return result ? markdownishToHtml(result.text) : null;
}
