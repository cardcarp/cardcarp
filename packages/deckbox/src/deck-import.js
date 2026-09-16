// Reading a pasted deck list.
//
// Lifted out of dialog-import.vue, where it sat inside an async click handler tangled with button
// labels and timers — so the one part worth checking, what a given line turns into, could not be run
// without a browser and a manifest. See deck-import.test.mjs.
//
// The format is the one dialog-export.vue writes — `<qty> <name> <set_id> <card_index>` — and people
// also paste it by hand from elsewhere, which is why every failure is collected rather than thrown:
// a list of 60 cards with two typos should import 58 and say what it skipped.

// A group header, e.g. "Hero: 1" or "Main: 60" — mirrors the export.
const HEADER = /^([a-zA-Z][a-zA-Z\s]*):\s*\d+$/

// A card line, e.g. "3 Annihilate starter-2013-alliance-rogue 002".
const CARD = /^(\d+)\s+(.+?)\s+([\w-]+)\s+([\w-]+)$/

// Labels are compared with punctuation and case thrown away, so "Side Deck", "side-deck" and
// "sidedeck" all find the same group.
const normalize = (label) => String(label ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// How the dataset pipeline keys a card: the set id and the card index, joined, lowercased. Nothing
// else — `xy-black-star` + `067a` is `xy-black-star-067a`.
//
// Checked against every published card: this is exact for 21,184 of 21,184 ptcg records and 9,245 of
// 9,245 wow records.
export function cardId(setCode, lex) {
    return `${String(setCode ?? '').toLowerCase()}-${String(lex ?? '').toLowerCase()}`
}

// What the importer used to build, via lodash's kebabCase: the same join, but also split on every
// letter/digit boundary. It matched 98.86% of ptcg and 99.66% of wow — the misses were the cards
// whose index carries a letter (`067a`, `001h`, the promo and variant numbering), which the deckbox
// would happily export and then refuse to read back.
//
// Kept as a fallback rather than deleted, because it is more forgiving of a hand-typed line than the
// exact join is, and nothing is lost by trying it second.
export function legacyCardId(setCode, lex) {
    return `${String(setCode ?? '').toLowerCase()} ${lex ?? ''}`
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

// The card a line names, or null. Tries the real key first and the old one second, so every card that
// imported before still imports and the lettered indices start working.
export function findCard(cardDict, setCode, lex) {
    const exact = cardId(setCode, lex)
    if (cardDict?.[exact]) return { id: exact, card: cardDict[exact] }

    const legacy = legacyCardId(setCode, lex)
    if (legacy !== exact && cardDict?.[legacy]) return { id: legacy, card: cardDict[legacy] }

    return null
}

// Turn pasted text into cards this game actually has.
//
//   groups   the game's deck groups (config.deck.group.list) — a header naming one switches the
//            group that following cards land in. An unknown header, and anything before the first
//            header, falls back to 'main'.
//   cardDict the manifest's card_dict. A line whose id is not in it is reported, not invented.
//   group    forces every card into one group regardless of headers, which is what the storage list
//            wants — it has no groups to sort into.
//
// Returns the cards to add and the lines that did not become one. Never throws.
export function parseDeckList(text, { groups = [], cardDict = {}, group = null } = {}) {
    const byLabel = new Map((groups ?? []).map(name => [normalize(name), name]))

    const lines = String(text ?? '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

    const cards = []
    const errors = []
    let current = 'main'

    for (const line of lines) {
        const header = line.match(HEADER)
        if (header) {
            current = byLabel.get(normalize(header[1])) ?? 'main'
            continue
        }

        const match = line.match(CARD)
        if (!match) {
            errors.push(`Skip line: ${line}`)
            continue
        }

        const [, quantity, name, set_code, lex] = match

        const found = findCard(cardDict, set_code, lex)
        if (!found) {
            errors.push(`${name} ${set_code} ${lex}`)
            continue
        }

        cards.push({
            ...found.card,
            id: found.id,
            quantity: parseInt(quantity, 10),
            list: group ?? current,
        })
    }

    return { cards, errors }
}

// Fold parsed cards into a build list, adding quantities where the same card is already in the same
// group. Mutates and returns `build`, which is what the reactive deck_building.list needs.
//
// Keyed on id AND group on purpose: the same card in the main deck and the side deck is two entries,
// and merging them would move copies between groups.
export function mergeIntoBuild(build, cards) {
    for (const card of cards) {
        const existing = build.find(entry => entry.id === card.id && entry.list === card.list)
        if (existing) existing.quantity += card.quantity
        else build.push(card)
    }
    return build
}
