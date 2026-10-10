// Import Modules
import { KnaveActor } from "./actor/actor.js";
import { KnaveActorSheet } from "./actor/actor-sheet.js";
import { KnaveNpcSheet } from "./actor/npc-sheet.js";
import { KnaveItem } from "./item/item.js";
import { KnaveItemSheet } from "./item/item-sheet.js";
import { codexOf, remainingItemFlagsOf, remainingActorFlagsOf } from "./item/remaining-effects.js";
import { restoreDrainsFrom } from "./actor/level-drain.js";
import { ADVANCED_EXOTICA } from "./actor/advanced-exotica-data.js";
import { resolveCombatUsageDice } from "./item/usage-die.js";
import { KnaveCharacterCreator } from "./actor/chargen-app.js";
import { registerGambitSettings } from "./actor/gambit-config.js";
import { registerFactionSettings } from "./actor/faction-config.js";
import { registerFactionGraphSettings } from "./actor/faction-graph.js";
import { registerFactionBrowserControls } from "./actor/faction-browser.js";
import { findFigment } from "./actor/figments.js";
import { applyBakedItemEffects, checkImplantSlotConflict, supersedeUnarmedReplacers, reverseBakedItemEffects, liveMarkFor } from "./actor/item-effects.js";
import { onItemChange, onActorChange, onTokenCreate } from "./actor/token-light.js";
import { registerPackBuild } from "./pack-build.js";
import { registerGuidePacks } from "./guide-pack.js";
import { registerGmRelay } from "./combat/gm-relay.js";
import { registerTokenPlacement } from "./actor/token-placement.js";
import { registerSynthMindButtons } from "./combat/metal-cards.js";
import { registerZeroMaxHpDeath } from "./actor/zero-max-hp.js";
import { registerGraftedArm } from "./actor/grafted-arm.js";
import { displayNameOf } from "./item/display-name.js";
import { antidoteDieOf } from "./item/antidote.js";
import { isUnidentified, hiddenFrom, STAND_IN_NAME, STAND_IN_IMG, onPreCreateChatMessage } from "./item/identification.js";
import { isExotica } from "./item/xp-value.js";
import { VaarnCombat, registerInitiativeSetting } from "./combat/initiative.js";
import { registerVaultSettings } from "./vault/vault-journal.js";
import { registerVaultControls } from "./vault/vault-controls.js";
import { registerRegionControls } from "./region/region-controls.js";
import { registerSettlementControls } from "./settlement/settlement-controls.js";
import { registerRegionLocation } from "./region/region-encounters.js";
import { registerVaultLocation, registerVaultEncounterCards } from "./vault/vault-encounters.js";
import { registerVaultScenes } from "./vault/vault-scene.js";
import { ALWAYS_INTRINSIC_TYPES, isIntrinsic } from "./item/intrinsic.js";
import { BIFURCATING_BREW, removeHalf } from "./actor/bifurcation.js";
import { needsAttunement, attunes, isAttuned, onActivityComplete as onAttunementComplete }
  from "./item/attunement.js";
import { ACTIVITY_COMPLETE_HOOK } from "./time/activity.js";
import { isTransferable } from "./actor/item-transfer.js";
import { isDamageAddOn, damageAddOnFor, isCharging } from "./item/damage-add-ons.js";
import { isDroppable, ensureContainer } from "./actor/dropped-container.js";
import { VaarnContainerSheet } from "./actor/container-sheet.js";
import { VaarnVehicleSheet } from "./actor/vehicle-sheet.js";
import { moraleFailLabel } from "./actor/morale.js";
import { onRoundChange, clearAll as clearRoundEffects, isRoundEffectActive, hpTickLabel, hpTickNow } from "./combat/round-effects.js";
import { registerApplyCardButtons, applyEffectToActor, endEffectsOfSource } from "./combat/apply-to-target.js";
import { conditionApplySpec, conditionByKey } from "./actor/condition-data.js";
import { lightSourceOf, isLit } from "./item/light-source.js";
import { registerFleeCardButtons } from "./combat/flee.js";
import { registerAmbushControls, registerAmbushCardButtons } from "./combat/ambush.js";
import { registerTimeHooks, TIME_HOOK } from "./time/vaarn-time.js";
import { VaarnExplorationClock, registerClockSettings, registerClockControls } from "./time/exploration-clock.js";
import { VaarnWeatherApp, registerWeatherSettings, registerWeatherControls, setOverride as setWeatherOverride } from "./time/weather.js";
import { WINDSONG_BUTTON } from "./actor/granted-ability.js";
import { spawnBeside, performSplit, spawnInPlace } from "./actor/bestiary-spawn.js";
import { registerDayStartCardButtons } from "./time/day-start.js";
import { VaarnEffectBoard, registerBoardControls } from "./time/effect-board-app.js";
import { dealDamage, kill } from "./effects/deal.js";
import { onTimeAdvance as onEffectBoardTime, onTurnAdvance as onEffectBoardTurn, removeEntry, updateEntry, actorFromRef } from "./time/effect-board.js";
import { onTimeAdvance as onActivityTime } from "./time/activity.js";
import { isSuppressed, suppressorsOf } from "./item/suppression.js";
import { offersArmourChoice, isDegradingArmour, DEGRADE_FLAG, hasAnyCreatureType } from "./item/attack-properties.js";
import { registerAfflictionCardButtons, onTreatmentComplete } from "./actor/affliction-card.js";
import { registerCompelledSaveCardButtons, postSaveCardsToTargets, opposedTarget } from "./combat/compelled-save.js";
import { registerTrapCardButtons } from "./combat/trap-card.js";
import { registerRollCardVisibility } from "./actor/roll-card-visibility.js";
import { registerPageRefStripping } from "./text/page-refs.js";
import { registerGambitCardButtons } from "./combat/gambit-card.js";
import { registerThemeSettings, applyTheme } from "./ui/theme.js";
import { registerCorrosionCardButtons, isCorroded } from "./combat/corrosion-card.js";
import { registerBrokenHooks, isBroken } from "./item/broken.js";
import { registerGiftApplyButtons } from "./combat/gift-damage.js";
import { registerEffectCardButtons } from "./effects/effect-card.js";
import { registerGateSettings, registerGateSocket } from "./effects/gates.js";
import { registerValueReaches } from "./effects/value-reaches.js";
import { killHealFor, killHealSourceOf, hitHealSourceOf } from "./effects/weapon-heals.js";
import { registerWeaponFeeding } from "./item/weapon-feeding.js";
// Registers the weapon translator (Effect Engine: Weapon Tags, chunk 2).
import "./item/weapon-tags.js";
import "./actor/mutation-effects.js";
// The implant, figment and Exotica translators (Implants, Exotica and Figments chunk 2).
import "./item/implant-exotica-effects.js";
// The affliction translator (Wounds and Afflictions chunk 3).
import "./item/affliction-effects.js";
// The named one-off use handlers (Mutations and Ancestry Rules chunk 4).
import "./actor/body-uses.js";
import { bodyRollMods } from "./effects/body.js";
import { hasEffectUse, hasBodyUse, isEquippableItem } from "./effects/item-readers.js";
import { useSentences } from "./effects/interpret.js";
import { statOf, usageDieOf } from "./effects/item-stats.js";
import { reloadOf } from "./item/weapon-tags.js";
import { registerEquationDamageButtons } from "./combat/equation-damage.js";
import { rollCardSave, mayRollFor } from "./combat/card-save.js";
import { randomGiftData } from "./actor/granted-pick.js";
import { afflictionSaveModifiers } from "./actor/affliction.js";
import { afflictionByKey as afflictionDefByKey, saveTargetFor as afflictionSaveTarget } from "./actor/affliction-data.js";
import { hasSaveGated, saveGatedSpecFor, clearSaveGated, handsLapseCard } from "./combat/save-gated.js";
import { onTimeAdvance as onRecurrenceTime, recurrenceByKey, applyTickLosses,
         alreadyActioned, addWoundSlot, removeWoundSlot, extrudeObject, fadeOnce, fadingSummary, addFading }
  from "./time/recurrence.js";
import { dailyPoolSize, usesLeft } from "./actor/daily-pool.js";
import { hasDeclaredSpan } from "./time/declared-span.js";
import { targetHealOf, fieldGeneratorOf, registerHealingFieldButtons, applyHeal } from "./actor/healing-field.js";
import { actorValueRollData } from "./combat/actor-value-damage.js";
import { onReminderItemCreate, onReminderItemDelete, onCompanionOwnerUpdate, onCompanionDelete } from "./time/gm-reminder.js";
import { registerHiddenHP, registerHiddenHPToken } from "./actor/hidden-hp.js";
import { isGrownPart, isGrownFruit, onGrownPartDeleted } from "./actor/bloomboon-growth.js";
import { isGraft, onGraftDeleted } from "./actor/graft.js";
import { resolveGeneratedGear } from "./actor/creature-generate.js";
import { HELD_BLOW_FLAG, canStandIn } from "./combat/protector.js";
import { elixirDrinkOf } from "./item/consumable-effects.js";
import { metalDefault, METAL_ARMOUR_IMPLANTS, METAL_ARMOUR_NOTE } from "./item/metal.js";
// Creature attack flags from their sentences (Effect Engine: Creatures chunk 2a).
import { creatureAttackOf, creatureFlagsOf, roundWordingOf } from "./item/creature-effects.js";

// A mutation's use control is its use sentence since Mutations and Ancestry
// Rules chunk 4 (2026-10-06) - effects/item-readers.js hasBodyUse; the
// MUTATIONS_WITH_USE_ICON name list is gone. MUTATIONS_WITH_USE_POOL is
// imported, not declared here — 2026-09-20. A Long Rest refills the pool as
// well as the refresh button, so the membership and the pool size are one
// answer in daily-pool.js (from the sentence's per-day cost since chunk 4)
// that the gate below, the button and rest.js all read.

// Same shape, for `implant`-type Items — work-queue item 10.2 (2026-08-25).
// An implant's use control is its use sentence since Implants, Exotica and
// Figments chunk 3a (2026-10-06) - effects/item-readers.js hasBodyUse; the
// IMPLANTS_WITH_USE_ICON name list is gone.
// IMPLANTS_WITH_USE_POOL is imported too — see the note under the mutation
// list above for why the pool lists moved and the icon lists did not.

// THE ELIXIR DRINK CONTROL (Effect Engine: Consumables chunk 3a, RULED 2026-10-06,
// Matt): an Elixir gets its control exactly when it has a use sentence
// (consumable-effects.js elixirDrinkOf) - the drink the interpreter runs. The
// name list that stood here (ITEMS_WITH_USE_ICON, nine roster filters and four
// literals) is gone. Cloning Jelly gains its control (ruling 1).

// Same shape again, for `exotica`-type Items with NO consumption pool at
// all (no usageDie or usesRemaining field) but still a real activated
// effect worth a click. Since Implants, Exotica and Figments chunk 3b (2026-10-06)
// that is an Exotica with a use sentence and no pool (the Crimson Cantos, Spirit
// Prison, Universal Ration, Mord-Red's Grail) - hasExoticaUse below; the
// EXOTICA_WITH_USE_ICON name list is gone. A pooled one keeps hasUsageDie or
// hasExoticaCharges.

// Ranged weapons roll their Usage Die once per combat, not once per shot —
// resolved here once the encounter actually ends. See usage-die.js.
Hooks.on('deleteCombat', combat =>
{
  // SINGLE WRITER, added 2026-09-20 after Group 253.5 measured the duplicate.
  // The deleteCombat hook further down this file has carried this guard all
  // along, with a comment calling two GM clients racing "harmless but
  // pointless" — true for clearing flags, and NOT true here. Both GMs run
  // this hook, so one Sling fired in one combat rolled its ammo die twice
  // (17 and 9, seen live): two independent 1-in-10 depletion chances per
  // combat where Usage Die.md gives one, and on a double hit the surviving
  // value depends on which update lands first.
  //
  // It needed two GM clients to show at all, which is the standing condition
  // in this world rather than something a test arranges.
  if(game.user !== game.users.activeGM) return;
  return resolveCombatUsageDice(combat);
});

// Exotica Identification: no card names an unidentified item, whichever
// handler posted it. See onPreCreateChatMessage in identification.js.
Hooks.on('preCreateChatMessage', message => onPreCreateChatMessage(message));

// Per-Round Effect Reminder / Round-Duration Expiry — see combat/round-effects.js.
// updateCombat fires for turn advances too. The round card stays on a ROUND
// cadence (the round guard below): a reminder that also fired per turn would
// bury the one message a round it is supposed to be. Turn-Counted Round
// Duration (RULED 2026-10-04 by Matt) reads every turn advance first: a round
// span in combat ends on its holder's turns, and the last turn of a round is
// counted before that round's card is built.
Hooks.on('updateCombat', async (combat, changed) =>
{
  if(changed?.round === undefined && changed?.turn === undefined) return;
  // ONE poster, and isGM is not enough to pick one. Matt is permanently
  // connected as Gamemaster, so any automation or second GM session makes two
  // users for whom isGM is true, and each posts its own copy — found in
  // testing on 2026-09-08, where every card arrived twice. activeGM resolves
  // to the same single user on every client, which is the property needed.
  if(game.user !== game.users.activeGM) return;
  await onEffectBoardTurn(combat);
  if(changed?.round === undefined) return;
  return onRoundChange(combat.round);
});

// Nothing stays toggled on once the encounter ends. Same reasoning as the
// Berserker cleanup below, and the same reason it walks all actors rather than
// combat.combatants: a reminder can be switched on for an actor who was never
// added to the tracker, and scoping the sweep would leave it running forever.
Hooks.on('deleteCombat', async () =>
{
  // Same single-writer guard as the round hook above: two GM clients racing to
  // unset the same flags is harmless but pointless, and keeping the two hooks
  // on one rule means a future change cannot fix one and miss the other.
  if(game.user !== game.users.activeGM) return;
  await clearRoundEffects();
  // THE COMBAT STATES END WITH THEIR BOARD ENTRIES now (Shared Pipelines chunk
  // 6, RULED A 2026-10-05): berserk, an Exotica's combat AV and a borrowed
  // hand each carry one that ends with the combat and clears its flag. These
  // lines are the FALLBACK (RULED C) for a flag with no entry - set before
  // chunk 6 by a character who updated mid-combat, or a failed save-gated
  // record - and run after the board clear, so nothing ends twice. Foundry does
  // not await a hook, which is why they live here and not in hooks of their own.
  for(const actor of game.actors)
  {
    if(actor.getFlag("vaarn", "berserkerActive")) await actor.unsetFlag("vaarn", "berserkerActive");
    if(actor.getFlag("vaarn", "combatAv")) await actor.unsetFlag("vaarn", "combatAv");
    // The lapse card reads the hand before it goes (Matt's catch 2026-09-13).
    const lapse = handsLapseCard(actor);
    await clearSaveGated(actor);
    if(lapse) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: lapse });
  }
});


