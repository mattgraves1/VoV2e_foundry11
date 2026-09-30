/**
 * Gambit Resolution, clickable - foundry-system-index.csv "Gambit Resolution",
 * reopened and RULED 2026-09-24 (Matt).
 *
 * The book (Gambits, JADE IBIS as CRIMSON): "If an attacker's total is higher
 * than 20 after applying all bonuses, they may attempt a stunt or gambit in
 * addition to rolling their attack's damage ... The target may Save against a
 * gambit, but the attacker may choose to forgo their attack's damage to deny a
 * Save."
 *
 * Until 2026-09-24 the menu was a list and nothing rolled; the Blind gambit's
 * Apply card posted beside it before anyone had chosen. The rulings that shape
 * this file:
 *
 *  - WHO PICKS: the attacker's owner or a GM. The target's owner rolls the save
 *    from the save card, as on every Compel-a-Target Save card.
 *  - ONE GAMBIT, AGAINST ONE CHOSEN TARGET, per attack - "they may attempt a
 *    stunt or gambit", and every example is an action against a single
 *    opponent. A hit on several targets shows a picker; the first pick locks
 *    the card.
 *  - FORGOING DAMAGE IS ON THE HONOUR SYSTEM. First built enforced - the next
 *    damage roll refused, cleared by the next attack or combat's end - and
 *    REVERSED the same day (Matt): "it's counter-intuitive ... forgo damage =
 *    don't click the damage roll, adjudicated." The card says damage is
 *    forgone; nothing refuses the roll.
 *  - A book gambit with a save posts its save card (targetSave in
 *    gambit-data.js); a failed save puts on what it declares. Forgone, the
 *    effect lands at once. Move again has no save and is a line.
 *  - A REPLACED OR ADDED gambit (Gambit List Override) is free text with no
 *    save to read, as is "any comparable physical feat": the pick posts
 *    "attempts ..." and the Referee resolves it.
 */
import { GAMBITS, GAMBIT_THRESHOLD, GAMBIT_OPEN_CLAUSE, GAMBIT_SAVE_CLAUSE } from "../actor/gambit-data.js";
import { effectiveGambits } from "../actor/gambit-config.js";
import { postSaveCard, declaredApplySpec, armourLine } from "./compelled-save.js";
import { applyEffectToActor } from "./apply-to-target.js";
import { degradeArmour } from "../item/attack-properties.js";

const SCOPE = "vaarn";
export const GAMBIT_CARD_FLAG = "gambitCard";
const OPEN_FEAT = "__feat__";

/**
 * Post the menu for an attack that hit and totalled over 20. `targets` are
 * the Token placeables the attack hit.
 */
export async function postGambitCard(actor, item, total, targets)
{
  const rows = effectiveGambits().map((r, i) =>
  {
    const g = r.kind === "book" ? GAMBITS.find(x => x.name === r.name) : null;
    return { i, kind: r.kind, name: r.name, html: r.html, hasSave: r.kind !== "book" || !!g?.targetSave };
  });
  rows.push({ i: rows.length, kind: "feat", name: OPEN_FEAT, html: GAMBIT_OPEN_CLAUSE, hasSave: true });
  const spec = {
    attackerUuid: actor.uuid, attackerName: actor.name,
    itemId: item.id, itemName: item.name, total,
    targets: targets.map(t => ({ uuid: t.document?.uuid ?? null, name: t.name ?? t.actor?.name })),
    rows, chosen: null,
  };
  return ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="vaarn-gambit-card"></div>`,
    flags: { [SCOPE]: { [GAMBIT_CARD_FLAG]: spec } },
  });
}

/** The card body, rebuilt from the flag on every render. */
export function gambitCardHtml(spec)
{
  const names = spec.targets.map(t => t.name).join(", ");
  const head = `<b>Gambit available</b> — ${spec.itemName} totalled ${spec.total}, over ${GAMBIT_THRESHOLD}.`;
  if (spec.chosen)
  {
    const c = spec.chosen;
    return head + `<p><b>${spec.attackerName}</b> attempts <b>${c.label}</b> against <b>${c.targetName}</b>`
      + (c.forgo ? ` — <b>forgoing this attack's damage</b> to deny the Save. Do not roll it.` : `.`) + `</p>`;
  }
  const picker = spec.targets.length > 1
    ? `<p>Against: <select class="vaarn-gambit-target">${spec.targets.map((t, i) => `<option value="${i}">${t.name}</option>`).join("")}</select></p>`
    : `<p><i>A stunt against ${names}, in addition to rolling damage — pick one:</i></p>`;
  const rows = spec.rows.map(r =>
    `<li>${r.html}<br><button type="button" class="vaarn-gambit-pick" data-row="${r.i}">Attempt</button>`
    + (r.hasSave ? ` <button type="button" class="vaarn-gambit-pick" data-row="${r.i}" data-forgo="1">Forgo damage, no Save</button>` : "")
    + `</li>`).join("");
  return head + picker + `<ul>${rows}</ul><i>${GAMBIT_SAVE_CLAUSE}</i>`;
}

