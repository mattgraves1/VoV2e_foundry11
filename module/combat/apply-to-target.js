/**
 * Apply Effect to Target.
 *
 * A chat card carrying an effect and, usually, a target. The Referee clicks
 * the button and the effect lands on someone OTHER than the actor who posted
 * it. Nothing here adjudicates anything: no roll is made, no roll is compared,
 * and the card appears only once the table has already decided the action
 * succeeded.
 *
 * WHY THIS IS NOT "OPPOSED SAVE RESOLUTION", which is the row this replaced
 * (DECLINED 2026-09-10). Matt described the gameplay sequence rather than the
 * mechanism: either side rolls — the book lets either, the odds are identical —
 * against 10 + the opposing ability, the table decides by hand, and the only
 * thing wanted from code is a button that applies the effect IF it succeeded.
 * Every part of that already existed except the card. So what was missing was
 * never opposed rolls; it was cross-actor effect application, which opposed
 * saves merely touch. The same card serves Compel-a-Target Save after a target
 * fails its save, and Stateful Effect Application when an effect lands on
 * someone other than its drinker.
 *
 * THE PERMISSION TRICK, and the reason no socket is needed. A player cannot
 * write to an actor they do not own, and when this was written the system had
 * no socket (combat/gm-relay.js now relays such writes, 2026-09-27) or emit
 * infrastructure anywhere — every privileged action is a plain isGM guard. But
 * a chat-card handler runs on the client of whoever CLICKS, not whoever posted.
 * So the player's actor posts the card and the Referee clicks it, and the click
 * is what carries the permission. This is the shipped `.vaarn-recur-apply`
 * pattern on the affliction cards, not new ground.
 *
 * TARGET SELECTION IS A THREE-STEP FALLBACK, agreed 2026-09-10 (Matt):
 *
 *   1. the player had a token targeted when the ability fired, so the card
 *      carries it and the Referee just clicks;
 *   2. no target was captured, so the Referee targets a token and clicks —
 *      the handler reads THEIR OWN `game.user.targets`, because it runs on
 *      their client;
 *   3. nothing targeted and no tokens placed, so fall back to an actor
 *      dropdown in the `openTransferDialog` shape.
 *
 * The card POSTS REGARDLESS and says no target was captured, rather than
 * refusing to post, because the Referee can supply one at click time. That is
 * the same convention `_noteUnresolvedKillReactions` follows — name the clause
 * that could not be resolved instead of dropping it silently.
 *
 * WHY A TOKEN BEATS AN ACTOR wherever both are possible. An actor dropdown
 * names a creature once however many of it stand on the map, and an unlinked
 * token hands back a synthetic per-token copy, so applying to the Actor and
 * applying to the token are DIFFERENT WRITES — the wrong one looks like nothing
 * happened. Duplicates of one bestiary creature are the normal case here, so
 * steps 1 and 2 both store a TokenDocument uuid and only step 3 falls back to
 * an Actor.
 */

import { addEntry, expiryFor, SCOPE, entriesOf } from "../time/effect-board.js";
import { conditionByKey } from "../actor/condition-data.js";
import { isIntrinsic } from "../item/intrinsic.js";
import { sparedBreathing } from "../item/attack-properties.js";

/** Flag key on the ChatMessage recording that this card has been spent. */
const APPLIED_FLAG = "targetApplied";

/* -------------------------------------------- */
/*  Posting                                                                   */
/* -------------------------------------------- */

/**
 * The uuid to store for a target, preferring the token over its actor.
 *
 * A TokenDocument uuid resolves back to the thing standing on the map; an
 * Actor uuid resolves to the sidebar document, which for an unlinked token is
 * a different object holding different values.
 */
function uuidForTarget(target)
{
  if (!target) return "";
  // A Token placeable, a TokenDocument, or a bare Actor — accept all three,
  // since callers reach this from `game.user.targets` (placeables) and from
  // the dropdown (actors).
  if (target.document?.uuid) return target.document.uuid;
  return target.uuid ?? "";
}

/** A readable name for a target that may be a token, a token doc or an actor. */
function nameForTarget(target)
{
  return target?.name ?? target?.actor?.name ?? "";
}

