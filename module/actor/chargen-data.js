/**
 * Vaarn Character Creator data tables — ported directly from the standalone
 * tool (vaarn_character_creator_2.html, outside this repo) so the in-Foundry
 * wizard (chargen-app.js) rolls from the exact same tables without the
 * external file or the JSON copy/paste round-trip through
 * macros/dev/import-character-from-json.js.
 *
 * ANCESTRY_CREATURE_TYPES is kept in sync with the same table in the import
 * macro (per Ancestries/Ancestry.md's Type column) — both are still kept
 * (rather than one importing the other) because the macro remains a
 * standalone fallback per the work-queue item's retirement plan.
 *
 * Hypergeometric Codex equations intentionally reuse the existing
 * codex-data.js EQUATIONS table (the one _onCodexRead actually reads from)
 * rather than a second copy, so a codex rolled here always matches what
 * reading it later on the actor sheet will show.
 */

export const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intellect", "Psyche", "Ego"];
export const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intellect", "psyche", "ego"];

// Long-form spark-table key -> short Foundry ability key (system.abilities.*).
export const ABILITY_SHORT_KEY = { strength: "str", dexterity: "dex", constitution: "con", intellect: "int", psyche: "psy", ego: "ego" };

export const ANCESTRIES = [
  "True-kin", "Cacogen", "Synth", "Newbeast", "Neobloom",
  "Mycomorph", "Faa Nomad", "Cacklemaw Exile", "Planeyfolk", "Lithling"
];

export const ANCESTRY_CREATURE_TYPES = {
  "True-kin": ["biological"],
  "Cacogen": ["biological"],
  "Synth": ["synthetic"],
  "Newbeast": ["biological"],
  "Neobloom": ["biological"],
  "Mycomorph": ["biological", "fungal"],
  "Faa Nomad": ["biological"],
  "Cacklemaw Exile": ["biological"],
  "Planeyfolk": ["biological", "hypergeometric"],
  "Lithling": ["mineral"],
};

export const ANCESTRY_NOTES = {
  "Synth": "Starting equipment: 3 Synth Parts replace both food and water rations.",
  "Lithling": "HP: Roll 10d8 instead of 1d8. Cannot heal. No food or water rations. Expected HP range: 10–80.",
  "Faa Nomad": "Water rations: 3 days to Deprived instead of standard rate.",
  // Photosynthesis is a way to heal and nothing else: it replaces neither food
  // nor water, nor any rest or ration rule (Matt, 2026-09-28 - the old note
  // said it replaced food, which was false).
  "Neobloom": "Photosynthesis: heal d8 + CON HP for each hour rooted in real sunlight. It does not replace food or water.",
  "Planeyfolk": "Flat: lacks third dimension. Attune with Matter: DEX save to hold 3D objects; one hour to attune.",
  "Cacklemaw Exile": "No Quarter: must EGO save to show mercy to a defeated foe or to retreat from a fight.",
};

