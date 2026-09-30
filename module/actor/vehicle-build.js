/**
 * One vehicle roster entry -> one Actor document. Vehicle Stat Block Import,
 * 2026-09-18.
 *
 * HULL IS STORED IN system.health. Matt ruled that Hull is to a vehicle what
 * HP is to every other actor, and that the only difference is how damage
 * converts (see _resolveHPChange). Keeping it in the same field is what lets
 * every existing damage path, the token bar and the chat-card buttons reach a
 * vehicle without a second copy of each; the sheet labels it Hull.
 *
 * The vehicle type takes the shared `base` template for the same reason, and
 * therefore carries ability, Level and Morale fields it never shows. All of
 * them stay at zero. The alternative is a vehicle the damage code cannot read,
 * which is the failure the container type accepted on purpose and a vehicle
 * cannot.
 */

const CREATURE_TYPE_OF = {
  biological: "biological",
  synthetic: "synthetic",
  hypergeometric: "hypergeometric",
  mineral: "mineral"
};

/** "Biological / Synthetic" -> { biological: true, synthetic: true }. */
export function vehicleCreatureTypes(kind)
{
  const out = {};
  for(const part of String(kind).split("/"))
  {
    const key = CREATURE_TYPE_OF[part.trim().toLowerCase()];
    if(key) out[key] = true;
  }
  return out;
}

export function buildVehicleItems(entry)
{
  return entry.weapons.map(w =>
  {
    const system = {
      damageDice: w.dice, slots: 0, tags: [], equipped: true, hands: 0,
      description: `<p><i>${w.name} (${w.dice.replace(/^1d/, "d")}${w.damageTypes?.length ? ", " + w.damageTypes.join(", ") : ""})</i></p>`
    };
    // Same field the Bestiary's creature attacks use, for the same reason:
    // a type word written into `tags` would arm the weapon TAG of that name.
    if(w.damageTypes?.length) system.damageTypes = [...w.damageTypes];
    return { name: w.name, type: w.ranged ? "weaponRanged" : "weaponMelee", system };
  });
}

export function buildVehicleDoc(entry)
{
  const paragraphs = entry.description.split("\n\n").map(p => `<p>${p}</p>`).join("");
  return {
    name: entry.name,
    type: "vehicle",
    // Linked: a vehicle is one particular machine, and its Hull and crew must
    // be the same whichever token of it is clicked. Unlinked, each token would
    // take damage on its own copy, and crew-granted ownership - which is
    // granted on the Actor - would not reach an unlinked token's synthetic one.
    prototypeToken: { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
                      bar1: { attribute: "health" } },
    system: {
      health: { value: entry.hull, min: 0, max: entry.hull },
      armor: { value: entry.av, bonus: entry.av - 10 },
      creatureTypes: vehicleCreatureTypes(entry.kind),
      vehicleKind: entry.kind,
      speed: entry.speed,
      itemSlots: entry.itemSlots,
      biography: paragraphs,
      crew: {
        text: entry.crew,
        passengers: entry.passengers,
        pilotLabel: entry.pilotLabel,
        pilotSlots: entry.pilotSlots,
        gunnerSlots: entry.gunnerSlots,
        attacks: entry.attacks,
        pilots: [],
        gunners: []
      }
    },
    // Which damage rule this vehicle answers to, independent of its name, so
    // a renamed Vimana stays impervious. See damageRuleKey.
    // materialsValue replaces the Hull x10 trade value where Matt ruled the
    // formula would mislead — see level-trade-value.js.
    // metal: the vehicle is made of metal (Metal Item Property, RULED
    // 2026-09-27) - seven of the eleven. Recorded for the readers to ask.
    flags: { vaarn: { damageRuleKey: entry.name,
                      ...(entry.materialsValue != null ? { materialsValue: entry.materialsValue } : {}),
                      ...(entry.metal ? { metal: true } : {}) } },
    items: buildVehicleItems(entry)
  };
}
