/**
 * Walking the weather hex-chart — foundry-system-index.csv "Weather Procedure".
 *
 * The whole of this file is pure: no `game`, no Foundry, no world state. That
 * is deliberate and it is what tools/test-weather-chart.mjs drives, the same
 * move item-slots.js made so the slot rules could be tested without a world.
 * weather.js holds everything that touches Foundry.
 *
 * THE BOARD. A radius-3 hexagon of flat-top hexes — seven columns of
 * 4/5/6/7/6/5/4, which is 37, the third centred hexagonal number. Axial
 * coordinates, `q` the column offset from centre and `r` the row, so the
 * board is every (q,r) with |q|, |r| and |q+r| all at most 3.
 *
 * WRAPPING IS BY LANE. RULED 2026-09-12 (Matt), after the alternative was
 * put beside it. The book says only "if the marker moves off the edge of the
 * chart, it should wrap around onto the opposite side", and that is genuinely
 * under-specified here: the board's top is a VERTEX, not a side, so the six
 * directions sit thirty degrees off the six sides and no direction has an
 * obvious opposite side to land on.
 *
 * Each direction cuts the board into seven parallel lanes, again 4/5/6/7/6/5/4
 * long. Step off the end of your lane and you re-enter at the other end of
 * that same lane. So rolling a 2 off the top Rain hex puts the marker on the
 * bottom Prismatic Tempest hex, which is what anybody sliding a counter across
 * a printed page would do.
 *
 * The rejected alternative was a true torus — treat the 37 hexes as one tile
 * of an infinite tiling, which is mathematically the cleaner object and makes
 * every direction a bijection even before the X edges. It loses because it is
 * skewed: rolling a 2 off the top hex lands in the bottom-LEFT corner. Nobody
 * reading the book would guess that, and the one case a Referee would check by
 * hand is exactly the one it gets wrong.
 *
 * AN X SEALS ITS EDGE IN BOTH DIRECTIONS, which is the book's own wording —
 * "the marker cannot cross these edges" — rather than "cannot leave by them".
 * This matters, and it was not obvious: four lanes on the NW/SE axis carry an
 * X at one end only, so a one-way reading would let the marker wrap IN through
 * a sealed edge it could not have left by. Reading the sentence as written
 * removes that with no special case. Either way the marker "stays put for that
 * day", so the weather repeats.
 */

import { WEATHER_CHART, WEATHER_TYPES, DIRECTIONS, START_HEX } from "./weather-data.js";

export const RADIUS = 3;
export const HEX_COUNT = 3 * RADIUS * RADIUS + 3 * RADIUS + 1;   // 37

/* -------------------------------------------- */
/*  Coordinates                                                           */
/* -------------------------------------------- */

export const hexKey = (q, r) => `${q},${r}`;

/** Is this hex on the board? */
export function inBoard(q, r)
{
  return Math.abs(q) <= RADIUS && Math.abs(r) <= RADIUS && Math.abs(q + r) <= RADIUS;
}

/** The opposite of a direction index, so 0..5 maps NW<->SE, N<->S, NE<->SW. */
export const opposite = d => (d + 3) % 6;

/**
 * The rows a column holds. Column `q` runs from this `lo` to `hi` inclusive,
 * which is what makes the seven columns 4/5/6/7/6/5/4 rather than all seven.
 */
function rowRange(q)
{
  return { lo: Math.max(-RADIUS, -RADIUS - q), hi: Math.min(RADIUS, RADIUS - q) };
}

/** Every hex, in transcription order: column 1 to 7, each top to bottom. */
export function allHexes()
{
  const out = [];
  for (let q = -RADIUS; q <= RADIUS; q++)
  {
    const { lo, hi } = rowRange(q);
    for (let r = lo; r <= hi; r++)
      out.push({ q, r, col: q + RADIUS + 1, row: r - lo + 1 });
  }
  return out;
}

/** Transcription coordinates to axial. Column and row are both 1-based. */
export function fromColRow(col, row)
{
  const q = col - RADIUS - 1;
  return { q, r: rowRange(q).lo + row - 1 };
}

/* -------------------------------------------- */
/*  The chart, expanded once from the transcription                       */
/* -------------------------------------------- */

/** hexKey -> type index 0..7 */
const FILLS = new Map();
/** `${hexKey},${dirIndex}` for every impassable edge. */
const BLOCKED = new Set();

(function expand()
{
  const cols = WEATHER_CHART.cols.split("|");
  if (cols.length !== 2 * RADIUS + 1)
    throw new Error(`Weather chart: expected ${2 * RADIUS + 1} columns, got ${cols.length}.`);

  cols.forEach((digits, i) =>
  {
    const q = i - RADIUS;
    const { lo, hi } = rowRange(q);
    const want = hi - lo + 1;
    if (digits.length !== want)
      throw new Error(`Weather chart: column ${i + 1} holds ${digits.length} hexes, expected ${want}.`);
    [...digits].forEach((ch, j) =>
    {
      const n = Number(ch);
      if (!(n >= 1 && n <= WEATHER_TYPES.length))
        throw new Error(`Weather chart: column ${i + 1} hex ${j + 1} reads "${ch}".`);
      FILLS.set(hexKey(q, lo + j), n - 1);
    });
  });

  for (const entry of WEATHER_CHART.x.split(",").filter(Boolean))
  {
    const m = /^(\d+)\.(\d+):([1-6])$/.exec(entry.trim());
    if (!m) throw new Error(`Weather chart: cannot read X edge "${entry}".`);
    const { q, r } = fromColRow(Number(m[1]), Number(m[2]));
    const d = Number(m[3]) - 1;
    if (!inBoard(q, r))
      throw new Error(`Weather chart: X edge "${entry}" names no hex on the board.`);
    if (inBoard(q + DIRECTIONS[d].q, r + DIRECTIONS[d].r))
      throw new Error(`Weather chart: X edge "${entry}" is an interior edge.`);
    BLOCKED.add(`${hexKey(q, r)},${d}`);
  }
})();

