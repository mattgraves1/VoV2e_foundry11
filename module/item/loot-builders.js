/**
 * Loot Builders — the item-data half of every generate-* macro, in one place.
 *
 * Treasure Cache Generation, foundry-system-index.csv. RULED 2026-09-19
 * (Matt): the builders that used to live inline in each macro move here, and
 * both the macros and the cache call them, rather than the cache carrying a
 * second copy that drifts from the first.
 *
 * EVERY BUILDER RETURNS AN ARRAY OF ITEM DATA AND CREATES NOTHING. A macro
 * passes the result to Item.createDocuments (unowned, in the Items sidebar,
 * per Matt's 2026-08-21 Phase 1 call); the cache passes it to
 * createEmbeddedDocuments on its container actor. An array rather than one
 * object because two builders can yield more than one Item: a Polymorphic
 * weapon comes with its paired alt form, and a Gear roll is two results.
 *
 * The macros' dice stay the macros' dice: `d` from chargen-app.js, a local
 * NdM roller for trade goods, rollOnTable for the weighted d100 tables. The
 * cache adds no dice of its own to anything built here.
 */

import {
  ARMOUR_TABLE, ARMOUR_QUALITIES, HELM_TABLE, SHIELD_TABLE, DRUG_HUES, DRUG_FORMS, DRUG_INGESTED,
  DRUG_EFFECTS, GIFT_QUALITIES_ALL, GIFT_FORMS_ALL, IMPLANTS, GEAR_A,
  GEAR_B_BASE, GEAR_B_DRUG_INDEX, CODEX_APPEARANCES, ELIXIRS
} from "../actor/chargen-data.js";
import * as chargenData from "../actor/chargen-data.js";
import { d, gearItemData, KnaveCharacterCreator } from "../actor/chargen-app.js";
import { rollWeapon } from "../actor/weapon-roller.js";
import { ADVANCED_EXOTICA } from "../actor/advanced-exotica-data.js";
import { ROLLTABLES } from "../actor/rolltable-data.js";
import { spanFieldFrom } from "../time/declared-span.js";
import { ADVANCED_IMPLANTS, ADVANCED_IMPLANT_SLOTS } from "../actor/advanced-implants-data.js";
import { TRADE_GOODS } from "../actor/trade-goods-data.js";
import { EQUATIONS } from "../actor/codex-data.js";
import { rollOnTable } from "../actor/roll-range.js";
import { THIRD_OF_A_SLOT } from "../actor/rest.js";
import { qualityByRoll, qualityFlag, slotsWithQuality } from "./trade-good-quality.js";
import { flavorIsMetal } from "./metal.js";
import { exoticaArmourAv } from "../actor/exotica-effects-data.js";
import { MUTATION_TABLE } from "../actor/mutation-data.js";

/** A plain NdM or flat-integer formula. Every trade-goods formula is one. */
export function rollFormula(formula)
{
  const match = /^(\d+)d(\d+)$/i.exec(String(formula).trim());
  if(!match) return Number(formula);
  let total = 0;
  for(let i = 0; i < Number(match[1]); i++) total += d(Number(match[2]));
  return total;
}

