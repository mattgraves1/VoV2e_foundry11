/**
 * Compel-a-Target Save, rolled from the card — foundry-system-index.csv
 * "Compel-a-Target Save", RULED 2026-09-16 (Matt).
 *
 * Until 2026-09-16 the card was descriptive: "uses Blinding Pelt — the target
 * must DEX save vs blinded for d6 rounds", and the target's controller clicked
 * a plain DEX on their sheet. That click could not know it was a save against
 * blindness, so nothing could apply the DIS the book prints on Bulbous Eyes
 * and Cyclops. The affliction card had already crossed this line for
 * nanomachine DIS (RULED 2026-09-13), so this is the compelled card reaching
 * the standard its sibling set, not a new idea: the same sentence, plus a
 * button, plus the modifiers a roll from the card can see.
 *
 * WHO ROLLS. The button is open to whoever controls the target — the player
 * for their own character, the Referee for anything. The target is the token
 * the poster had targeted, else whatever the CLICKER has targeted, else a
 * picker: apply-to-target.js's three-step fallback, reused rather than
 * copied.
 *
 * WHAT THE ROLL KNOWS. The card carries the conditions the ability inflicts
 * (`applies`, the same declaration the Apply card beside it reads), and
 * conditionSaveModifiers turns those into named ADV and DIS sources. The
 * Exotica route and the Autarch figment card stay descriptive — they declare
 * no condition and nothing modifies their saves yet.
 *
 * THE SAVE DOES NOT APPLY ANYTHING. A failure arms nothing; the Apply Effect
 * to Target card posted beside this one is still the Referee's click, for the
 * reason its header gives. This card only says what was rolled. ONE EXCEPTION
 * since 2026-09-19, the TOX route (postToxSave): there the book leaves nothing
 * to adjudicate - a failed save IS the Toxin Die - so the roll raises it.
 *
 * SUPERSEDED 2026-09-24, RULED (Matt) on the Roll-Notes cluster: "we should
 * post a card to roll the save, then put the effect on if the save fails",
 * for every source whose effect a save decides. The card now carries the
 * `applies` its source declares, and a FAILED roll puts each on the saver's
 * board itself - no Apply card follows. A source whose effect no save gates
 * (Darkness, Web, Stasis Bomb) still posts the Apply card; the Referee's click
 * is what stands in for the save the book does not print. Two more outcomes
 * came the same day: a MORALE save (Agonising - d20 + ML, the creature's
 * textual Morale modes honoured) and `onFail.death` (Neurotoxic).
 */
import { SAVE_TARGET } from "./saves.js";
import { rollCardSave, mayRollFor, sourceNote } from "./card-save.js";
import { resolveApplyTarget, applyEffectToActor, startHold, sourceOf } from "./apply-to-target.js";
import { OPPOSED_BASE, abilityBonus } from "./ambush.js";
import { suppressesDeath, suppressionMsg } from "./fatality.js";
import { addEntry, expiryFor } from "../time/effect-board.js";
import { conditionSaveModifiers, conditionApplySpec, creatureRuleApplySpec, conditionByKey, NO_PRINTED_END } from "../actor/condition-data.js";
import { saveDisSources } from "../time/stateful-effect.js";
import { moraleFailRules, moraleFailCard } from "../actor/morale.js";
import { saveSentence } from "../actor/bestiary-build.js";
import { hasAnyCreatureType, degradeArmour, resolveDamageInteractions, damageOverride, sparedBreathing } from "../item/attack-properties.js";
import { toxSaveTarget, toxinModifiers, raisedToxinDie, TOXIN_CURED } from "../actor/toxin-die.js";
import { FOOD_RATION, WATER_RATION, rationKindsFor, rationTotal, spendRation } from "../actor/rest.js";
import { applyNamedWound } from "../actor/named-wound.js";
import { graftLimb } from "../actor/grafted-arm.js";

const SCOPE = "vaarn";
export const CARD_FLAG = "compelledSave";
export const SAVE_FLAG = "compelledSaveRoll";

/**
 * Post the cards for an Item that declares one or more saves: one per
 * targeted token, or one open card with fewer than two targeted. Returns the
 * messages, or null for an Item that declares none.
 *
 * PER TARGET, for EVERY creature save ability (Multi-Target wiring, RULED
 * 2026-09-25 by Matt): "every one for consistency is nice - no surprises at
 * the table, and it behaves flexibly for situations where you want to bend a
 * rule". The Gorgon's Captivating Gaze ("all foes EGO Save") was one card,
 * and a card holds one roll per save, so only its first saver could roll.
 */
export async function postCompelledSave(actor, item)
{
  const saves = item?.flags?.vaarn?.save ?? [];
  if (!saves.length) return null;
  const applies = item.flags?.vaarn?.applies ?? [];
  return postSaveCardsToTargets(actor, item.name, saves, [], applies);
}

/**
 * The board spec for one DECLARED application - {condition, amount, unit} or
 * a creature rule's {effect, text, amount, unit} - with its span rolled now.
 * A die is rolled ONCE, here, so the number the card shows is the number the
 * board stamps. Null for a span that resolves to zero rounds ("blind for 0
 * rounds" is not a condition anyone has) - the Apply card's rule, kept.
 */
