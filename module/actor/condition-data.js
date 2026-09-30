/**
 * Combat Conditions — foundry-system-index.csv "Define Blind and Entangled
 * from JADE".
 *
 * JADE IBIS 15-09-26 adds a Combat Conditions section with exactly two
 * entries, quoted verbatim below as `book`. CRIMSON HOUND had no such section.
 *
 * THIS FILE IS THE ONE DEFINITION. An ability, tag, gambit or item that
 * inflicts a condition NAMES it — carries the key in a board entry's
 * `applied.conditions` — and what the condition does is read from here.
 * Nothing else restates the mechanics; a second copy is exactly the drift the
 * row exists to remove. Entries that shipped before this file existed are
 * walked by "Update Built Content for Blind and Entangled".
 *
 * RULED 2026-09-16 (Matt):
 *  - Entangled is a -5 AV PENALTY, as JADE prints. The Grimweaver's "AV 9"
 *    wording is stale — JADE prints its attack as "Web Shot (Entangled)" and
 *    nothing more — and the break-free DEX Save was never the book's.
 *  - Blind is a REAL STATE, not descriptive text: both its clauses have hooks.
 *  - The Blind MUTATION is a different thing (JADE: "DIS on ranged attacks")
 *    and stays what it is. A character who has it is IMMUNE to the Blind
 *    condition — they are already blind.
 *
 * HOW THE MECHANICS REACH THE GAME:
 *  - `av` is contributed live by stateful-effect.js's activeDeltas FROM THIS
 *    DEFINITION, not from a number typed on the entry. An entry that names
 *    "entangled" is -5 AV and nothing else needs to know the figure.
 *  - "cannot make ranged attacks" refuses the ranged attack click in
 *    actor-sheet.js; "DIS on melee attacks" rides the forced-DIS hook the
 *    Blind mutation already uses. Both read the board through hasCondition.
 *  - "cannot make movement actions" has NO reader. Movement is not modelled;
 *    the board row's text carries it for the Referee.
 *
 * IMMUNITY IS READ AT THE POINT OF USE, never at application. activeDeltas
 * drops an immune condition before any reader sees it, so a Blind row on an
 * Echolocation character is inert without anyone having to refuse it.
 * Application belongs to the existing rows (Matt, 2026-09-15: "those are going
 * to vary"), and none of them needs to know about immunity.
 */

export const BLIND = "blind";
export const ENTANGLED = "entangled";

export const CONDITIONS = [
  {
    key: BLIND,
    label: "Blind",
    book: "Blind characters cannot make ranged attacks, and have DIS on melee attacks.",
    av: 0,
    // Items whose bearer the condition cannot touch. `why` is the book's own
    // words, or the ruling, so the list can be checked against the page.
    immuneItems: [
      { type: "mutation", name: "Blind",                   why: "RULED 2026-09-16 (Matt): already blind" },
      { type: "mutation", name: "Echolocation",            why: "book: You cannot be blinded" },
      { type: "mutation", name: "Ultravision",             why: "book: You cannot be blinded" },
      { type: "mutation", name: "Heightened Hearing",      why: "book: You suffer no ill-effects from Blindness" },
      { type: "implant",  name: "Air Current Microsensor", why: "book: You suffer no navigation/combat penalties from Blindness" },
      // A helm: loot-builders.js makes it an `armor` Item, so the old
      // type "exotica" here never matched anything and it granted nothing.
      // It must be WORN (Matt, 2026-09-19) — immunityTo skips an unequipped one.
      { type: "armor",    name: "Ultravisor",              why: "book: The wearer has ultravision and can never be blinded" }
    ],
    // Items that change the SAVE against this condition — Save-Modifier Effects
    // on the Forgettable Tab, 2026-09-16. Read by conditionSaveModifiers when
    // the compelled-save card rolls, which is the only roll that knows what it
    // is against. The book's words beside each, as with immuneItems.
    saveModifiers: [
      { type: "mutation", name: "Bulbous Eyes", mode: "dis", why: "book: DIS on Saves to avoid Blindness" },
      { type: "mutation", name: "Cyclops",      mode: "dis", why: "book: DIS on Saves vs Blindness" }
    ]
  },
  {
    key: ENTANGLED,
    label: "Entangled",
    book: "Entangled characters cannot make movement actions, and suffer a -5 penalty to AV.",
    av: -5,
    immuneItems: [],
    saveModifiers: []
  }
];

