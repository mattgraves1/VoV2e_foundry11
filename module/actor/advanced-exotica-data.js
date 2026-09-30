/**
 * Advanced Exotica (Treasure/Exotica - Advanced.md), d100 — a bigger,
 * rarer tier than Starting Exotica (chargen-data.js's EXOTICA), confirmed
 * via the vault no row overlaps between the two tables. Built for
 * work-queue.txt item 1.2.
 *
 * `slots` is the table's own "Slots / Uses" column, first number
 * (rows 14/51/45 give slots without a clean "N / uses" split — see their
 * own comments below). `uses` is kept as the raw uses text (Ud6/x1 use/
 * Unlimited/etc.) for the created Item's description.
 *
 * Rows 08/09 ("Exotic Melee/Ranged Weapon") are the one genuine special
 * case: the vault's own text says "Generate an Exotic weapon using the
 * tables on the Exotic Weapons page" — these don't create a flavor
 * Exotica item at all, they reuse module/actor/weapon-roller.js (the
 * same Exotic-tier roll work-queue item 1.1's Generate Weapon macro
 * already does) to create a real tagged weapon Item instead. Flagged via
 * `weaponGen: "melee" | "ranged"` — see generate-advanced-exotica.js.
 *
 * WORK-QUEUE ITEM 10.3.3 (2026-08-27) — `uses` text migrated into real
 * mechanical fields, `exotica`-type Items now support both:
 * - `usageDie: { die: "dN", max: "dN" }` for "UdN" entries — reuses
 *   module/item/usage-die.js's existing rollUsageDie() unchanged (its own
 *   header comment already anticipated "Exotica rolls on each use", per
 *   Core Rules/Usage Die.md); the `.usage-die-roll` click handler deletes
 *   the Item once it reaches "expended" (Matt's ruling: Exotica never
 *   recharges, so a used-up one doesn't sit around inert like a depleted
 *   weapon does).
 * - `usesRemaining: N` for "xN use(s)" entries — a flat countable
 *   resource, NOT a randomly-depleting die (Matt's call — decrements by
 *   exactly 1 per use via `_onExoticaChargeUse`, same delete-on-zero
 *   behavior).
 * Entries destined to become real weapon (10.3.1, fully retracted — see
 * work-queue.txt) or armor (10.3.2) type Items are deliberately left
 * without usageDie/usesRemaining here. "Unlimited" and other unique uses
 * text (Infinite, Feeds four PCs, None (floats nearby)) get no new field
 * — nothing to deplete.
 *
 * WORK-QUEUE ITEM 10.3.2 (2026-08-27) — `armorType: { armorSlot,
 * avBonus, liveAbilityBonus? }` flags 13 AV/ability-bearing worn entries
 * to be created as real `armor`-type Items instead of flavor `exotica`
 * ones (see generate-advanced-exotica.js), so they get item 11's
 * body/helm/shield slot-exclusivity for free. `liveAbilityBonus` is
 * read live off the Item by actor.js's _prepareCommonData while
 * equipped, same convention as avBonus. 5 of these 13 (Ultravisor,
 * Fascinator Helm, Horror Helm, Lazarus Cap, Psybernetic Helm) are
 * "hybrid" — their `uses`/activated-ability text still describes a
 * triggered effect that has no mechanism yet; only the passive AV half
 * is built here, the activated half is deferred to whichever future
 * item (10.3.3/10.3.4/10.3.5) builds it.
 *
 * WORK-QUEUE ITEM 10.3.4 (2026-08-27) — 2 of the above hybrids
 * (Fascinator Helm, Horror Helm) get their deferred activated half
 * built here: their real "Ud8" limit is now tracked via `usageDie`
 * (armor gained the shared usageDie template for this — Matt's ruling:
 * tracks the activated ability's own use only, does NOT delete the
 * item or mark it broken/expended-and-gone the way exotica's usageDie
 * does; an expended armor usageDie just sits inert, same default
 * behavior as gear/weapons). The other 11 "compel a target to save"
 * entries (C-Foam Puddings, Empathy Bomb, Pacifying Glove, Singularity
 * Bomb, Spirit Prison (Empty), Anti-Gravity Field Generator, The
 * Crimson Cantos, 3 Titancreed Fragments, Bedazzling Blade) reuse
 * their EXISTING usageDie/usesRemaining/no-pool fields unchanged —
 * this item only adds the descriptive save-text chat message on use,
 * in actor-sheet.js. Bottled Thicket was dropped from this item's
 * original scope after being retracted into 10.3.9 (see that item's
 * ADDENDUM) — it's an area/ongoing effect, not a single-target save.
 *
 * WORK-QUEUE ITEM 10.3.5 (2026-08-27) — "grant a roll on another table"
 * entries. Amaranthine Sugar/Belligerent Paste create their result
 * (a Mystic Gift / a real Exotic weapon) directly on the bearer via
 * actor-sheet.js's `_onExoticaGrantRoll`, no new data fields needed here.
 * Cybernetic Cocoon/Cybernetics Pack are a two-stage design (Matt's
 * ruling): opening one only determines WHICH implant it contains,
 * creating a new sealed capsule Item (`system.sealedImplant`, a name
 * string — see template.json's `exotica` block) that can be installed
 * later (by this character or after being traded) rather than
 * attempting the install immediately and risking wasting the roll on an
 * ability-slot conflict. Psybernetic Helm's "first wear" Gift unlock
 * hooks into `_onItemEquip` instead (it's armor-type, from 10.3.2), no
 * data field needed — it's tracked via a Foundry item flag
 * (`vaarn.giftUnlocked`), not `system` data.
 *
 * WORK-QUEUE ITEM 10.3.6 (2026-08-27) — Manifold Box's `slotBonus: 10`
 * reuses mutations'/implants' existing flat-slot-bonus bake mechanism
 * (item-effects.js's `applyBakedItemEffects`, extended to also look up
 * `exotica`-type Items against this file) rather than building a real
 * nested-container system (Matt's proposal).
 *
 * WORK-QUEUE ITEM 10.3.7 (2026-08-27) — Universal Ration and Sprayflesh
 * are the 2 clean healing entries. Both descriptions were made
 * deliberately explicit (Matt's ask) about which one restores HP and
 * which removes a Wound, since a player using either could otherwise
 * expect it to do both. Biotic Field Generator was ruled narrative-only
 * (Matt, 2026-08-27) — folded into 10.3.9 rather than built here.
 * RE-RULED 2026-09-22 (Matt): each use creates a "Biotic Field" actor
 * (`targetHeal.field`) carrying a GM button that heals the targeted tokens
 * by hand, removed when its 6 rounds (`targetHeal.span`) end. The span is
 * NOT a declaredSpan (Matt, 2026-09-22): that would give the generator its
 * own hourglass, and the timer belongs to the field. Who stands in the
 * cloud is token positioning, so the Referee adjudicates each round and
 * clicks; no per-round automation. See module/actor/healing-field.js.
 */

