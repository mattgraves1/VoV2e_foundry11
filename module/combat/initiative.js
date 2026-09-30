// Vaarn initiative. The book is unusual here: it offers FOUR alternative
// systems rather than one rule, "each of which emphasises different
// attributes" (rules/Combat/Initiative.md). So which one is in play is a
// per-world GM setting, not a choice baked into the system — Matt's call
// 2026-09-06, which is what closed the Initiative row's open question.
//
// THE ENCODING, which is the whole trick. Foundry does not model "sides"
// at all; Combat#_sortCombatants only sorts a number descending. Two of
// Vaarn's four systems (side-based, David) produce a SIDE rather than an
// ordering, and encumbrance produces a pass/fail bucket. None of those is
// a per-combatant formula, so CONFIG.Combat.initiative.formula cannot
// express them. Instead each mode assigns whatever numbers sort correctly
// and Foundry never needs to know what they mean:
//
//   side-based   PCs 2 / enemies 1, or flipped, from one d6 per round
//   encumbrance  PC who beat their slots 3, enemies 2, PC who failed 1
//   goliath      the combatant's current HP
//   david        2 to the smaller side, 1 to the larger
//
// "In cases of ties, always favour the PCs." For the bucket modes that is
// free, since PC and enemy never share a value. Goliath is the only mode
// where a real tie is possible (two combatants on equal HP), so it adds
// PC_TIEBREAK to the player side — this is what CONFIG.Combat.initiative
// .decimals has been set to 2 for all along, inherited and unused.
const PC_TIEBREAK = 0.5;

export const INITIATIVE_SETTING = "initiativeMode";

// Keys are stored in the world setting, so renaming one silently resets
// every world using it back to the default. Treat them as permanent.
export const INITIATIVE_MODES = {
  sideBased: "Side-based — 1d6 each round, even = PCs act first",
  encumbrance: "Encumbrance — d20 over used item slots, rolled once at the start of combat",
  goliath: "Goliath — highest HP acts first, recalculated each round",
  david: "David — the side with fewest members acts first, recalculated each round"
};

export const DEFAULT_INITIATIVE_MODE = "sideBased";

/**
 * Which side a combatant is on. "The sides are always 'player characters
 * and their allies' vs everyone else" (Matt, 2026-09-06).
 *
 * WHY TWO SIGNALS, and why hasPlayerOwner comes first. Foundry does have
 * a friend/foe field — TokenDocument#disposition — but this system has
 * never set it (bestiary-build.js writes only the token texture), and
 * Foundry's own schema initialises it to HOSTILE for EVERY token, with
 * Actor._preCreate touching only name and artwork. Verified against the
 * v11 source, not from memory: common/documents/token.mjs:120.
 *
 * So disposition read alone would put the PCs on the enemy side of their
 * own fight. hasPlayerOwner is what rescues that, and it means David and
 * side-based work on the existing world with no data migration and no
 * new schema field. Disposition is still honoured as the second signal
 * because that is how a GM marks an NPC ally — a pet, a follower, a
 * hired mercenary. Foundry already provides that control, so no UI work
 * is needed here: it is Token Configuration, Identity tab, the
 * "Disposition" dropdown. NOT the token HUD, which carries only combat,
 * config, effects, target and visibility — an earlier draft of this
 * comment said HUD and was wrong.
 */
export const SIDE = { US: "us", THEM: "them", BYSTANDER: "bystander" };

/**
 * The three-way classification. Only David distinguishes bystanders; the
 * other three modes collapse this to the US/not-US question via
 * isPlayerSide below, so their behaviour is unchanged by its existence.
 *
 * RULED 2026-09-06 (Matt): NEUTRAL and SECRET tokens count toward NEITHER
 * side's headcount in David, though they still act alongside the enemies.
 *
 * They used to count as THEM, which is the literal reading of "PCs and
 * their allies vs everyone else" but plays badly: a crowd of uninvolved
 * villagers made the party outnumbered and therefore FASTER. SECRET was
 * the sharper case, since that is a token the players are not supposed to
 * know exists, and it moved initiative in their favour for no visible
 * reason — the mechanic quietly announcing that something hidden was on
 * the board.
 *
 * Anything unrecognised falls to THEM rather than BYSTANDER on purpose.
 * Foundry's disposition field is `required` and initialises to HOSTILE, so
 * an unreadable value means something is wrong rather than neutral, and
 * the safe reading of an unknown combatant is that it is not on your side.
 */
