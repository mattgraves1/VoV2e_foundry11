/**
 * What a Long Rest WILL do, worked out without doing any of it — foundry-
 * system-index.csv "Rest and Recovery", the pre-rest preview RULED 2026-09-24
 * (Matt).
 *
 * WHY THIS FILE EXISTS. The Long Rest dialog shows each person's outcome before
 * the player clicks Rest, and longRest then carries out exactly that. Both read
 * this one function, so the preview cannot say one thing and the rest do
 * another - a second copy of the decisions, however careful, would drift the
 * first time either changed. It READS ONLY: no document is written here, which
 * is also what lets tools/test-rest-plan.mjs drive every case in node.
 *
 * THE RATIONS ARE PORTIONED OUT INDIVIDUALLY (RULED 2026-09-24, Matt): the
 * character and each companion that eats get their own share, chosen in the
 * dialog, and the rest is NEVER refused for want of rations - "one may go
 * hungry, but others can eat". It also ends the old fixed order (the owner
 * first, the companions from what was left).
 *
 * GOING WITHOUT (RULED 2026-09-24, Matt):
 *   - no food: the character rests but gains no benefit (no HP, no recovery,
 *     no day-scale state cleared).
 *   - no water, a Biological character: no benefit, and Deprived at once
 *     (Core Rules/Water.md: "Biological PCs must drink one ration of water
 *     every day. Failure to do so will result in the character becoming
 *     Deprived."). The three days to death are the Deprived row's own fuse.
 *   - no water, a Faa Nomad: no benefit; their three-day Faa lapse runs, and
 *     Deprived comes only when it does (Desert Metabolism).
 *   - no water, a character that does not drink: nothing.
 *   - a companion: fed whole or not at all, and an unfed day counts toward
 *     its leaving, as companion-upkeep.js always did.
 * And the rules already built stay as they were: a diet item replaces the
 * meal (or the water, for Vampiric's blood), a doubled draw half met rests
 * and then wakes Deprived (Gills, the Fabricator Stoma), a Lithling or Synth
 * neither eats nor drinks, a no-heal rule withholds only the HP, standing
 * watch heals d8 + CON, Janus Lenses half.
 *
 * PICKS. `meal` and `water` each name what the character takes: GROUP (any
 * food or water, the plain ration first, exactly as rest.js spends), a diet
 * Item by name, or NONE; with
 * a count up to the draw. `fed` maps a companion's id to true or false.
 */

import { FOOD_RATION, WATER_RATION, HALF_LONG_REST, rationKinds, rationKindsFor,
         rationDrawFor, dietRationsFor, rationFreeRule, countOf, isMealFor } from "./rest.js";
import { isDeprived, noHealRule } from "./deprived.js";
import { hasCondition } from "../time/stateful-effect.js";
import { upkeepPlan, unfedDaysOf, companionDiet } from "./companion-upkeep.js";

export const GROUP = "group";
export const NONE  = "none";

/** The Faa Nomad's water lapse (lapse-data.js) - the key the rest starts. */
export const FAA_WATER_LAPSE = "faa-water";

/** Does this character need water at all? Biological does (Water.md). A
 *  character with no type ticked is treated as Biological, since every
 *  ancestry that eats is (chargen-data.js ANCESTRY_CREATURE_TYPES). */
export function drinksWater(actor)
{
  const t = actor?.system?.creatureTypes ?? {};
  return !!t.biological || !Object.values(t).some(Boolean);
}

/** The concrete Items one pick draws on, in the order they are spent. */
function kindsFor(actor, side, item)
{
  if(item === GROUP) return rationKindsFor(actor, side === "food" ? FOOD_RATION : WATER_RATION);
  if(item === NONE || !item) return [];
  return [item];
}

/** The character's picks when nothing has been chosen: fed in full if the pack
 *  allows, their own diet Item where they carry it. */
