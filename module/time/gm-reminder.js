/**
 * Standing GM Reminder (foundry-system-index.csv "Standing GM Reminder") — a
 * GM-only, open-ended row on the Active Effect Board for a rule only the
 * Referee can act on, lasting as long as its source.
 *
 * FILED 2026-09-23 (Matt) while wiring the Forgettable-Effects Tab: the
 * Watchful Ferret nips its carrier at an unseen danger, which the Referee
 * knows about and the players do not, so the player's reminder tab is the
 * wrong place for it. Widened the same day to ancestry rules the Referee
 * applies — True-kin's Pure of Blood, Synth's Synthetic Mind, the Newbeast's
 * Beasthood and Kinship.
 *
 * THREE SOURCES, ONE ROW SHAPE:
 *
 *  - A HELD ITEM. The Item carries `flags.vaarn.gmReminder` (RULED 2026-09-23,
 *    Matt: a flag, not a name match — it survives a rename, and a hand-made or
 *    already-existing Item gets no row, which is the no-backfill rule), OR a
 *    gm-reminder sentence of its own: since Implants, Exotica and Figments
 *    chunk 5 (RULED 2026-10-06, Matt) the Watchful Ferret's row is its
 *    sentence and loot-builders.js no longer copies the roster's gmReminder,
 *    so a Ferret made before keeps its flag and gets one row either way. The row appears when the
 *    Item lands on a character or creature and goes when it leaves. A
 *    transfer is a delete plus a create carrying the Item's flags, so the row
 *    follows the Item to its new holder with nothing extra.
 *  - AN ANCESTRY, written by chargen once. A character made before this was
 *    built does not get one (no backfill, standing rule).
 *  - THE GM BY HAND, from the board's "Add a GM reminder" control (RULED
 *    2026-09-23, Matt, answering the row's open question).
 *
 * THE ROW STATES THE RULE ONLY (RULED 2026-09-23, Matt). It never works out
 * whether the rule currently applies — nothing here decides whether a
 * True-kin is "visibly mutated". The one value it may carry is a thing
 * chargen ROLLED for the character, the Newbeast's Animal Form, because the
 * rule means nothing at the table without it and it is the character's
 * record rather than a derived state.
 *
 * LINKED BY `reminderItemId`, NOT `itemId`. Every board reader that finds an
 * entry by `itemId` reads it as the Item's own switched-on effect —
 * round-effects.js roundEffectOf() — so reusing that field would show the
 * ferret as active on the sheet and let its own toggle delete the GM's row.
 *
 * GM-ONLY by the curse's `gmOnly` flag: visibilityFor() hides it from the
 * owner, and the Reveal control the curse brought stays (RULED 2026-09-23,
 * Matt). The GM deletes it with the board's ordinary end control.
 *
 * NEVER ON EITHER EXPIRY NUMBER LINE, for the reason curse.js gives: leaving
 * both stamps null is what stops sweepExpired() and the combat-end clear from
 * deleting it.
 */

import { sentencesOf } from "../effects/interpret.js";

import { entriesOf, setEntries } from "./effect-board.js";
import { ownerOf } from "../actor/companion.js";
// A creature's own flags from its actor-level sentences (Effect Engine: Creatures chunk 2d).
import { creatureActorFlagsOf } from "../item/creature-effects.js";

/** The actor types that hold an Item as its bearer. A container is storage. */
const HOLDER_TYPES = new Set(["character", "npc"]);

export function isGmReminder(entry)
{
  return entry?.kind === "gmReminder";
}

/**
 * Write one reminder row. `reminderItemId` ties it to a held Item; null for an
 * ancestry or a hand-made one. One row per Item: a second call for the same
 * Item returns the row already there.
 */
export async function addGmReminder(actor, { name, text = "", reminderItemId = null, reminderCompanionId = null, source = "manual" })
{
  if (!actor) return null;
  if (reminderItemId)
  {
    const existing = entriesOf(actor).find(e => isGmReminder(e) && e.reminderItemId === reminderItemId);
    if (existing) return existing;
  }
  if (reminderCompanionId)
  {
    const existing = entriesOf(actor).find(e => isGmReminder(e) && e.reminderCompanionId === reminderCompanionId && e.name === name);
    if (existing) return existing;
  }

  const entry = {
    id: foundry.utils.randomID(),
    kind: "gmReminder",
    name: String(name || "Reminder"),
    text: String(text ?? ""),
    note: "",
    itemId: null,
    reminderItemId,
    reminderCompanionId,
    // "item", "ancestry", "companion" or "manual" — what the board says it lasts for.
    source,
    origin: actor.type === "npc" ? "npc" : "pc",
    gmOnly: true,
    revealed: false,
    revealLabel: "",
    startTime: game?.time?.worldTime ?? 0,
    unit: null,
    amount: null,
    startRound: null,
    expiresAtTime: null,
    expiresAtRound: null
  };
  await setEntries(actor, [...entriesOf(actor), entry]);
  return entry;
}

