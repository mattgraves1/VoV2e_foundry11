/**
 * Healing Field - Biotic Field Generator, RULED 2026-09-22 (Matt).
 *
 * The book: "A golden beacon. When set on the floor, emits a healing cloud of
 * nanomachines for 6 rounds. Biological creatures in melee range regain +d10
 * HP per round while in the cloud."
 *
 * Who stands in the cloud is token positioning, so nothing here is per-round
 * automation. Matt's shape, in his words and then his three answers:
 * - "it should generate an actor called 'Biotic Field' when used, that actor
 *   should have the heal button." On the ITEM the button would die with it:
 *   the generator is used up when its usage die runs out, and the cloud it
 *   just set down outlives it.
 * - No token. The actor is created in the sidebar; the Referee places it.
 * - When the 6 rounds run out the actor is removed automatically.
 * - The heal button is GM-only.
 *
 * WHO CREATES IT. A player normally cannot create Actors, so a player's use
 * posts a card whose button only the Referee can press; a GM's use creates it
 * at once.
 *
 * THE TIMER is an ordinary board entry on the field actor, marked
 * `removesActor`. effect-board.js deletes the actor on every path an entry
 * ends by - expiry, the Referee removing the row, and combat ending - so the
 * field cannot outlive its timer by one route and not another.
 */
import { addEntry, expiryFor } from "../time/effect-board.js";
import { sentencesOf } from "../effects/interpret.js";
import { hasAnyCreatureType } from "../item/attack-properties.js";
import { heal } from "../effects/heal.js";
import { gmHP } from "./hidden-hp.js";
import { creatureFlagsOf } from "../item/creature-effects.js";

const SCOPE = "vaarn";
const REQUEST_FLAG = "healingFieldRequest";

/**
 * The field a field-generating Item sets down, from its field-generator use
 * sentence, or null - the generator, not the field. It is what tells
 * canRoundRemind that this Item's rounds belong to the field it creates and not
 * to itself. Read from the sentence since Implants, Exotica and Figments chunk 5
 * (RULED 2026-10-06, Matt), no longer the roster by name.
 */
export function fieldGeneratorOf(item)
{
  if (!item?.name) return null;
  const s = sentencesOf(item).find(x => x.do?.verb === "special" && x.do.handler === "field-generator" && x.do.field);
  return s ? s.do : null;
}

/** The heal a field Item declares, or null. */
export function targetHealOf(item)
{
  // From its sentence since Effect Engine: Creatures chunk 2b (2026-10-06) - the
  // Biotic Field's flag reads the same way as a creature's.
  return creatureFlagsOf(item).targetHeal ?? null;
}

/**
 * The generator was used. `spec` is the roster entry's targetHeal, `span` the
 * field's lifetime (targetHeal.span - deliberately not a declaredSpan, which
 * would put an hourglass on the generator); `user` is the actor who used it, named on the card.
 */
export async function useFieldGenerator(user, sourceName, spec, span)
{
  const request = { sourceName, spec, span, userName: user?.name ?? "" };
  if (game.user.isGM) return createHealingField(request);
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: user }),
    content: `<p><b>${request.userName}</b> sets down the <b>${sourceName}</b>. `
      + `The Referee creates the <b>${spec.field}</b>.</p>`
      + `<button type="button" class="vaarn-healing-field-create">Create the ${spec.field}</button>`,
    flags: { [SCOPE]: { [REQUEST_FLAG]: request } },
  });
}

