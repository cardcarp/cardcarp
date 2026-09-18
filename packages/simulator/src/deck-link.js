import { cardConfig, gameError, gameManifest } from './game.js'
import { when } from './state/store.js'

// Table
import { buildDeckDict } from './deal.js'
import { addDeck, connectionStatus } from './multiplayer.js'
import { emitTableEvent } from './events.js'
import { foldName } from './fold-name.js'

let token = 0

export function cancelQueryDeck() {
    token++
}

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

    if (connectionStatus.get() !== 'disconnected') return

    await when([gameManifest, gameError], ([manifest, error]) => manifest || error)
    if (mine !== token) return
    if (!gameManifest.get()) return

    const { deck, ambiguous } = resolveDeck(wanted)

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

    emitTableEvent('deck-link', { query: wanted, deck })
}
