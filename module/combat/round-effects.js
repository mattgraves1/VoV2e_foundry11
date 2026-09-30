/**
 * Per-Round Effect Reminder and Round-Duration Expiry, in one file because
 * they are one hook with two cadences and splitting them would mean two
 * subscriptions racing to write the same flag.
 *
 * THE PROBLEM, in Matt's words (2026-09-08): the hard part about Vaarn's
 * per-round rules is REMEMBERING to apply them, not calculating them. That
 * reframe is what makes a single mechanism possible. The atoms behind these
 * two rows split across at least five incompatible shapes — an HP change, a
 * save every round, ability drain, spawning actors, a decision scheduled for
 * later — so FIRING them is five mechanisms and a per-creature wiring pass.
 * A reminder never interprets the rule text, so one implementation serves all
 * of them. Nothing here rolls damage or applies a condition; the GM does.
 *
 * WHAT THIS MEANS FOR A ROW MARKED BUILT: it means the reminder fires, not
 * that the effect lands. Both mechanism rows say so explicitly.
 *
 * The rulings this implements, all Matt's, all 2026-09-08:
 *
 * - The toggle lives on the sheet of whoever OWNS the rule, never on the
 *   victim. A monster rule that afflicts a PC still toggles on the monster
 *   and names its target in the note, because creating an item on every
 *   victim drags back exactly the per-shape wiring this design avoids.
 * - One consolidated message per round, not one per toggle. Refined here out
 *   of necessity: visibility is per-origin, so the most this can collapse to
 *   is TWO cards — one GM-whispered for creature-owned effects, one public
 *   for PC-owned ones. A single card cannot be both.
 * - Visibility follows ORIGIN, not who is affected. Every monster-initiated
 *   effect is GM-only, because a player may be subject to something without
 *   being aware of its source. Only PC-sheet effects are public.
 * - Activation takes ONE number plus a free-text target note. No mode
 *   selector: Kinetic Ward's "[INT] rounds for one entity, or [INT] entities
 *   for one round" is the same counter with a different number typed in.
 *   The note is echoed and never parsed.
 * - A duration ends on a ROUND boundary: the rest of the round it started in,
 *   plus that many full rounds. This SUPERSEDED an earlier owner-turn ruling.
 *   Round boundaries win on robustness, not just on effort — Foundry never
 *   fires a turn event for an actor who is not a combatant, so owner-turn
 *   expiry would strand any effect whose owner was never added to the
 *   tracker. knave.js's Berserker cleanup already documents that same hazard.
 *
 * STORAGE MOVED TO THE ACTOR, 2026-09-08. This file used to hold its state in
 * a flag on the ITEM. Matt's catch, while scoping Timed Condition Duration: an
 * elixir is CONSUMED, and _onGenericItemUse deletes it, so a flag written
 * there dies with the item. This mechanism has therefore never been reachable
 * for a consumable — a gap that survived Groups 101-103 intact because all 38
 * atom rows ever proven against it are Bestiary creature rules, which live on
 * npc sheets and are never deleted.
 *
 * So the entries now live on the actor, in time/effect-board.js, and this file
 * became a CONSUMER of that register rather than the owner of its own. What
 * did not change is everything the rulings below describe: the reminder still
 * fires per round, still consolidates, still splits by origin, and still
 * expires on a round boundary. The board is where the state sits and where a
 * reader looks; this is still what happens when a round turns.
 *
 * WHY AN ABSOLUTE ROUND RATHER THAN A COUNTDOWN. `expiresAtRound` is written
 * once at activation and never decremented. A countdown is corrupted by a
 * missed or doubled hook and there is no way to tell afterwards; an absolute
 * number cannot be. It also hands over the elapsed count for free, which
 * Invert Gravity needs — Matt ruled that one reports how many rounds the
 * target fell and rolls nothing, because the falling damage depends on
 * whether the room has a ceiling, and no field on any sheet knows that.
 */

import { magneticFieldHtml } from "./metal-cards.js";
import { entriesOf, setEntries, addEntry, removeEntry, collectAll, sweepExpired,
         expiryFor, formatSpan, removeActorAndTokens, removeGrantedItem, grantedItemIdsOf, endedLabel } from "../time/effect-board.js";
