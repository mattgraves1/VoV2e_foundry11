/**
 * Quantum Daemon Debt (foundry-system-index.csv "Quantum Daemon Debt") — the
 * curses a Daemon visits on a debtor who refuses to pay, as entries on the
 * Active Effect Board.
 *
 * Miscellany/Quantum Daemons.md, "Refusing to Pay the Debt", prints three:
 * Jinxed, Possessed and Evil Twins. This file holds the ones that are STATE —
 * something the character carries from the day it is inflicted until the
 * Referee lifts it. Possessed is not state: it is a day lost and a Wound, and
 * the Wound half is the Referee-chosen wound picker on the character sheet's
 * Wounds tab (Wound-Table Resolution), the day is the Referee's at the clock.
 *
 * THE DEBT ITSELF IS NOT HERE, RULED 2026-09-17 (Matt): "does this need a
 * mechanic? I would think 'Begin an effort' covers this." It does — an effort
 * takes a free-text name, a debtor and a span in days, and the book says only
 * that the Referee "should record the amount" and that the Daemon returns
 * "often seven days" later. So a debt is an effort named for the Daemon, and
 * nothing in this file knows a debt exists.
 *
 * A CURSE IS A BOARD ENTRY OF ITS OWN KIND, started from a GM control beside
 * "Start an affliction". It is not an affliction: there is no save to contract
 * it, no onset, no cure roll, and no Item on the sheet. RULED 2026-09-17
 * (Matt): "It could have a GM-only entry on the active effects board". GM-ONLY
 * IS A NEW VISIBILITY, and it is why the entry carries `gmOnly: true`: the
 * board's rule is that a PC-origin entry is public to its owner, because the
 * player chose it — and a player did not choose a curse. So visibilityFor()
 * hides a gmOnly entry from everyone but the Referee until it is revealed,
 * and a revealed one shows the Referee's own label and nothing else, the same
 * rule every revealed row follows.
 *
 * ── Jinxed ─────────────────────────────────────────────────────────────────
 *
 * The book: "The Referee rolls a d20 in secret and records the number.
 * Whenever you roll this same number, it is as if you rolled a natural one,
 * no matter your modifiers."
 *
 * THE NUMBER IS ROLLED HERE AND WHISPERED, RULED 2026-09-17 (Matt): "something
 * to inflict the jinx ... being able to generate the number and assign the
 * condition so it happens automatically would be awesome ... would be nice to
 * see the number rolled there too." Inflicting rolls the d20, stores it on the
 * entry, and whispers it to the Referee. The board prints it for the Referee
 * only — effect-board-app.js hands the number over solely when the viewer is
 * GM, so a revealed row cannot leak it.
 *
 * ENFORCEMENT REWRITES THE KEPT DIE. There is no character-level gate on a
 * d20 in this system or in Foundry: every roll site builds its own Roll and
 * reads the die itself. Measured 2026-09-17: 11 sites read the natural die,
 * but they funnel through THREE roll creators — the character sheet's
 * _rollD20 (every ability save, attack, Codex read, Gift and rule roll on the
 * sheet goes through it), the ambush card's PSY save, and card-save.js, which
 * every other card rolls through. applyJinx() is called in those three,
 * immediately after evaluation, and rewrites the kept d20 to 1 in the Roll
 * itself. Everything downstream then sees a genuine natural 1 — the save
 * resolver, the weapon breakage, the crit banner, the chat card and the dice
 * animation — with no knowledge of the jinx. A JINXED ATTACK FIRES THE
 * NATURAL-1 WEAPON CONSEQUENCES for exactly that reason, and by ruling: the
 * book's "as if you rolled a natural one" taken literally.
 *
 * THIS IS A CONVENTION AND NOT A GATE. A fourth roll creator written later
 * and not calling applyJinx() is not jinxed. Said to Matt before building,
 * accepted on 2026-09-17. The NPC morale roll is the one d20 deliberately
 * outside it: a curse is inflicted on a character, the dialog offers only
 * characters, and Morale is an NPC rule.
 *
 * ONLY THE KEPT DIE IS READ. Under ADV or DIS the roll is the die that was
 * kept; a discarded die showing the number was not rolled as the result and
 * does nothing. The rewrite does not re-run the keep, so a kept 17 under ADV
 * becomes a 1 and stays kept — the book's "no matter your modifiers".
 *
 * THE CARD SAYS JINX AND NOTHING ELSE, RULED 2026-09-17 (Matt): "I would
 * want the player to have a hint, like the card could say JINX at the top
 * with no other context to make it different from a normal critical
 * failure." JINX_BANNER is prepended to the card's flavor by the three
 * creators; the number is never on the card.
 *
 * ── Evil Twins ─────────────────────────────────────────────────────────────
 *
 * ROLLED FROM THE START-OF-DAY CARD, RULED 2026-09-17 (Matt): "implemented as
 * a roll folded into the encounter rolls card from the 'Start the day' button
 * on the exploration clock." The book: "The Referee rolls a d6 at the start
 * of each day; on a 1, an Evil Twin will catch up to you." So day-start.js
 * asks this file for one d6 per cursed character and prints the results
 * beside the day's encounter check, whispered as it is — a twin
 * the players read about in chat is not a hunter. The twin itself is NOT
 * built here: "No need for clone implementation, foundry already has a
 * duplicate function. GM would just have to change who the duplicate belongs
 * to." That matches the 2026-08-30 ruling that clone-shaped things are
 * Referee-run NPCs.
 *
 * NEVER ON EITHER EXPIRY NUMBER LINE, for the same load-bearing reason
 * activity.js, lapse.js and recurrence.js each say so: a curse ends when the
 * Referee lifts it, and leaving both stamps null is what stops the board's
 * sweepExpired() from deleting it.
 */

