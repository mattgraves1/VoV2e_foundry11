/**
 * Ambush Resolution.
 *
 * The book (Combat/Ambushes.md, verbatim in CRIMSON HOUND 07-05-26): "In
 * cases of attempted ambush, all ambush targets must PSY Save vs the
 * ambusher's DEX. If more than half the target group fails their Save, the
 * attackers successfully spring an ambush. During an ambush round, all
 * ambushers make an attack with ADV. Initiative is then calculated as normal."
 *
 * THE MECHANISM RUNS BOTH WAYS, which is the correction that shaped this
 * build. The index Description, and the first build plan put to Matt, read as
 * though an ambush is something that happens TO the players. It is not:
 *
 *   Matt, 2026-09-10 — "if the PCs are ambushing, they need to nominate a
 *   character to spring the ambush - that char's DEX is the target for the
 *   PSY saves by the GM-controlled chars."
 *
 * So one side nominates an ambusher, and the OTHER side saves. Which side is
 * which is read from the nominated combatant, never assumed.
 *
 * ADJUDICATION IS SPLIT BY SIDE, and that split is the whole design. It is
 * not one of the three shapes offered when this was scoped, all of which were
 * "the table rolls" or "the code rolls" applied uniformly:
 *
 * - Referee-controlled targets are rolled in ONE batch. Nobody wants to roll
 *   six identical NPC saves by hand.
 * - Player-controlled targets are rolled by their own players, one row each,
 *   because they will want to roll them.
 * - The Referee may roll any row still outstanding (Matt, 2026-09-10), so an
 *   absent player or an unconscious character never blocks the tally.
 *
 * THE TALLY IS DERIVED, NEVER STORED, and this is a permission constraint
 * before it is a preference. `apply-to-target.js` gets its privilege from the
 * player POSTING and the Referee CLICKING; here the Referee posts and players
 * must record results, which is the same trick backwards and does not work —
 * a player cannot write a flag onto a message the Referee authored, and this
 * system relays only Actor, Item and Combatant writes (combat/gm-relay.js,
 * 2026-09-27), never a ChatMessage.
 *
 * So no row result is ever written to the card. Each save is an ordinary roll
 * message authored by whoever rolled it, carrying an `ambushSave` flag naming
 * the ambush and the token it answers for. The roster is then recomputed by
 * scanning for those messages. Every client derives the same tally from
 * documents each user was already allowed to create.
 *
 * That also disposes of the double-apply hazard `alreadyApplied` exists to
 * guard in apply-to-target.js: there is no spent state to get out of step,
 * because there is no state. A row with two save messages takes the first and
 * ignores the rest, which is arithmetic rather than bookkeeping.
 *
 * WHAT THIS DOES NOT DO, all deliberate and all Matt's call 2026-09-10:
 *
 * - It does not grant ADV. The card announces the ambush round and each
 *   ambusher gets a reminder on the board for it; the attack roll is made the
 *   ordinary way. "Announce, and a reminder on the sheet" was chosen over
 *   reaching into attack resolution, which is a far larger surface than the
 *   roll this row is about.
 * - It does not grant ADV in the night-watch mode either. Desert
 *   Exploration.md's second rule — one watcher's PSY save vs the creature's
 *   DEX, no group and no majority — was built into this file as MODE.WATCH on
 *   2026-09-13; see the MODE block below for why it is a mode and not a
 *   module. Everything after the save is shared with the group rule, which is
 *   the whole reason it lives here.
 *
 * OVERRIDES — Ambush Override Flags, built 2026-09-10 into this same file.
 *
 * EVERY "ALWAYS" IN THE BOOK HAS AN "UNLESS", and the unless is a referee
 * judgement in all four cases: the Occulith always surprises "unless the PCs
 * are informed of its exact location", the Subtle Stalker "unless PCs have
 * infrared vision", the Star Vampire until infrared or ulfire light reveals
 * it, the Scintillating Swarm only "if approached". So a flag that simply
 * skipped the roll would be wrong in exactly the situation the rule is
 * interesting.
 *
 * RULED 2026-09-10 (Matt): PRESELECT, THE REFEREE CONFIRMS. The dialog reads
 * the nominee's flag, QUOTES the book's own sentence, and offers the skip
 * ready-ticked. Untick it and the saves are rolled normally. Code reads the
 * rule; the judgement stays at the table. This is the same division as the
 * split adjudication above, applied to the escape clause.
 *
 * RULED 2026-09-13 (Matt): THE SKIP IS OFFERED ALWAYS, not only when a flag
 * preselects it — "can we have that override on the ambush setup sheet all
 * the time?" Preselection is unchanged; what changed is that the box exists
 * with every nominee and starts unticked.
 *
 * The gap it closes came out of Vault Traversal Penalties. "Encounters always
 * surprise the party" in darkness is a property of the PARTY'S SITUATION, and
 * `ambusherOverride` can only ever read a flag on a CREATURE, so no flag could
 * express it. Rather than teach the override a second source, the Referee
 * ticks the box — which is also the answer for every other automatic surprise
 * the book leaves to judgement. Darkness deliberately does NOT preselect it;
 * Matt ruled the rest of that rule adjudicated, and auto-ticking would be
 * building the half he said not to.
 *
 * A MANUAL TICK CITES NO RULE, and says so: the card reads "Referee's call"
 * where a flagged creature quotes the book. Inventing a book reason for a
 * judgement call would put words in the text's mouth on a card the players
 * read.
 *
 * RULED 2026-09-10 (Matt): A MIXED GROUP SPRINGS WHOLE. One always-ambusher
 * carries its whole side. The book states nothing here — an Occulith beside
 * two ordinary creatures is not a case it considers — so this is recorded as
 * a decision rather than presented as a reading.
 *
 * WHAT AN OVERRIDE IS NOT: `cannot` does not veto a side. Desiccator's "always
 * loses initiative and cannot surprise" is about the Desiccator, and one
 * shuffling behind a Subtle Stalker does not stop the Stalker. It suppresses
 * that creature as a NOMINEE, which is where the dialog applies it.
 *
 * THREE OF THE TEN WAITING ATOMS ARE NOT REACHABLE and were left, not
 * forgotten: Shriekman's Deafened is a wound `wounds-data.js` does not have
 * (that roster is the d20 table), Babble Bird's Babbling has no condition
 * document, and Janus Lenses needs a Nanomachine Infections roster that does
 * not exist in code at all. Each waits on a different NOT STARTED mechanism
 * and none of them is an ambush problem. DEAFENED IS REACHABLE since
 * 2026-09-25: NAMED_WOUNDS carries it and exposureOf reads it.
 */

