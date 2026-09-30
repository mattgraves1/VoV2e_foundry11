# Changelog

Each release adds its own section at the top, written by hand and grouped
by feature.

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
