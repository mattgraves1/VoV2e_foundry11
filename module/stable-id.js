/**
 * Stable Compendium Ids (foundry-system-index.csv "Stable Compendium Ids",
 * build plan agreed with Matt 2026-09-30).
 *
 * Every update installed from inside Foundry replaces systems/vaarn/packs/,
 * and the system rebuilds each compendium from its data. With random ids, a
 * link to an entry - a @UUID a GM dropped into a journal, a world Actor's link
 * to the creature it came from - stopped resolving after every update. So
 * each built entry takes its id from what it IS: the pack, plus the key that
 * names it there (a creature's name, a macro's or guide page's file). Same
 * data, same id, on every machine and every rebuild.
 *
 * Renaming an entry changes its id; names are the key everywhere else in this
 * system too. tools/test-stable-ids.mjs checks every id is valid and unique
 * within its pack.
 */

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** cyrb53: a fast 53-bit string hash. Deterministic, no randomness, no async. */
function cyrb53(str, seed)
{
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0; i < str.length; i++)
  {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * The fixed 16-character id (Foundry's format: letters and digits) for the
 * entry `key` in pack `pack` ("vaarn.bestiary"). Four seeded hashes, four
 * characters from each.
 */
export function stableId(pack, key)
{
  const text = `${pack}|${key}`;
  let id = "";
  for(let seed = 1; seed <= 4; seed++)
  {
    let n = cyrb53(text, seed);
    for(let i = 0; i < 4; i++) { id += ALPHABET[n % 62]; n = Math.floor(n / 62); }
  }
  return id;
}

/** `docs` with each `_id` set from `keyOf(doc)` - pass `{ keepId: true }` when creating them. */
export function withStableIds(pack, docs, keyOf = d => d.name)
{
  return docs.map(d => ({ ...d, _id: stableId(pack, keyOf(d)) }));
}
