/**
 * ADVANCEMENT AUTOMATION — foundry-system-index.csv "Advancement Automation".
 *
 * Advancement.md, verbatim: "Characters advance by trading in Exotica at
 * settlements or oases. Trading an item of Exotica grants one experience point
 * (XP). When a PC's XP tally equals their current Level, they increase their
 * Level by one and reset their XP tally to zero." And: "When a PC's Level
 * increases they may increase three Abilities by one point each. Abilities may
 * never be raised higher than +10. The player may also roll 1d8 and add the
 * result to the PC's maximum HP." And: "Once a character has reached Level 10
 * they are considered complete. Each subsequent level grants only one extra HP,
 * and they cannot increase their Abilities further."
 *
 * XP STAYS MANUAL, ruled 2026-09-13 (Matt). Nothing in the system sells an
 * item, so there is no event to award XP from — xp-value.js computes what an
 * Exotica is WORTH and stops there, deliberately. The sheet drives the tally
 * with arrows instead of a typed field, and the LEVEL UP button is the hook
 * everything else hangs off.
 *
 * ONE DELIBERATE DEVIATION FROM THE BOOK, Matt's 2026-09-13 ruling and his own
 * worked example: levelling up SUBTRACTS the current level from the XP tally
 * rather than resetting it to zero. They differ only when the tally has
 * overshot — Level 1 with XP 3 leaves XP 2 here and XP 0 in the book — and his
 * version banks the surplus toward the next level.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE LEDGER, and why this row is bigger than "add one to a number".
 *
 * RULED 2026-09-13 (Matt): "I'd rather level loss strictly undo changes and put
 * the character back exactly as they were when they were previously at the
 * lower level." So every level-up records what it granted, and losing a level
 * replays that record backwards. `system.advancement` is that ledger: one entry
 * per level ATTAINED, appended on the way up and popped on the way down.
 *
 * The alternative is what the book does, and the book only does it because the
 * bookkeeping is too tedious with pen and paper. Kronophage's Borrowed Time is
 * the worked example: "The target loses a Level, rolls 1d8 and subtracts the
 * result from their maximum HP, and subtracts three points from their maximum
 * ability scores" — a fresh 1d8 and a flat 3 standing in for whatever that
 * level actually granted. (JADE IBIS 15-09-26 wording, re-transcribed
 * 2026-09-20; CRIMSON HOUND read "maximum ability DEFENCES". The quote is
 * illustrative here and the ruling does not turn on it.)
 * RULED 2026-09-13 (Matt) that the ledger REPLACES
 * those clauses rather than stacking with them: "it's a bad procedure that only
 * exists because the bookkeeping we're doing is too tedious with pen & paper
 * game". Stacking them is what produces a character with negative maximum HP.
 *
 * Borrowed Time is descriptive-only today (bestiary-data.js, kind "special"),
 * so there is no code here to replace — the ruling is recorded for whenever it
 * is automated.
 *
 * NO WAY IN AT A HIGHER LEVEL, ruled 2026-09-13 (Matt): "We will not offer
 * shortcuts to start a character at higher levels. If a group wants to start
 * out higher level, they will take level 1 chars through the level up
 * procedures and the history will be there." That is what makes the ledger
 * trustworthy rather than best-effort — a PC's history is complete because
 * Level 1 is the only door in. An actor with no ledger is handled below, but as
 * a broken case to report rather than a supported one.
 *
 * NOTHING IS DELETED, ruled 2026-09-13 (Matt). The book's "PCs reduced below
 * Level 0 never existed at all, and their equipment vanishes with them" is not
 * automated: "it's up to the GM if slaying the kronophage makes them go back to
 * existing". Level floors at 1 — which is also the only level the ledger can
 * reach, since Level 1 is the character-creation baseline and has no entry.
 */

import { MUTATION_TABLE } from "./mutation-data.js";
import { ownerOf, companionKindOf, companionLedger, COMPANION_LEDGER_FLAG } from "./companion.js";
import { levelLimitCheck, confirmOverLevelLimit } from "./companion-limit.js";
import { SPARK_TABLES } from "./chargen-data.js";
import { ANCESTRY_RULE_ITEMS } from "./ancestry-rules-data.js";
import { d } from "./chargen-app.js";
import { gmHP } from "./hidden-hp.js";
import { noHealRule } from "./deprived.js";

/**
 * NO MAXIMUM HP FROM LEVELS (RULED 2026-09-28, Matt: a Lithling "shouldn't get
 * those options at all"). The book's Inevitable puts it in the same rule as
 * the ban on healing - "cannot heal HP by any means, and gain no maximum HP
 * from Levels" - so the ancestry's no-heal rule is the signal, read off the
 * roster (deprived.js noHealRule), not the ancestry's name. Returns the rule's
 * name, or null.
 */
function noLevelHP(actor)
{
  return noHealRule(actor);
}
import { supersedeUnarmedReplacers, restoreBakedItemEffects,
         companionWeaponsOf } from "./item-effects.js";

export const ABILITY_KEYS = ["str", "dex", "con", "int", "psy", "ego"];
export const ABILITY_LABEL = { str: "STR", dex: "DEX", con: "CON", int: "INT", psy: "PSY", ego: "EGO" };

/** "Abilities may never be raised higher than +10." */
export const ABILITY_CAP = 10;

/**
 * "Once a character has reached Level 10 they are considered complete."
 *
 * Read carefully, because the off-by-one is easy and wrong in both directions:
 * REACHING 10 is a normal level-up with its three abilities and its 1d8. It is
 * each SUBSEQUENT level that grants only the flat +1 HP. So the test is on the
 * level being attained, not the one being left.
 */
const COMPLETE_AT = 10;

/** The flat grant for every level past 10. "Only one extra HP." */
const BEYOND_HP = 1;

/* -------------------------------------------- */
/* Eligibility                                   */
/* -------------------------------------------- */

/**
 * "When a PC's XP tally equals their current Level, they increase their Level
 * by one." Greater-than as well as equal, because the arrows can overshoot and
 * a tally sitting above the threshold should not lock the button.
 */