/**
 * Post the card.
 *
 * `spec` is what will be handed to `applyEffectToActor` on click, so it is
 * stored whole on the message rather than smeared across data- attributes.
 * Only the target uuid rides on the button, because that is the one thing the
 * Referee may override at click time.
 *
 * `target` is optional and may be absent for a perfectly ordinary reason — the
 * player never targeted, or reloaded and lost their targeting silently.
 */
export async function postApplyCard({ source, spec, target = null, whisper = [] } = {})
{
  if (!spec?.name) return null;

  const uuid = uuidForTarget(target);
  const named = nameForTarget(target);

  const line = uuid
    ? `<div class="vaarn-apply-target">Target: <b>${named}</b></div>`
    : `<div class="vaarn-apply-target vaarn-apply-untargeted">No target was captured — ` +
      `target a token and click, or pick one from the list.</div>`;

  const text = spec.text
    ? `<div class="vaarn-apply-text">${spec.text}</div>`
    : "";

  return ChatMessage.create({
    content:
      `<div class="vaarn-apply-card">` +
        `<p><b>${spec.name}</b></p>` +
        text +
        line +
        `<button type="button" class="vaarn-apply-effect" data-target-uuid="${uuid}">` +
          `Apply to target</button>` +
      `</div>`,
    speaker: source ? ChatMessage.getSpeaker({ actor: source }) : undefined,
    whisper: [...whisper],
    // The poster is the effect's source, unless the spec already names one
    // (Weight of Worlds does): the round card tags a per-round effect with
    // the source's turn (Turn-Timed Round Card, RULED 2026-09-26 by Matt).
    flags: { [SCOPE]: { applySpec: spec.sourceActorId ? spec : { ...spec, ...sourceOf(source) } } }
  });
}

/* -------------------------------------------- */
/*  Resolving a target at click time                                          */
/* -------------------------------------------- */

/** A uuid that may name a TokenDocument or an Actor, reduced to an Actor. */
export async function actorFromUuid(uuid)
{
  if (!uuid) return null;
  const doc = await fromUuid(uuid);
  if (!doc) return null;
  // TokenDocument exposes `.actor`; an Actor is already what we want. Checking
  // for the property rather than the class keeps this working for both without
  // importing Foundry's globals.
  return doc.documentName === "Actor" ? doc : (doc.actor ?? null);
}

/**
 * Step 3: the actor dropdown, in the shape `openTransferDialog` established.
 *
 * Resolves to an Actor or null if the Referee cancels. Deliberately lists every
 * actor including npcs — the same call that picker makes, and for the same
 * reason: the Referee is the one choosing and knows what they mean.
 */
