/**
 * Vault Layout Generator (foundry-system-index.csv row of that name).
 *
 * Grows a vault's LAYOUT - rooms, the links between them, corridors, shafts
 * and levels - from a vault code. Contents are not rolled here; every room of
 * the layout is handed on to be filled afterwards.
 *
 * The rules were designed with Matt in the Vault Lattice Grower artifact
 * (claude.ai/artifact/2Ws3WMDfAm3wNEA88eqLVr); the book itself builds a floor
 * from printed Node Cluster Maps, which the module cannot use directly. Rooms
 * sit on a triangular lattice (the printed maps are drawn on the same 60-degree
 * lattice): each room has six exits on its level and one shaft down. The page
 * lists every rule as modelled.
 *
 * THIS FILE IS THE ONLY COPY. tools/vault-lattice/build-page.mjs writes it into
 * the artifact's page, and tools/test-vault-layout.mjs holds it to layouts
 * captured before the port, so a code grows the same vault in the artifact and
 * in Foundry. A change that grows any existing code differently must bump
 * CODE_VERSION. Nothing here may touch Foundry or the page: it runs in both,
 * and in Node for the test.
 */

// The six lattice exits, as axial (q, r) steps. Opposite exits are 3 apart.
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const SQ = Math.sqrt(3) / 2;
export const CODE_VERSION = "v1";

