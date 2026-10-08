/**
 * Affliction Contraction and Cure — foundry-system-index.csv, with
 * "Nanomachine Slot Occupancy" folded into it on Matt's 2026-09-13
 * instruction ("fold the other row into this one").
 *
 * Becoming infected, carrying the infection as real state, and stopping being
 * infected. The EFFECTS are mostly not here: fourteen BUILT mechanisms already
 * carry them, and progression belongs to Long-Clock Recurrence. This owns the
 * state that says a character HAS the thing.
 *
 * ── TWO PLACES AT ONCE, AND THEY ARE NOT THE SAME PLACE ────────────────────
 *
 * RULED 2026-09-13 (Matt): "the board can be used for a public display
 * indicating symptoms and elapsed time", AND every affliction puts an Item on
 * the sheet. The division is not cosmetic:
 *
 *   BOARD ENTRY — that the affliction exists, since when, and what it is
 *   doing. Every afflicted actor gets one, PC or NPC.
 *
 *   ITEM — the mechanical carrier. PLAYER CHARACTERS ONLY. RULED 2026-09-13
 *   (Matt): "I do not want to litigate any disease items or effects for
 *   non-PCs... NPCs getting sick shouldn't be an ongoing ordeal to track like
 *   it is with PCs." An NPC therefore gets tracking and nothing else, which is
 *   also what disposes of the 54 pack creatures whose claw and bite attacks
 *   are unstructured prose.
 *
 * ── THE INFECTION BORROWS THE SLOT AND GIVES THE IMPLANT BACK ──────────────
 *
 * The book: nanomachine infections "occupy an Ability slot, much like
 * beneficial cybernetics, overwriting any pre-existing implants in the slot".
 * What "overwriting" does to the implant is NOT in the book, and was the
 * question Nanomachine Slot Occupancy was filed to answer.
 *
 * RULED 2026-09-13 (Matt), verbatim: "infection contracted -> note the
 * cybernetics that are disabled by this infection ON the infection's card and
 * remove those items from the character's sheet -> add the infection to the
 * sheet in their place -> when cured, delete the infection item and re-create
 * the cybernetics that had been displaced". So: SUSPENDED, never destroyed. A
 * character does not lose an implant they paid for.
 *
 * The displaced implants are stored as complete `toObject()` payloads on the
 * infection Item, not as ids. An id would dangle the moment the Item is
 * deleted, which is the same instant it needs recording.
 *
 * WHY SUSPENSION AND NOT SUPPRESSION, given Innate Item Suppression exists and
 * would have left the implant visible: because the book says the slot is
 * OCCUPIED, and two things in one slot is exactly what the implant model
 * refuses. Suppression switches an effect off; this has to make room.
 *
 * ── CONTRACTION IS ROLLED FROM THE CARD ────────────────────────────────────
 *
 * The system's standing convention for a compelled save is descriptive — the
 * card names it and the target's controller rolls their own ability button.
 * That cannot work here, and the reason is mechanical rather than stylistic:
 * the sheet's ability buttons know nothing about what is being resisted, so
 * they cannot apply the DIS the book gives Synths and implanted characters.
 * Put to Matt as such, and RULED 2026-09-13: "yes, intention is for them to
 * roll from the affliction card."
 *
 * ── CURE TAKES NO SAVE ─────────────────────────────────────────────────────
 *
 * Diseases.md does say the target number serves "Saves to resist AND TREAT the
 * infection", so a treat-roll is in the book. Not building it is a choice.
 * RULED 2026-09-13 (Matt): "no save for curing since the book is not clear.
 * Just a GM-only Cured button for ending the affliction. This allows GMs to
 * decide whether they want characters to roll a save after treatment."
 *
 * And the cure REVERSES: "all ONGOING effects should be ended by being cured.
 * From my reading, the only thing that would linger is stat damage, which
 * would recover using the normal long rest rules." Labyrinth Pox is a
 * deliberate departure from its printed "arrests" wording — see its entry.
 */

import { AFFLICTIONS, afflictionByKey, slotsOccupiedBy, saveTargetFor, heldSlots,
         diseaseImmuneTypes } from "./affliction-data.js";
