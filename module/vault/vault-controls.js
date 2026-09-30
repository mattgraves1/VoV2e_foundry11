/**
 * Contents Buttons on Vault Pages (foundry-system-index.csv row of that name).
 *
 * A generated vault leaves each lair and treasure room "not yet rolled", so
 * only what the party reaches is ever created (RULED 2026-09-27, Matt). This
 * puts the controls for them on the vault journal, for the GM, while a page is
 * viewed - the way Hazard Controls on Journal Pages does for hazards:
 *
 *   a room page    "Roll the lair (Depth N)", "Create the treasure room (Depth N)"
 *   the Overview   "Roll every room", and "Roll level N" for each level with
 *                  anything left
 *
 * A roll spawns the creatures or creates the container exactly as Generate Room
 * Contents does (room-contents.js createRoomDocuments), writes what was rolled
 * over the page's "not yet rolled" line, links included, and notifies; there is
 * no chat card (RULED 2026-09-27, Matt). What waits is read from the page's
 * vaultRoom flag, written by vault-journal.js, never from its text; each piece is
 * marked "rolling" before anything is created, so a second click cannot roll it
 * again, and "done" after.
 */

import { createRoomDocuments, lairLines, treasureLines, specialLines } from "./room-contents.js";
import { SPECIAL_FOLLOW_UPS } from "./special-rooms.js";

// The "not yet rolled" line roomLines writes. Foundry may store the arrow as
// the character itself rather than &rarr;.
const PENDING_LINE = {
  // A lair rolled as text at generation says what it holds before "not yet spawned".
  lair: depth => new RegExp(`<p><b>(?:&rarr;|→) Lair \\(Depth ${depth}\\):</b> (?:not yet rolled|[^<]*? - not yet spawned)</p>`),
  treasure: depth => new RegExp(`<p><b>(?:&rarr;|→) Treasure Room \\(Depth ${depth}\\):</b> not yet rolled</p>`),
  // A special room's item or daemon (Special Room Follow-ups), by the name the table prints.
  special: (depth, name) => new RegExp(`<p><b>(?:&rarr;|→) ${String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:</b> not yet created</p>`)
};

/** A room page's text with its "not yet rolled" line for `what` replaced by `lines`; null when that line is not there. Pure. */
export function replacePending(html, what, depth, lines, specialName = null)
{
  const re = PENDING_LINE[what](depth, specialName);
  return re.test(html) ? html.replace(re, lines.join("")) : null;
}

/** The pieces a room page still waits for. */
export function pendingOf(page)
{
  const f = page.getFlag?.("vaarn", "vaultRoom") ?? page.flags?.vaarn?.vaultRoom;
  if(!f) return [];
  return ["lair", "treasure", "special"].filter(w => f[w] === "pending");
}

// Pieces being rolled on this client. Claimed before the first await: the flag
// alone did not hold - Group 461 found two quick clicks both reading "pending"
// before the first "rolling" was saved, creating two containers and leaving the
// page's text overwritten by the slower roll.
const inFlight = new Set();

/**
 * Roll one waiting piece of a room page. Returns a short summary, or null if it was
 * not waiting. `restoreView` false leaves the journal where it is (Roll every room).
 */
