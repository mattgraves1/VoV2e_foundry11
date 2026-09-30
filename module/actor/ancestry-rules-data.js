/**
 * Ancestry special rules that a player ACTIVELY USES, as data for the
 * `ancestry` Item type — foundry-system-index.csv "Ancestry Rule as
 * Rollable Item".
 *
 * Matt's ruling 2026-09-01, from testing item 62.4: these rules are all
 * rolled (or simply granted) at character creation and then end up as
 * description-tab prose, which he judged far less accessible than a
 * clickable item. The mechanism is deliberately NOT "roll something
 * new" — every variant here is already rolled by chargen-app.js and
 * already stored. Only the Item was missing.
 *
 * Distinct from Effect Text in Item Description, which resolves an atom
 * by making its text READABLE. These are rules a player reaches for
 * mid-session, so they get a use icon and a real roll, the same shape
 * as a Mystic Gift or a Hypergeometric Codex.
 *
 * `rule` is the dispatch key actor-sheet.js's _onAncestryRuleUse
 * switches on. It is deliberately NOT the item's display name: the
 * name folds in the rolled variant ("Twice Born: Soldier", per Matt's
 * design), so keying off it would break the moment a name is edited.
 *
 * Rule text is verbatim from CRIMSON HOUND 07-05-26, checked against
 * the PDF rather than only the vault transcription. Two deliberate
 * departures, both the vault's and both obvious typo fixes: the PDF
 * prints "Make a CON when you release spores" (no "save"), and points
 * Bloomboons at "the list on p.xx", a placeholder cross-reference.
 */

