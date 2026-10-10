/**
 * The interpreter - Effect Engine: Interpreter and Mystic Gifts
 * (foundry-system-index.csv "Effect Engine: Interpreter and Mystic Gifts",
 * BUILD PLAN RULED 2026-10-05 by Matt), chunk 1.
 *
 * runUse() resolves one "use" sentence on an Item, in a fixed order:
 *   1. refusals - the sentence is sound and uses only handled words, the Item
 *      is in the state the use requires, it is not suppressed, and a
 *      Planeyfolk has attuned it (Foundations ruling 4: suppressed and
 *      unattuned block a use whatever the state);
 *   2. the cost - an hp cost rolls its die and is paid through the HP funnel
 *      as a cost, skipping damage rules (RULED 2026-10-04);
 *   3. the rolls - each distinct dice expression once, with @cost and the
 *      ability variables filled in (interpret.js fillFormula);
 *   4. each option in its resolve mode:
 *        damage / heal - card: one effect card (effect-card.js), posted only
 *                        when tokens were targeted; auto: applied at once;
 *                        reminder: a line with the figure;
 *        condition     - card: one Apply card per target (none captured posts
 *                        one for the Referee to target); auto: applied at once;
 *        reminder      - a chat line quoting the sentence's text; with a
 *                        duration it lasts, and is applied as a condition is.
 *
 * The decisions are in interpret.js, which is pure and tested offline; this
 * file only acts on them.
 */
import { planUse, typesFor, fillFormula, readableFormula, conditionSpec, isTargetGate, sentencesOf, meetsState, resolveStatAmount, verbLabel } from "./interpret.js";
import { normalise } from "./sentence.js";
import { itemStateDefault } from "./vocabulary.js";
import { settleGates, passiveGatesHold } from "./gates.js";
import { postApplyCard, applyEffectToActor } from "../combat/apply-to-target.js";
import { postEffectCard } from "./effect-card.js";
import { dealDamage } from "./deal.js";
import { applyHeal } from "../actor/healing-field.js";
import { isSuppressed } from "../item/suppression.js";
import { needsAttunementToUse, needsAttunement, refusalFor } from "../item/attunement.js";
import { postSaveCard, postToxSaves } from "../combat/compelled-save.js";
import { rollUsageDie } from "../item/usage-die.js";
import { usesLeft } from "../actor/daily-pool.js";
import { isBroken } from "../item/broken.js";
import { displayNameOf } from "../item/display-name.js";

/** The verbs a use says to its targets and leaves to the table (Widening chunk 3d, RULED 2026-10-09). */
const SAY_VERBS = new Set(["teleport", "forced-move", "reveal", "conceal"]);

const ABILITIES = ["str", "dex", "con", "int", "psy", "ego"];

/**
 * The named one-off handlers (Mutations and Ancestry Rules chunk 4): a
 * `special` use runs the function registered under its handler name, with
 * { actor, item, sentence, params, event, targets }. Registered by the module
 * that owns the behaviour (module/actor/body-uses.js). A hoisted function
 * holding the table, for the load-order reason interpret.js's translators()
 * gives.
 */
function useHandlers()
{
  if (!useHandlers.table) useHandlers.table = {};
  return useHandlers.table;
}

export function registerUseHandler(name, fn)
{
  useHandlers()[name] = fn;
}

function abilitiesOf(actor)
{
  const out = {};
  for (const a of ABILITIES) out[a] = actor?.system?.abilities?.[a]?.effective ?? null;
  return out;
}

