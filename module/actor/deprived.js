/**
 * Deprived State — foundry-system-index.csv "Deprived State".
 *
 * WHAT THE BOOK STATES, and it is three sentences (Core Rules/Deprivation.md,
 * CRIMSON HOUND p.31): "A Deprived character cannot heal lost HP or otherwise
 * benefit from Rests. Deprivation can be incurred through many means, but the
 * most common are starvation or thirst." Water adds the clock: a biological PC
 * drinks a ration a day or becomes Deprived, and three days Deprived by thirst
 * kills them.
 *
 * WHAT THE BOOK DOES NOT STATE, ANYWHERE, IN EITHER EDITION: how the condition
 * is REMOVED. Checked 2026-09-11 across all 14 occurrences in CRIMSON HOUND and
 * against 1e, which carries the same three sentences and is equally silent. The
 * only removal language in the book is source-specific, and it appears only
 * where the source is itself a persistent thing — "Deprived until the Wound is
 * cured" (Amaranthine Venom), "until this Wound is fixed" (Supercoolant Leak),
 * "While in earshot" (Doom Song). For thirst and hunger, the two the book calls
 * most common, there is nothing.
 *
 * It cannot be resting that clears it, either: a Short Rest IS "a quick sit-down
 * with a ration of water or food", so the drink that would plausibly cure
 * thirst-deprivation is inside the rest that deprivation blocks.
 *
 * RULED 2026-09-11 (Matt): so the toggle is the mechanism. A GM control, on and
 * off "according to whatever they rule about it". This file therefore holds no
 * removal logic and no cause — deliberately, because inventing either would be
 * answering a question the book leaves to the table.
 *
 * NO CAUSE IS STORED (Matt, same day). The book writes "Deprived due to thirst"
 * and "due to hunger", and its death clause is scoped to thirst only, so a
 * cause is arguably mechanical. It is still not stored: with no clock reading it
 * and no removal rule to branch on, a cause field would be a value nothing
 * consumes, and the Referee already knows why they switched it on.
 *
 * WHY A BOARD ENTRY AND NOT A FIELD ON THE ACTOR. Three things fall out for
 * free, and none of them is new storage:
 *   - `activeDeltas` already sums `conditions` off board entries, so
 *     `hasCondition(actor, "Deprived")` is the read side with nothing added.
 *     fatality.js has read CANNOT_DIE that way since Group 123.
 *   - Matt asked for this on the Active Effect Board, and the board is exactly
 *     the register of "everything currently running on anybody".
 *   - Every entry already stamps `startTime`, which is what makes the elapsed
 *     readout below arithmetic rather than a new counter.
 *
 * WHY NO EXPIRY STAMPS. `hasExpired` returns false when both are null, so an
 * entry with neither never times out — which is the correct shape for a
 * condition whose end is a ruling. The board already renders such an entry as
 * "until switched off".
 *
 * WHY ELAPSED RATHER THAN REMAINING, and why it is stored as an absolute start.
 * Matt, 2026-09-11: "showing how long it has been in effect is important for
 * this one, since characters die after having it long enough" — three days on
 * thirst, three weeks for a Faa Nomad. The board has only ever shown remaining,
 * because everything on it until now had an end. Elapsed is `now - startTime`
 * and never a counter that increments, for the same reason effect-board.js
 * refuses a countdown: a stored counter is corrupted by a missed or doubled
 * hook and nothing afterwards can tell. recurrence.js already derives its tick
 * index from `startTime` this way.
 */
import { entriesOf, addEntry, removeEntry, formatSpan } from "../time/effect-board.js";
import { hasCondition } from "../time/stateful-effect.js";

/** The condition string. One spelling, imported everywhere. */
export const DEPRIVED = "Deprived";

/** Does this actor currently carry it? */
export function isDeprived(actor)
{
  return hasCondition(actor, DEPRIVED);
}

/**
 * The board entry carrying the condition, or null.
 *
 * Matched on the delta rather than on the entry NAME, because a name is a label
 * a Referee can retype and the delta is what `hasCondition` actually reads. The
 * two must not be able to disagree about whether an actor is Deprived.
 */
