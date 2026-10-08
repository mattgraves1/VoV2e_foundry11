import { IMPLANTS, ABILITY_SHORT_KEY, ELIXIRS } from "./chargen-data.js";
import { ADVANCED_IMPLANTS } from "./advanced-implants-data.js";
import { MUTATION_TABLE } from "./mutation-data.js";
import { ADVANCED_EXOTICA } from "./advanced-exotica-data.js";
import { normalizeDamageDice } from "./chargen-app.js";
import { findFigment } from "./figments.js";
import { applyDrainerGain } from "./level-drain.js";
import { xpCostFor } from "./advancement.js";
import { maxHpChange } from "../effects/max-hp.js";

// Renamed from implant-effects.js (item 10.7) -> item-effects.js (item 15,
// 2026-08-26): mutations and Starting Implants have the exact same
// "chargen bakes it once, nothing applies if granted later" gap Advanced
// Implants had, so this generalizes the same createItem/preCreateItem
// mechanism instead of growing a second near-duplicate module.

function findImplantEntry(name)
{
  return IMPLANTS.find(m => m.name === name) || ADVANCED_IMPLANTS.find(m => m.name === name);
}

export function findEntry(item)
{
  if(item.type === "mutation") return MUTATION_TABLE.find(m => m.name === item.name);
  if(item.type === "implant") return findImplantEntry(item.name);
  // Work-queue item 10.3.6 (2026-08-27) — Manifold Box's flat +10 slots
  // reuses this exact mechanism (Matt's own proposal: "reusing the exact
  // same slotBonus mechanism mutations already use"). No other
  // ADVANCED_EXOTICA entry carries slotBonus/hpBonus/handsBonus/
  // abilityMod/naturalWeapon today, so extending the type gate below to
  // include "exotica" is a safe no-op for every other Exotica Item.
  if(item.type === "exotica") return ADVANCED_EXOTICA.find(e => e.name === item.name);
  // Autarch Figment Grant (2026-09-14). The roster is a VIEW over the four
  // rows of rolltable-data.js's "Autarch Figment Effects", not a second
  // transcription — figments.js's header gives the reasoning.
  if(item.type === "figment") return findFigment(item.name);
  // A generic Item an ELIXIR left behind as a permanent property - Hollowheart
  // Hooch's chest slots (2026-09-24, RULED 2026-08-30 by Matt: the Kangaroo
  // Pouch pattern). The roster row names the Item and its bonus; every other
  // generic Item finds nothing here and bakes nothing.
  if(item.type === "item")
  {
    const spec = ELIXIRS.find(e => e.bakedItem?.name === item.name)?.bakedItem;
    return spec ? { name: spec.name, slotBonus: spec.slotBonus } : null;
  }
  return null;
}

/**
 * THE MARKER (Stats as Sentences chunk 2d-ii, RULED 2026-10-07): the changes a
 * bonus Item's CREATION DATA takes so it is live from its first moment (ruling
 * 1) - null when it is no bonus Item, the bake may not touch this actor, it is
 * chargen's (2d-iii) or a restore (which carries its own flags), or it is
 * already live (a live Item moved keeps its marker, ruling 4).
 *
 * An old baked Item moved here becomes live, and its copied bakedEffects record
 * is cleared - it described what another actor was given (ruling 4). Extra Eyes
 * rolls its 1d3 now and stores it on the marker, the description saying the
 * count as the bake's did (ruling 3). A Hollowheart Chest Slots Item that does
 * not yet say its bonus is given the sentence, from the roster row the bake read.
 */
export function liveMarkFor(item, actor, options = {})
{
  if(!actor || options?.vaarnChargenBake || options?.vaarnRestore) return null;
  if(!["mutation", "implant", "exotica", "figment", "item"].includes(item?.type)) return null;
  if(item.flags?.vaarn?.liveStats) return null;
  if(!bakeAllowedOn(item, actor)) return null;
  const entry = findEntry(item);
  if(!entry) return null;
  const changes = { "flags.vaarn.liveStats": true, "flags.vaarn.-=bakedEffects": null };
  if(item.type === "mutation" && item.name === "Extra Eyes")
  {
    const eyes = Math.ceil(Math.random() * 3);
    changes["flags.vaarn.liveStats"] = { rolled: { psy: eyes } };
    changes["system.description"] = `<p><b>d100 roll:</b> ${item.system?.roll ?? ""}</p><p>You have ${eyes} extra eye${eyes === 1 ? "" : "s"} on your forehead. +1 PSY for each.</p>`;
  }
  if(item.type === "item" && entry.slotBonus && !Array.isArray(item.flags?.vaarn?.effects))
    changes["flags.vaarn.effects"] = [{ when: "stat", baked: true, do: { verb: "modify", stat: "inventory-slots", amount: `+${entry.slotBonus}` } }];
  return changes;
}

/**
 * Which Actor types this Item's bake is allowed to touch.
 *
 * Everything that predates 2026-09-14 is character-only, and stays that way
 * DELIBERATELY. Mutations, implants and Exotica were built against chargen and
 * against character-only fields (inventorySlots, hands, the ability_slot
 * conflict); letting them fire on an NPC is a widening nobody asked for and
 * the NPC schema has no slots or hands to write into.
 *
 * A figment is the exception, RULED 2026-09-14 (Matt): the Court grafts them
 * into whatever it favours, so they land on either Actor type. The four carry
 * only fields both types have — creatureTypes, abilities, health, level, and
 * an Item for a natural weapon.
 */
function bakeAllowedOn(item, actor)
{
  if(item.type === "figment") return actor.type === "character" || actor.type === "npc";
  // MUTATIONS AND IMPLANTS ON A CREATURE, RULED 2026-09-25 (Matt: "widen it for
  // natural weapons and bonuses"), for the Cacogen's rolled curse and the Titan
  // Acolyte's implant. The bake already writes only what an NPC has - slots and
  // hands are guarded below since the figments - so the ability, HP and natural
  // weapon parts land and the rest does nothing. The AV half is live, in
  // actor.js's npc block.
  if(item.type === "mutation" || item.type === "implant") return actor.type === "character" || actor.type === "npc";
  return actor.type === "character";
}

