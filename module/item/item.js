import { depletionChance, expectedUsesRemaining } from "./usage-die.js";

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
    if(data.usageDie)
    {
      const die = data.usageDie.die;
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
}
