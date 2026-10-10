/**
 * Region Generator (foundry-system-index.csv row of that name) - names.
 *
 * Names every location and section of a grown region, and gives every section
 * its default encounter table (RULED 2026-10-03, Matt):
 *
 *   a location   its type's Place Names column; the types in AUTARCHIC_TYPES
 *                roll Autarchic Places instead one time in five. When a column
 *                has no unused name left, Autarchic Places; then no name, for the
 *                GM to fill.
 *   a section    from its Region Named For roll, usually joined to its
 *                Landscape's word ("the Broken Ossino Riverbed", "Hills of the
 *                Blue Baboons"). Natural Resource is a suggestion from the land
 *                trade goods.
 *   the table    its Landscape's encounter table; a Famous Monster section also
 *                gains an Alone and Dangerous creature, and is named for it.
 *
 * No name repeats within a region; a repeat is re-rolled. The GM can type over
 * any name in the preview. Names roll from their own stream of the seed, after
 * the layout, so they never change the region they name.
 *
 * Pure: no Foundry, so it runs in Node for the test.
 */

import { rngFrom } from "./region-layout.js";
import { PLACE_NAMES, TYPE_NAME_COLUMN, AUTARCHIC_TYPES, AUTARCHIC_CHANCE, LANDSCAPE_WORD, LANDSCAPE_ENCOUNTERS,
  FAMOUS_MONSTER_TABLE, encounterTable, creatureOf, GIVEN_NAMES, LAND_RESOURCES, RESOURCE_NAME_FORM, WEATHER_NAMES,
  MOUNTAIN_LANDSCAPES, WATER_LANDSCAPES, CREATURE_ALIASES } from "./region-data.js";
import { BESTIARY } from "../actor/bestiary-data.js";
import { generateSettlement } from "../settlement/settlement-generator.js";
import { settlementLocationIn } from "./region-details.js";
import { LAIR_CREATURE_ALIASES } from "../actor/lair-rooms-data.js";

// A creature an encounter entry names, if the Bestiary has it ("d6 Glass Tigers" is a Glass Tiger).
const BESTIARY_NAMES = new Set(BESTIARY.map(b => b.name));
/** The Bestiary name a creature mention resolves to - by name, singular form or the Lair Rooms aliases - or null. */
export function bestiaryNameOf(name)
{
  const tries = [name, ...[].concat(LAIR_CREATURE_ALIASES[name] ?? []), ...[].concat(CREATURE_ALIASES[name] ?? [])];
  for(const t of tries)
  {
    const forms = [t];
    if(/ves$/i.test(t)) forms.push(t.replace(/ves$/i, "f"), t.replace(/ves$/i, "fe"));
    if(/ies$/i.test(t)) forms.push(t.replace(/ies$/i, "y"));
    if(/men$/i.test(t)) forms.push(t.replace(/men$/i, "man"));
    if(/es$/i.test(t)) forms.push(t.replace(/es$/i, ""));
    if(/s$/i.test(t) && !/ss$/i.test(t)) forms.push(t.replace(/s$/i, ""));
    const hit = forms.find(f => BESTIARY_NAMES.has(f));
    if(hit) return hit;
  }
  return null;
}
const inBestiary = name => !!bestiaryNameOf(name);

// A name that reads as a whole place stands alone; a single proper name takes the Landscape's word.
const standsAlone = n => /^the\b/i.test(n) || /\bof\b/i.test(n) || /'s\b/.test(n) || n.split(/\s+/).length >= 3;
const shortLandmark = t => t.split(/[,;]/)[0].trim();

/**
 * A region Settlement's own settlement (Settlement Creation chunk 7, RULED 2026-10-08, Matt): a seed of the region's
 * and the location's, its Location of Settlement from its section's Landscape (Settlement Location from Section
 * Landscape), named from its details with the region's spent names. Sets L.name, L.nameFrom and L.settlement - what
 * its page's Build this settlement makes the same settlement from. Returns the settlement.
 */
export function settleLocation(W, L, used = new Set())
{
  const seed = `${W.settings.seed}|settlement|${L.id}`;
  const location = settlementLocationIn(W.sections[L.section]?.landscape, rngFrom(seed + "|location"));
  const g = generateSettlement({ seed }, { usedNames: used, location });
  L.name = g.name; L.nameFrom = "its details";
  L.settlement = { seed, location: location ?? null, nameKey: g.nameKey, founder: g.founder };
  return g;
}

