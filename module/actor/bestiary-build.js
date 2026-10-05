/**
 * Shared Bestiary construction helpers.
 *
 * Extracted 2026-09-01 so macros/dev/import-bestiary.js (first-time population)
 * and macros/dev/sync-bestiary.js (keeping an existing pack current) cannot drift
 * apart. Two copies of "how a creature's biography is assembled" would
 * eventually disagree, and the disagreement would look like pack drift.
 *
 * NOT here: tokenPath and its NO_ART / FILENAME_OVERRIDES tables. Those are
 * art-mapping concerns and they are large. They are NOT unshared, though —
 * that was true only until 2026-09-02, when b5ce698 extracted them into
 * module/actor/bestiary-art.js for pack-build.js. This header used to say
 * "only the importer needs them", and that stale sentence was still being
 * quoted a month later as the reason sync-bestiary.js could not create a
 * missing creature. Callers resolve art themselves and pass an img in; this
 * module stays art-free, which is a different thing from the tables being
 * private. See CLAUDE.md on why tokens/ is not redistributable anyway.
 */

// The wording test that decides whether a reminder toggle appears at all.
// Imported rather than restated — see abilityReminders. Safe in Node: this
// module is loaded by pack-build.js and the tools outside Foundry, and
// round-effects.js touches no Foundry global at import time.
import { PER_ROUND_WORDING } from "../combat/round-effects.js";
import { usableItems } from "./usable-ability.js";
import { conditionByKey } from "./condition-data.js";
import { spanFieldFrom } from "../time/declared-span.js";
import { rolledStatItems } from "./rolled-stat.js";
import { NAMED_WOUNDS } from "./wounds-data.js";
import { BESTIARY } from "./bestiary-data.js";
import { CREATURE_DAMAGE_RULES, CREATURE_TYPE_KEYS, BREATHING_PROPERTIES } from "../item/attack-properties.js";

/** The biography an entry should carry, notes first, then ATK, then bio. */
export function buildBiography(entry)
{
  const lines = [];
  if(entry.note) lines.push(`<p><i>${entry.note}</i></p>`);
  if(entry.levelNote) lines.push(`<p><i>Level: ${entry.levelNote}</i></p>`);
  if(entry.moraleNote) lines.push(`<p><i>Morale: ${entry.moraleNote}</i></p>`);
  lines.push(`<p><b>ATK:</b> ${entry.atk}</p>`);
  lines.push(entry.bio);
  return lines.join("");
}

/**
 * Weapon Items built from a creature's structured `abilities` (2026-09-04).
 *
 * An ability becomes a weapon Item only if it deals HP DAMAGE. That gate is
 * the whole point: "Siphon (d4 STR damage)" and "Repair Protocol (+d6 HP to
 * Synthetic target)" both carry a die, and turning either into a weapon would
 * make the first drain hit points it never touches and the second DAMAGE the
 * ally it is supposed to heal. Ability damage, healing, saves and Special
 * abilities stay out of the item list and live in the biography, which still
 * carries the whole ATK line.
 *
 * Multiple damage effects on one ability combine into a single formula —
 * Cliff Ghul's "Festering Bite (d6 + d6 TOX)" is one bite rolling 1d6+1d6,
 * not two bites.
 *
 * Damage types are NOT written into `tags`. Several of them share a name with
 * a real weapon tag that carries live mechanics (Electrical, Corrosive), and
 * silently arming those on a creature's natural attack would change how it
 * behaves in play. They go in the description instead.
 */
/**
 * The HP-damage effects on an ability, which is the ONE gate deciding whether
 * it becomes a weapon Item.
 *
 * Factored out 2026-09-08 when abilityReminders started asking the opposite
 * question — "did this ability produce no weapon?" — of the same data. Two
 * inline copies of the same filter would have been two gates that agree until
 * one is edited, and the failure would be an ability with BOTH a weapon and a
 * reminder, or with neither. This module's header is about exactly that shape
 * of drift, and the header only anticipated it between files.
 */
function damageEffectsOf(a)
{
  return (a.effects || []).filter(e => e.kind === "damage" && (e.dice || e.flat));
}

/**
 * The ability damage an attack deals ON A HIT - Ability Damage (woundDamage)
 * wiring, RULED 2026-09-22 (Matt). A per-round effect (Occulith's gaze, the
 * Obelisk, the Psyche Leech's syphon) is not an on-hit loss and is left to
 * the per-round tick.
 */
function onHitAbilityDamageOf(a)
{
  return (a.effects || []).filter(e => e.kind === "abilityDamage" && e.ability && (e.dice || e.flat) && !e.perRound);
}

/**
 * THE ONE GATE deciding whether an ability becomes a weapon Item, asked by
 * attacksFromAbilities and, inverted, by abilityReminders - so an ability can
 * never be both, or neither (the drift the note below describes).
 *
 * WIDENED 2026-09-22 (Matt): an attack whose only effect is ability damage -
 * Chromavore's Envelop, a Star Vampire's Latch - is a weapon too, with no HP
 * damage, so it rolls to hit like one and its loss lands on a hit. This
 * REVERSES the 2026-09-09 ruling that a gaze is not a weapon, for Moonbeast
 * (Imago)'s Lunatic Gaze, which deals d4 EGO; Matt ruled the reversal
 * explicitly. A save-only ability is still a reminder.
 */
function becomesWeapon(a)
{
  return damageEffectsOf(a).length > 0 || onHitAbilityDamageOf(a).length > 0
    // PASS 3, 2026-09-22 (Matt's to-hit rule): a per-round loss that does not
    // auto-hit rolls to hit - the Psyche Leech's syphon is a grab with an
    // escape save, and an escape save keeps the roll. An auto-hit one
    // (Occulith's gaze, the Obelisk, the Exemplar) stays a reminder.
    || (tickEffectsOf(a).length > 0 && !a.autoHit)
    // Matt's to-hit rule applied to the rest of the ATK line (2026-09-22): an
    // attack that neither auto-hits nor is decided by a save rolls to hit,
    // whatever its effect. `rollsToHit` DECLARES it - Web Shot, Desiccate,
    // Surgical Array ... - because whether an ability is a strike at all (not
    // an aura, a summons, a heal) is a reading of the book, never derivable.
    || !!a.rollsToHit;
}

/**
 * A PER-ROUND ability loss - Ability Damage pass 3, RULED 2026-09-22 (Matt).
 * Starting it applies the first loss at once and puts an entry on the
 * target's board whose round-card line applies each later round.
 */
function tickEffectsOf(a)
{
  // The AV a target GAINS with each round's loss - the Occulith's "+2 AV per
  // round" (Live AV Computation wiring, 2026-09-25). A POSITIVE per-round
  // avChange on the same ability rides the tick; a negative one is armour
  // damage and belongs to armourLossOf.
  const avPerTick = (a.effects || []).filter(e => e.kind === "avChange" && e.perRound && Number(e.amount) > 0)
    .reduce((n, e) => n + Number(e.amount), 0);
  return (a.effects || []).filter(e => e.kind === "abilityDamage" && e.ability && (e.dice || e.flat) && e.perRound)
    .map(e => avPerTick ? { ...e, avPerTick } : e);
}

/**
 * An ESCALATING per-round HP loss - the Seeker's Brain Burster, 2026-09-22.
 * A flat starting figure that multiplies every round, rather than a die, so
 * it carries `start` and `factor` and never a formula. See
 * apply-to-target.js's startEscalatingTick for why the figure is state.
 */
function escalatingEffectsOf(a)
{
  return (a.effects || []).filter(e => e.kind === "escalatingDamage" && e.start);
}

/**
 * Direct HP Adjustment wiring, RULED 2026-09-23 (Matt). Three shapes of HP
 * change an ability declares, each read by its own control:
 *
 * - a HEAL WITH DICE lands on the targeted tokens - Turretwright's Repair
 *   Protocol (Synthetic only), Negativfolk's Knife, the Hegemony Ordinator's
 *   Biotic Grenade. Carried as `targetHeal`, the Biotic Field's shape, so the
 *   npc sheet's existing heal control serves it. The grenade's damage half is
 *   still its weapon roll: Matt ruled two buttons, the GM targeting each group,
 *   since nothing models a creature's ancestry.
 * - a HEAL WITH NO DICE on an attack is a drain - Moonbeast (Nymph)'s
 *   Vampiric Tendrils heal "HP equal to damage". The attacker heals by what
 *   the target lost, after immunities.
 * - a MAX-HP LOSS - the Entropy Wight's touch - is cut by a GM control on
 *   the targeted tokens, permanently: the book says it is never regained.
 */
function targetHealEffectsOf(a)
{
  return (a.effects || []).filter(e => e.kind === "heal" && e.dice);
}

function drainEffectsOf(a)
{
  return (a.effects || []).filter(e => e.kind === "heal" && !e.dice);
}

/**
 * A LEVEL GAIN ON A HIT - the Hagfluke's Siphon, RULED 2026-09-27 (Matt):
 * "With each successful attack on a biological target, the Hagfluke gains 1
 * Level (Max 7)". The Kronophage's gain (level-drain.js applyDrainerGain):
 * +1 Level, +4 max and current HP, abilities follow the Level.
 */
function levelGainOf(a)
{
  const e = (a.effects || []).find(x => x.kind === "levelGain");
  if(!e) return null;
  if(!(Number(e.max) > 0)) throw new Error(`${a.name}: a levelGain needs a max Level`);
  return { max: Number(e.max), hp: 4, ...(e.targets?.length ? { targets: checkedTypes(e.targets, `${a.name} levelGain`) } : {}) };
}

function maxHPLossEffectsOf(a)
{
  return (a.effects || []).filter(e => e.kind === "maxHP" && e.dice);
}

// Temporary HP (2026-09-26, RULED by Matt): the Zenithlight Negatick's
// Infusion pumps temporary HP into whoever it grabs, and kills at more than
// `burstAt` times their max. A GM control on the targeted tokens, like the
// heal and the max-HP cut above.
function tempHpEffectsOf(a)
{
  return (a.effects || []).filter(e => e.kind === "tempHp" && e.dice);
}

/**
 * The save effects on an ability — Compel-a-Target Save, 2026-09-09.
 *
 * The mirror of damageEffectsOf, factored out for the same reason that one
 * was: the weapon path and the reminder path both ask this question now, and
 * two inline copies would be two gates that agree until one is edited.
 */
function saveEffectsOf(a)
{
  return (a.effects || []).filter(e => e.kind === "save" && e.ability);
}

/**
 * ONE wording for a compelled save, used by the note on the Item and by the
 * chat card the control posts. Written once because this module's header is
 * about exactly this drift: the note and the card are the same sentence in
 * two places, and reworded in one of them they would disagree where nobody
 * reads both. `mode` is the book's own split — a resist save has something
 * to resist (`vs`), an escape save something to break out of (`escapeBy`).
 */
export function saveSentence(e)
{
  const what = e.mode === "escape" ? "to " + (e.escapeBy || "escape") : "vs " + (e.vs || "the effect");
  // Opposed Saves (Saving Throws.md), RULED 2026-09-22 (Matt): the target
  // beats 10 + the poster's score in the SAME ability, not 15. The card
  // works the number out; the sentence only says which kind of save it is.
  return `${e.ability.toUpperCase()} save ${what}${e.opposed ? " (opposed)" : ""}`;
}