// isActivity and isRecurrence were imported here for clearAll's survival test
// until 2026-09-20. The inverted predicate names no entry kind at all, so the
// imports went with the list — and their absence is the point: a new entry
// shape no longer has to change this file to be safe from the sweep.

/**
 * Wording that says an effect recurs every combat round.
 *
 * THE ONE COPY, exported 2026-09-08. It was inline in knave.js's
 * canRoundRemind, and tools/bestiary-drift.mjs and gen-bestiary-rules.mjs
 * each needed the same test — three copies of a regex that decides whether a
 * toggle appears at all, drifting silently. The tools import this rather than
 * restating it, so widening the pattern here widens it everywhere at once.
 *
 * WIDENED 2026-09-08, and the miss is worth recording because the original
 * read as thorough. It listed "per round", "each round" and "per combat
 * round" — but NOT "each combat round", which is the book's most common
 * phrasing of all, nor "every round", "the round" or "its combat round". So
 * seven real per-round rules got no toggle, including the Faa Sniper's
 * Headshot and three separate Regeneration rules, and the gap was invisible
 * because a missing toggle looks exactly like a rule that is not per-round.
 * Found by cross-checking the atom rows against the rules the test matched,
 * not by reading the pattern — which had been read several times.
 *
 * Deliberately generous. A false positive is a toggle the GM ignores; a false
 * negative is a rule they forget, which is the entire failure this mechanism
 * exists to prevent.
 *
 * WIDENED AGAIN 2026-09-08, and this miss was narrower and sharper than the
 * first one: the count-of-rounds clause required the literal word "for". The
 * book writes a fixed duration at least four ways and only one of them says
 * "for" — so of the book's three "Blinding <something>" abilities, all three
 * inflicting Blindness for a rolled number of rounds, exactly ONE matched.
 * Lambent Lynx's "DEX Save vs d6 rounds OF Blindness" got a toggle through
 * the `rounds? of` clause; Xeric Triffid's "CON save vs Blindness, d6 rounds"
 * and the Quantum Daemon's "DEX save vs d4 rounds Blindness" got nothing.
 * Same rule, same duration, three phrasings, and the difference was a comma.
 *
 * So the preposition is dropped entirely: any count of rounds now counts.
 * MEASURED before changing it, across 382 bestiary entries and 5685 PC-side
 * strings — 4 gain a match and every one is a real duration (Xeric Triffid,
 * the Quantum Daemon's Blinding Spit, Lazarus Guard reviving after d3 rounds,
 * a Hegemony Ordinator's reinforcements arriving within d10). No false
 * positive, which is more than the generosity rule above even asks for.
 *
 * The two RULES in that four gain a match and nothing else, deliberately:
 * a rule becomes an Item only when its stored `perRound` marker is set, and
 * that marker is hand-checked data, not this test run at load. Regenerating
 * it is a bestiary-data.js change and belongs to Creature Rule Reminder
 * Surface, which is where it is filed.
 *
 * THE BARE-COUNT CLAUSE IS GONE AGAIN 2026-09-20, which reverses the paragraph
 * above for a reason that did not exist when it was written. Its argument was
 * that the four matches it gained are all real durations and that no false
 * positive appeared. Both were true and both still are. But A DURATION IS NOT
 * A TICK, and this constant answers only the tick question. While parseDuration
 * also ran, the conflation was harmless — anything with a countable span got a
 * control by one route or the other. Elixir Duration as Roster Data removed the
 * parse, and a bare "<n> rounds" became the only thing still granting a control
 * to Items whose roster had explicitly declared they have no span of their own.
 *
 * GLITTERCOUGH TONIC IS THE CASE. "Forcing targets to DEX Save vs Blindness for
 * 4 rounds": the drinker's own effect has no stated end, the four rounds belong
 * to whoever was blinded, and the roster declares null accordingly. It kept an
 * hourglass anyway, on the drinker's sheet, for an effect that is neither
 * theirs nor repeating.
 *
 * MEASURED FIRST, as the paragraph above also insisted. Of 175 texts matching
 * this constant, 142 match genuine tick wording too and are untouched. 33 match
 * only through the bare count, and 4 of those keep their control regardless
 * because they now DECLARE a span — Phase Cape, Knocked Out, Update Required,
 * and Lazarus Guard's Resurrection, which was one of the original four this
 * clause was added for. The remaining 12 lose it, and every one is a target's
 * span or an arrival: Glittercough, the three Mycomorph spores, Dopplegun,
 * Stasis Bomb, both Gas Glands, Vitality Sensor, and Blinding Pelt and Blinding
 * Spit on both the Bestiary and the Pets.
 *
 * NO REMINDER ITEM DISAPPEARS, which was the real risk: bestiary-build.js gates
 * ability Items on this constant too. Checked across every Bestiary and Pets
 * ability — zero lost. The ones matching only the bare count all carry save or
 * condition effects and qualify by that route instead.
 */
