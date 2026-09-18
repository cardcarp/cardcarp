import { gameConfig, gameManifest } from './game.js'

// Seats
import { mySeat, seatPoint } from './seats.js'
import { cardWorldSize } from './canvas-pixi/index.js'

export function buildDeckDict(deckList) {
    const deck = {}
    for (const zone of Object.keys(deckList ?? {})) {
        deck[zone] = []
        for (const [card_id, quantity] of Object.entries(deckList[zone] ?? {})) {
            const base_card = gameManifest.get()?.card_dict?.[card_id]
            if (base_card) deck[zone].push({ ...base_card, quantity })
        }
    }
    return deck
}

const placed = new Set()

export function markSeatPlaced(seatId) {
    if (seatId) placed.add(seatId)
}

export function clearSeatsPlaced() {
    placed.clear()
}

export function hasSeatPlaced(seatId) {
    return placed.has(seatId)
}

export function isOpeningDeal() {
    const seat = mySeat.get()
    return !!seat && !hasSeatPlaced(seat.seatId)
}

export function openingZones() {
    if (!isOpeningDeal()) return null

    const seat = mySeat.get()

    const zones = gameConfig.get()?.simulator?.deal?.player?.deck
    if (!zones || typeof zones !== 'object') return null

    const half = cardWorldSize()
    const out = {}
    for (const [zone, point] of Object.entries(zones)) {
        if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) continue
        const centre = { x: Number(point.x) + half.width / 2, y: Number(point.y) + half.height / 2 }
        out[zone] = { ...seatPoint(seat, centre), explode: point.explode === true }
    }
    return Object.keys(out).length > 0 ? out : null
}

export function shuffleMain(deck_dict) {
    const main = deck_dict?.main
    if (!Array.isArray(main) || main.length === 0) return deck_dict

    const cards = []
    for (const entry of main) {
        const one = (entry.quantity || 1) === 1 ? entry : { ...entry, quantity: 1 }
        for (let i = entry.quantity || 1; i > 0; i--) cards.push(one)
    }

    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[cards[i], cards[j]] = [cards[j], cards[i]]
    }

    return { ...deck_dict, main: cards }
}
