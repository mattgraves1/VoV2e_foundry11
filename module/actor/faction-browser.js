/**
 * Faction Entry Display (foundry-system-index.csv "Faction Entry Display").
 *
 * Somewhere a Referee can READ a faction. Faction Registry transcribed
 * all nine sections of all eight Major Factions and displayed one of
 * them: the settings editor prints a name, a blurb, the NPC list and
 * whether a REP table exists, which is enough to recognise a row you are
 * about to hide and nothing more. Eight of the nine sections went to
 * nobody. This is the reader that was missing, filed out of testing
 * GROUP 161 item 161.3 rather than struck.
 *
 * IT COMPUTES NOTHING, DELIBERATELY. effectiveFactions() already returns
 * a display-ready shape — wikilinks stripped, goal bullets built,
 * relations rendered, an added faction structurally identical to a book
 * one. So this file is a template plus a selection, and the whole of the
 * faction model stays in faction-config.js where the sibling rows will
 * find it. The one thing it does decide is creature-name resolution, and
 * that is below.
 *
 * A SCENE CONTROLS APPLICATION, matching weather.js, exploration-clock.js
 * and effect-board-app.js, RULED 2026-09-14 (Matt) over the alternative
 * of generating a JournalEntry per faction. Journals read well and are
 * linkable, but they are a COPY of the roster living in world state: it
 * goes stale the moment faction-data.js is corrected and needs a
 * regenerate step to fix, which is the Hardcoded Effect Text Drift
 * problem the backlog already has a row for. A window that re-reads the
 * roster on every render cannot drift at all. It is also the second time
 * a journal has been rejected for factions — faction-config.js's header
 * gives the storage-side reasoning.
 *
 * GM ONLY, RULED 2026-09-14 (Matt), matching the editor's
 * `restricted: true`. A faction's Goals and its REP actions are what the
 * Referee decides against; this is not yet a player-facing handout.
 *
 * WHAT IT SHOWS IS effectiveFactions(), RULED 2026-09-14 (Matt): the
 * book's eight minus hidden, plus the Referee's own additions, rendered
 * through the same sections in the same order. A reader is a
 * picker-shaped surface, so the hidden-from-pickers semantics Faction
 * Registry settled apply here unchanged — hiding Cacklemaw Clans takes
 * it out of this window, while resolveFaction() still finds it for a
 * character who has REP with them.
 *
 * SECTION ORDER IS THE BOOK'S, not the roster's field order, and they
 * are not the same: the vault prints Summary, Goals, Allies, Enemies,
 * Allied Monsters, Joining, Triumphant, NPCs, Gaining REP, with the
 * intro paragraph above Summary and no heading of its own. 161.3 asks
 * for exactly this order, so it is asserted in the template rather than
 * derived from whatever order the object literal happens to carry.
 */

import { effectiveFactions } from "./faction-config.js";
import { spawnNamedCreature, getBestiaryIndex } from "./bestiary-spawn.js";

export const SCOPE = "vaarn";

/**
 * The one Obsidian artefact that reaches display, and the only reason
 * this file resolves a name at all.
 *
 * The vault links the Faa Nomads' NPC as "[[Faa Nomad (bestiary)]]",
 * because Obsidian needs to tell that page from the Faa Nomads FACTION
 * page. The roster keeps the link verbatim, as it must, so stripping the
 * wikilink yields "Faa Nomad (bestiary)" — which is not a creature the
 * pack has (the Bestiary calls it "Faa Nomad") and is not a name the
 * book ever prints. Measured 2026-09-14: 15 of the 16 faction NPC names
 * match the pack exactly and this is the sixteenth.
 *
 * ONLY THE LITERAL SUFFIX IS REMOVED, never parentheses in general.
 * Four creatures carry a real parenthetical that is part of their name —
 * Moonbeast (Imago), Moonbeast (Nymph), Sandworm (Adult), Sandworm
 * (Juvenile) — so a general strip would rename them into things the pack
 * does not have. Removing one fixed string is splitting rather than
 * parsing and cannot misread a name.
 */
const DISAMBIGUATOR = " (bestiary)";

export function creatureNameOf(npc)
{
  const n = String(npc ?? "").trim();
  return n.endsWith(DISAMBIGUATOR) ? n.slice(0, -DISAMBIGUATOR.length) : n;
}