/**
 * The XP a level-up costs: the current Level, floored at 1.
 *
 * THE BOOK'S OWN ARITHMETIC PRODUCES A FREE LEVEL AT 0. "When a PC's XP
 * tally equals their current Level, they increase their Level by one" is 0 at
 * Level 0, so a Level 0 creature is permanently eligible having spent nothing.
 * The book never has to face it because "All new characters start at Level 1";
 * companions do not, and Exultant's Hawk is printed at Level 0.
 *
 * RULED 2026-09-13 (Matt): 0 -> 1 costs 1 XP. MEASURED the same day, and it is
 * why this is a floor rather than a companion branch: no character can reach
 * Level 0 at all, because loseLevels refuses at level <= 1 and the only wound
 * carrying levelLoss routes through it. So this changes nothing for any
 * character that exists.
 *
 * ONE FUNCTION BECAUSE THERE WERE FOUR CALL SITES. The cost was written out
 * separately in the eligibility test, the warning text, the ledger entry and
 * the XP subtraction. Flooring three of the four would have left a level that
 * is offered and refused, or spent and not recorded.
 */
export function xpCostFor(level)
{
  return Math.max(1, Number(level) || 0);
}

export function levelUpAvailable(actor)
{
  if(!actor || actor.type !== "character") return false;
  return Number(actor.system.xp?.value ?? 0) >= xpCostFor(actor.system.level?.value ?? 1);
}

/**
 * The ancestry trades, and both are worded as a straight swap: Proteus is
 * "roll for another mutation instead of increasing HP and ability scores",
 * Bloomboons is "roll for a Boon instead of gaining HP and increasing your
 * ability scores".
 *
 * RULED 2026-09-13 (Matt): "trades do not apply to levels past 10." Past 10
 * there is nothing to trade away but a single point of HP, and the book's own
 * "they are considered complete" is the reason.
 *
 * Keyed off system.ancestry rather than an Item, because Cacogen has no
 * ancestry rule Items at all — Corrupted Blood and Proteus live in
 * chargen-data.js as special_rules text. Neobloom does have one, and using the
 * same signal for both keeps this a single question with a single answer.
 */
export function tradeFor(actor)
{
  const attained = Number(actor.system.level?.value ?? 1) + 1;
  if(attained > COMPLETE_AT) return null;
  if(actor.system.ancestry === "Cacogen") return "proteus";
  if(actor.system.ancestry === "Neobloom") return "bloomboon";
  return null;
}

/* -------------------------------------------- */
/* The dialog                                    */
/* -------------------------------------------- */

function eligibleAbilities(actor)
{
  return ABILITY_KEYS.filter(k => Number(actor.system.abilities[k].value) < ABILITY_CAP);
}

/**
 * One pass of the dialog. Resolves to the chosen state, or null if cancelled.
 *
 * The three ability dropdowns exclude each other AS YOU PICK rather than
 * validating afterwards — Matt's "which must all be different" then has no
 * error path to write, because a duplicate cannot be expressed. Abilities
 * already at +10 are excluded outright for the same reason: offering one is
 * offering a choice that does nothing.
 */
function promptLevelUp(actor, state, eligible, trade)
{
  const attained = Number(actor.system.level.value) + 1;
  const beyond = attained > COMPLETE_AT;

  const abilityOptions = sel => [`<option value="">—</option>`].concat(
    eligible.map(k =>
      `<option value="${k}"${k === sel ? " selected" : ""}>${ABILITY_LABEL[k]} (${actor.system.abilities[k].value})</option>`)
  ).join("");

  const tradeRow = trade
    ? `<div class="form-group"><label>This level</label>
         <select name="branch">
           <option value="standard"${state.branch === "standard" ? " selected" : ""}>Three Abilities and 1d8 HP</option>
           <option value="${trade}"${state.branch === trade ? " selected" : ""}>${
             trade === "proteus" ? "Proteus — roll another mutation instead" : "Bloomboons — roll another Boon instead"}</option>
         </select></div>`
    : "";

  const noHP = noLevelHP(actor);
  const body = beyond
    ? (noHP
        ? `<p>${actor.name} is complete at Level ${COMPLETE_AT}. Reaching Level ${attained}
             grants nothing: <b>${noHP}</b> - no maximum HP from Levels.</p>`
        : `<p>${actor.name} is complete at Level ${COMPLETE_AT}. Reaching Level ${attained}
             grants <b>+${BEYOND_HP} maximum HP</b> and nothing else.</p>`)
    : `${tradeRow}
       <fieldset class="vaarn-levelup-standard" style="border:none;padding:0;margin:0">
         <div class="form-group"><label>Ability 1</label><select name="a0">${abilityOptions(state.abilities[0])}</select></div>
         <div class="form-group"><label>Ability 2</label><select name="a1">${abilityOptions(state.abilities[1])}</select></div>
         <div class="form-group"><label>Ability 3</label><select name="a2">${abilityOptions(state.abilities[2])}</select></div>
         ${noHP
            ? `<p class="notes"><b>${noHP}</b>: no maximum HP from Levels.</p>`
            : `<div class="form-group"><label>Roll 1d8 for HP</label>
           <input type="checkbox" name="hp"${state.hp ? " checked" : ""}/></div>`}
       </fieldset>
       ${eligible.length < 3
          ? `<p class="notes">Only ${eligible.length} ${eligible.length === 1 ? "Ability is" : "Abilities are"}
             below +${ABILITY_CAP}. The rest cannot be raised further.</p>`
          : ""}`;

  return new Promise(resolve =>
  {
    let settled = false;
    new Dialog(
    {
      title: `Level Up — ${actor.name}, Level ${attained}`,
      content: `<form>${body}</form>`,
      buttons:
      {
        ok:    { icon: '<i class="fas fa-check"></i>', label: "Level Up", callback: html =>
        {
          settled = true;
          const picks = [0, 1, 2].map(i => html.find(`[name="a${i}"]`).val() || null);
          resolve(
          {
            branch: html.find('[name="branch"]').val() || "standard",
            abilities: beyond ? [null, null, null] : picks,
            hp: noHP ? false : (beyond ? true : html.find('[name="hp"]').is(":checked"))
          });
        }},
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => { settled = true; resolve(null); } }
      },
      default: "ok",
      close: () => { if(!settled) resolve(null); },
      render: html =>
      {
        const selects = [0, 1, 2].map(i => html.find(`[name="a${i}"]`));
        const branch = html.find('[name="branch"]');

        // Keep the three lists disjoint. Rebuilt from `eligible` each time
        // rather than hiding options, so a value freed by changing one
        // dropdown comes back in the other two.
        const resync = () =>
        {
          const chosen = selects.map(s => s.val());
          selects.forEach((s, i) =>
          {
            const mine = chosen[i];
            const taken = chosen.filter((v, j) => j !== i && v);
            s.html([`<option value="">—</option>`].concat(
              eligible.filter(k => k === mine || !taken.includes(k)).map(k =>
                `<option value="${k}">${ABILITY_LABEL[k]} (${actor.system.abilities[k].value})</option>`)
            ).join(""));
            s.val(mine || "");
          });
        };

        // A trade replaces the whole standard grant, so grey it out rather
        // than let someone fill in choices that will be discarded.
        const toggleBranch = () =>
        {
          const trading = branch.length && branch.val() !== "standard";
          html.find(".vaarn-levelup-standard").css("opacity", trading ? 0.4 : 1)
              .find("select, input").prop("disabled", !!trading);
        };

        selects.forEach(s => s.on("change", resync));
        branch.on("change", toggleBranch);
        resync();
        toggleBranch();
      }
    }).render(true);
  });
}

