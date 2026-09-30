/**
 * LOCAL VALUE FLUCTUATIONS (Treasure/Barter.md), the settlement half of a trade
 * good's worth. Each settlement prizes one Good Type and one Quality at x2 base
 * value, finds another pair undesirable at half, and despises a third pair
 * outright; "local modifiers override generic modifiers", so a settlement that
 * prizes Infected goods trades for them at x2 the base value even though the
 * quality's own printed effect is "no trade value".
 *
 * IT ROLLS AND REPORTS, AND COMPUTES NOTHING. Ruled 2026-09-19 (Matt): this is
 * a generator, and the Referee applies the x2 / half / worthless by hand. That
 * is the same ruling Quality Roll on Generated Good carries one step earlier in
 * the same procedure - the value multiplier is never written into `tradeValue`,
 * because appraisal is the Referee's to hand out and Barter prices a prized
 * good at "x2 the BASE value", which only survives if the base is what the
 * field holds. So nothing here reads an Item, writes a flag, or persists a
 * "current settlement": there is no world state, and re-rolling is free.
 *
 * WHY THE OVERRIDE NOTE NEEDS NO CODE, since its absence will be asked about:
 * an override only has something to override once a multiplier is being
 * applied, and nothing applies one. The note is printed on the card so the
 * Referee has it at the moment they need it, which is the whole of the build.
 *
 * "IF REPEAT RESULTS ARE ROLLED, TAKE THE NEXT OPTION DOWN" is the one
 * mechanical rule here and it was nearly missed: the vault transcription had
 * filed this sentence and the override note ~44 lines up under "Trade in
 * Vaarn", so reading the Local Value Fluctuations section alone - which is what
 * this row's own Description did - lost it. Corrected in the vault 2026-09-19.
 *
 * READ PER AXIS, and stated because the book does not spell it out: the three
 * Good Types are kept distinct from each other and the three Qualities from
 * each other, rather than a type colliding with a quality, which cannot happen
 * anyway - they are different tables. "Next option down" steps to the next ROW
 * of the table and wraps at the end, so a repeat on Masterwork (d20 = 20) takes
 * Infected. Wrapping rather than clamping, because clamping would make the last
 * row of each table absorb every collision that reached it.
 */
import { TRADE_GOODS } from "./trade-goods-data.js";
import { TRADE_GOOD_QUALITIES } from "../item/trade-good-quality.js";
import { d } from "./chargen-app.js";

/**
 * The three bands, in the book's own order. `effect` is printed rather than
 * applied; `multiplier` is recorded for a reader comparing this against Barter
 * and is deliberately consumed by nothing.
 */
export const FLUCTUATION_BANDS = [
  { key: "prized",      label: "Prized",      effect: "x2 base value",                          multiplier: 2 },
  { key: "undesirable", label: "Undesirable", effect: "half base value",                        multiplier: 0.5 },
  { key: "despised",    label: "Despised",    effect: "cannot even be given away",              multiplier: 0 },
];

/**
 * The next unused entry at or below `index`, wrapping. This is the
 * repeat-results rule, and it is one function for both tables because the rule
 * is about rows and neither table's shape enters into it.
 */
function nextUnused(list, index, taken)
{
  for(let step = 0; step < list.length; step++)
  {
    const entry = list[(index + step) % list.length];
    if(!taken.has(entry.name)) { taken.add(entry.name); return entry; }
  }
  return null;  // Unreachable: three picks from tables of 50 and 20.
}

/** The row index a d100 lands on in the Good Type table. */
function goodIndexOf(roll)
{
  const i = TRADE_GOODS.findIndex(e => roll >= e.range[0] && roll <= e.range[1]);
  return i < 0 ? 0 : i;
}

/**
 * Roll a settlement's three pairs. Returns one entry per band carrying the
 * chosen good and quality rows themselves, so a caller can print any column of
 * either without re-looking-up.
 */
export function rollLocalValueFluctuations()
{
  const goodsTaken = new Set(), qualitiesTaken = new Set();
  return FLUCTUATION_BANDS.map(band =>
  {
    const goodRoll = d(100), qualityRoll = d(20);
    return {
      ...band,
      goodRoll,
      qualityRoll,
      good: nextUnused(TRADE_GOODS, goodIndexOf(goodRoll), goodsTaken),
      quality: nextUnused(TRADE_GOOD_QUALITIES, qualityRoll - 1, qualitiesTaken)
    };
  });
}

/**
 * The GM-facing block. Both rolls are shown next to their result, because the
 * repeat-results rule means a printed name often is NOT the row the die landed
 * on, and a Referee who cannot see that reads the generator as buggy.
 */
export function fluctuationHtml(bands = rollLocalValueFluctuations())
{
  const step = " <i>(repeat, stepped down)</i>";
  const rows = bands.map(b =>
  {
    // Annotated PER AXIS rather than per row: a row where only the quality
    // repeated would otherwise read as though the good had moved too, and the
    // whole reason for printing the dice is to account for a name that is not
    // the one the die landed on.
    const goodStepped = b.goodRoll < b.good.range[0] || b.goodRoll > b.good.range[1];
    const qualityStepped = b.quality.roll !== b.qualityRoll;
    return `<p><b>${b.label}:</b> ${b.good.name} / ${b.quality.name} <i>(${b.effect})</i>`
         + `<br><span style="opacity:0.7">d100 ${b.goodRoll} → ${b.good.name}${goodStepped ? step : ""}`
         + `, d20 ${b.qualityRoll} → ${b.quality.name}${qualityStepped ? step : ""}</span></p>`;
  });
  return `<p><b>Local Value Fluctuations</b></p>${rows.join("")}`
       + `<p style="opacity:0.7"><i>Local modifiers override generic modifiers: a settlement that`
       + ` prizes Infected goods trades for them at x2 the base value, and one that despises`
       + ` Masterwork items will not trade for them at all. Apply these yourself — the value on an`
       + ` item's sheet stays the base.</i></p>`;
}
