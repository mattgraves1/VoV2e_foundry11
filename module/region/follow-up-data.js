/**
 * FOLLOW-UP ROLL BUTTON (foundry-system-index.csv row of that name) - the shared list.
 *
 * Every generated result that names something the module can make, matched to
 * what it makes. Found by Matt's sweep of the region location tables on
 * 2026-10-08 and RULED the same day: every result gets a button. Keyed by the
 * location type whose page shows it, then the label the page prints ("Fortress
 * Quirk"), then the result word for word; tools/test-follow-up.mjs holds each
 * one to its table, so a reworded table entry fails the commit instead of
 * quietly losing its button. Settlement entries join this list with Settlement
 * Creation.
 *
 * The kinds (module/region/follow-up.js makes them):
 *   item       an Item from a loot builder, linked on the page
 *   monster    Generate Monster's maker, the Actor linked
 *   daemon     a Quantum Daemon, its size asked each time (RULED)
 *   composite  a composite generator rolled into the page as a section
 *   cache      a treasure cache of a fixed type, its size asked each time (RULED)
 *   vault      the Vault Settings Tuner, the vault linked
 *   faction    the Faction Browser opened at a faction
 *   creature   a named Bestiary creature spawned into Generated Creatures, linked
 *   place      another location type, rolled into the page as its own section
 *              (Place Within a Place, RULED 2026-10-08); a Settlement is built as
 *              its own journal and map, linked (Settlement Creation chunk 7)
 */

const item = builder => ({ kind: "item", builder });
const composite = key => ({ kind: "composite", key });
const place = type => ({ kind: "place", type });
const DRUG = item("buildDrug"), EXOTICA = item("buildAdvancedExotica"), IMPLANT = item("buildAdvancedImplant");
const GIFT = item("buildGift"), MUTATION = item("buildMutation");
const MONSTER = { kind: "monster" }, DAEMON = { kind: "daemon" }, VAULT = { kind: "vault" };
const TITAN = { kind: "faction", faction: "Titan Cults" };
const AUTARCH = composite("autarchs"), PETTY_GOD = composite("petty_gods");

