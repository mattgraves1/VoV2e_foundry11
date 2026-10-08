import { MUTATION_TABLE } from "./mutation-data.js";
// The leftover flags from their sentences (Remaining Sources chunk 2d, 2026-10-07).
import { remainingItemFlagsOf } from "../item/remaining-effects.js";
import { IMPLANTS } from "./chargen-data.js";
import { ADVANCED_IMPLANTS } from "./advanced-implants-data.js";
import { findFigment } from "./figments.js";
import { activeDeltas } from "../time/stateful-effect.js";
import { slotCostOf, stackSlotsOf, usedSlots, cargoCapacityOf, isCargo } from "./item-slots.js";
import { isSuppressed, suppressionDeltas } from "../item/suppression.js";
import { handsGrantedBy } from "../combat/save-gated.js";
import { statOf, armourSlotOf } from "../effects/item-stats.js";
import { entriesOf, hasExpired } from "../time/effect-board.js";
import { grownPartMalus, grownPartAv } from "./bloomboon-growth.js";
import { RECURRENCES } from "../time/recurrence-data.js";
import { graftHostOf } from "./grafted-arm.js";
import { passiveAvOf, WEAPON_TYPES } from "../item/weapon-tags.js";
import { needsAttunement } from "../item/attunement.js";
import { baseAvOf, wornArmourAvZeroed, liveAbilityBonusOf, liveBodyBonusesOf } from "../effects/body.js";

const isWeaponType = i => WEAPON_TYPES.includes(i.type);

/**
 * Wounds that GRANT AV, one entry per slot - The Gitch's crystals (Live AV
 * Computation wiring, 2026-09-25). Declared on the recurrence that produces
 * the wound, as `producesWound.avPerSlot`, so the number lives beside the
 * book text it came from.
 */
const AV_WOUNDS = RECURRENCES.map(r => r.producesWound)
  .filter(w => w?.avPerSlot).map(w => ({ name: w.name, perSlot: Number(w.avPerSlot) }));

/**
 * The creature types an actor is being GRANTED rather than owning — turned on
 * by a live stateful effect, or by owning a Mystic Gift — and which its stored
 * data does not already carry.
 *
 * FILED AND FIXED 2026-09-20. The grants were written straight into prepared
 * data and the sheet rendered them as bound checkboxes, so any submit wrote
 * them into storage permanently. Both the derivation in _prepareCommonData and
 * the sheet's submit filter now ask this one function which types are granted;
 * two lists computed separately would be two chances to disagree, and the one
 * that disagreed would either bake a type or strip a real one.
 *
 * "AND WHICH ITS STORED DATA DOES NOT ALREADY CARRY" IS THE LOAD-BEARING HALF,
 * and it is the same rule figmentGrantedTypes already uses for the Item path:
 * record what was APPLIED, never what the source asked for. A Lithling is
 * already Mineral, so Lithification Syrup grants that Lithling nothing —
 * submitting `mineral: true` for them changes no stored value and bakes
 * nothing, and their checkbox must stay editable. Filtering here rather than
 * at each caller means neither caller can forget it.
 *
 * `deltas` is passed in by prepareDerivedData, which has already summed them
 * and whose own comment warns that computing them twice is two chances to
 * disagree. Callers outside the derivation let it compute.
 */
export function grantedCreatureTypes(actor, deltas = activeDeltas(actor))
{
  const stored = actor?._source?.system?.creatureTypes ?? {};
  const schema = actor?.system?.creatureTypes ?? {};
  const granted = [];

  const add = (t) =>
  {
    if(!(t in schema)) return;
    if(stored[t]) return;
    if(!granted.includes(t)) granted.push(t);
  };

  for(const t of (deltas?.creatureTypes ?? [])) add(t);
  // A live Item's creature types (Stats as Sentences chunk 2d-ii) - granted, never stored.
  for(const t of liveBodyBonusesOf(actor).creatureTypes) add(t);

  // Ownership is the faithful test for Psychic, not equipping — Matt's ruling
  // 2026-09-03. The book ties Gleam to "equipped Gifts", but a Gift has no
  // `equippable` template and cannot be put down at will.
  if((actor?.items ?? []).some(i => i.type === "gift")) add("psychic");

  return granted;
}

/**
 * The same set, but naming what granted each one, for the sheet's tooltip.
 *
 * Deliberately NOT the function the submit filter reads. This walks the board
 * a second time to recover per-entry names, which activeDeltas discards when
 * it sums them; if that walk ever drifts from the one above, the cost is a
 * missing tooltip rather than a baked or stripped type. Correctness has one
 * source; presentation is allowed its own.
 */