export const ANCESTRY_RULE_ITEMS =
{
  "Mycomorph":
  [
    {
      rule: "Twice Born",
      // The variant is the 'What Corpse Were You Born From?' column of
      // Mycomorph's personality spark table — already rolled, already
      // stored. `variantFrom` names the personality column to read.
      variantFrom: "Corpse Born From",
      text: "You are formed from fungus and the corpse of a human. You may make INT saves to recall information that your original body knew. This might include information that has otherwise been lost during the Great Collapse.",
    },
    {
      rule: "Spores",
      // The variant is the rolled spore_table entry, held on
      // state.spark.spore — see chargen-app.js's _rollSpore.
      variantFrom: "spore",
      text: "Make a CON save when you release spores, which affect a number of Biological targets equal to your Level. If you fail your Save, you cannot release anymore spores that day.",
    },
    {
      rule: "Detritivore",
      // No variant - a single rule, named plainly, same as Photosynthesis.
      //
      // PASSIVE, and the one rule here with nothing to use. RULED 2026-09-07
      // (Matt): it becomes an Item so the rule is on the sheet at all - until
      // this entry it was on no sheet surface, only in the Short Rest dialog
      // and the Toxin Die's ADV reason. Both mechanical clauses are applied
      // where they happen (rest.js's rotting meal, toxin-die.js's ADV).
      // RULED 2026-09-23 (Matt), revising the 07 ruling: NO use icon, since
      // posting the text was all it could do - see PASSIVE_ANCESTRY_RULES.
      // The Item's name still opens its sheet, which carries the text.
      // Text is the JADE IBIS 15-09-26 wording.
      text: "You can consume organic matter in any state of decay and gain nourishment from it. You heal double from Short Rests, if the meal you eat is rotting. You have ADV on all Saves against poison and toxins.",
     declaredSpan: null },
  ],
  "Faa Nomad":
  [
    // JADE IBIS 15-09-26 replaced CRIMSON's Worm Rider with these two.
    // RULED 2026-09-21 (Matt): Worm Rider goes; both become rollable Items.
    // Their outcomes are in ancestry-rule-effects.js.
    {
      rule: "Ambusher",
      // No variant - a single rule, named plainly, same as Photosynthesis.
      text: "When in the blue desert, you can make an opposed PSY Save to attempt to ambush a hostile encounter. You may attempt this even if your travelling party has already been ambushed themselves.",
     declaredSpan: null },
    {
      rule: "Worm Wise",
      text: "When encountering a Sandworm, you may attempt to charm it using your knowledge of their moods and pheromones. Make an EGO Save. If successful, the Sandworm will allow you to briefly ride it or otherwise aid you. If you fail, the creature is affronted and attacks you. It will track you while you are in its territory.",
     declaredSpan: null },
  ],
  "True-kin":
  [
    // RE-POINTED 2026-09-10 (Matt) from Forgettable-Effects Tab; built
    // 2026-09-24. Pure of Blood stays a Standing GM Reminder below - the
    // player never clicks it. Inheritor's outcome is in
    // ancestry-rule-effects.js, beside Ambusher's.
    {
      rule: "Inheritor",
      // No variant - a single rule, named plainly, same as Photosynthesis.
      // Text is the JADE IBIS 15-09-26 wording.
      text: "When you encounter pre-Collapse security systems or guard synths, make an opposed EGO Save. On success, the machine is convinced you are its new master and will serve you in any way it is able. On failure, the machine becomes implacably hostile.",
     declaredSpan: null },
  ],
  "Synth":
  [
    {
      rule: "Repairs",
      // No variant - a single rule, named plainly, same as Photosynthesis.
      //
      // ADDED 2026-09-12 with the Synth Part Repair mechanism. Synth was one of
      // the ancestries with no rule Items at all, so the rule reached a player
      // only as roster prose on the sheet; the healing half of it is something
      // reached for mid-session, which is exactly what this roster is for.
      //
      // THE TEXT IS THE WHOLE RULE AND THE CODE IS NOT. The last sentence -
      // extracting parts from a dead synthetic on an INT save - is a separate
      // atom and is NOT wired to this Item's use icon. Trimming it out of the
      // text to match what the button does would be the failure commit c40c680
      // is named for: a rule whose only presence in the system was text we had
      // trimmed. BUILT 2026-09-19 as Synth Part Extraction, on the dead
      // creature's sheet rather than here (synth-extraction.js).
      // Text is the JADE IBIS 15-09-26 wording, corrected 2026-09-19.
      text: "You cannot regain HP by consuming rations. You must make repairs using Synth Parts. You begin play with 3 synth parts. Repair takes one hour and uses one synth part. Repairs heal d8 + CON HP. If your HP is full, repair one wound. To extract parts from dead synthetic creatures, make an INT Save. On a success, extract synth parts equal to the creature's Level. On failure, extract one synth part.",
     declaredSpan: null },
  ],
  "Neobloom":
  [
    {
      rule: "Photosynthesis",
      // No variant — a single rule, so Matt's instruction is to name it
      // plainly rather than inventing a suffix.
      text: "You regain d8 + CON HP for every hour you spend rooted in damp soil under the light of Urth's sun. Artificial lighting does not suffice. If you do not photosynthesise for three days in a row, you will perish.",
     declaredSpan: null },
    {
      rule: "Bloomboons",
      // The variant is the rolled bloomboon_table entry, held on
      // state.spark.bloomboon — see chargen-app.js's _rollBloomboon.
      variantFrom: "bloomboon",
      text: "You begin play with one Bloomboon, rolled using a d20 from the Bloomboons list. When you gain a Level, you may choose to roll for a Boon instead of gaining HP and increasing your ability scores. If a repeat result is rolled, take the next Boon down.",
    },
    {
      rule: "Flammable",
      // No variant. PASSIVE, like Mycomorph's Detritivore (Matt, 2026-09-23):
      // an Item so the rule is readable, no use icon. The doubling is applied
      // by attack-properties.js's derived `flammable` key; the d8 burn per
      // round is its own atom row on Per-Round Effect Reminder, not built.
      // Text is the JADE IBIS 15-09-26 wording.
      text: "You take double damage from flames and heat-based attacks. Once hit, you suffer d8 burning damage per round until extinguished.",
      declaredSpan: null,
    },
  ],
  // Planeyfolk's two rules, both PASSIVE (2026-09-24). Added for the
  // Planeyfication Potion, RULED 2026-09-23 (Matt): the drinker gains the
  // Planeyfolk special rules BESIDE their own ancestry, never in place of
  // it, so the rules had to exist as Items to be granted. A chargen-built
  // Planeyfolk now carries the same two, which puts the rules on their
  // sheet where until now only the description tab held them - the same
  // move Detritivore and Flammable made. The mechanics live elsewhere and
  // read the ancestry OR the Item: attack-properties.js's `flat` key
  // (isFlat) and attunement.js's gate (attunes). Text is the JADE IBIS
  // 15-09-26 wording.
  "Planeyfolk":
  [
    {
      rule: "Flat",
      text: "You lack a third dimension and resemble a living painting or paper doll. You can slip through cracks and under doors and cannot be seen from the side. You take half damage from bludgeoning attacks and double damage from slashing or piercing attacks.",
      declaredSpan: null,
    },
    {
      rule: "Attune with Matter",
      text: "You struggle to hold 3D objects and must make a DEX Save to do so. However, with certain mental techniques you can draw 3D objects into your flattened reality. Given an hour of quiet concentration, you can attune yourself with an item and add it to your inventory.",
      declaredSpan: null,
    },
  ],
};

