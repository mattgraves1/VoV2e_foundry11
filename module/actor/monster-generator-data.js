/**
 * Vaarn Monster Generator source data — Bestiary/Monster Generators.md.
 *
 * RETRANSCRIBED 2026-09-17 from JADE IBIS 15-09-26 (Matt's screenshot of the
 * Creature Generator, printed pp. 223-224): the type column is now a SINGLE
 * type rolled twice, AV is a bare number, Level tops out at 10, Encountered
 * reads Solo, and the third Attacks column is a Special Defense - the
 * Psychic Power column is gone; psychic creatures generate a Mystic Gift
 * instead. The note below describes the 2026-08-21 CRIMSON transcription.
 *
 * IMPORTANT: CORE_STATS and ATTACKS were transcribed BY HAND directly from
 * the current vault file (2026-08-21), NOT extracted from npc-generator.
 * html's embedded DATA JSON like every other Phase 1-3 data file in this
 * project. Cross-checking the tool's JSON against the vault while building
 * this found that the tool's copy of BOTH these tables still has the same
 * range-collapse transcription bug this project already found and fixed in
 * the VAULT once before, for this exact file (see work-queue.txt's
 * "Check three more vault tables with the range-collapse signature" note,
 * 2026-08-18) — the tool's JSON was apparently never regenerated after
 * that fix, so it's stale for these two tables specifically. Confirmed by
 * literally diffing row-by-row: the tool's Level/HP columns run one row
 * "behind" its own Type/AV/Morale/Encountered columns (e.g. its row 2 has
 * Level/HP from the vault's row 1 paired with Type/AV/Morale/Encountered
 * from the vault's row 2), and its Attack column has the same blank-cell
 * collapse Attacks row 4 already had before the historical fix. Physical
 * Form and Appearance & Behaviour tables have no merged/spanning cells and
 * were spot-checked clean against the tool's JSON, so those two are
 * extracted the normal programmatic way.
 *
 * CORE_STATS.hp confirmed 2026-08-21 against Bestiary/Bestiary.md's Stat
 * Block Reference, which states the game's general rule explicitly: "To
 * calculate average HP, multiply the Level by 4 (or 5 if you're feeling
 * mean)." Every row here follows HP = Level × 4 exactly (Level 0 gets the
 * book's own 1 HP floor) — this table isn't just internally consistent,
 * it's the documented canonical rule other Phase 3 generators (module/
 * actor/hp-by-level.js) derive HP from when the book gives them a Level
 * but no HP of their own (Quantum Daemons, Rival Adventurers).
 *
 * CORE_STATS: [{ level, hp, type, av, morale, encountered }, ...20 rows].
 *   `type` can be compound ("Biological / Synthetic") — buildMonster only
 *   uses the first slash-separated part to look up a Physical Form table.
 * ATTACKS: [{ attack, special, psychic }, ...20 rows], one shared roll.
 * PHYSICAL_FORMS: { typeKey: [...20 forms] }, keyed by CORE_STATS' primary
 *   type strings (Biological/Synthetic/Fungal/Hypergeometric/Mineral/
 *   Outsider).
 * APPEARANCE_BEHAVIOUR: { Hue/Texture/Behaviour/Habitat: [...20 values]
 *   each }, each column rolled independently (confirmed from
 *   npc-generator.html's buildMonster: `pick(ab["Hue"])` etc, NOT a shared
 *   row roll like CORE_STATS/ATTACKS).
 */

export const CORE_STATS = [
  { level: 0, hp: 1, type: "Biological", av: "09", morale: "Always Flees", encountered: "3d6" },
  { level: 0, hp: 1, type: "Synthetic", av: "10", morale: "+1", encountered: "2d6" },
  { level: 1, hp: 4, type: "Fungal", av: "10", morale: "+2", encountered: "d12" },
  { level: 1, hp: 4, type: "Hypergeometric", av: "11", morale: "+2", encountered: "d10" },
  { level: 1, hp: 4, type: "Psychic", av: "11", morale: "+3", encountered: "d8" },
  { level: 2, hp: 8, type: "Biological", av: "11", morale: "+3", encountered: "d8" },
  { level: 2, hp: 8, type: "Synthetic", av: "12", morale: "+4", encountered: "d8" },
  { level: 2, hp: 8, type: "Fungal", av: "12", morale: "+4", encountered: "d8" },
  { level: 3, hp: 12, type: "Hypergeometric", av: "12", morale: "+5", encountered: "d8" },
  { level: 3, hp: 12, type: "Outsider", av: "12", morale: "+5", encountered: "d8" },
  { level: 4, hp: 16, type: "Mineral", av: "13", morale: "+6", encountered: "d6" },
  { level: 4, hp: 16, type: "Biological", av: "13", morale: "+6", encountered: "d6" },
  { level: 5, hp: 20, type: "Synthetic", av: "14", morale: "+7", encountered: "d6" },
  { level: 5, hp: 20, type: "Fungal", av: "14", morale: "+7", encountered: "d6" },
  { level: 6, hp: 24, type: "Hypergeometric", av: "15", morale: "+8", encountered: "d4" },
  { level: 6, hp: 24, type: "Biological", av: "15", morale: "+8", encountered: "d4" },
  { level: 7, hp: 28, type: "Synthetic", av: "16", morale: "+9", encountered: "d4" },
  { level: 8, hp: 32, type: "Fungal", av: "16", morale: "+9", encountered: "Solo" },
  { level: 9, hp: 36, type: "Mineral", av: "17", morale: "+10", encountered: "Solo" },
  { level: 10, hp: 40, type: "Outsider", av: "18", morale: "Never Flees", encountered: "Solo" },
];

