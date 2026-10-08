/**
 * The Exotica as effect sentences - Effect Engine: Implants, Exotica and
 * Figments, chunk 1 (foundry-system-index.csv "Effect Engine: Implants, Exotica
 * and Figments", BUILD PLAN and RULING C LIST RULED 2026-10-06 by Matt).
 *
 * One entry per starting EXOTICA (chargen-data.js) and ADVANCED_EXOTICA name,
 * checked both ways by tools/test-implant-exotica-effects.mjs. An Exotica that
 * becomes an armour or weapon Item (armorType, weapon, abilityDamage) is read
 * by the same name, through its flags.vaarn.exotica.
 *
 * READ THIS BEFORE EDITING:
 *  - THE BOOK'S WORDS ARE THE ROSTER'S. A sentence quoting the whole entry
 *    takes it from the roster's description (bookText) rather than a second
 *    transcription that could drift from it.
 *  - RULING B: an Exotica whose effect is text only is a reminder - a USE
 *    reminder where it has a use control (a usage die, charges, or a use icon),
 *    paying its usage-die roll or its charge; otherwise a passive reminder,
 *    shown only in its description.
 *  - BAKED (ruling A): an armour's AV, a weapon's dice, the Manifold Box's
 *    slots, a generated weapon - written once when the Item is made.
 *  - REMINDERS: each Forgettable Effects row for an Exotica or an Exotica
 *    armour is a passive reminder here with its tab placement, word for word.
 *  - Ruling C's new effects (Moonbeast Carapace, Hushboots, the Ulfire light,
 *    the Ultravisor's auto-hit) are written in as ruled; their readers arrive
 *    in chunks 2 and 3.
 *  - USE LINES: the sixteen hand-written lines the sheet posted by name are
 *    each Exotica's `says` since chunk 3b (RULED 2026-10-06, Matt: kept word
 *    for word) - the chat line its use posts; `text` stays the book's.
 *
 * Pure data: no Foundry global.
 */

import { EXOTICA } from "./chargen-data.js";
import { ADVANCED_EXOTICA } from "./advanced-exotica-data.js";

const bookText = name => (EXOTICA.find(e => e.name === name) ?? ADVANCED_EXOTICA.find(e => e.name === name))?.description ?? "";

const DIE = { kind: "usage-die-step" };
const CHARGE = { kind: "charge" };
const useNote = (name, cost) => ({ when: "use", ...(cost ? { cost } : {}), do: { verb: "reminder" }, text: bookText(name) });
const passiveNote = name => ({ when: "passive", do: { verb: "reminder" }, text: bookText(name) });
const tabNote = (text, section, polarity, category) => ({ when: "passive", do: { verb: "reminder" }, text, tab: { section, polarity, category } });
const special = (handler, cost, extra = {}, name = null) => ({ when: "use", ...(cost ? { cost } : {}), do: { verb: "special", handler, ...extra }, ...(name ? { text: bookText(name) } : {}) });
// An Exotica's use whose chat line is its hand-written line (chunk 3b): a reminder
// that posts `says` in place of the default line; `text` keeps the book's words.
const say = (name, cost, extra = {}) => ({ when: "use", ...(cost ? { cost } : {}), ...extra, says: LINES[name], do: { verb: "reminder" }, text: bookText(name) });
// What a lasting effect writes on the board - the roster's own applies text.
const appliesText = name => ADVANCED_EXOTICA.find(e => e.name === name)?.applies?.text ?? bookText(name);
const armourAv = n => ({ when: "stat", baked: true, do: { verb: "modify", stat: "av", amount: `+${n}` } });
const live = (ability, n) => ({ when: "passive", do: { verb: "modify", stat: ability, amount: `+${n}` } });
const weapon = (dice, extra = {}) => ({ when: "stat", baked: true, do: { verb: "modify", stat: "damage-dice", amount: `=${dice}`, ...extra } });
const prop = (p, text) => ({ when: "passive", do: { verb: "modify", stat: "damage-properties", amount: `+${p}` }, text });
const immune = (to, text) => ({ when: "passive", do: { verb: "immune", to }, text });
const lasting = (name, effectName, amount, unit, cost, extra = {}) => ({ when: "use", cost, ...extra,
  do: { verb: "reminder", name: effectName, effectText: appliesText(name) }, for: { duration: `${unit}s`, amount }, text: bookText(name) });