export function openTargetPicker(label)
{
  const targets = game.actors.contents;
  if (!targets.length)
  {
    ui.notifications.warn("There is no actor to apply this to.");
    return Promise.resolve(null);
  }

  const options = targets
    .map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`)
    .join("");

  return Dialog.prompt({
    title: `Apply ${label}`,
    content: `<form><div class="form-group">
        <label>Apply <b>${label}</b> to</label>
        <select name="target">${options}</select>
      </div></form>`,
    label: "Apply",
    callback: html => game.actors.get(html.find('select[name="target"]').val()) ?? null,
    rejectClose: false
  });
}

/**
 * The three-step fallback, in order. Returns an Actor or null.
 *
 * `game.user` here is the CLICKER — the Referee — which is what makes step 2
 * work at all. Their targeting is not the poster's, and that is the point: the
 * card asked them to supply one.
 */
export async function resolveApplyTarget(uuid, label)
{
  const carried = await actorFromUuid(uuid);
  if (carried) return carried;

  const targeted = [...(game.user.targets ?? [])];
  if (targeted.length === 1) return targeted[0].actor ?? null;
  if (targeted.length > 1)
  {
    // Named rather than silently taking the first, because picking one of
    // several at random is the kind of wrong that looks like it worked.
    ui.notifications.warn(
      `${targeted.length} tokens are targeted — target exactly one, or clear them ` +
      `to choose from a list.`);
    return null;
  }

  return openTargetPicker(label);
}

/* -------------------------------------------- */
/*  Applying                                                                  */
/* -------------------------------------------- */

/**
 * Put the effect on an actor. The sibling of `round-effects.js`'s `activate`,
 * which derives its actor from `item.parent` and so can only ever reach the
 * bearer — this one takes the actor explicitly, which is the whole difference.
 *
 * `addEntry` was already actor-agnostic, so nothing in the effect board needed
 * changing to support this.
 */
export async function applyEffectToActor(actor, spec)
{
  if (!actor || !spec) return null;

  const round = game.combat?.round ?? null;
  const now = game.time?.worldTime ?? 0;
  const stamps = expiryFor({ amount: spec.rounds ?? null, unit: spec.unit ?? "round", now, round });

  // ONSET, not contribution: the Planeyfied mishap's Attune with Matter
  // arrives with the reader's carried items already attuned (RULED 2026-09-25,
  // Matt), as the Planeyfication Potion's do. Written once, here; the flag
  // stays after the span ends and gates nothing for a reader who no longer
  // attunes.
  // A state the entry switches on (GM Effect Builder: Widening chunk 3c, RULED
  // 2026-10-09): auto-hit or ignore-armour attacks on whoever the entry goes on -
  // set here, cleared by the entry's clearFlag when it ends, whoever ends it.
  if (spec.setFlag?.key) await actor.setFlag("vaarn", spec.setFlag.key, spec.setFlag.value);
  // Items the entry grants for its span (Widening chunk 3e, RULED 2026-10-09):
  // created on whoever the entry goes on, removed by the entry's end through
  // grantedItemIds - every exit the board has (effect-board.js undoEntryEffects).
  const granted = Array.isArray(spec.grantItems) && spec.grantItems.length
    ? await actor.createEmbeddedDocuments("Item", spec.grantItems.map(d => foundry.utils.deepClone(d))) : [];
  if (spec.attuneExisting)
  {
    const patches = (actor.items?.contents ?? [])
      .filter(i => !isIntrinsic(i) && "attuned" in (i.system ?? {}) && i.system.attuned !== true)
      .map(i => ({ _id: i.id, "system.attuned": true }));
    if (patches.length) await actor.updateEmbeddedDocuments("Item", patches);
  }

  return addEntry(actor, {
    name: spec.name,
    text: spec.text ?? "",
    note: spec.note ?? "",
    perRound: !!spec.perRound,
    formula: spec.formula ?? null,
    abilityDamage: spec.abilityDamage ?? null,
    escalating: spec.escalating ?? null,
    clearFlag: spec.clearFlag ?? null,
    save: spec.save ?? null,
    // An escape the round card offers (Silk Production, 2026-09-26).
    hold: spec.hold ?? null,
    // The Ghoul's Agony (2026-09-27): its per-action tick and its end.
    hpTick: spec.hpTick ?? null,
    endsBy: spec.endsBy ?? null,
    applied: spec.applied ?? null,
    grantedItemIds: [...(spec.grantedItemIds ?? []), ...granted.map(i => i.id)],
    sourceActorId: spec.sourceActorId ?? null,
    sourceName: spec.sourceName ?? null,
    endsWithSource: !!spec.endsWithSource,
    // Ended by the combat's end (the Fate Inverter, Implants, Exotica and Figments chunk 3b).
    endsWithCombat: !!spec.endsWithCombat,
    startTime: now,
    startRound: round,
    ...stamps
  });
}

/**
 * Start a PER-ROUND ABILITY LOSS on an actor - Ability Damage pass 3, RULED
 * 2026-09-22 (Matt). The entry ticks every combat round, and the round card's
 * line for it carries a roll-and-apply button, until the Referee removes it
 * (the grab broken, line of sight lost, the rust cleaned off). The FIRST loss
 * is not written here - the caller applies it at once, on the use or hit that
 * started the tick, so it lands the round the effect begins.
 */
export async function startAbilityTick(actor, { name, text = "", ability, dice = null, flat = null, fade = null, avPerTick = 0, source = null })
{
  return applyEffectToActor(actor, {
    name, text, perRound: true,
    // Who inflicted it, for the round card's turn tag: the loss resolves on
    // the attacker's turn (Turn-Timed Round Card, RULED 2026-09-26 by Matt).
    ...sourceOf(source),
    formula: dice ?? String(flat),
    // `fade` and `avPerTick`: the Occulith's gaze (2026-09-25) - the round
    // button adds to a fading recurrence instead of woundDamage.
    abilityDamage: { ability, ...(fade ? { fade } : {}), ...(avPerTick ? { avPerTick } : {}) }
  });
}

/**
 * Start an ESCALATING PER-ROUND HP LOSS - the Seeker of Eyeless Wisdom's Brain
 * Burster, 2026-09-22.
 *
 * THE BOOK: "For each combat round the Seeker focuses their attention on a
 * target, the target takes unblockable damage, with no to-hit roll required.
 * This damage starts at 2 and doubles each turn, unless the Seeker's focus is
 * broken or if they switch to a new target."
 *
 * WHY IT IS NOT A `formula`, which is what every other per-round entry uses.
 * A formula is a constant string the round card re-rolls; this figure CHANGES,
 * and it changes as a consequence of having been applied. So the amount is
 * STATE on the entry, and the card's button writes the next one back. Storing
 * a formula that happened to be right for one round would silently freeze the
 * escalation the moment anybody reloaded.
 *
 * ENDING IT IS THE REFEREE'S, exactly as the ability tick beside it is. The
 * book's two end conditions - focus broken, target switched - are both facts
 * about what the Seeker is doing, and nothing in this system models attention.
 * The entry sits on the board until it is removed, and its text says so.
 */
export async function startEscalatingTick(actor, { name, text = "", start = 2, factor = 2, source = null })
{
  const f = Number(factor) || 2;
  // THE STORED AMOUNT IS WHAT THE NEXT APPLICATION DEALS, so it is already
  // advanced past the opening hit. The caller applies `start` at once, as the
  // ability tick above does, and the round card then owns every later round -
  // so an entry still holding `start` would deal the opening figure twice and
  // put the whole escalation a round behind for ever. Found in Group 311
  // testing, where the board offered 2 after 2 had already landed.
  return applyEffectToActor(actor, {
    name, text, perRound: true,
    // The Seeker's turn, as the ability tick's attacker (Turn-Timed Round Card).
    ...sourceOf(source),
    escalating: { amount: (Number(start) || 0) * f, factor: f }
  });
}

/**
 * The source fields an entry carries, from an actor or nothing. The name is
 * kept beside the id so a deleted source can still be named on the round card.
 */
export function sourceOf(source)
{
  return source ? { sourceActorId: source.id ?? null, sourceName: source.name ?? null } : {};
}

/* -------------------------------------------- */
/*  The click                                                                 */
/* -------------------------------------------- */

/** Has this card already been spent? Read from the MESSAGE, never the button. */
export function alreadyApplied(message)
{
  return !!message?.getFlag?.(SCOPE, APPLIED_FLAG);
}

/**
 * Handle one click on an apply button.
 *
 * GUARDED ON THE STORED MESSAGE FLAG, NOT ON THE BUTTON, and this is not a
 * stylistic preference — `.vaarn-recur-apply` shipped guarded on the button
 * and had to be fixed on 2026-09-09, because disabling a button is only a DOM
 * flag that is not stored anywhere. A chat re-render or an F5 brings the card
 * back live and the same effect applies twice.
 *
 * Exported so it can be exercised without a click.
 */
export async function onApplyClick(message, button)
{
  if (!game.user.isGM)
  {
    ui.notifications.warn("Only the Referee can apply an effect to a target.");
    return null;
  }

  const spec = message?.getFlag?.(SCOPE, "applySpec");
  if (!spec?.name)
  {
    ui.notifications.warn("That card no longer carries an effect to apply.");
    return null;
  }

  if (alreadyApplied(message))
  {
    ui.notifications.warn(`${spec.name} has already been applied from this card.`);
    return null;
  }

  const actor = await resolveApplyTarget(button?.dataset?.targetUuid, spec.name);
  if (!actor) return null;

  const entry = await applyEffectToActor(actor, spec);
  if (!entry) return null;

  // NO DOM WRITE HERE, deliberately. setFlag re-renders the message, which
  // replaces this element, so `button` is already detached by the time this
  // line would run and disabling it changes nothing anyone can see. The render
  // hook below is the single source of truth for the spent state, and it reads
  // the flag — which is the only version that survives an F5. Found in testing
  // 115.6 on 2026-09-10, where a card refused correctly while still LOOKING
  // clickable.
  await message.setFlag(SCOPE, APPLIED_FLAG, { actorId: actor.id, name: actor.name });

  // Reported in chat rather than only as a notification, and at the SOURCE
  // card's visibility. A notification fades; what landed on whom is exactly
  // the sort of thing that needs to still be readable afterwards — the same
  // reasoning the affliction cards and the Wounds table already follow.
  // A defined Combat Condition reads as a state ("is Entangled"), anything else
  // as the source's effect ("is affected by Empathy Bomb") - the save card's
  // appliedLine rule. Group 381 found "is affected by Entangled".
  const isCondition = (spec.applied?.conditions ?? []).some(k => conditionByKey(k));
  await ChatMessage.create({
    content: `<p><b>${actor.name}</b> ${isCondition ? "is" : "is affected by"} <b>${spec.name}</b>.</p>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: message.whisper?.length ? [...message.whisper] : []
  });

  return entry;
}

