/**
 * Hit-Count Progression — foundry-system-index.csv "Hit-Count Progression",
 * RULED 2026-09-27 (Matt).
 *
 * WHAT THE BOOK STATES, the Desiccator's Desiccate: "A biological target loses
 * the water in their body. After one hit, they are Deprived due to thirst.
 * After two hits, they lose d6 CON as the water in their organs is extracted.
 * A third hit is lethal." An attack whose effect depends on how many times it
 * has already landed on the same target.
 *
 * THE RULINGS:
 *   - ONE COUNT PER TARGET, not per attacker: hits from any Desiccator add up.
 *     So the count lives on the TARGET, keyed by the declaration's `key`.
 *   - NO AUTOMATIC RESET. The count is an Active Effect Board entry on the
 *     target and stays until the Referee removes it. Removing it touches
 *     nothing else - the Deprived a stage switched on is its own entry.
 *   - THE LETHAL STAGE POSTS "is dead" for a character, as Amaranthine Venom's
 *     second dose does, with Fatality Suppression honoured; HP is not changed.
 *     A CREATURE is taken to 0 HP through the normal pipeline, as a named
 *     wound's zeroHp does for one.
 *   - A creature takes the same stages as a character.
 *   - A target outside the declared creature types gets nothing and no line
 *     (Matt: don't telegraph).
 *
 * THE DECLARATION, on a bestiary ability (bestiary-data.js), copied onto the
 * weapon's flags.vaarn.hitProgression by bestiary-build.js:
 *   { kind: "hitProgression", key, label, targets: [types],
 *     stages: [ { deprived: true } | { abilityDamage: { ability, dice } }
 *               | { lethal: true }, ... ] }
 * Stage N applies on hit N. A hit past the last stage applies the last again.
 */
import { entriesOf, addEntry, updateEntry } from "../time/effect-board.js";
import { setDeprived, isDeprived } from "../actor/deprived.js";
import { hasAnyCreatureType } from "../item/attack-properties.js";
import { suppressesDeath, suppressionMsg } from "./fatality.js";

function post(actor, content)
{
  return ChatMessage.create({ user: game.user?._id, speaker: ChatMessage.getSpeaker({ actor }), content });
}

/** The board entry holding this target's count for one declaration, or null. */
export function hitCountEntry(actor, key)
{
  return entriesOf(actor).find(e => e.hitCount?.key === key) ?? null;
}

/** Which stage hit number `count` applies - the last one repeats past the end. */
export function stageFor(stages, count)
{
  if (!stages?.length || count < 1) return null;
  return stages[Math.min(count, stages.length) - 1];
}

/**
 * Resolve one hit of `item` on `token`. `applyAbilityDamage(specs, tokens)` is
 * the attacking sheet's _applyAbilityDamage, so a stage's loss is rolled and
 * written exactly as every other on-hit ability loss is.
 */
export async function applyHitProgression(attacker, item, token, { applyAbilityDamage } = {})
{
  const spec = item?.flags?.vaarn?.hitProgression;
  const target = token?.actor;
  if (!spec?.stages?.length || !target) return;
  if (spec.targets?.length && !hasAnyCreatureType(target, spec.targets)) return;

  const label = spec.label || item.name;
  const of = spec.stages.length;
  const existing = hitCountEntry(target, spec.key);
  const count = Number(existing?.hitCount?.count ?? 0) + 1;
  const text = `${Math.min(count, of)} of ${of} hits from ${item.name}. Stays until the Referee removes it.`;
  if (existing)
    await updateEntry(target, existing.id, { hitCount: { key: spec.key, count }, text });
  else
    await addEntry(target, {
      name: label, text,
      note: "Hit-Count Progression. Nothing clears it on its own; removing it leaves any Deprived in place.",
      startTime: game?.time?.worldTime ?? 0,
      hitCount: { key: spec.key, count }
    });

  const stage = stageFor(spec.stages, count);
  const head = `<b>${item.name}</b> hit ${Math.min(count, of)} of ${of}`;

  if (stage.deprived)
  {
    const already = isDeprived(target);
    await setDeprived(target, true);
    return post(target, `${head} — <b>Deprived</b>${stage.text ? ` ${stage.text}` : ""}${already ? " (already Deprived)" : ""}.`);
  }

  if (stage.abilityDamage)
  {
    await post(target, `${head}${stage.text ? ` — ${stage.text}` : ""}`);
    return applyAbilityDamage?.([{ ability: stage.abilityDamage.ability, dice: stage.abilityDamage.dice,
                                   source: `${attacker?.name ?? "The attacker"}'s ${item.name}` }], [token]);
  }

  if (stage.lethal)
  {
    if (target.type !== "character")
    {
      await post(target, `${head} — lethal.`);
      const hp = Number(target.system?.health?.value ?? 0);
      if (hp > 0) await target.sheet?._resolveHPChange(target, hp, 0, { toZero: true });
      return;
    }
    return post(target, suppressesDeath(target)
      ? suppressionMsg(`hit ${count} of <b>${item.name}</b> is lethal`)
      : `is <b>dead</b> — ${head}, and that hit is lethal.`);
  }
}
