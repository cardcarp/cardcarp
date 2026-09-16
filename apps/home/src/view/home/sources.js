// Shared data access for the home cards. The landing page's featured rows and
// the /examples browse list both go through here, so normalization and link
// targets live in exactly one place.
//
// One dataset now — data/game-list.json — and three kinds over it, which differ
// only in where a card lands inside the project it names:
//
//   project    the project's own root
//   deckbox    its card archive
//   simulator  its tabletop
//
// `project` is what /examples uses. The other two are the landing page's rows:
// the same projects, framed by which half of the toolkit the row is about.
import game_list from '@/data/game-list.json'

// Flatten to an array of items with a stable `id`. game-list is keyed by id,
// so the key is the item id.
export function items() {
    return Object.entries(game_list).map(([id, value]) => ({ id, ...value }))
}

// The hand-picked subset, in the order the ids are given rather than source
// order — the landing page curates its rows by hand (see landing.vue). Unknown
// ids are dropped, so a row naming a project that has not shipped yet degrades
// to a shorter list rather than a broken card.
export function pick(ids) {
    const all = items()

    return ids
        .map((id) => all.find((item) => item.id === id))
        .filter(Boolean)
}

// Where a card points.
//
// A game ships as its own project on its own domain (see apps/), so every card
// is a link OUT, and the kinds differ only by where they land inside it: a
// project's root IS its tabletop, and the archive hangs off /deckbox. Worth
// stating because the pairing looks inverted next to the routes this site used
// to mount, where the builder was the root and the table took the path.
//
// Read off the item rather than built from the id, so a project that moves — or
// one that is somebody else's rather than ours — needs no code here, only a
// `site` in the list.
export function linkProps(item, kind) {
    if (item.site) return { href: kind === 'deckbox' ? `${item.site}/deckbox` : item.site }

    if (item.href) return { href: item.href }

    // No site: nothing to link to. Card renders inert rather than as a link
    // into nothing.
    return {}
}