/** "[[Page|Label]]" -> "Label", "[[Page]]" -> "Page". */
export function stripWikilinks(text)
{
  return String(text ?? "").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/**
 * A weapon of the given quality ("Basic", "Advanced", "Exotic"), plus its
 * Polymorphic pair when it has one. The pair is linked BY NAME in a flag, set
 * in the data rather than after creation so it survives landing on an actor
 * — see generate-weapon.js for why a name link and not an id.
 */
export async function buildWeapon(quality, baseChoice = null, basicTag = null, advancedTag = null, exoticTag = null, forceKind = null, faithChoice = null)
{
  const { name, type, system, flags, baseNote, altForm } =
    await rollWeapon(quality, baseChoice, basicTag, advancedTag, exoticTag, forceKind, faithChoice);
  const main = { name, type, system, flags };
  const out = [main];
  if(altForm)
  {
    main.flags = { vaarn: { ...flags.vaarn, polymorphicPairName: altForm.name } };
    out.push({ name: altForm.name, type: altForm.type, system: altForm.system, flags: { vaarn: { polymorphicPairName: name } } });
  }
  out.baseNote = baseNote ?? "";
  return out;
}

/**
 * One ARMOUR_TABLE row as an Item. `quality` is the rolled adjective, or
 * null for the base type unqualified — Matt ruled 2026-09-20 that the
 * compendium ships the seven types without a quality word, the adjective
 * being a property of the ROLL rather than of the armour.
 *
 * toxSaveAdv IS CARRIED (2026-09-20), and was not before. toxin-die.js finds
 * the ADV on saves vs Toxins by `system.toxSaveAdv` on an equipped armor
 * Item and chargen-app.js sets it, but this builder — the Generate Armour
 * macro's and the treasure cache's — did not, so a Hazard Wrap from either
 * arrived carrying the sentence in its description and none of the effect.
 * Fixed here rather than at each caller because this is now the single place
 * a body armour is shaped.
 */
export function armourItemData(entry, quality = null)
{
  return [{
    name: quality ? `${quality} ${entry.type}` : entry.type,
    type: "armor",
    system:
    {
      slots: entry.slots ?? 1,
      armorSlot: "body",
      avBonus: (entry.av ?? 11) - 10,
      description: entry.special ? `<p>${entry.special}</p>` : "",
      toxSaveAdv: entry.toxSaveAdv ?? false
    }
  }];
}

/** Starting-tier body armour, the same ARMOUR_TABLE chargen rolls. */
export function buildArmour()
{
  const roll = d(20);
  const entry = ARMOUR_TABLE.find(e => roll >= e.min && roll <= e.max);
  // Its own d20, not a pick from the type's row - see ARMOUR_QUALITIES.
  const quality = ARMOUR_QUALITIES[d(20) - 1];
  return armourItemData(entry, quality);
}

/** One named Helm — the shape chargen gives a rolled helmet. */
export function helmItemData(name)
{
  return [{ name, type: "armor",
    system: { slots: 1, armorSlot: "helm", avBonus: 1, description: "<p>+1 AV while worn.</p>" } }];
}

/** A Helm, named off HELM_TABLE. */
export function buildHelm()
{
  return helmItemData(HELM_TABLE[d(20) - 1]);
}

/** One named Shield — the shape chargen gives a rolled shield. */
export function shieldItemData(name)
{
  return [{ name, type: "armor",
    system: { slots: 1, armorSlot: "shield", avBonus: 1,
      description: "<p>+1 AV while carried. Must be actively carried — lost if you drop it or are disarmed.</p>" } }];
}

/** A Shield, named off SHIELD_TABLE. */
export function buildShield()
{
  return shieldItemData(SHIELD_TABLE[d(20) - 1]);
}

/** A Vaarnish drug: colour, form and route rolled, two distinct effects. */
export function buildDrug()
{
  const hue = DRUG_HUES[d(20) - 1];
  const form = DRUG_FORMS[d(20) - 1];
  const ingestedBy = DRUG_INGESTED[d(20) - 1];
  const e1 = d(20) - 1;
  let e2 = d(20) - 1;
  while(e2 === e1) e2 = d(20) - 1;
  return [{
    name: `${hue} ${form}`.trim(),
    type: "item",
    system: { slots: 1, description: `Ingested by: ${ingestedBy}. ${DRUG_EFFECTS[e1]} + ${DRUG_EFFECTS[e2]}` }
  }];
}

/**
 * A rolled mutation (Generate Mutation): d100 on the Mutation table. Moved here
 * 2026-10-08 so the Follow-Up Roll Button's "Induces Mutations" makes the same
 * Item as the macro.
 */
export function buildMutation()
{
  const roll = d(100);
  const entry = MUTATION_TABLE[roll - 1];
  return [{
    name: entry.name,
    type: "mutation",
    system: { slots: 0, roll, description: `<p><b>d100 roll:</b> ${roll}</p><p>${entry.effect}</p>` }
  }];
}

/** A Source of Random Gift: quality and form each from a random column. */
export function buildGift()
{
  const quality = GIFT_QUALITIES_ALL[Math.floor(Math.random() * 4)][d(20) - 1];
  const form = GIFT_FORMS_ALL[Math.floor(Math.random() * 4)][d(20) - 1];
  return [{
    name: `${quality} ${form}`,
    type: "gift",
    system:
    {
      slots: 1,
      source: `${quality} / ${form}`,
      description: "<p>Random Gift — players and referee must collectively agree on the specific effect.</p>"
    }
  }];
}

/**
 * THE EXOTICA GENERATOR'S FOUR COLUMNS - foundry-system-index.csv "Exotica
 * Generator Items", RULED 2026-10-09 (Matt). Read from the shipped RollTable's
 * rows (rolltable-data.js, Treasure/Exotica Generator.md), one object per d100
 * row, so the macro and the table can never disagree.
 */
export const EXOTICA_GENERATOR = (() =>
{
  const table = ROLLTABLES.find(t => t.name === "Exotica Generator");
  const word = (text, k) => (new RegExp(`\\*\\*${k}:\\*\\* ([^\\n]+)`).exec(text)?.[1] ?? "").trim();
  return (table?.results ?? []).map(r => ({ n: r.range[0], material: word(r.text, "Material"), form: word(r.text, "Form"),
                                              theme: word(r.text, "Theme"), action: word(r.text, "Action") }));
})();

/**
 * A wholly new Exotica from the generator: d100 on each column, independently.
 * RULED 2026-10-09 (Matt): named Material + Form ("Coral Anchor"), the Theme
 * and the Action in the description with all four words listed; one slot; NO
 * usage die - unlimited until the GM gives it one through the builder, which
 * is also where its cost lives; worth 1 XP by its type, as every Exotica is;
 * made only by the Generate Exotica macro, so a GM adds curated things where
 * and when they want. `source` keeps the four words for the Effects tab's
 * suggestions (exotica-generator-suggestions.js), as a Gift's Quality / Form.
 */
export function buildGeneratedExotica()
{
  const pick = key => EXOTICA_GENERATOR[d(100) - 1]?.[key] ?? "";
  return generatedExoticaData({ material: pick("material"), form: pick("form"), theme: pick("theme"), action: pick("action") });
}

export function generatedExoticaData({ material, form, theme, action })
{
  const article = /^[aeiou]/i.test(material) ? "An" : "A";
  return [{
    name: `${material} ${form}`,
    type: "exotica",
    system: {
      slots: 1,
      source: `${material} / ${form} / ${theme} / ${action}`,
      description: `<p>${article} ${material.toLowerCase()} ${form.toLowerCase()} of ${theme.toLowerCase()}, for ${action.toLowerCase()}.</p>`
        + `<p><b>Material:</b> ${material} &middot; <b>Form:</b> ${form} &middot; <b>Theme:</b> ${theme} &middot; <b>Action:</b> ${action}</p>`
        + `<p>From the Exotica Generator. What it does is the table's to agree: the Effects tab offers suggestions from its words, and the Referee sets its cost there.</p>`
    },
    flags: { vaarn: { exotica: true, generated: true } }
  }];
}

/**
 * An Advanced Exotica, in whichever of its three shapes the entry needs: an
 * Exotic weapon (rows that say so), an `armor` Item for the worn entries, or
 * an `exotica` Item. See generate-advanced-exotica.js for the history of
 * each branch; the logic is unchanged, only moved.
 */
export async function buildAdvancedExotica()
{
  return advancedExoticaData(ADVANCED_EXOTICA[d(100) - 1]);
}

/**
 * One ADVANCED_EXOTICA row as Item data. Split out of buildAdvancedExotica
 * so the compendium can walk the roster — the roll above picks the entry,
 * everything below shapes it, and there is one shaping.
 *
 * The two `weaponGen` rows still roll: they do not NAME an Exotica, they say
 * "generate an Exotic weapon", so they have no canonical form and the
 * compendium skips them. See buildPackItems.
 */
export async function advancedExoticaData(entry)
{
  if(entry.weaponGen)
  {
    const out = await buildWeapon("Exotic", null, null, null, null, entry.weaponGen === "melee" ? "Melee" : "Ranged");
    out.exoticaEntry = entry;
    return out;
  }

  if(entry.armorType)
  {
    const system =
    {
      slots: entry.slots,
      description: `<p>${entry.description}</p><p><b>Uses:</b> ${entry.uses}</p>`,
      ...spanFieldFrom(entry),
      armorSlot: entry.armorType.armorSlot,
      // From its sentence (Stats as Sentences chunk 2b, ruling C) - one source in the data.
      avBonus: exoticaArmourAv(entry.name)
    };
    if(entry.armorType.liveAbilityBonus) system.liveAbilityBonus = entry.armorType.liveAbilityBonus;
    if(entry.usageDie) system.usageDie = entry.usageDie;
    // An armour-shaped Exotica is still Exotica: without the flag it shows a
    // Trade Value, when Exotica are the advancement currency worth 1 XP.
    const out = [{ name: entry.name, type: "armor", system, flags: { vaarn: { exotica: true } } }];
    out.exoticaEntry = entry;
    return out;
  }

  // A WEAPON THAT DEALS ONLY ABILITY DAMAGE - Philosopher's Dirk, Desiccation
  // Spike. RULED 2026-09-22 (Matt): neither prints a save, so it rolls to hit,
  // and it is built as a melee weapon with no HP formula carrying the loss,
  // exactly as a creature's Envelop is. Still Exotica (the flag) and still
  // spent by its usage die, which the attack rolls.
  if(entry.abilityDamage)
  {
    const system = { slots: entry.slots, damageDice: "", tags: [],
                     description: `<p>${entry.description}</p><p><b>Uses:</b> ${entry.uses}</p>`, ...spanFieldFrom(entry) };
    if(entry.usageDie) system.usageDie = { ...entry.usageDie };
    const out = [{ name: entry.name, type: "weaponMelee", system,
                   // The loss is the Exotica's sentence since Implants, Exotica and
                   // Figments chunk 3b-ii (2026-10-06), read through the weapon translator.
                   flags: { vaarn: { exotica: true } } }];
    out.exoticaEntry = entry;
    return out;
  }

  // A PLAIN WEAPON - the Not-Sword's d8, the Tempest Cannon's d12 blast and
  // electrical (Creation-Time Item Modifiers wiring, RULED 2026-09-26 by Matt).
  // The Dirk's shape above with an HP die: still Exotica (the flag), and a
  // usage die rolls on every use. `reload` names what refills a spent die.
  if(entry.weapon)
  {
    const w = entry.weapon;
    const system = { slots: entry.slots, damageDice: w.damageDice, hands: w.hands ?? 1, tags: [],
                     ...(w.damageTypes?.length ? { damageTypes: [...w.damageTypes] } : {}),
                     description: `<p>${entry.description}</p><p><b>Uses:</b> ${entry.uses}</p>`, ...spanFieldFrom(entry) };
    if(entry.usageDie) system.usageDie = { ...entry.usageDie };
    const out = [{ name: entry.name, type: w.type, system,
                   // The reload is the Exotica's refill sentence since chunk 3b-ii (reloadOf).
                   flags: { vaarn: { exotica: true } } }];
    out.exoticaEntry = entry;
    return out;
  }

  const system = { slots: entry.slots, description: `<p>${entry.description}</p><p><b>Uses:</b> ${entry.uses}</p>`, ...spanFieldFrom(entry) };
  if(entry.usageDie) system.usageDie = entry.usageDie;
  if(entry.usesRemaining) system.usesRemaining = entry.usesRemaining;
  const out = [{ name: entry.name, type: "exotica", system, flags: { vaarn: {} } }];
  out.exoticaEntry = entry;
  return out;
}

// Standing GM Reminder: the Watchful Ferret's row is its own gm-reminder sentence since
// Implants, Exotica and Figments chunk 5 (RULED 2026-10-06, Matt); the roster's
// gmReminder is no longer copied onto the Item as a flag (time/gm-reminder.js).

/** An Advanced Cybernetic Implant. */
export function buildAdvancedImplant()
{
  return advancedImplantData(ADVANCED_IMPLANTS[d(20) - 1]);
}

/** One ADVANCED_IMPLANTS row as Item data. */
export function advancedImplantData(entry)
{
  return [{
    name: entry.name,
    type: "implant",
    system:
    {
      slots: ADVANCED_IMPLANT_SLOTS,
      description: `<p><b>Ability Slot:</b> ${entry.ability_slot}</p><p>${entry.effect}</p>`
    }
  }];
}

/** A starting-tier Cybernetic Implant. */
export function buildStartingImplant()
{
  return startingImplantData(IMPLANTS[d(20) - 1]);
}

/** One IMPLANTS row as Item data. */
export function startingImplantData(entry)
{
  return [{
    name: entry.name,
    type: "implant",
    system:
    {
      slots: 0,
      usesRemaining: entry.name === "Trauma-Response Rig" ? 1 : 0,
      description: `<p><b>Ability slot:</b> ${entry.ability_slot}</p><p>${entry.effect}</p>`
    }
  }];
}

/**
 * An implant FOUND rather than installed: the sealed capsule an exotica Item
 * carries (system.sealedImplant), whose Use installs it - the same shape the
 * Cybernetics Pack and the Surgical Array make. Treasure caches build these
 * (RULED 2026-09-27, Matt: "fix the cache capsules in this build"): a found
 * implant built as an implant Item was installed the moment it reached a pack.
 * Takes the implant's own Item data, so the description is the same text.
 */
export function implantCapsuleData([implant])
{
  return [{
    name: `Sealed Implant (${implant.name})`,
    type: "exotica",
    system:
    {
      slots: 1,
      sealedImplant: implant.name,
      description: `<p>A sealed cybernetic capsule. Use it to install: <b>${implant.name}</b>.</p>${implant.system.description}`
    }
  }];
}

/**
 * A Trade Good. The found count goes in the name and the priced groups in
 * quantity, exactly as the Generate Trade Good macro always did — a trade
 * good is billed by its own notes, never by the fractional-slot rate.
 */
export function buildTradeGood()
{
  const roll = d(100);
  const entry = TRADE_GOODS.find(e => roll >= e.range[0] && roll <= e.range[1]);
  const rawFound = rollFormula(entry.quantityFormula) * (entry.multiplier || 1);
  const perUnitValue = rollFormula(entry.valueFormula);
  const groups = Math.max(1, Math.round(rawFound / entry.perUnitCount));


  // Quality Roll on Generated Good. HERE rather than in the macro, because
  // this builder is shared with Treasure Cache Generation - the book rolls a
  // quality "when discovering caches of trade goods OR encountering trade
  // caravans", which is exactly those two callers.
  //
  // NOTHING ABOUT IT GOES IN `desc`. The description is player-visible and
  // the quality is the Referee's (Matt, 2026-09-19), so it rides on a flag
  // and is rendered only inside the item sheet's GM block. The same reason
  // keeps it out of the NAME, where a weapon would put its tags.
  //
  // THE SLOT MULTIPLIER IS BAKED AND THE VALUE ONE IS NOT - see
  // trade-good-quality.js slotsWithQuality for why those differ, and why
  // Featherlight is the one halving this cannot apply.
  const quality = qualityByRoll(d(20));
  // PER-UNIT SLOT WEIGHT (2026-09-19). The base is the GOOD's own per-unit
  // figure now, not a flat 1: 12 of the 50 carry one in the book ("Bulky - 2
  // slots per hide", "stack 100 to a slot", "Weightless") and until this row
  // none of them was encoded, so every stack cost 1 slot whatever it was.
  //
  // THE RAW UNIT COUNT IS RECORDED BECAUSE `quantity` CANNOT CARRY IT:
  // quantity holds PRICED GROUPS so the sheet's Quantity x Trade Value comes
  // to the stack's worth, and 600 olives is quantity 6. slotCostOf reads
  // flags.vaarn.units and falls back to quantity for every other Item.
  //
  // NO COUNT IN THE NAME (Matt, 2026-09-24). The name used to carry the raw
  // count ("1700 Dried Grubs"), which a partial sale left behind. For the 47
  // goods priced per item it only repeated quantity. The 3 priced per group
  // are named BY THE LOT - "Dried Grubs (lots of 100)", quantity 17. The units
  // flag stays, and false-sale.js scales it with quantity so weight follows.
  const lot = entry.perUnitCount > 1 ? entry.perUnitCount : 1;
  const basePerUnit = entry.slotsPerUnit ?? 1;
  const slots = slotsWithQuality(basePerUnit, quality);

  const desc = [];
  if(lot > 1)
    desc.push(`<p>Sold in lots of ${lot} ${entry.unit}; Trade Value is per lot.</p>`);
  desc.push(`<p><b>Book Trade Value:</b> ${entry.valueText}</p>`);
  if(entry.notes) desc.push(`<p><b>Notes:</b> ${entry.notes}</p>`);

  // Face Armour Slot, RULED 2026-09-27 (Matt): a good that is worn - the
  // Masks - is an armour Item, still ONE stack of the rolled count. Its AV is
  // per Item, not per unit, so a stack of five worn is still +1.
  const worn = entry.armorType ? { armorSlot: entry.armorType.armorSlot, avBonus: entry.armorType.avBonus } : {};

  return [{
    name: lot > 1 ? `${entry.name} (lots of ${lot})` : entry.name,
    type: entry.armorType ? "armor" : "item",
    system: { quantity: groups, tradeValue: perUnitValue, slots, description: desc.join(""), ...worn },
    flags: { vaarn: { ...qualityFlag(quality).vaarn, units: rawFound } }
  }];
}

/**
 * One Starting Gear result by name. A Helmet or Shield result becomes an
 * armor Item, as chargen does; the Gear B drug slot becomes a rolled drug.
 */
function gearResult(gearName, isDrug)
{
  if(isDrug) return buildDrug();
  if(gearName === KnaveCharacterCreator.GEAR_HELMET) return buildHelm();
  if(gearName === KnaveCharacterCreator.GEAR_SHIELD) return buildShield();
  // Usage die and "(×N)" count parsed out of the name, both suffixes stripped.
  return [gearItemData(gearName)];
}

/** The Generate Starting Gear roll: one Gear A and one Gear B. */
export function buildGear()
{
  const bRoll = d(20) - 1;
  return [
    ...gearResult(GEAR_A[d(20) - 1], false),
    ...gearResult(GEAR_B_BASE[bRoll], bRoll === GEAR_B_DRUG_INDEX)
  ];
}

/**
 * ONE piece of Equipment, for a cache's "d4 Equipment". Matt ruled
 * 2026-09-19 that Equipment is the Starting Gear tables. Which column a
 * single piece comes from the book does not say, so each piece picks Gear A
 * or Gear B evenly and then rolls a d20 on it.
 */
export function buildEquipment()
{
  if(Math.random() < 0.5) return gearResult(GEAR_A[d(20) - 1], false);
  const bRoll = d(20) - 1;
  return gearResult(GEAR_B_BASE[bRoll], bRoll === GEAR_B_DRUG_INDEX);
}

/**
 * The d20 flavour-item tables. `fields` drive the Generate Flavor Item
 * dialog's override pickers; `build` turns the rolled values into a name and
 * description.
 */
export const FLAVOR_CATEGORIES =
{
  "Fine Clothing":
  {
    table: "FINE_CLOTHING",
    fields: [{ key: "colour", label: "Colour" }, { key: "material", label: "Material" }, { key: "item", label: "Item" }, { key: "decorated_with", label: "Decorated With" }],
    build: (v) => ({ name: `${v.colour} ${v.material} ${v.item}`, description: `<p><b>Decorated with:</b> ${v.decorated_with}</p>` })
  },
  "Musical Instruments":
  {
    table: "MUSICAL_INSTRUMENTS",
    fields: [{ key: "instrument_a", label: "Instrument A" }, { key: "instrument_b", label: "Instrument B" }, { key: "sound", label: "Sound" }, { key: "decorated_with", label: "Decorated With" }],
    build: (v) => ({ name: `${v.instrument_a} ${v.instrument_b}`, description: `<p><b>Sound:</b> ${v.sound}</p><p><b>Decorated with:</b> ${v.decorated_with}</p>` })
  },
  "Vaarnish Poisons":
  {
    table: "VAARNISH_POISONS",
    fields: [{ key: "colour", label: "Colour" }, { key: "form", label: "Form" }, { key: "delivery", label: "Delivery" }, { key: "effect", label: "Effect" }],
    build: (v) => ({ name: `${v.colour} ${v.form}`, description: `<p><b>Delivery:</b> ${v.delivery}</p><p><b>Effect:</b> ${v.effect}</p>` })
  },
  "Books":
  {
    table: "BOOKS",
    fields: [{ key: "cover", label: "Cover" }, { key: "author", label: "Author" }, { key: "style", label: "Style" }, { key: "subject", label: "Subject" }, { key: "other_feature", label: "Other Feature" }],
    build: (v) => ({ name: `${v.cover} Book`, description: `<p><b>Author:</b> ${v.author}</p><p><b>Style:</b> ${v.style}</p><p><b>Subject:</b> ${v.subject}</p><p><b>Other Feature:</b> ${v.other_feature}</p>` })
  },
  "Fine Art":
  {
    table: "FINE_ART",
    fields: [{ key: "medium", label: "Medium" }, { key: "style", label: "Style" }, { key: "subject_a", label: "Subject A" }, { key: "subject_b", label: "Subject B" }],
    build: (v) => ({ name: `A ${v.style} ${stripWikilinks(v.subject_a)} depicted amid ${v.subject_b}`, description: `<p><b>Medium:</b> ${v.medium}</p>` })
  },
  "Jewellery":
  {
    table: "JEWELLERY",
    fields: [{ key: "hue", label: "Hue" }, { key: "form", label: "Form" }, { key: "set_with", label: "Set With" }, { key: "decorated_with", label: "Decorated With" }],
    build: (v) => ({ name: `${v.hue} ${v.form}`, description: `<p><b>Set with:</b> ${v.set_with}</p><p><b>Decorated with:</b> ${v.decorated_with}</p>` })
  }
};

/** The rows of one flavour table, by category name. */
export function flavorTable(category)
{
  return chargenData[FLAVOR_CATEGORIES[category].table];
}

/** A flavour item; each column rolled independently unless overridden. */
export function buildFlavor(category, overrides = {})
{
  const config = FLAVOR_CATEGORIES[category];
  const table = flavorTable(category);
  const values = {};
  for(const f of config.fields)
    values[f.key] = overrides[f.key] || table[d(20) - 1][f.key];
  const { name, description } = config.build(values);
  // Metal from the COLUMNS, which the name may not carry (Fine Art's drops
  // the medium) - so here, and not left to the preCreateItem default.
  return [{ name, type: "item", system: { slots: 1, description, metal: flavorIsMetal(category, values) } }];
}

/** A Hypergeometric Codex: appearance and a weighted-d100 equation. */
export function buildCodex()
{
  return codexItemData(rollOnTable(EQUATIONS, d), CODEX_APPEARANCES[d(20) - 1]);
}

/**
 * One EQUATIONS row as a Codex Item. The appearance is optional because it
 * is the codex's LOOK and not its rule: a compendium codex is identified by
 * its equation, and the twenty appearances are a separate d20 the Referee
 * rolls when one is found. Pass null and the description is empty, which is
 * exactly what chargen produces for a codex with no appearance rolled.
 */
export function codexItemData(equation, appearance = null)
{
  return [{
    name: `Hypergeometric Codex (${equation.name})`,
    type: "codex",
    system: { slots: 1, equation: equation.name, description: appearance ? `<p>${appearance}</p>` : "" }
  }];
}

/**
 * An Elixir, weighted d100. Named exactly as the ELIXIRS entry because the
 * sheet finds an elixir's stateful and permanent effects by that name.
 */
export function buildElixir()
{
  return elixirItemData(rollOnTable(ELIXIRS, d));
}

/**
 * One NAMED Elixir from the sample table — foundry-system-index.csv "Elixir
 * Brewing". The brewing PROCEDURE is the table's (Matt, 2026-09-19): the
 * ingredients and their fitness are adjudicated in play and the span is run on
 * the effects board's own Begin an effort control, so what the system owes is
 * the finished Elixir arriving on a character. Returns [] for a name not on
 * the table, because everything here is built from that roster.
 */
export function buildNamedElixir(name)
{
  const e = ELIXIRS.find(x => x.name === String(name ?? "").trim());
  return e ? elixirItemData(e) : [];
}

/** The Item data for one ELIXIRS entry, shared by the roll and the pick. */
export function elixirItemData(e)
{
  return [{
    name: e.name,
    type: "item",
    system: { slots: 1, description: `<p><b>Potency ${e.potency}:</b> ${e.effect}</p>${e.component ? `<p><b>Component:</b> ${e.component}</p>` : ""}`, ...spanFieldFrom(e) }
  }];
}

/**
 * The fixed consumables a cache counts out. Rations and Synth Parts are
 * named EXACTLY as rest.js and synth-repair.js look them up, whatever the
 * cache table calls them ("Dried Food Rations"). Medgel, Antitoxin and
 * Grenade carry the book's words and nothing more — the book gives them no
 * rules beyond "(d10 Heal)" and "(d10, blast)". A third of a slot each,
 * Matt 2026-09-19; the GM re-rules any of them with Units per Slot.
 *
 * WHICH OF THESE ARE `consumable` (2026-09-20, Fixed-Charge Consumable).
 * The split is NOT about which are spent one at a time — every one of them
 * is. It is about whether something ALREADY spends them:
 *
 *   - Water Ration, Food Ration and Synth Parts have spenders. rest.js and
 *     synth-repair.js look them up by name and read them ACROSS STACKS
 *     (item-transfer.js documents that), then decrement. Flagging these
 *     would put a second, dumber control on the sheet that lowers one
 *     stack's quantity without going through rest or repair — two ways to
 *     spend a ration that can disagree. They stay unflagged deliberately.
 *   - Medgel, Vial of Antitoxin and Grenade have no spender anywhere.
 *     Nothing in rest.js or synth-repair.js names them; the comment above
 *     says as much in saying they carry the book's words and nothing more.
 *     Spending one meant editing the number by hand, which is exactly the
 *     gap Fixed-Charge Consumable closes.
 *   - Raw Meat, Stone and Fresh Blood (Diet Ration Item Generation,
 *     2026-09-23) are spent by rest.js's Long Rest and companion-upkeep.js,
 *     by name, exactly as a Food Ration is - so they are unflagged too. The
 *     book prints no slots, cost or source for any of them. RULED (Matt,
 *     2026-09-23): they stack like any ration, three to a slot, and carry no
 *     trade value. The names must match the dietRation fields that spend
 *     them; tools/test-pack-items.mjs checks every one.
 */
export const STACKABLES =
{
  water:      { name: "Water Ration", system: { slots: THIRD_OF_A_SLOT } },
  food:       { name: "Food Ration", system: { slots: THIRD_OF_A_SLOT } },
  rawMeat:    { name: "Raw Meat", system: { slots: THIRD_OF_A_SLOT } },
  stone:      { name: "Stone", system: { slots: THIRD_OF_A_SLOT } },
  freshBlood: { name: "Fresh Blood", system: { slots: THIRD_OF_A_SLOT } },
  // Metal Item Property Part B, RULED 2026-09-27 (Matt): "some way to generate
  // a generic metal item so that characters can 'scrap' gear or to represent
  // scavenged metal items ... 3 per item slot, like regular rations". The GM
  // deletes what is scrapped and gives a stack of this - no Scrap control.
  // Food for Omniguts and for a Metallovore Potion's drinker (rest.js).
  scrap:      { name: "Scrap Metal", system: { slots: THIRD_OF_A_SLOT, metal: true,
                description: "<p>Scavenged or scrapped metal. Food for a character with Omniguts, and for one who has drunk a Metallovore Potion while it lasts.</p>" } },
  synth:      { name: "Synth Parts", system: { slots: THIRD_OF_A_SLOT, description: "Repairs take an hour and use one Synth Part, healing d8+CON HP (or one Wound if HP is full)." } },
  // The use control heals the user d10 (flags.vaarn.useHeal, 2026-10-04 - the
  // heal die Matt approved for Medicinal Gourds, shared with the Medgel).
  medgel:     { name: "Medgel", system: { slots: THIRD_OF_A_SLOT, consumable: true, description: "<p>D10 Heal.</p>" }, flags: { vaarn: { useHeal: "1d10" } } },
  antitoxin:  { name: "Vial of Antitoxin", system: { slots: THIRD_OF_A_SLOT, consumable: true, description: "" } },
  grenade:    { name: "Grenade", system: { slots: THIRD_OF_A_SLOT, consumable: true, description: "<p>d10, blast.</p>" } }
};

/** One stacked Item carrying the whole count (Matt, 2026-09-19). */
export function buildStack(key, quantity)
{
  const s = STACKABLES[key];
  return [{ name: s.name, type: "item", system: { ...s.system, quantity }, ...(s.flags ? { flags: structuredClone(s.flags) } : {}) }];
}

/**
 * One starting-tier EXOTICA row as Item data — the shape chargen-app.js
 * gives the Exotica boon, lifted here so the compendium and the boon cannot
 * build the same entry two ways.
 *
 * THE armorType BRANCH IS NOT COSMETIC. Visualiser Helm is the one starting
 * Exotica carrying it, and it has to become a real `armor` Item or its AV
 * bonus is a sentence nothing reads — the same split the Advanced tier makes
 * in advancedExoticaData above.
 */
export function startingExoticaData(entry)
{
  if(entry.armorType)
  {
    const system = { slots: 1, description: `<p>${entry.description}</p>`, armorSlot: entry.armorType.armorSlot, avBonus: exoticaArmourAv(entry.name) };
    if(entry.armorType.liveAbilityBonus) system.liveAbilityBonus = entry.armorType.liveAbilityBonus;
    // flags.vaarn.exotica, 2026-09-20. xp-value.js isExotica() reads the
    // flag, the `exotica` TYPE, or an Exotic weapon tag - and an armour-shaped
    // Exotica is none of those, so without the flag Visualiser Helm's sheet
    // reads "Trade Value" where Horror Helm, the identical case one tier up,
    // reads "XP Value". Exotica are the advancement currency, worth 1 XP.
    // advancedExoticaData has always set it; this branch, copied from
    // chargen-app.js, never did. Found live in Group 253.17.
    return [{ name: entry.name, type: "armor", system, flags: { vaarn: { exotica: true } } }];
  }
  return [{ name: entry.name, type: "exotica", system: { slots: 1, description: `<p>${entry.description}</p>`, ...spanFieldFrom(entry) } }];
}
