/**
 * Innate Item Suppression — foundry-system-index.csv "Innate Item Suppression".
 *
 * An innate item's ongoing effects are switched off while something suppresses
 * it, and come back when that ends. The item stays on the sheet the whole time:
 * a character does not stop HAVING antlers because their bones went soft, they
 * stop being able to hurt anyone with them.
 *
 * FILED 2026-09-13 (Matt) out of the Jellybones survey, and deliberately
 * generic — "a way to turn off an innate item's ongoing effects, whatever they
 * may be". Jellybones is the first consumer and must not be the shape of it.
 *
 * ── THE PRECEDENT IS system.broken, AND THE DIFFERENCE IS THE WHOLE JOB ─────
 *
 * `broken` gates USE, at a click site: actor-sheet.js sets it on a Fragile
 * weapon's nat-1 and _itemIsBroken checks it before an attack resolves. One
 * flag, one reader, and the reader is a function somebody calls.
 *
 * Suppression has to reach PASSIVE contributions as well — avBonus, the
 * retaliation clauses, damage add-ons — which nobody calls. They are summed
 * during prepareDerivedData on every render, or read inside a hook. So this
 * module is mostly a set of small questions the existing readers ask, placed
 * where they already loop.
 *
 * ── WHY A LIST OF SOURCES AND NOT A BOOLEAN ────────────────────────────────
 *
 * `broken` is a boolean because a GM clears it by hand and there is only ever
 * one of it. Suppression is applied and lifted by RULES, and the lifting has
 * to be exact: a cure must release only what its own affliction suppressed. A
 * boolean cannot express "Jellybones suppressed this and something else did
 * too", so curing one would silently restore an item the other still holds
 * down. The bug would be invisible — the item simply starts working again.
 *
 * So `system.suppressedBy` is an array of source keys and "suppressed" means
 * non-empty. A source key is whatever the suppressor calls itself; afflictions
 * use their roster key, so "jellybones" releases exactly its own holds.
 *
 * ── ABILITY MODIFIERS ARE BAKED, SO SUPPRESSION HAS TO PUSH BACK ───────────
 *
 * Everything else here works by NOT contributing, which is the shape
 * stateful-effect.js's header argues for at length: a contributor that ceases
 * to exist reverses itself, and there is no reverse write to lose or
 * double-apply.
 *
 * `abilityMod` cannot work that way. A mutation's ability modifier is WRITTEN
 * INTO `ability.value` and is not a live contributor at all, so there is
 * nothing to stop contributing — Skeletal Frame's -2 STR is already inside the
 * stored number. Suppressing it therefore means contributing +2 for as long as
 * the suppression lasts, which `suppressionDeltas` does, into the same
 * `liveAbilityBonus` channel implants and elixirs already use. That keeps it
 * inside the +10 clamp and makes it reverse by ceasing to exist, like
 * everything else.
 *
 * IT IS BAKED IN TWO PLACES, not one, and the second is the one that matters
 * here. chargen-app.js's _effectiveAbilities folds it in when a character is
 * built; item-effects.js's createItem hook does the same whenever a mutation
 * Item is created on an existing actor (Creation-Time Item Modifiers). This
 * comment claimed only the chargen half until 2026-09-13, when live testing
 * showed a hand-made T137 actor already carrying the penalty in its stored
 * value — which is the correct behaviour, and means the delta here is pushing
 * back against a real write rather than double-counting a live bonus. Worth
 * stating precisely: if it had been a live contributor, adding the inverse
 * would have cancelled a bonus that was going to be removed anyway and the
 * ability would have been wrong in BOTH directions.
 *
 * RULED 2026-09-13 (Matt) that this is item-level rather than clause-level, on
 * the worked case: suppressing Skeletal Frame removes its -2 STR and -2 CON
 * along with the double-bludgeoning clause Jellybones contradicts, so a
 * Jellybones victim with Skeletal Frame GAINS four points of ability score. Put
 * to him as a buff before it was built — "let's let it be a buff, it gives a
 * skeletal frame character an interesting choice."
 *
 * ── WHAT THIS DOES NOT TOUCH, AND WHY ──────────────────────────────────────
 *
 * EQUIP GUARDS. blocksHelmet, blocksBodyArmour and blocksTwoHanded gate an
 * ACTION at the equip button; they are not ongoing effects. Suppressing Crown
 * Horns does not let a character put a helmet on, and it should not: the horns
 * are still on their head. This is also what leaves horned characters immune to
 * Brain Coral, which Matt kept deliberately.
 *
 * ITEM SLOTS. A suppressed item still occupies its slots. It is still being
 * carried, or still part of the body.
 *
 * THE ITEM'S OWN TEXT. The description keeps saying what the mutation does. The
 * sheet says it is suppressed; it does not rewrite the rule.
 */

import { MUTATION_TABLE } from "../actor/mutation-data.js";
import { ADVANCED_IMPLANTS } from "../actor/advanced-implants-data.js";
import { ANCESTRY_NATURAL_WEAPONS } from "../actor/ancestry-rules-data.js";
import { IMPLANTS, ABILITY_SHORT_KEY } from "../actor/chargen-data.js";

/**
 * The source keys currently holding an item down.
 *
 * Accepts a Document or a plain object, so it works on toObject() output and on
 * a creation payload before the Item exists — the same latitude isIntrinsic
 * takes, and for the same reason.
 *
 * An Item created before this field existed reads `undefined`, which answers
 * "nothing is suppressing it". That is the correct answer rather than a missing
 * one, so no backfill is wanted — see CLAUDE.md's standing ruling on migrating
 * existing world documents.
 */
