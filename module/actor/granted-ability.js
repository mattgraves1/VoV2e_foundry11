/**
 * Elixir-Granted Ability Item — foundry-system-index.csv row of that name.
 *
 * Criterion 5 of Elixir Use Normalisation (Matt, 2026-09-23): an elixir that
 * grants the drinker an ability THEY USE creates, on the drink, an Item the
 * ability is used from, and that Item's presence is what the span times.
 * Before this, Glittercough Tonic and Puppeteer Potion posted their target
 * save cards at the moment of drinking, with nothing on the drinker to show
 * they could do it again, and Berserker Brew set a flag nothing on the sheet
 * could end.
 *
 * THE ROSTER ROW SAYS WHAT IS GRANTED. `grants` on an ELIXIRS entry:
 *   { name, use, singleUse?, span? }
 *   - `name`      the Item's name on the sheet ("Glitter Cloud")
 *   - `use`       one of "compel" (post the roster's target save, the way the
 *                 drink used to), "weather" (the Windsong card), "endFrenzy"
 *                 (the Brew's EGO save)
 *   - `singleUse` the Item goes after one use (Glittercough, RULED: the book's
 *                 4 rounds belong to the blindness, not the drinker)
 *   - `span`      the Item's own span when the elixir declares none for the
 *                 drinker (Puppeteer's 4 turns time the Item)
 * An elixir with a declaredSpan and `grants` is timed by that span: the board
 * row the drink creates carries `grantedItemId`, and the row's end - expiry,
 * a Referee deleting it, or combat's end - deletes the Item. That is the one
 * new field on a board entry, and effect-board.js's undo is the one place it
 * is read, so every path an entry ends by removes the Item.
 *
 * THE ITEM IS INTRINSIC AND WEIGHS NOTHING. It is an ability, not gear: it
 * cannot be given away (isTransferable refuses intrinsics) and takes no slot.
 * It is a plain `type: "item"` because elixirs are, and the use icon is gated
 * on the `grantedBy` flag rather than a name list - the name is content.
 *
 * WINDSONG DOES NOT SET THE WEATHER. RULED 2026-09-23 (Matt), reversing the
 * filing: the player does not control the weather. Using the Item posts a
 * card naming the weather the player chose, with a Referee-only button that
 * applies the existing Weather Override for the Day. The handler for that
 * button lives with the other chat-button hooks in knave.js.
 *
 * THE BREW'S ABILITY IS THE WAY OUT. RULED 2026-09-23 (Matt): "the usable
 * ability is how you END the brew's effect, the EGO save to end frenzy." A
 * success clears the flag and removes the Item; a failure leaves both, and
 * the Item is there to try again. Combat ending removes the Item with the
 * flag (knave.js's deleteCombat sweep), so nothing leaks past the fight.
 */
import { elixirGrantView } from "../item/consumable-effects.js";
import { WEATHER_TYPES } from "../time/weather-data.js";
import { postSaveCardsToTargets } from "../combat/compelled-save.js";
import { postMetalReachCard } from "../combat/metal-cards.js";
import { resolveSave, SAVE_TARGET } from "../combat/saves.js";
import { entriesOf, removeEntry } from "../time/effect-board.js";

const SCOPE = "vaarn";
export const GRANTED_FLAG = "grantedBy";
export const WINDSONG_BUTTON = "vaarn-windsong-set";

const USE_TEXT = {
  compel:    "Use it from the sheet to make your targets save.",
  weather:   "Use it from the sheet to sing for a change in the weather; the Referee decides whether the sky answers.",
  endFrenzy: "Use it from the sheet to roll the EGO Save that ends the frenzy.",
  metalPull: "Use it from the sheet to draw metal towards you; the card lists what is in reach and the Referee resolves it."
};

/**
 * What the elixir of this name grants, if anything - read from its sentences
 * since Effect Engine: Consumables chunk 3a (RULED 2026-10-06, Matt, ruling 3),
 * in the roster row's shape: { name, effect, grants, save, applies }.
 */
export function elixirGranting(name)
{
  return elixirGrantView(name);
}

/** The elixir that granted this Item, or null for an ordinary Item. */
export function grantedBy(item)
{
  return item?.flags?.[SCOPE]?.[GRANTED_FLAG] ?? null;
}

export function isGrantedAbility(item)
{
  return !!grantedBy(item);
}

/**
 * The specs an elixir grants, always as a list. One generic ability is the
 * common case; Biothermal Amplifier Tonic grants TWO real gifts for a day
 * (2026-09-24), so `grants` may be an array, and each spec may name a
 * `kind` - "gift" makes a real gift Item that the gift path uses, with the
 * elixir as its source; anything else is the generic ability above.
 */
export function grantSpecs(elixir)
{
  const g = elixir?.grants;
  return Array.isArray(g) ? g : g ? [g] : [];
}

export function grantedItemData(elixir, spec = grantSpecs(elixir)[0])
{
  const g = spec;
  if(g.kind === "gift")
    return {
      name: g.name,
      type: "gift",
      system: { slots: 1, source: elixir.name, description: `<p>Granted by <b>${elixir.name}</b> for its span.</p>` },
      flags: { [SCOPE]: { [GRANTED_FLAG]: elixir.name } }
    };
  return {
    name: g.name,
    type: "item",
    system: {
      slots: 0,
      intrinsic: true,
      description: `<p>Granted by <b>${elixir.name}</b>: ${elixir.effect}</p>`
                 + `<p><i>${USE_TEXT[g.use] ?? ""}</i></p>`
    },
    flags: { [SCOPE]: { [GRANTED_FLAG]: elixir.name } }
  };
}