/**
 * Bakes a mutation's/implant's/(now) certain Exotica's ability/HP/slot/
 * hands/naturalWeapon effects onto the actor the moment its Item is
 * created — item 3.1/3.2/3.4's mutations, item 10.2's Starting Implants,
 * item 10.7's Advanced Implants, and (item 10.3.6, 2026-08-27) Manifold
 * Box's flat slotBonus all funnel through here now. Previously (before
 * item 15) only Advanced Implants had this at all; the other two ONLY
 * ever got these effects via chargen-app.js's one-time finalize bake, so
 * granting either to an already-existing character (a GM manually
 * creating the Item — no "Generate Mutation"/"Generate Starting Implant"
 * macro exists, unlike Advanced Implants' own macro) silently did nothing
 * mechanical.
 *
 * THIS BAKE USED TO BE PERMANENT and no longer is. Until 2026-09-13 it did
 * not reverse when the granting Item was deleted, traded away or lost — a
 * deliberate trade-off that Manifold Box inherited on Matt's own proposal to
 * reuse the mechanism "as-is", not an overlooked edge case. He reversed that
 * decision on 2026-09-13 while scoping Mutation Contradiction Precedence:
 * reverseBakedItemEffects below undoes it on deleteItem, using the record this
 * function now writes to flags.vaarn.bakedEffects.
 *
 * The distinction with avBonus/liveAbilityBonus still stands and still
 * matters: those are live-recomputed every render, so they stop applying the
 * instant their Item goes away and need no record. These are written into
 * stored fields, which is why removal has to know what was put there.
 *
 * An Item baked BEFORE 2026-09-13 carries no record and so still does not
 * reverse. That is not a migration to run — see reverseBakedItemEffects.
 *
 * GUARDS:
 * - `userId !== game.user.id`: `createItem` fires on every connected
 *   client. This world runs two simultaneously-connected GM-privileged
 *   users (Matt's Gamemaster session plus the `claude` automation
 *   account) — a `game.user.isGM` guard would fire this twice.
 * - `options?.vaarnChargenBake`: chargen-app.js's `_finalizeCharacter()`
 *   already computes these exact same ability/HP/slot/hands bonuses
 *   BEFORE creating the actor and its Items in one batch
 *   (`chargen-app.js`'s `itemCls.create(items, { parent: actor,
 *   vaarnChargenBake: true })`) — without this flag, every chargen-time
 *   grant would get baked TWICE (once by chargen's own upfront
 *   computation, once again by this hook seeing the same Item get
 *   created). This flag is chargen's own signal that it already handled
 *   the bake for this batch.
 *
 * `hpBonus`/`hp_bonus` heals current HP by the same amount, not just the
 * max (Matt's call, item 15) — matches chargen's own behavior (a fresh
 * character starts at full HP including the bonus).
 *
 * The `+10` ability ceiling (Bestiary.md: "never exceed +10") is applied
 * per bake event against the actor's CURRENT value — mathematically the
 * same as chargen's own summed-then-clamped-once approach for same-sign
 * (positive) deltas. Known accepted simplification (item 15): if an
 * earlier positive delta gets clamped and a LATER negative delta lands on
 * the same ability (only Ferrosteel Exo-Skeleton's stat_mod {dexterity:-4}
 * qualifies today), the result can differ slightly from a true
 * "sum everything, clamp once" total — not worth tracking a separate
 * unclamped running total for a one-entry edge case.
 */
