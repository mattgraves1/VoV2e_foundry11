/**
 * Trade Goods (Treasure/Trade Goods.md), d100, 50 rows. Built for
 * work-queue.txt item 1.2.
 *
 * `quantityFormula` is the row's own "Found" column, transcribed as a
 * real Foundry Roll formula (e.g. "D6 chunks" -> "1d6"; "D20 x 100 grubs"
 * -> "1d20" with `multiplier: 100` applied separately, since Foundry's
 * Roll class doesn't need the "x100" folded into the formula string
 * itself). `unit` is the found item's own name for the created Item
 * (e.g. "chunks", "hides") — plural, matches the book's own wording.
 *
 * `valueFormula` is the row's own "Trade Value" column's numeric/dice
 * part ONLY (before "per X") — e.g. "1 per chunk" -> "1"; "D4 per jewel"
 * -> "1d4". `perUnitCount` is how many found units that rolled value
 * covers (default 1; only Dried Grubs/Olives/Shells price by the
 * hundred/twenty rather than per single unit — see each entry below).
 *
 * `slotsPerUnit` is what ONE of the thing costs in item slots, present only
 * on the 12 entries whose own printed note gives a figure (Per-Unit Slot
 * Weight, 2026-09-19). Everything else is the default 1, which is Barter's
 * own baseline: "any object that occupies one item slot has a Trade Value
 * of 1". The three shapes the notes come in all reduce to one number -
 * "Bulky (2 slots per hide)" is 2, "stack 100 to a slot" is 0.01, and
 * "Weightless (no slot weight)" is 0.
 *
 * IT IS WRITTEN OUT RATHER THAN PARSED FROM `notes`. The note is prose and
 * changes with an edition; a declared number is the test a mechanism reads,
 * the same reasoning ruleItems records for perRound and watchdog.
 *
 * NOT THE SAME NUMBER AS `perUnitCount`, and the two are easy to confuse:
 * that one is the PRICING group and this is the STACKING weight. Dried Grubs
 * price per 100 and stack per 500, so they differ there by a factor of five.
 *
 * DESIGN CALL (2026-08-23, work-queue item 1.2): rather than try to
 * collapse "quantity found" and "value per group of N" into one number
 * silently, the created Item's system.quantity is the number of PRICED
 * GROUPS (raw found count / perUnitCount, rounded), not the raw unit
 * count — so the sheet's own Quantity x Trade Value fields multiply out
 * to the stack's real total value with no hidden math, and the raw
 * per-unit count/label still appears in the description as flavor text.
 * For the 47 rows where perUnitCount is 1 this is a no-op (groups ==
 * units); it only changes anything for rows 10/26/42 below.
 */

