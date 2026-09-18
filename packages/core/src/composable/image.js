import { useGameStore } from './game.js'
import { CARD_BACK_VARIANT, hasCardBack } from '../card.js'
import { assetUrl, cardArtUrl } from '../storage.js'

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

    function card_src(card, variant = '', filetype = 'avif') {
        const game = game_key.value
        const dir = card?.dir
        if (!game || !dir) return ''

        const file = [dir, variant && String(variant).toLowerCase()].filter(Boolean).join('-')
        return cardArtUrl(game, file, filetype)
    }

    function card_back_src(card, filetype = 'avif') {
        if (hasCardBack(card)) return card_src(card, CARD_BACK_VARIANT, filetype)

        return assetUrl(game_key.value, categoryBackPath(config.value, card))
    }

    return { card_src, card_back_src }
}
