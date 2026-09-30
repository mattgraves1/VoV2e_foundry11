/**
 * Vault Scene (foundry-system-index.csv row of that name) - the geometry. Pure,
 * so the offline test can check it; vault-scene.js draws and creates the Scene.
 *
 * RULED 2026-09-27 (Matt): one hex Scene per level, 100 px hexes of 5 ft. One
 * lattice step of the layout is 13 map hexes. A room is its rolled Room Shape
 * at a flat d8+2 hexes across, turned to a random angle; so the two largest
 * rooms side by side leave a 3-hex corridor. A corridor is a straight run of
 * hexes, one or two rows wide (50/50), and where it meets a room it is a door
 * or an open doorway (50/50). The map is an outline only - nothing marked.
 *
 * Pointy-topped hexes, rows running east-west, so the lattice's six directions
 * are the grid's own and a corridor lies exactly along a row of hexes. Every
 * room lies inside a circle of MAX_SIZE / 2 hexes around its lattice point, and
 * no other room or corridor comes nearer than a whole step, so nothing overlaps
 * whatever is rolled. The floor is the union of rooms and corridors, taken on
 * a raster; its outline is both the walls and the line the image draws.
 */

export const STEP = 13;                       // map hexes per lattice step
export const HEX = 100;                       // px, a hex flat to flat: the grid size
export const ROW = HEX * Math.sqrt(3) / 2;    // px between two parallel rows of hexes
const HEX_TALL = 2 * HEX / Math.sqrt(3);      // px, a hex point to point
export const MIN_SIZE = 3, MAX_SIZE = 10;     // hexes across
export const MARGIN = 800;                    // px of rock around a level
export const IMAGE_CAP = 8192;                // px, the widest background image drawn
export const CELL = 10;                       // px, the raster the outline is traced on

/** A room's size: a flat d8+2 hexes across (RULED 2026-09-27, Matt). */
export function rollRoomSize(random = Math.random)
{
  return MIN_SIZE + Math.floor(random() * (MAX_SIZE - MIN_SIZE + 1));
}

/* ---------- Room shapes ---------- */

const circle = (cx, cy, r, n = 40, rx = r) => Array.from({ length: n }, (_, i) =>
  [cx + rx * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n)]);
const ngon = (n, turn = -Math.PI / 2) => Array.from({ length: n }, (_, i) =>
  [Math.cos(turn + 2 * Math.PI * i / n), Math.sin(turn + 2 * Math.PI * i / n)]);
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) =>
  [cx + r * Math.cos(a0 + (a1 - a0) * i / n), cy + r * Math.sin(a0 + (a1 - a0) * i / n)]);

