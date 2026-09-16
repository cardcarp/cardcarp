// config.js
//
// Local dev toggles. Flip them here — consumers import this module directly,
// so there's nothing to wire up at boot.
export const config = {
    // When true, the ARCHIVES are read from frontend/public/game instead of the
    // storage CDN. Mirror the bucket layout under that folder, e.g.
    //   frontend/public/game/wow/data/manifest.json
    //   frontend/public/game/wow/data/sets.json
    // Configs are not affected — they are bundled from src/data/game/.
    // That folder is gitignored, so the data stays out of the repo.
    local: false
}

// Where published files live: the storage bucket, in development and production
// alike.
//
// Development used to go through a Vite proxy (/cdn), because the bucket's CORS
// allowlist named only the apex origin. It now names every project's origin and
// the local dev ports too, so a page reads the bucket directly wherever it runs —
// and a CORS problem shows up in development, rather than first appearing in
// production where the proxy used to hide it.
//
// The allowlist is the rule to remember, and getting it wrong is invisible: an
// <img> with no crossOrigin attribute loads from the bucket happily, while fonts,
// fetch(), and Pixi's worker fetch and WebGL upload all refuse it. That difference
// cost a session's worth of "why is nothing rendering" (see the note in
// accessory.js).
export const CDN_BASE = 'https://storage.cardcarp.com'

// Game data — the archives, and nothing else now.
//
// The configs used to come through here too. They are bundled instead (see the
// CONFIG note in composable/game.js): a config is the other half of a contract
// the code defines, so it belongs in the repo beside the code that reads it,
// while the archives are genuinely remote data that has to be fetched.
//
// The practical difference while working: editing a config under
// src/data/game/<name>/config/ is an HMR reload, not a bucket upload — a faster
// loop than the one it replaced, and a reviewable one.
export function gameDataUrl(game, file) {
    if (config.local) return `/game/${game}/data/${file}`
    return `${CDN_BASE}/game/${game}/data/${file}`
}

// An asset by its extensionless bucket path. `assetBase` leaves the extension
// off so a caller can append its own suffix — a dice variant does `…/d6` plus
// `-green` plus `.avif` — while `assetUrl` finishes the job.
export const assetBase = (path) => (path ? `${CDN_BASE}/${path}` : '')
export const assetUrl = (path) => (path ? `${assetBase(path)}.avif` : '')
