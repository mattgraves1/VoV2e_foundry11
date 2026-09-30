/**
 * Trade Good Quality — Treasure/Barter.md, d20, 20 rows.
 *
 * WHAT THE BOOK STATES, and the second sentence is the whole reason this
 * mechanism exists: "When discovering caches of trade goods or encountering
 * trade caravans, roll for a basic good type and a quality, which further
 * describes the condition of the goods. Be sure to RECORD THE QUALITY as it
 * will affect the value of the goods in different settlements."
 *
 * A SEPARATE MODULE FROM tag-modifiers.js, DELIBERATELY, and this is the
 * decision the whole file rests on. Five of these twenty names are also WEAPON
 * TAG names and mean something different there: the weapon tags Ornate,
 * Polychrome and Translucent each DOUBLE trade value, while Barter prints
 * those three words alone with no stated effect at all. Keying qualities off
 * `system.tags` would have handed a trade good a x2 the book never granted,
 * silently and with no error — the homonym the Trade-Value Modifier row
 * already records having been caught once. Two tables that share five names
 * and disagree about all five do not belong in one namespace.
 *
 * GM-ONLY, RULED 2026-09-19 (Matt): "I don't think players should know what
 * the tag is, or how it modifies the item's value. I'd like to implement this
 * in a way so that the GM sees the tag that was rolled, and can use that to
 * influence the description of the goods for the players, but they don't get a
 * video-gamey read-out that tells them exactly what to expect."
 *
 * Three consequences, all of them design rather than presentation:
 *   - the quality is NOT in the item's name (weapons put their tags there;
 *     this deliberately does not follow that precedent)
 *   - the VALUE multiplier is never baked into `tradeValue`, so the field a
 *     player reads is the unmodified base
 *   - Occult's buyer-conditional line is GM-side too, unlike the weapon tags'
 *     equivalent, because printing "x2 to Mystics" names the quality
 *
 * It is a UI secret and not a security boundary — a flag is readable from the
 * console, exactly as `flags.vaarn.unidentified` is. It stops the read-out,
 * not a determined reader.
 *
 * NOT BAKING THE VALUE IS ALSO WHAT KEEPS THE NEXT ROW BUILDABLE, and that was
 * the reason before secrecy was. Barter's Local Value Fluctuations say "local
 * modifiers override generic modifiers", and a settlement that prizes Infected
 * goods trades them at "x2 the BASE value". Bake Shoddy's x0.5 into the field
 * and the base is gone, so Settlement Value Fluctuation could never express
 * the override. Two independent reasons for one decision.
 */

const SCOPE = "vaarn";
const QUALITY_FLAG = "quality";

/**
 * The table. `value` and `slot` are multipliers on the BASE; absent means the
 * quality does not touch that number.
 *
 * ELEVEN ROWS CARRY NO EFFECT AND THAT IS THE BOOK, not an omission here — the
 * table prints the word alone for Colourless, Holy, Simple, Decadent, Spiny,
 * Synthetic, Translucent, Lurid, Polychrome, Ornate and Iridescent. They are
 * still rolled, still recorded and still shown to the GM, because Local Value
 * Fluctuations makes EVERY quality live: a settlement may prize or despise any
 * of them, and it reads the quality generically with no per-quality data. That
 * is why no quality atom points at Settlement Value Fluctuation, and why
 * "flavour" here means "no arithmetic", never "no mechanism needs it".
 */
export const TRADE_GOOD_QUALITIES = [
  { roll: 1,  name: "Infected",     effect: "no trade value",              value: 0 },
  { roll: 2,  name: "False",        effect: "trader discovers deception in d4 days", declaredSpan: { amount: "1d4", unit: "day" } },
  { roll: 3,  name: "Shoddy",       effect: "half base trade value",       value: 0.5 },
  { roll: 4,  name: "Heavy",        effect: "x2 base slot weight",         slot: 2 },
  { roll: 5,  name: "Colourless",   effect: "" },
  { roll: 6,  name: "Holy",         effect: "" },
  { roll: 7,  name: "Simple",       effect: "" },
  { roll: 8,  name: "Decadent",     effect: "" },
  { roll: 9,  name: "Spiny",        effect: "" },
  { roll: 10, name: "Synthetic",    effect: "" },
  { roll: 11, name: "Translucent",  effect: "" },
  { roll: 12, name: "Lurid",        effect: "" },
  { roll: 13, name: "Polychrome",   effect: "" },
  { roll: 14, name: "Ornate",       effect: "" },
  { roll: 15, name: "Iridescent",   effect: "" },
  { roll: 16, name: "Occult",       effect: "x2 trade value with Mystics", value: 2, buyer: "Mystics" },
  { roll: 17, name: "Featherlight", effect: "half base slot weight",       slot: 0.5 },
  { roll: 18, name: "Colossal",     effect: "x3 slot weight and trade value", value: 3, slot: 3 },
  { roll: 19, name: "Exquisite",    effect: "x2 trade value",              value: 2 },
  { roll: 20, name: "Masterwork",   effect: "x3 trade value",              value: 3 },
];

