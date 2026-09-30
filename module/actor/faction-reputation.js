/**
 * Faction Reputation (foundry-system-index.csv "Faction Reputation").
 *
 * Factions/Factions.md: PCs have Reputation (REP) with each faction,
 * "a number between -10 and +10", and the Reputation Standing table maps
 * that number onto seven standings. This file is the STATE HOLDER and
 * the standing derived from it, which is all the row is scoped to.
 *
 * FOUR SEPARATE ROWS SIT AROUND IT and none of their work is here. The
 * registry is Faction Registry, the ally/enemy graph is Faction
 * Relationship Graph, tagging an NPC was Faction Membership Tag, and
 * turning a standing into a reaction roll was Reaction Roll from Faction
 * Standing. Those last two were DECLINED 2026-09-17 (Matt), so the ADV
 * and DIS that Liked and Disliked print are text on the standing that
 * the Referee applies by hand, and the seven atoms pointing at this row
 * are filed against the state holder only.
 *
 * SPENDING REPUTATION IS REFERENCE TEXT ONLY, RULED 2026-09-14 (Matt).
 * Factions.md says the Referee can CONSIDER positive REP a currency and
 * lists five things it might buy, with no prices and no mechanism. The
 * five examples are displayed and the Referee adjusts REP by hand. Both
 * a spend control and a GM-authored price list were declined.
 *
 * ---- Propagation, which is the part the book leaves open ----
 *
 * The book gives one sentence: "Some factions are opposed to one
 * another; in this case gaining reputation with one faction causes the
 * other faction's reputation to decrease by an equal amount." Three
 * things it does not say, all ruled 2026-09-14 (Matt):
 *
 * OPPOSED MEANS AN ENEMY EDGE IN EITHER DIRECTION. The graph is
 * directional and the book's own lists are lopsided, so the two readings
 * differ for six of the eight factions. Cacklemaw Clans names nobody -
 * its Enemies section is the prose "Everyone." - while three factions
 * name it; Lithic Lyceum is the exact mirror, naming three and named by
 * none. Reading only out-edges makes Cacklemaw inert, reading only
 * in-edges makes the Lyceum inert, and Matt ruled that neither should
 * be. The cost is named rather than hidden: The New Hegemony calls Faa
 * Nomads an ally while Faa Nomads calls the Hegemony an enemy, so those
 * two move in step despite one side calling it friendship.
 *
 * ONLY GAINS PROPAGATE. Losing REP with a faction does NOT raise its
 * enemies. This is the book's wording taken literally, and Matt declined
 * the symmetric reading: it would mean standing with a faction could be
 * farmed by antagonising its rival, which is a different game from the
 * one the sentence describes.
 *
 * ONE HOP, NEVER A CASCADE. A propagated LOSS is not itself a gain and
 * moves nothing further; and because only gains propagate, a chain
 * cannot form even in principle. Written down because "equal and
 * opposite" invites a recursive reading and a cascade over this graph
 * would touch most of the roster from any single change.
 *
 * CLAMPING IS PER FACTION AND SILENT. REP is a number between -10 and
 * +10, so a propagated loss that would pass -10 stops there. The amount
 * that "should" have been applied is not banked or redistributed - there
 * is nothing in the book to redistribute it to.
 *
 * ---- Storage ----
 *
 * `system.reputation`, an ARRAY of { faction, rep }, following the shape
 * `wounds` and `advancement` already use. Ruled 2026-09-14 (Matt) over
 * an actor flag, which would have needed no relaunch and would have sat
 * outside the documented data model.
 *
 * KEYED BY FACTION NAME, which is what Faction Registry settled and what
 * the graph and the NPC tag will both key by too. An array rather than
 * an object because every faction name contains spaces and two begin
 * with "The"; object keys would be fine in storage and are a hazard the
 * moment they reach a form field or an update path.
 *
 * A FACTION WITH NO ROW IS NEUTRAL, and that is why nothing writes a
 * full set of zeroes at creation: absence and 0 mean the same thing
 * here, so the stored array only ever holds factions actually dealt
 * with. The sheet still SHOWS every faction, because "you have no
 * standing with them" is worth seeing.
 */