import { SIDE, sideOf } from "./initiative.js";
import { addEntry, entriesOf, expiryFor, SCOPE } from "../time/effect-board.js";
import { resolveSave } from "./saves.js";
// Quantum Daemon Debt: Jinxed. This card rolls its own d20 rather than going
// through the sheet, so it is one of the three roll creators that apply it.
import { applyJinx, JINX_BANNER } from "../time/curse.js";

/** Flag on the roster card. */
export const AMBUSH_FLAG = "ambush";

/** Flag on each individual save roll, pointing back at the card. */
export const SAVE_FLAG = "ambushSave";

/**
 * "Ten plus the opposing character's ability bonus" (Core Rules/Saving
 * Throws.md). Named rather than inlined because the ambush save is an opposed
 * save like any other and the base is not an ambush fact.
 */
export const OPPOSED_BASE = 10;

/**
 * NIGHT WATCH IS A MODE OF THIS FILE, not a file of its own (Matt
 * 2026-09-13). Desert Exploration.md's "Night Watches" is the same roll as an
 * ambush with one saver instead of a side: the creature's DEX sets the number,
 * the watcher makes a PSY Save, and failure "grants the monsters a surprise
 * round in combat; the aggressors strike with ADV".
 *
 * MATT'S READING, and it is what settled the shape: "the book is using
 * inconsistent language to describe exactly an ambush round". So the round the
 * watch loses IS the ambush round — same card, same one-round board entries,
 * same announce-and-remind rather than automatic ADV. Nothing below changes
 * what happens after the save; only who is asked to roll it.
 *
 * That is also why this is a mode rather than a sibling module. The override
 * flags come free — an Occulith approaching a camp still always surprises, a
 * Desiccator still cannot — and a separate file would have had to reach for
 * them deliberately or silently lose them.
 *
 * THE SLEEPERS ARE NOT IMMUNE ROWS. They are absent from the roster entirely.
 * An immune row is a target the ambush is aimed at who cannot be caught, and
 * it raises the majority bar (see tallyOf); a sleeping PC is not being asked
 * anything at all. The book gives exactly one saver, so the roster has exactly
 * one row and `springs(1, 1)` is already true with no special case.
 */
export const MODE = { GROUP: "group", WATCH: "watch" };

/** Is this card the one-watcher variant? An absent mode means the group rule. */
export function isWatch(spec)
{
  return spec?.mode === MODE.WATCH;
}

/* -------------------------------------------- */
/*  Reading actors                                                        */
/* -------------------------------------------- */

/**
 * An ability bonus off a combatant's actor.
 *
 * `effective` rather than `value`, matching every roll in actor-sheet.js: it
 * is the score after wound damage and live boosts, so an ambusher whose DEX
 * has been drained sets an easier number, which is the point of tracking it.
 */
export function abilityBonus(actor, key)
{
  return Number(actor?.system?.abilities?.[key]?.effective ?? 0);
}

/** The number an ambush target must EXCEED. */
export function saveTargetFor(actor)
{
  return OPPOSED_BASE + abilityBonus(actor, "dex");
}

/**
 * Resolve one save against the target.
 *
 * MOVED 2026-09-11 to combat/saves.js, where flee.js reads the same copy
 * rather than writing a sixth. Re-exported here rather than merely imported:
 * this is the name ambush.js has always published, and tools/test-ambush.mjs
 * imports it from this module.
 *
 * Saving Throw Resolution Duplication stays open — the four copies inside
 * toxin-die.js and actor-sheet.js are each embedded in a larger method and
 * were not touched.
 */
export { resolveSave };

/**
 * Does the ambush spring?
 *
 * "If MORE THAN HALF the target group fails" — strictly more, so three of six
 * is not enough and four is. Written as `failed * 2 > total` rather than
 * against `total / 2` so an odd group never depends on how a fraction rounds.
 */
export function springs(failed, total)
{
  return total > 0 && failed * 2 > total;
}

/* -------------------------------------------- */
/*  Sides                                                                 */
/* -------------------------------------------- */

/**
 * Split an encounter into the ambushing side and the side that must save.
 *
 * Bystanders are in NEITHER, for the same reason David's headcount excludes
 * them (initiative.js, Matt 2026-09-06): a neutral token standing in the room
 * is not part of the fight, and counting it toward the majority would let a
 * passing merchant decide whether the ambush lands.
 *
 * The dropped-item container is a bystander by `sideOf`, so the ground is
 * never asked to make a PSY save.
 */
export function splitSides(combatants, ambusherSide)
{
  const other = ambusherSide === SIDE.US ? SIDE.THEM : SIDE.US;
  const ambushers = [];
  const targets = [];
  for (const c of combatants)
  {
    if (!c?.actor) continue;
    const side = sideOf(c);
    if (side === ambusherSide) ambushers.push(c);
    else if (side === other) targets.push(c);
  }
  return { ambushers, targets };
}

/**
 * Escape a string for use inside a double-quoted HTML attribute.
 *
 * LOCAL RATHER THAN foundry.utils.escapeHTML, which does not exist in v11 —
 * found in live testing 2026-09-10, where the dialog threw on the first
 * creature that had a rule to quote, so no override was reachable at all. The
 * offline suite could not have caught it: it never builds the dialog.
 * system.json verifies against 11.302, so a local helper beats a call that
 * depends on which Foundry generation is running.
 */
