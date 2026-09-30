/**
 * Faction Registry (foundry-system-index.csv "Faction Registry").
 *
 * The book's eight Major Factions, transcribed whole from the vault's
 * Factions/ directory and confirmed against the CRIMSON HOUND extract.
 * BROUGHT TO JADE IBIS 15-09-26 on 2026-09-21 (Jade Ibis Vault
 * Reconciliation), all eight. The Children of the Darkling Sun's pages
 * are images the JADE extract does not carry; they were read from Matt's
 * screenshot and saved beside the extracts.
 *
 * TRANSCRIBED WHOLE, RULED 2026-09-14 (Matt): "let's go all in - I like
 * being able to have all the info in one place." Only five of the nine
 * sections will ever be READ by a mechanism — allies and enemies feed
 * Faction Relationship Graph, npcs and alliedMonsters were to feed
 * Faction Membership Tag, rep is reference text on Faction Reputation.
 * (Faction Membership Tag was DECLINED 2026-09-17 by Matt, so npcs and
 * alliedMonsters are display data in the faction browser and nothing
 * more.) The other four (intro, summary, goals, joining, triumphant)
 * are lore that
 * is displayed and never computed on. They are here anyway, on his
 * ruling, and the compensating benefit was meant to be that one
 * roster-drift.mjs comparison would then cover the whole of Factions/.
 * FOUND 2026-09-21: roster-drift.mjs has no faction comparison, and
 * nothing else compares this file with the vault. The JADE pass checked
 * it both ways with a scratch script.
 *
 * WIKILINK SYNTAX IS KEPT VERBATIM, following chargen-data.js FINE_ART
 * and macros/generate-flavor-item.js: the DATA keeps the vault's raw
 * "[[Target|Alias]]" so a drift check compares like with like, and the
 * CONSUMER strips it for display. faction-config.js has the stripper.
 *
 * THE AUTARCH FIGMENT TABLE IS DELIBERATELY NOT HERE. It is already
 * transcribed in rolltable-data.js, which carries the matching
 * `source:` pointer at "Factions/The Court of the Jigsaw Autarch.md ::
 * Autarch Figment Effects". A second copy here would be the two-code-
 * files-per-vault-table problem roster-drift.mjs exists to catch. The
 * Court's entry names the RollTable instead.
 *
 * THE BOOK'S OWN LIST IS NOT UNIFORM and this roster carries that
 * rather than tidying it. Every irregularity below is the book's, was
 * checked against CRIMSON HOUND 07-05-26 on 2026-09-14 and against JADE
 * IBIS 15-09-26 on 2026-09-21, and is not a transcription gap:
 *
 *   - Cacklemaw Clans has TWO goals where the others have three, and
 *     its Allies and Enemies are the prose "Nobody." and "Everyone."
 *     standing where a list would be. Neither is a link, so neither
 *     carries a `faction`.
 *   - Titan Cults allies with "Powerful Synthetic Creatures" and the
 *     Children with "Other Worshippers of Azathoth". Both name things
 *     that are not factions.
 *   - The Court of the Jigsaw Autarch prints Autarch Figment Effects
 *     as well as its REP table, where the other seven print REP alone.
 *     WITHDRAWN 2026-09-19: this entry used to say the Court had NO REP
 *     table and was the only faction with `rep` null. That was read off
 *     the CRIMSON HOUND extract, where the heading is absent — but so
 *     is the Darkling Sun's, which the vault has carried all along, so
 *     the extract never supported the claim. JADE IBIS 15-09-26 prints
 *     the Jigsaw Court table; the vault was missing it and now has it.
 *     An extract miss means unreadable, never "the book dropped it".
 *   - Seekers of Eyeless Wisdom and the Children of the Darkling Sun had
 *     no Joining text in CRIMSON HOUND, which printed a literal "xx" for
 *     both; JADE IBIS prints both. `joining` stays nullable so a Referee's
 *     own faction, or a book entry with none, renders as unwritten rather
 *     than as an editorial line presented as book text.
 *   - Seekers carries an extra prose section, The Gestalt Choirs, which
 *     no other faction has. It is `aside`.
 *   - Three factions list monsters, all under "Possible Allied
 *     Monsters" in JADE IBIS: Faa Nomads, the Court (new in JADE) and
 *     Titan Cults. CRIMSON HOUND headed the Faa's "Allied Monsters", so
 *     the heading is stored per faction and not assumed.
 *   - The Children Triumphant is a POEM, not prose. `verse: true`.
 *   - Faa Nomads lists the Lithic Lyceum as an ally with no comment at
 *     all, so that entry's `text` is "".
 *
 * LITHIC LYCEUM WAS A STUB AND IS NOT ONE NOW. SABLE GECKO 07-04-26
 * printed every field of that entry as "xx"; CRIMSON HOUND wrote it in
 * full. The vault file was corrected on 2026-09-14 before this roster
 * was written — see the Reconciliation Scope Blind Spot row for why
 * that drift survived the edition pass.
 *
 * KEYED BY NAME, following gambit-config.js, which Matt approved
 * 2026-09-11 for the same storage problem. A faction's `name` is what
 * world state stores against — a hidden entry, a Referee's addition, and
 * later a character's REP. Renaming a book faction would therefore
 * orphan whatever is stored against the old name; the book names are
 * stable and nothing renames them, but that is the exposure.
 */