/** Name a region from generateRegion. Sets L.name, sec.name, sec.nameFrom and sec.encounters. */
export function nameRegion(W)
{
  const rnd = rngFrom(W.settings.seed + "|names");
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const used = new Set();
  // One name, re-rolled while it repeats; null when the list has nothing unused.
  const fresh = list =>
  {
    const left = list.filter(n => !used.has(n));
    if(!left.length) return null;
    let n = pick(list);
    for(let i = 0; i < 40 && used.has(n); i++) n = pick(list);
    if(used.has(n)) n = pick(left);
    used.add(n);
    return n;
  };

  for(const L of W.locs)
  {
    // A Settlement is named by the settlement generator from its own details, rolled now - during the preview - so
    // the name exists there (Settlement Creation, RULED 2026-10-08, Matt); the region's spent names are its own.
    if(L.type === "Settlement") { settleLocation(W, L, used); continue; }
    const own = TYPE_NAME_COLUMN[L.type];
    const autarchic = AUTARCHIC_TYPES.has(L.type) && rnd() < AUTARCHIC_CHANCE;
    // the rolled column first, then the other one, so a used-up column falls back either way
    const order = autarchic ? ["Autarchic Places", own] : [own, "Autarchic Places"];
    let name = null, from = null;
    for(const c of order) { name = fresh(PLACE_NAMES[c]); if(name) { from = c; break; } }
    L.name = name ?? "";
    L.nameFrom = name ? from : null;
  }

  for(const sec of W.sections)
  {
    const word = LANDSCAPE_WORD[sec.landscape];
    const table = encounterTable(LANDSCAPE_ENCOUNTERS[sec.landscape]);
    sec.encounters = { table: LANDSCAPE_ENCOUNTERS[sec.landscape], formula: table.formula, added: [] };
    const creatures = table.results.map(r => creatureOf(r.text)).filter(inBestiary);
    // a name already ending in the Landscape's word does not take it again: "the Sinking Sands", not "the Sinking
    // Sands Sands" (Matt, 2026-10-03)
    const endsInWord = n => n.toLowerCase().endsWith(" " + word.toLowerCase()) || n.toLowerCase() === word.toLowerCase();
    const titled = (n, from) => n ? { name: standsAlone(n) ? n : endsInWord(n) ? `the ${n}` : `the ${n} ${word}`, from } : null;
    const ofThe = (n, from) => n ? { name: `${word} of the ${n}`, from } : null;
    const columns = cols => { for(const c of [cols[Math.floor(rnd() * cols.length)], ...cols]) { const n = fresh(PLACE_NAMES[c]); if(n) return titled(n, c); } return null; };
    let got = null;
    switch(sec.named)
    {
      case "Famous Resident": { const n = fresh(GIVEN_NAMES); got = n && { name: `${n}'s ${word}`, from: "Names of Vaarn" }; break; }
      case "Local Wildlife": got = ofThe(fresh(creatures), sec.encounters.table); break;
      case "Famous Monster":
      {
        // the section's table gains the monster, and the section is named for it
        const monsters = encounterTable(FAMOUS_MONSTER_TABLE).results.map(r => creatureOf(r.text)).filter(inBestiary);
        const m = fresh(monsters);
        if(m) { sec.encounters.added.push({ table: FAMOUS_MONSTER_TABLE, text: m }); got = ofThe(m, FAMOUS_MONSTER_TABLE); }
        break;
      }
      case "Natural Wonder":
        if(MOUNTAIN_LANDSCAPES.has(sec.landscape)) got = columns(["Mountains"]);
        else if(WATER_LANDSCAPES.has(sec.landscape)) got = columns(["Oases and Lakes"]);
        else if(sec.landmark) { const n = shortLandmark(sec.landmark.name); if(!used.has(n)) { used.add(n); got = ofThe(n, "Landmark"); } }
        break;
      case "Natural Hazard":
      {
        const mine = new Set(sec.locs.map(l => l.id));
        const hazards = [...new Set(W.routes.filter(r => r.hazard && r.hazard !== "Lair" && (mine.has(r.a) || mine.has(r.b))).map(r => r.hazard))];
        got = titled(fresh(hazards.length ? hazards : ["Unexploded Munitions", "Poisonous Plants", "Acid Rain", "Uncanny Winds", "Hypnotic Sky Lights", "Sinking Sands", "Sandworm Spawning Ground", "Anomaly", "Disease", "Nanomachines"]), "Route Hazard");
        break;
      }
      case "Long-Dead Settlement": got = columns(["Ruins", "Autarchic Places"]); break;
      case "Forgotten Religion": got = columns(["Holy Places", "Accursed Places", "Autarchic Places"]); break;
      case "Local Weather": got = titled(fresh(WEATHER_NAMES), "Weather"); break;
      case "Natural Resource":
      {
        // "Mesas of Shells" (Matt); a resource can go by a place-name form of its own ("the Scrap Forest")
        const r = fresh(LAND_RESOURCES);
        const form = r && RESOURCE_NAME_FORM[r];
        got = r && { name: form ? form.replace("{word}", word) : `${word} of ${r}`, from: "the land trade goods" };
        break;
      }
      case "Name No Longer Understood": got = columns(["Faa Nomad Places", "Hidden Places", "Titan-Era Facilities", "Autarchic Places"]); break;
    }
    sec.name = got?.name ?? "";
    sec.nameFrom = got?.from ?? null;
  }
  return W;
}
