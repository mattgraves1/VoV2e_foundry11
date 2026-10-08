/**
 * The effect card - Effect Engine: Interpreter and Mystic Gifts, chunk 1
 * (foundry-system-index.csv "Effect Engine: Interpreter and Mystic Gifts",
 * BUILD PLAN RULED 2026-10-05 by Matt).
 *
 * The card a damage or heal sentence posts in card mode: the rolled figure,
 * the targets captured at the use, and one button per option. It is the Mystic
 * Gift card (combat/gift-damage.js, RULED 2026-09-26) made general, keeping
 * every rule that card had:
 *
 *  - posted only when tokens were targeted at the use;
 *  - ONCE PER CARD, recorded on the message, so an F5 cannot apply it twice;
 *  - pressed by the owner of the effect's source or the Referee (engine
 *    ruling A, 2026-10-04: the owner of the source applies the result);
 *  - damage runs the whole pipeline (dealDamage) with the user as the source,
 *    so a target that rebounds the damage's property (Psychic Mirror) throws
 *    it back there, as every other rebound does;
 *  - healing runs the one heal path, skipping the user when the source's rules
 *    say it cannot heal its user (a Gift).
 *
 * Old Gift cards already in a world's chat carry gift-damage.js's own flag and
 * are still handled there.
 */
import { dealDamage } from "./deal.js";
import { applyHeal } from "../actor/healing-field.js";

const SCOPE = "vaarn";
export const EFFECT_CARD_FLAG = "effectCard";

/**
 * Post the card. `options`: [{ verb: "damage"|"heal", amount, min, types,
 * label }]. `targets` are Token placeables. Returns the message, or null.
 */
export async function postEffectCard(actor, item, { label = "", options = [], targets = [], healsUser = true } = {})
{
  if (!targets?.length || !options.length) return null;
  const spec = {
    actorUuid: actor.uuid, itemId: item.id, itemName: item.name, label,
    options: options.map(o => ({ verb: o.verb, amount: Math.max(0, o.amount), min: Math.max(0, o.min ?? o.amount),
                                 types: o.types ?? null, label: o.label ?? "" })),
    targets: targets.map(t => ({ uuid: t.document?.uuid ?? t.actor?.uuid ?? t.uuid, name: t.name ?? t.actor?.name })),
    healsUser, applied: null
  };
  const names = spec.targets.map(t => `<b>${t.name}</b>`).join(", ");
  const amounts = new Set(spec.options.map(o => o.amount));
  const one = amounts.size === 1;
  const buttons = spec.options.map((o, i) =>
  {
    const typed = (o.types ?? []).filter(t => t !== "gift").join(" ");
    const what = o.verb === "heal" ? "healing" : `${typed ? typed + " " : ""}damage`;
    return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply ${one ? "" : o.amount + " "}as ${what}</button>`;
  });
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><b>${item.name}</b>${label ? ` (${label})` : ""} — ${one ? spec.options[0].amount + " " : ""}to ${names}.</p>`
      + `<p>${buttons.join(" ")}</p>`,
    flags: { [SCOPE]: { [EFFECT_CARD_FLAG]: spec } }
  });
}

/** A target's Actor from its stored uuid - a TokenDocument or an Actor. */
async function actorOf(uuid)
{
  const doc = uuid ? await fromUuid(uuid) : null;
  return doc?.actor ?? doc ?? null;
}

/** Apply one option of the card. Exported so a test can press it without a click. */
export async function applyEffectCard(message, index)
{
  const spec = message.getFlag(SCOPE, EFFECT_CARD_FLAG);
  const option = spec?.options?.[index];
  if (!option) return null;
  const user = await fromUuid(spec.actorUuid);
  if (!user) { ui.notifications.warn("That character no longer exists."); return null; }
  if (!user.isOwner) { ui.notifications.warn(`Only ${user.name}'s player or the Referee can apply ${spec.itemName}.`); return null; }
  if (spec.applied !== null && spec.applied !== undefined) { ui.notifications.warn(`${spec.itemName} has already been applied.`); return null; }

  await message.setFlag(SCOPE, EFFECT_CARD_FLAG, { ...spec, applied: index });
  const item = user.items.get(spec.itemId) ?? { name: spec.itemName, id: null, system: {}, flags: {} };
  const targets = (await Promise.all(spec.targets.map(t => actorOf(t.uuid)))).filter(Boolean);
  const speaker = ChatMessage.getSpeaker({ actor: user });

  if (option.verb === "heal")
  {
    const lines = [];
    for (const target of targets)
    {
      if (!spec.healsUser && target.uuid === user.uuid)
      {
        lines.push(`<b>${target.name}</b> — Gifts cannot heal their user's HP.`);
        continue;
      }
      const line = await applyHeal(target, option.amount, `<b>${spec.itemName}</b>`);
      if (line) lines.push(`<b>${target.name}</b> ${line}`);
    }
    if (lines.length) await ChatMessage.create({ speaker, content: `<b>${spec.itemName}</b> heals:<br>${lines.join("<br>")}` });
    return lines;
  }

  // Untyped damage passes no Item: the pipeline would read an Item with no
  // damage types as kinetic, and damage the source gave no type is not.
  for (const target of targets)
    dealDamage(target, option.amount, { source: user, item: option.types ? item : null, types: option.types,
                                        min: option.min, name: spec.itemName });
  return targets.length;
}

export function registerEffectCardButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, EFFECT_CARD_FLAG);
    if (!spec) return;
    // The flag, not the DOM, says whether it has been used - a re-render or
    // an F5 would otherwise bring the buttons back live.
    if (spec.applied !== null && spec.applied !== undefined)
    {
      html.find(".vaarn-effect-apply").prop("disabled", true);
      return;
    }
    html.find(".vaarn-effect-apply").click(async ev =>
    {
      html.find(".vaarn-effect-apply").prop("disabled", true);
      await applyEffectCard(message, Number(ev.currentTarget.dataset.option));
    });
  });
}