/**
 * The reader.
 *
 * Selection is instance state rather than a setting: which faction you
 * last looked at is not world data, and storing it would mean a second
 * thing that can be wrong about the registry.
 */
export class VaarnFactionBrowser extends Application
{
  constructor(options = {})
  {
    super(options);
    /* A NAME, not an index. The list is rebuilt from the registry on
       every render, so an index silently points at a different faction
       the moment one is hidden or added while this window is open. */
    this.selectedName = options.selectedName ?? null;

    /* Guards the spawn button against a second click landing while the
       first is still fetching the pack. It is INSTANCE state rather than
       the button's own `disabled`, and the difference is not cosmetic:
       disabling the element holds for a real double-click, because a
       browser fires no click at a disabled button, but it does not
       survive a re-render — render(false) replaces the element, and a
       fresh one is not disabled. Selecting another faction mid-spawn
       does exactly that. */
    this._spawning = false;
  }

  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions, {
      id: "vaarn-faction-browser",
      classes: ["knave", "vaarn-faction-browser"],
      template: "systems/vaarn/templates/apps/faction-browser.html",
      title: "Factions of Vaarn",
      width: 720,
      height: 640,
      resizable: true
    });
  }

  /** @override */
  async getData()
  {
    const factions = effectiveFactions();

    /* An empty list is reachable: a Referee can hide all eight and add
       none. Say so rather than rendering a blank pane. */
    const entry = factions.find(f => f.name === this.selectedName) ?? factions[0] ?? null;
    this.selectedName = entry?.name ?? null;

    return {
      list: factions.map(f => ({
        name: f.name,
        kind: f.kind,
        added: f.kind === "added",
        selected: f.name === this.selectedName
      })),
      empty: factions.length === 0,
      entry: entry ? { ...entry, npcs: await this._npcRows(entry.npcs) } : null
    };
  }

  /**
   * An NPC name plus whether the pack can actually produce it.
   *
   * The unresolvable case is rendered as plain text rather than as a
   * button that does nothing — a spawn control that silently no-ops is
   * the failure this project keeps finding, and a name the Bestiary does
   * not have is information the Referee wants rather than an error. It
   * is also the normal case for an added faction, whose NPCs are free
   * text a Referee typed and need not be creatures at all.
   */
  async _npcRows(npcs)
  {
    let index = [];
    try { index = await getBestiaryIndex(); }
    catch { index = []; }
    const known = new Set(index.map(c => c.name));

    return (npcs ?? []).map(npc =>
    {
      const creature = creatureNameOf(npc);
      return { label: creature, creature, spawnable: known.has(creature) };
    });
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);

    html.find("[data-action='select-faction']").on("click", ev =>
    {
      ev.preventDefault();
      this.selectedName = ev.currentTarget.dataset.faction;
      this.render(false);
    });

    html.find("[data-action='spawn-npc']").on("click", async ev =>
    {
      ev.preventDefault();
      const button = ev.currentTarget;
      const name = button.dataset.creature;

      /* Two Actors from one intent is the easy failure here, and it is
         only noticed later. The element is disabled for the feedback and
         the flag is what actually guards. */
      if (this._spawning) return;
      this._spawning = true;
      button.disabled = true;
      try
      {
        const actor = await spawnNamedCreature(name);
        if (!actor)
        {
          ui.notifications.warn(`The Bestiary has no creature named "${name}".`);
          return;
        }
        ui.notifications.info(`${actor.name} spawned into the world.`);
        actor.sheet?.render(true);
      }
      finally { this._spawning = false; button.disabled = false; }
    });
  }
}

/** Alongside the Weather app and the Exploration Clock, for the same reason. */
export function registerFactionBrowserControls()
{
  Hooks.on("getSceneControlButtons", controls =>
  {
    if (!game.user.isGM) return;
    const tokens = controls.find(c => c.name === "token");
    if (!tokens) return;
    tokens.tools.push({
      name: "vaarn-factions",
      title: "Factions of Vaarn",
      icon: "fas fa-flag",
      button: true,
      visible: true,
      onClick: () => new VaarnFactionBrowser().render(true)
    });
  });
}
