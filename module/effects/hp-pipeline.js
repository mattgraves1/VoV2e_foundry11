/**
 * THE HP PIPELINE - Effect Engine: Shared Pipelines (foundry-system-index.csv
 * "Effect Engine: Shared Pipelines", build plan RULED 2026-10-05 by Matt).
 *
 * Every HP change is to run through here, in the ruled order:
 *   1. damage types and immunities      (doDamage: the type table, overrides)
 *   2. multipliers                      (doDamage: double damage, berserk, crit)
 *   3. redirects and splits             (doDamage: Watchdog, Look Out Sire, grafted limb, rebound)
 *   4. temp HP                          (resolveHPChange: the soak)
 *   5. the healing gate, floor, scaling (heal path - chunk 3)
 *   6. Wounds and death, kill reported  (resolveHPChange: Wounds table, Death's Door, creature death)
 *
 * CHUNK 1 (2026-10-05) IS A MOVE, NOT A CHANGE. These two functions were the
 * character sheet's _doDamage and _resolveHPChange, moved here verbatim with
 * `this` renamed `sheet`: the sheet that called them, which still supplies
 * the helpers not yet moved (_applyWound, _postWoundMsg, the protector and
 * heal helpers). The sheet keeps both method names as one-line wrappers, so
 * every caller - about twenty modules reach them through actor.sheet - is
 * unchanged. Chunks 2 to 7 route the other HP writers through here.
 */

import { getWound } from "../actor/wounds-data.js";
import { woundEffectsOf, woundTableKind } from "../item/wound-affliction-effects.js";
import { itemAtSlot } from "../actor/item-slots.js";
import { entriesOf } from "../time/effect-board.js";
import { rollAbilityBonus } from "../actor/chargen-app.js";
import { resolveDamageInteractions, damageOverride, hasAttackProperty, attackPropertiesOrKinetic, FLAMMABLE_BURN, isFlammable,
         incomingDamageMultiplier, ignoresEvenDamage, woundDamageMultiplier, hasAnyCreatureType, reboundsAttack } from "../item/attack-properties.js";
import { d } from "../actor/chargen-app.js";
import { statOf } from "./item-stats.js";
import { postSaveCard } from "../combat/compelled-save.js";
import { watchdogRedirect, watchdogKillButton } from "../combat/watchdog.js";
import { noHealRule } from "../actor/deprived.js";
import { startBurning } from "../combat/apply-to-target.js";
import { suppressesDeath, suppressionMsg } from "../combat/fatality.js";
import { isSpirit, fadeMessage } from "../actor/spirit.js";
import { offerSplit } from "../actor/bestiary-spawn.js";
import { gmHP } from "../actor/hidden-hp.js";
import { TEMP_HP_FIELD, tempHpOf, soakDamage, soakLine } from "../combat/temp-hp.js";
import { protectorsOf, wouldKill } from "../combat/protector.js";
import { graftHostOf, splitForHost } from "../actor/grafted-arm.js";
import { loseLevels } from "../actor/advancement.js";
import { spanFieldFrom } from "../time/declared-span.js";
import { setDefeated } from "./defeated.js";
import { avBandSentences } from "../item/weapon-tags.js";
import { computeGate } from "./gates.js";
import { hitHealFor, killHealFor } from "./weapon-heals.js";
// Creature attack flags from their sentences (Effect Engine: Creatures chunk 2a).
import { creatureAttackOf } from "../item/creature-effects.js";

/**
 * How far a berserk frenzy reaches — "melee", "all", or null for none.
 *
 * ONE FLAG, TWO SCOPES, because two items set it and the book gives them
 * different words. The Berserker StimRig: "While active, you take and deal
 * double MELEE damage." Berserker Brew: "They deal and receive double damage",
 * with no melee clause anywhere in the entry. They shared `berserkerActive`
 * from the day both were built and the narrower reading won by default, so the
 * Brew has been under-applying ever since. RULED 2026-09-19 (Matt): "it
 * shouldn't be melee-only."
 *
 * A LEGACY `true` READS AS MELEE. Nothing migrates existing world state — a
 * flag written before this change means what it meant when it was written, and
 * the only actors that could hold one are mid-combat right now. Widening them
 * silently is the change that would actually surprise someone.
 */
function berserkScope(actor)
{
  const v = actor?.getFlag?.("vaarn", "berserkerActive");
  return v === "all" ? "all" : (v ? "melee" : null);
}

/** Does the frenzy bite on THIS attack? */
export function berserkApplies(actor, isMelee)
{
  const scope = berserkScope(actor);
  return scope === "all" || (scope === "melee" && isMelee);
}

/**
 * `isMelee` (item 10.8, 2026-08-27) — whether the incoming hit was from a
 * melee source, so Berserker StimRig/Brew's "take double melee damage"
 * can be checked against the TARGET's own flag, independent of whatever
 * the attacker's own berserker state was (that's _onItemRoll's damage
 * branch's concern, on the dealing end).
 *
 * `components` (2026-09-10) — the damage figure split into the parts that can
 * interact with the target DIFFERENTLY, as [{ amount, name, types }].
 *
 * Optional, and defaulting to today's behaviour exactly: with none supplied
 * the whole figure is one component carrying the parent Item's own attack
 * properties, which is what every caller but the folded damage roll wants.
 *
 * It exists because folding Bioelectricity's +d6 ELECTRICAL into a kinetic
 * weapon's roll makes a single number wrong in both directions — an
 * electrical-immune target would still take that d6, and an
 * electrical-vulnerable one would not have it doubled. `types: null` on a
 * component means "resolve as the parent Item", so the five add-ons that carry
 * no type of their own cost nothing here.
 */