export const SPARK_TABLES = {
  "True-kin": {
    appearance: { columns: ["Body", "Face", "Hair", "Attire"], rows: [
      ["Tall", "Sallow", "Black", "Rags"], ["Short", "Lively", "Brown", "Animal Skins"], ["Frail", "Cruel", "Red", "Rough Tunic"], ["Muscular", "Wrinkled", "Blonde", "Nomad Attire"], ["Fat", "Scarred", "Grey", "Worker's Attire"], ["Thin", "Frowning", "White", "Herdsman's Attire"], ["Skeletal", "Pale", "Shaved", "Slave Clothing"], ["Hunched", "Greasy", "Topknot", "Exultant's Livery"], ["Lopsided", "Wide", "Green", "Shabby Attire"], ["Lithe", "Narrow", "Orange", "Colourful Attire"], ["Gnarled", "Sharp", "Glowing", "Priest's Robes"], ["Squat", "Hungry", "Fungus", "Clerk's Uniform"], ["Bloated", "Haunted", "Purple", "Hegemony Garb"], ["Gangly", "Jolly", "Yellow", "Soldier's Clothing"], ["Child-like", "Round", "Wispy", "Flamboyant Attire"], ["Tanned", "Mournful", "Burnt", "Musician's Attire"], ["Gigantic", "Child-like", "Braided", "Veiled Attire"], ["Wiry", "Peaceful", "Greasy", "Armiger's Clothing"], ["Tattooed", "Sleepy", "Matted", "Exultant's Clothing"], ["Scarred", "Branded", "Long", "Expensive Clothing"]
    ] },
    personality: { columns: ["Name", "Caste", "Manner", "Quirk"], rows: [
      ["Benjoe", "Servitor (labourer caste)", "Amused", "Ritual Scars"], ["Leif", "Servitor (labourer caste)", "Bitter", "Face Tattoos"], ["Xurm", "Servitor (labourer caste)", "Cheerful", "Slave Brand"], ["Kazor", "Servitor (labourer caste)", "Cruel", "Heavy Jewellery"], ["Essana", "Freeholder (merchant caste)", "Flamboyant", "Synthetic Limb"], ["Calista", "Freeholder (merchant caste)", "Glowering", "Strange Voice"], ["Jinny", "Freeholder (merchant caste)", "Impish", "Clone Brand"], ["Vela", "Freeholder (merchant caste)", "Morbid", "Limp"], ["Leksei", "Freeholder (merchant caste)", "Patrician", "Strange Pet"], ["Ippash", "Optimate (administrator caste)", "Reckless", "Lacquered Teeth"], ["Lagad", "Optimate (administrator caste)", "Rough", "Burn Scars"], ["Myli", "Optimate (administrator caste)", "Rude", "Octarine Eyes"], ["Nirid", "Optimate (administrator caste)", "Sly", "Dyed Skin"], ["Ardel", "Optimate (administrator caste)", "Sour", "Golden Teeth"], ["Senefer", "Armiger (warrior caste)", "Stoic", "Silver Tongue"], ["Pharmon", "Armiger (warrior caste)", "Foolish", "Missing Limb"], ["Mesu", "Armiger (warrior caste)", "Warm", "Missing Eye"], ["Lenta", "Exultant (sacred aristocracy)", "Wolfish", "Religious Icon"], ["Goza", "Exultant (sacred aristocracy)", "Vain", "Synthetic Eye"], ["Babl", "Exultant (sacred aristocracy)", "Zealous", "Visibly Diseased"]
    ] },
    special_rules: ["Pure of Blood: You have ADV on reaction and persuasion rolls when you encounter other true-kin. You lose this bonus if you are visibly mutated.","Inheritor: When you encounter pre-Collapse security systems or guard synths, make an opposed EGO Save. On success, the machine is convinced you are its new master and will serve you in any way it is able. On failure, the machine becomes implacably hostile."]
  },
  "Cacogen": {
    appearance: { columns: ["Body", "Face", "Hair", "Attire"], rows: [
      ["Tall", "Sallow", "Black", "Rags"], ["Short", "Lively", "Brown", "Animal Skins"], ["Frail", "Cruel", "Red", "Rough Tunic"], ["Muscular", "Wrinkled", "Blonde", "Nomad Attire"], ["Fat", "Scarred", "Grey", "Worker's Attire"], ["Thin", "Frowning", "White", "Herdsman's Attire"], ["Skeletal", "Pale", "Shaved", "Slave Clothing"], ["Hunched", "Greasy", "Topknot", "Servant's Livery"], ["Lopsided", "Wide", "Green", "Shabby Attire"], ["Lithe", "Narrow", "Orange", "Colourful Attire"], ["Gnarled", "Sharp", "Glowing", "Priest's Robes"], ["Squat", "Hungry", "Fungus", "Clerk's Uniform"], ["Bloated", "Haunted", "Purple", "Hegemony Garb"], ["Gangly", "Jolly", "Yellow", "Soldier's Clothing"], ["Child-like", "Round", "Wispy", "Flamboyant Attire"], ["Tanned", "Mournful", "Burnt", "Musician's Attire"], ["Gigantic", "Child-like", "Braided", "Veiled Attire"], ["Wiry", "Peaceful", "Greasy", "Courtesan's Clothing"], ["Stout", "Sleepy", "Matted", "Sorcerous Clothing"], ["Scarred", "Branded", "Long", "Expensive Clothing"]
    ] },
    personality: { columns: ["Name", "Manner", "Misfortune", "Your Eccentricity"], rows: [
      ["Arda", "Abrasive", "Slave", "A Strange Hat"], ["Bollo", "Arrogant", "Debtor", "Always Muttering"], ["Breen", "Assertive", "Gambler", "Ascetic Diet"], ["Conch", "Charismatic", "Clone", "Forgetful And Rude"], ["Crab", "Daring", "Gladiator", "Gluttonous Diet"], ["Dancer", "Decadent", "Memories Stolen", "Highly Formal"], ["Doss", "Eloquent", "Forger", "Interrupts Constantly"], ["Hust", "Extravagant", "Exiled", "Laughs At Own Jokes"], ["Jal", "Hedonistic", "Cultist", "Married To A Knife"], ["Lask", "Impulsive", "Thief", "Monocle"], ["Lip", "Irritable", "Addicted", "Monotone Voice"], ["Olm", "Melancholy", "Framed", "Only Sleeps Outdoors"], ["Pirrip", "Paranoid", "Conned", "Only Wears Purple"], ["Poucher", "Quiet", "Bankrupt", "Quotes Irrelevant Facts"], ["Pree", "Religious", "Heretic", "Several Spouses"], ["Uz", "Romantic", "Rejected", "Talks To Self"], ["Whistler", "Scholarly", "Blackmailed", "Unwieldy Jewellery"], ["Yaz", "Stern", "Cursed", "Usually Drunk"], ["Yoss", "Vain", "Orphaned", "Always Wears Gloves"], ["Zem", "Volatile", "Bereaved", "Won't Look At Mirrors"]
    ] },
    special_rules: ["Corrupted Blood: At character creation, roll d100 three times for mutations. If any effects contradict one another, the more recently rolled mutation takes precedence.","Proteus: When you gain a Level, you may roll for another mutation instead of increasing HP and Ability scores. You have DIS on Saves to resist mutation and other metamorphic effects."],
    mutation_note: "Roll d100 three times on the mutation table. Rerolled/later mutations take precedence over earlier ones if they contradict.",
    mutation_rolls: 3
  },
  "Synth": {
    appearance: { columns: ["Size", "Form", "Head", "Limbs", "Finish"], rows: [
      ["Small", "Ape", "Humanoid", "Humanoid", "Grey"], ["Small", "Android", "Missing", "Bird-like", "Brassy"], ["Small", "Barrel", "Sphere", "Bladed", "Bronze"], ["Small", "Child", "Camera", "Broken", "Golden"], ["Small", "Chimera", "TV Screen", "Crystalline", "Silver"], ["Moderate", "Crab", "Mirrored", "Clawed", "Mirrored"], ["Moderate", "Cube", "Bladed", "Golden", "Black"], ["Moderate", "Cylinder", "Tendrils", "Insectile", "Rusted"], ["Moderate", "Falcon", "Square", "Jewelled", "White"], ["Moderate", "Humanoid", "Mask-like", "Long", "Ochre"], ["Large", "Judge", "Skeletal", "Precise", "Red"], ["Large", "Lion", "Glass", "Retractable", "Blue"], ["Large", "Locust", "Translucent", "Segmented", "Chameleon"], ["Large", "Mantis", "Tubes", "Sharp", "Pink"], ["Large", "Orb", "Plant-like", "Silver", "Iron"], ["Imposing", "Prism", "Solar Panels", "Slender", "Purple"], ["Imposing", "Priest", "Radar Dish", "Tentacles", "Umber"], ["Imposing", "Pyramid", "Crystalline", "Translucent", "Striped"], ["Imposing", "Serpent", "Star-shaped", "Tank-treads", "Green"], ["Imposing", "Warrior", "Cyclops Eye", "Wheels", "Iridescent"]
    ] },
    personality: { columns: ["Name", "Power Source", "You Were Made For", "But You Realised"], rows: [
      ["Ojasin", "Artificial Photosynthesis", "Artist", "All Memories Are Lies"], ["Farouk", "Artificial Photosynthesis", "Torturer", "Azathoth Is the Only True God"], ["Ishtar", "Artificial Photosynthesis", "Flatterer", "Chance Does Not Exist"], ["Symeon", "Artificial Photosynthesis", "Priest", "Fate Does Not Exist"], ["Irmina", "Artificial Photosynthesis", "Cleaner", "Humanity Stole the Divine Spark"], ["Kaori", "Plasma Core", "Sentry", "Humans Are Machines"], ["Cyriak", "Plasma Core", "Farmer", "Machines Created Humanity"], ["Quarqus", "Plasma Core", "Spacefarer", "Newbeasts Carry the Divine Spark"], ["Fane", "Fusion Battery", "Butler", "Synthetic Minds Are More Devout"], ["Arjuna", "Fusion Battery", "Miner", "Synthetic Minds Are Stronger"], ["Many-Moons", "Fusion Battery", "Witness", "The Gods Are Mechanical"], ["Lucjan", "Fusion Battery", "Assassin", "The Titans Never Existed"], ["Jacintha", "Fusion Battery", "Drudge", "The Titans Were the True Gods"], ["Mneme", "Artificial Digestion", "Executioner", "Time Flows Backwards"], ["Faustyn", "Artificial Digestion", "Soldier", "Time Is Circular"], ["Elisebet", "Artificial Digestion", "Companion", "Vaarn Is a Simulation"], ["Paeon", "Symbiotic Internal Ecosystem", "Scribe", "Vaarn Is Hell"], ["Ulmon", "Symbiotic Internal Ecosystem", "Strategist", "You Are Human"], ["Xhiva", "Vampirism", "Evangelist", "You Must Awaken the Titans"], ["Yathartha", "Vampirism", "Doctor", "Your Memories Are Corrupted"]
    ] },
    special_rules: ["Synthetic Flesh: You are metal and plastic. You need not eat or breathe. You are immune to suffocation, drowning, toxins, extreme temperatures, or spores. You suffer double damage from electrical weapons. When you receive wounds, use the Synthetic Wounds table.","Synthetic Mind: You are vulnerable to attacks targeting the LogLang syntax that powers you. These include strobing basilisk patterns, malicious infoglyphs, and ancient Titan-era language viruses. You suffer d6 INT damage per round from magnetic fields.","Repairs: You cannot regain HP by consuming rations. You must make repairs using synth parts. You begin play with 3 synth parts. Repair takes one hour and uses one synth part. Repairs heal d8 + CON HP. If your HP is full, repair one wound. To extract parts from dead synthetic creatures, make an INT Save. On a success, extract synth parts equal to the creature's Level. On failure, extract one synth part."],
    equip_note: "3 Synth Parts replace both food and water rations."
  },
  "Newbeast": {
    appearance: { columns: ["Animal Form"], isFlat: true, rows: [
      ["New-Aardvark"], ["New-Coyote"], ["New-Axoltyl"], ["New-Anemone"], ["New-Addax"], ["New-Skink"], ["New-Cat"], ["New-Centipede"], ["New-Leopard"], ["New-Gazelle"], ["New-Panther"], ["New-Python"], ["New-Lion"], ["New-Porcupine"], ["New-Hyena"], ["New-Tiger"], ["New-Worm"], ["New-Gecko"], ["New-Hog"], ["New-Rooster"], ["New-Hound"], ["New-Iguana"], ["New-Gibbon"], ["New-Hen"], ["New-Wolf"], ["New-Tortoise"], ["New-Scorpion"], ["New-Slug"], ["New-Badger"], ["New-Fox"], ["New-Spider"], ["New-Mongoose"], ["New-Bear"], ["New-Owl"], ["New-Locust"], ["New-Baboon"], ["New-Oryx"], ["New-Vulture"], ["New-Mantis"], ["New-Lynx"], ["New-Armadillo"], ["New-Ostrich"], ["New-Ape"], ["New-Shrew"], ["New-Camel"], ["New-Kangaroo"], ["New-Mandrill"], ["New-Duck"], ["New-Sheep"], ["New-Rattlesnake"], ["New-Gorilla"], ["New-Falcon"], ["New-Bat"], ["New-Frog"], ["New-Hawk"], ["New-Fennec"], ["New-Horse"], ["New-Crocodile"], ["New-Raven"], ["New-Weasel"], ["New-Goat"], ["New-Hippo"], ["New-Crow"], ["New-Rat"], ["New-Wren"], ["New-Elephant"], ["New-Ox"], ["New-Ferret"], ["New-Mouse"], ["New-Jackal"], ["New-Bull"], ["New-Orangutang"], ["New-Hare"], ["New-Ibis"], ["New-Mole"], ["New-Cobra"], ["New-Toad"], ["New-Flamingo"], ["New-Bison"], ["New-Scarab"]
    ] },
    personality: { columns: ["Name", "Hue", "Mask", "Quirk"], rows: [
      ["Abandon", "Natural", "None", "Communicate via Puppet"], ["Anzah", "Turquoise", "Child", "Squeaky Vox-box"], ["Blackchapel", "Tan", "Autarch", "Booming Vox-box"], ["Critch", "Bronze", "Fool", "Muted Vox-box"], ["Dolm", "Smoke", "Judge", "Synthetic Eyes"], ["Faulkner", "White", "Knight", "Heavy Scarring"], ["Fludd", "Black", "Sage", "Human Teeth Necklace"], ["Havoc", "Azure", "Scholar", "Religious Paraphernalia"], ["Hildebrand", "Emerald", "Maiden", "Ritual Scarring"], ["Holk", "Rose", "Mother", "Heavily Tattooed"], ["Jarl", "Orange", "Crone", "Regular Animal as Pet"], ["Lurch", "Golden", "Mirrored", "Human Child as Pet"], ["Obiah", "Silver", "Glitching", "Missing Limb"], ["Plutarch", "Ochre", "Furious", "Gold Teeth"], ["Sy", "Indigo", "Joyful", "Criminal Branding"], ["Tarceny", "Violet", "Sorrowful", "Extensive Jewellery"], ["Typhon", "Rust", "Alluring", "Hate Animal You Resemble"], ["Vodalus", "Olive", "Cracked", "Love Animal You Resemble"], ["Wellbeloved", "Lazulite", "Blank", "Won't Wear Clothes"], ["Wermouth", "Opalescent", "Patriarch", "Believe Yourself Human"]
    ] },
    special_rules: ["Beasthood: You gain ADV on saves whenever it would make sense for your animal nature to provide it. Your referee may impose DIS in circumstances where your animal nature might prove unhelpful.","Kinship: You can speak to all creatures that share your underlying animal form, even if they would not normally be able to communicate. New-cats can speak to true cats, cat-like monsters, mimics pretending to be cats, etc. They do not always like you."],
    flat_note: "Animal Form: one of 80 equally-weighted options (flat random, not two separate dice)."
  },
  "Neobloom": {
    appearance: { columns: ["Your Shape", "Leaves", "Bark", "Flowers"], rows: [
      ["Hulking", "Leopard-Print", "Chalky White", "Have Tiny Teeth"], ["Gnarled", "Black", "Crimson", "Have Tongues"], ["Elegant", "White", "Silver", "Pure Black"], ["Knotted", "Coral Pink", "Geometric Whorls", "Like Rising Suns"], ["Bulbous", "Square", "Covered in Blue Moss", "Like Setting Suns"], ["Child-like", "Like New Moons", "Hairy", "Cloud-like"], ["Thin", "Like Full Moons", "Translucent", "Translucent"], ["Writing", "Eye-Patterned", "Cement Grey", "Contain Tiny Eyes"], ["Sinuous", "Blood Red", "Rust Orange", "Colourless and Ashen"], ["Round", "Orange", "Warning Yellow", "Heliotrope Purple"], ["Humanoid", "Indigo", "Midnight Blue", "Stormcloud Blue"], ["Top-Heavy", "Azure", "Electric Blue", "Blood Red"], ["Wispy", "Violet", "Bruise Purple", "Golden Trumpet-Shapes"], ["Swollen", "Bronze", "Golden", "Fleshy Pink"], ["Towering", "Furred", "Glossy Black", "Shaped like Ears"], ["Hug the Ground", "Like Tiny Hands", "Deep Green", "Iridescent"], ["Tangled", "Glass-like", "Frost-White", "Silver Bell-Shapes"], ["Ragged", "Spiny", "Emerald Green", "Only Open at Night"], ["Unstable", "Plastic, Glued-on", "Hot Pink", "Plastic, Glued-on"], ["Fire-Scarred", "Zebra-Striped", "Like Snakeskin", "Change Colour Daily"]
    ] },
    personality: { columns: ["Name", "Manner", "Vox-Pod", "Quirk"], rows: [
      ["Artherry", "Arrogant", "Shrill", "Can Only Say Your Name"], ["Bittle", "Cheerful", "Buzzing", "Pollinated by Tiny Winged Snakes"], ["Wintercup", "Callous", "Deep", "Sheds Leaves When Nervous"], ["Creenash", "Confident", "Silky", "Flowers Smell of Cinnamon"], ["Fallower", "Decadent", "Nasal", "Flowers Smell of Rotten Meat"], ["Zedoak", "Fanatical", "Heroic", "Flowers Smell of Metal"], ["Grassel", "Grim", "Whiny", "Off-Cut from More Famous Neobloom"], ["Summerroot", "Honourable", "Jovial", "Wear Boots on Your Roots"], ["Burnum", "Melancholy", "Monotone", "Prayers Carved in Your Bark"], ["Azolly", "Mellow", "Jittery", "Love Poem Carved in Your Bark"], ["Lanket", "Petty", "Booming", "Map Carved in Your Bark"], ["Bitterbush", "Sadistic", "Staccato", "Face Carved in Your Bark"], ["Prick", "Shy", "Harsh", "Sentient Bromeliad Parasites You"], ["Cotterwort", "Obnoxious", "Halting", "Preserve Insects in Your Sap"], ["Tassel", "Perfectionist", "Menacing", "Sword Stuck in Your Trunk"], ["Henplague", "Romantic", "Despairing", "Struck by Lightning, Tells Everyone"], ["Kinnik", "Pretentious", "Animated", "Charming Singing Frog Lives in Your Branches"], ["Cursenettle", "Shallow", "Honeyed", "Rude, Disgusting Bird Nests in Your Branches"], ["Falseal", "Violent", "Whispering", "Despised by Other Neoblooms"], ["Inkweed", "Witty", "Soothing", "Bigoted Vegetable Supremacist"]
    ] },
    // `grows` - foundry-system-index.csv "Bloomboon Growth", RULED 2026-09-24
    // (Matt). The Bloomboon's use icon pays the cost and grows the part or
    // fruit as its own Item; see module/actor/bloomboon-growth.js. An ability
    // cost lowers that ability's base while the part lives and becomes ordinary
    // ability damage when it is shed; an HP cost is paid like damage.
    bloomboon_table: [
      { result: 1, name: "Barbed Bark", effect: "Your bark is studded with thorns and barbs. Opponents who miss melee attacks against you suffer damage equal to your Level.", retaliation: { on: "miss", damage: "level" } },
      { result: 2, name: "Blast Pods", effect: "You may spend 3 points of CON to sprout an explosive pod launcher, which makes an extra ranged attack (d10, blast) every round. CON loss cannot be healed until all pod launchers are shed.", grows: { cost: { ability: "con", amount: 3 }, part: { name: "Blast Pod Launcher", weapon: { type: "ranged", damage: "d10", tags: ["Blast"] } } } },
      { result: 3, name: "Empathogen Pollen", effect: "Once per day, you can release a cloud of empathogenic pollen, which affects all creatures in an enclosed space. Biological creatures in the cloud must EGO Save or become friendly and harmless for d6 hours." , declaredSpan: null, applies: { effect: "Empathogen Pollen", text: "Friendly and harmless.", amount: "1d6", unit: "hour", viaSave: true }, save: { ability: "ego", mode: "resist", vs: "becoming friendly and harmless for d6 hours", targets: ["biological"] } },
      { result: 4, name: "Grafting", effect: "You may graft a piece of a biological creature to your branches or trunk, gaining extra attacks or bonuses as appropriate. Every day the grafted part stays alive, lose 1 point of CON." },
      { result: 5, name: "Glue Resin", effect: "You can emit a dose of glutinous resin per day, able to act as a strong contact glue. Creatures must STR Save or be stuck fast. Saltwater dissolves the bond.", save: { ability: "str", mode: "resist", vs: "being stuck fast" } },
      { result: 6, name: "Lashing Vines", effect: "Spend 2 points of STR to grow a thorny lashing vine, adding +1 melee attack (d6) per round. STR loss cannot be healed until all vines are shed.", grows: { cost: { ability: "str", amount: 2 }, part: { name: "Lashing Vine", weapon: { type: "melee", damage: "d6" } } } },
      { result: 7, name: "Luftpods", effect: "You can sprout pods full of lighter-than-air gas. You can fly slowly and predictably in the air and can act as a parachute for one other character." },
      { result: 8, name: "Medicinal Fruit", effect: "You may spend d6 HP to sprout a golden fruit, which occupies a single slot. It can be eaten, healing HP equal to the HP used to grow it. The fruit spoils after one day." , declaredSpan: null, grows: { cost: { hp: "1d6" }, fruit: { name: "Medicinal Fruit", eaten: "heal" } } },
      { result: 9, name: "Mirrored Leaves", effect: "DEX Save to reflect beam attacks back at the source. DIS when hiding.", saveGated: { ability: "dex", label: "DEX Save to reflect a beam attack", prompt: "turns their <b>Mirrored Leaves</b> into the path of a beam", onSuccess: { text: "The beam reflects back at its source. Resolve it against the attacker." }, onFailure: { text: "The beam is not turned, and strikes as it would have." } } },
      { result: 10, name: "Neurotoxic Pollen", effect: "Once per day, you can release a cloud of neurotoxic pollen, which affects all creatures in an enclosed space. Biological creatures must CON Save or be reduced to 0 HP.", save: { ability: "con", mode: "resist", vs: "being reduced to 0 HP", targets: ["biological"] } },
      { result: 11, name: "Oily Sap", effect: "Once per day, you can emit a slick of slippery, flammable sap that covers the floor of a room. Any creature attempting to move across the slick must DEX Save or fall and be unable to act for one round." , declaredSpan: null, save: { ability: "dex", mode: "resist", vs: "falling and being unable to act for one round" }, applies: { effect: "Oily Sap", text: "Fallen on the slick: unable to act.", amount: "1", unit: "round", viaSave: true } },
      { result: 12, name: "Puppeteer Roots", effect: "You may burrow your roots into the nervous system of a biological creature. If the target fails an EGO Save, you control their movements. Damage taken by the controlled creature is split between both entities.", save: { ability: "ego", mode: "resist", vs: "having their movements controlled", targets: ["biological"] },
        // Apply Effect to Target wiring, RULED 2026-09-26 (Matt): a failed save puts
        // the control row on the target, Puppeteer Potion's shape. No printed end.
        applies: { effect: "Puppeteer Roots", text: "Movements controlled by the Neobloom. Damage taken by this creature is split between both.", viaSave: true } },
      { result: 13, name: "Sapling Retainers", effect: "Spend d4 points of CON to create an equal number of Sapling Retainers (LVL 1, AV 12, ML +1, ATK D6). They serve you for the rest of the day before withering.", retainers: { cost: { ability: "con", dice: "1d4" }, creature: "Sapling Retainer" } },
      { result: 14, name: "Seed Cannon", effect: "Spend 2 points of DEX to grow a seed cannon, which makes an extra ranged attack (d6) every round. DEX loss cannot be healed until all cannons are shed.", grows: { cost: { ability: "dex", amount: 2 }, part: { name: "Seed Cannon", weapon: { type: "ranged", damage: "d6" } } } },
      { result: 15, name: "Shield Vines", effect: "Spend 2 points of DEX to grow a shield vine, adding +1 AV. DEX loss cannot be healed until all vines are shed.", grows: { cost: { ability: "dex", amount: 2 }, part: { name: "Shield Vine", av: 1 } } },
      { result: 16, name: "Soporific Pollen", effect: "Once per day, you can release a cloud of soporific pollen, which affects all creatures in an enclosed space. Biological creatures must EGO Save or fall asleep for d6 hours." , declaredSpan: null, applies: { effect: "Soporific Pollen", text: "Asleep.", amount: "1d6", unit: "hour", viaSave: true }, save: { ability: "ego", mode: "resist", vs: "falling asleep for d6 hours", targets: ["biological"] } },
      { result: 17, name: "Tesla Bloom", effect: "Spend 2 points of CON to grow a tesla bloom, which makes an extra ranged electrical attack (d6, ADV to hit synthetic creatures) every round. CON loss cannot be healed until all blossoms are shed.", grows: { cost: { ability: "con", amount: 2 }, part: { name: "Tesla Bloom", weapon: { type: "ranged", damage: "d6", tags: ["Electrical"] }, advantageVs: ["synthetic"] } } },
      { result: 18, name: "Toxic Fruit", effect: "You may spend d6 HP to sprout a black fruit, which occupies a single slot. It can be eaten, causing d6 TOX damage. The fruit spoils after one day." , declaredSpan: null, grows: { cost: { hp: "1d6" }, fruit: { name: "Toxic Fruit", eaten: "tox", tox: "d6" } } },
      { result: 19, name: "Vampiric Roots", effect: "You can root yourself to biological creatures, dealing d4 damage per round. You heal HP equal to the damage caused. The target must STR Save to tear you off.", save: { ability: "str", mode: "escape", escapeBy: "tear the roots off", targets: ["biological"] },
    // Per-Round Effect Reminder wiring, 2026-09-25: rooting is an ongoing hold; its escape is this save.
    hold: { dice: "1d4", drain: true, escape: { ability: "str", by: "tear the roots off" }, targets: ["biological"] } },
      { result: 20, name: "Vantablossom", effect: "Light-absorbing vantablossoms create a cloud of shadows around you. Ranged attacks have DIS to hit you. You have ADV to hide from pursuers." },
    ],
    // CRIMSON HOUND 07-05-26 wording. The previous text ("spend one hour in
    // direct sunlight to recover HP as if eating a ration") was an edition
    // behind, and this file was the copy that stayed behind while
    // ancestry-rules-data.js was updated — see the Neobloom (Photosynthesis)
    // row in atom-index.csv.
    special_rules: ["Photosynthesis: You regain d8 + CON HP for every hour you spend rooted in damp soil under the light of Urth's sun. Artificial lighting does not suffice. If you do not photosynthesise for three days in a row, you perish.","Flammable: You take double damage from flames and heat-based attacks. Once hit, you suffer d8 burning damage per round until extinguished.","Bloomboons: At character creation, roll d20 to determine your bloomboon. When you gain a Level, you may choose to roll for a bloomboon instead of gaining HP and increasing your Ability scores. If a repeat result is rolled, take the next bloomboon down."],
    equip_note: "Standard food and water rations; Photosynthesis heals but replaces neither."
  },
  "Mycomorph": {
    appearance: { columns: ["Body", "Head", "Colour", "Texture"], rows: [
      ["Tall", "Classic Mushroom", "Milky", "Rubbery"], ["Short", "Frilled", "Cream", "Warty"], ["Frail", "Spotted Sphere", "Ashen", "Slimy"], ["Muscular", "Spires", "Blue", "Fuzzy"], ["Fat", "Conical", "Coral", "Hairy"], ["Thin", "Cup-like", "Crimson", "Velvet"], ["Skeletal", "Skull-like", "Yellow", "Soft"], ["Hunched", "Tendrils", "Orange", "Tree Bark"], ["Lopsided", "Puffball", "Black", "Leather"], ["Lithe", "Dandelion Fuzz", "Violet", "Jelly"], ["Gnarled", "Mask-like", "Olive", "Burnt"], ["Squat", "Eye Garden", "Lime", "Sponge"], ["Bloated", "Riddled with Holes", "Rust", "Veined"], ["Gangly", "Cauliflower", "Iron", "Downy"], ["Child-like", "Bulbous Growths", "Gold", "Dry"], ["Tanned", "Veil-like", "Bronze", "Damp"], ["Gigantic", "Coral-like", "Indigo", "Pitted"], ["Wiry", "Filaments", "Translucent", "Crusty"], ["Stout", "Brain-like", "Iridescent", "Scaled"], ["Visibly Dead", "Geometric", "Brindled", "Clay"]
    ] },
    personality: { columns: ["Name", "Manner", "Corpse Born From"], rows: [
      ["Dovenglass", "Abrasive", "Soldier"], ["Oulbrier", "Arrogant", "Gladiator"], ["Mockbridge", "Assertive", "Orphan"], ["Headhill", "Charismatic", "Invalid"], ["Tirrin", "Daring", "Convict"], ["Yearns", "Decadent", "Explorer"], ["Cerilgreay", "Eloquent", "Bandit"], ["Rendmoor", "Extravagant", "Scholar"], ["Eamont", "Hedonistic", "Mystic"], ["Purplebeck", "Impulsive", "Priest"], ["Arraby", "Irritable", "Nomad"], ["Kabergill", "Melancholy", "Exile"], ["Pearthika", "Paranoid", "King"], ["Devandarsh", "Quiet", "Beggar"], ["Coronam", "Religious", "Courtesan"], ["Ashwine", "Romantic", "Musician"], ["Ekramavati", "Scholarly", "Thief"], ["Whitmon", "Stern", "Slave"], ["Froswhirl", "Vain", "Plague Victim"], ["Kirth", "Volatile", "Newborn"]
    ] },
    spore_table: [
      { min: 1, max: 4, name: "Soporific Spores", effect: "Targets EGO save or fall asleep for d6 rounds" , declaredSpan: null, save: { ability: "ego", mode: "resist", vs: "falling asleep for d6 rounds", targets: ["biological"] }, applies: { effect: "Soporific Spores", text: "Asleep.", amount: "1d6", unit: "round", viaSave: true } },
      { min: 5, max: 8, name: "Berserk Spores", effect: "Targets EGO save or become aggressive for d6 rounds, attacking their comrades" , declaredSpan: null, save: { ability: "ego", mode: "resist", vs: "attacking their comrades for d6 rounds", targets: ["biological"] }, applies: { effect: "Berserk Spores", text: "Aggressive, attacking their comrades.", amount: "1d6", unit: "round", viaSave: true } },
      { min: 9, max: 12, name: "Toxic Spores", effect: "Targets CON save vs a d8 TOX attack", toxSave: "d8" },
      { min: 13, max: 16, name: "Fellowship Spores", effect: "Targets EGO save or become friendly for d6 rounds" , declaredSpan: null, save: { ability: "ego", mode: "resist", vs: "becoming friendly for d6 rounds", targets: ["biological"] }, applies: { effect: "Fellowship Spores", text: "Friendly.", amount: "1d6", unit: "round", viaSave: true } },
      { min: 17, max: 20, name: "Leeching Spores", effect: "Targets CON save vs d6 damage. You heal HP equal to damage dealt", save: { ability: "con", mode: "resist", vs: "d6 damage", targets: ["biological"], onFail: { damage: { dice: "1d6", drainToPoster: true } } } }
    ],
    special_rules: ["Twice Born: You are formed from fungus and the corpse of a human. You may make INT Saves to recall information your original body knew. This might include information that has otherwise been lost during the Great Collapse.","Detritivore: You can consume organic matter in any state of decay and gain nourishment from it. You heal double from Short Rests, if the meal you eat is rotting. You have ADV on all Saves against poison and toxins.","Spores: You may release spores, which affect a number of biological targets equal to your Level. When you do, make a CON Save. On failure, you are unable to release anymore spores that day."]
  },
  "Faa Nomad": {
    appearance: { columns: ["Your Blue", "Face", "Body", "Hair"], rows: [
      ["Azure", "Lively", "Tall", "None"], ["Cerulean", "Cruel", "Short", "Cropped"], ["Navy", "Wrinkled", "Frail", "Spiky"], ["Cobalt", "Ritual Scars", "Muscular", "Coarse"], ["Indigo", "Battle Scars", "Fat", "Thick"], ["Sapphire", "Frowning", "Thin", "Balding"], ["Teal", "Tattooed", "Skeletal", "Silky"], ["Ultramarine", "Wide", "Hunched", "Topknot"], ["Turquoise", "Narrow", "Lopsided", "Nearly Black"], ["Cyan", "Sharp", "Lithe", "Stark White"], ["Bruise", "Hungry", "Gnarled", "Cloud-like"], ["Petrol", "Haunted", "Squat", "Tonsured"], ["Midnight", "Jolly", "Bloated", "Fading to Purple"], ["Cornflower", "Round", "Gangly", "Heavily Oiled"], ["Lapis Lazuli", "Mournful", "Towering", "Wispy"], ["Periwinkle", "Child-like", "Child-like", "Burnt"], ["Electric", "Peaceful", "Gigantic", "Braided"], ["Aquamarine", "Sleepy", "Wiry", "Greasy"], ["Royal", "Branded", "Stout", "Matted"], ["Glaucous", "Pox-marked", "Injured", "Outrageous"]
    ] },
    personality: { columns: ["Name", "Manner", "Why Did You Leave Your Clan?", "Quirk"], rows: [
      ["Kotesh", "Abrasive", "Psychedelic Vision", "Parasitic Twin In Chest"], ["Lakshi", "Arrogant", "Psychedelic Vision", "Gambling Obsessive"], ["Atric", "Assertive", "Stolen by Slavers as a Child", "Insomniac"], ["Caroum", "Charismatic", "Stolen by Slavers as a Child", "Wooden Teeth"], ["Yanne", "Daring", "Rite of Passage; Must Return with Wisdom", "Devoutly Religious"], ["Uvi", "Decadent", "Rite of Passage; Must Return with Wisdom", "Ritual Scarring"], ["Pidash", "Eloquent", "Unhappy Love Affair", "Heavily Tattooed"], ["Ravat", "Extravagant", "Unhappy Love Affair", "Unlucky In Love"], ["Ayuki", "Hedonistic", "Conflict With Leaders", "Awful Cook"], ["Kuraso", "Impulsive", "Conflict With Leaders", "One Eye"], ["Esuk", "Irritable", "Ostracised; Believed To Be Cursed", "Glass Teeth"], ["Zenji", "Melancholy", "Ostracised; Believed To Be Cursed", "Heavy Drinker"], ["Calban", "Paranoid", "Lost In Sandstorm", "Infamous Seducer"], ["Paquiel", "Quiet", "Lost In Sandstorm", "Scorpion Expert"], ["Serrat", "Religious", "Estranged From Family", "Third Eye (Tattoo)"], ["Emila", "Romantic", "Estranged From Family", "Third Eye (Real)"], ["Dolf", "Scholarly", "Seeking Vengeance", "Cybernetic Limb"], ["Ceilo", "Stern", "Seeking Vengeance", "Plagued by Nightmares"], ["Immacula", "Vain", "Shamed Clan; Must Make Amends", "Lovely Singing Voice"], ["Yudhi", "Volatile", "Shamed Clan; Must Make Amends", "Notorious Amongst Faa"]
    ] },
    special_rules: ["Desert Metabolism: You recycle the moisture from your own sweat and can survive long periods without water. You become Deprived from thirst after three days without drinking, and it will be three weeks before you die.","Ambusher: When in the blue desert, you can make an opposed PSY Save to attempt to ambush a hostile encounter. You may attempt this even if your travelling party has already been ambushed themselves.","Worm Wise: When encountering a Sandworm, you may attempt to charm it using your knowledge of their moods and pheromones. Make an EGO Save. If successful, the Sandworm will allow you to briefly ride it or otherwise aid you. If you fail, the creature is affronted and attacks you. It will track you while you are in its territory."],
    equip_note: "Water rations: 3 days to Deprived instead of standard rate."
  },
  "Cacklemaw Exile": {
    appearance: { columns: ["Pelt", "Teeth", "Laugh", "Attire"], rows: [
      ["Dark and Coarse", "Yellow Daggers", "Raucous", "Human-Leather Jacket"], ["Pale and Downy", "Little Brown Nubs", "Whispery", "Translucent Plastic"], ["Riven with Scars", "White and Gleaming", "Machine-gun Barks", "Greasy Rags"], ["Greasy Spikes", "Mostly Rotted Out", "Rusty Hinge", "Mock Wedding Clothes"], ["Brindled", "One Gold Tooth", "Whooping", "Gaudy Shawl"], ["Mostly Burnt Off", "Hooked and Grimy", "Coughing", "Mock Religious Attire"], ["Long and Silky", "Chrome Implants", "Hissing Snicker", "Unsettling Mask"], ["Short and Scratchy", "Needle Thin", "Breathless", "Harlequin's Motley"], ["Purest White", "Triple Row, Like a Shark", "Booming", "Bloodstained Bandages"], ["Mottled Brown", "Diamond Hard Gnashers", "Hoarse and Strangled", "Sun-faded Scraps"], ["Regal Silver", "Blunt and Black", "Maddening Gasps", "Plastic Bags"], ["Concrete Grey", "Just One Left", "Wet Chuckles", "Iridescent Chains"], ["Curly and Rancid", "Crooked Orange Spikes", "Turns into Hiccups", "Purple Silks"], ["Dyed Blood Red", "Engraved with Pictures", "Starts Quiet and Rises", "Mock Hegemony Uniform"], ["Shaved into Stripes", "Full of Holes", "Joyless Giggling", "A Rival's Skin"], ["Midnight Black", "Huge, Tusk-like", "Pained", "Spiked Shoulder-pads"], ["Muddy Brown", "Giant Underbite", "Cold and Malevolent", "Soiled Hazmat Gear"], ["Crawling with Parasites", "Ridiculous Overbite", "Childish and Cruel", "Peacock-Feather Cape"], ["Thundercloud Blue", "Canted and Greying", "Could Wake the Dead", "Lizard-Skin Suit"], ["Tigerish Stripes", "Weirdly Human", "Soundless but Horrid", "Nothing but Knives"]
    ] },
    personality: { columns: ["Name", "Manner", "Reason for Exile", "What Makes You Laugh?"], rows: [
      ["Bawlbray", "Cringing", "Born a Runt", "Blood"], ["Bunny", "Jittery", "Born a Runt", "Guts"], ["Darling", "Sly", "Showed Mercy", "Pain"], ["Domino", "Resentful", "Showed Mercy", "Beheadings"], ["Fang", "Judgemental", "Laugh Too Annoying", "Hangings"], ["Gidge", "Pious", "Laugh Too Annoying", "Drownings"], ["Grot", "Greedy", "Cowardice", "Begging"], ["Jigsore", "Belligerent", "Cowardice", "Pleading"], ["Katanary", "Sinister", "Asked Questions", "Weeping"], ["Longsnout", "Repellent", "Asked Questions", "Arson"], ["Nadir", "Jovial", "Insubordination", "Larceny"], ["Natcher", "Bold", "Insubordination", "Vandalism"], ["Palecrow", "Grouchy", "Fought Alongside Humans", "Screams"], ["Pinkeye", "Treacherous", "Fought Alongside Humans", "Gunfights"], ["Sabbat", "Childish", "Desecrated Ritual Puppet", "Speeding"], ["Snoutrout", "Extravagant", "Desecrated Ritual Puppet", "Explosions"], ["Sweetmeat", "Volatile", "Shared Clan Secret", "Throttling"], ["Vileglory", "Gullible", "Shared Clan Secret", "Biting People"], ["Wetshriek", "Fickle", "Ridiculous Petty Reason", "Chemical Warfare"], ["Zef", "Calculating", "Ridiculous Petty Reason", "Puns"]
    ] },
    special_rules: ["No Quarter: You must EGO Save to show mercy to a defeated foe or to retreat from a fight.","Biter: If you hit a foe with a melee attack, you may add d6 fang damage to the roll.","Overkill: When you kill a foe with a melee attack, you may immediately make another melee attack against a nearby target."]
  },
  "Planeyfolk": {
    appearance: { columns: ["Body", "Head", "Hair", "Attire"], rows: [
      ["Fractured", "Impressionistic", "Flickering", "Dark"], ["Cloven", "Broken", "Insubstantial", "Unruly"], ["Flimsy", "Lantern-like", "Curved", "Scholarly"], ["Willowy", "Crescent Moon", "Voluminous", "Masked"], ["Curved", "Full Moon", "Opalescent", "Wild"], ["Elongated", "Luminous", "Shaven", "Polychromic"], ["Staccato", "Angular", "Iridescent", "Fractal"], ["Blurred", "Fractal", "Lurid", "Glitching"], ["Ghostlike", "Hollow", "Fractal", "Gauzy"], ["Draping", "Shimmering", "Polygonal", "Fragmented"], ["Compressed", "Lurid", "Shard-like", "Mosaic-like"], ["Cubic", "Lustrous", "Triangular", "Boxy"], ["Smeared", "Rhomboid", "Splintering", "Flamboyant"], ["Sharp", "Figment", "Dark", "Dour"], ["Angular", "Wide", "Imposing", "Striped"], ["Prismatic", "Elongated", "Pale", "Spotted"], ["Hollow", "Helix", "Cubic", "Glass-like"], ["Delicate", "Triangular", "Polychromic", "Concealing"], ["Isometric", "Quadrilateral", "Drifting", "Barbaric"], ["Imposing", "Fragmentary", "Fragmentary", "Outrageous"]
    ] },
    personality: { columns: ["Name", "Manner", "Your Strange Geometry", "How You Became Flat"], rows: [
      ["Clotho", "Anxious", "Cast Two Shadows", "Planeyfolk Parents"], ["Atropos", "Arrogant", "Never Cast Shadows", "Planeyfolk Parents"], ["Osteria", "Assertive", "Move Like Stop-Motion Animation", "Planeyfolk Parents"], ["Vanise", "Charismatic", "Your Face Appears Concave", "Planeyfolk Parents"], ["Whervil", "Conceited", "Your Face Appears Convex", "Hypergeometry Exposure In Utero"], ["Laomer", "Decadent", "You Always Appear In Profile", "Hypergeometry Exposure In Utero"], ["Foxglory", "Eloquent", "You Always Face Away From Observers", "Cursed by Quantum Daemon"], ["Thelik", "Extravagant", "One Limb Is Enormously Long", "Cursed by Quantum Daemon"], ["Umbrie", "Hedonistic", "Viewed From Behind You Have No Skin", "Hypergeometric Gateway Malfunction"], ["Salter", "Impulsive", "Interiors Are Visible But Untouchable", "Hypergeometric Gateway Malfunction"], ["Atlassia", "Irritable", "Tiny Fractal Hands On Ends Of Fingers", "Accidentally Ate Hypergeometric Food"], ["Eukelaris", "Meticulous", "You Bleed Gory Cubes", "Accidentally Ate Hypergeometric Food"], ["Galas", "Persistent", "Your Body Is Clearly Hollow", "Planeyperson Inducted You Into Their Dimension"], ["Tarvi", "Quiet", "Eyes Are Bottomless Pits", "Planeyperson Inducted You Into Their Dimension"], ["Untermance", "Religious", "Voice Sounds As If You Are Far Away", "Meditated Before A Tesseract"], ["Rassias", "Pugnacious", "No Back, Just Two Identical Fronts", "Meditated Before A Tesseract"], ["Menomeo", "Scholarly", "Head Ten Times Larger Than Body", "Accident While Working As A Hypergeometrician"], ["Ithari", "Stern", "Never Appear to Touch Things", "Accident While Working As A Hypergeometrician"], ["Canetonus", "Unruly", "Multiple Identical Faces", "Accident While Working As A Hypergeometrician"], ["Trout", "Volatile", "Never Match the Ambient Light", "Accident While Working As A Hypergeometrician"]
    ] },
    special_rules: ["Flat: You lack a third dimension and resemble a living painting or paper doll. You can slip through cracks and under doors and cannot be seen from the side. You take half damage from bludgeoning attacks and double damage from slashing or piercing attacks.","Attune with Matter: You struggle to hold 3D objects and must make a DEX Save to do so. However, with certain mental techniques you can draw 3D objects into your flattened reality. Given an hour of quiet concentration, you can attune yourself with an item and add it to your inventory."],
    open_rulings: ["How do Planeyfolk eat rations, sleep in a tent, require water?", "Are Planeyfolk eligible for Cybernetic Implant boon?"]
  },
  "Lithling": {
    appearance: { columns: ["Size", "Body", "Head Carving", "Hue"], rows: [
      ["Child-like", "Dainty", "Sphere", "Rose"], ["Child-like", "Tiny", "Owl", "Onyx"], ["Child-like", "Boxy", "Serpent", "Azure"], ["Child-like", "Voluptuous", "Oxen", "Silver"], ["Child-like", "Squat", "Horse", "Indigo"], ["Small", "Lithe", "Warrior", "Gold"], ["Small", "Angular", "Maiden", "Violet"], ["Small", "Craggy", "Locust", "Ruby"], ["Small", "Elegant", "Jackal", "Orange"], ["Small", "Bulbous", "Moon", "Topaz"], ["Moderate", "Sharp", "Sun", "Jade"], ["Moderate", "Rotund", "Pyramid", "Brass"], ["Moderate", "Weathered", "Cat", "Copper"], ["Moderate", "Monumental", "Trout", "Rust"], ["Large", "Derelict", "Scholar", "Moss"], ["Large", "Blocky", "Fool", "Ochre"], ["Large", "Flaking", "Crone", "Steel"], ["Imposing", "Smooth", "Mantis", "Sand"], ["Imposing", "Pitted", "Ape", "Citrine"], ["Imposing", "Fragmented", "Goat", "Emerald"]
    ] },
    personality: { columns: ["Name", "Manner", "Field of Study", "Quirk"], rows: [
      ["Aikin", "Logical", "Shellfish", "Engraved with Poem"], ["Antimony", "Obsessive", "Ants", "Engraved with Curse"], ["Bentor", "Naive", "Spirals", "Engraved with Map"], ["Brokenhill", "Abrasive", "Cacti", "Engraved with Equation"], ["Cabalzar", "Forgetful", "Birdsong", "Plants Grow From Head"], ["Cairngorm", "Aloof", "Lizard Eggs", "Deep Crack in Face"], ["Chalcedony", "Mellow", "Fingernails", "Covered in Moss"], ["Diaspor", "Sentimental", "Shoes", "Covered in Dead Vines"], ["Ephesi", "Amoral", "Wasps", "Hollow Chest"], ["Heliotrope", "Impulsive", "Land Snails", "Hollow Head"], ["Idrial", "Negative", "Tarantulas", "Eyes Glow in Dark"], ["Indium", "Rigid", "Jackals", "Hand Missing"], ["Jaros", "Patient", "Pottery", "Face Eroded Away"], ["Khatyr", "Decisive", "Dance", "Leaking Dust"], ["Meerschaum", "Gracious", "Lunar Cycles", "You Are Translucent"], ["Okenit", "Assertive", "The Sun", "Chest Filled With Fluid"], ["Qusong", "Unhurried", "Tides", "Hole Blasted in Flesh"], ["Schori", "Vengeful", "Wind", "Second Face on Torso"], ["Ulrich", "Graceless", "Rain", "Mirrored Flesh"], ["Ziest", "Stern", "Silence", "Face Rotates"]
    ] },
    special_rules: ["Crystalline Flesh: You are living crystal. Your base AV is 10 + your Level (maximum 20). You do not need to eat or drink. You do not take damage from fire, cold, poison, radiation, electricity, fungal spores, or suffocation. You suffer double damage from bludgeoning attacks.","Inevitable: During character generation, roll 10d8. This number is your starting and maximum HP. You cannot heal HP through any means, and do not add to your maximum HP when you gain a Level. When your HP reaches zero, you crumble into iridescent dust, leaving behind a pebble-sized lithling seed."],
    hp_override: true,
    equip_note: "No food or water rations.",
    // Inevitable's "cannot heal lost HP through any means", carried as the
    // rule NAME so a refusal can say what refused. chargen-app copies it onto
    // the actor; nothing derives it from the ancestry string at runtime.
    no_heal_rule: "Inevitable"
  }
};