/** Every `rule` key above, for the sheet handler's dispatch check. */
export const ANCESTRY_RULE_KEYS =
  Object.values(ANCESTRY_RULE_ITEMS).flat().map(r => r.rule);

/**
 * Rules above that are passive: the Item exists so the rule can be read, and
 * it gets no use icon because there is nothing to use (Matt, 2026-09-23).
 * Keyed by `rule` here rather than flagged on the entry, so the roster carries
 * no field the field map would have to rule on for a single entry.
 */
export const PASSIVE_ANCESTRY_RULES = new Set(["Detritivore", "Flammable", "Flat", "Attune with Matter"]);

/**
 * Ancestry special rules that grant a NATURAL WEAPON Item — the same
 * treatment mutations already get in chargen-app.js, so the rule is a
 * clickable damage roll on the sheet rather than description prose.
 * foundry-system-index.csv "Natural Weapon Item Creation".
 *
 * Matt's ruling 2026-09-07: build these exactly like the damage add-on
 * half of the Powerful Jaws mutation, changing only the item name and
 * the description. Powerful Jaws carries the same die and the same
 * weapon class in mutation-data.js, and the caveat the two abilities
 * share is already written on its forgettable-effects entry — the
 * `note` below reuses that wording deliberately rather than inventing a
 * second phrasing that can drift from it.
 *
 * `rule` names the ancestry special rule the weapon comes from. It is
 * the same kind of key as ANCESTRY_RULE_ITEMS' `rule` and is likewise
 * NOT the Item's display name, so renaming the weapon on the sheet
 * cannot break anything that reads it.
 *
 * Rule text checked 2026-09-07 against CRIMSON HOUND 07-05-26 itself,
 * not only the vault: "Biter - If you successfully hit a foe with a
 * melee attack, you may add an extra d6 of fang damage to the roll."
 */
export const ANCESTRY_NATURAL_WEAPONS =
{
  "Cacklemaw Exile":
  [
    {
      rule: "Biter",
      // Names the MECHANISM this rule needs, not the subject it is about —
      // the same form as `perRound` and `stateful`. Entry-level rather than
      // nested in `naturalWeapon` so tools/gen-atom-status.mjs can see it:
      // the evidence generator reads top-level keys, and this atom's other
      // dependency (Natural Weapon Item Creation) already owns that field.
      damageAddOn: { appliesTo: "melee" },
      // Deliberately the same `naturalWeapon` field name and inner shape
      // that mutation-data.js, chargen-data.js's IMPLANTS and
      // advanced-implants-data.js all use, so this roster derives
      // Natural Weapon Item Creation from the same one-line rule in
      // tools/gen-atom-status.mjs as every other roster rather than
      // needing a special case.
      naturalWeapon: {
        name: "Biter Fangs",
        type: "melee",
        damage: "d6",
        note: "This is a damage bonus, not a separate attack - its d6 is added to your melee weapon's own damage roll.",
      },
    },
  ],
};

