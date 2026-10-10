/**
 * Region Generator (foundry-system-index.csv row of that name) - the GM's
 * controls on a region's journal pages, while a page is viewed (the way the
 * vault journal's controls work). RULED 2026-10-03 (Matt), the journal-controls
 * plan, step A with C:
 *
 *   a Vault page       "Generate this vault..." opens the Vault Settings Tuner
 *                      on the Module Default with a new seed and the location's
 *                      name; the vault it makes is linked from the page and the
 *                      button goes
 *   a route page       "Reveal on the map" / "Hide from players" shows or hides
 *                      the route's Drawing on the region's Scene; a Lair hazard
 *                      has "Roll the lair": the Lair generator's columns, each
 *                      rolled on its own, written over the page's "not rolled"
 *                      line, its inhabitants then spawnable
 *   any route link     an eye beside every link to a route page - on the
 *                      Overview's route table and a location's route lines -
 *                      shows whether players can see it and toggles it
 *   a section page     "Roll an encounter (dN)" rolls the section's table
 *                      (region-encounters.js) and offers Spawn one for a
 *                      creature; "The party is in this section" records it, so
 *                      the Exploration Clock's Desert encounters roll it (step B)
 *   a location page    "Make an NPC here" runs Generate NPC, "Other..." the other
 *                      Actor makers and the character creator; the next Actor
 *                      the GM makes is linked under "People here" (step D)
 *   a Settlement page  "Build this settlement" makes its whole settlement - journal
 *                      and map - from the overview on the page (settlement-controls.js,
 *                      Settlement Creation chunk 7, 2026-10-08)
 *   Follow-up rolls    a button for each result that names something the module
 *                      makes (follow-up.js, Follow-Up Roll Button row, 2026-10-08)
 *   Spawn buttons      "Spawn one ..." for each Bestiary creature a page's
 *                      details name (its regionSpawns flag), into Generated
 *                      Creatures, as vault rooms do; its sheet's Roll Encounter
 *                      rolls how many
 */

import { rollColumns, detailsHtml } from "./region-details.js";
import { spawnsOf } from "./region-journal.js";
import { followUpBox } from "./follow-up.js";
import { settlementBuildBox } from "../settlement/settlement-controls.js";

// Redraw a page where the GM sees it: inside its open journal, or its own sheet.
const rerender = page => page.parent?.sheet?.rendered ? page.parent.sheet.render(false) : page.sheet?.render(false);

const VAULT_PENDING = /<p class="region-vault-pending">.*?<\/p>/;
const LAIR_PENDING = /<p class="region-lair-pending">.*?<\/p>/;

/** Link a vault journal from a region's Vault page. */
export async function linkVault(page, journal)
{
  const text = page.text.content ?? "";
  const line = `<p><b>The vault:</b> @UUID[${journal.uuid}]{${journal.name}}</p>`;
  await page.update({ "text.content": VAULT_PENDING.test(text) ? text.replace(VAULT_PENDING, line) : text + line,
                      "flags.vaarn.regionVault.generated": journal.uuid });
}

/** A route's Drawing on its region's Scene, or null when the region has no Scene (yet) or the Drawing is gone. */
export function routeDrawing(journal, route)
{
  const scene = game.scenes.get(journal.getFlag("vaarn", "region")?.scene);
  return scene?.drawings.find(d => d.getFlag("vaarn", "regionRoute")?.route === route) ?? null;
}

// A route's colour (RULED 2026-10-03, Matt): a hazardous route revealed to players is drawn like a safe one unless
// its hazard is shown - the party may travel without asking about the way. While hidden it stays red, for the GM.
export const ROUTE_SAFE = "#d8e1f5", ROUTE_HAZARD = "#ff5a70";
export function routeColour({ hazard, hidden, hazardShown })
{
  return hazard && (hidden || hazardShown) ? ROUTE_HAZARD : ROUTE_SAFE;
}