/** The weather type at a hex, as its WEATHER_TYPES entry. */
export function typeAt(q, r)
{
  const i = FILLS.get(hexKey(q, r));
  if (i === undefined) throw new Error(`Weather chart: no hex at ${q},${r}.`);
  return WEATHER_TYPES[i];
}

/** Is this hex's edge in direction `d` marked with an X? */
export function isSealed(q, r, d)
{
  return BLOCKED.has(`${hexKey(q, r)},${d}`);
}

/** Every impassable edge, as `{ q, r, d }`. */
export function sealedEdges()
{
  return [...BLOCKED].map(s =>
  {
    const [q, r, d] = s.split(",").map(Number);
    return { q, r, d };
  });
}

/* -------------------------------------------- */
/*  The walk                                                              */
/* -------------------------------------------- */

/**
 * The far end of the lane through this hex, against direction `d` — i.e. the
 * hex a marker wraps ONTO when it leaves by `d`. Walk backwards until the next
 * step would leave the board; that last hex is the lane's other end.
 */
export function laneEnd(q, r, d)
{
  const back = DIRECTIONS[opposite(d)];
  let cq = q, cr = r;
  while (inBoard(cq + back.q, cr + back.r)) { cq += back.q; cr += back.r; }
  return { q: cq, r: cr };
}

/**
 * One day's move. `d` is the direction index, so a d6 of 1 is `d = 0`.
 *
 * Returns the hex the marker ends on and how it got there:
 *   "step"    — an ordinary move to a neighbouring hex
 *   "wrap"    — off the end of the lane and back on at the other end
 *   "sealed"  — an X, so the marker stays put and the weather repeats
 */
export function step(q, r, d)
{
  const dir = DIRECTIONS[d];
  const nq = q + dir.q, nr = r + dir.r;

  if (inBoard(nq, nr)) return { q: nq, r: nr, how: "step" };
  if (isSealed(q, r, d)) return { q, r, how: "sealed" };

  // Coming back on at the far end means crossing THAT hex's outward edge,
  // inwards. An X there stops the marker just as its own edge would.
  const far = laneEnd(q, r, d);
  if (isSealed(far.q, far.r, opposite(d))) return { q, r, how: "sealed" };
  return { q: far.q, r: far.r, how: "wrap" };
}

/** All 37 x 6 moves, keyed by hex, for the whole-table readouts. */
export function transitions()
{
  return allHexes().map(h => ({
    ...h,
    type: typeAt(h.q, h.r),
    moves: DIRECTIONS.map((dir, d) =>
    {
      const to = step(h.q, h.r, d);
      return { roll: dir.roll, dir, to, type: typeAt(to.q, to.r), how: to.how };
    })
  }));
}

/* -------------------------------------------- */
/*  Readouts                                                              */
/* -------------------------------------------- */

/**
 * Faces of one weather type that physically touch each other type, plus the
 * faces running off the chart. This is the tally that can be checked against
 * the printed page by eye, and it is how this transcription was verified —
 * see the header of weather-data.js.
 *
 * It is NOT where the marker goes: an off-chart face is where wrapping takes
 * over. `outlook` below answers that question instead.
 */
export function adjacency(typeIndex)
{
  const faces = new Array(WEATHER_TYPES.length).fill(0);
  let offChart = 0, hexes = 0;

  for (const h of allHexes())
  {
    if (FILLS.get(hexKey(h.q, h.r)) !== typeIndex) continue;
    hexes++;
    for (const dir of DIRECTIONS)
    {
      const nq = h.q + dir.q, nr = h.r + dir.r;
      if (!inBoard(nq, nr)) { offChart++; continue; }
      faces[FILLS.get(hexKey(nq, nr))]++;
    }
  }
  return { hexes, faces, offChart, total: faces.reduce((a, b) => a + b, 0) + offChart };
}

/**
 * What tomorrow looks like from one hex: the six rolls grouped by the weather
 * they land on. Six outcomes, so the count IS the odds out of six.
 *
 * THIS IS DERIVED FROM THE WALK, NEVER STORED. Matt proposed the aggregate
 * form of it — tally every face of every Still hex and roll on the result —
 * as a possible replacement for tracking the marker at all. It was declined as
 * the MECHANISM, because it needs the whole chart to derive and then throws
 * away where on the chart you are, so every Still day becomes the same Still
 * day. Kept as a READOUT, where it costs nothing and cannot drift: if it ever
 * disagrees with the walk, one of them is broken.
 */
export function outlook(q, r)
{
  const out = new Map();
  DIRECTIONS.forEach((dir, d) =>
  {
    const to = step(q, r, d);
    const t = typeAt(to.q, to.r);
    if (!out.has(t.key)) out.set(t.key, { type: t, rolls: [], stays: 0 });
    const e = out.get(t.key);
    e.rolls.push(dir.roll);
    if (to.how === "sealed") e.stays++;
  });
  return [...out.values()].sort((a, b) => b.rolls.length - a.rolls.length);
}

export { WEATHER_TYPES, DIRECTIONS, START_HEX };