export function grantedCreatureTypeSources(actor)
{
  const granted = grantedCreatureTypes(actor);
  if(!granted.length) return {};

  const now = game?.time?.worldTime ?? 0;
  const round = game?.combat?.round ?? null;
  const sources = {};

  for(const entry of entriesOf(actor))
  {
    if(!entry?.applied) continue;
    if(hasExpired(entry, { now, round })) continue;
    for(const t of (entry.applied.creatureTypes ?? []))
      if(granted.includes(t)) (sources[t] ??= []).push(entry.name ?? "an effect");
  }

  for(const i of (actor?.items ?? []))
    if(i.type === "gift" && granted.includes("psychic"))
      (sources.psychic ??= []).push(i.name);
  // A live Item's types, by the Item (2d-ii).
  for(const i of (actor?.items ?? []))
    for(const t of liveBodyBonusesOf({ items: [i] }).creatureTypes)
      if(granted.includes(t)) (sources[t] ??= []).push(i.name);

  return Object.fromEntries(
    granted.map(t => [t, `Granted by ${(sources[t] ?? ["an active effect"]).join(", ")} — not stored on this actor`])
  );
}

/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class KnaveActor extends Actor {

  /**
   * LINKED CHARACTER TOKENS (foundry-system-index.csv "Linked Character
   * Tokens", RULED 2026-09-27 by Matt). Foundry does not link a new actor's
   * token to it, so a character's token on the map was its own copy: a
   * failed save put Blind on the token and the character the player opens
   * from the Actors directory never saw it (Group 447.8). Every new
   * character is linked here, whichever path made it - the creator,
   * resurrection, the JSON import, the sidebar's Create Actor. A creation
   * that states actorLink itself (a duplicate, the Bifurcating Brew's split)
   * keeps what it states. Existing characters are not swept.
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (this.type === "character" && data.prototypeToken?.actorLink === undefined)
      this.updateSource({ "prototypeToken.actorLink": true });
    // PLAYER TOKEN PLACEMENT (RULED 2026-09-28, Matt): a new character's token
    // is Friendly, sees (vision on at range 0 - lit areas only, as the book's
    // darkness wants a light), and shows its HP bar to its owner. Anything the
    // creating data states itself is kept; existing characters are not swept.
    if (this.type === "character")
    {
      const pt = data.prototypeToken ?? {};
      const set = {};
      if (pt.disposition === undefined) set["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      if (pt.sight?.enabled === undefined) set["prototypeToken.sight.enabled"] = true;
      if (pt.displayBars === undefined) set["prototypeToken.displayBars"] = CONST.TOKEN_DISPLAY_MODES.OWNER;
      if (pt.bar1?.attribute === undefined) set["prototypeToken.bar1.attribute"] = "health";
      if (Object.keys(set).length) this.updateSource(set);
    }
  }

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // A container is the ground, not a creature — Dropped Item Container.
    // It deliberately does NOT include the `base` template, so it has no
    // abilities and no armor block, and everything below would throw on
    // the first Object.entries(data.abilities). Giving it `base` instead
    // would silence that by making the ground a valid damage target with
    // hp and wounds, which is exactly what the row rejected when it chose
    // a real Actor type over a flag on an npc.
    if (this.type === 'container') return;

    const data = this.system;
    const flags = this.flags;

    // Shared by every Actor type: per-ability effective bonus/defense,
    // read by roll handlers regardless of actor type.
    this._prepareCommonData(this);

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized. Character-specific armor.value must be finalized
    // (in _prepareCharacterData) before armor.bonus is derived from it below —
    // npc's armor.value is untouched by that method, so this ordering is a
    // no-op for npc.
    if (this.type === 'character') this._prepareCharacterData(this);

    // A vehicle's hold — Container Slot Capacity, 2026-09-20. The capacity was
    // already stored and already printed on the sheet as a bare editable
    // number that nothing honoured; this is what makes it a used-against-
    // capacity figure. Same shape as the npc block below, and the same reason
    // no cargo flag is read: a vehicle's mounted weapons cost no slots.
    if (this.type === 'vehicle')
    {
      const hold = cargoCapacityOf(this);
      if (hold !== null) data.inventorySlots = { value: hold, used: usedSlots(this.items) };
    }

    /*
     * Autarch Figment Grant (2026-09-14). Gut is "+3 AV", and a figment lands
     * on either Actor type — so an NPC bearer needs the bonus too.
     *
     * A SEPARATE PASS RATHER THAN A SHARED ONE, and the asymmetry is the
     * point. A character's armour is RECOMPUTED from scratch every prepare by
     * _prepareCharacterData, which walks the equipped items and the passive
     * mutation and implant bonuses and writes the total; the figment bonus is
     * part of that sum and is already added there. An NPC's armor.value is a
     * STORED statblock number that nothing recomputes, so the only way to add
     * to it live is to add to it here.
     *
     * Adding it here for characters too would therefore double it — the
     * character branch has already counted it. Found by testing (163.10): the
     * NPC came out at AV 11 with Gut on, because the loop that reads figments
     * lives inside the character-only method.
     *
     * Live, like every other avBonus: nothing is written to the stored value,
     * so removing the Item removes the bonus with no record to keep.
     */
    if (this.type === 'npc')
    {
      // A grafted limb has the AV of its host, read LIVE - the Fleshwarp's
      // Grafted Arm, RULED 2026-09-26 (Matt). The host's effective AV, so
      // armour damage on the host shows on the arm too; the limb's own board
      // and figment deltas below still add to it. grafted-arm.js re-prepares
      // the limb whenever the host changes.
      const graftHost = graftHostOf(this);
      if (graftHost) data.armor.value = Number(graftHost.system?.armor?.effective ?? graftHost.system?.armor?.value ?? data.armor.value);

      let figmentAv = 0;
      for (const i of this.items)
      {
        // A permanent body change's AV on a creature (the Lithifying Ray, 2026-09-25).
        figmentAv += Number(remainingItemFlagsOf(i).bodyChange?.av || 0);
        // A mutation's or implant's passive AV on a creature (Item Creation
        // from Roll Table wiring, RULED 2026-09-25 by Matt) - the Cacogen's
        // rolled curse, the Titan Acolyte's implant. The character branch's
        // lookup; avReplacesArmour means nothing on a statblock AV.
        // A mutation's AV comes from its sentences since Mutations and Ancestry
        // Rules chunk 2a, through passiveAvOf below (heldAv), with every Item's.
        // An implant's and a figment's AV are their sentences since Implants,
        // Exotica and Figments chunk 2 (2026-10-06), through heldAv below too.
      }
      if (figmentAv) data.armor.value = Number(data.armor.value) + figmentAv;

      /*
       * A STATEFUL AV DELTA, added 2026-09-22 for Armour Loss on a Hit, and it
       * needs its own line here for word-for-word the reason the figment
       * bonus above does: a character's armour is recomputed from scratch
       * every prepare and already folds `data.stateful.av` in as
       * passiveAvBonus, while an NPC's armor.value is a stored statblock
       * number that nothing recomputes.
       *
       * IT WAS SILENTLY INERT ON EVERY CREATURE until this line existed. That
       * is not specific to acid — any board effect carrying an `av` delta had
       * no effect at all on an NPC, and nothing said so, because the entry
       * appeared on the board and the number beside it simply never moved.
       * Found while testing Ultra-Corrosive against a creature.
       *
       * Live, like the figment bonus: nothing is written to the stored value,
       * so removing the board entry removes the penalty with no record to keep
       * and no migration for creatures that predate this.
       */
      const statefulAv = Number(data.stateful?.av ?? 0);
      if (statefulAv) data.armor.value = Number(data.armor.value) + statefulAv;

      // A held weapon's warding field - Aegis-Bearing's "+5 AV while held" -
      // for ANY holder (Weapon Tags ruling F, 2026-10-05): a character has it
      // through _prepareCharacterData; an NPC's statblock AV gets it here,
      // live, as the stateful delta above.
      // Any Item since GM Effect Builder chunk 1 (2026-10-05): passiveAvOf
      // counts a sentence only while its Item is in its state.
      const heldAv = this.items.filter(i => !isSuppressed(i) && !needsAttunement(this, i))
        .reduce((n, i) => n + passiveAvOf(i), 0);
      if (heldAv) data.armor.value = Number(data.armor.value) + heldAv;

      // A Follower's, a Pet's or a Steed's carrying capacity — Container Slot
      // Capacity, 2026-09-20, widening the Follower-only block that Actor
      // Creation from Roll Table put here on 2026-09-18. Derived every prepare
      // so it follows a hand-edited Level and needs no migration; null for a
      // Mercenary and for every other npc, which is why the sheet block is
      // behind an if. See cargoCapacityOf for where each number comes from.
      //
      // EVERY Item is counted, with no cargo flag consulted. A pack beast
      // carries nothing but cargo as far as slots go: its attacks and
      // intrinsics have no slot cost, so slotCostOf already returns 0 for
      // them. Only a character has two pools on one Actor.
      const cap = cargoCapacityOf(this);
      if (cap !== null) data.inventorySlots = { value: cap, used: usedSlots(this.items) };
    }

    /*
     * ARMOUR DAMAGE, 2026-09-22 (Matt) — the same shape an ability has had all
     * along, and the reason it was added is that armour had nowhere to put it.
     *
     * An ability is `value` (the player's number), `woundDamage` (what has
     * been done to it) and `effective` (what rolls use). Armour was `value`
     * and nothing else, and for a CHARACTER `value` is not even stored —
     * _prepareCharacterData rebuilds it from equipped items on every prepare.
     * So anything that damaged a character's armour had no field to write to,
     * and writing the derived one did nothing at all: the Synthetic Wounds
     * table's "Synthskin Damaged" (-d4 AV) has been silently ineffective on
     * characters, and Ultra-Corrosive was first built with the same mistake.
     *
     * `damage` is STORED and the player types in it, exactly like
     * woundDamage. `effective` is what every roll reads. `value` keeps its
     * old meaning — the undamaged armour — so nothing that sets a base (the
     * bestiary sync, advancement, a rolled stat, an NPC's typed statblock)
     * changes at all.
     *
     * FLOORED AT 10, the book's unarmoured baseline: damage cannot push a
     * target below the AV of someone wearing nothing, which would start
     * granting attackers bonuses no rule describes. A creature whose natural
     * AV is already under 10 is left where it is rather than raised to it.
     *
     * NOTHING REPAIRS IT (Matt, 2026-09-22). An ability's woundDamage comes
     * back on a Long Rest at full HP; armour has no such rule and the book
     * has none to borrow — he checked. So the field is cleared by the
     * Referee, by typing in it, and no code removes it. That is the whole
     * reason it is an INPUT on the sheet rather than a derived readout.
     */
    const armourDamage = Math.max(0, Number(data.armor.damage) || 0);
    const undamaged = Number(data.armor.value);
    data.armor.effective = Math.max(Math.min(undamaged, 10), undamaged - armourDamage);

    // Work-queue item 11 (2026-08-25): moved out of _prepareCommonData so it
    // always runs LAST, after _prepareCharacterData has had a chance to
    // recompute armor.value live from equipped items — otherwise a
    // character's bonus would read one frame stale.
    //
    // OFF `effective` SINCE 2026-09-22: BONUS sits beside DEFENSE on the
    // sheet and is what a reader takes the armour to be worth, so it has to
    // follow the damage. Identical to the old figure whenever damage is 0,
    // which is every actor that predates the field.
    data.armor.bonus = Number(data.armor.effective) - Number(10);
  }

  /**
   * Prepare data shared by every Actor type.
   */
  _prepareCommonData(actorData)
  {
    const data = actorData.system;

    // Stateful Effect Application (2026-09-09). Every live board entry's
    // resolved deltas, summed once here and read by both this method and
    // _prepareCharacterData — computing it twice would be two chances to
    // disagree. Stashed on `system` so the sheet and roll handlers can read
    // the same numbers the derivation used rather than re-deriving them.
    //
    // Contributing rather than writing is the whole design: a delta stops
    // applying the instant its entry expires, so there is no reverse write to
    // lose. See stateful-effect.js for the ruling this implements.
    const stateful = activeDeltas(actorData);
    data.stateful = stateful;

    // Gift-derived Psychic type (2026-09-03). Bestiary.md defines Psychic as
    // "a creature with psychic powers. May utilize Mystic Gifts", and the
    // book uses "psychic" and "Gifted" interchangeably — Mystic Gifts.md
    // says NPCs "already Gifted" may train PCs, calls that training
    // "another psychic", and warns a Gleaming PC is visible to "other
    // psychic creatures". So owning a Gift makes you Psychic.
    //
    // Matt's ruling 2026-09-03 on WHICH Gifts count: all of them. The book
    // ties Gleam to "equipped Gifts", but that wording is simply wrong —
    // a Gift cannot be equipped (the gift Item has no `equippable`
    // template) and cannot be put down at will. Ownership is the faithful
    // test, not a compromise forced by the schema.
    //
    // Derived here rather than baked so it follows Gifts appearing and
    // disappearing, and it only ever forces the flag ON: a GM can still
    // tick Psychic by hand on an unGifted actor, and this never clears it.
    //
    // A stateful effect grants a type the same one-way way, for its duration —
    // Lithification Syrup's "the Mineral creature type, including all damage
    // immunities". Neither rule clears a type the GM ticked by hand, so an
    // effect expiring cannot silently strip a creature of what it always was.
    //
    // BOTH LISTS COME FROM grantedCreatureTypes (2026-09-20), which is also
    // what the sheet reads. The paragraph that used to stand here said the
    // worst case was "a stale manual-looking true ... untick it by hand" —
    // that was the bug, not a caveat. The types are written into prepared
    // data, the sheet renders them as bound checkboxes, and FormDataExtended
    // submits the whole form on every field edit, so any submit while the
    // grant was live baked it into storage where nothing took it off again.
    // One helper, read by the derivation and by the sheet's submit filter, is
    // what keeps the two from disagreeing about which types are granted.
    if(data.creatureTypes)
      for(const t of grantedCreatureTypes(actorData, stateful))
        data.creatureTypes[t] = true;

    // Live ability bonuses from Advanced Cybernetics (item 10.7,
    // 2026-08-26) — summed fresh every render, unlike Starting Implants'
    // stat_mod (baked once at chargen finalize): Advanced Implants have
    // no such moment, so an ability bonus here must stop applying the
    // instant the implant Item is deleted, same reasoning avBonus
    // already uses. Extended item 10.3.2 (2026-08-27) to also cover
    // equipped armor items (TALLHAT Amplifier, Thinking Cap) — read
    // DIRECTLY off the Item's own `liveAbilityBonus` field, not a
    // name-lookup against a static table, since armor pieces are
    // instance-specific rather than a maintained catalog (matches how
    // armor's own avBonus already works, unlike implants' name lookup).
    // Gating on `equipped` here (unlike implants, which have no equip
    // concept) matches these items' own "when worn" text more precisely
    // than the implant pattern would have.
    // Seeded with the stateful deltas so an elixir's +5 STR flows through the
    // SAME +10 ceiling and the same wound-damage subtraction as an implant's.
    // RULED 2026-09-09 (Matt): honour the cap. Nothing extra enforces it —
    // joining this channel is what enforces it.
    // Innate Item Suppression (2026-09-13) joins here twice, and the two halves
    // are opposite shapes for a reason the mechanism's header sets out. A
    // suppressed source stops contributing, like every other live bonus; but a
    // suppressed mutation's `abilityMod` was BAKED into ability.value at
    // chargen and was never contributing, so putting it back means adding its
    // inverse for as long as the suppression lasts. Folding that into this same
    // channel is what keeps it under the +10 clamp below.
    const liveAbilityBonus = { ...stateful.abilities };
    for(const [key, amount] of Object.entries(suppressionDeltas(actorData)))
      liveAbilityBonus[key] = (liveAbilityBonus[key] || 0) + amount;
    // Bloomboon Growth (RULED 2026-09-24, Matt): a grown part's cost comes off
    // the BASE while the part lives, carried on the part and subtracted here, so
    // deleting the part ends it with nothing written back. The shed's ability
    // damage is bloomboon-growth.js's deleteItem hook.
    for(const [key, amount] of Object.entries(grownPartMalus(actorData.items)))
      liveAbilityBonus[key] = (liveAbilityBonus[key] || 0) - amount;
    for(const i of actorData.items)
    {
      // A PERMANENT BODY CHANGE carried on an Item - the Lithifying Ray's
      // Lithified (2026-09-25). Live, so deleting the Item is the undo.
      for(const [key, amount] of Object.entries(remainingItemFlagsOf(i).bodyChange?.abilities ?? {}))
        liveAbilityBonus[key] = (liveAbilityBonus[key] || 0) + Number(amount || 0);
    }
    // An advanced implant's and a worn Exotica armour's live ability bonus are
    // their passive sentences since Implants, Exotica and Figments chunk 2
    // (2026-10-06) - in their item state, not suppressed (body.js).
    for(const [key, amount] of Object.entries(liveAbilityBonusOf(this)))
      liveAbilityBonus[key] = (liveAbilityBonus[key] || 0) + amount;
    // A live Item's creation bonuses (Stats as Sentences chunk 2d-ii, RULED
    // 2026-10-07): never written into the base, so read here, under the clamp.
    for(const [key, amount] of Object.entries(liveBodyBonusesOf(this).abilities))
      liveAbilityBonus[key] = (liveAbilityBonus[key] || 0) + amount;

    // Loop through ability scores, and add their modifiers to our sheet output.
    // "effective" nets out wound damage from the base bonus without mutating
    // it, so a healed wound's damage can be tracked and reversed separately.
    // The +10 ceiling (Bestiary.md: abilities "never exceed +10") is applied
    // to the boosted total before wound damage is subtracted — same
    // semantics as chargen-app.js's _effectiveAbilities() bake, which
    // already clamps this for chargen-time stat_mod/abilityMod sources.
    for (let [key, ability] of Object.entries(data.abilities))
    {
      const boosted = Math.min(10, Number(ability.value) + (liveAbilityBonus[key] || 0));
      ability.effective = boosted - Number(ability.woundDamage);
      ability.defense = Math.floor((ability.effective + 10));
    }
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData)
  {
    const data = actorData.system;

    //clamp health
    if(data.health.value > data.health.max)
      data.health.value = data.health.max;

    data.inventorySlots.value = Number(data.abilities.con.effective) + Number(10);
    // A live Item's slots (2d-ii): in memory, never stored - every bake reads _source.
    const liveBonuses = liveBodyBonusesOf(this);
    if(liveBonuses.slots) data.inventorySlots.max = Number(data.inventorySlots.max) + liveBonuses.slots;
    let used = 0;
    // Container Slot Capacity (2026-09-20). Accumulated in the same pass as
    // `used` and rounded the same way, so a third of a slot behaves in a pox
    // cavity exactly as it does in a pack.
    let cargoUsed = 0;
    let giftCount = 0;
    // Work-queue item 11 (2026-08-25): hands.used and armor.value are both
    // live-recomputed here every render, folded into this same item loop —
    // hands.max stays chargen-baked (see chargen-app.js's mutationHandsBonus),
    // same precedent as inventorySlots.max.
    let handsUsed = 0;
    let armourBonusSum = 0;
    // Passive avBonus from mutations (item 3.3) AND implants (item 10.2,
    // 2026-08-25 — Subdermal Ceramic Plating) — both looked up live by
    // name against their static data table rather than stored on the
    // Item itself, same reasoning as mutations already used.
    // Stateful Effect Application (2026-09-09): Plating Potion's +5 AV,
    // Spineskin Syrup's +2, Lithification Syrup's +5. Seeded into
    // passiveAvBonus rather than armourBonusSum for the reason Aegis-Bearing
    // gives two branches down — a chemically grown carapace is not "other
    // armour" in the sense a Quills-type avReplacesArmour mutation forbids,
    // so it stacks instead of being zeroed alongside worn armor.
    let passiveAvBonus = Number(data.stateful?.av ?? 0);
    // An Exotica's AV until the combat ends - the Active Camouflage Ring's +10
    // (Live AV Computation wiring, 2026-09-25). Not worn armour, so passive.
    passiveAvBonus += Number(actorData.flags?.vaarn?.combatAv?.av || 0);
    let replacesArmour = false;
    for(let i of actorData.items)
    {
      //calculate max inventory slots and used slots
      // slotCostOf, not `i.system.slots`, since 2026-09-12: a fractional cost
      // means per UNIT, which is how three rations ride in one slot. See
      // item-slots.js — the rule and its rounding live there so the offline
      // suite can drive the real thing rather than a copy of it.
      // Container Slot Capacity (2026-09-20): a stowed Item is billed to the
      // cargo compartment instead, never to both. This is the one place the
      // flag is read on a character, and it is read ONCE so the three things
      // downstream of `used` - Encumbrance Penalty's data.encumbered, the
      // Fleeing Combat save target and knave.js's CAPPED display - cannot
      // disagree about what is being carried.
      // Per-Stack Slot Rounding (2026-09-27): each stack is rounded up on its
      // own before it is added, cargo included.
      if(isCargo(i)) cargoUsed += stackSlotsOf(i);
      else used += stackSlotsOf(i);
      // Bloomboon Growth: a grown Shield Vine's +1 AV, passive like Plating
      // Potion's and for the same reason - it is not worn armour.
      passiveAvBonus += grownPartAv(i);
      // Grafted Limb Creation: a grafted trait's AV, the GM's number (2026-09-24).
      passiveAvBonus += Number(remainingItemFlagsOf(i).graft?.av || 0);
      // A permanent body change's AV (the Lithifying Ray, 2026-09-25).
      passiveAvBonus += Number(remainingItemFlagsOf(i).bodyChange?.av || 0);
      // Gitch Crystals: +1 AV per slot, like the grown vine's - not worn armour.
      if(i.type === "wound")
      {
        const w = AV_WOUNDS.find(w => i.name.startsWith(w.name));
        if(w) passiveAvBonus += w.perSlot * Math.max(1, Number(statOf(i, "slots")) || 1);
      }
      //check if actor can use spell based on level
      if(i.type === "spell")
        i.system.spellUsable = (Number(actorData.system.level.value) >= Number(i.system.level));
      if(i.type === "gift")
        giftCount++;
      if(i.system.equipped && (i.type === "weaponMelee" || i.type === "weaponRanged"))
      {
        // `?? 1`, NOT `|| 1`. A weapon that declares no hands field still
        // defaults to one, which is what this line was always for - but a
        // natural weapon declares hands: 0 deliberately, and 0 is falsy, so
        // `|| 1` billed every body part a hand it does not have. Silent since
        // item 11 (2026-08-25) and only ever visible to characters with a
        // natural weapon; the base Unarmed Strike made it universal, because
        // that is a 0-hand weapon on every character. Found 2026-09-07 when a
        // plain True-kin with nothing but its bare hands could not equip a
        // two-handed weapon.
        handsUsed += Number(statOf(i, "hands") ?? 1);
        // Aegis-Bearing weapon tag (item 4.6.1, 2026-08-27): "Projects a
        // personal warding field. Grants +5 AV while held." A fixed
        // amount tied to one specific tag name, unlike armor's avBonus —
        // no per-item field or lookup table needed, just a flat constant.
        // Added to passiveAvBonus rather than armourBonusSum deliberately
        // — a personal warding field from a held WEAPON isn't "worn
        // armour" in the sense Quills-type avReplacesArmour cares about
        // (that mutation's text is specifically "cannot wear OTHER
        // ARMOUR"), so it should stack even for a Quills-type character
        // instead of being zeroed out alongside their real armor.
        // From the sentences since Weapon Tags chunk 5a (passiveAvOf).
        passiveAvBonus += passiveAvOf(i);
      }
      // An equipped carried Item takes the hands its effect says, 0 otherwise (Stats as
      // Sentences chunk 2e-ii, RULED 2026-10-07) - a worn amulet none, a held orb its one.
      if(i.system.equipped && !isWeaponType(i) && i.type !== "armor")
        handsUsed += Number(statOf(i, "hands") ?? 0);
      if(i.type === "armor" && i.system.equipped)
      {
        // Through the sentences since Stats as Sentences chunk 2b (RULED 2026-10-07).
        if(armourSlotOf(i) === "shield") handsUsed += 1;
        armourBonusSum += Number(statOf(i, "av") || 0);
      }
      // GM Effect Builder chunk 1 (2026-10-05): a passive +AV a GM wrote on
      // any other Item, in its state (armour equipped, the rest carried or
      // installed), not suppressed, attuned where it must be. Worn armour's
      // counts as armour, so Quills-type replacement zeroes it with the rest.
      if(!isWeaponType(i) && !isSuppressed(i) && !needsAttunement(this, i))
      {
        if(i.type === "armor") armourBonusSum += passiveAvOf(i);
        else passiveAvBonus += passiveAvOf(i);
      }
      // Innate Item Suppression (2026-09-13): a suppressed source contributes
      // nothing and reverses by ceasing to exist, which is the whole reason
      // this AV figure is recomputed from scratch every render rather than
      // stored. Placed after the slot and hands accounting above deliberately —
      // a suppressed item is still carried and still part of the body, so it
      // still costs slots. Only the ongoing EFFECT stops.
      // A mutation's AV and Quills' armour replacement are its sentences since
      // Mutations and Ancestry Rules chunk 2a: the AV through passiveAvOf above,
      // the replacement through wornArmourAvZeroed below.
      // An implant's and a figment's AV (Gut's +3) are their sentences since
      // Implants, Exotica and Figments chunk 2 (2026-10-06), counted by the
      // passiveAvOf read above with every other Item's. No implant or figment
      // replaces armour, so nothing here sets replacesArmour.
    }
    // Every reader below takes this figure — the display, the Encumbered flag
    // and the Fleeing Combat save target. Each stack was already rounded up by
    // stackSlotsOf, so the sum is whole; the ceil only guards a stray float.
    used = Math.ceil(Number(used.toFixed(4)));
    // WEIGHT OF WORLDS (Encumbrance Penalty wiring, RULED 2026-09-25, Matt):
    // "The PC's maximum Item Slots are halved, and the slot size of each item
    // is doubled." Rounded DOWN (Matt). Here, before the Encumbered flag and
    // the Fleeing target read either figure. Over capacity is shown, never
    // refused.
    if (data.stateful?.weightOfWorlds)
    {
      data.inventorySlots.value = Math.floor(Number(data.inventorySlots.value) / 2);
      used *= 2;
    }
    data.inventorySlots.used = used;

    // Encumbrance Penalty (2026-09-07): "Characters who carry more items than
    // their slot limit are Encumbered and have DIS on all STR, DEX, and CON
    // saves" — Item Slots.md, and the CRIMSON HOUND text says the same. Note
    // strictly MORE than the limit: a character sitting exactly on 10+CON fits
    // and is NOT Encumbered. The sheet's red slot display used to fire at >=
    // and so disagreed with the book by one; both sides now read this one
    // derived flag, so they cannot drift apart again.
    // Derived every render like hands.used and armor.value above, so it reaches
    // characters built before this existed with no migration.
    data.encumbered = used > data.inventorySlots.value;

    // The cargo compartment — Container Slot Capacity, 2026-09-20. Labyrinth
    // Pox Stage 2 is the only thing that opens one today: "gains an equal
    // number of new inventory slots, which are located inside their hollowing
    // body". Derived here beside `used` and rounded the same way.
    //
    // NOT PART OF data.encumbered ABOVE, deliberately and by ruling: what is
    // stowed does not weigh on the character, which is the whole point of the
    // compartment. Encumbrance still reads 10 + CON against what is carried.
    //
    // OVER CAPACITY IS SHOWN, NEVER REFUSED (Matt, 2026-09-20, following the
    // item-transfer ruling of 2026-09-07). The cavity can SHRINK below what is
    // already in it - nothing empties it when the pox is cured - so there is
    // no coherent blocking behaviour to have.
    if(data.cargo)
    {
      data.cargo.used = Math.ceil(Number(cargoUsed.toFixed(4)));
      data.cargo.over = data.cargo.used > Number(data.cargo.capacity);
    }

    // Fleeing Combat (2026-09-11): "a DEX Save vs their total used item slots"
    // is the one rule whose TARGET NUMBER is the slot count rather than the
    // usual 15, so the count itself has to be readable and not just the
    // over-the-limit boolean above. Derived here from the same `used` the
    // encumbrance line reads, so the save and the red display can never
    // disagree about how full a character is — the drift the >= / > fix
    // closed on 2026-09-07 was exactly two readers computing this apart.
    //
    // Wounds occupying slots therefore raise the flee target for free, which
    // is the book's own arithmetic rather than a rule added here.
    data.slotsUsed = used;

    data.hands.used = handsUsed;

    // Save-Gated Effect (2026-09-13): a successful save can grant a hand for
    // the rest of the encounter — the Usurper Arm's success branch, which Matt
    // ruled is "+1 to the PC's hand count" rather than an attack this system
    // rolls for them.
    //
    // DERIVED, not baked into hands.max, and the distinction matters twice
    // over. It reaches a character built before this existed with no migration,
    // exactly like hands.used and armor.value above; and it vanishes the
    // instant deleteCombat drops the flag, so a temporary hand cannot outlive
    // the fight the way a baked one would. `+=` is safe on a value Foundry
    // rebuilds from _source before every prepare, so this cannot accumulate.
    data.hands.max = Number(data.hands.max) + handsGrantedBy(actorData) + liveBonuses.hands;
    // Crystalline Flesh (Live AV Computation wiring, 2026-09-25, Matt): "Your
    // base AV is 10 + your Level (maximum 20)." Keyed on the ancestry, not the
    // mineral type - Lithification Syrup grants the type and not this rule.
    // It replaces the base of 10 only, so worn armour still adds on top.
    // From Crystalline Flesh's sentence since Mutations and Ancestry Rules
    // chunk 2a (an Item, or the ancestry text - ruling B); 10 for everyone else.
    const baseAv = baseAvOf(this);
    if (wornArmourAvZeroed(this)) replacesArmour = true;
    data.armor.value = baseAv + (replacesArmour ? 0 : armourBonusSum) + passiveAvBonus;

    // Gleam: equipped Gift count + PSY bonus, per Mystic Gifts.md. Purely
    // informational — the weekly Gleam Test itself stays a manual GM roll.
    data.gleam = giftCount + Number(data.abilities.psy.effective);
  }

}