/**
 * Bind the button, and re-assert the spent state on every render.
 *
 * The re-assert is the other half of the flag guard: without it the button
 * comes back enabled after an F5 and only refuses on click, which reads as a
 * bug rather than as a card that has already been used.
 */
export function registerApplyCardButtons()
{
  Hooks.on('renderChatMessage', (message, html) =>
  {
    const button = html.find('.vaarn-apply-effect');
    if (!button.length) return;

    const spent = message.getFlag(SCOPE, APPLIED_FLAG);
    if (spent)
    {
      // ATTRIBUTE, not just the property. `prop('disabled', true)` sets a DOM
      // property that is lost whenever the chat log re-parses the message from
      // its markup, while `text()` survives because it IS the markup — so the
      // button came back reading "Applied to X" and still looking clickable.
      // Setting the attribute puts it in the markup too. Found in testing
      // 115.6 on 2026-09-10.
      button.attr('disabled', 'disabled');
      button.prop('disabled', true);
      button.text(spent.name ? `Applied to ${spent.name}` : "Applied");
      return;
    }

    button.click(ev => onApplyClick(message, ev.currentTarget));
  });
}

/**
 * Start an ONGOING HOLD on a victim - Per-Round Effect Reminder wiring, RULED
 * 2026-09-25 (Matt): "the initial action prompts an immediate save and effect
 * on failure. After that, the ongoing damage happens during the attacker's
 * turn, the save is an option during the target's turn." The Piranha Mole's
 * Flense, the Squishwolf's Swallow, the Snare, Vampiric Roots and the rest.
 *
 * ONE ENTRY ON THE VICTIM carries both halves, and the round card draws both:
 * the HP (or ability) button the Referee applies on the holder's turn, and
 * the escape save the victim may roll on theirs. A successful escape removes
 * it; so does the board's own end control. `spec` is bestiary-build.js's
 * holdSpec. Already held by the same source under the same name: kept, not
 * doubled.
 */