/**
 * FALSE IS NOT ARITHMETIC AND IS NOT BUILT (Matt, 2026-09-19): "trader
 * discovers deception in d4 days" is a timed consequence with a clock that
 * starts at a trade this system does not model. It carries no `value` or
 * `slot` above, so it records and displays like the eleven bare ones and its
 * atom row stays NOT STARTED. Naming it here rather than leaving a reader to
 * notice the gap, because a quality with a printed effect and no multiplier
 * otherwise reads as a transcription error.
 *
 * BUILT 2026-09-24 (Matt): the Referee starts the clock. A GM-only Sold control
 * on the good's sheet rolls the declaredSpan and puts a hidden row on the
 * seller's board - module/item/false-sale.js. Still no value or slot here.
 */

/** The row for a d20 result. */
export function qualityByRoll(roll)
{
  return TRADE_GOOD_QUALITIES.find(q => q.roll === Number(roll)) ?? null;
}

/** The row named on an Item, or null. */
export function qualityOf(item)
{
  const name = item?.getFlag?.(SCOPE, QUALITY_FLAG)
            ?? item?.flags?.[SCOPE]?.[QUALITY_FLAG]
            ?? null;
  if(!name) return null;
  return TRADE_GOOD_QUALITIES.find(q => q.name === name) ?? null;
}

/** The flag block a builder spreads onto a new Item. */
export function qualityFlag(quality)
{
  return { [SCOPE]: { [QUALITY_FLAG]: quality.name } };
}

/**
 * THE SLOT MULTIPLIER IS APPLIED AND THE VALUE MULTIPLIER IS NOT, which is one
 * ruling rather than an inconsistency (Matt, 2026-09-19). Slot weight is a
 * physical fact the character notices - a colossal bale is obviously colossal,
 * and Encumbrance Penalty is BUILT and reads `system.slots`, so withholding it
 * would mean the book's rule silently never happening. Trade value is an
 * appraisal, and appraisal is the Referee's to give out.
 *
 * The cost was named and accepted: a player who knows the base can infer Heavy
 * or Colossal from the number, and Colossal's slot half therefore half-reveals
 * its value half.
 *
 * FEATHERLIGHT WORKS NOW AND DID NOT WHEN THIS SHIPPED. For one day this
 * function refused any multiplier below 1, because `slots` then meant the cost
 * of a whole STACK whenever it was 1 or more, and a fractional value flipped
 * item-slots.js into per-unit billing - so halving a base of 1 charged a stack
 * of eight FOUR slots instead of half of one. Matt's answer was to fix the
 * encoding rather than special-case the quality (Per-Unit Slot Weight,
 * 2026-09-19): `slots` is now the cost of one unit everywhere, fractions are
 * ordinary, and halving one halves the stack.
 *
 * THE BASE IS THE GOOD'S OWN PER-UNIT WEIGHT, not a flat 1, so Featherlight
 * hides go 2 -> 1 and Featherlight olives 0.01 -> 0.005. A base of ZERO is
 * legal and is left alone by every multiplier: the Hard Light Shard is
 * weightless, and three times nothing is still nothing.
 *
 * FOUR DECIMAL PLACES, not two. Dried Grubs stack 500 to a slot, so their
 * per-unit weight is 0.002 and rounding to 2dp would erase it.
 */
export function slotsWithQuality(baseSlots, quality)
{
  const base = Number(baseSlots);
  const safe = Number.isFinite(base) && base >= 0 ? base : 1;
  const m = quality?.slot;
  if(!m || safe === 0) return safe;
  return Math.round(safe * m * 10000) / 10000;
}


/**
 * The GM-only readout: what was rolled, and what it does to this Item.
 *
 * Returns null for an Item with no quality, so the sheet block disappears
 * entirely rather than rendering an empty heading.
 *
 * EVERY LINE SAYS WHETHER IT WAS APPLIED. A Referee reading "x3 trade value"
 * cannot otherwise tell whether the field beside it already includes it, and
 * that is the single most likely way to mis-price a good at the table.
 */
export function qualityReadout(item)
{
  const q = qualityOf(item);
  if(!q) return null;

  const baseValue = Number(item?.system?.tradeValue);
  const value = Number.isFinite(baseValue) ? baseValue : 1;
  const lines = [];

  if(q.value !== undefined && !q.buyer)
    lines.push(`Trade value x${q.value} — worth ${Math.round(value * q.value * 100) / 100}`
             + `, not the ${value} shown. NOT applied to the field: the player reads the base.`);

  if(q.buyer)
    lines.push(`Trade value x${q.value} to ${q.buyer} only — worth `
             + `${Math.round(value * q.value * 100) / 100} to them, ${value} to anyone else. NOT applied.`);

  if(q.slot)
    lines.push(`Slot weight x${q.slot} — already applied to Slots, which is the cost `
             + `of ONE unit.`);

  if(q.effect && !lines.length)
    lines.push(`${q.effect} — nothing on this sheet changes; resolve it at the table.`);

  if(!q.effect)
    lines.push(`The table prints this one with no stated effect. It still matters: a settlement `
             + `may prize or despise any quality.`);

  return { name: q.name, effect: q.effect, lines };
}
