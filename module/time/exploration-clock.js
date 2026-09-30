/**
 * The Referee's clock — foundry-system-index.csv "Exploration Turn
 * Structure". A GM-only window that advances module/time/vaarn-time.js
 * and runs the per-turn encounter check.
 *
 * WHY A WINDOW AND NOT A SHEET FIELD. The row rules this Referee-facing:
 * it never appears on a character sheet. More to the point, the standing
 * ruling across the whole travel cluster (Matt, 2026-08-29) is that the
 * requirement here is PROMPTING, not computation. A travel procedure
 * with nothing raising it is simply never invoked, and then the desert
 * stops being sparse, ancient and dangerous. So the encounter check is
 * not a passive derived value — it is a button that rolls and posts, and
 * the actions that cost a turn are named on it so the Referee picks one
 * rather than remembering that listening at a door costs a turn.
 *
 * WHAT IT DELIBERATELY DOES NOT DECIDE. The book says the Referee "may"
 * roll 2d6 or 3d6 and take the lowest when the party is over-encumbered
 * or noisy. That "may" stays with the Referee — inherited from the
 * Encumbrance Penalty row, 2026-09-07. The window shows how many PCs are
 * currently Encumbered (actor.js derives system.encumbered, so the
 * figure is free) and leaves the dice choice a dropdown. It never
 * upgrades the dice on its own.
 */

import { advance, currentTime, turnsElapsed, TIME_HOOK,
         SECONDS_PER_TURN, SECONDS_PER_HOUR, SECONDS_PER_DAY } from "./vaarn-time.js";
import { pickRangeResult } from "../actor/rolltable-picker.js";
import { applyExhaustion, clearExhaustion, exhaustionReadout,
         party as pcParty } from "../actor/exhaustion.js";
import { suppressionMsg } from "../combat/fatality.js";
import { inDarkness } from "./darkness.js";
import { entriesOf } from "./effect-board.js";
import { ELIXIRS } from "../actor/chargen-data.js";
import { ADVANCED_EXOTICA } from "../actor/advanced-exotica-data.js";
import { vaultCheckExtra, vaultExtra, partyLocation, vaultLevels, setPartyLocation, locationOptions, OTHER_VAULT,
         LOCATION_HOOK } from "../vault/vault-encounters.js";

const SCOPE = "vaarn";
const SETTING_ENV   = "explorationEnvironment";
const SETTING_DICE  = "explorationEncounterDice";
const SETTING_CHECK = "explorationAutoCheck";

/**
 * Which already-built table the check consults. Both are in
 * rolltable-data.js already, transcribed from the vault, so this
 * mechanism adds no table of its own — see rolltable-picker.js for why
 * these are read from the plain data rather than a live RollTable.
 */
/**
 * Where the party is - "vault" or "desert" - as the Referee last set it on
 * this window. Read by the Beam sandstorm reminder (2026-09-23): the weather
 * marker is the desert's, so a storm means nothing to a fight in a vault.
 */
export function currentEnvironment()
{
  return game.settings.get(SCOPE, SETTING_ENV);
}

export const ENVIRONMENTS = {
  vault:  { label: "Vault",  table: "General Encounters" },
  desert: { label: "Desert", table: "Desert Exploration Encounters" }
};

/**
 * The book's own wording: "roll 2 or even 3d6 and take the lowest single
 * result". `kl` is Foundry's keep-lowest, so the formula says the rule.
 */
export const ENCOUNTER_DICE = {
  "1d6":    "d6 — normal",
  "2d6kl":  "2d6, lowest — encumbered or noisy",
  "3d6kl":  "3d6, lowest — both"
};

/**
 * Exploration Turns in a day, DERIVED rather than typed so it cannot drift
 * from the one house ruling it rests on. If an Exploration Turn ever stops
 * being ten minutes, the cap below follows it instead of silently becoming
 * a different span.
 */
export const TURNS_PER_DAY = SECONDS_PER_DAY / SECONDS_PER_TURN;

/**
 * A night's sleep, in Exploration Turns.
 *
 * A HOUSE NUMBER, and the book is the reason it has to be one: a Long Rest is
 * "a ration of water and a meal, followed by a full night's sleep in a safe
 * place", and no hour count appears anywhere. Eight hours is ours, chosen with
 * Matt 2026-09-13. Derived from SECONDS_PER_TURN rather than typed as 48 for
 * the same reason TURNS_PER_DAY is: it is the second thing that would silently
 * become a different span if the turn length ever moved.
 */