export async function declaredApplySpec(a, source)
{
  let rounds = null;
  const amount = a?.amount;
  if (amount !== null && amount !== undefined && amount !== "")
  {
    rounds = Number.isFinite(Number(amount)) ? Number(amount)
      : (await new Roll(String(amount)).evaluate({ async: true })).total;
    if (!(rounds > 0)) return null;
  }
  const unit = a.unit ?? "round";
  const spec = a.effect
    ? creatureRuleApplySpec(a, { rounds, unit, source })
    : conditionApplySpec(a.condition, { rounds, unit, source });
  // An effect that lasts UNTIL THE TARGET ESCAPES - Silk Production's web,
  // "entangling them until they succeed at a DEX Save" (Apply Effect to Target
  // wiring, RULED 2026-09-26 by Matt). The entry carries a hold with that
  // escape and no damage, so the round card offers the save on their turn and
  // a pass removes the entry, and with it the condition.
  if (a.escape)
  {
    spec.hold = { escape: a.escape };
    spec.perRound = true;
    // The escape IS the printed end, so the no-printed-end sentence goes.
    spec.text = `${spec.text.replace(` <b>${NO_PRINTED_END}</b>`, "")} Lasts until ${anAbility(a.escape.ability)} `
      + `save to ${a.escape.by} on their turn.`;
  }
  return spec;
}

/**
 * Post the card from a saves list directly - for a source whose saves live
 * on a roster row rather than an Item flag (Bluescreen Dagger, 2026-09-22).
 * postCompelledSave above is this with the Item's flags read out.
 */
/**
 * The damage types a save decides and NOTHING ELSE - Breathing and
 * Suffocation, RULED 2026-09-27 (Matt): "the save is superfluous since
 * nothing will happen, so if we can save the players a click we should".
 * Null when a failure would do anything besides typed HP damage: a hold that
 * drains or takes an ability, a named wound, a ration, a board entry, a death,
 * armour, anything the card applies. Exported for the offline test.
 */
export function onlyDamageTypesOf(s, applies = [])
{
  const f = s?.onFail;
  if (!f || applies?.length || s.ability === "morale") return null;
  const other = Object.keys(f).filter(k => k !== "hold" && k !== "damage");
  if (other.length) return null;
  const types = [];
  if (f.hold)
  {
    if (!f.hold.dice || f.hold.loss || f.hold.drain || !f.hold.damageTypes?.length) return null;
    types.push(...f.hold.damageTypes);
  }
  if (f.damage)
  {
    if (!f.damage.type) return null;
    types.push(f.damage.type);
  }
  return types.length ? [...new Set(types)] : null;
}

/** The immunity rows sparing this saver the save, or null. */
export function saveSpared(actor, s, applies = [])
{
  return actor ? sparedBreathing(actor, onlyDamageTypesOf(s, applies)) : null;
}

/** "immune to its drowning (Gills: ...)" - the card's and the notice's words. */
function sparedWords(rows)
{
  const kinds = [...new Set(rows.map(r => r.attack))].join(" and ");
  return `immune to its ${kinds} (${rows.map(r => r.note).join("; ")})`;
}

export async function postSaveCard(actor, source, saves, conditions = [], { saver = null, token = null, applies = [] } = {})
{
  if (!saves?.length) return null;
  // What a FAILED roll puts on the saver's board (2026-09-24). Its conditions
  // are also the ones the roll is against, so Bulbous Eyes and Cyclops see a
  // save against Blind without every caller listing Blind twice.
  applies = (applies ?? []).filter(Boolean);
  conditions = [...new Set([...(conditions ?? []), ...applies.map(a => a.condition).filter(Boolean)])];
  // AN EXPLICIT SAVER, added 2026-09-22 for the Wounds table's hp-0 row. Every
  // other route asks whoever is TARGETED to save; a character knocked out by
  // their own HP loss is the saver, and nobody has targeted them. Passing the
  // actor names them on the card and sends the roll to their sheet, rather
  // than to whichever token the clicker happens to be pointing at.
  // `token` names one target of several - see postSaveCardsToTargets.
  const target = saver ? null : (token ?? Array.from(game.user?.targets ?? [])[0] ?? null);
  // NO POSTER AT ALL is allowed (Trap Resolution, RULED 2026-09-26 by Matt): a
  // rolled vault hazard has no actor behind it, so the card is posted in the
  // hazard's own name. Nothing a trap declares needs a poster - no opposed
  // save, no drain back to whoever posted it.
  const spec = {
    source,
    posterName: actor?.name ?? source,
    // Who posted it, for a failure that feeds back to them - Leeching Spores
    // heal the Mycomorph by the damage dealt (2026-09-25).
    posterUuid: actor?.uuid ?? null,
    // A save limited to some creature types (Creedspeaker's Command, synthetic
    // only) is marked unaffected when the target is known and is none of them.
    saves: saves.map(s => ({ ...s,
      ...(s.opposed && actor ? opposedTarget(actor, s.ability) : {}),
      ...(s.targets?.length && target?.actor && !hasAnyCreatureType(target.actor, s.targets)
        ? { unaffected: true } : {}),
      // A known saver immune to all the save could do (Breathing and
      // Suffocation, 2026-09-27) gets no button - the rows say why.
      ...(() => { const rows = saveSpared(saver ?? target?.actor, s, applies);
                  return rows ? { spared: sparedWords(rows) } : {}; })() })),
    conditions,
    ...(applies.length ? { applies } : {}),
    targetUuid: saver?.uuid ?? target?.document?.uuid ?? null,
    targetName: saver?.name ?? target?.name ?? null,
    target: SAVE_TARGET,
  };
  // AN UNAFFECTED TARGET GETS NOTHING (RULED 2026-09-27, Matt, on the Ghoul's
  // Agony): "X is not biological and is unaffected" told a table what the
  // ability does before it had done it to anyone - the Rustacean ruling. So a
  // save the known target's type rules out is dropped, and a card left with
  // none is not posted at all. compelledSaveCard still renders the old line
  // for a card posted before this ruling.
  spec.saves = spec.saves.filter(s => !s.unaffected);
  if (!spec.saves.length) return null;
  return ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : { alias: source },
    content: `<div class="vaarn-compelled-save-card"></div>`,
    flags: { [SCOPE]: { [CARD_FLAG]: spec } },
  });
}

