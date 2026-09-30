/**
 * Vault Settings Tuner (foundry-system-index.csv row of that name).
 *
 * Every vault layout setting inside Foundry, with the vault it grows drawn as
 * you change them - the Vault Lattice Grower's controls and preview, without
 * its animation, statistics runs or presets (RULED 2026-09-27, Matt). It sits
 * behind "Advanced options..." in the Generate Vault window so that window
 * stays small for someone meeting it the first time. GM only.
 *
 * The controls are data (CONTROLS), so the test can prove every setting a
 * vault code carries has one and that a code survives the round trip through
 * them. The preview is top-down dots and lines, one level at a time (Matt).
 */

import { growVault, formatVaultCode, parseVaultCode, MODULE_DEFAULT, newSeed, randomizeSettings } from "./vault-layout.js";

const pct = (key, label, max, tip) => ({ key, label, kind: "range", min: 0, max, unit: "%", tip });
const flag = (key, label, tip) => ({ key, label, kind: "check", tip });
const choice = (key, label, options, tip) => ({ key, label, kind: "select", options, tip });

/** Every control, by group, with its hover tip. `key` is the settings field. */
export const CONTROLS = [
  { group: "Size", controls: [
    choice("sizeMode", "Size", [["grow", "grow by the roll table"], ["exact", "exact rooms per level"]],
           "Grow by the roll table until the vault stops or reaches the room cap, or grow each level to an exact room count."),
    { key: "perLevel", label: "Rooms per level", kind: "number", min: 2, max: 200, exactOnly: true, tip: "Exact size: each level grows to this many rooms." },
    { key: "levels", label: "Levels", kind: "number", min: 1, max: 10, exactOnly: true, tip: "Exact size: how many levels, each joined to the next by one shaft." },
    { key: "cap", label: "Room cap", kind: "range", min: 20, max: 1500, step: 10, growOnly: true, tip: "Grow by the table: stop at this many rooms." },
    { key: "seed", label: "Seed", kind: "text", tip: "The same seed and settings always grow the same vault." }
  ]},
  { group: "Connection roll", controls: [
    { key: "weights", label: "d12 faces for 1 / 2 / 3 / 4 exits", kind: "weights", tip: "Each room rolls a d12 for how many exits it wants: how many faces give 1, 2, 3 or 4." },
    choice("every", "Roll penalty", [[0, "None"], [1, "-1 every step"], [2, "-1 every 2 steps"], [3, "-1 every 3 steps"], [4, "-1 every 4 steps"], [5, "-1 every 5 steps"]],
           "Rooms farther from the entrance roll lower, so the vault thins out towards its edges. Not used in exact size."),
    flag("reset", "Reset on depth", "A shaft's landing room counts as the entrance again, so each level starts fresh."),
    pct("pDown", "Down chance", 50, "Chance a room's exit is a shaft down to a new level rather than a corridor. Not used in exact size."),
    flag("oneShaft", "One shaft per level", "Only one shaft down from each level, which stops levels multiplying.")
  ]},
  { group: "Shape rules", controls: [
    pct("momentum", "Momentum", 100, "Corridors tend to carry on the way they came in, making long straight runs."),
    pct("axisPull", "Axis pull", 100, "Corridors favour one axis, stretching the vault along a spine."),
    pct("longChance", "Long corridors", 80, "Chance a corridor runs more than one cell before its room. Off in the Module Default: room sizes already vary corridor length on a Scene."),
    choice("maxLen", "Longest", [[2, "2 cells"], [3, "3 cells"], [4, "4 cells"]], "How far a long corridor can run."),
    pct("blocked", "Blocked cells", 40, "Share of the lattice that is rubble; an exit aimed into rubble fails."),
    pct("loop", "Loop chance", 100, "Chance an exit that reaches an existing room joins it, making a loop. Lower means more dead ends."),
    choice("lost", "Failed link", [[0, "tries another exit"], [1, "is lost"]], "When an exit fails, the room tries another direction, or loses that exit."),
    flag("sym", "Symmetry", "Mirror the vault across the line through the entrance."),
    choice("lineShafts", "Symmetric shafts", [[0, "mirrored pairs allowed"], [1, "on the mirror line only"]], "With symmetry: shafts come in mirrored pairs, or only from rooms on the mirror line.")
  ]}
];

