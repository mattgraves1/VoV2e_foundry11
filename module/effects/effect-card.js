/**
 * The effect card - Effect Engine: Interpreter and Mystic Gifts, chunk 1
 * (foundry-system-index.csv "Effect Engine: Interpreter and Mystic Gifts",
 * BUILD PLAN RULED 2026-10-05 by Matt).
 *
 * The card a damage or heal sentence posts in card mode: the rolled figure,
 * the targets captured at the use, and one button per option. It is the Mystic
 * Gift card (combat/gift-damage.js, RULED 2026-09-26) made general, keeping
 * every rule that card had:
 *
 *  - posted only when tokens were targeted at the use;
 *  - ONCE PER CARD, recorded on the message, so an F5 cannot apply it twice;
 *  - pressed by the owner of the effect's source or the Referee (engine
 *    ruling A, 2026-10-04: the owner of the source applies the result);
 *  - damage runs the whole pipeline (dealDamage) with the user as the source,
 *    so a target that rebounds the damage's property (Psychic Mirror) throws
 *    it back there, as every other rebound does;
 *  - healing runs the one heal path, skipping the user when the source's rules
 *    say it cannot heal its user (a Gift).
 *
 * Old Gift cards already in a world's chat carry gift-damage.js's own flag and
 * are still handled there.
 */
import { dealDamage } from "./deal.js";
import { applyHeal } from "../actor/healing-field.js";
import { dealDeath } from "../combat/compelled-save.js";

const SCOPE = "vaarn";
export const EFFECT_CARD_FLAG = "effectCard";

/**
 * Post the card. `options`: [{ verb: "damage"|"heal", amount, min, types,
 * label }]. `targets` are Token placeables. Returns the message, or null.
 */
