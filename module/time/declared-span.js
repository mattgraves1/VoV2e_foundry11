/**
 * How long an Item's effect runs, as the ROSTER states it — foundry-system-index.csv
 * "Elixir Duration as Roster Data".
 *
 * WHAT THIS REPLACES. Every duration in the system used to be guessed from
 * prose by parseDuration, which takes the first non-round time expression in an
 * Item's text. Three things read that guess: the elixir path, which turns it
 * into a real tracked effect; the tracking dialog, which prefills it; and
 * canRoundRemind, which decides whether the hourglass control exists at all.
 *
 * WHY A GUESS WAS NOT GOOD ENOUGH, measured 2026-09-20 across every roster that
 * builds Items: of the 95 entries whose text states a time, only 37 state their
 * own span. The other 58 state a COST (Synth's "repair takes one hour"), a
 * THRESHOLD (Hiveyhump's three days before a stage begins), a RATE
 * (Deathblight's one slot a day), a CAPACITY (Humpback's seven days without
 * water), an ARRIVAL (the Ordinator's reinforcements), a PERMANENT trait whose
 * prose merely contains a number, or — the largest group — a span belonging to
 * a TARGET rather than to whoever holds the Item.
 *
 * THAT LAST ONE IS WHY NO SMARTER PARSER WOULD HAVE DONE. Glittercough Tonic's
 * text contains exactly one time expression, "targets DEX Save vs Blindness for
 * 4 rounds". Nothing in the sentence distinguishes it from a span the drinker
 * gets, because the difference is not in the words. RULED 2026-09-20 (Matt): a
 * span that lands on a target is an EFFECT duration, not an Item's. It matters
 * because round-effects.js's activate() writes to `item.parent`, so a target's
 * span declared here would open a countdown on the WRONG ACTOR's board. The
 * target route already exists and is separate — a creature ability's
 * effects[].duration, applied through Apply Effect to Target.
 *
 * STRICT, AND DELIBERATELY SO. An Item with no declaration has no span. It does
 * not fall back to reading its own prose, because the fallback is exactly the
 * guess this row exists to remove, and a fallback that fires only sometimes is
 * harder to reason about than one that never fires. RULED 2026-09-20 (Matt),
 * with the cost stated: 201 roster texts parsed to a duration beforehand, of
 * which 95 reached an Item, and every one of those 95 had to be declared before
 * this could land without taking a working control away.
 *
 * THE SHAPE IS TWO EXISTING PRECEDENTS, NOT A NEW ONE. bestiary-data.js already
 * carries `duration: {amount, unit}` on ability effects for the target-side
 * case, and `activity: {verb, options}` on Windweird's rule for the cost case,
 * the latter from knave.js's 2026-09-08 ruling that A DECLARED SPAN BEATS A
 * PARSED ONE. This generalises that ruling rather than inventing anything.
 *
 * WHY THE FIELD IS NAMED declaredSpan. `duration` was taken three times over: by
 * the target-side declaration above, by the `light` Item type's numeric
 * duration inherited from Knave 1e, and by the DECLINED Light Source Duration
 * row that names it. Three meanings on one key, two of them in files this
 * mechanism edits.
 */

import { SCALES } from "./effect-board.js";

/**
 * The declared span of an Item's own effect, or null.
 *
 * RETURNS parseDuration's SHAPE — `{raw, unit}` — rather than the roster's
 * `{amount, unit}`, so every caller that used to read a parse reads this
 * instead with no other change. The translation happens here, once, because the
 * alternative is four call sites each remembering which name they hold.
 *
 * A MALFORMED DECLARATION READS AS NO DECLARATION. An unknown unit or a blank
 * amount returns null rather than throwing: the failure this protects against
 * is a hand-edited roster entry, and refusing to render a control is a state
 * the sheet already handles, whereas an exception during a Handlebars helper
 * takes the whole sheet down. The roster checker is what catches the typo; this
 * is not the place to find it.
 */
export function declaredSpanOf(item)
{
  const d = item?.system?.declaredSpan;
  if(!d || typeof d !== "object") return null;

  const raw = String(d.amount ?? "").trim();
  const unit = String(d.unit ?? "").trim();
  if(!raw || !SCALES[unit]) return null;

  return { raw, unit };
}

/** Whether an Item declares a span at all. The question canRoundRemind asks. */
export function hasDeclaredSpan(item)
{
  return !!declaredSpanOf(item);
}

/**
 * The `system` fragment a builder merges to carry a roster entry's declaration
 * onto the Item it creates.
 *
 * EVERY BUILDER CALLS THIS RATHER THAN COPYING THE FIELD, so that the day the
 * shape changes there is one place to change. It returns an empty object for an
 * entry that declares nothing, which leaves template.json's null default in
 * place — and under strict that default already means "no span", so an
 * undeclared entry and an unplumbed builder produce the same correct outcome.
 * That is a convenience, not a licence: a builder left unplumbed silently
 * ignores any declaration later added to its roster.
 */
export function spanFieldFrom(entry)
{
  const d = entry?.declaredSpan;
  return (d && typeof d === "object") ? { declaredSpan: { amount: String(d.amount), unit: String(d.unit) } } : {};
}