export function doDamage(sheet, token, dmg, isMelee, item, rollMultiplier = 1, components = null, { graftSplit = true, skipProtect = false, rebounded = false, noAttacker = false, asked = null } = {})
{
  const actor = token.actor;
  // NO ATTACKER (chunk 2, 2026-10-05): a trap, a cough, an exploding weapon.
  // `sheet` is then the TARGET's own, and the two attacker rules below must not
  // read it as one - an incorporeal target would otherwise "deal no damage" to
  // itself, and a rebound would bounce onto the target.
  // The attack as it arrived, before this target's own rules - what a held
  // blow (Look Out Sire, below) re-runs when the Referee lets it land.
  const arrived = { dmg, components };

  // INCORPOREAL, DEALING SIDE (2026-09-11). RULED (Matt): a character phased
  // out of reality "can neither take (invincible) nor deal (incorporeal)
  // damage". The taking half is a target property and lives in the damage
  // table; this is the other half, and it is here because this is the first
  // point at which both attacker and target are known.
  //
  // BEFORE EVERYTHING, deliberately. Mauling still rolls its extra die and
  // Vampiric still reads the figure if this sits lower down, and a phased
  // character would heal from damage they did not deal.
  //
  // A HYPERGEOMETRIC WEAPON DOES NOT HELP, and that was asked rather than
  // assumed. Matt agreed 2026-09-11: the exception on the taking side exists
  // because such weapons reach into where the phased character is, not
  // because the phased character can reach out. They are the one out of
  // reality and the weapon is out there with them.
  if(!noAttacker && sheet._isIncorporeal(sheet.actor))
  {
    sheet._postWoundMsg(actor, `is untouched — <b>${sheet.actor.name}</b> is <b>Incorporeal</b> and can deal no damage while phased out of reality.`);
    return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
  }

  // One component unless told otherwise, so every existing caller keeps its
  // exact behaviour: the whole figure, resolved against the parent Item.
  // `min` defaults to the amount itself for a caller that supplied no
  // components: without the Roll there is no way to know what the dice could
  // have rolled, and a floor equal to the amount is a floor that does
  // nothing. Wrong in the safe direction — it under-applies Glassflesh
  // rather than inventing a reduction.
  const parts = (components?.length ? components : [{ amount: dmg, min: dmg, name: item?.name ?? "damage", types: null }])
    .map(c => ({ min: c.amount, ...c }));

  // A TARGET THAT THROWS THE BLOW BACK - the Extradimensional Mystic Hunter's
  // Psychic Mirror, against any part of a hit carrying a property it
  // `rebounds` (gift, hypergeometry). Built 2026-09-26 for Hypergeometric
  // weapons ("weapon tag counts"); that was REVERSED the same day - the tag is
  // anti-hypergeometric and no longer rebounds - and this stays as the general
  // path for whatever does carry one. PER COMPONENT, as immunity is: the parts carrying a
  // rebounded property go to the attacker, and the rest still land here.
  // `rebounded` stops a Hunter hitting a Hunter from bouncing for ever.
  if(!rebounded && !noAttacker && item && token.actor)
  {
    const propsOf = c => c.types?.length ? c.types : attackPropertiesOrKinetic(item);
    const back = parts.filter(c => propsOf(c).some(p => reboundsAttack(token.actor, p)));
    if(back.length)
    {
      const mirror = reboundsAttack(token.actor, propsOf(back[0]).find(p => reboundsAttack(token.actor, p)));
      const total = back.reduce((a, c) => a + c.amount, 0);
      sheet._postWoundMsg(token.actor, `is untouched — <b>${mirror.rule}</b>: <b>${back[0].name ?? item.name}</b> rebounds on <b>${sheet.actor.name}</b>.`);
      sheet._doDamage({ actor: sheet.actor }, total, isMelee, item, rollMultiplier, back, { graftSplit, skipProtect, rebounded: true });
      const kept = parts.filter(c => !back.includes(c));
      if(!kept.length) return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false, dealt: 0 };
      return sheet._doDamage(token, kept.reduce((a, c) => a + c.amount, 0), isMelee, item, rollMultiplier, kept, { graftSplit, skipProtect, rebounded: true });
    }
  }

  // A GRAFTED LIMB SHARES ITS DAMAGE with its host - the Fleshwarp's Grafted
  // Arm, RULED 2026-09-26 (Matt). The RAW figure is split here, before any
  // of the target's own rules: the limb takes the rounded-up half, the host
  // the rounded-down half, and each half then runs this whole method against
  // its own actor - the host's WITH the attacking weapon, so its own
  // resistances and immunities decide it, as Bound to the Host was tested.
  // Automatic, not a Referee button. The healing each half earns the
  // attacker is summed, so a Vampiric weapon drains from both.
  const graftHost = graftSplit ? graftHostOf(actor) : null;
  if(graftHost)
  {
    const split = splitForHost(parts);
    sheet._postWoundMsg(actor, `shares the blow with <b>${graftHost.name}</b> — <b>${split.limbTotal}</b> to the limb, <b>${split.hostTotal}</b> to its host.`);
    const hostRes = split.hostTotal > 0
      ? sheet._doDamage({ actor: graftHost }, split.hostTotal, isMelee, item, rollMultiplier, split.host, { graftSplit: false, noAttacker })
      : { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
    const limbRes = sheet._doDamage(token, split.limbTotal, isMelee, item, rollMultiplier, split.limb, { graftSplit: false, noAttacker });
    return { ...limbRes,
      vampiricHeal: (limbRes.vampiricHeal ?? 0) + (hostRes.vampiricHeal ?? 0),
      bloodRapturousHeal: (limbRes.bloodRapturousHeal ?? 0) + (hostRes.bloodRapturousHeal ?? 0),
      drainHeal: (limbRes.drainHeal ?? 0) + (hostRes.drainHeal ?? 0) };
  }

  // Mauling and Piercing weapon tags (2026-09-03). The vault states they
  // "are mirror opposites", and they are exactly that — same two AV
  // thresholds, swapped:
  //   Mauling  — extra die at AV <= 13, halved at AV >= 16
  //   Piercing — extra die at AV >= 16, halved at AV <= 13
  // So they share one block with the band lookup inverted, rather than
  // two near-identical copies that could drift apart.
  // AV 14-15 is a deliberate dead band in the book, not a gap.
  //
  // Per target, like everything else in this method, because the damage
  // roll upstream is one number shared by every target the attack hit.
  // The extra die must be ROLLED here for the same reason.
  //
  // Matt's rulings 2026-09-03:
  //  - halved ROUNDS DOWN, so a rolled 1 becomes 0. First halving rule in
  //    the codebase; the Core Rules state no general rounding convention.
  //  - AV is read through _effectiveTargetAV, NOT the raw armor.value. That
  //    means a Vibroactive weapon ("hits as though the target was
  //    unarmoured", AV 10) permanently enables Mauling's bonus die and can
  //    never be halved. Raised as a probable accident; Matt overruled —
  //    Vibroactive enabling Mauling is a fun interaction and this game is
  //    not balanced for.
  //  - the extra die is doubled by a critical hit. Extended here to the
  //    attacker's berserk doubling as well, via rollMultiplier, on the same
  //    reasoning: the extra die is part of the weapon's damage, so it takes
  //    whatever multiplier the base dice already took upstream.
  //
  // Runs BEFORE the two "target takes double" multipliers below so the
  // extra die participates in them exactly as the base dice do.
  // From the weapon's sentences since Effect Engine: Weapon Tags chunk 3
  // (2026-10-05): an attack-hit sentence gated on the target's AV band.
  const band = item ? avBandSentences(item) : { boost: [], halve: [] };
  // Heavy and Strong are NOT here, and that is the whole point of this note.
  // They briefly were, on 2026-09-15, and it was wrong: this block runs once
  // per HIT TARGET, so an attack rolled with nothing targeted never reaches
  // it. Mauling and Piercing can live with that because they cannot know
  // their band without a target; an unconditional tag cannot. RULED (Matt)
  // 2026-09-16: "damage rolls on heavy/strong should always get the extra
  // die, even without a target." They are back in applyDamageTagModifiers,
  // which puts their die in the damageDice the roll is built from.
  if(band.boost.length || band.halve.length)
  {
    const av = sheet._effectiveTargetAV(actor, item);
    const holds = s => (s.if ?? []).every(g => g.gate !== "target-av" || computeGate(g, { targetAV: av }));
    // A weapon carrying BOTH tags is not reachable from the generators
    // (Mauling and Piercing are both ADVANCED_TAGS and a weapon rolls one),
    // but a hand-edited item can hold both. Left to resolve naturally
    // rather than special-cased: each tag reads the band independently, so
    // in either band one adds a die and the other halves, and they roughly
    // cancel. That is a sane answer to a nonsense weapon.
    const boosting = band.boost.find(holds), halving = band.halve.find(holds);
    const boostBy = boosting ? (boosting.tag ?? item.name) : null;
    const halveBy = halving ? (halving.tag ?? item.name) : null;
    const size = String(statOf(item, "damage-dice") || "").match(/^\d+(d\d+)$/)?.[1];

    // The extra die is the PARENT weapon's, sized from its own damageDice, so
    // it joins the parent component rather than standing on its own — it is
    // that weapon's damage and takes that weapon's damage type.
    if(boostBy && size)
    {
      const extra = new Roll(`1${size}`);
      extra.evaluate({async: false});
      const added = extra.total * rollMultiplier;
      parts[0].amount += added;
      // The floor moves with it: one more die is one more guaranteed point.
      parts[0].min += rollMultiplier;
      sheet._postWoundMsg(actor, `— Effective AV ${av}: <b>${item.name}</b>'s ${boostBy} adds an extra ${size}: <b>+${added}</b>.`);
    }
    // Halving applies to the whole blow, every component included: the tag
    // describes how this weapon fares against that armour, and a folded add-on
    // die is part of the same swing. Identical to the old behaviour whenever
    // there is only one component, which is every caller but the folded roll.
    if(halveBy)
    {
      parts.forEach(c => { c.amount = Math.floor(c.amount / 2); c.min = Math.floor(c.min / 2); });
      const halvedTotal = parts.reduce((a, c) => a + c.amount, 0);
      sheet._postWoundMsg(actor, `— Effective AV ${av}: <b>${item.name}</b>'s ${halveBy} halves the damage to <b>${halvedTotal}</b>.`);
    }
  }

  // The receiving half of the same frenzy, and it reads the same scope as
  // the dealing half above — a Brew drinker takes double from a bow too.
  if(berserkApplies(actor, isMelee))
    parts.forEach(c => { c.amount *= 2; c.min *= 2; });

  // "Suffer double damage for d6 days" — Vaarnish Poison row 19, wired
  // 2026-09-19. A property of the TARGET's live state, so it sits with the
  // berserker line above rather than in the attack-property table below:
  // that table asks what the weapon is, and this doubles everything alike.
  //
  // `min` moves with `amount`, exactly as the berserker line does, so a
  // Glassflesh floor stays a floor instead of becoming a damage bonus on a
  // low roll — the trap the floor clamp further down exists to catch.
  //
  // ANNOUNCED, unlike the berserker multiplier. The chat card has already
  // posted the undoubled figure, so a silent doubling means the card says 8
  // while the target lost 16. The Psyche-Suppressant note below called the
  // silent one a pre-existing wart rather than the pattern to copy.
  //
  // THE LINE IS POSTED LATER, once the final figure is known — see below.
  // Announcing it here said "deals 16" and was then followed by Incorporeal
  // saying the attack does nothing, which is chat contradicting itself
  // within two lines. Group 226 found that; the multiplication stays here
  // because the floor logic downstream needs `min` already scaled.
  //
  // Multiplicative with everything else, per Matt's standing crit-and-
  // berserk ruling, and harmless against immunity, which short-circuits to
  // zero before any of this is added in.
  const takenMult = incomingDamageMultiplier(actor);
  if(takenMult !== 1)
    parts.forEach(c => { c.amount *= takenMult; c.min *= takenMult; });

  // Psyche-Suppressant weapon tag (2026-09-03): "Double damage to Psychic
  // creatures." Applied HERE, per target, rather than to the damage roll,
  // because the roll is one number shared by every target an attack hit —
  // doubling it would wrongly double against a non-Psychic caught in the
  // same swing. This is the same per-target shape as the berserker check
  // directly above, which is the existing precedent for a multiplier that
  // depends on who is being hit rather than on the roll.
  //
  // Announced, unlike the berserker multiplier, which is silent: the chat
  // card already posted the undoubled number, so a silent doubling means
  // the card says 8 while the target quietly lost 16. Treating the silent
  // one as a pre-existing wart rather than the pattern to copy.
  //
  // Note this stacks MULTIPLICATIVELY with the two doublings above it, per
  // Matt's standing crit-and-berserk ruling: a berserk critical hit on a
  // Psychic target is 8x base damage.
  // ---- attack property x creature type, one table ----------------------
  //
  // Psyche-Suppressant and Electrical were each written here as their own
  // hand-rolled if-block, two days apart. Anti-Paradoxical, Eroding and
  // Hypergeometric are the same shape again, and Bestiary.md states the
  // same matrix a THIRD time as creature-type resistances. Five more
  // near-identical blocks is the duplication-drift failure that has bitten
  // this codebase repeatedly, so all of it now resolves from one table in
  // module/item/attack-properties.js.
  //
  // Matt's rulings 2026-09-05: "attack property" is the attacker-side
  // concept for all these interactions, and immunity "is immunity, like
  // multiplying by zero" — absolute, and it short-circuits, so no other
  // multiplier can bring the damage back above zero.
  //
  // Still per target, and still announced, for the reasons the removed
  // Psyche-Suppressant block gave: the roll is one number shared by every
  // target, and the chat card has already posted the undoubled figure, so a
  // silent multiplier means the card says 8 while the target lost 16.
  if(item)
  {
    // PER COMPONENT, because immunity and vulnerability are properties of a
    // damage TYPE, not of an attack. A component with its own `types` is
    // resolved on those; one with none is resolved as the parent Item, which
    // is the single-component case and therefore every pre-existing caller.
    //
    // The probe is a bare `{ damageTypes }` object rather than the Item:
    // attackPropertiesOf already accepts a system-shaped object, so a typed
    // component reads through the same table as a real weapon and cannot
    // drift from it.
    dmg = 0;
    for(const c of parts)
    {
      const probe = c.types?.length ? { damageTypes: c.types } : item;
      // A component's own name, not the weapon's, or a folded add-on's
      // immunity would be reported against the parent weapon and read as the
      // whole attack doing nothing.
      const label = c.name ?? item.name;

      // A creature rule OR a live condition that overrides the type table
      // entirely — Incorporeal, from the Spectre's own nature or from a
      // Phasing Potion. One call since 2026-09-11; see attack-properties.js
      // for why the drinker gets exactly the creature's rule.
      const override = damageOverride(probe, actor);
      // Incorporeal against a Gift is the Referee's call (RULED 2026-09-26,
      // Matt): nothing is applied, and the line carries the figure.
      if(override?.gmCall)
      {
        sheet._postWoundMsg(actor, `is <b>${override.rule}</b> — whether <b>${label}</b>'s ${c.amount} damage harms it is the Referee's call. Adjust its HP by hand if it does.`);
        continue;
      }
      if(override?.immune)
      {
        sheet._postWoundMsg(actor, `is <b>${override.rule}</b> — <b>${label}</b> does nothing. Only ${override.needs.join(" or ")} weapons can harm it.`);
        continue;
      }

      // Hollow Maiden's Unreal Flesh: an even total does nothing. Read on
      // the amount as it stands here, after any critical or berserk
      // doubling upstream.
      const unreal = ignoresEvenDamage(actor);
      if(unreal && c.amount % 2 === 0)
      {
        sheet._postWoundMsg(actor, `is <b>${unreal.rule}</b> — <b>${label}</b> rolled an even ${c.amount} and does nothing.`);
        continue;
      }

      const { mult, immune, floor, applied } = resolveDamageInteractions(probe, actor);
      // The floor is taken before the multiplier — see the ordering note on
      // resolveDamageInteractions. Clamped against the rolled amount so a
      // floor can only ever reduce: halving rounds down and could otherwise
      // leave `min` above `amount` on a low roll, which would turn Glassflesh
      // Paste into a damage BONUS.
      const base = floor ? Math.min(c.amount, c.min) : c.amount;
      // An immune hit names only the rule that made it immune. Every row
      // checked before it is in `applied` too, and printed as "immune" it read
      // "immune to kinetic damage (Fungal takes half from kinetic)" (Group 419).
      for(const rule of immune ? applied.filter(r => r.mult === 0) : applied)
      {
        // A creature rule may bite on every attack ("*"); it then names no
        // damage kind. A condition key reads badly in chat, so a row may
        // carry a `label` to show instead.
        const kind = rule.attack === "*" ? "" : `${rule.attack} `;
        const who = rule.label ?? rule.target;
        if(immune)
          sheet._postWoundMsg(actor, `is <b>immune</b> to <b>${kind}</b>damage — <b>${label}</b> does nothing. (${rule.note})`);
        else if(rule.floor)
          sheet._postWoundMsg(actor, `takes <b>minimum</b> ${kind}damage — <b>${label}</b> deals ${base} instead of ${c.amount}. (${rule.note})`);
        else if(rule.mult > 1)
          sheet._postWoundMsg(actor, `is <b>${who}</b> — <b>${label}</b>'s ${kind}damage x${rule.mult}. (${rule.note})`);
        else
          sheet._postWoundMsg(actor, `is <b>${who}</b> — <b>${label}</b>'s ${kind}damage is halved. (${rule.note})`);
      }
      // ANSWERED AT THE CLICK (Weapon Tags chunk 3, RULED 2026-10-05): a target
      // the Referee said is submerged takes electrical damage doubled - once,
      // as the book's one "double damage" sentence for Electrical, so not on
      // top of the Synthetic or metal-armour doubling - and a static
      // structure takes eroding damage doubled.
      const cProps = c.types?.length ? c.types : attackPropertiesOrKinetic(item);
      let askedMult = 1;
      if(!immune && asked?.submerged && cProps.includes("electrical") && !applied.some(r => r.attack === "electrical" && r.mult > 1))
      {
        askedMult *= 2;
        sheet._postWoundMsg(actor, `is <b>submerged</b> — <b>${label}</b>'s electrical damage x2. (Electrical: double damage to targets submerged in water)`);
      }
      if(!immune && asked?.structure && cProps.includes("eroding") && !applied.some(r => r.attack === "eroding" && r.mult > 1))
      {
        askedMult *= 2;
        sheet._postWoundMsg(actor, `is <b>a static structure</b> — <b>${label}</b>'s eroding damage x2. (Eroding: double damage to static structures)`);
      }
      dmg += immune ? 0 : Math.floor(base * mult * askedMult);

      // Regeneration Serum: taking fire or acid ENDS the effect outright
      // (Matt's reading, 2026-09-11). Asked per COMPONENT and of the
      // component's own types, so a flaming add-on on an otherwise kinetic
      // weapon ends it and a kinetic add-on on a flaming weapon does not.
      //
      // Fired even when the damage came to nothing: an immune target was
      // still "damaged by fire" in the book's sense, and the alternative
      // reads as an effect surviving because it worked.
      sheet._endEffectsOnDamage(actor, attackPropertiesOrKinetic(probe), label);
    }

    // Electrical's submerged clause has no state to read and stays with the
    // GM, named rather than silently dropped. Asked of the COMPONENTS, so a
    // folded Bioelectricity die raises it on an otherwise kinetic weapon. The
    // metal-armour clause is the interaction table's since 2026-09-27.
    const anyElectrical = parts.some(c => c.types?.length
      ? c.types.includes("electrical")
      : hasAttackProperty(item, "electrical"));
    // Asked at the click since chunk 3; a route that could not ask (a trap, a
    // retaliation) still names it for the GM.
    if(dmg > 0 && anyElectrical && asked?.submerged === undefined)
      sheet._postWoundMsg(actor, `<i>Electrical also doubles vs a submerged target — resolve by hand.</i>`);
    // Eroding's static-structures clause, the same way (Matt, 2026-09-23):
    // no state for a wall or a door, so it is named for the GM. Its mineral
    // and vehicle clauses are rows of DAMAGE_INTERACTIONS.
    const anyEroding = parts.some(c => c.types?.length
      ? c.types.includes("eroding")
      : hasAttackProperty(item, "eroding"));
    if(dmg > 0 && anyEroding && asked?.structure === undefined)
      sheet._postWoundMsg(actor, `<i>Eroding also doubles vs static structures — resolve by hand.</i>`);
  }
  else
    dmg = parts.reduce((a, c) => a + c.amount, 0);

  // Lethal Blow Redirection (2026-09-19) — the Synthhound's Watchdog
  // Protocol: "If a kinetic attack would kill the synthhound's owner, it
  // kills the synthhound instead."
  //
  // HERE, AND NOT LOWER DOWN, because `dmg` is final at this line and
  // nothing below it has spoken yet. Every sentence further down is about a
  // blow that landed on THIS actor — the doubling line, Vampiric's heal,
  // Blood-Rapturous's — and a redirected blow landed on nobody here. The
  // owner would otherwise be told they suffered double damage in the same
  // breath as being told they were untouched.
  //
  // THE OWNER TAKES NO DAMAGE AT ALL (Matt, 2026-09-19). The book says the
  // attack kills the synthhound instead, and the alternative reading —
  // owner takes the damage but not the death — leaves a character sitting
  // at -20 with the Fatality row suppressed, a state the Wounds table has
  // no row for. So `_resolveHPChange` is never called for the owner and the
  // early return below is the protection.
  //
  // VAMPIRIC HEALS NOTHING on a redirect, which follows from that rather
  // than being decided separately: its clause is "regains HP equal to half
  // the damage inflicted", and no damage was inflicted on anyone. The
  // synthhound is killed BY THE RULE, not by the figure.
  //
  // THE KILL IS STILL THE ATTACKER'S (Matt, 2026-09-19), so it goes
  // through `_resolveHPChange` exactly as any other death does and
  // Kill/Death-Detection attributes it with no second copy of that logic.
  // Blood-Rapturous is read against the SUBSTITUTE, since it is the
  // creature that died; the Synthhound being Synthetic, it pays nothing
  // today, and a future biological watchdog would pay correctly.
  // LOOK OUT SIRE (Lethal Blow Redirection, RULED 2026-09-26 by Matt): a
  // lethal blow on a token a living protector guards is HELD, and a GM card
  // offers each protector's death in its place or lets it land. Before the
  // Watchdog, since this is a choice; a blow let through comes back with
  // skipProtect and meets the Watchdog then. See combat/protector.js.
  if(!skipProtect)
  {
    const tokenDoc = token.document ?? (token.documentName === "Token" ? token : null);
    const guards = protectorsOf(tokenDoc, actor, { worldActors: game.actors?.contents ?? [], sceneTokens: canvas?.scene?.tokens?.contents ?? [] });
    if(guards.length && wouldKill(actor, dmg))
    {
      sheet._holdBlowForProtectors(tokenDoc, actor, guards, dmg, arrived, isMelee, item, rollMultiplier);
      return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
    }
  }

  const watchdog = watchdogRedirect(actor, dmg, item);
  if(watchdog)
  {
    sheet._postWoundMsg(actor, `is <b>saved by ${watchdog.name}</b> — <b>Watchdog`
      + ` Protocol</b>. The blow would have been lethal, so it takes the hound`
      + ` instead and ${actor.name} suffers no damage.`);

    // GUARDED ON PERMISSION, not on who rolled. The Referee attacking from
    // an NPC sheet is the ordinary case and writes straight through; a
    // player rolling their own attack gets the button.
    if(!watchdog.isOwner)
    {
      sheet._postWoundMsg(watchdog, `<b>Watchdog Protocol</b> — ${watchdog.name}`
        + ` dies in ${actor.name}'s place. ${watchdogKillButton(watchdog)}`);
      return { vampiricHeal: 0, bloodRapturousHeal: 0, killed: false };
    }

    const dogHP = watchdog.system.health.value;
    const dogOutcome = sheet._resolveHPChange(watchdog, dogHP, 0, { toZero: true });
    // From the weapon's sentences since Weapon Tags chunk 4 (weapon-heals.js).
    const dogHeal = dogOutcome === "killed" ? killHealFor(item, watchdog) : 0;
    return { vampiricHeal: 0, bloodRapturousHeal: dogHeal, killed: dogOutcome === "killed" };
  }


  // The doubling's line, posted here because this is the first point at
  // which the figure is true. `dmg > 0` is the guard that matters: an
  // Incorporeal or otherwise immune target now gets only the sentence
  // saying the attack did nothing, instead of that sentence underneath a
  // claim that it dealt 16.
  //
  // IT NAMES THE FACTOR NOW, rather than saying "double" (2026-09-22).
  // Deathblight scales PER SLOT, so two slots quadruple and three are x8,
  // and the old wording would have called every one of those "double" while
  // the figure beside it disagreed. The affliction is named for the same
  // reason the halved-healing line names it: a number that changed without
  // saying who changed it is the fault this line exists to fix.
  if(takenMult !== 1 && dmg > 0)
  {
    const by = woundDamageMultiplier(actor).named;
    const cause = by.length ? ` from ${by.join(" and ")}` : "";
    sheet._postWoundMsg(actor, `<b>takes x${takenMult} damage</b>${cause} — <b>${item?.name ?? "the attack"}</b> deals <b>${dmg}</b>.`);
  }

  // Vampiric weapon tag (2026-09-03): "When this weapon damages Biological
  // creatures, the wielder regains HP equal to half the damage inflicted."
  //
  // LAST in this method on purpose. "Damage inflicted" is read as the final
  // per-target figure, so everything above — Mauling's extra die, the
  // berserk doubling, Psyche-Suppressant — is already folded in and a
  // Vampiric weapon that also crits heals from the bigger number.
  //
  // Halved ROUNDS DOWN, following the convention Mauling set earlier today.
  // A damage figure of 0 or 1 therefore heals nothing and says nothing.
  //
  // "Damage inflicted" is also read as the damage DEALT, not the HP
  // actually removed: hitting a 3 HP target for 10 heals 5, not 1. The
  // book says inflicted, and overkill is still inflicted.
  //
  // Clamped to the wielder's own max HP explicitly. _resolveHPChange writes
  // any increase straight through without a cap, and actor.js only clamps
  // in prepareData — so an unclamped overheal would sit above max in the
  // database while displaying correctly, which is worth not creating.
  // BUG FOUND IN TESTING 2026-09-03 (item 76.8): this used to write the
  // wielder's HP here, per target. Two Biological targets in one swing then
  // healed 3 total instead of 6 — the second read sheet.actor's HP before the
  // first update had landed, and both chat lines claimed the same new total.
  // Exactly the race _checkRetaliationMutations already warns about for Body
  // Barbs/Quills ("summed into one HP update ... rather than two sequential
  // updates racing against the same stale currentHP").
  //
  // So this method now only REPORTS what Vampiric would restore, and the
  // caller sums across every target hit and applies it once.
  let vampiricHeal = 0;
  // From the weapon's sentences since Weapon Tags chunk 4 (weapon-heals.js).
  vampiricHeal = hitHealFor(item, actor, dmg);

  // A creature's DRAIN - Moonbeast (Nymph)'s Vampiric Tendrils, "heals HP
  // equal to damage". RULED 2026-09-23 (Matt): the attacker heals by what
  // the target lost AFTER immunities, which is `dmg` here, the final
  // per-target figure. The whole of it, and on any creature type: this is
  // the creature's own rule, not the weapon tag above. Reported, not
  // applied, for the tag's reason - the caller sums across targets.
  // A TYPE-LIMITED drain (the Hagfluke's Siphon, RULED 2026-09-27) heals
  // nothing off any other target, and says nothing about it.
  const drain = creatureAttackOf(item).drain;
  const drainHeal = drain && (drain === true || !drain.targets?.length || hasAnyCreatureType(actor, drain.targets))
    ? Math.max(0, dmg) : 0;

  const currentHP = actor.system.health.value;
  const outcome = sheet._resolveHPChange(actor, currentHP, currentHP - dmg);

  // A creature that SPLITS when damaged - the Fractalisk, the Glittersludge
  // (Actor Spawning wiring, RULED 2026-09-25 by Matt: a card, not an
  // automatic split). Only when damage actually landed and it survived.
  if(dmg > 0 && outcome !== "killed")
  {
    const causes = [...new Set(parts.flatMap(c =>
      attackPropertiesOrKinetic(c.types?.length ? { damageTypes: c.types } : (item ?? {}))))];
    offerSplit(actor, causes, Math.max(0, currentHP - dmg));
    // A flammable target set alight (Neobloom, 2026-09-25).
    if(causes.includes("flame") && isFlammable(actor))
      startBurning(actor, FLAMMABLE_BURN).then(() =>
        sheet._postWoundMsg(actor, `catches fire - <b>${FLAMMABLE_BURN.dice}</b> burning damage each round until extinguished.`));
  }

  // Blood-Rapturous weapon tag (2026-09-10): "When a Biological creature is
  // killed with this weapon, the user heals for the victim's maximum HP."
  //
  // Read as an AMOUNT, not a level to heal up to — the book says "heals FOR
  // the victim's maximum HP". Matt's ruling 2026-09-10 is "like vampiric",
  // so two kills in one swing contribute two amounts and the caller sums
  // them. The atom-index note said "heals TO victim's max HP", which is a
  // different rule; the ruling settles it against that reading.
  //
  // REPORTED, not applied, for exactly the reason Vampiric is (item 76.8):
  // writing the wielder's HP per target races itself across a multi-target
  // swing. A weapon can carry BOTH tags, so the two heals also have to reach
  // the wielder as one update — see _applyAttackHeals.
  //
  // "Biological" is tested on the victim the same way Vampiric tests it, so
  // a Synthetic kill heals nothing and says nothing.
  let bloodRapturousHeal = 0;
  if(outcome === "killed") bloodRapturousHeal = killHealFor(item, actor);

  return { vampiricHeal, bloodRapturousHeal, drainHeal, killed: outcome === "killed", dealt: dmg };
}