/** The flat control values of a vault's settings. Pure. */
export function valuesOf(s)
{
  return {
    sizeMode: s.exact ? "exact" : "grow", perLevel: s.exact?.n ?? 18, levels: s.exact?.levels ?? 1,
    cap: s.cap, seed: s.seed, weights: [...s.weights], every: s.every, reset: !!s.reset, pDown: s.pDown, oneShaft: !!s.oneShaft,
    momentum: s.momentum, axisPull: s.axisPull, longChance: s.longChance, maxLen: s.maxLen, blocked: s.blocked, loop: s.loop,
    lost: !!s.lost, sym: !!s.sym, lineShafts: !!s.lineShafts
  };
}

/**
 * A vault's settings from the control values, through a vault code so the
 * code's own range checks apply. Throws with the code's message on a bad value.
 */
export function settingsOf(v)
{
  // A select hands back "0" or "1", which is truthy either way.
  const on = x => x === true || x === 1 || x === "1" || x === "true";
  const s = {
    weights: v.weights.map(Number), every: Number(v.every), reset: on(v.reset), oneShaft: on(v.oneShaft), pDown: Number(v.pDown),
    cap: Number(v.cap), momentum: Number(v.momentum), axisPull: Number(v.axisPull), longChance: Number(v.longChance),
    maxLen: Number(v.maxLen), blocked: Number(v.blocked), loop: Number(v.loop), lost: on(v.lost), sym: on(v.sym),
    lineShafts: on(v.lineShafts), exact: v.sizeMode === "exact" ? { n: Number(v.perLevel), levels: Number(v.levels) } : null,
    seed: String(v.seed ?? "").trim() || newSeed()
  };
  return parseVaultCode(formatVaultCode(s));
}

/** What the preview reports beside the drawing. Pure. */
export function layoutStats(layout)
{
  return {
    rooms: layout.rooms.length, levels: layout.levels, loops: layout.loops,
    deadEnds: layout.rooms.filter(r => r.links.size === 1).length,
    capped: !!layout.capped, short: layout.short?.length ?? 0
  };
}

/* ---------- Foundry ---------- */

const esc = s => Handlebars.Utils.escapeExpression(String(s ?? ""));

function controlHtml(c, v)
{
  const tip = `title="${esc(c.tip)}"`;
  const cls = c.exactOnly ? "vt-exact" : c.growOnly ? "vt-grow" : "";
  const label = `<label for="vt-${c.key}" ${tip}>${esc(c.label)}</label>`;
  let input;
  if(c.kind === "range")
    input = `<input type="range" id="vt-${c.key}" name="${c.key}" min="${c.min}" max="${c.max}" step="${c.step ?? 1}" value="${v[c.key]}" ${tip}>`
          + `<span class="vt-val" data-for="${c.key}">${v[c.key]}${c.unit ?? ""}</span>`;
  else if(c.kind === "number") input = `<input type="number" id="vt-${c.key}" name="${c.key}" min="${c.min}" max="${c.max}" value="${v[c.key]}" ${tip}>`;
  else if(c.kind === "text") input = `<input type="text" id="vt-${c.key}" name="${c.key}" value="${esc(v[c.key])}" ${tip}>`;
  else if(c.kind === "check") input = `<input type="checkbox" id="vt-${c.key}" name="${c.key}" ${v[c.key] ? "checked" : ""} ${tip}>`;
  else if(c.kind === "select")
    input = `<select id="vt-${c.key}" name="${c.key}" ${tip}>${c.options.map(([val, text]) =>
      `<option value="${val}" ${String(typeof v[c.key] === "boolean" ? +v[c.key] : v[c.key]) === String(val) ? "selected" : ""}>${esc(text)}</option>`).join("")}</select>`;
  else if(c.kind === "weights")
    input = `<span class="vt-weights" style="display:flex;gap:4px" ${tip}>${v.weights.map((w, i) => `<input type="number" name="w${i}" min="0" max="12" value="${w}" style="flex:0 0 3.2em;width:3.2em" aria-label="${i + 1} exit${i ? "s" : ""}">`).join("")}</span>`;
  return `<div class="form-group ${cls}">${label}<div class="form-fields">${input}</div></div>`;
}

