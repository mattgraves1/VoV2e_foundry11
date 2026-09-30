import { ELIXIRS } from "../actor/chargen-data.js";
import { antidoteDieOf } from "./antidote.js";

/**
 * Elixir Ingestion Restriction — who may drink an Elixir.
 *
 * THE BOOK, JADE IBIS 15-09-26, Alchemy/Elixirs: "They may be ingested by all
 * characters except those who are synthetic or mineral in nature." The vault's
 * Core Rules/Alchemy.md transcribes it exactly; both were read 2026-09-20.
 *
 * A GATE, NOT A REMINDER, AND THE SIBLING RULE IS WHY IT IS NOT OBVIOUS.
 * Disease immunity names the same two types and is deliberately built as a
 * sentence nothing acts on (affliction.js's immunityNoteFor). The reason
 * recorded there is the book's trailing "unless otherwise noted" — a hard
 * block would make the exception unreachable. This sentence carries no such
 * clause, so the same reasoning does not reach it, and RULED 2026-09-20 (Matt)
 * that the drink is refused outright. The two rules looking alike and
 * resolving differently is the point of this paragraph.
 *
 * THE VIAL IS KEPT. Same order _useAntidote already uses: a refusal does not
 * spend what the character is carrying, because destroying an Item for nothing
 * is worse than the refusal it was meant to express.
 *
 * KEYED ON CREATURE TYPE, NOT ANCESTRY, following the 2026-09-16 switch in
 * affliction-data.js and for its reasons: the type reaches a character under
 * Lithification Syrup, who is Mineral without being a Lithling, and it is what
 * both the Synth ancestry and a Bestiary creature end up setting. Read off
 * `system.creatureTypes` AS PREPARED, so a type a stateful effect granted
 * counts for exactly as long as the effect lasts.
 *
 * WHICH MEANS LITHIFICATION SYRUP BARS THE NEXT DRINK. The Syrup grants
 * Mineral for 6 Exploration Turns, so a character mid-effect is refused a
 * second Elixir until it expires. Noted at filing 2026-09-09 and kept: it
 * follows from the rules as written rather than from anything here.
 *
 * ANTIDOTES COUNT. RULED 2026-09-20 (Matt). The restriction sentence sits
 * under the Elixirs heading and the Antidotes section says nothing about
 * ingestion, so the narrow reading was available and was declined: an antidote
 * is brewed in a Crucible and drunk like any other Elixir. The consequence is
 * small in practice — Synthetic is already TOX-immune in toxin-die.js, and the
 * book gives a Lithling the same immunity through Crystalline Flesh ("You do
 * not take damage from ... poison"), which is filed as a NOT STARTED atom and
 * not yet wired. Until it is, a Lithling can hold a toxin this rule will not
 * let them cure. That is a gap in the other rule, not in this one.
 */

/** The creature types the book bars from drinking. Deliberately NOT shared
 *  with affliction-data.js's DISEASE_IMMUNE_TYPES: two different rules that
 *  happen to name the same pair today, and one edition moving one of them
 *  must not silently move the other. */
export const INGESTION_BARRED_TYPES = Object.freeze(["synthetic", "mineral"]);

/**
 * The barring creature types this actor currently has, capitalised for
 * display — [] when none. Same shape and same reasoning as
 * affliction-data.js's diseaseImmuneTypes, kept separate per the constant
 * above.
 */
export function barredIngestionTypes(actor)
{
  const types = actor?.system?.creatureTypes ?? {};
  return INGESTION_BARRED_TYPES.filter(t => types[t])
    .map(t => t.charAt(0).toUpperCase() + t.slice(1));
}

/**
 * Is this Item something the rule calls an Elixir?
 *
 * THE SAMPLE TABLE PLUS ANTIDOTES, because that is the whole of what this
 * codebase can identify. An Elixir has no Item type, no flag and no entry in
 * item-kind.js's twelve kinds — chargen and loot-builders both create one as a
 * plain `type: "item"` — so a GM's hand-made Elixir is invisible here. Adding
 * a marker would mean teaching every creation site and backfilling everything
 * already made, which is the standing answer against a stored field (see
 * item-kind.js). DELIBERATELY BROADER THAN THE USE ICON: hasItemUse only
 * admits the twelve ELIXIRS entries carrying a stateful or permanentAbility
 * spec, and every name it lists was confirmed 2026-09-20 to be on this same
 * table. Asking about Elixir-ness rather than about having a button means a
 * descriptive Elixir that later gains one is already covered.
 */
export function isIngestible(item)
{
  if(item?.type !== "item") return false;
  const name = item?.name ?? "";
  return ELIXIRS.some(e => e.name === name) || !!antidoteDieOf(name);
}

/**
 * Why this actor may not drink this Item, or null when they may.
 *
 * Returns the sentence rather than a boolean so the caller can say WHICH type
 * fired — the same choice toxinModifiers made with `sources`, and for the same
 * reason: "nothing happened" with no cause reads as a bug.
 */
export function ingestionRefusal(actor, item)
{
  if(!isIngestible(item)) return null;
  const types = barredIngestionTypes(actor);
  if(!types.length) return null;
  return `${actor.name} is ${types.join(" and ")}. Elixirs may be ingested by `
    + `all characters except those who are Synthetic or Mineral in nature — `
    + `${item.name} has NOT been drunk.`;
}