import { entriesOf, setEntries, collectAll } from "./effect-board.js";

/**
 * The book's curses that are carried as state. Text is the book's own
 * sentence, printed on the row so the Referee reads the rule where the entry
 * is rather than looking it up.
 */
export const CURSES = [
  {
    key: "jinxed",
    name: "Jinxed",
    text: "You are extra unlucky. The Referee rolls a d20 in secret and records the number. "
        + "Whenever you roll this same number, it is as if you rolled a natural one, no matter your modifiers.",
    // Rolled once at inflicting, stored on the entry as jinxNumber.
    secret: "1d20"
  },
  {
    key: "evil-twins",
    name: "Evil Twins",
    text: "The Daemon begins summoning evil parallel-world versions of you to hunt you down. "
        + "The Referee rolls a d6 at the start of each day; on a 1, an Evil Twin will catch up to you. "
        + "They look exactly like you except for one small difference. They have your Level, stats, and equipment, including Exotica.",
    // What the start-of-day card prints beside the d6.
    daily: { formula: "1d6", hit: 1, hitText: "an Evil Twin catches up today", missText: "no twin today" }
  }
];

/** What a jinxed card carries at the top, and nothing else. */
// A span, not a div: it lands inside the card's flavor span, and the CSS makes
// it a block of its own.
export const JINX_BANNER = '<span class="vaarn-jinx">JINX</span>';

export function curseByKey(key)
{
  return CURSES.find(c => c.key === key) ?? null;
}

export function isCurse(entry)
{
  return entry?.kind === "curse";
}

/**
 * Inflict a curse. One of each per character: inflicting Evil Twins twice
 * would roll two dice a day for a rule that names one, and a second Jinxed
 * would roll a second number for a rule that records one, so the existing
 * entry is returned unchanged.
 *
 * Jinxed rolls its number here and whispers it to the Referee. The roll is
 * NOT posted as a roll: a d20 landing in chat for everyone to see is the
 * secret given away.
 */
export async function startCurse(actor, key)
{
  const def = curseByKey(key);
  if (!def) return null;

  const existing = entriesOf(actor).find(e => isCurse(e) && e.curseKey === def.key);
  if (existing) return existing;

  let jinxNumber = null;
  if (def.secret)
  {
    const roll = await new Roll(def.secret).evaluate();
    jinxNumber = roll.total;
  }

  const entry = {
    id: foundry.utils.randomID(),
    kind: "curse",
    name: def.name,
    text: def.text,
    note: "",
    itemId: null,
    origin: actor.type === "npc" ? "npc" : "pc",
    // See the header: a curse is the Referee's until revealed, whoever it is on.
    gmOnly: true,
    revealed: false,
    revealLabel: "",
    curseKey: def.key,
    jinxNumber,
    startTime: game?.time?.worldTime ?? 0,
    unit: null,
    amount: null,
    startRound: null,
    expiresAtTime: null,
    expiresAtRound: null
  };
  await setEntries(actor, [...entriesOf(actor), entry]);

  if (jinxNumber !== null)
    await ChatMessage.create({
      content: `<p><b>${actor.name}</b> is <b>Jinxed</b>. The number is <b>${jinxNumber}</b>: `
             + `whenever their kept d20 shows it, the roll is a natural 1.</p>`,
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
    });

  return entry;
}

/** Every actor carrying the named curse, with the entry. */
export function cursedWith(key)
{
  return collectAll().filter(({ entry }) => isCurse(entry) && entry.curseKey === key);
}

/** The jinx number this actor carries, or null. */
export function jinxNumberOf(actor)
{
  const entry = entriesOf(actor).find(e => isCurse(e) && e.curseKey === "jinxed");
  const n = Number(entry?.jinxNumber);
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : null;
}

/**
 * The enforcement. Call immediately after the roll is evaluated, before
 * anything reads it. Returns true when the jinx fired.
 *
 * Rewrites the KEPT d20 result to 1 inside the Roll and adjusts the total by
 * the same difference, so every reader downstream — dice[0].total, roll.total,
 * the serialised roll on the chat card — sees a natural 1 that was rolled.
 * The first d20 term is the check die on every roll this system makes; a
 * roll with no d20 is left alone.
 */
export function applyJinx(actor, roll)
{
  const n = jinxNumberOf(actor);
  if (n === null) return false;

  const die = (roll?.dice ?? []).find(d => d.faces === 20);
  if (!die || !Array.isArray(die.results)) return false;

  const kept = die.results.filter(r => r.active !== false && !r.discarded);
  const hit = kept.find(r => r.result === n);
  if (!hit) return false;

  const before = die.total;
  hit.result = 1;
  const after = die.total;
  // Roll caches its total at evaluation; move it by exactly what the die moved.
  roll._total = roll.total - before + after;
  return true;
}

/**
 * The start-of-day d6 for every character under Evil Twins.
 *
 * Returns one row per cursed actor, already rolled, for day-start.js to print
 * on the encounter card. An empty array when nobody is cursed, so the card is
 * exactly what it was before this file existed.
 */
export async function rollEvilTwins()
{
  const def = curseByKey("evil-twins");
  const rows = [];
  for (const { actor } of cursedWith(def.key))
  {
    const roll = await new Roll(def.daily.formula).evaluate();
    const hit = roll.total <= def.daily.hit;
    rows.push({
      actorName: actor.name,
      formula: def.daily.formula,
      total: roll.total,
      hit,
      text: hit ? def.daily.hitText : def.daily.missText
    });
  }
  return rows;
}
