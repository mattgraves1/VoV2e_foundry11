# Changelog

Each release adds its own section at the top, written by hand and grouped
by feature. Changes not yet released are listed under Unreleased.

## Unreleased

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
  button, which is the small die beside the quantity. Creatures already in your
  world keep the old picture.
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