export async function startBurning(victim, burn)
{
  if (!victim) return null;
  const already = entriesOf(victim).find(e => e.name === burn.name && e.hpTick);
  if (already) return already;
  return addEntry(victim, {
    name: burn.name,
    text: `${burn.dice} burning damage each round until extinguished - remove this from the board when the fire is out.`,
    perRound: true,
    hpTick: { dice: burn.dice },
    startTime: game.time?.worldTime ?? 0,
    startRound: game.combat?.round ?? null
  });
}

/**
 * A hold this victim cannot be hurt by - Breathing and Suffocation, RULED
 * 2026-09-27 (Matt). A hold that deals only HP damage of a breathing type
 * the victim is immune to would sit on the board dealing nothing and asking
 * for an escape save each round, so it never starts. Returns the immunity
 * rows (for the line saying why), or null when the hold goes ahead.
 */
export function holdSpared(victim, spec)
{
  if (!spec?.dice || spec.loss) return null;
  return sparedBreathing(victim, spec.damageTypes);
}

/** The line a spared victim gets instead of being held, after their name. */
export function sparedHoldLine(label, rows)
{
  return `is not held by <b>${label}</b> - immune to its ${rows.map(r => r.attack).filter((a, i, all) => all.indexOf(a) === i).join(" and ")}. (${rows.map(r => r.note).join("; ")})`;
}

