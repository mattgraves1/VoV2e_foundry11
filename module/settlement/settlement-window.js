/**
 * Settlement Creation (foundry-system-index.csv row of that name) - the preview window, chunk 5 of the build plan
 * (RULED 2026-10-08, Matt): the Settlement Lab's screen inside Foundry, as the region window is the Region Lab's.
 *
 * Generate Settlement opens it on Matt's ruled defaults and a new seed. The GM sees the map with every place on
 * it, changes the settings (each change rolls the town again from the same seed, so one change at a time can be
 * compared), drags places to spread them out or cluster them (RULED: the roads, crossings, wall and dwellings
 * follow, and no table roll changes), renames the town if they like, and presses Create settlement: its journal
 * (settlement-journal.js) and its Scene (settlement-scene.js), from the town as it stands. Moved places are put
 * back by a new seed, Defaults, a change to how the dice land, or Put places back.
 */

import { generateSettlement, layoutSettlement } from "./settlement-generator.js";
import { SETTLEMENT_DEFAULTS, KINDS } from "./settlement-data.js";
import { paintSettlement, iconFile } from "./settlement-scene.js";
import { newSeed } from "../region/region-layout.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * The settings the GM can change, each with its label, hover tip and range. Fractions of the sheet are shown as
 * percentages. `place: true` settings change where the dice land, so they put moved places back.
 */
export const CONTROLS = [
  { key: "larger", label: "Larger settlement", kind: "select", place: true, tip: "The book's optional two more assets and six more buildings.",
    options: { size: "For a Large Town or City-State (ruled)", yes: "Always", no: "Never" } },
  { key: "drop", label: "How the dice land", kind: "select", place: true, options: { scatter: "Anywhere on the sheet, evenly (ruled)", throw: "Thrown: each handful round a point" } },
  { key: "spread", label: "Throw spread (%)", kind: "pct", min: 8, max: 45, place: true, tip: "How far a thrown handful scatters." },
  { key: "gap", label: "Room between dice (%)", kind: "pct", min: 0, max: 12, place: true, tip: "Real dice cannot overlap: a die landing closer is moved." },
  { key: "network", label: "Minor roads", kind: "select", options: { tree: "One network (ruled)", nearest: "Each to its nearest (the book's minimum)", loops: "One network, plus loops" } },
  { key: "loops", label: "Extra loops", kind: "int", min: 0, max: 8 },
  { key: "majorLink", label: "Minor roads and the main road", kind: "select", options: { cross: "A road crosses the main road (ruled)", join: "Join the seat and water source", none: "Left apart (the book, literally)" } },
  { key: "curve", label: "Road curve (%)", kind: "pct", min: 0, max: 40 },
  { key: "wall", label: "Outer wall", kind: "select", options: { hull: "Straight sides (ruled)", round: "Rounded", hug: "Hugging the buildings" } },
  { key: "wallPad", label: "Room inside the wall (%)", kind: "pct", min: 2, max: 15 },
  { key: "dwellingScale", label: "Small dwellings (% of the Size's)", kind: "pct", min: 0, max: 200, tip: "By Size (ruled): Hamlet 10, Village 15, Small Town 30, Large Town 60, City-State 120; a Boomtown 10 doubled d4-1 times." },
];

/** Settings from the form's values, clamped to their ranges. Pure, for the test. */
export function settingsFrom(values, base = SETTLEMENT_DEFAULTS)
{
  const s = { ...base };
  for(const c of CONTROLS)
  {
    const v = values[c.key];
    if(v === undefined) continue;
    if(c.kind === "select") s[c.key] = c.options[v] !== undefined ? v : base[c.key];
    else if(c.kind === "pct") s[c.key] = Math.min(c.max, Math.max(c.min, Number(v) || 0)) / 100;
    else s[c.key] = Math.min(c.max, Math.max(c.min, Math.round(Number(v) || 0)));
  }
  if(values.seed !== undefined) s.seed = String(values.seed).trim() || "-";
  return s;
}

