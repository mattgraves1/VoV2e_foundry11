import
{
  ABILITIES, ABILITY_KEYS, ABILITY_SHORT_KEY,
  ANCESTRIES, ANCESTRY_CREATURE_TYPES, ANCESTRY_NOTES, SPARK_TABLES,
  MELEE_WEAPONS, RANGED_WEAPONS, BASIC_TAGS, ADVANCED_TAGS, ARMOUR_TABLE, ARMOUR_QUALITIES,
  HELM_TABLE, SHIELD_TABLE,
  GEAR_A, GEAR_B_BASE, GEAR_B_DRUG_INDEX, FACE_GEAR,
  DRUG_HUES, DRUG_FORMS, DRUG_INGESTED, DRUG_EFFECTS,
  CRUCIBLE_QUALITIES, CRUCIBLE_SHAPES, ELIXIRS, IMPLANTS, EXOTICA,
  CODEX_APPEARANCES, GIFT_SOURCES, GIFT_NAMES, GIFT_QUALITIES_ALL, GIFT_FORMS_ALL,
  BOONS
} from "./chargen-data.js";
import { EQUATIONS } from "./codex-data.js";
import { chemcellTorchItem } from "../item/light-source.js";
import { rollOnTable } from "./roll-range.js";
import { MUTATION_TABLE } from "./mutation-data.js";
import { ANCESTRY_RULE_ITEMS, ANCESTRY_NATURAL_WEAPONS, ANCESTRY_GM_REMINDERS } from "./ancestry-rules-data.js";
import { writeAncestryReminders } from "../time/gm-reminder.js";
import { createActorAsOwner } from "../combat/gm-relay.js";
import { applySlotTagModifiers, applyTradeValueTagModifiers, applyTierTradeMultiplier } from "../item/tag-modifiers.js";
import { THIRD_OF_A_SLOT } from "./rest.js";
import { sampleRecipe, blankRecipe, RECIPES_SCOPE, RECIPES_FLAG } from "../item/crucible-recipes.js";
import { spanFieldFrom } from "../time/declared-span.js";
import { rollWeaponBase } from "./weapon-roller.js";
import { exoticaArmourAv } from "./exotica-effects-data.js";

/**
 * Vaarn native character creator — a Foundry Application wizard that ports
 * the standalone tool (vaarn_character_creator_2.html) and the data-mapping
 * knowledge of macros/dev/import-character-from-json.js into one in-Foundry
 * step: roll everything, then create the Actor/Items directly, no JSON
 * export/import round-trip.
 *
 * Design: this re-renders the whole Application on every state-changing
 * click (same pattern the standalone tool used with innerHTML swaps) rather
 * than trying to do partial DOM patches — the wizard's state graph is small
 * enough that this stays snappy, and it keeps getData() as the single
 * source of truth for what's on screen at every step.
 *
 * Table-lookup rolls (weapon/tag/armour/gear/spark-table draws) use a plain
 * d()/pick() helper matching the standalone tool's Math.random-based
 * algorithm exactly, rather than Foundry's Roll class — there are dozens of
 * these per character and posting each to chat would be spam nobody wants.
 * The "headline" rolls a player actually cares to see (ability scores, HP,
 * a rolled boon) go through Foundry's real Roll class and post to chat.
 */
export class KnaveCharacterCreator extends Application
{
  constructor(options = {})
  {
    super(options);
    this.state = KnaveCharacterCreator.freshState();
  }