export function deprivedEntry(actor)
{
  return entriesOf(actor)
    .find(e => (e?.applied?.conditions ?? []).includes(DEPRIVED)) ?? null;
}

/**
 * How long it has been running, in seconds — or null if it is not running, or
 * if the entry predates this mechanism and so has no honest start.
 *
 * An entry created before Deprived existed defaults `startTime` to 0, which in
 * a world with an advanced clock would read as the entire history of that
 * world. Nothing is migrated for that (CLAUDE.md: build a new actor instead);
 * the guard below simply declines to report a span it cannot vouch for.
 */
export function deprivedElapsed(actor, now = null)
{
  const entry = deprivedEntry(actor);
  if (!entry) return null;
  const t = now ?? game?.time?.worldTime ?? 0;
  const start = Number(entry.startTime);
  if (!Number.isFinite(start)) return null;
  const elapsed = t - start;
  return elapsed >= 0 ? elapsed : null;
}

/** That span as a phrase, or null. Uses the board's own formatter. */
export function deprivedElapsedLabel(actor, now = null)
{
  const secs = deprivedElapsed(actor, now);
  if (secs === null) return null;

  // "day" IS THE AUTHORED UNIT, AND IT IS THE CEILING RATHER THAN THE FLOOR —
  // which is the opposite of how it first reads, and getting it backwards was
  // caught here before it shipped. formatSpan considers units no LARGER than
  // the one named, so "turn" would have capped the ladder at Exploration Turns
  // and rendered three days as "432 Exploration Turns" — a plausible, tidy,
  // useless number, and precisely the failure shape CLAUDE.md records for
  // derived output. "day" opens the full ladder, so this reads in turns within
  // the hour, in hours within the day, and in days on the day it decides
  // whether the character lives. Verified against the formatter directly rather
  // than by reading the call.
  //
  // No authored amount, because an open-ended entry has nothing to cap against.
  //
  // formatSpan answers "expiring" for a non-positive span, which is true of a
  // countdown and nonsense for an age, so zero is handled here instead.
  if (secs <= 0) return "just now";
  return formatSpan(secs, "day", null);
}

/**
 * The death fuse as a sentence, shown beside the elapsed count exactly as an
 * upkeep lapse shows its fuse (RULED 2026-09-23, Matt: every count-up row on
 * the board reads what - elapsed - the book's fuse; only the spans differ).
 * DISPLAY ONLY - nothing compares the count against it.
 *
 * "IF BY THIRST", because the book's death clause is thirst's alone ("If a
 * character is Deprived due to thirst for three days in a row, they will
 * perish") and no cause is stored (RULED 2026-09-11). A Faa Nomad's Desert
 * Metabolism stretches it: "it will be three weeks before you die."
 */
export function deprivedFuseLine(actor)
{
  return actor?.system?.ancestry === "Faa Nomad"
    ? "if by thirst, a Faa Nomad perishes after three weeks (Desert Metabolism)"
    : "if by thirst, perishes after three days in a row";
}

/**
 * Switch it on or off. Idempotent in both directions — switching on an actor
 * who already has it must not stack a second entry, since two entries would
 * both satisfy `hasCondition` and clearing one would look like a no-op.
 *
 * THE ENTRY IS NAMED FOR THE CONDITION, NOT FOR ITS SOURCE, and that is a
 * deliberate departure from every other board entry. effect-board.js names an
 * entry for what caused it — the creature ability, the elixir — which is why a
 * creature-origin entry has to be hidden or revealed under a hand-written label:
 * "Blinding Pelt" would hand the player the one thing the origin rule protects.
 *
 * This entry is called "Deprived", so there is nothing to protect. A Desiccator
 * hits a PC, the Referee switches it on, and the entry lands on the PC — origin
 * "pc", therefore public — saying that the character is Deprived and nothing
 * whatever about what did it.
 *
 * RULED 2026-09-11 (Matt), confirming that is the wanted behaviour: "creature
 * sources of deprived should still put an item on the board ... they know
 * they're affected, doesn't state the source." It is the same answer the
 * Blinded case reached, arrived at from the other direction — there by a
 * Referee-written reveal label, here by the name being the condition already.
 */
