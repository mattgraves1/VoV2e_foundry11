/**
 * Gambit List Override (foundry-system-index.csv "Gambit List Override").
 *
 * Lets the table change what the gambit card OFFERS without touching the
 * transcription. Matt, 2026-09-11: "the book's stunts are a good starting
 * list of examples, but it would be nice to be able to edit and add to
 * this list as things come up."
 *
 * THE CONSTRAINT THAT SHAPES ALL OF THIS, and the reason this is its own
 * file rather than an edit to gambit-data.js: that file is compared to the
 * vault by tools/test-gambits.mjs, and that comparison is the only thing
 * that catches a Save quietly going wrong. A wrong Save is invisible in
 * play — the card renders perfectly and the table rolls whatever it was
 * told. So world state NEVER writes to the transcription. A suppression is
 * recorded as a suppression and a replacement as a replacement, the book
 * list stays exactly as shipped underneath, and the check keeps its full
 * meaning.
 *
 * Storage is a world SETTING rather than a JournalEntry or a RollTable,
 * decided on seeding: the book seven live in code and this setting starts
 * empty, so a fresh world is correct with no setup step at all. A journal
 * or a table has to be created in every world, and a renamed or deleted
 * one yields a silently empty list rather than an error.
 *
 * Shape of the stored value:
 *   { hidden: [bookName, ...], replaced: { bookName: text }, added: "line\nline" }
 *
 * The book entries get structured controls — a checkbox and a field each —
 * rather than a syntax inside the textarea. A mini-language for hiding and
 * replacing is a parser, and a parser that misreads a line returns a clean,
 * well-formed, plausible list, which is this project's most expensive
 * recurring failure. Additions are free text and render verbatim, so no
 * added line can fail to parse either.
 */

import { GAMBITS, GAMBIT_THRESHOLD, GAMBIT_OPEN_CLAUSE, GAMBIT_SAVE_CLAUSE } from "./gambit-data.js";

export const SCOPE = "vaarn";
export const GAMBIT_SETTING = "gambitOverrides";

export const EMPTY_OVERRIDES = { hidden: [], replaced: {}, added: "" };

/**
 * Read the stored overrides, tolerating anything. A malformed or
 * half-written value must degrade to "no overrides" rather than throw
 * inside an attack roll — the card is a reminder, and losing the house
 * additions is a far better failure than losing the attack.
 */
export function storedOverrides()
{
  let raw;
  try { raw = game.settings.get(SCOPE, GAMBIT_SETTING); }
  catch { return { ...EMPTY_OVERRIDES }; }
  if (!raw || typeof raw !== "object") return { ...EMPTY_OVERRIDES };
  return {
    hidden: Array.isArray(raw.hidden) ? raw.hidden.filter(n => typeof n === "string") : [],
    replaced: (raw.replaced && typeof raw.replaced === "object") ? raw.replaced : {},
    added: typeof raw.added === "string" ? raw.added : ""
  };
}

/**
 * One free-text line as a list item. Bolds everything before the first
 * " — " when there is one, and renders the whole line when there is not,
 * so a line can never fail — at worst it comes out as plain text.
 *
 * Deliberately NOT escaped. Only a GM can change a world setting, and
 * Foundry treats GM-authored text as HTML everywhere else (journals, item
 * descriptions), so letting him italicise a word is consistent rather than
 * a hole. It also avoids foundry.utils.escapeHTML, which does not exist in
 * v11 and threw the ambush dialog on its first real creature — see
 * commit c920a9e.
 */
export function renderFreeLine(line)
{
  const i = line.indexOf(" — ");
  if (i === -1) return line.trim();
  return `<b>${line.slice(0, i).trim()}</b> — ${line.slice(i + 3).trim()}`;
}

/** A shipped entry as the card renders it when nothing overrides it. */
export function renderBookGambit(g)
{
  return `<b>${g.name}</b>${g.save ? ` (${g.save})` : ""} — ${g.detail}`;
}

