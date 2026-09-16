// Which cards are dealt in the open.
//
// A game names them in `simulator.card.flip`, on either of the two axes a dealt pile has:
//
//   "card": {
//     "flip": {
//       "deck":     ["commander", "token"],
//       "category": ["Leader", "Summon", "Chakra"]
//     }
//   }
//
//   deck     — a key of the deck itself (a deck is keyed by these), so it reveals a whole pile
//              however its cards are typed. This is the one a commander needs: "Commander" is a
//              place in a deck list, not a card type — the card there is an ordinary legendary
//              creature and matches no category at all.
//   category — a value off the card record, for revealing a kind of card wherever it turns up.
//
// Named lists rather than one, because the two genuinely collide: MTG publishes `token` as a
// deck key AND `Token` as a card category. A single list would match both and nobody reading
// the config could tell which it meant.
//
// Both halves used to be called `zone`, which was the word covering a deck key and a card
// category at once — the very ambiguity the split exists to remove. They are `deck` and
// `category` now, named for the two things they actually are, and `flip` sits under `card`
// because which side a card lands on is a fact about cards.
//
// Either list revealing is enough. Everything else keeps exactly the behaviour it had before
// this existed: a card dealt as part of a deck lands face-down, a single card placed on its own
// lands face-up. So `flip` only ever reveals — which is the point, and means adding one can
// never turn a main deck face-up by leaving something off a list.

// The game, as the host handed it in
import { gameConfig } from './game.js'

function listed(flip, key) {
    const list = flip?.[key]
    return Array.isArray(list) ? list : []
}

// A card's category is published as either an array (["Leader"]) or a bare string — the same
// two shapes the scry filter has to cope with.
function hasCategory(card, value) {
    const category = card?.category
    return Array.isArray(category) ? category.includes(value) : category === value
}

// `zone` is the deck key the card is being dealt under, and is absent for anything created
// outside a deal — in which case only the category list can match.
export function spawnsFaceUp(card, zone = null) {
    const flip = gameConfig.get()?.simulator?.card?.flip
    if (!flip || typeof flip !== 'object') return false

    if (zone && listed(flip, 'deck').includes(zone)) return true
    return listed(flip, 'category').some(value => hasCategory(card, value))
}
