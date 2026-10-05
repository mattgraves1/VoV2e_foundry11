/**
 * Region Generator (foundry-system-index.csv row of that name) - the painter.
 *
 * Draws a region from region-layout.js onto a 2D canvas, the look ruled with
 * Matt in the Vaarn Region Lab (2026-10-03): a cobalt blue ground; relief - the
 * ground lighter where it is higher, in bands with contour lines between them;
 * each section's Landscape as a pale tinted pattern over its open hexes; the
 * location icons on dark discs; a pale four-pointed star for each landmark;
 * routes as dashed lines, hazardous ones in red. The preview window draws it at
 * any zoom with routes, labels and highlights; the Scene's background is the
 * same drawing at the Scene's scale with no routes and no text (RULED: routes
 * are Drawings the GM reveals, and names are on GM pins).
 *
 * Browser only: patterns are made on canvases and icons loaded from the
 * module's SVG files.
 */

import { DIRS, key, hdist } from "./region-layout.js";

export const GROUND = "#23427a", GROUND_HOVER = "#2c5294", SURROUND = "#0d1533";
const GRID = "#26345f", TEXT = "#ece6ee", MUTED = "#a8b5d6", ACCENT = "#ff5a70", ACCENT2 = "#f29ab0", STAR = "#fff4d6";

/** The look's settings, as ruled. */
export const PAINT_DEFAULTS = Object.freeze({ reliefBands: 5, reliefStrength: 75, contours: true, terrainAlpha: 40 });

/** Each location type's icon in module/icons/region (game-icons.net, CC BY 3.0 - credits.txt). */
export const TYPE_ICON = {
  "Ruin": "ancient-ruins", "Settlement": "village", "Oasis": "oasis", "Vault": "airtight-hatch", "Lair": "cave-entrance",
  "Holy Place": "temple-gate", "Arcology": "habitat-dome", "Grave": "tombstone", "Cacklemaw Den": "hyena-head",
  "Wreck": "ship-wreck", "Faa Nomad Camp": "desert-camp", "Bandit Camp": "bandit", "Oracle's Sanctum": "crystal-ball",
  "Science-Mystic's Abode": "observatory", "Hegemony Outpost": "watchtower", "Fortress": "castle", "Trade Post": "shop",
  "Archive": "archive-research", "Bounty Hunter's Camp": "wanted-reward", "Anomaly": "vortex"
};

let ICON_PATHS = null;
/** Load every location icon once, as a Path2D in a 512-unit box. */
export async function loadRegionIcons()
{
  if(ICON_PATHS) return ICON_PATHS;
  const out = {};
  await Promise.all(Object.entries(TYPE_ICON).map(async ([type, icon]) =>
  {
    const text = await (await fetch(`/systems/vaarn/module/icons/region/${icon}.svg`)).text();
    const d = text.match(/\sd="([^"]+)"/)?.[1];
    if(d) out[type] = new Path2D(d);
  }));
  return ICON_PATHS = out;
}

// Each Landscape's tint on the blue ground: one shared lightness, its own hue, no plain blues. [hue, saturation]
const TINT_HS = { "Featureless Sands": [45, 60], "Salt Pan": [50, 15], "Rocky Plain": [25, 30], "Dried-Up Lake": [35, 55], "Dried-Up River": [185, 55],
  "Towering Monoliths": [0, 25], "Mesas": [15, 70], "Hills": [70, 55], "Lone Mountain": [290, 45], "Toxic Lake": [100, 65], "Toxic River": [150, 60],
  "Fungal Forest": [325, 60], "Crystal Growths": [265, 60], "Windswept Plateau": [195, 50], "Mountainous": [230, 45], "Winding Canyons": [28, 75],
  "Abandoned City": [0, 0], "Cactus Fields": [125, 50], "Riddled with Caves": [20, 40], "Garbage-Strewn Wastes": [55, 70] };