import { IMPLANTS } from "./chargen-data.js";
import { MUTATION_TABLE } from "./mutation-data.js";
import { helmRefusal, bodyRollMods } from "../effects/body.js";
import { ADVANCED_IMPLANTS } from "./advanced-implants-data.js";
import { entriesOf, setEntries } from "../time/effect-board.js";
import { afflictionFixedOf, afflictionSuppressesOf } from "./affliction-effects-data.js";
// What an affliction does over time, from its sentences (Wounds and Afflictions chunk 4).
import { afflictionOverTimeOf } from "../item/affliction-effects.js";
import { spanFieldFrom } from "../time/declared-span.js";
import { startRecurrence, stopRecurrence } from "../time/recurrence.js";
import { recurrenceByKey } from "../time/recurrence-data.js";
import { ROLLTABLES } from "./rolltable-data.js";
import { innateItemsFor, suppressItems, releaseSuppression } from "../item/suppression.js";
import { armourSlotOf } from "../effects/item-stats.js";

/** The flag namespace an affliction's own state lives under on its Item. */
export const SOURCE_PREFIX = "affliction:";

/** The suppression source key an affliction uses, so a cure releases its own. */
export function sourceKeyFor(key)
{
  return SOURCE_PREFIX + key;
}

/* ------------------------------------------------------------------ *
 * IMMUNITY AND DISADVANTAGE — reminders and rolls, never gates
 * ------------------------------------------------------------------ */

/**
 * What the Referee should be reminded of before afflicting this actor.
 *
 * A REMINDER, and the book is why: JADE IBIS, "Synthetic and Mineral-type
 * creatures are immune to diseases, unless otherwise noted." A hard block would
 * make the exception unreachable, so this returns a sentence and nothing acts
 * on it. Keyed on creature type since 2026-09-16 - see affliction-data.js.
 */
export function immunityNoteFor(actor, entry)
{
  if(entry?.kind !== "disease") return null;
  const types = diseaseImmuneTypes(actor);
  if(!types.length) return null;
  return `${actor.name} is ${types.join(" and ")}. Synthetic and Mineral-type creatures are immune to diseases, unless otherwise noted.`;
}

/**
 * Does this actor resist a nanomachine infection at DIS?
 *
 * This one IS mechanical, because the book makes it a roll rather than an
 * exemption: "Synths and characters with cybernetic implants Save to resist
 * nanomachine infestations with DIS." Implants make you MORE vulnerable here,
 * not less, which is the opposite of the intuition and worth the comment.
 *
 * Returns `{ dis, sources }` shaped like toxinModifiers and fleeModifiers, so
 * the card can name what fired rather than merely applying it.
 */
export function nanomachineDis(actor, entry)
{
  if(entry?.kind !== "nanomachine") return { dis: false, sources: [] };
  const sources = [];
  // The body's DIS on saves vs nanomachines since Mutations and Ancestry Rules
  // chunk 2b: Synthetic Mind (an Item, or the ancestry text - ruling B).
  sources.push(...bodyRollMods(actor, "save", "nanomachine").dis);
  const implants = (actor?.items ?? []).filter(i => i.type === "implant");
  if(implants.length) sources.push(`${implants.length} cybernetic implant${implants.length === 1 ? "" : "s"}`);
  return { dis: sources.length > 0, sources };
}

/**
 * Does this actor resist a DISEASE at ADV?
 *
 * "ADV on Saves vs diseases and poisons" — Heightened Immune System. RULED
 * 2026-09-16 (Matt), on Save-Modifier Effects on the Forgettable Tab: the
 * diseases half applies to every disease save the system rolls, the
 * contraction save on the exposure card and the daily save on the recurrence
 * card; the poisons half is toxinModifiers. Same shape as nanomachineDis.
 */
export function diseaseAdv(actor, entry)
{
  if(entry?.kind !== "disease") return { adv: false, sources: [] };
  const sources = [];
  // The body's ADV on saves vs disease since Mutations and Ancestry Rules chunk 2b.
  sources.push(...bodyRollMods(actor, "save", "disease").adv);
  return { adv: sources.length > 0, sources };
}