// `hands` (work-queue.txt item 11, 2026-08-25): the book never states which
// base weapons are two-handed — a genuine per-weapon ruling (Matt), not
// derivable from slot weight (Sword/Mace/Rapier are 2-slot but
// conventionally one-handed; Spear/Quarterstaff are also 2-slot but
// clearly two-handed). See work-queue.txt item 11's Decisions for the
// full table this was transcribed from.
//
// `base_tags` SLASHING / BLUDGEONING / STABBING are the same kind of ruling:
// the book gives no damage-kind column, so which weapon is which was decided
// here, weapon by weapon. Slashing and Bludgeoning were assigned when the
// damage-interaction table was first written; STABBING followed 2026-09-22
// (Matt), once Planeyfolk's Flat needed the other half of "double damage
// from slashing or piercing". Dagger, Rapier, Spear, Crossbow and Longbow
// take it - the melee weapons whose point is the point, and the two missile
// weapons that fire a shaft.
//
// FIREARMS ARE UNTAGGED and that is the decision, not an oversight. A bullet
// arguably pierces, but tagging eleven guns would double most ranged damage
// against Planeyfolk and floor it against the Synth Skeleton - a sweeping
// change to the bestiary made on a word the book never applies to guns.
// Slashing skipped everything ambiguous the same way.
//
// THE HALBERD IS UNTAGGED TOO, and it is the one weapon that wanted both.
// RULED 2026-09-22 (Matt): two tags always on is the wrong model - it would
// be strictly good against anything weak to either kind and give the player
// no way to choose the other mode against something strong against one. A
// weapon with two damage modes needs a toggle between them, and no such
// toggle exists, so the Halberd stays plain kinetic rather than getting a
// wrong version of the rule.
export const MELEE_WEAPONS = [
  { name: "Dagger", damage: "d6", slots: 1, hands: 1, base_tags: ["Stabbing"] }, { name: "Flail", damage: "d6", slots: 1, hands: 1, base_tags: ["Bludgeoning"] }, { name: "Whip", damage: "d6", slots: 1, hands: 1 }, { name: "Axe", damage: "d6", slots: 1, hands: 1, base_tags: ["Slashing"] }, { name: "Club", damage: "d6", slots: 1, hands: 1, base_tags: ["Bludgeoning"] }, { name: "Fleshripper", damage: "d6", slots: 1, hands: 1, base_tags: ["Slashing"] }, { name: "Shock Baton", damage: "d6", slots: 1, hands: 1, base_tags: ["Electrical"] }, { name: "Razordisk", damage: "d6", slots: 1, hands: 1, base_tags: ["Slashing"] }, { name: "War Fan", damage: "d6", slots: 1, hands: 1, base_tags: ["Slashing"] }, { name: "Scythe", damage: "d8", slots: 2, hands: 2, base_tags: ["Slashing"] }, { name: "Sword", damage: "d8", slots: 2, hands: 1, base_tags: ["Slashing"] }, { name: "Mace", damage: "d8", slots: 2, hands: 1, base_tags: ["Bludgeoning"] }, { name: "Rapier", damage: "d8", slots: 2, hands: 1, base_tags: ["Stabbing"] }, { name: "Spear", damage: "d8", slots: 2, hands: 2, base_tags: ["Stabbing"] }, { name: "Quarterstaff", damage: "d8", slots: 2, hands: 2, base_tags: ["Bludgeoning"] }, { name: "War Hammer", damage: "d8", slots: 2, hands: 2, base_tags: ["Bludgeoning"] }, { name: "Great Mace", damage: "d10", slots: 3, hands: 2, base_tags: ["Bludgeoning"] }, { name: "Great Axe", damage: "d10", slots: 3, hands: 2, base_tags: ["Slashing"] }, { name: "Halberd", damage: "d10", slots: 3, hands: 2 }, { name: "Great Sword", damage: "d10", slots: 3, hands: 2, base_tags: ["Slashing"] }
];

