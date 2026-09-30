/**
 * EXOTICA IDENTIFICATION (foundry-system-index.csv "Exotica Identification").
 *
 * Core Rules/Exotica.md: "When a new item of Exotica is found, the GM will ask
 * for an INT save to work out what the device does. If the save is failed, the
 * PCs do not understand the item. They can either have it appraised at a
 * settlement, or use it and hope for the best."
 *
 * The book says nothing more, so everything below is a ruling (Matt,
 * 2026-09-19 — the row's Decisions carry the full list):
 *
 *  - NOT UNDERSTOOD MEANS HIDDEN. A player sees a stand-in name, a stand-in
 *    icon and no description. The GM always sees the real item.
 *  - NOTHING STARTS UNIDENTIFIED. The GM marks an item by hand. No creation
 *    path sets the flag, so an item without it is known — absence cannot rot,
 *    and no existing world item needs touching.
 *  - THE SAVE IS ASKED FOR, never fired. A GM control; the GM picks which
 *    character tries; a failure may be retried whenever the GM likes.
 *  - APPRAISAL IS THE GM'S IDENTIFY CONTROL. The book prices it nowhere.
 *  - A PLAYER CANNOT USE IT — no use, charge, attack or equip control, and
 *    the equip handler refuses them too. THE GM CAN (revised the same day):
 *    the Referee keeps every control, so "use it and hope" is adjudicated
 *    use through the GM, and the cards it posts are scrubbed of its name by
 *    onPreCreateChatMessage below. Marking still unequips, so equipping it is
 *    always a deliberate GM act.
 *  - A CARRIED EFFECT STILL APPLIES. Manifold Box's slots bake when the item
 *    lands, whatever its flag says; the PCs just do not know why.
 *
 * SCOPE is everything isExotica() catches, Exotic-tagged weapons included.
 * The flag on anything else is ignored rather than honoured, so marking a
 * sword unidentified by hand cannot hide it.
 *
 * THE FLAG IS THE LOOKUP, THE NAME STAYS THE NAME. Every roster join keeps
 * matching item.name (display-name.js's rule). Hiding is presentation only:
 * the stand-in is what a player reads, never what anything matches on.
 */
import { isExotica } from "./xp-value.js";

export const FLAG_SCOPE = "vaarn";
export const UNIDENTIFIED_FLAG = "unidentified";
export const STAND_IN_NAME = "Unidentified Exotica";
export const STAND_IN_IMG = "icons/svg/item-bag.svg";

/** True for an Exotica the GM has marked and nobody has identified yet. */
export function isUnidentified(doc)
{
  return !!doc?.flags?.[FLAG_SCOPE]?.[UNIDENTIFIED_FLAG] && isExotica(doc);
}

/**
 * Whether `user` must not see what this item is. The GM always sees it.
 * `user` defaults to the current one; the offline test passes its own.
 */
export function hiddenFrom(doc, user = globalThis.game?.user)
{
  return isUnidentified(doc) && !user?.isGM;
}

/**
 * The name for PUBLIC text — a chat line everyone reads. The GM's own view is
 * not a reason to name it there, because the players read the same message.
 */
export function publicNameOf(doc)
{
  return isUnidentified(doc) ? STAND_IN_NAME : doc?.name ?? "";
}

/**
 * The name for text only the current user reads — a notification, a dialog.
 * The GM gets the real one.
 */
export function viewerNameOf(doc)
{
  return hiddenFrom(doc) ? STAND_IN_NAME : doc?.name ?? "";
}

/**
 * The spellings a card may use for an item: its name, its display name, the
 * name without a trailing "(...)" ("hurls the empty Spirit Prison") and
 * without a plural s ("throws a C-Foam Pudding"). Longest first, so a
 * shorter form never splits a longer one it sits inside.
 */
export function nameFormsOf(doc)
{
  const forms = new Set();
  for(const n of [doc?.name, doc?.system?.displayName])
  {
    if(!n) continue;
    forms.add(n);
    const bare = n.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if(bare.length >= 4) forms.add(bare);
    for(const f of [n, bare]) if(/[^s]s$/.test(f) && f.length > 4) forms.add(f.slice(0, -1));
  }
  return [...forms].sort((a, b) => b.length - a.length);
}

/**
 * Whether a card's `form` means an unidentified item, given every item that
 * could carry that spelling.
 *
 * TWO COPIES OF ONE ITEM (Matt, 2026-09-19): an identified Tech Wand must not
 * be hidden because an unidentified Tech Wand exists too. So when the copies
 * sharing a spelling disagree, the card is attributed rather than guessed:
 *   1. the speaker's own copies decide, when it holds some and they agree;
 *   2. else the copy USED most recently — the card an attack or a USE posts
 *      comes from that very click (noteItemUse). This is what settles one
 *      character carrying both copies, and a card spoken for a target;
 *   3. else the card keeps the name. Leaning to showing it is the ruling:
 *      hiding a known item was the complaint.
 * The speaker comes first because the last click never expires: found in
 * testing, a click on a known copy elsewhere would otherwise un-hide a card
 * spoken for a character holding only the unknown one.
 */
export function scrubsForm(form, items, { lastUsed = null, speakerItems = [] } = {})
{
  const has = i => nameFormsOf(i).includes(form);
  const copies = items.filter(has);
  const hidden = copies.filter(isUnidentified);
  if(!hidden.length) return false;
  if(hidden.length === copies.length) return true;
  const own = speakerItems.filter(has);
  if(own.length && own.every(isUnidentified)) return true;
  if(own.length && !own.some(isUnidentified)) return false;
  if(lastUsed && has(lastUsed)) return isUnidentified(lastUsed);
  return false;
}