/**
 * Every source that modifies a save against this affliction, in the shape
 * card-save.js rolls from: `{ advSources, disSources }`. One question for both
 * cards that roll one, so the exposure save and the daily save cannot disagree
 * about who has ADV.
 */
export function afflictionSaveModifiers(actor, entry)
{
  return {
    advSources: diseaseAdv(actor, entry).sources,
    disSources: nanomachineDis(actor, entry).sources,
  };
}

/* ------------------------------------------------------------------ *
 * SLOTS AND DISPLACEMENT
 * ------------------------------------------------------------------ */

function implantEntryFor(name)
{
  return IMPLANTS.find(i => i.name === name) ?? ADVANCED_IMPLANTS.find(i => i.name === name) ?? null;
}

/** The ability slots an implant Item occupies, uppercase. */
export function implantSlots(item)
{
  const entry = implantEntryFor(item?.name);
  if(!entry?.ability_slot) return [];
  return entry.ability_slot.split("+").map(s => s.trim().toUpperCase()).filter(Boolean);
}

/** The ability slots an affliction Item occupies, uppercase. Read off the Item. */
export function afflictionSlots(item)
{
  const raw = item?.system?.abilitySlot;
  if(!raw) return [];
  return String(raw).split("+").map(s => s.trim().toUpperCase()).filter(Boolean);
}

/**
 * The implants an infection would displace — those sharing any ability slot.
 *
 * Named rather than merely counted, because the card has to SAY which ones
 * went: Matt's timeline puts that on the infection's card specifically, and a
 * player whose implant silently vanished would reasonably read it as a bug.
 */
export function implantsDisplacedBy(actor, slots)
{
  const want = new Set(slots);
  return (actor?.items ?? [])
    .filter(i => i.type === "implant")
    .filter(i => implantSlots(i).some(s => want.has(s)));
}

/**
 * Does an affliction already occupy one of these slots?
 *
 * The mirror of the implant-vs-implant check in item-effects.js, and the half
 * that stops an implant being installed INTO an occupied infection. Without
 * it the occupation would be one-directional: the infection displaces the
 * implant, and the player reinstalls it the next minute.
 */
export function afflictionBlocking(actor, slots)
{
  const want = new Set(slots);
  return (actor?.items ?? [])
    .filter(i => i.type === "affliction")
    .find(i => afflictionSlots(i).some(s => want.has(s))) ?? null;
}

/**
 * Why this actor cannot take an affliction whose Item is a worn helm, or null.
 *
 * BRAIN CORAL IS THE ONLY ONE, and this exists because the guard everyone
 * assumed would cover it does not. actor-sheet.js refuses a second helm at the
 * EQUIP BUTTON; contraction creates the Item already equipped and never goes
 * near that handler. So the protection was one-directional — a second helmet
 * was correctly refused on a Brain Coral'd character, while Brain Coral itself
 * landed happily on a horned one. Found by test 137.27, 2026-09-13, having
 * been asserted as working with no new code. It was not.
 *
 * RULED 2026-09-13 (Matt), who kept the interaction deliberately when it was
 * raised as a collision: "this is actually kind of a neat interaction, let's
 * leave horned characters immune to brain coral. Their skulls have too much
 * going on for it to engage."
 *
 * THIS DUPLICATES THE SHEET'S RULE, and says so rather than hiding it. The
 * equip guard is embedded in a long method behind a click handler, so sharing
 * one copy is a real edit to code that has passed live testing — the same
 * judgement saves.js records for the four save-resolution copies it did not
 * move. Filed as Helm Occupancy Duplication so the honest state is written
 * down instead of discovered again.
 */
export function helmRefusalFor(actor, entry)
{
  if(entry?.item?.armorSlot !== "helm") return null;
  // ONE COPY since Mutations and Ancestry Rules chunk 2a (ruling D, 2026-10-05):
  // the equip control and this read body.js helmRefusal.
  const worn = (actor?.items ?? []).filter(i =>
    i.type === "armor" && armourSlotOf(i) === "helm" && i.system.equipped).length;
  return helmRefusal(actor, worn);
}