/**
 * The list the card actually shows: the book seven with suppressions
 * removed and replacements substituted, then the house additions.
 *
 * Returns `{ html, kind, name }` per row rather than bare strings, so a
 * caller (and a test) can tell a shipped row from an overridden one
 * without re-deriving it from the text.
 */
export function effectiveGambits(overrides = storedOverrides())
{
  const rows = [];
  for (const g of GAMBITS)
  {
    if (overrides.hidden.includes(g.name)) continue;
    const replacement = overrides.replaced?.[g.name];
    if (typeof replacement === "string" && replacement.trim())
      rows.push({ kind: "replaced", name: g.name, html: renderFreeLine(replacement) });
    else
      rows.push({ kind: "book", name: g.name, html: renderBookGambit(g) });
  }
  for (const line of String(overrides.added || "").split("\n"))
  {
    if (!line.trim()) continue;
    rows.push({ kind: "added", name: null, html: renderFreeLine(line) });
  }
  return rows;
}

/** The whole card body, so actor-sheet.js holds no layout of its own. */
export function gambitCardContent(itemName, total, targetNames, rows = effectiveGambits())
{
  const lines = rows.map(r => `<li>${r.html}</li>`).join("");
  return `<b>Gambit available</b> — ${itemName} totalled ${total}, over ${GAMBIT_THRESHOLD}.`
    + `<br><i>A stunt against ${targetNames}, in addition to rolling damage:</i>`
    + `<ul>${lines}</ul>`
    + `<i>${GAMBIT_OPEN_CLAUSE}</i>`
    + `<br><i>${GAMBIT_SAVE_CLAUSE}</i>`;
}

/**
 * The editor. A FormApplication because registerMenu requires one; this is
 * the first in the system, where the other apps extend Application.
 */
export class VaarnGambitConfig extends FormApplication
{
  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      id: "vaarn-gambit-config",
      classes: ["knave", "vaarn-gambit-config"],
      template: "systems/vaarn/templates/apps/gambit-config.html",
      title: "Gambits",
      width: 560,
      height: "auto",
      resizable: true,
      closeOnSubmit: true
    });
  }

  /** @override */
  getData()
  {
    const o = storedOverrides();
    return {
      book: GAMBITS.map((g, i) => ({
        // Field names key on the INDEX, not the gambit name. expandObject
        // splits on dots and the names carry spaces ("Damage armour"),
        // so an index keeps the form keys boring and unambiguous.
        i,
        name: g.name,
        shipped: renderBookGambit(g),
        hidden: o.hidden.includes(g.name),
        replacement: o.replaced?.[g.name] ?? ""
      })),
      added: o.added,
      threshold: GAMBIT_THRESHOLD
    };
  }

  /**
   * Rebuilt from the form rather than merged into the stored value, so
   * clearing a field clears the override. GAMBITS is walked rather than the
   * submitted keys, which means a renamed book gambit drops its stale
   * override instead of carrying it under a name nothing matches.
   */
  async _updateObject(event, formData)
  {
    const expanded = expandObject(formData);
    const hidden = [];
    const replaced = {};
    GAMBITS.forEach((g, i) =>
    {
      const row = expanded.book?.[i] ?? {};
      if (row.hidden) hidden.push(g.name);
      const text = String(row.replacement ?? "").trim();
      if (text) replaced[g.name] = text;
    });
    await game.settings.set(SCOPE, GAMBIT_SETTING,
      { hidden, replaced, added: String(expanded.added ?? "") });
  }
}

export function registerGambitSettings()
{
  game.settings.register(SCOPE, GAMBIT_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: { ...EMPTY_OVERRIDES }
  });

  game.settings.registerMenu(SCOPE, GAMBIT_SETTING + "Menu", {
    name: "Gambits",
    label: "Edit Gambits",
    hint: "Add your own gambits, and hide or reword the ones from the book. "
        + "The book's own list is never altered — your changes are stored separately.",
    icon: "fas fa-hand-fist",
    type: VaarnGambitConfig,
    restricted: true
  });
}
