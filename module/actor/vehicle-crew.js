/**
 * Vehicle crew — who drives, who fires, and who that lets move the token.
 * Vehicle Stat Block Import, 2026-09-18.
 *
 * Every rule here is Matt's, ruled 2026-09-18:
 *   - A crew slot is filled by dragging an Actor from the sidebar onto the
 *     vehicle sheet. Characters AND NPCs may crew a vehicle.
 *   - Only the GM assigns crew.
 *   - Filling a pilot or gunner slot gives Owner on the vehicle to every
 *     player who owns the assigned actor. Clearing it takes that back unless
 *     the player still owns another assigned crew member.
 *   - To hit: a vehicle that attacks on its own rolls d20 + current Hull (the
 *     book's rule for Synthetic vehicles); otherwise the assigned gunner's or
 *     pilot's DEX. An empty required slot refuses the attack.
 *
 * Crew are stored as Actor UUIDs, so a deleted crew member reads as an empty
 * slot rather than a dangling name.
 */

export const CREW_ROLES = ["pilots", "gunners"];

/** Slots for one role, as the sheet shows them: filled or empty, in order. */
export function crewSlots(vehicle, role)
{
  const crew  = vehicle.system.crew ?? {};
  const count = role === "pilots" ? (crew.pilotSlots ?? 0) : (crew.gunnerSlots ?? 0);
  const ids   = Array.isArray(crew[role]) ? crew[role] : [];
  const out = [];
  for(let i = 0; i < count; i++)
  {
    const uuid  = ids[i] ?? null;
    const actor = uuid ? fromUuidSync(uuid) : null;
    out.push({ role, index: i, uuid, name: actor?.name ?? null, missing: !!uuid && !actor });
  }
  return out;
}

/** Why an actor cannot crew this vehicle, or null if it can. */
export function crewRefusal(vehicle, actor)
{
  if(!actor) return "that is not an actor";
  if(actor.pack) return "drag a world actor, not one from a compendium";
  if(actor.type === "vehicle") return "a vehicle cannot crew a vehicle";
  if(actor.type === "container") return "a container cannot crew a vehicle";
  if(actor.id === vehicle.id) return "a vehicle cannot crew itself";
  return null;
}

/**
 * The actor whose DEX aims the weapons, or the reason there is none.
 * Returns { mode: "hull" } | { mode: "crew", actor, role } | { refusal }.
 */
export function attackSource(vehicle)
{
  const crew = vehicle.system.crew ?? {};
  switch(crew.attacks)
  {
    case "self":   return { mode: "hull" };
    case "pilot":  return operator(vehicle, "pilots", crew.pilotLabel || "Pilot");
    case "gunner": return operator(vehicle, "gunners", "Gunner");
    default:       return { refusal: `${vehicle.name} has no attack.` };
  }
}

function operator(vehicle, role, label)
{
  const filled = crewSlots(vehicle, role).find(s => s.uuid && !s.missing);
  if(!filled) return { refusal: `${vehicle.name} needs a ${label.toLowerCase()} to fire — assign one on its sheet.` };
  return { mode: "crew", actor: fromUuidSync(filled.uuid), role: label };
}

/** Non-GM users who own at least one filled crew slot's actor. */
function crewOwners(vehicle)
{
  const owners = new Set();
  for(const role of CREW_ROLES)
    for(const slot of crewSlots(vehicle, role))
    {
      if(!slot.uuid || slot.missing) continue;
      const actor = fromUuidSync(slot.uuid);
      for(const user of game.users)
        if(!user.isGM && actor.testUserPermission(user, "OWNER")) owners.add(user.id);
    }
  return owners;
}

/**
 * Bring the vehicle's ownership in line with its crew.
 *
 * Only what THIS function granted is ever taken back. `flags.vaarn.crewGrants`
 * records each user it raised and the level they had before, so a player the
 * GM made an owner by hand keeps it when the crew changes — the grant is
 * undone, not the player's access.
 */
export async function syncCrewOwnership(vehicle)
{
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  // An ARRAY of { userId, before }, not an object keyed by user: an update
  // replaces an array whole but MERGES an object, so a revoked user's key
  // would survive in an object and read as still granted next time.
  const grants = [...(vehicle.getFlag("vaarn", "crewGrants") ?? [])];
  const want   = crewOwners(vehicle);
  const update = {};

  for(const userId of want)
  {
    if(grants.some(g => g.userId === userId)) continue;
    const current = vehicle.ownership[userId];
    if(current === OWNER) continue;          // already an owner by other means
    grants.push({ userId, before: current ?? null });
    update[`ownership.${userId}`] = OWNER;
  }
  const kept = [];
  for(const g of grants)
  {
    if(want.has(g.userId)) { kept.push(g); continue; }
    // null = the user had no explicit level; removing the key restores the
    // vehicle's default rather than writing NONE over it.
    if(g.before === null) update[`ownership.-=${g.userId}`] = null;
    else update[`ownership.${g.userId}`] = g.before;
  }

  if(!Object.keys(update).length) return false;
  update["flags.vaarn.crewGrants"] = kept;
  await vehicle.update(update);
  return true;
}

/** Put `actor` in slot `index` of `role`, then sync ownership. */
export async function assignCrew(vehicle, role, index, actor)
{
  const ids = [...(vehicle.system.crew?.[role] ?? [])];
  while(ids.length <= index) ids.push(null);
  ids[index] = actor.uuid;
  await vehicle.update({ [`system.crew.${role}`]: ids });
  await syncCrewOwnership(vehicle);
}

export async function clearCrew(vehicle, role, index)
{
  const ids = [...(vehicle.system.crew?.[role] ?? [])];
  if(index < ids.length) ids[index] = null;
  await vehicle.update({ [`system.crew.${role}`]: ids });
  await syncCrewOwnership(vehicle);
}
