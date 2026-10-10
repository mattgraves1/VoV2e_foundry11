/**
 * Settlement Creation (foundry-system-index.csv row of that name) - the map Scene, chunk 3 of the build plan
 * (RULED 2026-10-08, Matt):
 *
 *   the map      painted into the background at the Scene's own scale: the blue ground, the paler ground inside the
 *                dotted wall, the roads (the main road broader), the small dwellings, the gathering places and the
 *                settlement's name - the town's layout, which players see
 *   the grid     none: a town map is neither a battle map nor a travel map (RULED)
 *   the Scene    sized to fit the wall and every location (RULED); no token vision or fog
 *   locations    each a hidden icon TILE (module/icons/settlement, the icon on its kind's disc) and a hidden text
 *                LABEL, shown together when the GM reveals the place (chunk 4); and a GM pin linking its page.
 *                The major problem is a GM pin only (RULED): it has no tile and no label.
 *
 * The Scene is rebuilt from the journal's `settlement` flag (its seed, settings and moves), so the map is the
 * settlement its pages describe. sceneGeometry is pure, for the test; the rest is Foundry's.
 */

import { generateSettlement } from "./settlement-generator.js";
import { ICON_FILES } from "./settlement-data.js";

export const SETTLEMENT_SCENE_FOLDER = "Settlement Scenes";
/** Scene pixels per sheet unit: the Settlement Lab's 4,000-pixel sheet width, which Matt's settings were seen at. */
export const SCENE_SCALE = 4000 / 1414;
const GROUND = "#23427a", SURROUND = "#0d1533", INSIDE = "#334f86", WALL = "#e9dcc0", MAJOR = "#e8d6a8", MINOR = "#b9a985",
  DWELLING = "rgba(225,214,190,0.55)", GATHER = "#7fd3a8";
const MAP_DIR = () => `worlds/${game.world.id}/settlement-maps`;

/** A settlement rebuilt from its journal's flag: the same rolls, the GM's moves, the name it was given. */
export function settlementFromFlag(f)
{
  const g = generateSettlement(f.settings, { moves: new Map(Object.entries(f.moves ?? {})) });
  g.name = f.name;
  return g;
}

/** Where the settlement sits on its Scene: the bounds round its wall, at SCENE_SCALE. Pure. */
export function sceneGeometry(g, scale = SCENE_SCALE)
{
  const M = Math.min(g.sheet.width, g.sheet.height);
  const width = Math.round(g.bounds.width * scale), height = Math.round(g.bounds.height * scale);
  const at = (x, y) => ({ x: (x - g.bounds.x) * scale, y: (y - g.bounds.y) * scale });
  // a location's marker: the Settlement Lab's disc, 2.2% of the sheet's shorter side in radius, a little over
  const pin = Math.round(2 * 1.05 * M * 0.022 * scale);
  return { width, height, scale, at, pin, unit: M * scale };
}

/** The icon file for a location, or null for the problem (a GM pin only). */
export function iconFile(d)
{
  const f = d.kind === "building" ? ICON_FILES.building[d.type] : d.kind === "seat" ? ICON_FILES.seat["Seat of power"]
    : d.kind === "water" ? ICON_FILES.water[d.name] : d.kind === "asset" ? ICON_FILES.asset[d.name] : d.kind === "landmark" ? ICON_FILES.landmark.Landmark : null;
  return f ? `systems/vaarn/module/icons/settlement/${f}` : null;
}

