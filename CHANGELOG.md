# Changelog

Each release adds its own section at the top, written by hand and grouped
by feature. Changes not yet released are listed under Unreleased.

## Unreleased

## 0.4.0

### New
- A Sacred or Blasphemous weapon now names its religion: a faith from a settlement or holy place already in
  your world, or the book's faith tables when there are none yet. A Petty God, Titan, Autarch or Quantum
  Daemon cult is named in full ("Sacred (the Spider of Mutants)"), and a settlement keeps the god a weapon
  first named for it. Generate Weapon lets the GM pick the faith. The reaction roll's question names it too.
- Level drain (the Kronophage's Borrowed Time, a Gift's Drain a Level) now works on any character and on
  creatures. A character whose level-up record is incomplete - levels typed onto the sheet, an imported
  character - takes the book's drain: the Level, 1d8 off maximum HP, and a point off each of their three
  highest abilities. A creature loses a Level, 4 maximum HP, and its abilities drop to the new Level.
  Slaying the drainer gives back exactly what it took. Fixed: a character drained twice by the same
  Kronophage got their level records back in the wrong order when it died.
- Any item can be marked Broken (a checkbox on every item sheet, not only weapons). A broken item
  cannot be equipped, comes off if it was worn, and refuses every use until the Referee clears the box.
  Armour at quality 0 counts as broken. The Damaged Item wound now marks the gear in its rolled slot
  broken (a wound or mutation in that slot is named, and nothing is damaged), and a Rustacean's
  corrosion marks the item broken instead of renaming it "(Corroded)". Existing items start unbroken.
- The five once-a-day Bloomboons (Empathogen Pollen, Glue Resin, Neurotoxic Pollen, Oily Sap,
  Soporific Pollen) now count their daily use, like Ink Ducts or Gas Glands: the sheet shows the
  uses left and a refresh icon, a second use the same day is refused, and a Long Rest refills it.
  An existing Neobloom starts with its use available - nothing to do after updating.
- A Gift effect can carry its own price table: the portal and telepathy are priced by distance
  (d6 the same room ... d20 anywhere in the world), psychometry by how long the thing has been
  held (d20 under a turn ... d6 a day or more). The cost dialog offers that table's dice with
  their words; the builder's cost slot on a Gift offers "priced by". The Gift Effect Library is
  complete: all 58 chosen effects.
- The last three Library effects: Unerring strike (the target's next attack is a natural 20 - it
  hits, its damage doubles, and the effect is spent), Take the blow (the user holds the protector
  rule for a while, through a bestowed effect), and Invert gravity (Floating; the end card says how
  many rounds they fell). Every one of the 58 chosen Gift effects is now in the Library.
