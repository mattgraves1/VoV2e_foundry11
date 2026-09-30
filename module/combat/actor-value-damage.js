/**
 * Damage read from an actor value — foundry-system-index.csv "Damage Read
 * from an Actor Value", built 2026-09-21.
 *
 * Three creature attacks state their damage as a number on a sheet rather
 * than as dice: the Fleshwarp's Fist Flurry (LVL x d4), the Kronophage's Out
 * of Time (= its LVL), the Extradimensional Mystic Hunter's Psychic Feedback
 * (= the TARGET's Gleam). Their weapon's damageDice holds a Foundry roll-data
 * formula - "(@lvl)d4", "@lvl", "@target.gleam" - and this builds the data
 * it reads.
 *
 * READ WHEN ROLLED, NEVER BAKED (RULED 2026-09-21, Matt). Both Levels move in
 * play - the Fleshwarp's is rolled (2d6), Borrowed Time raises the
 * Kronophage's - so a figure fixed at build or spawn would be wrong the
 * moment it mattered.
 *
 * NO TARGET, NO ROLL (RULED the same day). A formula that reads the target
 * needs exactly one targeted token; with none or several it refuses and says
 * why, rather than asking or treating the Gleam as 0.
 *
 * Pure: no Foundry globals, so tools/test-actor-value-damage.mjs runs it in
 * node. The caller passes actors in and does the rolling.
 */

/** Does this damage formula read an actor value at all? */
export function readsActorValue(formula)
{
  return /@/.test(String(formula ?? ""));
}

/** Does it read the TARGET's sheet, so that one target is required? */
export function readsTarget(formula)
{
  return /@target\./.test(String(formula ?? ""));
}

/**
 * Roll data for one damage roll, or a refusal.
 * @param formula  the weapon's damageDice
 * @param attacker the rolling actor
 * @param targets  the targeted actors, in any number
 * @returns {{data: object}|{refusal: string}}
 */
export function actorValueRollData(formula, attacker, targets = [], weaponName = "This attack")
{
  const data = { lvl: Number(attacker?.system?.level?.value ?? 0) };
  if(!readsTarget(formula)) return { data };
  const list = (targets ?? []).filter(Boolean);
  if(list.length !== 1)
    return { refusal: `<b>${weaponName}</b> needs exactly one targeted character, since its damage is read off the target`
      + ` (${list.length ? `${list.length} are targeted` : "none is targeted"}).` };
  const t = list[0];
  // Gleam is derived for characters only (actor.js); anything else has none,
  // and none reads as 0 rather than failing the roll.
  data.target = { name: t.name, gleam: Number(t.system?.gleam ?? 0) };
  return { data };
}