/* ------------------------------------------------------------------ *
 * CONTRACTION
 * ------------------------------------------------------------------ */

/**
 * Roll the things the book rolls ONCE, at contraction.
 *
 * Three afflictions have one, and all three are "always the same" thereafter:
 * the Gitch's infected ability, the Usurper Arm's location, and the Fabricator
 * Stoma's extruded object. Rolled here rather than per tick for the reason
 * recurrence-data.js already gives about the Stoma — "It is always the same
 * object".
 *
 * THE STOMA'S OBJECT is d100 on the Vault Trinkets table (JADE IBIS; RULED
 * 2026-09-21, Matt). It is rolled here for every exposure; one the Referee
 * chose in the expose dialog is carried on the card and wins over this roll.
 */
export async function rollContractionDetails(entry)
{
  // The slot and location from the baked sentences since Effect Engine: Wounds
  // and Afflictions chunk 3 (2026-10-06).
  const fixed = afflictionFixedOf(entry.key);
  const out = { slotRoll: null, abilitySlot: fixed.abilitySlot, location: null, object: null };
  if(entry.kind === "nanomachine" && fixed.abilitySlot === "d6")
  {
    const r = new Roll("1d6");
    await r.evaluate({ async: true });
    out.slotRoll = r.total;
    out.abilitySlot = fixed.slotRollOrder[r.total - 1];
  }
  if(fixed.locations?.length)
  {
    const r = new Roll("1d6");
    await r.evaluate({ async: true });
    out.location = fixed.locations[r.total - 1];
  }
  const recurrenceKey = afflictionOverTimeOf(null, entry.key).recurrenceKey;
  const objectTable = recurrenceKey ? recurrenceByKey(recurrenceKey)?.objectTable : null;
  if(objectTable) out.object = rollObjectTable(objectTable);
  return out;
}

/**
 * One roll on a RollTable in rolltable-data.js, as the result's text. The
 * table's own die is its highest range end. Returns "" for an unknown table,
 * so a missing table shows as a blank object rather than throwing mid-contract.
 */
export function rollObjectTable(name, die = n => Math.floor(Math.random() * n) + 1)
{
  const table = ROLLTABLES.find(t => t.name === name);
  if(!table) return "";
  const size = Math.max(...table.results.map(r => r.range[1]));
  const n = die(size);
  return table.results.find(r => n >= r.range[0] && n <= r.range[1])?.text ?? "";
}

/**
 * Infect an actor.
 *
 * Returns a report of what actually happened, because several of the steps are
 * conditional and a caller that assumed them would describe the wrong thing on
 * the card.
 */
