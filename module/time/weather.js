/**
 * The Referee's weather tool — foundry-system-index.csv "Weather Procedure".
 *
 * The book's procedure, whole: place a marker in the centre of the hex-chart,
 * roll a d6 once at the start of each day the party spends in the desert, move
 * the marker in the direction rolled, and read off the weather. This file is
 * the marker and the button; weather-chart.js is the board it moves on.
 *
 * IT IS TIED TO NOTHING, AND THAT IS THE RULING. RULED 2026-09-12 (Matt): "I
 * don't think we tie this to anything, we'll just make it a GM tool." So:
 *
 *   - Heatwave's doubled water does NOT reach rest.js's rationDrawFor, even
 *     though that function already doubles a Long Rest's draw and would have
 *     taken it in about four lines. The tool states the rule; the table
 *     applies it.
 *   - The two Vigilance clauses wait on nothing. Vigilance Die sits directly
 *     below this row in build-order.txt and is unbuilt, and under this ruling
 *     that is not a dependency.
 *   - There is no day clock here and it does not read one. Travel and Rations
 *     ruled the daily draw out on 2026-09-12 - "rests are where the mechanics
 *     come in" - so a second per-day cycle would have been a rival to it. The
 *     day number below counts days ROLLED ON THIS CHART and means nothing else.
 *
 * WHY A WINDOW AND A CARD AND NOT A DERIVED FIELD. Same reason the Exploration
 * Clock is a window: the standing ruling across the travel cluster (Matt,
 * 2026-08-29) is that these mechanisms have to PROMPT. A weather table nobody
 * rolls is a weather table that never happens, and then Vaarn's desert stops
 * being a place with a sky.
 */

import {
  START_HEX, allHexes, inBoard, typeAt, step, outlook, laneEnd, opposite,
  adjacency, fromColRow
} from "./weather-chart.js";
import { WEATHER_TYPES, DIRECTIONS } from "./weather-data.js";
// A weather's Beam note and Vigilance DIS are its sentences (Remaining Sources chunk 2c-i, 2026-10-07);
// BEAM_STORMS lives in weather-data.js, which builds them.
import { weatherSentencesOf } from "../item/remaining-effects.js";

const SCOPE = "vaarn";
const SETTING_STATE = "weatherState";
const SETTING_PUBLIC = "weatherPublic";

/** How many past days the window keeps. A trail, not a log. */
const TRAIL = 8;

/* -------------------------------------------- */
/*  World state                                                           */
/* -------------------------------------------- */

function blankState()
{
  return { q: START_HEX.q, r: START_HEX.r, day: 0, trail: [], override: null };
}

function typeByKey(key)
{
  return WEATHER_TYPES.find(t => t.key === key) ?? null;
}

/**
 * The marker, as stored. Falls back to the centre if the hex ever goes bad.
 *
 * `override` is today's weather set by hand — foundry-system-index.csv
 * "Weather Override for the Day". It belongs to the day it was set on, so an
 * override whose day is not today's reads as none, whatever is stored.
 */
export function state()
{
  const s = game.settings.get(SCOPE, SETTING_STATE) ?? {};
  if (!inBoard(s.q, s.r)) return blankState();
  const day = s.day ?? 0;
  const override = s.override && typeByKey(s.override.key) && s.override.day === day
    ? s.override
    : null;
  return { q: s.q, r: s.r, day, trail: Array.isArray(s.trail) ? s.trail : [], override };
}

async function save(next)
{
  return game.settings.set(SCOPE, SETTING_STATE, next);
}

/** The weather the marker is standing on, whatever has been set by hand. */
export function chartWeather()
{
  const s = state();
  return typeAt(s.q, s.r);
}

/**
 * Today's weather: the Referee's override if one is set, else the chart's.
 * The one read point — the Beam reminder and the start-of-day card both come
 * through here, so they follow an override with no change of their own.
 */
export function currentWeather()
{
  const s = state();
  return (s.override && typeByKey(s.override.key)) ?? typeAt(s.q, s.r);
}

/**
 * The reminder a Beam attack posts, or null. A REMINDER, not a rule (Matt,
 * option B of three): whether this fight is actually out in the storm - or
 * sheltering from it, as a Sand Storm day's encounters are - is the Referee's
 * call. Only in the desert: the marker is the desert's weather.
 */
export function beamStormNote(environment)
{
  if (environment !== "desert") return null;
  const w = currentWeather();
  return weatherSentencesOf(w?.key).find(s => s.do?.from === "beamStorm")?.text ?? null;
}

