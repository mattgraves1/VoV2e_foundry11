/**
 * Vaarn Lair Rooms roll/parse/resolve/spawn engine — split out of
 * macros/generate-lair-rooms.js once macros/generate-room-contents.js
 * needed the exact same cascade for its own "Contents A: Lair" branch
 * (Vaults/Creating Vaults.md's Step-by-Step Process explicitly says
 * inhabited nodes "generate according to the relevant lair tables", same
 * table this module already handles standalone). Ported from
 * npc-generator.html's rollLairRoomsAtDepth/parseLairCreatureMentions/
 * resolveLairCreatureName/renderLairInhabitantCascade.
 */

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function rollDieFormula(formula)
{
  const m = formula.match(/^(\d*)d(\d+)$/i);
  const count = m[1] ? parseInt(m[1]) : 1;
  const sides = parseInt(m[2]);
  let total = 0;
  for(let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
  return total;
}

export function rollLairAtDepth(LAIR_DEPTHS, startDepth)
{
  const redirects = [];
  let depth = startDepth;
  let safety = 0;
  while(safety < 20)
  {
    safety++;
    const col = LAIR_DEPTHS[`Depth ${depth}`];
    const value = pick(col);
    const redirect = /^Roll on Depth (\d+)$/i.exec(value);
    if(redirect)
    {
      redirects.push(`Depth ${depth} → ${value}`);
      depth = parseInt(redirect[1], 10);
      continue;
    }
    return { result: value, redirects, finalDepth: depth };
  }
  return { result: null, redirects, finalDepth: depth };
}

export function parseLairCreatureMentions(resultText)
{
  const text = (resultText || "").trim();
  if(!text || text === "—" || /^roll on depth/i.test(text)) return [];
  return text.split(/\s*\+\s*/).map(part =>
  {
    const m = part.match(/^(\d*d\d+)\s+(.+)$/i);
    if(m) return { raw: part, qty: m[1], name: m[2].trim() };
    return { raw: part, qty: null, name: part.trim() };
  });
}

function singularizeCandidates(name)
{
  const c = [];
  if(/ves$/i.test(name)) { c.push(name.replace(/ves$/i, "f")); c.push(name.replace(/ves$/i, "fe")); }
  if(/ies$/i.test(name)) c.push(name.replace(/ies$/i, "y"));
  if(/men$/i.test(name)) c.push(name.replace(/men$/i, "man"));
  if(/es$/i.test(name)) c.push(name.replace(/es$/i, ""));
  if(/s$/i.test(name) && !/ss$/i.test(name)) c.push(name.replace(/s$/i, ""));
  return c;
}

export function resolveLairCreatureName(name, LAIR_CREATURE_ALIASES, validNames)
{
  const aliasRaw = LAIR_CREATURE_ALIASES[name];
  const primaryCandidates = aliasRaw ? (Array.isArray(aliasRaw) ? aliasRaw : [aliasRaw]) : [name];
  const valid = primaryCandidates.filter(c => validNames.has(c));
  if(valid.length) return pick(valid);
  for(const cand of primaryCandidates)
    for(const s of singularizeCandidates(cand))
      if(validNames.has(s)) return s;
  return null;
}

/**
 * Roll one result at a depth and resolve its creature names, spawning
 * nothing - the Banisher's Summon (Actor Spawning wiring, 2026-09-25), whose
 * caller places the creature beside the Banisher itself. Returns { result,
 * redirects, finalDepth, names: [{ raw, resolvedName }] }.
 */
export async function rollLairCreaturesAtDepth(depth)
{
  const { LAIR_DEPTHS, LAIR_CREATURE_ALIASES } = await import("/systems/vaarn/module/actor/lair-rooms-data.js");
  const { getBestiaryIndex } = await import("/systems/vaarn/module/actor/bestiary-spawn.js");
  const { result, redirects, finalDepth } = rollLairAtDepth(LAIR_DEPTHS, depth);
  const validNames = new Set((await getBestiaryIndex()).map(c => c.name));
  const names = parseLairCreatureMentions(result).map(m =>
    ({ raw: m.raw, resolvedName: resolveLairCreatureName(m.name, LAIR_CREATURE_ALIASES, validNames) }));
  return { result, redirects, finalDepth, names };
}

/**
 * Full cascade for one lair node: roll the depth (following redirects),
 * parse creature mentions out of the final result, roll each mention's
 * quantity, and spawn a matching Bestiary Actor for each one that
 * resolves. Returns { result, redirects, finalDepth, mentions: [{ raw,
 * rolledQty, resolvedName, actor }] } — actor is null for an unresolved
 * mention (caller decides how to report "(not found in Bestiary)").
 * Creates spawned Actors in the given folder (caller resolves/creates it —
 * generate-lair-rooms.js and generate-room-contents.js use different
 * folders for their own reasons).
 */
export async function rollAndSpawnLairInhabitants(depth, folderId)
{
  return spawnPlannedLair(await planLair(depth), folderId);
}

/**
 * The whole lair rolled - the depth (following redirects), its creatures
 * resolved against the Bestiary and each quantity rolled - and nothing
 * spawned. Plain data, so a vault journal keeps it on the room's page and
 * spawns exactly this lair later (Floor Encounter Table, RULED 2026-09-27 by
 * Matt). Returns { result, redirects, finalDepth, mentions: [{ raw, name,
 * rolledQty, resolvedName }] }.
 */
export async function planLair(depth)
{
  const { LAIR_DEPTHS, LAIR_CREATURE_ALIASES } = await import("/systems/vaarn/module/actor/lair-rooms-data.js");
  const { getBestiaryIndex } = await import("/systems/vaarn/module/actor/bestiary-spawn.js");

  const { result, redirects, finalDepth } = rollLairAtDepth(LAIR_DEPTHS, depth);
  const parsedMentions = parseLairCreatureMentions(result);
  if(!parsedMentions.length) return { result, redirects, finalDepth, mentions: [] };

  const validNames = new Set((await getBestiaryIndex()).map(c => c.name));
  const mentions = parsedMentions.map(mention => ({
    raw: mention.raw, name: mention.name,
    rolledQty: mention.qty ? rollDieFormula(mention.qty) : null,
    resolvedName: resolveLairCreatureName(mention.name, LAIR_CREATURE_ALIASES, validNames)
  }));
  return { result, redirects, finalDepth, mentions };
}

/** Spawn a planned lair's creatures into the folder. Returns the plan with each mention's actor (null when unresolved). */
export async function spawnPlannedLair(plan, folderId)
{
  const { spawnNamedCreature } = await import("/systems/vaarn/module/actor/bestiary-spawn.js");
  const mentions = [];
  for(const m of plan.mentions)
    mentions.push({ ...m, actor: m.resolvedName ? await spawnNamedCreature(m.resolvedName, { folder: folderId }) : null });
  return { ...plan, mentions };
}
