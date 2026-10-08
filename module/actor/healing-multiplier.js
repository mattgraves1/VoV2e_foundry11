/**
 * Healing Received Multiplier — foundry-system-index.csv row of that name.
 *
 * A live affliction scales the HP a heal restores, without refusing it. The
 * refusal is deprived.js's blocksHealing; this is the step after it, asked
 * only once a heal has been allowed.
 *
 * THE BOOK, Deathblight Husk: "Each slot of Deathblight doubles damage taken
 * and halves healing received." The doubled damage is a separate row
 * (Damage Roll Modifier); this file is the halved healing only.
 *
 * RULED 2026-09-21 (Matt), all four with the build plan:
 *   REACH     the six heals the gate refuses — Short Rest, Long Rest,
 *             photosynthesis, the Universal Ration, a draining attack, a
 *             Synth repair. The typed HP field is the Referee's override and
 *             is never scaled, for the reason deprived.js gives.
 *   ROUNDING  down, no floor. A heal can be cut to 0, which is why the note
 *             always names the figure the heal would have been.
 *   STACKING  per slot. Two slots quarter a heal.
 *   LONG REST HP only. The full-HP Wound-or-abilities benefit is untouched.
 *
 * SCALES THE GAIN, NOT THE AMOUNT. A Long Rest passes max HP as its amount and
 * clamps; halving that would hand a character one point short of full half
 * their maximum. What the book halves is the healing RECEIVED, so the caller
 * works out the gain exactly as before and passes that here.
 */
import { namedWoundPerSlot } from "../item/creature-effects.js";

// SINCE Effect Engine: Creatures chunk 2e (2026-10-07) the factor is the wound's own
// sentence (healing-per-slot), read by its key through namedWoundPerSlot - the name
// table that stood here, and the by-name slot count beside it, are gone.

/**
 * Scale a heal's gain for the actor's afflictions.
 *
 * Returns { gained, note }. `note` is "" when nothing scaled it, otherwise a
 * sentence (leading space included) for the caller to append to its own chat
 * line — appended rather than posted separately, so the explanation cannot
 * land on the wrong side of the result it explains.
 *
 * A non-positive gain is returned untouched: there is nothing to halve, and a
 * note on "already at full HP" would read as though something was taken.
 */
export function scaleHealing(actor, gained)
{
  const raw = Number(gained) || 0;
  if (raw <= 0) return { gained: raw, note: "" };

  let factor = 1;
  const named = [];
  for (const m of namedWoundPerSlot(actor, "healing-per-slot"))
  {
    factor *= Math.pow(m.perSlot, m.slots);
    named.push(`<b>${m.name}</b> (${m.slots} slot${m.slots === 1 ? "" : "s"})`);
  }
  if (factor === 1) return { gained: raw, note: "" };

  const scaled = Math.floor(raw * factor);
  return {
    gained: scaled,
    note: ` Healing cut by ${named.join(" and ")}: ${raw} HP would have been restored, ${scaled} was.`
  };
}
