/**
 * FAITH-NAMED RELIGIOUS WEAPON TAGS - the pure half (foundry-system-index.csv
 * "Faith-Named Religious Weapon Tags"). weapon-faith.js reads the world; this
 * file has no Foundry global, so tools/test-weapon-faith.mjs reads it directly.
 *
 * RULED 2026-10-09 (Matt):
 *  - A Sacred or Blasphemous weapon names a faith already in the world; with
 *    none, the book's three faith tables, combined: Settlement Tables' Dominant
 *    Faith, Creating NPCs' Faith column, The Desert's Holy Place "Holy To".
 *  - A generic faith resolves to a specific one: Titan Cult to one of the seven
 *    Titans the Holy Place table names, a Petty God by the Petty Gods table, an
 *    Autarch Cult by the Autarchs table, a Quantum Daemon by its identity table,
 *    a local monster by the Bestiary.
 *  - "Militant Atheists" and "Worships Only Themselves" are never named.
 *
 * THE THREE TABLES SPELL THE SAME FAITH DIFFERENTLY ("Binary Devotion", "The
 * Binary Devotion", "Temple of the Binary Devotion"; "Vaa, Blue Goddess of
 * Empty Spaces" against the Holy Place's "Vaa, the Blue Goddess of Empty
 * Places"). ALIASES folds each to the Settlement table's wording, so a world
 * holding one faith under two spellings offers it once.
 */

import { SETTLEMENT_GROUPS } from "../actor/settlement-overview-data.js";
import { FURTHER_DETAILS } from "../actor/npc-generator-data.js";
import { ROLLTABLES } from "../actor/rolltable-data.js";
import { COMPOSITE_GENERATORS } from "../actor/composite-generator-data.js";
import { DAEMON_IDENTITY } from "../actor/quantum-daemon-data.js";
import { BESTIARY } from "../actor/bestiary-data.js";