// `damageRule` (Mystic Gift Damage to a Target, RULED 2026-09-26 by Matt):
// a Special Defense the damage table can apply, in its row shape - `attack`
// is an attack property, `mult` 0 is immunity. monster-generator.js writes it
// on the generated Actor. Every damage defense carries one since 2026-09-26
// (Matt: "yes, let's do that"), and they STACK with the creature's type rows
// - a Fungal creature with Half Damage from Kinetic takes a quarter (RULED,
// Matt: "both rules should apply"). Cold is freezing and acid is corrosive, the
// vocabulary's standing readings. `toxinDefense` is the Toxin Die's: "adv" is
// ADV on the save, "immune" no die at all (toxin-die.js toxinModifiers). The two
// Hypergeometry defenses answer to the hypergeometry property - an equation's
// damage, and NOT the Hypergeometric weapon tag, which is anti-hypergeometric
// (RULED 2026-09-26, Matt, reversing "weapon tag counts" the same day); row
// Hypergeometric Equation Damage to a Target.
// "Level 5+ monsters roll twice on the Attacks column." (Bestiary/Monster
// Generators.md, footnote under Core Stats).
export const ATTACKS = [
  { attack: "Weak Melee (d4)", special: "Cause Mutation (CON Save to resist)", defense: "ADV vs Toxins", toxinDefense: "adv" },
  { attack: "Weak Ranged (d4)", special: "Acid Spray (d3 damage + d3 AV decay)", defense: "Half Damage from Kinetic", damageRule: { attack: "kinetic", mult: 0.5 } },
  { attack: "Melee (d6)", special: "Lightning (d8, electrical)", defense: "Half Damage from Flames", damageRule: { attack: "flame", mult: 0.5 } },
  { attack: "Melee (d6)", special: "Enfeebling Touch (d6 STR damage)", defense: "Half Damage from Cold", damageRule: { attack: "freezing", mult: 0.5 } },
  { attack: "Ranged (d6)", special: "Freeze Ray (d6 DEX damage)", defense: "Half Damage from Acid", damageRule: { attack: "corrosive", mult: 0.5 } },
  { attack: "Ranged (d6)", special: "Sickening Blast (d6 CON damage)", defense: "Half Damage from Gifts", damageRule: { attack: "gift", mult: 0.5 } },
  { attack: "Area (d6, blast)", special: "Memory Leech (d6 INT damage)", defense: "Half Damage from Hypergeometry", damageRule: { attack: "hypergeometry", mult: 0.5 } },
  { attack: "Strong Melee (d8)", special: "Psionic Scream (d6 PSY damage)", defense: "Half Damage from Beams", damageRule: { attack: "beam", mult: 0.5 } },
  { attack: "Strong Melee (d8)", special: "Ego-Death Ray (d6 EGO damage)", defense: "Half Damage from Blast", damageRule: { attack: "blast", mult: 0.5 } },
  { attack: "Strong Ranged (d8)", special: "Flame Breath (2d8, fire)", defense: "Half Damage from Electrical", damageRule: { attack: "electrical", mult: 0.5 } },
  { attack: "Strong Ranged (d8)", special: "Laser Eyes (2d8, beam)", defense: "Immune to Toxins", damageRule: { attack: "tox", mult: 0 }, toxinDefense: "immune" },
  { attack: "Strong Area (d8, blast)", special: "Poison Sting (d8 TOX)", defense: "Kinetic Immunity", damageRule: { attack: "kinetic", mult: 0 } },
  { attack: "Heavy Melee (d10)", special: "Lifesteal (d8, heal equal to damage)", defense: "Flame Immunity", damageRule: { attack: "flame", mult: 0 } },
  { attack: "Heavy Ranged (d10)", special: "Parasite Implant (Fills 1 slot, d6 damage per day)", defense: "Cold Immunity", damageRule: { attack: "freezing", mult: 0 } },
  { attack: "Heavy Area (d10, blast)", special: "Swallow Whole (d12 ongoing, STR Save break free)", defense: "Corrosive Immunity", damageRule: { attack: "corrosive", mult: 0 } },
  { attack: "Super-Heavy Melee (d12)", special: "Cause Wound (roll 2d8 on Wounds table)", defense: "Mystic Gift Immunity", damageRule: { attack: "gift", mult: 0 } },
  { attack: "Super-Heavy Ranged (d12)", special: "Entropic Touch (-d4 Max HP)", defense: "Hypergeometry Immunity", damageRule: { attack: "hypergeometry", mult: 0 } },
  { attack: "Super-Heavy Area (d12, blast)", special: "Poison Cloud (d10 TOX, blast)", defense: "Beam Immunity", damageRule: { attack: "beam", mult: 0 } },
  { attack: "Special Attack (See next column)", special: "Cause Blindness (CON Save vs d6 rounds of Blindness)", defense: "Blast Immunity", damageRule: { attack: "blast", mult: 0 } },
  { attack: "Special Attack (See next column)", special: "Destroy Item (d20 determines slot)", defense: "Electrical Immunity", damageRule: { attack: "electrical", mult: 0 } },
];

