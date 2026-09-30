/**
 * Special Room Follow-ups (foundry-system-index.csv row of that name).
 *
 * Thirteen Special Rooms results lead to a further roll. The book prints
 * "Generate from" a source for most; the rulings (2026-09-27, Matt) settle the
 * rest and how each is made:
 *
 *   text   rolled with the room, written under its Special Room line
 *          Anomaly, Petty God Shrine, Autarch Shrine - the Anomaly, Petty Gods
 *          and Autarch composite generators; Oracle - Oracle's Sanctum
 *   item   an Item in a GM-only container for the room, as a treasure room's
 *          Advanced Weapon, Drug, Mystic Gift, Book, Fine Art, Musical
 *          Instrument, Poison (the Toxins dose Generate Poison makes), and
 *          Mutation - a plain Mutagenic Gel, no mechanic
 *   actor  Quantum Daemon - a Lesser Quantum Daemon
 *
 * Items and the actor are documents: Generate Room Contents makes them at once,
 * and a vault journal leaves them to a control (Contents Buttons on Vault Pages).
 */

// Keyed by the name the Special Rooms table prints.
export const SPECIAL_FOLLOW_UPS = {
  "Anomaly":            { kind: "text", composite: "anomaly" },
  "Petty God Shrine":   { kind: "text", composite: "petty_gods" },
  "Autarch Shrine":     { kind: "text", composite: "autarchs" },
  "Oracle":             { kind: "text", table: "Oracle's Sanctum Generator (d20)" },
  "Advanced Weapon":    { kind: "item", label: "the advanced weapon" },
  "Drug":               { kind: "item", label: "the drug" },
  "Mystic Gift":        { kind: "item", label: "the mystic gift" },
  "Book":               { kind: "item", label: "the book" },
  "Fine Art":           { kind: "item", label: "the fine art" },
  "Musical Instrument": { kind: "item", label: "the musical instrument" },
  "Poison":             { kind: "item", label: "the poison" },
  "Mutation":           { kind: "item", label: "the mutagenic gel" },
  "Quantum Daemon":     { kind: "actor", label: "the Lesser Quantum Daemon" }
};

// RULED 2026-09-27 (Matt): the book's "dose of mutagenic gel" is a plain item.
export const MUTAGENIC_GEL = {
  name: "Mutagenic Gel",
  type: "item",
  system: { slots: 1, description: "<p>A dose of mutagenic gel. Injecting it gives a random mutation: roll one with the Generate Mutation macro.</p>" }
};

/** The name a Special Rooms result prints ("**Special Room:** **Drug** ..."). Pure. */
export function specialNameOf(text)
{
  return String(text ?? "").match(/\*\*Special Room:\*\*\s*\*\*([^*]+?)\*\*/)?.[1]?.trim() ?? null;
}

/** A text follow-up's HTML. */
export async function rollSpecialText(name)
{
  const f = SPECIAL_FOLLOW_UPS[name];
  if(f?.composite)
  {
    const { COMPOSITE_GENERATORS } = await import("/systems/vaarn/module/actor/composite-generator-data.js");
    const { rollGeneratorHtml } = await import("/systems/vaarn/module/actor/composite-roller.js");
    return rollGeneratorHtml(COMPOSITE_GENERATORS.find(g => g.key === f.composite));
  }
  if(f?.table)
  {
    const { pickRandomResultHtml } = await import("/systems/vaarn/module/actor/rolltable-picker.js");
    return pickRandomResultHtml(f.table);
  }
  return null;
}

/** An item follow-up's Item data, as an array. */
export async function specialItemData(name)
{
  if(name === "Mutation") return [structuredClone(MUTAGENIC_GEL)];
  if(name === "Poison")
  {
    const { rollPoisonItemData } = await import("/systems/vaarn/module/actor/poison-data.js");
    return [rollPoisonItemData()];
  }
  const L = await import("/systems/vaarn/module/item/loot-builders.js");
  switch(name)
  {
    case "Advanced Weapon":    return L.buildWeapon("Advanced");
    case "Drug":               return L.buildDrug();
    case "Mystic Gift":        return L.buildGift();
    case "Book":               return L.buildFlavor("Books");
    case "Fine Art":           return L.buildFlavor("Fine Art");
    case "Musical Instrument": return L.buildFlavor("Musical Instruments");
  }
  throw new Error(`No item follow-up for the special room "${name}".`);
}

/**
 * Make a special room's documents: its item in a GM-only container named for
 * the room, or its Lesser Quantum Daemon. Returns { actor, names }.
 */
export async function createSpecialDocuments(name, roomLabel = "")
{
  const f = SPECIAL_FOLLOW_UPS[name];
  if(f?.kind === "actor")
  {
    const { createQuantumDaemon } = await import("/systems/vaarn/module/actor/quantum-daemon.js");
    return { actor: await createQuantumDaemon("Lesser"), names: [] };
  }
  const items = await specialItemData(name);
  // Shaped as a treasure room's container, so it is shared and taken the same way.
  const actor = await Actor.create({
    name: `Special Room: ${name}${roomLabel ? ` (${roomLabel})` : ""}`,
    type: "container",
    img: "icons/svg/chest.svg",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
    flags: { vaarn: { cache: { type: "Special Room", size: name } } },
    items
  });
  return { actor, names: items.map(i => i.name) };
}
