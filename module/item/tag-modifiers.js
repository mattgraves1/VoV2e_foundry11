/**
 * TAG MODIFIERS — the creation-time numbers a weapon tag changes.
 * Extracted from chargen-app.js so they can be imported
 * outside a running world.
 *
 * chargen-app.js extends Foundry's Application, so `node` cannot import it and
 * anything built on top of it can only be tested live. That was tolerable while
 * the only consumer was weapon-roller.js; it stopped being tolerable when the
 * XP value of Exotica came to depend on the same multipliers (xp-value.js).
 * chargen-app.js re-exports both names, so every existing caller is unchanged.
 *
 * ONLY THE UNCONDITIONAL TAGS LIVE HERE. Bone, Nomad's and Ritual read "double
 * trade value with <faction>", which depends on the buyer rather than the item,
 * so they cannot be baked and stay as description text. See the Trade-Value
 * Modifier row.
 */

import { WEAPON_TAG_EFFECTS } from "./weapon-tag-effects-data.js";
export const TRADE_VALUE_MULTIPLIERS = {
  "Ancient": 0.5,
  "Corroded": 0.5,
  "Bejewelled": 3,
  "Extra-Dimensional": 5,
  "Gilded": 2,
  "Ornate": 2,
  "Polychrome": 2,
  "Translucent": 2,
  "Crystalline": 2,
  "Laquered": 2,
  "Luminous": 2,
};

/**
 * Multipliers STACK multiplicatively. A weapon rolls one Basic tag so two of
 * those cannot collide, but Extra-Dimensional is an EXOTIC tag and sits
 * alongside a Basic one — Bejewelled + Extra-Dimensional is x15.
 *
 * NO ROUNDING TO INTEGERS (Matt): halving a value of 1 gives 0.5. Rounded to 2
 * decimals only, because composing multipliers otherwise yields float noise
 * like 0.30000000000000004.
 */
export function applyTradeValueTagModifiers(tradeValue, tags = [])
{
  let result = Number(tradeValue);
  if(!Number.isFinite(result)) result = 1;
  for(const tag of tags)
  {
    const m = TRADE_VALUE_MULTIPLIERS[tag];
    if(m) result *= m;
  }
  return Math.round(result * 100) / 100;
}

/**
 * SLOT WEIGHT. Six tags move it, and every one of them is phrased against the
 * BASE — "half base slot weight", "double slot weight", "triple base slot
 * weight" — so they are multipliers, exactly like the two tables above.
 *
 * The three halvers are all BASIC tags and a weapon rolls exactly one Basic
 * tag, so they can never stack with each other. They CAN combine with Heavy
 * (Advanced) and Colossal (Exotic).
 */
export const SLOT_MULTIPLIERS = {
  "Delicate": 0.5,
  "Elegant": 0.5,
  "Quicksilver": 0.5,
  "Heavy": 2,
  "Colossal": 3,
};

/**
 * ROUND DOWN (Matt, 2026-09-05): halving a 3-slot weapon gives 1, a 5-slot
 * gives 2. Deliberately unlike applyTradeValueTagModifiers above, which keeps
 * fractions — a slot is a discrete square in an inventory, a trade value is not.
 *
 * ROUNDED ONCE, AT THE END, because rounding is what breaks commutativity:
 * Elegant + Colossal on a 3-slot base is 4 if you round last, 3 if you round
 * after the halving. Tag order in the array is arbitrary, so a result that
 * depended on it would be a bug that only showed up sometimes.
 *
 * MINIMUM 1 SLOT is the halvers’ own wording and is applied to the final
 * figure. Hard Light is the sole exception and the only route to 0 — it says
 * flatly that the weapon "has a slot weight of 0", so it short-circuits
 * everything, including the floor. It cannot collide with Colossal; both are
 * Exotic tags and a weapon carries only one.
 */
