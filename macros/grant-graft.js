/**
 * Vaarn: Grant Graft
 *
 * GM tool for the Neobloom Grafting Bloomboon — foundry-system-index.csv
 * "Grafted Limb Creation". The Referee adjudicates the graft in play and puts
 * the part on the sheet here (RULED 2026-09-24, Matt); the rules and the Item
 * shapes are in module/actor/graft.js.
 *
 * Three sources, copy first:
 *   - a natural attack of a biological creature in the Bestiary, copied as
 *     the pack built it ("2 x Claw" becomes "Grafted Claw");
 *   - a mutation whose natural weapon or AV is already implemented;
 *   - built by hand: an attack (die, damage type) or a trait (AV, text).
 *
 * One graft per character, and only a character with Grafting is offered.
 * Making the graft starts its daily loss of 1 CON.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to graft a part.
 */

async function openDialog()
{
  const G = await import("/systems/vaarn/module/actor/graft.js");
  const { MUTATION_TABLE } = await import("/systems/vaarn/module/actor/mutation-data.js");

  const hosts = game.actors.filter(a => a.type === "character" && G.hasGrafting(a));
  if(!hosts.length)
  {
    ui.notifications.warn("No character has the Grafting Bloomboon.");
    return;
  }

  const pack = game.packs.get("vaarn.bestiary");
  const parts = G.creatureParts(pack ? await pack.getDocuments() : []);
  const mutations = MUTATION_TABLE.filter(e => e.naturalWeapon || e.avBonus);

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const hostOpts = hosts.map(a => `<option value="${a.id}">${esc(a.name)}${a.items.some(G.isGraft) ? " (already grafted)" : ""}</option>`).join("");
  const partOpts = parts.map((p, i) => {
    const types = p.item.system?.damageTypes?.length ? `, ${p.item.system.damageTypes.join("/")}` : "";
    return `<option value="${i}">${esc(p.creature)} — ${esc(p.part)} (${esc(p.item.system?.damageDice ?? "")}${esc(types)})</option>`;
  }).join("");
  const mutOpts = mutations.map((m, i) => `<option value="${i}">${esc(m.name)} — ${m.naturalWeapon
    ? `${esc(m.naturalWeapon.name)}, ${m.naturalWeapon.type} ${esc(m.naturalWeapon.damage)}` : `+${m.avBonus} AV`}</option>`).join("");
  const dieOpts = ["d4", "d6", "d8", "d10", "d12"].map(d => `<option${d === "d6" ? " selected" : ""}>${d}</option>`).join("");
  const typeOpts = [`<option value="">Kinetic (none)</option>`]
    .concat(G.GRAFT_DAMAGE_TYPES.map(t => `<option>${t}</option>`)).join("");

  new Dialog(
  {
    title: "Grant Graft",
    content: `
      <p class="notes">One graft per character. It costs 1 CON every day it stays alive.</p>
      <div class="form-group"><label>Character</label><select id="vaarn-gg-host">${hostOpts}</select></div>
      <div class="form-group"><label>Source</label>
        <select id="vaarn-gg-source">
          <option value="creature">A creature's part (Bestiary)</option>
          <option value="mutation">A mutation's part</option>
          <option value="custom">Build your own</option>
        </select></div>
      <div class="vaarn-gg-pane" data-pane="creature">
        <div class="form-group"><label>Part</label><select id="vaarn-gg-part">${partOpts}</select></div>
        <div class="form-group"><label>Ranged</label><input type="checkbox" id="vaarn-gg-part-ranged"/>
          <span class="notes">Creature attacks are built as melee; tick for a spit, breath or spray.</span></div>
      </div>
      <div class="vaarn-gg-pane" data-pane="mutation" style="display:none">
        <div class="form-group"><label>Mutation</label><select id="vaarn-gg-mut">${mutOpts}</select></div>
      </div>
      <div class="vaarn-gg-pane" data-pane="custom" style="display:none">
        <div class="form-group"><label>Name</label><input type="text" id="vaarn-gg-name" placeholder="e.g. Scorpion Tail"/></div>
        <div class="form-group"><label>Kind</label>
          <select id="vaarn-gg-kind"><option value="attack">Attack</option><option value="trait">Trait</option></select></div>
        <div class="vaarn-gg-kind" data-kind="attack">
          <div class="form-group"><label>Ranged</label><input type="checkbox" id="vaarn-gg-ranged"/></div>
          <div class="form-group"><label>Damage die</label><select id="vaarn-gg-die">${dieOpts}</select></div>
          <div class="form-group"><label>Damage type</label><select id="vaarn-gg-type">${typeOpts}</select></div>
        </div>
        <div class="vaarn-gg-kind" data-kind="trait" style="display:none">
          <div class="form-group"><label>AV bonus</label><input type="number" id="vaarn-gg-av" value="0" min="0"/></div>
        </div>
        <div class="form-group"><label>Text</label><input type="text" id="vaarn-gg-text" placeholder="What else it does — the Referee's ruling"/></div>
      </div>`,
    buttons:
    {
      graft:
      {
        label: "Graft",
        callback: async (html) =>
        {
          const actor = game.actors.get(html.find("#vaarn-gg-host").val());
          const source = html.find("#vaarn-gg-source").val();
          let data;
          if(source === "creature")
          {
            const p = parts[Number(html.find("#vaarn-gg-part").val())];
            if(!p) return ui.notifications.warn("Choose a part.");
            data = G.graftFromCreaturePart(p.creature, p.item, { ranged: html.find("#vaarn-gg-part-ranged").is(":checked") });
          }
          else if(source === "mutation")
            data = G.graftFromMutation(mutations[Number(html.find("#vaarn-gg-mut").val())]);
          else
            data = G.graftCustom({
              kind: html.find("#vaarn-gg-kind").val(),
              name: html.find("#vaarn-gg-name").val(),
              ranged: html.find("#vaarn-gg-ranged").is(":checked"),
              die: html.find("#vaarn-gg-die").val(),
              damageType: html.find("#vaarn-gg-type").val(),
              av: html.find("#vaarn-gg-av").val(),
              text: html.find("#vaarn-gg-text").val()
            });
          const result = await G.createGraft(actor, data);
          if(result.error) return ui.notifications.warn(result.error);
          ui.notifications.info(`Grafted "${result.item.name}" onto ${actor.name}.`);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "graft",
    render: (html) =>
    {
      const panes = () => html.find(".vaarn-gg-pane").each((_, el) =>
        { el.style.display = el.dataset.pane === html.find("#vaarn-gg-source").val() ? "" : "none"; });
      const kinds = () => html.find(".vaarn-gg-kind").each((_, el) =>
        { el.style.display = el.dataset.kind === html.find("#vaarn-gg-kind").val() ? "" : "none"; });
      html.find("#vaarn-gg-source").on("change", panes);
      html.find("#vaarn-gg-kind").on("change", kinds);
    }
  }, { width: 560 }).render(true);
}

if(!game.user.isGM) ui.notifications.warn("Grant Graft is a GM tool.");
else openDialog();
