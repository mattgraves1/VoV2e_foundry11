/**
 * The Fleshwarp's Grafted Arm — foundry-system-index.csv "Wound-Table
 * Resolution", RULED 2026-09-25 and 2026-09-26 (Matt).
 *
 * WHAT THE BOOK DOES. "If the target fails an opposed STR Save, the Fleshwarp
 * attaches one of its limbs to the victim's torso. The Fleshwarp's Level and
 * number of limbs are lowered by -1 (if this would reduce the Level below 1,
 * the Fleshwarp dies). The victim fills an item slot with a Wound: Grafted
 * Arm. The Grafted Arm is Level 1 and has the AV of its host. It makes an
 * unarmed attack each round (d4) targeted at anyone near its host. Damage
 * dealt to the Grafted Arm is shared between the host and the limb."
 *
 * THE RULINGS, all six here because each one is a line of code:
 *  - The wound is the shared named-wound path (graftedArm in NAMED_WOUNDS);
 *    compelled-save.js applies it before calling graftLimb.
 *  - The arm is a code-only Bestiary creature, the Usurper Arm precedent, and
 *    Biological, the Fleshwarp's type. Spawned as an Actor with NO token:
 *    the Referee places it.
 *  - Its AV is the host's, read LIVE (actor.js), so it follows armour the host
 *    puts on or takes off. The hooks below re-prepare the arm when the host
 *    changes, since nothing else would.
 *  - The split is AUTOMATIC. The RAW damage is split, the arm taking the
 *    rounded-up half and the host the rounded-down half, and each half then
 *    goes through its own actor's damage rules (splitForHost, actor-sheet.js
 *    _doDamage). The host's half carries the attacking weapon, exactly as
 *    Bound to the Host was tested (Group 365). A MISS does not pass to the
 *    host: Matt, the two arms are modelled differently in the book.
 *  - The Fleshwarp pays: Level -1, Morale -1 (it equals Level) and max HP -4.
 *    At Level 1 that takes max HP to 0 - "below Level 1, the Fleshwarp dies"
 *    is zero-max-hp.js's death, its message posted after the graft card.
 *  - Nothing deletes the arm. Healing the wound leaves it, and the arm dying
 *    leaves the wound - the 2026-09-13 save-gated ruling on spawned limbs.
 *  - REST CANNOT HEAL THE WOUND WHILE ITS ARM ACTOR EXISTS (2026-09-26): the
 *    Referee deletes the arm when it is gone, and the wound can rest off. The
 *    Referee's Heal button removes it at any time.
 */
import { spawnNamedCreature } from "./bestiary-spawn.js";
import { MAX_HP_DEFERRED, zeroMaxHpMessage } from "./zero-max-hp.js";
import { maxHpChange } from "../effects/max-hp.js";
// A creature's own flags from its actor-level sentences (Effect Engine: Creatures chunk 2d).
import { creatureActorFlagsOf } from "../item/creature-effects.js";

const SCOPE = "vaarn";
export const GRAFTED_FLAG = "graftedToHost";
export const HOST_FLAG = "hostActorId";
const HP_PER_LEVEL = 4;
const GRAFT_DEATH_CAUSE = "grafting its last limb";

/** The host a grafted limb is attached to, or null. */
export function graftHostOf(limb)
{
  if(!creatureActorFlagsOf(limb)[GRAFTED_FLAG]) return null;
  const id = limb.flags[SCOPE][HOST_FLAG];
  return id ? (game.actors?.get(id) ?? null) : null;
}

/**
 * Split damage components between a limb and its host. PURE, for the offline
 * test. The TOTAL is halved, not each component: two odd components would
 * otherwise hand the limb two extra points. The host's floor(total / 2) is
 * taken from each component's floor half first, then one point at a time from
 * the odd ones, so every component keeps its own type on both sides.
 */
export function splitForHost(parts)
{
  const total = parts.reduce((a, c) => a + c.amount, 0);
  let owed = Math.floor(total / 2);
  const host = parts.map(c => ({ ...c, amount: Math.floor(c.amount / 2), min: Math.floor(c.min / 2) }));
  owed -= host.reduce((a, c) => a + c.amount, 0);
  for(let i = 0; i < parts.length && owed > 0; i++)
    if(parts[i].amount % 2) { host[i].amount += 1; owed -= 1; }
  const limb = parts.map((c, i) => ({ ...c, amount: c.amount - host[i].amount, min: Math.ceil(c.min / 2) }));
  return {
    limb, host,
    limbTotal: limb.reduce((a, c) => a + c.amount, 0),
    hostTotal: host.reduce((a, c) => a + c.amount, 0),
  };
}

/**
 * The Fleshwarp's cost of a graft, as an update. PURE, for the offline test.
 * Morale moves only when it is already a number: a Fleshwarp still showing
 * "ML = LVL" has not been rolled, and the Referee's rule stands.
 */
