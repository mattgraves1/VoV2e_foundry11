/**
 * The mutations as effect sentences - Effect Engine: Mutations and Ancestry
 * Rules, chunk 1 (foundry-system-index.csv "Effect Engine: Mutations and
 * Ancestry Rules", BUILD PLAN and RULING C LIST RULED 2026-10-05 by Matt).
 *
 * One entry per MUTATION_TABLE name (checked both ways by
 * tools/test-mutation-effects.mjs). The mutation translator
 * (mutation-effects.js) reads a mutation Item's name and returns these, so a
 * mutation made before the step needs nothing rewritten.
 *
 * READ THIS BEFORE EDITING:
 *  - `text` is the book's own words (JADE IBIS, the Mutations table), so a card
 *    or reminder can quote them.
 *  - BAKED (ruling A): what is written once when the mutation is gained - its
 *    ability changes, max HP, slots, hands, its natural weapon, the unarmed
 *    strike it replaces - is a `stat` sentence marked `baked: true`. Nothing
 *    applies a baked sentence again; Stats as Sentences makes them live.
 *  - DAMAGE TAKEN: a mutation that changes the damage its bearer takes gives
 *    the bearer a property the damage-type table knows (`damage-properties`),
 *    and the table keeps every multiplier (ruling C design note).
 *  - REMINDERS: each row the Forgettable Effects tab showed for a mutation is a
 *    passive reminder here with its tab placement, word for word.
 *  - Ruling C's new effects (Skeletal Frame, Malleable Body, Transparent Skin,
 *    Insulated Skin, the reaction-roll ADVs, Albino's DIS, ADV in the dark,
 *    Stilt Legs, Toxic Flesh, Slimy Skin) are written in as ruled; their
 *    readers arrive in chunks 2 to 4.
 *
 * Pure data: no Foundry global.
 */

const baked = (statName, amount, extra = {}) => ({ when: "stat", baked: true, do: { verb: "modify", stat: statName, amount, ...extra } });
const natural = (item, text) => ({ when: "stat", baked: true, do: { verb: "create-item", item, natural: true }, text });
const unarmed = () => ({ when: "stat", baked: true, do: { verb: "special", handler: "replaces-unarmed" }, text: "Replaces your unarmed attack." });
const av = (n, text) => ({ when: "passive", do: { verb: "modify", stat: "av", amount: `+${n}` }, text });
const forbid = (what, text) => ({ when: "passive", do: { verb: "forbid", what }, text });
const prop = (p, text) => ({ when: "passive", do: { verb: "modify", stat: "damage-properties", amount: `+${p}` }, text });
const immune = (to, text) => ({ when: "passive", do: { verb: "immune", to }, text });
const adv = (on, extra, text) => ({ when: "passive", do: { verb: "adv", on, ...extra }, text });
const dis = (on, extra, text) => ({ when: "passive", do: { verb: "dis", on, ...extra }, text });
const note = (text, section, polarity, category) => ({ when: "passive", do: { verb: "reminder" }, text, tab: { section, polarity, category } });
const kinship = (kind, text) => ({ when: "on-reaction-roll", if: [{ gate: "creature-kind", is: kind }], do: { verb: "adv", on: "reaction" }, text });
const addOn = (dice, gates, text, type) => ({ when: "attack-hit", if: gates, do: { verb: "damage", dice, ...(type ? { type } : {}), addOn: true }, text });
const melee = { gate: "attack-kind", is: "melee" };
const unarmedGate = { gate: "attack-kind", is: "unarmed" };
const charging = { gate: "charging" };
const bio = { gate: "creature-type", is: "biological" };
const EXTRA_ATTACK = "This is an EXTRA attack each round - not a replacement for your normal attack.";

