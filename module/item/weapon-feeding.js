/**
 * Feeding a weapon at a rest - Effect Engine: Weapon Tags chunk 5c
 * (foundry-system-index.csv "Effect Engine: Weapon Tags", RULED 2026-10-05 by
 * Matt). Fungal: "Regains an Ammo die step when fed organic matter."
 *
 * After a Short or Long Rest, each carried weapon whose sentences say it can
 * be fed (an on-rest refill of its ammo) and whose ammo die is not full gets a
 * card: "Feed it" spends one organic food ration - the plain Food Ration
 * first, then anything else that works as food (rest.js RATION_GROUPS), as
 * eating does - and steps the die up one, never past its maximum. Once per
 * card, so once per rest. A card and not an automatic spend: whether to give
 * up a ration is the player's choice (the honour system over enforcement).
 *
 * rest.js calls offerWeaponFeeding and this file reaches back into rest.js for
 * the ration helpers by dynamic import, so neither import closes a cycle.
 */
import { restFeedOf } from "./weapon-tags.js";
import { upgradeDie } from "./usage-die.js";
import { usageDieOf } from "../effects/item-stats.js";

const SCOPE = "vaarn";
export const FEED_FLAG = "weaponFeed";

/** The die one step up from `die`, capped at `max`; Expended comes back as the smallest die. */
export function fedDie(die, max = "d20", steps = 1)
{
  if (die === "expended") return steps > 1 ? upgradeDie("d4", steps - 1, max) : "d4";
  return upgradeDie(die, steps, max);
}

/** Is this weapon's ammo die below its maximum? */
function hungry(item)
{
  const ud = usageDieOf(item);
  return !!ud.die && !!ud.max && ud.die !== ud.max;
}

/** Post a feeding card for each carried weapon that can be fed and is not full. */
export async function offerWeaponFeeding(actor)
{
  const { FOOD_RATION, rationKinds, supplyTotal } = await import("../actor/rest.js");
  for (const item of actor?.items ?? [])
  {
    if (item.type !== "weaponMelee" && item.type !== "weaponRanged") continue;
    const feed = restFeedOf(item);
    if (!feed || !hungry(item)) continue;
    const food = supplyTotal(actor, FOOD_RATION, rationKinds(FOOD_RATION));
    const ud = usageDieOf(item);
    const next = fedDie(ud.die, ud.max, Number(feed.do.steps ?? 1));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><b>${item.name}</b> can be fed organic matter: one food ration steps its ammo die up `
        + `(<b>${ud.die}</b> to <b>${next}</b>, at most ${ud.max}). `
        + `${actor.name} carries ${food} food ration${food === 1 ? "" : "s"}.</p>`
        + `<p><button type="button" class="vaarn-feed-weapon">Feed it</button></p>`,
      flags: { [SCOPE]: { [FEED_FLAG]: { actorUuid: actor.uuid, itemId: item.id, applied: false } } }
    });
  }
}

/** Feed the weapon on a card. Exported so a test can press it without a click. */
export async function feedFromCard(message)
{
  const spec = message.getFlag(SCOPE, FEED_FLAG);
  if (!spec || spec.applied) return null;
  const actor = await fromUuid(spec.actorUuid);
  const item = actor?.items.get(spec.itemId);
  if (!actor || !item) { ui.notifications.warn("That weapon is no longer carried."); return null; }
  if (!actor.isOwner) { ui.notifications.warn(`Only ${actor.name}'s player or the Referee can feed it.`); return null; }
  const { FOOD_RATION, rationKinds, spendSupply } = await import("../actor/rest.js");
  const spent = await spendSupply(actor, FOOD_RATION, rationKinds(FOOD_RATION));
  if (!spent)
  {
    ui.notifications.warn(`${actor.name} has no food to feed the ${item.name}.`);
    return null;
  }
  await message.setFlag(SCOPE, FEED_FLAG, { ...spec, applied: true });
  const before = usageDieOf(item).die;
  const after = fedDie(before, usageDieOf(item).max, Number(restFeedOf(item)?.do?.steps ?? 1));
  await item.update({ "system.usageDie.die": after });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
    content: `<b>${actor.name}</b> feeds the <b>${item.name}</b> one ${spent} — its ammo die steps up from <b>${before}</b> to <b>${after}</b>.` });
  return after;
}

/** Called from knave.js at init. */
export function registerWeaponFeeding()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, FEED_FLAG);
    if (!spec) return;
    if (spec.applied) { html.find(".vaarn-feed-weapon").prop("disabled", true); return; }
    html.find(".vaarn-feed-weapon").click(async ev =>
    {
      ev.currentTarget.disabled = true;
      await feedFromCard(message);
    });
  });
}