/**
 * Matt's flow, verbatim: "If OK and level-up choices all selected, subtract
 * [current level] from XP on the sheet, then advance level by one, then apply
 * level-up choices. If OK and level-up choices NOT complete, prompt warning.
 * Cancel here returns to dialog, Confirm behaves same as OK-with-completed."
 *
 * The loop is what makes "returns to dialog" true — a rejected warning
 * re-opens the dialog with the same choices still in it, rather than starting
 * over with an empty form.
 */
export async function openLevelUp(actor)
{
  if(!actor || actor.type !== "character") return;
  if(!levelUpAvailable(actor))
    return ui.notifications.warn(
      `${actor.name} has ${actor.system.xp.value} XP and needs ${xpCostFor(actor.system.level.value)} to level up.`);

  const trade = tradeFor(actor);
  const eligible = eligibleAbilities(actor);
  // Past Level 10 the dialog offers no choices at all, so there is nothing for
  // the completeness check below to be incomplete ABOUT. Found in testing
  // 2026-09-13 (151.13): without this the flat +1 HP level-up warned "0 of 3
  // Abilities chosen" every time, against three dropdowns that were never
  // rendered — and the level-up then sat waiting on a question nobody could
  // have meant to ask.
  const beyond = Number(actor.system.level.value) + 1 > COMPLETE_AT;
  let state = { branch: "standard", abilities: [null, null, null], hp: true };

  while(true)
  {
    const picked = await promptLevelUp(actor, state, eligible, trade);
    if(!picked) return;
    state = picked;

    if(beyond) break;
    if(state.branch !== "standard") break;

    const chosen = state.abilities.filter(Boolean);
    // Only nag about what could actually have been taken. A character with two
    // Abilities left below the cap has not left anything on the table by
    // picking two, and warning them every level would be noise.
    const wantedAbilities = Math.min(3, eligible.length);
    if(chosen.length >= wantedAbilities && (state.hp || noLevelHP(actor))) break;

    const missing = [];
    if(chosen.length < wantedAbilities)
      missing.push(`<li>${chosen.length} of ${wantedAbilities} Abilit${wantedAbilities === 1 ? "y" : "ies"} chosen</li>`);
    if(!state.hp && !noLevelHP(actor)) missing.push(`<li>the 1d8 HP roll is declined</li>`);

    const proceed = await Dialog.confirm({
      title: "Incomplete level-up",
      content: `<p>This level-up does not take everything it is entitled to:</p><ul>${missing.join("")}</ul>
                <p>Nothing gives it back later — the grant belongs to this level. Take it as it stands?</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if(proceed) break;
  }

  await applyLevelUp(actor, state);
}

/* -------------------------------------------- */
/* Applying a level                              */
/* -------------------------------------------- */

/**
 * HP MOVES BOTH WAYS WITH ITS CEILING. RULED 2026-09-13 (Matt): "treat all max
 * HP changes the same - if max goes up, current goes up with it. If max goes
 * down, current only goes down if it would be above max."
 *
 * So this matches item-effects.js's bake exactly rather than being a second
 * convention, and the asymmetry is deliberate: a gain moves both, a loss moves
 * the ceiling and lets the clamp catch current only if it is now out of range.
 *
 * This was built max-only first, on the argument that it was the only version
 * that round-trips a DAMAGED character — 3/8 levels for +5 and, losing that
 * level again, returns to 3/8 rather than 8/8. Matt was shown that consequence
 * and ruled for one rule across every max-HP change anyway. Recorded so the
 * argument is not rediscovered and quietly re-applied: the round trip really
 * does leave a wounded character better off, and that is the accepted cost of
 * not having two rules.
 *
 * NOT GATED ON Deprived State, for the reason item-effects.js sets out at
 * length: max and value move by the same amount, so the gap between them — the
 * LOST HP — is unchanged, and the book's clause is "cannot heal lost HP".
 * Gaining capacity restores nothing that was lost. Do not "fix" this by adding
 * a gate.
 */
export async function applyLevelUp(actor, state)
{
  const level = Number(actor.system.level.value);
  const attained = level + 1;
  const beyond = attained > COMPLETE_AT;

  const entry =
  {
    level: attained,
    branch: beyond ? "beyond" : state.branch,
    // What was ACTUALLY applied, per ability — not what was asked for. Same
    // reasoning as flags.vaarn.bakedEffects: the undo subtracts this, so a
    // choice the cap swallowed must record 0 rather than 1.
    abilities: {},
    hp: 0,
    // The exact tally spent, so the undo refunds exactly it. Not recomputed
    // from the level, because the deviation above means the two can differ if
    // the rule is ever changed back.
    xpSpent: xpCostFor(level),
    grantedItemIds: [],
    superseded: []
  };

  const updates =
  {
    "system.level.value": attained,
    "system.xp.value": Math.max(0, Number(actor.system.xp.value) - xpCostFor(level))
  };

  const lines = [];

  if(beyond && noLevelHP(actor))
  {
    entry.hp = 0;
    lines.push(`<li>No maximum HP — ${noLevelHP(actor)}. Complete at Level ${COMPLETE_AT}, so nothing else.</li>`);
  }
  else if(beyond)
  {
    entry.hp = BEYOND_HP;
    updates["system.health.max"] = Number(actor.system.health.max) + BEYOND_HP;
    updates["system.health.value"] = Number(actor.system.health.value) + BEYOND_HP;
    lines.push(`<li>Maximum HP +${BEYOND_HP} — complete at Level ${COMPLETE_AT}, so nothing else.</li>`);
  }
  else if(entry.branch === "standard")
  {
    for(const key of state.abilities.filter(Boolean))
    {
      const current = Number(actor.system.abilities[key].value);
      const capped = Math.min(ABILITY_CAP, current + 1);
      if(capped === current) continue;
      updates[`system.abilities.${key}.value`] = capped;
      entry.abilities[key] = capped - current;
      lines.push(`<li>${ABILITY_LABEL[key]} ${current} &rarr; ${capped}</li>`);
    }

    if(state.hp && !noLevelHP(actor))
    {
      const r = new Roll("1d8");
      await r.evaluate();
      entry.hp = r.total;
      updates["system.health.max"] = Number(actor.system.health.max) + r.total;
      updates["system.health.value"] = Number(actor.system.health.value) + r.total;
      lines.push(`<li>Maximum HP +${r.total} (1d8)${gmHP(actor, ` &rarr; ${updates["system.health.max"]}`)}</li>`);
    }
  }

  await actor.update(updates);

  if(entry.branch === "proteus")  lines.push(...await grantProteus(actor, entry));
  if(entry.branch === "bloomboon") lines.push(...await grantBloomboon(actor, entry));

  // Read fresh: the grants above create Items whose bake writes to the actor,
  // and the ledger must not be written from a stale copy of the array.
  const ledger = duplicate(actor.system.advancement ?? []);
  ledger.push(entry);
  await actor.update({ "system.advancement": ledger });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content:
      `<div class="vaarn-chat-card"><h3>Level ${attained}</h3>` +
      `<p><b>${actor.name}</b> reaches Level ${attained}, spending ${entry.xpSpent} XP` +
      ` (${updates["system.xp.value"]} left).</p>` +
      `<ul>${lines.join("")}</ul></div>`
  });
}

/**
 * "When you gain a Level you may roll for another mutation instead of
 * increasing HP and ability scores."
 *
 * Excludes the mutations the character already has, which is what
 * _rollMutations' own excludeRolls parameter was written for on 2026-09-07 and
 * has had no caller until now — "a duplicate is a re-roll, same as he'd call
 * it at the table" (Matt).
 */
async function grantProteus(actor, entry)
{
  const owned = actor.items.filter(i => i.type === "mutation")
    .map(i => Number(i.system.roll)).filter(Boolean);

  let roll;
  // MUTATION_TABLE is 100 long and a character cannot own all of it, but guard
  // the loop anyway rather than hang the client if that ever stops being true.
  if(owned.length >= MUTATION_TABLE.length) return [`<li>Every mutation is already taken — nothing to roll.</li>`];
  do { roll = d(100); } while(owned.includes(roll));

  const mutation = MUTATION_TABLE[roll - 1];
  const created = await actor.createEmbeddedDocuments("Item",
  [{
    name: mutation.name,
    type: "mutation",
    system: { slots: 0, roll, description: `<p><b>d100 roll:</b> ${roll}</p><p>${mutation.effect}</p>` }
  }],
  // The hook is suppressed and the function called directly below, because the
  // hook is fire-and-forget and this needs the snapshots it returns.
  { vaarnDeferSupersede: true });

  const item = created[0];
  entry.grantedItemIds.push(item.id);
  entry.superseded = (await supersedeUnarmedReplacers(item, {}, game.user.id)) ?? [];

  return [`<li>Proteus — <b>${mutation.name}</b> (d100 ${roll}), instead of HP and Abilities.</li>`];
}

/**
 * "When you gain a Level, you may choose to roll for a Boon instead of gaining
 * HP and increasing your ability scores. If a repeat result is rolled, take the
 * next Boon down."
 *
 * Note the repeat rule differs from the mutation one directly above: a repeat
 * mutation is re-rolled, a repeat Boon steps to the next row. Both are the
 * book's own wording and they are not the same rule.
 */
async function grantBloomboon(actor, entry)
{
  const table = SPARK_TABLES["Neobloom"]?.bloomboon_table ?? [];
  if(!table.length) return [`<li>No Bloomboon table found.</li>`];

  const owned = new Set(actor.items
    .filter(i => i.type === "ancestry" && i.system?.rule === "Bloomboons")
    .map(i => Number(i.system.roll)).filter(Boolean));

  if(owned.size >= table.length) return [`<li>Every Boon is already taken — nothing to roll.</li>`];

  let result = d(20);
  // "the next Boon down", wrapping at the end of the table so the last row is
  // not a dead end. The size check above is what stops this looping forever.
  while(owned.has(result)) result = (result % table.length) + 1;

  const boon = table.find(e => e.result === result);
  const def = (ANCESTRY_RULE_ITEMS["Neobloom"] ?? []).find(r => r.rule === "Bloomboons");

  const created = await actor.createEmbeddedDocuments("Item",
  [{
    name: `Bloomboons: ${boon.name}`,
    type: "ancestry",
    system:
    {
      slots: 0,
      rule: "Bloomboons",
      ancestry: "Neobloom",
      variant: boon.name,
      roll: result,
      description: `<p>${def?.text ?? ""}</p><p><b>${boon.name}:</b> ${boon.effect}</p><p><b>d20 roll:</b> ${result}</p>`
    }
  }]);

  entry.grantedItemIds.push(created[0].id);
  return [`<li>Bloomboons — <b>${boon.name}</b> (d20 ${result}), instead of HP and Abilities.</li>`];
}

/* -------------------------------------------- */
/* Losing a level                                */
/* -------------------------------------------- */

/**
 * Walks the ledger backwards, one entry per level lost.
 *
 * `zeroXp` is Terminal Memory Crystal Corruption's second clause — "You lose
 * one Level and all XP" — and it composes with the refund rather than fighting
 * it: the undo puts the spent XP back, then this wipes the tally, which is what
 * the wound says happens. A Kronophage drain, which says nothing about XP,
 * leaves the refund standing and the character exactly where they were.
 */
export async function loseLevels(actor, count = 1, { zeroXp = false, reason = "" } = {})
{
  if(!actor || actor.type !== "character") return;

  const ledger = duplicate(actor.system.advancement ?? []);
  const lines = [];
  let refused = false;

  for(let i = 0; i < count; i++)
  {
    const level = Number(actor.system.level.value);
    if(level <= 1) { refused = true; break; }

    const entry = ledger.pop();
    if(!entry)
    {
      // Should not happen for a PC: Level 1 is the only door in, so a
      // character above it has an entry for every level above it. Reported
      // rather than guessed at, because the alternative is inventing a
      // rollback out of nothing.
      await actor.update({ "system.level.value": level - 1 });
      lines.push(`<li>Level ${level} &rarr; ${level - 1}. <b>No record of what that level granted</b>,` +
                 ` so nothing else was undone.</li>`);
      continue;
    }

    await undoEntry(actor, entry);
    lines.push(`<li>Level ${entry.level} &rarr; ${entry.level - 1}${describeUndo(entry)}</li>`);
  }

  const updates = { "system.advancement": ledger };
  if(zeroXp) updates["system.xp.value"] = 0;
  await actor.update(updates);

  if(refused)
    lines.push(`<li><b>Level 1 is the floor.</b> Nothing below it is recorded, and whether a` +
               ` character drained past it still exists is the Referee's call.</li>`);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content:
      `<div class="vaarn-chat-card"><h3>Level lost</h3>` +
      (reason ? `<p>${reason}</p>` : "") +
      `<ul>${lines.join("")}</ul>` +
      (zeroXp ? `<p>XP tally wiped.</p>` : "") + `</div>`
  });
}

function describeUndo(entry)
{
  const parts = [];
  for(const [key, amount] of Object.entries(entry.abilities || {}))
    parts.push(`${ABILITY_LABEL[key]} &minus;${amount}`);
  if(entry.hp) parts.push(`maximum HP &minus;${entry.hp}`);
  if(entry.branch === "proteus")  parts.push("the Proteus mutation removed");
  if(entry.branch === "bloomboon") parts.push("the Boon removed");
  if(entry.superseded?.length) parts.push("the mutation it superseded restored");
  if(entry.xpSpent) parts.push(`${entry.xpSpent} XP refunded`);
  return parts.length ? ` — ${parts.join(", ")}.` : ".";
}

async function undoEntry(actor, entry)
{
  // Items first. Deleting a granted mutation fires reverseBakedItemEffects,
  // which unbakes exactly what its creation applied — that is why Baked Effect
  // Reversal had to land before this row could be built.
  //
  // THE COMPANION WEAPON GOES TOO, and it is not covered by the id list. The
  // bake creates a natural weapon as a SEPARATE Item after the fact, so it was
  // never in grantedItemIds, and nothing in module/ cascades a delete. Found in
  // testing 2026-09-13 (151.22): undoing a Proteus level left the character
  // holding a rollable Retractable Claws whose mutation was gone.
  const doomed = [];
  for(const id of entry.grantedItemIds || [])
  {
    const item = actor.items.get(id);
    if(!item) continue;
    doomed.push(id, ...companionWeaponsOf(actor, item.name, item.type).map(w => w.id));
  }
  // vaarnCompanionsHandled: the weapons are in this batch, so the deleteItem
  // reversal must neither look for them nor warn that it found none.
  if(doomed.length) await actor.deleteEmbeddedDocuments("Item", doomed, { vaarnCompanionsHandled: true });

  // Then put back whatever that grant superseded, bake suppressed, and
  // re-apply the delta the snapshot recorded rather than computing a new one.
  for(const snapshot of entry.superseded || [])
  {
    const [restored] = await actor.createEmbeddedDocuments("Item", [snapshot], { vaarnRestore: true });
    const applied = snapshot.flags?.vaarn?.bakedEffects;
    if(applied) await restoreBakedItemEffects(actor, applied);
    // The snapshot keeps its original id where Foundry allows it; where it does
    // not, nothing downstream holds that id — the ledger entry is being
    // discarded in the same breath.
    void restored;
  }

  const updates = { "system.level.value": entry.level - 1 };

  for(const [key, amount] of Object.entries(entry.abilities || {}))
    updates[`system.abilities.${key}.value`] = Number(actor.system.abilities[key].value) - amount;

  if(entry.hp)
  {
    const newMax = Number(actor.system.health.max) - entry.hp;
    updates["system.health.max"] = newMax;
    // "If max goes down, current only goes down if it would be above max"
    // (Matt, 2026-09-13) — the same half of the rule Baked Effect Reversal
    // already follows. Since the level-up raised current along with max, this
    // normally DOES fire; it is the wounded character, whose current is still
    // below the lowered ceiling, for whom it does not.
    if(Number(actor.system.health.value) > newMax) updates["system.health.value"] = newMax;
  }

  if(entry.xpSpent) updates["system.xp.value"] = Number(actor.system.xp.value) + entry.xpSpent;

  await actor.update(updates);
}


/* -------------------------------------------- */
/* Companion advancement                         */
/* -------------------------------------------- */

/**
 * Companion Advancement — a companion takes a Level and receives what its KIND
 * is granted. RENAMED from "Pet Advancement" 2026-09-19 (Matt) when Followers
 * were brought in: "with this interface, it would work just as well for
 * followers as pets."
 *
 * WHAT EACH KIND GETS, and the asymmetry is the book's, not a simplification:
 *
 *   Pet       — Pets.md: "+4 HP and add +1 slot to item carrying capacity.
 *                Their owner may choose one of the following advancement
 *                options" (damage dice a step, Morale +2, AV +1).
 *   Follower  — Followers.md: "advance at the same rate as PCs and gain +4 HP
 *                for each new Level." That is the whole sentence. No choice,
 *                and NO SLOT GRANT — Followers.md Burdens already sets their
 *                capacity at "10 + their Level", which item-slots.js derives
 *                live, so recording +1 on the ledger would double-count it the
 *                moment Container Slot Capacity reads that ledger.
 *   Mercenary — Mercenaries.md: they "do not gain Levels while in service".
 *   Steed     — the chapter states no advancement rule at all.
 *
 * Ability bonuses rise for both levelling kinds, taken from the Bestiary rule
 * rather than either chapter: "Creatures and NPCs have ability bonuses equal
 * to their Level." A Follower is an NPC.
 *
 * IN THIS FILE AND NOT A NEW ONE, deliberately. The XP cost, the ledger shape
 * and the undo are shared with a character's advancement, and a second copy of
 * any of them is the two-gates-that-agree-until-one-is-edited failure this
 * codebase warns about throughout. Claimed by Companion Advancement as well as
 * by Advancement Automation.
 *
 * THE LEDGER IS A FLAG, not system.advancement, which is on the `character`
 * template only. RULED 2026-09-13 (Matt): a flag needs no template.json change
 * and so no relaunch, and it matches the companion-link precedent — a property
 * a handful of actors have rather than one every actor has.
 */
// The flag key now lives on companion.js, so item-slots.js can read the ledger
// without importing this module. The writes below are unchanged.
const COMPANION_LEDGER = COMPANION_LEDGER_FLAG;

/**
 * JADE IBIS 15-09-26: "+4 HP" is stated separately by the Pets chapter and the
 * Followers chapter, with the same figure, so it is one constant. The three
 * maxima below belong to the pet's advancement CHOICE and are pet-only.
 */
const COMPANION_LEVEL_HP = 4;
const PET_MORALE_MAX = 12;
const PET_AV_MAX = 20;
const DIE_STEPS = [4, 6, 8, 10, 12];

/**
 * The kinds that can take a Level at all. A Mercenary and a Steed are absent
 * by rule, not by omission — see the header.
 */
export const LEVELLING_KINDS = ["pet", "follower"];

/** Could this creature ever level, XP aside? Drives whether the control is drawn. */
export function companionCanLevel(companion)
{
  return companion?.type === "npc" && LEVELLING_KINDS.includes(companionKindOf(companion));
}

/**
 * Every die in a damage formula one size up, each capped at d12. "2d6+1"
 * becomes "2d8+1"; a d12 stays a d12; a size off the ladder (a d20, a d5) is
 * left alone rather than guessed at.
 */
export function stepDice(formula)
{
  return String(formula ?? "").replace(/(\d*)d(\d+)/g, (m, n, size) =>
  {
    const i = DIE_STEPS.indexOf(Number(size));
    if(i < 0) return m;
    return `${n}d${DIE_STEPS[Math.min(i + 1, DIE_STEPS.length - 1)]}`;
  });
}

/** A pet's attacks: its weapon Items that roll a die. */
function petAttacks(companion)
{
  return companion.items.filter(i =>
    (i.type === "weaponMelee" || i.type === "weaponRanged") && /d\d/.test(i.system?.damageDice ?? ""));
}

/** The options still open to this pet - one at its maximum is not offered. */
export function petAdvancementOptions(companion)
{
  const out = [];
  if(petAttacks(companion).some(w => stepDice(w.system.damageDice) !== w.system.damageDice))
    out.push({ key: "damage", label: "Damage dice one step (maximum d12)" });
  if(Number(companion.system.morale?.value ?? 0) < PET_MORALE_MAX)
    out.push({ key: "morale", label: `Morale +2 (maximum ${PET_MORALE_MAX})` });
  if(Number(companion.system.armor?.value ?? 0) < PET_AV_MAX)
    out.push({ key: "av", label: `AV +1 (maximum ${PET_AV_MAX})` });
  return out;
}

/** The owner's pick, or null when the dialog is cancelled or closed. */
function askPetAdvancement(companion, options)
{
  const owner = ownerOf(companion);
  const radios = options.map((o, i) =>
    `<div><label><input type="radio" name="pick" value="${o.key}"${i === 0 ? " checked" : ""}> ${o.label}</label></div>`).join("");
  return new Promise(resolve =>
  {
    let picked = null;
    new Dialog(
    {
      title: `${companion.name} gains a Level`,
      content: `<form><p>+${COMPANION_LEVEL_HP} HP and +1 slot, and ${owner?.name ?? "its owner"} chooses one:</p>${radios}</form>`,
      buttons:
      {
        ok: { label: "Level Up", callback: html => { picked = html.find('input[name="pick"]:checked').val() || null; } },
        cancel: { label: "Cancel" }
      },
      default: "ok",
      close: () => resolve(picked)
    }).render(true);
  });
}

// companionLedger moved to companion.js 2026-09-20 so item-slots.js could read
// it without this module's import graph. Re-exported so level-loss.js and every
// other existing caller keeps importing it from here.
export { companionLedger };

/**
 * Can this companion take a level right now?
 *
 * PETS AND FOLLOWERS. RULED 2026-09-19 (Matt), reopening the pets-only ruling
 * made earlier the same day: "I'm not sure why I left Follower's advancement
 * table-run - with this interface, it would work just as well for followers as
 * pets." Followers.md states its own XP rule ("Followers may be given XP by
 * the PC who leads them"), so this is the book's rule reaching a surface that
 * already existed rather than a house rule.
 *
 * A Mercenary and a Steed stay out by rule, not by omission: Mercenaries "do
 * not gain Levels while in service", and the Steeds chapter states no
 * advancement at all. What a creature IS comes from companion.js's
 * companionKindOf - stamped by the pets pack, or set in the owner dialog.
 *
 * THE OWNER IS THE GATE, because both chapters put the XP in a PC's hands —
 * "when a PC would gain XP" for a pet, "given XP by the PC who leads them" for
 * a Follower. A creature nobody owns has no PC to trade against, so it cannot
 * level however much XP it is holding.
 */
export function companionLevelUpAvailable(companion)
{
  if(!companion || companion.type !== "npc") return false;
  if(!companionCanLevel(companion)) return false;
  if(!ownerOf(companion)) return false;
  return Number(companion.system.xp?.value ?? 0) >= xpCostFor(companion.system.level?.value ?? 0);
}

/**
 * Take one level on a companion.
 *
 * WHAT THE BOOK GRANTS - JADE IBIS 15-09-26, brought in 2026-09-19: "When
 * gaining a Level, pets gain +4 HP and add +1 slot to item carrying capacity.
 * Their owner may choose one of the following advancement options: Increase
 * pet's damage dice by one step (maximum d12). Increase pet's Morale by +2
 * (maximum 12). Increase pet's AV by +1 (maximum 20)." CRIMSON gave +1d8 and
 * held damage, Morale and AV unchanged. Ability bonuses follow the Bestiary's
 * own rule rather than this one: "Creatures and NPCs have ability bonuses
 * equal to their Level. Bonuses for very high Level creatures never exceed
 * +10."
 *
 * THE OWNER'S CHOICE, ruled 2026-09-19 (Matt): the damage option steps EVERY
 * attack's damage die up one size, each capped at d12 ("dice", plural); an
 * option already at its maximum is not offered; when none is left the level
 * is taken without a choice. What was chosen goes in the ledger entry with
 * the exact before/after values, so loseCompanionLevels undoes it exactly.
 *
 * EXTRA XP IS KEPT - only the Level's worth is spent, although the book says
 * "spends all XP". Ruled 2026-09-19 (Matt).
 *
 * ABILITIES RISE BY ONE RATHER THAN BEING ASSIGNED THE NEW LEVEL, and the
 * difference only shows on a creature a Referee has edited. That same book
 * sentence ends "unless modified by the Referee", so a hand-tuned score is
 * legitimate; assigning would silently discard it, while +1 keeps the
 * modification and still leaves an untouched creature exactly equal to its
 * Level. It also makes the undo exact, which is the whole point of the ledger.
 *
 * THE SLOT GRANT IS RECORDED HERE AND READ ELSEWHERE, which is what it was
 * always for. It was recorded and not applied from 2026-09-13, because
 * `itemSlots` lived in pets-data.js and steeds-data.js and never reached the
 * Actor, so there was no capacity to increment; the ruling that day was to
 * write it into the ledger anyway "and let Container Slot Capacity read the
 * accumulated total once it puts a live capacity on the actor".
 *
 * It does, since 2026-09-20. item-slots.js's cargoCapacityOf sums `slots`
 * across this ledger for a pet and adds whatever the stat block printed, and
 * buildSystem now carries that printed figure onto the Actor. THE LEDGER STAYS
 * THE SOURCE rather than the current Level: it is the only honest record of
 * levels GAINED, and a pet imported at Level 3 has gained none.
 */
export async function applyCompanionLevelUp(companion)
{
  if(!companionLevelUpAvailable(companion))
    return ui.notifications.warn(
      `${companion.name} has ${companion.system.xp?.value ?? 0} XP and needs ` +
      `${xpCostFor(companion.system.level?.value ?? 0)} to level up.`);

  // Companion Level Limit (2026-09-19). Asked BEFORE the advancement choice,
  // so a Referee who is going to decline the level is not first made to pick
  // what it would have granted.
  //
  // ONLY A PET OR A FOLLOWER REACHES HERE, which is why this is the whole of
  // the level-up gate: companionLevelUpAvailable returns false for any other
  // kind. A Mercenary "does not gain Levels while in service" and a Steed has
  // no advancement rule, so for those two there is nothing to gate. The
  // companion is excluded from its own pool: the scan would otherwise count it
  // at its current Level and this check again at its new one. Both limited
  // pools are capped the same way, so one check serves both kinds.
  const kind = companionKindOf(companion);
  const nextLevel = Number(companion.system.level?.value ?? 0) + 1;
  const limit = levelLimitCheck(ownerOf(companion), kind, nextLevel, companion);
  if(!await confirmOverLevelLimit(limit, `Levelling <b>${companion.name}</b> to Level ${nextLevel}`))
    return;

  // THE ADVANCEMENT CHOICE IS A PET RULE. The Pets chapter alone prints the
  // three options; Followers.md grants "+4 HP for each new Level" and stops,
  // so a Follower takes the level with no dialog at all — the same path a pet
  // with every option already at its maximum takes.
  //
  // Asked BEFORE anything is written, so a cancelled choice takes no level.
  const isPet = kind === "pet";
  const options = isPet ? petAdvancementOptions(companion) : [];
  let choice = null;
  if(options.length)
  {
    choice = await askPetAdvancement(companion, options);
    if(!choice) return;
  }

  const level = Number(companion.system.level.value);
  const attained = level + 1;
  // THE SLOT GRANT IS A PET RULE TOO, and a Follower must not get it even
  // though its capacity does rise: Followers.md Burdens sets that capacity at
  // "10 + their Level", which item-slots.js derives live from the Level this
  // very update writes. Recording +1 here as well would be counted twice the
  // moment Container Slot Capacity reads the ledger.
  const entry = { level: attained, xpSpent: xpCostFor(level), hp: 0, slots: isPet ? 1 : 0, abilities: {} };

  const updates =
  {
    "system.level.value": attained,
    "system.xp.value": Math.max(0, Number(companion.system.xp.value) - entry.xpSpent)
  };

  entry.hp = COMPANION_LEVEL_HP;
  updates["system.health.max"] = Number(companion.system.health.max) + COMPANION_LEVEL_HP;
  // Current rises with maximum, which is the one rule for every max-HP change
  // in this system — see Advancement Automation. A level-up that moved only the
  // ceiling would leave a healthy companion looking wounded.
  updates["system.health.value"] = Number(companion.system.health.value) + COMPANION_LEVEL_HP;

  const lines = [`<li>Maximum HP +${COMPANION_LEVEL_HP} &rarr; ${updates["system.health.max"]}</li>`];

  for(const key of ["str", "dex", "con", "int", "psy", "ego"])
  {
    const current = Number(companion.system.abilities[key].value);
    const capped = Math.min(ABILITY_CAP, current + 1);
    if(capped === current) continue;
    updates[`system.abilities.${key}.value`] = capped;
    entry.abilities[key] = capped - current;
  }
  const raised = Object.keys(entry.abilities).length;
  lines.push(raised
    ? `<li>All ability bonuses +1 — a creature's bonuses equal its Level</li>`
    : `<li>Ability bonuses already at +${ABILITY_CAP}, the ceiling for any creature</li>`);
  // Both are live since Container Slot Capacity landed 2026-09-20, and they
  // still read differently because they ARE different: a Follower's capacity
  // is 10 + Level and follows the Level on its own, while a pet's is the sum
  // of the grants in this ledger on top of whatever its stat block printed.
  // The pet line no longer says nothing reads it, because something does.
  lines.push(isPet
    ? `<li>Carrying capacity +1 slot <i>(cargo; stowed gear does not weigh on its owner)</i></li>`
    : `<li>Carrying capacity now ${10 + attained} slots <i>(10 + Level, and it follows the Level on its own)</i></li>`);

  // The owner's choice. System fields ride the same update as the level;
  // the damage option rewrites the attack Items after it.
  let stepped = [];
  if(choice === "morale")
  {
    const from = Number(companion.system.morale?.value ?? 0);
    const to = Math.min(PET_MORALE_MAX, from + 2);
    updates["system.morale.value"] = to;
    entry.option = { kind: "morale", from, to };
    lines.push(`<li>Morale +${to - from} &rarr; +${to}</li>`);
  }
  else if(choice === "av")
  {
    const from = Number(companion.system.armor?.value ?? 0);
    const to = Math.min(PET_AV_MAX, from + 1);
    updates["system.armor.value"] = to;
    entry.option = { kind: "av", from, to };
    lines.push(`<li>AV +1 &rarr; ${to}</li>`);
  }
  else if(choice === "damage")
  {
    stepped = petAttacks(companion)
      .map(w => ({ id: w.id, name: w.name, from: w.system.damageDice, to: stepDice(w.system.damageDice) }))
      .filter(x => x.to !== x.from);
    entry.option = { kind: "damage", items: stepped.map(({ id, from, to }) => ({ id, from, to })) };
    lines.push(`<li>Damage dice one step: ${stepped.map(x => `${x.name} ${x.from} &rarr; ${x.to}`).join(", ")}</li>`);
  }

  await companion.update(updates);
  if(stepped.length)
    await companion.updateEmbeddedDocuments("Item", stepped.map(x => ({ _id: x.id, "system.damageDice": x.to })));
  await companion.setFlag("vaarn", COMPANION_LEDGER, [...companionLedger(companion), entry]);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: companion }),
    content:
      `<div class="vaarn-chat-card"><h3>Level ${attained}</h3>` +
      `<p><b>${companion.name}</b> reaches Level ${attained}, spending ${entry.xpSpent} XP` +
      ` (${updates["system.xp.value"]} left).</p>` +
      `<ul>${lines.join("")}</ul></div>`
  });
}