export async function contractAffliction(actor, key, { details = null, stomaObject = null } = {})
{
  // A chosen object wins; otherwise the one rolled with the other details.
  stomaObject = stomaObject || details?.object || null;
  const entry = afflictionByKey(key);
  if(!entry) return { error: `No affliction named ${key}.` };
  if(entriesOf(actor).some(e => e.afflictionKey === key))
    return { error: `${actor.name} already has ${entry.name}.` };
  // PCs only: an NPC gets no Item, so a helm it would never wear cannot block
  // anything. Checked before any roll, so a refusal costs nothing.
  if(actor.type === "character")
  {
    const refusal = helmRefusalFor(actor, entry);
    if(refusal) return { error: refusal };
  }

  const now = game.time?.worldTime ?? 0;
  const rolled = details ?? await rollContractionDetails(entry);
  const isPC = actor.type === "character";
  const report = { entry, rolled, isPC, item: null, displaced: [], suppressed: 0, recurrence: null };
  // Its stages, recurrence and span from its sentences since chunk 4 (2026-10-06).
  const overTime = afflictionOverTimeOf(actor, key);

  // ── THE ITEM, PCs ONLY ───────────────────────────────────────────────────
  if(isPC)
  {
    const bookSlots = entry.kind === "nanomachine"
      ? slotsOccupiedBy(entry, rolled.abilitySlot) : [];

    // Displacement is decided by the BOOK's slots — those are what the
    // infection actually grows into.
    const displaced = implantsDisplacedBy(actor, bookSlots);
    report.displaced = displaced.map(i => i.name);
    const stored = displaced.map(i => i.toObject());

    // ── THE INFECTION HOLDS EVERY SLOT IT EMPTIED ─────────────────────────
    //
    // Matt's catch 2026-09-13, and it is a real hole rather than a nicety.
    // Solar Scaling occupies CON + EGO. Goldencough takes CON, so Solar
    // Scaling is displaced — and EGO is now free. The player installs an EGO
    // implant, cures the Goldencough, Solar Scaling comes back, and TWO
    // implants claim EGO. The slot rule is broken by the restore itself, with
    // nothing to notice: the conflict hook only ever runs at creation, and the
    // creation that breaks it is the cure putting back something that was
    // legal when it left.
    //
    // So the held set is the book's slots UNION every slot the displaced
    // implants were holding. The infection keeps the seat warm.
    //
    // NOT 8 OF 40 IS THE POINT — this is 8 of the 40 implants, one of them
    // three slots wide (Dreadnaught Carapace, STR + DEX + CON), so it is an
    // ordinary case and not a corner.
    //
    // NO CASCADE IS NEEDED, and the reason is an invariant rather than luck:
    // any OTHER implant overlapping an expanded slot would have had to share a
    // slot with a displaced implant, which checkImplantSlotConflict already
    // forbids. So one pass is complete on any actor the system could have
    // built. A loop here would be dead code pretending to be caution.
    const slots = heldSlots(bookSlots, displaced.map(i => implantSlots(i)));
    report.heldSlots = slots;
    report.borrowedSlots = slots.filter(s => !bookSlots.includes(s));

    if(displaced.length) await actor.deleteEmbeddedDocuments("Item", displaced.map(i => i.id));

    const spec = entry.item ?? { type: "affliction", slots: 0 };
    const [made] = await actor.createEmbeddedDocuments("Item", [{
      name: entry.name,
      type: spec.type,
      system: {
        ...spec,
        type: undefined,
        intrinsic: true,
        description: `<p>${entry.effects}</p>`
                   + (rolled.location ? `<p><b>Location:</b> ${rolled.location}</p>` : "")
                   + `<p><b>Cure:</b> ${entry.cure}</p>`,
        afflictionKey: key,
        virulence: entry.virulence,
        // Labyrinth Pox's Stage 3 countdown (2026-09-21, Matt: the GM starts
        // it). An entry declaring nothing adds nothing.
        ...spanFieldFrom(overTime),
        // THE HELD SET, not the book set. afflictionSlots() reads this field and
        // item-effects.js refuses an implant against it, so recording only the
        // printed slot would leave the borrowed ones unguarded - which is the
        // whole bug this expansion exists to close.
        abilitySlot: slots.join(" + "),
        bookSlot: rolled.abilitySlot ?? "",
        contractedAt: now,
        displaced: stored,
        stomaObject: stomaObject ?? null,
        location: rolled.location ?? null,
        stage: 0,
      },
    }]);
    report.item = made;

    // ── A STAGED ATTACK - Hiveyhump's swarm (Per-Round Effect Reminder
    // wiring, RULED 2026-09-25 by Matt: "an item that can do an attack with
    // no to-hit roll"). Given now and inert until the first stage; the sheet
    // reads the stage when it is used, so no timer grows it. The cure takes it.
    if(overTime.stages?.some(s => s.damage))
      await actor.createEmbeddedDocuments("Item", [{
        name: `Swarm (${entry.name})`,
        type: "weaponMelee",
        system: { damageDice: overTime.stages[0].damage, equipped: true, hands: 0, slots: 0, tags: [], intrinsic: true,
          description: `<p>${entry.effects}</p><p><b>Automatically hits</b> one opponent - unblockable. Refused until the first stage.</p>` },
        flags: { vaarn: { autoHit: true, stagedBy: key } }
      }]);

    // ── SUPPRESSION, which today is Jellybones and only Jellybones ─────────
    // Its suppress sentence since Effect Engine: Wounds and Afflictions chunk 3.
    const suppresses = afflictionSuppressesOf(key);
    if(suppresses.length)
      report.suppressed = await suppressItems(
        actor, innateItemsFor(actor, suppresses), sourceKeyFor(key));
  }

  // ── PROGRESSION, where the book gives one ────────────────────────────────
  if(overTime.recurrenceKey)
    report.recurrence = await startRecurrence(actor, {
      recurrenceKey: overTime.recurrenceKey,
      objectLabel: stomaObject ?? null,
    });

  // ── THE BOARD ENTRY, everyone ────────────────────────────────────────────
  await setEntries(actor, [...entriesOf(actor), {
    id: foundry.utils.randomID(),
    kind: "affliction",
    afflictionKey: key,
    name: entry.name,
    text: entry.effects,
    note: entry.kind === "nanomachine" && report.heldSlots?.length
      ? `Slot: ${report.heldSlots.join(" + ")}` : "",
    origin: isPC ? "pc" : "npc",
    revealed: false,
    revealLabel: "",
    itemId: report.item?.id ?? null,
    startTime: now,
    stage: 0,
    // CONDITIONS RIDE THE BOARD ENTRY, not the Item, because that is where
    // stateful-effect.js's activeDeltas already looks — it sums `applied` over
    // board entries and hasCondition reads the result. Janus Lenses is the
    // only affliction with one today, and rest.js's HALF_LONG_REST has been
    // waiting for a source since it was built: its own comment names Janus
    // Lenses. Declaring it here is the whole wiring.
    //
    // Given to NPCs as well as PCs, unlike the Item. A condition is tracking
    // rather than litigation — nothing has to be reversed on a creature's
    // sheet — and it costs nothing to be true for both.
    //
    // `av` rides the same way (Live AV Computation wiring, 2026-09-25):
    // Jellybones' "lose one point of base AV", for as long as the entry is on
    // the board, which is until the cure.
    //
    // NO LONGER WRITTEN since Effect Engine: Wounds and Afflictions chunk 3
    // (RULED 2026-10-06, Matt): stateful-effect.js reads an affliction entry's
    // AV and conditions from its sentences by afflictionKey, and ignores the
    // applied.av and applied.conditions every older entry still carries.
    applied: null,
    // Never on either expiry number line, for the same reason a recurrence is
    // not: this is what keeps the board's sweep from deleting it. An affliction
    // ends on a cure, not on a date.
    unit: null, amount: null, startRound: null,
    expiresAtTime: null, expiresAtRound: null,
  }]);

  return report;
}