/**
 * Shared entry point for any HP decrease, whether from a weapon-roll or a
 * manual edit to the HP field on the sheet.
 *
 * RETURNS the outcome as a string — "killed" or null — which
 * is the Kill/Death-Detection Hook (foundry-system-index.csv). Matt's ruling
 * 2026-09-10: fold the detection in here rather than build a subsystem.
 *
 * It is a RETURN VALUE and not an event on purpose. This method knows that a
 * creature died; it does not know who killed it, with what, or whether the
 * blow was melee, and it has ~10 callers that have no attacker to offer — a
 * manual HP edit on the sheet, a gift's HP cost, a usage-die explosion.
 * Threading attacker context through all of them to reach the two callers
 * that have it is the cost that made this row look expensive. So the
 * ATTRIBUTION lives one level out in _doDamage, which already holds the
 * attacker, the weapon and isMelee, and the only thing that has to cross the
 * boundary is what happened.
 *
 * SCOPED TO THE NPC BRANCH (Matt's ruling 2026-09-10). Both consumers fire on
 * killing a FOE, and a character's death is resolved by the Wounds table
 * inside _applyWound, which is async and called without await — so the
 * character branches below cannot report an outcome synchronously and
 * deliberately return nothing rather than half-answer.
 */
export function resolveHPChange(sheet, actor, currentHP, newHP, { manual = false, toZero = false, killLine = null } = {})
{
  // Vehicle Stat Block Import (2026-09-18). A vehicle's HP field IS its Hull
  // (Matt: "Hull is to vehicles as HP is to other actors"), and the one
  // difference is the ratio: "Hull points are reduced by damage at a ratio
  // of 1 to 10. Damage incurred in amounts less than 10 does not reduce a
  // Vehicle's hull points."
  //
  // CONVERTED HERE rather than in _doDamage because this is the funnel every
  // damage path passes through, the chat-card buttons included. Each call is
  // one attack, which is what makes "multiple sources of damage do not
  // stack" hold: 6 and 8 from separate attacks are two calls, each under 10.
  //
  // Nothing happens at 0 Hull beyond reaching it. The book gives a vehicle
  // no unconscious, killed or wrecked state, so none is invented; the kill
  // hooks below never see a vehicle.
  if(actor.type === "vehicle")
  {
    if(newHP < currentHP)
    {
      const dmg  = currentHP - newHP;
      const loss = Math.floor(dmg / 10);
      newHP = Math.max(0, currentHP - loss);
      sheet._postWoundMsg(actor, loss
        ? `takes ${dmg} damage and loses <b>${loss}</b> Hull (1 per 10) — Hull ${newHP}.`
        : `takes ${dmg} damage — under 10, so no Hull is lost.`);
    }
    actor.update({'system.health.value': newHP});
    return null;
  }

  // TEMPORARY HP (2026-09-26, RULED by Matt) - see combat/temp-hp.js. Damage
  // spends the pool before HP; `manual` (an HP value the GM typed) spends
  // nothing; `toZero` (a death that SETS HP to 0) clears the pool with it.
  if(toZero)
  {
    if(tempHpOf(actor) > 0) actor.update({ [TEMP_HP_FIELD]: 0 });
  }
  else if(!manual && newHP < currentHP && tempHpOf(actor) > 0)
  {
    const soak = soakDamage(tempHpOf(actor), currentHP - newHP);
    actor.update({ [TEMP_HP_FIELD]: soak.tempLeft });
    sheet._postWoundMsg(actor, soakLine(soak, t => gmHP(actor, t)));
    if(!soak.dmgLeft) return null;
    newHP = currentHP - soak.dmgLeft;
  }

  // Monsters/NPCs die at 0 HP. JADE IBIS p.30: "NPCs and monsters do not
  // suffer Wounds, instead dying at 0 HP." This replaced the Knave fork's
  // unconscious-at-0/dead-on-next-hit model (row Second-Hit Creature Death,
  // REMOVED 2026-09-18), so the kill hooks now fire on the killing blow.
  if(actor.type !== "character")
  {
    let outcome = null;

    // Only a hit that actually took HP resolves anything. An immune hit
    // (0 damage) on an injected creature sitting at 0 once posted a death
    // message for a blow that did nothing — found in Group 196.
    if(newHP < currentHP && newHP <= 0)
    {
      newHP = 0;

      // Fatality Suppression surface 1. The book says "a CREATURE injected
      // ... cannot die", so an injected monster is alive at 0 HP, and each
      // further damaging hit is another death it survives.
      //
      // OUTCOME STAYS NULL, and that is a ruling rather than a side effect
      // (Matt 2026-09-11): Blood-Rapturous and the Cacklemaw Exile's More!
      // both read "when you kill", and nothing died. Kill/Death-Detection
      // Hook is the row that consumes this return value.
      if(suppressesDeath(actor))
        sheet._postWoundMsg(actor, suppressionMsg(currentHP > 0
          ? "reduced to 0 HP"
          : "hit again at 0 HP"));

      // Spirit Form (2026-09-27): a PC's spirit at 0 HP fades into the
      // aether until sunrise. Nothing died, so the outcome stays null and
      // no kill reaction fires.
      else if(currentHP > 0 && isSpirit(actor))
        sheet._postWoundMsg(actor, fadeMessage());

      // Already dead at 0: nothing is posted and nothing counts as a kill
      // (Matt 2026-09-18), so a corpse cannot feed Blood-Rapturous.
      else if(currentHP > 0)
      {
        // `killLine` is a kill() caller's own wording ("is killed - Watchdog
        // Protocol"); "" when the caller has already said it (a death save's
        // line), so a death is announced once.
        const line = killLine ?? "is killed";
        if(line) sheet._postWoundMsg(actor, line);
        outcome = "killed";
      }
    }

    actor.update({'system.health.value': newHP});

    // Creature-Driven Level Drain — "Slaying the monster restores all lost
    // time to those it fed upon."
    //
    // HUNG OFF THE SAME "killed" OUTCOME the two kill-triggered mutations
    // use, rather than a second death detector. Note it fires for a drainer
    // killed ANY way, not only by an attack, because this is the one place
    // every HP decrease passes through.
    //
    // POSTS A CARD; IT DOES NOT RESTORE. This method runs on the client of
    // whoever dealt the damage, and that client is usually not allowed to
    // write to the victims — restoring hands Levels back to other people's
    // characters. So it follows the shipped `.vaarn-recur-apply` route that
    // apply-to-target.js documents: the card posts from here and the
    // Referee's CLICK carries the permission.
    //
    // IT WAS AN `activeGM` GUARD FOR ONE DAY (2026-09-14) and that was
    // wrong in the direction that fails silently. activeGM resolves to ONE
    // user, and this call site already runs on one client, so the guard
    // subtracted instead of selecting: every kill by anyone other than that
    // single user restored nothing at all, with a dead monster and no
    // message to say why. The `activeGM` guards elsewhere in this system sit
    // on Hooks that fire on EVERY client, which is what makes them correct
    // there. Found in Group 158.
    if(outcome === "killed") sheet._postDrainRestoreCard(actor);

    // DEFEATED (Shared Pipelines chunk 4, RULED 2026-10-05): a creature this
    // funnel kills is marked defeated in the running combat - only a kill, so
    // not one held alive at 0 or a Spirit faded until sunrise.
    if(outcome === "killed") setDefeated(actor, true);

    return outcome;
  }

  // Characters use the Vaarn Wounds table once HP drops to/below 0.
  if(newHP > 0)
  {
    actor.update({'system.health.value': newHP});
    return;
  }

  // INEVITABLE (Lithling): "When your HP reaches zero, you crumble into
  // iridescent dust, leaving behind a pebble-sized lithling seed." No wound
  // is rolled. RULED 2026-09-25 (Matt): the seed is an Item named after the
  // character, left in their inventory. Keyed on the rule the character
  // carries, as the healing gate is. Fatality Suppression holds here too:
  // the character stays at 0 and nothing crumbles.
  // A CRUMBLE IS A KILL (Matt, 2026-09-26): it returns "killed" like a
  // creature's death, so kill reactions and kill-triggered tags see it.
  // Decided here, before the async crumble, because this method returns
  // synchronously; a suppressed death is not a kill.
  if(noHealRule(actor) === "Inevitable")
  {
    if(currentHP <= 0) return;
    const killed = !suppressesDeath(actor);
    sheet._crumbleInevitable(actor);
    return killed ? "killed" : undefined;
  }

  if(newHP === 0 && currentHP > 0)
  {
    const row = getWound(sheet._woundsTableFor(actor), 0);
    sheet._postWoundMsg(actor, `is <b>${row.name}</b> — ${row.effect}`);
    actor.update({'system.health.value': 0});
    // THE hp-0 ROW'S OWN SAVE (Matt, 2026-09-22). "CON Save vs unconscious
    // for d6 rounds" was chat text and nothing else: the row is slots: 0, so
    // it reaches no Item, and the declared d6 rounds reached nothing that
    // could count them. The card asks the character - not a target, which is
    // why postSaveCard takes an explicit saver - and a failure puts the
    // rolled span on their board. The auto-hit half of the rule stays the
    // Referee's, named in the entry's text.
    // The row's save from its sentence since Effect Engine: Wounds and Afflictions
    // chunk 2a (2026-10-06); the table still chooses the row (ruling A).
    const fx0 = woundEffectsOf(woundTableKind(actor), row.name);
    if(fx0.save)
      postSaveCard(actor, row.name, [{ ...fx0.save, span: fx0.declaredSpan }], [], { saver: actor });
    return;
  }

  if(sheet._hasActiveDeathsDoor(actor))
  {
    // Fatality Suppression surface 2. THE WOUND STAYS SKIPPED (Matt
    // 2026-09-11): this branch never applied one, and suppression changes
    // only the message. Falling through to _applyWound here would roll the
    // row for the new HP, which at -20 is Fatality — the death this just
    // suppressed, arriving by another door.
    //
    // HP is still written either way, which is "all other effects (hp loss,
    // wounds etc) happen" doing its work.
    sheet._postWoundMsg(actor, suppressesDeath(actor)
      ? suppressionMsg("further damage while on Death's Door")
      : "is <b>dead</b> — further damage is lethal while on Death's Door.");
    actor.update({'system.health.value': Math.max(newHP, -20)});
    return;
  }

  sheet._applyWound(actor, newHP);
}