async function say(actor, content)
{
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/**
 * Resolve one use. `ctx`: { targets (Token placeables; defaults to the user's
 * targets), costDie, sustained }. Returns { refused } or { plan, rolled }.
 */
export async function runUse(actor, item, sentence, ctx = {})
{
  const plan = planUse(item, sentence, ctx);
  // What the use's cards are titled by: the Item's name, or for an ancestry rule
  // the entry its sentence came from - a Bloomboon's variant, not "Bloomboons"
  // (Effect Engine: Consumables chunk 3b ruling 2, 2026-10-06).
  const source = item?.type === "ancestry" ? (normalise(sentence).tag ?? item.name) : item.name;
  let refused = plan.refused;
  if (!refused && isSuppressed(item)) refused = "it is suppressed";
  // Broken Item State (RULED 2026-10-06, Matt): every use of a broken Item is refused.
  if (!refused && isBroken(item)) refused = "it is broken";
  // The sheet asks the Referee before an Exotica use (its attunement dialog), so
  // a use the Referee has just allowed is not refused here again (chunk 3b).
  if (!refused && !ctx.attunementChecked && needsAttunementToUse(actor, item)) refused = refusalFor(actor, item, "use");
  if (refused)
  {
    ui.notifications.warn(`${item.name}: ${refused}.`);
    return { refused };
  }

  // 1b. Gates about the user or the moment (darkness, charging, in combat)
  // are settled before anything is paid: a use that cannot happen costs
  // nothing (Weapon Tags chunk 1). Gates about a target filter the targets
  // after the cost, below.
  const gates = normalise(sentence).if ?? [];
  const once = await settleGates(gates.filter(g => !isTargetGate(g)), { actor, title: item.name });
  const assumed = [...once.lines];
  if (!once.pass)
  {
    await say(actor, `<p><b>${item.name}</b> — its conditions do not hold, so it is not used.</p>${assumed.map(l => `<p class="notes">${l}</p>`).join("")}`);
    return { refused: "gates" };
  }

  // 2a. A per-day cost (Mutations and Ancestry Rules chunk 4, RULED 2026-10-06):
  // one use from the Item's daily pool, which daily-pool.js sizes and a Long
  // Rest or the refresh control refills. An empty pool refuses the use.
  if (plan.perDay)
  {
    const left = usesLeft(actor, item);
    if (left <= 0)
    {
      await say(actor, `<b>${actor.name}</b> has no uses of <b>${displayNameOf(item)}</b> left today.`);
      return { refused: "no uses left today" };
    }
    await item.update({ "system.usesRemaining": left - 1 });
  }

  // 2b. An Exotica's usage-die roll (Implants, Exotica and Figments chunk 3b):
  // rolled before its effect, as the sheet always did; an expended one is
  // removed after the effect (below).
  let expended = false;
  if (plan.usageDie)
  {
    const result = await rollUsageDie(item, actor);
    expended = result?.newDie === "expended";
  }

  // 2c. The use's own line (chunk 3b, RULED 2026-10-06: the hand-written lines kept).
  if (plan.says) await say(actor, `<b>${actor.name}</b> ${plan.says}`);

  // 2. The cost. A cost is not damage: it skips the damage-type table and
  // every multiplier, and goes straight to the funnel (RULED 2026-10-04).
  if (plan.costDie)
  {
    const costRoll = new Roll(plan.costDie);
    costRoll.evaluate({ async: false });
    await costRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<b>${item.name}</b> — HP cost` });
    const current = actor.system.health.value;
    actor.sheet._resolveHPChange(actor, current, current - costRoll.total);
  }

  // 3. The rolls - one per distinct expression, so an "Other use" offering
  // damage or healing rolls once and offers that one figure both ways.
  const abilities = abilitiesOf(actor);
  const rolled = {};
  for (const expr of plan.rolls)
  {
    const { formula, missing } = fillFormula(expr, { cost: plan.costDie, abilities });
    if (missing.length) { ui.notifications.warn(`${item.name}: no value for ${missing.join(", ")}.`); return { refused: "missing value" }; }
    const roll = new Roll(formula);
    roll.evaluate({ async: false });
    const low = new Roll(formula);
    low.evaluate({ async: false, minimize: true });
    const labels = plan.options.filter(o => o.expr === expr).map(o => o.label);
    const what = plan.options.length > 1 && labels.length === plan.options.length ? "effect" : labels.join(" or ");
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }),
                           flavor: `<b>${item.name}</b> — ${what} (${readableFormula(expr, plan.costDie)})` });
    rolled[expr] = { total: roll.total, min: low.total };
  }

  // 4. Each option in its mode.
  const self = actor.getActiveTokens?.()[0] ?? actor;
  // Gates about a target, settled per target: a target they fail is left out
  // of every option of this use.
  const targetGates = gates.filter(g => isTargetGate(g));
  const keep = async list =>
  {
    if (!targetGates.length) return list;
    const kept = [];
    for (const t of list)
    {
      const r = await settleGates(targetGates, { actor, target: t, title: item.name });
      assumed.push(...r.lines);
      if (r.pass) kept.push(t);
    }
    return kept;
  };
  const chosen = plan.target === "self" ? [] : Array.from(ctx.targets ?? game.user?.targets ?? []);
  const userTargets = await keep(chosen);
  const targets = plan.target === "self" ? await keep([self]) : userTargets;
  if (assumed.length) await say(actor, assumed.map(l => `<p class="notes"><b>${item.name}</b>: ${l}</p>`).join(""));
  const actorOfTarget = t => t?.actor ?? t;

  const cardOptions = [];
  let keepCharge = false;
  for (let option of plan.options)
  {
    const figure = option.expr ? rolled[option.expr] : null;
    // An escalating beam is chunk 4a's branch below, not plain damage (Group 620: it dealt its 1 and started nothing).
    if ((option.verb === "damage" && !option.params?.escalating) || option.verb === "heal")
    {
      const types = option.verb === "damage" ? typesFor(option, plan.rules) : null;
      if (option.mode === "card") { cardOptions.push({ verb: option.verb, amount: figure.total, min: figure.min, types, label: option.label }); continue; }
      // The book's words follow the figure (the Combat Voxbox's Morale Save,
      // Implants, Exotica and Figments chunk 3a, 2026-10-06).
      if (option.mode === "reminder") { await say(actor, `<p><b>${item.name}</b> — ${option.label}: ${figure.total}.</p>${option.text ? `<p>${option.text}</p>` : ""}`); continue; }
      // Nothing targeted: said, as the Wand of Annihilation's strike said it (chunk 3b).
      if (!targets.length && plan.target !== "self") await say(actor, `<b>${item.name}</b>: no target is selected, so nothing was struck.`);
      for (const t of targets)
      {
        const target = actorOfTarget(t);
        if (option.verb === "damage")
          dealDamage(target, figure.total, { source: actor, item: types ? item : null, types, min: figure.min, name: item.name });
        else if (!plan.rules.healsUser && target.uuid === actor.uuid)
          await say(actor, `<b>${target.name}</b> — Gifts cannot heal their user's HP.`);
        else
        {
          const line = await applyHeal(target, figure.total, `<b>${item.name}</b>`);
          if (line) await say(actor, `<b>${target.name}</b> ${line}`);
        }
      }
    }
    else if (option.verb === "special")
    {
      // A named one-off (chunk 4): the handler does the work, after the gates
      // and the cost above.
      const handler = useHandlers()[option.special.handler];
      if (!handler) { ui.notifications.warn(`${item.name}: no handler "${option.special.handler}" is loaded.`); continue; }
      const result = await handler({ actor, item, sentence: normalise(sentence), params: option.special, event: ctx.event ?? null, targets });
      // A handler that did not happen keeps its charge (a refused drink, chunk 3b).
      if (result?.keep) keepCharge = true;
    }
    else if (option.verb === "toxin")
    {
      // A TOX save for each creature targeted, or one open card (Mord-Red's
      // Grail, chunk 3b) - compelled-save.js's TOX route.
      await postToxSaves(actor, item.name, option.die);
    }
    else if (plan.resist && ["condition", "reminder", "ability-damage", "kill"].includes(option.verb))
    {
      // A save on a use (chunk 4): the targets roll, and a failure puts the
      // condition on (compelled-save.js). One target takes the first chosen.
      // Nothing chosen posts one open card; chosen targets the gates all left
      // out post nothing and say nothing (RULED 2026-10-06, Matt).
      if (!plan.says) await say(actor, `<p><b>${item.name}</b></p><p>${option.text ?? ""}</p>`);
      const { save, applies } = plan.resist;
      const list = plan.target === "one-target" ? targets.slice(0, 1) : targets;
      const onFail = applies ? [applies] : [];
      if (!chosen.length) await postSaveCard(actor, source, [save], [], { applies: onFail });
      for (const t of list) await postSaveCard(actor, source, [save], [], { token: t, applies: onFail });
    }
    else if (option.verb === "temp-hp" || option.verb === "cure" || option.verb === "remove-wound" || option.verb === "level"
             || (option.verb === "modify" && option.params?.stat === "armour-damage") || (option.verb === "damage" && option.params?.escalating))
    {
      // Gift Effect Library chunk 4a (RULED 2026-10-09): each the effect card's
      // Apply per target - temporary HP (never a heal), a cure (the Toxin Die
      // stepped down PSY steps, an affliction chosen on Apply, a fire put out),
      // a wound closed (chosen on Apply), a Level drained (no gain for the
      // user), armour eroded by PSY, the escalating beam started at 1.
      const psy = Number(abilities.psy ?? 0);
      const stepsOf = v => { const { formula, missing } = fillFormula(String(v ?? "@psy"), { cost: plan.costDie, abilities }); return missing.length ? 1 : Math.max(1, Number(formula) || 0); };
      if (option.verb === "modify")
      {
        const resolved = await resolveStatAmount(option.params, { cost: plan.costDie, abilities, roll: async f => (await new Roll(f).evaluate({ async: true })).total });
        cardOptions.push({ verb: "armour-damage", amount: Math.abs(Number(String(resolved.amount).replace(/^\+/, "")) || 0), min: 0, label: option.label });
      }
      else if (option.verb === "damage")
        cardOptions.push({ verb: "escalating", amount: Number(option.params.dice) || 1, min: 0, factor: Number(option.params.escalating?.factor) || 2, label: option.label });
      else if (option.verb === "temp-hp")
        cardOptions.push({ verb: "temp-hp", amount: figure?.total ?? 0, min: figure?.min ?? 0, label: option.label });
      else if (option.verb === "cure")
        cardOptions.push({ verb: "cure", what: option.params.what, amount: option.params.what === "tox" ? stepsOf(option.params.steps) : 0, min: 0, label: option.label });
      else if (option.verb === "remove-wound")
        cardOptions.push({ verb: "remove-wound", amount: Number(option.params.count) || 1, min: 0, label: option.label });
      else
        cardOptions.push({ verb: "level", amount: Math.abs(Number(String(option.params.amount).replace(/^\+/, "")) || 1), min: 0, label: option.label });
      void psy;
    }
    else if (option.verb === "ability-damage" || option.verb === "kill")
    {
      // Widening chunk 3a (RULED 2026-10-09, card as the default to test): the
      // effect card's Apply deals the rolled ability loss, or the death, to each
      // target - a resisted one went through the save cards above.
      cardOptions.push({ verb: option.verb, ability: option.params?.ability ?? null,
                         amount: figure?.total ?? 0, min: figure?.min ?? 0, label: option.label });
    }
    else if (SAY_VERBS.has(option.verb))
    {
      // Widening chunk 3d: a teleport, a forced move, a reveal or a conceal is
      // said to its targets in the sentence's words - the table does the rest.
      const names = targets.map(t => actorOfTarget(t).name).join(", ");
      await say(actor, `<p><b>${item.name}</b> — ${option.label}${names ? ` → <b>${names}</b>` : ""}</p>${option.text ? `<p>${option.text}</p>` : ""}`);
    }
    else if (option.verb === "condition" || (option.verb === "reminder" && option.lasting) || ["compel", "modify", "auto-hit", "ignore-armour", "grant-attack", "bestow"].includes(option.verb))
    {
      // A lasting reminder is a board entry with no mechanics, applied the
      // way a condition is - a named Gift effect that is no registered state.
      // A stat change's formula amount (+@psy, @cost+@psy, dice) is filled and rolled now
      // (Gift Effect Library chunk 2): the entry carries the number.
      if (option.verb === "modify" && option.params)
      {
        // The dice shown in chat, as a damage roll is (Group 618: a +4 with no roll to read).
        const rollShown = async f =>
        {
          const r = await new Roll(f).evaluate({ async: true });
          await r.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<b>${item.name}</b> — ${option.label} (${readableFormula(String(option.params.amount).replace(/^[+-]/, ""), plan.costDie)})` });
          return r.total;
        };
        const resolved = await resolveStatAmount(option.params, { cost: plan.costDie, abilities, roll: rollShown });
        if (resolved.missing?.length) { ui.notifications.warn(`${item.name}: no value for ${resolved.missing.join(", ")}.`); continue; }
        option = { ...option, params: resolved, label: option.label === verbLabel(option.params) ? verbLabel(resolved) : option.label };
      }
      const spec = conditionSpec(option, source);
      // A dice span (the Dopplegun's d6 rounds, the Phase Cape's d4) rolled now, as the
      // apply card always rolled it (Implants, Exotica and Figments chunk 3b).
      if (!Number.isFinite(spec.rounds) && option.clock.amount)
        spec.rounds = (await new Roll(String(option.clock.amount)).evaluate({ async: true })).total;
      // A stat change (Widening chunk 3b, RULED 2026-10-09): applied at once on
      // the user, a card with Apply on a target - by the target, not a stored mode.
      const mode = ["modify", "auto-hit", "ignore-armour", "grant-attack", "bestow"].includes(option.verb) ? (plan.target === "self" ? "auto" : "card") : option.mode;
      if (mode === "auto")
      {
        for (const t of targets) await applyEffectToActor(actorOfTarget(t), { ...spec, sourceActorId: actor.id });
        // Named, unless the use said its own line (the Phase Cape; chunk 3b).
        if (!plan.says && targets.length) await say(actor, `<b>${item.name}</b> — ${spec.name} on ${targets.map(t => actorOfTarget(t).name).join(", ")}.`);
      }
      else
        for (const t of targets.length ? targets : [null]) await postApplyCard({ source: actor, spec, target: t });
    }
    else if (option.verb === "reminder")
    {
      // Only a label set by hand heads the text: an unlabelled entry's label
      // IS its text, and would print it twice (found in Group 483).
      const head = option.label && option.label !== option.text ? ` — ${option.label}` : "";
      // A use with its own line has said it (chunk 3b).
      if (!plan.says) await say(actor, `<p><b>${item.name}</b>${head}</p><p>${option.text ?? ""}</p>`);
    }
  }
  // 5. What the use leaves behind (Implants, Exotica and Figments chunk 3b): a
  // charge spent - the Item gone at none - unless a handler kept it; an
  // Exotica whose usage die is expended removed. An Exotica helm's die just
  // sits expended, as it always did.
  const usedUp = async () =>
  {
    await say(actor, `<b>${item.name}</b> is used up and removed from ${actor.name}'s inventory.`);
    await item.delete();
  };
  if (plan.charge && !keepCharge)
  {
    const remaining = Number(item.system?.usesRemaining ?? 0) - 1;
    if (remaining <= 0) await usedUp();
    else await item.update({ "system.usesRemaining": remaining });
  }
  if (expended && item.type === "exotica" && actor.items.get(item.id)) await usedUp();
  // An Elixir's vial (Consumables chunk 3a): spent by the drink, unless a handler
  // kept it (a refused drink). A handler that already removed it is done.
  if (plan.consumed && !keepCharge && actor.items.get(item.id)) await item.delete();
  // A card with nobody to apply it to is not posted; say so rather than nothing (Widening chunk 3a).
  if (cardOptions.length && !targets.length)
    await say(actor, `<b>${item.name}</b>: no target is selected, so there is nothing to apply it to.`);
  if (cardOptions.length)
    await postEffectCard(actor, item, { label: plan.options.length === 1 ? plan.label : "", options: cardOptions,
                                        targets, healsUser: plan.rules.healsUser });

  return { refused: null, plan, rolled };
}

/**
 * The passive sentences in force on an actor - Weapon Tags chunk 1 (RULED
 * 2026-10-05). A passive holds while its Item is in its state (the sentence's
 * own, else the Item type's default: installed, equipped or carried), is not
 * suppressed, is attuned where the bearer attunes, and its gates hold -
 * settled without asking anyone (gates.js passiveGatesHold). `verb` narrows
 * the list to one verb, which is how a reader (an AV total, a roll's ADV)
 * asks for what it needs. Returns [{ item, sentence }].
 */
export function activePassives(actor, { verb = null } = {})
{
  const out = [];
  for (const item of actor?.items ?? [])
    for (const sentence of sentencesOf(item))
    {
      if (sentence.when?.trigger !== "passive") continue;
      if (verb && sentence.do?.verb !== verb) continue;
      if (!meetsState(item, sentence.state ?? itemStateDefault(item.type))) continue;
      if (isSuppressed(item) || needsAttunement(actor, item)) continue;
      if (!passiveGatesHold(sentence.if, { actor })) continue;
      out.push({ item, sentence });
    }
  return out;
}
