/**
 * The eleven vehicles — Vehicle Stat Block Import, 2026-09-18.
 *
 * Transcribed from the vault's Vehicles/ directory, which was re-transcribed
 * from the JADE IBIS text the same day. tools/vault-drift.mjs compares this
 * roster against those files.
 *
 * A vehicle is NOT a creature stat block: Hull stands where Level would, and
 * there is no Morale. So this is its own roster and its own builder
 * (vehicle-build.js), not a reuse of the Bestiary's.
 *
 * WHAT THE CREW FIELDS ARE. The book's crew line is kept word for word as
 * `crew`. Next to it sit the fields a sheet can act on, and these follow
 * Matt's role grouping of 2026-09-18 rather than a parse of that line:
 *   pilotSlots   how many people must drive it. 0 = it moves on its own.
 *   pilotLabel   the book's word for them — Driver, Pilot, Crew.
 *   gunnerSlots  a dedicated weapon operator, separate from the pilot.
 *   attacks      who fires the weapons:
 *                  "self"   it attacks on its own, at current Hull to hit
 *                  "pilot"  the pilot fires them
 *                  "gunner" the gunner fires them
 *                  "none"   it has no attack
 *   passengers   a number, ruled by Matt: Iron Mule 0 ("only ridden in
 *                extremis"), Vimana 12 (the retainers), Wind Barge 50.
 *   materialsValue  Vimana only (Matt, 2026-09-18). Shown instead of the
 *                book's Hull x 10 trade value, which would price the throne
 *                at 10; this is what a destroyed one is worth.
 *
 * The Wind Barge's "2d6 Level 2 guards" is deliberately absent. Matt ruled it
 * is for the Referee instantiating the barge in a campaign, not a property of
 * the vehicle.
 *
 * `kind` is the book's type line. Synthetic, Biological, Hypergeometric and
 * Mineral are also creature types and are set as such by the builder, so the
 * damage table treats an Auto-Chariot as Synthetic. Mechanical is not a
 * creature type and sets nothing.
 *
 * `ranged` decides the weapon Item's type. The Colossus's Sword and the
 * Motile Home's Huge Claw are melee; everything else is a mounted gun.
 */
