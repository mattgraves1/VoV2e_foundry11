/**
 * Hidden Hit Points — foundry-system-index.csv "Hidden Hit Points".
 *
 * Analgesia (JADE IBIS): "You do not feel pain. You do not know your
 * maximum/current HP; the Referee tracks both."
 *
 * RULED 2026-09-23 (Matt): the GM sees the character's HP; it is hidden from
 * PLAYERS only. Every rule that reads or writes HP runs untouched — only what
 * is displayed changes. Three surfaces:
 *
 *   - the sheet: a non-GM sees "?" in both HP boxes (actor-sheet.html,
 *     `hpHidden`), and cannot edit them;
 *   - the token: the health bar is not drawn on a non-GM client, and the
 *     token HUD's input for it is removed;
 *   - chat: a line that prints this actor's HP wraps the numbers in gmHP(),
 *     and the render hook strips that span on a non-GM client. One card, not
 *     a public card plus a whisper, so the table still sees that a rest
 *     happened (ruled). The amount healed or lost stays visible (ruled).
 *
 * Detected by the mutation Item's NAME, the way Blind is (actor-sheet.js), so
 * an Analgesia handed over by hand or granted after chargen counts the same.
 *
 * A UI hide, not a secret: the numbers are in the message content and the
 * actor data. Settled 2026-09-19 (Matt) — that is never a concern here.
 */

export const ANALGESIA = "Analgesia";
const GM_HP_CLASS = "vaarn-gm-hp";

/** True when this actor's HP is kept from its players. */
export function hidesHP(actor)
{
  if(actor?.type !== "character") return false;
  return actor.items.some(i => i.type === "mutation" && i.name === ANALGESIA);
}

/** True when THIS client must not see the actor's HP. */
export function hpHiddenHere(actor)
{
  return !game.user.isGM && hidesHP(actor);
}

/**
 * Wrap the HP-revealing part of a chat line. Unchanged for any other actor,
 * so a call site needs no branch of its own.
 */
export function gmHP(actor, text)
{
  return hidesHP(actor) ? `<span class="${GM_HP_CLASS}">${text}</span>` : text;
}

function isHealthBar(token, bar)
{
  return token.document.getBarAttribute(bar)?.attribute === "health";
}

function refreshBarsOf(actor)
{
  for(const token of actor?.getActiveTokens?.() ?? [])
    token.renderFlags.set({ refreshBars: true });
}

/** Called from the init hook: the Token class must be set before the canvas draws. */
export function registerHiddenHPToken()
{
  const Base = CONFIG.Token.objectClass;
  CONFIG.Token.objectClass = class VaarnToken extends Base
  {
    drawBars()
    {
      super.drawBars();
      if(!hpHiddenHere(this.actor)) return;
      for(const bar of ["bar1", "bar2"])
        if(isHealthBar(this, bar)) this.bars[bar].visible = false;
    }
  };
}

export function registerHiddenHP()
{
  Hooks.on("renderChatMessage", (message, html) =>
  {
    if(!game.user.isGM) html.find(`.${GM_HP_CLASS}`).remove();
  });

  Hooks.on("renderTokenHUD", (hud, html) =>
  {
    const token = hud.object;
    if(!hpHiddenHere(token?.actor)) return;
    for(const bar of ["bar1", "bar2"])
      if(isHealthBar(token, bar)) html.find(`.attribute.${bar}`).remove();
  });

  // Gaining or losing the mutation changes the bar without touching HP, so
  // nothing else would ask the token to redraw it.
  const onItem = item =>
  {
    if(item.type === "mutation" && item.name === ANALGESIA) refreshBarsOf(item.parent);
  };
  Hooks.on("createItem", onItem);
  Hooks.on("deleteItem", onItem);
}