const MUTATION_SENTENCES = {
  "Acid Blood": [{ when: "when-hit", if: [melee], target: "attacker", do: { verb: "damage", dice: "1d4", type: "corrosive" }, mode: "auto",
                   text: "Creatures in melee suffer d4 damage when they damage you." }],
  "Adhesive Touch": [note("Can climb any surface and crawl across ceilings.", "Always Active", "Benefit", "Movement & Environment")],
  "Albino": [dis("save", {}, "You must carry a sunshade (1 slot) or suffer DIS on all Saves during daylight hours."),
             // Ruling C (7): a real DIS, daylight asked once per scene, skipped while a Sunshade is carried.
             ].map(s => ({ ...s, if: [{ gate: "daylight" }, { gate: "carries", is: false, item: "Sunshade" }] })),
  "Antlers": [natural("Antlers", "Add +d10 damage to your melee attack when you charge into battle."),
              addOn("1d10", [melee, charging], "Add +d10 damage to your melee attack when you charge into battle."),
              kinship("antlered", "ADV on reaction rolls with antlered creatures.")],
  "Analgesia": [{ when: "passive", do: { verb: "conceal", what: "hp" }, text: "You do not know your maximum/current HP; the Referee tracks both." }],
  "Armoured Skin": [av(2, "Add +2 to your base AV.")],
  "Backwards Head": [immune("ambush", "You cannot be ambushed.")],
  "Backwards Legs": [dis("flee", {}, "DIS when fleeing and sneaking.")],
  "Beak": [natural("Beak", "Make an extra d6 melee attack."),
           kinship("bird-like", "ADV on reaction rolls with bird-like creatures."),
           note(`${EXTRA_ATTACK} ADV on reaction rolls with bird-like creatures.`, "Always Active", "Benefit", "Combat")],
  "Bioelectricity": [natural("Electrified Strike", "Your unarmed melee attack causes +d6 electrical damage."),
                     addOn("1d6", [unarmedGate], "Your unarmed melee attack causes +d6 electrical damage.", "electrical"),
                     note("Can power small machines if hooked up to them.", "Always Active", "Benefit", "Utility")],
  "Bioluminescence": [{ when: "passive", do: { verb: "emit-light", tier: "faint" }, text: "Your flesh produces a faint glow. You always have a light source." },
                      note("DIS to hide at night.", "Always Active", "Detriment", "Movement & Environment")],
  "Blind": [immune("blind", "You cannot see and must navigate by sound and scent."),
            { when: "attack-roll", if: [{ gate: "attack-kind", is: "ranged" }], do: { verb: "dis", on: "attack" }, text: "DIS on ranged attacks." },
            // Ruling C (8): ADV in the dark, the roller asked each roll.
            { when: "attack-roll", if: [{ gate: "darkness" }], do: { verb: "adv", on: "attack" }, text: "ADV when fighting in the dark." },
            note("ADV when fighting in the dark.", "Always Active", "Benefit", "Combat"),
            note("Cancels the effects of your other visual mutations.", "Always Active", "Detriment", "Utility")],
  "Body Barbs": [{ when: "when-missed", if: [melee], target: "attacker", do: { verb: "damage", dice: "@level", type: "kinetic" }, mode: "auto",
                   text: "Opponents who miss melee attacks against you suffer damage equal to your Level." }],
  "Bulbous Eyes": [dis("save", { vs: "blind" }, "DIS on Saves to avoid Blindness.")],
  "Centaur": [baked("con", "+2"), baked("inventory-slots", "+4")],
  "Chameleon Skin": [note("ADV to conceal yourself.", "Always Active", "Benefit", "Movement & Environment")],
  "Claws, Crab": [natural("Crab Claw", "Your unarmed attack deals d8 damage."), unarmed(),
                  forbid("wield-two-handed", "You cannot use two-handed weapons.")],
  "Claws, Retractable": [natural("Retractable Claws", "Your unarmed attack deals d6 damage."), unarmed()],
  "Clubfoot": [dis("flee", {}, "DIS when fleeing and sneaking.")],
  "Compound Eyes": [baked("dex", "+1")],
  "Crest, Bone": [av(1, "+1 AV."), forbid("wear-helmet", "Cannot wear helmets.")],
  "Crest, Feathers": [baked("ego", "+1"), forbid("wear-helmet", "Cannot wear helmets.")],
  "Crown, Horns": [av(1, "+1 AV."), forbid("wear-helmet", "Cannot wear helmets.")],
  "Crown, Coral": [av(1, "+1 AV."), forbid("wear-helmet", "Cannot wear helmets.")],
  "Crown, Eyestalks": [baked("psy", "+1"), forbid("wear-helmet", "Cannot wear helmets.")],
  "Cyclops": [dis("save", { vs: "blind" }, "DIS on Saves vs Blindness.")],
  "Detachable Head": [note("Head can detach and move independently for as long as you hold your breath.", "On-Demand", "Benefit", "Utility")],
  "Detachable Limb": [note("A limb can detach and move independently (blind, touch only, if separated).", "On-Demand", "Benefit", "Utility")],
  "Double Muscled": [baked("str", "+2"), adv("flee", {}, "ADV when fleeing or pursuing.")],
  "Echolocation": [immune("blind", "You cannot be blinded."),
                   { when: "attack-roll", if: [{ gate: "darkness" }], do: { verb: "adv", on: "attack" }, text: "ADV when fighting in the dark." },
                   note("ADV when fighting in the dark.", "Always Active", "Benefit", "Combat")],
  "Exposed Organs": [prop("exposedOrgans", "You suffer double damage from slashing or piercing attacks.")],
  "Extra Arms": [baked("hands", "+2"),
                 note("With a second weapon equipped, you can make an extra attack each turn.", "Always Active", "Benefit", "Combat")],
  "Extra Eyes": [baked("psy", "+1d3", { per: "extra eye" })],
  "Extra Head": [adv("save", { abilities: ["int", "psy", "ego"] }, "ADV on INT, PSY, and EGO Saves."),
                 { when: "passive", do: { verb: "modify", stat: "helmets", amount: "+1" }, text: "You have an extra head." },
                 note("Survive one decapitation.", "Always Active", "Benefit", "Combat")],
  "Extra Heart": [baked("con", "+2"), baked("max-hp", "+5")],
  "Extra Legs": [baked("con", "+2"), adv("flee", {}, "ADV on Saves relating to pursuits.")],
  "Extra Liver": [adv("save", { vs: "tox" }, "ADV on Saves vs poisons and TOX attacks.")],
  "Eyestalks": [],
  "Fangs, Venomous": [natural("Venomous Bite", "You have a poisonous bite (d6 TOX).")],
  "Feathers": [kinship("feathered", "ADV to reaction rolls for feathered creatures."),
               note("ADV on reaction rolls with feathered creatures.", "Always Active", "Benefit", "Social")],
  "Frog Tongue": [{ when: "use", do: { verb: "special", handler: "self-save", ability: "dex" }, text: "DEX Save to snatch weapons from foes' hands." }],
  "Fur": [kinship("furry", "ADV to reaction rolls for furry creatures."),
          note("ADV on reaction rolls with furry creatures.", "Always Active", "Benefit", "Social")],
  "Gas Glands (Blinding)": [{ when: "use", cost: { kind: "per-day", n: 1 }, target: "all-in-range", if: [bio],
                              resist: { type: "save", ability: "con", vs: "being blinded for d6 rounds" },
                              do: { verb: "condition", state: "blind" }, for: { duration: "rounds", amount: "1d6" },
                              text: "Once per day, you can release a cloud of blinding gas, which affects all biological targets in the room. Creatures in the cloud must CON Save or be blinded for d6 rounds." }],
  "Gas Glands (Sleeping)": [{ when: "use", cost: { kind: "per-day", n: 1 }, target: "all-in-range", if: [bio],
                              resist: { type: "save", ability: "ego", vs: "falling asleep for d6 rounds" },
                              do: { verb: "condition", state: "asleep" }, for: { duration: "rounds", amount: "1d6" },
                              text: "Once per day, you can release a cloud of soporific gas, which affects all biological targets in the room. Creatures in the cloud must EGO Save or fall asleep for d6 rounds." }],
  "Gills": [prop("gills", "You have gills and can breathe underwater."),
            { when: "passive", do: { verb: "upkeep", item: "Water Ration", per: "day", times: 2, unpaid: "deprived" },
              text: "You must drink double rations of water each day or become Deprived." },
            note("Become Deprived if the doubled water is not drunk.", "Always Active", "Detriment", "Movement & Environment")],
  "Gliding Membranes": [note("Can glide short distances.", "On-Demand", "Benefit", "Movement & Environment")],
  "Goat Legs": [note("Can walk up sheer surfaces.", "Always Active", "Benefit", "Movement & Environment")],
  "Headless": [forbid("wear-helmet", "You cannot wear helmets or hats.")],
  "Heightened Hearing": [immune("blind", "You suffer no ill-effects from Blindness or darkness."),
                         immune("ambush", "You cannot be ambushed.")],
  "Heightened Immune System": [adv("save", { vs: "disease" }, "ADV on Saves vs diseases and poisons."),
                               adv("save", { vs: "tox" }, "ADV on Saves vs diseases and poisons.")],
  "Hooks, Climbing": [note("ADV to climbing and acrobatics.", "Always Active", "Benefit", "Movement & Environment")],
  "Hopper": [note("Can leap huge distances.", "Always Active", "Benefit", "Movement & Environment")],
  "Horns, Ram": [natural("Ram Horns", "You can make an extra d6 melee attack."),
                 kinship("horned", "ADV on reaction rolls for other horned creatures."),
                 note(`${EXTRA_ATTACK} ADV on reaction rolls with other horned creatures.`, "Always Active", "Benefit", "Combat")],
  "Horns, Rhino": [natural("Rhino Horn", "When you charge into melee, add +d10 to your damage roll."),
                   addOn("1d10", [melee, charging], "When you charge into melee, add +d10 to your damage roll.")],
  "Huge Beard": [],
  "Huge Brain": [baked("int", "+2"), forbid("wear-helmet", "You cannot wear helmets or hats.")],
  "Humpback": [note("Can go seven days without drinking water.", "Always Active", "Benefit", "Movement & Environment")],
  "Infravision": [note("Detect heat signatures; see warm-blooded creatures in total darkness.", "Always Active", "Benefit", "Utility")],
  "Ink Ducts": [{ when: "use", cost: { kind: "per-day", n: "@level" }, target: "one-target",
                  resist: { type: "save", ability: "dex", vs: "one round of blindness" },
                  do: { verb: "condition", state: "blind" }, for: { duration: "rounds", amount: 1 },
                  text: "You can spray ink like a squid, causing an opponent to DEX Save vs one round of blindness. You can do this a number of times per day equal to your Level." }],
  "Insulated Skin": [prop("insulated", "Take half damage from extreme temperatures."),
                     note("Half damage from extreme temperatures.", "Always Active", "Benefit", "Movement & Environment")],
  "Kangaroo Pouch": [baked("inventory-slots", "+2")],
  "Larynx Darts": [natural("Larynx Darts", "Treat as a concealed d4 ranged weapon that cannot run out of ammunition.")],
  "Leaves": [{ when: "use", if: [{ gate: "daylight" }], target: "self", do: { verb: "special", handler: "hourly-heal", dice: "1d4", hour: "one hour resting in sunlight", says: "rests in sunlight", doing: "resting in sunlight" },
               text: "Regain d4 HP per hour when resting in sunlight." },
             note("Regain d4 HP per hour resting in sunlight.", "Always Active", "Benefit", "Movement & Environment")],
  "Malleable Body": [prop("malleable", "Take half damage from bludgeoning attacks."),
                     note("Fit into tight gaps. Half damage from bludgeoning attacks.", "Always Active", "Benefit", "Combat")],
  "Malleable Face": [note("Can imitate others' faces, given time.", "On-Demand", "Benefit", "Social")],
  "Mane, Hair": [baked("ego", "+1")],
  "Obligate Carnivore": [{ when: "passive", do: { verb: "upkeep", item: "Raw Meat", per: "day", unpaid: "no-heal" },
                           text: "You must eat raw meat. You cannot heal using other types of food." },
                         note("Must eat Raw Meat. Cannot heal using other types of food.", "Always Active", "Detriment", "Movement & Environment")],
  "Obligate Lithovore": [{ when: "passive", do: { verb: "upkeep", item: "Stone", per: "day", unpaid: "no-heal" },
                           text: "You must swallow a stone each day. You cannot heal using other types of food." },
                         note("Must swallow a Stone each day. Cannot heal using other types of food.", "Always Active", "Detriment", "Movement & Environment")],
  "Patterned Skin": [baked("ego", "+1")],
  "Pleasant Fragrance": [baked("ego", "+1")],
  "Poison Spur": [natural("Poison Spur", "Your unarmed attacks deal d6 TOX damage."), unarmed()],
  "Powerful Jaws": [natural("Powerful Jaws", "Add +d6 to melee attack damage."),
                    addOn("1d6", [melee], "Add +d6 to melee attack damage.")],
  "Prehensile Feet": [baked("dex", "+1")],
  "Prehensile Hair": [baked("dex", "+1")],
  "Quills": [av(2, "Add +2 to your AV."),
             forbid("wear-body-armour", "You cannot wear armour."),
             { when: "passive", do: { verb: "modify", stat: "worn-armour-av", amount: "x0" }, text: "You cannot wear armour." },
             { when: "when-missed", if: [melee], target: "attacker", do: { verb: "damage", dice: "@level", type: "kinetic" }, mode: "auto",
               text: "Opponents who miss melee attacks against you suffer damage equal to your Level." }],
  "Scaly Skin": [av(1, "Add +1 to your AV.")],
  "Silk Production": [{ when: "use", target: "one-target", resist: { type: "opposed", ability: "dex", vs: "being wrapped in web" },
                        do: { verb: "condition", state: "entangled" }, for: { duration: "until-saved", ability: "dex", by: "break free of the web" },
                        text: "Make an opposed DEX Save to wrap an enemy in web, entangling them until they succeed at a DEX Save." }],
  "Skeletal Frame": [baked("str", "-2"), baked("con", "-2"),
                     prop("skeletal", "You take double damage from bludgeoning and crushing attacks."),
                     note("Take double damage from bludgeoning and crushing attacks.", "Always Active", "Detriment", "Combat")],
  "Slimy Skin": [adv("escape", {}, "ADV to escape grab attacks and enclosing traps."),
                 note("ADV to escape grab attacks and enclosing traps.", "Always Active", "Benefit", "Combat")],
  "Slug Body": [baked("dex", "-2"),
                note("Can stick to sheer surfaces.", "Always Active", "Benefit", "Movement & Environment"),
                note("Leaves a trail of mucus (easily tracked).", "Always Active", "Detriment", "Movement & Environment")],
  "Small Stature": [dis("save", { abilities: ["str"] }, "DIS on STR Saves.")],
  "Snout": [kinship("a newbeast", "ADV to reaction rolls for newbeasts."),
            note("ADV on reaction rolls with Newbeasts.", "Always Active", "Benefit", "Social")],
  "Stilt Legs": [adv("flee", {}, "ADV in chases and pursuits."),
                 note("ADV in chases/pursuits; wade quickly through flooded areas.", "Always Active", "Benefit", "Movement & Environment"),
                 note("Default target for ranged attacks.", "Always Active", "Detriment", "Combat")],
  "Tail, Club": [natural("Tail Club", "Make an extra crushing melee attack per round (d8)."),
                 note(EXTRA_ATTACK, "Always Active", "Benefit", "Combat")],
  "Tail, Prehensile": [baked("dex", "+2")],
  "Tail, Scorpion": [natural("Scorpion Tail", "Make one extra melee attack per round (d6 TOX)."),
                     note(EXTRA_ATTACK, "Always Active", "Benefit", "Combat")],
  "Tail, Spike Launching": [natural("Tail, Spike Launching", "Make an extra ranged attack per round (d6).")],
  "Tentacles, Arms": [baked("str", "-3"), baked("dex", "+3")],
  "Tentacles, Hair": [natural("Stinging Tentacles", "At melee range, you can make a d6 TOX attack instead of your normal attack.")],
  "Toxic Flesh": [{ when: "when-hit", if: [{ gate: "attack-is-bite" }], target: "attacker", do: { verb: "damage", dice: "1d8", type: "tox" }, mode: "auto",
                    text: "Your flesh is toxic when eaten or bitten (d8 TOX)." },
                  note("Flesh is toxic if eaten (d8 TOX).", "On-Demand", "Benefit", "Movement & Environment")],
  "Transparent Skin": [prop("transparentSkin", "You take double damage from beam attacks."),
                       note("Take double damage from Beam attacks.", "Always Active", "Detriment", "Combat")],
  "Trunk": [baked("dex", "+1")],
  "Tusks": [natural("Tusks", "+d6 melee damage."), addOn("1d6", [melee], "+d6 melee damage.")],
  "Ultravision": [immune("blind", "You cannot be blinded."),
                  note("See invisible creatures/objects.", "Always Active", "Benefit", "Utility")],
  "Vampiric": [{ when: "passive", do: { verb: "upkeep", item: "Fresh Blood", per: "day", unpaid: "deprived", replaces: "water" },
                 text: "You must consume a ration of fresh blood each day or become Deprived." },
               note("Must consume a ration of Fresh Blood each day or become Deprived.", "Always Active", "Detriment", "Movement & Environment")],
  "Vestigial Wings": [],
  "Vocal Mimic": [note("Can mimic voices/sounds you've heard.", "On-Demand", "Benefit", "Social")],
  "Warty Skin": [av(1, "Add +1 to your AV.")],
  "Whiskers": [baked("psy", "+1")],
  "Wings": [note("Fly freely.", "Always Active", "Benefit", "Movement & Environment"),
            note("Default target for ranged attacks while airborne.", "Always Active", "Detriment", "Combat")]
};

const stripUndefined = s => JSON.parse(JSON.stringify(s));

// Each mutation as { effects: [...] } - the shape every roster entry carries,
// so tools/test-effect-vocabulary.mjs validates these with every other roster.
export const MUTATION_EFFECTS = Object.fromEntries(
  Object.entries(MUTATION_SENTENCES).map(([name, list]) => [name, { effects: list.map(stripUndefined) }]));
