/**
 * Save-Gated Effect (foundry-system-index.csv).
 *
 * A character spends an action on something they carry or ARE, makes a Save,
 * and gets one outcome on a success and a different one on a failure.
 *
 * THE TEST an entry has to pass to belong here, restated from the row because
 * it is the thing that keeps this from swallowing every save in the book: the
 * SAVER is the character using the thing, the save is the gate on their own
 * effect, and both branches do something. A save the character is made to roll
 * by somebody else's attack is Compel-a-Target Save. A save with no effect
 * gated behind it is an ordinary save. An activated thing with no save at all
 * is Activated Mutation Use.
 *
 * DECLARED, NOT NAME-KEYED. `MUTATIONS_WITH_USE_ICON` and its siblings in
 * knave.js are hardcoded name lists feeding hardcoded dispatcher branches in
 * actor-sheet.js, and a new entry needs an edit in both. An entry here needs
 * neither: it declares `saveGated` in its own roster and the sheet control,
 * the gates and the card all fall out of that. RULED 2026-09-13 (Matt) that
 * the existing mutations do NOT get retrofitted onto this — Activated Mutation
 * Use is built, shipped and tested across several groups, and rewriting it
 * buys nothing today while risking a path that works. Frog Tongue is the same
 * rule as the Usurper Arm and stays where it is; this is built so it COULD
 * migrate, not so that it must.
 *
 * WHAT THE SPEC LOOKS LIKE:
 *
 *   saveGated: {
 *     ability: "ego",                 // the saver's own ability
 *     label: "Call upon the ...",     // the control's tooltip
 *     oncePerCombat: true,            // optional; see the gate below
 *     prompt: "...",                  // what the character does, before the roll
 *     onSuccess: { text, handsBonus },
 *     onFailure: { text, spawn },
 *   }
 *
 * Both branches need `text`. Everything else is optional, and an entry whose
 * branches are text ONLY is a legitimate use of this rather than a degenerate
 * one — see Mirror Shield in advanced-exotica-data.js, where Matt ruled the
 * reflection is the player's to assert and the Referee's to allow, and wiring
 * it to the incoming attack would be inventing a rule the book does not print.
 *
 * TWO GATES, and only one of them is universal.
 *
 * - AN ACTIVE ENCOUNTER IS REQUIRED, always. RULED 2026-09-13 (Matt): "the
 *   save should only roll if a combat encounter is active. Otherwise report
 *   that no encounter is active." Same gate the Berserker StimRig uses, and
 *   for the same reason — an effect that lasts "the rest of combat" has no
 *   meaning outside one, so rolling for it would leave state nothing ends.
 * - ONCE PER ENCOUNTER IS PER-ENTRY, declared by `oncePerCombat`. The Usurper
 *   Arm has it (Matt: "once per combat encounter. If they succeeded, they have
 *   a benefit, and if they failed, the arm is awake and hostile" — either way
 *   the question is settled for that fight). Mirror Shield does not, because
 *   it is an Unlimited-use item reflecting whatever comes at it.
 *
 * STATE lives in a single actor flag keyed by entry, and is cleared by
 * knave.js's deleteCombat hook — same disposal as `berserkerActive`, and the
 * same reason it sweeps all actors rather than the tracker's combatants.
 */

import { resolveSave, SAVE_TARGET } from "./saves.js";
import { sentencesOf } from "../effects/interpret.js";
// The Exotica translators register when this loads (Implants, Exotica and Figments).
import "../item/implant-exotica-effects.js";
// The affliction translator too (Wounds and Afflictions chunk 3): the Usurper Arm's spec is its sentence.
import "../item/affliction-effects.js";
import { spawnNamedCreature } from "../actor/bestiary-spawn.js";
import { addEntry } from "../time/effect-board.js";
// A creature's own flags from its actor-level sentences (Effect Engine: Creatures chunk 2d).
import { creatureActorFlagsOf } from "../item/creature-effects.js";

/** The actor flag holding every live save-gated result, keyed by entry. */
export const FLAG = "saveGated";

/**
 * Flag keys are object paths, so a name with a space or a dot in it cannot be
 * one. Slugged rather than escaped: `Mirror Shield` and `usurper-arm` then
 * look the same in the stored object whichever roster they came from.
 */
