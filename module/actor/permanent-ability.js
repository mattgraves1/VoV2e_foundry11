import { ABILITY_KEYS, ABILITY_CAP, ABILITY_LABEL } from "./advancement.js";
import { ELIXIRS } from "./chargen-data.js";
import { ADVANCED_EXOTICA } from "./advanced-exotica-data.js";

/**
 * PERMANENT ABILITY SCORE CHANGE
 *
 * Permanently alter an Ability score, as distinct from a bonus an Item
 * contributes while it is worn or carried. The score itself moves and the
 * change outlives whatever caused it.
 *
 * THE ONE RULE THIS FILE EXISTS TO HOLD, ruled 2026-09-14 (Matt) when the
 * mechanism was scoped: "the level loss should revert exactly the choices
 * that were gained by the last level up". A permanent change made here is
 * NOT one of those choices, so nothing written by this file may ever enter
 * the advancement ledger.
 *
 * That is not a style preference, it is the whole correctness argument.
 * advancement.js reverts a level from the STORED per-level deltas it
 * recorded at level-up (`entry.abilities`, read back at the undo), never by
 * recomputing from the actor. So a change this file makes is invisible to a
 * level-down and survives it — which is exactly right for an effect the book
 * calls permanent. Write an Ambrosia's +1 into that ledger instead and a
 * later level-down would silently confiscate it, with nothing on screen to
 * say where it went.
 *
 * WHY IT IS ITS OWN FILE rather than another branch inside actor-sheet.js:
 * the mechanism already existed once, built into advancement.js because
 * Advancement Automation was built first, and no row admitted to it. A
 * second mechanism hidden in a file some other row already claims is the
 * gap CLAUDE.md names as unprotected — validate.mjs checks files, not
 * symbols, so only a NEW file makes the claim checkable.
 *
 * THE CAP IS ADVANCEMENT'S CAP, imported rather than restated. "Abilities
 * may never be raised higher than +10" is one rule; two copies of the number
 * is how it becomes two rules.
 */

/**
 * The roster's declared permanent-Ability spec for an Item, by name. Null if
 * none.
 *
 * DERIVED FROM THE ROSTER, never a hand-written name list — the same rule
 * statefulElixirNames() already follows in actor-sheet.js, and for the same
 * reason: a second list is a second thing to edit, and the four duration
 * literals it replaced had all drifted from the roster by the time anyone
 * checked. A `permanentAbility` spec IS the statement that this entry moves a
 * score for good.
 *
 * The flag names the MECHANISM it needs rather than its subject, which is the
 * form CLAUDE.md settled on when `perRound` was named for Per-Round Effect
 * Reminder.
 */
export function permanentAbilitySpecFor(name)
{
  return ELIXIRS.find(e => e.name === name)?.permanentAbility ?? null;
}

/**
 * The Advanced Exotica roster's permanent-Ability spec for an Item, by name.
 * Null if none.
 *
 * A SEPARATE SHAPE from the Elixirs' `{ choose }`, which is the size of one
 * change. Autarch's Nectar (2026-09-26) is several changes: `{ delta, count,
 * requiresType }` - "a permanent +1 boost to three ability scores" when drunk
 * by a biological creature. RULED 2026-09-26 (Matt): the three must be
 * different Abilities, and a drinker without the type is refused.
 */
export function exoticaPermanentAbilitySpecFor(name)
{
  return ADVANCED_EXOTICA.find(e => e.name === name)?.permanentAbility ?? null;
}

/**
 * The Abilities a permanent GAIN could actually move — those below the cap.
 *
 * Mirrors advancement.js's eligibleAbilities deliberately, and for the same
 * stated reason: offering an Ability already at +10 is offering a choice that
 * does nothing. The caller uses this to decide whether there is any choice to
 * offer at all, which is what keeps a consumable from being destroyed for no
 * effect.
 */
export function eligibleForGain(actor)
{
  return ABILITY_KEYS.filter(k => Number(actor.system.abilities[k].value) < ABILITY_CAP);
}

/**
 * Apply a permanent delta to one Ability and report what actually happened.
 *
 * Returns { key, label, from, to, applied, capped }. `applied` is the change
 * that landed, which is NOT necessarily `delta` — a +1 against a score of 10
 * applies 0 and sets `capped`. The caller is expected to report `applied`
 * rather than `delta`, so the card says what the character got instead of
 * what the elixir promised.
 *
 * Clamped at both ends. The floor is 0 rather than the cap's opposite because
 * a negative score is not a thing any Vaarn rule produces, and a permanent
 * LOSS is a shape this mechanism should support before something needs it —
 * Brain Coral's STR-for-PSY trade is not it (both halves end with the
 * disease, ruled 2026-09-13), but the index will not stay that way forever.
 */
