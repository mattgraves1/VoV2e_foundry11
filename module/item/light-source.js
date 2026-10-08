/**
 * Token Light from an Item - foundry-system-index.csv "Token Light from an
 * Item", filed and built 2026-09-21.
 *
 * JADE IBIS 15-09-26 gives every new PC "a chemcell torch (no slots)", and
 * describes it twice: "chemcell torches provide a dim green light source for
 * underground exploration. Their battery life is measured in centuries, but
 * they do not deter light-fearing creatures", and "This torch does not use an
 * item slot and does not run out of power, but it confers no additional
 * benefits." RULED 2026-09-21 (Matt): chargen creates one, and "it would be
 * really cool if a button on this item could enable/disable a light emanation
 * on their token (if present)".
 *
 * THE ITEM DECLARES ITS LIGHT, never inferred from its name: a flag
 * `vaarn.lightSource` holding the token light it casts. The button reads the
 * flag, so any other Item given one later gets the control for free.
 *
 * ON OR OFF IS READ FROM THE TOKENS, not stored on the Item. The token is the
 * thing that glows, and a GM switching a light off by hand in the token config
 * must not leave the Item claiming it is on. The Item remembers only which
 * light it casts; `isLit` asks whether a token of the actor on the current
 * scene is casting exactly that light.
 *
 * NO DURATION, NO FUEL. "Does not run out of power." Light Source Duration was
 * DECLINED on 2026-09-08 and nothing here reopens it.
 *
 * THE RADIUS AND COLOUR ARE A CHOICE THE BOOK DOES NOT MAKE. "Dim green light"
 * says dim and green and nothing more. Chosen 2026-09-21 and reported to Matt:
 * dim light only, two grid squares, pale green, low intensity. RADIUS RULED
 * 2026-09-21 (Matt): "extend it to 30 feet (6 grid squares) radius, but dim
 * and your green selection are perfect".
 */
import { remainingItemFlagsOf } from "./remaining-effects.js";

/** The light a chemcell torch casts. Radius in grid squares; see above. */
export const CHEMCELL_LIGHT = { dimSquares: 6, color: "#7dff9b", alpha: 0.35 };

/** The Item chargen gives every new PC. */
export function chemcellTorchItem()
{
  return {
    name: "Chemcell Torch",
    type: "item",
    img: "icons/svg/light.svg",
    system: {
      slots: 0,
      quantity: 1,
      description: "<p>A chemcell torch that attaches to their clothing (no slots).</p>"
        + "<p>Chemcell torches provide a dim green light source for underground exploration. Their battery life is measured in centuries, but they do not deter light-fearing creatures.</p>"
    },
    flags: { vaarn: { lightSource: { ...CHEMCELL_LIGHT } } }
  };
}

/** The declared light, or null. */
export function lightSourceOf(item)
{
  // From its sentence since Remaining Sources chunk 2d (2026-10-07).
  const l = remainingItemFlagsOf(item).lightSource;
  return l && Number(l.dimSquares) > 0 ? l : null;
}

/** The token light data this source casts on a scene with `gridDistance` units per square. */
export function tokenLightFor(source, gridDistance = 5)
{
  return {
    dim: Number(source.dimSquares) * Number(gridDistance || 5),
    bright: 0,
    color: source.color ?? null,
    alpha: Number(source.alpha ?? 0.5),
    animation: { type: null }
  };
}

/** The same light, switched off. Only dim and bright: colour stays for the next time. */
export const LIGHT_OFF = { dim: 0, bright: 0 };

/** Is this token casting this source's light? Compared on the dim radius and colour. */
export function tokenCasts(tokenLight, source, gridDistance = 5)
{
  const want = tokenLightFor(source, gridDistance);
  return Number(tokenLight?.dim ?? 0) === want.dim && Number(tokenLight?.dim ?? 0) > 0
    && String(tokenLight?.color ?? "").toLowerCase() === String(want.color ?? "").toLowerCase();
}

/* -------------------------------------------------------------------------- */
/*  Foundry-side. Not reached by the offline test.                            */
/* -------------------------------------------------------------------------- */

/** The actor's tokens on the viewed scene. */
function tokensOf(actor)
{
  const scene = game.scenes?.viewed ?? game.scenes?.active;
  return scene ? scene.tokens.filter(t => t.actorId === actor.id) : [];
}

export function isLit(item)
{
  const source = lightSourceOf(item);
  const actor = item?.parent;
  if (!source || !actor) return false;
  const g = (game.scenes?.viewed ?? game.scenes?.active)?.grid?.distance ?? 5;
  return tokensOf(actor).some(t => tokenCasts(t.light, source, g));
}

/**
 * Switch the light on every token of the actor on the viewed scene. Returns
 * how many tokens changed, so the caller can say "no token" rather than
 * pretending something lit.
 */
export async function toggleLight(item)
{
  const source = lightSourceOf(item);
  const actor = item?.parent;
  if (!source || !actor) return 0;
  const scene = game.scenes?.viewed ?? game.scenes?.active;
  const tokens = tokensOf(actor);
  if (!scene || !tokens.length) return 0;
  const g = scene.grid?.distance ?? 5;
  const on = !tokens.some(t => tokenCasts(t.light, source, g));
  const light = on ? tokenLightFor(source, g) : LIGHT_OFF;
  await scene.updateEmbeddedDocuments("Token", tokens.map(t => ({ _id: t.id, light })));
  return { changed: tokens.length, on };
}
