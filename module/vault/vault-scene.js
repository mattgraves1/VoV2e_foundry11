/**
 * Vault Scene (foundry-system-index.csv row of that name) - the Foundry side.
 *
 * Makes one player-facing hex Scene per level of a generated vault, from the
 * vaultMap flag vault-journal.js leaves on the journal (RULED 2026-09-27, Matt):
 *
 *   the map     a plain outline, drawn to a PNG in the world's vault-maps
 *               folder and set as the background - the GM downloads it, dresses
 *               it with art, and sets the edited file back as the background
 *               through Foundry's own Scene settings;
 *   walls       on every outline, with the doors vault-scene-geometry.js placed;
 *               token vision and fog of war on, and the Scene starts dark;
 *   pins        one per room, linking its page - GM-only, as the pages are;
 *   the level   a flag, so activating the Scene sets the party's vault level for
 *               the exploration clock (Vault Encounters from the Exploration Clock).
 *
 * Made from the Generate Vault window and from the vault journal's Overview.
 */

import { buildLevel, mapLevels, HEX, obstructionPins } from "./vault-scene-geometry.js";
import { setPartyLocation } from "./vault-encounters.js";

export const SCENE_FOLDER = "Vault Scenes";
const MAP_DIR = () => `worlds/${game.world.id}/vault-maps`;

const COLOURS = { rock: "#161412", floor: "#cfc8b8", wall: "#3b342c" };

/** The level drawn as a PNG File: rock, the floor inside its outline, the outline. */
async function drawLevel(level, fileName)
{
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(level.width * level.scale);
  canvas.height = Math.round(level.height * level.scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLOURS.rock;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(level.scale, level.scale);
  const path = new Path2D();
  for(const loop of level.loops)
  {
    path.moveTo(...loop[0]);
    for(const p of loop.slice(1)) path.lineTo(...p);
    path.closePath();
  }
  ctx.fillStyle = COLOURS.floor;
  ctx.fill(path, "evenodd");
  ctx.strokeStyle = COLOURS.wall;
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.stroke(path);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  return new File([blob], fileName, { type: "image/png" });
}

async function mapDirectory()
{
  const dir = MAP_DIR();
  const world = await FilePicker.browse("data", `worlds/${game.world.id}`);
  if(!world.dirs.includes(dir)) await FilePicker.createDirectory("data", dir);
  return dir;
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "vault";

/** Make a Scene for every level of a vault journal. Returns the Scenes. */
export async function makeVaultScenes(journal)
{
  const map = journal.getFlag("vaarn", "vaultMap");
  if(!map) throw new Error(`${journal.name} was made before vault Scenes; generate the vault again to map it.`);
  let folder = game.folders.find(f => f.name === SCENE_FOLDER && f.type === "Scene");
  if(!folder) folder = await Folder.create({ name: SCENE_FOLDER, type: "Scene" });
  const dir = await mapDirectory();
  const levels = mapLevels(map);
  // Where the party comes in: the entrance on level 1, a shaft landing below.
  const landing = z =>
  {
    if(z === levels[0]) return map.entrance;
    const down = map.edges.find(e => e.down && (map.rooms[e.a].z === z || map.rooms[e.b].z === z));
    return down ? (map.rooms[down.a].z === z ? down.a : down.b) : null;
  };
  const scenes = [];
  for(const z of levels)
  {
    const level = buildLevel(map, z);
    const n = z + 1;
    const file = await drawLevel(level, `${slug(journal.name)}-${journal.id}-level-${n}-${Date.now()}.png`);
    const upload = await FilePicker.upload("data", dir, file, {}, { notify: false });
    if(!upload?.path) throw new Error(`The map for level ${n} did not upload.`);
    const start = level.rooms.find(r => r.id === landing(z)) ?? level.rooms[0];
    const scene = await Scene.create({
      name: `${journal.name} - Level ${n}`, folder: folder.id, active: false, navigation: false,
      width: level.width, height: level.height, padding: 0, backgroundColor: COLOURS.rock,
      background: { src: upload.path },
      grid: { type: CONST.GRID_TYPES.HEXODDR, size: HEX, distance: 5, units: "ft" },
      tokenVision: true, fogExploration: true, globalLight: false, darkness: 1,
      initial: { x: Math.round(start.x), y: Math.round(start.y), scale: 0.5 },
      walls: level.walls.map(w => ({ c: w.c, door: w.door ? CONST.WALL_DOOR_TYPES.DOOR : CONST.WALL_DOOR_TYPES.NONE })),
      // global: the pin shows even where the Referee's selected token cannot
      // see (Matt, 2026-09-28). Players never see it either way: the room
      // pages are GM-only, and a pin follows its page's permission.
      notes: [
        ...level.rooms.map(r => ({ entryId: journal.id, pageId: r.page, x: Math.round(r.x), y: Math.round(r.y), text: r.name, fontSize: 28, global: true })),
        // An obstructed corridor's pin (RULED 2026-09-28, Matt): its page, the hazard icon, the obstacle's name.
        ...obstructionPins(level, map).map(p => ({ entryId: journal.id, pageId: p.page, x: Math.round(p.x), y: Math.round(p.y),
                                                     text: p.obstacle, fontSize: 22, global: true, texture: { src: "icons/svg/hazard.svg" } }))
      ],
      flags: { vaarn: { vaultScene: { journalId: journal.id, level: n } } }
    });
    scenes.push(scene);
  }
  return scenes;
}

/** A vault level's Scene made active sets the party's vault level (RULED 2026-09-27, Matt). */
export function registerVaultScenes()
{
  Hooks.on("updateScene", async (scene, change) =>
  {
    if(change.active !== true || !game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const f = scene.getFlag("vaarn", "vaultScene");
    if(!f || !game.journal.get(f.journalId)) return;
    await setPartyLocation(f.journalId, f.level);
    ui.notifications.info(`The party is on ${game.journal.get(f.journalId).name}, level ${f.level}: vault Encounters roll its table.`);
  });
}