export const TRADE_GOODS = [
  { range: [1, 2], name: "Ambergris", quantityFormula: "1d6", unit: "chunks", valueFormula: "1", perUnitCount: 1, valueText: "1 per chunk", notes: "Pungent, flammable" },
  { range: [3, 4], name: "Animal Hides", quantityFormula: "1d4", unit: "hides", valueFormula: "1", perUnitCount: 1, valueText: "1 per hide", slotsPerUnit: 2, notes: "Bulky (2 slots per hide)" },
  { range: [5, 6], name: "Autarchy Coins", quantityFormula: "1d10", unit: "purses", valueFormula: "1", perUnitCount: 1, valueText: "1 per purse", notes: "Noisy" },
  { range: [7, 8], name: "Beer", quantityFormula: "1d20", unit: "bottles", valueFormula: "1", perUnitCount: 1, valueText: "1 per bottle", notes: "Fragile" },
  { range: [9, 10], name: "Bells", quantityFormula: "1d8", unit: "bells", valueFormula: "1", perUnitCount: 1, valueText: "1 per bell", notes: "Noisy" },
  { range: [11, 12], name: "Carpets", quantityFormula: "1d4", unit: "carpets", valueFormula: "1d4", perUnitCount: 1, valueText: "D4 per carpet", slotsPerUnit: 2, notes: "Bulky (2 slots per carpet), flammable" },
  { range: [13, 14], name: "Cheese", quantityFormula: "1d6", unit: "wheels", valueFormula: "1", perUnitCount: 1, valueText: "1 per wheel", notes: "Pungent, perishable" },
  { range: [15, 16], name: "Coffee", quantityFormula: "1d6", unit: "bags", valueFormula: "1", perUnitCount: 1, valueText: "1 per bag", notes: "Perishable" },
  { range: [17, 18], name: "Dried Cactus", quantityFormula: "1d8", unit: "sacks", valueFormula: "1", perUnitCount: 1, valueText: "1 per sack", notes: "Flammable" },
  { range: [19, 20], name: "Dried Grubs", quantityFormula: "1d20", unit: "grubs", multiplier: 100, valueFormula: "1", perUnitCount: 100, valueText: "1 per 100 grubs", slotsPerUnit: 0.002, notes: "Stack 500 to a slot" },
  { range: [21, 22], name: "Edible Fungus", quantityFormula: "1d6", unit: "sacks", valueFormula: "1", perUnitCount: 1, valueText: "1 per sack", notes: "Perishable, edible" },
  { range: [23, 24], name: "Eggs", quantityFormula: "1d8", unit: "eggs", valueFormula: "1", perUnitCount: 1, valueText: "1 per egg", notes: "Fragile, may hatch" },
  { range: [25, 26], name: "Erotic Statuettes", quantityFormula: "1d6", unit: "statuettes", valueFormula: "1", perUnitCount: 1, valueText: "1 per statuette", notes: "Cause public consternation" },
  { range: [27, 28], name: "Gold", quantityFormula: "1d6", unit: "ingots", valueFormula: "5", perUnitCount: 1, valueText: "5 per ingot", notes: "" },
  { range: [29, 29], name: "Hard Light Shard", quantityFormula: "1d4", unit: "shards", valueFormula: "3", perUnitCount: 1, valueText: "3 per shard", slotsPerUnit: 0, notes: "Weightless (no slot weight), luminous" },
  { range: [30, 31], name: "Honey", quantityFormula: "1d8", unit: "jars", valueFormula: "1", perUnitCount: 1, valueText: "1 per jar", notes: "Fragile" },
  { range: [32, 33], name: "Incense", quantityFormula: "1d8", unit: "bundles", valueFormula: "1", perUnitCount: 1, valueText: "1 per bundle", notes: "Pungent" },
  { range: [34, 35], name: "Jewels", quantityFormula: "1d4", unit: "jewels", valueFormula: "1d6", perUnitCount: 1, valueText: "D6 per jewel", slotsPerUnit: 0.2, notes: "Stack 5 to a slot" },
  { range: [36, 36], name: "Live Rare Fish", quantityFormula: "1", unit: "fish", valueFormula: "1d6", perUnitCount: 1, valueText: "d6 per fish", notes: "Alive, kept in tank, must be fed" },
  { range: [37, 38], name: "Lizardskin", quantityFormula: "1d6", unit: "skins", valueFormula: "1", perUnitCount: 1, valueText: "1 per skin", notes: "" },
  { range: [39, 40], name: "Maps", quantityFormula: "1d3", unit: "maps", valueFormula: "1d4", perUnitCount: 1, valueText: "D4 per map", notes: "Flammable; 1-in-6 lead to a hidden vault" },
  // Face Armour Slot, RULED 2026-09-27 (Matt): worn on the face, +1 AV, and
  // a roll is one stack. The note arrived in CRIMSON HOUND and was missed.
  { range: [41, 42], name: "Masks", quantityFormula: "1d8", unit: "masks", valueFormula: "1", perUnitCount: 1, valueText: "1 per mask", notes: "+1 AV when worn", armorType: { armorSlot: "face", avBonus: 1 } },
  { range: [43, 44], name: "Memory Crystals", quantityFormula: "1d8", unit: "crystals", valueFormula: "1", perUnitCount: 1, valueText: "1 per crystal", notes: "2-in-6 chance data corrupted and worthless" },
  { range: [45, 45], name: "Merchant's Credit Seal", quantityFormula: "1", unit: "seal", valueFormula: "2d20", perUnitCount: 1, valueText: "2d20 per seal", notes: "Only redeemable in Gnomon" },
  { range: [46, 47], name: "Munitions", quantityFormula: "1d4", unit: "shells", valueFormula: "1", perUnitCount: 1, valueText: "1 per shell", notes: "May explode" },
  { range: [48, 49], name: "Olives", quantityFormula: "1d20", unit: "olives", multiplier: 100, valueFormula: "1", perUnitCount: 100, valueText: "1 per 100 olives", slotsPerUnit: 0.01, notes: "Perishable, stack 100 to a slot" },
  { range: [50, 51], name: "Ore", quantityFormula: "1d10", unit: "sacks", valueFormula: "1", perUnitCount: 1, valueText: "1 per sack", slotsPerUnit: 2, notes: "Heavy (2 slots per sack)" },
  { range: [52, 53], name: "Parchment", quantityFormula: "1d8", unit: "sheafs", valueFormula: "1", perUnitCount: 1, valueText: "1 per sheaf", slotsPerUnit: 0.1, notes: "Flammable, stack 10 to a slot" },
  { range: [54, 55], name: "Perfume", quantityFormula: "1d6", unit: "bottles", valueFormula: "1d4", perUnitCount: 1, valueText: "d4 per bottle", notes: "Pungent, fragile" },
  { range: [56, 57], name: "Pickled Vegetables", quantityFormula: "1d10", unit: "jars", valueFormula: "1", perUnitCount: 1, valueText: "1 per jar", notes: "Fragile, edible" },
  { range: [58, 59], name: "Poetry Scrolls", quantityFormula: "1d8", unit: "scrolls", valueFormula: "1", perUnitCount: 1, valueText: "1 per scroll", notes: "Delicate, flammable" },
  { range: [60, 61], name: "Poison", quantityFormula: "1d6", unit: "doses", valueFormula: "1d4", perUnitCount: 1, valueText: "D4 per dose", notes: "Fragile, lethal, dubious legality in civilisation" },
  { range: [62, 63], name: "Pottery", quantityFormula: "1d6", unit: "pots", valueFormula: "1", perUnitCount: 1, valueText: "1 per pot", notes: "Fragile" },
  { range: [64, 66], name: "Preserved Fish", quantityFormula: "1d10", unit: "fish", valueFormula: "1", perUnitCount: 1, valueText: "1 per fish", notes: "Pungent, perishable, attracts predators" },
  { range: [67, 69], name: "Preserved Fruit", quantityFormula: "1d10", unit: "sacks", valueFormula: "1", perUnitCount: 1, valueText: "1 per sack", notes: "Perishable" },
  { range: [70, 73], name: "Preserved Meat", quantityFormula: "1d10", unit: "cuts", valueFormula: "1", perUnitCount: 1, valueText: "1 per cut", notes: "Pungent, perishable, attracts predators" },
  { range: [74, 75], name: "Rare Flowers", quantityFormula: "1d12", unit: "flowers", valueFormula: "1", perUnitCount: 1, valueText: "1 per flower", notes: "Fragile, perishable" },
  { range: [76, 76], name: "Rare Tree Sapling", quantityFormula: "1", unit: "sapling", valueFormula: "2d6", perUnitCount: 1, valueText: "2d6 per sapling", notes: "Alive, must be watered daily, flammable" },
  { range: [77, 79], name: "Rare Wood", quantityFormula: "1d10", unit: "logs", valueFormula: "1", perUnitCount: 1, valueText: "1 per log", slotsPerUnit: 2, notes: "Bulky (2 slots per log), flammable" },
  { range: [80, 81], name: "Religious Texts", quantityFormula: "1d6", unit: "texts", valueFormula: "1", perUnitCount: 1, valueText: "1 per text", notes: "Flammable, delicate; 1-in-6 chance heretical" },
  { range: [82, 83], name: "Sandworm Baleen", quantityFormula: "1d8", unit: "sheafs", valueFormula: "1", perUnitCount: 1, valueText: "1 per sheaf", notes: "Fragile" },
  { range: [84, 85], name: "Shells", quantityFormula: "1d100", unit: "shells", valueFormula: "1", perUnitCount: 20, valueText: "1 per 20 shells", slotsPerUnit: 0.01, notes: "Fragile, stack 100 to a slot" },
  { range: [86, 87], name: "Silk", quantityFormula: "1d8", unit: "bales", valueFormula: "1", perUnitCount: 1, valueText: "1 per bale", slotsPerUnit: 2, notes: "Bulky (2 slots per bale), flammable" },
  { range: [88, 90], name: "Silver", quantityFormula: "1d6", unit: "ingots", valueFormula: "3", perUnitCount: 1, valueText: "3 per ingot", notes: "" },
  { range: [91, 92], name: "Sky Iron", quantityFormula: "1d6", unit: "chunks", valueFormula: "1", perUnitCount: 1, valueText: "1 per chunk", slotsPerUnit: 2, notes: "Heavy (2 slots per chunk)" },
  { range: [93, 94], name: "Sugar", quantityFormula: "1d6", unit: "bags", valueFormula: "1", perUnitCount: 1, valueText: "1 per bag", notes: "Attracts insects" },
  { range: [95, 95], name: "Syntax Disc", quantityFormula: "1d6", unit: "discs", valueFormula: "1", perUnitCount: 1, valueText: "1 per disc", notes: "1-in-6 chance nonfunctional" },
  { range: [96, 96], name: "Synth Parts", quantityFormula: "1d8", unit: "parts", valueFormula: "1", perUnitCount: 1, valueText: "1 per part", notes: "Can be used to heal Synths" },
  { range: [97, 98], name: "Whiskey", quantityFormula: "1d6", unit: "bottles", valueFormula: "1", perUnitCount: 1, valueText: "1 per bottle", notes: "Fragile, flammable" },
  { range: [99, 100], name: "Wine", quantityFormula: "1d6", unit: "bottles", valueFormula: "1d4", perUnitCount: 1, valueText: "d4 per bottle", notes: "Fragile" }
];
