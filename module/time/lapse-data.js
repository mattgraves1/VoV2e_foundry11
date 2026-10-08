/**
 * The book's upkeep lapses — foundry-system-index.csv "Upkeep Lapse Tracking".
 *
 * The clauses where the book requires something on a recurring day and states
 * what happens after N consecutive days without it. Every `rule` below is the
 * book's own wording, quoted rather than summarised, and nothing here
 * interprets it.
 *
 * NOTHING IN THIS FILE FIRES. RULED 2026-09-13 (Matt): "all these examples are
 * things that we might want to keep track of on the board as ongoing conditions
 * (no Photosynthesis: X days; no companion upkeep: X days), but that's it - we
 * aren't going to automate a neobloom dropping dead or a companion deserting."
 * So `fuseDays` is DISPLAY, not a threshold: it is printed so the Referee can
 * see how close the fuse is, and no code compares the elapsed count against it.
 * If a later edit makes something read it and act, that is a different
 * mechanism and needs its own row.
 *
 * TWO OMISSIONS, both deliberate, because an absence here is otherwise
 * indistinguishable from an oversight:
 *
 *   PETS have no entry. The Pets section prints no ration clause at all — its
 *   only feeding language is a parenthetical on the Level Limit, "Level 0
 *   creatures do not contribute to this limit, but must still be fed", which
 *   asserts feeding while stating no cost and no fuse. Companion Ration Upkeep
 *   records that as an open question and Matt's 2026-09-11 read was that Pets
 *   do not cost rations. Inventing a fuse for them here would answer it.
 *
 *   A PC'S OWN THIRST has no entry, though the book states the same shape:
 *   "If a character is Deprived due to thirst for three days in a row, they
 *   will perish." That is Deprived State, which is BUILT and already carries
 *   its own elapsed readout for exactly this reason. A second tracker for one
 *   condition would let a character be Deprived on one line and not on another.
 *   THE FAA NOMAD ENTRY BELOW DOES NOT BREAK THIS (Matt, 2026-09-23). It
 *   counts the days BEFORE Deprived - "after three days without drinking" - a
 *   stretch only a Faa has; once the Referee switches Deprived on, the Deprived
 *   row counts on with its own fuse. Two spans, never the same one twice.
 *
 * The wording is carried per entry rather than generated from a template.
 *
 * UNFED COMPANIONS LEFT THIS FILE (Effect Engine: Shared Pipelines chunk 7,
 * 2026-10-05). Followers, Mercenaries and Steeds had display-only rows here
 * under the 2026-09-13 ruling above, but companion upkeep (companion-upkeep.js,
 * 2026-09-19) has since counted their unfed days and handled desertion - three
 * days for a follower or mercenary, seven for a pet or steed - so the two
 * trackers disagreed. Companion upkeep is the one. An entry already running
 * under one of the old keys keeps its name and ends when the Referee ends it.
 */

export const LAPSES = [
  {
    key: "photosynthesis",
    name: "No photosynthesis",
    // Core Rules/Ancestries — Neobloom (Photosynthesis).
    rule: "If you do not photosynthesise for three days in a row, you will perish.",
    fuseDays: 3,
    book: "Neobloom (Photosynthesis)",
    atoms: ["Neobloom (Photosynthesis)"]
  },
  {
    key: "faa-water",
    name: "Faa Nomad without water",
    // Core Rules/Ancestries — Faa Nomad (Desert Metabolism), JADE IBIS. The
    // fuse is the three days to Deprived; the three weeks after that are the
    // Deprived row's own fuse.
    rule: "You become Deprived from thirst after three days without drinking, and it will be three weeks before you die.",
    fuseDays: 3,
    book: "Faa Nomad (Desert Metabolism)",
    atoms: ["Faa Nomad (Desert Metabolism)"]
  },
];

/** One lapse by key, or undefined. */
export function lapseByKey(key)
{
  return LAPSES.find(l => l.key === key);
}
