import { computed, ref, markRaw } from 'vue'
import { manifestUrl } from '../storage.js'

// Global Singleton State
const manifest = ref(null)

const config = ref(null)

const game = ref(null)

const active_game = ref(null)

const loading = ref(false)

const config_loading = ref(false)

const error = ref(null)

let requested = null

const card_size = computed(() => ({
    width: config.value?.card?.size?.width ?? 63,
    height: config.value?.card?.size?.height ?? 88,
}))

const card_ratio = computed(() => `${card_size.value.width}/${card_size.value.height}`)

const card_config = computed(() => ({
    name: config.value?.name,
    size: card_size.value,
}))

let CONFIG = {}

export function provideGameConfigs(configs) {
    CONFIG = configs ?? {}
}

export function knownGames() {
    return Object.keys(CONFIG)
}

export function gameConfigsFromGlob(modules) {
    const out = {}
    for (const [path, data] of Object.entries(modules ?? {})) {
        const found = /\/([^/]+)\/config\/([^/]+)\.json$/.exec(path)
        if (!found) continue
        const [, key, file] = found
        out[key] ??= {}
        out[key][file] = data
    }
    return out
}

const activeRequests = new Map()

export function useGameStore() {
    function loadGame(name) {
        requested = name
        active_game.value = name

        if (game.value === name) return Promise.resolve()

        config.value = null
        manifest.value = null
        game.value = null
        error.value = null
        config_loading.value = true
        loading.value = true

        applyConfig(name)
        config_loading.value = false

        if (activeRequests.has(name)) return activeRequests.get(name)

        const requestPromise = fetchManifest(name).finally(() => {
            if (requested === name) loading.value = false
            activeRequests.delete(name)
        })

        activeRequests.set(name, requestPromise)

        return requestPromise
    }

    async function fetchJson(url) {
        if (!url) throw new Error('no location declared for it (see provideStorage)')
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)

        // A missing file can come back as the SPA's index.html with a 200.
        if (!response.headers.get('content-type')?.includes('json')) {
            throw new Error(`${url} did not return JSON — is the file present?`)
        }

        return response.json()
    }

    function applyConfig(name) {
        const files = CONFIG[name]

        if (!files?.game) {
            const err = new Error(
                `No config for "${name}". The host supplies these at boot —`
                + ` see provideGameConfigs. Known: ${knownGames().join(', ') || '(none provided)'}`,
            )
            console.error(err)
            config.value = null
            error.value = err
            return
        }

        const merged = { ...files.game }
        if (files.deck) merged.deck = files.deck
        if (files.simulator) merged.simulator = files.simulator

        config.value = markRaw(merged)
    }

    async function fetchManifest(name) {
        try {
            const data = await fetchJson(manifestUrl(name))

            if (requested !== name) return

            const raw = markRaw(data)

            raw.card_list = Object.values(raw.card_dict)

            for (const deck of Object.values(raw.deck_dict)) {
                deck.total = deckTotal(deck.list)
            }
            raw.deck_list = Object.values(raw.deck_dict)

            manifest.value = raw
            game.value = name
        } catch (err) {
            console.error(`Failed to load game manifest for ${name}`, err)

            if (requested !== name) return

            manifest.value = null
            game.value = null
            error.value = err
        }
    }

    return {
        manifest,
        config,
        game,
        active_game,
        card_size,
        card_ratio,
        card_config,
        loading,
        config_loading,
        error,
        loadGame
    }
}

function deckTotal(list) {
    return Object.values(list ?? {}).reduce(
        (sum, group) => sum + Object.values(group ?? {}).reduce((n, qty) => n + (qty ?? 0), 0),
        0
    )
}