/**
 * `text` with every spelling of every unidentified item in `items` replaced by
 * the stand-in, where scrubsForm says the spelling means that item. `items` is
 * every item that could be named, identified ones included — they are what
 * make a shared name ambiguous. Pure, so the offline suite can drive it.
 */
export function scrubNames(text, items, ctx = {})
{
  if(!text) return text;
  const all = items ?? [];
  let out = text;
  for(const item of all)
  {
    if(!isUnidentified(item)) continue;
    for(const form of nameFormsOf(item))
      if(out.includes(form) && scrubsForm(form, all, ctx)) out = out.split(form).join(STAND_IN_NAME);
  }
  return out;
}

/**
 * The item whose control was clicked last, recorded by the sheets in the
 * capture phase — before the control's own handler posts anything. Read only
 * when two copies of a name disagree (scrubsForm, rule 1). Kept until the
 * next click, not timed out, because a card can land well after its click
 * (a roll dialog, an awaited usage die).
 */
let lastUsed = null;
export function noteItemUse(item) { if(item) lastUsed = item; }

/**
 * Wire noteItemUse onto a sheet: any click inside an item row records that
 * row's item. Capture phase, so it runs before the row's own handlers.
 */
export function trackItemUse(root, actor)
{
  root?.addEventListener("click", ev =>
  {
    const id = ev.target?.closest?.("li.item[data-item-id]")?.dataset.itemId;
    if(id) noteItemUse(actor.items.get(id));
  }, true);
}

/**
 * CARDS NAME NOTHING UNIDENTIFIED (Matt, 2026-09-19). The GM may use an
 * unidentified item to adjudicate it, and every card that use posts — an
 * attack, a usage die, a USE effect — goes through ChatMessage creation, so
 * this is the one place that sees them all rather than a change to each
 * handler. It scrubs unidentified items out of the content and flavor before
 * the message exists.
 *
 * EVERY ACTOR'S, NOT ONLY THE SPEAKER'S. A card about a hit can be spoken for
 * the target, naming the attacker's weapon, so the speaker's own items are not
 * enough. The speaker is added separately because an unlinked token's actor
 * is a copy that game.actors does not hold.
 *
 * The EFFECT TEXT IS KEPT: "creatures must DEX save vs instant death" is what
 * the table sees happen. Only what the thing IS stays hidden.
 */
export function onPreCreateChatMessage(message)
{
  const speaker = ChatMessage.getSpeakerActor?.(message.speaker);
  const items = [];
  for(const actor of [speaker, ...(game.actors ?? [])])
    for(const item of actor?.items ?? [])
      if(!items.includes(item)) items.push(item);
  if(!items.some(isUnidentified)) return;
  const ctx = { lastUsed, speakerItems: [...(speaker?.items ?? [])] };
  const update = {};
  for(const key of ["content", "flavor"])
  {
    const was = message[key];
    const now = scrubNames(was, items, ctx);
    if(now !== was) update[key] = now;
  }
  if(Object.keys(update).length) message.updateSource(update);
}

/**
 * Mark an item unidentified. An equipped one comes off, because an
 * unidentified item cannot be worn or wielded and leaving it on would keep
 * its AV and attacks live behind a control that is no longer shown.
 */
export async function markUnidentified(item)
{
  if(!isExotica(item)) return;
  const update = { [`flags.${FLAG_SCOPE}.${UNIDENTIFIED_FLAG}`]: true };
  if(item.system?.equipped) update["system.equipped"] = false;
  await item.update(update);
}

/**
 * Identify it. `how` is the card's reason line — the save that worked it out,
 * or the appraisal. The card is public and names the item, because at this
 * point the PCs know what it is.
 */
export async function identify(item, how, speakerActor = item?.parent)
{
  if(!isUnidentified(item)) return;
  await item.unsetFlag(FLAG_SCOPE, UNIDENTIFIED_FLAG);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: speakerActor }),
    content: `<b>${STAND_IN_NAME}</b> is identified: <b>${item.name}</b>. ${how}`
  });
}

/**
 * The INT save, with the GM choosing who attempts it. Every character is a
 * candidate, the carrier first when it is one, since the book says only "the
 * PCs". A failure leaves the item as it was, so the control stays and the GM
 * may ask again.
 */
export async function openIdentifySave(item)
{
  if(!isUnidentified(item)) return;
  const { rollCardSave } = await import("../combat/card-save.js");

  const carrier = item.parent?.type === "character" ? item.parent : null;
  const others = game.actors.filter(a => a.type === "character" && a.id !== carrier?.id);
  const candidates = carrier ? [carrier, ...others] : others;
  if(!candidates.length)
  {
    ui.notifications.warn("There is no character to attempt the save.");
    return;
  }

  const options = candidates.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
  new Dialog(
  {
    title: `Understand ${item.name}`,
    content: `<form><div class="form-group">
        <label>Who tries to work out what <b>${item.name}</b> does?</label>
        <select name="who">${options}</select>
      </div></form>`,
    buttons:
    {
      roll:
      {
        label: "Roll INT save",
        callback: async html =>
        {
          const who = game.actors.get(html.find('select[name="who"]').val());
          if(!who) return;
          const { verdict } = await rollCardSave(who, { ability: "int", label: `Understanding ${STAND_IN_NAME}` });
          if(verdict.passed)
            await identify(item, `${who.name} works out what it does.`, who);
          else
            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: who }),
              content: `${who.name} cannot work out what the <b>${STAND_IN_NAME}</b> does. It can be appraised at a settlement.`
            });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "roll"
  }).render(true);
}

/** Appraisal: the GM reveals it outright. */
export async function appraise(item)
{
  await identify(item, "It has been appraised.");
}