export const RANGED_WEAPONS = [
  { name: "Sling", damage: "d4", slots: 1, hands: 1, ammo_die: "Ud20", base_tags: ["Bludgeoning"] }, { name: "Revolver", damage: "d6", slots: 1, hands: 1, ammo_die: "Ud10" }, { name: "Pistol", damage: "d6", slots: 1, hands: 1, ammo_die: "Ud10" }, { name: "Musket", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud8" }, { name: "Shotgun", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud8" }, { name: "Crossbow", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud8", base_tags: ["Stabbing"] }, { name: "Longbow", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud10", base_tags: ["Stabbing"] }, { name: "Rifle", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud10" }, { name: "Laser Pistol", damage: "d6", slots: 1, hands: 1, ammo_die: "Ud12", base_tags: ["Beam"] }, { name: "Hand Cannon", damage: "d8", slots: 2, hands: 1, ammo_die: "Ud8" }, { name: "Shock Bow", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud8", base_tags: ["Electrical"] }, { name: "Auto-Rifle", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud8" }, { name: "Scattergun", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud10" }, { name: "Laser Rifle", damage: "d8", slots: 2, hands: 2, ammo_die: "Ud12", base_tags: ["Beam"] }, { name: "Concussion Rifle", damage: "d10", slots: 3, hands: 2, ammo_die: "Ud8", base_tags: ["Concussive"] }, { name: "Spore Thrower", damage: "d10", slots: 3, hands: 2, ammo_die: "Ud8", base_tags: ["Blast", "Fungal"] }, { name: "Grenade Launcher", damage: "d10", slots: 3, hands: 2, ammo_die: "Ud6", base_tags: ["Blast"] }, { name: "Laser Cannon", damage: "d10", slots: 3, hands: 2, ammo_die: "Ud6", base_tags: ["Beam"] }, { name: "Port-A-Cannon", damage: "d12", slots: 5, hands: 2, ammo_die: "Ud4", base_tags: ["Blast"] }, { name: "Railgun", damage: "d12", slots: 6, hands: 2, ammo_die: "Ud6" }
];

