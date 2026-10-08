/**
 * THE RULES THAT READ METAL, AS CARDS - foundry-system-index.csv "Metal Item
 * Property", Part B, RULED 2026-09-27 (Matt). Honour system: every card here
 * names what the rule reaches and moves nothing. The Referee resolves where
 * the metal goes.
 *
 *  - postMetalReachCard: Magnetic Orb ("All nearby metal objects and
 *    Synthetic-type creatures are irresistibly drawn towards it"), Magnetic
 *    Stew's granted ability ("can irresistibly draw metal towards themselves")
 *    and the Electromagnet hazard ("draws all metal objects towards it").
 *  - magneticFieldHtml: the Magneticrab's round card line - "nearby PCs with
 *    metal weapons or items equipped must STR Save ... PCs in metal armour or
 *    who are synthetic are forcibly drawn into melee range".
 *
 * IN REACH is the targeted tokens when there are any, and otherwise every
 * token on the scene, with the card saying which - "nearby" is the Referee's
 * to judge, as every other area here.
 */
import { isMetalItem, wearsMetalArmour } from "../item/metal.js";
import { armourSlotOf } from "../effects/item-stats.js";

/** Metal an actor carries that a magnet could move: not innate, not installed. */
export function metalCarried(actor)
{
  return (actor?.items?.contents ?? actor?.items ?? []).filter(i => isMetalItem(i) && !i.system?.intrinsic);
}

/** Metal held in hand - an equipped weapon or an equipped shield. */
export function metalHeld(actor)
{
  return metalCarried(actor).filter(i => i.system?.equipped
    && (i.type === "weaponMelee" || i.type === "weaponRanged" || (i.type === "armor" && armourSlotOf(i) === "shield")));
}

/** The tokens a card reaches, and the words that say how they were chosen. */
function tokensInReach(source)
{
  const targets = Array.from(game.user?.targets ?? []);
  if (targets.length) return { tokens: targets, scope: "the targeted tokens" };
  const tokens = (canvas?.tokens?.placeables ?? []).filter(t => t.actor && t.actor !== source);
  return { tokens, scope: "every token on the scene - the Referee judges which are near" };
}

const itemLabel = i => `${i.name}${Number(i.system?.quantity) > 1 ? ` (×${i.system.quantity})` : ""}`
  + `${i.system?.equipped ? (i.type === "armor" && armourSlotOf(i) !== "shield" ? " (worn)" : " (held)") : ""}`;

/**
 * The card for a magnet: every metal item in reach, a metal vehicle, and -
 * when the rule says so - every Synthetic creature, which the Orb draws too.
 */
export async function postMetalReachCard(source, label, { synthetics = false, synthMind = false } = {})
{
  const { tokens, scope } = tokensInReach(source);
  const rows = [];
  for (const t of tokens)
  {
    const a = t.actor;
    const bits = [];
    if (synthetics && a.system?.creatureTypes?.synthetic) bits.push("<b>Synthetic</b> - drawn in itself");
    if (a.flags?.vaarn?.metal) bits.push("<b>a metal vehicle</b>");
    const items = metalCarried(a);
    if (items.length) bits.push(items.map(itemLabel).join(", "));
    if (bits.length) rows.push(`<li><b>${t.name}</b>: ${bits.join("; ")}</li>`);
  }
  const content = `<p><b>${label}</b> — the metal in reach, from ${scope}:</p>`
    + (rows.length ? `<ul>${rows.join("")}</ul>` : `<p><i>No metal in reach.</i></p>`)
    + `<p><i>Nothing is moved: the Referee resolves what is drawn in and where it goes.</i></p>`
    + (synthMind ? synthMindButton(label) : "");
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: source }), content });
}

/**
 * The Magneticrab's field, read when the round card posts: who must save and
 * who is pulled. PCs only - the book says "nearby PCs" - from every character
 * token on the scene; nearness is the Referee's.
 */