export function slugKey(raw)
{
  return String(raw ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * The entry behind an Item, or null.
 *
 * Afflictions carry `afflictionKey` on the Item, so they are looked up by key
 * and survive a rename — Display Name Distinct from Lookup Key's whole point.
 * An Exotica's spec is its save-gated use sentence's (Effect Engine: Implants,
 * Exotica and Figments chunk 5, RULED 2026-10-06, Matt) - the translator still
 * finds the sentence by the Item's name, which is that roster's known limitation.
 */
export function saveGatedSpecFor(item)
{
  if(!item) return null;

  const afflictionKey = item.system?.afflictionKey;
  if(afflictionKey)
  {
    // Its save-gated sentence since Effect Engine: Wounds and Afflictions chunk 3
    // (2026-10-06), through the affliction translator.
    const s = sentencesOf(item).find(x => x.do?.verb === "special" && x.do.handler === "save-gated");
    if(!s) return null;
    const { verb, handler, ...spec } = s.do;
    return { key: slugKey(afflictionKey), spec };
  }

  // An armour-shaped Exotica is still an Exotica entry: the Mirror Shield is a
  // real shield since 2026-09-25 and keeps its reflect save.
  if(item.type === "exotica" || (item.type === "armor" && item.flags?.vaarn?.exotica))
  {
    const s = sentencesOf(item).find(x => x.do?.verb === "special" && x.do.handler === "save-gated");
    if(s) { const { verb, handler, ...spec } = s.do; return { key: slugKey(item.name), spec }; }
  }

  // A Neobloom's Bloomboon, keyed by its rolled variant - Mirrored Leaves,
  // Mirror Shield's rule grown as leaves (RULED 2026-09-22, Matt). Reached
  // from the ancestry Item's own use control, so the template does not draw a
  // second one for it.
  // Its save-gated sentence since Effect Engine: Consumables chunk 2 (2026-10-06).
  if(item.type === "ancestry" && item.system?.rule === "Bloomboons")
  {
    const s = sentencesOf(item).find(x => x.do?.verb === "special" && x.do.handler === "save-gated");
    if(s) { const { verb, handler, ...spec } = s.do; return { key: slugKey(item.system.variant), spec }; }
  }

  return null;
}

/** Does this Item offer a save-gated use? Backs the Handlebars gate. */
export function hasSaveGated(item)
{
  return saveGatedSpecFor(item) !== null;
}

/** Every live save-gated result on an actor, keyed by slug. */
export function saveGatedState(actor)
{
  return actor?.getFlag("vaarn", FLAG) ?? {};
}

/**
 * Why this use cannot happen, or null if it can.
 *
 * Runs BEFORE any roll, so a refusal costs the player nothing — the same order
 * contractAffliction uses for its helm refusal.
 *
 * The once-per-encounter check is keyed on the combat's id and not merely on
 * the flag's presence. deleteCombat clears the flags anyway, so this is the
 * belt to that braces: if an encounter is deleted without the hook running, or
 * a second encounter starts while stale state is still on the actor, a NEW
 * combat id is still a fresh attempt rather than a permanent refusal.
 */
export function saveGatedRefusal(actor, item)
{
  const found = saveGatedSpecFor(item);
  if(!found) return null;
  const { key, spec } = found;

  if(!game.combat)
    return `${item.name} can only be used during a combat encounter — none is active.`;

  if(spec.oncePerCombat)
  {
    const held = saveGatedState(actor)[key];
    if(held && held.combatId === game.combat.id)
    {
      return held.passed
        ? `${actor.name} has already dominated ${item.name} this encounter.`
        : `${item.name} is already awake and hostile — it cannot be called on again this encounter.`;
    }
  }

  return null;
}

/**
 * Resolve a rolled save against an entry's spec: apply the branch that
 * happened, record it, and report it.
 *
 * The VERDICT is passed in rather than the roll, so the one place that decides
 * what a natural 1 means stays combat/saves.js — the same shape _onCodexRead
 * uses. Callers roll (so ADV/DIS keeps living in the sheet's _rollD20) and
 * hand the result here.
 *
 * Returns a report rather than posting: `{ key, spec, passed, branch, spawned,
 * content }`. The caller posts, because the two call sites that exist today
 * post through different helpers.
 */
export async function applySaveGated(actor, item, verdict)
{
  const found = saveGatedSpecFor(item);
  if(!found) return null;
  const { key, spec } = found;

  const branch = verdict.passed ? spec.onSuccess : spec.onFailure;
  const report = { key, spec, passed: verdict.passed, branch, spawned: null };

  // THE ACTOR, NOT A TOKEN. RULED 2026-09-13 (Matt): the hostile limb "needs
  // to be an actor", created but not placed — "create the Actor, don't place
  // it". So nothing here touches the scene or the tracker; the Referee drags
  // it in where it belongs, which also means this works when the host has no
  // token placed at all.
  if(branch?.spawn)
  {
    report.spawned = await spawnNamedCreature(branch.spawn);
    if(!report.spawned)
      ui.notifications?.warn(`${branch.spawn} is not in the Bestiary compendium — rebuild the pack.`);
    // Bound to the Host (RULED 2026-09-24, Matt): a limb whose misses hurt its
    // host has to know whose limb it is. Recorded here, where the host is
    // known, and only on a creature whose rule needs it.
    else if(creatureActorFlagsOf(report.spawned).boundToHost)
      await report.spawned.setFlag("vaarn", "hostActorId", actor.id);
  }

  // ONE DECLARATION, NOT A PER-ROUND REMINDER. RULED 2026-09-13 (Matt): "only
  // declare that the extra attack is in effect once, when the save is
  // successful. The mechanical effect of the save is +1 to the PC's hand
  // count." So the card says it once and the hand is a live derived bonus —
  // see actor.js, which reads this flag every render.
  const handsBonus = Number(branch?.handsBonus ?? 0);

  const state = { ...saveGatedState(actor) };
  state[key] = { combatId: game.combat?.id ?? null, passed: verdict.passed, handsBonus };
  await actor.setFlag("vaarn", FLAG, state);
  // A BORROWED HAND IS ON THE BOARD (Shared Pipelines chunk 6, RULED A and B
  // 2026-10-05): the entry ends with the combat, clears this key's record and
  // posts the over-capacity card first - by any path, a hand removal included.
  // A failure records no hand and gets no entry; its record only gates the
  // once-per-combat refusal, and the combat-end sweep clears it.
  if(handsBonus > 0)
    await addEntry(actor, { name: `${item.name}: +${handsBonus} hand${handsBonus === 1 ? "" : "s"}`, text: branch?.text ?? "",
      note: `from ${item.name}`, endsWithCombat: true, clearFlag: `vaarn.${FLAG}.${key}`, lapseHands: handsBonus });

  report.content = `<b>${item.name}</b> — ${verdict.passed ? "success" : "failure"}. ${branch?.text ?? ""}`;
  return report;
}

/**
 * The extra hands an actor's live save-gated results grant.
 *
 * Derived every render by actor.js rather than baked into hands.max, so it
 * reaches a character with no migration and disappears the moment the flag
 * does — the same reasoning hands.used itself already runs on.
 */
export function handsGrantedBy(actor)
{
  return Object.values(saveGatedState(actor))
    .reduce((sum, held) => sum + Number(held?.handsBonus ?? 0), 0);
}

/**
 * The card an actor needs when their granted hands go away, or null.
 *
 * MATT'S CATCH 2026-09-13, and it is a real hole rather than a nicety: "the PC
 * hand count would -1 at that point, and if they are now carrying too many
 * hands worth of equipped items, they should have to unequip something." A
 * character who spent the Usurper Arm's hand on a second weapon is over
 * capacity the moment the encounter ends, and nothing else in the system looks
 * — the equip gate only ever runs when something is EQUIPPED, and here nothing
 * is; the limit moved instead.
 *
 * IT TELLS THEM, IT DOES NOT UNEQUIP. Which item goes is the player's choice
 * and often a tactical one, and this code cannot know it. Same reasoning as
 * every other "resolve by hand" branch in this system.
 *
 * MUST BE CALLED BEFORE clearSaveGated, because it reads the bonus it is about
 * to lose. `hands.max` as read here already includes the grant — actor.js adds
 * it every render — so the post-combat maximum is that number minus the grant.
 */
export function handsLapseCard(actor, lost = handsGrantedBy(actor))
{
  if(actor?.type !== "character") return null;

  // `lost`: the hands going now - one board entry's (chunk 6), or every
  // grant at once for the legacy combat-end sweep.
  const granted = Number(lost) || 0;
  if(!granted) return null;

  const used = Number(actor.system?.hands?.used ?? 0);
  const after = Number(actor.system?.hands?.max ?? 0) - granted;
  if(used <= after) return null;

  const over = used - after;
  return `<b>${actor.name}</b> loses the use of a borrowed hand as the fight ends —`
       + ` ${used} hands' worth of equipment against ${after} hand${after === 1 ? "" : "s"}.`
       + ` Unequip ${over === 1 ? "something" : `${over} hands' worth`} from the sheet.`;
}

/**
 * Drop every save-gated result. Called from knave.js's deleteCombat hook.
 *
 * RULED 2026-09-13 (Matt): the flag clears and the spawned Actor does NOT —
 * "leave it, clear the flag only". Nothing here deletes a document. A limb
 * left on the scene is the Referee's to remove, and if the fight rolls
 * straight into another encounter it is still there to add.
 */
export async function clearSaveGated(actor)
{
  if(actor.getFlag("vaarn", FLAG)) await actor.unsetFlag("vaarn", FLAG);
}