/**
 * The declared payload the sheet control reads. A DECLARATION, never text:
 * the control appears because this flag is present, the rule ruleItems and
 * the activity control already follow. An array because an ability may
 * compel more than one save; `kind` is dropped, since everything in here is
 * a save by construction.
 *
 * IT MUST BE IN sync-bestiary.js's item key or it will silently never reach
 * the pack. That macro records three separate occasions when a field was
 * added here and not there.
 */
/**
 * An ONGOING HOLD, normalised - Per-Round Effect Reminder wiring, RULED
 * 2026-09-25 (Matt). Once the attack lands (or its first save fails) the
 * victim is held: {dice} HP or {loss} ability each round, and an escape save
 * the victim may try on their turn. apply-to-target.js's startHold reads it.
 */
/** What a hold does each round, in words: its damage, its ability loss, or its effect (Mind Control). */
export function holdWhat(h)
{
  return h?.dice ? `${h.dice} damage each round` : h?.loss ? `${h.loss.dice} ${String(h.loss.ability).toUpperCase()} each round` : (h?.effect ?? "held");
}

export function holdSpec(h, where)
{
  if(!h) return null;
  if(!h.escape?.ability) throw new Error(where + ": a hold needs an escape save");
  return {
    ...(h.dice ? { dice: String(h.dice) } : {}),
    ...(h.loss ? { loss: { ability: checkedAbility(h.loss.ability, h.loss), dice: String(h.loss.dice) } } : {}),
    ...(h.drain ? { drain: true } : {}),
    // A hold that does no damage, only an EFFECT until the escape save - a
    // Daemon's Mind Control, "no expiration, the target saves each round"
    // (Generated Gear and Attacks as Items, RULED 2026-10-04 by Matt).
    ...(h.effect ? { effect: String(h.effect) } : {}),
    // Breathing and Suffocation (2026-09-27): what the hold's per-round damage
    // is - the Snare's drowning, Stolen Breath's and the Swallow's suffocation.
    ...(h.damageTypes?.length ? { damageTypes: [...h.damageTypes] } : {}),
    escape: { ability: checkedAbility(h.escape.ability, h.escape), by: h.escape.by ?? "break free",
      ...(h.escape.opposed ? { opposed: true } : {}), ...(h.escape.assumed ? { assumed: true } : {}) }
  };
}

function saveFlag(saves)
{
  return saves.map(e => ({ ability: e.ability, mode: e.mode ?? "resist",
                           ...(e.vs ? { vs: e.vs } : {}),
                           ...(e.escapeBy ? { escapeBy: e.escapeBy } : {}),
                           ...(e.opposed ? { opposed: true } : {}),
                           // Travel and Rations, RULED 2026-09-23 (Matt): a FAILED save eats a
                           // ration - the Faminebearer's Famishing Claws. compelled-save.js spends it.
                           // Failed-Save Consequence, RULED 2026-09-25 (Matt): a failed save
                           // DEALS HP DAMAGE - "DEX Save vs 2d6". compelled-save.js rolls and deals it.
                           // Wound-Table Resolution wiring, RULED 2026-09-25 (Matt): a failed save
                           // GIVES A NAMED WOUND - the Grimpet's Latch. A key NAMED_WOUNDS lacks throws.
                           // A RANDOM MUTATION a failed save gives - Generate Monster's Cause
                           // Mutation (Generated Gear and Attacks as Items, RULED 2026-10-04 by
                           // Matt: added at once, as Resurrection adds one). compelled-save.js rolls it.
                           ...((e.onFail?.eatsRation || e.onFail?.damage || e.onFail?.hold || e.onFail?.wound || e.onFail?.graft || e.onFail?.mutation) ? { onFail: {
                             ...(e.onFail.mutation ? { mutation: true } : {}),
                             ...(e.onFail.wound ? { wound: checkedNamedWound(e.onFail.wound, `save vs ${e.vs}`) } : {}),
                             // A LIMB GRAFTED ON - the Fleshwarp's Graft, RULED 2026-09-26 (Matt).
                             // The creature named must carry a graftedToHost rule, or the build throws.
                             ...(e.onFail.graft ? { graft: checkedGraftLimb(e.onFail.graft, `save vs ${e.vs}`) } : {}),
                             ...(e.onFail.hold ? { hold: holdSpec(e.onFail.hold, `save vs ${e.vs}`) } : {}),
                             ...(e.onFail.eatsRation ? { eatsRation: e.onFail.eatsRation } : {}),
                             ...(e.onFail.otherwise ? { otherwise: e.onFail.otherwise } : {}),
                             ...(e.onFail.damage ? { damage: { dice: e.onFail.damage.dice,
                               ...(e.onFail.damage.type ? { type: e.onFail.damage.type } : {}) } } : {}) } } : {}),
                           ...(e.targets ? { targets: checkedTypes(e.targets, `save vs ${e.vs ?? e.escapeBy}`) } : {}) }));
}

/**
 * A declared list of creature types, checked against the one vocabulary.
 * Creature-Type Checkboxes wiring, 2026-09-22: a save's `targets` (only these
 * types are affected) and a rule's `advantageVs` (ADV against these types).
 * AN UNKNOWN TYPE THROWS AT BUILD, for the reason a misspelt condition does:
 * "minerals" would build a clean creature whose gate never matches anyone.
 */
/** A NAMED_WOUNDS key, checked like a creature type: a typo throws at build. */
/** A grafted limb's creature name, checked: a typo, or a creature that is not a
 *  limb, throws at build rather than spawning nothing at the table. */
function checkedGraftLimb(name, where)
{
  const limb = BESTIARY.find(c => c.name === name);
  if(!limb || !(limb.rules || []).some(r => r.graftedToHost))
    throw new Error(`${where}: "${name}" is not a Bestiary creature with a graftedToHost rule`);
  return name;
}

function checkedNamedWound(key, where)
{
  if(!NAMED_WOUNDS[key]) throw new Error(`${where}: "${key}" is not a key of NAMED_WOUNDS (wounds-data.js)`);
  return key;
}

/**
 * A Hit-Count Progression declaration, checked at build (2026-09-27): a stage
 * that is none of the three shapes would apply nothing on its hit and look
 * exactly like a stage that worked.
 */
function checkedHitProgression(e)
{
  const where = `hitProgression "${e.key}"`;
  if(!e.key) throw new Error("hitProgression: no key - the count on the target is stored under it");
  if(!Array.isArray(e.stages) || !e.stages.length) throw new Error(`${where}: no stages`);
  const stages = e.stages.map((s, i) => {
    if(s.deprived) return { deprived: true, ...(s.text ? { text: s.text } : {}) };
    if(s.abilityDamage) return { abilityDamage: { ability: checkedAbility(s.abilityDamage.ability, where), dice: String(s.abilityDamage.dice) },
                                 ...(s.text ? { text: s.text } : {}) };
    if(s.lethal) return { lethal: true };
    throw new Error(`${where}: stage ${i + 1} is not deprived, abilityDamage or lethal`);
  });
  return { key: String(e.key), label: String(e.label ?? e.key),
           ...(e.targets?.length ? { targets: checkedTypes(e.targets, where) } : {}), stages };
}

/** An ability key, checked like a creature type: a typo throws at build. */
function checkedAbility(key, where)
{
  if(!["str", "dex", "con", "int", "psy", "ego"].includes(key))
    throw new Error(`${JSON.stringify(where)}: "${key}" is not an ability`);
  return key;
}

function checkedTypes(types, where)
{
  for(const t of types)
    if(!CREATURE_TYPE_KEYS.includes(t))
      throw new Error(`${where}: "${t}" is not a creature type (${CREATURE_TYPE_KEYS.join(", ")})`);
  return [...types];
}

/**
 * The Combat Conditions an ability inflicts — Update Built Content for Blind
 * and Entangled, 2026-09-16. Two shapes declare one: a save effect carrying
 * `condition` (Blinding Pelt: DEX save, and blind on a failure) and an effect
 * of kind `condition` with no save at all (Grimweaver's Web Shot, which JADE
 * prints as just "Web Shot (Entangled)"). `duration` is the book's printed
 * span where it prints one - {amount, unit} - and absent where it does not,
 * which is most Entangled sources; nothing here invents one.
 *
 * AN UNKNOWN KEY THROWS AT BUILD. A misspelt condition would otherwise build
 * a clean Item whose card applies nothing, and nothing downstream would say
 * so - condition-data.js is the one vocabulary, and this is where a roster
 * typo is cheapest to catch.
 */
export function conditionAppliesOf(a, rules = [])
{
  const out = [];
  for(const e of (a.effects || []))
  {
    // A NAMED RULE OF THE CREATURE'S OWN, 2026-09-21 (Jade Ibis Vault
    // Reconciliation; Matt: Tarantism is a round-duration effect). JADE prints
    // the Tarantella's Fangs as "CON Save vs d4 rounds of Tarantism", and
    // Tarantism is not a Combat Condition - it is that creature's rule. So an
    // effect may declare `inflicts`, the NAME of a rule on the same entry,
    // and the card carries that rule's own text. The name is resolved here,
    // and a name matching no rule throws, for the reason a misspelt condition
    // does.
    if((e.kind === "save" || e.kind === "condition") && e.inflicts)
    {
      const rule = rules.find(r => r.name === e.inflicts);
      if(!rule)
        throw new Error(`${a.name}: effect inflicts "${e.inflicts}", which is not a rule on this creature`);
      // `applied`, when the effect declares one, is what the board entry
      // CONTRIBUTES - the Skunkey's Stench Spray gives DIS on every Save and
      // to-hit roll (RULED 2026-09-25, Matt). Codex Flatten's shape.
      out.push({ effect: rule.name, text: rule.text,
                 amount: e.duration?.amount ?? null,
                 unit: e.duration?.unit ?? "round",
                 viaSave: e.kind === "save",
                 ...(e.applied ? { applied: e.applied } : {}),
                 // Ends when the creature that applied it dies - the Gravity
                 // Tyrant's Weight of Worlds (RULED 2026-09-25, Matt).
                 ...(e.endsWithSource ? { endsWithSource: true } : {}),
                 // The VICTIM's per-round HP tick and the end they choose - the
                 // Ghoul's Agony (RULED 2026-09-27, Matt): d6 per combat action
                 // from the round card, and "lying still neutralises the venom".
                 // On the effect, never the rule: a rule's hpTick is the
                 // creature's OWN per-round Item.
                 ...(e.hpTick ? { hpTick: hpTickFlag(e.hpTick, `${a.name} inflicts ${e.inflicts}`) } : {}),
                 ...(e.endsBy ? { endsBy: String(e.endsBy) } : {}) });
      continue;
    }
    const declared = (e.kind === "save" || e.kind === "condition") ? e.condition : null;
    if(!declared) continue;
    if(!conditionByKey(declared))
      throw new Error(`${a.name}: effect names condition "${declared}", which condition-data.js does not define`);
    out.push({ condition: declared,
               amount: e.duration?.amount ?? null,
               unit: e.duration?.unit ?? "round",
               viaSave: e.kind === "save" });
  }
  return out;
}

/**
 * The flag block an Item carries. `save` is the compel control's payload,
 * `applies` is what the Apply Effect to Target card is built from. Both
 * generated, both compared by sync-bestiary.js's item key - see its comment
 * block for why a field added here and not there silently never syncs.
 */
