/**
 * Companion Ownership — which PLAYER CHARACTER a creature belongs to.
 *
 * WHY THE LINK POINTS AT AN ACTOR AND NOT AT A USER, which is the decision
 * this whole module rests on. The book's unit of ownership is the CHARACTER,
 * every time and in all four rosters: "Tame animals belonging to A PC act
 * under THAT PC's direct control"; "The combined Level of all pets, steeds,
 * and other followers under A PC'S direct command cannot exceed THEIR EGO
 * bonus"; Followers and Mercenaries repeat it; "EACH PC may ride one steed."
 * The book never says player.
 *
 * Foundry's own Actor ownership is per USER and is left exactly as it is — a
 * permission, not a rule. RULED 2026-09-13 (Matt), on the case that decides
 * it: one player running several PCs. Reading Foundry ownership would merge
 * that player's characters into a single companion pool, so each character
 * would share the others' EGO bonus and the others' companions. Pointing at
 * the character dissolves the problem rather than surviving it.
 *
 * A FLAG ON THE COMPANION, not a list on the character (Matt, same day). The
 * decisive property is what happens when the other end disappears: a dead
 * Actor id resolves to null here and the companion simply reads as unowned,
 * whereas a list on the character would keep an entry for a companion that no
 * longer exists and nothing would say so. That is also why there is no cleanup
 * hook — see ownerOf.
 *
 * FIVE THINGS WAIT ON THIS, which is why it is its own mechanism rather than a
 * clause of whichever row needed it first: Companion Level Limit (whose
 * companions, against whose EGO bonus), Companion Ration Upkeep (whose pack
 * feeds this creature), Companion Advancement ("When a PC would gain XP, they
 * may choose to give the XP to their pet"), Lethal Blow Redirection ("the
 * Synthhound's owner"), and the Exultant's Hawk atom on Travel and Rations
 * ("brings ITS OWNER 1 ration of bird meat per day").
 */

const SCOPE = "vaarn";
const OWNER_FLAG = "ownerActorId";
const KIND_FLAG = "companionKind";
/**
 * The flag advancement.js writes a companion's level-up history to.
 *
 * It lives here rather than in advancement.js because item-slots.js needs to
 * READ it - a pet's carrying capacity is the levels it has gained - and
 * item-slots.js cannot import advancement.js: that would pull chargen-app.js
 * into the actor-prepare path and end the offline drivability this module's
 * own header promises tools/test-item-slots.mjs. companion.js is a leaf with
 * no static imports, so both sides can depend on it.
 */
export const COMPANION_LEDGER_FLAG = "advancement";

/**
 * A COMPANION'S KIND - RULED 2026-09-19 (Matt). Companion Advancement levels
 * a Pet or a Follower and neither of the other two, and Companion Ration
 * Upkeep gives a Follower or Mercenary three unfed days and a Pet or Steed
 * seven, so both need to tell the four apart — and they cut the four in
 * different places, which is why the kind is recorded rather than inferred
 * from what any one rule happens to need. Nothing recorded it: under Foundry
 * 11 a creature copied out of a compendium keeps no link back to it, and only
 * hirelings carried a marker.
 *
 * (That first clause read "Pet Advancement is the pet rule only" until
 * 2026-09-19, when Followers were brought into the same mechanism and it
 * stopped being true. The conclusion did not change.)
 *
 * TWO SOURCES, both ruled. The pets and steeds packs stamp the kind when they
 * are built (pack-build.js), as hireling-builder.js already stamps
 * flags.vaarn.hireling; and the owner dialog below lets the Referee set or
 * correct it, which is the only route for a tamed Bestiary creature or a pet
 * placed before the stamp existed. Matching the name against the rosters was
 * declined: a renamed pet would stop being a pet, the fault Group 194 found in
 * the Vimana.
 */
export const COMPANION_KINDS = { pet: "Pet", steed: "Steed", follower: "Follower", mercenary: "Mercenary" };

/**
 * The creature's kind, or null. The explicit flag wins; a hireling with none
 * falls back to the kind hireling-builder.js stamped, so no hireling built
 * before this existed needs touching.
 */
export function companionKindOf(actor)
{
  const kind = actor?.flags?.[SCOPE]?.[KIND_FLAG] || actor?.flags?.[SCOPE]?.hireling || null;
  return kind in COMPANION_KINDS ? kind : null;
}

/** Set the kind, or clear it with null. */
export async function setCompanionKind(actor, kind)
{
  if(!actor || actor.type !== "npc")
    throw new Error("Only an npc Actor has a companion kind.");
  if(!kind) return actor.unsetFlag(SCOPE, KIND_FLAG);
  if(!(kind in COMPANION_KINDS)) throw new Error(`Unknown companion kind "${kind}".`);
  return actor.setFlag(SCOPE, KIND_FLAG, kind);
}