// The use lines the sheet posted, word for word (RULED 2026-10-06, Matt: kept, moved
// from actor-sheet.js's name table into the sentences as their `says`).
const LINES = {
  "C-Foam Puddings":
    "throws a <b>C-Foam Pudding</b>! Human-sized creatures must DEX save or be entrapped in quick-setting adhesive foam for roughly 8 hours (faster in salt water).",
  "Empathy Bomb":
    "detonates an <b>Empathy Bomb</b>! Biological creatures in range must EGO save or be overcome with compassion for others for d4 hours.",
  "Singularity Bomb":
    "releases a <b>Singularity Bomb</b>! Creatures caught in the blast must DEX save vs instant death as they're drawn into the singularity.",
  "Pacifying Glove":
    "touches a target with the <b>Pacifying Glove</b>! Biological creatures must EGO save or fall asleep for d6 hours.",
  "Anti-Gravity Field Generator":
    "activates the <b>Anti-Gravity Field Generator</b>! Creatures not adapted to zero gravity must DEX save to move or float helplessly.",
  "Titancreed Fragment: KILL":
    "reads the <b>Titancreed Fragment: KILL</b> aloud! Synthetic creatures in hearing range must EGO save or fly into a killing frenzy.",
  "Titancreed Fragment: OBEY":
    "reads the <b>Titancreed Fragment: OBEY</b> aloud! Synthetic creatures in hearing range must EGO save or obey one verbal command from the reader.",
  "Titancreed Fragment: SLEEP":
    "reads the <b>Titancreed Fragment: SLEEP</b> aloud! Synthetic creatures in hearing range must EGO save or fall into a resting state.",
  "Bluescreen Dagger":
    "strikes with the <b>Bluescreen Dagger</b>! Synthetic creatures must EGO save or take d20 EGO damage. Does not damage other creature types.",
  "Fortuitous Polyhedron":
    "turns the <b>Fortuitous Polyhedron</b> and steps into a reality where they passed rather than failed — their last failed Save is a success instead. <i>Referee: undo whatever that failure did.</i> The Polyhedron vanishes.",
  "Bedazzling Blade":
    "flashes the <b>Bedazzling Blade</b> blindingly bright! Opponents must DEX save vs d4 rounds of Blindness.",
  "Fascinator Helm":
    "activates the <b>Fascinator Helm</b>! Biological creatures in visual range must EGO save or be transfixed — unable to move until damaged or the helm leaves view.",
  "Horror Helm":
    "activates the <b>Horror Helm</b>! Biological foes in earshot must make a Morale save or flee.",
  "Sprayflesh":
    "sprays healing pseudoflesh from the <b>Sprayflesh</b> canister onto a Biological target — removes 1 Wound (resolve by hand from the Wounds tab). This does NOT restore lost HP.",
  "The Crimson Cantos":
    "opens <b>The Crimson Cantos</b> and reads aloud — whoever reads it must EGO save or fly into a murderous rage and attack the nearest living creature.",
  "Spirit Prison (Empty)":
    "hurls the empty <b>Spirit Prison</b> at a target! Hypergeometric or outsider creatures must EGO save or be trapped inside forever, to be released at the bearer's pleasure."
};
const bio = { gate: "creature-type", is: "biological" };
const synth = { gate: "creature-type", is: "synthetic" };

