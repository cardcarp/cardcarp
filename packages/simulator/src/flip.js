import { gameConfig } from './game.js'

function listed(flip, key) {
    const list = flip?.[key]
    return Array.isArray(list) ? list : []
}

function hasCategory(card, value) {
    const category = card?.category
    return Array.isArray(category) ? category.includes(value) : category === value
}

export function spawnsFaceUp(card, zone = null) {
    const flip = gameConfig.get()?.simulator?.card?.flip
    if (!flip || typeof flip !== 'object') return false

    if (zone && listed(flip, 'deck').includes(zone)) return true
    return listed(flip, 'category').some(value => hasCategory(card, value))
}