export function sideOf(combatant) {
  // The ground is not a combatant — Dropped Item Container. Its box actor
  // MUST be player-owned, because that is precisely what lets a player drop
  // into it with no socket relay, so hasPlayerOwner below would put it on
  // the players' side and inflate David's headcount. This guard is the
  // reason the container is a real Actor type rather than a flag on an npc:
  // a flag would have needed suppressing here and at every future consumer,
  // one at a time, each a place a later change can forget.
  if (combatant?.actor?.type === "container") return SIDE.BYSTANDER;
  if (combatant?.actor?.hasPlayerOwner) return SIDE.US;
  const D = CONST.TOKEN_DISPOSITIONS;
  const disposition = combatant?.token?.disposition
    ?? combatant?.actor?.prototypeToken?.disposition;
  if (disposition === D.FRIENDLY) return SIDE.US;
  if (disposition === D.NEUTRAL || disposition === D.SECRET) return SIDE.BYSTANDER;
  return SIDE.THEM;
}

export function isPlayerSide(combatant) {
  return sideOf(combatant) === SIDE.US;
}

/**
 * Three of the four are explicitly continuous — side-based is "decided
 * each round" (JADE IBIS; CRIMSON HOUND said "each turn"), and Goliath
 * and David both say "each round". Encumbrance is the
 * one exception: it is rolled once "at the start of combat" and then
 * stands. That single distinction is why this predicate exists rather
 * than recomputing everything unconditionally.
 */
export function isPerRoundMode(mode) {
  return mode !== "encumbrance";
}

export function currentMode() {
  try {
    return game.settings.get("vaarn", INITIATIVE_SETTING) || DEFAULT_INITIATIVE_MODE;
  } catch (err) {
    // Reachable if something asks before the init hook has registered the
    // setting; a sane mode beats throwing inside the combat tracker.
    return DEFAULT_INITIATIVE_MODE;
  }
}

export function registerInitiativeSetting() {
  game.settings.register("vaarn", INITIATIVE_SETTING, {
    name: "Initiative system",
    hint: "Vaarn offers four alternative initiative systems. Ties always favour the PCs. Changing this takes effect from the next round or the next combat.",
    scope: "world",
    config: true,
    type: String,
    choices: INITIATIVE_MODES,
    default: DEFAULT_INITIATIVE_MODE
  });
}

/**
 * Work out every combatant's initiative for one mode in a single pass.
 * Returns the values plus a line of flavour text for chat; side-based and
 * encumbrance both involve a real die roll the table will want to see.
 */
// Exported for tools/test-initiative.mjs. The encoding is the part of this
// file most likely to be silently wrong — a mode that sorts backwards
// still produces a clean, plausible tracker — so it is checked offline
// against the sort order it has to produce, not by reading its numbers.
export async function computeInitiative(combatants, mode) {
  const values = new Map();

  switch (mode) {
    // "Roll 1d6: on even numbers the PCs act first, on odd their enemies
    // do." ONE roll for the whole encounter, not one per combatant.
    case "sideBased": {
      const roll = await new Roll("1d6").evaluate();
      const pcsFirst = (roll.total % 2) === 0;
      for (const c of combatants) {
        values.set(c.id, isPlayerSide(c) === pcsFirst ? 2 : 1);
      }
      return {
        values,
        flavor: `<b>Side-based initiative:</b> rolled ${roll.total} — ${pcsFirst ? "the PCs" : "their enemies"} act first.`
      };
    }

    // "PCs must roll higher than their total used item slots using a d20.
    // If they succeed they act before their opponents." Only the PC side
    // rolls; everyone else is the single block they are measured against.
    case "encumbrance": {
      const lines = [];
      for (const c of combatants) {
        if (!isPlayerSide(c)) {
          values.set(c.id, 2);
          continue;
        }
        const slots = Number(c.actor?.system?.inventorySlots?.used ?? 0);
        const roll = await new Roll("1d20").evaluate();
        const success = roll.total > slots;
        values.set(c.id, success ? 3 : 1);
        lines.push(`${c.name}: rolled ${roll.total} vs ${slots} slots used — acts ${success ? "before" : "after"} their opponents.`);
      }
      return {
        values,
        flavor: `<b>Encumbrance initiative:</b><br>${lines.join("<br>") || "No player-side combatants to roll for."}`
      };
    }

    // "based on each individual's HP total, with the highest HP score
    // acting first." The only mode that is already a ranking, and so the
    // only one where the PC tiebreak does any work.
    case "goliath": {
      for (const c of combatants) {
        const hp = Number(c.actor?.system?.health?.value ?? 0);
        values.set(c.id, hp + (isPlayerSide(c) ? PC_TIEBREAK : 0));
      }
      return { values, flavor: "<b>Goliath initiative:</b> acting in order of current HP, highest first." };
    }

    // "The side with the fewest members acts first." Everything added to
    // the encounter counts toward its side's total — pets, followers,
    // hired mercenaries, anything summoned mid-fight (Matt, 2026-09-06).
    // That makes the combat tracker itself the roster, which is also the
    // only thing Foundry can see.
    case "david": {
      const sides = combatants.map(sideOf);
      const us = sides.filter(s => s === SIDE.US).length;
      const them = sides.filter(s => s === SIDE.THEM).length;
      const bystanders = sides.filter(s => s === SIDE.BYSTANDER).length;

      // Equal sizes is a tie, so favour the PCs. `them === 0` is the same
      // rule at its limit: with no hostile side there is nothing to be
      // outnumbered BY, so the PCs lead rather than trailing behind a
      // crowd of bystanders who are not opposing them.
      const usFirst = them === 0 ? true : us <= them;

      // Bystanders are not US, so they fall in with the enemies here —
      // excluded from the count, still in the turn order.
      for (let i = 0; i < combatants.length; i++) {
        values.set(combatants[i].id, (sides[i] === SIDE.US) === usFirst ? 2 : 1);
      }
      const aside = bystanders
        ? `, with ${bystanders} bystander${bystanders === 1 ? "" : "s"} counting toward neither side`
        : "";
      return {
        values,
        flavor: `<b>David initiative:</b> ${us} on the player side, ${them} against${aside} — ${usFirst ? "the PCs" : "their enemies"} act first.`
      };
    }

    default: {
      // An unknown key means the setting holds a mode that no longer
      // exists. Fall back rather than leaving the tracker unsorted.
      return computeInitiative(combatants, DEFAULT_INITIATIVE_MODE);
    }
  }
}