export async function setDeprived(actor, on)
{
  const existing = deprivedEntry(actor);
  if (on)
  {
    if (existing) return existing;
    return addEntry(actor, {
      name: DEPRIVED,
      text: "Cannot heal lost HP or otherwise benefit from Rests.",
      note: "Switched on by the Referee. The book states no rule for removing it.",
      startTime: game?.time?.worldTime ?? 0,
      // No expiry on either scale: this ends when the Referee says so.
      applied: { av: 0, abilities: {}, maxHp: 0, creatureTypes: [],
                 conditions: [DEPRIVED], endsOnDamage: [] }
    });
  }
  if (existing) await removeEntry(actor, existing.id);
  return null;
}

/**
 * The healing gate — RULED 2026-09-11 (Matt), option B: Deprived does not just
 * mark, it blocks.
 *
 * Returns true when the heal must NOT happen, and says so in chat. Callers gate
 * on it before writing HP.
 *
 * IT ALWAYS SPEAKS. A refusal that writes nothing is indistinguishable from a
 * heal that rolled zero, and this project has been caught by that exact shape
 * more than once — a clean zero reading as a bug, and a bug reading as a clean
 * zero. So every refusal posts, naming what was refused.
 *
 * SYNCHRONOUS ON PURPOSE. Three of the four call sites are inside synchronous
 * HP arithmetic, and the answer is a plain flag read with no await in it. The
 * chat post is deliberately not awaited, exactly as _postWoundMsg does not.
 *
 * WHAT IS NOT GATED, and it is a decision rather than an omission: the HP field
 * on the sheet. A Referee typing a number is the override, and the only escape
 * hatch from a condition the book gives no way to remove — a typed value that
 * silently fails to stick is the worst available behaviour.
 */
/**
 * The rule name forbidding this actor from healing lost HP, or null.
 *
 * A STRING RATHER THAN A BOOLEAN, and for the same reason RATION_FREE in
 * rest.js maps to a rule name: the refusal has to say WHICH rule refused. A
 * bare "cannot heal" with no rule behind it is the shape this project keeps
 * finding in its own output and failing to act on.
 *
 * KEYED PER ENTITY, never derived. RULED 2026-09-11 (Matt) after the
 * alternatives were costed: creature TYPE over-captures (7 mineral creatures,
 * only 2 are Lithlings - Gitchghast, Gravity Tyrant, Kronophage, Oblivion
 * Obelisk and Occulith would all be wrongly caught), ancestry cannot reach a
 * Crysteed or a Pet Rock, and the creature's own rule text cannot reach a
 * Lithling Scholar, whose stat block never mentions it. Nothing the book
 * prints identifies this set, so it is set by hand on each entity that has it.
 */
export function noHealRule(actor)
{
  const rule = actor?.system?.noHealRule;
  return (typeof rule === "string" && rule.trim()) ? rule.trim() : null;
}

export function blocksHealing(actor, label)
{
  // THE SECOND REASON, added 2026-09-11. Read this before concluding the file
  // is misnamed: this gate is general, and Deprived was simply its only reason
  // for a day. An intrinsic prohibition - a Lithling's Inevitable, a
  // Crysteed's - refuses exactly the same set of heals, so it belongs at the
  // same gate rather than in a second one every caller would have to remember
  // to also ask. Grep "Inevitable" and this is one of the two places it lands.
  //
  // ORDER MATTERS ONLY FOR THE MESSAGE. A Deprived Lithling is refused twice
  // over and the elapsed-time line is the more useful of the two, so Deprived
  // is asked first.
  if (!isDeprived(actor))
  {
    const rule = noHealRule(actor);
    if (!rule) return false;
    ChatMessage.create({
      user: game.user?._id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: "<b>" + rule + "</b> — no HP is restored by " + label + ". "
             + actor.name + " cannot heal lost HP by any means."
    });
    return true;
  }
  const elapsed = deprivedElapsedLabel(actor);
  const since = elapsed ? ` — Deprived for ${elapsed}` : "";
  ChatMessage.create({
    user: game.user?._id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<b>Deprived</b> — no HP is restored by ${label}. `
           + `A Deprived character cannot heal lost HP or otherwise benefit `
           + `from Rests${since}.`
  });
  return true;
}
