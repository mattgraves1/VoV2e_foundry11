/**
 * Shared weapon-rolling logic, extracted from macros/generate-weapon.js
 * (work-queue.txt item 1.1) so a second consumer — macros/
 * generate-advanced-exotica.js's "Exotic Melee/Ranged Weapon" rows
 * (work-queue.txt item 1.2), which explicitly says "Generate an Exotic
 * weapon using the tables on the Exotic Weapons page" — can reuse the
 * exact same base+tags algorithm instead of duplicating it. Same
 * refactor shape as rolltable-picker.js/lair-rooms-roller.js/
 * composite-roller.js elsewhere in this project.
 *
 * Returns plain data (name/type/system), same shape needed by
 * Item.create — does not create the Document itself, so callers can
 * fold the result into their own item (e.g. attach it to an Exotica
 * roll's own bookkeeping) rather than always creating a bare weapon.
 */

/**
 * THE BASE ROLL, per tier - the one place it is written. JADE IBIS 15-09-26:
 * Basic rolls d12, Advanced d20, Exotic d20 with ADV (2d20, keep the better,
 * same Advantage rule as Saving Throws.md), all on the same 20-row Melee and
 * Ranged tables. So a Basic weapon only ever comes from rows 1-12.
 *
 * Until 2026-09-27 Basic rolled a plain d20 here and in chargen-app.js's own
 * copy, matching no edition (CRIMSON HOUND said d20 with DIS). chargen now
 * calls this, so the two cannot drift again. A LOCKED base in Generate Weapon
 * still offers all 20 rows at every tier (Matt, 2026-09-27) - that is a GM
 * override, not a roll, and never reaches this function.
 *
 * `d` is passed in rather than imported so this stays synchronous for
 * chargen and loadable in node for tools/test-weapon-base-roll.mjs.
 */
import { specialHandlersOfTags } from "../item/weapon-tags.js";
export function rollWeaponBase(table, quality, d)
{
  if(quality === "Exotic")
  {
    const r1 = d(20), r2 = d(20);
    const best = Math.max(r1, r2);
    return { base: table[best - 1], baseNote: ` (ADV: ${r1}, ${r2} → ${best})` };
  }
  const faces = quality === "Basic" ? 12 : 20;
  return { base: table[d(faces) - 1], baseNote: "" };
}