function itemFlags({ saves = [], applies = [], abilityDamage = [], abilityTick = [], escalating = [],
                     heals = [], drains = [], maxHPLoss = [], tempHp = [], takesRation = [], sporeDepletion = false,
                     armourLoss = 0, avAsIf = 0, toHit = {}, holdOnHit = null, woundOnHit = null, woundOnDamage = null,
                     surgicalArray = false, typedDice = [], hitProgression = null, levelGain = null, woundRoll = null, destroyItemRoll = null } = {})
{
  // To-Hit Resolution Override wiring, RULED 2026-09-25 (Matt): a declared
  // auto-hit rolls nothing; an advantage effect naming creature types is the
  // weapon's own advantageVs; the effect's note is a to-hit reminder.
  const vaarn = { ...toHit };
  if(holdOnHit) vaarn.holdOnHit = holdOnHit;
  // Breathing and Suffocation (2026-09-27): a die typed apart from the weapon.
  if(typedDice.length) vaarn.typedDice = typedDice;
  // Wound-Table Resolution wiring, RULED 2026-09-25 (Matt). `woundOnHit` is
  // the Scythesliver's "rolls a 20 or higher while attacking, it inflicts a
  // Wound: Severed Limb" - the attack TOTAL, per target hit. `surgicalArray`
  // is the Sawbone Drone's d6 of outcomes, resolved per target hit
  // (combat/surgical-array.js).
  // No atTotal (Encumbrance Penalty wiring, 2026-09-25): every hit - the
  // Flabmonger's Lipoinduction.
  if(woundOnHit) vaarn.woundOnHit = { atTotal: woundOnHit.atTotal == null ? null : Number(woundOnHit.atTotal),
    wound: checkedNamedWound(woundOnHit.wound, "woundOnHit") };
  // A ROLL ON THE WOUNDS TABLE for each character hit - Generate Monster's Cause
  // Wound, "roll 2d8 on Wounds table" (RULED 2026-10-04 by Matt: characters only,
  // the 2d8 the negative-HP row that picks the wound, as the Surgical Array's 2d6).
  if(woundRoll) vaarn.woundRoll = String(woundRoll);
  // A d20 that NAMES the item in that slot for the Referee - Destroy Item
  // (RULED 2026-10-04: adjudicated only, nothing is deleted).
  if(destroyItemRoll) vaarn.destroyItemRoll = String(destroyItemRoll);
  // A named wound on each hit that DEALS DAMAGE - the Deathblight Husk's
  // Accursed Knife (RULED 2026-09-25, Matt: "tie this to the damage").
  if(woundOnDamage) vaarn.woundOnDamage = checkedNamedWound(woundOnDamage, "woundOnDamage");
  if(surgicalArray) vaarn.surgicalArray = true;
  // Hit-Count Progression, RULED 2026-09-27 (Matt): a stage per hit on the
  // same target - the Desiccator's Desiccate (combat/hit-progression.js).
  if(hitProgression) vaarn.hitProgression = checkedHitProgression(hitProgression);
  // Live AV Computation wiring, 2026-09-25 (Matt). `armourLoss` is the AV a
  // hit takes off the target's armour - the Drill Drone's Drill, the
  // Witchgrub's Corrosive Spit - written to armor.damage by the same damage
  // click Ultra-Corrosive's tag rides. `avAsIf` is the Titan Acolyte's
  // Vibro-Dagger: the hit test reads the target's AV plus this (negative)
  // figure, and the target's sheet is untouched.
  if(armourLoss) vaarn.armourLoss = armourLoss;
  if(avAsIf) vaarn.avAsIf = avAsIf;
  // Spore depletion, RULED 2026-09-24 (Matt): the Mycomastiff's Spores. Each
  // attack is followed by the creature's own CON Save; a failure sets
  // sporeLockout, which blocks the attack until its owner's Long Rest.
  if(sporeDepletion) vaarn.sporeDepletion = true;
  // Travel and Rations, RULED 2026-09-23 (Matt): the ration a hit takes from
  // each target's pack - the Desiccator's water. Applied by the damage click
  // (actor-sheet.js), plain ration first. The Faminebearer's food is NOT this:
  // Matt corrected it the same day to a FAILED save (saveFlag's onFail).
  if(takesRation.length) vaarn.takesRation = takesRation[0].ration;
  // Direct HP Adjustment, 2026-09-23 - see targetHealEffectsOf. One heal per
  // ability in the roster today; the first is the one the control rolls.
  if(heals.length) vaarn.targetHeal = { dice: heals[0].dice,
    ...(heals[0].target ? { targets: checkedTypes([String(heals[0].target).toLowerCase()], "heal target") } : {}) };
  // A drain limited to some creature types - the Hagfluke's Siphon heals only
  // off a Biological target (RULED 2026-09-27, Matt). An unlimited drain stays
  // `true`, the Moonbeast's shape.
  if(drains.length) vaarn.drain = drains[0].targets?.length ? { targets: checkedTypes(drains[0].targets, "drain") } : true;
  if(levelGain) vaarn.levelGain = levelGain;
  if(maxHPLoss.length) vaarn.maxHPLoss = { dice: maxHPLoss[0].dice, permanent: !!maxHPLoss[0].permanent };
  if(tempHp.length) vaarn.tempHp = { dice: tempHp[0].dice, burstAt: Number(tempHp[0].burstAt) || null };
  if(saves.length)   vaarn.save    = saveFlag(saves);
  // What the damage click applies to each target hit (2026-09-22). Compared by
  // sync-bestiary.js's item key like `save` and `applies`.
  const lossSpec = e => ({
    ability: checkedAbility(e.ability, e),
    ...(e.dice ? { dice: e.dice } : { flat: Number(e.flat) }),
    ...(e.targets ? { targets: checkedTypes(e.targets, `${e.ability} damage`) } : {}) });
  if(abilityDamage.length) vaarn.abilityDamage = abilityDamage.map(lossSpec);
  // The per-round loss a hit or a use STARTS (pass 3, same day).
  // `fade` names the recurrence that carries a loss which FADES rather than
  // heals - the Occulith's lithification, one point a day (2026-09-25) - and
  // `avPerTick` is the AV that rides the same entry.
  if(abilityTick.length) vaarn.abilityTick = abilityTick.map(e => ({ ...lossSpec(e),
    ...(e.fade ? { fade: e.fade } : {}), ...(e.avPerTick ? { avPerTick: e.avPerTick } : {}) }));
  // The escalating per-round HP loss a use STARTS - Brain Burster, 2026-09-22.
  // Its own shape, not lossSpec's: no ability and no die, a flat start and the
  // factor it multiplies by.
  if(escalating.length) vaarn.escalating = escalating.map(e =>
    ({ start: Number(e.start), factor: Number(e.factor) || 2 }));
  if(applies.length) vaarn.applies = applies.map(x => ({
    ...(x.effect ? { effect: x.effect, text: x.text } : { condition: x.condition }),
    amount: x.amount, unit: x.unit, viaSave: x.viaSave,
    ...(x.applied ? { applied: x.applied } : {}),
    // Weight of Worlds (2026-09-25): ends when the creature that applied it dies.
    ...(x.endsWithSource ? { endsWithSource: true } : {}),
    // The Ghoul's Agony (2026-09-27): the victim's per-action tick and the end
    // they choose. A WHITELIST - a field conditionAppliesOf carries and this
    // map does not name never reaches the card.
    ...(x.hpTick ? { hpTick: x.hpTick } : {}),
    ...(x.endsBy ? { endsBy: x.endsBy } : {}) }));
  return Object.keys(vaarn).length ? { flags: { vaarn } } : {};
}

/**
 * The armour a HIT takes off its target - a NEGATIVE avChange on a weapon
 * (Drill Drone, Witchgrub). A positive one is the Occulith's gaze raising its
 * target's AV, which rides no weapon and is not armour damage, so it is left
 * alone here. Returned as the positive number of points lost.
 */
function armourLossOf(a)
{
  // ROLLED armour loss (Generated Gear and Attacks as Items, RULED 2026-10-04 by
  // Matt): Generate Monster's Acid Spray takes "d3 AV". An avChange declaring
  // `lossDice` is carried as that dice string, and the sheet rolls it per hit.
  const dice = (a.effects || []).find(e => e.kind === "avChange" && e.lossDice)?.lossDice;
  if(dice) return String(dice);
  return (a.effects || []).filter(e => e.kind === "avChange" && Number(e.amount) < 0)
    .reduce((n, e) => n - Number(e.amount), 0);
}

/** The Titan Acolyte's "hits as if target has -5 AV" - the declared amount, or 0. */
function avAsIfOf(a)
{
  return (a.effects || []).filter(e => e.kind === "avAsIf")
    .reduce((n, e) => n + Number(e.amount), 0);
}

/** The to-hit declarations a weapon carries - see attacksFromAbilities. */
function weaponToHitFlags(a)
{
  const adv = (a.effects || []).filter(e => e.kind === "advantage" && e.types?.length);
  const note = (a.effects || []).find(e => e.kind === "advantage" && e.note)?.note;
  const vaarn = {
    ...(a.autoHit ? { autoHit: true } : {}),
    ...(adv.length ? { advantageVs: adv.map(e => ({ rule: a.name, types: checkedTypes(e.types, a.name),
                                                    ...(e.metalArmour ? { metalArmour: true } : {}) })) } : {}),
    ...(note ? { toHitNote: note } : {})
  };
  return vaarn;
}

