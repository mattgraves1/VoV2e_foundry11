/**
 * Vaarn Bestiary spawn/clone helper — work-queue.txt item 1 Phase 3's
 * shared building block. Everything else in Phase 3 (NPC Generator,
 * table-level companion-creature spawns, Lair Rooms, Minor Factions/
 * Oracle's Sanctum's NPC-companion roll) depends on this: given a
 * creature name, clone that Actor out of the "Vaarn Bestiary" compendium
 * (vaarn.bestiary) into the world, optionally renamed and with extra
 * biography text prepended (e.g. a rolled personality for an NPC).
 *
 * Dynamically imported by macros, same pattern as every other shared
 * module in this project (chargen-app.js's d/pick/normalizeDamageDice
 * etc.) — Foundry macros run as plain pasted scripts, not ES modules, so
 * a static top-level `import` doesn't work from inside a macro itself,
 * but dynamic import() does.
 */

const PACK_ID = "vaarn.bestiary";

/**
 * The pets pack — Pet Stat Block Import, 2026-09-13.
 *
 * Pets are built by the same builder into the same document shape, so the
 * clone path below works on them unchanged; only the pack differs. Threading
 * a pack id through the existing helpers was preferred to a second copy of
 * them for the reason bestiary-build.js's own header gives about two copies of
 * one behaviour: they agree until one is edited.
 */
const PETS_PACK_ID = "vaarn.pets";
const STEEDS_PACK_ID = "vaarn.steeds";

export function getBestiaryPack(packId = PACK_ID)
{
  const pack = game.packs.get(packId);
  if(!pack) throw new Error(`Compendium "${packId}" not found — the Vaarn ${PACK_LABEL[packId] ?? "Bestiary"} compendium must exist (see work-queue.txt item 2).`);
  return pack;
}

/** Label per pack, so the not-found error names the right compendium. */
const PACK_LABEL = { [PACK_ID]: "Bestiary", [PETS_PACK_ID]: "Pets", [STEEDS_PACK_ID]: "Steeds" };

export function getPetsPack()
{
  return getBestiaryPack(PETS_PACK_ID);
}

export function getSteedsPack()
{
  return getBestiaryPack(STEEDS_PACK_ID);
}

/**
 * Foundry's compendium index only has name/type/img by default — request
 * the extra system fields every Phase 3 consumer needs to filter on
 * (level, HP, creature types) without loading all ~155 full Actor
 * documents just to pick one.
 */
export async function getBestiaryIndex(packId = PACK_ID)
{
  const pack = getBestiaryPack(packId);
  return pack.getIndex({ fields: ["system.level.value", "system.health.max", "system.creatureTypes"] });
}

/** The same index over the pets pack. */
export async function getPetsIndex()
{
  return getBestiaryIndex(PETS_PACK_ID);
}

/** And over the steeds pack. */
export async function getSteedsIndex()
{
  return getBestiaryIndex(STEEDS_PACK_ID);
}

/**
 * Ports npc-generator.html's pickBestiaryStatblock: prefer an exact-name
 * match from `ancestryMap[ancestry].preferred` first, fall back to any
 * creature whose creatureTypes overlaps `ancestryMap[ancestry].typeTokens`,
 * then narrow to an exact level match if one was given (falling back to
 * "closest available" — i.e. the untouched pool — if no exact level
 * exists, same as the source tool). Creatures with no level/HP set at all
 * (Echopraxist's deliberately fully-variable stat block) are excluded from
 * the pool entirely, same as the source tool's `c.level && c.hp` filter.
 */
export function pickBestiaryStatblock(index, ancestryMap, ancestry, knownLevel, preferAncestrySpecific)
{
  const map = ancestryMap[ancestry];
  if(!map) return null;

  const valid = index.filter(c => c.system?.level?.value && c.system?.health?.max);

  let pool = [];
  let source = "type-matched";
  if(preferAncestrySpecific && map.preferred.length)
  {
    pool = valid.filter(c => map.preferred.includes(c.name));
    if(pool.length) source = "ancestry-specific";
  }
  if(pool.length === 0)
    pool = valid.filter(c => map.typeTokens.some(t => c.system.creatureTypes?.[t]));

  let levelNote = "";
  if(knownLevel !== null && knownLevel !== undefined && knownLevel !== "")
  {
    const exact = pool.filter(c => String(c.system.level.value) === String(knownLevel));
    if(exact.length) pool = exact;
    else levelNote = " (closest available)";
  }

  if(pool.length === 0) return null;
  return { entry: pool[Math.floor(Math.random() * pool.length)], levelNote, source };
}

/**
 * Look up a Bestiary compendium Actor by exact name and clone it into a
 * real world Actor. Used both by pickBestiaryStatblock's result (pass its
 * `.entry`) and by any "spawn this specific named creature" caller (Bandit
 * Camp, Faa Nomad Camp, Science-Mystic's Abode, Hegemony Outpost, Lair
 * Rooms) that already knows exactly which creature it wants.
 */