/** Create the field actor, its heal Item and its timer. GM only. */
export async function createHealingField({ sourceName, spec, span, userName })
{
  if (!game.user.isGM) return ui.notifications.warn(`Only the Referee creates the ${spec.field}.`);
  const who = spec.targets?.length ? `${spec.targets.join(" or ")} creatures` : "creatures";
  const field = await Actor.create({
    name: spec.field,
    type: "npc",
    img: "icons/svg/regen.svg",
    items: [{
      name: "Healing Cloud",
      type: "item",
      img: "icons/svg/clockwork.svg",
      system: {
        description: `<p>Set down from ${userName ? `${userName}'s ` : "a "}<b>${sourceName}</b>. `
          + `Target the ${who} standing in the cloud and press the heal control: each regains `
          + `<b>${spec.dice} HP</b>. Once per round, by hand - who is in range is the Referee's call.</p>`,
        slots: 0, quantity: 1, tradeValue: 0, intrinsic: true,
      },
      flags: { [SCOPE]: { targetHeal: { dice: spec.dice, targets: spec.targets ?? [] } } },
    }],
  });
  const amount = Number(span?.amount);
  const unit = span?.unit ?? "round";
  await addEntry(field, {
    name: spec.field,
    text: `The cloud lasts ${amount} ${unit}${amount === 1 ? "" : "s"}; the ${spec.field} is removed when it ends.`,
    removesActor: true,
    ...expiryFor({ amount, unit, now: game.time?.worldTime ?? 0, round: game.combat?.round ?? null }),
  });
  await ChatMessage.create({
    content: `<p>The <b>${spec.field}</b> is created in the Actors directory. Place it where the `
      + `${sourceName} was set down; it is removed when its ${amount} ${unit}s end.</p>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
  });
  return field;
}

/**
 * Heal every targeted token by the Item's dice, rolled once per token, under
 * the same rules as every other HP gain: a creature outside `targets` is
 * unaffected, blocksHealing refuses a Deprived or never-healing one (and says
 * so), healFloor starts a negative total from 0, scaleHealing applies
 * Deathblight, and the result is clamped to max HP.
 */
export async function healTargets(fieldActor, item)
{
  if (!game.user.isGM) return ui.notifications.warn("Only the Referee can heal other tokens.");
  const spec = targetHealOf(item);
  if (!spec) return;
  const tokens = Array.from(game.user?.targets ?? []);
  const speaker = ChatMessage.getSpeaker({ actor: fieldActor });
  if (!tokens.length)
    return ChatMessage.create({ speaker, content: `<b>${fieldActor.name}</b>: no target is selected, so nobody was healed.` });

  const lines = [];
  for (const token of tokens)
  {
    const target = token.actor;
    if (!target) continue;
    if (spec.targets?.length && !hasAnyCreatureType(target, spec.targets))
    {
      lines.push(`<b>${target.name}</b> is not ${spec.targets.join(" or ")} and is unaffected.`);
      continue;
    }
    const roll = await new Roll(spec.dice).evaluate();
    const line = await applyHeal(target, roll.total, `the <b>${fieldActor.name}</b>`);
    if (line) lines.push(`<b>${target.name}</b> rolls ${roll.total} and ${line}`);
  }
  if (lines.length)
    return ChatMessage.create({ speaker, content: `<b>${fieldActor.name}</b> heals:<br>${lines.join("<br>")}` });
}

/**
 * Heal one actor by `amount` under the shared HP-gain rules, and say what
 * landed - Direct HP Adjustment, 2026-09-23, factored out of healTargets so
 * the round card's regeneration button cannot drift from it.
 *
 * blocksHealing refuses a Deprived or never-healing actor (posting why, and
 * this returns null); healFloor starts a negative total from 0, which is also
 * what lets the Nightmare Herald's Feast of Dreams raise a Herald from
 * 'death'; scaleHealing applies Deathblight; the result is clamped to max.
 * Returns the rest of a sentence: "regains N HP (now X/Y)."
 */
export async function applyHeal(target, amount, label)
{
  // Through the one heal path (effects/heal.js, Shared Pipelines chunk 3),
  // gated there: a refusal has posted its own line, so this returns null.
  const { after, gained, max, note, refused } = await heal(target, amount, { label });
  if (refused) return null;
  return `regains <b>${gained}</b> HP${gmHP(target, ` (now ${after}/${max})`)}.${note}`;
}

export function registerHealingFieldButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const request = message.getFlag(SCOPE, REQUEST_FLAG);
    if (!request) return;
    html.find(".vaarn-healing-field-create").click(async () =>
    {
      if (!game.user.isGM) return ui.notifications.warn(`Only the Referee creates the ${request.spec.field}.`);
      if (message.getFlag(SCOPE, "healingFieldCreated"))
        return ui.notifications.info(`That ${request.spec.field} has already been created.`);
      await message.setFlag(SCOPE, "healingFieldCreated", true);
      await createHealingField(request);
    });
  });
}