/* ------------------------------------------------------------------ *
 * CURE
 * ------------------------------------------------------------------ */

/**
 * End an affliction and put back everything it was holding.
 *
 * ORDER MATTERS. The displaced implants are recreated from the payload stored
 * on the infection Item, so they have to be read BEFORE it is deleted.
 */
export async function cureAffliction(actor, key)
{
  const entry = afflictionByKey(key);
  if(!entry) return { error: `No affliction named ${key}.` };

  const board = entriesOf(actor);
  const mine = board.find(e => e.afflictionKey === key);
  if(!mine) return { error: `${actor.name} does not have ${entry.name}.` };

  // Read before the Item is deleted - an Item's sentences win while it is held (chunk 4).
  const report = { entry, overTime: afflictionOverTimeOf(actor, key), restored: [], released: 0, itemDeleted: false };

  // BY KEY FIRST, BY NAME AS INSURANCE, and the insurance is for exactly one
  // Item. Brain Coral is created as an `armor` so it occupies the helm slot and
  // the existing equip guard refuses a second helmet with no new code — but
  // `afflictionKey` is not in the armor template, so it rides as an extra
  // field. bestiary-build.js's damageTypes does the same and records it as
  // verified to survive document creation. If it ever stops surviving, the
  // failure would be a cure that silently leaves the Item behind, so the name
  // match is the cheap guard against it rather than a second lookup path
  // anybody should rely on.
  const item = (actor.items ?? []).find(i => i.system?.afflictionKey === key)
            ?? (actor.items ?? []).find(i => i.name === entry.name && (i.type === "affliction" || i.type === entry.item?.type));
  if(item)
  {
    const stored = Array.isArray(item.system.displaced) ? item.system.displaced : [];
    await actor.deleteEmbeddedDocuments("Item", [item.id]);
    report.itemDeleted = true;
    if(stored.length)
    {
      await actor.createEmbeddedDocuments("Item", stored);
      report.restored = stored.map(s => s.name);
    }
  }

  // Releases only this affliction's own holds, which is the whole reason
  // suppression carries a list of sources rather than a boolean.
  // The staged attack it gave goes with it (Hiveyhump's swarm, 2026-09-25).
  const staged = (actor.items ?? []).filter(i => i.flags?.vaarn?.stagedBy === key).map(i => i.id);
  if(staged.length) await actor.deleteEmbeddedDocuments("Item", staged);

  report.released = await releaseSuppression(actor, sourceKeyFor(key));

  // The recurrence and the board entry both go. stopRecurrence is the book's
  // own exit condition — recurrence-data.js's clauses "stop on a cure rather
  // than on a date".
  for(const e of entriesOf(actor))
    if(e.kind === "recurrence" && e.recurrenceKey === report.overTime.recurrenceKey && report.overTime.recurrenceKey)
      await stopRecurrence(actor, e.id);
  await setEntries(actor, entriesOf(actor).filter(e => e.afflictionKey !== key));

  return report;
}