export const VEHICLES = [
  {
    name: "Auto-Chariot", kind: "Synthetic", metal: true,
    hull: 8, av: 18, speed: "+6", itemSlots: 80,
    crew: "No pilot needed, 5 passengers",
    pilotSlots: 0, pilotLabel: "Pilot", gunnerSlots: 0, attacks: "self", passengers: 5,
    weapons: [{ name: "Gauss Cannon", dice: "1d12", ranged: true }],
    description: "Rugged wheeled conveyance with a synthetic mind. Auto-chariots are treasured, as they obey simple instructions and drive themselves without need of passengers. Due to their sapience, they are very difficult to steal, as they will not accept a new master until the old has died."
  },
  {
    name: "Colossus", kind: "Synthetic", metal: true,
    hull: 10, av: 20, speed: "+3", itemSlots: 100,
    crew: "One pilot",
    pilotSlots: 1, pilotLabel: "Pilot", gunnerSlots: 0, attacks: "self", passengers: 0,
    weapons: [
      { name: "Sword", dice: "1d12", ranged: false },
      { name: "Swarm Missiles", dice: "2d10", ranged: true, damageTypes: ["blast"] }
    ],
    description: "A mechanical effigy of a warrior-saint, bestriding the blue ruins with a tread that causes the horizon to quiver like a plucked string. The pilot is suspended within the belly of the beast, held foetus-like in cushioning gels. Functional colossi are rare, the few examples often maintained by secretive monastic orders, but they once fought for the Autarch in vast numbers. Their sand-devoured husks are now a common sight across Vaarn."
  },
  {
    name: "Dune Skuggy", kind: "Mechanical", metal: true,
    hull: 5, av: 13, speed: "+9", itemSlots: 30,
    crew: "1 driver, 1 gunner, 2 passengers",
    pilotSlots: 1, pilotLabel: "Driver", gunnerSlots: 1, attacks: "gunner", passengers: 2,
    weapons: [{ name: "Flak Cannon", dice: "1d10", ranged: true }],
    description: "Simple, crude desert vehicles running on guzzeline. Dune-skuggies are hacked together from whatever metal their maker could steal or scavenge, often just a seat protected by a roll-cage bolted to a roaring smoky engine driving four ravenous wheels. Skuggies are fast, rough, and loud, as are their owners."
  },
  {
    name: "Iron Mule", kind: "Synthetic", metal: true,
    hull: 1, av: 18, speed: "+0", itemSlots: 20,
    crew: "Pack animals, only ridden in extremis",
    pilotSlots: 0, pilotLabel: "Pilot", gunnerSlots: 0, attacks: "none", passengers: 0,
    weapons: [],
    description: "A breed of synth once in mass production, commonly found across Vaarn. Iron mules are boxy, crude automata with four powerful, restless legs. They are known for their extreme endurance and hardiness, but also for their clumsiness, stupidity, and the nauseating rocking motion of their gait."
  },
  {
    name: "Motile Home", kind: "Biological / Synthetic",
    hull: 20, av: 22, speed: "-1", itemSlots: 200,
    crew: "No pilot needed, can house 20",
    pilotSlots: 0, pilotLabel: "Pilot", gunnerSlots: 0, attacks: "self", passengers: 20,
    weapons: [{ name: "Huge Claw", dice: "2d10", ranged: false }],
    description: "The fad for living architecture peaked several millennia ago, but there are still some examples of self-aware, motile dwellings found in the hinterlands of Vaarn. These rare constructions are half-crab, half-house, and fully sentient. They are not known for vast interiors or fast movement but make up for this in extreme durability."
  },
  {
    name: "Skiff", kind: "Mechanical", metal: true,
    hull: 2, av: 16, speed: "+8", itemSlots: 10,
    crew: "1 pilot, 1 passenger",
    pilotSlots: 1, pilotLabel: "Pilot", gunnerSlots: 0, attacks: "pilot", passengers: 1,
    weapons: [{ name: "Mounted Rifle", dice: "1d8", ranged: true }],
    description: "A lightweight hover-bike built around a sky-seeking stone. Skiffs are powered by fans at the back of the craft. They are fast and nimble but unstable and often lethal when they malfunction. Used by outlaws, Hegemony rangers, bounty hunters, and anyone else in need of a quick getaway."
  },
  {
    name: "Ornithopter", kind: "Mechanical", metal: true,
    hull: 7, av: 18, speed: "+12", itemSlots: 70,
    crew: "1 pilot, 1 gunner, 7 passengers",
    pilotSlots: 1, pilotLabel: "Pilot", gunnerSlots: 1, attacks: "gunner", passengers: 7,
    weapons: [{ name: "Laser Lance", dice: "3d6", ranged: true, damageTypes: ["beam"] }],
    description: "Pre-Collapse flying machines that beat artificial wings to stay aloft. Smaller ornithopters are hummingbird-like and seat one pilot. Hegemony transport ornithopters resemble dragonflies and carry Legionaries wherever they are required."
  },
  {
    name: "Touring Orb", kind: "Synthetic",
    hull: 2, av: 16, speed: "+1", itemSlots: 20,
    crew: "No pilot needed, 4 passengers",
    pilotSlots: 0, pilotLabel: "Pilot", gunnerSlots: 0, attacks: "none", passengers: 4,
    weapons: [],
    description: "Trundling orbs of reinforced plastiglass, fitted with climate-controlled seats and beverage fabricators. Once used by pre-Collapse tourists to explore sites of natural beauty. Incapable of attack but make up for it by fabricating a ration of fizzy drink every day. Can talk and lectures on nearby flora and fauna (read the PCs the relevant bestiary entry)."
  },
  {
    name: "Stilt Strutter", kind: "Mechanical", metal: true,
    hull: 4, av: 18, speed: "+2", itemSlots: 40,
    crew: "1 pilot, 1 gunner, 4 passengers",
    pilotSlots: 1, pilotLabel: "Pilot", gunnerSlots: 1, attacks: "gunner", passengers: 4,
    weapons: [{ name: "Mounted Cannon", dice: "1d12", ranged: true }],
    description: "Ponderous, towering mechanised walker. Prized for their hardy construction and ability to navigate treacherous ground. Utilised by Hegemony troops for assaults on fortified positions."
  },
  {
    name: "Wind Barge", kind: "Mechanical",
    hull: 15, av: 18, speed: "+d6, roll each day", itemSlots: 2000,
    crew: "At least 4 crew to operate, up to 50 passengers",
    pilotSlots: 4, pilotLabel: "Crew", gunnerSlots: 0, attacks: "none", passengers: 50,
    weapons: [],
    description: "A wooden cargo ship, built around a large sky-seeking stone. These barges are used by the merchant guilds of Vaarn to transport goods across the blue sands. Some are elegant and ornate vessels, while others are heavy and utilitarian. They are unarmed by ancient custom, although it would be a foolish merchant who ventured into the wastelands without guards onboard."
  },
  {
    name: "Vimana", kind: "Hypergeometric / Mineral",
    hull: 1, av: 20, speed: "+10", itemSlots: 10,
    crew: "Sits 1, 12 retainers may cling to sides",
    pilotSlots: 1, pilotLabel: "Pilot", gunnerSlots: 0, attacks: "pilot", passengers: 12,
    materialsValue: 10,
    weapons: [{ name: "Annihilation Ray", dice: "2d10", ranged: true, damageTypes: ["beam"] }],
    description: "A hovering throne of manifold crystal, unstiching and re-stitching space-time around the sitter into a ravel most glorious to behold. Flies like a comet at the sitter's command and shields them from all harm. Once the chariots of the Autarchs, each was carved for a specific God-king. The few remaining on Urth are highly sought-after. Wars have been fought over the right to sit atop a vimana.\n\nDamage Immunity: A vimana and its pilot (while seated) are impervious to all damage. Only anti-paradox weapons can destroy the vimana, causing it to revert to an inert throne of crystal."
  }
];
