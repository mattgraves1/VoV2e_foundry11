/**
 * Vaarn: Generate Autarch Figment
 *
 * Autarch Figment Grant (foundry-system-index.csv "Autarch Figment Grant").
 *
 * GM tool for granting one of the four Autarch Figments. The Court of the
 * Jigsaw Autarch is the only one of the eight Major Factions with no Gaining
 * REP table; the book prints Autarch Figment Effects where the other seven
 * print REP, so a figment is what the Court gives instead of reputation.
 *
 * Creates an UNOWNED `figment` Item in the Items sidebar for the GM to drag
 * onto an actor by hand — the same "no assign-to-actor prompt" convention
 * every other generator macro follows (Matt's ruling 2026-08-21), and the same
 * `{slots, roll, description}` shape the mutation macro uses. No mechanical
 * fields are stored on the Item: item-effects.js looks the entry up BY NAME
 * against the roster once the Item lands on an actor, exactly as it does for
 * mutations and implants, so the Item works however it was created.
 *
 * IT DOES HAVE A DIALOG, unlike Generate Mutation, and that is the one
 * deliberate deviation. The book presents the figments as a d4 roll, so
 * rolling is offered and is the first button — but Matt's ask was for the GM
 * to be able to GIVE a character a figment, which is a choice rather than a
 * roll, and with only four entries a picker costs nothing. Both routes create
 * an identical Item.
 *
 * WHAT HAPPENS WHEN IT LANDS ON AN ACTOR, all of it in item-effects.js and
 * none of it here:
 *   - the Hypergeometric creature type is set, on all four
 *   - Eye and Maw create their natural weapon, tagged so Damage-Type Read
 *     sees Beam and Hypergeometric rather than reading them as prose
 *   - Gut's +3 AV is live off the Item, and its "+1 Level" grants a CHARACTER
 *     one level's worth of XP to take themselves, or raises an NPC's Level the
 *     way Kronophage's Borrowed Time does
 *   - Nerves bakes +1 INT/PSY/EGO and gets a sheet control that compels a
 *     target's DEX Save
 * Deleting the Item reverses all of it.
 *
 * WORKS ON NPCs AS WELL AS CHARACTERS (Matt's ruling 2026-09-14) — the Court
 * grafts these into whatever it favours. Figments are the only Item type whose
 * bake reaches an NPC at all.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to pick or roll one figment and create the Item.
 */

async function generateAutarchFigment()
{
  const { FIGMENTS, figmentEffectText } =
    await import("/systems/vaarn/module/actor/figments.js");

  if(!game.user.isGM)
  {
    ui.notifications.warn("Only the Referee can graft an Autarch Figment.");
    return;
  }

  const chosen = await new Promise(resolve =>
  {
    const buttons = {};

    buttons.roll = {
      label: "Roll d4",
      callback: () => resolve("roll")
    };
    for(const f of FIGMENTS)
    {
      // The book's own short name — "Eye", "Gut" — rather than the Item's full
      // name, which is the same four words repeated across every button.
      buttons[`f${f.roll}`] = {
        label: `${f.roll}. ${f.name.replace(/^Autarch Figment:\s*/, "")}`,
        callback: () => resolve(f.name)
      };
    }

    new Dialog({
      title: "Autarch Figment",
      content:
        `<p>The Jigsaw Autarch grants a piece of itself.</p>`
      + `<p style="font-size:0.9em;opacity:0.8">Roll as the book does, or choose `
      + `one to graft. Either way the Item is created unowned &mdash; drag it `
      + `onto a character or an NPC.</p>`,
      buttons,
      default: "roll",
      close: () => resolve(null)
    }).render(true);
  });

  if(!chosen) return;

  let entry;
  let rolled = null;
  if(chosen === "roll")
  {
    const roll = await new Roll("1d4").evaluate();
    rolled = roll.total;
    entry = FIGMENTS.find(f => f.roll === rolled);
    // A d4 against a four-row table cannot miss, but reading the result back
    // out of the roster rather than indexing into it means a table that ever
    // changes shape fails loudly here instead of granting the wrong figment.
    if(!entry)
    {
      ui.notifications.error(`Autarch Figment Effects has no row ${rolled}.`);
      return;
    }
    // Private (Roll Card Visibility, RULED 2026-09-27 by Matt): setting prep.
    await roll.toMessage({
      flavor: `<b>Autarch Figment Effects</b> &mdash; the Autarch chooses.`
    }, { rollMode: CONST.DICE_ROLL_MODES.PRIVATE });
  }
  else entry = FIGMENTS.find(f => f.name === chosen);

  const item = await Item.create({
    name: entry.name,
    type: "figment",
    system: {
      slots: 0,
      roll: entry.roll,
      // The book's own sentence, not a paraphrase. It is also what
      // round-effects.js tests for per-round wording — Maw's "every round" is
      // in this text and nowhere else, so rewriting it would silently stop the
      // reminder from ticking.
      description: `<p>${figmentEffectText(entry)}</p>`
    }
  });

  ui.notifications.info(
    `${entry.name}${rolled ? ` (rolled ${rolled})` : ""} created in the Items `
  + `directory. Drag it onto an actor to graft it.`);

  item.sheet.render(true);
}

generateAutarchFigment();
