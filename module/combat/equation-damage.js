/**
 * Hypergeometric Equation Damage to a Target - foundry-system-index.csv row of
 * that name, RULED 2026-09-26 (Matt). The sibling of gift-damage.js, and built
 * the same way on purpose ("so we can be consistent").
 *
 * Freeze is the one equation that damages a target directly: "Create a
 * localised supercoolant cloud, dealing [INT] d6 DEX damage to a target.
 * Creatures reduced to 0 DEX are frozen solid and cannot move until thawed."
 * The equation carries it as `targetDamage` in codex-data.js.
 *
 *  - A CARD WITH ONE BUTTON after a successful read with tokens targeted, the
 *    targets fixed at the read, as a Gift's are. The dice are rolled with the
 *    card so everyone sees the number before it lands.
 *  - THE DAMAGE CARRIES ITS PROPERTIES (ruled: hypergeometry AND freezing), and
 *    the target's damage rules answer to them as they would to a weapon - a
 *    Mineral creature or Cold Immunity stops it, Half Damage from Hypergeometry
 *    HALVES it (ruled: halving applies to this ability damage, rounded down).
 *  - PSYCHIC MIRROR REBOUNDS IT onto the reader, automatically (ruled).
 *  - AN INCORPOREAL TARGET IS THE REFEREE'S CALL (ruled), as it is for a Gift:
 *    nothing is applied and the line carries the figure.
 *  - 0 DEX IS A CHAT LINE (ruled), not a condition: nothing says how thawing
 *    works.
 *  - ONCE PER CARD, recorded on the message; the reader's player or the Referee.
 */
import { resolveDamageInteractions, damageOverride, reboundsAttack } from "../item/attack-properties.js";

const SCOPE = "vaarn";
export const EQUATION_CARD_FLAG = "equationDamage";

/**
 * Roll and post the card for one successful read. `spec` is the equation's
 * targetDamage; `targets` are Token placeables. Returns the message, or null.
 */
export async function postEquationDamageCard(reader, equationName, spec, intBonus, targets)
{
  if (!targets?.length || !spec) return null;
  const count = spec.count === "INT" ? intBonus : Number(spec.count);
  const label = String(spec.ability).toUpperCase();
  if (count < 1)
  {
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: reader }),
      content: `<p><b>${equationName}</b> — [INT] is ${intBonus}, so the cloud deals no ${label} damage.</p>` });
  }
  const formula = `${count}d${spec.die}`;
  const roll = await new Roll(formula).evaluate();
  const card = {
    readerUuid: reader.uuid, equationName, ability: spec.ability, properties: spec.properties,
    amount: roll.total, min: count, atZero: spec.atZero ?? null,
    targets: targets.map(t => ({ uuid: t.document?.uuid ?? t.actor?.uuid, name: t.name ?? t.actor?.name })),
    applied: false,
  };
  const names = card.targets.map(t => `<b>${t.name}</b>`).join(", ");
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: reader }),
    flavor: `<b>${equationName}</b> — ${formula} ${label} damage` });
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: reader }),
    content: `<p><b>${equationName}</b> — ${card.amount} ${label} damage to ${names}.</p>`
      + `<p><button type="button" class="vaarn-equation-apply">Apply to targets</button></p>`,
    flags: { [SCOPE]: { [EQUATION_CARD_FLAG]: card } },
  });
}

async function actorOf(uuid)
{
  const doc = uuid ? await fromUuid(uuid) : null;
  return doc?.actor ?? doc ?? null;
}

/** The ability damage, after this target's own rules. Returns chat lines. */
async function landOn(actor, card, lines)
{
  const label = String(card.ability).toUpperCase();
  const probe = { system: { damageTypes: card.properties } };
  const override = damageOverride(probe, actor);
  if (override?.gmCall)
  {
    lines.push(`<b>${actor.name}</b> is <b>${override.rule}</b> — whether <b>${card.equationName}</b>'s ${card.amount} ${label} damage harms it is the Referee's call. Adjust it by hand if it does.`);
    return;
  }
  if (override?.immune)
  {
    lines.push(`<b>${actor.name}</b> is <b>${override.rule}</b> — no ${label} damage from <b>${card.equationName}</b>.`);
    return;
  }
  const { mult, immune, floor, applied } = resolveDamageInteractions(probe, actor);
  if (immune)
  {
    const why = applied.filter(r => r.mult === 0).map(r => r.note).join("; ");
    lines.push(`<b>${actor.name}</b> is immune — no ${label} damage from <b>${card.equationName}</b>. (${why})`);
    return;
  }
  const base = floor ? Math.min(card.amount, card.min) : card.amount;
  const amount = Math.floor(base * mult);
  for (const r of applied)
    lines.push(`<b>${actor.name}</b> — ${r.floor ? `minimum damage, ${base} instead of ${card.amount}` : r.mult > 1 ? `x${r.mult}` : "halved"}. (${r.note})`);
  const key = card.ability;
  const total = Number(actor.system.abilities?.[key]?.woundDamage ?? 0) + amount;
  await actor.update({ [`system.abilities.${key}.woundDamage`]: total });
  const effective = actor.system.abilities?.[key]?.effective;
  lines.push(`<b>${actor.name}</b> takes <b>${amount} ${label} damage</b> from <b>${card.equationName}</b> `
    + `(${label} wound damage total ${total}${effective !== undefined ? `, effective ${effective}` : ""}).`);
  if (card.atZero && effective !== undefined && effective <= 0)
    lines.push(`<b>${actor.name}</b> ${card.atZero}`);
}

/** Apply the card. Exported so it can be exercised without a click. */
export async function applyEquationCard(message)
{
  const card = message.getFlag(SCOPE, EQUATION_CARD_FLAG);
  if (!card) return null;
  const reader = await fromUuid(card.readerUuid);
  if (!reader) { ui.notifications.warn("That character no longer exists."); return null; }
  if (!reader.isOwner) { ui.notifications.warn(`Only ${reader.name}'s player or the Referee can apply this.`); return null; }
  if (card.applied) { ui.notifications.warn(`${card.equationName} has already been applied.`); return null; }
  await message.setFlag(SCOPE, EQUATION_CARD_FLAG, { ...card, applied: true });

  const lines = [];
  for (const target of (await Promise.all(card.targets.map(t => actorOf(t.uuid)))).filter(Boolean))
  {
    const mirror = card.properties.map(p => reboundsAttack(target, p)).find(Boolean);
    if (mirror)
    {
      lines.push(`<b>${target.name}</b> is untouched — <b>${mirror.rule}</b>: <b>${card.equationName}</b> rebounds on <b>${reader.name}</b>.`);
      await landOn(reader, card, lines);
      continue;
    }
    await landOn(target, card, lines);
  }
  if (lines.length)
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: reader }), content: lines.join("<br>"),
      whisper: message.whisper?.length ? [...message.whisper] : [] });
  return lines;
}

export function registerEquationDamageButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const card = message.getFlag(SCOPE, EQUATION_CARD_FLAG);
    if (!card) return;
    if (card.applied) { html.find(".vaarn-equation-apply").prop("disabled", true); return; }
    html.find(".vaarn-equation-apply").click(async ev =>
    {
      ev.currentTarget.disabled = true;
      await applyEquationCard(message);
    });
  });
}
