/**
 * Activity Time Cost — foundry-system-index.csv "Activity Time Cost".
 *
 * Time that must be DEDICATED before an effect can happen. RULED 2026-09-08
 * (Matt), and it replaced the row's own filed description, which had asserted
 * the opposite: "they represent an amount of time that must be dedicated
 * before an effect can happen. The important thing here is knowing if the
 * effort is abandoned or interrupted, which may reset the clock, or may only
 * pause it. There should be no automatic advancement — what we need to do is
 * establish a finish line, and have a way to pause or reset progress."
 *
 * So the span is a FINISH LINE, not a cost paid up front. A Synth repair is
 * not "an hour disappears"; it is "an hour of repairing must accumulate, and
 * if the party is jumped after forty minutes, the Referee decides whether
 * those forty minutes survive".
 *
 * WHY THIS IS NOT Timed Condition Duration, which it looks exactly like from
 * the outside. That mechanism starts with something ALREADY ACTIVE and clears
 * it at expiry — the elixir is working, then stops. Here nothing has happened
 * yet and the effect fires only if the line is reached. The two run in
 * opposite directions and share only a clock.
 *
 * WHY IT LIVES ON THE EFFECT BOARD. Matt's call 2026-09-08, choosing that over
 * a register of its own. The board is already "the register of everything
 * currently running on anybody", already actor-scoped, already swept on the
 * time hook, already has a window and a visibility rule. An activity is
 * something currently running. The entries share the board's flag and its
 * storage helpers; only the arithmetic and the controls are here.
 *
 * WHY PROGRESS IS COMPUTED AND NEVER DECREMENTED — the constraint that shaped
 * every field below. effect-board.js stores an ABSOLUTE expiry and refuses to
 * hold a countdown, because a stored counter that is decremented is corrupted
 * by a missed or doubled hook and nothing afterwards can tell. A pausable
 * activity cannot use a plain expiry stamp, because pausing moves its finish
 * line. So it stores three facts that are each independently true —
 *
 *   required     the finish line, in seconds
 *   accrued      seconds banked by segments that have already ended
 *   runningSince the worldTime the current segment began, or null if paused
 *
 * — and computes progress as `accrued + (now - runningSince)`. Nothing is ever
 * decremented, a doubled hook changes nothing, and a REWIND corrects itself
 * for free: progress is derived from the clock, so winding the clock back
 * un-accrues the segment rather than stranding a number nobody can audit.
 * That last property is why this shape was chosen over banking on every tick.
 */

import {
  SCOPE, SCALES, formatSpan,
  entriesOf, setEntries, updateEntry
} from "./effect-board.js";
import { UNITS } from "./vaarn-time.js";

/* -------------------------------------------- */
/*  Pure arithmetic — no `game`, so an offline test can reach all of it.       */
/* -------------------------------------------- */

/** Is this board entry an activity rather than an active effect? */
export function isActivity(entry)
{
  return entry?.kind === "activity";
}

/**
 * How the effort ends when it is interrupted.
 *
 * PER-ACTIVITY DEFAULT WITH A REFEREE OVERRIDE. Matt's call 2026-09-08. The
 * book states the rule for exactly one case and states it absolutely — an
 * Elixir brews for Exploration Turns equal to its POT and "cannot be
 * truncated: interruptions will spoil the Elixir and render it useless" — so
 * a system that always asked would be making the Referee remember a rule the
 * book already gives. Everything else the book leaves open, so the default is
 * the lenient one and both controls are offered regardless.
 */
export const INTERRUPT = {
  pause: { label: "Pause", hint: "Progress is kept; the effort can resume." },
  reset: { label: "Reset", hint: "Progress is lost; the effort starts again." }
};

/** Seconds of effort banked so far. Clamped at 0 so a rewind cannot go negative. */
export function activityProgress(entry, now)
{
  const banked = Number(entry?.accrued) || 0;
  if (!Number.isFinite(entry?.runningSince)) return Math.max(0, banked);
  return Math.max(0, banked + (now - entry.runningSince));
}

/** Seconds still to go. Negative once the line is passed, which is deliberate. */
export function activityRemaining(entry, now)
{
  return (Number(entry?.required) || 0) - activityProgress(entry, now);
}