function escapeAttr(v)
{
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* -------------------------------------------- */
/*  Overrides                                                             */
/* -------------------------------------------- */

/**
 * Roster entries whose bearer cannot be ambushed, by exact name.
 *
 * MATCHED ON THE ROSTER, NEVER ON THE TEXT, and that is the documented fix
 * rather than a preference: CLAUDE.md's homonym warning is about exactly this
 * — `Fungal` is a creature type as well as a tag name, and the per-round
 * reminder files were fixed in 2026-08-29 by importing the rosters and
 * comparing exact entry names instead of substring-searching prose. Grepping
 * Item descriptions for "cannot be ambushed" would also match a description
 * that merely quotes the phrase.
 *
 * Built lazily and cached, because three rosters is three module imports and
 * the dialog asks this once per combatant.
 */
let _immuneNames = null;
export async function immuneItemNames()
{
  if (_immuneNames) return _immuneNames;
  const [mut, imp, exo] = await Promise.all([
    import("../actor/mutation-data.js"),
    import("../actor/advanced-implants-data.js"),
    import("../actor/advanced-exotica-data.js")
  ]);
  const names = new Set();
  const collect = obj => {
    for (const v of Object.values(obj ?? {}))
      if (Array.isArray(v))
        for (const e of v) if (e?.ambush === "immune" && e.name) names.add(e.name);
  };
  collect(mut); collect(imp); collect(exo);
  _immuneNames = names;
  return names;
}

/** Test seam: drop the cache so a roster edit is picked up without a reload. */
export function resetImmuneCache() { _immuneNames = null; _asleepNames = null; _giveawayNames = null; }

/**
 * Afflictions whose bearer is not surprised WHILE ASLEEP - Janus Lenses, "they
 * cannot be ambushed or surprised while asleep, as the cameras always detect
 * approaching adversaries" (Ambush Resolution wiring, RULED 2026-09-26 by
 * Matt: the bearer only). Asleep means a sleeper in a night watch; awake, it
 * does nothing. Matched on the roster by exact name, as immuneItemNames is.
 */
let _asleepNames = null;
export async function asleepImmuneNames()
{
  if (_asleepNames) return _asleepNames;
  const { AFFLICTIONS } = await import("../actor/affliction-data.js");
  _asleepNames = new Set((AFFLICTIONS ?? []).filter(e => e.ambush === "immuneAsleep").map(e => e.name));
  return _asleepNames;
}

/** Why this sleeper is not surprised, or null. */
export function asleepImmunityOf(actor, names)
{
  const item = (actor?.items ?? []).find(i => names.has(i.name));
  return item ? `${item.name} — cannot be surprised while asleep` : null;
}

/**
 * Creature rules whose victim GIVES AWAY the party - the Babble Bird's
 * Babbling, "Encounters are never surprised while the babbling is ongoing"
 * (RULED 2026-09-26, Matt: a warning, not a refusal). Read off the victim's
 * board by the rule's name, the way an elixir's retaliation is.
 */
let _giveawayNames = null;
export async function giveawayRuleNames()
{
  if (_giveawayNames) return _giveawayNames;
  const { BESTIARY } = await import("../actor/bestiary-data.js");
  _giveawayNames = new Set((BESTIARY ?? []).flatMap(c => c.rules ?? []).filter(r => r.givesAway).map(r => r.name));
  return _giveawayNames;
}

/**
 * Who does not surprise anyone, and why - the ambushing side's members whose
 * board carries a give-away rule. For the card's warning.
 */
export function giveawaysOf(actors, names)
{
  const out = [];
  for (const actor of actors)
  {
    const entry = entriesOf(actor).find(e => names.has(e.name));
    if (entry) out.push({ name: actor.name, rule: entry.name });
  }
  return out;
}

/**
 * Who the sprung ambush caught, and who it did not.
 *
 * RULED 2026-09-26 (Matt): the ambushers' ADV is against those CAUGHT only,
 * and those NOT CAUGHT - a passed save, an immunity, a Janus sleeper - act in
 * the ambush round too. The book says only "all ambushers make an attack with
 * ADV", so this is the reading. In a night watch every sleeper is caught with
 * the watcher, except a sleeper who cannot be surprised while asleep.
 */
export function caughtLists(spec, tally)
{
  const caught = [], spared = [];
  for (const r of tally.rows)
  {
    if (r.save?.reason === "immune") spared.push({ name: r.name, why: r.immune });
    else if (r.save?.passed === true) spared.push({ name: r.name, why: "saved" });
    else caught.push(r.name);
  }
  for (const s of spec.sleepers ?? [])
  {
    if (s.immune) spared.push({ name: s.name, why: s.immune });
    else caught.push(s.name);
  }
  return { caught, spared };
}

/** The sentence every sprung card ends on, with who was caught. */
export function sprungSentence(spec, tally)
{
  const { caught, spared } = caughtLists(spec, tally);
  return `<p>Caught: ${caught.join(", ") || "nobody"}.`
    + (spared.length ? ` Not caught: ${spared.map(s => `${s.name} (${s.why})`).join(", ")}.` : "")
    + `</p><p>Every ambusher attacks with ADV this round against those caught`
    + `${spared.length ? "; those not caught act this round too" : ""}. Then roll initiative as normal.</p>`;
}

/**
 * Why this actor cannot be ambushed, or null.
 *
 * AN EQUIPPABLE SOURCE MUST BE EQUIPPED. The Ultravisor is a helm — "the
 * wearer has ultravision and can never be blinded or ambushed" — so a visor
 * in a backpack grants nothing. Mutations and implants are part of the body
 * and carry no equip state, which is why the check is conditional on the
 * field existing rather than on the item type: asking `equipped !== false`
 * would be the same test written so that a future equippable type silently
 * opts out.
 */
export function immunityOf(actor, immuneNames)
{
  // A CREATURE'S OWN FLAG COUNTS TOO, and it is checked first. Psyche Leech's
  // Gleam Seeker is the only one in the book, and it arrives as an actor flag
  // rather than an Item because a creature rule is not a carried thing — the
  // same split `ambushFlagOf` makes. Reading only items would have left this
  // atom looking wired while nothing ever consulted it.
  const flag = actor?.flags?.vaarn?.ambush;
  if (flag?.mode === "immune") return flag.rule;

  for (const item of actor?.items ?? [])
  {
    if (!immuneNames.has(item.name)) continue;
    const equippable = item.system?.equipped !== undefined;
    if (equippable && !item.system.equipped) continue;
    return item.name;
  }
  return null;
}

/**
 * Why this actor is ALWAYS surprised, or null - the mirror of immunityOf.
 *
 * The Shriekman's Deafened: "They cannot hear their surroundings and are
 * always surprised by encounters" (Wound-Table Resolution wiring, RULED
 * 2026-09-25 by Matt). The wound Item declares it (named-wound.js), so it
 * ends when the wound is healed. Counted as a FAILED save in the tally, the
 * same way an immune row counts as a pass, and offered rather than imposed:
 * the Referee can still roll the row.
 */
export function exposureOf(actor)
{
  const w = (actor?.items ?? []).find(i => i.type === "wound" && i.flags?.vaarn?.namedWound?.alwaysSurprised);
  return w ? `Wound: ${w.name.replace(/ \(Wound x\d+\)$/, "")}` : null;
}

/**
 * The override a combatant declares as an AMBUSHER, or null.
 *
 * Creature overrides live on the actor rather than on an Item — see
 * `ambushFlagOf` in bestiary-build.js for why. `immune` is not read here: it
 * is a statement about being ambushed, and a Psyche Leech is perfectly able
 * to ambush someone else.
 */
export function ambusherOverride(combatant)
{
  const f = combatant?.actor?.flags?.vaarn?.ambush;
  if (!f) return null;
  if (f.mode === "always" || f.mode === "cannot" || f.mode === "prompt") return f;
  return null;
}

/**
 * Does any ambusher on this side spring it outright?
 *
 * RULED 2026-09-10 (Matt): the whole ambush springs. One always-ambusher
 * carries the side. The book states nothing about a mixed group — an Occulith
 * standing beside two ordinary creatures is not a case it considers — so this
 * is a decision, recorded on the row rather than inferred from the text.
 *
 * `cannot` does NOT veto: Desiccator's "cannot surprise" is about the
 * Desiccator, and a Desiccator shuffling along behind a Subtle Stalker does
 * not stop the Stalker ambushing. It suppresses that creature as a NOMINEE,
 * which is where the dialog applies it.
 */
export function sideOverride(ambushers)
{
  for (const c of ambushers)
  {
    const f = ambusherOverride(c);
    if (f?.mode === "always") return { combatant: c, flag: f };
  }
  return null;
}

/**
 * Who rolls this row — the Referee, or a player?
 *
 * `hasPlayerOwner` and not disposition, deliberately. The question here is
 * literally "is there a human at this table who can roll this", which is an
 * OWNERSHIP fact; a friendly-disposition NPC ally with no player owner is
 * still the Referee's to roll. This is the same signal `sideOf` leads with
 * and for a related reason.
 */
export function isRefereeRolled(combatant)
{
  return !combatant?.actor?.hasPlayerOwner;
}

/* -------------------------------------------- */
/*  Deriving the tally                                                    */
/* -------------------------------------------- */

/**
 * Every save message recorded against one ambush, newest ignored.
 *
 * FIRST RESULT PER TOKEN WINS. A player who double-clicks, or a Referee who
 * rolls a row a player was already rolling, produces two messages; taking the
 * earliest makes that harmless and makes the tally stable — recomputing it
 * later must never produce a different answer from the one already announced.
 */
export function savesFor(ambushId, messages = null)
{
  const all = messages ?? game.messages?.contents ?? [];
  const byUuid = new Map();
  for (const m of all)
  {
    const save = m?.getFlag?.(SCOPE, SAVE_FLAG) ?? m?.flags?.[SCOPE]?.[SAVE_FLAG];
    if (!save || save.ambushId !== ambushId) continue;
    if (!byUuid.has(save.uuid)) byUuid.set(save.uuid, save);
  }
  return byUuid;
}

/**
 * The state of one ambush, derived from its card and the saves recorded
 * against it. Pure, so the offline test can drive it without Foundry.
 */
export function tallyOf(spec, saves)
{
  const rows = (spec?.rows ?? []).map(row => ({
    ...row,
    // AN IMMUNE ROW IS A PASS, NOT AN ABSENCE, and it stays in the group.
    // "More than half the TARGET GROUP fails" counts everyone the ambush is
    // aimed at, so a character who cannot be ambushed raises the bar for the
    // ambushers rather than stepping out of the maths. Dropping them instead
    // would make Heightened Hearing help only its owner, and the book gives
    // no reading in which one PC's sharp ears shrink the party.
    // A REAL SAVE BEATS THE SYNTHETIC ONE. The Referee can roll an immune row
    // anyway (see rowMarkup), and when they do, that result is the answer —
    // otherwise the button would post a roll nothing ever read.
    save: saves.get(row.uuid)
      ?? (row.immune
        ? { uuid: row.uuid, total: null, natural: null, passed: true, reason: "immune" }
        : row.exposed
          ? { uuid: row.uuid, total: null, natural: null, passed: false, reason: "exposed" }
          : null)
  }));
  const rolled = rows.filter(r => r.save);
  const failed = rolled.filter(r => r.save.passed === false).length;

  // An override sprang it, so there is nothing to wait for and nothing to
  // count. Reported as complete so the ordinary resolution path hands out the
  // ambushers' reminders exactly as it would after a majority — one route to
  // springing an ambush, two ways of deciding it did.
  if (spec?.sprungBy)
    return { rows, total: rows.length, rolled: rolled.length, failed,
             passed: rows.length - failed, complete: true, sprung: true,
             byOverride: true };

  const complete = rows.length > 0 && rolled.length === rows.length;
  return {
    rows,
    total: rows.length,
    rolled: rolled.length,
    failed,
    passed: rolled.length - failed,
    complete,
    sprung: complete ? springs(failed, rows.length) : null,
    byOverride: false
  };
}

/* -------------------------------------------- */
/*  The card                                                              */
/* -------------------------------------------- */

function rowMarkup(row, spec, tally)
{
  const save = row.save;
  // IMMUNITY IS OFFERED, NOT IMPOSED, for the same reason the ambusher's
  // override is ticked rather than applied: Psyche Leech's Gleam Seeker only
  // holds against PCs who carry Gleam, and the book leaves that to the table.
  // So the row states the immunity and the Referee can still roll it. An
  // unconditional source (Heightened Hearing) simply never needs the button.
  if (save?.reason === "immune")
    return `<li><b>${row.name}</b> — <span class="vaarn-ambush-pass">cannot be ambushed</span> `
      + `<i class="vaarn-ambush-who">${row.immune}</i> `
      + `<button class="vaarn-ambush-save vaarn-ambush-anyway" `
      + `data-ambush-id="${spec.ambushId}" data-uuid="${row.uuid}">Roll anyway</button></li>`;

  if (save?.reason === "exposed")
    return `<li><b>${row.name}</b> — <span class="vaarn-ambush-fail">always surprised</span> `
      + `<i class="vaarn-ambush-who">${row.exposed}</i> `
      + `<button class="vaarn-ambush-save vaarn-ambush-anyway" `
      + `data-ambush-id="${spec.ambushId}" data-uuid="${row.uuid}">Roll anyway</button></li>`;

  if (save)
  {
    const verdict = save.passed
      ? '<span class="vaarn-ambush-pass">saved</span>'
      : '<span class="vaarn-ambush-fail">failed</span>';
    const why = save.reason === "nat20" ? " (natural 20)"
      : save.reason === "nat1" ? " (natural 1)"
      : "";
    return `<li><b>${row.name}</b> — ${save.total} vs ${spec.targetNumber} — ${verdict}${why}</li>`;
  }

  const who = row.referee ? "Referee" : "player";
  return `<li><b>${row.name}</b> — <button class="vaarn-ambush-save" `
    + `data-ambush-id="${spec.ambushId}" data-uuid="${row.uuid}">Roll PSY Save</button> `
    + `<i class="vaarn-ambush-who">${who}</i></li>`;
}

/**
 * Render the card body from the spec plus whatever saves exist right now.
 *
 * Rebuilt on every render rather than patched in place, because the render is
 * the only thing that can be trusted: a save rolled on another client arrives
 * as a new message and never as an edit to this one.
 */
export function cardContent(spec, tally)
{
  // An override skipped the saves. The roster is still listed, because who
  // was caught still matters, but nothing is rolled and nothing is tallied.
  // Babbling on the ambushing side (RULED 2026-09-26, Matt): a warning the
  // Referee weighs, never a refusal.
  const g = spec.giveaways ?? [];
  const giveaway = g.length
    ? `<p class="vaarn-ambush-override"><b>Warning:</b> ${g.map(x => `${x.name} (${x.rule})`).join(", ")} `
      + `${g.length === 1 ? "is" : "are"} giving the party away — encounters are never surprised while it lasts. `
      + `The Referee decides whether this ambush can spring.</p>`
    : "";

  if (spec.sprungBy)
  {
    const heading = isWatch(spec)
      ? `Night watch — ${spec.ambusherName} reaches the camp unnoticed`
      : `Ambush — ${spec.ambusherName} springs it automatically`;
    return `<div class="vaarn-ambush">`
      + `<p><b>${heading}</b></p>` + giveaway
      + `<p class="vaarn-ambush-override"><b>${spec.sprungBy.rule}:</b> ${spec.sprungBy.text}</p>`
      + `<p>No Saves are rolled.</p>`
      + sprungSentence(spec, tally) + `</div>`;
  }

  const rows = tally.rows.map(r => rowMarkup(r, spec, tally)).join("");

  const outstanding = tally.rows.filter(r => !r.save);
  const refereeLeft = outstanding.filter(r => r.referee).length;
  const batch = refereeLeft > 1
    ? `<p><button class="vaarn-ambush-roll-all" data-ambush-id="${spec.ambushId}">`
      + `Roll all ${refereeLeft} Referee saves</button></p>`
    : "";

  // THE MAJORITY IS NOT NARRATED IN WATCH MODE, though it still decides the
  // outcome. "One failure of one — not more than half" is arithmetically the
  // same sentence and reads as a bug report. The book frames this roll as one
  // person spotting something or not, so the card says that.
  const needed = Math.floor(tally.total / 2) + 1;
  let verdict = isWatch(spec)
    ? `<p><i>Waiting on the watch — a failed Save grants the ambush round.</i></p>`
    : `<p><i>${tally.rolled} of ${tally.total} rolled — `
      + `${needed} failure${needed === 1 ? "" : "s"} springs the ambush.</i></p>`;
  if (tally.complete)
  {
    if (isWatch(spec))
    {
      verdict = tally.sprung
        ? `<p><b>The watch is caught out.</b></p>` + sprungSentence(spec, tally)
        : `<p><b>The watch raises the alarm.</b> `
          + `Nobody is surprised. Roll initiative as normal.</p>`;
    }
    else
    {
      verdict = tally.sprung
        ? `<p><b>The ambush springs.</b> ${tally.failed} of ${tally.total} failed.</p>` + sprungSentence(spec, tally)
        : `<p><b>No ambush.</b> Only ${tally.failed} of ${tally.total} failed — `
          + `not more than half. Roll initiative as normal.</p>`;
    }
  }

  const header = isWatch(spec)
    ? `<p><b>Night watch — ${spec.ambusherName} approaches the camp</b><br>`
      + `<i>The watch makes a PSY Save vs DEX — must exceed <b>${spec.targetNumber}</b></i></p>`
    : `<p><b>Ambush — ${spec.ambusherName} springs it</b><br>`
      + `<i>PSY Save vs DEX — must exceed <b>${spec.targetNumber}</b></i></p>`;

  return `<div class="vaarn-ambush">`
    + header + giveaway
    + `<ul>${rows}</ul>${batch}${verdict}</div>`;
}

/**
 * Post the roster.
 *
 * WHISPERED ONLY WHEN NO PLAYER HAS TO TOUCH IT. A card whose rows the players
 * must click cannot be GM-only, so visibility is decided by the roster rather
 * than by who is ambushing: all-Referee targets (the PCs are ambushing) stay
 * private, and anything a player must roll is public. That is the same
 * origin-led rule the effect board uses, asked of the audience instead.
 */
export async function postAmbushCard({ ambusher, ambushers, targets, sprungBy = null,
                                       mode = MODE.GROUP, sleepers = [] } = {})
{
  const immuneNames = await immuneItemNames();
  const asleepNames = await asleepImmuneNames();
  const giveawayNames = await giveawayRuleNames();
  const spec = {
    ambushId: foundry.utils.randomID(),
    ambusherName: ambusher.name,
    targetNumber: saveTargetFor(ambusher.actor),
    // "group" or "watch". Stored on the card rather than inferred from the
    // row count, because a one-PC party ambushed the ordinary way also posts a
    // single row and is not a night watch.
    mode,
    ambusherUuids: ambushers.map(c => c.actor?.uuid).filter(Boolean),
    // Set when an override sprang this without saves. Carried on the card so
    // the reason survives a reload and is readable afterwards — "it sprang"
    // and "it sprang because the Occulith always surprises" are different
    // things to find in a chat log a week later.
    sprungBy,
    rows: targets.map(c => ({
      uuid: c.actor?.uuid ?? "",
      name: c.name ?? c.actor?.name ?? "Unnamed",
      referee: isRefereeRolled(c),
      immune: immunityOf(c.actor, immuneNames),
      exposed: exposureOf(c.actor)
    })),
    // THE SLEEPERS OF A NIGHT WATCH (2026-09-26). Still asked nothing - the
    // watcher is the one row - but named, because a sprung watch catches them
    // too, except a sleeper who cannot be surprised while asleep (Janus
    // Lenses), who acts in the ambush round.
    sleepers: sleepers.map(c => ({
      name: c.name ?? c.actor?.name ?? "Unnamed",
      immune: immunityOf(c.actor, immuneNames) ?? asleepImmunityOf(c.actor, asleepNames)
    })),
    // Anyone on the AMBUSHING side who gives the party away (Babbling).
    giveaways: giveawaysOf(ambushers.map(c => c.actor).filter(Boolean), giveawayNames)
  };

  const allReferee = spec.rows.every(r => r.referee);
  const tally = tallyOf(spec, new Map());

  return ChatMessage.create({
    content: cardContent(spec, tally),
    whisper: allReferee ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [],
    flags: { [SCOPE]: { [AMBUSH_FLAG]: spec } }
  });
}

/* -------------------------------------------- */
/*  Rolling                                                               */
/* -------------------------------------------- */

/** May this user roll this row? The owner may; the Referee may roll any. */
export function mayRoll(actor)
{
  return game.user.isGM || actor?.isOwner;
}

/**
 * Roll one target's PSY save and record it.
 *
 * The roll message IS the record — see the file header. It carries the flag,
 * so nothing needs write access to the card.
 *
 * Visibility is set as a ROLL MODE and never as `whisper`, because
 * Roll#toMessage ends in ChatMessage.applyRollMode, which overwrites whisper
 * from the mode in force. A whisper array passed here reads correctly and is
 * silently discarded — the bug found in testing 2026-09-08 and documented on
 * the round-reminder button in knave.js.
 */
export async function rollOneSave(spec, row, { gmOnly = false } = {})
{
  const actor = await fromUuid(row.uuid).then(d => d?.actor ?? d).catch(() => null);
  if (!actor)
  {
    ui.notifications.warn(`${row.name} no longer exists.`);
    return null;
  }
  if (!mayRoll(actor))
  {
    ui.notifications.warn(`You do not control ${row.name}.`);
    return null;
  }

  const bonus = abilityBonus(actor, "psy");
  const roll = new Roll(`1d20+${bonus}`);
  await roll.evaluate({ async: true });
  const jinxed = applyJinx(actor, roll);
  const natural = roll.dice[0].total;
  const { passed, reason } = resolveSave(roll.total, natural, spec.targetNumber);

  const why = reason === "nat20" ? " — <b>natural 20 always succeeds</b>"
    : reason === "nat1" ? " — <b>natural 1 always fails</b>"
    : "";

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${jinxed ? JINX_BANNER : ""}<b>PSY Save vs ambush</b> — must exceed ${spec.targetNumber}${why}`,
    flags: { [SCOPE]: { [SAVE_FLAG]: {
      ambushId: spec.ambushId,
      uuid: row.uuid,
      total: roll.total,
      natural,
      passed,
      reason
    } } }
  }, {
    rollMode: gmOnly ? CONST.DICE_ROLL_MODES.PRIVATE : CONST.DICE_ROLL_MODES.PUBLIC
  });

  return { passed, total: roll.total };
}

/**
 * Roll every outstanding Referee row, one after another.
 *
 * AWAITED IN SEQUENCE, NOT FIRED IN PARALLEL. ChatMessage.create is async and
 * a synchronous burst of rolls races its own message creation — the trap
 * CLAUDE.md records from forcing nat-1s, and the reason this is a loop with an
 * await in it rather than a Promise.all.
 */
export async function rollRefereeSaves(spec, tally, { gmOnly = false } = {})
{
  const out = [];
  for (const row of tally.rows)
  {
    if (row.save || !row.referee) continue;
    out.push(await rollOneSave(spec, row, { gmOnly }));
  }
  return out;
}

/* -------------------------------------------- */
/*  The outcome                                                           */
/* -------------------------------------------- */

/**
 * The reminder each ambusher carries through the ambush round.
 *
 * One round, on the board rather than as an Item, because `addEntry` takes an
 * arbitrary actor and needs no document to hang off — which is what lets this
 * reach a Bestiary npc that owns no Item for "being an ambusher".
 *
 * `expiryFor` rather than a hand-stamped round, so this obeys the same
 * "the rest of the round it started in, plus that many full rounds" reading as
 * every other round-scale span. Fired before Begin Combat the current round is
 * 0, so a one-round span expires at round 2 — living through round 1, which is
 * the ambush round. Hand-stamping it would have been one number and a private
 * definition of when a round ends.
 */
export async function remindAmbushers(spec, tally = null)
{
  const round = game.combat?.round ?? null;
  const { expiresAtRound, unit, amount } = expiryFor({ amount: 1, unit: "round", round });
  const made = [];
  // ADV against those CAUGHT only (RULED 2026-09-26, Matt), so the reminder
  // names them.
  const caught = tally ? caughtLists(spec, tally).caught : [];
  const against = caught.length ? ` against ${caught.join(", ")}` : "";

  for (const uuid of spec.ambusherUuids ?? [])
  {
    const actor = await fromUuid(uuid).catch(() => null);
    if (!actor) continue;
    made.push(await addEntry(actor, {
      name: "Ambush round",
      text: `Attacks with ADV this round${against} — the ambush sprang.`,
      startRound: round,
      expiresAtRound, unit, amount
    }));
  }
  return made;
}

/**
 * Announce the result once, and hand out the reminders if it sprang.
 *
 * GUARDED ON `activeGM`, NOT `isGM`. Two Referees logged in both satisfy isGM
 * and both post, which is exactly how every per-round card arrived twice in
 * testing on 2026-09-08. activeGM resolves to one of them.
 */
export async function resolveAmbush(message, spec, tally)
{
  if (game.user !== game.users.activeGM) return null;
  if (!tally.complete) return null;
  if (message.getFlag(SCOPE, "ambushResolved")) return null;

  // Written before the reminders, so a failure partway through cannot leave
  // the card able to resolve a second time and double the entries.
  await message.setFlag(SCOPE, "ambushResolved", true);

  const entries = tally.sprung ? await remindAmbushers(spec, tally) : [];

  const watch = isWatch(spec);
  // Who was caught, and that the rest act too (RULED 2026-09-26, Matt).
  const { caught, spared } = caughtLists(spec, tally);
  const sprungTail = `Every ambusher attacks with ADV this round against ${caught.join(", ") || "nobody"}`
    + `${spared.length ? `; ${spared.map(s => s.name).join(", ")} act${spared.length === 1 ? "s" : ""} this round too` : ""}. `
    + `Initiative is calculated as normal afterwards.`;

  const why = tally.byOverride
    // THE SPACE BELONGS TO THE WATCH BRANCH, not to the join. Splitting the
    // name from the verb with a literal space put one in front of the
    // possessive — "Occulith 's ambush" — from aaaa9b3 (Group 134) until
    // 2026-09-13, on a card the players read, through 18 passing items. A
    // possessive has no space before it and a verb phrase needs one, so the
    // branch carries its own.
    ? `<p><b>${spec.ambusherName}${watch ? " reaches the camp unnoticed" : "'s ambush springs automatically"}.</b> `
      + `${spec.sprungBy.rule} — no Saves were rolled. ${sprungTail}</p>`
    : watch
      ? tally.sprung
        ? `<p><b>${spec.ambusherName} catches the camp unawares.</b> The watch `
          + `failed its Save. ${sprungTail}</p>`
        : `<p><b>${spec.ambusherName} is spotted.</b> The watch passed its Save, `
          + `so nobody is surprised. Roll initiative as normal.</p>`
      : tally.sprung
        ? `<p><b>${spec.ambusherName}'s ambush springs.</b> ${tally.failed} of `
          + `${tally.total} failed the save. ${sprungTail}</p>`
        : `<p><b>${spec.ambusherName}'s ambush fails.</b> Only ${tally.failed} of `
          + `${tally.total} failed the save, which is not more than half. Roll `
          + `initiative as normal.</p>`;

  await ChatMessage.create({
    content: why,
    whisper: message.whisper?.length ? [...message.whisper] : []
  });

  return entries;
}

/* -------------------------------------------- */
/*  Wiring                                                                */
/* -------------------------------------------- */

/**
 * The dialog. Nominating the ambusher is the first decision and usually the
 * only one, because it carries both facts the group rule needs: whose DEX sets
 * the number, and therefore which side is ambushing.
 *
 * Night watch adds the second. The side is still read off the nominee, but the
 * book asks only the watcher to Save, so the Referee must say who that is —
 * there is nothing in world state to read it from. Whether a character stood
 * watch is a transient checkbox on their Long Rest (rest.js) and is not
 * persisted anywhere, and RULED 2026-09-13 (Matt) it stays that way: the
 * dialog asks. A watch can happen without anyone having pressed Long Rest.
 *
 * The number is shown and editable. It is computed from the nominee's DEX, but
 * the Referee can overwrite it — Matt asked to "input a target to beat", and a
 * creature whose stat block is not in the pack still needs a number.
 */
export async function openAmbushDialog()
{
  const combat = game.combat;
  const combatants = combat?.combatants?.contents ?? [];
  if (combatants.length < 2)
  {
    ui.notifications.warn("Add the tokens to the encounter before resolving an ambush.");
    return null;
  }

  const options = combatants
    .filter(c => c.actor && sideOf(c) !== SIDE.BYSTANDER)
    .map(c => {
      const o = ambusherOverride(c);
      const tag = o?.mode === "always" ? " — always ambushes"
        : o?.mode === "cannot" ? " — cannot surprise"
        : o?.mode === "prompt" ? " — see rule" : "";
      return `<option value="${c.id}" data-dex="${saveTargetFor(c.actor)}" `
        + `data-mode="${o?.mode ?? ""}" data-rule="${o ? escapeAttr(o.rule) : ""}" `
        + `data-text="${o ? escapeAttr(o.text) : ""}" `
        + `data-unless="${o ? escapeAttr(o.unless) : ""}">`
        + `${c.name} (DEX save target ${saveTargetFor(c.actor)})${tag}</option>`;
    })
    .join("");

  if (!options)
  {
    ui.notifications.warn("No combatant in this encounter can spring an ambush.");
    return null;
  }

  return new Promise(resolve =>
  {
    new Dialog({
      title: "Spring an Ambush",
      content: `<form>
        <p class="vaarn-ambush-blurb"></p>
        <div class="form-group"><label>Ambusher</label>
          <select name="ambusher">${options}</select></div>
        <div class="form-group"><label>
          <input type="checkbox" name="watch"/>
          Night watch — one watcher Saves, not the whole party</label></div>
        <div class="form-group vaarn-ambush-watcher" hidden><label>On watch</label>
          <select name="watcher"></select></div>
        <div class="form-group"><label>Save target (must be exceeded)</label>
          <input type="number" name="target" value=""/></div>
        <div class="form-group"><label>
          <input type="checkbox" name="spring"/>
          Skip the Saves — the ambush springs automatically</label></div>
        <div class="vaarn-ambush-rule" hidden></div>
      </form>`,
      buttons: {
        go: {
          label: "Post roster",
          callback: async html =>
          {
            const id = html.find('[name="ambusher"]').val();
            const ambusher = combat.combatants.get(id);
            if (!ambusher) return resolve(null);

            let { ambushers, targets } = splitSides(combatants, sideOf(ambusher));
            if (!targets.length)
            {
              ui.notifications.warn(
                `Nobody opposes ${ambusher.name} in this encounter — there is no one to ambush.`);
              return resolve(null);
            }

            // NARROWED AFTER THE EMPTY-SIDE GUARD, not instead of it. "Nobody
            // opposes this creature" and "you did not say who was awake" are
            // different mistakes and want different sentences.
            const watch = html.find('[name="watch"]').is(":checked");
            let sleepers = [];
            if (watch)
            {
              const watcherId = html.find('[name="watcher"]').val();
              const watcher = targets.find(c => c.id === watcherId);
              if (!watcher)
              {
                ui.notifications.warn(
                  "Choose which character is on watch, or untick Night watch.");
                return resolve(null);
              }
              sleepers = targets.filter(c => c.id !== watcherId);
              targets = [watcher];
            }

            const override = ambusherOverride(ambusher);
            // The refusal box only exists for a "cannot" nominee. Named
            // separately from the skip since 2026-09-13, when the skip became
            // permanent — one checkbox cannot mean both "spring it anyway" and
            // "do not post this at all".
            const refused = html.find('[name="override"]').is(":checked");

            // "Cannot surprise" is a refusal, not an outcome — the Referee
            // picked the wrong nominee and the fix is to pick another, not to
            // post a roster that cannot be won.
            if (override?.mode === "cannot" && refused)
            {
              ui.notifications.warn(
                `${ambusher.name} cannot surprise — ${override.rule}. Nominate a different ambusher.`);
              return resolve(null);
            }

            // THE SKIP IS ALWAYS OFFERED (Matt 2026-09-13). It used to exist
            // only when the nominee carried an `always` flag, which made every
            // other automatic surprise unreachable — and the book has plenty
            // that no creature flag can express, darkness being the one that
            // raised it: "encounters always surprise the party" is a property
            // of the party's situation, not of the creature.
            //
            // WHICH REASON GETS QUOTED depends on where the skip came from,
            // and both end up in the same `sprungBy` so the card and the
            // resolution keep one path. A flagged creature quotes the book at
            // the table, exactly as before. A manual tick says it was the
            // Referee's call, which is honest — there is no rule to cite,
            // because the Referee is applying one the code cannot see.
            const springTicked = html.find('[name="spring"]').is(":checked");
            const sprungBy = springTicked
              ? (override?.mode === "always"
                  ? { rule: override.rule, text: override.text, by: ambusher.name }
                  : { rule: "Referee's call",
                      text: "The targets are surprised.", by: ambusher.name })
              : null;

            const typed = Number(html.find('[name="target"]').val());
            const card = await postAmbushCard({ ambusher, ambushers, targets, sprungBy,
                                                mode: watch ? MODE.WATCH : MODE.GROUP, sleepers });

            // An override card has no saves to wait for, so nothing will ever
            // arrive to trigger the createChatMessage path that resolves an
            // ordinary ambush. Resolve it here instead — same function, so the
            // reminders and the announcement come from one place either way.
            if (sprungBy)
            {
              const spec = card.getFlag(SCOPE, AMBUSH_FLAG);
              await resolveAmbush(card, spec, tallyOf(spec, new Map()));
              return resolve(card);
            }
            if (Number.isFinite(typed) && typed > 0
              && typed !== saveTargetFor(ambusher.actor))
            {
              // Overwriting the stored spec rather than pre-empting the post
              // keeps one path building the card.
              const spec = card.getFlag(SCOPE, AMBUSH_FLAG);
              await card.setFlag(SCOPE, AMBUSH_FLAG, { ...spec, targetNumber: typed });
            }
            resolve(card);
          }
        },
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "go",
      render: html =>
      {
        const sel = html.find('[name="ambusher"]');
        const panel = html.find(".vaarn-ambush-rule");
        const watchBox = html.find('[name="watch"]');
        const watcherRow = html.find(".vaarn-ambush-watcher");
        const watcherSel = html.find('[name="watcher"]');
        const blurb = html.find(".vaarn-ambush-blurb");
        const springBox = html.find('[name="spring"]');

        // The blurb is rendered rather than written into the template because
        // the two modes describe different rules, and a dialog that keeps the
        // group sentence while asking for one watcher is how a Referee ends up
        // rolling the wrong thing.
        const syncWatch = () =>
        {
          const on = watchBox.is(":checked");
          blurb.text(on
            ? "The character on watch makes a PSY Save against the creature's "
              + "DEX. Failure grants the aggressor an ambush round. The rest "
              + "of the party is asleep and does not roll."
            : "All targets make a PSY Save against the ambusher's DEX. More "
              + "than half must fail for the ambush to spring.");
          if (on) watcherRow.removeAttr("hidden");
          else watcherRow.attr("hidden", "hidden");
        };

        const sync = () =>
        {
          const opt = sel.find("option:selected");
          html.find('[name="target"]').val(opt.data("dex"));

          // WHO CAN BE ON WATCH DEPENDS ON THE NOMINEE, because the nominee is
          // what decides which side is being ambushed — the same fact the
          // roster is built from. So the list is rebuilt when the ambusher
          // changes rather than filled once at render, and a selection that
          // survives the rebuild is kept so re-picking the creature does not
          // silently reset the watcher.
          const chosen = combat.combatants.get(sel.val());
          const opposing = chosen ? splitSides(combatants, sideOf(chosen)).targets : [];
          const keep = watcherSel.val();
          watcherSel.html(opposing
            .map(c => `<option value="${c.id}">${escapeAttr(c.name)}</option>`)
            .join(""));
          if (opposing.some(c => c.id === keep)) watcherSel.val(keep);

          const mode = opt.attr("data-mode") || "";
          const rule = opt.attr("data-rule") || "";
          const text = opt.attr("data-text") || "";
          const unless = opt.attr("data-unless") || "";

          // PRESELECT, THE REFEREE CONFIRMS — unchanged, but now expressed by
          // ticking the permanent box rather than by conjuring one. An
          // "always" nominee arrives ticked; anything else arrives unticked
          // and the Referee may tick it themselves. Written on every pass,
          // including the no-flag case, so re-picking a nominee cannot leave
          // the previous creature's tick behind.
          springBox.prop("checked", mode === "always");

          if (!mode) { panel.attr("hidden", "hidden").empty(); return; }

          // "cannot" still gets its own box, and it is NOT the skip. It is the
          // opposite question — the creature is the wrong nominee rather than
          // an automatic winner — so merging the two would ask one checkbox to
          // mean both. "prompt" offers no box at all: Planeyfolk states a PSY
          // Save to identify them as living BEFORE any ambush, and nothing
          // here should decide that.
          const box = mode === "cannot"
            ? '<label><input type="checkbox" name="override" checked/> '
              + 'This creature cannot surprise — do not post a roster</label>'
            : "";
          const caveat = unless
            ? `<p class="vaarn-ambush-unless">Untick if <b>${unless}</b>.</p>`
            : "";
          panel.removeAttr("hidden").html(
            `<p class="vaarn-ambush-override"><b>${rule}:</b> ${text}</p>${caveat}${box}`);
        };
        sel.change(sync);
        watchBox.change(syncWatch);
        sync();
        syncWatch();
      }
    }).render(true);
  });
}

/**
 * The way in: a control on the combat tracker, because the ambush round sits
 * immediately before initiative and the tracker is what already holds the two
 * sides. The roster is the combatant list, which is also the subset control —
 * a PC who is not in the scene is simply not added, and is never asked to save
 * (Matt, 2026-09-10).
 */
export function registerAmbushControls()
{
  Hooks.on("renderCombatTracker", (app, html) =>
  {
    if (!game.user.isGM) return;
    if (!game.combat) return;
    if (html.find(".vaarn-ambush-open").length) return;

    const header = html.find("#combat-round, .combat-tracker-header").first();
    if (!header.length) return;

    const button = $(`<a class="vaarn-ambush-open" title="Spring an Ambush or Night Watch">`
      + `<i class="fas fa-user-ninja"></i></a>`);
    button.click(() => openAmbushDialog());
    header.find(".encounters, .encounter-controls").first().append(button);
    if (!button.parent().length) header.append(button);
  });
}

/**
 * Bind the roster's buttons, and rebuild the roster from derived state on
 * every render.
 *
 * THE REBUILD IS NOT COSMETIC. Nothing edits this card when a save lands, so
 * the rows as posted are only ever correct at the instant of posting. The
 * render is where the card and reality are reconciled, which is why the
 * content is regenerated here rather than patched.
 */
export function registerAmbushCardButtons()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    const spec = message.getFlag(SCOPE, AMBUSH_FLAG);
    if (!spec) return;

    const tally = tallyOf(spec, savesFor(spec.ambushId));
    const gmOnly = !!message.whisper?.length;
    html.find(".vaarn-ambush").replaceWith(cardContent(spec, tally));

    html.find(".vaarn-ambush-save").click(async ev =>
    {
      const uuid = ev.currentTarget.dataset.uuid;
      const fresh = tallyOf(spec, savesFor(spec.ambushId));
      const row = fresh.rows.find(r => r.uuid === uuid);
      // Re-derived rather than closed over, because another client may have
      // rolled this row since the render that bound this handler.
      if (!row) return;
      // An immune row carries a synthetic save, so "already has one" would
      // block the Roll-anyway button it deliberately offers. Only a REAL
      // recorded save stops a re-roll.
      if (row.save && row.save.reason !== "immune" && row.save.reason !== "exposed") return;
      if (row.save?.reason === "immune" && !game.user.isGM)
        return ui.notifications.warn(
          `${row.name} cannot be ambushed (${row.immune}). Only the Referee can override that.`);
      if (row.save?.reason === "exposed" && !game.user.isGM)
        return ui.notifications.warn(
          `${row.name} is always surprised (${row.exposed}). Only the Referee can override that.`);
      await rollOneSave(spec, row, { gmOnly });
    });

    html.find(".vaarn-ambush-roll-all").click(async () =>
    {
      if (!game.user.isGM)
        return ui.notifications.warn("Only the Referee can roll the Referee's saves.");
      await rollRefereeSaves(spec, tallyOf(spec, savesFor(spec.ambushId)), { gmOnly });
    });
  });

  // A save landing anywhere re-renders its card, so every client's roster
  // updates without anyone needing write access to the card itself.
  Hooks.on("createChatMessage", async message =>
  {
    const save = message.getFlag(SCOPE, SAVE_FLAG);
    if (!save?.ambushId) return;

    const card = game.messages.contents.find(
      m => m.getFlag(SCOPE, AMBUSH_FLAG)?.ambushId === save.ambushId);
    if (!card) return;

    ui.chat?.updateMessage?.(card);

    const spec = card.getFlag(SCOPE, AMBUSH_FLAG);
    await resolveAmbush(card, spec, tallyOf(spec, savesFor(spec.ambushId)));
  });
}
