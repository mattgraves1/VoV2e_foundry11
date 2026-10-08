/**
 * The condition keys, alone in a file that imports nothing - Effect Engine:
 * Mutations and Ancestry Rules, chunk 2a (2026-10-05).
 *
 * condition-data.js now reads a body's immunities (effects/body.js), which
 * reads sentences (interpret.js), whose named states (states.js) are defined
 * from these keys at load time. With the keys inside condition-data.js that
 * closed a cycle in which states.js read BLIND before it existed. Here they
 * cannot be caught in one. condition-data.js re-exports both, so every
 * existing import is unchanged.
 */
export const BLIND = "blind";
export const ENTANGLED = "entangled";
