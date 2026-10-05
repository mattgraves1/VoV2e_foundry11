/**
 * The Creature Generator, as a module function — foundry-system-index.csv
 * "Wholly-New Creature Generation".
 *
 * MOVED HERE FROM macros/generate-monster.js on 2026-09-24, unchanged in what
 * it rolls, so that a second caller could reach it: the Metamorphic Syrup
 * (Elixir Use Normalisation, RULED 2026-09-23 by Matt) runs this path on the
 * drink and creates the rolled creature as a new npc Actor linked from the
 * drink card, leaving the drinker's own sheet as the record of who they were.
 * A macro is a world copy that nothing in module/ can import, so the rolling
 * had to live here for the sheet to call it; the macro now delegates to this
 * function and keeps only its picker.
 *
 * WHAT IT ROLLS, from JADE IBIS 15-09-26's Creature Generator (pp. 223-224):
 *   - ONE d20 roll gives Level, HP, AV, Morale and the number encountered.
 *   - The creature's TYPE is rolled TWICE on the Type column and both are
 *     recorded; a duplicate second roll is ignored. `knownType` fixes the
 *     first roll only (the macro's picker).
 *   - Attacks: Level 5+ rolls twice and keeps the higher; Level 8+ rolls
 *     three times and keeps the two highest as two separate attacks.
 *   - The Attacks table's third column is a SPECIAL DEFENSE. Psychic
 *     creatures get a note to generate a Mystic Gift, not a roll.
 *   - A physical form is rolled once per type, on that type's form table.
 *
 * No weapon Item is created for the rolled attack: its "Weak Melee (d4)"
 * name is a category, not a weapon worth a real Item. The attack, special
 * and defense text goes in the Actor's biography. The Actor lands in the
 * "Generated Creatures" folder the companion generator also uses.
 */
import { CORE_STATS, ATTACKS, PHYSICAL_FORMS, APPEARANCE_BEHAVIOUR } from "./monster-generator-data.js";
import { moraleModeFor } from "./morale.js";
import { attackWeaponItem } from "./generated-gear.js";
import { specialItems, defenseNoteItem } from "./generated-specials.js";

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function d(n) { return Math.floor(Math.random() * n) + 1; }

export const GENERATED_FOLDER = "Generated Creatures";

/**
 * Roll a wholly new creature and create it as an npc Actor. Returns the Actor.
 * `knownType` fixes the first type roll; null rolls it.
 */
