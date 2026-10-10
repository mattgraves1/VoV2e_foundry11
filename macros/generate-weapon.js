/**
 * Vaarn: Generate Weapon
 *
 * GM-only tool for handing out a fully-tagged weapon during play (loot, a
 * shop's stock, a quest reward) without going through full character
 * creation. Ported from the standalone GM-tools generator
 * (C:\Vaarn\Vaarn\npc-generator.html's "Weapon Generator") — same
 * base-plus-tags algorithm chargen-app.js's _rollWeapon/_rollAdvancedWeapon
 * already use, extended to the Exotic tier chargen never rolls (base rolled
 * at ADV - 2d20, keep the better result - per Weapons - Exotic.md).
 *
 * Creates an UNOWNED Item in the Items sidebar (Matt's call, 2026-08-21 -
 * no "assign to actor" prompt) for the GM to drag onto an actor by hand.
 *
 * Every field is manually overridable (Matt's call, 2026-08-21 while
 * scoping work-queue.txt item 2 — this per-field "leave it blank/Random to
 * roll, or lock a specific value" capability is what makes a static Item
 * compendium unnecessary: a GM can build exactly the weapon they want on
 * demand). Base Weapon, Basic Tag, Advanced Tag, and Exotic Tag each get
 * their own dropdown (Random + every named option); Advanced/Exotic Tag
 * are hidden unless the chosen Quality actually uses them. Locking the
 * Base Weapon skips Exotic's own "roll the base at ADV" step entirely,
 * same as the source tool's "known value = don't roll it" convention.
 *
 * BUG FIX 2026-08-21 (found live-testing 11.8, reported by Matt after a
 * nat-1 on an Exotic weapon jammed instead of breaking): weaponSystem.tags
 * never actually included the literal string "Fragile" for Advanced/Exotic
 * weapons — isFragileTier only drove the "(Fragile)" NAME suffix and the
 * description text, not the tags array itself. actor-sheet.js's nat-1
 * handler decides break-vs-fumble via tags.includes("Fragile"), so every
 * macro-created Advanced/Exotic weapon was silently fumbling instead of
 * breaking. Fixed by adding "Fragile" to the tags array when isFragileTier
 * is true, matching chargen-app.js's own Advanced Weapon boon (which
 * already does this correctly — see its `tags: ["Fragile", ...]` line).
 *
 * REFACTORED 2026-08-23 (work-queue.txt item 1.2) — the actual roll/build
 * logic now lives in module/actor/weapon-roller.js's rollWeapon(), so
 * macros/generate-advanced-exotica.js's "Exotic Melee/Ranged Weapon"
 * Advanced Exotica rows can reuse it verbatim (that table explicitly says
 * "generate an Exotic weapon using the Weapons - Exotic tables"). This
 * macro's own behavior is unchanged — same dialog, same Item created.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open a picker: choose Quality, Base Weapon, and
 * any tags you want locked (or leave them on Random), then Create.
 */

// The roll and the Item data live in module/item/loot-builders.js since
// 2026-09-19 (Treasure Cache Generation), shared with the cache. A
// Polymorphic weapon comes back as two Items whose flags already carry the
// NAME link to each other — a name, not an id, because dragging either half
// onto an actor makes a fresh copy with a new id (weapon-roller.js).
async function generateWeapon(quality, baseChoice, basicTagChoice, advancedTagChoice, exoticTagChoice, faithChoice = null)
{
  const { buildWeapon } = await import("/systems/vaarn/module/item/loot-builders.js");
  const data = await buildWeapon(quality, baseChoice, basicTagChoice, advancedTagChoice, exoticTagChoice, null, faithChoice);
  const created = await getDocumentClass("Item").createDocuments(data);
  const [item, altItem] = created;
  if(altItem)
    ui.notifications.info(`Created "${item.name}"${data.baseNote} and its Polymorphic pair "${altItem.name}" in the Items directory.`);
  else
    ui.notifications.info(`Created "${item.name}"${data.baseNote} in the Items directory.`);
  return item;
}