function attacksFromAbilities(abilities, rules = [])
{
  const items = [];
  for(const a of abilities)
  {
    const dmg = damageEffectsOf(a);
    const saves = saveEffectsOf(a);
    const applies = conditionAppliesOf(a, rules);
    if(!becomesWeapon(a)) continue;
    const abilityDamage = onHitAbilityDamageOf(a);
    const abilityTick = tickEffectsOf(a);

    // Empty for an attack that deals only ability damage: the damage click
    // then applies the loss and rolls no HP die.
    // A die the SAVE deals (Failed-Save Consequence, 2026-09-25) leaves the
    // weapon's own roll, or a failed save and a damage click would both land it.
    const saveDealt = saves.some(s => s.onFail?.damage);
    const rolledAll = saveDealt ? dmg.filter(e => !e.onFailedSave) : dmg;
    // A BREATHING DIE BESIDE AN ORDINARY ONE rides apart (Breathing and
    // Suffocation, RULED 2026-09-27 by Matt: the Snare's second d6 is the
    // drowning, so a target immune to drowning takes only the first). It
    // becomes a typed add-on the damage roll folds in - the component split a
    // Bioelectricity die already gets - rather than typing the whole weapon.
    const breathing = rolledAll.filter(e => BREATHING_PROPERTIES.includes(e.damageType));
    const apart = breathing.length < rolledAll.length ? breathing : [];
    const rolled = rolledAll.filter(e => !apart.includes(e));
    const typedDice = apart.map(e => ({ dice: String(e.dice), damageTypes: [e.damageType],
      source: e.damageType.charAt(0).toUpperCase() + e.damageType.slice(1) }));
    const formula = rolled.map(e => e.dice || String(e.flat)).join("+");
    const notes = [];
    // Effect-level types AND ability-level ones. Reading only the effects lost
    // Chromepriest's Prism Grenade "blast" — its die is tagged beam and blast
    // sits on the ability, because the extractor pairs a type to its own die
    // and keeps any that never paired.
    const types = [...new Set([
      ...dmg.filter(e => !apart.includes(e)).map(e => e.damageType).filter(Boolean),
      ...(a.damageTypes || []),
    ])];
    if(types.length) notes.push(`<b>Damage type:</b> ${types.join(", ")}`);
    for(const t of typedDice) notes.push(`<b>Plus ${t.dice} ${t.damageTypes.join(", ")}</b>, rolled with the damage and typed apart.`);
    // "Number of attacks", NOT "Attacks per round" (2026-09-08). The old
    // label was accurate and had no reader, but it contained the literal
    // phrase "per round" — and once canRoundRemind started matching item text
    // on 2026-09-08, every multi-attack weapon grew a per-round reminder
    // toggle. 23 of the 31 weapon toggles came from this one string. A Claw
    // that swings twice does not RECUR; it is an ordinary attack, and a
    // reminder card restating "2 x Claw (d6)" every round is noise.
    //
    // Relabelled rather than making the wording test cleverer, because the
    // test reads free prose and cannot be taught which "per round" is a
    // heading. This is the only phrase the build generates that collides, so
    // fixing it at the source leaves the test simple and leaves the remaining
    // 8 toggles all genuine. Keep new note labels clear of round wording for
    // the same reason.
    if(a.count) notes.push(`<b>Number of attacks:</b> ${a.count}`);
    // Damage Read from an Actor Value (2026-09-21, RULED by Matt): the sheet
    // shows the BOOK'S WORDS, since the number is only known when rolled -
    // damageDice holds the roll-data formula ("(@lvl)d4") and the card shows
    // the values read.
    if(a.damageLabel) notes.push(`<b>Damage:</b> ${a.damageLabel}, read when rolled.`);
    if(a.autoHit) notes.push("<b>Automatically hits.</b>");
    // A hit-count declaration IS the on-hit effect (Hit-Count Progression,
    // 2026-09-27): it says "no damage roll" without sending the Referee to
    // the biography, since the note below spells out what each hit does.
    const countsHits = (a.effects || []).some(e => e.kind === "hitProgression");
    if(a.rollsToHit && !dmg.length && !abilityDamage.length && !abilityTick.length)
      notes.push(countsHits ? "<b>No damage roll.</b>" : "<b>No damage roll.</b> On a hit, resolve its effect from the creature's biography.");
    if(a.ongoing) notes.push("<b>Ongoing:</b> repeats each round.");
    if(a.frequency) notes.push(`<b>Frequency:</b> ${a.frequency}`);
    if(dmg.some(e => e.onFailedSave)) notes.push(saveDealt
      ? "<b>Its damage is dealt by the save card</b> to each target that fails."
      : "<b>Only on a failed save.</b>");
    for(const e of (a.effects || []))
    {
      if(e.kind === "save") notes.push(`<b>${saveSentence(e)}</b>.`);
      if(e.kind === "abilityDamage" && !e.perRound)
        notes.push(`<b>${(e.dice || e.flat)} ${e.ability.toUpperCase()} damage</b> to a target it hits, applied with the damage roll.`);
      if(e.kind === "abilityDamage" && e.perRound)
        notes.push(`<b>${(e.dice || e.flat)} ${e.ability.toUpperCase()} damage each round</b> to a target it hits - the first with the damage roll, then from the round card until it is removed from the target's board.`);
      if(e.kind === "rider") notes.push(`<b>Also:</b> ${e.name}`);
      // A condition effect may name a defined condition or INFLICT a rule (a Daemon's Parasite Seed, 2026-10-04).
      if(e.kind === "condition") notes.push(`<b>Inflicts:</b> ${conditionByKey(e.condition)?.label ?? e.inflicts}.`);
    }
    const armourLoss = armourLossOf(a), avAsIf = avAsIfOf(a);
    const holdNote = h => h ? `<b>Holds the target:</b> ${holdWhat(h)}, from the round card; ${h.escape.ability.toUpperCase()} save to ${h.escape.by} on their turn.` : null;
    if(a.hold) notes.push(holdNote(holdSpec(a.hold, a.name)));
    for(const e of (a.effects || []).filter(e => e.kind === "save" && e.onFail?.hold)) notes.push("On a failed save - " + holdNote(holdSpec(e.onFail.hold, a.name)));
    if(armourLoss) notes.push(`<b>-${armourLoss} AV</b> to the armour of a target it hits, applied with the damage roll.`);
    if(avAsIf) notes.push(`<b>Hits as if the target's AV were ${-avAsIf} lower.</b>`);
    if(a.woundOnHit) notes.push(a.woundOnHit.atTotal != null
      ? `<b>An attack total of ${a.woundOnHit.atTotal} or more</b> gives each target hit <b>Wound: ${NAMED_WOUNDS[a.woundOnHit.wound]?.name ?? a.woundOnHit.wound}</b>.`
      : `<b>Each target hit</b> gains <b>Wound: ${NAMED_WOUNDS[a.woundOnHit.wound]?.name ?? a.woundOnHit.wound}</b>.`);
    if(a.woundOnDamage) notes.push(`<b>Each target it damages</b> gains <b>Wound: ${NAMED_WOUNDS[a.woundOnDamage]?.name ?? a.woundOnDamage}</b>.`);
    const hitProg = (a.effects || []).find(e => e.kind === "hitProgression");
    if(hitProg) notes.push(`<b>Counts its hits on each target</b>${hitProg.targets?.length ? ` (${hitProg.targets.join(", ")} only)` : ""}: `
      + hitProg.stages.map((s, i) => `hit ${i + 1}, ${s.deprived ? "Deprived" : s.abilityDamage ? `${s.abilityDamage.dice} ${s.abilityDamage.ability.toUpperCase()} damage` : "lethal"}`).join("; ")
      + ". The count shows on the target's board until the Referee removes it.");
    if(a.surgicalArray) notes.push("<b>On a hit</b> the Surgical Array resolves itself: d8 damage to a non-biological target, the d6 of outcomes to a biological one.");
    for(const t of a.weaponTags ?? []) notes.push(`<b>${t}</b> weapon tag.`);
    for(const e of targetHealEffectsOf(a))
      notes.push(`<b>Heals ${e.dice} HP</b> to each targeted token${e.target ? ` (${e.target} only)` : ""} - the Referee's heal control, separate from the damage roll.`);
    const drainDecl = drainEffectsOf(a)[0];
    if(drainDecl)
      notes.push(`<b>Heals the attacker</b> by the HP each ${drainDecl.targets?.length ? drainDecl.targets.join(" or ") + " " : ""}target loses to it.`);
    const gainDecl = levelGainOf(a);
    if(gainDecl)
      notes.push(`<b>Gains 1 Level</b> (max ${gainDecl.max}) with each attack that hits a ${gainDecl.targets?.join(" or ") ?? ""} target: +4 max and current HP, abilities follow the Level. Applied with the damage roll, before the heal.`);
    for(const e of maxHPLossEffectsOf(a))
      notes.push(`<b>${e.dice} maximum HP lost${e.permanent ? " for good" : ""}</b> by a target it strikes - the Referee's control on the targeted tokens.`);
    notes.push(`<i>${a.text}</i>`);

    // A WEAPON TAG the ability declares - the Scythesliver's Blades "hit as
    // though their target had AV 10", which is Vibroactive (Matt, 2026-09-25).
    // Never a damage-type word: see the damageTypes note below.
    const system = { damageDice: formula, slots: 0, tags: [...(a.weaponTags ?? [])], equipped: true,
                     description: notes.map(n => `<p>${n}</p>`).join("") };

    // Carry the damage types onto the ITEM, not just into the description
    // (2026-09-05). Without this the type was readable on the ability and
    // invisible on the weapon the creature actually attacks with, so a
    // Chromepriest's Arc-Thrower could not double against a Synthetic PC —
    // the mechanism worked in one direction only. Found by test 78.8.
    //
    // A dedicated `damageTypes` field rather than stuffing the names into
    // `tags`: several damage-type words are also live weapon tags, and
    // writing "Electrical" into a creature's tags would arm the whole weapon
    // tag rather than state the attack's type. Verified to survive document
    // creation on both owned and world Items despite not being in
    // template.json.
    if(types.length) system.damageTypes = types;

    // BODY PART OR CARRIED GEAR — Bestiary Weapon Intrinsic Audit, 2026-09-20.
    // Every attack that becomes a weapon Item DECLARES `carried` on its
    // ability: true for a thing the creature holds and a player may loot (a
    // Legionary's Rifle), false for part of the creature (a Claw, a Fire
    // Breath). A body part is built intrinsic, which is what Item Transfer and
    // the dropped-items container refuse to move.
    //
    // UNDECLARED IS NOT INTRINSIC, deliberately. Wrongly intrinsic locks a real
    // weapon away from the players who earned it; wrongly takeable lets them
    // carry off a Claw, which is silly and harmless. tools/test-bestiary-
    // carried.mjs is what refuses an undeclared attack, so the data cannot go
    // quiet - the builder just fails in the safe direction if it does.
    if(a.carried === false) system.intrinsic = true;

    items.push({
      name: a.name,
      // MELEE OR RANGED, RULED 2026-09-25 (Matt), attack by attack: guns, bows,
      // thrown weapons, beams, spit, grenades, breath, sprays and spores, and the
      // mind, gaze and aura attacks, declare `ranged` in bestiary-data.js. A
      // ranged one takes the ranged path: DEX to hit, refused while Blind, and
      // no melee-only reaction (retaliation, Too Hot to Hold, melee Berserk).
      type: a.ranged ? "weaponRanged" : "weaponMelee",
      // npc actors are exempt from the equip gate in actor-sheet.js anyway,
      // but set explicitly so the data itself is not misleading.
      system,
      // Compel-a-Target Save, 2026-09-09. The note above already SAYS the
      // save; the flag makes it clickable, which is what Matt ruled the
      // mechanism means — the note alone is not the mechanism served.
      // `applies` beside it, 2026-09-16: the condition the attack inflicts.
      // `abilityDamage`, 2026-09-22: the loss the damage click applies.
      // `abilityTick`, the same day: the per-round loss a hit starts.
      ...itemFlags({ saves, applies, abilityDamage, abilityTick,
                     heals: targetHealEffectsOf(a), drains: drainEffectsOf(a), maxHPLoss: maxHPLossEffectsOf(a),
                     takesRation: (a.effects || []).filter(e => e.kind === "takesRation" && (e.ration === "food" || e.ration === "water")),
                     sporeDepletion: (a.effects || []).some(e => e.kind === "sporeDepletion"),
                     armourLoss, avAsIf, toHit: weaponToHitFlags(a), holdOnHit: holdSpec(a.hold, a.name),
                     woundOnHit: a.woundOnHit ?? null, woundOnDamage: a.woundOnDamage ?? null, surgicalArray: !!a.surgicalArray,
                     woundRoll: a.woundRoll ?? null, destroyItemRoll: a.destroyItemRoll ?? null,
                     hitProgression: (a.effects || []).find(e => e.kind === "hitProgression") ?? null,
                     levelGain: levelGainOf(a),
                     typedDice })
    });
  }

  // CONDITIONAL FOLLOW-UP ATTACK (2026-09-21, RULED by Matt). "2 x Claw (d8)
  // + Maul (2d6) if both claws hit same target": the Maul is already its own
  // weapon and rolls like any other; what was missing is the reminder at the
  // moment it matters, which is when the CLAWS are rolled. So the follow-up
  // is declared on the Maul (followUp.after) and carried as a flag on the
  // attack it follows, and the attack card prints the book's own condition.
  // Matt's ruling is a note and a rollable Item, deliberately nothing that
  // tracks hits: the GM sees both claws land and rolls the Maul.
  //
  // A MISSING HOST THROWS AT BUILD. followUp.after names an attack of the same
  // creature; a renamed Claw would otherwise build a Maul whose reminder
  // silently never appears, which reads exactly like a creature without one.
  for(const a of abilities)
  {
    if(!a.followUp?.after) continue;
    const host = items.find(i => i.name === a.followUp.after);
    if(!host) throw new Error(`${a.name}: followUp.after names "${a.followUp.after}", which is not an attack of this creature`);
    const dice = damageEffectsOf(a).map(e => e.dice || String(e.flat)).join("+");
    host.flags = { ...(host.flags ?? {}), vaarn: { ...(host.flags?.vaarn ?? {}),
      followUp: [...(host.flags?.vaarn?.followUp ?? []), { name: a.name, dice, condition: a.condition ?? "" }] } };
  }
  return items;
}

