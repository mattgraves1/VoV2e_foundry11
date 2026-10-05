/**
 * The Active Effect Board's window — foundry-system-index.csv "Active Effect
 * Board". State and expiry announcements live in effect-board.js; this file
 * only ever reads and renders.
 *
 * WHY A WINDOW AND NOT MORE CARDS. The per-round reminder posts a card because
 * when it was built there was nowhere to look. A card is a poor standing
 * readout — you cannot glance at chat scrollback to see how much of an elixir
 * is left — and that objection does not care who is reading. So the board is
 * where you look, and a card is what fires when something happens.
 *
 * ONE WINDOW, TWO VIEWS. Matt weighed a public board alongside a GM board, and
 * per-entry flags producing player cards. Both dissolve: an Application renders
 * per client, so one class filtered by viewer needs no second board and no card
 * stream. The Referee sees every entry and the controls; a player sees their
 * own, plus anything the Referee has revealed.
 *
 * NOT GM-GATED, unlike the Exploration Clock's scene-control button. That is
 * the whole reason this is a sibling window rather than a panel inside the
 * clock: the clock is the Referee's and carries the controls that move time,
 * and players need to read the board without reaching either.
 */

import { TIME_HOOK, currentTime, advance } from "./vaarn-time.js";
import { actorRef, actorFromRef, collectAll, visibilityFor, formatSpan, clockRemaining, roundsRemaining,
         removeEntry, updateEntry, SCALES } from "./effect-board.js";
import { isOpenEndedCondition } from "../actor/condition-data.js";
import { isActivity, activityLine, activityPercent, activityRunning,
         activityComplete, pauseActivity, resumeActivity, resetActivity,
         startActivity, spanToSeconds }
  from "./activity.js";
import { isRecurrence, formatPeriod, secondsToNextTick, thresholdReached,
         startRecurrence, suppressedReason, toxinDieOf, isGiftSustain,
         RECURRENCES, recurrenceByKey }
  from "./recurrence.js";
import { isLapse, lapseElapsedLabel, fuseLine, startLapse, LAPSES }
  from "./lapse.js";
import { deprivedEntry, deprivedFuseLine, deprivedElapsedLabel } from "../actor/deprived.js";
import { isCurse, startCurse, CURSES } from "./curse.js";
import { isGmReminder, addGmReminder, reminderSpan } from "./gm-reminder.js";
import { AFFLICTIONS, afflictionByKey, saveTargetFor, treatmentCostFor, diseaseImmuneTypes }
  from "../actor/affliction-data.js";
import { postExposure, cureAndReport, applyOnsetAndReport, startTreatment } from "../actor/affliction-card.js";
import { elapsedSeconds, stageReached, formatElapsed, rollObjectTable } from "../actor/affliction.js";
import { inDarkness, setDarkness, DARKNESS_NAME } from "./darkness.js";

/**
 * The advance controls, mirroring the Exploration Clock's own set.
 *
 * Deliberately the same buttons in both windows. They are not two clocks —
 * both call vaarn-time.js's advance(), which moves the one `worldTime` line —
 * so a Referee who has the board open never has to go and find the clock.
 */
const STEPS = [
  { amount: 1, unit: "turn", label: "+1 Turn" },
  { amount: 6, unit: "turn", label: "+1 Hour" },
  { amount: 8, unit: "hour", label: "+8 Hours" },
  { amount: 1, unit: "day",  label: "+1 Day" }
];

export class VaarnEffectBoard extends Application
{
  /**
   * Three things move this board and none of them is a click on it: the clock
   * advancing, a combat round turning, and an actor's flags changing when
   * somebody activates or ends an effect. Missing any one leaves a plausible
   * stale reading, which is the failure the clock's own readout had — see
   * commit 643ecf4. All three only read, so none needs an activeGM guard.
   */
  constructor(options = {})
  {
    super(options);
    const rerender = () => { if (this.rendered) this.render(false); };
    this._hooks = [
      ["updateWorldTime", Hooks.on(TIME_HOOK, rerender), TIME_HOOK],
      ["updateCombat", Hooks.on("updateCombat", rerender), "updateCombat"],
      ["updateActor", Hooks.on("updateActor", rerender), "updateActor"]
    ];
  }

