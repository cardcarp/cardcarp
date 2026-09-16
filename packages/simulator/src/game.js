// The game the table is set up for — its config, its card archive, and what a card of it looks
// like — handed in by whatever hosts the table rather than read out of @cardcarp/core's store.
//
// Four table modules used to call useGameStore() as they loaded and read core's refs directly
// (deal.js, flip.js, seat-setup.js, deck-link.js), and the card tool reached the same store
// through useImage. The table could only be imported beside core's Vue store, and its real inputs
// were hidden behind a singleton. Now the host says what the game is — index.vue passes core's
// values on as they land — and those modules read it here.
//
// All raw stores (see state/store.js). None of it is the table's: a manifest can run to tens of
// megabytes and is shared with the deckbox, so strict mode must never walk it or freeze it.

import { batch, persist, store } from './state/store.js'
import { clearAllHands } from './seats.js'

// The game's merged config (game.json, deck.json and simulator.json), or null until it lands.
export const gameConfig = store(null, { raw: true })

// The card archive — card_dict, card_list, deck_dict, deck_list — or null while it downloads.
export const gameManifest = store(null, { raw: true })

// Why the archive is not coming, if it isn't. Kept apart from the manifest so that "not here yet"
// and "not coming" read differently to anything waiting on it (see deck-link.js).
export const gameError = store(null, { raw: true })

// What the canvas needs to draw a card, and nothing else: { name, size }. Small by construction,
// because it rides the wire inside every card's node payload (see slimCardConfig in multiplayer.js).
export const cardConfig = store(null, { raw: true })

// Tell the table which game it is showing, and what that game is. Call it whenever any part
// changes, with the whole current picture: the id arrives with the route, the config with it, the
// manifest seconds behind. A part not given is taken to be absent, not left as it was.
export function setGame({ id = null, config = null, manifest = null, error = null, cardConfig: card = null } = {}) {
    batch(() => {
        gameConfig.set(config)
        gameManifest.set(manifest)
        gameError.set(error)
        cardConfig.set(card)
        stampHand(id)
    })
}

// === The game a hand was dealt from ===
//
// The hand is per-game but persists, so the game has to persist with it: on a reload straight into
// another game there is no previous route to compare against, only what localStorage carries. Kept
// beside the seats rather than inside them so every consumer still reads a plain array of entries.
// Empty string rather than null as the default: an empty string picks the bare-string format (see
// persist), which is the format every browser that has already played is holding.
const handGame = persist(store(''), 'cardcarp:hand-game')

// Drop the hand if it was not dealt from the game now on the table. Hand entries are raw card
// records — a ptcg card left in a wow hand resolves its art against a manifest that has no such id,
// and dropping it on the table would put a card in play that game doesn't have.
//
// An empty stamp means the hand predates this stamping (or was written by an older build), so its
// game can't be established — clear it rather than adopt it into whatever game happens to load
// first, which is the exact staleness this avoids. Every seat is emptied, not just ours: a goldfish
// seat holding last game's cards is the same staleness, and it would surface the moment somebody
// sat down in it.
function stampHand(id) {
    if (!id) return
    if (handGame.get() === id) return

    clearAllHands()
    handGame.set(id)
}