export function defaultPicks(actor)
{
  const picks = { meal: { item: NONE, count: 0 }, water: { item: NONE, count: 0 }, fed: {} };
  const stock = stockOf(actor);
  if(rationFreeRule(actor)) return withCompanions(actor, picks, stock);

  const foodDraw  = rationDrawFor(actor, FOOD_RATION).count;
  const waterDraw = rationDrawFor(actor, WATER_RATION).count;
  const diets = dietRationsFor(actor);
  const foodDiet  = diets.find(d => d.replaces !== "water" && (stock.get(d.item) ?? 0) > 0);
  const waterDiet = diets.find(d => d.replaces === "water" && (stock.get(d.item) ?? 0) > 0);

  const take = (side, item, draw) =>
  {
    const have = kindsFor(actor, side, item).reduce((n, k) => n + (stock.get(k) ?? 0), 0);
    const count = Math.min(draw, have);
    return count > 0 ? { item, count } : { item: NONE, count: 0 };
  };

  if(foodDiet) picks.meal = take("food", foodDiet.item, foodDraw);
  else picks.meal = take("food", GROUP, foodDraw);

  if(drinksWater(actor))
    picks.water = waterDiet ? take("water", waterDiet.item, waterDraw) : take("water", GROUP, waterDraw);

  return withCompanions(actor, picks, stock);
}

/** Default the companions: everyone who fits after the character's share,
 *  strict needs (the Glue Worm's Raw Meat) first, then by name. */
function withCompanions(actor, picks, stock)
{
  const { eaters } = upkeepPlan(actor);
  const order = [...eaters].sort((a, b) =>
    (strictNeeds(b).length > 0) - (strictNeeds(a).length > 0) || a.actor.name.localeCompare(b.actor.name));
  const tried = {};
  for(const e of order)
  {
    tried[e.actor.id] = true;
    const trial = planLongRest(actor, { ...picks, fed: { ...picks.fed, ...tried } });
    if(trial.over.length) tried[e.actor.id] = false;
  }
  picks.fed = tried;
  return picks;
}

const strictNeeds = e => e.needs.filter(n => rationKinds(n).length === 1);

/** Everything the character carries that anyone could eat or drink, by Item. */
export function stockOf(actor)
{
  const names = new Set([...rationKindsFor(actor, FOOD_RATION), ...rationKindsFor(actor, WATER_RATION),
                         ...rationKinds(FOOD_RATION), ...rationKinds(WATER_RATION),
                         ...dietRationsFor(actor).map(d => d.item)]);
  for(const e of upkeepPlan(actor).eaters) for(const n of e.needs) for(const k of rationKinds(n)) names.add(k);
  return new Map([...names].map(n => [n, countOf(actor, n)]));
}

/**
 * Take `count` from `kinds` in order out of `stock` (mutated). Returns the
 * spends and how many could not be met.
 */
function draw(stock, kinds, count)
{
  const spends = [];
  let left = count;
  for(const k of kinds)
  {
    if(left <= 0) break;
    const n = Math.min(left, stock.get(k) ?? 0);
    if(n > 0) { spends.push({ item: k, count: n }); stock.set(k, stock.get(k) - n); left -= n; }
  }
  return { spends, short: left };
}

/**
 * The whole rest, worked out. Returns:
 *   character  - what they eat and drink, and the outcome (see below)
 *   companions - per eater: fed or not, what it takes, and the outcome
 *   exempt, unknown - companions outside the rule, as upkeepPlan says
 *   spends     - every Item and count the rest will take from the pack
 *   over       - picks the pack cannot cover, [{who, text}]; empty when fine
 */
export function planLongRest(actor, picks = null, { onWatch = false } = {})
{
  picks = picks ?? defaultPicks(actor);
  const stock = stockOf(actor);
  const over = [];
  const spends = [];
  const c = planCharacter(actor, picks, onWatch);

  // THE CHARACTER'S STRICT PICKS FIRST, then every companion's strict need,
  // then the groups - the order that keeps a diet Item for whoever can eat
  // nothing else (the Glue Worm lesson, Group 330.10).
  const { eaters, exempt, unknown } = upkeepPlan(actor);
  const fedEaters = eaters.filter(e => picks.fed?.[e.actor.id]);
  const charDraws = [["food", picks.meal], ["water", picks.water]]
    .filter(([, p]) => p && p.item !== NONE && p.count > 0 && !c.rationFree);
  const byWho = new Map();
  const take = (who, name, kinds, count, label) =>
  {
    const r = draw(stock, kinds, count);
    spends.push(...r.spends);
    byWho.set(who, [...(byWho.get(who) ?? []), ...r.spends]);
    if(r.short > 0) over.push({ who: name, text: `${label}: ${r.short} more than carried` });
  };
  for(const [side, p] of charDraws.filter(([, p]) => p.item !== GROUP))
    take("character", actor.name, kindsFor(actor, side, p.item), p.count, `${p.item}`);
  for(const e of fedEaters) for(const n of strictNeeds(e)) take(e.actor.id, e.actor.name, [n], 1, n);
  for(const [side, p] of charDraws.filter(([, p]) => p.item === GROUP))
    take("character", actor.name, kindsFor(actor, side, GROUP), p.count, side === "food" ? "food" : "water");
  for(const e of fedEaters) for(const n of e.needs.filter(n => rationKinds(n).length > 1))
    take(e.actor.id, e.actor.name, rationKinds(n), 1, n === FOOD_RATION ? "food" : "water");
  c.spends = merge(byWho.get("character") ?? []);

  const companions = eaters.map(e =>
  {
    const fed = !!picks.fed?.[e.actor.id];
    const days = unfedDaysOf(e.actor) + (fed ? 0 : 1);
    return { actor: e.actor, kind: e.kind, needs: e.needs, fuse: e.fuse, leaves: e.leaves, fed,
             diet: companionDiet(e.actor), unfedDays: fed ? 0 : days, leavesNow: !fed && days >= e.fuse,
             noHeal: noHealRule(e.actor), spends: merge(byWho.get(e.actor.id) ?? []) };
  });

  return { character: c, companions, exempt, unknown, spends: merge(spends), over };
}

