/**
 * FOLLOW-UP ROLL BUTTON (foundry-system-index.csv row of that name, build plan RULED 2026-10-08, Matt).
 *
 * A region location page whose details name something the module can make gets a "Follow-up rolls" box, one
 * button per such result (follow-up-data.js). The buttons are found when the page is shown, from its own
 * "Label: value" lines, so nothing new is stored on a page and regions made before this get them too. A button
 * can be pressed again; whatever it makes is linked on the page under "Made here", or rolled into the page as
 * its own section.
 *
 * PLACE WITHIN A PLACE (row of that name, RULED 2026-10-08, Matt): a result naming another kind of location
 * rolls that place into the page as its own section, once; the inner place's own results then get buttons read
 * with its tables (follow-up-data.js pageSegments), with no limit on nesting. A Settlement result waits for
 * Settlement Creation.
 */

import { FOLLOW_UPS, followUpLabel, pageFollowUps, SETTLEMENT_PAGE_TYPE } from "./follow-up-data.js";

const rerender = page => page.parent?.sheet?.rendered ? page.parent.sheet.render(false) : page.sheet?.render(false);
const MADE_HEAD = "<h3>Made here</h3>";

/** Link what a button made on its page, under "Made here", naming the result it came from. */
export async function linkMade(page, docs, from)
{
  const text = page.text.content ?? "";
  const lines = docs.map(d => `<p>@UUID[${d.uuid}]{${d.name}} (from ${from})</p>`).join("");
  await page.update({ "text.content": text.includes(MADE_HEAD) ? text.replace(MADE_HEAD, MADE_HEAD + lines) : text + MADE_HEAD + lines });
}

