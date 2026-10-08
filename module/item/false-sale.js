/**
 * SELLING A FALSE GOOD — foundry-system-index.csv "Timed Condition Duration",
 * Trade Good Qualities / False. RULED 2026-09-24 (Matt).
 *
 * The book: "False (trader discovers deception in d4 days)". The clock starts
 * at a trade, and this system models no trade - a merchant is rarely an actor,
 * so an Item Transfer cannot be the trigger. So the Referee says when it
 * happened: a GM-only Sold control on the good's own sheet, beside the quality
 * readout that already names it False.
 *
 * Sold rolls the d4 and starts a gmOnly board row on the seller. gmOnly, not
 * an ordinary pc-origin row: the player chose to sell, but the deception being
 * found out is the Referee's to reveal, and a pc-origin row would show every
 * player the countdown. The roll is whispered for the same reason, and so is
 * the row's end (announceExpired).
 *
 * PART OF A STACK (Matt, same day). Sold asks first: how many are sold, when
 * the stack holds more than one, and a free-text note for the buyer or
 * anything else. The stack drops by that many; the Item goes only when all of
 * it is sold. The note is typed once and rides the card, the row and the Ended
 * card, which is where "who bought it?" gets asked. The card names NO
 * quantity - a Referee who wants one writes it in the note - so the good's
 * leading count is dropped there too: a generated good is named "4 Poetry
 * Scrolls", and the 4 is not the number sold.
 */
import { qualityOf } from "./trade-good-quality.js";
import { qualitySpanOf } from "./remaining-effects.js";
import { addEntry, expiryFor } from "../time/effect-board.js";

/** The span a sale starts, or null when this Item has none to start. */
export function saleSpanOf(item)
{
  // From the quality's sentence since Remaining Sources chunk 2c-ii (2026-10-07).
  const span = qualitySpanOf(item);
  if(!span) return null;
  if(!(item?.parent instanceof Actor)) return null;
  return span;
}

/** "4 Poetry Scrolls" -> "Poetry Scrolls". A name with no leading count is kept. */
export function goodNameOf(name)
{
  const stripped = String(name ?? "").replace(/^\d+(?:\.\d+)?\s+/, "");
  return stripped || String(name ?? "");
}

function escapeText(s)
{
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

/** Ask how many and for a note, then sell. */
export async function openSaleDialog(item)
{
  if(!game.user.isGM || !saleSpanOf(item)) return null;
  const have = Math.max(1, Math.floor(Number(item.system?.quantity ?? 1)) || 1);
  const qtyField = have > 1
    ? `<div class="form-group"><label>How many sold (of ${have})</label>
         <input type="number" name="quantity" min="1" max="${have}" step="1" value="${have}"></div>`
    : "";
  const content = `<form>${qtyField}
    <div class="form-group"><label>Note</label>
      <input type="text" name="note" placeholder="The buyer, or anything else"></div>
    <p class="notes">Only the Referee sees the card, the row and its end. The note cannot be changed afterwards.</p>
  </form>`;
  return new Promise(resolve => new Dialog({
    title: `Sell ${goodNameOf(item.name)}`,
    content,
    buttons: {
      sell: { label: "Sold", callback: async html =>
        resolve(await sellFalseGood(item, {
          quantity: have > 1 ? Number(html.find('[name="quantity"]').val()) : 1,
          note: String(html.find('[name="note"]').val() ?? "").trim()
        })) },
      cancel: { label: "Cancel", callback: () => resolve(null) }
    },
    default: "sell",
    close: () => resolve(null)
  }).render(true));
}

/** Sell `quantity` of it. Returns the board entry, or null if refused. */
export async function sellFalseGood(item, { quantity = null, note = "" } = {})
{
  if(!game.user.isGM) return null;
  const span = saleSpanOf(item);
  if(!span) return null;
  const actor = item.parent;
  const quality = qualityOf(item);
  const have = Math.max(1, Math.floor(Number(item.system?.quantity ?? 1)) || 1);
  const sold = Math.max(1, Math.min(have, Math.floor(Number(quantity ?? have)) || have));

  const roll = await new Roll(span.amount).evaluate({ async: true });
  const n = roll.total;
  const now = game.time?.worldTime ?? 0;
  const stamps = expiryFor({ amount: n, unit: span.unit, now });
  const good = goodNameOf(item.name);
  const days = `${n} day${n === 1 ? "" : "s"}`;

  // The row first, the stack second: a crash between them leaves a good the
  // Referee can adjust by hand, never a sale nobody is timing.
  const entry = await addEntry(actor, {
    name: `${good} (${quality.name})`,
    text: `Sold ${good}. The trader discovers the deception.`,
    note,
    gmOnly: true,
    startTime: now,
    ...stamps
  });

  await ChatMessage.create({
    content: `<p><b>${actor.name}</b> sells <b>${good}</b> — ${quality.name}. `
      + `The trader discovers the deception in <b>${days}</b> (${span.amount} → ${n}). `
      + `The board counts it down.</p>`
      + (note ? `<p><i>${escapeText(note)}</i></p>` : ""),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    rolls: [roll]
  });

  // A trade good's weight reads flags.vaarn.units (item-slots.js), not
  // quantity, so the two are lowered together (Matt, 2026-09-24).
  // Proportional rather than lot x sold: a Shells find is not whole lots.
  if(sold >= have) await item.delete();
  else
  {
    const left = have - sold;
    const units = Number(item.flags?.vaarn?.units);
    const update = { "system.quantity": left };
    if(Number.isFinite(units)) update["flags.vaarn.units"] = Math.round(units * left / have);
    await item.update(update);
  }
  return entry;
}