// Item 10.8/10.3.8 (2026-08-27): Berserker StimRig/Brew's "battle madness"
// state is fiction-locked to the stimulant/frenzy actually wearing off —
// neither can be manually turned off (Matt's ruling: you can't consciously
// stop a drug-induced berserker rage any more than you can un-drink a
// potion), so the ONLY way either ends is the encounter that triggered it
// ending. One shared flag serves both sources; no need to track which one
// set it, since they behave identically here. Scans ALL actors, not just
// this combat's own combatants — activating either source is only ever
// gated on "is *some* combat active" (`game.combat` truthy), not on the
// actor actually being added to that encounter's tracker, so scoping the
// cleanup to combat.combatants would leave an untracked actor stuck
// berserk forever with no way to ever clear it.
Hooks.on('deleteCombat', combat =>
{
  // ONE CLIENT SWEEPS (2026-09-27). This ran on every connected client, and
  // before the socket relay a player's writes to actors they do not own were
  // simply refused. With the relay (combat/gm-relay.js) each player client
  // would forward them, so the GM repeated the sweep once per player and a
  // repeated Item delete failed. The active GM can write every actor.
  if(!game.users.activeGM?.isSelf) return;
  for(const actor of game.actors)
  {
    // The berserk flag and the Brew's Exit the Frenzy Item end with their
    // board entry since Shared Pipelines chunk 6 (2026-10-05); the fallback for
    // a flag with no entry is in the board-clear hook above.

    // THE CORROSIVE TAG'S DECLARATION rides the same sweep, RULED 2026-09-22
    // (Matt), and the pairing with berserk rather than with the charge is the
    // decision. Unlike the charge toggle, which clears on ANY melee damage
    // roll, this one is spent only by a weapon that actually offers the
    // choice: "going for the armour" describes what you do with THAT weapon,
    // so a two-weapon character can declare, swing something else, and still
    // have the declaration when they reach the acid blade. That is the half
    // Matt kept.
    //
    // The cost of keeping it is a declaration that outlives the fight, which
    // is the sticky-flag failure the charge's auto-clear exists to prevent.
    // Clearing it here answers that without taking the choice away mid-combat
    // — the same trade, and the same disposal, as the berserk flag had.
    // Not on the board (Shared Pipelines chunk 6, RULED D): an intent for the
    // next swing, not an effect with a duration.
    if(actor.getFlag("vaarn", DEGRADE_FLAG))
      actor.unsetFlag("vaarn", DEGRADE_FLAG);
  }
});

// Save-Gated Effect (2026-09-13): a borrowed hand ends with its board entry
// since Shared Pipelines chunk 6 (2026-10-05); the fallback for a record with
// no entry is in the board-clear hook above. THE FLAG ONLY (RULED 2026-09-13,
// Matt): a limb spawned by a failed save is left alone - nothing deletes an Actor.

// Work-queue item 10.7 (2026-08-26, broadened by item 15, 2026-08-26):
// mutations, Starting Implants, and Advanced Implants all only ever baked
// their ability/HP/slot/hands/naturalWeapon effects through chargen-app.js's
// one-time finalize bake — none of that applied if the Item was created on
// an already-existing character outside the wizard. This hook covers all
// three uniformly now. See item-effects.js for why this is gated on userId
// rather than game.user.isGM (this world runs two simultaneously-connected
// GM-privileged users) and on options.vaarnChargenBake (avoids double-baking
// chargen's own batch-created Items).
Hooks.on('createItem', (item, options, userId) => applyBakedItemEffects(item, options, userId));
// A creature's generated weapon, mutation or implant is rolled when it enters
// the world (Item Creation from Roll Table wiring, RULED 2026-09-25, Matt).
Hooks.on('createActor', (actor, options, userId) => resolveGeneratedGear(actor, options, userId));
// An effect that lasts "until the Tyrant is killed" ends when its source dies
// or is deleted (Weight of Worlds, RULED 2026-09-25, Matt). Single writer.
Hooks.on('updateActor', (actor, changes) =>
{
  if(game.user !== game.users.activeGM || actor.type !== "npc") return;
  const hp = foundry.utils.getProperty(changes, "system.health.value");
  if(hp !== undefined && Number(hp) <= 0) endEffectsOfSource(actor, "is dead");
});
Hooks.on('deleteActor', actor =>
{
  if(game.user !== game.users.activeGM) return;
  endEffectsOfSource(actor, "is gone");
});

// Mutation Contradiction Precedence, post-chargen half (2026-09-13). Corrupted
// Blood's "the more recent mutation takes precedence", applied to the three
// unarmed-attack replacers when one lands on a character already carrying
// another. Registered AFTER applyBakedItemEffects deliberately: that hook
// creates the incoming mutation's own natural weapon, and this one deletes the
// superseded mutation's — running it second means the new weapon already
// exists when the old one goes, so the character is never momentarily without
// an unarmed attack. Both match on Item id and on the description backlink
// rather than on name alone, so the order is safety margin, not a dependency.
// See item-effects.js for why this is gated on userId and vaarnChargenBake.
Hooks.on('createItem', (item, options, userId) => supersedeUnarmedReplacers(item, options, userId));

// Baked Effect Reversal (2026-09-13). The other half of applyBakedItemEffects:
// removing a mutation/implant/Exotica subtracts exactly what its creation
// applied, read from the record that hook writes onto the Item. This is the
// FIRST deleteItem hook in the system — nothing cascaded on deletion before
// it, which is why supersedeUnarmedReplacers has to delete a superseded
// mutation's natural weapon explicitly rather than relying on a cascade.
Hooks.on('deleteItem', (item, options, userId) => reverseBakedItemEffects(item, options, userId));

// Standing GM Reminder (2026-09-23). An Item flagged gmReminder, or with a
// gm-reminder sentence (the Watchful Ferret, since Implants, Exotica and Figments
// chunk 5), puts a GM-only, open-ended row on its holder's board and takes it
// away when it leaves. A transfer is a delete plus a flag-carrying create, so
// the row follows the Item. Gated on userId inside, one writer per change.
Hooks.on('createItem', (item, options, userId) => onReminderItemCreate(item, options, userId));
Hooks.on('deleteItem', (item, options, userId) => onReminderItemDelete(item, options, userId));
// A companion's owner-facing rule (the Stridingfool's Abomination), RULED
// 2026-09-24 (Matt): on the owner's board while they own it.
Hooks.on('updateActor', (actor, changes, options, userId) => onCompanionOwnerUpdate(actor, changes, options, userId));
Hooks.on('deleteActor', (actor, options, userId) => onCompanionDelete(actor, options, userId));
// Bloomboon Growth: shedding a grown part, by the Shed control or a Delete,
// turns its base-score cost into ordinary ability damage.
Hooks.on('deleteItem', (item, options, userId) => onGrownPartDeleted(item, options, userId));
// Grafted Limb Creation: removing the graft stops its daily CON loss.
Hooks.on('deleteItem', (item, options, userId) => onGraftDeleted(item, options, userId));

// Actor Token Light Emission (2026-09-20). Three carriers, and they arrive by
// two different doors. Bioluminescence and Lumenrot are owned Items, so they
// come and go on createItem/deleteItem. Lumensoup's glow rides its effect-board
// entry, and the board stores its entries in an actor flag — so adding,
// removing or SWEEPING one is an actor update and there is no board-specific
// hook to listen to. updateActor is therefore the elixir's door, filtered down
// to the one flag inside token-light.js rather than here.
//
// createToken is the third: a character who is already glowing must arrive lit
// on a scene they have never been placed on. The prototype covers the stamp,
// this covers a token dropped from the sidebar before the prototype was synced.
//
// Deliberately NOT gated on userId the way applyBakedItemEffects is. That hook
// must fire exactly once because it performs arithmetic on the actor; this one
// computes the light from scratch every time and writes only when the result
// differs, so a second caller is idempotent. The single-writer guard is inside,
// on game.users.activeGM, for the two-GM reason the comment above describes.
Hooks.on('createItem', item => onItemChange(item));
Hooks.on('deleteItem', item => onItemChange(item));
// Equip and colour changes on a Luminous weapon (Weapon Tags chunk 5b).
Hooks.on('updateItem', item => onItemChange(item));
Hooks.on('updateActor', (actor, changed) => onActorChange(actor, changed));
Hooks.on('createToken', doc => onTokenCreate(doc));

// Cybernetics - Starting.md: "Each Ability may have only one implant
// assigned to it" — enforced here since Foundry only allows cancelling a
// document's creation from a `pre`-prefixed hook. See item-effects.js.
Hooks.on('preCreateItem', (item, data, options, userId) => checkImplantSlotConflict(item));

// Intrinsic Item Marker (2026-09-08): the four Item types where EVERY instance
// is part of the character get system.intrinsic baked in at creation, whatever
// route made them — chargen's batch, a Grant macro, or a GM dragging one out of
// the sidebar by hand. Doing it here rather than at each creation site is the
// point: a hand-made mutation is marked without anyone having to remember, and
// there is one place to read rather than a list of pushes to keep in step.
//
// Natural weapons are NOT covered here and set the field explicitly at their
// own creation sites, because `weaponMelee` is exactly the ambiguous type —
// see intrinsic.js for why type can never be the read-time test.
//
// preCreate rather than create, so the value is in the source document before
// it is written and no second update fires.
Hooks.on('preCreateItem', (item, data, options, userId) =>
{
  if(!ALWAYS_INTRINSIC_TYPES.has(item.type)) return;
  if(item.system?.intrinsic === true) return;
  item.updateSource({ "system.intrinsic": true });
});

// Metal Item Property (RULED 2026-09-27): the Metal box's default, from the
// pass's rulings in metal.js - only when the creation data does not already
// say, so a builder that knows better and an item moved between actors keep
// their own value. The same hook serves the pack build. The three implants
// that count as metal armour say so in their description, wherever built.
Hooks.on('preCreateItem', (item, data, options, userId) =>
{
  const changes = {};
  if(!foundry.utils.hasProperty(data, "system.metal")) changes["system.metal"] = metalDefault(data);
  const desc = item.system?.description ?? "";
  if(item.type === "implant" && METAL_ARMOUR_IMPLANTS.has(item.name) && !desc.includes(METAL_ARMOUR_NOTE))
    changes["system.description"] = `${desc}<p>${METAL_ARMOUR_NOTE}</p>`;
  // Stats as Sentences chunk 2d-ii (RULED 2026-10-07): a bonus Item made in play
  // is live from its creation data - the marker, not the bake.
  Object.assign(changes, liveMarkFor(item, item.parent, options) ?? {});
  if(Object.keys(changes).length) item.updateSource(changes);
});

// Polymorphic weapon tag (item 4.7, 2026-08-27): the 2 GM-facing macros
// (Generate Weapon, Advanced Exotica's weaponGen rows) create BOTH halves
// of a Polymorphic pair as unowned sidebar Items — a GM has to remember to
// drag BOTH onto a character separately, and it's easy to only remember
// one. Warns whenever a Polymorphic-tagged weapon lands on an actor
// (drag-and-drop or direct creation) without its paired form already
// present there. Fires at most once per half — by the time the SECOND
// half is added, the check correctly finds the first already present and
// stays quiet.
Hooks.on('createItem', (item, options, userId) =>
{
  if(userId !== game.user.id) return;
  if(item.type !== "weaponMelee" && item.type !== "weaponRanged") return;
  const pairName = remainingItemFlagsOf(item).polymorphicPairName;
  if(!pairName) return;
  const actor = item.parent;
  if(!actor) return;
  const hasPair = actor.items.some(i => i.id !== item.id && i.name === pairName);
  if(!hasPair)
    ui.notifications.warn(`${item.name} is Polymorphic — its paired form "${pairName}" isn't in ${actor.name}'s inventory yet. Don't forget to bring it over too.`);
});

// Reflecting weapon tag (item 4.6.2, 2026-08-27) — the chat card
// actor-sheet.js's _checkReflectingTag posts needs a GLOBAL click
// handler, not a per-sheet activateListeners one, since a chat message
// isn't tied to any one actor's rendered sheet DOM. No to-hit roll is
// reflected (the tag's own text is unconditional damage) — just a
// straight damage roll using the ORIGINAL ATTACKER's own weapon damage
// dice, applied back to them. Reuses `attacker.sheet._resolveHPChange`
// directly rather than reimplementing Wounds-table handling a second
// time — it doesn't reference `this.actor` for anything, so calling it
// via the attacker's own sheet instance resolves correctly.
// User Configuration offers every Actor the user can observe as their character,
// so the shared Dropped Items container (and any companion) was listed. Only a
// character can be one (Matt, 2026-09-28, fresh-world walk-through).
Hooks.on('renderUserConfig', (app, html) =>
{
  html.find("[data-actor-id]").each((i, el) =>
  {
    if(game.actors.get(el.dataset.actorId)?.type !== "character") el.remove();
  });
});

