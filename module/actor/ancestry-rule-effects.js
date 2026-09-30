/**
 * The outcomes of the Faa Nomad's two rolled ancestry rules - foundry-system-
 * index.csv "Ancestry Rule as Rollable Item". Pure: the sheet makes the roll
 * (so the Jinx reaches it) and asks this file what the result means.
 *
 * JADE IBIS 15-09-26 REPLACED THE FAA'S WORM RIDER with these two, and this
 * file with them. Until 2026-09-21 it held Worm Rider's arrival: a Sandworm
 * summoned by an hour of dancing on the activity clock, 2-in-6 juvenile.
 * RULED 2026-09-21 (Matt): Worm Rider goes; Ambusher and Worm Wise become
 * rollable ancestry rule Items, Ambusher wired to Ambush Resolution.
 *
 * Ambusher, verbatim: "When in the blue desert, you can make an opposed PSY
 * Save to attempt to ambush a hostile encounter. You may attempt this even if
 * your travelling party has already been ambushed themselves."
 *
 * Worm Wise, verbatim: "When encountering a Sandworm, you may attempt to charm
 * it using your knowledge of their moods and pheromones. Make an EGO Save. If
 * successful, the Sandworm will allow you to briefly ride it or otherwise aid
 * you. If you fail, the creature is affronted and attacks you. It will track
 * you while you are in its territory."
 *
 * WHICH ABILITY OPPOSES THE FAA'S PSY is not stated - "an opposed PSY Save"
 * names one ability. Read here as PSY against the targeted creature's PSY,
 * under Saving Throws.md's Opposed Save: exceed 10 plus the opposing
 * character's Ability. This is a READING, reported to Matt, and it is the one
 * constant below to change if he rules otherwise.
 */
import { resolveSave } from "../combat/saves.js";
import { OPPOSED_BASE, abilityBonus } from "../combat/ambush.js";

/** The opposing creature's Ability the Faa's PSY Save must beat. See above. */
export const AMBUSHER_OPPOSED_BY = "psy";

/** The number an Ambusher roll must EXCEED against `opponent`. */
export function ambusherTarget(opponent)
{
  return OPPOSED_BASE + abilityBonus(opponent, AMBUSHER_OPPOSED_BY);
}

/** The Ambusher card's verdict line. */
export function ambusherOutcome(total, natural, opponent)
{
  const target = ambusherTarget(opponent);
  const { passed, reason } = resolveSave(total, natural, target);
  const why = reason === "nat20" ? " (natural 20)" : reason === "nat1" ? " (natural 1)" : "";
  const vs = `PSY Save vs ${target} (10 + ${opponent?.name ?? "the opponent"}'s PSY)`;
  return {
    passed,
    text: passed
      ? `<b>Ambusher</b> — ${vs}${why}: <b>the ambush springs.</b> During the ambush round, all ambushers make an attack with ADV. Initiative is then calculated as normal.`
      : `<b>Ambusher</b> — ${vs}${why}: <b>the ambush fails.</b> The encounter proceeds as normal.`
  };
}

/**
 * The True-kin's Inheritor, verbatim (JADE IBIS 15-09-26): "When you encounter
 * pre-Collapse security systems or guard synths, make an opposed EGO Save. On
 * success, the machine is convinced you are its new master and will serve you
 * in any way it is able. On failure, the machine becomes implacably hostile."
 *
 * Opposed like Ambusher, EGO against the machine's EGO. RULED 2026-09-24
 * (Matt): unlike Ambusher it rolls WITHOUT a target, because a security system
 * is often no token and no sheet. Then the card posts the total against "10 +
 * the machine's EGO" and the Referee judges; there is no verdict to compute.
 */
export const INHERITOR_OPPOSED_BY = "ego";

/** The Inheritor card. `machine` is the targeted actor, or null. */
export function inheritorOutcome(total, natural, machine)
{
  const serves = "<b>the machine serves you.</b> It is convinced you are its new master and will serve you in any way it is able.";
  const hostile = "<b>the machine turns on you.</b> It becomes implacably hostile.";
  // A natural 20 or 1 settles it with no target: resolveSave never reads the
  // number for those.
  if(!machine && natural !== 20 && natural !== 1)
    return {
      passed: null,
      text: `<b>Inheritor</b> — EGO Save ${total} vs 10 + the machine's EGO. <i>No machine targeted: the Referee compares.</i> Above it, ${serves} Otherwise, ${hostile}`
    };
  if(!machine)
    return {
      passed: natural === 20,
      text: `<b>Inheritor</b> — EGO Save (natural ${natural}): ${natural === 20 ? serves : hostile}`
    };
  const target = OPPOSED_BASE + abilityBonus(machine, INHERITOR_OPPOSED_BY);
  const { passed, reason } = resolveSave(total, natural, target);
  const why = reason === "nat20" ? " (natural 20)" : reason === "nat1" ? " (natural 1)" : "";
  const vs = `EGO Save vs ${target} (10 + ${machine.name}'s EGO)`;
  return { passed, text: `<b>Inheritor</b> — ${vs}${why}: ${passed ? serves : hostile}` };
}

/** The Worm Wise card's verdict line. A plain Save, against 15. */
export function wormWiseOutcome(total, natural)
{
  const { passed, reason } = resolveSave(total, natural);
  const why = reason === "nat20" ? " (natural 20)" : reason === "nat1" ? " (natural 1)" : "";
  return {
    passed,
    text: passed
      ? `<b>Worm Wise</b> — EGO Save${why}: <b>charmed.</b> The Sandworm will allow them to briefly ride it or otherwise aid them.`
      : `<b>Worm Wise</b> — EGO Save${why}: <b>affronted.</b> The Sandworm attacks, and will track them while they are in its territory.`
  };
}
