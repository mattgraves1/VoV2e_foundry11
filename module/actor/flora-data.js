/**
 * Flora of Vaarn — foundry-system-index.csv "Toxin and Flora Item Surface",
 * the Flora half, built 2026-09-19.
 *
 * Appendix F, JADE IBIS 15-09-26 pp.319-320: ten named plants as prose
 * entries, no table and no die. Six carry a mechanical clause and four are
 * setting colour. TRANSCRIBED TO THE VAULT the same day at
 * Miscellany/Flora of Vaarn.md, which had never existed — the appendix was
 * invisible to book-tables.csv and therefore to coverage.mjs, the Steeds and
 * Vehicles shape. Both the page and this file were checked against the text
 * extract sentence by sentence rather than trusted.
 *
 * WHAT A SURFACE IS FOR, since this row is named for one: eight atom rows
 * across Toxins and Flora pointed at mechanisms with nothing to attach to.
 * A plant that can be an Item on a sheet is something an atom can be about.
 *
 * WHAT IS DELIBERATELY NOT HERE. Nothing rolls these: the book gives no die,
 * so the Referee picks. Lumenwood's twelve hours are TEXT, because Light
 * Source Duration is a DECLINED mechanism and inventing a clock for it here
 * would be building behind that decline. Godsbreath's three days of visions
 * and its PSY Save are likewise stated rather than applied — the Save decides
 * whether a Mystic Gift is granted, and granting one is the Referee's.
 * SUPERSEDED 2026-09-26 (Matt): the span has an hourglass now, and its end
 * card carries the PSY Save; a success grants a random Gift (`endGrant`).
 */

import { spanFieldFrom } from "../time/declared-span.js";


/**
 * One entry per plant, in the book's order.
 *
 *   `rule`  — the mechanical clause, the book's own words. Null for colour.
 *   `item`  — what dropping it on a sheet makes. Null when there is nothing
 *             a character would carry.
 */