/**
 * OPPOSED SAVES (Saving Throws.md), RULED 2026-09-22 (Matt): a save that
 * declares `opposed` is rolled against 10 + the POSTER's score in the same
 * ability - the Fleshwarp's STR for its STR Graft - instead of 15. Read when
 * the card is posted and stored on that save, so the card and the roll agree
 * even if the poster's score changes afterwards. The number is ambush.js's,
 * which already works out an opposed target this way from a creature's DEX.
 */
export function opposedTarget(poster, ability)
{
  const bonus = abilityBonus(poster, ability);
  return { target: OPPOSED_BASE + bonus, opposedBonus: bonus };
}

/**
 * THE TOX ROUTE (2026-09-19, RULED by Matt on this row). The TOX notation:
 * "Biological creatures hit by this weapon must CON Save vs a toxin die". So a
 * TOX weapon that HITS a Biological target posts this card for that target,
 * one card per target hit, and it is the first route on which the card APPLIES
 * something: a failed save raises the target's Toxin Die, never lowering it
 * (raisedToxinDie, the book's Multiple Sources rule). The save is Toxin Die
 * (TOX)'s own - CON vs 10 + TD size, ADV and immunity from toxinModifiers.
 *
 * NOT ASKED, and the caller does not post: a non-Biological target, and one
 * toxinModifiers calls immune (Synthetic - a creature can be both). The HP
 * damage is untouched: the die is still rolled as damage (Matt, 2026-09-19).
 */
export async function postToxSave(actor, item, targetToken, die, { saver = null } = {})
{
  // AN EXPLICIT SAVER (Bloomboon Growth, 2026-09-24): a Toxic Fruit's eater
  // is the one who saves, and nobody has targeted them - postSaveCard's shape.
  const spec = {
    source: item.name,
    // No poster for a vault hazard (Trap Resolution, 2026-09-26), as postSaveCard.
    posterName: actor?.name ?? item.name,
    // `targets` so an open card (postToxSaves, nothing targeted) refuses a
    // non-Biological roller, as the notation limits it; a weapon hit has
    // already been filtered by toxSaveApplies before it gets here.
    saves: [{ ability: "con", mode: "resist", vs: `a ${die} toxin die`, targets: ["biological"] }],
    conditions: [],
    tox: { die },
    targetUuid: saver?.uuid ?? targetToken?.document?.uuid ?? null,
    targetName: saver?.name ?? targetToken?.name ?? null,
    target: toxSaveTarget(die),
  };
  return ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : { alias: item.name },
    content: `<div class="vaarn-compelled-save-card"></div>`,
    flags: { [SCOPE]: { [CARD_FLAG]: spec } },
  });
}

/**
 * ONE CARD PER TARGET, for an effect that reaches several creatures at once -
 * a pollen cloud, a spore release, Glittercough's glitter (2026-09-22). A card
 * holds one roll per save, so a shared card would stop at its first saver.
 * The TOX route already posts one card per target hit; this is that shape for
 * the other routes. Nothing targeted posts one open card, which resolves to
 * whoever the clicker targets, as a single-target card always has.
 */
export async function postSaveCardsToTargets(actor, source, saves, conditions = [], applies = [])
{
  const tokens = Array.from(game.user?.targets ?? []);
  if (tokens.length < 2) return [await postSaveCard(actor, source, saves, conditions, { applies })];
  const out = [];
  for (const token of tokens) out.push(await postSaveCard(actor, source, saves, conditions, { token, applies }));
  return out;
}

/**
 * The TOX card for a source that is not a weapon hit - Mord-Red's Grail's
 * poison, a Mycomorph's Toxic Spores (2026-09-22, RULED by Matt: the TOX card,
 * so a failed save raises the Toxin Die). One card per targeted token that
 * toxSaveApplies admits; nothing targeted posts one open card, and the roll
 * checks the Biological limit against whoever rolls it.
 */
export async function postToxSaves(actor, source, die)
{
  const tokens = Array.from(game.user?.targets ?? []);
  if (!tokens.length) return [await postToxSave(actor, { name: source }, null, die)];
  const out = [];
  for (const token of tokens)
    if (toxSaveApplies(token.actor)) out.push(await postToxSave(actor, { name: source }, token, die));
  return out;
}

/** Whether a TOX hit on this actor asks for the save at all. */
export function toxSaveApplies(targetActor)
{
  if(!targetActor?.system?.creatureTypes?.biological) return false;
  return !toxinModifiers(targetActor).immune;
}

