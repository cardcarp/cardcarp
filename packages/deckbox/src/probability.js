export function combinations(n, k) {
    if (!Number.isFinite(n) || !Number.isFinite(k)) return 0
    if (n < 0 || k < 0 || k > n) return 0
    if (k === 0 || k === n) return 1

    let result = 1
    for (let i = 0; i < k; i++) {
        result *= (n - i) / (i + 1)
    }
    return result
}

export function drawChance(deck, copies, draw) {
    if (!(deck > 0) || !(copies > 0) || !(draw > 0)) return 0
    if (copies >= deck) return 1
    if (draw >= deck) return 1

    const total = combinations(deck, draw)
    if (!total) return 0

    return 1 - combinations(deck - copies, draw) / total
}

export function shuffle(list, random = Math.random) {
    const deck = [...list]
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        const held = deck[i]
        deck[i] = deck[j]
        deck[j] = held
    }
    return deck
}