export function graftCost(poster)
{
  const level = Number(poster.system?.level?.value ?? 0);
  const update = {
    "system.level.value": level - 1,
    // The max HP verb (Shared Pipelines chunk 5): a loss, floored at 0, clamps current.
    ...maxHpChange(poster, { add: -HP_PER_LEVEL }),
  };
  if(!poster.system?.morale?.mode) update["system.morale.value"] = Number(poster.system?.morale?.value ?? 0) - 1;
  return update;
}

/**
 * Tie the host's newest unlinked Wound: Grafted Arm to this limb, so rest
 * cannot heal it while the limb Actor exists - RULED 2026-09-26 (Matt). One
 * wound per limb: with two grafts, deleting one arm frees only its own wound.
 * named-wound.js restProofReason reads the link.
 */
export const LIMB_PROOF = "its grafted arm is still attached";
export function linkedWounds(wounds, limbId)
{
  const list = (wounds ?? []).map(w => ({ ...w }));
  for (let i = list.length - 1; i >= 0; i--)
    if (list[i].named === "graftedArm" && !list[i].limbActorId)
    {
      list[i].limbActorId = limbId;
      list[i].limbProof = LIMB_PROOF;
      return list;
    }
  return null;
}

async function linkWoundToLimb(host, limb)
{
  const next = linkedWounds(host.system?.wounds, limb.id);
  if (next) await host.update({ "system.wounds": next });
}

/**
 * "Grafted Arm 2 (Host)" - NUMBERED, RULED 2026-09-26 (Matt), because two
 * grafts on one host made two Actors with one name, and the Referee deletes an
 * arm by picking it out. Numbering continues from the highest this host still
 * has, as spawnBeside's clutches do (Group 348), so a deleted arm's number is
 * never reused while a later one exists. PURE, for the offline test.
 */
export function limbNameFor(limbName, hostName, names)
{
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${esc(limbName)} (\\d+) \\(${esc(hostName)}\\)$`);
  const taken = names.map(n => n.match(re)).filter(Boolean).map(m => Number(m[1]));
  return `${limbName} ${taken.length ? Math.max(...taken) + 1 : 1} (${hostName})`;
}

/**
 * A failed Graft save: spawn the limb, bind it to `host`, and make the
 * grafting creature pay. `limbName` is the Bestiary creature the save names.
 */
export async function graftLimb(host, poster, limbName, source)
{
  const limb = await spawnNamedCreature(limbName, { rename: limbNameFor(limbName, host.name, (game.actors ?? []).map(a => a.name)) });
  if(!limb)
  {
    ui.notifications?.warn(`${limbName} is not in the Bestiary compendium — rebuild the pack.`);
    return null;
  }
  await limb.setFlag(SCOPE, HOST_FLAG, host.id);
  await linkWoundToLimb(host, limb);
  let paid = "", death = null;
  if(poster)
  {
    const before = Number(poster.system?.level?.value ?? 0);
    const cost = graftCost(poster);
    // The death line FOLLOWS this card, which explains it - the Group 224
    // ordering, found again in Group 410.7. The hook stays silent and the
    // message is posted below, in the same words zero-max-hp.js would use.
    const dies = Number(poster.system?.health?.max ?? 0) > 0 && cost["system.health.max"] <= 0;
    if(dies) death = zeroMaxHpMessage(poster, GRAFT_DEATH_CAUSE);
    await poster.update(cost, dies ? { [MAX_HP_DEFERRED]: true } : {});
    paid = ` <b>${poster.name}</b> loses a limb: Level ${before} → ${before - 1}, max HP −${HP_PER_LEVEL}.`;
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: host }),
    content: `<b>${source}</b> grafts a limb onto <b>${host.name}</b> — <b>${limb.name}</b> has been created as an Actor; place it when you want it.`
      + ` It has ${host.name}'s AV and attacks anyone near them each round (d4). Damage dealt to it is shared with ${host.name}.${paid}`,
  });
  if(death) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: poster }), content: death });
  return limb;
}

/** Re-prepare every limb grafted to `host`, so its live AV follows. */
function refreshLimbs(host)
{
  if(!host?.id) return;
  for(const a of game.actors ?? [])
    if(creatureActorFlagsOf(a)[GRAFTED_FLAG] && a.flags[SCOPE][HOST_FLAG] === host.id)
    {
      a.reset();
      a.sheet?.rendered && a.sheet.render(false);
      for(const t of a.getActiveTokens?.() ?? []) t.renderFlags?.set?.({ refreshBars: true });
    }
}

/** The host's armour changes through its own data or its equipped Items. */
export function registerGraftedArm()
{
  Hooks.on("updateActor", actor => refreshLimbs(actor));
  for(const h of ["createItem", "updateItem", "deleteItem"])
    Hooks.on(h, item => { if(item.parent instanceof Actor) refreshLimbs(item.parent); });
  // The world's actors prepare in no fixed order, so a limb can prepare before
  // its host has; once everything is ready, prepare the limbs again.
  Hooks.once("ready", () => { for(const a of game.actors ?? []) if(creatureActorFlagsOf(a)[GRAFTED_FLAG]) a.reset(); });
}
