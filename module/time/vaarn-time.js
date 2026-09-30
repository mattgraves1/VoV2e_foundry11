/**
 * Vaarn's clock — foundry-system-index.csv "Exploration Turn Structure".
 *
 * The time unit for non-combat play. Everything in Phase 1 of
 * build-order.txt hangs off this file: Timed Condition Duration reads it
 * to expire "[INT] hours" and "[INT] days", Light Source Duration burns
 * against it, and the travel cluster above it in the index counts days
 * with it.
 *
 * WHY worldTime AND NOT A Combat DOCUMENT. A Foundry Combat is a round
 * counter with a Next-Round button, which looks like a free exploration
 * tracker and is not one. This system already hangs real behaviour off
 * `game.combat`: three deleteCombat hooks (usage-die resolution, round-
 * effect cleanup, the Berserker flag), an updateCombat hook driving
 * combat/round-effects.js, weapons flagged fired-in-combat against
 * game.combat.id, and VaarnCombat's four initiative modes. An
 * "Exploration" Combat would fire every one of them — per-round reminder
 * cards once per exploration turn, usage dice resolving when the delve
 * ended — and it would make a real fight impossible to start without
 * first ending the exploration tracker, which is backwards. `worldTime`
 * is Foundry's actual elapsed-time primitive: a seconds counter the GM
 * advances, persisted in the world and broadcast to every client.
 *
 * SECONDS_PER_TURN IS A HOUSE RULING, not a book fact. Checked against
 * CRIMSON HOUND 2026-09-08: the book abstracts vault time into
 * Exploration Turns and never says how long one is. But durations arrive
 * in three units — "[INT] hours" (Flatten), "[INT] days" (Planeyfied),
 * "4 Exploration Turns" (most of the Elixir table) — so holding all
 * three on one number line needs a conversion the book does not supply.
 * RULED 2026-09-08 (Matt): ten minutes, the OSR default, which also fits
 * the book's own furniture — running past ten locations in a turn,
 * forcing a door in ten, listening at one for one.
 */

/** Ten minutes. See the class comment: a house ruling, not a book fact. */
export const SECONDS_PER_TURN = 600;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY  = 86400;

/**
 * The hook every later mechanism listens to instead of `updateWorldTime`.
 * One name here means the semantics can change in one place; the payload
 * carries the turn delta, which updateWorldTime does not.
 *
 * Fired on EVERY client, because it is re-emitted from updateWorldTime
 * rather than from the advancing user. A consumer that WRITES anything
 * must therefore guard on `game.user === game.users.activeGM`, not on
 * isGM — this world runs two GM-privileged users simultaneously, and
 * that exact confusion posted every round-effect card twice until it was
 * found in testing on 2026-09-08.
 */
export const TIME_HOOK = "vaarnTimeAdvance";

export const UNITS = {
  turn: SECONDS_PER_TURN,
  hour: SECONDS_PER_HOUR,
  day:  SECONDS_PER_DAY
};

/* -------------------------------------------- */
/*  Pure conversions — no `game`, so these are the testable half.         */
/* -------------------------------------------- */

/** Seconds for `amount` of `unit` ("turn" | "hour" | "day"). */
export function toSeconds(amount, unit = "turn")
{
  const per = UNITS[unit];
  if (!per) throw new Error(`Unknown Vaarn time unit "${unit}".`);
  return Math.round(amount * per);
}

/** Whole Exploration Turns in a span of seconds. */
export function turnsOf(seconds)
{
  return Math.floor(seconds / SECONDS_PER_TURN);
}

/**
 * A span of seconds as the Referee reads it. Day is 1-based because a
 * campaign starts on day one, not day zero — worldTime 0 is "Day 1,
 * 00:00", which is what a GM opening a fresh world expects to see.
 */
export function formatElapsed(seconds)
{
  const s = Math.max(0, Math.floor(seconds));
  const day = Math.floor(s / SECONDS_PER_DAY) + 1;
  const rem = s % SECONDS_PER_DAY;
  const hour = Math.floor(rem / SECONDS_PER_HOUR);
  const minute = Math.floor((rem % SECONDS_PER_HOUR) / 60);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return { day, hour, minute, label: `Day ${day} — ${hh}:${mm}` };
}

/* -------------------------------------------- */
/*  World state                                                           */
/* -------------------------------------------- */

/** Whole Exploration Turns elapsed since the world began. */
export function turnsElapsed()
{
  return turnsOf(game.time.worldTime);
}

/** The current time, formatted. */
export function currentTime()
{
  return formatElapsed(game.time.worldTime);
}

/**
 * Advance the clock. GM-only — `game.time.advance` is a GM operation in
 * Foundry and fails silently for anyone else, so the guard is here to
 * make that a visible refusal rather than a button that does nothing.
 *
 * Returns the seconds actually advanced, or 0 if refused.
 */
export async function advance(amount, unit = "turn")
{
  if (!game.user.isGM)
  {
    ui.notifications.warn("Only the Referee can advance the clock.");
    return 0;
  }
  const seconds = toSeconds(amount, unit);
  if (seconds <= 0) return 0;
  await game.time.advance(seconds);
  return seconds;
}

/**
 * Re-emit updateWorldTime as TIME_HOOK, with the turn delta worked out.
 *
 * `delta` is what Foundry hands us and can be negative — a GM correcting
 * an over-advance rewinds the clock — so consumers get the sign and are
 * expected to honour it rather than assume time only moves forward.
 */
export function registerTimeHooks()
{
  Hooks.on("updateWorldTime", (worldTime, delta) =>
  {
    Hooks.callAll(TIME_HOOK, {
      worldTime,
      delta,
      turnsDelta: Math.trunc(delta / SECONDS_PER_TURN),
      turnsTotal: turnsOf(worldTime),
      time: formatElapsed(worldTime)
    });
  });
}
