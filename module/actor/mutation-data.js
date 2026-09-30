/**
 * Vaarn Mutations table (Character Creation/Mutations.md), d100.
 * Cacogen rolls three of these at character creation (Corrupted Blood);
 * Proteus lets them re-roll at level-up instead of a normal advance —
 * see work-queue.txt item 1 for the level-up hookup, not yet built.
 *
 * `abilityMod`/`hpBonus`/`slotBonus`/`avBonus` are the (a)-bucket-plus-AV
 * fields chargen-app.js auto-applies directly (a flat ability score change,
 * max-HP bump, item-slot-cap bump, or AV bump with a direct existing field
 * to write into). Roll 33 (Extra Eyes) is the one entry whose bonus is
 * itself randomized (d3 extra eyes, +1 PSY each) and is rolled inline in
 * chargen-app.js rather than stored here as a fixed number. `avReplacesArmour`
 * (Quills only, roll 73) flags that this entry's natural AV bonus replaces
 * WORN armour rather than stacking with it, per its own "You cannot wear
 * other armour" text — see chargen-app.js's `_effectiveArmourAV` for how
 * that's resolved against the rolled starting armour.
 *
 * `naturalWeapon` is the other (b)-bucket slice built so far: 15
 * entries whose effect is "your unarmed/bite/claw attack deals dX damage"
 * or "make an extra dX attack" get a real weaponMelee/weaponRanged Item
 * auto-created at mutation-grant time (0 slots - it's a body part, not
 * carried gear), reusing the existing weapon-roll pipeline instead of new
 * combat code. Conditional wording ("when you charge", "instead of your
 * normal attack") and damage-type flavor (TOX/electrical) aren't enforced
 * mechanically - they're carried into the item's description for the
 * player/GM to adjudicate, same as everything else still in (b)/(c).
 *
 * Everything else in `effect` (for entries with none of the above fields)
 * is narrative/GM-adjudicated for now - see the work-queue item's full
 * (a)/(b)/(c) classification for what each entry still needs.
 *
 * Work-queue item 11 (Held/equipped item state, 2026-08-25) added four more
 * fields, found via a full audit of every hand/hold/wear-related clause in
 * this table: `handsBonus` (Extra Arms' literal "extra pair of arms" —
 * chargen-baked into the actor's hands.max, same shape as slotBonus/
 * inventorySlots.max), `blocksTwoHanded` (Claws, Crab — checked at
 * equip-time against a weapon's `hands` field), `blocksHelmet` (the 7
 * Crest/Crown/Headless/Huge Brain entries whose text ends "cannot wear
 * helmets") and `blocksBodyArmour` (Quills — the equip-block half of "you
 * cannot wear other armour," alongside its existing `avBonus`/
 * `avReplacesArmour`, which only ever modeled the AV-math half). All four
 * are read live off the actor's mutation Items by name
 * (`MUTATION_TABLE.find`) at equip-time in actor-sheet.js's
 * `_onItemEquip` — none of them need chargen-time baking except
 * `handsBonus`, which mirrors `slotBonus`'s existing whitelist-copy in
 * `_rollMutations`.
 *
 * `replacesUnarmed` (2026-09-07) marks the three entries that redefine the
 * unarmed strike rather than adding a separate attack: Claws, Crab (d8),
 * Claws, Retractable (d6) and Poison Spur (d6 TOX) all read "your unarmed
 * attack deals dX". It is what the Unarmed Attack and Mutation Contradiction
 * Precedence mechanisms key on - a character with one of these gets that
 * mutation's natural weapon INSTEAD OF the base d4 Unarmed Strike, and if two
 * are rolled together only the later one survives.
 *
 * Tentacles, Hair is deliberately NOT flagged. It reads "instead of your
 * normal attack", which is an alternative to attacking rather than a
 * redefinition of the unarmed strike, so it neither suppresses the base d4
 * nor contradicts the three above (Matt's ruling 2026-09-07).
 *
 * A duplicate roll is a re-roll (Matt's ruling — no character gets the same
 * mutation twice, matching how he'd adjudicate it at the table). Enforced
 * in chargen-app.js's _rollMutations, which stores each granted mutation's
 * roll number on its Item (system.roll) so a future Proteus level-up
 * reroll can exclude the character's existing mutations too, not just the
 * ones in its own batch.
 */

