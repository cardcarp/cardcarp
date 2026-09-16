// The form names are matched in, for search and for links: lowercased, with accents folded away.
//
// Its own module because two very different callers need exactly the same answer — the Vue
// app's card search (ptcg's simulator/composable/search-card.js) and the table's ?deck= link (deck-link.js) —
// and a table module must not import a Vue composable to get it.

// Combining marks left behind by an NFD decomposition. `\p{Diacritic}` also
// covers the handful of modifier letters that aren't strictly accents — the
// raised colon in "Ratonhnhaké꞉ton", for one — which is what makes the plain
// spelling of those names findable too.
const DIACRITIC = /\p{Diacritic}/gu

// Almost every name is already plain ASCII (308 of mtg's ~111k are not), and
// `normalize` is by far the most expensive step here, so the scan pays for
// itself many times over by skipping it.
function isAscii(text) {
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) > 127) return false
    }
    return true
}

// The form both the query and the names are matched in: lowercased, with
// accents folded away, so typing "Dandan" finds "Dandân" (and typing "Dandân"
// still finds it).
export function foldName(text) {
    const lower = String(text).toLowerCase()
    return isAscii(lower) ? lower : lower.normalize('NFD').replace(DIACRITIC, '')
}