export async function applyBakedItemEffects(item, options, userId)
{
  if(userId !== game.user.id) return;
  if(options?.vaarnChargenBake) return;
  // A level-loss restore re-applies the delta it RECORDED rather than baking
  // fresh, because a fresh bake is not the same number: Extra Eyes would roll
  // a new 1d3 and the +10 clamp would land against whatever the actor's
  // abilities read now. See restoreBakedItemEffects below.
  if(options?.vaarnRestore) return;
  // "item" joined the gate on 2026-09-24 for the elixir-granted property
  // above; findEntry is what keeps every ordinary generic Item out.
  if(item.type !== "mutation" && item.type !== "implant" && item.type !== "exotica"
     && item.type !== "figment" && item.type !== "item") return;
  const actor = item.parent;
  if(!actor || !bakeAllowedOn(item, actor)) return;

  const entry = findEntry(item);
  if(!entry) return;
  // A LIVE Item (chunk 2d-ii) bakes only its max HP, its natural weapon and its
  // level; its abilities, slots, hands and creature types are read every prepare
  // (body.js liveBodyBonusesOf). Extra Eyes rolled on its marker at creation.
  const live = !!item.flags?.vaarn?.liveStats;

  const updates = {};

  // Extra Eyes (roll 33, item 16, 2026-08-26) is the one MUTATION_TABLE
  // entry whose bonus is itself randomized (d3 extra eyes, +1 PSY each)
  // rather than a fixed number on the static table — chargen-app.js's own
  // _rollMutations() rolls this inline and writes a real number into
  // state.spark.mutations before finalize bakes it; findEntry()'s static
  // by-name lookup has no abilityMod for this row at all, so without this
  // special case, granting Extra Eyes through ANY post-chargen path (this
  // macro, a future level-up reroll, or a GM's own manual Item creation)
  // would silently apply zero PSY. Rolled fresh here and the Item's own
  // description is rewritten to show the actual count, matching chargen's
  // existing wording.
  let abilityDelta = entry.abilityMod || entry.stat_mod;
  let itemDescriptionUpdate = null; // this Item's own field, NOT the actor's — applied separately below
  if(live) abilityDelta = null;
  if(!live && item.type === "mutation" && item.name === "Extra Eyes")
  {
    const eyeRoll = new Roll("1d3");
    eyeRoll.evaluate({ async: false });
    const eyes = eyeRoll.total;
    abilityDelta = { psyche: eyes };
    itemDescriptionUpdate = `<p><b>d100 roll:</b> ${item.system.roll}</p><p>You have ${eyes} extra eye${eyes === 1 ? "" : "s"} on your forehead. +1 PSY for each.</p>`;
  }
  // Baked Effect Reversal (2026-09-13) records what was ACTUALLY applied, not
  // what the roster asked for, because removal cannot recover the difference.
  // See reverseBakedItemEffects below for the three places they diverge.
  const applied = { abilities: {} };

  if(abilityDelta)
  {
    for(const [longKey, amount] of Object.entries(abilityDelta))
    {
      const shortKey = ABILITY_SHORT_KEY[longKey];
      const current = Number(actor.system.abilities[shortKey].value);
      const capped = Math.min(10, current + amount);
      updates[`system.abilities.${shortKey}.value`] = capped;
      // The clamp is exactly why this is recorded: a +2 landing on a 9 applies
      // +1, and subtracting the roster's 2 on removal would leave the actor
      // BELOW where they started.
      if(capped !== current) applied.abilities[shortKey] = capped - current;
    }
  }

  // DELIBERATELY NOT GATED ON Deprived State, and the reason matters because
  // this raises health.value and so looks exactly like the three healing sites
  // that ARE gated. It is not healing: max and value move by the same amount, so
  // the gap between them — the LOST HP — is unchanged. The book's clause is
  // "cannot heal lost HP", and granting capacity restores nothing that was lost.
  // A Deprived character who gains Thick Hide is 2 HP short of a larger maximum
  // rather than 2 HP better off. Checked 2026-09-11 while building that gate; do
  // not "fix" this by adding one.
  const hpBonus = entry.hpBonus || entry.hp_bonus;
  if(hpBonus)
  {
    // The max HP verb (Shared Pipelines chunk 5): +N max is +N current.
    Object.assign(updates, maxHpChange(actor, { add: hpBonus }));
    applied.hpBonus = hpBonus;
  }

  // The `actor.system.inventorySlots` guard is not defensiveness for its own
  // sake: since 2026-09-14 this function can run on an NPC, and the NPC schema
  // has neither inventorySlots nor hands. No figment carries either field, so
  // this never fires today — it is here so that adding one to a figment fails
  // by doing nothing rather than by throwing on a missing path.
  if(!live && entry.slotBonus && actor.system.inventorySlots)
  {
    // _source since 2d-ii: the prepared max carries live slots (as hands.max below).
    updates["system.inventorySlots.max"] = Number(actor._source.system.inventorySlots.max) + entry.slotBonus;
    applied.slotBonus = entry.slotBonus;
  }

  if(!live && entry.handsBonus && actor._source.system.hands)
  {
    // `_source`, NOT actor.system. actor.js:306 adds a Save-Gated Effect's
    // temporary hand grant to hands.max on EVERY prepare, so the prepared
    // value is stored + grant. Reading it here and writing the sum back baked
    // a borrowed hand in permanently whenever a handsBonus Item happened to
    // land mid-encounter — found 2026-09-13 while building the reversal, and
    // it is a pre-existing bug in this bake rather than anything the reversal
    // introduced. hands.max is the ONLY field prepareData augments this way;
    // health.max, inventorySlots.max and abilities.*.value are all untouched
    // there, which is why they still read from actor.system.
    const storedMax = Number(actor._source.system.hands.max);
    updates["system.hands.max"] = storedMax + entry.handsBonus;
    applied.handsBonus = entry.handsBonus;
  }

  /*
   * CREATURE TYPE, new 2026-09-14 with Autarch Figment Grant and the one piece
   * of this that was not already built. Until now `system.creatureTypes.*` was
   * written exactly once, by chargen-app.js from the ancestry, and nothing
   * could change it afterwards — so "Bearer gains the Hypergeometric creature
   * type", which all four figments say, had nowhere to land.
   *
   * THE RECORD GOES ON THE ACTOR, NOT ON THE ITEM, and that is the whole
   * difference between this working and not. It was written on the Item first
   * and testing (163.17) found the hole: Matt ruled all four figments stack
   * and all four grant Hypergeometric, so the FIRST to land turns the flag on
   * and records it, and the other three record nothing. Delete that first one
   * and its record leaves with it — after which no remaining Item knows the
   * flag was ever granted rather than innate, and removing the last figment
   * left a character permanently Hypergeometric.
   *
   * An actor-level record survives any deletion order, which is the property
   * needed: `flags.vaarn.figmentGrantedTypes` lists the types that an Item
   * turned on rather than the ancestry.
   *
   * WHAT IT PROTECTS is the ancestry. A Lithling is already Mineral, so a
   * figment granting Mineral changes nothing and records nothing, and removing
   * it correctly leaves Mineral alone. Same reasoning as the ability clamp
   * above: record what was APPLIED, never what the roster asked for.
   */
  const alreadyGranted = actor.getFlag("vaarn", "figmentGrantedTypes") ?? [];
  const grantedTypes = [...alreadyGranted];
  for(const key of (live ? [] : (entry.creatureTypes ?? [])))
  {
    if(actor._source.system.creatureTypes?.[key]) continue;
    updates[`system.creatureTypes.${key}`] = true;
    if(!grantedTypes.includes(key)) grantedTypes.push(key);
  }
  if(grantedTypes.length !== alreadyGranted.length)
    updates["flags.vaarn.figmentGrantedTypes"] = grantedTypes;

  if(Object.keys(updates).length)
    await actor.update(updates);

  /*
   * LEVEL, and it means two different things on the two Actor types.
   * RULED 2026-09-14 (Matt), for Gut's "Bearer gains +1 Level".
   *
   * A CHARACTER is granted the XP a level costs and takes it themselves.
   * xpCostFor(level) is max(1, level), so one level's worth at their current
   * Level. This is the whole reason the ruling is good: a PC level is ability
   * picks and an HP roll, and those are the player's to make. Writing
   * system.level.value directly would leave a character a level above their
   * own numbers, and the creature path below would overwrite their rolled
   * abilities outright.
   *
   * AN NPC gains it the way Kronophage's Borrowed Time does — applyDrainerGain,
   * which raises the Level and sets every ability to it, the statblock
   * convention. Not a new path; it is the one level-drain already uses and
   * Group 158 already tested.
   *
   * AFTER the actor.update above, deliberately: applyDrainerGain does its own
   * update and reads the current Level to compute the new one.
   */
  if(entry.levelGrant)
  {
    if(actor.type === "npc")
    {
      const gain = await applyDrainerGain(actor, { level: entry.levelGrant });
      applied.levelGrant = { kind: "npc", levels: entry.levelGrant, from: gain?.from, to: gain?.to };
    }
    else
    {
      let xp = 0;
      for(let i = 0; i < entry.levelGrant; i++)
        xp += xpCostFor(Number(actor.system.level?.value ?? 1) + i);
      await actor.update({ "system.xp.value": Number(actor.system.xp?.value ?? 0) + xp });
      applied.levelGrant = { kind: "xp", levels: entry.levelGrant, xp };
      ui.notifications?.info(
        `${actor.name} gains ${xp} XP from ${item.name} — enough for a Level. `
        + `Take it through Level Up so the abilities and HP are chosen.`);
    }
  }

  // One update rather than two — the Extra Eyes rewrite and the reversal
  // record both land on this Item and there is no reason to write it twice.
  const itemUpdate = {};
  if(itemDescriptionUpdate) itemUpdate["system.description"] = itemDescriptionUpdate;
  if(!Object.keys(applied.abilities).length) delete applied.abilities;
  if(Object.keys(applied).length) itemUpdate["flags.vaarn.bakedEffects"] = applied;
  if(Object.keys(itemUpdate).length) await item.update(itemUpdate);

  if(entry.naturalWeapon)
  {
    const nw = entry.naturalWeapon;
    await actor.createEmbeddedDocuments("Item",
    [{
      name: nw.name,
      type: nw.type === "ranged" ? "weaponRanged" : "weaponMelee",
      system: { slots: 0, equipped: true, hands: 0, intrinsic: true, damageDice: normalizeDamageDice(nw.damage),
                // Damage type, new 2026-09-14. Damage-Type Read reads Beam,
                // Blast, Flame, Electrical and TOX off base_tags, and until now
                // a natural weapon carried none — a mutation's "d6 electrical"
                // reached the description and nothing else. The figments made
                // it matter: Eye is "d10, beam, hypergeometric" and Maw is
                // "d10, hypergeometric", and a beam is deflected by Mirror
                // Armour, which is a hard rule rather than an adjudication.
                // 2026-09-18: the six natural weapons whose book text names a
                // type now carry it - five TOX, and Tail Club as Bludgeoning
                // (Matt; the book says crushing, which reads the same).
                // chargen-app.js copies it the same way.
                base_tags: [...(nw.tags ?? [])],
                description: `<p>Natural weapon from the <b>${item.name}</b> ${item.type}.</p>${nw.note ? `<p>${nw.note}</p>` : ""}` }
    }]);
  }
}

