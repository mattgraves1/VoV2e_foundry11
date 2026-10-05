/**
 * GENERATED CREATURE SPECIALS (foundry-system-index.csv "Generated Gear and
 * Attacks as Items", step 3, RULED 2026-10-04 by Matt on the rulings sheet
 * "Generated Effects Rulings"). Generate Monster's special attacks and
 * Generate Quantum Daemon's attacks and abilities, as Items that work.
 *
 * Each rolled string is declared here the way an existing Bestiary creature
 * declares the same effect - the precedent named beside it - and the Items
 * come from bestiary-build.js's own buildCreatureItems, so a generated
 * creature's special works exactly as that creature's does. Nothing here
 * reads the string's words: an exact string not in this table gives no Item
 * and stays in the biography (the attacks with plain dice are step 2's, in
 * generated-gear.js).
 *
 * CHUNK 1 (2026-10-04): the rows a creature already declares. CHUNK 2 (same
 * day): Cause Mutation's failed save, a Daemon's immunities as Actor flags, and
 * a note Item per defense. CHUNK 3 (same day): Acid Spray, Mind Control,
 * Summons, Invert Gravity, Misfortune Aura. CHUNK 4 (same day): Parasite,
 * Cause Wound, Destroy Item, Inferior Clones - every rolled string is now
 * handled (tools/test-generated-gear.mjs checks it). Left as text by ruling:
 * Summons Evil Clones of PCs, Immune to Damage Harmed by Healing, Immortal
 * Unless True Name Spoken, Creates a Perfect Clone of Itself.
 *
 * Relative imports, so the test can load it in node.
 */

import { buildCreatureItems } from "./bestiary-build.js";

const ab = (name, text, rest) => ({ abilities: [{ name, carried: false, text, ...rest }] });

