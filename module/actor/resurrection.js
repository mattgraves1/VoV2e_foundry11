/**
 * Resurrection Options (foundry-system-index.csv "Resurrection Options").
 *
 * Miscellany/Resurrection and Death: the routes back for a dead PC. The
 * Referee picks a character and a route in the Resurrect Character macro, and
 * this applies the route's stated mechanics. Rulings 2026-09-27 (Matt) are on
 * the atom rows under the Book System "Resurrection and Death".
 *
 * NO DEAD STATE. Nothing in this system kills an actor - every death surface
 * posts a card and changes nothing (fatality.js) - so nothing here checks that
 * the character is dead, and nothing here hooks a death. The Referee says who
 * is dead; this says what the route does to them.
 *
 * THE ROUTES, and where the body goes:
 *   - Mycomorph Spores: the SAME Actor, transformed into a Mycomorph. INT save;
 *     on failure the corpse's stats do not change, the spores take it over, so
 *     the character is taken to Level 1 through Referee-Invoked Level Loss with
 *     the XP wiped rather than rerolled.
 *   - Necrotech: the SAME Actor, Synthetic ticked on, Biological kept. The book
 *     states nothing else. Phoenix Core is the named means.
 *   - Pseudo-Wombs: the SAME Actor (Matt: the party hands the clone its gear in
 *     play; a second Actor only adds a transfer). CON save; on failure two new
 *     mutations under the Cacogen rules item-effects.js already enforces on
 *     creation (a duplicate is rerolled here; the unarmed contradiction is
 *     resolved there, later wins).
 *   - Returning as a Spirit: the book's d20 + Level roll; 16 or more spawns
 *     the Unquiet Spirit from the Bestiary as "Spirit of <PC>" (spirit.js,
 *     Spirit Form). Any creature type. The dead PC's Actor is left as it is.
 *   - Ego-Engine Transplants: a NEW Actor (Matt: the body is discarded, so
 *     nothing but the mind survives) - a Level 1 Synth built the way the
 *     character creator builds one, with INT, PSY and EGO, the name, the
 *     personality spark and the Mystic Gifts carried over. Every Item and
 *     wound stays on the dead Actor for the party to move. Refused when the
 *     dead Synth carries the Ego-Engine Destroyed wound.
 *
 * NO TIMERS. The d4 and seven days are numbers on the card.
 *
 * TABLE-LOOKUP ROLLS use a plain die, as chargen-app.js does for the same
 * tables. The SAVES roll through card-save.js so they honour ADV, DIS, the
 * Jinx and the failed-save consequences like every other save.
 */

import { SPARK_TABLES, ANCESTRY_CREATURE_TYPES } from "./chargen-data.js";
import { ANCESTRY_RULE_ITEMS, ANCESTRY_GM_REMINDERS } from "./ancestry-rules-data.js";
import { ancestryRuleItemData, rollAbilityBonus, rollStartingHP, normalizeDamageDice, UNARMED_STRIKE } from "./chargen-app.js";
import { MUTATION_TABLE } from "./mutation-data.js";
import { mutationItemData, mutationByRoll } from "./granted-pick.js";
import { rollCardSave } from "../combat/card-save.js";
import { healWound } from "./rest.js";
import { loseLevels } from "./advancement.js";
import { entriesOf, setEntries, removeEntry } from "../time/effect-board.js";
import { recurrenceByKey } from "../time/recurrence-data.js";
import { isGmReminder, writeAncestryReminders } from "../time/gm-reminder.js";
import { spiritRoll, spawnSpirit, SPIRIT_TARGET } from "./spirit.js";