/**
 * A companion's level-up history, oldest first. Never null.
 *
 * Moved here from advancement.js 2026-09-20 with Container Slot Capacity; that
 * module re-exports it, so every existing caller is unchanged.
 *
 * The clone falls back to a JSON round-trip when foundry.utils is absent, so a
 * caller running outside a world - which is the whole point of the flag living
 * on a leaf module - gets the same copy semantics instead of a TypeError.
 */
export function companionLedger(companion)
{
  const raw = companion?.getFlag?.(SCOPE, COMPANION_LEDGER_FLAG) ?? [];
  const clone = globalThis.foundry?.utils?.duplicate ?? (v => JSON.parse(JSON.stringify(v)));
  return clone(raw);
}

/**
 * The character that owns this companion, or null.
 *
 * NULL COVERS THREE DIFFERENT SITUATIONS ON PURPOSE, and callers should not
 * try to tell them apart: no flag set, a flag naming an Actor that has since
 * been deleted, and a flag naming something that is no longer a character.
 * All three mean the same thing to every consumer — nobody owns this — and
 * collapsing them is what makes a dangling id harmless instead of a bug.
 *
 * RULED 2026-09-13 (Matt): no deleteActor hook and no cleanup. The flag is
 * allowed to dangle precisely because resolving it costs one lookup and
 * answers honestly. A hook would also destroy the record that the companion
 * ever had an owner, which is the opposite of what an append-only project
 * wants.
 */
export function ownerOf(companion)
{
  const id = companion?.getFlag?.(SCOPE, OWNER_FLAG);
  if(!id) return null;
  const owner = game.actors?.get(id);
  return owner && owner.type === "character" ? owner : null;
}

/** True if this companion's flag names an Actor that is no longer resolvable. */
export function ownerIsDangling(companion)
{
  return !!companion?.getFlag?.(SCOPE, OWNER_FLAG) && !ownerOf(companion);
}

/**
 * Every companion this character owns.
 *
 * A SCAN RATHER THAN A STORED LIST, which is the direct consequence of putting
 * the flag on the companion. It is the cheaper side of the trade in every way
 * that matters here: the world holds tens of actors, not thousands, and the
 * answer cannot be stale because there is nothing to keep in step.
 *
 * Ordered by name so a readout is stable between calls — Companion Level Limit
 * will want to print this list, and a set that reorders itself looks like it
 * changed.
 */
