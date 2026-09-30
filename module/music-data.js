/**
 * The system's music - foundry-system-index.csv "Music Playlist" (2026-09-28).
 *
 * Tracks by Raudhetta, who gave permission for them to ship with the system,
 * including in the public release, under CC BY 4.0 (agreed 2026-09-28): anyone
 * may use and share them, crediting Raudhetta. The files live in audio/music/ as OGG,
 * converted from the composer's WAVs with ffmpeg (libvorbis -q:a 5).
 *
 * THIS LIST IS THE SOURCE. pack-build.js keeps the vaarn.music compendium in
 * line with it on every load, so a new track is one file in audio/music/ and
 * one line here. Order here is play order.
 */

export const MUSIC_PLAYLIST = {
  name: "Vaults of Vaarn",
  composer: "Raudhetta",
  licence: "CC BY 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  tracks: [
    { name: "Confined Space", file: "confined-space.ogg" },
    { name: "Fighting Ideas", file: "fighting-ideas.ogg" },
    { name: "Red Prophet",    file: "red-prophet.ogg" }
  ]
};
