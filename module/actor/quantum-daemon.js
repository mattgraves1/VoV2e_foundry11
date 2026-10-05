/**
 * Quantum Daemon creation, moved out of macros/generate-quantum-daemon.js on
 * 2026-09-27 so a vault's Quantum Daemon special room can make one too
 * (Special Room Follow-ups, RULED 2026-09-27 by Matt: a Lesser daemon). The
 * macro keeps its dialog and calls this; the rules are unchanged - see that
 * macro's header for why Level, AV and Morale are rolled on the sheet.
 *
 * Returns the npc Actor, created in the "Generated Creatures" folder.
 */

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export async function createQuantumDaemon(size)
{
  const { DAEMON_SIZES, DAEMON_IDENTITY, DAEMON_ATTACKS_ABILITIES } =
    await import("/systems/vaarn/module/actor/quantum-daemon-data.js");
  const { rolledStatItems, rolledFormula } = await import("/systems/vaarn/module/actor/rolled-stat.js");
  const { attackWeaponItem } = await import("/systems/vaarn/module/actor/generated-gear.js");
  const { specialItems, DAEMON_INCORPOREAL_ENTRY, DAEMON_DEFENSES, daemonDefenseFlags, defenseNoteItem } = await import("/systems/vaarn/module/actor/generated-specials.js");

  const conf = DAEMON_SIZES[size];
  const identity = pick(DAEMON_IDENTITY);
  const picks = [];
  for(let i = 0; i < conf.rolls; i++) picks.push(pick(DAEMON_ATTACKS_ABILITIES));

  const abilities = {};
  for(const k of ["str", "dex", "con", "int", "psy", "ego"]) abilities[k] = { value: 0, max: 10, woundDamage: 0 };
  const creatureTypes = { biological: false, synthetic: false, psychic: false, fungal: false, mineral: false, hypergeometric: false, outsider: true };

  const r = conf.rolled;
  const bioLines =
  [
    `<p><b>Size:</b> ${size} Quantum Daemon</p>`,
    `<p><b>Appearance:</b> ${identity.appearance}</p>`,
    `<p><b>Hue:</b> ${identity.hue}</p>`,
    `<p><b>Level</b> ${rolledFormula(r.level)} / <b>AV</b> ${rolledFormula(r.av)} / <b>Morale</b> +${rolledFormula(r.morale)} — built at the fixed part; use Roll for Level, Roll for AV and Roll for Morale. HP is 4 per Level.</p>`,
    `<p><i>Incorporeal: the Daemon does not actually exist and cannot be harmed nor harm others unless forced to manifest itself.</i></p>`
  ];
  picks.forEach((p, i) =>
  {
    const n = picks.length > 1 ? ` ${i + 1}` : "";
    bioLines.push(`<p><b>Attack${n}:</b> ${p.attack}</p><p><b>Ability${n}:</b> ${p.ability}</p>`);
  });

  let folder = game.folders.find(f => f.name === "Generated Creatures" && f.type === "Actor");
  if(!folder) folder = await Folder.create({ name: "Generated Creatures", type: "Actor" });

  const actorCls = getDocumentClass("Actor");
  const actor = await actorCls.create(
  {
    name: identity.name,
    type: "npc",
    folder: folder.id,
    // its immunities as Actor flags, the shape Generate Monster's Special Defenses have (chunk 2)
    flags: { vaarn: daemonDefenseFlags(picks.map(p => p.ability)) },
    system:
    {
      level: { value: r.level.base, min: 0 },
      health: { value: 0, min: 0, max: 0 },
      armor: { value: r.av.base, bonus: 0 },
      morale: { value: r.morale.base, max: 20, min: 0, mode: "", note: "" },
      enc: "1",
      abilities,
      creatureTypes,
      biography: bioLines.join("")
    },
    // its attacks with plain dice as natural weapons (Generated Gear and
    // Attacks as Items, step 2); the others, and its abilities, stay in the
    // biography until step 3. One weapon per distinct attack: a Greater rolls twice.
    items: [...rolledStatItems(conf), ...[...new Set(picks.map(p => p.attack))].map(attackWeaponItem).filter(Boolean),
      // step 3: its attacks and abilities that a Bestiary creature already declares (generated-specials.js)
      ...specialItems(picks.flatMap(p => [p.attack, p.ability]), { name: identity.name, level: r.level.base, types: ["outsider"] }),
      // a note Item per immunity, as Generate Monster's Special Defenses get (RULED 2026-10-04)
      ...[...new Set(picks.map(p => p.ability))].filter(a => DAEMON_DEFENSES[a]).map(a => defenseNoteItem(a, "Ability"))]
  });

  // INCORPOREAL, both sides (RULED 2026-10-04, Matt): on the Active Effects
  // board from the start, so it takes and deals no damage until the Referee
  // removes the entry when the Daemon is forced to manifest.
  const { addEntry } = await import("/systems/vaarn/module/time/effect-board.js");
  await addEntry(actor, DAEMON_INCORPOREAL_ENTRY);

  return actor;
}