// Seeded random numbers, so a seed grows the same vault everywhere.
export function mulberry32(a)
{
  return function()
  {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function hashSeed(s)
{
  let h = 2166136261;
  for(const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// How many links a room wants: a roll on the connection table, whose four
// weights are the die faces for 1, 2, 3 and 4 links.
function rollConn(rng, weights)
{
  const tot = weights.reduce((a, b) => a + b, 0);
  let x = rng() * tot;
  for(let i = 0; i < weights.length; i++) { if((x -= weights[i]) < 0) return i + 1; }
  return weights.length;
}

/**
 * Grow one vault. `o` holds chances as fractions:
 *   weights, pDown, cap, every (0 = no distance penalty), reset, oneShaft,
 *   exact {n rooms per level, levels} or null, longChance, maxLen (corridor length 2-4),
 *   lineShafts (symmetric shafts only from rooms on the mirror line), momentum, axisPull,
 *   blocked, loop, lost (a failed link is lost, not retried), sym
 */
export function generate(rng, o)
{
  const { weights, pDown, cap, reset, oneShaft } = o;
  const exact = o.exact || null, every = exact ? 0 : o.every; // an exact count limits size, so no distance penalty
  const momentum = o.momentum || 0, blocked = o.blocked || 0, loop = o.loop ?? 1, lost = !!o.lost, sym = !!o.sym;
  const axisPull = o.axisPull || 0, lineShafts = sym && !!o.lineShafts, longChance = o.longChance || 0, maxLen = o.maxLen || 3;
  const key = (q, r, z) => q + "," + r + "," + z;
  const mir = (q, r) => [q + r, -r]; // reflection across the line through the entrance
  const rooms = [], idx = new Map(), edges = [], shafts = new Set(), blockMap = new Map(), perLevel = new Map();
  const corr = new Map(); // cells a corridor runs through
  const canon = (q, r, z) => { if(sym && r < 0) [q, r] = mir(q, r); return key(q, r, z); };
  const make = (q, r, z, d, arr) =>
  {
    const room = { q, r, z, d, arr, links: new Set(), used: new Set(), roll: null, pen: 0, had: null, id: rooms.length };
    rooms.push(room);
    idx.set(key(q, r, z), room);
    perLevel.set(z, (perLevel.get(z) || 0) + 1);
    blockMap.set(canon(q, r, z), false);
    return room;
  };
  // Rubble is rolled the first time anything looks at a cell.
  const isBlocked = (q, r, z) =>
  {
    if(!blocked) return false;
    const k = canon(q, r, z);
    if(!blockMap.has(k)) blockMap.set(k, rng() < blocked);
    return blockMap.get(k);
  };
  // Direction index from a to cell t along a lattice line, any length.
  const dirOf = (a, t) =>
  {
    const dq = t[0] - a.q, dr = t[1] - a.r, n = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
    return DIRS.findIndex(([x, y]) => x * n === dq && y * n === dr);
  };
  // Walk up to len cells from room in direction d. Stops at the first room (joins it) or, with
  // symmetry, at the mirror line. Returns null if rubble or another corridor is in the way.
  function walk(room, d, len)
  {
    const [dq, dr] = DIRS[d], path = [];
    for(let i = 1; i <= len; i++)
    {
      const t = [room.q + dq * i, room.r + dr * i, room.z], k = key(...t);
      if(isBlocked(...t) || corr.has(k)) return null;
      if(idx.has(k)) return { t, path, existing: true };
      if(i === len || (sym && room.r !== 0 && t[1] === 0)) return { t, path, existing: false };
      path.push(t);
    }
  }
  make(0, 0, 0, 0, -1);
  const axis = axisPull ? Math.floor(rng() * 3) : -1; // the vault's spine: exits d where d % 3 === axis
  let capped = false;

  // The link room -> t, and with symmetry its mirror twin.
  function linkPairs(room, t, path = [])
  {
    const pairs = [[room, t, path]];
    if(sym)
    {
      const [mq, mr] = mir(room.q, room.r), [tq, tr] = mir(t[0], t[1]);
      const mroom = idx.get(key(mq, mr, room.z));
      if(mroom && !(mroom === room && key(tq, tr, t[2]) === key(...t)))
        pairs.push([mroom, [tq, tr, t[2]], path.map(([q, r, z]) => [...mir(q, r), z])]);
    }
    return pairs;
  }
  const freshOf = pairs => new Set(pairs.map(p => key(...p[1])).filter(k => !idx.has(k)));
  // Link room to cell t; with symmetry, the mirror link is made too. Returns false if the cap
  // (or, with an exact count, a full level) refused it.
  function linkTo(room, t, path = [])
  {
    const down = t[2] !== room.z;
    const pairs = linkPairs(room, t, path);
    const fresh = freshOf(pairs);
    if(exact) { if((perLevel.get(t[2]) || 0) + fresh.size > exact.n) return false; }
    else if(rooms.length + fresh.size > cap) { capped = true; return false; }
    for(const [a, tt, pp] of pairs)
    {
      const k = key(...tt);
      if(a.links.has(k)) continue;
      const dir = down ? -1 : dirOf(a, tt);
      const b = idx.get(k) || make(...tt, down && reset ? 0 : a.d + 1, dir);
      a.links.add(k); b.links.add(key(a.q, a.r, a.z));
      if(!down) { a.used.add(dir); b.used.add((dir + 3) % 6); }
      for(const c of pp) corr.set(key(...c), true);
      edges.push({ a: a.id, b: b.id, down, len: pp.length + 1 });
    }
    if(down) shafts.add(room.z);
    return true;
  }

  // One room's turn: roll how many links it wants and try to make them.
  function takeTurn(room)
  {
    const want = rollConn(rng, weights);
    room.roll = want; room.pen = every ? Math.floor(room.d / every) : 0; room.had = room.links.size;
    const target = want - room.pen;
    let budget = target - room.links.size;
    while(budget > 0 && room.links.size < target)
    {
      budget--;
      const down = [room.q, room.r, room.z + 1];
      const canDown = !exact && !room.links.has(key(...down)) && !corr.has(key(...down))
        && !(oneShaft && shafts.has(room.z)) && !(lineShafts && room.r !== 0);
      let cand = [];
      for(let d = 0; d < 6; d++) if(!room.used.has(d)) cand.push({ d });
      if(canDown && (rng() < pDown || !cand.length)) { linkTo(room, down); continue; }
      let made = false;
      while(cand.length)
      {
        const wts = cand.map(c =>
        {
          let w = 1;
          if(momentum && room.arr >= 0) { const s = Math.abs(c.d - room.arr) % 6; w *= Math.pow(1 - momentum, Math.min(s, 6 - s)); }
          if(axis >= 0 && c.d % 3 !== axis) w *= Math.pow(1 - axisPull, 3);
          return w;
        });
        if(!wts.some(w => w > 0)) wts.fill(1);
        let x = rng() * wts.reduce((a, b) => a + b, 0), j = 0;
        for(; j < cand.length - 1; j++) { if((x -= wts[j]) < 0) break; }
        const c = cand[j];
        const len = longChance && rng() < longChance ? 2 + Math.floor(rng() * (maxLen - 1)) : 1;
        const w = walk(room, c.d, len);
        const fail = !w || (w.existing && loop < 1 && rng() >= loop);
        if(!fail) { linkTo(room, w.t, w.path); made = true; break; }
        if(lost) break;
        cand.splice(j, 1);
      }
      if(!made && !lost && !cand.length)
      {
        if(canDown) { linkTo(room, down); continue; }
        break;
      }
    }
  }

  const shuffle = a =>
  {
    for(let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const rollsHere = r => !(sym && r.r < 0); // mirror side: copies its twin, never rolls
  const short = [];
  if(!exact)
  {
    for(let i = 0; i < rooms.length; i++) if(rollsHere(rooms[i])) takeTurn(rooms[i]);
  }
  else
  {
    // EXACT ROOMS PER LEVEL: grow a level with ordinary turns until it has n rooms. A level that
    // stops short gets one more link from a random room with a free exit, then grows on. With one
    // room left in a symmetric vault only a link that adds a single room qualifies, so the last room
    // lands on the mirror line. A finished level drops a shaft from a random room; the next level
    // starts below it.
    const taken = new Set();
    const grow = z =>
    {
      for(let i = 0; i < rooms.length; i++)
      {
        const r = rooms[i];
        if(r.z === z && !taken.has(r.id) && rollsHere(r)) { taken.add(r.id); takeTurn(r); }
      }
    };
    const reopen = z =>
    {
      const need = exact.n - (perLevel.get(z) || 0);
      for(const room of shuffle(rooms.filter(r => r.z === z && rollsHere(r))))
      {
        for(const d of shuffle([0, 1, 2, 3, 4, 5].filter(d => !room.used.has(d))))
        {
          const len = longChance && rng() < longChance ? 2 + Math.floor(rng() * (maxLen - 1)) : 1;
          const w = walk(room, d, len);
          if(!w || w.existing) continue;
          const n = freshOf(linkPairs(room, w.t, w.path)).size;
          if(n < 1 || n > need) continue;
          if(linkTo(room, w.t, w.path)) return true;
        }
      }
      // The last room of an odd count in a symmetric vault, when no room is next to the mirror line
      // (a level that began as twin wings): a corridor runs straight to the line, its mirror twin runs
      // to the same cell, and the one room they meet at joins the wings.
      if(sym && need === 1)
      {
        for(const room of shuffle(rooms.filter(r => r.z === z && r.r > 0)))
        {
          for(const d of shuffle([0, 1, 2, 3, 4, 5].filter(d => !room.used.has(d) && DIRS[d][1] < 0)))
          {
            const w = walk(room, d, room.r);
            if(!w || w.existing || w.t[1] !== 0) continue;
            if(freshOf(linkPairs(room, w.t, w.path)).size === 1 && linkTo(room, w.t, w.path)) return true;
          }
        }
      }
      return false;
    };
    for(let z = 0; z < exact.levels; z++)
    {
      grow(z);
      while((perLevel.get(z) || 0) < exact.n && reopen(z)) grow(z);
      if((perLevel.get(z) || 0) < exact.n) short.push(z);
      if(z + 1 < exact.levels)
      {
        const from = shuffle(rooms.filter(r => r.z === z && rollsHere(r) && !(lineShafts && r.r !== 0)));
        if(!from.length || !linkTo(from[0], [from[0].q, from[0].r, z + 1])) break;
      }
    }
  }

  const levels = new Set(rooms.map(r => r.z)).size;
  const level1 = rooms.filter(r => r.z === 0).length;
  const blockedCells = [];
  for(const [k, v] of blockMap)
  {
    if(!v) continue;
    const [q, r, z] = k.split(",").map(Number);
    blockedCells.push({ q, r, z });
    if(sym && r > 0) { const [mq, mr] = mir(q, r); blockedCells.push({ q: mq, r: mr, z }); }
  }
  const corridors = [...corr.keys()].map(k => { const [q, r, z] = k.split(",").map(Number); return { q, r, z }; });
  const loops = Math.max(0, edges.length - rooms.length + 1);
  return { rooms, edges, capped, exact, short, levels, level1, loops, sym, axis, blocked: blockedCells, corridors,
    shape: shapeOf(rooms, loops), pieces: piecesPerLevel(rooms, edges) };
}

// Pieces per level: groups of rooms joined by links on that level (shafts don't count).
export function piecesPerLevel(rooms, edges)
{
  const parent = rooms.map((_, i) => i);
  const find = i => { while(parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  for(const e of edges) if(!e.down) parent[find(e.a)] = find(e.b);
  const roots = new Map();
  for(const r of rooms) { if(!roots.has(r.z)) roots.set(r.z, new Set()); roots.get(r.z).add(find(r.id)); }
  return [...roots.keys()].sort((a, b) => a - b).map(z => roots.get(z).size);
}

// Stretch: long axis over short axis of the footprint (all levels flattened); 1 is round.
export function shapeOf(rooms, loops)
{
  const n = rooms.length;
  let mx = 0, my = 0;
  const pts = rooms.map(r => [r.q + r.r / 2, r.r * SQ]);
  for(const [x, y] of pts) { mx += x; my += y; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for(const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  sxx /= n; syy /= n; sxy /= n;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc), eps = 0.1;
  return { stretch: Math.sqrt((l1 + eps) / (l2 + eps)), loopsPerRoom: loops / n, deadEnds: rooms.filter(r => r.links.size === 1).length / n };
}

/* ---------- Vault settings and codes ---------- */

// A vault's SETTINGS are what a code carries: chances as whole percentages,
// and the seed. `growVault` turns them into generate()'s fractions.
const PERCENT = ["pDown", "momentum", "axisPull", "longChance", "blocked", "loop"];

export function toGrowOptions(s)
{
  const o = { ...s };
  for(const k of PERCENT) o[k] = s[k] / 100;
  delete o.seed;
  return o;
}

export function growVault(settings)
{
  return generate(mulberry32(hashSeed(settings.seed)), toGrowOptions(settings));
}

export function formatVaultCode(s)
{
  return [CODE_VERSION, `w=${s.weights.join("/")}`, `e=${s.every}`, `r=${+s.reset}`, `o=${+s.oneShaft}`, `d=${s.pDown}`, `c=${s.cap}`,
    `m=${s.momentum}`, `a=${s.axisPull}`, `k=${s.longChance}/${s.maxLen}`, `b=${s.blocked}`, `l=${s.loop}`,
    `f=${+s.lost}`, `s=${+s.sym}`, `y=${+s.lineShafts}`, ...(s.exact ? [`x=${s.exact.n}/${s.exact.levels}`] : []), `seed=${s.seed}`].join(";");
}

// Throws an Error whose message says what is wrong with the code, in words a Referee can act on.
export function parseVaultCode(text)
{
  text = String(text).trim();
  const si = text.indexOf(";seed=");
  if(!text.startsWith(CODE_VERSION + ";") || si < 0)
    throw new Error(`That isn't a vault code. A code starts with ${CODE_VERSION}; and ends with seed= and the seed.`);
  const seed = text.slice(si + 6);
  if(!seed) throw new Error("The code has no seed after seed=.");
  const kv = Object.fromEntries(text.slice(CODE_VERSION.length + 1, si).split(";").map(p => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
  const missing = ["w", "e", "r", "o", "d", "c", "m", "a", "k", "b", "l", "f", "s", "y"].filter(k => !(k in kv));
  if(missing.length) throw new Error(`The code is missing ${missing.join(", ")}. It may have been cut off when copied.`);
  const num = (v, lo, hi, what) =>
  {
    const n = Number(v);
    if(!Number.isInteger(n) || n < lo || n > hi) throw new Error(`The code's ${what} (${v}) is outside ${lo}–${hi}.`);
    return n;
  };
  const w = kv.w.split("/");
  if(w.length !== 4) throw new Error("The code's roll table needs four numbers, like w=2/1/6/3.");
  const [kc, kl] = kv.k.split("/");
  let exact = null;
  if("x" in kv) { const [xn, xl] = kv.x.split("/"); exact = { n: num(xn, 2, 200, "rooms per level"), levels: num(xl, 1, 10, "levels") }; }
  return {
    weights: w.map(x => num(x, 0, 12, "roll table")), every: num(kv.e, 0, 5, "distance penalty"), reset: !!num(kv.r, 0, 1, "reset"),
    oneShaft: !!num(kv.o, 0, 1, "one shaft"), pDown: num(kv.d, 0, 50, "down chance"), cap: num(kv.c, 20, 1500, "room cap"),
    momentum: num(kv.m, 0, 100, "momentum"), axisPull: num(kv.a, 0, 100, "axis pull"), longChance: num(kc, 0, 80, "long corridor chance"),
    maxLen: num(kl, 2, 4, "longest corridor"), blocked: num(kv.b, 0, 40, "blocked cells"), loop: num(kv.l, 0, 100, "loop chance"),
    lost: !!num(kv.f, 0, 1, "failed link"), sym: !!num(kv.s, 0, 1, "symmetry"), lineShafts: !!num(kv.y, 0, 1, "symmetric shafts"), exact, seed
  };
}

// The setting a new vault starts from (RULED 2026-09-27, Matt): exact 18 rooms, one level, some long
// corridors and fewer loops - 'a good way to default it for new users who want the authentic book vaults'.
// RULED 2026-09-27 (Matt), reversing 'some long corridors': long corridors 0% and a 20% loop chance, since
// Vault Scene's room sizes already vary corridor length on the map; 20% keeps the loops and dead ends
// the old default had.
export const MODULE_DEFAULT = Object.freeze(parseVaultCode(
  "v1;w=2/1/6/3;e=3;r=1;o=1;d=4;c=400;m=0;a=0;k=0/3;b=0;l=20;f=0;s=0;y=0;x=18/1;seed=-"));

const SEED_WORDS = ["ibis", "hound", "scarab", "lotus", "gecko", "serpent", "chariot", "sable", "jade", "onyx"];
export function newSeed(random = Math.random)
{
  return SEED_WORDS[Math.floor(random() * SEED_WORDS.length)] + "-" + Math.floor(random() * 9999);
}

// Randomize: roll the shape rules and a new seed. The roll table, distance rules, cap and size
// mode set a vault's size and are kept from `base`.
export function randomizeSettings(base, random = Math.random)
{
  const pick = (lo, hi) => Math.round(lo + random() * (hi - lo));
  const s = { ...base };
  s.momentum = random() < 0.4 ? 0 : pick(20, 90);
  s.axisPull = random() < 0.5 ? 0 : pick(30, 90);
  s.longChance = random() < 0.5 ? 0 : pick(10, 60);
  s.maxLen = pick(2, 4);
  s.blocked = random() < 0.5 ? 0 : pick(5, 25);
  s.loop = random() < 0.4 ? 100 : pick(0, 90);
  s.lost = random() < 0.3;
  s.sym = random() < 0.2;
  s.lineShafts = random() < 0.5;
  // few rooms sit on the mirror line, so line-only shafts need a higher chance for the same depth
  s.pDown = s.sym && s.lineShafts ? pick(10, 25) : pick(0, 8);
  s.seed = newSeed(random);
  return s;
}
