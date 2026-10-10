/**
 * ATTACK PROPERTIES and the damage-interaction table.
 *
 * Matt's naming, 2026-09-05: "attack property" is the attacker-side concept
 * for all of these interactions. The book's "Common Damage Types" table
 * (Kinetic/Beam/Blast/Flame/Electrical/TOX) is a SUBSET of it, not the whole
 * of it — the table is headed COMMON, and several weapon tags behave exactly
 * like damage types without being listed as one: Hypergeometric,
 * Anti-Paradoxical, Eroding, Psyche-Suppressant.
 *
 * Renamed from damage-types.js, which was the wrong name for a vocabulary
 * that includes "psyche-suppressant".
 *
 * WHY A SET. A weapon can carry two properties and ~3% of Advanced/Exotic
 * ones do: the three type-bearing tags are all ADVANCED_TAGS so a weapon
 * rolls at most one, but eight of forty weapon BASES carry a property in
 * base_tags, so a Laser Rifle that rolls Electrical is Beam AND Electrical.
 * RULED (Matt): both apply. Picking a winner would invent a rule the book
 * does not have.
 *
 * TAG AND TYPE ARE ONE RULE. Weapons - Starting.md: "Tags such as Beam,
 * Blast, and Electrical interact with specific environmental and creature
 * conditions - see the damage type table above." The tag texts and the
 * damage-type texts match almost verbatim, so they are read as one property
 * rather than implemented twice.
 *
 * DERIVED, NOT BAKED. Nothing writes a property onto an existing item; this
 * reads what the item already carries, so there is no migration and nothing
 * goes stale when tags are hand-edited.
 */

import { hitSaveSpecs, hitAbilityDamage, offersArmourChoiceFromSentences } from "./weapon-tags.js";
import { remainingActorSentencesOf } from "./remaining-effects.js";
import { WEAPON_TAG_EFFECTS } from "./weapon-tag-effects-data.js";
import { activeDeltas } from "../time/stateful-effect.js";
import { wearsMetalArmour } from "./metal.js";
import { bearerProperties, bodyPassives } from "../effects/body.js";
// Creature attack flags from their sentences (Effect Engine: Creatures chunk 2a).
import { creatureAttackOf, creatureFlagsOf, creatureActorFlagsOf, namedWoundPerSlot } from "./creature-effects.js";

/** The book's Common Damage Types — the named subset. */
export const COMMON_DAMAGE_TYPES = ["kinetic", "beam", "blast", "flame", "electrical", "tox"];

/**
 * Tag and base_tag spellings normalised to an attack property. Two spellings
 * of one rule collapse here (Flaming -> flame, Blasting -> blast), which is
 * what stops the same rule being implemented twice under two names.
 */
const AS_PROPERTY = {
  kinetic: "kinetic",
  beam: "beam",
  blast: "blast", blasting: "blast",
  flame: "flame", flaming: "flame",
  electrical: "electrical",
  tox: "tox",
  hypergeometric: "hypergeometric",
  // HYPERGEOMETRY IS NOT HYPERGEOMETRIC (RULED 2026-09-26, Matt, after Group
  // 420: "the term hypergeometric seems to get used in several different
  // ways"). The weapon tag above is really ANTI-hypergeometric - good against
  // Hypergeometric creatures, and able to reach the Incorporeal. This one is
  // the damage an EQUATION deals (Freeze); the Creature Generator's
  // Hypergeometry defenses and the Mystic Hunter's Mirror answer to it and not
  // to the tag. A Hypergeometric creature's own attacks are NOT hypergeometry
  // (ruled: "leave them out for now").
  hypergeometry: "hypergeometry",
  "anti-paradoxical": "anti-paradoxical",
  eroding: "eroding",
  "psyche-suppressant": "psyche-suppressant",
  freezing: "freezing",
  // Mystic Gift Damage to a Target, RULED 2026-09-26 (Matt): damage a Gift
  // deals carries this and nothing else. TYPELESS - the book gives a Gift no
  // damage type, and without a property it would default to kinetic and be
  // halved by Fungal, floored by Gelationous. A property rather than a flag
  // so the immunity rows below answer to it the way they answer to a weapon.
  gift: "gift", "mystic gift": "gift",
  // Effect Engine: Shared Pipelines chunk 3, RULED 2026-10-05 (Matt): a heal
  // asks this table as `healing`, and NO WILDCARD ROW REACHES IT (see
  // attackMatches) - "healing is never reduced/magnified by some property
  // that reduces or magnifies damage, like Incorporeal. modifying heal
  // effects is its own thing." Only a row naming `healing` would bite; none
  // exists.
  healing: "healing",
  // Breathing and Suffocation, RULED 2026-09-27 (Matt): two properties.
  // Choking is the book's other word for suffocation (Stolen Breath, the
  // Fungal Growths room); drowning stays apart because Gills answers to it
  // alone.
  suffocation: "suffocation", choking: "suffocation",
  drowning: "drowning",
  // The Fungal weapon tag: "No damage to Fungal creatures". A basic tag, and
  // live on the Spore Thrower's base_tags, so this is a real weapon.
  fungal: "fungal",
  // RULED (Matt) 2026-09-05: Concussive IS bludgeoning, for the tag and for
  // the Concussion Rifle. The rifle needs no base entry of its own — it
  // carries Concussive already, so it inherits bludgeoning through this line.
  concussive: "bludgeoning", bludgeoning: "bludgeoning",
  // RULED (Matt) 2026-09-18: crushing IS bludgeoning. JADE IBIS gave the
  // Destrier's Charge "crushing damage", and the book pairs the two words
  // throughout ("bludgeoning and crushing attacks").
  crushing: "bludgeoning",
  slashing: "slashing",
  // STABBING, AND IT IS NOT SPELT "PIERCING" ON PURPOSE (Matt, 2026-09-22).
  // Piercing is already an ADVANCED WEAPON TAG with an unrelated meaning -
  // "extra die of damage against targets with AV 16 or higher, halved against
  // AV 13 or lower", the mirror of Mauling. This map is keyed on tag
  // spellings, so a `piercing` entry here would silently make every
  // Piercing-tagged weapon deal piercing DAMAGE, which is the Corrosive /
  // Corroded collision again one tier up.
  //
  // The book supplies the way out by using a different word for the damage:
  // Bestiary.md's Fungal takes "half damage from kinetic attacks such as
  // bludgeoning, stabbing, etc.", and the Synth Skeleton takes "minimum
  // damage from slashing and stabbing attacks". Planeyfolk's Flat and the
  // Exposed Organs mutation say "slashing or piercing", and that word is read
  // as this property - the book is using two words for one kind of blow, and
  // only one of them is already spoken for.
  stabbing: "stabbing",
  // RULED 2026-09-11 (Matt): corrosive IS the book's "acid". Two tags carry
  // it — Corrosive (ADVANCED_TAGS, "deals damage OR reduces target AV by 1")
  // and Ultra-Corrosive (EXOTIC_TAGS, "reduces AV by -2 ... d8 CON damage").
  // Neither text says "acid damage" in so many words, so reading them as the
  // acid property is his ruling rather than the book's wording.
  //
  // CORRODED IS NOT THIS, and the two names are one letter apart. Corroded is
  // a BASIC tag meaning "half base trade value" — cosmetic rust on the item,
  // not a property of the blow. Matt's correction 2026-09-11, after this file
  // put Corrosive in the wrong tier and nearly wired the wrong tag.
  corrosive: "corrosive", "ultra-corrosive": "corrosive",
};

/**
 * Physical subtypes are refinements OF kinetic, not alternatives to it.
 *
 * CORROSIVE IS IN HERE ON A RULING, not because acid is obviously physical.
 * RULED 2026-09-11 (Matt). The Rustacean's two claws are the only corrosive
 * attacks in the bestiary, and they carry damageTypes:["corrosive"], which
 * normalised to nothing before this file learned the word — so they were
 * being treated as plain kinetic and were halved against Fungal creatures.
 * Leaving corrosive out of this set would have silently removed that, which
 * is a behaviour change nobody asked for while wiring an elixir.
 *
 * Without this a Sword tagged Slashing would report ["slashing"] and stop
 * matching "kinetic x fungal -> half", silently removing the Fungal
 * resistance from every melee weapon the moment subtypes were assigned.
 */
// STABBING joined 2026-09-22 on the book's own sentence rather than on a
// ruling: Bestiary.md calls kinetic "attacks such as bludgeoning, stabbing,
// etc.", so a Dagger must keep halving against Fungal creatures exactly as a
// Sword does.
const IMPLIES_KINETIC = new Set(["bludgeoning", "slashing", "corrosive", "stabbing"]);

/**
 * Tags that GRANT other attack properties.
 *
 * Extra-Dimensional's own text is "Has the Hypergeometric and
 * Anti-Paradoxical tags, and five times its base trade value", so a weapon
 * carrying it deals both.
 *
 * Derived here as well as expanded in weapon-roller.js, deliberately. The
 * roller expansion makes the granted tags VISIBLE on the sheet; this makes
 * them TRUE for any item carrying Extra-Dimensional, including one created
 * before that expansion existed or edited by hand. Baking alone had exactly
 * the staleness problem this module avoids everywhere else — caught by test
 * 79.25, where a hand-made Extra-Dimensional weapon doubled against nothing.
 */
const GRANTS = {
  "extra-dimensional": ["hypergeometric", "anti-paradoxical"],
};

const normalise = (t) => AS_PROPERTY[String(t).trim().toLowerCase()] ?? null;