export const LONG_REST_TURNS = (8 * SECONDS_PER_HOUR) / SECONDS_PER_TURN;

/**
 * "If they fail to do so they have a 3-in-6 chance to be surprised during the
 * night by an encounter" (Vaults/Exploration Beneath the Urth.md, Resting
 * Underground). Named rather than inlined so the threshold is legible next to
 * the d6 it gates, and so nothing reads it as the 1-in-6 the per-turn check
 * uses — the two are different numbers on the same die.
 */
export const UNSECURED_SURPRISE_MAX = 3;

/**
 * Actions that cost Exploration Turns, straight from the row's own
 * Description plus the vault file's light rule. Anything not on this
 * list is the last entry: the Referee types a number.
 */
export const TURN_ACTIONS = [
  { key: "travel", turns: 1, label: "Travel to another location" },
  { key: "search", turns: 1, label: "Search this location" },
  { key: "listen", turns: 1, label: "Listen at a door" },
  { key: "rest",   turns: 1, label: "Short Rest" },
  { key: "run",    turns: 1, label: "Run — ten locations, no detail" },
  { key: "blind",  turns: 3, label: "Travel without light" }
];

/* -------------------------------------------- */
/*  Party state                                                           */
/* -------------------------------------------- */

/**
 * The party, for the Encumbered readout.
 *
 * hasPlayerOwner is the PC test, for the same reason initiative.js gives
 * at length: this system has never set token disposition, and Foundry
 * initialises it to HOSTILE for every token, so a disposition read alone
 * would put the PCs on the wrong side of their own game. The container
 * guard is from the same file — the ground box MUST be player-owned so a
 * player can drop into it with no relay, and counting it would inflate
 * the party.
 */
export function partyEncumbrance()
{
  const party = game.actors.filter(a =>
    a.type === "character" && a.hasPlayerOwner);
  const encumbered = party.filter(a => a.system?.encumbered);
  return {
    total: party.length,
    count: encumbered.length,
    names: encumbered.map(a => a.name)
  };
}

/**
 * Who in the party gives the encounter check DIS, and why (RULED 2026-09-23,
 * Matt: Hilarious Strength and the Presence Drone, beside the Encumbered
 * readout). A roster entry declares `encounterDis`, the phrase the hint
 * names them with. An ELIXIR counts while its Active Effect Board entry runs,
 * because the vial is gone once drunk; an ADVANCED_EXOTICA item counts while
 * it is carried, because trading it away is how the book ends it. Like the
 * Encumbered line it names and stops - the dice stay the Referee's.
 */
export function encounterDisSources()
{
  const party = game.actors.filter(a =>
    a.type === "character" && a.hasPlayerOwner);
  const drunk = ELIXIRS.filter(e => e.encounterDis);
  const held = ADVANCED_EXOTICA.filter(e => e.encounterDis);
  const out = [];
  for (const actor of party)
  {
    const running = new Set(entriesOf(actor).map(en => en?.name));
    for (const e of drunk)
      if (running.has(e.name)) out.push({ actor: actor.name, reason: e.encounterDis, source: e.name });
    for (const e of held)
      if (actor.items.some(i => i.name === e.name)) out.push({ actor: actor.name, reason: e.encounterDis, source: e.name });
  }
  return out;
}

/* -------------------------------------------- */
/*  The encounter check                                                   */
/* -------------------------------------------- */

/**
 * One turn's encounter check. Rolls, resolves against the environment's
 * table, and returns the line — posting is the caller's job, because a
 * multi-turn advance posts one card for the whole span rather than N
 * cards the Referee has to read separately.
 */
export async function rollEncounterCheck(envKey, formula)
{
  const env = ENVIRONMENTS[envKey] ?? ENVIRONMENTS.vault;
  const roll = await new Roll(formula).evaluate();
  const text = await pickRangeResult(env.table, roll.total);
  // In a generated vault with the party's level recorded, an Encounter rolls that
  // level's table and an Omen names a creature from it (Vault Encounters from the
  // Exploration Clock) - every caller's card shows it, the day-start one included.
  const extra = text ? await vaultCheckExtra(ENVIRONMENTS[envKey] ? envKey : "vault", text) : "";
  return { roll, total: roll.total, text: (text ?? "<i>No result for this roll.</i>") + extra };
}