export const MUTATION_TABLE = [
  { roll: 1, name: "Acid Blood", effect: "Your blood is caustic. Creatures in melee suffer d4 damage when they damage you." },
  { roll: 2, name: "Adhesive Touch", effect: "Your hands and feet are gecko-like. You can climb any surface and crawl across ceilings." },
  { roll: 3, name: "Albino", effect: "Your skin has no pigmentation. You must carry a sunshade (1 slot) or suffer DIS on all Saves during daylight hours." },
  { roll: 4, name: "Antlers", damageAddOn: { appliesTo: "melee", requires: "charge" }, effect: "You have antlers like an elk or moose. Add +d10 damage to your melee attack when you charge into battle. ADV on reaction rolls with antlered creatures.", naturalWeapon: { name: "Antlers", type: "melee", damage: "d10", note: "Only applies when charging into battle - declare the charge on your sheet before rolling damage." } },
  { roll: 5, name: "Analgesia", effect: "You do not feel pain. You do not know your maximum/current HP; the Referee tracks both." },
  { roll: 6, name: "Armoured Skin", effect: "Your body is protected by natural armour. Add +2 to your base AV.", avBonus: 2 },
  { roll: 7, name: "Backwards Head", effect: "Your head can swivel backwards, like an owl. You cannot be ambushed.", ambush: "immune" },
  { roll: 8, name: "Backwards Legs", effect: "Your legs are backwards. DIS when fleeing and sneaking." },
  { roll: 9, name: "Beak", effect: "Make an extra d6 melee attack. ADV on reaction rolls with bird-like creatures.", naturalWeapon: { name: "Beak", type: "melee", damage: "d6" } },
  { roll: 10, name: "Bioelectricity", damageAddOn: { appliesTo: "unarmed", damageTypes: ["electrical"] }, effect: "Your unarmed melee attack causes +d6 electrical damage. You can power small machines if hooked up to them.", naturalWeapon: { name: "Electrified Strike", type: "melee", damage: "d6", note: "Electrical damage." } },
  { roll: 11, name: "Bioluminescence", effect: "Your flesh produces a faint glow. You always have a light source. DIS to hide at night.", light: { tier: "faint" } },
  { roll: 12, name: "Blind", effect: "You cannot see and must navigate by sound and scent. DIS on ranged attacks. ADV when fighting in the dark. Removes all effects of other visual mutations." },
  { roll: 13, name: "Body Barbs", effect: "Your flesh is studded with sharp barbs. Opponents who miss melee attacks against you suffer damage equal to your Level." },
  { roll: 14, name: "Bulbous Eyes", effect: "Your eyes are enormous. DIS on Saves to avoid Blindness." },
  { roll: 15, name: "Centaur", effect: "You have the lower body and legs of a horse. +2 CON, +4 max items slots (24 total).", abilityMod: { constitution: 2 }, slotBonus: 4 },
  { roll: 16, name: "Chameleon Skin", effect: "Your skin always matches its surroundings. ADV to conceal yourself." },
  { roll: 17, name: "Claws, Crab", replacesUnarmed: true, effect: "One hand is a huge crab claw. Your unarmed attack deals d8 damage. You cannot use two-handed weapons.", naturalWeapon: { name: "Crab Claw", type: "melee", damage: "d8", note: "Cannot use two-handed weapons — enforced at equip time (work-queue item 11)." }, blocksTwoHanded: true },
  { roll: 18, name: "Claws, Retractable", replacesUnarmed: true, effect: "You have retractable feline claws. Your unarmed attack deals d6 damage.", naturalWeapon: { name: "Retractable Claws", type: "melee", damage: "d6" } },
  { roll: 19, name: "Clubfoot", effect: "One foot is larger and heavier than the other. DIS when fleeing and sneaking." },
  { roll: 20, name: "Compound Eyes", effect: "Your eyes are like those of a fly. +1 DEX.", abilityMod: { dexterity: 1 } },
  { roll: 21, name: "Crest, Bone", effect: "You have a large bony crest on your head. +1 AV. Cannot wear helmets.", avBonus: 1, blocksHelmet: true },
  { roll: 22, name: "Crest, Feathers", effect: "You have a crest of feathers on your head. +1 EGO. Cannot wear helmets.", abilityMod: { ego: 1 }, blocksHelmet: true },
  { roll: 23, name: "Crown, Horns", effect: "You have a crown of horns on your head. +1 AV. Cannot wear helmets.", avBonus: 1, blocksHelmet: true },
  { roll: 24, name: "Crown, Coral", effect: "You have a crown of coral on your head. +1 AV. Cannot wear helmets.", avBonus: 1, blocksHelmet: true },
  { roll: 25, name: "Crown, Eyestalks", effect: "You have a crown of eyestalks on your head. +1 PSY. Cannot wear helmets.", abilityMod: { psyche: 1 }, blocksHelmet: true },
  { roll: 26, name: "Cyclops", effect: "You have a single huge eye. You have poor depth perception. DIS on Saves vs Blindness." },
  { roll: 27, name: "Detachable Head", effect: "Your head can detach and move on its own. Take 1 point of INT damage for every exploration turn you spend detatched from your body. At 0 INT you are braindead." },
  { roll: 28, name: "Detachable Limb", effect: "A single limb can detach from your body and move on its own. If separated from your body, it cannot `see' and must proceed by touch alone." },
  { roll: 29, name: "Double Muscled", effect: "Your limbs have an extra pair of muscles. +2 STR, ADV when fleeing or pursuing.", abilityMod: { strength: 2 } },
  { roll: 30, name: "Echolocation", effect: "You can `see' in pitch darkness using echoes. You cannot be blinded and have ADV when fighting in the dark." },
  { roll: 31, name: "Exposed Organs", effect: "You suffer double damage from slashing or piercing attacks." },
  { roll: 32, name: "Extra Arms", effect: "You have an extra pair of arms. You can make an extra melee/ranged attack each turn, if equipped with a second weapon.", handsBonus: 2 },
  { roll: 33, name: "Extra Eyes", effect: "You have d3 extra eyes on your forehead. +1 PSY for each." },
  { roll: 34, name: "Extra Head", effect: "You have an extra head. ADV on INT, PSY, and EGO Saves. You can survive one decapitation." },
  { roll: 35, name: "Extra Heart", effect: "You have a second heart in your chest. +2 CON, +5 max HP.", abilityMod: { constitution: 2 }, hpBonus: 5 },
  { roll: 36, name: "Extra Legs", effect: "You have an extra pair of legs. +2 CON, ADV on Saves relating to pursuits.", abilityMod: { constitution: 2 } },
  { roll: 37, name: "Extra Liver", effect: "ADV on Saves vs poisons and TOX attacks." },
  { roll: 38, name: "Eyestalks", effect: "Your eyes extend out of their sockets on stalks. You can peer around corners or through narrow gaps without being seen." },
  { roll: 39, name: "Fangs, Venomous", effect: "You have a poisonous bite (d6 TOX).", naturalWeapon: { name: "Venomous Bite", type: "melee", damage: "d6", tags: ["TOX"], note: "TOX damage." } },
  { roll: 40, name: "Feathers", effect: "You have feathers instead of hair. ADV to reaction rolls for feathered creatures." },
  { roll: 41, name: "Frog Tongue", effect: "Your tongue is extremely long and sticky. DEX Save to snatch weapons from foes' hands." },
  { roll: 42, name: "Fur", effect: "You are covered in fur. ADV to reaction rolls for furry creatures." },
  { roll: 43, name: "Gas Glands (Blinding)", effect: "Once per day, you can release a cloud of blinding gas, which affects all biological targets in the room. Creatures in the cloud must CON Save or be blinded for d6 rounds.", applies: { condition: "blind", amount: "1d6", unit: "round" }, save: { ability: "con", mode: "resist", vs: "being blinded for d6 rounds", targets: ["biological"] } , declaredSpan: null },
  { roll: 44, name: "Gas Glands (Sleeping)", effect: "Once per day, you can release a cloud of soporific gas, which affects all biological targets in the room. Creatures in the cloud must EGO Save or fall asleep for d6 rounds." , declaredSpan: null,
    // Activated Mutation Use wiring, RULED 2026-09-26 (Matt): Gas Glands (Blinding)'s shape.
    // A save card per targeted biological creature; a failure puts Asleep on its
    // board for d6 rounds (a named row - there is no Asleep combat condition).
    save: { ability: "ego", mode: "resist", vs: "falling asleep for d6 rounds", targets: ["biological"] },
    applies: { effect: "Asleep", text: "Asleep.", amount: "1d6", unit: "round", viaSave: true } },
  { roll: 45, name: "Gills", effect: "You have gills and can breathe underwater. You must drink double rations of water each day or become Deprived.", rationDraw: { water: 2 } },
  { roll: 46, name: "Gliding Membranes", effect: "You have membranes between your arms and torso and can glide for short distances." },
  { roll: 47, name: "Goat Legs", effect: "You have the legs and hooves of a goat. You can walk up sheer surfaces." },
  { roll: 48, name: "Headless", effect: "You have no head. Your face is on your torso. You cannot wear helmets or hats.", blocksHelmet: true },
  { roll: 49, name: "Heightened Hearing", effect: "You have extremely sharp hearing. You suffer no ill-effects from Blindness or darkness and cannot be ambushed.", ambush: "immune" },
  { roll: 50, name: "Heightened Immune System", effect: "Your immune system is the envy of all. ADV on Saves vs diseases and poisons." },
  { roll: 51, name: "Hooks, Climbing", effect: "You have hook-like protrusions on your limbs. ADV to climbing and acrobatics." },
  { roll: 52, name: "Hopper", effect: "You have a single, powerful leg. You can leap huge distances." },
  { roll: 53, name: "Horns, Ram", effect: "You have ram-like horns. You can make an extra d6 melee attack. ADV on reaction rolls for other horned creatures.", naturalWeapon: { name: "Ram Horns", type: "melee", damage: "d6" } },
  { roll: 54, name: "Horns, Rhino", damageAddOn: { appliesTo: "melee", requires: "charge" }, effect: "You have a single rhino-like horn. When you charge into melee, add +d10 to your damage roll.", naturalWeapon: { name: "Rhino Horn", type: "melee", damage: "d10", note: "Only applies when charging into melee range - declare the charge on your sheet before rolling damage." } },
  { roll: 55, name: "Huge Beard", effect: "You have a gigantic, fast-growing beard incapable of being shaved or tamed." },
  { roll: 56, name: "Huge Brain", effect: "Your head is enormous. +2 to INT. You cannot wear helmets or hats.", abilityMod: { intellect: 2 }, blocksHelmet: true },
  { roll: 57, name: "Humpback", effect: "You have a camel-like hump, which stores water. You can go seven days without drinking water." , declaredSpan: null },
  { roll: 58, name: "Infravision", effect: "You can detect heat signatures and see warm-blooded creatures in total darkness." },
  { roll: 59, name: "Ink Ducts", effect: "You can spray ink like a squid, causing an opponent to DEX Save vs one round of blindness (p.xx).You can do this a number of times per day equal to your Level.", applies: { condition: "blind", amount: 1, unit: "round" }, save: { ability: "dex", mode: "resist", vs: "one round of blindness" } , declaredSpan: null },
  { roll: 60, name: "Insulated Skin", effect: "Your skin is resistant to heat and cold. Take half damage from extreme temperatures." },
  { roll: 61, name: "Kangaroo Pouch", effect: "You have a torso-pouch, like a kangaroo. +2 max item slots (22 max).", slotBonus: 2 },
  { roll: 62, name: "Larynx Darts", effect: "You can cough bony barbs from a discreet orifice in your neck. Treat as a concealed d4 ranged weapon that cannot run out of ammunition.", naturalWeapon: { name: "Larynx Darts", type: "ranged", damage: "d4", note: "Concealed; never runs out of ammunition (no Usage Die tracked)." } },
  { roll: 63, name: "Leaves", effect: "You have leaves instead of hair. Regain d4 HP per hour when resting in sunlight." },
  { roll: 64, name: "Malleable Body", effect: "Your body is rubbery and malleable. You can fit into tight gaps. Take half damage from bludgeoning attacks." },
  { roll: 65, name: "Malleable Face", effect: "Your face is malleable. You can imitate the faces of others, given time." },
  { roll: 66, name: "Mane, Hair", effect: "You have a lion-like mane of hair around your neck. +1 EGO.", abilityMod: { ego: 1 } },
  { roll: 67, name: "Obligate Carnivore", effect: "You must eat raw meat. You cannot heal using other types of food.", dietRation: { item: "Raw Meat", onMiss: "noHeal" } },
  { roll: 68, name: "Obligate Lithovore", effect: "You must swallow a stone each day. You cannot heal using other types of food.", dietRation: { item: "Stone", onMiss: "noHeal" } },
  { roll: 69, name: "Patterned Skin", effect: "Your skin is striped or spotted. +1 EGO.", abilityMod: { ego: 1 } },
  { roll: 70, name: "Pleasant Fragrance", effect: "Your scent is pleasing to all. +1 EGO.", abilityMod: { ego: 1 } },
  { roll: 71, name: "Poison Spur", replacesUnarmed: true, effect: "You have a poison spur on your wrist. Your unarmed attacks deal d6 TOX damage.", naturalWeapon: { name: "Poison Spur", type: "melee", damage: "d6", tags: ["TOX"], note: "TOX damage." } },
  { roll: 72, name: "Powerful Jaws", damageAddOn: { appliesTo: "melee" }, effect: "You can bite through metal. Add +d6 to melee attack damage.", naturalWeapon: { name: "Powerful Jaws", type: "melee", damage: "d6" } },
  { roll: 73, name: "Prehensile Feet", effect: "Your feet can grip and carry objects. +1 DEX.", abilityMod: { dexterity: 1 } },
  { roll: 74, name: "Prehensile Hair", effect: "Your hair can grip and carry objects. +1 DEX.", abilityMod: { dexterity: 1 } },
  { roll: 75, name: "Quills", effect: "You have quills coating your body. Add +2 to your AV. You cannot wear armour. Opponents who miss melee attacks against you suffer damage equal to your Level.", avBonus: 2, avReplacesArmour: true, blocksBodyArmour: true },
  { roll: 76, name: "Scaly Skin", effect: "Your skin is thick and scaly. Add +1 to your AV.", avBonus: 1 },
  { roll: 77, name: "Silk Production", effect: "You can produce strands of sticky web. Make an opposed DEX Save to wrap an enemy in web, entangling them (p.xx) until they succeed at a DEX Save.",
    // Apply Effect to Target wiring, RULED 2026-09-26 (Matt): the target rolls
    // DEX against 10 + the bearer's DEX; a failure entangles them, and a plain
    // DEX save vs 15 on their turn breaks free.
    save: { ability: "dex", mode: "resist", vs: "being wrapped in web", opposed: true },
    applies: { condition: "entangled", escape: { ability: "dex", by: "break free of the web" } } },
  { roll: 78, name: "Skeletal Frame", effect: "Your body is incredibly light. -2 STR and -2 CON. You take double damage from bludgeoning and crushing attacks.", abilityMod: { strength: -2, constitution: -2 } },
  { roll: 79, name: "Slimy Skin", effect: "You are coated in slime. ADV to escape grab attacks and enclosing traps." },
  { roll: 80, name: "Slug Body", effect: "You have a single slimy tail-foot and leave a trail of mucus. -2 DEX, can stick to sheer surfaces.", abilityMod: { dexterity: -2 } },
  { roll: 81, name: "Small Stature", effect: "Your body is child-sized and will never grow larger. DIS on STR Saves." },
  { roll: 82, name: "Snout", effect: "You have a snout-like, animalistic face. ADV to reaction rolls for newbeasts." },
  { roll: 83, name: "Stilt Legs", effect: "You have long stilt-like legs. You are the default target for ranged attacks. ADV in chases and pursuits, can wade quickly through flooded areas." },
  { roll: 84, name: "Tail, Club", effect: "You have a heavy, club-like tail. Make an extra crushing melee attack per round (d8).", naturalWeapon: { name: "Tail Club", type: "melee", damage: "d8", tags: ["Bludgeoning"], note: "Crushing damage." } },
  { roll: 85, name: "Tail, Prehensile", effect: "You have a long, thin tail that can grip and carry objects. +2 DEX.", abilityMod: { dexterity: 2 } },
  { roll: 86, name: "Tail, Scorpion", effect: "You have a stinging tail, like a scorpion. Make one extra melee attack per round (d6 TOX).", naturalWeapon: { name: "Scorpion Tail", type: "melee", damage: "d6", tags: ["TOX"], note: "TOX damage." } },
  { roll: 87, name: "Tail, Spike Launching", effect: "You have a tail that launches keratin spikes using muscle spasms. Make an extra ranged attack per round (d6).", naturalWeapon: { name: "Tail, Spike Launching", type: "ranged", damage: "d6", note: "Keratin spikes launched by muscle spasm; an extra ranged attack each round." } },
  { roll: 88, name: "Tentacles, Arms", effect: "You have tentacles instead of arms. -3 STR, +3 DEX.", abilityMod: { strength: -3, dexterity: 3 } },
  { roll: 89, name: "Tentacles, Hair", effect: "You have stinging tentacles instead of hair. At melee range, you can make a d6 TOX attack instead of your normal attack.", naturalWeapon: { name: "Stinging Tentacles", type: "melee", damage: "d6", tags: ["TOX"], note: "TOX damage; an alternative to your normal attack, not an extra one." } },
  { roll: 90, name: "Toxic Flesh", effect: "Your flesh is toxic when eaten or bitten (d8 TOX)." },
  { roll: 91, name: "Transparent Skin", effect: "Your skin is transparent, and your muscles and veins can be seen. You take double damage from beam attacks." },
  { roll: 92, name: "Trunk", effect: "You have an elephant-like trunk, which can hold objects. +1 DEX.", abilityMod: { dexterity: 1 } },
  { roll: 93, name: "Tusks", damageAddOn: { appliesTo: "melee" }, effect: "You have tusks, like a boar. +d6 melee damage.", naturalWeapon: { name: "Tusks", type: "melee", damage: "d6" } },
  { roll: 94, name: "Ultravision", effect: "You have eyes that see beyond the normal spectrum of light. You can see otherwise invisible creatures and objects. You cannot be blinded." },
  { roll: 95, name: "Vampiric", effect: "You must consume a ration of fresh blood each day or become Deprived.", dietRation: { item: "Fresh Blood", onMiss: "deprived", replaces: "water" } },
  { roll: 96, name: "Vestigial Wings", effect: "You have underdeveloped and unusable wings." },
  { roll: 97, name: "Vocal Mimic", effect: "You can perfectly mimic voices or sounds you have heard in the past." },
  { roll: 98, name: "Warty Skin", effect: "Your skin is thick and warty. Add +1 to your AV.", avBonus: 1 },
  { roll: 99, name: "Whiskers", effect: "You have sensitive whiskers like a cat. +1 PSY.", abilityMod: { psyche: 1 } },
  { roll: 100, name: "Wings", effect: "You have wings and may fly freely. When airborne, you are the default target for ranged attacks." },
];
