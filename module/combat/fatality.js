/**
 * Fatality Suppression (foundry-system-index.csv "Fatality Suppression").
 *
 * Immortality Injector, CRIMSON HOUND: "A creature injected with this fizzing
 * froth of nanomachinery cannot die. It can be damaged beyond recognition, but
 * the life will not leave its frame. This effect lasts for one day."
 *
 * RULED 2026-09-11 (Matt): "prevents anything from being fatal, but all other
 * effects (hp loss, wounds etc) happen". So it is not damage reduction, not an
 * immunity and not a floor on HP — the arithmetic runs untouched and only the
 * DEATH outcome is intercepted.
 *
 * THE REFRAME THAT SETS THE SIZE OF THIS. Nothing in this system actually
 * kills an actor. Every death surface is a chat message with no state change,
 * because death is GM-adjudicated from there — _checkWoundDeath says so
 * explicitly and every other surface follows it. Suppression is therefore
 * about WHICH MESSAGE GETS POSTED, not about blocking anything. That is why
 * this file holds predicates and wording and touches no actor state.
 * (One record since 2026-09-27, Matt: an instantDeath row that is NOT
 * suppressed goes on the character's Wounds list, so the sheet shows how they
 * died and the Ego-Engine Transplant can refuse an Ego-Engine Destroyed death.
 * It is a record, not a lock - nothing else reads it as "dead".)
 *
 * THE SIX SURFACES, all gated on suppressesDeath():
 *
 *   1. An NPC or monster reduced to 0 HP             (_resolveHPChange)
 *   2. Any further damage while on Death's Door      (_resolveHPChange)
 *   3. An instantDeath wound row                     (_applyWound)
 *        Fatality (bio -20), General Systems Failure (synth -19),
 *        Ego-Engine Destroyed (synth -20)
 *   4. No item slots left to hold further Wounds     (_checkWoundDeath)
 *   5. An ability bonus fallen below -10             (_checkWoundDeath)
 *   6. Max HP reduced to 0                           (Zero Max HP Death)
 *
 * Six, where the row named two. Surfaces 4, 5 and 6 are not damage at all, and
 * Matt's "anything" covers them: a character whose STR has been driven below
 * -10 is exactly the "damaged beyond recognition" the elixir describes.
 *
 * THREE RULINGS 2026-09-11 (Matt), none of them stated by the book:
 *
 * - IT COVERS CREATURES, surface 1 included. The book says "a creature", and
 *   nothing restricts the elixir to PCs. AND THE KILL DOES NOT COUNT: an
 *   attacker's Blood-Rapturous and a Cacklemaw Exile's More! do not fire on a
 *   suppressed death, because both read "when you kill" and nothing died.
 *   _resolveHPChange returns null instead of "killed" for that reason — see
 *   Kill/Death-Detection Hook, which is the row that consumes it.
 *
 * - THE WOUND IS SKIPPED, not applied. Surfaces 2 and 3 currently return early
 *   and record no wound, and suppression leaves that alone; only the message
 *   changes. The reason is that a suppressed Fatality has nothing left to
 *   apply — the row is slots: 0 with no numeric fields, so death IS its entire
 *   content — and recording a wound named "Fatality" whose text reads "You are
 *   dead." on a living character would be worse than recording nothing.
 *
 * - NOTHING HAPPENS AT EXPIRY. When the day runs out the board posts its
 *   ordinary expiry card and no death is re-checked or announced. This is the
 *   system's existing stance rather than a new rule: every one of the six
 *   surfaces already announces without changing state, so there is no
 *   suspended death being held anywhere to release.
 */

import { hasCondition } from "../time/stateful-effect.js";

/**
 * The condition string Immortality Injector puts on its drinker.
 *
 * A condition rather than a check for the elixir's NAME, for the reason
 * _isIncorporeal already records: it is the STATE that matters, and a second
 * source for it — another elixir, an implant, a creature rule — would
 * otherwise have to be wired all over again.
 */
export const CANNOT_DIE = "cannotDie";

/** Is this actor's death currently suppressed? */
export function suppressesDeath(actor)
{
  return hasCondition(actor, CANNOT_DIE);
}

/**
 * What to post instead of the death message.
 *
 * ONE WORDING FOR ALL SIX SURFACES, built here rather than at each call site,
 * because six hand-written copies of a sentence drift — the same reasoning
 * that put resolveSave in combat/saves.js on 2026-09-11.
 *
 * The cause is named rather than swallowed. A Referee needs to know WHICH
 * death was suppressed: "no item slots remain" and "STR fell below -10" are
 * different problems and neither goes away when the elixir does.
 *
 * @param {string} cause the death that would have happened, as a phrase
 */
export function suppressionMsg(cause)
{
  return `<b>would have died</b> — ${cause} — but the <b>Immortality Injector</b>`
       + ` holds them together. Damaged beyond recognition, but the life will not`
       + ` leave their frame.`;
}
