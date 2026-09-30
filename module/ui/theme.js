/**
 * Vaarn UI Reskin (foundry-system-index.csv "Vaarn UI Reskin").
 *
 * Two per-user settings in Configure Settings: a palette and a heading font.
 * Neither draws anything - they put classes on <body> and css/vaarn-theme.css
 * does the rest, scoped to `.knave` windows so chat cards are untouched.
 *
 * CLIENT scope on purpose: each person at the table picks what they can read,
 * and switching never changes anyone else's screen. The default is Blue Hour with
 * its own Federo headings (Matt, 2026-09-27); Knave, the original look, is one
 * of the choices.
 */

const SCOPE = "vaarn";
const SETTING_THEME = "sheetTheme";
const SETTING_HEADING = "headingFont";

/** id -> label. `knave` is no theme at all: no body class, the old CSS. */
export const THEMES = {
  knave: "Knave (original)",
  dusk: "Dusk Dunes (light)",
  bluehour: "Blue Hour (dark)",
  crimson: "Crimson Sun (dark)"
};

/** id -> label. `theme` takes the font the palette names. */
export const HEADING_FONTS = {
  theme: "Palette default",
  cinzel: "Cinzel",
  federo: "Federo",
  poiret: "Poiret One",
  signika: "Signika (Foundry's own)"
};

/** Swap the body classes to match the stored settings. Safe to call twice. */
export function applyTheme()
{
  const body = document.body;
  if (!body) return;
  const theme = game.settings.get(SCOPE, SETTING_THEME);
  const heading = game.settings.get(SCOPE, SETTING_HEADING);

  for (const cls of [...body.classList])
    if (cls.startsWith("vaarn-theme-") || cls.startsWith("vaarn-heading-") || cls === "vaarn-themed")
      body.classList.remove(cls);

  if (!(theme in THEMES) || theme === "knave") return;
  body.classList.add("vaarn-themed", `vaarn-theme-${theme}`);
  if (heading in HEADING_FONTS && heading !== "theme")
    body.classList.add(`vaarn-heading-${heading}`);
}

export function registerThemeSettings()
{
  game.settings.register(SCOPE, SETTING_THEME, {
    name: "Sheet Theme",
    hint: "Colours for character, NPC and item sheets and the system's windows. Only changes your own screen. Chat cards are not affected.",
    scope: "client",
    config: true,
    type: String,
    choices: THEMES,
    default: "bluehour",
    onChange: applyTheme
  });
  game.settings.register(SCOPE, SETTING_HEADING, {
    name: "Sheet Heading Font",
    hint: "Font for window titles, headings and tabs while a Sheet Theme other than Knave is chosen.",
    scope: "client",
    config: true,
    type: String,
    choices: HEADING_FONTS,
    default: "theme",
    onChange: applyTheme
  });
}
