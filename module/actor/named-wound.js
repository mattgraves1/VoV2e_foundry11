/**
 * Named Special Wounds — foundry-system-index.csv "Wound-Table Resolution",
 * RULED 2026-09-25 (Matt).
 *
 * WHAT THE BOOK DOES. Beside the two d20 Wounds tables it names wounds of its
 * own: "a Wound: 'Grimpet'", "a Wound: Deafened", Amaranthine Venom ("a
 * special Wound"), "a Wound: Severed Limb (3 Slots, -10 STR, -10 DEX)", the
 * Gitch's "Wound: Gitch Crystals". None of them is a table row, so _applyWound
 * could not reach them, and the Gitch's crystals had been made as a bare slot
 * Item that never reached the Wounds tab.
 *
 * THE RULING. One path puts a named wound where a table wound goes: an entry
 * on system.wounds (the Wounds tab, the Heal button, the Long Rest picker,
 * wound-slot death) AND the paired slot Item. The roster is NAMED_WOUNDS in
 * wounds-data.js; the Gitch's spec is its own producesWound.
 *
 * WOUND-SLOT DEATH LIVES HERE NOW, moved out of the sheet so a wound applied
 * from a save card or the recurrence card is checked the same way. It counts
 * WOUNDS only: a pack full of gear is shown over capacity and the player drops
 * things (Matt: "give the player the option to discard something rather than
 * immediately kill or transform them"). When wounds do fill every slot and any
 * of them is a wound whose affliction turns the holder into a creature - Gitch
 * Crystals, the Gitchghast - the Referee's transform button is posted INSTEAD
 * of death.
 */
import { NAMED_WOUNDS } from "./wounds-data.js";
import { setDeprived, deprivedEntry } from "./deprived.js";
import { suppressesDeath, suppressionMsg } from "../combat/fatality.js";

const SCOPE = "vaarn";
export const NAMED_WOUND_FLAG = "namedWound";

function post(actor, content)
{
  return ChatMessage.create({ user: game.user?._id, speaker: ChatMessage.getSpeaker({ actor }), content });
}

/** A roster key or a spec object, resolved to a spec with its key. */
export function namedWoundSpec(ref)
{
  if (!ref) return null;
  if (typeof ref === "object") return ref;
  const spec = NAMED_WOUNDS[ref];
  return spec ? { key: ref, ...spec } : null;
}

/** The wound Items this actor holds under a named-wound key. */
export function heldNamedWounds(actor, key)
{
  return (actor?.items ?? []).filter(i => i.type === "wound" && i.flags?.[SCOPE]?.[NAMED_WOUND_FLAG]?.key === key);
}

/** Why rest will not heal this system.wounds entry, or null. */
export function restProofReason(wound)
{
  if (wound?.restProof) return wound.restProof;
  // REST-PROOF WHILE ITS LIMB EXISTS - Wound: Grafted Arm, RULED 2026-09-26
  // (Matt): healable once the arm Actor no longer exists, "a more flexible way
  // to model it" - the Referee deletes the arm when it is killed, cut off or
  // otherwise gone, and a dead arm left on the table still holds the wound.
  // grafted-arm.js links each wound to its own limb.
  if (wound?.limbActorId && game.actors?.get(wound.limbActorId))
    return wound.limbProof || "its limb is still attached";
  return null;
}

/**
 * Apply a named wound to `actor`. `ref` is a NAMED_WOUNDS key or a spec.
 * Returns the created Item, or null when nothing was created.
 *
 * NPCs AND MONSTERS DO NOT SUFFER WOUNDS (JADE IBIS p.30), so a creature gets
 * a line saying so - except a wound that sets HP to 0, which a creature takes
 * as damage to 0, and dies of, through the normal HP pipeline.
 */