function merge(spends)
{
  const m = new Map();
  for(const s of spends) m.set(s.item, (m.get(s.item) ?? 0) + s.count);
  return [...m].map(([item, count]) => ({ item, count }));
}

/**
 * The character's own outcome. Fields:
 *   rationFree  - the rule name when they neither eat nor drink (Lithling, Synth)
 *   deprivedNow - already Deprived: no benefit from the rest (Deprivation.md)
 *   benefit     - whether the rest does them any good at all
 *   heal        - "full" | "watch" | "half" | "none"
 *   healWhy     - why HP is withheld when benefit holds but heal is none
 *   noBenefitWhy- the reasons there is no benefit
 *   deprived    - reasons they become Deprived after the rest, one line each
 *   faaLapse    - the Faa's three-day water lapse runs (they did not drink)
 *   faaDrank    - a Faa Nomad who drank: their lapse is met
 *   clears      - whether the day-scale state (lockouts, daily pools) clears
 *   offerRecovery - the book's full-HP either/or is offered afterwards
 */
export function planCharacter(actor, picks, onWatch = false)
{
  const max = actor.system.health.max;
  const atFullHp = actor.system.health.value >= max;
  const rule = rationFreeRule(actor);
  if(rule)
    return { rationFree: rule, deprivedNow: false, benefit: false, heal: "none", healWhy: rule,
             noBenefitWhy: [], deprived: [], faaLapse: false, faaDrank: false, clears: true,
             offerRecovery: true, atFullHp };

  const deprivedNow = isDeprived(actor);
  const foodDraw  = rationDrawFor(actor, FOOD_RATION);
  const waterDraw = rationDrawFor(actor, WATER_RATION);
  const diets = dietRationsFor(actor);
  const meal  = picks.meal  ?? { item: NONE, count: 0 };
  const water = picks.water ?? { item: NONE, count: 0 };
  const faa = actor.system.ancestry === "Faa Nomad";
  const needsWater = drinksWater(actor);

  const ate   = meal.item !== NONE && meal.count > 0;
  const drank = water.item !== NONE && water.count > 0;
  const noBenefitWhy = [];
  const deprived = [];
  const src = draw => draw.sources.length ? ` — <b>${draw.sources.join("</b>, <b>")}</b>` : "";

  if(deprivedNow) noBenefitWhy.push("already <b>Deprived</b>");
  if(!ate) noBenefitWhy.push("no food");
  let faaLapse = false;
  if(needsWater && !drank)
  {
    noBenefitWhy.push("no water");
    if(faa) faaLapse = true;
    else deprived.push("goes without water (thirst)");
  }
  // A DOUBLED DRAW NOT MET IN FULL - Gills, the Fabricator Stoma (RULED
  // 2026-09-24): Deprived, whether they had some or none of it.
  if(foodDraw.count > 1 && meal.count < foodDraw.count)
    deprived.push(`has only ${ate ? meal.count : 0} of the ${foodDraw.count} rations of food they need${src(foodDraw)}`);
  if(needsWater && waterDraw.count > 1 && water.count < waterDraw.count && drank)
    deprived.push(`has only ${water.count} of the ${waterDraw.count} rations of water they need${src(waterDraw)}`);

  // DIETS. A water-side diet unmet (Vampiric's blood) is Deprived; a food-side
  // one unmet withholds the HP from an ordinary meal (Obligate Carnivore,
  // Lithovore) - "cannot heal using other types of food".
  const waterDietMissed = diets.filter(d => d.replaces === "water" && d.onMiss === "deprived" && water.item !== d.item);
  for(const d of waterDietMissed) deprived.push(`goes without <b>${d.item}</b> — <b>${d.source}</b>`);
  const foodDietMissed = diets.filter(d => d.replaces !== "water" && d.onMiss === "noHeal" && ate && meal.item !== d.item);
  const foodDietDeprived = diets.filter(d => d.replaces !== "water" && d.onMiss === "deprived" && meal.item !== d.item);
  for(const d of foodDietDeprived) deprived.push(`goes without <b>${d.item}</b> — <b>${d.source}</b>`);

  const benefit = noBenefitWhy.length === 0;
  let heal = "none", healWhy = null;
  const noHeal = noHealRule(actor);
  if(benefit)
  {
    if(noHeal) healWhy = noHeal;
    else if(foodDietMissed.length)
      healWhy = `ate no ${foodDietMissed.map(d => `<b>${d.item}</b>`).join(" or ")}, and cannot heal using other types of food (<b>${foodDietMissed.map(d => d.source).join("</b>, <b>")}</b>)`;
    else if(onWatch) heal = "watch";
    else if(hasCondition(actor, HALF_LONG_REST)) heal = "half";
    else heal = "full";
  }

  return { rationFree: null, deprivedNow, benefit, heal, healWhy, noBenefitWhy,
           deprived: deprivedNow ? [] : deprived, faaLapse, faaDrank: faa && drank,
           clears: benefit, offerRecovery: benefit && (atFullHp || !!noHeal), atFullHp,
           foodDraw, waterDraw, needsWater, meal, water };
}

