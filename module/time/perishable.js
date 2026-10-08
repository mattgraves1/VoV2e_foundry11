/**
 * Perishable Spoiling — foundry-system-index.csv "Perishable Spoiling".
 *
 * RULED 2026-09-24 (Matt), with Bloomboon Growth: a grown fruit is marked
 * spoiled during Start the day. Filed as its own mechanism so other food can
 * join it — Raw Meat, and Mycomorph Detritivore reading a spoiled Item as its
 * rotting meal, are recorded follow-ups on the row, not built here.
 *
 * A FLAG, NOT A NAME LIST: any Item carrying flags.vaarn.perishable spoils.
 * Everything unspoiled when Start the day runs was made on an earlier day,
 * since the button runs once a day, so no age comparison is needed.
 *
 * SPOILED SHOWS IN THE NAME ("Medicinal Fruit (spoiled)") so a player sees it
 * on the sheet and on any card that names it, not only in a flag.
 */
import { remainingItemFlagsOf } from "../item/remaining-effects.js";

const SCOPE = "vaarn";
export const PERISHABLE_FLAG = "perishable";

/** Whether this Item spoils. */
export function isPerishable(item)
{
  return !!remainingItemFlagsOf(item)[PERISHABLE_FLAG];
}

/** Whether this Item has spoiled. */
export function isSpoiled(item)
{
  return !!remainingItemFlagsOf(item)[PERISHABLE_FLAG]?.spoiled;
}

/**
 * Mark every unspoiled perishable Item on every Actor spoiled, and post one
 * card naming them. Returns [{actor, item}] names.
 */
export async function spoilPerishables()
{
  const spoiled = [];
  for (const actor of game.actors ?? [])
  {
    const due = actor.items.filter(i => isPerishable(i) && !isSpoiled(i));
    if (!due.length) continue;
    // The names are read BEFORE the rename: the update changes each Item in
    // place, and the card would otherwise say "(spoiled)" under "Spoiled".
    const names = due.map(i => i.name);
    await actor.updateEmbeddedDocuments("Item", due.map(i => ({
      _id: i.id,
      name: `${i.name} (spoiled)`,
      [`flags.${SCOPE}.${PERISHABLE_FLAG}.spoiled`]: true
    })));
    for (const name of names) spoiled.push({ actor: actor.name, item: name });
  }
  if (spoiled.length)
    await ChatMessage.create({
      content: `<p><b>Spoiled overnight:</b></p><ul>`
        + spoiled.map(s => `<li>${s.actor}: ${s.item}</li>`).join("") + `</ul>`
    });
  return spoiled;
}
