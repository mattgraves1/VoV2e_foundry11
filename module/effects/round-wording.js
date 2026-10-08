/**
 * What an Item's own words say about a round - per-round wording and the first
 * dice expression. Moved here from combat/round-effects.js in Effect Engine:
 * Creatures chunk 2c-ii (RULED 2026-10-06, Matt), so the creature translator can
 * read a rule Item's words once, into its sentence, without importing the round
 * card and everything it reaches. round-effects.js re-exports both; its header
 * comments keep the history of why the wording is exactly this.
 *
 * Pure: no Foundry global.
 */

/** The wording that says an effect ticks each combat round. See round-effects.js for its history. */
export const PER_ROUND_WORDING =
  /(?:per|each|every|the|its|their) (?:combat )?rounds?\b|start of a (?:combat )?round\b|rounds? of\b|for \[INT\][^.]{0,20}rounds?\b/i;

/** An Item's words, as every round reader has read them: description, then effect. */
export function wordsOf(item)
{
  return `${item?.system?.description ?? ""} ${item?.system?.effect ?? ""}`;
}

/**
 * The first dice expression in an item's own text, or null.
 *
 * A CONVENIENCE, NOT A CONTRACT. It decides only whether the card offers a
 * roll button, so a miss costs the GM one manual roll and a false hit costs
 * one ignored button. Deliberately not used for anything that would be wrong
 * rather than merely absent.
 *
 * Two shapes get no button on purpose, and neither is a failure of this
 * function: a rule whose per-round event is a SAVE (the players roll those,
 * and a button on a GM-whispered card cannot), and a rule whose amount scales
 * with board state — the Nightmare Herald heals d6 per sleeping creature
 * nearby, and "d6" alone would be a wrong answer rather than a partial one.
 */
export function formulaFrom(item)
{
  const text = wordsOf(item);
  if (/\bsave\b/i.test(text) && !/\bdamage\b/i.test(text)) return null;
  const m = text.match(/\b(\d*d\d+(?:\s*\+\s*\d*d?\d+)*)\b/i);
  return m ? m[1].replace(/\s+/g, "") : null;
}
