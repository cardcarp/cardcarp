// Which of a filter's published choices are worth offering in the deckbox.
//
// The options come from the game's config (card.filter.category,
// deck.filter.format / deck.filter.theme), the same definitions the
// @cardcarp/deckbox's left panel reads — one vocabulary, so a category means the
// same thing in both places.
//
// They are then narrowed to the values the list in front of the player
// actually holds, which is what lets one piece of wiring serve every tab: the
// Saved tab lists the player's own decks, which carry no format or theme, so
// its dropdowns resolve to nothing and don't render. A game that publishes a
// filter its data never populates behaves the same way.
//
// Availability is read off the RAW list, before the tab's preset filters run.
// Reading it off the filtered list would fold the control in on itself — pick
// "Creature" and Creature would be the only remaining choice.

import { normalizeOptions } from '@cardcarp/core/composable/search.js'

export function availableOptions(def, items, key) {
    if (!def || !Array.isArray(items) || !items.length) return []

    const present = new Set()
    for (const item of items) {
        const value = item?.[key]
        if (value == null) continue
        // Array-valued properties are how a card carries several of something
        // (traits, keywords); matchFilter treats them as is-one-of, so a
        // single member makes the option reachable.
        for (const one of Array.isArray(value) ? value : [value]) {
            present.add(String(one).toLowerCase())
        }
    }

    // Case-folded on both sides, because that is how the filter itself
    // matches (see matchFilter). It also collapses the duplicates mtg's
    // category list carries — "Instant" and "instant", "Plane" and "pLAnE" —
    // which would otherwise draw as two rows that select the same cards.
    const seen = new Set()
    return normalizeOptions(def).filter(option => {
        const key = option.value.toLowerCase()
        if (!present.has(key) || seen.has(key)) return false
        seen.add(key)
        return true
    })
}