/**
 * Reminder Items for a creature's per-round rules — Creature Rule Reminder
 * Surface, 2026-09-08.
 *
 * THE GAP THIS CLOSES: `abilities` is derived from the ATK line and holds
 * attacks only — all 247 of its entries name a segment of `atk` and none came
 * from the biography. So a creature's RULES had no Item at all, and a GM
 * spawning a Chromavore had nothing on the sheet to switch Incorporeal on
 * with. The reminder mechanism was built and unreachable for most of the
 * atoms waiting on it.
 *
 * ONLY `perRound` RULES BECOME ITEMS. `rules` holds all 135 named rules
 * because an array whose membership tracked a heuristic would invert silently
 * when the heuristic changed; the sheet is a different question, and putting
 * every rule on it would bury the toggleable ones among 109 that do nothing.
 *
 * TYPE IS `item`, NOT A NEW TYPE. A dedicated creatureRule type would be a
 * template.json change, so a relaunch, plus a sheet template — for no gain:
 * npc-sheet.html renders every item in one flat list and the toggle comes
 * from canRoundRemind reading the item's own text, which this description
 * satisfies. Same reasoning as the parent row keeping its state in flags.
 *
 * `intrinsic: true` because a creature's rule is part of the creature, not
 * gear it carries — so Item Transfer refuses to hand Incorporeal to another
 * actor, and Item Control Visibility hides the delete from players. `item` is
 * not in ALWAYS_INTRINSIC_TYPES and cannot be (a generic item is usually
 * gear), so it is set explicitly here, which is what that row asks of every
 * creation site.
 *
 * The icon is a Foundry CORE icon, not system art, so it is unaffected by
 * whether tokens/ is installed and cannot become a broken image in a build
 * with no art — the thing Import Bestiary Art Degradation was filed about.
 * Verified to resolve (HTTP 200) against the running server on 2026-09-08
 * rather than assumed from the path looking plausible; the default
 * item-bag.svg was carried until that check actually ran. `clockwork` reads
 * as recurrence, which is what these are, and stays neutral between a rule
 * that hurts and one that heals — several of them regenerate.
 */
/**
 * A rule's declared per-round HP change, checked and normalised - Direct HP
 * Adjustment, 2026-09-23. Throws at build on a shape the round card cannot
 * apply, so a typo fails loudly instead of building a button that does
 * nothing: `to` is self or targets, a heal carries no damage types, and
 * anything but a restore-to-full needs dice.
 */
function hpTickFlag(spec, where)
{
  const to = spec.to ?? "self";
  if(!["self", "targets"].includes(to)) throw new Error(`${where}: hpTick.to "${to}" is not self or targets`);
  if(!spec.full && !spec.dice) throw new Error(`${where}: hpTick needs dice unless it restores to full`);
  if(spec.heal && spec.damageTypes?.length) throw new Error(`${where}: a healing hpTick has no damage type`);
  // The Chernobog's Black Cloud (Multi-Target wiring, 2026-09-25): `factor`
  // multiplies the damage once per click already made, and `conditionAfter`
  // puts a Combat Condition on each target once `ticks` clicks have landed.
  if(spec.factor != null && !(Number(spec.factor) > 1)) throw new Error(`${where}: hpTick.factor must be above 1`);
  if(spec.conditionAfter && (!conditionByKey(spec.conditionAfter.condition) || !(Number(spec.conditionAfter.ticks) > 0)))
    throw new Error(`${where}: hpTick.conditionAfter needs a known condition and a tick count`);
  return {
    to,
    heal: !!spec.heal,
    ...(spec.dice ? { dice: String(spec.dice) } : {}),
    ...(spec.full ? { full: true } : {}),
    ...(spec.perCount ? { perCount: String(spec.perCount) } : {}),
    ...(spec.damageTypes?.length ? { damageTypes: [...spec.damageTypes] } : {}),
    ...(spec.factor ? { factor: Number(spec.factor) } : {}),
    ...(spec.conditionAfter ? { conditionAfter: { condition: spec.conditionAfter.condition, ticks: Number(spec.conditionAfter.ticks) } } : {}),
  };
}

export function ruleItems(entry)
{
  return [...ruleItemsProper(entry), ...countdownItems(entry)];
}

/**
 * A SECOND COUNTDOWN ON ONE RULE, as its own Item - Timed Condition Duration,
 * 2026-09-21. The Regenerator's rule is a per-round regeneration AND "dead
 * Regenerators revive within d6 hours"; one Item cannot carry both, because its
 * hourglass is already the per-round toggle. RULED (Matt): the GM starts the
 * revival by hand when the creature dies, so a rule may declare `countdown:
 * {name, text, declaredSpan}` and gets a second Item carrying that span and
 * the book's own sentence. Fire or acid cancelling it stays with the GM.
 */
function countdownItems(entry)
{
  return (entry.rules || []).filter(r => r.countdown).map(r => ({
    name: `${r.name}: ${r.countdown.name}`,
    type: "item",
    img: "icons/svg/clockwork.svg",
    system: {
      description: `<p>${r.countdown.text}</p>`,
      ...spanFieldFrom(r.countdown),
      slots: 0,
      quantity: 1,
      tradeValue: 0,
      intrinsic: true
    }
  }));
}