export async function applyPermanentAbilityChange(actor, key, delta)
{
  if(!ABILITY_KEYS.includes(key)) throw new Error(`Not an Ability key: ${key}`);

  const from = Number(actor.system.abilities[key].value);
  const to = Math.max(0, Math.min(ABILITY_CAP, from + delta));

  if(to !== from) await actor.update({ [`system.abilities.${key}.value`]: to });

  return { key, label: ABILITY_LABEL[key], from, to, applied: to - from, capped: to !== from + delta };
}

/**
 * Ask which Ability to change. Resolves to a key, or null if cancelled.
 *
 * Only eligible Abilities are offered, each showing its current score the way
 * the level-up dialog does, so the choice is made against the same
 * information in both places.
 *
 * THE HINT IS WRAPPED IN A DIV, NOT A P. It carries the Item's description,
 * which is already `<p>`-wrapped by the chargen creation path — nesting a
 * block element inside a paragraph is invalid, and the browser silently
 * splits it into an empty paragraph followed by the real text. Found in
 * Group 157 (2026-09-14) by reading the rendered node rather than the
 * template: querySelector('p') returned the empty half.
 */
export async function promptAbilityChoice(actor, { title, hint, delta = 1 } = {})
{
  const eligible = eligibleForGain(actor);
  if(!eligible.length) return null;

  const options = eligible.map(k =>
    `<option value="${k}">${ABILITY_LABEL[k]} (${actor.system.abilities[k].value})</option>`).join("");

  const sign = delta >= 0 ? `+${delta}` : `${delta}`;

  return new Promise(resolve =>
  {
    new Dialog({
      title: title ?? "Permanent Ability Change",
      content: `
        <form>
          ${hint ? `<div class="vaarn-dialog-hint">${hint}</div>` : ""}
          <div class="form-group">
            <label>Ability (${sign})</label>
            <select name="ability">${options}</select>
          </div>
        </form>`,
      buttons: {
        ok: {
          label: "Confirm",
          callback: html => resolve(html[0].querySelector('select[name="ability"]').value || null)
        },
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

/**
 * Ask for `count` DIFFERENT Abilities. Resolves to an array of keys, or null
 * if cancelled.
 *
 * FEWER THAN `count` WHEN FEWER CAN MOVE. With only two Abilities below the
 * cap, two dropdowns are offered - the Ambrosia's rule that the drink does
 * what it can and refuses only when it can do nothing. Each dropdown starts on
 * a different Ability so the default answer is already a legal one.
 *
 * A REPEATED PICK IS REFUSED IN THE DIALOG, which stays open with a warning
 * rather than closing on an answer the ruling forbids.
 */
export async function promptDistinctAbilities(actor, { title, hint, delta = 1, count = 1 } = {})
{
  const eligible = eligibleForGain(actor);
  const n = Math.min(count, eligible.length);
  if(!n) return null;

  const sign = delta >= 0 ? `+${delta}` : `${delta}`;
  const selects = Array.from({ length: n }, (_, i) =>
  {
    const options = eligible.map((k, j) =>
      `<option value="${k}"${j === i ? " selected" : ""}>${ABILITY_LABEL[k]} (${actor.system.abilities[k].value})</option>`).join("");
    return `<div class="form-group"><label>Ability ${i + 1} (${sign})</label><select name="ability-${i}">${options}</select></div>`;
  }).join("");

  return new Promise(resolve =>
  {
    let settled = false;
    const done = v => { if(!settled) { settled = true; resolve(v); } };
    new Dialog({
      title: title ?? "Permanent Ability Change",
      content: `
        <form>
          ${hint ? `<div class="vaarn-dialog-hint">${hint}</div>` : ""}
          ${selects}
        </form>`,
      buttons: {
        ok: {
          label: "Confirm",
          callback: html =>
          {
            const keys = [...html[0].querySelectorAll('select[name^="ability-"]')].map(s => s.value);
            // Foundry 11's Dialog#submit catches a throw from a callback, shows
            // its message as a notification and does NOT close - the one way
            // to keep a dialog open on a bad answer.
            if(new Set(keys).size !== keys.length)
              throw new Error("Each Ability can be chosen only once.");
            done(keys);
          }
        },
        cancel: { label: "Cancel", callback: () => done(null) }
      },
      default: "ok",
      close: () => done(null)
    }).render(true);
  });
}