// The roll button on a round-reminder card. It rolls and posts, and stops there —
// applying the result is the GM's call, which is the whole premise of the row.
// The roll inherits the visibility of the card it came from, per Matt's ruling,
// so a GM-whispered reminder cannot leak its damage roll into public chat.
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-round-roll').click(async ev =>
  {
    const btn = ev.currentTarget;
    const actor = actorFromRef(btn.dataset.actorId);
    const roll = new Roll(btn.dataset.formula);
    await roll.evaluate({async: true});
    // VISIBILITY MUST BE SET AS A ROLL MODE, NOT AS `whisper`. Roll#toMessage
    // ends by calling ChatMessage.applyRollMode, which OVERWRITES whisper from
    // the roll mode in force — so passing the source card's whisper array here
    // reads correctly and is silently discarded, and a GM-only reminder posts
    // its damage roll in public. Found in testing 2026-09-08; the code looked
    // right and only running it showed otherwise.
    const gmOnly = !!message.whisper?.length;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<b>${btn.dataset.label}</b> — per-round effect`
    }, {
      rollMode: gmOnly ? CONST.DICE_ROLL_MODES.PRIVATE : CONST.DICE_ROLL_MODES.PUBLIC
    });
  });

  // A PER-ROUND ABILITY LOSS - Ability Damage pass 3, RULED 2026-09-22 (Matt):
  // unlike the roll above, this one APPLIES, writing the roll to the entry
  // holder's wound damage. ONCE PER CARD (Matt, same day): the entries already
  // applied are recorded on the MESSAGE, never the button, since a re-render
  // brings a disabled button back live.
  html.find('.vaarn-round-ability').click(async ev =>
  {
    const btn = ev.currentTarget;
    const entryId = btn.dataset.entryId;
    if((message.getFlag("vaarn", "roundAbilityApplied") ?? []).includes(entryId))
      return ui.notifications.warn(`${btn.dataset.label} has already been applied this round.`);
    const actor = actorFromRef(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    const refusal = roundApplyRefusal(actor, (actor.getFlag('vaarn', 'effects') ?? []).find(e => e.id === entryId));
    if(refusal) return ui.notifications.warn(refusal);
    await message.setFlag("vaarn", "roundAbilityApplied",
      [...(message.getFlag("vaarn", "roundAbilityApplied") ?? []), entryId]);
    const key = btn.dataset.ability;
    const label = String(key).toUpperCase();
    const roll = new Roll(btn.dataset.formula);
    await roll.evaluate({async: true});
    // A FADING loss - the Occulith's gaze (2026-09-25) - goes on its
    // recurrence entry with the round's AV gain, never on woundDamage, so
    // rest cannot heal what the book says only fades.
    const tick = (actor.getFlag("vaarn", "effects") ?? []).find(e => e.id === entryId)?.abilityDamage;
    let flavor;
    if(tick?.fade)
    {
      const applied = await addFading(actor, tick.fade, { ability: key, amount: roll.total, av: tick.avPerTick || 0 });
      flavor = `<b>${btn.dataset.label}</b> — ${roll.total} ${label} lost${tick.avPerTick ? ` and +${tick.avPerTick} AV` : ""} this round `
             + `(now ${fadingSummary(applied)}, fading a point a day)`;
    }
    else
    {
      const total = Number(actor.system.abilities?.[key]?.woundDamage ?? 0) + roll.total;
      await actor.update({ [`system.abilities.${key}.woundDamage`]: total });
      flavor = `<b>${btn.dataset.label}</b> — ${roll.total} ${label} damage this round `
             + `(${label} wound damage total ${total})`;
    }
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor
    }, {
      rollMode: message.whisper?.length ? CONST.DICE_ROLL_MODES.PRIVATE : CONST.DICE_ROLL_MODES.PUBLIC
    });
  });

  // AN ESCALATING PER-ROUND HP LOSS - the Seeker's Brain Burster, 2026-09-22.
  // "This damage starts at 2 and doubles each turn."
  //
  // NO ROLL AT ALL, which is what makes it different from the two handlers
  // above: the book gives a flat figure, and the escalation is the mechanism.
  // The amount is read from the ENTRY rather than the button, for the same
  // reason the ability handler guards on the message: a re-rendered card hands
  // back a button carrying whatever figure was true when it was drawn, and
  // trusting that would re-apply an old number or skip a step.
  //
  // THE DOUBLING IS WRITTEN BACK BEFORE THE DAMAGE LANDS, so a _resolveHPChange
  // that opens a Wound dialog cannot leave the escalation un-advanced.
  html.find('.vaarn-round-escalate').click(async ev =>
  {
    const btn = ev.currentTarget;
    const entryId = btn.dataset.entryId;
    if((message.getFlag("vaarn", "roundAbilityApplied") ?? []).includes(entryId))
      return ui.notifications.warn(`${btn.dataset.label} has already been applied this round.`);
    const actor = actorFromRef(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    const entries = actor.getFlag('vaarn', 'effects') ?? [];
    const entry = entries.find(e => e.id === entryId);
    const refusal = roundApplyRefusal(actor, entry);
    if(refusal) return ui.notifications.warn(refusal);
    if(!entry?.escalating)
      return ui.notifications.warn(`${btn.dataset.label} is no longer on ${actor.name}'s board.`);

    const amount = Number(entry.escalating.amount) || 0;
    const factor = Number(entry.escalating.factor) || 2;
    await message.setFlag("vaarn", "roundAbilityApplied",
      [...(message.getFlag("vaarn", "roundAbilityApplied") ?? []), entryId]);
    await actor.setFlag('vaarn', 'effects', entries.map(e => e.id === entryId
      ? { ...e, escalating: { ...e.escalating, amount: amount * factor } } : e));

    // Through the whole HP pipeline (Shared Pipelines chunk 2, 2026-10-05):
    // untyped ("unblockable"), from the entry's source.
    dealDamage(actor, amount, { source: game.actors.get(entry.sourceActorId) ?? null, name: entry.name });
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      whisper: message.whisper?.length ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [],
      content: `<b>${btn.dataset.label}</b> — <b>${amount}</b> unblockable damage. `
             + `Next round it is <b>${amount * factor}</b>, unless the effect is removed from the board.`
    });
  });

  // A RULE THAT FIRES ON A FAILED MORALE SAVE - Morale Check, RULED
  // 2026-09-24 (Matt): the Conscript's Bomb Collar. The card is whispered, so
  // only a Referee sees the button. It rolls once and applies the blast to the
  // creature itself, always, and to every targeted token - the Referee
  // targets whoever is in melee range. Once per card. The roll is private;
  // the damage lines are not, because by then the collar has gone off.
  html.find('.vaarn-morale-fail').click(async ev =>
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee applies this.");
    const btn = ev.currentTarget;
    const label = btn.dataset.label;
    if(message.getFlag("vaarn", "moraleFailApplied"))
      return ui.notifications.warn(`${label} has already gone off.`);
    const actor = await fromUuid(btn.dataset.actorUuid);
    if(!actor) return ui.notifications.warn("That creature no longer exists.");
    const item = actor.items.get(btn.dataset.itemId);
    const spec = creatureFlagsOf(item).moraleFail;
    if(!spec) return ui.notifications.warn(`${label} is no longer on ${actor.name}.`);

    await message.setFlag("vaarn", "moraleFailApplied", true);
    const roll = await new Roll(spec.dice).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<b>${label}</b> — ${moraleFailLabel(spec, actor.name)}` },
      { rollMode: CONST.DICE_ROLL_MODES.PRIVATE });
    const min = (await new Roll(spec.dice).evaluate({ minimize: true })).total;
    const others = Array.from(game.user.targets ?? []).map(t => t.actor).filter(a => a && a.uuid !== actor.uuid);
    for(const target of [actor, ...others])
      actor.sheet._doDamage({ actor: target }, roll.total, false, item, 1,
        [{ amount: roll.total, min, name: label, types: spec.damageTypes?.length ? spec.damageTypes : null }]);
  });

  // A PER-ROUND HP CHANGE - Direct HP Adjustment, RULED 2026-09-23 (Matt).
  // Regeneration, sunlight, salt, heat, Devour, Pounce, the Heat Aura, a
  // Jollyhoss half returning. GM-ONLY and never automatic: whether the
  // creature is in the sun, who is swallowed, who stands in the aura, whether
  // the other half still lives - all the Referee's call.
  //
  // The spec is read from the ENTRY, not the button, for the escalate
  // handler's reason. Once per card, the same guard. A heal runs the shared
  // heal rules (applyHeal); damage runs _doDamage with the rule's Item, so a
  // target's type rules read the component - a mineral PC is immune to the
  // Thermasaur's flame, a fungal one takes double.
  // AN ONGOING HOLD'S ESCAPE (Per-Round Effect Reminder wiring, RULED
  // 2026-09-25 by Matt): the held one's save, an option on their turn. The
  // victim's owner or the Referee rolls it. ONCE A ROUND, recorded on the
  // victim's own board entry - a player cannot write to the Referee's card.
  // A pass removes the hold; a failure leaves it for next round.
  html.find('.vaarn-round-escape').click(async ev =>
  {
    const btn = ev.currentTarget;
    const actor = actorFromRef(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    if(!mayRollFor(actor)) return ui.notifications.warn(`Only ${actor.name}'s player or the Referee can roll this.`);
    const entry = (actor.getFlag('vaarn', 'effects') ?? []).find(e => e.id === btn.dataset.entryId);
    const esc = entry?.hold?.escape;
    if(!esc) return ui.notifications.warn(`${actor.name} is no longer held by ${btn.dataset.label}.`);
    const round = game.combat?.round ?? null;
    if(round !== null && entry.escapeTriedRound === round)
      return ui.notifications.warn(`${actor.name} has already tried to escape ${entry.name} this round.`);
    await updateEntry(actor, entry.id, { escapeTriedRound: round });
    const label = String(esc.ability).toUpperCase();
    // An OPPOSED escape rolls against 10 + the holder's score in the same
    // ability (Group 306's rule; Matt 2026-09-25: "like other compelled saves
    // except the target to beat is 10 + the other creature's [ability]").
    const holder = esc.opposed && entry.sourceActorId ? game.actors.get(entry.sourceActorId) : null;
    const opp = holder ? opposedTarget(holder, esc.ability) : null;
    // Slimy Skin's ADV to escape (ruling C 13, Mutations and Ancestry Rules
    // chunk 2b): the body's ADV on escapes, every hold alike.
    const escapeAdv = bodyRollMods(actor, "escape").adv;
    const r = await rollCardSave(actor, { ability: esc.ability, advSources: escapeAdv,
      label: `${entry.name} — ${label} save to ${esc.by}${opp ? ` (opposed: 10 + ${holder.name}'s ${label} ${opp.opposedBonus})` : ""}`,
      ...(opp ? { target: opp.target } : {}),
      rollMode: message.whisper?.length ? CONST.DICE_ROLL_MODES.PRIVATE : CONST.DICE_ROLL_MODES.PUBLIC });
    if(r.verdict.passed) await removeEntry(actor, entry.id);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: r.verdict.passed ? `<b>${actor.name}</b> manages to ${esc.by} - <b>${entry.name}</b> is over.`
                                : `<b>${actor.name}</b> is still held by <b>${entry.name}</b>.` });
  });

  // AN END THE HOLDER CHOOSES (RULED 2026-09-27, Matt): the Ghoul's Agony
  // ends when its victim lies still. The victim's player or the Referee.
  html.find('.vaarn-round-endsby').click(async ev =>
  {
    const btn = ev.currentTarget;
    const actor = actorFromRef(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    if(!mayRollFor(actor)) return ui.notifications.warn(`Only ${actor.name}'s player or the Referee can do this.`);
    const entry = (actor.getFlag('vaarn', 'effects') ?? []).find(e => e.id === btn.dataset.entryId);
    if(!entry) return ui.notifications.warn(`${btn.dataset.label} is no longer on ${actor.name}'s board.`);
    await removeEntry(actor, entry.id);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<b>${actor.name}</b> ${entry.endsBy} - <b>${entry.name}</b> is over.` });
  });

  html.find('.vaarn-round-hp').click(async ev =>
  {
    const btn = ev.currentTarget;
    const entryId = btn.dataset.entryId;
    const label = btn.dataset.label;
    if((message.getFlag("vaarn", "roundAbilityApplied") ?? []).includes(entryId))
      return ui.notifications.warn(`${label} has already been applied this round.`);
    const actor = actorFromRef(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    const entry = (actor.getFlag('vaarn', 'effects') ?? []).find(e => e.id === entryId);
    const refusal = roundApplyRefusal(actor, entry);
    if(refusal) return ui.notifications.warn(refusal);
    // This click's figure - the Black Cloud's doubling (see hpTickNow).
    const spec = hpTickNow(entry);
    if(!spec) return ui.notifications.warn(`${label} is no longer on ${actor.name}'s board.`);

    // A tick limited to some creature types passes over the rest silently -
    // the Normality Field hurts only hypergeometric or outsider creatures
    // (Trap Resolution, RULED 2026-09-26), and naming who it skipped would
    // telegraph it (the Rustacean ruling).
    const recipients = spec.to === "targets"
      ? Array.from(game.user.targets ?? []).map(t => t.actor).filter(Boolean)
          .filter(a => !spec.targetTypes?.length || hasAnyCreatureType(a, spec.targetTypes))
      : [actor];
    const speaker = ChatMessage.getSpeaker({ actor });
    const whisper = message.whisper?.length ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [];
    // Nothing targeted is a refusal, not an application: the card stays live.
    if(!recipients.length)
      return ChatMessage.create({ speaker, whisper,
        content: `<b>${label}</b>: no target is selected, so nothing was applied.` });

    // "d6 for each sleeping creature nearby" - the Referee counts. n dice,
    // not one die times n: the book rolls a d6 per sleeper.
    let formula = spec.dice;
    if(spec.perCount)
    {
      const n = await Dialog.prompt({
        title: label,
        content: `<p>How many — ${spec.dice} per ${spec.perCount}?</p><input type="number" name="n" min="0" step="1" value="0"/>`,
        label: "Roll",
        callback: html => Number(html.find('[name="n"]').val()) || 0,
        rejectClose: false
      });
      if(!n) return;
      const m = String(spec.dice).match(/^(\d*)d(\d+)$/);
      formula = m ? `${(Number(m[1]) || 1) * n}d${m[2]}` : `(${spec.dice})*${n}`;
    }

    await message.setFlag("vaarn", "roundAbilityApplied",
      [...(message.getFlag("vaarn", "roundAbilityApplied") ?? []), entryId]);

    // Restore to full rolls nothing.
    if(spec.full)
    {
      const line = await applyHeal(actor, actor.system.health.max, `<b>${label}</b>`);
      if(line) ChatMessage.create({ speaker, whisper, content: `<b>${label}</b> — ${actor.name} returns and ${line}` });
      return;
    }

    // "@lvl" is the Fleshwarp's Level, read now from the holder.
    const { data } = actorValueRollData(formula, actor, [], label);
    const roll = await new Roll(formula, data).evaluate();
    await roll.toMessage({ speaker, flavor: `<b>${label}</b> — ${hpTickLabel(spec, actor.name)}` },
      { rollMode: whisper.length ? CONST.DICE_ROLL_MODES.PRIVATE : CONST.DICE_ROLL_MODES.PUBLIC });

    if(spec.heal)
    {
      const lines = [];
      for(const target of recipients)
      {
        const line = await applyHeal(target, roll.total, `<b>${label}</b>`);
        if(line) lines.push(`<b>${target.name}</b> ${line}`);
      }
      if(lines.length) ChatMessage.create({ speaker, whisper, content: `<b>${label}</b>:<br>${lines.join("<br>")}` });
      return;
    }

    const min = (await new Roll(formula, data).evaluate({ minimize: true })).total;
    // The rule's Item only when the rule DECLARES a type. An untyped tick
    // passes none, so _doDamage skips the type table: resolved as an Item with
    // no type, sunlight would read as kinetic, and the Chromavore would be
    // immune to its own sunlight, the Ooze would halve its heat and the Pool
    // would minimise its salt.
    // A typed tick with NO rule Item - a vault hazard on each exposed character
    // (Trap Resolution, 2026-09-26) - still needs the type table, and
    // _doDamage runs that table only for an Item. So it gets a bare stand-in
    // carrying the types and nothing else; found in Group 424, where a fungal
    // target took single damage from the burning fuel.
    const item = spec.damageTypes?.length
      ? (actor.items.get(entry.itemId) ?? { name: label, id: null, flags: {}, system: { damageTypes: spec.damageTypes, tags: [], damageDice: "" } })
      : null;
    const hpBefore = new Map(recipients.map(t => [t.id, Number(t.system.health.value)]));
    for(const target of recipients)
      actor.sheet._doDamage({ actor: target }, roll.total, false, item, 1,
        [{ amount: roll.total, min, name: label, types: spec.damageTypes ?? null }]);
    // THE BLACK CLOUD (Multi-Target wiring, RULED 2026-09-25 by Matt). The
    // count of applications is what doubles the next one; and "After three
    // rounds, all PCs fight as if blinded" puts the condition itself on each
    // target of every click after the third - "the best way to model 'fight as
    // if blinded'". No span: it stays until the Referee removes it from the
    // board. Not written twice to a target that already carries it; immunity
    // is read where Blind is used, as for every other source.
    if(spec.factor || spec.conditionAfter)
    {
      const count = Number(entry.hpTickCount) || 0;
      await updateEntry(actor, entry.id, { hpTickCount: count + 1 });
      const after = spec.conditionAfter;
      if(after && count >= after.ticks)
      {
        const blinded = [];
        for(const target of recipients)
        {
          const has = (target.getFlag('vaarn', 'effects') ?? []).some(e => e.applied?.conditions?.includes(after.condition));
          if(has) continue;
          await applyEffectToActor(target, conditionApplySpec(after.condition, { source: `${actor.name}'s ${label}` }));
          blinded.push(target.name);
        }
        if(blinded.length)
          ChatMessage.create({ speaker, whisper,
            content: `<b>${label}</b> — ${blinded.join(", ")} ${blinded.length === 1 ? "is" : "are"} now <b>${conditionByKey(after.condition).label}</b>, until the Referee removes it.` });
      }
    }
    // Vampiric Roots (2026-09-25): the one holding heals by what the held one
    // actually lost. _doDamage does not await its HP write, so it is read back
    // once it lands.
    const source = spec.drainTo ? game.actors.get(spec.drainTo) : null;
    if(source)
    {
      let lost = 0;
      for(let i = 0; i < 10 && !lost; i++)
      {
        await new Promise(r => setTimeout(r, 100));
        lost = recipients.reduce((n, t) => n + Math.max(0, hpBefore.get(t.id) - Number(t.system.health.value)), 0);
      }
      const line = lost > 0 ? await applyHeal(source, lost, `<b>${label}</b>`) : null;
      if(line) ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: source }), whisper, content: `<b>${source.name}</b> ${line}` });
    }
  });
});

