/**
 * The start of a travel day — foundry-system-index.csv "Start-of-Day Roll
 * Sequence", and the Vigilance Die that sequence carries.
 *
 * The book puts three rolls at the top of a travel day and says so in three
 * separate places: the weather chart is rolled "at the start of each day",
 * the Referee checks for encounters "once per day" (JADE IBIS; CRIMSON HOUND
 * checked "once during the travel day and once per night"), and the vigilance
 * die is rolled "at the start of each day as you roll for encounters". RULED 2026-09-12 (Matt): one button rolls all three,
 * in that order — "since weather, encounters, and vigilance die are all daily
 * checks, maybe we could do all this at once with one button? would have to
 * be in that order".
 *
 * THE ORDER IS LOAD-BEARING and is the reason this is one sequence rather
 * than three buttons: Hazy and Dust Storm put the Vigilance check at
 * disadvantage, so the weather has to be known before the die is offered.
 * Rolling them together is what lets the offer arrive already correct instead
 * of asking the Referee to remember a rule the card printed eight lines
 * above.
 *
 * ONE ENCOUNTER CHECK PER DAY. RULED 2026-09-21 (Matt), following JADE IBIS.
 * Until then this rolled a Day and a Night check up front, under his
 * 2026-09-12 ruling that knowing the night held something made the Vigilance
 * die a decision; JADE removed the night check, so there is nothing left to
 * roll early.
 *
 * WHO SEES WHAT — three audiences, three messages, and it is not tidiness.
 * The weather obeys its own public/private setting because the sky is public.
 * The encounter pair is ALWAYS whispered: an omen the players read in chat is
 * not an omen, which is the reason exploration-clock.js already whispers its
 * own check. The Vigilance offer is ALWAYS public, because the button on it
 * is the players' to race for.
 *
 * ONE WRITE, SINCE 2026-09-23: a companion carrying a daily yield (the
 * Exultant's Hawk's Raw Meat) gives it to its owner. Matt overruled "Rolls
 * only" for that; the reasoning is in daily-yield.js.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not advance the clock and it
 * does not draw rations — RULED 2026-09-12 (Matt), "Rolls only". The ration
 * draw belongs to the Rest, decided the same day on the Travel and Rations
 * row ("rests are where the mechanics come in"), and a second per-day draw
 * here would be a rival to it. The day is advanced from the Exploration
 * Clock's own controls, as it always was.
 *
 * AND IT STORES NOTHING. The Vigilance result is announce-only — RULED
 * 2026-09-12 (Matt) against wiring it into Ambush Resolution — so there is no
 * state for a reader to consult and the card is the whole record. The daily
 * reset falls out of that for free: a card is live while it is the newest one
 * posted, and the next day's sequence retires it by existing. That is the
 * book's "resets at the end of each day, whether the players made use of it
 * or not" with no clock to read and nothing to get out of step.
 */

import { rollDay as rollWeatherDay, currentWeather } from "./weather.js";
import { weatherSentencesOf } from "../item/remaining-effects.js";
import { rollEncounterCheck, ENVIRONMENTS } from "./exploration-clock.js";
// Quantum Daemon Debt. The Evil Twins d6 rides the encounter card — RULED
// 2026-09-17 (Matt), see curse.js — so the Referee reads the day's hunters
// beside the day's encounters, whispered like them.
import { rollEvilTwins } from "./curse.js";
// Travel and Rations, 2026-09-23: the Exultant's Hawk's catch, last in the
// sequence. See daily-yield.js for why this button, and why it now writes.
import { bringDailyYields } from "./daily-yield.js";
import { spoilPerishables } from "./perishable.js";
import { announceWithering } from "../actor/bestiary-spawn.js";

const SCOPE = "vaarn";

/** The whispered encounter pair. */
export const DAY_FLAG = "dayStart";
/** The public Vigilance offer card. */
export const VIGIL_FLAG = "vigilance";
/** The roll a player made against that card. The roll message IS the record. */
export const VIGIL_ROLL_FLAG = "vigilanceRoll";