export async function startHold(victim, spec, source, label)
{
  if (!victim || !spec) return null;
  if (holdSpared(victim, spec)) return null;
  const already = entriesOf(victim).find(e => e.hold && e.name === label && e.sourceActorId === (source?.id ?? null));
  if (already) return already;
  // Damage, ability loss, or an effect with no damage (a Daemon's Mind Control, 2026-10-04).
  const what = spec.dice ? `${spec.dice} damage each round` : spec.loss ? `${spec.loss.dice} ${String(spec.loss.ability).toUpperCase()} each round` : (spec.effect ?? "held");
  // NO ESCAPE is a hold too (Trap Resolution, RULED 2026-09-26 by Matt): the
  // Vampiric Vines drain "until cut loose", and cutting is someone else's act,
  // so there is no save - the Referee ends it by hand. `endsBy` names how.
  const esc = spec.escape ?? null;
  const caveats = esc ? [esc.opposed ? `opposed: rolled against 10 + ${source?.name ?? "the holder"}'s ${String(esc.ability).toUpperCase()}` : null,
                         esc.assumed ? "the book gives no escape; one was ruled 2026-09-25" : null].filter(Boolean) : [];
  const end = esc ? `${String(esc.ability).toUpperCase()} save to ${esc.by} on their turn`
                  : `Until ${spec.endsBy ?? "freed"} - remove it from the board then`;
  return addEntry(victim, {
    name: label,
    text: `Held by <b>${source?.name ?? label}</b>: ${what}. ${end}`
        + (caveats.length ? ` (${caveats.join("; ")})` : "") + `.`,
    perRound: true,
    hpTick: spec.dice ? { dice: spec.dice, ...(spec.drain && source ? { drainTo: source.id } : {}),
                          // Breathing and Suffocation (2026-09-27): the Snare's drowning, the
                          // Squishwolf's suffocation - the round button's table reads it.
                          ...(spec.damageTypes?.length ? { damageTypes: [...spec.damageTypes] } : {}) } : null,
    formula: spec.loss ? spec.loss.dice : null,
    abilityDamage: spec.loss ? { ability: spec.loss.ability } : null,
    hold: { escape: esc },
    sourceActorId: source?.id ?? null,
    sourceName: source?.name ?? null,
    startTime: game.time?.worldTime ?? 0,
    startRound: game.combat?.round ?? null
  });
}
/**
 * END WHAT A DEAD CREATURE WAS HOLDING UP - an entry declaring endsWithSource
 * lasts only while its source lives. The Gravity Tyrant's Weight of Worlds,
 * "This effect lasts until the Tyrant is killed" (RULED 2026-09-25, Matt:
 * automatic). Called from knave.js when an npc's HP reaches 0 or it is
 * deleted; one chat line per holder.
 */
export async function endEffectsOfSource(source, why = "is dead")
{
  if (!source?.id) return;
  for (const actor of game.actors ?? [])
  {
    const ended = entriesOf(actor).filter(e => e.endsWithSource && e.sourceActorId === source.id);
    if (!ended.length) continue;
    const { removeEntry } = await import("../time/effect-board.js");
    for (const e of ended) await removeEntry(actor, e.id);
    // A projector's own field sits on the projector (Trap Resolution,
    // 2026-09-26): "X ends for X - X is dead" says it three times.
    const content = actor.id === source.id
      ? `<b>${source.name}</b> ${why === "is dead" ? "is destroyed" : why} — <b>${ended.map(e => e.name).join(", ")}</b> ends.`
      : `<b>${ended.map(e => e.name).join(", ")}</b> ends for <b>${actor.name}</b> — ${source.name} ${why}.`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }
}