/**
 * Ancestry special rules that REACT TO A KILL — foundry-system-index.csv
 * "Kill/Death-Detection Hook".
 *
 * Separate from ANCESTRY_RULE_ITEMS above, which holds rules a player reaches
 * for and clicks. Nothing here is clicked: the trigger is something that
 * happened to a foe, so the rule surfaces itself at the moment it becomes
 * available and the player decides what to do about it.
 *
 * Keyed on `system.ancestry`, the same field the sheet already reads to build
 * its special-rules list from SPARK_TABLES. Deliberately NOT a lookup for an
 * `ancestry` Item the way the Spores check is: Overkill is not among the rules
 * that were given Items, and inventing one to hang a reminder off would put a
 * clickable control on a rule that is never clicked.
 *
 * `melee` records that the book restricts both halves of the rule — the kill
 * must be made with a melee attack, and the attack it grants is melee too.
 *
 * Text verbatim from JADE IBIS 15-09-26, which renamed CRIMSON HOUND's "More!"
 * to "Overkill" with the effect unchanged word for word (2026-09-21).
 */
export const ANCESTRY_KILL_REACTIONS =
{
  "Cacklemaw Exile":
  {
    rule: "Overkill",
    melee: true,
    text: "When you kill a foe with a melee attack, you may immediately make another melee attack against a nearby target.",
  },
};

/**
 * Ancestry rules only the Referee acts on - foundry-system-index.csv
 * "Standing GM Reminder". Chargen writes each one as a GM-only, open-ended row
 * on the Active Effect Board of every new character of that ancestry
 * (module/time/gm-reminder.js). Not Items: a player never clicks these.
 *
 * RULED 2026-09-23 (Matt): the row states the rule only, never a derived
 * current state - Pure of Blood's row does not decide whether the character is
 * visibly mutated. `withAnimalForm` folds the Newbeast's rolled Animal Form
 * into the row's name ("Beasthood (New-Cat)"), because the rule means nothing
 * at the table without it and the form is chargen's record.
 *
 * Synthetic Mind states both clauses. Its magnetic d6 INT is the Referee's to
 * apply (the 2026-09-22 ruling on its Ability Damage row stands); the row
 * reminds.
 *
 * Text verbatim from JADE IBIS 15-09-26. chargen-data.js's special_rules
 * strings are shortened, and Pure of Blood's there is the older wording.
 */
export const ANCESTRY_GM_REMINDERS =
{
  "True-kin":
  [
    {
      rule: "Pure of Blood",
      text: "You have ADV on reaction and persuasion rolls when you encounter other true-kin. You lose this bonus if you are visibly mutated.",
    },
  ],
  "Synth":
  [
    {
      rule: "Synthetic Mind",
      text: "You are vulnerable to attacks targeting the LogLang syntax that powers you. These include strobing basilisk patterns, malicious infoglyphs, and ancient Titan-era language viruses. You suffer d6 INT damage per round from magnetic fields.",
    },
  ],
  "Newbeast":
  [
    {
      rule: "Beasthood",
      withAnimalForm: true,
      text: "You gain ADV on Saves whenever it would make sense for your animal nature to provide it. Your Referee may impose DIS in circumstances where your animal nature might prove unhelpful.",
    },
    {
      rule: "Kinship",
      withAnimalForm: true,
      text: "You can speak to all creatures that share your underlying animal form, even if they would not normally be able to communicate. New-cats can speak to true cats, cat-like monsters, mimics pretending to be cats, etc. They do not always like you.",
    },
  ],
};