/**
 * What a NAME means as damage properties, read by name: the property it is,
 * plus any it grants. The weapon tags' properties come from their sentences
 * since Effect Engine: Weapon Tags chunk 3; this is the name-based answer
 * tools/test-weapon-tags.mjs holds those sentences to, and what any other
 * name (a base tag, a damage-type word) still gets.
 */
export function propertiesOfName(name)
{
  const out = [...(GRANTS[String(name).trim().toLowerCase()] ?? [])];
  const n = normalise(name);
  if (n && !out.includes(n)) out.push(n);
  return out;
}

/**
 * Every attack property an item carries: lowercase, deduplicated,
 * order-stable. Reads CUMULATIVELY — a later source adds to the set rather
 * than replacing it, because a Laser Rifle with the Electrical tag is both.
 *   1. explicit `system.damageTypes` / `system.damageType`
 *      (creature attack Items carry this; see bestiary-build.js)
 *   2. `system.tags`      — the rolled tag
 *   3. `system.base_tags` — the weapon base's own
 *
 * Returns [] rather than ["kinetic"] when nothing is found: kinetic is the
 * ABSENCE of a special property, and returning it would make every plain
 * sword match a kinetic rule that is meant to describe ordinary weapons.
 * Callers that need the default use `attackPropertiesOrKinetic`.
 */
export function attackPropertiesOf(item) {
  const sys = item?.system ?? item ?? {};
  const found = [];
  const push = (t) => {
    const raw = String(t).trim().toLowerCase();
    // A tag can grant properties without being one itself — Extra-Dimensional
    // is not a damage type, but it confers two.
    for (const g of GRANTS[raw] ?? []) if (!found.includes(g)) found.push(g);
    const n = normalise(t);
    if (!n || found.includes(n)) return;
    found.push(n);
    // A physical subtype is still kinetic — see IMPLIES_KINETIC.
    if (IMPLIES_KINETIC.has(n) && !found.includes("kinetic")) found.push("kinetic");
  };
  if (Array.isArray(sys.damageTypes)) sys.damageTypes.forEach(push);
  if (sys.damageType) push(sys.damageType);
  // A weapon tag's properties come from its sentences (Weapon Tags chunk 3,
  // 2026-10-05) - Flaming is `modify damage-types +flame`, Extra-Dimensional
  // grants two - and any other name (a base tag: Slashing, Beam) is read by
  // name as before.
  // An Item carrying its own sentences (GM Effect Builder chunk 2, 2026-10-05)
  // is read from them instead: a property a GM added counts, and a tag's row
  // the GM removed no longer does. Base tags are still read by name.
  const own = item?.flags?.vaarn?.effects;
  for (const t of sys.tags ?? [])
  {
    const known = WEAPON_TAG_EFFECTS[t]?.effects;
    if (!known) { push(t); continue; }
    if (Array.isArray(own)) continue;
    for (const s of known)
      if (s.do?.stat === "damage-types") push(String(s.do.amount).replace(/^\+/, ""));
  }
  if (Array.isArray(own))
    for (const s of own)
      if (s?.do?.stat === "damage-types" && !s.baked && (s.when === "stat" || s.when?.trigger === "stat")) push(String(s.do.amount).replace(/^\+/, ""));
  for (const t of sys.base_tags ?? []) push(t);
  return found;
}

/** As above, defaulting to ["kinetic"] — for display and for kinetic rules. */
export function attackPropertiesOrKinetic(item) {
  const p = attackPropertiesOf(item);
  return p.length ? p : ["kinetic"];
}

/** Does this item's attack carry `prop`? */
export function hasAttackProperty(item, prop) {
  return attackPropertiesOrKinetic(item).includes(String(prop).toLowerCase());
}

/** Attack properties of a structured creature ABILITY rather than an Item. */
export function abilityAttackProperties(ability) {
  const found = [];
  const push = (t) => { const n = normalise(t); if (n && !found.includes(n)) found.push(n); };
  for (const e of ability?.effects ?? []) push(e.damageType);
  for (const t of ability?.damageTypes ?? []) push(t);
  return found;
}

/**
 * THE INTERACTION TABLE: attack property x target creature type -> multiplier.
 *
 * The book states this matrix TWICE — once as weapon tags (Weapons -
 * Advanced.md) and once as creature-type resistances (Bestiary.md) — and the
 * two overlap. "Electrical doubles against Synthetics" and "Synthetics take
 * double from electrical" are one rule seen from each end, and collapsing
 * them here is what stops it being ruled on twice, differently.
 *
 * `mult: 0` is IMMUNITY. Matt's ruling 2026-09-05: "immunity is immunity,
 * like multiplying by zero" — it is absolute and short-circuits, so no other
 * multiplier can bring the damage back above zero.
 *
 * A ROW MAY INSTEAD CARRY `floor: "min"`, added 2026-09-11 for Glassflesh
 * Paste's "You take minimum damage from beam weapons". RULED 2026-09-11
 * (Matt): "as if the die rolled the minimum amount" — so a d10 weapon still
 * beats a d4 one, and a floor is not expressible as a multiplier. That is the
 * whole reason the outcome vocabulary had to widen rather than the key alone.
 *
 * TARGET KEYS ARE NOT ONLY CREATURE TYPES. Since 2026-09-11 a row may name a
 * live CONDITION from Stateful Effect Application — see actorProperties. A
 * condition and a creature type are the same thing to this table on purpose:
 * Biothermal Amplifier Tonic's heat/cold immunity is the identical rule
 * Mineral already carries, and writing it twice is what this table exists to
 * prevent.
 */
/**
 * Jellybones, the disease: "take halved damage from bludgeoning attacks".
 * A condition key like immuneThermal, carried by the affliction entry, so a
 * character with the disease reaches the same row a creature would.
 */
export const HALF_FROM_BLUDGEONING = "halfFromBludgeoning";

