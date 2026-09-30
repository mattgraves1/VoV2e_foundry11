/**
 * Vaarn Quantum Daemon Generator source data — Miscellany/Quantum
 * Daemons.md. Unlike monster-generator-data.js's Core Stats/Attacks, this
 * file's tables (Daemon Identity, Daemon Attacks & Abilities) were
 * spot-checked against the current vault and found NOT drifted — extracted
 * the normal programmatic way from npc-generator.html's DATA JSON.
 *
 * The Lesser/Greater stat block is dice where numbers go. JADE IBIS
 * 15-09-26 prints "Level d6 (4 - 24 HP) / AV d6 + 8 / Morale +d6" for the
 * Lesser and "Level 3d6 (12 - 72 HP) / AV 3d6 + 10 / Morale +2d6" for the
 * Greater. DAEMON_SIZES declares them as Rolled Creature Stats, the shape
 * bestiary-data.js's `rolled` uses: RULED 2026-09-21 (Matt), "give them the
 * treatment we gave bestiary entries that have randomized stats". The daemon
 * is built at the fixed part of each - Level 0, AV 8 or 10, Morale 0 - with a
 * Roll for Level, Roll for AV and Roll for Morale Item, and HP follows the
 * rolled Level at four a Level, which is exactly the book's printed ranges.
 *
 * TWO NUMBERS CHANGED WITH IT, both RULED the same day. The Lesser's Morale
 * is +d6 (JADE; CRIMSON HOUND and this file had +d8). The Greater's Level is
 * a flat 3d6, as both editions print it; this file and the generator had
 * rolled d6 + 3d6, copied from the vault's "+3d6" and the source tool's
 * `rollDie("d6") + rollDie("3d6")` - a transcription error the "(12 - 72 HP)"
 * range settles.
 *
 * HP: the book gives the range, not a figure, and that range is Level x 4 -
 * the general Level->HP rule Matt confirmed 2026-08-21 for building
 * creatures. Found and quoted verbatim in Bestiary/
 * Bestiary.md's Stat Block Reference: "Level (Lvl) is a measure of the
 * creature's power, used to determine its Hit Points (HP) and ability
 * bonuses. To calculate average HP, multiply the Level by 4 (or 5 if
 * you're feeling mean). Generate randomised HP by rolling xd8, where x
 * equals the creature's Level." Confirmed against Bestiary/Monster
 * Generators.md's own Core Stats table (monster-generator-data.js) and an
 * empirical sweep of ~160 real Bestiary creatures — the ×4 case fits
 * almost everywhere (Level 0 gets a special 1 HP floor, never 0; a
 * handful of named creatures deviate by design, consistent with the
 * text's own "or 5 if you're feeling mean" GM-discretion clause). This is
 * the general rule the Quantum Daemon generator now applies for HP, since
 * nothing in Quantum Daemons.md overrides it.
 *
 * DAEMON_IDENTITY: [{ name, appearance, hue }, ...20 entries], one shared
 *   d20 roll (all three columns come from the same row).
 * DAEMON_ATTACKS_ABILITIES: [{ attack, ability }, ...20 entries] — Greater
 *   daemons roll this table twice independently (see the source tool's
 *   `for (i=0; i<stats.rolls; i++)` — a fresh d20 each time, not the same
 *   row duplicated).
 */

export const DAEMON_SIZES = {
  Lesser: { rolls: 1, rolled: { level: { base: 0, dice: "1d6" }, av: { base: 8, dice: "1d6" }, morale: { base: 0, dice: "1d6" } } },
  Greater: { rolls: 2, rolled: { level: { base: 0, dice: "3d6" }, av: { base: 10, dice: "3d6" }, morale: { base: 0, dice: "2d6" } } }
};