function ruleItemsProper(entry)
{
  // WIDENED PAST perRound 2026-09-08 (Matt), and renamed with it. The old name
  // was itself the flaw he named that day — "reminders" described one of the
  // reasons a rule needs an Item, and so quietly excluded every other reason.
  // A rule now gets an Item if it declares ANY mechanism needing a control.
  //
  // The test is a DECLARED FLAG, never the rule's text. Measured before this
  // was written: 8 creature rules mention an hour, a day or an Exploration
  // Turn, and exactly ONE is an effort somebody spends. The other seven are
  // durations and rates belonging to Timed Condition Duration and Long-Clock
  // Recurrence, and a text match would have armed a control on every one —
  // the same failure toggle-census.mjs polices on the per-round side.
  //
  // WIDENED AGAIN 2026-09-19, Lethal Blow Redirection: `watchdog` marks the
  // Synthhound's Watchdog Protocol. The Item is the whole point — it is what
  // makes the rule findable from code, and the flag is exactly the DECLARED
  // test the paragraph above asks for. Matching the creature's NAME instead
  // would lose a renamed Synthhound, the fault Group 194 found in the Vimana.
  // A DECLARED SPAN MAKES A RULE AN ITEM TOO (2026-09-20). Until then the
  // filter asked only whether a rule ticks or carries a special mechanism, so
  // a rule stating plainly how long its effect lasts — Babbling's d6 hours,
  // Hysteria's d6 hours, Overheat's round — had nowhere to put it and showed
  // up only as prose in the creature's biography. A declaration IS the signal
  // that something is trackable, which is exactly what this filter is for.
  //
  // IT ALSO RESOLVED A RED CHECKER rather than being added for tidiness.
  // Tightening PER_ROUND_WORDING the same day left two perRound flags stale —
  // both generated by gen-bestiary-rules.mjs from the loose version — and
  // toggle-census caught both as reminder Items nothing could switch on.
  // Lazarus Guard's Resurrection declares d3 rounds, so this clause keeps it
  // and gives it a working control; Hegemony Ordinator's Vitality Sensor
  // declares nothing and ticks nothing, so it correctly stops being an Item.
  //
  // A DECLARED SAVE MAKES A RULE AN ITEM TOO (2026-09-21, Creature Rule Save
  // Extraction). A rule that compels a save and has no same-named attack to
  // carry it - Gravity Tyrant's Accretion, the Nome's Summoning Triangle, and
  // the Magneticrab's Magnetic Field, whose attack shares the rule's name -
  // was reachable from nothing; Matt ruled the save goes on the rule and the
  // rule's Item carries the control. Declared in rules[].effects, the shape
  // abilities[].effects uses, and read by the same saveEffectsOf, so a rule
  // and an attack that compel a save behave identically on the sheet. Never
  // the text: Faa Sniper's Headshot says "no Save possible".
  //
  // DECLARED AV STATES MAKE A RULE AN ITEM TOO (2026-09-21, Creature AV State
  // Control). JADE prints the Thermasaur's AV as "Special": 13 while hot, 18
  // while cold. RULED (Matt): the AV is variable, the creature is built at 13,
  // and the rule's Item carries one button per state so the Referee sets it
  // during play. `avStates` is [{label, av}], declared on the rule.
  //
  // A DECLARED HP TICK MAKES A RULE AN ITEM TOO (2026-09-23, Direct HP
  // Adjustment). RULED (Matt): a per-round HP change - regeneration, sunlight,
  // Devour, the Heat Aura - gets a GM-only button on the round card, never an
  // automatic write, because exposure and position are the Referee's call.
  // `hpTick` is {dice?, heal?, to?, damageTypes?, perCount?, full?}; the
  // Jollyhoss's Two Are One declares one with no per-round wording at all, so
  // the declaration is what gives it an Item and a toggle.
  // A DECLARED SPAWN MAKES A RULE AN ITEM TOO (2026-09-24, Actor Spawning
  // from Bestiary): the Brood Mother's Brood births d6 Broodlings a round, and
  // the round card's GM-only button does the birthing. `spawn` is {creature,
  // dice}, the creature a Bestiary name.
  // A DECLARED MORALE FAILURE MAKES A RULE AN ITEM TOO (2026-09-24, Morale
  // Check): the Hegemony Conscript's Bomb Collar. RULED (Matt): a failed
  // Morale Save whispers the Referee a separate card - never the public one,
  // which would telegraph the collar - with a button applying the blast to
  // the Conscript itself and to the targeted tokens. `moraleFail` is {dice,
  // damageTypes?}.
  // A DECLARED ENCOUNTER EFFECT MAKES A RULE AN ITEM TOO (2026-09-24, RULED by
  // Matt): the Doomsinger's Doom Song. Its control puts one open-ended row on
  // every OTHER actor in the combat - "only the singer itself is excluded".
  // `encounterEffect` is {conditions, text}; the conditions are board keys.
  // A DECLARED AURA ABILITY LOSS (2026-09-24, RULED by Matt): the
  // Thermasaur's Cold Aura - "an item with a damage roll button. GM targets
  // appropriate tokens and rolls for damage, deals the dex dmg and informs if
  // frozen". `auraAbilityDamage` is {ability, dice, atZero}.
  return (entry.rules || []).filter(r => r.perRound || r.activity || r.levelDrain || r.watchdog || r.protector || r.declaredSpan || r.avStates || r.hpTick || r.spawn || r.spawnNow || r.summonFromDepth || r.summonFromLocation || r.cloneSelf || r.splitOnDamage || r.moraleFail || r.encounterEffect || r.auraAbilityDamage || r.avStep || saveEffectsOf(r).length).map(r => ({
    name: r.name,
    type: "item",
    img: "icons/svg/clockwork.svg",
    system: {
      description: [`<p>${r.text}</p>`, ...saveEffectsOf(r).map(e => `<p><b>${saveSentence(e)}</b>.</p>`)].join(""),
      ...spanFieldFrom(r),
      // Weightless and worthless: a rule is not carried and cannot be sold.
      slots: 0,
      quantity: 1,
      tradeValue: 0,
      intrinsic: true
    },
    // Carried as a FLAG rather than a template.json field: a property a
    // handful of Items have, not one every Item has — the exotica precedent
    // rather than the intrinsic one — and it needs no relaunch.
    //
    // IT MUST BE IN sync-bestiary.js's ITEM KEY or it will silently never
    // sync. That macro's own comment records three separate occasions when a
    // field was added here and not there, each found only by someone noticing
    // a fix that could not reach the pack.
    // One flags block, merged, because a rule may declare more than one
    // mechanism and two spread expressions would have the later win.
    // `save` joins the same block, written by the same saveFlag the attack
    // paths use, so the control cannot tell which kind of Item it is on.
    ...((r.activity || r.levelDrain || r.watchdog || r.protector || r.avStates || r.hpTick || r.spawn || r.spawnNow || r.summonFromDepth || r.summonFromLocation || r.cloneSelf || r.splitOnDamage || r.moraleFail || r.encounterEffect || r.auraAbilityDamage || r.avStep || saveEffectsOf(r).length) ? { flags: { vaarn: {
      ...(r.auraAbilityDamage ? { auraAbilityDamage: { ability: checkedAbility(r.auraAbilityDamage.ability, r.auraAbilityDamage), dice: String(r.auraAbilityDamage.dice),
        ...(r.auraAbilityDamage.atZero ? { atZero: r.auraAbilityDamage.atZero } : {}) } } : {}),
      ...(r.encounterEffect ? { encounterEffect: { conditions: [...r.encounterEffect.conditions], text: r.encounterEffect.text,
        ...(r.encounterEffect.verb ? { verb: r.encounterEffect.verb } : {}), ...(r.encounterEffect.ends ? { ends: r.encounterEffect.ends } : {}) } } : {}),
      ...(r.hpTick    ? { hpTick:     hpTickFlag(r.hpTick, r.name) } : {}),
      ...(r.spawn     ? { spawn:      { creature: r.spawn.creature, dice: r.spawn.dice } } : {}),
      // Actor Spawning wiring, RULED 2026-09-25 (Matt). A ONE-OFF spawn the
      // Referee triggers from the rule Item - the Legionary's flare, the Copy
      // Cat's Clone Cough - kept apart from the per-round `spawn` above, which
      // the round card treats as recurring.
      ...(r.spawnNow  ? { spawnNow:   { creature: r.spawnNow.creature, dice: String(r.spawnNow.dice) } } : {}),
      // The Banisher's Summon: one roll on a chosen depth's encounter list.
      ...(r.summonFromDepth ? { summonFromDepth: true } : {}),
      // Summons from the PARTY'S LOCATION's encounter table (a Daemon's Summons Monsters, RULED 2026-10-04).
      ...(r.summonFromLocation ? { summonFromLocation: true } : {}),
      // Copies of the creature ITSELF beside it - a Daemon's Inferior Clones (RULED 2026-10-04): { dice, hp }.
      ...(r.cloneSelf ? { cloneSelf: { dice: String(r.cloneSelf.dice), ...(r.cloneSelf.hp != null ? { hp: Number(r.cloneSelf.hp) } : {}) } } : {}),
      // A split offered to the Referee when the creature is damaged - the
      // Fractalisk, the Glittersludge. {unlessTypes, halfLevel, immuneToCause}.
      ...(r.splitOnDamage ? { splitOnDamage: { unlessTypes: [...(r.splitOnDamage.unlessTypes ?? [])],
        halfLevel: !!r.splitOnDamage.halfLevel, immuneToCause: !!r.splitOnDamage.immuneToCause } } : {}),
      ...(r.moraleFail ? { moraleFail: { dice: r.moraleFail.dice, damageTypes: r.moraleFail.damageTypes ?? [] } } : {}),
      ...(r.activity  ? { activity:   r.activity   } : {}),
      ...(r.levelDrain ? { levelDrain: r.levelDrain } : {}),
      ...(r.watchdog  ? { watchdog:   true         } : {}),
      // Look Out Sire (Lethal Blow Redirection, RULED 2026-09-26 by Matt): the
      // Consul's Lictor's Protect control, combat/protector.js.
      ...(r.protector ? { protector:  true         } : {}),
      ...(r.avStates  ? { avStates: r.avStates.map(s => ({ label: s.label, av: s.av })) } : {}),
      ...(saveEffectsOf(r).length ? { save: saveFlag(saveEffectsOf(r)) } : {}),
      // Multi-Target wiring, RULED 2026-09-25 (Matt). A PER-ROUND rule's save
      // goes on the round card, one card per targeted token (the Gravity
      // Tyrant's Accretion, the Magneticrab's field) - marked here because an
      // ability reminder can carry a save too and must keep its own button.
      ...(r.perRound && saveEffectsOf(r).length ? { roundSave: true } : {}),
      // The Magneticrab's field (Metal Item Property Part B, 2026-09-27): its
      // round card names who holds metal and who is pulled. Rides the save's
      // flags block - the field always declares its STR save.
      ...(r.magnetField ? { magnetField: true } : {}),
      // "Each Accretion adds +1 to the Tyrant's AV": a Referee button that adds
      // the step to the current AV. Accretion stays adjudicated - the Referee
      // takes the item and clicks once per item taken.
      ...(r.avStep    ? { avStep: Number(r.avStep) } : {})
    } } } : {})
  }));
}

/**
 * Reminder Items for a creature's recurring ABILITIES — Per-Round Ability
 * Reminder Surface, 2026-09-08.
 *
 * THE GAP THIS CLOSES, and it is the mirror of ruleItems above rather
 * than a second helping of it. That one covers `rules`, cut from the
 * biography. This covers `abilities`, cut from the ATK line — and the ATK
 * line is where these three creatures state the thing that actually recurs.
 * All three HAVE bolded rules, and not one of those rules is the recurring
 * thing, so no amount of rule-side work would ever have reached them.
 *
 * THE GATE IS "PRODUCED NO WEAPON", NOT A LOOSER WEAPON GATE. An ability
 * becomes a weapon Item only when it deals HP damage, and that gate is
 * correct — attacksFromAbilities' own header explains that promoting
 * "Siphon (d4 STR damage)" to a weapon would drain hit points it never
 * touches, and "Repair Protocol (+d6 HP)" would damage the ally it heals.
 * So the fix is a second, non-weapon Item, and it asks damageEffectsOf the
 * same question the weapon path asks, which is why that predicate is now
 * shared. Widening the weapon gate instead would have been the obvious
 * wrong answer.
 *
 * THE GATE DID WIDEN ON 2026-09-22, and the objection above is met rather
 * than overruled: an ability-damage attack becomes a weapon with NO HP
 * FORMULA, so Siphon rolls to hit and its damage click drains STR, never hit
 * points. The question is now becomesWeapon, asked here inverted.
 *
 * ONGOING **OR** WORDING, deliberately both. Two of the three are marked
 * `ongoing`; Lambent Lynx's Blinding Pelt is not, and only matches through
 * "d6 rounds of Blindness". THAT ONE IS NOT A PER-ROUND CASE AT ALL — it is
 * a DURATION, so the mechanism it wants is Round-Duration Expiry, not
 * Per-Round Effect Reminder. It belongs here regardless: round-effects.js
 * serves both mechanisms off the SAME toggle and differs only in the state
 * it writes, so one surface satisfies both, and the gap is identical (a
 * save-only ability emits no Item, so there is nothing on the sheet to
 * toggle). Do not let this function's NAME narrow it back to per-round only.
 *
 * PER_ROUND_WORDING IS IMPORTED, NOT RESTATED. round-effects.js says it is
 * the one copy, and it says so because there were three and they had drifted.
 * A fourth here would decide whether a toggle appears for these creatures
 * while the sheet decided something else.
 *
 * The `ongoing` note is appended for a reason that is currently theoretical
 * and cheap to keep: the toggle comes from canRoundRemind testing the item's
 * OWN text, so an ability admitted by `ongoing` alone would otherwise get a
 * reminder Item with no reminder on it. Both of today's ongoing abilities
 * also carry the wording, so nothing depends on it yet — but the gate and
 * the toggle would silently disagree the first time one didn't. Same string
 * the weapon path writes, so the two read identically on a sheet.
 *
 * Item shape is ruleItems' shape exactly — `item`, core clockwork icon,
 * intrinsic, weightless, worthless — for that function's reasons, which
 * apply here unchanged: no template.json change, so no relaunch, and no
 * question about the world's existing documents.
 */
export function abilityReminders(entry)
{
  const items = [];
  for(const a of (entry.abilities || []))
  {
    if(becomesWeapon(a)) continue;
    // WIDENED 2026-09-09 for Compel-a-Target Save. Measured before writing
    // it: of the 45 structured save effects, 19 sit on an ability that also
    // deals HP damage and so already had a weapon Item to carry a control,
    // and 26 sit on an ability with no damage at all — excluded by the gate
    // above and so reachable from nothing. Those 26 are why this function
    // widened instead of the HP-damage gate loosening: Matt ruled 2026-09-09
    // that a gaze attack must not be listed as a weapon.
    //
    // A DECLARED save effect, never the text. "must CON save" appears in
    // plenty of biographies, belonging to rules this function never sees.
    const saves = saveEffectsOf(a);
    // A condition with no save and no damage - Grimweaver's Web Shot - has
    // nothing else to put it on the sheet, so it is admitted here (2026-09-16).
    const applies = conditionAppliesOf(a, entry.rules || []);
    // An auto-hit per-round loss - Occulith's gaze, the Obelisk, the Exemplar
    // (Ability Damage pass 3, 2026-09-22) - has no attack to ride, so it is
    // admitted here and its control starts the loss on the targeted tokens.
    const abilityTick = tickEffectsOf(a);
    // An auto-hit ESCALATING loss - Brain Burster - is admitted for the same
    // reason the tick above is: it has no attack to ride, and its control is
    // what starts the effect on the targeted tokens.
    const escalating = escalatingEffectsOf(a);
    // A heal on the targeted tokens - Turretwright's Repair Protocol,
    // Negativfolk's Knife (Direct HP Adjustment, 2026-09-23) - produces no
    // weapon and has no other route onto the sheet.
    const heals = targetHealEffectsOf(a);
    // Temporary HP pumped into the targeted tokens - the Zenithlight Negatick's
    // Infusion (2026-09-26) - produces no weapon either.
    const tempHp = tempHpEffectsOf(a);
    if(!saves.length && !applies.length && !abilityTick.length && !escalating.length && !heals.length && !tempHp.length && !a.ongoing && !PER_ROUND_WORDING.test(a.text || "")) continue;

    const notes = [`<i>${a.text}</i>`];
    for(const e of heals)
      notes.push(`<b>Heals ${e.dice} HP</b> to each targeted token${e.target ? ` (${e.target} only)` : ""} - the Referee's heal control.`);
    for(const e of tempHp)
      notes.push(`<b>Adds ${e.dice} temporary HP</b> to each targeted token - the Referee's control${e.burstAt ? `; at more than ${e.burstAt} times its maximum HP it dies` : ""}.`);
    if(a.ongoing) notes.push("<b>Ongoing:</b> repeats each round.");
    for(const e of abilityTick)
      notes.push(`<b>${e.dice || e.flat} ${e.ability.toUpperCase()} damage${e.avPerTick ? ` and +${e.avPerTick} AV` : ""} each round</b> to each targeted token - the first when started, then from the round card until it is removed from the target's board.`
        + (e.fade ? ` Both fade one point a day rather than healing - the daily card's Fade button.` : ""));
    for(const e of escalating)
      notes.push(`<b>${e.start} damage to each targeted token, multiplying by ${e.factor || 2} every round</b> - the first when started, then from the round card until it is removed from the target's board.`);
    for(const e of saves) notes.push(`<b>${saveSentence(e)}</b>.`);
    for(const e of (a.effects || []).filter(e => e.kind === "save" && e.onFail?.hold))
    {
      const h = holdSpec(e.onFail.hold, a.name);
      notes.push(`<b>On a failed save, holds the target:</b> ${holdWhat(h)}, from the round card; ${h.escape.ability.toUpperCase()} save to ${h.escape.by} on their turn.`);
    }
    for(const x of applies.filter(x => !x.viaSave)) notes.push(`<b>Inflicts:</b> ${x.effect ?? conditionByKey(x.condition).label}.`);

    items.push({
      name: a.name,
      type: "item",
      img: "icons/svg/clockwork.svg",
      system: {
        description: notes.map(n => `<p>${n}</p>`).join(""),
        ...spanFieldFrom(a),
        slots: 0,
        quantity: 1,
        tradeValue: 0,
        intrinsic: true
      },
      // The same declared flag the weapon path writes, read by the same
      // control, so a save-only ability and an attack that compels a save
      // behave identically on the sheet.
      ...itemFlags({ saves, applies, abilityTick, escalating, heals, tempHp })
    });
  }
  return items;
}