export const FOLLOW_UPS = {
  "Ruin": {
    "What Was It?": { "Autarch's Tomb": AUTARCH },
    "And Then?": { "Mystic's Abode": place("Science-Mystic's Abode"), "Trading Post": place("Trade Post"),
      "Titan Cult Shrine": TITAN, "Quantum Daemon Shrine": DAEMON },
    "And Now": { "Faa Nomad Campsite": place("Faa Nomad Camp"), "Hideout for Bandits": place("Bandit Camp"),
      "Cacklemaw Den": place("Cacklemaw Den"), "Hegemony Outpost": place("Hegemony Outpost"), "Monster Lair": place("Lair"),
      "Science-Mystic's Abode": place("Science-Mystic's Abode"), "Grave Site": place("Grave"), "Holy Place": place("Holy Place") },
    "Other Feature": { "Has Abundant Drugs": DRUG, "Contains Exotica": EXOTICA, "Secret Survival Cache": { kind: "cache", type: "Survival" },
      "Crashed Vehicle Present": place("Wreck") },
  },
  "Oasis": {
    "Custom": { "Sacred to Petty God": PETTY_GOD, "Drug Ritual": DRUG },
    "What's Here?": { "Autarch Statue": AUTARCH, "Arcology Dome": place("Arcology"), "Grave": place("Grave") },
    "Who's Here?": { "Trading Caravan": composite("trade_caravans"), "Bounty Hunters": place("Bounty Hunter's Camp"), "Titan Cultists": TITAN },
  },
  "Holy Place": {
    "Location": { "Wreck": place("Wreck"), "Settlement": place("Settlement"), "Ruin": place("Ruin") },
    "Holy To": Object.fromEntries(["KRONOS", "METIS", "MNEMOSYM", "HYPERION", "GAEA", "COEUS", "THEMIS"].map(t => [`Cult of ${t}`, TITAN])),
    "Curated By": { "Monster Lair": place("Lair") },
  },
  "Arcology": {
    "Abundance": { "Drugs": DRUG, "Exotica": EXOTICA },
  },
  "Grave": {
    "Grave For": { "Autarch": AUTARCH, "Autarch's Consort": AUTARCH },
    "Grave Quirk": { "Hideout for Bandits": place("Bandit Camp"), "Entrance to Vault": VAULT, "Monster Lair": place("Lair") },
  },
  "Cacklemaw Den": {
    "They Want": { "Drugs": DRUG },
  },
  "Wreck": {
    "Cargo": { "Cyborg Parts": IMPLANT, "Exotica": EXOTICA },
  },
  "Faa Nomad Camp": {
    "They Have": { "Drugs": DRUG, "Cybernetics": IMPLANT, "Exotica": EXOTICA },
  },
  "Oracle's Sanctum": {
    "The Oracle": { "Addicted to Drug": DRUG },
    "Divination Method": { "Captive Quantum Daemon": DAEMON },
    "They Want": { "Object Stolen from Distant Archive": place("Archive"), "A Quantum Daemon Killed": DAEMON },
  },
  "Science-Mystic's Abode": {
    "They Want": { "Armed Escort to Explore a Distant Vault": VAULT },
  },
  "Hegemony Outpost": {
    "Unit Type": { "D6 Deserters (as Bandits)": place("Bandit Camp") },
  },
  "Fortress": {
    "Garrisoned By": { "Bandits": place("Bandit Camp"), "Titan Cult": TITAN, "Quantum Daemon Cult": DAEMON },
    "Fortress Quirk": { "Birthplace of Autarch": AUTARCH, "Once Imprisoned Autarch": AUTARCH, "Contains Archive": place("Archive"),
      "Secret Holy Place": place("Holy Place"), "Quantum Daemon Trapped Here": DAEMON, "Entrance to Vault": VAULT, "Hidden Monster Lair": place("Lair") },
  },
  "Trade Post": {
    "Who Trades Here?": { "Servants of a Petty God": PETTY_GOD, "Titan Cultists": TITAN },
    "What Is Traded?": { "Psychedelics": DRUG, "Exotica": EXOTICA },
  },
  "Archive": {
    "They Want": { "Monster Lair Removed From Archive": place("Lair"), "Vault Beneath Archive Explored": VAULT },
  },
  "Bounty Hunter's Camp": {
    "The Hunter": { "Sacred Assassin": composite("assassins") },
  },
  "Anomaly": {
    "Primary Effect": { "Implants Mystic Gifts": GIFT, "Creates Monsters": MONSTER },
    "Secondary Effect": { "Induces Mutations": MUTATION },
  },

  // ---- a settlement's pages (Settlement Creation chunk 6, the list RULED 2026-10-08, Matt) ----
  // Read as their own types: the Overview, and a building's, asset's and problem's page. The values are as the
  // journal prints them, the book's "(p.xx)" left off.
  "Settlement Overview": {
    "Dominant Faith": { "Titan Cult": TITAN, "Autarch Cult": AUTARCH, "Worship a local Petty God": PETTY_GOD, "Worship a Quantum Daemon": DAEMON,
      "Worship Local Monster": MONSTER, "Seekers of Eyeless Wisdom": { kind: "faction", faction: "Seekers of Eyeless Wisdom" },
      "Children of the Darkling Sun": { kind: "faction", faction: "The Children of the Darkling Sun" },
      // Matt's choice; of the Bestiary's two cultists, the rank and file of a hidden cult (Claude's pick)
      "Hidden Ghoul Cult": { kind: "creature", name: "Aspirant Ghoul Cultist" } },
  },
  "Settlement Building": {
    "Building": { "Petty God Shrine": PETTY_GOD, "Autarch Shrine": AUTARCH, "Archive": place("Archive"), "Assassin's House": composite("assassins"),
      "Drug Dealer (generate a drug)": DRUG, "Drug Cafe (generate a drug)": DRUG, "Quantum Daemon's Lair": DAEMON,
      "Jigsaw Courtier's House": { kind: "creature", name: "Jigsaw Courtier" }, "Darkling Sun Cabal": { kind: "creature", name: "Child of the Darkling Sun" },
      "Fortress": place("Fortress") },
  },
  "Settlement Asset": {
    "Major Asset": { "Vault Entrance": VAULT },
  },
  "Settlement Problem": {
    "Major Problem": { "Rapacious Local Monsters": place("Lair"), "Banditry": place("Bandit Camp") },
  },
};

/** The follow-up type a settlement page reads as, from its location flag's kind, or null. */
export const SETTLEMENT_PAGE_TYPE = { building: "Settlement Building", asset: "Settlement Asset", problem: "Settlement Problem" };

