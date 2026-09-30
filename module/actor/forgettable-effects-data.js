/**
 * Work-queue item 12 — the character sheet's "Forgettable Effects" tab.
 * Source of truth is Matt's vetted Google Drive review ("Vaarn Item 12 -
 * Forgettable Effects Review (v3)"), approved 2026-08-28 — every row here
 * is a direct transcription of that CSV's Name/Effect Type/Section/
 * Polarity/Proposed Reminder Text columns. Do not add entries here without
 * updating that CSV first; it's the reviewed record of what's excluded and
 * why.
 *
 * `itemType` says how to match this entry against the actor's owned Items:
 * - "mutation"/"implant"/"exotica" — actor has an owned Item of that
 *   Foundry type whose name equals this entry's `name`
 * - "weaponTag" — actor has an equipped weaponMelee/weaponRanged Item
 *   whose system.tags array includes this entry's `name`
 *
 * Rows whose original rules text mixed both polarities in one clause
 * (e.g. Slug Body, Gills, Wings, Blind, Mirror Armour) were split into two
 * atomic rows in the CSV, one per polarity — that split is preserved here.
 *
 * THE REVIEW CSV IS SUPERSEDED as the record of what is here, 2026-09-16.
 * atom-index.csv holds one row per entry on "Forgettable-Effects Tab", and a
 * deletion is recorded there as SUPERSEDED with the reason. RULED 2026-09-16
 * (Matt): an entry whose clause the sheet now APPLIES leaves this tab - the
 * reminder was for situations the player had to remember, and the effect text
 * is still on the Item. Seven left that day (Backwards Legs, Bulbous Eyes,
 * Cyclops, Double Muscled, Extra Legs, Extra Liver, Heightened Immune System);
 * the rest are swept at the end of wiring, on the row "Save-Modifier Effects
 * on the Forgettable Tab". Cyberliver left 2026-09-16 on the same rule.
 *
 * THE SWEEP RAN 2026-09-27 (Matt approved the list). Eleven entries left
 * because the sheet applies the whole note: Backwards Head, Exposed Organs,
 * Powerful Jaws, Tusks, Horns Rhino, Antlers, Heightened Hearing, Air Current
 * Microsensor, and the applied half of Gills (breathe underwater),
 * Bioluminescence (light source) and Mirror Armour (immune to Beam). Eight
 * compound notes were TRIMMED to the clause the sheet does not apply: Gills,
 * Tank Treads, Starskin, Ultravisor, Echolocation, Ultravision, Vigilance
 * Radar, Dreadnaught Carapace. RULED 2026-09-23 (Matt) and kept deliberately
 * although the Long Rest applies them: Obligate Carnivore, Obligate Lithovore,
 * Vampiric - the player needs to know WHY a Stone or Raw Meat is needed before
 * the rest, not after it fails. The rulings are on each atom's tab row.
 */
