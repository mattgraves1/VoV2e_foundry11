import { KnaveActorSheet } from "./actor-sheet.js";
import { crewSlots, crewRefusal, attackSource, assignCrew, clearCrew } from "./vehicle-crew.js";
import { levelTradeValue } from "./level-trade-value.js";

/**
 * Vehicle sheet — Vehicle Stat Block Import, 2026-09-18.
 *
 * Extends the character sheet class, not plain ActorSheet as the container
 * does, because a vehicle has to take damage and fire weapons: the chat-card
 * damage buttons call `actor.sheet._resolveHPChange`, and the weapon roll,
 * to-hit against targets and _doDamage all live on KnaveActorSheet. Only the
 * template, the crew controls and the source of the to-hit bonus differ.
 */
export class VaarnVehicleSheet extends KnaveActorSheet
{
  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      classes: ["knave", "sheet", "actor", "vehicle"],
      template: "systems/vaarn/templates/actor/vehicle-sheet.html",
      width: 900,
      height: 620,
      tabs: []
    });
  }

  /** @override */
  getData()
  {
    const data = super.getData();
    const crew = this.actor.system.crew ?? {};
    data.crew = {
      pilotLabel: crew.pilotLabel || "Pilot",
      pilots:  crewSlots(this.actor, "pilots"),
      gunners: crewSlots(this.actor, "gunners"),
      moves:   (crew.pilotSlots ?? 0) === 0,
      firedBy: { self: "itself, at current Hull to hit",
                 pilot: `the ${(crew.pilotLabel || "pilot").toLowerCase()}, with their DEX`,
                 gunner: "the gunner, with their DEX",
                 none: null }[crew.attacks] ?? null
    };
    data.tradeValue = levelTradeValue(this.actor);

    // Vehicle Combat Rules (2026-09-18).
    data.isGM = game.user.isGM;
    data.speedDie = speedDieOf(this.actor);
    data.canRepair = Number(this.actor.system.health.value) < Number(this.actor.system.health.max);
    return data;
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);
    html.find(".vehicle-speed-save").click(ev => this._onSpeedSave(ev));
    if(!this.isEditable) return;
    html.find(".vehicle-speed-die").click(() => this._onSpeedDie());
    html.find(".vehicle-repair").click(() => this._onRepair());
    html.find(".vehicle-crew-clear").click(ev =>
    {
      if(!game.user.isGM) return ui.notifications.warn("Only the Referee assigns crew.");
      const slot = ev.currentTarget.closest("[data-crew-role]");
      clearCrew(this.actor, slot.dataset.crewRole, Number(slot.dataset.crewIndex));
    });
  }

  /**
   * An Actor dropped on a crew slot fills it. Dropped anywhere else on the
   * sheet it does nothing — there is no other meaning for an Actor here, and
   * guessing a slot would put a character in a seat the GM did not choose.
   * @override
   */
  async _onDropActor(event, data)
  {
    const slot = event.target.closest?.("[data-crew-role]");
    if(!slot) return false;
    if(!game.user.isGM)
    {
      ui.notifications.warn("Only the Referee assigns crew.");
      return false;
    }
    const actor = await Actor.implementation.fromDropData(data);
    const refusal = crewRefusal(this.actor, actor);
    if(refusal)
    {
      ui.notifications.warn(`Cannot crew ${this.actor.name}: ${refusal}.`);
      return false;
    }
    await assignCrew(this.actor, slot.dataset.crewRole, Number(slot.dataset.crewIndex), actor);
    return true;
  }

  /**
   * Vehicle Combat Rules (2026-09-18). JADE IBIS p.73: "Make an opposed Speed
   * Save to catch or outrun another vehicle." The roll only: who wins is the
   * table's call, as Opposed Save Resolution was ruled (Matt 2026-09-10), so
   * the card names the target number and decides nothing.
   *
   * A Speed that is a die (the Wind Barge's "+d6") is rolled with the save.
   */
  _onSpeedSave(event)
  {
    const term = speedTerm(this.actor.system.speed);
    if(term.score === null)
    {
      ui.notifications.warn(`${this.actor.name} has no Speed to roll.`);
      return null;
    }
    return this._rollD20(term.score, "Speed Save <i>(opposed: beat 10 + the other vehicle's Speed)</i>", event);
  }

  /**
   * GM roller for a Speed printed as a die. Matt 2026-09-18: the Wind Barge's
   * "+d6, roll each day" makes little sense - a barge's speed would depend on
   * the wind's direction, which the book does not model - so this rolls it on
   * demand and nothing tracks a day.
   *
   * THE ROLL IS WRITTEN INTO SPEED (Matt 2026-09-18), so the Speed Save uses
   * it until the next roll. That overwrites the die in the text, so the die
   * is kept in flags.vaarn.speedDie on the first roll and the roller stays.
   */
  async _onSpeedDie()
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee rolls a vehicle's Speed.");
    const die = speedDieOf(this.actor);
    if(!die) return;
    const r = new Roll(die).evaluate({async: false});
    await this.actor.update({ "system.speed": `+${r.total}`, "flags.vaarn.speedDie": die });
    r.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: `<b>Speed</b> (${die}) — ${this.actor.name}'s Speed is now +${r.total}` });
    return r;
  }

  /**
   * JADE IBIS p.73: "Damaged Vehicles can be repaired with the appropriate
   * spare parts. Allow one day of work per hull point regained."
   *
   * Instant, one Hull a click. The day is spent at the table BEFORE the click,
   * as Matt ruled for hour-long healing (2026-09-12): the GM advances the
   * clock if nothing interrupted. Nothing is consumed - the book names no part.
   */
  async _onRepair()
  {
    if(!game.user.isGM) return ui.notifications.warn("Only the Referee repairs a vehicle.");
    const hp = this.actor.system.health;
    if(Number(hp.value) >= Number(hp.max)) return;
    const now = Number(hp.value) + 1;
    await this.actor.update({ "system.health.value": now });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `repairs <b>1 Hull</b> (now ${now}/${hp.max}) — one day of work, with the appropriate spare parts.` });
  }

  /**
   * Refuse an attack nobody can make BEFORE the roll, so no d20 is posted for
   * it. The book: "Non-sentient Vehicles cannot make attacks without a weapon
   * operator."
   * @override
   */
  _onItemRoll(item, eventTarget, event)
  {
    if(eventTarget.title === "attack")
    {
      const src = attackSource(this.actor);
      if(src.refusal)
      {
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                             content: `<b>${item.name}</b> — ${src.refusal}` });
        return;
      }
    }
    return super._onItemRoll(item, eventTarget, event);
  }

  /** Every vehicle weapon aims the same way, whatever its type. @override */
  _toHitAbilityKey(item)
  {
    return "vehicle";
  }

  /** @override */
  _onAbility_Clicked(ability, event, forceDis = false, forceAdv = false)
  {
    if(ability !== "vehicle") return super._onAbility_Clicked(ability, event, forceDis, forceAdv);
    const src = attackSource(this.actor);
    if(src.mode === "hull")
      return this._rollD20(Number(this.actor.system.health.value) || 0, "Hull", event, forceDis, forceAdv);
    if(src.mode === "crew")
      return this._rollD20(src.actor.system.abilities?.dex?.effective ?? 0,
                           `${src.role} ${src.actor.name}'s DEX`, event, forceDis, forceAdv);
    // Reached only by a path that skips _onItemRoll (Reflecting's roll-back).
    // Rolled plain rather than refused so that path still gets a number; the
    // chat line says why it is +0.
    return this._rollD20(0, "no operator", event, forceDis, forceAdv);
  }
}

/**
 * The leading term of a Speed as printed: "+6" -> { score: 6 }, "-1" ->
 * { score: -1 }, "+d6, roll each day" -> { score: "1d6", die: "1d6" }. Speed
 * stays the book's text field; this reads it at roll time.
 */
export function speedTerm(text)
{
  const m = String(text ?? "").match(/^\s*([+-]?)\s*(\d*)d(\d+)|^\s*([+-]?\d+)/i);
  if(!m) return { score: null, die: null };
  if(m[3])
  {
    const die = `${m[2] || 1}d${m[3]}`;
    return { score: m[1] === "-" ? `-${die}` : die, die };
  }
  return { score: Number(m[4]), die: null };
}

/** The die a vehicle's Speed is rolled on: the stored one, else the printed one. */
export function speedDieOf(actor)
{
  return actor.getFlag("vaarn", "speedDie") ?? speedTerm(actor.system.speed).die;
}