/** Has the effort reached its finish line? */
export function activityComplete(entry, now)
{
  return (Number(entry?.required) || 0) > 0 && activityRemaining(entry, now) <= 0;
}

/** Is the clock currently running on this effort? */
export function activityRunning(entry)
{
  return isActivity(entry) && Number.isFinite(entry?.runningSince);
}

/**
 * Progress as a percentage, clamped to 0-100 for a bar that must not overflow
 * its own box when an activity is left complete on the board.
 */
export function activityPercent(entry, now)
{
  const req = Number(entry?.required) || 0;
  if (req <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(activityProgress(entry, now) / req * 100)));
}

/**
 * The readout: "40 minutes of 1 hour", in the unit the span was authored in.
 *
 * Reuses the board's formatSpan for the same reason it exists there — a span
 * written as "6 Exploration Turns" must never be re-expressed as "1 hour",
 * because a readout that lies about the unit was a real bug (643ecf4) and
 * looked perfectly reasonable.
 */
export function activityLine(entry, now)
{
  const unit = entry?.unit ?? "turn";
  const required = Number(entry?.required) || 0;
  const req = formatSpan(required, unit, entry?.amount ?? null);
  // CAPPED AT THE FINISH LINE. Found live 2026-09-08: an effort left running
  // past its line read "11 Exploration Turns of 10 Exploration Turns", which
  // is both nonsense and inconsistent with the bar beside it, which has
  // clamped at 100% since it was written. You cannot do more of a task than
  // the task needs; the clock kept moving, the effort did not.
  const done = Math.min(activityProgress(entry, now), required || Infinity);
  return `${formatDone(done, unit)} of ${req}`;
}

/**
 * Elapsed effort, which is NOT the same formatter as time remaining and must
 * not reuse it. Found in live testing 2026-09-08 on the very first item of
 * Group 107, where a freshly started effort read "expiring of 10 Exploration
 * Turns".
 *
 * formatSpan answers "how long is left": it rounds UP so a live effect never
 * displays as 0, and it returns "expiring" at zero. Both are right for a
 * countdown and both are wrong here. Progress runs the other way — nothing
 * done must read as nothing done, and a minute into a ten-turn effort is 0
 * turns of effort, not "under 1".
 *
 * So this floors, and says 0 out loud. It keeps formatSpan's one hard rule,
 * that the authored unit is a CEILING and the display may drop below it but
 * never above: an effort written in Exploration Turns never reports its
 * progress in hours.
 */
export function formatDone(seconds, authoredUnit = "turn")
{
  const order = ["day", "hour", "turn"];
  const cap = order.indexOf(authoredUnit);
  const candidates = cap === -1 ? order : order.slice(cap);
  const smallest = candidates[candidates.length - 1];
  const s = Math.max(0, Number(seconds) || 0);

  for (const u of candidates)
  {
    const per = UNITS[u];
    if (s >= per)
    {
      const n = Math.floor(s / per);
      return `${n} ${n === 1 ? ONE[u] : MANY[u]}`;
    }
  }
  return `0 ${MANY[smallest]}`;
}

const ONE  = { day: "day",  hour: "hour",  turn: "Exploration Turn" };
const MANY = { day: "days", hour: "hours", turn: "Exploration Turns" };

/* -------------------------------------------- */
/*  Operations — these write, so they need an actor.                          */
/* -------------------------------------------- */

/**
 * Begin an effort. `required` is in seconds; the caller computes it, because
 * several consumers derive it from state the book specifies and this module
 * has no business knowing about any of them:
 *
 *   forcing a door   10 Exploration Turns minus the PC's STR bonus, minimum 1
 *   curing the Gitch one day per item slot occupied by crystals
 *   brewing          Exploration Turns equal to the Elixir's POT
 *
 * Starts RUNNING. An effort nobody has begun is not on the board at all —
 * there is no "queued" state, because the board is a register of what is
 * happening rather than a to-do list.
 */