/**
 * "This is a single d6, without modifiers."
 *
 * Disadvantage is therefore not a modifier but a second die — `kl` is
 * Foundry's keep-lowest, the same expression exploration-clock.js uses for
 * the book's own "roll 2d6 and take the lowest" encounter rule, so the two
 * places that lower a d6 in this system lower it the same way.
 */
export const VIGIL_DICE = Object.freeze({
  plain: "1d6",
  disadvantage: "2d6kl"
});

/* -------------------------------------------- */
/*  The die                                                               */
/* -------------------------------------------- */

/**
 * What a Vigilance total means, in the book's own terms.
 *
 * Two results and a shrug. The middle is named rather than left blank
 * because a card that says nothing for a 4 reads like a card that failed to
 * work, and the die being spent for the day is itself the outcome.
 */
export function vigilanceVerdict(total)
{
  if (total >= 6) return {
    key: "spotted",
    text: "The party has a <b>guarantee of spotting their next Encounter</b> "
        + "before the opposing entity or group spots them."
  };
  if (total <= 1) return {
    key: "surprised",
    text: "The <b>next Encounter will spot the party</b> before they spot it."
  };
  return {
    key: "none",
    text: "No effect — the die is spent for today either way."
  };
}

/**
 * The Vigilance roll recorded against one day, or null.
 *
 * EARLIEST WINS, and for the same reason ambush.js takes the first save:
 * anyone may click the button, so two clients clicking together produce two
 * messages, and a tally that changes when it is recomputed is worse than one
 * that is merely first. game.messages is in creation order, so `find` is the
 * earliest without sorting.
 */
export function vigilanceRollFor(dayId, messages = null)
{
  const pool = messages ?? game.messages.contents;
  const m = pool.find(msg => msg.getFlag(SCOPE, VIGIL_ROLL_FLAG)?.dayId === dayId);
  return m ? m.getFlag(SCOPE, VIGIL_ROLL_FLAG) : null;
}

/**
 * Is this card still today's?
 *
 * The expiry rule, derived rather than stored. A newer offer card anywhere in
 * the log means a new day was started, and the book expires the old die at
 * that point whether it was rolled or not.
 */
export function isCurrentDay(dayId, messages = null)
{
  const pool = messages ?? game.messages.contents;
  let newest = null;
  for (const msg of pool)
    if (msg.getFlag(SCOPE, VIGIL_FLAG)) newest = msg.getFlag(SCOPE, VIGIL_FLAG).dayId;
  return newest === null || newest === dayId;
}

/* -------------------------------------------- */
/*  The offer card                                                        */
/* -------------------------------------------- */

/**
 * The public card, rebuilt from the spec plus whatever roll exists right now.
 *
 * Rebuilt on every render and never patched, because a roll made on another
 * client arrives as a NEW message and never as an edit to this one — the same
 * constraint ambush.js works under, and the reason neither card needs its
 * author's write access.
 */
export function vigilanceCard(spec, roll, current)
{
  const head = `<p class="vaarn-vigil-head"><b>Vigilance</b> — day ${spec.day}</p>`;

  const why = spec.disadvantage
    ? `<p class="vaarn-vigil-why">${spec.weather} — Vigilance checks are made `
      + `with disadvantage, so this is ${VIGIL_DICE.disadvantage}.</p>`
    : "";

  if (roll)
  {
    const v = vigilanceVerdict(roll.total);
    const stale = current ? "" : ` <i class="vaarn-vigil-spent">(a later day has begun)</i>`;
    return `<div class="vaarn-vigil">${head}${why}`
      + `<p class="vaarn-vigil-result vaarn-vigil-${v.key}">`
      + `${roll.formula} = <b>${roll.total}</b>${stale}</p>`
      + `<p>${v.text}</p></div>`;
  }

  if (!current)
    return `<div class="vaarn-vigil">${head}${why}`
      + `<p class="vaarn-vigil-spent">Never rolled, and the day has passed. `
      + `The die resets whether the players made use of it or not.</p></div>`;

  // "the players MAY collectively roll" — one roll for the whole party, and
  // optional. So the button is an offer with no default and no timer, and
  // nothing in the sequence waits on it.
  return `<div class="vaarn-vigil">${head}${why}`
    + `<p>The party may roll a single Vigilance Die for the day.</p>`
    + `<button class="vaarn-vigil-roll" data-day-id="${spec.dayId}">`
    + `Roll the Vigilance Die</button></div>`;
}

