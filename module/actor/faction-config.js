/**
 * Faction Registry (foundry-system-index.csv "Faction Registry").
 *
 * Which factions exist in this world at all: the book's eight from
 * faction-data.js, minus the ones the Referee has hidden, plus the ones
 * they have added.
 *
 * STORAGE FOLLOWS gambit-config.js, which Matt approved 2026-09-11 for
 * the same problem and whose header carries the full reasoning. A world
 * SETTING rather than a JournalEntry or a RollTable, because the book
 * entries live in code and the setting starts empty — so a fresh world
 * is correct with no setup step, and a renamed or deleted journal cannot
 * yield a silently empty list. World state NEVER writes to
 * faction-data.js, so the vault checkers keep their full meaning.
 *
 * HIDDEN MEANS HIDDEN FROM PICKERS, RULED 2026-09-14 (Matt), the same
 * semantics a hidden gambit has. The distinction is the whole reason
 * there are two lookups below and it is easy to collapse by accident:
 *
 *   effectiveFactions()  - what the world HAS. Hidden entries are gone.
 *                          This is what a picker offers.
 *   resolveFaction(name) - what a stored name MEANS. Finds hidden
 *                          entries too.
 *
 * So hiding Cacklemaw Clans stops it being offered when tagging an NPC
 * or setting REP, while a character who already has REP -6 with them
 * keeps it and still sees the name, and the NPC Further Details
 * RollTable - which hard-codes all eight in rolltable-data.js - still
 * renders a rolled "Cacklemaw Clans (Hated)" correctly. The rejected
 * alternative made the name stop resolving anywhere, which orphans
 * stored REP and breaks a rolled NPC silently rather than loudly.
 *
 * AN ADDED FACTION IS BOOK-SHAPED, RULED 2026-09-14 (Matt): it carries
 * the book's own sections rather than a name and a note. One deviation
 * from the gambit precedent is forced and is worth naming, because it
 * is not a matter of taste: gambit additions are pure free text since
 * NOTHING EVER REFERS BACK to a gambit. Three of the four sibling rows
 * refer back to a faction - Faction Reputation keys REP by it, Faction
 * Membership Tag tags NPCs with it, Faction Relationship Graph links
 * pairs of them - so a faction needs a stable key and cannot be free
 * text all the way down. `name` is therefore structured and required;
 * everything else is free. (Faction Membership Tag was DECLINED
 * 2026-09-17 by Matt before any code; the other two readers stand, so
 * the structured key still earns its place.)
 *
 * NO SYNTAX, ANYWHERE. Multi-entry sections are one entry per LINE,
 * which is splitting rather than parsing and cannot misread a line.
 * Where a book entry is "**Name.** text", an added one uses the em-dash
 * convention renderFreeLine already implements for gambits. A
 * mini-language for these would be a parser, and a parser that misreads
 * returns a clean, well-formed, plausible result - this project's most
 * expensive recurring failure.
 *
 * WHAT THIS ROW DOES NOT DO. It stores an added faction's allies and
 * enemies because a book-shaped entry has them, but it resolves nothing
 * and moves no REP. The graph itself is Faction Relationship Graph and
 * the REP is Faction Reputation, both NOT STARTED.
 */

import { FACTIONS } from "./faction-data.js";
// Imported rather than copied. It is the same convention, and a second
// copy is the hardcoded-text drift the backlog already has a row for.
import { renderFreeLine } from "./gambit-config.js";

export const SCOPE = "vaarn";
export const FACTION_SETTING = "factionRegistry";

export const EMPTY_REGISTRY = { hidden: [], added: [] };

/**
 * Vault prose carries raw Obsidian wikilinks. The DATA keeps them
 * verbatim so a drift check compares like with like; display strips
 * them. Same rule and same regex as macros/generate-flavor-item.js:
 * a piped link renders its alias, exactly as Obsidian does.
 */
