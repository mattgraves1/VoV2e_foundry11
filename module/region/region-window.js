/**
 * Region Generator (foundry-system-index.csv row of that name) - the preview
 * window, the Region Lab's screen inside Foundry (RULED 2026-10-03, Matt).
 *
 * Generate a region, look at the map, and make the GM's edits on it before
 * anything is created: click a location to change its type or name, a route to
 * make it safe or hazardous (its hazard rolled on the Route Hazard column, or
 * chosen), a section's ground to rename the section. Changing a type changes
 * nothing else - its routes' hazards stay as they are (RULED). Edits last until
 * the region is generated again. The region's own name is the GM's to give.
 *
 * Every generation setting is under Advanced options; changing one grows the
 * region again from the same seed, so one change at a time can be compared.
 * The region code holds every setting and the seed; Load grows that exact
 * region again.
 *
 * Create region writes the region's journal (region-journal.js) from the
 * region as edited, then makes its Scene from the journal (region-scene.js).
 */

import { generateRegion, DEFAULT_SETTINGS, SETTINGS, formatRegionCode, parseRegionCode, newSeed, hdist, cubeRound, key } from "./region-layout.js";
import { nameRegion } from "./region-names.js";
import { TYPES, HAZARDS } from "./region-data.js";
import { paintRegion, loadRegionIcons, toPx } from "./region-paint.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// The Advanced options: each setting's label and hover tip. Keys are region-layout.js's SETTINGS.
const LABELS = {
  starts: ["Starting locations", "How many locations the region grows from, spaced on a ring."],
  startSpacing: ["Start spacing (hexes)", "How far apart several starting locations begin."],
  connect: ["Separate starts connect by", "", { both: "Growing toward each other, then a stitch", toward: "Growing toward each other only", stitch: "A stitch route only" }],
  budget: ["Fit one Scene (8,192 px)", "Turn away any new location that would fall outside one Foundry Scene."],
  firstPaths: ["First location's paths", "How many paths the first location sends out (ruled: 2 or 3)."],
  laterPaths: ["Later locations' paths", "How many paths each later location sends out (ruled: 1 or 2)."],
  w: ["Path weights 1d6 / 2d6 / 3d6", "How likely a path is to be close (1d6 days), moderate (2d6) or far (3d6). Ruled 3 / 2 / 1."],
  join: ["Join a nearby location", "A path joins an unlinked location within its rolled length instead of going straight."],
  closeJoins: ["Last paths may still join", "After the last location is placed, remaining paths may still join existing ones."],
  lonerReach: ["Dead ends retry (days, 0 = off)", "A location with one route joins the nearest unlinked location within this many days, going round routes."],
  gap: ["Empty hexes between locations", "At least this many empty hexes between any two locations."],
  minVaults: ["Vaults, at least", "Top the region up to this many vaults, placed beside the location farthest from one."],
  startVault: ["Starting vaults", "", { first: "The first start is a vault", all: "Every start is a vault", none: "No start is a vault" }],
  maxVaultDays: ["Furthest from a vault (days, 0 = none)", "A new location farther than this from every vault becomes a vault."],
  spread: ["Spread placed vaults", "Each vault placed for the minimum goes beside the location farthest from a vault."],
  vaultLinks: ["A placed vault's connections", ""],
  variety: ["Variety", "", { off: "Off: every type rolled freely", parent: "Differ from the location it grew from", near: "Differ from every location nearby" }],
  varietyReach: ["Nearby means within (hexes)", "How near a location must be for Variety to avoid its type."],
  hazRule: ["Hazardous routes", "", { mixed: "Even to odd (ruled)", odd: "Odd to odd (the book, literally)" }],
  secMethod: ["Divide into sections by", "", { routes: "Along routes", voronoi: "Nearest centre", wedges: "Wedges round the first location", none: "One section" }],
  secSize: ["Locations per section", "The book: 'five or six dice creates a decent-sized region'."],
  mergeSmall: ["Fold small sections in", "A section under half that size joins a neighbour."],
  terr: ["Territory reach (hexes)", "How far from its locations a section's ground reaches."],
  landmarks: ["Landmarks", "A landmark in the middle of each section (Landmark Table, d100)."],
  landmarkVariety: ["No landmark repeats", "Re-roll a landmark another section already has."],
  hexPx: ["Hex size in the Scene (px)", "One hex is one day's travel."],
  margin: ["Margin (hexes)", "Empty ground round the region's edge on the Scene."]
};

