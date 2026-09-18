import { batch, persist, store } from './state/store.js'
import { clearAllHands } from './seats.js'

export const gameConfig = store(null, { raw: true })

export const gameManifest = store(null, { raw: true })

export const gameError = store(null, { raw: true })

export const cardConfig = store(null, { raw: true })

export function setGame({ id = null, config = null, manifest = null, error = null, cardConfig: card = null } = {}) {
    batch(() => {
        gameConfig.set(config)
        gameManifest.set(manifest)
        gameError.set(error)
        cardConfig.set(card)
        stampHand(id)
    })
}

const handGame = persist(store(''), 'cardcarp:hand-game')

function stampHand(id) {
    if (!id) return
    if (handGame.get() === id) return

    clearAllHands()
    handGame.set(id)
}