/**
 * Roll it. Anyone may — that is the point of the button being on a public
 * card.
 *
 * THE REFEREE IS NOT EXCLUDED, deliberately, on the same reasoning as
 * ambush.js letting the Referee roll a row a player has not: an absent player
 * must never be able to block a roll the table wants made.
 */
export async function rollVigilance(dayId)
{
  const card = game.messages.contents.find(
    m => m.getFlag(SCOPE, VIGIL_FLAG)?.dayId === dayId);
  if (!card) return null;
  const spec = card.getFlag(SCOPE, VIGIL_FLAG);

  // Re-checked at click time rather than trusted from the render that bound
  // the handler, because another client may have rolled since.
  if (vigilanceRollFor(dayId)) return null;
  if (!isCurrentDay(dayId))
  {
    ui.notifications.warn("That Vigilance Die belongs to a day that has already ended.");
    return null;
  }

  const formula = spec.disadvantage ? VIGIL_DICE.disadvantage : VIGIL_DICE.plain;
  const roll = new Roll(formula);
  await roll.evaluate({ async: true });
  const v = vigilanceVerdict(roll.total);

  // Roll mode and never `whisper`: Roll#toMessage ends in applyRollMode, which
  // overwrites a whisper array from the mode in force. Public is also the
  // point — the whole party rolled this one.
  await roll.toMessage({
    flavor: `<b>Vigilance Die</b> — day ${spec.day}`
          + (spec.disadvantage ? ` (disadvantage — ${spec.weather})` : ""),
    flags: { [SCOPE]: { [VIGIL_ROLL_FLAG]: {
      dayId,
      total: roll.total,
      formula,
      disadvantage: !!spec.disadvantage,
      verdict: v.key
    } } }
  }, { rollMode: CONST.DICE_ROLL_MODES.PUBLIC });

  return { total: roll.total, verdict: v.key };
}

/* -------------------------------------------- */
/*  The sequence                                                          */
/* -------------------------------------------- */

/**
 * The whispered encounter check, with any Evil Twins lines beneath it, on one
 * card so the Referee reads the day's plan in one place.
 */