/** Where the marker is, in the transcription's own column.row terms. */
export function markerLabel(q, r)
{
  const h = allHexes().find(c => c.q === q && c.r === r);
  return h ? `${h.col}.${h.row}` : "—";
}

/* -------------------------------------------- */
/*  The roll                                                              */
/* -------------------------------------------- */

/**
 * One day. Rolls the d6, moves the marker, records it and posts the card.
 *
 * GM-only because it writes a world setting, which Foundry refuses for a
 * player anyway — the guard is here so it refuses visibly rather than
 * throwing somewhere further down.
 */
export async function rollDay()
{
  if (!game.user.isGM)
  {
    ui.notifications.warn("Only the Referee rolls the weather.");
    return null;
  }

  const s = state();
  const roll = await new Roll("1d6").evaluate();
  const d = roll.total - 1;
  const dir = DIRECTIONS[d];
  const to = step(s.q, s.r, d);
  // What the party saw yesterday, override included: "again" is about the
  // sky, not the chart. The save below writes no override, which is what
  // ends one — "for the rest of the day" — and the step is from the marker.
  const was = currentWeather();
  const now = typeAt(to.q, to.r);

  // `sealed` is precomputed rather than compared in the template: Foundry v11
  // registers no `eq` Handlebars helper, and a missing helper throws at render
  // rather than degrading quietly. Same trap the Exploration Clock's `multi`
  // was written to avoid.
  const entry = {
    day: s.day + 1,
    roll: roll.total,
    dir: dir.key,
    how: to.how,
    sealed: to.how === "sealed",
    type: now.name,
    hex: markerLabel(to.q, to.r)
  };

  await save({
    q: to.q, r: to.r, day: s.day + 1,
    trail: [entry, ...s.trail].slice(0, TRAIL)
  });

  await postCard({ from: was, to: now, entry });
  await postForecast(to.q, to.r, { roll: roll.total, dir, how: to.how, day: entry.day });
  return entry;
}

/** Put the marker somewhere by hand — a new campaign, or a correction. */
export async function setMarker(q, r, { reset = false } = {})
{
  if (!game.user.isGM) return;
  if (!inBoard(q, r)) return;
  const s = state();
  await save({ q, r, day: reset ? 0 : s.day, trail: reset ? [] : s.trail,
               override: reset ? null : s.override });
}

/**
 * Set today's weather by hand — foundry-system-index.csv "Weather Override
 * for the Day". A Windweird's storm, a calmed one, anything the Referee rules.
 *
 * THE MARKER DOES NOT MOVE, and that is the point of the row (Matt,
 * 2026-09-23): the marker is the chart's memory, and tomorrow's d6 steps from
 * it. Moving it to a storm hex would redirect the weather's whole path. The
 * next rollDay() writes no override, which is how "for the rest of the day"
 * ends.
 *
 * NO BUTTON FOR CALMING (ruled): the Referee picks the weather it calms to
 * from the same list. NOT LINKED TO RAISE THE WINDS (ruled): a Windweird is
 * never a player, so its chant is set by hand here.
 *
 * Posts the ordinary weather card under the announce setting (ruled), and not
 * the forecast: the marker has not moved, so tomorrow's odds are unchanged.
 */
export async function setOverride(key)
{
  if (!game.user.isGM) return null;
  const type = typeByKey(key);
  if (!type) return null;
  const s = state();
  const was = currentWeather();
  // Marked on today's trail row, so the Days behind list does not claim the
  // chart gave a weather the party never saw.
  const trail = s.trail.map((t, i) => i === 0 && t.day === s.day ? { ...t, set: type.name } : t);
  await save({ q: s.q, r: s.r, day: s.day, trail, override: { key, day: s.day } });
  await postCard({ from: was, to: type, entry: { day: s.day, override: key }, turns: true });
  return type;
}

/** Undo an override set by mistake. A correction, so no card. */
export async function clearOverride()
{
  if (!game.user.isGM) return;
  const s = state();
  const trail = s.trail.map((t, i) =>
  {
    if (i !== 0 || t.day !== s.day || !t.set) return t;
    const { set, ...rest } = t;
    return rest;
  });
  await save({ q: s.q, r: s.r, day: s.day, trail, override: null });
}