/**
 * THE ONE KILL ROUTE - chunk 4 (RULED 2026-10-05, Matt). Every death that SETS
 * HP to 0 - a protector dying in its charge's place, a named wound or a lethal
 * hit on a creature, a temp-HP burst, Death Draught, the Watchdog's hound, a
 * failed death save - takes HP to 0 through the death stage here, so each one
 * gets every consequence a weapon kill gets: temp HP cleared, Fatality
 * Suppression, a Spirit's fade, the kill reported ("killed", which the
 * drain-restore card and kill reactions read) and the creature marked
 * defeated.
 *
 * A CHARACTER takes the death stage as at 0 HP from any other cause: the
 * 0-HP Wounds row and its save, or an Inevitable crumble. `noWound` (RULED C)
 * is a named wound's "HP set to 0 (no wound roll)": HP and temp HP go to 0
 * and nothing else happens. A character's death SAVE never comes here - it
 * stays announce-only (2026-09-24).
 *
 * `line` replaces the funnel's "is killed" - "" when the caller has already
 * announced the death. Returns the funnel's outcome: "killed" or not (for
 * `noWound`, a promise of null once HP is written).
 */
export function kill(sheet, target, { line = null, noWound = false } = {})
{
  if(!target) return null;
  const hp = Number(target.system?.health?.value ?? 0) || 0;
  if(noWound && target.type === "character")
  {
    // Returned so a caller can await the write before what follows it.
    return target.update({ "system.health.value": 0, [TEMP_HP_FIELD]: 0 }).then(() => null);
  }
  return resolveHPChange(sheet, target, hp, 0, { toZero: true, killLine: line });
}

