/**
 * Bestiary token-art mapping.
 *
 * Extracted verbatim from macros/dev/import-bestiary.js on 2026-09-02 so that
 * pack-build.js can create creatures with the same art the macro does.
 * Verified faithful, not assumed: all 157 names were resolved through both
 * copies and compared, with zero differences.
 *
 * THE MACRO STILL HOLDS ITS OWN COPY. It is a pasted-in World Macro and it
 * is tested, so it was not rewritten as part of a change whose job was
 * making a fresh install work. That means this mapping now exists TWICE and
 * can drift. Filed as "RollTable Build Helper Duplication" in
 * foundry-system-index.csv, which covers this file too. If they ever
 * disagree, check which one a token regression follows before assuming
 * either is right.
 *
 * NOTE ON A RATIONALE THIS CHANGES. macros/dev/sync-bestiary.js says it reports
 * missing creatures rather than creating them BECAUSE the art mapping "lives
 * in import-bestiary.js and is deliberately not shared". That constraint is
 * now gone — the mapping is right here. The BEHAVIOUR has deliberately not
 * been changed to match: sync still refuses to create, which is still a
 * reasonable division of labour, but it is now a choice rather than a
 * limitation. Left for Matt to rule on rather than quietly widened.
 *
 * THE ART IS NOT REDISTRIBUTABLE. tokens/ is largely Caves of Qud art (see
 * CLAUDE.md). Everything here degrades to no art rather than erroring, and
 * artAvailable() below is how a caller checks before building, so a release
 * that ships without tokens/ still produces a complete, working compendium
 * with Foundry's default icons.
 *
 * THAT DEGRADATION WAS ALL-OR-NOTHING UNTIL 2026-09-14, and the gap between
 * the two cases is what Group 159 found. A release with NO tokens/ was
 * always fine — artAvailable() returns false and callers pass no art. A
 * release WITH tokens/ but missing one creature's file was not: NO_ART was
 * the only thing that could say so, it is hand-written, and it is exactly
 * what nobody updates when a creature is added. tokenPath() now checks the
 * directory listing artAvailable() already fetched, so the per-creature case
 * degrades the same way the whole-directory case always did.
 *
 * tools/art-coverage.mjs is the other half and the reason this is not just
 * a silent fix: deriving the fallback stops a broken path reaching the game,
 * but it would also hide the fact that a creature is waiting to be drawn,
 * which is how Usurper Arm went unnoticed in the first place. The checker
 * names such creatures and fails until each is acknowledged in NO_ART.
 */

// The creatures whose token art only exists as numbered variants
// (Bandit_1..7, Cacklemaw_1.., Cacklemaw_Virago_1.., Exemplar_1..) with no
// bare filename — default to "_1" for these; Matt can browse the other
// options in tokens/Bestiary/ and swap by hand later. Cacogen is NOT here
// despite also being multi-variant — its files keep the "_bestiary"
// disambiguator too (Cacogen_bestiary_1.png), so it needs a full
// FILENAME_OVERRIDES entry below instead of the generic "_1" suffix.
const MULTI_VARIANT = new Set(["Bandit", "Cacklemaw", "Cacklemaw Virago", "Exemplar"]);

// Names whose actual art filename doesn't match the generic normalization
// below — found by a full audit against every file in tokens/Bestiary/
// after Matt spotted several by eye (2026-08-18). Two root causes:
// (a) Cacogen/Faa Nomad/Mycomorph/Neobloom's filenames kept the
//     "_bestiary" disambiguator (from the source vault filename's
//     "(bestiary)" suffix) even though bestiary-data.js's actor name has
//     it stripped for display — the original normalize-from-actor-name
//     logic lost that suffix.
// (b) Doppelgeller/Jollyhoss/Kronophage have multi-part art (a main image
//     plus a second image for something the creature spawns/splits into)
//     with no bare-name file — need the specific "main" part explicitly.
const FILENAME_OVERRIDES = {
  "Cacogen": "Cacogen_bestiary_1.png",
  "Faa Nomad": "Faa_Nomad_bestiary.png",
  "Mycomorph": "Mycomorph_bestiary.png",
  "Neobloom": "Neobloom_bestiary.png",
  "Doppelgeller": "Doppelgeller_1_main.png",
  "Jollyhoss": "Jollyhoss_1_head.png",
  "Kronophage": "Kronophage_1_main.png",
  // JADE IBIS names the creature "Infant Ramworm" (2026-09-21); the art file keeps its name.
  "Infant Ramworm": "Ramworm.png",
};

