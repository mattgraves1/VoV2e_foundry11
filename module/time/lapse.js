/**
 * Upkeep Lapse Tracking — foundry-system-index.csv "Upkeep Lapse Tracking".
 *
 * The book requires several things on a recurring day and states what happens
 * after N consecutive days without them: a Neobloom that does not
 * photosynthesise for three days perishes, Followers and Mercenaries unfed for
 * three desert, a Steed unfed for seven runs away. This counts the days since
 * the upkeep stopped being met, prints the book's fuse beside it, and does
 * nothing else.
 *
 * RULED 2026-09-13 (Matt), and it is the whole shape of the mechanism: "all
 * these examples are things that we might want to keep track of on the board as
 * ongoing conditions (no Photosynthesis: X days; no companion upkeep: X days),
 * but that's it - we aren't going to automate a neobloom dropping dead or a
 * companion deserting."
 *
 * SO THERE IS NO TICK, NO CARD AND NO THRESHOLD, and that is what separates
 * this from Long-Clock Recurrence rather than a difference of degree. A
 * recurrence fires something every period and needs a hook on the clock; this
 * fires nothing ever and needs no hook at all. The count is derived from
 * `startTime` on every render, exactly as Deprived State's elapsed readout is,
 * so there is no state to advance and nothing that a missed or doubled clock
 * event could corrupt.
 *
 * THE RESET IS THE REFEREE ENDING THE ENTRY. The book's rules all reset on
 * being met — a Neobloom that gets one day of sun starts the three again — and
 * modelling that as anything other than "stop the entry, start a new one when
 * it lapses again" would need the system to know whether the upkeep was met
 * today, which nothing tells it. `startTime` IS the reset, and it is one field.
 *
 * WHY THIS IS NOT Timed Condition Duration. That schedules ONE event at the end
 * of a known span and reads as a countdown; this has no end and no event, and
 * its number goes UP. The Neobloom atom was filed against Timed Condition
 * Duration, then Deprived State, then Long-Clock Recurrence, and was ruled off
 * the first two — see this mechanism's row for that history. Nothing fitted
 * because the thing it needed did not exist.
 */

import { SCOPE, entriesOf, setEntries, removeEntry, formatSpan } from "./effect-board.js";
import { LAPSES, lapseByKey } from "./lapse-data.js";

export { LAPSES, lapseByKey };

/** Is this board entry a tracked upkeep lapse? */
export function isLapse(entry)
{
  return entry?.kind === "lapse";
}

/**
 * How long the upkeep has gone unmet, in seconds, or null.
 *
 * Derived from the clock and never counted, the same property every other
 * elapsed readout in this system has. Negative means the clock has been wound
 * back behind the start, which reads as nothing elapsed rather than as a fault.
 */
export function lapseElapsed(entry, now = null)
{
  if (!isLapse(entry)) return null;
  const t = now ?? game?.time?.worldTime ?? 0;
  const start = Number(entry.startTime);
  if (!Number.isFinite(start)) return null;
  const elapsed = t - start;
  return elapsed >= 0 ? elapsed : 0;
}

/**
 * That span as the Referee reads it — "3 days", "7 hours", "just now".
 *
 * "day" IS THE CEILING, NOT THE FLOOR, and it is the same trap deprived.js
 * documents at length: formatSpan considers units no LARGER than the one named,
 * so passing "turn" would render three days as "432 Exploration Turns" — tidy,
 * plausible and useless. "day" opens the full ladder, so this reads in turns
 * within the hour and in days on the day the fuse matters.
 */
export function lapseElapsedLabel(entry, now = null)
{
  const secs = lapseElapsed(entry, now);
  if (secs === null) return null;
  if (secs <= 0) return "just now";
  return formatSpan(secs, "day", null);
}

/**
 * The book's fuse as a sentence, or "" for a free-typed lapse.
 *
 * DISPLAY ONLY. Nothing compares the elapsed count against `fuseDays` — see
 * lapse-data.js for why that is a ruling rather than an omission.
 */
export function fuseLine(entry)
{
  const def = lapseByKey(entry?.lapseKey);
  if (!def) return "";
  return def.rule;
}

/**
 * Start tracking a lapse.
 *
 * Takes EITHER a roster key or a free-typed label. RULED 2026-09-13 (Matt):
 * both, where every other roster in this system is pick-only. The four the book
 * states carry its wording and join back to an atom row; a typed one covers a
 * table ruling the book never wrote, and carries no fuse because there is no
 * book sentence to print.
 *
 * IDEMPOTENT PER KEY, the same guard setDeprived has. Two entries for one lapse
 * would show two different day counts for one thing, and ending one would look
 * like a no-op.
 */
export async function startLapse(actor, { key = null, label = null } = {})
{
  const def = key ? lapseByKey(key) : null;
  if (!def && !label) return null;

  const existing = entriesOf(actor).find(e =>
    isLapse(e) && (def ? e.lapseKey === def.key : e.name === label));
  if (existing) return existing;

  const entry = {
    id: foundry.utils.randomID(),
    kind: "lapse",
    name: def ? def.name : String(label),
    // TEXT IS EMPTY AND THE FUSE IS RENDERED LIVE, found in testing 2026-09-13
    // (147.3). Storing the rule here put it on the board TWICE: the board's
    // shared text block renders `text` for every row, and the lapse branch
    // renders fuseLine() beside the day count. That is the identical bug the
    // template's own comment records against Long-Clock Recurrence on
    // 2026-09-09, in the same file, found the same way.
    //
    // Resolved towards the LIVE reading rather than by deleting the meta line.
    // fuseLine() reads lapse-data.js on every render, so correcting the book's
    // wording there fixes every running entry; a copy stored at creation would
    // keep the old sentence for the life of the row. It also puts the fuse
    // immediately beside the count it should be read against, which is the
    // whole point of showing it.
    text: "",
    note: "Counting since the Referee started it. Meeting the upkeep means ending this entry.",
    itemId: null,
    origin: actor.type === "npc" ? "npc" : "pc",
    revealed: false,
    revealLabel: "",
    lapseKey: def ? def.key : null,
    fuseDays: def ? def.fuseDays : null,
    startTime: game?.time?.worldTime ?? 0,
    // Never on either expiry number line, for the same load-bearing reason
    // activity.js and recurrence.js both say so in their own comments: this is
    // what stops the board's sweepExpired() from deleting it.
    unit: null,
    amount: null,
    startRound: null,
    expiresAtTime: null,
    expiresAtRound: null
  };
  await setEntries(actor, [...entriesOf(actor), entry]);
  return entry;
}

/** Stop tracking one — the upkeep was met, or the Referee ended it. */
export async function stopLapse(actor, id)
{
  const entry = entriesOf(actor).find(e => e.id === id);
  if (!entry) return null;
  await removeEntry(actor, id);
  return entry;
}

/** Every tracked lapse in the world, paired with its actor. */
export function collectLapses()
{
  const out = [];
  for (const actor of game.actors)
    for (const entry of entriesOf(actor))
      if (isLapse(entry)) out.push({ actor, entry });
  return out;
}