export async function startActivity(actor, data)
{
  const now = game.time?.worldTime ?? 0;
  const entry = {
    id: foundry.utils.randomID(),
    kind: "activity",
    name: String(data.name ?? "Activity"),
    text: String(data.text ?? ""),
    note: String(data.note ?? ""),
    itemId: data.itemId ?? null,
    origin: actor.type === "npc" ? "npc" : "pc",
    revealed: false,
    revealLabel: "",
    required: Math.max(0, Math.round(Number(data.required) || 0)),
    accrued: 0,
    runningSince: now,
    onInterrupt: data.onInterrupt === "reset" ? "reset" : "pause",
    // What the effort is FOR, if anything is listening at the finish line.
    // Null for a Referee-typed effort, which is most of them — those finish
    // by being read in chat and adjudicated, with nothing automatic behind.
    purpose: data.purpose ?? null,
    announced: false,
    unit: data.unit ?? "turn",
    amount: data.amount ?? null,
    startTime: now,
    // An activity is never on the round number line, and never on the board's
    // expiry one either — leaving both null is what keeps hasExpired() from
    // sweeping it away as a lapsed effect. That is load-bearing, not tidiness.
    startRound: null,
    expiresAtTime: null,
    expiresAtRound: null
  };
  await setEntries(actor, [...entriesOf(actor), entry]);
  return entry;
}

/** Bank the running segment and stop the clock. Progress is kept. */
export async function pauseActivity(actor, id, { now = null } = {})
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  const entry = entriesOf(actor).find(e => e.id === id);
  if (!entry || !activityRunning(entry)) return null;
  return updateEntry(actor, id, {
    accrued: activityProgress(entry, t),
    runningSince: null
  });
}

/** Start the clock again from now. Banked progress is untouched. */
export async function resumeActivity(actor, id, { now = null } = {})
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  const entry = entriesOf(actor).find(e => e.id === id);
  if (!entry || !isActivity(entry) || activityRunning(entry)) return null;
  return updateEntry(actor, id, { runningSince: t, announced: false });
}

/**
 * Throw the effort away and begin again from zero.
 *
 * Keeps running if it was running: the fiction is starting over, not stopping.
 * A Referee who wants both calls pause afterwards, which is one more click for
 * the rarer case.
 */
export async function resetActivity(actor, id, { now = null } = {})
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  const entry = entriesOf(actor).find(e => e.id === id);
  if (!entry || !isActivity(entry)) return null;
  return updateEntry(actor, id, {
    accrued: 0,
    runningSince: activityRunning(entry) ? t : null,
    announced: false
  });
}

/** Apply the activity's own interruption rule. */
export async function interruptActivity(actor, id, opts = {})
{
  const entry = entriesOf(actor).find(e => e.id === id);
  if (!entry || !isActivity(entry)) return null;
  return entry.onInterrupt === "reset"
    ? resetActivity(actor, id, opts)
    : pauseActivity(actor, id, opts);
}

/* -------------------------------------------- */
/*  The finish line                                                           */
/* -------------------------------------------- */

/**
 * Everything that has reached its line and not yet been announced.
 *
 * A COMPLETED ACTIVITY IS NOT REMOVED, which is the one place this deliberately
 * parts company with the board's expiry sweep. An expiring effect has finished
 * happening and deleting it loses nothing. A completed effort is the opposite:
 * reaching the line is the moment the effect BECOMES available, and something
 * still has to be adjudicated — the repair heals d8+CON, the Gitch is cured,
 * the door opens. Deleting the row at that instant would leave a chat card as
 * the only trace, and a Referee who missed it would have no way back to it.
 *
 * So the row stays, marked complete, until it is dismissed by hand. `announced`
 * is what stops it saying so on every subsequent tick, and it is cleared again
 * by resume and reset so a rewound or restarted effort can announce afresh.
 */
export function completedActivities({ now = null } = {})
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  const out = [];
  for (const actor of game.actors)
    for (const entry of entriesOf(actor))
      if (isActivity(entry) && !entry.announced && activityComplete(entry, t))
        out.push({ actor, entry });
  return out;
}

/** Mark as announced, so a finished effort reports once and then sits quietly. */
export async function markAnnounced(actor, id)
{
  return updateEntry(actor, id, { announced: true });
}

/**
 * Clear `announced` on any effort that is no longer at its finish line, so it
 * can report again if it reaches it a second time. See onTimeAdvance for the
 * live failure this exists for.
 *
 * Only ever clears — it never sets — so it cannot cause a double report, and
 * running it on every clock movement including a rewind is safe.
 */
