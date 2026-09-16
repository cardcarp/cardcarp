// Dealing a deck named in the URL: /mtg/table?deck=secret-lair-drop-dandan-deck
//
// The link is a shortcut for one specific click — the deck row in the deckbox — and nothing
// more. It calls the same addDeck the row does, so the deck arrives shuffled, laid onto the
// mat's named zones, and marked as this seat's opening deal, because all three of those are
// decisions addDeck/deal.js already make. Nothing here draws a hand or mulligans: the table
// enforces no rules, and a link that dealt an opening hand would be guessing at a sequence the
// player performs themselves.
//
// === Why this waits, and for what ===
//
// Entering the route does not wait for data (see the note in router/index.js): the guard fires
// loadGame and returns, so the table mounts against an empty manifest and fills in later. Three
// things therefore have to have happened before a deck can be dealt, and they finish in a
// different order every load:
//
//   the canvas exists    — addDeck draws onto a Konva stage. index.vue calls initCanvas in
//                          onMounted, which is what this is chained off.
//   the opening kit is   — spawnOpeningDefaults awaits `config` and then calls clearSeatsPlaced.
//   laid out               Dealing before that returns would wipe the flag addDeck had just
//                          set, and the NEXT deck the player added would be treated as their
//                          opening deal — laid over the top of this one on the mat's zones.
//   the manifest landed  — the deck record and every card in it come from card_dict, which for
//                          mtg is tens of MB and seconds behind the route.
//
// So: chained after spawnOpeningDefaults by the caller, and awaiting the manifest itself here.

// The game, as the host handed it in
import { cardConfig, gameError, gameManifest } from './game.js'
import { when } from './state/store.js'

// Table
import { buildDeckDict } from './deal.js'
import { addDeck, connectionStatus } from './multiplayer.js'
import { emitTableEvent } from './events.js'
import { foldName } from './fold-name.js'

// Bumped on teardown, for the same reason seat-setup.js keeps one: this waits on a download
// measured in seconds, and a player who opened one game's table and moved on should not have
// the abandoned manifest deal a deck onto the table they are looking at now.
let token = 0

export function cancelQueryDeck() {
    token++
}

// Resolve `?deck=` against the game's published decks.
//
// The record `id` is already a URL-safe slug ("secret-lair-drop-dandan-deck"), so an exact hit
// on it is the canonical form and the one a share link should carry. The looser passes are for
// a link typed by hand: "?deck=dandan" is what someone writes, and it should find Dandân Deck
// rather than nothing. Folded through the same foldName the deck search uses, so a URL can be
// typed without the accent the deck's name carries.
//
// Loose matching stops at the first ambiguity rather than guessing. "?deck=black-deck" names
// both Black Deck A and Black Deck B, and dealing whichever the manifest happened to list first
// is a link that means something different per game update.
function resolveDeck(query) {
    const dict = gameManifest.get()?.deck_dict ?? {}
    const list = gameManifest.get()?.deck_list ?? []

    if (dict[query]) return { deck: dict[query] }

    const wanted = foldName(query)
    if (!wanted) return { deck: null }

    const exact = list.filter(d => foldName(d.id) === wanted || foldName(d.name) === wanted)
    if (exact.length === 1) return { deck: exact[0] }

    const partial = list.filter(d => foldName(d.id).includes(wanted) || foldName(d.name).includes(wanted))
    if (partial.length === 1) return { deck: partial[0] }

    return { deck: null, ambiguous: partial }
}

export async function dealQueryDeck(query) {
    const mine = ++token
    const wanted = String(query ?? '').trim()
    if (!wanted) return

    // Online the room's table is the authority and its contents arrive in the snapshot — the
    // same reason spawnOpeningDefaults stands down. Entering the route is always offline, so
    // this only guards a re-entry with a connection somehow still up.
    if (connectionStatus.get() !== 'disconnected') return

    // Resolves as soon as either lands. Without the error side a failed manifest would leave
    // this pending for the life of the page, holding the deck records it is waiting for.
    await when([gameManifest, gameError], ([manifest, error]) => manifest || error)
    if (mine !== token) return
    if (!gameManifest.get()) return

    const { deck, ambiguous } = resolveDeck(wanted)

    // Nothing matched, or too much did. Announced rather than acted on: the link was a pointer at
    // a deck, so a UI will usually want the player left looking at its deck list rather than
    // at a bare mat wondering what the URL did — but that is the UI's to decide.
    if (!deck) {
        console.warn(
            ambiguous?.length
                ? `?deck=${wanted} matches ${ambiguous.length} decks — name one exactly`
                : `?deck=${wanted} matches no deck in this game`,
        )
        emitTableEvent('deck-link', { query: wanted, deck: null, ambiguous: ambiguous ?? [] })
        return
    }

    addDeck(buildDeckDict(deck.list), cardConfig.get())

    // Dealt. A UI that put its deck list up on load (ptcg's does, see its tutorial.js) can take
    // it down now: the next thing to do has just been done.
    emitTableEvent('deck-link', { query: wanted, deck })
}