/** The card line for an ability loss a failed save applied. */
function abilityLossLine(actor, loss, amount)
{
  const label = String(loss.ability).toUpperCase();
  const total = Number(actor.system?.abilities?.[loss.ability]?.woundDamage ?? 0) + amount;
  return `<b>${actor.name}</b> takes <b>${amount} ${label} damage</b> (${label} wound damage total ${total}).`;
}

/** "synthetic", or "synthetic or fungal", for a card or warning line. */
function typeList(types)
{
  return (types ?? []).join(" or ");
}

/** Every roll recorded against a card, read back out of the log. */
export function rollsFor(cardId, messages = null)
{
  const list = messages ?? game.messages.contents;
  const out = [];
  for (const m of list)
  {
    const s = m.getFlag(SCOPE, SAVE_FLAG);
    if (s?.cardId === cardId) out.push(s);
  }
  return out;
}

/**
 * The card body, rebuilt from state on every render — the affliction card's
 * shape, so a roll landing on any client updates the card for everyone.
 */
export function compelledSaveCard(spec, rolls)
{
  const who = spec.targetName ? `<b>${spec.targetName}</b>` : "the target";
  const blocks = spec.saves.map((s, i) =>
  {
    const done = rolls.find(r => r.index === i);
    const vs = s.target ?? spec.target;
    const opposed = s.opposed
      ? ` Roll over <b>${vs}</b> (10 + ${spec.posterName}'s ${String(s.ability).toUpperCase()} ${s.opposedBonus}).` : "";
    // A Save a gambit's forgone damage denied (2026-09-24) is not one the
    // target must make; the card says what it would have been (Group 372).
    const line = s.denied
      ? `<p><b>No Save allowed:</b> the attacker forgoes damage, so ${who} does not roll the ${saveSentence(s)}.</p>`
      : `<p>${who} must <b>${saveSentence(s)}</b>.${opposed}</p>`;
    if (s.unaffected)
      return `<p>${who} is not ${typeList(s.targets)} and is <b>unaffected</b> by ${saveSentence(s)}.</p>`;
    if (s.spared)
      return `<p>${who} does not roll the ${saveSentence(s)} - <b>${s.spared}</b>.</p>`;
    if (!done)
      return line + `<button type="button" class="vaarn-compelled-save-roll" data-index="${i}">`
        + (s.denied ? `Apply — no Save allowed` : `Roll the ${String(s.ability).toUpperCase()} save`) + `</button>`;
    const note = sourceNote(done);
    const tox = done.toxOutcome ? `<p>${done.toxOutcome}</p>` : "";
    const lost = done.abilityOutcome ? `<p>${done.abilityOutcome}</p>` : "";
    const started = done.entryOutcome ? `<p>${done.entryOutcome}</p>` : "";
    const ate = done.rationOutcome ? `<p>${done.rationOutcome}</p>` : "";
    const struck = done.conditionOutcome ? `<p>${done.conditionOutcome}</p>` : "";
    const died = done.deathOutcome ? `<p>${done.deathOutcome}</p>` : "";
    const armour = done.armourOutcome ? `<p>${done.armourOutcome}</p>` : "";
    const hurt = done.damageOutcome ? `<p>${done.damageOutcome}</p>` : "";
    const rolled = done.forced
      ? `<p><b>${done.actorName}</b> ${done.forced} — <b>${s.denied ? "the gambit lands" : done.passed ? "passed" : "failed"}</b>.</p>`
      : `<p><b>${done.actorName}</b> rolled <b>${done.total}</b> vs ${vs} — `
        + `<b>${done.passed ? "passed" : "failed"}</b>.${note ? " " + note : ""}</p>`;
    return line + rolled + tox + lost + started + ate + struck + died + armour + hurt;
  });
  // A card with no poster is the source itself - a vault hazard (Trap
  // Resolution) - and "the Laser Grid Trap uses Laser Grid Trap" says nothing.
  const head = spec.posterUuid || spec.posterName !== spec.source
    ? `<b>${spec.posterName}</b> uses <b>${spec.source}</b>.` : `<b>${spec.source}</b>!`;
  return `<div class="vaarn-compelled-save"><p>${head}</p>`
    + blocks.join("") + `</div>`;
}