async function openDialog()
{
  const { MELEE_WEAPONS, RANGED_WEAPONS, BASIC_TAGS, ADVANCED_TAGS, EXOTIC_TAGS } =
    await import("/systems/vaarn/module/actor/chargen-data.js");

  const baseOptions = `<option value="">Random</option>` +
    `<optgroup label="Melee">${MELEE_WEAPONS.map(w => `<option value="Melee|${w.name}">${w.name}</option>`).join("")}</optgroup>` +
    `<optgroup label="Ranged">${RANGED_WEAPONS.map(w => `<option value="Ranged|${w.name}">${w.name}</option>`).join("")}</optgroup>`;
  const tagOptions = (tags) => `<option value="">Random</option>` + tags.map(t => `<option value="${t.name}">${t.name}</option>`).join("");
  // Faith-Named Religious Weapon Tags (RULED 2026-10-09, Matt): the GM may pick the
  // faith a Sacred or Blasphemous weapon names from the world's; Random by default.
  const { worldFaiths } = await import("/systems/vaarn/module/item/weapon-faith.js");
  const faiths = await worldFaiths();
  // Foundry 11 has no foundry.utils.escapeHTML (found in Group 627: the dialog never opened).
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const faithOptions = `<option value="">Random</option>` + faiths.map((w, i) =>
    `<option value="${i}">${esc(w.saved?.name ?? w.faith)} (${esc(w.label)})</option>`).join("");

  const content = `
    <div class="form-group">
      <label>Quality</label>
      <select id="vaarn-wg-quality">
        <option value="Basic">Basic</option>
        <option value="Advanced">Advanced</option>
        <option value="Exotic">Exotic</option>
      </select>
    </div>
    <div class="form-group">
      <label>Base Weapon</label>
      <select id="vaarn-wg-base">${baseOptions}</select>
    </div>
    <div class="form-group">
      <label>Basic Tag</label>
      <select id="vaarn-wg-basic-tag">${tagOptions(BASIC_TAGS)}</select>
    </div>
    <div class="form-group" id="vaarn-wg-faith-group" title="Named by a Sacred or Blasphemous weapon. ${faiths.length ? "The faiths of this world's settlements and holy places." : "No settlement or holy place yet: Random rolls the book's faith tables."}">
      <label>Faith</label>
      <select id="vaarn-wg-faith">${faithOptions}</select>
    </div>
    <div class="form-group" id="vaarn-wg-advanced-tag-group">
      <label>Advanced Tag</label>
      <select id="vaarn-wg-advanced-tag">${tagOptions(ADVANCED_TAGS)}</select>
    </div>
    <div class="form-group" id="vaarn-wg-exotic-tag-group">
      <label>Exotic Tag</label>
      <select id="vaarn-wg-exotic-tag">${tagOptions(EXOTIC_TAGS)}</select>
    </div>`;

  new Dialog(
  {
    title: "Generate Weapon",
    content,
    buttons:
    {
      create:
      {
        label: "Create",
        callback: (html) =>
        {
          const quality = html.find("#vaarn-wg-quality").val();
          const baseChoice = html.find("#vaarn-wg-base").val();
          const basicTagChoice = html.find("#vaarn-wg-basic-tag").val();
          const advancedTagChoice = html.find("#vaarn-wg-advanced-tag").val();
          const exoticTagChoice = html.find("#vaarn-wg-exotic-tag").val();
          const faithChoice = html.find("#vaarn-wg-faith").val();
          generateWeapon(quality, baseChoice || null, basicTagChoice || null, advancedTagChoice || null, exoticTagChoice || null,
                         faithChoice === "" ? null : Number(faithChoice));
        }
      }
    },
    default: "create",
    render: (html) =>
    {
      const updateVisibility = () =>
      {
        const quality = html.find("#vaarn-wg-quality").val();
        html.find("#vaarn-wg-advanced-tag-group").toggle(quality === "Advanced" || quality === "Exotic");
        html.find("#vaarn-wg-exotic-tag-group").toggle(quality === "Exotic");
        // the faith only matters to a Sacred or Blasphemous tag, or a Random one that may roll it
        const basic = html.find("#vaarn-wg-basic-tag").val();
        html.find("#vaarn-wg-faith-group").toggle(!basic || basic === "Sacred" || basic === "Blasphemous");
      };
      html.find("#vaarn-wg-quality").on("change", updateVisibility);
      html.find("#vaarn-wg-basic-tag").on("change", updateVisibility);
      updateVisibility();
    }
  },
  { width: 340 }).render(true);
}

openDialog();
