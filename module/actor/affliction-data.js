/**
 * The twelve afflictions — foundry-system-index.csv "Affliction Contraction
 * and Cure" and "Nanomachine Slot Occupancy", which Matt folded together on
 * 2026-09-13.
 *
 * Six Diseases and six Nanomachine Infections, transcribed from
 * Miscellany/Diseases.md and Miscellany/Nanomachine Infections.md. Nothing
 * here interprets the book: `effects` is its own wording, trimmed to the
 * clause the Item carries, and every departure from the printed text is
 * marked as one where it occurs.
 *
 * ── WHAT THIS FILE OWNS, AND WHAT IT DELIBERATELY DOES NOT ─────────────────
 *
 * It owns the affliction as a THING YOU HAVE: its Virulence, its slot, how it
 * is caught, what Item it puts on the sheet, and how it is cured.
 *
 * PROGRESSION IS NOT HERE. Six of the twelve tick on a clock, and every one of
 * those ticks already lives in time/recurrence-data.js with its period,
 * threshold and the book's own tick wording. `recurrenceKey` points at it.
 * Repeating a period here would be a second copy of a number the vault is
 * checked against by tools/roster-drift.mjs, and the copy it does not check
 * is the one that would rot.
 *
 * VIRULENCE IS REPEATED, and that is the one deliberate duplication. It is an
 * affliction fact rather than a recurrence fact — the six with no clock have
 * one too — so this roster carries all twelve, and
 * tools/test-affliction-data.mjs asserts that the six shared ones AGREE with
 * recurrence-data.js. Two independent statements that must match is this
 * project's idiom for exactly this, and it catches a drift that preventing the
 * duplication would merely hide somewhere else.
 *
 * ── ONCE OR PERIODICALLY: THE RULE THAT DECIDES WHERE A STAT LOSS GOES ─────
 *
 * RULED 2026-09-13 (Matt), given unprompted when three of his calls on stat
 * losses looked inconsistent and were not:
 *
 *   "I'm making the ones that apply a stat change once, as part of the
 *    disease intractable, they go away with the disease. The ones that are
 *    inflicted periodically are the ones I treat as stat damage, because they
 *    seem to represent an ongoing battle that the body can fight back
 *    against."
 *
 * So the question is never what the book's wording sounds like. It is whether
 * the loss lands ONCE or REPEATEDLY:
 *
 *   ONCE, at onset      -> `lasting: "ongoing"`. It rides the affliction's
 *                          board entry, contributes while the disease runs,
 *                          and vanishes at the cure. A Long Rest cannot touch
 *                          it, because there is nothing to heal - the score
 *                          was never damaged, something is holding it down.
 *                          Brain Coral and Goldencough.
 *
 *   PERIODICALLY        -> woundDamage, applied by the recurrence tick. It
 *                          survives the cure and heals with rest. Jellybones,
 *                          Hivey Hump, Lumenrot and the Gitch.
 *
 * THIS ALREADY DESCRIBED EVERY TICK IN recurrence.js, which has always written
 * woundDamage, so the rule was latent in the build before it was stated. Only
 * Goldencough disagreed with it, and only for one day.
 *
 * WHY IT IS NOT ARBITRARY, in his words: a periodic loss is a fight the body is
 * still having, so the body can win some of it back. A single change at onset
 * is the disease's shape rather than a wound, and shape does not heal - it
 * leaves when the disease does.
 *
 * IT ALSO DISPOSES OF A FORK THAT WAS ABOUT TO BE BUILT. Goldencough was
 * briefly headed for a permanent reduction to the base score, which would have
 * required Permanent Ability Score Change - a filed, unbuilt mechanism with
 * three atoms waiting. Under this rule it needs none of that.
 * * ── IMMUNITY IS NOT ENFORCED HERE OR ANYWHERE ──────────────────────────────
 *
 * JADE IBIS 15-09-26, Diseases: "Synthetic and Mineral-type creatures are
 * immune to diseases, unless otherwise noted." The trailing clause is why
 * nothing blocks: a hard gate makes the exception unreachable. RULED 2026-09-13
 * (Matt) that the dialog marks the actor and the Referee decides — "I think
 * (Lithling) or (Synth) next to the character's name in the start an
 * affliction UI would be enough to remind the GM to exempt them as
 * appropriate."
 *
 * KEYED ON CREATURE TYPE, NOT ANCESTRY, since 2026-09-16 (RULED by Matt).
 * CRIMSON named the ancestries; JADE names the types, and the type reaches
 * every actor the rule is about - a Rival Adventurer or a bestiary creature
 * has no ancestry value at all, and a character under Lithification Syrup is
 * Mineral without being a Lithling. The one case the switch loses is a Synth
 * or Lithling whose type box was unticked by hand.
 *
 * The nanomachine half IS mechanical, because the book makes it a roll and not
 * an exemption: Synths and implanted characters "Save to resist nanomachine
 * infestations with DIS". That rides the card's save.
 *
 * His own worked example of a GM exemption is Neobloom and Jellybones — "they
 * don't have bones" — which the book does not say and which is therefore his
 * table's call rather than this file's.
 */

