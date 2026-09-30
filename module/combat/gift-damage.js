/**
 * Mystic Gift Damage to a Target - foundry-system-index.csv row of that name,
 * RULED 2026-09-26 (Matt).
 *
 * The book (Mystic Gifts): "Gifts always hit in combat, and roll damage dice
 * of the same size the user paid in HP, adding the user's PSY bonus ... the
 * same ratio applies if trying to heal an ally using a Gift." And: "Gifts
 * cannot heal their user's HP."
 *
 * Using a Gift already paid the cost and rolled the effect (actor-sheet.js
 * _resolveGiftUse). This file is what happens to that number:
 *
 *  - A CARD WITH TWO BUTTONS, posted only when tokens were targeted at the
 *    cast. Most Gifts deal no damage at all - they are freeform - so the table
 *    decides by clicking, never automatically. The targets are the ones
 *    targeted AT THE CAST: the HP cost was chosen by their Level.
 *  - APPLY AS DAMAGE runs the weapon damage path (_doDamage) on every target
 *    with one component of the `gift` property and nothing else. TYPELESS
 *    (ruled): the book gives a Gift no damage type, and a Gift must not read
 *    as kinetic.
 *  - APPLY AS HEALING runs the shared heal rules (applyHeal) on every target
 *    but the caster, who is named and skipped.
 *  - PSYCHIC MIRROR REBOUNDS AUTOMATICALLY (ruled): a target that rebounds
 *    Gifts takes nothing, and the same figure is dealt to the caster. Healing
 *    is not adverse and is not rebounded.
 *  - ONCE PER CARD, recorded on the message, so an F5 cannot apply it twice.
 *    The caster's player or the Referee may press it - whoever could spend
 *    that character's HP anywhere else.
 */
import { applyHeal } from "../actor/healing-field.js";
import { reboundsAttack } from "../item/attack-properties.js";

const SCOPE = "vaarn";
export const GIFT_CARD_FLAG = "giftApply";

/**
 * Post the card after a cast. `targets` are Token placeables. Returns the message, or null.
 *
 * Mystic Gift Effect Modelling (RULED 2026-09-29, Matt): a Gift used for a
 * DEFINED effect passes `modes` - only its own button - and, for damage, a
 * `damageType`. Typed Gift damage carries BOTH its type and `gift`, so fire
 * resistance and the Gift immunities and Psychic Mirror all still read it; a
 * freeform use is unchanged, typeless and offering both buttons.
 */
export async function postGiftApplyCard(actor, item, amount, min, targets, { modes = ["damage", "heal"], damageType = null, label = "" } = {})
{
  if (!targets?.length) return null;
  const spec = {
    actorUuid: actor.uuid, itemId: item.id, itemName: item.name,
    amount: Math.max(0, amount), min: Math.max(0, min),
    targets: targets.map(t => ({ uuid: t.document?.uuid ?? t.actor?.uuid, name: t.name ?? t.actor?.name })),
    damageType, applied: null,
  };
  const names = spec.targets.map(t => `<b>${t.name}</b>`).join(", ");
  const typed = damageType ? ` ${damageType}` : "";
  const buttons = [];
  if (modes.includes("damage")) buttons.push(`<button type="button" class="vaarn-gift-apply" data-mode="damage">Apply as${typed} damage</button>`);
  if (modes.includes("heal")) buttons.push(`<button type="button" class="vaarn-gift-apply" data-mode="heal">Apply as healing</button>`);
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><b>${item.name}</b>${label ? ` (${label})` : ""} — ${spec.amount} to ${names}.</p>`
      + `<p>${buttons.join(" ")}</p>`,
    flags: { [SCOPE]: { [GIFT_CARD_FLAG]: spec } },
  });
}

/** A target's Actor from its stored uuid - a TokenDocument or an Actor. */
async function actorOf(uuid)
{
  const doc = uuid ? await fromUuid(uuid) : null;
  return doc?.actor ?? doc ?? null;
}

/** Apply the card. Exported so it can be exercised without a click. */
export async function applyGiftCard(message, mode)
{
  const spec = message.getFlag(SCOPE, GIFT_CARD_FLAG);
  if (!spec) return null;
  const caster = await fromUuid(spec.actorUuid);
  if (!caster) { ui.notifications.warn("That character no longer exists."); return null; }
  if (!caster.isOwner) { ui.notifications.warn(`Only ${caster.name}'s player or the Referee can apply this Gift.`); return null; }
  if (spec.applied) { ui.notifications.warn(`${spec.itemName} has already been applied.`); return null; }

  await message.setFlag(SCOPE, GIFT_CARD_FLAG, { ...spec, applied: mode });
  const item = caster.items.get(spec.itemId) ?? { name: spec.itemName, system: {}, flags: {} };
  const targets = (await Promise.all(spec.targets.map(t => actorOf(t.uuid)))).filter(Boolean);
  const speaker = ChatMessage.getSpeaker({ actor: caster });

  if (mode === "heal")
  {
    const lines = [];
    for (const target of targets)
    {
      if (target.uuid === caster.uuid)
      {
        lines.push(`<b>${target.name}</b> — Gifts cannot heal their user's HP.`);
        continue;
      }
      const line = await applyHeal(target, spec.amount, `<b>${spec.itemName}</b>`);
      if (line) lines.push(`<b>${target.name}</b> ${line}`);
    }
    if (lines.length) await ChatMessage.create({ speaker, content: `<b>${spec.itemName}</b> heals:<br>${lines.join("<br>")}` });
    return lines;
  }

  const types = spec.damageType ? ["gift", spec.damageType] : ["gift"];
  const component = () => [{ amount: spec.amount, min: spec.min, name: spec.itemName, types: [...types] }];
  for (const target of targets)
  {
    const mirror = reboundsAttack(target, "gift");
    if (mirror)
    {
      await ChatMessage.create({ speaker,
        content: `<b>${target.name}</b> is untouched — <b>${mirror.rule}</b>: <b>${spec.itemName}</b> rebounds on <b>${caster.name}</b>.` });
      caster.sheet._doDamage({ actor: caster }, spec.amount, false, item, 1, component());
      continue;
    }
    caster.sheet._doDamage({ actor: target }, spec.amount, false, item, 1, component());
  }
  return targets.length;
}

export function registerGiftApplyButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, GIFT_CARD_FLAG);
    if (!spec) return;
    // The flag, not the DOM, says whether it has been used - a re-render or an
    // F5 would otherwise bring both buttons back live.
    if (spec.applied)
    {
      html.find(".vaarn-gift-apply").prop("disabled", true);
      return;
    }
    html.find(".vaarn-gift-apply").click(async ev =>
    {
      ev.currentTarget.disabled = true;
      await applyGiftCard(message, ev.currentTarget.dataset.mode);
    });
  });
}