/** The label a row shows once chosen. */
function rowLabel(r)
{
  if (r.kind === "feat") return "a comparable physical feat";
  if (r.kind === "book") return `the ${r.name} gambit`;
  return $("<div>").html(r.html).text();
}

/** Handle one pick. Exported so it can be exercised without a click. */
export async function pickGambit(message, rowIndex, forgo, targetIndex = 0)
{
  const spec = message.getFlag(SCOPE, GAMBIT_CARD_FLAG);
  if (!spec) return null;
  if (spec.chosen) { ui.notifications.warn("A gambit has already been chosen for this attack."); return null; }
  const attacker = await fromUuid(spec.attackerUuid);
  if (!attacker) return null;
  if (!game.user.isGM && !attacker.isOwner) { ui.notifications.warn(`Only ${attacker.name}'s owner or the Referee can choose the gambit.`); return null; }
  const row = spec.rows[rowIndex];
  const tgt = spec.targets[targetIndex] ?? spec.targets[0];
  if (!row || !tgt) return null;
  const tokenDoc = tgt.uuid ? await fromUuid(tgt.uuid) : null;
  const target = tokenDoc?.actor ?? null;
  const doForgo = !!forgo && row.hasSave;

  // THE LOCK FIRST, on the stored flag, so a second click on any client - or
  // a re-render bringing the buttons back - finds the card spent.
  await message.setFlag(SCOPE, GAMBIT_CARD_FLAG, { ...spec, chosen: { row: rowIndex, label: rowLabel(row), targetName: tgt.name, forgo: doForgo } });

  const source = `${spec.itemName} — ${row.kind === "book" ? row.name + " gambit" : "gambit"}`;
  const say = content => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: attacker }), content });
  const g = row.kind === "book" ? GAMBITS.find(x => x.name === row.name) : null;

  if (!g?.targetSave)
  {
    // Move again, a replaced or added line, or "any comparable physical feat":
    // nothing to roll. The Referee resolves it.
    // The book detail and a free line both end in a full stop, which would sit
    // before "against" (Group 372.7) - dropped here, the sentence's own added.
    const what = (row.kind === "book" ? `<b>${row.name}</b> — ${g?.detail ?? ""}` : rowLabel(row)).replace(/\.\s*$/, "");
    await say(`<p><b>${attacker.name}</b> attempts ${what}`
      + ` against <b>${tgt.name}</b>.${doForgo ? " <i>Damage forgone - do not roll it; no Save, the Referee resolves it.</i>" : row.hasSave ? " <i>The Referee resolves the target's Save.</i>" : ""}</p>`);
    return { row, forgo: doForgo };
  }

  if (!doForgo)
  {
    await postSaveCard(attacker, source, [g.targetSave], [],
      { token: tokenDoc?.object ?? null, applies: g.applies ? [g.applies] : [] });
    return { row, forgo: false };
  }

  // Damage forgone and the target not ours to write - a player's gambit on a
  // creature. When this was built there was no socket to hand the write to the
  // Referee (combat/gm-relay.js since 2026-09-27; the card was kept), so the save
  // card carries the denial and the target's owner clicks Apply on it; it
  // resolves as a failure, putting on what the gambit declares.
  if (target && !target.isOwner)
  {
    await say(`<p><b>${attacker.name}</b> forgoes this attack's damage — do not roll it — and <b>${tgt.name}</b> gets no Save against <b>${g.name}</b>. <i>The Referee applies it from the card below.</i></p>`);
    await postSaveCard(attacker, source, [{ ...g.targetSave, denied: true }], [],
      { token: tokenDoc?.object ?? null, applies: g.applies ? [g.applies] : [] });
    return { row, forgo: true };
  }

  // Damage forgone: the Save is denied and the gambit lands now.
  const lines = [`<b>${attacker.name}</b> forgoes this attack's damage — do not roll it — and <b>${tgt.name}</b> gets no Save against <b>${g.name}</b>.`];
  if (target)
  {
    if (g.applies)
    {
      const a = await declaredApplySpec(g.applies, source);
      if (a) { await applyEffectToActor(target, a); lines.push(`<b>${target.name}</b> is <b>${a.name}</b> — on their Active Effects board for ${a.rounds} combat round${a.rounds === 1 ? "" : "s"}.`); }
    }
    if (g.targetSave.onFail?.armourLoss)
    {
      lines.push(armourLine(target, g.targetSave.onFail.armourLoss));
      await degradeArmour(target, g.targetSave.onFail.armourLoss);
    }
    if (!g.applies && !g.targetSave.onFail) lines.push(`<i>${g.detail}</i>`);
  }
  await say(lines.map(l => `<p>${l}</p>`).join(""));
  return { row, forgo: true };
}

export function registerGambitCardButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, GAMBIT_CARD_FLAG);
    if (!spec) return;
    html.find(".vaarn-gambit-card").html(gambitCardHtml(spec));
    html.find(".vaarn-gambit-pick").click(ev =>
    {
      const b = ev.currentTarget;
      const sel = html.find(".vaarn-gambit-target");
      pickGambit(message, Number(b.dataset.row), b.dataset.forgo === "1", sel.length ? Number(sel.val()) : 0);
    });
  });
}
