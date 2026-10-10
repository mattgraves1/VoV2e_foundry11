/**
 * Settlement Creation (foundry-system-index.csv row of that name) - revealing places, chunk 4 of the build plan
 * (RULED 2026-10-08, Matt): players see the town's layout; each marked place is hidden until the GM reveals it
 * from the journal, as a region route is revealed.
 *
 *   a location page    "Reveal on the map" / "Hide from players" shows or hides that place's icon tile and its
 *                      label together on the settlement's Scene; the major problem's page has none - its place
 *                      is a GM pin only (RULED)
 *   the Overview       an eye beside each link to a location page: whether players see it, and a click toggles it
 *
 * Make an NPC here and the follow-up buttons are region-controls.js's, which shows them on settlement pages too.
 */

const rerender = page => page.parent?.sheet?.rendered ? page.parent.sheet.render(false) : page.sheet?.render(false);

/** A settlement journal's Scene, or null when it has none (yet) or it was deleted. */
export function settlementScene(journal)
{
  return game.scenes.get(journal?.getFlag("vaarn", "settlement")?.scene) ?? null;
}

/** A place's tile and label on its Scene: { scene, tile, label }, either missing when it is gone. */
export function placeOnScene(journal, id)
{
  const scene = settlementScene(journal);
  return { scene, tile: scene?.tiles.find(t => t.getFlag("vaarn", "settlementTile")?.id === id) ?? null,
    label: scene?.drawings.find(d => d.getFlag("vaarn", "settlementLabel")?.id === id) ?? null };
}

/** Is this place shown to players? */
export const isRevealed = (journal, id) => { const { tile } = placeOnScene(journal, id); return !!tile && !tile.hidden; };

/** Show or hide a place's icon and label together. */
export async function togglePlace(journal, id, name)
{
  const { scene, tile, label } = placeOnScene(journal, id);
  if(!scene) return ui.notifications.warn(`${journal.name} has no map Scene.`);
  if(!tile) return ui.notifications.warn(`${name} has no icon on ${scene.name}.`);
  const hidden = !tile.hidden;
  await scene.updateEmbeddedDocuments("Tile", [{ _id: tile.id, hidden }]);
  if(label) await scene.updateEmbeddedDocuments("Drawing", [{ _id: label.id, hidden }]);
  ui.notifications.info(`${name} is ${hidden ? "hidden from players" : "shown to players"} on ${scene.name}.`);
}

function revealBox(page)
{
  const f = page.getFlag("vaarn", "settlementLocation");
  if(!f) return null;
  const journal = page.parent, name = page.name.replace(/^[^:]+:\s*/, "");
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"></div>`);
  if(f.gmOnly) return box.append(`<p style="margin:0"><i>Only you see this place on the map: it has a pin and no icon for players.</i></p>`);
  const { scene, tile } = placeOnScene(journal, f.id);
  const b = $(`<button type="button" ${tile ? "" : `disabled title="${scene ? "Its icon is gone from the map." : "This settlement has no map Scene."}"`}>${!tile ? "Not on a map" : tile.hidden ? "Reveal on the map" : "Hide from players"}</button>`);
  b.click(async ev => { ev.preventDefault(); await togglePlace(journal, f.id, name); rerender(page); });
  return box.append(b);
}

/** An eye beside every link to one of this settlement's location pages. */
function placeEyes(page, html)
{
  const journal = page.parent;
  html.find("a.content-link[data-uuid]").each((_, a) =>
  {
    const pid = String(a.dataset.uuid).split(".").pop();
    const f = journal.pages.get(pid)?.getFlag("vaarn", "settlementLocation");
    if(!f || f.gmOnly) return;
    const { tile } = placeOnScene(journal, f.id);
    const eye = $(`<a class="settlement-place-eye" style="margin-left:4px" title="${!tile ? "Not on a map" : tile.hidden ? "Hidden from players: click to reveal" : "Shown to players: click to hide"}">`
      + `<i class="fas ${!tile ? "fa-ban" : tile.hidden ? "fa-eye-slash" : "fa-eye"}"></i></a>`);
    if(tile) eye.click(async ev => { ev.preventDefault(); ev.stopPropagation(); await togglePlace(journal, f.id, a.textContent.trim()); rerender(page); });
    $(a).after(eye);
  });
}