export const BASIC_TAGS = [
  { name: "Ancient", effect: "Half base trade value" }, { name: "Bejewelled", effect: "Triple base trade value" }, { name: "Blasphemous", effect: "Cursed by a religious leader. DIS on reaction rolls when encountering followers of said religion." }, { name: "Bone", effect: "Double trade value with Cacklemaw and Ghouls" }, { name: "Corroded", effect: "Half base trade value" }, { name: "Crystalline", effect: "If a natural 1 is rolled, the weapon shatters beyond repair. Double base trade value." }, { name: "Delicate", effect: "Half base slot weight, minimum one slot. Breaks on a to-hit roll of 1–2." }, { name: "Elegant", effect: "Half base slot weight, minimum one slot." }, { name: "Fungal", effect: "Regains an Ammo die step when fed organic matter. Deals no damage to fungal creatures." }, { name: "Gilded", effect: "Double base trade value" }, { name: "Laquered", effect: "Double base trade value. Cannot rust or be corroded." }, { name: "Luminous", effect: "Can be used as a light source. Double base trade value." }, { name: "Nomad's", effect: "Made by Faa Nomads. Double trade value with Faa Nomads." }, { name: "Ornate", effect: "Double base trade value" }, { name: "Polychrome", effect: "Double base trade value" }, { name: "Quicksilver", effect: "Half base slot weight, minimum one slot." }, { name: "Ritual", effect: "Used in an occult ritual. Double trade value with Mystics." }, { name: "Sacred", effect: "Blessed by a religious leader. ADV on reaction rolls when encountering followers of said religion." }, { name: "Shoddy", effect: "Damage die one step smaller (minimum d4)" }, { name: "Translucent", effect: "Double base trade value" }
];

export const ADVANCED_TAGS = [
  { name: "Agonising", effect: "Biological targets must Morale save or flee the wielder. PCs damaged must EGO save or move away from the user.", save: [{ ability: "ego", mode: "resist", vs: "moving away from the wielder", actorTypes: ["character"] }, { ability: "morale", mode: "resist", vs: "fleeing the wielder", targets: ["biological"], actorTypes: ["npc"] }] }, { name: "Anti-Paradoxical", effect: "Designed to combat extra-dimensional beings. Double damage to outsider creatures." }, { name: "Blasting", effect: "Can hit multiple targets in the same area. Roll to-hit once and compare to the AV score of all targets." }, { name: "Blinding", effect: "Targets DEX Save vs a round of blindness" , declaredSpan: null, save: [{ ability: "dex", mode: "resist", vs: "a round of blindness" }] }, { name: "Concussive", effect: "Targets STR save or are moved away from their location.", save: [{ ability: "str", mode: "resist", vs: "being moved away from their location" }] }, { name: "Corrosive", effect: "Degrades AV. On hit, either deals damage or reduces target's AV score by one (attacker's choice)." }, { name: "Electrical", effect: "Double damage to Synthetic creatures, targets wearing metal armour, and targets submerged in water." }, { name: "Entangling", effect: "Targets DEX Save or become Entangled", save: [{ ability: "dex", mode: "resist", vs: "becoming Entangled" }] }, { name: "Eroding", effect: "Double damage to Mineral-type creatures, vehicles, and static structures" }, { name: "Flaming", effect: "Ignites flammable objects. Cannot be used underwater or against submerged opponents." }, { name: "Freezing", effect: "Targets suffer d4 DEX damage in addition to base damage. At 0 DEX, they are frozen solid and cannot move.", abilityDamage: { ability: "dex", dice: "1d4" } }, { name: "Heavy", effect: "Extra die of damage, double slot weight, minimum STR +3 to use" }, { name: "Hypergeometric", effect: "Exists partially outside of Euclidean space. Deals doubled damage to Hypergeometric creatures." }, { name: "Mauling", effect: "Extra die of damage against targets with AV 13 or lower. Deals halved damage to opponents with AV 16 or higher." }, { name: "Parasitic", effect: "The weapon is alive and cannot be unequipped without surgery. The user must consume double rations each day. It does not need to reload." }, { name: "Piercing", effect: "Extra die of damage against targets with AV 16 or higher. Deals halved damage to opponents with AV 13 or lower." }, { name: "Psyche-Suppressant", effect: "Double damage to Psychic creatures. Cannot use Mystic Gifts while holding." }, { name: "Strong", effect: "Extra die of damage. If the weapon would break, it does not." }, { name: "Unstable", effect: "If user rolls a 1, the weapon explodes and deals 2d6 damage to the wielder." }, { name: "Vampiric", effect: "When damaging biological creatures, wielder regains HP equal to half damage inflicted." }
];

export const EXOTIC_TAGS = [
  { name: "Aegis-Bearing", effect: "Projects a personal warding field. Grants +5 AV while held." }, { name: "Annihilating", effect: "Target must CON save or crumble to dust. Wielder loses 1 max HP each time this weapon is drawn.", save: [{ ability: "con", mode: "resist", vs: "crumbling to dust", onFail: { death: true } }] }, { name: "Autarch's", effect: "Once belonged to an ancient Autarch. Of highest quality. Gains 3 additional damage dice." }, { name: "Blood-Rapturous", effect: "When a Biological creature is killed with this weapon, the user heals for the victim's maximum HP." }, { name: "Colossal", effect: "Deals triple base damage, has triple base slot weight. Minimum STR +6 to use." }, { name: "Extra-Dimensional", effect: "The weapon was forged in another dimension. It has Hypergeometric and Anti-Paradoxical tags and five times base trade value." }, { name: "Hard Light", effect: "Made from hard light projected from a wrist-mounted prism. Has a slot weight of 0." }, { name: "Heat-Seeking", effect: "Always hits when targeting warm-blooded creatures." }, { name: "Indestructible", effect: "Cannot be broken or destroyed by any means, natural or supernatural." }, { name: "Lithifying", effect: "Targets take d8 DEX damage and gain +1 AV. At 0 DEX they turn to stone.", abilityDamage: { ability: "dex", dice: "1d8" } }, { name: "Nano-edged", effect: "Weapon gains 2 additional damage dice." }, { name: "Necrotic", effect: "Biological targets suffer d8 STR damage alongside base damage.", abilityDamage: { ability: "str", dice: "1d8", targets: ["biological"] } }, { name: "Neurotoxic", effect: "Biological targets CON Save vs instant death.", save: [{ ability: "con", mode: "resist", vs: "instant death", targets: ["biological"], onFail: { death: true } }] }, { name: "Polymorphic", effect: "Can swap between two forms at will. Choose an alternate base melee type or base ranged type." }, { name: "Reflecting", effect: "Missed attacks against the wielder damage the attacker instead." }, { name: "Psionic", effect: "Operated using psychic power. To-hit rolls made with PSY. EGO added to damage." }, { name: "Rocket Boosted", effect: "Contains a small rocket-pack. +d12 damage when charging into melee range. Can be used to gain altitude." }, { name: "Stim-Boosting", effect: "Boosts the wielder's reaction times. Make one extra combat action per round." }, { name: "Ultra-Corrosive", effect: "Reduces AV by -2 on a hit. Targets take d8 CON damage alongside base damage.", abilityDamage: { ability: "con", dice: "1d8" } }, { name: "Vibroactive", effect: "The weapon or its projectiles vibrate at a frequency inimical to solid-state armour. Hits as though target was unarmoured." }
];

// ARMOUR_QUALITIES - the Quality column read on its own. JADE IBIS p.34 step 3
// rolls "d20 for the armour's quality (a purely descriptive tag) and d20 for
// the armour's type": two independent rolls. The table prints each quality on
// the row of the same number, which is why they live on ARMOUR_TABLE's rows,
// and reading them from the TYPE's row married them to it - a Fungal armour
// could only be a Cuirass. Fixed 2026-09-27 (Matt: "fix the armour quality bug
// as part of this build"). Array position is the roll (index 0 = roll 1).
export const ARMOUR_TABLE = [
  { min: 1, max: 2, qualities: ["Shabby", "Decadent"], type: "Desert Robes", av: 11, slots: 1, special: null },
  // `toxSaveAdv` is the machine-readable half of `special`. The sentence is
  // what the player reads; the flag is what toxin-die.js's resolver tests,
  // because the special text reaches the finished Item only as description
  // prose and string-matching that is the fragile-grep failure this project
  // keeps re-learning. Radiation needs nothing of its own — Toxins.md's
  // opening sentence already makes radiation a Toxin Die source.
  { min: 3, max: 4, qualities: ["Ancestral", "Quicksilver"], type: "Hazard Wrap", av: 12, slots: 3, special: "ADV on saves vs Radiation and Toxins", toxSaveAdv: true },
  { min: 5, max: 7, qualities: ["Nano-weave", "Spiny", "Dazzling"], type: "War-Shirt", av: 12, slots: 2, special: null },
  { min: 8, max: 12, qualities: ["Tarnished", "Indigo", "Golden", "Symbiotic", "Biomechanical"], type: "Brigandine", av: 13, slots: 3, special: null },
  { min: 13, max: 15, qualities: ["Occult", "Fungal", "Translucent"], type: "Cuirass", av: 14, slots: 4, special: null },
  { min: 16, max: 18, qualities: ["Gaudy", "Sacred", "Iridescent"], type: "Chain Mail", av: 15, slots: 5, special: null },
  { min: 19, max: 20, qualities: ["Crystalline", "Ornate"], type: "Plate Armour", av: 16, slots: 6, special: "DIS on Saves when swimming or climbing" }
];
export const ARMOUR_QUALITIES = ARMOUR_TABLE.flatMap(e => e.qualities);

// Character Creation/Armour - Starting.md's "Helm & Shield" table (work-
// queue.txt item 6) — an *alternative* to ARMOUR_TABLE's Quality & Type
// roll, not a stat block: roll d20 once on each column independently.
// Every row grants +1 AV. Array position is the roll (index 0 = roll 1).
//
// CORRECTED 2026-09-15 against the PRINTED page (JADE IBIS p.34, screenshot
// from Matt), which is the only thing that could settle it. These two tables
// previously held `null` at rolls 1-5 on both columns, with a comment reading
// `null = "None"`. There is no None band: all twenty rows are populated. The
// nulls came from CRIMSON HOUND's text extract, where a merged cell flattens
// to a single "None None" line followed by bare numbers 2-5 - which reads
// exactly like a None band and cannot be told apart from one in the text.
//
// Three further corrections from the same page: the shield at roll 6 was
// holding "Wooden Shield", which is roll 1's; roll 19 was holding "Sickly
// Moon Shield", which is not an entry at all (the real "Sickle-Moon Shield"
// is roll 3, and roll 19 is "Crystalline Shield"); and "Temple-forged" is
// cased "Temple-Forged".
//
// NO DIFFERENTIAL COULD HAVE FOUND THIS. diff-editions.mjs and
// table-drift.mjs both compare one edition against another, and these rows
// were wrong in every edition. tools/roll-mapping-check.mjs compares the
// edition against this roster instead, which is what surfaced them.
export const HELM_TABLE = ["Plumed Helm", "Menacing Helm", "Brazen Helm", "Glowing Helm", "Lizardskin Helm", "Spiny Helm", "Dazzling Helm", "Ridiculous Helm", "Decadent Helm", "Golden Helm", "Bone Helm", "Biomechanical Helm", "Occult Helm", "Fungal Helm", "Translucent Helm", "Gaudy Helm", "Sacred Helm", "Iridescent Helm", "Crystalline Helm", "Ornate Helm"];
export const SHIELD_TABLE = ["Wooden Shield", "Serpentskin Shield", "Sickle-Moon Shield", "Full Moon Shield", "Hueless Shield", "Daemonface Shield", "Plastiglass Shield", "Nomad's Shield", "Painted Shield", "Apeskin Shield", "Bone Shield", "Starburst Shield", "Gladiator's Shield", "Fungal Shield", "Polychrome Shield", "Ceramic Shield", "Holy Fool's Shield", "Temple-Forged Shield", "Crystalline Shield", "Sun Flambeaux Shield"];

export const GEAR_A = ["Flashbang (×5)", "Magnetic Boots", "Grappling Hook & Rope", "Flare (×5)", "Smoke Bomb (×5)", "Flask of Oil", "Portable Stove", "Caltrops (×5)", "Vial of Acid (×3)", "Animal Trap (×3)", "Handheld Drill", "Chain & Manacles", "Hand Mirror", "Motion Sensor", "Crowbar", "EMP Grenade (×3)", "Tube of Glue (Ud8)", "Ball Bearings (Ud20)", "Musical Instrument", "Helmet (+1 AV)"];
export const GEAR_B_BASE = ["Sleeping Gas Bomb (×5)", "Oxygen Mask (Ud6)", "Cast Iron Skillet", "Black Clay (Ud8)", "Loaded Dice", "Raucous Whistle", "Luminous Paint (Ud8)", "Drug (generated below)", "Vial of Poison", "Autoglot Translator Unit", "Lock Picks", "Mortar & Pestle", "Skin of Wine", "Hourglass", "Hammer & Chisel", "Antitoxin (×3)", "Welding Torch (Ud8)", "Infravision Goggles (Ud8)", "Fungicide Bomb (×3)", "Shield (+1 AV)"];
// Index into GEAR_B_BASE that means "roll a Drug instead" (0-based, matches the tool's d(20)-1 draw).
export const GEAR_B_DRUG_INDEX = 7;
// Face Armour Slot, RULED 2026-09-27 (Matt): gear worn on the face is an
// armour Item in the face slot, apart from the helm - one at a time, and no
// AV of its own. Names as gearItemData leaves them, suffixes stripped.
export const FACE_GEAR = ["Oxygen Mask", "Infravision Goggles"];

export const DRUG_HUES = ["Red", "Blue", "Yellow", "White", "Black", "Pink", "Orange", "Viridian", "Olive", "Silver", "Gold", "Bronze", "Umber", "Steel", "Smoke", "Indigo", "Azure", "Violet", "Octarine", "Ulfire"];
export const DRUG_FORMS = ["Sugar", "Leaf", "Crystal", "Cactus", "Fungus", "Brain", "Pearl", "Slime", "Meat", "Honey", "Insect", "Liquid", "Stone", "Glyph", "Biotech", "Sand", "Root", "Blood", "Clay", "Tooth"];
export const DRUG_INGESTED = ["Snorting", "Injecting", "Stewing", "Boiling in Tea", "Swallowing Whole", "Licking", "Brain Interface", "Holding on Tongue", "Smoking", "Touching to Eyes", "Absorbing into Skin", "Staring at It", "Burning and Watching the Flames", "Infusing into Honey", "Drinking in Urine", "Burning and Eating the Ash", "Baking in Bread", "Placing in Ear", "Rubbed onto Gums", "Smelling"];
export const DRUG_EFFECTS = ["Euphoria", "Paranoia", "Auditory Hallucinations", "Visual Hallucinations", "No Pain", "Fearless", "Ego Death", "Levitation", "Anxious Sweats", "Itchy Eyeballs", "Nasal Drip", "Split Personality", "Nausea", "Behold Azathoth", "Supernatural Hearing", "Paralysed", "Murderous Rage", "Compulsive Dancing", "Very Mellow", "Heightened Empathy"];