/** What the board's meta line says about how long the row lasts. */
export function reminderSpan(entry)
{
  if (entry?.source === "item") return "while held";
  if (entry?.source === "ancestry") return "ancestry";
  if (entry?.source === "companion") return "while owned";
  return "until dismissed";
}

/**
 * createItem: a flagged Item arrived on a holder. Written by the user who
 * created the Item — they already had the right to change that actor, and
 * one writer avoids the two-GM double row (the dedupe above is the margin).
 */
/** Does this Item put a GM reminder row on its holder - its flag, or its own gm-reminder sentence? */
export function holdsGmReminder(item)
{
  if (item?.flags?.vaarn?.gmReminder) return true;
  return sentencesOf(item).some(s => s.do?.verb === "special" && s.do.handler === "gm-reminder");
}

export async function onReminderItemCreate(item, options, userId)
{
  if (userId !== game.user.id) return;
  if (!holdsGmReminder(item)) return;
  const actor = item.parent;
  if (!actor || !HOLDER_TYPES.has(actor.type)) return;
  await addGmReminder(actor, {
    name: item.name,
    text: item.system?.description ?? "",
    reminderItemId: item.id,
    source: "item"
  });
}

/** deleteItem: the Item left its holder, so its row goes with it. */
export async function onReminderItemDelete(item, options, userId)
{
  if (userId !== game.user.id) return;
  const actor = item?.parent;
  if (!actor) return;
  const entries = entriesOf(actor);
  const keep = entries.filter(e => !(isGmReminder(e) && e.reminderItemId === item.id));
  if (keep.length !== entries.length) await setEntries(actor, keep);
}

/**
 * Chargen's rows for one ancestry. `animalForm` is the Newbeast's rolled form,
 * folded into the name of each rule that declares `withAnimalForm`
 * ("Beasthood (New-Cat)"), per Matt's 2026-09-23 ruling on the two Newbeast
 * rules. A rule that needs the form and has none is written without it.
 */
export async function writeAncestryReminders(actor, defs, { animalForm = null } = {})
{
  for (const def of defs ?? [])
  {
    const name = def.withAnimalForm && animalForm ? `${def.rule} (${animalForm})` : def.rule;
    await addGmReminder(actor, { name, text: `<p>${def.text}</p>`, source: "ancestry" });
  }
}

/**
 * A COMPANION'S RULE ON ITS OWNER'S BOARD - the fourth source, RULED
 * 2026-09-24 (Matt). The Stridingfool's Abomination gives its RIDER DIS on
 * reactions with true-kin; riding is not modelled, and owning stands in for
 * it. The companion carries `flags.vaarn.ownerReminders` from its roster
 * rule; the row lives on the owner's board while they own it, linked by
 * `reminderCompanionId`, and goes when ownership moves or the companion is
 * deleted. Any GM row for this companion on a non-owner is removed, which is
 * how a change of owner is handled without knowing the previous one.
 */
export async function syncCompanionReminders(companion)
{
  if (!companion) return;
  const defs = creatureActorFlagsOf(companion).ownerReminders ?? [];
  const owner = defs.length ? ownerOf(companion) : null;
  for (const actor of game.actors?.filter(a => a.type === "character") ?? [])
  {
    if (actor.id === owner?.id) continue;
    const entries = entriesOf(actor);
    const keep = entries.filter(e => !(isGmReminder(e) && e.reminderCompanionId === companion.id));
    if (keep.length !== entries.length) await setEntries(actor, keep);
  }
  if (!owner) return;
  for (const def of defs)
    await addGmReminder(owner, {
      name: `${def.rule} (${companion.name})`,
      text: `<p>${def.text}</p>`,
      reminderCompanionId: companion.id,
      source: "companion"
    });
}

/** updateActor: an npc's owner flag changed. Same one-writer rule as above. */
export async function onCompanionOwnerUpdate(actor, changes, options, userId)
{
  if (userId !== game.user.id || actor?.type !== "npc") return;
  const f = changes?.flags?.vaarn ?? {};
  if (!("ownerActorId" in f) && !("-=ownerActorId" in f)) return;
  await syncCompanionReminders(actor);
}

/** deleteActor: a deleted companion's rows leave every owner's board. */
export async function onCompanionDelete(actor, options, userId)
{
  if (userId !== game.user.id || actor?.type !== "npc") return;
  for (const c of game.actors?.filter(a => a.type === "character") ?? [])
  {
    const entries = entriesOf(c);
    const keep = entries.filter(e => !(isGmReminder(e) && e.reminderCompanionId === actor.id));
    if (keep.length !== entries.length) await setEntries(c, keep);
  }
}
