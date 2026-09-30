# Vaults of Vaarn for Foundry VTT

A game system for playing **Vaults of Vaarn** (second edition) in Foundry VTT.

- **Foundry VTT compatibility:** v11 (verified on 11.302)
- **Version:** 0.1.1
- **Translation support:** none

It started as a fork of the unofficial Knave system for Foundry, and still
uses Knave's sheet layout under the hood. Everything else has been rebuilt
around the Vaarn rules: ancestries, mutations, implants, mystic gifts,
toxins, the Vaarn combat round, travel, weather and the rest.

## Installing

**From inside Foundry (recommended - Foundry can then update it):**

1. In Foundry's setup screen, open **Game Systems** and click **Install System**.
2. Paste this manifest URL into the **Manifest URL** box and click **Install**:

   ```
   https://github.com/mattgraves1/VoV2e_foundry11/releases/latest/download/system.json
   ```

**Or from the zip:** close Foundry, or return to its setup screen, and unzip
the release zip (`vaarn-<version>.zip`) into Foundry's `Data/systems/` folder, so that you end up
with `Data/systems/vaarn/system.json`. To find the `Data` folder, open
Foundry's setup screen, go to **Configuration**, and look at **User Data
Path**. A system installed from the zip can still be updated from inside
Foundry later.

**Then:**

1. Create a new world and choose **Vaults of Vaarn** as its game system.
2. Launch the world and log in as a Gamemaster. On the first launch the
   system fills its compendiums (creatures, pets, steeds, vehicles, tables
   and items). A notice in the corner says what it built. Wait for it
   before opening the compendiums.

## Getting started

- **Make a character:** click **Create Character (Vaarn)** at the top of the
  Actors sidebar. The wizard rolls ancestry, abilities, gear and the rest,
  and builds the Actor for you.
- **Creatures:** drag creatures from the **Bestiary** compendium onto the
  map. Pets, steeds and vehicles have their own compendiums.
- **Tables and generators:** the **Vaarn RollTables** compendium holds the
  book's tables. The **Vaarn Macros** compendium holds the generators
  (weapons, mutations, NPCs, settlements, treasure, lair rooms and more).
  The macros are for the Referee; players do not see them.
- **Settings:** under **Configure Settings**, pick a colour palette and
  heading font for the sheets, and set up factions and gambits.

## No token art

This system ships **without creature token art**. Every creature, pet and
steed uses Foundry's default token image. Replace them with your own art if
you like; the system works the same either way.

## You need the book

This system does the bookkeeping. It is not a way to learn the game. You
need a copy of Vaults of Vaarn to play.

## Credits and licence

- **Vaults of Vaarn** is by Leo Hunt.
- **Knave** is by Ben Milton.
- The original **Knave (unofficial) Foundry system** is by Rabid Baboon
  (<https://github.com/jrommann/knave>). This system is a fork of its v1.9.0.
- **Music** (the Vaarn Music compendium) is by Raudhetta, under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- The Vaarn system is by Matt Graves. It is not affiliated with Leo Hunt,
  Ben Milton or the original authors.

### Licence

- **Vaults of Vaarn text** by Leo Hunt is published under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The creature
  stat blocks, tables and rules text in this system's compendiums are
  reproduced from it under that licence, attributed to Leo Hunt as the
  original author.
- **Vaults of Vaarn illustrations** are copyright Leo Hunt and are not
  included in this system.
- **Icons** in `module/icons/` are from [game-icons.net](https://game-icons.net)
  under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Each
  icon's author is listed in `module/icons/credits.txt`.

- **This system's code** is under the MIT licence. It is adapted from the
  Knave (unofficial) Foundry system by Rabid Baboon, which is under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The full terms are in [LICENSE.txt](LICENSE.txt).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