/** One line of plain words for the dialog's outcome cell - the character. */
export function characterOutcomeText(c)
{
  if(c.rationFree) return `neither eats nor drinks; regains no HP (<b>${c.rationFree}</b>)`;
  const parts = [];
  if(!c.benefit) parts.push(`no benefit from the rest (${c.noBenefitWhy.join(", ")})`);
  else if(c.healWhy) parts.push(`rests, but regains no HP (${c.healWhy})`);
  else if(c.heal === "watch") parts.push("stood watch: regains d8 + CON");
  else if(c.heal === "half") parts.push("regains half their maximum HP");
  else parts.push(c.atFullHp ? "rests (already at full HP)" : "restores all lost HP");
  if(c.deprived.length) parts.push(`then <b>Deprived</b>: ${c.deprived.join("; ")}`);
  if(c.faaLapse) parts.push("a day without water on the Faa's three-day lapse");
  return parts.join("; ");
}

/** The same for a companion. */
export function companionOutcomeText(e)
{
  if(e.fed) return e.noHeal ? `eats, but regains no HP (<b>${e.noHeal}</b>)` : "eats and rests";
  return e.leavesNow
    ? `goes unfed — ${e.unfedDays} of ${e.fuse} days: it ${e.leaves}`
    : `goes unfed — ${e.unfedDays} of ${e.fuse} days`;
}

/**
 * The Short Rest dialog's outcome line for the ration picked (the pre-rest
 * preview, RULED 2026-09-24, Matt). The same gates shortRest applies, read
 * without acting: a ration-free ancestry, Deprived or a no-heal rule, no
 * ration, then d8 + CON.
 */
export function shortRestOutcomeText(actor, ration, { rotting = false } = {})
{
  const rule = rationFreeRule(actor);
  if(rule) return `neither eats nor drinks; regains no HP (<b>${rule}</b>)`;
  if(isDeprived(actor)) return "no rest can be taken: <b>Deprived</b> - cannot benefit from rests";
  const noHeal = noHealRule(actor);
  if(noHeal) return `no rest can be taken: cannot heal (<b>${noHeal}</b>)`;
  if(!ration || countOf(actor, ration) <= 0) return "no ration: no rest can be taken";
  const eats = `1 ${ration}`;
  const full = actor.system.health.value >= actor.system.health.max;
  rotting = rotting && isMealFor(actor, ration);
  return `spends ${eats}; ${full ? "already at full HP" : `regains d8 + CON${rotting ? ", doubled by <b>Detritivore</b>" : ""}`}`;
}