/**
 * Cybernetics - Starting.md: "Each implant is assigned to one of a PC's
 * six Abilities. Each Ability may have only one implant assigned to it."
 * Confirmed (Matt, item 10.7) this pool is SHARED across the Starting
 * (chargen-data.js IMPLANTS) and Advanced (ADVANCED_IMPLANTS) tables — a
 * multi-ability entry (e.g. Dreadnaught Carapace, STR+DEX+CON) blocks/is
 * blocked by any implant from EITHER table touching any one of those
 * abilities. Previously unenforced anywhere — `ability_slot` was only
 * ever rendered as description text. Mutations have no `ability_slot`
 * concept, so this stays implant-only (item 15 didn't change this).
 *
 * Registered as a `preCreateItem` hook — returning false cancels the
 * creation outright (same Foundry mechanism item 11 doesn't need, since
 * equip conflicts there are resolved by toggling an existing Item rather
 * than blocking its creation).
 */
export function checkImplantSlotConflict(item)
{
  if(item.type !== "implant") return true;
  const actor = item.parent;
  if(!actor || actor.type !== "character") return true;

  const entry = findImplantEntry(item.name);
  if(!entry) return true;
  const newSlots = entry.ability_slot.split("+").map(s => s.trim().toLowerCase());

  // Nanomachine Slot Occupancy (2026-09-13), the direction that is easy to
  // miss. Contraction DISPLACES an implant, which is Matt's ruling and lives in
  // affliction.js; this is the mirror of it. Without this the occupation would
  // be one-directional — the infection takes the slot, and the player simply
  // reinstalls the implant a minute later into a slot the book says is full.
  //
  // An infection is never displaced by an implant. The book has the infection
  // doing the overwriting, and nothing in it lets surgery be undone by fitting
  // a new part on top.
  const held = actor.items.filter(i => i.type === "affliction")
    .find(i => String(i.system?.abilitySlot ?? "").split("+")
      .map(s => s.trim().toLowerCase()).filter(Boolean)
      .some(s => newSlots.includes(s)));
  if(held)
  {
    ui.notifications.warn(`Cannot install ${item.name} — ${held.name} occupies the ${held.system.abilitySlot} slot. Cure it first.`);
    return false;
  }

  for(const existing of actor.items.filter(i => i.type === "implant" && i.id !== item.id))
  {
    const existingEntry = findImplantEntry(existing.name);
    if(!existingEntry) continue;
    const existingSlots = existingEntry.ability_slot.split("+").map(s => s.trim().toLowerCase());
    const conflict = newSlots.find(s => existingSlots.includes(s));
    if(conflict)
    {
      ui.notifications.warn(`Cannot install ${item.name} — ${existing.name} already occupies the ${conflict.toUpperCase()} slot.`);
      return false;
    }
  }
  return true;
}