/** Ask one question with a select; resolves with the chosen value, or null when closed. */
function ask(title, label, options)
{
  return new Promise(resolve =>
  {
    new Dialog({
      title,
      content: `<div class="form-group"><label>${label}</label><select name="pick">${options.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>`,
      buttons: { ok: { label: "Create", callback: html => resolve(html.find('select[name="pick"]').val()) } },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

/** Make what one follow-up result names, and link or write it on the page. */
async function makeFollowUp(page, { label, value, followUp: f })
{
  const from = `${label}: ${value}`;
  switch(f.kind)
  {
    case "item":
    {
      const builders = await import("../item/loot-builders.js");
      const items = await getDocumentClass("Item").createDocuments(await builders[f.builder]());
      ui.notifications.info(`Created ${items.map(i => `"${i.name}"`).join(" and ")} in the Items directory.`);
      return linkMade(page, items, from);
    }
    case "monster":
    {
      const { generateMonster } = await import("../actor/monster-generator.js");
      const actor = await generateMonster();
      return actor && linkMade(page, [actor], from);
    }
    case "daemon":
    {
      const size = await ask("Generate Quantum Daemon", "Size", [["Lesser", "Lesser"], ["Greater", "Greater"]]);
      if(!size) return;
      const { createQuantumDaemon } = await import("../actor/quantum-daemon.js");
      const actor = await createQuantumDaemon(size);
      ui.notifications.info(`Created "${actor.name}" (${size} Quantum Daemon) in the "Generated Creatures" folder.`);
      return linkMade(page, [actor], from);
    }
    case "cache":
    {
      const { sizesOf } = await import("../actor/treasure-cache-data.js");
      const { createCache, sizeLabel } = await import("../actor/treasure-cache.js");
      const pick = await ask(`Generate ${f.type} Cache`, "Size", sizesOf(f.type).map((_, i) => [String(i), sizeLabel(f.type, i)]));
      if(pick === null) return;
      const actor = await createCache(f.type, Number(pick));
      return linkMade(page, [actor], from);
    }
    case "composite":
    {
      const { COMPOSITE_GENERATORS } = await import("../actor/composite-generator-data.js");
      const { rollGeneratorHtml } = await import("../actor/composite-roller.js");
      const g = COMPOSITE_GENERATORS.find(x => x.key === f.key);
      const html = `<h3>${g.heading} (from ${from})</h3>${rollGeneratorHtml(g)}`;
      return page.update({ "text.content": (page.text.content ?? "") + html });
    }
    case "vault":
    {
      const { openVaultTuner } = await import("../vault/vault-tuner.js");
      const { MODULE_DEFAULT, newSeed } = await import("../vault/vault-layout.js");
      // a region page is "3. Name"; a settlement page is "Major Asset: Vault Entrance", so a settlement's vault takes
      // the town's name (found in Group 607: it was "Major Asset: Vault Entrance Vault")
      const name = (page.parent?.getFlag("vaarn", "settlement") ? page.parent.name : page.name.replace(/^\d+\.\s*/, "")) + " Vault";
      return openVaultTuner({ ...MODULE_DEFAULT, seed: newSeed() }, { name, onGenerated: journal => linkMade(page, [journal], from) });
    }
    case "faction":
    {
      const { VaarnFactionBrowser } = await import("../actor/faction-browser.js");
      return new VaarnFactionBrowser({ selectedName: f.faction }).render(true);
    }
    case "creature":
    {
      const { spawnNamedCreature } = await import("../actor/bestiary-spawn.js");
      let folder = game.folders.find(x => x.name === "Generated Creatures" && x.type === "Actor");
      if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });
      const actor = await spawnNamedCreature(f.name, { folder: folder.id });
      if(!actor) throw new Error(`${f.name} is not in the Bestiary.`);
      ui.notifications.info(`Spawned ${actor.name} in Generated Creatures.`);
      return linkMade(page, [actor], from);
    }
    case "place":
    {
      if(f.type === "Settlement")
      {
        // a Holy Place in a Settlement (Settlement Creation chunk 7, RULED 2026-10-08): the settlement is built as a
        // region Settlement's is - its own journal and map, its Location from the section's Landscape - and linked
        const { rngFrom } = await import("./region-layout.js");
        const { settlementLocationIn } = await import("./region-details.js");
        const { regionFromFlag } = await import("./region-scene.js");
        const { generateSettlement } = await import("../settlement/settlement-generator.js");
        const { createSettlementJournal, usedSettlementNames } = await import("../settlement/settlement-journal.js");
        const { makeSettlementScene } = await import("../settlement/settlement-scene.js");
        const seed = `${page.parent?.id}|${page.id}|settlement`;
        let landscape = null;
        try { const rf = page.parent?.getFlag("vaarn", "region"); const W = rf && regionFromFlag(rf), L = W?.locs[page.getFlag("vaarn", "regionLocation")?.loc]; landscape = L ? W.sections[L.section]?.landscape : null; }
        catch(e) { console.warn("Settlement Creation: no section Landscape for", page.name, e); }
        const location = landscape ? settlementLocationIn(landscape, rngFrom(seed + "|location")) : undefined;
        const g = generateSettlement({ seed }, { location, usedNames: usedSettlementNames() });
        const journal = await createSettlementJournal(g);
        await makeSettlementScene(journal);
        ui.notifications.info(`Built ${journal.name}: its journal in Settlements and its map in Settlement Scenes.`);
        return linkMade(page, [journal], from);
      }
      // Place Within a Place (RULED 2026-10-08): the inner place's details from its own tables, as a region page of
      // that type rolls them, as a section headed with where it came from; its creatures join the page's Spawn buttons.
      const { rollLocationDetails, detailsHtml } = await import("./region-details.js");
      const { spawnsOf } = await import("./region-journal.js");
      const details = rollLocationDetails(f.type);
      if(!details) throw new Error(`${f.type} has no tables to roll here.`);
      const html = `<h3>${f.type} (from ${from})</h3>${detailsHtml(details)}`;
      const spawns = page.getFlag("vaarn", "regionSpawns") ?? [];
      const added = spawnsOf(details).filter(s => !spawns.some(x => x.name === s.name));
      return page.update({ "text.content": (page.text.content ?? "") + html, ...(added.length ? { "flags.vaarn.regionSpawns": [...spawns, ...added] } : {}) });
    }
  }
}

/** The follow-up type a page reads as: a region location's type, or a settlement page's (chunk 6). */
export function followUpType(page)
{
  const region = page.getFlag("vaarn", "regionLocation")?.type;
  if(region) return region;
  const kind = page.getFlag("vaarn", "settlementLocation")?.kind;
  if(kind) return SETTLEMENT_PAGE_TYPE[kind] ?? null;
  return page.parent?.getFlag("vaarn", "settlement")?.pages?.overview === page.id ? "Settlement Overview" : null;
}

/** The page's Follow-up rolls box, or null when nothing on it names anything. */
export function followUpBox(page)
{
  const type = followUpType(page);
  if(!FOLLOW_UPS[type]) return null;
  const found = pageFollowUps(page.text.content, type);
  if(!found.length) return null;
  const box = $(`<div class="vaarn-trap-card vaarn-vault-controls"><p style="margin:0 0 4px"><b>Follow-up rolls</b></p></div>`);
  for(const r of found)
  {
    // an inner place's own results say which place they belong to
    const where = r.segment ? `${r.segType} › ` : "";
    const b = $(`<button type="button" title="${`${where}${r.label}: ${r.value}`.replace(/"/g, "")}">${where}${r.value}: ${followUpLabel(r.followUp)}</button>`);
    b.click(async ev =>
    {
      ev.preventDefault();
      const btn = ev.currentTarget;
      btn.disabled = true;
      try { await makeFollowUp(page, r); rerender(page); }
      catch(err) { console.error(err); ui.notifications.error(`${r.value}: ${err.message}`); }
      finally { btn.disabled = false; }
    });
    box.append(b);
  }
  return box;
}
