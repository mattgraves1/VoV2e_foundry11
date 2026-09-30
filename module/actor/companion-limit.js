/**
 * Companion Level Limit — three pools, each capped by the owner's EGO.
 *
 * THREE POOLS, NOT ONE. RULED 2026-09-19 (Matt), and the book states each
 * separately in its own chapter:
 *
 *   Pets        — "The combined Level of all pets under a PC's direct control
 *                  cannot exceed that PC's EGO."
 *   Followers   — "The combined Level of all Followers under a PC's command
 *                  cannot exceed that PC's EGO."
 *   Mercenaries — "The combined Level of all Mercenaries under a PC's command
 *                  cannot exceed that PC's EGO."
 *
 * They do not share a budget: a PC with EGO 4 may hold 4 Levels of pets AND 4
 * of Followers AND 4 of Mercenaries. CRIMSON HOUND counted "all pets, steeds,
 * and other followers" against ONE EGO bonus; JADE IBIS 15-09-26 split them,
 * which is what this file implements.
 *
 * STEEDS HAVE NO LEVEL LIMIT and are deliberately absent from LIMITED_KINDS.
 * The Steeds chapter says only "Each PC may ride one Steed" — a limit on
 * RIDING, not on owning. Matt, 2026-09-19: "I would assume you can own as many
 * steeds as you want as long as you feed them, and none of them would
 * participate in combat unless ridden." The riding limit and the
 * non-participation are both table-run; nothing here enforces either.
 *
 * "EGO" IS THE ABILITY SCORE AND ALSO THE BONUS. Abilities in this system run
 * 0–10 and ARE the bonus (actor.js: `defense = effective + 10`), so CRIMSON's
 * "EGO bonus" and JADE IBIS's "EGO" are the same number and the wording change
 * costs nothing. `effective` is used rather than `value` so wound damage to EGO
 * lowers the limit, which is the same number every other EGO rule reads.
 *
 * LEVEL 0 NEEDS NO CODE, and this is worth saying because its absence looks
 * like a missing feature. The Pets chapter notes "Level 0 pets do not
 * contribute to this limit but must still be fed" — but the limit is a SUM of
 * Levels, and 0 adds 0. The note is there to stop a Referee concluding that an
 * uncounted pet is also unfed; the feeding half lives in companion-upkeep.js.
 * The Followers table prints four Level 0 rows (Herta, Kinmoon, Ophinus,
 * Wellet) and its chapter states no such exclusion — which likewise costs
 * nothing, for the same arithmetic reason.
 *
 * NOTHING SWEEPS EXISTING WORLD STATE. Only transitions are gated — taking a
 * companion on, correcting its kind, or levelling a pet. A character already
 * over the limit stays over it, and no hook tidies that up. CLAUDE.md's
 * standing rule ("Never migrate, backfill or sweep existing world documents")
 * and the fact that the limit is a rule about ACQUIRING, not a state to be
 * enforced continuously.
 */

import { companionsOf, companionKindOf, COMPANION_KINDS } from "./companion.js";

/**
 * The three kinds that carry a Level limit. A Steed is absent by rule, and a
 * companion with no kind set at all belongs to no pool and is unlimited —
 * there is no fourth bucket for it to fall into, and inventing one would put
 * an untyped creature under a rule the book never applies to it.
 */
export const LIMITED_KINDS = ["pet", "follower", "mercenary"];

/**
 * The exact sentence each chapter uses, quoted in the refusal. They differ —
 * pets are under "direct control" and the two sapient kinds under "command" —
 * and showing the right one is cheap here and impossible to reconstruct later.
 */
const LIMIT_RULE = {
  pet: "The combined Level of all pets under a PC's direct control cannot exceed that PC's EGO.",
  follower: "The combined Level of all Followers under a PC's command cannot exceed that PC's EGO.",
  mercenary: "The combined Level of all Mercenaries under a PC's command cannot exceed that PC's EGO."
};

/**
 * A character's EGO, which is the whole of their limit.
 *
 * MOVED HERE from hireling-builder.js 2026-09-19, which had the only copy and
 * now imports it. The hireling roll (d20 + EGO) and this limit read the same
 * number for the same reason, and two copies of a field path is the
 * agree-until-one-is-edited failure this codebase warns about throughout.
 */
export function egoOf(character)
{
  const ego = character?.system?.abilities?.ego;
  return Number(ego?.effective ?? ego?.value ?? 0);
}

/**
 * The combined Level a character already holds in one pool.
 *
 * `exclude` drops one companion from the count, and every caller needs it: a
 * creature being re-confirmed in the pool it is already in, or levelled inside
 * it, would otherwise be counted twice — once at its current Level by the scan
 * and once again at its new one by the caller.
 */
export function poolLevelOf(character, kind, exclude = null)
{
  if(!character || !LIMITED_KINDS.includes(kind)) return 0;
  return companionsOf(character)
    .filter(c => companionKindOf(c) === kind && c.id !== exclude?.id)
    .reduce((sum, c) => sum + Number(c.system?.level?.value ?? 0), 0);
}

/**
 * Would putting `level` into this character's `kind` pool break the limit?
 *
 * Returns a report rather than a boolean, because every caller shows the
 * numbers: a refusal that says only "over the limit" leaves the Referee to go
 * and add up Levels by hand, which is the thing this is for.
 *
 * `limited` is false for a steed, an untyped companion and an unowned one.
 * Nobody owns it means no EGO to measure against — the same reasoning
 * companionLevelUpAvailable already uses for its own owner gate.
 */
export function levelLimitCheck(character, kind, level, exclude = null)
{
  if(!character || !LIMITED_KINDS.includes(kind))
    return { limited: false, exceeds: false };

  const limit = egoOf(character);
  const current = poolLevelOf(character, kind, exclude);
  const after = current + Number(level ?? 0);
  return { limited: true, kind, character, limit, current, after, exceeds: after > limit };
}

/**
 * Put an over-limit transition to the Referee, and return whether to proceed.
 *
 * REFUSE WITH A CONFIRM, RULED 2026-09-19 (Matt), rather than an absolute
 * refusal. Every route to companion ownership is already GM-only — the owner
 * dialog is GM-gated and hireling generation is GM-run — so an absolute block
 * would be this system telling a Referee they may not do something the book
 * leaves to them. It also has one use that is not rule-breaking at all: the
 * kind dropdown exists to CORRECT a record (a tamed Bestiary creature, or a
 * pet placed before the stamp existed, 2026-09-19), and a character who was
 * always over the limit would find the correction itself refused.
 *
 * The confirm defaults to NO, so the block still reads as a block.
 */
export async function confirmOverLevelLimit(check, subject)
{
  if(!check?.limited || !check.exceeds) return true;

  const label = COMPANION_KINDS[check.kind] ?? check.kind;
  return Dialog.confirm({
    title: `Over the ${label} Level limit`,
    content:
      `<p>${subject} would take <b>${check.character.name}</b>'s ${label} pool to ` +
      `<b>Level ${check.after}</b>, against an EGO of <b>${check.limit}</b>` +
      (check.current ? ` (${check.current} already held)` : "") + `.</p>` +
      `<p class="notes"><i>${LIMIT_RULE[check.kind]}</i></p>` +
      `<p>Go over the limit anyway?</p>`,
    yes: () => true,
    no: () => false,
    defaultYes: false
  });
}
