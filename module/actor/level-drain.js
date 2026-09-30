import { loseLevels, ABILITY_CAP, ABILITY_LABEL } from "./advancement.js";

/**
 * CREATURE-DRIVEN LEVEL DRAIN
 *
 * A creature rule that takes a Level off a PC in play, and — because the book
 * says the loss is undone when the creature dies — can give it back.
 *
 * The Kronophage's Borrowed Time is the only entry today. The book:
 *
 *   "the Kronophage drains years from its victim's past, present, and future.
 *    The target loses a Level. They must roll 1d8 and subtract the result from
 *    their maximum HP, and subtract three points from their maximum ability
 *    scores. The Kronophage gains a Level permanently. PCs reduced below
 *    Level 0 by the Kronophage are worse than dead; they never existed at all,
 *    and their equipment vanishes with them. Slaying the monster restores all
 *    lost time to those it fed upon. PCs regain their lost Levels."
 *
 * RE-TRANSCRIBED 2026-09-20: that last clause read "maximum ability DEFENCES"
 * in CRIMSON HOUND and reads "maximum ability scores" in JADE IBIS 15-09-26.
 * The clause is not implemented either way, so nothing below changes.
 *
 * RULED 2026-09-14 (Matt): "borrowed time needs to use the level loss
 * implementation we added instead of the effect described in the book". So the
 * 1d8 max-HP clause and the three-point ability clause are NOT transcribed —
 * advancement.js's loseLevels already reverts the HP and the Ability picks that
 * level granted, and applying the book's flat numbers on top would take the
 * same thing twice.
 *
 * THE FLOOR STAYS AT LEVEL 1, also ruled that day. loseLevels refuses below it
 * and already tells the Referee that whether a character drained past it still
 * exists is their call. The book's erasure clause — never existed, equipment
 * vanishes — is therefore deliberately not automated: deleting a player's
 * character and their gear is not a thing this system does on a monster's
 * attack.
 *
 * WHY THIS FILE HAS TO SNAPSHOT ANYTHING AT ALL, which is the part that is not
 * obvious. loseLevels POPS the ledger entry and saves the truncated array, so
 * after a drain the record of what that level granted is GONE — it survives
 * only as prose in the chat card. Observed rather than inferred: after the
 * level-down in Group 157's 157.11, system.advancement read []. "Restores all
 * lost time" therefore cannot replay a ledger that no longer holds the entry,
 * and the drain has to keep it.
 *
 * ITEMS ARE SNAPSHOTTED WITH IT, not just the numbers. undoEntry DELETES the
 * Items a level granted — a Proteus mutation, a Bloomboon — and the entry keeps
 * only their ids, which name nothing once the Items are gone. Restoring from
 * ids alone would hand back the Ability points and silently lose the mutation.
 */

/** The rule Item's declared drain spec, or null. */
export function levelDrainSpecOf(item)
{
  return item?.flags?.vaarn?.levelDrain ?? null;
}

/** Every stored drain a victim is currently carrying. */
export function drainsOn(actor)
{
  return actor?.getFlag("vaarn", "levelDrains") ?? [];
}

/**
 * Actors carrying a drain from this drainer.
 *
 * Keyed by the drainer's ACTOR id rather than a token or uuid: a creature
 * spawned from the pack is a world Actor, and the same Actor is what the death
 * hook has in hand. A token-scoped key would miss an unlinked token's kill,
 * which is the ordinary case for a spawned monster.
 */
export function victimsOf(drainerId)
{
  return game.actors.filter(a => drainsOn(a).some(d => d.drainerId === drainerId));
}

/**
 * Take `spec.levels` Levels off the victim, keeping what was taken so the
 * creature's death can give it back.
 *
 * Returns { taken, refused } — `taken` is the number of Levels that actually
 * came off, which is NOT necessarily what was asked for: the Level 1 floor
 * stops it, and a character already there loses nothing at all.
 */
export async function applyLevelDrain({ drainer, victim, spec, reason })
{
  if(!victim || victim.type !== "character")
    return { taken: 0, refused: true, notACharacter: true };

  const levels = Number(spec?.levels ?? 1);

  // Snapshot BEFORE the drain: the entries loseLevels is about to pop, plus
  // the full data of every Item those entries granted. Read from the end,
  // because that is the end loseLevels pops from.
  const before = foundry.utils.duplicate(victim.system.advancement ?? []);
  const candidates = before.slice(Math.max(0, before.length - levels));
  const itemData = {};
  for(const entry of candidates)
    for(const id of entry.grantedItemIds || [])
    {
      const item = victim.items.get(id);
      if(item) itemData[id] = item.toObject();
    }

  await loseLevels(victim, levels, { reason });

  // What ACTUALLY came off, rather than what was requested. Diffing the ledger
  // is the only honest answer: loseLevels refuses at the floor and says so on
  // its own card, and nothing it returns distinguishes a full drain from a
  // partial one.
  const after = victim.system.advancement ?? [];
  const taken = before.length - after.length;

  if(taken > 0)
  {
    const removed = before.slice(after.length);
    const drains = foundry.utils.duplicate(drainsOn(victim));
    drains.push({
      drainerId: drainer?.id ?? null,
      drainerName: drainer?.name ?? "an unknown drainer",
      entries: removed,
      // Only the Items belonging to the entries that actually went.
      items: Object.fromEntries(removed.flatMap(e =>
        (e.grantedItemIds || []).filter(id => itemData[id]).map(id => [id, itemData[id]]))),
      at: game.time?.worldTime ?? 0
    });
    await victim.setFlag("vaarn", "levelDrains", drains);
  }

  return { taken, refused: taken < levels };
}