  /** @override */
  async close(options)
  {
    for (const [, id, name] of this._hooks) Hooks.off(name, id);
    return super.close(options);
  }

  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      id: "vaarn-effect-board",
      classes: ["knave", "vaarn-effect-board"],
      template: "systems/vaarn/templates/apps/effect-board.html",
      title: "Active Effects",
      width: 460,
      height: "auto",
      resizable: true
    });
  }

  /**
   * What this viewer may see, already filtered. The template renders what it
   * is given and makes no visibility decision of its own — a template that
   * decides who sees what is a rule nothing can test.
   */
  getData()
  {
    const isGM = game.user.isGM;
    const now = game.time.worldTime;
    const round = game.combat?.round ?? null;
    const rows = [];

    for (const { actor, entry } of collectAll())
    {
      const seen = visibilityFor(entry, isGM);
      if (seen === "hidden") continue;

      // A revealed entry is a STATUS LINE, not a countdown. Matt's ruling
      // 2026-09-08: it names neither the time left nor the owning actor,
      // because you know the duration of effects you brought on yourself and
      // a blinded character does not know it has four rounds to run.
      if (seen === "status")
      {
        // The LABEL is the whole row, and the entry's own name never reaches a
        // player. An entry is named for its source — "Blinding Pelt" is the
        // lynx's ability — so showing it hands over the one thing the origin
        // ruling protects while never saying what is happening. Matt's test:
        // on a physical board you would write "Blinded: Reid".
        rows.push({ id: entry.id, actorId: actorRef(actor), status: "status",
                    name: entry.revealLabel || "Something is affecting you",
                    actorName: null, text: null,
                    note: null, remaining: null, perRound: false,
                    revealed: true, canReveal: false });
        continue;
      }

      rows.push({
        id: entry.id,
        actorId: actorRef(actor),
        status: "full",
        name: entry.name,
        // An unlinked token's row names the token, so two of one creature read apart.
        actorName: actor.token?.name ?? actor.name,
        text: entry.text || null,
        note: entry.note || null,
        // Standing GM Reminder: no end stamp, so the generic readout would say
        // "until switched off". It says what the row lasts for instead - while
        // the Item is held, the ancestry, or until the GM dismisses it.
        remaining: isGmReminder(entry) ? reminderSpan(entry) : this._remaining(entry, now, round),
        isReminder: isGmReminder(entry),
        perRound: !!entry.perRound,
        // A defined Combat Condition with no end stamped - RULED 2026-09-16
        // (Matt): the book printed no end, none was invented, and the board
        // draws attention instead. Rendered as a badge and a row class.
        openEnded: isOpenEndedCondition(entry),
        // Activity Time Cost. An activity carries no expiry stamps, so
        // _remaining() would say "until switched off" for every one of them —
        // true, and useless. Its own readout replaces that entirely, and the
        // template branches on isActivity rather than on the string.
        isActivity: isActivity(entry),
        // Long-Clock Recurrence. Like an activity it carries no expiry, so
        // _remaining() would read "until switched off" for every affliction —
        // true, and useless. Its readout is the interval and the wait, since
        // "every day, next in 4 hours" is what a Referee actually needs and
        // both halves are free from an absolute start stamp.
        isRecurrence: isRecurrence(entry),
        // Gift Sustained Use Cost, found in testing 2026-09-13 (Group 146.12).
        // Every OTHER recurrence on this board is an affliction, so the end
        // control's tooltip says "Cured — stop this affliction" — which on a
        // held Gift is wrong twice over: it is not cured and it is not an
        // affliction. The row body was already right; only the tooltip was
        // not, which is exactly why it survived the chat-card heading fix in
        // the same build.
        isGiftSustain: isGiftSustain(entry),
        // Upkeep Lapse Tracking. `elapsed` is shared with the affliction branch
        // above and computed by a different function, because the two measure
        // different things from the same stamp: an affliction is asking how
        // long it has been CARRIED and a lapse how long the upkeep has gone
        // UNMET. `fuse` is the book's sentence and nothing reads it — see
        // lapse-data.js for why that is a ruling and not an oversight.
        isLapse: isLapse(entry),
        // Deprived State reads like a lapse row (Matt, 2026-09-23).
        isDeprived: deprivedEntry(actor)?.id === entry.id,
        // Deprived carries its death fuse the same way (2026-09-23, Matt): every
        // count-up row reads what - elapsed - fuse, only the spans differ.
        fuse: isLapse(entry) ? fuseLine(entry)
            : (deprivedEntry(actor)?.id === entry.id ? deprivedFuseLine(actor) : null),
        // Quantum Daemon Debt. A curse has no end stamp, so the generic
        // branch already reads "until switched off"; the flag exists so the
        // end control can say "lifted" rather than "cured".
        isCurse: isCurse(entry),
        // The jinx number, GM-ONLY and decided here, per this method's own
        // rule that the template makes no visibility decision. The book keeps
        // the number secret; a revealed row never carries it.
        jinxNumber: isGM && isCurse(entry) && entry.jinxNumber != null ? entry.jinxNumber : null,
        interval: isRecurrence(entry) ? formatPeriod(entry) : null,
        nextTick: isRecurrence(entry)
          ? formatSpan(Math.max(0, secondsToNextTick(entry, now) ?? 0), entry.periodUnit === "week" ? "day" : entry.periodUnit)
          : null,
        // Announce-only, per the 2026-09-08 ruling — the board reports that a
        // floor has been reached and nothing acts on it.
        threshold: isRecurrence(entry) ? thresholdReached(actor, entry) : null,
        // Why it is not currently firing, when it is not. Shown rather than
        // hidden: an affliction that has silently stopped ticking looks
        // identical to one that is working, which is the failure the whole
        // board exists to prevent.
        suppressed: isRecurrence(entry) ? suppressedReason(actor, entry) : null,
        // The live TD size, so the board answers "what is running on Reid"
        // without opening his sheet. Null for every other affliction.
        toxinDie: isRecurrence(entry) ? toxinDieOf(actor, entry) : null,
        // Affliction Contraction and Cure. Like a recurrence and an activity,
        // an affliction has no expiry - it ends on a cure - so _remaining()
        // would say "until switched off" for all twelve. What a Referee needs
        // instead is HOW LONG IT HAS BEEN CARRIED, which is the whole reason
        // the board is part of this mechanism: several afflictions have onsets
        // the book does not time, so elapsed time is what the ruling is made
        // against. RULED 2026-09-13 (Matt): "we'll just have to make sure the
        // elapsed time is clear in the active effects sheet so GMs can manage
        // applying the effects."
        isAffliction: entry.kind === "affliction",
        elapsed: entry.kind === "affliction"
          ? formatElapsed(elapsedSeconds(entry, now))
          : (isLapse(entry) ? lapseElapsedLabel(entry, now)
            : (deprivedEntry(actor)?.id === entry.id ? deprivedElapsedLabel(actor, now) : null)),
        // The book's own day counts, not invented staging - Hivey Hump's hump
        // at three days and its growth at seven, Labyrinth Pox's Stage 2 at
        // three. Announced, never applied, which is the same ruling
        // Long-Clock Recurrence thresholds already run on.
        stage: entry.kind === "affliction"
          ? stageReached(afflictionByKey(entry.afflictionKey), entry, now)?.text ?? null
          : null,
        afflictionKey: entry.afflictionKey ?? null,
        // Cost of Treatment (JADE IBIS). GM-ONLY, and decided HERE rather than
        // in the template, per this method's own rule that the template makes no
        // visibility decision. RULED 2026-09-16 (Matt): helpful to the GM, so a
        // player sees their own affliction row without the price.
        treatment: isGM && entry.kind === "affliction"
          ? treatmentCostFor(afflictionByKey(entry.afflictionKey)) : null,
        // The one-time onset effect, where the book gives one and times it
        // nowhere — Brain Coral and Goldencough. Offered until it has been
        // applied, then replaced by what it rolled, so the board answers
        // "has this landed yet?" without anyone opening the sheet.
        onsetLabel: entry.kind === "affliction" && !entry.manualApplied
          ? afflictionByKey(entry.afflictionKey)?.manualEffect?.label ?? null : null,
        // A treatment that takes time (the Gitch's debridement, 2026-09-24).
        treatLabel: isGM && entry.kind === "affliction"
          ? afflictionByKey(entry.afflictionKey)?.treatment?.label ?? null : null,
        onsetDone: entry.kind === "affliction" && entry.manualApplied
          ? `onset applied — ${entry.manualRoll}` : null,
        progress: isActivity(entry) ? activityLine(entry, now) : null,
        percent: isActivity(entry) ? activityPercent(entry, now) : 0,
        running: activityRunning(entry),
        complete: isActivity(entry) && activityComplete(entry, now),
        // Shown so the Referee can see which way an interruption will go
        // BEFORE choosing it — brewing spoils, a repair merely waits, and the
        // difference is invisible once the click has happened.
        onInterrupt: entry.onInterrupt ?? null,
        revealed: !!entry.revealed,
        // What the players are currently being told, echoed back. Without
        // this the Referee types a string, publishes it, and can never read
        // it again — which matters most for a multi-target label, where the
        // wording is a list of names to be checked and amended.
        revealLabel: entry.revealLabel || null,
        // Only a creature-owned entry can be revealed. A PC's own effect is
        // already public, so offering the control there would be a button
        // that does nothing.
        // A gmOnly entry (a curse) is hidden from its own owner, so it is
        // revealable however it originated.
        canReveal: isGM && (entry.origin === "npc" || !!entry.gmOnly)
      });
    }

    rows.sort((a, b) => (a.actorName ?? "").localeCompare(b.actorName ?? "")
                     || a.name.localeCompare(b.name));

    return {
      isGM,
      rows,
      empty: rows.length === 0,
      time: currentTime(),
      inCombat: round !== null,
      round,
      steps: STEPS,
      // Vault Traversal Penalties. Derived from the party's entries rather
      // than stored, so the button and the rows on this same board cannot
      // disagree about whether the lights are out — see darkness.js.
      inDarkness: inDarkness()
    };
  }

  /**
   * The remaining-time label, in the unit the span was authored in.
   *
   * An entry can hold both scales at once — Regeneration Serum is d6 HP per
   * combat round for 6 Exploration Turns — so this returns both parts joined
   * rather than picking one. The round part is omitted with no combat running,
   * because "4 rounds left" is meaningless when no rounds are passing.
   */
  _remaining(entry, now, round)
  {
    const parts = [];

    const secs = clockRemaining(entry, now);
    if (secs !== null) parts.push(formatSpan(secs, entry.unit ?? "turn", entry.amount));

    if (round !== null)
    {
      const r = roundsRemaining(entry, round);
      if (r !== null) parts.push(`${Math.max(0, r)} combat round${r === 1 ? "" : "s"}`);
    }

    // "No stated end" must be checked against the STAMPS, not against whether
    // anything happened to be printed. Outside combat the round count is
    // deliberately suppressed — "4 rounds left" means nothing when no rounds
    // are passing — and keying the fallback on an empty parts list therefore
    // announced "no stated end" for an entry that expires at round 5. Seen on
    // the board during Group 106; the same shape as the readout faults this
    // file has already had twice, where the display contradicts the data.
    const hasEnding = Number.isFinite(entry.expiresAtRound)
                   || Number.isFinite(entry.expiresAtTime);
    if (entry.perRound && !parts.length)
      parts.push(hasEnding ? "ticks each round, ends once combat starts"
                           : "ticks each round, no stated end");
    else if (entry.perRound) parts.push("ticks each round");

    if (parts.length) return parts.join(" · ");

    // NO END AT ALL, SO REPORT ELAPSED WHERE EVERY OTHER ROW REPORTS REMAINING.
    // Added 2026-09-11 for Deprived State, on Matt's ruling: "showing how long
    // it has been in effect is important for this one, since characters die
    // after having it long enough" — three days Deprived by thirst, three weeks
    // for a Faa Nomad. Every entry the board had until then carried an end, so
    // remaining was always the only honest figure; an entry the Referee switches
    // off by hand has no remaining to show, and "until switched off" alone threw
    // away the one number that decides whether the character lives.
    //
    // DERIVED FROM THE ABSOLUTE START, never a counter. Same reasoning this file
    // and effect-board.js already apply to expiry: a stored counter is corrupted
    // by a missed or doubled hook and nothing afterwards can tell it happened.
    // recurrence.js derives its tick index from `startTime` the same way.
    //
    // The `now >= start` guard is what keeps a pre-2026-09-11 entry — which
    // defaults startTime to 0 — from reporting the whole history of the world as
    // its age. Nothing is migrated for that; it simply declines to answer.
    // "day" AS THE AUTHORED UNIT, AND IT IS A CEILING RATHER THAN A FLOOR.
    // formatSpan considers units no LARGER than the one named, so "turn" here
    // would cap the ladder at Exploration Turns and render three days as "432
    // Exploration Turns" — tidy, plausible and useless. "day" opens the whole
    // ladder, so a fresh entry reads in turns and a three-week one reads in
    // days. No authored amount: an open-ended entry has nothing to cap against.
    //
    // A zero-second age is skipped rather than formatted, because formatSpan
    // answers "expiring" for a non-positive span — correct for a countdown and
    // meaningless for an age.
    // AND ONLY WHEN THERE IS GENUINELY NO ENDING, which is not the same as
    // reaching this line. An entry with a round-scale expiry gets here whenever
    // no combat is running, because the round part is deliberately suppressed
    // outside combat — so appending an age to it would announce "no end, and
    // here is how long it has run" about something that expires at round 5.
    // That is the display contradicting the data, which is the fault this method
    // has already had twice. `hasEnding` above is the check that knows the
    // difference, and it is reused rather than re-derived.
    //
    // Found in live testing 2026-09-11, on a Blinding Pelt applied outside
    // combat — the case exists in real play, not just in a fixture.
    const start = Number(entry.startTime);
    const age = !hasEnding && Number.isFinite(start) ? now - start : null;
    const since = age !== null && age > 0 ? formatSpan(age, "day", null) : null;
    return since ? `until switched off · ${since} so far` : "until switched off";
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);

    // GM-only in the template as well as here. Both, because a control the
    // template hides but the handler still answers is a permission bug
    // waiting for someone with a console.
    html.find("[data-step]").click(ev =>
    {
      if (!game.user.isGM) return;
      const s = STEPS[Number(ev.currentTarget.dataset.step)];
      if (s) return advance(s.amount, s.unit);
    });

    // A cure is a Referee act and takes no roll. RULED 2026-09-13 (Matt):
    // "no save for curing since the book is not clear. Just a GM-only Cured
    // button for ending the affliction. This allows GMs to decide whether they
    // want characters to roll a save after treatment." The book does give a
    // treat-save - Diseases.md says the target serves "Saves to resist and
    // treat" - so not building one is a choice and is recorded as such.
    html.find(".vaarn-affliction-onset").click(async ev =>
    {
      if (!game.user.isGM) return;
      const { actorId, key } = ev.currentTarget.dataset;
      const actor = actorFromRef(actorId);
      if (!actor) return;
      await applyOnsetAndReport(actor, key);
      this.render(false);
    });

    html.find(".vaarn-affliction-treat").click(async ev =>
    {
      if (!game.user.isGM) return;
      const { actorId, key } = ev.currentTarget.dataset;
      const actor = actorFromRef(actorId);
      if (!actor) return;
      await startTreatment(actor, key);
      this.render(false);
    });

    html.find(".vaarn-affliction-cure").click(async ev =>
    {
      if (!game.user.isGM) return;
      const { actorId, key } = ev.currentTarget.dataset;
      const actor = actorFromRef(actorId);
      if (!actor) return;
      await cureAndReport(actor, key);
      this.render(false);
    });

    html.find(".vaarn-effect-begin").click(() =>
    {
      if (!game.user.isGM) return;
      return this._promptStart();
    });

    html.find(".vaarn-effect-afflict").click(() =>
    {
      if (!game.user.isGM) return;
      return this._promptAffliction();
    });

    html.find(".vaarn-effect-lapse").click(() =>
    {
      if (!game.user.isGM) return;
      return this._promptLapse();
    });

    html.find(".vaarn-effect-curse").click(() =>
    {
      if (!game.user.isGM) return;
      return this._promptCurse();
    });

    html.find(".vaarn-effect-reminder").click(() =>
    {
      if (!game.user.isGM) return;
      return this._promptReminder();
    });

    // Vault Traversal Penalties. Reads the CURRENT state rather than a value
    // captured at render, so a board left open while another client toggled
    // the lights cannot invert the switch — the same staleness the rebuild
    // comment on the ambush card is about.
    html.find(".vaarn-effect-darkness").click(async () =>
    {
      if (!game.user.isGM) return;
      const on = !inDarkness();
      const touched = await setDarkness(on);
      if (!touched.length)
        ui.notifications.warn(
          "No player-owned characters to put in darkness.");
      else
        ui.notifications.info(on
          ? `${DARKNESS_NAME}: ${touched.length} character(s) are now without light.`
          : `${DARKNESS_NAME} ended for ${touched.length} character(s).`);
      this.render(false);
    });

    // Activity Time Cost controls. GM-only in the template and here both, for
    // the reason the step buttons above give: a control the template hides but
    // the handler still answers is a permission bug waiting for a console.
    //
    // No confirmation on reset, deliberately. It is destructive — the whole
    // point of the pause/reset split is that one throws the effort away — but
    // the effort can simply be started again, and a Referee interrupting a
    // brew mid-scene should not have to clear a dialog to do it.
    for (const [cls, fn] of [[".vaarn-effect-pause",  pauseActivity],
                             [".vaarn-effect-resume", resumeActivity],
                             [".vaarn-effect-reset",  resetActivity]])
      html.find(cls).click(async ev =>
      {
        if (!game.user.isGM) return;
        const { actorId, entryId } = ev.currentTarget.dataset;
        const actor = actorFromRef(actorId);
        if (actor) return fn(actor, entryId);
      });

    html.find(".vaarn-effect-reveal").click(async ev =>
    {
      if (!game.user.isGM) return;
      const { actorId, entryId } = ev.currentTarget.dataset;
      const actor = actorFromRef(actorId);
      if (!actor) return;
      const entry = (actor.getFlag("vaarn", "effects") ?? []).find(e => e.id === entryId);
      if (!entry) return;

      // Hiding again needs no wording, so it stays one click.
      if (entry.revealed) return updateEntry(actor, entryId, { revealed: false });

      return this._promptReveal(actor, entry);
    });

    // Re-open the wording prompt on an already-revealed entry. Separate from
    // the eye, which stays a one-click hide: amending a label and withdrawing
    // it are different acts and collapsing them would make one of them
    // require the other.
    html.find(".vaarn-effect-relabel").click(async ev =>
    {
      if (!game.user.isGM) return;
      const { actorId, entryId } = ev.currentTarget.dataset;
      const actor = actorFromRef(actorId);
      const entry = (actor?.getFlag("vaarn", "effects") ?? []).find(e => e.id === entryId);
      if (entry) return this._promptReveal(actor, entry);
    });

    html.find(".vaarn-effect-end").click(async ev =>
    {
      if (!game.user.isGM) return;
      const { actorId, entryId } = ev.currentTarget.dataset;
      const actor = actorFromRef(actorId);
      if (actor) await removeEntry(actor, entryId);
    });
  }

  /**
   * Ask what the players should be told, then reveal.
   *
   * WHY THIS IS TYPED RATHER THAN DERIVED. Nothing on the entry can produce
   * the right string. Its name is the SOURCE ("Blinding Pelt"), which is what
   * the origin ruling protects and is not what is happening to anyone. Its
   * note is written for the Referee and may carry the source or several
   * targets at once. The one thing that is right — "Blinded: Reid" — exists
   * only in the Referee's head at the moment they decide the party has
   * worked it out, which is exactly when this fires.
   *
   * Prefilled from the note, because in practice the note is already close:
   * "Reid — blinded" was what got typed at activation. Prefilled, not
   * published — the Referee edits before anyone sees it.
   *
   * BLANK REFUSES. A revealed row with nothing to say is worse than no row:
   * it tells a player something is on them and denies them the one detail
   * that would make it useful.
   */
  /**
   * Begin an effort — foundry-system-index.csv "Activity Time Cost".
   *
   * A REFEREE-DRIVEN START, and it exists whatever else gets wired later.
   * Several of the book's own time costs hang off no Item at all: forcing a
   * door, brewing an Elixir, the crystal debridement that cures the Gitch.
   * There is nothing for a player to click, so the Referee starts it here,
   * picks who is doing it, and states the span.
   *
   * The actor list is every actor with an owner or NPC sheet in the world
   * rather than only PCs, because a creature can be doing something too —
   * a Windweird chanting for three hours is the whole of its rule.
   *
   * The interruption rule is asked at the start rather than at the
   * interruption, because it is a property of the task: the book says an
   * Elixir "cannot be truncated" and nothing about the party's situation
   * changes that. Both controls still appear on the row afterwards, per
   * Matt's override ruling.
   */
  /**
   * Start one of the book's long-clock afflictions on somebody.
   *
   * PICKED FROM A ROSTER, NOT TYPED. Every recurrence here is transcribed in
   * recurrence-data.js with its period, its tick wording and its threshold, so
   * the Referee chooses Lumenrot rather than re-deriving "every day, CON save,
   * lose a point of max CON" from the book each time. That is also what makes
   * this mechanism reachable from real content instead of only from stand-ins,
   * which is the check "When finishing work that needs testing" asks for.
   *
   * HOW SOMEBODY CATCHES ONE IS NOT HERE. Affliction Contraction and Cure sits
   * below this row in build-order.txt, so contraction is the Referee's act
   * today and this dialog is the whole of it.
   *
   * The first tick lands one full period after starting, never on the click —
   * see startRecurrence for the reasoning.
   */
  /**
   * Expose somebody to one of the book's twelve afflictions.
   *
   * PROMPTS THE SAVE, does not infect. RULED 2026-09-13 (Matt): "will we use
   * the 'start an affliction' UI to prompt the save? that's what makes sense
   * to me." So this posts an exposure card and the card carries the roll and
   * the Referee's button — see affliction-card.js for why the roll cannot sit
   * on the character sheet.
   *
   * THE LIST NAMES EACH ACTOR'S ANCESTRY, and that is a mechanism rather than
   * a decoration. The book's immunity clause ends "unless otherwise noted", so
   * nothing can be blocked without making the exception unreachable. RULED
   * 2026-09-13 (Matt): "let's always show ancestry next to the character's
   * name in the 'start an affliction' dropdown" — his worked case being
   * Neobloom and Jellybones, "they don't have bones", which the book does not
   * say and which is therefore his table's call and not this code's.
   *
   * NPCs ARE STILL LISTED. They get a board entry and no Item — "I guess we
   * can let tracking that an affliction is present apply to NPCs, if only so
   * that the dropdown is showing a consistent list. But I do not want to
   * litigate any disease items or effects for non-PCs."
   */
  /**
   * Start counting the days since an upkeep stopped being met.
   *
   * ROSTER PLUS A TYPED FALLBACK, which is a deliberate departure from every
   * other picker on this board. RULED 2026-09-13 (Matt): "both - roster with an
   * 'Other' option". The four the book states carry its wording and join back
   * to an atom row; a typed one covers a table ruling the book never wrote and
   * carries no fuse, because there is no book sentence to print for it.
   *
   * IT STARTS THE COUNT AND NOTHING ELSE. There is no threshold, no card and no
   * consequence — the perishing and the deserting stay the Referee's, per the
   * ruling recorded on the mechanism's row. Meeting the upkeep is ending the
   * entry, which is why this dialog has no matching "reset" partner.
   */
  async _promptLapse()
  {
    const actors = game.actors
      .filter(a => ["character", "npc"].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!actors.length)
      return ui.notifications.warn("No actors to track a lapse on.");

    const opts = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    const lapses = LAPSES
      .map(l => `<option value="${l.key}">${l.name} — ${l.rule}</option>`).join("");

    const content = `
      <div class="form-group"><label>Who</label>
        <select name="actorId">${opts}</select></div>
      <div class="form-group"><label>Going without</label>
        <select name="key">${lapses}<option value="">Other (type it below)</option></select></div>
      <div class="form-group"><label>Other</label>
        <input type="text" name="label" placeholder="e.g. no fresh water"/></div>
      <p class="notes">Counts upward from now. Nothing fires when the book's
         fuse runs out — end the row when the upkeep is met.</p>`;

    return new Dialog({
      title: "Track a lapse",
      content,
      buttons: {
        go: {
          label: "Start counting",
          callback: async html =>
          {
            const actor = game.actors.get(html.find('[name="actorId"]').val());
            const key = html.find('[name="key"]').val() || null;
            const label = (html.find('[name="label"]').val() || "").trim() || null;
            if (!actor) return;
            // A typed label is required only when no roster row was picked, so
            // an empty "Other" beside a real choice is not an error.
            if (!key && !label)
              return ui.notifications.warn("Pick a lapse from the list, or type one.");
            const entry = await startLapse(actor, { key, label });
            if (!entry) return;
            this.render(false);
            ui.notifications.info(`${actor.name}: now counting "${entry.name}".`);
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "go"
    }).render(true);
  }

  /**
   * Inflict a curse — foundry-system-index.csv "Quantum Daemon Debt".
   *
   * A Daemon's answer to an unpaid debt. No save and no exposure card: the
   * book gives the Referee the curse to visit, not the character a roll to
   * resist it. The entry lands hidden, as every board entry does.
   */
  async _promptCurse()
  {
    // Characters only: the book curses the debtor, and the one d20 outside
    // the jinx — NPC morale — is outside it because no NPC can be cursed.
    const actors = game.actors
      .filter(a => a.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!actors.length)
      return ui.notifications.warn("No characters to curse.");

    const opts = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    const curses = CURSES.map(c => `<option value="${c.key}">${c.name}</option>`).join("");

    const content = `
      <form>
        <div class="form-group">
          <label>Debtor</label>
          <select name="actorId">${opts}</select>
        </div>
        <div class="form-group">
          <label>Curse</label>
          <select name="key">${curses}</select>
        </div>
        <p class="notes">A Quantum Daemon's curse for a debt left unpaid. Jinxed
        rolls its secret number now and whispers it to you; the number shows on
        the board for you alone, and a matching kept d20 fails as a natural 1
        with JINX on the card. Evil Twins rolls its d6 on the Start the day
        card, beside the encounter checks. Lift either from the board when the
        Daemon is satisfied.</p>
      </form>`;

    return Dialog.prompt({
      title: "Inflict a curse",
      content,
      label: "Inflict",
      callback: async html =>
      {
        const actor = game.actors.get(String(html.find('[name="actorId"]').val()));
        const key = String(html.find('[name="key"]').val());
        if (!actor) return ui.notifications.warn("No actor was chosen, so nothing was inflicted.");
        const entry = await startCurse(actor, key);
        if (!entry) return ui.notifications.warn("That curse is not in the roster.");
        this.render(false);
        ui.notifications.info(`${actor.name}: ${entry.name}.`);
      },
      rejectClose: false
    });
  }

  /**
   * Write a GM reminder by hand - foundry-system-index.csv "Standing GM
   * Reminder", RULED 2026-09-23 (Matt), answering the row's open question.
   * Free text, GM-only, no end: the same row a held ferret or an ancestry
   * writes, with nothing tying it to a source, so it lasts until dismissed.
   */
  async _promptReminder()
  {
    const actors = game.actors
      .filter(a => ["character", "npc"].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!actors.length)
      return ui.notifications.warn("No characters or creatures to remind about.");

    const opts = actors.map(a =>
      `<option value="${a.id}">${a.name}${a.type === "npc" ? " [NPC]" : ""}</option>`).join("");

    const content = `
      <form>
        <div class="form-group">
          <label>On</label>
          <select name="actorId">${opts}</select>
        </div>
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" placeholder="What to remember"/>
        </div>
        <div class="form-group">
          <label>Text</label>
          <textarea name="text" rows="3"></textarea>
        </div>
        <p class="notes">A standing reminder for you alone. It has no end: dismiss it
        from the board when it no longer applies.</p>
      </form>`;

    return Dialog.prompt({
      title: "Add a GM reminder",
      content,
      label: "Add",
      callback: async html =>
      {
        const actor = game.actors.get(String(html.find('[name="actorId"]').val()));
        const name = String(html.find('[name="name"]').val() ?? "").trim();
        const text = String(html.find('[name="text"]').val() ?? "").trim();
        if (!actor) return ui.notifications.warn("No actor was chosen, so nothing was added.");
        if (!name) return ui.notifications.warn("A reminder needs a name.");
        // Plain text in, escaped: the board renders the row text as HTML, so a
        // note like "HP < 5" would otherwise break the row. Handlebars', because
        // foundry.utils.escapeHTML does not exist on v11 (found in Group 332.13).
        await addGmReminder(actor, { name, text: text ? `<p>${Handlebars.escapeExpression(text)}</p>` : "", source: "manual" });
        this.render(false);
        ui.notifications.info(`${actor.name}: reminder "${name}" added.`);
      },
      rejectClose: false
    });
  }

  async _promptAffliction()
  {
    const actors = game.actors
      .filter(a => ["character", "npc"].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!actors.length)
      return ui.notifications.warn("No actors to afflict.");

    const label = a =>
    {
      const anc = a.system?.ancestry;
      // The flag reads CREATURE TYPE (JADE IBIS, RULED 2026-09-16), so it
      // reaches NPCs and Lithification Syrup as well as the two ancestries.
      // The ancestry is still named, because the name is what the Referee is
      // choosing by and the flag is what they are scanning for.
      const types = diseaseImmuneTypes(a);
      const parts = [anc, types.length ? `disease-immune: ${types.join(", ")}` : null].filter(Boolean);
      return `${a.name}${parts.length ? ` (${parts.join(" - ")})` : ""}` +
             `${a.type === "npc" ? " [NPC - tracking only]" : ""}`;
    };
    const opts = actors.map(a => `<option value="${a.id}">${label(a)}</option>`).join("");

    const group = kind => AFFLICTIONS.filter(x => x.kind === kind)
      .map(x => `<option value="${x.key}">${x.name} - Virulence ${x.virulence}` +
                `${x.abilitySlot ? `, slot ${x.abilitySlot}` : ""}${x.incomplete ? " (INCOMPLETE IN THIS EDITION)" : ""}</option>`)
      .join("");
    const afflictions = `<optgroup label="Diseases">${group("disease")}</optgroup>` +
                        `<optgroup label="Nanomachine Infections">${group("nanomachine")}</optgroup>`;

    // The Stoma's object: d100 on the Vault Trinkets table (JADE IBIS; RULED
    // 2026-09-21, Matt), rolled when the dialog opens and editable, so the
    // Referee can keep it, re-open for another, or write their own.
    const stoma = recurrenceByKey("fabricator-stoma");
    let trinketRoll = null;
    const trinket = stoma?.objectTable
      ? rollObjectTable(stoma.objectTable, n => (trinketRoll = Math.floor(Math.random() * n) + 1))
      : "";
    const escapeAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

    const content = `
      <form>
        <div class="form-group">
          <label>Exposed</label>
          <select name="actorId">${opts}</select>
        </div>
        <div class="form-group">
          <label>Affliction</label>
          <select name="key">${afflictions}</select>
        </div>
        <div class="form-group">
          <label>Stoma object${trinketRoll ? ` (d100 on ${stoma.objectTable}: ${trinketRoll})` : ""}</label>
          <input type="text" name="objectLabel" value="${escapeAttr(trinket)}"/>
        </div>
        <div class="form-group">
          <label>Skip the save</label>
          <input type="checkbox" name="voluntary"/>
        </div>
        <p class="notes">Posts an exposure card. The save is rolled from the
        card, not from the sheet, so a Synth or an implanted character picks up
        the DIS the book gives them against nanomachine infections. Failing it
        does NOT infect anybody - it arms the Referee's button, so a secret roll
        or a vector the book gives as a chance still works. Skip the save for a
        deliberate infection, which is Brain Coral. Stoma object is ignored
        unless the affliction is Fabricator Stoma.</p>
      </form>`;

    return Dialog.prompt({
      title: "Expose to an affliction",
      content,
      label: "Expose",
      callback: async html =>
      {
        const actor = game.actors.get(String(html.find('[name="actorId"]').val()));
        const key = String(html.find('[name="key"]').val());
        const def = afflictionByKey(key);
        if (!actor) return ui.notifications.warn("No actor was chosen, so nothing was posted.");
        if (!def) return ui.notifications.warn("That affliction is not in the roster.");
        if (def.incomplete)
          ui.notifications.warn(`${def.name} is incomplete in the current edition - it occupies its slot and does nothing.`);
        await postExposure(actor, key, {
          voluntary: html.find('[name="voluntary"]').is(":checked"),
          // Carried only for the Stoma; every other affliction ignores it.
          stomaObject: key === "fabricator-stoma" ? String(html.find('[name="objectLabel"]').val() ?? "").trim() : null,
        });
      },
      rejectClose: false
    });
  }

  async _promptStart()
  {
    const actors = game.actors
      .filter(a => ["character", "npc"].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!actors.length)
      return ui.notifications.warn("No actors to attach an effort to.");

    const opts = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    const units = Object.entries(SCALES)
      // "round" is excluded on purpose: an effort is never measured in combat
      // rounds, and offering it would produce an activity with no span at all.
      .filter(([k]) => k !== "round")
      .map(([k, v]) => `<option value="${k}"${k === "turn" ? " selected" : ""}>${v.label}</option>`)
      .join("");

    const content = `
      <form>
        <div class="form-group">
          <label>Who is doing it</label>
          <select name="actorId">${opts}</select>
        </div>
        <div class="form-group">
          <label>What</label>
          <input type="text" name="name" placeholder="e.g. Forcing the door"/>
        </div>
        <div class="form-group">
          <label>How long</label>
          <input type="number" name="amount" value="1" min="1" step="1" style="flex: 0 0 5em;"/>
          <select name="unit">${units}</select>
        </div>
        <div class="form-group">
          <label>If interrupted</label>
          <select name="onInterrupt">
            <option value="pause" selected>Pause — progress is kept</option>
            <option value="reset">Reset — progress is lost</option>
          </select>
        </div>
        <p class="notes">The span is a finish line, not a cost paid now. Nothing
        is deducted; the effort accrues as the clock moves, and you can pause or
        reset it at any point.</p>
      </form>`;

    return Dialog.prompt({
      title: "Begin an effort",
      content,
      label: "Begin",
      callback: async html =>
      {
        const actor = game.actors.get(String(html.find('[name="actorId"]').val()));
        const name  = String(html.find('[name="name"]').val() ?? "").trim();
        const unit  = String(html.find('[name="unit"]').val());
        const amount = Number(html.find('[name="amount"]').val());
        const required = spanToSeconds(amount, unit);

        // Refused rather than clamped. A zero-length effort completes on the
        // next tick and announces itself, which looks exactly like a working
        // activity and is not one — the same failure the offline test guards
        // against from the arithmetic side.
        if (!actor) return ui.notifications.warn("No actor was chosen, so no effort was begun.");
        if (!required)
          return ui.notifications.warn(
            `"${amount} ${unit}" is not a span anything can be spent on, so no effort was begun.`);

        await startActivity(actor, {
          name: name || "Effort",
          required,
          unit,
          amount,
          onInterrupt: String(html.find('[name="onInterrupt"]').val())
        });
      },
      rejectClose: false
    });
  }

  async _promptReveal(actor, entry)
  {
    // Previous wording first, note second. Re-revealing something you hid a
    // moment ago should not make you retype what you already decided; the
    // note is only the starting point the first time.
    const source = entry.revealLabel || entry.note || "";
    const prefill = Handlebars.escapeExpression(source);
    const content = `
      <form>
        <div class="form-group">
          <label>Tell the players</label>
          <input type="text" name="label" value="${prefill}"
                 placeholder="e.g. Blinded: Reid"/>
        </div>
        <p class="notes">This is the whole row they will see — not the effect's
        name, which would give away where it came from, and not how long is
        left. Write what you would write on a board.</p>
      </form>`;

    return Dialog.prompt({
      title: `Reveal: ${entry.name}`,
      content,
      label: "Show the players",
      callback: async html =>
      {
        const label = String(html.find('[name="label"]').val() ?? "").trim();
        if (!label)
          return ui.notifications.warn(
            "Nothing was typed, so nothing was revealed — a row with no wording tells a player less than no row at all.");
        await updateEntry(actor, entry.id, { revealed: true, revealLabel: label });
      },
      rejectClose: false
    });
  }
}

/**
 * The scene-control button. NOT gated on isGM — that is the difference from
 * registerClockControls, and it is the point: a player needs to open this.
 */
export function registerBoardControls()
{
  Hooks.on("getSceneControlButtons", controls =>
  {
    const tokens = controls.find(c => c.name === "token");
    if (!tokens) return;
    tokens.tools.push({
      name: "vaarn-effect-board",
      title: "Active Effects",
      icon: "fas fa-list-check",
      button: true,
      visible: true,
      onClick: () => new VaarnEffectBoard().render(true)
    });
  });
}
