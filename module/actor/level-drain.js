import { loseLevels, ABILITY_CAP, ABILITY_LABEL } from "./advancement.js";
import { maxHpChange } from "../effects/max-hp.js";
// Creature flags from their sentences (Effect Engine: Creatures chunk 2c-i).
import { creatureFlagsOf } from "../item/creature-effects.js";
// Level Drain Without a Ledger (RULED 2026-10-09): the book's drain and the NPC's.
import { ledgerComplete, entriesAbove, drainedAbilities, npcAbilityValue, NPC_HP_PER_LEVEL, restoreOrder } from "./level-drain-rules.js";

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
  return creatureFlagsOf(item).levelDrain ?? null;
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
  // An unlinked token's actor too (Level Drain Without a Ledger, 2026-10-09):
  // an NPC victim is usually a spawned creature's token, whose drain is stored
  // on the token, not on a world Actor.
  const synthetic = (game.scenes?.contents ?? [])
    .flatMap(s => s.tokens.contents.filter(t => !t.actorLink && t.actor).map(t => t.actor));
  return [...game.actors.contents, ...synthetic].filter(a => drainsOn(a).some(d => d.drainerId === drainerId));
}

/** Keep one drain on its victim, for the drainer's death to give back. */
async function storeDrain(victim, drainer, record)
{
  const drains = foundry.utils.duplicate(drainsOn(victim));
  drains.push({ drainerId: drainer?.id ?? null, drainerName: drainer?.name ?? "an unknown drainer",
                at: game.time?.worldTime ?? 0, ...record });
  await victim.setFlag("vaarn", "levelDrains", drains);
}

const FLOOR_LINE = `<li><b>Level 1 is the floor.</b> Nothing below it is recorded, and whether a`
  + ` character drained past it still exists is the Referee's call.</li>`;

async function levelLostCard(victim, reason, note, lines)
{
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: victim }),
    content: `<div class="vaarn-chat-card"><h3>Level lost</h3>` + (reason ? `<p>${reason}</p>` : "")
      + `<p><i>${note}</i></p><ul>${lines.join("")}</ul></div>`
  });
}

/**
 * THE BOOK'S DRAIN, for a character whose advancement ledger is not complete
 * (RULED 2026-10-09, Matt): per Level, the Level, 1d8 off maximum HP and a point
 * off each of the three highest base abilities; then any ledger entry above the
 * new Level is lifted out and kept with the drain.
 */
async function drainByTheBook({ drainer, victim, levels, reason })
{
  const record = { kind: "book", levels: 0, hp: 0, abilities: {}, entries: [] };
  const lines = [];
  let refused = false;
  for(let i = 0; i < levels; i++)
  {
    const level = Number(victim.system.level.value);
    if(level <= 1) { refused = true; break; }
    const roll = await new Roll("1d8").evaluate({ async: true });
    const picks = drainedAbilities(victim.system.abilities);
    const oldMax = Number(victim.system.health.max ?? 0);
    const updates = { "system.level.value": level - 1, ...maxHpChange(victim, { add: -roll.total, floor: 1 }) };
    for(const k of picks) updates[`system.abilities.${k}.value`] = Number(victim.system.abilities[k].value) - 1;
    await victim.update(updates);
    const hp = oldMax - Number(victim.system.health.max ?? 0);
    record.levels++;
    record.hp += hp;
    for(const k of picks) record.abilities[k] = (record.abilities[k] ?? 0) + 1;
    lines.push(`<li>Level ${level} &rarr; ${level - 1}: maximum HP &minus;${hp} (1d8: ${roll.total})`
      + (picks.length ? `; ${picks.map(k => ABILITY_LABEL[k]).join(", ")} &minus;1${picks.length < 3 ? " (no other ability above 0)" : ""}`
                      : "; no ability above 0 to lose") + `.</li>`);
  }
  if(record.levels)
  {
    const level = Number(victim.system.level.value);
    const ledger = victim.system.advancement ?? [];
    const above = entriesAbove(ledger, level);
    if(above.length)
    {
      record.entries = foundry.utils.duplicate(above);
      await victim.update({ "system.advancement": ledger.filter(e => Number(e?.level) <= level) });
      lines.push(`<li>The advancement record for Level${above.length === 1 ? "" : "s"} ${above.map(e => e.level).join(", ")}`
        + ` is set aside with the drain.</li>`);
    }
    await storeDrain(victim, drainer, record);
  }
  if(refused) lines.push(FLOOR_LINE);
  await levelLostCard(victim, reason, "No complete advancement record, so the book's drain.", lines);
  return { taken: record.levels, refused };
}

