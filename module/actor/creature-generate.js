/**
 * A creature's GENERATED gear - foundry-system-index.csv "Item Creation from
 * Roll Table", Phase 8 wiring, RULED 2026-09-25 (Matt).
 *
 * THE BOOK: the Bandit carries a "Basic Weapon (generate p.xx)", the Gladiator
 * Synth and Knight Mordicant an "Advanced Melee Weapon (generate on
 * encounter)", the Knight Peregrine an "Advanced Weapon", and the Cacklemaw
 * Virago's second routine is an Advanced Weapon. The Cacogen's Corrupted Blood
 * is "Roll on the mutations table to determine the cacogen's curse", and "All
 * Titan Acolytes bear a randomly generated Cybernetic Implant".
 *
 * WHEN: ON ARRIVAL IN THE WORLD, RULED (Matt: "a"). Every Bandit is different
 * and none arrives unarmed. The compendium holds a PLACEHOLDER Item carrying
 * `flags.vaarn.generate` (bestiary-build.js), and the first world copy of the
 * creature replaces it with the rolled Item - whether dragged from the
 * compendium or spawned by a macro or a rule, because both create an Actor.
 * The placeholder is deleted, so a copy of an already-rolled creature (a
 * duplicate, a Fractalisk split) keeps what was rolled rather than rolling
 * again. The pack itself is never touched: an Actor inside a compendium is
 * skipped.
 *
 * WHAT IS ROLLED, and through what:
 *  - a weapon through rollWeapon, the Generate Weapon macro's own roller, at
 *    the printed tier. "Melee" forces melee; a plain "Weapon" is the macro's
 *    own random melee-or-ranged. A ranged one is a real weaponRanged Item
 *    and KEEPS ITS AMMO DIE (Matt: "keep the ammo die"). It is carried, not
 *    intrinsic, so it can be looted from the body. A Polymorphic roll brings
 *    its alternate form, paired, as Belligerent Paste does.
 *  - a mutation: one d100 on the mutation table, the Item chargen makes.
 *  - an implant: one d20 on the starting Cybernetic Implant table.
 * The mutation's and implant's bonuses and natural weapon reach the creature
 * through item-effects.js's bake, widened to creatures the same day.
 */
import { rollWeapon } from "./weapon-roller.js";
import { mutationByRoll, mutationItemData } from "./granted-pick.js";
import { buildStartingImplant } from "../item/loot-builders.js";
import { dropItem } from "./dropped-container.js";

const d = n => Math.floor(Math.random() * n) + 1;

/** The Item data a placeholder's `generate` spec rolls. Returns an array. */
async function rollGenerated(spec)
{
  if (spec.kind === "weapon")
  {
    const forceKind = spec.weaponKind === "melee" ? "Melee" : spec.weaponKind === "ranged" ? "Ranged" : undefined;
    const w = await rollWeapon(spec.tier, null, null, null, null, forceKind);
    const out = [{ name: w.name, type: w.type, system: { ...w.system, equipped: true } }];
    if (w.altForm) out.push({ name: w.altForm.name, type: w.altForm.type, system: { ...w.altForm.system } });
    return out;
  }
  if (spec.kind === "mutation")
  {
    const entry = mutationByRoll(d(100));
    return entry ? [mutationItemData(entry)] : [];
  }
  if (spec.kind === "implant") return buildStartingImplant();
  return [];
}

/**
 * Replace every placeholder on a newly created world creature with what it
 * rolls. The createActor hook calls this on the creating client only.
 */
export async function resolveGeneratedGear(actor, options, userId)
{
  if (userId !== game.user.id) return;
  if (actor.type !== "npc" || actor.pack) return;
  const placeholders = actor.items.filter(i => i.flags?.vaarn?.generate);
  if (!placeholders.length) return;

  const lines = [];
  for (const ph of placeholders)
  {
    const data = await rollGenerated(ph.flags.vaarn.generate);
    if (!data.length) continue;
    const created = await actor.createEmbeddedDocuments("Item", data);
    if (created.length === 2 && created[0].type.startsWith("weapon") && created[1].type.startsWith("weapon"))
    {
      await created[0].setFlag("vaarn", "polymorphicPairName", created[1].name);
      await created[1].setFlag("vaarn", "polymorphicPairName", created[0].name);
    }
    lines.push(`<b>${ph.name}</b>: ${created.map(i => `<b>${i.name}</b>`).join(" / ")}`);
    await ph.delete();
  }
  if (lines.length)
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `<b>${actor.name}</b> arrives with:<br>${lines.join("<br>")}` });
}

/**
 * CUT AN IMPLANT OUT OF A CREATURE, RULED 2026-09-25 (Matt: "we need a way to
 * loot it that will not install it"). The Sawbone Drone's capsule shape - an
 * exotica "Removed Implant (<name>)", 1 slot, whose Use reinstalls it - put in
 * the Dropped Items where butchery puts meat, for a player to pick up. The
 * implant Item is deleted, so the widened bake takes its bonuses back off the
 * creature. ANY TIME, not only from a corpse (Matt: "a, any time"): the
 * Referee decides when it is possible. GM-only, from the creature's sheet.
 */
export async function extractImplant(actor, implant)
{
  if (!game.user.isGM) return ui.notifications.warn("Only the Referee can cut an implant out.");
  if (implant?.type !== "implant" || implant.parent !== actor) return;
  const name = implant.name;
  const [capsule] = await actor.createEmbeddedDocuments("Item", [{
    name: `Removed Implant (${name})`,
    type: "exotica",
    system: { slots: 1, attuned: true, sealedImplant: name,
              description: `<p>An implant cut out of ${actor.name}. Use it to install: <b>${name}</b>.</p>` }
  }]);
  if (!capsule) return;
  await implant.delete();
  const dropped = await dropItem(capsule);
  ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
    content: dropped
      ? `<b>${name}</b> is cut out of <b>${actor.name}</b> and left in the Dropped Items, ready to install.`
      : `<b>${name}</b> is cut out of <b>${actor.name}</b> and stays on it as a capsule - nothing could be dropped.` });
}