export const ADVANCED_EXOTICA = [
  // Save-Gated Effect (2026-09-13). The wielder is the saver, which is what
  // moved it off Compel-a-Target Save.
  //
  // DELIBERATELY NOT WIRED TO THE INCOMING ATTACK. RULED 2026-09-13 (Matt):
  // "mirror shield is poorly designed. should you be able to reflect a miss?
  // doesn't specify, but seems silly. I think we can implement it as a use
  // button that displays success or failure, but it is up to the player to
  // assert its use, and up to the GM to decide if it is usable. I don't think
  // we should even try to wire it to the attack it's used against." So both
  // branches are text, and that is the whole entry rather than a stub — the
  // book prints no reflected-damage rule to apply.
  //
  // NO oncePerCombat: it is an Unlimited-use item reflecting whatever comes at
  // it, unlike the Usurper Arm, whose question is settled for the fight either
  // way.
  { roll: 1, name: "Active Camouflage Ring", description: "The user vanishes from visible spectrums of light, adding +10 to their AV. Creatures using unconventional means to see are unaffected.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" },
    // Live AV Computation wiring, RULED 2026-09-25 (Matt): until end of combat.
    combatAv: 10, combatAvNote: "Creatures using unconventional means to see are unaffected - the Referee's call." },
  { roll: 2, name: "Adamant Linen", description: "A robe of flowing linen that protects the wearer like it were hewn from steel. Grants AV 18 to the wearer.", slots: 2, uses: "Unlimited", armorType: { armorSlot: "body", avBonus: 8 } },
  { roll: 3, name: "Amaranthine Sugar", description: "A fabulously valuable substance, extracted through patient husbandry from the bodies of adult sandworms. Resembles reddish-purple sugar. If consumed, the sugar grants a random Mystic Gift (p.xx).", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 4, name: "Ammunition Fabricator", description: "Use to refill the ammunition for any ranged weapon in your possession.", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 5, name: "Ansible", description: "Crystalline orb. Allows faster-than-light communication with a linked Ansible.", slots: 1, uses: "Unlimited" },
  { roll: 6, name: "Anti-Gravity Field Generator", description: "A tetrahedron of lusterless black metal. When activated, excludes Urth's gravity within throwing distance of the user. Creatures not adapted to zero gravity environments must DEX Save to move or else float helplessly.", slots: 3, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 7, name: "Apocalypse Glass", description: "Dark looking-glass which shows not your reflection, but an extra-solar culture consumed by unimaginable horror. Of interest to some collectors.", slots: 1, uses: "Unlimited" },
  { roll: 8, name: "Ardar-Eld's Grail", description: "Liquids poured into this golden goblet become drinking water.", slots: 1, uses: "Unlimited" },
  { roll: 9, name: "Ardent Maggots", description: "A gourd of strange synthetic grubs that can strip a corpse to the bone in seconds. Does not eat live flesh.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 10, name: "Autarch's Fork", description: "Obsidian dining fork that glows green when stuck into something poisonous.", slots: 1, uses: "Unlimited" },
  { roll: 11, name: "Autarch's Nectar", description: "Honeyed golden tonic containing gene-sculpting nanomachines. When drunk by a Biological creature, grants a permanent +1 boost to three Ability scores.", slots: 1, uses: "x1 use", usesRemaining: 1,
    // Permanent Ability Score Change, RULED 2026-09-26 (Matt): three
    // DIFFERENT Abilities, and a drinker who is not biological is refused.
    permanentAbility: { delta: 1, count: 3, requiresType: "biological" } },
  { roll: 12, name: "Babel Bomb", description: "Neuro-active hand grenade. All living creatures caught within the blast find themselves unable to understand spoken or written language, and their own speech is likewise gibberish. The effect lasts for a day.", slots: 1, uses: "x1 use", usesRemaining: 1 , declaredSpan: null, applies: { effect: "Babel Bomb", text: "Unable to understand spoken or written language; their own speech is gibberish.", amount: "1", unit: "day", viaSave: false } },
  { roll: 13, name: "Bedazzling Blade", description: "Off-handed parrying sword (d6), forged in the Fallen Autarchy. Has an inbuilt trick: the blade can briefly glow as brightly as the sun. Opponents DEX Save vs d4 rounds of blindness.", save: { ability: "dex", mode: "resist", vs: "d4 rounds of blindness" }, applies: { condition: "blind", amount: "1d4", unit: "round" }, slots: 1, uses: "Ud8", usageDie: { die: "d8", max: "d8" } , declaredSpan: null },
  { roll: 14, name: "Belligerent Paste", description: "If applied to a corpse, turns that corpse into an Exotic Weapon. The nature of the weapon depends upon the corpse used (the Referee should use p.xx as a starting point).", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 15, name: "Biotic Field Generator", description: "A golden beacon. When set on the floor, emits a healing cloud of nanomachines for 6 rounds. Biological creatures in melee range regain +d10 HP per round while in the cloud.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } , targetHeal: { dice: "1d10", targets: ["biological"], field: "Biotic Field", span: { amount: "6", unit: "round" } } },
  { roll: 16, name: "Black Cloud Bomb", description: "Releases a cloud of nanomachines that consume all biological material in the area, dealing d6 unblockable damage per round. With each kill, the cloud grows in size and deals an extra d6 of damage. The cloud expands until it cannot find more biological material to consume, at which point it hibernates.", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 17, name: "Blue Rust", description: "Alchemical compound that turns any metal into rust within moments. D6 CON damage to Synthetic creatures per round.", slots: 1, uses: "x1 use", usesRemaining: 1, corrodesMetal: true, abilityTick: { ability: "con", dice: "1d6", targets: ["synthetic"] } },
  { roll: 18, name: "Bluescreen Dagger", description: "Synthetic creatures must EGO Save vs d20 EGO damage when struck. Does not damage other creature types.", slots: 1, uses: "Ud8", usageDie: { die: "d8", max: "d8" }, save: { ability: "ego", mode: "resist", vs: "d20 EGO damage", targets: ["synthetic"], onFail: { abilityDamage: { ability: "ego", dice: "1d20" } } } },
  { roll: 19, name: "Bottled Thicket", description: "Glass vial of weaponised seeds. When vial is broken, seeds begin their rapid life cycle, sprouting into a tangle of iridescent vines within seconds. Fills entire room, strangling all creatures for d8 damage per round. STR Save to escape.", slots: 1, uses: "x1 use", usesRemaining: 1,
    // Per-Round Effect Reminder wiring, RULED 2026-09-25 (Matt): an ongoing
    // hold on every targeted token when the vial breaks.
    hold: { dice: "1d8", escape: { ability: "str", by: "escape the vines" } } },
  { roll: 20, name: "Bounty Beacon", description: "Use under open sky to call down a supply package from an orbiting military satellite (generate as Large Supply Cache, p.xx)", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 21, name: "C-Foam Puddings", description: "Resemble plastic-wrapped, milk-coloured puddings. When thrown, expand into blancmanges of highly adhesive, quick-setting foam. Entrap human-sized creatures in seconds (DEX Save vs paralysis). The foam loosens over a period of eight hours. Salt water shortens this disintegration.", slots: 1, uses: "x6 uses", usesRemaining: 6 , declaredSpan: null },
  { roll: 22, name: "Cat Ring", description: "Antigravity device. Arrests wearer's fall just above the ground, preventing fall damage.", slots: 1, uses: "x9 uses", usesRemaining: 9 },
  { roll: 23, name: "Compass of Origin", description: "A device that unerringly points towards the holder's location of birth. Urth's magnetic field is no longer what it was, so this is more useful than it might seem.", slots: 1, uses: "Unlimited" },
  { roll: 24, name: "Cybernetics Cocoon", description: "Human-sized black cocoon. Installs a random Advanced Cybernetic Implant (p.xx).", slots: 6, uses: "x1 use", usesRemaining: 1 },
  { roll: 25, name: "Cybernetics Pack", description: "Contains a factory-sealed Cybernetic Implant (p.xx).", slots: 2, uses: "x1", usesRemaining: 1 },
  { roll: 26, name: "Demiurge Crayon", description: "A hypergeometric artefact of unimaginable power, resembling a child's crayon. Any item, creature, or other object drawn with this crayon becomes real.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 27, name: "Desiccation Spike", description: "Vile biotech weapon. Deals d6 CON damage to Biological creatures and produces 1 ration of water per successful hit.", slots: 1, uses: "Ud10", usageDie: { die: "d10", max: "d10" }, abilityDamage: { ability: "con", dice: "1d6", targets: ["biological"] } },
  { roll: 28, name: "Disguise Ring", description: "Holographic disguise. Projects a hologram around the wearer. Can be programmed to show an image of any creature or entities that are nearby. Perfect visual replica but anyone attempting to touch the hologram shell will realise the decepiton. Comes pre-loaded with disguise patterned on a creature from the local encounter table.", slots: 1, uses: "Ud8", usageDie: { die: "d8", max: "d8" } },
  { roll: 29, name: "Ditto Gun", description: "Revolver that generates weaponised temporal anomalies when its bullets impact a target. These anomalies inflict a wound identical to the most recent injury suffered by the target, with a matching damage value.", slots: 1, uses: "Ud10", usageDie: { die: "d10", max: "d10" } },
  { roll: 30, name: "Dopplegun", description: "Biotech pistol that births a rapidly aging, dangerously insane clone of any biological creature its bullets hit. The clone has their Abilities and survives for d6 rounds before dying of cancer.", slots: 1, uses: "Ud8", usageDie: { die: "d8", max: "d8" } , declaredSpan: null, applies: { effect: "Dopplegun", text: "An insane clone with the target's Abilities. When this ends, the clone dies of cancer.", amount: "1d6", unit: "round", viaSave: false } },
  { roll: 31, name: "Empathy Bomb", description: "Target Biological creatures must EGO Save or be overcome with compassion for others. This effect last d4 hours.", slots: 1, uses: "x1 use", usesRemaining: 1 , declaredSpan: null, applies: { effect: "Empathy Bomb", text: "Overcome with compassion for others.", amount: "1d4", unit: "hour", viaSave: true }, save: { ability: "ego", mode: "resist", vs: "being overcome with compassion", targets: ["biological"] } },
  { roll: 32, name: "Exotic Melee Weapon", weaponGen: "melee" },
  { roll: 33, name: "Exotic Ranged Weapon", weaponGen: "ranged" },
  { roll: 34, name: "Fascinator Helm", description: "+1 AV. When activated, all Biological creatures in visual range must EGO save or be transfixed by the flickering patterns on this helmet. They cannot move until damaged or until the helm is out of view.", slots: 1, uses: "Ud8", armorType: { armorSlot: "helm", avBonus: 1 }, usageDie: { die: "d8", max: "d8" } },
  { roll: 35, name: "Fate Inverter", description: "Peculiar paradox-device. When activated, all nearby failed Saves become successes, and all successful Saves become failures. Likewise, missed attacks hit, and successful attacks miss.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" },
    // Interactive Chat-Card wiring, RULED 2026-09-26 (Matt): usable only in combat;
    // a reminder row on the user's board until the combat ends. The table flips
    // the results by hand - nothing is inverted automatically.
    untilCombatEnd: { name: "Fate inverted", text: "All nearby failed Saves become successes, and all successful Saves become failures. Likewise, missed attacks hit, and successful attacks miss. Flip each result by hand until the combat ends." } },
  { roll: 36, name: "Fortuitous Polyhedron", description: "20-sided polyhedral quantum anomaly. Allows user to enter a reality where they passed rather than failed a Save. Vanishes after use.", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 37, name: "Friend Fabricator", description: "Matter fabricating cocoon. When activated, creates a randomly generated creature from the local encounter table. The creature is neurally altered so as to love the cocoon's user (treat them as a Pet, see p.xx).", slots: 3, uses: "x1 use", usesRemaining: 1 },
  { roll: 38, name: "Fuligin Garb", description: "Fuligin is the colour that is darker than black. Fuligin clothing completely conceals the wearer when in shadows, with no Save required. Creatures which do not use conventional means to see are unaffected.", slots: 1, uses: "Unlimited", armorType: { armorSlot: "body", avBonus: 0 } },
  { roll: 39, name: "Gecko Gloves", description: "Finely woven nano-cloth gloves. Allow the wearer's hands to stick to any flat surface with a near-unbreakable grip. Can climb impossible distances.", slots: 1, uses: "Unlimited" },
  { roll: 40, name: "Hard Light Projector", description: "Projects a flat wide bridge of weightless hard light, with effective range of ten feet. Could be walked across.", slots: 2, uses: "Ud8", usageDie: { die: "d8", max: "d8" } },
  { roll: 41, name: "Hedondroid", description: "Factory-sealed package containing a synthetic partycrasher. Crude android powered by alcohol, and can unerringly locate parties, orgies, weddings etc. within a five-day radius. Once activated, joins your party as a Follower (p.xx).", slots: 5, uses: "x1 use", usesRemaining: 1 },
  { roll: 42, name: "Hesitant Urn", description: "A hypergeometric pot, baked from pale green clay and engraved with the seals of master hypergeometers. The urn has an opening in the top and a small hole bored at the bottom. Any liquid poured into the urn vanishes from rational space-time, and will trickle out of the hole at the bottom after a delay of exactly seven minutes.", slots: 1, uses: "Unlimited" },
  { roll: 43, name: "Horror Helm", description: "+2 AV. Autarch's war-helm. When activated, the helm bellows terrifying neuroactive threats. All biological foes in earshot must Morale Save or flee.", slots: 1, uses: "Ud8", armorType: { armorSlot: "helm", avBonus: 2 }, usageDie: { die: "d8", max: "d8" } },
  { roll: 44, name: "Hover Boots", description: "Antigravity boots. Allow brief sojourns into thin air.", slots: 1, uses: "Ud8", usageDie: { die: "d8", max: "d8" } },
  { roll: 45, name: "Hushboots", description: "Sable, supple footwear that utterly silence footsteps. ADV when sneaking or attacking blind creatures.", slots: 1, uses: "Unlimited" },
  { roll: 46, name: "Huntsman Fly", description: "Cocoon containing tiny synth-fly. If given a drop of blood or other DNA sample, can unnerringly locate the target. Dies once mission is complete.", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 47, name: "Instant Table", description: "An elegant dining table, compressed using hypergeometry to be the size of a matchbox. Unfurls when thrown to the ground. Cannot be folded up again.", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 48, name: "Lazarus Cap", description: "+1 AV. Grim necrotech helm. If applied to the head of a fresh corpse, it re-activates the brain. The effect only lasts while the cap is worn and does nothing to arrest the decay of the flesh (wearer loses d4 CON per day).", slots: 1, uses: "x1 use", armorType: { armorSlot: "helm", avBonus: 1 } },
  { roll: 49, name: "Lithifying Ray", description: "Experimental weapon shaped like a snake-haired maiden. The ray changes organic material into stone. For each round that the ray is held on a biological target, they permanently lose d6 DEX and gain +2 Armour. At 0 DEX they become a remarkably lifelike statue.", slots: 2, uses: "Ud6", usageDie: { die: "d6", max: "d6" },
    // Per-Round Effect Reminder wiring, RULED 2026-09-25 (Matt): each use is a
    // round the ray is held; the change is PERMANENT, so it is an Item on the
    // target rather than a board entry - deleting the Item is the only undo.
    bodyChange: { itemName: "Lithified", ability: "dex", dice: "1d6", av: 2, targets: ["biological"],
      atZero: "becomes a remarkably lifelike statue" } },
  { roll: 50, name: "Lithling Seed", description: "The corpse (and hence embryo) of a lithling. If immersed in a bath of the correct chemicals, it will slowly crystallize into an adult lithling (p.xx).", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 51, name: "Magnetic Orb", description: "Large silver orb which emits powerful magnetic field when active. All nearby metal objects and Synthetic-type creatures are irresistibly drawn towards it.", slots: 2, uses: "Ud8", usageDie: { die: "d8", max: "d8" }, metalPull: { synthetics: true, synthMind: true } },
  { roll: 52, name: "Manifold Box", description: "A hypergeometric box much larger on the inside than on the outside. The Box holds 10 slots of items weightlessly within itself. Retreiving them during combat takes an action.", slots: 1, uses: "Unlimited", slotBonus: 10 },
  { roll: 53, name: "Mind Shield", description: "+1 AV. Golden cage worn around head. Protects from psychic intrusion. Cannot use Mystic Gifts. Exempt from Gleam Tests (p.xx).", slots: 1, uses: "Unlimited", armorType: { armorSlot: "helm", avBonus: 1 } },
  { roll: 54, name: "Mirror Armour", description: "Dazzling suit of lightweight mirror plate. Grants AV 16 and immunity from Beam attacks. Cannot hide in shadows.", slots: 3, uses: "Unlimited", armorType: { armorSlot: "body", avBonus: 6 } },
  { roll: 55, name: "Mirror Shield", description: "+1 AV. DEX Save to reflect beam attacks back at their source.", slots: 1, uses: "Unlimited",
    // A real shield since 2026-09-25 (RULED, Matt): +1 AV while equipped, and
    // a hand, as every shield takes. The save below stays its use control -
    // saveGatedSpecFor reads armour flagged Exotica for exactly this entry.
    armorType: { armorSlot: "shield", avBonus: 1 },
    saveGated: {
      ability: "dex",
      label: "DEX Save to reflect a beam attack",
      prompt: "angles the <b>Mirror Shield</b> into the path of a beam",
      onSuccess: { text: "The beam reflects back at its source. Resolve it against the attacker." },
      onFailure: { text: "The beam is not turned, and strikes as it would have." },
    } },
  { roll: 56, name: "Moonbeast Carapace", description: "The flayed carapace of a vile Moonbeast (p.xx). The wearer has AV 16, and immunity to poisons and radiation. Once donned the carapace cannot be removed.", slots: 3, uses: "Unlimited", armorType: { armorSlot: "body", avBonus: 6 } },
  { roll: 57, name: "Mord-Red's Grail", description: "Liquids poured into this silver goblet become deadly poison (d12 TOX).", slots: 1, uses: "Unlimited", toxSave: "d12" },
  { roll: 58, name: "Not-Sword", description: "A sword (d8) engraved with paradoxical LogLang glyphs. Synthetic creatures cannot recognise this weapon as a blade, nor can they recognise its bearer as a living being.", slots: 2, uses: "Unlimited",
    // Creation-Time Item Modifiers wiring, RULED 2026-09-26 (Matt): a real melee
    // weapon, d8, one hand, still Exotica. The synth clause stays text.
    weapon: { type: "weaponMelee", damageDice: "1d8", hands: 1 } },
  { roll: 59, name: "Oneiric Bridge", description: "A peculiar conflux of wires. Allows the user to enter the dreams of a sleeping creature and influence their thoughts.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 60, name: "Pacifying Glove", description: "Biological creatures touched with the glove must EGO Save or fall asleep for d6 hours.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } , declaredSpan: null, applies: { effect: "Pacifying Glove", text: "Asleep.", amount: "1d6", unit: "hour", viaSave: true }, save: { ability: "ego", mode: "resist", vs: "falling asleep for d6 hours", targets: ["biological"] } },
  { roll: 61, name: "Pale Fire", description: "A wooden flask holding a hueless flame, kindled from an extradimensional anti-ember. Burns bitterly cold and consumes fuel that do not usually burn: metal and water especially. May be extinguished with oil or another flammable liquid.", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 62, name: "Phase Cape", description: "Hypergeometric cloth; allows wearer to slip out of lucid reality for d4 rounds. You cannot be touched by anyone, but neither can you touch them. You are still visible.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } , declaredSpan: { amount: "d4", unit: "round" } },
  { roll: 63, name: "Phase Grenades", description: "Every physical object caught in the blast becomes briefly desynced with reality, allowing others to pass through them as if they are made of mist. The effect lasts one combat round and is not harmful.", slots: 1, uses: "x4 uses", usesRemaining: 4 , declaredSpan: null },
  { roll: 64, name: "Philosopher's Bridge", description: "A device creating a pair of hypergeometric gates on solid walls, one blue and one orange. The portals may be passed through like open doorways, with any objects that pass through retaining their momentum. The user may close both portals at will.", slots: 2, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 65, name: "Philosopher's Dirk", description: "Neuroactive dagger dealing d4 INT damage per stab. At 0 INT, the victim adopts your point of view.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" }, abilityDamage: { ability: "int", dice: "1d4" } },
  { roll: 66, name: "Portable Hole", description: "Creates a six-inch hypergeometric borehole straight through any solid object. Causes no harm to the structure or creature. When you're done using it, peel the Portable Hole off the surface and put it back in your pocket.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 67, name: "Presence Drone", description: "Small floating sphere that announces one's presence in a loud, pompous voice. DIS on encounter rolls. Impossible to hide. Once activated must be destroyed or traded away to stop it following you.", slots: 0, uses: "None (floats nearby)", encounterDis: "announced by a pompous drone" },
  { roll: 68, name: "Prison Orb of the Miniature Beast", description: "A hypergeometric orb the size of a grapefruit, with a scarlet upper hemisphere and a pallid lower hemisphere. Used by the citizens of a long-faded civilisation to imprison tiny fighting-beasts and compel them to do battle with other beast-masters. 4-in-6 chance the Orb still contains a Citrine-coated Volt Rat (p.xx), hungry and trained to kill without hesitation. 2-in-6 chance the Orb holds nothing but the desiccated corpse of a forgotten beast.", slots: 1, uses: "Unlimited" },
  { roll: 69, name: "Psybernetic Helm", description: "+1 AV. When worn for first time, installs a random Mystic Gift (p.xx).", slots: 1, uses: "x1 use", armorType: { armorSlot: "helm", avBonus: 1 } },
  { roll: 70, name: "Quantum Daemon Horn", description: "Sound to draw the attention of a Greater Quantum Daemon (p.xx). They arrive immediately and are bound to perform one boon for you.", slots: 1, uses: "x1 use", usesRemaining: 1 },
  { roll: 71, name: "Quantum Umbilical", description: "Strange device that links the destiny of two creatures. While one lives, the other cannot truly die.", slots: 2, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 72, name: "Scatter-Shoal Ring", description: "When activated, projects 9 hard-light holograms of the wearer which scatter like frightened fish in all directions. The holograms are solid and react when `hurt', although they cannot speak. Opponents have a 1-in-10 chance of targeting the correct image of the wearer.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 73, name: "Serenity Sphere", description: "A sphere of polished neuroactive crystal, roughly the size and weight of a grapefruit. Resting the sphere in both hands produces the feeling of being immersed in a comforting warm bath, allowing the bearer to endure minor discomforts with ease.", slots: 1, uses: "Unlimited" },
  { roll: 74, name: "Singularity Bomb", description: "A glass sphere that contains a miniature gravity singularity. When released the gravity singularity draws in all objects in the room. DEX Save vs instant death inside the singularity.", slots: 1, uses: "x1 use", usesRemaining: 1, save: { ability: "dex", mode: "resist", vs: "instant death inside the singularity", onFail: { death: true } } },
  { roll: 75, name: "Snakemaker", description: "A gun that makes and fires synthetic snakes (LVL 0, AV 11, d4 bite). They do not like or obey the wielder.", slots: 1, uses: "Ud8", usageDie: { die: "d8", max: "d8" } },
  { roll: 76, name: "Sovereign Glue", description: "Unbreakably stick two objects together.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 77, name: "Spirit Prison (Empty)", description: "Manifold crystal prison designed to trap paradoxical creatures. This example is empty. When thrown at hypergeometric or outsider creatures, they must EGO Save or be trapped forever inside the prison, to be released at the bearer's pleasure.", slots: 1, uses: "Unlimited" },
  { roll: 78, name: "Spirit Prison (Occupied)", description: "Manifold crystal prison designed to trap paradoxical creatures. This example is occupied: roll on the Paradoxical Outsiders table (p.xx) to determine which entity is imprisoned.", slots: 1, uses: "Unlimited" },
  { roll: 79, name: "Sprayflesh", description: "Canister that sprays healing pseudoflesh over wounds. Remove 1 Wound from Biological target per use.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 80, name: "Starskin", description: "A biomechanioid space-suit, worn by voidfarers of antiquity. Grants AV 16, and immunity to suffocation. Move freely in antigravity.", slots: 3, uses: "Unlimited", armorType: { armorSlot: "body", avBonus: 6 } },
  { roll: 81, name: "Stasis Bomb", description: "Any creatures caught in the blast are marooned outside space-time for 2d6 combat rounds. They cannot take any action, nor be harmed nor touched.", slots: 1, uses: "x1 use", usesRemaining: 1, applies: { effect: "Stasis Bomb", text: "Marooned outside space-time: cannot take any action, nor be harmed nor touched.", amount: "2d6", unit: "round", viaSave: false } },
  { roll: 82, name: "Stormcaller", description: "Accursed flute that disturbs the kingdoms of the upper air. When played beneath an open sky, a Prismatic Tempest (p.xx) forms overhead.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 83, name: "TALLHAT Amplifier", description: "A psionic amplifier system, hidden inside a black conical hat. When worn, +1 to all mental Abilities. Identifies one as a Witch of the Mooncradle Mountains.", slots: 1, uses: "Unlimited", armorType: { armorSlot: "helm", avBonus: 0, liveAbilityBonus: { int: 1, psy: 1, ego: 1 } } },
  { roll: 84, name: "Tech Wand", description: "Silver wand. Use to re-activate or deactivate a piece of arcane technology.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 85, name: "Tempest Cannon", description: "Creates localised, incredibly violent thunderstorms wherever its shells explode (d12, blast, electrical). Reload with 3 rations of water.", slots: 3, uses: "Ud4", usageDie: { die: "d4", max: "d4" },
    // Creation-Time Item Modifiers wiring, RULED 2026-09-26 (Matt): a real ranged
    // weapon, d12 blast and electrical, two hands; its Ud4 rolls on every shot
    // (the Dirk's ruling). Spent, it stays: attacking offers the reload, 3 Water
    // Rations for a full die again.
    weapon: { type: "weaponRanged", damageDice: "1d12", damageTypes: ["blast", "electrical"], hands: 2 },
    reload: { item: "Water Ration", count: 3 } },
  { roll: 86, name: "The Book of Sand", description: "Hypergeometric object resembling a book with an infinite number of pages, each one containing an infinite number of tiny paragraphs written in illegible text. Decoding the book is impossible, although its infinite length provides endless fuel for any burning fire.", slots: 1, uses: "Infinite" },
  { roll: 87, name: "The Crimson Cantos", description: "Small, unassuming volume of poetry, bound in crimson leather. The book's contents are neuro-active, and always guaranteed to fling the reader into a murderous rage. Readers must EGO save or violently attack the nearest living creature.", slots: 1, uses: "Unlimited" },
  { roll: 88, name: "Thinking Cap", description: "+1 AV, +2 INT. If wearer was not previously sentient, it now becomes so.", slots: 2, uses: "Unlimited", armorType: { armorSlot: "helm", avBonus: 1, liveAbilityBonus: { int: 2 } } },
  { roll: 89, name: "Titancreed Fragment: KILL", description: "A fragment of the language of the Titan AIs. When read aloud, all Syntehtic creatures in hearing range must EGO Save or fly into a killing frenzy.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 90, name: "Titancreed Fragment: OBEY", description: "A fragment of the language of the Titan AIs. When read aloud, all Syntehtic creatures in hearing range must EGO Save or obey one verbal command from the reader.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 91, name: "Titancreed Fragment: SLEEP", description: "A fragment of the language of the Titan AIs. When read aloud, all Syntehtic creatures in hearing range must EGO Save or fall into a resting state.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 92, name: "Ulfire Lantern", description: "Shines ulfire light. Can see through solid objects and be seen. Blocked by lead.", slots: 1, uses: "Ud8", usageDie: { die: "d8", max: "d8" } },
  { roll: 93, name: "Ulfire Paint", description: "Ulfire is the ninth visible colour, and its light is visible through solid objects. Anything marked with ulfire paint can be seen through walls.", slots: 1, uses: "Ud6", usageDie: { die: "d6", max: "d6" } },
  { roll: 94, name: "Ultra-kinetic Gel", description: "Green gel that temporarily amplifies kinetic energy on any surface it coats. Increase speed of mechanisms, create temporary jump-pads, create the world's most dangerous frisbee, etc.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" } },
  { roll: 95, name: "Ultravisor", description: "+1 AV. Heptaglass war-visor that encircles the wearer's head. The wearer has ultravision and can never be blinded or ambushed. When the visor is activated, any attack the wearer makes with a ranged weapon automatically hits.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" }, armorType: { armorSlot: "helm", avBonus: 1 }, ambush: "immune" },
  { roll: 96, name: "Universal Ration", description: "Thick white nutrient-cake containing everything a human body needs. Full heal for Biological creatures.", slots: 1, uses: "Feeds four PCs" },
  { roll: 97, name: "Vimana Map", description: "Small chunk of crystal. When activated, projects a holographic map guiding the user to the location of a lost Autarch's Vimana (p.xx).", slots: 1, uses: "Unlimited" },
  { roll: 98, name: "Wand of Annihilation", description: "A rod of golden plasteel, a hand's span in length. Can be used, when one has line of sight to the sky, to call down an orbital laser strike from an ancient war satellite. This attack deals d100 beam damage to any target indicated with the golden wand.", slots: 1, uses: "Ud4", usageDie: { die: "d4", max: "d4" }, strike: { damageDice: "1d100", damageTypes: ["beam"] } },
  // gmReminder: Standing GM Reminder, RULED 2026-09-23 (Matt). The nip is the
  // Referee's to call, so the holder gets a GM-only board row for as long as
  // the ferret is held - see module/time/gm-reminder.js.
  { roll: 99, name: "Watchful Ferret", description: "A small golden synthetic ferret that sits on your shoulder. Nips you if it detects an unseen danger. Does not need to eat or breathe.", slots: 1, uses: "Unlimited", gmReminder: true },
  { roll: 100, name: "Wind-up Haruspex", description: "Clockwork fortune teller. When provided the entrails and stomach of a freshly killed animal or person, it discerns the most-likely future using the guts. Only answers one question at a time. Can only answer YES, NO, or PERHAPS.", slots: 3, uses: "Unlimited" },
];
