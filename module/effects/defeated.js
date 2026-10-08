/**
 * DEFEATED IN THE RUNNING COMBAT - Effect Engine: Shared Pipelines, chunk 4
 * (RULED 2026-10-05, Matt). A creature the pipeline KILLS is marked defeated;
 * a heal that lifts it from 0 or below to above 0 clears the mark. Never a
 * character. Not a creature alive at 0 (an Immortality Injector) or a Spirit
 * faded until sunrise - nothing died. An HP value the GM types does not clear
 * it; the tracker's own toggle does.
 *
 * Moved here from compelled-save.js's dealDeath, the one place that marked a
 * creature before. Imports nothing, so the funnel and the heal path can both
 * reach it without a cycle.
 */

/** The combatant for an actor - a spawned (unlinked) creature by its token. */
function combatantOf(actor)
{
  return game.combat?.combatants?.find(c => c.actor === actor
    || (actor.isToken ? c.tokenId === actor.token?.id : c.actorId === actor.id)) ?? null;
}

/** Mark (or clear) a creature defeated in the running combat. A character is never touched. */
export async function setDefeated(actor, defeated)
{
  if (!actor || actor.type === "character") return;
  const combatant = combatantOf(actor);
  if (combatant && !!combatant.defeated !== defeated) await combatant.update({ defeated });
}
