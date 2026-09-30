/**
 * Vaarn's Toxin Die (Core Rules/Toxins.md), in one place because the rule has
 * two halves that are easy to get backwards and several modifier sources that
 * must agree: actor-sheet.js rolls the save and the damage, and
 * tools/test-toxin-die.mjs exercises everything below with no Foundry present.
 *
 * The rule, from the vault page:
 *
 * - A TD is incurred when a PC is hit by a toxic attack AND FAILS A CON SAVE.
 *   The save is the ENTRY GATE. Once a TD is held there is no save to shake it
 *   off — curing is alchemy, medgel, locals or amputation, which is why the
 *   book gives curing its own section.
 * - The save target is 10 + the TD size, and must be EXCEEDED, not equalled.
 *   The book's own example: "A d6 TOX attack requires a CON save exceeding 16."
 * - Each combat round, before acting, a PC with a TD rolls it and subtracts the
 *   result from HP. Out of combat it is once per exploration turn.
 * - On a 1-2 the die DEPLETES ONE STEP DOWN THE CHAIN. It does not clear.
 * - A PC holds ONE TD at a time, and a new failed save only raises it.
 *
 * Matt's first design (2026-09-07) had the save recur, with a pass curing the
 * toxin outright; he withdrew it on reading the rule. Recorded because the
 * withdrawn version is the intuitive one and will be re-proposed otherwise.
 *
 * TIMING IS ADJUDICATED. Nothing here hooks the combat loop — the book's "each
 * round, before taking their action" is a table procedure, and the sheet gives
 * the player a button rather than guessing when to press it. Application is
 * adjudicated too, so the one-TD-at-a-time escalation rule is the GM's to
 * enforce and the dropdown is deliberately not policed.
 */

import { USAGE_DIE_CHAIN } from "../item/usage-die.js";
import { resolveSave } from "../combat/saves.js";

/**
 * Vaarn has ONE dice chain, and two subsystems ride on it: the Usage Die
 * (Core Rules/Usage Die.md) and the Toxin Die. Imported rather than
 * re-declared so a correction to the chain cannot reach one and miss the
 * other. The SENTINELS differ and stay local: a usage die bottoms out at
 * "expended", a Toxin Die at Cured, which this file spells "".
 */
export const TOXIN_DIE_CHAIN = USAGE_DIE_CHAIN;

/** No toxin. The book's "Cured" step; "" so an unset field means the same. */
export const TOXIN_CURED = "";

/** Dropdown options, smallest first, with Cured at the top as the default. */
export const TOXIN_DIE_OPTIONS = [TOXIN_CURED, ...[...TOXIN_DIE_CHAIN].reverse()];

function dieSize(die)
{
  return Number(die?.slice(1)) || 0;
}

/** True if this actor is carrying a Toxin Die at all. */
export function hasToxinDie(die)
{
  return !!die && die !== TOXIN_CURED && TOXIN_DIE_CHAIN.includes(die);
}

/**
 * The number a CON save must EXCEED: 10 + the TD size. Returns 0 for Cured,
 * which has no save to make.
 */
export function toxSaveTarget(die)
{
  return hasToxinDie(die) ? 10 + dieSize(die) : 0;
}

/**
 * One step down the chain, or Cured if already at d4. This is what "depletes"
 * means in Toxins.md — reduce by one step, NOT clear.
 */
export function stepDownToxinDie(die)
{
  const idx = TOXIN_DIE_CHAIN.indexOf(die);
  if(idx === -1) return TOXIN_CURED;
  return idx >= TOXIN_DIE_CHAIN.length - 1 ? TOXIN_CURED : TOXIN_DIE_CHAIN[idx + 1];
}

/**
 * Resolve a CON save against a Toxin Die.
 *
 * `natural` is the raw d20 face, which under ADV/DIS is the KEPT die, not the
 * first one rolled. Saving Throws.md: "A roll of 20 is always a success and a
 * roll of 1 is always a failure, regardless of bonuses."
 *
 * The nat-20 clause is load-bearing here rather than decorative. A d20 TD needs
 * a total exceeding 30, and d20 plus template.json's max ability of 10 is
 * exactly 30 — so without it the worst toxin in the book could never be
 * resisted. (The mirror of Group 89's finding, where the nat-1 clause was
 * unreachable because the arithmetic already failed.)
 */
export function resolveToxSave(total, natural, target)
{
  // DELEGATES SINCE 2026-09-13 — Saving Throw Resolution Duplication. The
  // three clauses used to be restated here, which made this the second of six
  // independent copies of a rule the book states once.
  //
  // THE NAME IS KEPT AND THE FUNCTION IS NOT INLINED AWAY, deliberately. Its
  // callers are actor-sheet.js's toxin row and tools/test-toxin-die.mjs, and
  // both name it; changing that would be a rename in a build about
  // consolidation. What mattered was the RULE having one home, not this
  // wrapper disappearing. The row that filed this warned about the opposite
  // mistake - importing resolveToxSave into an ambush, where the name would
  // assert a toxin that is not there - and combat/saves.js is named for no
  // subject at all, which is why the dependency runs this way round.
  return resolveSave(total, natural, target);
}

