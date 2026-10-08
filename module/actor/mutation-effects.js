/**
 * The mutation and ancestry translators - Effect Engine: Mutations and
 * Ancestry Rules, chunk 1 (foundry-system-index.csv "Effect Engine: Mutations
 * and Ancestry Rules", BUILD PLAN RULED 2026-10-05 by Matt).
 *
 * A mutation's sentences come from its name (mutation-effects-data.js); an
 * ancestry rule Item's from its rule name (ancestry-effects-data.js). Each
 * translated sentence carries `tag`, the roster entry it came from, as a
 * weapon's tag sentences do: the builder shows such a row read-only, and the
 * readers that list a GM's own sentences leave it out.
 *
 * RULING B: a rule the character holds no Item for - every character made
 * before the step, and the rules that never had an Item (Pure of Blood,
 * Synthetic Flesh, Crystalline Flesh...) - is read from their ancestry text by
 * ancestryTextSentences(actor). Nothing is migrated.
 *
 * REGISTERED in chunk 2a (2026-10-05), in the same change that moved the
 * readers off the old tables - registering earlier would have counted a
 * mutation's AV twice beside them.
 *
 * Pure: no Foundry global.
 */

import { MUTATION_EFFECTS } from "./mutation-effects-data.js";
import { ANCESTRY_RULE_EFFECTS } from "./ancestry-effects-data.js";
import { SPARK_TABLES } from "./chargen-data.js";
import { registerTranslator } from "../effects/interpret.js";
import { bloomboonSentencesOf } from "../item/consumable-effects.js";

const tagged = (list, tag) => (list ?? []).map(s => ({ ...s, tag }));

/** A mutation Item's sentences, by its name. */
export function mutationSentencesOf(item)
{
  return tagged(MUTATION_EFFECTS[item?.name]?.effects, item?.name);
}

/**
 * An ancestry rule Item's sentences, by its rule name - and, for the Neobloom's
 * Bloomboons rule, its variant's (Effect Engine: Consumables chunk 2, ruling C).
 * The variant's come FIRST since chunk 3b (2026-10-06), so the rule Item's use
 * runs its variant's use; one with no use of its own (Grafting, Luftpods,
 * Vantablossom, Barbed Bark) falls through to the rule's own, resolved by hand.
 */
export function ancestryRuleSentencesOf(item)
{
  const rule = item?.system?.rule ?? item?.name;
  return [...bloomboonSentencesOf(item), ...tagged(ANCESTRY_RULE_EFFECTS[rule]?.effects, rule)];
}

registerTranslator("mutation", mutationSentencesOf);
registerTranslator("ancestry", ancestryRuleSentencesOf);

/** The special rule names an ancestry has (the book's, in SPARK_TABLES). */
export function ancestryRuleNames(ancestry)
{
  return (SPARK_TABLES[ancestry]?.special_rules ?? []).map(r => String(r).split(":")[0].trim());
}

/**
 * Ruling B: the sentences of the rules a character's ancestry has and holds no
 * Item for, read from the ancestry text. Each tagged with its rule's name.
 */
export function ancestryTextSentences(actor)
{
  const held = new Set((actor?.items ?? []).filter(i => i.type === "ancestry").map(i => i.system?.rule ?? i.name));
  return ancestryRuleNames(actor?.system?.ancestry).filter(r => !held.has(r))
    .flatMap(r => tagged(ANCESTRY_RULE_EFFECTS[r]?.effects, r));
}
