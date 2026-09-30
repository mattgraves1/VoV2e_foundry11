/**
 * The weather hex-chart and its eight weather types — foundry-system-index.csv
 * "Weather Procedure". Crimson Hound, Referee's Toolbox p.155.
 *
 * THE CHART IS ART AND THE VAULT DOES NOT REPRODUCE IT. The vault's
 * The Desert/Weather.md carries the procedure and all eight effect
 * paragraphs word for word, and then says only "a hex chart found in the
 * rulebook" — the chart itself is a printed diagram, so no text extract can
 * ever hold it. That is the escape hatch CLAUDE.md names: it was read off
 * p.155 by Matt on 2026-09-12, through a click-to-fill copy of the board
 * rather than by anyone eyeballing a scan.
 *
 * THE TRANSCRIPTION IS STORED VERBATIM, as the two strings that tool
 * emitted, and expanded at load. Hand-expanding it into 37 objects would
 * have put a second, editable copy of the data between the book and the
 * code, and nothing could then say which was the reading. These strings ARE
 * the reading. To re-check the chart, compare them with the tool's output;
 * to change it, replace them.
 *
 * WHAT PROVES IT, because reading the rows back proves nothing — a bad
 * transcription is a well-formed one. Three independent properties, all
 * verified 2026-09-12 by tools/test-weather-chart.mjs:
 *
 *   1. Matt hand-counted the adjacency tally for Still straight off the page,
 *      before this chart existed: 10 Still hexes, and its 60 faces touching
 *      Hazy 10, Dust Storm 12, Sand Storm 9, Heatwave 1, Worm-pollen 5, and
 *      7 running off the chart. The chart reproduces every one of those from
 *      an entirely separate read. His ninth figure, still:still, he counted
 *      17 and the chart says 16 — which is the discrepancy his own total
 *      predicted, since with Heatwave corrected from 0 to 1 his tally summed
 *      to 61 rather than 60.
 *   2. All 18 X edges pair up exactly under 180° rotation — nine pairs, no
 *      strays. A misread edge would almost certainly break that.
 *   3. With the X edges ignored, each of the six directions is a bijection
 *      over the 37 hexes, and the opposite direction is its inverse. That is
 *      what says the wrap is right, and no amount of reading the table says it.
 *
 * COLUMN AND ROW ARE THE TRANSCRIPTION'S COORDINATES, not the code's. Seven
 * columns left to right, each read top to bottom, lengths 4/5/6/7/6/5/4.
 * weather-chart.js converts them to axial q,r once, on load.
 */

/**
 * The chart, exactly as transcribed.
 *
 * `cols` — seven columns, left to right, each digit one hex read top to
 * bottom, the digit being the type's number in TYPES below.
 * `x` — the impassable edges, `column.row:direction`, direction being the
 * book's own d6 numbering (1 NW, 2 N, 3 NE, 4 SE, 5 S, 6 SW).
 */
export const WEATHER_CHART = Object.freeze({
  cols: "3611|36134|426314|7221148|311214|33421|5555",
  x: "1.1:2,1.4:5,2.1:1,2.5:6,3.1:2,3.6:5,4.1:1,4.1:2,4.1:3,"
   + "4.7:4,4.7:5,4.7:6,5.1:2,5.6:5,6.1:3,6.5:4,7.1:2,7.4:5"
});

/** Where the book says to place the marker: the centre hex. */
export const START_HEX = Object.freeze({ q: 0, r: 0 });

/**
 * The d6, in the book's own order, as axial steps over flat-top hexes.
 * Index 0 is a roll of 1. The chart's key hexagon prints these positions
 * around a single hex, which is what fixes the orientation: a face at the
 * top means flat-top hexes, and therefore columns rather than rows.
 */
export const DIRECTIONS = Object.freeze([
  Object.freeze({ roll: 1, key: "NW", label: "north-west", q: -1, r:  0 }),
  Object.freeze({ roll: 2, key: "N",  label: "north",      q:  0, r: -1 }),
  Object.freeze({ roll: 3, key: "NE", label: "north-east", q:  1, r: -1 }),
  Object.freeze({ roll: 4, key: "SE", label: "south-east", q:  1, r:  0 }),
  Object.freeze({ roll: 5, key: "S",  label: "south",      q:  0, r:  1 }),
  Object.freeze({ roll: 6, key: "SW", label: "south-west", q: -1, r:  1 })
]);

