import { depletionChance, expectedUsesRemaining } from "./usage-die.js";
import { dailyPoolSize } from "../actor/daily-pool.js";
import { usageDieOf } from "../effects/item-stats.js";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class KnaveItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    //const itemData = this.data;
    const actorData = this.actor ? this.actor : {};
    const data = this.system;

    // Purely informational, for the item sheet — how likely the next roll is
    // to deplete the die, and how many rolls are expected before Expended.
    // Always set as two lines, even when there's nothing to report, so the
    // sheet's status line holds a fixed two-line height at every state —
    // otherwise everything below it jumps around whenever the die is edited.
    // Any Item may have a die since Stats as Sentences chunk 2e-i - its field's, or a size its
    // Stats effect gives it - so one without the template's field gets it in memory, and a
    // sentence-sized die not yet rolled shows as the full die it is.
    const ud = usageDieOf(this);
    if(!data.usageDie && (ud.die || ud.max)) data.usageDie = { die: "", max: "" };
    if(data.usageDie)
    {
      // usageDieOf's current die is the field's when set, else a sentence's full size.
      data.usageDie.die = ud.die;
      // The current die, a sentence-sized one full until rolled (Stats as Sentences chunk 2a).
      const die = ud.die;
      if(!die)
      {
        data.usageDie.statusLine1 = "No usage die tracked.";
        data.usageDie.statusLine2 = " ";
      }
      else if(die === "expended")
      {
        data.usageDie.statusLine1 = "Expended.";
        data.usageDie.statusLine2 = "No uses left.";
      }
      else
      {
        data.usageDie.depletionPercent = Math.round(depletionChance(die) * 100);
        data.usageDie.expectedUses = expectedUsesRemaining(die);
        data.usageDie.statusLine1 = `${data.usageDie.depletionPercent}% deplete chance per roll`;
        data.usageDie.statusLine2 = `~${data.usageDie.expectedUses} uses left on average`;
      }
    }
  }

  /**
   * An Item with a daily use pool (daily-pool.js) arrives on an actor FULL.
   * The template default is 0, and until 2026-09-30 only a Long Rest or the
   * refresh icon ever filled it, so a new Cacogen's Ink Ducts read "0 left"
   * from character creation. Here rather than in chargen-app.js so every way
   * an Item reaches an actor - creation, a generator, a grant, a drag from a
   * compendium - gets the same answer. A source that already carries uses is
   * left alone (chargen's Trauma-Response Rig passes its own 1).
   */
  async _preCreate(data, options, user) {
    if(await super._preCreate(data, options, user) === false) return false;
    if(!(this.parent instanceof Actor)) return;
    const size = dailyPoolSize(this.parent, this);
    if(size !== null && (this.system.usesRemaining ?? 0) <= 0)
      this.updateSource({ "system.usesRemaining": size });
  }
}
