// Facts about a card record that hold whichever game is loaded and wherever its art is hosted.
//
// Kept out of composable/image.js, which builds URLs from core's game store, so code that only needs
// to ask a question of a card — the table deciding which cards may be dealt face-down — can import
// the answer without importing the store.

// Most cards back onto a flat sleeve color. A printing whose `variation` includes 'Flip' (the WoW
// hero cards that flip mid-game) has real art on its back instead, published as the front's
// path with '-flip' appended — the variation's own name doubles as the variant suffix, lowercased
// by card_src. It is read from the printing, not the oracle's `layout`, because a flip is a
// physical fact of that card rather than a rules layout.
export const CARD_BACK_VARIANT = 'Flip'
export function hasCardBack(card) {
    return Array.isArray(card?.variation) && card.variation.includes(CARD_BACK_VARIANT)
}
