/**
 * Vaarn Vault Room Contents source data — Vaults/Creating Vaults.md's
 * "Step-by-Step Process" table (the d6/d6 Contents A / Contents B roll for
 * uninhabited vault nodes). Spot-checked against the current vault and
 * found NOT drifted; extracted the normal programmatic way. Used by
 * macros/generate-room-contents.js — found late during work-queue.txt
 * item 1 Phase 3 (see that macro's header for the same "mis-filed as
 * needing the Bestiary helper" correction as macros/generate-settlement.js
 * and macros/generate-gift.js — this one DOES touch the helper, but only
 * for its "Contents A: Lair" branch, not as its core mechanic).
 *
 * Contents A and Contents B are rolled on INDEPENDENT d6s (Creating
 * Vaults.md step 4: "generate contents by rolling d6 twice"), not a
 * shared row — confirmed from the source tool's own two separate
 * rollRowIndex("d6", ...) calls for Contents A and Contents B.
 *
 * Contents A row 6 is "Treasure" and Contents B row 5 "Hint to Hazard or
 * Lair", as CRIMSON HOUND and JADE IBIS both print them; the code had
 * "Exotica" and "Hint to nearby Hazard or Lair", a transcription error.
 * RULED 2026-09-21 (Matt): Treasure rolls on the Treasure Rooms table by
 * the vault's depth.
 *
 * No imports: tools/test-treasure-rooms.mjs reads this file offline.
 */

export const CONTENTS_A = ["Lair", "—", "—", "—", "—", "Treasure"];
export const CONTENTS_B = ["Hazard", "Room Feature", "Trinket", "Fauna or Flora", "Hint to Hazard or Lair", "Special Room"];

/**
 * ROOM TYPE, d12 - foundry-system-index.csv row "Room Type Roll". NOT A BOOK
 * TABLE. RULED 2026-09-27 (Matt), who inferred it as the common OSR method from
 * how often each node type appears on the book's Node Cluster Maps; the book
 * takes each node's type from the map drawn in Creating Vaults step 3 (clear
 * circle empty, filled inhabited, star treasure, hash special). An uninhabited
 * room then rolls Contents A and B above.
 */
export const ROOM_TYPES = [
  { min: 1,  max: 5,  type: "uninhabited",  label: "Uninhabited" },
  { min: 6,  max: 7,  type: "lair",         label: "Lair Room" },
  { min: 8,  max: 9,  type: "treasure",     label: "Treasure Room" },
  { min: 10, max: 11, type: "lairTreasure", label: "Lair Room and Treasure Room" },
  { min: 12, max: 12, type: "special",      label: "Special Room" }
];

/**
 * Treasure Rooms, JADE IBIS 15-09-26 page 115 — Vaults/Treasure Rooms.md,
 * transcribed from Matt's screenshot. d20, one column per depth band. The
 * book's merged bands are repeated on every row, so each column is exactly
 * twenty cells, row 1 first, in the book's own words.
 */
export const TREASURE_ROOM_DEPTHS = ["Depth 1-3", "Depth 4-8", "Depth 9+"];

export const TREASURE_ROOMS =
{
  "Depth 1-3":
  [
    "d6 Trade Goods", "d6 Trade Goods", "d6 Trade Goods", "d6 Trade Goods",
    "Exotica", "Exotica", "Exotica", "Exotica", "Exotica", "Exotica",
    "Exotica", "Exotica", "Exotica", "Exotica", "Exotica",
    "Cybernetic Implant", "Hypergeometric Codex", "Source of Mystic Gift",
    "Elixir", "Roll again from Depth 4-8"
  ],
  "Depth 4-8":
  [
    "Exotica", "Exotica", "Exotica", "Exotica", "Exotica", "Exotica",
    "Exotica", "Exotica", "Exotica",
    "Cybernetic Implant", "Hypergeometric Codex", "Advanced Cybernetic Implant",
    "Source of Mystic Gift", "Elixir", "Exotic Weapon", "Medium Occult Cache",
    "Large Survival Cache", "Small Tomb Cache", "Medium Bandit Cache",
    "Roll again from Depth 9+"
  ],
  "Depth 9+":
  [
    "Exotica", "Exotica", "Exotica", "Exotica", "Exotica", "Exotica",
    "Exotica", "Exotica",
    "Hypergeometric Codex", "Source of Mystic Gift", "Exotic Weapon",
    "Advanced Cybernetic Implant", "Advanced Cybernetic Implant", "Elixir",
    "Large Lair Cache", "Large Occult Cache", "XL Survival Cache",
    "Large Bandit Cache", "Large Tomb Cache", "Small Magnificent Cache"
  ]
};

/** The Treasure Rooms column for a vault depth (Floor). */
export function treasureRoomColumn(depth)
{
  if(depth <= 3) return "Depth 1-3";
  if(depth <= 8) return "Depth 4-8";
  return "Depth 9+";
}

/**
 * The single-Item results, mapped to the treasure-cache.js PER_UNIT kinds.
 * "Exotica" is JADE's one d100 Exotica table, Advanced Exotica in code;
 * "Cybernetic Implant" is the Starting table, as the Treasure Caches'
 * own "Cybernetic Implant" line is.
 */
const ITEM_KINDS =
{
  "Exotica": "exotica",
  "Cybernetic Implant": "implant",
  "Advanced Cybernetic Implant": "advImplant",
  "Hypergeometric Codex": "codex",
  "Source of Mystic Gift": "gift",
  "Elixir": "elixir",
  "Exotic Weapon": "exoticWeapon"
};

/** The book's cache sizes, as treasure-cache-data.js CACHE_SIZES indexes. */
const CACHE_SIZE_INDEX = { "Small": 0, "Medium": 1, "Large": 2, "XL": 3 };

/**
 * What one Treasure Rooms cell asks for. Throws on a cell it cannot read,
 * so a mistyped cell fails the offline test rather than rolling nothing.
 *   { kind: "items", itemKind, count }   count is a die ("d6") or 1
 *   { kind: "cache", type, sizeIndex }
 *   { kind: "reroll", column }
 */
export function treasureRoomEntry(cell)
{
  if(ITEM_KINDS[cell]) return { kind: "items", itemKind: ITEM_KINDS[cell], count: 1 };

  const counted = /^(d\d+) Trade Goods$/.exec(cell);
  if(counted) return { kind: "items", itemKind: "tradeGood", count: counted[1] };

  const cache = /^(Small|Medium|Large|XL) (\w+) Cache$/.exec(cell);
  if(cache) return { kind: "cache", type: cache[2], sizeIndex: CACHE_SIZE_INDEX[cache[1]] };

  const reroll = /^Roll again from (Depth .+)$/.exec(cell);
  if(reroll && TREASURE_ROOMS[reroll[1]]) return { kind: "reroll", column: reroll[1] };

  throw new Error(`Treasure Rooms: cannot read cell "${cell}"`);
}