export async function rollPending(page, what, { restoreView = true } = {})
{
  // One roll per PAGE at a time: a room's lair and treasure write the same text.
  // Each writes only its own field of the flag, never the whole flag from a copy.
  const f = page.getFlag("vaarn", "vaultRoom");
  if(!f || f[what] !== "pending" || inFlight.has(page.uuid)) return null;
  inFlight.add(page.uuid);
  let created = false;
  try
  {
    await page.update({ [`flags.vaarn.vaultRoom.${what}`]: "rolling" });
    const room = await createRoomDocuments({ follow: { lair: what === "lair", treasure: what === "treasure" },
                                             lairPlan: what === "lair" ? (f.lairPlan ?? null) : null,
                                             specialCreate: what === "special" ? f.specialName : null }, f.depth, { label: page.name });
    created = true;
    const lines = what === "lair" ? lairLines(room.lair, f.depth).page
                : what === "treasure" ? treasureLines(room.treasure).page
                : specialLines(room.special, f.specialName).page;
    const now = page.text.content;
    const text = replacePending(now, what, f.depth, lines, f.specialName) ?? now + lines.join("");
    // A text page's sheet saves its form when it closes (Foundry 11 JournalTextPageSheet),
    // and re-rendered for the update it still holds the text from before the roll, so
    // closing it wrote "not yet rolled" back over the result (Group 461). Close any open
    // sheet of the page without saving first, then put the view back.
    const journalOpen = page.parent?.sheet?.rendered, pageOpen = page.sheet?.rendered;
    if(pageOpen) await page.sheet.close({ submit: false });
    await page.update({ "text.content": text, [`flags.vaarn.vaultRoom.${what}`]: "done" });
    if(restoreView && journalOpen) page.parent.sheet.render(true, { pageId: page.id });
    else if(restoreView && pageOpen) page.sheet.render(true, { editable: false });
    return what === "lair" ? `the lair in ${page.name}: ${room.lair.result}`
         : what === "treasure" ? `${page.name}: ${room.treasure.actor.name}`
         : `${SPECIAL_FOLLOW_UPS[f.specialName]?.label ?? f.specialName} in ${page.name}: ${room.special.actor.name}`;
  }
  catch(err)
  {
    // Nothing created: it can be rolled again. Something created: leave it marked, so a retry cannot duplicate it.
    if(!created) await page.update({ [`flags.vaarn.vaultRoom.${what}`]: "pending" });
    throw err;
  }
  finally { inFlight.delete(page.uuid); }
}

/** Roll everything still waiting on these pages, in page order. Returns how many lairs and treasure rooms. */
export async function rollAllPending(pages)
{
  const done = { lair: 0, treasure: 0, special: 0 };
  for(const page of [...pages].sort((a, b) => a.sort - b.sort))
    for(const what of pendingOf(page)) if(await rollPending(page, what, { restoreView: false })) done[what]++;
  return done;
}

function buttonsFor(page)
{
  const f = page.getFlag("vaarn", "vaultRoom");
  if(f)
  {
    const labels = { lair: f.lairPlan ? `Spawn the lair (Depth ${f.depth})` : `Roll the lair (Depth ${f.depth})`, treasure: `Create the treasure room (Depth ${f.depth})`,
                     special: `Create ${SPECIAL_FOLLOW_UPS[f.specialName]?.label ?? f.specialName}` };
    const waiting = pendingOf(page);
    if(!waiting.length) return null;
    const box = $(`<div class="vaarn-trap-card vaarn-vault-controls">${waiting.map(w => `<button type="button" data-what="${w}">${labels[w]}</button>`).join("")}</div>`);
    box.find("button").click(async ev =>
    {
      ev.preventDefault();
      ev.currentTarget.disabled = true;
      try
      {
        const summary = await rollPending(page, ev.currentTarget.dataset.what);
        if(summary) ui.notifications.info(`Rolled ${summary}.`);
      }
      catch(err) { console.error(err); ui.notifications.error(`That roll failed: ${err.message}`); ev.currentTarget.disabled = false; }
    });
    return box;
  }
  const enc = page.getFlag("vaarn", "vaultEncounters");
  if(enc) return encounterButtons(page, enc);
  if(!page.getFlag("vaarn", "vaultOverview")) return null;
  const rooms = page.parent.pages.contents.filter(p => pendingOf(p).length);
  // Vault Scene: a Scene per level, for a journal that carries its map.
  const mapped = !!page.parent.getFlag("vaarn", "vaultMap");
  if(!rooms.length && !mapped) return null;
  const levels = [...new Set(rooms.map(p => p.getFlag("vaarn", "vaultRoom").level))].sort((a, b) => a - b);
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls">`
    + (rooms.length ? `<button type="button" data-level="all">Roll every room</button>` : "")
    + levels.map(l => `<button type="button" data-level="${l}">Roll level ${l}</button>`).join("")
    + (mapped ? `<button type="button" data-scenes="make">Make a Scene per level</button>` : "") + `</div>`);
  box.find("button[data-scenes]").click(async ev =>
  {
    ev.preventDefault();
    ev.currentTarget.disabled = true;
    try
    {
      const { makeVaultScenes } = await import("./vault-scene.js");
      const scenes = await makeVaultScenes(page.parent);
      ui.notifications.info(`Made ${scenes.length} Scene${scenes.length === 1 ? "" : "s"} for ${page.parent.name}, in the Vault Scenes folder.`);
    }
    catch(err) { console.error(err); ui.notifications.error(`Making the Scenes failed: ${err.message}`); }
    ev.currentTarget.disabled = false;
  });
  box.find("button[data-level]").click(async ev =>
  {
    ev.preventDefault();
    box.find("button").prop("disabled", true);
    const level = ev.currentTarget.dataset.level;
    const pages = page.parent.pages.contents.filter(p => pendingOf(p).length && (level === "all" || p.getFlag("vaarn", "vaultRoom").level === Number(level)));
    try
    {
      const n = await rollAllPending(pages);
      ui.notifications.info(`Rolled ${n.lair} lair${n.lair === 1 ? "" : "s"}, ${n.treasure} treasure room${n.treasure === 1 ? "" : "s"} and ${n.special} special room${n.special === 1 ? "" : "s"}${level === "all" ? "" : ` on level ${level}`}.`);
    }
    catch(err) { console.error(err); ui.notifications.error(`Rolling stopped: ${err.message}`); }
    if(page.parent.sheet?.rendered) page.parent.sheet.render(true, { pageId: page.id });
    else page.sheet?.render(false);
  });
  return box;
}

