/**
 * Saving Throw Resolution Duplication (foundry-system-index.csv).
 *
 * ONE copy of how a save resolves, for the call sites that can share it.
 *
 * Core Rules/Saving Throws.md: "add the relevant ability bonus to a d20 roll.
 * If the total exceeds 15, the character succeeds. If not, they fail. A result
 * of 20 is always a success and a result of 1 always a failure, regardless of
 * bonuses."
 *
 * Two things that rule says and that every hand-written copy has had to
 * restate: the total must EXCEED the target rather than meet it, and the
 * natural die beats the total in both directions.
 *
 * WHY THIS FILE EXISTS AND WHAT IT DOES NOT YET COVER. The rule was written
 * out in five places by 2026-09-10 — `resolveToxSave` in actor/toxin-die.js,
 * three inline copies in actor-sheet.js (the Codex read, Twice Born, Release
 * Spores), and `resolveSave` in combat/ambush.js. Building Fleeing Combat on
 * 2026-09-11 would have made a sixth, so the ambush copy moved here and both
 * ambush.js and flee.js now import it.
 *
 * The other four are deliberately NOT moved. Each is embedded in a larger
 * method rather than sitting behind a function boundary, so converting them is
 * a real edit to code that has passed live testing, and it belongs to that row
 * rather than to a build about fleeing. Two of six sharing one copy is the
 * honest state; Saving Throw Resolution Duplication stays open and says so.
 *
 * The TARGET is a parameter and not a constant here on purpose. It is 15 for
 * an ordinary save, `10 + the opposing bonus` for an opposed one, and the
 * character's own used item slots when they flee — three different numbers
 * that resolve identically once one of them is chosen.
 *
 * @param {number} total   the roll's final total, bonuses included
 * @param {number} natural the natural d20 — under ADV/DIS this is the KEPT die
 * @param {number} target  the number the total must exceed
 * @returns {{passed: boolean, reason: "nat20"|"nat1"|"total"}}
 */
/**
 * The ordinary save target — Saving Throws.md: "If the total exceeds 15, the
 * character succeeds."
 *
 * Exported 2026-09-13 while consolidating the last three call sites. Two of
 * them had the literal 15 inline, which is the same duplication one level down
 * from the one this file exists to remove: a shared resolver that every caller
 * hands its own hardcoded target to still has the number written out five
 * times. The three callers with a DIFFERENT target — ambush, flee, and an
 * affliction's Virulence — keep passing their own, which is why the
 * target stays a parameter and this is a default nobody is forced to use.
 */
export const SAVE_TARGET = 15;

export function resolveSave(total, natural, target = SAVE_TARGET)
{
  if (natural === 20) return { passed: true,  reason: "nat20" };
  if (natural === 1)  return { passed: false, reason: "nat1" };
  return { passed: total > target, reason: "total" };
}
