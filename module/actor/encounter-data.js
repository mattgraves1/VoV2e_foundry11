/**
 * ENCOUNTER COMPOSITION FROM ENC - the data (foundry-system-index.csv row of
 * that name, build plan RULED 2026-09-27 by Matt).
 *
 * The book's rule is general: "Roll the indicated die when generating
 * encounters with the creature to discover how many are present." A creature
 * whose ENC is a plain number or die ("1", "d8", "2d6") needs no entry here -
 * encounter.js rolls it as it stands. An ENC of "-" is a creature that is only
 * ever summoned, and one with no ENC at all has no encounter to roll; neither
 * gets the control.
 *
 * Everything else names who the creature is MET WITH, and that is written out
 * here per creature rather than parsed. Twelve strings in twelve shapes ("1
 * (with 2d10 Conscripts)", "d3 + d10 Grimpets", "1 + Steed", "1 Head and 1
 * Hindquarters") would need a parser as long as this table and still need
 * these decisions, which the book does not make:
 *
 *   `enc`        the stat block's ENC, verbatim. tools/test-encounter.mjs pins
 *                it to bestiary-data.js, so a changed stat block fails the
 *                commit instead of silently rolling the old group.
 *   `count`      how many of the creature ITSELF. 0 when it is not placed as
 *                itself (Jollyhoss, whose halves are placed instead).
 *   `companions` each { qty, and ONE of: creature (Bestiary name, with an
 *                optional rename and bio), steed (Steeds pack names - more
 *                than one is a pick), table (a ROLLTABLES name drawn once,
 *                spawning what the result names) }.
 */

export const ENC_COMPANIONS = {
  // "Harem: The Gorgon is accompanied by d10 personages ... Stats as Bandits."
  "Gorgon": { enc: "1 + d10 Harem Members", count: "1", companions: [
    { qty: "d10", creature: "Bandit", rename: "Harem Member",
      bio: "<p><b>Harem Member (the Gorgon's):</b> The Gorgon is accompanied by d10 personages of exceptional charm and beauty. These are her favoured suitors, who have been spared the Gorgon's appetites and make every attempt to please her. Stats as Bandits.</p>" } ] },

  // "Oblivion Heralds: ... Stats as Bandits (p.xx), armed with non-lethal weapons."
  "Oblivion Obelisk": { enc: "1 + d8 Heralds", count: "1", companions: [
    { qty: "d8", creature: "Bandit", rename: "Oblivion Herald",
      bio: "<p><b>Oblivion Herald:</b> Unfortunate victims of the Obelisk. They do not kill but restrain, forcing captives to kneel unblinking before the black stone until their mind has been erased. Stats as Bandits, armed with non-lethal weapons.</p>" } ] },

  "Grimweaver": { enc: "d3 + d10 Grimpets", count: "d3", companions: [
    { qty: "d10", creature: "Grimpet" } ] },

  "Cacklemaw Virago": { enc: "1 (with 2d6 Cacklemaw)", count: "1", companions: [
    { qty: "2d6", creature: "Cacklemaw" } ] },

  "Hegemony Centurion": { enc: "1 (+d8 Legionaries)", count: "1", companions: [
    { qty: "d8", creature: "Hegemony Legionary" } ] },

  "Hegemony Ordinator": { enc: "1 (with 2d10 Conscripts)", count: "1", companions: [
    { qty: "2d10", creature: "Hegemony Conscript" } ] },

  "Hegemony Conscript": { enc: "2d10 (+1 Ordinator)", count: "2d10", companions: [
    { qty: "1", creature: "Hegemony Ordinator" } ] },

  "Hegemony Suppressor": { enc: "1 (with d8 Legionaries + Centurion)", count: "1", companions: [
    { qty: "d8", creature: "Hegemony Legionary" },
    { qty: "1", creature: "Hegemony Centurion" } ] },

  // "Steed: Mordicant Knights ride a Destrier (p.xx)."
  "Knight Mordicant": { enc: "1 + Steed", count: "1", companions: [
    { qty: "1", steed: ["Destrier"] } ] },

  // "Steed: Knights Peregrine ride a steed, usually a Weeping Lizard or Zorse."
  // RULED: an even pick between the two, named on the card.
  "Knight Peregrine": { enc: "1 + Steed", count: "1", companions: [
    { qty: "1", steed: ["Weeping Lizard", "Zorse"] } ] },

  // "The Jollyhoss's Head and Hindquarters move and attack as separate Level 4
  // creatures, each with 16 HP." RULED: two copies of the one stat block,
  // named for the halves; both attacks stay on both and the GM uses the right
  // one.
  "Jollyhoss": { enc: "1 Head and 1 Hindquarters", count: "0", companions: [
    { qty: "1", creature: "Jollyhoss", rename: "Jollyhoss Head" },
    { qty: "1", creature: "Jollyhoss", rename: "Jollyhoss Hindquarters" } ] },

  // "1 + Enthralled Synths (generate p.xx)" - no table of that name exists.
  // RULED (Matt's best guess, reopen if the book resolves p.xx): one draw on
  // Rogue Robots.
  "Creedspeaker": { enc: "1 + Enthralled Synths (generate p.xx)", count: "1", companions: [
    { qty: "1", table: "Rogue Robots" } ] },
};

/** A plain ENC: a whole number or a die, nothing named. */
export const PLAIN_ENC = /^(\d+|\d*d\d+)$/i;

/** An ENC that means "never met on its own" - the creature is only summoned. */
export const SUMMONED_ONLY_ENC = "-";