// Text only, no use control: a passive reminder (ruling B).
const TEXT_ONLY = ["A Fool's Head", "Agoniser", "All-Purpose Idol", "Black Heart", "Blasphemies of the Binary Demon",
  "Desiccated Mycomorph", "Dried Crypt Lotus", "Flesh of the Honeyed Lamb", "Midas Bomb", "Mirror Ring", "Nightmare Box",
  "Pale Blade of Amun-Oh", "Sandworm Horn", "Singing Crystal", "Sky-seeking Salve", "Unbearable Wax", "Vial of ICE-9",
  "Ansible", "Apocalypse Glass", "Ardar-Eld's Grail", "Autarch's Fork", "Compass of Origin", "Hesitant Urn",
  "Prison Orb of the Miniature Beast", "Serenity Sphere", "Spirit Prison (Occupied)", "The Book of Sand", "Vimana Map",
  "Wind-up Haruspex"];

// Text only, with a usage die: a use reminder paying a usage-die roll (ruling B).
const DIE_NOTES = ["Ardent Maggots", "Demiurge Crayon", "Disguise Ring", "Ditto Gun", "Hard Light Projector", "Hover Boots",
  "Oneiric Bridge", "Philosopher's Bridge", "Portable Hole", "Quantum Umbilical", "Scatter-Shoal Ring", "Snakemaker",
  "Sovereign Glue", "Stormcaller", "Tech Wand", "Ulfire Paint", "Ultra-kinetic Gel"];

// Text only, with charges: a use reminder paying a charge (ruling B).
const CHARGE_NOTES = ["Ammunition Fabricator", "Black Cloud Bomb", "Bounty Beacon", "Cat Ring", "Friend Fabricator",
  "Hedondroid", "Huntsman Fly", "Instant Table", "Lithling Seed", "Pale Fire", "Phase Grenades", "Quantum Daemon Horn"];