/**
 * AN NPC'S DRAIN (RULED 2026-10-09, Matt): it loses the Level and its
 * level-derived stats follow - 4 maximum HP a Level, every ability set to the
 * new Level - the mirror of applyDrainerGain. Its abilities as they were are
 * kept, so the drainer's death sets them back exactly.
 */
async function drainNpc({ drainer, victim, levels, reason })
{
  const from = Number(victim.system.level?.value ?? 0);
  const taken = Math.max(0, Math.min(levels, from - 1));
  const refused = taken < levels;
  const lines = [];
  if(taken)
  {
    const to = from - taken;
    const abilityValues = Object.fromEntries(Object.entries(victim.system.abilities ?? {}).map(([k, a]) => [k, Number(a?.value ?? 0)]));
    const oldMax = Number(victim.system.health?.max ?? 0);
    const updates = { "system.level.value": to, ...maxHpChange(victim, { add: -NPC_HP_PER_LEVEL * taken, floor: 1 }) };
    for(const k of Object.keys(abilityValues)) updates[`system.abilities.${k}.value`] = npcAbilityValue(to);
    await victim.update(updates);
    const hp = oldMax - Number(victim.system.health?.max ?? 0);
    await storeDrain(victim, drainer, { kind: "npc", levels: taken, hp, abilityValues });
    lines.push(`<li>Level ${from} &rarr; ${to}: maximum HP &minus;${hp}, abilities now ${npcAbilityValue(to)}.</li>`);
  }
  if(refused) lines.push(FLOOR_LINE);
  await levelLostCard(victim, reason, "A creature's Level, and the stats that follow from it.", lines);
  return { taken, refused };
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
  if(!victim || (victim.type !== "character" && victim.type !== "npc"))
    return { taken: 0, refused: true, notACharacter: true };

  const levels = Number(spec?.levels ?? 1);
  // Level Drain Without a Ledger (RULED 2026-10-09, Matt): an NPC by its
  // level-derived stats; a character whose ledger is not complete by the book.
  // A complete ledger drains as below, under the 2026-09-14 ruling.
  if(victim.type === "npc") return drainNpc({ drainer, victim, levels, reason });
  if(!ledgerComplete(victim.system.advancement, victim.system.level?.value))
    return drainByTheBook({ drainer, victim, levels, reason });

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
    await storeDrain(victim, drainer, {
      kind: "ledger",
      entries: removed,
      // Only the Items belonging to the entries that actually went.
      items: Object.fromEntries(removed.flatMap(e =>
        (e.grantedItemIds || []).filter(id => itemData[id]).map(id => [id, itemData[id]]))),
    });
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
    Object.assign(updates, maxHpChange(drainer, { add: hpUp }));
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
    Object.assign(updates, maxHpChange(actor, { add: entry.hp }));
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

/** Give back a book drain exactly: the Levels, the HP, the points, the set-aside ledger entries. */
async function redoBookDrain(actor, d)
{
  const updates = { "system.level.value": Number(actor.system.level.value) + Number(d.levels ?? 0),
                    ...maxHpChange(actor, { add: Number(d.hp ?? 0) }) };
  for(const [key, n] of Object.entries(d.abilities ?? {}))
    updates[`system.abilities.${key}.value`] = Math.min(ABILITY_CAP, Number(actor.system.abilities[key].value) + Number(n));
  await actor.update(updates);
  if(d.entries?.length)
  {
    const ledger = [...foundry.utils.duplicate(actor.system.advancement ?? []), ...d.entries]
      .sort((a, b) => Number(a.level) - Number(b.level));
    await actor.update({ "system.advancement": ledger });
  }
}

/** Give back an NPC drain: the Levels, the HP, and its abilities as they were. */
async function redoNpcDrain(actor, d)
{
  const updates = { "system.level.value": Number(actor.system.level.value) + Number(d.levels ?? 0),
                    ...maxHpChange(actor, { add: Number(d.hp ?? 0) }) };
  for(const [key, v] of Object.entries(d.abilityValues ?? {})) updates[`system.abilities.${key}.value`] = Number(v);
  await actor.update(updates);
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

    // Newest first (level-drain-rules.js restoreOrder). A drain stored before
    // 2026-10-09 has no kind and is a ledger drain.
    let levels = 0;
    for(const d of restoreOrder(mine))
    {
      const kind = d.kind ?? "ledger";
      if(kind === "book") { await redoBookDrain(victim, d); levels += Number(d.levels ?? 0); }
      else if(kind === "npc") { await redoNpcDrain(victim, d); levels += Number(d.levels ?? 0); }
      else for(const entry of d.entries ?? [])
      {
        await redoEntry(victim, entry, d.items);
        levels++;
      }
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
