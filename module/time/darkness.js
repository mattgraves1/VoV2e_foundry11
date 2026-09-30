/**
 * Vault Traversal Penalties — foundry-system-index.csv.
 *
 * The book (Vaults/Exploration Beneath the Urth.md, Light and Darkness,
 * verbatim in CRIMSON HOUND 07-05-26): "Without light the PCs are travelling
 * blind: they take three exploration turns to move from one location to
 * another, and cannot effectively search an unlit location. Encounters always
 * surprise the party. Ranged attacks cannot be made without light, and melee
 * attacks have DIS."
 *
 * MOST OF THAT VAULT FILE WAS ALREADY BUILT, and this row is much smaller than
 * its Description reads. Exploration Turn Structure already holds the turn,
 * the encounter check, listening at a door, forcing a door, running, and the
 * three-turn cost of travelling blind; Group 135 built the unsecured campsite;
 * Escape the Vault is a RollTable. What was missing is the CONSEQUENCES of
 * having no light, not the time they cost.
 *
 * RULED 2026-09-13 (Matt): ONE SWITCH, AND ONE ENFORCEMENT.
 *
 *   "enable 'in darkness' as an active effect, that describes all of the
 *   consequences [...] disable the search button [...] everything else I
 *   think can just be adjudicated."
 *
 * So exactly one of the four consequences is enforced — Search — and the other
 * three ride the entry's text where the players can read them. That is the
 * travel cluster's standing stance (Matt, 2026-08-29: "the requirement here is
 * PROMPTING, not computation") applied to a rule whose other three clauses are
 * all judgement calls at the table: whether a particular attack is ranged,
 * whether a torch someone lit changes things, whether this encounter surprises.
 *
 * RULED 2026-09-13 (Matt): IT IS ALWAYS THE WHOLE PARTY. "I don't want to
 * worry about using it for individuals, it will be assumed to apply to the
 * party." Darkness is a property of the location, and a per-PC switch would
 * be six clicks to say one thing. One PC holding a torch while the rest are
 * blind is a table conversation, not a state this tracks.
 *
 * ── THE ENTRIES ARE THE STATE ──────────────────────────────────────────────
 *
 * There is no world flag saying the lights are out. `inDarkness()` asks
 * whether any PC carries the condition, and the toggle is what puts it on all
 * of them. That is deliberate and it is the codebase's own culture — the
 * ambush tally is derived from save messages for the same reason. A flag plus
 * entries is two sources of truth that drift the moment a Referee deletes one
 * row from the board, and the drift would be invisible: the button would say
 * one thing and the sheets another, both plausible.
 *
 * The cost of deriving it is that a character created mid-delve does not
 * inherit the darkness. That is the correct failure — they are a new row on
 * the board with nothing on it, which is visible, rather than a silent
 * mismatch between a flag and six sheets. Re-toggling covers them.
 *
 * WHY A BOARD ENTRY AND NOT A FOUNDRY ActiveEffect. This system has never used
 * Foundry's ActiveEffect for anything; `stateful-effect.js` is its condition
 * channel, `hasCondition` is the read, and the Active Effect Board is where a
 * player already looks to find out what is running on them. A second,
 * parallel mechanism would be the fifty-implementations failure that file's
 * header warns about.
 *
 * The entry carries NO DURATION. Darkness ends when someone makes light, which
 * is an event at the table and not a span — `hasExpired` returns false for an
 * entry with both expiry stamps null, so it runs until the switch goes off.
 */

import { addEntry, removeEntry, entriesOf } from "./effect-board.js";
import { hasCondition } from "./stateful-effect.js";

/**
 * The condition string. Exported because the read side is in another file and
 * a second literal is how the two halves of a condition drift apart.
 */
export const DARKNESS_CONDITION = "inDarkness";

/** The entry's name, and therefore what the board row reads. */
export const DARKNESS_NAME = "In Darkness";

/**
 * What the player sees. All four consequences, including the one that is
 * enforced, because a rule the code applies still has to be legible to the
 * person it is applied to.
 *
 * The three-turn travel cost is stated even though Exploration Turn Structure
 * already owns it — the Referee picks that action on the clock and the player
 * never sees it otherwise, and the book presents all four as one rule.
 */
export const DARKNESS_TEXT =
  "No light. Travel between locations takes three Exploration Turns. "
  + "You cannot search. Encounters always surprise the party. Ranged attacks "
  + "cannot be made, and melee attacks have DIS.";

/**
 * The party.
 *
 * `hasPlayerOwner` is the PC test, and the reasoning is initiative.js's at
 * length: this system has never set token disposition and Foundry initialises
 * every token to HOSTILE, so a disposition read would put the PCs on the wrong
 * side of their own game. Same test partyEncumbrance() uses, deliberately, so
 * the clock's two readouts cannot disagree about who the party is.
 */
export function partyPCs()
{
  return game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
}

/** Does this actor carry the darkness condition? */
export function actorInDarkness(actor)
{
  return !!actor && hasCondition(actor, DARKNESS_CONDITION);
}

/**
 * Is the party in darkness?
 *
 * ANY, not every. A Referee who has cleared one row off the board has not
 * turned the lights on, and reading it as `every` would let one deleted entry
 * silently re-enable the Search button for the whole table. `any` fails the
 * safe way round: the switch stays visibly on until it is switched off.
 */
export function inDarkness()
{
  return partyPCs().some(actorInDarkness);
}

/** This actor's darkness entries, however many have accumulated. */
function darknessEntries(actor)
{
  return entriesOf(actor).filter(e =>
    (e?.applied?.conditions ?? []).includes(DARKNESS_CONDITION));
}

/**
 * Turn the darkness on or off across the whole party.
 *
 * Idempotent in both directions, which matters because the button derives its
 * label from state and a double click is therefore a real possibility. Lighting
 * an actor who already carries it adds nothing rather than a second row, and
 * the removal loop clears every match rather than the first — so a party that
 * somehow accumulated two entries is cleaned up by switching off, instead of
 * staying half-lit.
 */
export async function setDarkness(on)
{
  const touched = [];
  for (const actor of partyPCs())
  {
    const existing = darknessEntries(actor);
    if (on)
    {
      if (existing.length) continue;
      await addEntry(actor, {
        name: DARKNESS_NAME,
        text: DARKNESS_TEXT,
        applied: { conditions: [DARKNESS_CONDITION] }
      });
      touched.push(actor.name);
    }
    else
    {
      if (!existing.length) continue;
      for (const e of existing) await removeEntry(actor, e.id);
      touched.push(actor.name);
    }
  }
  return touched;
}