/**
 * The day's card. In-world only: what the sky is doing, and what the book
 * says that costs. No roll, no direction, no chart.
 *
 * RULED 2026-09-12 (Matt), and it is a correction to how this first shipped:
 * "I would take out of (at least the player-facing) weather report: the rolled
 * number and direction. The players may interpret this as the direction the
 * weather is coming from, but the chart we're moving south on is really an
 * abstract, doesn't indicate direction within the game world." A player told
 * the weather moved SOUTH will read that as a bearing - a storm arriving from
 * the north - and the hex-chart means nothing of the kind. The same objection
 * sinks the other two lines this card used to carry: "off the edge of the
 * chart and back on the far side" and "that edge is impassable, so the marker
 * stays put" are both descriptions of the diagram, not of Vaarn.
 *
 * STRIPPED FOR EVERYONE, not just for players, though only the player case was
 * asked for. Two reasons. The Referee loses nothing, because the forecast card
 * below now carries the roll, the direction and the hex, and it is whispered
 * unconditionally. And a card whose contents depend on who is reading it is a
 * card with two behaviours to keep right; a public weather report and a private
 * Referee's report is one line each.
 *
 * PUBLIC BY DEFAULT, unlike the Exploration Clock's encounter check, which is
 * whispered because an omen the players can read is not an omen. Weather is the
 * opposite: everyone standing in the desert can see the sky. The setting exists
 * because a Referee running a vault delve may not want the surface weather
 * announced at all.
 */
async function postCard({ from, to, entry, turns = false })
{
  // "again" on any repeat, not only a sealed one: a second Sand Storm day
  // reads the same to the party whether the marker stayed put or stepped to
  // another Sand Storm hex, and which of those happened is chart business.
  // An override mid-day reads as the weather turning, and never says why.
  const heading = turns
    ? `The weather turns: <b>${to.name}</b>`
    : from.key === to.key
      ? `<b>${to.name}</b> again`
      : `<b>${to.name}</b>`;

  const when = entry.day > 0 ? `Day ${entry.day} in the desert` : `In the desert`;

  const rule = to.rule
    ? `<p style="margin:.4em 0 0"><b>${to.rule}</b></p>`
    : "";

  await ChatMessage.create({
    content:
      `<div class="vaarn-weather-card">`
      + `<p style="margin:0"><i>${when}</i><br>${heading}</p>`
      + `<p style="margin:.5em 0 0">${to.text}</p>`
      + rule
      + `</div>`,
    whisper: game.settings.get(SCOPE, SETTING_PUBLIC)
      ? []
      : ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { [SCOPE]: { weather: entry } }
  });
}

/**
 * Tomorrow's six, whispered to the Referee.
 *
 * ALWAYS WHISPERED, whatever the announce setting says, and that is the whole
 * point of it being a second message rather than a section of the card above.
 * The weather is something everyone standing in the desert can see; what it
 * might turn into tomorrow is not, and a forecast the players can read hands
 * them the one piece of information this is meant to give only the Referee.
 *
 * WHY IT CARRIES EACH OUTCOME'S RULE AND NOT A DANGER RATING. Asked for by
 * Matt 2026-09-12: "prismatic tempest is so dangerous, I want to be able to
 * really scare players so they'll take looking for underground shelter
 * seriously." A `danger` flag on the roster would have been a data field named
 * after a subject, which is the shape CLAUDE.md rules out. Printing the book's
 * own rule sentence does the same work with nothing invented - "3d6 electrical
 * damage every hour they spend aboveground" needs no rating beside it.
 *
 * ONE DAY OF WARNING IS WHAT THE CHART ALLOWS, and it lands where it should.
 * Prismatic Tempest is reachable from Sand Storm and nowhere else (measured
 * 2026-09-12, and Matt read it off the page before that), so the forecast that
 * names a tempest is always a sandstorm day's. That is the night to describe
 * the sky.
 */