export function applySlotTagModifiers(slots, tags = [])
{
  if(tags.includes("Hard Light")) return 0;

  let result = Number(slots);
  if(!Number.isFinite(result)) result = 1;
  for(const tag of tags)
  {
    const m = SLOT_MULTIPLIERS[tag];
    if(m) result *= m;
  }
  return Math.max(1, Math.floor(result));
}

/**
 * QUALITY TIER. Matt's ruling 2026-09-05: an Advanced weapon is worth double.
 * The book prices no weapon anywhere, so this is a house rule filling a real
 * gap — a Basic and an Advanced version of the same base were otherwise worth
 * exactly the same unless a value tag happened to roll.
 *
 * APPLIED LAST, after the tag multipliers. Mathematically that changes nothing,
 * since every modifier here is multiplicative and multiplication commutes; it
 * is written this way because it states the intent, and because a future
 * fractional tier value would make the order start to matter.
 *
 * EXOTIC IS DELIBERATELY ABSENT, and this is the part not to "fix" later.
 * Exotic weapons count as Exotica ("Exotic Weapons count as Exotica for the
 * purposes of gaining XP"), so their tradeValue field renders as XP, not as a
 * price. A tier multiplier there would inflate advancement rather than value.
 */
export const TIER_TRADE_MULTIPLIERS = {
  "Advanced": 2,
};

export function applyTierTradeMultiplier(tradeValue, quality)
{
  let result = Number(tradeValue);
  if(!Number.isFinite(result)) result = 1;
  const m = TIER_TRADE_MULTIPLIERS[quality];
  if(m) result *= m;
  return Math.round(result * 100) / 100;
}

/**
 * BUYER-CONDITIONAL VALUE. Three tags double an item's worth only to a named
 * faction, so the figure depends on who is buying and cannot be baked into
 * tradeValue the way the unconditional multipliers are.
 *
 * They were filed as description text on that reasoning and left there. Matt
 * revisited it 2026-09-05: rather than bury the rule in prose, show a second
 * line under the value giving the doubled figure AND who pays it.
 *
 * AT MOST ONE CAN EVER APPLY. All three are BASIC tags and a weapon rolls
 * exactly one Basic tag, so there is no stacking case and no ordering
 * question — worth stating because the unconditional table above does stack.
 */
export const CONDITIONAL_VALUE_TAGS = {
  "Bone":     { multiplier: 2, buyer: "Cacklemaw and Ghouls" },
  "Nomad's":  { multiplier: 2, buyer: "Faa Nomads" },
  "Ritual":   { multiplier: 2, buyer: "Mystics" },
};

/**
 * The conditional line to show, or null when no such tag is present.
 *
 * Takes the ALREADY-MODIFIED trade value, so the doubling lands on top of
 * whatever the unconditional tags and the tier bonus produced — a Gilded
 * Ritual weapon is worth 2 normally and 4 to a Mystic, not 1 and 2.
 *
 * Deliberately knows nothing about Exotica; the sheet suppresses this line for
 * Exotica, which are not fungible with trade goods at all. Keeping that check
 * out of here is what stops this module and xp-value.js importing each other.
 */
export function conditionalValueOf(tradeValue, tags = [])
{
  // From the tags' sentences since Effect Engine: Weapon Tags chunk 5a
  // (2026-10-05): a LIVE trade-value sentence naming a buyer (`to`) - Bone,
  // Nomad's, Ritual. CONDITIONAL_VALUE_TAGS stays as the book table the
  // parity test (tools/test-weapon-tags.mjs) holds those sentences to.
  for(const tag of tags)
  {
    const s = (WEAPON_TAG_EFFECTS[tag]?.effects ?? []).find(x => !x.baked && x.do?.stat === "trade-value" && x.do.to);
    if(!s) continue;
    const multiplier = Number(String(s.do.amount).replace("x", ""));
    let base = Number(tradeValue);
    if(!Number.isFinite(base)) base = 1;
    return { value: Math.round(base * multiplier * 100) / 100, buyer: s.do.to, tag };
  }
  return null;
}