/** Paint the town's layout - what players see - onto a canvas the Scene's size. */
export function paintSettlement(ctx, g, geo)
{
  const { at, scale, unit } = geo;
  ctx.fillStyle = GROUND; ctx.fillRect(0, 0, geo.width, geo.height);
  const poly = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => { const p = at(x, y); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); };
  // inside the wall: a paler ground, then the wall dotted round it
  poly(g.wall); ctx.fillStyle = INSIDE; ctx.fill();
  ctx.setLineDash([unit * 0.012, unit * 0.01]); ctx.lineWidth = unit * 0.005; ctx.strokeStyle = WALL; ctx.stroke(); ctx.setLineDash([]);
  // roads: the minor ones first, the main road over them
  ctx.lineCap = "round";
  for(const major of [false, true]) for(const rd of g.roads) if(rd.major === major)
  {
    const a = at(rd.a.x, rd.a.y), c = at(rd.cx, rd.cy), b = at(rd.b.x, rd.b.y);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.strokeStyle = major ? MAJOR : MINOR; ctx.globalAlpha = major ? 0.9 : 0.75; ctx.lineWidth = unit * (major ? 0.014 : 0.007); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // small dwellings, then the gathering places
  ctx.fillStyle = DWELLING;
  for(const w of g.dwellings) { const p = at(w.x, w.y), s = w.size * scale; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(w.rot); ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4); ctx.restore(); }
  for(const gp of g.gathers)
  {
    const p = at(gp.x, gp.y);
    ctx.beginPath(); ctx.arc(p.x, p.y, unit * 0.016, 0, Math.PI * 2); ctx.fillStyle = GATHER; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = unit * 0.003; ctx.strokeStyle = SURROUND; ctx.stroke();
  }
  // the name, top left
  const fs = Math.round(unit * 0.04);
  ctx.font = `${fs}px Federo, "Trebuchet MS", sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "top";
  const o = at(g.bounds.x, g.bounds.y);  // the map's top left: the Scene's corner, or wherever a preview has it
  ctx.lineWidth = fs * 0.2; ctx.strokeStyle = "rgba(13,21,51,0.85)"; ctx.strokeText(g.name, o.x + unit * 0.03, o.y + unit * 0.025);
  ctx.fillStyle = "#ece6ee"; ctx.fillText(g.name, o.x + unit * 0.03, o.y + unit * 0.025);
}

/** A location's hidden tile, hidden label and GM pin, as Scene embedded data. Pure. */
export function placeData(g, geo, journalId, pageIds)
{
  const tiles = [], drawings = [], notes = [];
  const fontSize = Math.max(18, Math.round(geo.unit * 0.016));
  for(const d of g.locations)
  {
    const p = geo.at(d.x, d.y), src = iconFile(d), pageId = pageIds?.[d.id];
    notes.push({ entryId: journalId, pageId, x: Math.round(p.x), y: Math.round(p.y), global: true,
      texture: src ? { src } : { src: "icons/svg/hazard.svg", tint: "#ff5a70" }, iconSize: Math.round(geo.pin * (src ? 1 : 0.7)),
      text: d.kind === "problem" ? `${d.name} (GM only)` : d.name, fontSize, textAnchor: globalThis.CONST?.TEXT_ANCHOR_POINTS?.BOTTOM ?? 2 });
    if(!src) continue;  // the problem: a GM pin only (RULED)
    tiles.push({ texture: { src }, x: Math.round(p.x - geo.pin / 2), y: Math.round(p.y - geo.pin / 2), width: geo.pin, height: geo.pin,
      hidden: true, flags: { vaarn: { settlementTile: { id: d.id } } } });
    const w = Math.round(geo.pin * 4), h = Math.round(fontSize * 1.6);
    drawings.push({ shape: { type: "r", width: w, height: h }, x: Math.round(p.x - w / 2), y: Math.round(p.y + geo.pin / 2 + 2),
      text: d.name, fontSize, fontFamily: "Signika", textColor: "#ece6ee", fillType: 0, strokeWidth: 0, hidden: true,
      flags: { vaarn: { settlementLabel: { id: d.id } } } });
  }
  return { tiles, drawings, notes };
}

async function mapDirectory()
{
  const dir = MAP_DIR();
  const world = await FilePicker.browse("data", `worlds/${game.world.id}`);
  if(!world.dirs.includes(dir)) await FilePicker.createDirectory("data", dir);
  return dir;
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "settlement";

/** Make a settlement's Scene from its journal. Returns the Scene. Foundry only. */
export async function makeSettlementScene(journal)
{
  const f = journal.getFlag("vaarn", "settlement");
  if(!f) throw new Error(`${journal.name} is not a settlement journal.`);
  const g = settlementFromFlag(f), geo = sceneGeometry(g);
  // the font the name is painted in must be loaded before the canvas draws it, or the fallback is painted
  try { await document.fonts.load(`${Math.round(geo.unit * 0.04)}px Federo`); } catch(e) { /* the fallback is painted */ }
  const canvas = document.createElement("canvas");
  canvas.width = geo.width; canvas.height = geo.height;
  paintSettlement(canvas.getContext("2d"), g, geo);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
  const file = new File([blob], `${slug(journal.name)}-${journal.id}-${Date.now()}.webp`, { type: "image/webp" });
  const upload = await FilePicker.upload("data", await mapDirectory(), file, {}, { notify: false });
  if(!upload?.path) throw new Error("The settlement's map did not upload.");

  let folder = game.folders.find(x => x.name === SETTLEMENT_SCENE_FOLDER && x.type === "Scene");
  if(!folder) folder = await Folder.create({ name: SETTLEMENT_SCENE_FOLDER, type: "Scene" });
  const { tiles, drawings, notes } = placeData(g, geo, journal.id, f.pages?.locations);
  const scene = await Scene.create({
    name: journal.name, folder: folder.id, active: false, navigation: false,
    width: geo.width, height: geo.height, padding: 0, backgroundColor: SURROUND, background: { src: upload.path },
    grid: { type: CONST.GRID_TYPES.GRIDLESS, size: 100, distance: 1, units: "" },
    tokenVision: false, fogExploration: false, globalLight: true, darkness: 0,
    initial: { x: Math.round(geo.width / 2), y: Math.round(geo.height / 2), scale: 0.5 },
    tiles, drawings, notes,
    flags: { vaarn: { settlementScene: { journalId: journal.id } } }
  });
  await journal.setFlag("vaarn", "settlement", { ...f, scene: scene.id });
  return scene;
}
