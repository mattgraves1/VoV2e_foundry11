/**
 * Broken Item State - foundry-system-index.csv "Broken Item State".
 *
 * Any Item can be marked broken. A broken Item cannot be equipped and refuses
 * every use until the Referee unmarks it (RULED 2026-10-06, Matt: the field on
 * every Item; Damaged Item's card marks it; fixing it is adjudicated - the
 * Referee unticks it; EVERY use control refuses).
 *
 * RULED 2026-10-09 (Matt), the build plan:
 *  - Marking an Item broken also UNEQUIPS it, so a worn item's AV and worn
 *    effects stop. One rule for every Item, weapons included - a broken weapon
 *    used to stay equipped, which changed nothing in play (the attack refuses).
 *    It is done here, in a preUpdate hook, rather than at each marking site, so
 *    the sheet's checkbox, a Fragile weapon's nat-1, corrosion and Damaged Item
 *    all get it without each remembering to.
 *  - Armour at quality 0 counts as broken.
 *  - A corroded Item of any type is marked broken (corrosion-card.js).
 *  - Damaged Item marks the slot's item only if it is carried gear.
 *  - broken is on the base template with default false, so an Item from a world
 *    made before it reads not-broken: nothing to do, no migration.
 *
 * Pure apart from the hook registration: tools/test-broken-item.mjs reads
 * isBroken and unequipOnBreak directly.
 */

/** Is this Item broken - marked so, or armour worn down to quality 0? */
export function isBroken(item)
{
  const s = item?.system;
  if (!s) return false;
  if (s.broken === true) return true;
  return s.quality !== undefined && s.quality !== null && Number(s.quality.value) <= 0;
}

const read = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * The extra change an update needs so a broken Item does not stay equipped:
 * { "system.equipped": false } when the update leaves an equipped Item broken
 * (or tries to equip a broken one), else null. `change` is Foundry's expanded
 * update object.
 */
export function unequipOnBreak(item, change)
{
  const after = {
    system: {
      broken: read(change, "system.broken") ?? item?.system?.broken,
      quality: read(change, "system.quality.value") !== undefined
        ? { value: read(change, "system.quality.value") } : item?.system?.quality,
    },
  };
  const equipped = read(change, "system.equipped") ?? item?.system?.equipped;
  return equipped === true && isBroken(after) ? { "system.equipped": false } : null;
}

/** The chat line a refused use or equip posts, the weapons' words. */
export function brokenLine(name)
{
  return `<span class="knave-ability-crit knave-ability-critFailure"><b>${name}</b> is broken!</span>`
       + ` It cannot be used until it is fixed - the Referee clears Broken on its sheet.`;
}

export function registerBrokenHooks()
{
  Hooks.on("preUpdateItem", (item, change) =>
  {
    const patch = unequipOnBreak(item, change);
    if (patch) foundry.utils.mergeObject(change, foundry.utils.expandObject(patch));
  });
}