export const FLORA = [
  {
    key: "avern",
    name: "Avern Bloom",
    plant: "Avern",
    blurb: "A tall, dark-stemmed flower with deadly poisonous barbs about its petals, grown by sacred lakes and in burial grounds.",
    rule: "A fresh-cut avern stem can be used as a melee weapon, of three slots in size. Striking a biological creature with an avern bloom forces a CON Save vs d12 TOX damage. In Vaarn's heat, the bloom only retains its poison for a day.",
    // NO DAMAGE DIE IS PRINTED for an avern bloom. The book gives its size (three
    // slots) and its effect (the CON Save vs d12 TOX) and stops, so the field is
    // left empty rather than guessed at from the slot count.
    // Toxin Die wiring, RULED 2026-09-26 (Matt): the bloom is a TOX weapon with
    // a d12 toxin die of its own (`toxDie`, since there is no damage die to read
    // one from), so a hit on a biological target posts the CON Save card. When
    // its one-day span ends the poison is spent: the Ended card strips the TOX
    // and it stays a 3-slot weapon (`toxLapses`).
    item: { type: "weaponMelee", system: { slots: 3, damageDice: "", hands: 1, tags: [], damageTypes: ["tox"] } },
    toxDie: "d12", toxLapses: true
  , declaredSpan: { amount: "1", unit: "day" } },
  {
    key: "godsbreath",
    name: "Godsbreath Star",
    plant: "Godsbreath Cactus",
    blurb: "Star-shaped ankle-high cacti, cured by the Faa into pentagonal slices and prized as a trade good; second only to amaranthine sugar in psychedelic potency.",
    rule: "Ingesting a godsbreath star causes extreme, debilitating hallucinations for two days, followed by another day of lower-level hallucinations. Afflicted PCs make a PSY Save; on success, they manifest a new Mystic Gift as a result of their visions.",
    item: { type: "item", system: { slots: 1 } }
  // THREE DAYS, not two (RULED 2026-09-21, Matt): the two severe days and the
  // milder third are one span - the intensity is flavour only.
  , declaredSpan: { amount: "3", unit: "day" },
  // Grant-a-Roll on Another Table, RULED 2026-09-26 (Matt): the PSY Save
  // comes at the END of the span, as a button on the card that announces it;
  // a success grants a RANDOM Mystic Gift, which takes a slot.
  endGrant: { save: "psy", roster: "gift" } },
  {
    key: "ickbulb",
    name: "Ickbulb",
    plant: "Ickbulb",
    blurb: "A small ground-growing gourd of unbelievably foul taste and smell.",
    rule: "Smearing oneself with crushed ickbulb renders one deeply unappealing to most of Vaarn's carnivores, which roll with DIS if trying to bite a character covered in the residue. Due to the ickbulb's pungent scent, you will be refused entry to all homes and settlements for three days, and no one will sit near you outdoors.",
    item: { type: "item", system: { slots: 1 } },
    // To-Hit Resolution Override wiring, RULED 2026-09-25 (Matt): while the
    // span runs the smeared character carries this marker, and every bite
    // against them rolls at DIS - see TARGET_DIS_RULES.
    spanApplied: { conditions: ["ickbulbScent"] }
  , declaredSpan: { amount: "3", unit: "day" } },
  {
    key: "luftshrub",
    name: "Luftwood Bough",
    plant: "Luftshrub",
    blurb: "An extrasolar tree that metabolises a lighter-than-air gas when set alight, pulling itself into the sky on lilac flames.",
    rule: null,
    item: { type: "item", system: { slots: 1 } },
    note: "A bough of luftwood becomes lighter than air when set ablaze. Faa nomads use these branches to signal one another over long distances."
  },
  {
    key: "lumenwood",
    name: "Lumenwood Bough",
    plant: "Lumenwood",
    blurb: "A shrub with phosphorescent bark and leaves, its cut boughs used in Vaarnish homes in place of candles or anbaric lamps.",
    rule: "Lumenwood boughs can be used as a light source, and their phosphorescence lasts twelve hours after the limb is cut. The light is softer and dimmer than a blazing torch but adequate for navigating darkened places.",
    item: { type: "item", system: { slots: 1 } }
  },
  {
    key: "martyr-tree",
    name: "Martyr Tree Foliage",
    plant: "Martyr Tree",
    blurb: "Squat chalk-coloured yucca trees whose dark red foliage is said to resemble the corpse of St. Athmand.",
    rule: null,
    item: null
  },
  {
    key: "seven-fruit",
    name: "Seven-Fruit",
    plant: "Seven-Fruit Tree",
    blurb: "A gene-sculpted staple crop bearing seven different fruits in a dependable cycle, one always ready for harvest.",
    rule: null,
    item: { type: "item", system: { slots: 1 } },
    note: "Primeapple, Duopear, Trinana, Tetraberry, Pentaplum, Hexagranate, Heptamelon — one is always in season."
  },
  {
    key: "swordgrass",
    name: "Dried Swordgrass Leaf",
    plant: "Swordgrass",
    blurb: "Drab ancipital grass whose leaves approach iron for sharpness; cheap knives for farmers and herdsmen.",
    rule: "Treat a dried Swordgrass leaf as a light melee weapon (d6 damage).",
    // "light melee weapon (d6 damage)" - the d6 is the book's. "Light" is not a
    // weapon tag in this system (the tag rosters have no such entry), so it stays
    // in the text rather than becoming one.
    item: { type: "weaponMelee", system: { slots: 1, damageDice: "1d6", hands: 1, tags: [] } }
  },
  {
    key: "trundleweed",
    name: "Trundleweed",
    plant: "Trundleweed",
    blurb: "A wheel-shaped plant that rolls sedately across the desert dispersing seeds; dried specimens serve as tables.",
    rule: null,
    item: { type: "item", system: { slots: 1 } },
    note: "Neither edible nor poisonous; the flesh has the consistency and flavour of wood pulp."
  },
  {
    key: "waterguide",
    name: "Waterguide",
    plant: "Waterguide",
    blurb: "A motile shrub that walks on evolved roots towards the nearest fresh water, prized by prospectors.",
    rule: "A waterguide encountered in the wilderness will always be walking towards the nearest source of water. Two caveats: the bush walks unbearably slowly by human standards, and it has a higher tolerance for toxic water than most travellers.",
    item: { type: "item", system: { slots: 1 } }
  }
];

/** One plant by key. */
export function floraByKey(key)
{
  return FLORA.find(f => f.key === key) ?? null;
}

/** The Item data for a plant, or [] when it is one nobody carries. */
export function buildFlora(key)
{
  const f = floraByKey(key);
  if(!f?.item) return [];
  const description = `<p>${f.blurb}</p>`
    + (f.rule ? `<p><b>${f.plant}:</b> ${f.rule}</p>` : "")
    + (f.note ? `<p>${f.note}</p>` : "");
  return [{
    name: f.name,
    type: f.item.type,
    system: { ...f.item.system, description, ...spanFieldFrom(f) },
    ...(f.spanApplied || f.endGrant || f.toxDie ? { flags: { vaarn: {
      ...(f.spanApplied ? { spanApplied: f.spanApplied } : {}),
      ...(f.endGrant ? { endGrant: f.endGrant } : {}),
      ...(f.toxDie ? { toxDie: f.toxDie } : {}),
      ...(f.toxLapses ? { toxLapses: true } : {}) } } } : {})
  }];
}