/**
 * Record that a recurrence's tick has been actioned, on the entry itself.
 *
 * Written here rather than in recurrence.js because it is chat-card plumbing
 * rather than part of the mechanism — the module never learns that a card
 * exists. Reads the flag fresh instead of trusting the copy the handler
 * already has, since another click may have landed in between.
 */
async function updateRecurrenceIndex(actor, entryId, field, index)
{
  const entries = actor.getFlag('vaarn', 'effects') ?? [];
  await actor.setFlag('vaarn', 'effects',
    entries.map(e => e.id === entryId ? { ...e, [field]: Math.max(Number(e[field]) || 0, index) } : e));
}

// The buttons on a Long-Clock Recurrence tick card.
//
// A TICK WRITES NOTHING BY ITSELF — the card announces and these apply, which
// is what keeps Matt's 2026-09-08 announce-only ruling true while still giving
// the three item-shaped clauses somewhere for the item to come from. The
// Referee clicks the item button when the save has actually failed; a card
// nobody touches has changed nothing.
//
// Same rollMode handling as the round-reminder button above, and for the same
// reason: Roll#toMessage overwrites `whisper` from the roll mode in force, so
// a GM-whispered card's roll leaks into public chat unless the mode is set.
// Creature-Driven Level Drain — "Slaying the monster restores all lost time to
// those it fed upon." The card is posted by whoever killed the drainer; the
// CLICK is what carries the permission to write Levels back onto other
// people's characters, which is the same reason .vaarn-recur-apply below is a
// button rather than an automatic effect. (Written before the socket relay,
// combat/gm-relay.js, existed; the card stays because restoring is the
// Referee's call, not because a player's write could not land.)
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-drain-restore').click(async ev =>
  {
    const btn = ev.currentTarget;
    if(!game.user.isGM)
      return ui.notifications.warn("Only the Referee can restore drained Levels.");
    const drainer = game.actors.get(btn.dataset.drainerId);
    if(!drainer) return ui.notifications.warn("That creature no longer exists.");

    // GUARDED ON THE STATE, NOT THE BUTTON, for the reason the affliction
    // handler below records: disabling a button is a DOM flag the message does
    // not keep, so a chat re-render or an F5 brings the card back live. The
    // stash is the truth — restoreDrainsFrom clears it, so a second click
    // finds nothing and says so rather than handing out a second Level.
    const restored = await restoreDrainsFrom(drainer);
    if(!restored.length)
    {
      btn.disabled = true;
      return ui.notifications.warn(`${drainer.name} has nothing left to give back.`);
    }
    btn.disabled = true;

    const lines = restored.map(r =>
      `<li><b>${r.name}</b> regains ${r.levels} Level${r.levels === 1 ? "" : "s"}` +
      ` &rarr; Level ${r.level}.</li>`).join("");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: drainer }),
      content: `<div class="vaarn-chat-card"><h3>Lost time restored</h3><ul>${lines}</ul></div>`
    });
  });
});

// A weapon's printed chance to fail on a hit (Actor Creation from Roll Table,
// 2026-09-18: the Ancient Grenades' "50% chance to not detonate"). Rolls d100
// and says which way it went; the card from _createFailChanceCard carries the
// percentage, so the next weapon with a different chance needs no new code.
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-fail-chance').click(async ev =>
  {
    const btn = ev.currentTarget;
    const percent = Number(btn.dataset.percent);
    const roll = await new Roll("1d100").evaluate({async: true});
    const failed = roll.total <= percent;
    await roll.toMessage({
      speaker: message.speaker,
      flavor: `<b>${btn.dataset.label}</b> — ${failed ? "<b>fails</b> (a dud)" : "<b>works</b>"} (fails on ${percent} or less)`
    });
  });
});

// Character Split/Clone (2026-09-18): the Bifurcating Brew's expiry card.
// Guarded on the state like the drain button above - removeHalf finds no
// Actor on a second click and says so.
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-remove-half').click(async ev =>
  {
    ev.currentTarget.disabled = true;
    await removeHalf(ev.currentTarget.dataset.actorId);
  });
});