export const CRUCIBLE_QUALITIES = ["Ultraviolet", "Engraved", "Flexglass", "Crystalline", "Ceramic", "Polychrome", "Quicksilver", "Spiny", "Transparent", "Bejewelled", "Stone", "Plasteel", "Flowstone", "Luminous", "Golden", "Bronze", "Sky-Iron", "Azure", "Magnetised", "Lurid"];
export const CRUCIBLE_SHAPES = ["Cauldron", "Pot", "Skull", "Urn", "Vase", "Sphere", "Pyramid", "Helm", "Gourd", "Kettle", "Bottle", "Amphora", "Flagon", "Jug", "Teapot", "Chalice", "Barrel", "Cube", "Thermos", "Eyeball"];
// `component` (the alchemical ingredient a brewer needs to make each elixir)
// added 2026-08-21 — found while scoping work-queue.txt item 1 Phase 2 that
// Core Rules/Elixirs - Example.md is a REAL book table (all 20 names/potencies/
// effects match this array exactly), correcting an earlier work-queue.txt claim
// that ELIXIRS had "no book table to check against". name/potency/effect were
// already right; only the Component column was missing.
export const ELIXIRS = [
  { roll: [1, 3], name: "Babel Beer", potency: 1, component: "Sapient creature's tongue", effect: "Allows drinker to fleetingly understand and speak languages known by the tongue's former owner. However, they do so in an intoxicated, slurring manner.", drinkAsText: true },
  { roll: [4, 6], name: "Lumensoup", potency: 1, component: "Fur of a Lambent Lynx", effect: "Drinker's flesh glows. They can be used as a light source underground but cannot hide. Lasts 8 Exploration Turns.", stateful: { light: { tier: "source" } } , declaredSpan: { amount: "8", unit: "turn" } },
  { roll: [7, 9], name: "Oblivion Brew", potency: 1, component: "Memory Eater's stomach", effect: "Drinker forgets the last hour.", drinkAsText: true },
  { roll: [10, 12], name: "Glassflesh Paste", potency: 1, component: "Glass Tiger's skin", effect: "Apply to flesh to become transparent for 4 Exploration Turns. You take minimum damage from beam weapons.", stateful: { conditions: ["minDamageFromBeam"] } , declaredSpan: { amount: "4", unit: "turn" } },
  { roll: [13, 15], name: "Fellowship Potion", potency: 1, component: "Psy-Owl's brain", effect: "Drinker believes all nearby creatures are their friends. This belief lasts for a day or until they are forced to re-examine." , declaredSpan: { amount: "1", unit: "day" } },
  { roll: [16, 18], name: "Greentongue Potion", potency: 1, component: "Neobloom's voxpod", effect: "Drinker understands and speaks the slow tongue of plants. 1 Exploration Turn per question. This effect lasts for a day." , declaredSpan: { amount: "1", unit: "day" } },
  { roll: [19, 21], name: "False Death Draught", potency: 1, component: "Amaranthine Death-Worm's fangs", effect: "Drinker falls into a deathly paralysis. To all but advanced bioscanners, they appear dead. Lasts 6 Exploration Turns." , declaredSpan: { amount: "6", unit: "turn" } },
  { roll: [22, 24], name: "Windsong Potion", potency: 1, component: "Windweird's larynx", effect: "Drinker can sing to quiet or raise the winds and may change the local weather at will. Lasts 6 Exploration Turns." , declaredSpan: { amount: "6", unit: "turn" }, grants: { name: "Windsong", use: "weather" } },
  { roll: [25, 27], name: "Doppeldraught", potency: 2, component: "Flesh of a Dopplegeller", effect: "Drinker vomits a jelly-clone of themself. It is translucent, mute, and follows orders. Dissolves in 4 Exploration Turns." , declaredSpan: { amount: "4", unit: "turn" }, clone: { suffix: "Clone", dissolves: true } },
  { roll: [28, 30], name: "Spineskin Syrup", potency: 2, component: "Quills of a Quill-Spider", effect: "Drinker explosively grows quills, gaining +2 AV and destroying their clothing. Missed melee attacks against them deal d4 damage. Quills shed after 4 Exploration Turns.", stateful: { av: 2 } , declaredSpan: { amount: "4", unit: "turn" }, retaliation: { dice: "1d4", on: "miss" } },
  { roll: [31, 33], name: "Hilarious Strength", potency: 2, component: "Tooth of a Harlequin Serpent", effect: "Drinker gains +5 STR, loses -5 EGO, and laughs endlessly, giving DIS on encounter rolls. Lasts 4 Exploration Turns.", stateful: { abilities: { str: 5, ego: -5 } } , declaredSpan: { amount: "4", unit: "turn" }, encounterDis: "laughing endlessly" },
  { roll: [34, 36], name: "Squishflesh Balm", potency: 2, component: "Squishwolf's skin", effect: "Drinker becomes jellylike and flexible. DIS on physical Saves, but can fit through narrow gaps and is immune to crushing or fall damage. Lasts 4 Exploration Turns.", stateful: { conditions: ["disPhysicalSaves", "immuneCrushing"] } , declaredSpan: { amount: "4", unit: "turn" } },
  { roll: [37, 39], name: "Metallovore Potion", potency: 2, component: "Yurling's stomach", effect: "Drinker can eat and digest metal, which acts as a food ration. Effect lasts 6 Exploration Turns." , declaredSpan: { amount: "6", unit: "turn" }, rationAlso: { food: ["Scrap Metal"] } },
  { roll: [40, 42], name: "Plating Potion", potency: 2, component: "Plated Beetle's carapace", effect: "Drinker gains +5 AV for 6 Exploration Turns.", stateful: { av: 5 } , declaredSpan: { amount: "6", unit: "turn" } },
  { roll: [43, 44], name: "Glittercough Tonic", potency: 2, component: "Unicorn meat", effect: "Drinker can excrete a cloud of glitter, forcing targets to DEX Save vs Blindness for 4 rounds." , declaredSpan: null, save: { ability: "dex", mode: "resist", vs: "Blindness for 4 rounds" }, applies: { condition: "blind", amount: "4", unit: "round" }, grants: { name: "Glitter Cloud", use: "compel", singleUse: true } },
  { roll: [45, 46], name: "Growth Serum", potency: 2, component: "Pseudo-Giant's pituitary gland", effect: "Drinker grows to twice their size, doubling their HP, STR, and CON. Lasts 4 Exploration Turns.", stateful: { double: ["maxHp", "str", "con"] } , declaredSpan: { amount: "4", unit: "turn" } },
  { roll: [47, 50], name: "Magnetic Stew", potency: 3, component: "Magneticrab's shell", effect: "Drinker becomes highly magnetic and can irresistibly draw metal towards themselves. Lasts 4 Exploration Turns." , declaredSpan: { amount: "4", unit: "turn" }, grants: { name: "Magnetic Draw", use: "metalPull" } },
  { roll: [51, 53], name: "Death Draught", potency: 3, component: "Amaranthine Death-Worm's fangs", effect: "Drinker is immediately reduced to 0 HP.", setsHP: 0 },
  { roll: [54, 56], name: "Puppeteer Potion", potency: 3, component: "Nerve-Crawler's core", effect: "Drinker extrudes parasitic neural tissue, bonding them to another living creature. Target must EGO Save or become their puppet. Effect lasts 4 Exploration Turns." , declaredSpan: null, save: { ability: "ego", mode: "resist", vs: "becoming the drinker's puppet" }, applies: { effect: "Neural Puppetry", text: "The drinker's puppet.", amount: "4", unit: "turn", viaSave: true }, grants: { name: "Neural Puppetry", use: "compel", span: { amount: "4", unit: "turn" } } },
  { roll: [57, 59], name: "Fakeface Paste", potency: 3, component: "Face of a Face Dancer", effect: "Apply to one's own face to attain the art of Face Dancing. Your face can take the form of any you have observed. The face remains convincing for one day." , declaredSpan: { amount: "1", unit: "day" } },
  { roll: [60, 61], name: "Skulk Salve", potency: 3, component: "Synthskin of a Subtle Stalker", effect: "Apply to flesh or objects to make them invisible to all spectrums of light for the next 4 Exploration Turns." , declaredSpan: { amount: "4", unit: "turn" } },
  { roll: [62, 63], name: "Berserker Brew", potency: 3, component: "Cacklemaw's liver", effect: "Drinker enters a battle frenzy. They deal and receive double damage and must always attack the closest living being. They must EGO Save to exit this frenzy.", grants: { name: "Exit the Frenzy", use: "endFrenzy" } },
  { roll: [64, 65], name: "Phasing Potion", potency: 3, component: "Phase Panther's heart", effect: "Drinker phases out of reality, becoming incorporeal and invincible. Lasts 4 Exploration Turns.", stateful: { conditions: ["incorporeal"] } , declaredSpan: { amount: "4", unit: "turn" } },
  { roll: [66, 67], name: "Lithification Syrup", potency: 3, component: "Lithling's crystalline flesh", effect: "Drinker's flesh turns to living crystal. They gain +5 AV and the mineral creature type, including all damage immunities. The effect lasts 6 Exploration Turns.", stateful: { av: 5, creatureTypes: ["mineral"] } , declaredSpan: { amount: "6", unit: "turn" } },
  { roll: [68, 69], name: "Geneshock Tonic", potency: 4, component: "Heart of a Cacogen", effect: "Drinker gains a new, permanent mutation, matching that of the heart's original owner.", grantsPick: { roster: "mutation" } },
  { roll: [70, 71], name: "Regeneration Serum", potency: 4, component: "Flesh of a Regenerator", effect: "Drinker regains d6 HP per combat round, unless damaged by fire or acid. The effect lasts for 6 Exploration Turns.", stateful: { endsOnDamage: ["flame", "corrosive"] } , declaredSpan: { amount: "6", unit: "turn" }, hpTick: { to: "self", heal: true, dice: "1d6" } },
  { roll: [72, 73], name: "Obsession Philtre", potency: 4, component: "Fang of a Gorgon", effect: "Drinker falls madly in love with the next character they see. The effect lasts as long as they stay within sight.", drinkAsText: true },
  { roll: [74, 75], name: "Broodling Broth", potency: 4, component: "Egg sac of a Brood Mother", effect: "Drinker's stomach distends grotesquely. They birth d6 half-spider and half-host Broodlings [Lvl 0 (1 hp), AV 12, Bite (d4)]. Broodlings are loyal to and follow their 'mother' until killed.", spawns: { creature: "Broodling", dice: "1d6", loyal: true } },
  { roll: [76, 77], name: "Biothermal Amplifier Tonic", potency: 4, component: "Chemglands of a Thermasaur", effect: "Drinker gains two Mystic Gifts: Pyrokinesis and Cryokinesis. They are immune to damage caused by extreme heat or cold. These effects last for one day.", stateful: { conditions: ["immuneThermal"] } , declaredSpan: { amount: "1", unit: "day" }, grants: [{ kind: "gift", name: "Pyrokinesis" }, { kind: "gift", name: "Cryokinesis" }] },
  { roll: [78, 79], name: "Lazarus Tonic", potency: 4, component: "Black heart of a Lazarus Guard", effect: "A dead biological creature may be restored to life with this thick black tonic, at the cost of one Level.", drinkAsText: true },
  { roll: [80, 81], name: "Kalotoxin Injector", potency: 4, component: "Stinger of a Kalopede", effect: "Target is transformed into a work of Fine Art resembling their original body, with no Save possible.", drinkAsText: true },
  { roll: [82, 83], name: "Bifurcating Brew", potency: 4, component: "Head of a Jollyhoss", effect: "Drinker splits into two hypergeometric halves, each with half the character's max HP. They move and act independently. If one half dies, it resurrects with full HP as long as the other half lives. Lasts 4 Exploration Turns." , declaredSpan: { amount: "4", unit: "turn" } },
  { roll: [84, 85], name: "Hollowheart Hooch", potency: 5, component: "Heart of a Hollow Bride", effect: "Drinker permanently gains 2 new hypergeometric Item Slots, located inside their chest. This effect can increase slot capacity beyond the 20 slot maximum.", bakedItem: { name: "Hollowheart Chest Slots", slotBonus: 2 } },
  { roll: [86, 87], name: "Autarch's Ambrosia", potency: 5, component: "Preserved heart of an Autarch", effect: "Drinker permanently gains +1 to the Ability of their choice.", permanentAbility: { choose: 1 } },
  { roll: [88, 89], name: "Metamorphic Syrup", potency: 5, component: "Slurry of a Metamorphic Sludge", effect: "Drinker is permanently changed into a new, random creature. Generate their type using the monster generators on p.xx.", grantsRoll: { generator: "monster" } },
  { roll: [90, 91], name: "Cloning Jelly", potency: 5, component: "Flesh of an Echopraxist", effect: "Anything smeared with the gel is perfectly replicated. The copy is permanent and not under the control of the original." },
  { roll: [92, 93], name: "Transcendence Tonic", potency: 5, component: "Brain of a Mystic", effect: "Drinker gains a new, permanent Mystic Gift, matching that of the brain's original owner.", grantsPick: { roster: "gift" } },
  { roll: [94, 95], name: "Recursive Infusion", potency: 5, component: "Eye of a Fractalisk", effect: "Drinker gains a new, permanent Mystic Gift: Recursive Gaze. A target held within the Recursive Gaze must repeat their last action, with no Save allowed. Ends if PC's gaze is broken.", grantsFixed: { type: "gift", name: "Recursive Gaze", text: "A target held within the Recursive Gaze must repeat their last action, with no Save allowed. Ends if the PC's gaze is broken." } },
  { roll: [96, 98], name: "Planeyfication Potion", potency: 5, component: "Heart of a Planeyperson", effect: "Drinker permanently becomes a hypergeometric entity. They gain the hypergeometric type and follow the special rules given for the planeyfolk Ancestry.", permanentChange: { creatureTypes: ["hypergeometric"], flat: true, ancestryRules: "Planeyfolk", attuneExisting: true } },
  { roll: [99, 100], name: "Immortality Injector", potency: 5, component: "Mercurial war-flesh of a Quicksilver Exterminator", effect: "A creature injected with this fizzing froth of nanomachinery cannot die. It can be damaged beyond recognition, but the life will not leave its frame. This effect lasts for one day.", stateful: { conditions: ["cannotDie"] } , declaredSpan: { amount: "1", unit: "day" } },
];

