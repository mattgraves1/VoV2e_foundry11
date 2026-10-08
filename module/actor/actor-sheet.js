import { BIOLOGICAL_WOUNDS, SYNTHETIC_WOUNDS, getWound } from "./wounds-data.js";
import { checkWoundDeath, restProofReason, applyNamedWound } from "./named-wound.js";
import { resolveSurgicalArray } from "../combat/surgical-array.js";
import { applyHitProgression } from "../combat/hit-progression.js";
import { isCargo, CARGO_FLAG } from "./item-slots.js";
import { findFigment } from "./figments.js";
import { openLevelLoss } from "./level-loss.js";
import { MISHAPS, substituteINT } from "./codex-data.js";
import { codexOf, mishapOf, remainingItemFlagsOf, remainingActorFlagsOf } from "../item/remaining-effects.js";
import { SPARK_TABLES, ANCESTRY_NOTES, IMPLANTS, GIFT_QUALITIES_ALL, GIFT_FORMS_ALL } from "./chargen-data.js";
import { rollUsageDie, upgradeDie, flagWeaponFiredInCombat } from "../item/usage-die.js";
import { isExoticaItem } from "../item/implant-exotica-effects.js";
import { DAMAGE_NOTES, TO_HIT_NOTES, HIT_NOTES } from "./roll-notes-data.js";
import { saveNotesFor, saveModifierSources, askSaveQuestions } from "./save-notes.js";
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
         woundDamageMultiplier,
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
import { useFieldGenerator, healTargets, applyHeal } from "./healing-field.js";
import { levelOf, costDieForLevels, OTHER_USE } from "../item/gift-effects.js";
import { useSentences, sentenceLabel, optionsOf } from "../effects/interpret.js";
import { runUse, activePassives } from "../effects/interpreter.js";
import { builtReminders, effectUses, askedAutoHitLine } from "../effects/item-readers.js";
import { bodyForbids, helmRefusal, bodySentences, attackKindHolds, bodyTabReminders } from "../effects/body.js";
import { sentencesOf } from "../effects/interpret.js";
// Stats as Sentences chunk 2a (RULED 2026-10-07): damage dice, hands and the usage die through their sentences.
import { statOf, usageDieOf, armourSlotOf } from "../effects/item-stats.js";
import { BITE_WORDS } from "../item/attack-properties.js";
import { hitArmourLoss, hitTargetAv, valueReachesSentences, toHitAbility, damageAbilityBonus, ignoresArmour, reflectsMisses,
         naturalRollSentences, itemForbids, autoHitSentences, attackForbids, equipForbids, drawSentences, tabReminders,
         hitReminders, reloadOf } from "../item/weapon-tags.js";
import { healsOnKill } from "../effects/weapon-heals.js";
import { openReactionDialog } from "./reaction-roll.js";
import { computeGate } from "../effects/gates.js";
import { isTargetGate } from "../effects/interpret.js";
import { settleGates } from "../effects/gates.js";
import { reachValue } from "../effects/value-reaches.js";
import { postEquationDamageCard } from "../combat/equation-damage.js";
import { reputationRows, setRep, changeRep, SPEND_EXAMPLES } from "./faction-reputation.js";
import { openTransferDialog, handleItemDrop } from "./item-transfer.js";
import { grantedCreatureTypes, grantedCreatureTypeSources } from "./actor.js";
import { applyJinx, JINX_BANNER } from "../time/curse.js";
import { ownerOf, ownerIsDangling, openOwnerDialog, companionsOf, companionKindOf,
         COMPANION_KINDS } from "./companion.js";
import { companionUpkeep } from "./companion-upkeep.js";
import { activate as activateRoundEffect, deactivate as deactivateRoundEffect,
         isRoundEffectActive } from "../combat/round-effects.js";
import { SCALES, removeEntry as removeEffectEntry, entriesOf, addEntry } from "../time/effect-board.js";
import { startGiftSustain, addFading, fadingSummary } from "../time/recurrence.js";
import { resolveDeltas as resolveStatefulDeltas,
         isEmptyDeltas as isEmptyStatefulDeltas,
         applyActivationHp as applyStatefulActivationHp,
         hasCondition as hasStatefulCondition,
         entriesEndedByDamage, conditionSourceNames, saveDisSources,
         DIS_SAVES_AND_ATTACKS } from "../time/stateful-effect.js";