export async function unannounceIncomplete({ now = null } = {})
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  for (const actor of game.actors)
    for (const entry of entriesOf(actor))
      if (isActivity(entry) && entry.announced && !activityComplete(entry, t))
        await updateEntry(actor, entry.id, { announced: false });
}

/**
 * Say what has finished.
 *
 * Split by origin exactly as announceExpired does, and for the same reason: an
 * effort being made by a creature is the Referee's business, and a player
 * should not learn from a chat card that something in the dark has finished
 * doing whatever it was doing.
 */
export async function announceCompleted(completed)
{
  if (!completed.length) return;
  const gm   = completed.filter(e => e.entry.origin === "npc");
  const open = completed.filter(e => e.entry.origin !== "npc");

  for (const [batch, gmOnly] of [[gm, true], [open, false]])
  {
    if (!batch.length) continue;
    const lines = batch.map(({ actor, entry }) =>
      `<li><b>${entry.name}</b> — ${actor.name}${entry.text ? `: ${entry.text}` : ""}</li>`).join("");
    await ChatMessage.create({
      content: `<p><b>Effort complete:</b></p><ul>${lines}</ul>`
             + `<p class="notes">Still on the board until dismissed.</p>`,
      whisper: gmOnly ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [],
      flags: { [SCOPE]: { activityComplete: true } }
    });
  }
}

/**
 * The clock moved. Report anything that has reached its line.
 *
 * A REWIND REPORTS NOTHING, matching effect-board.js: `delta` is negative when
 * a Referee corrects an over-advance, and finishing an effort because time ran
 * backwards is the opposite of what the correction meant. Progress itself
 * still un-accrues, because it is computed rather than banked — so a rewound
 * activity simply has less done, with no state to repair.
 *
 * Called from knave.js beside the board's own hook rather than from inside it,
 * so this module can import effect-board.js without the two importing each
 * other. The activeGM guard is on the caller, where the board's already is.
 */
export async function onTimeAdvance({ delta } = {})
{
  // RUNS ON A REWIND TOO, and this half must come before the early return.
  // Found live 2026-09-08 (Group 107): a Referee corrects an over-advance,
  // the effort is no longer finished, and `announced` is still true — so
  // when the clock moves forward again and it genuinely completes a second
  // time, NOBODY IS TOLD. Zero messages, no error, and a row that looks
  // exactly like one that was announced properly.
  //
  // `announced` has to mean "we reported the completion that currently
  // holds", not "we reported one once". So an entry that is no longer at
  // its line has its flag cleared, here rather than in the sweep below,
  // because the case that needs it is precisely the one the sweep skips.
  await unannounceIncomplete();

  if (!(delta > 0)) return;
  const now = game.time.worldTime;
  const completed = completedActivities({ now });
  if (!completed.length) return;
  for (const { actor, entry } of completed) await markAnnounced(actor, entry.id);
  await announceCompleted(completed);
  // Anything that wants to HAPPEN at the finish line listens for this rather
  // than being called from here. Attunement is the first such consumer and it
  // must not be imported into this file: an effort is a span of time, and
  // knowing what any particular one is for would make this module grow a
  // branch per consumer. The listener is registered in knave.js, which is
  // where every other cross-cutting wiring in this system already lives.
  for (const { actor, entry } of completed)
    Hooks.callAll(ACTIVITY_COMPLETE_HOOK, { actor, entry });
}

/** Fired once per effort as it reaches its finish line. See onTimeAdvance. */
export const ACTIVITY_COMPLETE_HOOK = "vaarnActivityComplete";

/**
 * Convert an authored span to seconds using the board's own SCALES map, so
 * "3 hours" means the same thing here as it does to every other clock reader.
 * Returns null for "round", which is not on the clock's number line — an
 * effort measured in combat rounds is not a thing the book ever asks for.
 */
export function spanToSeconds(amount, unit)
{
  const n = Number(amount);
  const per = SCALES[unit]?.seconds;
  if (!Number.isFinite(n) || n <= 0 || !per) return null;
  return Math.round(n * per);
}