/** Exact rolled string -> the Bestiary-shaped declaration it gets. */
export const SPECIAL_DECLARATIONS = {
  // Ability damage on a hit (Daggertrunk's Siphon, Lithling Warrior's Lithifying
  // Ray, Moonbeast (Imago)'s Radioactive Vomit and Lunatic Gaze, Memory Eater,
  // Psyche Leech). Freeze Ray is freezing (RULED: cold resistance applies) and
  // Sickening Blast blast (RULED), as the precedents type theirs.
  "Enfeebling Touch (d6 STR damage)": ab("Enfeebling Touch", "Enfeebling Touch (d6 STR damage)",
    { effects: [{ kind: "abilityDamage", ability: "str", dice: "1d6" }] }),
  "Freeze Ray (d6 DEX damage)": ab("Freeze Ray", "Freeze Ray (d6 DEX damage)",
    { ranged: true, effects: [{ kind: "abilityDamage", ability: "dex", dice: "1d6" }], damageTypes: ["freezing"] }),
  "Sickening Blast (d6 CON damage)": ab("Sickening Blast", "Sickening Blast (d6 CON damage)",
    { ranged: true, effects: [{ kind: "abilityDamage", ability: "con", dice: "1d6" }], damageTypes: ["blast"] }),
  "Memory Leech (d6 INT damage)": ab("Memory Leech", "Memory Leech (d6 INT damage)",
    { effects: [{ kind: "abilityDamage", ability: "int", dice: "1d6" }] }),
  "Psionic Scream (d6 PSY damage)": ab("Psionic Scream", "Psionic Scream (d6 PSY damage)",
    { ranged: true, effects: [{ kind: "abilityDamage", ability: "psy", dice: "1d6" }] }),
  "Ego-Death Ray (d6 EGO damage)": ab("Ego-Death Ray", "Ego-Death Ray (d6 EGO damage)",
    { ranged: true, effects: [{ kind: "abilityDamage", ability: "ego", dice: "1d6" }] }),
  // Damage that heals the attacker by what it dealt (Moonbeast (Nymph)'s Vampiric Tendrils).
  "Lifesteal (d8, heal equal to damage)": ab("Lifesteal", "Lifesteal (d8, heal equal to damage)",
    { effects: [{ kind: "heal" }, { kind: "damage", dice: "1d8" }] }),
  "Lifesteal (d10 damage, heal HP equal to damage)": ab("Lifesteal", "Lifesteal (d10 damage, heal HP equal to damage)",
    { effects: [{ kind: "heal" }, { kind: "damage", dice: "1d10" }] }),
  // A hold with an escape save on the round card (Squishwolf's Swallow, d12 here).
  "Swallow Whole (d12 ongoing, STR Save break free)": ab("Swallow Whole", "Swallow Whole (d12 ongoing, STR Save break free)",
    { effects: [{ kind: "damage", dice: "1d12" }, { kind: "save", ability: "str", mode: "escape", escapeBy: "break free" }],
      ongoing: true, hold: { dice: "1d12", escape: { ability: "str", by: "break free" } } }),
  // Max HP loss on a hit, permanent (RULED) - Entropy Wight's Entropic Touch, d4 here.
  "Entropic Touch (-d4 Max HP)": ab("Entropic Touch", "Entropic Touch (-d4 Max HP)",
    { rollsToHit: true, effects: [{ kind: "maxHP", dice: "1d4", permanent: true }] }),
  // A save against a timed condition (Xeric Triffid's Blinding Spit: an exact match).
  "Cause Blindness (CON Save vs d6 rounds of Blindness)": ab("Cause Blindness", "Cause Blindness (CON Save vs d6 rounds of Blindness)",
    { effects: [{ kind: "save", ability: "con", mode: "resist", vs: "Blindness, d6 rounds", condition: "blind", duration: { amount: "1d6", unit: "round" } }], declaredSpan: null }),
  // Level drain, restored when the drainer dies (Kronophage's Borrowed Time); the Daemon gains nothing.
  "Stolen Time (Lose 1 Lvl, kill Daemon to recover)": {
    abilities: [{ name: "Stolen Time", text: "Stolen Time (Lose 1 Lvl, kill Daemon to recover)", effects: [{ kind: "special", rule: "Stolen Time" }] }],
    rules: [{ name: "Stolen Time", text: "The target loses a Level. Killing the Daemon restores it.", levelDrain: { levels: 1 } }]
  },

  // CHUNK 2. A CON save; a failure adds a random mutation at once (RULED "like
  // precedents" - Resurrection's roll). Metamorphic Sludge's Pseudopod declares the save alone.
  "Cause Mutation (CON Save to resist)": ab("Cause Mutation", "Cause Mutation (CON Save to resist)",
    { effects: [{ kind: "save", ability: "con", mode: "resist", vs: "a random mutation", onFail: { mutation: true } }] }),

  // CHUNK 3. d3 corrosive damage and d3 AV off the target's armour on a hit
  // (Witchgrub's Corrosive Spit, with the loss rolled - avChange lossDice).
  // RULED: corrosive (and so kinetic) is fine. A spray reaches: ranged.
  "Acid Spray (d3 damage + d3 AV decay)": ab("Acid Spray", "Acid Spray (d3 damage + d3 AV decay)",
    { ranged: true, effects: [{ kind: "damage", dice: "1d3", damageType: "corrosive" }, { kind: "avChange", lossDice: "1d3" }], damageTypes: ["corrosive"] }),

  // CHUNK 4. A hit implants a parasite: the named Wound Parasite (one slot,
  // rest-proof, d6 damage a day from its own recurrence until it is removed;
  // removing it heals nothing - RULED). The Flabmonger's wound on a hit.
  "Parasite Implant (Fills 1 slot, d6 damage per day)": ab("Parasite Implant", "Parasite Implant (Fills 1 slot, d6 damage per day)",
    { rollsToHit: true, woundOnHit: { wound: "parasite" }, effects: [] }),
  // The Daemon's seed: the wound Parasite Seed, and a d6 line on the victim's
  // round card each round (the Ghoul's Agony shape) until the Referee removes it.
  "Parasite Seed (Fills 1 slot, d6 damage per round)": {
    abilities: [{ name: "Parasite Seed", carried: false, text: "Parasite Seed (Fills 1 slot, d6 damage per round)", rollsToHit: true,
      woundOnHit: { wound: "parasiteSeed" }, effects: [{ kind: "condition", inflicts: "Parasite Seed", hpTick: { dice: "1d6" } }] }],
    rules: [{ name: "Parasite Seed", text: "A Daemon's seed feeds on its host: d6 damage each round until it is removed. Removing it does not heal the damage it dealt.", declaredSpan: null }]
  },
  // A roll on the Wounds table for a character hit (RULED: characters only; the
  // 2d8 is the negative-HP row) - the Surgical Array's 2d6 roll, as a weapon flag.
  "Cause Wound (roll 2d8 on Wounds table)": ab("Cause Wound", "Cause Wound (roll 2d8 on Wounds table)",
    { rollsToHit: true, woundRoll: "2d8", effects: [] }),
  // A hit rolls d20 and NAMES the item in that slot to the Referee (RULED:
  // adjudicated only - nothing is deleted).
  "Destroy Item (d20 determines slot)": ab("Destroy Item", "Destroy Item (d20 determines slot)",
    { rollsToHit: true, destroyItemRoll: "1d20", effects: [] }),

  // DAEMON ABILITIES
  // CHUNK 4. A control that places d4 copies of the Daemon beside it, 1 HP each
  // (Copy Cat's Clone Cough copies a pack creature; this copies the Daemon itself).
  "Creates d4 Inferior Clones of Itself (1 HP each)": { rules: [{ name: "Inferior Clones", text: "Creates d4 inferior clones of itself, 1 HP each.", cloneSelf: { dice: "1d4", hp: 1 } }] },
  // CHUNK 3. An EGO save; on a failure the target is controlled, a hold with no
  // damage and no expiry, thrown off by an EGO save each round (RULED: "no
  // expiration, let the target save each round").
  "Mind Control (EGO Save to resist)": ab("Mind Control", "Mind Control (EGO Save to resist)",
    { effects: [{ kind: "save", ability: "ego", mode: "resist", vs: "Mind Control",
      onFail: { hold: { effect: "Controlled - it does as the Daemon wills", escape: { ability: "ego", by: "throw off the control" } } } }] }),
  // CHUNK 3. A control that rolls the PARTY'S LOCATION's encounter table and
  // places what it names, not loyal (RULED: the vault level's table in a vault,
  // the region section's in the desert; the Banisher's Summon is the precedent).
  "Summons Monsters (as random encounter)": { rules: [{ name: "Summons Monsters", text: "Calls a creature from the party's surroundings, as a random encounter there.", summonFromLocation: true }] },
  // CHUNK 3. A DEX save; on a failure the target falls towards the sky, a line on
  // its round card every round until the Referee brings it down - the round
  // card counts the rounds fallen and nothing is rolled, as the codex Invert
  // Gravity (RULED: "as Invert Gravity was done for damage").
  "Invert Gravity (DEX Save or fall towards sky)": {
    abilities: [{ name: "Invert Gravity", text: "Invert Gravity (DEX Save or fall towards sky)",
      effects: [{ kind: "save", ability: "dex", mode: "resist", vs: "falling towards the sky", inflicts: "Inverted Gravity", endsBy: "comes down" }] }],
    rules: [{ name: "Inverted Gravity", text: "Gravity is reversed and the target falls towards the sky. When it comes down - or hits anything above - it takes d6 falling damage for each round it fell: the round card counts them, and the Referee judges what it hit.", declaredSpan: null }]
  },
  // CHUNK 3. DIS on every save for every other combatant (RULED: saves only - the
  // new disSaves key, not the Doom Song's, which hits to-hit rolls too).
  "Misfortune Aura (All Saves made with DIS)": { rules: [{ name: "Misfortune Aura", text: "Those near the Daemon make every save with DIS.",
    encounterEffect: { conditions: ["disSaves"], text: "Near the Daemon's Misfortune Aura: every save is made with DIS." } }] },
  // Heals its Level each round (Fleshwarp's Regeneration: an exact match).
  "Regains HP Equal to Level Per Round": { rules: [{ name: "Regains HP", text: "Regains HP equal to its Level at the start of each round.", perRound: true, hpTick: { dice: "@lvl", heal: true } }] },
  // As Cause Blindness, DEX and d4 rounds (Lambent Lynx's Blinding Pelt).
  "Blinding Spit (DEX Save vs d4 rounds Blindness)": ab("Blinding Spit", "Blinding Spit (DEX Save vs d4 rounds Blindness)",
    { effects: [{ kind: "save", ability: "dex", mode: "resist", vs: "Blindness, d4 rounds", condition: "blind", duration: { amount: "1d4", unit: "round" } }], declaredSpan: null }),
  // A per-round button dealing damage to the targeted tokens (Faminebearer's Devour, Thermasaur's Heat Aura).
  "Torment Aura (d6 auto-damage per round)": { rules: [{ name: "Torment Aura", text: "Deals d6 damage to those around it each round, without an attack roll.", perRound: true, hpTick: { dice: "1d6", to: "targets" } }] },
  // Deprived on every other combatant (Doomsinger's Doom Song). RULED: Deprived while in line of sight is acceptable.
  "Sickly Aura (prevents healing)": { rules: [{ name: "Sickly Aura", text: "Those near the Daemon cannot heal.",
    encounterEffect: { conditions: ["Deprived"], text: "Near the Daemon's Sickly Aura: Deprived - no healing." } }] }
};