/**
 * Mutation Contradiction Precedence, POST-CHARGEN half.
 *
 * Corrupted Blood, verbatim: "If the effects contradict one another, the more
 * recent mutation takes precedence." Scope is unarmed-attack REPLACEMENTS only
 * — the three `replacesUnarmed` entries in mutation-data.js. Add-ons stack and
 * are explicitly out of scope (Matt, 2026-09-07), and Tentacles, Hair is out
 * too: it replaces the NORMAL attack rather than redefining the unarmed strike.
 *
 * THE CHARGEN HALF IS ELSEWHERE and is the easy one — chargen-app.js's
 * resolveUnarmedContradiction() picks a winner from the rolled results before
 * any Item exists, so the superseded mutation is simply never created. It needs
 * an explicit `index` because all three are rolled in one batch and nothing
 * else records which came last.
 *
 * HERE, "more recent" needs no index at all: the Item that just landed IS the
 * more recent one, by definition of having just been created. That is why this
 * does not share resolveUnarmedContradiction() — it answers the same rule from
 * a different starting point, and reusing the chargen shape would mean
 * inventing an index for Items that have no reason to carry one.
 *
 * The superseded mutation is removed OUTRIGHT and all its effects go with it
 * (Matt, 2026-09-07) — including Claws, Crab's blocksTwoHanded, because he does
 * not want a character carrying a penalty for a claw they no longer have. The
 * fiction is that the claw MUTATED INTO the spur rather than the two coexisting.
 *
 * DELETION DOES NOT CASCADE: there is no other deleteItem hook anywhere in
 * module/, so the superseded mutation's companion natural weapon has to be
 * found and deleted here too, or the character keeps a rollable Crab Claw whose
 * mutation is gone. It is matched on the backlink both creation routes write
 * into the weapon's description — `Natural weapon from the <b>NAME</b>
 * mutation.` — which chargen-app.js:1196 and this file's own naturalWeapon
 * block emit identically, so a character built in the wizard and one granted a
 * mutation by hand are both matched.
 *
 * THE BAKED-FIELD RESTRICTION IS LIFTED as of 2026-09-13, the same day this
 * was written. It used to read: safe for these three entries and not in
 * general, because the bake was permanent and superseding a mutation carrying
 * abilityMod/hpBonus/slotBonus/handsBonus would strand its bonus on the actor
 * with no Item left to explain it. reverseBakedItemEffects below now undoes
 * the bake on deletion, so the deletion this function performs takes the stat
 * bonus with it. Widening `replacesUnarmed` is a design question now rather
 * than a safety one.
 *
 * The one case that still does not reverse is an Item baked BEFORE that date,
 * which carries no record. Not a migration — see reverseBakedItemEffects.
 *
 * Announced in chat rather than by notification (Matt, 2026-09-13): post
 * chargen the GM drags one Item on and a DIFFERENT one disappears, which is
 * indistinguishable from a bug unless something says so, and a notification
 * survives only in the console of the one client that raised it.
 */
export async function supersedeUnarmedReplacers(item, options, userId)
{
  if(userId !== game.user.id) return;
  // Chargen resolves this before any Item exists and never creates the loser,
  // so there is nothing here to supersede — and without this guard the batch
  // would see its own siblings and delete the winner's predecessor twice.
  if(options?.vaarnChargenBake) return;
  // A level-up needs the SNAPSHOTS of whatever this deletes, so it can put
  // them back if the level is ever lost. The hook fires and-forgets — Foundry
  // does not await it — so advancement.js suppresses it here and calls this
  // function directly, which is the only way to have the return value.
  if(options?.vaarnDeferSupersede) return;
  if(options?.vaarnRestore) return;
  if(item.type !== "mutation") return;
  const actor = item.parent;
  if(!actor || actor.type !== "character") return;

  const incoming = MUTATION_TABLE.find(m => m.name === item.name);
  if(!incoming?.replacesUnarmed) return;

  const superseded = actor.items.filter(i =>
    i.id !== item.id &&
    i.type === "mutation" &&
    MUTATION_TABLE.find(m => m.name === i.name)?.replacesUnarmed);
  if(!superseded.length) return;

  const doomed = [];
  const removed = [];
  // Full documents, not ids — an id is worthless once the Item is gone, and a
  // level-loss undo has to be able to CREATE these again. Taken before the
  // delete for the obvious reason. Includes flags.vaarn.bakedEffects, which is
  // what the restore re-applies rather than re-deriving.
  const snapshots = [];
  for(const old of superseded)
  {
    const weapons = companionWeaponsOf(actor, old.name, "mutation");
    doomed.push(old.id, ...weapons.map(w => w.id));
    removed.push({ name: old.name, weapons: weapons.map(w => w.name) });
    snapshots.push(old.toObject(), ...weapons.map(w => w.toObject()));
  }
  await actor.deleteEmbeddedDocuments("Item", doomed, { vaarnCompanionsHandled: true });

  const lines = removed.map(r =>
    `<li><b>${r.name}</b> removed${r.weapons.length ? `, with its natural weapon${r.weapons.length === 1 ? "" : "s"} ${r.weapons.map(n => `<b>${n}</b>`).join(", ")}` : ""}.</li>`).join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content:
      `<div class="vaarn-chat-card"><h3>Contradiction rule</h3>` +
      `<p><b>${item.name}</b> redefines ${actor.name}'s unarmed attack, and the more recent mutation takes precedence.</p>` +
      `<ul>${lines}</ul>` +
      `<p>All of the superseded mutation's effects went with it. No re-roll backfills it — the book says roll three times and the contradiction rule then reduces the result.</p></div>`
  });

  return snapshots;
}