// "start of a (combat) round" ADDED 2026-09-20, Per-Round Flag Coverage. The
// Xanthous Mycomorph's Regenerative Mass reads "Regains HP equal to LVL at the
// start of a combat round", and the article was the whole miss: the Regenerator
// says "its combat round" and the Fleshwarp "each round", and both were armed.
// The PHRASE, not a bare "a round" - the eight other unflagged creature rules
// that mention a round are one-off spans ("a whole combat round", "one combat
// round", "the next combat round") and a loose article would arm several.
// Measured the same day: no other text under module/ contains the phrase.
export const PER_ROUND_WORDING =
  /(?:per|each|every|the|its|their) (?:combat )?rounds?\b|start of a (?:combat )?round\b|rounds? of\b|for \[INT\][^.]{0,20}rounds?\b/i;

/** Flag scope, shared with the board. */
const SCOPE = "vaarn";

/**
 * The board entry this item started, or null.
 *
 * Keyed on `itemId` rather than held by the item, which is the whole point of
 * the move: the entry outlives the item. A consumed elixir leaves its entry
 * behind and this lookup then correctly finds nothing on the item — but the
 * board still shows it, and it still expires on time.
 */
export function roundEffectOf(item)
{
  const actor = item?.parent;
  if (!actor) return null;
  return entriesOf(actor).find(e => e.itemId === item.id) ?? null;
}

/** True if this item has started something that is still running. */
export function isRoundEffectActive(item)
{
  return !!roundEffectOf(item);
}

/**
 * The first dice expression in an item's own text, or null.
 *
 * A CONVENIENCE, NOT A CONTRACT. It decides only whether the card offers a
 * roll button, so a miss costs the GM one manual roll and a false hit costs
 * one ignored button. Deliberately not used for anything that would be wrong
 * rather than merely absent.
 *
 * Two shapes get no button on purpose, and neither is a failure of this
 * function: a rule whose per-round event is a SAVE (the players roll those,
 * and a button on a GM-whispered card cannot), and a rule whose amount scales
 * with board state — the Nightmare Herald heals d6 per sleeping creature
 * nearby, and "d6" alone would be a wrong answer rather than a partial one.
 */
export function formulaFrom(item)
{
  const text = `${item?.system?.description ?? ""} ${item?.system?.effect ?? ""}`;
  if (/\bsave\b/i.test(text) && !/\bdamage\b/i.test(text)) return null;
  const m = text.match(/\b(\d*d\d+(?:\s*\+\s*\d*d?\d+)*)\b/i);
  return m ? m[1].replace(/\s+/g, "") : null;
}

/**
 * Turn a reminder on. `rounds` is the single number from activation; leave it
 * null or 0 for an effect that recurs with no stated ending, which is most of
 * the creature rules and every Toxin Die.
 *
 * `expiresAtRound = round + rounds + 1` is the "rest of this round plus that
 * many full rounds" reading. Activating in round 1 with a duration of 1 ends
 * at the start of round 3, having covered the remainder of round 1 and the
 * whole of round 2.
 */