export async function applyNamedWound(actor, ref, { source = null, check = true } = {})
{
  const spec = namedWoundSpec(ref);
  if (!actor || !spec) return null;
  // A wound that reaches only some creature types - the Flabmonger's bite on
  // a Biological. Anyone else gets nothing and no line (Matt: don't telegraph).
  if (spec.onlyTypes?.length && !spec.onlyTypes.some(t => actor.system?.creatureTypes?.[t])) return null;
  const from = source ? ` from <b>${source}</b>` : "";

  if (actor.type !== "character")
  {
    if (spec.zeroHp)
    {
      const hp = Number(actor.system?.health?.value ?? 0);
      if (hp > 0) await actor.sheet?._resolveHPChange(actor, hp, 0, { toZero: true });
      return null;
    }
    await post(actor, `would take <b>Wound: ${spec.name}</b>${from} — creatures do not suffer Wounds.`);
    return null;
  }

  // "A second dose is always lethal."
  if (spec.secondDoseLethal && heldNamedWounds(actor, spec.key).length)
  {
    await post(actor, suppressesDeath(actor)
      ? suppressionMsg(`a second dose of <b>${spec.name}</b>`)
      : `is <b>dead</b> — a second dose of <b>${spec.name}</b>${from} is always lethal.`);
    return null;
  }

  // "Filling more than ten slots with Flab is fatal": holding the limit
  // already, the next one kills.
  if (spec.lethalAbove && heldNamedWounds(actor, spec.key).length >= spec.lethalAbove)
  {
    await post(actor, suppressesDeath(actor)
      ? suppressionMsg(`more than ${spec.lethalAbove} slots of <b>${spec.name}</b>`)
      : `is <b>dead</b> — more than ${spec.lethalAbove} slots filled with <b>${spec.name}</b>${from}.`);
    return null;
  }
  const slots = Math.max(1, Number(spec.slots) || 1);
  const abilities = duplicate(actor.system.abilities);
  const lines = [`gains <b>Wound: ${spec.name}</b> (${slots} slot${slots === 1 ? "" : "s"})${from} — ${spec.effect ?? ""}`];

  for (const [key, amount] of Object.entries(spec.abilityFlat ?? {}))
  {
    abilities[key].woundDamage += amount;
    lines.push(`${key.toUpperCase()} wound damage +${amount} (total ${abilities[key].woundDamage}, effective bonus now ${abilities[key].value - abilities[key].woundDamage})`);
  }

  // Deprived "until the Wound is cured": clear it on healing only if THIS
  // wound switched it on, so a character already Deprived by thirst stays so.
  const clearsDeprived = !!spec.deprived && !deprivedEntry(actor);

  const marker = { key: spec.key ?? null,
                   ...(spec.restProof ? { restProof: spec.restProof } : {}),
                   ...(spec.alwaysSurprised ? { alwaysSurprised: true } : {}),
                   ...(spec.becomes ? { becomes: spec.becomes } : {}) };
  const cls = getDocumentClass("Item");
  const item = await cls.create({
    name: `${spec.name} (Wound x${slots})`,
    type: "wound",
    system: { slots, description: spec.effect ?? "", hp: 0, deathsDoor: false },
    flags: { [SCOPE]: { [NAMED_WOUND_FLAG]: marker,
                        ...(spec.conditions?.length ? { conditions: [...spec.conditions] } : {}) } }
  }, { parent: actor });

  const wounds = duplicate(actor.system.wounds ?? []);
  wounds.push({ hp: null, name: spec.name, slots, effect: spec.effect ?? "", deathsDoor: false,
                itemId: item?.id ?? null, named: spec.key ?? spec.name,
                ...(spec.restProof ? { restProof: spec.restProof } : {}),
                ...(clearsDeprived ? { clearsDeprived: true } : {}),
                ...(spec.becomes ? { becomes: spec.becomes } : {}),
                ...(spec.tally ? { tally: { count: spec.tally.count, label: spec.tally.label, done: 0 } } : {}) });

  const update = { "system.wounds": wounds, "system.abilities": abilities };
  if (spec.zeroHp)
  {
    update["system.health.value"] = 0;
    lines.push("HP set to 0.");
  }
  await actor.update(update);
  if (spec.deprived && clearsDeprived)
  {
    await setDeprived(actor, true);
    lines.push("Deprived until this Wound is cured.");
  }
  await post(actor, lines.join("<br>"));
  // The recurrence that clears it - Deathblight's day, Flab's week - started
  // on the holder unless one is already running.
  if (spec.recurrence && !(actor.getFlag(SCOPE, "effects") ?? []).some(e => e.kind === "recurrence" && e.recurrenceKey === spec.recurrence))
  {
    const { startRecurrence } = await import("../time/recurrence.js");
    await startRecurrence(actor, { recurrenceKey: spec.recurrence });
  }
  if (check) await checkWoundDeath(actor);
  return item;
}

/**
 * Drop the system.wounds entries paired with these Item ids. For a caller that
 * deletes wound Items itself - debridement, a fading wound - so the Wounds tab
 * does not keep an entry for an Item that is gone.
 */
export async function forgetWoundItems(actor, itemIds)
{
  const ids = new Set(itemIds ?? []);
  const wounds = actor?.system?.wounds ?? [];
  const kept = wounds.filter(w => !ids.has(w.itemId));
  if (kept.length !== wounds.length) await actor.update({ "system.wounds": kept });
}

/**
 * Wound-slot death and ability-floor death - Fatality Suppression surfaces 4
 * and 5. Moved from the sheet's _checkWoundDeath (2026-09-25), which now
 * delegates here.
 */
export async function checkWoundDeath(actor)
{
  // Neither death is damage, and Matt's "prevents ANYTHING from being fatal"
  // covers both. The cause is still named rather than swallowed.
  const suppressed = suppressesDeath(actor);
  const wounds = actor.system.wounds ?? [];

  const totalWoundSlots = wounds.reduce((sum, w) => sum + (Number(w.slots) || 0), 0);
  if (totalWoundSlots >= actor.system.inventorySlots.value)
  {
    // A wound that turns its holder into a creature when the slots fill:
    // that INSTEAD of death (Matt, 2026-09-25).
    const becomes = wounds.find(w => w.becomes)?.becomes;
    if (becomes)
      return post(actor, `<b>Every item slot is filled with Wounds</b> — `
        + `<button type="button" class="vaarn-recur-becomes" data-actor-id="${actor.id}" data-creature="${becomes}">`
        + `${actor.name} becomes a ${becomes}</button>`);
    return post(actor, suppressed
      ? suppressionMsg("no item slots remain to hold further Wounds")
      : "is <b>dead</b> — no item slots remain to hold further Wounds.");
  }

  for (const [key, ability] of Object.entries(actor.system.abilities))
  {
    if ((ability.value - ability.woundDamage) < -10)
      return post(actor, suppressed
        ? suppressionMsg(`${key.toUpperCase()} bonus fell below -10`)
        : `is <b>dead</b> — ${key.toUpperCase()} bonus fell below -10.`);
  }
}