// ---- a region's Settlement (chunk 7, RULED 2026-10-08, Matt): its page builds the whole settlement on demand ----

/**
 * Build the settlement a region Settlement page describes: the same seed and Location the region's preview rolled
 * its overview from (the page's regionSettlement flag), so the journal's overview is the page's, named as the page
 * names it; then its map Scene. A page written before chunk 7 has no flag: its settlement is built with rolls of its
 * own and the page's name, and the page says so. Links the settlement on the page. Returns the journal.
 */
export async function buildRegionSettlement(page)
{
  const { generateSettlement } = await import("./settlement-generator.js");
  const { createSettlementJournal, usedSettlementNames } = await import("./settlement-journal.js");
  const { makeSettlementScene } = await import("./settlement-scene.js");
  const { SETTLEMENT_PENDING } = await import("../region/region-details.js");
  const f = page.getFlag("vaarn", "regionSettlement");
  const loc = page.getFlag("vaarn", "regionLocation")?.loc;
  const seed = f?.seed ?? `${page.parent?.id}|settlement|${loc}`;
  const g = generateSettlement({ seed }, { location: f?.location ?? undefined, usedNames: usedSettlementNames() });
  const name = f?.name || page.name.replace(/^\d+\.\s*/, "");
  if(name) g.name = name;
  if(f) { g.nameKey = f.nameKey ?? g.nameKey; g.founder = f.founder ?? null; }
  // a faith a weapon already resolved on the page stays the settlement's (Faith-Named Religious Weapon Tags)
  if(f?.faiths) g.faiths = f.faiths;
  const journal = await createSettlementJournal(g);
  await makeSettlementScene(journal);
  const text = page.text.content ?? "";
  const line = `<p><b>The settlement:</b> @UUID[${journal.uuid}]{${journal.name}}${f ? "" : " (built with rolls of its own: this page was written before settlements could be built)"}</p>`;
  await page.update({ "text.content": SETTLEMENT_PENDING.test(text) ? text.replace(SETTLEMENT_PENDING, line) : text + line,
                      "flags.vaarn.regionSettlement": { ...(f ?? { seed, location: null, name }), journal: journal.uuid } });
  return journal;
}

/** A region Settlement page's Build this settlement box, or null once it is built (or the page is no Settlement). */
export function settlementBuildBox(page)
{
  const f = page.getFlag("vaarn", "regionSettlement");
  if(page.getFlag("vaarn", "regionLocation")?.type !== "Settlement" || f?.journal) return null;
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"><button type="button"
    title="Makes this settlement's journal (an Overview and a page per place) and its map, from the overview on this page.">Build this settlement</button></div>`);
  box.find("button").click(async ev =>
  {
    ev.preventDefault();
    const btn = ev.currentTarget;
    btn.disabled = true;
    try
    {
      const journal = await buildRegionSettlement(page);
      ui.notifications.info(`Built ${journal.name}: its journal in Settlements and its map in Settlement Scenes.`);
      journal.sheet.render(true);
    }
    catch(err) { console.error(err); ui.notifications.error(`Building the settlement failed: ${err.message}`); btn.disabled = false; }
  });
  return box;
}

export function registerSettlementControls()
{
  Hooks.on("renderJournalPageSheet", (sheet, html) =>
  {
    if(!game.user.isGM || sheet.isEditable) return;
    const page = sheet.document;
    if(!page.parent?.getFlag("vaarn", "settlement")) return;
    placeEyes(page, html);
    const box = revealBox(page);
    if(!box) return;
    const content = html.filter(".journal-page-content").add(html.find(".journal-page-content"));
    (content.length ? content : html.last()).prepend(box);
  });
  // a place shown or hidden on the map, from anywhere, refreshes its open journal so its buttons and eyes stay true
  Hooks.on("updateTile", tile =>
  {
    if(!tile.getFlag("vaarn", "settlementTile")) return;
    const j = game.journal.get(tile.parent?.getFlag("vaarn", "settlementScene")?.journalId);
    if(j?.sheet?.rendered) j.sheet.render(false);
  });
}
