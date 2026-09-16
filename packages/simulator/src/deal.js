// Where a seat's opening deal lands.
//
// The first thing a seat puts on the table is its deck, and a deck knows which zone each of its
// piles belongs to — the deck_dict is keyed by zone (leader / summon / chakra / main). A game
// can say where those zones actually are on its playmat:
//
//   "deal": {
//     "leader": { "x": 646, "y": 205 },
//     "main":   { "x": 806, "y": 12 },
//     "token":  { "x": 550, "y": 60, "explode": true }
//   }
//
// `explode` deals that zone spread out and ungrouped instead of stacked, for a pile whose cards
// are handled one at a time — Naruto's chakra is a row you spend from, not a deck you draw
// from, so a stack of five would just have to be exploded by hand every game.
//
// Coordinates are measured from the playmat's TOP-LEFT corner, the way the mat image is read in
// an editor, and they place the pile's own top-left corner — so a zone whose size varies with the
// deck (a token row) keeps its left edge and grows rightward rather than shifting under itself.
// Written once, serving both ends of the table (see seatPoint). A zone the map doesn't name
// falls back to the ordinary centred row.
//
// Only the OPENING deal. Once a seat has put anything on the table, later decks land where the
// player asks for them, because by then they are adding to a game rather than setting one up.

// The game, as the host handed it in
import { gameConfig, gameManifest } from './game.js'

// Seats
import { mySeat, seatPoint } from './seats.js'
import { cardWorldSize } from './canvas-pixi/index.js'

// A deck record's `list` is { deck key: { card_id: quantity } } — ids and counts, because that is
// what a deck is worth storing as. addDeck wants the cards themselves, keyed by the same zones.
//
// Shared rather than written twice: the deck row, a drop onto the canvas and a ?deck= link all
// deal the same deck, and a resolver that differed between them would be three subtly different
// decks wearing one name. An id the manifest doesn't hold is skipped — a deck listing a card
// this game no longer publishes is short a card, not undealable.
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

// Which seats have put something on the table. Deliberately local to this client and not
// persisted, which turns out to be exactly the lifetime wanted:
//
//   - it is only ever consulted about your OWN seat, so no peer needs to know it;
//   - a reload drops it, and offline a reload also empties the canvas, so the two agree;
//   - taking over a different seat gets that seat's answer, not the one you were just using.
//
// Keeping it off the seat record also keeps it off the wire and out of the relay's ownership
// rules, under which a client could not have written another seat's copy anyway.
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

// Whether the next deck this seat puts down is its opening deal. Asked separately from
// openingZones() below because the two answers differ: a game that names no zones still deals
// an opening deck, it just lays it out in the ordinary centred row.
export function isOpeningDeal() {
    const seat = mySeat.get()
    return !!seat && !hasSeatPlaced(seat.seatId)
}

// The world position for each named zone, for the seat about to deal — or null when this is not
// an opening deal, or the game says nothing about zones. Null means "lay the piles out in the
// usual centred row".
export function openingZones() {
    if (!isOpeningDeal()) return null

    const seat = mySeat.get()

    const zones = gameConfig.get()?.simulator?.deal?.player?.deck
    if (!zones || typeof zones !== 'object') return null

    // A zone's x/y is the TOP-LEFT of the pile, like every other coordinate in the config — and
    // like an author measuring the deck's corner off their playmat art. addDeck places the first
    // card by its centre (cards are centre-origin, see the note in seats.js seatPoint), so the
    // half-card is added here, on the seat box's own axes, before the seat's turn is applied.
    const half = cardWorldSize()
    const out = {}
    for (const [zone, point] of Object.entries(zones)) {
        if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) continue
        const centre = { x: Number(point.x) + half.width / 2, y: Number(point.y) + half.height / 2 }
        out[zone] = { ...seatPoint(seat, centre), explode: point.explode === true }
    }
    return Object.keys(out).length > 0 ? out : null
}

// The opening deal shuffles the deck it lays down.
//
// Players forget to shuffle, and a deck dealt in list order is a deck whose opening hand is the
// top of the deckbox's list every single game — the same cards, in the same order, for
// everyone playing that list. Shuffling here rather than automating a shuffle button keeps the
// correction to the one moment it is unambiguous: a deck arriving on an empty seat has not been
// played with yet, so there is no order for this to destroy. Every later deck is something the
// player is adding to a game in progress, and those are left exactly as they are handed over.
//
// Only `main` — the one zone every game has and the only one that is drawn from. A leader,
// a chakra row or a token pile is a pile you pick from by name, and shuffling those would
// scramble a layout the player reads rather than draws from.
export function shuffleMain(deck_dict) {
    const main = deck_dict?.main
    if (!Array.isArray(main) || main.length === 0) return deck_dict

    // Expand the quantities first. The list holds one entry per distinct card with a count,
    // so shuffling the entries alone would move the playsets around while leaving all four
    // copies stacked together — sorted, just in a different order. Each copy points at one
    // shared entry object, which is what the unshuffled path already hands to addCard
    // `quantity` times over.
    const cards = []
    for (const entry of main) {
        const one = (entry.quantity || 1) === 1 ? entry : { ...entry, quantity: 1 }
        for (let i = entry.quantity || 1; i > 0; i--) cards.push(one)
    }

    // Fisher-Yates
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[cards[i], cards[j]] = [cards[j], cards[i]]
    }

    // A copy, never a mutation: the deck_dict is built fresh per deal but the entries inside it
    // come from the manifest, and the caller's list is not ours to reorder.
    return { ...deck_dict, main: cards }
}
