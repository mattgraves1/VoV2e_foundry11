/**
 * Reaction Roll Button - foundry-system-index.csv "Reaction Roll Button",
 * FILED and RULED 2026-10-05 by Matt.
 *
 * The book (Combat/Reactions): a d20 on the Reactions table, modified by the
 * PC's EGO bonus if they can communicate. 1-8 negative, 9-15 indifferent,
 * 16-20 positive, 21+ actively helpful.
 *
 * A button on an NPC sheet rolls it for that creature:
 *  - the GM picks the PC doing the talking and whether they can communicate;
 *    if they can, that PC's EGO is added;
 *  - if the speaker CARRIES a weapon whose sentences act on a reaction roll -
 *    Sacred (ADV) or Blasphemous (DIS), Effect Engine: Weapon Tags ruling E -
 *    the GM is asked whether this creature follows the religion that blessed
 *    or cursed that weapon: a standing question, remembered per creature and
 *    weapon for the scene. Only the speaker's weapons count (Matt: the bearer
 *    meets the followers). ADV and DIS together cancel;
 *  - the result is a plain message whispered to the GMs - players see nothing
 *    at all (Matt: hidden from players; a whispered ROLL would still show them
 *    a private-roll stub naming the creature).
 *
 * The table is read from the system's own data (rolltable-data.js ROLLTABLES)
 * rather than the world's RollTable, so the button works in any world and
 * cannot drift from the book's ranges.
 */
import { ROLLTABLES } from "./rolltable-data.js";
import { reactionSentences } from "../item/weapon-tags.js";
import { settleGates } from "../effects/gates.js";
import { isSuppressed } from "../item/suppression.js";
import { ancestryTextSentences } from "./mutation-effects.js";
import { standingFor, repWith } from "./faction-reputation.js";
import { effectiveFactions } from "./faction-config.js";
import { standingSentencesOf } from "../item/remaining-effects.js";

const REACTIONS = ROLLTABLES.find(t => t.name === "Reactions");

/** The Reactions row for a total, its text plain. */
export function reactionFor(total)
{
  const row = REACTIONS?.results?.find(r => total >= r.range[0] && total <= r.range[1])
    ?? (total < 1 ? REACTIONS?.results?.[0] : null);
  return row ? row.text.replace(/\*\*/g, "") : "";
}

/** The roll formula for an EGO bonus and an advantage of -1 (DIS), 0 or 1 (ADV). */
export function reactionFormula(ego, advantage)
{
  const die = advantage > 0 ? "2d20kh" : advantage < 0 ? "2d20kl" : "1d20";
  return ego ? `${die} + ${ego}` : die;
}

/** The characters a player plays - the PCs who may be doing the talking. */
function speakers()
{
  return game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
}

/**
 * Roll a reaction for `npc`, spoken to by `speaker`. Returns { total, text,
 * advantage, lines }. Exported so a test can call it without the dialog.
 */