export async function activate(item, { rounds = null, unit = "round", note = "",
                                       perRound = null, clearFlag = null,
                                       applied = null, hpTick = null,
                                       grantedItemId = null, grantedItemIds = [] } = {})
{
  const actor = item?.parent;
  if (!actor) return null;
  // Direct HP Adjustment (2026-09-23): a creature rule carries its HP change
  // as a flag; an elixir's comes from its roster row via the caller. Either
  // way the entry ticks - the button is on the round card or nowhere.
  hpTick = hpTick ?? item.flags?.vaarn?.hpTick ?? null;
  if (hpTick) perRound = true;
  // A per-round spawn (the Brood Mother's Brood, 2026-09-24) rides the rule
  // Item's flag the same way, and ticks for the same reason.
  const spawn = item.flags?.vaarn?.spawn ?? null;
  if (spawn) perRound = true;
  // A per-round rule's SAVE rides to the round card's save button (Multi-
  // Target wiring, RULED 2026-09-25 by Matt): the Gravity Tyrant's Accretion,
  // "Each round, all creatures must DEX Save", and the Magneticrab's field in
  // the same words. One card per targeted token, as the Vortex's. The rule
  // Item's flag is the list saveFlag wrote; a rule declares one save.
  const save = item.flags?.vaarn?.roundSave ? (item.flags.vaarn.save?.[0] ?? null) : null;
  // What an Item declares its span puts on the board - the Ickbulb's scent
  // (To-Hit Resolution Override wiring, 2026-09-25). A caller's resolved
  // deltas win, since those were measured against the actor.
  applied = applied ?? item.flags?.vaarn?.spanApplied ?? null;
  // A save the span's END card offers, and what a success grants - the
  // Godsbreath Star's PSY Save for a new Mystic Gift (Grant-a-Roll on Another
  // Table, RULED 2026-09-26 by Matt).
  const endGrant = item.flags?.vaarn?.endGrant ?? null;
  // A poison the span's end strips from the Item - the Avern Bloom's "only
  // retains its poison for a day" (Toxin Die wiring, RULED 2026-09-26).
  const toxLapses = !!item.flags?.vaarn?.toxLapses;
  // The Magneticrab's field (Metal Item Property Part B, 2026-09-27): the line
  // names who holds metal and who is pulled, read when the card posts.
  const magnetField = !!item.flags?.vaarn?.magnetField;

  const round = game.combat?.round ?? null;
  const now = game.time?.worldTime ?? 0;
  const stamps = expiryFor({ amount: rounds, unit, now, round });

  const entry = await addEntry(actor, {
    name: item.name,
    text: item.system?.description || item.system?.effect || "",
    note,
    itemId: item.id,
    // Whether it TICKS is separate from how long it LASTS: Regeneration Serum
    // ticks each combat round and lasts six Exploration Turns, and a
    // 4-Exploration-Turn AV boost ticks not at all. Caller may state it; the
    // item's own wording is the fallback.
    perRound: perRound === null ? PER_ROUND_WORDING.test(textOf(item)) : !!perRound,
    formula: formulaFrom(item),
    clearFlag,
    // Stateful Effect Application (2026-09-09): the resolved deltas, or null
    // for a reminder that changes no value. Passed through untouched — this
    // function never resolves one, because a multiplier must be evaluated
    // against the actor at the moment of activation and that is the caller's
    // knowledge, not this one's.
    applied,
    hpTick,
    spawn,
    save,
    endGrant,
    toxLapses,
    magnetField,
    // Elixir-Granted Ability Item (2026-09-23): the Item this span times.
    // Passed through to the entry, which is the one place it is read.
    grantedItemId,
    grantedItemIds,
    startTime: now,
    startRound: round,
    ...stamps
  });

  // Allowed with no encounter, but it announces itself — Matt's ruling: he
  // wants to know he still has to create one. The same gate the Berserker
  // sources use, reported rather than enforced. Only for a ROUND-scale span:
  // a 6-Exploration-Turn elixir needs no encounter and warning about one
  // would be noise.
  if (!game.combat && (entry.perRound || unit === "round"))
    ui.notifications.warn(
      `"${item.name}" is set to remind each round, but no combat encounter is active — ` +
      `create one and it will start reporting.`);

  return entry;
}

/** Everything this item's own text says, for the wording tests. */
function textOf(item)
{
  return `${item?.system?.description ?? ""} ${item?.system?.effect ?? ""}`;
}

/** Turn an item's effect off. Removing the entry is what stops it. */
export async function deactivate(item)
{
  const actor = item?.parent;
  if (!actor) return;
  for (const entry of entriesOf(actor).filter(e => e.itemId === item.id))
    await removeEntry(actor, entry.id);
}

/**
 * Every active round effect in the world, split by the visibility its ORIGIN
 * implies. Scans all actors rather than this combat's combatants, for the
 * reason knave.js gives for the Berserker cleanup: activation is gated only
 * on some combat being active, never on the owner being in the tracker, so
 * scoping to combatants would silently skip effects that are genuinely on.
 */