import { effectiveFactions, resolveFaction } from "./faction-config.js";
import { resolvedEdges, ENEMY } from "./faction-graph.js";

export const REP_MIN = -10;
export const REP_MAX = 10;

/**
 * The book's Reputation Standing table, verbatim in its own order.
 * `min` is inclusive and rows are tried top down, so the first match
 * wins - which is how "10+" and "-10 or lower" work without needing an
 * open-ended bound at either end.
 */
export const STANDINGS = [
  { min: 10,  key: "hero",     label: "Hero",
    effect: "You are a hero to the faction. Its members will die to assist you if need be." },
  { min: 4,   key: "friend",   label: "Friend",
    effect: "You are a friend to the faction. Members will help you in almost any way they can. They will never attack you without cause." },
  { min: 1,   key: "liked",    label: "Liked",
    effect: "The faction has a warm opinion of you. When you encounter a member, the reaction roll has ADV." },
  { min: 0,   key: "neutral",  label: "Neutral",
    effect: "The faction has no opinion of you. Encounters use the standard reaction table." },
  { min: -3,  key: "disliked", label: "Disliked",
    effect: "The faction has a cold opinion of you. When you encounter a member, the reaction roll has DIS." },
  { min: -9,  key: "enemy",    label: "Enemy",
    effect: "Faction members are sworn to harm you. They will always attack you, hinder you, lie to you, or otherwise cause you trouble." },
  { min: REP_MIN, key: "nemesis", label: "Nemesis",
    effect: "You are a deadly threat to the faction and will be hunted down by its most committed members. If the faction is not in the business of killing, they hire a third party who is." }
];

/** The five things Factions.md says REP could buy. Displayed, never priced. */
export const SPEND_EXAMPLES = [
  "Goods",
  "Access to privileged information",
  "Recruitment of faction members as Followers",
  "Use of faction assets",
  "Tutoring in mystical secrets"
];

/** A number into the book's range. Anything unreadable is 0, not NaN. */
export function clampRep(value)
{
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(REP_MAX, Math.max(REP_MIN, n));
}

/** Which of the seven standings a score is. Never returns null. */
export function standingFor(rep)
{
  const n = clampRep(rep);
  return STANDINGS.find(s => n >= s.min) ?? STANDINGS[STANDINGS.length - 1];
}

/**
 * The stored array, tolerating anything. A malformed value degrades to
 * "no standing with anyone" rather than throwing — the same choice the
 * registry and the graph both make, and for the same reason: a sheet
 * that will not render is a worse failure than a lost number.
 */
export function storedReputation(actor)
{
  const raw = actor?.system?.reputation;
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const r of raw)
  {
    if (!r || typeof r !== "object") continue;
    const faction = String(r.faction ?? "").trim();
    if (!faction || seen.has(faction)) continue;
    seen.add(faction);
    out.push({ faction, rep: clampRep(r.rep) });
  }
  return out;
}

/** What this actor's REP with one faction is. Absent means Neutral. */
export function repWith(actor, faction)
{
  const wanted = String(faction ?? "").trim();
  const hit = storedReputation(actor).find(r => r.faction === wanted);
  return hit ? hit.rep : 0;
}

/**
 * The factions opposed to this one: an ENEMY edge in either direction.
 * See the header for why both directions count and what it costs.
 */
export function opposedTo(faction, edges = resolvedEdges())
{
  const n = String(faction ?? "").trim();
  const out = new Set();
  for (const e of edges)
  {
    if (e.kind !== ENEMY) continue;
    if (e.from === n) out.add(e.to);
    else if (e.to === n) out.add(e.from);
  }
  out.delete(n);
  return [...out];
}