/**
 * The working Items for a creature's rolled specials. `texts` are the exact
 * rolled strings; any not declared above give nothing. One declaration per
 * distinct string.
 */
export function specialItems(texts, { name = "Creature", level = 0, types = [] } = {})
{
  const abilities = [], rules = [];
  for(const t of new Set(texts))
  {
    const d = SPECIAL_DECLARATIONS[t];
    if(!d) continue;
    abilities.push(...(d.abilities ?? []));
    rules.push(...(d.rules ?? []));
  }
  if(!abilities.length && !rules.length) return [];
  return buildCreatureItems({ name, types, level, abilities, rules });
}

/**
 * CHUNK 2: a Daemon's immunities, in the shape Generate Monster's Special
 * Defenses already have (monster-generator-data.js damageRule / toxinDefense),
 * written on the Actor the same way. RULED 2026-10-04: fire = flame, cold =
 * freezing; Physical is kinetic, and blast and flame do NOT count (a blast or
 * flame attack carries no kinetic property, so the kinetic rule passes it);
 * Fungal Spores is the fungal property (the Xanthous Mycomorph's Spore Spray).
 */
export const DAEMON_DEFENSES = {
  "Immune to Fire": { damageRules: [{ attack: "flame", mult: 0 }] },
  "Immune to Cold": { damageRules: [{ attack: "freezing", mult: 0 }] },
  "Immune to Electrical Weapons": { damageRules: [{ attack: "electrical", mult: 0 }] },
  "Immune to Beam Weapons": { damageRules: [{ attack: "beam", mult: 0 }] },
  "Immune to Poison and Fungal Spores": { damageRules: [{ attack: "tox", mult: 0 }, { attack: "fungal", mult: 0 }], toxinDefense: "immune" },
  "Immune to Physical Damage": { damageRules: [{ attack: "kinetic", mult: 0 }] },
  "Immune to Mystic Gifts and Hypergeometry": { damageRules: [{ attack: "gift", mult: 0 }, { attack: "hypergeometry", mult: 0 }] }
};