function controlHtml(d, v)
{
  const [label, tip, names] = LABELS[d.key] ?? [d.key, ""];
  const t = tip ? ` title="${esc(tip)}"` : "";
  let input;
  if(d.kind === "bool") input = `<input type="checkbox" name="${d.key}" ${v[d.key] ? "checked" : ""}>`;
  else if(d.kind === "int") input = `<input type="range" name="${d.key}" min="${d.min}" max="${d.max}" value="${v[d.key]}"><span class="rg-val" data-for="${d.key}">${v[d.key]}</span>`;
  else if(d.kind === "weights") input = v.w.map((w, i) => `<input type="number" name="w${i}" min="0" max="10" value="${w}" style="flex:0 0 3em;width:3em">`).join("");
  else input = `<select name="${d.key}">${d.options.map(o => `<option value="${o}" ${String(o) === String(v[d.key]) ? "selected" : ""}>${esc(names?.[o] ?? o)}</option>`).join("")}</select>`;
  return `<div class="form-group"${t}><label>${esc(label)}</label><div class="form-fields">${input}</div></div>`;
}

// Application is Foundry's; nothing here runs outside it.
const Base = typeof Application === "undefined" ? class {} : Application;
export class RegionWindow extends Base
{
  constructor(settings = {}, options = {})
  {
    super(options);
    this.settings = { ...DEFAULT_SETTINGS, seed: newSeed(), ...settings };
    this.regionName = "";
    this.view = null;
    this.selected = null; this.selRoute = null; this.selSection = null; this.hoverSec = null;
  }