/** The book's eight Major Factions, in the order Factions.md lists them. */
export const FACTIONS = [
{
  name: "The New Hegemony",
  vault: "Factions/The New Hegemony.md",
  intro: [
    "The New Hegemony, that gilt and grasping corpse-empire, lies to the south of the blue lands of Vaarn, outside the ken of many Vaarnfolk. That being true, the Hegemony has long extended its reach into the blue ruins. The Hegemon has decreed all of Vaarn a province of His suzerainty, and red-coated Legionaries patrol the lapis badlands, aiming to bring Hegemonic Law to the wandering Faa tribes and the cacogenic hamlets clustering around the scant water-holes. Further afield, Hegemony privateers raid and barter wherever fortune calls them, most little better than bandits brandishing the Hegemon's seal and writ alongside fearful weaponry."
  ],
  summary: [
    "A proud, expanding true-kin empire. The Hegemony's heartlands and capital city lie far to the south of Vaarn. The Hegemon claims all of Vaarn as sovereign territory, but his troops only have a meaningful presence in the southern badlands.",
    "Hegemony soldiers are well-trained and equipped with firearms and military cybernetics preserved from the Long Ago. However, they have struggled to adapt to Vaarn's harsh climate and enormous travel distances. Few believe such a vast landscape can ever be 'civilised'.",
    "Vaarn is considered the most dangerous and least lucrative of all Hegemony postings. Hegemony commanders and consuls are often assigned to Vaarn as punishment or because they lack family connections to secure better posts.",
    "The Hegemony uses divide and conquer tactics, favouring one warring faction of Vaarn's peoples over another in order to slowly weaken both groups. The Hegemony's diplomats and arms dealers are as dangerous as their soldiers."
  ],
  goals: [
    { name: "Resource Extraction", text: "Trade goods, slaves, and relics of the Long Ago must flow from Vaarn to the Hegemony heartlands." },
    { name: "Tighten Grip", text: "Armed groups and monsters destabilising Hegemony interests must be subjugated or destroyed." },
    { name: "Maintain Normality", text: "The Hegemony is ideologically opposed to hypergeometric manipulation and other paradoxes of space-time. Technology and creatures inducing such effects must be destroyed or brought under the control of Hegemon Exorcists." }
  ],
  // The vault links the SINGULAR "Faa Nomad" here (a bestiary page) and
  // aliases it to the plural. Kept verbatim; `faction` resolves it.
  allies: [
    { target: "[[Faa Nomad|Faa Nomads]]", faction: "Faa Nomads", text: "Some tribes have allied with the Hegemony, acting as scouts and auxiliaries in exchange for protection of their hunting grounds and holy places. The Hegemony view these alliances as short-term, to be broken as soon as expedient." }
  ],
  enemies: [
    { target: "[[Cacklemaw Clans]]", faction: "Cacklemaw Clans", text: "The Cacklemaw have resisted attempts at alliance, returning Hegemony diplomats without their eyes and tongues. Hegemony directives order the creatures to be killed on sight." },
    { target: "[[Seekers of Eyeless Wisdom]]", faction: "Seekers of Eyeless Wisdom", text: "The Seekers' psychic prowess and refusal to negotiate have made them official enemies." },
    { target: "[[The Court of the Jigsaw Autarch|Court of the Jigsaw Autarch]]", faction: "The Court of the Jigsaw Autarch", text: "The goal of expanding hypergeometric Labyrinth-space is directly opposed to the Hegemony's desire to maintain normality." }
  ],
  alliedMonsters: null,
  joining: [
    "True-kin PCs can swear an oath to serve the Hegemon and enter the staff of a Hegemony Consul or serve as a Legionary.",
    "PCs from other ancestries may find work as scouts, translators, advisors, or irregular soldiers. They will never be considered full citizens or given command over Hegemony troops."
  ],
  triumphant: { verse: false, lines: [
    "Vaarn subdued by the Hegemony becomes a bounded land, fenced and observed and catalogued and regulated. Not a cactus can flower or a bird hatch without Hegemony officials cataloguing it and recording its worth. All free peoples are subjected to Hegemonic Law and taxed to the limit of their endurance. Vaarn's monsters are extinct, their lineages permitted to exist only in menageries or weapons research facilities. Is such a grand taming possible? Most Hegemony commanders do not believe it, but this is what they strive for regardless."
  ] },
  npcs: ["[[Hegemony Centurion]]", "[[Hegemony Legionary]]"],
  aside: null,
  rollTable: null,
  rep: [
    { rep: "+1", actions: "Gift an item of Exotica; gift trade goods (20 trade value or higher); swear loyalty oath to Hegemony Consul or General" },
    { rep: "+2", actions: "Deliver captive bandits to face Hegemony trial; capture or kill notorious Cacklemaw or Faa leader" },
    { rep: "+3", actions: "Defend Hegemony settlement or fort from attack; remove hostile faction from a settlement or stronghold" },
    { rep: "+4", actions: "Eliminate a hostile faction from a region of Vaarn; ensure Hegemony stranglehold over major source of resources or revenue" }
  ]
},
{
  name: "Faa Nomads",
  vault: "Factions/Faa Nomads.md",
  intro: [
    "The travelling people of the great blue desolation. Millennia ago, the ancestors of the Faa bestowed upon their children gene-sculpted adaptations to the harsh conditions of the Vaarnish wastes. Chief amongst the changes was to their skin and hair, which have taken on a blue pigmentation matching Vaarn's sands. Clad in blue robes, the nomads become invisible amongst the azure dunes and rocks. The Faa boast a modified metabolism allowing them to live for extended periods without taking in water, their sweat and saliva collected and recycled by subdermal biomechanisms. Even the eyes of the Faa have been sculpted to survive in the desert, as nomads possess a second set of translucent eyelids, protecting their vision during sandstorms. The Faa are famously unable to produce tears, another modification prioritizing water retention above all."
  ],
  summary: [
    "Blue-skinned nomads, who have long travelled the wastes of Vaarn. They have unmatched knowledge of the desert, of its storms and stillnesses, and of the strange fauna and flora inhabiting its desolation.",
    "The Faa are not a single culture, but a mosaic of overlapping families and tribes sharing genetic adaptations and a lingua-franca known as the Faatongue.",
    "Faa groups are wildly varied in beliefs and lifestyles, as unlikely to agree as they are to shed tears.",
    "Faa can be found everywhere in Vaarn, from the shadow of the Great Wall to the markets of Gnomon and the fortress monasteries speckling the Lazul Mountains, and in each place, there is no concordance on what it means to be Faa.",
    "Some Faa tribes have vowed to expel the New Hegemony from Vaarn, while others work alongside the Hegemon's Legions as interpreters, trackers, and auxiliary soldiers."
  ],
  goals: [
    { name: "Survival", text: "Most Faa Tribes have one goal: survive another day, and secure food and water for themselves and their children. For some Faa, this has led them into a pact with the New Hegemony." },
    { name: "Cultural Preservation", text: "Each Faa group has its own songs, its own customs, and its own mysteries. The soul of the people must survive alongside their bodies." },
    { name: "Expel the New Hegemony", text: "Tribes who have not accepted an accord with the New Hegemony view the expanding true-kin empire with disgust and dread. Resistance is brewing, and blue-clad warriors make frequent raids into Hegemony territory." }
  ],
  allies: [
    { target: "[[Seekers of Eyeless Wisdom]]", faction: "Seekers of Eyeless Wisdom", text: "The Seekers have inhabited Vaarn almost as long as the Faa, and the two groups have learnt the utility of working together." },
    // The book gives this ally no comment at all. Not a missing transcription.
    { target: "[[Lithic Lyceum|The Lithic Lyceum]]", faction: "Lithic Lyceum", text: "" },
    { target: "[[Titan Cults]]", faction: "Titan Cults", text: "The Cults have long cultivated kinship with Faa Tribes, considering their expertise in travelling Vaarn's desert a valuable resource." }
  ],
  enemies: [
    { target: "[[The New Hegemony]]", faction: "The New Hegemony", text: "Although some Faa have enlisted with the Hegemony out of self-preservation, Hegemony leadership have no loyalty to their trackers and translators. All will be resettled or eliminated once their usefulness is spent." },
    { target: "[[Cacklemaw Clans]]", faction: "Cacklemaw Clans", text: "The Cacklemaw are ancestral enemies to the Faa, and both groups kill the other on sight." },
    { target: "[[The Children of the Darkling Sun|Children of the Darkling Sun]]", faction: "The Children of the Darkling Sun", text: "The ascent of Star Wormwood is blasphemy to the Faa, who are well aware of the dangers posed by the Children." }
  ],
  alliedMonsters: { heading: "Possible Allied Monsters", names: [
    "Tamed [[Sandworm (Juvenile)|Juvenile Sandworm]]",
    "[[Sandworm (Adult)|Adult Sandworm]], used for riding",
    "Tamed [[Amaranthine Death-Worm]]",
    "Tamed [[Leopard Worm]]"
  ] },
  joining: [
    "Membership of Faa Tribes is hereditary and cannot be bestowed on outsiders. Any respectful guest of a tribe can find acceptance by proving their skill, bravery, and compassion."
  ],
  triumphant: { verse: false, lines: [
    "A Vaarn in which the Faa triumph is one of unbounded emptiness and unbroken chains of tradition. An austere and pitiless place these sands will remain, traversed by sandworms and restless groups of nomads. A lonely Vaarn, a thirsty Vaarn, a Vaarn in which one is beholden only to one's ancestors and the wit and faith that sustained them through millennia. Ever-roving and ever-seeking, a world of leaves blowing in the great winds of fate. In this way shall pass all days until the sun is finally extinguished and Urth is swallowed by darkness and ice."
  ] },
  npcs: ["[[Faa Nomad (bestiary)]]", "[[Faa Sniper]]"],
  aside: null,
  rollTable: null,
  rep: [
    { rep: "+1", actions: "Gift an item of Exotica; gift trade goods (20+ trade value); save life of Faa Tribe member" },
    { rep: "+2", actions: "Kill Hegemony or Cacklemaw leader; return looted heirloom or religious icon" },
    { rep: "+3", actions: "Defend Faa stronghold or campsite; secure new source of water for Faa" },
    { rep: "+4", actions: "Eliminate a hostile faction from a region; inflict serious military defeat on Hegemony" }
  ]
},
{
  name: "Cacklemaw Clans",
  vault: "Factions/Cacklemaw Clans.md",
  intro: [
    "They are newbeasts of a sort, although they disdain masks and seek no approval from humankind. In form, [[Cacklemaw|cacklemaw]] are hyena-headed women, standing seven feet or more with three-fingered hands and a terrible strength in their lanky limbs. The oaths that bound them as warriors in service of the Fallen Autarchy are long-since broken, and these creatures are now a blight upon humanity, killing and abducting at will and mounting daring raids into Hegemony territory. They respect strength alone, and perhaps they would have overrun the Urth by now if it was not for the constant intra-family bloodletting, as younger cacklemaw challenge their elder sisters for status."
  ],
  summary: [
    "Raucous, deranged hyena-women. They once served as terror troops for the [[Autarchs]] and have vexed the other cultures of Vaarn for millennia, being the most violent and chaotic of all the sentient creatures in the blue desert.",
    "The creatures are famed for their screaming laughter, their love of practical jokes, and for Grim-Grins, grisly puppets made from the remnants of dead foes. Their religion is not well understood, for rites are closed to outsiders, but it is known to revolve around a fool-capped puppet-demoness named 'Grand-Mama Punch', to whom they devote wild rites of bloodletting and clowning.",
    "Every cacklemaw is female. The secrets of their reproductive cycle are closely guarded. Some theorise there is a hidden caste of males, which outsiders are not allowed to meet. Other theories about cacklemaw reproduction are even more outlandish and will not be reprinted here.",
    "The Cacklemaw thrive on internal conflict. Younger individuals are constantly challenging their elders for status. At the top of the pile is the 'War Mama', an experienced and ruthless Cacklemaw commander who has returned alive from countless duels."
  ],
  // TWO goals. The other seven factions have three; the book gives this
  // one two, and a third was not dropped in transcription.
  goals: [
    { name: "Keep Moving", text: "Cacklemaw clans are voracious and highly mobile. The creatures are easily bored and must keep moving to seek out novelty. They are territorial and do not tolerate other clans. These two facts lead to the major clans travelling on erratic but constrained routes through Vaarn." },
    { name: "Keep Laughing", text: "The Cacklemaw prize their entertainment as the highest goal in life. Unfortunately, what entertains them is often death, dismemberment, and suffering." }
  ],
  // Prose standing where a list would be — neither of these is a link.
  allies: [
    { target: "Nobody.", faction: null, text: "The Cacklemaw make no alliances and rarely take prisoners. They are equally despised by [[The New Hegemony|the New Hegemony]], [[Faa Nomads|the Faa]], and [[The Children of the Darkling Sun|the Children of the Darkling Sun]]." }
  ],
  enemies: [
    { target: "Everyone.", faction: null, text: "The Cacklemaw clans do not even tolerate one another for more than a few days before falling into conflict." }
  ],
  alliedMonsters: null,
  joining: [
    "Non-Cacklemaw PCs cannot become members of a Cacklemaw clan. [[Cacklemaw Exile|Cacklemaw exiles]] can never rejoin the clan they were exiled from but may join other clans through the traditional ritual of killing a current member in mutually declared close combat. Attacking from ambush, poisoning, etc. are not considered fair for the purposes of this initiation ritual."
  ],
  triumphant: { verse: false, lines: [
    "Final victory for the Cacklemaw clans would be the end for all other sentient creatures in Vaarn, who would be consumed in a neverending orgy of slaughter and laughter. All settlements consumed by funeral pyres, and all strongholds cracked like eggs, the horizon itself lost behind the haze of corpse-smoke. All blades bloodied and all faces made alike by rictus smiles.",
    "Fortunately, the Cacklemaw show no sign of being able to unite under a single leader."
  ] },
  npcs: ["[[Cacklemaw]]", "[[Cacklemaw Virago]]"],
  aside: null,
  rollTable: null,
  rep: [
    { rep: "+1", actions: "Gift the head of an enemy commander; gift an Exotic Weapon; gift a large amount of booze or drugs" },
    { rep: "+2", actions: "Assist in the sacking and burning of a small settlement; trick another Cacklemaw clan and make them look stupid" },
    { rep: "+3", actions: "Assist in the sacking and burning of a town; trick the Hegemony in a funny and lethal way" },
    { rep: "+4", actions: "Assist in the sacking and burning of a major city; completely eliminate any faction from the local area" }
  ]
},
{
  name: "Seekers of Eyeless Wisdom",
  vault: "Factions/Seekers of Eyeless Wisdom.md",
  intro: [
    "Self-knowledge and spiritual purity are achieved not through enlightenment, but through a slow and patient process of endarkenment. There are other powers in this grand and mysterious cosmos that require no light to thrive. Should the residents of Urth not therefore seek to follow their example? There are other sources of illumination than the red and ailing star wallowing in the sable vastness of the heavens. We speak, of course, of the interior illumination that comes when one has renounced all prosaic and urthly sights.",
    "Not all blind beggars who sit besides crossroads in Vaarn are sightless, as the compassionate might suppose, due to misfortune. Some chose the dark."
  ],
  summary: [
    "The Seekers are a remnant of synchronistic religious/scientific programs that attempted to expand human consciousness in the lost ages of Urth. Their holy colour is yellow, and their sigil a helix-weeping eye.",
    "Seekers blind themselves as part of a series of escalating mutilations intended to boost their precognitive and telekinetic abilities. Pale and emaciated, they live ascetic lives underground. The most exalted Seekers are tongueless and footless, relying entirely on psychic abilities to move and speak.",
    "The seat of the sect's power is a chain of temple complexes buried beneath Vaarn's northern mountains, each temple but a cell in a great lightless honeycomb. Generations of Seekers live, work, and die without ever coming to the surface. In Vaarn's deserts, smaller bands of itinerant Seekers pursue esoteric goals on behalf of the sect."
  ],
  goals: [
    { name: "Birth the God-Eye", text: "The Seekers pursue psychic power beyond all other goals. Over generations of genetic manipulation and psychic training, they aim to breed a powerful mystic prophesied as the God-Eye, the One Who Maps the Eyeless Path." },
    { name: "Recruit Promising Psychics", text: "The Seekers are always looking for new, brightly shining minds to induct into their order. Any PC displaying high levels of Psychic Gleam will be approached by Seeker missionaries." },
    { name: "Purge Psychic Threats", text: "Powerful psychics not suborned to the will of the Choirs and the Eyeless Path must be eliminated." }
  ],
  allies: [
    { target: "[[Faa Nomads]]", faction: "Faa Nomads", text: "Many tribes adhere to the Eyeless Path, bringing their psychically gifted offspring to Seeker Temples." }
  ],
  enemies: [
    { target: "[[The New Hegemony]]", faction: "The New Hegemony", text: "Hegemonic doctrine is at odds with the Seekers' posthuman quest for transcendence. As the Hegemony expands into Vaarn, dedicated teams of anti-psychic hunters are recruited to combat the Gestalt Choirs." },
    { target: "[[Titan Cults]]", faction: "Titan Cults", text: "The Cults seek the restoration of the Machine Gods and will not allow the ascension of the God-Eye." },
    { target: "[[The Children of the Darkling Sun|Children of the Darkling Sun]]", faction: "The Children of the Darkling Sun", text: "The Seekers best understand the threat to reality posed by the dreams of the Children. The two factions have waged psychic war for millennia and are in heated competition for the allegiance of talented mystics." }
  ],
  alliedMonsters: null,
  // CRIMSON HOUND printed a literal "xx" here; JADE IBIS 15-09-26 prints
  // the text, transcribed 2026-09-21.
  joining: [
    "The Seekers are always searching Vaarn for promising psychics. Any PC who displays aptitude with [[Mystic Gifts]] is likely to be contacted by the sect before long. Those who decline the offer of membership are considered obstacles to the Eyeless Path."
  ],
  triumphant: { verse: false, lines: [
    "Quench your lamps and sound your trumpets, for the God-Eye walks amongst us. A new Age of Dark falls upon us like an anti-dawn. He Who Maps the Eyeless Path has a gift of prescience which extends to the thousandth alter-nativity, and his sight-beyond-sight cuts through the querling hallways of Time to locate the destiny we must grasp. Away with doubt! Away with despair! Seekers no longer, for we have found the Eyeless Path, and our yellow banners shall fly from every stronghold and temple, and all the Urth shall be but a tool in the God-Eye's hands."
  ] },
  npcs: ["[[Seeker of Eyeless Wisdom]]", "[[Master of Eyeless Wisdom]]"],
  // Unique to this faction — no other Major Faction carries an extra section.
  aside: { heading: "The Gestalt Choirs", paragraphs: [
    "Seekers combine minds into **Gestalt Choirs**, massive group-consciousnesses performing psychic feats no single mind could do alone. While singing in these Choirs, their bodies are tended to by other Seekers.",
    "Gestalt Choirs may be formed or disbanded for many reasons, but three are always singing: The **Choir of Honey-Dappled Clouds**, obscuring Seeker temples from psychic view; the **Choir of the Immanent Lamp**, mapping the sect's possible futures; and the **Choir of the Yellow Hand**, governing logistics and daily life within the sect."
  ] },
  rollTable: null,
  rep: [
    { rep: "+1", actions: "Gift an item of Exotica; symbolically blind self with yellow bandages; save the life of a Seeker" },
    { rep: "+2", actions: "Recruit a fledgling psychic (Level 4 or lower) for the Seekers; ritually blind self and pledge service to the Eyeless Path; kill a notable Child of the Darkling Sun" },
    { rep: "+3", actions: "Remove a Darkling Sun cabal from a settlement or fortress; ritually remove a limb and pledge one's life to the Eyeless Path; recruit a powerful psychic (Level 5+) for the Seekers" },
    { rep: "+4", actions: "Eliminate a hostile faction from a whole region; establish Seeker control over a major settlement" }
  ]
},
{
  name: "The Court of the Jigsaw Autarch",
  vault: "Factions/The Court of the Jigsaw Autarch.md",
  intro: [
    "Once, there was a powerful man who was afraid to die. He feared death so greatly that he visited upon himself an even greater misfortune. He had his wise men forge a knife so sharp it could slice open the sky, and he cut out his own breath from his body. He cut the tears from his eyes and the voice from his mouth. He cut the blood from his heart and the bile from his belly. He cut the salt from his sweat and the shadow from his feet. He cut away his tongue and eyes and toes, skin and muscles, guts and veins, until all that was left was a hand holding a knife. Then at last, the hand turned the knife upon itself, and the fearful man was gone. He had become nothing, and nothing cannot die.",
    "But nothing cannot live either, and this is what the great man became: a voice without a mouth, a hand without an arm, a heart without blood, a shadow without a body. Standing outside our world looking in, a portrait crawling outside the frame and freezing there. He is always beside us, in a place neither within nor beside nor beneath but entirely elsewhere."
  ],
  summary: [
    "The courtiers of an arrogant Autarch, who sought to cheat death by dividing himself into 999 hypergeometric figments. He gained immortality but became a ghastly mosaic of paradoxical flesh and manifold nerves, unable to move of his own accord.",
    "Each courtier has accepted a fragment of their Autarch into themselves, replacing part of their body with the immortal flesh of the Jigsaw Autarch. In this way, he exists within each of them, sharing his longevity and strength with his courtiers.",
    "Courtiers may access the Labyrinth of hypergeometric passages beyond and outside Vaarn. In the middle of this paradox of paths is the Jigsaw Palace, where the undying corpse of the Autarch holds court.",
    "The Court is a secret organisation, whose existence is not documented outside of a few obscure texts. Courtiers conceal their true nature, hiding the figments of their Autarch under bandages and veils."
  ],
  goals: [
    { name: "Reassemble the Jigsaw Autarch", text: "His courtiers wish to piece back together their overlord, assembling his hypergeometric body and allowing him to live within the lucid world once more. He will establish dominion over the Urth, and his chosen will live as gods alongside him." },
    { name: "Expand the Labyrinth", text: "The Jigsaw Autarch's palace stands within the hypergeometric madness of Labyrinth space. His courtiers seek always for new ways to expand the Labyrinth's slow and patient spread, to prepare the Urth for their Autarch's reign." },
    { name: "Recover the Lost Figments", text: "Thirteen figments of the Jigsaw Autarch are lost, having vanished along with their bearers. Reassembly cannot succeed until they are recovered and reunited with their brethren." }
  ],
  allies: [
    { target: "[[The Children of the Darkling Sun|Children of the Darkling Sun]]", faction: "The Children of the Darkling Sun", text: "The Children also seek to usurp lucid reality in the name of Azathoth, the Daemon Sultan. The two cults have much in common, despite having no love for one another." }
  ],
  enemies: [
    { target: "[[The New Hegemony]]", faction: "The New Hegemony", text: "The Hegemony's devotion to normality and the preservation of rational spacetime severely hinders the Court's goals. They seek any chance to undermine the Hegemony." },
    { target: "[[Seekers of Eyeless Wisdom]]", faction: "Seekers of Eyeless Wisdom", text: "The Seekers view hypergeometric augmentation as a parasite upon human evolution. Holding a figment of the Jigsaw Autarch is heresy and punishable by death." },
    { target: "[[Titan Cults]]", faction: "Titan Cults", text: "The ascension of the Jigsaw Autarch is not allowed by any Cult, as it usurps the primacy of the Machine Gods." }
  ],
  // New in JADE IBIS 15-09-26, under the same heading Titan Cults uses.
  alliedMonsters: { heading: "Possible Allied Monsters", names: [
    "[[Hollow Maiden]]",
    "[[Jollyhoss]]",
    "[[Planeyfolk (bestiary)|Planeyfolk]]",
    "[[Unfolder]]"
  ] },
  joining: [
    "Membership is open to anyone willing to swear an oath of service to the Jigsaw Autarch and accept a hypergeometric figment of his eternal flesh being grafted onto their mortal shell. See the Autarch Figment table below for the effects of this figment."
  ],
  triumphant: { verse: false, lines: [
    "The Labyrinth rises in an irresistible tide. Urth's flesh is lacerated with fractal wounds. Each room becomes a threshold, doors leading to yet more doors, holes in all horizons which draw one's eye ever deeper into a multiplicity of impossible courtyards and tunnels lit by other moons and other suns. Lucid geometry is but a memory, and all kingdoms and provinces are absorbed into the grounds of the Jigsaw Palace. The sea drains away, and the winds whistle through lurid cracks in the firmament. Along these lunatic highways parade the Jigsaw Autarch and his courtiers, rejoicing for Vaarn entire has fallen into his manifold hand."
  ] },
  npcs: ["[[Jigsaw Courtier]]", "[[Unfolder]]"],
  aside: null,
  // The rows live in rolltable-data.js under this exact name. Named, not copied.
  rollTable: { heading: "Autarch Figment Effects", name: "Autarch Figment Effects" },
  // PRESENT AFTER ALL, CORRECTED 2026-09-19 (Matt: "court has none is
  // FALSE"). This read `rep: null` with a comment calling the Court the
  // only faction without a REP table, on the strength of the phrase
  // "REP GAINING JIGSAW COURT REPUTATION" being absent from the CRIMSON
  // HOUND 07-05-26 text extract. JADE IBIS 15-09-26 carries it, and the
  // extract is not evidence of absence either way: the Darkling Sun
  // table is the mirror case, present in the CRIMSON HOUND extract and
  // missing from the JADE IBIS one while sitting in the vault the whole
  // time. The book prints this table BEFORE the Autarch Figment table,
  // which is why the +2 row says "see above" of a table stored below.
  rep: [
    { rep: "+1", actions: "Gift a Hypergeometric Codex; swear fealty to the Jigsaw Autarch" },
    { rep: "+2", actions: "Open a new gateway into the Labyrinth; erase evidence of the Court's existence; accept an Autarch Figment into own body (see above for effects)" },
    { rep: "+3", actions: "Find information pointing towards one of the thirteen lost Figments; sink a building or ruin into the Labyrinth" },
    { rep: "+4", actions: "Recover one of the thirteen lost Figments; kill or corrupt a legendary foe of the Court; ensnare a major settlement or fortress within the Labyrinth" }
  ]
},
{
  name: "Titan Cults",
  vault: "Factions/Titan Cults.md",
  intro: [
    "The great machine suzerains of Urth are long-dead, their ego-engines scrubbed clean by weaponised logicphages. The quiet and colossal ruin of their final thoughts is sealed beneath Vaarn in decaying lattices of memory-crystal, their personalities entombed within miles of neural network-shunts lying, cold and shattered, in bunkers beneath the mountains.",
    "[[The Titans]] are dead, they say, but what mortal arts once birthed, mortal arts could restore. Titan Cults, devoted to untangling these sacred mysteries, are found throughout Vaarn."
  ],
  summary: [
    "The worshippers of the Titan AIs, seven god-like machine consciousnesses that once ruled Vaarn before their destruction during the apocalypse known as the Titanomachy.",
    "Titan Cultists are revanchists, seeking to restore the Titan AIs to their former glory through arcane science and mystical rites.",
    "Most Titan Cultists are synths who claim direct descent from the Machine Gods. Some sects allow flesh and blood members, although biological beings will never be accepted into the highest ranks.",
    "Different cults venerate different aspects of the seven Titans. A cult dedicated to GAEA, Mother of the Sacred Helix, will be different from one dedicated to KRONOS, Father of the Titans. However, all share the goal of rebooting their dead masters."
  ],
  goals: [
    { name: "Reboot the Titans", text: "All Titan Cults are driven by the desire to see the Titan AIs rise again." },
    { name: "Unurth Vaarn's Secrets", text: "The keys to reviving the Titans do not lie on the desert surface, but far beneath it, in the deepest of Vaarn's vaults. Each fragment of esoteric knowledge brings them one step closer to reviving the Machine Gods." },
    { name: "Self-Optimise", text: "All cult members strive for perfection, both physical and mental. Biological cultists are encouraged to augment themselves with cybernetics." }
  ],
  allies: [
    { target: "[[The New Hegemony]]", faction: "The New Hegemony", text: "While the Hegemony's leadership do not believe the resurrection of the Titans is possible, they have allowed Cult membership to take root within their ranks. Their veneration of arcane technology makes the Hegemony soldiers ideal cultists." },
    { target: "[[Faa Nomads]]", faction: "Faa Nomads", text: "Some Faa are convinced of the Titan Cults' creed and aid them in their searches through the deep desert." },
    // Not a faction.
    { target: "Powerful Synthetic Creatures", faction: null, text: "Some of Vaarn's most potent synths were created by the Titans and remember their rule fondly. They will aid Titan Cults, if called upon." }
  ],
  enemies: [
    { target: "[[Seekers of Eyeless Wisdom]]", faction: "Seekers of Eyeless Wisdom", text: "The Seeker's goal of birthing the God-Eye is a direct challenge to the primacy of the Titans and cannot be tolerated by the Cults." },
    { target: "[[The Court of the Jigsaw Autarch]]", faction: "The Court of the Jigsaw Autarch", text: "The Court's efforts to erode rational space-time are blasphemy against the Titans, the only intelligences worthy of hypergeometry. Titan Cultists are sworn to kill bearers of Autarch Figments on sight." },
    { target: "[[The Children of the Darkling Sun|Children of the Darkling Sun]]", faction: "The Children of the Darkling Sun", text: "Much like the Court, the Children's reality-warping plans cannot be allowed, for the Star Wormwood would eclipse the Machine Gods." }
  ],
  alliedMonsters: { heading: "Possible Allied Monsters", names: [
    "[[Argent Shepherd]]",
    "[[Exemplar]]",
    "[[Quicksilver Exterminator]]",
    "[[Scythesliver]]",
    "[[Void Dragon]]"
  ] },
  joining: [
    "Synthetic PCs are likely to be accepted. Prospective members are baptized with Pale Ikor, the coolant fluid of the Titan AIs, and must swear oaths of loyalty and restoration."
  ],
  triumphant: { verse: false, lines: [
    "Restoration of the Titans is a scarcely imaginable goal. Their return will reorder the whole Urth, as long-buried engines of destruction and creation stir once more and slumbering girdles of satellite installations flare into life. Tidal waves, continent-spanning storms, and showers of strange meteors panic Urth's inhabitants. Oracles choke on their own tongues, and packs of hounds run wildly through city streets. There is no guarantee the rebooted Titans are still sane, having suffered such extensive damage during the Titanomachy. A new Age of Terror and Wonder has arrived."
  ] },
  npcs: ["[[Chromepriest]]", "[[Titan Acolyte]]"],
  aside: null,
  rollTable: null,
  rep: [
    { rep: "+1", actions: "Gift an item of Exotica; accept baptism with Pale Ikor and swear oaths of restoration" },
    { rep: "+2", actions: "Lead Titan Cultists to a vault in search of buried secrets; kill the bearer of an Autarch Figment; slay a notable Child of the Darkling Sun" },
    { rep: "+3", actions: "Protect Titan Cultists on a pilgrimage to a distant Titan AI memory bank; establish the worship of the Titans in a new settlement; eliminate Seeker presence from a settlement or stronghold" },
    { rep: "+4", actions: "Find credible information that would aid in restoring the Titan AIs; eliminate Darkling Sun presence from a region; eliminate Jigsaw Court presence from a region" }
  ]
},
{
  name: "The Children of the Darkling Sun",
  vault: "Factions/The Children of the Darkling Sun.md",
  intro: [
    "Desire contains the seeds of its opposite, and thwarted love can easily curdle to hatred. Perhaps this is what drives some men to abandon the faith of the Promised Sun and walk a darker path. The Children pray for the extinction of Urth's red sun and the stillbirth of the promised successor, calling instead for the ascension of the Darkling Sun, whose name shall be Wormwood, a cosmic interloper whose light shall make all reality dreams and all dreams reality. The Children hide in plain sight, gathering in cellars at night to speak feverishly of the impossible worlds that shall be revealed when the Darkling Sun rises."
  ],
  summary: [
    "An ancient cult proscribed everywhere in civilisation, but thriving in dark corners of Vaarn. The Children take as their sigil a rooster, headless and inverted, a charm against the rising of the Promised Sun.",
    "The sect's rites invoke the activation of the dreaming mind, in the hopes of hastening the arrival of the usurper star and the dissolution of reality. Junior cultists are enticed with visits to personal dreamworlds where all their wishes are fulfilled.",
    "The Children seek nascent psychics for recruitment by infiltrating their dreams. A town suffering from shared nightmares is harbouring a Darkling Sun sect.",
    "Worship of the Darkling Sun is but a mask for discordant veneration of Azathoth, the Daemon Sultan. This secret is not known to all Children but is revealed when they achieve the rank of Ninth Mystery."
  ],
  goals: [
    { name: "Preserve Secrecy", text: "The cult fears discovery and annihilation. They recruit carefully and do not reveal the true purpose of their sect until the acolyte has spent many years studying the fragmentary Liturgy of the Darkling Sun. Priests of the cult hide their identity with cowls of captured shadow." },
    { name: "Strengthen the Dream", text: "The Children seek powerful psychics to empower and expand the dreamworlds they create. These recruits may enter the dream willingly or unwillingly, but enter it they must." },
    { name: "Usurp Reality", text: "The cult's ultimate goal is to invert reality, switching the ontological status of their shared dreams and the waking world. Urth will be captured in the orbit of the Darkling Sun, another name for Azathoth, a dreaming idiot god. This will be apocalyptic for the inhabitants of Urth, but the Children believe the ascension of the usurper star will be heaven (for them)." }
  ],
  allies: [
    { target: "[[The Court of the Jigsaw Autarch]]", faction: "The Court of the Jigsaw Autarch", text: "Destabilisation of lucid reality suits the Jigsaw Autarch as readily as it does Azathoth. The two sects often work hand-in-hand to unpick the stitches of creation, although each would betray the other for their ultimate goal." },
    // Not a faction.
    { target: "Other Worshippers of Azathoth", faction: null, text: "The Daemon Sultan is venerated by [[Moonbeast (Imago)|Moonbeasts]] of Luna, [[Star Vampire|Star Vampires]], certain [[Cliff Ghul]] families, and other unwholesome beasts. Such monsters aid the Children, if asked." }
  ],
  enemies: [
    { target: "[[The New Hegemony]]", faction: "The New Hegemony", text: "The Hegemon's Inquisition is aware of the Children, but they do not know the full extent of the cult's goals. The Hegemony know enough to sentence all members of the cult to death, and Legionaries are trained to spot signs of cult membership during searches." },
    { target: "[[Faa Nomads]]", faction: "Faa Nomads", text: "The Faa do not tolerate worship of the Darkling Sun and eliminate growing sects from their tribal groups." },
    { target: "[[Seekers of Eyeless Wisdom]]", faction: "Seekers of Eyeless Wisdom", text: "More than any other faction, the Seekers are awake to the reality-warping threat the Children represent. The Seekers compete with the Children to recruit nascent mystics and are able to locate Darkling Sun cabals using clairvoyance and telepathic searches." }
  ],
  alliedMonsters: null,
  // CRIMSON HOUND printed a literal "xx" here; JADE IBIS 15-09-26 prints
  // the text on page 104, an image page, transcribed 2026-09-21.
  joining: [
    "Much like the Seekers they oppose, the Children approach nascent mystics in the hopes of recruiting them to their reality-warping quest. Gifted PCs in the vicinity of a Darkling Sun cabal are likely to receive strange robed visitors in their dreams, offering unimaginable power if the dreamer will only pledge their life to the Rise of the Darkling Sun. Those who refuse are marked for death."
  ],
  // THE ONLY VERSE TRIUMPHANT. The other seven are prose paragraphs.
  triumphant: { verse: true, lines: [
    "I dreamt a dream that was not a dream",
    "The old sun sank and in her place",
    "Rose an interloper, dark and strong",
    "And the hills, my bones, shivered",
    "Like children in the throes of sleep",
    "While dark new stars ushered old along",
    "Streams ran uphill, colours spoke",
    "And all folk had one face, a paper mask",
    "I cried for help, but it became a song"
  ] },
  npcs: ["[[Child of the Darkling Sun]]", "[[Nightmare Herald]]"],
  aside: null,
  rollTable: null,
  rep: [
    { rep: "+1", actions: "Gift an item of Exotica; swear an oath to bring about the Rise of the Darkling Sun; save the life of a sect member" },
    { rep: "+2", actions: "Recruit a fledgling psychic (Level 4 or lower) for the Children; kill or corrupt a Hegemony Inquisitor; kill or corrupt a notable Seeker of Eyeless Wisdom" },
    { rep: "+3", actions: "Establish a new Darkling Sun cabal in a settlement; recruit a powerful psychic (Level 5+) for the Children; eliminate Seeker presence from a settlement" },
    { rep: "+4", actions: "Establish Darkling Sun control over a settlement or stronghold; eliminate Hegemony presence from a region; eliminate Seeker presence from a region" }
  ]
},
{
  name: "Lithic Lyceum",
  vault: "Factions/Lithic Lyceum.md",
  intro: [
    "The lithling have an enquiring cast of mind and are endlessly fascinated by the alien world of soft-cornered organisms they find themselves marooned on. Their ancient Lyceum is devoted to cataloging the minutiae of the living world, and the fabled Inspiral Archive contains the life's work of millions of long-crumbled lithlings. Unfortunately, records of the lithling are often of dubious usefulness to squash-bodied folk — the crystal-scholars' dissertations and essays focus on minutiae while lacking the wider context a mortal mind might find meaningful. One celebrated lithling dissertation describes movements made by generations of land-snails over a hundred year period, with the relative positions of each snail recorded down to the second. What outside observers are incapable of recognising, however, is that the records kept are a means to an end — quite literally. It is believed when creation is fully observed and catalogued, down to the tiniest detail, then the existence of our universe will cease. Into this nothingness will dissolve the lithling species, content and congratulating one another in even and understated tones."
  ],
  summary: [
    "The Lithic Lyceum is the only institution that matters within the fabric of lithling society. All lithlings are defined by their membership to it or lack thereof.",
    "The Lyceum's two Deans control access to the Inspiral Archive of lithling dissertations and the Becoming Caves where lithling seeds are stored, prepared, and germinated.",
    "The lithling life-cycle is as alien to humanity as their bloodless bodies. Lithlings are grown from a seed, which must crystallise and bloom in a pool of alchemical elixirs within the Becoming Caves. After decades of maturation, they are fully moulded and allowed to awaken, as large and strong as they will ever be. They are then inducted into the Lyceum and instructed in their duties as junior scholars.",
    "The Lyceum is outwardly known for its dedication to truth and fact, and the honesty of its travelling scholars is such that they are frequently asked to witness the signing of contracts, marriage vows, and peace treaties. It is not true that lithlings cannot lie, but they keep this to themselves.",
    "The Lyceum's most valuable export is memory crystal, a super-storage substance holding yottabytes of information in a single iridescent grain. Synthetic life would not be what it is today without memory crystal."
  ],
  goals: [
    { name: "Expand the Inspiral Archive", text: "Every event that happens on Urth must be recorded, catalogued, and illuminated with commentary and analysis. Despite the storage capacity of memory crystal, the Archive is continuously being dug deeper." },
    { name: "Increase Their Population", text: "Lithlings only reproduce as they die, leaving a single seed. Occasionally, a dead lithling will birth dyad seeds, but the stimuli allowing this outcome are not understood. The Lyceum need to expand their slowly shrinking ranks by uncovering the secret of dyad births and pay handsomely for any ungerminated seeds." },
    { name: "Bring About the End", text: "The Lyceum teaches that truthfully and completely cataloguing creation within the Inspiral Archive will cause the end of existence, the intended purpose of our universe being to describe itself. All orthodox lithlings believe this to be the proper conclusion of their affairs." }
  ],
  allies: [
    { target: "[[Faa Nomads]]", faction: "Faa Nomads", text: "Lithlings' long memories and respect for Vaarn's ecosystem keep them in good standing with the Faa. Their non-reliance on water makes them ideal travel companions in the deep desert." },
    { target: "[[Seekers of Eyeless Wisdom]]", faction: "Seekers of Eyeless Wisdom", text: "The birth of the God-Eye is seen as a positive development, as prescient mystic would instantly understand the Lyceum's task." },
    { target: "[[Titan Cults]]", faction: "Titan Cults", text: "Lithlings' memory crystals were the backbone of the AI advancements leading to the Ascendence of the Titans. Savvy Cultists always stay on the right side of the Lyceum, aware that the rebooting of the Machine Gods will require vast stocks of memory crystal." }
  ],
  enemies: [
    { target: "[[Cacklemaw Clans]]", faction: "Cacklemaw Clans", text: "It is very difficult to accurately catalogue creation when someone keeps burning things down." },
    { target: "[[The Court of the Jigsaw Autarch|Court of the Jigsaw Autarch]]", faction: "The Court of the Jigsaw Autarch", text: "The hypergeometric chaos spread by the Courtiers pleases the Lyceum no more than the prosaic chaos spread by the Cacklemaw. Adding more dimensions to the mix complicates their project substantially." },
    { target: "[[The Children of the Darkling Sun|Children of the Darkling Sun]]", faction: "The Children of the Darkling Sun", text: "The deepest depths of disdain are reserved for the Children. The Rise of the Darkling Sun will make completion of the Archive an impossible fantasy. Lithlings are rarely moved to urgent action, but the ascendence of the Children would be the exception." }
  ],
  alliedMonsters: null,
  // "expected be a member" is the book's own dropped word, kept verbatim.
  joining: [
    "Not possible unless one is a lithling, in which case you are expected be a member anyway. Expelled or heterodox scholars can only rejoin the Lyceum by presenting work so inarguably True it drives the sitting Deans to self-erode, a feat which has happened only twice."
  ],
  triumphant: { verse: false, lines: [
    "Not with a bang, but a whimper. A cough behind you, polite yet insistent. Don't you think it's time to wrap things up, old chap? Easy does it. The curtain closes on an empty stage. Everything in its place. Finally, you understand there was never anything to understand. Gently but irresistibly you are invited to leave your chair. Oh, we won't be needing those anymore. The map is finally the territory and the territory the map. Quiet voices in the hallway. We're just heading outside now, if you'd care to join us. Mind the step there. Overhead, with no undue alarm from anyone present, the stars are going out."
  ] },
  npcs: ["[[Lithling Scholar]]", "[[Lithling Warrior]]"],
  aside: null,
  rollTable: null,
  rep: [
    { rep: "+1", actions: "Return a lost lithling seed to the Dean of Becoming; deliver a dissertation to the Dean of Archives" },
    { rep: "+2", actions: "Return a lost lithling dyad seed to the Dean of Becoming; save a Lithling Scholar from death" },
    { rep: "+3", actions: "Uproot a Darkling Sun cabal; eliminate a notable Courtier of the Jigsaw Autarch" },
    { rep: "+4", actions: "Make significant breakthrough in the production of dyad Lithling seeds; eliminate Darkling Sun presence from a region" }
  ]
}
];

/** Every section a faction entry can carry, in the order the book prints them. */
export const FACTION_SECTIONS = [
  "intro", "summary", "aside", "goals", "allies", "enemies",
  "alliedMonsters", "joining", "triumphant", "npcs", "rollTable", "rep"
];

/** Book faction by name, or undefined. Lookups go through here, not indexOf. */
export function bookFaction(name)
{
  return FACTIONS.find(f => f.name === name);
}