/**
 * What a change WOULD do, computed without writing anything.
 *
 * Separated from the write deliberately: it is what the sheet needs in
 * order to say "and this will drop three others", and it is what a test
 * can assert against without a live actor. `delta` is the change to the
 * named faction; the propagated entries are always losses.
 */
export function planRepChange(actor, faction, delta, edges = resolvedEdges())
{
  const target = String(faction ?? "").trim();
  const d = Math.round(Number(delta));
  const current = repWith(actor, target);
  const next = clampRep(current + (Number.isFinite(d) ? d : 0));

  // The APPLIED gain, not the requested one. A gain that clamps at +10
  // moves nothing elsewhere, because nothing was actually gained.
  const applied = next - current;
  const changes = [{ faction: target, from: current, to: next }];

  if (applied > 0)
  {
    for (const other of opposedTo(target, edges))
    {
      const was = repWith(actor, other);
      const becomes = clampRep(was - applied);
      if (becomes !== was) changes.push({ faction: other, from: was, to: becomes, propagated: true });
    }
  }

  return { target, applied, changes };
}

/**
 * Apply a change, propagation included. One write.
 *
 * Returns the same shape planRepChange does, so a caller can report what
 * happened without recomputing it — and so what was reported is what was
 * actually written rather than a second guess at it.
 */
export async function changeRep(actor, faction, delta, edges = resolvedEdges())
{
  const plan = planRepChange(actor, faction, delta, edges);
  if (!plan.changes.some(c => c.from !== c.to)) return plan;
  await writeRows(actor, plan.changes);
  return plan;
}

/**
 * Set one faction's REP outright, propagating the gain if it is one.
 *
 * A direct edit on the sheet comes through here rather than through a
 * separate path, so typing +3 where +1 stood propagates exactly as
 * pressing a +2 control would. Otherwise the two routes would disagree
 * and only one of them would be tested.
 */
export async function setRep(actor, faction, value, edges = resolvedEdges())
{
  const current = repWith(actor, faction);
  return changeRep(actor, faction, clampRep(value) - current, edges);
}

/** The one write. Rows for factions not already stored are appended. */
async function writeRows(actor, changes)
{
  const rows = storedReputation(actor);
  for (const c of changes)
  {
    const row = rows.find(r => r.faction === c.faction);
    if (row) row.rep = c.to;
    else rows.push({ faction: c.faction, rep: c.to });
  }
  await actor.update({ "system.reputation": rows });
}

/**
 * Every faction this world offers, with this actor's standing in it.
 *
 * effectiveFactions() is the right list rather than the stored rows: a
 * faction you have never dealt with is Neutral and worth seeing, and
 * hiding a faction should take it off the sheet. The exception is the
 * one below, and it is the same hidden-is-a-picker-word distinction
 * Faction Registry settled.
 */
export function reputationRows(actor)
{
  const rows = [];
  const shown = new Set();

  for (const f of effectiveFactions())
  {
    shown.add(f.name);
    rows.push(rowFor(actor, f.name, f));
  }

  // A faction that has been HIDDEN since REP was recorded against it
  // still appears, flagged. Dropping it would silently hide a number the
  // character actually has, and resolveFaction() finds hidden entries
  // precisely so that stored data keeps meaning something.
  for (const r of storedReputation(actor))
  {
    if (shown.has(r.faction) || r.rep === 0) continue;
    rows.push({ ...rowFor(actor, r.faction, resolveFaction(r.faction)), hidden: true });
  }

  return rows;
}

function rowFor(actor, name, entry)
{
  const rep = repWith(actor, name);
  const standing = standingFor(rep);
  return {
    faction: name,
    rep,
    standing: standing.label,
    standingKey: standing.key,
    effect: standing.effect,
    // The book's own Gaining REP table for this faction, where it has
    // one. The Court of the Jigsaw Autarch is the only faction with
    // none - it prints Autarch Figment Effects in that slot instead.
    gaining: entry?.rep ?? null,
    opposed: opposedTo(name),
    hidden: false
  };
}
