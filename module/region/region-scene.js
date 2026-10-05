/**
 * Region Generator (foundry-system-index.csv row of that name) - the Scene.
 *
 * Makes a region's hex Scene from its journal (RULED 2026-10-03, Matt):
 *
 *   the map      region-paint.js's drawing at the Scene's own scale - ground,
 *                relief, Landscape patterns, location icons, landmark stars -
 *                with no routes and no text, as the background image
 *   the grid     Foundry's pointy-topped odd-row hexes, one hex per day: grid
 *                units are days, one to a hex
 *   vision       token vision and fog of war on, global light off at
 *                darkness 0, no walls: the party token's sight reveals the
 *                map (fog hides nothing with token vision off, and global
 *                light lets a token see the whole map - both tested in
 *                Foundry 11, 2026-10-03)
 *   the party    one shared "Party" actor (players Observer, so they see what
 *                it sees and the GM moves it), its token unlinked, sight 1 day,
 *                at the region's first location
 *   pins         one per location, linking its page: its icon over the painted
 *                one, "Name (Type)"; one per landmark, linking its section's
 *                page: the star, the landmark's name
 *   routes       one hidden Drawing per route - see makeRoutes - and a pin
 *                halfway along it, linking its page (hazardous ones red)
 *
 * sceneGeometry is pure, for the test.
 */

import { generateRegion, parseRegionCode, SCENE_LIMIT } from "./region-layout.js";
import { nameRegion } from "./region-names.js";
import { paintRegion, loadRegionIcons, toPx, TYPE_ICON, SURROUND, tintOf } from "./region-paint.js";

export const SCENE_FOLDER = "Region Scenes";
export const PARTY_NAME = "Party";
const MAP_DIR = () => `worlds/${game.world.id}/region-maps`;

/**
 * Where the region sits on the Scene. Foundry's "odd-row" hex grid (HEXODDR) with no padding puts the centre of
 * the hex in column c, row R at x = S (c + 1/2 + (R even ? 1/2 : 0)), y = S/sqrt3 + R S sqrt3/2, S the grid size (a
 * hex flat to flat) - its EVEN rows, counted from 0, are the indented ones (measured in Foundry 11.315 with
 * canvas.grid.getCenter, 2026-10-03; assuming the odd rows put every pin half a hex out). The region's axial hex (q, r) sits in row r - r0, r0 the top row of the box; the x origin is chosen so every
 * hex centre lands on such a column, the leftmost at column 0 or more. Returns the painter's view and the Scene's size.
 */
export function sceneGeometry(W, S)
{
  // The size budget was set against the layout's estimate, and the hexes overhang it by up to half a hex a side, so a
  // large region can come out a little over the limit (measured 2026-10-03: 3 of 25 at 100 locations, 100 px, up to
  // 8,300). Then the Scene's hexes are made a few pixels smaller - everything stays aligned and the region unchanged.
  let g = layoutAt(W, S);
  for(let i = 0; i < 4 && Math.max(g.width, g.height) > SCENE_LIMIT; i++) g = layoutAt(W, Math.floor(g.S * SCENE_LIMIT / Math.max(g.width, g.height)));
  return g;
}
function layoutAt(W, S)
{
  const r0 = W.box.rmin, s = S / Math.sqrt(3);
  // hex (q, r) lands on column q + floor((r - r0) / 2) + k; k puts the leftmost at column 0
  const k = -Math.min(...W.terr.map(t => t.q + Math.floor((t.r - r0) / 2)));
  // half a hex further right than an odd-indented grid would want: Foundry indents the even rows
  const view = { s, ox: S * (1 - r0 / 2 + k), oy: s - S * Math.sqrt(3) / 2 * r0 };
  let w = 0, h = 0;
  for(const t of W.terr) { const p = toPx(t, view); w = Math.max(w, p.x + S / 2); h = Math.max(h, p.y + s); }
  return { view, width: Math.ceil(w / S) * S, height: Math.ceil(h), S };
}