async function toggleRoute(journal, route)
{
  const d = routeDrawing(journal, route);
  if(!d) { ui.notifications.warn("This region has no Scene with that route on it."); return; }
  const f = d.getFlag("vaarn", "regionRoute") ?? {};
  const hidden = !d.hidden;
  await d.update({ hidden, strokeColor: routeColour({ hazard: f.hazard, hidden, hazardShown: f.hazardShown }) });
  ui.notifications.info(`Route ${route + 1} is ${hidden ? "hidden from players" : "shown to players, where they have seen it"}`
    + (!hidden && f.hazard && !f.hazardShown ? " - drawn like a safe route; its page can show its hazard." : "."));
}

/** Show or hide a revealed hazardous route's hazard: red for everyone, or drawn like a safe route. */
async function toggleHazard(journal, route)
{
  const d = routeDrawing(journal, route);
  if(!d) return;
  const f = d.getFlag("vaarn", "regionRoute") ?? {};
  const hazardShown = !f.hazardShown;
  await d.update({ "flags.vaarn.regionRoute.hazardShown": hazardShown, strokeColor: routeColour({ hazard: f.hazard, hidden: d.hidden, hazardShown }) });
  ui.notifications.info(`Route ${route + 1}'s hazard is ${hazardShown ? "shown: drawn red" : "not shown: drawn like a safe route"}.`);
}

function vaultBox(page)
{
  const f = page.getFlag("vaarn", "regionVault");
  if(!f || f.generated) return null;
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"><button type="button"
    title="Opens the Vault Settings Tuner on the Module Default with a new seed and this location's name.">Generate this vault...</button></div>`);
  box.find("button").click(async ev =>
  {
    ev.preventDefault();
    try
    {
      const { openVaultTuner } = await import("../vault/vault-tuner.js");
      const { MODULE_DEFAULT, newSeed } = await import("../vault/vault-layout.js");
      const name = f.name || page.name.replace(/^\d+\.\s*/, "");
      openVaultTuner({ ...MODULE_DEFAULT, seed: newSeed() }, { name, onGenerated: journal => linkVault(page, journal) });
    }
    catch(err) { console.error(err); ui.notifications.error(`Opening the Vault Settings Tuner failed: ${err.message}`); }
  });
  return box;
}

function routeBox(page)
{
  const f = page.getFlag("vaarn", "regionRoute");
  if(!f) return null;
  const d = routeDrawing(page.parent, f.route);
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"></div>`);
  const eye = $(`<button type="button" ${d ? "" : "disabled title=\"This region has no Scene with this route on it.\""}>${!d ? "No Scene" : d.hidden ? "Reveal on the map" : "Hide from players"}</button>`);
  eye.click(async ev => { ev.preventDefault(); await toggleRoute(page.parent, f.route); rerender(page); });
  box.append(eye);
  // a revealed hazardous route: show its hazard (red), or keep it looking safe
  const rf = d?.getFlag("vaarn", "regionRoute");
  if(d && !d.hidden && rf?.hazard)
  {
    const hz = $(`<button type="button" title="Players see a revealed hazardous route drawn like a safe one until its hazard is shown.">${rf.hazardShown ? "Hide its hazard" : "Show its hazard"}</button>`);
    hz.click(async ev => { ev.preventDefault(); await toggleHazard(page.parent, f.route); rerender(page); });
    box.append(hz);
  }
  if(f.lair && !f.lair.rolled)
  {
    const roll = $(`<button type="button" title="The Lair generator, each column rolled on its own. Its inhabitants can then be spawned.">Roll the lair</button>`);
    roll.click(async ev =>
    {
      ev.preventDefault();
      ev.currentTarget.disabled = true;
      try
      {
        const { ROLLTABLES } = await import("../actor/rolltable-data.js");
        const t = ROLLTABLES.find(x => x.source === "The Desert/Lair.md :: Lair Generator (d100)");
        const details = [{ heading: "Lair", lines: rollColumns(t) }];
        const text = page.text.content ?? "", html = detailsHtml(details);
        await page.update({ "text.content": LAIR_PENDING.test(text) ? text.replace(LAIR_PENDING, html) : text + html,
                            "flags.vaarn.regionRoute.lair.rolled": true, "flags.vaarn.regionSpawns": spawnsOf(details) });
      }
      catch(err) { console.error(err); ui.notifications.error(`Rolling the lair failed: ${err.message}`); ev.currentTarget.disabled = false; }
    });
    box.append(roll);
  }
  return box;
}