export function companionsOf(character)
{
  if(!character?.id) return [];
  return game.actors
    .filter(a => a.type === "npc" && a.getFlag(SCOPE, OWNER_FLAG) === character.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Point a companion at a character, or at nobody when `character` is null.
 *
 * ANY npc IS ELIGIBLE (Matt, 2026-09-13), not only something spawned from the
 * pets or steeds packs. The book's limit counts "all pets, steeds, and other
 * followers", and Followers and Mercenaries carry the same EGO rule in their
 * own chapters — so narrowing this to the two packs that happen to exist today
 * would make Companion Level Limit unable to count two of the four rosters the
 * rule names.
 */
export async function setOwner(companion, character)
{
  if(!companion || companion.type !== "npc")
    throw new Error("Only an npc Actor can be given an owner.");
  if(character === null || character === undefined)
  {
    await syncPlayerOwnership(companion, null);
    return companion.unsetFlag(SCOPE, OWNER_FLAG);
  }
  if(character.type !== "character")
    throw new Error("A companion's owner must be a character Actor.");
  await companion.setFlag(SCOPE, OWNER_FLAG, character.id);
  // PLAYER TOKEN PLACEMENT (RULED 2026-09-28, Matt): a companion someone owns
  // gets a linked, Friendly token - a token placed from now on IS the
  // companion, not a copy - and its owner's player gets Foundry ownership, so
  // they can place and run it. Tokens already on a map are left as they are.
  if(!companion.isToken)
    await companion.update({ "prototypeToken.actorLink": true,
                             "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.FRIENDLY });
  await syncPlayerOwnership(companion, character);
  return companion;
}

const GRANT_FLAG = "companionPlayerGrant";

/**
 * Give the players who own `character` OWNER of the companion, and take back
 * what an earlier owner's players were given here - and only that: ownership
 * the Referee set by hand is never touched, since the flag records exactly the
 * users this function granted.
 */
async function syncPlayerOwnership(companion, character)
{
  if(companion.isToken) return;
  const previous = companion.getFlag(SCOPE, GRANT_FLAG) ?? [];
  const players = character
    ? game.users.filter(u => !u.isGM && character.testUserPermission(u, "OWNER")).map(u => u.id)
    : [];
  const update = {};
  for(const id of previous) if(!players.includes(id)) update[`ownership.-=${id}`] = null;
  for(const id of players) update[`ownership.${id}`] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  update[`flags.${SCOPE}.${GRANT_FLAG}`] = players;
  await companion.update(update);
}

/** Convenience for the dialog's "nobody" choice and for tests. */
export async function clearOwner(companion)
{
  return setOwner(companion, null);
}

/**
 * The owner picker, reached from a control on the companion's own sheet.
 *
 * SHAPED ON openTransferDialog deliberately — a control on the sheet opening a
 * select of Actors — because that is the one actor-choosing UI this system
 * already has and a second shape would be a second thing to learn. GM-gated
 * for the same reason item-transfer.js gives at length: the write lands on
 * another actor, and a player has no permission to make it.
 */
export function openOwnerDialog(companion)
{
  if(!game.user.isGM)
    return ui.notifications.warn("Only the Referee can set a companion's owner.");
  if(!companion || companion.type !== "npc")
    return ui.notifications.warn("Only a creature can be given an owner.");
  // Opened from an unlinked token's sheet, the owner goes on the Actor in the
  // Actors tab, not the token's own copy - companionsOf and the rest window
  // read game.actors (Matt, 2026-09-28). The token shows it through its base.
  if(companion.isToken) companion = companion.token?.baseActor ?? game.actors.get(companion.id) ?? companion;

  const characters = game.actors.filter(a => a.type === "character")
    .sort((a, b) => a.name.localeCompare(b.name));
  if(!characters.length)
    return ui.notifications.warn("There is no character for this creature to belong to.");

  const current = ownerOf(companion);
  // "Nobody" is a real choice and is listed first, so clearing an owner needs
  // no separate control. A dangling flag lands here too — current is null, so
  // the dialog opens on Nobody and choosing it tidies the flag away.
  const options = [`<option value="">— nobody —</option>`]
    .concat(characters.map(a =>
      `<option value="${a.id}"${current?.id === a.id ? " selected" : ""}>${a.name}</option>`))
    .join("");

  const kind = companionKindOf(companion);
  const kinds = [`<option value="">— not set —</option>`]
    .concat(Object.entries(COMPANION_KINDS).map(([k, label]) =>
      `<option value="${k}"${kind === k ? " selected" : ""}>${label}</option>`))
    .join("");

  new Dialog(
  {
    title: `Owner of ${companion.name}`,
    content: `<form>
        <div class="form-group">
          <label><b>${companion.name}</b> belongs to</label>
          <select name="owner">${options}</select>
        </div>
        <div class="form-group">
          <label>as a</label>
          <select name="kind">${kinds}</select>
        </div>
        <p class="notes">Pets, Followers and Mercenaries each have their own
        pool, and each is capped by the owner's EGO. Steeds are not limited.
        Level 0 companions add nothing to a pool, but must still be fed.</p>
      </form>`,
    buttons:
    {
      set:
      {
        label: "Set",
        callback: async html =>
        {
          const id = html.find('select[name="owner"]').val();
          const picked = html.find('select[name="kind"]').val() || null;
          const target = id ? game.actors.get(id) : null;
          const level = Number(companion.system?.level?.value ?? 0);

          // Companion Level Limit (2026-09-19). Checked BEFORE either write,
          // so a declined confirm leaves the companion exactly as it was
          // rather than owned but untyped — the two writes below are not one
          // transaction and there is nothing to roll back.
          //
          // THE KIND SELECT IS A SECOND WAY IN and is gated by the same check:
          // re-marking a Level 4 Steed as a Pet moves 4 into a pool that has a
          // limit, from one that has none. Matt asked 2026-09-19 whether any
          // rule makes a kind CHANGE necessary — none does, the select exists
          // to correct a record — which is the reason this is a confirm and
          // not a refusal, since correcting an always-wrong record on an
          // always-over-limit character must not be blocked by the limit.
          //
          // Imported dynamically to keep the dependency one-directional:
          // companion-limit.js reads companionsOf and companionKindOf from
          // here, and a static import back would close the loop. The same move
          // affliction-card.js makes, for the same reason.
          const { levelLimitCheck, confirmOverLevelLimit } = await import("./companion-limit.js");
          const check = levelLimitCheck(target, picked, level, companion);
          if(!await confirmOverLevelLimit(check, `<b>${companion.name}</b> (Level ${level})`)) return;

          await setOwner(companion, target);
          // Only write when it changed, so a hireling left on its stamped
          // kind keeps reading it from flags.vaarn.hireling alone.
          if(picked !== companionKindOf(companion)) await setCompanionKind(companion, picked);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "set"
  }).render(true);
}