/**
 * Every source that changes how an actor faces a toxin, resolved in one place
 * so the sheet asks one question instead of special-casing five atoms.
 *
 * Returns `{ immune, advantage, sources }`. `sources` names what fired, so the
 * sheet can say WHY a row is disabled rather than just disabling it — Matt's
 * call 2026-09-07: it reminds the player their character has the ability.
 *
 * Immunity wins over advantage; an immune actor never rolls at all.
 */
export function toxinModifiers(actor)
{
  const items = actor?.items ?? [];
  const has = (type, name) => [...items].some(i => i.type === type && i.name === name);

  const immune = [];
  const advantage = [];

  // Creature type, not ancestry. The Synth ancestry's Synthetic Flesh rule and
  // the Bestiary's Synthetic creature type grant this independently, and the
  // checkbox is what both of them end up setting.
  if(actor?.system?.creatureTypes?.synthetic) immune.push("Synthetic");
  // RULED 2026-09-07 (Matt), built 2026-09-26: every Mineral creature, not the
  // Lithling alone - Crystalline Flesh's "immune to poison" is pre-TOX wording.
  // So Lithification Syrup's borrowed mineral type carries it for its span.
  if(actor?.system?.creatureTypes?.mineral) immune.push("Mineral");
  // A generated creature's rolled Special Defense - Immune to Toxins or ADV vs
  // Toxins, written by monster-generator.js (RULED 2026-09-26, Matt).
  const rolled = actor?.flags?.vaarn?.toxinDefense;
  if(rolled === "immune") immune.push(actor.flags.vaarn.toxinDefenseName ?? "Immune to Toxins");
  if(rolled === "adv") advantage.push(actor.flags.vaarn.toxinDefenseName ?? "ADV vs Toxins");

  if(has("mutation", "Extra Liver")) advantage.push("Extra Liver");
  // Cyberliver was an immunity through CRIMSON HOUND ("You are immune to all
  // TOX damage"). JADE IBIS 15-09-26 rewrote it to "ADV on Saves against TOX
  // damage and poisons", converging it on Extra Liver - applied 2026-09-16 on
  // Jade Ibis Rule-Resolution Changes, RULED by Matt.
  if(has("implant", "Cyberliver")) advantage.push("Cyberliver");
  // "ADV on Saves vs diseases and poisons". RULED 2026-09-16 (Matt): poisons
  // means the TOX save, on Extra Liver's precedent, where "poisons and TOX
  // attacks" is one resolver. The diseases half is afflictionSaveModifiers.
  if(has("mutation", "Heightened Immune System")) advantage.push("Heightened Immune System");

  // Detritivore is universal to Mycomorphs, so the ancestry is the signal. It
  // is ALSO filed to become a clickable ancestry Item; that row is about
  // surfacing the rule, and this does not wait on it.
  if(actor?.system?.ancestry === "Mycomorph") advantage.push("Detritivore");

  // Hazard Wrap must be WORN to help (Matt, 2026-09-07). Read off a structured
  // field rather than the item's description prose: the rule reaches the
  // finished item only as a sentence, and string-matching that is the
  // fragile-grep failure this project keeps re-learning.
  const wrap = [...items].find(i => i.type === "armor" && i.system?.toxSaveAdv && i.system?.equipped);
  if(wrap) advantage.push(wrap.name);

  return {
    immune: immune.length > 0,
    advantage: immune.length === 0 && advantage.length > 0,
    sources: immune.length > 0 ? immune : advantage,
  };
}

/**
 * The Toxin Die a TOX attack threatens, read off its damage formula — Compel-a-
 * Target Save's TOX route, 2026-09-19. Toxins.md: "an attack with the damage
 * notation 'd6 TOX' requires the target make a CON Save vs a d6 TD."
 *
 * THE LARGEST DIE IN THE FORMULA. Every TOX attack in the book is one die, or
 * one die repeated (Cliff Ghul's "d6 + d6 TOX"), so this only has to be right
 * for those; taking the largest is what keeps a mixed formula from ever
 * under-reading the toxin. NULL for a die the chain does not hold — the book
 * never prints one, but the vault's Face Dancer carried a d5 its source does
 * not (found 2026-09-19), and inventing a step would hide that rather than
 * show it.
 */
export function toxDieOfFormula(formula)
{
  const sizes = [...String(formula ?? "").matchAll(/\d*d(\d+)/gi)].map(m => Number(m[1]));
  if(!sizes.length) return null;
  const die = "d" + Math.max(...sizes);
  return TOXIN_DIE_CHAIN.includes(die) ? die : null;
}

/**
 * The die a failed save leaves the actor holding. Toxins.md, Multiple Sources
 * of Toxins: "A PC may only have one TD at a time. Failing a Save against a new
 * TOX attack only increases the PC's TD size if their current TD is smaller
 * than the size indicated by the new attack." ENFORCED (Matt, 2026-09-19)
 * because it is the rule — the sheet dropdown stays unpoliced, since a hand
 * edit is the GM's, but a card applies the book.
 */
export function raisedToxinDie(current, incoming)
{
  if(!hasToxinDie(incoming)) return hasToxinDie(current) ? current : TOXIN_CURED;
  if(!hasToxinDie(current)) return incoming;
  return dieSize(incoming) > dieSize(current) ? incoming : current;
}
