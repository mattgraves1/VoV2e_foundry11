/**
 * The heal a weapon gives its wielder - Effect Engine: Weapon Tags, chunk 4
 * (foundry-system-index.csv "Effect Engine: Weapon Tags", RULED 2026-10-05 by
 * Matt). Vampiric's "regains HP equal to half damage inflicted" on a
 * biological target, and Blood-Rapturous's "heals for the victim's maximum
 * HP" on a biological kill, read from the weapon's sentences and their gates
 * rather than its tag names. Reported, never applied here: the callers sum
 * across every target and apply once, as before.
 *
 * A file of its own because both the damage pipeline and knave.js's protector
 * handler ask, and the gate reader (gates.js) and the sentence readers
 * (weapon-tags.js) would otherwise import each other.
 */
import { hitHealSentences, killHealSentences } from "../item/weapon-tags.js";
import { computeGate } from "./gates.js";

/** Do a sentence's gates hold for this target? Computed gates only - nothing here asks. */
function holdsFor(s, target)
{
  return (s.if ?? []).every(g =>
  {
    const fact = computeGate(g, { target });
    return g.is === false ? fact === false : !!fact;
  });
}

/** What a hit's damage gives back to the wielder: Vampiric's half of `dealt`, or 0. */
export function hitHealFor(item, target, dealt)
{
  if (!item || !(dealt > 0)) return 0;
  const s = hitHealSentences(item).find(x => x.do.amount === "half-dealt" && holdsFor(x, target));
  return s ? Math.floor(dealt / 2) : 0;
}

/** What killing `victim` gives the wielder: Blood-Rapturous's victim's max HP, or 0. */
export function killHealFor(item, victim)
{
  if (!item || !victim) return 0;
  const s = killHealSentences(item).find(x => x.do.amount === "victim-max-hp" && holdsFor(x, victim));
  return s ? Number(victim.system?.health?.max ?? 0) : 0;
}

/**
 * What to call the heal on the card (GM Effect Builder: Widening chunk 2,
 * 2026-10-09): the tag that gives it (Vampiric, Blood-Rapturous) - or, since a
 * worn or carried Item's heal reaches every attack, that Item's name.
 */
export function hitHealSourceOf(item)
{
  return hitHealSentences(item).find(x => x.do.amount === "half-dealt")?.tag ?? "Vampiric";
}
export function killHealSourceOf(item)
{
  return killHealSentences(item).find(x => x.do.amount === "victim-max-hp")?.tag ?? "Blood-Rapturous";
}

/** Does this weapon heal on a kill at all - the reminder when a kill cannot be told? */
export function healsOnKill(item)
{
  return killHealSentences(item).length > 0;
}