function controlHtml(c, s)
{
  const tip = c.tip ? ` title="${esc(c.tip)}"` : "";
  let input;
  if(c.kind === "select") input = `<select name="${c.key}">${Object.entries(c.options).map(([v, t]) => `<option value="${v}" ${v === s[c.key] ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  else { const v = c.kind === "pct" ? Math.round(s[c.key] * 100) : s[c.key]; input = `<input type="range" name="${c.key}" min="${c.min}" max="${c.max}" value="${v}"><span class="sg-val" data-for="${c.key}">${v}</span>`; }
  return `<div class="form-group"${tip}><label>${esc(c.label)}</label><div class="form-fields">${input}</div></div>`;
}

const MARKER = { seat: "#ff5a70", water: "#6fd3f2", asset: "#f6d77a", problem: "#8d2a4a", building: "#d9cbe8", landmark: "#fff4d6" };

const Base = typeof Application === "undefined" ? class {} : Application;
export class SettlementWindow extends Base
{
  constructor(settings = {}, options = {})
  {
    super(options);
    this.settings = { ...SETTLEMENT_DEFAULTS, seed: newSeed(), ...settings };
    this.moves = new Map();
    this.name = null;           // the GM's own name, when they give one
    this.view = null; this.hover = null; this.icons = new Map();
  }

  static get defaultOptions()
  {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vaarn-settlement-generator", title: "Generate Settlement", width: 1120, height: 740, resizable: true, classes: ["vaarn-settlement-generator"]
    });
  }

  async _renderInner()
  {
    const s = this.settings;
    return $(`<div class="sg-body" style="display:flex;gap:10px;height:100%;min-height:0">
      <div class="sg-map" style="position:relative;flex:1 1 auto;min-width:0;border-radius:4px;overflow:hidden;background:#0d1533">
        <canvas style="display:block;width:100%;height:100%;cursor:grab"></canvas>
        <div class="sg-tip" hidden style="position:absolute;pointer-events:none;background:#16214a;color:#ece6ee;border:1px solid #45598d;border-radius:4px;padding:5px 7px;font-size:12px;max-width:260px"></div>
        <button type="button" data-act="fit" style="position:absolute;right:6px;top:6px;width:auto;line-height:1.4">Fit</button>
      </div>
      <form class="sg-side" autocomplete="off" style="flex:0 0 320px;overflow-y:auto;padding-right:4px">
        <div class="form-group" title="Built from the town's details; yours to change. It names the journal and the Scene."><label>Name</label>
          <div class="form-fields"><input type="text" class="sg-name" value=""></div></div>
        <div class="form-group" title="The same seed and settings always make the same town."><label>Seed</label>
          <div class="form-fields"><input type="text" name="seed" value="${esc(s.seed)}"><button type="button" data-act="seed" style="flex:0 0 auto;width:auto" title="A new seed">New</button></div></div>
        <p class="sg-stats notes" style="margin:4px 0"></p>
        <p class="notes" style="margin:4px 0">Drag a place to move it: the roads, wall and dwellings follow. Hover a place to see what it is.</p>
        <details class="sg-advanced"><summary style="cursor:pointer;margin:4px 0">Settings...</summary>${CONTROLS.map(c => controlHtml(c, s)).join("")}</details>
        <p class="sg-error" style="margin:2px 0;color:#c33"></p>
        <div class="flexrow" style="gap:4px;margin-top:6px">
          <button type="button" data-act="back" title="Every moved place back where its die landed.">Put places back</button>
          <button type="button" data-act="default" title="Every setting back to the ruled defaults, with a new seed.">Defaults</button>
        </div>
        <div class="flexrow" style="gap:4px;margin-top:6px">
          <button type="button" data-act="create" title="Make the settlement: its journal (an Overview and a page per place) and its map Scene (the layout, every place hidden until you reveal it).">Create settlement</button>
        </div>
      </form></div>`);
  }

  activateListeners(html)
  {
    super.activateListeners(html);
    const root = html[0].closest(".window-content") ?? html[0];
    root.style.overflow = "hidden";
    this.form = root.querySelector("form.sg-side");
    this.canvas = root.querySelector(".sg-map canvas");
    this.tip = root.querySelector(".sg-tip");
    this.form.addEventListener("input", ev => this._onInput(ev));
    this.form.addEventListener("change", ev => this._onInput(ev, true));
    root.querySelectorAll("button[data-act]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); this._act(b.dataset.act); }));
    this._bindMap();
    this._roll();
  }

  /** A control moved: show its value; on change, roll the town again from the same seed. */
  _onInput(ev, changed = false)
  {
    const el = ev.target;
    if(el.classList.contains("sg-name")) { this.name = el.value.trim() || null; return; }
    if(!el.name) return;
    const shown = this.form.querySelector(`.sg-val[data-for="${el.name}"]`);
    if(shown) shown.textContent = el.value;
    if(!changed) return;
    const values = Object.fromEntries([...this.form.querySelectorAll("[name]")].map(i => [i.name, i.value]));
    const before = this.settings;
    this.settings = settingsFrom(values, before);
    // a new seed, or a change to where the dice land, puts moved places back (RULED)
    if(el.name === "seed" || CONTROLS.find(c => c.key === el.name)?.place) this.moves.clear();
    this._roll();
  }

  /** Roll the town from the settings and the world's spent names, keep the GM's moves, then fit it. */
  _roll(fit = true)
  {
    const err = this.form.querySelector(".sg-error");
    try
    {
      // a copy: naming spends a key in the set it is given, and a re-roll must not spend the world's names
      this.g = generateSettlement(this.settings, { usedNames: new Set(this.used ?? []), moves: this.moves });
      err.textContent = "";
    }
    catch(e) { console.error(e); err.textContent = e.message; return; }
    if(!this.name) this.form.querySelector(".sg-name").value = this.g.name;
    this._stats();
    if(fit) this._fit(); else this._draw();
  }

  _stats()
  {
    const g = this.g, crossings = g.gathers.length;
    const scale = 4000 / g.sheet.width;
    this.form.querySelector(".sg-stats").textContent = `${g.size.split(" (")[0]}${g.larger ? ", larger" : ""}: ${g.locations.length} places, ${g.dwellings.length} dwellings, `
      + `${crossings} gathering place${crossings === 1 ? "" : "s"}. Scene ${Math.round(g.bounds.width * scale)} x ${Math.round(g.bounds.height * scale)} px.`
      + (this.moves.size ? ` ${this.moves.size} place${this.moves.size === 1 ? "" : "s"} moved.` : "");
  }

  // ---- the map ----
  _size() { const r = this.canvas.getBoundingClientRect(); return { w: Math.max(50, r.width), h: Math.max(50, r.height) }; }
  _fit()
  {
    const { w, h } = this._size(), b = this.g.bounds;
    const s = Math.min(w / b.width, h / b.height) * 0.96;
    this.view = { s, ox: (w - b.width * s) / 2 - b.x * s, oy: (h - b.height * s) / 2 - b.y * s };
    this._draw();
  }
  _toScreen(x, y) { return { x: this.view.ox + x * this.view.s, y: this.view.oy + y * this.view.s }; }
  _toSheet(x, y) { return { x: (x - this.view.ox) / this.view.s, y: (y - this.view.oy) / this.view.s }; }
  _icon(src)
  {
    if(!this.icons.has(src)) { const img = new Image(); img.onload = () => this._draw(); img.src = src; this.icons.set(src, img); }
    const img = this.icons.get(src);
    return img.complete && img.naturalWidth ? img : null;
  }
  _draw()
  {
    if(!this.g || !this.view || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1, size = this._size(), g = this.g, v = this.view;
    this.canvas.width = Math.round(size.w * dpr); this.canvas.height = Math.round(size.h * dpr);
    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0d1533"; ctx.fillRect(0, 0, size.w, size.h);
    const M = Math.min(g.sheet.width, g.sheet.height);
    // the layout, as the Scene paints it, at this view
    ctx.save(); ctx.beginPath(); const tl = this._toScreen(g.bounds.x, g.bounds.y); ctx.rect(tl.x, tl.y, g.bounds.width * v.s, g.bounds.height * v.s); ctx.clip();
    paintSettlement(ctx, { ...g, name: this.name ?? g.name }, { width: size.w, height: size.h, scale: v.s, unit: M * v.s, at: (x, y) => this._toScreen(x, y) });
    ctx.restore();
    // every place: its icon, or the problem's GM mark, with its name
    const r = M * 0.022 * v.s * 1.05;
    const fs = Math.max(10, M * 0.016 * v.s);
    for(const d of g.locations)
    {
      const p = this._toScreen(d.x, d.y), src = iconFile(d), img = src && this._icon("/" + src);
      if(d === this.hover || d === this.dragging) { ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.35, 0, Math.PI * 2); ctx.strokeStyle = "#f29ab0"; ctx.lineWidth = 2; ctx.stroke(); }
      if(img) ctx.drawImage(img, p.x - r, p.y - r, r * 2, r * 2);
      else
      {
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = MARKER[d.kind]; ctx.fill();
        ctx.lineWidth = Math.max(1, r * 0.12); ctx.strokeStyle = "#0d1533"; ctx.stroke();
        if(d.kind === "problem") { ctx.fillStyle = "#fbe7ee"; ctx.font = `bold ${r * 1.2}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", p.x, p.y + r * 0.05); }
      }
      ctx.font = `500 ${fs}px Signika, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const t = d.kind === "problem" ? `${d.name} (GM only)` : d.name;
      ctx.lineWidth = fs * 0.3; ctx.strokeStyle = "rgba(13,21,51,0.85)"; ctx.strokeText(t, p.x, p.y + r * 1.15); ctx.fillStyle = "#ece6ee"; ctx.fillText(t, p.x, p.y + r * 1.15);
    }
  }
  _placeNear(x, y)
  {
    const M = Math.min(this.g.sheet.width, this.g.sheet.height), reach = Math.max(10, M * 0.03 * this.view.s);
    let best = null, bd = reach;
    for(const d of this.g.locations) { const p = this._toScreen(d.x, d.y), dd = Math.hypot(p.x - x, p.y - y); if(dd < bd) { bd = dd; best = d; } }
    return best;
  }
  _bindMap()
  {
    const cv = this.canvas;
    let drag = null, queued = false;
    const relayout = () => { if(queued) return; queued = true; requestAnimationFrame(() => { queued = false; layoutSettlement(this.g, this.moves); this._stats(); this._draw(); }); };
    cv.addEventListener("pointerdown", e =>
    {
      const r = cv.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, ox: this.view.ox, oy: this.view.oy, moved: false, place: this._placeNear(e.clientX - r.left, e.clientY - r.top) };
      try { cv.setPointerCapture(e.pointerId); } catch(err) { /* a pointer that is not active */ }
    });
    cv.addEventListener("pointermove", e =>
    {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if(drag)
      {
        if(Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) { drag.moved = true; cv.style.cursor = "grabbing"; this.tip.hidden = true; }
        if(!drag.moved) return;
        if(drag.place)
        {
          // move the place: its new spot is kept, and everything that follows from where places stand is laid out again
          const p = this._toSheet(x, y);
          drag.place.x = p.x; drag.place.y = p.y; this.dragging = drag.place;
          this.moves.set(drag.place.id, [p.x, p.y]);
          relayout();
        }
        else { this.view.ox = drag.ox + e.clientX - drag.x; this.view.oy = drag.oy + e.clientY - drag.y; this._draw(); }
        return;
      }
      this._hover(x, y, r);
    });
    cv.addEventListener("pointerup", () => { if(drag?.place && drag.moved) { this.dragging = null; layoutSettlement(this.g, this.moves); this._stats(); this._draw(); } drag = null; cv.style.cursor = "grab"; });
    cv.addEventListener("pointerleave", () => { this.tip.hidden = true; if(this.hover) { this.hover = null; this._draw(); } });
    cv.addEventListener("wheel", e =>
    {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, v = this.view;
      const ns = Math.max(0.05, Math.min(8, v.s * Math.exp(-e.deltaY * 0.0015))), f = ns / v.s;
      v.ox = x - (x - v.ox) * f; v.oy = y - (y - v.oy) * f; v.s = ns;
      this._draw();
    }, { passive: false });
  }
  _hover(x, y, r)
  {
    const d = this._placeNear(x, y), tip = this.tip;
    if(d)
    {
      const what = d.kind === "building" ? d.type : d.kind === "seat" ? "Seat of Power" : KINDS[d.kind].label;
      tip.innerHTML = `<b>${esc(d.name)}</b><br>${esc(what)}${d.kind === "problem" ? "<br><i>Only you see it on the map.</i>" : ""}`;
      tip.hidden = false; tip.style.left = Math.min(x + 14, r.width - 270) + "px"; tip.style.top = Math.min(y + 14, r.height - 80) + "px";
    }
    else tip.hidden = true;
    if(d !== this.hover) { this.hover = d; this._draw(); }
  }

  async _create()
  {
    const btn = this.form.querySelector('[data-act="create"]');
    btn.disabled = true;
    try
    {
      const { createSettlementJournal } = await import("./settlement-journal.js");
      const { makeSettlementScene } = await import("./settlement-scene.js");
      const g = this.g;
      if(this.name) g.name = this.name;
      const journal = await createSettlementJournal(g, { moves: this.moves });
      journal.sheet.render(true);
      try
      {
        const scene = await makeSettlementScene(journal);
        ui.notifications.info(`Created ${journal.name}: its journal in Settlements and its map in Settlement Scenes.`);
        scene.view();
        this.close();
      }
      catch(e) { console.error(e); ui.notifications.error(`The journal was written, but making the map failed: ${e.message}`); }
    }
    catch(e) { console.error(e); ui.notifications.error(`Creating the settlement failed: ${e.message}`); }
    finally { btn.disabled = false; }
  }

  _act(act)
  {
    const f = this.form, err = f.querySelector(".sg-error");
    try
    {
      if(act === "fit") this._fit();
      else if(act === "create") this._create();
      else if(act === "back") { this.moves.clear(); this._roll(false); }
      else if(act === "seed") { this.settings.seed = newSeed(); f.querySelector('[name="seed"]').value = this.settings.seed; this.moves.clear(); this.name = null; this._roll(); }
      else if(act === "default") { this.settings = { ...SETTLEMENT_DEFAULTS, seed: newSeed() }; this.moves.clear(); this.name = null; this.render(true); }
    }
    catch(e) { err.textContent = e.message; }
  }

  setPosition(pos)
  {
    const out = super.setPosition(pos);
    if(this.g && this.view) this._draw();
    return out;
  }
}

/** Open the settlement generator. GM only. */
export async function openSettlementWindow(settings = {})
{
  if(!game.user.isGM) { ui.notifications.warn("Generate Settlement is for the GM."); return null; }
  const { usedSettlementNames } = await import("./settlement-journal.js");
  const w = new SettlementWindow(settings);
  w.used = usedSettlementNames();
  return w.render(true);
}
