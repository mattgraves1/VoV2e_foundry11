/**
 * Vaarn: Generate Region
 *
 * GM-only. Opens the Region Generator: a region of locations on a hex map of
 * one hex per day's travel, joined by routes, divided into named sections each
 * with its Landscape, landmark and encounter table (Region Generator row, ruled
 * with Matt 2026-10-03, from the book's Region Creation).
 *
 * The window previews the region before anything is made: click a location to
 * change its type or name, a route to make it safe or hazardous, a section to
 * rename it. Every setting is under Advanced options; the region code grows
 * the same region again.
 *
 * The generator lives in module/region/.
 *
 * Ships in the Vaarn Macros compendium: import it (Import Entry) or drag it to
 * the hotbar.
 */

const { openRegionWindow } = await import("/systems/vaarn/module/region/region-window.js");
openRegionWindow();