export async function rollReaction(npc, speaker, { communicate = true, faction = null } = {})
{
  const ego = communicate ? Number(speaker?.system?.abilities?.ego?.effective ?? 0) : 0;
  let adv = 0, dis = 0;
  const lines = [];
  // Every source: any Item (GM Effect Builder chunk 1) - a weapon's tags, a
  // mutation's kinship (Antlers, Fur...), anything a GM wrote - and the ancestry
  // rules held as no Item, read from the ancestry text (Pure of Blood; Mutations
  // and Ancestry Rules chunk 2b, ruling B). [{ name, s }]
  const sources = [];
  for (const item of speaker?.items ?? [])
    if (!isSuppressed(item)) for (const s of reactionSentences(item)) sources.push({ name: item.name, s });
  for (const s of ancestryTextSentences(speaker))
    if ((typeof s.when === "string" ? s.when : s.when?.trigger) === "on-reaction-roll") sources.push({ name: s.tag, s });
  for (const { name, s } of sources)
  {
    // The gate asks about THIS creature and names the weapon (`is`), so two
    // groups or two weapons never share an answer.
    const gates = (s.if ?? []).map(g => g.gate === "followers" ? { ...g, is: name } : g);
    const r = await settleGates(gates, { actor: speaker, target: npc, title: `${npc.name}: reaction` });
    lines.push(...r.lines);
    if (!r.pass) continue;
    // "Sacred: ADV (Holy Lance)"; a source named for itself just "ADV (Fur)".
    const by = s.tag ?? s.label;
    const prefix = by && by !== name ? `${by}: ` : "";
    if (s.do?.verb === "adv") { adv++; lines.push(`${prefix}ADV (${name})`); }
    if (s.do?.verb === "dis") { dis++; lines.push(`${prefix}DIS (${name})`); }
  }
  // THE FACTION THE NPC BELONGS TO (Reaction Roll from Faction Standing, RULED
  // 2026-10-07, Matt): the GM names it on the dialog - nothing is stored on the
  // NPC (Faction Membership Tag stays declined). The speaker's REP with it is
  // their standing, and the standing's sentence is settled like any other:
  // Liked ADV, Disliked DIS, the other five their book text as a line, each
  // "Standing with <faction>: <standing>". REP only,
  // not the ally and enemy graph.
  if (faction)
  {
    const standing = standingFor(repWith(speaker, faction));
    for (const s of standingSentencesOf(standing))
    {
      const r = await settleGates(s.if ?? [], { actor: speaker, target: npc, standing: standing.key, title: `${npc.name}: reaction` });
      lines.push(...r.lines);
      if (!r.pass) continue;
      // One form for all seven: "Standing with The New Hegemony: Liked — ADV".
      const by = `Standing with ${faction}: ${standing.label}`;
      if (s.do?.verb === "adv") { adv++; lines.push(`${by} — ADV`); }
      else if (s.do?.verb === "dis") { dis++; lines.push(`${by} — DIS`); }
      else lines.push(`${by} — ${s.text}`);
    }
  }
  const advantage = Math.sign(adv) - Math.sign(dis);
  const roll = new Roll(reactionFormula(ego, advantage));
  await roll.evaluate({ async: true });
  const text = reactionFor(roll.total);
  const how = advantage > 0 ? " with ADV" : advantage < 0 ? " with DIS" : (adv && dis ? " (ADV and DIS cancel)" : "");
  // A PLAIN WHISPER, NOT A ROLL MESSAGE. Foundry v11 shows a whispered ROLL
  // to every user as a private-roll stub - blind or not - naming the creature
  // (found in Group 534.2). A whispered message with no roll attached is not
  // shown to anyone else at all, and the reaction is meant to be hidden from
  // players entirely (Matt). So the dice and the total are written out.
  const dice = roll.dice.map(d => d.results.map(r => r.result).join(", ")).join("; ");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: npc }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<p><b>Reaction</b> — ${npc.name} to ${speaker?.name ?? "the party"}`
      + `${communicate ? ` (EGO ${ego >= 0 ? "+" : ""}${ego})` : " (cannot communicate: no EGO)"}${how}</p>`
      + `<p>${roll.formula} [${dice}] = <b>${roll.total}</b></p><p><b>${text}</b></p>`
      + (lines.length ? `<p><i>${lines.join("<br>")}</i></p>` : ""),
    flags: { vaarn: { reactionRoll: { total: roll.total, formula: roll.formula } } }
  });
  return { total: roll.total, text, advantage, lines };
}

/** The NPC sheet's button: pick the speaker, then roll. GM only. */
export function openReactionDialog(npc)
{
  if (!game.user.isGM) return ui.notifications.warn("Only the Referee rolls a reaction.");
  const pcs = speakers();
  if (!pcs.length) return ui.notifications.warn("No player character to do the talking.");
  const options = pcs.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
  // The factions in play - the registry's, so a hidden or added one follows it.
  const factions = effectiveFactions().map(f => `<option value="${Handlebars.escapeExpression(f.name)}">${Handlebars.escapeExpression(f.name)}</option>`).join("");
  new Dialog({
    title: `${npc.name}: reaction`,
    content: `<p>Who is doing the talking?</p><p><select name="speaker">${options}</select></p>`
      + `<p><label><input type="checkbox" name="communicate" checked> They can communicate (adds their EGO)</label></p>`
      + `<p>Faction: <select name="faction"><option value="">None</option>${factions}</select></p>`,
    buttons: {
      roll: { label: "Roll reaction", callback: html => rollReaction(npc, game.actors.get(html.find('[name="speaker"]').val()),
        { communicate: html.find('[name="communicate"]').is(":checked"), faction: html.find('[name="faction"]').val() || null }) }
    },
    default: "roll"
  }).render(true);
}
