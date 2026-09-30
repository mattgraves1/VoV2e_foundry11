/**
 * Vaarn Lair Rooms source data — Vaults/Lair Rooms.md. Spot-checked
 * against the current vault and found NOT drifted; extracted the normal
 * programmatic way. Used by macros/generate-lair-rooms.js — work-queue.txt
 * item 1 Phase 3's last piece.
 *
 * LAIR_DEPTHS: { "Depth N": [...20 values] } for N=1..10, one shared d20
 *   roll per depth. Cells are one of: "—" (empty node, no creature),
 *   "Roll on Depth N" (redirect — re-roll against that depth's own
 *   column), or a creature mention in book-prose shorthand ("D4 Babble
 *   Birds", "2d6 Cacklemaw + Virago", "D10 Grimpets + D3 Grimweavers" —
 *   "+" separates multiple distinct creatures sharing one node).
 *
 * LAIR_CREATURE_ALIASES: {mentionName: [...Bestiary name candidates]} for
 *   names that are irregular, fused, renamed, or plain typoed between this
 *   table and the Bestiary entry — ported verbatim from
 *   npc-generator.html, which the original tool author built by checking
 *   every mention against the same 155-creature Bestiary dataset this
 *   system's own compendium was imported from (work-queue.txt item 2).
 *   "Blightstone Knight" and "Glider Spiders" are a genuine book-content
 *   gap (per that same note) — no Bestiary entry exists under any spelling
 *   checked, same category as "Feral Pets" elsewhere in this project.
 */

export const LAIR_DEPTHS = {"Depth 1":["D4 Babble Birds","3d6 Blue Baboons","D6 Cacklemaw","D8 Cacogen","Daggertrunk","2d6 Eyeless Dogs","D10 Faa Nomads","D12 Feastbeasts","D8 Gene Thieves","D8 Greenguard","D8 Grey Crickets","D6 Lizard Lions","D8 Luxfoe Beetles","3d6 Phthalo-Jackals","D8 Synth Skeletons","D8 Nerve Crawlers","D6 Voltworms","D8 Witchgrubs","2d6 Yurlings","Roll on Depth 2"],"Depth 2":["Roll on Depth 1","D10 Bandits","3d6 Blue Baboons","D6 Cacklemaw","D6 Copy Cats","D4 Doomsingers","2d6 Eyeless Dogs","D6 Flabmongers","D8 Greenguard","D8 Stumbling Drones","D8 Grey Crickets","D8 Quill Spiders","D6 Lizard Lions","D6 Tiger Flies","3d6 Phthalo-Jackals","D6 Spambots","D8 Nerve Crawlers","D6 Planeyfolk","D10 Zoanthropes","Roll on Depth 3"],"Depth 3":["Roll on Depth 2","D8 Anthropophagi","D6 Battle Boars","2d6 Cacklemaw","D3 Desiccators","D4 Doomsingers","D6 Flabmongers","D8 Ghouls","D4 Giant Azure Scorpions","D8 Stumbling Drones","D10 Grimpets","Harlequin Serpent","D6 Hiveymen","D6 Lizard Lions","D6 Memory Eaters","D6 Plated Beetles","D4 Sawbone Drones","D8 Shriekmen","D4 Seekers of Eyeless Wisdom","Roll on Depth 4"],"Depth 4":["Roll on Depth 3","D6 Battle Boars","Bacterial Gestalt Colony","D4 Behemoth Toads","2d6 Cacklemaw + Virago","D3 Desiccators","Fool's Pool","D4 Giant Azure Scorpions","D8 Ghouls","D6 Glitchghast","D6 Glass Tigers","D10 Grimpets + D3 Grimweavers","D6 Hiveymen","D4 Hollow Maidens","Jollyhoss","D6 Lambent Lynx","Metamorphic Sludge","D4 Pseudo-Giants","Subtle Stalker","Roll on Depth 5"],"Depth 5":["Roll on Depth 4","D6 Drill Drones","D3 Face Dancers","Doppelgeller","Fleshwarp","D6 Glass Tigers","Jollyhoss","D6 Lazarus Guard","D4 Leopard Worms","D4 Maladaptors","Metamorphic Sludge","D4 Moonbeasts","D4 Phase Panthers","D4 Pseudo-Giants","D4 Sawbone Drones","Rustacean","Turretwright","Viridian Ooze","D4 Walking Wombs","Roll on Depth 6"],"Depth 6":["Roll on Depth 5","Alzabo","Banisher","D3 Chimera","Chromavore","Doppelgeller","Entropy Wight","Fractalisk","D6 Lazarus Guards","D4 Leopard Worms","D4 Maladaptors","D4 Moonbeasts","D4 Phase Panthers","D6 Regenerators","Rustacean","D4 Scytheslivers","Star Vampire","Viridian Ooze","Xanthous Mycomorph","Roll on Depth 7"],"Depth 7":["Roll on Depth 6","Amaranthine Death-Worm","Argent Shepherd","Banisher","D3 Chimera","Chromavore","D4 Echopraxists","Entropy Wight","D4 Faminebearers","Fractalisk","Kronophage","D6 Lazarus Guard","D6 Maladaptors","D6 Moonbeasts","D6 Regenerators","D4 Rustaceans","Psyche Leech","Star Vampire","D4 Xanthous Mycomorphs","Roll on Depth 8"],"Depth 8":["Roll on Depth 7","Alzabo","Amaranthine Death-Worm","Argent Shepherd","Banisher","Broodmother","Blightbeast","D6 Chimera","Chromavore","D4 Echopraxists","Entropy Wight","D4 Faminebearers","Fissile Glittersludge","Fractalisk","Gorgon","Juggernaut","Kronophage","Psyche Leech","D4 Xanthous Mycomorphs","Roll on Depth 9"],"Depth 9":["Roll on Depth 8","d4 Alzabos","d4 Amaranthine Death-Worms","Argent Shepherd","Banisher","Broodmother","Blightbeast","d4 Chromavores","d4 Entropy Wights","Fissile Glittersludge","Fractalisk","Gorgon","Gravity Tyrant","Kalopede","Kronophage","Occulith","Quicksilver Exterminator","Thermasaur","Unfolder","Roll on Depth 10"],"Depth 10":["Roll on Depth 9","d4 Alzabos","d4 Amaranthine Death-Worms","Banisher","D3 Blightbeasts","d4 Broodmothers","Chernobog","d4 Chromavores","Exemplar","Fissile Glittersludge","d4 Fractalisks","Gorgon","Gravity Tyrant","Kalopede","Kronophage","Occulith","Quicksilver Exterminator","Thermasaur","d4 Unfolders","Void Dragon"]};

export const LAIR_CREATURE_ALIASES = {
  "Virago": ["Cacklemaw Virago"],
  "Broodmother": ["Brood Mother"],
  "Broodmothers": ["Brood Mother"],
  "Seekers of Eyeless Wisdom": ["Seeker of Eyeless Wisdom"],
  "Moonbeasts": ["Moonbeast (Imago)", "Moonbeast (Nymph)"],
  "Anthropophagi": ["Anthrophage"],
  // The Rogue Robots encounter table's spelling (Encounter Composition from
  // ENC, 2026-09-27: the Creedspeaker's Enthralled Synths draw on it).
  "Anthrophagi": ["Anthrophage"],
  "Glitchghast": ["Gitchghast"]
};