/** The definition for a condition key, or null for a key this file does not define. */
export function conditionByKey(key)
{
  return CONDITIONS.find(c => c.key === key) ?? null;
}

/**
 * The item that makes this actor immune to the condition, or null.
 *
 * Duck-typed on `items` — a Foundry Collection or a plain array both iterate —
 * so it runs from prepareDerivedData and from the offline test alike. A
 * condition this file does not define has no immunity list and returns null,
 * which keeps every other condition on the board exactly as it was.
 */
export function immunityTo(actor, key)
{
  const def = conditionByKey(key);
  if (!def) return null;
  // A CREATURE'S OWN RULE - the Blind Crab's "cannot be blinded" (RULED
  // 2026-09-24, Matt). Carried on the actor by bestiary-build.js.
  if ((actor?.flags?.vaarn?.conditionImmunity ?? []).includes(key))
    return { type: "creature", name: actor.name, why: "creature rule: cannot be affected" };
  if (!actor?.items) return null;
  for (const item of actor.items)
  {
    // AN EQUIPPABLE SOURCE MUST BE EQUIPPED — the same test ambush.js's
    // immunityOf makes, conditional on the field existing: mutations and
    // implants carry no equip state and are always on.
    const equippable = item?.system?.equipped !== undefined;
    if (equippable && !item.system.equipped) continue;
    for (const im of def.immuneItems)
      if (item?.type === im.type && item?.name === im.name) return im;
  }
  return null;
}

/**
 * The named ADV and DIS sources this actor has on a save against any of
 * `keys` — `{ advSources, disSources }`, the shape card-save.js combines.
 *
 * Duck-typed on `items` like immunityTo, for the same reason. A key this file
 * does not define contributes nothing, and an actor with no items has neither.
 * Immunity is not consulted here: an immune actor is never asked to save, and
 * the board drops the condition before any reader sees it.
 */
export function conditionSaveModifiers(actor, keys)
{
  const advSources = [], disSources = [];
  if (!actor?.items) return { advSources, disSources };
  for (const k of new Set(keys ?? []))
    for (const m of conditionByKey(k)?.saveModifiers ?? [])
      for (const item of actor.items)
        if (item?.type === m.type && item?.name === m.name)
          (m.mode === "adv" ? advSources : disSources).push(m.name);
  return { advSources, disSources };
}

/**
 * The AV a set of condition keys contributes, from the definitions. Each key
 * counts once however many entries carry it: two webs do not make -10.
 */
export function conditionAv(keys)
{
  let av = 0;
  for (const k of new Set(keys ?? [])) av += Number(conditionByKey(k)?.av ?? 0);
  return av;
}

/**
 * The canonical board entry for a condition: the label as its name, the
 * book's sentence as its text, the key in `applied.conditions`. Whoever puts
 * a condition on an actor spreads this into addEntry rather than typing a
 * name and a wording of their own — that is how "no second copy" holds.
 */
export function conditionEntry(key, extra = {})
{
  const def = conditionByKey(key);
  if (!def) throw new Error(`no such combat condition: ${key}`);
  return { name: def.label, text: def.book, applied: { conditions: [def.key] }, ...extra };
}

/**
 * Weapon tags that inflict a condition — Update Built Content for Blind and
 * Entangled, 2026-09-16. JADE prints "Entangling: Targets DEX Save or become
 * entangled" and "Blinding: Targets DEX Save vs a round of blindness". The
 * sheet posts an Apply Effect to Target card for these at attack time, the
 * same route a creature's declared save takes (RULED 2026-09-16, Matt: do it
 * here rather than wait for Roll-Notes Mechanism).
 */
export const TAG_CONDITIONS = {
  Entangling: { condition: ENTANGLED },
  Blinding:   { condition: BLIND, amount: 1, unit: "round" }
};

