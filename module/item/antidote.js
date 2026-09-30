/**
 * Brewed antidotes — foundry-system-index.csv "Elixir Brewing", the Antidotes
 * atom, built 2026-09-19.
 *
 * WHAT THE BOOK STATES (JADE IBIS, Alchemy, Antidotes): "Antidotes to the
 * venom of toxic creatures can be brewed using the creature's venom as a
 * component. The potency of the antidote is decided by the strength of the
 * toxin: a d6 TOX attack requires a POT 1 antidote, a d8 TOX attack requires a
 * POT 2 antidote, and so on."
 *
 * RULED 2026-09-19 (Matt):
 *  - An antidote is named for the toxin it answers, "Antidote (d8 TOX)", and
 *    its description carries the POT and what it cures.
 *  - Drinking it CURES the drinker's Toxin Die, and warns when their toxin is
 *    stronger than the antidote is rated for.
 *  - d4 TOX is POT 1. The book starts its ladder at d6 and this system has a
 *    d4 step, so the weakest antidote answers it; nothing weaker exists.
 */

import { TOXIN_CURED } from "../actor/toxin-die.js";

/** The book's ladder, with d4 ruled in at the bottom. */
export const ANTIDOTE_POTENCY = { d4: 1, d6: 1, d8: 2, d10: 3, d12: 4, d20: 5 };

/** The dice an antidote can be brewed against, weakest first. */
export const ANTIDOTE_DICE = Object.keys(ANTIDOTE_POTENCY);

/** What one is called. */
export function antidoteName(die)
{
  return `Antidote (${die} TOX)`;
}

/** The die an Item is an antidote for, or null when it is not one. */
export function antidoteDieOf(name)
{
  const m = /^Antidote \((d\d+) TOX\)$/.exec(String(name ?? "").trim());
  return m && m[1] in ANTIDOTE_POTENCY ? m[1] : null;
}

/** Item data for one antidote, the shape loot-builders returns. */
export function buildAntidote(die)
{
  if(!(die in ANTIDOTE_POTENCY)) return [];
  const pot = ANTIDOTE_POTENCY[die];
  return [{
    name: antidoteName(die),
    type: "item",
    system: {
      slots: 1,
      description: `<p><b>Potency ${pot}:</b> Cures the venom of a ${die} TOX attack — drink it to clear a Toxin Die of ${die} or weaker.</p>`
                 + `<p><b>Component:</b> the venom of the creature it answers.</p>`
    }
  }];
}

const size = die => Number(String(die ?? "").slice(1)) || 0;

/**
 * What drinking this antidote does. Returns {cured, message}, and `cured`
 * false means nothing should be spent — the two refusals are "no toxin to
 * cure" and "this antidote is too weak", and in both the vial is still full.
 */
export function antidoteOutcome(actor, die)
{
  const carried = actor?.system?.toxinDie?.die ?? "";
  const pot = ANTIDOTE_POTENCY[die];

  if(!carried || carried === TOXIN_CURED)
    return { cured: false, message: `is carrying no Toxin Die, so the <b>${antidoteName(die)}</b> is kept.` };

  if(size(carried) > size(die))
    return { cured: false, message: `carries a <b>${carried} TOX</b> toxin, stronger than a POT ${pot} <b>${antidoteName(die)}</b> answers `
                                  + `(that needs POT ${ANTIDOTE_POTENCY[carried] ?? "a higher"}). Nothing is drunk.` };

  return { cured: true, message: `drinks <b>${antidoteName(die)}</b> and the <b>${carried} TOX</b> toxin is cured.` };
}

/** Cure the drinker. The caller reports and consumes. */
export async function applyAntidote(actor)
{
  return actor.update({ "system.toxinDie.die": TOXIN_CURED, "system.toxinDie.source": "" });
}