/**
 * The unsecured-campsite roll. Pure, so the offline test can drive it.
 *
 * SEPARATE FROM rollEncounterCheck, though both roll a d6 against the same
 * environment. They are different rules with different thresholds — the
 * per-turn check is 1-in-6 for an encounter and 2 for an omen, this is
 * 3-in-6 for an encounter that arrives already surprising. Folding them
 * together would make one of the two numbers wrong, and a card built from
 * the wrong one still reads perfectly.
 */
export function unsecuredSurprise(total)
{
  return total <= UNSECURED_SURPRISE_MAX;
}

/**
 * Post the span's card. Whispered — the row is Referee-facing, and an
 * omen the players can read in chat is not an omen.
 */
async function postCheckCard(results, { envKey, formula, turns, timeLabel })
{
  const env = ENVIRONMENTS[envKey] ?? ENVIRONMENTS.vault;
  const rows = results.map((r, i) =>
    `<li><b>Turn ${i + 1}</b> — ${formula} = <b>${r.total}</b><br>${r.text}</li>`
  ).join("");

  const heading = turns === 1
    ? `<b>Exploration Turn — ${env.label}</b>`
    : `<b>${turns} Exploration Turns — ${env.label}</b>`;

  await ChatMessage.create({
    content: `<p>${heading}<br><i>${timeLabel}</i></p><ul>${rows}</ul>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { [SCOPE]: { explorationCheck: true } }
  });
}

/* -------------------------------------------- */
/*  The window                                                            */
/* -------------------------------------------- */

export class VaarnExplorationClock extends Application
{
  /**
   * The readout follows the clock, not this window's own buttons.
   *
   * Found in testing 2026-09-08 and worth the hook: re-rendering only
   * after a click here left the display stale whenever the clock moved
   * from anywhere else — a second GM client, a macro, or a rewind. The
   * stale reading is the dangerous part, because it is a plausible time
   * shown with no indication it is old, and the Referee has no reason to
   * doubt it. TIME_HOOK fires on every client, so this is correct on all
   * of them; it only reads, so it needs no activeGM guard.
   */
  constructor(options = {})
  {
    super(options);
    const rerender = () => { if (this.rendered) this.render(false); };
    this._timeHookId = Hooks.on(TIME_HOOK, rerender);
    // The Party location line follows the setting, however it was changed.
    // A new location, however it was set, brings back the short list.
    this._locationHookId = Hooks.on(LOCATION_HOOK, () => { this._showAllVaults = false; rerender(); });
    // ADDED 2026-09-13 with Vault Traversal Penalties. Darkness is derived
    // from the party's board entries, so a clock that only woke for the time
    // hook would show an enabled Search button after the lights went out —
    // the "plausible stale reading" the Active Effect Board's own constructor
    // comment is about, and it hooks updateActor for exactly this reason.
    //
    // It also fixes the Encumbered readout, which had the same staleness for
    // the same reason and simply had nothing enforcing it.
    this._actorHookId = Hooks.on("updateActor", rerender);
    // A Presence Drone traded away is an item leaving, which fires no
    // updateActor - without these the drone's line would outlive the drone.
    this._itemHookIds = ["createItem", "deleteItem"].map(h => [h, Hooks.on(h, rerender)]);
  }

  /** @override */
  async close(options)
  {
    Hooks.off(TIME_HOOK, this._timeHookId);
    Hooks.off(LOCATION_HOOK, this._locationHookId);
    Hooks.off("updateActor", this._actorHookId);
    for (const [h, id] of this._itemHookIds ?? []) Hooks.off(h, id);
    return super.close(options);
  }

  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      id: "vaarn-exploration-clock",
      classes: ["knave", "vaarn-clock"],
      template: "systems/vaarn/templates/apps/exploration-clock.html",
      title: "Exploration Clock",
      width: 420,
      height: "auto",
      resizable: false
    });
  }

  /** @override */
  getData()
  {
    const env = game.settings.get(SCOPE, SETTING_ENV);
    const dice = game.settings.get(SCOPE, SETTING_DICE);
    const enc = partyEncumbrance();
    const dark = inDarkness();

    return {
      time: currentTime(),
      turnsElapsed: turnsElapsed(),
      // Handlebars cannot compare, so the plural is decided here. Found
      // in testing 2026-09-08 reading "1 Exploration Turns elapsed".
      turnPlural: turnsElapsed() === 1 ? "Turn" : "Turns",
      // `multi` is precomputed rather than compared in the template:
      // Foundry v11 registers no `ne`/`eq` Handlebars helper, and a
      // missing helper throws at render rather than degrading quietly.
      // Vault Traversal Penalties. `blocked` carries the REASON rather than a
      // boolean, so the template has one thing to test and the disabled button
      // can say why it is disabled. Computed here for the same reason `multi`
      // is: v11 registers no `eq` helper, and a template that decided this
      // would be a rule nothing could test.
      actions: TURN_ACTIONS.map(a => ({
        ...a,
        multi: a.turns > 1,
        blocked: (a.key === "search" && dark)
          ? "The party is in darkness and cannot effectively search an unlit location."
          : null
      })),
      darkness: dark
        ? "The party is in darkness. Search is disabled; encounters always "
          + "surprise, ranged attacks cannot be made and melee has DIS."
        : null,
      autoCheck: game.settings.get(SCOPE, SETTING_CHECK),
      // Rendered rather than typed into the template, so the note cannot
      // disagree with the constant if the turn length ever moves.
      longRestTurns: LONG_REST_TURNS,
      // WHICH SECTIONS THE "Where" DROPDOWN SHOWS (Matt 2026-09-13). Computed
      // here rather than compared in the template, for the reason `multi`
      // already is: Foundry v11 registers no `eq` helper and a missing one
      // throws at render instead of degrading. Named per environment rather
      // than as one `env` string, so adding a third environment has to come
      // back through this method and decide, instead of silently showing it
      // the desert's procedures.
      isVault:  env === "vault",
      isDesert: env === "desert",
      encumbered: enc,
      // The nudge the Encumbrance Penalty row asked this one to carry.
      // It states the option and stops; it never changes `dice` itself.
      encumbranceHint: enc.count > 0
        ? `${enc.count} of ${enc.total} on the Encumbered list${enc.names.length ? ` (${enc.names.join(", ")})` : ""}. ` +
          `The book lets you roll 2d6 or 3d6 and take the lowest — your call.`
        : null,
      encounterDisHint: (() =>
      {
        const src = encounterDisSources();
        return src.length
          ? src.map(s => `${s.actor}, ${s.reason} (${s.source})`).join("; ") +
            `. The book gives DIS on encounter rolls for this — 2d6, take the lowest — your call.`
          : null;
      })(),
      environments: Object.entries(ENVIRONMENTS).map(([k, v]) =>
        ({ key: k, label: v.label, selected: k === env })),
      diceOptions: Object.entries(ENCOUNTER_DICE).map(([k, v]) =>
        ({ key: k, label: v, selected: k === dice })),
      // Exhaustion. Who is carrying it, so the Referee can see the cost of the
      // last push without opening four sheets — and can see who is one push
      // from having no move left, which is the death rule.
      exhaustion: exhaustionReadout(),
      // Vault Encounters from the Exploration Clock: which generated vault level
      // the party is on, chosen here or on a level's encounter page.
      vaultLocation: (() =>
      {
        // Short by design (RULED 2026-09-27, Matt): the party's own vault, and
        // "Other vault..." for the rest, which leaves out vaults filed as explored.
        const here = partyLocation();
        return {
          label: here ? `${here.vault}, level ${here.level}` : null,
          options: locationOptions(vaultLevels(), here, !!this._showAllVaults)
        };
      })()
    };
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);

    html.find(".vaarn-clock-env").change(async ev =>
    {
      await game.settings.set(SCOPE, SETTING_ENV, ev.currentTarget.value);
      this.render();
    });

    html.find(".vaarn-clock-dice").change(async ev =>
    {
      await game.settings.set(SCOPE, SETTING_DICE, ev.currentTarget.value);
      this.render();
    });

    html.find(".vaarn-clock-vault-location").change(async ev =>
    {
      // "Other vault..." only widens the list; nothing is recorded until a level is picked.
      if (ev.currentTarget.value === OTHER_VAULT) { this._showAllVaults = true; return this.render(); }
      this._showAllVaults = false;
      const [journalId, level] = String(ev.currentTarget.value).split("|");
      await setPartyLocation(journalId || null, level);
    });

    html.find(".vaarn-clock-vault-clear").click(async () => { this._showAllVaults = false; await setPartyLocation(null); });

    html.find(".vaarn-clock-auto").change(async ev =>
    {
      await game.settings.set(SCOPE, SETTING_CHECK, ev.currentTarget.checked);
      this.render();
    });

    html.find("[data-turns]").click(ev =>
    {
      // The template already disables Search in darkness, so this is the
      // second half of the same guard rather than the only one — the board
      // app's own comment on its GM controls: a control the template hides
      // but the handler still answers is a bug waiting for a console.
      if (ev.currentTarget.dataset.key === "search" && inDarkness())
      {
        ui.notifications.warn(
          "The party is in darkness and cannot effectively search an unlit location.");
        return;
      }
      return this.advanceTurns(Number(ev.currentTarget.dataset.turns));
    });

    html.find(".vaarn-clock-custom-go").click(() =>
    {
      const n = Number(html.find(".vaarn-clock-custom").val());
      if (!Number.isFinite(n) || n < 1)
        return ui.notifications.warn("Enter a whole number of Exploration Turns.");
      this.advanceTurns(Math.floor(n));
    });

    // Hours and days exist because Timed Condition Duration — the next
    // row in build-order.txt — expires "[INT] hours" and "[INT] days",
    // and nothing else in the system can make that time pass. They run
    // no encounter check: the check is a per-Exploration-Turn rule and
    // the book gives no rate for a day of surface travel here. That is
    // the Travel and Rations row's job, not this one's.
    html.find("[data-unit]").click(ev =>
      this.advanceUnit(Number(ev.currentTarget.dataset.amount),
                       ev.currentTarget.dataset.unit));

    // Exhaustion. Both travel-day buttons hang off the +1 day advance that was
    // already here (Matt, 2026-09-11) rather than introducing a second notion
    // of a day — the plain +1 day stays exactly what it was, an ordinary
    // travel day at normal pace.
    // IMPORTED DYNAMICALLY, and only for that: day-start.js imports this file
    // for rollEncounterCheck, so a static import here would close the cycle.
    // ES modules survive one, but only while neither side touches the other's
    // bindings during evaluation, which is a condition nothing checks and a
    // future top-level const would break silently. A dynamic import keeps the
    // load-time graph one-directional.
    html.find(".vaarn-clock-day-start").click(async () =>
    {
      const { startDay } = await import("./day-start.js");
      await startDay({
        envKey: game.settings.get(SCOPE, SETTING_ENV),
        formula: game.settings.get(SCOPE, SETTING_DICE)
      });
    });

    html.find(".vaarn-clock-push").click(() => this.travelDayPush());
    html.find(".vaarn-clock-camp").click(() => this.campDayAndNight());
    html.find(".vaarn-clock-long-rest").click(ev =>
      this.longRestInVault(ev.currentTarget.dataset.secure === "1"));
    html.find(".vaarn-clock-exh-save").click(() => this.compelExhaustionSave());
    html.find(".vaarn-clock-exh-apply").click(() => this.applyExhaustionToSelected());
  }

  /**
   * Advance N Exploration Turns, checking for an encounter on each one.
   *
   * Per turn, not per span: the book checks every Exploration Turn, so a
   * ten-turn door-forcing is ten chances of being found, which is the
   * whole tension of taking a slow action in a vault.
   *
   * CAPPED AT ONE DAY PER CLICK. Matt's call 2026-09-09, and it is about
   * Long-Clock Recurrence rather than about the clock. Every other control
   * here — the turn actions, +1 hour, +8 hours, +1 day — crosses at most one
   * day boundary, so a daily affliction can only ever owe one tick and a
   * weekly one can never owe two. This typed box was the single exception,
   * and it produced the one case with no good answer: six days of Lumenrot
   * offers a single "apply on failure ×6" button, when three of those six
   * saves might have succeeded.
   *
   * IT DOES NOT MAKE THE MULTI-TICK PATH DEAD CODE. game.time.advance is
   * reachable from a macro or the console, and the Toxin Die still owes 144
   * ticks for a single day because its period is one turn — which is fine,
   * since that card carries no button and Matt approved one card naming N.
   * So the arithmetic still has to be right; this only keeps normal play out
   * of the case that has no good UI.
   *
   * AND IT SAYS SO WHEN IT BITES. Silently advancing less time than the
   * Referee asked for is the same class of fault as a readout that lies about
   * the clock — they would read "Day 2" having asked for Day 4, with nothing
   * to notice.
   */
  async advanceTurns(turns)
  {
    if (!turns || turns < 1) return;

    if (turns > TURNS_PER_DAY)
    {
      ui.notifications.info(
        `Advancing ${TURNS_PER_DAY} Exploration Turns (one day) of the ${turns} asked for, ` +
        `so afflictions tick a day at a time. Click again to continue.`);
      turns = TURNS_PER_DAY;
    }

    const envKey = game.settings.get(SCOPE, SETTING_ENV);
    const formula = game.settings.get(SCOPE, SETTING_DICE);
    const check = game.settings.get(SCOPE, SETTING_CHECK);

    const seconds = await advance(turns, "turn");
    if (!seconds) return;

    if (check)
    {
      const results = [];
      for (let i = 0; i < turns; i++)
        results.push(await rollEncounterCheck(envKey, formula));
      await postCheckCard(results, {
        envKey, formula, turns, timeLabel: currentTime().label
      });
    }
    // No render() here: the constructor hook re-renders on TIME_HOOK, so
    // one path refreshes the readout whether the clock moved from this
    // window or from anywhere else. A render here as well would be a
    // second path that only covers the easy case.
  }

  /** Advance a span with no encounter check — see the listener comment. */
  async advanceUnit(amount, unit)
  {
    const seconds = await advance(amount, unit);
    if (!seconds) return;
    await ChatMessage.create({
      content: `<p><b>Time passes</b> — ${amount} ${unit}${amount === 1 ? "" : "s"}.<br>` +
               `<i>${currentTime().label}</i></p>`,
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      flags: { [SCOPE]: { explorationCheck: true } }
    });
  }

  /* ------------------------------------------ */
  /*  Exhaustion                                                          */
  /* ------------------------------------------ */

  /**
   * Which actors an out-of-band Exhaustion control acts on.
   *
   * Controlled tokens, because the foraging case is one character who walked
   * after a mirage rather than the party. Falls back to nothing rather than to
   * the whole party: a silent widening from "the PC I selected" to "everyone"
   * is the kind of helpfulness that kills four characters at once.
   *
   * AN UNLINKED TOKEN IS REFUSED, NOT SILENTLY HANDLED. token.actor on an
   * actorLink:false token is a synthetic per-token copy, so creating an Item
   * "on" it changes nothing in game.actors and the next sheet read shows no
   * Exhaustion — the trap CLAUDE.md documents and the one that would make this
   * control look broken at random. PCs are linked in normal play, so this is a
   * guard rather than a limitation.
   */
  _selectedPCs()
  {
    const controlled = canvas?.tokens?.controlled ?? [];
    const unlinked = controlled.filter(t => !t.document?.actorLink);
    if (unlinked.length)
      ui.notifications.warn(
        `${unlinked.length} selected token(s) are not linked to their Actor, so nothing `
        + `would persist. Select the linked token, or act from the sheet.`);
    const actors = controlled
      .filter(t => t.document?.actorLink && t.actor?.type === "character")
      .map(t => t.actor);
    return [...new Set(actors)];
  }

  /**
   * One PC's outcome as a line of the card.
   *
   * The suppressed wording comes from fatality.js rather than being written
   * here, for that file's own stated reason: six hand-written copies of one
   * sentence drift.
   */
  _exhaustionLine(actor, verdict)
  {
    const who = `<b>${actor.name}</b>`;
    switch (verdict.outcome)
    {
      case "added":
        return `${who} — Exhaustion fills a slot.`;
      case "owed":
        return `${who} — <b>no free slot</b>: one item must be discarded to make room `
             + `(${verdict.owed} could be shed).`;
      case "died":
        return `${who} is <b>dead</b> — ${verdict.cause}.`;
      case "suppressed":
        return `${who} ${suppressionMsg(verdict.cause)}`;
      default:
        return `${who} — skipped; slots are not tracked for this actor.`;
    }
  }

  /** Post one card for a batch of Exhaustion outcomes. Public, not whispered:
   *  the players are the ones paying for the push, and a death is not an omen. */
  async _postExhaustionCard(title, lines)
  {
    if (!lines.length) return;
    await ChatMessage.create({
      content: `<p><b>${title}</b></p><ul><li>${lines.join("</li><li>")}</li></ul>`,
      flags: { [SCOPE]: { exhaustion: true } }
    });
  }

  /**
   * The push. "They travel double the usual distance in one day and must fill
   * an inventory slot with Exhaustion."
   *
   * PARTY-WIDE, because the book's subject is the party: "if the party exerts
   * themselves". Every PC pays, and the distance is narrative — nothing in this
   * system tracks a position on a map, so the card states the doubling and the
   * Referee moves the pin.
   *
   * Advances the day BEFORE applying, so a character who dies of the push dies
   * having made the day's distance rather than before it started.
   */
  async travelDayPush()
  {
    const pcs = pcParty();
    if (!pcs.length)
      return ui.notifications.warn("No player-owned characters to exhaust.");

    const seconds = await advance(1, "day");
    if (!seconds) return;

    const lines = [];
    for (const actor of pcs)
      lines.push(this._exhaustionLine(actor, await applyExhaustion(actor)));

    await this._postExhaustionCard(
      "The party pushes on — double the usual distance today.", lines);
  }

  /**
   * The camp. "Exhaustion is removed from a PC's inventory when the camp in one
   * place for an entire day and night."
   *
   * All of it, for every PC, on one day's advance — RULED 2026-09-11 (Matt).
   * Says who had none, so a Referee reading the card can tell "nobody was
   * tired" from "the button did nothing".
   */
  /**
   * A Long Rest taken in a vault (Vaults/Exploration Beneath the Urth.md,
   * Resting Underground). SCOPED WITH MATT 2026-09-13.
   *
   * The book: "they must find a secure campsite in a room with easily barred
   * entrances. If they fail to do so they have a 3-in-6 chance to be surprised
   * during the night by an encounter."
   *
   * THE CAMPSITE IS A CHECKBOX because there is nothing to read it from — this
   * system has no room or door model, and "easily barred entrances" is a
   * judgement made at the table. Same division as the ambush override: the
   * code carries the rule, the Referee carries the judgement.
   */
  async longRestInVault(secure)
  {
    // TIME FIRST AND UNCONDITIONALLY. The night passes whether or not anything
    // finds them, and a rest that advanced the clock only on a quiet night
    // would leak the roll into the readout.
    //
    // NOT advanceTurns(): that rolls the per-turn encounter check on every
    // turn it spends, and a night is 48 of them. The book gives the rest its
    // OWN check, so running both double-counts the same night — 48 chances of
    // being found, plus a 49th for having slept. Sleeping is not exploring,
    // and this is the check for it.
    const seconds = await advance(LONG_REST_TURNS, "turn");
    if (!seconds) return null;

    const envKey = game.settings.get(SCOPE, SETTING_ENV);
    const env = ENVIRONMENTS[envKey] ?? ENVIRONMENTS.vault;

    // NOTHING IS LOOKED UP ON THE ENVIRONMENT'S TABLE, and the bug that put
    // this comment here is worth keeping. The first build passed roll.total to
    // pickRangeResult(env.table, ...) — but that table is the PER-TURN check,
    // where 1 is an encounter, 2 an omen and 3-6 nothing. So a 3 printed
    // "Surprised in the night. Nothing." and a 2 "Surprised in the night.
    // Omen." Both are well-formed, and the run that found them was passing
    // every structural assertion at the same time: three faces of six, the die
    // shown correctly, one card, 48 turns.
    //
    // The book hands off rather than resolving. Its own per-turn row 1 reads
    // "Encounter. Roll on the current area's encounter table" — the area table
    // is the Referee's, not this system's, and no code here has a pointer to
    // it. So the surprise says an encounter arrives and stops, which is what
    // the per-turn card does one step earlier. SINCE 2026-09-27 a generated
    // vault's level table is that pointer when the Referee has recorded the
    // party's level (Vault Encounters from the Exploration Clock), and the
    // surprise then rolls it; with none recorded it stops as before.
    let roll = null, surprised = false;
    if (!secure)
    {
      roll = await new Roll("1d6").evaluate();
      surprised = unsecuredSurprise(roll.total);
    }

    const head = "<p><b>Long Rest — " + env.label + "</b><br>"
      + "<i>" + LONG_REST_TURNS + " Exploration Turns — " + currentTime().label
      + "</i></p>";

    let body;
    if (secure)
      body = "<p>A secure campsite, in a room with easily barred entrances. "
           + "No check is rolled.</p>";
    else if (!surprised)
      body = "<p>No secure campsite — 3-in-6 to be surprised. <b>d6 = "
           + roll.total + "</b>. The night passes undisturbed.</p>";
    else
      // NO SAVE IS OFFERED, and that is a ruling rather than an omission.
      // Night Watch does not reach a vault — RULED 2026-09-13 (Matt), and the
      // book scopes it in its own first sentence: "When camping in the desert,
      // the PCs may elect a party member to take watch." So the party is
      // surprised outright, with nothing to roll against it.
      body = "<p>No secure campsite — 3-in-6 to be surprised. <b>d6 = "
           + roll.total + "</b>.</p>"
           + "<p><b>Surprised in the night.</b> Roll on the current area's "
           + "encounter table.</p>"
           + await vaultExtra(envKey, "encounter")
           + "<p>No watch Save — that is a desert rule. Run the surprise "
           + "round, then roll initiative as normal.</p>";

    await ChatMessage.create({
      content: head + body,
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      flags: { [SCOPE]: { vaultLongRest: true } }
    });

    // HP AND RATIONS ARE UNTOUCHED, which is the Rest and Recovery ruling
    // rather than an omission: "Short rest on the exploration clock is for the
    // GM to track time and roll random encounters", with the character half
    // staying on each sheet, one player at a time. This is that same division,
    // one rest longer.
    return { secure, total: roll?.total ?? null, surprised };
  }

  async campDayAndNight()
  {
    const pcs = pcParty();
    if (!pcs.length)
      return ui.notifications.warn("No player-owned characters to rest.");

    const seconds = await advance(1, "day");
    if (!seconds) return;

    const lines = [];
    for (const actor of pcs)
    {
      const freed = await clearExhaustion(actor);
      lines.push(freed
        ? `<b>${actor.name}</b> — ${freed} slot${freed === 1 ? "" : "s"} of Exhaustion cleared.`
        : `<b>${actor.name}</b> — carried none.`);
    }

    await this._postExhaustionCard(
      "The party camps in one place for a full day and night.", lines);
  }

  /**
   * "CON save vs Exhaustion" — Desert Foraging row 32, and anything else the
   * Referee rules works the same way.
   *
   * DESCRIPTIVE, like every other compelled save in this system. The card names
   * the save and the target's own controller rolls it; nothing here rolls on a
   * player's behalf or applies a consequence automatically. That is the settled
   * shape for Compel-a-Target Save ("descriptive by design", item 10.3.4), and
   * the Apply control beside this one is what the Referee clicks on a failure.
   */
  async compelExhaustionSave()
  {
    const pcs = this._selectedPCs();
    if (!pcs.length)
      return ui.notifications.warn("Select the token(s) that must save.");

    const who = pcs.map(a => `<b>${a.name}</b>`).join(", ");
    await ChatMessage.create({
      content: `<p>${who} must make a <b>CON Save</b> vs <b>Exhaustion</b>.</p>`
             + `<p><i>On a failure the Referee applies one Exhaustion — it fills an `
             + `inventory slot until the party camps for a full day and night.</i></p>`,
      flags: { [SCOPE]: { exhaustion: true } }
    });
  }

  /** Apply one Exhaustion to the selected PCs — the Referee's route for a
   *  failed save, or for anything else they rule causes it. */
  async applyExhaustionToSelected()
  {
    const pcs = this._selectedPCs();
    if (!pcs.length)
      return ui.notifications.warn("Select the token(s) to exhaust.");

    const lines = [];
    for (const actor of pcs)
      lines.push(this._exhaustionLine(actor, await applyExhaustion(actor)));

    await this._postExhaustionCard("Exhaustion sets in.", lines);
    this.render(false);
  }
}

/* -------------------------------------------- */
/*  Registration                                                          */
/* -------------------------------------------- */

export function registerClockSettings()
{
  // config:false on all three — the clock window is the only place these
  // are set, and a duplicate control in Configure Settings is a second
  // place for them to disagree with what the Referee last picked.
  game.settings.register(SCOPE, SETTING_ENV, {
    scope: "world", config: false, type: String, default: "vault"
  });
  game.settings.register(SCOPE, SETTING_DICE, {
    scope: "world", config: false, type: String, default: "1d6"
  });
  game.settings.register(SCOPE, SETTING_CHECK, {
    scope: "world", config: false, type: Boolean, default: true
  });
}

/**
 * The way in. Scene Controls rather than the sidebar: this is a tool the
 * Referee reaches for while looking at the map, and the token controls
 * are already GM-gated by Foundry itself for the tools alongside it.
 */
export function registerClockControls()
{
  Hooks.on("getSceneControlButtons", controls =>
  {
    if (!game.user.isGM) return;
    const tokens = controls.find(c => c.name === "token");
    if (!tokens) return;
    tokens.tools.push({
      name: "vaarn-clock",
      title: "Exploration Clock",
      icon: "fas fa-hourglass-half",
      button: true,
      visible: true,
      onClick: () => new VaarnExplorationClock().render(true)
    });
  });
}