/** Roll save `index` of a card for its target. */
export async function rollCompelledSave(message, index)
{
  const spec = message.getFlag(SCOPE, CARD_FLAG);
  const s = spec?.saves?.[index];
  if (!s) return null;
  if (rollsFor(message.id).some(r => r.index === index)) return null;   // already rolled

  const actor = await resolveApplyTarget(spec.targetUuid, `${spec.source} — ${saveSentence(s)}`);
  if (!actor) return null;
  if (!mayRollFor(actor))
  {
    ui.notifications.warn(`You do not control ${actor.name}.`);
    return null;
  }
  // The card may have been posted with no target, so the creature-type limit
  // is checked again against whoever is rolling.
  // Told to the Referee alone (RULED 2026-09-27, Matt): a player learns
  // nothing about the ability from a save their character is not asked.
  if (s.targets?.length && !hasAnyCreatureType(actor, s.targets))
  {
    if (game.user?.isGM) ui.notifications.warn(`${actor.name} is not ${typeList(s.targets)} and is unaffected.`);
    return null;
  }
  // The same for an immunity: a card posted with no target is checked again
  // against whoever rolls it (Breathing and Suffocation, 2026-09-27).
  const spared = saveSpared(actor, s, spec.applies ?? []);
  if (spared)
  {
    ui.notifications.info(`${actor.name} need not roll - ${sparedWords(spared)}.`);
    return null;
  }

  // The TOX route's modifiers are Toxin Die (TOX)'s, and an actor who became
  // immune after the card was posted (a Cyberliver fitted, say) is refused
  // here rather than rolled.
  const tox = spec.tox?.die ?? null;
  let mods = conditionSaveModifiers(actor, spec.conditions ?? []);
  // The board's DIS joins the card's own, so the card's note names it too
  // (rollCardSave adds it as well, for cards that do not come through here).
  const boardDis = saveDisSources(actor, s.ability);
  if (tox)
  {
    const tm = toxinModifiers(actor);
    if (tm.immune)
    {
      ui.notifications.warn(`${actor.name} is immune to TOX — ${tm.sources.join(", ")}.`);
      return null;
    }
    mods = { advSources: tm.advantage ? tm.sources : [], disSources: [] };
  }
  mods = { ...mods, disSources: [...new Set([...(mods.disSources ?? []), ...boardDis])] };
  const held = actor.system?.toxinDie?.die ?? TOXIN_CURED;
  const next = tox ? raisedToxinDie(held, tox) : null;

  // A save whose FAILURE is an ability loss - Bluescreen Dagger's d20 EGO
  // (Ability Damage wiring, 2026-09-22, RULED by Matt: the save decides whether
  // it lands, so there is no attack roll and no Referee click). Rolled now so
  // the figure rides the same flag write as the save; applied only on a fail.
  // A failure that starts a timed effect - the Wounds table's "CON Save vs
  // unconscious for d6 rounds" (2026-09-22). The span is rolled HERE, with the
  // save, for the reason the board's own dialog rolls a die at activation: the
  // board holds an absolute expiry, not a formula.
  const entry = s.onFail?.entry ?? null;
  const loss = s.onFail?.abilityDamage ?? null;
  // A failure that EATS A RATION - the Faminebearer's "must EGO Save or spend
  // the next combat round eating a ration" (Travel and Rations, RULED
  // 2026-09-23 by Matt: the failed save is what consumes it). Which Item is
  // decided now, plain ration first and with the saver's own kinds, so the
  // card line can ride the same flag write as the save; spent only on a fail.
  const eats = s.onFail?.eatsRation === "water" ? WATER_RATION : s.onFail?.eatsRation === "food" ? FOOD_RATION : null;
  const eatenKind = eats ? rationKindsFor(actor, eats).find(k => rationTotal(actor, k) > 0) ?? null : null;
  const lossRoll = loss ? new Roll(loss.dice ?? String(loss.flat)) : null;
  if (lossRoll) await lossRoll.evaluate();
  // A failure that deals HP DAMAGE - "DEX Save vs 3d8 damage" (Failed-Save
  // Consequence, RULED 2026-09-25 by Matt). Rolled now, with the save, and
  // worked through the damage table for this saver, so the card line and the
  // HP write agree; dealt only on a fail.
  const hpDamage = s.onFail?.damage ? await failDamageFor(actor, s.onFail.damage, spec.source) : null;
  // What the source puts on a saver who fails (2026-09-24, RULED by Matt).
  // Spans rolled now, with the save, so the card line and the board agree.
  // Each carries the poster as its source, for the round card's turn tag
  // (Turn-Timed Round Card, RULED 2026-09-26 by Matt).
  const poster = spec.posterUuid && spec.applies?.length ? await fromUuid(spec.posterUuid) : null;
  const applySpecs = (await Promise.all((spec.applies ?? []).map(a => declaredApplySpec(a, spec.source))))
    .filter(Boolean).map(a => ({ ...a, ...sourceOf(poster) }));
  const failLines = r => r.verdict.passed ? {} : {
    ...(applySpecs.length ? { conditionOutcome: applySpecs.map(a => appliedLine(actor, a)).join(" ") } : {}),
    ...(s.onFail?.death ? { deathOutcome: deathLine(actor, spec.source, s) } : {}),
    ...(s.onFail?.armourLoss ? { armourOutcome: armourLine(actor, s.onFail.armourLoss) } : {}),
    ...(hpDamage ? { damageOutcome: hpDamage.line } : {}),
  };

  // A MORALE SAVE (Agonising, 2026-09-24): d20 + ML, the sheet's Morale roll
  // made from a card. The textual modes decide it without a die, as the sheet
  // does; the Referee's-call mode rolls nothing and leaves the card open.
  // A SAVE DENIED by a gambit's forgone damage (2026-09-24): the target's
  // owner clicks, nothing is rolled, and it resolves as a failure. The card
  // exists at all only because the attacker's client could not write to the
  // target - see gambit-card.js.
  if (s.denied)
    return forcedSave(message, index, actor, spec, s, false, "has no Save allowed", failLines, applySpecs);

  let bonus = null;
  if (s.ability === "morale")
  {
    const morale = actor.system?.morale ?? {};
    if (morale.mode === "gm")
    {
      ui.notifications.warn(`${actor.name}'s Morale is the Referee's call${morale.note ? ` (${morale.note})` : ""} — resolve it by hand.`);
      return null;
    }
    if (["none", "never", "always"].includes(morale.mode))
    {
      const why = morale.mode === "always" ? "always flees" : morale.mode === "never" ? "never flees" : "has no Morale Save";
      return forcedSave(message, index, actor, spec, s, morale.mode !== "always", why, failLines, applySpecs);
    }
    bonus = Number(morale.value ?? 0);
  }

  const result = await rollCardSave(actor, {
    ability: s.ability,
    label: `${spec.source} — ${saveSentence(s)}`,
    target: s.target ?? spec.target ?? SAVE_TARGET,
    advSources: mods.advSources,
    disSources: mods.disSources,
    bonus,
    flags: r => ({ [SAVE_FLAG]: {
      cardId: message.id, index, actorName: actor.name,
      total: r.total, passed: !!r.verdict.passed, reason: r.verdict.reason,
      advSources: mods.advSources, disSources: mods.disSources,
      ...(tox ? { toxOutcome: toxOutcome(actor.name, held, tox, next, !!r.verdict.passed) } : {}),
      ...(loss && !r.verdict.passed ? { abilityOutcome: abilityLossLine(actor, loss, lossRoll.total) } : {}),
      ...(entry && !r.verdict.passed ? { entryOutcome: `<b>${actor.name}</b> is <b>${entry.name}</b> — on their Active Effects board until it ends.` } : {}),
      ...(eats && !r.verdict.passed ? { rationOutcome: eatenKind
        ? `<b>${actor.name}</b> spends the next combat round eating one <b>${eatenKind}</b>.`
        : `<b>${actor.name}</b> has no ${eats === WATER_RATION ? "water" : "food"} to eat${s.onFail.otherwise ? " - " + s.onFail.otherwise + "." : "."}` } : {}),
      ...failLines(r) } }),
  });

  if (!result.verdict.passed) await applyFailure(actor, spec, s, applySpecs);
  if (hpDamage && !result.verdict.passed) await dealFailDamage(actor, hpDamage, spec, s.onFail.damage);
  if (entry && !result.verdict.passed) await startFailureEntry(actor, spec.source, s);
  // An ONGOING HOLD a failed save starts - the Snare, the Pounce, Envelop
  // (Per-Round Effect Reminder wiring, RULED 2026-09-25 by Matt: "the initial
  // action prompts an immediate save and effect on failure").
  if (s.onFail?.hold && !result.verdict.passed)
  {
    const poster = spec.posterUuid ? await fromUuid(spec.posterUuid) : null;
    await startHold(actor, s.onFail.hold, poster, spec.source);
    const h = s.onFail.hold;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<b>${actor.name}</b> is held by <b>${spec.source}</b> - `
        + `${h.dice ? h.dice + " damage each round" : h.loss ? h.loss.dice + " " + String(h.loss.ability).toUpperCase() + " each round" : (h.effect ?? "held")}; `
        + (h.escape ? `${String(h.escape.ability).toUpperCase()} save to ${h.escape.by} on their turn.`
                    : `until ${h.endsBy ?? "freed"}, when the Referee removes it.`) });
  }
  // A NAMED WOUND a failed save gives - the Grimpet's Latch, the Shriekman's
  // Deafened, Amaranthine Venom (Wound-Table Resolution wiring, RULED
  // 2026-09-25 by Matt). named-wound.js puts it on the Wounds tab with its slot.
  if (s.onFail?.wound && !result.verdict.passed)
    await applyNamedWound(actor, s.onFail.wound, { source: spec.source });
  // A LIMB GRAFTED ON by a failed save - the Fleshwarp's Graft (RULED
  // 2026-09-26 by Matt). The wound above is its slot; grafted-arm.js spawns the
  // limb with no token, binds it to this saver and makes the poster pay a Level.
  if (s.onFail?.graft && !result.verdict.passed)
  {
    const poster = spec.posterUuid ? await fromUuid(spec.posterUuid) : null;
    await graftLimb(actor, poster, s.onFail.graft, spec.source);
  }
  // A RANDOM MUTATION a failed save gives - Generate Monster's Cause Mutation
  // (RULED 2026-10-04 by Matt, "like precedents": rolled on the d100 Mutations
  // table and added at once, as Resurrection and a generated creature add one).
  if (s.onFail?.mutation && !result.verdict.passed)
  {
    const { mutationByRoll, mutationItemData } = await import("../actor/granted-pick.js");
    let roll, entry, guard = 0;
    do { roll = Math.ceil(Math.random() * 100); entry = mutationByRoll(roll); } while (!entry && ++guard < 50);
    if (entry)
    {
      await actor.createEmbeddedDocuments("Item", [mutationItemData(entry)]);
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
        content: `<b>${actor.name}</b> mutates from <b>${spec.source}</b>: <b>${entry.name}</b> (d100 ${roll}). ${entry.effect}` });
    }
  }
  if (eatenKind && !result.verdict.passed) await spendRation(actor, eatenKind);
  if (loss && !result.verdict.passed)
  {
    const key = loss.ability;
    const total = Number(actor.system?.abilities?.[key]?.woundDamage ?? 0) + lossRoll.total;
    await actor.update({ [`system.abilities.${key}.woundDamage`]: total });
  }

  if (tox && !result.verdict.passed && next !== held)
    await actor.update({ "system.toxinDie.die": next, "system.toxinDie.source": spec.source });
  return result;
}

/**
 * The HP damage a failed save would deal this saver, worked out before the
 * roll so its line can ride the save's flag. `dmg` is { dice, type, drainToPoster }.
 * The type defaults to kinetic (Matt, 2026-09-25: a source printing none is
 * kinetic) and goes through the SAME table an attack does - an override
 * (Incorporeal), then the type and condition rows - so a Synth's immunities
 * and a Fungal's halving hold for a save exactly as for a hit. Halving rounds
 * down, the Mauling ruling. Exported for the offline test.
 */
export async function failDamageFor(actor, dmg, source, roll = null)
{
  // A roll already made is shared rather than re-rolled - a trap's damage
  // button rolls once for every target (Trap Resolution, RULED 2026-09-26).
  roll = roll ?? await new Roll(String(dmg.dice)).evaluate();
  const type = dmg.type ?? "kinetic";
  const probe = { name: source, system: { damageTypes: [type] } };
  const override = damageOverride(probe, actor);
  if (override?.immune)
    return { amount: 0, rolled: roll.total, roll,
             line: `<b>${actor.name}</b> is <b>${override.rule}</b> — the ${roll.total} damage does nothing.` };
  const { mult, immune, floor, applied } = resolveDamageInteractions(probe, actor);
  let base = roll.total;
  if (floor) base = Math.min(base, (await new Roll(String(dmg.dice)).evaluate({ minimize: true })).total);
  const amount = immune ? 0 : Math.floor(base * mult);
  const why = applied.map(r => r.note).filter(Boolean);
  const line = immune
    ? `<b>${actor.name}</b> is <b>immune</b> to ${type} damage — the ${roll.total} does nothing.${why.length ? ` (${why.join("; ")})` : ""}`
    : `<b>${actor.name}</b> takes <b>${amount} damage</b> (${dmg.dice} = ${roll.total}${amount !== roll.total ? `, ${why.join("; ")}` : ""}).`;
  return { amount, rolled: roll.total, roll, line };
}

/**
 * Deal it through the sheet's HP funnel (_resolveHPChange), the one every
 * damage path passes, so Wounds, death at 0 and a vehicle's Hull conversion
 * all hold. A `drainToPoster` damage then heals the card's POSTER by what was
 * dealt - Leeching Spores, "You heal HP equal to damage dealt" - capped at
 * their maximum. The saver's client may not own the poster (a player rolling
 * against another player's Mycomorph), so that case is announced for someone
 * who can apply it rather than attempted and refused.
 */
async function dealFailDamage(actor, hpDamage, spec, dmg)
{
  if (hpDamage.amount > 0)
  {
    const hp = Number(actor.system?.health?.value ?? 0);
    await actor.sheet?._resolveHPChange(actor, hp, hp - hpDamage.amount);
  }
  if (!dmg.drainToPoster || !(hpDamage.amount > 0) || !spec.posterUuid) return;
  const poster = await fromUuid(spec.posterUuid);
  const who = poster?.actor ?? poster;
  if (!who) return;
  if (!who.isOwner)
  {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: who }),
      content: `<b>${who.name}</b> heals <b>${hpDamage.amount} HP</b> from <b>${spec.source}</b> — apply it on their sheet.` });
    return;
  }
  const hp = Number(who.system?.health?.value ?? 0);
  const max = Number(who.system?.health?.max ?? hp);
  const healed = Math.max(0, Math.min(max, hp + hpDamage.amount) - hp);
  await who.update({ "system.health.value": hp + healed });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: who }),
    content: `<b>${who.name}</b> heals <b>${healed} HP</b> from <b>${spec.source}</b>${healed < hpDamage.amount ? " (capped at their maximum)" : ""}.` });
}

/**
 * A save settled without a die - a Morale Save the creature's textual mode
 * decides ("Never flees" and no Morale stat hold, "Always flees" breaks), or a
 * Save a gambit's forgone damage denied. The record rides the same flag a
 * rolled save writes, so the card closes the same way.
 */
async function forcedSave(message, index, actor, spec, s, passed, why, failLines, applySpecs)
{
  const r = { verdict: { passed } };
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<b>${spec.source} — ${saveSentence(s)}</b>: ${actor.name} ${why}.`,
    flags: { [SCOPE]: { [SAVE_FLAG]: {
      cardId: message.id, index, actorName: actor.name,
      total: null, forced: why, passed, reason: "mode", advSources: [], disSources: [],
      ...failLines(r) } } },
  });
  if (!passed) await applyFailure(actor, spec, s, applySpecs);
  return r;
}