export class VaarnCombat extends Combat {

  /**
   * Assign initiative to every combatant at once.
   *
   * All four modes are whole-encounter calculations — even Goliath, which
   * looks per-combatant, has to see the other side to break its ties in
   * the PCs' favour, and David cannot be computed for one combatant at
   * all. So there is no per-combatant path here by design, and the
   * per-combatant entry points below all funnel into this.
   */
  async recomputeInitiative({ announce = true } = {}) {
    // Combatant updates are world writes; let the GM's client own them so
    // three players clicking at once do not each roll their own d6.
    if (!game.user.isGM) return this;
    const combatants = this.combatants.contents;
    if (!combatants.length) return this;

    const mode = currentMode();
    const { values, flavor } = await computeInitiative(combatants, mode);

    await this.updateEmbeddedDocuments("Combatant", combatants.map(c => ({
      _id: c.id,
      initiative: values.get(c.id) ?? 0
    })));

    if (announce && flavor) {
      await ChatMessage.create({
        speaker: { alias: "Initiative" },
        content: flavor
      });
    }
    return this;
  }

  /**
   * Foundry's per-combatant initiative buttons (and Roll All / Roll NPCs)
   * all land here. Vaarn has no per-combatant formula, so whichever
   * control was clicked, the honest answer is to recompute the encounter.
   * The `ids` argument is deliberately ignored rather than errored on —
   * the tracker's own UI passes it and the GM should not be punished for
   * clicking the button Foundry drew for them.
   */
  async rollInitiative(ids, options = {}) {
    return this.recomputeInitiative({ announce: true });
  }

  async rollAll(options) {
    return this.recomputeInitiative({ announce: true });
  }

  async rollNPC(options) {
    return this.recomputeInitiative({ announce: true });
  }

  // ROLLED BEFORE THE ROUND TURNS, not after (Turn-Timed Round Card, RULED
  // 2026-09-26 by Matt). The round card posts from the updateCombat hook the
  // round change fires, and sorts its lines by tracker order - so initiative
  // recomputed after super's update raced the card, and a side-based round
  // could post in LAST round's order. Recomputing first means the order is
  // settled before the round number moves.
  async startCombat() {
    await this.recomputeInitiative({ announce: true });
    return super.startCombat();
  }

  /**
   * The per-round half of the rules. Encumbrance is excluded because the
   * book rolls it once at the start of combat and lets it stand.
   */
  async nextRound() {
    if (isPerRoundMode(currentMode())) {
      await this.recomputeInitiative({ announce: true });
    }
    return super.nextRound();
  }
}