// Each Room Shape as polygons, drawn around the point the corridors meet. They
// are normalised below: that point is inside, and the farthest vertex is at 1.
const SHAPES = {
  "Square": () => [rect(-1, -1, 1, 1)],
  "Rectangle": () => [rect(-1, -0.55, 1, 0.55)],
  "Oval": () => [circle(0, 0, 0.62, 40, 1)],
  "Circle": () => [circle(0, 0, 1)],
  "Semicircle": () => [arc(0, 0.35, 1, Math.PI, 2 * Math.PI, 24)],
  "Pentagon": () => [ngon(5)],
  "Triangle": () => [ngon(3).map(([x, y]) => [x, y + 0.2])],
  "T-shaped": () => [rect(-1, -0.9, 1, -0.3), rect(-0.3, -0.3, 0.3, 1)],
  "L-shaped": () => [rect(-0.9, -0.9, -0.2, 0.9), rect(-0.9, 0.2, 0.9, 0.9)].map(p => p.map(([x, y]) => [x + 0.55, y - 0.55])),
  "Cruciform": () => [rect(-1, -0.3, 1, 0.3), rect(-0.3, -1, 0.3, 1)],
  "Hexagon": () => [ngon(6, 0)],
  "Dome": () => [circle(0, 0, 1)],
  "Cavernous": (random) => [Array.from({ length: 18 }, (_, i) =>
    { const a = 2 * Math.PI * i / 18, r = 0.6 + 0.4 * random(); return [r * Math.cos(a), r * Math.sin(a)]; })],
  "Starburst": () => [Array.from({ length: 16 }, (_, i) =>
    { const a = -Math.PI / 2 + Math.PI * i / 8, r = i % 2 ? 0.5 : 1; return [r * Math.cos(a), r * Math.sin(a)]; })],
  // The outer disc less a disc set to one side: the thick end holds the corridors' point.
  "Crescent": () =>
  {
    const d = 0.45, r2 = 0.85, x = (1 - r2 * r2 + d * d) / (2 * d), y = Math.sqrt(1 - x * x);
    const a = Math.atan2(y, x), b = Math.atan2(y, x - d);
    return [[...arc(0, 0, 1, a, 2 * Math.PI - a, 28), ...arc(d, 0, r2, 2 * Math.PI - b, b, 20).slice(1, -1)]
      .map(([px, py]) => [px + 0.7, py])];
  },
  "Sphere": () => [circle(0, 0, 1)],
  "Apse": () => [rect(-1, -0.5, 0.35, 0.5), arc(0.35, 0, 0.5, -Math.PI / 2, Math.PI / 2, 16)],
  "Octagon": () => [ngon(8, Math.PI / 8)],
  "Hourglass": () => [[[-0.7, -1], [0.7, -1], [0.2, 0], [0.7, 1], [-0.7, 1], [-0.2, 0]]],
  "Z-shaped": () => [rect(-1, -0.9, 0.25, -0.35), rect(-0.25, -0.35, 0.25, 0.35), rect(-0.25, 0.35, 1, 0.9)]
};
export const SHAPE_NAMES = Object.keys(SHAPES);

/** A Room Shape's polygons around (0, 0), which is inside, with no vertex farther than 1. Unknown names draw a circle. */
export function unitShape(name, random = Math.random)
{
  const polys = (SHAPES[name] ?? SHAPES.Circle)(random);
  const far = Math.max(...polys.flat().map(([x, y]) => Math.hypot(x, y)));
  return polys.map(p => p.map(([x, y]) => [x / far, y / far]));
}

