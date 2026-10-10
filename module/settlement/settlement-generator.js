/**
 * Settlement Creation (foundry-system-index.csv row of that name) - the generator core, chunk 1 of the build
 * plan (RULED 2026-10-08, Matt). Ported from the Settlement Lab (claude.ai/artifact/8coGshHpWiXh5vJHn54jAo,
 * version 14), whose rules are the row's rulings:
 *
 *   THE BOOK (Settlements.md, Mapping a Settlement, JADE IBIS): a d20 and a d8 dropped on the sheet are the seat
 *   of power and the water source, joined by a major road; a light d20, a dark d20 and 4d12 are the major asset,
 *   the major problem and notable buildings (a d12's type, then d20 on that type's column of Buildings); a d100
 *   is the landmark; minor roads join every building and asset to another; where roads cross is a gathering
 *   place; a wall surrounds it all. A larger settlement adds 2d20 assets and 6d12 buildings.
 *   RULED: each die's face is its table roll; the seat's d20 gives Government Type B and a second d20 Type A;
 *   the larger option is automatic for a Large Town or City-State; one road network; a minor road crosses the
 *   main road (or, where every location lies to one side, its nearest one meets it); the problem and the
 *   landmark are never on the roads; small dwellings by Size; the Scene fits the wall; Religious Reformation's
 *   second faith is re-rolled until it differs; every overview column is its own roll, Population on 2d6.
 *
 * generateSettlement rolls and places; layoutSettlement does everything that follows from where the locations
 * stand, from its own random stream, so a location the GM drags (the preview, chunk 5) changes the roads and the
 * wall but never a table roll. Pure: no Foundry, so it runs in Node for the test.
 */

import { rngFrom } from "../region/region-layout.js";
import { ROLLTABLES } from "../actor/rolltable-data.js";
import { SETTLEMENT_GROUPS } from "../actor/settlement-overview-data.js";
import { GOVERNMENT_DESCRIPTIONS, DWELLINGS, KINDS, SETTLEMENT_DEFAULTS, SHEET } from "./settlement-data.js";
import { nameSettlement } from "./settlement-names.js";

// ---- the book's tables, read from the module's own transcription ----
const table = name => { const t = ROLLTABLES.find(x => x.name === name); if(!t) throw new Error(`Settlement Creation: ${name} is missing from rolltable-data.js.`); return t; };
const fields = text => Object.fromEntries([...text.matchAll(/\*\*(.+?):\*\*\s*([^\n]*?)\s*(?=\n|$)/g)].map(m => [m[1], m[2].trim()]));
const rowsOf = name => table(name).results.map(r => fields(r.text));
export const WATER = rowsOf("Water Source & Complication");
export const GOVERNMENT = rowsOf("Government");
export const ASSETS = rowsOf("Settlement Assets");
export const PROBLEMS = rowsOf("Settlement Problems");
export const BUILDING_TYPES = table("Building Types").results.map(r => r.text.trim());
export const BUILDINGS = (() =>
{
  const out = {};
  for(const t of ["Abandoned, Residential & Artisanal", "Commercial, Religious & Cultural", "Criminal, Ancient & Agricultural", "Occult, Military & Government"])
    for(const r of table(t).results) for(const [k, v] of Object.entries(fields(r.text))) (out[k] ??= [])[r.range[0] - 1] = v;
  return out;
})();
const LANDMARKS = table("Landmark Table (d100)").results;
const landmarkAt = roll => LANDMARKS.find(e => roll >= e.range[0] && roll <= e.range[1]).text.trim();
const FAITHS = SETTLEMENT_GROUPS.find(g => g.cols[0] === "Dominant Faith").data["Dominant Faith"];
/** Religious Reformation, the one problem that rolls at creation (RULED). */
const REFORMATION = "Religious Reformation";