/** The region from its journal's flag: the code grows it again; the GM's edits are put back. */
export function regionFromFlag(f)
{
  const W = nameRegion(generateRegion(parseRegionCode(f.code)));
  f.locs.forEach((x, i) => { const L = W.locs[i]; if(!L) return; if(L.type !== x.type) L.edited = true; L.type = x.type; L.name = x.name; L.page = x.page; });
  f.sections.forEach((x, i) => { const s = W.sections[i]; if(!s) return; s.name = x.name; s.page = x.page; });
  f.routes.forEach((x, i) => { const R = W.routes[i]; if(!R) return; R.hazard = x.hazard; R.hazardRoll = x.hazardRoll; R.page = x.page; });
  return W;
}

/** Halfway along a route, in Scene pixels: a hex in its middle, or between the two middle hexes. */
export function routeMiddle(R, view)
{
  const n = R.hexes.length - 1, a = toPx(R.hexes[Math.floor(n / 2)], view), b = toPx(R.hexes[Math.ceil(n / 2)], view);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Each route as a Drawing: a line through its hexes' centres, hidden until the GM reveals it. */
export function makeRoutes(W, view, S)
{
  return W.routes.map(R =>
  {
    const pts = R.hexes.map(h => toPx(h, view));
    const x0 = Math.min(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y));
    const rel = pts.flatMap(p => [Math.round(p.x - x0), Math.round(p.y - y0)]);
    return {
      x: Math.round(x0), y: Math.round(y0), shape: { type: "p", points: rel,
        width: Math.max(...rel.filter((_, i) => i % 2 === 0)), height: Math.max(...rel.filter((_, i) => i % 2 === 1)) },
      strokeWidth: Math.max(3, Math.round(S * 0.07)), strokeColor: R.hazard ? "#ff5a70" : "#d8e1f5", strokeAlpha: 0.9,
      fillType: CONST.DRAWING_FILL_TYPES.NONE, hidden: true,
      flags: { vaarn: { regionRoute: { route: R.id, days: R.days, hazard: R.hazard } } }
    };
  });
}

async function mapDirectory()
{
  const dir = MAP_DIR();
  const world = await FilePicker.browse("data", `worlds/${game.world.id}`);
  if(!world.dirs.includes(dir)) await FilePicker.createDirectory("data", dir);
  return dir;
}

