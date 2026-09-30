/**
 * RollTable build helpers — the RollTable counterpart to bestiary-build.js.
 *
 * Extracted 2026-09-02 so module/pack-build.js does not become a THIRD copy
 * of logic that macros/dev/import-rolltables.js and macros/dev/sync-rolltables.js
 * already hold one each of. Both of those still carry their own copies: they
 * are pasted-in World Macros, both are fully tested (groups 18, 27 and 67),
 * and rewriting tested macros was not worth folding into a change whose job
 * is making a fresh install work. That duplication is now a filed row, not
 * an accident — see "RollTable Build Helper Duplication".
 *
 * Everything here is copied verbatim from sync-rolltables.js, which holds
 * the most-corrected version of each: it carries both the nested-folder
 * parent-comparison fix (found live-testing 18.8) and the trailing-space
 * trim (found by test 67.3). If these ever diverge, that file is the one to
 * copy FROM.
 */

/**
 * Resolve a slash-separated folder path to a Folder document, creating any
 * missing level. Pass a pack collection id to build inside a compendium, or
 * null for the world.
 *
 * Returns a resolver with its OWN cache rather than exporting a bare
 * function over a module-level Map: a cache that outlives one build would
 * hand back Folder documents from a pack that has since been rebuilt.
 *
 * `type` DEFAULTS TO "RollTable" so every caller that predates the Item
 * compendium is byte-for-byte unchanged — it was hardcoded in the two places
 * below until Item Compendium Packs needed Item folders in a pack, and a
 * Folder's type must match the documents it holds. Nothing else about the
 * resolver differs between the two, including the nested-parent comparison
 * that 18.8 found, so a second copy would have been a second place for that
 * bug to come back.
 */
export function makeFolderResolver(pack = null, type = "RollTable")
{
  const cache = new Map();

  return async function getOrCreateFolderPath(pathStr)
  {
    if(cache.has(pathStr)) return cache.get(pathStr);

    const parts = pathStr.split("/");
    let parentId = null;
    let builtPath = "";

    for(const part of parts)
    {
      builtPath = builtPath ? `${builtPath}/${part}` : part;
      if(cache.has(builtPath))
      {
        parentId = cache.get(builtPath).id;
        continue;
      }

      // f.folder is a Folder document, not an id. Comparing it directly
      // against a string parentId is always false except when both are
      // null, so root folders were reused and every NESTED folder was
      // recreated as a duplicate on each run. Found live-testing 18.8.
      const pool = pack ? game.packs.get(pack).folders : game.folders;
      let folder = pool.find(f => f.type === type && f.name === part && (f.folder?.id ?? null) === parentId);
      if(!folder)
      {
        const folderCls = getDocumentClass("Folder");
        folder = await folderCls.create({ name: part, type, folder: parentId },
          pack ? { pack } : {});
      }

      cache.set(builtPath, folder);
      parentId = folder.id;
    }

    return cache.get(pathStr);
  };
}

/**
 * The book's die label, preserved where it differs from the roll formula.
 * Foundry cannot roll a variable player/context stat, so "d20 + EGO" is
 * stored as 1d20 and the modifier is recorded here for the GM to apply by
 * hand rather than being silently lost.
 */
export function buildDescription(entry)
{
  // Emit the note only when the book die actually CARRIES a modifier - that
  // is, when something is left over after stripping the die notation.
  //
  // The old test was dieLabel === formula, which suppressed the note only for
  // the two tables whose label is literally "2d6". A book label ("d20") never
  // equals a Foundry formula ("1d20"), so 72 of 79 tables carried a note
  // telling the GM to "apply the modifier by hand" when there was no modifier
  // to apply. Ruled 2026-09-02 (Matt): those do not need a note. The harm was
  // never a wrong roll - it was that a note on 72 of 79 tables is wallpaper,
  // so the five that carry a real instruction stopped standing out.
  //
  // The five with a real modifier are Reactions, Merchant Reactions,
  // Carousing, Gleam Test Table and Vault Hazards. Their text is unchanged.
  if(!entry.dieLabel.replace(/^\s*\d*\s*d\s*\d+\s*/i, "").trim()) return "";
  return `<p>Book die: <b>${entry.dieLabel}</b> (rolled here as ${entry.formula} — apply the modifier by hand before drawing).</p>`;
}

// FOUNDRY TRIMS TableResult text on save. A table whose last column is empty
// ends "**Route Hazard:** " with a trailing space in rolltable-data.js, and
// Foundry stores it without — so comparing untrimmed text never converges and
// a sync reports the same work on every run, forever. Found by running the
// sync three times against a live world (test 67.3); the offline test could
// not catch it, because its fake world mirrors the data byte for byte and
// real Foundry does not. Trim on the way out AND on both sides of a compare.
// Exported 2026-09-20 with the fold of the two macros onto this module:
// sync-rolltables.js's diffTable normalises BOTH sides with it, so it has to
// be this function and not a copy that could trim differently.
export const normText = (s) => String(s).trim();

/** TableResult data for one entry, trimmed the way Foundry will store it. */
export function desiredResults(entry)
{
  return entry.results.map(r => ({
    type: CONST.TABLE_RESULT_TYPES.TEXT,
    text: normText(r.text),
    range: r.range,
    weight: 1
  }));
}