export function magneticFieldHtml(source)
{
  const pcs = (canvas?.tokens?.placeables ?? []).filter(t => t.actor?.type === "character" && t.actor !== source);
  const save = [], pulled = [];
  for (const t of pcs)
  {
    const held = metalHeld(t.actor);
    if (held.length) save.push(`${t.name} (${held.map(i => i.name).join(", ")})`);
    const why = [wearsMetalArmour(t.actor) ? "metal armour" : null,
                 t.actor.system?.creatureTypes?.synthetic ? "synthetic" : null].filter(Boolean);
    if (why.length) pulled.push(`${t.name} (${why.join(", ")})`);
  }
  return `<div class="vaarn-magnetic-field">`
    + `<div><b>Metal held - STR Save or it sticks to the shell:</b> ${save.length ? save.join("; ") : "nobody"}</div>`
    + `<div><b>Drawn into melee range:</b> ${pulled.length ? pulled.join("; ") : "nobody"}</div>`
    + `<div><i>Every PC on the scene; the Referee judges who is near.</i></div>`
    + synthMindButton(source?.name ?? "Magnetic field") + `</div>`;
}

/*
 * SYNTHETIC MIND - MAGNETIC FIELD DAMAGE (foundry-system-index.csv "Synthetic
 * Mind Magnetic Damage", RULED 2026-09-28 by Matt). The Synth's rule: "You
 * suffer d6 INT damage per round from magnetic fields." Every magnetic field
 * the book names counts - the Magneticrab, the Magnetic Orb, the Magnetic Stew
 * drinker and Magnetised Palms (not Magnetic Boots, which have no rules text).
 * The Electromagnet hazard already does this through its own trap tick; this
 * is the same per-round d6 INT, one board entry per targeted Synthetic, for
 * the other four. Per-round, so it ticks only while a combat runs.
 */
const SYNTH_MIND_TEXT = "Synthetic Mind: d6 INT damage each round in a magnetic field. Remove it from the board when they leave the field or it stops.";

/** The button a magnetic field's card carries. `source` names the field. */
export function synthMindButton(source)
{
  const s = Handlebars.escapeExpression(String(source));
  return `<div><button type="button" class="vaarn-synth-mind" data-source="${s}">`
    + `Start d6 INT each round on the targeted Synths</button></div>`;
}

/** Put the field on each targeted Synthetic's board; anyone else is passed over silently. */
export async function onSynthMind(source)
{
  const name = `${source}: magnetic field`;
  const tokens = Array.from(game.user?.targets ?? []);
  if (!tokens.length) return ui.notifications.warn(`Target the Synths in ${source}'s field, then click again.`);
  const { startAbilityTick } = await import("./apply-to-target.js");
  const { entriesOf } = await import("../time/effect-board.js");
  const started = [], already = [];
  for (const token of tokens)
  {
    const actor = token.actor;
    if (!actor?.system?.creatureTypes?.synthetic) continue;
    if (entriesOf(actor).some(e => e.name === name)) { already.push(actor.name); continue; }
    await startAbilityTick(actor, { name, text: SYNTH_MIND_TEXT, ability: "int", dice: "1d6" });
    started.push(actor.name);
  }
  if (!game.combat)
    ui.notifications.warn(`"${name}" is set to remind each round, but no combat encounter is active — create one and it will start reporting.`);
  if (!started.length && !already.length) return null;
  return ChatMessage.create({
    speaker: { alias: name },
    content: `<p><b>${name}</b>: d6 INT each round.`
      + (started.length ? ` Now on the board of ${started.join(", ")}.` : "")
      + (already.length ? ` <i>Already on: ${already.join(", ")}.</i>` : "") + `</p>`,
  });
}

/** Called from knave.js: the button on any card, whoever posted it. */
export function registerSynthMindButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    html.find(".vaarn-synth-mind").on("click", ev =>
    {
      ev.preventDefault();
      onSynthMind(ev.currentTarget.dataset.source || "Magnetic field");
    });
  });
}