/**
 * The eight weather types, numbered as the book lists them.
 *
 * `text` is the book's own effect paragraph, trimmed of nothing that carries
 * a rule. `rule` is the single mechanical sentence a Referee needs at the
 * table, or null where the book states none — Still says only that
 * visibility is good, and Rain's flora sentence is colour, not a rule.
 *
 * ALMOST NO CLAUSE HERE IS WIRED TO ANYTHING, and that is the ruling rather
 * than an omission. RULED 2026-09-12 (Matt): "I don't think we tie this to
 * anything, we'll just make it a GM tool." So Heatwave does NOT reach into
 * rest.js's rationDrawFor. The tool says what the weather is and what the book
 * says about it; the table applies it.
 *
 * THE ONE EXCEPTION IS `vigilance`, ruled 2026-09-12 (Matt) the same day, when
 * the Vigilance Die turned out to belong in the same click as the weather
 * rather than a separate one: "Applied automatically". Because day-start.js
 * rolls the weather and the Vigilance Die in one sequence, the die's dice
 * expression is known at the moment the offer is posted, and asking the
 * Referee to re-state a rule the card has just printed is a step that exists
 * only to be forgotten.
 *
 * IT IS A FIELD RATHER THAN A MATCH ON `rule`, and that is the general form:
 * a rule's flag names the MECHANISM it needs, never the subject it is about —
 * the same shape as `ambush: "immune"` on Vigilance Radar.
 * Reading the sentence would have worked today and broken on the first
 * rewording, silently, with the die still rolling a plain d6.
 */
export const WEATHER_TYPES = Object.freeze([
  Object.freeze({
    n: 1, key: "still", name: "Still",
    text: "The desert landscape is still, untroubled by the susurration of "
        + "the heavens. Visibility is good.",
    rule: null
  }),
  Object.freeze({
    n: 2, key: "hazy", name: "Hazy",
    text: "The air is still, but mists of a lurid hue hang over the desert. "
        + "Visibility is impaired and landmarks cannot be seen from a distance.",
    rule: "Vigilance checks are made with disadvantage.",
    vigilance: "disadvantage"
  }),
  Object.freeze({
    n: 3, key: "dust", name: "Dust Storm",
    text: "The wind blows sheets of blue dust across the desert. Visibility "
        + "is badly impaired.",
    rule: "Travel is possible at half normal speed — a three-day journey "
        + "takes six. Vigilance checks are made with disadvantage.",
    vigilance: "disadvantage"
  }),
  Object.freeze({
    n: 4, key: "sand", name: "Sand Storm",
    text: "A howling wind blows a ferocious cloud of azure sand across the "
        + "desert. Tents or other makeshift shelters will provide adequate "
        + "protection. Any encounters rolled during these days are assumed to "
        + "be seeking shelter from the storm in the same place as the party.",
    rule: "Nobody travels. The PCs must hunker down and wait out the storm."
  }),
  Object.freeze({
    n: 5, key: "heatwave", name: "Heatwave",
    text: "Urth's dying sun musters all the warmth it can.",
    rule: "PCs must consume twice their normal ration of water per day if "
        + "they wish to travel."
  }),
  Object.freeze({
    n: 6, key: "pollen", name: "Worm-pollen",
    text: "Vaarnish sandworms reproduce through a baroque, decade-long "
        + "process of parthenogenesis, culminating in the explosive release "
        + "of thousands of melon-sized spores into the atmosphere. This "
        + "worm-pollen drifts back to Urth in ponderous sticky deluges that "
        + "can last for weeks.",
    rule: "Progress is slowed to half normal speed. Worm-pollen is edible: "
        + "treat these days as providing d4 rations per player."
  }),
  Object.freeze({
    n: 7, key: "rain", name: "Rain",
    text: "A rare bounty. The parched blue earth is blessed with water. In "
        + "the aftermath of a rainshower, the desert is conquered by a "
        + "short-lived imperium of majestic flora.",
    rule: "The party may collect 2d6 days of rations per member."
  }),
  Object.freeze({
    n: 8, key: "tempest", name: "Prismatic Tempest",
    text: "The sky bruises with clouds of midnight blue. Howling winds carry "
        + "scouring sheets of sand across the landscape. Thunder rends the "
        + "air and polychromatic lightning caresses the desert like the "
        + "tendrils of a jellyfish deity.",
    rule: "No travel of any kind is possible. The PCs take 3d6 electrical "
        + "damage every hour they spend aboveground."
  })
]);