import { TAKES_DOUBLE_DAMAGE, DEALS_DOUBLE_DAMAGE, HALF_FROM_BLUDGEONING } from "../item/attack-properties.js";
// A cycle (affliction-effects-data.js reads AFFLICTIONS), safe because both
// read the other only when called, never while loading.
import { afflictionFixedOf } from "./affliction-effects-data.js";

/**
 * The condition an affliction sets to forbid Gift use. A string enum for the
 * same reason rest.js's HALF_LONG_REST is one: stateful-effect.js sums the
 * `conditions` a board entry carries, so the value IS the contract. Dreamcage
 * sets it; actor-sheet.js's _onGiftUse reads it.
 */
export const NO_GIFTS = "noGifts";

/** Diseases spare these creature types unless an entry says otherwise. */
export const DISEASE_IMMUNE_TYPES = Object.freeze(["synthetic", "mineral"]);

/**
 * The disease-immune creature types an actor currently has, capitalised for
 * display - [] when none. Reads system.creatureTypes as prepared, so a type
 * a stateful effect grants (Lithification Syrup) counts while it lasts.
 */
export function diseaseImmuneTypes(actor)
{
  const types = actor?.system?.creatureTypes ?? {};
  return DISEASE_IMMUNE_TYPES.filter(t => types[t])
    .map(t => t.charAt(0).toUpperCase() + t.slice(1));
}

/**
 * The save target for resisting or treating any affliction.
 *
 * JADE IBIS 15-09-26: "All diseases have a Virulence rating; this is the
 * target number for Saves to resist and treat the infection." CRIMSON HOUND
 * printed small ratings and said to add 10; JADE printed every rating exactly
 * 10 higher and dropped the addition, so no save target moved. Rebased
 * 2026-09-16 on Jade Ibis Rule-Resolution Changes. Kept as a function so the
 * card, the tooltip and the test still share one definition of the target.
 */
export function saveTargetFor(virulence)
{
  return Number(virulence);
}