export function stripWikilinks(text)
{
  return String(text ?? "").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, target, alias) => alias || target);
}

/** One free-text line into an array, dropping blanks. Splitting, not parsing. */
const lines = s => String(s ?? "").split("\n").map(l => l.trim()).filter(Boolean);

/** Blank-line-separated paragraphs. Also splitting. */
const paras = s => String(s ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

/**
 * Read the stored registry, tolerating anything. A malformed or
 * half-written value must degrade to "the book's eight, nothing hidden"
 * rather than throw — losing the house additions is a far better
 * failure than losing the faction list.
 */
export function storedRegistry()
{
  let raw;
  try { raw = game.settings.get(SCOPE, FACTION_SETTING); }
  catch { return { hidden: [], added: [] }; }
  if (!raw || typeof raw !== "object") return { hidden: [], added: [] };
  return {
    hidden: Array.isArray(raw.hidden) ? raw.hidden.filter(n => typeof n === "string") : [],
    added: Array.isArray(raw.added) ? raw.added.filter(a => a && typeof a === "object" && typeof a.name === "string" && a.name.trim()) : []
  };
}

/** A book faction rendered for display: wikilinks stripped, bullets built. */
function renderBookFaction(f)
{
  const S = stripWikilinks;
  return {
    kind: "book",
    name: f.name,
    vault: f.vault,
    intro: f.intro.map(S),
    summary: f.summary.map(S),
    aside: f.aside ? { heading: f.aside.heading, paragraphs: f.aside.paragraphs.map(S) } : null,
    goals: f.goals.map(g => `<b>${S(g.name)}.</b> ${S(g.text)}`),
    allies: f.allies.map(e => ({ faction: e.faction, html: renderRelation(e) })),
    enemies: f.enemies.map(e => ({ faction: e.faction, html: renderRelation(e) })),
    alliedMonsters: f.alliedMonsters
      ? { heading: f.alliedMonsters.heading, names: f.alliedMonsters.names.map(S) }
      : null,
    joining: f.joining ? f.joining.map(S) : null,
    triumphant: { verse: f.triumphant.verse, lines: f.triumphant.lines.map(S) },
    npcs: f.npcs.map(S),
    rollTable: f.rollTable ? { ...f.rollTable } : null,
    rep: f.rep ? f.rep.map(r => ({ ...r })) : null
  };
}

/**
 * "**Target:** text", or just the target where the book gives no comment
 * — Faa Nomads lists the Lithic Lyceum with nothing after it, and that
 * must not render as a stray colon.
 *
 * The colon is also dropped when the target already ends in its own
 * terminal punctuation, which only Cacklemaw Clans does: the book prints
 * its Allies as "**Nobody.**" and its Enemies as "**Everyone.**", full
 * stop inside the bold, no colon after. Appending one gave "Nobody.:".
 * Found by testing (161.6) against the real roster — the harness checked
 * that the entry carried no faction cross-reference and never looked at
 * how the two words punctuated.
 */
function renderRelation(e)
{
  const target = stripWikilinks(e.target);
  const text = stripWikilinks(e.text);
  if (!text) return `<b>${target}</b>`;
  const sep = /[.!?]$/.test(target) ? "" : ":";
  return `<b>${target}${sep}</b> ${text}`;
}

/**
 * An added faction in the same shape, so a caller cannot tell the two
 * apart by structure — only by `kind`. Every list tolerates being
 * absent, because these come from a form that may predate a field.
 */
function renderAddedFaction(a)
{
  const rep = Array.isArray(a.rep) ? a.rep.filter(r => r && String(r.actions ?? "").trim()) : [];
  return {
    kind: "added",
    name: a.name.trim(),
    vault: null,
    intro: paras(a.intro),
    summary: lines(a.summary),
    aside: null,
    goals: lines(a.goals).map(renderFreeLine),
    allies: relationsOf(a.allyFactions, a.allies),
    enemies: relationsOf(a.enemyFactions, a.enemies),
    alliedMonsters: null,
    joining: paras(a.joining).length ? paras(a.joining) : null,
    triumphant: { verse: false, lines: paras(a.triumphant) },
    npcs: lines(a.npcs),
    rollTable: null,
    rep: rep.length ? rep.map(r => ({ rep: String(r.rep), actions: String(r.actions).trim() })) : null
  };
}

/**
 * Two halves, deliberately. The named factions are structured, because
 * Faction Relationship Graph will need to resolve them; the free lines
 * are prose that resolves to nothing, which is how a Referee records an
 * ally that is not a faction at all — the shape the book itself uses for
 * "Powerful Synthetic Creatures".
 */
function relationsOf(names, free)
{
  const out = [];
  for (const n of (Array.isArray(names) ? names : []))
    if (typeof n === "string" && n.trim()) out.push({ faction: n, html: `<b>${n}</b>` });
  for (const l of lines(free))
    out.push({ faction: null, html: renderFreeLine(l) });
  return out;
}

/**
 * The factions this world HAS: the book's, minus hidden, plus added.
 *
 * An addition whose name collides with a book faction is dropped rather
 * than merged or renamed. Two entries under one name would make REP
 * stored against that name ambiguous, and the book entry is the one a
 * rolled NPC or an existing REP score is more likely to mean.
 */
export function effectiveFactions(registry = storedRegistry())
{
  const rows = [];
  const seen = new Set();
  for (const f of FACTIONS)
  {
    if (registry.hidden.includes(f.name)) continue;
    rows.push(renderBookFaction(f));
    seen.add(f.name);
  }
  // A hidden book faction still owns its name — an addition cannot take it.
  for (const f of FACTIONS) seen.add(f.name);
  for (const a of registry.added)
  {
    const name = a.name.trim();
    if (seen.has(name)) continue;
    seen.add(name);
    rows.push(renderAddedFaction(a));
  }
  return rows;
}

/** Just the names, for a picker. Hidden ones are absent by construction. */
export function factionNames(registry = storedRegistry())
{
  return effectiveFactions(registry).map(f => f.name);
}

/**
 * What a STORED name means, hidden or not. This is the lookup for
 * displaying data that already points at a faction — a character's REP,
 * a tagged NPC, a rolled Further Details result. Returns null only for a
 * name nothing in the world knows.
 */
export function resolveFaction(name, registry = storedRegistry())
{
  const wanted = String(name ?? "").trim();
  if (!wanted) return null;
  const book = FACTIONS.find(f => f.name === wanted);
  if (book) return { ...renderBookFaction(book), hidden: registry.hidden.includes(wanted) };
  const added = registry.added.find(a => a.name.trim() === wanted);
  return added ? { ...renderAddedFaction(added), hidden: false } : null;
}

/** The editor. A FormApplication because registerMenu requires one. */
export class VaarnFactionConfig extends FormApplication
{
  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      id: "vaarn-faction-config",
      classes: ["knave", "vaarn-faction-config"],
      template: "systems/vaarn/templates/apps/faction-config.html",
      title: "Factions",
      width: 640,
      height: "auto",
      resizable: true,
      closeOnSubmit: true
    });
  }

  /** @override */
  getData()
  {
    const r = storedRegistry();
    return {
      // Field names key on the INDEX, not the faction name: expandObject
      // splits on dots and every one of these names carries spaces.
      book: FACTIONS.map((f, i) => ({
        i,
        name: f.name,
        hidden: r.hidden.includes(f.name),
        // Enough to recognise the row without printing the whole entry.
        blurb: stripWikilinks(f.summary[0] ?? ""),
        rep: f.rep ? `${f.rep.length}-row REP table` : "no REP table in the book",
        npcs: f.npcs.map(stripWikilinks).join(", ")
      })),
      added: r.added.map((a, i) => ({ i, ...a, repRows: repRowsFor(a) })),
      // One blank row so there is always something to type into.
      blank: { i: r.added.length, repRows: repRowsFor(null) },
      allNames: FACTIONS.map(f => f.name)
    };
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);
    html.find("[data-action='remove-added']").on("click", ev =>
    {
      ev.preventDefault();
      $(ev.currentTarget).closest(".vaarn-faction-added").find("[data-role='name']").val("");
      this.submit();
    });
  }

  /**
   * Rebuilt from the form rather than merged, so clearing a field clears
   * it. FACTIONS is walked rather than the submitted keys, which means a
   * renamed book faction drops its stale hide instead of carrying it
   * under a name nothing matches. An added faction with a blank name is
   * dropped — that is also how the remove button works.
   */
  async _updateObject(event, formData)
  {
    const expanded = expandObject(formData);

    const hidden = [];
    FACTIONS.forEach((f, i) => { if (expanded.book?.[i]?.hidden) hidden.push(f.name); });

    const added = [];
    for (const row of Object.values(expanded.added ?? {}))
    {
      const name = String(row?.name ?? "").trim();
      if (!name) continue;
      added.push({
        name,
        intro: tidy(row.intro),
        summary: tidy(row.summary),
        goals: tidy(row.goals),
        allyFactions: asArray(row.allyFactions),
        allies: tidy(row.allies),
        enemyFactions: asArray(row.enemyFactions),
        enemies: tidy(row.enemies),
        joining: tidy(row.joining),
        triumphant: tidy(row.triumphant),
        npcs: tidy(row.npcs),
        rep: REP_KEYS.map(k => ({ rep: k, actions: String(row.rep?.[k] ?? "").trim() }))
      });
    }

    await game.settings.set(SCOPE, FACTION_SETTING, { hidden, added });
  }
}

