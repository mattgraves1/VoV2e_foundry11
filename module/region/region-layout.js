/**
 * Region Generator (foundry-system-index.csv row of that name) - the layout.
 *
 * Grows a region from a region code: its locations on a hex grid of one hex
 * per day's travel, the routes joining them, the sections it is divided into
 * with each section's Landscape, Region Named For and landmark, each section's
 * territory, and the relief that shades the ground. Names, journal pages and
 * the Scene are made from this afterwards; nothing here touches Foundry.
 *
 * The rules were found with Matt in the Vaarn Region Lab artifact
 * (claude.ai/artifact/FnjEk7Qo2fgPDQ7DCyMhh4) and every one is ruled on the
 * row. This is a port of the lab's generator with its comparison-only options
 * and its several-regions mode left out (several regions belong to the World
 * Map row). tools/test-region-layout.mjs holds it to regions captured from the
 * lab before the port (tools/region-lab/), so a seed grows the same region in
 * the lab and in Foundry. A change that grows any existing code differently
 * must bump CODE_VERSION.
 *
 * Never draw a random number inside a sort comparator: how many comparisons a
 * sort makes is a JavaScript engine detail, and a seed would then grow a
 * different region on another browser or Foundry version (found in the lab,
 * 2026-10-03). Tie-breaks are drawn per candidate before the sort.
 */

import { TYPES, LANDSCAPES, NAMED_FOR, HAZARDS, LANDMARKS } from "./region-data.js";

export const CODE_VERSION = "r1";