export const AFFLICTIONS = [
  /* ── DISEASES ─────────────────────────────────────────────────────────── */
  {
    key: "brain-coral",
    name: "Brain Coral",
    kind: "disease",
    virulence: 11,
    book: "Miscellany/Diseases.md",
    effects: "The infected character loses -d8 STR and gains equal points of PSY.",
    cure: "Antifungal medications, or extreme cold.",
    vector: "Deliberate cultivation by mystics, who can infect others; or exposure to wild spores in damp, sunless places.",
    // THE ONLY AFFLICTION ANYONE WANTS, so contraction has to support a
    // voluntary path. The dialog offers "no save" for exactly this.
    voluntary: true,
    // ONSET IS NOT IN THE BOOK. Matt flagged it at scoping — when it "has set
    // in ... we will have to decide, book doesn't say" — and AGREED 2026-09-13
    // that nothing invents a delay: the Item lands inert, the trade sits behind
    // a Referee button on the card, and the board shows how long it has been
    // carried. `manualEffect` is what puts that button there.
    // BOTH HALVES ARE PART OF THE DISEASE, so both end with it. This REVISES
    // the same day’s first attempt, which sent the STR to woundDamage as
    // ordinary ability damage and kept the PSY as a contributor. RULED
    // 2026-09-13 (Matt), on seeing what that produced: "I kind of feel like
    // the STR loss for this one should act as a part of the disease rather
    // than as stat damage. Otherwise infection with brain coral only saps STR
    // at onset, healing naturally in a few rests, and they just have a mega
    // mind with no downside."
    //
    // He is describing a real hole rather than a preference. Ability damage
    // heals on a Long Rest; the PSY gain would have lasted as long as the
    // infection. So the cost was temporary and the benefit was not, which
    // inverts the entry — Brain Coral is the one affliction a character WANTS,
    // and a version with a self-repairing price is strictly better than no
    // disease at all.
    //
    // Both are "ongoing": both ride the board entry and both vanish at the
    // cure, which keeps the trade honest in both directions.
    manualEffect: {
      label: "Apply the STR-for-PSY trade",
      formula: "1d8",
      loses: { ability: "str", lasting: "ongoing" },
      gains: { ability: "psy", lasting: "ongoing" },
      text: "Lose that much STR and gain an equal number of PSY. Both last as long as the infection.",
    },
    item: {
      // "sits over the neck and cranium like a strange pink helmet" — so it IS
      // a helmet, which Matt asked for directly. Nothing new enforces the
      // no-other-helmet clause: actor-sheet.js's equip guard already counts
      // equipped armor with armorSlot "helm" against a cap of one.
      type: "armor",
      armorSlot: "helm",
      avBonus: 0,
      equipped: true,
      slots: 0,
    },
  },

  {
    key: "wrathworms",
    name: "Wrathworms",
    kind: "disease",
    virulence: 12,
    book: "Miscellany/Diseases.md",
    effects: "Infected creatures fight with wild abandon, and deal and receive doubled damage. They must EGO save to retreat from combat.",
    cure: "De-worming tinctures, brewed by all Vaarnish apothecaries and alchemists.",
    vector: "Attacks by an infected creature, or contact with their blood and flesh. Some Cacklemaw clans deliberately infect themselves and spread it by bite.",
    // Already live in shipped data: the Berserker's ATK line is "Vomit Blood
    // (CON save vs Wrathworms)", so the compendium has been asking players to
    // save against this since before anything could apply it.
    //
    // BOTH HALVES OF "deal and receive doubled damage", wired 2026-09-19. The
    // receiving key is the one Vaarnish Poison row 19 already uses; the
    // dealing key is this entry's own. The third clause of the book sentence —
    // "They must EGO save to retreat from combat" — is NOT here: it is this
    // atom's Compel-a-Target Save row and is already BUILT.
    conditions: [TAKES_DOUBLE_DAMAGE, DEALS_DOUBLE_DAMAGE],
    item: { type: "affliction", slots: 0 },
  },

  {
    key: "jellybones",
    name: "Jellybones",
    kind: "disease",
    virulence: 12,
    book: "Miscellany/Diseases.md",
    recurrenceKey: "jellybones",
    // "lose one point of base AV" - carried on the board entry while infected.
    av: -1,
    effects: "Infected characters lose one point of base AV. Any claw or bite attacks they have lose potency, as the keratin or enamel becomes rubbery and harmless. Infected characters can squeeze themselves through narrow gaps, and take halved damage from bludgeoning attacks.",
    cure: "A Stiff Drink — liquor, wet cement, and the crushed shards of a Lithling.",
    vector: "Often carried by soft, ooze-like creatures, such as Doppelgellers.",
    // THE SUPPRESSION SURFACE. Twenty innate items, surveyed with Matt
    // 2026-09-13 and recorded in full on the Innate Item Suppression row. The
    // test is the disease's own reasoning, and it is WIDER than the attack
    // clause: "softening the bones and teeth" is its opening line, so bone
    // softens as well as keratin and enamel. That is Matt's Larynx Darts
    // ruling, and it is the book's reading rather than an extension of it.
    //
    // THREE STRUCTURED NATURAL WEAPONS ARE OUT, each ruled individually rather
    // than by a pattern: Bioelectricity (an electrical discharge, nothing to
    // soften), Tail Club ("they can still whip things with their squishy tail,
    // no mechanical change, just flavor") and Tentacles Hair (soft tissue, so
    // the "cannot inject" reasoning that caught the other venom entries does
    // not apply). Cybernetic natural weapons are out by material — no bone,
    // keratin or enamel in them — which is an inference from the rule rather
    // than a book statement.
    suppresses: [
      "Antlers", "Beak", "Claws, Crab", "Claws, Retractable", "Fangs, Venomous",
      "Horns, Ram", "Horns, Rhino", "Larynx Darts", "Poison Spur", "Powerful Jaws",
      "Tail, Scorpion", "Tusks", "Biter",
      "Armoured Skin", "Scaly Skin", "Crown, Horns", "Crest, Bone", "Quills",
      "Body Barbs", "Skeletal Frame",
    ],
    // "...and take halved damage from bludgeoning attacks." Wired 2026-09-21
    // on Damage-Type Read: the condition is a target key in the damage table.
    conditions: [HALF_FROM_BLUDGEONING],
    item: { type: "affliction", slots: 0 },
  },

  {
    key: "hivey-hump",
    name: "Hiveyhump",
    kind: "disease",
    virulence: 13,
    book: "Miscellany/Diseases.md",
    recurrenceKey: "hivey-hump",
    effects: "The bees fight to defend their hive. After three days of infection, the character can deal d4 unblockable swarm damage to an opponent per combat round. This rises to d6 after seven days of infection.",
    cure: "Fumigation of the afflicted, with special herbs burned in the fumigate fires.",
    vector: "A Sable Bee queen entering the airways. During swarming months, anyone who sleeps without netting around their bed has a 1-in-10 chance of infection every night. Hiveymen are another source: after battle, secretly CON Save for each PC to establish possible infestations.",
    // THE BOOK'S OWN ELAPSED-TIME THRESHOLDS, not invented staging. The EGO
    // loss per day is the recurrence; these two are the hump appearing and
    // then growing, which Matt asked to model as the Item changing.
    stages: [
      { afterDays: 3, damage: "1d4", text: "The hump has formed. d4 unblockable swarm damage to an opponent per combat round." },
      { afterDays: 7, damage: "1d6", text: "The nest has grown. d6 unblockable swarm damage to an opponent per combat round." },
    ],
    item: { type: "affliction", slots: 0 },
   declaredSpan: null },

  {
    key: "labyrinth-pox",
    name: "Labyrinth Pox",
    kind: "disease",
    virulence: 14,
    book: "Miscellany/Diseases.md",
    recurrenceKey: "labyrinth-pox",
    effects: "Stage 1: a smattering of coin-sized apertures, of apparently infinite depth. After three days, Stage 2 begins — the character loses d8 maximum HP per day and gains an equal number of new inventory slots, located inside their hollowing body. Stage 3, once maximum HP is zero: the character is nothing but a collection of gateways and apertures. After three days at this stage, they vanish completely.",
    cure: "Excision with a hypergeometric blade, or exposure to Normality Fields or other anti-hypergeometry measures.",
    vector: "Contact with an infected person or object. The Courtiers of the Jigsaw Autarch are believed to cultivate and spread this affliction.",
    stages: [
      { afterDays: 3, text: "Stage 2 begins — the daily maximum-HP loss and inventory-slot gain start now." },
    ],
    // A DELIBERATE DEPARTURE FROM THE PRINTED TEXT, recorded as one. The book
    // says excision "will arrest the infection", and recurrence-data.js still
    // carries that wording. RULED 2026-09-13 (Matt): "I think the author's use
    // of 'arrests' is just incorrect here. The cure is described as excising
    // the extradimensional spaces from the body, it doesn't make sense to keep
    // the effects if those are gone. I'm chalking it up to bad pre-release
    // wording." So a cured victim recovers the max HP and loses the slots.
    cureReversesDeparture: "The book says the cure ARRESTS rather than reverses. Matt ruled 2026-09-13 that this is bad pre-release wording and that curing restores what was lost.",
    item: { type: "affliction", slots: 0 },
    // STAGE 3's three days, declared so the item carries an hourglass. RULED
    // 2026-09-21 (Matt): the GM starts it when maximum HP reaches zero; nothing
    // starts it automatically, and expiry announces the vanishing.
   declaredSpan: { amount: "3", unit: "day" } },

  {
    key: "lumenrot",
    name: "Lumenrot",
    kind: "disease",
    virulence: 15,
    book: "Miscellany/Diseases.md",
    recurrenceKey: "lumenrot",
    effects: "Victims glow in the dark, and their flesh can be used as a light source.",
    cure: "Three injections, stocked by Vaarnish apothecaries. Ulfire light arrests the spread but will not cure it.",
    vector: "Stagnant water is infected 1-in-6; contact with the glowing pus also necessitates a CON save.",
    // THE GLOW IS ON THE TOKEN, 2026-09-20. Built as Actor Token Light
    // Emission, which was filed 2026-09-13 as its own row because nothing in
    // this system had ever emitted light. The colour is the book's: "a telltale
    // green phosphorescence", and merchants who "see green light emanating from
    // beneath bandages" raise their prices.
    //
    // "IN EXTREMIS" IS GONE FROM `effects` ABOVE, 2026-09-20. CRIMSON HOUND
    // read "can be used as a light source in extremis"; JADE IBIS 15-09-26
    // drops the hedge and reads "can be used as a light source". Measured
    // against the Jade Ibis text extract. The hedge mattered here — with it the
    // glow is a last resort, without it the victim simply glows — so the token
    // light is unconditional.
    light: { tier: "source", color: "#7dff9b" },
    item: { type: "affliction", slots: 0 },
  },

  /* ── NANOMACHINE INFECTIONS ───────────────────────────────────────────── */
  /*
   * "They can infect all creature types, and are essentially malignant
   * cybernetic implants. They occupy an Ability slot, much like beneficial
   * cybernetics, overwriting any pre-existing implants in the slot."
   *
   * `abilitySlot` is spelled the way chargen-data.js and
   * advanced-implants-data.js spell `ability_slot`, because the displacement
   * check compares the two directly. A `d6` slot is rolled at contraction.
   */
  {
    key: "goldencough",
    name: "Goldencough",
    kind: "nanomachine",
    virulence: 11,
    abilitySlot: "CON",
    book: "Miscellany/Nanomachine Infections.md",
    effects: "The infected character loses -d6 maximum CON. Whenever they fail a CON save, they are overcome by a coughing fit, taking d4 damage and expelling clouds of infectious golden thread into the air.",
    cure: "A smoke lodge ceremony, lasting a day.",
    vector: "Inhaling the golden clouds coughed out by an infected character.",
    // ONCE, SO IT IS PART OF THE DISEASE AND ENDS WITH IT. Nothing is
    // contributed back - the asymmetry with Brain Coral is the book’s, since
    // "-d6 maximum CON" gives nothing in return. (JADE IBIS 15-09-26 wording;
    // CRIMSON HOUND read "maximum CON DEFENCE" and the quote was re-transcribed
    // 2026-09-20 along with `effects` above. The asymmetry is unchanged.)
    //
    // This was woundDamage until 2026-09-13, and was briefly going to become a
    // permanent reduction to the base score, which would have needed Permanent
    // Ability Score Change built first. Matt’s once-versus-periodic rule
    // settles it as neither - see the file header.
    //
    // He also asked whether it could simply ride the Item "like skeletal
    // frame". Functionally the same thing; the board-entry contributor is used
    // here for two reasons a baked Item modifier could not cover: the amount is
    // ROLLED rather than fixed in a roster, and the onset is a separate Referee
    // act rather than something that happens when the Item is created.
    // "Whenever they fail a CON save, they are overcome by a coughing fit,
    // taking d4 damage and expelling clouds of infectious golden thread into
    // the air." READS a save that happened for some other reason; it compels
    // none of its own, which is why this is Failed-Save Consequence and not
    // Compel-a-Target Save, where it had been filed.
    //
    // The infectious cloud is TEXT. The book makes it the vector by which
    // Goldencough spreads, and vectors are the Referee's - nothing here
    // exposes bystanders, for the same reason the 1-in-6 stagnant water does
    // not: "We will not build mechanics for environmental vectors."
    onFailedSave: {
      ability: "con",
      damage: "1d4",
      label: "a coughing fit",
      text: "is overcome by a coughing fit, and expels a cloud of infectious golden thread into the air. Anyone breathing it in is exposed.",
    },
    manualEffect: {
      label: "Apply the maximum CON loss",
      formula: "1d6",
      loses: { ability: "con", lasting: "ongoing" },
      text: "Lose that much maximum CON.",
    },
    item: { type: "affliction", slots: 0 },
   declaredSpan: null },

  {
    key: "janus-lenses",
    name: "Janus Lenses",
    // Ambush Resolution wiring, RULED 2026-09-26 (Matt): asleep in a night
    // watch, the bearer alone is not surprised - listed under Not caught.
    ambush: "immuneAsleep",
    kind: "nanomachine",
    virulence: 12,
    abilitySlot: "PSY",
    book: "Miscellany/Nanomachine Infections.md",
    effects: "The afflicted character only regains half their maximum HP from a Long Rest. However, they cannot be ambushed or surprised while asleep, as the cameras always detect approaching adversaries.",
    cure: "A trained cybernetics surgeon excises the cameras and prevents their regrowth.",
    vector: "The touch of a Maladaptor, or contact with an infected character's blood or stomach acid.",
    // ALREADY BUILT AND WAITING. rest.js's HALF_LONG_REST condition names Janus
    // Lenses in its own comment; it has never had a source to set it.
    conditions: ["halfLongRest"],
    item: { type: "affliction", slots: 0 },
  },

  {
    key: "usurper-arm",
    name: "Usurper Arm",
    kind: "nanomachine",
    virulence: 12,
    abilitySlot: "DEX + EGO",
    book: "Miscellany/Nanomachine Infections.md",
    effects: "The afflicted character can call upon the Usurper Arm during combat, making an EGO save to briefly dominate it. On a success the limb fights for them, allowing one extra one-hand attack per round. On a failure it attacks them instead, remaining hostile for the rest of combat. The limb is level 2, AV 17, and deals d6 damage. Missed attacks against the limb damage the host instead.",
    cure: "A trained cybernetics surgeon. An untrained amputation makes it REGROW from the trace nanomachinery left in the stump.",
    vector: "The touch of a Maladaptor, or contact with an infected character's blood.",
    // "Roll d6 to determine the exact locale" — rolled once at contraction,
    // the same shape as the Stoma's object and the Gitch's slot.
    locations: [
      "Below right arm", "Below left arm", "Right hip",
      "Left hip", "Back", "Centre of chest",
    ],
    // Save-Gated Effect (2026-09-13). The entry this mechanism was filed on:
    // the HOST saves to dominate their own limb, and both branches do
    // something. It had been filed against Compel-a-Target Save, whose own
    // description is "a chat card telling THE TARGET which Save to make", and
    // nobody is compelled here.
    //
    // THE SUCCESS BRANCH IS +1 HAND, not an attack this code rolls. RULED
    // 2026-09-13 (Matt): "the mechanical effect of the save is +1 to the PC's
    // hand count. They can use it for an unarmed attack, or to equip a weapon
    // and attack with that weapon." That is the book's "one extra one-hand
    // attack per round" expressed as the thing the sheet already tracks, and
    // it means the player spends it however they like rather than being handed
    // a d6 the book never gave the host.
    //
    // THE FAILURE BRANCH SPAWNS THE LIMB as a real Actor — see the Usurper Arm
    // entry in bestiary-data.js, which carries the book's own level 2 / AV 17 /
    // d6 stat line.
    saveGated: {
      ability: "ego",
      label: "Call upon the Usurper Arm",
      oncePerCombat: true,
      prompt: "calls upon the <b>Usurper Arm</b>, straining to dominate it",
      onSuccess: {
        handsBonus: 1,
        text: "The limb awakens and fights for them — <b>+1 hand</b> for the rest of the encounter, spent on an unarmed attack or on holding and attacking with a weapon.",
      },
      onFailure: {
        spawn: "Usurper Arm",
        text: "The limb attacks them instead, and stays hostile for the rest of combat. It has been created as an Actor — place it when you want it. Missed attacks against the limb damage the host.",
      },
    },
    item: { type: "affliction", slots: 0 },
  },

  {
    key: "dreamcage",
    name: "Dreamcage",
    kind: "nanomachine",
    virulence: 13,
    abilitySlot: "INT",
    book: "Miscellany/Nanomachine Infections.md",
    // COMPLETED IN JADE IBIS 15-09-26. SABLE GECKO and CRIMSON HOUND both broke
    // off mid-sentence, and this entry was a placeholder under Matt's 2026-09-13
    // ruling that nobody be afflicted with it until an edition finished it.
    // JADE prints the whole entry and narrows the Slot from INT + PSY to INT.
    //
    // RULED 2026-09-16 (Matt): an afflicted character is blocked from using
    // Gifts, and the other effects are carried by the board row's text. The
    // block is a condition, the same shape as Janus Lenses' halfLongRest, and
    // actor-sheet.js's _onGiftUse is the one place that reads it.
    effects: "The ancients recorded nine divine punishments inflicted upon those who denied the apotheosis of the Titans. One such punishment was the Dreamcage, severing those afflicted from the world of dreams and preventing their blue soul from leaving their body. This nanomachine infection manifests as a network of dark nodules beneath the flesh of the scalp, emitting blue light during sleep. The victim can no longer dream, nor can their unconscious mind exercise authority over reality. They cannot use Gifts, communicate telepathically, perceive quantum daemons, or enter psychedelic trances.",
    cure: "A trained cybernetics surgeon can excise the Dreamcage and prevent its regrowth.",
    vector: "The touch of a Maladaptor, or contact with an infected character's blood or stomach acid.",
    conditions: [NO_GIFTS],
    item: { type: "affliction", slots: 0 },
  },

  {
    key: "fabricator-stoma",
    name: "Fabricator Stoma",
    kind: "nanomachine",
    virulence: 14,
    abilitySlot: "STR + CON",
    book: "Miscellany/Nanomachine Infections.md",
    recurrenceKey: "fabricator-stoma",
    // "Must consume double rations each day or become Deprived" - Travel and
    // Rations and Deprived State, RULED 2026-09-24 (Matt): the Gills shape,
    // read by rest.js rationDrawFor from the affliction Item.
    rationDraw: { food: 2, water: 2 },
    effects: "The metabolic hijacking increases the host's appetite; they must consume double rations each day or become Deprived. Each morning, a finished object is painfully extruded through a new orifice on their flank.",
    cure: "Removal by an experienced cybernetics surgeon. The operation is not cheap.",
    vector: "The touch of a Maladaptor, or contact with infected blood or stomach acid.",
    item: { type: "affliction", slots: 0 },
  },

  {
    key: "the-gitch",
    name: "The Gitch",
    kind: "nanomachine",
    virulence: 15,
    // "Roll d6 to determine. 1 = STR, 2 = DEX, etc." — resolved at contraction
    // against this order, which is the book's own ability order.
    abilitySlot: "d6",
    slotRollOrder: ["STR", "DEX", "CON", "INT", "PSY", "EGO"],
    book: "Miscellany/Nanomachine Infections.md",
    recurrenceKey: "the-gitch",
    // Crystal debridement - Activity Time Cost, RULED 2026-09-24 (Matt): "one
    // day for each item slot occupied by crystals", an effort on the board
    // fixed at the slots held when it starts, pausing if interrupted. At the
    // finish line the Gitch is cured automatically and the crystals removed.
    treatment: { label: "Begin crystal debridement", name: "Gitch debridement",
                 perSlotOf: "Gitch Crystals", unit: "day", removesWound: "Gitch Crystals" },
    effects: "For each item slot filled with Gitch Crystals, the PC gains one point of AV, and loses one point of the Ability infected by the Gitch. When all available slots are filled, the character becomes a mindless Gitchghast.",
    cure: "Crystal debridement by a Gitch Doctor, taking one day for each item slot occupied by crystals.",
    vector: "Physical contact with an infected character, inhaling Gitch-dust, or the bite of a Gitchghast.",
    item: { type: "affliction", slots: 0 },
   declaredSpan: null },
];