/**
 * Everything a failed compelled save does that is not a roster-specific
 * outcome above: the declared applications go on the saver's board, a death
 * is dealt with, and a failed MORALE save fires the creature's morale-fail
 * rules (the Conscript's Bomb Collar) exactly as the sheet's Morale roll does.
 */
async function applyFailure(actor, spec, s, applySpecs)
{
  for (const a of applySpecs) await applyEffectToActor(actor, a);
  if (s.onFail?.death) await dealDeath(actor);
  if (s.onFail?.armourLoss) await degradeArmour(actor, s.onFail.armourLoss);
  if (s.ability === "morale")
  {
    const whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    for (const item of moraleFailRules(actor))
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper, content: moraleFailCard(actor, item) });
  }
}

/**
 * The Damage armour gambit's failure (2026-09-24): up to the declared loss off
 * the saver's armour, never below unarmoured. Worked out before the write, from
 * the same numbers degradeArmour reads, so the line rides the save's flag.
 */
export function armourLine(actor, amount)
{
  const effective = Number(actor?.system?.armor?.effective ?? actor?.system?.armor?.value ?? 0);
  const drop = Math.min(amount, Math.max(0, effective - 10));
  return drop > 0
    ? `<b>${actor.name}</b>'s armour is damaged — <b>AV -${drop}</b> (now ${effective - drop}).`
    : `<b>${actor.name}</b> has no armour to damage — AV is already ${effective}, unarmoured.`;
}