export const DAMAGE_INTERACTIONS = [
  // --- weapon-tag side: five tags, one shape ---
  { attack: "electrical",        target: "synthetic",      mult: 2, once: "electrical-double", note: "Electrical tag / Synthetic resistance — the same rule from both ends" },
  // Metal Item Property Part B, RULED 2026-09-27 (Matt): the tag's second
  // clause, "targets wearing metal armour". `once` shares the Synthetic row's
  // group, so a Synth in chain mail takes x2 and not x4 - "make sure electrical
  // tag doesn't double damage against them twice". Submerged stays by hand.
  { attack: "electrical",        target: "metalArmour",    mult: 2, once: "electrical-double", label: "wearing metal armour", note: "Electrical tag: double damage to targets wearing metal armour" },
  { attack: "anti-paradoxical",  target: "outsider",       mult: 2, note: "Anti-Paradoxical tag" },
  { attack: "eroding",           target: "mineral",        mult: 2, note: "Eroding tag: double damage to Mineral creatures" },
  // The vehicles half (Matt, 2026-09-23): a `vehicle` actor exists now, so the
  // tag's middle clause has something to read. Doubled here, BEFORE the Hull
  // conversion (1 per 10) in _resolveHPChange. Static structures still have no
  // state; the damage card names that clause for the GM instead.
  { attack: "eroding",           target: "vehicle",        mult: 2, label: "a vehicle", note: "Eroding tag: double damage to vehicles" },
  { attack: "hypergeometric",    target: "hypergeometric", mult: 2, note: "Hypergeometric tag / Hypergeometric resistance — again both ends" },
  { attack: "psyche-suppressant",target: "psychic",        mult: 2, note: "Psyche-Suppressant tag" },

  // --- creature-type side: Bestiary.md's resistances that have data ---
  { attack: "kinetic",           target: "fungal",         mult: 0.5, note: "Fungal takes half from kinetic" },
  { attack: "flame",             target: "fungal",         mult: 2,   note: "Fungal takes double from fire" },
  { attack: "tox",               target: "synthetic",      mult: 0,   note: "Synthetic immune to poison" },
  { attack: "tox",               target: "mineral",        mult: 0,   note: "Mineral immune to poison" },
  { attack: "electrical",        target: "mineral",        mult: 0,   note: "Mineral immune to electricity" },
  { attack: "flame",             target: "mineral",        mult: 0,   note: "Mineral immune to extreme temperatures" },
  { attack: "freezing",          target: "mineral",        mult: 0,   note: "Mineral immune to extreme temperatures — cold is the other half of that phrase" },
  { attack: "bludgeoning",       target: "mineral",        mult: 2,   note: "Mineral takes double from bludgeoning" },

  // The Fungal weapon tag says outright "No damage to Fungal creatures", and
  // Bestiary.md makes Synthetic and Mineral immune to fungal spores — so a
  // spore weapon does nothing to any of the three.
  { attack: "fungal",            target: "fungal",         mult: 0,   note: "Fungal tag: no damage to Fungal creatures" },
  { attack: "fungal",            target: "synthetic",      mult: 0,   note: "Synthetic immune to fungal spores" },
  { attack: "fungal",            target: "mineral",        mult: 0,   note: "Mineral immune to fungal spores" },

  // Targets a DERIVED actor property rather than a stored creature type —
  // see isFlat. One rule now covers the bestiary Planeyfolk, a PC of that
  // ancestry, and anyone temporarily flattened by Flatten or Planeyfied.
  { attack: "slashing",          target: "flat",           mult: 2,   note: "Flat: two-dimensional beings take double from slashing or slicing" },
  // The other two thirds of the ancestry's sentence, wired 2026-09-22 once a
  // stabbing property existed: "You take half damage from bludgeoning attacks
  // and double damage from slashing or piercing attacks." The bestiary entry
  // prints only the slashing half, which is why only that half was built
  // first; both rows key on `flat`, so the creature and a PC of the ancestry
  // get the whole rule.
  { attack: "bludgeoning",       target: "flat",           mult: 0.5, note: "Flat: two-dimensional beings take half from bludgeoning" },
  { attack: "stabbing",          target: "flat",           mult: 2,   note: "Flat: two-dimensional beings take double from piercing" },

  // Neobloom's Flammable, 2026-09-22. A DERIVED property like `flat` rather
  // than a creature type: the ancestry has one, `biological`, and it is not
  // the source of this. The BESTIARY Neobloom deliberately does not get it -
  // that entry prints no Flammable rule at all, so giving the creature the
  // ancestry's weakness would be inventing content.
  //
  // ONLY THE DOUBLING IS HERE. "Once hit, you suffer d8 burning damage per
  // round until extinguished" is a second mechanism and has its own atom row
  // (Matt, 2026-09-22); nothing in this table can start an ongoing effect.
  { attack: "flame",             target: "flammable",      mult: 2,   note: "Flammable: double damage from flames and heat-based attacks" },

  // The Exposed Organs mutation, 2026-09-22 (Matt) — the same sentence as
  // Flat's second half, against a different key. Two rows rather than one
  // because slashing and stabbing are two properties, exactly as they are for
  // `flat` directly above.
  // `label` for the same reason Jellybones carries one: the chat line reads
  // "<name> is <target>", and a camelCase key in it reads as a leaked
  // variable. Found in Group 311 testing, which printed "is exposedOrgans" -
  // the identical fault Group 296 fixed, reintroduced by a new key that
  // simply was not a word.
  { attack: "slashing",          target: "exposedOrgans",  mult: 2, label: "mutated with Exposed Organs", note: "Exposed Organs: double damage from slashing attacks" },
  { attack: "stabbing",          target: "exposedOrgans",  mult: 2, label: "mutated with Exposed Organs", note: "Exposed Organs: double damage from piercing attacks" },
  // Ruling C (Matt, 2026-10-05): four mutations that were reminders.
  { attack: "bludgeoning",       target: "skeletal",        mult: 2,   label: "mutated with a Skeletal Frame", note: "Skeletal Frame: double damage from bludgeoning and crushing attacks" },
  { attack: "bludgeoning",       target: "malleable",       mult: 0.5, label: "mutated with a Malleable Body", note: "Malleable Body: half damage from bludgeoning attacks" },
  { attack: "beam",              target: "transparentSkin", mult: 2,   label: "mutated with Transparent Skin", note: "Transparent Skin: double damage from beam attacks" },
  { attack: "flame",             target: "insulated",       mult: 0.5, label: "mutated with Insulated Skin", note: "Insulated Skin: half damage from extreme temperatures (heat)" },
  { attack: "freezing",          target: "insulated",       mult: 0.5, label: "mutated with Insulated Skin", note: "Insulated Skin: half damage from extreme temperatures (cold)" },

  // Synth's Synthetic Flesh, the extreme-temperatures clause ONLY - an
  // EDITION-DISAGREEMENT STOPGAP, isolated on purpose (Matt, 2026-09-23). The
  // Synth ANCESTRY says "immune to ... extreme temperatures"; the Synthetic
  // CREATURE TYPE does not. This follows the ancestry as printed without
  // touching `synthetic`, so no bestiary creature changes. When the book
  // settles it: if the ancestry loses the clause, delete these two rows and
  // isSynthFleshThermal; if every synthetic gains it, move the rows onto
  // `synthetic` and delete the key.
  { attack: "flame",             target: "synthFleshThermal", mult: 0, label: "a Synth", note: "Synthetic Flesh: immune to extreme temperatures (heat)" },
  { attack: "freezing",          target: "synthFleshThermal", mult: 0, label: "a Synth", note: "Synthetic Flesh: immune to extreme temperatures (cold)" },

  // --- condition side: a running effect, not a creature type -------------
  // Biothermal Amplifier Tonic: "They are immune to damage caused by extreme
  // heat or cold." Word for word the immunity Mineral already has above, so
  // it is the same two rows against a different target key.
  { attack: "flame",             target: "immuneThermal",  mult: 0,   note: "Biothermal Amplifier Tonic: immune to extreme heat" },
  { attack: "freezing",          target: "immuneThermal",  mult: 0,   note: "Biothermal Amplifier Tonic: immune to extreme cold — the other half of that phrase" },
  // Squishflesh Balm: "immune to crushing or fall damage". RULED 2026-09-24
  // (Matt), applying his 2026-09-18 ruling that crushing IS bludgeoning -
  // the reading AS_PROPERTY above already makes for the Destrier's Charge
  // and the Club Tail. Fall damage is still nothing the system deals, so
  // that half stays the table's.
  { attack: "bludgeoning",       target: "immuneCrushing", mult: 0,   note: "Squishflesh Balm: jellylike — immune to crushing (bludgeoning) damage" },

  // Glassflesh Paste: "You take minimum damage from beam weapons." The only
  // floor in the table; see the header for why it cannot be a multiplier.
  { attack: "beam",              target: "minDamageFromBeam", floor: "min", note: "Glassflesh Paste: minimum damage from beam weapons" },
  // Mirror Armour: "Grants AV 16 and immunity from Beam attacks." RULED
  // 2026-09-25 (Matt): immunity at the damage step, not an attack that cannot
  // land, and only while the armour is worn. See wearsMirrorArmour.
  { attack: "beam",              target: "mirrorArmour",   mult: 0,   label: "wearing Mirror Armour", note: "Mirror Armour: immune to Beam attacks" },
  // Implants, Exotica and Figments ruling C (RULED 2026-10-06, Matt): Dazzleskin
  // Filaments' 'laser beams and energy weapons' is beam; Subdermal Insulation's
  // 'flames, cold, and electricity' is flame, freezing and electrical.
  { attack: "beam",              target: "dazzleskin",     mult: 0,   label: "Dazzleskin Filaments", note: "Dazzleskin Filaments: immune to laser beams and energy weapons" },
  { attack: "flame",             target: "subdermalInsulation", mult: 0, label: "Subdermal Insulation", note: "Subdermal Insulation: immune to flames" },
  { attack: "freezing",          target: "subdermalInsulation", mult: 0, label: "Subdermal Insulation", note: "Subdermal Insulation: immune to cold" },
  { attack: "electrical",        target: "subdermalInsulation", mult: 0, label: "Subdermal Insulation", note: "Subdermal Insulation: immune to electricity" },

  { attack: "bludgeoning",       target: HALF_FROM_BLUDGEONING, mult: 0.5, label: "infected with Jellybones", note: "Jellybones: halved damage from bludgeoning attacks" },

  // --- Breathing and Suffocation, RULED 2026-09-27 (Matt) -----------------
  // Synthetic and Mineral are "immune to damage from suffocation"; the Synth
  // and Lithling ancestries reach these through their creature types. Ruled:
  // suffocation immunity covers drowning too - the Synth ancestry names both,
  // and a thing that need not breathe cannot drown.
  { attack: "suffocation",       target: "synthetic",      mult: 0,   note: "Synthetic: immune to suffocation" },
  { attack: "drowning",          target: "synthetic",      mult: 0,   note: "Synthetic: immune to suffocation, which covers drowning" },
  { attack: "suffocation",       target: "mineral",        mult: 0,   note: "Mineral: immune to suffocation" },
  { attack: "drowning",          target: "mineral",        mult: 0,   note: "Mineral: immune to suffocation, which covers drowning" },
  // Gills: "You can breathe underwater" - drowning only.
  { attack: "drowning",          target: "gills",          mult: 0,   label: "breathing through Gills", note: "Gills: breathes underwater, immune to drowning" },
  // Starskin: "immunity to suffocation", while worn - see wearsStarskin.
  { attack: "suffocation",       target: "starskin",       mult: 0,   label: "wearing Starskin", note: "Starskin: immune to suffocation" },
  { attack: "drowning",          target: "starskin",       mult: 0,   label: "wearing Starskin", note: "Starskin: immune to suffocation, which covers drowning" },
  // The Oxygen Mask, worn: suffocation only (RULED - a mask is not a way to
  // breathe underwater). Its Ud6 is the wearer's to roll, once per encounter
  // or room where it protects; the note is that reminder, and nothing tracks it.
  { attack: "suffocation",       target: "oxygenMask",     mult: 0,   label: "wearing an Oxygen Mask", note: "Oxygen Mask: immune to suffocation - roll its usage die, once per encounter or room" },

  // STILL NOT BUILT, and why:
  //   radiation / fungicide / weaponised LogLang have no attack property at
  //     all and are narrative.
  //   Outsider is deliberately absent: the book says its "resistances and
  //     vulnerabilities vary wildly", so there is no type-wide rule to encode.
  //   SYNTHETIC AND EXTREME TEMPERATURES, and this one is a disagreement in
  //     the book rather than a gap. The Synth ANCESTRY is "immune to
  //     suffocation, drowning, toxins, extreme temperatures, or spores"; the
  //     Synthetic CREATURE TYPE in Bestiary.md is "immune to damage from
  //     suffocation, poison, radiation, or fungal spores" and says nothing
  //     about heat or cold. Mineral is the type that gets them, and its
  //     flame/freezing rows above are written from that word. RULED
  //     2026-09-22 (Matt): do not wire it. Putting it on `synthetic` would
  //     make every synthetic creature in the bestiary fireproof on the
  //     strength of an ancestry sentence, and deriving a Synth-only key would
  //     assert that the type's shorter list is an omission rather than the
  //     definition. Recorded and left alone until the book settles it.
  //     REVISED 2026-09-23 (Matt): the Synth-only key IS built after all, as
  //     the isolated `synthFleshThermal` rows above - not a claim about the
  //     type, but the ancestry followed as printed, kept apart so the
  //     author's eventual resolution either way is a small removal.
  //     NOT the Incorporeal precedent, where Matt read two wordings as one
  //     rule: there the fuller text glossed a term the other left bare, and
  //     here both texts are complete enumerations that simply differ.
];