function collectActive()
{
  const gm = [], open = [];
  for (const { actor, entry } of collectAll())
  {
    // Only things that actually DO something each round belong on the card. An
    // entry that merely lasts — a 4-Exploration-Turn AV boost — is on the
    // board and needs no round-by-round reminder, which is exactly the split
    // Matt drew: a healing tick is a die roll every round, an AV boost is
    // nothing between its two boundaries.
    if (!entry.perRound) continue;
    (entry.origin === "npc" ? gm : open).push({ actor, entry });
  }
  return { gm, open };
}

/**
 * One entry's line in the consolidated card.
 *
 * Reads the ENTRY, not the item, so a line still renders for an effect whose
 * item has been consumed — which is the case this whole migration exists for.
 * The name and text were copied at activation for exactly this reason.
 */
function lineFor({ actor, entry }, round)
{
  const elapsed = round - (entry.startRound ?? round);
  const bits = [];
  if (entry.expiresAtRound)
    bits.push(`${Math.max(0, entry.expiresAtRound - round)} round(s) left`);
  else if (elapsed > 0)
    bits.push(`round ${elapsed} of this effect`);
  // A clock-scale span is reported here too, because the card is what a
  // Referee is looking at mid-fight and "and it also runs out in 4
  // Exploration Turns" is the thing they would otherwise have to open the
  // board to see.
  if (Number.isFinite(entry.expiresAtTime))
    bits.push(`${formatSpan(entry.expiresAtTime - (game.time?.worldTime ?? 0),
                            entry.unit ?? "turn", entry.amount)} left`);
  if (entry.note) bits.push(Handlebars.escapeExpression(entry.note));

  // A per-round ability loss gets a button that APPLIES, not merely rolls
  // (Ability Damage pass 3, 2026-09-22); it works once per card.
  // An ESCALATING per-round HP loss - Brain Burster, 2026-09-22. Checked
  // before the two below because it carries no `formula`: its figure is state
  // on the entry, not a die string, and it is the button that advances it.
  // A per-round HP change - Direct HP Adjustment, RULED 2026-09-23 (Matt): a
  // GM-only button that rolls and applies, never an automatic write. First,
  // because it is the most specific thing an entry can declare.
  const button = entry.hpTick
    ? `<button type="button" class="vaarn-round-hp" data-actor-id="${actor.id}" data-entry-id="${entry.id}" ` +
      `data-label="${entry.name}">${hpTickLabel(hpTickNow(entry), actor.name)}</button>`
    // A per-round spawn (Actor Spawning from Bestiary, 2026-09-24): the
    // Brood Mother's Brood. GM-only, rolls the count and spawns beside her.
    : entry.spawn
    ? `<button type="button" class="vaarn-round-spawn" data-actor-id="${actor.id}" data-entry-id="${entry.id}" ` +
      `data-label="${entry.name}">Birth ${entry.spawn.dice} ${entry.spawn.creature}s beside ${actor.name}</button>`
    // A per-round SAVE (Failed-Save Consequence, RULED 2026-09-25, Matt): the
    // Space-Time Vortex. Posts one save card per targeted token; the card
    // deals the damage to each who fails.
    : entry.save
    ? `<button type="button" class="vaarn-round-save" data-actor-id="${actor.id}" data-entry-id="${entry.id}" ` +
      `data-label="${entry.name}">${String(entry.save.ability).toUpperCase()} Save vs ${entry.save.vs} — targeted tokens</button>`
    : entry.escalating
    ? `<button type="button" class="vaarn-round-escalate" data-actor-id="${actor.id}" data-entry-id="${entry.id}" ` +
      `data-amount="${entry.escalating.amount}" data-label="${entry.name}">` +
      `Apply ${entry.escalating.amount} damage (then x${entry.escalating.factor})</button>`
    : entry.abilityDamage && entry.formula
    ? `<button type="button" class="vaarn-round-ability" data-actor-id="${actor.id}" data-entry-id="${entry.id}" ` +
      `data-formula="${entry.formula}" data-ability="${entry.abilityDamage.ability}" data-label="${entry.name}">` +
      `Roll ${entry.formula} ${String(entry.abilityDamage.ability).toUpperCase()}` +
      `${entry.abilityDamage.avPerTick ? ` (+${entry.abilityDamage.avPerTick} AV)` : ""} and apply</button>`
    : entry.formula
    ? `<button type="button" class="vaarn-round-roll" data-actor-id="${actor.id}" ` +
      `data-formula="${entry.formula}" data-label="${entry.name}">Roll ${entry.formula}</button>`
    : "";

  // An ONGOING HOLD's escape save (2026-09-25): the held one's option on
  // their turn, beside the Referee's damage button above.
  // AN END THE HOLDER CHOOSES - the Ghoul's Agony, "lying still neutralises
  // the venom" (RULED 2026-09-27, Matt). The holder's player or the Referee
  // clicks it; it removes the entry.
  const endsBy = entry.endsBy
    ? `<button type="button" class="vaarn-round-endsby" data-actor-id="${actor.id}" data-entry-id="${entry.id}" ` +
      `data-label="${entry.name}">${actor.name} ${entry.endsBy} — ${entry.name} ends</button>`
    : "";
  const esc = entry.hold?.escape;
  const escape = esc
    ? `<button type="button" class="vaarn-round-escape" data-actor-id="${actor.id}" data-entry-id="${entry.id}" ` +
      `data-label="${entry.name}">${actor.name}: ${String(esc.ability).toUpperCase()} save to ${esc.by}</button>`
    : "";

  // Whose turn each half resolves on (Turn-Timed Round Card). An escape-only
  // hold - Silk Production's web - has no first half, so no first tag.
  const lead = entry.hold && !button ? "" : turnTag(turnOwnerOf({ actor, entry }));
  const escTag = esc ? turnTag({ id: actor.id, name: actor.name }) : "";

  return `<li><b>${actor.name} — ${entry.name}</b>` +
         (bits.length ? ` <i>(${bits.join("; ")})</i>` : "") +
         (entry.text ? `<div>${entry.text}</div>` : "") +
         (entry.magnetField ? magneticFieldHtml(actor) : "") +
         lead + button + escTag + escape + endsBy +
         `</li>`;
}