export function tintOf(landscape)
{
  const v = TINT_HS[landscape];
  if(!v) return MUTED;
  const [h, sat] = v, L = 0.78, S = sat / 100;
  const k = n => (n + h / 30) % 12, a = S * Math.min(L, 1 - L), f = n => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const hx = x => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + hx(f(0)) + hx(f(8)) + hx(f(4));
}

// ---- relief as colour ----
const band = (h, B) => B > 0 ? Math.min(B - 1, Math.floor(h * B)) : h;
function reliefColour(h, o, hover)
{
  const B = o.reliefBands, v = B > 0 ? (band(h, B) + 0.5) / B : h;
  const L = 36 + (o.reliefStrength / 100) * 40 * (v - 0.5) + (hover ? 5 : 0);
  return `hsl(219 55% ${Math.max(6, Math.min(70, L)).toFixed(1)}%)`;
}

// ---- Landscape patterns: a semi-abstract tile per Landscape, read from the legend ----
function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function ring(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
function arcUp(g, x, y, r) { g.beginPath(); g.arc(x, y, r, Math.PI, 2 * Math.PI); g.stroke(); }
function line(g, pts, close) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if(close) g.closePath(); g.stroke(); }
function wave(g, y, a, periods) { g.beginPath(); for(let i = 0; i <= 24; i++) { const x = i / 24, yy = y + Math.sin(x * Math.PI * 2 * periods) * a; i ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }

// Dried-up lake bed: a Voronoi crack network of fixed points on a torus, so the tile wraps without a seam.
let MUD = null;
function mudCracks()
{
  if(MUD) return MUD;
  const H = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const sites = []; for(let i = 0; i < 17; i++) sites.push([H(i * 2 + 1), H(i * 2 + 2)]);
  const all = []; for(const [x, y] of sites) for(const dx of [-1, 0, 1]) for(const dy of [-1, 0, 1]) all.push([x + dx, y + dy]);
  const clip = (poly, p, q) =>
  {
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n = [q[0] - p[0], q[1] - p[1]], side = v => (v[0] - m[0]) * n[0] + (v[1] - m[1]) * n[1];
    const out = [];
    for(let k = 0; k < poly.length; k++)
    {
      const a = poly[k], b = poly[(k + 1) % poly.length], sa = side(a), sb = side(b);
      if(sa <= 0) out.push(a);
      if((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  };
  const fr = v => v - Math.floor(v), lines = [];
  for(const p of sites)
  {
    let poly = [[p[0] - 1, p[1] - 1], [p[0] + 1, p[1] - 1], [p[0] + 1, p[1] + 1], [p[0] - 1, p[1] + 1]];
    for(const q of all) { if(q[0] === p[0] && q[1] === p[1]) continue; if(Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.9) continue; poly = clip(poly, p, q); }
    for(let k = 0; k < poly.length; k++)
    {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      // bend the border the same way from either side: hash its wrapped midpoint
      const mx = fr((a[0] + b[0]) / 2), my = fr((a[1] + b[1]) / 2), h = H(Math.round(mx * 997) * 31 + Math.round(my * 991));
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1), off = (h - 0.5) * len * 0.28;
      const sgn = (a[0] + a[1] < b[0] + b[1]) ? 1 : -1;
      lines.push([a, [(a[0] + b[0]) / 2 + nx * off * sgn, (a[1] + b[1]) / 2 + ny * off * sgn], b]);
    }
    // a hairline or two, from inside the plate toward an edge, not reaching it
    for(let h = 0; h < 2; h++)
    {
      const r = H(p[0] * 90 + p[1] * 70 + h * 13);
      if(r < 0.45) continue;
      const a = r * 6.28, l = 0.03 + r * 0.05;
      lines.push([[p[0] + Math.cos(a) * 0.02, p[1] + Math.sin(a) * 0.02], [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l]]);
    }
  }
  return MUD = lines;
}

// A tile is a unit square; `k` is its size in hex radii.
const PAT = {
  "Featureless Sands": { k: 0.9, d: g => { dot(g, 0.25, 0.3, 0.035); dot(g, 0.75, 0.8, 0.035); } },
  "Salt Pan": { k: 0.8, d: g => { line(g, [[0, 0.5], [0.35, 0.42], [0.62, 0.56], [1, 0.5]]); line(g, [[0.5, 0], [0.44, 0.38], [0.56, 0.64], [0.5, 1]]); } },
  "Rocky Plain": { k: 0.9, d: g => { for(const [x, y] of [[0.25, 0.3], [0.33, 0.38], [0.22, 0.42], [0.72, 0.78], [0.8, 0.7]]) dot(g, x, y, 0.03); } },
  "Dried-Up Lake": { k: 3.2, d: g => { for(const p of mudCracks()) line(g, p); } },
  "Dried-Up River": { k: 0.9, d: g => { wave(g, 0.3, 0.07, 1); line(g, [[0.2, 0.62], [0.28, 0.78], [0.4, 0.72]]); line(g, [[0.65, 0.7], [0.75, 0.9]]); } },
  "Towering Monoliths": { k: 0.8, d: g => { line(g, [[0.3, 0.2], [0.3, 0.7]]); line(g, [[0.7, 0.45], [0.7, 0.85]]); } },
  "Mesas": { k: 1.0, d: g => { line(g, [[0, 0.7], [0.28, 0.7], [0.28, 0.42], [0.72, 0.42], [0.72, 0.7], [1, 0.7]]); } },
  "Hills": { k: 0.8, d: g => { arcUp(g, 0.5, 0.7, 0.24); arcUp(g, 0, 0.25, 0.18); arcUp(g, 1, 0.25, 0.18); } },
  "Lone Mountain": { k: 2.2, d: g => { line(g, [[0.05, 0.82], [0.5, 0.18], [0.95, 0.82]]); line(g, [[0.5, 0.18], [0.62, 0.5], [0.56, 0.82]]); } },
  "Toxic Lake": { k: 0.9, d: g => { wave(g, 0.3, 0.07, 1); wave(g, 0.72, 0.07, 1); dot(g, 0.5, 0.5, 0.03); dot(g, 0, 0.5, 0.03); } },
  "Toxic River": { k: 1.1, d: g => { wave(g, 0.5, 0.14, 1); dot(g, 0.25, 0.18, 0.03); dot(g, 0.75, 0.82, 0.03); } },
  "Fungal Forest": { k: 0.9, d: g => { ring(g, 0.3, 0.3, 0.1); ring(g, 0.78, 0.76, 0.1); } },
  "Crystal Growths": { k: 0.9, d: g => { line(g, [[0.42, 0.62], [0.5, 0.3], [0.58, 0.62]], true); line(g, [[0.88, 0.12], [0.95, -0.1], [1.02, 0.12]]); line(g, [[-0.12, 0.12], [-0.05, -0.1], [0.02, 0.12]]); } },
  "Windswept Plateau": { k: 1.0, d: g => { line(g, [[0.08, 0.3], [0.58, 0.3]]); line(g, [[0.42, 0.78], [0.92, 0.78]]); } },
  "Mountainous": { k: 0.8, d: g => { line(g, [[0, 0.72], [0.25, 0.32], [0.5, 0.72], [0.75, 0.32], [1, 0.72]]); } },
  "Winding Canyons": { k: 1.2, d: g => { wave(g, 0.4, 0.16, 1); wave(g, 0.6, 0.16, 1); } },
  "Abandoned City": { k: 0.9, d: g => { line(g, [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8]]); line(g, [[0.2, 0.8], [0.2, 0.48]]); } },
  "Cactus Fields": { k: 0.9, d: g => { line(g, [[0.3, 0.2], [0.3, 0.44]]); line(g, [[0.2, 0.32], [0.4, 0.32]]); line(g, [[0.75, 0.62], [0.75, 0.86]]); line(g, [[0.65, 0.74], [0.85, 0.74]]); } },
  "Riddled with Caves": { k: 1.0, d: g => { arcUp(g, 0.5, 0.6, 0.18); dot(g, 0.5, 0.56, 0.05); } },
  "Garbage-Strewn Wastes": { k: 0.9, d: g => { line(g, [[0.15, 0.2], [0.28, 0.3]]); line(g, [[0.6, 0.12], [0.72, 0.2]]); line(g, [[0.38, 0.72], [0.48, 0.6]]); line(g, [[0.8, 0.82], [0.86, 0.68]]); } }
};
const patCache = new Map();
/** A repeating tile for a Landscape at `s` pixels a hex radius; null for a Landscape with no pattern. */
function patternFor(ctx, landscape, color, s, dpr)
{
  const P = PAT[landscape];
  if(!P) return null;
  const T = Math.max(4, Math.round(P.k * s * dpr)), k = landscape + "|" + color + "|" + T;
  if(patCache.has(k)) return patCache.get(k);
  const c = document.createElement("canvas");
  c.width = c.height = T;
  const g = c.getContext("2d");
  g.scale(T, T); g.strokeStyle = color; g.fillStyle = color;
  g.lineWidth = Math.max(dpr * 0.75, T * 0.062 / P.k) / T; g.lineCap = "round"; g.lineJoin = "round";
  // the tile three times across each edge, so strokes that cross an edge reappear on the other side
  for(const ox of [-1, 0, 1]) for(const oy of [-1, 0, 1]) { g.save(); g.translate(ox, oy); P.d(g); g.restore(); }
  const pat = { pat: ctx.createPattern(c, "repeat"), T };
  if(patCache.size > 400) patCache.clear();
  patCache.set(k, pat);
  return pat;
}

// ---- geometry: pointy-top hexes, `s` pixels from centre to corner ----
export const toPx = (h, v) => ({ x: v.ox + v.s * Math.sqrt(3) * (h.q + h.r / 2), y: v.oy + v.s * 1.5 * h.r });
function hexPath(ctx, c, s) { ctx.beginPath(); for(let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30), x = c.x + s * Math.cos(a), y = c.y + s * Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
const secOf = (W, L) => W.sections[L.section];

/**
 * Paint a region. `view` is { s, ox, oy } - hex radius and origin in canvas pixels; `size` the canvas's
 * size in CSS pixels; `dpr` its pixel ratio (the context must already be scaled by it).
 * Options: routes, labels (type and name), grid, hoverSec, selected (a location), selRoute, icons
 * (from loadRegionIcons), legend, and the look (PAINT_DEFAULTS).
 */
export function paintRegion(ctx, W, view, size, o = {})
{
  o = { ...PAINT_DEFAULTS, routes: true, labels: true, grid: true, dpr: 1, ...o };
  const s = view.s, dpr = o.dpr, vis = c => !(c.x < -s * 2 || c.y < -s * 2 || c.x > size.w + s * 2 || c.y > size.h + s * 2);
  ctx.fillStyle = SURROUND; ctx.fillRect(0, 0, size.w, size.h);

  // the ground, shaded by relief
  for(const t of W.terr)
  {
    const c = toPx(t, view);
    if(!vis(c)) continue;
    hexPath(ctx, c, s * (o.grid ? 0.98 : 1.02));
    if(t.owner)
    {
      const sec = secOf(W, t.owner), h = W.relief.get(key(t.q, t.r));
      ctx.fillStyle = h !== undefined ? reliefColour(h, o, sec === o.hoverSec) : (sec === o.hoverSec ? GROUND_HOVER : GROUND);
      ctx.fill();
    }
    if(o.grid && s > 5) { ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.stroke(); }
  }
  // contour lines: the hex edges where the relief band changes
  if(o.contours && o.reliefBands > 0 && s >= 3)
  {
    ctx.beginPath();
    for(const t of W.terr)
    {
      const h = W.relief.get(key(t.q, t.r));
      if(h === undefined) continue;
      const c = toPx(t, view);
      if(!vis(c)) continue;
      const b = band(h, o.reliefBands);
      for(let i = 0; i < 3; i++)
      {
        const n = { q: t.q + DIRS[i][0], r: t.r + DIRS[i][1] }, nh = W.relief.get(key(n.q, n.r));
        if(nh === undefined || band(nh, o.reliefBands) === b) continue;
        const p = toPx(n, view), th = Math.atan2(p.y - c.y, p.x - c.x), a0 = th - Math.PI / 6, a1 = th + Math.PI / 6;
        ctx.moveTo(c.x + s * Math.cos(a0), c.y + s * Math.sin(a0)); ctx.lineTo(c.x + s * Math.cos(a1), c.y + s * Math.sin(a1));
      }
    }
    ctx.strokeStyle = "rgba(200,222,255,0.5)"; ctx.lineWidth = Math.max(1, s * 0.08); ctx.lineCap = "round"; ctx.stroke();
  }
  // each section's Landscape as a pattern over its open hexes, kept off a location and its neighbours
  if(s >= 4)
  {
    for(const sec of W.sections)
    {
      const pf = patternFor(ctx, sec.landscape, tintOf(sec.landscape), s, dpr);
      if(!pf) continue;
      const clip = new Path2D();
      let any = false;
      for(const t of W.terr)
      {
        if(!t.owner || secOf(W, t.owner) !== sec) continue;
        if(t.near === undefined) t.near = W.locs.some(l => hdist(l, t) <= 1);
        if(t.near) continue;
        const c = toPx(t, view);
        if(!vis(c)) continue;
        for(let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30), x = c.x + s * 0.99 * Math.cos(a), y = c.y + s * 0.99 * Math.sin(a); i ? clip.lineTo(x, y) : clip.moveTo(x, y); }
        clip.closePath(); any = true;
      }
      if(!any) continue;
      pf.pat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, view.ox, view.oy]));
      ctx.save(); ctx.clip(clip); ctx.globalAlpha = o.terrainAlpha / 100; ctx.fillStyle = pf.pat; ctx.fillRect(0, 0, size.w, size.h); ctx.restore();
    }
  }
  // routes, the GM's: dashed, hazardous ones red
  if(o.routes)
  {
    for(const R of W.routes)
    {
      ctx.beginPath();
      R.hexes.forEach((h, i) => { const p = toPx(h, view); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      const sel = (o.selected && (R.a === o.selected.id || R.b === o.selected.id)) || R === o.selRoute;
      ctx.setLineDash([Math.max(3, s * 0.6), Math.max(3, s * 0.5)]);
      ctx.lineWidth = sel ? 3 : Math.max(1.5, s * 0.18);
      ctx.strokeStyle = R.hazard ? ACCENT : MUTED;
      ctx.globalAlpha = (o.selected || o.selRoute) && !sel ? 0.35 : 1;
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.setLineDash([]);
  }
  // landmarks: a four-pointed star
  for(const sec of W.sections)
  {
    const lm = sec.landmark;
    if(!lm?.hex) continue;
    const p = toPx(lm.hex, view), k = Math.max(6.5, s * 0.66), i = k * 0.32;
    ctx.beginPath();
    for(let j = 0; j < 8; j++) { const a = -Math.PI / 2 + j * Math.PI / 4, rr = j % 2 ? i : k; j ? ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr) : ctx.moveTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = STAR; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = SURROUND; ctx.stroke();
    if(o.labels && s >= 11) label(ctx, lm.name, p.x, p.y + k + 3, Math.min(13, s * 0.62), "italic 400", STAR);
  }
  // locations: the type's icon on a dark disc ringed in its Landscape's tint
  const rad = Math.max(5, s * 0.82);
  for(const L of W.locs)
  {
    const p = toPx(L, view), col = tintOf(secOf(W, L)?.landscape);
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = SURROUND; ctx.fill(); ctx.lineWidth = Math.max(1.2, s * 0.09); ctx.strokeStyle = col; ctx.stroke();
    const ic = o.icons?.[L.type];
    if(ic) { const sz = rad * 1.45; ctx.save(); ctx.translate(p.x - sz / 2, p.y - sz / 2); ctx.scale(sz / 512, sz / 512); ctx.fillStyle = col; ctx.fill(ic); ctx.restore(); }
    if(L.type === "Vault")
    { // the vault mark: a diamond round the disc
      const k = rad + Math.max(4, s * 0.35);
      ctx.beginPath(); ctx.moveTo(p.x, p.y - k); ctx.lineTo(p.x + k, p.y); ctx.lineTo(p.x, p.y + k); ctx.lineTo(p.x - k, p.y); ctx.closePath();
      ctx.strokeStyle = ACCENT2; ctx.lineWidth = Math.max(1.5, s * 0.08); ctx.stroke();
    }
    if(o.routes && L.isStart) { ctx.beginPath(); ctx.arc(p.x, p.y, rad + Math.max(3, s * 0.25), 0, Math.PI * 2); ctx.strokeStyle = TEXT; ctx.lineWidth = 1.5; ctx.stroke(); }
    if(L === o.selected) { ctx.beginPath(); ctx.arc(p.x, p.y, rad + Math.max(5, s * 0.45), 0, Math.PI * 2); ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.stroke(); }
    if(o.labels && s >= 11) label(ctx, L.name ? `${L.name} (${L.type})` : L.type, p.x, p.y + rad + 3, Math.min(14, s * 0.7), "400", TEXT);
  }
  if(o.legend) drawLegend(ctx, W, size);
}

function label(ctx, text, x, y, px, weight, color)
{
  ctx.font = `${weight} ${Math.round(px)}px Signika, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.lineWidth = 3; ctx.strokeStyle = SURROUND; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

/** The region's Landscapes, each with its swatch and the sections that have it, in the canvas's corner. */
function drawLegend(ctx, W, size)
{
  const rows = new Map();
  for(const sec of W.sections) { if(!PAT[sec.landscape]) continue; if(!rows.has(sec.landscape)) rows.set(sec.landscape, []); rows.get(sec.landscape).push(String.fromCharCode(65 + sec.id)); }
  if(!rows.size) return;
  const lh = 22, pad = 8, sw = 30, font = "12px Signika, sans-serif";
  ctx.font = font;
  let w = 0;
  for(const [nm, ids] of rows) w = Math.max(w, ctx.measureText(nm + "  " + ids.join(" ")).width);
  const W2 = pad * 3 + sw + w, H = pad * 2 + rows.size * lh, x0 = 8, y0 = size.h - H - 8;
  ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = "#16214a"; ctx.strokeStyle = "#45598d"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(x0, y0, W2, H); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
  let y = y0 + pad;
  for(const [nm, ids] of rows)
  {
    const pf = patternFor(ctx, nm, tintOf(nm), 20, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + pad, y, sw, lh - 6); ctx.clip();
    ctx.fillStyle = GROUND; ctx.fillRect(x0 + pad, y, sw, lh - 6);
    pf.pat.setTransform(new DOMMatrix([1, 0, 0, 1, x0 + pad, y])); ctx.fillStyle = pf.pat; ctx.fillRect(x0 + pad, y, sw, lh - 6); ctx.restore();
    ctx.fillStyle = TEXT; ctx.font = font; ctx.textBaseline = "middle"; ctx.fillText(nm, x0 + pad * 2 + sw, y + (lh - 6) / 2);
    ctx.fillStyle = MUTED; ctx.fillText(ids.join(" "), x0 + pad * 2 + sw + ctx.measureText(nm + "  ").width, y + (lh - 6) / 2);
    y += lh;
  }
  ctx.restore();
}

// ---- the map legend's images (Region Map Legend compendium): drawn here so they always match the map ----

/** A Landscape's swatch: the blue ground at middle height with its tinted pattern, as on the map. */
export function paintSwatch(ctx, w, h, landscape, s = 22)
{
  ctx.fillStyle = reliefColour(0.5, PAINT_DEFAULTS, false); ctx.fillRect(0, 0, w, h);
  const pf = patternFor(ctx, landscape, tintOf(landscape), s, 1);
  if(!pf) return;
  pf.pat.setTransform(new DOMMatrix([1, 0, 0, 1, 0, 0]));
  ctx.save(); ctx.globalAlpha = PAINT_DEFAULTS.terrainAlpha / 100 + 0.25; ctx.fillStyle = pf.pat; ctx.fillRect(0, 0, w, h); ctx.restore();
}

/** One key mark on a square canvas of `n` px: a location icon, the landmark star, the vault mark, a route, or relief. */
export function paintKey(ctx, n, kind, { icon = null, colour = "#e8e2d0" } = {})
{
  const c = n / 2, rad = n * 0.4;
  if(kind === "relief")
  { // the bands, lowest to highest, each with a contour line
    const B = PAINT_DEFAULTS.reliefBands;
    for(let i = 0; i < B; i++) { ctx.fillStyle = reliefColour((i + 0.5) / B, PAINT_DEFAULTS, false); ctx.fillRect(i * n / B, 0, n / B + 1, n); }
    ctx.strokeStyle = "rgba(200,222,255,0.5)"; ctx.lineWidth = 2;
    for(let i = 1; i < B; i++) { ctx.beginPath(); ctx.moveTo(i * n / B, 0); ctx.lineTo(i * n / B, n); ctx.stroke(); }
    return;
  }
  ctx.fillStyle = GROUND; ctx.fillRect(0, 0, n, n);
  if(kind === "route" || kind === "hazard")
  {
    ctx.strokeStyle = kind === "hazard" ? "#ff5a70" : "#d8e1f5"; ctx.lineWidth = Math.max(3, n * 0.07); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(n * 0.1, n * 0.75); ctx.lineTo(n * 0.5, n * 0.4); ctx.lineTo(n * 0.9, n * 0.3); ctx.stroke();
    return;
  }
  if(kind === "landmark")
  {
    const k = rad, i = k * 0.32;
    ctx.beginPath();
    for(let j = 0; j < 8; j++) { const a = -Math.PI / 2 + j * Math.PI / 4, rr = j % 2 ? i : k; j ? ctx.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr) : ctx.moveTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = STAR; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = SURROUND; ctx.stroke();
    return;
  }
  // a location: its icon on a dark disc, as on the map; "vault" adds the diamond
  const r = kind === "vault" ? rad * 0.62 : rad;
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fillStyle = SURROUND; ctx.fill(); ctx.lineWidth = Math.max(2, n * 0.04); ctx.strokeStyle = colour; ctx.stroke();
  if(icon) { const sz = r * 1.45; ctx.save(); ctx.translate(c - sz / 2, c - sz / 2); ctx.scale(sz / 512, sz / 512); ctx.fillStyle = colour; ctx.fill(icon); ctx.restore(); }
  if(kind === "vault")
  {
    const k = r + n * 0.12;
    ctx.beginPath(); ctx.moveTo(c, c - k); ctx.lineTo(c + k, c); ctx.lineTo(c, c + k); ctx.lineTo(c - k, c); ctx.closePath();
    ctx.strokeStyle = ACCENT2; ctx.lineWidth = Math.max(2, n * 0.05); ctx.stroke();
  }
}