/**
 * Baked Effect Reversal — foundry-system-index.csv "Baked Effect Reversal".
 *
 * Removing a mutation, implant or Exotica undoes the stat change its creation
 * applied. Before 2026-09-13 it did not: the bake above was permanent, and
 * item-effects.js said so deliberately. Matt reversed that decision while
 * scoping Mutation Contradiction Precedence, asked whether the effects could
 * unbake rather than whether supersession should guard against them.
 *
 * WHY THE ROSTER VALUE IS NOT ENOUGH, which is the whole reason this needs a
 * stored record rather than a lookup. The bake diverges from the table in
 * three places, and every one of them is silent:
 *   - the +10 clamp. A +2 landing on a 9 applies +1.
 *   - Extra Eyes rolls 1d3 AT BAKE TIME. The amount is in no table; it is
 *     written into the Item's description as prose, which is not a place to
 *     read a number back from.
 *   - hands.max is read from _source for the reason given in the bake above.
 * So applyBakedItemEffects writes what it ACTUALLY applied to
 * flags.vaarn.bakedEffects, and this subtracts exactly that.
 *
 * NO MIGRATION, and an Item without the flag is a no-op here rather than a
 * guess. Items baked before this landed carry no record, so their bonuses stay
 * on the actor when they are removed — the pre-2026-09-13 behaviour, for
 * pre-2026-09-13 documents. Per CLAUDE.md that is the correct end state: build
 * a new actor rather than sweeping the world.
 *
 * HP, RULED 2026-09-13 (Matt): "max only, current stays where it is (unless
 * it's higher than max, in which case it should be = max)". A character five
 * HP down stays five HP down; one at full HP comes down with the ceiling.
 * actor.js:169 clamps value to max on every prepare anyway, so doing it here
 * is belt-and-braces — deliberately, since a stored value briefly out of range
 * should not need a render to correct it.
 *
 * SLOTS AND HANDS CANNOT BE CLAMPED THE SAME WAY and this is a real
 * difference, not an omission. health.value is a stored number.
 * inventorySlots.used and hands.used are DERIVED every render from the carried
 * and equipped Items (actor.js:268 and :293), so shrinking their ceiling can
 * leave a character over capacity with nothing to clamp. RULED 2026-09-13
 * (Matt): post a card and change nothing. Same reasoning as handsLapseCard in
 * save-gated.js, which exists for the identical shape — the equip gate only
 * fires when something is EQUIPPED, and here the LIMIT moves instead. Which
 * item goes is the player's call and often a tactical one.
 */
