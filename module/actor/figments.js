/**
 * Autarch Figment Grant (foundry-system-index.csv "Autarch Figment Grant").
 *
 * A roster-shaped view of the four Autarch Figments, derived from the one
 * place they are transcribed rather than a second copy of them.
 *
 * WHY THIS IS A VIEW AND NOT A ROSTER, RULED 2026-09-14 (Matt). Mutations and
 * implants get their own `-data.js` because nothing else holds them. The
 * figments were already transcribed in rolltable-data.js, as the d4 table the
 * book prints where the other seven Major Factions print a Gaining REP table,
 * and the Court's faction entry points at it by name. A `figment-data.js`
 * carrying the same four entries would be the two-code-files-per-vault-table
 * problem roster-drift.mjs exists to catch — so the mechanics live beside the
 * text, in a `figment` object on each result, and this file reads them out.
 *
 * The consequence worth knowing: there is exactly ONE place the vault is
 * compared against for these four, and it is the RollTable entry. Edit the
 * book text there and the drift checkers see it; edit the mechanics there and
 * this view follows automatically.
 *
 * NOTHING HERE IS HAND-MAINTAINED. If a fifth figment is ever added to the
 * table it appears in this roster without an edit, and if the table is
 * renamed this throws at import rather than silently returning an empty
 * roster — which is the failure that would otherwise present as "figments
 * quietly stopped working".
 */

import { ROLLTABLES } from "./rolltable-data.js";

export const FIGMENT_TABLE = "Autarch Figment Effects";

const table = ROLLTABLES.find(t => t.name === FIGMENT_TABLE);
if (!table)
  throw new Error(`figments.js: rolltable-data.js has no table named "${FIGMENT_TABLE}"`);

/**
 * The four, in the book's d4 order. Each carries the mechanical reading of its
 * own row plus `roll`, so a caller can say which result produced it, and
 * `text`, so the Item's description is the book's sentence rather than a
 * paraphrase.
 */
export const FIGMENTS = table.results
  .filter(r => r.figment)
  .map(r => ({ ...r.figment, roll: r.range[0], text: r.text }));

if (FIGMENTS.length !== table.results.length)
  throw new Error(`figments.js: ${table.results.length - FIGMENTS.length} row(s) of `
    + `"${FIGMENT_TABLE}" carry no figment object`);

/** By name, for the bake hook — the same by-name contract every roster uses. */
export function findFigment(name)
{
  return FIGMENTS.find(f => f.name === name) ?? null;
}

/**
 * The book's sentence, with its markdown stripped, for an Item description.
 *
 * The table's `text` is "**Autarch Figment:** Eye  \n**Effect:** ...", which is
 * the row as the book prints it. A reader wants the effect sentence; the name
 * is already the Item's name. Splitting on the label is splitting rather than
 * parsing — if the label is ever absent the whole string comes back, which is
 * wrong but visibly wrong rather than empty.
 */
export function figmentEffectText(figment)
{
  const raw = String(figment?.text ?? "");
  const marker = "**Effect:**";
  const i = raw.indexOf(marker);
  const body = i < 0 ? raw : raw.slice(i + marker.length);
  return body.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}
