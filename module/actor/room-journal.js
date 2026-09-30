/**
 * Room Contents Written to a Journal (foundry-system-index.csv row of that
 * name, RULED 2026-09-27 by Matt).
 *
 * A vault prepared in advance needs each room's contents somewhere the Referee
 * can find at the table, and a whispered chat card is not that place. So
 * Generate Room Contents can also write the room as a PAGE of a journal named
 * for the vault: one journal per vault, one page per room. The rulings:
 *
 * - The vault journal is found by name, or created when there is none. A blank
 *   name writes nothing, and the macro behaves as it always did.
 * - A room left unnamed takes the next number: "Room 1", "Room 2"...
 * - Chat still gets the card. The page is the copy that lasts.
 * - No map pin. Foundry already makes one when a page is dragged onto a scene,
 *   and only the Referee knows where on their map the room is.
 *
 * The page carries the chat card's content with the hazard lines as the tables
 * print them, so Hazard Controls on Journal Pages draws their controls on it,
 * and it links the actors the roll created rather than only naming them.
 */

/** Room names this journal already uses as "Room N", as numbers. */
export function roomNumbersIn(pageNames)
{
  return (pageNames ?? [])
    .map(n => String(n).match(/^Room (\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
}

/** The next "Room N" after the highest this journal holds. Pure, for the test. */
export function nextRoomName(pageNames)
{
  const used = roomNumbersIn(pageNames);
  return `Room ${used.length ? Math.max(...used) + 1 : 1}`;
}

/** A link to a document that a journal page renders as a clickable name. */
export function linkTo(doc, label = null)
{
  return doc?.uuid ? `@UUID[${doc.uuid}]{${label ?? doc.name}}` : (label ?? doc?.name ?? "");
}

/** The vault's journal by exact name, created when there is none. */
export async function vaultJournal(name)
{
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return null;
  return game.journal.find(j => j.name === trimmed)
    ?? await JournalEntry.create({ name: trimmed });
}

/**
 * Write one room as a page of the vault's journal. Returns the page, or null
 * when no vault was named. `roomName` blank takes the next number.
 */
export async function writeRoomPage(vaultName, roomName, html)
{
  const journal = await vaultJournal(vaultName);
  if (!journal) return null;
  const name = String(roomName ?? "").trim() || nextRoomName(journal.pages.map(p => p.name));
  const [page] = await journal.createEmbeddedDocuments("JournalEntryPage", [
    { name, type: "text", text: { content: html } }
  ]);
  return page ?? null;
}
