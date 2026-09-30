/**
 * Vaarn: Generate Settlement
 *
 * GM-only tool: rolls a settlement's core flavor (Water Source/
 * Complication, Size, Majority/Minority Population — each independently —
 * Location/Houses/Industry, Government, Dominant Faith, Praises/Despises/
 * Lacks, In Fashion/Festival/Entertainment), then a Major Asset, 4 Major
 * Buildings, and a Landmark, per Settlements.md's own "Mapping a
 * Settlement" procedure (step 3: "Take a d20 and 4d6... the d20
 * represents the settlement's major asset, the d6s represent notable
 * buildings"; step 4: "Generate a local landmark") as far as it goes
 * without physical mapping — the Landmark reuses The Desert/Landmark.md's
 * table since vaults/settlements/deserts all draw from the same landmark
 * pool (confirmed from the source tool's own comment, not guessed). Ported
 * from npc-generator.html's renderSettlementOverviewContent.
 *
 * Found late during work-queue.txt item 1 Phase 3 — mis-filed originally
 * as needing Phase 3's Bestiary-spawn helper; it doesn't, it's pure
 * RollTable composition (module/actor/settlement-overview-data.js's
 * groups, rolled via module/actor/composite-roller.js's rollSingleTable,
 * plus Settlement Assets/Building Types read straight from Phase 2's
 * already-built rolltable-data.js via module/actor/rolltable-picker.js —
 * no Actor involved at all). Same correction as macros/generate-gift.js
 * and macros/generate-room-contents.js.
 *
 * Posts a chat message (narrative content, not a physical object or an
 * Actor — same category as macros/generate-narrative.js's Phase 2
 * generators). No dialog — nothing to configure, so this macro runs
 * immediately, same as Generate Starting Gear/Crucible/Drug/Armour/Gift.
 *
 * WHISPERED TO THE GM SINCE 2026-09-19, and this CHANGED existing behaviour:
 * the card used to be public despite the "GM-only tool" line above, which
 * nobody had noticed because nothing on it was secret. Local Value
 * Fluctuations made it secret — a settlement's prized and despised goods are
 * trade intelligence, and Matt ruled the block belongs on this card rather
 * than in a second message, so the card became a whisper. Everything already
 * on it (Size, Population, Industry, Landmark and the rest) is GM-only as a
 * consequence. That is the intended reading: this is a Referee's prep tool,
 * and the settlement is revealed by play rather than by a chat card.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to roll and post the result.
 */

async function generateSettlement()
{
  const { SETTLEMENT_GROUPS } = await import("/systems/vaarn/module/actor/settlement-overview-data.js");
  const { rollSingleTable } = await import("/systems/vaarn/module/actor/composite-roller.js");
  const { pickRandomResultHtml } = await import("/systems/vaarn/module/actor/rolltable-picker.js");
  const { fluctuationHtml } = await import("/systems/vaarn/module/actor/settlement-fluctuation.js");

  const { html: coreHtml } = rollSingleTable({ groups: SETTLEMENT_GROUPS });

  const assetHtml = await pickRandomResultHtml("Settlement Assets");
  const buildingLines = [];
  for(let i = 0; i < 4; i++) buildingLines.push(`<p><b>Building ${i + 1}:</b> ${await pickRandomResultHtml("Building Types")}</p>`);
  const landmarkHtml = await pickRandomResultHtml("Landmark Table (d100)");

  const content = `<h3>Generate Settlement</h3>${coreHtml}<hr><p><b>Major Asset:</b> ${assetHtml}</p>${buildingLines.join("")}<p><b>Landmark:</b> ${landmarkHtml}</p><hr>${fluctuationHtml()}`;
  ChatMessage.create({ user: game.user._id, content, whisper: ChatMessage.getWhisperRecipients("GM") });
}

generateSettlement();