/**
 * Resolve every interaction between one attack and one target.
 *
 * Returns { mult, immune, floor, applied[] } — `applied` naming each rule that
 * fired so the chat message can say WHY, rather than a number changing
 * silently.
 *
 * ORDER, and it is a decision rather than an accident: the FLOOR is taken
 * first and the multiplier applied to the result. The floor describes what the
 * blow rolled; the multiplier describes how this target receives it. A target
 * that is both glassfleshed and somehow vulnerable to beam therefore doubles
 * the minimum rather than flooring the double. No content reaches that
 * combination today — it is written down so the next one does not have to
 * rediscover which way round it goes.
 */
export function resolveDamageInteractions(item, targetActor) {
  const props = attackPropertiesOrKinetic(item);
  // Actor properties, not creature types: the stored flags plus derived ones.
  const types = actorProperties(targetActor);
  const applied = [];
  let mult = 1;

  let floor = null;

  // The type table, then the creature's own rules. Creature rules come second
  // so a type immunity still short-circuits first and reports its own reason.
  const replaced = CREATURE_DAMAGE_RULES[damageRuleKey(targetActor)]?.replacesType ?? [];
  const rules = [
    ...DAMAGE_INTERACTIONS.filter((r) => types[r.target] && !replaced.includes(r.attack)),
    ...creatureInteractions(targetActor),
  ];
  // A `once` group applies its first matching row only - one rule reached
  // from two conditions doubles once (Electrical, 2026-09-27).
  const groups = new Set();
  for (const rule of rules) {
    if (!attackMatches(rule, props)) continue;
    if (rule.once && groups.has(rule.once)) continue;
    if (rule.once) groups.add(rule.once);
    applied.push(rule);
    if (rule.mult === 0) return { mult: 0, immune: true, floor: null, applied };   // immunity short-circuits
    if (rule.floor) { floor = rule.floor; continue; }
    mult *= rule.mult;
  }
  // A RESISTED TYPE from the body's sentences (Gift Effect Library chunk 3,
  // RULED 2026-10-09): a passive "modify damage-taken <type> x0.5" (half) or
  // "x0" (immune) on any Item the target carries - a bestowed one for a while.
  for (const p of bodyPassives(targetActor, { verb: "modify" }))
  {
    const d = p.sentence.do;
    if (d.stat !== "damage-taken" || !d.type || !props.includes(d.type)) continue;
    const m = /^x([\d.]+)$/.exec(String(d.amount));
    if (!m) continue;
    const rule = { attack: d.type, target: p.source, mult: Number(m[1]), note: `${p.source}: ${Number(m[1]) === 0 ? "immune to" : "half damage from"} ${d.type}` };
    applied.push(rule);
    if (rule.mult === 0) return { mult: 0, immune: true, floor: null, applied };
    mult *= rule.mult;
  }
  return { mult, immune: false, floor, applied };
}

/**
 * Per-creature rules the type table cannot express, keyed by creature name —
 * the same name-keyed shape the sheet already uses for mutation and Exotica
 * effects.
 *
 * INCORPOREAL is defined by the book, but inside a creature entry rather than
 * the rules text: the Spectre of Indifference reads "immune to damage from
 * conventional sources. Only hypergeometric or anti-paradoxical weapons will
 * harm the Specter." Chromavore has the same ability name unglossed, so the
 * gloss on one is taken as the definition for both.
 *
 * NOTE there is a SECOND, unrelated sense of "conventional" in the book about
 * PERCEPTION (Star Vampire's invisibility, the Active Camouflage Ring). It
 * must not be conflated with this one.
 */
export const CREATURE_DAMAGE_RULES = {
  // `gmCall` (Mystic Gift Damage to a Target, RULED 2026-09-26 by Matt:
  // "incorporeal would be GM adjudicated"): an attack of these properties is
  // neither blocked nor applied - the chat line hands the figure to the Referee.
  // An equation's damage is the Referee's call too (RULED 2026-09-26, Matt).
  "Chromavore":              { rule: "Incorporeal", immuneUnless: ["hypergeometric", "anti-paradoxical"], gmCall: ["gift", "hypergeometry"] },
  "Spectre of Indifference": { rule: "Incorporeal", immuneUnless: ["hypergeometric", "anti-paradoxical"], gmCall: ["gift", "hypergeometry"] },
  // Spirit Form (2026-09-27): a dead PC's spirit. Keyed by damageRuleKey, which
  // creatureFlags sets from this table, so the rename to "Spirit of <PC>" at
  // spawn keeps the rule.
  "Unquiet Spirit":          { rule: "Incorporeal", immuneUnless: ["hypergeometric", "anti-paradoxical"], gmCall: ["gift", "hypergeometry"] },
  // Vehicle Stat Block Import, 2026-09-18 (Matt: "use the same mechanic").
  // "A vimana and its pilot (while seated) are impervious to all damage. Only
  // anti-paradox weapons can destroy the vimana." Named "Impervious" because
  // the chat line reads "<name> is <rule>". `shieldsPilot` is the other half
  // of the sentence: whoever sits in its pilot slot gets the same rule — see
  // seatedDamageOverride.
  "Vimana":                  { rule: "Impervious", immuneUnless: ["anti-paradoxical"], shieldsPilot: true },

  // ---- Damage-Type Read wiring, 2026-09-21 (Matt: "add them to
  // CREATURE_DAMAGE_RULES"). `interactions` are rows in the same shape as
  // DAMAGE_INTERACTIONS, keyed on the creature rather than on a property:
  // `mult` (0 is immunity), or `floor: "min"` for the book's "minimum
  // damage", which is Glassflesh Paste's floor. `attack: "*"` is every
  // attack. `unless` names properties that let an attack through untouched.
  // `passes`: a Gift is not a mundane source (RULED 2026-09-26, Matt). Its own
  // field rather than a third immuneUnless word, so the blocked line still
  // names only the weapons that harm it.
  // An equation is no more mundane than a Gift, and passed before the label
  // split, when it shared the weapon tag's word; kept that way.
  "Unfolder":              { rule: "immune to mundane sources", immuneUnless: ["hypergeometric"], passes: ["gift", "hypergeometry"] },
  "Chromepriest":          { rule: "Argent Robes", interactions: [
    { attack: "beam", mult: 0, note: "Argent Robes: immune to damage from beam weapons" }] },
  // Crushing needs no row of its own: AS_PROPERTY maps it to bludgeoning.
  "Companion Ooze":        { rule: "Gelatinous", interactions: [
    { attack: "bludgeoning", mult: 0, note: "Gelatinous: immune to bludgeoning or crushing damage" }] },
  "Face Dancer":           { rule: "Malleable", interactions: [
    { attack: "bludgeoning", mult: 0.5, note: "Malleable: half damage from bludgeoning attacks" }] },
  // Blast doubles and everything else halves (Matt, 2026-09-21): the book's
  // "single target attacks" are read as every attack that is not blasting.
  "Scintillating Swarm":   { rule: "Swarmers", interactions: [
    { attack: "blast", mult: 2, note: "Swarmers: double damage from blasting attacks" },
    { attack: "*", unless: ["blast"], mult: 0.5, note: "Swarmers: half damage from single-target attacks" }] },
  "Fissile Glittersludge": { rule: "Gelationous", interactions: [
    { attack: "bludgeoning", floor: "min", note: "Gelationous: minimum damage from bludgeoning attacks" }] },
  "Fool's Pool":           { rule: "Gelationous", interactions: [
    { attack: "kinetic", floor: "min", note: "Gelationous: minimum damage from kinetic attacks" }] },
  "Squishwolf":            { rule: "Jelly-Flesh", interactions: [
    { attack: "bludgeoning", floor: "min", note: "Jelly-Flesh: minimum damage from bludgeoning and crushing weapons" }] },
  // "Hypergeometric and electrified weapons deal damage as normal."
  "Star Vampire":          { rule: "Star Flesh", interactions: [
    { attack: "kinetic", unless: ["hypergeometric", "electrical"], floor: "min", note: "Star Flesh: minimum damage from kinetic attacks" }] },
  "Sandworm (Adult)":      { rule: "Colossal", interactions: [
    { attack: "*", floor: "min", note: "Colossal: minimum damage from all damage sources" }] },
  // Fungal, so the type table halves its kinetic too. RULED 2026-09-21
  // (Matt): minimum only - the creature's own rule replaces the type row for
  // kinetic rather than stacking on it, which would round 1 down to 0.
  // `replacesType` drops type rows for those attacks; fire still doubles.
  "Xanthous Mycomorph":    { rule: "Kinetic Resistance", replacesType: ["kinetic"], interactions: [
    { attack: "kinetic", floor: "min", note: "Kinetic Resistance: minimum damage from kinetic weapons" }] },
  // A damage total that is even does nothing (Matt, 2026-09-21). Read at the
  // damage site, because it needs the number and this table never sees one.
  "Hollow Maiden":         { rule: "Unreal Flesh", ignoreEven: true },
  // "The Synth Skeleton takes minimum damage from slashing and stabbing
  // attacks." Wired 2026-09-22, and the 2026-09-21 note saying it could not
  // be is now wrong rather than merely old: that note gave "no stabbing
  // property exists" as the reason, and Matt's answer when the Planeyfolk
  // atom hit the same wall was to add one and come back here. Nothing about
  // the creature changed - the vocabulary did.
  "Synth Skeleton":        { rule: "Skeletal", interactions: [
    { attack: "slashing", floor: "min", note: "Skeletal: minimum damage from slashing attacks" },
    { attack: "stabbing", floor: "min", note: "Skeletal: minimum damage from stabbing attacks" }] },

  // Mystic Gift Damage to a Target, RULED 2026-09-26 (Matt). Gift damage
  // reaches this path now, as the `gift` property. The Hunter's Mirror also
  // `rebounds` it - the Gift card deals it to the caster instead (see
  // reboundsAttack); the immunity row is what any other path meets.
  // Hypergeometry, the Mirror's other half, is row Hypergeometric Equation
  // Damage to a Target, as the `hypergeometry` property (not the weapon tag).
  "Psyche Leech":          { rule: "Immunity", interactions: [
    { attack: "gift", mult: 0, note: "Immunity: immune to damage caused by Mystic Gifts" }] },
  // Hypergeometry joined 2026-09-26 (RULED, Matt): an equation's damage,
  // rebounded automatically. First built on the weapon tag's word as well
  // ("weapon tag counts"); REVERSED the same day when the two were split - a
  // Hypergeometric weapon is anti-hypergeometric and does not rebound.
  "Extradimensional Mystic Hunter": { rule: "Psychic Mirror", rebounds: ["gift", "hypergeometry"], interactions: [
    { attack: "gift", mult: 0, note: "Psychic Mirror: immune to damage caused by Mystic Gifts, which rebounds on the user" },
    { attack: "hypergeometry", mult: 0, note: "Psychic Mirror: immune to damage caused by Hypergeometry, which rebounds on the user" }] },

  // NOT HERE, each on purpose:
  //   Viridian Ooze, "half damage from kinetic" - it is Fungal, and the type
  //     table already halves kinetic for every Fungal creature. A second row
  //     would quarter it.
};