export const DAEMON_IDENTITY = [{"name":"Juvenkates","appearance":"Almost Identical to Summoner","hue":"Colourless"},{"name":"Beheri-Hemushi","appearance":"Man with Peacock Tail for Head","hue":"Black"},{"name":"Dzoavitumnus","appearance":"Strobing Light; Shape Dimly Visible Beyond","hue":"Rainbow"},{"name":"Simhaspati","appearance":"Amorphous Gel","hue":"Iridescent"},{"name":"Eishthbou","appearance":"Reptilian","hue":"Flickers Between Shades"},{"name":"Oriapuriel","appearance":"Arachnid","hue":"Smoke Grey"},{"name":"Naamakhyasta","appearance":"Woman with Eyes on Her Hands","hue":"Blood Red"},{"name":"Iratan-Shediel","appearance":"Recursive Fractal Void","hue":"Matches Ambient Colours"},{"name":"Meenaeeswariax","appearance":"Huge Stone Head","hue":"Zebra-Striped"},{"name":"Qwertyuiop","appearance":"Crustacean","hue":"Octarine"},{"name":"Jhul Candigo","appearance":"Fish That Swims in the Air","hue":"Ulfire"},{"name":"Messimissem","appearance":"Scorpion-Tailed Infant","hue":"Jade"},{"name":"Yamuk","appearance":"Ambulatory Plant","hue":"Golden"},{"name":"Gareptun","appearance":"Fungal Mass","hue":"Silver"},{"name":"Behemhamsiel","appearance":"Shards of Dazzling Crystal","hue":"Mirrored"},{"name":"Urielbol","appearance":"Tiny Shrill Humanoid","hue":"Deep Orange"},{"name":"Chemonetza","appearance":"Like a Huge Soap Bubble","hue":"Neon Yellow"},{"name":"Phaeshmalthus","appearance":"Miniature Thunderstorm","hue":"Translucent"},{"name":"Ravaikund","appearance":"Biomechanoid Horror","hue":"Sickly Pink"},{"name":"Zarak Zil","appearance":"Classic Horned 'Devil', May Be Mocking You","hue":"Leopard Print"}];
export const DAEMON_ATTACKS_ABILITIES = [{"attack":"Horns (d6)","ability":"Immune to Fire"},{"attack":"Claws (d6)","ability":"Immune to Cold"},{"attack":"Teeth (d6)","ability":"Immune to Poison and Fungal Spores"},{"attack":"Acid Spray (d3 damage + d3 AV decay)","ability":"Immune to Electrical Weapons"},{"attack":"Lightning (d8, electrical)","ability":"Immune to Beam Weapons"},{"attack":"Enfeebling Touch (d6 STR damage)","ability":"Creates d4 Inferior Clones of Itself (1 HP each)"},{"attack":"Freeze Ray (d6 DEX damage)","ability":"Regains HP Equal to Level Per Round"},{"attack":"Sickening Blast (d6 CON damage)","ability":"Mind Control (EGO Save to resist)"},{"attack":"Memory Leech (d6 INT damage)","ability":"Summons Monsters (as random encounter)"},{"attack":"Psionic Scream (d6 PSY damage)","ability":"Blinding Spit (DEX Save vs d4 rounds Blindness)"},{"attack":"Ego-Death Ray (d6 EGO damage)","ability":"Immune to Physical Damage"},{"attack":"Flame Breath (2d8, fire)","ability":"Invert Gravity (DEX Save or fall towards sky)"},{"attack":"Laser Eyes (2d8, beam)","ability":"Torment Aura (d6 auto-damage per round)"},{"attack":"Poison Cloud (d10 TOX, area)","ability":"Misfortune Aura (All Saves made with DIS)"},{"attack":"Lifesteal (d10 damage, heal HP equal to damage)","ability":"Immune to Damage, Harmed by Healing"},{"attack":"Parasite Seed (Fills 1 slot, d6 damage per round)","ability":"Summons Evil Clones of PCs"},{"attack":"Swallow Whole (d12 ongoing, STR Save break free)","ability":"Sickly Aura (prevents healing)"},{"attack":"Cause Wound (roll 2d8 on Wounds table)","ability":"Immune to Mystic Gifts and Hypergeometry"},{"attack":"Entropic Touch (-d4 Max HP)","ability":"Creates a Perfect Clone of Itself"},{"attack":"Stolen Time (Lose 1 Lvl, kill Daemon to recover)","ability":"Immortal Unless True Name Spoken"}];
