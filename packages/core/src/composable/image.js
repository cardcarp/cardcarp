// composable/image.js
// Card art lives on the CDN under the active game's folder, addressed by the
// card's `dir` — a set-relative path carried on the card record. Variant art is
// the same path with a `-suffix`; the standard art is the bare path.
//
//   https://storage.cardcarp.com/game/{game}/card/{dir}[-{variant}].{filetype}

import { useGameStore } from './game.js'
import { CARD_BACK_VARIANT, hasCardBack } from '../card.js'
import { CDN_BASE } from '../config.js'

// The bucket, read directly in development as in production (see CDN_BASE in ../config.js).
// Anything that reads card bytes with fetch() — the print dialog, the table's textures — needs
// the bucket's CORS policy to name the page's origin, dev ports included.
const CDN = `${CDN_BASE}/game`

// A whole category's printed back, from `simulator.back` in the game's config:
//
//   "back": [
//     { "category": "Summon", "img": "game/naruto-card-game/asset/summon-back" },
//     { "category": "Chakra", "img": "game/naruto-card-game/asset/chakra-back" }
//   ]
//
// For games where some cards are not sleeved — Naruto's Summon and Chakra decks are played in
// clear sleeves or none — so their real backs are what the table sees rather than a sleeve
// colour. `category` takes one value or a list of them.
//
// Deliberately NOT folded into hasCardBack (../card.js), because the two mean different things and the
// difference is load-bearing. A flip card's back is another FACE of that card: public,
// carrying rules text, previewable on hover, and never dealt face-down (see addDeck and
// flip.js). A category back is what the back of a hidden card looks like — it goes exactly
// where a sleeve would go, on a card nobody can read. Widening hasCardBack would quietly make
// every Summon and Chakra card behave like a flip card in all three of those places.
//
// The path addresses the bucket root, like accessory art and unlike card art under /card/ — a
// back is a game asset, published beside the playmat.
const ASSET_CDN = 'https://storage.cardcarp.com'

function categoryBackPath(config, card) {
    const category = card?.category
    const carries = (value) => (Array.isArray(category) ? category.includes(value) : category === value)

    for (const entry of (config?.simulator?.back ?? [])) {
        if (!entry?.img) continue
        const wanted = Array.isArray(entry.category) ? entry.category : [entry.category]
        if (wanted.some(carries)) return entry.img
    }
    return ''
}

export function useImage() {
    const { game: game_key, config } = useGameStore()

    // Returns '' rather than a half-built URL when the card or the game is
    // unknown — `dir` joins as an empty segment, so a missing one would
    // otherwise yield a valid-looking path that 404s. Callers can bind the
    // result straight to :src and get no request at all.
    function card_src(card, variant = '', filetype = 'avif') {
        const game = game_key.value
        const dir = card?.dir
        if (!game || !dir) return ''

        // Variant names are lowercase on the CDN, while the manifest authors
        // them capitalised on the card (`variation: ["Flip"]`) and lowercase on
        // the image record (`images[].variant`). Fold the case here so both
        // spellings address the same file.
        const file = [dir, variant && String(variant).toLowerCase()].filter(Boolean).join('-')
        return `${[CDN, game, 'card', file].join('/')}.${filetype}`
    }

    // The art to show on the back of this card, or '' for the vast majority that have none —
    // callers treat '' as "fall back to the sleeve color". Two sources, in order: the card's own
    // reverse face if it is a flip card, otherwise its category's printed back.
    //
    // A path that 404s degrades to the sleeve rather than to a broken image: nothing assigns
    // the failed load, so `cardBackImage` stays unset and paintFace falls through to the fill.
    function card_back_src(card, filetype = 'avif') {
        if (hasCardBack(card)) return card_src(card, CARD_BACK_VARIANT, filetype)

        const path = categoryBackPath(config.value, card)
        return path ? `${ASSET_CDN}/${path}.${filetype}` : ''
    }

    return { card_src, card_back_src }
}
