/**
 * FAITH-NAMED RELIGIOUS WEAPON TAGS - the world half (foundry-system-index.csv
 * "Faith-Named Religious Weapon Tags"; the rules are faith-data.js's).
 *
 * THE WORLD'S FAITHS (RULED 2026-10-09, Matt: "it ensures that the tags are
 * relevant to the actual setting players are interacting with"):
 *  - every settlement journal: its Dominant Faith, and a Religious
 *    Reformation's upstart faith - regenerated from the seed the journal keeps
 *    (settlement-journal.js settlementFlag), not read off its pages;
 *  - every Region page Settlement not yet built - the same, from the page's
 *    regionSettlement seed;
 *  - every Region page Holy Place - its "Holy To", read from the page, since
 *    the Holy Place's roll is kept nowhere else.
 *
 * A SETTLEMENT KEEPS WHAT ITS FAITH RESOLVED TO. "Worship a local Petty God"
 * is resolved the first time a weapon draws it and saved on the settlement
 * (its journal flag, or the region page's regionSettlement flag, which Build
 * this settlement copies), so every later weapon names the same god. A user who
 * cannot write the journal (a player at character creation) resolves without
 * saving.
 */

import { canonicalFaith, nameable, isGeneric, resolveFaith, bookFaith, FAITH_TAGS, faithTagHtml } from "./faith-data.js";

/** The settlement's two faiths from its seed: [Dominant Faith, upstart or null]. */
async function settlementFaiths(settings)
{
  const { generateSettlement } = await import("../settlement/settlement-generator.js");
  const g = generateSettlement(settings ?? {});
  return [g.values?.["Dominant Faith"], g.reformation ?? null].filter(Boolean);
}

/**
 * Every faith in the world: [{ faith, label, doc, flagPath, saved }] - `doc`
 * and `flagPath` where a resolved generic faith is saved, `saved` what is
 * already there for this faith (or null).
 */
export async function worldFaiths()
{
  const out = [];
  for (const journal of game.journal ?? [])
  {
    const sf = journal.getFlag("vaarn", "settlement");
    if (sf)
      for (const f of await settlementFaiths(sf.settings ?? { seed: sf.seed }))
        out.push({ faith: canonicalFaith(f), label: journal.name, doc: journal, flagPath: "flags.vaarn.settlement.faiths", saved: sf.faiths?.[canonicalFaith(f)] ?? null });
    for (const page of journal.pages ?? [])
    {
      const type = page.getFlag("vaarn", "regionLocation")?.type;
      const rs = page.getFlag("vaarn", "regionSettlement");
      if (type === "Settlement" && rs && !rs.journal)
        for (const f of await settlementFaiths({ seed: rs.seed }))
          out.push({ faith: canonicalFaith(f), label: page.name, doc: page, flagPath: "flags.vaarn.regionSettlement.faiths", saved: rs.faiths?.[canonicalFaith(f)] ?? null });
      if (type === "Holy Place")
      {
        const holy = /<b>Holy To:<\/b>\s*([^<]*)/i.exec(page.text?.content ?? "")?.[1];
        if (holy) out.push({ faith: canonicalFaith(holy), label: page.name, doc: null, flagPath: null, saved: null });
      }
    }
  }
  return out.filter(w => nameable(w.faith));
}

/** Resolve one world entry, saving a generic faith's answer where the user may write. */
async function resolveWorldFaith(w)
{
  if (!isGeneric(w.faith)) return resolveFaith(w.faith);
  if (w.saved) return w.saved;
  const resolved = resolveFaith(w.faith);
  if (w.doc?.isOwner) await w.doc.update({ [`${w.flagPath}.${w.faith}`]: resolved });
  return resolved;
}

/**
 * The faith a Sacred or Blasphemous weapon names: `choice` (the Generate Weapon
 * dialog's pick: an index into worldFaiths(), or null for Random), else one of
 * the world's faiths at random, else the book's tables.
 */
export async function pickWeaponFaith({ choice = null } = {})
{
  const world = await worldFaiths();
  if (choice !== null && choice !== undefined && world[choice]) return resolveWorldFaith(world[choice]);
  if (world.length) return resolveWorldFaith(world[Math.floor(Math.random() * world.length)]);
  return resolveFaith(bookFaith());
}

/** Does this list of tag names carry a faith tag? */
export const hasFaithTag = tags => (tags ?? []).some(t => FAITH_TAGS.includes(t));

export { faithTagHtml };