/**
 * Weapon Items parsed out of an ATK line — the FALLBACK, used only for entries
 * with no `abilities` array. Deliberately conservative: only clean
 * "Name (XdY)" segments become Items. "Kalotoxin Sting (Special)" and
 * "Lithifying Ray (d8 DEX Damage, ...)" are NOT weapons by this rule and are
 * left to the biography, which carries the full ATK line regardless.
 */
export function parseAttacks(atkOrEntry)
{
  // Accepts a whole BESTIARY entry or a bare atk string. Entries carrying a
  // structured `abilities` array take that path; anything else falls back to
  // parsing the text, so a creature without abilities behaves exactly as
  // before and this can land without a big-bang migration.
  if(atkOrEntry && typeof atkOrEntry === "object")
  {
    if(Array.isArray(atkOrEntry.abilities)) return attacksFromAbilities(atkOrEntry.abilities, atkOrEntry.rules || []);
    atkOrEntry = atkOrEntry.atk;
  }
  const atkText = atkOrEntry;
  if(!atkText) return [];

  // Split top-level "HEAD: ... . HINDQUARTERS: ..." style multi-part lines
  // (only Jollyhoss uses this) on ". " first, then the usual " / "
  // (alternative) and " + " (multi-attack) separators.
  const segments = atkText.split(/\.\s+(?=[A-Z]+:)/).flatMap(s => s.split(/\s+\/\s+|\s+\+\s+/));

  const items = [];
  for(const raw of segments)
  {
    const seg = raw.replace(/^[A-Z ]+:\s*/, "").replace(/^\d+\s*x\s*/i, "").trim();
    const match = seg.match(/^([A-Za-z][A-Za-z'\-\s]*?)\s*\((\d*d\d+)\)$/);
    if(!match) continue;

    const [, atkName, dice] = match;
    items.push({
      name: atkName.trim(),
      type: "weaponMelee",
      // npc actors are exempt from the equip gate in actor-sheet.js anyway,
      // but set explicitly so the data itself is not misleading.
      system: { damageDice: dice, slots: 0, tags: [], equipped: true }
    });
  }
  return items;
}

/** The system block a BESTIARY entry should produce. */
export function buildSystem(entry)
{
  const abilityValue = Math.min(entry.level ?? 0, 10);
  const abilities = {};
  for(const key of ["str", "dex", "con", "int", "psy", "ego"])
    abilities[key] = { value: abilityValue, max: 10, woundDamage: 0 };

  const creatureTypes = {
    biological: false, synthetic: false, psychic: false,
    fungal: false, mineral: false, hypergeometric: false, outsider: false
  };
  for(const t of entry.types || []) creatureTypes[t] = true;

  return {
    level: { value: entry.level ?? 0, min: 1 },
    health: { value: entry.hp ?? 0, min: 0, max: entry.hp ?? 0 },
    armor: { value: entry.av ?? 10, bonus: 0 },
    // `mode` carries the entries whose book stat line is a rule rather than a
    // bonus — see morale.js. Without it, "Never Flees" arrives as the number
    // 0 and the creature becomes the likeliest thing in the book to run away.
    morale: {
      value: entry.moraleBonus ?? 0,
      max: 20,
      min: 0,
      mode: entry.moraleMode || "",
      note: entry.moraleNote || ""
    },
    enc: entry.enc || "",
    abilities,
    creatureTypes,
    // Set per entry and never derived from `types`. RULED 2026-09-11 (Matt):
    // mineral over-captures badly -- 7 mineral creatures and only the 2
    // Lithlings carry the rule -- and a Lithling Scholar's stat block never
    // mentions it, so the entry text could not produce this either.
    noHealRule: entry.noHealRule || "",
    // Container Slot Capacity (2026-09-20). The printed carrying capacity, and
    // the first roster field to reach the Actor from pets-data.js and
    // steeds-data.js rather than staying inert in the roster. 0 for a bestiary
    // creature and for the ten pets that print no figure - a pet's base is 0
    // by ruling, and it earns slots by levelling instead, which cargoCapacityOf
    // reads off the ledger rather than from here.
    //
    // THIS ALONE DOES NOT GIVE A CREATURE A COMPARTMENT. cargoCapacityOf gates
    // on the companion KIND, so a Bestiary crocodile with a 0 here still gets
    // null and shows nothing; the number only means something once something
    // says the creature is a pet or a steed.
    itemSlots: Number(entry.itemSlots) || 0,
    // The Thin Mare alone. Its table cell reads "Special" and the 100 slots
    // behind it are reachable only by a d100 touch-search, so the capacity is
    // real but not freely available. Carried onto the Actor so the sheet can
    // say so beside the number; the capacity itself is honoured like any
    // other, because "hard to reach" is not "smaller".
    itemSlotsSpecial: !!entry.itemSlotsSpecial,
    biography: buildBiography(entry)
  };
}

/**
 * EVERY embedded Item a creature should carry — attacks, then per-round rule
 * reminders.
 *
 * Extracted 2026-09-08 the moment ruleItems existed, because there are two
 * callers and they are not both obvious. pack-build.js and import-bestiary.js
 * go through buildCreatureDoc and would have got the reminders for free, but
 * sync-bestiary.js builds its own list and REPLACES a creature's items
 * wholesale — so it would have deleted every reminder Item on the next sync,
 * silently, and the creatures would have looked correct in the pack and wrong
 * in the world. That is the exact hazard this module's header was written
 * about, one function lower down than the header expected.
 *
 * So: nothing outside this module should call parseAttacks, ruleItems or
 * abilityReminders to decide what a creature carries. Call this.
 *
 * Ability reminders joined the list 2026-09-08 and needed no caller change,
 * which is the whole return on having extracted this function a few hours
 * earlier: pack-build.js, import-bestiary.js and sync-bestiary.js all picked
 * them up at once, and sync could not silently delete them on its next run.
 */
export function buildCreatureItems(entry)
{
  return mergeSameNamedRules([...parseAttacks(entry), ...abilityReminders(entry)], ruleItems(entry))
    .concat(rolledStatItems(entry), generatedGearPlaceholders(entry), usableItems(entry));
}

/**
 * PLACEHOLDERS FOR GENERATED GEAR - Item Creation from Roll Table wiring,
 * RULED 2026-09-25 (Matt). A "generate" weapon ability (the Bandit's Basic
 * Weapon, the Knights') or a rule declaring `generate` (the Cacogen's
 * Corrupted Blood, the Titan Acolyte's Cybernetics) becomes an inert Item
 * carrying flags.vaarn.generate; creature-generate.js replaces it with the
 * rolled weapon, mutation or implant when the creature enters the world. In
 * the pack it only says what will be rolled.
 */
export function generatedGearPlaceholders(entry)
{
  const out = [];
  const placeholder = (name, text, generate) => ({
    name, type: "item", img: "icons/svg/dice-target.svg",
    system: { description: `<p>${text}</p><p><i>Rolled when this creature enters the world, and replaced by what it rolls.</i></p>`,
              slots: 0, quantity: 1, tradeValue: 0, intrinsic: true },
    flags: { vaarn: { generate } }
  });
  for(const a of (entry.abilities || []))
    for(const e of (a.effects || []).filter(e => e.kind === "generateWeapon"))
    {
      if(!["Basic", "Advanced", "Exotic"].includes(e.tier)) throw new Error(`${entry.name} ${a.name}: generateWeapon tier "${e.tier}"`);
      out.push(placeholder(a.name, a.text, { kind: "weapon", tier: e.tier, ...(e.weaponKind ? { weaponKind: e.weaponKind } : {}) }));
    }
  for(const r of (entry.rules || []).filter(r => r.generate))
  {
    if(!["mutation", "implant"].includes(r.generate)) throw new Error(`${entry.name} ${r.name}: generate "${r.generate}"`);
    out.push(placeholder(r.name, r.text, { kind: r.generate }));
  }
  return out;
}

/**
 * ONE ITEM PER NAME - Creature Rule Save Extraction, 2026-09-21 (Matt: "go
 * ahead", after asking whether the pairs could be merged at all).
 *
 * A creature's attack and its rule often share a name, because the book
 * prints "Devour (STR save vs Devoured)" in the ATK line and then a bolded
 * **Devour** paragraph saying what being devoured does. Built separately,
 * the sheet showed two "Devour" Items: one carrying the save control, one
 * carrying the rule text and the round reminder. Found on six creatures -
 * Chernobog, Faminebearer, Fleshwarp, Nerve Crawler, Phase Panther,
 * Unfolder - while wiring the Magneticrab, which would have been the seventh.
 *
 * NEITHER HALF CAN SIMPLY GO: the rule Item holds the text and the reminder,
 * the attack Item the control or the weapon. So they fold into one, and the
 * surviving shape depends on the attack's:
 *   - a WEAPON survives, because it is what the creature rolls. The rule's
 *     text is appended to its description - canRoundRemind reads the text,
 *     so the reminder comes with it - and the rule's flags join its own.
 *   - a save-only reminder Item folds INTO the rule, which is the shape
 *     Accretion and Magnetic Field have (tested in Group 269.2): rule text,
 *     then the attack line and save sentence, and the attack's flags.
 *
 * ONLY A ONE-TO-ONE PAIR MERGES. Two attacks or two rules under one name is
 * a question about the data, not something to guess at, so it is left
 * as-is for a person to see.
 */
function mergeSameNamedRules(attacks, rules)
{
  const count = (list, name) => list.filter(i => i.name === name).length;
  const out = [...attacks];
  for(const rule of rules)
  {
    const at = out.findIndex(i => i.name === rule.name);
    if(at < 0 || count(attacks, rule.name) !== 1 || count(rules, rule.name) !== 1)
    {
      out.push(rule);
      continue;
    }
    const attack = out[at];
    const flags = { ...(rule.flags?.vaarn ?? {}), ...(attack.flags?.vaarn ?? {}) };
    const keepWeapon = attack.type !== "item";
    const base = keepWeapon ? attack : rule;
    const other = keepWeapon ? rule : attack;
    out[at] = {
      ...base,
      system: { ...other.system, ...base.system,
                description: keepWeapon
                  ? attack.system.description + rule.system.description
                  : rule.system.description + attack.system.description },
      ...(Object.keys(flags).length ? { flags: { vaarn: flags } } : {})
    };
  }
  return out;
}

/**
 * The complete Actor document for a creature, ready for Actor.createDocuments.
 *
 * Extracted 2026-09-06 when sync-bestiary.js gained the ability to create
 * missing creatures. Before that only pack-build.js built this shape, so
 * there was nothing to share; two builders assembling it independently is the
 * same hazard that produced buildBiography and buildSystem above, and it
 * would show up as a creature that differs depending on which route created
 * it — the hardest kind of drift to notice, because both routes look right.
 *
 * `img` is passed IN rather than resolved here. This module stays art-free on
 * purpose (see the header): the art tables live in bestiary-art.js, callers
 * decide whether art is available at all via artAvailable(), and a null img
 * is a supported outcome, not a failure — it is what a build with no tokens/
 * directory produces.
 */
/**
 * The ambush override a creature's rules declare — Ambush Override Flags.
 *
 * ON THE ACTOR, NOT ON AN ITEM, and that is the whole reason this helper
 * exists rather than the flag riding along with the per-round ones. Only
 * `perRound` and `activity` rules become Items (see `ruleItems`), because an
 * Item is what gives a rule a control to click. An ambush override has
 * nothing to click: it is read once, by the dialog, before a roll that may
 * not happen. Widening the Item filter to carry it would put a weightless
 * Item on seven creatures for a property nobody toggles, which is exactly
 * the unearned-control shape `toggle-census.mjs` polices.
 *
 * FIRST DECLARING RULE WINS. No creature in the book carries two, and if one
 * ever does, silently merging two overrides would be worse than taking the
 * first and leaving the second visible in the biography.
 */
export function ambushFlagOf(entry)
{
  const rule = (entry.rules || []).find(r => r.ambush);
  if (!rule) return null;
  // `rule` is carried so the dialog can quote the book rather than paraphrase
  // it — every "always" in Vaarn has an "unless", and the Referee is the one
  // who decides whether the unless applies.
  return { mode: rule.ambush, unless: rule.ambushUnless || "", rule: rule.name, text: rule.text };
}

/**
 * Everything that travels as an actor flag, assembled in one place so a
 * second property does not have to re-derive the `undefined` case.
 */
export function creatureFlags(entry)
{
  const vaarn = {};
  if (entry.flat) vaarn.flat = true;
  const ambush = ambushFlagOf(entry);
  if (ambush) vaarn.ambush = ambush;
  // Companion Ration Upkeep (2026-09-19): a creature that neither eats nor
  // drinks, naming the rule that says so. Only Pet Rock and Crysteed carry it.
  // sync-pets-steeds.js compares flags whole and needs no edit for it;
  // sync-bestiary.js lists its flags by hand, so a Bestiary creature that
  // gains this would need adding there.
  if (entry.rationFree) vaarn.rationFree = entry.rationFree;
  // Diet-Matched Ration Consumption (2026-09-23): the Item a companion eats
  // in place of a Food Ration. Only the Glue Worm carries it. A flag, like
  // rationFree, so a pet the player renames keeps its diet.
  if (entry.dietRation) vaarn.dietRation = entry.dietRation;
  // Travel and Rations (2026-09-23): what a companion brings its owner each
  // travel day - the Exultant's Hawk's Raw Meat. Read by daily-yield.js.
  if (entry.dailyYield) vaarn.dailyYield = { ...entry.dailyYield };
  // Metal Item Property (RULED 2026-09-27): a creature or steed that counts as
  // WEARING METAL ARMOUR - nine soldiers and the War Camel. metal.js's
  // wearsMetalArmour reads it. sync-bestiary.js lists it by hand.
  if (entry.metalArmour) vaarn.metalArmour = true;
  // The Yurling: a hit may devour a metal item instead of damage (Metal Item
  // Property Part B, 2026-09-27). sync-bestiary.js lists it by hand.
  if (entry.devoursMetal) vaarn.devoursMetal = true;
  // Travel and Rations (2026-09-23): what Butchery may take from the body -
  // "nothing" (the Blightbeast) or "blood" only (the Unicorn). On the ACTOR,
  // so a renamed token keeps it. sync-bestiary.js compares and writes it by
  // hand, like advantageVs.
  if (entry.carcass) vaarn.carcass = { ...entry.carcass };
  // Which CREATURE_DAMAGE_RULES entry this creature answers to, stored so a
  // renamed token keeps its damage rule (Matt, 2026-09-21) - the same key
  // vehicle-build.js writes, for the same Group 194 reason. Only a creature
  // with an entry carries it; the rest have nothing to lose by a rename.
  if (CREATURE_DAMAGE_RULES[entry.name]) vaarn.damageRuleKey = entry.name;
  // ADV against a creature type, 2026-09-22 (Creature-Type Checkboxes wiring):
  // a rule declaring advantageVs - Drill Drone's Miner - lets the attack roll
  // take ADV when every target has one of those types. On the ACTOR, not a
  // weapon, because the book gives it to the creature: every attack it makes.
  // sync-bestiary.js compares and writes it by hand, like damageRuleKey.
  const advantageVs = (entry.rules || []).filter(r => r.advantageVs?.length)
    .map(r => ({ rule: r.name, types: checkedTypes(r.advantageVs, `${entry.name} / ${r.name}`) }));
  if (advantageVs.length) vaarn.advantageVs = advantageVs;
  // ADV against a target carrying a Combat Condition, RULED 2026-09-24 (Matt):
  // the Chernobog's Cave Fighter, "against blinded creatures" - the Blind
  // CONDITION on the target's board, never the Blind mutation or a creature
  // that is blind to its own advantage. Read through the board, so immunity
  // has already removed it. sync-bestiary.js writes it by hand.
  const advantageVsCondition = (entry.rules || []).filter(r => r.advantageVsCondition?.length)
    .map(r => ({ rule: r.name, conditions: r.advantageVsCondition.map(k => {
      if (!conditionByKey(k)) throw new Error(`${entry.name} / ${r.name}: no such condition "${k}"`);
      return k; }) }));
  if (advantageVsCondition.length) vaarn.advantageVsCondition = advantageVsCondition;
  // A creature the condition cannot touch - the Blind Crab's "cannot be
  // blinded" (RULED 2026-09-24). immunityTo reads it beside the item list.
  const conditionImmunity = [...new Set((entry.rules || []).flatMap(r => r.conditionImmunity ?? []))];
  for (const k of conditionImmunity)
    if (!conditionByKey(k)) throw new Error(`${entry.name}: no such condition "${k}"`);
  if (conditionImmunity.length) vaarn.conditionImmunity = conditionImmunity;
  // A reminder on every attack roll the creature makes, for a clause that
  // turns on something the sheet cannot see - the Blind Crab's "hits with ADV
  // in darkness" (Roll-Notes Mechanism, RULED 2026-09-24 by Matt: a note is
  // enough). On the ACTOR, like advantageVs; sync-bestiary.js writes it by hand.
  const attackNotes = (entry.rules || []).filter(r => r.attackNote)
    .map(r => ({ rule: r.name, text: r.attackNote }));
  if (attackNotes.length) vaarn.attackNotes = attackNotes;
  // Standing GM Reminder, RULED 2026-09-24 (Matt): a companion rule the
  // Referee applies to its OWNER - the Stridingfool's Abomination. Owning
  // stands in for riding. gm-reminder.js writes the row on the owner's board
  // while they own it. sync-pets-steeds.js compares flags whole.
  // Bound to the Host, RULED 2026-09-24 (Matt): the Usurper Arm. A missed
  // attack against it offers the Referee a button that deals that attack's
  // damage to its host instead. The HOST is recorded on the spawned Actor by
  // save-gated.js (hostActorId); this flag only says the rule applies.
  // sync-bestiary.js compares and writes it by hand, like advantageVs.
  if ((entry.rules || []).some(r => r.boundToHost)) vaarn.boundToHost = true;
  // Grafted to the Host, RULED 2026-09-26 (Matt): the Fleshwarp's Grafted Arm.
  // Its AV is its host's, read live, and damage dealt to it is split with the
  // host. The HOST is recorded on the spawned Actor by grafted-arm.js; this
  // flag only says the rule applies. sync-bestiary.js compares and writes it.
  if ((entry.rules || []).some(r => r.graftedToHost)) vaarn.graftedToHost = true;
  // Item Corrosion on a Hit, RULED 2026-09-24 (Matt): the Rustacean's claws.
  // Each hit posts a card from which the Referee picks the item corroded.
  // sync-bestiary.js compares and writes it by hand, like boundToHost.
  if ((entry.rules || []).some(r => r.corrodesOnHit)) vaarn.corrodesOnHit = true;
  // Retaliation on Attack wiring, RULED 2026-09-26 (Matt): the Quill Spider's
  // Quills and the Thornthrower's Spines - a missed melee attack against the
  // creature costs the attacker a fixed amount, applied automatically like
  // Body Barbs. sync-bestiary.js compares and writes it by hand.
  const retaliation = (entry.rules || []).filter(r => r.retaliation)
    .map(r => ({ rule: r.name, on: r.retaliation.on, damage: r.retaliation.damage }));
  if (retaliation.length) vaarn.retaliation = retaliation;
  // "Melee weapons used against the creature become too hot to hold" - the
  // Thermasaur's Heat Aura, RULED 2026-09-24 (Matt). Only while the aura is
  // on, which is its AV state: the state whose label is the rule's name.
  // sync-bestiary.js compares and writes it by hand.
  const hot = (entry.rules || []).find(r => r.dropsMeleeWeapons);
  if (hot)
  {
    const state = (entry.rules || []).flatMap(r => r.avStates ?? []).find(s => s.label === hot.name);
    if (!state) throw new Error(`${entry.name} / ${hot.name}: dropsMeleeWeapons needs an AV state labelled "${hot.name}"`);
    vaarn.dropsMeleeWeapons = { rule: hot.name, av: state.av };
  }
  const ownerReminders = (entry.rules || []).filter(r => r.ownerReminder)
    .map(r => ({ rule: r.name, text: r.text }));
  if (ownerReminders.length) vaarn.ownerReminders = ownerReminders;
  return Object.keys(vaarn).length ? { vaarn } : undefined;
}

export function buildCreatureDoc(entry, img)
{
  return {
    name: entry.name,
    type: "npc",
    img: img || undefined,
    prototypeToken: img ? { texture: { src: img } } : undefined,
    system: buildSystem(entry),
    // Derived actor properties that are not creature types travel as flags,
    // so they need no template.json change and a timed effect can set or
    // clear the same one later. `flat` (two-dimensional) is the first.
    flags: creatureFlags(entry),
    // Whole entry, not entry.atk — parseAttacks prefers the structured
    // `abilities` array when one is present and only parses the text when
    // it is not. Per-round rule reminders follow the attacks, so a creature
    // with no per-round rule gets exactly the item list it had before.
    items: buildCreatureItems(entry)
  };
}