// Application is Foundry's; the offline test imports the pure half without it.
// A top-level class in a script is a global binding, not a property of globalThis, so typeof (Group 467).
const Base = typeof Application === "undefined" ? class {} : Application;
export class VaultTuner extends Base
{
  constructor(settings, { name = "", shafts = false } = {}, options = {})
  {
    super(options);
    this.values = valuesOf(settings);
    this.name = name;
    this.shafts = shafts;
    this.level = 0;
    this.layout = null;
  }

  static get defaultOptions()
  {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vaarn-vault-tuner", title: "Vault Settings Tuner", width: 860, height: "auto", resizable: true, classes: ["vaarn-vault-tuner"]
    });
  }

  async _renderInner()
  {
    const v = this.values;
    const groups = CONTROLS.map(g => `<fieldset><legend>${esc(g.group)}</legend>${g.controls.map(c => controlHtml(c, v)).join("")}</fieldset>`).join("");
    return $(`<form class="vt-form" autocomplete="off" style="display:flex;gap:12px;align-items:flex-start">
      <div class="vt-controls" style="flex:1 1 380px;min-width:340px;max-height:640px;overflow-y:auto">${groups}</div>
      <div class="vt-preview" style="flex:0 0 440px">
        <canvas width="440" height="360" style="width:440px;height:360px;background:#16130f;border-radius:4px"></canvas>
        <div class="vt-levels" style="display:flex;gap:4px;flex-wrap:wrap;margin:4px 0"></div>
        <p class="vt-stats" style="margin:2px 0"></p>
        <p class="vt-error" style="margin:2px 0;color:#c33"></p>
        <div class="form-group"><label title="The code holds every setting and the seed; pasting it into Generate Vault grows the same vault.">Vault code</label>
          <div class="form-fields"><input type="text" class="vt-code" readonly></div></div>
        <div class="form-group"><label title="Paste a vault code here and press Load to set every control from it.">Load a code</label>
          <div class="form-fields"><input type="text" class="vt-paste" placeholder="paste a code" style="flex:1 1 auto;min-width:0"><button type="button" data-act="load" style="flex:0 0 auto;width:auto">Load</button></div></div>
        <div class="flexrow" style="gap:4px;margin:4px 0">
          <button type="button" data-act="seed" title="The same settings with a new seed.">New seed</button>
          <button type="button" data-act="randomize" title="Roll the shape rules and a new seed; the size and roll table are kept.">Randomize</button>
          <button type="button" data-act="default" title="Every control back to the Module Default, with a new seed.">Module Default</button>
        </div>
        <div class="form-group"><label title="Keep these settings, without the seed, in the Setting list of Generate Vault for every GM of this world.">Save as</label>
          <div class="form-fields"><input type="text" class="vt-save" placeholder="a name" style="flex:1 1 auto;min-width:0"><button type="button" data-act="save" style="flex:0 0 auto;width:auto;white-space:nowrap">Save setting</button></div></div>
        <div class="form-group"><label title="The new journal's name; blank names it after the vault's Original Function.">Journal name</label>
          <div class="form-fields"><input type="text" class="vt-name" value="${esc(this.name)}" placeholder="blank = the vault's Original Function"></div></div>
        <div class="form-group"><label title="Shafts can roll an obstruction too; the book does not model them.">Shafts can be obstructed</label>
          <div class="form-fields"><input type="checkbox" class="vt-shafts" ${this.shafts ? "checked" : ""}></div></div>
        <div class="flexrow" style="gap:4px">
          <button type="button" data-act="generate" title="Grow this vault and write its journal.">Generate</button>
          <button type="button" data-act="scenes" title="Grow this vault, write its journal and make a Scene per level.">Generate with Scenes</button>
        </div>
      </div></form>`);
  }

  activateListeners(html)
  {
    super.activateListeners(html);
    const form = html[0].querySelector("form.vt-form") ?? html[0];
    this.form = form;
    form.addEventListener("input", () => this._fromForm());
    form.addEventListener("change", () => this._fromForm());
    form.querySelectorAll("button[data-act]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); this._act(b.dataset.act); }));
    this._update();
  }

  /** Read every control into this.values, then regrow. */
  _fromForm()
  {
    const f = this.form, v = this.values;
    for(const g of CONTROLS) for(const c of g.controls)
    {
      if(c.kind === "weights") { v.weights = [0, 1, 2, 3].map(i => f.querySelector(`[name="w${i}"]`).value); continue; }
      const el = f.querySelector(`[name="${c.key}"]`);
      v[c.key] = c.kind === "check" ? el.checked : el.value;
      const shown = f.querySelector(`.vt-val[data-for="${c.key}"]`);
      if(shown) shown.textContent = `${el.value}${c.unit ?? ""}`;
    }
    this.name = f.querySelector(".vt-name").value;
    this.shafts = f.querySelector(".vt-shafts").checked;
    this._update();
  }

  _settings() { return settingsOf(this.values); }

  /** Regrow from the current values and redraw; a bad value shows its message and keeps the last drawing. */
  _update()
  {
    const f = this.form, err = f.querySelector(".vt-error");
    const exact = this.values.sizeMode === "exact";
    f.querySelectorAll(".vt-exact").forEach(e => e.style.display = exact ? "" : "none");
    f.querySelectorAll(".vt-grow").forEach(e => e.style.display = exact ? "none" : "");
    let s;
    try { s = this._settings(); err.textContent = ""; }
    catch(e) { err.textContent = e.message; return; }
    this.layout = growVault(s);
    f.querySelector(".vt-code").value = formatVaultCode(s);
    const st = layoutStats(this.layout);
    f.querySelector(".vt-stats").textContent = `${st.rooms} rooms on ${st.levels} level${st.levels === 1 ? "" : "s"}, ${st.loops} loop${st.loops === 1 ? "" : "s"}, ${st.deadEnds} dead end${st.deadEnds === 1 ? "" : "s"}`
      + (st.capped ? ". Stopped at the room cap." : "") + (st.short ? `. ${st.short} level${st.short === 1 ? "" : "s"} stopped short by rubble.` : "");
    if(this.level >= st.levels) this.level = 0;
    const bar = f.querySelector(".vt-levels");
    bar.innerHTML = st.levels > 1 ? Array.from({ length: st.levels }, (_, z) =>
      `<button type="button" data-level="${z}" style="flex:0 0 auto;width:auto;${z === this.level ? "font-weight:bold" : ""}">Level ${z + 1}</button>`).join("") : "";
    bar.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { this.level = Number(b.dataset.level); this._update(); }));
    this._draw();
  }

  /** One level, top-down: corridors as lines, rooms as dots; the entrance ringed, shafts marked. */
  _draw()
  {
    const canvas = this.form.querySelector("canvas"), ctx = canvas.getContext("2d"), L = this.layout, z = this.level;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rooms = L.rooms.filter(r => r.z === z);
    const at = r => [r.q + r.r / 2, r.r * Math.sqrt(3) / 2];
    const pts = [...rooms.map(at), ...(L.blocked ?? []).filter(b => b.z === z).map(at)];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1;
    const k = Math.min((canvas.width - 40) / w, (canvas.height - 40) / h, 40);
    const P = r => { const [x, y] = at(r); return [20 + (x - x0) * k + (canvas.width - 40 - w * k) / 2, 20 + (y - y0) * k + (canvas.height - 40 - h * k) / 2]; };
    const dot = Math.max(2.5, Math.min(7, k / 4));
    ctx.fillStyle = "#4a4036";
    for(const b of (L.blocked ?? []).filter(b => b.z === z)) { const [x, y] = P(b); ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot); }
    ctx.strokeStyle = "#cfc8b8"; ctx.lineWidth = Math.max(1, dot / 2.5);
    for(const e of L.edges)
    {
      if(e.down) continue;
      const a = L.rooms[e.a], b = L.rooms[e.b];
      if(a.z !== z) continue;
      const [ax, ay] = P(a), [bx, by] = P(b);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    const down = new Set(), up = new Set();
    for(const e of L.edges) if(e.down) { const [hi, lo] = L.rooms[e.a].z < L.rooms[e.b].z ? [e.a, e.b] : [e.b, e.a]; down.add(hi); up.add(lo); }
    for(const r of rooms)
    {
      const [x, y] = P(r);
      ctx.fillStyle = down.has(r.id) ? "#d9822b" : up.has(r.id) ? "#5aa0d8" : "#efe9dc";
      ctx.beginPath(); ctx.arc(x, y, dot, 0, 2 * Math.PI); ctx.fill();
      if(r.id === 0) { ctx.strokeStyle = "#e8c547"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, dot + 4, 0, 2 * Math.PI); ctx.stroke(); ctx.strokeStyle = "#cfc8b8"; ctx.lineWidth = Math.max(1, dot / 2.5); }
    }
    ctx.fillStyle = "#9c9486"; ctx.font = "11px sans-serif";
    ctx.fillText("gold ring: where it grew from   orange: shaft down   blue: shaft up   brown: rubble", 8, canvas.height - 6);
  }

  _setValues(settings)
  {
    this.values = valuesOf(settings);
    this.render(true);
  }

  async _act(act)
  {
    const f = this.form;
    try
    {
      if(act === "seed") { this.values.seed = newSeed(); f.querySelector('[name="seed"]').value = this.values.seed; this._update(); }
      else if(act === "randomize") this._setValues(randomizeSettings(this._settings()));
      else if(act === "default") this._setValues({ ...MODULE_DEFAULT, seed: newSeed() });
      else if(act === "load") this._setValues(parseVaultCode(f.querySelector(".vt-paste").value));
      else if(act === "save")
      {
        const { saveVaultSetting } = await import("./vault-journal.js");
        const name = f.querySelector(".vt-save").value;
        await saveVaultSetting(name, formatVaultCode(this._settings()));
        ui.notifications.info(`Saved "${name.trim()}" in Generate Vault's Setting list.`);
      }
      else if(act === "generate" || act === "scenes")
      {
        const { generateVault } = await import("./vault-journal.js");
        game.user.setFlag("vaarn", "vaultShaftObstructions", this.shafts);
        f.querySelectorAll("button[data-act]").forEach(b => b.disabled = true);
        try { await generateVault(this._settings(), { name: this.name.trim(), shafts: this.shafts, scenes: act === "scenes" }); }
        finally { f.querySelectorAll("button[data-act]").forEach(b => b.disabled = false); }
      }
    }
    catch(e) { console.error(e); ui.notifications.error(e.message); }
  }
}

/** Open the Tuner on these settings. GM only. */
export function openVaultTuner(settings, opts = {})
{
  if(!game.user.isGM) { ui.notifications.warn("The Vault Settings Tuner is for the GM."); return null; }
  return new VaultTuner(settings, opts).render(true);
}