export async function cloneBestiaryActorToWorld(indexEntry, { rename, extraBio, folder, packId } = {})
{
  const pack = getBestiaryPack(packId || PACK_ID);
  const sourceActor = await pack.getDocument(indexEntry._id);
  const data = sourceActor.toObject();
  delete data._id;
  if(rename) data.name = rename;
  if(extraBio) data.system.biography = `${extraBio}${data.system.biography || ""}`;
  if(folder) data.folder = folder;

  const actorCls = getDocumentClass("Actor");
  return actorCls.create(data);
}

/**
 * Convenience wrapper for the common "I know the creature's exact name,
 * just spawn it" case (no statblock picking needed) — looks the name up
 * in the index itself so callers don't need to fetch the index first.
 */
export async function spawnNamedCreature(name, options = {})
{
  const packId = options.packId || PACK_ID;
  const index = await getBestiaryIndex(packId);
  const entry = index.find(c => c.name === name);
  if(!entry) return null;
  return cloneBestiaryActorToWorld(entry, { ...options, packId });
}

/**
 * Spawn `count` copies of a Bestiary creature beside an actor: the Broodling
 * Broth's d6 Broodlings around the drinker, the Brood Mother's Brood around
 * her (2026-09-24). Returns the Actors, or null when the name is not in the
 * pack - the same null-on-a-miss contract as spawnNamedCreature.
 *
 * Numbered "<name> 1", "<name> 2" so the clutch can be told apart. Tokens go
 * in a ring around the actor's token on its scene, one grid square out, when
 * it has one; an actor with no token gets Actors and no tokens. `loyal` gives
 * the copies the actor's owners, so a player whose character birthed them can
 * move them - the loyalty itself stays the table's.
 */