// No usable token art exists for these at all (known gaps): Planeyfolk has
// no art whatsoever (same root cause as the PC-token gap); Walking Womb
// only has art for what it SPAWNS (Walking_Womb_2_foetal_predator.png),
// nothing for the creature itself.
//
// WHAT THIS LIST IS FOR CHANGED ON 2026-09-14, and the distinction matters.
// It used to be the ONLY thing standing between a creature and a broken
// image path, which made it load-bearing for correctness and stale the
// moment anyone added a creature — see the header. tokenPath() now checks
// the real directory, so a name missing from here can no longer produce a
// broken path. The list is now the ACKNOWLEDGEMENT that a creature has no
// art, and tools/art-coverage.mjs fails until every artless creature is
// named here. Being in this list is a record, not a mechanism.
const NO_ART = new Set(["Planeyfolk", "Walking Womb",
  // Spirit Form, 2026-09-27: the Unquiet Spirit is a stat block for a book
  // rule, not a bestiary creature, and has no art yet.
  "Unquiet Spirit",
  // Added by CRIMSON HOUND 07-05-26. tokens/Bestiary/ has no art for
  // either, and that art is not redistributable anyway — see CLAUDE.md.
  "Kalopede", "Lithling Warrior",
  // Added 2026-09-14, both found by the derive check that replaced this
  // list's old job. Usurper Arm had been shipping a path to a file that is
  // not there since it was added, and nothing noticed; Jigsaw Courtier was
  // transcribed the same day and is simply not drawn yet.
  "Jigsaw Courtier", "Usurper Arm",
  // Added 2026-09-24 for the Broodling Broth and the Brood Mother's Brood:
  // a stat line inside the Mother's rule, given its own entry so both can
  // spawn it. Nothing is drawn for it.
  "Broodling",
  // Added 2026-09-25 for the Sapling Retainers bloomboon, the same way.
  "Sapling Retainer",
  // Added 2026-09-26 for the Fleshwarp's Graft, the same way.
  "Grafted Arm",
  // Added 2026-09-26: the 23 generic stat blocks transcribed from JADE IBIS's
  // Adventure Atlas, Gnomon chapter and Bestiary (Zenithlight Negatick).
  // Nothing is drawn for any of them.
  "Zenithlight Negatick", "Dogsbody", "Janitor Synth", "Weekling", "Porta-Warden",
  "Lithophage Worm", "Lost Caeba Worker", "Buzzblade Drone", "Oviraptor Beetle",
  "Spawn of An-Rah's Brain", "Spawn of An-Rah's Guts", "Exalted Ghoul Cultist",
  "Aspirant Ghoul Cultist", "Militia Captain", "Baron's Militiaman", "Temple Guard",
  "Priest of the Promised Sun", "Household Guard", "Consul's Lictor", "Smuggler",
  "Hired Killer", "Bailiff of the Crimson Court", "Advocate"]);

// The filenames actually present in ART_DIR, as filled in by artAvailable().
// null means "nobody has looked yet", which is NOT the same as the empty set
// — see tokenPath() for why the difference is load-bearing.
let artFiles = null;

export const ART_DIR = "systems/vaarn/tokens/Bestiary";

