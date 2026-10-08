/**
 * The named-state registry - Effect Engine: Foundations (foundry-system-index.csv
 * "Effect Engine: Foundations", RULED 2026-10-05 by Matt).
 *
 * WHY ONE REGISTRY. The 2026-10-04 survey found the same state built many ways:
 * Sleep in six shapes, Mind Control a hold from one source and nothing from
 * another, Possessed meaning two unrelated things. The full pass used some
 * eighty state names, mostly the same few states worded differently. Every
 * effect sentence now names a state by its KEY here; a source may still show
 * its own wording ("Frozen solid"), but the state underneath is one of these,
 * defined once.
 *
 * `mechanical: true` means the system reads the state (or will, once its
 * handler lands); `false` means it is a reminder on the board and nothing more,
 * which is still never "nothing" (Named states ruling, 2026-10-04).
 *
 * `aliases` are the book's other wordings for the same state, so a translator
 * can map an old source's free text onto a key (stateForWording).
 *
 * Blind and Entangled keep their existing keys and definitions in
 * actor/condition-data.js; they are listed here so the registry is complete.
 *
 * Pure data and pure functions: no Foundry global, so the offline tests and
 * the build-time rosters can import it.
 */

import { BLIND, ENTANGLED } from "../actor/condition-keys.js";

export const STATES = [
  { key: BLIND,       label: "Blind",       mechanical: true,  aliases: ["blinded", "blindness"],
    note: "Defined in condition-data.js: no ranged attacks, DIS on melee." },
  { key: ENTANGLED,   label: "Entangled",   mechanical: true,  aliases: ["webbed", "netted"],
    note: "Defined in condition-data.js: -5 AV." },
  { key: "unconscious", label: "Unconscious", mechanical: true, aliases: ["knocked out", "shut down", "update required"],
    note: "Helpless. Attacks against them hit automatically (text today)." },
  { key: "asleep",    label: "Asleep",      mechanical: true,  aliases: ["sleeping", "sleep", "resting state", "slumber"],
    note: "As Unconscious, and ends when the sleeper is damaged." },
  { key: "paralysed", label: "Paralysed",   mechanical: true,
    aliases: ["paralyzed", "stasis", "frozen", "frozen solid", "petrified", "statue", "stone", "transfixed", "cannot move", "cannot act"],
    note: "Cannot move or act." },
  { key: "held",      label: "Held",        mechanical: true,
    aliases: ["grabbed", "grappled", "engulfed", "swallowed", "stuck fast", "rooted", "pinned", "strangled", "snared"],
    note: "The hold: held by its source, with an escape save each round where the source gives one." },
  { key: "controlled", label: "Controlled", mechanical: true,
    aliases: ["mind control", "mind controlled", "dominated", "neural puppetry", "puppeted", "commanded", "obey"],
    note: "The mind-control hold: acts as the controller directs, with an escape save where the source gives one." },
  { key: "incorporeal", label: "Incorporeal", mechanical: true, aliases: ["phased", "spirit", "ghostly"],
    note: "Damage rules: immune to all but the exceptions its source names." },
  { key: "invisible", label: "Invisible",   mechanical: false, aliases: ["transparent", "unseen", "camouflaged"] },
  { key: "charmed",   label: "Charmed",     mechanical: false,
    aliases: ["beguiled", "enthralled", "captivated", "friendly and harmless", "overcome with compassion", "indifferent", "pacified"] },
  { key: "possessed", label: "Possessed",   mechanical: true,  aliases: ["possession"],
    note: "The Unquiet Spirit's possession of a body. Not the Quantum Daemon curse." },
  { key: "daemon-possessed", label: "Daemon-Possessed", mechanical: true, aliases: ["daemon possession"],
    note: "The Quantum Daemon curse: a lost day and a Wound. Split from Possessed (2026-10-04)." },
  { key: "deprived",  label: "Deprived",    mechanical: true,  aliases: ["starving", "parched", "dehydrated"] },
  { key: "exhaustion", label: "Exhaustion", mechanical: true,  aliases: ["exhausted"] },
  { key: "berserk",   label: "Berserk",     mechanical: true,  aliases: ["killing frenzy", "frenzy", "battle madness"] },
  { key: "hysteria",  label: "Hysteria",    mechanical: false, aliases: ["laughing"] },
  { key: "babbling",  label: "Babbling",    mechanical: false, aliases: [] },
  { key: "tarantism", label: "Tarantism",   mechanical: false, aliases: ["dancing"] },
  { key: "vomiting",  label: "Vomiting",    mechanical: false, aliases: ["nauseous"] },
  { key: "agony",     label: "Agony",       mechanical: false, aliases: [] },
  { key: "hallucinating", label: "Hallucinating", mechanical: false, aliases: ["mild hallucinations", "severe hallucinations", "hallucinations"] },
  { key: "mute",      label: "Mute",        mechanical: false, aliases: ["loss of language", "cannot speak", "silenced"] },
  { key: "floating",  label: "Floating",    mechanical: false, aliases: ["floating helplessly", "falling skywards", "inverted gravity"] },
];

const BY_KEY = new Map(STATES.map(s => [s.key, s]));

/** The state for a key, or null. */
export function stateByKey(key)
{
  return BY_KEY.get(key) ?? null;
}

/** Every key the registry knows. */
export function stateKeys()
{
  return STATES.map(s => s.key);
}

/**
 * The state a free-text wording means, or null. Matches the label or an alias,
 * ignoring case and anything after a colon ("Frozen: cannot move" is Frozen).
 */
export function stateForWording(text)
{
  const t = String(text ?? "").toLowerCase().split(":")[0].trim();
  if (!t) return null;
  return STATES.find(s => s.label.toLowerCase() === t || s.key === t || s.aliases.includes(t)) ?? null;
}