/** Create every Item the elixir grants on the drinker. Returns the Items. */
export async function grantAbilities(actor, elixir)
{
  return actor.createEmbeddedDocuments("Item", grantSpecs(elixir).map(spec => grantedItemData(elixir, spec)));
}

/** Create the granted Item on the drinker. Returns the (first) Item. */
export async function grantAbility(actor, elixir)
{
  const [item] = await grantAbilities(actor, elixir);
  return item;
}

/** Remove every Item this elixir granted to this actor. Returns how many. */
export async function removeGrantedItems(actor, elixirName)
{
  const ids = actor.items.filter(i => grantedBy(i) === elixirName).map(i => i.id);
  if(ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
  return ids.length;
}

/**
 * Use a granted Item from the sheet. `sheet` is the actor sheet, because the
 * EGO save goes through its roll creator (the jinx and the crit banners live
 * there) and its condition cards through its own poster.
 */
export async function useGrantedAbility(sheet, item)
{
  const actor = sheet.actor;
  const elixir = elixirGranting(grantedBy(item));
  if(!elixir)
  {
    ui.notifications.warn(`"${item.name}" names an elixir this roster does not know; nothing to use.`);
    return;
  }
  const say = content => sheet._postWoundMsg(actor, content);
  // The generic ability's spec: a real gift never reaches here, since a gift
  // Item is used through the gift path, not the generic-item one.
  const spec = grantSpecs(elixir).find(g => g.kind !== "gift") ?? {};
  switch(spec.use)
  {
    case "compel":    return useCompel(sheet, actor, item, elixir, spec, say);
    case "weather":   return useWeather(actor, item, elixir, say);
    case "endFrenzy": return useEndFrenzy(sheet, actor, item, elixir, say);
    // Magnetic Stew (Metal Item Property Part B, RULED 2026-09-27): the card
    // lists the metal in reach; nothing is moved.
    case "metalPull":
      await say(`uses <b>${item.name}</b> — ${elixir.effect}`);
      // The drinker is a magnetic field (Synthetic Mind Magnetic Damage, 2026-09-28).
      return postMetalReachCard(actor, item.name, { synthMind: true });
    default:
      ui.notifications.warn(`"${item.name}" has a use this system does not know (${spec.use}).`);
  }
}

/** The target save cards the drink used to post, now posted on use. */
async function useCompel(sheet, actor, item, elixir, spec, say)
{
  await say(`uses <b>${item.name}</b> — ${elixir.effect}`);
  // A failed roll puts the effect on (2026-09-24), so no Apply card follows.
  await postSaveCardsToTargets(actor, item.name, [elixir.save], [], elixir.applies ? [elixir.applies] : []);
  if(spec.singleUse)
  {
    await item.delete();
    await say(`<b>${item.name}</b> is spent.`);
  }
}

/** The player's choice of weather, for the Referee to grant or refuse. */
async function useWeather(actor, item, elixir, say)
{
  const options = WEATHER_TYPES.map(t => `<option value="${t.key}">${t.name}</option>`).join("");
  const content = `<form><p>${actor.name} sings to the winds. Which weather do they call for?</p>
    <div class="form-group"><label>Weather</label><select name="weather">${options}</select></div></form>`;
  const key = await new Promise(resolve => new Dialog({
    title: `${item.name} — ${actor.name}`,
    content,
    buttons: {
      sing:   { label: "Sing", callback: html => resolve(html.find('[name="weather"]').val()) },
      cancel: { label: "Cancel", callback: () => resolve(null) }
    },
    default: "sing",
    close: () => resolve(null)
  }).render(true));
  if(!key) return;
  const type = WEATHER_TYPES.find(t => t.key === key);
  if(!type) return;
  await say(`sings with <b>${item.name}</b>, calling for the weather to turn <b>${type.name}</b>. `
          + `<i>The Referee decides whether the sky answers.</i> `
          + `<button type="button" class="${WINDSONG_BUTTON}" data-key="${type.key}">`
          + `Set today's weather to ${type.name} (Referee)</button>`);
}

/** The EGO save that ends a Berserker Brew frenzy. */
async function useEndFrenzy(sheet, actor, item, elixir, say)
{
  if(!actor.getFlag(SCOPE, "berserkerActive"))
  {
    await item.delete();
    await say(`is not in a frenzy; <b>${item.name}</b> is no longer needed.`);
    return;
  }
  // Extra Head's ADV on EGO saves applies here too (chunk 7).
  const roll = sheet._onAbility_Clicked("ego", null, ...sheet._ownSaveMods("ego"));
  const verdict = resolveSave(roll.total, roll.dice[0]?.total, SAVE_TARGET);
  if(verdict.passed)
  {
    // The frenzy's board entry (Shared Pipelines chunk 6): removing it clears
    // the flag and takes this Item. A frenzy from before chunk 6 has none.
    const entry = entriesOf(actor).find(e => e.clearFlag === "vaarn.berserkerActive");
    if(entry) await removeEntry(actor, entry.id);
    if(actor.getFlag(SCOPE, "berserkerActive")) await actor.unsetFlag(SCOPE, "berserkerActive");
    if(actor.items.get(item.id)) await item.delete();
    await say(`<b>EGO Save passed</b> — shakes off the <b>${elixir.name}</b> frenzy. Double damage dealt and received ends.`);
  }
  else
    await say(`<b>EGO Save failed</b> — the <b>${elixir.name}</b> frenzy holds. Still attacking the closest living being; <b>${item.name}</b> can be tried again.`);
}