/**
 * Does this target throw an attack of `property` back at its user? The
 * Extradimensional Mystic Hunter's Psychic Mirror (Mystic Gift Damage to a
 * Target, RULED 2026-09-26 by Matt: automatic, no Referee choice). Returns the
 * rule entry, so the caller can name it.
 */
export function reboundsAttack(targetActor, property) {
  const entry = CREATURE_DAMAGE_RULES[damageRuleKey(targetActor)];
  return entry?.rebounds?.includes(property) ? entry : null;
}

/**
 * The creature's own interaction rows, with its rule name as the `target`,
 * so the chat line reads "<name> is <rule>" as a type row does.
 */
function creatureInteractions(targetActor) {
  const entry = CREATURE_DAMAGE_RULES[damageRuleKey(targetActor)];
  // A PER-ACTOR immunity - a Glittersludge born of a damage type, and every
  // descendant (Actor Spawning wiring, 2026-09-25). Stored on the Actor by
  // performSplit, since two Glittersludges can differ.
  // From its sentences since Remaining Sources chunk 2d (2026-10-07); the rule's name is the sentences' words.
  const born = remainingActorSentencesOf(targetActor).filter((s) => s.do?.from === "immuneTo");
  const own = born.map((s) => ({ attack: s.do.value, mult: 0, target: s.text || "Adapted", note: "born of this damage type" }));
  // A generated creature's rolled Special Defense (Mystic Gift Damage to a
  // Target, RULED 2026-09-26 by Matt) - written on the Actor by
  // monster-generator.js from the Attacks row's `damageRule`, already in this
  // row shape, since no two generated creatures share a name.
  const rolled = (creatureActorFlagsOf(targetActor).damageRules ?? []).map((r) => ({ ...r, target: r.rule }));
  return [...(entry?.interactions ?? []).map((i) => ({ ...i, target: entry.rule })), ...own, ...rolled];
}

/** Does this row bite on an attack carrying `props`? */
function attackMatches(rule, props) {
  if ((rule.unless ?? []).some((p) => props.includes(p))) return false;
  // A heal is never "every attack" (Shared Pipelines chunk 3, RULED 2026-10-05).
  if (rule.attack === "*" && props.includes("healing")) return false;
  return rule.attack === "*" || props.includes(rule.attack);
}

/** Unreal Flesh: the rule entry if this target ignores even damage totals. */
export function ignoresEvenDamage(targetActor) {
  const entry = CREATURE_DAMAGE_RULES[damageRuleKey(targetActor)];
  return entry?.ignoreEven ? entry : null;
}

/**
 * ACTOR PROPERTIES — the target-side counterpart to attack properties.
 *
 * Matt's framing 2026-09-05: creature types are a SUBSET of this, not the
 * whole of it, exactly as the book's "Common Damage Types" turned out to be a
 * subset of attack properties. The seven stored creatureTypes flags are the
 * common cases; a property can equally be DERIVED, as Gift-Derived Psychic
 * Type already is (nothing stores "psychic" on a Gifted character —
 * _prepareCommonData computes it from owning a Gift).
 *
 * FLAT (two-dimensional) is the first derived one here, and the book forced
 * the design. Three earlier attempts were wrong:
 *   - a name-keyed "Planeyfolk" rule fired for the bestiary creature and NOT
 *     for a PC of that ancestry;
 *   - an eighth creatureTypes flag needed a template.json change and a world
 *     relaunch, and could not represent a TEMPORARY state;
 *   - "biological AND hypergeometric" caught Nome, whose hypergeometry is in
 *     its HAT, and is wrong on the book's own terms — of twenty-two codex
 *     equations and mishaps involving hypergeometry, exactly two make you 2D.
 *
 * The book names the condition directly and gives it four sources:
 *   Planeyfolk ancestry   — permanent, PCs and the bestiary creature alike
 *   Flatten   (equation)  — "transformed into a 2D hypergeometric entity",
 *                           lasts [INT] hours
 *   Planeyfied (mishap)   — "becomes a 2D hypergeometric being. Refer to the
 *                           Planeyfolk ancestry for special rules", [INT] days
 * Two of the four are TIMED, which is why this can never be a stored type.
 * Planeyfied pointing at the ancestry's rule is the book itself treating this
 * as one shared property with several sources.
 */
export function isFlat(actor) {
  // Flat's sentence since Mutations and Ancestry Rules chunk 2a (an Item, or the
  // ancestry text - ruling B); the flag below is Planeyfication's, unchanged.
  if (bearerProperties(actor).has("flat")) return true;
  // Flatten, Planeyfied, and the bestiary Planeyfolk, which is set at build
  // time. A flag rather than a system field so no schema change is needed and
  // a timed effect can set and clear it.
  return !!creatureActorFlagsOf(actor).flat;
}

/**
 * Derived actor properties. Creature types are merged in as-is; derived ones
 * are added alongside, so a rule can name either without caring which it is.
 *
 * LIVE CONDITIONS JOIN THEM, added 2026-09-11 — this is the whole of the
 * Damage Interaction from Target Condition key change, and it is three lines
 * because the table was already keyed on a property bag rather than on
 * creature types. A condition from Stateful Effect Application becomes a
 * target key exactly as `flat` and `psychic` already are.
 *
 * WHY NOT VIA DERIVED DATA, which is how creature types arrive. actor.js
 * merges stateful `creatureTypes` into system.creatureTypes at
 * prepareCommonData, and it can only do so for keys the schema already has
 * (`if (t in data.creatureTypes)`). Conditions are free-form strings with no
 * schema to check against, and this file already reads actor state directly
 * for `flat`, so it reads them here rather than inventing a derived field
 * that template.json does not describe.
 *
 * A CONDITION STILL MEANS NOTHING BY ITSELF. This makes it ADDRESSABLE by a
 * DAMAGE_INTERACTIONS row; it does not make any condition do anything. The
 * caution in stateful-effect.js stands — each condition is wired at the point
 * it applies, and this is that point for the three damage-side ones.
 */
// Flatten and Planeyfied reach `flat` as a board CONDITION (2026-09-21), merged
// below with every other condition - so isFlat itself needs no condition read.
export function actorProperties(actor) {
  const props = { ...(actor?.system?.creatureTypes ?? {}) };
  if (isFlat(actor)) props.flat = true;
  if (isFlammable(actor)) props.flammable = true;
  if (isSynthFleshThermal(actor)) props.synthFleshThermal = true;
  // A vehicle is a target KIND rather than a creature type, so it is derived
  // from the actor type - Eroding's vehicles clause reads it (2026-09-23).
  if (actor?.type === "vehicle") props.vehicle = true;
  if (hasExposedOrgans(actor)) props.exposedOrgans = true;
  // Mirror Armour's and Starskin's properties are their sentences since
  // Implants, Exotica and Figments chunk 2 (2026-10-06), worn - bearerProperties below.
  if (hasGills(actor)) props.gills = true;
  // Every other property a body sentence gives - ruling C's Skeletal Frame,
  // Malleable Body, Transparent Skin, Insulated Skin (2026-10-05).
  for (const p of bearerProperties(actor)) props[p] = true;
  // The Oxygen Mask is its sentence since Remaining Sources chunk 2c-ii (2026-10-07):
  // bearerProperties above gives oxygenMask while it is worn - never its name (ruling F).
  // Metal Item Property (2026-09-27): body armour that is metal and worn, a
  // heavy implant, or a creature's flag - see metal.js wearsMetalArmour.
  if (wearsMetalArmour(actor)) props.metalArmour = true;
  for (const c of activeDeltas(actor).conditions) props[c] = true;
  return props;
}