/** "(p.xx)" and a book link's brackets off; whitespace tidied. */
export const cleanFaith = s => String(s ?? "").replace(/\s*\(p\.\s*xx\)\s*/gi, "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\s+/g, " ").trim();

const holyPlaceTable = ROLLTABLES.find(t => t.source.startsWith("The Desert/Holy Place.md"));

/** The book's three faith columns, as printed (cleaned), each its own d20. */
export const FAITH_TABLES = {
  settlement: SETTLEMENT_GROUPS.find(g => g.cols[0] === "Dominant Faith").data["Dominant Faith"].map(cleanFaith),
  npc: FURTHER_DETAILS.Faith.map(cleanFaith),
  holyPlace: (holyPlaceTable?.results ?? []).map(r => cleanFaith(/\*\*Holy To:\*\*\s*([^\n]*)/.exec(r.text)?.[1])),
};

/** The seven Titans, from the Holy Place table's "Cult of X" rows (the book's spellings). */
export const TITANS = FAITH_TABLES.holyPlace.map(f => /^Cult of ([A-Z]+)$/.exec(f)?.[1]).filter(Boolean);

/** Another table's spelling of a faith -> the Settlement table's. */
export const ALIASES = {
  "Binary Devotion": "The Binary Devotion",
  "Temple of the Binary Devotion": "The Binary Devotion",
  "Vaa, the Blue Goddess of Empty Places": "Vaa, Blue Goddess of Empty Spaces",
  "Ghoul Cult": "Hidden Ghoul Cult",
  "Void Saints": "Worship a Void Saint",
  "A Void Saint": "Worship a Void Saint",
  "A Fungal Saint": "Worship a Fungal Saint",
  "Quantum Daemon": "Worship a Quantum Daemon",
  "Worships Giant Immortal Animal": "Worship Giant Animal",
};

/** Never named on a weapon (RULED 2026-10-09, Matt: skip both always). */
export const NEVER_NAMED = new Set(["Militant Atheists", "Worships Only Themselves"]);

export const canonicalFaith = s => { const c = cleanFaith(s); return ALIASES[c] ?? c; };
export const nameable = s => !!cleanFaith(s) && !NEVER_NAMED.has(canonicalFaith(s));

/** The generic faiths, and what each resolves through. */
export const RESOLVES = {
  "Titan Cult": "titan",
  "Autarch Cult": "autarch",
  "Worship a local Petty God": "pettyGod",
  "Worship a Quantum Daemon": "daemon",
  "Worship Local Monster": "monster",
};
export const isGeneric = s => !!RESOLVES[canonicalFaith(s)];

const pick = (a, random) => a[Math.floor(random() * a.length)];
const lc = s => String(s ?? "").toLowerCase();
const composite = key => COMPOSITE_GENERATORS.find(g => g.key === key);
const rollComposite = (key, random) =>
  Object.fromEntries(composite(key).tables.flatMap(t => t.groups).map(gr => [gr.cols[0], pick(gr.data[gr.cols[0]], random)]));

/**
 * A faith as a weapon shows it: { name, detail, from } - `name` what the tag
 * label carries, `detail` a line about it (or ""), `from` the faith as the
 * world or the table held it. A generic faith is resolved by `random`; a
 * specific one is only tidied.
 */
export function resolveFaith(faith, random = Math.random)
{
  const from = canonicalFaith(faith);
  switch (RESOLVES[from])
  {
    case "titan":
      return { name: `the Cult of ${pick(TITANS, random)}`, detail: "a Titan Cult, devoted to restoring the machine gods.", from };
    case "pettyGod":
    {
      const g = rollComposite("petty_gods", random);
      return { name: `the ${g["Divine Aspect"]} of ${g["Domain"]}`,
               detail: `a Petty God: ${lc(g["Secondary Iconography"])} iconography, holy colour ${lc(g["Holy Colour"])}, honoured through ${lc(g["Honoured Through"])}.`, from };
    }
    case "autarch":
    {
      const a = rollComposite("autarchs", random);
      return { name: `the Cult of ${a["Forename"]} ${a["Dynastic Name"]} ${a["Ordinal"]}, ${a["Known As"]}`,
               detail: `an Autarch Cult: ${lc(a["Iconography"])} iconography; reputation: ${lc(a["Reputation"])}.`, from };
    }
    case "daemon":
    {
      const d = pick(DAEMON_IDENTITY, random);
      return { name: `the Quantum Daemon ${d.name}`, detail: `worshipped as ${lc(d.appearance)}, ${lc(d.hue)} in hue.`, from };
    }
    case "monster":
      return { name: `the local ${pick(BESTIARY, random).name}`, detail: "a monster worshipped by the locals.", from };
    default:
      return { name: from.replace(/^Worships? /, ""), detail: "", from };
  }
}

/**
 * A faith from the book when the world holds none (RULED: the three tables
 * combined): one of the three tables, then its d20 - each table's own weights -
 * rolled again on a faith never named.
 */
export function bookFaith(random = Math.random)
{
  const tables = Object.values(FAITH_TABLES).filter(t => t.length);
  for (let i = 0; i < 100; i++)
  {
    const f = pick(pick(tables, random), random);
    if (nameable(f)) return canonicalFaith(f);
  }
  return "Church of the Promised Sun";
}

/** The two tags that name a faith. */
export const FAITH_TAGS = ["Sacred", "Blasphemous"];

/**
 * A faith tag's description line: the tag labelled with its faith, the book's
 * words unchanged, and the faith's detail beneath when it has one -
 * "Sacred (the Spider of Mutants): Blessed by a religious leader. ..."
 */
export function faithTagHtml(tagName, effect, faith)
{
  const label = faith ? `${tagName} (${faith.name})` : tagName;
  return `<p><b>${label}:</b> ${effect}</p>` + (faith?.detail ? `<p><i>${faith.name}: ${faith.detail}</i></p>` : "");
}