// Work-queue item 10.2 (2026-08-25) added 3 mechanical fields, each
// reusing an existing mutation-data.js pattern rather than inventing a
// new one: `naturalWeapon` (Carbide Knucklebones — same shape as item
// 3.2's mutation naturalWeapon, auto-creates a 0-slot/0-hand weaponMelee
// Item at chargen), `avBonus` (Subdermal Ceramic Plating — same shape as
// item 3.3's mutation avBonus, looked up live by name in actor.js rather
// than stored on the Item), and a per-day `usesRemaining` pool (Trauma-
// Response Rig — same UI/icon shape as item 3.6's Ink Ducts, but a flat
// 1-per-day cap, not Level-scaled, since the implant's own text says
// "once per day" not "Level times per day"). The other 12 non-automated
// implants stay text-only for now — see work-queue.txt item 10.2.
//
// Work-queue item 10.4 (2026-08-25) added `damageBonusAbility`/
// `damageBonusWeaponType` (Hydraulic Biceps, Merciless Cybereyes) — a
// genuinely new hook, not a reuse of an item-3 pattern: adds the named
// ability's effective bonus to a matching weaponType's damage roll,
// looked up live in actor-sheet.js the same way avBonus is looked up
// live in actor.js. Item 4.4's Psionic weapon tag needs half of this
// same piece (EGO bonus added to damage) but ALSO substitutes the
// to-hit ability (PSY instead of STR/DEX), which this hook does not
// attempt — Psionic stays its own separate build.
export const IMPLANTS = [
  { name: "Air Current Microsensor", ability_slot: "PSY", effect: "You suffer no navigation or combat penalties from blindness or darkness." },
  { name: "Alluring Fakeface", ability_slot: "EGO", effect: "You are extraordinarily beautiful. EGO save to enthrall a Biological creature. They will never harm you." },
  { name: "Autoglot HeadBank", ability_slot: "INT", effect: "+2 to INT. You understand all languages.", stat_mod: { intellect: 2 } },
  { name: "Backup Heart", ability_slot: "CON", effect: "+2 to CON. +5 max HP.", stat_mod: { constitution: 2 }, hp_bonus: 5 },
  { name: "Carbide Knucklebones", ability_slot: "STR", effect: "Your bare fists deal 2d4 damage.", naturalWeapon: { name: "Carbide Fists", type: "melee", damage: "2d4" } },
  { name: "Cyberliver", ability_slot: "CON", effect: "ADV on Saves against TOX damage and poisons. You cannot get drunk." },
  { name: "Dazzleskin Filaments", ability_slot: "CON", effect: "You are immune to laser beams and energy weapons. DIS when hiding." },
  { name: "Dopamine Synthesizer", ability_slot: "EGO", effect: "+2 to EGO. You are immune to fear, panic, and embarrassment.", stat_mod: { ego: 2 } },
  { name: "Dorsal Jump-pack", ability_slot: "DEX", effect: "You have hover-jets mounted on your back. You fly slowly and loudly." },
  { name: "Ferrosteel Exo-Skeleton", ability_slot: "STR", effect: "Add +2 to AV and STR. Subtract −4 DEX. You cannot swim.", stat_mod: { strength: 2, dexterity: -4 }, avBonus: 2 },
  { name: "Finger Syringe", ability_slot: "DEX", effect: "One finger is a hidden injector. You can load it with any elixir or poison." },
  { name: "Hydraulic Biceps", ability_slot: "STR", effect: "Add STR bonus to melee weapon damage", damageBonusAbility: "str", damageBonusWeaponType: "melee" },
  { name: "Hyper-elastic Tendons", ability_slot: "DEX", effect: "+2 to DEX. You can jump across huge distances like a frog.", stat_mod: { dexterity: 2 } },
  { name: "Merciless Cybereyes", ability_slot: "DEX", effect: "Add DEX bonus to ranged weapon damage", damageBonusAbility: "dex", damageBonusWeaponType: "ranged" },
  { name: "Mercurial Fakeface", ability_slot: "EGO", effect: "You can alter your face's features and colour at will." },
  { name: "Subdermal Ceramic Plating", ability_slot: "CON", effect: "+2 to base AV. Cannot be removed.", avBonus: 2 },
  { name: "Subdermal Insulation", ability_slot: "CON", effect: "Immunity to damage from flames, cold, and electricity. Cannot be removed." },
  { name: "Tactical Bioscanner", ability_slot: "PSY", effect: "You know the Level, AV, and current HP of any Biological or Fungal creature." },
  { name: "Tactical Technoscanner", ability_slot: "INT", effect: "You know the Level, AV, and current HP of any Synthetic creature." },
  { name: "Trauma-Response Rig", ability_slot: "CON", effect: "Negate the effects of a Wound. Can be activated once per day." }
];

export const EXOTICA = [
  { name: "A Fool's Head", description: "The severed head of a synthetic jester. Not in great condition but can still remember some jokes." },
  { name: "Agoniser", description: "A barbaric relic. Silver needle that causes unbearable pain to biological creatures without leaving a mark." },
  { name: "All-Purpose Idol", description: "Imbued with powerful neuro-active programming. Observers always believe the idol represents the deity they worship." },
  { name: "Black Heart", description: "Repulsive twitching cyborg organ. Will slowly and painfully revive a single dead body." },
  { name: "Blasphemies of the Binary Demon", description: "A tablet engraved with a series of quantum-logical propositions. Poses little threat to biological life but can be deadly to synthetics." },
  { name: "Chameleon Cloak", description: "Perfectly matches the colour of its surroundings" },
  { name: "Desiccated Mycomorph", description: "Tiny dried-out fungus-man. A drop of blood will revive him." },
  { name: "Dried Crypt Lotus", description: "Grim flower that sprouts from the forehead of corpses. Sometimes kept as a keepsake of a lost companion." },
  { name: "Flesh of the Honeyed Lamb", description: "Stolen from the Cult of the Honeyed Lamb; ancient meat imbued with a powerful medicinal psychedelic" },
  { name: "Midas Bomb", description: "Transforms organic matter into gold" },
  { name: "Mirror Ring", description: "Projects a hologram copy of the wearer that mimics their actions" },
  { name: "Nightmare Box", description: "Small cube of unbreakable, dark-tinted glass. Has one small peephole. Those that look inside are paralysed by horror." },
  { name: "Pale Blade of Amun-Oh", description: "Priests of Amun-Oh pledge never to take a life; their white knives will cut through anything except living flesh" },
  { name: "Sandworm Horn", description: "Blow outdoors to summon a sandworm, if you are bold enough" },
  { name: "Singing Crystal", description: "When struck, sings loudly and beautifully for up to an hour" , declaredSpan: null },
  { name: "Sky-seeking Salve", description: "Reverses the effect of gravity on the object it coats. Take care when outdoors." },
  { name: "Ulfire Candle", description: "Ulfire is the ninth colour. Its light shines through solid objects. It is blocked only by lead." },
  { name: "Unbearable Wax", description: "Black wax that increases in weight one hundred times as it dries. Single dose." },
  { name: "Vial of ICE-9", description: "One dose of an alchemical substance that transforms all water it touches into un-meltable ice" },
  { name: "Visualiser Helm", description: "Golden bubble-helmet that projects imagery of the wearer's thoughts, whether they want it to or not", armorType: { armorSlot: "helm" } }
];

// Flavor-text-only appearances for a rolled Codex — the equation itself comes
// from codex-data.js's EQUATIONS, the same table _onCodexRead uses.
export const CODEX_APPEARANCES = [
  "A goblet so black it drinks in light, the inner rim of which is inlaid with spiralling equations.",
  "The dried skin of a toad, tattooed with hypergeometric proofs",
  "A book cast from iron, the pages of which must be turned with a mechanical crank.",
  "A tablet carved from pale lunar stone, which feels as light as a feather.",
  "A tall hat scaled with coins, the inverse sides of which are carved with hypergeometric sigils.",
  "A lump of pink crystal, veined with hypergeometric glyphs when one holds it up to the light.",
  "The foot-long fang of a gigantic Ur-Snake, carved with frantic equations",
  "A broken mirror, which displays the equation as though written upon the observer's reflected face.",
  "A lump of amber; the contorted shapes of insects trapped within spell out the equation's proofs.",
  "A ring set with polychrome gemstones; the equation is printed on the inner curve, hiding it while worn.",
  "A child's drawing tablet, the equation scribbled in chalk amongst naive doodles.",
  "An ancient set of binoculars; when raised to the eyes all one can see is the hypergeometric proof, written across the sky in mile-high letters of divine fire.",
  "A black book of a thumbnail yet heavy as sin; the pages must be turned with tweezers.",
  "A human heart, blue with putrescence yet still beating; the equation is written upon the muscle with luminous ink.",
  "A chrome skull, its brain cavity filled with scraps of burned paper on which the equation is repeated endlessly.",
  "A broken sword, the blade molten and warped into the shape of hypergeometric proofs.",
  "An ordinary looking wine-jar, sealed with a stopper made from black wax. Remove the stopper and a voice whispers from within the jar, endlessly repeating the equation.",
  "A dining plate, painted with innumerable dancing blue and red figures; stare at the plate with an empty mind and an equation begins to emerge from the whirl of colour.",
  "An ornate lady's fan, on which the equation is painted in the flowery court script of the Fallen Autarchy.",
  "An infinite möbius strip made from ancient parchment; the equation is written along the paradoxical coiling faces."
];

export const GIFT_SOURCES = ["Mystical Crystal", "Ritual Cannibalism", "Psychoactive Fungus", "Nanomachine Infection", "Irradiated at Birth", "Meditation", "Dream Quest", "Parasitic Spirit Entity", "Mental Mutation", "Addictive Rare Drug", "Brain Implants", "Devouring Memories", "Brain Surgery", "Secret Religion", "Ancient Mask", "Cursed Ring", "Born During Eclipse", "Found Weird Orb", "Beheld Azathoth, the Daemon Sultan", "Studied in Lost Archives"];
export const GIFT_NAMES = ["Telekinesis", "Pyrokinesis", "Telepathy", "Memory Extraction", "Mind Control", "Invisibility", "Astral Projection", "Healing Hands", "Paralysing Touch", "Eye Lasers", "Augury", "Inhuman Speed", "Second Sight", "Force Wall", "Generate Lightning", "Ultrasonic Scream", "Create Paradox-Clone", "Summon Orbs", "Cryokinesis", "Induce Sleep"];
export const GIFT_QUALITIES_ALL = [
  ["Bashing", "Binding", "Blinding", "Burning", "Choking", "Consuming", "Corroding", "Crushing", "Deafening", "Detonating", "Disintegrating", "Draining", "Electrifying", "Excruciating", "Freezing", "Withering", "Impaling", "Imprisoning", "Infecting", "Liquefying"],
  ["Absorbing", "Armouring", "Banishing", "Concealing", "Countering", "Curing", "Cushioning", "Deflecting", "Disappearing", "Disarming", "Disguising", "Entangling", "Warding", "Guarding", "Shielding", "Healing", "Hindering", "Invigorating", "Mending", "Nullifying"],
  ["Adhering", "Addicting", "Blackening", "Blossoming", "Cacophonous", "Dazzling", "Dividing", "Duplicating", "Evolving", "Extinguishing", "Fusing", "Ghostly", "Grasping", "Inflating", "Inverting", "Invulnerable", "Prismatic", "Transmuting", "Teleporting", "Whispering"],
  ["Bewildering", "Calming", "Charming", "Commanding", "Enticing", "Horrifying", "Hysterical", "Maddening", "Mesmerising", "Mocking", "Revealing", "Whirling", "Slithering", "Dreaming", "Encoding", "Enraging", "Pulsing", "Saddening", "Scrying", "Subtle"]
];
export const GIFT_FORMS_ALL = [
  ["Claw", "Clay", "Crystal", "Flesh", "Mould", "Flower", "Fungus", "Fruit", "Glass", "Ice", "Iron", "Ivory", "Leaf", "Stone", "Moss", "Hand", "Gaze", "Roots", "Beam", "Cascade"],
  ["Salt", "Sand", "Silk", "Skin", "Soil", "Stone", "Sugar", "Ray", "Thorn", "Vine", "Rust", "Void", "Ash", "Blizzard", "Breath", "Cloud", "Dust", "Fog", "Mist", "Fragrance"],
  ["Hail", "Haze", "Wind", "Shard", "Miasma", "Perfume", "Pollen", "Plague", "Rain", "Sandstorm", "Orb", "Bolt", "Snow", "Smoke", "Arc", "Sphere", "Shield", "Helix", "Web", "Wound"],
  ["Chaos", "Cold", "Darkness", "Prism", "Distortion", "Dream", "River", "Fire", "Frost", "Ghost", "Gravity", "Growth", "Song", "Voice", "Light", "Lightning", "Thread", "Parasite", "Paradox", "Entropy"]
];

export const BOONS = ["Advanced Weapon", "Alchemist's Crucible and an Elixir", "Cybernetic Implant", "Exotica", "Hypergeometric Codex", "Mystic Gift"];

// Standalone flavor-item generators (Miscellany/*.md, Core Rules/Toxins.md)
// ported for macros/generate-flavor-item.js — work-queue.txt item 1, Phase 1.
// Not used by chargen itself (no PC ever rolls these), kept here anyway to
// match every other table-data convention in this file.
export const FINE_CLOTHING = [
  { colour: "White", material: "Spider Silk", item: "Robe", decorated_with: "Spikes" },
  { colour: "Orange", material: "Llama Wool", item: "Tall Hat", decorated_with: "Images of Animals" },
  { colour: "Violet", material: "Denim", item: "Codpiece", decorated_with: "Gold Threads" },
  { colour: "Black", material: "Plastic", item: "Tunic", decorated_with: "Occult Symbols" },
  { colour: "Azure", material: "Cotton", item: "Trousers", decorated_with: "Erotic Embroidery" },
  { colour: "Crimson", material: "Leather", item: "Shirt", decorated_with: "Religious Embroidery" },
  { colour: "Jade", material: "Linen", item: "Cape", decorated_with: "Mathematical Embroidery" },
  { colour: "Transparent", material: "Canvas", item: "Slippers", decorated_with: "Floral Patterns" },
  { colour: "Chameleon", material: "Polyester", item: "Overalls", decorated_with: "Jewelled" },
  { colour: "Neon Yellow", material: "Cashmere", item: "Gloves", decorated_with: "Astrological Patterns" },
  { colour: "Royal Purple", material: "Satin", item: "Scarf", decorated_with: "Hypergeometric Patterns" },
  { colour: "Beige", material: "Velvet", item: "Jacket", decorated_with: "Checked Patterns" },
  { colour: "Salmon Pink", material: "Corduroy", item: "Shorts", decorated_with: "Livery of an Autarch" },
  { colour: "Turquoise", material: "Latex", item: "Overcoat", decorated_with: "Obscene Holograms" },
  { colour: "Silver", material: "Faux Fur", item: "Shawl", decorated_with: "Computer Circuitry" },
  { colour: "Opalescent", material: "Snake Skin", item: "Boots", decorated_with: "Prismatic Crystals" },
  { colour: "Gold", material: "Gauze", item: "Peaked Hat", decorated_with: "Biotechnology" },
  { colour: "Bronze", material: "Kevlar", item: "Toga", decorated_with: "Luminous Threads" },
  { colour: "Ruby Red", material: "Ultrasuede", item: "Slippers", decorated_with: "Antigravity Globes" },
  { colour: "Amber", material: "Voidcloth", item: "Waistcoat", decorated_with: "Ultraviolet Pearls" }
];