import { eligibleForGain, promptAbilityChoice,
         applyPermanentAbilityChange,
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
import { heal } from "../effects/heal.js";
import { maxHpChange } from "../effects/max-hp.js";
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

// THE ELIXIR DRINK PATH reads the drink's sentences since Effect Engine:
// Consumables chunk 3a (RULED 2026-10-06, Matt): DURATION_ELIXIRS,
// statefulElixirNames() and statefulSpecFor() - the roster lists and lookups
// that chose a drink's branch - are gone; the branch is the sentence's handler
// (_elixirOneOff), its figures the sentence's.

import { doDamage, resolveHPChange, berserkApplies, dealDamage, applyWound, crumbleInevitable, kill } from "../effects/hp-pipeline.js";
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
import { afflictionOverTimeOf } from "../item/affliction-effects.js";
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
import { elixirSentencesByName, elixirDrinkOf, elixirHpTick, floraToxDieOf } from "../item/consumable-effects.js";
import { touchSearch } from "./touch-search.js";
import { declaredSpanOf, spanFieldFrom } from "../time/declared-span.js";
import { grantAbility, grantAbilities, isGrantedAbility, useGrantedAbility, elixirGranting } from "./granted-ability.js";
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
// Creature attack flags from their sentences (Effect Engine: Creatures chunk 2a).
import { creatureAttackOf, creatureFlagsOf, roundWordingOf, creatureActorFlagsOf, namedWoundEffectsOf } from "../item/creature-effects.js";

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
   * weapons against FORGETTABLE_EFFECTS (weaponTag by a carried weapon's
   * system.tags) and reads the body's rows (bodyTabReminders), then groups
   * the matches by Section then Polarity for the tab template. Detriments
   * are grouped ahead of benefits within each section — the whole point of
   * this tab, per Matt, is surfacing what a GM/player is likely to forget,
   * and players remember buffs far more reliably than debuffs.
   * Implant, Exotica and Exotica-armour rows come from their sentences since
   * Effect Engine: Implants, Exotica and Figments chunk 4 (2026-10-06).
   */
  _buildForgettableEffects(actor)
  {
    // Exotica Identification: an item the viewer may not see contributes no
    // entry, because the entry names it.
    const items = actor.items.filter(i => !hiddenFrom(i));
    // A weapon's reminders come from its sentences since Weapon Tags chunk 5a,
    // for any CARRIED weapon (Matt: a reminder can spur a player to equip it);
    // one whose effect needs the weapon equipped says so while it is not.
    const weaponReminders = items
      .filter(i => i.type === "weaponMelee" || i.type === "weaponRanged")
      .flatMap(i => tabReminders(i));
    const weaponTagNames = weaponReminders.map(r => r.tag);

    const matches = FORGETTABLE_EFFECTS.map(entry =>
      entry.itemType === "weaponTag" && weaponTagNames.includes(entry.name)
        && !weaponReminders.some(r => r.tag === entry.name && r.inForce)
        ? { ...entry, note: `${entry.note} (equip it to use this)` } : entry).filter(entry =>
    {
      return entry.itemType === "weaponTag" && weaponTagNames.includes(entry.name);
    });

    // The body's rows - a mutation's, an ancestry rule's, an implant's, a
    // figment's or an Exotica's own reminder sentences (Mutations and Ancestry
    // Rules chunk 5; Implants, Exotica and Figments chunk 4, both RULED
    // 2026-10-06): none for a suppressed mutation or implant, an ancestry rule
    // with no Item read from the text, an unworn Exotica armour's saying to equip it.
    for(const r of bodyTabReminders(actor))
      if(!r.item || !hiddenFrom(r.item)) matches.push(r);

    // GM Effect Builder chunk 1 (2026-10-05): a passive reminder a GM wrote on
    // any Item shows under that Item's name; one needing a state its Item is
    // not in says how to bring it into force.
    for(const item of items)
      for(const r of builtReminders(item))
        matches.push({ name: r.name, itemType: "effect", category: r.category, section: r.section, polarity: r.polarity,
                       note: r.inForce ? r.note : `${r.note} (equip it to use this)` });

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
    html.find('.knave-ability-button').click(async ev =>
    {
      const ability = $(ev.currentTarget)[0].id;
      // Albino's "is it daylight?", once per scene, before the save (Mutations
      // and Ancestry Rules chunk 2b, ruling C 7).
      await askSaveQuestions(this.actor, ability);
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
      // The character's own unconditional rules - Extra Head's ADV, Small
      // Stature's DIS (save-notes.js, Shared Pipelines chunk 7, RULED 2026-10-05).
      const own = saveModifierSources(this.actor, ability);
      const roll = this._onAbility_Clicked(ability, ev, encDis || statDis || own.dis.length > 0, own.adv.length > 0);
      // Item 14: Save-button notes only apply to a direct button click, not
      // to _onAbility_Clicked's internal reuse for weapon attack rolls
      // (STR/DEX) — those are attack rolls, not Saves.
      // Failed-Save Consequence (2026-09-13). The roll is already in hand, so
      // this is the cheapest of the three sites; resolveSave decides, and
      // onSaveResolved is a no-op for any actor carrying nothing.
      const verdict = resolveSave(roll.total, roll.dice[0]?.total, SAVE_TARGET);
      onSaveResolved(this.actor, ability, verdict);
      const notes = this._saveNotesFor(this.actor, ability);
      for(const name of own.adv) notes.push(`<b>${name}</b> — ADV on this Save (applied).`);
      for(const name of own.dis) notes.push(`<b>${name}</b> — DIS on this Save (applied).`);
      if(encDis) notes.push("<b>Encumbered</b> — DIS on STR, DEX and CON saves while carrying more than your item slot limit.");
      // Named by source (2026-10-04): a Daemon's Misfortune Aura gives DIS on EVERY save, not only physical ones.
      if(statDis) notes.push(`<b>DIS on this Save</b> — from ${[...conditionSourceNames(this.actor, "disSaves"),
        ...(["str", "dex", "con"].includes(ability) ? conditionSourceNames(this.actor, "disPhysicalSaves") : [])].join(", ")}.`);
      this._postRollNotes(this.actor, notes);
    });
    html.find('.knave-morale-button').click(this._onMoraleCheck.bind(this));
    // Reaction Roll Button (2026-10-05): the NPC sheet's GM-only reaction roll.
    html.find('.vaarn-reaction-button').click(() => openReactionDialog(this.actor));
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
      // The count and label from the wound's sentence (Creatures chunk 2e); the progress is the entry's.
      const spec = (w.named ? namedWoundEffectsOf(w.named)?.tally : null) ?? w.tally;
      const done = (Number(w.tally.done) || 0) + 1;
      if(done >= Number(spec.count))
      {
        this._postWoundMsg(this.actor, `${spec.label} (${done} of ${spec.count}) — <b>${w.name}</b> is gone.`);
        return this._healWound(this.actor, index);
      }
      w.tally = { ...w.tally, done };
      await this.actor.update({ "system.wounds": wounds });
      this._postWoundMsg(this.actor, `${spec.label} for <b>${w.name}</b> (${done} of ${spec.count}).`);
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

    // GM Effect Builder chunk 1 (2026-10-05): use an effect a GM wrote on any Item.
    html.find('.effect-use').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      this._onEffectUse(item);
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
      this._onBodyUse(item, ev);
    });

    // Use a per-use Usage Die item (gear/Exotica/Armor) — rolls its usage
    // die immediately, unlike ranged weapon ammo which resolves once per
    // combat.
    html.find('.usage-die-roll').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      // An Exotica - its own type, or an armour made from one - runs its use
      // sentence since Implants, Exotica and Figments chunk 3b (2026-10-06): the
      // interpreter rolls the usage die, says the use's line, does the effect
      // and removes an Exotica whose die is expended. Gear keeps the plain roll.
      if(isExoticaItem(item) && useSentences(item).some(({ s }) => !s.baked))
        return this._onExoticaSentenceUse(item, ev);
      await rollUsageDie(item, this.actor);
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
      this._onExoticaSentenceUse(item, ev);
    });

    // Use a no-pool "Unlimited" Exotica item with a real activated effect
    // (e.g. The Crimson Cantos) — work-queue item 10.3.4 (2026-08-27).
    // Same "use icon, no pool" shape as mutation-use/implant-use.
    html.find('.exotica-use').click(async ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if(await this._attunementRefuses(item, "use")) return;
      this._onExoticaSentenceUse(item, ev);
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
      this._onBodyUse(item, ev);
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
      this._onBodyUse(item, ev);
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
      const spec = creatureFlagsOf(item).spawnNow;
      if(!spec) return;
      // `loyal` and `removesItem` (2026-10-04, RULED by Matt): a Lizard
      // Rancher's Tame War Lizard is placed once, loyal to its owner, and the
      // Item that placed it goes - the Broodling Broth's shape.
      const roll = await new Roll(spec.dice).evaluate({ async: true });
      const spawned = await spawnBeside(this.actor, spec.creature, roll.total, { loyal: !!spec.loyal });
      if(!spawned) return ui.notifications.warn(`"${spec.creature}" is not in the Bestiary compendium.`);
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
        content: `<b>${item.name}</b>: ${this.actor.name} brings <b>${roll.total} × ${spec.creature}</b>`
          + (/d/.test(spec.dice) ? ` (${spec.dice})` : "")
          + (spawned.length ? ` — ${spawned.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(", ")}` : "")
          + (spec.loyal ? `, loyal to ${this.actor.name}` : "") + `.` });
      if(spec.removesItem) await item.delete();
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

    // SUMMONS FROM THE PARTY'S LOCATION - a Quantum Daemon's Summons Monsters
    // (Generated Gear and Attacks as Items, RULED 2026-10-04 by Matt): the vault
    // level's encounter table in a vault, the region section's in the desert, as
    // the Exploration Clock records them. Not loyal, as the Banisher's Summon.
    // COPIES OF ITSELF - a Quantum Daemon's Inferior Clones (RULED 2026-10-04, Matt).
    html.find('.item-clone-self').click(async ev =>
    {
      if(!game.user.isGM) return ui.notifications.warn("Only the Referee can make copies of a creature.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const spec = creatureFlagsOf(item).cloneSelf;
      if(!spec) return;
      const n = (await new Roll(spec.dice).evaluate({ async: true })).total;
      const { cloneSelfBeside } = await import("./bestiary-spawn.js");
      const made = await cloneSelfBeside(this.actor, n, { hp: spec.hp ?? null, dropItemId: item.id });
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
        content: `<b>${item.name}</b>: ${spec.dice} = ${n}. ${made.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(", ")}${spec.hp != null ? ` - ${spec.hp} HP each` : ""}.` });
    });

    html.find('.item-summon-location').click(async ev =>
    {
      if(!game.user.isGM) return ui.notifications.warn("Only the Referee can summon creatures.");
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const { rollPartyLocationEncounter } = await import("./location-encounter.js");
      const rolled = await rollPartyLocationEncounter();
      if(!rolled) return ui.notifications.warn(`${item?.name ?? "Summon"}: record where the party is first - the Exploration Clock's Party location (in a vault) or Party section (in the desert).`);
      const spawned = rolled.creature ? await spawnBeside(this.actor, rolled.creature, 1, { loyal: false }) : null;
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
        content: `<b>${item.name}</b>: ${rolled.where} encounters, d${rolled.die} = ${rolled.total} - <i>${rolled.text}</i>. `
          + (spawned?.length ? `Summoned ${spawned.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(", ")} - not loyal to ${this.actor.name}.`
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
      const step = Number(creatureFlagsOf(item).avStep) || 0;
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
      this._onBodyUse(item, ev);
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
    // A to-hit ability from the weapon's sentences (Psionic's PSY), Weapon Tags chunk 4.
    const own = toHitAbility(item);
    if(own) return own;
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
    const [ownDis, ownAdv] = this._ownSaveMods("con");
    const roll = this._onAbility_Clicked("con", event, ownDis, mods.advantage || ownAdv);
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

    // Through the whole HP pipeline (Shared Pipelines chunk 2, 2026-10-05), as
    // tox damage with no attacker, so a tox immunity, a multiplier and temp HP
    // all apply as they would to a hit.
    dealDamage(actor, roll.total, { types: ["tox"], name: "Toxin Die" });
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
    if(!creatureAttackOf(item).sporeDepletion || !this.actor.system.sporeLockout) return false;
    this._postWoundMsg(this.actor, `has no spores left — no more can be expelled without a Long Rest.`);
    return true;
  }

  _sporeDepletionSave(item)
  {
    const actor = this.actor;
    const roll = this._rollD20(actor.system.abilities.con.effective, `${item.name} — CON Save to keep its spores`, null, ...this._ownSaveMods("con"));
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
        // The questions before the roll (Weapon Tags chunk 4): Flaming's
        // underwater and submerged, Heat-Seeking's warm-blooded. Nothing to ask
        // resolves at once.
        return void this._attackQuestions(item).then(asked =>
        {
          if(asked.stop) return;
          if(item.flags?.vaarn?.stagedBy)
            return void this._stagedAttackReady(item).then(ok => ok && this._checkToHitTargets(null, item, asked));
          if(creatureAttackOf(item).autoHit) return this._checkToHitTargets(null, item, asked);
          const blindDis = hasStatefulCondition(this.actor, BLIND);
          const advVs = this._advantageVsNotes(item);
          // A target that makes this attack roll at DIS - the Ickbulb's smear,
          // Vantablossom (To-Hit Resolution Override wiring, 2026-09-25).
          const tDis = targetDisadvantage(item, Array.from(game.user?.targets ?? []).map(t => t.actor), hasStatefulCondition);
          const roll = this._onAbility_Clicked(this._toHitAbilityKey(item), event, blindDis || tDis.force || asked.bodyDis.length > 0,
            advVs.length > 0 || asked.bodyAdv.length > 0);
          this._checkWeaponCrit(item, roll);
          // An Exotica weapon's usage die rolls on every use (10.3.3) - each
          // stab of Philosopher's Dirk (2026-09-22). A spent one is removed
          // after its damage click, or on the next attempt if this one missed,
          // so the hit it just made can still land.
          if(item.flags?.vaarn?.exotica && usageDieOf(item).die) rollUsageDie(item, this.actor);

          this._checkToHitTargets(roll, item, asked);
          this._checkTooHotToHold(item);
          this._postRollNotes(this.actor, [...advVs, ...this._bodyAttackNotes(asked), ...tDis.notes, ...this._attackNotes(), ...this._tagNotes(item, TO_HIT_NOTES), ...this._stormNotes(item), ...this._followUpNotes(item)]);
          // A condition the weapon inflicts - a creature attack's declared
          // effect (2026-09-16). A PC weapon's Entangling / Blinding tag no
          // longer posts here: since 2026-09-24 its save card follows each HIT,
          // and a failed roll puts the condition on (_checkToHitTargets).
          this._postConditionCards(creatureFlagsOf(item).applies ?? [], item.name);
          if(creatureAttackOf(item).sporeDepletion) this._sporeDepletionSave(item);
        }).catch(err => console.error("Vaarn | attack:", err));
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
      if(!statOf(item, "damage-dice") && (abilityDamageSpecsOf(item).length || abilityTickSpecsOf(item).length))
      {
        this._applyAbilityDamageOnHit(item).then(() => this._checkValueReachesOnHit(item));
        return;
      }
      // A HIT THAT TAKES A RATION - the Desiccator's water, the Faminebearer's
      // food (Travel and Rations, RULED 2026-09-23). The ration card first,
      // THEN the note that the rest of the rule (Deprived, the CON loss, the
      // save) is the Referee's - chained, because this handler is not async
      // and two unawaited cards can post in either order.
      if(creatureAttackOf(item).takesRation)
      {
        const taking = this._takeRationOnHit(item);
        if(!statOf(item, "damage-dice") && creatureAttackOf(item).hitProgression) return;
        if(!statOf(item, "damage-dice"))
        {
          taking.then(() => this._postWoundMsg(this.actor, `<b>${item.name}</b> has no damage roll — resolve the rest of its effect on a hit from the biography.`));
          return;
        }
      }
      // A creature attack that rolls to hit but deals nothing the system can
      // write - Desiccate, Surgical Array (the to-hit rule, 2026-09-22). Say so
      // rather than rolling an empty formula.
      if(!statOf(item, "damage-dice"))
      {
        this._postWoundMsg(this.actor, `<b>${item.name}</b> has no damage roll — resolve its effect on a hit from the biography.`);
        return;
      }
      // Damage Read from an Actor Value (2026-09-21, RULED by Matt): a
      // formula like "(@lvl)d4" or "@target.gleam" is read NOW, from the
      // attacker's current Level and the one targeted token. One that reads
      // the target and has none, or several, refuses and says why.
      const valueRead = actorValueRollData(statOf(item, "damage-dice"), this.actor,
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
      // An ability added to damage, from the sentences (Psionic's EGO), Weapon Tags chunk 4.
      const abilityBonus = damageAbilityBonus(item)[0];
      if(abilityBonus)
      {
        const egoAmount = Number(this.actor.system.abilities[abilityBonus.ability]?.effective || 0);
        if(egoAmount) psionicBonus = { amount: egoAmount, name: abilityBonus.tag };
      }
      const totalBonus = (implantBonus?.amount || 0) + (psionicBonus?.amount || 0);
      const formula = totalBonus ? `${statOf(item, "damage-dice")}+${totalBonus}` : statOf(item, "damage-dice");

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
        + (readsActorValue(statOf(item, "damage-dice"))
          ? ` (read: ${[/@lvl/.test(statOf(item, "damage-dice")) ? `Level ${valueRead.data.lvl}` : null,
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

      // ASK, THEN LAND (Effect Engine: Weapon Tags chunk 3, RULED 2026-10-05):
      // electrical damage asks whether each target is submerged and eroding
      // damage whether it is a structure, before any of it lands - so the
      // landing waits for the answers. Nothing to ask resolves at once.
      const land = async () =>
      {
        const asked = await this._damageQuestions(item, damageComponents, Array.from(this.#_hitTargets));
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
          const res = this._doDamage(target, dmg, isMelee, item, rollMultiplier, damageComponents, { asked: asked.get(target) ?? null });
          if(res.vampiricHeal > 0) { vampiricTotal += res.vampiricHeal; vampiricDrained++; }
          if(res.drainHeal > 0) { drainTotal += res.drainHeal; drainVictims++; }
          if(res.bloodRapturousHeal > 0) { rapturousTotal += res.bloodRapturousHeal; rapturousKills++; }
          if(res.killed && isMelee) meleeKills++;
          // A named wound on a hit that DEALS DAMAGE - the Deathblight Husk's
          // Accursed Knife (Encumbrance Penalty wiring, RULED 2026-09-25, Matt).
          if(res.dealt > 0 && creatureAttackOf(item).woundOnDamage && target.actor)
            applyNamedWound(target.actor, creatureAttackOf(item).woundOnDamage, { source: `${this.actor.name}'s ${item.name}` });
        });
        const attackHeals = [
          { verb: "drains", label: "Vampiric", amount: vampiricTotal, victims: vampiricDrained },
          { verb: "drains", label: item.name, amount: drainTotal, victims: drainVictims },
          { verb: "feeds on the death of", label: "Blood-Rapturous", amount: rapturousTotal, victims: rapturousKills },
        ];
        // THE LEVEL FIRST, THEN THE HEAL (the Hagfluke's Siphon, RULED 2026-09-27,
        // Matt): its +4 max HP is room the heal can then fill. One Level per
        // attack, whatever the number of qualifying targets it hit.
        const gain = creatureAttackOf(item).levelGain;
        const gainsFrom = gain ? Array.from(this.#_hitTargets).filter(t => t.actor && (!gain.targets?.length || hasAnyCreatureType(t.actor, gain.targets))) : [];
        Promise.resolve(gainsFrom.length ? this._applyLevelGain(item, gain) : null)
          .then(() => this._applyAttackHeals(attackHeals, item.name));
        this._postKillReactionReminder(meleeKills);
        this._noteUnresolvedKillReactions(item);
        this._resolveChargeDeclaration(item, addOns);
        // A tag's ability damage "alongside base damage" - Freezing, Necrotic.
        await this._applyAbilityDamageOnHit(item);
        // Lithifying's +1 AV per hit, and "at 0 DEX" (Weapon Tags chunk 3, RULED 2026-10-05).
        await this._applyTargetAvOnHit(item);
        await this._checkValueReachesOnHit(item);
        // A tag that eats the target's armour - Ultra-Corrosive.
        this._applyArmourLossOnHit(item);
        // An ongoing hold the hit starts - the Piranha Mole's Flense.
        this._startHoldsOnHit(item);
      };
      land().catch(err => console.error("Vaarn | landing the damage:", err));
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
    const spec = creatureAttackOf(item).holdOnHit;
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
        + `${spec.dice ? spec.dice + " damage each round" : spec.loss ? spec.loss.dice + " " + String(spec.loss.ability).toUpperCase() + " each round" : (spec.effect ?? "held")}; `
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

  // RESTORED 2026-10-06 (Creatures chunk 2a): 4fbd94e deleted these two with
  // the Exotica methods beside them, while their sheet controls still called them.
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
    // From its sentence since Effect Engine: Creatures chunk 2a (2026-10-06).
    const spec = creatureAttackOf(item).maxHPLoss;
    if(!spec) return;
    const targets = Array.from(game.user?.targets ?? []).map(t => t.actor).filter(Boolean);
    if(!targets.length)
      return this._postWoundMsg(this.actor, `<b>${item.name}</b>: no target is selected, so no maximum HP was lost.`);
    for(const target of targets)
    {
      const roll = await new Roll(spec.dice).evaluate();
      // The max HP verb (Shared Pipelines chunk 5): a loss, floored at 0, clamps current.
      const change = maxHpChange(target, { add: -roll.total });
      const newMax = change["system.health.max"];
      await this._postWoundMsg(target, `loses <b>${roll.total}</b> maximum HP to <b>${item.name}</b>${spec.permanent ? ", never to be regained" : ""}${gmHP(target, ` — now ${newMax}`)}.`);
      await target.update(change, { [MAX_HP_CAUSE]: item.name });
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
    const spec = creatureFlagsOf(item).tempHp;
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
        this._kill(target);
      }
    }
  }

  /** Cause Wound: roll the declared dice on the Wounds table for a character hit (creatures take no Wounds). */
  async _rollWoundOnHit(item, target)
  {
    if(!target) return;
    const dice = creatureAttackOf(item).woundRoll;
    if(target.type !== "character")
      return this._postWoundMsg(target, `<b>${item.name}</b> would roll ${dice} on the Wounds table, but creatures do not suffer Wounds.`);
    const r = (await new Roll(dice).evaluate({ async: true })).total;
    await this._postWoundMsg(target, `<b>${item.name}</b>: a Wound (${dice} = ${r}, the -${r} HP row).`);
    return this._applyWound(target, -r, 0, { setHP: false });
  }

  /** Destroy Item: roll the d20 and NAME the item in that slot, to the Referee only. */
  async _rollDestroyItemOnHit(item, target)
  {
    if(!target) return;
    const { itemAtSlot } = await import("./item-slots.js");
    const roll = await new Roll(creatureAttackOf(item).destroyItemRoll).evaluate({ async: true });
    const hit = itemAtSlot(target.items, roll.total);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `<div class="vaarn-chat-card"><h3>${item.name}</h3><p>${target.name}, slot ${roll.total} (${creatureAttackOf(item).destroyItemRoll}): `
        + (hit ? `<b>@UUID[${hit.uuid}]{${hit.name}}</b>` : "<i>an empty slot</i>")
        + `.</p><p><i>Nothing has been destroyed - whether and how it is, is the Referee's call.</i></p></div>` });
  }

  /**
   * The questions a damage click asks before anything lands - Effect Engine:
   * Weapon Tags chunk 3, RULED 2026-10-05 (Matt): ANY electrical damage asks
   * whether each target is submerged (Electrical doubles there), and ANY
   * eroding damage whether it is a static structure (Eroding doubles there).
   * The damage type decides, not the tag, as the metal-armour doubling does.
   * The GM answers about a target; prompts off or no answer uses "no" and the
   * line saying so is posted (gates.js). Returns Map(token -> { submerged,
   * structure }); doDamage applies the doubling.
   */
  async _damageQuestions(item, components, targets)
  {
    const asked = new Map();
    const props = new Set((components?.length ? components : [{ types: null }])
      .flatMap(c => c.types?.length ? c.types : attackPropertiesOrKinetic(item)));
    const electrical = props.has("electrical"), eroding = props.has("eroding");
    if(!electrical && !eroding) return asked;
    for(const target of targets)
    {
      const answer = {};
      const lines = [];
      if(electrical)
      {
        const r = await settleGates([{ gate: "submerged" }], { actor: this.actor, target, title: item.name });
        answer.submerged = r.pass; lines.push(...r.lines);
      }
      if(eroding)
      {
        const r = await settleGates([{ gate: "target-is-object" }], { actor: this.actor, target, title: item.name });
        answer.structure = r.pass; lines.push(...r.lines);
      }
      for(const line of lines) this._postWoundMsg(target.actor ?? this.actor, `<i>${line}</i>`);
      asked.set(target, answer);
    }
    return asked;
  }

  /**
   * A hit that raises the TARGET's AV - Lithifying's "gain +1 AV". RULED
   * 2026-10-05 (Matt): per hit and stacking, one board entry per hit, until
   * the Referee ends it; removing the entry takes the AV off (board AV is
   * live, never written to the stored value).
   */
  async _applyTargetAvOnHit(item)
  {
    const sentences = hitTargetAv(item);
    if(!sentences.length) return;
    for(const token of this.#_hitTargets)
    {
      const actor = token.actor;
      if(!actor) continue;
      for(const s of sentences)
      {
        const av = Number(String(s.do.amount).replace("+", "")) || 0;
        await applyEffectToActor(actor, { name: `${s.tag ?? item.name}: ${av > 0 ? "+" : ""}${av} AV`,
          text: `${s.text ?? ""} From <b>${this.actor.name}</b>'s <b>${item.name}</b>. <b>Lasts until the Referee ends it.</b>`,
          applied: { av }, rounds: null, sourceActorId: this.actor.id, sourceName: this.actor.name });
        this._postWoundMsg(actor, `gains <b>${av > 0 ? "+" : ""}${av} AV</b> from <b>${s.tag ?? item.name}</b> — on the board until the Referee ends it.`);
      }
    }
  }

  /**
   * "At 0 DEX, they are frozen solid" (Freezing) / "At 0 DEX they turn to
   * stone" (Lithifying) - the weapon's value-reaches sentences, checked on
   * every target the hit reached. RULED 2026-10-05 (Matt): it triggers
   * whenever the ability is at or below the threshold after the hit (option
   * B), and the state - Paralysed under the tag's wording - lasts while the
   * ability stays there, ending when it recovers (value-reaches.js).
   */
  async _checkValueReachesOnHit(item)
  {
    const sentences = valueReachesSentences(item);
    if(!sentences.length) return;
    for(const token of this.#_hitTargets)
      if(token.actor) await reachValue(token.actor, sentences, { source: this.actor, item });
  }

  async _applyArmourLossOnHit(item)
  {
    // A tag's loss (Ultra-Corrosive) plus a creature attack's declared one
    // (the Drill Drone's Drill, the Witchgrub's Corrosive Spit - Live AV
    // Computation wiring, 2026-09-25). The same write either way.
    // From the weapon's sentences since Weapon Tags chunk 3 (2026-10-05).
    const tagLoss = hitArmourLoss(item);
    // A declared loss may be DICE (Acid Spray's d3, 2026-10-04), rolled per target hit.
    const declared = creatureAttackOf(item).armourLoss;
    const lossDice = typeof declared === "string" && /d/i.test(declared) ? declared : null;
    const fixed = tagLoss + (lossDice ? 0 : (Number(declared) || 0));
    if(!fixed && !lossDice) return;
    const verb = tagLoss ? "corrodes" : "damages";
    for(const token of this.#_hitTargets)
    {
      const actor = token.actor;
      if(!actor) continue;
      const loss = fixed + (lossDice ? (await new Roll(lossDice).evaluate({ async: true })).total : 0);
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
    if(item.flags?.vaarn?.exotica && usageDieOf(item).die === "expended") this._deleteUsedUpExotica(item);
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
        // Through the whole HP pipeline since chunk 2 (2026-10-05): untyped
        // ("unblockable"), from this sheet's creature.
        dealDamage(actor, spec.start, { source: this.actor, name: spec.source });
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
    if(!item.flags?.vaarn?.exotica || usageDieOf(item).die !== "expended") return false;
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
    if(total !== 20) this.#_criticalWeapons.delete(item.id);

    // WHAT THE NATURAL ROLL SETS OFF, from the weapon's sentences (Effect
    // Engine: Weapon Tags chunk 4, RULED 2026-10-05): Fragile and Crystalline
    // on a 1, Delicate on a 1-2, Unstable's explosion on ANY 1 (ruling F) -
    // a natural-roll gate on an attack-roll sentence, read off the die.
    const fired = naturalRollSentences(item)
      .filter(s => (s.if ?? []).every(g => g.gate !== "natural-roll" || computeGate(g, { natural: total })));
    if(fired.length) { this._weaponNat1(item, fired); return; }

    if(total === 1)
    {
      // A BODY PART POSTS NOTHING (Matt, 2026-09-22). Making Attacks.md: "the
      // weapon is dropped or jams and must be retrieved or fixed before it can
      // be used again" - a Claw is neither, and the line was the only thing a
      // fumble did here, since nothing reads or enforces it. Found in Group
      // 302 and recorded rather than fixed then. `intrinsic` is the same
      // declaration Item Transfer and the dropped-items container refuse to
      // move, so the question is already answered on the Item. Breakage above
      // is untouched: a tagged intrinsic weapon still breaks, which is a real
      // consequence rather than a sentence.
      if(!item.system.intrinsic) this._weaponFumble(item);
    }
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
  async _weaponNat1(item, fired = [])
  {
    const say = content => ChatMessage.create({ user: game.user._id, speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
    // What each fired sentence would do to the weapon, and whether the weapon
    // forbids it: Strong and Indestructible forbid BREAKING, Indestructible
    // also forbids DESTRUCTION - so an Unstable explosion (destruction by
    // explosion, not a break) is stopped by Indestructible and not by Strong
    // (chunk 4 ruling 1, 2026-10-05).
    const states = fired.filter(s => s.do?.verb === "item-state");
    const allowed = s => !itemForbids(item, s.do.by === "explode" ? "destroy" : "break");
    const destroy = states.find(s => s.do.state === "destroyed" && allowed(s));
    const brk = states.find(s => s.do.state === "broken" && allowed(s));
    const boom = fired.find(s => s.do?.verb === "damage");

    if(boom)
    {
      const explosion = new Roll(boom.do.dice);
      explosion.evaluate({async: false});
      const exploded = states.some(s => s.do.by === "explode");
      const fate = destroy?.do.by === "explode" ? " — and is destroyed in the blast!"
        : exploded ? " — and holds together: nothing can destroy it." : "";
      await say(`<span class="knave-ability-crit knave-ability-critFailure"><b>${item.name}</b> explodes violently, dealing ${explosion.total} damage to its wielder${fate}</span>`);
      // Through the whole HP pipeline since chunk 2 (2026-10-05): untyped, no
      // attacker - the weapon itself went off.
      dealDamage(this.actor, explosion.total, { name: item.name });
    }

    if(destroy)
    {
      if(destroy.do.by === "break")
        await say(`<span class="knave-ability-crit knave-ability-critFailure"><b>${item.name}</b> shatters into a thousand glittering pieces — utterly destroyed!</span>`);
      await item.delete();
      return;
    }
    if(brk)
    {
      await item.update({"system.broken": true});
      await say(`<span class="knave-ability-crit knave-ability-critFailure"><b>${item.name}</b> is broken!</span> It needs repair before it can be used again — clear the Broken flag on its sheet once that's done.`);
      return;
    }
    if(states.some(s => s.do.by === "break") && !boom)
      await say(`<b>${item.name}</b> would break, but its tags prevent it!`);
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
    // The implant's attack-hit sentence since Implants, Exotica and Figments
    // chunk 2 (2026-10-06): an ability's bonus ("@str") on its attack kind,
    // not suppressed - the body's, so an implant installed.
    for(const { sentence: s, source } of bodySentences(actor, "attack-hit"))
    {
      const m = /^@(str|dex|con|int|psy|ego)$/.exec(String(s.do?.dice ?? ""));
      if(s.do?.verb !== "damage" || !m) continue;
      if((s.if ?? []).some(g => g.gate === "attack-kind" && !attackKindHolds(g, weaponType))) continue;
      const amount = Number(actor.system.abilities[m[1]]?.effective || 0);
      if(amount) return { amount, name: source };
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
    // The questions before the roll (Weapon Tags chunk 4), as the melee branch.
    const asked = await this._attackQuestions(item);
    if(asked.stop) return;
    // A declared auto-hit makes no roll (RULED 2026-09-25, Matt).
    if(creatureAttackOf(item).autoHit) return this._checkToHitTargets(null, item, asked);
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

    if(usageDieOf(item).die === "expended")
    {
      // A weapon that names its reload offers it instead (the Tempest Cannon,
      // RULED 2026-09-26 by Matt: 3 Water Rations refill the die).
      if(reloadOf(item)) return this._offerReload(item);
      this._postNoAmmoMsg(item);
      return;
    }

    // Blind (work-queue item 3.10): "DIS on ranged attacks" - its sentence since
    // Mutations and Ancestry Rules chunk 3, with ADV in the dark (ruling C 8),
    // settled before the roll by _attackQuestions.
    const advVs = this._advantageVsNotes(item);
    const tDis = targetDisadvantage(item, Array.from(game.user?.targets ?? []).map(t => t.actor), hasStatefulCondition);
    const roll = this._onAbility_Clicked(this._toHitAbilityKey(item), event, asked.bodyDis.length > 0 || tDis.force,
      advVs.length > 0 || asked.bodyAdv.length > 0);
    this._checkWeaponCrit(item, roll);

    this._checkToHitTargets(roll, item, asked);
    this._postRollNotes(this.actor, [...advVs, ...this._bodyAttackNotes(asked), ...tDis.notes, ...this._attackNotes(), ...this._tagNotes(item, TO_HIT_NOTES), ...this._stormNotes(item), ...this._followUpNotes(item)]);
    // A condition the weapon inflicts - a creature attack's declared effect,
    // or a PC weapon's Entangling / Blinding tag (2026-09-16).
    this._postConditionCards(creatureFlagsOf(item).applies ?? [], item.name);

    if(!usageDieOf(item).die) return;

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
    // The weapon's refill sentence since Implants, Exotica and Figments chunk 3b-ii.
    const spec = reloadOf(item);
    if(!spec) return;
    const { item: kind, count } = spec;
    // Only a SPENT die reloads: a Ud4 is either full or gone, so a loaded one
    // has nothing to top up (the sheet control is always shown).
    if(usageDieOf(item).die !== "expended")
      return ui.notifications.info(`The ${item.name} is still loaded (${usageDieOf(item).die}).`);
    const have = rationTotal(actor, kind);
    if(have < count)
      return this._postWoundMsg(actor, `cannot reload the <b>${item.name}</b> — it needs ${count} ${kind}s and they have ${have}.`);
    const ok = await Dialog.confirm({ title: `Reload: ${item.name}`,
      content: `<p>The <b>${item.name}</b> is spent. Reload it with ${count} ${kind}s (${have} carried)?</p>` });
    if(!ok) return;
    for(let i = 0; i < count; i++) await spendRation(actor, kind);
    const size = usageDieOf(item).max;
    await item.update({ "system.usageDie.die": size });
    this._postWoundMsg(actor, `reloads the <b>${item.name}</b> with ${count} ${kind}s — its usage die is back to ${size}.`);
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
  /**
   * GM Effect Builder chunk 1 (2026-10-05): the generic Use control. One use
   * runs at once; several ask which, one button each. Everything after the
   * choice is the interpreter's - item state, cost, gates, the verb's mode.
   */
  _onEffectUse(item)
  {
    const uses = effectUses(item);
    if(!uses.length) return;
    if(uses.length === 1) return runUse(this.actor, item, uses[0].s);
    const buttons = {};
    uses.forEach(({ s }, i) => buttons[`e${i}`] = { label: sentenceLabel(s), callback: () => runUse(this.actor, item, s) });
    new Dialog({ title: `Use ${item.name}`, content: "<p>Which effect?</p>", buttons, default: "e0" }).render(true);
  }

  _onGiftUse(item)
  {
    // Mind Shield (work-queue item 10.3.10): "Cannot use Mystic Gifts" is a
    // real restriction, not flavor — blocked here rather than left as a
    // reminder, since this is the single entry point every Gift-use click
    // routes through. Only blocks while actually worn, same as every other
    // armorType effect in this codebase.
    // Its forbid sentence since Implants, Exotica and Figments chunk 2
    // (2026-10-06): worn, not suppressed (body.js bodyForbids).
    const hasMindShield = bodyForbids(this.actor, "use-gift").length > 0;
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
    // From the passive sentences in force since Weapon Tags chunk 5a.
    const suppressor = activePassives(this.actor, { verb: "forbid" }).find(p => p.sentence.do.what === "use-gift")?.item;
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
    // Effect Engine: Interpreter and Mystic Gifts, chunk 3 (RULED 2026-10-05):
    // the uses are the Gift's sentences - its own vaarn.effects, or an old
    // effect list read through the translator - and "Other use" is the
    // built-in OTHER_USE sentence (ruling B), so every use runs through the
    // interpreter.
    const uses = useSentences(item);
    if(!uses.length) return this._openGiftCostDialog(item, OTHER_USE);
    const choices = {};
    uses.forEach(({ s }, i) => choices[`e${i}`] = { label: sentenceLabel(s), callback: () => this._openGiftCostDialog(item, s) });
    choices.other = { label: "Other use", callback: () => this._openGiftCostDialog(item, OTHER_USE) };
    new Dialog({ title: `Use ${item.name}`, content: "<p>How is the Gift being used?</p>", buttons: choices, default: "e0" }).render(true);
  }

  /**
   * The HP cost dialog - the handler for a Gift sentence's hp cost of the
   * chosen die (Interpreter chunk 3). `sentence` is the chosen use, or
   * OTHER_USE for a freeform one.
   */
  _openGiftCostDialog(item, sentence)
  {
    const freeform = sentence === OTHER_USE;
    const options = optionsOf(sentence);
    const verbs = options.map(o => o.verb);
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
          html.find('[name="gift-sustained"]').is(":checked"), sentence)
      };

    // Mystic Gift Effect Modelling (2026-09-29): for an effect that is not
    // damage or healing, the targets' combined Level picks the default die -
    // any die can still be chosen, and the Referee has the final say.
    const rolled = verbs.every(v => v === "damage" || v === "heal");
    const targets = Array.from(game.user?.targets ?? []);
    const levels = targets.reduce((n, t) => n + levelOf(t.actor), 0);
    const byLevel = rolled ? null : costDieForLevels(levels);
    const label = sentenceLabel(sentence);
    const intro = freeform
      ? `<p>Choose the HP cost die. <b>To damage or heal</b>, pick the effect you want: the die you pay is the die you roll, plus PSY. <b>For any other effect</b>, pick by the targets' combined Level (nine Level 1 targets cost a d20). The Referee has the final say; the baseline is d6.</p>`
      : rolled
        ? `<p><b>${label}</b>: choose the die - you pay it in HP and roll it, plus PSY, as the ${verbs[0] === "damage" ? "damage" : "healing"}. The Referee has the final say.</p>`
        : `<p><b>${label}</b>: the cost is set by the targets' combined Level${byLevel ? ` - <b>${levels}</b>, so ${byLevel.replace("1", "")} is picked` : " (nothing is targeted, so pick by the Level of whoever it is used on)"}. The Referee has the final say; the baseline is d6.</p>`;

    new Dialog(
    {
      title: `Use ${item.name}`,
      content: `${intro}
        <p><label><input type="checkbox" name="gift-sustained"> <b>Sustained</b> — hold the Gift, paying the same die again for each ten-minute period it stays active.</label></p>`,
      buttons,
      default: byLevel ?? "1d6"
    }).render(true);
  }

  async _resolveGiftUse(item, dieFormula, faces = 0, sustained = false, sentence = OTHER_USE)
  {
    const actor = this.actor;

    // Effect Engine: Interpreter and Mystic Gifts, chunk 3 (RULED 2026-10-05):
    // the use runs through the interpreter - the cost paid at the chosen die,
    // one roll of die + PSY, then the sentence's verb: damage or healing as
    // the effect card (the old Gift card's rules, Psychic Mirror included),
    // a condition or named effect as one Apply card per target until the
    // Referee ends it, prose as a chat line. Gifts always hit: no save.
    const result = await runUse(actor, item, sentence, { costDie: dieFormula, sustained });
    if(result.refused) return;

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

    // What the equation does, from the Codex's sentences (Remaining Sources
    // chunk 2a, RULED 2026-10-07): a known equation's through the codex
    // translator, a GM's own where the Item carries them. A Codex that says
    // nothing - a custom/homebrew equation name - falls back to the item's own
    // description; the INT-save resolution below applies either way, since
    // it's keyed off the reader, not the equation.
    const known = codexOf(item);
    const equationName = item.system.equation || item.name;
    const rawEffect = known?.words ?? (item.system.description || "(no effect text set on this codex)");

    if(!known && !item.system.equation && !item.system.description)
    {
      ui.notifications.warn(`${item.name} has no equation or description set — set one on the item first.`);
      return;
    }

    const intBonus = actor.system.abilities.int.effective;
    const roll = this._rollD20(intBonus, `Read ${item.name}`, event, ...this._ownSaveMods("int"));
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
      // The d20 picks the mishap from the table; what it does is its sentences (chunk 2a).
      const mishap = MISHAPS[mishapRoll.total - 1];
      const said = mishapOf(mishap.name);
      mishapRoll.toMessage({speaker: ChatMessage.getSpeaker({actor}), flavor: `Hypergeometric Mishap roll`});
      this._postWoundMsg(actor, `<b>Mishap: ${mishap.name}</b> — ${substituteINT(said?.words ?? mishap.effect, intBonus)}`);
      // Planeyfied declares its [INT] days of flatness (2026-09-21), resolved
      // exactly as an equation's applies is above.
      if(said?.applies)
      {
        const a = { ...said.applies };
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

  /**
   * A Bloomboon's grow sentence (Consumables chunk 3b, 2026-10-06): its spec, in
   * the table row's shape the growth and retainer code take - { name, effect,
   * grows } or { name, effect, retainers } - named by the variant.
   */
  async _bloomboonGrow(item, params, sentence)
  {
    const { verb, handler, retainers, ...grows } = params ?? {};
    const boon = { name: sentence?.tag ?? item.system?.variant ?? item.name, effect: sentence?.text ?? "" };
    if(retainers) return this._raiseRetainers({ ...boon, retainers });
    return this._growBloomboon({ ...boon, grows });
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
  async _hourlyHeal(actor, formula, flavor, verb, gateLabel)
  {
    if(blocksHealing(actor, gateLabel)) return;
    const roll = new Roll(formula);
    roll.evaluate({async: false});
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
    // The one heal path (Shared Pipelines chunk 3), ungated: gated above.
    const { gained, after, note } = await heal(actor, roll.total, { gate: false });
    this._postWoundMsg(actor, gained > 0
      ? `${verb} — restores <b>${gained}</b> HP${gmHP(actor, ` (now ${after}/${actor.system.health.max})`)}.${note}`
      : note
        ? `${verb} — restores no HP.${note}`
        : `${verb}, but is already at full HP.`);
  }

  /**
   * A mutation's or an ancestry rule's use control - Effect Engine: Mutations
   * and Ancestry Rules, chunk 4 (CHUNK 4 RULED 2026-10-06 by Matt). The Item's
   * use sentence runs through the interpreter, which settles its gates (the
   * daylight question), pays its cost (Ink Ducts' and Gas Glands' daily pool),
   * posts its targets' save cards (Gas Glands, Ink Ducts, Silk Production) or
   * runs its named handler (body-uses.js). Nothing here names an Item.
   */
  _onBodyUse(item, event)
  {
    // Implants and figments since Implants, Exotica and Figments chunk 3a
    // (2026-10-06): the self-saves, the Trauma-Response Rig's daily pool, the
    // Voxbox's d8, Solar Scaling's hour, the Nerves' snare.
    const uses = useSentences(item).filter(({ s }) => !s.baked);
    if(!uses.length) return ui.notifications.warn(`${item.name} has no use the system resolves.`);
    return runUse(this.actor, item, uses[0].s, { event });
  }

  /**
   * The ancestry one-offs a use sentence names by handler (body-uses.js):
   * Ambusher, Inheritor, Worm Wise, Repairs, Spores and Bloomboons, each its
   * own behaviour, so nothing to factor out beyond the routing. Twice Born and
   * Photosynthesis left for the shared self-save and hourly-heal handlers in
   * chunk 4.
   *
   * - Spores: a real CON save, plus the once-per-day lockout the rule
   *   describes. Modelled on _onCodexRead's hypergeometricLockout exactly,
   *   including being cleared by hand from the sheet.
   * - Bloomboons: the boon's table entry says what it does - a save, a hold,
   *   a growth, retainers - else it is resolved by hand.
   */
  _ancestryOneOff(handler, item, event)
  {
    const actor = this.actor;
    const variant = item.system.variant;

    // Ambusher and Worm Wise - the Faa Nomad's two rules in JADE IBIS, which
    // replaced Worm Rider (RULED 2026-09-21, Matt). The roll is made here so
    // the Jinx reaches it; what it means is ancestry-rule-effects.js's.
    if(handler === "ambusher")
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
    if(handler === "inheritor")
    {
      const machine = Array.from(game.user?.targets ?? [])[0]?.actor ?? null;
      const ego = actor.system.abilities.ego.effective;
      const roll = this._rollD20(ego, "Inheritor — opposed EGO Save", event);
      const out = inheritorOutcome(roll.total, roll.dice[0].total, machine);
      this._postWoundMsg(actor, out.text);
      return;
    }
    if(handler === "worm-wise")
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
    if(handler === "repairs")
    {
      repair(actor).then(result =>
      {
        if(result?.branch !== "wound") return;
        this._promptRepairWound(actor, result.wounds);
      });
      return;
    }

    if(handler === "spores")
    {
      if(actor.system.sporeLockout)
      {
        this._postWoundMsg(actor, "has no spores left to release today.");
        return;
      }

      const conBonus = actor.system.abilities.con.effective;
      const roll = this._rollD20(conBonus, `Release ${variant || "Spores"}`, event, ...this._ownSaveMods("con"));
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

    // A Bloomboon's use is its variant's sentence since Effect Engine: Consumables
    // chunk 3b (RULED 2026-10-06, Matt): the save cards, Mirrored Leaves' save,
    // Vampiric Roots' hold and the growth run through the interpreter. Only a
    // Bloomboon with no use of its own reaches the rule's handler here.
    if(handler === "bloomboons")
    {
      this._postWoundMsg(actor, `draws on <b>${variant || "their Bloomboon"}</b> — resolve its effect by hand.`);
      return;
    }
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
  async _implantOneOff(handler, item, event)
  {
    const actor = this.actor;

    // Magnetised Palms (Synthetic Mind Magnetic Damage, RULED 2026-09-28 by
    // Matt): generating the field is a magnetic field for a nearby Synth, so
    // the card carries the same d6-INT-each-round button as the Magneticrab
    // and the Orb. Sticking to metal stays text (ruled 2026-09-27).
    if(handler === "magnetised-palms")
    {
      import("../combat/metal-cards.js").then(({ synthMindButton }) =>
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
          content: `<p><b>${actor.name}</b> generates a powerful magnetic field with <b>Magnetised Palms</b>, and can stick to metallic objects.</p>`
            + synthMindButton(`${actor.name}'s Magnetised Palms`) }));
      return;
    }

    // Berserker StimRig — work-queue item 10.8 (2026-08-27). Fiction-locked
    // toggle: a stimulant injection isn't something a character can
    // consciously switch off, so there is deliberately NO deactivate path
    // here at all — the only way it ends is the triggering combat ending
    // (see knave.js's deleteCombat hook). Activating requires an active
    // combat (Matt's ruling, same gate Berserker Brew uses below).
    if(handler === "berserker-stimrig")
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
      await actor.setFlag("vaarn", "berserkerActive", "melee");
      // ON THE BOARD (Shared Pipelines chunk 6, RULED A 2026-10-05): the entry
      // ends with the combat and clears the flag - by any path, so removing it
      // by hand ends the frenzy too.
      await addEntry(actor, { name: "Berserk (melee)", text: "Double melee damage dealt and received.",
        note: "from the Berserker StimRig", endsWithCombat: true, clearFlag: "vaarn.berserkerActive" });
      this._postWoundMsg(actor, `activates their <b>Berserker StimRig</b> — battle madness overtakes them! Double melee damage dealt and received until combat ends.`);
      return;
    }

    // Trauma-Response Rig: its once-a-day is the interpreter's per-day cost,
    // spent before this runs (Implants, Exotica and Figments chunk 3a).
    if(handler === "trauma-rig")
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
    const roll = this._rollD20(score, `${spec.ability.toUpperCase()} Save — ${item.name}`, event, ...this._ownSaveMods(spec.ability));
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

    // Elixir Brewing / Antidotes (2026-09-19). An antidote is not on the sample
    // table and has its own rule: it cures the Toxin Die it is rated for, and is
    // kept when it cannot.
    const antidoteDie = antidoteDieOf(item.name);
    if(antidoteDie) return this._useAntidote(item, antidoteDie);

    // AN ELIXIR IS DRUNK THROUGH ITS USE SENTENCE since Effect Engine:
    // Consumables chunk 3a (RULED 2026-10-06, Matt): the interpreter settles its
    // gates (Berserker Brew's started combat), runs its handler - the branch
    // _elixirOneOff names - and spends the vial unless the handler kept it. The
    // chain of roster lookups that stood here is gone.
    const drink = elixirDrinkOf(item);
    // The control asked the Referee about attunement first (_attunementRefuses), so a
    // drink the Referee allowed is not refused again (found in Group 555).
    if(drink) return runUse(actor, item, drink, { attunementChecked: true });
  }

  /**
   * An Elixir's drink, by its sentence's handler - Effect Engine: Consumables
   * chunk 3a (RULED 2026-10-06, Matt). Each branch is the code the drink had,
   * its figures now the sentence's, its chat line word for word (ruling 4).
   * Answers { keep: true } when the vial was not drunk (a refusal), so the
   * interpreter does not spend it.
   */
  async _elixirOneOff(handler, item, params, sentence)
  {
    const actor = this.actor;
    const kept = () => ({ keep: !!actor.items.get(item.id) });
    const { verb, handler: _h, ...spec } = params ?? {};
    const post = (a, msg) => this._postWoundMsg(a, msg);

    if(handler === "grant-ability")
    {
      const elixir = elixirGranting(item.name);
      // Berserker Brew (2026-08-27; its started-combat gate is the sentence's since
      // chunk 3a, ruling 2). "all", not melee: the Brew's own text is "They deal
      // and receive double damage" with no melee clause. Elixir-Granted Ability
      // Item, RULED 2026-09-23 (Matt): the Brew's granted ability is the way OUT -
      // the EGO save to exit the frenzy. The board entry (Shared Pipelines chunk
      // 6) takes it and the flag at combat end; a success removes the entry itself.
      if(spec.use === "endFrenzy")
      {
        await actor.setFlag("vaarn", "berserkerActive", "all");
        const exit = await grantAbility(actor, elixir);
        await addEntry(actor, { name: "Berserk", text: "Double damage dealt and received, melee or ranged. Must always attack the closest living being.",
          note: "from Berserker Brew", endsWithCombat: true, clearFlag: "vaarn.berserkerActive", grantedItemIds: exit ? [exit.id] : [] });
        await item.delete();
        this._postWoundMsg(actor, `drinks <b>Berserker Brew</b> and flies into a battle frenzy — double damage dealt and received, melee or ranged, until combat ends. Must always attack the closest living being. <i>(<b>${exit.name}</b> on the sheet rolls the EGO Save that ends it.)</i>`);
        return kept();
      }
      // An Elixir whose drinker makes somebody ELSE save - Glittercough Tonic,
      // Puppeteer Potion (Compel-a-Target Save, 2026-09-22). Elixir-Granted
      // Ability Item (2026-09-23): the save cards moved from the drink to the
      // USE of the Item it grants. Glittercough's Item is single-use;
      // Puppeteer's carries its own 4-turn span on the board, whose end removes
      // the Item.
      if(elixir?.save)
      {
        const granted = await grantAbility(actor, elixir);
        if(elixir.grants.span)
          await activateRoundEffect(item, {
            rounds: this._resolveDurationToken(elixir.grants.span.amount),
            unit: elixir.grants.span.unit,
            grantedItemId: granted.id
          });
        this._postWoundMsg(actor, `drinks <b>${item.name}</b> — ${elixir.effect} `
          + `<i>(grants <b>${granted.name}</b> on the sheet${elixir.grants.singleUse ? ", once" : elixir.grants.span ? ` for ${elixir.grants.span.amount} ${elixir.grants.span.unit === "turn" ? "Exploration Turns" : elixir.grants.span.unit + "s"}` : ""})</i>`);
        await item.delete();
        return kept();
      }
      // A span that grants an ability (Windsong, Magnetic Draw): the board entry carries it.
      await this._useDurationElixir(item, {});
      return kept();
    }
    if(handler === "stateful") { await this._useDurationElixir(item, spec); return kept(); }

    // An Elixir that SETS the drinker's HP - Death Draught, "immediately reduced
    // to 0 HP". RULED 2026-09-23 (Matt): through the normal HP pipeline, so
    // whatever 0 HP already triggers runs as it would from a blow, and the vial
    // is used up. A SET, not damage (Shared Pipelines chunk 2, 2026-10-05): to 0
    // it is a set-to-zero death, which clears temp HP. THE ONE KILL ROUTE since
    // chunk 4 (2026-10-05).
    if(handler === "set-hp")
    {
      this._postWoundMsg(actor, `drinks <b>${item.name}</b> — ${sentence?.text ?? ""}`);
      await item.delete();
      if(Number(spec.amount) < actor.system.health.value) this._kill(actor);
      return kept();
    }
    // Character Split/Clone (2026-09-18, 2026-09-24): a second Actor, not a delta.
    if(handler === "bifurcate") { await bifurcate(item, post); return kept(); }
    if(handler === "clone") { await cloneFromElixir(item, post, spec); return kept(); }
    if(handler === "spawn") { await this._useSpawnElixir(item, { creature: spec.creature, dice: spec.count, loyal: spec.loyal }); return kept(); }
    if(handler === "grant-pick") { await this._usePickElixir(item, spec); return kept(); }
    if(handler === "grant-roll") { await this._useGeneratorElixir(item, spec); return kept(); }
    if(handler === "baked-item") { await this._useBakedItemElixir(item, { name: spec.item, slotBonus: spec.slotBonus }, sentence?.text ?? ""); return kept(); }
    if(handler === "grant-fixed") { await this._useFixedGrantElixir(item, { type: spec.type, name: spec.name, text: spec.giftText }); return kept(); }
    if(handler === "permanent-change") { await this._usePermanentChangeElixir(item, spec); return kept(); }
    if(handler === "permanent-ability") { await this._usePermanentAbilityElixir(item, spec); return kept(); }
    ui.notifications.warn(`${item.name}: no elixir handler "${handler}".`);
    return { keep: true };
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
  async _useFixedGrantElixir(item, spec)
  {
    const actor = this.actor;
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
  async _useSpawnElixir(item, spec)
  {
    const actor = this.actor;
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
  async _usePickElixir(item, spec = {})
  {
    const actor = this.actor;
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
  async _useBakedItemElixir(item, spec, effect)
  {
    const actor = this.actor;
    const before = Number(actor.system.inventorySlots?.max ?? 20);
    const [granted] = await actor.createEmbeddedDocuments("Item", [{
      name: spec.name,
      type: "item",
      system: {
        slots: 0,
        intrinsic: true,
        description: `<p>Granted by <b>${item.name}</b>: ${effect}</p>`
      }
    }]);
    // Live since Stats as Sentences chunk 2d-ii: the slots count from the
    // moment the Item exists, so the ceiling is read straight after it.
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
  async _useGeneratorElixir(item, spec = {})
  {
    const actor = this.actor;
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
  async _usePermanentChangeElixir(item, spec = {})
  {
    const actor = this.actor;

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
  async _usePermanentAbilityElixir(item, spec = {})
  {
    const actor = this.actor;
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
  // `opts` is the stateful sentence's do (Consumables chunk 3a): its bundle, and
  // asText / act for a drink the table adjudicates.
  async _useDurationElixir(item, opts = {})
  {
    const actor = this.actor;
    const text = item.system?.description || item.system?.effect || "";
    const span = declaredSpanOf(item);

    // Stateful Effect Application (2026-09-09). Resolved BEFORE the entry is
    // created and before the Item is deleted, because a multiplier reads the
    // actor as it stands at the moment of drinking. What gets stored is the
    // flat number that produced, so the reversal is independent of anything
    // that happens during the span.
    const { verb, handler, asText = false, act = "drinks", ...bundle } = opts;
    const spec = Object.keys(bundle).length ? bundle : null;
    const applied = spec ? resolveStatefulDeltas(actor, spec) : null;
    const drinkAsText = !!asText;
    // Elixir-Granted Ability Item (2026-09-23): a span elixir that grants an
    // ability (Windsong) creates the Item first, so the entry can carry its
    // id and take it back when the span ends.
    const granting = elixirGranting(item.name);
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
        hpTick: elixirHpTick(item.name)
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
    this._postWoundMsg(actor, `${act} <b>${item.name}</b> — ${text}${this._statefulLine(applied)}`
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
   * An Exotica's use - Effect Engine: Implants, Exotica and Figments chunk 3b
   * (2026-10-06). Its use sentence through the interpreter, the attunement
   * question already asked by the control: the usage-die roll or the charge,
   * the use's line, the save cards, the lasting effect or the named one-off.
   */
  _onExoticaSentenceUse(item, event)
  {
    const uses = useSentences(item).filter(({ s }) => !s.baked);
    if(!uses.length) return ui.notifications.warn(`${item.name} has no use the system resolves.`);
    return runUse(this.actor, item, uses[0].s, { event, attunementChecked: true });
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
   *
   * A HEAL DIE, 2026-10-04 (Generated Gear and Attacks as Items, RULED by
   * Matt: Medicinal Gourds' "d8 heal", shared with the Medgel's "D10 Heal"). An
   * Item declaring flags.vaarn.useHeal heals its USER by that roll, through
   * applyHeal - so Deprived and never-healing refuse it, as every HP gain. The
   * unit is spent either way: it was eaten.
   */
  async _onConsumableUse(item)
  {
    const healDice = remainingItemFlagsOf(item).useHeal;
    if(healDice)
    {
      const roll = await new Roll(healDice).evaluate({ async: true });
      const line = await applyHeal(this.actor, roll.total, `the <b>${item.name}</b>`);
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `<b>${item.name}</b> — heal ${healDice}${line ? `: ${this.actor.name} ${line}` : ""}` });
    }
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
   * The Exotica one-offs a use sentence names by handler (Implants, Exotica and
   * Figments chunk 3b, 2026-10-06) - each its own behaviour, kept as it was,
   * its figures from the sentence rather than the roster. Returns { keep: true }
   * when the use did not happen, so the charge stays (a refused drink).
   */
  async _exoticaOneOff(handler, item, params, event)
  {
    const actor = this.actor;
    const targets = () => Array.from(game.user?.targets ?? []);

    // Autarch's Nectar: three different Abilities, refused to a drinker without the type.
    if(handler === "permanent-ability")
      return { keep: !(await this._useExoticaPermanentAbility(item, params)) };
    if(handler === "field-generator") return useFieldGenerator(actor, item.name, params, params.span);
    if(handler === "blue-rust")
    {
      for(const t of targets()) postCorrosionCard(actor, item, t, "rust");
      if(!targets().length)
        return this._postWoundMsg(actor, `<b>${item.name}</b>: no target is selected, so nothing was started.`);
      return this._startAbilityTicks([{ ability: params.ability, dice: params.dice, targets: params.targets, source: item.name }], targets());
    }
    if(handler === "body-change") return this._applyBodyChange(item, params);
    if(handler === "metal-pull") return postMetalReachCard(actor, item.name, params);
    // A Bloomboon's hold (Vampiric Roots, Consumables chunk 3b) is titled by its variant.
    if(handler === "hold") return this._holdTargets(item.type === "ancestry" ? (item.system?.variant || item.name) : item.name, params);
    if(handler === "save-gated") return this._onSaveGatedUse(item, event);
    if(handler === "combat-av") return this._activateCombatAv(item, params);
    if(handler === "combat-auto-hit") return this._activateCombatAutoHit(item, params);
    if(handler === "universal-ration")
    {
      if(blocksHealing(actor, "the Universal Ration"))
      {
        this._postWoundMsg(actor, `eats the <b>Universal Ration</b> — consumed, but no HP is restored.`);
        return item.delete();
      }
      const { gained, after, note } = await heal(actor, actor.system.health.max, { gate: false });
      if(!note)
        this._postWoundMsg(actor, `eats the <b>Universal Ration</b> — HP restored to maximum. This does NOT remove any Wounds; heal those separately from the Wounds tab.`);
      else
        this._postWoundMsg(actor, `eats the <b>Universal Ration</b> — restores <b>${gained}</b> HP${gmHP(actor, ` (now ${after}/${actor.system.health.max})`)}.${note} This does NOT remove any Wounds; heal those separately from the Wounds tab.`);
      return item.delete();
    }

    if(handler === "amaranthine-sugar")
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
    if(handler === "cybernetics-capsule")
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

    if(handler === "belligerent-paste")
    {
      const { name, type, system, flags, altForm } = await rollWeapon("Exotic");
      const [created] = await actor.createEmbeddedDocuments("Item", [{ name, type, system: { ...system, attuned: true }, flags }]);
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
    const saves = creatureFlagsOf(item).save ?? [];
    const applies = creatureFlagsOf(item).applies ?? [];
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
  async _applyBodyChange(item, spec)
  {
    // The sentence's figures since Implants, Exotica and Figments chunk 3b.
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
      const held = victim.items.find(i => remainingItemFlagsOf(i).bodyChange?.source === item.name);
      const before = (held ? remainingItemFlagsOf(held).bodyChange : null) ?? { source: item.name, av: 0, abilities: {} };
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

  async _activateCombatAv(item, spec)
  {
    // The sentence's figure since Implants, Exotica and Figments chunk 3b; the
    // interpreter's in-combat gate has already refused a use outside a combat.
    const av = Number(spec?.av ?? 0);
    if(!av) return;
    await this.actor.setFlag("vaarn", "combatAv", { source: item.name, av });
    await addEntry(this.actor, { name: `${item.name}: +${av} AV`, text: spec.note ?? "",
      note: `from the ${item.name}`, endsWithCombat: true, clearFlag: "vaarn.combatAv" });
    this._postWoundMsg(this.actor, `activates the <b>${item.name}</b> — <b>+${av} AV</b> until combat ends. `
      + `<i>${spec.note ?? ""}</i>`);
  }

  /**
   * The Ultravisor's 'when the visor is activated, any attack the wearer makes
   * with a ranged weapon automatically hits' - Implants, Exotica and Figments
   * ruling C 10 (RULED 2026-10-06): until the combat ends, as the Active
   * Camouflage Ring's AV. A flag the attack reads (_attackQuestions), cleared
   * with its board entry.
   */
  async _activateCombatAutoHit(item, spec)
  {
    await this.actor.setFlag("vaarn", "autoHitAttacks", spec?.attackKind ?? "ranged");
    await addEntry(this.actor, { name: `${item.name}: ${spec?.attackKind ?? "ranged"} attacks auto-hit`,
      text: "Skip the to-hit roll and roll damage.", note: `from the ${item.name}`, endsWithCombat: true, clearFlag: "vaarn.autoHitAttacks" });
    this._postWoundMsg(this.actor, `activates the <b>${item.name}</b> — every ${spec?.attackKind ?? "ranged"} attack auto-hits until combat ends.`);
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
    const spec = creatureFlagsOf(item).activity;
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
      // From the sentences since Weapon Tags chunk 5a: a weapon that forbids its own unequipping.
      if(itemForbids(item, "unequip"))
      {
        // Moonbeast Carapace refuses too since Implants, Exotica and Figments
        // ruling C 4 (2026-10-06): its own words, not the Parasitic tag's.
        if(item.type === "weaponMelee" || item.type === "weaponRanged")
          ui.notifications.warn(`${item.name} is Parasitic and fused to ${actor.name} — it cannot be unequipped without surgery.`);
        else
          ui.notifications.warn(`${item.name} cannot be unequipped — ${sentencesOf(item).find(s => s.do?.verb === "forbid" && s.do.what === "unequip")?.text ?? "it cannot be removed"}`);
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
    const polymorphicPairName = remainingItemFlagsOf(item).polymorphicPairName;
    if(polymorphicPairName)
    {
      const sibling = actor.items.find(i => i.id !== item.id && i.name === polymorphicPairName);
      if(sibling?.system.equipped) await sibling.update({"system.equipped": false});
    }

    // From the body's sentences since Mutations and Ancestry Rules chunk 2a
    // (2026-10-05): a suppressed mutation no longer forbids (ruling D).
    const forbidden = (what) => bodyForbids(actor, what)[0] ?? null;

    if(item.type === "weaponMelee" || item.type === "weaponRanged")
    {
      // `?? 1` for the same reason actor.js:150 uses it - see the comment
      // there. This is the CHECK side of the same rule and has to agree with
      // the accounting side: with `|| 1` here the gate would demand a free
      // hand to equip a body part that the budget then charges nothing for.
      const needed = Number(statOf(item, "hands") ?? 1);
      if(needed >= 2 && forbidden("wield-two-handed"))
      {
        ui.notifications.warn(`${actor.name} cannot use two-handed weapons - ${forbidden("wield-two-handed").source}.`);
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
      // From the sentences since Weapon Tags chunk 5a: an equip forbidden
      // while an ability is below a threshold. The highest threshold names
      // the refusal, as Colossal's +6 was checked before Heavy's +3.
      const blocked = equipForbids(item)
        .filter(s => (s.if ?? []).every(g => computeGate(g, { actor }) === true))
        .sort((x, y) => (y.if?.[0]?.is?.below ?? 0) - (x.if?.[0]?.is?.below ?? 0))[0];
      if(blocked)
      {
        const t = blocked.if?.[0]?.is ?? {};
        const ability = String(t.ability ?? "str");
        ui.notifications.warn(`${actor.name} needs +${t.below} ${ability.toUpperCase()} to wield ${item.name} (has ${Number(actor.system.abilities[ability]?.effective)}).`);
        return;
      }
    }
    // A carried Item made equippable (Stats as Sentences chunk 2e-ii): the hands its
    // effect says must be free; wield-two-handed is about weapons and stays theirs.
    else if(item.type !== "armor")
    {
      const needed = Number(statOf(item, "hands") ?? 0);
      const free = actor.system.hands.max - actor.system.hands.used;
      if(needed > free)
      {
        ui.notifications.warn(`${actor.name} doesn't have enough free hands to equip ${item.name} (needs ${needed}, has ${free} free).`);
        return;
      }
    }
    else if(item.type === "armor")
    {
      const slot = armourSlotOf(item);
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
        // The one helmet rule (body.js helmRefusal, ruling D 2026-10-05).
        const equippedCount = actor.items.filter(i => i.type === "armor" && armourSlotOf(i) === "helm" && i.system.equipped).length;
        const refusal = helmRefusal(actor, equippedCount);
        if(refusal)
        {
          ui.notifications.warn(refusal);
          return;
        }
      }
      // Face Armour Slot, RULED 2026-09-27 (Matt): one face item at a time,
      // worn alongside a helm. No mutation gate - the book bars helmets and
      // hats for Headless, Huge Brain and the crests, and never names a mask.
      else if(slot === "face")
      {
        const worn = actor.items.find(i => i.type === "armor" && armourSlotOf(i) === "face" && i.system.equipped);
        if(worn)
        {
          ui.notifications.warn(`${actor.name} is already wearing ${worn.name} — unequip it first.`);
          return;
        }
      }
      else // "body"
      {
        if(forbidden("wear-body-armour"))
        {
          ui.notifications.warn(`${actor.name} cannot wear other armour - ${forbidden("wear-body-armour").source}.`);
          return;
        }
        const equippedCount = actor.items.filter(i => i.type === "armor" && armourSlotOf(i) === "body" && i.system.equipped).length;
        if(equippedCount >= 1)
        {
          ui.notifications.warn(`${actor.name} already has body armor equipped — unequip it first.`);
          return;
        }
      }
    }

    // A Gift on first wear - the Psybernetic Helm's "When worn for the first
    // time, unlocks a random Mystic Gift" (work-queue item 10.3.5). Its on-draw
    // sentence since Implants, Exotica and Figments chunk 3b-ii (2026-10-06); the
    // giftUnlocked flag keeps a 'once' sentence from granting twice.
    const firstWear = sentencesOf(item).find(s => (s.when?.trigger ?? s.when) === "on-draw" && s.do?.verb === "add-gift");
    if(firstWear && !(firstWear.do.once && item.getFlag("vaarn", "giftUnlocked")))
    {
      item.setFlag("vaarn", "giftUnlocked", true);
      this._createRandomGift(actor).then(gift =>
        this._postWoundMsg(actor, `wears the <b>${item.name}</b> for the first time — it unlocks a random Mystic Gift, <b>${gift.name}</b>!`));
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
    // From the sentences since Weapon Tags chunk 5a: what drawing it costs the wielder.
    const drawCost = drawSentences(item).find(s => s.do?.verb === "max-hp");
    if(drawCost)
    {
      const newMax = actor.system.health.max + (Number(drawCost.do.amount) || 0);

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
  /**
   * The questions an attack asks BEFORE its roll - Effect Engine: Weapon Tags
   * chunk 4, RULED 2026-10-05 (Matt). Flaming: is the wielder underwater (yes
   * stops the attack, at no cost), and is each target submerged (yes leaves
   * it out). Heat-Seeking: is each target warm-blooded (a standing question,
   * remembered per creature; default the Biological checkbox). Answers and
   * named defaults come through gates.js. Returns { stop, skip, autoHit }.
   */
  async _attackQuestions(item)
  {
    // autoHit maps each target to WHY it is hit (Remaining Sources chunk 3, 2026-10-07): the
    // hit card names the reason, so the Ultravisor no longer reads as Heat-Seeking.
    const out = { stop: false, skip: new Set(), autoHit: new Map(), bodyAdv: [], bodyDis: [] };
    // The BODY's ADV and DIS on its own attack rolls (Mutations and Ancestry Rules
    // chunk 3, 2026-10-05): Blind's DIS on ranged attacks, and ADV fighting in the
    // dark for Blind and Echolocation (ruling C 8) - the roller asked each roll.
    const body = await this._bodyAttackMods(item);
    out.bodyAdv = body.adv; out.bodyDis = body.dis;
    for(const line of body.lines) this._postWoundMsg(this.actor, `<i>${line}</i>`);
    const forbids = attackForbids(item), autos = autoHitSentences(item);
    // The Ultravisor's activated auto-hit, until the combat ends (Implants,
    // Exotica and Figments ruling C 10): every target of an attack of that kind.
    const kindAuto = remainingActorFlagsOf(this.actor).autoHitAttacks;
    if(kindAuto && kindAuto === (item?.type === "weaponRanged" ? "ranged" : "melee"))
    {
      // The Item that switched it on, from its board entry ("Ultravisor: ranged attacks auto-hit").
      const entry = entriesOf(this.actor).find(e => e.clearFlag === "vaarn.autoHitAttacks");
      const source = entry?.name ? String(entry.name).split(":")[0] : null;
      const reason = { text: `${source ? `the ${source}` : "its activation"} makes every ${kindAuto} attack hit until the combat ends` };
      for(const t of Array.from(game.user?.targets ?? [])) out.autoHit.set(t, reason);
    }
    if(!forbids.length && !autos.length) return out;
    const lines = [];
    const ctx = t => ({ actor: this.actor, target: t, title: item.name });
    for(const s of forbids.filter(x => !(x.if ?? []).some(g => isTargetGate(g))))
    {
      const r = await settleGates(s.if, ctx(null));
      lines.push(...r.lines);
      if(r.pass)
      {
        this._postWoundMsg(this.actor, `cannot use <b>${item.name}</b> — ${s.text ?? "its conditions forbid it"}`);
        out.stop = true;
        break;
      }
    }
    if(!out.stop)
      for(const t of Array.from(game.user?.targets ?? []))
      {
        for(const s of forbids.filter(x => (x.if ?? []).some(g => isTargetGate(g))))
        {
          const r = await settleGates(s.if, ctx(t));
          lines.push(...r.lines);
          if(r.pass) { out.skip.add(t); this._postWoundMsg(this.actor, `cannot use <b>${item.name}</b> against <b>${t.name}</b> — ${s.text ?? "its conditions forbid it"}`); }
        }
        if(out.skip.has(t)) continue;
        for(const s of autos)
        {
          const r = await settleGates(s.if, ctx(t));
          lines.push(...r.lines);
          if(r.pass && !out.autoHit.has(t)) out.autoHit.set(t, { tag: s.tag ?? null, text: s.text ?? null });
        }
      }
    for(const line of lines) this._postWoundMsg(this.actor, `<i>${line}</i>`);
    return out;
  }

  /**
   * The body's ADV and DIS on this attack roll - Mutations and Ancestry Rules
   * chunk 3. Each attack-roll sentence of the attacker's mutations and ancestry
   * rules: its attack-kind gate checked against this weapon, anything else
   * ("in darkness") settled by gates.js, the roller asked. { adv, dis, lines }.
   */
  async _bodyAttackMods(item)
  {
    const out = { adv: [], dis: [], lines: [] };
    const kind = item?.type === "weaponRanged" ? "ranged" : "melee";
    for(const { sentence: s, source } of bodySentences(this.actor, "attack-roll"))
    {
      if(!["adv", "dis"].includes(s.do?.verb) || s.do.on !== "attack") continue;
      const gates = s.if ?? [];
      if(gates.some(g => g.gate === "attack-kind" && !attackKindHolds(g, kind))) continue;
      const rest = gates.filter(g => g.gate !== "attack-kind");
      // A gate about the TARGET (Hushboots' Blind target, Tactical Flaw
      // Analysis' armoured one - Implants, Exotica and Figments chunk 2,
      // 2026-10-06) is settled against the first creature targeted; with none
      // targeted it cannot hold.
      const target = Array.from(game.user?.targets ?? [])[0] ?? null;
      if(rest.some(g => isTargetGate(g)) && !target) continue;
      if(rest.length)
      {
        const r = await settleGates(rest, { actor: this.actor, target, title: `${this.actor.name}: ${source}` });
        out.lines.push(...r.lines);
        if(!r.pass) continue;
      }
      if(!out[s.do.verb].includes(source)) out[s.do.verb].push(source);
    }
    return out;
  }

  /** The chat notes naming the body's ADV and DIS on an attack. */
  _bodyAttackNotes(asked)
  {
    return [...(asked?.bodyAdv ?? []).map(n => `<b>${n}</b> — ADV on this attack (applied).`),
            ...(asked?.bodyDis ?? []).map(n => `<b>${n}</b> — DIS on this attack (applied).`)];
  }

  _effectiveTargetAV(targetActor, attackerItem)
  {
    if(!ignoresArmour(attackerItem))
      return targetActor.system.armor.effective ?? targetActor.system.armor.value;

    // A warding field is not armour: a held weapon's passive AV (Aegis-
    // Bearing's +5) still counts, from the sentences in force (Weapon Tags chunk 4).
    // Any Item but armour since GM Effect Builder chunk 1 (2026-10-05): a
    // field a GM writes on an Exotica wards like Aegis-Bearing; armour's AV
    // is armour, which this attack ignores.
    // Not a body's AV either (mutations, ancestry rules - natural armour, ignored as
    // it was before they were sentences; Mutations and Ancestry Rules chunk 2a).
    const field = activePassives(targetActor, { verb: "modify" })
      // Nor an implant's or a figment's (Implants, Exotica and Figments chunk 2,
      // 2026-10-06) - body plating, ignored as it was before they were sentences.
      .filter(p => p.sentence.do.stat === "av" && !["armor", "mutation", "ancestry", "implant", "figment"].includes(p.item.type))
      .reduce((n, p) => n + (Number(String(p.sentence.do.amount).replace("+", "")) || 0), 0);
    return 10 + field;
  }

  _checkToHitTargets(roll, item, asked = null)
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
    const declaredAutoHit = !roll && !!creatureAttackOf(item).autoHit;
    if(!roll && !declaredAutoHit) return;
    const natural20 = roll?.dice?.[0]?.total === 20;

    // "Hits as if target has -5 AV" - the Titan Acolyte's Vibro-Dagger (Live
    // AV Computation wiring, 2026-09-25). The HIT TEST only, never the target's
    // sheet, and not Mauling's or Piercing's AV band: the book speaks of hitting.
    const avAsIf = Number(creatureAttackOf(item).avAsIf) || 0;

    game.users.current.targets.forEach((x)=>
    {
      // A target this weapon cannot be used against - Flaming against the
      // submerged, answered before the roll (_attackQuestions, Weapon Tags
      // chunk 4) - is neither hit nor missed.
      if(asked?.skip?.has(x)) return;
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
      // From the sentences since Weapon Tags chunk 4: the auto-hit gate
      // (warm-blooded, a STANDING question, defaulting to the Biological
      // checkbox - rulings B and 3) answered before the roll.
      const askedAuto = !naturalHit ? asked?.autoHit?.get?.(x) ?? null : null;
      const heatSeekingSave = !!askedAuto;

      // A 20 that already clears the AV is an ordinary hit and says so; the
      // override only has to rescue one the AV would otherwise refuse, exactly
      // as Heat-Seeking does above.
      const critAutoHit = !naturalHit && natural20;

      // A printed "auto-hit <type> targets" clause on the weapon (Actor
      // Creation from Roll Table, 2026-09-18: the Mercenaries' Tesla Cannon,
      // "auto-hit synth targets"). Heat-Seeking's shape exactly, but declared
      // as a flag naming the creature type, because it is not a tag.
      // From its sentence since Remaining Sources chunk 2c-ii (2026-10-07).
      const autoHitVs = remainingItemFlagsOf(item).autoHitVs;
      const typeAutoHit = !naturalHit && !critAutoHit && !heatSeekingSave
        && !!autoHitVs && !!x.actor.system.creatureTypes?.[autoHitVs];

      if(naturalHit || critAutoHit || heatSeekingSave || typeAutoHit)
      {
        if(critAutoHit) this._createCritAutoHitMsg(x.actor, item);
        else if(heatSeekingSave) this._createAskedAutoHitMsg(x.actor, item, askedAuto);
        else if(typeAutoHit) this._createTypeAutoHitMsg(x.actor, item, autoHitVs);
        else if(declaredAutoHit) this._createDeclaredAutoHitMsg(x.actor, item);
        else this._createHitMsg(x.actor, false, item);
        // A printed chance the attack fails even on a hit (2026-09-18: the
        // Followers' Ancient Grenades, "50% chance to not detonate"). A card
        // with a d100 button, once per target hit, because the book ties it
        // to each throw that lands. The Referee clicks it, so a GM who rolls
        // it some other way is not overruled.
        const fail = remainingItemFlagsOf(item).failChance;
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
          // The bloom's die is its sentence's since Consumables chunk 3c (ruling B).
          const die = floraToxDieOf(item) ?? toxDieOfFormula(statOf(item, "damage-dice"));
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
        if(creatureActorFlagsOf(this.actor).corrodesOnHit) postCorrosionCard(this.actor, item, x);
        // Metal Item Property Part B (RULED 2026-09-27, Matt): the Yurling's
        // bite may devour a metal item INSTEAD of damage - the same card, its
        // devour mode; it says not to roll this hit's damage.
        if(creatureActorFlagsOf(this.actor).devoursMetal) postCorrosionCard(this.actor, item, x, "devour");
        // A NAMED WOUND ON A HIGH HIT - the Scythesliver's "rolls a 20 or
        // higher while attacking, it inflicts a Wound: Severed Limb"
        // (Wound-Table Resolution wiring, RULED 2026-09-25 by Matt: the attack
        // TOTAL). An auto-hit rolls nothing, so it never reaches the figure.
        const woundOnHit = creatureAttackOf(item).woundOnHit;
        // No atTotal: every hit - the Flabmonger's Lipoinduction (2026-09-25).
        if(woundOnHit && roll && (woundOnHit.atTotal == null || roll.total >= woundOnHit.atTotal))
          applyNamedWound(x.actor, woundOnHit.wound, { source: woundOnHit.atTotal == null ? `${this.actor.name}'s ${item.name}` : `${this.actor.name}'s ${item.name} (${roll.total})` });
        // The Sawbone Drone's Surgical Array, resolved per target hit.
        if(creatureAttackOf(item).surgicalArray) resolveSurgicalArray(this.actor, x.actor);
        // CAUSE WOUND (RULED 2026-10-04, Matt): a roll on the Wounds table for a
        // character hit - the total is the negative-HP row, as the Surgical Array's.
        if(creatureAttackOf(item).woundRoll) this._rollWoundOnHit(item, x.actor);
        // DESTROY ITEM (RULED 2026-10-04, Matt: adjudicated only): the d20 names
        // the item in that slot for the Referee; nothing is deleted.
        if(creatureAttackOf(item).destroyItemRoll) this._rollDestroyItemOnHit(item, x.actor);
        // Hit-Count Progression (RULED 2026-09-27, Matt): the Desiccator's
        // Desiccate - the stage for this target's hit count, applied now.
        if(creatureAttackOf(item).hitProgression)
          applyHitProgression(this.actor, item, x, { applyAbilityDamage: (specs, t) => this._applyAbilityDamage(specs, t) });
        for(const t of tagSaveSpecsOf(item))
        {
          const saves = t.saves.filter(s => !s.actorTypes || s.actorTypes.includes(x.actor.type));
          // The condition a failure applies comes with the save, from the
          // sentence (Weapon Tags chunk 3); tagApplies stays for anything else.
          if(saves.length) postSaveCard(this.actor, `${item.name} (${t.source})`, saves, [], { token: x, applies: t.applies ?? tagApplies([t.source]) });
        }
        this.#_hitTargets.add(x);
        if(isMelee) this._checkRetaliationMutations(x.actor, true, item);
      }
      else
      {
        this._createHitMsg(x.actor, true, item);
        if(isMelee) this._checkRetaliationMutations(x.actor, false, item);
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

  /**
   * An asked auto-hit's card, saying why (Remaining Sources chunk 3, 2026-10-07):
   * Heat-Seeking in its own words; any other source - the Ultravisor's activation,
   * a GM's auto-hit sentence - its reason. Every asked auto-hit used to read as
   * Heat-Seeking.
   */
  _createAskedAutoHitMsg(targetActor, item, reason = null)
  {
    ChatMessage.create({ user: game.user._id, speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: askedAutoHitLine(item.name, targetActor.name, reason) });
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
    // Its stages from its sentences since Wounds and Afflictions chunk 4 (2026-10-06).
    const entry = afflictionByKey(key) ? afflictionOverTimeOf(this.actor, key) : null;
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
    if(!creatureActorFlagsOf(limb).boundToHost) return;
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

    // A held weapon whose sentences strike a miss back (Weapon Tags chunk 4).
    const hasReflecting = defenderActor.items.some(i =>
      (i.type === "weaponMelee" || i.type === "weaponRanged") &&
      i.system.equipped && reflectsMisses(i));
    if(!hasReflecting) return;

    const attackerActor = this.actor;
    // A formula that reads an actor value (Damage Read from an Actor Value,
    // 2026-09-21) is resolved to numbers HERE: the button's handler in
    // knave.js rolls the string with no roll data, and "@lvl" there would not
    // roll. The defender is the one the attack was aimed at, so it is the
    // target a target-reading formula reads.
    const valueRead = actorValueRollData(statOf(attackerItem, "damage-dice"), attackerActor, [defenderActor], attackerItem.name);
    const reflectDice = valueRead.data
      ? Roll.replaceFormulaData(statOf(attackerItem, "damage-dice"), valueRead.data)
      : statOf(attackerItem, "damage-dice");

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: defenderActor }),
      content: `<p><b>${defenderActor.name}</b>'s Reflecting weapon punishes <b>${attackerActor.name}</b>'s missed attack — click to deal the reflected damage!</p>
        <button type="button" class="vaarn-reflect-damage" data-attacker-id="${attackerActor.id}" data-defender-id="${defenderActor.id}" data-item-uuid="${attackerItem.uuid ?? ""}" data-damage-dice="${reflectDice}" data-weapon-name="${attackerItem.name}">Roll Reflected Damage</button>`
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
  _checkRetaliationMutations(targetActor, hit, item = null)
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
    // THE BODY'S RETALIATION SENTENCES since Mutations and Ancestry Rules chunk 3
    // (2026-10-05): the target's when-hit and when-missed damage on its attacker,
    // not suppressed (bodySentences). Gates: melee (every caller is melee), and a
    // bite (Toxic Flesh, ruling C 10 - the Ickbulb's BITE_WORDS on the weapon).
    const level = Number(targetActor.system.level?.value ?? 0);
    const retaliations = bodySentences(targetActor, hit ? "when-hit" : "when-missed")
      .filter(({ sentence: s }) => s.do?.verb === "damage" && (s.target?.who ?? s.target) === "attacker")
      .filter(({ sentence: s }) => (s.if ?? []).every(g =>
        g.gate === "attack-kind" ? attackKindHolds(g, "melee")
        : g.gate === "attack-is-bite" ? BITE_WORDS.some(w => String(item?.name ?? "").toLowerCase().includes(w))
        : false));

    // On a hit, each rolls its own dice (Acid Blood's d4 corrosive, Toxic Flesh's
    // d8 TOX). THROUGH THE WHOLE PIPELINE (Shared Pipelines chunk 2), from the
    // retaliating creature onto the attacker, so its immunities and temp HP apply.
    if(hit)
      for(const { sentence: s, source } of retaliations)
      {
        const r = new Roll(String(s.do.dice).replace(/@level/g, String(level)));
        r.evaluate({async: false});
        r.toMessage({speaker: ChatMessage.getSpeaker({ actor: targetActor }), flavor: `<b>${source}</b> strikes back at ${this.actor.name}`});
        dealDamage(this.actor, r.total, { source: targetActor, types: [s.do.type ?? "kinetic"], min: 1, name: source });
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
      const amountOf = d => d === "level" ? level : Number(d) || 0;
      // The body's when-missed sentences (Body Barbs, Quills: damage equal to Level).
      const sources = retaliations.map(({ sentence: s, source }) =>
        ({ name: source, dmg: Number(new Roll(String(s.do.dice).replace(/@level/g, String(level))).evaluate({ async: false }).total) || 0 }));
      // Barbed Bark is among the body's when-missed sentences above since Effect
      // Engine: Consumables chunk 2 (2026-10-06): its rule Item carries its variant's.
      for(const r of creatureActorFlagsOf(targetActor).retaliation ?? [])
        if(r.on === "miss") sources.push({ name: r.rule, dmg: amountOf(r.damage) });
      if(sources.length)
      {
        const dmg = sources.reduce((s, x) => s + x.dmg, 0);
        // "Barbed Bark punishes", "Quills punish", "Body Barbs and Spines punish".
        const verb = sources.length === 1 && !/s$/.test(sources[0].name) ? "punishes" : "punish";
        this._postWoundMsg(targetActor, `'s <b>${sources.map(x => x.name).join(" and ")}</b> ${verb} the missed attack — ${dmg} damage to ${this.actor.name}.`);
        // Through the whole pipeline since chunk 2 (see Acid Blood above):
        // kinetic, the barbs, quills and spines being physical.
        dealDamage(this.actor, dmg, { source: targetActor, types: ["kinetic"], name: sources.map(x => x.name).join(" and ") });
      }
    }

    // AN ELIXIR ON THE BOARD RETALIATES TOO (Spineskin Syrup, 2026-09-24):
    // "Missed melee attacks against them deal d4 damage" while the quills
    // last. Read off the Active Effect Board by the roster row's name, so it
    // stops the moment the row ends and nothing here tracks time - the same
    // read rest.js makes for the Metallovore. A fixed die, rolled and posted
    // like Acid Blood's, not the Level-scaled barbs above. `on` says which
    // branch; the incorporeal guard at the top already covers this.
    // Its when-missed sentence since Effect Engine: Consumables chunk 2 (2026-10-06).
    for(const entry of entriesOf(targetActor))
    {
      const spec = elixirSentencesByName(entry.name).find(s => s.when?.trigger === (hit ? "when-hit" : "when-missed")
        && s.do?.verb === "damage" && (s.if ?? []).every(g => g.gate !== "attack-kind" || attackKindHolds(g, "melee")))?.do;
      if(!spec) continue;
      const r = new Roll(spec.dice);
      r.evaluate({async: false});
      r.toMessage({speaker: ChatMessage.getSpeaker({ actor: targetActor }), flavor: `<b>${entry.name}</b> punishes ${this.actor.name}'s ${hit ? "hit" : "missed attack"}`});
      // Through the whole pipeline since chunk 2 (see Acid Blood above); the
      // elixir's declared type if it gives one, else kinetic.
      dealDamage(this.actor, r.total, { source: targetActor, types: spec.damageTypes ?? [spec.type ?? "kinetic"], name: entry.name });
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
    // A weapon's hit reminders come from its sentences since Weapon Tags chunk
    // 5a (Flaming's "ignites flammable objects"), after the attack roll.
    const fromSentences = notesMap === TO_HIT_NOTES ? hitReminders(item) : [];
    return [...tags.filter(t => notesMap[t]).map(t => notesMap[t]), ...fromSentences, ...own];
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
    // DIS on every save (a Daemon's Misfortune Aura, 2026-10-04), any ability.
    if(hasStatefulCondition(actor, "disSaves")) return true;
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
  /**
   * [forceDis, forceAdv] from the character's own unconditional rules for a
   * SAVE - Extra Head, Small Stature (save-notes.js, Shared Pipelines chunk 7).
   * Every sheet save passes these; an attack roll never does, which is why
   * they are not inside _onAbility_Clicked.
   */
  _ownSaveMods(abilityKey)
  {
    const own = saveModifierSources(this.actor, abilityKey);
    return [own.dis.length > 0, own.adv.length > 0];
  }

  _saveNotesFor(actor, abilityKey)
  {
    // One lookup for the sheet and every card (save-notes.js, chunk 7).
    return saveNotesFor(actor, abilityKey);
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
    return (creatureAttackOf(item).followUp ?? []).map(f =>
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
    const own = creatureAttackOf(item).advantageVs ?? [];
    const attacker = own.length
      ? { flags: { vaarn: { advantageVs: [...(creatureActorFlagsOf(this.actor).advantageVs ?? []), ...own] } } }
      : this.actor;
    // ADV against a Combat Condition (2026-09-24, the Chernobog's Cave
    // Fighter): every target must carry it on its board. hasStatefulCondition
    // reads the board after immunity, so a Blind-mutation character or a Blind
    // Crab never counts - RULED by Matt: the CONDITION, not being blind.
    const byCondition = targets.length
      ? (creatureActorFlagsOf(this.actor).advantageVsCondition ?? [])
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
    return (creatureActorFlagsOf(this.actor).attackNotes ?? []).map(n => n.text);
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
      const d = creatureActorFlagsOf(a).dropsMeleeWeapons;
      return d && Number(a.system?.armor?.value) === Number(d.av);
    });
    if(!hot) return;
    const rule = creatureActorFlagsOf(hot).dropsMeleeWeapons.rule;
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
    const spec = creatureFlagsOf(item).auraAbilityDamage;
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
    const spec = creatureFlagsOf(item).encounterEffect;
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
      await applyEffectToActor(actor, { name: item.name, text: `${spec.text} From <b>${self.name}</b>. <b>No printed end</b> - removed ${spec.ends ?? "when it ends"}.`,
        rounds: null, applied: { conditions: [...spec.conditions] } });
      reached.push(actor.name);
    }
    // The verb is the effect's own (2026-10-04, Matt): the Doomsinger declares
    // "sings"; a creature that declares none "uses" it (a Daemon's Sickly Aura
    // read "sings" before).
    this._postWoundMsg(self, `${spec.verb ?? "uses"} the <b>${item.name}</b>! ${spec.text}`
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
   * The damage stage of the HP pipeline. Moved to module/effects/hp-pipeline.js
   * (doDamage) on 2026-10-05; this wrapper keeps every caller unchanged.
   */
  _doDamage(...args)
  {
    return doDamage(this, ...args);
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

  async _applyAttackHeals(sources, itemName)
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
    // ONE HEAL of the sources' total, through the one heal path (Shared
    // Pipelines chunk 3), ungated: gated above with the weapon's name. It
    // floors, clamps and lets Deathblight halve the TOTAL gain, per slot; the
    // sources are then apportioned under what actually landed, so each line
    // still reports only what its own source restored.
    const { after, note } = await heal(wielder, live.reduce((n, s) => n + s.amount, 0), { gate: false });
    const hp = apportion(after);

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
  /**
   * The body's kill reaction - Overkill's on-kill sentence (Mutations and Ancestry
   * Rules chunk 3, 2026-10-05), from its Item or the ancestry text (ruling B), in
   * the shape ANCESTRY_KILL_REACTIONS gave: { rule, text, melee }.
   */
  _killReaction()
  {
    const hit = bodySentences(this.actor, "on-kill").find(({ sentence: s }) => s.do?.verb === "reminder");
    if(!hit) return null;
    return { rule: hit.source, text: hit.sentence.text ?? "", melee: (hit.sentence.if ?? []).some(g => g.gate === "attack-kind" && g.is === "melee") };
  }

  _postKillReactionReminder(meleeKills)
  {
    if(meleeKills <= 0) return;
    const reaction = this._killReaction();
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
    if(item && healsOnKill(item))
      notes.push(`<b>Blood-Rapturous</b> cannot tell whether anything died — ${why}`);

    const reaction = this._killReaction();
    if(reaction && (!reaction.melee || item?.type === "weaponMelee"))
      notes.push(`<b>${reaction.rule}</b> cannot tell whether anything died — ${why}`);

    this._postRollNotes(this.actor, notes);
  }

  /**
   * The HP funnel: temp HP, Wounds and death. Moved to module/effects/hp-pipeline.js
   * (resolveHPChange) on 2026-10-05; this wrapper keeps every caller unchanged.
   */
  _resolveHPChange(...args)
  {
    return resolveHPChange(this, ...args);
  }

  /**
   * The pipeline's damage entry (hp-pipeline.js dealDamage), for modules that
   * reach it through effects/deal.js rather than importing the pipeline.
   */
  _kill(target, opts = {})
  {
    // The one kill route (hp-pipeline.js kill, Shared Pipelines chunk 4), for
    // modules that reach it through effects/deal.js.
    return kill(this, target, opts);
  }

  _dealDamage(...args)
  {
    return dealDamage(...args);
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

  /** Moved to effects/hp-pipeline.js applyWound (Shared Pipelines chunk 4); kept so every caller is unchanged. */
  _applyWound(actor, newHP, depth = 0, opts = {}) { return applyWound(this, actor, newHP, depth, opts); }

  /** Moved to effects/hp-pipeline.js crumbleInevitable (Shared Pipelines chunk 4). */
  _crumbleInevitable(actor) { return crumbleInevitable(this, actor); }

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

    // Detritivore's rotting meal - its on-rest sentence, from the rule Item or
    // the ancestry text (Mutations and Ancestry Rules chunk 6, RULED
    // 2026-10-06; was the ancestry name).
    const rotsMeal = bodySentences(actor, "on-rest").some(p => p.sentence.do?.handler === "rotting-meal");

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

    const rottingChoice = (rotsMeal && !free) ? `
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
    const which = creatureAttackOf(item).takesRation === "water" ? WATER_RATION : FOOD_RATION;
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
    // A creature rule Item's words from its sentence since Effect Engine: Creatures
    // chunk 2c-ii (2026-10-06); any other Item's still from its text.
    const { formula, perRound: ticks } = roundWordingOf(item);

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