/**
 * Undo companion levels, newest first, replaying the ledger exactly.
 *
 * Same contract as loseLevels: put the creature back where it was, refunding
 * what each level cost. A companion CAN return to Level 0 — that is where
 * Exultant's Hawk starts — so this floors at 0 rather than at 1, which is the
 * one place it deliberately differs from the character path.
 */
export async function loseCompanionLevels(companion, count = 1, { reason = "" } = {})
{
  const lines = [];
  for(let i = 0; i < count; i++)
  {
    const ledger = companionLedger(companion);
    const entry = ledger.pop();
    if(!entry) { lines.push(`<li><b>No record of a level to undo.</b></li>`); break; }

    const updates =
    {
      "system.level.value": entry.level - 1,
      "system.xp.value": Number(companion.system.xp.value) + (entry.xpSpent ?? 0),
      "system.health.max": Math.max(0, Number(companion.system.health.max) - (entry.hp ?? 0))
    };
    // Clamp rather than subtract: a companion damaged since the level-up must
    // not have the loss taken twice. Same reasoning as the character path.
    updates["system.health.value"] =
      Math.min(Number(companion.system.health.value), updates["system.health.max"]);

    for(const [key, delta] of Object.entries(entry.abilities ?? {}))
      updates[`system.abilities.${key}.value`] =
        Number(companion.system.abilities[key].value) - delta;

    // The owner's choice (JADE, 2026-09-19), put back to the value it held
    // before the level. An entry written before the choice existed has no
    // `option` and undoes exactly as it always did. An attack Item deleted
    // since the level is skipped rather than recreated.
    const option = entry.option;
    if(option?.kind === "morale") updates["system.morale.value"] = option.from;
    if(option?.kind === "av") updates["system.armor.value"] = option.from;

    await companion.update(updates);
    if(option?.kind === "damage")
    {
      const back = (option.items ?? []).filter(x => companion.items.get(x.id))
        .map(x => ({ _id: x.id, "system.damageDice": x.from }));
      if(back.length) await companion.updateEmbeddedDocuments("Item", back);
    }
    await companion.setFlag("vaarn", COMPANION_LEDGER, ledger);
    lines.push(`<li>Level ${entry.level} &rarr; ${entry.level - 1}, ${entry.xpSpent} XP refunded,` +
               ` maximum HP -${entry.hp}, ${entry.slots ?? 0} slot(s) taken back</li>`);
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: companion }),
    // `reason` added 2026-09-14 with Referee-Invoked Level Loss, matching what
    // loseLevels has always carried. A level taken by a Referee's ruling needs
    // to say why on the card; a level taken by content already does, because
    // the content names itself.
    content: `<div class="vaarn-chat-card"><h3>${companion.name} loses a level</h3>`
           + (reason ? `<p>${reason}</p>` : "")
           + `<ul>${lines.join("")}</ul></div>`
  });
}
