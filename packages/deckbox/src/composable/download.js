// composable/download.js
// One naming convention for every file the deckbox hands to the user, so a
// deck's PDF, its image zip and its text export sort next to each other in a
// Downloads folder:
//
//   {subject}-{date}.{ext}   →   emerald-dream-aggro-2026-08-20.pdf
//
// The subject is the deck's name where there is one and the game otherwise. The
// date is local, not UTC — the file is named for the day the person made it,
// which toISOString() gets wrong either side of midnight.

// Longest a single slug may run. Deck names are free text and some people paste
// a paragraph; the tail carries no information once it's this long, and a few
// filesystems still cap the whole path at 255 bytes.
const SLUG_MAX = 60

// Lowercase kebab, ASCII only. Accented letters decompose to their base rather
// than vanishing (a deck called "Café" stays "cafe", not "caf"), and anything
// left that isn't a letter or digit becomes a separator — which takes care of
// the path separators, colons and control characters a filename can't carry.
export function slugify(value) {
    return String(value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, SLUG_MAX)
        .replace(/-+$/g, '')
}

// YYYY-MM-DD in the user's own timezone. Sorts chronologically as text and is
// legal on every filesystem, which rules out the colons in a full ISO stamp.
export function stamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Builds the name. `parts` are joined in order and empty ones drop out, so a
// missing deck name simply leaves the game to identify the file.
export function downloadName(parts, ext) {
    const subject = parts
        .map(slugify)
        .filter(Boolean)
        .join('-')
        .slice(0, SLUG_MAX)
        .replace(/-+$/g, '')

    return `${[subject || 'cardcarp', stamp()].join('-')}.${ext}`
}