export async function postEffectCard(actor, item, { label = "", options = [], targets = [], healsUser = true } = {})
{
  if (!targets?.length || !options.length) return null;
  const spec = {
    actorUuid: actor.uuid, itemId: item.id, itemName: item.name, label,
    // ability (Widening chunk 3a): an ability-damage option's ability; a kill carries no figure.
    options: options.map(o => ({ verb: o.verb, amount: Math.max(0, o.amount), min: Math.max(0, o.min ?? o.amount),
                                 types: o.types ?? null, label: o.label ?? "", ability: o.ability ?? null,
                                 // Chunk 4a: a cure's what, an escalation's factor.
                                 what: o.what ?? null, factor: o.factor ?? null })),
    targets: targets.map(t => ({ uuid: t.document?.uuid ?? t.actor?.uuid ?? t.uuid, name: t.name ?? t.actor?.name })),
    healsUser, applied: null
  };
  const names = spec.targets.map(t => `<b>${t.name}</b>`).join(", ");
  const UNFIGURED = new Set(["kill", "cure", "remove-wound", "level", "escalating"]);
  const figured = spec.options.filter(o => !UNFIGURED.has(o.verb));
  const amounts = new Set(figured.map(o => o.amount));
  const one = figured.length === spec.options.length && amounts.size === 1;
  const buttons = spec.options.map((o, i) =>
  {
    const typed = (o.types ?? []).filter(t => t !== "gift").join(" ");
    if (o.verb === "kill") return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply: killed outright</button>`;
    // Chunk 4a: the Apply says what it does, in the card's own words.
    if (o.verb === "temp-hp") return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply ${one ? "" : o.amount + " "}as temporary HP</button>`;
    if (o.verb === "armour-damage") return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply: ${o.amount} AV of armour eroded</button>`;
    if (o.verb === "escalating") return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply: ${o.amount} damage now, x${o.factor} each round</button>`;
    if (o.verb === "cure") return `<button type="button" class="vaarn-effect-apply" data-option="${i}">${o.what === "tox" ? `Apply: Toxin Die down ${o.amount} step${o.amount === 1 ? "" : "s"}` : o.what === "burning" ? "Apply: put out the fire" : "Apply: cure an affliction..."}</button>`;
    if (o.verb === "remove-wound") return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply: close a wound...</button>`;
    if (o.verb === "level") return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply: drain ${o.amount} Level${o.amount === 1 ? "" : "s"}</button>`;
    const what = o.verb === "heal" ? "healing" : o.verb === "ability-damage" ? `${String(o.ability ?? "").toUpperCase()} damage` : `${typed ? typed + " " : ""}damage`;
    return `<button type="button" class="vaarn-effect-apply" data-option="${i}">Apply ${one ? "" : o.amount + " "}as ${what}</button>`;
  });
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><b>${item.name}</b>${label ? ` (${label})` : ""} — ${one ? spec.options[0].amount + " " : ""}to ${names}.</p>`
      + `<p>${buttons.join(" ")}</p>`,
    flags: { [SCOPE]: { [EFFECT_CARD_FLAG]: spec } }
  });
}

/** A target's Actor from its stored uuid - a TokenDocument or an Actor. */
async function actorOf(uuid)
{
  const doc = uuid ? await fromUuid(uuid) : null;
  return doc?.actor ?? doc ?? null;
}

/** Apply one option of the card. Exported so a test can press it without a click. */
export async function applyEffectCard(message, index)
{
  const spec = message.getFlag(SCOPE, EFFECT_CARD_FLAG);
  const option = spec?.options?.[index];
  if (!option) return null;
  const user = await fromUuid(spec.actorUuid);
  if (!user) { ui.notifications.warn("That character no longer exists."); return null; }
  if (!user.isOwner) { ui.notifications.warn(`Only ${user.name}'s player or the Referee can apply ${spec.itemName}.`); return null; }
  if (spec.applied !== null && spec.applied !== undefined) { ui.notifications.warn(`${spec.itemName} has already been applied.`); return null; }

  await message.setFlag(SCOPE, EFFECT_CARD_FLAG, { ...spec, applied: index });
  const item = user.items.get(spec.itemId) ?? { name: spec.itemName, id: null, system: {}, flags: {} };
  const targets = (await Promise.all(spec.targets.map(t => actorOf(t.uuid)))).filter(Boolean);
  const speaker = ChatMessage.getSpeaker({ actor: user });

  if (option.verb === "heal")
  {
    const lines = [];
    for (const target of targets)
    {
      if (!spec.healsUser && target.uuid === user.uuid)
      {
        lines.push(`<b>${target.name}</b> — Gifts cannot heal their user's HP.`);
        continue;
      }
      const line = await applyHeal(target, option.amount, `<b>${spec.itemName}</b>`);
      if (line) lines.push(`<b>${target.name}</b> ${line}`);
    }
    if (lines.length) await ChatMessage.create({ speaker, content: `<b>${spec.itemName}</b> heals:<br>${lines.join("<br>")}` });
    return lines;
  }

  // Widening chunk 3a (RULED 2026-10-09): the rolled ability loss through the
  // sheet's one ability-damage path (immunities, the wound-damage total and its
  // line), each target wrapped as the token it expects; a death through the one
  // kill route a failed save uses - which spares a character, as it always has.
  if (option.verb === "ability-damage")
  {
    await user.sheet._applyAbilityDamage([{ ability: option.ability, flat: option.amount, source: spec.itemName }], targets.map(a => ({ actor: a })));
    return targets.length;
  }
  // Gift Effect Library chunk 4a (RULED 2026-10-09): the hooks to what exists,
  // each through its own path, named for the source. Imported on use, as the
  // board does, so this file imports no sheet-side module at load.
  if (option.verb === "temp-hp")
  {
    const { tempHpOf, TEMP_HP_FIELD } = await import("../combat/temp-hp.js");
    for (const target of targets)
    {
      // RULED 2026-10-09 (Matt, reversing the same day's default): a Gift cannot
      // give its USER temporary HP - the cost die is paid from the pool first,
      // and die + PSY always averages more than the die, so a Gift could mint
      // its own fuel. The Gift's no-self-heal rule, for the same reason.
      if (!spec.healsUser && target.uuid === user.uuid)
      {
        await ChatMessage.create({ speaker, content: `<b>${target.name}</b> — Gifts cannot give their user temporary HP.` });
        continue;
      }
      const pool = tempHpOf(target) + option.amount;
      await target.update({ [TEMP_HP_FIELD]: pool });
      await ChatMessage.create({ speaker, content: `<b>${target.name}</b> gains <b>${option.amount}</b> temporary HP from <b>${spec.itemName}</b> (now ${pool}).` });
    }
    return targets.length;
  }
  if (option.verb === "armour-damage")
  {
    const { degradeArmour } = await import("../item/attack-properties.js");
    for (const target of targets)
    {
      const r = await degradeArmour(target, option.amount);
      await ChatMessage.create({ speaker, content: r.drop > 0 ? `<b>${target.name}</b>'s armour is eroded by <b>${spec.itemName}</b>: <b>-${r.drop} AV</b> until repaired.`
        : `<b>${target.name}</b> has no armour for <b>${spec.itemName}</b> to erode.` });
    }
    return targets.length;
  }
  if (option.verb === "escalating")
  {
    const { startEscalatingTick } = await import("../combat/apply-to-target.js");
    for (const target of targets)
    {
      dealDamage(target, option.amount, { source: user, name: spec.itemName });
      await startEscalatingTick(target, { name: spec.itemName, source: user,
        text: `${option.amount} unblockable damage, multiplying by ${option.factor} each combat round, until the Referee removes this - the focus broken, or the Gift ended.`,
        start: option.amount, factor: option.factor });
    }
    return targets.length;
  }
  if (option.verb === "cure")
  {
    if (option.what === "tox")
    {
      const { stepDownToxinDie, hasToxinDie } = await import("../actor/toxin-die.js");
      for (const target of targets)
      {
        let die = target.system?.toxinDie?.die ?? "";
        if (!hasToxinDie(die)) { await ChatMessage.create({ speaker, content: `<b>${target.name}</b> carries no Toxin Die for <b>${spec.itemName}</b> to cure.` }); continue; }
        for (let i = 0; i < option.amount; i++) die = stepDownToxinDie(die);
        await target.update({ "system.toxinDie.die": die, ...(hasToxinDie(die) ? {} : { "system.toxinDie.source": "" }) });
        await ChatMessage.create({ speaker, content: `<b>${spec.itemName}</b> steps <b>${target.name}</b>'s Toxin Die down ${option.amount}: ${hasToxinDie(die) ? `now ${die}` : "<b>cured</b>"}.` });
      }
      return targets.length;
    }
    if (option.what === "burning")
    {
      const { entriesOf, removeEntry } = await import("../time/effect-board.js");
      for (const target of targets)
      {
        const fires = entriesOf(target).filter(e => e.hpTick && /burn|fire|flame/i.test(`${e.name} ${e.text}`));
        for (const e of fires) await removeEntry(target, e.id);
        await ChatMessage.create({ speaker, content: fires.length ? `<b>${spec.itemName}</b> puts out the fire on <b>${target.name}</b> (${fires.map(e => e.name).join(", ")}).` : `<b>${target.name}</b> is not burning.` });
      }
      return targets.length;
    }
    // An affliction: the applier picks which, from the target's own.
    const { entriesOf } = await import("../time/effect-board.js");
    const { cureAffliction } = await import("../actor/affliction.js");
    for (const target of targets)
    {
      const mine = entriesOf(target).filter(e => e.kind === "affliction" && e.afflictionKey);
      if (!mine.length) { await ChatMessage.create({ speaker, content: `<b>${target.name}</b> has no affliction for <b>${spec.itemName}</b> to cure.` }); continue; }
      const key = mine.length === 1 ? mine[0].afflictionKey : await pickOne(`${spec.itemName}: cure which affliction on ${target.name}?`, mine.map(e => ({ key: e.afflictionKey, label: e.name })));
      if (!key) continue;
      const r = await cureAffliction(target, key);
      await ChatMessage.create({ speaker, content: r?.error ? `<b>${spec.itemName}</b>: ${r.error}` : `<b>${spec.itemName}</b> cures <b>${target.name}</b> of <b>${r.entry?.name ?? key}</b>.` });
    }
    return targets.length;
  }
  if (option.verb === "remove-wound")
  {
    const { healWound } = await import("../actor/rest.js");
    for (const target of targets)
    {
      const wounds = Array.isArray(target.system?.wounds) ? target.system.wounds : [];
      if (!wounds.length) { await ChatMessage.create({ speaker, content: `<b>${target.name}</b> has no wound for <b>${spec.itemName}</b> to close.` }); continue; }
      for (let n = 0; n < option.amount; n++)
      {
        const current = Array.isArray(target.system?.wounds) ? target.system.wounds : [];
        if (!current.length) break;
        const index = current.length === 1 ? 0 : await pickOne(`${spec.itemName}: close which wound on ${target.name}?`, current.map((w, i) => ({ key: String(i), label: `${w.name} (${w.hp} HP)` })));
        if (index === null || index === undefined) break;
        const w = current[Number(index)];
        await healWound(target, Number(index));
        await ChatMessage.create({ speaker, content: `<b>${spec.itemName}</b> closes <b>${target.name}</b>'s wound: <b>${w?.name ?? "a wound"}</b>.` });
      }
    }
    return targets.length;
  }
  if (option.verb === "level")
  {
    const { applyLevelDrain } = await import("../actor/level-drain.js");
    for (const target of targets)
    {
      // No gain for the user (Matt's pick): no drainer named, so nothing is credited.
      // The Level before and after, not the ledger's diff: a character with no
      // record of a level still loses it (Group 620 read a success as the floor).
      const levelBefore = Number(target.system?.level?.value ?? 0);
      const r = await applyLevelDrain({ drainer: null, victim: target, spec: { levels: option.amount }, reason: spec.itemName });
      const lost = levelBefore - Number(target.system?.level?.value ?? 0);
      await ChatMessage.create({ speaker, content: r.notACharacter ? `<b>${target.name}</b> is not a character or creature - <b>${spec.itemName}</b> drains no Level from it; the Referee decides.`
        : lost > 0 ? `<b>${spec.itemName}</b> drains <b>${lost}</b> Level${lost === 1 ? "" : "s"} from <b>${target.name}</b>.` : `<b>${target.name}</b> cannot be drained below Level 1.` });
    }
    return targets.length;
  }
  if (option.verb === "kill")
  {
    for (const target of targets)
    {
      if (target.type === "character")
      {
        await ChatMessage.create({ speaker, content: `<b>${target.name}</b> is a character — <b>${spec.itemName}</b> cannot kill them outright; the Referee decides.` });
        continue;
      }
      await ChatMessage.create({ speaker, content: `<b>${target.name}</b> is killed outright by <b>${spec.itemName}</b>.` });
      await dealDeath(target);
    }
    return targets.length;
  }

  // Untyped damage passes no Item: the pipeline would read an Item with no
  // damage types as kinetic, and damage the source gave no type is not.
  for (const target of targets)
    dealDamage(target, option.amount, { source: user, item: option.types ? item : null, types: option.types,
                                        min: option.min, name: spec.itemName });
  return targets.length;
}

/** One choice from a list, asked of the applier (chunk 4a: which affliction, which wound). Null when dismissed. */
function pickOne(title, choices)
{
  return new Promise(resolve =>
  {
    const buttons = {};
    choices.forEach((c, i) => buttons[`c${i}`] = { label: c.label, callback: () => resolve(c.key) });
    new Dialog({ title, content: "", buttons, default: "c0", close: () => resolve(null) }).render(true);
  });
}

export function registerEffectCardButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, EFFECT_CARD_FLAG);
    if (!spec) return;
    // The flag, not the DOM, says whether it has been used - a re-render or
    // an F5 would otherwise bring the buttons back live.
    if (spec.applied !== null && spec.applied !== undefined)
    {
      html.find(".vaarn-effect-apply").prop("disabled", true);
      return;
    }
    html.find(".vaarn-effect-apply").click(async ev =>
    {
      html.find(".vaarn-effect-apply").prop("disabled", true);
      await applyEffectCard(message, Number(ev.currentTarget.dataset.option));
    });
  });
}