// Grant-a-Roll on Another Table, RULED 2026-09-26 (Matt): the Godsbreath
// Star's PSY Save comes at the END of its span, on the card announcing it, and
// a success grants a random Mystic Gift that takes a slot. Rolled by the
// character's owner or the Referee through card-save.js, so the board's DIS
// sources apply.
//
// GUARDED ON THE ACTOR, NOT THE MESSAGE: the expiry card is written by
// whoever advanced the clock, so a player cannot flag it, but they can flag
// their own character. One save per ended entry.
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-end-grant').click(async ev =>
  {
    const btn = ev.currentTarget;
    const actor = game.actors.get(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That character no longer exists.");
    if(!mayRollFor(actor)) return ui.notifications.warn(`Only ${actor.name}'s owner or the Referee can roll this save.`);
    const done = actor.getFlag("vaarn", "endGrantsDone") ?? [];
    if(done.includes(btn.dataset.entryId)) return ui.notifications.warn(`${actor.name} has already made this save.`);
    if(btn.dataset.roster !== "gift") return ui.notifications.warn(`"${btn.dataset.roster}" is not a roster this card can grant from.`);
    btn.disabled = true;
    await actor.setFlag("vaarn", "endGrantsDone", [...done, btn.dataset.entryId]);
    const { verdict } = await rollCardSave(actor, { ability: btn.dataset.save, label: `${btn.dataset.label} — visions` });
    if(!verdict.passed)
      return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
        content: `<b>${btn.dataset.label}</b>: the visions fade and leave nothing behind.` });
    const [gift] = await actor.createEmbeddedDocuments("Item", [randomGiftData()]);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<b>${btn.dataset.label}</b>: ${actor.name} manifests a new Mystic Gift from the visions — <b>${gift.name}</b>.` });
  });
});

// A per-round SPAWN on the round card - the Brood Mother's Brood (Actor
// Spawning from Bestiary, 2026-09-24). GM-only, once per card like the HP
// button, and never automatic: "Fire or blast attacks prevent this" is the
// Referee's to remember, and the button is the reminder. Rolls the count,
// clones the creature from the Bestiary beside the mother, links the card.
Hooks.on('renderChatMessage', (message, html) =>
{
  // A SPLIT the Referee accepts - the Fractalisk, the Glittersludge (Actor
  // Spawning wiring, 2026-09-25). One split per card: the button is spent.
  html.find('.vaarn-split').click(async ev =>
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee splits a creature.");
    const btn = ev.currentTarget;
    if(message.getFlag("vaarn", "splitDone")) return ui.notifications.warn("That split has already been made.");
    const actor = game.actors.get(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That creature no longer exists.");
    await message.setFlag("vaarn", "splitDone", true);
    const made = await performSplit(actor, String(btn.dataset.causes || "").split(",").filter(Boolean), Number(btn.dataset.hp));
    if(!made) return ui.notifications.warn(`${actor.name} has no split rule.`);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `${actor.name} splits — @UUID[${made.uuid}]{${made.name}} (Level ${made.system.level?.value}, ${made.system.health.value} HP`
        + `${remainingActorFlagsOf(made).immuneTo?.length ? `, immune to ${remainingActorFlagsOf(made).immuneTo.join(", ")}` : ""}).` });
  });

  html.find('.vaarn-round-spawn').click(async ev =>
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee births the brood.");
    const btn = ev.currentTarget;
    const entryId = btn.dataset.entryId;
    const label = btn.dataset.label;
    if((message.getFlag("vaarn", "roundAbilityApplied") ?? []).includes(entryId))
      return ui.notifications.warn(`${label} has already been applied this round.`);
    const actor = actorFromRef(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    const entry = (actor.getFlag('vaarn', 'effects') ?? []).find(e => e.id === entryId);
    const spec = entry?.spawn;
    if(!spec) return ui.notifications.warn(`${label} is no longer on ${actor.name}'s board.`);
    const roll = new Roll(spec.dice);
    await roll.evaluate({ async: true });
    const spawned = await spawnBeside(actor, spec.creature, roll.total, { loyal: false });
    if(!spawned) return ui.notifications.warn(`"${spec.creature}" is not in the Bestiary compendium.`);
    const whisper = message.whisper?.length ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [];
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<b>${label}</b> — ${spec.creature}s birthed`, whisper });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper,
      content: `<b>${label}</b>: ${actor.name} births <b>${roll.total}</b> ${spec.creature}${roll.total === 1 ? "" : "s"}` +
        (spawned.length ? ` — ${spawned.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(", ")}` : "") + `.` });
    await message.setFlag("vaarn", "roundAbilityApplied", [...(message.getFlag("vaarn", "roundAbilityApplied") ?? []), entryId]);
  });
});

// Windsong Potion (Elixir-Granted Ability Item, RULED 2026-09-23 by Matt):
// the player's song posts a card naming the weather they called for, and
// THIS button is the Referee's answer - the Weather Override for the Day,
// applied by the one person allowed to. setOverride refuses a non-GM on its
// own; the warning here just says so instead of doing nothing. Top-level
// registration, per the .vaarn-watchdog-kill note below.
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find(`.${WINDSONG_BUTTON}`).click(async ev =>
  {
    if(!game.user.isGM)
      return ui.notifications.warn("Only the Referee decides whether the sky answers.");
    ev.currentTarget.disabled = true;
    const type = await setWeatherOverride(ev.currentTarget.dataset.key);
    if(!type) ui.notifications.warn("That weather is not one the chart knows; nothing changed.");
  });
});

// Lethal Blow Redirection (2026-09-19) — the Watchdog Protocol's fallback.
//
// The owner is ALREADY safe when this card posts: the protection is a write
// that did not happen and needs no permission. Only the hound's death does,
// and a player who rolled their own attack cannot write to it — the same
// no-socket constraint .vaarn-drain-restore and .vaarn-recur-apply are built
// around, with the Referee's click carrying the permission.
//
// GUARDED ON THE STATE, NOT THE BUTTON, for the reason both of those record:
// a disabled button is a DOM flag the message does not keep, so a chat
// re-render or an F5 brings the card back live. A hound already at 0 is
// already dead and the second click says so.
//
// THE KILL IS NOT ATTRIBUTED on this path, unlike the direct one in
// _doDamage. Nothing at click time knows who attacked or with what, so
// Blood-Rapturous and More! are not offered a kill they cannot be told the
// weapon for. The direct path is the ordinary one and does attribute it.
//
// THE REGISTRATION MUST BE TOP-LEVEL, found in Group 235 by the test that
// clicked this button as a player: it first shipped nested inside the
// .vaarn-remove-half handler above, so a new hook was registered on EVERY
// chat render and one click fired 133 handlers. Nothing errored - the guard
// below turned all 133 into warnings, which is the only reason it was
// visible at all. Count the closing braces when adding a hook beside another.
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-watchdog-kill').click(async ev =>
  {
    if(!game.user.isGM)
      return ui.notifications.warn("Only the Referee can resolve the Watchdog Protocol.");
    const dog = game.actors.get(ev.currentTarget.dataset.dogId);
    if(!dog) return ui.notifications.warn("That companion no longer exists.");
    if((dog.system.health.value ?? 0) <= 0)
    {
      ev.currentTarget.disabled = true;
      return ui.notifications.warn(`${dog.name} is already dead.`);
    }
    ev.currentTarget.disabled = true;
    // The one kill route (Shared Pipelines chunk 4): temp HP, Defeated and the
    // kill reported like any death; the funnel posts this line as its own.
    kill(dog, { line: "is killed — <b>Watchdog Protocol</b>." });
  });
});

// LOOK OUT SIRE (Lethal Blow Redirection, RULED 2026-09-26 by Matt): the held
// blow's card. One button per living protector - that protector dies in the
// protectee's place, and the kill is the attacker's - and one that lets the
// blow land, re-run from the attack as it arrived. GM-only; a card resolves
// once. Top-level, per the registration note above.
Hooks.on('renderChatMessage', (message, html) =>
{
  const held = message.flags?.vaarn?.[HELD_BLOW_FLAG];
  if(!held) return;
  if(held.resolved) { html.find('.vaarn-protector-die, .vaarn-protector-land').prop('disabled', true); return; }

  const begin = async () =>
  {
    if(!game.user.isGM) { ui.notifications.warn("Only the Referee resolves Look Out Sire."); return null; }
    if(message.flags?.vaarn?.[HELD_BLOW_FLAG]?.resolved) { ui.notifications.warn("That blow is already resolved."); return null; }
    const attacker = await fromUuid(held.attackerUuid);
    const sheet = attacker?.sheet;
    if(!sheet?._doDamage) { ui.notifications.warn("The attacker no longer exists."); return null; }
    await message.update({ [`flags.vaarn.${HELD_BLOW_FLAG}.resolved`]: true });
    return { attacker, sheet, item: held.itemId ? attacker.items.get(held.itemId) : null };
  };

  html.find('.vaarn-protector-die').click(async ev =>
  {
    const protector = await fromUuid(ev.currentTarget.dataset.protectorUuid);
    if(!protector || !canStandIn(protector)) return ui.notifications.warn("That protector can no longer stand in.");
    const ctx = await begin();
    if(!ctx) return;
    const protectee = await fromUuid(held.actorUuid);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: protector }),
      content: `<b>${protector.name}</b> dies in <b>${protectee?.name ?? "their charge"}</b>'s place — <b>Look Out Sire</b>.` });
    const outcome = kill(protector);
    // The kill is the attacker's (Matt): Blood-Rapturous reads the protector,
    // the creature that died, exactly as the Synthhound's death is read.
    // From the weapon's sentences since Weapon Tags chunk 4 (weapon-heals.js).
    const heal = outcome === "killed" ? killHealFor(ctx.item, protector) : 0;
    ctx.sheet._applyAttackHeals([{ verb: "feeds on the death of", label: killHealSourceOf(ctx.item), amount: heal, victims: 1 }], ctx.item?.name);
    if(outcome === "killed" && held.isMelee) ctx.sheet._postKillReactionReminder(1);
  });

  html.find('.vaarn-protector-land').click(async () =>
  {
    const ctx = await begin();
    if(!ctx) return;
    const tokenDoc = held.tokenUuid ? await fromUuid(held.tokenUuid) : null;
    const target = tokenDoc?.object ?? tokenDoc ?? { actor: await fromUuid(held.actorUuid) };
    if(!target?.actor) return ui.notifications.warn("The protectee no longer exists.");
    const res = ctx.sheet._doDamage(target, held.dmg, held.isMelee, ctx.item, held.rollMultiplier ?? 1, held.components, { skipProtect: true });
    ctx.sheet._applyAttackHeals([
      { verb: "drains", label: hitHealSourceOf(ctx.item), amount: res.vampiricHeal ?? 0, victims: 1 },
      { verb: "drains", label: ctx.item?.name ?? "the attack", amount: res.drainHeal ?? 0, victims: 1 },
      { verb: "feeds on the death of", label: killHealSourceOf(ctx.item), amount: res.bloodRapturousHeal ?? 0, victims: 1 },
    ], ctx.item?.name);
    if(res.killed && held.isMelee) ctx.sheet._postKillReactionReminder(1);
  });
});

Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-recur-apply').click(async ev =>
  {
    const btn = ev.currentTarget;
    if(!game.user.isGM)
      return ui.notifications.warn("Only the Referee can apply an affliction's effects.");
    const actor = game.actors.get(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");

    const entry = (actor.getFlag('vaarn', 'effects') ?? [])
      .find(e => e.id === btn.dataset.entryId);
    const def = recurrenceByKey(entry?.recurrenceKey);
    if(!def) return ui.notifications.warn("That affliction is no longer running.");

    // GUARDED ON THE ENTRY, NOT ON THE BUTTON. Disabling the button is only a
    // DOM flag and is not stored in the message, so a chat re-render or an F5
    // brings the card back live and the same tick can be applied twice. Found
    // in live testing 2026-09-09.
    const index = Number(btn.dataset.tickIndex);
    if(alreadyActioned(entry, "appliedIndex", index))
    {
      btn.disabled = true;
      return ui.notifications.warn(`${def.name} has already been applied for this tick.`);
    }

    const ticks = Math.max(1, Number(btn.dataset.ticks) || 1);
    const { lines, death } = await applyTickLosses(actor, def, ticks);
    await updateRecurrenceIndex(actor, entry.id, "appliedIndex", index);
    btn.disabled = true;
    if(!lines.length) return ui.notifications.info(`${actor.name}: nothing to apply.`);

    // Reported in chat rather than only as a notification, and at the source
    // card's visibility. A notification fades; what a disease took off a
    // character is exactly the sort of thing that needs to still be readable
    // afterwards, which is the same reason the Wounds table posts its own line.
    await ChatMessage.create({
      content: `<p><b>${actor.name} — ${def.name}</b></p><ul><li>${lines.join("</li><li>")}</li></ul>`,
      speaker: ChatMessage.getSpeaker({ actor }),
      whisper: message.whisper?.length ? [...message.whisper] : []
    });
    // The zero-max-HP sentence, deferred by applyTickLosses so it follows the
    // report of the loss that caused it (Group 364).
    if(death)
      await ChatMessage.create({ content: death, speaker: ChatMessage.getSpeaker({ actor }),
        whisper: message.whisper?.length ? [...message.whisper] : [] });
  });

  // Gift Sustained Use Cost. The one recurrence button that is NOT Referee-
  // only, and the inconsistency is deliberate: casting a Gift already pays its
  // HP from the player's own sheet through _resolveGiftUse, so requiring the
  // Referee to click for every held Gift every Exploration Turn would make
  // sustaining harder to run than casting, for the same HP out of the same
  // character. Owner or GM, which is who can spend that HP anywhere else.
  html.find('.vaarn-recur-pay').click(async ev =>
  {
    const btn = ev.currentTarget;
    const actor = game.actors.get(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    if(!actor.isOwner)
      return ui.notifications.warn("Only that character's player or the Referee can pay a sustained Gift's cost.");

    const entry = (actor.getFlag('vaarn', 'effects') ?? [])
      .find(e => e.id === btn.dataset.entryId);
    const faces = Number(entry?.giftDieFaces) || 0;
    if(!faces) return ui.notifications.warn("That Gift is no longer being sustained.");

    // Same entry-level guard as the two affliction buttons above, and the same
    // reason: the disabled flag lives in the DOM and not in the message, so an
    // F5 or a new card arriving brings this button back live. Charging a
    // sustained Gift twice for one period is silent and looks identical.
    const index = Number(btn.dataset.tickIndex);
    if(alreadyActioned(entry, "appliedIndex", index))
    {
      btn.disabled = true;
      return ui.notifications.warn(`${entry.name} has already been paid for this period.`);
    }

    // ONE ROLL OF Nd<faces> rather than N rolls, so a card covering several
    // periods charges in one act and reads as one number.
    const ticks = Math.max(1, Number(btn.dataset.ticks) || 1);
    const roll = new Roll(`${ticks}d${faces}`);
    await roll.evaluate({async: true});
    const gmOnly = !!message.whisper?.length;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<b>${entry.name}</b> — sustained HP cost${ticks > 1 ? ` (${ticks} periods)` : ""}`
    }, {
      rollMode: gmOnly ? CONST.DICE_ROLL_MODES.PRIVATE : CONST.DICE_ROLL_MODES.PUBLIC
    });

    // INDEX BEFORE HP, unlike the affliction button above, and for the reason
    // _onUsageDieRoll gives: _resolveHPChange can post a Wound and open things,
    // so the guard is recorded first and cannot be lost to whatever the wound
    // path does next.
    await updateRecurrenceIndex(actor, entry.id, "appliedIndex", index);
    btn.disabled = true;

    // Through the sheet on purpose. This is the single entry point that knows
    // a character below 0 goes to the Wounds table, and Matt's 2026-09-13
    // ruling is that a sustained Gift keeps charging past 0 and starts causing
    // wounds — which is what this call already does, with nothing added here.
    // Same reuse as the Reflecting tag's retaliation below.
    const currentHP = actor.system.health.value;
    actor.sheet._resolveHPChange(actor, currentHP, currentHP - roll.total);
  });

  // A PC becomes a creature - Hiveyhump's Hiveyman, the Gitch's Gitchghast
  // (Actor Spawning wiring, 2026-09-25). The creature's token takes the PC's
  // place; the PC Actor stays in the world. Once per card.
  html.find('.vaarn-recur-becomes').click(async ev =>
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee can make that change.");
    const btn = ev.currentTarget;
    if(message.getFlag("vaarn", "becomesDone")) return ui.notifications.warn("That change has already been made.");
    const actor = game.actors.get(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That character no longer exists.");
    await message.setFlag("vaarn", "becomesDone", true);
    const made = await spawnInPlace(actor, btn.dataset.creature);
    if(!made) return ui.notifications.warn(`"${btn.dataset.creature}" is not in the Bestiary compendium.`);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<b>${actor.name}</b> is gone — in their place stands @UUID[${made.uuid}]{${made.name}}. `
        + `<i>The character sheet is kept; its tokens were replaced.</i>` });
  });

  html.find('.vaarn-recur-item').click(async ev =>
  {
    const btn = ev.currentTarget;
    if(!game.user.isGM)
      return ui.notifications.warn("Only the Referee can apply an affliction's effects.");
    const actor = game.actors.get(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");

    const entry = (actor.getFlag('vaarn', 'effects') ?? [])
      .find(e => e.id === btn.dataset.entryId);
    const def = recurrenceByKey(entry?.recurrenceKey);
    if(!def) return ui.notifications.warn("That affliction is no longer running.");

    // Same entry-level guard as the apply button above, and a separate counter
    // so that using one button never blocks the other on the same card.
    const index = Number(btn.dataset.tickIndex);
    if(alreadyActioned(entry, "itemIndex", index))
    {
      btn.disabled = true;
      return ui.notifications.warn(`${def.name} has already been actioned for this tick.`);
    }

    // One click applies every tick the card reported, rather than making the
    // Referee press it N times for a span that was advanced in one act.
    const ticks = Math.max(1, Number(btn.dataset.ticks) || 1);
    const done = [];
    for(let i = 0; i < ticks; i++)
    {
      if(btn.dataset.op === 'addWound')
        done.push((await addWoundSlot(actor, def.producesWound, def.key))?.name);
      else if(btn.dataset.op === 'removeWound')
      {
        const gone = await removeWoundSlot(actor, def.consumesWound.name);
        // Running out is how a fading affliction ENDS, not a failure — stop
        // quietly rather than warning once per remaining tick.
        if(!gone) break;
        done.push(gone.name);
      }
      else if(btn.dataset.op === 'extrude')
        done.push((await extrudeObject(actor, entry.objectLabel ?? def.name))?.name);
      // A fading loss - the Occulith's lithification (2026-09-25). A point
      // off each half per tick; null once nothing is left, which ends it.
      else if(btn.dataset.op === 'fade')
      {
        const left = await fadeOnce(actor, entry.id);
        done.push(def.name);
        if(!left) break;
      }
    }
    if(btn.dataset.op === 'fade')
    {
      const now = (actor.getFlag('vaarn', 'effects') ?? []).find(e => e.id === entry.id);
      btn.disabled = true;
      if(now) await updateRecurrenceIndex(actor, entry.id, "itemIndex", index);
      return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
        content: now ? `<b>${def.name}</b> fades — ${fadingSummary(now.applied)} remains.`
                     : `<b>${def.name}</b> has faded completely.` });
    }
    await updateRecurrenceIndex(actor, entry.id, "itemIndex", index);
    btn.disabled = true;
    ui.notifications.info(done.length
      ? `${actor.name}: ${done.length} slot(s) — ${def.name}.`
      : `${actor.name}: nothing left to clear for ${def.name}.`);
  });

  // The daily save Lumenrot and the Gitch print, rolled FROM THE CARD since
  // 2026-09-16 (Save-Modifier Effects on the Forgettable Tab). OWNER OR
  // REFEREE, like the Gift button: it is the character's own save. The roll
  // reports and applies nothing — the Apply button beside it stays the
  // Referee's, exactly as the exposure card's save arms Infect without
  // pressing it. Its own counter, so rolling never blocks applying. One roll
  // per owed tick, since each tick is a day and each day has its save.
  html.find('.vaarn-recur-save-roll').click(async ev =>
  {
    const btn = ev.currentTarget;
    const actor = game.actors.get(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    if(!mayRollFor(actor))
      return ui.notifications.warn("Only that character's player or the Referee can roll this save.");

    const entry = (actor.getFlag('vaarn', 'effects') ?? [])
      .find(e => e.id === btn.dataset.entryId);
    const def = recurrenceByKey(entry?.recurrenceKey);
    if(!def?.save) return ui.notifications.warn("That affliction is no longer running.");

    const index = Number(btn.dataset.tickIndex);
    if(alreadyActioned(entry, "savedIndex", index))
    {
      btn.disabled = true;
      return ui.notifications.warn(`${def.name}'s save has already been rolled for this tick.`);
    }

    // The same modifiers the exposure card used, asked of the same function,
    // so the two saves against one affliction cannot disagree about ADV.
    const mods = afflictionSaveModifiers(actor, afflictionDefByKey(def.key));
    const target = afflictionSaveTarget(def.virulence);
    const ticks = Math.max(1, Number(btn.dataset.ticks) || 1);
    const gmOnly = !!message.whisper?.length;
    let failed = 0;
    for(let i = 0; i < ticks; i++)
    {
      const r = await rollCardSave(actor, {
        ability: String(def.save.ability).toLowerCase(),
        label: `${def.name} — daily save`,
        target,
        advSources: mods.advSources,
        disSources: mods.disSources,
        rollMode: gmOnly ? CONST.DICE_ROLL_MODES.PRIVATE : CONST.DICE_ROLL_MODES.PUBLIC,
      });
      if(!r.verdict.passed) failed++;
    }
    await updateRecurrenceIndex(actor, entry.id, "savedIndex", index);
    btn.disabled = true;
    // Several ticks in one card is the rare case; say the tally once so the
    // Referee knows how many times to press Apply.
    if(ticks > 1)
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><b>${actor.name} — ${def.name}</b>: ${failed} of ${ticks} daily saves failed.</p>`,
        whisper: message.whisper?.length ? [...message.whisper] : []
      });
  });
});

Hooks.on('renderChatMessage', (message, html) =>
{
  // Bound to the Host - the Usurper Arm, RULED 2026-09-24 (Matt). The miss
  // card is whispered; the button rolls the attacking weapon's damage and
  // applies it to the host through _doDamage WITH THE WEAPON, so the host's
  // type rules decide it. Once per card.
  html.find('.vaarn-bound-host').click(async ev =>
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee applies this.");
    const btn = ev.currentTarget;
    if(message.getFlag("vaarn", "boundHostApplied"))
      return ui.notifications.warn("That miss has already been applied to the host.");
    const attacker = await fromUuid(btn.dataset.attackerUuid);
    const item = attacker?.items?.get(btn.dataset.itemId);
    const host = game.actors.get(btn.dataset.hostId);
    if(!attacker || !item || !host) return ui.notifications.warn("The attacker, its weapon or the host no longer exists.");
    const formula = statOf(item, "damage-dice");
    if(!formula) return ui.notifications.warn(`${item.name} has no damage roll.`);
    await message.setFlag("vaarn", "boundHostApplied", true);
    const roll = await new Roll(formula).evaluate();
    const min = (await new Roll(formula).evaluate({ minimize: true })).total;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: attacker }),
      flavor: `<b>${item.name}</b> damage to <b>${host.name}</b> — Bound to the Host` });
    attacker.sheet._doDamage({ actor: host }, roll.total, item.type === "weaponMelee", item, 1,
      [{ amount: roll.total, min, name: item.name, types: null }]);
  });

  html.find('.vaarn-reflect-damage').click(async ev =>
  {
    const btn = ev.currentTarget;
    const attacker = game.actors.get(btn.dataset.attackerId);
    if(!attacker?.sheet) return;
    // WHO APPLIES IT (Effect Engine ruling A, 2026-10-04, applied here in
    // Shared Pipelines chunk 2): the owner of the effect's SOURCE - the
    // Reflecting weapon's wielder - or the GM. And ONCE: the card had no guard,
    // so every click dealt the damage again.
    const defender = game.actors.get(btn.dataset.defenderId);
    if(!game.user.isGM && !defender?.isOwner)
      return ui.notifications.warn(`Only the Referee or ${defender?.name ?? "the Reflecting weapon's wielder"}'s player can apply this.`);
    const message = game.messages.get(btn.closest("[data-message-id]")?.dataset.messageId);
    if(message?.getFlag("vaarn", "reflectApplied"))
      return ui.notifications.warn("The reflected damage has already been dealt.");
    await message?.setFlag("vaarn", "reflectApplied", true);
    btn.disabled = true;
    const roll = new Roll(btn.dataset.damageDice);
    await roll.evaluate({async: true});
    const min = (await new Roll(btn.dataset.damageDice).evaluate({ minimize: true })).total;
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      flavor: `Reflected <b>${btn.dataset.weaponName}</b> damage to <b>${attacker.name}</b>`
    });
    // Through the whole HP pipeline (chunk 2): the attacker's own weapon, so its
    // damage types meet the attacker's own immunities, from the wielder.
    const item = btn.dataset.itemUuid ? await fromUuid(btn.dataset.itemUuid) : null;
    dealDamage(attacker, roll.total, { source: defender ?? null, item, min, name: btn.dataset.weaponName,
      isMelee: item?.type === "weaponMelee" });
  });
});

