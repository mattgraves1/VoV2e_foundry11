/**
 * Intrinsic Item Marker — `system.intrinsic`.
 *
 * True when an Item is PART OF THE CHARACTER rather than gear they carry: a
 * natural weapon, a mutation, an ancestry rule, a Mystic Gift, a surgically
 * installed implant. Read by anything that must treat a body part differently
 * from a sword.
 *
 * RULED 2026-09-08 (Matt) to be a template.json field rather than
 * flags.vaarn.intrinsic. The earlier recommendation was the flag, resting on
 * the relaunch and the lack of a backfill; both were dismissed — the relaunch
 * is a one-time setup step and this is a test world. What decided it instead:
 *
 *   - The exotica flag is NOT the precedent it resembles. xp-value.js's
 *     isExotica() tries `type === "exotica"` and the exotic tag list FIRST and
 *     only falls through to the flag for the minority those miss, such as Mind
 *     Shield arriving as an `armor`. That flag is an escape hatch layered on
 *     two working structural tests. This marker has no structural test beneath
 *     it at all, so it is the primary and only answer for every Item — and a
 *     property every Item has belongs in the data model.
 *   - A GM can tick a checkbox; a GM cannot set a flag without the console.
 *     That is what makes a hand-made natural weapon markable at all, and it
 *     matters more once Public Release Export puts this in front of GMs who
 *     will never open one.
 *   - template.json is where a third party reads what the system's data means.
 *
 * WHY THIS IS A FIELD READ AND NOTHING ELSE. `type` is not a sufficient
 * discriminator and must never be consulted here: the base Unarmed Strike and a
 * Crab Claw are `weaponMelee`, exactly like a sword. Neither is the 0-slot
 * proxy — a Mystic Gift is intrinsic and can occupy slots (chargen-app.js
 * writes `slots: g.slots ?? 1`), so the proxy is already false for a whole
 * category, not merely fragile. Any read that reaches past this field will be
 * wrong for precisely the items this marker exists to identify.
 *
 * An Item created before this field existed reads `undefined`, which is falsy
 * and so answers "not intrinsic". Matt declined a backfill for the existing
 * world 2026-09-08. If one is ever wanted, the 0-slot/0-hand/born-equipped
 * shape is a sound ONE-SHOT sweep even though it is an unsound definition —
 * the same latitude backfill-exotica-flag.js took when it matched on name for
 * a single pass and said so in its own header.
 */

/**
 * Item types where EVERY instance is intrinsic, however the Item was made.
 *
 * Not a read-time test — see above. This drives a creation-time default in
 * knave.js, so that a mutation dragged in from the sidebar by hand is marked
 * without anyone having to remember. Baking at creation is this codebase's
 * settled convention for exactly this kind of value, alongside slots and
 * damage dice (xp-value.js: "One field, one convention").
 *
 * Weapons are deliberately absent. `weaponMelee` is the one type that is
 * genuinely ambiguous, so natural weapons set the field explicitly at their
 * creation sites and a sword keeps the template default of false.
 *
 * `codex` is absent on purpose: a Hypergeometric Codex is a book, which is
 * carried gear and can be handed to another character. So is `wound`, which
 * is part of the character but wants to be deleted when it heals — the
 * opposite of what Item Control Visibility will do with this marker.
 *
 * `exhaustion` IS here, and the contrast with `wound` is the interesting part
 * because the two conditions are otherwise near-twins — both occupy item slots
 * through a paired Item, both kill by filling them. What separates them is who
 * removes them. A Wound is healed from the Wounds tab, an explicit player-
 * reachable act on a specific row. Exhaustion is cleared by CAMPING: one
 * Referee action on the Exploration Clock wipes every slot at once, and no
 * player ever removes one individually. So nothing is lost by refusing the
 * per-item routes, and three of them become wrong to offer:
 *
 *   - isDroppable  — a character cannot put their own tiredness on the floor,
 *     and if they could, the death rule would be trivially escapable
 *   - isTransferable — nor hand it to a friend, for the same reason
 *   - the Equip toggle — meaningless on a condition
 *
 * Getting those three for free is the whole reason this is a marker read
 * rather than a fourth copy of the `type === "wound"` test that isDroppable
 * and isTransferable already each carry. The GM's Delete control is NOT
 * affected: it sits inside an isGM gate of its own, independent of this
 * marker, so a Referee keeps a manual escape hatch for a single slot.
 */
// `figment` joined 2026-09-14 with Autarch Figment Grant. An Autarch Figment is
// a piece of the Jigsaw Autarch's own body grafted into the bearer — an eye, a
// gut, a maw, a nerve bundle. It is part of the character in exactly the sense
// this set means, and it can no more be traded away than a mutation can.
export const ALWAYS_INTRINSIC_TYPES = new Set(["mutation", "ancestry", "gift", "implant", "exhaustion", "figment"]);

/**
 * The single call the Intrinsic Item Marker row asks for: is this Item part of
 * the character? Accepts a Document or a plain object, so it works on
 * toObject() output and on a creation payload before the Item exists.
 */
export function isIntrinsic(doc)
{
  return doc?.system?.intrinsic === true;
}
