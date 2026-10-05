/**
 * ROLLED CREATURE STATS — a stat the book prints as dice, rolled when the
 * creature is put on the table rather than averaged when it is transcribed.
 *
 * RULED 2026-09-20 (Matt). The book prints a die where a number goes on seven
 * creatures: "LVL 8+d8 / AV 12+d8 / ML +d10" for the Extradimensional Mystic
 * Hunter, "LVL 2d6*" for the Fleshwarp, "LVL d6 (4 - 24 HP)" for the Neobloom.
 * The roster used to hold the AVERAGE roll with a note saying so, which made
 * every Fleshwarp Level 7 and hid that anything had been decided. His ruling:
 * the creature is built at the CONSTANT part of the expression - Level 0 for
 * 2d6, Level 8 for 8+d8, AV 12 for 12+d8 - and carries an intrinsic Item per
 * rolled stat, "Roll for Level", "Roll for AV", "Roll for Morale". Using the
 * Item rolls the dice, adds the base and WRITES the stat, and the Item is then
 * removed - its absence is how the Referee sees the creature has been rolled.
 *
 * HP FOLLOWS LEVEL at four a Level. The book's own ranges say so - d6 is
 * "4 - 24 HP", d10 is "4 - 40 HP" - and it is the Stat Block Reference's
 * general rule, the one hp-by-level.js already serves.
 *
 * WHY THIS WAS FOUND. The vault had transcribed the Mystic Hunter's "AV 12+d8"
 * and the Fleshwarp's "AV 13" as HP, so both sat at the default AV 10 with
 * their armour value in the hit-point field. Bestiary Missing AV Source Check
 * was filed for the missing AV; the label swap was the cause.
 *
 * A DECLARED FIELD, never the stat line's text - the rule ruleItems states for
 * every other creature control. `rolled` on the bestiary-data.js entry is the
 * declaration, and the Item carries it as flags.vaarn.rolledStat, which is
 * what the sheet's control and sync-bestiary.js's item key both read.
 */

/** The stats a creature may roll, in the order their Items are built. */
export const ROLLED_STATS = {
  level:  { label: "Level",  itemName: "Roll for Level" },
  av:     { label: "AV",     itemName: "Roll for AV" },
  morale: { label: "Morale", itemName: "Roll for Morale" },
};

/** HP a creature has per Level when the book prints no figure of its own. */
export const HP_PER_LEVEL = 4;

/** "8+d8" for the Item text; a base of 0 prints the dice alone. */
export function rolledFormula(spec)
{
  const dice = String(spec.dice).replace(/^1d/, "d");
  return spec.base ? `${spec.base}+${dice}` : dice;
}

/**
 * One intrinsic Item per declared rolled stat. Shape is ruleItems' shape
 * exactly - type `item`, weightless, worthless, intrinsic - so it lands in the
 * same branch of sync-bestiary.js's item key.
 */
export function rolledStatItems(entry)
{
  const rolled = entry.rolled || {};
  return Object.keys(ROLLED_STATS).filter(stat => rolled[stat]).map(stat =>
  {
    const spec = { stat, base: rolled[stat].base ?? 0, dice: rolled[stat].dice,
      ...(rolled[stat].setsMorale ? { setsMorale: true } : {}) };
    const tail = stat === "level"
      ? ` HP becomes ${HP_PER_LEVEL} per Level${spec.setsMorale ? ", and Morale becomes the Level" : ""}.`
      : "";
    return {
      name: ROLLED_STATS[stat].itemName,
      type: "item",
      // not a die: the picture is not the roll button (Matt, 2026-10-04 - he clicked it expecting a roll)
      img: "systems/vaarn/module/icons/rolled-stat-unknown.svg",
      system: {
        description: `<p>The book gives this creature's ${ROLLED_STATS[stat].label} as <b>${rolledFormula(spec)}</b>. Use this to roll it and set the ${ROLLED_STATS[stat].label}.${tail} This Item is removed once it has been used.</p>`,
        slots: 0,
        quantity: 1,
        tradeValue: 0,
        intrinsic: true
      },
      flags: { vaarn: { rolledStat: spec } }
    };
  });
}

/** The declaration an Item carries, or null. */
export function rolledStatSpecOf(item)
{
  const spec = item?.flags?.vaarn?.rolledStat;
  return spec && ROLLED_STATS[spec.stat] && spec.dice ? spec : null;
}

/**
 * The actor update a roll produces. PURE, so the arithmetic is tested without
 * Foundry. `diceTotal` is the dice alone; the base is added here.
 *
 * A Level roll rewrites what buildSystem derived from the Level: hit points,
 * and the six ability values, which a creature holds at its Level capped at
 * ten. Current HP is set to the new maximum - this is a creature being put on
 * the table, not one being healed mid-fight.
 */
export function planRolledStat(spec, diceTotal)
{
  const total = (spec.base ?? 0) + diceTotal;
  if(spec.stat === "av") return { total, update: { "system.armor.value": total } };
  if(spec.stat === "morale") return { total, update: { "system.morale.value": total } };

  const hp = total * HP_PER_LEVEL;
  const update = {
    "system.level.value": total,
    "system.health.max": hp,
    "system.health.value": hp,
  };
  for(const key of ["str", "dex", "con", "int", "psy", "ego"])
    update[`system.abilities.${key}.value`] = Math.min(total, 10);
  if(spec.setsMorale)
  {
    update["system.morale.value"] = total;
    // "ML = LVL" is a rule only until the Level is known; after that it is a
    // number, and morale.js must be allowed to use it.
    update["system.morale.mode"] = "";
  }
  return { total, hp, update };
}

/** The line the chat card prints. */
export function rolledStatSummary(spec, diceTotal, plan)
{
  const label = ROLLED_STATS[spec.stat].label;
  const sum = spec.base ? `${spec.base} + ${diceTotal}` : `${diceTotal}`;
  const extra = spec.stat === "level"
    ? ` HP <b>${plan.hp}</b>${spec.setsMorale ? `, Morale <b>+${plan.total}</b>` : ""}.`
    : "";
  return `${label} <b>${plan.total}</b> (${rolledFormula(spec)}: ${sum}).${extra}`;
}

/** Roll, write, and return what happened. Foundry-side; not imported by tests. */
export async function applyRolledStat(actor, item)
{
  const spec = rolledStatSpecOf(item);
  if(!spec) return null;
  const roll = await new Roll(String(spec.dice)).evaluate({ async: true });
  const plan = planRolledStat(spec, roll.total);
  await actor.update(plan.update);
  return { spec, roll, plan, summary: rolledStatSummary(spec, roll.total, plan) };
}
