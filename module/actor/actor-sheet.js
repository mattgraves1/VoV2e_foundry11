import { BIOLOGICAL_WOUNDS, SYNTHETIC_WOUNDS, getWound } from "./wounds-data.js";
import { checkWoundDeath, restProofReason, applyNamedWound } from "./named-wound.js";
import { resolveSurgicalArray } from "../combat/surgical-array.js";
import { applyHitProgression } from "../combat/hit-progression.js";
import { isCargo, CARGO_FLAG } from "./item-slots.js";
import { findFigment } from "./figments.js";
import { openLevelLoss } from "./level-loss.js";
import { EQUATIONS, MISHAPS, substituteINT } from "./codex-data.js";
import { SPARK_TABLES, ANCESTRY_NOTES, IMPLANTS, GIFT_QUALITIES_ALL, GIFT_FORMS_ALL, ELIXIRS } from "./chargen-data.js";
import { rollUsageDie, upgradeDie, flagWeaponFiredInCombat } from "../item/usage-die.js";
import { DAMAGE_NOTES, TO_HIT_NOTES, SAVE_NOTES, HIT_NOTES } from "./roll-notes-data.js";
import { beamStormNote } from "../time/weather.js";
import { currentEnvironment } from "../time/exploration-clock.js";
import { GAMBIT_THRESHOLD } from "./gambit-data.js";
import { postGambitCard } from "../combat/gambit-card.js";
import { postCorrosionCard } from "../combat/corrosion-card.js";
import { postMetalReachCard } from "../combat/metal-cards.js";
import { MUTATION_TABLE } from "./mutation-data.js";
import { ADVANCED_IMPLANTS, ADVANCED_IMPLANT_SLOTS } from "./advanced-implants-data.js";
import { FORGETTABLE_EFFECTS } from "./forgettable-effects-data.js";
import { resolveDamageInteractions, damageOverride, hasAttackProperty, attackPropertiesOrKinetic, targetDisadvantage, FLAMMABLE_BURN, isFlammable,
         incomingDamageMultiplier, outgoingDamageMultiplier, ignoresEvenDamage,
         woundDamageMultiplier, ARMOUR_LOSS_TAGS,
         offersArmourChoice, isDegradingArmour, setDegradingArmour, clearArmourChoice,
         advantageVsTargets, abilityDamageSpecsOf, abilityTickSpecsOf, escalatingSpecsOf, tagSaveSpecsOf,
         hasAnyCreatureType, immuneToAttackProperty, isFlat, reboundsAttack } from "../item/attack-properties.js";
import { collectDamageAddOns, withheldDamageAddOns, damageAddOnFor, isDamageAddOn,
         isCharging, setCharging, clearCharge } from "../item/damage-add-ons.js";
import { d } from "./chargen-app.js";
import { rollWeapon } from "./weapon-roller.js";
import { extractImplant } from "./creature-generate.js";
import { MORALE_TARGET, MORALE_MODES, moraleFailRules, moraleFailCard } from "./morale.js";
import { ANCESTRY_RULE_ITEMS, ANCESTRY_KILL_REACTIONS } from "./ancestry-rules-data.js";
import { saveSentence } from "./bestiary-build.js";
import { postCompelledSave, postSaveCard, postSaveCardsToTargets, postToxSave, postToxSaves, toxSaveApplies } from "../combat/compelled-save.js";
import { useFieldGenerator, healTargets } from "./healing-field.js";
import { postGiftApplyCard } from "../combat/gift-damage.js";
import { effectsOf, effectLabel, levelOf, costDieForLevels, giftConditionSpec } from "../item/gift-effects.js";
import { postEquationDamageCard } from "../combat/equation-damage.js";
import { reputationRows, setRep, changeRep, SPEND_EXAMPLES } from "./faction-reputation.js";
import { openTransferDialog, handleItemDrop } from "./item-transfer.js";
import { grantedCreatureTypes, grantedCreatureTypeSources } from "./actor.js";
import { applyJinx, JINX_BANNER } from "../time/curse.js";
import { ownerOf, ownerIsDangling, openOwnerDialog, companionsOf, companionKindOf,
         COMPANION_KINDS } from "./companion.js";
import { companionUpkeep } from "./companion-upkeep.js";
import { activate as activateRoundEffect, deactivate as deactivateRoundEffect,
         isRoundEffectActive, formulaFrom, PER_ROUND_WORDING } from "../combat/round-effects.js";
import { SCALES, removeEntry as removeEffectEntry, entriesOf, addEntry } from "../time/effect-board.js";
import { startGiftSustain, addFading, fadingSummary } from "../time/recurrence.js";
import { resolveDeltas as resolveStatefulDeltas,
         isEmptyDeltas as isEmptyStatefulDeltas,
         applyActivationHp as applyStatefulActivationHp,
         hasCondition as hasStatefulCondition,
         entriesEndedByDamage, conditionSourceNames, saveDisSources,
         DIS_SAVES_AND_ATTACKS } from "../time/stateful-effect.js";
import { permanentAbilitySpecFor, eligibleForGain, promptAbilityChoice,
         applyPermanentAbilityChange, exoticaPermanentAbilitySpecFor,
         promptDistinctAbilities } from "./permanent-ability.js";
import { BIFURCATING_BREW, bifurcate, cloneFromElixir } from "./bifurcation.js";
import { watchdogRedirect, watchdogKillButton } from "../combat/watchdog.js";
import { applyRolledStat } from "./rolled-stat.js";
import { encounterSpecFor, rollEncounter } from "./encounter.js";
import { levelDrainSpecOf, applyLevelDrain, applyDrainerGain,
         victimsOf, drainSummary } from "./level-drain.js";
import { isDeprived, setDeprived, deprivedElapsedLabel, deprivedFuseLine,
         blocksHealing, noHealRule } from "./deprived.js";
import { repair, repairWound, synthPartTotal } from "./synth-repair.js";
import { scaleHealing } from "./healing-multiplier.js";
import { shortRest, longRest, healWound, rationFreeRule, rationTotal,
         damagedAbilities, restoreAbilityPoints, healFloor,
         FOOD_RATION, WATER_RATION, supplyTotal, rationKindsFor, spendSupply,
         dietRationsFor, isMealFor, spendRation } from "./rest.js";
import { planLongRest, defaultPicks, stockOf, characterOutcomeText, companionOutcomeText,
         shortRestOutcomeText,
         GROUP as PLAN_GROUP, NONE as PLAN_NONE } from "./rest-plan.js";
import { dailyPoolSize } from "./daily-pool.js";
import { levelUpAvailable, openLevelUp, loseLevels, ABILITY_CAP,
         companionLevelUpAvailable, applyCompanionLevelUp, companionCanLevel } from "./advancement.js";

/**
 * The four Elixirs whose whole effect is a stated duration.
 *
 * Berserker Brew is deliberately NOT here: Matt ruled it fiction-locked to the
 * frenzy wearing off, so it ends when the encounter does and has no span to
 * track. It keeps its own branch and its own actor flag.
 */
const DURATION_ELIXIRS = ["Hilarious Strength", "Spineskin Syrup",
                          "Lithification Syrup", "Regeneration Serum"];

/**
 * Every Elixir that goes down the duration path: the four above, plus any the
 * roster gives a `stateful` spec.
 *
 * DERIVED FROM THE ROSTER RATHER THAN LISTED. Stateful Effect Application
 * (2026-09-09) brought Plating Potion, Growth Serum and Squishflesh Balm into
 * this path, and a second hand-written list would have needed editing every
 * time a spec was added — the exact drift that had all four literals above
 * stating HOURS when the roster said Exploration Turns. A spec IS the
 * statement that this elixir does something mechanical for a span.
 */
//
// A DECLARED SPAN ADMITS AN ELIXIR TOO (2026-09-21, Group 297). Before this,
// an Elixir with a span and nothing mechanical - Windsong, Skulk Salve,
// Fellowship and seven more - fell past this gate, and its USE control did
// nothing at all: no board entry, no chat line, the vial kept. A declared span
// is as much a statement that the elixir runs for a time as a stateful spec is.
//
// AND A drinkAsText FLAG (Elixir Use Normalisation, 2026-09-23): the elixir
// does nothing this system tracks, and the ruling is that drinking it still
// posts the card and spends the vial. It takes the same path and lands in the
// no-span, no-stateful branch below, which was already the "drunk, nothing
// tracked" outcome; the flag only stops that branch warning about it.
function statefulElixirNames()
{
  return new Set([...DURATION_ELIXIRS,
                  ...ELIXIRS.filter(e => e.stateful || e.declaredSpan || e.drinkAsText).map(e => e.name)]);
}

/** The roster's declared stateful spec for an Item, by name. Null if none. */
function statefulSpecFor(name)
{
  return ELIXIRS.find(e => e.name === name)?.stateful ?? null;
}

/**
 * How far a berserk frenzy reaches — "melee", "all", or null for none.
 *
 * ONE FLAG, TWO SCOPES, because two items set it and the book gives them
 * different words. The Berserker StimRig: "While active, you take and deal
 * double MELEE damage." Berserker Brew: "They deal and receive double damage",
 * with no melee clause anywhere in the entry. They shared `berserkerActive`
 * from the day both were built and the narrower reading won by default, so the
 * Brew has been under-applying ever since. RULED 2026-09-19 (Matt): "it
 * shouldn't be melee-only."
 *
 * A LEGACY `true` READS AS MELEE. Nothing migrates existing world state — a
 * flag written before this change means what it meant when it was written, and
 * the only actors that could hold one are mid-combat right now. Widening them
 * silently is the change that would actually surprise someone.
 */
function berserkScope(actor)
{
  const v = actor?.getFlag?.("vaarn", "berserkerActive");
  return v === "all" ? "all" : (v ? "melee" : null);
}

/** Does the frenzy bite on THIS attack? */
function berserkApplies(actor, isMelee)
{
  const scope = berserkScope(actor);
  return scope === "all" || (scope === "melee" && isMelee);
}
import { dropItem } from "./dropped-container.js";
import { TOXIN_DIE_OPTIONS, TOXIN_CURED, hasToxinDie, toxSaveTarget, stepDownToxinDie, resolveToxSave, toxinModifiers, toxDieOfFormula } from "./toxin-die.js";
import { needsAttunement, needsAttunementToUse, refusalFor, startAttunement } from "../item/attunement.js";
import { antidoteDieOf, antidoteOutcome, applyAntidote } from "../item/antidote.js";
import { ingestionRefusal } from "../item/ingestion.js";
import { isSuppressed, suppressorsOf } from "../item/suppression.js";
import { resolveSave, SAVE_TARGET } from "../combat/saves.js";
import { hiddenFrom, markUnidentified, appraise, openIdentifySave, trackItemUse } from "../item/identification.js";
import { NO_GIFTS, afflictionByKey } from "./affliction-data.js";
import { stageReached } from "./affliction.js";
import { BLIND, conditionByKey, conditionApplySpec, creatureRuleApplySpec, tagApplies } from "./condition-data.js";
import { ADVANCED_EXOTICA } from "./advanced-exotica-data.js";
import { postApplyCard, startAbilityTick, startEscalatingTick,
         applyEffectToActor, startHold, startBurning, holdSpared, sparedHoldLine } from "../combat/apply-to-target.js";
import { onSaveResolved } from "../combat/save-consequences.js";
import { startActivity, spanToSeconds } from "../time/activity.js";
import { ambusherOutcome, inheritorOutcome, wormWiseOutcome } from "./ancestry-rule-effects.js";
import { toggleLight } from "../item/light-source.js";
import { fleeModifiers, fleeFormula, resolveFleeAttempt } from "../combat/flee.js";
import { suppressesDeath, suppressionMsg } from "../combat/fatality.js";
import { isSpirit, fadeMessage, useAbility as useCreatureAbility } from "./spirit.js";
import { MAX_HP_CAUSE } from "./zero-max-hp.js";
import { saveGatedSpecFor, saveGatedRefusal, applySaveGated } from "../combat/save-gated.js";
import { touchSearch } from "./touch-search.js";
import { declaredSpanOf, spanFieldFrom } from "../time/declared-span.js";
import { grantAbility, grantAbilities, isGrantedAbility, useGrantedAbility } from "./granted-ability.js";
import { isIntrinsic } from "../item/intrinsic.js";
import { generateMonster, GENERATED_FOLDER } from "./monster-generator.js";
import { pickGift, pickMutation, randomGiftData } from "./granted-pick.js";
import { spawnBeside, offerSplit } from "./bestiary-spawn.js";
import { actorValueRollData, readsActorValue } from "../combat/actor-value-damage.js";
import { gmHP, hpHiddenHere } from "./hidden-hp.js";
import { TEMP_HP_FIELD, tempHpOf, soakDamage, soakLine, burstsAt } from "../combat/temp-hp.js";
import { protectorsOf, wouldKill, heldBlowCard, HELD_BLOW_FLAG, protecteeRecord, PROTECTING_FLAG } from "../combat/protector.js";
import { growthRefusal, partItemData, fruitItemData, isGrownFruit, eatFruit } from "./bloomboon-growth.js";
import { graftHostOf, splitForHost } from "./grafted-arm.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class KnaveActorSheet extends ActorSheet
{

  #_hitTargets = new Set();
  #_criticalWeapons = new Set();

  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      classes: ["knave", "sheet", "actor"],
      template: "systems/vaarn/templates/actor/actor-sheet.html",
      width: 1100,
      height: 760,
      tabs: [{ navSelector: ".description-tabs", contentSelector: ".description-tabs-content", initial: "stats" }]
    });
  }

  /**
   * A cross-actor drag MOVES the Item, or is refused when the user does not
   * own the source — item-transfer.js handleItemDrop, RULED 2026-09-19. Every
   * other drop (sidebar, compendium, a re-sort) goes to core unchanged.
   * @override
   */
  async _onDropItem(event, data)
  {
    const handled = await handleItemDrop(this.actor, data);
    return handled === undefined ? super._onDropItem(event, data) : handled;
  }

  /* -------------------------------------------- */

  /** @override */

  getData()
  {
    let sheet = super.getData();

    // Work-queue item 11 (2026-08-25): gates the derived hands readout and
    // the now-derived (read-only) AV display, both character-only — npc
    // actors don't populate system.hands and keep a flat, manually-edited
    // armor.value.
    sheet.isCharacterSheet = this.actor.type === "character";

    // Which creature-type checkboxes are showing a grant rather than a stored
    // value (2026-09-20), keyed by type, each holding the tooltip that names
    // what granted it. Set for every actor type this class serves, same
    // reasoning as the cargo list below — KnaveNpcSheet does not override
    // getData, and npc-sheet.html renders the same seven checkboxes.
    //
    // An empty object is the normal case and renders every box editable.
    sheet.grantedCreatureTypes = grantedCreatureTypeSources(this.actor);

    // Container Slot Capacity (2026-09-20). A character's own gear and the
    // contents of a cargo compartment live on the SAME Actor, so the sheet
    // gets two lists rather than one. Set for every actor type this class
    // serves, not just characters: KnaveNpcSheet extends it without overriding
    // getData, and an undefined list would render as an empty inventory
    // rather than as an error.
    //
    // `cargo` is null unless there is something to show, which is what hides
    // the whole section for a character who has never been hollowed out. It
    // stays non-null once emptied by hand, because a compartment with a
    // capacity is still a compartment.
    const stowed = this.actor.items.filter(isCargo);
    const compartment = this.actor.system.cargo ?? {};
    const capacity = Number(compartment.capacity) || 0;
    sheet.carriedItems = this.actor.items.filter(i => !isCargo(i));
    sheet.cargoItems = stowed;
    sheet.cargo = (capacity > 0 || stowed.length)
      ? { capacity, used: Number(compartment.used) || 0, over: !!compartment.over }
      : null;

    // Item Control Visibility: the Delete control renders for the GM only, on
    // every Item and both sheets. A player cannot recreate what they destroy —
    // no grant path exists for most of these Items — so the mis-click is
    // unrecoverable without a GM rebuilding it by hand.
    sheet.isGM = game.user.isGM;

    // Morale is an NPC rule in Vaarn — PCs never make a Morale Save — but
    // `morale` lives on the shared `base` template, so characters inherit the
    // field. actor-sheet.html simply doesn't render it; npc-sheet.html does,
    // and needs the mode vocabulary for its dropdown.
    sheet.moraleModes = MORALE_MODES;

    // Companion Ownership (2026-09-13). NPC sheets only — a character is
    // never somebody else's companion, and the template gates on this
    // rather than on the flag, so an UNOWNED creature still shows the
    // control and can be given an owner. Gating on the owner would have
    // made the feature unreachable for every creature that needs it.
    if(this.actor.type === "npc")
    {
      // Encounter Composition from ENC (2026-09-27): the Roll Encounter
      // control is drawn only for a creature that has an encounter to roll -
      // not for a summoned-only "-", a blank ENC, or a named one with no data.
      sheet.encounterRollable = !!encounterSpecFor(this.actor.name, this.actor.system.enc);
      const owner = ownerOf(this.actor);
      sheet.companionOwnerName = owner ? owner.name : null;
      // A flag naming an Actor that no longer exists. ownerOf collapses
      // this to null deliberately, so the sheet is the one place the
      // difference is worth showing — otherwise a deleted owner and a
      // never-set one look identical and the GM cannot tell which happened.
      sheet.companionOwnerDangling = ownerIsDangling(this.actor);
      // Companion kind (2026-09-19), shown beside the owner so the Referee
      // can see what the rules will treat this creature as.
      sheet.companionKindLabel = COMPANION_KINDS[companionKindOf(this.actor)] ?? null;
      // Companion Advancement (2026-09-13). Gated on having an owner: both
      // chapters put the XP in a PC's hands, so a creature nobody owns has
      // nobody to trade with.
      sheet.companionLevelUpAvailable = companionLevelUpAvailable(this.actor);
      // A pet or a Follower can take a Level (Matt, 2026-09-19); a Mercenary
      // and a Steed cannot, by rule. For those the button is not drawn at all
      // rather than drawn disabled with a rule that will never apply in its
      // tooltip.
      sheet.companionCanLevel = companionCanLevel(this.actor);
      // The grants differ, so the tooltip does too — the three-way choice is
      // the Pets chapter's alone.
      sheet.companionIsPet = companionKindOf(this.actor) === "pet";
    }

    // Ancestry (Description tab since 2026-09-02, when the Traits tab was
    // deleted): read-only display of the ancestry chosen at
    // chargen, plus its special rules text pulled straight from
    // chargen-data.js's SPARK_TABLES/ANCESTRY_NOTES rather than duplicated
    // here. Actors created before this field existed have no ancestry set,
    // so all of this stays undefined/empty and the template shows a
    // placeholder instead of erroring.
    const ancestry = sheet.data?.system?.ancestry;
    sheet.ancestryName = ancestry || null;
    // A rule that has become a clickable `ancestry` Item is shown THERE and
    // not here: one rule, one place. Gated on the Items the actor actually
    // HOLDS rather than on ANCESTRY_RULE_ITEMS, for exactly the reason
    // hasSporeRule below is — an actor without those Items (created before
    // they existed, or handed an ancestry by hand) must still see the rule
    // somewhere, and this roster copy is the only place left. Filtering on
    // the definitions instead would silently lose the rule for those actors.
    const heldAncestryRules = new Set(this.actor.items
      .filter(i => i.type === "ancestry" && i.system?.rule)
      .map(i => i.system.rule));
    sheet.ancestrySpecialRules = ancestry
      ? (SPARK_TABLES[ancestry]?.special_rules || [])
          // special_rules entries are "Name: text" strings, so the rule is
          // matched on the part before the colon — the same split the
          // biography seeding used before it was removed.
          .filter(r => !heldAncestryRules.has(r.split(":")[0].trim()))
      : [];
    sheet.ancestryNote = ancestry ? (ANCESTRY_NOTES[ancestry] || null) : null;

    // The spore-lockout checkbox is Mycomorph-only, so it is gated on the
    // actor actually holding the Spores rule item rather than on ancestry:
    // an actor can be handed the item without chargen having set the
    // ancestry field (anything created before that field existed), and the
    // checkbox should follow the rule, not the label.
    sheet.hasSporeRule = this.actor.items.some(i =>
      i.type === "ancestry" && i.system.rule === "Spores");

    // Hidden Hit Points (Analgesia): a player sees "?" in both HP boxes.
    sheet.hpHidden = hpHiddenHere(this.actor);

    // Work-queue item 12: character-only, same as the hands/AV readouts
    // above — actor-sheet.html is never used for npc actors, but this
    // sheet class is shared (KnaveNpcSheet extends it without overriding
    // getData()), so guard explicitly rather than relying on that.
    if(sheet.isCharacterSheet)
    {
      sheet.forgettableEffects = this._buildForgettableEffects(this.actor);
      sheet.forgettableEffectsCount = sheet.forgettableEffects.alwaysActive.count
        + sheet.forgettableEffects.onDemand.count;

      // Advancement Automation: the LEVEL UP button is live only once the XP
      // tally has reached the current Level, which is the book's own trigger
      // ("When a PC's XP tally equals their current Level"). LEVEL itself is
      // read-only on the sheet — the button is the only thing that moves it up
      // and a level loss is the only thing that moves it down, so the ledger
      // can never be out of step with the number it explains.
      sheet.levelUpAvailable = levelUpAvailable(this.actor);

      // Faction Reputation. Every faction the world offers, each with this
      // characters standing in it - not just the ones a number is stored
      // against, because a faction you have never dealt with is Neutral and
      // worth seeing. Character-only for the same reason as the block above:
      // REP is a PC thing in the book, and KnaveNpcSheet shares this class.
      sheet.reputation = reputationRows(this.actor);
      sheet.reputationSpendExamples = SPEND_EXAMPLES;
      // The nav badge counts factions you actually have standing with, the way
      // Wounds and Forgettable count theirs. Neutral is the resting state of
      // every faction in the world, so counting all of them would print 8 on a
      // character who has never met anyone.
      sheet.reputationStandingCount = sheet.reputation.filter(r => r.rep !== 0).length;

      // Structured Spark Descriptors. Read tolerantly: this is stored data,
      // and a sheet that will not render is a far worse failure than a lost
      // descriptor. A character created before the field existed simply has
      // none, which is correct - nothing backfills, and their rolled columns
      // are still in the biography prose where chargen used to put them.
      sheet.spark = (Array.isArray(this.actor.system.spark) ? this.actor.system.spark : [])
        .filter(r => r && typeof r === "object" && String(r.label ?? "").trim() && String(r.value ?? "").trim())
        .map(r => ({ label: String(r.label).trim(), value: String(r.value).trim() }));
    }

    // Deliberately OUTSIDE the character-only guard: both sheets render the
    // Toxin Die row. KnaveNpcSheet extends this class without overriding
    // getData(), so this one line is what gives creatures their context.
    sheet.toxin = this._buildToxinContext(this.actor);

    // Deprived State — EVERY actor type, like the Toxin Die row above.
    //
    // It shipped character-only on 2026-09-11 and that was wrong, found the same
    // day by Group 124 spawning a real Desiccator: a creature can already HOLD
    // the condition and everything downstream honours it, so the only thing the
    // guard achieved was denying the Referee a way to set it. The book asks for
    // it plainly — Doom Song makes "all creatures" Deprived and Amaranthine
    // Venom afflicts "creatures".
    //
    // RULED 2026-09-11 (Matt): creature sheets too, "and future pet and steed
    // sheets - it doesn't take much real estate and could come in handy". So it
    // is deliberately NOT typed-gated at all rather than being widened to
    // character-plus-npc: a pet or steed sheet arriving later inherits this by
    // default instead of needing to remember to opt in.
    sheet.deprived = this._buildDeprivedContext(this.actor);

    // Rest and Recovery. Character-only, and gated on the ancestry being set —
    // see rest-row.html for both reasons.
    sheet.rest = this._buildRestContext(this.actor);

    return sheet;
  }

  /**
   * Rest row (Core Rules/Healing.md).
   *
   * The supplies readout is the whole reason this is a context builder rather
   * than two bare buttons: a Long Rest is refused for want of water or a meal,
   * and a player who cannot see what is in the pack reads that refusal as a
   * broken button. For Lithlings and Synths it names their rule instead, since
   * neither carries rations at all and an empty count would be the wrong
   * explanation.
   */
  _buildRestContext(actor)
  {
    if(actor.type !== "character" || !actor.system.ancestry)
      return { show: false };

    const rule = rationFreeRule(actor);
    if(rule)
      return {
        show: true,
        supplies: rule,
        shortTitle: `Regains no HP from a Short Rest (${rule}).`,
        longTitle: `Regains no HP from a Long Rest (${rule}), but may still `
                 + `heal a Wound or restore ability damage.`
      };

    // Raw Meat and Fresh Blood count as food and water (RATION_GROUPS).
    const water = supplyTotal(actor, WATER_RATION);
    const food  = supplyTotal(actor, FOOD_RATION);

    return {
      show: true,
      supplies: `${water} water / ${food} food`,
      shortTitle: "A quick sit-down with a ration of water or food. "
                + "Replenishes d8 + CON bonus HP.",
      longTitle: "A ration of water and a meal, then a full night's sleep "
               + "somewhere safe. Replenishes all lost HP; at full HP, heals "
               + "one Wound or restores damaged ability bonuses by one point."
    };
  }

  /**
   * Deprived State row (Core Rules/Deprivation.md).
   *
   * `show` is false for a non-Deprived player, so the row is absent rather than
   * reading "Not Deprived" on every sheet forever. A Referee always sees it,
   * because they need somewhere to switch it ON.
   *
   * The label carries the elapsed span when there is one. That is the whole
   * reason this is not a checkbox: a character dies after three days Deprived by
   * thirst (three weeks for a Faa Nomad), so how long it has been running is the
   * mechanically interesting part, and the board has only ever shown remaining.
   */
  _buildDeprivedContext(actor)
  {
    const on = isDeprived(actor);
    const elapsed = on ? deprivedElapsedLabel(actor) : null;
    return {
      show: on || game.user.isGM,
      on,
      label: on ? (elapsed ? `Deprived — ${elapsed}` : "Deprived") : "Not Deprived",
      title: on
        ? "Cannot heal lost HP or otherwise benefit from Rests. The book states "
          + "no rule for removing this, so it is switched off by the Referee."
        : "Not Deprived. Click to mark this character Deprived — they will then "
          + "heal no lost HP until it is switched off."
    };
  }

  /**
   * Switch Deprived on or off. GM-only here as well as in the template — both,
   * for the reason effect-board-app.js gives about its own step buttons: a
   * control the template hides but the handler still answers is a permission
   * bug waiting for someone with a console.
   *
   * It announces both directions. Switching it ON is the moment a character's
   * healing stops working, and switching it OFF is a ruling the book does not
   * cover, so neither should happen silently on a sheet nobody is looking at.
   */
  async _onDeprivedToggle(event)
  {
    event.preventDefault();
    if(!game.user.isGM)
      return ui.notifications.warn("Only the Referee can set the Deprived condition.");

    const actor = this.actor;
    const turningOn = !isDeprived(actor);
    // READ THE SPAN BEFORE WRITING. Switching off deletes the entry the span is
    // derived from, so asking afterwards returns null and the card loses the one
    // number worth reporting — "no longer Deprived" is far less use than "no
    // longer Deprived after 2 days".
    const elapsed = turningOn ? null : deprivedElapsedLabel(actor);
    await setDeprived(actor, turningOn);
    this._postWoundMsg(actor, turningOn
      ? `is now <b>Deprived</b> — cannot heal lost HP or otherwise benefit from `
        // The row's own fuse sentence, so the card and the board cannot disagree
        // (2026-09-23: this line said "three days" for a Faa Nomad too).
        + `Rests. ${deprivedFuseLine(actor).replace(/^i/, "I")}.`
      : `is no longer <b>Deprived</b>${elapsed ? ` after ${elapsed}` : ""}.`);
  }

  /**
   * Toxin Die row (Core Rules/Toxins.md). Built for BOTH sheets — unlike
   * MORALE, which is NPC-only. The TOX notation reads "Biological creatures
   * hit must make a CON save vs a Toxin Die", so a poisoned monster is as
   * real as a poisoned PC, and the field was already on the shared `base`
   * template. Corrected 2026-09-07 (Matt) after shipping it character-only.
   *
   * The resolver needs no creature-specific branch: `creatureTypes.synthetic`
   * is exactly how the Bestiary's Synthetic immunity arrives, and the PC-only
   * sources (Extra Liver, Cyberliver, an equipped Hazard Wrap, a Mycomorph
   * ancestry) simply never match on a creature.
   *
   * All the rule logic is in toxin-die.js so it can be exercised without
   * Foundry (tools/test-toxin-die.mjs); this only shapes it for Handlebars.
   * Actors created before the field existed have no `toxinDie` at all, which
   * reads as Cured — the one case where a missing schema default is harmless,
   * because "unset" and "no toxin" mean the same thing.
   */
  _buildToxinContext(actor)
  {
    const die = actor.system?.toxinDie?.die ?? TOXIN_CURED;
    const mods = toxinModifiers(actor);
    const has = hasToxinDie(die);

    return {
      immune: mods.immune,
      advantage: mods.advantage,
      // Named rather than merely flagged, per Matt: an immune character's row
      // is disabled WITH ITS REASON so the player is reminded they have the
      // ability, instead of the row silently vanishing.
      sourceLabel: mods.sources.join(", "),
      has,
      target: toxSaveTarget(die),
      // Built here rather than in the template so the no-die case can say
      // something true. Interpolating the target unconditionally showed
      // "CON save vs 0" on the disabled button, which is a real number the
      // rule never produces — found in live testing 2026-09-07.
      saveTitle: has
        ? `CON save vs ${toxSaveTarget(die)} — must EXCEED it. Pass and the toxin never takes hold. There is no save to shake off a die already held.`
        : "No Toxin Die held. Set the incoming attack's die first — the save is the entry gate, so passing it means the toxin never takes hold.",
      options: TOXIN_DIE_OPTIONS.map(value => ({
        value,
        label: value === TOXIN_CURED ? "none" : value,
        selected: value === die,
      })),
    };
  }

  /**
   * Work-queue item 12's data-population step: matches the actor's owned
   * Items against FORGETTABLE_EFFECTS (mutation/implant/exotica/armor by
   * Item name, weaponTag by an equipped weapon's system.tags), then groups
   * the matches by Section then Polarity for the tab template. Detriments
   * are grouped ahead of benefits within each section — the whole point of
   * this tab, per Matt, is surfacing what a GM/player is likely to forget,
   * and players remember buffs far more reliably than debuffs.
   * "armor" is its own case (not folded into "exotica") because several
   * ADVANCED_EXOTICA entries with an armorType field get created as real
   * type:"armor" Items by item 10.3.2's conversion, not type:"exotica" —
   * confirmed via generate-advanced-exotica.js.
   */
  _buildForgettableEffects(actor)
  {
    // Exotica Identification: an item the viewer may not see contributes no
    // entry, because the entry names it.
    const items = actor.items.filter(i => !hiddenFrom(i));
    const mutationNames = items.filter(i => i.type === "mutation").map(i => i.name);
    const implantNames = items.filter(i => i.type === "implant").map(i => i.name);
    const exoticaNames = items.filter(i => i.type === "exotica").map(i => i.name);
    const armorNames = items.filter(i => i.type === "armor").map(i => i.name);
    const weaponTagNames = items
      .filter(i => i.type === "weaponMelee" || i.type === "weaponRanged")
      .flatMap(i => i.system.tags || []);

    const matches = FORGETTABLE_EFFECTS.filter(entry =>
    {
      switch(entry.itemType)
      {
        case "mutation": return mutationNames.includes(entry.name);
        case "implant": return implantNames.includes(entry.name);
        case "exotica": return exoticaNames.includes(entry.name);
        case "armor": return armorNames.includes(entry.name);
        case "weaponTag": return weaponTagNames.includes(entry.name);
        default: return false;
      }
    });

    const group = (section) =>
    {
      const detriment = matches.filter(e => e.section === section && e.polarity === "Detriment");
      const benefit = matches.filter(e => e.section === section && e.polarity === "Benefit");
      return { detriment, benefit, count: detriment.length + benefit.length };
    };

    return { alwaysActive: group("Always Active"), onDemand: group("On-Demand") };
  }

  /** @override */
  /**
   * Say what a REP change actually did, in chat, when it did more than one
   * thing.
   *
   * A propagated loss is the whole point of the mechanic and it is invisible:
   * the player presses + on one faction and four other numbers move on a tab
   * they are not looking at. A silent write would be correct and unnoticeable,
   * which is the same failure mode as an unsurfaced creature rule.
   *
   * Nothing is posted for a change that moved one faction only - that one IS
   * visible, since they are looking at the row they just pressed.
   */
  _reportRepChange(plan)
  {
    const moved = plan.changes.filter(c => c.from !== c.to);
    if (moved.length < 2) return;
    const target = moved.find(c => !c.propagated);
    const rest = moved.filter(c => c.propagated);
    const lines = rest.map(c => `<li>${c.faction}: ${c.from} &rarr; ${c.to}</li>`).join("");
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${this.actor.name}</b> gains ${plan.applied} REP with <b>${target.faction}</b>`
             + ` (${target.from} &rarr; ${target.to}).<br/>Opposed factions lose the same:<ul>${lines}</ul>`
    });
  }

  activateListeners(html)
  {
    super.activateListeners(html);

    // Exotica Identification: record which item a click was about, so a card
    // naming a name two copies share can be attributed (scrubsForm, rule 1).
    // Inherited by the npc and vehicle sheets.
    trackItemUse(html[0], this.actor);

    // Encounter Composition from ENC (RULED 2026-09-27). Bound ABOVE the
    // editable gate on purpose: creatures live in the Bestiary compendium,
    // whose sheets open read-only, and that is where the GM rolls from. It
    // writes nothing to this actor - it clones out of the pack.
    html.find('.vaarn-roll-encounter').click(async ev =>
    {
      ev.preventDefault();
      if(!game.user.isGM) return ui.notifications.warn("Only the Referee can roll an encounter.");
      const lines = await rollEncounter(this.actor);
      if(!lines) ui.notifications.warn(`${this.actor.name} has no encounter to roll.`);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Faction Reputation. Both routes go through the same setRep/changeRep so
    // typing a value propagates exactly as pressing a control does - two paths
    // that disagree would leave only one of them tested.
    html.find('.vaarn-rep-step').click(async ev =>
    {
      ev.preventDefault();
      const el = ev.currentTarget;
      const plan = await changeRep(this.actor, el.dataset.faction, Number(el.dataset.delta));
      this._reportRepChange(plan);
    });

    // change, not keyup: a partly-typed "-" is not a number yet, and firing on
    // every keystroke would propagate a gain the moment a minus sign was still
    // being typed.
    html.find('.vaarn-rep-value').change(async ev =>
    {
      const el = ev.currentTarget;
      const plan = await setRep(this.actor, el.dataset.faction, el.value);
      this._reportRepChange(plan);
    });

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    //ability button clicked
    html.find('.knave-ability-button').click(ev =>
    {
      const ability = $(ev.currentTarget)[0].id;
      // Encumbrance Penalty (2026-09-07): DIS on STR/DEX/CON SAVES. It is
      // applied HERE, at the button click, and deliberately not inside
      // _onAbility_Clicked — that method is also how weapon attack rolls are
      // made, and an Encumbered character's attacks are not penalised by any
      // rule in the book. Same shared-method trap as item 3.8's retaliation
      // bug, where _checkToHitTargets fired for ranged attacks too, and the
      // same line item 14 already draws two lines below.
      const encDis = this._encumbranceDis(this.actor, ability);
      // Stateful Effect Application (2026-09-09) joins the same boolean rather
      // than adding a second one: two sources of DIS are still DIS.
      const statDis = this._statefulSaveDis(this.actor, ability);
      const roll = this._onAbility_Clicked(ability, ev, encDis || statDis);
      // Item 14: Save-button notes only apply to a direct button click, not
      // to _onAbility_Clicked's internal reuse for weapon attack rolls
      // (STR/DEX) — those are attack rolls, not Saves.
      // Failed-Save Consequence (2026-09-13). The roll is already in hand, so
      // this is the cheapest of the three sites; resolveSave decides, and
      // onSaveResolved is a no-op for any actor carrying nothing.
      const verdict = resolveSave(roll.total, roll.dice[0]?.total, SAVE_TARGET);
      onSaveResolved(this.actor, ability, verdict);
      const notes = this._saveNotesFor(this.actor, ability);
      if(encDis) notes.push("<b>Encumbered</b> — DIS on STR, DEX and CON saves while carrying more than your item slot limit.");
      if(statDis) notes.push("<b>DIS on physical Saves</b> — from an effect currently running on you.");
      this._postRollNotes(this.actor, notes);
    });
    html.find('.knave-morale-button').click(this._onMoraleCheck.bind(this));
    html.find('.knave-flee-button').click(this._onFlee.bind(this));
    html.find('.knave-tox-save').click(this._onToxSave.bind(this));
    html.find('.knave-tox-roll').click(this._onToxRoll.bind(this));
    html.find('.knave-deprived-toggle').click(this._onDeprivedToggle.bind(this));
    html.find('.vaarn-short-rest').click(this._onShortRest.bind(this));
    html.find('.vaarn-long-rest').click(this._onLongRest.bind(this));
    html.find('.vaarn-level-up').click(() => openLevelUp(this.actor));
    html.find('.vaarn-companion-level-up').click(() => applyCompanionLevelUp(this.actor));
    // Referee-Invoked Level Loss. ONE listener for both sheets: openLevelLoss
    // routes on the actor, so a character and a companion reach their own
    // ledger from the same control.
    html.find('.vaarn-level-loss').click(() => openLevelLoss(this.actor));
    html.find('.vaarn-xp-step').click(ev => this._onXpStep(Number(ev.currentTarget.dataset.step)));

    // View Inventory Item. There is no separate Edit control: .item-edit had a
    // byte-identical handler to this one and the item name's own h4 already
    // carries .item-view, so the pencil did exactly what clicking the name does.
    html.find('.item-view').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item — wound Items never render this control (see
    // actor-sheet.html), so healing only ever happens from the Wounds tab,
    // which is the one place that also shows 0-slot wounds.
    html.find('.item-delete').click(ev => {
      const button = ev.currentTarget;
      const li = button.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      return item.delete();
    });

    // Give an Item to another actor — foundry-system-index.csv "Item
    // Transfer Between Actors". GM-only, gated in the template alongside
    // Delete; the dialog re-checks isTransferable rather than trusting it.
    html.find('.companion-owner').click(() => openOwnerDialog(this.actor));

    html.find('.item-transfer').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      openTransferDialog(item);
    });

    // Exotica Identification — the Referee's three controls. GM-only in the
    // template, and re-checked here rather than trusted.
    const itemOfRow = ev => this.actor.items.get(ev.currentTarget.closest(".item")?.dataset.itemId);
    html.find('.item-unidentify').click(ev => { if(game.user.isGM) markUnidentified(itemOfRow(ev)); });
    html.find('.item-identify').click(ev => { if(game.user.isGM) appraise(itemOfRow(ev)); });
    html.find('.item-identify-save').click(ev => { if(game.user.isGM) openIdentifySave(itemOfRow(ev)); });

    // Per-Round Effect Reminder / Round-Duration Expiry —
    // foundry-system-index.csv. Toggling OFF is unconditional and silent;
    // toggling ON asks for the two things activation needs, which Matt ruled
    // is one number plus a free-text target note. No mode selector: Kinetic
    // Ward's "[INT] rounds for one entity, or [INT] entities for one round"
    // is the same counter with a different number typed into it.
    html.find('.item-round-remind').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      if(!item) return;
      if(isRoundEffectActive(item)) return deactivateRoundEffect(item);
      return this._promptRoundEffect(item);
    });
    // Put an Item on the ground — foundry-system-index.csv "Dropped Item
    // Container". NOT gated on isGM, unlike Delete and Give: this is the
    // control a player uses to shed gear, which is what Item Control
    // Visibility left them without. dropItem re-checks isDroppable rather
    // than trusting the template.
    // Shed a grown part - Bloomboon Growth, RULED 2026-09-24 (Matt): usable
    // any time, by the player as well as the GM, like Drop. Deleting the part
    // IS the shed; bloomboon-growth.js's deleteItem hook turns its cost into
    // ability damage, so the GM's Delete pays it too.
    html.find('.item-shed').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      if(!item) return;
      return Dialog.confirm({
        title: `Shed ${item.name}`,
        content: `<p>Shed the <b>${item.name}</b>? Its cost returns to your base as ordinary ability damage.</p>`,
        yes: () => item.delete()
      });
    });

    // Remove a graft - Grafted Limb Creation, RULED 2026-09-24 (Matt): the
    // player may remove it, and that ends the graft. graft.js's deleteItem
    // hook stops the daily CON loss.
    html.find('.item-graft-remove').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      if(!item) return;
      return Dialog.confirm({
        title: `Remove ${item.name}`,
        content: `<p>Remove the <b>${item.name}</b>? The graft ends, and so does its daily CON loss.</p>`,
        yes: () => item.delete()
      });
    });

    html.find('.item-drop').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      return dropItem(item);
    });

    // Stow and retrieve — Container Slot Capacity, 2026-09-20. NOT gated on
    // isGM, for the same reason Drop above is not: putting something in the
    // hold is a player's own housekeeping.
    //
    // ONE FLAG, BOTH WAYS. Nothing is validated against the capacity here
    // because nothing is meant to be: over capacity is shown and never
    // refused (Matt, 2026-09-20), so a stow that overfills the compartment
    // succeeds and colours the figure.
    html.find('.item-stow').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      return item?.setFlag("vaarn", CARGO_FLAG, true);
    });
    html.find('.item-unstow').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      return item?.unsetFlag("vaarn", CARGO_FLAG);
    });

    // Heal (remove) a Wound from the Wounds tab
    // Wound-Table Resolution: the Referee-chosen wound. GM-only in the handler
    // as well as the template, the board's own rule for a hidden control.
    html.find('.wound-inflict').click(() => {
      if(!game.user.isGM) return;
      return this._promptInflictWound();
    });

    html.find('.wound-delete').click(ev => {
      const index = Number(ev.currentTarget.closest("[data-wound-index]").dataset.woundIndex);
      return this._healWound(this.actor, index);
    });

    // A WOUND WITH A TALLY - the Spambot's Spam Ad, five sale pitches
    // (Encumbrance Penalty wiring, RULED 2026-09-25 by Matt). The holder clicks
    // it up, on the honour system; at the count the wound is healed.
    html.find('.wound-tally').click(async ev => {
      const index = Number(ev.currentTarget.closest("[data-wound-index]").dataset.woundIndex);
      const wounds = duplicate(this.actor.system.wounds ?? []);
      const w = wounds[index];
      if(!w?.tally) return;
      const done = (Number(w.tally.done) || 0) + 1;
      if(done >= Number(w.tally.count))
      {
        this._postWoundMsg(this.actor, `${w.tally.label} (${done} of ${w.tally.count}) — <b>${w.name}</b> is gone.`);
        return this._healWound(this.actor, index);
      }
      w.tally = { ...w.tally, done };
      await this.actor.update({ "system.wounds": wounds });
      this._postWoundMsg(this.actor, `${w.tally.label} for <b>${w.name}</b> (${done} of ${w.tally.count}).`);
    });

    //inventory weapon rolls
    html.find('.item-roll').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "attack with")) return;
      this._onItemRoll(item, ev.currentTarget, ev);
    });

    // Use a Mystic Gift
    html.find('.gift-use').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onGiftUse(item);
    });

    // Usable Creature Ability (Spirit Form, 2026-09-27): an Item that spends
    // or restores its bearer's HP when used - the spirit's three abilities.
    html.find('.usable-use').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      useCreatureAbility(this.actor, item);
    });

    // Read a Hypergeometric Codex
    html.find('.codex-read').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onCodexRead(item, ev);
    });

    // Use an ancestry special rule (Spores, Twice Born, Photosynthesis,
    // Bloomboons) — foundry-system-index.csv "Ancestry Rule as Rollable
    // Item". Same shape as the two bindings above it.
    html.find('.ancestry-use').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onAncestryRuleUse(item, ev);
    });

    // Use a per-use Usage Die item (gear/Exotica/Armor) — rolls its usage
    // die immediately, unlike ranged weapon ammo which resolves once per
    // combat.
    html.find('.usage-die-roll').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      // A use that only means something in a fight - the Fate Invertor
      // (RULED 2026-09-26, Matt), and AV until combat ends, the Active
      // Camouflage Ring (Matt, 2026-09-28) - is refused before its die rolls.
      const combatOnly = ADVANCED_EXOTICA.find(e => e.name === item?.name && e.untilCombatEnd);
      const combatAv = ADVANCED_EXOTICA.find(e => e.name === item?.name && e.combatAv);
      if((combatOnly || combatAv) && !game.combat)
        return this._postWoundMsg(this.actor, `cannot use the <b>${item.name}</b> - it only works in combat, and no combat is running.`);
      const result = await rollUsageDie(item, this.actor);
      if(combatOnly)
      {
        await addEntry(this.actor, { name: combatOnly.untilCombatEnd.name, text: combatOnly.untilCombatEnd.text,
          note: `from the ${item.name}`, endsWithCombat: true });
        this._postWoundMsg(this.actor, `activates the <b>${item.name}</b> — until combat ends, all nearby failed Saves `
          + `succeed and successes fail, missed attacks hit and hits miss. <i>Flip each result by hand.</i>`);
      }
      // Post the item's own extra flavor text, if it has one — work-queue
      // items 10.3.4/10.3.7 (2026-08-27). Fires on every use regardless of
      // type, including the depleting one.
      this._postUsageDieFlavorText(item);
      await this._activateCombatAv(item);
      await this._applyBodyChange(item);
      // Exotica items never recharge (Matt's ruling, item 10.3.3) — once
      // expended they're a used-up consumable, not a tool to keep around
      // empty like a depleted weapon. Armor's own Ud8-limited activated
      // abilities (item 10.3.4 — Fascinator Helm/Horror Helm) are
      // deliberately excluded from this: Matt's ruling is that an
      // expended armor usageDie just sits inert, tracking the activated
      // ability's use only, same default behavior gear/weapons already
      // get — not deleted or marked broken. Gear/other usageDie item
      // types are likewise unaffected — this only fires for `type:
      // "exotica"`.
      if(item.type === "exotica" && result?.newDie === "expended")
        this._deleteUsedUpExotica(item);
    });

    // Use a fixed-charge Exotica item ("x6 uses" etc., not a UdN die) —
    // work-queue item 10.3.3. Decrements by exactly 1 per use (Matt's
    // call — a flat countable resource, not a randomly-depleting die).
    // Reload a weapon that names its reload - the Tempest Cannon's 3 Water
    // Rations (RULED 2026-09-26, Matt) - without having to attack with it.
    html.find('.weapon-reload').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(item) this._offerReload(item);
    });

    html.find('.exotica-charge-use').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      this._onExoticaChargeUse(item);
    });

    // Use a no-pool "Unlimited" Exotica item with a real activated effect
    // (e.g. The Crimson Cantos) — work-queue item 10.3.4 (2026-08-27).
    // Same "use icon, no pool" shape as mutation-use/implant-use.
    html.find('.exotica-use').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      this._onExoticaUse(item);
    });

    // Install a sealed Cocoon/Pack capsule's specific implant — work-queue
    // item 10.3.5 (2026-08-27). See _onSealedImplantInstall.
    html.find('.sealed-implant-install').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onSealedImplantInstall(item);
    });

    // Use a mutation with an active effect (e.g. Ink Ducts' ink spray) —
    // work-queue item 3.6. Descriptive-only chat text, same philosophy as
    // item 14's roll-notes: no automated save is triggered, GM/player
    // adjudicates by hand.
    html.find('.mutation-use').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onMutationUse(item, ev);
    });

    // Save-Gated Effect. ONE listener for every entry that declares a
    // `saveGated` spec, whichever roster it lives in — nothing here names an
    // item, which is exactly the difference from the name-keyed dispatchers
    // either side of it.
    html.find('.save-gated-use').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onSaveGatedUse(item, ev);
    });

    // Autarch Figment Grant (2026-09-14). Compels a TARGET to save, which is
    // the opposite direction from .save-gated-use above it — see the
    // hasFigmentTargetSave helper for why the two are not the same control.
    html.find('.figment-target-save').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onFigmentTargetSave(item);
    });

    // Refresh a mutation's daily use pool back to the bearer's Level.
    // "Once per day" timing is deliberately GM/player-adjudicated, not
    // code-enforced (Matt's ruling) — this button just does the arithmetic
    // when they decide it's warranted.
    html.find('.mutation-refresh').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onMutationRefresh(item);
    });

    // Equip/unequip a weapon or armor/helm/shield — work-queue item 11.
    html.find('.item-equip').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "equip")) return;
      this._onItemEquip(item);
    });

    // Activity Time Cost — begin an effort a rule declares.
    // Token Light from an Item - switch the declared light on or off on the
    // actor's tokens on the viewed scene. Not GM-gated: it is the player's
    // own torch, and a token owner may change its light.
    html.find('.item-light-toggle').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(!item) return;
      const done = await toggleLight(item);
      if(!done?.changed)
        return ui.notifications.info(`${this.actor.name} has no token on this scene to light.`);
      this.render(false);
    });

    html.find('.item-activity-start').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(item) return this._startDeclaredActivity(item);
    });

    // Compel-a-Target Save. Shown only where the Item DECLARES a save, the
    // same rule the activity control above follows. Descriptive by design:
    // the card names the save and the target's controller rolls it, exactly
    // as the Exotica route has done since item 10.3.4.
    html.find('.item-save-compel').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._postCompelledSave(item);
    });

    // The Thin Mare's Internal Storage (Container Slot Capacity, RULED
    // 2026-09-25 by Matt): a d100 against the item's slot number, announced.
    // Nothing moves - the player drags out what came out.
    html.find('.item-touch-search').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) await touchSearch(this.actor, item);
    });

    // Heal the targeted tokens by hand - the Biotic Field's Healing Cloud
    // (2026-09-22). GM-only; healTargets refuses anyone else too.
    html.find('.item-target-heal').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) healTargets(this.actor, item);
    });

    // Cut the targeted tokens' maximum HP - the Entropy Wight's touch (Direct
    // HP Adjustment, 2026-09-23). GM-only: the Referee targets whoever it
    // struck and clicks.
    html.find('.item-maxhp-loss').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._cutTargetsMaxHP(item);
    });

    // Look Out Sire (Lethal Blow Redirection, RULED 2026-09-26 by Matt): guard
    // the one targeted token, or stop guarding with nothing targeted.
    html.find('.item-protect').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._setProtectee(item);
    });

    // Add temporary HP to the targeted tokens - the Zenithlight Negatick's
    // Infusion (Temporary HP, 2026-09-26). GM-only, clicked each round the
    // grab holds; the round reminder is what prompts it.
    html.find('.item-temp-hp').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._addTempHpToTargets(item);
    });

    // Start an auto-hit per-round loss - Occulith's gaze, the Obelisk, the
    // Exemplar (Ability Damage pass 3, 2026-09-22) - on every targeted token.
    // Auto-hit, so no roll: the use IS the landing (Matt's to-hit rule).
    html.find('.item-ability-tick').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(!item) return;
      const targets = Array.from(game.user?.targets ?? []);
      if(!targets.length)
        return this._postWoundMsg(this.actor, `<b>${item.name}</b>: no target is selected, so nothing was started.`);
      this._startAbilityTicks(abilityTickSpecsOf(item), targets);
      this._startEscalatingTicks(escalatingSpecsOf(item), targets);
    });

    // Creature-Driven Level Drain. GM-ONLY, unlike the compel control beside
    // it: that one only posts text and leaves the roll to the target's
    // controller, whereas this WRITES to another player's character sheet.
    // Rolled Creature Stat. GM-ONLY: it rewrites the creature's own Level, HP,
    // AV or Morale, which is the Referee putting a creature on the table.
    html.find('.item-rolled-stat').click(async ev =>
    {
      if(!game.user.isGM)
        return ui.notifications.warn("Only the Referee can roll a creature's stats.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._doRolledStat(item);
    });

    // Creature AV State Control — set the creature's AV to a declared state.
    // An aura's ability loss (the Thermasaur's Cold Aura, RULED 2026-09-24).
    html.find('.item-aura-damage').click(async ev =>
    {
      if(!game.user.isGM)
        return ui.notifications.warn("Only the Referee can use a creature's ability.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._rollAuraAbilityDamage(item);
    });

    // An ENCOUNTER EFFECT (the Doomsinger's Doom Song, RULED 2026-09-24).
    html.find('.item-encounter-effect').click(async ev =>
    {
      if(!game.user.isGM)
        return ui.notifications.warn("Only the Referee can use a creature's ability.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._useEncounterEffect(item);
    });

    // Actor Spawning wiring, RULED 2026-09-25 (Matt). A one-off spawn beside
    // this creature - the Hegemony Legionary's distress flare, the Copy Cat's
    // Clone Cough. GM-only: it puts Actors on the table. Not loyal - they are
    // the same side's creatures, not the creature's property.
    html.find('.item-spawn-now').click(async ev =>
    {
      if(!game.user.isGM) return ui.notifications.warn("Only the Referee can spawn creatures.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const spec = item?.flags?.vaarn?.spawnNow;
      if(!spec) return;
      const roll = await new Roll(spec.dice).evaluate({ async: true });
      const spawned = await spawnBeside(this.actor, spec.creature, roll.total, { loyal: false });
      if(!spawned) return ui.notifications.warn(`"${spec.creature}" is not in the Bestiary compendium.`);
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
        content: `<b>${item.name}</b>: ${this.actor.name} brings <b>${roll.total} × ${spec.creature}</b>`
          + (/d/.test(spec.dice) ? ` (${spec.dice})` : "")
          + (spawned.length ? ` — ${spawned.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(", ")}` : "") + `.` });
    });

    // The Banisher's Summon: "Roll on the encounter table for this floor. The
    // summoned creature is not loyal to the Banisher." The floor is asked,
    // since nothing records which depth the party is on; ONE creature is
    // placed, as the book's singular says, and the rolled line is reported.
    html.find('.item-summon-depth').click(async ev =>
    {
      if(!game.user.isGM) return ui.notifications.warn("Only the Referee can summon creatures.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const depth = await Dialog.prompt({
        title: `${item?.name ?? "Summon"} — which floor?`,
        content: `<p>Roll on which depth's encounter list?</p><select name="depth">`
          + Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">Depth ${i + 1}</option>`).join("") + `</select>`,
        callback: html => Number(html.find('select[name="depth"]').val()),
        rejectClose: false
      });
      if(!depth) return;
      const { rollLairCreaturesAtDepth } = await import("./lair-rooms-roller.js");
      const rolled = await rollLairCreaturesAtDepth(depth);
      const found = rolled.names.find(n => n.resolvedName);
      const spawned = found ? await spawnBeside(this.actor, found.resolvedName, 1, { loyal: false }) : null;
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
        content: `<b>${item.name}</b>: Depth ${depth}${rolled.redirects.length ? ` (${rolled.redirects.join("; ")})` : ""} rolled `
          + `<i>${rolled.result ?? "nothing"}</i>. `
          + (spawned?.length ? `Summoned ${spawned.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(", ")} — not loyal to ${this.actor.name}.`
                             : `No Bestiary creature matches that line; nothing was summoned.`) });
    });

    html.find('.item-av-state').click(async ev =>
    {
      if(!game.user.isGM)
        return ui.notifications.warn("Only the Referee can change a creature's AV.");
      const av = Number(ev.currentTarget.dataset.av);
      if(!Number.isFinite(av)) return;
      await this.actor.update({ "system.armor.value": av });
      ui.notifications.info(`${this.actor.name}: ${ev.currentTarget.dataset.label} — AV ${av}.`);
    });

    // Cut an implant out of a creature (Item Creation from Roll Table wiring,
    // RULED 2026-09-25 by Matt). See creature-generate.js.
    html.find('.item-extract-implant').click(async ev =>
    {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) extractImplant(this.actor, item);
    });

    // A declared AV STEP - the Gravity Tyrant's Accretion (Multi-Target wiring,
    // RULED 2026-09-25 by Matt): "Each Accretion adds +1 to the Tyrant's AV".
    // Adds to the AV as it stands, so it composes with nothing else resetting
    // it; a misclick is corrected in the AV field.
    html.find('.item-av-step').click(async ev =>
    {
      if(!game.user.isGM)
        return ui.notifications.warn("Only the Referee can change a creature's AV.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const step = Number(item?.flags?.vaarn?.avStep) || 0;
      if(!step) return;
      const av = (Number(this.actor.system.armor?.value) || 0) + step;
      await this.actor.update({ "system.armor.value": av });
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
        content: `<b>${item.name}</b>: ${this.actor.name}'s AV rises by ${step}, to <b>${av}</b>.` });
    });

    html.find('.item-level-drain').click(async ev =>
    {
      if(!game.user.isGM)
        return ui.notifications.warn("Only the Referee can drain a Level.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if(item) this._doLevelDrain(item);
    });

    // Item Attunement Gate — begin the book's hour of quiet concentration.
    // NOT GM-gated, unlike the direct mark below: starting an effort advances
    // no clock by itself, so a player declaring the intention costs nothing
    // and is exactly what the Referee needs to see before adjudicating.
    html.find('.item-attune').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(!item) return;
      await startAttunement(this.actor, item);
      ui.notifications.info(
        `${this.actor.name} begins attuning ${item.name}. It completes after an hour on the clock.`);
    });

    // Charge Declaration State — the player's half of the toggle. The other
    // half is automatic: _resolveChargeDeclaration clears it on the next melee
    // damage roll, so a charge cannot persist into a later round.
    //
    // Announced in chat because it is a declaration to the table, not a private
    // sheet setting: the Referee has to know a charge was claimed BEFORE the
    // damage lands, or the toggle is just a bigger number appearing later.
    html.find('.charge-toggle').click(async ev =>
    {
      ev.preventDefault();
      const on = !isCharging(this.actor);
      await setCharging(this.actor, on);
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: on
          ? `<b>${this.actor.name}</b> declares a <b>charge</b> — conditional charge bonuses apply to the next melee damage roll.`
          : `<b>${this.actor.name}</b> calls off the charge.`,
      });
      this.render(false);
    });

    // The Corrosive tag's either/or — "deals damage OR reduces target's AV by
    // one (attacker's choice)". Declared before the roll, spent by it, and
    // announced for the same reason the charge is: the table needs to know
    // the swing was aimed at the armour BEFORE the result lands, or it is
    // just damage mysteriously failing to appear.
    html.find('.corrode-toggle').click(async ev =>
    {
      ev.preventDefault();
      const on = !isDegradingArmour(this.actor);
      await setDegradingArmour(this.actor, on);
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: on
          ? `<b>${this.actor.name}</b> aims a <b>corrosive</b> weapon at the armour — the next hit degrades AV by 1 and deals no damage.`
          : `<b>${this.actor.name}</b> goes back to striking for damage.`,
      });
      this.render(false);
    });

    // The Referee's direct route, and the one that answers the DEX save: a
    // toggle rather than a one-way mark, so something attuned in error can be
    // put back.
    html.find('.item-attune-mark').click(async ev =>
    {
      if(!game.user.isGM) return;
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(!item) return;
      // Un-attuning UNEQUIPS in the same update. Without this, an item
      // un-attuned while in hand stays usable, because using is gated on
      // "attuned OR equipped" — the loophole that clause would otherwise
      // open. Attuning does not touch equipped: becoming attuned is no
      // reason to pick something up.
      const nowAttuned = !item.system.attuned;
      const patch = { "system.attuned": nowAttuned };
      if(!nowAttuned) patch["system.equipped"] = false;
      return item.update(patch);
    });

    // Use an implant with an active effect (Trauma-Response Rig, Alluring
    // Fakeface) — work-queue items 10.2/10.6. Same shape as .mutation-use;
    // event is threaded through so a real rolled implant (Alluring
    // Fakeface) can read ADV/DIS modifiers, same as .mutation-use does.
    html.find('.implant-use').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onImplantUse(item, ev);
    });

    // Refresh an implant's daily use pool — work-queue item 10.2. Same
    // shape/philosophy as .mutation-refresh (GM/player-adjudicated timing).
    html.find('.implant-refresh').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onImplantRefresh(item);
    });

    // Use a generic `type: "item"` Item with an active effect (Berserker
    // Brew) — work-queue items 10.8/10.3.8. Same shape as .implant-use.
    html.find('.generic-item-use').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      // Bloomboon Growth: a grown fruit is eaten, or refused once spoiled.
      if(isGrownFruit(item))
      {
        const refused = await eatFruit(this.actor, item);
        if(refused) ui.notifications.warn(refused);
        return;
      }
      // Elixir Ingestion Restriction (2026-09-20). HERE rather than inside
      // _onGenericItemUse because the dispatcher's branches each end by
      // consuming the Item, and the refusal keeps it — one gate ahead of all
      // of them cannot be forgotten by a branch added later. Same position and
      // same shape as the attunement refusal directly above.
      const refusal = ingestionRefusal(this.actor, item);
      if(refusal)
      {
        ui.notifications.warn(refusal);
        return;
      }
      this._onGenericItemUse(item);
    });

    // Spend one unit of a fixed-charge consumable — foundry-system-index.csv
    // "Fixed-Charge Consumable" (2026-09-20). Same shape as the three above;
    // the icon is gated on the item's own `consumable` field, not a list.
    html.find('.consumable-use').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      this._onConsumableUse(item);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event)
  {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;

    // Hard cap per Item Slots.md: "It is impossible to carry more than 20
    // slots full of items" — unlike the soft 10+CON limit (which just causes
    // Encumbered), this one blocks outright. New items always start at the
    // "base" template's default of 1 slot, so a flat +1 check is accurate here.
    if(this.actor.type === "character")
    {
      const slots = this.actor.system.inventorySlots;
      if(slots.used + 1 > slots.max)
      {
        ui.notifications.warn(`${this.actor.name} can't carry any more — item slots are capped at ${slots.max}.`);
        return;
      }
    }

    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    const cls = getDocumentClass("Item");
    return cls.create(itemData, {parent: this.actor});
  }

  /**
   * Which ability a weapon's to-hit roll uses — normally STR (melee) or
   * DEX (ranged), substituted to PSY for the Psionic tag (item 4.4,
   * 2026-08-27: "To-hit rolls made with PSY bonus," melee or ranged
   * alike, since Psionic isn't kind-restricted). Shared by the melee/
   * ranged attack branches above AND Reflecting's chat-card roll-back
   * (item 4.6.2, 2026-08-27), which needs to know the ORIGINAL
   * attacker's own to-hit ability to roll as them.
   */
  _toHitAbilityKey(item)
  {
    if((item.system.tags || []).includes("Psionic")) return "psy";
    return item.type === "weaponRanged" ? "dex" : "str";
  }

  _onAbility_Clicked(ability, event, forceDis = false, forceAdv = false)
  {
    let score = 0;
    let name = "";
    switch(ability)
    {
      case "str": score = this.object.system.abilities.str.effective; name="STR"; break;
      case "dex": score = this.object.system.abilities.dex.effective; name="DEX"; break;
      case "con": score = this.object.system.abilities.con.effective; name="CON"; break;
      case "int": score = this.object.system.abilities.int.effective; name="INT"; break;
      case "psy": score = this.object.system.abilities.psy.effective; name="PSY"; break;
      case "ego": score = this.object.system.abilities.ego.effective; name="EGO"; break;
    }

    return this._rollD20(score, name, event, forceDis, forceAdv);
  }

  /**
   * Vaarn's Morale Save (Combat/Morale.md, confirmed against the CRIMSON
   * HOUND 07-05-26 text): roll d20 and add the creature's Morale bonus (ML).
   * Under 16 the adversary flees, hides or attempts to parley; 16 or over it
   * holds. Replaces the inherited Knave 2d6-under-a-score check, which was
   * the wrong die, the wrong target AND the wrong direction — high was bad.
   *
   * `morale.mode` carries the entries the book states as a RULE rather than
   * a number, which a bare bonus cannot express: 14 Bestiary creatures print
   * "Never Flees", "Always Flees", "= Group Size" or a bare "-" where the
   * stat would go. Transcribing those as 0 made Knight Mordicant, who never
   * flees, one of the likeliest creatures in the book to run away.
   *
   * Only `never`/`always`/`none` are decided here. `none` is the bare "-" and
   * is NOT the same as `never` — the book declines to give the turret and the
   * obelisk a Morale stat at all, and collapsing the two would invent one.
   * Anything the code cannot evaluate is `gm`, which posts the book's own
   * wording and rolls nothing.
   */
  _onMoraleCheck(event)
  {
    event.preventDefault();

    const morale = this.actor.system.morale || {};
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const note = morale.note ? ` <i>(${morale.note})</i>` : "";

    const verdict = (text, cls) => ChatMessage.create({
      speaker,
      content: `<b>Morale Save</b> — <span class="knave-ability-crit ${cls}">${text}</span>${note}`
    });

    switch(morale.mode)
    {
      case "none":   return verdict("No Morale Save applies", "knave-ability-critSuccess");
      case "never":  return verdict("Holds — never flees", "knave-ability-critSuccess");
      case "always": this._postMoraleFailCards(); return verdict("Flees", "knave-ability-critFailure");
      case "gm":     return verdict("Referee's call", "knave-ability-critFailure");
    }

    // A Morale Save is a Save (RULED 2026-09-24, Matt, on Doom Song).
    const moraleDis = saveDisSources(this.actor, "morale");
    const r = new Roll(`${moraleDis.length ? "2d20kl1" : "1d20"}+${morale.value ?? 0}`);
    r.evaluate({async: false});

    const outcome = r.total < MORALE_TARGET
      ? '<span class="knave-ability-crit knave-ability-critFailure">Flees, hides or parleys</span>'
      : '<span class="knave-ability-crit knave-ability-critSuccess">Holds</span>';
    r.toMessage({ speaker, flavor: `<b>Morale Save</b> (vs ${MORALE_TARGET})${moraleDis.length ? ` <span class="knave-adv-dis">(DIS)</span> <i>DIS from ${moraleDis.join(", ")}.</i>` : ""} — ${outcome}${note}` });
    if(r.total < MORALE_TARGET) this._postMoraleFailCards();
    return r;
  }

  /**
   * A rule that fires on a failed Morale Save (the Conscript's Bomb Collar)
   * gets its own card, WHISPERED to the Referee - RULED 2026-09-24 (Matt): the
   * public Morale card must not telegraph the collar. See morale.js.
   */
  _postMoraleFailCards()
  {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    for(const item of moraleFailRules(this.actor))
      ChatMessage.create({ speaker, whisper, content: moraleFailCard(this.actor, item) });
  }

  /**
   * The Toxin Die's ENTRY GATE (Core Rules/Toxins.md). A CON save that must
   * EXCEED 10 + the TD size: pass and the toxin never takes hold, fail and the
   * die stays set for the Roll button to work through each round.
   *
   * This is deliberately NOT a recurring escape. There is no save to shake off
   * a TD already held — curing is alchemy, medgel, locals or amputation. See
   * toxin-die.js's header for the rule and for the design withdrawn on reading
   * it, which is the intuitive one and will be re-proposed otherwise.
   */
  async _onToxSave(event)
  {
    const actor = this.actor;
    const die = actor.system?.toxinDie?.die ?? TOXIN_CURED;
    if(!hasToxinDie(die)) return;

    const mods = toxinModifiers(actor);
    // The button renders disabled for an immune actor, so this only fires from
    // a stale sheet — an implant added since the last render, say.
    if(mods.immune)
    {
      this._postWoundMsg(actor, `is immune to TOX damage — <b>${mods.sources.join(", ")}</b>.`);
      return;
    }

    const target = toxSaveTarget(die);
    const roll = this._onAbility_Clicked("con", event, false, mods.advantage);
    // dice[0].total is the KEPT die under ADV/DIS, which is what Saving
    // Throws.md's natural-20 clause is about — the same value the crit
    // labelling in _rollD20 reads.
    const { passed, reason } = resolveToxSave(roll.total, roll.dice[0].total, target);
    // Site 2 of three. _onToxSave calls _onAbility_Clicked DIRECTLY and so
    // never reaches the button's click handler above - which is exactly the
    // kind of second path a single hook would have missed silently.
    onSaveResolved(actor, "con", { passed, reason });

    const why = reason === "nat20" ? " — <b>natural 20 always succeeds</b>"
      : reason === "nat1" ? " — <b>natural 1 always fails</b>"
      : "";
    const advNote = mods.advantage ? ` ADV from <b>${mods.sources.join(", ")}</b>.` : "";

    if(passed)
    {
      await actor.update({ "system.toxinDie.die": TOXIN_CURED, "system.toxinDie.source": "" });
      this._postWoundMsg(actor,
        `resists a <b>${die}</b> toxin — CON save vs ${target}${why}.${advNote} No Toxin Die is incurred.`);
    }
    else
    {
      this._postWoundMsg(actor,
        `succumbs to a <b>${die}</b> toxin — CON save vs ${target} failed${why}.${advNote} The Toxin Die is incurred: roll it each round before acting, or each exploration turn out of combat.`);
    }
  }

  /**
   * Fleeing Combat (foundry-system-index.csv "Fleeing Combat"), rebuilt
   * 2026-09-21 to JADE IBIS: "each PC rolls d20 and attempts to equal or exceed
   * their total used item slots. On failure, they may choose to drop items
   * until the number rolled is a success."
   *
   * See combat/flee.js for the rule and the rulings. This method only makes
   * the roll, because the roll has to be made HERE: the Jinx rewrites the kept
   * die on every roll this sheet creates, and a flee is one of them.
   *
   * It is NOT _rollD20. That method adds an ability score and labels a 1 or a
   * 20 as a critical, and JADE's flee is a bare d20 with neither - it is no
   * longer a save, so Saving Throws.md's natural clauses do not reach it, and
   * an Encumbered character's DIS on DEX saves does not either.
   */
  async _onFlee(event)
  {
    const actor = this.actor;
    const mods = fleeModifiers(actor);
    const roll = new Roll(fleeFormula(mods));
    roll.evaluate({async: false});
    const jinxed = applyJinx(actor, roll);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: (jinxed ? JINX_BANNER : "") + "<b>Flee</b>"
    });
    await resolveFleeAttempt(actor, roll, mods);
  }

  /**
   * The Toxin Die's RECURRING DAMAGE. Toxins.md: each combat round, before
   * taking their action, a PC with a TD rolls it and subtracts the result from
   * HP; out of combat, once per exploration turn. On a 1-2 the die DEPLETES
   * ONE STEP DOWN THE CHAIN — it does not clear.
   *
   * Timing belongs to the table, not to this code. Nothing hooks the combat
   * loop, so the damage lands when the button is pressed — the book's "before
   * taking their action" is a table procedure, not an event worth guessing at.
   *
   * HP goes through _resolveHPChange, the shared entry point for any decrease,
   * so a toxin can wound and kill exactly as a weapon does.
   */
  async _onToxRoll(event)
  {
    const actor = this.actor;
    const die = actor.system?.toxinDie?.die ?? TOXIN_CURED;
    if(!hasToxinDie(die)) return;

    const mods = toxinModifiers(actor);
    if(mods.immune)
    {
      this._postWoundMsg(actor, `is immune to TOX damage — <b>${mods.sources.join(", ")}</b>.`);
      return;
    }

    const roll = new Roll(`1${die}`);
    roll.evaluate({async: false});

    const depleted = roll.total <= 2;
    const next = depleted ? stepDownToxinDie(die) : die;

    let flavor = `<b>Toxin Die</b> (${die})`;
    if(depleted)
    {
      flavor += next === TOXIN_CURED
        ? ' — <span class="knave-ability-crit knave-ability-critSuccess">Cured!</span>'
        : ` — depletes to ${next}`;
    }
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });

    // Write the die down before touching HP: _resolveHPChange can open the
    // wound/death path, and the depletion must not be lost behind it.
    if(depleted)
    {
      await actor.update(next === TOXIN_CURED
        ? { "system.toxinDie.die": TOXIN_CURED, "system.toxinDie.source": "" }
        : { "system.toxinDie.die": next });
    }

    const currentHP = actor.system.health.value;
    this._resolveHPChange(actor, currentHP, currentHP - roll.total);
  }

  /**
   * Roll a d20+score check, honoring ADV/DIS via the triggering click event
   * (Ctrl/Cmd-click = ADV, Shift-click = DIS; both together cancel out, per
   * Saving Throws.md). Shared by ability checks/saves, the armor roll, and
   * weapon attack rolls, since they're all the same underlying roll.
   * `forceDis` (work-queue item 3.10, Blind's ranged-attack DIS) ORs an
   * always-on DIS source into the same cancel-out logic, so a player who
   * ALSO holds ctrl for ADV still correctly nets a plain roll.
   * `forceAdv` is its mirror (2026-09-07, the Toxin Die's ADV sources —
   * Extra Liver, Detritivore, an equipped Hazard Wrap). It goes through the
   * same cancel-out rather than building its own formula, so shift-clicking
   * a save an item already grants ADV on still nets a plain roll, exactly as
   * Saving Throws.md says sources of ADV and DIS should behave.
   */
  _rollD20(score, name, event, forceDis = false, forceAdv = false)
  {
    // THE BOARD'S DIS ON EVERY SAVE AND TO-HIT (the Doomsinger's Doom Song,
    // RULED 2026-09-24): every roll through here is one or the other, so it is
    // read here once rather than at each of the call sites.
    const boardDis = conditionSourceNames(this.actor, DIS_SAVES_AND_ATTACKS);
    const adv = (event && (event.ctrlKey || event.metaKey)) || forceAdv;
    const dis = (event && event.shiftKey) || forceDis || boardDis.length > 0;

    let formula = `1d20+${score}`;
    let tag = "";
    if(adv && !dis)
    {
      formula = `2d20kh1+${score}`;
      tag = ' <span class="knave-adv-dis">(ADV)</span>';
    }
    else if(dis && !adv)
    {
      formula = `2d20kl1+${score}`;
      tag = ' <span class="knave-adv-dis">(DIS)</span>';
    }

    let r = new Roll(formula);
    r.evaluate({async: false});

    // Quantum Daemon Debt: Jinxed. THE sheet's roll creator, which is why the
    // jinx is applied here and nowhere else on the sheet — every save, attack,
    // Codex read and rule roll comes through this method. Rewrites the kept
    // die to 1 before anything below reads it; see curse.js.
    const jinxed = applyJinx(this.actor, r);

    let messageHeader = (jinxed ? JINX_BANNER : "") + "<b>" + name + "</b>" + tag
      + (boardDis.length ? ` <i>DIS from ${boardDis.join(", ")}.</i>` : "");
    if(r.dice[0].total === 1)
      messageHeader += ' - <span class="knave-ability-crit knave-ability-critFailure">CRITICAL FAILURE!</span>';
    else if(r.dice[0].total === 20)
      messageHeader += ' - <span class="knave-ability-crit knave-ability-critSuccess">CRITICAL SUCCESS!</span>';

    r.toMessage({speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: messageHeader});
    return r;
  }

  /**
   * Spore depletion - the Mycomastiff's Spores, RULED 2026-09-24 (Matt): "After
   * each spore attack, the Mycomastiff must CON Save. On failure, no more
   * spores can be expelled without a Long Rest." The save is rolled for the
   * creature straight after the attack; a failure sets system.sporeLockout,
   * the flag the Mycomorph's Spores already use, and its owner's Long Rest
   * clears it (companion-upkeep.js). An attack with spores left is untouched.
   */
  _sporesDepleted(item)
  {
    if(!item.flags?.vaarn?.sporeDepletion || !this.actor.system.sporeLockout) return false;
    this._postWoundMsg(this.actor, `has no spores left — no more can be expelled without a Long Rest.`);
    return true;
  }

  _sporeDepletionSave(item)
  {
    const actor = this.actor;
    const roll = this._rollD20(actor.system.abilities.con.effective, `${item.name} — CON Save to keep its spores`);
    const { passed } = resolveSave(roll.total, roll.dice[0].total, SAVE_TARGET);
    if(passed) return;
    actor.update({ "system.sporeLockout": true });
    this._postWoundMsg(actor, `fails its CON Save — no more spores can be expelled without a Long Rest.`);
  }

  _onItemRoll(item, eventTarget, event)
  {
    // A damage add-on is REFERENCE ONLY (Matt's Q5 ruling 2026-09-07): the Item
    // stays on the sheet and stays visible, but neither of its roll icons does
    // anything on its own. Its dice belong to the parent weapon's damage roll.
    //
    // Both icons, not just damage. Testing-log 41.3 found Tank Treads Ram being
    // live-fired through its ATTACK icon — a STR roll, a nat-20 and a doubled
    // d10 — so an add-on was a fully independent attack, not merely a
    // double-counted damage bonus. The "roll Damage only" wording it carried had
    // never been enforced by anything.
    //
    // The template already hides both icons; this is the second gate, for a
    // macro or a stale sheet that reaches the handler anyway.
    if(isDamageAddOn(item) && (eventTarget.title === "attack" || eventTarget.title === "damage"))
    {
      this._postDamageAddOnNotice(item);
      return;
    }

    if(eventTarget.title === "attack")
    {
      if(item.type === "weaponMelee" && !this._itemIsBroken(item) && !this._itemIsSuppressed(item) && !this._itemIsUnequipped(item))
      {
        // Blind CONDITION (JADE IBIS Combat Conditions, RULED 2026-09-16 by
        // Matt): "have DIS on melee attacks". Read from the board; immunity
        // (the Blind mutation among others) has already dropped it in
        // activeDeltas. Rides the same forced-DIS hook as the mutation's
        // ranged clause, so ctrl-click ADV still cancels to a plain roll.
        if(this._exoticaWeaponSpent(item)) return;
        if(this._sporesDepleted(item)) return;
        // A declared auto-hit makes no roll (RULED 2026-09-25, Matt): every
        // targeted token is hit, and the damage click follows as usual.
        // A staged attack (Hiveyhump's swarm) waits on its stage, then auto-hits.
        if(item.flags?.vaarn?.stagedBy)
          return void this._stagedAttackReady(item).then(ok => ok && this._checkToHitTargets(null, item));
        if(item.flags?.vaarn?.autoHit) return this._checkToHitTargets(null, item);
        const blindDis = hasStatefulCondition(this.actor, BLIND);
        const advVs = this._advantageVsNotes(item);
        // A target that makes this attack roll at DIS - the Ickbulb's smear,
        // Vantablossom (To-Hit Resolution Override wiring, 2026-09-25).
        const tDis = targetDisadvantage(item, Array.from(game.user?.targets ?? []).map(t => t.actor), hasStatefulCondition);
        const roll = this._onAbility_Clicked(this._toHitAbilityKey(item), event, blindDis || tDis.force, advVs.length > 0);
        this._checkWeaponCrit(item, roll);
        // An Exotica weapon's usage die rolls on every use (10.3.3) - each
        // stab of Philosopher's Dirk (2026-09-22). A spent one is removed
        // after its damage click, or on the next attempt if this one missed,
        // so the hit it just made can still land.
        if(item.flags?.vaarn?.exotica && item.system.usageDie?.die) rollUsageDie(item, this.actor);

        this._checkToHitTargets(roll, item);
        this._checkTooHotToHold(item);
        this._postRollNotes(this.actor, [...advVs, ...tDis.notes, ...this._attackNotes(), ...this._tagNotes(item, TO_HIT_NOTES), ...this._stormNotes(item), ...this._followUpNotes(item)]);
        // A condition the weapon inflicts - a creature attack's declared
        // effect (2026-09-16). A PC weapon's Entangling / Blinding tag no
        // longer posts here: since 2026-09-24 its save card follows each HIT,
        // and a failed roll puts the condition on (_checkToHitTargets).
        this._postConditionCards(item.flags?.vaarn?.applies ?? [], item.name);
        if(item.flags?.vaarn?.sporeDepletion) this._sporeDepletionSave(item);
      }
      else if(item.type === "weaponRanged" && !this._itemIsBroken(item) && !this._itemIsSuppressed(item) && !this._itemIsUnequipped(item))
          this._rangedAttackRoll(item, event);
    }
    else if(eventTarget.title === "damage" && !this._itemIsBroken(item) && !this._itemIsSuppressed(item) && !this._itemIsUnequipped(item))
    {
      // A staged attack before its first stage rolls nothing (Hiveyhump's swarm).
      if(item.flags?.vaarn?.stagedBy && !this._stageOf(item)) return;
      // THE CORROSIVE TAG'S CHOICE, taken FIRST because it replaces the damage
      // roll rather than modifying it - "either deals damage OR reduces
      // target's AV score by one". Every branch below this line assumes a
      // damage roll is about to happen.
      if(this._resolveArmourChoice(item)) return;

      // An attack with no HP formula - Chromavore's Envelop, a Star Vampire's
      // Latch (Ability Damage wiring, 2026-09-22) - deals only its ability loss,
      // so there is no HP die to roll.
      if(!item.system.damageDice && (abilityDamageSpecsOf(item).length || abilityTickSpecsOf(item).length))
      {
        this._applyAbilityDamageOnHit(item);
        return;
      }
      // A HIT THAT TAKES A RATION - the Desiccator's water, the Faminebearer's
      // food (Travel and Rations, RULED 2026-09-23). The ration card first,
      // THEN the note that the rest of the rule (Deprived, the CON loss, the
      // save) is the Referee's - chained, because this handler is not async
      // and two unawaited cards can post in either order.
      if(item.flags?.vaarn?.takesRation)
      {
        const taking = this._takeRationOnHit(item);
        if(!item.system.damageDice && item.flags?.vaarn?.hitProgression) return;
        if(!item.system.damageDice)
        {
          taking.then(() => this._postWoundMsg(this.actor, `<b>${item.name}</b> has no damage roll — resolve the rest of its effect on a hit from the biography.`));
          return;
        }
      }
      // A creature attack that rolls to hit but deals nothing the system can
      // write - Desiccate, Surgical Array (the to-hit rule, 2026-09-22). Say so
      // rather than rolling an empty formula.
      if(!item.system.damageDice)
      {
        this._postWoundMsg(this.actor, `<b>${item.name}</b> has no damage roll — resolve its effect on a hit from the biography.`);
        return;
      }
      // Damage Read from an Actor Value (2026-09-21, RULED by Matt): a
      // formula like "(@lvl)d4" or "@target.gleam" is read NOW, from the
      // attacker's current Level and the one targeted token. One that reads
      // the target and has none, or several, refuses and says why.
      const valueRead = actorValueRollData(item.system.damageDice, this.actor,
        Array.from(game.user.targets ?? []).map(t => t.actor), item.name);
      if(valueRead.refusal)
      {
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: valueRead.refusal });
        return;
      }
      const implantBonus = this._implantDamageBonus(item);
      // Psionic tag (item 4.4, 2026-08-27): "EGO bonus added to damage" —
      // a second, independent bonus source alongside implants (item
      // 10.4's Hydraulic Biceps/Merciless Cybereyes). Both can stack on
      // the same weapon (a Psionic-tagged weapon wielded by someone with
      // a matching implant), so this sums rather than replacing.
      let psionicBonus = null;
      if((item.system.tags || []).includes("Psionic"))
      {
        const egoAmount = Number(this.actor.system.abilities.ego.effective || 0);
        if(egoAmount) psionicBonus = { amount: egoAmount, name: "Psionic" };
      }
      const totalBonus = (implantBonus?.amount || 0) + (psionicBonus?.amount || 0);
      const formula = totalBonus ? `${item.system.damageDice}+${totalBonus}` : item.system.damageDice;

      // DAMAGE ADD-ONS folded in (Matt's Option B, 2026-09-07). Each add-on
      // appends exactly one die term to this one roll, which is what makes crit,
      // berserk and every future per-attack modifier come out right for free —
      // they already apply to the whole roll.
      //
      // ONE ROLL, not one per add-on: the book's own wording is "add an extra d6
      // of fang damage to the roll", and a separate roll is precisely the model
      // that double-counted the implant bonus in the first place.
      const addOns = collectDamageAddOns(this.actor, item);
      const rolledFormula = [formula, ...addOns.map(a => a.def.dice)].join("+");
      let r = new Roll(rolledFormula, valueRead.data);
      r.evaluate({async: false});

      // Read the add-on dice back POSITIONALLY, from the end. Each add-on
      // contributes exactly one normalised `NdX` term and they were appended
      // last, so the final `addOns.length` entries of r.dice are theirs in
      // order — regardless of how many terms the parent's own formula holds.
      const addOnTotals = addOns.length
        ? r.dice.slice(-addOns.length).map(die => die.total)
        : [];
      const addOnSum = addOnTotals.reduce((a, b) => a + b, 0);
      const parentBase = r.total - addOnSum;

      const critical = this.#_criticalWeapons.delete(item.id);
      const isMelee = item.type === "weaponMelee";
      // Berserker StimRig/Brew (item 10.8, 2026-08-27): melee-only, checked
      // against the ATTACKER's own flag — independent of crit-doubling
      // above (Matt's ruling: the two multipliers stack, a berserk crit
      // deals 4x, not 2x) and independent of whatever the TARGET's own
      // berserker state is (that's _doDamage's concern, on the receiving
      // end, not this attacker-side roll).
      const berserk = berserkApplies(this.actor, isMelee);

      // Wrathworms, 2026-09-19: "Infected creatures fight with wild abandon,
      // and deal and receive doubled damage." This is the DEALING half; the
      // receiving half is _doDamage's incomingDamageMultiplier. Not melee-
      // gated, unlike the berserk flag directly above — "melee" is the book's
      // word for the StimRig and is not in the Wrathworms entry.
      //
      // Stacks with both multipliers above it, per the same ruling that makes
      // a berserk crit 4x rather than 2x.
      const dealtMult = outgoingDamageMultiplier(this.actor);
      const rollMultiplier = (critical ? 2 : 1) * (berserk ? 2 : 1) * dealtMult;
      const critDmg = critical ? r.total * 2 : r.total;
      const dmg = (berserk ? critDmg * 2 : critDmg) * dealtMult;

      // COMPONENTS, not one number. Five of the six add-ons carry no damage type
      // of their own and share the parent weapon's, so `types: null` means "ask
      // the parent Item" and their dice resolve exactly as the parent's do.
      // Bioelectricity is the one that mixes: its d6 is ELECTRICAL onto an
      // otherwise kinetic blow, and without splitting the figure an
      // electrical-IMMUNE target would still take that d6 while an
      // electrical-VULNERABLE one would not have it doubled.
      // EVERY COMPONENT ALSO CARRIES ITS MINIMUM, for Glassflesh Paste's "you
      // take minimum damage from beam weapons" (2026-09-11). RULED (Matt): "as
      // if the die rolled the minimum amount" — so this is the floor of the
      // dice that were actually rolled, not a flat 1 and not a multiplier.
      //
      // It has to be computed HERE and not in _doDamage, because this is the
      // only place the Roll object still exists. Downstream all that survives
      // is a number, and a number cannot say what it could have been.
      //
      // Minimum of an NdX term is N — one per die — plus whatever flat
      // modifier the formula carried. The parent's flat part is recovered by
      // subtraction rather than re-parsed, so a formula this file never
      // anticipated still lands in the right place.
      const parentDice  = addOns.length ? r.dice.slice(0, -addOns.length) : r.dice;
      const parentDiceTotal = parentDice.reduce((a, d) => a + d.total, 0);
      const parentDiceMin   = parentDice.reduce((a, d) => a + d.number, 0);
      const parentFlat  = parentBase - parentDiceTotal;
      const addOnDice   = addOns.length ? r.dice.slice(-addOns.length) : [];

      const damageComponents = [
        { amount: parentBase * rollMultiplier,
          min:    (parentDiceMin + parentFlat) * rollMultiplier,
          name: item.name, types: null },
        ...addOns.map((a, i) => ({
          amount: addOnTotals[i] * rollMultiplier,
          min:    (addOnDice[i]?.number ?? 1) * rollMultiplier,
          name: a.def.source,
          types: a.def.damageTypes,
        })),
      ];

      // Name the damage type on the card whenever it is not plain Kinetic.
      // Until now nothing in the UI said an attack was Beam or Electrical, so
      // a rule keyed on it looked like it fired at random.
      const dmgTypes = attackPropertiesOrKinetic(item).filter(t => t !== "kinetic");
      let messageHeader = "<b>" + item.name + "</b> damage"
        // The values the formula read, so the card shows the numbers used.
        + (readsActorValue(item.system.damageDice)
          ? ` (read: ${[/@lvl/.test(item.system.damageDice) ? `Level ${valueRead.data.lvl}` : null,
                       valueRead.data.target ? `${valueRead.data.target.name}'s Gleam ${valueRead.data.target.gleam}` : null]
                       .filter(Boolean).join(", ")})`
          : "")
        + (dmgTypes.length ? ` <i>(${dmgTypes.join(", ")})</i>` : "");
      if(implantBonus)
        messageHeader += ` (includes +${implantBonus.amount} from <b>${implantBonus.name}</b>)`;
      if(psionicBonus)
        messageHeader += ` (includes +${psionicBonus.amount} from <b>${psionicBonus.name}</b>)`;
      // Matt's condition on the Q5 ruling: the player must still be able to see
      // WHY the extra damage is happening. A folded roll that simply comes out
      // bigger with no explanation is not acceptable, so every contributing
      // add-on is named with its own dice and its own result — the same shape
      // the implant and Psionic bonuses above already use.
      addOns.forEach((a, i) =>
      {
        const typeNote = a.def.damageTypes?.length ? ` <i>(${a.def.damageTypes.join(", ")})</i>` : "";
        messageHeader += ` (includes ${a.def.dice}=${addOnTotals[i]}${typeNote} from <b>${a.def.source}</b>)`;
      });
      if(critical)
        messageHeader += ` <span class="knave-ability-crit knave-ability-critSuccess">CRITICAL HIT — doubled to ${critDmg}!</span>`;
      // Each line reports ITS OWN stage, which is why this says critDmg * 2
      // rather than dmg. It read `dmg` until 2026-09-19, and that was the same
      // number right up until a second attacker-side multiplier existed — with
      // Wrathworms also active it would have said "BERSERK — doubled to 24"
      // when berserk's own doubling took it to 12. The crit line above has
      // always worked this way.
      if(berserk)
        messageHeader += ` <span class="knave-ability-crit knave-ability-critSuccess">BERSERK — doubled to ${critDmg * 2}!</span>`;
      // The same annotation for the dealing half of "deal and receive doubled
      // damage", and for the same reason the two above it exist: the roll
      // posted here is the UNDOUBLED total, so without this the card reads 6
      // while the target loses 12. Group 227 found it that way round.
      // Labelled by the effect rather than by Wrathworms, because the key is
      // generic and a second source would inherit this line.
      if(dealtMult !== 1)
        messageHeader += ` <span class="knave-ability-crit knave-ability-critSuccess">DOUBLE DAMAGE DEALT — doubled to ${dmg}!</span>`;
      r.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: messageHeader});
      this._postRollNotes(this.actor, this._tagNotes(item, DAMAGE_NOTES));

      let vampiricTotal = 0, vampiricDrained = 0;
      let drainTotal = 0, drainVictims = 0;
      let rapturousTotal = 0, rapturousKills = 0, meleeKills = 0;
      this.#_hitTargets.forEach((target)=>
      {
        // rollMultiplier: the factor already applied to the base dice above,
        // passed through so a tag that adds its own die in _doDamage (Mauling)
        // can multiply it the same way rather than sneaking in undoubled.
        // Return value carries that target's healing contributions and whether
        // the hit killed it — all summed and applied once below, never per
        // target (see _doDamage's own note).
        const res = this._doDamage(target, dmg, isMelee, item, rollMultiplier, damageComponents);
        if(res.vampiricHeal > 0) { vampiricTotal += res.vampiricHeal; vampiricDrained++; }
        if(res.drainHeal > 0) { drainTotal += res.drainHeal; drainVictims++; }
        if(res.bloodRapturousHeal > 0) { rapturousTotal += res.bloodRapturousHeal; rapturousKills++; }
        if(res.killed && isMelee) meleeKills++;
        // A named wound on a hit that DEALS DAMAGE - the Deathblight Husk's
        // Accursed Knife (Encumbrance Penalty wiring, RULED 2026-09-25, Matt).
        if(res.dealt > 0 && item.flags?.vaarn?.woundOnDamage && target.actor)
          applyNamedWound(target.actor, item.flags.vaarn.woundOnDamage, { source: `${this.actor.name}'s ${item.name}` });
      });
      const attackHeals = [
        { verb: "drains", label: "Vampiric", amount: vampiricTotal, victims: vampiricDrained },
        { verb: "drains", label: item.name, amount: drainTotal, victims: drainVictims },
        { verb: "feeds on the death of", label: "Blood-Rapturous", amount: rapturousTotal, victims: rapturousKills },
      ];
      // THE LEVEL FIRST, THEN THE HEAL (the Hagfluke's Siphon, RULED 2026-09-27,
      // Matt): its +4 max HP is room the heal can then fill. One Level per
      // attack, whatever the number of qualifying targets it hit.
      const gain = item.flags?.vaarn?.levelGain;
      const gainsFrom = gain ? Array.from(this.#_hitTargets).filter(t => t.actor && (!gain.targets?.length || hasAnyCreatureType(t.actor, gain.targets))) : [];
      Promise.resolve(gainsFrom.length ? this._applyLevelGain(item, gain) : null)
        .then(() => this._applyAttackHeals(attackHeals, item.name));
      this._postKillReactionReminder(meleeKills);
      this._noteUnresolvedKillReactions(item);
      this._resolveChargeDeclaration(item, addOns);
      // A tag's ability damage "alongside base damage" - Freezing, Necrotic.
      this._applyAbilityDamageOnHit(item);
      // A tag that eats the target's armour - Ultra-Corrosive.
      this._applyArmourLossOnHit(item);
      // An ongoing hold the hit starts - the Piranha Mole's Flense.
      this._startHoldsOnHit(item);
    }
  }

  /**
   * An attack that HOLDS what it hits - Per-Round Effect Reminder wiring,
   * RULED 2026-09-25 (Matt). Each target hit carries the hold from now on:
   * the round card's damage button on the holder's turn, the escape save on
   * theirs. See apply-to-target.js's startHold.
   */
  /**
   * Hold every targeted token - a use rather than a hit starts it (Vampiric
   * Roots, Bottled Thicket). A hold limited to creature types passes over the
   * others silently, the Rustacean ruling on telegraphing.
   */
  async _holdTargets(label, spec)
  {
    const targets = Array.from(game.user?.targets ?? []).map(t => t.actor).filter(Boolean)
      .filter(a => !spec.targets?.length || hasAnyCreatureType(a, spec.targets));
    if(!targets.length)
      return this._postWoundMsg(this.actor, `uses <b>${label}</b> - no target it can hold is selected.`);
    for(const victim of targets)
    {
      const spared = holdSpared(victim, spec);
      if(spared) { this._postWoundMsg(victim, sparedHoldLine(label, spared)); continue; }
      await startHold(victim, spec, this.actor, label);
      this._postWoundMsg(victim, `is held by <b>${this.actor.name}</b>'s <b>${label}</b> - ${spec.dice} damage each round`
        + `${spec.drain ? `, healing ${this.actor.name}` : ""}; ${String(spec.escape.ability).toUpperCase()} save to ${spec.escape.by} on their turn.`);
    }
  }

  async _startHoldsOnHit(item)
  {
    const spec = item?.flags?.vaarn?.holdOnHit;
    if(!spec) return;
    for(const token of this.#_hitTargets)
    {
      if(!token.actor) continue;
      // Breathing and Suffocation, RULED 2026-09-27 (Matt): a hold that could
      // only deal damage this target is immune to never starts.
      const spared = holdSpared(token.actor, spec);
      if(spared) { this._postWoundMsg(token.actor, sparedHoldLine(item.name, spared)); continue; }
      await startHold(token.actor, spec, this.actor, item.name);
      this._postWoundMsg(token.actor, `is held by <b>${this.actor.name}</b>'s <b>${item.name}</b> - `
        + `${spec.dice ? spec.dice + " damage" : spec.loss.dice + " " + String(spec.loss.ability).toUpperCase()} each round; `
        + `${String(spec.escape.ability).toUpperCase()} save to ${spec.escape.by} on their turn.`);
    }
  }

  /**
   * ARMOUR LOSS ON A HIT — Ultra-Corrosive, RULED 2026-09-22 (Matt).
   *
   * "Reduces AV by -2 on a hit. Targets take d8 CON damage alongside base
   * damage." The CON half already rides abilityDamage in chargen-data.js; this
   * is the armour half, and it is the reason the atom moved off Damage Roll
   * Modifier: it changes what the target WEARS, not what the blow rolled.
   *
   * WRITES system.armor.damage, the stored field added 2026-09-22 — the same
   * field the Synthetic Wounds table's armorDie writes, and the same shape an
   * ability's woundDamage has. It took two wrong homes to get here and both
   * are worth keeping, because each looked right:
   *
   *   1. system.armor.value, on the armorDie precedent. It does NOTHING on a
   *      character: _prepareCharacterData rebuilds that field from equipped
   *      items on every prepare, so the write is overwritten before anything
   *      reads it, with no error and an unchanged sheet. Caught only because
   *      a fixture set to AV 14 read back 10 — and it turned out armorDie had
   *      the same bug, which is what prompted the field.
   *   2. A board entry carrying `applied: { av: -N }`. That worked, but it
   *      put armour damage in a list of temporary effects, where a corroded
   *      breastplate reads as something that will wear off. Matt's point when
   *      he asked for this field: the player should see the damage on the
   *      armour line, as they do for an ability.
   *
   * Applied rather than announced (Matt's ruling, against the alternative of
   * naming the -2 and leaving it to the Referee) because the tag states a
   * flat, unconditional consequence with no choice in it.
   *
   * FLOORED AT AV 10 by actor.js's derivation, and clamped here too so the
   * stored figure never grows past what it can express — otherwise a target
   * hit five times would carry a damage of 10 that nobody could read off the
   * sheet, and repairing one point of it would change nothing. A target
   * already at the floor is told so instead.
   *
   * NOTHING REPAIRS IT (Matt, 2026-09-22): the book has no armour repair rule
   * and we are not inventing one, so the Referee clears the field by hand.
   *
   * THE CORROSIVE TAG ONE TIER DOWN IS NOT HERE. "On hit, either deals damage
   * or reduces target's AV score by one (attacker's choice)" — the choice is
   * the whole of it, and an automatic application would take it away. Its atom
   * row records the question.
   */
  /**
   * THE CORROSIVE TAG'S EITHER/OR — "Degrades AV. On hit, either deals damage
   * or reduces target's AV score by one (attacker's choice)." RULED
   * 2026-09-22 (Matt): the choice is a TOGGLE declared before the roll, the
   * same shape as Charge Declaration State.
   *
   * Returns TRUE when it has taken the attack over, which is the caller's
   * signal to roll no damage at all. That is the whole difference between
   * this tag and Ultra-Corrosive: the exotic one's -2 is an ADDITION to the
   * damage and rides ARMOUR_LOSS_TAGS on every hit, while this one is an
   * ALTERNATIVE to it and therefore cannot.
   *
   * SILENT WHEN NOTHING WAS DECLARED. A corrosive weapon swung without the
   * toggle is an ordinary attack and says nothing about armour — unlike the
   * charge, which announces a withheld die, because there the player lost
   * something they might have meant to have. Here the undeclared case IS the
   * ordinary one.
   *
   * THE DECLARATION IS SPENT EVEN IF IT REACHES NOTHING — no target, or a
   * target already unarmoured. The toggle means "this attack goes for the
   * armour", and that attack has happened; leaving it set would carry the
   * choice silently into the next swing, which is the sticky-flag failure the
   * charge toggle's auto-clear exists to prevent.
   */
  _resolveArmourChoice(item)
  {
    if(!offersArmourChoice(item) || !isDegradingArmour(this.actor)) return false;
    this._degradeInsteadOfDamage(item);
    return true;
  }

  /**
   * IT REPLACES THE BASE DAMAGE ROLL, NOT THE WHOLE ATTACK, and that
   * distinction was a bug before it was a comment. The first build simply
   * returned early out of the damage branch, which skipped everything below
   * it — so a weapon carrying Corrosive AND Ultra-Corrosive lost the exotic
   * tag's unconditional -2 AV and its d8 CON as well as the damage, and a
   * Necrotic or Freezing rider would have gone the same way.
   *
   * Caught by test 313.9, which had been written to expect -3 from the pair
   * because that is what the row and the commit message both said it would
   * do. The description was the right reading and the code was not: the
   * book's either/or is "deals damage OR reduces target's AV score by one",
   * a choice about this weapon's DAMAGE, and it says nothing about the other
   * things a hit carries.
   *
   * SEQUENCED WITH awaits rather than fired off together, because the choice
   * and Ultra-Corrosive both read the target's CURRENT armour to work out how
   * far it can still fall. Unawaited, the second would read the figure from
   * before the first landed and the pair would overshoot the floor.
   */
  async _degradeInsteadOfDamage(item)
  {
    await clearArmourChoice(this.actor);
    const targets = Array.from(this.#_hitTargets);
    if(!targets.length)
      return this._postWoundMsg(this.actor, `<b>${item.name}</b> went for the armour, but hit nothing. `
        + `<i>The declaration is spent.</i>`);

    for(const token of targets)
    {
      const actor = token.actor;
      if(!actor) continue;
      const already = Math.max(0, Number(actor.system?.armor?.damage) || 0);
      const effective = Number(actor.system?.armor?.effective ?? actor.system?.armor?.value ?? 0);
      if(effective - 1 < 10)
      {
        this._postWoundMsg(actor, `<b>${item.name}</b> bites at armour that is not there — `
          + `AV is already ${effective}, unarmoured, so nothing is degraded and no damage was dealt.`);
        continue;
      }
      await actor.update({ "system.armor.damage": already + 1 });
      this._postWoundMsg(actor, `<b>${item.name}</b> degrades armour instead of wounding — `
        + `<b>AV -1</b> (now ${effective - 1}). <i>Armour damage ${already + 1}; no damage was dealt.</i>`);
    }

    // The rest of what a hit carries, which the choice does not speak for:
    // Ultra-Corrosive's own -2 if this weapon also has it, and any on-hit
    // ability damage the tags declare.
    await this._applyArmourLossOnHit(item);
    await this._applyAbilityDamageOnHit(item);
  }

  async _applyArmourLossOnHit(item)
  {
    // A tag's loss (Ultra-Corrosive) plus a creature attack's declared one
    // (the Drill Drone's Drill, the Witchgrub's Corrosive Spit - Live AV
    // Computation wiring, 2026-09-25). The same write either way.
    const tagLoss = ARMOUR_LOSS_TAGS[(item?.system?.tags ?? []).find(t => ARMOUR_LOSS_TAGS[t])] || 0;
    const loss = tagLoss + (Number(item?.flags?.vaarn?.armourLoss) || 0);
    if(!loss) return;
    const verb = tagLoss ? "corrodes" : "damages";
    for(const token of this.#_hitTargets)
    {
      const actor = token.actor;
      if(!actor) continue;
      const undamaged = Number(actor.system?.armor?.value ?? 0);
      const already = Math.max(0, Number(actor.system?.armor?.damage) || 0);
      const effective = Number(actor.system?.armor?.effective ?? undamaged);
      const drop = Math.min(loss, Math.max(0, effective - 10));
      if(drop <= 0)
      {
        this._postWoundMsg(actor, `<b>${item.name}</b> ${verb} nothing — AV is already ${effective}, unarmoured.`);
        continue;
      }
      await actor.update({ "system.armor.damage": already + drop });
      this._postWoundMsg(actor, `<b>${item.name}</b> ${verb} armour — <b>AV -${drop}</b> (now ${effective - drop}). `
        + `<i>Armour damage ${already + drop}; nothing repairs it but the Referee.</i>`);
    }
  }

  /**
   * Ability damage to every target the attack HIT - Ability Damage (woundDamage)
   * wiring, RULED 2026-09-22 (Matt). Auto-applied, not a card: the attack roll
   * already decided who was hit, exactly as it does for the HP damage beside it.
   *
   * ROLLED ONCE per declaration and applied to every target hit, as the HP die
   * is. NEVER DOUBLED BY A CRITICAL HIT (RULED the same day): the book's
   * doubling is about damage dice, and a doubled d20 EGO loss would be brutal.
   * A declaration limited to creature types (Necrotic, biological only) skips
   * any other target and says so. Written to woundDamage, where every other
   * ability loss lives, so it heals with rest.
   */
  async _applyAbilityDamageOnHit(item)
  {
    const specs = abilityDamageSpecsOf(item);
    const ticks = abilityTickSpecsOf(item);
    if(!specs.length && !ticks.length) return;
    // The dealing half of Incorporeal, as _doDamage has it.
    if(this._isIncorporeal(this.actor))
    {
      this._postWoundMsg(this.actor, `deals no ability damage — <b>${this.actor.name}</b> is <b>Incorporeal</b>.`);
      return;
    }
    const targets = Array.from(this.#_hitTargets);
    if(!targets.length)
    {
      this._postWoundMsg(this.actor, `<b>${item.name}</b> hit no target, so no ability damage was applied.`);
      return;
    }
    await this._applyAbilityDamage(specs, targets);
    // A hit that STARTS a per-round loss - the Psyche Leech's syphon.
    if(ticks.length) await this._startAbilityTicks(ticks, targets);
    // The Exotica weapon whose usage die ran out on this attack.
    if(item.flags?.vaarn?.exotica && item.system.usageDie?.die === "expended") this._deleteUsedUpExotica(item);
  }

  /**
   * Start a per-round ability loss on these target tokens - Ability Damage
   * pass 3, RULED 2026-09-22 (Matt). The FIRST loss lands now, through the
   * same _applyAbilityDamage every other loss uses (so a creature-type limit
   * is honoured and said); each target that took it then gets a board entry
   * whose round-card line applies the loss every later round, until the
   * Referee removes it.
   */
  /**
   * Start an ESCALATING per-round HP loss on these target tokens — the
   * Seeker's Brain Burster, 2026-09-22.
   *
   * "For each combat round the Seeker focuses their attention on a target, the
   * target takes unblockable damage, with no to-hit roll required. This damage
   * starts at 2 and doubles each turn."
   *
   * THE FIRST HIT LANDS NOW, as the ability tick beside it does, so the round
   * the effect begins is not a free one; the board entry then carries every
   * later round and doubles as it goes.
   *
   * UNBLOCKABLE IS ALREADY TRUE and needs no code: AV is read by the to-hit
   * roll, and this never makes one. Said in the chat line rather than
   * implemented, because there is nothing to implement.
   *
   * "CREATURES WITHOUT A BRAIN CANNOT BE HARMED BY THIS ATTACK" is NAMED, NOT
   * ENFORCED, and that is deliberate: the book does not say which creature
   * types lack a brain, and the seven this system has do not answer it either
   * — Synthetic runs on an ego-engine, Fungal is motile fungus, Mineral is
   * living crystal, and any list would be a reading nobody has made. So the
   * Referee is told, in the same sentence that starts the effect, rather than
   * having a guess applied silently on their behalf. An open question on the
   * atom row.
   */
  async _startEscalatingTicks(specs, targets)
  {
    for(const spec of specs)
      for(const token of targets)
      {
        const actor = token.actor;
        if(!actor) continue;
        await startEscalatingTick(actor, {
          name: spec.source,
          text: `${spec.start} unblockable damage, multiplying by ${spec.factor} each combat round, `
              + `until the Referee removes this — the focus broken, or the Seeker switched target.`,
          start: spec.start, factor: spec.factor, source: this.actor
        });
        const currentHP = actor.system.health.value;
        this._resolveHPChange(actor, currentHP, currentHP - spec.start);
        this._postWoundMsg(actor, `is under <b>${spec.source}</b> — <b>${spec.start}</b> unblockable damage now, `
          + `x${spec.factor} each round from the round card until it is removed from the board. `
          + `<i>A creature without a brain cannot be harmed by this — the Referee decides which those are.</i>`);
      }
  }

  async _startAbilityTicks(specs, targets)
  {
    // A FADING tick - the Occulith's gaze (2026-09-25) - lands its first loss,
    // and its AV gain, on the target's fading recurrence rather than on
    // woundDamage. See addFading.
    await this._applyAbilityDamage(specs.filter(s => !s.fade), targets);
    for(const spec of specs.filter(s => s.fade))
    {
      const roll = new Roll(spec.dice ?? String(spec.flat));
      await roll.evaluate({async: true});
      const label = String(spec.ability).toUpperCase();
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                             flavor: `<b>${spec.source}</b> — ${spec.dice ?? spec.flat} ${label} lost` });
      for(const token of targets)
      {
        const actor = token.actor;
        if(!actor) continue;
        if(spec.targets?.length && !hasAnyCreatureType(actor, spec.targets)) continue;
        const applied = await addFading(actor, spec.fade, { ability: spec.ability, amount: roll.total, av: spec.avPerTick || 0 });
        this._postWoundMsg(actor, `loses <b>${roll.total} ${label}</b>${spec.avPerTick ? ` and gains <b>+${spec.avPerTick} AV</b>` : ""} `
          + `to <b>${spec.source}</b> — now ${fadingSummary(applied)}, fading a point a day.`);
      }
    }
    for(const spec of specs)
      for(const token of targets)
      {
        const actor = token.actor;
        if(!actor) continue;
        if(spec.targets?.length && !hasAnyCreatureType(actor, spec.targets)) continue;
        const label = String(spec.ability).toUpperCase();
        await startAbilityTick(actor, {
          name: spec.source,
          text: spec.fade
            ? `${spec.dice ?? spec.flat} ${label} lost${spec.avPerTick ? ` and +${spec.avPerTick} AV` : ""} each combat round, until the Referee removes this (line of sight broken). Both fade a point a day.`
            : `${spec.dice ?? spec.flat} ${label} damage each combat round, until the Referee removes this.`,
          ability: spec.ability, dice: spec.dice ?? null, flat: spec.flat ?? null,
          fade: spec.fade ?? null, avPerTick: spec.avPerTick ?? 0, source: this.actor
        });
        this._postWoundMsg(actor, `is under <b>${spec.source}</b> — ${spec.dice ?? spec.flat} ${label} `
          + (spec.fade ? `lost${spec.avPerTick ? ` and +${spec.avPerTick} AV` : ""} each round until it is removed from the board; both fade a point a day.`
                       : `damage each round until it is removed from the board.`));
      }
  }

  /**
   * An Exotica weapon whose usage die is already spent cannot attack; it is
   * removed now, as a used-up Exotica is (10.3.3). True when it refused.
   */
  _exoticaWeaponSpent(item)
  {
    if(!item.flags?.vaarn?.exotica || item.system.usageDie?.die !== "expended") return false;
    this._deleteUsedUpExotica(item);
    return true;
  }

  /**
   * Write ability-damage declarations to these target tokens. Shared by the
   * damage click (targets = those the attack hit) and an Advanced Exotica's
   * use (targets = those targeted, the usage-die roll standing in for the
   * to-hit roll per Matt's 2026-09-03 ruling).
   */
  async _applyAbilityDamage(specs, targets)
  {
    for(const spec of specs)
    {
      const key = spec.ability;
      const label = String(key).toUpperCase();
      // A loss limited to some creature types says NOTHING to a target it
      // cannot touch - no roll, no "is not synthetic" line (RULED 2026-09-24,
      // Matt, on the Rustacean: "It telegraphs the ability when players should
      // really find out by having a synth get hit"). An attack with no target
      // at all still rolls, for the Referee to apply by hand.
      const eligible = spec.targets?.length
        ? targets.filter(t => t.actor && hasAnyCreatureType(t.actor, spec.targets))
        : targets;
      if(targets.length && !eligible.length) continue;
      const roll = new Roll(spec.dice ?? String(spec.flat));
      roll.evaluate({async: false});
      if(spec.dice)
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                               flavor: `<b>${spec.source}</b> — ${spec.dice} ${label} damage` });
      for(const token of eligible)
      {
        const actor = token.actor;
        if(!actor) continue;
        // A loss that rides a damage type stops where that damage does (RULED
        // 2026-09-23, Matt): immune to freezing, no Freezing DEX loss.
        if(immuneToAttackProperty(actor, spec.property))
        {
          this._postWoundMsg(actor, `is immune to ${spec.property} — no ${label} damage from <b>${spec.source}</b>.`);
          continue;
        }
        const total = Number(actor.system.abilities?.[key]?.woundDamage ?? 0) + roll.total;
        await actor.update({ [`system.abilities.${key}.woundDamage`]: total });
        const effective = actor.system.abilities?.[key]?.effective;
        this._postWoundMsg(actor, `takes <b>${roll.total} ${label} damage</b> from <b>${spec.source}</b> `
          + `(${label} wound damage total ${total}${effective !== undefined ? `, effective ${effective}` : ""}).`);
      }
    }
  }

  /**
   * The auto-clear half of Matt's Q1 charge ruling, and the reason a declared
   * charge cannot go stale: rolling the damage die clears it.
   *
   * Runs on ANY melee damage roll, not only one that a charge-conditional add-on
   * actually fed. That is deliberate — the toggle means "this attack is a
   * charge", so the attack consuming it is what ends it, whether or not the
   * character happens to own Horns Rhino. Leaving it set after an unrelated
   * swing is exactly the sticky-flag failure the auto-clear exists to prevent.
   *
   * Also names the add-ons a MISSED declaration withheld. A player who forgot to
   * toggle otherwise just sees a smaller number with nothing saying why, which is
   * the same silent-difference objection Matt raised about a bigger one.
   */
  async _resolveChargeDeclaration(item, addOns)
  {
    if(item.type !== "weaponMelee") return;

    if(await clearCharge(this.actor))
    {
      const fed = addOns.filter(a => a.def.requires === "charge").map(a => a.def.source);
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: fed.length
          ? `<b>Charge</b> spent on that attack — ${fed.map(n => `<b>${n}</b>`).join(", ")} added. The toggle is now off.`
          : `<b>Charge</b> spent on that attack. The toggle is now off.`,
      });
      return;
    }

    const withheld = withheldDamageAddOns(this.actor, item);
    if(withheld.length)
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<i>No charge was declared, so ${withheld.map(w => `<b>${w.def.source}</b> (${w.def.dice})`).join(" and ")} added nothing. Declare the charge on the sheet before rolling damage.</i>`,
      });
  }

  /**
   * Why an add-on's own roll icons do nothing — see the reference-only note in
   * _onItemRoll. Whispered to whoever clicked rather than posted publicly: it is
   * an explanation of the interface, not an event in the fiction.
   */
  _postDamageAddOnNotice(item)
  {
    const def = damageAddOnFor(item);
    const when = def?.requires === "charge"
      ? " when you declare a charge"
      : def?.appliesTo === "unarmed" ? " to your unarmed attack" : "";
    ChatMessage.create({
      user: game.user._id,
      whisper: [game.user.id],
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> is a damage bonus, not an attack of its own. Its ${def?.dice ?? "dice"} are added${when} to your weapon's damage roll — roll that weapon instead.`,
    });
  }

  /**
   * Vaarn's nat-1/nat-20 rule (Making Attacks.md), not Knave's old quality-
   * counter: an ordinary weapon that rolls a 1 just fumbles — dropped or
   * jammed, usable again immediately, no lasting state. Only weapons that
   * are Fragile (all Advanced/Exotic weapons, tagged onto the item at
   * creation) or carry the Basic tags that explicitly say "breaks"
   * (Delicate, Crystalline) escalate to the real system.broken flag via
   * _weaponNat1. Delicate also lowers the breaking threshold to a roll of
   * 1 or 2, not just 1. Nat-20 just flags the weapon for doubled damage on
   * the next damage roll — resolved in the "damage" branch above.
   *
   * EVERY ATTACK ROLL RESOLVES THE FLAG, which is why the clear below is not
   * inside the if/else chain. The flag used to be SET by a 20 and removed only
   * by the damage roll that spent it, so a 20 that was never cashed in stayed
   * armed across later attacks: crit, decline to roll damage, attack again,
   * hit on a 16, and that damage doubled. Found by the regression pass
   * 2026-09-12. The book ties the doubling to one roll — "on an unmodified
   * roll of 20, the attack deals double its ROLLED damage" (Making Attacks.md)
   * — so an attack that is not a 20 must leave no crit behind it, including a
   * fumble or a break, which is why this clears before the chain rather than
   * as its else.
   */
  _checkWeaponCrit(item, roll)
  {
    const total = roll.dice[0].total;
    const tags = item.system.tags || [];
    const breaks = tags.includes("Fragile") || tags.includes("Crystalline")
      || (tags.includes("Delicate") && total <= 2);

    if(total !== 20) this.#_criticalWeapons.delete(item.id);

    if(total === 1)
    {
      if(breaks) this._weaponNat1(item);
      // A BODY PART POSTS NOTHING (Matt, 2026-09-22). Making Attacks.md: "the
      // weapon is dropped or jams and must be retrieved or fixed before it can
      // be used again" - a Claw is neither, and the line was the only thing a
      // fumble did here, since nothing reads or enforces it. Found in Group
      // 302 and recorded rather than fixed then. `intrinsic` is the same
      // declaration Item Transfer and the dropped-items container refuse to
      // move, so the question is already answered on the Item. Breakage above
      // is untouched: a tagged intrinsic weapon still breaks, which is a real
      // consequence rather than a sentence.
      else if(!item.system.intrinsic) this._weaponFumble(item);
    }
    else if(total === 2 && tags.includes("Delicate"))
      this._weaponNat1(item);
    else if(total === 20)
      this.#_criticalWeapons.add(item.id);
  }

  _weaponFumble(item)
  {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> is dropped or jams — retrieve or clear it before attacking with it again this round.`
    });
  }

  /**
   * The heavier "actually broken" consequence — Fragile weapons and
   * Delicate/Crystalline-tagged weapons only. Strong/Indestructible negate
   * it outright; Unstable and Crystalline destroy the weapon instead of
   * just flagging it broken (an exploded or shattered weapon isn't
   * something you patch up — see work-queue.txt item 3/4 notes for the
   * reasoning). Everything else just sets system.broken, cleared manually
   * from the item sheet whenever repairs are narratively done — no
   * automated repair-day timer.
   */
  async _weaponNat1(item)
  {
    const tags = item.system.tags || [];

    if(tags.includes("Indestructible") || tags.includes("Strong"))
    {
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<b>${item.name}</b> would break, but its tags prevent it!`
      });
      return;
    }

    if(tags.includes("Unstable"))
    {
      const explosion = new Roll("2d6");
      explosion.evaluate({async: false});
      const currentHP = this.actor.system.health.value;
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<span class="knave-ability-crit knave-ability-critFailure"><b>${item.name}</b> explodes violently, dealing ${explosion.total} damage to its wielder — and is destroyed in the blast!</span>`
      });
      this._resolveHPChange(this.actor, currentHP, currentHP - explosion.total);
      await item.delete();
      return;
    }

    if(tags.includes("Crystalline"))
    {
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<span class="knave-ability-crit knave-ability-critFailure"><b>${item.name}</b> shatters into a thousand glittering pieces — utterly destroyed!</span>`
      });
      await item.delete();
      return;
    }

    await item.update({"system.broken": true});
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<span class="knave-ability-crit knave-ability-critFailure"><b>${item.name}</b> is broken!</span> It needs repair before it can be used again — clear the Broken flag on its sheet once that's done.`
    });
  }

  /**
   * Innate Item Suppression (2026-09-13) at the attack site — the one place
   * where suppression really is the `broken` shape, because an attack is a
   * click and not a sum.
   *
   * Modelled on _itemIsBroken directly below, and called from the same two
   * places, because the two answers are the same answer to the player: this
   * weapon does not work right now. The wording differs deliberately, since a
   * broken weapon needs repair and a suppressed one needs the affliction gone.
   */
  _itemIsSuppressed(item)
  {
    if(!isSuppressed(item)) return false;
    const by = suppressorsOf(item).join(", ");
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<span class="knave-ability-crit knave-ability-critFailure"><b>${item.name}</b> is suppressed!</span>`
             + ` It does nothing until <b>${by}</b> is cured or lifted.`
    });
    return true;
  }

  _itemIsBroken(item)
  {
    if(item.system.broken)
    {
      let content = '<span class="knave-ability-crit knave-ability-critFailure"><b>' + item.name + "</b> is broken!</span>";
        ChatMessage.create({
          user: game.user._id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: content
        });
      return true;
    }

    return false;
  }

  /**
   * Work-queue item 11 (2026-08-25): gates the attack/damage rolls on
   * equipped state, modeled directly on _itemIsBroken above.
   *
   * BUG FIX 2026-08-25 (found live post-testing, via Matt's question about
   * mutation-granted attacks): npc actors have no `hands`/equip concept at
   * all (template.json only adds `hands` to the character type) and every
   * one of the ~155 Bestiary creatures' weapon Items — plus every PC's
   * natural-weapon mutation Items (Beak/Claws/Horns/etc., work-queue item
   * 3.2) — got the new `equipped: false` template default with nothing to
   * ever flip it true. Left ungated, that would have silently broken every
   * NPC's attack and every natural weapon's attack. Fix: npc actors are
   * exempt outright (this method always returns false for them — no equip
   * concept ever existed for monsters); natural-weapon mutation Items are
   * fixed at their one creation site (chargen-app.js) to be born already
   * equipped instead.
   */
  _itemIsUnequipped(item)
  {
    if(this.actor.type !== "character") return false;

    if(!item.system.equipped)
    {
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: '<b>' + item.name + '</b> is not equipped!'
      });
      return true;
    }

    return false;
  }

  /**
   * Work-queue item 10.4 (2026-08-25) — a genuinely new hook, not a reuse
   * of an existing item-3 pattern: Hydraulic Biceps/Merciless Cybereyes
   * add their ability's effective bonus to a matching weaponType's damage
   * roll. Looked up live by name against IMPLANTS, same lookup style as
   * avBonus in actor.js — nothing is stored on the Item itself. Returns
   * `{amount, name}` for the first matching implant, or null.
   */
  _implantDamageBonus(item)
  {
    const weaponType = item.type === "weaponRanged" ? "ranged" : "melee";
    const actor = this.actor;
    for(const i of actor.items)
    {
      if(i.type !== "implant") continue;
      const entry = IMPLANTS.find(m => m.name === i.name);
      if(entry?.damageBonusWeaponType === weaponType)
      {
        const amount = Number(actor.system.abilities[entry.damageBonusAbility]?.effective || 0);
        if(amount) return { amount, name: entry.name };
      }
    }
    return null;
  }

  /**
   * Ranged attacks don't decrement ammo per shot — per Usage Die.md, a
   * ranged weapon's usage die rolls once per combat. If a Combat encounter
   * is active, this just flags the weapon as fired; the deleteCombat hook
   * (see usage-die.js/knave.js) resolves every flagged weapon's roll once
   * the fight ends. Outside a tracked Combat there's no "after combat"
   * moment to defer to, so it rolls immediately instead. A weapon with no
   * usage die set (system.usageDie.die === "") is treated as unlimited ammo.
   */
  async _rangedAttackRoll(item, event)
  {
    // A declared auto-hit makes no roll (RULED 2026-09-25, Matt).
    if(item.flags?.vaarn?.autoHit) return this._checkToHitTargets(null, item);
    // Blind CONDITION (JADE IBIS Combat Conditions, RULED 2026-09-16 by
    // Matt): "Blind characters cannot make ranged attacks". Refused before
    // the ammo check - the rule holds with or without ammunition - and the
    // same shape as the Dreamcage's Gift refusal. Immunity is already applied
    // by activeDeltas, so a Blind-mutation character never reaches this line
    // and keeps the mutation's own DIS below.
    if(hasStatefulCondition(this.actor, BLIND))
    {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<b>${this.actor.name}</b> is <b>Blind</b> and cannot make a ranged attack. <i>${conditionByKey(BLIND).book}</i>`
      });
      return;
    }

    if(item.system.usageDie?.die === "expended")
    {
      // A weapon that names its reload offers it instead (the Tempest Cannon,
      // RULED 2026-09-26 by Matt: 3 Water Rations refill the die).
      if(item.flags?.vaarn?.reload) return this._offerReload(item);
      this._postNoAmmoMsg(item);
      return;
    }

    // Blind (work-queue item 3.10): "DIS on ranged attacks" — forced here
    // rather than left to the player to remember, unlike Blind's other two
    // clauses (no code hook exists for those).
    const isBlind = this.actor.items.some(i => i.type === "mutation" && i.name === "Blind");
    const advVs = this._advantageVsNotes(item);
    const tDis = targetDisadvantage(item, Array.from(game.user?.targets ?? []).map(t => t.actor), hasStatefulCondition);
    const roll = this._onAbility_Clicked(this._toHitAbilityKey(item), event, isBlind || tDis.force, advVs.length > 0);
    this._checkWeaponCrit(item, roll);

    this._checkToHitTargets(roll, item);
    this._postRollNotes(this.actor, [...advVs, ...tDis.notes, ...this._attackNotes(), ...this._tagNotes(item, TO_HIT_NOTES), ...this._stormNotes(item), ...this._followUpNotes(item)]);
    // A condition the weapon inflicts - a creature attack's declared effect,
    // or a PC weapon's Entangling / Blinding tag (2026-09-16).
    this._postConditionCards(item.flags?.vaarn?.applies ?? [], item.name);

    if(!item.system.usageDie?.die) return;

    // An Exotica weapon's die rolls on EVERY use, not once per combat - the
    // Dirk's ruling (2026-09-22), applied to the Tempest Cannon 2026-09-26.
    if(game.combat && !item.flags?.vaarn?.exotica)
      await flagWeaponFiredInCombat(item, game.combat.id);
    else
      await rollUsageDie(item, this.actor);
  }

  /**
   * Refill a spent weapon from what its `reload` names - the Tempest Cannon's
   * "Reload with 3 rations of water" (RULED 2026-09-26, Matt). Literal Water
   * Rations, not the bearer's own drink: the cannon is fed, not the character.
   * Asks first; refuses with the count when there are too few, spending none.
   */
  async _offerReload(item)
  {
    const actor = this.actor;
    const { item: kind, count } = item.flags.vaarn.reload;
    // Only a SPENT die reloads: a Ud4 is either full or gone, so a loaded one
    // has nothing to top up (the sheet control is always shown).
    if(item.system.usageDie?.die !== "expended")
      return ui.notifications.info(`The ${item.name} is still loaded (${item.system.usageDie?.die}).`);
    const have = rationTotal(actor, kind);
    if(have < count)
      return this._postWoundMsg(actor, `cannot reload the <b>${item.name}</b> — it needs ${count} ${kind}s and they have ${have}.`);
    const ok = await Dialog.confirm({ title: `Reload: ${item.name}`,
      content: `<p>The <b>${item.name}</b> is spent. Reload it with ${count} ${kind}s (${have} carried)?</p>` });
    if(!ok) return;
    for(let i = 0; i < count; i++) await spendRation(actor, kind);
    await item.update({ "system.usageDie.die": item.system.usageDie.max });
    this._postWoundMsg(actor, `reloads the <b>${item.name}</b> with ${count} ${kind}s — its usage die is back to ${item.system.usageDie.max}.`);
  }

  _postNoAmmoMsg(item)
  {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<b>" + item.name + "</b> is out of ammo!"
    });
  }

  /**
   * Prompt for the HP cost die (by target Level, per Mystic Gifts.md), then
   * pay it and roll the effect. The GM/player decides how to apply the
   * result (damage, healing, or something else) — Gifts are freeform.
   */
  _onGiftUse(item)
  {
    // Mind Shield (work-queue item 10.3.10): "Cannot use Mystic Gifts" is a
    // real restriction, not flavor — blocked here rather than left as a
    // reminder, since this is the single entry point every Gift-use click
    // routes through. Only blocks while actually worn, same as every other
    // armorType effect in this codebase.
    const hasMindShield = this.actor.items.some(i =>
      i.type === "armor" && i.name === "Mind Shield" && i.system.equipped);
    if(hasMindShield)
    {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: "Your gift cannot penetrate the shielding cage on your head!"
      });
      return;
    }

    // Psyche-Suppressant weapon tag (2026-09-03): "Cannot use Mystic Gifts
    // while holding." Same shape and same entry point as Mind Shield above
    // — a real restriction rather than a reminder, blocked here because
    // every Gift-use click routes through this method. "Holding" reads as
    // equipped, the same mapping Annihilating's "drawn" got.
    const suppressor = this.actor.items.find(i =>
      (i.type === "weaponMelee" || i.type === "weaponRanged") &&
      i.system.equipped &&
      (i.system.tags || []).includes("Psyche-Suppressant"));
    if(suppressor)
    {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `The <b>${suppressor.name}</b> smothers the gift — no Mystic Gifts can be used while holding a Psyche-Suppressant weapon.`
      });
      return;
    }

    // Dreamcage (JADE IBIS, RULED 2026-09-16 by Matt): "They cannot use
    // Gifts". Carried as a condition on the affliction's board entry, so it
    // ends when the affliction is cured, and blocked here for the same reason
    // Mind Shield is - every Gift-use click routes through this method.
    if(hasStatefulCondition(this.actor, NO_GIFTS))
    {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: "The <b>Dreamcage</b> holds the mind shut — no Mystic Gifts can be used while infected."
      });
      return;
    }

    // Mystic Gift Effect Modelling (RULED 2026-09-29, Matt): a Gift with
    // defined effects asks which use this is, one button each, then the cost.
    // "Other use" keeps the freeform cast every Gift had before - the table
    // can always agree something new on the spot.
    const effects = effectsOf(item);
    if(!effects.length) return this._openGiftCostDialog(item, null);
    const choices = {};
    effects.forEach((e, i) => choices[`e${i}`] = { label: effectLabel(e), callback: () => this._openGiftCostDialog(item, e) });
    choices.other = { label: "Other use", callback: () => this._openGiftCostDialog(item, null) };
    new Dialog({ title: `Use ${item.name}`, content: "<p>How is the Gift being used?</p>", buttons: choices, default: "e0" }).render(true);
  }

  /**
   * The HP cost dialog. `effect` is the chosen entry of the Gift's effect
   * list, or null for a freeform use.
   */
  _openGiftCostDialog(item, effect)
  {
    // RULED 2026-09-28 (Matt): the table's two uses. To damage or heal, the
    // die paid IS the effect die, so the player picks the effect they want;
    // for any other effect, the combined Level of the targets sets it (the
    // book's example: nine Level 1 sleepers cost a d20). Each button says both.
    const tiers =
    [
      { die: "1d6", faces: 6, label: "d6 — d6 + PSY, or Levels 1–2" },
      { die: "1d8", faces: 8, label: "d8 — d8 + PSY, or Levels 3–4" },
      { die: "1d10", faces: 10, label: "d10 — d10 + PSY, or Levels 5–6" },
      { die: "1d12", faces: 12, label: "d12 — d12 + PSY, or Levels 7–8" },
      { die: "1d20", faces: 20, label: "d20 — d20 + PSY, or Levels 9+" },
    ];

    const buttons = {};
    for(const tier of tiers)
      buttons[tier.die] = {
        label: tier.label,
        // Gift Sustained Use Cost. A CHECKBOX rather than five more buttons:
        // sustaining does not change which die is paid, only whether it is
        // paid again, so it is orthogonal to the tier and ten buttons would
        // say otherwise.
        callback: html => this._resolveGiftUse(item, tier.die, tier.faces,
          html.find('[name="gift-sustained"]').is(":checked"), effect)
      };

    // Mystic Gift Effect Modelling (2026-09-29): for an effect that is not
    // damage or healing, the targets' combined Level picks the default die -
    // any die can still be chosen, and the Referee has the final say.
    const rolled = !effect || effect.kind === "damage" || effect.kind === "healing";
    const targets = Array.from(game.user?.targets ?? []);
    const levels = targets.reduce((n, t) => n + levelOf(t.actor), 0);
    const byLevel = rolled ? null : costDieForLevels(levels);
    const intro = !effect
      ? `<p>Choose the HP cost die. <b>To damage or heal</b>, pick the effect you want: the die you pay is the die you roll, plus PSY. <b>For any other effect</b>, pick by the targets' combined Level (nine Level 1 targets cost a d20). The Referee has the final say; the baseline is d6.</p>`
      : rolled
        ? `<p><b>${effectLabel(effect)}</b>: choose the die - you pay it in HP and roll it, plus PSY, as the ${effect.kind === "damage" ? "damage" : "healing"}. The Referee has the final say.</p>`
        : `<p><b>${effectLabel(effect)}</b>: the cost is set by the targets' combined Level${byLevel ? ` - <b>${levels}</b>, so ${byLevel.replace("1", "")} is picked` : " (nothing is targeted, so pick by the Level of whoever it is used on)"}. The Referee has the final say; the baseline is d6.</p>`;

    new Dialog(
    {
      title: `Use ${item.name}`,
      content: `${intro}
        <p><label><input type="checkbox" name="gift-sustained"> <b>Sustained</b> — hold the Gift, paying the same die again for each ten-minute period it stays active.</label></p>`,
      buttons,
      default: byLevel ?? "1d6"
    }).render(true);
  }

  async _resolveGiftUse(item, dieFormula, faces = 0, sustained = false, effect = null)
  {
    const actor = this.actor;

    const costRoll = new Roll(dieFormula);
    costRoll.evaluate({async: false});
    costRoll.toMessage({speaker: ChatMessage.getSpeaker({actor}), flavor: `<b>${item.name}</b> — HP cost`});

    const currentHP = actor.system.health.value;
    this._resolveHPChange(actor, currentHP, currentHP - costRoll.total);

    const targets = Array.from(game.user?.targets ?? []);

    // Mystic Gift Effect Modelling (2026-09-29). A prose or condition effect
    // rolls no effect die - the book's die + PSY is damage or healing - so it
    // resolves here and only the cost above was paid.
    if(effect?.kind === "prose")
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({actor}),
        // Only a label set by hand heads the text: an unlabelled prose entry's
        // label IS its text, and would print it twice (found in Group 483).
        content: `<p><b>${item.name}</b>${effect.label ? ` — ${effect.label}` : ""}</p><p>${effect.text ?? ""}</p>` });
    else if(effect?.kind === "condition")
    {
      // No save (ruled: Gifts always hit) and no clock (ruled: until the
      // Referee ends it). One Apply card per target, the Referee clicks -
      // the same card every creature's condition uses. No target captured
      // still posts one card, for the Referee to target at click time.
      const spec = giftConditionSpec(effect, item.name);
      for(const target of targets.length ? targets : [null])
        await postApplyCard({ source: actor, spec, target });
    }
    else
    {
      const psy = actor.system.abilities.psy.effective;
      const effectRoll = new Roll(`${dieFormula}+${psy}`);
      effectRoll.evaluate({async: false});
      const what = effect ? `${effectLabel(effect)} (${dieFormula}+PSY)` : `effect (${dieFormula}+PSY)`;
      await effectRoll.toMessage({speaker: ChatMessage.getSpeaker({actor}), flavor: `<b>${item.name}</b> — ${what}`});

      // Mystic Gift Damage to a Target (RULED 2026-09-26, Matt): with tokens
      // targeted, a card offers the roll as damage or as healing. The floor a
      // Gelationous-style rule reads is the die's 1 plus PSY. A defined
      // effect offers only its own button, and damage carries its type.
      await postGiftApplyCard(actor, item, effectRoll.total, 1 + psy, targets,
        effect ? { modes: [effect.kind === "healing" ? "heal" : "damage"], damageType: effect.damageType || null, label: effectLabel(effect) } : {});
    }

    // Gift Sustained Use Cost. Started AFTER the cast has been paid and rolled,
    // so the recurrence's startTime is the moment of casting and its first tick
    // lands one Exploration Turn later — which is Matt's 2026-09-13 ruling that
    // the cast covers the first ten-minute period. See startGiftSustain.
    if(!sustained || !faces) return;
    await startGiftSustain(actor, item, faces);
    ui.notifications.info(
      `${actor.name} is sustaining ${item.name} — d${faces} HP each Exploration Turn until it is ended on the Effect Board.`);
  }

  /**
   * Read a Hypergeometric Codex: an INT save (>15 succeeds, nat 20 always
   * succeeds, nat 1 always fails). Failure locks the actor out of reading
   * any further equations until a Long Rest. A natural 1 also rolls a
   * Mishap. Per Hypergeometry.md.
   */
  _onCodexRead(item, event)
  {
    const actor = this.actor;

    if(actor.system.hypergeometricLockout)
    {
      this._postWoundMsg(actor, "is too muddled to read any hypergeometric equations until a Long Rest.");
      return;
    }

    // Known equations (one of the fixed 20) resolve their effect text from
    // the table; a custom/homebrew equation name (no table match) falls back
    // to the item's own description — the INT-save resolution below applies
    // either way, since it's keyed off the reader, not the equation.
    const known = EQUATIONS.find(e => e.name === item.system.equation);
    const equationName = known ? known.name : (item.system.equation || item.name);
    const rawEffect = known ? known.effect : (item.system.description || "(no effect text set on this codex)");

    if(!known && !item.system.equation && !item.system.description)
    {
      ui.notifications.warn(`${item.name} has no equation or description set — set one on the item first.`);
      return;
    }

    const intBonus = actor.system.abilities.int.effective;
    const roll = this._rollD20(intBonus, `Read ${item.name}`, event);
    const natural = roll.dice[0].total;
    // Saving Throw Resolution Duplication (2026-09-13): resolved through the
    // one shared function rather than restating the nat-20 / nat-1 / exceed
    // clauses. SAVE_TARGET is Saving Throws.md's 15.
    const verdict = resolveSave(roll.total, natural, SAVE_TARGET);
    const succeeded = verdict.passed;

    if(succeeded)
    {
      this._postWoundMsg(actor, `<b>${equationName}</b> succeeds — ${substituteINT(rawEffect, intBonus)}`);
      // Freeze's damage to its targets (Hypergeometric Equation Damage to a
      // Target, RULED 2026-09-26, Matt): a card, the targets as read.
      if(known?.targetDamage)
        postEquationDamageCard(actor, equationName, known.targetDamage, intBonus, Array.from(game.user?.targets ?? []));
      // Radiance and Web declare a Combat Condition for [INT] rounds
      // (2026-09-16); INT is the reader's bonus, resolved here the same way
      // substituteINT resolved it in the line above. Web's multi-target
      // one-round form is the reader's choice at the table, and the card's
      // text carries the whole equation for that.
      if(known?.applies)
      {
        const a = { ...known.applies };
        if(a.amount === "INT") a.amount = intBonus;
        // Singularity and Reflective Ward name [INT] in their card text too
        // (Round-Duration Expiry, 2026-09-23).
        if(a.text) a.text = substituteINT(a.text, intBonus);
        // Radiance's creatures "must DEX Save vs [INT] rounds of Blindness":
        // a save card per targeted creature since 2026-09-24 (RULED, Matt), and
        // a failed roll puts the Blind on. An equation with no save for its
        // targets keeps the apply card.
        if(known.save)
          postSaveCardsToTargets(actor, equationName, [{ ...known.save, vs: substituteINT(known.save.vs, intBonus) }], [], [a]);
        else
          this._postConditionCards([a], equationName);
      }
      return;
    }

    actor.update({'system.hypergeometricLockout': true});
    this._postWoundMsg(actor, `<b>${equationName}</b> fails — the reader is muddled and cannot read any more equations until a Long Rest.`);

    // Reads the VERDICT's reason rather than re-testing the die, so the one
    // place that decides what a natural 1 means is saves.js. The mishap is a
    // consequence of the save having failed THAT way, not of the number.
    if(verdict.reason === "nat1")
    {
      const mishapRoll = new Roll("1d20");
      mishapRoll.evaluate({async: false});
      const mishap = MISHAPS[mishapRoll.total - 1];
      mishapRoll.toMessage({speaker: ChatMessage.getSpeaker({actor}), flavor: `Hypergeometric Mishap roll`});
      this._postWoundMsg(actor, `<b>Mishap: ${mishap.name}</b> — ${substituteINT(mishap.effect, intBonus)}`);
      // Planeyfied declares its [INT] days of flatness (2026-09-21), resolved
      // exactly as an equation's applies is above.
      if(mishap.applies)
      {
        const a = { ...mishap.applies };
        if(a.amount === "INT") a.amount = intBonus;
        if(a.text) a.text = substituteINT(a.text, intBonus);
        this._postConditionCards([a], `Mishap: ${mishap.name}`);
      }
    }
  }

  /**
   * Grow a Bloomboon's part or fruit - foundry-system-index.csv "Bloomboon
   * Growth". An ability cost is carried on the part (actor.js subtracts it
   * from the base); an HP cost is rolled and paid through _resolveHPChange, so
   * a roll to 0 or below gives a Wound as combat damage does (Matt, 2026-09-24).
   */
  /**
   * Sapling Retainers - "Spend d4 points of CON to create an equal number of
   * Sapling Retainers ... They serve you for the rest of the day before
   * withering." (Actor Spawning wiring, 2026-09-25.) The CON is ordinary
   * ability damage - the book puts no bar on healing it, unlike a grown part.
   * The saplings spawn beside the grower, loyal, and carry a flag that Start
   * the day reads to REMIND the Referee they wither (RULED by Matt: a
   * reminder, not a deletion).
   */
  async _raiseRetainers(boon)
  {
    const actor = this.actor;
    const { ability, dice } = boon.retainers.cost;
    const roll = await new Roll(dice).evaluate({ async: true });
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<b>${boon.name}</b> — ${ability.toUpperCase()} spent, one ${boon.retainers.creature} for each point` });
    const total = Number(actor.system.abilities?.[ability]?.woundDamage ?? 0) + roll.total;
    await actor.update({ [`system.abilities.${ability}.woundDamage`]: total });
    const spawned = await spawnBeside(actor, boon.retainers.creature, roll.total, { loyal: true });
    if(!spawned) return ui.notifications.warn(`"${boon.retainers.creature}" is not in the Bestiary compendium.`);
    for(const a of spawned) await a.setFlag("vaarn", "withersAtDayStart", { grower: actor.name, boon: boon.name });
    this._postWoundMsg(actor, `spends <b>${roll.total} ${ability.toUpperCase()}</b> and raises ${spawned.map(a => a.name).join(", ")} `
      + `— they serve until the day ends.`);
  }

  async _growBloomboon(boon)
  {
    const actor = this.actor;
    const refusal = growthRefusal(actor, boon.grows);
    if(refusal)
    {
      ui.notifications.warn(refusal);
      return;
    }
    if(boon.grows.part)
    {
      const { ability, amount } = boon.grows.cost;
      await actor.createEmbeddedDocuments("Item", [partItemData(boon)]);
      this._postWoundMsg(actor, `grows a <b>${boon.grows.part.name}</b> (${boon.name}) — ${ability.toUpperCase()} base −${amount} while it lives.`);
      return;
    }
    const cost = new Roll(boon.grows.cost.hp);
    cost.evaluate({async: false});
    await cost.toMessage({speaker: ChatMessage.getSpeaker({actor}), flavor: `<b>${boon.name}</b> — HP spent growing a ${boon.grows.fruit.name}`});
    await actor.createEmbeddedDocuments("Item", [fruitItemData(boon, cost.total)]);
    const currentHP = actor.system.health.value;
    this._resolveHPChange(actor, currentHP, currentHP - cost.total);
  }

  /**
   * An hour's heal the bearer rolls - Photosynthesis's d8 + CON and Leaves' d4
   * (the shared copy since 2026-09-26, when Leaves was wired). The hour itself
   * is the table's: Hour-Long Healing on the Activity Clock is DECLINED.
   *
   * Deprived State is GATED BEFORE THE ROLL, not after: rolling and then
   * refusing the HP shows the player a number they did not get, which reads as
   * a bug rather than as a rule. "As though starting from 0" is Healing.md's
   * floor clause (healFloor, 2026-09-11) - a character at -3 HP would otherwise
   * have three points of the roll eaten by the debt. Deathblight halves the
   * gain, per slot (scaleHealing).
   */
  _hourlyHeal(actor, formula, flavor, verb, gateLabel)
  {
    if(blocksHealing(actor, gateLabel)) return;
    const roll = new Roll(formula);
    roll.evaluate({async: false});
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
    const before = actor.system.health.value;
    const full = Math.min(actor.system.health.max, healFloor(before) + roll.total);
    const { gained, note } = scaleHealing(actor, full - before);
    const after = before + gained;
    if(gained > 0) actor.update({ "system.health.value": after });
    this._postWoundMsg(actor, gained > 0
      ? `${verb} — restores <b>${gained}</b> HP${gmHP(actor, ` (now ${after}/${actor.system.health.max})`)}.${note}`
      : note
        ? `${verb} — restores no HP.${note}`
        : `${verb}, but is already at full HP.`);
  }

  /**
   * Dispatcher for an ancestry special rule's "use" icon click, keyed by
   * `system.rule` — foundry-system-index.csv "Ancestry Rule as Rollable
   * Item", Matt's ruling 2026-09-01 from testing item 62.4.
   *
   * Keyed off `system.rule` rather than item.name deliberately: the
   * display name folds in the rolled variant ("Twice Born: Soldier",
   * "Bloomboon: Glue Resin") per Matt's design, so name-keying would break
   * the moment a player renamed one. Same dispatcher shape as
   * _onMutationUse/_onImplantUse below, and like those the four rules
   * behave completely differently, so there is nothing to factor out
   * beyond the routing.
   *
   * - Twice Born: a real INT save, the bearer's own — the rule says "you
   *   may make INT saves to recall information", so it routes straight
   *   through the shared ADV/DIS-aware roller like Frog Tongue does.
   * - Photosynthesis: rolls d8 + CON and heals, clamped to max HP for the
   *   same reason _applyAttackHeals clamps — _resolveHPChange writes an
   *   increase through uncapped.
   * - Spores: a real CON save, plus the once-per-day lockout the rule
   *   describes. Modelled on _onCodexRead's hypergeometricLockout exactly,
   *   including being cleared by hand from the sheet.
   * - Bloomboons: descriptive-only for now. The individual Bloomboon
   *   effects are their own 20 atoms; the eight that compel a target to
   *   save are waiting on Compel-a-Target Save, which today only knows
   *   about Exotica names.
   */
  _onAncestryRuleUse(item, event)
  {
    const actor = this.actor;
    const variant = item.system.variant;

    if(item.system.rule === "Twice Born")
    {
      const intBonus = actor.system.abilities.int.effective;
      this._rollD20(intBonus, `Twice Born — recall what ${variant ? `the ${variant.toLowerCase()}` : "the original body"} knew`, event);
      return;
    }

    // Ambusher and Worm Wise - the Faa Nomad's two rules in JADE IBIS, which
    // replaced Worm Rider (RULED 2026-09-21, Matt). The roll is made here so
    // the Jinx reaches it; what it means is ancestry-rule-effects.js's.
    if(item.system.rule === "Ambusher")
    {
      const opponent = Array.from(game.user?.targets ?? [])[0]?.actor ?? null;
      if(!opponent)
        return ui.notifications.warn("Ambusher is an opposed PSY Save. Target the creature you are trying to ambush first.");
      const psy = actor.system.abilities.psy.effective;
      const roll = this._rollD20(psy, "Ambusher — opposed PSY Save", event);
      const out = ambusherOutcome(roll.total, roll.dice[0].total, opponent);
      this._postWoundMsg(actor, out.text);
      return;
    }
    // Inheritor - the True-kin's. Rolls with or without a target; see
    // inheritorOutcome for why it does not refuse the way Ambusher does.
    if(item.system.rule === "Inheritor")
    {
      const machine = Array.from(game.user?.targets ?? [])[0]?.actor ?? null;
      const ego = actor.system.abilities.ego.effective;
      const roll = this._rollD20(ego, "Inheritor — opposed EGO Save", event);
      const out = inheritorOutcome(roll.total, roll.dice[0].total, machine);
      this._postWoundMsg(actor, out.text);
      return;
    }
    if(item.system.rule === "Worm Wise")
    {
      const ego = actor.system.abilities.ego.effective;
      const roll = this._rollD20(ego, "Worm Wise — EGO Save to charm the Sandworm", event);
      const out = wormWiseOutcome(roll.total, roll.dice[0].total);
      this._postWoundMsg(actor, out.text);
      return;
    }

    // Repairs — Synth Part Repair, 2026-09-12. The hour is narrative rather
    // than on the activity clock; see synth-repair.js for the ruling, and for
    // why Photosynthesis below is deliberately built the same way.
    //
    // ALL THE RULES ARE IN synth-repair.js AND NONE ARE HERE. This branch owns
    // exactly one thing a module cannot: asking WHICH Wound, when HP is full
    // and the character is carrying more than one. That is the same split
    // _onLongRest already uses for the full-HP recovery choice.
    if(item.system.rule === "Repairs")
    {
      repair(actor).then(result =>
      {
        if(result?.branch !== "wound") return;
        this._promptRepairWound(actor, result.wounds);
      });
      return;
    }

    if(item.system.rule === "Photosynthesis")
    {
      // Deprived State. GATED BEFORE THE ROLL, not after: rolling d8+CON and
      // then refusing the HP shows the player a number they did not get, which
      // reads as a bug rather than as a rule. The book's first clause is
      // absolute — "cannot heal lost HP" — and rooting in damp soil is not a
      // Rest, so this is that clause and not the Rests one.
      this._hourlyHeal(actor, `1d8+${actor.system.abilities.con.effective}`,
        "<b>Photosynthesis</b> — one hour rooted in damp soil under Urth's sun", "photosynthesises", "photosynthesising");
      return;
    }

    if(item.system.rule === "Spores")
    {
      if(actor.system.sporeLockout)
      {
        this._postWoundMsg(actor, "has no spores left to release today.");
        return;
      }

      const conBonus = actor.system.abilities.con.effective;
      const roll = this._rollD20(conBonus, `Release ${variant || "Spores"}`, event);
      // Saving Throws.md's target, same as every other save in this sheet.
      const natural = roll.dice[0].total;
      // Saving Throw Resolution Duplication (2026-09-13), same shared resolver
      // as the Codex read above.
      const succeeded = resolveSave(roll.total, natural, SAVE_TARGET).passed;
      // The rule caps targets by Level, not by the roll — it applies on a
      // success and a failure alike; failing only ends the day's supply.
      const level = actor.system.level?.value ?? 1;
      const targets = `affects up to <b>${level}</b> Biological target${level === 1 ? "" : "s"}`;

      if(succeeded)
        this._postWoundMsg(actor, `releases <b>${variant || "spores"}</b> — ${targets}.`);
      else
      {
        actor.update({ "system.sporeLockout": true });
        this._postWoundMsg(actor, `releases <b>${variant || "spores"}</b> — ${targets}, but the Save fails: no more spores today.`);
      }
      // Compel-a-Target Save, 2026-09-22. The spores are out either way, so
      // the targets' save cards follow on a success and a failure alike: the
      // spore_table entry declares the save, or a TOX die for Toxic Spores
      // (RULED by Matt: the TOX card, so a failure raises the Toxin Die).
      const spore = (SPARK_TABLES["Mycomorph"]?.spore_table ?? []).find(s => s.name === variant);
      if(spore?.toxSave) postToxSaves(actor, variant, spore.toxSave);
      else if(spore?.save)
      {
        // Round-Duration Expiry, 2026-09-23: the d6 rounds a failed save
        // starts. Since 2026-09-24 they ride the save card itself, and a
        // failed roll puts them on - no apply card follows.
        postSaveCardsToTargets(actor, variant, [spore.save], [], spore.applies ? [spore.applies] : []);
      }
      return;
    }

    if(item.system.rule === "Bloomboons")
    {
      // A Bloomboon whose table entry declares a span on its targets posts the
      // apply card for it (Empathogen and Soporific Pollen, 2026-09-21). The
      // save and the once-per-day stay the table's, as for Gas Glands.
      const boon = (SPARK_TABLES["Neobloom"]?.bloomboon_table ?? []).find(b => b.name === variant);
      // Mirrored Leaves is the Neobloom's OWN save, Mirror Shield's shape
      // (RULED 2026-09-22, Matt), so it goes down the Save-Gated Effect path.
      if(boon?.saveGated) return this._onSaveGatedUse(item, event);
      // An ongoing hold the boon puts on its targets - Vampiric Roots
      // (Per-Round Effect Reminder wiring, 2026-09-25). Its escape save rides
      // the hold, so no save card is posted here.
      if(boon?.hold) return this._holdTargets(variant, boon.hold);
      // A Bloomboon that compels its targets to save posts one card per
      // targeted creature (Compel-a-Target Save, 2026-09-22), beside the apply
      // card for any span it declares.
      if(boon?.applies || boon?.save)
      {
        this._postWoundMsg(actor, `releases <b>${variant}</b> — ${boon.effect}`);
        // The apply card waits for the save cards, so it follows them rather
        // than landing between two targets' cards (Group 314).
        // A save carries the effect and puts it on when failed (2026-09-24);
        // only a Bloomboon with no save leaves it on an apply card.
        if(boon.save) postSaveCardsToTargets(actor, variant, [boon.save], [], boon.applies ? [boon.applies] : []);
        else this._postConditionCards([boon.applies], variant);
        return;
      }
      // Bloomboon Growth (RULED 2026-09-24, Matt): a Bloomboon that grows a
      // part or a fruit pays for it and makes the Item. No action is spent.
      if(boon?.grows) return this._growBloomboon(boon);
      // Sapling Retainers (Actor Spawning wiring, 2026-09-25).
      if(boon?.retainers) return this._raiseRetainers(boon);
      this._postWoundMsg(actor, `draws on <b>${variant || "their Bloomboon"}</b> — resolve its effect by hand.`);
      return;
    }
  }

  /**
   * Dispatcher for a mutation's "use" icon click, keyed by item.name — each
   * of the three mutations wired to MUTATIONS_WITH_USE_ICON (knave.js)
   * behaves completely differently, so there's no single shared behavior
   * to factor out here beyond the click-routing itself.
   *
   * - Ink Ducts (work-queue item 3.6): spends a daily use-pool charge.
   *   Descriptive-only — per Matt's 2026-08-23 ruling, this is the
   *   TARGET's DEX save vs blindness, not the bearer's own save (mutation
   *   text says "causing an opponent to DEX save"), and no automated roll
   *   is triggered; same philosophy as item 14's roll-notes, GM/player
   *   adjudicates by hand.
   * - Frog Tongue (work-queue item 3.7): a real rolled DEX save — this is
   *   the bearer's own save (text says "DEX save to snatch weapons"), so
   *   it's routed straight through the shared _rollD20 roller for a real
   *   ADV/DIS-aware roll, same as a plain DEX ability check.
   * - Silk Production (work-queue item 3.7): descriptive-only until
   *   2026-09-26, when the opposed save card and the hold's escape existed
   *   to hook it into - see the branch below.
   */
  _onMutationUse(item, event)
  {
    const actor = this.actor;

    if(item.name === "Frog Tongue")
    {
      this._rollD20(this.object.system.abilities.dex.effective, "Frog Tongue", event);
      return;
    }

    // Apply Effect to Target wiring, RULED 2026-09-26 (Matt): a save card per
    // targeted enemy, DEX against 10 + this bearer's DEX; a failure entangles
    // them with a DEX escape on their turn (the roster's applies.escape).
    if(item.name === "Silk Production")
    {
      this._postWoundMsg(actor, `produces sticky web from their <b>Silk Production</b>!`);
      const silk = MUTATION_TABLE.find(m => m.name === item.name);
      postSaveCardsToTargets(actor, item.name, [silk.save], [], [silk.applies]);
      return;
    }

    // Gas Glands (Blinding) - Update Built Content for Blind and Entangled,
    // 2026-09-16. JADE: "Once per day, you can release a cloud of blinding
    // gas, which affects all biological targets in the room. Creatures in the
    // cloud must CON Save or be blinded for d6 rounds." Descriptive on the
    // save, like Ink Ducts, and the once-per-day is the player's to keep; the
    // condition and its d6 ride the apply card, rolled once there.
    // Gas Glands (Sleeping) joins the same branch (Activated Mutation Use
    // wiring, RULED 2026-09-26 by Matt): EGO, and Asleep for d6 rounds.
    if(item.name === "Gas Glands (Blinding)" || item.name === "Gas Glands (Sleeping)")
    {
      this._postWoundMsg(actor, item.name === "Gas Glands (Blinding)"
        ? `releases a cloud of blinding gas from their <b>Gas Glands</b>! Biological creatures in the room must CON Save or be blinded for d6 rounds.`
        : `releases a cloud of soporific gas from their <b>Gas Glands</b>! Biological creatures in the room must EGO Save or fall asleep for d6 rounds.`);
      // A save card per targeted creature since 2026-09-24 (RULED, Matt): a
      // failed roll puts the Blind on, so no apply card follows.
      const row = MUTATION_TABLE.find(m => m.name === item.name);
      if(row?.save) postSaveCardsToTargets(actor, item.name, [row.save], [], row.applies ? [row.applies] : []);
      else if(row?.applies) this._postConditionCards([row.applies], item.name);
      return;
    }

    // Leaves (Activated Mutation Use wiring, RULED 2026-09-26 by Matt): "Regain
    // d4 HP per hour when resting in sunlight." One click is one hour; the hour
    // is the table's (Hour-Long Healing on the Activity Clock, DECLINED).
    if(item.name === "Leaves")
    {
      this._hourlyHeal(actor, "1d4", "<b>Leaves</b> — one hour resting in sunlight", "rests in sunlight", "resting in sunlight");
      return;
    }

    // Ink Ducts — unchanged behavior from work-queue item 3.6.
    if(item.system.usesRemaining <= 0)
    {
      this._postWoundMsg(actor, `has no uses of <b>${item.name}</b> left today.`);
      return;
    }

    item.update({"system.usesRemaining": item.system.usesRemaining - 1});
    this._postWoundMsg(actor, `sprays ink from their <b>Ink Ducts</b>! The target must DEX save or be blinded.`);
    // One round of Blind on the apply card (2026-09-16), from the roster entry.
    // Rolled from a save card since 2026-09-24; a failure puts the Blind on.
    const ink = MUTATION_TABLE.find(m => m.name === item.name);
    if(ink?.save) postSaveCard(actor, item.name, [ink.save], [], { applies: ink.applies ? [ink.applies] : [] });
    else if(ink?.applies) this._postConditionCards([ink.applies], item.name);
  }

  /**
   * Reset a mutation's daily use pool to its full size. Quiet state reset, no
   * chat message — "once per day" timing is deliberately GM/player-adjudicated,
   * not code-enforced (Matt's ruling), and this button remains the override
   * that says so.
   *
   * THE SIZE COMES FROM daily-pool.js as of 2026-09-20, not from a formula
   * written out here. A Long Rest refills the same pools now, and two places
   * computing "the bearer's Level" separately is how they would come to
   * disagree about it.
   */
  _onMutationRefresh(item)
  {
    item.update({"system.usesRemaining": dailyPoolSize(this.actor, item)});
  }

  /**
   * Use an implant with an active effect — work-queue items 10.2/10.6/10.7
   * (2026-08-25/26). Name-keyed dispatcher, same shape as _onMutationUse:
   * - Alluring Fakeface: "EGO save to enthrall a Biological creature" is
   *   the BEARER's own save (the implant makes its wearer alluring, not
   *   the target) — same "bearer rolls their own ability" shape as Frog
   *   Tongue, routed straight through the shared _rollD20 roller for a
   *   real ADV/DIS-aware roll.
   * - Dream Artefact Assembler (PSY) / Quantum Tunnelling BlinkPack (INT):
   *   same "bearer rolls their own ability" shape as Alluring Fakeface.
   * - Combat Voxbox: Matt's ruling (item 10.7) is display-only — no clean
   *   way to apply "damage + Morale check to all creatures with ears" to
   *   a specific target (could even hit the user), so this posts a real
   *   d8 roll for reference and leaves resolution to the table.
   * - Trauma-Response Rig: "negate the effects of a Wound" is
   *   deliberately descriptive-only, same philosophy as Ink Ducts — this
   *   codebase has no "pick a specific Wound" UI to hook an auto-removal
   *   into safely (a character could have several), so this just spends
   *   the pool charge and points the player at the existing Wounds-tab
   *   delete icon to remove one by hand.
   * - Berserker StimRig (item 10.8, 2026-08-27): the first genuine
   *   toggleable active-state effect in this codebase. Requires an active
   *   combat to activate, and — Matt's ruling — has NO deactivate path at
   *   all (a stimulant injection isn't something you consciously switch
   *   off); it only ends when that combat does, via knave.js's
   *   deleteCombat hook. Re-clicking while already active just posts the
   *   rig's own in-universe refusal message, not a way to end it early.
   */
  _onImplantUse(item, event)
  {
    const actor = this.actor;

    if(item.name === "Alluring Fakeface")
    {
      this._rollD20(this.object.system.abilities.ego.effective, "Alluring Fakeface", event);
      return;
    }

    // Dream Artefact Assembler / Quantum Tunnelling BlinkPack — work-queue
    // item 10.7 (2026-08-26): same "bearer rolls their own ability" shape
    // as Alluring Fakeface/Frog Tongue above.
    if(item.name === "Dream Artefact Assembler")
    {
      this._rollD20(this.object.system.abilities.psy.effective, "Dream Artefact Assembler", event);
      return;
    }

    if(item.name === "Quantum Tunnelling BlinkPack")
    {
      this._rollD20(this.object.system.abilities.int.effective, "Quantum Tunnelling BlinkPack", event);
      return;
    }

    // Magnetised Palms (Synthetic Mind Magnetic Damage, RULED 2026-09-28 by
    // Matt): generating the field is a magnetic field for a nearby Synth, so
    // the card carries the same d6-INT-each-round button as the Magneticrab
    // and the Orb. Sticking to metal stays text (ruled 2026-09-27).
    if(item.name === "Magnetised Palms")
    {
      import("../combat/metal-cards.js").then(({ synthMindButton }) =>
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
          content: `<p><b>${actor.name}</b> generates a powerful magnetic field with <b>Magnetised Palms</b>, and can stick to metallic objects.</p>`
            + synthMindButton(`${actor.name}'s Magnetised Palms`) }));
      return;
    }

    // Combat Voxbox — work-queue item 10.7 (2026-08-26). Matt's ruling:
    // display-only. There's no clean way to apply "d8 damage + Morale
    // check to all creatures with ears" to a specific target (it could
    // even hit the user), so this rolls a real d8 for reference and
    // leaves the damage/Morale check to be resolved manually.
    if(item.name === "Combat Voxbox")
    {
      const r = new Roll("1d8");
      r.evaluate({async: false});
      r.toMessage({ flavor: `<b>${this.actor.name}</b> screams through their <b>Combat Voxbox</b>! ${r.total} damage to all creatures with ears in range — resolve manually, and have each make a Morale check.` });
      return;
    }

    // Berserker StimRig — work-queue item 10.8 (2026-08-27). Fiction-locked
    // toggle: a stimulant injection isn't something a character can
    // consciously switch off, so there is deliberately NO deactivate path
    // here at all — the only way it ends is the triggering combat ending
    // (see knave.js's deleteCombat hook). Activating requires an active
    // combat (Matt's ruling, same gate Berserker Brew uses below).
    if(item.name === "Berserker StimRig")
    {
      if(actor.getFlag("vaarn", "berserkerActive"))
      {
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: "SYSTEM: Berserker protocol engaged. Re-activation refused." });
        return;
      }
      if(!game.combat)
      {
        ui.notifications.warn("Berserker StimRig can only be activated during combat.");
        return;
      }
      // "melee" is the StimRig's own word — "you take and deal double melee
      // damage" — and stays its scope now that the Brew no longer shares it.
      actor.setFlag("vaarn", "berserkerActive", "melee");
      this._postWoundMsg(actor, `activates their <b>Berserker StimRig</b> — battle madness overtakes them! Double melee damage dealt and received until combat ends.`);
      return;
    }

    // Trauma-Response Rig — unchanged behavior from work-queue item 10.2.
    if(item.system.usesRemaining <= 0)
    {
      this._postWoundMsg(actor, `has no uses of <b>${item.name}</b> left today.`);
      return;
    }

    item.update({"system.usesRemaining": item.system.usesRemaining - 1});
    this._postWoundMsg(actor, `activates their <b>${item.name}</b>! Remove one Wound by hand from the Wounds tab.`);
  }

  /**
   * Save-Gated Effect: the character saves to make their own thing work, and
   * both branches do something.
   *
   * NOT A DISPATCHER, which is the point of it. _onMutationUse, _onImplantUse
   * and _onExoticaUse each branch on an item's NAME and hold that entry's
   * behaviour inline; this one reads a declared spec and holds no entry's
   * behaviour at all. Adding a save-gated entry is a roster edit with no
   * change here.
   *
   * The order is: refuse before rolling (so a refusal costs nothing), roll
   * through _rollD20 so ADV/DIS keeps living in one place, resolve through
   * combat/saves.js so the nat-20/nat-1/exceed clauses keep living in one
   * place, then let save-gated.js apply the branch.
   */
  async _onSaveGatedUse(item, event)
  {
    const actor = this.actor;
    const found = saveGatedSpecFor(item);
    if(!found) return;
    const { spec } = found;

    const refusal = saveGatedRefusal(actor, item);
    if(refusal)
    {
      ui.notifications.warn(refusal);
      return;
    }

    if(spec.prompt) this._postWoundMsg(actor, spec.prompt);

    const score = actor.system.abilities[spec.ability]?.effective ?? 0;
    const roll = this._rollD20(score, `${spec.ability.toUpperCase()} Save — ${item.name}`, event);
    const verdict = resolveSave(roll.total, roll.dice[0].total, SAVE_TARGET);

    const report = await applySaveGated(actor, item, verdict);
    if(report) this._postWoundMsg(actor, report.content);
  }

  /**
   * Reset an implant's daily use pool to its full size. Trauma-Response Rig is
   * a flat 1-per-day cap (its own text: "once per day"), not Level-scaled like
   * Ink Ducts — a difference that now lives in daily-pool.js's spec rather than
   * being hardcoded here, so the Long Rest refill and this button cannot come to
   * disagree about what full means. "Once per day" timing itself stays
   * GM/player-adjudicated, same as _onMutationRefresh.
   */
  _onImplantRefresh(item)
  {
    item.update({"system.usesRemaining": dailyPoolSize(this.actor, item)});
  }

  /**
   * Use a generic `type: "item"` Item with an active effect — work-queue
   * items 10.8/10.3.8 (2026-08-27). Elixirs have no dedicated Item type of
   * their own (chargen-app.js creates them as plain `type: "item"`), so
   * this is a new, separate name-keyed dispatcher from _onMutationUse/
   * _onImplantUse rather than folding a type-check into either of those.
   * - Berserker Brew: shares Berserker StimRig's exact fiction-locked
   *   toggle (see _onImplantUse) — requires an active combat, sets the
   *   same actor flag, and is consumed on drink (standard one-time Elixir
   *   behavior). "Must always attack the closest living being" is posted
   *   as descriptive-only text, same pattern Silk Production already
   *   established for a narrative restriction with no code enforcement.
   * - Hilarious Strength / Spineskin Syrup / Lithification Syrup /
   *   Regeneration Serum (item 10.3.8.2, 2026-08-27): Matt's ruling after
   *   reviewing what each would actually need — real elapsed-time hours,
   *   a per-combat-round tick, a blanket damage-immunity check, none of
   *   which exists anywhere in this codebase — was to build NONE of it.
   *   Purely descriptive: the full effect and duration text posts to
   *   chat, the Elixir is consumed, nothing else happens in code. GM/
   *   player adjudicates the actual timing and effects by hand, same
   *   philosophy as Ink Ducts'/mutation-refresh's daily-timing being
   *   GM-adjudicated, just applied to a duration instead of a cadence.
   */
  async _onGenericItemUse(item)
  {
    const actor = this.actor;

    // Elixir-Granted Ability Item (2026-09-23): an Item a drink put on the
    // sheet. Its use is the elixir's, read from the roster row; it is gated
    // on the flag rather than the name because the name is content.
    if(isGrantedAbility(item))
      return useGrantedAbility(this, item);

    if(item.name === "Berserker Brew")
    {
      if(!game.combat)
      {
        ui.notifications.warn("Berserker Brew can only be drunk during combat.");
        return;
      }
      // "all", not melee: the Brew's own text is "They deal and receive double
      // damage" with no melee clause. It set the same value as the StimRig
      // until 2026-09-19 and so inherited the StimRig's narrower reading.
      await actor.setFlag("vaarn", "berserkerActive", "all");
      // Elixir-Granted Ability Item, RULED 2026-09-23 (Matt): the Brew's
      // granted ability is the way OUT - the EGO save to exit the frenzy -
      // so the Item created here is what rolls it. Combat's end removes it
      // with the flag (knave.js), a success removes it itself.
      const exit = await grantAbility(actor, ELIXIRS.find(e => e.name === "Berserker Brew"));
      await item.delete();
      this._postWoundMsg(actor, `drinks <b>Berserker Brew</b> and flies into a battle frenzy — double damage dealt and received, melee or ranged, until combat ends. Must always attack the closest living being. <i>(<b>${exit.name}</b> on the sheet rolls the EGO Save that ends it.)</i>`);
      return;
    }

    // Elixir Brewing / Antidotes (2026-09-19). Before the elixirs below
    // because an antidote is not on the sample table and has its own rule:
    // it cures the Toxin Die it is rated for, and is kept when it cannot.
    const antidoteDie = antidoteDieOf(item.name);
    if(antidoteDie) return this._useAntidote(item, antidoteDie);

    if(permanentAbilitySpecFor(item.name))
      return this._usePermanentAbilityElixir(item);

    // A permanent, additive change to what the character IS - Planeyfication
    // Potion (2026-09-24). Before the duration path, since it has no span.
    if(ELIXIRS.find(e => e.name === item.name)?.permanentChange)
      return this._usePermanentChangeElixir(item);

    // A roll on another generator whose result is a new Actor - Metamorphic
    // Syrup (Grant-a-Roll on Another Table, 2026-09-24).
    if(ELIXIRS.find(e => e.name === item.name)?.grantsRoll)
      return this._useGeneratorElixir(item);

    // A permanent Item that carries a baked bonus - Hollowheart Hooch's
    // chest slots (Baked Flat-Bonus Fields, 2026-09-24).
    if(ELIXIRS.find(e => e.name === item.name)?.bakedItem)
      return this._useBakedItemElixir(item);

    // The Referee's pick from another roster - Geneshock Tonic, Transcendence
    // Tonic (Grant-a-Roll on Another Table, chosen form, 2026-09-24).
    if(ELIXIRS.find(e => e.name === item.name)?.grantsPick)
      return this._usePickElixir(item);

    // One specific grant - Recursive Infusion's Recursive Gaze (Grant-a-Roll
    // on Another Table, the chosen form with one option, 2026-09-24).
    if(ELIXIRS.find(e => e.name === item.name)?.grantsFixed)
      return this._useFixedGrantElixir(item);

    // A spawn from the Bestiary - Broodling Broth (Actor Spawning from
    // Bestiary, 2026-09-24).
    if(ELIXIRS.find(e => e.name === item.name)?.spawns)
      return this._useSpawnElixir(item);

    // Character Split/Clone (2026-09-18) - before the duration elixirs,
    // because the Brew's effect is a second Actor, not a delta.
    if(item.name === BIFURCATING_BREW)
      return bifurcate(item, (actor, msg) => this._postWoundMsg(actor, msg));

    // A clone that dissolves with the span - Doppeldraught (Character
    // Split/Clone, 2026-09-24). Before the duration path for the Brew's reason.
    if(ELIXIRS.find(e => e.name === item.name)?.clone)
      return cloneFromElixir(item, (actor, msg) => this._postWoundMsg(actor, msg));

    if(statefulElixirNames().has(item.name))
      return this._useDurationElixir(item);

    // An Elixir that SETS the drinker's HP - Death Draught, "immediately
    // reduced to 0 HP". RULED 2026-09-23 (Matt): through the normal HP
    // pipeline, so whatever 0 HP already triggers runs as it would from a
    // blow, and the vial is used up.
    const setsHP = ELIXIRS.find(e => e.name === item.name && Number.isFinite(e.setsHP));
    if(setsHP)
    {
      this._postWoundMsg(actor, `drinks <b>${item.name}</b> — ${setsHP.effect}`);
      item.delete();
      const currentHP = actor.system.health.value;
      if(setsHP.setsHP < currentHP) this._resolveHPChange(actor, currentHP, setsHP.setsHP);
      return;
    }

    // An Elixir whose drinker makes somebody ELSE save - Glittercough Tonic,
    // Puppeteer Potion (Compel-a-Target Save, 2026-09-22). One card per
    // targeted creature, the condition's apply card beside it, and the vial is
    // drunk like any other.
    const compel = ELIXIRS.find(e => e.name === item.name && e.save);
    if(compel)
    {
      // Elixir-Granted Ability Item (2026-09-23): the save cards moved from
      // the drink to the USE of the Item it grants. Glittercough's Item is
      // single-use; Puppeteer's carries its own 4-turn span on the board,
      // whose end removes the Item. An elixir with a save and no `grants`
      // keeps the old shape - cards at the drink.
      if(compel.grants)
      {
        const granted = await grantAbility(actor, compel);
        if(compel.grants.span)
          await activateRoundEffect(item, {
            rounds: this._resolveDurationToken(compel.grants.span.amount),
            unit: compel.grants.span.unit,
            grantedItemId: granted.id
          });
        this._postWoundMsg(actor, `drinks <b>${item.name}</b> — ${compel.effect} `
          + `<i>(grants <b>${granted.name}</b> on the sheet${compel.grants.singleUse ? ", once" : compel.grants.span ? ` for ${compel.grants.span.amount} ${compel.grants.span.unit === "turn" ? "Exploration Turns" : compel.grants.span.unit + "s"}` : ""})</i>`);
        await item.delete();
        return;
      }
      this._postWoundMsg(actor, `drinks <b>${item.name}</b> — ${compel.effect}`);
      // A failed roll puts the effect on (2026-09-24), so no apply card follows.
      postSaveCardsToTargets(actor, item.name, [compel.save], [], compel.applies ? [compel.applies] : []);
      item.delete();
    }
  }

  /**
   * Drink a brewed Antidote — Elixir Brewing, the Antidotes atom.
   *
   * REFUSALS DO NOT SPEND THE VIAL, the same order Synth repair uses: a
   * character with no toxin, or one whose toxin outranks the antidote's POT,
   * keeps what they are carrying rather than paying for nothing. Both say
   * which it was, because "nothing happened" with no cause reads as a bug.
   */
  async _useAntidote(item, die)
  {
    const actor = this.actor;
    const { cured, message } = antidoteOutcome(actor, die);
    if(cured)
    {
      await applyAntidote(actor);
      await item.delete();
    }
    this._postWoundMsg(actor, message);
  }

  /**
   * Drink an Elixir that grants ONE SPECIFIC thing - Recursive Infusion: "a
   * new, permanent Mystic Gift: Recursive Gaze". RULED 2026-09-24 (Matt): a
   * one-off, available only through this elixir, so it joins no roster and
   * no picker; the gift Item is written here from the roster row's text, a
   * slot like any gift, the elixir as its source.
   */
  async _useFixedGrantElixir(item)
  {
    const actor = this.actor;
    const spec = ELIXIRS.find(e => e.name === item.name)?.grantsFixed;
    if(spec.type !== "gift")
    {
      ui.notifications.warn(`"${item.name}" grants a kind this system does not know (${spec.type}). It has NOT been drunk.`);
      return;
    }
    const [granted] = await actor.createEmbeddedDocuments("Item", [{
      name: spec.name,
      type: "gift",
      system: { slots: 1, source: item.name, description: `<p>${spec.text}</p>` }
    }]);
    this._postWoundMsg(actor, `drinks <b>${item.name}</b> — permanently gains the Mystic Gift <b>${granted.name}</b>. <i>${spec.text}</i>`);
    await item.delete();
  }

  /**
   * Drink an Elixir that SPAWNS creatures from the Bestiary - Broodling Broth:
   * "They birth d6 half-spider and half-host Broodlings [Lvl 0 (1 hp), AV 12,
   * Bite (d4)]. Broodlings are loyal to and follow their 'mother' until
   * killed." RULED 2026-09-24 (Matt): the Broodling is a Bestiary entry, so
   * the drink clones it the way every spawn does (bestiary-spawn.js), d6
   * times, tokens beside the drinker's. Loyal ones share the drinker's owners
   * so the player can move them; the loyalty itself is the table's.
   */
  async _useSpawnElixir(item)
  {
    const actor = this.actor;
    const spec = ELIXIRS.find(e => e.name === item.name)?.spawns;
    const roll = new Roll(spec.dice);
    await roll.evaluate({ async: true });
    const count = Math.max(0, roll.total);
    const spawned = await spawnBeside(actor, spec.creature, count, { loyal: !!spec.loyal });
    if(!spawned)
    {
      ui.notifications.warn(`"${spec.creature}" is not in the Bestiary compendium — "${item.name}" has NOT been drunk.`);
      return;
    }
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<b>${item.name}</b> — how many ${spec.creature}s` });
    this._postWoundMsg(actor, `drinks <b>${item.name}</b> — their stomach distends grotesquely and they birth <b>${count}</b> ${spec.creature}${count === 1 ? "" : "s"}` +
      (spawned.length ? `: ${spawned.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(", ")}` : "") +
      `. <i>${spec.loyal ? "They are loyal to and follow their mother until killed." : ""}</i>`);
    await item.delete();
  }

  /**
   * Drink an Elixir whose grant the REFEREE PICKS from another roster -
   * Geneshock Tonic ("a new, permanent mutation, matching that of the heart's
   * original owner") and Transcendence Tonic ("a new, permanent Mystic Gift,
   * matching that of the brain's original owner"). The rosters, the rulings
   * and the dialogs are in granted-pick.js.
   *
   * REFEREE ONLY. Nothing harvested says what the original owner had, so the
   * pick is the Referee's knowledge. A player's click posts a card asking the
   * Referee to drink it from the sheet, and the vial is kept - the same shape
   * as a cancelled dialog, which also keeps it (the Ambrosia's rule).
   */
  async _usePickElixir(item)
  {
    const actor = this.actor;
    const spec = ELIXIRS.find(e => e.name === item.name)?.grantsPick ?? {};
    if(!game.user.isGM)
    {
      ui.notifications.warn(`Only the Referee can resolve "${item.name}" — it names what the original owner had. The vial is kept.`);
      this._postWoundMsg(actor, `wants to drink <b>${item.name}</b>. <i>Referee: drink it from ${actor.name}'s sheet to choose what it grants.</i>`);
      return;
    }
    const data = spec.roster === "gift" ? await pickGift(actor, item.name)
               : spec.roster === "mutation" ? await pickMutation(actor, item.name)
               : null;
    if(!data)
    {
      if(!["gift", "mutation"].includes(spec.roster))
        ui.notifications.warn(`"${item.name}" names a roster this system does not know (${spec.roster}).`);
      return;
    }
    const [granted] = await actor.createEmbeddedDocuments("Item", [data]);
    const what = spec.roster === "gift" ? "Mystic Gift" : "mutation";
    this._postWoundMsg(actor, `drinks <b>${item.name}</b> — permanently gains the ${what} <b>${granted.name}</b>.`);
    await item.delete();
  }

  /**
   * Drink an Elixir that leaves a permanent, baked Item behind - Hollowheart
   * Hooch, the only entry today: "Drinker permanently gains 2 new
   * hypergeometric Item Slots, located inside their chest. This effect can
   * increase slot capacity beyond the 20 slot maximum."
   *
   * RULED 2026-08-30 (Matt), reaffirmed 2026-09-20 against Labyrinth Pox's
   * near-identical sentence: a 0-slot Item carrying slotBonus, the Kangaroo
   * Pouch pattern - a new intrinsic property of the character, not a cargo
   * compartment, because these slots carry no end condition. So this method
   * only CREATES the Item; the ordinary createItem bake (item-effects.js)
   * raises inventorySlots.max and records what it applied, and deleting the
   * Item reverses it, exactly as for a mutation. Nothing here writes the
   * ceiling itself, which is what keeps one bake path.
   *
   * NOT REFUSED ON A SECOND VIAL. The book says each drink permanently gains
   * two slots and sets no cap, so a second Item bakes two more, as a second
   * Manifold Box would. A refusal would be a cap nobody ruled.
   */
  async _useBakedItemElixir(item)
  {
    const actor = this.actor;
    const spec = ELIXIRS.find(e => e.name === item.name)?.bakedItem;
    const before = Number(actor.system.inventorySlots?.max ?? 20);
    const [granted] = await actor.createEmbeddedDocuments("Item", [{
      name: spec.name,
      type: "item",
      system: {
        slots: 0,
        intrinsic: true,
        description: `<p>Granted by <b>${item.name}</b>: ${ELIXIRS.find(e => e.name === item.name).effect}</p>`
      }
    }]);
    // The bake runs in the createItem hook on this client; give it its tick
    // so the card can report the ceiling that actually landed.
    for(let i = 0; i < 20 && !granted.getFlag("vaarn", "bakedEffects"); i++) await new Promise(r => setTimeout(r, 50));
    const after = Number(actor.system.inventorySlots?.max ?? before);
    this._postWoundMsg(actor,
      `drinks <b>${item.name}</b> — permanently gains <b>${spec.slotBonus}</b> hypergeometric Item Slots inside their chest `
      + `(<b>${granted.name}</b> on the sheet; slots ${before} &rarr; ${after}).`);
    await item.delete();
  }

  /**
   * Drink an Elixir whose effect is a roll on another GENERATOR, the result a
   * new Actor - Metamorphic Syrup, the only entry today: "Drinker is
   * permanently changed into a new, random creature. Generate their type
   * using the monster generators."
   *
   * RULED 2026-09-23 (Matt): the drink runs the Generate Monster path and
   * creates the rolled creature as a new npc Actor, linked from the drink
   * card. The character's own sheet is left as the record of who they were;
   * nothing on it is rewritten - the one reading that destroys nothing, and
   * the same conservative shape as Bifurcation's second Actor. Random, never
   * chosen: `knownType` is the macro picker's, and the book says random.
   *
   * Grant-a-Roll on Another Table's rolled form, with a generator where the
   * exotica have a table.
   */
  async _useGeneratorElixir(item)
  {
    const actor = this.actor;
    const spec = ELIXIRS.find(e => e.name === item.name)?.grantsRoll ?? {};
    if(spec.generator !== "monster")
    {
      ui.notifications.warn(`"${item.name}" names a generator this system does not know (${spec.generator}). It has NOT been drunk.`);
      return;
    }
    const creature = await generateMonster(null);
    if(!creature) return;
    const s = creature.system;
    this._postWoundMsg(actor,
      `drinks <b>${item.name}</b> — is permanently changed into a new, random creature: `
      + `@UUID[${creature.uuid}]{${creature.name}} (Level ${s.level?.value ?? "?"}, ${s.health?.max ?? "?"} HP, AV ${s.armor?.value ?? "?"}), `
      + `in the ${GENERATED_FOLDER} folder. <i>This sheet stays as the record of who they were.</i>`);
    await item.delete();
  }

  /**
   * Drink an Elixir that permanently changes WHAT THE CHARACTER IS -
   * Planeyfication Potion, the only entry today: "Drinker permanently becomes
   * a hypergeometric entity. They gain the hypergeometric type and follow the
   * special rules given for the planeyfolk Ancestry."
   *
   * ADDITIVE, NEVER A REPLACEMENT. RULED 2026-09-23 (Matt): the hypergeometric
   * box is ticked beside whatever types the character has, and the Planeyfolk
   * rules (Flat, Attune with Matter) are gained as ancestry Items beside the
   * character's own ancestry, whose string is never touched. Flat reaches the
   * damage table through the same `vaarn.flat` flag the Codex's Flatten uses,
   * set here with no span so nothing clears it. Attunement reaches the gate
   * through the Item (attunement.js attunes).
   *
   * EVERYTHING ALREADY CARRIED IS ATTUNED. RULED 2026-09-23 (Matt): only what
   * they pick up afterwards needs attuning. Stamped the way chargen stamps a
   * starting kit, on every Item that has the field - the gate reads it for
   * nobody else, so the stamp is harmless where it is not needed.
   *
   * NOTHING TO CHANGE MEANS NOTHING DRUNK, per the Ambrosia's ruling below: a
   * character who already has the type, the flag and both Items keeps the
   * vial rather than losing it for nothing.
   */
  async _usePermanentChangeElixir(item)
  {
    const actor = this.actor;
    const spec = ELIXIRS.find(e => e.name === item.name)?.permanentChange ?? {};

    const known    = actor.system.creatureTypes ?? {};
    const newTypes = (spec.creatureTypes ?? []).filter(t => t in known && !known[t]);
    const rules    = ANCESTRY_RULE_ITEMS[spec.ancestryRules] ?? [];
    const newRules = rules.filter(def => !actor.items.some(i => i.type === "ancestry" && i.system?.rule === def.rule));
    const flatNew  = !!spec.flat && !isFlat(actor);

    if(!newTypes.length && !newRules.length && !flatNew)
    {
      ui.notifications.warn(`${actor.name} is already everything "${item.name}" would make them. It has NOT been drunk.`);
      this._postWoundMsg(actor, `does not drink <b>${item.name}</b> — already ${(spec.creatureTypes ?? []).join(", ")}, with the ${spec.ancestryRules} rules. <i>(The vial is kept.)</i>`);
      return;
    }

    const update = {};
    for(const t of newTypes) update[`system.creatureTypes.${t}`] = true;
    if(spec.flat) update["flags.vaarn.flat"] = true;
    await actor.update(update);

    if(newRules.length)
      await actor.createEmbeddedDocuments("Item", newRules.map(def => ({
        name: def.rule,
        type: "ancestry",
        system: {
          slots: 0,
          rule: def.rule,
          ancestry: spec.ancestryRules,
          variant: "",
          roll: 0,
          ...spanFieldFrom(def),
          description: `<p>${def.text}</p>`
        }
      })));

    let attuned = 0;
    if(spec.attuneExisting)
    {
      const patches = actor.items
        .filter(i => i.id !== item.id && !isIntrinsic(i) && "attuned" in (i.system ?? {}) && i.system.attuned !== true)
        .map(i => ({ _id: i.id, "system.attuned": true }));
      if(patches.length) await actor.updateEmbeddedDocuments("Item", patches);
      attuned = patches.length;
    }

    const parts = [];
    if(newTypes.length) parts.push(`gains the <b>${newTypes.join("</b>, <b>")}</b> creature type beside their own`);
    if(newRules.length) parts.push(`gains <b>${newRules.map(r => r.rule).join("</b> and <b>")}</b> beside their <b>${actor.system.ancestry || "own"}</b> ancestry`);
    if(attuned) parts.push(`is already attuned to the ${attuned} item${attuned === 1 ? "" : "s"} they carry`);
    this._postWoundMsg(actor, `drinks <b>${item.name}</b> — ${spec.creatureTypes?.length ? "permanently " : ""}${parts.join("; ")}. <i>(Only what they pick up from now on needs attuning.)</i>`);
    await item.delete();
  }

  /**
   * Drink an Elixir whose effect is a permanent Ability change.
   *
   * Autarch's Ambrosia is the only entry today: "Drinker permanently gains +1
   * to the Ability of their choice." It is the mirror image of the refusal in
   * _useDurationElixir below — that one declines to apply a stateful effect
   * with no readable span, because nothing could ever take it back. Here
   * nothing is SUPPOSED to take it back, so the same reasoning permits the
   * write instead of forbidding it.
   *
   * THE ITEM IS NOT CONSUMED WHEN THERE IS NO CHOICE TO MAKE. Ruled
   * 2026-09-14 (Matt) alongside the cap: with every Ability already at +10
   * the drink can do nothing, and destroying the Item for nothing is a worse
   * outcome than refusing. The same branch covers a cancelled dialog, which
   * is the ordinary way a player backs out after opening it.
   *
   * NOTHING HERE TOUCHES THE ADVANCEMENT LEDGER, deliberately — see the
   * header of permanent-ability.js for why that is the correctness argument
   * for this whole mechanism rather than a detail of it.
   */
  async _usePermanentAbilityElixir(item)
  {
    const actor = this.actor;
    const spec = permanentAbilitySpecFor(item.name);
    const delta = spec.choose ?? 1;

    if(!eligibleForGain(actor).length)
    {
      ui.notifications.warn(
        `${actor.name} has every Ability at the +${ABILITY_CAP} maximum, so "${item.name}" ` +
        `would do nothing. It has NOT been drunk.`);
      return;
    }

    const key = await promptAbilityChoice(actor, {
      title: item.name,
      hint: item.system?.description || item.system?.effect || "",
      delta
    });
    if(!key) return;

    const result = await applyPermanentAbilityChange(actor, key, delta);

    // Report what LANDED, not what the elixir promised. They differ whenever
    // the cap trimmed the change, and the card is the only place a player
    // would see that.
    this._postWoundMsg(actor,
      `drinks <b>${item.name}</b> — permanently gains ` +
      `${result.applied > 0 ? "+" : ""}${result.applied} ${result.label} ` +
      `(${result.from} &rarr; ${result.to}).`);
    await item.delete();
  }

  /**
   * Drink one of the four duration Elixirs.
   *
   * REPLACES a hardcoded map of four literal effect strings. Those strings
   * each ended "(narrative timing — adjudicate in play)", restating
   * the 2026-08-27 ruling that elapsed game-time hours would never be tracked
   * at the table. Matt set that aside on 2026-09-08 when the Exploration Clock
   * landed, so the clause described a limitation the system no longer has.
   *
   * They had drifted besides, and measurably: all four said HOURS with
   * invented dice where the roster says a fixed count of Exploration Turns —
   * "d6 hours" against "6 Exploration Turns" for Regeneration Serum, and the
   * same shape for the other three. Four of four wrong. So the text now comes
   * from the Item itself, which chargen built from the roster.
   *
   * THE ENTRY IS CREATED BEFORE THE ITEM IS DELETED, and that ordering is the
   * entire point of the storage move: activation copies the name, text and
   * formula onto the ACTOR, so the effect outlives the elixir that caused it.
   * The old item-flag storage could not express this at all.
   */
  async _useDurationElixir(item)
  {
    const actor = this.actor;
    const text = item.system?.description || item.system?.effect || "";
    const span = declaredSpanOf(item);

    // Stateful Effect Application (2026-09-09). Resolved BEFORE the entry is
    // created and before the Item is deleted, because a multiplier reads the
    // actor as it stands at the moment of drinking. What gets stored is the
    // flat number that produced, so the reversal is independent of anything
    // that happens during the span.
    const spec = statefulSpecFor(item.name);
    const applied = spec ? resolveStatefulDeltas(actor, spec) : null;
    const drinkAsText = !!ELIXIRS.find(e => e.name === item.name)?.drinkAsText;
    // Elixir-Granted Ability Item (2026-09-23): a span elixir that grants an
    // ability (Windsong) creates the Item first, so the entry can carry its
    // id and take it back when the span ends.
    const granting = ELIXIRS.find(e => e.name === item.name && e.grants) ?? null;
    let granted = null;

    const stateful = applied && !isEmptyStatefulDeltas(applied);

    // A stateful elixir with no readable span would apply a change nothing can
    // ever reverse. Refuse it rather than granting a permanent boost the book
    // states as temporary.
    //
    // RETURNS BEFORE THE CARD AND BEFORE THE DELETE, which is the whole of the
    // 2026-09-20 fix. The card used to be posted by the shared line at the end
    // of this method, so on the one branch where nothing had been applied it
    // still ended "(applied: ... — reversed when it ends)", contradicting the
    // warning raised two lines above it. The notification is transient and only
    // the clicker sees it; the card is what the Referee reads back, so the card
    // is where the refusal has to be stated.
    //
    // THE VIAL IS KEPT, per _useAntidote above ("refusals do not spend the
    // vial", ruled 2026-09-19): a GM who fixes the description can then drink
    // it properly, and destroying the Item for nothing is the worse outcome.
    // So the card does NOT say "drinks" — nothing was drunk.
    if(!span && stateful)
    {
      ui.notifications.warn(
        `"${item.name}" states no duration this system could read — its effect was NOT applied, ` +
        `because nothing could take it back. The vial is kept. Adjudicate by hand.`);
      this._postWoundMsg(actor,
        `does not drink <b>${item.name}</b> — ${text} ` +
        `<i>(no duration stated — effect NOT applied, the vial is kept. Adjudicate by hand.)</i>`);
      return;
    }

    if(span)
    {
      // One Item or several (Biothermal's two gifts): the entry carries every
      // id, and the card names every Item.
      if(granting) granted = await grantAbilities(actor, granting);
      await activateRoundEffect(item, {
        rounds: this._resolveDurationToken(span.raw),
        unit: span.unit,
        applied: stateful ? applied : null,
        grantedItemIds: (granted ?? []).map(g => g.id),
        // Regeneration Serum's d6 a round (Direct HP Adjustment, 2026-09-23):
        // the round card's GM button applies it. From the roster row, since a
        // chargen-built elixir carries no flags of its own.
        hpTick: ELIXIRS.find(e => e.name === item.name)?.hpTick ?? null
      });
      // The HP write follows the entry, never precedes it. If this threw
      // first, the actor would carry a doubled maximum with nothing on the
      // board to take it back — the one failure in this mechanism that cannot
      // be undone by deleting a row.
      if(applied) await applyStatefulActivationHp(actor, applied);
    }
    else if(!drinkAsText)
      // No span and nothing stateful: this one IS drunk, and the note is a
      // warning to the Referee rather than a refusal.
      ui.notifications.warn(
        `"${item.name}" states no duration this system could read — drunk, but nothing is tracking it.`);

    // A drinkAsText elixir says so on its card instead of warning: the
    // absence of tracking is the ruling, not a gap the Referee should hear
    // about every time.
    this._postWoundMsg(actor, `drinks <b>${item.name}</b> — ${text}${this._statefulLine(applied)}`
      + (drinkAsText ? ` <i>(adjudicated by hand — nothing is tracked)</i>` : "")
      + (granted?.length ? ` <i>(grants <b>${granted.map(g => g.name).join("</b> and <b>")}</b> on the sheet for the span)</i>` : ""));
    await item.delete();
  }

  /**
   * The one line of chat that says what actually changed, so the Referee can
   * see a number rather than infer it from the elixir's prose. Empty when the
   * elixir changes nothing mechanical, which keeps every existing card
   * byte-identical to what Group 105 tested.
   */
  _statefulLine(applied)
  {
    if(isEmptyStatefulDeltas(applied)) return "";
    const parts = [];
    if(applied.av) parts.push(`${applied.av > 0 ? "+" : ""}${applied.av} AV`);
    for(const [key, amount] of Object.entries(applied.abilities ?? {}))
      parts.push(`${amount > 0 ? "+" : ""}${amount} ${key.toUpperCase()}`);
    if(applied.maxHp) parts.push(`${applied.maxHp > 0 ? "+" : ""}${applied.maxHp} max HP`);
    for(const t of applied.creatureTypes ?? []) parts.push(`${t} creature type`);
    // A named Combat Condition says what it is; its AV comes from the
    // definition rather than from this entry, so it is read from there too.
    for(const c of applied.conditions ?? [])
    {
      const def = conditionByKey(c);
      if(def) parts.push(def.av ? `${def.label} (${def.av > 0 ? "+" : ""}${def.av} AV)` : def.label);
    }
    if(!parts.length) return "";
    return ` <i>(applied: ${parts.join(", ")} — reversed when it ends)</i>`;
  }

  /**
   * Delete an Exotica item once its usage die/charges are exhausted —
   * work-queue item 10.3.3 (2026-08-27). Matt's ruling: these never
   * recharge, so a used-up Exotica trinket is deleted outright rather than
   * left sitting inert like a depleted weapon. Explicitly announces the
   * deletion in chat (Matt's call, same reasoning the Unstable/Crystalline
   * weapon-destruction messages already use) so the table can tell what
   * happened if anyone questions it later.
   */
  _deleteUsedUpExotica(item)
  {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> is used up and removed from ${this.actor.name}'s inventory.`
    });
    item.delete();
  }

  /**
   * Use a fixed-charge Exotica item ("x6 uses" etc.) — work-queue item
   * 10.3.3 (2026-08-27). Decrements usesRemaining by exactly 1 (Matt's
   * call — a flat countable resource, not a randomly-depleting die like
   * UdN entries); deletes and announces the same way _deleteUsedUpExotica
   * does once the count hits 0. No refresh action exists for either
   * shape — Exotica items never recharge.
   */
  async _onExoticaChargeUse(item)
  {
    // Post the item's own extra flavor text, if it has one — work-queue
    // item 10.3.4. Fires before the decrement so it still posts on the
    // final (depleting) use.
    this._postUsageDieFlavorText(item);

    // Work-queue item 10.3.5 (2026-08-27): some x1-use Exotica entries
    // actually GRANT something (a Mystic Gift, an Advanced Implant, a real
    // weapon) rather than just describing an effect. Returns true only
    // when the grant was BLOCKED (an ability-slot conflict) — in that
    // case the item and its charge are left completely untouched so the
    // roll isn't wasted, matching Matt's ruling.
    if(await this._onExoticaGrantRoll(item)) return;
    const holding = ADVANCED_EXOTICA.find(e => e.name === item.name && e.hold);
    if(holding) await this._holdTargets(item.name, holding.hold);

    const remaining = item.system.usesRemaining - 1;
    if(remaining <= 0)
    {
      this._deleteUsedUpExotica(item);
      return;
    }
    item.update({ "system.usesRemaining": remaining });
  }

  /**
   * Spend one unit of a fixed-charge consumable — foundry-system-index.csv
   * "Fixed-Charge Consumable", built 2026-09-20 after Matt released the
   * 2026-09-07 deferral. The re-open trigger was the edition moving, and
   * JADE IBIS 15-09-26 kept (xN) and (UdN) as separate notations.
   *
   * DECREMENTS `quantity`, not a `usesRemaining` of its own. Per-Unit Slot
   * Weight (Group 237) made quantity the number item-slots.js multiplies, so
   * a second count would leave a spent stack still weighing its original
   * load — five flashbangs at 0.2 slots each have to become four at 0.8.
   * That is why this does NOT follow the usesRemaining shape immediately
   * above it, despite being the same gesture.
   *
   * Deletes at zero and announces it, the way _deleteUsedUpExotica does.
   * Nothing else fires. For Antitoxin that is Matt's 2026-09-07 ruling
   * exactly: the button DEPLETES A DOSE ONLY and never reaches the Toxin
   * Die, because the TD lives on the target's sheet and an item on the
   * user's sheet has no clean way to reach another actor. The GM
   * adjudicates the cure.
   */
  _onConsumableUse(item)
  {
    const remaining = Number(item.system.quantity) - 1;
    if(remaining <= 0)
    {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<b>${item.name}</b> — ${this.actor.name} uses the last one. It is removed from their inventory.`
      });
      item.delete();
      return;
    }
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> — ${this.actor.name} uses one. ${remaining} left.`
    });
    item.update({ "system.quantity": remaining });
  }

  /**
   * Performs the actual grant for "roll on another table" Exotica entries
   * — work-queue item 10.3.5 (2026-08-27). Creates the result DIRECTLY in
   * this actor's own inventory (the bearer used their own item — unlike
   * the GM-facing "Generate X" macros, which deliberately create unowned
   * sidebar items for a GM to hand out by hand). Returns `true` only to
   * signal "blocked, don't consume the source item" — every other case
   * (a real grant happened, or this item isn't one of these 5 at all)
   * returns falsy so `_onExoticaChargeUse`'s normal consume/delete logic
   * proceeds unchanged.
   */
  async _onExoticaGrantRoll(item)
  {
    const actor = this.actor;

    // Autarch's Nectar (Permanent Ability Score Change, 2026-09-26). Not a
    // grant from another table, but it is the one x1-use hook that can refuse
    // and keep the item, which a refused drink needs.
    const permanent = exoticaPermanentAbilitySpecFor(item.name);
    if(permanent) return !(await this._useExoticaPermanentAbility(item, permanent));

    if(item.name === "Amaranthine Sugar")
    {
      const gift = await this._createRandomGift(actor);
      this._postWoundMsg(actor, `eats the <b>Amaranthine Sugar</b> — a random Mystic Gift, <b>${gift.name}</b>, is granted!`);
      return;
    }

    // Cybernetic Cocoon / Cybernetics Pack: Matt's ruling (2026-08-27) is a
    // two-stage design rather than an immediate install-or-waste roll —
    // opening the container only determines WHICH implant it contains,
    // producing a new sealed, tradeable capsule Item (system.sealedImplant)
    // rather than attempting the install right here. The actual install
    // (and its own possible ability-slot-conflict block) happens later,
    // whenever _onSealedImplantInstall fires for that capsule — by
    // whoever ends up holding it, not necessarily this actor. This lets
    // the roll always succeed and the container always get consumed here
    // (nothing about opening a box can fail), while the SEPARATE install
    // step is what can be blocked and left for later/someone else.
    // Matched on either spelling. The roster entry was "Cybernetic Cocoon"
    // when this was written and JADE IBIS renamed it "Cybernetics Cocoon"
    // (commit 6df0cc2, 2026-09-15); the literal here kept the old name, so a
    // real rolled cocoon fell through to the plain charge path and was
    // consumed with NO capsule. Found by the fifth regression run,
    // 2026-09-18 — the Hardcoded Effect Text Drift shape, on a name rather
    // than a sentence.
    if(/^Cybernetics? (Cocoon|Pack)$/.test(item.name))
    {
      const entry = ADVANCED_IMPLANTS[d(20) - 1];
      const sealedName = `${item.name} (${entry.name})`;
      await actor.createEmbeddedDocuments("Item",
      [{
        name: sealedName,
        type: "exotica",
        system:
        {
          slots: item.system.slots,
          // Item Attunement Gate: a product of an item the bearer could already
          // use is attuned on arrival (Matt, 2026-09-08). Harmless for every
          // other ancestry, which never reads the field.
          attuned: true,
          sealedImplant: entry.name,
          description: `<p>A sealed, factory-fresh cybernetic capsule. Use it to install: <b>${entry.name}</b> (Ability Slot: ${entry.ability_slot}).</p><p>${entry.effect}</p>`
        }
      }]);
      this._postWoundMsg(actor, `opens the <b>${item.name}</b> — it's keyed to a specific implant, <b>${entry.name}</b>. A sealed capsule is created that can be used (by this character, or traded to another first) to install it.`);
      return;
    }

    if(item.name === "Belligerent Paste")
    {
      const { name, type, system, altForm } = await rollWeapon("Exotic");
      const [created] = await actor.createEmbeddedDocuments("Item", [{ name, type, system: { ...system, attuned: true } }]);
      // Polymorphic (work-queue item 4.7, 2026-08-27): unlike the 2
      // GM-facing macros (which create both halves as unowned sidebar
      // Items a GM then drags over), this path already creates directly
      // in the bearer's own inventory — so the paired alt-form Item goes
      // straight there too, no manual second drag needed.
      if(altForm)
      {
        const [altCreated] = await actor.createEmbeddedDocuments("Item", [{ name: altForm.name, type: altForm.type, system: { ...altForm.system, attuned: true } }]);
        await created.setFlag("vaarn", "polymorphicPairName", altCreated.name);
        await altCreated.setFlag("vaarn", "polymorphicPairName", created.name);
        this._postWoundMsg(actor, `applies <b>Belligerent Paste</b> to a corpse — it transforms into a real, Polymorphic weapon: <b>${name}</b> (alternate form: <b>${altForm.name}</b>)!`);
        return;
      }
      this._postWoundMsg(actor, `applies <b>Belligerent Paste</b> to a corpse — it transforms into a real weapon: <b>${name}</b>!`);
      return;
    }
  }

  /**
   * Drink an Advanced Exotica that raises several DIFFERENT Abilities for
   * good - Autarch's Nectar, the only entry today: "When drunk by a
   * biological creature, grants a permanent +1 boost to three ability
   * scores." RULED 2026-09-26 (Matt): three different Abilities, and a
   * drinker without the type is refused.
   *
   * Returns true when the drink happened, false when it was refused or
   * cancelled - the caller keeps the item and its charge on false, the
   * Ambrosia's rule. Writes nothing to the advancement ledger, for the reason
   * permanent-ability.js's header gives.
   */
  async _useExoticaPermanentAbility(item, spec)
  {
    const actor = this.actor;
    if(spec.requiresType && !actor.system.creatureTypes?.[spec.requiresType])
    {
      ui.notifications.warn(`${actor.name} is not ${spec.requiresType}, so "${item.name}" does nothing. It has NOT been drunk.`);
      this._postWoundMsg(actor, `cannot drink <b>${item.name}</b> — only a ${spec.requiresType} creature can. <i>(It is kept.)</i>`);
      return false;
    }
    if(!eligibleForGain(actor).length)
    {
      ui.notifications.warn(
        `${actor.name} has every Ability at the +${ABILITY_CAP} maximum, so "${item.name}" ` +
        `would do nothing. It has NOT been drunk.`);
      return false;
    }

    const keys = await promptDistinctAbilities(actor, {
      title: item.name,
      hint: item.system?.description || "",
      delta: spec.delta ?? 1,
      count: spec.count ?? 1
    });
    if(!keys?.length) return false;

    const results = [];
    for(const key of keys) results.push(await applyPermanentAbilityChange(actor, key, spec.delta ?? 1));
    const gained = results.map(r =>
      `${r.applied > 0 ? "+" : ""}${r.applied} ${r.label} (${r.from} &rarr; ${r.to})`).join(", ");
    this._postWoundMsg(actor, `drinks <b>${item.name}</b> — permanently gains ${gained}.`);
    return true;
  }

  /** Rolls a random Mystic Gift (same GIFT_QUALITIES_ALL/GIFT_FORMS_ALL 4x20
   * grids generate-gift.js's macro uses) and creates it directly in
   * `actor`'s inventory. Shared by Amaranthine Sugar (above) and
   * Psybernetic Helm's first-wear unlock (see _onItemEquip). The roll itself
   * is granted-pick.js's randomGiftData, shared with the Godsbreath Star. */
  async _createRandomGift(actor)
  {
    const [created] = await actor.createEmbeddedDocuments("Item", [randomGiftData()]);
    return created;
  }

  /**
   * Attempts to install the specific implant a sealed Cocoon/Pack capsule
   * is keyed to (`item.system.sealedImplant`) — work-queue item 10.3.5
   * (2026-08-27). Reuses the SAME `preCreateItem` ability-slot-conflict
   * guard (item-effects.js's checkImplantSlotConflict) every other
   * implant creation already goes through — if blocked,
   * `createEmbeddedDocuments` simply returns no document, the conflict's
   * own warning has already fired, and the capsule is left fully intact
   * (still tradeable, installable later once the slot frees up).
   */
  async _onSealedImplantInstall(item)
  {
    const actor = this.actor;
    // Starting implants too since 2026-09-25 (Matt): the Sawbone Drone's
    // Surgical Array uninstalls whatever sat in the slot into a capsule, and
    // that may be a Starting implant. A Cocoon or Pack still only ever rolls
    // an Advanced one - that roll is above and untouched.
    const entry = ADVANCED_IMPLANTS.find(e => e.name === item.system.sealedImplant)
               ?? IMPLANTS.find(e => e.name === item.system.sealedImplant);
    if(!entry) return;

    const [created] = await actor.createEmbeddedDocuments("Item",
    [{
      name: entry.name,
      type: "implant",
      system: { slots: ADVANCED_IMPLANT_SLOTS, description: `<p><b>Ability Slot:</b> ${entry.ability_slot}</p><p>${entry.effect}</p>` }
    }]);
    if(!created) return;

    this._postWoundMsg(actor, `installs the <b>${item.name}</b> — <b>${entry.name}</b> is now implanted!`);
    item.delete();
  }

  /**
   * Descriptive-only flavor text for Exotica/Armor items whose usageDie
   * roll has a specific effect worth naming in chat — work-queue items
   * 10.3.4 (2026-08-27, "compel a target to save" entries) and 10.3.7
   * (2026-08-27, Sprayflesh's Wound-removal). Renamed from the
   * 10.3.4-only `_postTargetSaveText` once Sprayflesh needed the exact
   * same hook point (a per-roll message) for a non-save effect. For the
   * save entries specifically: no roll is actually triggered for the
   * target, since there's no opposed-roll/targeting-resolution
   * infrastructure in this codebase to hook into (same reasoning
   * actor-sheet.js's _onMutationUse comment already documents for Silk
   * Production, item 3.7) — the target's controller resolves the save
   * by hand.
   * Called from BOTH the shared `.usage-die-roll` handler and
   * `_onExoticaChargeUse` above, since these entries are split across
   * both consumption shapes (UdN die vs flat "xN uses") depending on the
   * entry — see advanced-exotica-data.js's own item-10.3.4 header note.
   * No-op (posts nothing) for any item not in this list, so other
   * usage-die/charge items with no special effect are unaffected.
   */
  /**
   * Compel-a-Target Save for CREATURES, 2026-09-09.
   *
   * The Exotica route below is a name-keyed table of hand-written prose,
   * which is right for 15 named items and cannot scale to the 44 creatures
   * that compel a save. This route reads the DECLARED flag that
   * bestiary-build.js writes, and composes the sentence with the same helper
   * the Item's own note uses, so the card and the note cannot drift apart.
   *
   * Descriptive only, like everything else on this hook: it names the save,
   * and the target's controller rolls it. Nothing here rolls for another
   * actor — see _postUsageDieFlavorText's header for why that is deliberate
   * rather than unfinished.
   */
  async _postCompelledSave(item)
  {
    const saves = item.flags?.vaarn?.save ?? [];
    const applies = item.flags?.vaarn?.applies ?? [];
    if(!saves.length && !applies.length) return;
    // ROLLED FROM THE CARD since 2026-09-16 (Save-Modifier Effects on the
    // Forgettable Tab). The sentence is the same one saveSentence writes; what
    // changed is that the card carries a button, so the roll knows what it is
    // against and Bulbous Eyes or Cyclops can put DIS on it. See
    // combat/compelled-save.js.
    // Update Built Content for Blind and Entangled (2026-09-16): the condition
    // the ability inflicts rode an Apply Effect to Target card beside the save
    // line, for the Referee to click. SINCE 2026-09-24 (RULED, Matt) the save
    // card carries it and a failed roll puts it on; only an ability with no
    // save to fail - Grimweaver's Web Shot - still posts the apply card.
    if(saves.length)
      await postCompelledSave(this.actor, item);
    else
    {
      this._postWoundMsg(this.actor, `uses <b>${item.name}</b>.`);
      this._postConditionCards(applies, item.name);
    }
  }

  /**
   * One Apply Effect to Target card per Combat Condition a source inflicts -
   * Update Built Content for Blind and Entangled, 2026-09-16.
   *
   * `applies` is the declared list: {condition, amount, unit}. `amount` is a
   * number, a die formula, or null. A DIE IS ROLLED ONCE, HERE, and printed on
   * the card, so the Referee applies the number the table saw rather than
   * re-rolling at the click. Null is the book printing no end: the spec then
   * carries no duration, applyEffectToActor stamps no expiry, and the board
   * shows the row as open-ended. RULED 2026-09-16 (Matt): no duration and no
   * save are invented for those; the board draws attention instead.
   *
   * The target is whoever the user has targeted at the moment of posting -
   * the same three-step fallback apply-to-target.js documents, so no target
   * is not an error, only a card the Referee targets at click time.
   *
   * A resolved count of zero rounds - Radiance read at INT +0 - posts nothing,
   * because "blind for 0 rounds" is not a condition anyone has.
   */
  async _postConditionCards(applies, source)
  {
    const target = Array.from(game.user?.targets ?? [])[0] ?? null;
    for(const a of applies ?? [])
    {
      let rounds = null;
      const amount = a.amount;
      if(amount !== null && amount !== undefined && amount !== "")
      {
        if(Number.isFinite(Number(amount))) rounds = Number(amount);
        else
        {
          const r = new Roll(String(amount));
          r.evaluate({async: false});
          rounds = r.total;
        }
        if(!(rounds > 0)) continue;
      }
      const spec = a.effect
        ? creatureRuleApplySpec(a, { rounds, unit: a.unit ?? "round", source })
        : conditionApplySpec(a.condition, { rounds, unit: a.unit ?? "round", source });
      // Ends when this creature dies - Weight of Worlds (2026-09-25).
      if(a.endsWithSource) Object.assign(spec, { endsWithSource: true, sourceActorId: this.actor.id, sourceName: this.actor.name });
      await postApplyCard({ source: this.actor, spec, target });
    }
  }

  /**
   * Rolled Creature Stat — roll the dice the book prints and write the stat.
   *
   * WHISPERED TO THE GM. A creature's Level and AV are the Referee's to know;
   * the players learn them by fighting it.
   *
   * THE ITEM IS CONSUMED. RULED 2026-09-20 (Matt), reversing the first build,
   * which left it in place so a second click re-rolled: an Item that vanishes
   * is how the Referee SEES the creature has been rolled, and a Fleshwarp
   * still showing Roll for Level is one nobody has put on the table yet. A
   * different result means importing a fresh copy, or setting the stat by hand.
   */
  async _doRolledStat(item)
  {
    const done = await applyRolledStat(this.actor, item);
    if(!done) return;
    await done.roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<div class="vaarn-chat-card"><h3>${item.name}</h3><p>${this.actor.name}: ${done.summary}</p></div>`
    },
    // THE ROLL MODE, not a `whisper` list. Group 258 found the list ignored:
    // Roll#toMessage applies the roll mode AFTER reading messageData, and the
    // default public mode clears whatever whisper it was handed.
    { rollMode: CONST.DICE_ROLL_MODES.PRIVATE });
    // After the write and the card, so a failure in either leaves the Item
    // there to be clicked again.
    await item.delete();
  }

  /**
   * Creature-Driven Level Drain — take a Level off every targeted character.
   *
   * TARGETS, not a name prompt. It is the same selection every other
   * creature-side effect on this sheet already uses, so the Referee targets
   * the victim and clicks, and a drain that hit two people is two targets
   * rather than two clicks.
   *
   * THE DRAINER GAINS PER VICTIM, not per click. The book gives the Kronophage
   * a Level for the time it took, and it took time from each of them.
   */
  async _doLevelDrain(item)
  {
    const spec = levelDrainSpecOf(item);
    if(!spec) return;

    const targets = Array.from(game.user.targets)
      .map(t => t.actor)
      .filter(a => a && a.type === "character");

    if(!targets.length)
      return ui.notifications.warn(
        `Target the character ${this.actor.name} is draining, then click again.`);

    const lines = [];
    for(const victim of targets)
    {
      const { taken, refused } = await applyLevelDrain({
        drainer: this.actor, victim, spec,
        reason: `<b>${item.name}</b> — ${this.actor.name} drains years from ${victim.name}.`
      });
      // The gain follows the LOSS. A drain refused at the floor took no time,
      // so there is none to feed on.
      const gain = taken > 0 ? await applyDrainerGain(this.actor, spec.drainerGains) : null;
      lines.push(drainSummary({ victim, taken, refused, gain }));
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="vaarn-chat-card"><h3>${item.name}</h3><ul>${lines.join("")}</ul></div>`
    });
  }

  /**
   * The other half of the drain: offer to give back what this creature took.
   *
   * Fire-and-forget from _resolveHPChange, which is synchronous and returns an
   * outcome its callers read.
   *
   * SILENT WHEN IT FED ON NOBODY, which is every other creature in the book —
   * this runs on every kill, so the common case must cost nothing and say
   * nothing.
   */
  async _postDrainRestoreCard(drainer)
  {
    try
    {
      const victims = victimsOf(drainer.id);
      if(!victims.length) return;

      const names = victims.map(v => `<li><b>${v.name}</b></li>`).join("");
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: drainer }),
        content:
          `<div class="vaarn-chat-card"><h3>Lost time</h3>` +
          `<p>${drainer.name} is slain. What it fed upon can come back:</p>` +
          `<ul>${names}</ul>` +
          `<button type="button" class="vaarn-drain-restore" data-drainer-id="${drainer.id}">` +
          `Restore lost Levels</button></div>`
      });
    }
    catch(err)
    {
      console.error("Vaarn | level-drain restore card failed", err);
      ui.notifications.error(
        `${drainer.name} died but its drain card could not be posted — see the console.`);
    }
  }

  /**
   * Autarch Figment Grant (2026-09-14). Nerves is the only figment that
   * compels anything: "Bearer may extrude the Autarch's nerves to snare an
   * opponent (DEX Save vs entangled)." JADE IBIS wording; CRIMSON HOUND's
   * "vs −5 AV" became the Entangled condition (Matt, 2026-09-21), which rides
   * an Apply card after the Save line when the row declares `applies`.
   *
   * DESCRIPTIVE ONLY, and that is the whole of Compel-a-Target Save rather
   * than a shortcut here — the card says which Save and against what, and the
   * target's controller rolls it. Every other entry on that mechanism behaves
   * identically, and the book gives this one no damage, duration or escape
   * condition to resolve even if it did.
   *
   * DRIVEN BY THE ROSTER, not by a name. The four entries either side of this
   * method are name-keyed dispatchers of long standing; this reads the
   * `targetSave` spec off the figment's own row, so the sheet control, the
   * tooltip and this card all fall out of one piece of data.
   */
  _onFigmentTargetSave(item)
  {
    const figment = findFigment(item?.name);
    const spec = figment?.targetSave;
    if(!spec) return;
    const ability = String(spec.ability ?? "").toUpperCase();
    this._postWoundMsg(this.actor, spec.note ?? `uses <b>${item.name}</b>.`);
    // A save card since 2026-09-24 (RULED, Matt), where the line named the
    // save and an apply card followed: a failed roll puts the effect on.
    postSaveCard(this.actor, item.name, [{ ability: String(spec.ability).toLowerCase(), mode: "resist", vs: spec.vs }], [],
      { applies: figment.applies ? [figment.applies] : [] });
  }

  /**
   * An Advanced Exotica that deals HP damage to whatever it is pointed at, with
   * no attack roll - the Wand of Annihilation's orbital beam (RULED 2026-09-22,
   * Matt: "you point it at a thing and a beam comes down from the heavens").
   * One roll, applied to every targeted token through _doDamage, so a target's
   * damage-type rules still read it - Argent Robes are immune to beam.
   */
  /**
   * The Entropy Wight's touch - "Targets struck by the Wight lose d3 maximum
   * HP ... Hit points lost in this way are never regained." RULED 2026-09-23
   * (Matt): a GM control on the targeted tokens, and permanent - it is a
   * write to max HP, which nothing restores. Current HP follows it down.
   * Rolled per target, since each was struck separately. A max reaching 0 is
   * announced by zero-max-hp.js, which hangs on the write.
   */
  async _cutTargetsMaxHP(item)
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee applies this.");
    const spec = item.flags?.vaarn?.maxHPLoss;
    if(!spec) return;
    const targets = Array.from(game.user?.targets ?? []).map(t => t.actor).filter(Boolean);
    if(!targets.length)
      return this._postWoundMsg(this.actor, `<b>${item.name}</b>: no target is selected, so no maximum HP was lost.`);
    for(const target of targets)
    {
      const roll = await new Roll(spec.dice).evaluate();
      const newMax = Math.max(0, Number(target.system.health.max) - roll.total);
      await this._postWoundMsg(target, `loses <b>${roll.total}</b> maximum HP to <b>${item.name}</b>${spec.permanent ? ", never to be regained" : ""}${gmHP(target, ` — now ${newMax}`)}.`);
      await target.update({ "system.health.max": newMax,
                            "system.health.value": Math.min(Number(target.system.health.value), newMax) },
                          { [MAX_HP_CAUSE]: item.name });
    }
  }

  /**
   * Temporary HP (foundry-system-index.csv "Temporary HP", RULED 2026-09-26 by
   * Matt): the Zenithlight Negatick's Infusion. Rolled per target, since each
   * is held separately, and added to that target's pool - the book's "+d8
   * temporary HP per round".
   *
   * THE DEATH is the book's: "If temporary HP is more than double the
   * character's maximum HP, they explode into flurries of zenithlight and
   * die." A death here is a message, as every death in this system is (see
   * fatality.js), and the Immortality Injector suppresses it like any other.
   * A creature victim goes to 0 HP through the funnel as a set-to-zero death,
   * which clears the pool and posts the ordinary creature death.
   */
  async _addTempHpToTargets(item)
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee applies this.");
    const spec = item.flags?.vaarn?.tempHp;
    if(!spec) return;
    const targets = Array.from(game.user?.targets ?? []).map(t => t.actor).filter(Boolean);
    if(!targets.length)
      return this._postWoundMsg(this.actor, `<b>${item.name}</b>: no target is selected, so no temporary HP was added.`);
    for(const target of targets)
    {
      const roll = await new Roll(spec.dice).evaluate();
      const pool = tempHpOf(target) + roll.total;
      const max = Number(target.system.health.max) || 0;
      await target.update({ [TEMP_HP_FIELD]: pool });
      await this._postWoundMsg(target, `gains <b>${roll.total}</b> temporary HP from <b>${item.name}</b>${gmHP(target, ` — now ${pool}, against ${max} maximum HP`)}.`);
      if(!spec.burstAt || !burstsAt(pool, max, spec.burstAt)) continue;

      const cause = `explodes into flurries of zenithlight (temporary HP more than ${spec.burstAt} times maximum HP)`;
      if(suppressesDeath(target))
        await this._postWoundMsg(target, suppressionMsg(cause));
      else if(target.type === "character")
        await this._postWoundMsg(target, `${cause} and <b>dies</b>.`);
      else
      {
        await this._postWoundMsg(target, `${cause}.`);
        this._resolveHPChange(target, Number(target.system.health.value) || 0, 0, { toZero: true });
      }
    }
  }

  async _exoticaStrike(item, strike)
  {
    const targets = Array.from(game.user?.targets ?? []);
    if(!targets.length)
    {
      this._postWoundMsg(this.actor, `<b>${item.name}</b>: no target is selected, so nothing was struck.`);
      return;
    }
    const roll = await new Roll(strike.damageDice).evaluate();
    const min = (await new Roll(strike.damageDice).evaluate({ minimize: true })).total;
    const types = strike.damageTypes ?? [];
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${item.name} damage${types.length ? ` (${types.join(", ")})` : ""}` });
    for(const token of targets)
      this._doDamage(token, roll.total, false, item, 1, [{ amount: roll.total, min, name: item.name, types }]);
  }

  /**
   * An Exotica whose use grants AV until the combat ends - the Active
   * Camouflage Ring's +10 (Live AV Computation wiring, RULED 2026-09-25 by
   * Matt: "until end of combat"). Declared on the roster entry as `combatAv`.
   *
   * A FLAG ON THE ACTOR, not on the Item, so the use that expends the ring's
   * last die - which deletes the Item - still lasts the fight. Read by
   * actor.js; cleared by knave.js's deleteCombat sweep beside berserk.
   *
   * Outside combat the die is still rolled (the ring was used) but nothing
   * is granted, since nothing would ever end it. Using it again while it is
   * on sets the same figure: it does not stack.
   */
  /**
   * A PERMANENT BODY CHANGE on the targets - the Lithifying Ray (Per-Round
   * Effect Reminder wiring, RULED 2026-09-25 by Matt: "create a permanent item
   * on the character with these traits rather than carry it on the board
   * forever"). Each use is one round the ray is held: the target's one
   * "Lithified" Item grows by the rolled loss and the AV. Targets outside the
   * declared types are passed over silently.
   */
  async _applyBodyChange(item)
  {
    const spec = ADVANCED_EXOTICA.find(e => e.name === item?.name && e.bodyChange)?.bodyChange;
    if(!spec) return;
    const targets = Array.from(game.user?.targets ?? []).map(t => t.actor).filter(Boolean)
      .filter(a => !spec.targets?.length || hasAnyCreatureType(a, spec.targets));
    if(!targets.length)
      return this._postWoundMsg(this.actor, `uses the <b>${item.name}</b> - no target it can change is selected.`);
    const label = String(spec.ability).toUpperCase();
    for(const victim of targets)
    {
      const roll = await new Roll(spec.dice).evaluate({ async: true });
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: `<b>${item.name}</b> — ${label} lost by ${victim.name}` });
      const name = `${spec.itemName} (${item.name})`;
      const held = victim.items.find(i => i.flags?.vaarn?.bodyChange?.source === item.name);
      const before = held?.flags?.vaarn?.bodyChange ?? { source: item.name, av: 0, abilities: {} };
      const next = { source: item.name, av: Number(before.av || 0) + Number(spec.av || 0),
        abilities: { ...before.abilities, [spec.ability]: Number(before.abilities?.[spec.ability] || 0) - roll.total } };
      const description = `<p>Permanent, from the <b>${item.name}</b>: ${next.abilities[spec.ability]} ${label}, +${next.av} AV. Delete this Item only if the change is undone.</p>`;
      if(held) await held.update({ "flags.vaarn.bodyChange": next, "system.description": description });
      else await victim.createEmbeddedDocuments("Item", [{ name, type: "item",
        system: { description, slots: 0, quantity: 1, tradeValue: 0, intrinsic: true },
        flags: { vaarn: { bodyChange: next } } }]);
      const eff = Number(victim.system.abilities?.[spec.ability]?.effective ?? 0);
      this._postWoundMsg(victim, `is changed by the <b>${item.name}</b> - <b>${roll.total} ${label}</b> lost and <b>+${spec.av} AV</b>, permanently `
        + `(now ${next.abilities[spec.ability]} ${label}, +${next.av} AV).`
        + (eff <= 0 && spec.atZero ? ` At 0 ${label}, ${victim.name} ${spec.atZero}.` : ""));
    }
  }

  async _activateCombatAv(item)
  {
    const entry = ADVANCED_EXOTICA.find(e => e.name === item?.name && e.combatAv);
    if(!entry) return;
    if(!game.combat)
      return this._postWoundMsg(this.actor, `uses the <b>${item.name}</b>, but no combat is running, `
        + `so no AV is granted - it lasts until a combat ends.`);
    await this.actor.setFlag("vaarn", "combatAv", { source: item.name, av: Number(entry.combatAv) });
    this._postWoundMsg(this.actor, `activates the <b>${item.name}</b> — <b>+${entry.combatAv} AV</b> until combat ends. `
      + `<i>${entry.combatAvNote ?? ""}</i>`);
  }

  _postUsageDieFlavorText(item)
  {
    const actor = this.actor;
    const text =
    {
      "C-Foam Puddings": `throws a <b>C-Foam Pudding</b>! Human-sized creatures must DEX save or be entrapped in quick-setting adhesive foam for roughly 8 hours (faster in salt water).`,
      "Empathy Bomb": `detonates an <b>Empathy Bomb</b>! Biological creatures in range must EGO save or be overcome with compassion for others for d4 hours.`,
      "Singularity Bomb": `releases a <b>Singularity Bomb</b>! Creatures caught in the blast must DEX save vs instant death as they're drawn into the singularity.`,
      "Pacifying Glove": `touches a target with the <b>Pacifying Glove</b>! Biological creatures must EGO save or fall asleep for d6 hours.`,
      "Anti-Gravity Field Generator": `activates the <b>Anti-Gravity Field Generator</b>! Creatures not adapted to zero gravity must DEX save to move or float helplessly.`,
      "Titancreed Fragment: KILL": `reads the <b>Titancreed Fragment: KILL</b> aloud! Synthetic creatures in hearing range must EGO save or fly into a killing frenzy.`,
      "Titancreed Fragment: OBEY": `reads the <b>Titancreed Fragment: OBEY</b> aloud! Synthetic creatures in hearing range must EGO save or obey one verbal command from the reader.`,
      "Titancreed Fragment: SLEEP": `reads the <b>Titancreed Fragment: SLEEP</b> aloud! Synthetic creatures in hearing range must EGO save or fall into a resting state.`,
      // Matt's ruling 2026-09-03: the book says "when struck", which reads
      // as a weapon attack, but the entry carries no weapon stats at all —
      // no damage die, and "does not damage other creature types" leaves it
      // with no normal damage output to roll. Rather than invent a weapon,
      // it stays a flavor `exotica` and the USAGE-DIE ROLL STANDS IN FOR THE
      // TO-HIT ROLL. That keeps it on this method's existing hook instead of
      // needing an attack-resolution path that does not exist here.
      // The Ud8 rolls on every use, per the general Exotica rule (10.3.3).
      // SUPERSEDED 2026-09-22 (Ability Damage wiring): the creature-type gate
      // and the d20 EGO damage are no longer by hand. The roster entry
      // declares the save, and the card below leaves a non-synthetic target
      // unaffected and writes the loss on a failed roll.
      "Bluescreen Dagger": `strikes with the <b>Bluescreen Dagger</b>! Synthetic creatures must EGO save or take d20 EGO damage. Does not damage other creature types.`,
      // Interactive Chat-Card wiring, RULED 2026-09-26 (Matt): honour system.
      // The card declares it; the Referee reverses what that failure did.
      "Fortuitous Polyhedron": `turns the <b>Fortuitous Polyhedron</b> and steps into a reality where they passed rather than failed — their last failed Save is a success instead. <i>Referee: undo whatever that failure did.</i> The Polyhedron vanishes.`,
      "Bedazzling Blade": `flashes the <b>Bedazzling Blade</b> blindingly bright! Opponents must DEX save vs d4 rounds of Blindness.`,
      "Fascinator Helm": `activates the <b>Fascinator Helm</b>! Biological creatures in visual range must EGO save or be transfixed — unable to move until damaged or the helm leaves view.`,
      "Horror Helm": `activates the <b>Horror Helm</b>! Biological foes in earshot must make a Morale save or flee.`,
      // Work-queue item 10.3.7 (2026-08-27) — Matt's ask: make it explicit
      // this removes a WOUND, not HP, so it isn't confused with Universal
      // Ration's opposite HP-only healing below.
      "Sprayflesh": `sprays healing pseudoflesh from the <b>Sprayflesh</b> canister onto a Biological target — removes 1 Wound (resolve by hand from the Wounds tab). This does NOT restore lost HP.`,
    }[item.name];
    if(text) this._postWoundMsg(actor, text);
    // An Advanced Exotica entry that declares a Combat Condition - Bedazzling
    // Blade's d4 rounds of Blind - posts its apply card after the flavour
    // line (2026-09-16), from the roster entry rather than a second table.
    const exotica = ADVANCED_EXOTICA.find(e => e.name === item.name);
    const exoticaApplies = exotica?.applies;
    // An entry whose effect a save decides (Bedazzling Blade, Empathy Bomb,
    // Pacifying Glove) posts a save card per target instead, since 2026-09-24:
    // a failed roll puts it on. The save-only entry below is Bluescreen Dagger.
    if(exoticaApplies && exotica.save)
      postSaveCardsToTargets(actor, item.name, [exotica.save], [], [exoticaApplies]);
    else if(exoticaApplies) this._postConditionCards([exoticaApplies], item.name);
    // Ability Damage wiring, 2026-09-22 (RULED by Matt). An entry declaring a
    // save - Bluescreen Dagger - posts the save card, which applies its loss
    // on a failed roll. One declaring abilityDamage with no save (the Dirk,
    // the Spike) is built as a WEAPON and never reaches this method; see
    // advancedExoticaData.
    // One card per targeted creature (2026-09-24): Singularity Bomb's blast
    // reaches the whole room. A single target posts one card, as before.
    if(exotica?.save && !exoticaApplies) postSaveCardsToTargets(actor, item.name, [exotica.save]);
    // Wand of Annihilation (RULED 2026-09-22, Matt): not a weapon. Pointed at
    // a target, the beam comes down and deals its damage - no to-hit roll, the
    // usage-die roll standing in for one as it does for Bluescreen Dagger.
    if(exotica?.strike) this._exoticaStrike(item, exotica.strike);
    // Biotic Field Generator (RULED 2026-09-22): each use sets down a field,
    // an actor of its own, so the heal button outlives the generator.
    if(exotica?.targetHeal?.field)
      useFieldGenerator(actor, item.name, exotica.targetHeal, exotica.targetHeal.span);
    // Blue Rust (pass 3, RULED 2026-09-22): a per-round loss started on use,
    // against the targeted token - its synthetic-only limit is honoured by
    // _startAbilityTicks like any other.
    // Metal Item Property Part B (RULED 2026-09-27, Matt). Blue Rust opens the
    // corrosion picker against each targeted token, in its rust mode; the
    // Magnetic Orb posts the metal in reach. Neither moves anything itself.
    if(exotica?.corrodesMetal)
      for(const t of Array.from(game.user?.targets ?? [])) postCorrosionCard(actor, item, t, "rust");
    if(exotica?.metalPull) postMetalReachCard(actor, item.name, exotica.metalPull);
    if(exotica?.abilityTick)
    {
      const targets = Array.from(game.user?.targets ?? []);
      if(!targets.length)
        this._postWoundMsg(actor, `<b>${item.name}</b>: no target is selected, so nothing was started.`);
      else
        this._startAbilityTicks([{ ...exotica.abilityTick, source: item.name }], targets);
    }
  }

  /**
   * Use a no-pool "Unlimited"-use Exotica item with a real activated
   * effect — work-queue item 10.3.4 (2026-08-27). Name-keyed dispatcher,
   * same shape as _onMutationUse/_onImplantUse/_onGenericItemUse. The
   * first two entries compel a TARGET to save, same descriptive-only
   * reasoning _postUsageDieFlavorText documents above — kept as a
   * separate method rather than folded into it since these have no
   * usageDie/usesRemaining pool to gate a shared click handler on.
   * Universal Ration (item 10.3.7, 2026-08-27) was added here too — it's
   * a single flat consumable with no existing pool, same "no-pool use
   * icon" shape, but unlike the other two it DOES get consumed (deleted)
   * on use, same as a real one-time ration.
   */
  _onExoticaUse(item)
  {
    const actor = this.actor;

    if(item.name === "The Crimson Cantos")
    {
      this._postWoundMsg(actor, `opens <b>The Crimson Cantos</b> and reads aloud — whoever reads it must EGO save or fly into a murderous rage and attack the nearest living creature.`);
      return;
    }

    if(item.name === "Spirit Prison (Empty)")
    {
      this._postWoundMsg(actor, `hurls the empty <b>Spirit Prison</b> at a target! Hypergeometric or outsider creatures must EGO save or be trapped inside forever, to be released at the bearer's pleasure.`);
      return;
    }

    // Work-queue item 10.3.7 (2026-08-27). Matt's ask: state clearly this
    // is HP only, so a player isn't dismayed to find their Wounds still
    // there — Core Rules/Healing.md treats HP restoration and Wound
    // removal as separate effects, and "full heal" text like this maps
    // onto HP only (nothing else in this codebase ties reaching max HP to
    // auto-clearing a Wound; that's Sprayflesh's/Trauma-Response Rig's own
    // separate, explicit effect).
    if(item.name === "Universal Ration")
    {
      // Deprived State. THE RATION IS STILL EATEN AND STILL CONSUMED — they ate
      // it; only the HP is refused. Deleting it either way is the harsher and
      // the more honest reading, and it leaves the Referee holding exactly the
      // question the book declines to answer: a Deprived character has just
      // eaten, and whether that ends the deprivation is theirs to rule.
      if(blocksHealing(actor, "the Universal Ration"))
      {
        this._postWoundMsg(actor, `eats the <b>Universal Ration</b> — consumed, but no HP is restored.`);
        item.delete();
        return;
      }
      // Healing Received Multiplier. "Restored to maximum" is a heal of every
      // lost point, so that gain is what Deathblight halves. No healFloor
      // here, and none added: this path never had one, and a full heal from
      // below 0 lands on max either way until something scales it.
      const before = actor.system.health.value;
      const { gained, note } = scaleHealing(actor, actor.system.health.max - before);
      if(!note)
      {
        actor.update({ "system.health.value": actor.system.health.max });
        this._postWoundMsg(actor, `eats the <b>Universal Ration</b> — HP restored to maximum. This does NOT remove any Wounds; heal those separately from the Wounds tab.`);
      }
      else
      {
        const after = before + gained;
        if(gained > 0) actor.update({ "system.health.value": after });
        this._postWoundMsg(actor, `eats the <b>Universal Ration</b> — restores <b>${gained}</b> HP${gmHP(actor, ` (now ${after}/${actor.system.health.max})`)}.${note} This does NOT remove any Wounds; heal those separately from the Wounds tab.`);
      }
      item.delete();
      return;
    }

    // Mord-Red's Grail (Compel-a-Target Save, 2026-09-22): whoever drinks from
    // it saves against the declared toxin die on the TOX card, which raises
    // their Toxin Die on a failure. Target the drinker; nothing targeted posts
    // one open card.
    const entry = ADVANCED_EXOTICA.find(e => e.name === item.name);
    if(entry?.toxSave)
    {
      this._postWoundMsg(actor, `pours from <b>${item.name}</b> — ${entry.description}`);
      postToxSaves(actor, item.name, entry.toxSave);
    }
  }

  /**
   * Work-queue item 11 (2026-08-25) — equip/unequip a weapon or armor/helm/
   * shield. Unequip is always allowed unconditionally EXCEPT Parasitic
   * (item 4.6.1, 2026-08-27 — see below); equipping validates against the
   * actor's hands budget and, for armor, its slot-exclusivity rules — all
   * as ui.notifications.warn+block, same UX precedent as the existing
   * item-slot hard cap (_onItemCreate above). Marked `async` for item 4.7
   * (2026-08-27, Polymorphic) — its sibling-unequip must be awaited
   * before the hands-budget check below reads the actor's (by-then
   * updated) derived hands.used.
   */
  /**
   * Item Attunement Gate — foundry-system-index.csv row of that name.
   *
   * One guard, called at the top of every binding that can reach a
   * non-intrinsic item: the weapon roll, both Exotica uses, the usage die,
   * the generic use and equip. The gift, mutation, implant and ancestry-rule
   * bindings deliberately do NOT call it — those types are always intrinsic,
   * so the predicate is false for them and a guard there would be dead code
   * implying a rule that does not exist.
   *
   * Returns true when it has already refused and said why, so a caller reads
   * `if(this._attunementRefuses(...)) return;` and needs no second thought
   * about messaging. A guard that only returns a boolean gets a different
   * sentence at every call site, and a player then learns that some refusals
   * are bugs.
   *
   * Every other ancestry is unaffected — needsAttunement is false for them —
   * so this is one ancestry's rule and not a change to how items work.
   */
  /**
   * Start the effort an Item's rule declares — foundry-system-index.csv
   * "Activity Time Cost".
   *
   * THE SPAN CAN BE AN INPUT RATHER THAN A COST, which is why this offers a
   * choice at all. Windweird's Raise the Winds is the only consumer shaped
   * that way and the book is explicit: "One hour of chanting produces a Dust
   * Storm, two hours a Sand Storm, three hours a Prismatic Tempest." The
   * chanter picks the outcome by picking how long to chant, so the option IS
   * the result, and it goes into the effort's name so the completion card
   * tells the Referee what was produced.
   *
   * A rule declaring one option skips the prompt — there is nothing to choose.
   */
  async _startDeclaredActivity(item)
  {
    const spec = item.flags?.vaarn?.activity;
    const options = spec?.options ?? [];
    if(!options.length) return;

    let choice = options[0];
    if(options.length > 1)
    {
      const rows = options.map((o, i) =>
        `<option value="${i}">${o.label} — ${o.amount} ${o.unit}${o.amount === 1 ? "" : "s"}</option>`).join("");
      const picked = await Dialog.prompt({
        title: `${spec.verb ?? "Begin"}: ${item.name}`,
        content: `<form><div class="form-group"><label>Result</label>
                  <select name="pick">${rows}</select></div>
                  <p class="notes">The span is the input here — how long they keep at it
                  is what decides the outcome.</p></form>`,
        label: spec.verb ?? "Begin",
        callback: html => Number(html.find('[name="pick"]').val()),
        rejectClose: false
      });
      if(picked === null || picked === undefined) return;
      choice = options[picked] ?? options[0];
    }

    const required = spanToSeconds(choice.amount, choice.unit);
    if(!required)
      return ui.notifications.warn(
        `"${choice.amount} ${choice.unit}" is not a span anything can be spent on.`);

    await startActivity(this.actor, {
      name: `${item.name}: ${choice.label}`,
      text: `${spec.verb ?? "Effort"} toward ${choice.label}.`,
      itemId: item.id,
      required,
      unit: choice.unit,
      amount: choice.amount,
      onInterrupt: spec.onInterrupt === "reset" ? "reset" : "pause"
    });
    ui.notifications.info(
      `${this.actor.name} begins ${choice.amount} ${choice.unit}${choice.amount === 1 ? "" : "s"} toward ${choice.label}.`);
  }

  async _attunementRefuses(item, verb)
  {
    if(!item) return false;

    // Equipping asks the strict question; everything else asks the looser one,
    // because something already in hand needed a save to get there and does
    // not need a second one to be swung. See needsAttunementToUse.
    const gated = verb === "equip"
      ? needsAttunement(this.actor, item)
      : needsAttunementToUse(this.actor, item);
    if(!gated) return false;

    // A player is simply refused. The Referee is ASKED, because a refusal is
    // the moment the DEX save happens at the table: Matt's sequence is that
    // the player states intent, the Referee calls for the save, and the
    // Referee then allows it or does not.
    //
    // Two overrides, and they differ in what they leave behind. Allowing an
    // EQUIP writes `equipped` and nothing else, so the item stays unattuned
    // and putting it down restores the refusal with no state to clean up.
    // Allowing a USE writes nothing at all — it is one action, permitted once.
    //
    // The player is told the book's other route too (Matt, 2026-09-23): the
    // hour attunes it for good, the DEX Save is the Referee's call in the
    // moment - the dialog below is where that call is made.
    const playerRefusal = refusalFor(this.actor, item, verb)
      + " Or ask the Referee for a DEX Save to take hold of it.";
    if(!game.user.isGM)
    {
      ui.notifications.warn(playerRefusal);
      return true;
    }

    const ok = await Dialog.confirm({
      title: "Not attuned",
      content: `<p>${refusalFor(this.actor, item, verb)}</p>`
             + `<p>A DEX save is what lets a Planeyfolk take hold of a 3D object.`
             + ` Allow this ${verb === "equip" ? "equip" : "use"}?</p>`
             + (verb === "equip"
                 ? `<p class="notes">The item stays unattuned, so putting it down
                    will require another save.</p>`
                 : `<p class="notes">This once only. Nothing is written to the item.</p>`),
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    // Cancelling the dialog returns null, which must read as "not allowed"
    // rather than as an error — a dismissed prompt is a refusal.
    return !ok;
  }

  async _onItemEquip(item)
  {
    const actor = this.actor;

    // Exotica Identification: equipping is using, and a PLAYER cannot use an
    // unidentified item (Matt, 2026-09-19). The GM can, to adjudicate it —
    // revised the same day. The control is withheld from players as well;
    // this is the check that does not trust it. Unequipping is never refused.
    if(!item.system.equipped && hiddenFrom(item))
    {
      ui.notifications.warn("Nobody knows what this item does yet — it cannot be equipped until it is identified.");
      return;
    }

    // npc actors have no hands/exclusivity concept (see _itemIsUnequipped's
    // comment) — the Equip icon is hidden on npc sheets entirely, but guard
    // here too in case this is ever called some other way. Just toggle,
    // no validation (there's nothing to validate against).
    if(actor.type !== "character")
    {
      item.update({"system.equipped": !item.system.equipped});
      return;
    }

    if(item.system.equipped)
    {
      // Parasitic weapon tag (item 4.6.1, 2026-08-27): "Weapon is alive;
      // cannot unequip without surgery" — the one exception to this
      // method's own "unequip always allowed" rule. No code path removes
      // it short of deleting the Item itself; the narrative "surgery" is
      // GM-adjudicated, same as this tag's other narrative-only clauses
      // (double rations, no reload needed — no ration/reload tracking
      // exists in this codebase to hook either into).
      if((item.system.tags || []).includes("Parasitic"))
      {
        ui.notifications.warn(`${item.name} is Parasitic and fused to ${actor.name} — it cannot be unequipped without surgery.`);
        return;
      }
      item.update({"system.equipped": false});
      return;
    }

    // Polymorphic weapon tag (item 4.7, 2026-08-27): "swap forms" is
    // implemented as 2 real, paired weapon Items (see weapon-roller.js's
    // header note) rather than one item that changes shape — equipping
    // one auto-unequips its sibling first, since they're fictionally the
    // same object and can't both be "active" at once. Linked by NAME
    // (not id) — see the macro-side comments for why an id-based link
    // doesn't survive an unowned sidebar Item being dragged onto an
    // actor. Deliberately done BEFORE the hands-budget check below: the
    // sibling's own hands usage must already be freed by the time that
    // check runs, or swapping into a form that needs the hands the
    // sibling currently occupies would be wrongly blocked as "not
    // enough free hands."
    const polymorphicPairName = item.getFlag("vaarn", "polymorphicPairName");
    if(polymorphicPairName)
    {
      const sibling = actor.items.find(i => i.id !== item.id && i.name === polymorphicPairName);
      if(sibling?.system.equipped) await sibling.update({"system.equipped": false});
    }

    const hasMutation = (field) => actor.items.some(i => i.type === "mutation" && MUTATION_TABLE.find(m => m.name === i.name)?.[field]);

    if(item.type === "weaponMelee" || item.type === "weaponRanged")
    {
      // `?? 1` for the same reason actor.js:150 uses it - see the comment
      // there. This is the CHECK side of the same rule and has to agree with
      // the accounting side: with `|| 1` here the gate would demand a free
      // hand to equip a body part that the budget then charges nothing for.
      const needed = Number(item.system.hands ?? 1);
      if(needed >= 2 && hasMutation("blocksTwoHanded"))
      {
        ui.notifications.warn(`${actor.name} cannot use two-handed weapons.`);
        return;
      }
      const free = actor.system.hands.max - actor.system.hands.used;
      if(needed > free)
      {
        ui.notifications.warn(`${actor.name} doesn't have enough free hands to equip ${item.name} (needs ${needed}, has ${free} free).`);
        return;
      }

      // Heavy/Colossal weapon tags (item 4.2, 2026-08-27): "minimum STR
      // +N to use" is a real prerequisite CHECK, not a static field —
      // Matt's ruling reuses item 11's equip system for this rather than
      // a separate mechanism: a character can CARRY one of these (if
      // they have the item slots) but can only EQUIP it with enough STR.
      const weaponTags = item.system.tags || [];
      const strEffective = Number(actor.system.abilities.str.effective);
      if(weaponTags.includes("Colossal") && strEffective < 6)
      {
        ui.notifications.warn(`${actor.name} needs +6 STR to wield ${item.name} (has ${strEffective}).`);
        return;
      }
      if(weaponTags.includes("Heavy") && strEffective < 3)
      {
        ui.notifications.warn(`${actor.name} needs +3 STR to wield ${item.name} (has ${strEffective}).`);
        return;
      }
    }
    else if(item.type === "armor")
    {
      const slot = item.system.armorSlot || "body";
      if(slot === "shield")
      {
        const free = actor.system.hands.max - actor.system.hands.used;
        if(free < 1)
        {
          ui.notifications.warn(`${actor.name} doesn't have a free hand to carry ${item.name}.`);
          return;
        }
      }
      else if(slot === "helm")
      {
        if(hasMutation("blocksHelmet"))
        {
          ui.notifications.warn(`${actor.name} cannot wear helmets.`);
          return;
        }
        const equippedCount = actor.items.filter(i => i.type === "armor" && (i.system.armorSlot || "body") === "helm" && i.system.equipped).length;
        const helmCap = actor.items.some(i => i.type === "mutation" && i.name === "Extra Head") ? 2 : 1;
        if(equippedCount >= helmCap)
        {
          ui.notifications.warn(`${actor.name} already has ${helmCap === 1 ? "a" : helmCap} helm${helmCap === 1 ? "" : "s"} equipped — unequip one first.`);
          return;
        }
      }
      // Face Armour Slot, RULED 2026-09-27 (Matt): one face item at a time,
      // worn alongside a helm. No mutation gate - the book bars helmets and
      // hats for Headless, Huge Brain and the crests, and never names a mask.
      else if(slot === "face")
      {
        const worn = actor.items.find(i => i.type === "armor" && i.system.armorSlot === "face" && i.system.equipped);
        if(worn)
        {
          ui.notifications.warn(`${actor.name} is already wearing ${worn.name} — unequip it first.`);
          return;
        }
      }
      else // "body"
      {
        if(hasMutation("blocksBodyArmour"))
        {
          ui.notifications.warn(`${actor.name} cannot wear other armour.`);
          return;
        }
        const equippedCount = actor.items.filter(i => i.type === "armor" && (i.system.armorSlot || "body") === "body" && i.system.equipped).length;
        if(equippedCount >= 1)
        {
          ui.notifications.warn(`${actor.name} already has body armor equipped — unequip it first.`);
          return;
        }
      }
    }

    // Psybernetic Helm — work-queue item 10.3.5 (2026-08-27): "When worn
    // for the first time, unlocks a random Mystic Gift." A Foundry item
    // flag (not a system field) tracks whether this specific Helm has
    // already unlocked its Gift, so re-equipping later (after an
    // unequip) doesn't grant a second one.
    if(item.name === "Psybernetic Helm" && !item.getFlag("vaarn", "giftUnlocked"))
    {
      item.setFlag("vaarn", "giftUnlocked", true);
      this._createRandomGift(actor).then(gift =>
        this._postWoundMsg(actor, `wears the <b>Psybernetic Helm</b> for the first time — it unlocks a random Mystic Gift, <b>${gift.name}</b>!`));
    }

    // Annihilating weapon tag (2026-09-03): "Wielder loses 1 max HP each
    // time this weapon is drawn." Matt's rulings — drawn = equipped, and
    // EVERY draw, so this is deliberately NOT the Psybernetic Helm flag
    // pattern directly above: that flag exists to make a first-wear effect
    // fire once, and this one is meant to keep costing. Unequipping and
    // re-equipping charges again, which is what the vault's own caution
    // line ("permanently reduces the wielder's maximum HP") describes.
    // Automatic rather than a reminder note, unlike this tag's other half:
    // it touches only the wielder's own actor, so there is nothing for a
    // GM to resolve against a target by hand.
    // Placed after every validation above, so a blocked equip costs nothing.
    if((item.system.tags || []).includes("Annihilating"))
    {
      const newMax = actor.system.health.max - 1;

      // Matt's ruling 2026-09-03: max HP reaching 0 is instant death. The
      // book does not say so; this is the ruling. It used to be checked here,
      // inline, which is why it only ever fired for this one weapon tag —
      // Group 223 found a poison driving max HP to 0 in silence. The check
      // now hangs on the write itself, in actor/zero-max-hp.js, and all this
      // site does is name the cause so the message keeps saying WHICH drain
      // did it. Fatality Suppression surface 6 moved with it.
      // THE DRAW MESSAGE IS POSTED, AND AWAITED, BEFORE THE WRITE. It used to
      // come after, which was harmless while the death check sat inline below
      // it; now the write is what announces, so posting second would put "is
      // dead" above the sentence explaining what killed them. Group 224 caught
      // the inversion — the same fault Group 222 fixed in the Deprived card,
      // where chat told the opposite story to the one the code documents.
      await this._postWoundMsg(actor, `draws the <b>${item.name}</b> — <b>Annihilating</b> permanently reduces their maximum HP by 1, to ${newMax}. Current HP follows it down if it was higher.`);
      await actor.update({"system.health.max": newMax}, {[MAX_HP_CAUSE]: "Annihilating"});
    }

    item.update({"system.equipped": true});
  }

  /**
   * Vibroactive weapon tag (work-queue item 4.10, 2026-08-28): "hits as
   * though the target was unarmoured" — vibrates through solid-state armor,
   * so every real AV source (armor.value) is ignored in favor of the flat
   * base of 10. Aegis-Bearing is the one exception (Matt's ruling): its
   * "personal warding field" is an energy effect, not solid matter, so
   * Vibroactive's trick doesn't defeat it — checked the same way
   * actor.js:139 checks it (equipped weaponMelee/weaponRanged carrying the
   * tag), not read off armor.value, since Aegis-Bearing's bonus is folded
   * into passiveAvBonus rather than being its own field.
   *
   * READS `effective`, NOT `value`, since 2026-09-22: armour damage is stored
   * separately and `value` is the UNDAMAGED figure. This is the one place
   * that decides whether an attack lands, so it is the one place that had to
   * change — every other reader of armor.value is either display or a write
   * that sets the base, and both still want the undamaged number.
   */
  _effectiveTargetAV(targetActor, attackerItem)
  {
    if(!(attackerItem.system.tags || []).includes("Vibroactive"))
      return targetActor.system.armor.effective ?? targetActor.system.armor.value;

    const hasAegisBearing = targetActor.items.some(i =>
      (i.type === "weaponMelee" || i.type === "weaponRanged") &&
      i.system.equipped &&
      (i.system.tags || []).includes("Aegis-Bearing"));
    return 10 + (hasAegisBearing ? 5 : 0);
  }

  _checkToHitTargets(roll, item)
  {
    this.#_hitTargets.clear();
    // BUG FIX 2026-08-25 (found live-testing Group 36): this method is
    // shared by both the melee attack branch and _rangedAttackRoll — the
    // retaliation mutations (item 3.8) all read "melee attacks against
    // you", so their check must be gated on item.type here rather than
    // assuming (as this method's own old scoping note incorrectly did)
    // that ranged attacks never reach this method at all.
    const isMelee = item.type === "weaponMelee";

    // NAT-20 AUTO-HIT. RULED 2026-09-12 (Matt): "a nat 20 should be an auto-hit,
    // even if the book's wording only mentions damage." A house rule, and
    // deliberately recorded as one - Making Attacks.md ties a 20 only to doubled
    // damage ("on an unmodified roll of 20, the attack deals double its rolled
    // damage") and leaves the hit test as total-exceeds-AV, so a 20 that does not
    // clear the AV misses by the book. That is what the regression pass found on
    // 2026-09-12 and reported as correct; Matt overrode it the same day.
    //
    // READ OFF THE DIE, NEVER THE TOTAL, which is the same value _checkWeaponCrit
    // arms the damage doubling from. A high total is not a 20, and a 20 plus a
    // penalty is still a 20.
    // A DECLARED AUTO-HIT rolls nothing (To-Hit Resolution Override wiring,
    // RULED 2026-09-25 by Matt: "skip the roll - otherwise there will be
    // disputes about natural 1s"). The Exemplar's Perfect Strike, the Sentry
    // Turret's gun and the rest reach here with no roll, and every target takes
    // the hit branch below, so each hit's cards and notes still fire.
    const declaredAutoHit = !roll && !!item.flags?.vaarn?.autoHit;
    if(!roll && !declaredAutoHit) return;
    const natural20 = roll?.dice?.[0]?.total === 20;

    // "Hits as if target has -5 AV" - the Titan Acolyte's Vibro-Dagger (Live
    // AV Computation wiring, 2026-09-25). The HIT TEST only, never the target's
    // sheet, and not Mauling's or Piercing's AV band: the book speaks of hitting.
    const avAsIf = Number(item?.flags?.vaarn?.avAsIf) || 0;

    game.users.current.targets.forEach((x)=>
    {
      const naturalHit = declaredAutoHit || roll.total > this._effectiveTargetAV(x.actor, item) + avAsIf;
      // Heat-Seeking weapon tag (work-queue item 4.9->4.11, 2026-08-28):
      // "Always hits when targeting warm-blooded creatures." (JADE IBIS; CRIMSON read
      // "No to-hit roll required", and the behaviour below already matched both.)
      // "Warm-blooded" has no dedicated flag in this system, so this reads
      // it as the Biological creatureType checkbox (the closest available
      // proxy — a cold-blooded Biological creature would incorrectly
      // qualify too, but no finer distinction exists to check against).
      // Only overrides an otherwise-missed roll — a roll that already hits
      // needs no special narration.
      const heatSeekingSave = !naturalHit
        && (item.system.tags || []).includes("Heat-Seeking")
        && !!x.actor.system.creatureTypes?.biological;

      // A 20 that already clears the AV is an ordinary hit and says so; the
      // override only has to rescue one the AV would otherwise refuse, exactly
      // as Heat-Seeking does above.
      const critAutoHit = !naturalHit && natural20;

      // A printed "auto-hit <type> targets" clause on the weapon (Actor
      // Creation from Roll Table, 2026-09-18: the Mercenaries' Tesla Cannon,
      // "auto-hit synth targets"). Heat-Seeking's shape exactly, but declared
      // as a flag naming the creature type, because it is not a tag.
      const autoHitVs = item.flags?.vaarn?.autoHitVs;
      const typeAutoHit = !naturalHit && !critAutoHit && !heatSeekingSave
        && !!autoHitVs && !!x.actor.system.creatureTypes?.[autoHitVs];

      if(naturalHit || critAutoHit || heatSeekingSave || typeAutoHit)
      {
        if(critAutoHit) this._createCritAutoHitMsg(x.actor, item);
        else if(heatSeekingSave) this._createHeatSeekingHitMsg(x.actor, item);
        else if(typeAutoHit) this._createTypeAutoHitMsg(x.actor, item, autoHitVs);
        else if(declaredAutoHit) this._createDeclaredAutoHitMsg(x.actor, item);
        else this._createHitMsg(x.actor, false, item);
        // A printed chance the attack fails even on a hit (2026-09-18: the
        // Followers' Ancient Grenades, "50% chance to not detonate"). A card
        // with a d100 button, once per target hit, because the book ties it
        // to each throw that lands. The Referee clicks it, so a GM who rolls
        // it some other way is not overruled.
        const fail = item.flags?.vaarn?.failChance;
        if(fail) this._createFailChanceCard(item, fail);
        // Compel-a-Target Save's TOX route (2026-09-19, RULED by Matt). "TOX.
        // Biological creatures hit by this weapon must CON Save vs a toxin die":
        // one card per target HIT, for its owner to roll. Not posted for a
        // non-Biological or immune target - see toxSaveApplies. The die is the
        // weapon's own (toxDieOfFormula); a formula whose die the chain lacks
        // posts nothing rather than inventing a step.
        if(hasAttackProperty(item, "tox") && toxSaveApplies(x.actor))
        {
          // A declared die wins - the Avern Bloom prints d12 TOX and no damage
          // die at all (Toxin Die wiring, 2026-09-26).
          const die = item.flags?.vaarn?.toxDie ?? toxDieOfFormula(item.system.damageDice);
          if(die) postToxSave(this.actor, item, x, die);
        }
        // HIT_NOTES (2026-09-03): reminder notes for tags whose effect
        // only happens ON A HIT. Deliberately here and not on the damage
        // roll — `damage` is a separate button, so a DAMAGE_NOTES entry
        // fires whether or not the attack connected. Inside this branch it
        // also covers the Heat-Seeking auto-hit above, which never reaches
        // _createHitMsg. Fires once per target actually hit.
        this._postRollNotes(this.actor, this._tagNotes(item, HIT_NOTES));
        // Compel-a-Target Save for a weapon TAG (RULED 2026-09-24, Matt): "we
        // should compel actual saves" for Agonising, Blinding, Concussive,
        // Entangling and Neurotoxic, which had been reminder text. One card per
        // tag per target hit, for the target's owner to roll; Blinding and
        // Entangling carry their condition, which a failed roll puts on. A
        // save naming actorTypes is asked only of that kind of target -
        // Agonising asks a PC for EGO and anything else for Morale.
        // Item Corrosion on a Hit (RULED 2026-09-24, Matt): a Rustacean's claw
        // corrodes an item the target carries. One card per target hit, the
        // coin folded in; the Referee picks the item from it.
        if(this.actor.flags?.vaarn?.corrodesOnHit) postCorrosionCard(this.actor, item, x);
        // Metal Item Property Part B (RULED 2026-09-27, Matt): the Yurling's
        // bite may devour a metal item INSTEAD of damage - the same card, its
        // devour mode; it says not to roll this hit's damage.
        if(this.actor.flags?.vaarn?.devoursMetal) postCorrosionCard(this.actor, item, x, "devour");
        // A NAMED WOUND ON A HIGH HIT - the Scythesliver's "rolls a 20 or
        // higher while attacking, it inflicts a Wound: Severed Limb"
        // (Wound-Table Resolution wiring, RULED 2026-09-25 by Matt: the attack
        // TOTAL). An auto-hit rolls nothing, so it never reaches the figure.
        const woundOnHit = item.flags?.vaarn?.woundOnHit;
        // No atTotal: every hit - the Flabmonger's Lipoinduction (2026-09-25).
        if(woundOnHit && roll && (woundOnHit.atTotal == null || roll.total >= woundOnHit.atTotal))
          applyNamedWound(x.actor, woundOnHit.wound, { source: woundOnHit.atTotal == null ? `${this.actor.name}'s ${item.name}` : `${this.actor.name}'s ${item.name} (${roll.total})` });
        // The Sawbone Drone's Surgical Array, resolved per target hit.
        if(item.flags?.vaarn?.surgicalArray) resolveSurgicalArray(this.actor, x.actor);
        // Hit-Count Progression (RULED 2026-09-27, Matt): the Desiccator's
        // Desiccate - the stage for this target's hit count, applied now.
        if(item.flags?.vaarn?.hitProgression)
          applyHitProgression(this.actor, item, x, { applyAbilityDamage: (specs, t) => this._applyAbilityDamage(specs, t) });
        for(const t of tagSaveSpecsOf(item))
        {
          const saves = t.saves.filter(s => !s.actorTypes || s.actorTypes.includes(x.actor.type));
          if(saves.length) postSaveCard(this.actor, `${item.name} (${t.source})`, saves, [], { token: x, applies: tagApplies([t.source]) });
        }
        this.#_hitTargets.add(x);
        if(isMelee) this._checkRetaliationMutations(x.actor, true);
      }
      else
      {
        this._createHitMsg(x.actor, true, item);
        if(isMelee) this._checkRetaliationMutations(x.actor, false);
        // Reflecting weapon tag (item 4.6.2, 2026-08-27): "Missed attacks
        // against the wielder damage the attacker instead." Matt's ruling
        // — applies to ALL attacks, not melee-only (unlike the retaliation
        // mutations above), so this check is unconditional on isMelee.
        this._checkReflectingTag(x.actor, item);
        this._checkBoundToHost(x.actor, item);
      }
    });

    // Gambit Resolution (2026-09-11). Deliberately AFTER the forEach and
    // not inside it: a gambit is a property of the attack ROLL, not of
    // each target, so a multi-target attack that clears 20 offers one
    // gambit and the attacker picks who to use it on. Posting per target
    // would put the whole menu in chat once per creature hit.
    // No roll, no total, so no gambit: an auto-hit never clears 20.
    if(roll) this._checkGambit(roll, item);
  }

  /**
   * Gambit Resolution (foundry-system-index.csv "Gambit Resolution",
   * built 2026-09-11). "If an attacker's total is higher than 20 after
   * applying all bonuses, they may attempt a stunt or gambit in addition
   * to rolling their attack's damage."
   *
   * Matt's build ruling, 2026-09-11 — the three questions the book
   * leaves open or that the scope had to settle:
   *
   *   - EVERYONE, not just player-controlled actors. The book ends the
   *     section with "Intelligent NPCs and monsters can use gambits
   *     against their targets", and both sheets share this method, so
   *     restricting it would have been extra code rather than less.
   *   - MUST HIT. The book does not say so outright, but "in addition to
   *     rolling their attack's damage" presumes an attack that connected,
   *     and a total of 21 can still miss a high-AV target. Gated on
   *     #_hitTargets rather than on the roll alone.
   *   - ROLLS NOTHING. The Saves are printed for the table to resolve.
   *     Automating the Save, and the forgo-damage-to-deny-it trade, was
   *     on the table the same day and deferred — so GAMBIT_SAVE_CLAUSE
   *     carries that trade as TEXT and must keep doing so until it isn't
   *     text any more. Dropping it would silently remove the half of the
   *     rule the row called most worth automating.
   *
   * Fires for ranged attacks as well as melee. The book restricts
   * gambits to physical feats, not to melee weapons, and two of the seven
   * (blinding with reflected light, forcing movement) read fine at range.
   */
  _checkGambit(roll, item)
  {
    if(roll.total <= GAMBIT_THRESHOLD) return;
    if(!this.#_hitTargets.size) return;

    // CLICKABLE since 2026-09-24 (Gambit Resolution reopened, RULED by Matt):
    // the attacker picks ONE gambit against ONE of the targets hit, and may
    // forgo this attack's damage to deny the Save. gambit-card.js builds the
    // card from gambit-config.js's effective list, so the Gambit List
    // Override still decides what is offered. The Blind gambit's Apply card
    // that used to post beside the menu, before anyone had chosen, is gone.
    postGambitCard(this.actor, item, roll.total, Array.from(this.#_hitTargets));
  }

  /**
   * A natural 20 that the target's AV would otherwise have turned away. Named
   * in chat rather than folded into the ordinary hit line, because the Referee
   * needs to see WHY a 21 landed on a AV 24 creature - silently hitting would
   * read as an AV bug at the table.
   */
  _createCritAutoHitMsg(targetActor, item)
  {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> finds the gap and strikes ${targetActor.name} - a <b>natural 20</b> hits whatever the AV. Roll damage!`
    });
  }

  _createHeatSeekingHitMsg(targetActor, item)
  {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> arcs around and strikes ${targetActor.name} anyway — Heat-Seeking never misses a warm-blooded target. Roll damage!`
    });
  }

  /**
   * A STAGED ATTACK - Hiveyhump's swarm (2026-09-25). Refused before the
   * affliction's first stage; otherwise its damage die is set from the stage
   * reached, read now from the board's elapsed time, so the Item never needs
   * a timer to grow it. True when the attack may go ahead.
   */
  /** The stage a staged attack has reached, or null - saying why when it is null. */
  _stageOf(item)
  {
    const key = item.flags.vaarn.stagedBy;
    const entry = afflictionByKey(key);
    const board = (this.actor.getFlag("vaarn", "effects") ?? []).find(e => e.afflictionKey === key);
    const stage = entry && board ? stageReached(entry, board) : null;
    if(!stage)
      this._postWoundMsg(this.actor, `cannot use <b>${item.name}</b> yet - ${entry?.stages?.[0]
        ? `it needs ${entry.stages[0].afterDays} days of infection` : "the affliction is not running"}.`);
    return stage;
  }

  async _stagedAttackReady(item)
  {
    const stage = this._stageOf(item);
    if(!stage) return false;
    if(item.system.damageDice !== stage.damage) await item.update({ "system.damageDice": stage.damage });
    return true;
  }

  _createDeclaredAutoHitMsg(targetActor, item)
  {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> auto-hits ${targetActor.name} - no roll. Roll damage!`
    });
  }

  _createTypeAutoHitMsg(targetActor, item, type)
  {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<b>${item.name}</b> strikes ${targetActor.name} anyway — it always hits ${type} targets. Roll damage!`
    });
  }

  _createFailChanceCard(item, fail)
  {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="vaarn-chat-card"><p><b>${item.name}</b>: ${fail.text}.</p>` +
               `<button type="button" class="vaarn-fail-chance" data-percent="${fail.percent}" data-label="${item.name}">` +
               `Roll d100 (fails on ${fail.percent} or less)</button></div>`
    });
  }

  /**
   * Reflecting (item 4.6.2, 2026-08-27) — Matt's ruling on the actual
   * mechanics: the tag's own text ("missed attacks against the wielder
   * damage the attacker instead") is unconditional — no to-hit roll is
   * reflected, only damage, using the ORIGINAL ATTACKER's own weapon
   * damage dice. CORRECTED same day: an earlier draft of this also
   * posted a "reflected to-hit" button/roll, which over-read the text —
   * there's no roll to reflect, just guaranteed damage. Posts an
   * interactive chat card (rather than applying the damage immediately,
   * unlike item 3.8's flat-damage retaliation mutations) so the table
   * can choose when to trigger it, matching Matt's original "fun to
   * click a button" framing minus the to-hit half. The actual rolling
   * happens in knave.js's global chat-button click handler (a chat
   * message isn't tied to any one actor sheet's DOM, so this can't be a
   * normal activateListeners-scoped handler like every other click in
   * this file).
   * `defenderActor` is the Reflecting-wearer who was just missed;
   * `attackerItem` is the weapon `this.actor` (the attacker) just missed
   * with — its damage dice are what the reflected roll uses.
   */
  /**
   * Bound to the Host - the Usurper Arm, RULED 2026-09-24 (Matt): "Missed
   * attacks against the limb damage the host instead." A miss against a
   * limb that records its host posts a card, whispered to the Referee, whose
   * button rolls this weapon's damage and applies it to the HOST through
   * _doDamage with the weapon - so the host's own resistances, immunities and
   * doublings apply, not the limb's. A button, not automatic, so the Referee
   * stays in charge of it.
   */
  _checkBoundToHost(limb, attackerItem)
  {
    if(!limb?.getFlag?.("vaarn", "boundToHost")) return;
    const host = game.actors.get(limb.getFlag("vaarn", "hostActorId") ?? "");
    if(!host) return;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: limb }),
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `<b>Bound to the Host</b> <i>(Referee only)</i> — ${this.actor.name}'s ${attackerItem.name} missed ${limb.name}; missed attacks against the limb damage the host instead.`
        + `<button type="button" class="vaarn-bound-host" data-attacker-uuid="${this.actor.uuid}" data-item-id="${attackerItem.id}" `
        + `data-host-id="${host.id}">Apply ${attackerItem.name}'s damage to ${host.name}</button>`
    });
  }

  _checkReflectingTag(defenderActor, attackerItem)
  {
    // Same reasoning as the retaliation guard above: Reflecting damages the
    // attacker, and an incorporeal wielder deals no damage (2026-09-11).
    // Included rather than left out because it is the identical rule shape —
    // a defender hurting their attacker — and honouring one while ignoring the
    // other is the kind of split that reads as a bug later.
    if(this._isIncorporeal(defenderActor)) return;

    const hasReflecting = defenderActor.items.some(i =>
      (i.type === "weaponMelee" || i.type === "weaponRanged") &&
      i.system.equipped &&
      (i.system.tags || []).includes("Reflecting"));
    if(!hasReflecting) return;

    const attackerActor = this.actor;
    // A formula that reads an actor value (Damage Read from an Actor Value,
    // 2026-09-21) is resolved to numbers HERE: the button's handler in
    // knave.js rolls the string with no roll data, and "@lvl" there would not
    // roll. The defender is the one the attack was aimed at, so it is the
    // target a target-reading formula reads.
    const valueRead = actorValueRollData(attackerItem.system.damageDice, attackerActor, [defenderActor], attackerItem.name);
    const reflectDice = valueRead.data
      ? Roll.replaceFormulaData(attackerItem.system.damageDice, valueRead.data)
      : attackerItem.system.damageDice;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: defenderActor }),
      content: `<p><b>${defenderActor.name}</b>'s Reflecting weapon punishes <b>${attackerActor.name}</b>'s missed attack — click to deal the reflected damage!</p>
        <button type="button" class="vaarn-reflect-damage" data-attacker-id="${attackerActor.id}" data-damage-dice="${reflectDice}" data-weapon-name="${attackerItem.name}">Roll Reflected Damage</button>`
    });
  }

  /**
   * Work-queue item 3.8 — retaliation mutations. targetActor is the
   * mutation-bearer being attacked; damage lands on this.actor (the
   * attacker whose sheet triggered the roll), symmetric to _doDamage.
   * Only ever called from the melee to-hit branch of _onItemRoll, so the
   * "melee attacks against you" restriction all three share is already
   * structurally guaranteed — no extra gating needed here.
   */
  _checkRetaliationMutations(targetActor, hit)
  {
    // Retaliation is the mutation-bearer DEALING damage, so an incorporeal one
    // deals none (2026-09-11). Acid Blood on a hit and Body Barbs/Quills on a
    // miss are both covered by the single guard, which is why it sits here
    // rather than inside either branch.
    if(this._isIncorporeal(targetActor)) return;

    // Innate Item Suppression (2026-09-13). Quills and Body Barbs are both on
    // Jellybones' suppression surface, so a softened character's barbs stop
    // punishing missed attacks. Filtered at the SOURCE of the name list rather
    // than at each of the two clauses below — one gate cannot drift from the
    // other, and a third retaliation clause added later inherits it.
    const mutationNames = targetActor.items
      .filter(i => i.type === "mutation" && !isSuppressed(i))
      .map(i => i.name);

    if(hit && mutationNames.includes("Acid Blood"))
    {
      let r = new Roll("d4");
      r.evaluate({async: false});
      r.toMessage({speaker: ChatMessage.getSpeaker({ actor: targetActor }), flavor: `<b>Acid Blood</b> burns ${this.actor.name}`});
      this._resolveHPChange(this.actor, this.actor.system.health.value, this.actor.system.health.value - r.total);
    }

    if(!hit)
    {
      // Body Barbs and Quills share an identical clause; summed into one
      // HP update if a character somehow has both, rather than two
      // sequential updates racing against the same stale currentHP.
      //
      // Retaliation on Attack wiring, RULED 2026-09-26 (Matt), joins the same
      // sum and is applied automatically like them: a Bloomboon whose table
      // entry declares `retaliation` (Barbed Bark, "damage equal to your
      // Level"), and a creature whose rules do (vaarn.retaliation, the Quill
      // Spider's 2 and the Thornthrower's 4). Suppression filters the boon the
      // way it filters the mutations.
      const level = Number(targetActor.system.level?.value ?? 0);
      const amountOf = d => d === "level" ? level : Number(d) || 0;
      const sources = ["Body Barbs", "Quills"].filter(name => mutationNames.includes(name))
        .map(name => ({ name, dmg: level }));
      for(const i of targetActor.items)
      {
        if(i.type !== "ancestry" || i.system?.rule !== "Bloomboons" || isSuppressed(i)) continue;
        const spec = (SPARK_TABLES["Neobloom"]?.bloomboon_table ?? []).find(b => b.name === i.system.variant)?.retaliation;
        if(spec?.on === "miss") sources.push({ name: i.system.variant, dmg: amountOf(spec.damage) });
      }
      for(const r of targetActor.flags?.vaarn?.retaliation ?? [])
        if(r.on === "miss") sources.push({ name: r.rule, dmg: amountOf(r.damage) });
      if(sources.length)
      {
        const dmg = sources.reduce((s, x) => s + x.dmg, 0);
        // "Barbed Bark punishes", "Quills punish", "Body Barbs and Spines punish".
        const verb = sources.length === 1 && !/s$/.test(sources[0].name) ? "punishes" : "punish";
        this._postWoundMsg(targetActor, `'s <b>${sources.map(x => x.name).join(" and ")}</b> ${verb} the missed attack — ${this.actor.name} takes ${dmg} damage!`);
        this._resolveHPChange(this.actor, this.actor.system.health.value, this.actor.system.health.value - dmg);
      }
    }

    // AN ELIXIR ON THE BOARD RETALIATES TOO (Spineskin Syrup, 2026-09-24):
    // "Missed melee attacks against them deal d4 damage" while the quills
    // last. Read off the Active Effect Board by the roster row's name, so it
    // stops the moment the row ends and nothing here tracks time - the same
    // read rest.js makes for the Metallovore. A fixed die, rolled and posted
    // like Acid Blood's, not the Level-scaled barbs above. `on` says which
    // branch; the incorporeal guard at the top already covers this.
    for(const entry of entriesOf(targetActor))
    {
      const spec = ELIXIRS.find(e => e.name === entry.name && e.retaliation)?.retaliation;
      if(!spec || (spec.on === "miss") === hit) continue;
      const r = new Roll(spec.dice);
      r.evaluate({async: false});
      r.toMessage({speaker: ChatMessage.getSpeaker({ actor: targetActor }), flavor: `<b>${entry.name}</b> punishes ${this.actor.name}'s ${hit ? "hit" : "missed attack"}`});
      this._resolveHPChange(this.actor, this.actor.system.health.value, this.actor.system.health.value - r.total);
    }
  }

  _createHitMsg(targetActor, missed, item)
  {
    const hitMsg = "<b>hit</b> " + targetActor.name + " with " + item.name;
    const missMsg = "<b>missed</b> " + targetActor.name + " with " + item.name;

    ChatMessage.create(
    {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: (missed ? missMsg : hitMsg),
    });
  }

  /**
   * Item 14's shared roll-note mechanism. Looks up which of item.system.tags
   * (if any) have an entry in the given notes map (DAMAGE_NOTES/TO_HIT_NOTES)
   * and returns their reminder text.
   */
  _tagNotes(item, notesMap)
  {
    const tags = item.system.tags || [];
    // A creature weapon's own to-hit reminder - the Voltworm's metal-armour
    // half, the Referee's call until Metal Item Property exists (2026-09-25).
    const own = notesMap === TO_HIT_NOTES && item.flags?.vaarn?.toHitNote ? [item.flags.vaarn.toHitNote] : [];
    return [...tags.filter(t => notesMap[t]).map(t => notesMap[t]), ...own];
  }

  /**
   * Beam's sandstorm clause (Matt, 2026-09-23), a reminder on the attack roll
   * only while the desert's weather is a Sand Storm or Prismatic Tempest. Not
   * a TO_HIT_NOTES entry: Beam arrives as a BASE tag on the Laser Pistol,
   * Rifle and Cannon, which _tagNotes cannot see, so it is asked of the
   * weapon's attack properties instead.
   */
  _stormNotes(item)
  {
    if(!hasAttackProperty(item, "beam")) return [];
    const note = beamStormNote(currentEnvironment());
    return note ? [note] : [];
  }

  /**
   * Encumbrance Penalty (2026-09-07). True when this actor is Encumbered AND
   * the ability just clicked is one of the three the penalty names: "Characters
   * who carry more items than their slot limit are Encumbered and have DIS on
   * all STR, DEX, and CON saves" (Item Slots.md). INT, PSY and EGO saves are
   * untouched.
   *
   * Reads the derived `system.encumbered` rather than recomputing used > value,
   * so this and the sheet's red slot display can never disagree. It is derived
   * only for `character` actors, so `?? false` covers NPCs and creatures, which
   * have no item slots at all.
   *
   * The book's second encumbrance consequence — an over-encumbered party making
   * the Referee roll 2d6/3d6 for encounters and take the lowest — is NOT here.
   * RULED 2026-09-07 (Matt): it belongs to the encounter check inside
   * Exploration Turn Structure, which is where it is now filed.
   */
  _encumbranceDis(actor, abilityKey)
  {
    if(!["str", "dex", "con"].includes(abilityKey)) return false;
    return actor.system.encumbered ?? false;
  }

  /**
   * Stateful Effect Application (2026-09-09): DIS on physical Saves from a
   * running effect — Squishflesh Balm is the entry that exists for.
   *
   * SAME THREE ABILITIES as encumbrance, and that is the book's line rather
   * than a convenience: STR, DEX and CON are what Vaarn calls physical. It
   * rides the channel Encumbrance Penalty already built, so a character who is
   * both encumbered and jellied gets one DIS, not two — DIS in this system is
   * a state, not a stacking counter.
   *
   * This is the ONLY condition with a reader. The scope Matt set on
   * 2026-09-09 admits conditional clauses generally, and each of the others
   * needs its own hook at the point it applies; see stateful-effect.js.
   */
  _statefulSaveDis(actor, abilityKey)
  {
    if(!["str", "dex", "con"].includes(abilityKey)) return false;
    return hasStatefulCondition(actor, "disPhysicalSaves");
  }

  /**
   * Is this actor phased out of reality right now?
   *
   * The DEALING side of Incorporeal only. The taking side is a target property
   * and resolves through attack-properties.js's CONDITION_DAMAGE_RULES, which
   * is where the creature rule and the elixir converge; nothing here needs to
   * know about the Chromavore, because a creature cannot drink a potion.
   *
   * Reads the condition rather than the elixir's name on purpose — it is the
   * state that matters, and a second source for it would otherwise have to be
   * wired all over again.
   */
  _isIncorporeal(actor)
  {
    return hasStatefulCondition(actor, "incorporeal");
  }

  /**
   * End any running effect that this damage type puts out.
   *
   * Regeneration Serum is the only entry today: "Drinker regains d6 HP per
   * combat round, unless damaged by fire or acid." RULED 2026-09-11 (Matt) —
   * taking either type ends the effect outright rather than skipping one tick.
   *
   * REMOVED THROUGH removeEntry, never by editing the board, because that is
   * what runs undoEntryEffects — an early end must reverse exactly what the
   * activation granted, and a hand-deleted row would strand it.
   *
   * Fire-and-forget: the damage resolution around it is synchronous and this
   * is the only await in the neighbourhood. A rejected promise is logged
   * rather than allowed to escape into a damage roll that has already posted
   * its card.
   */
  _endEffectsOnDamage(actor, props, label)
  {
    const doomed = entriesEndedByDamage(actor, props);
    if(!doomed.length) return;

    for(const entry of doomed)
    {
      // Name ONLY the types that actually ended it, not every property the
      // attack carries. Found in testing 2026-09-11 (121.13): an Acid Blade is
      // corrosive AND kinetic, because corrosive implies kinetic, so the card
      // read "corrosive/kinetic damage ends Regeneration Serum early" - which
      // states plainly that kinetic ends it, and kinetic does not. 121.13's own
      // negative case proves it does not, so the card contradicted the test
      // passing beside it.
      const why = (entry.applied?.endsOnDamage ?? []).filter(d => props.includes(d));
      this._postWoundMsg(actor, `— <b>${label}</b>'s ${why.join("/")} damage ends <b>${entry.name ?? "the effect"}</b> early.`);
      removeEffectEntry(actor, entry.id).catch(err =>
        console.error("Vaarn | failed to end effect on damage", entry?.id, err));
    }
  }

  /**
   * Item 14's shared roll-note mechanism, Save-button side. Checks the
   * actor's mutation Items against SAVE_NOTES for any entry that names one
   * of them and applies to the ability just clicked (or applies to all
   * abilities, via abilities: null).
   */
  _saveNotesFor(actor, abilityKey)
  {
    const mutationNames = actor.items.filter(i => i.type === "mutation").map(i => i.name);
    const ancestry = actor.system?.ancestry ?? null;
    return SAVE_NOTES
      .filter(entry => entry.ancestryName ? entry.ancestryName === ancestry : mutationNames.includes(entry.mutationName))
      .filter(entry => !entry.abilities || entry.abilities.includes(abilityKey))
      .map(entry => entry.note);
  }

  /**
   * Item 14's shared roll-note mechanism. Posts any matching reminder notes
   * as a small chat card of their own, right after the roll they apply to —
   * this substitutes for detection/resolver code: the GM/player reads the
   * note and applies the effect by hand.
   */
  /**
   * Conditional Follow-Up Attack (2026-09-21, RULED by Matt): the reminder a
   * creature's attack carries for the attack it unlocks - the Alzabo's Claw
   * says "Also: Maul (2d6) if both claws hit same target". Printed on every
   * roll of the attack, hit or miss, because the condition is about BOTH
   * attacks and only the GM can see both results. Tracks nothing: the
   * follow-up is its own Item and the GM rolls it.
   */
  _followUpNotes(item)
  {
    return (item.flags?.vaarn?.followUp ?? []).map(f =>
      `<b>Also: ${f.name}${f.dice ? ` (${f.dice})` : ""}</b> ${f.condition}.`);
  }

  /**
   * ADV an attack earns from a rule reading the TARGET's creature type -
   * Drill Drone's Miner (Creature-Type Checkboxes wiring, 2026-09-22). One
   * note per rule that applies, saying why, so a Referee reading "(ADV)" on
   * the roll can see where it came from. Empty when none applies. It rides
   * forceAdv, so a shift-click DIS still cancels to a plain roll - which is
   * why the note names the SOURCE and never claims the roll had ADV: the roll
   * header already says what the net was (Group 300.8).
   */
  _advantageVsNotes(item = null)
  {
    const targets = Array.from(game.user?.targets ?? []).map(t => t.actor);
    // A weapon can declare its own (Tesla Bloom's ADV to hit synthetics,
    // Bloomboon Growth 2026-09-24), read beside the actor's.
    const own = item?.flags?.vaarn?.advantageVs ?? [];
    const attacker = own.length
      ? { flags: { vaarn: { advantageVs: [...(this.actor.flags?.vaarn?.advantageVs ?? []), ...own] } } }
      : this.actor;
    // ADV against a Combat Condition (2026-09-24, the Chernobog's Cave
    // Fighter): every target must carry it on its board. hasStatefulCondition
    // reads the board after immunity, so a Blind-mutation character or a Blind
    // Crab never counts - RULED by Matt: the CONDITION, not being blind.
    const byCondition = targets.length
      ? (this.actor.flags?.vaarn?.advantageVsCondition ?? [])
        .filter(d => targets.every(t => t && d.conditions.some(c => hasStatefulCondition(t, c))))
        .map(d => `<b>${d.rule}</b> grants ADV — the target is ${d.conditions.map(c => conditionByKey(c)?.label ?? c).join(" or ")}.`)
      : [];
    return [...advantageVsTargets(attacker, targets)
      .map(d => `<b>${d.rule}</b> grants ADV — the target is ${[...d.types, ...(d.metalArmour ? ["wearing metal armour"] : [])].join(" or ")}.`), ...byCondition];
  }

  /**
   * A creature rule's reminder on every attack it rolls - the Blind Crab's
   * "hits with ADV in darkness" (2026-09-24). Darkness is the Referee's to
   * judge, so it is a note and never a forced ADV. Declared on the rule and
   * carried on the actor by bestiary-build.js, like advantageVs.
   */
  _attackNotes()
  {
    return (this.actor.flags?.vaarn?.attackNotes ?? []).map(n => n.text);
  }

  /**
   * TOO HOT TO HOLD - the Thermasaur's Heat Aura, RULED 2026-09-24 (Matt):
   * "Melee weapons used against the creature become too hot to hold, and must
   * be dropped for one round to cool off." Any melee attack at it, hit or
   * miss, while its AV state is the Heat Aura's. The weapon is UNEQUIPPED -
   * "just unequip the weapon and post a card so everyone's aware" - which
   * already refuses its next attack; the player re-equips it after the round.
   * A natural weapon (intrinsic) cannot be dropped and is exempt.
   */
  async _checkTooHotToHold(item)
  {
    if(item?.type !== "weaponMelee" || item.system?.intrinsic) return;
    const hot = Array.from(game.user?.targets ?? []).map(t => t.actor).find(a =>
    {
      const d = a?.flags?.vaarn?.dropsMeleeWeapons;
      return d && Number(a.system?.armor?.value) === Number(d.av);
    });
    if(!hot) return;
    const rule = hot.flags.vaarn.dropsMeleeWeapons.rule;
    await item.update({ "system.equipped": false });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="vaarn-chat-card"><h3>Too hot to hold</h3><p><b>${this.actor.name}</b>'s <b>${item.name}</b> was swung at ${hot.name} in its <b>${rule}</b>, hit or miss, `
        + `and is dropped for one round to cool off.</p><p><i>Unequipped - re-equip it next round.</i></p></div>` });
  }

  /**
   * AN AURA'S ABILITY LOSS - the Thermasaur's Cold Aura, RULED 2026-09-24
   * (Matt): "an item with a damage roll button. GM targets appropriate tokens
   * and rolls for damage, deals the dex dmg and informs if frozen." Through
   * _applyAbilityDamage, the path every ability loss takes; `atZero` is the
   * line posted for a target whose score is 0 or below after it.
   */
  async _rollAuraAbilityDamage(item)
  {
    const spec = item.flags?.vaarn?.auraAbilityDamage;
    if(!spec) return;
    const targets = Array.from(game.user?.targets ?? []);
    if(!targets.length) return ui.notifications.warn(`Target the tokens ${item.name} reaches first.`);
    await this._applyAbilityDamage([{ ability: spec.ability, dice: spec.dice, source: item.name }], targets);
    if(spec.atZero)
      for(const t of targets)
        if(Number(t.actor?.system?.abilities?.[spec.ability]?.effective ?? 1) <= 0)
          this._postWoundMsg(t.actor, `${spec.atZero} - ${String(spec.ability).toUpperCase()} is at 0 (<b>${item.name}</b>).`);
  }

  /**
   * AN ENCOUNTER EFFECT - the Doomsinger's Doom Song, RULED 2026-09-24 (Matt):
   * "it should include every other actor in the combat encounter, only the
   * singer itself is excluded", as ONE open-ended row each ("I prefer the
   * single row") that the Referee removes when the song stops. Using it again
   * adds no second row to anyone who already has one. The row carries the
   * declared conditions - Deprived, and DIS on every Save and to-hit roll -
   * so it ends with the song and never touches the separate Deprived toggle.
   */
  async _useEncounterEffect(item)
  {
    const spec = item.flags?.vaarn?.encounterEffect;
    if(!spec) return;
    const combat = game.combat;
    if(!combat) return ui.notifications.warn(`${item.name} reaches everyone in the encounter - start a combat first.`);
    const self = this.actor;
    const reached = [], already = [];
    for(const c of combat.combatants)
    {
      const actor = c.actor;
      if(!actor || actor === self || (self.isToken ? c.tokenId === self.token?.id : (!actor.isToken && actor.id === self.id))) continue;
      if(entriesOf(actor).some(e => e.name === item.name)) { already.push(actor.name); continue; }
      await applyEffectToActor(actor, { name: item.name, text: `${spec.text} From <b>${self.name}</b>. <b>No printed end</b> - removed when the song stops.`,
        rounds: null, applied: { conditions: [...spec.conditions] } });
      reached.push(actor.name);
    }
    this._postWoundMsg(self, `sings the <b>${item.name}</b>! ${spec.text}`
      + (reached.length ? ` <i>Now on: ${reached.join(", ")}.</i>` : "")
      + (already.length ? ` <i>Already under it: ${already.join(", ")}.</i>` : ""));
  }

  _postRollNotes(actor, notes)
  {
    if(!notes.length) return;
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: notes.map(n => `<i>${n}</i>`).join("<br>")
    });
  }

  /** @override */
  async _updateObject(event, formData)
  {
    // A granted creature type never writes itself into storage (2026-09-20).
    // The checkbox renders the PREPARED value, which carries the grant, and
    // the comment below about the whole form being submitted is exactly why
    // this cannot be left to sheet close: editing HP while Lithified baked
    // Mineral just as surely, and nothing took it off when the effect expired.
    //
    // Deleting the key rather than overwriting it with the stored value is
    // deliberate — an absent key leaves actor.update() untouched, so this
    // cannot itself become a writer of the field it exists to protect.
    //
    // The template also renders these disabled, which already keeps them out
    // of FormDataExtended. This is the half that does not depend on the
    // markup: a submit assembled any other way still cannot bake a grant.
    for(const t of grantedCreatureTypes(this.actor))
      delete formData[`system.creatureTypes.${t}`];

    const hpKey = 'system.health.value';
    const maxKey = 'system.health.max';

    // FormDataExtended always submits the whole form, so both keys are present
    // on every field edit, not just when HP itself was touched — that's how
    // this also catches lowering max HP below current HP: _prepareCharacterData
    // silently clamps health.value down to the new max, which used to bypass
    // the Wounds pipeline entirely.
    if(this.actor.type === "character" && hpKey in formData && maxKey in formData)
    {
      const currentHP = this.actor.system.health.value;
      const submittedHP = Number(formData[hpKey]);
      const submittedMax = Number(formData[maxKey]);

      if(!Number.isNaN(submittedHP) && !Number.isNaN(submittedMax))
      {
        const resolvedHP = Math.min(submittedHP, submittedMax);
        if(resolvedHP < currentHP)
        {
          // The field's `change` event only fires once, on blur/Enter, with
          // the fully-typed final value — not per keystroke — so this can't
          // fire on an in-progress "-1" while still typing "-12".
          delete formData[hpKey];
          await super._updateObject(event, formData);
          this._resolveHPChange(this.actor, currentHP, resolvedHP, { manual: true });
          return;
        }
      }
    }

    return super._updateObject(event, formData);
  }

  /**
   * `isMelee` (item 10.8, 2026-08-27) — whether the incoming hit was from a
   * melee source, so Berserker StimRig/Brew's "take double melee damage"
   * can be checked against the TARGET's own flag, independent of whatever
   * the attacker's own berserker state was (that's _onItemRoll's damage
   * branch's concern, on the dealing end).
   *
   * `components` (2026-09-10) — the damage figure split into the parts that can
   * interact with the target DIFFERENTLY, as [{ amount, name, types }].
   *
   * Optional, and defaulting to today's behaviour exactly: with none supplied
   * the whole figure is one component carrying the parent Item's own attack
   * properties, which is what every caller but the folded damage roll wants.
   *
   * It exists because folding Bioelectricity's +d6 ELECTRICAL into a kinetic
   * weapon's roll makes a single number wrong in both directions — an
   * electrical-immune target would still take that d6, and an
   * electrical-vulnerable one would not have it doubled. `types: null` on a
   * component means "resolve as the parent Item", so the five add-ons that carry
   * no type of their own cost nothing here.
   */
  _doDamage(token, dmg, isMelee, item, rollMultiplier = 1, components = null, { graftSplit = true, skipProtect = false, rebounded = false } = {})
  {
    const actor = token.actor;
    // The attack as it arrived, before this target's own rules - what a held
    // blow (Look Out Sire, below) re-runs when the Referee lets it land.
    const arrived = { dmg, components };

    // INCORPOREAL, DEALING SIDE (2026-09-11). RULED (Matt): a character phased
    // out of reality "can neither take (invincible) nor deal (incorporeal)
    // damage". The taking half is a target property and lives in the damage
    // table; this is the other half, and it is here because this is the first
    // point at which both attacker and target are known.
    //
    // BEFORE EVERYTHING, deliberately. Mauling still rolls its extra die and
    // Vampiric still reads the figure if this sits lower down, and a phased
    // character would heal from damage they did not deal.
    //
    // A HYPERGEOMETRIC WEAPON DOES NOT HELP, and that was asked rather than
    // assumed. Matt agreed 2026-09-11: the exception on the taking side exists
    // because such weapons reach into where the phased character is, not
    // because the phased character can reach out. They are the one out of
    // reality and the weapon is out there with them.
    if(this._isIncorporeal(this.actor))
    {
      this._postWoundMsg(actor, `is untouched — <b>${this.actor.name}</b> is <b>Incorporeal</b> and can deal no damage while phased out of reality.`);
      return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
    }

    // One component unless told otherwise, so every existing caller keeps its
    // exact behaviour: the whole figure, resolved against the parent Item.
    // `min` defaults to the amount itself for a caller that supplied no
    // components: without the Roll there is no way to know what the dice could
    // have rolled, and a floor equal to the amount is a floor that does
    // nothing. Wrong in the safe direction — it under-applies Glassflesh
    // rather than inventing a reduction.
    const parts = (components?.length ? components : [{ amount: dmg, min: dmg, name: item?.name ?? "damage", types: null }])
      .map(c => ({ min: c.amount, ...c }));

    // A TARGET THAT THROWS THE BLOW BACK - the Extradimensional Mystic Hunter's
    // Psychic Mirror, against any part of a hit carrying a property it
    // `rebounds` (gift, hypergeometry). Built 2026-09-26 for Hypergeometric
    // weapons ("weapon tag counts"); that was REVERSED the same day - the tag is
    // anti-hypergeometric and no longer rebounds - and this stays as the general
    // path for whatever does carry one. PER COMPONENT, as immunity is: the parts carrying a
    // rebounded property go to the attacker, and the rest still land here.
    // `rebounded` stops a Hunter hitting a Hunter from bouncing for ever.
    if(!rebounded && item && token.actor)
    {
      const propsOf = c => c.types?.length ? c.types : attackPropertiesOrKinetic(item);
      const back = parts.filter(c => propsOf(c).some(p => reboundsAttack(token.actor, p)));
      if(back.length)
      {
        const mirror = reboundsAttack(token.actor, propsOf(back[0]).find(p => reboundsAttack(token.actor, p)));
        const total = back.reduce((a, c) => a + c.amount, 0);
        this._postWoundMsg(token.actor, `is untouched — <b>${mirror.rule}</b>: <b>${back[0].name ?? item.name}</b> rebounds on <b>${this.actor.name}</b>.`);
        this._doDamage({ actor: this.actor }, total, isMelee, item, rollMultiplier, back, { graftSplit, skipProtect, rebounded: true });
        const kept = parts.filter(c => !back.includes(c));
        if(!kept.length) return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false, dealt: 0 };
        return this._doDamage(token, kept.reduce((a, c) => a + c.amount, 0), isMelee, item, rollMultiplier, kept, { graftSplit, skipProtect, rebounded: true });
      }
    }

    // A GRAFTED LIMB SHARES ITS DAMAGE with its host - the Fleshwarp's Grafted
    // Arm, RULED 2026-09-26 (Matt). The RAW figure is split here, before any
    // of the target's own rules: the limb takes the rounded-up half, the host
    // the rounded-down half, and each half then runs this whole method against
    // its own actor - the host's WITH the attacking weapon, so its own
    // resistances and immunities decide it, as Bound to the Host was tested.
    // Automatic, not a Referee button. The healing each half earns the
    // attacker is summed, so a Vampiric weapon drains from both.
    const graftHost = graftSplit ? graftHostOf(actor) : null;
    if(graftHost)
    {
      const split = splitForHost(parts);
      this._postWoundMsg(actor, `shares the blow with <b>${graftHost.name}</b> — <b>${split.limbTotal}</b> to the limb, <b>${split.hostTotal}</b> to its host.`);
      const hostRes = split.hostTotal > 0
        ? this._doDamage({ actor: graftHost }, split.hostTotal, isMelee, item, rollMultiplier, split.host, { graftSplit: false })
        : { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
      const limbRes = this._doDamage(token, split.limbTotal, isMelee, item, rollMultiplier, split.limb, { graftSplit: false });
      return { ...limbRes,
        vampiricHeal: (limbRes.vampiricHeal ?? 0) + (hostRes.vampiricHeal ?? 0),
        bloodRapturousHeal: (limbRes.bloodRapturousHeal ?? 0) + (hostRes.bloodRapturousHeal ?? 0),
        drainHeal: (limbRes.drainHeal ?? 0) + (hostRes.drainHeal ?? 0) };
    }

    // Mauling and Piercing weapon tags (2026-09-03). The vault states they
    // "are mirror opposites", and they are exactly that — same two AV
    // thresholds, swapped:
    //   Mauling  — extra die at AV <= 13, halved at AV >= 16
    //   Piercing — extra die at AV >= 16, halved at AV <= 13
    // So they share one block with the band lookup inverted, rather than
    // two near-identical copies that could drift apart.
    // AV 14-15 is a deliberate dead band in the book, not a gap.
    //
    // Per target, like everything else in this method, because the damage
    // roll upstream is one number shared by every target the attack hit.
    // The extra die must be ROLLED here for the same reason.
    //
    // Matt's rulings 2026-09-03:
    //  - halved ROUNDS DOWN, so a rolled 1 becomes 0. First halving rule in
    //    the codebase; the Core Rules state no general rounding convention.
    //  - AV is read through _effectiveTargetAV, NOT the raw armor.value. That
    //    means a Vibroactive weapon ("hits as though the target was
    //    unarmoured", AV 10) permanently enables Mauling's bonus die and can
    //    never be halved. Raised as a probable accident; Matt overruled —
    //    Vibroactive enabling Mauling is a fun interaction and this game is
    //    not balanced for.
    //  - the extra die is doubled by a critical hit. Extended here to the
    //    attacker's berserk doubling as well, via rollMultiplier, on the same
    //    reasoning: the extra die is part of the weapon's damage, so it takes
    //    whatever multiplier the base dice already took upstream.
    //
    // Runs BEFORE the two "target takes double" multipliers below so the
    // extra die participates in them exactly as the base dice do.
    const avTags = item ? (item.system.tags || []) : [];
    const mauling = avTags.includes("Mauling");
    const piercing = avTags.includes("Piercing");
    // Heavy and Strong are NOT here, and that is the whole point of this note.
    // They briefly were, on 2026-09-15, and it was wrong: this block runs once
    // per HIT TARGET, so an attack rolled with nothing targeted never reaches
    // it. Mauling and Piercing can live with that because they cannot know
    // their band without a target; an unconditional tag cannot. RULED (Matt)
    // 2026-09-16: "damage rolls on heavy/strong should always get the extra
    // die, even without a target." They are back in applyDamageTagModifiers,
    // which puts their die in the damageDice the roll is built from.
    if(mauling || piercing)
    {
      const av = this._effectiveTargetAV(actor, item);
      const light = av <= 13, heavyBand = av >= 16;
      // A weapon carrying BOTH tags is not reachable from the generators
      // (Mauling and Piercing are both ADVANCED_TAGS and a weapon rolls one),
      // but a hand-edited item can hold both. Left to resolve naturally
      // rather than special-cased: each tag reads the band independently, so
      // in either band one adds a die and the other halves, and they roughly
      // cancel. That is a sane answer to a nonsense weapon.
      const boostBy = (mauling && light) ? "Mauling" : (piercing && heavyBand) ? "Piercing" : null;
      const halveBy = (mauling && heavyBand) ? "Mauling" : (piercing && light) ? "Piercing" : null;
      const size = String(item.system.damageDice || "").match(/^\d+(d\d+)$/)?.[1];

      // The extra die is the PARENT weapon's, sized from its own damageDice, so
      // it joins the parent component rather than standing on its own — it is
      // that weapon's damage and takes that weapon's damage type.
      if(boostBy && size)
      {
        const extra = new Roll(`1${size}`);
        extra.evaluate({async: false});
        const added = extra.total * rollMultiplier;
        parts[0].amount += added;
        // The floor moves with it: one more die is one more guaranteed point.
        parts[0].min += rollMultiplier;
        this._postWoundMsg(actor, `— Effective AV ${av}: <b>${item.name}</b>'s ${boostBy} adds an extra ${size}: <b>+${added}</b>.`);
      }
      // Halving applies to the whole blow, every component included: the tag
      // describes how this weapon fares against that armour, and a folded add-on
      // die is part of the same swing. Identical to the old behaviour whenever
      // there is only one component, which is every caller but the folded roll.
      if(halveBy)
      {
        parts.forEach(c => { c.amount = Math.floor(c.amount / 2); c.min = Math.floor(c.min / 2); });
        const halvedTotal = parts.reduce((a, c) => a + c.amount, 0);
        this._postWoundMsg(actor, `— Effective AV ${av}: <b>${item.name}</b>'s ${halveBy} halves the damage to <b>${halvedTotal}</b>.`);
      }
    }

    // The receiving half of the same frenzy, and it reads the same scope as
    // the dealing half above — a Brew drinker takes double from a bow too.
    if(berserkApplies(actor, isMelee))
      parts.forEach(c => { c.amount *= 2; c.min *= 2; });

    // "Suffer double damage for d6 days" — Vaarnish Poison row 19, wired
    // 2026-09-19. A property of the TARGET's live state, so it sits with the
    // berserker line above rather than in the attack-property table below:
    // that table asks what the weapon is, and this doubles everything alike.
    //
    // `min` moves with `amount`, exactly as the berserker line does, so a
    // Glassflesh floor stays a floor instead of becoming a damage bonus on a
    // low roll — the trap the floor clamp further down exists to catch.
    //
    // ANNOUNCED, unlike the berserker multiplier. The chat card has already
    // posted the undoubled figure, so a silent doubling means the card says 8
    // while the target lost 16. The Psyche-Suppressant note below called the
    // silent one a pre-existing wart rather than the pattern to copy.
    //
    // THE LINE IS POSTED LATER, once the final figure is known — see below.
    // Announcing it here said "deals 16" and was then followed by Incorporeal
    // saying the attack does nothing, which is chat contradicting itself
    // within two lines. Group 226 found that; the multiplication stays here
    // because the floor logic downstream needs `min` already scaled.
    //
    // Multiplicative with everything else, per Matt's standing crit-and-
    // berserk ruling, and harmless against immunity, which short-circuits to
    // zero before any of this is added in.
    const takenMult = incomingDamageMultiplier(actor);
    if(takenMult !== 1)
      parts.forEach(c => { c.amount *= takenMult; c.min *= takenMult; });

    // Psyche-Suppressant weapon tag (2026-09-03): "Double damage to Psychic
    // creatures." Applied HERE, per target, rather than to the damage roll,
    // because the roll is one number shared by every target an attack hit —
    // doubling it would wrongly double against a non-Psychic caught in the
    // same swing. This is the same per-target shape as the berserker check
    // directly above, which is the existing precedent for a multiplier that
    // depends on who is being hit rather than on the roll.
    //
    // Announced, unlike the berserker multiplier, which is silent: the chat
    // card already posted the undoubled number, so a silent doubling means
    // the card says 8 while the target quietly lost 16. Treating the silent
    // one as a pre-existing wart rather than the pattern to copy.
    //
    // Note this stacks MULTIPLICATIVELY with the two doublings above it, per
    // Matt's standing crit-and-berserk ruling: a berserk critical hit on a
    // Psychic target is 8x base damage.
    // ---- attack property x creature type, one table ----------------------
    //
    // Psyche-Suppressant and Electrical were each written here as their own
    // hand-rolled if-block, two days apart. Anti-Paradoxical, Eroding and
    // Hypergeometric are the same shape again, and Bestiary.md states the
    // same matrix a THIRD time as creature-type resistances. Five more
    // near-identical blocks is the duplication-drift failure that has bitten
    // this codebase repeatedly, so all of it now resolves from one table in
    // module/item/attack-properties.js.
    //
    // Matt's rulings 2026-09-05: "attack property" is the attacker-side
    // concept for all these interactions, and immunity "is immunity, like
    // multiplying by zero" — absolute, and it short-circuits, so no other
    // multiplier can bring the damage back above zero.
    //
    // Still per target, and still announced, for the reasons the removed
    // Psyche-Suppressant block gave: the roll is one number shared by every
    // target, and the chat card has already posted the undoubled figure, so a
    // silent multiplier means the card says 8 while the target lost 16.
    if(item)
    {
      // PER COMPONENT, because immunity and vulnerability are properties of a
      // damage TYPE, not of an attack. A component with its own `types` is
      // resolved on those; one with none is resolved as the parent Item, which
      // is the single-component case and therefore every pre-existing caller.
      //
      // The probe is a bare `{ damageTypes }` object rather than the Item:
      // attackPropertiesOf already accepts a system-shaped object, so a typed
      // component reads through the same table as a real weapon and cannot
      // drift from it.
      dmg = 0;
      for(const c of parts)
      {
        const probe = c.types?.length ? { damageTypes: c.types } : item;
        // A component's own name, not the weapon's, or a folded add-on's
        // immunity would be reported against the parent weapon and read as the
        // whole attack doing nothing.
        const label = c.name ?? item.name;

        // A creature rule OR a live condition that overrides the type table
        // entirely — Incorporeal, from the Spectre's own nature or from a
        // Phasing Potion. One call since 2026-09-11; see attack-properties.js
        // for why the drinker gets exactly the creature's rule.
        const override = damageOverride(probe, actor);
        // Incorporeal against a Gift is the Referee's call (RULED 2026-09-26,
        // Matt): nothing is applied, and the line carries the figure.
        if(override?.gmCall)
        {
          this._postWoundMsg(actor, `is <b>${override.rule}</b> — whether <b>${label}</b>'s ${c.amount} damage harms it is the Referee's call. Adjust its HP by hand if it does.`);
          continue;
        }
        if(override?.immune)
        {
          this._postWoundMsg(actor, `is <b>${override.rule}</b> — <b>${label}</b> does nothing. Only ${override.needs.join(" or ")} weapons can harm it.`);
          continue;
        }

        // Hollow Maiden's Unreal Flesh: an even total does nothing. Read on
        // the amount as it stands here, after any critical or berserk
        // doubling upstream.
        const unreal = ignoresEvenDamage(actor);
        if(unreal && c.amount % 2 === 0)
        {
          this._postWoundMsg(actor, `is <b>${unreal.rule}</b> — <b>${label}</b> rolled an even ${c.amount} and does nothing.`);
          continue;
        }

        const { mult, immune, floor, applied } = resolveDamageInteractions(probe, actor);
        // The floor is taken before the multiplier — see the ordering note on
        // resolveDamageInteractions. Clamped against the rolled amount so a
        // floor can only ever reduce: halving rounds down and could otherwise
        // leave `min` above `amount` on a low roll, which would turn Glassflesh
        // Paste into a damage BONUS.
        const base = floor ? Math.min(c.amount, c.min) : c.amount;
        // An immune hit names only the rule that made it immune. Every row
        // checked before it is in `applied` too, and printed as "immune" it read
        // "immune to kinetic damage (Fungal takes half from kinetic)" (Group 419).
        for(const rule of immune ? applied.filter(r => r.mult === 0) : applied)
        {
          // A creature rule may bite on every attack ("*"); it then names no
          // damage kind. A condition key reads badly in chat, so a row may
          // carry a `label` to show instead.
          const kind = rule.attack === "*" ? "" : `${rule.attack} `;
          const who = rule.label ?? rule.target;
          if(immune)
            this._postWoundMsg(actor, `is <b>immune</b> to <b>${kind}</b>damage — <b>${label}</b> does nothing. (${rule.note})`);
          else if(rule.floor)
            this._postWoundMsg(actor, `takes <b>minimum</b> ${kind}damage — <b>${label}</b> deals ${base} instead of ${c.amount}. (${rule.note})`);
          else if(rule.mult > 1)
            this._postWoundMsg(actor, `is <b>${who}</b> — <b>${label}</b>'s ${kind}damage x${rule.mult}. (${rule.note})`);
          else
            this._postWoundMsg(actor, `is <b>${who}</b> — <b>${label}</b>'s ${kind}damage is halved. (${rule.note})`);
        }
        dmg += immune ? 0 : Math.floor(base * mult);

        // Regeneration Serum: taking fire or acid ENDS the effect outright
        // (Matt's reading, 2026-09-11). Asked per COMPONENT and of the
        // component's own types, so a flaming add-on on an otherwise kinetic
        // weapon ends it and a kinetic add-on on a flaming weapon does not.
        //
        // Fired even when the damage came to nothing: an immune target was
        // still "damaged by fire" in the book's sense, and the alternative
        // reads as an effect surviving because it worked.
        this._endEffectsOnDamage(actor, attackPropertiesOrKinetic(probe), label);
      }

      // Electrical's submerged clause has no state to read and stays with the
      // GM, named rather than silently dropped. Asked of the COMPONENTS, so a
      // folded Bioelectricity die raises it on an otherwise kinetic weapon. The
      // metal-armour clause is the interaction table's since 2026-09-27.
      const anyElectrical = parts.some(c => c.types?.length
        ? c.types.includes("electrical")
        : hasAttackProperty(item, "electrical"));
      if(dmg > 0 && anyElectrical)
        this._postWoundMsg(actor, `<i>Electrical also doubles vs a submerged target — resolve by hand.</i>`);
      // Eroding's static-structures clause, the same way (Matt, 2026-09-23):
      // no state for a wall or a door, so it is named for the GM. Its mineral
      // and vehicle clauses are rows of DAMAGE_INTERACTIONS.
      const anyEroding = parts.some(c => c.types?.length
        ? c.types.includes("eroding")
        : hasAttackProperty(item, "eroding"));
      if(dmg > 0 && anyEroding)
        this._postWoundMsg(actor, `<i>Eroding also doubles vs static structures — resolve by hand.</i>`);
    }
    else
      dmg = parts.reduce((a, c) => a + c.amount, 0);

    // Lethal Blow Redirection (2026-09-19) — the Synthhound's Watchdog
    // Protocol: "If a kinetic attack would kill the synthhound's owner, it
    // kills the synthhound instead."
    //
    // HERE, AND NOT LOWER DOWN, because `dmg` is final at this line and
    // nothing below it has spoken yet. Every sentence further down is about a
    // blow that landed on THIS actor — the doubling line, Vampiric's heal,
    // Blood-Rapturous's — and a redirected blow landed on nobody here. The
    // owner would otherwise be told they suffered double damage in the same
    // breath as being told they were untouched.
    //
    // THE OWNER TAKES NO DAMAGE AT ALL (Matt, 2026-09-19). The book says the
    // attack kills the synthhound instead, and the alternative reading —
    // owner takes the damage but not the death — leaves a character sitting
    // at -20 with the Fatality row suppressed, a state the Wounds table has
    // no row for. So `_resolveHPChange` is never called for the owner and the
    // early return below is the protection.
    //
    // VAMPIRIC HEALS NOTHING on a redirect, which follows from that rather
    // than being decided separately: its clause is "regains HP equal to half
    // the damage inflicted", and no damage was inflicted on anyone. The
    // synthhound is killed BY THE RULE, not by the figure.
    //
    // THE KILL IS STILL THE ATTACKER'S (Matt, 2026-09-19), so it goes
    // through `_resolveHPChange` exactly as any other death does and
    // Kill/Death-Detection attributes it with no second copy of that logic.
    // Blood-Rapturous is read against the SUBSTITUTE, since it is the
    // creature that died; the Synthhound being Synthetic, it pays nothing
    // today, and a future biological watchdog would pay correctly.
    // LOOK OUT SIRE (Lethal Blow Redirection, RULED 2026-09-26 by Matt): a
    // lethal blow on a token a living protector guards is HELD, and a GM card
    // offers each protector's death in its place or lets it land. Before the
    // Watchdog, since this is a choice; a blow let through comes back with
    // skipProtect and meets the Watchdog then. See combat/protector.js.
    if(!skipProtect)
    {
      const tokenDoc = token.document ?? (token.documentName === "Token" ? token : null);
      const guards = protectorsOf(tokenDoc, actor, { worldActors: game.actors?.contents ?? [], sceneTokens: canvas?.scene?.tokens?.contents ?? [] });
      if(guards.length && wouldKill(actor, dmg))
      {
        this._holdBlowForProtectors(tokenDoc, actor, guards, dmg, arrived, isMelee, item, rollMultiplier);
        return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
      }
    }

    const watchdog = watchdogRedirect(actor, dmg, item);
    if(watchdog)
    {
      this._postWoundMsg(actor, `is <b>saved by ${watchdog.name}</b> — <b>Watchdog`
        + ` Protocol</b>. The blow would have been lethal, so it takes the hound`
        + ` instead and ${actor.name} suffers no damage.`);

      // GUARDED ON PERMISSION, not on who rolled. The Referee attacking from
      // an NPC sheet is the ordinary case and writes straight through; a
      // player rolling their own attack gets the button.
      if(!watchdog.isOwner)
      {
        this._postWoundMsg(watchdog, `<b>Watchdog Protocol</b> — ${watchdog.name}`
          + ` dies in ${actor.name}'s place. ${watchdogKillButton(watchdog)}`);
        return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
      }

      const dogHP = watchdog.system.health.value;
      const dogOutcome = this._resolveHPChange(watchdog, dogHP, 0, { toZero: true });
      const dogHeal = (dogOutcome === "killed" && item
        && (item.system.tags || []).includes("Blood-Rapturous")
        && watchdog.system.creatureTypes?.biological)
          ? watchdog.system.health.max : 0;
      return { vampiricHeal: 0, bloodRapturousHeal: dogHeal, killed: dogOutcome === "killed" };
    }


    // The doubling's line, posted here because this is the first point at
    // which the figure is true. `dmg > 0` is the guard that matters: an
    // Incorporeal or otherwise immune target now gets only the sentence
    // saying the attack did nothing, instead of that sentence underneath a
    // claim that it dealt 16.
    //
    // IT NAMES THE FACTOR NOW, rather than saying "double" (2026-09-22).
    // Deathblight scales PER SLOT, so two slots quadruple and three are x8,
    // and the old wording would have called every one of those "double" while
    // the figure beside it disagreed. The affliction is named for the same
    // reason the halved-healing line names it: a number that changed without
    // saying who changed it is the fault this line exists to fix.
    if(takenMult !== 1 && dmg > 0)
    {
      const by = woundDamageMultiplier(actor).named;
      const cause = by.length ? ` from ${by.join(" and ")}` : "";
      this._postWoundMsg(actor, `<b>takes x${takenMult} damage</b>${cause} — <b>${item?.name ?? "the attack"}</b> deals <b>${dmg}</b>.`);
    }

    // Vampiric weapon tag (2026-09-03): "When this weapon damages Biological
    // creatures, the wielder regains HP equal to half the damage inflicted."
    //
    // LAST in this method on purpose. "Damage inflicted" is read as the final
    // per-target figure, so everything above — Mauling's extra die, the
    // berserk doubling, Psyche-Suppressant — is already folded in and a
    // Vampiric weapon that also crits heals from the bigger number.
    //
    // Halved ROUNDS DOWN, following the convention Mauling set earlier today.
    // A damage figure of 0 or 1 therefore heals nothing and says nothing.
    //
    // "Damage inflicted" is also read as the damage DEALT, not the HP
    // actually removed: hitting a 3 HP target for 10 heals 5, not 1. The
    // book says inflicted, and overkill is still inflicted.
    //
    // Clamped to the wielder's own max HP explicitly. _resolveHPChange writes
    // any increase straight through without a cap, and actor.js only clamps
    // in prepareData — so an unclamped overheal would sit above max in the
    // database while displaying correctly, which is worth not creating.
    // BUG FOUND IN TESTING 2026-09-03 (item 76.8): this used to write the
    // wielder's HP here, per target. Two Biological targets in one swing then
    // healed 3 total instead of 6 — the second read this.actor's HP before the
    // first update had landed, and both chat lines claimed the same new total.
    // Exactly the race _checkRetaliationMutations already warns about for Body
    // Barbs/Quills ("summed into one HP update ... rather than two sequential
    // updates racing against the same stale currentHP").
    //
    // So this method now only REPORTS what Vampiric would restore, and the
    // caller sums across every target hit and applies it once.
    let vampiricHeal = 0;
    if(item && (item.system.tags || []).includes("Vampiric")
       && actor.system.creatureTypes?.biological)
      vampiricHeal = Math.floor(dmg / 2);

    // A creature's DRAIN - Moonbeast (Nymph)'s Vampiric Tendrils, "heals HP
    // equal to damage". RULED 2026-09-23 (Matt): the attacker heals by what
    // the target lost AFTER immunities, which is `dmg` here, the final
    // per-target figure. The whole of it, and on any creature type: this is
    // the creature's own rule, not the weapon tag above. Reported, not
    // applied, for the tag's reason - the caller sums across targets.
    // A TYPE-LIMITED drain (the Hagfluke's Siphon, RULED 2026-09-27) heals
    // nothing off any other target, and says nothing about it.
    const drain = item?.flags?.vaarn?.drain;
    const drainHeal = drain && (drain === true || !drain.targets?.length || hasAnyCreatureType(actor, drain.targets))
      ? Math.max(0, dmg) : 0;

    const currentHP = actor.system.health.value;
    const outcome = this._resolveHPChange(actor, currentHP, currentHP - dmg);

    // A creature that SPLITS when damaged - the Fractalisk, the Glittersludge
    // (Actor Spawning wiring, RULED 2026-09-25 by Matt: a card, not an
    // automatic split). Only when damage actually landed and it survived.
    if(dmg > 0 && outcome !== "killed")
    {
      const causes = [...new Set(parts.flatMap(c =>
        attackPropertiesOrKinetic(c.types?.length ? { damageTypes: c.types } : (item ?? {}))))];
      offerSplit(actor, causes, Math.max(0, currentHP - dmg));
      // A flammable target set alight (Neobloom, 2026-09-25).
      if(causes.includes("flame") && isFlammable(actor))
        startBurning(actor, FLAMMABLE_BURN).then(() =>
          this._postWoundMsg(actor, `catches fire - <b>${FLAMMABLE_BURN.dice}</b> burning damage each round until extinguished.`));
    }

    // Blood-Rapturous weapon tag (2026-09-10): "When a Biological creature is
    // killed with this weapon, the user heals for the victim's maximum HP."
    //
    // Read as an AMOUNT, not a level to heal up to — the book says "heals FOR
    // the victim's maximum HP". Matt's ruling 2026-09-10 is "like vampiric",
    // so two kills in one swing contribute two amounts and the caller sums
    // them. The atom-index note said "heals TO victim's max HP", which is a
    // different rule; the ruling settles it against that reading.
    //
    // REPORTED, not applied, for exactly the reason Vampiric is (item 76.8):
    // writing the wielder's HP per target races itself across a multi-target
    // swing. A weapon can carry BOTH tags, so the two heals also have to reach
    // the wielder as one update — see _applyAttackHeals.
    //
    // "Biological" is tested on the victim the same way Vampiric tests it, so
    // a Synthetic kill heals nothing and says nothing.
    let bloodRapturousHeal = 0;
    if(outcome === "killed" && item
       && (item.system.tags || []).includes("Blood-Rapturous")
       && actor.system.creatureTypes?.biological)
      bloodRapturousHeal = actor.system.health.max;

    return { vampiricHeal, bloodRapturousHeal, drainHeal, killed: outcome === "killed", dealt: dmg };
  }

  /**
   * Apply one attack's healing to the wielder — every source it triggered,
   * summed across every target it hit, in a SINGLE update.
   *
   * `sources` is [{ verb, label, amount, victims }], one entry per tag that
   * restored anything. Sources with nothing to give are dropped, so an attack
   * that triggered none of them writes nothing and says nothing.
   *
   * ONE UPDATE, for the reason item 76.8 found for Vampiric on its own: every
   * source reads wielder.system.health.value, so two sequential updates in the
   * same attack race against the same stale figure and the second silently
   * discards the first. That was originally a per-TARGET race; a weapon
   * carrying both Vampiric and Blood-Rapturous makes it a per-SOURCE race as
   * well, with the same cause and the same fix.
   *
   * Each source reports what IT actually restored, apportioned in order against
   * a running total rather than from its raw amount — otherwise a wielder 2 HP
   * below max who triggers both would be told twice that it healed in full.
   * With one live source this reproduces the pre-2026-09-10 figures exactly.
   *
   * Clamped to the wielder's own max HP explicitly: _resolveHPChange writes an
   * increase straight through with no cap, and actor.js only clamps inside
   * prepareData, so an unclamped overheal would sit above max in the database
   * while still displaying correctly.
   */
  /**
   * The Protect control (Look Out Sire). GM-only. One protectee per protector:
   * a new target replaces the old, and nothing targeted stops the guard.
   */
  async _setProtectee(item)
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee sets who a protector guards.");
    const targets = Array.from(game.user?.targets ?? []);
    if(targets.length > 1)
      return ui.notifications.warn(`${this.actor.name} can guard one token at a time - target just one.`);
    if(!targets.length)
    {
      const was = this.actor.getFlag("vaarn", PROTECTING_FLAG);
      await this.actor.unsetFlag("vaarn", PROTECTING_FLAG);
      return this._postWoundMsg(this.actor, was ? `stops guarding <b>${was.name}</b> (<b>${item.name}</b>).` : `is guarding no one (<b>${item.name}</b>).`);
    }
    const tokenDoc = targets[0].document;
    if(tokenDoc.actor?.uuid === this.actor.uuid)
      return ui.notifications.warn(`${this.actor.name} cannot guard itself.`);
    const record = protecteeRecord(tokenDoc);
    // Cleared first: setFlag MERGES an object, so a token-held record would
    // keep the old actorId beside its new tokenUuid.
    await this.actor.unsetFlag("vaarn", PROTECTING_FLAG);
    await this.actor.setFlag("vaarn", PROTECTING_FLAG, record);
    this._postWoundMsg(this.actor, `now guards <b>${record.name}</b> — <b>${item.name}</b>: a blow that would kill them can be taken instead.`);
  }

  /**
   * Post the Look Out Sire card and hold the blow (see combat/protector.js).
   * Whispered to the Referee, whose choice it is. The card carries the attack
   * as it arrived, so letting it land re-runs this target's own rules.
   */
  _holdBlowForProtectors(tokenDoc, actor, guards, dmg, arrived, isMelee, item, rollMultiplier)
  {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      whisper: game.users.filter(u => u.isGM).map(u => u.id),
      content: heldBlowCard({ name: tokenDoc?.name ?? actor.name }, guards, dmg, this.actor.name, item?.name ?? "attack"),
      flags: { vaarn: { [HELD_BLOW_FLAG]: {
        tokenUuid: tokenDoc?.uuid ?? null, actorUuid: actor.uuid, attackerUuid: this.actor.uuid,
        itemId: item?.id ?? null, dmg: arrived.dmg, components: arrived.components ?? null,
        isMelee: !!isMelee, rollMultiplier, resolved: false } } }
    });
  }

  /**
   * The attacker's Level gain from a hit - the Hagfluke's Siphon, RULED
   * 2026-09-27 (Matt): the Kronophage's applyDrainerGain (+1 Level, +4 max and
   * current HP, abilities follow), stopping at the declared max. At the max it
   * gains nothing and says nothing; the heal still runs.
   */
  async _applyLevelGain(item, gain)
  {
    const level = Number(this.actor.system.level?.value ?? 0);
    if(level >= gain.max) return null;
    const res = await applyDrainerGain(this.actor, { level: 1, hp: gain.hp });
    if(res) this._postWoundMsg(this.actor, `gains a Level from <b>${item.name}</b>: Level ${res.to}${res.to >= gain.max ? " (its maximum)" : ""}, `
      + `max HP ${this.actor.system.health.max} (+${res.hpUp}), abilities +${res.abilityValue}.`);
    return res;
  }

  _applyAttackHeals(sources, itemName)
  {
    const live = sources.filter(s => s.amount > 0);
    if(!live.length) return;

    const wielder = this.actor;
    // Deprived State. GATED AFTER the empty check so a Deprived wielder whose
    // Vampiric weapon killed nothing is not told its healing was refused —
    // nothing was healing. The amounts have already been rolled by the attack
    // itself, so unlike Photosynthesis there is no roll to suppress; naming the
    // weapon is what tells the player which of their tags did not fire.
    if(blocksHealing(wielder, itemName ? `<b>${itemName}</b>` : "that attack")) return;

    const max = wielder.system.health.max;
    const before = wielder.system.health.value;

    // "As though starting from 0" — Healing.md's floor clause, missing here
    // until 2026-09-11. A wielder at -5 HP draining 6 was landing on 1 rather
    // than 6, the debt eating the drain. `hp` accrues from the floor; `from`
    // stays at the real HP so the FIRST source reports the jump the player
    // actually got, and later ones still report only their own share.
    const apportion = cap =>
    {
      let hp = healFloor(before);
      let from = before;
      for(const s of live)
      {
        const next = Math.min(cap, hp + s.amount);
        s.gained = next - from;
        from = next;
        hp = next;
      }
      return hp;
    };
    let hp = apportion(max);

    // Healing Received Multiplier — Deathblight halves the TOTAL gain, per
    // slot, and the sources are then re-apportioned under that lower ceiling,
    // so each line still reports only what its own source restored.
    const { gained: allowed, note } = scaleHealing(wielder, hp - before);
    if(note) hp = apportion(before + allowed);

    if(hp > before) wielder.update({ "system.health.value": hp });

    live.forEach((s, i) =>
    {
      const who = s.victims === 1 ? "its victim" : `${s.victims} victims`;
      // The note rides on the last line only: it describes the total.
      const tail = i === live.length - 1 ? note : "";
      this._postWoundMsg(wielder, s.gained > 0
        ? `${s.verb} ${who} with the <b>${itemName}</b> — ${s.label} restores <b>${s.gained}</b> HP${gmHP(wielder, ` (now ${hp}/${max})`)}.${tail}`
        : note
          ? `${s.verb} ${who} with the <b>${itemName}</b> — ${s.label} restores no HP.${tail}`
          : `${s.verb} ${who} with the <b>${itemName}</b>, but is already at full HP.`);
    });
  }

  /**
   * Cacklemaw Exile's "More!" — post a reminder when the wielder's melee attack
   * killed something. Kill/Death-Detection Hook's second consumer.
   *
   * A REMINDER AND NOTHING ELSE (Matt's ruling 2026-09-10). The book says "you
   * MAY immediately make another melee attack", so it is the player's choice
   * and nothing here rolls it, spends it or tracks whether it was taken. And
   * deliberately no range check on "a nearby target": the card names the
   * condition and the GM reads it, which is the same call the Electrical note
   * in _doDamage makes for clauses this system cannot resolve. There is no
   * reach convention anywhere else in the codebase to check against.
   *
   * Says how many were killed rather than posting once per kill, because one
   * swing that kills three still grants the rule once — the book's trigger is
   * "when you kill a foe", and a stack of three identical cards would read as
   * three extra attacks.
   */
  _postKillReactionReminder(meleeKills)
  {
    if(meleeKills <= 0) return;
    const reaction = ANCESTRY_KILL_REACTIONS[this.actor.system?.ancestry];
    if(!reaction || !reaction.melee) return;

    const what = meleeKills === 1 ? "a foe" : `${meleeKills} foes`;
    this._postWoundMsg(this.actor,
      `killed ${what} in melee — <b>${reaction.rule}</b>: ${reaction.text}`);
  }

  /**
   * Name a kill-reactive rule that could not resolve, rather than letting it
   * silently do nothing.
   *
   * Everything downstream of a damage roll reaches its target through
   * #_hitTargets, which _checkToHitTargets fills from game.user.targets. So an
   * attack rolled with no target never enters _doDamage, no kill is ever
   * detected, and Blood-Rapturous and More! are simply skipped — with no error
   * and nothing on the card to say why. Matt's point 2026-09-10: the workflow
   * genuinely requires targeting before rolling, so the fix is to make the
   * requirement visible at the moment it is missed.
   *
   * TWO REASONS #_hitTargets can be empty, and they need different sentences.
   * Found in testing 2026-09-10 (item 113.13's edge): the first version told a
   * player who HAD targeted and merely missed to "target a token", which is
   * both wrong and the most annoying kind of wrong — it accuses them of
   * skipping a step they did not skip. game.user.targets is what separates the
   * two, since _checkToHitTargets clears #_hitTargets on every attack roll but
   * never touches the user's own targeting.
   *
   * Worth knowing: game.user.targets is client-side, per-session state and a
   * page reload clears it silently while the token still LOOKS targeted, so
   * the untargeted sentence can appear for a target the player believes is
   * still selected.
   *
   * Same convention as the Electrical note in _doDamage — name the clause that
   * could not be resolved instead of dropping it.
   */
  _noteUnresolvedKillReactions(item)
  {
    if(this.#_hitTargets.size) return;

    const why = game.user.targets.size
      ? "nothing was hit by that attack."
      : "target a token before rolling damage.";

    const notes = [];
    if(item && (item.system.tags || []).includes("Blood-Rapturous"))
      notes.push(`<b>Blood-Rapturous</b> cannot tell whether anything died — ${why}`);

    const reaction = ANCESTRY_KILL_REACTIONS[this.actor.system?.ancestry];
    if(reaction && (!reaction.melee || item?.type === "weaponMelee"))
      notes.push(`<b>${reaction.rule}</b> cannot tell whether anything died — ${why}`);

    this._postRollNotes(this.actor, notes);
  }

  /**
   * Shared entry point for any HP decrease, whether from a weapon-roll or a
   * manual edit to the HP field on the sheet.
   *
   * RETURNS the outcome as a string — "killed" or null — which
   * is the Kill/Death-Detection Hook (foundry-system-index.csv). Matt's ruling
   * 2026-09-10: fold the detection in here rather than build a subsystem.
   *
   * It is a RETURN VALUE and not an event on purpose. This method knows that a
   * creature died; it does not know who killed it, with what, or whether the
   * blow was melee, and it has ~10 callers that have no attacker to offer — a
   * manual HP edit on the sheet, a gift's HP cost, a usage-die explosion.
   * Threading attacker context through all of them to reach the two callers
   * that have it is the cost that made this row look expensive. So the
   * ATTRIBUTION lives one level out in _doDamage, which already holds the
   * attacker, the weapon and isMelee, and the only thing that has to cross the
   * boundary is what happened.
   *
   * SCOPED TO THE NPC BRANCH (Matt's ruling 2026-09-10). Both consumers fire on
   * killing a FOE, and a character's death is resolved by the Wounds table
   * inside _applyWound, which is async and called without await — so the
   * character branches below cannot report an outcome synchronously and
   * deliberately return nothing rather than half-answer.
   */
  _resolveHPChange(actor, currentHP, newHP, { manual = false, toZero = false } = {})
  {
    // Vehicle Stat Block Import (2026-09-18). A vehicle's HP field IS its Hull
    // (Matt: "Hull is to vehicles as HP is to other actors"), and the one
    // difference is the ratio: "Hull points are reduced by damage at a ratio
    // of 1 to 10. Damage incurred in amounts less than 10 does not reduce a
    // Vehicle's hull points."
    //
    // CONVERTED HERE rather than in _doDamage because this is the funnel every
    // damage path passes through, the chat-card buttons included. Each call is
    // one attack, which is what makes "multiple sources of damage do not
    // stack" hold: 6 and 8 from separate attacks are two calls, each under 10.
    //
    // Nothing happens at 0 Hull beyond reaching it. The book gives a vehicle
    // no unconscious, killed or wrecked state, so none is invented; the kill
    // hooks below never see a vehicle.
    if(actor.type === "vehicle")
    {
      if(newHP < currentHP)
      {
        const dmg  = currentHP - newHP;
        const loss = Math.floor(dmg / 10);
        newHP = Math.max(0, currentHP - loss);
        this._postWoundMsg(actor, loss
          ? `takes ${dmg} damage and loses <b>${loss}</b> Hull (1 per 10) — Hull ${newHP}.`
          : `takes ${dmg} damage — under 10, so no Hull is lost.`);
      }
      actor.update({'system.health.value': newHP});
      return null;
    }

    // TEMPORARY HP (2026-09-26, RULED by Matt) - see combat/temp-hp.js. Damage
    // spends the pool before HP; `manual` (an HP value the GM typed) spends
    // nothing; `toZero` (a death that SETS HP to 0) clears the pool with it.
    if(toZero)
    {
      if(tempHpOf(actor) > 0) actor.update({ [TEMP_HP_FIELD]: 0 });
    }
    else if(!manual && newHP < currentHP && tempHpOf(actor) > 0)
    {
      const soak = soakDamage(tempHpOf(actor), currentHP - newHP);
      actor.update({ [TEMP_HP_FIELD]: soak.tempLeft });
      this._postWoundMsg(actor, soakLine(soak, t => gmHP(actor, t)));
      if(!soak.dmgLeft) return null;
      newHP = currentHP - soak.dmgLeft;
    }

    // Monsters/NPCs die at 0 HP. JADE IBIS p.30: "NPCs and monsters do not
    // suffer Wounds, instead dying at 0 HP." This replaced the Knave fork's
    // unconscious-at-0/dead-on-next-hit model (row Second-Hit Creature Death,
    // REMOVED 2026-09-18), so the kill hooks now fire on the killing blow.
    if(actor.type !== "character")
    {
      let outcome = null;

      // Only a hit that actually took HP resolves anything. An immune hit
      // (0 damage) on an injected creature sitting at 0 once posted a death
      // message for a blow that did nothing — found in Group 196.
      if(newHP < currentHP && newHP <= 0)
      {
        newHP = 0;

        // Fatality Suppression surface 1. The book says "a CREATURE injected
        // ... cannot die", so an injected monster is alive at 0 HP, and each
        // further damaging hit is another death it survives.
        //
        // OUTCOME STAYS NULL, and that is a ruling rather than a side effect
        // (Matt 2026-09-11): Blood-Rapturous and the Cacklemaw Exile's More!
        // both read "when you kill", and nothing died. Kill/Death-Detection
        // Hook is the row that consumes this return value.
        if(suppressesDeath(actor))
          this._postWoundMsg(actor, suppressionMsg(currentHP > 0
            ? "reduced to 0 HP"
            : "hit again at 0 HP"));

        // Spirit Form (2026-09-27): a PC's spirit at 0 HP fades into the
        // aether until sunrise. Nothing died, so the outcome stays null and
        // no kill reaction fires.
        else if(currentHP > 0 && isSpirit(actor))
          this._postWoundMsg(actor, fadeMessage());

        // Already dead at 0: nothing is posted and nothing counts as a kill
        // (Matt 2026-09-18), so a corpse cannot feed Blood-Rapturous.
        else if(currentHP > 0)
        {
          this._postWoundMsg(actor, "is killed");
          outcome = "killed";
        }
      }

      actor.update({'system.health.value': newHP});

      // Creature-Driven Level Drain — "Slaying the monster restores all lost
      // time to those it fed upon."
      //
      // HUNG OFF THE SAME "killed" OUTCOME the two kill-triggered mutations
      // use, rather than a second death detector. Note it fires for a drainer
      // killed ANY way, not only by an attack, because this is the one place
      // every HP decrease passes through.
      //
      // POSTS A CARD; IT DOES NOT RESTORE. This method runs on the client of
      // whoever dealt the damage, and that client is usually not allowed to
      // write to the victims — restoring hands Levels back to other people's
      // characters. So it follows the shipped `.vaarn-recur-apply` route that
      // apply-to-target.js documents: the card posts from here and the
      // Referee's CLICK carries the permission.
      //
      // IT WAS AN `activeGM` GUARD FOR ONE DAY (2026-09-14) and that was
      // wrong in the direction that fails silently. activeGM resolves to ONE
      // user, and this call site already runs on one client, so the guard
      // subtracted instead of selecting: every kill by anyone other than that
      // single user restored nothing at all, with a dead monster and no
      // message to say why. The `activeGM` guards elsewhere in this system sit
      // on Hooks that fire on EVERY client, which is what makes them correct
      // there. Found in Group 158.
      if(outcome === "killed") this._postDrainRestoreCard(actor);

      return outcome;
    }

    // Characters use the Vaarn Wounds table once HP drops to/below 0.
    if(newHP > 0)
    {
      actor.update({'system.health.value': newHP});
      return;
    }

    // INEVITABLE (Lithling): "When your HP reaches zero, you crumble into
    // iridescent dust, leaving behind a pebble-sized lithling seed." No wound
    // is rolled. RULED 2026-09-25 (Matt): the seed is an Item named after the
    // character, left in their inventory. Keyed on the rule the character
    // carries, as the healing gate is. Fatality Suppression holds here too:
    // the character stays at 0 and nothing crumbles.
    // A CRUMBLE IS A KILL (Matt, 2026-09-26): it returns "killed" like a
    // creature's death, so kill reactions and kill-triggered tags see it.
    // Decided here, before the async crumble, because this method returns
    // synchronously; a suppressed death is not a kill.
    if(noHealRule(actor) === "Inevitable")
    {
      if(currentHP <= 0) return;
      const killed = !suppressesDeath(actor);
      this._crumbleInevitable(actor);
      return killed ? "killed" : undefined;
    }

    if(newHP === 0 && currentHP > 0)
    {
      const row = getWound(this._woundsTableFor(actor), 0);
      this._postWoundMsg(actor, `is <b>${row.name}</b> — ${row.effect}`);
      actor.update({'system.health.value': 0});
      // THE hp-0 ROW'S OWN SAVE (Matt, 2026-09-22). "CON Save vs unconscious
      // for d6 rounds" was chat text and nothing else: the row is slots: 0, so
      // it reaches no Item, and the declared d6 rounds reached nothing that
      // could count them. The card asks the character - not a target, which is
      // why postSaveCard takes an explicit saver - and a failure puts the
      // rolled span on their board. The auto-hit half of the rule stays the
      // Referee's, named in the entry's text.
      if(row.save)
        postSaveCard(actor, row.name, [{ ...row.save, span: row.declaredSpan }], [], { saver: actor });
      return;
    }

    if(this._hasActiveDeathsDoor(actor))
    {
      // Fatality Suppression surface 2. THE WOUND STAYS SKIPPED (Matt
      // 2026-09-11): this branch never applied one, and suppression changes
      // only the message. Falling through to _applyWound here would roll the
      // row for the new HP, which at -20 is Fatality — the death this just
      // suppressed, arriving by another door.
      //
      // HP is still written either way, which is "all other effects (hp loss,
      // wounds etc) happen" doing its work.
      this._postWoundMsg(actor, suppressesDeath(actor)
        ? suppressionMsg("further damage while on Death's Door")
        : "is <b>dead</b> — further damage is lethal while on Death's Door.");
      actor.update({'system.health.value': Math.max(newHP, -20)});
      return;
    }

    this._applyWound(actor, newHP);
  }

  /**
   * Inflict a wound the Referee chooses, rather than one the HP drop picks.
   *
   * RULED 2026-09-17 (Matt), raised by the Quantum Daemon's Possessed curse
   * ("a new Wound", with no word on how it is chosen): a GM-only picker over
   * the character's own table, and EVERY row on it, death rows included —
   * "having the ability to apply any wound makes it a flexible tool for a
   * variety of scenarios where a GM might appreciate the ability to do this."
   * The list is the character's table because a Synth takes Synthetic wounds
   * however it came by them.
   *
   * Goes through _applyWound so a chosen wound behaves exactly as a rolled
   * one: the numeric effects roll, the slots land as an Item, a declared
   * condition reaches the board, and the chat line is the same. The one
   * difference is setHP=false: the character did not fall to the row's HP.
   */
  async _promptInflictWound()
  {
    const actor = this.actor;
    const table = this._woundsTableFor(actor);
    const opts = table.map((w, i) =>
      `<option value="${i}">HP ${w.hp} — ${w.name}${w.slots ? ` (${w.slots} slot${w.slots === 1 ? "" : "s"})` : ""}</option>`
    ).join("");
    const content = `
      <form>
        <div class="form-group">
          <label>Wound</label>
          <select name="row">${opts}</select>
        </div>
        <p class="notes">The ${actor.system.creatureTypes?.synthetic ? "Synthetic" : "Biological"} Wounds table,
        every row. It applies exactly as a rolled wound would — dice, slots, conditions — but
        ${actor.name}'s HP is left where it is.</p>
      </form>`;

    return Dialog.prompt({
      title: `Inflict a wound on ${actor.name}`,
      content,
      label: "Inflict",
      callback: async html =>
      {
        const row = table[Number(html.find('[name="row"]').val())];
        if(!row) return ui.notifications.warn("No wound was chosen, so nothing was inflicted.");
        await this._applyWound(actor, row.hp, 0, { setHP: false });
      },
      rejectClose: false
    });
  }

  _woundsTableFor(actor)
  {
    return actor.system.creatureTypes?.synthetic ? SYNTHETIC_WOUNDS : BIOLOGICAL_WOUNDS;
  }

  _hasActiveDeathsDoor(actor)
  {
    return actor.system.wounds.some(w => w.deathsDoor);
  }

  /**
   * Returns the create promise so a caller that needs ORDER can await it.
   * Every existing call site ignores it and is unchanged; the Annihilating
   * draw is the first that has to land before the write that follows it.
   */
  _postWoundMsg(actor, content)
  {
    return ChatMessage.create(
    {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: content,
    });
  }

  /**
   * Apply the Wounds-table row matching newHP to actor: rolls and applies any
   * numeric effects, records the wound (for item-slot tracking), posts a chat
   * message, and recurses for Bloody Mess's 3 sub-wound rolls.
   */
  async _applyWound(actor, newHP, depth = 0, { setHP = true } = {})
  {
    // `setHP` is false only for a Referee-chosen wound (the Wounds tab picker,
    // 2026-09-17): the row is looked up by its HP value as always, but the
    // character did not fall to that HP and must not be written there.
    const table = this._woundsTableFor(actor);
    const clampedHP = Math.max(newHP, -20);
    const row = getWound(table, clampedHP);

    if(row.instantDeath)
    {
      // Fatality Suppression surface 3 — Fatality, General Systems Failure,
      // Ego-Engine Destroyed. THE WOUND STAYS SKIPPED (Matt 2026-09-11), and
      // here the reason is sharpest: Fatality is slots: 0 with no numeric
      // fields, so death IS its entire content. Suppress it and there is
      // nothing left to apply — recording a 0-slot wound named "Fatality"
      // whose text reads "You are dead." on a living character would be worse
      // than recording nothing. NARROWED 2026-09-27 (Matt): that reason holds
      // only for a SUPPRESSED death, so the skip now applies only there - see
      // below.
      const suppressed = suppressesDeath(actor);
      this._postWoundMsg(actor, suppressed
        ? suppressionMsg(`<b>${row.name}</b> on the Wounds table`)
        : `is <b>dead</b> — <b>${row.name}</b>. ${row.effect}`);
      // A DEATH THAT HAPPENS IS RECORDED (RULED 2026-09-27, Matt, narrowing
      // the skip above to the suppressed case): the row goes on the Wounds
      // list like any 0-slot wound, so the sheet shows how the character died
      // and the Ego-Engine Transplant's refusal (resurrection.js) can read an
      // Ego-Engine Destroyed death. A suppressed death still records nothing.
      const update = setHP ? {'system.health.value': clampedHP} : {};
      if(!suppressed)
        update['system.wounds'] = [...duplicate(actor.system.wounds ?? []),
          { hp: row.hp, name: row.name, slots: 0, effect: row.effect, deathsDoor: false, itemId: null }];
      if(Object.keys(update).length) await actor.update(update);
      return;
    }

    const abilities = duplicate(actor.system.abilities);
    const wounds = duplicate(actor.system.wounds);
    let maxHp = actor.system.health.max;
    // Armour DAMAGE, not the armour itself (2026-09-22). This used to
    // decrement system.armor.value, which for a character is rebuilt from
    // equipped items on every prepare - so "Synthskin Damaged" has been
    // writing a figure nothing ever read. The loss now accumulates in the
    // stored damage field the sheet shows beside DEFENSE.
    let armorDamage = Number(actor.system.armor.damage) || 0;
    let msgLines =[`<b>${row.name}</b>${gmHP(actor, ` (HP ${row.hp})`)} — ${row.effect}`];

    if(row.maxHpDie)
    {
      let r = new Roll(row.maxHpDie);
      r.evaluate({async: false});
      maxHp -= r.total;
      msgLines.push(`Max HP -${r.total}${gmHP(actor, ` (now ${maxHp})`)}`);
    }

    if(row.abilityDice)
    {
      for(let [key, formula] of Object.entries(row.abilityDice))
      {
        let r = new Roll(formula);
        r.evaluate({async: false});
        abilities[key].woundDamage += r.total;
        msgLines.push(`${key.toUpperCase()} wound damage +${r.total} (total ${abilities[key].woundDamage}, effective bonus now ${abilities[key].value - abilities[key].woundDamage})`);
      }
    }

    if(row.abilityFlat)
    {
      for(let [key, amount] of Object.entries(row.abilityFlat))
      {
        abilities[key].woundDamage += amount;
        msgLines.push(`${key.toUpperCase()} wound damage +${amount} (total ${abilities[key].woundDamage}, effective bonus now ${abilities[key].value - abilities[key].woundDamage})`);
      }
    }

    if(row.armorDie)
    {
      let r = new Roll(row.armorDie);
      r.evaluate({async: false});
      armorDamage += r.total;
      msgLines.push(`Armour damage +${r.total} (total ${armorDamage}, AV now ${Math.max(10, Number(actor.system.armor.value) - armorDamage)})`);
    }

    // Advancement Automation owns level loss now (2026-09-13). The flat
    // decrement this used to do is exactly the approximation Matt ruled
    // against: it took the level away and left behind the HP and Abilities
    // that level had granted. loseLevels replays the ledger instead, and it
    // runs AFTER the wound's own update below so the two do not race on
    // health.max. Terminal Memory Crystal Corruption is the only row carrying
    // either flag, and it has no maxHpDie of its own, so nothing here
    // double-counts.
    if(row.levelLoss || row.xpReset)
      msgLines.push(`Lost ${row.levelLoss ?? 0} level(s)${row.xpReset ? ", XP reset to 0" : ""} — see the level card.`);

    // Wounds that occupy slots also get a paired Item so they show up in the
    // actor's Items list and count toward the same slot total real gear uses.
    let itemId = null;
    if(row.slots > 0)
    {
      const cls = getDocumentClass("Item");
      const created = await cls.create(
      {
        name: `${row.name} (Wound x${row.slots})`,
        type: "wound",
        system: { slots: row.slots, description: row.effect, hp: row.hp, deathsDoor: !!row.deathsDoor, ...spanFieldFrom(row) },
        // A wound that IS a Combat Condition - Vischip Disabled is Blind -
        // carries it as a flag that stateful-effect.js's activeDeltas reads
        // (RULED 2026-09-16, Matt: "let the wound declare the condition").
        ...(row.conditions?.length ? { flags: { vaarn: { conditions: [...row.conditions] } } } : {})
      }, { parent: actor });
      itemId = created.id;
    }

    wounds.push({ hp: row.hp, name: row.name, slots: row.slots, effect: row.effect, deathsDoor: !!row.deathsDoor, itemId });

    this._postWoundMsg(actor, msgLines.join("<br>"));

    // Sub-wound rolls (Bloody Mess) reuse the HP lookup purely to pick a table
    // row — they must not overwrite the actor's real HP, which was already
    // set by the top-level wound that triggered them.
    const update =
    {
      'system.health.max': maxHp,
      'system.abilities': abilities,
      'system.wounds': wounds,
      'system.armor.damage': armorDamage,
    };
    if(depth === 0 && setHP)
      update['system.health.value'] = clampedHP;

    await actor.update(update);

    // After the update, not folded into it: loseLevels does its own reads of
    // health.max and the abilities, and it must see the wound's damage already
    // applied rather than compete with it.
    if(row.levelLoss || row.xpReset)
      await loseLevels(actor, row.levelLoss ?? 0,
        { zeroXp: !!row.xpReset, reason: `<b>${row.name}</b> — ${row.effect}` });

    if(row.rollSubWounds && depth < 3)
    {
      for(let i = 0; i < row.rollSubWounds; i++)
      {
        let r = new Roll("3d6");
        r.evaluate({async: false});
        await this._applyWound(actor, -r.total, depth + 1);
      }
    }

    if(depth === 0)
      this._checkWoundDeath(actor);
  }

  /** A Lithling at 0 HP: dust and a seed named after them (see _resolveHPChange). */
  async _crumbleInevitable(actor)
  {
    await actor.update({'system.health.value': 0});
    if(suppressesDeath(actor))
      return this._postWoundMsg(actor, suppressionMsg("reduced to 0 HP"));
    await getDocumentClass("Item").create({
      name: `${actor.name}'s Lithling Seed`,
      type: "item",
      system: { slots: 0, quantity: 1,
                description: `<p>A pebble-sized lithling seed, all that remains of ${actor.name}.</p>` }
    }, { parent: actor });
    return this._postWoundMsg(actor, `is <b>dead</b> — <b>Inevitable</b>: ${actor.name} crumbles into iridescent dust, leaving behind a pebble-sized lithling seed.`);
  }

  /**
   * Wound-slot and ability-floor death (Fatality Suppression surfaces 4 and
   * 5). The one implementation is named-wound.js's checkWoundDeath since
   * 2026-09-25, so a named wound applied from a save card is checked exactly
   * as a rolled one - and wounds filling every slot with Gitch Crystals among
   * them offers the Gitchghast instead of death.
   */
  _checkWoundDeath(actor)
  {
    return checkWoundDeath(actor);
  }

  /**
   * Heal (remove) the wound at the given index.
   *
   * DELEGATES to rest.js, which owns the only implementation — a Long Rest at
   * full HP heals a Wound by the same operation, and a second copy of "splice
   * the array and delete the paired Item" is the shape of Saving Throw
   * Resolution Duplication. This control stays as the Referee's direct route
   * to the same thing.
   *
   * Restores no ability or max-HP damage the wound applied. That is NOT "one
   * point per Long Rest" as this comment claimed until 2026-09-11 — the book
   * makes restoring ability bonuses the ALTERNATIVE to healing a Wound, taken
   * only when HP is already full, and never both. See rest.js.
   */
  async _healWound(actor, index)
  {
    await healWound(actor, index);
  }

  /* -------------------------------------------- */
  /*  Rest and Recovery                                                     */
  /* -------------------------------------------- */

  /**
   * Short Rest. The dialog exists to make the COST visible before it is paid:
   * the book's "a ration of water or food" is a choice, and water is the
   * scarcer of the two in Vaarn — it is what the deprivation clock runs on —
   * so spending it silently while food sits in the pack would be this sheet
   * making the player's decision for them.
   *
   * It opens even when only one ration type is carried, rather than shortcuts
   * straight to the roll. A rest is a resource transaction and a mis-click
   * that eats the last water with no confirmation is not recoverable.
   */
  /**
   * The XP tally's only editor — Advancement Automation, Matt's 2026-09-13
   * ruling that "XP should have up/down arrows to drive it instead of typing
   * in the field directly".
   *
   * A step of 1 is the whole vocabulary because the book's only XP event is
   * one: "Trading an item of Exotica grants one experience point." Floored at
   * 0, since a negative tally is not a state the rules describe — the down
   * arrow is there to take back a mis-click, not to model a debt.
   */
  async _onXpStep(step)
  {
    // Companion Advancement (2026-09-13): "When a PC would gain XP, they may
    // choose to give the XP to their pet instead." The choice belongs at the
    // moment the PC would gain it, which is this arrow, so a GAIN on a
    // character with companions asks who receives it.
    //
    // ONLY ON A GAIN, and only when there is somebody to give it to. Losing
    // a point is never a trade, and a character with no companions has no
    // question to answer — prompting on either would put a dialog in front
    // of the ordinary case for nothing.
    if(step > 0 && this.actor.type === "character")
    {
      // Pets and Followers (2026-09-19). Both chapters put the XP in the
      // owner's hands — "give the XP to their pet instead" and "Followers may
      // be given XP by the PC who leads them" — and they are exactly the kinds
      // that can spend it. A Mercenary or a Steed offered the point could
      // never level, so listing them would be a trade that does nothing.
      const companions = companionsOf(this.actor).filter(companionCanLevel);
      if(companions.length) return this._askWhoGainsXp(companions);
    }
    return this._awardXp(this.actor, step);
  }

  /** Move a character's or a companion's XP tally, floored at 0. */
  async _awardXp(actor, step)
  {
    const next = Math.max(0, Number(actor.system.xp.value) + step);
    if(next === Number(actor.system.xp.value)) return;
    await actor.update({ "system.xp.value": next });
  }

  /**
   * "To you, or to one of yours?" — the trade the book puts at this moment.
   *
   * The character is listed FIRST and is the default, because giving the XP
   * away is the exception the book describes rather than the normal case. A
   * companion's Level and tally are shown beside its name: the reason to hand
   * a point over is usually that a particular creature is close to levelling,
   * and that is not visible from a name alone.
   */
  async _askWhoGainsXp(companions)
  {
    const actor = this.actor;
    const options = [`<option value="">${actor.name} (Level ${actor.system.level.value})</option>`]
      .concat(companions.map(c =>
        `<option value="${c.id}">${c.name} — Level ${c.system.level.value}, ${c.system.xp?.value ?? 0} XP</option>`))
      .join("");

    return new Promise(resolve =>
    {
      new Dialog(
      {
        title: "Trade an Exotica: +1 XP",
        content: `<form>
            <div class="form-group">
              <label>The experience goes to</label>
              <select name="who">${options}</select>
            </div>
            <p class="notes">A PC may give the XP to a creature they command
            instead of taking it themselves.</p>
          </form>`,
        buttons:
        {
          award:
          {
            label: "Award",
            callback: async html =>
            {
              const id = html.find('select[name="who"]').val();
              await this._awardXp(id ? game.actors.get(id) : actor, 1);
              resolve();
            }
          },
          cancel: { label: "Cancel", callback: () => resolve() }
        },
        default: "award",
        close: () => resolve()
      }).render(true);
    });
  }

  async _onShortRest()
  {
    const actor = this.actor;
    const water = supplyTotal(actor, WATER_RATION);
    const food  = supplyTotal(actor, FOOD_RATION);
    const free  = rationFreeRule(actor);

    // Detritivore is universal to Mycomorphs, so the ancestry is the signal —
    // the same read toxin-die.js makes for the same rule. There is no Item.
    const isMycomorph = actor.system.ancestry === "Mycomorph";

    if(!free && water <= 0 && food <= 0)
    {
      // Refused by rest.js with the book's own wording, rather than by an
      // early return here that would have to restate it.
      await shortRest(actor);
      return;
    }

    // All four, the player's choice (Matt, 2026-09-23): Raw Meat and Fresh
    // Blood are food and water too. The first one carried is preselected, in
    // the plain-ration-first order rest.js spends them in.
    // rationKindsFor, so a character with Omniguts is offered their Stone.
    const kinds = [...rationKindsFor(actor, FOOD_RATION), ...rationKindsFor(actor, WATER_RATION)]
      .map(k => ({ k, n: rationTotal(actor, k) }));
    const first = kinds.find(x => x.n > 0)?.k;
    const rationChoice = free ? "" : `
      <div class="form-group">
        <label>Consume</label>
        <select name="ration">
          ${kinds.map(({ k, n }) => `<option value="${k}"${n > 0 ? "" : " disabled"}${k === first ? " selected" : ""}>${k} (${n} carried)</option>`).join("")}
        </select>
      </div>`;

    const rottingChoice = (isMycomorph && !free) ? `
      <div class="form-group">
        <label title="Detritivore: heals double HP from Short Rests if the meal you eat is rotting.">
          <input type="checkbox" name="rotting"/> The meal is rotting (<b>Detritivore</b> — double HP)
        </label>
      </div>` : "";

    // THE OUTCOME, BEFORE THE CLICK (the pre-rest preview, RULED 2026-09-24):
    // what the picked ration buys, redrawn when the pick changes.
    const content = `<form>
      <p>A quick sit-down. Replenishes <b>d8 + CON bonus</b> HP.</p>
      ${rationChoice}${rottingChoice}
      <p class="vaarn-rest-outcome"></p>
    </form>`;
    const redraw = html =>
    {
      const ration = html.find('[name="ration"]').val() || null;
      // Detritivore's box only means anything for a meal - greyed out on water.
      html.find('[name="rotting"]').prop("disabled", !isMealFor(actor, ration));
      html.find(".vaarn-rest-outcome").html("<b>Outcome:</b> " + shortRestOutcomeText(actor,
        ration, { rotting: html.find('[name="rotting"]').is(":checked") }));
    };

    new Dialog({
      title: `Short Rest — ${actor.name}`,
      content,
      render: html => { redraw(html); html.on("change", "select, input", () => redraw(html)); },
      buttons: {
        rest: {
          label: "Rest",
          callback: html => shortRest(actor, {
            ration:  html.find('[name="ration"]').val() || null,
            rotting: html.find('[name="rotting"]').is(":checked")
          })
        },
        cancel: { label: "Cancel" }
      },
      default: "rest"
    }).render(true);
  }

  /**
   * Long Rest. Two inputs and then, when there was no HP to restore, a second
   * dialog for the book's either/or.
   *
   * The full-HP branch is asked AFTER the rest resolves rather than before,
   * because `atFullHp` is measured inside rest.js before any healing and a
   * refused rest must not prompt for anything at all. A rest that was blocked
   * — Deprived, or no supplies — returns null and this stops.
   *
   * GATED ON `offerRecovery`, NOT ON `atFullHp`, and the two are deliberately
   * different fields. An actor under an intrinsic no-heal rule qualifies at
   * any HP, because the precondition it would otherwise have to meet is one it
   * can never meet again; rest.js owns that decision and hands down the
   * answer rather than the measurement.
   */
  /**
   * The ration a hit takes from each targeted token's pack - Travel and
   * Rations, RULED 2026-09-23 (Matt).
   *
   *   Desiccator (Desiccate): "the Desiccator drinks one ration of water from
   *     target's inventory per hit" - water OR blood (Matt).
   *   Faminebearer (Famishing Claws): the book's "must EGO Save or spend the
   *     next combat round eating a ration" - Matt: consume the ration ON THE
   *     HIT, if there is one. The save card is still offered for the rest.
   *
   * THE PLAIN RATION FIRST, as every spend is (rest.js RATION_GROUPS), and
   * with the TARGET's own kinds, so a target with Omniguts may lose a Stone
   * to the Faminebearer. One card for all targets; a target with none is
   * named, never skipped silently.
   */
  async _takeRationOnHit(item)
  {
    const which = item.flags.vaarn.takesRation === "water" ? WATER_RATION : FOOD_RATION;
    const targets = Array.from(game.user.targets ?? []).map(t => t.actor).filter(Boolean);
    const lines = [];
    if(!targets.length)
      lines.push(`Target the token it hit to take the ration from its pack.`);
    for(const t of targets)
    {
      const spent = await spendSupply(t, which);
      if(!spent)
        lines.push(`<b>${t.name}</b> carries no ${which === WATER_RATION ? "water" : "food"}.`);
      else if(which === WATER_RATION)
        lines.push(`<b>${this.actor.name}</b> drinks one <b>${spent}</b> from <b>${t.name}</b>'s pack.`);
      else
        lines.push(`<b>${t.name}</b> eats one <b>${spent}</b>.`);
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="vaarn-chat-card"><h3>${item.name}</h3><p>${lines.join("<br>")}</p></div>`
    });
  }

  /**
   * Long Rest — the portioning dialog (RULED 2026-09-24, Matt).
   *
   * One row for the character and one per companion that eats. Each row picks
   * that person's share, and the outcome column is rest-plan.js's verdict for
   * those picks, redrawn on every change - the same plan longRest then carries
   * out, so what the dialog says is what the rest does. Rest is always
   * allowed; a pick the pack cannot cover is refused in place and the dialog
   * stays open. It replaces the old fixed text and the separate "Feeding the
   * companions" dialog that opened when the pack ran short.
   */
  async _onLongRest()
  {
    const actor = this.actor;
    const picks0 = defaultPicks(actor);
    const plan0  = planLongRest(actor, picks0);
    const c0 = plan0.character;
    const stock = stockOf(actor);

    const carried = [...stock].filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing to eat or drink";
    const opt = (value, label, sel) => `<option value="${value}"${value === sel ? " selected" : ""}>${label}</option>`;
    const counts = (name, draw, sel) => draw > 1
      ? `<select name="${name}">${Array.from({ length: draw }, (_, i) => opt(String(i + 1), `× ${i + 1}`, String(sel))).join("")}</select>` : "";
    const have = kinds => kinds.reduce((n, k) => n + (stock.get(k) ?? 0), 0);
    const diets = dietRationsFor(actor);

    let mine;
    if(c0.rationFree)
      mine = `<td colspan="2"><i>neither eats nor drinks</i></td>`;
    else
    {
      const foodKinds  = rationKindsFor(actor, FOOD_RATION);
      const waterKinds = rationKindsFor(actor, WATER_RATION);
      const mealOpts = [
        ...diets.filter(d => d.replaces !== "water").map(d => opt(d.item, `${d.item} — ${d.source} (${stock.get(d.item) ?? 0})`, picks0.meal.item)),
        opt(PLAN_GROUP, `any food (${have(foodKinds)})`, picks0.meal.item),
        opt(PLAN_NONE, "nothing", picks0.meal.item)
      ].join("");
      const waterOpts = [
        ...diets.filter(d => d.replaces === "water").map(d => opt(d.item, `${d.item} — ${d.source} (${stock.get(d.item) ?? 0})`, picks0.water.item)),
        opt(PLAN_GROUP, `any water (${have(waterKinds)})`, picks0.water.item),
        opt(PLAN_NONE, "nothing", picks0.water.item)
      ].join("");
      mine = `<td><select name="meal">${mealOpts}</select>${counts("mealCount", c0.foodDraw.count, Math.max(1, picks0.meal.count))}</td>`
           + (c0.needsWater
              ? `<td><select name="water">${waterOpts}</select>${counts("waterCount", c0.waterDraw.count, Math.max(1, picks0.water.count))}</td>`
              : `<td><i>does not drink</i></td>`);
    }

    const needText = e => e.needs.map(n => n === FOOD_RATION ? "food" : n === WATER_RATION ? "water" : n).join(" and ");
    const compRows = plan0.companions.map(e =>
      `<tr><td><b>${e.actor.name}</b> (${e.kind})</td>`
      + `<td colspan="2"><label><input type="checkbox" name="fed" value="${e.actor.id}"${picks0.fed[e.actor.id] ? " checked" : ""}/> gets ${needText(e)}</label></td>`
      + `<td class="vaarn-rest-outcome" data-who="${e.actor.id}"></td></tr>`).join("");
    const outside = [
      ...plan0.exempt.map(x => `<b>${x.actor.name}</b> neither eats nor rests (<b>${x.rule}</b>).`),
      ...plan0.unknown.map(x => `<b>${x.actor.name}</b> is skipped - its kind is not set.`)
    ].map(t => `<p><i>${t}</i></p>`).join("");

    const content = `<form class="vaarn-rest-portion">
      <p>A ration of water and a meal each, then a full night's sleep somewhere safe.
         ${actor.name} carries ${carried}.</p>
      <table>
        <tr><th></th><th>food</th><th>water</th><th>outcome</th></tr>
        <tr><td><b>${actor.name}</b></td>${mine}<td class="vaarn-rest-outcome" data-who="character"></td></tr>
        ${compRows}
      </table>
      ${outside}
      <p class="vaarn-rest-over" style="color:#8c4a4a"></p>
      <div class="form-group">
        <label title="Night Watches: whoever is on watch cannot benefit from a Long Rest, and regains only d8 + CON bonus HP.">
          <input type="checkbox" name="watch"/> Stood watch (d8 + CON instead of a full night)
        </label>
      </div>
    </form>`;

    const read = html =>
    {
      const f = n => html.find(`[name="${n}"]`);
      const count = (n, fallback) => Number(f(n).val()) || fallback;
      const picks = {
        meal:  { item: f("meal").val() ?? PLAN_NONE,  count: count("mealCount", 1) },
        water: { item: f("water").val() ?? PLAN_NONE, count: count("waterCount", 1) },
        fed: {}
      };
      if(picks.meal.item === PLAN_NONE) picks.meal.count = 0;
      if(picks.water.item === PLAN_NONE || !c0.needsWater) picks.water = { item: PLAN_NONE, count: 0 };
      if(c0.rationFree) { picks.meal = { item: PLAN_NONE, count: 0 }; picks.water = { item: PLAN_NONE, count: 0 }; }
      html.find('[name="fed"]').each((_, el) => { picks.fed[el.value] = el.checked; });
      return { picks, onWatch: f("watch").is(":checked") };
    };
    const redraw = html =>
    {
      const { picks, onWatch } = read(html);
      const plan = planLongRest(actor, picks, { onWatch });
      html.find('.vaarn-rest-outcome[data-who="character"]').html(characterOutcomeText(plan.character));
      for(const e of plan.companions)
        html.find(`.vaarn-rest-outcome[data-who="${e.actor.id}"]`).html(companionOutcomeText(e));
      html.find(".vaarn-rest-over").html(plan.over.length
        ? `More than is carried: ${plan.over.map(o => `${o.who}'s ${o.text}`).join("; ")}.` : "");
      return { picks, onWatch, plan };
    };

    const dialog = new Dialog({
      title: `Long Rest — ${actor.name}`,
      content,
      render: html => { redraw(html); html.on("change", "select, input", () => redraw(html)); },
      buttons: {
        rest: {
          label: "Rest",
          callback: html =>
          {
            const { picks, onWatch, plan } = redraw(html);
            if(plan.over.length)
            {
              ui.notifications.warn(`That is more than ${actor.name} carries: ${plan.over.map(o => `${o.who}'s ${o.text}`).join("; ")}.`);
              return false;
            }
            (async () =>
            {
              const result = await longRest(actor, { onWatch, picks });
              if(result?.offerRecovery) await this._promptFullHpRecovery(actor);
              // The companions ate from the same plan; this applies what it
              // decided for them and posts their card.
              if(result && actor.type === "character") await companionUpkeep(actor, result.plan);
            })();
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "rest"
    }, { width: 620 });
    // Stays open when the callback refuses an over-budget pick - the same
    // override the old companion dialog carried, since Foundry 11's Dialog
    // closes after any button whatever the callback returns.
    dialog.submit = function(button, event)
    {
      const html = this.options.jQuery ? this.element : this.element[0];
      if(button?.callback && button.callback(html, event) === false) return;
      return this.close();
    };
    dialog.render(true);
  }

  /**
   * "If HP is already full, heal one Wound or restore damaged ability bonuses
   * by one point."
   *
   * EXCLUSIVE, and the dialog enforces it by being a choice rather than two
   * controls. Wounds and ability damage are separate currencies — healing a
   * Wound returns none of the ability damage it arrived with — so offering
   * both would hand out two recoveries where the book's "or" allows one.
   *
   * Silent when there is nothing to recover. A character at full HP with no
   * Wounds and no ability damage has simply had an uneventful night, and a
   * dialog saying so is noise on every rest a healthy party takes.
   */
  /**
   * "If HP is full, heal one Wound." Which one is the player's pick.
   *
   * NO ABILITY-RESTORE BRANCH, unlike _promptFullHpRecovery below, and that
   * is the reason this is a second dialog rather than a flag on the first. A
   * Long Rest offers "heal one Wound OR restore damaged ability bonuses by one
   * point"; Repairs offers only the Wound. Reusing that dialog would hand a
   * Synth a recovery the book does not give them.
   *
   * THE PART IS SPENT BY repairWound AND NOT BEFORE IT, so cancelling costs
   * nothing. Never reached with an empty list — synth-repair.js refuses that
   * case outright rather than opening a dialog with no choices in it.
   */
  async _promptRepairWound(actor, wounds)
  {
    const picker = wounds
      .map((w, i) => `<option value="${i}">${w.name}${restProofReason(w) ? " (repairs will not heal this)" : ""}</option>`)
      .join("");

    new Dialog({
      title: `Repairs — ${actor.name} is at full HP`,
      content: `<form>
        <p>At full HP a repair heals <b>one Wound</b>. It uses up one
           <b>Synth Part</b>; ${synthPartTotal(actor)} carried.</p>
        <div class="form-group">
          <label>Wound</label>
          <select name="wound">${picker}</select>
        </div>
      </form>`,
      buttons:
      {
        repair:
        {
          label: "Repair",
          // A rest-proof wound is refused with no part spent, and the picker
          // reopens so the player can choose something else (2026-09-25).
          callback: async html =>
          {
            const result = await repairWound(actor, Number(html.find('[name="wound"]').val()));
            if(result?.refused) this._promptRepairWound(actor, actor.system.wounds ?? []);
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "repair"
    }).render(true);
  }

  async _promptFullHpRecovery(actor)
  {
    const wounds  = actor.system.wounds ?? [];
    const damaged = damagedAbilities(actor);
    if(!wounds.length && !damaged.length) return;

    const buttons = {};

    if(wounds.length)
    {
      buttons.wound = {
        label: "Heal a Wound",
        callback: async html =>
        {
          const index = Number(html.find('[name="wound"]').val());
          // A REST-PROOF WOUND (RULED 2026-09-25, Matt): the picker lists it
          // so nobody wonders where it went, but choosing it says why rest
          // will not heal it and reopens the picker to choose something else.
          const proof = restProofReason(wounds[index]);
          if(proof)
          {
            ui.notifications.warn(`A rest will not heal ${wounds[index].name} — ${proof}. Choose something else.`);
            return this._promptFullHpRecovery(actor);
          }
          const healed = await healWound(actor, index);
          if(healed)
            this._postWoundMsg(actor, `recovers from <b>${healed.name}</b> overnight.`);
        }
      };
    }

    if(damaged.length)
    {
      const names = damaged.map(d => d.key.toUpperCase()).join(", ");
      buttons.abilities = {
        label: "Restore ability bonuses",
        callback: async () =>
        {
          const restored = await restoreAbilityPoints(actor);
          this._postWoundMsg(actor, `recovers one point of damage to `
            + `<b>${restored.map(k => k.toUpperCase()).join(", ")}</b> overnight.`);
        }
      };
      buttons.abilities.label = `Restore ${names} by one point`;
    }

    buttons.nothing = { label: "Nothing" };

    const woundPicker = wounds.length ? `
      <div class="form-group">
        <label>Wound</label>
        <select name="wound">
          ${wounds.map((w, i) => `<option value="${i}">${w.name}${restProofReason(w) ? " (rest will not heal this)" : ""}</option>`).join("")}
        </select>
      </div>` : "";

    // WHY THIS PROMPT OPENED, because as of 2026-09-11 there are two reasons and
    // the wording was true of only the first. Found in testing (group 127.4): a
    // Lithling on 20 of 38 was told it was "already at full HP", which is the
    // exact shape of wrong this project keeps meeting - a screen stating a
    // condition the actor does not meet, in a system where the whole point of
    // the change was that it never can.
    const exempt = !!noHealRule(actor) && actor.system.health.value < actor.system.health.max;

    new Dialog({
      title: exempt
        ? `Long Rest — ${actor.name} cannot heal lost HP`
        : `Long Rest — ${actor.name} is already at full HP`,
      content: `<form>
        <p>${exempt
          ? `<b>${noHealRule(actor)}</b> means no Long Rest will ever restore this`
            + ` character’s HP, so the full-HP condition is waived: a Long Rest heals`
            + ` <b>one Wound</b> <i>or</i> restores <b>damaged ability bonuses by one`
            + ` point</b> — not both.`
          : `At full HP a Long Rest heals <b>one Wound</b> <i>or</i> restores`
            + ` <b>damaged ability bonuses by one point</b> — not both.`}</p>
        ${woundPicker}
      </form>`,
      buttons,
      default: wounds.length ? "wound" : "abilities"
    }).render(true);
  }

  /**
   * Activation for a per-round reminder. Two inputs and nothing else.
   *
   * Rounds is left BLANK by default rather than prefilled with 1, because
   * blank is the commonest case by some margin — most creature rules and
   * every Toxin Die recur with no stated ending — and a prefilled 1 would
   * silently expire them after one round. The placeholder says so.
   *
   * The note is echoed into the reminder card and never parsed. It is what
   * carries "3 entities" for the two atoms whose duration trades against a
   * target count, and more generally the target of any monster rule, since
   * the toggle lives on the monster rather than on whoever it afflicts.
   */
  async _promptRoundEffect(item)
  {
    const text = `${item.system?.description ?? ""} ${item.system?.effect ?? ""}`;
    const formula = formulaFrom(item);
    const ticks = PER_ROUND_WORDING.test(text);

    // Prefilled from the item's own wording — the ruling is that activation
    // takes one number, and the dialog opens with what the effect implies:
    // the constant for a fixed span, the roll for a rolled one, the reader's
    // INT for an [INT] one. A miss costs a typed number, never a wrong one.
    const suggested = declaredSpanOf(item);
    const amount = suggested ? this._resolveDurationToken(suggested.raw) : "";
    const unit = suggested?.unit ?? "round";

    const options = Object.entries(SCALES).map(([k, v]) =>
      `<option value="${k}"${k === unit ? " selected" : ""}>${v.label}</option>`).join("");

    const content = `
      <form>
        <div class="form-group">
          <label>Lasts how long?</label>
          <input type="number" name="amount" min="1" step="1" value="${amount}"
                 placeholder="blank = until switched off" style="flex:2"/>
          <select name="unit" style="flex:3">${options}</select>
        </div>
        <div class="form-group">
          <label>Who or what does it affect?</label>
          <input type="text" name="note" placeholder="echoed on the board, e.g. 3 entities"/>
        </div>
        <p class="notes">
          Goes on the Active Effects board. It reminds and it expires; it does
          not apply or undo the effect itself.
          ${ticks ? "This one also ticks each combat round." : ""}
          ${formula ? `The reminder will offer a <b>${formula}</b> roll.` : ""}
        </p>
      </form>`;

    return Dialog.prompt({
      title: `Track: ${item.name}`,
      content,
      label: "Start tracking",
      callback: html => activateRoundEffect(item, {
        rounds: html.find('[name="amount"]').val(),
        unit:   html.find('[name="unit"]').val(),
        note:   html.find('[name="note"]').val()
      }),
      rejectClose: false
    });
  }

  /**
   * Turn a duration token from the item's text into a number for the dialog.
   *
   * "[INT]" reads this actor's Intelligence and a die is rolled once, here,
   * rather than stored as a formula — the board holds an absolute expiry, so
   * the roll has to happen at activation. A token that resolves to nothing
   * leaves the field blank rather than guessing, since a wrong prefilled
   * number is worse than an empty one: the Referee would have to notice it.
   */
  _resolveDurationToken(raw)
  {
    if (!raw) return "";
    if (raw === "[INT]") return this.actor.system?.abilities?.int?.value ?? "";
    if (/^\d+$/.test(raw)) return Number(raw);
    if (/^d\d+$/i.test(raw))
    {
      const roll = new Roll(raw);
      roll.evaluate({ async: false });
      return roll.total;
    }
    return "";
  }
}