/*
 * TURN-TIMED ROUND CARD, RULED 2026-09-26 (Matt). The card still posts once, at
 * the top of the round, and every button still works at any moment in it; each
 * line now says whose turn it resolves on, so the table resolves it then.
 * Posting each line ON its turn was the first version and was withdrawn: three
 * of the four initiative modes give a whole side one value, so the order inside
 * a side is arbitrary and a card waiting on one combatant's turn arrives only
 * when the GM clicks onto them.
 *
 * Whose turn: a holder's own effect is the holder's; an effect another creature
 * put on the holder is that SOURCE's (hold damage, ability ticks, Brain
 * Burster, anything an Apply card landed); a hold's escape save is the held
 * one's. Burning has no source and so falls to the burning creature, as ruled.
 * An owner who is defeated, or not in the tracker, is still named, with a note:
 * the line stays and the Referee applies it or ends it by hand. A dead holder's
 * hold in particular is never ended automatically - GMs rule Swallow
 * differently.
 */

/** The actor whose turn this entry's first half resolves on: { id, name }. */
export function turnOwnerOf({ actor, entry })
{
  // An effect that turns on what its HOLDER does - the Ghoul's Agony, d6 per
  // combat action and ended by lying still - resolves on the holder's turn,
  // whoever applied it (RULED 2026-09-27, Matt). endsBy marks it.
  if (entry?.endsBy) return { id: actor.id, name: actor.name };
  const id = entry?.sourceActorId;
  if (!id || id === actor.id) return { id: actor.id, name: actor.name };
  return { id, name: game.actors?.get(id)?.name ?? entry.sourceName ?? "its source" };
}

/**
 * The owner's combatants. Matched on actorId, which an unlinked token's
 * combatant also carries - its synthetic actor shares the base actor's id.
 */
function combatantsOf(ownerId)
{
  return (game.combat?.turns ?? []).filter(c => c.actorId === ownerId);
}

/** "On the Piranha Mole's turn", with a note when that turn will not come. */
export function turnTag(owner)
{
  const cs = combatantsOf(owner.id);
  const name = cs[0]?.name ?? owner.name;
  const note = !cs.length ? " (not in the tracker)"
             : cs.every(c => c.isDefeated) ? " (defeated)" : "";
  return `<div class="vaarn-turn-tag"><i>On ${Handlebars.escapeExpression(name)}'s turn${note}:</i></div>`;
}

/**
 * Where a line sits in tracker order (RULED 2026-09-26, Matt): by the owner of
 * its first half, or the held one for an escape-only hold - the same split
 * lineFor tags by. An owner with no combatant sorts last.
 */