/**
 * THE WOUNDS STAGE - moved verbatim from the character sheet in chunk 4
 * (2026-10-05), `this` renamed `sheet`, as chunk 1 moved the damage path. The
 * sheet keeps _applyWound and _crumbleInevitable as one-line wrappers.
 */
/**
 * Apply the Wounds-table row matching newHP to actor: rolls and applies any
 * numeric effects, records the wound (for item-slot tracking), posts a chat
 * message, and recurses for Bloody Mess's 3 sub-wound rolls.
 */
export async function applyWound(sheet, actor, newHP, depth = 0, { setHP = true } = {})
{
  // `setHP` is false only for a Referee-chosen wound (the Wounds tab picker,
  // 2026-09-17): the row is looked up by its HP value as always, but the
  // character did not fall to that HP and must not be written there.
  const table = sheet._woundsTableFor(actor);
  const clampedHP = Math.max(newHP, -20);
  const row = getWound(table, clampedHP);
  // WHAT THE ROW DOES is its sentences since Effect Engine: Wounds and
  // Afflictions chunk 2a (2026-10-06); WHICH row is still the table's HP
  // lookup (ruling A). The row keeps its name, slots, effect and threshold.
  const fx = woundEffectsOf(woundTableKind(actor), row.name);

  if(fx.instantDeath)
  {
    // Fatality Suppression surface 3 — Fatality, General Systems Failure,
    // Ego-Engine Destroyed. THE WOUND STAYS SKIPPED (Matt 2026-09-11), and
    // here the reason is sharpest: Fatality is slots: 0 with no numeric
    // fields, so death IS its entire content. Suppress it and there is
    // nothing left to apply — recording a 0-slot wound named "Fatality"
    // whose text reads "You are dead." on a living character would be worse
    // than recording nothing. NARROWED 2026-09-27 (Matt): that reason holds
    // only for a SUPPRESSED death, so the skip now applies only there - see
    // below.
    const suppressed = suppressesDeath(actor);
    sheet._postWoundMsg(actor, suppressed
      ? suppressionMsg(`<b>${row.name}</b> on the Wounds table`)
      : `is <b>dead</b> — <b>${row.name}</b>. ${row.effect}`);
    // A DEATH THAT HAPPENS IS RECORDED (RULED 2026-09-27, Matt, narrowing
    // the skip above to the suppressed case): the row goes on the Wounds
    // list like any 0-slot wound, so the sheet shows how the character died
    // and the Ego-Engine Transplant's refusal (resurrection.js) can read an
    // Ego-Engine Destroyed death. A suppressed death still records nothing.
    const update = setHP ? {'system.health.value': clampedHP} : {};
    if(!suppressed)
      update['system.wounds'] = [...duplicate(actor.system.wounds ?? []),
        { hp: row.hp, name: row.name, slots: 0, effect: row.effect, deathsDoor: false, itemId: null }];
    if(Object.keys(update).length) await actor.update(update);
    return;
  }

  const abilities = duplicate(actor.system.abilities);
  const wounds = duplicate(actor.system.wounds);
  let maxHp = actor.system.health.max;
  // Armour DAMAGE, not the armour itself (2026-09-22). This used to
  // decrement system.armor.value, which for a character is rebuilt from
  // equipped items on every prepare - so "Synthskin Damaged" has been
  // writing a figure nothing ever read. The loss now accumulates in the
  // stored damage field the sheet shows beside DEFENSE.
  let armorDamage = Number(actor.system.armor.damage) || 0;
  let msgLines =[`<b>${row.name}</b>${gmHP(actor, ` (HP ${row.hp})`)} — ${row.effect}`];

  if(fx.maxHpDie)
  {
    let r = new Roll(fx.maxHpDie);
    r.evaluate({async: false});
    maxHp -= r.total;
    msgLines.push(`Max HP -${r.total}${gmHP(actor, ` (now ${maxHp})`)}`);
  }

  if(fx.abilityDice)
  {
    for(let [key, formula] of Object.entries(fx.abilityDice))
    {
      let r = new Roll(formula);
      r.evaluate({async: false});
      abilities[key].woundDamage += r.total;
      msgLines.push(`${key.toUpperCase()} wound damage +${r.total} (total ${abilities[key].woundDamage}, effective bonus now ${abilities[key].value - abilities[key].woundDamage})`);
    }
  }

  if(fx.abilityFlat)
  {
    for(let [key, amount] of Object.entries(fx.abilityFlat))
    {
      abilities[key].woundDamage += amount;
      msgLines.push(`${key.toUpperCase()} wound damage +${amount} (total ${abilities[key].woundDamage}, effective bonus now ${abilities[key].value - abilities[key].woundDamage})`);
    }
  }

  if(fx.armorDie)
  {
    let r = new Roll(fx.armorDie);
    r.evaluate({async: false});
    armorDamage += r.total;
    msgLines.push(`Armour damage +${r.total} (total ${armorDamage}, AV now ${Math.max(10, Number(actor.system.armor.value) - armorDamage)})`);
  }

  // Advancement Automation owns level loss now (2026-09-13). The flat
  // decrement this used to do is exactly the approximation Matt ruled
  // against: it took the level away and left behind the HP and Abilities
  // that level had granted. loseLevels replays the ledger instead, and it
  // runs AFTER the wound's own update below so the two do not race on
  // health.max. Terminal Memory Crystal Corruption is the only row carrying
  // either flag, and it has no maxHpDie of its own, so nothing here
  // double-counts.
  if(fx.levelLoss || fx.xpReset)
    msgLines.push(`Lost ${fx.levelLoss ?? 0} level(s)${fx.xpReset ? ", XP reset to 0" : ""} — see the level card.`);

  // Damaged Item's d20 (Wounds and Afflictions chunk 2b, RULED 2026-10-06, Matt):
  // the item in that slot is NAMED as damaged - "we don't want to actually
  // destroy an item here, just indicate what is damaged".
  if(fx.damagedItem)
  {
    const r = new Roll(fx.damagedItem);
    r.evaluate({async: false});
    const hit = itemAtSlot(actor.items, r.total);
    msgLines.push(hit ? `Slot ${r.total} (${fx.damagedItem}): <b>${hit.name}</b> is damaged and unusable until fixed.`
                      : `Slot ${r.total} (${fx.damagedItem}): an empty slot — nothing is damaged.`);
  }

  // Personality Nexus Scrambled (chunk 2b, RULED 2026-10-06, Matt): new base
  // scores rolled the book's way, POSTED for the Referee to apply - "this is
  // intended to completely rewrite their base scores in those stats".
  if(fx.rerollScores)
  {
    const rolled = fx.rerollScores.map(k => ({ k, ...rollAbilityBonus() }));
    msgLines.push(`New base scores to apply by hand (3d6, lowest die): ${rolled.map(x => `<b>${x.k.toUpperCase()} +${x.bonus}</b> (${x.dice.join(", ")})`).join(", ")}.`);
  }

  // Wounds that occupy slots also get a paired Item so they show up in the
  // actor's Items list and count toward the same slot total real gear uses.
  let itemId = null;
  if(row.slots > 0)
  {
    const cls = getDocumentClass("Item");
    const created = await cls.create(
    {
      name: `${row.name} (Wound x${row.slots})`,
      type: "wound",
      system: { slots: row.slots, description: row.effect, hp: row.hp, deathsDoor: fx.deathsDoor, ...spanFieldFrom(fx) }
      // A wound that IS a Combat Condition - Vischip Disabled is Blind (RULED
      // 2026-09-16, Matt: "let the wound declare the condition") - is its held
      // stateful sentence since chunk 2a, which stateful-effect.js reads; the
      // conditions flag it used to be written as is no longer written.
    }, { parent: actor });
    itemId = created.id;
  }

  wounds.push({ hp: row.hp, name: row.name, slots: row.slots, effect: row.effect, deathsDoor: fx.deathsDoor, itemId });

  // A wound that runs on a clock (Cascading Kinesthetics, chunk 2b): its daily
  // recurrence starts, unless one is already running; it ends when the wound does.
  if(fx.recurrence && !entriesOf(actor).some(e => e.kind === "recurrence" && e.recurrenceKey === fx.recurrence))
  {
    const { startRecurrence } = await import("../time/recurrence.js");
    await startRecurrence(actor, { recurrenceKey: fx.recurrence });
  }

  sheet._postWoundMsg(actor, msgLines.join("<br>"));

  // Sub-wound rolls (Bloody Mess) reuse the HP lookup purely to pick a table
  // row — they must not overwrite the actor's real HP, which was already
  // set by the top-level wound that triggered them.
  const update =
  {
    'system.health.max': maxHp,
    'system.abilities': abilities,
    'system.wounds': wounds,
    'system.armor.damage': armorDamage,
  };
  if(depth === 0 && setHP)
    update['system.health.value'] = clampedHP;

  await actor.update(update);

  // After the update, not folded into it: loseLevels does its own reads of
  // health.max and the abilities, and it must see the wound's damage already
  // applied rather than compete with it.
  if(fx.levelLoss || fx.xpReset)
    await loseLevels(actor, fx.levelLoss ?? 0,
      { zeroXp: !!fx.xpReset, reason: `<b>${row.name}</b> — ${row.effect}` });

  if(fx.rollSubWounds && depth < 3)
  {
    for(let i = 0; i < fx.rollSubWounds; i++)
    {
      let r = new Roll("3d6");
      r.evaluate({async: false});
      await applyWound(sheet, actor, -r.total, depth + 1);
    }
  }

  if(depth === 0)
    sheet._checkWoundDeath(actor);
}