function spawnBox(page)
{
  const spawns = page.getFlag("vaarn", "regionSpawns");
  if(!spawns?.length) return null;
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"></div>`);
  for(const s of spawns) box.append(spawnButton(s.name, `From "${s.text}". Its sheet's Roll Encounter rolls how many.`));
  return box;
}

/** A spawn button for one Bestiary creature. */
function spawnButton(name, title = "")
{
  const b = $(`<button type="button" title="${String(title).replace(/"/g, "")}">Spawn one ${name}</button>`);
  b.click(async ev =>
  {
    ev.preventDefault();
    ev.currentTarget.disabled = true;
    try
    {
      const { spawnNamedCreature } = await import("../actor/bestiary-spawn.js");
      let folder = game.folders.find(f => f.name === "Generated Creatures" && f.type === "Actor");
      if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });
      const actor = await spawnNamedCreature(name, { folder: folder.id });
      if(!actor) throw new Error(`${name} is not in the Bestiary.`);
      ui.notifications.info(`Spawned ${actor.name} in "Generated Creatures"; its sheet's Roll Encounter rolls how many.`);
      actor.sheet.render(true);
    }
    catch(err) { console.error(err); ui.notifications.error(`That spawn failed: ${err.message}`); }
    finally { ev.currentTarget.disabled = false; }
  });
  return b;
}

function sectionBox(page)
{
  const f = page.getFlag("vaarn", "regionSection");
  if(!f) return null;
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"><button type="button" data-section="roll">Roll an encounter (d${f.die})</button>`
    + `<button type="button" data-section="here"></button><p class="vaarn-encounter-result"></p></div>`);
  const here = box.find('button[data-section="here"]');
  const showHere = async () =>
  {
    const { partySection } = await import("./region-encounters.js");
    const loc = partySection();
    const isHere = !!loc && loc.journalId === page.parent.id && loc.section === f.section;
    here.text(isHere ? "The party is in this section" : "The party is in this section: record it").prop("disabled", isHere);
  };
  showHere();
  here.click(async ev =>
  {
    ev.preventDefault();
    const { setPartySection } = await import("./region-encounters.js");
    await setPartySection(page.parent.id, f.section);
    ui.notifications.info(`The party is in ${page.parent.name}, ${page.name}: Desert encounters on the Exploration Clock roll its table.`);
    showHere();
  });
  box.find('button[data-section="roll"]').click(async ev =>
  {
    ev.preventDefault();
    const { rollSection } = await import("./region-encounters.js");
    const { total, entries, entry } = await rollSection(page);
    ui.notifications.info(`Encounter in ${page.name}: d${entries.length} = ${total} - ${entry.text}.`);
    const out = box.find(".vaarn-encounter-result").empty();
    out.append(`<b>d${entries.length} = ${total}: ${entry.text}</b> `);
    if(entry.creature) out.append(spawnButton(entry.creature, entry.text));
  });
  // step E: the section's RollTable - its die (d4 up to the table's size), a link, and the entries the die reaches
  if(f.rollTable)
  {
    const tools = $(`<div class="region-section-table" style="margin-top:4px"></div>`);
    box.append(tools);
    (async () =>
    {
      const { DICE, entriesOfPage, setSectionDie } = await import("./region-encounters.js");
      const table = await fromUuid(f.rollTable);
      if(!table) { tools.append(`<p><i>This section's RollTable has been deleted; rolls use the book table.</i></p>`); return; }
      const size = table.results.size;
      const die = Number(String(table.formula).match(/d(\d+)/)?.[1]) || f.die;
      const pick = $(`<select title="A smaller die rolls only the lower, easier entries; the famous monster stays at the top.">`
        + DICE.filter(d => d <= size).map(d => `<option value="${d}" ${d === die ? "selected" : ""}>d${d}</option>`).join("") + `</select>`);
      pick.change(async ev => { await setSectionDie(page, ev.currentTarget.value); rerender(page); });
      const open = $(`<a style="margin-left:6px" title="Edit the entries in Foundry's table editor">Open the RollTable</a>`);
      open.click(ev => { ev.preventDefault(); table.sheet.render(true); });
      const entries = await entriesOfPage(page);
      tools.append($(`<label>Die: </label>`), pick, open,
        `<ol style="margin:4px 0 0 1.4em;padding:0">${entries.map(e => `<li>${e.source === "table" ? "" : "<b>"}${foundry.utils.escapeHTML?.(e.text) ?? e.text}${e.source === "table" ? "" : "</b>"}</li>`).join("")}</ol>`);
      box.find('button[data-section="roll"]').text(`Roll an encounter (d${die})`);
    })();
  }
  return box;
}