/**
 * "X is Blind — for 3 combat rounds." for the card. A named Combat Condition
 * reads as a state; anything else (Empathy Bomb, Soporific Spores) as the
 * source's effect, the Apply card's own wording - Group 370 found "X is
 * Empathy Bomb".
 */
function appliedLine(actor, a)
{
  const esc = a.hold?.escape;
  const span = a.rounds
    ? `for ${a.rounds} ${a.unit === "round" ? "combat round" : a.unit === "turn" ? "Exploration Turn" : a.unit}${a.rounds === 1 ? "" : "s"}`
    : esc ? `until ${anAbility(esc.ability)} save to ${esc.by}`
    // An end the holder chooses - the Ghoul's Agony (2026-09-27).
    : a.endsBy ? `until ${actor.name} ${a.endsBy}`
    : "with no printed end";
  // A DEFINED Combat Condition key, not merely any key: Skunkey's Stench Spray
  // carries disSavesAndAttacks and read "X is Stench Spray" (Group 381).
  const isCondition = (a.applied?.conditions ?? []).some(k => conditionByKey(k));
  const state = isCondition ? `is <b>${a.name}</b>` : `is affected by <b>${a.name}</b>`;
  return `<b>${actor.name}</b> ${state} — on their Active Effects board ${span}.`;
}