  static get defaultOptions()
  {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vaarn-region-generator", title: "Generate Region", width: 1180, height: 760, resizable: true, classes: ["vaarn-region-generator"]
    });
  }

  async _renderInner()
  {
    const v = this.settings;
    const advanced = SETTINGS.filter(d => d.key !== "count").map(d => controlHtml(d, v)).join("");
    return $(`<div class="rg-body" style="display:flex;gap:10px;height:100%;min-height:0">
      <div class="rg-map" style="position:relative;flex:1 1 auto;min-width:0;border-radius:4px;overflow:hidden;background:#0d1533">
        <canvas style="display:block;width:100%;height:100%;cursor:grab"></canvas>
        <div class="rg-tip" hidden style="position:absolute;pointer-events:none;background:#16214a;color:#ece6ee;border:1px solid #45598d;border-radius:4px;padding:5px 7px;font-size:12px;max-width:260px"></div>
        <button type="button" data-act="fit" style="position:absolute;right:6px;top:6px;width:auto;line-height:1.4">Fit</button>
      </div>
      <form class="rg-side" autocomplete="off" style="flex:0 0 330px;overflow-y:auto;padding-right:4px">
        <div class="form-group" title="The region's name is yours to give (RULED). It names the Scene and the journal."><label>Region name</label>
          <div class="form-fields"><input type="text" class="rg-name" value="${esc(this.regionName)}" placeholder="name this region"></div></div>
        <div class="form-group" title="The same seed and settings always grow the same region."><label>Seed</label>
          <div class="form-fields"><input type="text" name="seed" value="${esc(v.seed)}"><button type="button" data-act="seed" style="flex:0 0 auto;width:auto" title="A new seed">New</button></div></div>
        <div class="form-group" title="The book: 'five or six dice creates a decent-sized region'. Up to 100."><label>Locations</label>
          <div class="form-fields"><input type="range" name="count" min="5" max="100" value="${v.count}"><span class="rg-val" data-for="count">${v.count}</span></div></div>
        <p class="rg-stats notes" style="margin:4px 0"></p>
        <div class="rg-editor" style="border:1px solid var(--color-border-light-tertiary,#999);border-radius:4px;padding:6px;margin:6px 0"></div>
        <details class="rg-advanced"><summary style="cursor:pointer;margin:4px 0">Advanced options...</summary>${advanced}</details>
        <div class="form-group" title="Every setting and the seed. Load grows this exact region again."><label>Region code</label>
          <div class="form-fields"><input type="text" class="rg-code" readonly></div></div>
        <div class="form-group" title="Paste a region code and press Load to set every control from it."><label>Load a code</label>
          <div class="form-fields"><input type="text" class="rg-paste" placeholder="paste a code" style="flex:1 1 auto;min-width:0"><button type="button" data-act="load" style="flex:0 0 auto;width:auto">Load</button></div></div>
        <p class="rg-error" style="margin:2px 0;color:#c33"></p>
        <div class="flexrow" style="gap:4px;margin-top:6px">
          <button type="button" data-act="default" title="Every setting back to the ruled defaults, with a new seed.">Defaults</button>
          <button type="button" data-act="create" title="Make the region: its journal (an overview, a page per section and a page per location, details rolled now) and its Scene (the painted map, the party token, a pin per location, a hidden Drawing per route).">Create region</button>
        </div>
      </form></div>`);
  }

  activateListeners(html)
  {
    super.activateListeners(html);
    const root = html[0].closest(".window-content") ?? html[0];
    root.style.overflow = "hidden";
    this.form = root.querySelector("form.rg-side");
    this.canvas = root.querySelector(".rg-map canvas");
    this.tip = root.querySelector(".rg-tip");
    this.form.addEventListener("input", ev => this._onInput(ev));
    this.form.addEventListener("change", ev => this._onInput(ev, true));
    root.querySelectorAll("button[data-act]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); this._act(b.dataset.act); }));
    this._bindMap();
    loadRegionIcons().then(icons => { this.icons = icons; this._draw(); }).catch(e => console.error("Region Generator: icons did not load", e));
    this._grow();
  }

  /** A control changed: show its value; on change (not mid-drag) grow the region again. */
  _onInput(ev, changed = false)
  {
    const el = ev.target;
    if(el.classList.contains("rg-name")) { this.regionName = el.value; return; }
    // only the settings have a name; an edit's event can arrive here from an editor already redrawn
    if(!el.name) return;
    const shown = this.form.querySelector(`.rg-val[data-for="${el.name}"]`);
    if(shown) shown.textContent = el.value;
    if(!changed) return;
    const f = this.form, s = { ...this.settings, seed: f.querySelector('[name="seed"]').value.trim() || "-", count: Number(f.querySelector('[name="count"]').value) };
    for(const d of SETTINGS)
    {
      if(d.key === "count") continue;
      if(d.kind === "weights") { s.w = [0, 1, 2].map(i => Number(f.querySelector(`[name="w${i}"]`).value) || 0); continue; }
      const c = f.querySelector(`[name="${d.key}"]`);
      s[d.key] = d.kind === "bool" ? c.checked : d.kind === "int" ? Number(c.value) : d.options.find(o => String(o) === c.value);
    }
    this.settings = s;
    this._grow();
  }

  /** Grow and name the region from the settings, then fit it. Edits are dropped (RULED: they last until the region is generated again). */
  _grow()
  {
    const err = this.form.querySelector(".rg-error");
    try
    {
      // a code round trip checks every value is in range before anything grows
      this.settings = parseRegionCode(formatRegionCode(this.settings));
      this.W = nameRegion(generateRegion(this.settings));
      err.textContent = "";
    }
    catch(e) { err.textContent = e.message; return; }
    this.selected = this.selRoute = this.selSection = this.hoverSec = null;
    this.form.querySelector(".rg-code").value = this.W.code;
    this._stats(); this._editor(); this._fit();
  }

  _stats()
  {
    const W = this.W, haz = W.routes.filter(r => r.hazard).length;
    const days = W.routes.length ? W.routes.reduce((n, r) => n + r.days, 0) / W.routes.length : 0;
    const edits = W.edits ?? 0;
    this.form.querySelector(".rg-stats").textContent = `${W.locs.length} locations, ${W.routes.length} routes (${haz} hazardous, ${days.toFixed(1)} days on average), `
      + `${W.sections.length} section${W.sections.length === 1 ? "" : "s"}. Scene ${W.scene.px} x ${W.scene.py} px.` + (edits ? ` ${edits} edit${edits === 1 ? "" : "s"}.` : "");
  }

  // ---- the map ----
  _size() { const r = this.canvas.getBoundingClientRect(); return { w: Math.max(50, r.width), h: Math.max(50, r.height) }; }
  _fit()
  {
    const { w, h } = this._size(), b = this.W.box;
    const wHex = (b.xmax - b.xmin + 1) * Math.sqrt(3), hHex = (b.rmax - b.rmin + 1) * 1.5;
    const s = Math.max(2, Math.min(w / wHex, h / hHex));
    this.view = { s, ox: (w - (b.xmax + b.xmin) * Math.sqrt(3) * s) / 2, oy: (h - (b.rmax + b.rmin) * 1.5 * s) / 2 };
    this._draw();
  }
  _draw()
  {
    if(!this.W || !this.view || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1, size = this._size();
    this.canvas.width = Math.round(size.w * dpr); this.canvas.height = Math.round(size.h * dpr);
    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintRegion(ctx, this.W, this.view, size, { dpr, icons: this.icons, legend: true, hoverSec: this.hoverSec ?? this.selSection, selected: this.selected, selRoute: this.selRoute });
  }
  _hexAt(x, y) { const v = this.view, px = (x - v.ox) / v.s, py = (y - v.oy) / v.s, r = py / 1.5, q = px / Math.sqrt(3) - r / 2; return cubeRound(q, -q - r, r); }
  _locNear(x, y)
  {
    let best = null, bd = 1e9;
    for(const L of this.W.locs) { const p = toPx(L, this.view), d = Math.hypot(p.x - x, p.y - y); if(d < bd) { bd = d; best = L; } }
    return bd <= Math.max(10, this.view.s * 0.9) ? best : null;
  }
  _routeNear(x, y)
  {
    const seg = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0; return Math.hypot(x - a.x - t * dx, y - a.y - t * dy); };
    let best = null, bd = 1e9;
    for(const R of this.W.routes) for(let i = 1; i < R.hexes.length; i++) { const d = seg(toPx(R.hexes[i - 1], this.view), toPx(R.hexes[i], this.view)); if(d < bd) { bd = d; best = R; } }
    return bd <= Math.max(6, this.view.s * 0.4) ? best : null;
  }
  _sectionAt(x, y)
  {
    const h = this._hexAt(x, y), t = this.W.terrAt.get(key(h.q, h.r));
    return t?.owner ? this.W.sections[t.owner.section] : null;
  }
  _bindMap()
  {
    const cv = this.canvas;
    let drag = null;
    cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, ox: this.view.ox, oy: this.view.oy, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch(err) { /* a pointer that is not active */ } });
    cv.addEventListener("pointermove", e =>
    {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if(drag)
      {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if(Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; cv.style.cursor = "grabbing"; }
        if(drag.moved) { this.view.ox = drag.ox + dx; this.view.oy = drag.oy + dy; this.tip.hidden = true; this._draw(); return; }
      }
      this._hover(x, y, r);
    });
    cv.addEventListener("pointerup", e =>
    {
      const r = cv.getBoundingClientRect();
      if(drag && !drag.moved) this._select(e.clientX - r.left, e.clientY - r.top);
      drag = null; cv.style.cursor = "grab";
    });
    cv.addEventListener("pointerleave", () => { this.tip.hidden = true; if(this.hoverSec) { this.hoverSec = null; this._draw(); } });
    cv.addEventListener("wheel", e =>
    {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, v = this.view;
      const ns = Math.max(2, Math.min(60, v.s * Math.exp(-e.deltaY * 0.0015))), f = ns / v.s;
      v.ox = x - (x - v.ox) * f; v.oy = y - (y - v.oy) * f; v.s = ns;
      this._draw();
    }, { passive: false });
  }
  _hover(x, y, r)
  {
    const W = this.W, tip = this.tip, L = this._locNear(x, y);
    let html = null, sec = null;
    if(L)
    {
      const s = W.sections[L.section], routes = W.routes.filter(R => R.a === L.id || R.b === L.id), vd = W.vaultDays?.get(L.id);
      html = `<b>${esc(L.name || "(no name)")}</b><br>${esc(L.type)} · d20 ${L.roll} (${L.roll % 2 ? "odd" : "even"})<br>Section ${String.fromCharCode(65 + s.id)}: ${esc(s.name || s.landscape)}<br>`
        + `${routes.length} route${routes.length === 1 ? "" : "s"}: ${routes.map(R => R.days + "d" + (R.hazard ? " ⚠" : "")).join(", ")}<br>Nearest vault: ${vd === undefined || vd === Infinity ? "none reachable" : vd + " days"}`;
    }
    else
    {
      const R = this._routeNear(x, y);
      if(R) { const a = W.locs[R.a], b = W.locs[R.b]; html = `<b>${esc(R.hazard ?? "Safe route")}</b>${R.hazard ? ` (Route Hazard ${R.hazardRoll})` : ""}<br>${esc(a.name || a.type)} to ${esc(b.name || b.type)}<br>${R.days} days`; }
      else
      {
        sec = this._sectionAt(x, y);
        if(sec) html = `<b>${esc(sec.name || "(no name)")}</b><br>Section ${String.fromCharCode(65 + sec.id)} · ${esc(sec.landscape)}<br>Named for: ${esc(sec.named)}`
          + `${sec.landmark ? `<br>Landmark: ${esc(sec.landmark.name)}` : ""}<br>Encounters: ${esc(sec.encounters.table)} (${esc(sec.encounters.formula)})${sec.encounters.added.map(a => ` + ${esc(a.text)}`).join("")}`;
      }
    }
    if(html) { tip.innerHTML = html; tip.hidden = false; tip.style.left = Math.min(x + 14, r.width - 270) + "px"; tip.style.top = Math.min(y + 14, r.height - 100) + "px"; }
    else tip.hidden = true;
    if(sec !== this.hoverSec) { this.hoverSec = sec; this._draw(); }
  }
  _select(x, y)
  {
    this.selected = this._locNear(x, y);
    this.selRoute = this.selected ? null : this._routeNear(x, y);
    this.selSection = this.selected || this.selRoute ? null : this._sectionAt(x, y);
    this._editor(); this._draw();
  }

  // ---- the GM's edits ----
  _edited() { this.W.edits = (this.W.edits ?? 0) + 1; this._stats(); this._draw(); }
  _editor()
  {
    const ed = this.form.querySelector(".rg-editor"), W = this.W;
    if(this.selected)
    {
      const L = this.selected;
      ed.innerHTML = `<p style="margin:0 0 4px"><b>Location ${L.id + 1}</b> · d20 ${L.roll} (${L.roll % 2 ? "odd" : "even"})</p>
        <div class="form-group"><label>Type</label><div class="form-fields"><select class="ed-type">${TYPES.map(t => `<option ${t === L.type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div></div>
        <div class="form-group"><label>Name</label><div class="form-fields"><input type="text" class="ed-name" value="${esc(L.name)}" placeholder="a name"></div></div>
        <p class="notes" style="margin:2px 0">${L.nameFrom ? `Rolled from ${esc(L.nameFrom)}. ` : ""}Changing the type leaves its routes' hazards as they are.</p>`;
      ed.querySelector(".ed-type").addEventListener("change", e => { L.type = e.target.value; L.edited = true; this._edited(); });
      ed.querySelector(".ed-name").addEventListener("change", e => { L.name = e.target.value.trim(); L.nameFrom = null; this._edited(); this._editor(); });
    }
    else if(this.selRoute)
    {
      const R = this.selRoute, a = W.locs[R.a], b = W.locs[R.b];
      ed.innerHTML = `<p style="margin:0 0 4px"><b>${esc(a.name || a.type)}</b> to <b>${esc(b.name || b.type)}</b> · ${R.days} days</p>
        <div class="form-group"><label>Hazardous</label><div class="form-fields"><input type="checkbox" class="ed-haz" ${R.hazard ? "checked" : ""}></div></div>
        <div class="form-group"><label>Hazard</label><div class="form-fields"><select class="ed-hazard" ${R.hazard ? "" : "disabled"}><option value="roll">Roll on Route Hazard</option>${HAZARDS.map((h, i) => `<option value="${i + 1}" ${R.hazard && R.hazardRoll === i + 1 ? "selected" : ""}>${i + 1}. ${esc(h)}</option>`).join("")}</select></div></div>`;
      const roll = () => { const n = 1 + Math.floor(Math.random() * 20); R.hazardRoll = n; R.hazard = HAZARDS[n - 1]; };
      ed.querySelector(".ed-haz").addEventListener("change", e => { if(e.target.checked) roll(); else { R.hazard = null; R.hazardRoll = 0; } R.edited = true; this._edited(); this._editor(); });
      ed.querySelector(".ed-hazard").addEventListener("change", e => { const v = e.target.value; if(v === "roll") roll(); else { R.hazardRoll = Number(v); R.hazard = HAZARDS[R.hazardRoll - 1]; } R.edited = true; this._edited(); this._editor(); });
    }
    else if(this.selSection)
    {
      const s = this.selSection;
      ed.innerHTML = `<p style="margin:0 0 4px"><b>Section ${String.fromCharCode(65 + s.id)}</b> · ${esc(s.landscape)} · ${s.locs.length} location${s.locs.length === 1 ? "" : "s"}</p>
        <div class="form-group"><label>Name</label><div class="form-fields"><input type="text" class="ed-sname" value="${esc(s.name)}" placeholder="a name"></div></div>
        <p class="notes" style="margin:2px 0">Named for: ${esc(s.named)}${s.nameFrom ? ` (rolled from ${esc(s.nameFrom)})` : ""}.${s.landmark ? ` Landmark: ${esc(s.landmark.name)}.` : ""}
        Encounters: ${esc(s.encounters.table)} (${esc(s.encounters.formula)})${s.encounters.added.map(a => `, plus ${esc(a.text)}`).join("")}.</p>`;
      ed.querySelector(".ed-sname").addEventListener("change", e => { s.name = e.target.value.trim(); s.nameFrom = null; this._edited(); this._editor(); });
    }
    else ed.innerHTML = `<p class="notes" style="margin:0">Click a location to change its type or name, a route to make it safe or hazardous, or a section's ground to rename it. Edits last until the region is generated again.</p>`;
  }

  async _create()
  {
    const btn = this.form.querySelector('[data-act="create"]');
    btn.disabled = true;
    try
    {
      const { createRegionJournal } = await import("./region-journal.js");
      const name = this.regionName.trim() || `Region ${this.settings.seed}`;
      const journal = await createRegionJournal(this.W, name);
      journal.sheet.render(true);
      try
      {
        const { makeRegionScene } = await import("./region-scene.js");
        const scene = await makeRegionScene(journal);
        ui.notifications.info(`Created ${journal.name}: its journal in the Regions folder and its Scene in the Region Scenes folder.`);
        scene.view();
      }
      catch(e) { console.error(e); ui.notifications.error(`The journal was written, but making the Scene failed: ${e.message}`); }
    }
    catch(e) { console.error(e); ui.notifications.error(`Creating the region failed: ${e.message}`); }
    finally { btn.disabled = false; }
  }

  _act(act)
  {
    const f = this.form, err = f.querySelector(".rg-error");
    try
    {
      if(act === "fit") this._fit();
      else if(act === "create") this._create();
      else if(act === "seed") { this.settings.seed = newSeed(); f.querySelector('[name="seed"]').value = this.settings.seed; this._grow(); }
      else if(act === "default") { this.settings = { ...DEFAULT_SETTINGS, seed: newSeed() }; this.render(true); }
      else if(act === "load") { this.settings = parseRegionCode(f.querySelector(".rg-paste").value); err.textContent = ""; this.render(true); }
    }
    catch(e) { err.textContent = e.message; }
  }

  setPosition(pos)
  {
    const out = super.setPosition(pos);
    if(this.W && this.view) this._draw();
    return out;
  }
}

/** Open the Region Generator. GM only. */
export function openRegionWindow(settings = {})
{
  if(!game.user.isGM) { ui.notifications.warn("The Region Generator is for the GM."); return null; }
  return new RegionWindow(settings).render(true);
}