// ---- NPCs tied to a location (journal controls D, RULED 2026-10-03, Matt) ----

/**
 * The Actor makers a location page offers: "Make an NPC here" runs the first; "Other..." lists the rest - the
 * Character creator too, for NPCs made the way player characters are (Matt). A macro is run from the Vaarn Macros
 * compendium by its name, so it is there in any world.
 * No Autarch Figment (Matt, 2026-10-04): it is an Item given to a character, not an Actor, so nothing could be linked.
 */
export const NPC_MAKERS = [
  { key: "npc", label: "NPC", macro: "Generate NPC" },
  { key: "character", label: "Character (the character creator)", open: () => new game.knave.KnaveCharacterCreator().render(true) },
  { key: "hireling", label: "Follower or Mercenary", macro: "Generate Follower or Mercenary" },
  { key: "companion", label: "Companion", macro: "Generate Companion" },
  { key: "rival", label: "Rival Adventurer", macro: "Generate Rival Adventurer" },
  { key: "monster", label: "Monster", macro: "Generate Monster" },
  { key: "daemon", label: "Quantum Daemon", macro: "Generate Quantum Daemon" }
];

// One page waits at a time: the next Actor this GM makes is linked to it.
let waiting = null;

async function runMaker(maker)
{
  if(maker.open) return maker.open();
  // by name: a world whose pack predates stable ids keeps its macros under older ids (found 2026-10-04)
  const pack = game.packs.get("vaarn.macros");
  const id = (await pack?.getIndex())?.find(m => m.name === maker.macro)?._id;
  const macro = id ? await pack.getDocument(id) : null;
  if(!macro) throw new Error(`The ${maker.label} macro is not in the Vaarn Macros compendium.`);
  return macro.execute();
}

/** Link an Actor from a location page, under a "People here" heading. */
export async function linkActor(page, actor, label)
{
  const text = page.text.content ?? "";
  const line = `<p>@UUID[${actor.uuid}]{${actor.name}} (made with ${label})</p>`;
  const head = "<h3>People here</h3>";
  await page.update({ "text.content": text.includes(head) ? text.replace(head, head + line) : text + head + line });
}

function npcBox(page)
{
  // a settlement's location pages too (Settlement Creation chunk 2, 2026-10-08: Make an NPC here on each)
  if(!page.getFlag("vaarn", "regionLocation") && !page.getFlag("vaarn", "settlementLocation")) return null;
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"></div>`);
  if(waiting?.page === page.uuid)
  {
    box.append(`<p style="margin:0"><i>The next Actor you make is linked here (${waiting.maker.label}).</i></p>`);
    const cancel = $(`<button type="button">Cancel</button>`);
    cancel.click(ev => { ev.preventDefault(); waiting = null; rerender(page); });
    return box.append(cancel);
  }
  const start = async maker =>
  {
    waiting = { page: page.uuid, maker };
    rerender(page);
    try { await runMaker(maker); }
    catch(err) { console.error(err); ui.notifications.error(err.message); waiting = null; rerender(page); }
  };
  const main = $(`<button type="button" title="Runs Generate NPC; the NPC it makes is linked on this page.">Make an NPC here</button>`);
  main.click(ev => { ev.preventDefault(); start(NPC_MAKERS[0]); });
  const other = $(`<select title="Another kind of Actor, linked on this page when made."><option value="">Other...</option>`
    + NPC_MAKERS.slice(1).map(m => `<option value="${m.key}">${m.label}</option>`).join("") + `</select>`);
  other.change(ev => { const m = NPC_MAKERS.find(x => x.key === ev.currentTarget.value); if(m) start(m); });
  return box.append(main, other);
}