export function pointInPolygon(x, y, poly)
{
  let inside = false;
  for(let i = 0, j = poly.length - 1; i < poly.length; j = i++)
  {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inAny = (x, y, polys) => polys.some(p => pointInPolygon(x, y, p));

/* ---------- A level laid out ---------- */

/** Lattice (q, r) to px, before the level is placed: pointy hexes, rows east-west. */
const latticePx = (q, r) => [HEX * STEP * (q + r / 2), ROW * STEP * r];

/**
 * One level of a vault's map. `map` is the journal's vaultMap flag: rooms
 * { q, r, z, shape, size, page, name } and edges { a, b, down }. Returns the
 * Scene's size, each room's centre and polygons, the corridors, and the doors;
 * `random` drives the turns, widths and doors. The origin is placed so a room's
 * centre is the centre of a hex of Foundry's odd-row grid with no padding.
 */
export function layoutLevel(map, z, random = Math.random)
{
  const ids = map.rooms.map((r, id) => id).filter(id => map.rooms[id].z === z);
  const rel = new Map(ids.map(id => [id, latticePx(map.rooms[id].q, map.rooms[id].r)]));
  const xs = [...rel.values()].map(p => p[0]), ys = [...rel.values()].map(p => p[1]);
  // x: a whole number of hexes; y: an even number of rows, then half a hex down to the first row's centres.
  const ox = HEX * Math.ceil((MARGIN - Math.min(...xs)) / HEX);
  const rows0 = 2 * Math.ceil((MARGIN - Math.min(...ys) - HEX_TALL / 2) / (2 * ROW));
  const oy = rows0 * ROW + HEX_TALL / 2;
  const width = HEX * Math.ceil((Math.max(...xs) + ox + MARGIN) / HEX);
  const height = Math.ceil(Math.max(...ys) + oy + MARGIN);

  const rooms = ids.map(id =>
  {
    const r = map.rooms[id], [x, y] = rel.get(id), cx = x + ox, cy = y + oy;
    const turn = random() * 2 * Math.PI, c = Math.cos(turn), s = Math.sin(turn), radius = r.size * HEX / 2;
    const polys = unitShape(r.shape, random).map(p => p.map(([px, py]) => [cx + radius * (px * c - py * s), cy + radius * (px * s + py * c)]));
    return { id, x: cx, y: cy, radius, polys, page: r.page, name: r.name, shape: r.shape, size: r.size };
  });
  const byId = new Map(rooms.map(r => [r.id, r]));

  // A corridor: centre to centre along the lattice line. Two rows wide sits half a row to one side.
  const corridors = map.edges.filter(e => !e.down && byId.has(e.a) && byId.has(e.b)).map(e =>
  {
    const A = byId.get(e.a), B = byId.get(e.b);
    const len = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / len, uy = (B.y - A.y) / len, px = -uy, py = ux;
    const rows = random() < 0.5 ? 1 : 2;
    const offset = rows === 2 ? (random() < 0.5 ? 1 : -1) * ROW / 2 : 0, half = rows * ROW / 2;
    const at = (t, side) => [A.x + ux * t + px * (offset + side), A.y + uy * t + py * (offset + side)];
    const poly = [at(0, -half), at(len, -half), at(len, half), at(0, half)];
    return { a: e.a, b: e.b, rows, len, ux, uy, px, py, offset, half, at, poly };
  });

  // A door where a corridor meets a room, half the time: across the corridor just
  // clear of the room and of the room's other corridors, which cross near a small room.
  const doors = [];
  for(const k of corridors)
    for(const end of ["a", "b"])
    {
      if(random() >= 0.5) continue;
      const room = byId.get(k[end]);
      const others = corridors.filter(o => o !== k && (o.a === room.id || o.b === room.id)).map(o => o.poly);
      const t = doorDistance(k, end, room, others);
      if(t === null) continue;
      const tt = end === "a" ? t : k.len - t;
      doors.push({ room: room.id, corridor: [k.a, k.b], centre: k.at(tt, 0), across: [k.px, k.py], half: k.half });
    }
  return { z, width, height, rooms, corridors, doors };
}

/** How far from its room's end a corridor's door sits, or null if the corridor never clears the room. */
function doorDistance(k, end, room, others)
{
  // Across the corridor and out past its walls to where the door's ends reach, so a
  // room's spike or a crossing corridor beside the door cannot leave a gap round it.
  const lines = [...[-0.9, -0.45, 0, 0.45, 0.9].map(f => f * k.half), -(k.half + 25), k.half + 25];
  const at = t => end === "a" ? t : k.len - t;
  let last = 0;
  for(let t = 0; t <= k.len / 2; t += 5)
    for(const side of lines)
    {
      const [x, y] = k.at(at(t), side);
      if(inAny(x, y, room.polys) || inAny(x, y, others)) last = t;
    }
  const t = last + 15;
  return t < k.len / 2 - 20 ? t : null;
}

/* ---------- The floor, its outline and the walls ---------- */

/** The floor on a CELL raster: 1 where a room or corridor is. */
export function rasterFloor(level)
{
  const nx = Math.ceil(level.width / CELL), ny = Math.ceil(level.height / CELL);
  const grid = new Uint8Array(nx * ny);
  const polys = [...level.rooms.flatMap(r => r.polys), ...level.corridors.map(k => k.poly)];
  for(const poly of polys)
  {
    const ys = poly.map(p => p[1]);
    const j0 = Math.max(0, Math.floor(Math.min(...ys) / CELL)), j1 = Math.min(ny - 1, Math.ceil(Math.max(...ys) / CELL));
    for(let j = j0; j <= j1; j++)
    {
      const y = (j + 0.5) * CELL, cross = [];
      for(let i = 0, m = poly.length - 1; i < poly.length; m = i++)
      {
        const [xa, ya] = poly[m], [xb, yb] = poly[i];
        if((ya > y) !== (yb > y)) cross.push(xa + (y - ya) * (xb - xa) / (yb - ya));
      }
      cross.sort((p, q) => p - q);
      for(let c = 0; c + 1 < cross.length; c += 2)
      {
        const i0 = Math.max(0, Math.ceil(cross[c] / CELL - 0.5)), i1 = Math.min(nx - 1, Math.floor(cross[c + 1] / CELL - 0.5));
        for(let i = i0; i <= i1; i++) grid[j * nx + i] = 1;
      }
    }
  }
  // A spike's tip thinner than a cell leaves specks of floor, and two shapes nearly
  // touching leave pockets of rock; each would be a wall loop of its own.
  despeckle(grid, nx, ny, 1);
  despeckle(grid, nx, ny, 0);
  return { nx, ny, grid };
}

const SPECK = 30; // cells
function despeckle(grid, nx, ny, value)
{
  const seen = new Uint8Array(grid.length);
  for(let k = 0; k < grid.length; k++)
  {
    if(grid[k] !== value || seen[k]) continue;
    const piece = [k], stack = [k];
    seen[k] = 1;
    let edge = false;
    while(stack.length)
    {
      const c = stack.pop(), i = c % nx, j = Math.floor(c / nx);
      if(i === 0 || j === 0 || i === nx - 1 || j === ny - 1) edge = true;
      for(const n of [i + 1 < nx ? c + 1 : -1, i > 0 ? c - 1 : -1, j + 1 < ny ? c + nx : -1, j > 0 ? c - nx : -1])
        if(n >= 0 && grid[n] === value && !seen[n]) { seen[n] = 1; stack.push(n); piece.push(n); }
    }
    if(piece.length <= SPECK && !edge) for(const c of piece) grid[c] = 1 - value;
  }
}

/**
 * The floor's outline as closed loops of px points, simplified: an outer loop per
 * piece of floor and one around any rock a ring of corridors encloses.
 */
export function traceOutline({ nx, ny, grid })
{
  const floor = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && grid[j * nx + i] === 1;
  const W = nx + 1, key = (i, j) => j * W + i;
  const out = new Map();
  const add = (a, b) => { const k = key(...a); if(!out.has(k)) out.set(k, []); out.get(k).push(b); };
  for(let j = 0; j < ny; j++)
    for(let i = 0; i < nx; i++)
    {
      if(!floor(i, j)) continue;
      if(!floor(i, j - 1)) add([i + 1, j], [i, j]);
      if(!floor(i - 1, j)) add([i, j], [i, j + 1]);
      if(!floor(i, j + 1)) add([i, j + 1], [i + 1, j + 1]);
      if(!floor(i + 1, j)) add([i + 1, j + 1], [i + 1, j]);
    }
  const loops = [];
  for(const [k0, list] of out)
    while(list.length)
    {
      const start = [k0 % W, Math.floor(k0 / W)], loop = [start];
      let cur = list.pop();
      while(cur[0] !== start[0] || cur[1] !== start[1])
      {
        loop.push(cur);
        const next = out.get(key(...cur));
        cur = next.pop();
      }
      loops.push(simplify(loop, 1).map(([i, j]) => [i * CELL, j * CELL]));
    }
  return loops.filter(l => l.length >= 3);
}

// Douglas-Peucker on a closed loop, split at its two farthest-apart points.
function simplify(loop, tol)
{
  const dist = (p, a, b) =>
  {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    return L ? Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L : Math.hypot(p[0] - a[0], p[1] - a[1]);
  };
  const dp = (pts) =>
  {
    let far = 0, at = 0;
    for(let i = 1; i < pts.length - 1; i++) { const d = dist(pts[i], pts[0], pts[pts.length - 1]); if(d > far) { far = d; at = i; } }
    if(far <= tol) return [pts[0], pts[pts.length - 1]];
    return [...dp(pts.slice(0, at + 1)).slice(0, -1), ...dp(pts.slice(at))];
  };
  let m = 0, far = -1;
  for(let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if(d > far) { far = d; m = i; } }
  const first = dp(loop.slice(0, m + 1)), second = dp([...loop.slice(m), loop[0]]);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

/** Every outline edge as a wall [x0, y0, x1, y1], and every door. */
export function wallsOf(loops, doors)
{
  const walls = [];
  for(const loop of loops)
    for(let i = 0; i < loop.length; i++)
    {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      if(a[0] !== b[0] || a[1] !== b[1]) walls.push({ c: [a[0], a[1], b[0], b[1]], door: 0 });
    }
  for(const d of doors) walls.push({ c: d.c, door: 1 });
  return walls;
}

/** The background image's scale: 1, or less when the level is wider or taller than IMAGE_CAP. */
export function imageScale(level)
{
  return Math.min(1, IMAGE_CAP / Math.max(level.width, level.height));
}

/** A whole level at once: the layout, its outline loops and its walls. */
/**
 * Where each obstructed corridor's pin goes on a level (RULED 2026-09-28, Matt):
 * on the corridor's centre line, halfway along the stretch between the two
 * rooms' edges - never inside a room, however their sizes differ. Shafts and
 * obstructions with no page (a journal made before pins) get none. Pure.
 */
export function obstructionPins(level, map)
{
  const byId = new Map(level.rooms.map(r => [r.id, r]));
  const out = [];
  for(const o of map.obstructions ?? [])
  {
    if(o.shaft || !o.page) continue;
    const k = level.corridors.find(c => (c.a === o.a && c.b === o.b) || (c.a === o.b && c.b === o.a));
    if(!k) continue;
    const A = byId.get(k.a), B = byId.get(k.b);
    const [x, y] = k.at((A.radius + k.len - B.radius) / 2, 0);
    out.push({ page: o.page, obstacle: o.obstacle, x, y });
  }
  return out;
}

export function buildLevel(map, z, random = Math.random)
{
  const level = layoutLevel(map, z, random);
  const ras = rasterFloor(level);
  const doors = level.doors.map(d => sealDoor(d, ras)).filter(Boolean);
  const loops = traceOutline(ras);
  return { ...level, doors, loops, walls: wallsOf(loops, doors), scale: imageScale(level) };
}

/**
 * A door's ends, found on the floor as drawn: out each way from the corridor's
 * centre line to the first rock, and a little into it, so the door meets the walls
 * whatever the raster made of the corridor's edge. A door that finds no wall near
 * the corridor's width is left an open doorway.
 */
function sealDoor(d, { nx, ny, grid })
{
  const floor = (x, y) => { const i = Math.floor(x / CELL), j = Math.floor(y / CELL); return i >= 0 && j >= 0 && i < nx && j < ny && grid[j * nx + i] === 1; };
  const [cx, cy] = d.centre, [ax, ay] = d.across;
  const reach = side =>
  {
    for(let s = 0; s <= d.half + 40; s += 2) if(!floor(cx + ax * side * s, cy + ay * side * s)) return s + 4;
    return null;
  };
  const lo = reach(-1), hi = reach(1);
  if(lo === null || hi === null) return null;
  return { room: d.room, corridor: d.corridor, c: [cx - ax * lo, cy - ay * lo, cx + ax * hi, cy + ay * hi].map(Math.round) };
}

/** The levels a vault map has, in order (0-based). */
export function mapLevels(map)
{
  return [...new Set(map.rooms.map(r => r.z))].sort((a, b) => a - b);
}