/** What a button for this kind of result says it does. */
export function followUpLabel(f)
{
  switch(f.kind)
  {
    case "item": return { buildDrug: "Generate the drug", buildAdvancedExotica: "Generate the Exotica", buildAdvancedImplant: "Generate the implant",
      buildGift: "Generate the Mystic Gift", buildMutation: "Generate the mutation" }[f.builder] ?? "Generate it";
    case "monster": return "Generate the monster";
    case "daemon": return "Generate the Quantum Daemon...";
    case "composite": return { autarchs: "Roll the Autarch", petty_gods: "Roll the Petty God", assassins: "Roll the assassin", trade_caravans: "Roll the caravan" }[f.key] ?? "Roll it";
    case "cache": return `Generate the ${f.type.toLowerCase()} cache...`;
    case "vault": return "Generate the vault...";
    case "faction": return `Open ${f.faction}`;
    case "creature": return `Spawn a ${f.name}`;
    case "place": return f.type === "Settlement" ? "Build the settlement" : `Roll the ${f.type}`;
    default: return null;
  }
}

const unescape = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#0?39;/g, "'").replace(/&amp;/g, "&");
/**
 * A page's "<p><b>Label:</b> text</p>" lines, as region-details.js detailsHtml writes them - or with <strong>,
 * as Foundry's editor saves bold once a GM edits the page: [[label, text]].
 */
export function pageLines(html)
{
  return [...String(html ?? "").matchAll(/<p><(b|strong)>([^<]+?):<\/\1>\s*([^<]*)<\/p>/g)].map(m => [unescape(m[2]).trim(), unescape(m[3]).trim()]);
}

/**
 * The follow-ups a page's text carries: [{ label, value, followUp }], in page order. Places are left out unless
 * asked for. `lines` is [[label, text]], each "<b>Label:</b> text" line of the page; a line holding
 * several results joins them with "; " (region-details.js detailsHtml), and a result can itself contain "; ", so
 * a result matches only as a whole "; "-separated run of the line.
 */
export function followUpsOf(type, lines, { places = false } = {})
{
  const byLabel = FOLLOW_UPS[type];
  if(!byLabel) return [];
  const out = [];
  for(const [label, text] of lines)
  {
    const results = byLabel[label];
    if(!results) continue;
    const padded = `; ${text}; `;
    for(const [value, followUp] of Object.entries(results))
      if((followUp.kind !== "place" || places) && padded.includes(`; ${value}; `)) out.push({ label, value, followUp });
  }
  return out;
}

/**
 * PLACE WITHIN A PLACE (foundry-system-index.csv row of that name, RULED 2026-10-08, Matt): a page split into
 * the places it holds. A follow-up section is headed "<h3>Name (from Label: Value)</h3>" (follow-up.js writes
 * it); a heading whose Label: Value is a place result of an earlier place on the page starts an inner place of
 * that type, read with its own tables; any other such heading (an Autarch, a caravan) starts a section that is
 * no place, typed null. Nothing is stored: the headings and the shared list are the whole record.
 *
 * Returns [{ type, html, from, parent }], the page's own type first; `from` is "Label: Value" for a section,
 * `parent` the index of the place it came from.
 */
export const SECTION_HEAD = /<h3[^>]*>([^<]*?) \(from ([^<:]+?): ([^<]+?)\)<\/h3>/g;
export function pageSegments(html, pageType)
{
  const text = String(html ?? "");
  const segs = [{ type: pageType, html: "", from: null, parent: null }];
  let last = 0;
  for(const m of text.matchAll(SECTION_HEAD))
  {
    segs[segs.length - 1].html += text.slice(last, m.index);
    last = m.index + m[0].length;
    const label = unescape(m[2]).trim(), value = unescape(m[3]).trim();
    let type = null, parent = null;
    for(let i = segs.length - 1; i >= 0; i--)
    {
      const f = segs[i].type && FOLLOW_UPS[segs[i].type]?.[label]?.[value];
      if(f?.kind === "place") { type = f.type; parent = i; break; }
    }
    segs.push({ type, html: "", from: `${label}: ${value}`, parent });
  }
  segs[segs.length - 1].html += text.slice(last);
  return segs;
}

/**
 * Every follow-up a page offers, place by place: [{ segment, label, value, followUp }]. A place result whose
 * section already exists is left out (ruling 5: the ruin is one bandit hideout, not two).
 */
export function pageFollowUps(html, pageType)
{
  const segs = pageSegments(html, pageType);
  const out = [];
  segs.forEach((seg, i) =>
  {
    if(!seg.type) return;
    for(const f of followUpsOf(seg.type, pageLines(seg.html), { places: true }))
    {
      // a place is made once: its section exists - or, for a Settlement, which is its own journal, its Made here line
      const made = f.followUp.kind === "place" && (segs.some(s => s.parent === i && s.from === `${f.label}: ${f.value}`)
        || (f.followUp.type === "Settlement" && String(html ?? "").includes(`(from ${f.label}: ${f.value})`)));
      if(!made) out.push({ segment: i, segType: seg.type, ...f });
    }
  });
  return out;
}