export const FORGETTABLE_EFFECTS = [
  { name: "Adhesive Touch", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can climb any surface and crawl across ceilings." },
  { name: "Beak", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "This is an EXTRA attack each round - not a replacement for your normal attack. ADV on reaction rolls with bird-like creatures." },
  { name: "Bioelectricity", itemType: "mutation", category: "Utility", section: "Always Active", polarity: "Benefit", note: "Can power small machines if hooked up to them." },
  { name: "Bioluminescence", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "DIS to hide at night." },
  { name: "Blind", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "ADV when fighting in the dark." },
  { name: "Blind", itemType: "mutation", category: "Utility", section: "Always Active", polarity: "Detriment", note: "Cancels the effects of your other visual mutations." },
  { name: "Chameleon Skin", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "ADV to conceal yourself." },
  { name: "Detachable Head", itemType: "mutation", category: "Utility", section: "On-Demand", polarity: "Benefit", note: "Head can detach and move independently for as long as you hold your breath." },
  { name: "Detachable Limb", itemType: "mutation", category: "Utility", section: "On-Demand", polarity: "Benefit", note: "A limb can detach and move independently (blind, touch only, if separated)." },
  { name: "Echolocation", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "ADV when fighting in the dark." },
  { name: "Extra Arms", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "With a second weapon equipped, you can make an extra attack each turn." },
  { name: "Extra Head", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Survive one decapitation." },
  { name: "Feathers", itemType: "mutation", category: "Social", section: "Always Active", polarity: "Benefit", note: "ADV on reaction rolls with feathered creatures." },
  { name: "Fur", itemType: "mutation", category: "Social", section: "Always Active", polarity: "Benefit", note: "ADV on reaction rolls with furry creatures." },
  { name: "Gills", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Become Deprived if the doubled water is not drunk." },
  { name: "Gliding Membranes", itemType: "mutation", category: "Movement & Environment", section: "On-Demand", polarity: "Benefit", note: "Can glide short distances." },
  { name: "Goat Legs", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can walk up sheer surfaces." },
  { name: "Hooks, Climbing", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "ADV to climbing and acrobatics." },
  { name: "Hopper", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can leap huge distances." },
  { name: "Horns, Ram", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "This is an EXTRA attack each round - not a replacement for your normal attack. ADV on reaction rolls with other horned creatures." },
  { name: "Humpback", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can go seven days without drinking water." },
  { name: "Infravision", itemType: "mutation", category: "Utility", section: "Always Active", polarity: "Benefit", note: "Detect heat signatures; see warm-blooded creatures in total darkness." },
  { name: "Insulated Skin", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Half damage from extreme temperatures." },
  { name: "Leaves", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Regain d4 HP per hour resting in sunlight." },
  { name: "Malleable Body", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Fit into tight gaps. Half damage from bludgeoning attacks." },
  { name: "Malleable Face", itemType: "mutation", category: "Social", section: "On-Demand", polarity: "Benefit", note: "Can imitate others' faces, given time." },
  { name: "Obligate Carnivore", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Must eat Raw Meat. Cannot heal using other types of food." },
  { name: "Obligate Lithovore", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Must swallow a Stone each day. Cannot heal using other types of food." },
  { name: "Skeletal Frame", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Detriment", note: "Take double damage from bludgeoning and crushing attacks." },
  { name: "Slimy Skin", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "ADV to escape grab attacks and enclosing traps." },
  { name: "Slug Body", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can stick to sheer surfaces." },
  { name: "Slug Body", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Leaves a trail of mucus (easily tracked)." },
  { name: "Snout", itemType: "mutation", category: "Social", section: "Always Active", polarity: "Benefit", note: "ADV on reaction rolls with Newbeasts." },
  { name: "Stilt Legs", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "ADV in chases/pursuits; wade quickly through flooded areas." },
  { name: "Stilt Legs", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Detriment", note: "Default target for ranged attacks." },
  { name: "Tail, Club", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "This is an EXTRA attack each round - not a replacement for your normal attack." },
  { name: "Tail, Scorpion", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Benefit", note: "This is an EXTRA attack each round - not a replacement for your normal attack." },
  { name: "Toxic Flesh", itemType: "mutation", category: "Movement & Environment", section: "On-Demand", polarity: "Benefit", note: "Flesh is toxic if eaten (d10 TOX)." },
  { name: "Transparent Skin", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Detriment", note: "Take double damage from Beam attacks." },
  { name: "Ultravision", itemType: "mutation", category: "Utility", section: "Always Active", polarity: "Benefit", note: "See invisible creatures/objects." },
  { name: "Vampiric", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Must consume a ration of Fresh Blood each day or become Deprived." },
  { name: "Vocal Mimic",itemType: "mutation", category: "Social", section: "On-Demand", polarity: "Benefit", note: "Can mimic voices/sounds you've heard." },
  { name: "Wings", itemType: "mutation", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Fly freely." },
  { name: "Wings", itemType: "mutation", category: "Combat", section: "Always Active", polarity: "Detriment", note: "Default target for ranged attacks while airborne." },

  { name: "Autoglot HeadBank", itemType: "implant", category: "Social", section: "Always Active", polarity: "Benefit", note: "Understands all languages." },
  { name: "Dazzleskin Filaments", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Immune to laser beams/energy weapons." },
  { name: "Dazzleskin Filaments", itemType: "implant", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "DIS when hiding." },
  { name: "Dopamine Synthesizer", itemType: "implant", category: "Saves", section: "Always Active", polarity: "Benefit", note: "Immune to fear, panic, and embarrassment." },
  { name: "Dorsal Jump-pack", itemType: "implant", category: "Movement & Environment", section: "On-Demand", polarity: "Benefit", note: "Can fly slowly and loudly via hover-jets." },
  { name: "Ferrosteel Exo-Skeleton", itemType: "implant", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Cannot swim." },
  { name: "Finger Syringe", itemType: "implant", category: "Utility", section: "On-Demand", polarity: "Benefit", note: "Hidden finger injector - can be loaded with any elixir or poison." },
  { name: "Hyper-elastic Tendons", itemType: "implant", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can jump across huge distances." },
  { name: "Mercurial Fakeface", itemType: "implant", category: "Social", section: "On-Demand", polarity: "Benefit", note: "Face can alter its features/color at will." },
  { name: "Subdermal Insulation", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Immune to flames, cold, and electricity." },
  { name: "Tactical Bioscanner", itemType: "implant", category: "Utility", section: "Always Active", polarity: "Benefit", note: "Know the Level/AV/HP of any Biological or Fungal creature." },
  { name: "Tactical Technoscanner", itemType: "implant", category: "Utility", section: "Always Active", polarity: "Benefit", note: "Know the Level/AV/HP of any Synthetic creature." },
  { name: "Adaptive Camo-Dermis", itemType: "implant", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "When motionless, you become invisible." },
  { name: "Etiquette HeadBank", itemType: "implant", category: "Social", section: "Always Active", polarity: "Benefit", note: "All reaction rolls are made with ADV." },
  { name: "Cyber Stinger", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "This is an EXTRA attack each round - not a replacement for your normal attack." },
  { name: "Dreadnaught Carapace", itemType: "implant", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Cannot sneak, jump, swim, or ride a steed." },
  { name: "Ferrosteel Ankle Anchors", itemType: "implant", category: "Movement & Environment", section: "On-Demand", polarity: "Benefit", note: "Can immovably anchor yourself to solid surfaces." },
  { name: "Magnetised Palms", itemType: "implant", category: "Movement & Environment", section: "On-Demand", polarity: "Benefit", note: "Can stick yourself to metallic objects." },
  { name: "Omniguts", itemType: "implant", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Inedible materials like stone/metal count as Rations. Must still drink water." },
  { name: "Phoenix Core", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "On death, you can be uploaded into a new body, retaining personality/memories/Abilities/Level." },
  { name: "Pseudowomb", itemType: "implant", category: "Utility", section: "On-Demand", polarity: "Benefit", note: "Given a DNA sample, can incubate a tiny clone of that creature." },
  { name: "Roving Eye", itemType: "implant", category: "Utility", section: "On-Demand", polarity: "Benefit", note: "Removable camera eye - can stick it to a surface for up to a week of visual feed." },
  { name: "Helping Hands", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "With a second weapon equipped, you can make an extra attack each round." },
  { name: "Solar Scaling", itemType: "implant", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Regain d6 HP per hour spent relaxing in direct sunlight." },
  { name: "Tactical Anomaly Scanner", itemType: "implant", category: "Utility", section: "Always Active", polarity: "Benefit", note: "Know the Level/HP/AV/Morale of any Hypergeometric or Outsider creature in visual range." },
  { name: "Tactical Flaw Analysis", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "ADV on to-hit rolls against armoured opponents and vehicles." },
  { name: "Tank Treads", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "ADV on Saves relating to slippery or uneven ground." },
  { name: "Vigilance Radar", itemType: "implant", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Detect motion through walls." },

  { name: "Blasphemous", itemType: "weaponTag", category: "Social", section: "Always Active", polarity: "Detriment", note: "DIS on reaction rolls with followers of the religious leader who cursed you." },
  { name: "Sacred", itemType: "weaponTag", category: "Social", section: "Always Active", polarity: "Benefit", note: "ADV on reaction rolls with followers of the religious leader who blessed you." },
  { name: "Stim-Boosting", itemType: "weaponTag", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Make one extra combat action per round." },

  { name: "Chameleon Cloak", itemType: "exotica", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Always camouflaged to your surroundings - no roll needed." },
  { name: "Hushboots", itemType: "exotica", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "ADV when sneaking or attacking blind creatures." },
  { name: "Gecko Gloves", itemType: "exotica", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Can climb impossible distances via sticky grip." },

  // These 8 all carry an `armorType` field in their source data
  // (advanced-exotica-data.js/chargen-data.js), so item 10.3.2's
  // conversion creates them as real `type: "armor"` Items, not
  // `type: "exotica"` — confirmed via generate-advanced-exotica.js:84.
  // itemType here MUST be "armor" for these, unlike Chameleon Cloak/
  // Hushboots/Gecko Gloves above, which have no armorType and stay
  // real exotica-type Items.
  { name: "Visualiser Helm", itemType: "armor", category: "Social", section: "Always Active", polarity: "Detriment", note: "Involuntarily broadcasts your thoughts as imagery - you cannot hide what you're thinking." },
  { name: "Fuligin Garb", itemType: "armor", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Always concealed when in shadows - no Save needed." },
  { name: "Mirror Armour", itemType: "armor", category: "Movement & Environment", section: "Always Active", polarity: "Detriment", note: "Cannot hide in shadows." },
  { name: "Ultravisor", itemType: "armor", category: "Combat", section: "Always Active", polarity: "Benefit", note: "When activated, ranged attacks auto-hit - skip the to-hit roll and just roll damage." },
  { name: "Moonbeast Carapace", itemType: "armor", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Immune to radiation." },
  { name: "Starskin", itemType: "armor", category: "Movement & Environment", section: "Always Active", polarity: "Benefit", note: "Move freely in antigravity." },
  { name: "Mind Shield", itemType: "armor", category: "Combat", section: "Always Active", polarity: "Benefit", note: "Protects from psychic intrusion. Exempt from Gleam Tests (no Gleam Test mechanic exists in this codebase)." },
  { name: "TALLHAT Amplifier", itemType: "armor", category: "Social", section: "Always Active", polarity: "Detriment", note: "Identifies you as a Witch of the Mooncradle Mountains - may affect how NPCs react to you." }
];