// ---- seeded random numbers (the lab's, so a seed grows the same region) ----
export function hashSeed(s)
{
  let h = 2166136261 >>> 0;
  for(const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rngFrom(seed)
{
  let a = hashSeed(seed);
  return () =>
  {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- hex maths (axial, pointy-top; rows run east-west) ----
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const key = (q, r) => q + "," + r;
export const hdist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
export function cubeRound(x, y, z)
{
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
  if(dx > dy && dx > dz) rx = -ry - rz;
  else if(dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}
function hexLine(a, b)
{
  const n = hdist(a, b), out = [];
  for(let i = 0; i <= n; i++)
  {
    const t = n ? i / n : 0;
    const ax = a.q, az = a.r, ay = -ax - az, bx = b.q, bz = b.r, by = -bx - bz;
    out.push(cubeRound(ax + (bx - ax) * t + 1e-6, ay + (by - ay) * t + 2e-6, az + (bz - az) * t - 3e-6));
  }
  return out;
}
export function dirOf(from, to)
{
  for(let i = 0; i < 6; i++) if(from.q + DIRS[i][0] === to.q && from.r + DIRS[i][1] === to.r) return i;
  return -1;
}
const nbrs = t => DIRS.map(([dq, dr]) => ({ q: t.q + dq, r: t.r + dr }));
const hxX = t => t.q + t.r / 2, hxY = t => t.r * 0.866;

// ---- settings and the region code ----

/**
 * Every setting, in code order. `c` is its letter in a region code. The
 * defaults are the generator's, ruled by Matt 2026-10-03 (his rust-5754
 * settings, about six locations, territory reach 7, landmarks on).
 */
export const SETTINGS = [
  { key: "count",         c: "n",  kind: "int",  min: 5, max: 100, def: 6 },
  { key: "starts",        c: "st", kind: "int",  min: 1, max: 5,   def: 1 },
  { key: "startSpacing",  c: "sp", kind: "int",  min: 6, max: 30,  def: 13 },
  { key: "connect",       c: "cn", kind: "pick", options: ["both", "toward", "stitch"], def: "both" },
  { key: "budget",        c: "bu", kind: "bool", def: true },
  { key: "firstPaths",    c: "fp", kind: "pick", options: ["2-3", "2-2", "3-3", "3-4"], def: "2-3" },
  { key: "laterPaths",    c: "lp", kind: "pick", options: ["1-2", "1-1", "2-2", "1-3"], def: "1-2" },
  { key: "w",             c: "w",  kind: "weights", def: [3, 2, 1] },
  { key: "join",          c: "j",  kind: "bool", def: true },
  { key: "closeJoins",    c: "cj", kind: "bool", def: true },
  { key: "lonerReach",    c: "lr", kind: "int",  min: 0, max: 18,  def: 6 },
  { key: "gap",           c: "g",  kind: "int",  min: 0, max: 3,   def: 1 },
  { key: "minVaults",     c: "mv", kind: "int",  min: 0, max: 8,   def: 0 },
  { key: "startVault",    c: "sv", kind: "pick", options: ["first", "all", "none"], def: "first" },
  { key: "maxVaultDays",  c: "vd", kind: "int",  min: 0, max: 40,  def: 0 },
  { key: "spread",        c: "ss", kind: "bool", def: true },
  { key: "vaultLinks",    c: "vl", kind: "pick", options: ["2-3", "2-2", "3-3", "1-2"], def: "2-3" },
  { key: "variety",       c: "va", kind: "pick", options: ["off", "parent", "near"], def: "near" },
  { key: "varietyReach",  c: "vr", kind: "int",  min: 2, max: 12,  def: 10 },
  { key: "hazRule",       c: "hz", kind: "pick", options: ["mixed", "odd"], def: "mixed" },
  { key: "secMethod",     c: "sm", kind: "pick", options: ["routes", "voronoi", "wedges", "none"], def: "routes" },
  { key: "secSize",       c: "sz", kind: "int",  min: 3, max: 12,  def: 6 },
  { key: "mergeSmall",    c: "mg", kind: "bool", def: true },
  { key: "terr",          c: "t",  kind: "int",  min: 0, max: 12,  def: 7 },
  { key: "landmarks",     c: "lm", kind: "bool", def: true },
  { key: "landmarkVariety", c: "lv", kind: "bool", def: true },
  { key: "hexPx",         c: "px", kind: "pick", options: [50, 70, 100], def: 100 },
  { key: "margin",        c: "m",  kind: "int",  min: 0, max: 6,   def: 2 }
];

export const DEFAULT_SETTINGS = Object.freeze(Object.fromEntries([...SETTINGS.map(s => [s.key, s.def]), ["seed", "-"]]));

export function formatRegionCode(s)
{
  const val = (d, v) => d.kind === "bool" ? +v : d.kind === "weights" ? v.join("/") : v;
  return [CODE_VERSION, ...SETTINGS.map(d => `${d.c}=${val(d, s[d.key])}`), `seed=${s.seed}`].join(";");
}

// Throws an Error whose message says what is wrong with the code, in words a Referee can act on.
export function parseRegionCode(text)
{
  text = String(text).trim();
  const si = text.indexOf(";seed=");
  if(!text.startsWith(CODE_VERSION + ";") || si < 0)
    throw new Error(`That isn't a region code. A code starts with ${CODE_VERSION}; and ends with seed= and the seed.`);
  const seed = text.slice(si + 6);
  if(!seed) throw new Error("The code has no seed after seed=.");
  const kv = Object.fromEntries(text.slice(CODE_VERSION.length + 1, si).split(";").map(p => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
  const missing = SETTINGS.filter(d => !(d.c in kv)).map(d => d.c);
  if(missing.length) throw new Error(`The code is missing ${missing.join(", ")}. It may have been cut off when copied.`);
  const s = { seed };
  for(const d of SETTINGS)
  {
    const v = kv[d.c];
    if(d.kind === "bool")
    {
      if(v !== "0" && v !== "1") throw new Error(`The code's ${d.c} (${v}) should be 0 or 1.`);
      s[d.key] = v === "1";
    }
    else if(d.kind === "int")
    {
      const n = Number(v);
      if(!Number.isInteger(n) || n < d.min || n > d.max) throw new Error(`The code's ${d.c} (${v}) is outside ${d.min}–${d.max}.`);
      s[d.key] = n;
    }
    else if(d.kind === "weights")
    {
      const w = v.split("/").map(Number);
      if(w.length !== 3 || w.some(x => !Number.isInteger(x) || x < 0 || x > 10)) throw new Error(`The code's ${d.c} (${v}) should be three weights from 0 to 10, like 3/2/1.`);
      s[d.key] = w;
    }
    else
    {
      const o = d.options.find(x => String(x) === v);
      if(o === undefined) throw new Error(`The code's ${d.c} (${v}) should be one of ${d.options.join(", ")}.`);
      s[d.key] = o;
    }
  }
  return s;
}

const SEED_WORDS = ["blue", "salt", "glass", "ruin", "mesa", "worm", "sky", "dust", "rust", "vault", "oasis", "ghost"];
export function newSeed(random = Math.random)
{
  return SEED_WORDS[Math.floor(random() * SEED_WORDS.length)] + "-" + Math.floor(random() * 9000 + 1000);
}

/** A Scene of this many pixels a side is the largest Foundry draws safely. */
export const SCENE_LIMIT = 8192;

// ---- the generator ----

/**
 * Grow a region. `settings` is a parsed region code (or DEFAULT_SETTINGS with
 * a seed). Returns the region: locs, routes, sections, territory hexes, relief,
 * the Scene's size in hexes and pixels, and counters for the preview's stats.
 */
export function generateRegion(settings)
{
  const S = { ...DEFAULT_SETTINGS, ...settings };
  const rnd = rngFrom(S.seed);
  const d = n => 1 + Math.floor(rnd() * n);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const shuffle = arr => { for(let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const range = s => { const [a, b] = s.split("-").map(Number); return a + Math.floor(rnd() * (b - a + 1)); };

  const W = { locs: [], routes: [], at: new Map(), routeHex: new Set(), sections: [], parent: [], queue: [],
    failed: 0, stalled: 0, vaultsPlaced: 0, vaultFail: 0, loners: 0, rerolls: 0, stitched: 0, unstitched: 0 };
  {
    const P = S.hexPx, cols = Math.floor(SCENE_LIMIT / P - 0.5), rows = Math.floor((SCENE_LIMIT - 1.155 * P) / (0.866 * P)) + 1;
    W.budgetBox = { hc: (cols - 1) / 2 - S.margin, hr: (rows - 1) / 2 - S.margin };
  }
  const locAt = h => W.at.get(key(h.q, h.r));
  const linked = (a, b) => a.links.has(b.id);
  const gapOk = (h, except) => { const need = S.gap + 1; for(const l of W.locs) { if(l === except) continue; if(hdist(l, h) < need) return false; } return true; };
  const find = i => { while(W.parent[i] !== i) { W.parent[i] = W.parent[W.parent[i]]; i = W.parent[i]; } return i; };
  const groupCount = () => new Set(W.locs.map(l => find(l.id))).size;
  const nearestOtherGroup = L => { let best = null, bd = 1e9; const g = find(L.id); for(const T of W.locs) { if(find(T.id) === g) continue; const dd = hdist(L, T); if(dd < bd) { bd = dd; best = T; } } return best; };

  // The size budget: a box one Foundry scene big, centred on the region's centre.
  const inBudget = h =>
  {
    if(!S.budget) return true;
    const b = W.budgetBox, x = (h.q + h.r / 2) - (W.centre.q + W.centre.r / 2), y = h.r - W.centre.r;
    return Math.abs(x) <= b.hc && Math.abs(y) <= b.hr;
  };

  function addLoc(h, given)
  {
    const roll = given || d(20);
    const L = { id: W.locs.length, q: h.q, r: h.r, roll, type: TYPES[roll - 1], faces: new Set(), links: new Set(), section: -1, adj: [], vd: roll === 4 ? 0 : Infinity };
    W.locs.push(L); W.at.set(key(h.q, h.r), L); W.parent[L.id] = L.id;
    return L;
  }
  // Pass shorter trips to a vault along the routes, from the given locations outward.
  function relax(start)
  {
    const q = [...start];
    while(q.length) { const x = q.shift(); for(const [id, w] of x.adj) { const y = W.locs[id]; if(x.vd + w < y.vd) { y.vd = x.vd + w; q.push(y); } } }
  }
  function addRoute(a, b, hexes, rolled, dice, kind)
  {
    // Hazards (RULED 2026-10-03): a route joining an even and an odd location.
    const hazardous = S.hazRule === "mixed" ? (a.roll % 2) !== (b.roll % 2) : (a.roll % 2 === 1 && b.roll % 2 === 1);
    const hr = hazardous ? d(20) : 0;
    const R = { id: W.routes.length, a: a.id, b: b.id, hexes, days: hexes.length - 1, rolled, dice, kind, hazard: hr ? HAZARDS[hr - 1] : null, hazardRoll: hr };
    W.routes.push(R); a.links.add(b.id); b.links.add(a.id);
    for(let i = 1; i < hexes.length - 1; i++) W.routeHex.add(key(hexes[i].q, hexes[i].r));
    a.adj.push([b.id, R.days]); b.adj.push([a.id, R.days]); relax([a, b]); W.parent[find(a.id)] = find(b.id);
    const fa = dirOf(hexes[0], hexes[1]); if(fa >= 0) a.faces.add(fa);
    const n = hexes.length, fb = dirOf(hexes[n - 1], hexes[n - 2]); if(fb >= 0) b.faces.add(fb);
    return R;
  }
  // Variety: re-roll a new location's d20 while its type repeats the location it grew from, or any
  // location within varietyReach hexes. Forced vaults (start, limit, placed) are never re-rolled.
  function rollVariety(parent, h)
  {
    const banned = new Set();
    if(S.variety === "parent") banned.add(parent.type);
    else if(S.variety === "near") { banned.add(parent.type); for(const l of W.locs) if(hdist(l, h) <= S.varietyReach) banned.add(l.type); }
    let roll = d(20);
    for(let i = 0; i < 30 && banned.size < 20 && banned.has(TYPES[roll - 1]); i++) { roll = d(20); W.rerolls++; }
    return roll;
  }
  // A path's length: 1d6, 2d6 or 3d6 days, weighted (RULED 3:2:1).
  function rollLength()
  {
    const w = S.w.reduce((a, b) => a + b, 0) ? S.w : [1, 1, 1], t = w[0] + w[1] + w[2];
    const x = rnd() * t;
    let dice = 1;
    if(x >= w[0]) dice = x < w[0] + w[1] ? 2 : 3;
    let n = 0;
    for(let i = 0; i < dice; i++) n += d(6);
    return { n, dice };
  }
  function tryJoin(L, n)
  {
    const cands = W.locs.filter(T => T !== L && !linked(L, T) && hdist(L, T) <= n && hdist(L, T) >= 1);
    const tie = new Map(cands.map(T => [T.id, rnd()]));
    cands.sort((x, y) => hdist(L, x) - hdist(L, y) || tie.get(x.id) - tie.get(y.id));
    for(const T of cands)
    {
      const line = hexLine(L, T);
      const f = dirOf(line[0], line[1]); if(f < 0 || L.faces.has(f)) continue;
      const b = dirOf(line[line.length - 1], line[line.length - 2]); if(b < 0 || T.faces.has(b)) continue;
      let ok = true;
      for(let i = 1; i < line.length - 1; i++) { const h = line[i]; if(locAt(h) || W.routeHex.has(key(h.q, h.r))) { ok = false; break; } }
      if(ok) return { target: T, hexes: line };
    }
    return null;
  }
  function tryStraight(L, f, n, allowNew)
  {
    const hexes = [{ q: L.q, r: L.r }];
    let h = { q: L.q, r: L.r };
    for(let k = 1; k <= n; k++)
    {
      h = { q: h.q + DIRS[f][0], r: h.r + DIRS[f][1] }; hexes.push(h);
      const T = locAt(h);
      if(T)
      { // runs straight unless there is a location along the path: it stops there
        if(T === L || linked(L, T)) return null;
        const b = dirOf(h, hexes[hexes.length - 2]); if(T.faces.has(b)) return null;
        return { target: T, hexes };
      }
      if(W.routeHex.has(key(h.q, h.r))) return null;    // paths never cross
    }
    if(!allowNew) return null;
    if(!gapOk(h)) return null;                           // keep the empty hexes
    if(!inBudget(h)) return null;                        // stay inside one scene
    return { newAt: h, hexes };
  }
  function expand(L, paths, allowNew)
  {
    for(let i = 0; i < paths; i++)
    {
      const { n, dice } = rollLength();
      if(S.join && !L.isStart)
      {
        const j = tryJoin(L, n);
        if(j) { addRoute(L, j.target, j.hexes, n, dice, "join"); continue; }
      }
      const canNew = allowNew && W.locs.length < S.count;
      let done = false;
      const faces = shuffle([0, 1, 2, 3, 4, 5].filter(f => !L.faces.has(f)));
      if(S.connect !== "stitch" && groupCount() > 1)
      {
        const T = nearestOtherGroup(L);
        if(T)
        {
          const tx = Math.sqrt(3) * ((T.q - L.q) + (T.r - L.r) / 2), ty = 1.5 * (T.r - L.r), tl = Math.hypot(tx, ty) || 1;
          const cosTo = f => { const dx = Math.sqrt(3) * (DIRS[f][0] + DIRS[f][1] / 2), dy = 1.5 * DIRS[f][1]; return (dx * tx + dy * ty) / (tl * Math.hypot(dx, dy)); };
          faces.sort((a, b) => cosTo(b) - cosTo(a));
        }
      }
      for(const f of faces)
      {
        const r = tryStraight(L, f, n, canNew);
        if(!r) continue;
        if(r.target) { addRoute(L, r.target, r.hexes, n, dice, "met"); done = true; break; }
        const over = S.maxVaultDays > 0 && L.vd + (r.hexes.length - 1) > S.maxVaultDays;
        const N2 = addLoc(r.newAt, over ? 4 : rollVariety(L, r.newAt));
        if(over) N2.converted = true;
        addRoute(L, N2, r.hexes, n, dice, "new"); W.queue.push(N2); done = true; break;
      }
      if(!done) W.failed++;
    }
  }
  function startPoints(c, k, D)
  {
    if(k <= 1) return [{ q: c.q, r: c.r }];
    const cx = Math.sqrt(3) * (c.q + c.r / 2), cy = 1.5 * c.r, rho = D * Math.sqrt(3) / (2 * Math.sin(Math.PI / k)), out = [];
    for(let i = 0; i < k; i++)
    {
      const a = 2 * Math.PI * i / k - Math.PI / 2, x = cx + rho * Math.cos(a), y = cy + rho * Math.sin(a);
      const r = y / 1.5, q = x / Math.sqrt(3) - r / 2;
      out.push(cubeRound(q, -q - r, r));
    }
    return out;
  }
  // Dead ends try once more (RULED): a breadth-first search over the hex grid finds the nearest
  // unlinked location within lonerReach days, going round routes and other locations.
  function lonerPath(A, maxLen)
  {
    const prev = new Map([[key(A.q, A.r), null]]);
    let frontier = [{ q: A.q, r: A.r }];
    for(let dd = 1; dd <= maxLen && frontier.length; dd++)
    {
      const next = [];
      for(const h of frontier) for(let f = 0; f < 6; f++)
      {
        if(dd === 1 && A.faces.has(f)) continue;
        const n = { q: h.q + DIRS[f][0], r: h.r + DIRS[f][1] }, k = key(n.q, n.r);
        if(prev.has(k)) continue;
        prev.set(k, h);
        const T = locAt(n);
        if(T)
        {
          if(T !== A && !linked(A, T) && !T.faces.has(dirOf(n, h)))
          {
            const hexes = [n];
            let c = h;
            while(c) { hexes.unshift(c); c = prev.get(key(c.q, c.r)); }
            return { target: T, hexes };
          }
          continue;
        }
        if(W.routeHex.has(k) || !inBudget(n)) continue;
        next.push(n);
      }
      frontier = next;
    }
    return null;
  }
  function lonerPass()
  {
    if(!S.lonerReach) return;
    for(const L of [...W.locs])
    {
      if(L.links.size !== 1) continue;
      const p = lonerPath(L, S.lonerReach);
      if(p) { addRoute(L, p.target, p.hexes, 0, 0, "loner"); W.loners++; }
    }
  }
  function stitch()
  {
    for(let guard = 0; guard < 20 && groupCount() > 1; guard++)
    {
      const pairs = [];
      for(const a of W.locs) for(const b of W.locs) if(a.id < b.id && find(a.id) !== find(b.id)) pairs.push([a, b, hdist(a, b)]);
      pairs.sort((x, y) => x[2] - y[2]);
      let done = false;
      for(const [a, b] of pairs)
      {
        const line = hexLine(a, b), fa = dirOf(line[0], line[1]), fb = dirOf(line[line.length - 1], line[line.length - 2]);
        if(a.faces.has(fa) || b.faces.has(fb)) continue;
        let ok = true;
        for(let i = 1; i < line.length - 1; i++) { const h = line[i]; if(locAt(h) || W.routeHex.has(key(h.q, h.r))) { ok = false; break; } }
        if(ok) { addRoute(a, b, line, line.length - 1, 0, "stitch"); W.stitched++; done = true; break; }
      }
      if(!done) { W.unstitched++; break; }
    }
  }
  function bounds(hexes)
  {
    let xmin = 1e9, xmax = -1e9, rmin = 1e9, rmax = -1e9;
    for(const h of hexes) { const x = h.q + h.r / 2; xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); rmin = Math.min(rmin, h.r); rmax = Math.max(rmax, h.r); }
    return { xmin, xmax, rmin, rmax };
  }
  // Guaranteed vaults: top the region up to minVaults vaults (a d20 of 4). A placed vault sits on a free
  // hex that keeps the gap and joins 2 or 3 locations, each within a rolled path length.
  function planLinks(h, lens, own)
  {
    const used = new Set(), temp = new Set(), faces = new Set(), plan = [];
    for(const { n, dice } of lens)
    {
      const cands = own.filter(T => !used.has(T.id) && hdist(h, T) <= n).sort((x, y) => hdist(h, x) - hdist(h, y));
      let got = null;
      for(const T of cands)
      {
        const line = hexLine(h, T);
        const f = dirOf(line[0], line[1]); if(f < 0 || faces.has(f)) continue;
        const bk = dirOf(line[line.length - 1], line[line.length - 2]); if(bk < 0 || T.faces.has(bk)) continue;
        let ok = true;
        for(let i = 1; i < line.length - 1; i++) { const x = line[i], k = key(x.q, x.r); if(locAt(x) || W.routeHex.has(k) || temp.has(k)) { ok = false; break; } }
        if(ok) { got = { target: T, hexes: line, n, dice }; break; }
      }
      if(!got) return null;
      used.add(got.target.id); faces.add(dirOf(got.hexes[0], got.hexes[1]));
      for(let i = 1; i < got.hexes.length - 1; i++) temp.add(key(got.hexes[i].q, got.hexes[i].r));
      plan.push(got);
    }
    return plan;
  }
  function vaultDist()
  {
    const dist = new Map(W.locs.map(l => [l.id, l.type === "Vault" ? 0 : Infinity]));
    const adj = new Map(W.locs.map(l => [l.id, []]));
    for(const r of W.routes) { adj.get(r.a).push([r.b, r.days]); adj.get(r.b).push([r.a, r.days]); }
    const done = new Set();
    for(;;)
    {
      let u = null, ud = Infinity;
      for(const [id, dd] of dist) if(!done.has(id) && dd < ud) { ud = dd; u = id; }
      if(u === null) break;
      done.add(u);
      for(const [v, w] of adj.get(u)) if(ud + w < dist.get(v)) dist.set(v, ud + w);
    }
    return dist;
  }
  function placeOne(near)
  {
    const mine = [...W.locs], b = bounds(mine), cands = [];
    for(let r = b.rmin - 3; r <= b.rmax + 3; r++)
    {
      const qmin = Math.floor(b.xmin - 3 - r / 2), qmax = Math.ceil(b.xmax + 3 - r / 2);
      for(let q = qmin; q <= qmax; q++) { const h = { q, r }; if(!locAt(h) && !W.routeHex.has(key(q, r)) && gapOk(h) && inBudget(h)) cands.push(h); }
    }
    shuffle(cands);
    if(near) cands.sort((x, y) => hdist(x, near) - hdist(y, near));
    for(let attempt = 0; attempt < 12; attempt++)
    {
      const k = range(S.vaultLinks);
      const lens = Array.from({ length: k }, () => rollLength()).sort((a, c) => c.n - a.n);
      for(const h of cands)
      {
        const plan = planLinks(h, lens, mine);
        if(!plan) continue;
        const V = addLoc(h, 4); V.placed = true;
        for(const p of plan) addRoute(V, p.target, p.hexes, p.n, p.dice, "vault");
        W.vaultsPlaced++;
        return V;
      }
    }
    return null;
  }
  function worstServed()
  {
    const dist = vaultDist();
    let w = null, wd = -1;
    for(const l of W.locs) { const dd = dist.get(l.id); if(dd > wd) { wd = dd; w = l; } }
    return wd === Infinity ? W.start : w;
  }
  function placeVaults()
  {
    let need = Math.max(0, S.minVaults - W.locs.filter(l => l.type === "Vault").length);
    while(need > 0)
    {
      if(!placeOne(S.spread ? worstServed() : null)) { W.vaultFail += need; break; }
      need--;
    }
  }

  // -- grow --
  W.centre = { q: 0, r: 0 };
  W.starts = [];
  startPoints(W.centre, S.starts, S.startSpacing).forEach((h, i) =>
  {
    let p = h;
    for(let g = 0; g < 60 && (locAt(p) || W.routeHex.has(key(p.q, p.r)) || !gapOk(p)); g++) p = { q: p.q + DIRS[g % 6][0], r: p.r + DIRS[g % 6][1] };
    const vault = S.startVault === "all" || (S.startVault === "first" && i === 0);
    const L = addLoc(p, vault ? 4 : undefined);
    L.isStart = true;
    if(vault) L.startVault = true;
    W.starts.push(L);
  });
  W.start = W.starts[0];
  for(const L of W.starts) expand(L, range(S.firstPaths), true);
  let guard = 0;
  while(W.locs.length < S.count && guard < 4000)
  {
    guard++;
    if(W.queue.length) { expand(W.queue.shift(), range(S.laterPaths), true); continue; }
    const open = W.locs.filter(l => l.faces.size < 6);
    if(!open.length) break;
    W.stalled++;
    expand(pick(open), 1, true);
  }
  if(S.closeJoins) for(const L of W.queue.splice(0)) expand(L, range(S.laterPaths), false);
  if(S.connect !== "toward") stitch();
  lonerPass();
  placeVaults();

  // -- sections, then each section's rolls --
  makeSections(W, S);
  for(const s of W.sections) { s.landscape = LANDSCAPES[d(20) - 1]; s.named = NAMED_FOR[d(20) - 1]; }
  // landmarks roll last, so turning them on or off leaves every other roll where it was (RULED)
  if(S.landmarks)
  {
    const used = new Set();
    for(const s of W.sections)
    {
      let n = d(100);
      if(S.landmarkVariety) for(let k = 0; k < 50 && used.has(n); k++) n = d(100);
      used.add(n);
      s.landmark = { roll: n, name: LANDMARKS[n - 1] };
    }
  }
  computeTerritory(W, S, bounds);
  computeRelief(W, S);
  placeLandmarks(W);
  W.vaultDays = vaultDist();
  W.settings = S;
  W.code = formatRegionCode(S);
  return W;
}

// Sections (RULED): grown along routes, about secSize locations each, small ones folded into a neighbour.
function makeSections(W, S)
{
  const locs = W.locs, k = S.secMethod === "none" ? 1 : Math.max(1, Math.round(locs.length / S.secSize));
  const mk = () => { const s = { id: W.sections.length, locs: [] }; W.sections.push(s); return s; };
  const assign = (L, s) => { L.section = s.id; s.locs.push(L); };
  const neighbours = L => [...L.links].map(i => W.locs[i]);
  if(S.secMethod === "none") { const s = mk(); locs.forEach(l => assign(l, s)); }
  else if(S.secMethod === "routes")
  {
    const order = [], seen = new Set([W.start.id]), q = [W.start];
    while(q.length) { const L = q.shift(); order.push(L); for(const N of neighbours(L)) if(!seen.has(N.id)) { seen.add(N.id); q.push(N); } }
    locs.forEach(l => { if(!seen.has(l.id)) order.push(l); });
    const done = new Set();
    for(const L of order)
    {
      if(done.has(L.id)) continue;
      const s = mk(), bq = [L];
      done.add(L.id);
      while(bq.length && s.locs.length < S.secSize)
      {
        const X = bq.shift();
        assign(X, s);
        for(const N of neighbours(X)) if(!done.has(N.id)) { done.add(N.id); bq.push(N); }
      }
      // whatever was queued but did not fit goes back into the pool
      for(const X of bq) done.delete(X.id);
    }
  }
  else if(S.secMethod === "voronoi")
  {
    const seeds = [W.start];
    while(seeds.length < k)
    {
      let best = null, bd = -1;
      for(const l of locs) { const m = Math.min(...seeds.map(s => hdist(s, l))); if(m > bd) { bd = m; best = l; } }
      if(!best || bd === 0) break;
      seeds.push(best);
    }
    const secs = seeds.map(() => mk());
    for(const l of locs) { let bi = 0, bd = 1e9; seeds.forEach((s, i) => { const dd = hdist(s, l); if(dd < bd) { bd = dd; bi = i; } }); assign(l, secs[bi]); }
  }
  else
  { // wedges around the first location
    const c = W.start, secs = Array.from({ length: k }, mk);
    const ang = l => { const x = (l.q + l.r / 2) - (c.q + c.r / 2), y = (l.r - c.r) * 0.866; return Math.atan2(y, x); };
    const others = locs.filter(l => l !== c).sort((a, b) => ang(a) - ang(b));
    assign(c, secs[0]);
    others.forEach((l, i) => assign(l, secs[Math.floor(i * k / others.length)]));
  }
  if(S.mergeSmall && W.sections.length > 1)
  {
    const min = Math.ceil(S.secSize / 2);
    for(let pass = 0; pass < 200; pass++)
    {
      const small = W.sections.filter(s => s.locs.length && s.locs.length < min).sort((a, b) => a.locs.length - b.locs.length)[0];
      if(!small) break;
      let target = null, best = 1e9;
      for(const L of small.locs) for(const T of locs)
      {
        if(T.section === small.id) continue;
        const t = W.sections[T.section];
        if(!t || !t.locs.length) continue;
        const score = hdist(L, T) * (L.links.has(T.id) ? 50 : 100) + t.locs.length;
        if(score < best) { best = score; target = t; }
      }
      if(!target) break;
      for(const L of small.locs) { L.section = target.id; target.locs.push(L); }
      small.locs = [];
    }
  }
  W.sections = W.sections.filter(s => s.locs.length);
  W.sections.forEach((s, i) => { s.id = i; s.locs.forEach(l => { l.section = i; }); });
}

// Territory: every hex within `terr` of a location belongs to the nearest one, inside a box round the
// locations and routes with a margin. The box is the Scene.
function computeTerritory(W, S, bounds)
{
  const b = bounds([...W.locs, ...W.routes.flatMap(r => r.hexes)]), m = S.margin;
  W.box = { xmin: b.xmin - m, xmax: b.xmax + m, rmin: b.rmin - m, rmax: b.rmax + m };
  W.terr = []; W.terrAt = new Map();
  for(let r = W.box.rmin; r <= W.box.rmax; r++)
  {
    const qmin = Math.floor(W.box.xmin - r / 2), qmax = Math.ceil(W.box.xmax - r / 2);
    for(let q = qmin; q <= qmax; q++)
    {
      let best = null, bd = 1e9;
      for(const l of W.locs) { const dd = hdist(l, { q, r }); if(dd < bd) { bd = dd; best = l; } }
      const t = { q, r, owner: (S.terr > 0 && bd <= S.terr) ? best : null };
      W.terr.push(t); W.terrAt.set(key(q, r), t);
    }
  }
  const cols = Math.ceil(W.box.xmax - W.box.xmin) + 1, rows = W.box.rmax - W.box.rmin + 1;
  W.scene = { cols, rows, px: Math.round((cols + 0.5) * S.hexPx), py: Math.round((rows - 1) * S.hexPx * 0.866 + S.hexPx * 1.155), hexes: W.terr.length };
}
const secOf = (W, L) => W.sections[L.section];

// ---- relief (RULED 2026-10-03): a height per hex from a rule per Landscape. Heights come from hashes of
// the seed, never from the generator's random numbers, so relief never changes the region. ----
function ihash(a, b, c)
{
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// value noise on a lattice `scale` hexes wide, 0..1
function vnoise(t, scale, salt)
{
  const gx = hxX(t) / scale, gy = hxY(t) / scale, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sm = v => v * v * (3 - 2 * v), u = sm(fx), v = sm(fy);
  const a = ihash(x0, y0, salt), b = ihash(x0 + 1, y0, salt), c = ihash(x0, y0 + 1, salt), d2 = ihash(x0 + 1, y0 + 1, salt);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d2) * u * v;
}
// steps from the nearest source, moving only through the section's own hexes
export function hexBfs(sources, inSec)
{
  const dist = new Map(), q = [];
  for(const s of sources) { const k = key(s.q, s.r); if(!dist.has(k)) { dist.set(k, 0); q.push(s); } }
  for(let i = 0; i < q.length; i++)
  {
    const t = q[i], dt = dist.get(key(t.q, t.r));
    for(const n of nbrs(t)) { const k = key(n.q, n.r); if(inSec.has(k) && !dist.has(k)) { dist.set(k, dt + 1); q.push(n); } }
  }
  return dist;
}
// the hexes deepest inside the section, best first; ties broken by a hash per hex, not in the comparator
const interior = C => C.hexes.map(t => ({ t, d: C.dEdge(t), h: ihash(t.q, t.r, C.salt ^ 0x51) })).sort((a, b) => b.d - a.d || a.h - b.h);
function basin(C) { C.dCentre = hexBfs([interior(C)[0].t], C.inSec); }
function basinH(t, C) { const e = C.dEdge(t), c = C.dCentre.get(key(t.q, t.r)) ?? e; const f = c / (c + e || 1); return f < 0.45 ? 0.16 : 0.16 + (f - 0.45) / 0.55 * 0.34; }
function valleyH(t, C) { const d = C.dRoute(t); return d === Infinity ? 0.46 : 0.2 + 0.3 * Math.min(1, d / 3); }
const RELIEF = {
  _flat: { h: (t, C) => 0.46 + 0.08 * (vnoise(t, 4, C.salt) - 0.5) },
  "Featureless Sands": { prep(C) { C.ang = ihash(1, 2, C.salt) * Math.PI; },   // long low dunes
    h: (t, C) => 0.46 + 0.1 * Math.sin((hxX(t) * Math.cos(C.ang) + hxY(t) * Math.sin(C.ang)) * 2.2 + vnoise(t, 5, C.salt) * 3) },
  "Salt Pan": { h: () => 0.56 },                                                 // dead flat
  "Rocky Plain": { h: (t, C) => 0.46 + 0.22 * (vnoise(t, 1.6, C.salt) - 0.5) },
  "Garbage-Strewn Wastes": { h: (t, C) => 0.44 + 0.3 * (vnoise(t, 1.3, C.salt) - 0.5) },
  "Dried-Up Lake": { prep: basin, h: basinH },
  "Toxic Lake": { prep: basin, h: basinH },
  "Dried-Up River": { h: valleyH },                                              // the bed is the route the party walks
  "Toxic River": { h: valleyH },
  "Towering Monoliths": { h: (t, C) => C.open(t) && ihash(t.q, t.r, C.salt ^ 0x77) < 0.08 ? 0.97 : 0.42 + 0.06 * (vnoise(t, 3, C.salt) - 0.5) },
  "Riddled with Caves": { h: (t, C) => C.open(t) && ihash(t.q, t.r, C.salt ^ 0x99) < 0.1 ? 0.08 : 0.5 + 0.08 * (vnoise(t, 3, C.salt) - 0.5) },
  "Windswept Plateau": { h: (t, C) => C.dEdge(t) === 0 ? 0.42 : 0.74 + 0.06 * (vnoise(t, 3, C.salt) - 0.5) },  // raised, an escarpment at the rim
  "Abandoned City": { h: t => ((Math.floor(hxX(t) / 2) + Math.floor(t.r / 2)) & 1) ? 0.4 : 0.54 },             // blocks
  "Hills": { h: (t, C) => 0.22 + 0.5 * vnoise(t, 2.6, C.salt) + 0.22 * vnoise(t, 1.3, C.salt ^ 0x33) },
  "Mountainous": { h(t, C) {                                                     // ridges, with the routes as passes
    const r = 1 - Math.abs(2 * vnoise(t, 2.2, C.salt) - 1), k = Math.min(1, (C.dEdge(t) + 1) / 3);
    let h = 0.22 + 0.72 * Math.pow(r, 1.4) * k;
    const dr = C.dRoute(t);
    if(dr === 0) h = Math.min(h, 0.26); else if(dr === 1) h = Math.min(h, 0.46);
    return h; } },
  "Mesas": { h(t, C) {                                                           // flat tops standing clear of the routes
    const n = vnoise(t, 3.2, C.salt);
    return n > 0.46 && C.dRoute(t) >= 1 ? 0.8 + 0.04 * (vnoise(t, 1.5, C.salt ^ 0x11) - 0.5) : 0.3; } },
  "Lone Mountain": {
    prep(C)
    {
      const ord = interior(C), p1 = ord[0].t, peaks = [{ t: p1, w: 1 }];
      // sometimes a second, lower summit beside the first
      if(ihash(5, 5, C.salt) < 0.5)
      {
        const max = ord[0].d, p2 = ord.find(o => o.d >= Math.max(1, max * 0.6) && hdist(o.t, p1) >= 3);
        if(p2) peaks.push({ t: p2.t, w: 0.85 });
      }
      C.peaks = peaks.map(p => ({ ...p, dist: hexBfs([p.t], C.inSec) }));
    },
    h(t, C)
    {
      const e = C.dEdge(t);
      let m = 0;
      for(const p of C.peaks) { const d = p.dist.get(key(t.q, t.r)); if(d === undefined) continue; m = Math.max(m, p.w * e / (e + d || 1)); }
      return 0.12 + 0.88 * m;
    } },
  "Winding Canyons": {
    prep(C)
    {
      // the routes are the canyon floors; a few blind side canyons branch off them
      const cut = [...C.routeHexes];
      const starts = C.routeHexes.filter(t => !C.W.at.get(key(t.q, t.r)) && ihash(t.q, t.r, C.salt ^ 0x21) < 0.12);
      for(const s of starts)
      {
        let t = s, dir = Math.floor(ihash(s.q, s.r, C.salt ^ 0x22) * 6);
        const n = 3 + Math.floor(ihash(s.q, s.r, C.salt ^ 0x23) * 4);
        for(let i = 0; i < n; i++)
        {
          dir = (dir + [5, 0, 0, 1][Math.floor(ihash(t.q, t.r, C.salt ^ (0x30 + i)) * 4)]) % 6;
          const nx = { q: t.q + DIRS[dir][0], r: t.r + DIRS[dir][1] }, k = key(nx.q, nx.r);
          if(!C.inSec.has(k) || C.W.at.get(k)) break;
          let near = false;
          for(const l of C.W.locs) if(hdist(l, nx) <= 1) { near = true; break; }
          if(near) break;
          cut.push(nx); t = nx;
        }
      }
      C.dCut = cut.length ? hexBfs(cut, C.inSec) : null;
    },
    h(t, C)
    {
      const d = C.dCut ? C.dCut.get(key(t.q, t.r)) : undefined, top = 0.7 + 0.06 * (vnoise(t, 3, C.salt) - 0.5);
      return d === 0 ? 0.1 : d === 1 ? 0.36 : top;
    } }
};
function computeRelief(W, S)
{
  W.relief = new Map();
  const seedH = hashSeed(S.seed);
  for(const sec of W.sections)
  {
    const hexes = W.terr.filter(t => t.owner && secOf(W, t.owner) === sec);
    if(!hexes.length) continue;
    const inSec = new Set(hexes.map(t => key(t.q, t.r)));
    const routeHexes = hexes.filter(t => { const k = key(t.q, t.r); return W.routeHex.has(k) || W.at.get(k); });
    const de = hexBfs(hexes.filter(t => nbrs(t).some(n => !inSec.has(key(n.q, n.r)))), inSec);
    const dr = routeHexes.length ? hexBfs(routeHexes, inSec) : null;
    // the lab's salt carried its region number (0 here) as region + 1
    const C = { W, hexes, inSec, routeHexes, sec, salt: (seedH ^ Math.imul(1, 7919) ^ Math.imul(sec.id + 1, 104729)) >>> 0,
      dEdge: t => de.get(key(t.q, t.r)) ?? 0, dRoute: t => dr ? (dr.get(key(t.q, t.r)) ?? Infinity) : Infinity,
      open: t => { const k = key(t.q, t.r); return !W.routeHex.has(k) && !W.at.get(k); } };
    const rule = RELIEF[sec.landscape] || RELIEF._flat;
    rule.prep?.(C);
    for(const t of hexes) W.relief.set(key(t.q, t.r), Math.max(0, Math.min(1, rule.h(t, C))));
  }
  // soften the seam where two sections meet: a rim hex takes half the mean of its neighbours
  const rim = new Map();
  for(const t of W.terr)
  {
    const k = key(t.q, t.r);
    if(!W.relief.has(k)) continue;
    const sec = secOf(W, t.owner);
    let sum = 0, n = 0, other = false;
    for(const nb of nbrs(t))
    {
      const nk = key(nb.q, nb.r);
      if(!W.relief.has(nk)) continue;
      sum += W.relief.get(nk); n++;
      const o = W.terrAt.get(nk);
      if(o && secOf(W, o.owner) !== sec) other = true;
    }
    if(other && n) rim.set(k, (W.relief.get(k) + sum / n) / 2);
  }
  for(const [k, v] of rim) W.relief.set(k, v);
}

// A section's landmark (RULED) stands on the open hex nearest the middle of the section's own locations,
// kept a little in from the territory's rim; never on a location, a route, or a location's neighbour.
function placeLandmarks(W)
{
  for(const sec of W.sections)
  {
    if(!sec.landmark) continue;
    sec.landmark.hex = null;
    const hexes = W.terr.filter(t => t.owner && secOf(W, t.owner) === sec);
    if(!hexes.length) continue;
    const inSec = new Set(hexes.map(t => key(t.q, t.r)));
    const de = hexBfs(hexes.filter(t => nbrs(t).some(n => !inSec.has(key(n.q, n.r)))), inSec);
    const own = sec.locs.length ? sec.locs : hexes, cx = own.reduce((a, t) => a + hxX(t), 0) / own.length, cy = own.reduce((a, t) => a + hxY(t), 0) / own.length;
    let best = null, bs = -1e9;
    for(const t of hexes)
    {
      const k = key(t.q, t.r);
      if(W.at.get(k) || W.routeHex.has(k)) continue;
      let near = false;
      for(const l of W.locs) if(hdist(l, t) <= 1) { near = true; break; }
      if(near) continue;
      const sc = 0.6 * Math.min(de.get(k) ?? 0, 2) - Math.hypot(hxX(t) - cx, hxY(t) - cy);
      if(sc > bs) { bs = sc; best = t; }
    }
    sec.landmark.hex = best ? { q: best.q, r: best.r } : null;
  }
}