async function postForecast(q, r, move = null)
{
  // The roll, the direction and the hex live HERE and nowhere else as of
  // 2026-09-12 — see postCard for why they came off the weather report. This
  // card is whispered unconditionally, so chart language is safe on it.
  const moved = !move ? ""
    : `<p style="margin:.3em 0 0;opacity:.75;font-size:.9em">`
      + `Day ${move.day}: rolled <b>${move.roll}</b>, ${move.dir.label}`
      + (move.how === "sealed"
          ? ` — impassable edge, so the marker stayed put.`
          : move.how === "wrap"
            ? ` — off the edge of the chart and back on the far side.`
            : `.`)
      + `</p>`;

  const rows = outlook(q, r).map(o =>
  {
    const odds = `<b>${o.rolls.length}/6</b>`;
    const on = `<span style="opacity:.7">on ${o.rolls.join(", ")}</span>`;
    const stays = o.stays > 0
      ? ` <span style="opacity:.7">— impassable edge, so the weather holds</span>`
      : "";
    const rule = o.type.rule
      ? `<br><span style="font-size:.9em">${o.type.rule}</span>`
      : `<br><span style="font-size:.9em;opacity:.6">No rule stated.</span>`;
    return `<li>${odds} ${o.type.name} ${on}${stays}${rule}</li>`;
  }).join("");

  await ChatMessage.create({
    content: `<div class="vaarn-weather-forecast">`
      + `<p style="margin:0"><b>Referee&rsquo;s forecast</b><br>`
      + `<span style="opacity:.75;font-size:.9em">What tomorrow&rsquo;s d6 can bring, `
      + `from hex ${markerLabel(q, r)}.</span></p>`
      + moved
      + `<ul style="margin:.4em 0 0;padding-left:1.2em">${rows}</ul></div>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { [SCOPE]: { weatherForecast: true } }
  });
}

/* -------------------------------------------- */
/*  The window                                                            */
/* -------------------------------------------- */

export class VaarnWeatherApp extends Application
{
  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions, {
      id: "vaarn-weather",
      classes: ["knave", "vaarn-weather"],
      template: "systems/vaarn/templates/apps/weather.html",
      title: "Desert Weather",
      width: 400,
      height: "auto",
      resizable: false
    });
  }

  /** @override */
  getData()
  {
    const s = state();
    const now = typeAt(s.q, s.r);
    const today = currentWeather();

    return {
      weather: today,
      // The chart's own weather, shown under an override so the Referee can
      // see what the day would have been. The census below stays the chart's.
      overridden: !!s.override,
      chartName: now.name,
      types: WEATHER_TYPES.map(t => ({ key: t.key, name: t.name, selected: t.key === today.key })),
      hex: markerLabel(s.q, s.r),
      day: s.day,
      started: s.day > 0,
      isPublic: game.settings.get(SCOPE, SETTING_PUBLIC),
      trail: s.trail,
      /* Derived from the walk on every render, never stored - see outlook()'s
         own comment for why this is a readout and not the mechanism. */
      outlook: outlook(s.q, s.r).map(o => ({
        name: o.type.name,
        rolls: o.rolls.join(", "),
        count: o.rolls.length,
        stays: o.stays > 0
      })),
      /* The one place the whole chart is legible without the book open. */
      census: WEATHER_TYPES.map((t, i) => ({
        name: t.name,
        hexes: adjacency(i).hexes,
        here: t.key === now.key
      }))
    };
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);

    html.find(".vaarn-weather-roll").click(async () =>
    {
      await rollDay();
      this.render();
    });

    // Re-post the forecast without spending a day. The roll already posts one;
    // this is for the Referee who closed the card, or who wants it again after
    // the party has argued about whether to go underground.
    html.find(".vaarn-weather-forecast-btn").click(async () =>
    {
      const s = state();
      await postForecast(s.q, s.r);
    });

    html.find(".vaarn-weather-set").click(async () =>
    {
      await setOverride(html.find(".vaarn-weather-pick").val());
      this.render();
    });

    html.find(".vaarn-weather-clear").click(async () =>
    {
      await clearOverride();
      this.render();
    });

    html.find(".vaarn-weather-public").change(async ev =>
    {
      await game.settings.set(SCOPE, SETTING_PUBLIC, ev.currentTarget.checked);
      this.render();
    });

    html.find(".vaarn-weather-reset").click(async () =>
    {
      const ok = await Dialog.confirm({
        title: "Back to the centre",
        content: "<p>Put the marker back in the centre of the chart and start "
               + "the day count again? The book starts every campaign here.</p>"
      });
      if (!ok) return;
      await setMarker(START_HEX.q, START_HEX.r, { reset: true });
      this.render();
    });
  }
}

/* -------------------------------------------- */
/*  Registration                                                          */
/* -------------------------------------------- */

export function registerWeatherSettings()
{
  // config:false for the same reason the clock's are: the window is the one
  // place these are set, and a duplicate control in Configure Settings is a
  // second place for them to disagree.
  game.settings.register(SCOPE, SETTING_STATE, {
    scope: "world", config: false, type: Object, default: blankState()
  });
  game.settings.register(SCOPE, SETTING_PUBLIC, {
    scope: "world", config: false, type: Boolean, default: true
  });
}

/** Alongside the Exploration Clock, and for the same reason. */
export function registerWeatherControls()
{
  Hooks.on("getSceneControlButtons", controls =>
  {
    if (!game.user.isGM) return;
    const tokens = controls.find(c => c.name === "token");
    if (!tokens) return;
    tokens.tools.push({
      name: "vaarn-weather",
      title: "Desert Weather",
      icon: "fas fa-cloud-sun",
      button: true,
      visible: true,
      onClick: () => new VaarnWeatherApp().render(true)
    });
  });
}