/**
 * Path to a creature's token art, or null if there is none.
 *
 * THE FILE IS CHECKED, not merely computed — added 2026-09-14 after Group
 * 159. Before that this returned a path for any creature not named in
 * NO_ART, whether or not the file existed, so a creature nobody had drawn
 * got a 404 instead of Foundry's default icon. Two were live when it was
 * found: Jigsaw Courtier, transcribed that day, and Usurper Arm, which had
 * been wrong since it was added without anyone noticing. The old guard could
 * not have caught either — artAvailable() asks whether the DIRECTORY is
 * installed, which is a different question from whether one creature has a
 * file in it.
 *
 * ORDER MATTERS, and it is the one cost of doing it this way. The check is
 * live only once artAvailable() has populated `artFiles`; all three callers
 * (pack-build.js, sync-bestiary.js, import-bestiary.js) already await it
 * before building, which is why this needed no change on their side and no
 * World Macro re-paste. A caller that skips it is not silently broken — it
 * simply gets the old compute-only behaviour, which is why `artFiles` starts
 * at null rather than empty. An empty set means "looked, found nothing",
 * i.e. a release shipped without tokens/, and there the callers pass no art
 * at all.
 */
export function tokenPath(name)
{
  if(NO_ART.has(name)) return null;

  const path = computePath(name);
  if(path === null) return null;

  // Nobody has listed the directory: keep the pre-2026-09-14 behaviour
  // rather than guessing. An empty set is a real answer and means no art is
  // installed, so it correctly rejects everything.
  if(artFiles === null) return path;
  return artFiles.has(path.split("/").pop()) ? path : null;
}

/** The filename tokenPath WOULD use, before asking whether it is there. */
function computePath(name)
{
  if(FILENAME_OVERRIDES[name]) return `${ART_DIR}/${FILENAME_OVERRIDES[name]}`;

  // Generic case: spaces/apostrophes -> underscores, disambiguator parens
  // stripped to their bare word. Keep "(Adult)"/"(Juvenile)"/"(Imago)"/
  // "(Nymph)" content since those are real distinct filenames
  // (Sandworm_Adult.png, Moonbeast_Imago.png), not overrides.
  let base = name
    .replace(/[()]/g, "")
    .replace(/'/g, "_")
    .replace(/\s+/g, "_");

  if(MULTI_VARIANT.has(name)) base += "_1";

  return `${ART_DIR}/${base}.png`;
}

/**
 * Is the token art actually present in this install?
 *
 * ONE directory listing, not 157 existence checks — a per-file probe would
 * make a first-load build noticeably slower for a question that has the same
 * answer every time. A release built without tokens/ answers false here and
 * the caller simply omits art.
 *
 * IT NOW KEEPS THE LISTING IT WAS ALREADY FETCHING. That is the whole fix
 * for the broken-path bug above, and it costs nothing: the browse call was
 * always made, and its result was thrown away to return a boolean. Holding
 * the filenames lets tokenPath() answer the per-creature question with no
 * further I/O, so the one-listing-not-157 reasoning above still holds
 * exactly as written.
 */
export async function artAvailable()
{
  try
  {
    const listing = await FilePicker.browse("data", ART_DIR);
    const files = listing?.files ?? [];
    artFiles = new Set(files.map(f => decodeURIComponent(String(f)).split("/").pop()));
    return artFiles.size > 0;
  }
  catch(err)
  {
    // browse() throws when the directory does not exist, which is exactly
    // the ships-without-art case and is not an error worth surfacing. The
    // empty set is the right answer for tokenPath() too — nothing is there.
    artFiles = new Set();
    return false;
  }
}

/**
 * Hand tokenPath() a filename list directly, for a caller that has one
 * without going through FilePicker — tools/art-coverage.mjs reads the
 * directory from Node, where FilePicker does not exist.
 *
 * EXPORTED FOR THAT CHECKER, and deliberately not used by the game. Passing
 * null restores the "nobody has looked" state, which is what lets the
 * checker ask for the would-be path and then judge it itself.
 */
export function setArtFiles(files)
{
  artFiles = files === null ? null : new Set(files);
}