export const PHYSICAL_FORMS = {"Biological":["Humanoid","Vulpine","Canine","Feline","Amphibian","Avian","Reptilian","Elephantine","Horse-like","Plant-like","Jellyfish-like","Squid-like","Worm-like","Beetle-like","Snake-like","Arachnoid","Bat-like","Fish-like","Ape-like","Bear-like"],"Synthetic":["Warrior-like","Autarch-shaped","Android","Barrel-shaped","Child-like","Camera-like","Crab-like","Cube","Cylinder","Bird-like","Tangle of Wires","Wheeled","Tank-like","Insectile","Spherical","Blade-like","Prism","Priest-like","Pyramid-like","Snake-like"],"Fungal":["Geometric","Classic Mushroom","Frilled Growths","Spotted Sphere","Spore-belching Spires","Moss-like","Cup-like","Humanoid","Mass of Tendrils","Hollow Puffball","Dandelion Fuzz","Creeping Slime","Eye Garden","Riddled with Holes","Cauliflower","Disc-like","Veil-like","Coral-like","Glassy Filaments","Brain-like"],"Hypergeometric":["Luminous","Hollow","Spherical","Recursive","Inverted","Paper-like","Fractured","Unfolding","Lantern-like","Moon-like","Splintering","Cubist","Compressed","Smeared","Angular","Prismatic","Ouroborous","Tesseract","Glitching","Shadow-like"],"Mineral":["Humanoid","Smooth","Sharp","Crumbling","Statue-like","Spherical","Rectangular","Cement-like","Brick-like","Boulder-like","Chimney-like","Serpentine","Crystalline","Sand-like","Spider-like","Wheel-like","Fragmented","Pitted","Fragile","Towering"],"Outsider":["Not Quite Human","Mist-like","Water-like","Bacteria-like","Light-like","Echo-like","Storm-like","Flame-like","Shadow-like","Star-like","Ice-like","Glass-like","Ash-like","Flower-like","Eye-like","Hand-like","Tongue-like","Liquid-like","Wheel-like","Tree-like"]};
export const APPEARANCE_BEHAVIOUR = {"Hue":["Ochre","Crimson","White","Azure","Orange","Emerald","Violet","Concrete Grey","Dusty Brown","Black","Peach Pink","Indigo","Gold","Silver","Bronze","Zebra Striped","Iridescent","Cornflower Blue","Chameleon Colours","Transparent"],"Texture":["Feathered","Rubbery","Warty","Slimy","Fuzzy","Hairy","Velvet","Soft","Tree Bark","Leather","Jelly","Burnt","Spongy","Veined","Downy","Dry","Damp","Pitted","Crusty","Spiny"],"Behaviour":["Scavenger","Ambushes","Stalks","Feigns Death","Echolocation","Buries Self/Victim","Flies/Levitates","Hates Reflections","Scared of Fire","Nocturnal","Parasitic","Symbiotic","Thief of Strange Object","Swallows Food Whole","Often Sleeping","Craves Honey","Whispers","Mimicry","Blind or Deaf","Vampiric"],"Habitat":["Featureless Sands","Caves","Salt Pan","Hard Rocky Plain","Oases","Near Settlements","Near Monoliths","Atop Mesas","Hills","Underground Vaults","Toxic Lakeshores","Toxic Lake (In Water)","Fungal Forests","Crystal Growths","Windswept Plains","Mountains","Winding Canyons","Abandoned Cities","Cactus Fields","Sky Islands"]};