export async function rollWeapon(quality,baseChoice, basicTagChoice, advancedTagChoice, exoticTagChoice, forceKind)
{
  const { MELEE_WEAPONS, RANGED_WEAPONS, BASIC_TAGS, ADVANCED_TAGS, EXOTIC_TAGS } =
    await import("/systems/vaarn/module/actor/chargen-data.js");
  const { d, pick, normalizeDamageDice, normalizeUsageDie, applyDamageTagModifiers, applySlotTagModifiers, applyTradeValueTagModifiers, applyTierTradeMultiplier } =
    await import("/systems/vaarn/module/actor/chargen-app.js");

  let resolvedBaseKind, base, baseNote = "";
  if(baseChoice)
  {
    const [kind, name] = baseChoice.split("|");
    resolvedBaseKind = kind;
    base = (kind === "Melee" ? MELEE_WEAPONS : RANGED_WEAPONS).find(w => w.name === name);
  }
  else
  {
    // forceKind lets a caller (e.g. Advanced Exotica's "Exotic Melee/Ranged
    // Weapon" rows, which name a specific kind, not just "roll a weapon")
    // skip the otherwise-random Melee/Ranged pick without locking a
    // specific base name — generate-weapon.js itself never passes this,
    // so its own random-kind behavior is unchanged.
    resolvedBaseKind = forceKind || (d(2) === 1 ? "Melee" : "Ranged");
    const table = resolvedBaseKind === "Melee" ? MELEE_WEAPONS : RANGED_WEAPONS;
    ({ base, baseNote } = rollWeaponBase(table, quality, d));
  }

  const basicTag = basicTagChoice ? BASIC_TAGS.find(t => t.name === basicTagChoice) : BASIC_TAGS[d(20) - 1];
  const advancedTag = (quality === "Advanced" || quality === "Exotic")
    ? (advancedTagChoice ? ADVANCED_TAGS.find(t => t.name === advancedTagChoice) : ADVANCED_TAGS[d(20) - 1])
    : null;
  const exoticTag = quality === "Exotic"
    ? (exoticTagChoice ? EXOTIC_TAGS.find(t => t.name === exoticTagChoice) : EXOTIC_TAGS[d(20) - 1])
    : null;

  const tagNames = [basicTag.name, advancedTag?.name, exoticTag?.name].filter(Boolean);
  const isFragileTier = quality === "Advanced" || quality === "Exotic";
  const fullName = `${tagNames.join(" ")} ${base.name}${isFragileTier ? " (Fragile)" : ""}`;

  const descLines = [];
  if(isFragileTier)
  {
    descLines.push(quality === "Exotic"
      ? `<p><b>Fragile:</b> breaks on a natural 1 attack roll. Exotic-tier weapons cannot be repaired once broken (GM ruling — leave this sheet's Broken checkbox permanently checked once it's set).</p>`
      : `<p><b>Fragile:</b> breaks on a natural 1 attack roll (cleared manually from this sheet once repaired — narratively, Advanced-tier repairs are said to take d10−INT days).</p>`);
  }
  descLines.push(`<p><b>${basicTag.name}:</b> ${basicTag.effect}</p>`);
  if(advancedTag) descLines.push(`<p><b>${advancedTag.name}:</b> ${advancedTag.effect}</p>`);
  if(exoticTag) descLines.push(`<p><b>${exoticTag.name}:</b> ${exoticTag.effect}</p>`);
  if((base.base_tags || []).length) descLines.push(`<p><b>Built-in tags:</b> ${base.base_tags.join(", ")}</p>`);
  if(base.ammo_die)
  {
    descLines.push(quality === "Exotic"
      ? `<p>Exotic ammunition, beyond current-day Vaarnish production — once it runs out, this weapon cannot be reloaded (GM ruling — no in-system usage-die refill).</p>`
      : `<p>Ammo only available in Vaarnish cities.</p>`);
  }

  // "Fragile" must be a literal tag, not just display text — its sentence
  // (weapon-tag-effects-data.js, read by actor-sheet.js _checkWeaponCrit since
  // Effect Engine: Weapon Tags chunk 4) is what makes a natural 1 break the
  // weapon (_weaponNat1) rather than fumble it (_weaponFumble). Matches
  // chargen-app.js's own Advanced Weapon boon, which already does this.
  const allTags = [...(isFragileTier ? ["Fragile"] : []), ...tagNames, ...(base.base_tags || [])];

  // Extra-Dimensional GRANTS two other tags — its own text reads "Has the
  // Hypergeometric and Anti-Paradoxical tags, and five times its base trade
  // value" — and nothing was granting them. The weapon carried the name and
  // none of the effect.
  //
  // Harmless while nothing read those tags; it became a visible miss on
  // 2026-09-05, when both became real double-damage rules against Hypergeometric
  // and Outsider creatures. An Extra-Dimensional weapon would have got neither.
  //
  // Expanded here rather than in the damage code so the weapon HAS the tags —
  // they show on the sheet, and anything else that ever reads them works too.
  if(allTags.includes("Extra-Dimensional"))
    for(const granted of ["Hypergeometric", "Anti-Paradoxical"])
      if(!allTags.includes(granted)) allTags.push(granted);

  // SLOT WEIGHT AND TRADE VALUE ARE INDEPENDENT AXES. Do not re-derive one
  // from the other — 683f380 did, on a misreading, and 2026-09-05 reverted it.
  //
  // Barter p.129 ("any object that occupies one item slot has a Trade Value
  // of 1") establishes the barter UNIT, not a per-slot formula. The tag
  // tables settle it, because they state the two effects separately:
  //   Delicate / Elegant / Quicksilver — "half base slot weight"
  //   Ancient / Corroded               — "half base trade value"
  // One d20 table, distinct clauses. A derivation would make the first three
  // halve value as well, which the table plainly does not intend. Exotic
  // Hard Light ("slot weight of 0") would be worth nothing at all.
  //
  // The corroboration originally cited for the derivation, "Colossal (x3 slot
  // weight and trade value)", is from the d20 TRADE GOOD QUALITY table, not
  // the weapon tags — a homonym. The Exotic Colossal tag says only "triple
  // base damage, triple base slot weight". And that trade-goods table argues
  // the other way regardless: Heavy is "x2 base slot weight" with no value
  // clause, so Colossal has to name trade value explicitly precisely BECAUSE
  // slot weight alone would not move it.
  // LIVE (Stats as Sentences chunk 2d-i, RULED 2026-10-07): the fields hold the BASE; the tags'
  // sentences and the tier's apply through statOf, read beside flags.vaarn.liveStats and tier.
  const finalSlots = base.slots ?? 1;

  const weaponSystem =
  {
    slots: finalSlots,
    hands: base.hands ?? 1,
    // Work-queue item 4.2 (2026-08-27): Shoddy/Heavy/Colossal/Autarch's/
    // Nano-edged's static damage modifiers, baked in here so every
    // weapon this function creates (Generate Weapon macro, Advanced
    // Exotica's weaponGen rows) reflects them.
    damageDice: normalizeDamageDice(base.damage),
    tags: allTags,
    // Trade-value tags, baked at creation like slots and damage above.
    // Only the UNCONDITIONAL ones — Bone/Nomad's/Ritual depend on who is
    // buying and stay as description text.
    // Tier bonus LAST (Matt, 2026-09-05): an Advanced weapon is worth double.
    // Order is cosmetic today — every modifier is multiplicative — but it states
    // the intent. Exotic gets NO tier bonus on purpose: those weapons are
    // Exotica, so this field renders as XP and a multiplier would inflate it.
    tradeValue: base.tradeValue ?? 1,
    description: descLines.join(""),
  };
  if(base.ammo_die)
  {
    const die = normalizeUsageDie(base.ammo_die);
    weaponSystem.usageDie = { die, max: die };
  }

  // Work-queue item 4.7 (2026-08-27) — Polymorphic is an EXOTIC_TAGS-only
  // entry, so this only ever fires here (chargen's starting-equipment and
  // Advanced Weapon boon paths never reach Exotic tier). Matt's ruling:
  // the alt form is rolled at CREATION time (not chosen by the player
  // after the fact), as a SEPARATE real weapon Item paired with this one
  // — equipping either auto-unequips its sibling (actor-sheet.js's
  // _onItemEquip), reusing the entire existing equip/roll/ammo pipeline
  // unchanged rather than threading a form-override through every place
  // that reads item.type/damageDice/hands. The alt form gets `slots: 0`
  // specifically so it never double-counts inventory slots — it's "the
  // same weapon," just its other shape sitting unused — which is also
  // why the original slot-matching restriction from this item's own
  // scoping note is gone: with the alt form contributing zero slots
  // either way, there's nothing left for a slot mismatch to bug out, so
  // it can now roll totally freely from the full opposite-kind table.
  let altForm = null;
  // From the tags' sentences since Weapon Tags chunk 5a: a tag carrying the
  // polymorphic handler rolls the alternate form.
  if(specialHandlersOfTags(allTags).includes("polymorphic"))
  {
    const altTable = resolvedBaseKind === "Melee" ? RANGED_WEAPONS : MELEE_WEAPONS;
    const altBase = pick(altTable);
    const altFullName = `${tagNames.join(" ")} ${altBase.name}${isFragileTier ? " (Fragile)" : ""}`;
    const altSystem =
    {
      slots: 0,
      hands: altBase.hands ?? 1,
      damageDice: applyDamageTagModifiers(normalizeDamageDice(altBase.damage), allTags),
      tags: allTags,
      description: `<p><b>Polymorphic:</b> the alternate form of <b>${fullName}</b> — equip this to swap forms; it will automatically unequip its pair.</p>` + descLines.join(""),
    };
    if(altBase.ammo_die)
    {
      const die = normalizeUsageDie(altBase.ammo_die);
      altSystem.usageDie = { die, max: die };
    }
    altForm = {
      name: altFullName,
      type: resolvedBaseKind === "Melee" ? "weaponRanged" : "weaponMelee",
      system: altSystem
    };
    weaponSystem.description = `<p><b>Polymorphic:</b> the alternate form of this weapon is <b>${altFullName}</b> — equip that instead to swap forms.</p>` + weaponSystem.description;
  }

  return {
    name: fullName,
    type: resolvedBaseKind === "Ranged" ? "weaponRanged" : "weaponMelee",
    system: weaponSystem,
    flags: { vaarn: { liveStats: true, tier: quality } },
    baseNote,
    altForm
  };
}