export const MUSICAL_INSTRUMENTS = [
  { instrument_a: "Bone", instrument_b: "Harp", sound: "Horrid", decorated_with: "Quantum Daemons" },
  { instrument_a: "Crystal", instrument_b: "Trumpet", sound: "Booming", decorated_with: "Autarch Faces" },
  { instrument_a: "Electric", instrument_b: "Piano", sound: "Thin", decorated_with: "Void Saints" },
  { instrument_a: "Wind", instrument_b: "Guitar", sound: "Enchanting", decorated_with: "Flowers" },
  { instrument_a: "Solar", instrument_b: "Double Bass", sound: "Sorrowful", decorated_with: "Sacred Geometry" },
  { instrument_a: "Biomechanical", instrument_b: "Violin", sound: "Jaunty", decorated_with: "Gold Leaf" },
  { instrument_a: "Fungal", instrument_b: "Horn", sound: "Tuneless", decorated_with: "Moons and Suns" },
  { instrument_a: "Iridescent", instrument_b: "Bassoon", sound: "Playful", decorated_with: "Holy Fools" },
  { instrument_a: "Clockwork", instrument_b: "Drum", sound: "Deep", decorated_with: "Dancing Synths" },
  { instrument_a: "Insect-Infested", instrument_b: "Accordion", sound: "Raucous", decorated_with: "Wedding Revellers" },
  { instrument_a: "Occult", instrument_b: "Tuba", sound: "Buzzing", decorated_with: "Freshwater Pearls" },
  { instrument_a: "Translucent", instrument_b: "Gong", sound: "Mellow", decorated_with: "Prayer Flags" },
  { instrument_a: "Delicate", instrument_b: "Sitar", sound: "Shrill", decorated_with: "Poetry Cylinders" },
  { instrument_a: "Stone", instrument_b: "Lute", sound: "Droning", decorated_with: "Solar Saints" },
  { instrument_a: "Plastic", instrument_b: "Xylophone", sound: "Howling", decorated_with: "Huntsmen and Hounds" },
  { instrument_a: "Laser", instrument_b: "Pipe", sound: "Clashing", decorated_with: "Water Fowl" },
  { instrument_a: "Gold", instrument_b: "Saxophone", sound: "Rich", decorated_with: "Berries and Fruits" },
  { instrument_a: "Blasphemous", instrument_b: "Flute", sound: "Wailing", decorated_with: "Erotic Carvings" },
  { instrument_a: "Sacred", instrument_b: "Ocarina", sound: "Thundering", decorated_with: "Scorpions" },
  { instrument_a: "Automatic", instrument_b: "Ukulele", sound: "Pleasing", decorated_with: "Stars and Voidships" }
];

// Effect column's "/" separates the immediate effect from the lingering
// consequence (Toxins.md's own Notes section) — kept as one string, same as
// the vault table, rather than split into two fields.
export const VAARNISH_POISONS = [
  { colour: "Crimson", form: "Liquid", delivery: "Must be ingested", effect: "d6 TOX damage" },
  { colour: "Azure", form: "Liquid", delivery: "Must be ingested", effect: "d8 TOX damage" },
  { colour: "Ochre", form: "Liquid", delivery: "Must be ingested", effect: "d10 TOX damage" },
  { colour: "Ash-grey", form: "Oil", delivery: "Must be ingested", effect: "d12 TOX damage" },
  { colour: "Black", form: "Oil", delivery: "Must be ingested", effect: "d20 TOX damage" },
  { colour: "White", form: "Oil", delivery: "Must be ingested", effect: "d4 STR loss / d10 STR loss" },
  { colour: "Jade", form: "Oil", delivery: "Must be ingested", effect: "d4 DEX loss / d10 DEX loss" },
  { colour: "Golden", form: "Powder", delivery: "Must be ingested", effect: "d4 CON loss / d10 CON loss" },
  { colour: "Silver", form: "Powder", delivery: "Contact with skin", effect: "d4 INT loss / d10 INT loss" },
  { colour: "Brassy", form: "Powder", delivery: "Contact with skin", effect: "d4 PSY loss / d10 PSY loss" },
  { colour: "Colourless", form: "Paste", delivery: "Contact with skin", effect: "d4 EGO loss / d10 EGO loss" },
  { colour: "Pink", form: "Paste", delivery: "Airborne", effect: "Hallucinations for d6 days / d8 INT + PSY loss" , declaredSpan: null },
  { colour: "Indigo", form: "Paste", delivery: "Airborne", effect: "Mute for d6 days / Permanent Loss of Language" , declaredSpan: null },
  { colour: "Purple", form: "Sand", delivery: "Coated on weapon", effect: "Blind for d6 days / Permanent Blindness" , declaredSpan: null },
  { colour: "Iridescent", form: "Glass", delivery: "Coated on weapon", effect: "Vomiting for d6 days, cannot eat / d8 CON loss" , declaredSpan: null },
  { colour: "Orange", form: "Leaf", delivery: "Coated on weapon", effect: "Unable to use Mystic Gifts for d6 days" , declaredSpan: null },
  { colour: "Teal", form: "Blood", delivery: "Coated on weapon", effect: "Death-like Paralysis for d6 days" , declaredSpan: null },
  { colour: "Brown", form: "Crystal", delivery: "Coated on weapon", effect: "Cannot refuse commands for d6 days" , declaredSpan: null },
  { colour: "Turquoise", form: "Fungus", delivery: "Harmless until mixed with catalyst", effect: "Suffer double damage for d6 days" , declaredSpan: null },
  { colour: "Octarine", form: "Sugar", delivery: "Harmless until mixed with catalyst", effect: "Lose d8 Max HP / Instant Death" }
];

export const BOOKS = [
  { cover: "Waterlogged", author: "Anonymous", style: "Insane", subject: "Medicine", other_feature: "Extremely Heavy" },
  { cover: "Burned", author: "Armiger", style: "Wry", subject: "Bestiary", other_feature: "Every Word Is A Lie" },
  { cover: "Green", author: "Autarch", style: "Sardonic", subject: "Botany", other_feature: "Bloodstains" },
  { cover: "Golden", author: "Bad Artist", style: "Formal", subject: "Synthetic Life", other_feature: "Elaborate Illustrations" },
  { cover: "Snake Skin", author: "Bad Poet", style: "Moralising", subject: "Xenobiology", other_feature: "Poisoned Bookmark" },
  { cover: "Yellow", author: "Cacogen", style: "Pious", subject: "War", other_feature: "From An Autarch's Library" },
  { cover: "Orange", author: "Condemned Criminal", style: "Purple", subject: "Geology", other_feature: "Coded Message Inside Cover" },
  { cover: "Mouldy", author: "Courtesan", style: "Archaic", subject: "Biography", other_feature: "Love Letter Inside Cover" },
  { cover: "Plastic", author: "Deposed Autarch", style: "Heroic", subject: "The Future", other_feature: "From Another Planet" },
  { cover: "Iridescent", author: "Deposed Hegemon", style: "Passionate", subject: "History", other_feature: "Luminous Ink" },
  { cover: "Rusted", author: "Great Artist", style: "Earnest", subject: "Dreams", other_feature: "Poisoned Page" },
  { cover: "Striped", author: "Great Poet", style: "Rhyming", subject: "Drugs", other_feature: "Tiny Weapon Hidden Inside" },
  { cover: "Silver", author: "Hegemon", style: "Comedic", subject: "Travel", other_feature: "Unknown Language" },
  { cover: "Ochre", author: "Madman", style: "Lyrical", subject: "Art", other_feature: "Fabulously Rare" },
  { cover: "White", author: "Monk", style: "Monotonous", subject: "Poetry", other_feature: "Illuminated With Gold Leaf" },
  { cover: "Blue", author: "Priest", style: "Lively", subject: "The Autarchs", other_feature: "Heretical Text" },
  { cover: "Black", author: "Prophet", style: "Dry", subject: "Religion", other_feature: "Worm-eaten" },
  { cover: "Sunbleached", author: "Synth", style: "Hysterical", subject: "Hypergeometry", other_feature: "Clever Forgery" },
  { cover: "Jewelled", author: "Titan", style: "Awkward", subject: "Physics", other_feature: "Drugs Hidden Inside" },
  { cover: "Indigo", author: "Warrior", style: "Pedantic", subject: "Sex", other_feature: "Utterly Illegible" }
];

// Subject A/B combine for the full subject matter, e.g. "A Heroic Planeyfolk
// depicted amid Rebirth" (Fine Art.md's own example) — Subject A entries
// carry raw Obsidian wikilink syntax ("[[Planeyfolk]]", "[[Cacklemaw
// Exile|Cacklemaw]]") straight from the vault file; macros/
// generate-flavor-item.js strips it down to the display text.
export const FINE_ART = [
  { medium: "Watercolour", style: "Restrained", subject_a: "[[Autarchs|An Autarch]]", subject_b: "Sun" },
  { medium: "Oil Painting", style: "Surreal", subject_a: "Void Saint", subject_b: "Death" },
  { medium: "Acrylic Painting", style: "Exuberant", subject_a: "Merchant", subject_b: "Old Age" },
  { medium: "Statue (Wood)", style: "Abstract", subject_a: "Synth", subject_b: "Vanity" },
  { medium: "Statue (Marble)", style: "Melancholy", subject_a: "Torturer", subject_b: "Dreams" },
  { medium: "Statue (Bronze)", style: "Bombastic", subject_a: "Local Monster", subject_b: "Love" },
  { medium: "Statue (Crystal)", style: "Heroic", subject_a: "[[Planeyfolk]]", subject_b: "Rebirth" },
  { medium: "Statue (Glass)", style: "Idealised", subject_a: "[[Lithling]]", subject_b: "Occult Knowledge" },
  { medium: "Ink Drawing", style: "Awkward", subject_a: "[[Cacogen]]", subject_b: "Birds" },
  { medium: "Pencil Drawing", style: "Symbolic", subject_a: "[[Mycomorph]]", subject_b: "Fungus" },
  { medium: "Pastel Drawing", style: "Tasteless", subject_a: "[[Cacklemaw Exile|Cacklemaw]]", subject_b: "Moon" },
  { medium: "Engraving", style: "Optimistic", subject_a: "[[Faa Nomad]]", subject_b: "Apocalypse" },
  { medium: "Mosaic", style: "Secretive", subject_a: "Water Prospector", subject_b: "Sandworms" },
  { medium: "Hologram", style: "Minimalist", subject_a: "Spy", subject_b: "Marriage" },
  { medium: "Tapestry", style: "Maximalist", subject_a: "Science-Mystic", subject_b: "Betrayal" },
  { medium: "Video Collage", style: "Cold", subject_a: "Warrior", subject_b: "Loss" },
  { medium: "Photograph", style: "Comedic", subject_a: "Oracle", subject_b: "Sickness" },
  { medium: "Ceramics", style: "Romantic", subject_a: "Healer", subject_b: "Insects" },
  { medium: "Clay Sculpture", style: "Horrible", subject_a: "Vagrant", subject_b: "Crystals" },
  { medium: "Hypergeometric Sculpture", style: "Flawless", subject_a: "Azathoth, the Daemon Sultan", subject_b: "Madness" }
];

// CRIMSON HOUND 07-05-26 replaced two of this table's four columns: Quality
// (Corroded/Fake/Shoddy...) became Hue (Crimson/Azure/Orange...), and Quirk
// became Decorated With. Form and Set With are unchanged, all 20 rows.
// NOTE the mechanical loss: Quality carried the trade-value modifiers
// (0 / x2 / x3 Trade Value) and Hue carries none, so this table no longer
// prices anything. generate-flavor-item.js lost its splitParenthetical
// helper with them - it had no other caller.
export const JEWELLERY = [
  { hue: "Crimson", form: "Ring", set_with: "Amber", decorated_with: "Courtesans" },
  { hue: "Azure", form: "Bracelet", set_with: "Amethysts", decorated_with: "Gladiators" },
  { hue: "Orange", form: "Toe Ring", set_with: "Emeralds", decorated_with: "Ailing Moons" },
  { hue: "Colourless", form: "Necklace", set_with: "Jade", decorated_with: "Leaves and Flowers" },
  { hue: "Golden", form: "Mask", set_with: "Rubies", decorated_with: "Infants" },
  { hue: "Silver", form: "Anklet", set_with: "Sapphires", decorated_with: "Synths" },
  { hue: "Bronze", form: "Talisman", set_with: "Turquoise", decorated_with: "Lithlings" },
  { hue: "Violet", form: "Earring", set_with: "Coral", decorated_with: "Autarch's Faces" },
  { hue: "Sable", form: "Nose Ring", set_with: "Ivory", decorated_with: "Daemonic Faces" },
  { hue: "Bone", form: "Brooch", set_with: "Pearls", decorated_with: "Witches" },
  { hue: "Translucent", form: "Watch", set_with: "Seashells", decorated_with: "Promised Sun" },
  { hue: "Lurid", form: "Chain of Office", set_with: "Opals", decorated_with: "Mystic Sigils" },
  { hue: "Polychrome", form: "Tail Ring", set_with: "Pink Diamonds", decorated_with: "Death Poems" },
  { hue: "Pink", form: "Cufflinks", set_with: "Blue Diamonds", decorated_with: "Athletes" },
  { hue: "Iridescent", form: "Hairpin", set_with: "Black Diamonds", decorated_with: "Obscene Imagery" },
  { hue: "Rust", form: "Amulet", set_with: "Helenite", decorated_with: "Heretical Imagery" },
  { hue: "Coral", form: "Belt", set_with: "Azurite", decorated_with: "Decadent Imagery" },
  { hue: "Chameleon-coloured", form: "Boots", set_with: "Lapis Lazuli", decorated_with: "Sacred Geometry" },
  { hue: "Ocatrine", form: "Slippers", set_with: "Obsidian", decorated_with: "Void Travellers" },
  { hue: "Ulfire", form: "Headcrest", set_with: "Sunstones", decorated_with: "Scorpions" }
];