/** The one shared Party actor, made when first needed: players Observer (RULED). */
export async function partyActor()
{
  const found = game.actors.find(a => a.getFlag("vaarn", "regionParty"));
  if(found) return found;
  return Actor.create({ name: PARTY_NAME, type: "npc", img: "icons/svg/mystery-man.svg",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
    prototypeToken: { actorLink: false, sight: { enabled: true, range: 1 }, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY },
    flags: { vaarn: { regionParty: true } } });
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "region";

/** Make the region's Scene from its journal. Returns the Scene. */
export async function makeRegionScene(journal)
{
  const f = journal.getFlag("vaarn", "region");
  if(!f) throw new Error(`${journal.name} is not a region journal.`);
  const W = regionFromFlag(f);
  const g = sceneGeometry(W, W.settings.hexPx), S = g.S;

  // the map: the painter at the Scene's scale, no routes, no text (RULED)
  const canvas = document.createElement("canvas");
  canvas.width = g.width; canvas.height = g.height;
  const icons = await loadRegionIcons();
  paintRegion(canvas.getContext("2d"), W, g.view, { w: g.width, h: g.height }, { routes: false, labels: false, grid: false, icons, dpr: 1 });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
  const file = new File([blob], `${slug(journal.name)}-${journal.id}-${Date.now()}.webp`, { type: "image/webp" });
  const upload = await FilePicker.upload("data", await mapDirectory(), file, {}, { notify: false });
  if(!upload?.path) throw new Error("The region's map did not upload.");

  let folder = game.folders.find(x => x.name === SCENE_FOLDER && x.type === "Scene");
  if(!folder) folder = await Folder.create({ name: SCENE_FOLDER, type: "Scene" });
  const party = await partyActor();
  const start = toPx(W.start, g.view), tall = 2 * S / Math.sqrt(3);
  // the pin's icon the size the map paints it (region-paint.js: a disc of 0.82 hex radii, its icon 1.45 times that),
  // so it sits exactly over the painted one and the place itself is the link (RULED 2026-10-03, Matt: a smaller
  // copy on top looked like a bug)
  const pinSize = Math.round((S / Math.sqrt(3)) * 0.82 * 1.45);
  const tokenData = (await party.getTokenDocument({ x: Math.round(start.x - S / 2), y: Math.round(start.y - tall / 2), actorLink: false,
    sight: { enabled: true, range: 1 } })).toObject();

  const scene = await Scene.create({
    name: journal.name, folder: folder.id, active: false, navigation: false,
    width: g.width, height: g.height, padding: 0, backgroundColor: SURROUND,
    background: { src: upload.path },
    grid: { type: CONST.GRID_TYPES.HEXODDR, size: S, distance: 1, units: "days", alpha: 0.15 },
    // global light OFF: in Foundry 11 a token sees everything lit in its line of sight at any range, so with global
    // light on the party saw the whole map; off, with darkness 0, it sees its range in full colour and explored
    // ground stays as remembered map (tested 2026-10-03, Group 493)
    tokenVision: true, fogExploration: true, globalLight: false, darkness: 0,
    initial: { x: Math.round(start.x), y: Math.round(start.y), scale: 0.6 },
    // a GM pin per location: GM-only, as its page is (a pin follows its page's permission); global, so the GM sees
    // it wherever the party token cannot
    notes: W.locs.map(L => { const p = toPx(L, g.view); return {
      entryId: journal.id, pageId: L.page, x: Math.round(p.x), y: Math.round(p.y), global: true,
      texture: { src: `systems/vaarn/module/icons/region/${TYPE_ICON[L.type]}.svg`, tint: tintOf(W.sections[L.section]?.landscape) },
      iconSize: pinSize, text: `${L.name || "Unnamed"} (${L.type})`, fontSize: 24, textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM }; })
      // a landmark's pin (Matt, 2026-10-03): the star, the size the map paints it, linking its section's page,
      // which is where the landmark is written
      .concat(W.sections.filter(sec => sec.landmark?.hex && sec.page).map(sec => { const p = toPx(sec.landmark.hex, g.view); return {
        entryId: journal.id, pageId: sec.page, x: Math.round(p.x), y: Math.round(p.y), global: true,
        texture: { src: "systems/vaarn/module/icons/region/landmark-star.svg", tint: "#fff4d6" },
        iconSize: Math.round(2 * Math.max(6.5, g.view.s * 0.66)), text: sec.landmark.name, fontSize: 22, textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM }; }))
      // a route's pin (RULED 2026-10-03, Matt): halfway along it, linking its page, where it is revealed
      .concat(W.routes.filter(R => R.page).map(R => { const p = routeMiddle(R, g.view); return {
        entryId: journal.id, pageId: R.page, x: Math.round(p.x), y: Math.round(p.y), global: true,
        texture: { src: R.hazard ? "icons/svg/hazard.svg" : "systems/vaarn/module/icons/region/route-signpost.svg", tint: R.hazard ? "#ff5a70" : "#d8e1f5" },
        iconSize: Math.round(S * 0.32), text: `Route ${R.id + 1}: ${R.days} day${R.days === 1 ? "" : "s"}${R.hazard ? ", " + R.hazard : ""}`, fontSize: 18,
        textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM }; })),
    drawings: makeRoutes(W, g.view, S),
    flags: { vaarn: { regionScene: { journalId: journal.id } } }
  });
  // The party token is made after the Scene: made inside Scene.create its actor delta was stored with a null id,
  // and a player's client then had no actor for the token - no vision through it (found 2026-10-03, Group 493).
  delete tokenData.delta; delete tokenData._id;
  await scene.createEmbeddedDocuments("Token", [tokenData]);
  await journal.setFlag("vaarn", "region", { ...f, scene: scene.id });
  return scene;
}