const EXOTICA_SENTENCES = {
  ...Object.fromEntries(TEXT_ONLY.map(n => [n, [passiveNote(n)]])),
  ...Object.fromEntries(DIE_NOTES.map(n => [n, [useNote(n, DIE)]])),
  ...Object.fromEntries(CHARGE_NOTES.map(n => [n, [useNote(n, CHARGE)]])),

  /* ---------------- Starting Exotica with more than text ---------------- */
  "Chameleon Cloak": [passiveNote("Chameleon Cloak"),
                      tabNote("Always camouflaged to your surroundings - no roll needed.", "Always Active", "Benefit", "Movement & Environment")],
  // Ruling C (9): light while carried, at the faint tier (the book gives no radius).
  "Ulfire Candle": [{ when: "passive", do: { verb: "emit-light", tier: "faint" }, text: bookText("Ulfire Candle") }],
  "Visualiser Helm": [armourAv(0),
                      tabNote("Involuntarily broadcasts your thoughts as imagery - you cannot hide what you're thinking.", "Always Active", "Detriment", "Social")],

  /* ---------------- Advanced Exotica with more than text ---------------- */
  "Active Camouflage Ring": [{ when: "use", cost: DIE, if: [{ gate: "in-combat" }], target: "self",
                               do: { verb: "special", handler: "combat-av", av: 10, note: "Creatures using unconventional means to see are unaffected - the Referee's call." },
                               for: { duration: "until-combat-ends" }, text: bookText("Active Camouflage Ring") }],
  "Adamant Linen": [armourAv(8)],
  "Amaranthine Sugar": [special("amaranthine-sugar", CHARGE, {}, "Amaranthine Sugar")],
  "Anti-Gravity Field Generator": [say("Anti-Gravity Field Generator", DIE)],
  "Autarch's Nectar": [special("permanent-ability", CHARGE, { delta: 1, count: 3, requiresType: "biological" }, "Autarch's Nectar")],
  "Babel Bomb": [lasting("Babel Bomb", "Babel Bomb", "1", "day", CHARGE)],
  "Bedazzling Blade": [{ when: "use", cost: DIE, target: "all-in-range", says: LINES["Bedazzling Blade"], resist: { type: "save", ability: "dex", vs: "d4 rounds of blindness" },
                         do: { verb: "condition", state: "blind" }, for: { duration: "rounds", amount: "1d4" }, text: bookText("Bedazzling Blade") }],
  "Belligerent Paste": [special("belligerent-paste", CHARGE, {}, "Belligerent Paste")],
  "Biotic Field Generator": [special("field-generator", DIE, { dice: "1d10", targets: ["biological"], field: "Biotic Field", span: { amount: "6", unit: "round" } }, "Biotic Field Generator")],
  "Blue Rust": [special("blue-rust", CHARGE, { ability: "con", dice: "1d6", targets: ["synthetic"] }, "Blue Rust")],
  "Bluescreen Dagger": [{ when: "use", cost: DIE, target: "all-in-range", if: [synth], says: LINES["Bluescreen Dagger"], resist: { type: "save", ability: "ego", vs: "d20 EGO damage" },
                          do: { verb: "ability-damage", ability: "ego", dice: "1d20" }, text: bookText("Bluescreen Dagger") }],
  "Bottled Thicket": [special("hold", CHARGE, { dice: "1d8", escape: { ability: "str", by: "escape the vines" } }, "Bottled Thicket")],
  "C-Foam Puddings": [say("C-Foam Puddings", CHARGE)],
  "Cybernetics Cocoon": [special("cybernetics-capsule", CHARGE, {}, "Cybernetics Cocoon")],
  "Cybernetics Pack": [special("cybernetics-capsule", CHARGE, {}, "Cybernetics Pack")],
  "Desiccation Spike": [{ when: "attack-hit", if: [bio], do: { verb: "ability-damage", ability: "con", dice: "1d6" }, text: bookText("Desiccation Spike") }],
  "Dopplegun": [lasting("Dopplegun", "Dopplegun", "1d6", "round", DIE)],
  "Empathy Bomb": [{ when: "use", cost: CHARGE, target: "all-in-range", if: [bio], says: LINES["Empathy Bomb"], resist: { type: "save", ability: "ego", vs: "being overcome with compassion" },
                     do: { verb: "reminder", name: "Empathy Bomb", effectText: appliesText("Empathy Bomb") }, for: { duration: "hours", amount: "1d4" }, text: bookText("Empathy Bomb") }],
  "Exotic Melee Weapon": [{ when: "stat", baked: true, do: { verb: "create-item", item: "generated melee weapon", generate: "melee" } }],
  "Exotic Ranged Weapon": [{ when: "stat", baked: true, do: { verb: "create-item", item: "generated ranged weapon", generate: "ranged" } }],
  "Fascinator Helm": [armourAv(1), say("Fascinator Helm", DIE)],
  "Fate Inverter": [{ when: "use", cost: DIE, if: [{ gate: "in-combat" }], target: "self", mode: "auto",
                      says: "activates the <b>Fate Inverter</b> — until combat ends, all nearby failed Saves succeed and successes fail, missed attacks hit and hits miss. <i>Flip each result by hand.</i>",
                      do: { verb: "reminder", name: "Fate inverted", effectText: ADVANCED_EXOTICA.find(e => e.name === "Fate Inverter").untilCombatEnd.text },
                      for: { duration: "until-combat-ends" }, text: bookText("Fate Inverter") }],
  "Fortuitous Polyhedron": [say("Fortuitous Polyhedron", CHARGE)],
  "Fuligin Garb": [armourAv(0),
                   tabNote("Always concealed when in shadows - no Save needed.", "Always Active", "Benefit", "Movement & Environment")],
  "Gecko Gloves": [passiveNote("Gecko Gloves"),
                   tabNote("Can climb impossible distances via sticky grip.", "Always Active", "Benefit", "Movement & Environment")],
  "Horror Helm": [armourAv(2), say("Horror Helm", DIE)],
  // Ruling C (6): ADV to hit a Blind target; sneaking has no roll and stays the tab row,
  // trimmed to it in chunk 4 (RULED 2026-10-06, Matt).
  "Hushboots": [{ when: "attack-roll", if: [{ gate: "has-state", is: "blind" }], do: { verb: "adv", on: "attack" }, text: "ADV when sneaking or attacking blind creatures." },
                tabNote("ADV when sneaking.", "Always Active", "Benefit", "Movement & Environment")],
  "Lithifying Ray": [special("body-change", DIE, { itemName: "Lithified", ability: "dex", dice: "1d6", av: 2, targets: ["biological"], atZero: "becomes a remarkably lifelike statue" }, "Lithifying Ray")],
  "Lazarus Cap": [armourAv(1), passiveNote("Lazarus Cap")],
  "Magnetic Orb": [special("metal-pull", DIE, { synthetics: true, synthMind: true }, "Magnetic Orb")],
  "Manifold Box": [{ when: "stat", baked: true, do: { verb: "modify", stat: "inventory-slots", amount: "+10" }, text: bookText("Manifold Box") }],
  "Mind Shield": [armourAv(1),
                  { when: "passive", do: { verb: "forbid", what: "use-gift" }, text: "Cannot use Mystic Gifts." },
                  tabNote("Protects from psychic intrusion. Exempt from Gleam Tests.", "Always Active", "Benefit", "Combat")],
  "Mirror Armour": [armourAv(6), prop("mirrorArmour", "Grants AV 16 and immunity from Beam attacks."),
                    tabNote("Cannot hide in shadows.", "Always Active", "Detriment", "Movement & Environment")],
  // Chunk 5 (RULED 2026-10-06, Matt): the use carries the roster's whole save-gated
  // spec, so save-gated.js reads the sentence rather than the roster by name.
  "Mirror Shield": [armourAv(1), special("save-gated", null, { ...ADVANCED_EXOTICA.find(e => e.name === "Mirror Shield").saveGated }, "Mirror Shield")],
  // Ruling C (3) and (4): no TOX save, and the carapace cannot come off.
  "Moonbeast Carapace": [armourAv(6), immune("tox", "The wearer has AV 16, and immunity to poisons and radiation."),
                         { when: "passive", do: { verb: "forbid", what: "unequip" }, text: "Once donned the carapace cannot be removed." },
                         tabNote("Immune to radiation.", "Always Active", "Benefit", "Combat")],
  "Mord-Red's Grail": [{ when: "use", target: "up-to-n", says: `pours from <b>Mord-Red's Grail</b> — ${bookText("Mord-Red's Grail")}`,
                         do: { verb: "toxin", die: "d12" }, text: bookText("Mord-Red's Grail") }],
  "Not-Sword": [weapon("1d8", { hands: 1 })],
  "Pacifying Glove": [{ when: "use", cost: DIE, target: "all-in-range", if: [bio], says: LINES["Pacifying Glove"], resist: { type: "save", ability: "ego", vs: "falling asleep for d6 hours" },
                        do: { verb: "reminder", name: "Pacifying Glove", effectText: appliesText("Pacifying Glove") }, for: { duration: "hours", amount: "1d6" }, text: bookText("Pacifying Glove") }],
  "Phase Cape": [lasting("Phase Cape", "Phase Cape", "1d4", "round", DIE, { target: "self", mode: "auto" })],
  "Philosopher's Dirk": [{ when: "attack-hit", do: { verb: "ability-damage", ability: "int", dice: "1d4" }, text: bookText("Philosopher's Dirk") }],
  "Presence Drone": [{ when: "passive", do: { verb: "dis", on: "encounter", why: "announced by a pompous drone" }, text: bookText("Presence Drone") }],
  "Psybernetic Helm": [armourAv(1), { when: "on-draw", do: { verb: "add-gift", random: true, once: true }, text: bookText("Psybernetic Helm") }],
  "Singularity Bomb": [{ when: "use", cost: CHARGE, target: "all-in-range", says: LINES["Singularity Bomb"], resist: { type: "save", ability: "dex", vs: "instant death inside the singularity" },
                         do: { verb: "kill" }, text: bookText("Singularity Bomb") }],
  "Spirit Prison (Empty)": [say("Spirit Prison (Empty)", null)],
  "Sprayflesh": [say("Sprayflesh", DIE)],
  "Starskin": [armourAv(6), prop("starskin", "Grants AV 16, and immunity to suffocation."),
               tabNote("Move freely in antigravity.", "Always Active", "Benefit", "Movement & Environment")],
  "Stasis Bomb": [lasting("Stasis Bomb", "Stasis Bomb", "2d6", "round", CHARGE, { target: "all-in-range" })],
  "TALLHAT Amplifier": [armourAv(0), live("int", 1), live("psy", 1), live("ego", 1),
                        tabNote("Identifies you as a Witch of the Mooncradle Mountains - may affect how NPCs react to you.", "Always Active", "Detriment", "Social")],
  "Tempest Cannon": [weapon("1d12", { hands: 2, types: ["blast", "electrical"] }),
                     { when: "use", do: { verb: "refill", what: "usage die", item: "Water Ration", count: 3 }, text: bookText("Tempest Cannon") }],
  "The Crimson Cantos": [say("The Crimson Cantos", null)],
  "Thinking Cap": [armourAv(1), live("int", 2)],
  "Titancreed Fragment: KILL": [say("Titancreed Fragment: KILL", DIE)],
  "Titancreed Fragment: OBEY": [say("Titancreed Fragment: OBEY", DIE)],
  "Titancreed Fragment: SLEEP": [say("Titancreed Fragment: SLEEP", DIE)],
  // Ruling C (9): light while carried; the usage die keeps its use.
  "Ulfire Lantern": [useNote("Ulfire Lantern", DIE), { when: "passive", do: { verb: "emit-light", tier: "faint" }, text: bookText("Ulfire Lantern") }],
  // Ruling C (10): using the visor makes the wearer's ranged attacks auto-hit until the combat ends.
  // Its tab row left in chunk 4 (RULED 2026-10-06, Matt): the sheet applies it.
  "Ultravisor": [armourAv(1), immune("blind", "The wearer has ultravision and can never be blinded or ambushed."),
                 immune("ambush", "The wearer has ultravision and can never be blinded or ambushed."),
                 { when: "use", cost: DIE, if: [{ gate: "in-combat" }], target: "self", do: { verb: "special", handler: "combat-auto-hit", attackKind: "ranged" },
                   for: { duration: "until-combat-ends" }, text: "When the visor is activated, any attack the wearer makes with a ranged weapon automatically hits." }],
  "Universal Ration": [special("universal-ration", null, {}, "Universal Ration")],
  "Wand of Annihilation": [{ when: "use", cost: DIE, target: "up-to-n", mode: "auto", do: { verb: "damage", dice: "1d100", type: "beam" }, text: bookText("Wand of Annihilation") }],
  "Watchful Ferret": [{ when: "passive", do: { verb: "special", handler: "gm-reminder" }, text: bookText("Watchful Ferret") }]
};

const stripUndefined = s => JSON.parse(JSON.stringify(s));

export const EXOTICA_EFFECTS = Object.fromEntries(
  Object.entries(EXOTICA_SENTENCES).map(([name, list]) => [name, { effects: list.map(stripUndefined) }]));

/**
 * An armour Exotica's AV, from its armourAv sentence - the one place the data
 * holds it since Stats as Sentences chunk 2b (ruling C, 2026-10-07: the roster's
 * armorType.avBonus deleted). The builders write it into the Item's AV field.
 */
export function exoticaArmourAv(name)
{
  const s = (EXOTICA_EFFECTS[name]?.effects ?? []).find(x => x.baked && x.do?.verb === "modify" && x.do.stat === "av");
  return s ? Number(s.do.amount) : 0;
}