// Character creator entry point #1: a button in the Actors sidebar header,
// next to "Create Actor" — the most discoverable "self-serve" path for a
// player, not just the GM. Foundry's default permissions still gate whether
// Actor.create actually succeeds for a non-GM user; see chargen-app.js's
// class comment for the follow-up this leaves open.
Hooks.on('renderActorDirectory', (app, html) =>
{
  // renderActorDirectory fires on every sidebar re-render (e.g. any time an
  // actor is created/deleted, not just on first open) — without this guard
  // the button would be appended again each time and pile up duplicates.
  if(html.find(".knave-open-chargen").length) return;

  const button = $(`<button type="button" class="knave-open-chargen"><i class="fas fa-user-plus"></i> Create Character (Vaarn)</button>`);
  button.click(() => new KnaveCharacterCreator().render(true));
  // jQuery's .find() always returns a (possibly empty) collection, never
  // null/undefined, so a plain "??" fallback would never actually trigger —
  // check .length explicitly to fall back if this Foundry version's
  // directory header doesn't have a nested .header-actions row.
  let header = html.find(".directory-header .header-actions");
  if(!header.length) header = html.find(".directory-header");
  header.append(button);
});

// Build the system compendiums from tracked source when they are empty, so
// installing into a brand-new world yields the book content with no manual
// step. packs/ is a BUILD OUTPUT and is no longer in version control - see
// module/pack-build.js for why tracking a LevelDB never worked.
// The Exploration Clock lives in the Scene Controls, beside the token
// tools — a Referee reaches for it while looking at the map, not in the
// sidebar. Registered at top level because it only installs a hook; the
// GM check happens inside, when that hook actually fires.
registerClockControls();

// Weather Procedure — the desert hex-chart, in the same tool group and for the
// same reason. RULED 2026-09-12 (Matt) that the weather ties to no other
// mechanism, so Heatwave does not reach rest.js. The one exception, ruled the
// same day, is the Vigilance Die: day-start.js rolls the weather and the die
// in one sequence, so the Hazy and Dust Storm disadvantage is applied rather
// than merely printed. See the `vigilance` field in time/weather-data.js.
registerWeatherControls();

// Faction Entry Display — the reader for a faction's whole entry, beside the
// Weather window because it is the same kind of tool: a thing the Referee opens
// mid-session, reads, and closes. The EDITOR stays in Game Settings, where a
// world-configuration menu belongs; this is the half that is consulted rather
// than changed, and it is GM-only for the same reason the editor is.
registerFactionBrowserControls();

// Start-of-Day Roll Sequence — the Vigilance offer card's own button. Not
// GM-gated, and that is the whole point of it: the book says "the players may
// collectively roll", so the card is public and the button is theirs to race
// for. The sequence that POSTS the card is GM-only and lives on the clock.
registerDayStartCardButtons();
registerAfflictionCardButtons();
registerCompelledSaveCardButtons();
// Trap Resolution - save and damage buttons on a rolled vault hazard.
registerTrapCardButtons();
// Roll Card Visibility - a private Vaarn table's card goes to the GM alone.
registerRollCardVisibility();
registerPageRefStripping();
registerGambitCardButtons();
registerCorrosionCardButtons();
// Broken Item State (2026-10-09): a broken Item does not stay equipped.
registerBrokenHooks();
registerGiftApplyButtons();
registerEffectCardButtons();
registerGateSocket();
registerValueReaches();
registerWeaponFeeding();
registerEquationDamageButtons();
registerHealingFieldButtons();

// The Active Effect Board sits beside the clock in the same tool group, and
// its registration is NOT GM-gated — that is the difference from the clock,
// and the reason the board is a sibling window rather than a panel inside it.
// A player opens this to see what is running on them.
registerBoardControls();

// Clock-scale expiry — foundry-system-index.csv "Active Effect Board" and
// "Timed Condition Duration". Sweeps whatever ran out and posts one card for
// the whole advance, however far it moved.
//
// ONE POSTER, and isGM is not enough to pick one: Matt is permanently
// connected as Gamemaster, so any automation or second GM session makes two
// users for whom isGM is true and each posts its own copy. That exact
// confusion double-posted every round-effect card until testing found it on
// 2026-09-08. activeGM resolves to the same single user on every client.
// ONE AT A TIME (2026-10-06, Group 563). The board's sweep, Long-Clock
// Recurrence and Activity Time Cost each read and rewrite the same vaarn.effects
// flag on this hook, and Foundry does not wait for one async handler before
// starting the next - so they interleaved, and whichever wrote last from a stale
// read won. A recurrence tick written after the Gitch's debridement was marked
// announced dropped the mark, and "Effort complete" posted again on the next
// clock move. Queued here in a fixed order: the sweep, then recurrences, then
// activities LAST, because a finished effort fires its consumers (the cure)
// without awaiting them, and those must not race a recurrence's write.
let timeQueue = Promise.resolve();
const inTurn = fn => (timeQueue = timeQueue.then(fn).catch(err => console.error("vaarn | time hook", err)));

Hooks.on(TIME_HOOK, payload =>
{
  if(game.user !== game.users.activeGM) return;
  return inTurn(() => onEffectBoardTime(payload));
});

// Long-Clock Recurrence rides the same hook and the same activeGM guard, for
// the same two reasons activity.js is a separate subscription: it imports
// effect-board.js for its storage, so a call from inside the board's sweep
// would make the pair import each other, and it asks a third question again —
// not what ran out and not what finished, but what is OWED since last time.
//
// Deliberately NOT guarded on a positive delta here. The module needs the
// negative ones too, so that a rewind can un-fire a tick rather than stranding
// it; its own comment gives the reasoning.
Hooks.on(TIME_HOOK, payload =>
{
  if(game.user !== game.users.activeGM) return;
  return inTurn(() => onRecurrenceTime(payload));
});

// Activity Time Cost rides the same hook and the same activeGM guard, but is
// a SEPARATE subscription rather than a call inside the board's own sweep.
// Two reasons, and the first is structural: activity.js imports
// effect-board.js for the entry storage, so the board calling back into it
// would make the pair import each other. The second is that they answer
// opposite questions — the board asks what has run out and deletes it, this
// asks what has reached its finish line and deliberately does not.
Hooks.on(TIME_HOOK, payload =>
{
  if(game.user !== game.users.activeGM) return;
  return inTurn(() => onActivityTime(payload));
});

// What HAPPENS when an effort reaches its finish line. Wired here rather than
// inside activity.js so that module never learns what any particular effort is
// for — an effort is a span of time, and a branch per consumer inside it would
// make the clock know about attunement, repairs and chanting alike.
//
// No activeGM guard: onTimeAdvance already fires only on that one client, so
// this hook is raised once and adding a second guard would only hide it if
// the first ever changed.
Hooks.on(ACTIVITY_COMPLETE_HOOK, payload => onAttunementComplete(payload));
// A treatment that takes time - the Gitch's crystal debridement, RULED
// 2026-09-24 (Matt): at the finish line it cures, and removes the crystals.
Hooks.on(ACTIVITY_COMPLETE_HOOK, payload => onTreatmentComplete(payload));

// A second consumer of the same hook, a Faa Nomad summoning a Sandworm by
// Worm Rider, was removed 2026-09-21: JADE IBIS replaced Worm Rider with
// Ambusher and Worm Wise, neither of which runs on the activity clock.

// Apply Effect to Target. Registered from its own module for the same reason
// as the line above: the card's button, its spent-state flag and its
// three-step target fallback are one concern, and a second consumer should
// change that file rather than this one.
registerApplyCardButtons();

// Fleeing Combat. The failure card's "Drop items and flee" control; registered
// from its own module for the same reason as the two lines above.
registerFleeCardButtons();

// Ambush Resolution. Two registrations because they answer to different
// surfaces — a control on the combat tracker, and the roster card's own
// buttons — and only the first is GM-gated. The card's rows are clicked by
// the players whose characters must save, so binding them behind isGM would
// leave every player row inert.
registerAmbushControls();
registerAmbushCardButtons();

// Max HP reaching 0 is instant death (Matt, 2026-09-03). Registered on the
// WRITE rather than at any one writer: it lived inside the Annihilating equip
// branch until Group 223 found a poison driving max HP to 0 in silence, which
// is the failure a per-writer check invites every time a new writer appears.
registerZeroMaxHpDeath();

// A grafted limb's live AV follows its host (the Fleshwarp's Grafted Arm,
// RULED 2026-09-26 by Matt): re-prepare the limb when the host changes.
registerGraftedArm();

// Hidden Hit Points (Analgesia): a player never sees this character's HP.
// The Token class half is set in init, before the canvas draws.
registerHiddenHP();

registerPackBuild();
registerGuidePacks();

// The world's one "ground" box — foundry-system-index.csv "Dropped Item
// Container". Made once, on exactly one GM client, because Actor creation is
// not a player permission: v11 defaults ACTOR_CREATE to ASSISTANT and this
// world stores [3,4]. Creating it up front is what lets a player drop with no
// GM present, which a lazily-created box could never do for the first drop.
//
// ensureContainer() is the one that decides — it is a no-op unless this
// client is game.users.activeGM AND no box exists — so this hook stays a
// plain unconditional call and the rule lives in one place.
Hooks.once('ready', () => ensureContainer());