/** The book prints +1 to +4 on every REP table it has; an addition gets the same. */
const REP_KEYS = ["+1", "+2", "+3", "+4"];

function repRowsFor(a)
{
  const have = Array.isArray(a?.rep) ? a.rep : [];
  return REP_KEYS.map(k => ({ key: k, actions: have.find(r => r?.rep === k)?.actions ?? "" }));
}

/**
 * Trim each line of a free-text field on the way IN to storage.
 *
 * Blank lines survive, because paras() splits on them. Leading whitespace
 * never means anything in these fields — every reader already trims — so
 * storing it trimmed simply makes storage agree with display.
 *
 * DEFENSIVE, not cosmetic. Found by testing (161.18): Handlebars re-indents
 * a partial's whole output to match the indentation of the {{>}} that
 * invoked it, and these fields live in <textarea>s where that indentation is
 * value rather than markup. Opening the editor and saving it unchanged grew
 * every multi-line field by two spaces a line, every time, without bound —
 * measured at 0 -> 4 -> 8. The template now invokes the partial at column 0,
 * which removes the cause; this removes the consequence, and repairs an
 * already-bloated value the next time it is saved.
 */
const tidy = s => String(s ?? "").split("\n").map(l => l.trim()).join("\n").trim();

/** A multi-select yields a string when one option is picked, an array when several. */
function asArray(v)
{
  if (Array.isArray(v)) return v.filter(x => typeof x === "string" && x.trim());
  return (typeof v === "string" && v.trim()) ? [v] : [];
}

export function registerFactionSettings()
{
  game.settings.register(SCOPE, FACTION_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: { hidden: [], added: [] }
  });

  game.settings.registerMenu(SCOPE, FACTION_SETTING + "Menu", {
    name: "Factions",
    label: "Edit Factions",
    hint: "Add your own factions, and hide the ones from the book you are not using. "
        + "The book's own entries are never altered — your changes are stored separately, "
        + "and hiding one only stops it being offered.",
    icon: "fas fa-flag",
    type: VaarnFactionConfig,
    restricted: true
  });
}