export function registerVaultControls()
{
  Hooks.on("renderJournalPageSheet", (sheet, html) =>
  {
    if(!game.user.isGM || sheet.isEditable) return;
    const box = buttonsFor(sheet.document);
    if(!box) return;
    const content = html.filter(".journal-page-content").add(html.find(".journal-page-content"));
    (content.length ? content : html.last()).append(box);
  });
}

/**
 * A level's encounter table (Floor Encounter Table): roll it, then spawn ONE of
 * what came up - its sheet's Roll Encounter rolls the group by its ENC (RULED
 * 2026-09-27, Matt). The roll shows in the box and a notification; no chat card.
 */
function encounterButtons(page, enc)
{
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"><button type="button" data-encounter="roll">Roll an encounter (d${enc.entries.length})</button>`
    + `<button type="button" data-encounter="here"></button><p class="vaarn-encounter-result"></p></div>`);
  // Vault Encounters from the Exploration Clock: record this level as where the
  // party is, so the clock's Encounter results roll this table.
  const here = box.find('button[data-encounter="here"]');
  const showHere = async () =>
  {
    const { partyLocation } = await import("./vault-encounters.js");
    const loc = partyLocation();
    const isHere = !!loc && loc.journalId === page.parent.id && loc.level === enc.level;
    here.text(isHere ? "The party is on this level" : "The party is on this level: record it").prop("disabled", isHere);
  };
  showHere();
  here.click(async ev =>
  {
    ev.preventDefault();
    const { setPartyLocation } = await import("./vault-encounters.js");
    await setPartyLocation(page.parent.id, enc.level);
    ui.notifications.info(`The party is on ${page.parent.name}, level ${enc.level}: vault Encounters roll its table.`);
    showHere();
  });
  box.find('button[data-encounter="roll"]').click(async ev =>
  {
    ev.preventDefault();
    const roll = await new Roll(`1d${enc.entries.length}`).evaluate();
    const e = enc.entries[roll.total - 1];
    const where = e.source === "lair" ? `the lair in ${e.room}` : e.source === "hazard" ? `the hazard in ${e.room}` : `Lair Rooms, Depth ${enc.level}`;
    ui.notifications.info(`Encounter on level ${enc.level}: ${roll.total} - ${e.name}, from ${where}.`);
    const out = box.find(".vaarn-encounter-result").empty();
    out.append(`<b>${roll.total}: ${e.name}</b> `);
    const spawn = $(`<button type="button" data-encounter="spawn">Spawn one ${e.name}</button>`);
    spawn.click(async sev =>
    {
      sev.preventDefault();
      sev.currentTarget.disabled = true;
      try
      {
        const { spawnNamedCreature } = await import("/systems/vaarn/module/actor/bestiary-spawn.js");
        let folder = game.folders.find(f => f.name === "Generated Creatures" && f.type === "Actor");
        if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });
        const actor = await spawnNamedCreature(e.name, { folder: folder.id });
        if(!actor) throw new Error(`${e.name} is not in the Bestiary.`);
        ui.notifications.info(`Spawned ${actor.name} in "Generated Creatures"; its sheet's Roll Encounter rolls how many.`);
        actor.sheet.render(true);
      }
      catch(err) { console.error(err); ui.notifications.error(`That spawn failed: ${err.message}`); sev.currentTarget.disabled = false; }
    });
    out.append(spawn);
  });
  return box;
}