function trackerIndex({ actor, entry })
{
  const firstHalf = entry.hpTick || entry.spawn || entry.save || entry.escalating || entry.formula;
  const owner = entry.hold && !firstHalf ? { id: actor.id } : turnOwnerOf({ actor, entry });
  const i = (game.combat?.turns ?? []).findIndex(c => c.actorId === owner.id);
  return i < 0 ? Infinity : i;
}

/**
 * The HP tick as it stands THIS click - the Chernobog's Black Cloud
 * (Multi-Target wiring, RULED 2026-09-25 by Matt): "2 damage ... The cloud's
 * strength doubles with each subsequent combat round." `factor` multiplies the
 * dice once per application already made, and the count of those is STATE on
 * the entry (`hpTickCount`), for the reason startEscalatingTick gives: a
 * figure that changes because it was applied cannot be a constant formula.
 * A tick with no factor is returned unchanged.
 */
export function hpTickNow(entry)
{
  const spec = entry?.hpTick;
  if (!spec?.factor) return spec;
  const mult = Math.pow(Number(spec.factor), Number(entry.hpTickCount) || 0);
  if (mult === 1) return spec;
  const dice = /^\d+$/.test(String(spec.dice)) ? String(Number(spec.dice) * mult) : `(${spec.dice})*${mult}`;
  return { ...spec, dice };
}

/**
 * What an HP-tick button says it will do. Exported for the handler's card, so
 * the button and the line it posts cannot describe the change differently.
 * Pass hpTickNow(entry), never entry.hpTick, for a tick that escalates.
 */
export function hpTickLabel(spec, holderName)
{
  if (spec.full) return `Restore ${holderName} to full HP`;
  const per = spec.perCount ? ` per ${spec.perCount}` : "";
  const types = spec.damageTypes?.length ? ` ${spec.damageTypes.join(", ")}` : "";
  const who = spec.to === "targets" ? "the targeted tokens" : holderName;
  // "@lvl" is roll data, not words - Group 316 found it printed raw.
  const amount = spec.dice === "@lvl" ? "HP equal to its Level" : `${spec.dice} HP`;
  return spec.heal
    ? `Heal ${who} ${amount}${per}`
    : `Apply ${spec.dice}${types} damage${per} to ${who}${spec.factor ? ` (then x${spec.factor})` : ""}`;
}

/** Post one card. Whispered to GMs when `gmOnly`, per the origin ruling. */
async function postCard(entries, round, gmOnly, expired)
{
  if (!entries.length && !expired.length) return;
  const parts = [];
  if (entries.length)
    // Tracker order; Array.sort is stable, so ties keep the board's order.
    parts.push(`<p><b>Round ${round} — apply these:</b></p><ul>` +
               [...entries].sort((a, b) => trackerIndex(a) - trackerIndex(b))
                 .map(e => lineFor(e, round)).join("") + `</ul>`);
  if (expired.length)
    parts.push(`<p><b>Ended:</b> ` +
               expired.map(e => endedLabel(e) +
                 (e.entry.startRound != null
                   ? ` (lasted ${round - e.entry.startRound} round(s))` : "")).join("; ") +
               `</p>`);

  await ChatMessage.create({
    content: parts.join(""),
    whisper: gmOnly ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [],
    flags: { [SCOPE]: { roundReminder: true } }
  });
}

/**
 * The round hook. Expiry is evaluated BEFORE the reminder list is built, so
 * an effect that ends this round is announced as ended rather than reminded
 * about and then quietly removed — the ordering matters at the table, where
 * the two readings look identical in the log but mean opposite things.
 */
export async function onRoundChange(round)
{
  // The sweep is the board's, and it evaluates BOTH scales — so a clock-scale
  // effect whose time ran out while the party was mid-fight is reported the
  // moment the next round turns, rather than waiting for someone to advance
  // the clock afterwards.
  const expired = await sweepExpired({ now: game.time?.worldTime ?? 0, round });

  const { gm, open } = collectActive();
  await postCard(gm,   round, true,  expired.filter(e => e.entry.origin === "npc"));
  await postCard(open, round, false, expired.filter(e => e.entry.origin !== "npc"));
}