Hooks.once('init', async function() {

  game.knave = {
    KnaveActor,
    KnaveItem,
    KnaveCharacterCreator,
    VaarnExplorationClock,
    VaarnWeatherApp,
    VaarnEffectBoard
  };

  /**
   * Initiative. Vaarn offers four alternative systems and the GM picks one
   * per world, so the real logic is in module/combat/initiative.js and
   * VaarnCombat overrides rollInitiative wholesale.
   *
   * The formula below is now only a fallback for anything that reaches
   * CONFIG directly without going through the override — none of the four
   * systems is expressible as a per-combatant formula, which is precisely
   * why the override exists. `decimals` matters though: Goliath breaks HP
   * ties in the PCs' favour with a +0.5, so whole numbers would collapse
   * exactly the tie the book says to break.
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };
  CONFIG.Combat.documentClass = VaarnCombat;
  registerHiddenHPToken();
  registerInitiativeSetting();
  registerGateSettings();
  registerVaultSettings(); // the Generate Vault window's saved settings (Vault Journal)
  registerVaultControls(); // roll a vault room's lair and treasure from its page (Contents Buttons on Vault Pages)
  registerRegionControls(); // a region's Vault page generates its vault when wanted (Region Generator)
  registerSettlementControls(); // a settlement's places are revealed on its map from its journal (Settlement Creation)
  registerVaultLocation(); // the vault level the party is on (Vault Encounters from the Exploration Clock)
  registerRegionLocation(); // the region section the party is in (Region Generator)
  registerVaultEncounterCards(); // Spawn one on a vault encounter card
  registerVaultScenes(); // activating a vault level's Scene sets the party's level (Vault Scene)

  // Exploration Turn Structure — the clock the whole travel cluster hangs
  // off. registerTimeHooks re-emits updateWorldTime as one named hook so
  // Timed Condition Duration and Light Source Duration have a single thing
  // to listen to; see time/vaarn-time.js for why this is not a Combat.
  registerClockSettings();
  registerTimeHooks();

  // Weather Procedure. The world stores only the marker hex, the day count and
  // a short trail; the chart itself is code, in time/weather-data.js.
  registerWeatherSettings();

  // Gambit List Override — the house additions and the suppressions or
  // rewordings of the book's seven. Registered here rather than beside the
  // gambit card itself because a setting has to exist before anything reads
  // it, and storedOverrides() degrades to "no overrides" if asked too early.
  registerGambitSettings();

  // Faction Registry, registered here for the same reason as the gambits
  // above: storedRegistry() degrades to "the book's eight, nothing hidden"
  // if asked before the setting exists, which would silently look correct.
  registerFactionSettings();

  // Faction Relationship Graph, registered beside the registry it layers on.
  // It stores only DEVIATIONS from the graph faction-data.js states, so an
  // absent setting is not an empty graph - it is the book unmodified, which
  // is why storedGraph() degrading to no-overrides is the correct failure.
  registerFactionGraphSettings();

  // Vaarn UI Reskin. Client settings are readable from init, so the body
  // classes go on before any sheet can render in the old colours.
  registerThemeSettings();
  applyTheme();

  // Define custom Entity classes
  CONFIG.Actor.documentClass = KnaveActor;
  CONFIG.Item.documentClass = KnaveItem;
  // Player Write Relay to the GM: writes a player may not make go to the
  // active GM (combat/gm-relay.js). After the document classes, which it wraps.
  registerGmRelay();
  // Player Token Placement: a player drags out tokens of what they own; the
  // GM's client places them. Before the sidebar is built (actor/token-placement.js).
  registerTokenPlacement();
  // Synthetic Mind Magnetic Damage: the d6-INT-each-round button on every
  // magnetic field's card (combat/metal-cards.js).
  registerSynthMindButtons();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("vaarn", KnaveActorSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("vaarn", KnaveNpcSheet, { types: ["npc"], makeDefault: true });
  Actors.registerSheet("vaarn", VaarnContainerSheet, { types: ["container"], makeDefault: true });
  Actors.registerSheet("vaarn", VaarnVehicleSheet, { types: ["vehicle"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("vaarn", KnaveItemSheet, { makeDefault: true });

  // Handlebars partials. The Toxin Die row is the first block both actor
  // sheets render, so it lives in one file rather than being copied into
  // each — see the partial's own header. loadTemplates registers each under
  // its full path, which is the name the {{> "..."}} calls use.
  await loadTemplates([
    "systems/vaarn/templates/actor/parts/toxin-row.html",
    "systems/vaarn/templates/actor/parts/deprived-row.html",
    "systems/vaarn/templates/actor/parts/rest-row.html",
    "systems/vaarn/templates/apps/parts/faction-added.html",
    "systems/vaarn/templates/item/parts/effects-tab.html",
    "systems/vaarn/templates/item/parts/usage-die.html",
    "systems/vaarn/templates/item/parts/broken.html",
  ]);

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });

  // Generic equality helper — first needed by armor-sheet.html's new "Slot"
  // dropdown (work-queue item 11), no equivalent existed anywhere else.
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  // Is this string one of the entries in that array? Needed by the faction
  // editor, whose ally/enemy pickers are multi-selects — Foundry has no
  // built-in for "selected" against a list, and {{#if}} takes no operators.
  Handlebars.registerHelper('inList', function(list, value) {
    return Array.isArray(list) && list.includes(value);
  });

  Handlebars.registerHelper('isWeapon', function(item)
  {
      return (item.type === 'weaponMelee' || item.type === 'weaponRanged');
  });

  // Whether an item gets the per-round reminder toggle at all.
  //
  // A HEURISTIC ON PURPOSE, and its failure mode is the mild one: a miss
  // means a missing toggle, which the GM can see, rather than a wrong
  // reminder, which they cannot. It reads the item's own text, so it
  // surfaces exactly the elixirs, codex effects and spore rules the
  // round-duration triage filed on 2026-09-08 without any per-atom data.
  // An already-active effect always shows, or there would be no way to
  // switch off something the wording later stopped matching.
  Handlebars.registerHelper('canRoundRemind', function(item)
  {
    if(isRoundEffectActive(item)) return true;
    // THE FIELD CARRIES THE TIMER, not the thing that set it down (Matt,
    // 2026-09-22). Dropping the Biotic Field Generator's declaredSpan was half
    // the answer; its description still says "+d10 HP per round while in the
    // cloud", and that wording alone earns a toggle. The cloud's rounds are
    // the Biotic Field actor's own board entry, so a second timer on the
    // generator would count the same span twice and outlive it - the
    // generator is deleted when its usage die runs out.
    if(fieldGeneratorOf(item)) return false;
    // A DECLARED HP TICK (Direct HP Adjustment, 2026-09-23). The Jollyhoss's
    // Two Are One has no per-round wording - it returns "at the start of the
    // next combat round" - so the declaration, not the text, arms its toggle.
    if(creatureFlagsOf(item).hpTick) return true;
    // TWO WORDINGS, NOT ONE. Widened 2026-09-08, and found by testing rather
    // than by reading: the dialog had already grown from rounds to four units,
    // but this gate had not, so an item whose duration is purely clock-scale
    // got no control at all and could not be tracked from the sheet. Lumensoup
    // — "Lasts 8 Exploration Turns", no per-round clause anywhere — was
    // completely unreachable, which is most of what Timed Condition Duration
    // was built for.
    //
    // The failure is the shape this file already warns about elsewhere: a
    // missing control looks exactly like an item that has no duration, so
    // nothing about the sheet said anything was wrong.
    // A DECLARED SPAN BEATS A PARSED ONE (2026-09-08). Found the first time
    // Windweird's rule became an Item: parseDuration read "One hour of
    // chanting" and offered it as a DURATION, so the sheet proposed tracking a
    // one-hour condition that does not exist — the hour is what the chanting
    // COSTS. The text says so plainly and the parser cannot tell, which is the
    // whole reason ruleItems keys on a declaration rather than on wording.
    //
    // Latent rather than introduced: canRoundRemind would always have matched
    // this text; there was simply no Item carrying it until now.
    //
    // PER_ROUND_WORDING still wins, because a genuine per-round tick is a
    // different claim from a parsed duration and a rule may have both. Only
    // the guessed duration is suppressed, and only where something better has
    // been declared.
    // A creature rule Item's words from its sentence since Effect Engine: Creatures
    // chunk 2c-ii (2026-10-06); any other Item's still from its text.
    if(roundWordingOf(item).perRound) return true;
    // THE ACTIVITY GUARD IS GONE (2026-09-20), and its absence is the point.
    // It was added 2026-09-08 to stop a PARSED duration being offered for
    // Windweird, whose "one hour of chanting" is a cost. Its own comment said
    // "only the guessed duration is suppressed". There is no guess any more —
    // the roster declares that the weather "remains for the rest of the day" —
    // so the guard had stopped suppressing a guess and started suppressing a
    // real declaration, and Windweird's rule lost its control entirely.
    // Found by testing, Group 251.9, not by reading.
    //
    // Nothing replaces it, because under strict it cannot matter: an activity
    // Item that declares no span already returns false on the next line.
    // STRICT SINCE 2026-09-20 (Elixir Duration as Roster Data). This used to be
    // !!parseDuration(t), which guessed from the Item's prose and was wrong or
    // misleading on 58 of the 95 roster entries that state a time. An Item now
    // gets the control only when its roster DECLARED a span, so no control and
    // no declaration mean the same thing on purpose.
    return hasDeclaredSpan(item);
  });

  Handlebars.registerHelper('isRoundEffectActive', function(item)
  {
    return isRoundEffectActive(item);
  });

  Handlebars.registerHelper('isWound', function(item)
  {
      return item.type === 'wound';
  });

  Handlebars.registerHelper('isGift', function(item)
  {
      return item.type === 'gift';
  });

  // GM Effect Builder chunk 1 (2026-10-05): an Item carrying a use sentence a
  // GM wrote (not a tag's, not a Gift's - those have their own controls).
  Handlebars.registerHelper('hasEffectUse', function(item)
  {
      return hasEffectUse(item);
  });

  Handlebars.registerHelper('isCodex', function(item)
  {
      return item.type === 'codex';
  });

  // Ancestry special rules that a player actively uses get a use icon,
  // same as a Gift or a Codex — foundry-system-index.csv "Ancestry Rule
  // as Rollable Item". A PASSIVE rule does not (Detritivore, Matt
  // 2026-09-23): posting its text was all it could do. Since Mutations and
  // Ancestry Rules chunk 4 (2026-10-06) the test is the rule's use sentence.
  // Separate from isAncestryRule below, a plain type test.
  Handlebars.registerHelper('hasAncestryUse', function(item)
  {
      return item.type === 'ancestry' && hasBodyUse(item);
  });

  Handlebars.registerHelper('isAncestryRule', function(item)
  {
      return item.type === 'ancestry';
  });

  // The equation's words from its sentence (Remaining Sources chunk 2a, 2026-10-07).
  Handlebars.registerHelper('codexEquationEffect', function(equationName)
  {
      return codexOf({ type: "codex", system: { equation: equationName } })?.words ?? "";
  });

  // Two distinct states per Item Slots.md: over the soft 10+CON limit is
  // just Encumbered (red); at the hard 20-slot ceiling is a harder stop
  // (bold, called out explicitly) since nothing can be added past it.
  //
  // 2026-09-07: the red state now comes from actor.js's derived
  // `system.encumbered` rather than being recomputed here. It used to test
  // `used >= value`, which turned a character sitting exactly on their limit
  // red — but the book says Encumbered is carrying MORE than the limit, so
  // 10/10 fits. That was harmless while red was only a colour; it stopped
  // being harmless the moment the DIS penalty attached to the same state, so
  // display and penalty read one flag instead of two copies of the rule.
  // `encumbered` is undefined on non-character actors (only
  // _prepareCharacterData derives it) — those fall through to plain text,
  // which is what they showed before.
  //
  // CAPPED still tests `>=` deliberately: it means "nothing more can be
  // added", matching _onItemCreate's own `used + 1 > max` gate, and 20/20 is
  // legitimately full rather than over.
  // Container Slot Capacity (2026-09-20). A cargo compartment's used-against-
  // capacity figure. Deliberately NOT the inventorySlots helper below: that
  // one has two thresholds, an Encumbered warning at 10 + CON and a hard CAPPED
  // at 20, and a compartment has neither. It has one number and going past it
  // is shown and never refused, so there is one style and no CAPPED.
  Handlebars.registerHelper('cargoSlots', function(cargo)
  {
      if(!cargo) return "";
      const text = cargo.used + "/" + cargo.capacity;
      return cargo.over
        ? new Handlebars.SafeString('<span class="knave-encumbered">' + text + " (OVER)</span>")
        : text;
  });

  Handlebars.registerHelper('inventorySlots', function(inventorySlots, encumbered)
  {
      const text = inventorySlots.used + "/" + inventorySlots.value;
      if(inventorySlots.used >= inventorySlots.max)
        return new Handlebars.SafeString('<span class="knave-capped">' + text + " (CAPPED)</span>");
      else if(encumbered)
        return new Handlebars.SafeString('<span class="knave-encumbered">' + text + "</span>");
      else
        return text;
  });

  // Innate Item Suppression. A suppressed item stays in the list and keeps
  // its name, its description and its slots — the character still HAS the
  // antlers. What it loses is its ongoing effect, so the row is greyed the
  // same way a broken weapon is and says who is holding it down.
  // Affliction Contraction and Cure. Both read-only: the save target is
  // the Virulence wherever it is printed, and the displaced list is a stored
  // payload rather than a set of live Items, so neither can be a field.

  Handlebars.registerHelper('displacedNames', function(item)
  {
    const d = item?.system?.displaced;
    return Array.isArray(d) ? d.map(x => x.name).join(", ") : "";
  });

  Handlebars.registerHelper('isItemSuppressed', function(item)
  {
    return isSuppressed(item);
  });

  Handlebars.registerHelper('suppressedByLabel', function(item)
  {
    return suppressorsOf(item).join(", ");
  });

  // Item Corrosion on a Hit (2026-09-24): a corroded item keeps its row but
  // loses its use controls - "literally useless" (Matt).
  Handlebars.registerHelper('isCorroded', function(item)
  {
    return isCorroded(item);
  });

  Handlebars.registerHelper('isItemBroken', function(item)
  {
    if(item.type === "spell")
      return (item.system.used === "true" || !item.system.spellUsable);
    else if(usageDieOf(item).die === "expended")
      return true;
    // Any Item marked broken, or armour at quality 0 (Broken Item State, 2026-10-09).
    else
      return isBroken(item);
  });

  Handlebars.registerHelper('hasQuality', function(item)
  {
    return item.system.quality !== undefined;
  });

  // What a human reads. NEVER what anything matches on — see
  // module/item/display-name.js. Lookups keep keying on item.name.
  // Exotica Identification (2026-09-19): an unidentified Exotica reads as the
  // stand-in to a player, so every template that prints a name through this
  // helper hides it with no change of its own. The GM still reads the real one.
  Handlebars.registerHelper('displayName', function(doc)
  {
    if(hiddenFrom(doc)) return STAND_IN_NAME;
    return displayNameOf(doc);
  });

  // Unidentified for everyone: gates every use, attack and equip control, the
  // GM's included — an unidentified item is not usable (Matt, 2026-09-19).
  Handlebars.registerHelper('isUnidentified', function(item)
  {
    return isUnidentified(item);
  });

  // Unidentified AND the viewer is not the GM: what a player may not see.
  Handlebars.registerHelper('isHiddenExotica', function(item)
  {
    return hiddenFrom(item);
  });

  // Exotica, identified or not — which rows get the GM's identification controls.
  Handlebars.registerHelper('isExoticaItem', function(item)
  {
    return isExotica(item);
  });

  Handlebars.registerHelper('itemImg', function(item)
  {
    return hiddenFrom(item) ? STAND_IN_IMG : item?.img;
  });

  Handlebars.registerHelper('hasUsageDie', function(item)
  {
    return !!usageDieOf(item).die;
  });

  // Gates the fixed-charge "use" icon and "(N left)" text for Exotica
  // items with a flat countable resource ("x6 uses" etc., not a UdN die)
  // — work-queue item 10.3.3 (2026-08-27). Per-item-data, not a name list
  // like the mutation/implant pool helpers — too many Exotica entries
  // (15-20) to hand-curate a list, and the schema default of 0 already
  // correctly excludes every Exotica item that was never given a starting
  // charge count.
  Handlebars.registerHelper('hasExoticaCharges', function(item)
  {
    return item.type === 'exotica' && item.system.usesRemaining > 0;
  });

  // Gates the "use" icon for a mutation with a use sentence (chunk 4).
  Handlebars.registerHelper('hasMutationUse', function(item)
  {
    return item.type === 'mutation' && hasBodyUse(item);
  });

  // Gates the "refresh" icon and the Uses Remaining sheet field, for
  // mutations with a Level-per-day use pool. Deliberately separate from
  // hasMutationUse — see MUTATIONS_WITH_USE_POOL's comment above.
  // A pool the roster names, or one a GM wrote as a per-day cost in the builder
  // (GM Effect Builder: Widening chunk 1, 2026-10-09) - dailyPoolSize answers both.
  Handlebars.registerHelper('hasMutationUsePool', function(item)
  {
    return item.type === 'mutation' && dailyPoolSize(item.parent, item) !== null;
  });

  // The same for an ancestry rule - the five once-a-day Bloomboons (Bloomboon
  // Daily Use, 2026-10-09).
  Handlebars.registerHelper('hasAncestryUsePool', function(item)
  {
    return item.type === 'ancestry' && dailyPoolSize(item.parent, item) !== null;
  });

  // The uses left, a pool never yet written reading full (daily-pool.js usesLeft).
  Handlebars.registerHelper('usesLeft', function(item)
  {
    return usesLeft(item.parent, item);
  });

  // Save-Gated Effect. Unlike every other gate in this block, this one asks
  // the DATA rather than a curated name list: an entry that declares a
  // `saveGated` spec gets the control, and no list here has to learn its name.
  // That is the whole difference between this mechanism and Activated Mutation
  // Use, which Matt ruled 2026-09-13 is not to be retrofitted onto it.
  Handlebars.registerHelper('hasSaveGated', function(item)
  {
    return hasSaveGated(item);
  });

  // The control's tooltip, from the spec rather than a generic "use" — the
  // save and what it is for are the whole content of the button, and a row of
  // identical d20 icons says neither.
  Handlebars.registerHelper('saveGatedLabel', function(item)
  {
    return saveGatedSpecFor(item)?.spec?.label ?? "use";
  });

  // Autarch Figment Grant (2026-09-14). Asks the DATA, like hasSaveGated above
  // and deliberately not like the curated name lists either side of it: a
  // figment gets the control when its roster row declares a `targetSave`, and
  // nothing here has to learn that Nerves is the one with an entangle. Only
  // Nerves has one today, and a fifth figment would need no edit here.
  //
  // It is NOT hasSaveGated, and the difference is the direction of the save.
  // Save-Gated Effect is the BEARER rolling their own; this compels an
  // OPPONENT to roll. Wiring Nerves to the wrong one would have the character
  // saving against their own nerves.
  Handlebars.registerHelper('hasFigmentTargetSave', function(item)
  {
    // Its use sentence since Implants, Exotica and Figments chunk 3a (2026-10-06).
    return item.type === 'figment' && hasBodyUse(item);
  });

  // Same shape as hasMutationUse/hasMutationUsePool, for `implant`-type
  // Items — work-queue item 10.2 (2026-08-25).
  Handlebars.registerHelper('hasImplantUse', function(item)
  {
    return item.type === 'implant' && hasBodyUse(item);
  });

  Handlebars.registerHelper('hasImplantUsePool', function(item)
  {
    return item.type === 'implant' && dailyPoolSize(item.parent, item) !== null;
  });

  // Same shape again, for generic `type: "item"` Items — item 10.8/10.3.8
  // (2026-08-27, Berserker Brew). An Elixir's control is its drink sentence (chunk 3a).
  // An Antidote is ASKED FOR, not listed, because its name carries the toxin
  // die it answers ("Antidote (d8 TOX)") and a list cannot hold six of those
  // plus whatever the die chain grows. That is the same reason
  // hasSealedImplant is field-based — and the list above already records what
  // a second hand-written copy of a gate costs: found in Group 218 testing,
  // where the cure worked and no icon existed to click it.
  // A granted ability (Elixir-Granted Ability Item, 2026-09-23) is gated on
  // its flag, not its name: the name is content the roster row chose.
  Handlebars.registerHelper('hasItemUse', function(item)
  {
    return item.type === 'item'
      && (!!elixirDrinkOf(item) || !!antidoteDieOf(item.name)
          || !!item.flags?.vaarn?.grantedBy || isGrownFruit(item));
  });

  // Bloomboon Growth: the Shed control, shown only on a grown part.
  Handlebars.registerHelper('isGrownPart', function(item)
  {
    return isGrownPart(item);
  });

  // Grafted Limb Creation: the player's Remove control on a graft.
  Handlebars.registerHelper('isGraft', function(item)
  {
    return isGraft(item);
  });

  // Gates the consumable use icon — foundry-system-index.csv "Fixed-Charge
  // Consumable". Matt ruled 2026-09-20 to gate this on a FIELD rather than a
  // name list, which is what the hasItemUse comment directly above argues
  // for. `consumable` is set by gearItemData off the book's own (xN) suffix,
  // and by the item sheet's checkbox for gear a GM makes by hand.
  //
  // The two exclusions stop one item growing two use icons. An item already
  // with a drink sentence (an Elixir, chunk 3a) has an effect that consumes it its own
  // way. A usage die is the OTHER depletion shape the book uses, and the two
  // notations have stayed distinct across two editions — (xN) 25 times and
  // (UdN) 10 times in both CRIMSON HOUND and JADE IBIS, measured 2026-09-20
  // — so nothing the book prints should ever carry both.
  Handlebars.registerHelper('isConsumableUse', function(item)
  {
    return item.type === 'item'
      && item.system.consumable === true
      && !usageDieOf(item).die
      && !(!!elixirDrinkOf(item) || !!antidoteDieOf(item.name));
  });

  // Same shape again, for `exotica`-type Items with no pool — item 10.3.4
  // (2026-08-27). See EXOTICA_WITH_USE_ICON's comment above.
  // The reload control: a weapon's refill sentence (the Tempest Cannon) since
  // Implants, Exotica and Figments chunk 3b-ii (2026-10-06).
  Handlebars.registerHelper('hasReload', function(item)
  {
    return !!reloadOf(item);
  });

  Handlebars.registerHelper('hasExoticaUse', function(item)
  {
    return item.type === 'exotica' && !usageDieOf(item).die && !(item.system?.usesRemaining > 0)
      && useSentences(item).some(({ s }) => !s.baked);
  });

  // Gates the "install" icon for a sealed Cocoon/Pack capsule — item
  // 10.3.5 (2026-08-27). Field-based, not name-list-based, since each
  // capsule's name is dynamic (e.g. "Cybernetic Cocoon (Dreadnaught
  // Carapace)") — see actor-sheet.js's _onSealedImplantInstall.
  Handlebars.registerHelper('hasSealedImplant', function(item)
  {
    return item.type === 'exotica' && !!item.system.sealedImplant;
  });

  // Gates the Berserker StimRig's use-icon visual state (active/inactive) —
  // item 10.8 (2026-08-27). Handlebars can't reach a dynamic actor flag
  // path on its own, so this needs a real helper rather than inline
  // template logic, same reasoning `codexEquationEffect` above needed one.
  Handlebars.registerHelper('isBerserkerActive', function(actor)
  {
    return !!actor.getFlag("vaarn", "berserkerActive");
  });

  // Gates the Give icon — foundry-system-index.csv "Item Transfer Between
  // Actors". A body part cannot be handed over, and neither can a wound.
  Handlebars.registerHelper('isTransferable', function(item)
  {
    return isTransferable(item);
  });

  // Gates the Drop icon — foundry-system-index.csv "Dropped Item Container".
  // Same exclusions as Give, and for the same reason: a character cannot put
  // their own hand on the floor, and a wound is healed rather than set down.
  Handlebars.registerHelper('isDroppable', function(item)
  {
    return isDroppable(item);
  });

  // Gates the Equip/Unequip icon — work-queue item 11 (2026-08-25).
  //
  // Item Control Visibility (2026-09-08): intrinsics are excluded outright,
  // for the GM too. A natural weapon is a body part and has no unequipped
  // state, so offering the toggle presents a condition the rules have no
  // meaning for — and unequipping one silently removed the character's ability
  // to attack unarmed, with nothing on the sheet saying why. Suppressed rather
  // than GM-only because there is nothing here for a GM to fix.
  //
  // The read is the intrinsic field and nothing else: the base Unarmed Strike
  // is a weaponMelee exactly like a sword. See item/intrinsic.js.
  Handlebars.registerHelper('isEquippable', function(item)
  {
    if(isIntrinsic(item)) return false;
    // Any carried Item that needs it, since Stats as Sentences chunk 2e-ii.
    return isEquippableItem(item);
  });

  // Activity Time Cost. A rule offers to start an effort only where it
  // DECLARES one — never inferred from its text. Measured 2026-09-08: eight
  // creature rules mention an hour, a day or an Exploration Turn and exactly
  // one is an effort somebody spends, the rest being durations and rates
  // belonging to other mechanisms entirely.
  Handlebars.registerHelper('hasActivity', function(item)
  {
    return !!creatureFlagsOf(item).activity?.options?.length;
  });

  // Ability Damage pass 3 (2026-09-22): an AUTO-HIT per-round loss on a
  // reminder Item (Occulith's gaze, the Obelisk, the Exemplar) gets a control
  // that starts it. A WEAPON carrying the same flag (the Psyche Leech's
  // syphon) starts it on a hit instead, so it gets no control.
  // Brain Burster's escalating loss rides the SAME control (2026-09-22):
  // both are auto-hit per-round effects a use starts on the targeted tokens,
  // and the click handler starts whichever the Item declares. A second icon
  // for an identical gesture would only make the sheet harder to read.
  // A creature Item's flag, read from its sentences (Effect Engine: Creatures chunk
  // 2c-i, 2026-10-06) - what the NPC sheet's controls show and are gated on.
  Handlebars.registerHelper('creatureFlag', function(item, key)
  {
    return creatureFlagsOf(item)[key];
  });

  Handlebars.registerHelper('hasAbilityTick', function(item)
  {
    const starts = !!creatureFlagsOf(item).abilityTick?.length || !!creatureFlagsOf(item).escalating?.length;
    return starts && item.type !== 'weaponMelee' && item.type !== 'weaponRanged';
  });

  // Token Light from an Item. Shown only where the Item DECLARES a light
  // (flags.vaarn.lightSource) - the Chemcell Torch every new PC carries.
  // isLightOn reads the TOKENS, so a light switched off by hand in the token
  // config shows as off here too. See module/item/light-source.js.
  Handlebars.registerHelper('isLightSource', function(item)
  {
    return !!lightSourceOf(item);
  });
  Handlebars.registerHelper('isLightOn', function(item)
  {
    return isLit(item);
  });

  // Compel-a-Target Save. An Item offers to compel a save only where it
  // DECLARES one, never inferred from its text — the same rule hasActivity
  // above follows, and for the same measured reason: "must CON save" appears
  // in plenty of creature biographies belonging to rules that are not this.
  // Written by bestiary-build.js onto both the weapon Item of an attack that
  // compels a save (19) and the reminder Item of a save-only ability (26).
  Handlebars.registerHelper('hasCompelledSave', function(item)
  {
    // Also an ability that inflicts a condition with no save at all
    // (Grimweaver's Web Shot, 2026-09-16): the same control posts its
    // Apply Effect to Target card, since there is no other click for it.
    return !!(creatureFlagsOf(item).save?.length || creatureFlagsOf(item).applies?.length);
  });

  // Heal the targeted tokens by hand - the Biotic Field's Healing Cloud,
  // RULED 2026-09-22 (Matt). FLAG-GATED like the helpers around it, never
  // text; healing-field.js writes the flag when it creates the field.
  Handlebars.registerHelper('hasTargetHeal', function(item)
  {
    return !!targetHealOf(item);
  });

  // The Entropy Wight's max-HP cut (Direct HP Adjustment, 2026-09-23).
  Handlebars.registerHelper('hasMaxHPLoss', function(item)
  {
    return !!creatureAttackOf(item).maxHPLoss;
  });

  // Look Out Sire (2026-09-26): the Consul's Lictor's Protect control.
  Handlebars.registerHelper('hasProtector', function(item)
  {
    return !!creatureFlagsOf(item).protector;
  });

  // Temporary HP (2026-09-26): the Zenithlight Negatick's Infusion.
  Handlebars.registerHelper('hasTempHp', function(item)
  {
    return !!creatureFlagsOf(item).tempHp;
  });

  // Creature-Driven Level Drain. FLAG-GATED like the two above, never text:
  // the Kronophage's own biography states the rule, and so do the
  // biographies of creatures that merely mention losing a level. The flag is
  // written by bestiary-build.js from the rule's own levelDrain block.
  Handlebars.registerHelper('hasLevelDrain', function(item)
  {
    return !!creatureFlagsOf(item).levelDrain;
  });

  // Rolled Creature Stat. FLAG-GATED like the three above: the flag is written
  // by rolled-stat.js from the creature's declared `rolled` block, never read
  // off a stat line.
  Handlebars.registerHelper('hasRolledStat', function(item)
  {
    return !!creatureFlagsOf(item).rolledStat?.dice;
  });

  // Creature AV State Control. FLAG-GATED like the ones above: the list is
  // written by ruleItems from the rule's declared `avStates`. Returns the
  // states themselves, so the template draws one button per state.
  // An encounter effect's control (the Doomsinger's Doom Song, 2026-09-24).
  // An aura's ability loss (the Thermasaur's Cold Aura, 2026-09-24).
  Handlebars.registerHelper('hasAuraDamage', function(item)
  {
    return !!creatureFlagsOf(item).auraAbilityDamage;
  });

  Handlebars.registerHelper('hasEncounterEffect', function(item)
  {
    return !!creatureFlagsOf(item).encounterEffect;
  });

  Handlebars.registerHelper('avStatesOf', function(item)
  {
    const states = creatureFlagsOf(item).avStates;
    return Array.isArray(states) ? states : [];
  });

  // Item Attunement Gate. Two helpers rather than one because the row shows
  // three different things: nothing at all for an ancestry the rule does not
  // touch, an attune control for an unattuned item, and a Referee-only
  // un-attune for one already done. A single helper returning a string would
  // put that branching in the template, where nothing can test it.
  //
  // Both take the ACTOR as well as the item: attunement is a relation between
  // the two, not a property of the item alone, and an item-only read would
  // gate every character in the world on a field only one ancestry uses.
  Handlebars.registerHelper('needsAttunement', function(actor, item)
  {
    return needsAttunement(actor, item);
  });

  // A damage add-on is reference-only: its dice are folded into the parent
  // weapon's damage roll, so it gets no attack or damage icon of its own.
  // See module/item/damage-add-ons.js for why the set is a ruling, not a
  // reading of effect text.
  Handlebars.registerHelper('isDamageAddOn', function(item)
  {
    return isDamageAddOn(item);
  });

  // What an add-on contributes, for the badge that replaces its roll icons —
  // a reference-only Item still has to say what it is doing.
  Handlebars.registerHelper('damageAddOnLabel', function(item)
  {
    const def = damageAddOnFor(item);
    if(!def) return "";
    const when = def.requires === "charge" ? " when charging"
      : def.appliesTo === "unarmed" ? " to unarmed" : "";
    return `+${def.dice}${when}`;
  });

  // Charge Declaration State — player declaration, not detection. Nothing in
  // this system models movement.
  Handlebars.registerHelper('isCharging', function(actor)
  {
    return isCharging(actor);
  });

  // The Corrosive tag's choice (2026-09-22). GATED ON CARRYING ONE, unlike
  // the charge toggle beside it, and the asymmetry is deliberate: a charge is
  // a declaration any character can make with any melee weapon, while this
  // one is meaningless without a weapon that offers the either/or. An always
  // present control for a tag you do not have is a question the sheet cannot
  // answer.
  Handlebars.registerHelper('hasCorrosiveChoice', function(actor)
  {
    return (actor?.items ?? []).some(i =>
      (i.type === "weaponMelee" || i.type === "weaponRanged")
      && i.system?.equipped && !isSuppressed(i) && offersArmourChoice(i));
  });

  Handlebars.registerHelper('isDegradingArmour', function(actor)
  {
    return isDegradingArmour(actor);
  });

  // Attuned, and only meaningful to show for an ancestry that attunes at all.
  // Named "Gear" to say out loud that an intrinsic never reaches here: it
  // reads as attuned everywhere, so without the extra test a Planeyfolk's own
  // claws would offer the Referee an un-attune control that means nothing.
  Handlebars.registerHelper('isAttunedGear', function(actor, item)
  {
    return attunes(actor) && !isIntrinsic(item) && isAttuned(item);
  });

  // Same "used/max" + capped-styling shape as the inventorySlots helper
  // above, for the new hands pool (work-queue item 11).
  Handlebars.registerHelper('hands', function(hands)
  {
      const text = hands.used + "/" + hands.max;
      if(hands.used >= hands.max)
        return new Handlebars.SafeString('<span class="knave-capped">' + text + "</span>");
      else
        return text;
  });
});

// A PER-ROUND SAVE on the round card (Failed-Save Consequence, RULED
// 2026-09-25 by Matt): the Space-Time Vortex's "DEX Save vs 3d8 damage". One
// save card per TARGETED token - whoever the Referee judges the ejected
// creature and debris reach - and each card deals the damage to a saver who
// fails. GM-only, and once per round card, the Brood's guard.
Hooks.on('renderChatMessage', (message, html) =>
{
  html.find('.vaarn-round-save').click(async ev =>
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee calls for this save.");
    const btn = ev.currentTarget;
    const entryId = btn.dataset.entryId;
    const label = btn.dataset.label;
    if((message.getFlag("vaarn", "roundAbilityApplied") ?? []).includes(entryId))
      return ui.notifications.warn(`${label} has already been called for this round.`);
    const actor = actorFromRef(btn.dataset.actorId);
    if(!actor) return ui.notifications.warn("That actor no longer exists.");
    const entry = (actor.getFlag('vaarn', 'effects') ?? []).find(e => e.id === entryId);
    if(!entry?.save) return ui.notifications.warn(`${label} is no longer on ${actor.name}'s board.`);
    if(!game.user.targets.size) return ui.notifications.warn(`Target the tokens ${label} reaches, then click again.`);
    await message.setFlag("vaarn", "roundAbilityApplied",
      [...(message.getFlag("vaarn", "roundAbilityApplied") ?? []), entryId]);
    await postSaveCardsToTargets(actor, label, [entry.save]);
  });
});

/**
 * WHO MAY APPLY A ROUND-CARD TICK (Effect Engine ruling A, 2026-10-04, applied
 * to the round card's HP, ability and escalating buttons in Shared Pipelines
 * chunk 2, 2026-10-05): the owner of the effect's SOURCE applies the result -
 * the GM for a creature, trap or disease, a character's player for something
 * their character started. An entry naming no source is its holder's own
 * (burning, a rule a creature runs from its sheet, an elixir's regeneration),
 * so its holder's owner applies it. Replaces "GM only" on the HP tick and
 * "GM or the victim's owner" on the ability tick, which disagreed on one card.
 * Returns the refusal to show, or null to go ahead.
 */
function roundApplyRefusal(holder, entry)
{
  if(game.user.isGM) return null;
  const source = (entry?.sourceActorId && game.actors.get(entry.sourceActorId)) || holder;
  if(source?.isOwner) return null;
  return `Only the Referee or ${source?.name ?? "its source"}'s player can apply this.`;
}
