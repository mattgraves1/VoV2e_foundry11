/**
 * Vaarn: Open Character Creator
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it
 * to the hotbar. Run it to open the native in-Foundry
 * character creation wizard (module/actor/chargen-app.js) — same tables and
 * roll logic as vaarn_character_creator_2.html and the same data mapping as
 * import-character-from-json.js, but it creates the Actor/Items directly,
 * no JSON export/import step.
 *
 * The wizard is also reachable without this macro: a "Create Character
 * (Vaarn)" button is injected into the Actors sidebar header directly (see
 * the renderActorDirectory hook in module/knave.js). This macro is a second,
 * equally-valid entry point for anyone who prefers running it from the hotbar.
 */
new game.knave.KnaveCharacterCreator().render(true);