/**
 * Combat over. Clear what was scoped to the fight, and ONLY that.
 *
 * CHANGED 2026-09-08 and worth stating, because it narrows a ruling. The old
 * rule was "nothing stays toggled on once the encounter ends", which was right
 * when every entry was a per-round reminder. It is wrong now: an entry can
 * carry a clock-scale span, and Regeneration Serum's six Exploration Turns do
 * not stop being true because the fight did. Ending combat is not the passage
 * of six turns.
 *
 * So an entry survives if it has a clock-scale expiry, and is cleared if its
 * only life was the fight — a per-round reminder with no stated ending, or a
 * span counted in rounds. That keeps the original intent, which was that a
 * monster's rule should not linger after the monster.
 *
 * WIDENED AGAIN 2026-09-09, after live testing found the 2026-09-08 version
 * deleting things it had never been meant to touch. "Has a clock expiry" is
 * not the same question as "outlives the fight", and two entry shapes fell in
 * the gap because they carry no expiry of any kind BY DESIGN:
 *
 *   activities   Activity Time Cost accrues toward `required` and stamps
 *                neither expiry, so ending a combat silently destroyed an
 *                effort in progress — an hour of attunement, a brewing
 *                Elixir. That is a bug in the mechanism shipped 2026-09-08
 *                and its own 12-item test pass did not reach it, because
 *                nothing in that group ended a combat.
 *   recurrences  Long-Clock Recurrence has no end date at all, only an exit
 *                condition, so a disease was cured by the end of an unrelated
 *                fight.
 *
 * INVERTED 2026-09-20 (Matt), and this is the change that ends the pattern
 * rather than continuing it. Twice the test was repaired by NAMING the shape
 * that had just been lost, and both times the next shape to carry no expiry by
 * design was lost the same silent way. The sixth regression run found the
 * third round of it — five more entry kinds, every one of them something the
 * book gives no ending:
 *
 *   Deprived              gates blocksHealing at five call sites; its own
 *                         tooltip says the book states no rule for removing it
 *   In Darkness           party-wide, and the Exploration Clock's Search
 *                         action silently came back with it
 *   Entangled             Grimweaver's Web Shot, whose card reads "It stays
 *                         until the Referee clears it"
 *   Blind                 Hegemony Ranger's Smoke Grenade
 *   Permanent Blindness   the failed-save half of Vaarnish Poison 14
 *
 * plus every per-round rule a Referee tracks with the span left blank — the
 * dialog's own placeholder promises "blank = until switched off", and there
 * are five such rules in the Bestiary alone (Psyche Syphon, Snare, Pounce,
 * Oblivion, Black Cloud). That last one is the worst of the set: it is
 * destroyed by the end of the very encounter it was started to track.
 *
 * The old predicate inferred "belongs to the fight" from "has no expiry",
 * which is backwards for anything deliberately endless — and no list of named
 * shapes can fix a test that is the wrong way round. So ask the question
 * positively instead. An entry belongs to the fight exactly when it was given
 * a ROUND COUNT, and expiresAtRound is the only record of that: expiryFor
 * leaves it null unless a real amount was supplied, so a null there means
 * nobody ever said this ends in N rounds. Everything else survives by default,
 * including shapes nobody has invented yet, which is the property the three
 * previous versions each lacked.
 *
 * `unit` cannot stand in for this. It defaults to "round" in activate(), so
 * an Entangled entry carries unit "round" while meaning nothing of the kind.
 */
export function survivesCombatEnd(entry)
{
  // Or it says outright that it lasts the fight (the Fate Invertor, 2026-09-26).
  if (entry?.endsWithCombat) return false;
  return !Number.isFinite(entry?.expiresAtRound);
}

export async function clearAll()
{
  for (const actor of game.actors)
  {
    const keep = [], drop = [];
    for (const entry of entriesOf(actor))
      (survivesCombatEnd(entry) ? keep : drop).push(entry);
    // Healing Field (2026-09-22): an entry that is its actor's whole lifetime
    // takes the actor with it, the same as on expiry and on removal.
    if (drop.some(e => e.removesActor)) await removeActorAndTokens(actor);
    else if (drop.length)
    {
      // Elixir-Granted Ability Item (2026-09-23): a round-scale span that
      // timed an Item takes the Item with it, as expiry and removal do.
      for (const e of drop)
        for (const id of grantedItemIdsOf(e)) await removeGrantedItem(actor, id);
      await setEntries(actor, keep);
    }
  }
}