/**
 * Neobloom's Flammable: "You take double damage from flames and heat-based
 * attacks. Once hit, you suffer d8 burning damage per round until
 * extinguished."
 *
 * Derived from the ancestry for the same reason `flat` is: the property is
 * not any of the seven stored creature types, and Neobloom maps to
 * `biological` alone. No flag read of its own - the ancestry is the only
 * source the book gives, and a `flammable` CONDITION would already reach
 * actorProperties through the condition loop above if one is ever written.
 *
 * THE BESTIARY NEOBLOOM IS NOT FLAMMABLE, and that is the book's doing, not
 * an oversight here: its stat block prints Vines, Bloomboon and nothing else.
 * Giving the creature the PC ancestry's weakness would be writing content.
 */
/**
 * NEOBLOOM (FLAMMABLE)'s second half - "Once hit, you suffer d8 burning damage
 * per round until extinguished." (Per-Round Effect Reminder wiring,
 * 2026-09-25.) Started by the hit that lands flame on a flammable target;
 * ended by the Referee removing it from the board. UNTYPED on purpose: a
 * flame-typed d8 would be doubled again by the same flammable row.
 */
export const FLAMMABLE_BURN = { name: "Burning", dice: "1d8" };

export function isFlammable(actor) {
  return bearerProperties(actor).has("flammable");
}

/**
 * Synth's Synthetic Flesh, its extreme-temperatures clause alone - the
 * isolated stopgap described beside its two DAMAGE_INTERACTIONS rows. From
 * the ancestry, like isFlammable, so a bestiary synthetic (no ancestry) never
 * reaches it.
 */
export function isSynthFleshThermal(actor) {
  return bearerProperties(actor).has("synthFleshThermal");
}

/**
 * The Exposed Organs mutation: "You suffer double damage from slashing or
 * piercing attacks." Word for word the sentence Planeyfolk's Flat gives, and
 * unwirable until a stabbing property existed.
 *
 * DERIVED FROM OWNING THE ITEM, which is the Gift-Derived Psychic Type shape
 * rather than a new one: nothing stores "psychic" on a Gifted character
 * either, and _prepareCommonData computes it from owning a Gift. A mutation is
 * a permanent Item, not a board effect, so the stateful condition route the
 * conditions loop above uses cannot reach it.
 *
 * ITS OTHER ROW STAYS BUILT. The mutation is also on the Forgettable-Effects
 * Tab, which is where the player READS the rule; this makes the number come
 * out right. The two are not alternatives and neither supersedes the other.
 */
export function hasExposedOrgans(actor) {
  return bearerProperties(actor).has("exposedOrgans");
}

/**
 * Mirror Armour's Beam immunity, derived from WEARING it (RULED 2026-09-25,
 * Matt: equipped only, as its AV bonus already is). The Exposed Organs shape:
 * an owned Item, read by name. A suit corroded to uselessness is renamed
 * "(Corroded)" and so stops matching; an unidentified one cannot be worn.
 */
export function wearsMirrorArmour(actor) {
  return wearsArmourNamed(actor, "Mirror Armour");
}

/**
 * Worn armour, by name - Mirror Armour's shape, shared since 2026-09-27 by
 * Starskin and the Oxygen Mask (Breathing and Suffocation). Equipped only, as
 * an AV bonus is.
 */
export function wearsArmourNamed(actor, name) {
  return (actor?.items ?? []).some(
    (i) => i.type === "armor" && i.system?.equipped && i.name === name);
}

/**
 * The Gills mutation: "You have gills and can breathe underwater." Owning the
 * Item, the Exposed Organs shape (Breathing and Suffocation, 2026-09-27).
 */
export function hasGills(actor) {
  return bearerProperties(actor).has("gills");
}

/** The two properties that stop a creature breathing. */
export const BREATHING_PROPERTIES = ["suffocation", "drowning"];

/**
 * Is this damage one the target cannot take at all - every type named is a
 * breathing property and the target is immune to each? Breathing and
 * Suffocation, RULED 2026-09-27 (Matt): an immune target is not asked a save,
 * nor held, when that damage is all the save or hold would do. Limited to the
 * breathing properties because that is what was ruled; a fire save against a
 * Mineral still rolls. Returns the immunity rows, for the line, or null.
 */
export function sparedBreathing(targetActor, types) {
  if (!targetActor || !types?.length) return null;
  if (!types.every((t) => BREATHING_PROPERTIES.includes(t))) return null;
  const rows = [];
  for (const t of types) {
    const r = resolveDamageInteractions({ system: { damageTypes: [t] } }, targetActor);
    if (!r.immune) return null;
    rows.push(...r.applied.filter((a) => a.mult === 0));
  }
  return rows;
}

/**
 * The same override shape as CREATURE_DAMAGE_RULES, keyed on a live condition.
 *
 * INCORPOREAL IS ONE RULE WITH TWO SOURCES, and that is Matt's ruling of
 * 2026-09-11 rather than a convenience. Phasing Potion reads "Drinker phases
 * out of reality, becoming incorporeal and invincible", and *invincible* was
 * first read here as immune to absolutely everything — wider than the
 * Chromavore and the Spectre of Indifference, who are Incorporeal and can
 * still be harmed by hypergeometric or anti-paradoxical weapons. Matt
 * overruled that: "make this incorporeal also vulnerable to hypergeometric/
 * anti-paradoxical, keep the fiction consistent. Author seems lazy about being
 * consistent when re-using terms." So the drinker gets the creature rule,
 * exactly, and "invincible" is read down to it.
 *
 * THE DEALING SIDE IS NOT HERE, because it is not a property of the target.
 * Matt ruled the same day that a phased character "can neither take
 * (invincible) nor deal (incorporeal) damage" — that half lives in
 * actor-sheet.js, where the ATTACKER is known.
 *
 * That asymmetry is not an inconsistency in the book, and it was checked
 * rather than assumed. The two incorporeal creatures attack by *enveloping*
 * for ability damage, which Matt read as "something different in their nature
 * that they use to attack in an unusual way" — not as a licence for an
 * insubstantial character to swing an insubstantial sword.
 */
export const CONDITION_DAMAGE_RULES = {
  incorporeal: { rule: "Incorporeal", immuneUnless: ["hypergeometric", "anti-paradoxical"], gmCall: ["gift", "hypergeometry"] },
};

/**
 * A live condition that doubles everything the bearer takes — Vaarnish Poison
 * row 19, "Suffer double damage for d6 days".
 *
 * NOT IN CONDITION_DAMAGE_RULES, though it sits beside it, and the reason is
 * the shape rather than tidiness. Every entry in that table is an override
 * keyed on the ATTACK: applyOverride asks what properties the weapon carries
 * and answers immune-or-not. This one asks nothing about the attack. It
 * doubles a laser, a club and a fall alike, so an entry there would have to
 * carry an empty immuneUnless and mean something different from its
 * neighbours.
 *
 * NOT IN condition-data.js either. That file is the book's Combat Conditions
 * section, which JADE IBIS prints with exactly two entries; this is a poison's
 * effect, not a third Combat Condition, and its own docstring is emphatic that
 * it is the one definition of what it covers.
 *
 * THE KEY IS THE CONTRACT, as NO_GIFTS's comment says of itself:
 * stateful-effect.js sums the `conditions` a board entry carries, so whatever
 * sets this string gets the doubling and nothing else needs to know.
 */
export const TAKES_DOUBLE_DAMAGE = "takesDoubleDamage";

/**
 * The other half of the same sentence — Wrathworms, "Infected creatures fight
 * with wild abandon, and deal and receive doubled damage."
 *
 * TWO KEYS RATHER THAN ONE, because the two halves are genuinely separable and
 * the book separates them. Vaarnish Poison row 19 gives only the receiving
 * half; nothing yet gives only the dealing half, but a rule that did would
 * have no key to reach for if the pair were welded into one.
 *
 * NOT `berserkerActive`, which already means exactly "deals and receives
 * double" and might look like the obvious thing to reuse. Two reasons it is
 * wrong here. It is TRANSIENT COMBAT STATE, cleared by knave.js's deleteCombat
 * hook, and Wrathworms is a disease that lasts until it is cured — reusing it
 * would quietly cure the infection at the end of every fight. And it is
 * MELEE-ONLY, which is the book's own word for the Berserker StimRig ("you
 * take and deal double melee damage") but is not what the Wrathworms or the
 * poison entries say.
 */
export const DEALS_DOUBLE_DAMAGE = "dealsDoubleDamage";

/**
 * What the target's own live state multiplies incoming damage by. 1 when
 * nothing applies, so a caller can multiply unconditionally.
 *
 * Kept multiplicative and kept separate from immunity: Matt's standing ruling
 * of 2026-09-05 is that immunity "is immunity, like multiplying by zero" and
 * short-circuits, so a doubled zero is still zero and this can never bring a
 * target back above nothing. The doubling is applied where the berserker
 * multiplier already is, which is the existing precedent for a multiplier
 * depending on who is being hit rather than on the roll.
 */
export function incomingDamageMultiplier(targetActor) {
  const flagged = activeDeltas(targetActor).conditions.includes(TAKES_DOUBLE_DAMAGE) ? 2 : 1;
  return flagged * woundDamageMultiplier(targetActor).factor;
}

