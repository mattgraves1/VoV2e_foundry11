/**
 * Book Page-Reference Stripping (foundry-system-index.csv "Book Page-Reference
 * Stripping", RULED 2026-09-30 by Matt).
 *
 * The 2e preview prints "p.xx" wherever a page number is still to come -
 * "(p.xx)", "(see p.xx)", "the table on p.xx" - and the data files transcribe
 * it faithfully, so they keep matching the book and the vault. It means
 * nothing at the table, so it is removed ON THE WAY OUT: when any document is
 * created, every string in it passes through stripPageRefs. The data files and
 * the vault are never edited, and nothing already in a world or an existing
 * compendium is swept (no migration).
 *
 * Rules run in order; the last removes any bracketed aside that still names
 * the page (Belligerent Paste's "(the Referee should use p.xx as a starting
 * point)" - Matt ruled the whole aside goes). tools/test-page-refs.mjs strips
 * every data file and fails if any "p.xx" survives.
 */

const RULES = [
  // "(p.xx).You" - the book's own missing space; keep the stop, restore it.
  [/\s*\((?:see |generate )?p\.xx\)\.(?=[A-Z])/g, ". "],
  // "(p.xx)", "(see p.xx)", "(generate p.xx)"
  [/\s*\((?:see |generate )?p\.xx\)/g, ""],
  // "(Treasure Cache, p.xx)", "(treat them as a Pet, see p.xx)"
  [/,\s*(?:see\s+)?p\.xx(?=\))/g, ""],
  // "the table on p.xx", "(select one from p.xx)"
  [/\s+(?:on|from) p\.xx/g, ""],
  // anything bracketed that still names it
  [/\s*\([^()]*p\.xx[^()]*\)/g, ""],
];

/** The text with the book's page placeholders removed. Non-strings pass through. */
export function stripPageRefs(text)
{
  if(typeof text !== "string" || !text.includes("p.xx")) return text;
  let out = text;
  for(const [rx, to] of RULES) out = out.replace(rx, to);
  return out;
}

/** A deep copy with every string stripped. */
function stripDeep(value)
{
  if(typeof value === "string") return stripPageRefs(value);
  if(Array.isArray(value)) return value.map(stripDeep);
  if(value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripDeep(v)]));
  return value;
}

/**
 * Clean one pending document, then each embedded one (a creature's Items, a
 * table's results, a journal's pages). Embedded documents created WITH their
 * parent fire no preCreate hook of their own, so the parent's hook walks them;
 * their _source is the parent's, so updateSource on the child lands in it.
 */
function cleanDocument(doc)
{
  const embedded = Object.keys(doc.constructor.metadata?.embedded ?? {})
    .map(name => doc.constructor.metadata.embedded[name]);
  const own = foundry.utils.deepClone(doc._source);
  for(const field of embedded) delete own[field];
  const diff = foundry.utils.diffObject(own, stripDeep(own));
  if(!foundry.utils.isEmpty(diff)) doc.updateSource(diff);

  for(const field of embedded)
    for(const child of doc[field] ?? []) cleanDocument(child);
}

const DOCUMENTS = ["Actor", "Item", "RollTable", "JournalEntry", "JournalEntryPage", "ChatMessage"];

export function registerPageRefStripping()
{
  for(const name of DOCUMENTS)
    Hooks.on(`preCreate${name}`, doc => { cleanDocument(doc); });
}
