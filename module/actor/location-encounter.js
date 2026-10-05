/**
 * THE PARTY'S LOCATION'S ENCOUNTER - for a creature that summons "as random
 * encounter" (a Quantum Daemon's Summons Monsters; Generated Gear and Attacks
 * as Items, RULED 2026-10-04 by Matt): "base it on the party's location. If
 * they are in a vault, use the vault level random encounters. If they are in a
 * desert section, use that section's random encounters."
 *
 * The location is what the Exploration Clock records: Where (Vault or Desert),
 * then the Party location (a generated vault's level) or the Party section (a
 * generated region's section). Nothing recorded for the place the clock is in
 * resolves to null, and the caller says so - there is no guessed fallback.
 */

import { currentEnvironment } from "../time/exploration-clock.js";
import { partyLocation } from "../vault/vault-encounters.js";
import { partySection, rollSection } from "../region/region-encounters.js";

/**
 * Roll the party's current encounter table. Resolves to
 * { where, text, creature, total, die } - `creature` a Bestiary name or null -
 * or null when the clock's place has no table recorded.
 */
export async function rollPartyLocationEncounter()
{
  const env = currentEnvironment();
  if(env === "vault")
  {
    const loc = partyLocation();
    if(!loc) return null;
    const entries = loc.page.getFlag("vaarn", "vaultEncounters")?.entries ?? [];
    if(!entries.length) return null;
    const roll = await new Roll(`1d${entries.length}`).evaluate();
    const e = entries[roll.total - 1];
    return { where: `${loc.vault}, level ${loc.level}`, text: e.name, creature: e.name, total: roll.total, die: entries.length };
  }
  if(env === "desert")
  {
    const sec = partySection();
    if(!sec) return null;
    const { total, entries, entry } = await rollSection(sec.page);
    return { where: `${sec.region}, ${sec.name}`, text: entry.text, creature: entry.creature ?? null, total, die: entries.length };
  }
  return null;
}