export async function reverseBakedItemEffects(item, options, userId)
{
  if(userId !== game.user.id) return;
  const actor = item.parent;
  // NPCs reach here only for a figment, because only a figment bakes onto one.
  // bakeAllowedOn is the single place that rule is written.
  if(!actor || !bakeAllowedOn(item, actor)) return;

  const applied = item.getFlag("vaarn", "bakedEffects");

  /*
   * THE NATURAL WEAPON GOES WITH THE ITEM THAT GRANTED IT — every type, not
   * only figments. RULED 2026-09-20 (Matt), Natural Weapon Orphan on Item
   * Removal. Deleting a mutation used to leave a rollable Retractable Claws on
   * the sheet with nothing to explain it; supersession, a lost Level and figment
   * removal already took the weapon, and plain deletion did not.
   *
   * BEFORE THE RECORD GUARD BELOW, and that ordering is half the fix. A
   * mutation whose only effect is a weapon records no bakedEffects at all, so
   * the guard returned before anything looked for the weapon - the fault 163.17
   * found on the Maw figment, waiting here for every other type.
   *
   * A WEAPON THE PLAYER HAS TUNED GOES TOO. It is part of the body the Item
   * gave, and supersession and level loss never asked either. The link is the
   * sentence the bake wrote into the description, so a Referee who wants to
   * keep one deletes that sentence first.
   *
   * RE-QUERIED AFTER A TICK. Supersession and the level-loss undo delete the
   * Item and its weapons in ONE batch, and this hook fires while that batch is
   * still being applied; a tick later those weapons are gone and there is
   * nothing left to find, so they are neither deleted twice nor announced here.
   */
  await new Promise(resolve => setTimeout(resolve, 0));
  // A caller that removed the weapons ITSELF says so, and then there is nothing
  // here to delete and nothing to warn about. Without this the warning below
  // fired on every supersession: the weapon had gone in the caller's batch, so
  // "none found" was true and meant nothing.
  const handled = options?.vaarnCompanionsHandled === true;
  const orphans = handled ? [] : companionWeaponsOf(actor, item.name, item.type);
  if(!handled && !orphans.length)
  {
    /*
     * THE WEAPON THAT SHOULD HAVE GONE AND DID NOT. RULED 2026-09-20 (Matt).
     * The link is a sentence in the weapon's description, and that description
     * is editable on the weapon's own sheet by anyone who can edit the Item -
     * the owning player included. So a link can be broken on purpose, to keep a
     * weapon, or by accident, and either way the Referee is told rather than
     * finding a rollable Antlers a session later with no mutation behind it.
     *
     * The ROSTER is what knows a weapon was owed: the entry declares
     * naturalWeapon. A weapon still on the sheet under the roster's name is
     * named as the likely one, but nothing is deleted on a guess.
     */
    const owed = findEntry(item)?.naturalWeapon?.name;
    if(owed)
    {
      const likely = actor.items.find(i =>
        (i.type === "weaponMelee" || i.type === "weaponRanged") && i.name === owed);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content:
          `<div class="vaarn-chat-card"><h3>Natural weapon not removed</h3>` +
          `<p><b>${item.name}</b> is gone from ${actor.name}. It normally takes its natural weapon <b>${owed}</b> with it, and none was found linked to it.</p>` +
          (likely
            ? `<p>A weapon named <b>${likely.name}</b> is still on the sheet and is probably the one - its description no longer names ${item.name}. Delete it by hand if it should go.</p>`
            : `<p>No weapon of that name is on the sheet either. It may have been renamed or already removed - check the sheet.</p>`) +
          `</div>`
      });
    }
  }
  if(orphans.length)
  {
    const names = orphans.map(w => w.name);
    try
    {
      await actor.deleteEmbeddedDocuments("Item", orphans.map(w => w.id));
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content:
          `<div class="vaarn-chat-card"><h3>Natural weapon removed</h3>` +
          `<p><b>${item.name}</b> is gone from ${actor.name}, and ${names.map(n => `<b>${n}</b>`).join(", ")} went with it.</p></div>`
      });
    }
    catch(err) { console.warn("Vaarn | companion weapon already gone", err); }
  }

  /*
   * A FIGMENT REVERSES WITH OR WITHOUT A BAKED RECORD, and the early return
   * that used to stand here is exactly what hid it. Found by testing (163.17):
   * Maw's only effects are a creature type and a natural weapon, and when
   * another figment had already set the type it recorded NOTHING — so `applied`
   * was undefined, this function returned immediately, and deleting Maw left
   * its Autarch Maw weapon on the character for ever.
   *
   * The record is about STORED NUMBERS that removal cannot recompute. Creature
   * types and companion weapons are neither: one is re-derived from what is
   * left on the actor, the other is found by its backlink. So they must run
   * before any record check.
   *
   * For every other type the old guard still holds — see the NO MIGRATION note
   * above, which is what it was for.
   */
  if(!applied && item.type !== "figment") return;

  // `rec` is the record with its absence made harmless, so the record-driven
  // reversals below read the same whether or not there was one.
  const rec = applied ?? {};
  // The roster row, for the reversals that are re-derived rather than recorded.
  const entry = findEntry(item);

  const updates = {};

  for(const [shortKey, amount] of Object.entries(rec.abilities || {}))
    updates[`system.abilities.${shortKey}.value`] =
      Number(actor.system.abilities[shortKey].value) - amount;

  if(rec.hpBonus)
  {
    // Current is left alone unless the ceiling has dropped below it - the
    // max HP verb's loss (Shared Pipelines chunk 5).
    Object.assign(updates, maxHpChange(actor, { add: -rec.hpBonus }));
  }

  // Both of these read actor.system rather than _source: prepareData leaves
  // inventorySlots.max alone, and hands.max is handled below.
  const overages = [];
  if(rec.slotBonus)
  {
    const newMax = Number(actor._source.system.inventorySlots.max) - rec.slotBonus;
    updates["system.inventorySlots.max"] = newMax;
    const used = Number(actor.system.inventorySlots.used ?? 0);
    if(used > newMax) overages.push({ what: "item slots", used, after: newMax });
  }

  if(rec.handsBonus)
  {
    // _source again — the prepared hands.max carries any temporary grant, and
    // writing that back would bake it. See the bake above.
    const newMax = Number(actor._source.system.hands.max) - rec.handsBonus;
    updates["system.hands.max"] = newMax;
    // The OVERAGE check, by contrast, must use the prepared maximum: a
    // borrowed hand is a real hand for as long as the fight lasts, so a
    // character is only genuinely over capacity once it is counted in.
    const effectiveAfter = Number(actor.system.hands.max) - rec.handsBonus;
    const used = Number(actor.system.hands.used ?? 0);
    if(used > effectiveAfter) overages.push({ what: "hands", used, after: effectiveAfter });
  }

  /*
   * CREATURE TYPE. Two questions, and getting either wrong is silent.
   *
   * WHICH TYPES COULD COME OFF — the ones this Item's own roster entry
   * declares, NOT the ones it recorded. Matt ruled 2026-09-14 that all four
   * figments stack and all four grant Hypergeometric, so only the first to
   * land records it. Driving this loop from the record meant that deleting
   * any of the other three considered nothing at all, and testing (163.17)
   * found the consequence: remove all four and the character stayed
   * Hypergeometric for ever.
   *
   * WHETHER IT ACTUALLY COMES OFF — only if no OTHER Item still on the actor
   * grants it, and only if an Item granted it in the first place. The second
   * half is what protects the ANCESTRY: a Lithling is Mineral innately, and
   * the actor-level record says so by not listing Mineral. The record lives on
   * the ACTOR precisely so it outlives whichever figment happened to set it —
   * see the bake for why an Item-level record could not.
   *
   * `item` is still in actor.items at deleteItem time, hence the id filter.
   */
  const itemGranted = actor.getFlag("vaarn", "figmentGrantedTypes") ?? [];
  const stillGranted = [...itemGranted];
  for(const key of (entry?.creatureTypes ?? []))
  {
    if(!itemGranted.includes(key)) continue;
    const heldByAnother = actor.items.some(other =>
      other.id !== item.id && (findEntry(other)?.creatureTypes ?? []).includes(key));
    if(heldByAnother) continue;
    updates[`system.creatureTypes.${key}`] = false;
    stillGranted.splice(stillGranted.indexOf(key), 1);
  }
  if(stillGranted.length !== itemGranted.length)
    updates["flags.vaarn.figmentGrantedTypes"] = stillGranted;

  /*
   * LEVEL. The two grant paths reverse differently because they did different
   * things, and one of them cannot fully reverse at all.
   *
   * NPC: applyDrainerGain recorded from and to, so the Level goes back to
   * `from` and every ability with it — the same statblock convention the gain
   * used. Clean, because nothing else consumed it.
   *
   * CHARACTER: the grant was XP, and XP may already have been SPENT on a level
   * the player chose abilities and rolled HP for. That level is theirs and this
   * function has no business unpicking it — advancement.js owns level loss and
   * has a ledger for exactly that. So the XP is taken back, floored at zero,
   * and a character who already spent it simply keeps the level.
   *
   * THAT IS NOT A CLEAN REVERSAL and it is the one place Matt's "removable, and
   * everything reverses" ruling does not reach. Recorded as an open question on
   * the Autarch Figment Grant row rather than decided here. The floor is the
   * only option that cannot corrupt state; going negative would make the next
   * level-up cost silently wrong.
   */
  if(rec.levelGrant)
  {
    const lg = rec.levelGrant;
    if(lg.kind === "npc" && Number.isFinite(lg.from))
    {
      updates["system.level.value"] = lg.from;
      const abilityValue = Math.min(lg.from, 10);
      for(const key of Object.keys(actor.system.abilities ?? {}))
        updates[`system.abilities.${key}.value`] = abilityValue;
    }
    else if(lg.kind === "xp")
    {
      const before = Number(actor.system.xp?.value ?? 0);
      const after = Math.max(0, before - lg.xp);
      updates["system.xp.value"] = after;
      if(after > before - lg.xp)
        ui.notifications?.warn(
          `${actor.name} had already spent XP from ${item.name}. `
          + `XP taken back to 0; any Level already gained is kept.`);
    }
  }

  if(Object.keys(updates).length) await actor.update(updates);

  if(overages.length)
  {
    const lines = overages.map(o =>
      `<li><b>${o.what}</b> — ${o.used} in use against ${o.after}. Unequip or drop ${o.used - o.after} worth from the sheet.</li>`).join("");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content:
        `<div class="vaarn-chat-card"><h3>Capacity lost</h3>` +
        `<p>Removing <b>${item.name}</b> lowers ${actor.name}'s capacity below what they are carrying.</p>` +
        `<ul>${lines}</ul>` +
        `<p>Nothing has been unequipped — which item goes is the player's choice.</p></div>`
    });
  }
}

