import { ANCESTRY_RULE_ITEMS } from "../actor/ancestry-rules-data.js";

/**
 * DISPLAY NAME — what a human reads, as distinct from the LOOKUP KEY.
 *
 * Seventeen mutations are named catalogue-inverted in the book: "Claws, Crab",
 * "Crest, Bone", "Tail, Scorpion". That is the author's convention, not a
 * transcription artefact — it keeps related mutations adjacent when sorted, in
 * the book and on a sheet alike. It reads badly on a character sheet, where a
 * player just wants "Crab Claws".
 *
 * RENAMING THEM WAS REJECTED (Matt, 2026-08-29): an atom's name is the join key
 * between the vault and the code, and book-tables.csv, atom-index.csv and the
 * work-queue ruling sweep all key on it. Severing that for readability is a bad
 * trade. So the name stays, and the presentation changes.
 *
 * ============================================================================
 * NEVER KEY ON THE DISPLAY NAME. IT IS FOR RENDERING ONLY.
 * ============================================================================
 * Ruled 2026-09-05 (Matt raised the opposite and it is worth writing down):
 * every lookup keeps matching `name`, with no fallback and no exceptions —
 * MUTATIONS_WITH_USE_ICON, FORGETTABLE_EFFECTS, _postUsageDieFlavorText,
 * CREATURE_DAMAGE_RULES, and every CSV join. A lookup that preferred the
 * display name would stop matching a list containing "Claws, Crab" the moment
 * the item rendered as "Crab Claws" — which is precisely the breakage that
 * renaming would have caused.
 *
 * There is deliberately no lookupKeyOf() helper. The lookup key is `.name`, and
 * a wrapper would only invite someone to make it clever.
 *
 * DERIVED, NOT STORED. All seventeen are the same shape, so the inversion is a
 * rule rather than seventeen hand-written values. Storing displayName on every
 * item — mostly equal to the name — would be baking, with the nastiest possible
 * staleness: rename an item and its stored display name is wrong, but a stale
 * one looks IDENTICAL to a legitimate one, so no check could ever catch it.
 * Absence means "use the name", and that cannot rot.
 *
 * `system.displayName` is still honoured as an explicit override, for anything
 * the comma rule does not cover.
 *
 * ============================================================================
 * THE CATEGORY PREFIX, 2026-09-20 — Inventory Label Category Prefix.
 * ============================================================================
 * Two creation shapes announce their own category in the stored name:
 * "Hypergeometric Codex (Vanish)" and "Bloomboons: Sunsight". Four other kinds
 * carrying a category - Mystic Gifts, Exotica, Mutations, Cybernetic Implants -
 * say nothing, so the list was inconsistent about it rather than committed to
 * it. RULED 2026-09-20 (Matt): the prefixes come off entirely. The inventory is
 * already colour-coded by type, and Item Type on Item Sheet now states the kind
 * in words on the sheet itself - which is the precondition that made stripping
 * safe rather than lossy, and the reason the two rows were queued together.
 *
 * THE STORED NAME DOES NOT MOVE. This is the same separation the comma rule
 * already is: a label change, not a rename. Group 89 established that an
 * ancestry rule dispatches on `system.rule`, not on the item name, which is
 * exactly what makes the label free and the key not - so a rename was the wrong
 * fix and was ruled out at filing, before this was ever built.
 *
 * IT ASKS THE DATA, not the string. The category is stripped by reading the
 * field that holds the real value - `system.equation`, `system.variant` - and
 * never by matching a prefix out of the name. A string rule would fire on a
 * weapon somebody happened to call "Gift: Something", and would go quietly
 * wrong the day a creation site changed its punctuation. An empty field means
 * the name is all there is, which is why an equation-less Codex still reads
 * "Hypergeometric Codex (unset)" rather than collapsing to nothing.
 */

/**
 * The distinguishing half of a name whose other half is its category, or null
 * for every item that has no such half.
 *
 * ANCESTRY RULES WITHOUT A VARIANT ARE NOT AFFECTED and must not be: "Spores"
 * with no variant is stored as bare "Spores", where the rule name IS the whole
 * label rather than a prefix on something. Only the three variant-bearing rules
 * - Twice Born, Spores, Bloomboons - ever had a prefix to lose.
 *
 * AND ONE OF THOSE THREE KEEPS IT. RULED 2026-09-20 (Matt), correcting the
 * first build the same day: a variant is sometimes a NAME and sometimes a
 * DESCRIPTOR, and only a name can stand on its own. Bloomboons and Spores read
 * a rolled table entry's name - "Barbed Bark", "Soporific Spores" - which says
 * what the thing is. Twice Born reads the "Corpse Born From" column of the
 * Mycomorph personality table, whose twenty values are Soldier, King, Thief,
 * Newborn and the like. Stripped, that row reads "King", and a player has no
 * way to know what it means. Matt weighed a longer self-describing label
 * against it and kept the prefix: "Twice Born: Soldier" is the only form short
 * enough to scan in a list and still carry its context.
 *
 * THE LINE IS IN THE DATA, not in a list kept here. The two branches of
 * chargen-app.js that fill a variant are already distinguishable by
 * `variantFrom`: "spore" and "bloomboon" name a ROLL TABLE, anything else names
 * a PERSONALITY COLUMN. So a rule added later lands on the correct side by
 * construction, and nothing in this file has to learn its name.
 *
 * IT FAILS TOWARD KEEPING THE PREFIX. An item whose ancestry or rule no longer
 * matches the defs keeps its stored name whole. A wrong prefix is untidy; a
 * wrongly stripped one is unreadable, and the first build shipped exactly that
 * for Twice Born because a test fixture used an invented variant string instead
 * of a real column value.
 */

/** True when this rule's variant is a rolled table entry's NAME, not a descriptor. */
function variantIsAName(doc)
{
  const defs = ANCESTRY_RULE_ITEMS[doc?.system?.ancestry];
  const def = defs?.find(r => r.rule === doc?.system?.rule);
  return def?.variantFrom === "spore" || def?.variantFrom === "bloomboon";
}
function categoryStrippedName(doc)
{
  if(doc?.type === "codex" && doc.system?.equation) return doc.system.equation;
  if(doc?.type === "ancestry" && doc.system?.variant && variantIsAName(doc)) return doc.system.variant;
  return null;
}

/**
 * What to show a human. Never what to match on.
 *
 *   "Claws, Crab"                   -> "Crab Claws"
 *   "Bone Crest"                    -> "Bone Crest"   (no comma, unchanged)
 *   "Hypergeometric Codex (Vanish)" -> "Vanish"
 *   "Bloomboons: Sunsight"          -> "Sunsight"
 *   "Twice Born: Soldier"           -> "Twice Born: Soldier"  (a descriptor)
 *   explicit                        -> system.displayName wins over all
 *
 * Only a SINGLE comma inverts. A name with two would be ambiguous to reorder,
 * and guessing at one is worse than leaving it alone.
 */
export function displayNameOf(doc) {
  const explicit = doc?.system?.displayName;
  if (explicit) return explicit;

  // BEFORE the comma rule, and it returns rather than falling through: a
  // variant or an equation is a value somebody rolled, not a catalogue-inverted
  // book name, so there is nothing for the comma rule to do to it.
  const stripped = categoryStrippedName(doc);
  if (stripped) return stripped;

  const name = doc?.name ?? "";
  const parts = name.split(",");
  if (parts.length !== 2) return name;

  const head = parts[0].trim();
  const tail = parts[1].trim();
  if (!head || !tail) return name;
  return `${tail} ${head}`;
}