export function suppressorsOf(doc)
{
  const raw = doc?.system?.suppressedBy;
  return Array.isArray(raw) ? raw.filter(s => typeof s === "string" && s !== "") : [];
}

/** Is this item's ongoing effect switched off? */
export function isSuppressed(doc)
{
  return suppressorsOf(doc).length > 0;
}

/**
 * Every roster entry that can produce an innate item, flattened to one list of
 * `{ entry, kind, name }`.
 *
 * Shaped after damage-add-ons.js's naturalWeaponEntries rather than importing
 * it, because that generator deliberately yields only entries WITH a
 * naturalWeapon and suppression has to reach Quills and Skeletal Frame, which
 * have none. Same four rosters, wider filter.
 */
function* innateEntries()
{
  for(const m of MUTATION_TABLE) yield { entry: m, kind: "mutation", name: m.name };
  for(const i of IMPLANTS) yield { entry: i, kind: "implant", name: i.name };
  for(const i of ADVANCED_IMPLANTS) yield { entry: i, kind: "implant", name: i.name };
  for(const rules of Object.values(ANCESTRY_NATURAL_WEAPONS))
    for(const r of rules) yield { entry: r, kind: "ancestry", name: r.rule };
}

/** The roster entry behind an innate Item, or null. */
export function entryFor(item)
{
  if(item?.type === "ancestry")
  {
    // Matched on `system.rule`, NOT on name: chargen-app.js names a variant
    // rule "Biter: <variant>", so a name match would miss exactly the
    // characters whose rule rolled a variant.
    const rule = item.system?.rule;
    for(const e of innateEntries()) if(e.kind === "ancestry" && e.name === rule) return e.entry;
    return null;
  }
  for(const e of innateEntries()) if(e.kind === item?.type && e.name === item?.name) return e.entry;
  return null;
}

/**
 * The Items on an actor produced by the named roster entries — the entry's own
 * Item AND the separate weapon Item its `naturalWeapon` created.
 *
 * Two Items per entry is the trap this exists to close. "Claws, Crab" is a
 * mutation Item; the thing that actually rolls damage is a weaponMelee Item
 * called "Crab Claw", and the names do not match. A suppressor that reached
 * only the mutation would switch off an AV bonus the entry does not have and
 * leave the claw swinging.
 */
export function innateItemsFor(actor, entryNames)
{
  const wanted = new Set(entryNames);
  const weaponNames = new Set();
  const ruleNames = new Set();
  for(const { entry, kind, name } of innateEntries())
  {
    if(!wanted.has(name)) continue;
    if(entry.naturalWeapon?.name) weaponNames.add(entry.naturalWeapon.name);
    if(kind === "ancestry") ruleNames.add(name);
  }

  return (actor?.items ?? []).filter(i =>
       (wanted.has(i.name) && ["mutation", "implant"].includes(i.type))
    || (i.type === "ancestry" && ruleNames.has(i.system?.rule))
    || (weaponNames.has(i.name) && ["weaponMelee", "weaponRanged"].includes(i.type)));
}

/**
 * Put a hold on some items in this source's name. Idempotent: applying twice
 * leaves one hold, so a re-applied affliction cannot stack a release it will
 * only lift once.
 */
export async function suppressItems(actor, items, source)
{
  const updates = [];
  for(const item of items)
  {
    const held = suppressorsOf(item);
    if(held.includes(source)) continue;
    updates.push({ _id: item.id, "system.suppressedBy": [...held, source] });
  }
  if(updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

/**
 * Lift every hold this source is responsible for, and NOTHING else. Walks the
 * whole actor rather than a remembered id list: an item created after the
 * suppression began still carries the source key if the suppressor put it
 * there, and a remembered list would leak a hold on anything the suppressor
 * caught late.
 */
export async function releaseSuppression(actor, source)
{
  const updates = [];
  for(const item of actor?.items ?? [])
  {
    const held = suppressorsOf(item);
    if(!held.includes(source)) continue;
    updates.push({ _id: item.id, "system.suppressedBy": held.filter(s => s !== source) });
  }
  if(updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

/**
 * The ability contributions that put back what a suppressed item's BAKED
 * `abilityMod` took away. See the header: this is the one quantity that cannot
 * reverse by ceasing to contribute, because it was never contributing.
 *
 * Returns short keys (str/dex/con/int/psy/ego) so actor.js can fold it straight
 * into liveAbilityBonus. Implants are deliberately absent: a starting implant's
 * `stat_mod` is baked the same way, but no suppressor reaches implants today
 * and inventing the inverse for a case nobody has is how a mechanism grows a
 * branch nothing drives.
 */
export function suppressionDeltas(actor)
{
  const out = {};
  for(const item of actor?.items ?? [])
  {
    if(item.type !== "mutation" || !isSuppressed(item)) continue;
    const mod = entryFor(item)?.abilityMod;
    if(!mod) continue;
    for(const [long, amount] of Object.entries(mod))
    {
      const key = ABILITY_SHORT_KEY[long];
      if(!key) continue;
      out[key] = (out[key] || 0) - Number(amount);
    }
  }
  return out;
}

/**
 * The names of a suppressed actor's held items, for a chat card or a tooltip.
 * Sorted so two cards listing the same holds read identically.
 */
export function suppressedNames(actor, source = null)
{
  return (actor?.items ?? [])
    .filter(i => source === null ? isSuppressed(i) : suppressorsOf(i).includes(source))
    .map(i => i.name)
    .sort((a, b) => a.localeCompare(b));
}