/** An eye beside every link to one of this region's route pages. */
function routeEyes(page, html)
{
  const journal = page.parent;
  if(!journal?.getFlag("vaarn", "region")) return;
  html.find("a.content-link[data-uuid]").each((_, a) =>
  {
    const pid = String(a.dataset.uuid).split(".").pop();
    const f = journal.pages.get(pid)?.getFlag("vaarn", "regionRoute");
    if(!f) return;
    const d = routeDrawing(journal, f.route);
    const eye = $(`<a class="region-route-eye" style="margin-left:4px" title="${!d ? "No Scene for this route" : d.hidden ? "Hidden from players: click to reveal" : "Shown to players: click to hide"}">`
      + `<i class="fas ${!d ? "fa-ban" : d.hidden ? "fa-eye-slash" : "fa-eye"}"></i></a>`);
    if(d) eye.click(async ev => { ev.preventDefault(); ev.stopPropagation(); await toggleRoute(journal, f.route); rerender(page); });
    $(a).after(eye);
  });
}

export function registerRegionControls()
{
  Hooks.on("renderJournalPageSheet", (sheet, html) =>
  {
    if(!game.user.isGM || sheet.isEditable) return;
    const page = sheet.document;
    if(!page.parent?.getFlag("vaarn", "region") && !page.parent?.getFlag("vaarn", "settlement")) return;
    routeEyes(page, html);
    const content = html.filter(".journal-page-content").add(html.find(".journal-page-content"));
    const target = content.length ? content : html.last();
    // a section's controls go at the TOP, above its 20-row table, so a roll's result and its Spawn button show where
    // the GM is looking (Matt, 2026-10-03: at the bottom they appeared below the visible page)
    const sec = sectionBox(page);
    if(sec) target.prepend(sec);
    for(const box of [vaultBox(page), settlementBuildBox(page), routeBox(page), spawnBox(page), followUpBox(page), npcBox(page)].filter(Boolean)) target.append(box);
  });
  // A section's RollTable rolled straight from Foundry's own table window (Matt, 2026-10-04: some GMs roll tables
  // directly and would be frustrated without it): a creature result's card gets Spawn one, GM only, as page rolls do.
  Hooks.on("renderChatMessage", async (message, html) =>
  {
    if(!game.user.isGM) return;
    const table = game.tables.get(message.getFlag("core", "RollTable"));
    if(!table?.getFlag("vaarn", "regionSectionTable")) return;
    const { creatureOf } = await import("./region-data.js");
    const { bestiaryNameOf } = await import("./region-names.js");
    html.find(".table-draw .table-results li, .table-results li").each((_, li) =>
    {
      const text = $(li).find(".description").text().trim() || $(li).text().trim();
      const name = bestiaryNameOf(creatureOf(text));
      if(name && !$(li).find(".region-table-spawn").length) $(li).append($(`<div class="region-table-spawn"></div>`).append(spawnButton(name, text)));
    });
  });
  // the Actor a waiting location page asked for: the first one this GM makes is linked there
  Hooks.on("createActor", async (actor, options, userId) =>
  {
    if(!waiting || userId !== game.user.id) return;
    const { page: uuid, maker } = waiting;
    waiting = null;
    const page = await fromUuid(uuid);
    if(!page) return;
    await linkActor(page, actor, maker.label);
    ui.notifications.info(`${actor.name} is linked on ${page.name}.`);
    if(page.parent?.sheet?.rendered) page.parent.sheet.render(false);
  });
  // a route revealed or hidden from the map refreshes any open region journal, so its eyes stay true
  Hooks.on("updateDrawing", (drawing, change) =>
  {
    if(!("hidden" in change) || !drawing.getFlag("vaarn", "regionRoute")) return;
    const j = game.journal.get(drawing.parent?.getFlag("vaarn", "regionScene")?.journalId);
    if(j?.sheet?.rendered) j.sheet.render(false);
  });
}