/**
 * The mirror of reverseBakedItemEffects, for Advancement Automation's
 * level-loss undo.
 *
 * WHY THIS EXISTS RATHER THAN JUST RE-CREATING THE ITEM. A Proteus mutation
 * taken at level-up can supersede one the character already had, and the
 * superseded mutation is deleted — which reverses its bake. Undoing that level
 * has to put the mutation back AND put its stat change back. Letting the
 * normal createItem bake do that would not restore it, it would compute a NEW
 * one: Extra Eyes rolls a fresh 1d3, and the +10 clamp lands against whatever
 * the abilities read at restore time rather than what they read originally.
 * So the snapshot carries flags.vaarn.bakedEffects and this re-applies exactly
 * that, with the bake hook suppressed by options.vaarnRestore.
 *
 * NOT A PUBLIC UNDO for arbitrary Items. It only ever runs against a delta
 * this system recorded when it applied it, which is why it does no clamping of
 * its own — the clamp already happened, once, and its result is the number
 * being restored.
 *
 * hands.max reads _source for the same reason the bake does: the prepared
 * value carries any temporary Save-Gated grant and writing that back would
 * bake a borrowed hand in permanently.
 */
export async function restoreBakedItemEffects(actor, applied)
{
  if(!actor || !applied) return;

  const updates = {};

  for(const [shortKey, amount] of Object.entries(applied.abilities || {}))
    updates[`system.abilities.${shortKey}.value`] =
      Number(actor.system.abilities[shortKey].value) + amount;

  // Both max and value, matching the bake. Gaining capacity back is not
  // healing for the same reason gaining it in the first place was not: the
  // gap between max and value — the lost HP — is unchanged either way.
  if(applied.hpBonus)
  {
    Object.assign(updates, maxHpChange(actor, { add: applied.hpBonus }));
  }

  if(applied.slotBonus)
    updates["system.inventorySlots.max"] = Number(actor._source.system.inventorySlots.max) + applied.slotBonus;

  if(applied.handsBonus)
    updates["system.hands.max"] = Number(actor._source.system.hands.max) + applied.handsBonus;

  if(Object.keys(updates).length) await actor.update(updates);
}

/**
 * The natural weapons an Item's bake created, found the only way they can be
 * found: by the sentence the bake writes into the weapon's own description.
 *
 * There is no deleteItem cascade anywhere in module/ and no stored backlink, so
 * this string IS the relationship. It was already the mechanism supersession
 * used; pulling it out here is what stops there being a second copy, because
 * Advancement Automation needs the same question answered when it undoes a
 * Proteus level.
 *
 * FOUND BY TESTING 2026-09-13 (151.22): the undo deleted the granted mutation
 * and left its natural weapon behind, so the character kept a rollable
 * Retractable Claws with no mutation to explain it — the identical orphan
 * test-unarmed-supersession.mjs already warns about from the other direction.
 *
 * `kind` is the Item type as the bake spelled it. item-effects.js writes
 * `${item.type}`, so a mutation's weapon says "mutation" and an implant's says
 * "implant"; chargen-app.js writes the same words at its own three sites. Pass
 * the one you are looking for rather than matching loosely, or an implant's
 * weapon can answer a mutation's question when the two share a name.
 */
export function companionWeaponsOf(actor, name, kind)
{
  // The sentence ends "mutation." for every bake but one: chargen writes
  // "ancestry rule (Cacklemaw Exile)." for an ancestry's weapon. Nothing removes
  // an ancestry today, but Matt noted 2026-09-20 that an Exotica or Elixir might,
  // and the question should already have an answer when one does - ask with
  // kind "ancestry rule".
  const stem = `Natural weapon from the <b>${name}</b> ${kind}`;
  return actor.items.filter(i =>
    (i.type === "weaponMelee" || i.type === "weaponRanged") &&
    (i.system?.description?.includes(stem + ".") || i.system?.description?.includes(stem + " (")));
}