const d = n => Math.floor(Math.random() * n) + 1;
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** What the Referee can pick. `needs` is the creature type the book names. */
export const ROUTES = {
  spores:    { label: "Mycomorph Spores", needs: "biological", built: true,
               blurb: "Reborn as a mycomorph within d4 days. INT save to recall who they were; on failure, Level 1." },
  necrotech: { label: "Necrotech (Phoenix Core, Lazarus implants)", needs: "biological", built: true,
               blurb: "Resurrected by necrotech: now a Synthetic creature as well." },
  womb:      { label: "Pseudo-Womb clone", needs: "biological", built: true,
               blurb: "A clone in seven days. CON save; on failure, two new mutations." },
  spirit:    { label: "Returning as a Spirit", needs: null, built: true,
               blurb: "d20 + Level, 16 or more to become an unquiet spirit." },
  egoEngine: { label: "Ego-Engine Transplant", needs: "synthetic", built: true,
               blurb: "A new synthetic body at Level 1; INT, PSY and EGO kept." },
};

/** Why this route cannot be run on this actor, or null when it can. */
export function refusal(actor, key)
{
  const route = ROUTES[key];
  if(!route) return "No such route.";
  if(!actor || actor.type !== "character") return "Only a character can be resurrected here.";
  if(!route.built) return `${route.label} is not built yet.`;
  const types = actor.system.creatureTypes ?? {};
  if(route.needs === "biological" && !types.biological)
    return `${route.label} works only on a biological creature; ${actor.name} is not one.`;
  if(route.needs === "synthetic" && !types.synthetic)
    return `${route.label} works only on a synth; ${actor.name} is not one.`;
  return null;
}

/** Run a route. Posts its card. Returns what it did, for the caller and tests. */
/**
 * THE SAME-SHEET ROUTES OFFER A CLEAN-UP (RULED 2026-09-27, Matt): Spores,
 * Necrotech and Pseudo-Womb bring the character back on the sheet they died
 * on, so the macro offers "Remove all wounds" and "Heal all ability damage"
 * for each, "for maximum GM flexibility". Defaults are Matt's first instinct:
 * wounds off for Necrotech only, ability damage on for all three. The two
 * routes that make a new body (Spirit, Ego-Engine) leave the old sheet alone.
 */
export const SAME_SHEET = {
  spores:    { wounds: true,  abilityDamage: true, board: true },
  necrotech: { wounds: false, abilityDamage: true, board: false },
  womb:      { wounds: true,  abilityDamage: true, board: true }
};

/**
 * Heal every wound the way the Wounds tab's trash icon does (rest.js healWound:
 * the entry, its slot Item, a Deprived it set) and/or zero every ability's
 * wound damage. Returns card lines, empty when nothing changed.
 */
async function cleanUp(actor, { wounds = false, abilityDamage = false, board = false } = {})
{
  const lines = [];
  if(wounds)
  {
    const names = [];
    while((actor.system.wounds ?? []).length)
    {
      const w = await healWound(actor, 0);
      if(!w) break;
      names.push(w.name);
    }
    if(names.length) lines.push(`<p>Wounds removed: ${names.map(esc).join(", ")}.</p>`);
    // A recurrence that exists only to fade a wound - Deathblight's day,
    // Flab's week - ends with it (RULED 2026-09-27, Matt: "yes").
    const faders = entriesOf(actor).filter(e => e.kind === "recurrence"
      && names.includes(recurrenceByKey(e.recurrenceKey)?.consumesWound?.name));
    for(const e of faders) await removeEntry(actor, e.id);
    if(faders.length) lines.push(`<p>Ended with them: ${faders.map(e => esc(e.name)).join(", ")}.</p>`);
  }
  // EVERYTHING ON THIS CHARACTER'S ACTIVE EFFECTS BOARD (RULED 2026-09-27,
  // Matt), ended the way the board's own end control does (removeEntry, which
  // undoes what the entry applied). GM reminders stay: they are notes tied to
  // the character's items and ancestry, not effects on the character.
  if(board)
  {
    const ended = entriesOf(actor).filter(e => !isGmReminder(e));
    for(const e of ended) await removeEntry(actor, e.id);
    if(ended.length) lines.push(`<p>Ended on the Active Effects board: ${ended.map(e => esc(e.name)).join(", ")}.</p>`);
  }
  if(abilityDamage)
  {
    const update = {}, healed = [];
    for(const [key, a] of Object.entries(actor.system.abilities ?? {}))
      if(Number(a.woundDamage) > 0) { update[`system.abilities.${key}.woundDamage`] = 0; healed.push(`${key.toUpperCase()} ${a.woundDamage}`); }
    if(healed.length)
    {
      await actor.update(update);
      lines.push(`<p>Ability damage healed: ${healed.join(", ")}.</p>`);
    }
  }
  return lines.join("");
}