/** The condition applications a weapon's tags declare, in tag order. */
export function tagApplies(tags)
{
  return (tags ?? []).map(t => TAG_CONDITIONS[t]).filter(Boolean);
}

/**
 * The sentence for a source that prints no end. RULED 2026-09-16 (Matt): the
 * honest conversion invents neither a duration nor a save. The entry gets no
 * clock, and the card and the board row both draw attention to that instead.
 * Five of the six Entangled sources in JADE, and two Blind ones, land here.
 */
export const NO_PRINTED_END = "The book prints no end for this. It stays until the Referee clears it.";

/**
 * The Apply Effect to Target spec for a condition — what the card carries
 * and what lands on the target when the Referee clicks.
 *
 * `rounds` is the ROLLED count or null. Rolling is the caller's: the die is
 * rolled once, on the card, and this file has no dice. Null means no printed
 * end; the spec then carries no duration, so applyEffectToActor stamps no
 * expiry and the board shows the row as open-ended.
 */
export function conditionApplySpec(key, { rounds = null, unit = "round", source = "" } = {})
{
  const def = conditionByKey(key);
  if (!def) throw new Error(`no such combat condition: ${key}`);
  const n = Number(rounds);
  const timed = Number.isFinite(n) && n > 0;
  const from = source ? ` From <b>${source}</b>.` : "";
  const span = timed
    ? ` For ${n} ${unit === "round" ? "combat round" : unit === "turn" ? "Exploration Turn" : unit}${n === 1 ? "" : "s"}.`
    : ` <b>${NO_PRINTED_END}</b>`;
  return {
    name: def.label,
    text: def.book + from + span,
    rounds: timed ? n : null,
    unit,
    applied: { conditions: [def.key] }
  };
}

/**
 * The Apply Effect to Target spec for a creature's OWN named rule - the
 * Tarantella's Tarantism, 2026-09-21. Same shape and the same span sentence
 * as conditionApplySpec, but it names no Combat Condition, so it carries no
 * `applied` block: the board row is the rule's text and a clock, and nothing
 * reads it mechanically. `a` is the declared entry {effect, text}.
 */
export function creatureRuleApplySpec(a, { rounds = null, unit = "round", source = "" } = {})
{
  const n = Number(rounds);
  const timed = Number.isFinite(n) && n > 0;
  const from = source ? ` From <b>${source}</b>.` : "";
  const span = timed
    ? ` For ${n} ${unit === "round" ? "combat round" : unit === "turn" ? "Exploration Turn" : unit}${n === 1 ? "" : "s"}.`
    : ` <b>${NO_PRINTED_END}</b>`;
  // `applied` rides through when the source declares one - Flatten and
  // Planeyfied set the "flat" condition (Timed Condition Duration, 2026-09-21).
  // An end the victim chooses IS a printed end, so the no-end sentence goes.
  return { name: a.effect, text: (a.text ?? "") + from + (a.endsBy && !timed ? "" : span), rounds: timed ? n : null, unit,
           ...(a.applied ? { applied: a.applied } : {}),
           // The Ghoul's Agony (RULED 2026-09-27, Matt): a per-round HP tick on
           // the victim, and an end the victim chooses by lying still. Either
           // makes the entry a round-card line.
           ...(a.hpTick ? { hpTick: a.hpTick, perRound: true } : {}),
           ...(a.endsBy ? { endsBy: a.endsBy, perRound: true } : {}),
           ...(a.attuneExisting ? { attuneExisting: true } : {}),
           // Space-Time Vortex (RULED 2026-09-25, Matt): a reminder on the
           // round card every combat round, open-ended, text only.
           ...(a.perRound ? { perRound: true } : {}),
           // Its round-card button posts this save to the targeted tokens
           // (Failed-Save Consequence, RULED 2026-09-25, Matt).
           ...(a.save ? { save: a.save } : {}) };
}

/** Does this board entry carry a defined condition with no end stamped? */
export function isOpenEndedCondition(entry)
{
  const keys = entry?.applied?.conditions ?? [];
  if (!keys.some(k => conditionByKey(k))) return false;
  return !Number.isFinite(entry.expiresAtRound) && !Number.isFinite(entry.expiresAtTime);
}