export async function generateMonster(knownType = null)
{
  // Step 1: one roll for the statistics, two for the type.
  const chosen = CORE_STATS[d(20) - 1];
  const firstType = knownType || CORE_STATS[d(20) - 1].type;
  const secondRoll = CORE_STATS[d(20) - 1].type;
  const types = secondRoll === firstType ? [firstType] : [firstType, secondRoll];

  // Step 2: attack rolls by Level. Higher roll wins, and Level 8+ keeps two.
  const rolls = chosen.level >= 8 ? 3 : chosen.level >= 5 ? 2 : 1;
  const keep = chosen.level >= 8 ? 2 : 1;
  const attackRolls = Array.from({ length: rolls }, () => d(20)).sort((a, b) => b - a).slice(0, keep);
  const attacks = attackRolls.map(r => ATTACKS[r - 1]);

  // Step 3: one form per type.
  const forms = types.map(t => PHYSICAL_FORMS[t] ? pick(PHYSICAL_FORMS[t]) : null).filter(Boolean);

  // Step 4: appearance and behaviour.
  const hue = pick(APPEARANCE_BEHAVIOUR.Hue);
  const texture = pick(APPEARANCE_BEHAVIOUR.Texture);
  const behaviour = pick(APPEARANCE_BEHAVIOUR.Behaviour);
  const habitat = pick(APPEARANCE_BEHAVIOUR.Habitat);

  const creatureTypes = { biological: false, synthetic: false, psychic: false, fungal: false, mineral: false, hypergeometric: false, outsider: false };
  for(const t of types) { const k = t.toLowerCase(); if(k in creatureTypes) creatureTypes[k] = true; }

  const avMatch = String(chosen.av).match(/\d+/);
  const avValue = avMatch ? parseInt(avMatch[0]) : 10;

  // Core Stats prints a "+N" bonus on every row except two: row 1 is
  // "Always Flees" and row 20 is "Never Flees". Those used to fall through
  // to 0, which under the real rule (d20 + ML vs 16) makes the creature that
  // never flees run away three times in four. moraleMode carries them
  // instead — same vocabulary as the Bestiary, see morale.js.
  const moraleMatch = chosen.morale.match(/^\+(\d+)$/);
  const moraleValue = moraleMatch ? parseInt(moraleMatch[1]) : 0;
  const moraleNote = moraleMatch ? null : chosen.morale; // "Always Flees" / "Never Flees"
  const moraleMode = moraleMatch ? "" : moraleModeFor(chosen.morale);

  const abilityValue = Math.min(chosen.level, 10);
  const abilities = {};
  for(const k of ["str", "dex", "con", "int", "psy", "ego"]) abilities[k] = { value: abilityValue, max: 10, woundDamage: 0 };

  const name = `${hue} ${firstType} ${forms[0] || "Creature"}`;

  const bioLines = [`<p><b>Type:</b> ${types.join(" / ")}</p>`, `<p><b>AV:</b> ${chosen.av}</p>`];
  if(moraleNote) bioLines.push(`<p><i>Morale: ${moraleNote}</i></p>`);
  bioLines.push(`<p><b>Form:</b> ${forms.length ? forms.join(" / ") : "—"}</p>`);
  bioLines.push(`<p><b>Hue:</b> ${hue}</p><p><b>Texture:</b> ${texture}</p><p><b>Behaviour:</b> ${behaviour}</p><p><b>Habitat:</b> ${habitat}</p>`);
  attacks.forEach((a, i) =>
  {
    const label = attacks.length > 1 ? `Attack ${i + 1}` : "Attack";
    bioLines.push(`<p><b>${label}:</b> ${a.attack}</p><p><b>Special Attack:</b> ${a.special}</p><p><b>Special Defense:</b> ${a.defense}</p>`);
  });
  if(creatureTypes.psychic)
    bioLines.push(`<p><i>Psychic: generate a random Mystic Gift in addition to its attacks.</i></p>`);

  let folder = game.folders.find(f => f.name === GENERATED_FOLDER && f.type === "Actor");
  if(!folder) folder = await Folder.create({ name: GENERATED_FOLDER, type: "Actor" });

  // A Special Defense the damage table can apply (Mystic Gift Damage to a
  // Target, RULED 2026-09-26 by Matt) - written on the Actor, since a generated
  // creature has no name to key a rule on. Named after the defense itself, so
  // the chat line reads "is Half Damage from Gifts - ...".
  // ONE PER DEFENSE: a Level 8+ creature keeps two attacks, and both can land
  // on the same row - that is one defense, not two (Group 419, where a doubled
  // Half Damage from Kinetic took a Fungal creature to an eighth).
  const damageRules = attacks.filter((a, i) => a.damageRule && attacks.findIndex(b => b.defense === a.defense) === i)
    .map(a => ({ ...a.damageRule, rule: a.defense, note: `Special Defense: ${a.defense}` }));
  // The Toxin Die's own reading of ADV vs Toxins and Immune to Toxins - see
  // toxinModifiers. Immunity outranks advantage when both are rolled.
  const toxin = attacks.find(a => a.toxinDefense === "immune") ?? attacks.find(a => a.toxinDefense);
  const vaarnFlags = { ...(damageRules.length ? { damageRules } : {}),
    ...(toxin ? { toxinDefense: toxin.toxinDefense, toxinDefenseName: toxin.defense } : {}) };

  // The attacks a natural weapon can carry, from both the Attack and Special
  // Attack columns (Generated Gear and Attacks as Items, step 2, RULED
  // 2026-10-04): "Melee (d6)", "Lightning (d8, electrical)". The rest stay in
  // the biography until step 3. One weapon per distinct attack - a Level 8+
  // creature can land on the same row twice.
  const attackTexts = [...new Set(attacks.flatMap(a => [a.attack, a.special]))];
  // Step 3: the specials a Bestiary creature already declares, built as that
  // creature's are (generated-specials.js). A string neither step reads stays in the biography.
  const items = [...attackTexts.map(attackWeaponItem).filter(Boolean),
    ...specialItems(attackTexts, { name, level: chosen.level, types: types.map(t => t.toLowerCase()) }),
    // A note Item per distinct Special Defense (RULED 2026-10-04): the defense
    // itself already works from the flags below; the Item makes it visible.
    ...[...new Set(attacks.map(a => a.defense))].map(d => defenseNoteItem(d))];

  const actorCls = getDocumentClass("Actor");
  const actor = await actorCls.create(
  {
    name,
    type: "npc",
    folder: folder.id,
    items,
    ...(Object.keys(vaarnFlags).length ? { flags: { vaarn: vaarnFlags } } : {}),
    system:
    {
      level: { value: chosen.level, min: 1 },
      health: { value: chosen.hp, min: 0, max: chosen.hp },
      armor: { value: avValue, bonus: 0 },
      morale: { value: moraleValue, max: 20, min: 0, mode: moraleMode, note: moraleNote || "" },
      enc: chosen.encountered,
      abilities,
      creatureTypes,
      biography: bioLines.join("")
    }
  });

  ui.notifications.info(`Created "${actor.name}" in the "${GENERATED_FOLDER}" folder.`);
  return actor;
}