/**
 * The drainer's own gain. "The Kronophage gains a Level permanently."
 *
 * RULED 2026-09-14 (Matt): bump the Level, add 4 to maximum and current HP.
 * The 4 is the Bestiary's own Level x 4 for creature HP, so one Level is worth
 * exactly four points and nothing here invents a die.
 *
 * ABILITIES MOVE WITH IT, and that is a correction to the same ruling rather
 * than an addition to it. He expected creature Abilities to be derived from
 * Level and so to need no work; bestiary-build.js:412 does set all six to
 * min(level, 10), but at BUILD time — the values are then stored on the Actor,
 * so a Level bump alone would leave a Level 8 Kronophage with Level 7
 * Abilities. Writing them is what makes the stored actor agree with what the
 * builder would have produced at the new Level.
 *
 * NOTHING REVERSES THIS. The book gives the creature its Level "permanently"
 * and restores only the victims, and the drainer is dead by the time
 * restoration runs anyway.
 */
export async function applyDrainerGain(drainer, gain)
{
  if(!drainer || !gain) return null;

  const levelUp = Number(gain.level ?? 0);
  const hpUp = Number(gain.hp ?? 0);
  const from = Number(drainer.system?.level?.value ?? 0);
  const to = from + levelUp;

  const updates = {};
  if(levelUp)
  {
    updates["system.level.value"] = to;
    const abilityValue = Math.min(to, ABILITY_CAP);
    for(const key of Object.keys(drainer.system?.abilities ?? {}))
      updates[`system.abilities.${key}.value`] = abilityValue;
  }
  if(hpUp)
  {
    updates["system.health.max"] = Number(drainer.system.health.max) + hpUp;
    updates["system.health.value"] = Number(drainer.system.health.value) + hpUp;
  }

  await drainer.update(updates);
  return { from, to, hpUp, abilityValue: Math.min(to, ABILITY_CAP) };
}

/**
 * Replay one stored entry onto a victim — the inverse of advancement.js's
 * undoEntry, and deliberately written to mirror applyLevelUp's own writes
 * rather than to guess at them.
 */
async function redoEntry(actor, entry, items)
{
  const updates = { "system.level.value": Number(actor.system.level.value) + 1 };

  for(const [key, amount] of Object.entries(entry.abilities || {}))
  {
    const current = Number(actor.system.abilities[key].value);
    updates[`system.abilities.${key}.value`] = Math.min(ABILITY_CAP, current + amount);
  }

  if(entry.hp)
  {
    // Max and current both rise, which is what the level-up did. A character
    // wounded since the drain keeps the wound: current goes up by the same
    // amount, not to full.
    updates["system.health.max"] = Number(actor.system.health.max) + entry.hp;
    updates["system.health.value"] = Number(actor.system.health.value) + entry.hp;
  }

  // The undo REFUNDED the XP this level cost, so giving the level back has to
  // spend it again or the character ends up a level richer for free.
  if(entry.xpSpent)
    updates["system.xp.value"] = Math.max(0, Number(actor.system.xp.value) - entry.xpSpent);

  await actor.update(updates);

  // Items last, so their bakes write onto an actor already at the right Level.
  const restored = (entry.grantedItemIds || []).map(id => items?.[id]).filter(Boolean);
  if(restored.length) await actor.createEmbeddedDocuments("Item", restored, { keepId: true });

  const ledger = foundry.utils.duplicate(actor.system.advancement ?? []);
  ledger.push(entry);
  await actor.update({ "system.advancement": ledger });
}

/**
 * "Slaying the monster restores all lost time to those it fed upon."
 *
 * Replays every entry this drainer took, oldest first, onto every victim still
 * carrying one. Returns a per-victim summary for the card.
 */
export async function restoreDrainsFrom(drainer)
{
  const results = [];
  for(const victim of victimsOf(drainer.id))
  {
    const kept = [];
    const mine = [];
    for(const d of drainsOn(victim)) (d.drainerId === drainer.id ? mine : kept).push(d);
    if(!mine.length) continue;

    let levels = 0;
    for(const d of mine)
      for(const entry of d.entries)
      {
        await redoEntry(victim, entry, d.items);
        levels++;
      }

    await victim.setFlag("vaarn", "levelDrains", kept);
    results.push({ name: victim.name, levels, level: victim.system.level.value });
  }
  return results;
}

/** The one line of chat that says what a drain actually did. */
export function drainSummary({ victim, taken, refused, gain })
{
  const parts = [];
  if(taken > 0)
    parts.push(`<li><b>${victim.name}</b> loses ${taken} Level${taken === 1 ? "" : "s"}` +
               ` &rarr; Level ${victim.system.level.value}.</li>`);
  if(refused)
    parts.push(`<li><b>Level 1 is the floor.</b> Nothing below it is recorded, and whether a` +
               ` character drained past it still exists is the Referee's call.</li>`);
  if(gain)
    parts.push(`<li>The drainer gains a Level ${gain.from} &rarr; ${gain.to}` +
               (gain.hpUp ? `, +${gain.hpUp} HP` : "") +
               `, Abilities now ${gain.abilityValue}.</li>`);
  if(taken > 0)
    parts.push(`<li><i>Slaying it restores what it took.</i></li>`);
  return parts.join("");
}
