/**
 * "At 0 DEX ..." - the value-reaches trigger, Effect Engine: Weapon Tags
 * chunk 3 (foundry-system-index.csv "Effect Engine: Weapon Tags", RULED
 * 2026-10-05 by Matt).
 *
 * A sentence `when: { trigger: "value-reaches", value: <ability>, threshold }`
 * applies its state to an actor whose ability is AT OR BELOW the threshold
 * after a hit - whenever it is there, not only when it falls there (ruling B:
 * a creature with no DEX score is frozen by its first Freezing hit). The state
 * is a board entry under the source's own wording ("Frozen solid", "Turned to
 * stone") carrying the registry state, and it LASTS WHILE the ability stays
 * there: the entry's `whileAbility` is checked on every update of the actor,
 * and the entry ends when the ability recovers - a rest, say - unless the
 * Referee ends it first.
 */
import { addEntry, entriesOf, removeEntry } from "../time/effect-board.js";
import { stateByKey } from "./states.js";

const trig = s => (typeof s.when === "string" ? s.when : s.when?.trigger);

/** An actor's current figure for an ability, after its wound damage. */
export function abilityValue(actor, ability)
{
  const v = actor?.system?.abilities?.[ability]?.effective;
  return v === undefined || v === null ? undefined : Number(v);
}

/** Does this value meet a value-reaches sentence's threshold? */
export function reaches(value, threshold = 0)
{
  return value !== undefined && value <= Number(threshold);
}

function say(actor, html)
{
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<b>${actor.name}</b> ${html}` });
}

/**
 * Apply each value-reaches sentence whose threshold the actor now meets, once:
 * an actor already holding that state from this rule is not given a second.
 */
export async function reachValue(actor, sentences, { source = null, item = null } = {})
{
  for (const s of sentences ?? [])
  {
    if (trig(s) !== "value-reaches") continue;
    const ability = s.when.value, threshold = Number(s.when.threshold ?? 0);
    if (!reaches(abilityValue(actor, ability), threshold)) continue;
    const name = s.do?.name ?? stateByKey(s.do?.state)?.label ?? "Effect";
    if (entriesOf(actor).some(e => e.whileAbility && e.name === name)) continue;
    const label = String(ability).toUpperCase();
    const from = item ? ` From <b>${source?.name ?? ""}</b>'s <b>${item.name}</b>.` : "";
    await addEntry(actor, {
      name,
      text: `${s.text ?? ""}${from} <b>Lasts while ${label} is ${threshold} or below.</b>`,
      applied: s.do?.state ? { conditions: [s.do.state] } : null,
      whileAbility: { ability, atMost: threshold },
      sourceActorId: source?.id ?? null, sourceName: source?.name ?? null
    });
    await say(actor, `is <b>${name}</b> — ${stateByKey(s.do?.state)?.label ?? "held"} while ${label} is ${threshold} or below.`);
  }
}

/**
 * End every whileAbility entry whose ability has recovered. Run by the active
 * GM on each actor update, so a rest that heals the ability ends the state.
 */
export async function endRecovered(actor)
{
  for (const e of entriesOf(actor))
  {
    const w = e.whileAbility;
    if (!w) continue;
    const v = abilityValue(actor, w.ability);
    if (v === undefined || reaches(v, w.atMost)) continue;
    await removeEntry(actor, e.id);
    await say(actor, `is no longer <b>${e.name}</b> — ${String(w.ability).toUpperCase()} has recovered.`);
  }
}

/** Called from knave.js at init. */
export function registerValueReaches()
{
  Hooks.on("updateActor", actor =>
  {
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    endRecovered(actor).catch(err => console.error("Vaarn | value-reaches:", err));
  });
}
