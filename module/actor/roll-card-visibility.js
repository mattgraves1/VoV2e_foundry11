/**
 * Roll Card Visibility - the RollTables (foundry-system-index.csv "Roll Card
 * Visibility", RULED 2026-09-27 by Matt).
 *
 * TWO RULINGS PER TABLE, which Foundry keeps apart: who can ROLL it (the
 * table's permission) and who SEES what it rolled (the chat card). Matt's
 * answer is short enough to be a list rather than a field on every table:
 *
 *   Desert Foraging, Carousing,  players may roll them, and the card is public
 *   Escape the Vault             ("have each character roll d20")
 *   every other Vaarn table      GM-only to roll, and the card is whispered to
 *                                the GM - the 20 Ancestry spark tables
 *                                included, since they are for making NPCs and
 *                                players use the character generator
 *
 * WHO CAN ROLL is written by Sync Vaarn RollTables, the build step that already
 * makes the world tables, through desiredOwnershipDefault below. WHO SEES is
 * this file's hook, and it holds whatever roll mode the chat box is set to, so
 * the Referee never has to remember to switch it first.
 *
 * Only VAARN tables - the names rolltable-data.js builds. A table the Referee
 * made themselves is theirs, and keeps Foundry's own behaviour.
 */

import { ROLLTABLES } from "./rolltable-data.js";

/** The tables players may roll, and whose cards everyone sees. */
export const PLAYER_TABLES = Object.freeze(["Desert Foraging", "Carousing", "Escape the Vault"]);

const VAARN_TABLES = new Set(ROLLTABLES.map(t => t.name));

/** Is this one of the tables rolltable-data.js builds? */
export function isVaarnTable(name)
{
  return VAARN_TABLES.has(name);
}

/** Does this Vaarn table's card go to the GM alone? */
export function isPrivateTable(name)
{
  return isVaarnTable(name) && !PLAYER_TABLES.includes(name);
}

/**
 * The permission everyone else holds on a table: OBSERVER lets a player see it
 * in the sidebar and draw from it, NONE keeps it the GM's. Numbers rather than
 * CONST so the offline test and the sync macro read the same answer.
 */
export function desiredOwnershipDefault(name)
{
  return PLAYER_TABLES.includes(name) ? 2 : 0;
}

/**
 * Whisper a private Vaarn table's card to the GM, before it is created.
 *
 * Foundry marks a drawn table's card with the table's id (flags.core.RollTable).
 * A table drawn from a compendium carries an id no world table has, and is
 * left alone: the compendium copies are not the ones the Referee rolls.
 */
export function registerRollCardVisibility()
{
  Hooks.on("preCreateChatMessage", (message) =>
  {
    // FLAT AT THIS POINT. RollTable#toMessage writes the flag as the literal key
    // "core.RollTable", and before the message is saved it is still stored that
    // way, so getFlag("core", "RollTable") finds nothing here although it finds
    // the id on the saved message. Found in Group 429, where Vault Hazards
    // posted public.
    const id = message.getFlag?.("core", "RollTable") ?? message._source?.flags?.["core.RollTable"];
    if (!id) return;
    const table = game.tables?.get(id);
    if (!table || !isPrivateTable(table.name)) return;
    message.updateSource({ whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id) });
  });
}