/**
 * Deathblight, and any later affliction that scales the damage its bearer
 * TAKES, per slot — Damage Roll Modifier, 2026-09-22 (Matt).
 *
 * THE BOOK, Deathblight Husk: "Targets afflicted mark an item slot with
 * Deathblight. Each slot of Deathblight doubles damage taken and halves
 * healing received. It fades at the rate of one slot a day."
 *
 * THE MIRROR OF healing-multiplier.js, deliberately and down to the shape of
 * the table, because it is literally the other half of one sentence. That file
 * halves per slot on Matt's 2026-09-21 ruling, so two slots quarter a heal;
 * this doubles per slot, so two slots quadruple a blow. Ruled together
 * 2026-09-22: the halves of one sentence cannot stack differently from each
 * other without the sentence meaning two things.
 *
 * WHY NOT THE takesDoubleDamage CONDITION, which already exists and already
 * means "this target takes double". It is a live-effects condition and is on
 * or off, and the book's word here is EACH — a second slot has to do something
 * a boolean cannot express. The two compose rather than compete: a poisoned
 * character with two slots of Deathblight takes 2 x 4.
 *
 * READ FROM WOUND ITEMS, not from the board, and that is what makes the fade
 * work without anything here knowing about time. A slot of Deathblight is a
 * wound Item on the actor; "one slot a day" is Long-Clock Recurrence deleting
 * one, and this count follows it for free.
 */
// SINCE Effect Engine: Creatures chunk 2e (2026-10-07) the factor is the wound's own
// sentence (damage-taken-per-slot), read by its key through namedWoundPerSlot - the
// name table that stood here is gone.

/**
 * Weapon tags that EAT THE TARGET'S ARMOUR on a hit, tag name to points of AV
 * — "Armour Loss on a Hit", 2026-09-22. Applied in actor-sheet.js, which is
 * where the hit knows who it hit; the table lives here with the other
 * tag-keyed tables so a second corrosive tag is a line rather than a block.
 *
 * ULTRA-CORROSIVE ONLY, for now. The advanced Corrosive tag is "either deals
 * damage or reduces target's AV score by one (attacker's choice)", and a
 * choice cannot be a row in a table that fires automatically.
 */
export const ARMOUR_LOSS_TAGS = { "Ultra-Corrosive": 2 };

/**
 * THE CORROSIVE TAG'S CHOICE — "Degrades AV. On hit, either deals damage or
 * reduces target's AV score by one (attacker's choice)." RULED 2026-09-22
 * (Matt): a TOGGLE, declared before the roll, exactly as the charge is.
 *
 * WHY IT IS NOT IN ARMOUR_LOSS_TAGS, which is the table right above it and
 * would have taken one line. That table fires on every hit, which is correct
 * for Ultra-Corrosive's flat "-2 on a hit" and wrong twice over here: it
 * would take away the decision the tag exists for, and because this AV loss
 * is the ALTERNATIVE to damage rather than an addition to it, every corrosive
 * weapon in play would silently stop dealing damage.
 *
 * WHY A TOGGLE AND NOT A PROMPT. The three shapes were a dialog on each hit,
 * a pre-declared toggle, or leaving it to the Referee. The toggle wins on
 * precedent and on failure mode: Charge Declaration State already works this
 * way and players know it, it interrupts nothing, and a forgotten toggle
 * yields ordinary damage — the safe default, and the one the book would give
 * an attacker who did not think about it.
 *
 * SELF-CLEARING, like the charge: the attack that consumes it turns it off,
 * so a declaration cannot leak into the next swing.
 *
 * BOTH TAGS ON ONE WEAPON IS REACHABLE — Corrosive is ADVANCED and
 * Ultra-Corrosive EXOTIC, and a weapon rolls one of each tier. Left to
 * resolve naturally rather than special-cased, as Mauling and Piercing
 * together are: the Ultra -2 lands unconditionally, and a declared Corrosive
 * choice adds its -1 and withholds the damage. -3 and no damage is a sane
 * answer to a weapon made of acid.
 */
export const DEGRADE_FLAG = "corrosiveDegradeDeclared";
export const CORROSIVE_TAG = "Corrosive";

/** Does this item offer the Corrosive choice at all? */
export function offersArmourChoice(item)
{
  // From the sentences since Weapon Tags chunk 3: a hit gated on the roller's
  // targets-armour answer, which the toggle gives (ruling D).
  return offersArmourChoiceFromSentences(item);
}

/** Has the attacker declared they are going for the armour? */
export function isDegradingArmour(actor)
{
  return !!actor?.getFlag?.("vaarn", DEGRADE_FLAG);
}

export async function setDegradingArmour(actor, on)
{
  if(!actor) return;
  if(on) await actor.setFlag("vaarn", DEGRADE_FLAG, true);
  else await actor.unsetFlag("vaarn", DEGRADE_FLAG);
}

/**
 * Take up to `amount` off a target's armour, onto system.armor.damage - the
 * field the Corrosive choice and Ultra-Corrosive write - never below AV 10,
 * unarmoured. Returns { drop, effective } with `effective` the AV before.
 * Shared 2026-09-24 by the Damage armour gambit, from its card.
 */
export async function degradeArmour(actor, amount)
{
  const already = Math.max(0, Number(actor?.system?.armor?.damage) || 0);
  const effective = Number(actor?.system?.armor?.effective ?? actor?.system?.armor?.value ?? 0);
  const drop = Math.min(amount, Math.max(0, effective - 10));
  if (drop > 0) await actor.update({ "system.armor.damage": already + drop });
  return { drop, effective };
}

/** Clear it, reporting whether there was a declaration to clear. */
export async function clearArmourChoice(actor)
{
  if(!isDegradingArmour(actor)) return false;
  await actor.unsetFlag("vaarn", DEGRADE_FLAG);
  return true;
}

/**
 * { factor, named[] } — what the target's afflictions multiply incoming
 * damage by, and which ones did it, so a caller can say why rather than
 * changing a number silently.
 */
export function woundDamageMultiplier(actor) {
  let factor = 1;
  const named = [];
  for (const m of namedWoundPerSlot(actor, "damage-taken-per-slot")) {
    factor *= Math.pow(m.perSlot, m.slots);
    named.push(`<b>${m.name}</b> (${m.slots} slot${m.slots === 1 ? "" : "s"})`);
  }
  return { factor, named };
}

/**
 * What the ATTACKER's own live state multiplies the damage it deals by. 1 when
 * nothing applies.
 *
 * Not melee-gated, unlike the berserk flag it sits beside at the roll site:
 * the StimRig's book text says "melee" and Wrathworms' does not, so the gate
 * belongs to that item rather than to the idea of dealing double.
 */
export function outgoingDamageMultiplier(attackerActor) {
  return activeDeltas(attackerActor).conditions.includes(DEALS_DOUBLE_DAMAGE) ? 2 : 1;
}

/**
 * Which CREATURE_DAMAGE_RULES entry an actor answers to: its stored
 * `flags.vaarn.damageRuleKey` if it has one, else its name.
 *
 * THE KEY IS STORED because a name is not stable. Group 194 found it
 * (2026-09-18): a Vimana named anything but "Vimana" lost its immunity and its
 * pilot's, silently. Matt ruled the key be written at build time so a GM can
 * rename the throne. Vehicles carry it. Bestiary creatures and pets with an
 * entry carry it too since 2026-09-21 (bestiary-build.js creatureFlags); one
 * built before then still answers by name, which is what the fallback is for.
 */
export function damageRuleKey(actor) {
  return creatureActorFlagsOf(actor).damageRuleKey ?? actor?.name;
}

/** The per-creature override, if any bites. Returns null when nothing applies. */
export function creatureDamageOverride(item, targetActor) {
  return applyOverride(CREATURE_DAMAGE_RULES[damageRuleKey(targetActor)], item);
}

/** The condition override, if any bites. Same shape, same null on no match. */
export function conditionDamageOverride(item, targetActor) {
  for (const c of activeDeltas(targetActor).conditions) {
    const hit = applyOverride(CONDITION_DAMAGE_RULES[c], item);
    if (hit) return hit;
  }
  return null;
}

/**
 * The seat override: a vehicle whose rule shields its pilot passes that rule
 * to whoever is in its pilot slot. Vimana only (2026-09-18, Matt): "A vimana
 * and its pilot (while seated) are impervious to all damage."
 *
 * "While seated" IS the pilot slot. Nothing checks where the pilot's token
 * stands; clearing the slot is how someone leaves the throne, and it ends the
 * immunity at once because nothing is stored on the pilot.
 *
 * Looked up from the vehicles' side because that is where the link lives. A
 * world has a handful of vehicles, so scanning them per hit costs nothing.
 */
export function seatedDamageOverride(item, targetActor) {
  const uuid = targetActor?.uuid;
  if (!uuid || typeof game === "undefined") return null;
  for (const v of game.actors ?? []) {
    if (v.type !== "vehicle") continue;
    const entry = CREATURE_DAMAGE_RULES[damageRuleKey(v)];
    if (!entry?.shieldsPilot) continue;
    if (!(v.system.crew?.pilots ?? []).includes(uuid)) continue;
    const hit = applyOverride(entry, item);
    if (hit) return { ...hit, rule: `${entry.rule}, seated on ${v.name}` };
  }
  return null;
}

/**
 * Either override, creature first.
 *
 * Order is deliberate but currently unreachable: no creature in the pack can
 * drink an elixir, so nothing carries a name rule and a condition rule at
 * once. Creature-first is the conservative choice if one ever does — a
 * creature's own nature is the more specific claim.
 */
export function damageOverride(item, targetActor) {
  return creatureDamageOverride(item, targetActor)
      ?? seatedDamageOverride(item, targetActor)
      ?? conditionDamageOverride(item, targetActor);
}

function applyOverride(entry, item) {
  if (!entry) return null;
  const props = attackPropertiesOrKinetic(item);

  if (entry.passes?.some((p) => props.includes(p))) return null;
  if (entry.gmCall?.some((p) => props.includes(p)))
    return { mult: 0, immune: false, gmCall: true, rule: entry.rule };
  if (entry.immuneUnless && !entry.immuneUnless.some((p) => props.includes(p)))
    return { mult: 0, immune: true, rule: entry.rule, needs: entry.immuneUnless };

  return null;
}

