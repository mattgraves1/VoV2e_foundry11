/**
 * The consumable translators - Effect Engine: Consumables, chunk 1
 * (foundry-system-index.csv "Effect Engine: Consumables", BUILD PLAN RULED
 * 2026-10-06 by Matt).
 *
 * An Elixir's sentences come from its name (elixir-effects-data.js), a plant's
 * from its name (flora-effects-data.js, ruling B), a Bloomboon's from its rule
 * Item's variant (bloomboon-effects-data.js, ruling C), and a poison's from its
 * effect row's atom (poison-effects-data.js poisonSentencesOf, ruling A - no
 * Item carries it, so it is no translator and lives beside its data: importing
 * the poison roster here closed a cycle through the condition keys).
 * Each translated sentence carries `tag`, the entry it came from.
 *
 * REGISTERED in chunk 2 (2026-10-06), in the same change that moved the
 * readers off the old tables (an elixir's rations, encounter DIS and
 * retaliation; Barbed Bark; Mirrored Leaves' save) - registering earlier would
 * have read them twice. A generic Item is an Elixir or a plant by name; a
 * Bloomboon joins its rule Item through the ancestry translator
 * (mutation-effects.js). A weapon plant (Avern Bloom, Dried Swordgrass Leaf)
 * joins the weapon translator in chunk 3c, as the Exotica weapons did.
 *
 * Pure: no Foundry global.
 */

import { ELIXIR_EFFECTS } from "../actor/elixir-effects-data.js";
import { floraEffects } from "../actor/flora-effects-data.js";
import { WEAPON_TAG_EFFECTS } from "./weapon-tag-effects-data.js";
import { BLOOMBOON_EFFECTS } from "../actor/bloomboon-effects-data.js";
import { registerTranslator } from "../effects/interpret.js";
import { normalise } from "../effects/sentence.js";
import { creatureMovedSentencesOf } from "./creature-effects.js";

const tagged = (list, tag) => (list ?? []).map(s => ({ ...s, tag }));

/** An Elixir Item's sentences, by its name. */
export function elixirSentencesOf(item)
{
  return tagged(ELIXIR_EFFECTS[item?.name]?.effects, item?.name);
}

/** A plant Item's sentences, by its name. */
export function floraSentencesOf(item)
{
  return tagged(floraEffects()[item?.name]?.effects, item?.name);
}

/**
 * A generic Item's sentences - an Elixir's, or a plant's - and, as before the
 * kind had a translator, the sentences of any weapon tags it carries (the tag
 * readers read tags from ANY Item: weapon-tags.js sentencesFor).
 */
export function consumableSentencesOf(item)
{
  const own = ELIXIR_EFFECTS[item?.name] ? elixirSentencesOf(item) : floraSentencesOf(item);
  const tags = (item?.system?.tags ?? []).flatMap(tag => tagged(WEAPON_TAG_EFFECTS[tag]?.effects, tag));
  return [...own, ...tags];
}

/** A Neobloom's Bloomboons rule Item's sentences, by its variant; none for any other Item. */
export function bloomboonSentencesOf(item)
{
  if (item?.type !== "ancestry" || item?.system?.rule !== "Bloomboons") return [];
  const variant = item.system?.variant;
  return tagged(BLOOMBOON_EFFECTS[variant]?.effects, variant);
}

// A creature rule Item's moved flags in front of its consumable sentences
// (Effect Engine: Creatures chunk 2b, RULED 2026-10-06, Matt).
registerTranslator("item", item => [...creatureMovedSentencesOf(item), ...consumableSentencesOf(item)]);

/**
 * An Elixir's sentences by its name alone - for a board entry, which is not an
 * Item - NORMALISED, as sentencesOf's are (`when.trigger`, `target.who`):
 * its readers test the trigger, and a raw sentence's `when` is a bare string
 * (found in Group 554: Spineskin's retaliation never matched).
 */
export function elixirSentencesByName(name)
{
  return elixirSentencesOf({ type: "item", name }).map(normalise);
}

/** Is this Item an Elixir - a generic Item of a sample-table name? */
export function isElixirItem(item)
{
  return item?.type === "item" && !!ELIXIR_EFFECTS[item?.name];
}

/**
 * The drink: an Elixir Item's first use sentence, normalised, or null - what
 * its use control runs through the interpreter (Consumables chunk 3a,
 * 2026-10-06). The drink control is shown exactly when there is one.
 */
export function elixirDrinkOf(item)
{
  if (!isElixirItem(item)) return null;
  return elixirSentencesOf(item).map(normalise).find(s => s.when?.trigger === "use" && !s.baked) ?? null;
}

/**
 * What an Elixir grants, read from its sentences (chunk 3a, ruling 3), in the
 * shape granted-ability.js takes: { name, effect, grants, save, applies } - its
 * grant-ability sentence (Windsong, the Glitter Cloud, Neural Puppetry,
 * Magnetic Draw, Exit the Frenzy), or the Gifts it adds for its span
 * (Biothermal Amplifier Tonic's two, as gift grants). Null when it grants
 * nothing.
 */
export function elixirGrantView(name)
{
  const list = elixirSentencesByName(name);
  const effect = list[0]?.text ?? "";
  const g = list.find(s => s.do?.verb === "special" && s.do.handler === "grant-ability");
  if (g)
  {
    const { verb, handler, save, applies, ...grants } = g.do;
    return { name, effect, grants, ...(save ? { save } : {}), ...(applies ? { applies } : {}) };
  }
  const gifts = list.filter(s => s.when?.trigger === "use" && s.do?.verb === "add-gift" && s.for);
  return gifts.length ? { name, effect, grants: gifts.map(s => ({ kind: "gift", name: s.do.name })) } : null;
}

/** An Elixir's heal each round while drunk (Regeneration Serum), in the board's hpTick shape, or null. */
export function elixirHpTick(name)
{
  const s = elixirSentencesByName(name).find(x => x.when?.trigger === "each-round" && x.do?.verb === "heal");
  return s ? { to: "self", heal: true, dice: s.do.amount } : null;
}

/**
 * What a plant's span carries, from its sentences (Consumables chunk 3c, ruling
 * B), in the shape the board entry takes: { applied, endGrant, toxLapses } -
 * the Ickbulb's scent, the Godsbreath Star's end-of-span Gift save, the Avern
 * Bloom's poison that lapses with its day. Null for an Item that is no plant.
 */
export function floraSpanOf(item)
{
  const list = floraSentencesOf(item).map(normalise);
  if (!list.length) return null;
  const special = h => list.find(s => s.do?.verb === "special" && s.do.handler === h)?.do;
  const strip = d => { if (!d) return null; const { verb, handler, ...rest } = d; return rest; };
  return {
    applied: strip(special("stateful")),
    endGrant: strip(special("end-grant")),
    toxLapses: list.some(s => s.when?.trigger === "attack-hit" && s.do?.verb === "toxin" && s.for)
  };
}

/** The toxin die a plant weapon's hit carries (the Avern Bloom's d12), or null. */
export function floraToxDieOf(item)
{
  return floraSentencesOf(item).map(normalise).find(s => s.when?.trigger === "attack-hit" && s.do?.verb === "toxin")?.do.die ?? null;
}