/* ------------------------------------------------------------------ *
 * ELAPSED TIME AND STAGES
 * ------------------------------------------------------------------ */

/** Seconds an affliction has been carried, from its board entry. */
export function elapsedSeconds(boardEntry, now = null)
{
  const t = now === null ? (game.time?.worldTime ?? 0) : now;
  return Math.max(0, t - Number(boardEntry?.startTime ?? 0));
}

/**
 * How long it has been carried, in words.
 *
 * NOT effect-board.js's formatSpan, and the difference is the whole reason
 * this exists. That function formats time REMAINING, so zero means "about to
 * expire" and it returns the string "expiring" — which is correct there and
 * nonsense here, where zero means the character has only just caught it. The
 * board read "carried expiring" for every fresh affliction until this was
 * found, by looking at a rendered row rather than at the code, 2026-09-13.
 *
 * Rounds DOWN, unlike formatSpan, for the same reason it rounds up: a span
 * should never claim more than has actually happened. Three and a half days
 * carried is "3 days", because the book's thresholds are day counts and a
 * Referee reading "4 days" would apply Hivey Hump's second stage a day early.
 */
export function formatElapsed(seconds)
{
  const s = Math.max(0, Number(seconds) || 0);
  if(s < 3600) return "less than an hour";
  if(s < 86400)
  {
    const h = Math.floor(s / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const d = Math.floor(s / 86400);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

/**
 * The stage an affliction has reached on elapsed time alone.
 *
 * Only two afflictions have these and both are the BOOK's own numbers, not
 * invented staging: Hivey Hump's hump at three days and its growth at seven,
 * and Labyrinth Pox's Stage 2 at three days. recurrence-data.js deliberately
 * left them out — "only the clause that repeats is modelled here" — and named
 * this row as where they belong.
 *
 * ANNOUNCED, NEVER APPLIED, which is the ruling Long-Clock Recurrence already
 * runs on for its own thresholds. Reaching one is reported and the Referee
 * decides.
 */
// `entry` is anything with the stages - afflictionOverTimeOf's read since chunk 4.
export function stageReached(entry, boardEntry, now = null)
{
  if(!entry?.stages?.length) return null;
  const days = elapsedSeconds(boardEntry, now) / 86400;
  let reached = null;
  for(const s of entry.stages) if(days >= s.afterDays) reached = s;
  return reached;
}

/**
 * Apply an affliction's one-time onset effect.
 *
 * ONLY BRAIN CORAL AND GOLDENCOUGH HAVE ONE, and both are the same shape: roll
 * a die, lose that much of an ability, and — for Brain Coral — gain the same
 * number of another. Behind a Referee button rather than applied at
 * contraction, because the book times neither. Matt flagged Brain Coral's
 * onset as undecided at scoping ("which we will have to decide, book doesn't
 * say") and AGREED 2026-09-13 that nothing should invent a delay: the Item
 * lands inert, the board shows elapsed time, and the Referee chooses when.
 *
 * ── THE LOSS AND THE GAIN ARE STORED DIFFERENTLY, AND THE CURE IS WHY ──────
 *
 * The LOSS goes to `woundDamage`, which is where every other ability loss in
 * this system goes and which survives the cure to heal with rest — exactly
 * what Matt's cure ruling asks for: "the only thing that would linger is stat
 * damage, which would recover using the normal long rest rules."
 *
 * The GAIN is a live contributor on the board entry's `applied.abilities`,
 * summed by stateful-effect.js's activeDeltas and fed into the same
 * liveAbilityBonus channel implants use. It therefore stops the instant the
 * affliction leaves the board, with no reverse write to lose — and a cured
 * mystic does not keep the psychic power they bought with their body.
 *
 * ONCE, AND RECORDED ON THE ENTRY. recurrence.js learned this the hard way and
 * says so in its own comment: a disabled button is not stored in the message,
 * so any re-render brings it back live. Double-applying is silent and the card
 * looks identical either way.
 */
export async function applyManualEffect(actor, key)
{
  const entry = afflictionByKey(key);
  // Its manual-effect sentence since Wounds and Afflictions chunk 4 (2026-10-06).
  const spec = afflictionOverTimeOf(actor, key).manualEffect;
  if(!spec) return { error: `${entry?.name ?? key} has no onset effect to apply.` };

  const board = entriesOf(actor);
  const mine = board.find(e => e.afflictionKey === key);
  if(!mine) return { error: `${actor.name} does not have ${entry.name}.` };
  if(mine.manualApplied) return { error: `${entry.name}'s onset has already been applied.` };

  const roll = new Roll(spec.formula);
  await roll.evaluate({ async: true });
  const n = roll.total;

  const lost = spec.loses?.ability ?? null;
  const gained = spec.gains?.ability ?? null;
  // "ongoing" contributes while the affliction runs and vanishes with it.
  // "damage" writes woundDamage, which survives the cure and heals with rest.
  // Named per SIDE rather than per affliction, because Brain Coral's two halves
  // are both ongoing while Goldencough's single half is not, and an
  // affliction-level flag could not say that.
  const lostLasting = spec.loses?.lasting ?? "damage";
  const gainLasting = spec.gains?.lasting ?? "ongoing";

  if(lost && lostLasting === "damage")
  {
    const current = Number(actor.system?.abilities?.[lost]?.woundDamage ?? 0);
    await actor.update({ [`system.abilities.${lost}.woundDamage`]: current + n });
  }

  // Contributions are summed into one object so an affliction whose loss AND
  // gain are both ongoing writes both in a single update — two sequential
  // writes would race against the same stale entry list.
  const abilities = { ...(mine.applied?.abilities ?? {}) };
  if(lost && lostLasting === "ongoing")
    abilities[lost] = (abilities[lost] ?? 0) - n;
  if(gained && gainLasting === "ongoing")
    abilities[gained] = (abilities[gained] ?? 0) + n;

  await setEntries(actor, entriesOf(actor).map(e => e.id !== mine.id ? e : {
    ...e,
    manualApplied: true,
    manualRoll: n,
    applied: Object.keys(abilities).length
      ? { ...(e.applied ?? {}), abilities }
      : (e.applied ?? null),
  }));

  return { entry, roll, amount: n, lost, gained, lostLasting, gainLasting };
}

/** Every afflicted actor in the world, paired with its board entry. */
export function collectAfflictions()
{
  const out = [];
  for(const actor of game.actors)
    for(const e of entriesOf(actor))
      if(e.kind === "affliction") out.push({ actor, entry: e, def: afflictionByKey(e.afflictionKey) });
  return out;
}

/** Everything an actor is currently afflicted with. */
export function afflictionsOn(actor)
{
  return entriesOf(actor).filter(e => e.kind === "affliction");
}

export { AFFLICTIONS, afflictionByKey, saveTargetFor, slotsOccupiedBy };