  static freshState()
  {
    return {
      step: 0,
      abilities: null,
      swapSelected: [],
      hasSwapped: false,
      ancestryChecks: Object.fromEntries(ANCESTRIES.map(a => [a, true])),
      ancestry: null,
      spark: null,
      hp: null,
      hpMode: "roll",
      gmFlatHPEnabled: false,
      equipment: null,
      weaponType: "melee",
      boonMode: "roll",
      boonName: null,
      boon: null,
      boonWeaponType: "melee",
      giftMode: "sample",
      characterName: "",
      targetUserId: "",
    };
  }

  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      id: "knave-character-creator",
      classes: ["knave", "knave-chargen"],
      template: "systems/vaarn/templates/apps/character-creator.html",
      title: "Create Character",
      width: 900,
      height: 780,
      resizable: true,
      // The step body scrolls under a fixed title and nav row (Matt, 2026-09-28);
      // Foundry keeps its place across the re-render every click causes.
      scrollY: [".chargen-step-body"]
    });
  }

  static STEP_LABELS = ["Attributes", "Ancestry", "Spark", "Hit Points", "Equipment", "Boon", "Review"];

  /* -------------------------------------------- */
  /* View model                                    */
  /* -------------------------------------------- */

  /** @override */
  getData()
  {
    const s = this.state;
    const vm = { step: s.step };

    for(let i = 0; i < 7; i++)
      vm[`isStep${i}`] = s.step === i;

    vm.progress = KnaveCharacterCreator.STEP_LABELS.map((label, i) => (
    {
      label,
      stateClass: i < s.step ? "done" : (i === s.step ? "active" : "")
    }));

    Object.assign(vm, this._vmAttributes());
    Object.assign(vm, this._vmAncestry());
    Object.assign(vm, this._vmSpark());
    Object.assign(vm, this._vmHP());
    Object.assign(vm, this._vmEquipment());
    Object.assign(vm, this._vmBoon());
    Object.assign(vm, this._vmReview());

    return vm;
  }

  _vmAttributes()
  {
    const s = this.state;
    if(!s.abilities) return { hasAbilities: false, canNext0: false };

    const con = s.abilities.find(a => a.key === "con");
    const abilities = s.abilities.map((a, i) => (
    {
      key: a.key,
      name: a.name,
      bonus: a.bonus,
      dice: a.dice,
      previewDefense: a.bonus + 10,
      selected: s.swapSelected.includes(i),
      candidate: !s.hasSwapped && s.swapSelected.length === 1 && !s.swapSelected.includes(i),
      index: i,
    }));

    return {
      hasAbilities: true,
      abilities,
      hasSwapped: s.hasSwapped,
      swapMsg: s.swapSelected.length === 1 ? `${s.abilities[s.swapSelected[0]].name} selected — click another ability to swap.` : (s.hasSwapped ? "Swap complete." : ""),
      showClearSwap: s.swapSelected.length > 0,
      itemSlotsPreview: 10 + con.bonus,
      healPreview: `1d8 + ${con.bonus}`,
      canNext0: true,
    };
  }

  _vmAncestry()
  {
    const s = this.state;
    const ancestryList = ANCESTRIES.map(name => ({ name, checked: !!s.ancestryChecks[name] }));
    const sparkData = s.ancestry ? SPARK_TABLES[s.ancestry] : null;
    return {
      ancestryList,
      anyAncestryChecked: ancestryList.some(a => a.checked),
      ancestrySelected: s.ancestry,
      ancestryNote: s.ancestry ? ANCESTRY_NOTES[s.ancestry] : null,
      ancestryOpenRulings: sparkData?.open_rulings || null,
      canNext1: !!s.ancestry,
    };
  }

  _vmSpark()
  {
    const s = this.state;
    if(!s.ancestry) return { hasSparkTable: false, canNext2: false };

    const sparkData = SPARK_TABLES[s.ancestry];
    if(!s.spark) s.spark = { appearance: {}, personality: {}, spore: null, bloomboon: null, mutations: null, mutationsSuperseded: null };
    const spark = s.spark;

    const vm = { hasSparkTable: !!sparkData, canNext2: true, isLithlingWarning: s.ancestry === "Lithling" };
    if(!sparkData) return vm;

    if(sparkData.appearance?.isFlat)
    {
      vm.isFlatAppearance = true;
      vm.flatNote = sparkData.flat_note;
      vm.flatAnimalForm = spark.appearance["Animal Form"] || null;
    }
    else if(sparkData.appearance)
    {
      vm.appearanceColumns = this._sparkColumnsVM(sparkData.appearance, spark.appearance);
    }

    if(sparkData.personality)
    {
      vm.personalityColumns = this._sparkColumnsVM(sparkData.personality, spark.personality);
      vm.mutationNote = sparkData.mutation_note || null;
    }

    vm.hasSporeTable = !!sparkData.spore_table;
    vm.sporeResult = spark.spore || null;
    vm.hasBloomboonTable = !!sparkData.bloomboon_table;
    vm.bloomboonResult = spark.bloomboon || null;

    vm.hasMutationTable = !!sparkData.mutation_rolls;
    vm.mutationRollCount = sparkData.mutation_rolls || 0;
    vm.mutationResults = spark.mutations || null;
    // Shown so the player can see the contradiction rule fired, rather than
    // a mutation they rolled just quietly not being there.
    vm.mutationsSuperseded = spark.mutationsSuperseded?.length ? spark.mutationsSuperseded : null;

    vm.specialRules = sparkData.special_rules || null;

    return vm;
  }

  _sparkColumnsVM(table, storedValues)
  {
    return table.columns.map((col, ci) => (
    {
      name: col,
      value: storedValues[col] || "",
      options: table.rows.map((row, ri) => ({ index: ri, label: row[ci], selected: storedValues[col] === row[ci] })),
    }));
  }

  _vmHP()
  {
    const s = this.state;
    const isLithling = s.ancestry === "Lithling";
    const showFlatToggle = s.gmFlatHPEnabled && !isLithling;

    return {
      isLithling,
      hpInfoText: isLithling ? "Lithling: Roll 10d8 for starting and maximum HP. Cannot heal." : "Roll 1d8 for starting HP. Constitution bonus is not added to the roll.",
      showGmFlatOption: !isLithling,
      gmFlatHPEnabled: s.gmFlatHPEnabled,
      showFlatToggle,
      hpMode: s.hpMode,
      hpModeIsRoll: s.hpMode !== "flat",
      hpModeIsFlat: s.hpMode === "flat",
      showRollButton: !(showFlatToggle && s.hpMode === "flat"),
      hpRollButtonLabel: isLithling ? "Roll 10d8" : "Roll HP",
      hpResult: s.hp,
      canNext3: !!s.hp,
    };
  }

  _vmEquipment()
  {
    const s = this.state;
    if(!s.ancestry) return { canNext4: false };

    const isSynth = s.ancestry === "Synth";
    const isLithling = s.ancestry === "Lithling";
    const isFaa = s.ancestry === "Faa Nomad";
    const isNeobloom = s.ancestry === "Neobloom";

    if(!s.equipment)
    {
      const ration_notes = [];
      if(isFaa) ration_notes.push("Water: 3 days to Deprived instead of standard rate.");
      s.equipment =
      {
        water_rations: (isSynth || isLithling) ? 0 : 3,
        food_rations: (isSynth || isLithling) ? 0 : 3,
        synth_parts: isSynth ? 3 : null,
        ration_notes,
        weapon: null, armour: null, gear: [], drug: null,
      };
    }
    const eq = s.equipment;

    return {
      isSynth, isLithling, isFaa, isNeobloom,
      rationNotes: eq.ration_notes,
      weaponType: s.weaponType,
      weaponTypeIsMelee: s.weaponType === "melee",
      weaponTypeIsRanged: s.weaponType === "ranged",
      weaponResult: eq.weapon,
      armourResult: eq.armour,
      gearResult: eq.gear.length ? { a: eq.gear[0], b: eq.gear[1], drug: eq.drug, helm: eq.helm, shield: eq.shield } : null,
      canNext4: !!(eq.weapon && eq.armour && eq.gear.length),
    };
  }

  _vmBoon()
  {
    const s = this.state;
    const vm =
    {
      boonMode: s.boonMode,
      boonModeIsRoll: s.boonMode === "roll",
      boonModeIsChoose: s.boonMode === "choose",
      boonList: BOONS.map((name, i) => ({ name, index: i + 1 })),
      boonName: s.boonName,
      canNext5: !!s.boon,
    };

    if(!s.boonName) return vm;

    vm.isBoonAdvancedWeapon = s.boonName === "Advanced Weapon";
    vm.isBoonCrucible = s.boonName === "Alchemist's Crucible and an Elixir";
    vm.isBoonImplant = s.boonName === "Cybernetic Implant";
    vm.isBoonExotica = s.boonName === "Exotica";
    vm.isBoonCodex = s.boonName === "Hypergeometric Codex";
    vm.isBoonGift = s.boonName === "Mystic Gift";
    vm.boonWeaponType = s.boonWeaponType;
    vm.boonWeaponTypeIsMelee = s.boonWeaponType === "melee";
    vm.boonWeaponTypeIsRanged = s.boonWeaponType === "ranged";
    vm.giftMode = s.giftMode;
    vm.giftModeIsSample = s.giftMode === "sample";
    vm.giftModeIsRandom = s.giftMode === "random";
    vm.boonDetail = s.boon;

    return vm;
  }

  _vmReview()
  {
    const s = this.state;
    if(!(s.abilities && s.ancestry && s.hp && s.equipment?.weapon && s.equipment?.armour && s.boon))
      return { readyToCreate: false };

    const effective = this._effectiveAbilities();
    const mutationHpBonus = (s.spark?.mutations || []).reduce((sum, m) => sum + (m.hpBonus || 0), 0);
    const hpBonus = (s.boon?.implant?.hp_bonus || 0) + mutationHpBonus;
    const maxHP = s.hp.maximum + hpBonus;
    const con = effective.find(a => a.key === "con");

    const defaultName = s.spark?.personality?.Name || `New ${s.ancestry}`;
    if(!s.characterName) s.characterName = defaultName;

    const avInfo = this._effectiveArmourAVInfo();
    // "mutation/implant" (2026-08-25, item 10.2) — this bonus can now come
    // from either source (Subdermal Ceramic Plating implants included).
    const avNote = avInfo.replacesArmour
      ? ` (natural — Quills-type mutation replaces worn armour)`
      : (avInfo.avBonus ? ` (+${avInfo.avBonus} mutation/implant)` : "");

    return {
      readyToCreate: true,
      characterName: s.characterName,
      // Only the GM hands a character over; a player owns what they create.
      // A GM in the list would be a no-op (_finalizeCharacter skips GMs).
      users: game.user.isGM ? game.users.contents.filter(u => !u.isGM).map(u => ({ id: u.id, name: u.name, selected: u.id === s.targetUserId })) : [],
      reviewAbilities: effective.map(a => ({ name: a.name, bonus: a.bonus, defense: a.bonus + 10 })),
      hasImplantStatMod: !!s.boon?.implant?.stat_mod,
      maxHP,
      hpBonusNote: hpBonus ? ` (+${hpBonus} implant/mutation)` : "",
      healingRate: s.ancestry === "Lithling" ? "N/A" : `1d8+${con.bonus}`,
      itemSlots: 10 + con.bonus,
      armourAV: avInfo.av,
      armourAVNote: avNote,
      spark: s.spark,
      specialRules: SPARK_TABLES[s.ancestry]?.special_rules || null,
      reviewEquipment: s.equipment,
      isSynth: s.ancestry === "Synth",
      isLithling: s.ancestry === "Lithling",
      boonSummary: this._boonSummaryLines(),
    };
  }

  _boonSummaryLines()
  {
    const b = this.state.boon;
    if(!b) return [];
    const lines = [`Type: ${b.name}`];
    if(b.weapon) lines.push(`Weapon: ${b.weapon.full_name} (${b.weapon.damage}, fragile)`);
    if(b.crucible) lines.push(`Crucible: ${b.crucible.full_name}`);
    if(b.elixir) lines.push(`Elixir: ${b.elixir.name}`);
    if(b.implant) lines.push(`Implant: ${b.implant.name}`);
    if(b.item) lines.push(`Item: ${b.item.name}`);
    if(b.codex) lines.push(`Equation: ${b.codex.equation.name}`);
    if(b.gift) lines.push(`Gift: ${b.gift.type === "sample" ? b.gift.name : b.gift.full_name}`);
    return lines;
  }

  /** Ability bonuses with any Cybernetic Implant stat_mod AND any rolled
   * mutations' abilityMod baked in. Both sources' deltas are summed
   * per-ability before the single clamp, so order between them doesn't
   * matter. Only the +10 ceiling is clamped (Bestiary.md's "never exceed
   * +10") — Abilities.md says a score "can become negative", with no
   * stated floor, so a big enough malus (e.g. Skeletal Frame stacked with
   * Tentacles, Arms) is allowed to push a starting score to 0 or below
   * (Matt's call, 2026-08-19 — this used to floor at 1, matching the old
   * standalone tool, but that wasn't actually what the book says). */
  _effectiveAbilities()
  {
    const abs = this.state.abilities.map(a => ({ ...a }));
    const mods = [this.state.boon?.implant?.stat_mod, ...(this.state.spark?.mutations || []).map(m => m.abilityMod)].filter(Boolean);
    for(const a of abs)
    {
      const longKey = ABILITY_KEYS.find(k => ABILITY_SHORT_KEY[k] === a.key);
      const delta = mods.reduce((sum, mod) => sum + (mod[longKey] || 0), 0);
      if(delta) a.bonus = Math.min(10, a.bonus + delta);
    }
    return abs;
  }

  /** Final AV once any rolled Cacogen mutations' `avBonus` (Armoured Skin,
   * Crest/Crown mutations, Quills, Scaly/Warty Skin) are folded in.
   * Ordinarily these are natural armour that stacks ON TOP of the rolled
   * starting armour's AV. Quills is the one exception (`avReplacesArmour`)
   * — its own text is "you cannot wear other armour", so it replaces the
   * WORN armour's AV rather than adding to it. Judgment call: base
   * unarmoured AV is 10 (Bestiary/Monster Generators.md's "10
   * (Unarmoured)", Lithling's "base AV is 10 + your Level"), so a
   * Quills-type mutation sets AV to 10 + its own avBonus (plus any OTHER
   * avBonus mutations rolled alongside it — those are natural armour too,
   * not worn armour, so nothing here stops them from stacking with
   * Quills specifically, only with gear). Returns the plain number; use
   * `_effectiveArmourAVInfo` if the caller also needs to know whether
   * armour was replaced (for the review note / chargen chat message). */
  _effectiveArmourAV()
  {
    return this._effectiveArmourAVInfo().av;
  }

  _effectiveArmourAVInfo()
  {
    const mutations = this.state.spark?.mutations || [];
    // Work-queue item 10.2 (2026-08-25): Subdermal Ceramic Plating's
    // avBonus stacks the same way mutation avBonus does — natural/built-in
    // armour on top of worn gear, not replaced by a Quills-style mutation
    // (implants have no avReplacesArmour equivalent).
    const implantAvBonus = this.state.boon?.implant?.avBonus || 0;
    const avBonus = mutations.reduce((sum, m) => sum + (m.avBonus || 0), 0) + implantAvBonus;
    const replacesArmour = mutations.some(m => m.avReplacesArmour);
    // Crystalline Flesh: base AV 10 + Level, and a new character is Level 1.
    // actor.js derives the live figure; this only keeps the preview honest.
    const lithling = this.state.ancestry === "Lithling" ? 1 : 0;
    const base = (replacesArmour ? 10 : (this.state.equipment?.armour?.av ?? 10)) + lithling;
    return { av: base + avBonus, avBonus, replacesArmour };
  }

  /* -------------------------------------------- */
  /* Listeners                                     */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);

    html.find("[data-nav]").click(ev => this._goStep(Number(ev.currentTarget.dataset.nav)));

    // Step 0 — Attributes
    html.find(".chargen-roll-attributes").click(() => this._rollAttributes());
    html.find(".chargen-ability-card").click(ev => this._selectAbilityForSwap(Number(ev.currentTarget.dataset.index)));
    html.find(".chargen-clear-swap").click(() => { this.state.swapSelected = []; this.render(); });

    // Step 1 — Ancestry
    html.find(".chargen-ancestry-checkbox").change(ev =>
    {
      this.state.ancestryChecks[ev.currentTarget.dataset.ancestry] = ev.currentTarget.checked;
      this.render();
    });
    html.find(".chargen-ancestry-check-all").click(() => { for(const k in this.state.ancestryChecks) this.state.ancestryChecks[k] = true; this.render(); });
    html.find(".chargen-ancestry-uncheck-all").click(() => { for(const k in this.state.ancestryChecks) this.state.ancestryChecks[k] = false; this.render(); });
    html.find(".chargen-roll-ancestry").click(() => this._rollAncestry());

    // Step 2 — Spark
    html.find(".chargen-spark-select").change(ev =>
    {
      const { section, column } = ev.currentTarget.dataset;
      const idx = Number(ev.currentTarget.value);
      const table = SPARK_TABLES[this.state.ancestry][section];
      const ci = table.columns.indexOf(column);
      this.state.spark[section][column] = Number.isNaN(idx) ? "" : table.rows[idx][ci];
      this.render();
    });
    html.find(".chargen-spark-roll-one").click(ev => this._rollSingleSpark(ev.currentTarget.dataset.section, ev.currentTarget.dataset.column));
    html.find(".chargen-spark-roll-all").click(ev => this._rollAllSpark(ev.currentTarget.dataset.section));
    html.find(".chargen-roll-flat-appearance").click(() => this._rollFlatAppearance());
    html.find(".chargen-roll-spore").click(() => this._rollSpore());
    html.find(".chargen-roll-bloomboon").click(() => this._rollBloomboon());
    html.find(".chargen-roll-mutations").click(() => this._rollMutations());

    // Step 3 — HP
    html.find(".chargen-gm-flat-hp").change(ev => { this.state.gmFlatHPEnabled = ev.currentTarget.checked; this.render(); });
    html.find(".chargen-hp-mode").click(ev => this._selectHPMode(ev.currentTarget.dataset.mode));
    html.find(".chargen-roll-hp").click(() => this._rollHP());

    // Step 4 — Equipment
    html.find(".chargen-weapon-type").click(ev => { this.state.weaponType = ev.currentTarget.dataset.type; this.render(); });
    html.find(".chargen-roll-weapon").click(() => this._rollWeapon());
    html.find(".chargen-roll-armour").click(() => this._rollArmour());
    html.find(".chargen-roll-gear").click(() => this._rollGear());

    // Step 5 — Boon
    html.find(".chargen-boon-mode").click(ev => { this.state.boonMode = ev.currentTarget.dataset.mode; this.state.boonName = null; this.state.boon = null; this.render(); });
    html.find(".chargen-roll-boon").click(() => this._rollBoon());
    html.find(".chargen-select-boon").click(ev => { this.state.boonName = ev.currentTarget.dataset.boon; this.state.boon = null; this.render(); });
    html.find(".chargen-reset-boon").click(() => { this.state.boonName = null; this.state.boon = null; this.render(); });
    html.find(".chargen-boon-weapon-type").click(ev => { this.state.boonWeaponType = ev.currentTarget.dataset.type; this.state.boon = null; this.render(); });
    html.find(".chargen-roll-advanced-weapon").click(() => this._rollAdvancedWeapon());
    html.find(".chargen-roll-crucible").click(() => this._rollCrucible());
    html.find(".chargen-roll-implant").click(() => this._rollImplant());
    html.find(".chargen-roll-exotica").click(() => this._rollExotica());
    html.find(".chargen-roll-codex").click(() => this._rollCodex());
    html.find(".chargen-gift-mode").click(ev => { this.state.giftMode = ev.currentTarget.dataset.mode; this.state.boon = null; this.render(); });
    html.find(".chargen-roll-gift").click(() => this._rollGift());

    // Step 6 — Review & Create
    html.find(".chargen-character-name").change(ev => { this.state.characterName = ev.currentTarget.value; });
    html.find(".chargen-target-user").change(ev => { this.state.targetUserId = ev.currentTarget.value; });
    html.find(".chargen-create").click(() => this._finalizeCharacter());
    html.find(".chargen-start-over").click(() =>
    {
      if(!confirm("Discard everything rolled so far and start a new character?")) return;
      this.state = KnaveCharacterCreator.freshState();
      this._scrollToTop = true;
      this.render();
    });
  }

  _goStep(n)
  {
    this.state.step = n;
    this._scrollToTop = true;
    this.render();
  }

  /** A new step opens at its top; any other re-render keeps the scroll place. */
  _restoreScrollPositions(html)
  {
    if(!this._scrollToTop) return super._restoreScrollPositions(html);
    this._scrollToTop = false;
    html.find(".chargen-step-body").scrollTop(0);
  }

  /* -------------------------------------------- */
  /* Step 0 — Attributes                           */
  /* -------------------------------------------- */

  _rollAttributes()
  {
    this.state.abilities = ABILITY_KEYS.map((longKey, i) =>
      ({ key: ABILITY_SHORT_KEY[longKey], name: ABILITIES[i], ...rollAbilityBonus() }));
    this.state.swapSelected = [];
    this.state.hasSwapped = false;

    const lines = this.state.abilities.map(a => `${a.name}: [${a.dice.join(", ")}] → bonus +${a.bonus}`);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: `<b>Attributes rolled (3d6, lowest die = bonus)</b><br>${lines.join("<br>")}` });

    this.render();
  }

  _selectAbilityForSwap(idx)
  {
    if(this.state.hasSwapped) return;
    const sel = this.state.swapSelected;
    if(sel.includes(idx))
    {
      this.state.swapSelected = sel.filter(i => i !== idx);
    }
    else
    {
      sel.push(idx);
      if(sel.length === 2)
      {
        const [a, b] = sel;
        const tmp = this.state.abilities[a].bonus;
        this.state.abilities[a].bonus = this.state.abilities[b].bonus;
        this.state.abilities[b].bonus = tmp;
        this.state.hasSwapped = true;
        this.state.swapSelected = [];
      }
    }
    this.render();
  }

  /* -------------------------------------------- */
  /* Step 1 — Ancestry                             */
  /* -------------------------------------------- */

  _rollAncestry()
  {
    const checked = ANCESTRIES.filter(a => this.state.ancestryChecks[a]);
    if(!checked.length)
    {
      ui.notifications.warn("Check at least one ancestry.");
      return;
    }

    if(checked.length === 1)
    {
      this.state.ancestry = checked[0];
    }
    else
    {
      const roll = new Roll(`1d${checked.length}`);
      roll.evaluate({ async: false });
      roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `Ancestry roll (1 of ${checked.length} candidates)` });
      this.state.ancestry = checked[roll.total - 1];
    }

    // Reset everything downstream of ancestry, same as the standalone tool.
    this.state.spark = null;
    this.state.hp = null;
    this.state.equipment = null;
    this.state.boon = null;
    this.state.boonName = null;

    this.render();
  }

  /* -------------------------------------------- */
  /* Step 2 — Spark tables                         */
  /* -------------------------------------------- */

  _rollSingleSpark(section, column)
  {
    const table = SPARK_TABLES[this.state.ancestry][section];
    const ci = table.columns.indexOf(column);
    const ri = d(20) - 1;
    this.state.spark[section][column] = table.rows[ri][ci];
    this.render();
  }

  _rollAllSpark(section)
  {
    const table = SPARK_TABLES[this.state.ancestry][section];
    table.columns.forEach((col, ci) =>
    {
      const ri = d(20) - 1;
      this.state.spark[section][col] = table.rows[ri][ci];
    });
    this.render();
  }

  _rollFlatAppearance()
  {
    const rows = SPARK_TABLES["Newbeast"].appearance.rows;
    this.state.spark.appearance["Animal Form"] = pick(rows)[0];
    this.render();
  }

  _rollSpore()
  {
    const table = SPARK_TABLES[this.state.ancestry].spore_table;
    const roll = d(20);
    const entry = table.find(e => roll >= e.min && roll <= e.max);
    this.state.spark.spore = { roll, name: entry.name, effect: entry.effect };
    this.render();
  }

  _rollBloomboon()
  {
    const table = SPARK_TABLES[this.state.ancestry].bloomboon_table;
    const roll = d(20);
    const entry = table.find(e => e.result === roll);
    this.state.spark.bloomboon = { roll, name: entry.name, effect: entry.effect };
    this.render();
  }

  /** Rolls `mutation_rolls` unique mutations — Matt's ruling: a duplicate
   * (within this batch, or matching `excludeRolls`) is a re-roll, same as
   * he'd call it at the table. `excludeRolls` is for the future Proteus
   * level-up reroll (work-queue item 5) to pass in the character's
   * already-owned mutations' roll numbers, so those get excluded too — not
   * used yet since chargen has nothing to exclude but its own batch. */
  _rollMutations(excludeRolls = [])
  {
    const count = SPARK_TABLES[this.state.ancestry].mutation_rolls || 1;
    const results = [];
    const used = new Set(excludeRolls);
    for(let i = 0; i < count; i++)
    {
      let roll;
      do { roll = d(100); } while(used.has(roll));
      used.add(roll);
      const entry = MUTATION_TABLE[roll - 1];
      // `index` is the explicit ordering field Matt ruled for on 2026-09-07:
      // the contradiction rule needs to know which mutation is MORE RECENT,
      // and the stored d100 `roll` is a die result, not an order. Document
      // creation order does not carry it either, since a whole batch goes
      // through one Item.create and may share a timestamp.
      const result = { roll, index: i, name: entry.name, effect: entry.effect, abilityMod: entry.abilityMod, hpBonus: entry.hpBonus, slotBonus: entry.slotBonus, avBonus: entry.avBonus, avReplacesArmour: entry.avReplacesArmour, naturalWeapon: entry.naturalWeapon, handsBonus: entry.handsBonus, replacesUnarmed: entry.replacesUnarmed };
      // Extra Eyes (roll 33) is the one entry whose bonus is itself
      // randomized (d3 extra eyes, +1 PSY each) rather than a fixed number
      // stored in mutation-data.js — roll it here instead.
      if(roll === 33)
      {
        const eyes = d(3);
        result.effect = `You have ${eyes} extra eye${eyes === 1 ? "" : "s"} on your forehead. +1 PSY for each.`;
        result.abilityMod = { psyche: eyes };
      }
      results.push(result);
    }
    // Contradiction rule (Cacogen's Corrupted Blood, generalised to all
    // mutation grants by Matt on 2026-09-07): resolve BEFORE anything reads
    // this array, so a superseded mutation takes every one of its effects
    // with it - ability/HP/slot/AV bonuses, blocksTwoHanded, its Item and
    // its natural weapon - without any of the ~10 downstream readers needing
    // to know the rule exists.
    const { kept, superseded } = resolveUnarmedContradiction(results);
    this.state.spark.mutations = kept;
    this.state.spark.mutationsSuperseded = superseded;
    this.render();
  }

  /* -------------------------------------------- */
  /* Step 3 — Hit Points                           */
  /* -------------------------------------------- */

  _selectHPMode(mode)
  {
    this.state.hpMode = mode;
    if(mode === "flat")
    {
      const con = this.state.abilities.find(a => a.key === "con");
      this.state.hp = { current: 5, maximum: 5, healingRate: `1d8+${con.bonus}`, flat: true };
    }
    else
    {
      this.state.hp = null;
    }
    this.render();
  }

  _rollHP()
  {
    const isLithling = this.state.ancestry === "Lithling";
    const con = this.state.abilities.find(a => a.key === "con");
    const { roll, formula } = rollStartingHP(this.state.ancestry);
    roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: isLithling ? `Lithling starting HP (${formula})` : `Starting HP (${formula})` });

    const max = roll.total;
    this.state.hp = { current: max, maximum: max, healingRate: isLithling ? "N/A (Lithling cannot heal)" : `1d8+${con.bonus}` };
    this.render();
  }

  /* -------------------------------------------- */
  /* Step 4 — Equipment                            */
  /* -------------------------------------------- */

  _rollWeapon()
  {
    const table = this.state.weaponType === "melee" ? MELEE_WEAPONS : RANGED_WEAPONS;
    // The starting weapon is a Basic weapon: d12 on the base table, not d20.
    const { base } = rollWeaponBase(table, "Basic", d);
    const tag = BASIC_TAGS[d(20) - 1];
    this.state.equipment.weapon =
    {
      name: base.name, tag: tag.name, full_name: `${tag.name} ${base.name}`,
      damage: base.damage, slots: base.slots, hands: base.hands ?? 1, ammo_die: base.ammo_die || null,
      base_tags: base.base_tags || [], tag_effect: tag.effect, type: this.state.weaponType,
    };
    this.render();
  }

  _rollArmour()
  {
    const roll = d(20);
    const entry = ARMOUR_TABLE.find(e => roll >= e.min && roll <= e.max);
    // Its own d20, not a pick from the type's row - see ARMOUR_QUALITIES.
    const quality = ARMOUR_QUALITIES[d(20) - 1];
    this.state.equipment.armour = { mode: "quality", name: entry.type, quality, av: entry.av, armour_bonus: entry.av - 10, slots: entry.slots, special: entry.special, toxSaveAdv: entry.toxSaveAdv ?? false };
    this.render();
  }

  /** Helm and Shield are GEAR results in JADE IBIS 15-09-26 (Gear A 20
   * "Helmet (+1 AV, see opposite)", Gear B 20 "Shield (+1 AV, see
   * opposite)"), not an alternative to the armour roll. RULED 2026-09-17
   * (Matt): the "Helm & Shield" alternative mode is retired; a Helmet or
   * Shield gear result rolls its name on HELM_TABLE / SHIELD_TABLE (the
   * "see opposite" table) and becomes an armor Item worth +1 AV, one slot,
   * exactly as the old alternative created them.
   */
  static GEAR_HELMET = "Helmet (+1 AV)";
  static GEAR_SHIELD = "Shield (+1 AV)";
  // The Gear B drug slot's placeholder. The drug itself is its own Item,
  // built from eq.drug; the placeholder must never become one as well.
  static GEAR_DRUG = "Drug (see below)";

  _rollGear()
  {
    const gearA = GEAR_A[d(20) - 1];
    const gearBRoll = d(20) - 1;
    let gearBName = GEAR_B_BASE[gearBRoll];
    let drug = null;

    if(gearBRoll === GEAR_B_DRUG_INDEX)
    {
      drug = this._generateDrug();
      gearBName = KnaveCharacterCreator.GEAR_DRUG;
    }

    this.state.equipment.gear = [gearA, gearBName];
    this.state.equipment.drug = drug;
    this.state.equipment.helm = gearA === KnaveCharacterCreator.GEAR_HELMET ? HELM_TABLE[d(20) - 1] : null;
    this.state.equipment.shield = gearBName === KnaveCharacterCreator.GEAR_SHIELD ? SHIELD_TABLE[d(20) - 1] : null;
    this.render();
  }

  _generateDrug()
  {
    const hue = DRUG_HUES[d(20) - 1];
    const form = DRUG_FORMS[d(20) - 1];
    const ingested_by = DRUG_INGESTED[d(20) - 1];
    const e1 = d(20) - 1;
    let e2 = d(20) - 1;
    while(e2 === e1) e2 = d(20) - 1;
    return { hue, form, ingested_by, effects: [DRUG_EFFECTS[e1], DRUG_EFFECTS[e2]] };
  }

  /* -------------------------------------------- */
  /* Step 5 — Boon                                 */
  /* -------------------------------------------- */

  _rollBoon()
  {
    const roll = new Roll("1d6");
    roll.evaluate({ async: false });
    roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: "Starting Boon roll (1d6)" });
    this.state.boonName = BOONS[roll.total - 1];
    this.state.boon = null;
    this.render();
  }

  _rollAdvancedWeapon()
  {
    const table = this.state.boonWeaponType === "melee" ? MELEE_WEAPONS : RANGED_WEAPONS;
    const { base } = rollWeaponBase(table, "Advanced", d);
    const basicTag = BASIC_TAGS[d(20) - 1];
    const advTag = ADVANCED_TAGS[d(20) - 1];
    this.state.boon =
    {
      name: "Advanced Weapon",
      weapon:
      {
        name: base.name, basic_tag: basicTag.name, advanced_tag: advTag.name,
        full_name: `${basicTag.name} ${advTag.name} ${base.name}`,
        damage: base.damage, slots: base.slots, hands: base.hands ?? 1, ammo_die: base.ammo_die || null,
        base_tags: base.base_tags || [], basic_tag_effect: basicTag.effect, advanced_tag_effect: advTag.effect,
        type: this.state.boonWeaponType,
      }
    };
    this.render();
  }

  _rollCrucible()
  {
    const quality = CRUCIBLE_QUALITIES[d(20) - 1];
    const shape = CRUCIBLE_SHAPES[d(20) - 1];
    // Weighted d100 since CRIMSON HOUND, so array position is no longer the
    // roll — see roll-range.js.
    const elixir = rollOnTable(ELIXIRS, d);
    this.state.boon =
    {
      name: "Alchemist's Crucible and an Elixir",
      crucible: { quality, shape, full_name: `${quality} ${shape}` },
      elixir: { name: elixir.name, potency: elixir.potency, component: elixir.component, effect: elixir.effect, declaredSpan: elixir.declaredSpan ?? null },
    };
    this.render();
  }

  _rollImplant()
  {
    const implant = IMPLANTS[d(20) - 1];
    this.state.boon = { name: "Cybernetic Implant", implant: { name: implant.name, ability_slot: implant.ability_slot, effect: implant.effect, stat_mod: implant.stat_mod || null, hp_bonus: implant.hp_bonus || null, naturalWeapon: implant.naturalWeapon || null, avBonus: implant.avBonus || null } };
    this.render();
  }

  _rollExotica()
  {
    const item = EXOTICA[d(20) - 1];
    this.state.boon = { name: "Exotica", item: { name: item.name, description: item.description, armorType: item.armorType, declaredSpan: item.declaredSpan ?? null } };
    this.render();
  }

  _rollCodex()
  {
    const appearance = CODEX_APPEARANCES[d(20) - 1];
    // Weighted d100 since CRIMSON HOUND — see roll-range.js.
    const equation = rollOnTable(EQUATIONS, d);
    this.state.boon = { name: "Hypergeometric Codex", codex: { appearance, equation: { name: equation.name, effect: equation.effect }, slots: 1 } };
    this.render();
  }

  _rollGift()
  {
    if(this.state.giftMode === "sample")
    {
      const i = d(20) - 1;
      this.state.boon = { name: "Mystic Gift", gift: { type: "sample", source: GIFT_SOURCES[i], name: GIFT_NAMES[i], slots: 1 } };
    }
    else
    {
      const qCol = Math.floor(Math.random() * 4);
      const quality = GIFT_QUALITIES_ALL[qCol][d(20) - 1];
      const fCol = Math.floor(Math.random() * 4);
      const form = GIFT_FORMS_ALL[fCol][d(20) - 1];
      this.state.boon = { name: "Mystic Gift", gift: { type: "random", quality, form, full_name: `${quality} ${form}`, slots: 1 } };
    }
    this.render();
  }

  /* -------------------------------------------- */
  /* Step 6 — Review & Create                      */
  /* -------------------------------------------- */

  /**
   * Build the Actor and its Items directly from wizard state — the same
   * data mapping macros/dev/import-character-from-json.js applies to a pasted
   * JSON export, just read straight off `this.state` instead. See that
   * macro's comments for the reasoning behind each mapping decision;
   * deviations from it are called out below.
   */
  async _finalizeCharacter()
  {
    const s = this.state;
    if(!(s.abilities && s.ancestry && s.hp && s.equipment?.weapon && s.equipment?.armour && s.boon))
    {
      ui.notifications.warn("Finish every step (attributes, ancestry, HP, weapon, armour, gear, boon) before creating the character.");
      return;
    }
    if(SPARK_TABLES[s.ancestry]?.mutation_rolls && !s.spark?.mutations)
    {
      // STEP 2b, NOT STEP 2. The control lives in the template's `isStep2`
      // block, which renders as "Step 2b — Spark Tables"; Step 2 is Choose
      // Ancestry and has no mutation control on it at all. Found in the
      // 2026-09-10 regression run, where following this message led to a step
      // that could not satisfy it — the character simply could not be created
      // until you guessed where the button really was.
      ui.notifications.warn(`Roll mutations (Step 2b — Spark Tables) before creating the character.`);
      return;
    }

    const notes = [];

    // THE BASE, not _effectiveAbilities (Stats as Sentences chunk 2d-iii, RULED
    // 2026-10-07): the rolled mutations' and the implant's ability bonuses run
    // live from their Items (marked below), clamped at +10 as the sum was here.
    // The review step still shows _effectiveAbilities' totals.
    const abilities = {};
    for(const a of this.state.abilities)
      abilities[a.key] = { value: a.bonus, max: 10, woundDamage: 0 };

    const creatureFlags = ANCESTRY_CREATURE_TYPES[s.ancestry] || [];
    const creatureTypes = { biological: false, synthetic: false, psychic: false, fungal: false, mineral: false, hypergeometric: false, outsider: false };
    for(const flag of creatureFlags) creatureTypes[flag] = true;

    // Structured Spark Descriptors (foundry-system-index.csv). The rolled
    // columns are STORED rather than written into the biography as prose.
    //
    // They used to be seeded here as <p><b>Key:</b> value</p> paragraphs, which
    // made them a one-time snapshot inside a player-EDITABLE field: correcting
    // a roster later could never reach them, and the sheet had no live copy to
    // correct. That is the same failure the ancestry special rules were pulled
    // out of this biography for, and the comment below still describes it.
    //
    // A LIST, not a fixed set of fields. The columns vary by ancestry - a
    // True-kin has Caste where a Mycomorph has Spores - which is exactly why
    // the inherited eleven-field trait block was deleted (Character Trait
    // Fields, REMOVED). `group` is carried because the two tables are genuinely
    // separate in the book, not to drive any layout.
    //
    // Spore and bloomboon are deliberately absent: they already become ancestry
    // Items further down, carrying name, variant and effect, so they are live
    // without this.
    const spark = [];
    for(const [label, value] of Object.entries(s.spark?.personality || {}))
      if(value) spark.push({ group: "personality", label, value });
    for(const [label, value] of Object.entries(s.spark?.appearance || {}))
      if(value) spark.push({ group: "appearance", label, value });

    // The biography now starts EMPTY and belongs to the player. Ancestry is not
    // seeded either: the sheet's ancestry block renders it live.
    const bioLines = [];
    // Ancestry special rules are deliberately NOT seeded here any more —
    // foundry-system-index.csv "Ancestry Special Rule Single Rendering".
    //
    // They used to be, filtered so that a rule with its own `ancestry` Item
    // was skipped. That filter was correct and still left 9 of the 10
    // ancestries printing their rules twice on the description tab: once in
    // this biography and once in the sheet's live ancestry block, which
    // applied no filter at all. The two copies then drifted, because only
    // the live one tracks an edit to the roster — Neobloom Photosynthesis
    // was an edition behind in exactly this way.
    //
    // The biography is a player-EDITABLE field, so a copy seeded here can
    // never be corrected later without touching text the player owns. The
    // live block can, so it is the single source now and this seeds nothing.
    // The filter moved there, keyed on the Items an actor holds.

    const mutations = s.spark?.mutations || [];
    const superseded = s.spark?.mutationsSuperseded || [];
    const mutationHpBonus = mutations.reduce((sum, m) => sum + (m.hpBonus || 0), 0);
    const mutationSlotBonus = mutations.reduce((sum, m) => sum + (m.slotBonus || 0), 0);
    const hpBonus = (s.boon?.implant?.hp_bonus || 0) + mutationHpBonus;
    const maxHP = s.hp.maximum + hpBonus;
    const characterName = (s.characterName || "").trim() || s.spark?.personality?.Name || `New ${s.ancestry}`;

    // Work-queue item 11 (2026-08-25): everything chargen creates now starts
    // unequipped (default state), so baking a "fully-equipped" AV into a
    // fresh actor here would be immediately stale — actor.js's live
    // _prepareCharacterData recomputes armor.value from equipped items on
    // the very first prepareData() after creation anyway (correctly landing
    // on 10 + mutation avBonus, since nothing is worn yet). No armor.value
    // bake needed here any more; _effectiveArmourAV/_effectiveArmourAVInfo
    // still exist purely for the Review step's "AV once equipped" preview.
    const actorSystem =
    {
      health: { value: maxHP, max: maxHP },
      abilities,
      creatureTypes,
      biography: bioLines.join(""),
      spark,
      ancestry: s.ancestry,
      // Read off the ancestry roster rather than tested for by name here, so
      // "which ancestries cannot heal" stays a data question with one answer.
      // Empty for every ancestry but Lithling, which is what the gate reads as
      // "no prohibition" -- see noHealRule() in deprived.js.
      noHealRule: SPARK_TABLES[s.ancestry]?.no_heal_rule || "",
    };
    // Item Slots.md's hard 20-slot cap is a per-actor field (template.json
    // default 20), not derived — a few mutations (Centaur, Kangaroo Pouch)
    // raise it directly, same as everything else this wizard bakes in.
    // Live since Stats as Sentences chunk 2d-iii: the mutations' slots come from their Items.
    // Same pattern for hands.max (item 11) — Extra Arms is the only
    // handsBonus mutation today.
    // Live since 2d-iii, as the slots.
    // A player without Create New Actors has the GM's client create it, as
    // its owner (gm-relay.js, RULED 2026-09-28). Refused or unanswered, the
    // wizard stays open with everything rolled, so Create can be clicked again.
    const actor = await createActorAsOwner(
    {
      name: characterName,
      type: "character",
      system: actorSystem
    });
    if(!actor) return;

    const items = [];
    const eq = s.equipment;

    // Work-queue item 4.2 (2026-08-27): Shoddy is a BASIC tag, so it can
    // roll on a Basic-quality starting weapon too — this path needed the
    // same static damage-modifier bake as weapon-roller.js/the Advanced
    // Weapon boon below.
    const startingWeaponTags = [eq.weapon.tag, ...(eq.weapon.base_tags || [])].filter(Boolean);
    const weaponSystem =
    {
      // The base in the fields, the tags live (Stats as Sentences chunk 2d-i, RULED 2026-10-07).
      slots: eq.weapon.slots ?? 1,
      hands: eq.weapon.hands ?? 1,
      damageDice: normalizeDamageDice(eq.weapon.damage),
      tags: startingWeaponTags,
      // Trade-value tags were never applied on this path — a Gilded starting
      // weapon was worth 1 while a Gilded generated one was worth 2. Starting
      // weapons are Basic tier, so no tier bonus applies.
      tradeValue: eq.weapon.tradeValue ?? 1,
      description: `${eq.weapon.tag ? `<p><b>Tag:</b> ${eq.weapon.tag} — ${eq.weapon.tag_effect}</p>` : ""}${(eq.weapon.base_tags || []).length ? `<p><b>Built-in tags:</b> ${eq.weapon.base_tags.join(", ")}</p>` : ""}`,
    };
    if(eq.weapon.ammo_die)
    {
      const die = normalizeUsageDie(eq.weapon.ammo_die);
      weaponSystem.usageDie = { die, max: die };
    }
    items.push({ name: eq.weapon.full_name, type: eq.weapon.type === "ranged" ? "weaponRanged" : "weaponMelee", system: weaponSystem, flags: { vaarn: { liveStats: true, tier: "Basic" } } });

    // A Helmet or Shield rolled as GEAR (JADE IBIS gear 20A / 20B) is a
    // separate armor Item, +1 AV each, the same shape the retired "Helm &
    // Shield" alternative used to create: armorSlot/avBonus (work-queue item
    // 11, 2026-08-25) tell a Helm/Shield apart from body armor and from each
    // other, avBonus is live-summed by actor.js, `defense: 11` is decorative.
    if(eq.helm)
      items.push({ name: eq.helm, type: "armor", system: { slots: 1, armorSlot: "helm", avBonus: 1, description: "<p>+1 AV while worn.</p>" } });
    if(eq.shield)
      items.push({ name: eq.shield, type: "armor", system: { slots: 1, armorSlot: "shield", avBonus: 1, description: "<p>+1 AV while carried. Must be actively carried — lost if you drop it or are disarmed.</p>" } });
    items.push(
    {
      name: `${eq.armour.quality} ${eq.armour.name}`,
      type: "armor",
      system: { slots: eq.armour.slots ?? 1, armorSlot: "body", avBonus: (eq.armour.av ?? 11) - 10, description: eq.armour.special ? `<p>${eq.armour.special}</p>` : "", toxSaveAdv: eq.armour.toxSaveAdv ?? false }
    });

    for(const gearName of eq.gear || [])
    {
      // Helmet / Shield gear results became armor Items above; no plain item.
      if(gearName === KnaveCharacterCreator.GEAR_HELMET || gearName === KnaveCharacterCreator.GEAR_SHIELD) continue;
      // The drug placeholder likewise: the rolled drug is pushed from eq.drug
      // below. Found 2026-09-19 (Group 209) — every drug-slot character also
      // got a plain Item named "Drug (see below)".
      if(gearName === KnaveCharacterCreator.GEAR_DRUG) continue;
      // Usage die and "(×N)" count parsed out of the name, both suffixes
      // stripped — see gearItemData.
      items.push(gearItemData(gearName));
    }

    if(eq.drug)
      items.push({ name: `${eq.drug.hue || ""} ${eq.drug.form || "Drug"}`.trim(), type: "item", system: { slots: 1, description: `${eq.drug.ingested_by ? `Ingested by: ${eq.drug.ingested_by}. ` : ""}${(eq.drug.effects || []).join(" + ")}` } });

    if(eq.synth_parts)
      items.push({ name: "Synth Parts", type: "item", system: { slots: THIRD_OF_A_SLOT, quantity: eq.synth_parts, description: "Repairs take an hour and use one Synth Part, healing d8+CON HP (or one Wound if HP is full)." } });

    if(eq.water_rations)
      items.push({ name: "Water Ration", type: "item", system: { slots: THIRD_OF_A_SLOT, quantity: eq.water_rations } });

    if(eq.food_rations)
      items.push({ name: "Food Ration", type: "item", system: { slots: THIRD_OF_A_SLOT, quantity: eq.food_rations } });

    // JADE IBIS: "All new PCs begin play with 3 rations of water (1 slot), 3
    // rations of food (1 slot), and a chemcell torch that attaches to their
    // clothing (no slots)." ALL new PCs - no ancestry is exempt, unlike the
    // rations above. RULED 2026-09-21 (Matt), with a light toggle on the Item:
    // see module/item/light-source.js.
    items.push(chemcellTorchItem());

    // Mutations get their own Item (0 slots — a trait, not gear) so they're
    // visible on the sheet and colour-tinted like gift/codex/implant/etc.
    // Ability/HP/slot bonuses are already baked into abilities/maxHP/
    // actorSystem.inventorySlots above; everything else in `effect` is
    // narrative/GM-adjudicated for now (see work-queue.txt item 1).
    for(const m of mutations)
      items.push({ name: m.name, type: "mutation", system: { slots: 0, roll: m.roll, description: `<p><b>d100 roll:</b> ${m.roll}</p><p>${m.effect}</p>` },
        // LIVE (2d-iii): Extra Eyes keeps the count rolled above; max HP stays written
        // into the actor (ruling 1) and is recorded so a delete lowers it.
        flags: { vaarn: { liveStats: m.name === "Extra Eyes" ? { rolled: { psy: Number(m.abilityMod?.psyche ?? 0) } } : true,
                          ...(m.hpBonus ? { bakedEffects: { hpBonus: m.hpBonus } } : {}) } } });
    // Ruling C 7 (Matt, 2026-10-05): an Albino starts with the sunshade its
    // mutation needs - "You must carry a sunshade (1 slot)" - so its daylight DIS
    // is the player's choice to put down, not a shopping trip.
    if(mutations.some(m => m.name === "Albino"))
      items.push({ name: "Sunshade", type: "item", system: { slots: 1, description: "<p>A sunshade. Carried, it spares an Albino their DIS on Saves in daylight.</p>" } });

    // Ancestry special rules the player actively uses get their own Item
    // (0 slots — a trait, not gear), so they are clickable instead of
    // buried in the description tab. foundry-system-index.csv "Ancestry
    // Rule as Rollable Item", Matt's ruling 2026-09-01 from item 62.4.
    //
    // Nothing new is rolled here: every variant was already rolled earlier
    // in the wizard and is already sitting on `state.spark`. Per Matt's
    // design the rolled variant goes in the NAME ("Twice Born: Soldier")
    // and the book's rule text in the DESCRIPTION.
    for(const def of ANCESTRY_RULE_ITEMS[s.ancestry] || [])
    {
      // Three sources of variant, all already stored: a spark-table roll
      // held as {name, effect, roll}, a personality-table column, or no
      // variant at all (Photosynthesis), which stays plainly named.
      let variant = "", variantEffect = "", variantRoll = 0;
      if(def.variantFrom === "spore" || def.variantFrom === "bloomboon")
      {
        const rolled = s.spark?.[def.variantFrom];
        if(!rolled) continue;
        variant = rolled.name;
        variantEffect = rolled.effect;
        variantRoll = rolled.roll || 0;
      }
      else if(def.variantFrom)
      {
        variant = s.spark?.personality?.[def.variantFrom] || "";
      }

      items.push(ancestryRuleItemData(s.ancestry, def, { variant, variantEffect, variantRoll }));
    }

    // Every character is created with a base unarmed strike, so a character
    // holding no weapon has something to roll. Suppressed when a rolled
    // mutation REPLACES the unarmed attack rather than adding to it: Claws
    // Crab (d8), Claws Retractable (d6) and Poison Spur (d6 TOX) each say
    // "your unarmed attack deals dX", so the base d4 and the mutation cannot
    // both be on the sheet — that would be two unarmed attacks, one of them
    // wrong. Any contradiction BETWEEN those three was already resolved at
    // roll time, so at most one can be standing here.
    const unarmedReplaced = mutations.some(m => m.replacesUnarmed);
    if(!unarmedReplaced)
      items.push(
      {
        name: UNARMED_STRIKE.name,
        type: "weaponMelee",
        system:
        {
          slots: 0,
          // Born equipped/0-hands for the same reason every natural weapon
          // below is: a body part is not carried gear and must not sit
          // behind item 11's equip gate.
          equipped: true,
          hands: 0,
          // Intrinsic Item Marker: a body part, not carried gear. Set here
          // rather than by knave.js's type hook, because weaponMelee is the
          // one type where this is genuinely a per-Item question.
          intrinsic: true,
          damageDice: normalizeDamageDice(UNARMED_STRIKE.damage),
          description: `<p>Your bare hands. ${UNARMED_STRIKE.note}</p>`,
        }
      });

    // Natural-weapon mutations (Beak, Claws, Fangs, Horns, Tusks, etc.) also
    // get a real weaponMelee/weaponRanged Item (0 slots — a body part, not
    // carried gear) so they're clickable through the same attack-roll
    // pipeline as any other weapon, instead of being flavor-text-only.
    for(const m of mutations)
    {
      if(!m.naturalWeapon) continue;
      const nw = m.naturalWeapon;
      items.push(
      {
        name: nw.name,
        type: nw.type === "ranged" ? "weaponRanged" : "weaponMelee",
        system:
        {
          slots: 0,
          // BUG FIX 2026-08-25 (work-queue item 11): a natural weapon is a
          // body part, not carried gear — it can't be "unequipped" and
          // doesn't occupy a hand the way a held weapon does. Born already
          // equipped/0-hands so it isn't silently unusable behind item 11's
          // new equip gate the moment it's created.
          equipped: true,
          hands: 0,
          intrinsic: true,   // Intrinsic Item Marker — a body part, not carried gear.
          damageDice: normalizeDamageDice(nw.damage),
          // The damage type, as item-effects.js already copies it for a
          // mutation gained in play. Missing here until 2026-09-18, which is
          // why a chargen Poison Spur hit a Synthetic for full damage.
          base_tags: [...(nw.tags ?? [])],
          description: `<p>Natural weapon from the <b>${m.name}</b> mutation.</p>${nw.note ? `<p>${nw.note}</p>` : ""}`,
        }
      });
    }

    // Ancestry special rules that grant a natural weapon (Cacklemaw Exile's
    // Biter) get the identical treatment — Matt's ruling 2026-09-07 is to
    // build these exactly like Powerful Jaws, so this deliberately mirrors
    // the loop above rather than generalising the two into one.
    for(const def of ANCESTRY_NATURAL_WEAPONS[s.ancestry] || [])
    {
      const nw = def.naturalWeapon;
      items.push(
      {
        name: nw.name,
        type: nw.type === "ranged" ? "weaponRanged" : "weaponMelee",
        system:
        {
          slots: 0,
          // Born equipped/0-hands for the same reason the mutation loop
          // above does it: a body part is not carried gear and must not
          // sit behind item 11's equip gate.
          equipped: true,
          hands: 0,
          intrinsic: true,   // Intrinsic Item Marker — a body part, not carried gear.
          damageDice: normalizeDamageDice(nw.damage),
          base_tags: [...(nw.tags ?? [])],
          description: `<p>Natural weapon from the <b>${def.rule}</b> ancestry rule (${s.ancestry}).</p>${nw.note ? `<p>${nw.note}</p>` : ""}`,
        }
      });
    }

    const boon = s.boon;
    if(boon.name === "Mystic Gift" && boon.gift)
    {
      const g = boon.gift;
      items.push(
      {
        name: g.type === "sample" ? g.name : g.full_name,
        type: "gift",
        system:
        {
          slots: g.slots ?? 1,
          source: g.source || (g.type === "random" ? `${g.quality} / ${g.form}` : ""),
          description: g.type === "random" ? "<p>Random Gift — players and referee must collectively agree on the specific effect.</p>" : "",
        }
      });
    }
    else if(boon.name === "Hypergeometric Codex" && boon.codex)
    {
      const c = boon.codex;
      items.push(
      {
        name: `Hypergeometric Codex (${c.equation?.name || "unset"})`,
        type: "codex",
        system: { slots: c.slots ?? 1, equation: c.equation?.name || "", description: c.appearance ? `<p>${c.appearance}</p>` : "" }
      });
    }
    else if(boon.name === "Advanced Weapon" && boon.weapon)
    {
      const w = boon.weapon;
      // Work-queue item 4.2 (2026-08-27): same static damage-modifier
      // bake as the other 2 weapon-creation sites — Advanced Weapon caps
      // at Advanced tier (basic+advanced tags only), so only Shoddy/Heavy
      // can actually occur here (Autarch's/Nano-edged/Colossal are
      // Exotic-tier), but the shared functions no-op harmlessly either way.
      const advWeaponTags = ["Fragile", w.basic_tag, w.advanced_tag, ...(w.base_tags || [])].filter(Boolean);
      const advWeaponSystem =
      {
        // The base in the fields, the tags and the tier live (Stats as Sentences chunk 2d-i).
        slots: w.slots ?? 1,
        hands: w.hands ?? 1,
        damageDice: normalizeDamageDice(w.damage),
        tags: advWeaponTags,
        // Advanced tier: the tags' multipliers and Matt's x2 tier bonus live; the base's own value,
        // as every other site (no base table carries one, so 1 - CHECKED 2026-10-07).
        tradeValue: w.tradeValue ?? 1,
        description: `<p><b>Fragile:</b> breaks on a natural 1 attack roll (cleared manually from this sheet once repaired — narratively, Advanced-tier repairs are said to take d10−INT days).</p><p><b>${w.basic_tag}:</b> ${w.basic_tag_effect}</p><p><b>${w.advanced_tag}:</b> ${w.advanced_tag_effect}</p>${w.ammo_die ? "<p>Ammo only available in Vaarnish cities.</p>" : ""}`,
      };
      if(w.ammo_die)
      {
        const die = normalizeUsageDie(w.ammo_die);
        advWeaponSystem.usageDie = { die, max: die };
      }
      items.push({ name: `${w.full_name} (Fragile)`, type: w.type === "ranged" ? "weaponRanged" : "weaponMelee", system: advWeaponSystem, flags: { vaarn: { liveStats: true, tier: "Advanced" } } });
    }
    else if(boon.name === "Cybernetic Implant" && boon.implant)
    {
      const i = boon.implant;
      // stat_mod/hp_bonus/naturalWeapon/avBonus (8 of 20 implants — item
      // 10.2, 2026-08-25) are mechanically applied; the rest of `effect`
      // is text-only for now, same gap as Exotica/Crucible below. See
      // work-queue.txt item 10.
      // slots: 0 — Cybernetics - Starting.md: implants do NOT occupy Item
      // Slots (bug fix, item 10.7, 2026-08-26: this used to say slots: 1).
      items.push({ name: i.name, type: "implant", system: { slots: 0, usesRemaining: i.name === "Trauma-Response Rig" ? 1 : 0, description: `<p><b>Ability slot:</b> ${i.ability_slot}</p><p>${i.effect}</p>` },
        // LIVE (2d-iii), its HP bonus recorded as the mutations' are.
        flags: { vaarn: { liveStats: true, ...(i.hp_bonus ? { bakedEffects: { hpBonus: i.hp_bonus } } : {}) } } });
      // Natural-weapon implants (Carbide Knucklebones) get a real
      // weaponMelee/weaponRanged Item too, same shape as item 3.2's
      // mutation naturalWeapon push — born already-equipped/0-hands since
      // it's part of the body, not carried gear (item 11's own fix).
      if(i.naturalWeapon)
      {
        const nw = i.naturalWeapon;
        items.push(
        {
          name: nw.name,
          type: nw.type === "ranged" ? "weaponRanged" : "weaponMelee",
          system: { slots: 0, equipped: true, hands: 0, intrinsic: true, damageDice: normalizeDamageDice(nw.damage), base_tags: [...(nw.tags ?? [])], description: `<p>Natural weapon from the <b>${i.name}</b> implant.</p>${nw.note ? `<p>${nw.note}</p>` : ""}` }
        });
      }
      if(i.stat_mod || i.hp_bonus)
        notes.push(`${i.name}'s ability bonus counts live from the implant; its HP bonus is in the actor's maximum, and removing the implant takes it back.`);
      if(i.naturalWeapon)
        notes.push(`${i.name} created a separate 0-slot weapon item — roll it like any other weapon.`);
      if(i.avBonus)
        notes.push(`${i.name}'s +${i.avBonus} AV is applied automatically and live — no note needed on the sheet itself.`);
    }
    else if(boon.name === "Exotica" && boon.item)
    {
      // Work-queue item 10.3.2 (2026-08-27): Visualiser Helm is the one
      // Starting Exotica flagged armorType — becomes a real `armor`-type
      // Item instead of flavor `exotica`, same as its Advanced-tier
      // counterparts (see generate-advanced-exotica.js).
      if(boon.item.armorType)
      {
        // The AV from its sentence (Stats as Sentences chunk 2b, ruling C).
        const armorSystem = { slots: 1, description: `<p>${boon.item.description}</p>`, armorSlot: boon.item.armorType.armorSlot, avBonus: exoticaArmourAv(boon.item.name) };
        if(boon.item.armorType.liveAbilityBonus) armorSystem.liveAbilityBonus = boon.item.armorType.liveAbilityBonus;
        // flags.vaarn.exotica, 2026-09-20, same fix and same reason as
        // loot-builders.js startingExoticaData: without it xp-value.js cannot
        // tell an armour-shaped Exotica from ordinary armour, and the Exotica
        // boon arrived showing a Trade Value where the identical Advanced-tier
        // case shows its 1 XP. The two copies of this branch are why it
        // survived this long. Found live in Group 253.17.
        items.push({ name: boon.item.name, type: "armor", system: armorSystem, flags: { vaarn: { exotica: true } } });
      }
      else
        items.push({ name: boon.item.name, type: "exotica", system: { slots: 1, description: `<p>${boon.item.description}</p>`, ...spanFieldFrom(boon.item) } });
    }
    else if(boon.name === "Alchemist's Crucible and an Elixir" && boon.crucible && boon.elixir)
    {
      // Two separate physical objects (a reusable container + a one-use
      // potion), so two Items — unlike the single combined item this used
      // to create, which also meant the crucible and its elixir couldn't
      // be told apart on the sheet or slotted/consumed independently.
      // Crucible Recipe Inscription (2026-09-19, Matt): the crucible arrives
      // with its paired Elixir inscribed, so drinking the Elixir no longer
      // loses the record of what brews it. The description names the Elixir
      // rather than pointing at "the Elixir below", which only held while the
      // two happened to sort next to each other.
      const recipe = sampleRecipe(boon.elixir.name)
        ?? { ...blankRecipe(boon.elixir.name), component: boon.elixir.component ?? "", potency: boon.elixir.potency ?? null, effect: boon.elixir.effect ?? "" };
      items.push({ name: boon.crucible.full_name, type: "crucible",
        flags: { [RECIPES_SCOPE]: { [RECIPES_FLAG]: [recipe] } },
        system: { slots: 1, description: `<p>Alchemist's Crucible — ${boon.crucible.quality} quality, ${boon.crucible.shape}-shaped. Came with a ${boon.elixir.name}, whose recipe is inscribed on it (Recipes tab).</p>` } });
      items.push({ name: boon.elixir.name, type: "item", system: { slots: 1, description: `<p><b>Potency ${boon.elixir.potency}:</b> ${boon.elixir.effect}</p>${boon.elixir.component ? `<p><b>Component:</b> ${boon.elixir.component}</p>` : ""}`, ...spanFieldFrom(boon.elixir) } });
    }

    if(mutations.some(m => m.abilityMod || m.hpBonus || m.slotBonus || m.avBonus || m.handsBonus))
      notes.push("Rolled mutations' ability, Item Slot, AV and hands bonuses count live from the mutations; their HP bonuses are in the actor's maximum, and removing a mutation takes its own back — everything else in their descriptions is narrative, adjudicate at the table.");
    // blocksTwoHanded/blocksHelmet/blocksBodyArmour aren't in _rollMutations'
    // whitelist (they're read live off MUTATION_TABLE by name at equip-time,
    // never baked into the actor) — looked up the same way here.
    if(mutations.some(m => { const t = MUTATION_TABLE.find(t => t.name === m.name); return t?.blocksTwoHanded || t?.blocksHelmet || t?.blocksBodyArmour; }))
      notes.push("A rolled mutation restricts what this character can equip (two-handed weapons, helmets, or other body armor) — the sheet's Equip button enforces this automatically.");
    // The two unarmed-attack notes. Both describe an Item that is ABSENT,
    // which is the kind of thing nothing on the sheet can explain by itself.
    if(unarmedReplaced)
      notes.push(`No base Unarmed Strike was created — ${mutations.filter(m => m.replacesUnarmed).map(m => m.name).join(", ")} redefines the unarmed attack, and its natural weapon is this character's unarmed attack.`);
    if(superseded.length)
      notes.push(`Contradiction rule: ${superseded.map(m => `${m.name} (roll ${m.roll})`).join(", ")} was superseded by the later ${mutations.find(m => m.replacesUnarmed)?.name} and was NOT created — two mutations cannot both redefine the unarmed attack. All of the superseded mutation's effects went with it.`);
    if(mutations.some(m => m.naturalWeapon))
      notes.push("Rolled mutations that grant a natural weapon (Beak, Claws, Horns, etc.) each created a separate 0-slot weapon item — roll it like any other weapon.");
    for(const def of ANCESTRY_NATURAL_WEAPONS[s.ancestry] || [])
      notes.push(`${s.ancestry}'s ${def.rule} rule created a 0-slot "${def.naturalWeapon.name}" weapon item. ${def.naturalWeapon.note}`);
    if(mutations.some(m => m.avReplacesArmour))
      // Quills-type mutations say "you cannot wear other armour" — the
      // rolled starting armour Item is still created below (it's what was
      // rolled, and useful as loot/flavor/a sellable object), but work-queue
      // item 11 (2026-08-25) now actively blocks equipping it (blocksBody
      // Armour), and AV is live-computed from equipped items + mutation
      // avBonus going forward, so there's no stale value to flag here.
      notes.push(`Rolled mutation replaces worn armour — the rolled starting armour item was still created (loot/flavor), but this character's own "cannot wear other armour" text means the sheet will block equipping it.`);

    // Item Attunement Gate — RULED 2026-09-08 (Matt): "starting gear should be
    // attuned". Read strictly, the rule would leave a fresh Planeyfolk unable
    // to use their own starting kit until they had spent an hour on each
    // piece, which is a first session of hourglasses rather than a rule.
    //
    // Stamped on EVERY chargen item rather than only a Planeyfolk's, and that
    // is deliberate: the field is read only for the one ancestry that attunes,
    // so a conditional here would buy nothing and would be wrong the moment a
    // character's ancestry is edited after creation.
    //
    // Note this runs BEFORE the slot total below, and must not change it —
    // attunement deliberately does not touch slot arithmetic, which is what
    // keeps Matt's "otherwise planeyfolk becomes the party's bag of holding"
    // true.
    for(const i of items) i.system = { ...i.system, attuned: true };

    const totalSlots = items.reduce((sum, i) => sum + (i.system.slots ?? 1), 0);
    const slotCap = 20 + mutationSlotBonus;
    if(totalSlots > slotCap)
      notes.push(`Starting gear totals ${totalSlots} item slots, over the hard ${slotCap}-slot maximum — drop or adjust some gear by hand.`);

    if(items.length)
    {
      const itemCls = getDocumentClass("Item");
      // vaarnChargenBake (item 15, 2026-08-26): tells item-effects.js's
      // createItem hook that these Items' ability/HP/slot/hands/
      // naturalWeapon effects are already baked into actorSystem/`abilities`
      // above — without this flag every mutation/implant here would get
      // baked a second time by that hook.
      await itemCls.create(items, { parent: actor, vaarnChargenBake: true });
    }

    // Standing GM Reminder (2026-09-23): the ancestry rules only the Referee
    // acts on become GM-only, open-ended rows on the Active Effect Board. Here
    // and only here - a character made before this was built gets none (no
    // backfill). The Newbeast's rolled Animal Form goes in the row name.
    await writeAncestryReminders(actor, ANCESTRY_GM_REMINDERS[s.ancestry],
      { animalForm: s.spark?.appearance?.["Animal Form"] || null });

    if(s.targetUserId)
    {
      const user = game.users.get(s.targetUserId);
      if(user && !user.isGM)
      {
        await actor.update({ [`ownership.${user.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
        if(!user.character) await user.update({ character: actor.id });
      }
    }
    // A player's first character becomes their default one, which also stops
    // Foundry opening User Configuration on every load (Matt, 2026-09-28).
    else if(!game.user.isGM && !game.user.character)
    {
      await game.user.update({ character: actor.id });
    }

    ui.notifications.info(`Created "${actor.name}" with ${items.length} item(s).${notes.length ? " See chat for notes." : ""}`);
    const chatLines = [`<b>Created ${actor.name}</b> (${s.ancestry}) via the character creator.`];
    if(notes.length) chatLines.push(notes.join("<br>"));
    ChatMessage.create({ content: chatLines.join("<br>") });

    actor.sheet.render(true);
    this.close();
  }
}

/* -------------------------------------------- */
/* Local helpers                                 */
/* -------------------------------------------- */
/* Exported (not just used internally) so standalone GM macros — e.g.
 * macros/generate-weapon.js — can dynamically import them instead of
 * duplicating this logic. See work-queue.txt item 1, Phase 1. */

/**
 * One ancestry rule as a 0-slot "ancestry" Item - the shape the wizard has
 * written since 2026-09-01 (Ancestry Rule as Rollable Item). EXPORTED
 * 2026-09-27 so Resurrection Options can give a reborn mycomorph the same
 * Items the wizard gives a new one, instead of a second copy of this shape.
 */
/**
 * One ability score, the book's way: 3d6, the lowest die is the bonus.
 * EXPORTED 2026-09-27 (with rollStartingHP) so Resurrection Options' Ego-Engine
 * Transplant rerolls STR, DEX and CON exactly as the wizard rolls them, rather
 * than carrying a second copy of the rule.
 */
export function rollAbilityBonus()
{
  const roll = new Roll("3d6");
  roll.evaluate({ async: false });
  const values = roll.dice[0].results.map(r => r.result);
  return { bonus: Math.min(...values), dice: values };
}

/** Starting HP: 1d8, or a Lithling's 10d8 (Inevitable). Evaluated, not posted. */
export function rollStartingHP(ancestry)
{
  const formula = ancestry === "Lithling" ? "10d8" : "1d8";
  const roll = new Roll(formula);
  roll.evaluate({ async: false });
  return { roll, formula, max: roll.total };
}

export function ancestryRuleItemData(ancestry, def, { variant = "", variantEffect = "", variantRoll = 0 } = {})
{
  return {
    name: variant ? `${def.rule}: ${variant}` : def.rule,
    type: "ancestry",
    system:
    {
      slots: 0,
      rule: def.rule,
      ancestry,
      variant,
      roll: variantRoll,
      ...spanFieldFrom(def),
      description: `<p>${def.text}</p>`
        + (variantEffect ? `<p><b>${variant}:</b> ${variantEffect}</p>` : "")
        + (variantRoll ? `<p><b>d20 roll:</b> ${variantRoll}</p>` : ""),
    }
  };
}

export function d(n)
{
  return Math.floor(Math.random() * n) + 1;
}

export function pick(arr)
{
  return arr[Math.floor(Math.random() * arr.length)];
}

/* The base unarmed strike every character is created with. The book states
 * it in the core damage rules rather than in a statblock - "Unarmed attacks
 * or strikes from improvised weapons deal d4 damage" - so it applies to
 * everyone, and improvised weapons are the same sentence and the same die.
 * foundry-system-index.csv "Unarmed Attack", Matt's ruling 2026-09-07.
 *
 * Shape follows the natural weapons it sits beside: 0 slots, born equipped
 * with 0 hands, because a body part is not carried gear and must not sit
 * behind item 11's equip gate.
 *
 * PC ONLY - creatures carry their attacks on their own statblock Items, and
 * this is never added to a Bestiary actor.
 */
export const UNARMED_STRIKE = { name: "Unarmed Strike", damage: "d4", note: "Improvised weapons use this same die." };

/* The contradiction half of Corrupted Blood: "If the effects contradict one
 * another, the more recent mutation takes precedence."
 *
 * Scope is unarmed-attack REPLACEMENTS only (the `replacesUnarmed` entries in
 * mutation-data.js). Add-ons are explicitly out of scope and stack.
 *
 * This is the CHARGEN case, which is the easy one: the whole batch is rolled
 * together, so supersession is resolved before any Item exists and nothing
 * needs deleting. The post-chargen case (Proteus level-up, the Grant Mutation
 * macro) has to find and remove real Items on a live actor - both the
 * mutation and its orphaned natural weapon, since there is no deleteItem hook
 * anywhere in module/ - and is deliberately not built here.
 *
 * The superseded mutation is removed OUTRIGHT and all its effects go with it
 * (Matt, 2026-09-07), including Claws, Crab's blocksTwoHanded. Returning it
 * separately rather than dropping it silently is what lets the wizard and the
 * creation summary say it happened.
 *
 * No re-roll backfills the lost mutation: the book says roll three times, and
 * the contradiction rule then reduces the result. A Cacogen who rolls two of
 * the three ends up with two mutations, by design.
 */
export function resolveUnarmedContradiction(results)
{
  const replacers = results.filter(m => m.replacesUnarmed);
  if(replacers.length < 2) return { kept: results, superseded: [] };
  // Highest `index` is the most recently rolled, and it wins.
  const winner = replacers.reduce((a, b) => (b.index > a.index ? b : a));
  const superseded = replacers.filter(m => m !== winner);
  return { kept: results.filter(m => !superseded.includes(m)), superseded };
}

export function normalizeDamageDice(damage)
{
  if(!damage) return "1d4";
  return /^\d/.test(damage) ? damage : `1${damage}`;
}

// Die-size chain for Shoddy's "one step smaller (minimum d4)" — separate
// from usage-die.js's USAGE_DIE_CHAIN, which steps a DIFFERENT concept
// (ammo depletion) and isn't shared with damage dice.
const DAMAGE_DIE_SIZE_CHAIN = ["d4", "d6", "d8", "d10", "d12", "d20"];

function stepDamageDieSmaller(size)
{
  const idx = DAMAGE_DIE_SIZE_CHAIN.indexOf(size);
  return idx <= 0 ? "d4" : DAMAGE_DIE_SIZE_CHAIN[idx - 1];
}

/**
 * Work-queue item 4.2 (2026-08-27) — weapon tags with a static, always-on
 * damage-dice modifier, baked into the Item at creation time rather than
 * a roll-time note (same "set the right field when the Item is created"
 * pattern chargen already uses everywhere). Shared by every weapon-
 * creation site (weapon-roller.js's rollWeapon, chargen-app.js's
 * starting-equipment weapon and Advanced Weapon boon) so the same 5 tags
 * behave identically regardless of which path rolled them.
 * - Shoddy: die SIZE steps down one notch (d6->d4), independent of dice
 *   COUNT — applied first, before any count change below.
 * - Colossal: "triple base damage" — read as the dice COUNT tripling
 *   (3d6), a creation-time bake for consistency with its own paired
 *   slot-weight clause (unambiguously a static Item field, not a
 *   roll-time thing) rather than a roll-time multiplier like
 *   crit/Berserker doubling uses for a temporary STATE.
 * - Autarch's/Nano-edged: flat +3/+2 additional dice.
 * - Heavy/Strong: "Extra die of damage" in JADE IBIS 15-09-26, where CRIMSON
 *   HOUND printed "Double damage" and "double base damage". One die each,
 *   added to the count, so they stack with each other and with the two below.
 * HEAVY LEFT THIS FUNCTION AND CAME BACK, 2026-09-15 then 2026-09-16, and the
 * round trip is worth recording because the second placement looked right.
 * It was moved into _doDamage to sit with Mauling and Piercing, which grant
 * the same extra die - Matt's "the same idea for heavy/strong, just not
 * conditional". The flaw is that _doDamage runs once per HIT TARGET, so an
 * attack rolled with nothing targeted never reaches it. Mauling and Piercing
 * can live with that, because they cannot know their AV band without a
 * target. An UNCONDITIONAL tag cannot: Matt rolled a Strong weapon with no
 * token targeted and correctly got no extra die. RULED 2026-09-16: "damage
 * rolls on heavy/strong should always get the extra die, even without a
 * target." Here their die is part of damageDice, so it is in the roll, on the
 * card, and in the sheet's printed dice - no targeting involved.
 * Their OTHER clauses are elsewhere and were never part of this: Heavy's
 * double slot weight is in SLOT_MULTIPLIERS, its minimum STR +3 is an
 * equip-time check, and Strong's breakage immunity is in _weaponNat1.
 * Colossal still MULTIPLIES, because JADE still prints "triple base damage"
 * for it, so Heavy and Colossal are no longer a pair - the book's doing.
 * Order when more than one applies (only possible on an Exotic-quality
 * weapon, the one tier that can roll a tag from every table at once):
 * the count MULTIPLIER (Colossal) applies to the base count first, THEN
 * count ADDITIONS (Autarch's/Nano-edged) — a defined, documented
 * convention for a combination this rare, not something Matt was asked
 * to rule on.
 */
export function applyDamageTagModifiers(dice, tags = [])
{
  const match = String(dice).match(/^(\d+)(d\d+)$/);
  if(!match) return dice;
  let count = Number(match[1]);
  let size = match[2];

  if(tags.includes("Shoddy")) size = stepDamageDieSmaller(size);
  if(tags.includes("Colossal")) count *= 3;
  if(tags.includes("Heavy")) count += 1;
  if(tags.includes("Strong")) count += 1;
  if(tags.includes("Autarch's")) count += 3;
  if(tags.includes("Nano-edged")) count += 2;

  return `${count}${size}`;
}


/**
 * Trade-value tag modifiers, same creation-time shape as the two above.
 *
 * ONLY THE UNCONDITIONAL ONES. Bone ("double trade value with Cacklemaw and
 * Ghouls"), Nomad's (Faa Nomads) and Ritual (Mystics) are deliberately absent:
 * their multiplier depends on WHO is buying, which is a fact about the
 * transaction rather than the item, so it cannot be baked at creation. All
 * three are already filed as Effect Text in Item Description and BUILT — the
 * text is surfaced and the GM applies it.
 *
 * NO ROUNDING TO INTEGERS (Matt, 2026-09-05): halving a trade value of 1 gives
 * 0.5, not 0 and not 1. The field takes it — every item sheet renders
 * tradeValue with data-dtype="Number", which is a float in Foundry, and
 * template.json only supplies a default rather than enforcing a type.
 *
 * Rounded to 2 DECIMALS, though, because these multipliers compose: Bejewelled
 * plus Extra-Dimensional is x15, and once anything divides, binary floats
 * produce values like 0.30000000000000004. Two decimals is past any precision
 * the game needs and keeps the stored value equal to the displayed one.
 *
 * Multipliers STACK. A weapon rolls one basic tag so two of those cannot
 * collide, but Extra-Dimensional is an EXOTIC tag and sits alongside a basic
 * one, so Bejewelled + Extra-Dimensional really is x15 — the same
 * "both apply, multiplicatively" rule Matt set for damage properties.
 */
// Moved to module/item/tag-modifiers.js so they can be imported outside a running
// world — this file extends Application and node cannot load it. Re-exported
// here so every existing caller (weapon-roller.js) is unchanged.
export { TRADE_VALUE_MULTIPLIERS, applyTradeValueTagModifiers, SLOT_MULTIPLIERS, applySlotTagModifiers, TIER_TRADE_MULTIPLIERS, applyTierTradeMultiplier, CONDITIONAL_VALUE_TAGS, conditionalValueOf } from "../item/tag-modifiers.js";

// The chargen data tables (and the standalone tool they're ported from)
// express ammo dice as "Ud10"-style strings; the Foundry system's usageDie
// field expects the bare Roll-formula die, "d10". Same normalization as
// macros/dev/import-character-from-json.js's normalizeUsageDie.
export function normalizeUsageDie(ammoDie)
{
  const match = String(ammoDie || "").match(/(4|6|8|10|12|20)/);
  return match ? `d${match[1]}` : "";
}

// Gear entries (GEAR_A/GEAR_B) carry their die baked into the name as text,
// e.g. "Black Clay (Ud8)" — require the "(UdN)" form specifically so an
// unrelated number elsewhere in a name can't false-positive.
export function usageDieFromGearName(name)
{
  const match = String(name || "").match(/\(Ud(4|6|8|10|12|20)\)/i);
  return match ? `d${match[1]}` : "";
}

/**
 * The count a gear entry states, "(×5)" or "(x5)"; 1 when it states none.
 * RULED 2026-09-19 (Matt): a counted gear result is ONE Item carrying the
 * count as its quantity — the same shape a treasure cache gives its counted
 * lines — rather than one Item whose name says "(×5)" while its quantity
 * says 1. Before this the count lived only in the name.
 */
export function quantityFromGearName(name)
{
  const match = String(name || "").match(/\([×x](\d+)\)/i);
  return match ? Number(match[1]) : 1;
}

/**
 * One Starting Gear entry as plain Item data: the usage die and the count
 * parsed out of the name, and both suffixes stripped from it. A baked
 * "(Ud8)" goes stale the moment the die steps (Matt, 2026-08-18) and a baked
 * "(×5)" the moment one is used; the sheet shows the live value of each.
 * Five flashbangs still cost ONE slot, as they always have, but the number
 * saying so changed in 2026-09-19: `slots` became the cost of one unit
 * everywhere, so a counted stack carries 1/N rather than a flat 1. Every
 * gear-building site calls this:
 * creation, loot-builders.js and Import Character from JSON.
 */
export function gearItemData(gearName)
{
  const system = { slots: 1 };
  const die = usageDieFromGearName(gearName);
  if(die) system.usageDie = { die, max: die };
  const quantity = quantityFromGearName(gearName);
  // PER-UNIT SLOT WEIGHT (2026-09-19). `slots` is now the cost of ONE unit
  // everywhere (item-slots.js), so a counted stack has to say what one of
  // them weighs or five flashbangs would start costing five slots.
  //
  // 1/N KEEPS TODAY'S COST EXACTLY (Matt, 2026-09-19, choosing this over a
  // flat per-unit 1 when both were put). It is also the rations rule read
  // literally - three rations to a slot is 0.33 each - rather than a
  // separate convention for gear. Group 209 tested that five flashbangs
  // cost one slot; that stays true, and now it is true by arithmetic
  // rather than by the magnitude of the number.
  if(quantity > 1)
  {
    system.quantity = quantity;
    system.slots = Math.round((1 / quantity) * 10000) / 10000;
    // FIXED-CHARGE CONSUMABLE (Matt, 2026-09-20). The (xN) suffix IS the
    // book saying this item is spent one unit at a time, so the flag comes
    // off the same suffix that sets the count rather than off a second
    // hand-written name list — the gate knave.js's hasItemUse comment
    // already argues for, after Group 218 found a cure with no icon to
    // click it. Hand-made gear opts in with the item sheet's checkbox.
    system.consumable = true;
  }
  const name = String(gearName).replace(/\s*\((?:Ud\d+|[×x]\d+)\)\s*$/i, "");
  // FACE ARMOUR SLOT, RULED 2026-09-27 (Matt). The Oxygen Mask and the
  // Infravision Goggles are worn on the face, so they are armour Items in
  // the face slot with no AV - the shape Starskin and the helms already have,
  // which gives them the equip toggle without a new field on plain gear. The
  // armour type composes the usage die template, so the die carries over.
  if(FACE_GEAR.includes(name))
    return { name, type: "armor", system: { ...system, armorSlot: "face", avBonus: 0 } };
  return { name, type: "item", system };
}
