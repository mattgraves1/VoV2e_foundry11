/**
 * Item Corrosion on a Hit - foundry-system-index.csv "Item Corrosion on a
 * Hit", RULED 2026-09-24 (Matt).
 *
 * The book (Rustacean, JADE IBIS): "A hit from the Rustacean's claws corrodes a
 * metal item in the target's inventory, rendering it useless. Armour corroded
 * in this fashion loses -1 AV per hit. ... If there is debate about which item
 * should be corroded by a hit, flip a coin. On heads, the player chooses. On
 * tails, the Rustacean does."
 *
 * The rulings that shape this file:
 *
 *  - ONE CARD PER HIT, the coin folded in: "50% of the time it says player
 *    picks, 50% of the time GM picks". Rolled when the card posts.
 *  - ONLY THE GM HAS THE CONTROL: "they either pick themselves or select the
 *    one the player wants" - they adjudicate what is eligible.
 *  - NO METAL DATA EXISTS, so the list is every non-innate item the target
 *    carries ("functions relating to metal are piling up, we might revisit
 *    this sometime"). The Referee judges which are metal. SUPERSEDED
 *    2026-09-27 by the METAL paragraph below.
 *  - WHAT "USELESS" DOES: a weapon is marked broken, the state that already
 *    refuses its attack; anything else is renamed "(Corroded)", noted, and
 *    loses its use controls - "literally useless".
 *  - ARMOUR, worn or not, loses 1 from its OWN AV bonus, and nothing restores
 *    it (RULED 2026-09-24, Matt, after Group 374: "Maybe this damage should be
 *    dealt directly to the armour's base AV. I think it wouldn't be recoverable
 *    if we did it this way, which is probably fine"). First built onto the
 *    wearer's system.armor.damage, which an unworn suit has no claim on.
 *    Armour with no bonus left corrodes like gear.
 *  - A STACK loses one (RULED the same day: "It might be better to just
 *    subtract 1 from the stack"); the rest stay usable.
 *
 * METAL, 2026-09-27 (Metal Item Property Part B, RULED by Matt). The list is
 * now only METAL items - system.metal, never an installed implant - and never
 * a Laquered one, which "cannot rust or be corroded". Two more callers share
 * the card through `mode`:
 *  - "rust"   Blue Rust: "turns any metal into rust within moments". No coin -
 *             the book's coin is the Rustacean's - so the Referee chooses.
 *  - "devour" the Yurling: "it can choose to steal and devour a metal object
 *             from the target's inventory instead of dealing damage". No coin
 *             either (the Yurling chooses); the item is eaten, not corroded -
 *             one from a stack, else deleted - and Laquered is no defence,
 *             since nothing rusts. The card says not to roll this hit's damage.
 */
import { isMetalItem } from "../item/metal.js";
import { itemForbids } from "../item/weapon-tags.js";
import { statOf } from "../effects/item-stats.js";

const SCOPE = "vaarn";
export const CORROSION_CARD_FLAG = "corrosionCard";
export const CORRODED_FLAG = "corroded";

/** Item types a character carries rather than is - the list the card offers. */
const CARRIED_TYPES = ["item", "weaponMelee", "weaponRanged", "armor", "light", "exotica", "crucible", "codex"];

/**
 * Is this item one the card may offer? Carried, not innate, metal, not
 * already ruined - and, unless it is being eaten, not Laquered.
 */
export function corrodible(item, mode = "corrode")
{
  if (!CARRIED_TYPES.includes(item?.type)) return false;
  if (item.system?.intrinsic) return false;
  if (!isMetalItem(item)) return false;
  // From the sentences since Weapon Tags chunk 5a: Laquered and Indestructible
  // (ruling F) forbid corrosion.
  if (mode !== "devour" && itemForbids(item, "corrode")) return false;
  return !isCorroded(item);
}

/** Has a corrosion already made this item useless? */
export function isCorroded(item)
{
  return !!item?.flags?.[SCOPE]?.[CORRODED_FLAG];
}

/** Post the card for one hit. `token` is the Token placeable hit. */
export async function postCorrosionCard(attacker, item, token, mode = "corrode")
{
  const coin = mode === "corrode" ? await new Roll("1d2").evaluate({ async: true }) : null;
  const spec = {
    attackerName: attacker.name, itemName: item.name,
    targetUuid: token?.document?.uuid ?? null, targetName: token?.name ?? token?.actor?.name ?? "the target",
    mode, playerPicks: coin?.total === 1, chosen: null,
  };
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: attacker }),
    content: `<div class="vaarn-corrosion-card"></div>`,
    flags: { [SCOPE]: { [CORROSION_CARD_FLAG]: spec } },
  });
}