async function postEncounterCard(envKey, formula, results, day, twins = [])
{
  const env = ENVIRONMENTS[envKey] ?? ENVIRONMENTS.vault;
  const rows = results.map(r =>
    `<li><b>${r.when}</b> — ${formula} = <b>${r.total}</b><br>${r.text}</li>`
  ).join("");

  // Quantum Daemon Debt: one line per character under Evil Twins, absent
  // when nobody is. A hit is bold because it is the one line on this card
  // that means somebody arrives.
  const twinRows = twins.map(t =>
    `<li><b>Evil Twins</b> — ${t.actorName}: ${t.formula} = <b>${t.total}</b><br>`
    + (t.hit ? `<b>${t.text}</b>` : t.text) + `</li>`
  ).join("");

  await ChatMessage.create({
    content: `<p><b>Travel day ${day} — ${env.label}</b></p><ul>${rows}${twinRows}</ul>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { [SCOPE]: { [DAY_FLAG]: { day, envKey, formula } } }
  });
}

/**
 * Start the day: weather, both encounter checks, then the Vigilance offer.
 *
 * AWAITED IN SEQUENCE rather than fired together. ChatMessage.create is async
 * and a synchronous burst races its own message creation — the trap CLAUDE.md
 * records from forcing nat-1s — and here the order is the rule itself, so a
 * race would not merely reorder the log but could offer the die before the
 * weather that sets its dice.
 */
export async function startDay({ envKey, formula } = {})
{
  if (!game.user.isGM)
  {
    ui.notifications.warn("Only the Referee starts the day.");
    return null;
  }

  // Weather first: it posts its own cards, and its result decides the dice
  // the Vigilance offer will carry.
  const weather = await rollWeatherDay();
  if (!weather) return null;

  const r = await rollEncounterCheck(envKey, formula);
  const results = [{ when: "Encounter check", total: r.total, text: r.text }];
  // After the encounter checks and before the card, so the card carries the
  // day's whole whispered plan in one read.
  const twins = await rollEvilTwins();
  await postEncounterCard(envKey, formula, results, weather.day, twins);

  // READ BACK FROM THE MARKER, not from the entry rollDay returned. The entry
  // carries the weather's NAME for display; the `vigilance` flag lives on the
  // type itself, and currentWeather() is the marker's type after the move.
  // Taking the name and looking the type up again would be a second lookup
  // keyed on a display string.
  const type = currentWeather();
  const spec = {
    dayId: foundry.utils.randomID(),
    day: weather.day,
    weather: weather.type,
    // The Vigilance Die's DIS from the weather's sentence (Remaining Sources chunk 2c-i, 2026-10-07).
    disadvantage: weatherSentencesOf(type?.key).some(s => s.do?.from === "vigilance" && s.do.verb === "dis")
  };

  await ChatMessage.create({
    content: vigilanceCard(spec, null, true),
    flags: { [SCOPE]: { [VIGIL_FLAG]: spec } }
  });

  // LAST, after every roll: it is the one step that changes an inventory,
  // and nothing above depends on it.
  const catches = await bringDailyYields();
  // Perishable Spoiling (RULED 2026-09-24, Matt): anything grown on an earlier
  // day spoils now. After the yields, so a catch brought this morning is fresh.
  const spoiled = await spoilPerishables();
  // Retainers that serve "for the rest of the day" wither now - a reminder to
  // the Referee (Actor Spawning wiring, 2026-09-25).
  const withered = await announceWithering();

  return { weather, results, vigilance: spec, catches, spoiled, withered };
}

/* -------------------------------------------- */
/*  Registration                                                          */
/* -------------------------------------------- */

export function registerDayStartCardButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, VIGIL_FLAG);
    if (!spec) return;

    html.find(".vaarn-vigil").replaceWith(
      vigilanceCard(spec, vigilanceRollFor(spec.dayId), isCurrentDay(spec.dayId)));

    html.find(".vaarn-vigil-roll").click(async ev =>
      rollVigilance(ev.currentTarget.dataset.dayId));
  });

  // A roll landing anywhere re-renders its card on every client, so the
  // button is replaced by the result for everyone without anyone needing
  // write access to a message they did not author.
  //
  // NEVER REFRESH THE MESSAGE THAT TRIGGERED THIS HOOK. ChatLog.updateMessage
  // looks for the message's element in the log and, not finding one, falls
  // back to postOne (foundry.js, v11) — and at createChatMessage time it never
  // finds one, because the log has not appended the new message yet. So asking
  // it to refresh the card being created POSTS A SECOND COPY, which Foundry
  // then renders beside its own: two identical cards, one message id, one
  // timestamp, and a button that locks both at once because both derive from
  // the same state. Found by Matt 2026-09-12, testing the finished feature.
  //
  // The earlier version of this handler collected every vigilance dayId
  // including the new card's own, which is how it reached that call.
  Hooks.on("createChatMessage", message =>
  {
    const roll = message.getFlag(SCOPE, VIGIL_ROLL_FLAG);
    const offer = message.getFlag(SCOPE, VIGIL_FLAG);

    // A NEW day's offer expires the previous one, so THAT card is re-read —
    // and only that one. Every older card already renders as expired and
    // would re-render identically, so walking the whole log would be work
    // that changes nothing and grows with the campaign.
    if (offer)
    {
      const others = game.messages.contents.filter(
        m => m.id !== message.id && m.getFlag(SCOPE, VIGIL_FLAG));
      const previous = others[others.length - 1];
      if (previous) ui.chat?.updateMessage?.(previous);
      return;
    }

    // A roll touches only its own day's card, which by definition already
    // exists — the button that produced the roll is on it.
    if (roll?.dayId)
    {
      const card = game.messages.contents.find(
        m => m.id !== message.id && m.getFlag(SCOPE, VIGIL_FLAG)?.dayId === roll.dayId);
      if (card) ui.chat?.updateMessage?.(card);
    }
  });
}