// ---- creature-type gates ----------------------------------------------------
//
// Creature-Type Checkboxes wiring, 2026-09-22 (RULED by Matt). Two creature
// rules read the OTHER party's creature type, and both read it here so the
// question "does this actor have one of these types" has one answer:
// Drill Drone's Miner ("ADV when attacking mineral creatures") on the attack
// roll, and Creedspeaker's Command ("Targeted synthetic creatures must EGO
// Save") on the compelled-save card.
//
// system.creatureTypes is the PREPARED value, so a type granted for a while
// (Lithification Syrup's mineral) counts exactly as a native one does.

/** Every creature-type key an actor can carry. */
export const CREATURE_TYPE_KEYS = ["biological", "synthetic", "psychic", "fungal",
  "mineral", "hypergeometric", "outsider"];

/** Whether an actor has at least one of `types`. False for no actor. */
export function hasAnyCreatureType(actor, types)
{
  const ct = actor?.system?.creatureTypes ?? {};
  return (types ?? []).some((t) => !!ct[t]);
}

/**
 * TARGETS THAT MAKE ATTACKS AGAINST THEM ROLL AT DIS - To-Hit Resolution
 * Override wiring, RULED 2026-09-25 (Matt).
 *
 *  - ICKBULB: "most of Vaarn's carnivores ... roll with DIS if trying to bite a
 *    character covered in the residue." Every BITE, carnivore or not - Matt:
 *    "the ickbulb seems to be unpleasant for anyone". A bite is a weapon whose
 *    name contains one of BITE_WORDS. The smear is the span entry's marker.
 *  - VANTABLOSSOM: "Ranged attacks have DIS to hit you." A Neobloom boon, always
 *    on. Only a weaponRanged Item is known to be ranged - every creature
 *    attack is built as a melee Item, guns included - so against a creature's
 *    attack it is a NOTE, never forced.
 *
 * `hit(item)` answers true (force DIS), false (does not apply) or "maybe" (a
 * note for the Referee).
 */
export const BITE_WORDS = ["bite", "jaws", "fang", "mandible", "beak", "swallow"];
export const ICKBULB_SCENT = "ickbulbScent";
export const TARGET_DIS_RULES = [
  { label: "Ickbulb", why: "smeared with Ickbulb - bites roll at DIS",
    has: (t, hasCond) => hasCond(t, ICKBULB_SCENT),
    hit: (item) => BITE_WORDS.some((w) => String(item?.name ?? "").toLowerCase().includes(w)) },
  { label: "Vantablossom", why: "wrapped in Vantablossom shadow - ranged attacks roll at DIS",
    has: (t) => (t?.items ?? []).some((i) => i.type === "ancestry" && i.system?.rule === "Bloomboons" && i.system?.variant === "Vantablossom"),
    hit: (item) => item?.type === "weaponRanged" ? true : (item?.parent?.type === "npc" ? "maybe" : false) },
];

/**
 * Which of the rules above bite on this attack against these targets. DIS is
 * FORCED only when every targeted token qualifies - one roll serves them all,
 * the same reasoning advantageVsTargets gives. Otherwise a note names who.
 */
export function targetDisadvantage(item, targetActors, hasCond)
{
  const targets = (targetActors ?? []).filter(Boolean);
  const out = { force: false, notes: [] };
  if (!targets.length) return out;
  for (const r of TARGET_DIS_RULES) {
    const hit = r.hit(item);
    if (!hit) continue;
    const who = targets.filter((t) => r.has(t, hasCond));
    if (!who.length) continue;
    const names = who.map((t) => t.name).join(", ");
    if (hit === true && who.length === targets.length) {
      out.force = true;
      out.notes.push(`<b>${r.label}</b>: DIS - ${names} is ${r.why}.`);
    } else if (hit === true) {
      out.notes.push(`<b>${r.label}</b>: ${names} is ${r.why}; the others are not - roll against them separately.`);
    } else {
      out.notes.push(`<b>${r.label}</b>: ${names} has it - if this attack is ranged, it rolls at DIS (the Referee's call).`);
    }
  }
  // A WARD from the body's sentences (Gift Effect Library chunk 3, RULED
  // 2026-10-09): a passive "dis on attacks-against" on any Item the target
  // carries - attacks against it roll at DIS, whatever the attack.
  const warded = targets.map(t => ({ t, sources: bodyPassives(t, { verb: "dis" }).filter(p => p.sentence.do.on === "attacks-against").map(p => p.source) })).filter(x => x.sources.length);
  if (warded.length)
  {
    const names = warded.map(x => `${x.t.name} (${[...new Set(x.sources)].join(", ")})`).join(", ");
    if (warded.length === targets.length) { out.force = true; out.notes.push(`<b>Warded</b>: DIS - ${names}.`); }
    else out.notes.push(`<b>Warded</b>: ${names}; the others are not - roll against them separately.`);
  }
  return out;
}

/**
 * The attacker's declarations that grant ADV against these targets -
 * [{rule, types}], empty when none applies.
 *
 * EVERY TARGET MUST QUALIFY. One attack roll is read against every targeted
 * token, so ADV earned against one of them would be ADV against all. No
 * target means no ADV: the rule is about who is being attacked, and an attack
 * with nobody targeted gives nothing to read.
 */
export function advantageVsTargets(attacker, targetActors)
{
  const declared = creatureActorFlagsOf(attacker).advantageVs ?? [];
  const targets = (targetActors ?? []).filter(Boolean);
  if (!declared.length || !targets.length) return [];
  // `metalArmour` (2026-09-27): the Voltworm's "ADV to hit Synths or metal
  // armour" - a target in metal armour counts as well as one of the types.
  return declared
    .filter((d) => targets.every((t) => hasAnyCreatureType(t, d.types) || (d.metalArmour && wearsMetalArmour(t))));
}

// ---- ability damage on a hit ------------------------------------------------
//
// Ability Damage (woundDamage) wiring, 2026-09-22 (RULED by Matt). An attack
// may deal ability damage to a target it hits - a creature's Envelop declares
// it on its weapon Item's flag, a weapon tag (Freezing, Necrotic ...) on its
// roster row. Both reach the damage click through this one reader, so a tag
// and a creature attack cannot disagree about the shape.


/**
 * The ability damage an Item deals to each target it hits:
 * [{ ability, dice | flat, targets?, source }]. `source` names where it came
 * from - the Item itself or the tag - for the chat line.
 */
export function abilityDamageSpecsOf(item)
{
  // An Exotica weapon's loss is its sentence since Implants, Exotica and
  // Figments chunk 3b-ii (2026-10-06), read below: its stored flag is not
  // read too. A creature's attack keeps its flag (bestiary-build.js).
  const own = item?.flags?.vaarn?.exotica === true ? []
    : (creatureAttackOf(item).abilityDamage ?? []).map((s) => ({ ...s, source: item.name }));
  // Effect Engine: Weapon Tags chunk 3 (2026-10-05): from the weapon's
  // sentences - its tags through the translator - not the roster rows.
  const fromTags = hitAbilityDamage(item)
    // `property` when the tag is itself a damage type - Freezing, and
    // Ultra-Corrosive (corrosive/acid, which nothing is immune to yet): the
    // loss rides that type, so a target immune to it takes none (RULED
    // 2026-09-23, Matt - "immune includes immunity to the dex loss"). A tag
    // that is only an ability loss (Lithifying, Necrotic) gets no property
    // and is never blocked this way; nor is a creature's own attack.
    // Only a weapon TAG names a damage type; an Exotica's name does not (chunk 3b-ii).
    .map(({ tag, ...spec }) => ({ ...spec, property: tag && WEAPON_TAG_EFFECTS[tag] ? (normalise(tag) || null) : null }));
  return [...own, ...fromTags];
}

/**
 * The saves a weapon's tags compel on a HIT - Compel-a-Target Save, RULED
 * 2026-09-24 (Matt) on the Roll-Notes cluster: Agonising, Blinding,
 * Concussive, Entangling and Neurotoxic post a card to roll, where they had
 * been (or were filed to be) reminder text. One entry per tag, `source` the
 * tag's name. A save may name `actorTypes`: Agonising asks a PC for EGO and
 * anything else for Morale, so the caller keeps the ones its target is.
 */
export function tagSaveSpecsOf(item)
{
  // Effect Engine: Weapon Tags chunk 3 (2026-10-05): the resisted sentences a
  // hit carries, grouped by tag, each with the condition a failure applies.
  return hitSaveSpecs(item);
}

/**
 * Is this target immune to damage of this one attack property? Resolved
 * through the same interaction table a hit uses, so every immunity source -
 * creature type, ancestry key, condition - answers here too.
 */
export function immuneToAttackProperty(targetActor, property) {
  if (!property) return false;
  return !!resolveDamageInteractions({ system: { damageTypes: [property] } }, targetActor)?.immune;
}

/**
 * The PER-ROUND ability loss an Item starts - Ability Damage pass 3,
 * 2026-09-22. Same shape as abilityDamageSpecsOf, from the abilityTick flag:
 * a hit (the Psyche Leech's syphon) or a use (Occulith's gaze) applies the
 * first loss at once and starts an entry on the target's board.
 */
export function abilityTickSpecsOf(item)
{
  return (creatureFlagsOf(item).abilityTick ?? []).map((s) => ({ ...s, source: item.name }));
}

/**
 * The escalating per-round HP loss this ability STARTS - Brain Burster,
 * 2026-09-22. The sibling of abilityTickSpecsOf, and read the same way.
 */
export function escalatingSpecsOf(item)
{
  return (creatureFlagsOf(item).escalating ?? []).map((s) => ({ ...s, source: item.name }));
}