const die = (r, n) => 1 + Math.floor(r() * n);
const gauss = r => { let u = 0, v = 0; while(!u) u = r(); while(!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/** Every overview column but Water and Government, which come from the dropped dice; a group with `dice` rolls their sum. */
function rollOverview(r)
{
  const out = [];
  for(const g of SETTLEMENT_GROUPS)
  {
    if(g.cols.some(c => c === "Water Source" || c.startsWith("Government Type"))) continue;
    const n = g.data[g.cols[0]].length;
    let roll, idx, dieLabel;
    if(g.dice)
    {
      const [, count, faces] = /^(\d+)d(\d+)$/.exec(g.dice).map(Number);
      roll = 0; for(let i = 0; i < count; i++) roll += die(r, faces);
      idx = roll - count; dieLabel = g.dice;
    }
    else { roll = die(r, n); idx = roll - 1; dieLabel = `d${n}`; }
    out.push({ cols: g.cols.map(c => [c, g.data[c][idx]]), roll, die: dieLabel });
  }
  return out;
}

/** Small dwellings for a Size (RULED): a Boomtown is 10 doubled d4-1 times. */
export function dwellingsFor(size, r, scale = 1)
{
  const key = String(size).split(" (")[0];
  const n = key === "Boomtown" ? 10 * 2 ** (die(r, 4) - 1) : DWELLINGS[key];
  return Math.round(n * scale);
}

/**
 * Roll and place a settlement. `settings` are SETTLEMENT_DEFAULTS' keys; `opts.usedNames` is the world's (or a
 * region's) set of spent name keys; `opts.location` overrides the Location of Settlement (a region's section
 * Landscape, chunk 7); `opts.moves` maps a location id to the [x, y] the GM dragged it to.
 */
export function generateSettlement(settings = {}, opts = {})
{
  const s = { ...SETTLEMENT_DEFAULTS, ...settings };
  const rt = rngFrom(s.seed + "|tables"), rp = rngFrom(s.seed + "|place");
  const W = SHEET.width, H = SHEET.height, M = Math.min(W, H);
  const overview = rollOverview(rt);
  const values = Object.fromEntries(overview.flatMap(g => g.cols));
  // a region's Settlement takes its Location from its section's Landscape (RULED): in the overview its pages print,
  // not only in the values its name is built from (found 2026-10-08: the pages printed the d20's roll)
  if(opts.location)
  {
    values["Location of Settlement"] = opts.location;
    const o = overview.find(x => x.cols[0][0] === "Location of Settlement");
    if(o) Object.assign(o, { cols: [["Location of Settlement", opts.location]], roll: null, die: "the section's Landscape" });
  }
  const size = values["Size"];
  const larger = s.larger === "yes" || (s.larger === "size" && /^(Large Town|City-State)/.test(size));

  // the dice, in the book's three handfuls
  const handfuls = [["seat", "water"], ["asset", "problem", "building", "building", "building", "building",
    ...(larger ? ["asset", "asset", "building", "building", "building", "building", "building", "building"] : [])], ["landmark"]];
  const locations = [], margin = M * 0.07, minGap = M * s.gap;
  for(const hand of handfuls)
  {
    const cx = W/2 + gauss(rp) * W * 0.08, cy = H/2 + gauss(rp) * H * 0.08;
    for(const kind of hand)
    {
      let x, y, tries = 0;
      do
      {
        if(s.drop === "scatter") { x = margin + rp() * (W - 2*margin); y = margin + rp() * (H - 2*margin); }
        else { x = cx + gauss(rp) * M * s.spread; y = cy + gauss(rp) * M * s.spread; }
        x = Math.max(margin, Math.min(W - margin, x)); y = Math.max(margin, Math.min(H - margin, y));
        tries++;
      } while(tries < 60 && locations.some(d => Math.hypot(d.x - x, d.y - y) < minGap));
      locations.push({ kind, x, y, id: kind + locations.filter(d => d.kind === kind).length });
    }
  }

  // each die's face is its table roll (RULED)
  for(const d of locations)
  {
    d.roll = die(rt, KINDS[d.kind].die);
    d.label = KINDS[d.kind].label;
    if(d.kind === "seat")
    {
      d.rollA = die(rt, 20);
      const b = GOVERNMENT[d.roll - 1]["Government Type B"], a = GOVERNMENT[d.rollA - 1]["Government Type A"];
      Object.assign(d, { name: `${a} ${b}`, typeA: a, typeB: b, desc: GOVERNMENT_DESCRIPTIONS[b] });
    }
    if(d.kind === "water") { const w = WATER[d.roll - 1]; Object.assign(d, { name: w["Water Source"], complication: w["Complication"] }); }
    if(d.kind === "asset") { const a = ASSETS[d.roll - 1]; Object.assign(d, { name: a.Name, desc: a.Description }); }
    if(d.kind === "problem") { const p = PROBLEMS[d.roll - 1]; Object.assign(d, { name: p.Name, desc: p.Description }); }
    if(d.kind === "building")
    {
      const type = BUILDING_TYPES[d.roll - 1];
      d.type = type; d.rollB = die(rt, 20);
      d.name = BUILDINGS[type.replace(/ Building$/, "")][d.rollB - 1];
    }
    if(d.kind === "landmark") d.name = landmarkAt(d.roll);
  }

  // Religious Reformation: the upstart faith, re-rolled until it differs from the dominant one (RULED)
  let reformation = null;
  if(locations.some(d => d.kind === "problem" && d.name === REFORMATION))
  {
    let faith;
    do faith = FAITHS[die(rt, FAITHS.length) - 1]; while(faith === values["Dominant Faith"]);
    reformation = faith;
  }

  const named = nameSettlement(values, rngFrom(s.seed + "|name"), opts.usedNames ?? new Set());
  const g = { settings: s, name: named.name, nameStyle: named.style, nameKey: named.key, founder: named.founder,
    overview, values, size, larger, locations, reformation, sheet: { width: W, height: H },
    dwellingTarget: dwellingsFor(size, rngFrom(s.seed + "|boom"), s.dwellingScale) };
  layoutSettlement(g, opts.moves);
  return g;
}

/**
 * Everything that follows from where the locations stand: roads, crossings, gathering places, the wall,
 * dwellings and the Scene's bounds. Its own random stream, so a moved location never changes a table roll.
 */
export function layoutSettlement(g, moves = null)
{
  const s = g.settings, rp = rngFrom(s.seed + "|layout"), M = Math.min(g.sheet.width, g.sheet.height);
  const L = g.locations;
  for(const d of L) { const m = moves?.get?.(d.id); if(m) { d.x = m[0]; d.y = m[1]; } }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // roads: the major road, then one network of minor roads over the assets and buildings
  const seat = L.find(d => d.kind === "seat"), water = L.find(d => d.kind === "water");
  const roads = [{ a: seat, b: water, major: true }];
  const net = L.filter(d => d.kind === "asset" || d.kind === "building" || (s.majorLink === "join" && (d === seat || d === water)));
  const key = (a, b) => [a.id, b.id].sort().join("~");
  const have = new Set([key(seat, water)]);
  const add = (a, b) => { const k = key(a, b); if(have.has(k)) return; have.add(k); roads.push({ a, b, major: false }); };
  if(s.network === "nearest")
    for(const a of net) { let best = null; for(const b of net) if(b !== a && (!best || dist(a, b) < dist(a, best))) best = b; if(best) add(a, best); }
  else if(net.length)
  {
    // Prim's tree; edges by length, never by a random comparator (a seed must grow the same town everywhere)
    const inT = new Set([net[0]]);
    while(inT.size < net.length)
    {
      let best = null;
      for(const a of inT) for(const b of net) if(!inT.has(b) && (!best || dist(a, b) < best.d)) best = { a, b, d: dist(a, b) };
      inT.add(best.b); add(best.a, best.b);
    }
    if(s.network === "loops")
    {
      const cand = [];
      for(let i = 0; i < net.length; i++) for(let j = i + 1; j < net.length; j++) if(!have.has(key(net[i], net[j]))) cand.push({ a: net[i], b: net[j], d: dist(net[i], net[j]) });
      cand.sort((p, q) => p.d - q.d || (p.a.id + p.b.id < q.a.id + q.b.id ? -1 : 1));
      let added = 0;
      for(const c of cand) { if(added >= s.loops || c.d > M * 0.45) break; add(c.a, c.b); added++; }
    }
  }
  // each road's bend, drawn per road in a fixed order
  const curveOf = rd =>
  {
    const mx = (rd.a.x + rd.b.x)/2, my = (rd.a.y + rd.b.y)/2, len = dist(rd.a, rd.b) || 1;
    const nx = -(rd.b.y - rd.a.y)/len, ny = (rd.b.x - rd.a.x)/len, off = (rp()*2 - 1) * len * s.curve;
    rd.cx = mx + nx*off; rd.cy = my + ny*off;
    rd.pts = []; for(let t = 0; t <= 1.0001; t += 1/24) { const u = 1 - t; rd.pts.push([u*u*rd.a.x + 2*u*t*rd.cx + t*t*rd.b.x, u*u*rd.a.y + 2*u*t*rd.cy + t*t*rd.b.y]); }
  };
  roads.forEach(curveOf);

  const segX = (p, q, r, t) =>
  {
    const d = (q[0]-p[0])*(t[1]-r[1]) - (q[1]-p[1])*(t[0]-r[0]);
    if(Math.abs(d) < 1e-9) return null;
    const a = ((r[0]-p[0])*(t[1]-r[1]) - (r[1]-p[1])*(t[0]-r[0]))/d, b = ((r[0]-p[0])*(q[1]-p[1]) - (r[1]-p[1])*(q[0]-p[0]))/d;
    return a > 0 && a < 1 && b > 0 && b < 1 ? [p[0] + a*(q[0]-p[0]), p[1] + a*(q[1]-p[1])] : null;
  };
  const major = roads[0], gathers = [];
  // a crossing counts only where it can be a gathering place: clear of every location, since a road meeting
  // another at a location is a shared end, not a crossing (found 2026-10-08: 72 of 600 towns had none without this)
  const clear = x => !L.some(d => Math.hypot(d.x - x[0], d.y - x[1]) < M*0.025);
  const crossesMajor = P => { for(let a = 0; a < P.length - 1; a++) for(let b = 0; b < major.pts.length - 1; b++) { const x = segX(P[a], P[a+1], major.pts[b], major.pts[b+1]); if(x && clear(x)) return true; } return false; };
  const straight = (a, b) => { const rd = { a, b, major: false, cx: (a.x + b.x)/2, cy: (a.y + b.y)/2, pts: [] }; for(let t = 0; t <= 1.0001; t += 1/24) rd.pts.push([a.x + (b.x - a.x)*t, a.y + (b.y - a.y)*t]); return rd; };
  // the main-road crossing (RULED): each joined set of locations that does not meet the main road gets its
  // shortest straight road across it; if none can cross, its nearest location meets the main road
  if(s.majorLink === "cross")
  {
    const islands = [], seen = new Set();
    for(const s0 of net)
    {
      if(seen.has(s0)) continue;
      const isl = [], st = [s0];
      while(st.length) { const x = st.pop(); if(seen.has(x)) continue; seen.add(x); isl.push(x); for(const r of roads) if(!r.major) { if(r.a === x) st.push(r.b); if(r.b === x) st.push(r.a); } }
      islands.push(isl);
    }
    for(const isl of islands)
    {
      if(roads.some(r => !r.major && isl.includes(r.a) && crossesMajor(r.pts))) continue;
      let best = null;
      for(const a of isl) for(const b of net) { if(a === b) continue; const len = dist(a, b); if(best && len >= best.len) continue; if(crossesMajor([[a.x, a.y], [b.x, b.y]])) best = { a, b, len }; }
      if(best) { const rd = straight(best.a, best.b); rd.crossing = true; roads.push(rd); continue; }
      let near = null;
      for(const a of isl) for(const p of major.pts) { const len = Math.hypot(a.x - p[0], a.y - p[1]); if(!near || len < near.len) near = { a, p, len }; }
      if(near) { const j = { x: near.p[0], y: near.p[1], id: "junction" + gathers.length, kind: "junction" }; roads.push(straight(near.a, j)); gathers.push({ x: j.x, y: j.y, how: "meets the main road" }); }
    }
  }
  // gathering places: where two roads cross, not where they share an end
  for(let i = 0; i < roads.length; i++) for(let j = i + 1; j < roads.length; j++)
  {
    const A = roads[i], B = roads[j];
    for(let a = 0; a < A.pts.length - 1; a++) for(let b = 0; b < B.pts.length - 1; b++)
    {
      const x = segX(A.pts[a], A.pts[a+1], B.pts[b], B.pts[b+1]);
      if(!x || L.some(d => Math.hypot(d.x - x[0], d.y - x[1]) < M*0.025)) continue;
      if(!gathers.some(gp => Math.hypot(gp.x - x[0], gp.y - x[1]) < M*0.03)) gathers.push({ x: x[0], y: x[1], how: "crossing" });
    }
  }

  // the wall, round every location with room inside
  const pad = M * s.wallPad, pts = [];
  for(const d of L) for(let k = 0; k < 12; k++) pts.push([d.x + Math.cos(k*Math.PI/6)*pad, d.y + Math.sin(k*Math.PI/6)*pad]);
  let wall;
  if(s.wall === "hug")
  {
    const cx = L.reduce((t, d) => t + d.x, 0)/L.length, cy = L.reduce((t, d) => t + d.y, 0)/L.length;
    const N = 72, rad = new Array(N).fill(0);
    for(const [x, y] of pts) { const a = Math.atan2(y - cy, x - cx); const k = ((Math.round(a / (2*Math.PI) * N) % N) + N) % N; rad[k] = Math.max(rad[k], Math.hypot(x - cx, y - cy)); }
    for(let pass = 0; pass < 3; pass++) for(let k = 0; k < N; k++) { const p = rad[(k+N-1)%N], n = rad[(k+1)%N]; rad[k] = Math.max(rad[k], (p + n)/2 * 0.92, Math.min(p, n)); }
    wall = chaikin(rad.map((r, k) => [cx + Math.cos(k/N*2*Math.PI)*r, cy + Math.sin(k/N*2*Math.PI)*r]), 2);
  }
  else { wall = hull(pts); if(s.wall === "round") wall = chaikin(wall, 3); }
  const wallLength = wall.reduce((t, p, i) => t + Math.hypot(p[0] - wall[(i+1)%wall.length][0], p[1] - wall[(i+1)%wall.length][1]), 0);

  // step 7: small dwellings beside the roads, inside the wall
  const dwellings = [];
  for(let i = 0, tries = 0; i < g.dwellingTarget && tries < g.dwellingTarget * 40; tries++)
  {
    const rd = roads[Math.floor(rp() * roads.length)], p = rd.pts[Math.floor(rp() * rd.pts.length)];
    const ang = rp() * Math.PI * 2, rr = M * (0.018 + rp() * 0.03);
    const x = p[0] + Math.cos(ang)*rr, y = p[1] + Math.sin(ang)*rr;
    if(!inside(wall, x, y) || L.some(d => Math.hypot(d.x - x, d.y - y) < M*0.03) || dwellings.some(w => Math.hypot(w.x - x, w.y - y) < M*0.014)
      || roads.some(r2 => r2.pts.some(q => Math.hypot(q[0] - x, q[1] - y) < M*0.009))) continue;
    dwellings.push({ x, y, rot: rp()*Math.PI, size: M*(0.006 + rp()*0.005) }); i++;
  }

  // the Scene fits the wall and every location (RULED), with a margin
  const xs = [...wall.map(p => p[0]), ...L.map(d => d.x)], ys = [...wall.map(p => p[1]), ...L.map(d => d.y)], m = M * 0.05;
  const x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m;
  Object.assign(g, { roads, gathers, wall, wallLength, dwellings, bounds: { x: x0, y: y0, width: Math.max(...xs) + m - x0, height: Math.max(...ys) + m - y0 } });
  return g;
}

function hull(P)
{
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lo = [], up = [];
  for(const q of p) { while(lo.length >= 2 && cr(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); }
  for(const q of p.reverse()) { while(up.length >= 2 && cr(up[up.length-2], up[up.length-1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function chaikin(P, n)
{
  for(let k = 0; k < n; k++) { const Q = []; for(let i = 0; i < P.length; i++) { const a = P[i], b = P[(i+1)%P.length]; Q.push([a[0]*.75 + b[0]*.25, a[1]*.75 + b[1]*.25], [a[0]*.25 + b[0]*.75, a[1]*.25 + b[1]*.75]); } P = Q; }
  return P;
}
export function inside(poly, x, y)
{
  let c = false;
  for(let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) c = !c; }
  return c;
}