- Deprived, Berserk and Incorporeal can now be applied by any use (the builder's condition list),
  and each state's own mechanics follow: no healing, double damage dealt and taken, no ordinary
  damage taken or dealt. A Gift's old "Ghostly" effect now makes its target incorporeal rather
  than saying so. Three more Library entries: 55 of the 58.
- Seven more effects a use can carry, each applied from the effect card: temporary HP (its own
  thing, not a heal - the Deprived can take it), a cure (poison stepped down by the user's PSY, an
  affliction chosen on Apply, a fire put out), a wound closed (chosen on Apply), a Level drained
  (no gain for the user), armour eroded by PSY, the escalating beam (1 damage, doubling each
  round on the round card), and a jinx. Nine more Library entries for Gifts: 52 of the 58.
- A use can bestow a passive effect for a while, on the user or a target: immunity to a condition
  or to ambush, ADV or DIS on saves, ADV or DIS on their attacks, attacks against them at DIS,
  half damage from a type, reflected misses, light, no need of rations, breathing underwater. It
  arrives as an intrinsic item on the sheet, with its effect on its own Effects tab, and goes when
  the effect ends. Eleven more Library entries for Gifts come with it.
- A stat change can be a formula: +@psy, @cost+@psy or +1d4, filled and rolled when the effect
  is used. The Library gains AV bonus (the die paid plus PSY) and Ability boost (the user's PSY).
- The Gift Effect Library: every Mystic Gift's Effects tab now lists thirty effects a Gift can
  carry - blind, entangled, asleep, paralysed, charm, mind control, a command, fear, misfortune,
  vulnerable, cannot die, invisibility, a portal, telepathy and more - grouped, the Gift's own
  Quality first. Each is priced the book's way (the die you choose when you use it, by the
  targets' Level for anything but damage and healing); click Add, then change anything in the
  builder. Cannot Die, Misfortune and Vulnerable are now conditions any effect can apply.
- Generate Exotica: a new World Macro that rolls the book's Exotica Generator - a Material, a
  Form, a Theme and an Action - and makes the thing as an Exotica Item ("Coral Anchor") with
  the four words in its description. Its Effects tab offers suggestions from its words - two
  for every Action, and typed damage when its material or theme names one - each added with a
  click and changed in the builder, where the Referee also sets what using it costs. Worth 1
  XP, as every Exotica is.
- A use can grant an attack for a while - claws, a sting, a beam: its name, dice, damage type,
  melee or ranged - on the user at once or on a target by a card with Apply. The weapon takes no
  slots or hands and goes when the effect ends: a span, the combat's end, or the Referee's say.
- A use can make someone's attacks auto-hit, or hit as though the target were unarmoured, for a
  while - every attack, or melee or ranged only; on the user at once, on a target by a card with
  Apply; until the Referee ends it, for a span, or until the combat ends. The hit card and the
  attack roll say which effect did it.
- A use can change a stat for a while: AV or an ability, up or down, for rounds, turns,
  hours, days, until the combat ends or until the Referee ends it. On the user it applies at once;
  on a target it is a card with Apply. The change lives on the Active Effects board and is gone
  the moment the entry is.
- Seven more effects a GM can compose on any Item's use: ability damage (STR, DEX... loss) and
  an outright kill, each an Apply per target on the effect card; a compulsion, which goes on the
  target's Active Effects board until the Referee ends it; and teleport, forced move, reveal
  and conceal, said to the targets in the effect's own words. A use whose card has nobody
  targeted now says so instead of posting nothing.
- An effect on something worn or carried now reaches every attack its bearer makes: a monocle's
  "target saves or Blind", a visor that ignores armour, an implant that adds EGO to damage, a
  charm that heals on a kill or strikes a miss back. A weapon's own effects stay the weapon's.
  The builder offers those fourteen attack effects on every Item but a weapon. A to-hit ability
  on a worn Item is an offer: the attack rolls with the best of it and the weapon's usual
  ability, and the card says which; a Psionic weapon keeps PSY.
- The Effects tab's builder offers more of what the system already reads, on every Item it
  reads it from: an ability bonus, ADV or DIS on the bearer's attacks, DIS on encounter rolls,
  needing no rations, hidden HP, a base AV, extra helmets, a damage property (flat, gills...),
  no helmets, and a use whose target saves or takes a condition - until it saves to end it,
  if you like. A use can now cost a use from a daily pool (mutations and implants), a roll of
  the Item's usage die, or the Item itself; a condition can last until the combat ends; a use
  can reach every targeted creature. A Gift can carry a plain use with fixed dice and any of
  those costs beside its die + PSY effects.
- Generate Settlement opens a preview first: drag places around (the roads and wall follow),
  change the settings, rename the town, then Create settlement.
- Generate Settlement now makes a settlement journal in a Settlements folder, by the book's
  Mapping a Settlement: an Overview page and a page for each marked place - the seat of
  power, water source, assets, major problem, notable buildings and landmark - each with
  Make an NPC here. It replaces the whispered chat card. Names are built from each
  settlement's details and never repeat in your world.
- A generated settlement also gets a map in a Settlement Scenes folder: its walls, roads,
  dwellings and gathering places, with a pin for the Referee on every place. The places
  start hidden from players: Reveal on the map, on a place's page or by the eye beside
  its link, shows its icon and name to everyone.
- Settlement pages get follow-up buttons too: a Drug Cafe makes the drug, a Vault Entrance
  the vault, Banditry the bandit camp, a Jigsaw Courtier's House spawns the courtier, a
  Titan Cult faith opens Titan Cults, and so on.
- A region's Settlement is a real settlement now: named from its details in the preview,
  its page shows its overview, and Build this settlement makes its journal and map. A
  Holy Place set in a Settlement can build that town too. Region codes made before this
  name their settlements differently; their maps are unchanged.
- Referee's Guide chapter 11 has a full Settlements section: the preview, the journal,
  the map and revealing places, follow-up rolls, and settlements in a region.
- Region location pages have a Follow-up rolls box: where a page's details name
  something the system can make - a vault entrance, a quantum daemon, an autarch, a
  drug, Exotica - a button makes it and links it on the page. Regions you have
  already made get the buttons too.
- Where a location's details name another kind of place - a ruin that is now a bandit
  hideout, a fortress that contains an archive - a button rolls that place into the
  same page as its own section, with its own follow-up buttons and creatures.

### Fixes
- Generate Settlement, and a region's Settlement pages, now roll Majority and
  Minority Population on 2d6 as the book says, so Cacogen are the commonest
  residents and a town of Extradimensional Outsiders is a rarity. Before, every
  population was equally likely.
- Two book typos are corrected on settlements: Mycomorphs (was "Mycoorphs") and
  Racquet Game (was "Raquet Game").

### Changes
- A settlement now rolls its Location, Houses, Industry, the two halves of its
  Government, what it praises, despises and lacks, and its fashion, festival and
  entertainment each separately; they used to be rolled in sets on one shared roll.
  A town can now praise and despise the same thing - a very polarised town.
- A region's Settlement takes its Location from the Landscape of its section - a
  settlement among Mesas sits "Atop a Mesa" - and one time in four is instead one of
  the book's site features, such as an Ancient Bomb Crater, with the terrain named.

## 0.3.1

### New
- Referee's Guide: a new chapter 13, Making Your Own Items. It covers the Effects
  tab's builder - when an effect happens, what it does, its conditions, the Stats
  section, equipping and hands - and Mystic Gifts, with worked examples of new
  items and of changing a book item. No other chapter moves.

### Fixes
- Player's Guide chapter 5 explains the Effects tab and "In effect" lines, and
  no longer tells players to write a Gift's effects themselves: only the Referee
  can change the Effects tab.
- The guides now describe 0.3.0 correctly: a weapon's trade value and its "In
  effect" line (Referee 11), creatures marked defeated however they die (2, 12),
  who presses the round card's Apply buttons (2), exposure saves that infect by
  themselves and rounds counted in the creature's own turns (5), the Reaction
  button and faction standing (6), and which items can be equipped (Player 2).

## 0.3.0

### New
- The reaction roll can name the faction the NPC belongs to. The talking character's
  standing with that faction then counts, as the book says: Liked rolls with ADV,
  Disliked with DIS, and the other standings show their book text on the card.
- Every Bestiary creature, pet and steed with more than one way to attack now carries an
  "Attack Routine" reminder saying which attacks it makes in a round - "2 × Claw and Maul",
  "Bellyflop, or Tongue Grab" - as the book's stat block does.
- Every item sheet has an Effects tab. The Referee can add effects to any item
  - a weapon, armour, an Exotica, a Gift, a basic item, a mutation - from a
  builder that offers only effects the system carries out: when the effect
  happens (used, always on, on a hit, on a reaction roll...), what it does,
  and any conditions. Players see the list but cannot change it. The choices
  grow as more of the system moves to effects.
- An item with a use effect gets a wand button on the character sheet that
  uses it. Effects that are always on (AV, light, rations, ADV or DIS on
  reaction rolls, notes on the Forgettable Effects tab) work on any item, not
  only weapons.
- Wounds, Exhaustion and Autarch Figments now have an item sheet.
- Skeletal Frame now takes double damage from bludgeoning, Malleable Body half,
  Transparent Skin double from beam, and Insulated Skin half from flame and
  freezing. Before, these were reminders only.
- A mutation switched off by an affliction (Jellybones) no longer stops its
  bearer wearing armour, helmets or two-handed weapons.
- More mutations now act on their own: Albino gives DIS on every Save in daylight
  unless the character carries a Sunshade (the Referee is asked whether it is
  daylight, once per scene); Stilt Legs gives ADV when fleeing; Slimy Skin gives
  ADV on every Save to escape a hold; Antlers, Beak, Feathers, Fur, Ram Horns and
  Snout give ADV on reaction rolls with their kind of creature, and Pure of Blood
  with other true-kin (the Referee is asked once per creature).
- A new character now gets every special rule of their ancestry as an item on
  their sheet (Synthetic Flesh, Crystalline Flesh, No Quarter...), not only the
  ones with something to use. A character who rolls Albino starts with a
  Sunshade.
- The Effects tab can now give any item an immunity (Blindness, Entanglement,
  ambush), ADV or DIS on saves, ADV or DIS when fleeing, or ADV to escape a hold.
- Blind and Echolocation now give ADV on attacks made in the dark (the player is
  asked each attack). Toxic Flesh now deals d8 TOX to a creature that bites its
  bearer.
- Gas Glands can now be used once per day, counted on the sheet like Ink Ducts,
  with the same refresh button; a Long Rest refills it. A Gas Glands mutation
  from before this version shows 0 uses until it is refreshed once.
- Leaves and Photosynthesis now ask the Referee whether it is daylight (once per
  scene) before healing.
- Frog Tongue and Twice Born saves now take the character's save ADV and DIS
  (Extra Head, Small Stature, Albino), as other saves do.
- Silk Production now targets one enemy, as the book says, not every targeted
  creature.
- The Forgettable Effects tab now shows four ancestry reminders: Proteus (DIS
  against metamorphic effects), Synthetic Flesh (the Synthetic Wounds table),
  Photosynthesis (perishing after three sunless days) and Flammable (burning
  once hit by flames). A mutation switched off by an affliction (Jellybones) no
  longer shows its reminders there.
- More implants and Exotica now act on their own: Subdermal Insulation makes its
  bearer immune to flame, cold and electrical damage, and Dazzleskin Filaments to
  beam damage; a worn Moonbeast Carapace makes its wearer immune to poisons (no
  TOX save) and cannot be taken off; Etiquette HeadBank gives ADV on every
  reaction roll; Hushboots give ADV to hit a Blind creature; Tactical Flaw
  Analysis gives ADV to hit an armoured opponent or vehicle (the Referee is
  asked once per creature); an Ulfire Lantern or Candle lights its bearer's
  token while carried.
- Solar Scaling has a use button: an hour relaxing in the sun heals d6 HP (the
  Referee is asked whether it is daylight, once per scene).
- Alluring Fakeface, the Dream Artefact Assembler and the Quantum Tunnelling
  BlinkPack saves now take the character's save ADV and DIS (Extra Head, Small
  Stature, Albino), as other saves do.
- Using a Phase Cape now puts it on the wearer's board for d4 rounds. Using an
  Ultravisor makes the wearer's ranged attacks hit automatically until the
  combat ends. The Fate Inverter, the Active Camouflage Ring, the Ultravisor and
  the Berserker StimRig now need a combat that has started, not only one set
  up. An Exotica helm (Fascinator, Horror, Ultravisor) or the Mirror Shield must
  be worn to be used.
- The Forgettable Effects tab no longer shows reminders the sheet now applies
  itself (Subdermal Insulation, Dazzleskin's immunity, Etiquette HeadBank,
  Tactical Flaw Analysis, Solar Scaling, Omniguts, the Ultravisor's auto-hit);
  Hushboots reads "ADV when sneaking." A switched-off implant shows no
  reminders, and an Exotica armour that is not worn keeps its reminder with
  "(equip it to use this)".
- The Mind Shield's reminder on the Forgettable Effects tab no longer carries a
  note meant for developers; it reads "Protects from psychic intrusion. Exempt
  from Gleam Tests."
- Cloning Jelly now has a use control: using it posts its text and spends the jar;
  the Referee then makes the copy of whatever was smeared.
- Berserker Brew can now be drunk only once a combat has started, as the
  Berserker StimRig already required.
- A poison's "Instant Death" on a failed save (Lose d8 Max HP / Instant Death)
  now kills a creature; a character is told, as other deadly saves do.
- More wounds now act on their own: Teeth Knocked Out, Scrambled Nerves,
  Addling, Stomach, Crippling and Weakening Wounds give DIS on their save;
  Damaged Item rolls its d20 and names the item that is damaged; Supercoolant
  Leak makes the character Deprived and Synthskin Damaged doubles damage taken
  while the wound lasts; Personality Nexus Scrambled posts new INT, PSY and EGO
  scores for the Referee to apply; Cascading Kinesthetics takes 2 STR and 2 DEX
  each day until it is repaired.

- A newly made weapon keeps the base weapon's numbers in its Damage, Slots and
  Trade Value boxes, and shows what its tags make of them underneath ("In
  effect: 2d8"). The tags now work from the base, so editing the base works the
  way it reads. Weapons made before this version keep their numbers exactly as
  they are.

- A mutation, implant, Exotica or Autarch figment gained in play no longer
  rewrites the character's ability scores, Item Slots, hands or creature types.
  Its bonus counts while the item is held and disappears with it, and a
  suppressed mutation's bonus simply stops counting. Max HP still changes when
  the item arrives, as before. A new character's rolled mutations and starting
  implant work the same way, so removing one later takes its bonus with it.
  Items gained before this version keep the bonuses already written into the
  character.
- Known issue, characters made in the character creator before this version:
  their starting mutations and implant wrote their bonuses into the character
  and kept no record of them, so deleting one (Centaur, Extra Heart, a Backup
  Heart...) leaves its bonus behind - the ability score, Item Slots or hands do
  not go back down. This was already so in 0.2.0. If you remove one, lower the
  numbers by hand. Mutations and implants gained in play on 0.2.0 still take
  their bonus with them when deleted.

- The Effects tab's builder has a Stats section: the Referee can give any item a
  usage die (creature rules included), and set or change a weapon's damage dice
  and the hands it takes, any item's slots, trade value (to everyone or one
  buyer) and whether it is metal, and armour's own AV and where it is worn. The
  item sheet shows the result under the field ("In effect: ..."). The "+ Add
  usage die" link is gone - the Stats section replaces it - and every item sheet
  shows the usage die block when the item has one. NPC sheets get the usage die
  roll button too.
- Any carried item - an Exotica, a basic item, a light - can be equipped once the
  Referee gives it an effect that needs it: a number of hands it takes, or an
  effect that only works while it is equipped. It then gets the equip toggle on
  the character sheet, takes those hands (none unless the effect says so), and
  is refused when the hands are not free.

### Fixes
- A Mycomorph resurrection no longer makes temporary creature types permanent
  (a Gift's Psychic, an elixir's type): only the character's own types carry
  over.
- Deleting a mutation or implant that had been moved from another character no
  longer takes away bonuses this character never received.
- A weapon with two buyer tags (Bone and Ritual, say) shows each buyer's price
  under Trade Value, not only the first.
- The armour sheet no longer shows a Defense box. Nothing ever read it - an
  armour's protection is its AV Bonus - so editing it did nothing.
- An attack that hits automatically for any reason other than Heat-Seeking (the
  Ultravisor's activation, an auto-hit effect the Referee wrote) no longer says
  "Heat-Seeking never misses a warm-blooded target"; its card names the real reason.
- A finished effort (the Gitch's crystal debridement, attunement and the like) no
  longer posts "Effort complete" a second time on the next clock move, when a daily
  recurrence ticked in the same advance.
- An affliction's Effects tab names it ("from Brain Coral") instead of calling its
  key a tag; other items' book effects say "from Beak" too, and only a weapon's say
  "from the Luminous tag".
- Toxic Flesh's reminder on the Forgettable Effects tab now says d8 TOX, as the
  book does (it said d10).
- Damage from a failed save, a trap, retaliation (Acid Blood, Quills, Body Barbs),
  a Reflecting weapon, the Toxin Die, a coughing fit, an exploding Unstable weapon
  and similar sources now follows every damage rule a weapon hit does: double
  damage taken (Wrathworms, Poison 19), a Synthhound's Watchdog Protocol, a
  grafted limb sharing the blow, immunities and halving, and temporary HP. Before,
  these skipped some of those rules. Acid Blood now deals corrosive damage.
- Death Draught now takes a drinker holding temporary HP to 0 as well.
- Every heal now follows the same rules. A Bloomboon fruit, Leeching Spores'
  drain and an Unquiet Spirit's Long Rest used to heal regardless; now a
  Deprived character (or a Lithling) is refused, Deathblight halves the heal,
  and a character below 0 HP heals as though starting from 0. Nothing that
  changes damage (a Sandworm's minimum damage, a Swarm's halving) changes a
  heal.
- A creature killed in combat is now marked Defeated in the combat tracker,
  however it died, and a heal that brings it back above 0 HP clears the mark.
  Before, only a failed death save marked it.
- Every death that sets HP to 0 (a failed death save, the Watchdog Protocol, Look
  Out Sire, Desiccate, Death Draught, a Zenithlight burst) now counts as a kill
  everywhere a weapon kill does: it clears temporary HP, and slaying a
  level-draining creature this way restores the levels it took.
- When Bifurcating Brew wears off, the drinker gets back the maximum HP the split
  took and the same amount of current HP. Before, only the maximum came back.
- Berserk (the Berserker StimRig or Berserker Brew), an Exotica's AV until combat
  ends (the Active Camouflage Ring) and the Usurper Arm's borrowed hand now show
  on the Active Effects board, and end with the combat as before. The Referee can
  also end one early by removing its entry. A character who updates in the middle
  of a fight keeps their current state, and it still clears when that fight ends.
- A poison (Generate Poison, Poisoned Water) now posts a CON save card that the
  poisoned character rolls themselves, and everything the poison does lands with
  that roll. Extra Liver, Cyberliver, Heightened Immune System, Detritivore and a
  worn Hazard Wrap give ADV on it, and a Synthetic or Mineral character is immune
  to the whole poison.
- A Berserker's Wrathworms, a Gitchghast's Gitch and a Maladaptor's nanomachines
  now infect on a failed save, from the one card - a Maladaptor rolls a d6 for
  which infection. A failed save on the Referee's exposure card infects by itself
  too; the Infect button is still there.
- Extra Head (ADV on INT, PSY and EGO saves) and Small Stature (DIS on STR saves)
  now apply automatically to every save, from the sheet or a card, instead of a
  reminder to hold Ctrl or Shift.
- Save reminders such as Albino's now appear on saves rolled from chat cards too.
- The effect board no longer offers "Followers unfed", "Mercenaries unfed" or
  "Steed unfed" trackers: companion upkeep at each Long Rest already counts unfed
  days and handles desertion.
- Every change to maximum HP (a level, an item's bonus, an elixir, level drain, a
  poison or disease) now follows one rule: a gain raises current HP by the same
  amount (Growth Serum doubles it), and a loss only lowers current HP if it is
  above the new maximum.
- A Reflecting weapon's damage can be applied once, by the wielder's player or the
  Referee.
- On the round card, a per-round damage or ability loss is applied by the player
  whose character caused it, or by the Referee for a creature's.
- In combat, an effect that lasts N rounds now lasts exactly N of the affected
  creature's own turns: it ends at the end of that creature's Nth turn after
  it lands, announced when that turn ends. Before, it lasted the rest of the
  round plus N full rounds, which under initiative that reorders each round
  could cover one turn or two. A creature not in the combat tracker keeps the
  old count. Effects already running when you update finish the old way.
- The Combat Voxbox's chat card now asks for a Morale Save, as the book does,
  not a Morale check.
- Hiveyhump's infection vector now gives the book's two ways of catching it:
  a 1-in-10 chance each night of the swarming months for anyone sleeping
  without netting, and a secret CON Save for each PC after a battle with
  Hiveymen. New Hiveyhump afflictions carry the full text.
- A Mystic Gift that is suppressed can no longer be used; the use is refused
  before any HP is paid.
- Electrical damage now asks the Referee whether each target is submerged in
  water, and eroding damage whether it is a static structure, before the damage
  lands, and doubles it on a yes. Before, a chat note asked the Referee to do
  it by hand. Each user can turn these questions off in the settings; the
  answer then defaults to no, and the chat says so.
- Lithifying weapons now give their target +1 AV per hit, as a board entry the
  Referee can end.
- A target at 0 DEX or below after a Freezing or Lithifying hit is frozen solid
  or turned to stone (Paralysed) until its DEX recovers.
- An Unstable weapon now explodes on any natural 1, as the book says, not only
  when it would also break. An Indestructible Unstable weapon still explodes,
  but survives it.
- A Flaming weapon asks the Referee, before the attack roll, whether the wielder
  is underwater (the attack stops) and whether each target is submerged (that
  target is left out). Before, a chat note asked the Referee to remember.
- NPC sheets have a Reaction button for the Referee: it rolls the creature's
  reaction to the PC doing the talking (d20 + their EGO, if they can
  communicate) and shows the result to the Referee only. A Sacred or Blasphemous
  weapon carried by that PC gives ADV or DIS when the creature follows its
  religion - the Referee is asked once per creature.
- A Fungal weapon can be fed after a Short or Long Rest: a card offers to spend
  one food ration to step its ammo die up.
- A Parasitic weapon's ammo die is no longer rolled down after a fight (it does
  not need to reload), and its bearer eats and drinks double on a Long Rest.
- A Luminous weapon now sheds light from its bearer's token while equipped. Its
  colour can be set on the weapon sheet (the Light field).
- An NPC holding an Aegis-Bearing weapon now gets its +5 AV, as a character
  does.
- An Indestructible weapon can no longer be corroded by a creature's attack.
- The Forgettable Effects tab now shows a carried weapon's Stim-Boosting
  reminder with "(equip it to use this)" while it is not equipped, and lists
  Rocket Boosted's "can be used to gain altitude" for the Referee to adjudicate.
- A Heat-Seeking weapon asks the Referee whether each target is warm-blooded,
  once per creature, instead of always reading the Biological checkbox. With
  questions turned off it still uses the checkbox.

### Install and update
- Luminous weapons store their light colour in a new optional field. A weapon
  without one uses the default colour; nothing in an existing world is changed.
- Mystic Gift effects are now stored in a new format. Gifts already in your
  world keep working exactly as before and are not changed. The first time
  you edit a Gift's Effects tab, its effects are saved in the new format
  beside the old ones, and the old ones are no longer read.
- A Gift's Effects tab can now be edited by the Referee only; players see it
  read-only.
- An item given effects in the Effects tab stores them in a new optional
  field; nothing in an existing world is changed. The first time the Referee
  edits a tagged weapon's effects, its tags' effects are copied into that
  field, and changing the weapon's tags afterwards no longer changes its
  effects.
- The credits and LICENSE.txt now say that the few images drawn for the
  system (the region map's patterns and pins) were made with AI assistance.

## 0.2.0

### New
- Generate Region (Vaarn Macros, GM only): grows a region of
  desert locations joined by routes on a hex map, divided into named sections
  with their Landscapes, landmarks and encounter tables, and lets you edit
  types, names and hazards on a preview. Create region writes the region's
  journal: an overview, a page per section with its encounter table, and a
  page per location with its details rolled from the book's tables (a Vault's
  page generates the vault when you want it), then its Scene: the painted map
  on a hex grid of one day per hex, a GM pin per location, each route as a
  hidden drawing you reveal, and a Party token whose sight uncovers the map.
  Each route has its own page and pin; an eye beside any route link, or a
  button on its page, reveals it to players. A route with a lair rolls the
  lair from its page, and any page naming a Bestiary creature can spawn one.
  A hazardous route reveals looking like any other road; its page can show
  its hazard when the party knows of it.
  A location's page can make an NPC there - or a follower, companion, rival,
  monster or a character from the character creator - and lists them under
  People here.
  A section's page rolls its own encounter table (with its local factions and
  any famous monster in it), and "The party is in this section" makes the
  Exploration Clock's desert encounters roll that table. Each section's table is
  a real RollTable you can edit, and the section's page picks its die - a
  smaller die for easier encounters.
- Referee's Guide: a new chapter 8, Running a Region, on Generate Region from
  the preview to the Scene, encounters and the journal's buttons. Running a
  Vault is now chapter 9, and the chapters after it 10-12. A link you made to
  one of those pages in your world will need making again.
- Vaarn Region Map Legend, a new compendium every player can read: the key to
  a region map - its Landscapes, place icons, landmarks, vaults, routes and
  how the ground shows height.

### Fixes
- Generated monsters and Quantum Daemons now carry working special attacks and
  abilities (ability damage, Lifesteal, Swallow Whole, Cause Blindness, Torment
  Aura and more), and every Daemon starts Incorporeal on the Active Effects
  board until it is forced to manifest.
- The Xanthous Mycomorph's Spore Spray now counts as fungal as well as blast.
- A generated monster's Cause Mutation adds a random mutation on a failed CON
  save; a Quantum Daemon's immunities now work (fire, cold, electrical, beam,
  poison and fungal spores, physical, Gifts and hypergeometry); and both list
  their defenses on the sheet as reminder Items.
- More generated specials now work: Acid Spray eats d3 AV of armour, a Daemon's
  Mind Control holds its target until an EGO save each round throws it off,
  Summons Monsters calls a creature from the party's current encounter table
  (the vault level or region section the Exploration Clock records), Invert
  Gravity counts the rounds a target falls on the round card, and Misfortune
  Aura gives everyone else DIS on every save.
- The last generated specials now work: Parasite Implant and Parasite Seed fill
  a slot with a Wound that deals d6 a day (or a round) until removed; Cause
  Wound rolls 2d8 on a character's Wounds table; Destroy Item names the item in
  the slot it rolls for the Referee to rule on; and a Daemon's Inferior Clones
  places d4 copies of it at 1 HP.
- The last generated NPC gear now works: Medicinal Gourds heal d8 each when a
  character uses one, and Medgels now heal d10 the same way; a Watermonger's
  Water Wealth is 3d20 Water Rations; the Doomsinger's Vocal Amplifier is a d6
  weapon; a rival mystic's Ego-Death Ray deals d6 EGO damage and can be looted;
  and a Lizard Rancher's Tame War Lizard places a new Bestiary War Lizard
  beside them. Medgels already in your world do not heal.
- The encounter card for an effect that reaches everyone no longer says every
  creature "sings" it; only the Doomsinger does.
- Generate Monster and Generate Quantum Daemon now give a creature its attacks
  with a plain damage die - Melee (d6), Lightning (d8, electrical) - as weapons
  on its sheet.
- Generate NPC and Generate Rival Adventurer now put the person's gear on
  their sheet as Items - weapons ready to roll, armour carried as loot (their
  AV already counts it) - instead of only describing it. The Referee's Guide
  chapter 7 explains.
- Roll for Level, Roll for AV and Roll for Morale on a creature now show a
  question mark, not a die: the picture was easy to mistake for the roll
  button, which is the small die beside the quantity. The update rebuilds the
  Bestiary, so its creatures show the question mark; creatures already placed
  in your world keep the old picture.
- An effect put on a creature dragged from the Bestiary (Blind from a gambit,
  for example) now shows on the Active Effects board, is reminded on the
  round card, and ends on time. Before, effects on those creatures were
  invisible and never ended. With two of one creature on the map, each is
  named by its own token.

### Install and update
- Verified on Foundry 11.315, so Foundry no longer warns that the system is
  not verified for that build.
- The README explains the World Data Migration window Foundry shows when you
  open a world after an update: it is safe, and nothing in Vaarn needs
  migrating.
- The Vaarn Items compendium now updates itself when a world loads: new Items
  are added, changed ones are brought up to date, and ones the system no
  longer has are removed. Edits made inside that compendium are overwritten,
  so keep customised Items in your world's Items or in a compendium of your
  own. Items already on character sheets are not touched.
- Twelve unused item icons from Flaticon, inherited from the Knave system, are
  removed. Every icon the system ships is now from game-icons.net or drawn for
  the system, as `module/icons/credits.txt` lists.

## 0.1.2

### Fixes
- Links to compendium entries now survive updates. A link to a creature,
  table, item or guide page in your journals, and a world creature's link
  to the compendium entry it came from, kept breaking after each update,
  because the compendiums were rebuilt with new ids. Links made on 0.1.1 or
  earlier break one last time on this update.

## 0.1.1

### Fixes
- A mutation or implant with uses per day now starts with them full. A new
  Cacogen's Ink Ducts showed "(0 left)" until the first rest; it now shows
  one use per Level from character creation, and the same holds for items
  added any other way.
- The book's page placeholder "p.xx" no longer appears in descriptions,
  table results, creature notes or chat. Text already in a world, or in a
  compendium built by 0.1.0, keeps it until it leaves the compendium.

## 0.1.0 (first public release)

The first release of the Vaults of Vaarn system. It is a fork of the
unofficial Knave system for Foundry, v1.9.0. Everything below is new or
changed since that fork.

### Characters
- A character creation wizard, opened from **Create Character (Vaarn)** in
  the Actors sidebar. It rolls ancestry, abilities, gear, and any mutations
  or implants, then builds the Actor.
- Vaarn's six abilities, with PSY and EGO in place of Knave's WIS and CHA.
- Ancestries, each with its special rule on the sheet.
- Mutations, cybernetic implants, mystic gifts, hypergeometric codices,
  exotica, crucibles and elixirs as item types. Those with a mechanical
  effect apply it: natural weapons, armour bonuses, ability changes, gift
  costs and so on.
- Wounds, exhaustion, afflictions, Deprived, and permanent ability changes.
- Item slots with a hard cap, encumbrance, containers, usage dice and
  weapon breakage.
- Advancement, level loss, death at 0 max HP, and resurrection.
- Mystic gifts hold their effects (damage by type, healing, a condition)
  and apply them from the gift's chat card.
- Companions: hirelings, followers, pets and steeds, with upkeep and
  advancement.

### Combat
- Attacks against targeted tokens, with Vaarn weapon classes, weapon tags
  and damage types, armour, and damage applied to the target.
- Initiative, ambushes, morale, gambits, fleeing, and unarmed attacks.
- Saving throws with advantage and disadvantage, opposed saves, and saves
  called for by creature abilities.
- A round card that reminds the table of each per-round effect on the turn
  it resolves.
- The Toxin Die, poisons, drugs, timed conditions (Blind, Entangled and
  others), temporary HP and hidden HP.
- Creature abilities that act on a hit: level drain, item corrosion,
  armour loss, hit-count effects and more.

### The Referee's tools
- **Bestiary**, **Pets**, **Steeds** and **Vehicles** compendiums, built
  from the book's stat blocks on first launch.
- **Vaarn RollTables** and **Vaarn Items** compendiums.
- **Vaarn Macros**: generators for weapons, armour, gear, mutations,
  implants, gifts, exotica, drugs, poisons, flora, NPCs, rival adventurers,
  hirelings, monsters, settlements, trade goods, treasure caches, lair
  rooms and room contents, plus the elixir brewer and the character
  creator. The compendium is kept in step with the system on every load.
- Exploration turns, the start-of-day roll sequence, weather, travel and
  rations, rest and recovery, night watch and the Vigilance Die.
- Reaction rolls, faction reputation and a faction relationship graph.
- Trade values, and settlement prices that shift.
- Traps and vault hazards with buttons to resolve them.
- **Generate Vault**: a whole vault written to a linked journal, room by
  room, with a hex Scene per level (walls, doors, fog and GM-only pins),
  and encounters rolled from each level's own lairs.
- Players can drag tokens of the creatures and vehicles they own onto the
  map.
- Quantum daemon debt, Autarch figments, grafted limbs, spirit form, and
  other one-off rules from the book.

### Guides and music
- **Vaarn Player's Guide** and **Vaarn Referee's Guide** compendiums: how
  to do each thing at the table with this system.
- **Vaarn Ancestries**: a reference page for each of the ten ancestries.
- **Vaarn Music**: three tracks by Raudhetta (CC BY 4.0).

### Look
- A Vaarn look for the sheets: four colour palettes and a choice of
  heading font, set per user in **Configure Settings**. The original Knave
  look is still available.

## Before 0.1.0

The history of the Knave (unofficial) system this was forked from is at
<https://github.com/jrommann/knave>.