/**
 * The slots an infection actually HOLDS: the book's, plus every slot the
 * implants it displaced were occupying.
 *
 * MATT'S CATCH 2026-09-13, and it closes a hole the restore path opens rather
 * than the contraction path. Solar Scaling occupies CON + EGO. Goldencough
 * takes CON, displacing it — and EGO is now free. Install an EGO implant, cure
 * the Goldencough, and Solar Scaling returns onto a slot something else is
 * already holding. Nothing notices, because checkImplantSlotConflict only runs
 * at CREATION and the creation that breaks the rule is the cure putting back
 * an implant that was perfectly legal when it left.
 *
 * Eight of the forty implants are multi-slot and one is three wide
 * (Dreadnaught Carapace, STR + DEX + CON), so this is an ordinary case.
 *
 * Pure, and here rather than in affliction.js, so the offline suite can drive
 * it — that module reaches Foundry globals and cannot be loaded outside them.
 *
 * @param {string[]} bookSlots        what the entry prints
 * @param {string[][]} displacedSlots one list per displaced implant
 */
export function heldSlots(bookSlots, displacedSlots = [])
{
  const out = new Set(bookSlots.map(s => String(s).trim().toUpperCase()).filter(Boolean));
  for(const list of displacedSlots)
    for(const s of list) out.add(String(s).trim().toUpperCase());
  return [...out];
}

