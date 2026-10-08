/**
 * The pipeline's damage entry, reachable without importing the pipeline -
 * Effect Engine: Shared Pipelines, chunk 2 (2026-10-05).
 *
 * WHY A SEPARATE FILE WITH NO IMPORTS. hp-pipeline.js imports from a dozen
 * modules (compelled-save, attack-properties, the protector and watchdog...),
 * and several of THEM need to deal damage. Importing the pipeline back would
 * close an import cycle, and a cycle changes the order modules are evaluated
 * in: found in testing the first draft, where affliction-data.js read
 * TAKES_DOUBLE_DAMAGE before attack-properties.js had defined it - a load-time
 * failure the browser would hit as surely as Node. This file imports nothing;
 * it hands the call to a sheet, and the character sheet already holds the
 * pipeline (its _dealDamage method).
 *
 * Same signature and meaning as hp-pipeline.js dealDamage.
 */
export function dealDamage(target, amount, opts = {})
{
  // The source's sheet if it has the pipeline, else the target's: a vehicle's
  // sheet does not, and damage must never vanish for want of the right sheet.
  const sheet = [opts.source?.sheet, target?.sheet].find(s => s?._dealDamage);
  if (!sheet) { console.error("Vaarn | dealDamage: no sheet with the HP pipeline for", target?.name); return null; }
  return sheet._dealDamage(target, amount, opts);
}

/**
 * The one kill route (hp-pipeline.js kill, Shared Pipelines chunk 4), reached
 * the same way, through the target's sheet: every actor sheet here (npc,
 * vehicle) extends the character sheet that holds the pipeline.
 */
export function kill(target, opts = {})
{
  const sheet = target?.sheet;
  if (!sheet?._kill) { console.error("Vaarn | kill: no sheet with the HP pipeline for", target?.name); return null; }
  return sheet._kill(target, opts);
}
