/**
 * Vaarn's Morale Save, in one place because three consumers need the same
 * vocabulary and must not drift: actor-sheet.js rolls it, bestiary-build.js
 * writes it onto Actors, and tools/bestiary-drift.mjs fails the run when a
 * creature whose vault Morale is TEXTUAL carries no mode.
 *
 * The rule (Combat/Morale.md, verbatim in CRIMSON HOUND 07-05-26): an NPC
 * facing more danger than expected rolls d20 and adds its Morale bonus (ML).
 * Under 16 it flees, hides or attempts to parley.
 */

/** Morale Saves succeed on 16 or more. */
export const MORALE_TARGET = 16;

/**
 * The cases the book states as a RULE where the stat line would go, which a
 * bare numeric bonus cannot express. 14 Bestiary creatures print one of
 * these, and the original transcription flattened all of them to 0 — which
 * made Knight Mordicant ("Never Flees") one of the likeliest creatures in the
 * book to run away.
 *
 * `none` and `never` are deliberately NOT the same value. A bare "-" means
 * the book declines to give that creature a Morale stat at all (Sentry
 * Turret, Oblivion Obelisk); "Never Flees" is a stated rule about a creature
 * that has one. Both stop the roll, for different reasons, and merging them
 * would invent a stat the book withholds.
 *
 * `gm` is the deliberate residue, not a gap: "= Group Size" depends on how
 * many were spawned and is nowhere in the actor data, "Frenzied" and
 * "Retreats at the right time" are judgements, and Fleshwarp's "= LVL" is
 * exactly computable but was left here on purpose (Matt, 2026-09-06) rather
 * than growing a code path that serves one creature.
 *
 * Keys are stored on the Actor as `system.morale.mode`; values label the
 * sheet dropdown.
 */
export const MORALE_MODES = {
  "":       "Numeric (d20 + ML)",
  none:     "— none given",
  never:    "Never flees",
  always:   "Always flees",
  gm:       "Referee's call"
};

/**
 * Maps one of the book's textual ML values onto a mode. Used by the Monster
 * Generator, whose Core Stats table prints "Always Flees" at Level 0 and
 * "Never Flees" at Level 12 — the same vocabulary as the Bestiary stat
 * blocks, in a different table, and previously flattened to 0 there too.
 *
 * Deliberately NOT used to check the Bestiary's hand-assigned modes. Which
 * bucket "Special — never retreats while other Cacklemaw can witness" belongs
 * in is a judgement, and a regex that disagreed with a ruling would look like
 * drift while being nothing of the sort. bestiary-drift.mjs checks only that
 * a mode was SET, never which one.
 */
export function moraleModeFor(text)
{
  const s = String(text ?? "").trim();
  if(s === "" || s === "-" || s === "—") return "none";
  if(/^\+?-?\d+$/.test(s)) return "";
  if(/never\s+(flees|breaks|retreats|surrenders)/i.test(s)) return "never";
  if(/always\s+flees/i.test(s)) return "always";
  return "gm";
}

/**
 * A creature rule that fires on a FAILED Morale Save - Morale Check, RULED
 * 2026-09-24 (Matt). Only the Hegemony Conscript's Bomb Collar declares one:
 * "Conscripts who fail Morale Saves and flee within view of their Ordinator
 * are detonated, dealing 2d6 blast damage to all in melee range."
 *
 * The public Morale card is unchanged. The rule gets a SEPARATE card
 * whispered to the Referee, so the players learn of the collar only when it
 * goes off. Whether the Ordinator can see is the Referee's call, so the card
 * never detonates on its own: its button rolls once and applies the blast to
 * the creature itself (always - Matt, 2026-09-24) and to every targeted token
 * the Referee judges to be in melee range.
 *
 * The rule's Item carries `flags.vaarn.moraleFail` = {dice, damageTypes};
 * bestiary-build.js writes it from the rule's own declaration.
 */
export function moraleFailRules(actor)
{
  return (actor?.items?.contents ?? actor?.items ?? []).filter(i => i.flags?.vaarn?.moraleFail);
}

/** What the button says it will do; the handler's card reuses it. */
export function moraleFailLabel(spec, holderName)
{
  const types = spec.damageTypes?.length ? ` ${spec.damageTypes.join(", ")}` : "";
  return `Apply ${spec.dice}${types} damage to ${holderName} and the targeted tokens`;
}

/** The whispered card's content for one rule Item. */
export function moraleFailCard(actor, item)
{
  const spec = item.flags.vaarn.moraleFail;
  return `<b>${item.name}</b> <i>(Referee only)</i> — ${actor.name} failed its Morale Save.`
    + `<div>${item.system?.description ?? ""}</div>`
    + `<button type="button" class="vaarn-morale-fail" data-actor-uuid="${actor.uuid}" `
    + `data-item-id="${item.id}" data-label="${item.name}">${moraleFailLabel(spec, actor.name)}</button>`;
}