/**
 * ONE UNTAGGED BASE WEAPON, by name and kind — Item Compendium Packs.
 *
 * rollWeapon has no untagged path and cannot be given one: its basic tag is
 * unconditional (`basicTagChoice ? found : BASIC_TAGS[d(20) - 1]`), because
 * every weapon the book ROLLS has at least one. The compendium is the first
 * caller that wants a base weapon as the tables print it, after Matt ruled
 * 2026-09-19 that pack weapons ship untagged and a tagged one stays the
 * Generate Weapon macro's job.
 *
 * It is the same baking as rollWeapon and deliberately not a simplified
 * copy: the slot, damage and trade-value modifier passes still run, over the
 * base's own built-in tags alone. None of the 40 bases carries a modifier
 * tag today, so all three are no-ops — they are here so that a base that
 * gains one is treated the same way a rolled weapon would treat it, rather
 * than silently missing the bake.
 *
 * NO FRAGILE AND NO TIER MULTIPLIER: both are Advanced/Exotic-tier, and a
 * bare base weapon is Basic. NO POLYMORPHIC PAIR: that is an Exotic tag.
 */
export async function buildBaseWeapon(kind, name)
{
  // RELATIVE, unlike rollWeapon's absolute "/systems/vaarn/..." pair above.
  // Both resolve identically in Foundry, but only the relative form resolves
  // outside it, which is what lets tools/test-pack-items.mjs count and check
  // the compendium's weapons in node. rollWeapon keeps its absolute imports:
  // it is reached from pasted World Macros as well as from modules, and it is
  // tested code that this row has no reason to touch.
  const { MELEE_WEAPONS, RANGED_WEAPONS } = await import("./chargen-data.js");
  const { normalizeDamageDice, normalizeUsageDie, applyDamageTagModifiers, applySlotTagModifiers, applyTradeValueTagModifiers } =
    await import("./chargen-app.js");

  const base = (kind === "Melee" ? MELEE_WEAPONS : RANGED_WEAPONS).find(w => w.name === name);
  if(!base) return null;

  const tags = [...(base.base_tags || [])];
  const descLines = [];
  if(tags.length) descLines.push(`<p><b>Built-in tags:</b> ${tags.join(", ")}</p>`);
  if(base.ammo_die) descLines.push(`<p>Ammo only available in Vaarnish cities.</p>`);

  // The base in the fields, its built-in tags live (Stats as Sentences chunk 2d-i).
  const system =
  {
    slots: base.slots ?? 1,
    hands: base.hands ?? 1,
    damageDice: normalizeDamageDice(base.damage),
    tags,
    tradeValue: base.tradeValue ?? 1,
    description: descLines.join("")
  };
  if(base.ammo_die)
  {
    const die = normalizeUsageDie(base.ammo_die);
    system.usageDie = { die, max: die };
  }

  return { name: base.name, type: kind === "Ranged" ? "weaponRanged" : "weaponMelee", system, flags: { vaarn: { liveStats: true, tier: "Basic" } } };
}
