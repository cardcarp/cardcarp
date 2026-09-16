// Opening-hand probability, as arithmetic.
//
// Lifted out of dialog-probability.vue, where it was correct for every hand a real deck deals and
// quietly wrong at the edges — which is exactly what a dialog hides. See probability.test.mjs.

// C(n, k) — how many ways to choose k from n.
//
// Multiplicative rather than factorial: 60! overflows a double long before this ratio does, and the
// running product stays finite for every deck size a card game reaches.
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

// The chance of opening with at least one copy: drawing `draw` cards from a `deck`-card deck that
// holds `copies` of the card.
//
//   P(at least one) = 1 - P(none)
//   P(none)         = C(deck - copies, draw) / C(deck, draw)
//
// The guards are the reason this moved. Drawing the whole deck — or more of it than exists, which a
// seven-card hand off a five-card storage list does — made both combinations return 0, so the old
// version computed 1 - 0/0 and put the string "NaN" in the probability column. Drawing everything is
// a certainty, not an error.
export function drawChance(deck, copies, draw) {
    if (!(deck > 0) || !(copies > 0) || !(draw > 0)) return 0
    if (copies >= deck) return 1
    if (draw >= deck) return 1

    const total = combinations(deck, draw)
    if (!total) return 0

    return 1 - combinations(deck - copies, draw) / total
}

// Fisher-Yates, on a copy — the caller's list is never reordered under it.
//
// `random` is a parameter so a test can deal a known shuffle. The dialog passes nothing and gets
// Math.random, which is what it always used.
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