/**
 * INSTANT DEATH (Neurotoxic, RULED 2026-09-24 by Matt). THE ONE PLACE A DEATH
 * CHANGES STATE: every other surface is announce-only (fatality.js), and a PC
 * still is - the line is posted and the Referee takes it from there. A
 * creature drops to 0 HP and is marked defeated in the running combat, which
 * is what the Referee would otherwise do by hand the moment the line posted.
 * Immortality Injector holds on both, per its ruling that nothing is fatal.
 */
function deathLine(actor, source, s)
{
  const cause = `failed the ${saveSentence(s)} from <b>${source}</b>`;
  if (suppressesDeath(actor)) return `<b>${actor.name}</b> ${suppressionMsg(cause)}`;
  return `<b>${actor.name}</b> is <b>dead</b> — ${cause}.`;
}

async function dealDeath(actor)
{
  if (suppressesDeath(actor) || actor.type === "character") return;
  await actor.update({ "system.health.value": 0, "system.health.temp": 0 });
  // An unlinked token's actor is its own synthetic document, so a spawned
  // creature is matched by its token first and only a linked one by actor id.
  const combatant = game.combat?.combatants?.find(c => c.actor === actor
    || (actor.isToken ? c.tokenId === actor.token?.id : c.actorId === actor.id));
  if (combatant && !combatant.defeated) await combatant.update({ defeated: true });
}

/**
 * Put the failure's effect on the saver's board, for the span the save
 * declared. Returns the entry, or null when the span cannot be read - which
 * leaves the card's own line as the record rather than inventing a duration.
 */
async function startFailureEntry(actor, source, save)
{
  const spec = save.onFail.entry;
  const span = save.span ?? null;
  const amount = span ? (await new Roll(String(span.amount)).evaluate()).total : null;
  if (!amount) return null;
  return addEntry(actor, {
    name: spec.name,
    text: `${spec.text} From <b>${source}</b>.`,
    ...expiryFor({ amount, unit: span.unit, now: game.time?.worldTime ?? 0, round: game.combat?.round ?? null }),
  });
}

/** "an EGO", "a DEX" - the article follows the capitalised ability. */
function anAbility(ability)
{
  const up = String(ability).toUpperCase();
  return `${/^[AEIOU]/.test(up) ? "an" : "a"} ${up}`;
}

/** The line the card shows under a TOX save, from the rule's point of view. */
function toxOutcome(name, held, incoming, next, passed)
{
  if (passed) return `The toxin does not take hold.`;
  if (next !== held)
    return `<b>${name}</b>'s Toxin Die is now <b>${next}</b>${held ? ` (was ${held})` : ""} — roll it each round before acting.`;
  return `<b>${name}</b> already holds a <b>${held}</b> Toxin Die, no smaller than the ${incoming}, so it does not change.`;
}

export function registerCompelledSaveCardButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, CARD_FLAG);
    if (!spec) return;
    html.find(".vaarn-compelled-save-card").replaceWith(compelledSaveCard(spec, rollsFor(message.id)));
    html.find(".vaarn-compelled-save-roll").click(ev =>
      rollCompelledSave(message, Number(ev.currentTarget.dataset.index)));
  });
  // A roll landing re-renders its OWN card, never the message that fired the
  // hook — see day-start.js for what refreshing that one does.
  Hooks.on("createChatMessage", message =>
  {
    const s = message.getFlag(SCOPE, SAVE_FLAG);
    if (!s?.cardId) return;
    const card = game.messages.get(s.cardId);
    if (card && card.id !== message.id) ui.chat?.updateMessage?.(card);
  });
}