export async function spawnBeside(actor, name, count, { loyal = false, folder } = {})
{
  const packId = PACK_ID;
  const index = await getBestiaryIndex(packId);
  const entry = index.find(c => c.name === name);
  if(!entry) return null;
  const n = Math.max(0, Number(count) || 0);
  // Numbering continues from the highest "<name> N" already in the world, so
  // a second clutch does not repeat the first's names (Group 348).
  const taken = game.actors.map(a => a.name.match(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d+)$`))).filter(Boolean).map(m => Number(m[1]));
  const start = taken.length ? Math.max(...taken) : 0;
  const token = actor?.getActiveTokens?.(false, true)?.[0] ?? null;
  const scene = token?.parent ?? null;
  const grid = scene?.grid?.size ?? 100;
  const spawned = [];
  for(let i = 0; i < n; i++)
  {
    const created = await cloneBestiaryActorToWorld(entry, { rename: `${name} ${start + i + 1}`, folder, packId });
    if(loyal && actor?.ownership) await created.update({ ownership: { ...actor.ownership } });
    if(scene)
    {
      const angle = (2 * Math.PI * i) / Math.max(n, 1);
      const x = Math.round(token.x + Math.cos(angle) * grid);
      const y = Math.round(token.y + Math.sin(angle) * grid);
      const tokenData = (await created.getTokenDocument({ x, y })).toObject();
      tokenData.actorLink = true;
      await scene.createEmbeddedDocuments("Token", [tokenData]);
    }
    spawned.push(created);
  }
  return spawned;
}

/**
 * Spawn a pet by name. A thin wrapper rather than a second implementation:
 * everything above already takes the pack as a parameter, so this only names
 * which one. Returns null on an unknown name, same as spawnNamedCreature —
 * a pet that is not in the roster is not an error, it is a miss.
 */
export async function spawnNamedPet(name, options = {})
{
  return spawnNamedCreature(name, { ...options, packId: PETS_PACK_ID });
}

/** Spawn a steed by name. Same wrapper, same null-on-a-miss contract. */
export async function spawnNamedSteed(name, options = {})
{
  return spawnNamedCreature(name, { ...options, packId: STEEDS_PACK_ID });
}

/**
 * A PC who BECOMES a creature - Hiveyhump's Hiveyman at 0 EGO, the Gitch's
 * Gitchghast with every slot crystal (Actor Spawning wiring, RULED 2026-09-25
 * by Matt: "take the spot"). Each of the actor's tokens on a scene is replaced
 * by a token of the new creature at the same place. The PC Actor itself is
 * NEVER deleted - only its tokens leave the map - so the character sheet and
 * everything on it survives for the table to decide about.
 * Returns the created Actor, or null when the name is not in the pack.
 */
export async function spawnInPlace(actor, name)
{
  const entry = (await getBestiaryIndex()).find(c => c.name === name);
  if(!entry) return null;
  const created = await cloneBestiaryActorToWorld(entry, { rename: `${name} (${actor.name})` });
  for(const token of actor.getActiveTokens?.(false, true) ?? [])
  {
    const scene = token.parent;
    const tokenData = (await created.getTokenDocument({ x: token.x, y: token.y })).toObject();
    tokenData.actorLink = true;
    await scene.createEmbeddedDocuments("Token", [tokenData]);
    await scene.deleteEmbeddedDocuments("Token", [token.id]);
  }
  return created;
}

/**
 * The rule Item a creature splits by, if it has one - the Fractalisk's Self
 * Similar, the Glittersludge's Adaptive Fissile Material.
 */
export function splitRuleOf(actor)
{
  return actor?.items?.find?.(i => i.flags?.vaarn?.splitOnDamage) ?? null;
}

/**
 * Offer the Referee a split after a creature took damage (RULED 2026-09-25,
 * Matt: a card, not an automatic split). `causes` are the attack properties
 * that landed; a rule's `unlessTypes` withholds the offer - hypergeometric
 * damage does not split a Fractalisk. Whispered: a split is the Referee's.
 */
export async function offerSplit(actor, causes, hpAfter)
{
  const rule = splitRuleOf(actor);
  const spec = rule?.flags?.vaarn?.splitOnDamage;
  if(!spec) return null;
  if((spec.unlessTypes ?? []).some(t => causes.includes(t))) return null;
  const what = spec.halfLevel
    ? `a new ${actor.name.replace(/ \d+$/, "")} at half its Level${spec.immuneToCause ? `, immune to ${causes.join(" and ")}` : ""}`
    : `a copy at the same ${hpAfter} HP`;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    content: `<b>${rule.name}</b>: ${actor.name} was damaged (${causes.join(", ")}) and can split — ${what}.`
      + `<button type="button" class="vaarn-split" data-actor-id="${actor.id}" data-causes="${causes.join(",")}"`
      + ` data-hp="${hpAfter}">Split ${actor.name}</button>`
  });
}

/**
 * Make the split: a copy OF THE DAMAGED ACTOR, not of the pack original, so a
 * Glittersludge's inherited immunities pass to its descendants as the book
 * says. The Fractalisk's copy has the parent's lowered HP; the Glittersludge's
 * is half the parent's Level at the Level's HP, immune to what birthed it.
 */
export async function performSplit(actor, causes, hpAfter)
{
  const spec = splitRuleOf(actor)?.flags?.vaarn?.splitOnDamage;
  if(!spec) return null;
  const { computeHP } = await import("./hp-by-level.js");
  const data = actor.toObject();
  delete data._id;
  const base = actor.name.replace(/ \d+$/, "");
  const taken = game.actors.map(a => a.name.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d+)$`))).filter(Boolean).map(m => Number(m[1]));
  data.name = `${base} ${(taken.length ? Math.max(...taken) : 1) + 1}`;
  if(spec.halfLevel)
  {
    const level = Math.floor(Number(actor.system.level?.value ?? 0) / 2);
    const hp = computeHP(level);
    foundry.utils.setProperty(data, "system.level.value", level);
    foundry.utils.setProperty(data, "system.health.value", hp);
    foundry.utils.setProperty(data, "system.health.max", hp);
  }
  else foundry.utils.setProperty(data, "system.health.value", Number(hpAfter));
  if(spec.immuneToCause)
  {
    const had = actor.flags?.vaarn?.immuneTo ?? [];
    foundry.utils.setProperty(data, "flags.vaarn.immuneTo", [...new Set([...had, ...causes])]);
    foundry.utils.setProperty(data, "flags.vaarn.immuneToRule", splitRuleOf(actor).name);
  }
  const created = await getDocumentClass("Actor").create(data);
  const token = actor.getActiveTokens?.(false, true)?.[0] ?? null;
  if(token)
  {
    const grid = token.parent?.grid?.size ?? 100;
    const tokenData = (await created.getTokenDocument({ x: token.x + grid, y: token.y })).toObject();
    tokenData.actorLink = true;
    await token.parent.createEmbeddedDocuments("Token", [tokenData]);
  }
  return created;
}

/**
 * Start the day's reminder that spawned retainers wither - the Neobloom's
 * Sapling Retainers serve "for the rest of the day" (Actor Spawning wiring,
 * RULED 2026-09-25 by Matt: a reminder, not a deletion). One GM card naming
 * them; the flag is cleared so the reminder is given once. Returns the names.
 */
export async function announceWithering()
{
  const due = (game.actors ?? []).filter(a => a.getFlag?.("vaarn", "withersAtDayStart"));
  if(!due.length) return [];
  const lines = due.map(a => { const w = a.getFlag("vaarn", "withersAtDayStart"); return `<li>${a.name} (${w.grower}'s ${w.boon})</li>`; });
  await ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    content: `<p><b>Withered overnight</b> - remove them from the table:</p><ul>${lines.join("")}</ul>` });
  for(const a of due) await a.unsetFlag("vaarn", "withersAtDayStart");
  return due.map(a => a.name);
}