/** The Actor flags for a Daemon's rolled abilities: damage rules and Toxin Die defense, one per distinct ability. */
export function daemonDefenseFlags(abilities)
{
  const rules = [], seen = new Set();
  let toxin = null;
  for(const a of abilities)
  {
    const d = DAEMON_DEFENSES[a];
    if(!d || seen.has(a)) continue;
    seen.add(a);
    for(const r of d.damageRules) rules.push({ ...r, rule: a, note: `Ability: ${a}` });
    if(d.toxinDefense) toxin = { toxinDefense: d.toxinDefense, toxinDefenseName: a };
  }
  return { ...(rules.length ? { damageRules: rules } : {}), ...(toxin ?? {}) };
}

/**
 * A NOTE ITEM for a defense that already works as an Actor flag (RULED
 * 2026-10-04: "note item") - Generate Monster's Special Defenses and a Daemon's
 * immunities - so the Referee sees it on the sheet without the biography.
 * It does nothing itself; deleting it does not remove the defense.
 */
export function defenseNoteItem(text, kind = "Special Defense")
{
  return { name: text, type: "item", img: "icons/svg/shield.svg",
    system: { description: `<p><b>${kind}:</b> ${text}.</p><p><i>Applied automatically: the damage roll and the Toxin Die read it from the creature. This Item is a reminder only.</i></p>`,
      slots: 0, quantity: 1, tradeValue: 0, intrinsic: true },
    flags: { vaarn: { defenseNote: true } } };
}

/** The board entry that makes a Quantum Daemon Incorporeal (RULED 2026-10-04): no damage taken or dealt until the Referee removes it. */
export const DAEMON_INCORPOREAL_ENTRY = {
  name: "Incorporeal",
  text: "The Daemon does not actually exist: it cannot be harmed and harms no one. Remove this when Weaponised Normality or another ontological anchoring device forces it to manifest.",
  applied: { conditions: ["incorporeal"] }
};