export async function resurrect(actor, key, opts = {})
{
  const why = refusal(actor, key);
  if(why) { ui.notifications?.warn(why); return { refused: why }; }
  const clean = SAME_SHEET[key] ? { ...SAME_SHEET[key], ...opts } : null;
  switch(key)
  {
    case "spores":    return mycomorphSpores(actor, clean);
    case "necrotech": return necrotech(actor, clean);
    case "womb":      return pseudoWomb(actor, clean);
    case "spirit":    return returnAsSpirit(actor);
    case "egoEngine": return egoEngineTransplant(actor);
  }
  return { refused: "unreachable" };
}

function card(actor, title, body)
{
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="vaarn-chat-card"><h3>${esc(title)}</h3>${body}</div>`
  });
}

/* -------------------------------------------- */
/*  Returning as a Spirit                         */
/* -------------------------------------------- */

async function returnAsSpirit(actor)
{
  const r = await spiritRoll(actor);
  if(!r.success)
  {
    await card(actor, `Returning as a Spirit: ${actor.name} fails`,
      `<p><b>${esc(actor.name)}</b> rolled <b>${r.total}</b> against ${SPIRIT_TARGET}: their Blue and Golden Souls could not be marshalled, and they do not return as a spirit.</p>`);
    return { route: "spirit", success: false, total: r.total };
  }
  const spirit = await spawnSpirit(actor);
  if(!spirit)
  {
    await card(actor, `Returning as a Spirit: ${actor.name}`,
      `<p>Rolled <b>${r.total}</b> against ${SPIRIT_TARGET}, but the <b>Unquiet Spirit</b> is not in the Bestiary compendium. Sync the Bestiary and run the route again.</p>`);
    return { route: "spirit", success: true, total: r.total, spawned: false };
  }
  await card(actor, `Returning as a Spirit: ${actor.name} returns`,
    `<p><b>${esc(actor.name)}</b> rolled <b>${r.total}</b> against ${SPIRIT_TARGET} and becomes an unquiet spirit: <b>${esc(spirit.name)}</b>, Level ${spirit.system.level.value}, ` +
    `${spirit.system.health.max} HP, owned by the same player.</p>` +
    `<p>Incorporeal: seen as a luminous golden-blue projection, passing through walls. Its sheet carries <b>Manipulate Object</b> (spend d6 HP), ` +
    `<b>Possess</b> (spend d6 + the target's Level HP, for one Exploration Turn) and <b>Long Rest</b> (HP to full at sunrise, no rations). At 0 HP it fades until sunrise.</p>`);
  spirit.sheet?.render(true);
  return { route: "spirit", success: true, total: r.total, spawned: true, spiritId: spirit.id };
}

/* -------------------------------------------- */
/*  Ego-Engine Transplants                        */
/* -------------------------------------------- */

const EGO_ENGINE_DESTROYED = "Ego-Engine Destroyed";

/**
 * Why a Synth cannot be transplanted, or null. The wound row's own text
 * decides it: General Systems Failure says the engine "can be installed in a
 * new shell", Ego-Engine Destroyed says it "cannot be rebooted".
 */
export function egoEngineRefusal(actor)
{
  // The Wounds list, where a death that happened is recorded (0 slots, so no
  // Item - actor-sheet.js _applyWound, RULED 2026-09-27). The Item check stays
  // for a wound Item a GM made by hand.
  if((actor?.system?.wounds ?? []).some(w => w.name === EGO_ENGINE_DESTROYED)
     || actor?.items?.some(i => i.type === "wound" && i.name === EGO_ENGINE_DESTROYED))
    return `${actor.name}'s ego-engine is destroyed (the ${EGO_ENGINE_DESTROYED} wound): it cannot be rebooted.`;
  return null;
}

/**
 * The new body's Actor data, built the way chargen-app.js builds a Level 1
 * Synth: STR, DEX and CON from rollAbilityBonus, HP from rollStartingHP, the
 * Synth ancestry with its rule Items, a fresh appearance spark, the base
 * Unarmed Strike. Carried from the dead Synth: INT, PSY and EGO as they stand,
 * the name, the personality spark, the Mystic Gifts. Nothing else - no gear,
 * no implants, no wounds, no XP.
 */
export function transplantData(dead)
{
  const rolled = {};
  const abilities = {};
  for(const key of ["str", "dex", "con"])
  {
    rolled[key] = rollAbilityBonus();
    abilities[key] = { value: rolled[key].bonus, max: 10, woundDamage: 0 };
  }
  for(const key of ["int", "psy", "ego"])
    abilities[key] = { value: Number(dead.system.abilities?.[key]?.value ?? 0), max: 10, woundDamage: 0 };

  const hp = rollStartingHP("Synth");

  const tables = SPARK_TABLES["Synth"];
  const appearance = tables.appearance;
  const spark = (dead.system.spark ?? []).filter(s => s.group === "personality").map(s => ({ ...s }));
  appearance.columns.forEach((col, ci) => spark.push({ group: "appearance", label: col, value: appearance.rows[d(20) - 1][ci] }));

  const creatureTypes = { biological: false, synthetic: false, psychic: false, fungal: false, mineral: false, hypergeometric: false, outsider: false };
  for(const flag of ANCESTRY_CREATURE_TYPES["Synth"] ?? []) creatureTypes[flag] = true;
  // A Gifted character is Psychic, as chargen leaves them.
  const gifts = dead.items.filter(i => i.type === "gift").map(i => { const o = i.toObject(); delete o._id; return o; });
  if(gifts.length && dead.system.creatureTypes?.psychic) creatureTypes.psychic = true;

  const items = [
    ...(ANCESTRY_RULE_ITEMS["Synth"] ?? []).map(def => ancestryRuleItemData("Synth", def, {})),
    {
      name: UNARMED_STRIKE.name, type: "weaponMelee",
      system: { slots: 0, equipped: true, hands: 0, intrinsic: true,
                damageDice: normalizeDamageDice(UNARMED_STRIKE.damage),
                description: `<p>Your bare hands. ${UNARMED_STRIKE.note}</p>` }
    },
    ...gifts,
  ];

  return {
    rolled, hp,
    doc: {
      name: dead.name, type: "character",
      ownership: foundry.utils.deepClone(dead.ownership ?? {}),
      system: {
        health: { value: hp.max, max: hp.max },
        abilities, creatureTypes, spark,
        biography: "",
        ancestry: "Synth",
        noHealRule: SPARK_TABLES["Synth"]?.no_heal_rule || "",
        xp: { value: 0 },
        level: { value: 1 },
      },
      items,
    }
  };
}

async function egoEngineTransplant(dead)
{
  const why = egoEngineRefusal(dead);
  if(why) { ui.notifications?.warn(why); await card(dead, `Ego-Engine Transplant: refused`, `<p>${esc(why)}</p>`); return { route: "egoEngine", refused: why }; }

  const t = transplantData(dead);
  const actor = await Actor.create(t.doc);
  await writeAncestryReminders(actor, ANCESTRY_GM_REMINDERS["Synth"]);

  const r = k => `${k.toUpperCase()} [${t.rolled[k].dice.join(", ")}] → +${t.rolled[k].bonus}`;
  const gifts = actor.items.filter(i => i.type === "gift").map(i => esc(i.name));
  await card(actor, `Ego-Engine Transplant: ${dead.name} is rebooted`,
    `<p>The ego-engine of <b>${esc(dead.name)}</b> is extracted and inserted into a new synthetic body. A new Level 1 <b>Synth</b> Actor of the same name, owned by the same player.</p>` +
    `<p><b>Rerolled</b> (3d6, lowest die): ${["str", "dex", "con"].map(r).join("; ")}. <b>HP</b> ${t.hp.formula} = ${t.hp.max}. XP 0.</p>` +
    `<p><b>Retained:</b> INT +${actor.system.abilities.int.value}, PSY +${actor.system.abilities.psy.value}, EGO +${actor.system.abilities.ego.value}; the personality spark` +
    (gifts.length ? `; Mystic Gifts ${gifts.join(", ")}` : "") + `.</p>` +
    `<p><i>Every Item and wound stays on the old body's sheet. Move what the party recovered across with the item transfer.</i></p>`);
  actor.sheet?.render(true);
  return { route: "egoEngine", actorId: actor.id, rolled: t.rolled, hp: t.hp.max, gifts: gifts.length };
}

/* -------------------------------------------- */
/*  Necrotech                                     */
/* -------------------------------------------- */

async function necrotech(actor, clean)
{
  await actor.update({ "system.creatureTypes.synthetic": true });
  const cleaned = await cleanUp(actor, clean);
  await card(actor, `Necrotech: ${actor.name} returns`,
    `<p><b>${esc(actor.name)}</b> is resurrected by necrotech and is now a <b>Synthetic</b> creature as well as a Biological one.</p>` +
    `<p><i>Necrotech usually comes with severe downsides: it may restore the mind but fail to prevent the decay of the flesh, ` +
    `or restore the flesh but fail to prevent the slow decay of the mind. The Referee decides which.</i></p>` + cleaned);
  return { route: "necrotech" };
}

/* -------------------------------------------- */
/*  Pseudo-Wombs                                  */
/* -------------------------------------------- */

/**
 * The d100 rolls this actor's mutations already occupy, so a new roll cannot
 * land on one of them (the character creator's no-duplicates rule). A ranged
 * entry occupies its whole range.
 */
function occupiedRolls(actor)
{
  const used = new Set();
  for(const item of actor.items.filter(i => i.type === "mutation"))
  {
    const entry = MUTATION_TABLE.find(m => m.name === item.name);
    const roll = entry?.roll ?? item.system?.roll;
    if(Array.isArray(roll)) for(let r = roll[0]; r <= roll[1]; r++) used.add(r);
    else if(Number.isFinite(Number(roll))) used.add(Number(roll));
  }
  return used;
}

/**
 * Roll `count` new mutations onto the actor, one Item at a time so
 * item-effects.js's creation hooks see each land in order: the bake applies
 * each one's bonuses, and supersedeUnarmedReplacers lets the later of two
 * unarmed replacers win over the earlier, existing mutations included.
 * Extra Eyes' d3 is rolled by the same hook.
 */
export async function rollNewMutations(actor, count)
{
  const used = occupiedRolls(actor);
  const granted = [];
  for(let i = 0; i < count; i++)
  {
    let roll, entry, guard = 0;
    do { roll = d(100); entry = mutationByRoll(roll); }
    while((used.has(roll) || !entry) && ++guard < 500);
    if(!entry) break;
    const span = Array.isArray(entry.roll) ? entry.roll : [entry.roll, entry.roll];
    for(let r = span[0]; r <= span[1]; r++) used.add(r);
    await actor.createEmbeddedDocuments("Item", [mutationItemData(entry)]);
    granted.push({ roll, name: entry.name, effect: entry.effect });
  }
  return granted;
}

async function pseudoWomb(actor, clean)
{
  const save = await rollCardSave(actor, { ability: "con", label: "Pseudo-Womb clone" });
  let body = `<p>A pseudo-womb vat incubates a copy of <b>${esc(actor.name)}</b> over <b>seven days</b>.</p>`;
  let granted = [];
  if(save.verdict.passed)
    body += `<p>CON save <b>passed</b>: the clone is exactly like the original.</p>`;
  else
  {
    granted = await rollNewMutations(actor, 2);
    body += `<p>CON save <b>failed</b>: the cloning process has gone awry. Two new mutations:</p><ul>` +
      granted.map(g => `<li><b>${esc(g.name)}</b> (d100 ${g.roll}) — ${esc(g.effect)}</li>`).join("") + `</ul>` +
      `<p><i>Rolled under the character creator's rules: a duplicate is rerolled, and if two mutations both redefine the unarmed attack the later one wins and the earlier is removed.</i></p>`;
  }
  body += await cleanUp(actor, clean);
  await card(actor, `Pseudo-Womb: ${actor.name} is cloned`, body);
  return { route: "womb", passed: save.verdict.passed, granted };
}

/* -------------------------------------------- */
/*  Mycomorph Spores                              */
/* -------------------------------------------- */

const ANCESTRY_WEAPON_BACKLINK = /Natural weapon from the <b>[^<]+<\/b> ancestry rule/;

/**
 * Turn the actor into a Mycomorph, exactly as the character creator would
 * build one - the same creature types, the same three rule Items, spark rolls
 * from the same tables, the same spore roll - with two differences RULED
 * 2026-09-27 (Matt): Twice Born's variant is "<original ancestry> Adventurer"
 * rather than the rolled corpse column, and the character keeps their name, so
 * the personality table's Name column is rolled with the row but not stored.
 *
 * Everything the OLD ancestry put on the sheet goes: its rule Items, the
 * natural-weapon Items those rules created (matched on the backlink
 * chargen-app.js writes into the weapon's description), its spark descriptors
 * and its Referee reminders on the board. Mutations, Items, Gifts, HP,
 * abilities, Level and XP are not touched here.
 */
export async function becomeMycomorph(actor, originalAncestry)
{
  const oldItems = actor.items.filter(i => i.type === "ancestry"
    || ((i.type === "weaponMelee" || i.type === "weaponRanged") && ANCESTRY_WEAPON_BACKLINK.test(i.system?.description ?? "")));
  if(oldItems.length) await actor.deleteEmbeddedDocuments("Item", oldItems.map(i => i.id));

  const kept = entriesOf(actor).filter(e => !(isGmReminder(e) && e.source === "ancestry"));
  if(kept.length !== entriesOf(actor).length) await setEntries(actor, kept);

  const tables = SPARK_TABLES["Mycomorph"];
  const spark = [];
  const rolled = { appearance: {}, personality: {} };
  for(const section of ["appearance", "personality"])
  {
    const table = tables[section];
    table.columns.forEach((col, ci) =>
    {
      const value = table.rows[d(20) - 1][ci];
      rolled[section][col] = value;
      if(col !== "Name") spark.push({ group: section, label: col, value });
    });
  }
  const sporeRoll = d(20);
  const sporeEntry = tables.spore_table.find(e => sporeRoll >= e.min && sporeRoll <= e.max);
  const spore = { roll: sporeRoll, name: sporeEntry.name, effect: sporeEntry.effect };

  // The OLD ancestry's flags come off and Mycomorph's go on; anything else the
  // character acquired stays. Found on the first fixture, 2026-09-27: a
  // Cacklemaw whose boon was a Gift is Biological and Psychic, and resetting
  // to what a Mycomorph starts with would have dropped Psychic while the Gift
  // it comes from was kept.
  // The STORED types (_source), not the shown: a live or temporary grant - a Gift's
  // Psychic, an elixir's type, a live figment's - is not the character's to keep
  // (Stats as Sentences chunk 2d, RULED 2026-10-07).
  const creatureTypes = { ...(actor._source?.system?.creatureTypes ?? actor.system.creatureTypes ?? {}) };
  for(const flag of ANCESTRY_CREATURE_TYPES[originalAncestry] ?? []) creatureTypes[flag] = false;
  for(const flag of ANCESTRY_CREATURE_TYPES["Mycomorph"] ?? []) creatureTypes[flag] = true;

  await actor.update({
    "system.ancestry": "Mycomorph",
    "system.creatureTypes": creatureTypes,
    "system.spark": spark,
    "system.noHealRule": tables.no_heal_rule || "",
  });

  const items = [];
  for(const def of ANCESTRY_RULE_ITEMS["Mycomorph"] ?? [])
  {
    let variant = "", variantEffect = "", variantRoll = 0;
    if(def.rule === "Twice Born") variant = `${originalAncestry} Adventurer`;
    else if(def.variantFrom === "spore") { variant = spore.name; variantEffect = spore.effect; variantRoll = spore.roll; }
    else if(def.variantFrom) variant = rolled.personality[def.variantFrom] || "";
    items.push(ancestryRuleItemData("Mycomorph", def, { variant, variantEffect, variantRoll }));
  }
  const created = await actor.createEmbeddedDocuments("Item", items);
  await writeAncestryReminders(actor, ANCESTRY_GM_REMINDERS["Mycomorph"]);

  return { removed: oldItems.map(i => i.name), created: created.map(i => i.name), spark, spore };
}

async function mycomorphSpores(actor, clean)
{
  const original = actor.system.ancestry || "Unknown";
  const level = Number(actor.system.level?.value ?? 1);
  const save = await rollCardSave(actor, { ability: "int", label: "Twice Born — recall who you were" });
  const days = d(4);
  const change = await becomeMycomorph(actor, original);

  let body = `<p>Spores take the body of <b>${esc(actor.name)}</b>, once a ${esc(original)}. They are reborn as a <b>Mycomorph</b> within <b>${days} day${days === 1 ? "" : "s"}</b>, ` +
    `physically transformed and using the Mycomorph rules: ${change.created.map(esc).join(", ")}.</p>`;
  if(change.removed.length) body += `<p>Gone with the old body: ${change.removed.map(esc).join(", ")}.</p>`;

  let levelLoss = null;
  if(save.verdict.passed)
    body += `<p>INT save <b>passed</b>: they recall who they were, and keep their Level, Gifts and Abilities.</p>`;
  else
  {
    body += `<p>INT save <b>failed</b>: they remember only fragments, and are a newly rolled Level 1 mycomorph carrying the same items. ` +
      `The spores took the corpse as it was, so nothing is rerolled; the Levels come off through the ledger and the XP is wiped.</p>`;
    const ledger = actor.system.advancement ?? [];
    if(level > 1 && ledger.length < level - 1)
      body += `<p><b>The ledger records ${ledger.length} of the ${level - 1} levels above 1.</b> The rest drop with nothing else undone. ` +
        `If that leaves the sheet wrong, build a new Level 1 Mycomorph in the character creator and move the gear across with the item transfer.</p>`;
    levelLoss = { levels: level - 1, ledgerEntries: ledger.length };
  }
  body += await cleanUp(actor, clean);
  await card(actor, `Mycomorph Spores: ${actor.name} is twice-born`, body);

  if(!save.verdict.passed)
  {
    if(level > 1) await loseLevels(actor, level - 1, { zeroXp: true, reason: "Reborn from spores, remembering only fragments." });
    else await actor.update({ "system.xp.value": 0 });
  }
  return { route: "spores", passed: save.verdict.passed, days, ...change, levelLoss };
}