/** A Lithling at 0 HP: dust and a seed named after them (see _resolveHPChange). */
export async function crumbleInevitable(sheet, actor)
{
  await actor.update({'system.health.value': 0});
  if(suppressesDeath(actor))
    return sheet._postWoundMsg(actor, suppressionMsg("reduced to 0 HP"));
  await getDocumentClass("Item").create({
    name: `${actor.name}'s Lithling Seed`,
    type: "item",
    system: { slots: 0, quantity: 1,
              description: `<p>A pebble-sized lithling seed, all that remains of ${actor.name}.</p>` }
  }, { parent: actor });
  return sheet._postWoundMsg(actor, `is <b>dead</b> — <b>Inevitable</b>: ${actor.name} crumbles into iridescent dust, leaving behind a pebble-sized lithling seed.`);
}

/**
 * DAMAGE FROM ANYWHERE - chunk 2 (2026-10-05). The one call every damage
 * writer outside an attack uses, so the whole pipeline applies to it: the type
 * table, multipliers (Wrathworms, Poison 19, berserk), redirects and splits
 * (the Watchdog, Look Out Sire, a grafted limb), temp HP, Wounds and death.
 * Before this, failed-save damage, retaliation, Reflecting, traps, the TOX
 * roll and the rest wrote HP through the funnel alone and skipped the first
 * three stages - the bugs the 2026-10-04 survey parked for the engine.
 *
 * `source` is the actor the damage comes from (the creature whose save it
 * was, the retaliating creature), or null for none (a trap, a cough, an
 * exploding weapon); with none the two attacker-only rules are skipped.
 * `types` are damage types; with none the type table is skipped entirely,
 * the rule the round card's untyped ticks already follow (sunlight is not
 * kinetic). `min` is the dice's minimum, for Glassflesh-style floors.
 *
 * NOT FOR COSTS. Paying HP for a Gift, a Bloomboon or a Spirit's ability is a
 * cost, which skips damage-type rules and multipliers (RULED 2026-10-04) and
 * stays on resolveHPChange.
 */
export function dealDamage(target, amount, { source = null, item = null, types = null, min = null, name = null, isMelee = false } = {})
{
  if (!target || !(Number(amount) > 0)) return null;
  const sheet = source?.sheet ?? target.sheet;
  if (!sheet?._doDamage) return null;
  const label = name ?? item?.name ?? "damage";
  const typed = Array.isArray(types) && types.length ? types : null;
  const carrier = item ?? (typed ? { name: label, id: null, flags: {}, system: { damageTypes: typed, tags: [], damageDice: "" } } : null);
  return sheet._doDamage({ actor: target }, Number(amount), isMelee, carrier, 1,
    [{ amount: Number(amount), min: Number(min ?? amount), name: label, types: typed }],
    { noAttacker: !source });
}