/** The card body, rebuilt from the flag on every render. */
export function corrosionCardHtml(spec, targetActor, isGM)
{
  const mode = spec.mode ?? "corrode";
  const head = mode === "devour"
    ? `<p><b>${spec.attackerName}</b> hit <b>${spec.targetName}</b> with its ${spec.itemName} and may steal and devour `
      + `a metal item they carry <b>instead of dealing damage</b>. If it does, do not roll this hit's damage.</p>`
    : mode === "rust"
    ? `<p><b>${spec.itemName}</b> — ${spec.attackerName} turns a metal item <b>${spec.targetName}</b> carries to rust, `
      + `rendering it useless. The Referee chooses.</p>`
    : `<p><b>Corrosion</b> — ${spec.attackerName}'s ${spec.itemName} hit <b>${spec.targetName}</b>: `
      + `a metal item they carry is corroded, rendering it useless.</p>`
      + `<p>Coin: <b>${spec.playerPicks ? `Heads — ${spec.targetName}'s player chooses` : "Tails — the Referee chooses"}</b>.</p>`;
  if (spec.chosen) return head + `<p>${spec.chosen.line}</p>`;
  if (!isGM) return head + `<p><i>The Referee picks the item.</i></p>`;
  const items = (targetActor?.items?.contents ?? []).filter(i => corrodible(i, mode));
  if (!items.length) return head + `<p><i>${spec.targetName} carries no metal that could ${mode === "devour" ? "be eaten" : "corrode"}.</i></p>`;
  const options = items.map(i => `<option value="${i.id}">${i.name}${Number(i.system.quantity) > 1 ? ` (×${i.system.quantity})` : ""}${i.type === "armor" && i.system.equipped ? " (worn)" : ""}</option>`).join("");
  return head + `<p><select class="vaarn-corrosion-item">${options}</select> `
    + `<button type="button" class="vaarn-corrosion-pick">${mode === "devour" ? "Devour it" : mode === "rust" ? "Rust it" : "Corrode it"}</button></p>`;
}

/** Corrode one item. Exported so it can be exercised without a click. */
export async function corrodeItem(message, itemId)
{
  const spec = message.getFlag(SCOPE, CORROSION_CARD_FLAG);
  if (!spec) return null;
  if (!game.user.isGM) { ui.notifications.warn("Only the Referee picks the corroded item."); return null; }
  if (spec.chosen) { ui.notifications.warn("This hit has already corroded an item."); return null; }
  const token = spec.targetUuid ? await fromUuid(spec.targetUuid) : null;
  const actor = token?.actor ?? null;
  const item = actor?.items?.get(itemId);
  if (!item) return null;

  // The name as it was: the gear branch renames the item, and the line must
  // not read "Glove (Corroded) is corroded" (Group 374).
  const name = item.name;
  let line;
  // The Yurling EATS it: one from a stack, else the whole item. No broken or
  // corroded state - it is gone.
  if ((spec.mode ?? "corrode") === "devour")
  {
    const n = Number(item.system?.quantity ?? 1);
    if (n > 1) await item.update({ "system.quantity": n - 1 });
    else await item.delete();
    line = `${spec.attackerName} devours ${n > 1 ? "one of " : ""}<b>${actor.name}</b>'s <b>${name}</b>`
      + `${n > 1 ? ` (${n - 1} left)` : ""} — no damage from this hit.`;
    await message.setFlag(SCOPE, CORROSION_CARD_FLAG, { ...spec, chosen: { itemId, line } });
    return line;
  }
  // The EFFECTIVE AV, whatever sets it (Stats as Sentences chunk 2b, ruling B):
  // the field is written one lower - below 0 if a sentence carries the AV - so a
  // +N sentence stacks on the corroded base. Repair is the Referee's edit of it.
  const bonus = Number(statOf(item, "av") ?? 0);
  const qty = Number(item.system?.quantity ?? 1);
  if (item.type === "armor" && bonus > 0)
  {
    await item.update({ "system.avBonus": Number(item.system?.avBonus ?? 0) - 1 });
    line = `<b>${actor.name}</b>'s <b>${name}</b> is corroded — its AV bonus drops from +${bonus} to +${bonus - 1}, for good.`;
  }
  else if (qty > 1)
  {
    await item.update({ "system.quantity": qty - 1 });
    line = `One of <b>${actor.name}</b>'s <b>${name}</b> is corroded — useless, and gone from the stack (${qty - 1} left).`;
  }
  else if (item.type === "weaponMelee" || item.type === "weaponRanged")
  {
    await item.update({ "system.broken": true, [`flags.${SCOPE}.${CORRODED_FLAG}`]: true });
    line = `<b>${actor.name}</b>'s <b>${name}</b> is corroded — <b>broken</b>, useless until repaired.`;
  }
  else
  {
    await item.update({
      name: `${item.name} (Corroded)`,
      "system.description": `${item.system.description ?? ""}<p><b>Corroded</b> by ${spec.attackerName}'s ${spec.itemName} — useless.</p>`,
      [`flags.${SCOPE}.${CORRODED_FLAG}`]: true,
    });
    line = `<b>${actor.name}</b>'s <b>${name}</b> is corroded — <b>useless</b>.`;
  }
  await message.setFlag(SCOPE, CORROSION_CARD_FLAG, { ...spec, chosen: { itemId, line } });
  return line;
}

export function registerCorrosionCardButtons()
{
  Hooks.on("renderChatMessage", async (message, html) =>
  {
    const spec = message.getFlag(SCOPE, CORROSION_CARD_FLAG);
    if (!spec) return;
    const token = spec.targetUuid && !spec.chosen && game.user.isGM ? await fromUuid(spec.targetUuid) : null;
    html.find(".vaarn-corrosion-card").html(corrosionCardHtml(spec, token?.actor ?? null, game.user.isGM));
    html.find(".vaarn-corrosion-pick").click(() => corrodeItem(message, html.find(".vaarn-corrosion-item").val()));
  });
}