/**
 * The base Trade Value of treating an affliction, or null where the book gives
 * none.
 *
 * JADE IBIS 15-09-26, Diseases: "The base Trade Value of treatment is equal to
 * the disease's Virulence. This price will double or triple if the PC is visibly
 * close to death." Stated in the diseases section only, so a nanomachine
 * infection returns null - its cures are surgery and the book prices none of
 * them. Only the BASE is returned: whether a PC is visibly close to death is
 * the Referee's call, so the doubling is shown as words and never applied.
 * RULED 2026-09-16 (Matt) as GM-only text on the effects board.
 */
export function treatmentCostFor(entry)
{
  return entry?.kind === "disease" && Number.isFinite(entry.virulence) ? entry.virulence : null;
}

/** One affliction by key, or null. */
export function afflictionByKey(key)
{
  return AFFLICTIONS.find(a => a.key === key) ?? null;
}

/**
 * The ability slots an infection occupies, as the uppercase tokens
 * `ability_slot` already uses on both implant rosters.
 *
 * `rolled` is the resolved letter for the Gitch, whose slot is a d6 at
 * contraction; passing it for any other affliction is ignored.
 */
export function slotsOccupiedBy(entry, rolled = null)
{
  if(entry?.kind !== "nanomachine") return [];
  // From the baked sentence since Effect Engine: Wounds and Afflictions chunk 3.
  const slot = afflictionFixedOf(entry.key).abilitySlot;
  const spec = slot === "d6" ? rolled : slot;
  if(!spec) return [];
  return String(spec).split("+").map(s => s.trim().toUpperCase()).filter(Boolean);
}
