/**
 * Vault Encounters from the Exploration Clock (foundry-system-index.csv row of
 * that name).
 *
 * The book's vault encounter check reads "Encounter. Roll on the current area's
 * encounter table." A generated vault has one table per level (Floor Encounter
 * Table); what the module did not know is which level the party is on. The
 * Referee says so (RULED 2026-09-27, Matt, both ways): "The party is on this
 * level" on a level's encounter page, or the Party location line in the
 * exploration clock window. It is kept as a world setting until changed or
 * cleared, and read only while the clock's environment is Vault.
 *
 * Then, in the three places a vault encounter comes up - the clock's per-turn
 * check, the day-start check and the unsecured-campsite roll - an Encounter
 * rolls that level's table automatically, naming the creature and where it
 * comes from with a Spawn one control, and an Omen names a creature from it as
 * the hint's source (RULED 2026-09-27, Matt). Every card is GM only.
 *
 * The rules are pure functions; the Foundry reads are the few at the bottom.
 */

export const LOCATION_SETTING = "partyVaultLocation";
export const LOCATION_HOOK = "vaarnPartyVaultLocation";

/** The General Encounters result a line is: "encounter", "omen" or null. Pure. */
export function checkKind(text)
{
  const t = String(text ?? "");
  if(/Encounter\.(<\/b>|<\/strong>|\*\*)?/.test(t) && /Roll on the current area/.test(t)) return "encounter";
  if(/Omen\.(<\/b>|<\/strong>|\*\*)?/.test(t)) return "omen";
  return null;
}

/** Where an entry comes from, in words. Pure. */
export function entrySource(e, level)
{
  return e.source === "lair" ? `the lair in ${e.room}` : e.source === "hazard" ? `the hazard in ${e.room}` : `Lair Rooms, Depth ${level}`;
}

/**
 * The card line for a rolled level table. Pure. `total` is the die rolled on a
 * table of `entries`. An Encounter carries a spawn marker the chat hook turns
 * into a GM-only button.
 */
export function vaultEncounterLine(kind, { vault, level, entries, total })
{
  const e = entries[total - 1];
  if(!e) return "";
  if(kind === "omen")
    return `<p class="vaarn-vault-omen"><b>Omen, ${vault} level ${level}:</b> signs of <b>${e.name}</b> (d${entries.length} = ${total}, from ${entrySource(e, level)}).</p>`;
  return `<p class="vaarn-vault-encounter"><b>${vault}, level ${level} encounters:</b> d${entries.length} = ${total} - <b>${e.name}</b>, from ${entrySource(e, level)}.`
    + `<span class="vaarn-vault-spawn" data-creature="${e.name}"></span></p>`;
}

// A vault journal filed in a folder of this name (at any depth) is finished and
// drops off the clock's Party location list (RULED 2026-09-27, Matt).
export const EXPLORED_FOLDER = "Explored Vaults";
export const OTHER_VAULT = "__other";

/**
 * The clock's Party location options (RULED 2026-09-27, Matt, so the list does
 * not grow with the campaign). With a location set: that vault's levels, and
 * "Other vault..." to see the rest. With none, or once "Other vault..." is
 * picked: every level of every vault not filed as explored. The party's own
 * vault is always listed. Pure: `levels` are { journalId, vault, level, explored }.
 */
export function locationOptions(levels, here, showAll = false)
{
  const isHere = v => !!here && v.journalId === here.journalId;
  const option = v => ({ value: `${v.journalId}|${v.level}`, label: `${v.vault}, level ${v.level}`,
                         selected: isHere(v) && v.level === here.level });
  if(here && !showAll)
    return [...levels.filter(isHere).map(option), { value: OTHER_VAULT, label: "Other vault...", selected: false }];
  return levels.filter(v => !v.explored || isHere(v)).map(option);
}

/* ---------- Foundry ---------- */

export function registerVaultLocation()
{
  game.settings.register("vaarn", LOCATION_SETTING, {
    scope: "world", config: false, type: Object, default: {},
    onChange: () => Hooks.callAll(LOCATION_HOOK)
  });
}

/** Every generated vault's levels, as { journalId, vault, level, page, explored }. */
export function vaultLevels()
{
  const out = [];
  const explored = j => { for(let f = j.folder; f; f = f.folder) if(f.name === EXPLORED_FOLDER) return true; return false; };
  for(const j of game.journal)
    for(const p of j.pages)
    {
      const enc = p.getFlag("vaarn", "vaultEncounters");
      if(enc) out.push({ journalId: j.id, vault: j.name, level: enc.level, page: p, explored: explored(j) });
    }
  return out.sort((a, b) => a.vault.localeCompare(b.vault) || a.level - b.level);
}

/** The party's recorded vault level, resolved - or null when none is set or its journal is gone. */
export function partyLocation()
{
  const loc = game.settings.get("vaarn", LOCATION_SETTING) ?? {};
  if(!loc.journalId) return null;
  return vaultLevels().find(v => v.journalId === loc.journalId && v.level === loc.level) ?? null;
}

export async function setPartyLocation(journalId, level)
{
  await game.settings.set("vaarn", LOCATION_SETTING, journalId ? { journalId, level: Number(level) } : {});
}

/** The extra line a check result gets from its text: see vaultExtra. */
export async function vaultCheckExtra(envKey, text)
{
  return vaultExtra(envKey, checkKind(text));
}

/**
 * The line an "encounter" or "omen" gets, or "" - only when the clock is in a
 * vault and a level is recorded. The unsecured-campsite surprise asks for an
 * encounter directly.
 */
export async function vaultExtra(envKey, kind)
{
  if(envKey !== "vault" || !kind) return "";
  const loc = partyLocation();
  if(!loc) return "";
  const entries = loc.page.getFlag("vaarn", "vaultEncounters").entries;
  const roll = await new Roll(`1d${entries.length}`).evaluate();
  return vaultEncounterLine(kind, { vault: loc.vault, level: loc.level, entries, total: roll.total });
}

/** The chat hook: a GM-only "Spawn one" button for each spawn marker on a card. */
export function registerVaultEncounterCards()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    if(!game.user.isGM) return;
    html.find(".vaarn-vault-spawn").each((_, span) =>
    {
      const name = span.dataset.creature;
      const button = $(`<button type="button" class="vaarn-vault-spawn-button">Spawn one ${name}</button>`);
      button.click(async ev =>
      {
        ev.preventDefault();
        ev.currentTarget.disabled = true;
        try
        {
          const { spawnNamedCreature } = await import("/systems/vaarn/module/actor/bestiary-spawn.js");
          let folder = game.folders.find(f => f.name === "Generated Creatures" && f.type === "Actor");
          if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });
          const actor = await spawnNamedCreature(name, { folder: folder.id });
          if(!actor) throw new Error(`${name} is not in the Bestiary.`);
          ui.notifications.info(`Spawned ${actor.name} in "Generated Creatures"; its sheet's Roll Encounter rolls how many.`);
          actor.sheet.render(true);
        }
        catch(err) { console.error(err); ui.notifications.error(`That spawn failed: ${err.message}`); ev.currentTarget.disabled = false; }
      });
      $(span).replaceWith(button);
    });
  });
}
