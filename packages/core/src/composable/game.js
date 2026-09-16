// composable/game.js
//
// A game publishes its data split two ways — by size, and by feature:
//
//   config/game.json        presentation + the card model. Required.
//   config/deck.json        the deck vocabulary. Absent = this game has no decks.
//   config/simulator.json   the table. Absent = this instance has no table.
//   sets.json      3–22 KB  the set tree (read by @cardcarp/deckbox's composable/set-list.js)
//   manifest.json  1–25 MB  card_dict + deck_dict, the archives
//
// The config is BUNDLED and the data is FETCHED, and that line is drawn by what
// each thing is rather than by how big it is. See CONFIG below.
//
// The feature split is newer and is about what a project instance IS. Not every
// deployment of this has a deckbox or a table, and a missing file is how one
// says so — see applyConfig. The three are merged back into a single `config`
// object, so nothing downstream had to change.
//
// This module owns the config and the manifest.
import { computed, ref, markRaw } from 'vue'
import { gameDataUrl } from '../config.js'

// Global Singleton State
const manifest = ref(null)

// The game's presentation config. Independent of `manifest` — consumers that
// only need labels, filters or the card shape never have to wait for the
// archive.
const config = ref(null)

// The key of the loaded game ('mtg', 'ptcg', 'wow') — the folder name under
// /game and the key into data/game-list.json. Neither published file carries an
// id, so this is the canonical handle: profile records, card art URLs and the
// table's per-game state are all keyed off it.
//
// It is set only once the manifest has actually landed, so it doubles as "the
// archive is here": the views key their skeletons off `loading` instead.
const game = ref(null)

// The game the route is on, set the moment navigation happens rather than when
// its data lands. `game` above cannot answer this any more: with the manifest
// no longer blocking the route, there is a multi-second window where the user
// is demonstrably on /mtg and no mtg archive exists yet.
//
// Everything keyed to "which game am I working in" — the player's saved decks,
// their storage list, the per-game state resets — belongs on this one. It comes
// from the route, so it needs no network and is never briefly wrong. Only
// archive-derived data waits on `game`.
const active_game = ref(null)

// Whether the *manifest* is in flight. Config has its own flag below; this is
// the one the card skeletons and the load strip watch, because it is the one
// that takes seconds. The route no longer waits for it (see router/index.js),
// so the views need it to tell two empty lists apart: "nothing has arrived yet"
// and "this search matched nothing".
const loading = ref(false)

// Whether config is in flight. Separate because the two now settle at very
// different times, and a panel that can render as soon as config lands should
// not be held back by the archive behind it.
const config_loading = ref(false)

// The failure from the last attempt, if either file failed. Without it a
// dropped request leaves the views skeletoning forever, which reads as a hang.
const error = ref(null)

// The game the app most recently asked for. Set synchronously, before the
// requests start, so a slow response can tell whether it is still wanted —
// mtg is ~25 MB on the wire, so a user clicking through to another game
// mid-flight is a real window, not a theoretical one.
let requested = null

// The published card size, in millimetres. Print lays real pages out with it
// (cards per A4 sheet), so it is a physical dimension rather than merely a
// ratio — and every card surface in the app derives its shape from it, so it is
// also the only place the aspect is stated.
//
// 63 x 88, not the 63.5 x 88.9 usually quoted for a "standard" card: the larger
// figure is what the published data claims, and measuring real cards with
// calipers does not agree with it. The fallback follows the cards, not the
// paperwork.
const card_size = computed(() => ({
    width: config.value?.card?.size?.width ?? 63,
    height: config.value?.card?.size?.height ?? 88,
}))

// The same, as a CSS aspect-ratio string — what most consumers actually want.
// Shared so the grid, the skeleton standing in for the grid, the preview and the
// probability hand all quote one number: a skeleton whose cards are a different
// shape from the real ones reshuffles the whole grid the moment data lands.
const card_ratio = computed(() => `${card_size.value.width}/${card_size.value.height}`)

// What the canvas needs to draw a card, and nothing else. The table's canvas and
// multiplayer layers take a "config" argument that used to be the entire
// manifest.data — ~60 KB, far past the relay's 8 KB node-payload cap, so it had
// to be slimmed again on the way to the wire. Building it small here means the
// object that travels is small by construction.
const card_config = computed(() => ({
    name: config.value?.name,
    size: card_size.value,
}))

// === Every game's config, supplied by the host ===
//
// These used to be fetched from the bucket alongside the archives, and that was
// the wrong side of the line. A config is not DATA the app reads — it is the
// other half of a contract the code defines: stage.js states what `table.surface`
// means and simulator.json is an instance of it. Splitting those across a
// network boundary means a schema change and its instances can drift silently,
// with nothing in the repo able to see the drift, and no commit that contains
// both halves of the change.
//
// They are HANDED IN rather than read from a folder here, and that is the whole
// difference between a package and an app. Core cannot know which games exist:
// a project embedding only the deckbox ships one game and no table, and a
// third party's project ships a game this repo has never heard of. What core
// knows is the SHAPE — three files, merged, two of them optional — and that is
// what it is for.
//
// It also settles what "shared config" means when a project installs both the
// deckbox and the table: they share it because they share this module, and
// they share this module because core is a peer dependency of both. Two copies
// of core would be two registries and two manifests, which is the failure this
// arrangement exists to make impossible.
let CONFIG = {}

// Called once, at boot, before any route resolves. See the host's main.js.
export function provideGameConfigs(configs) {
    CONFIG = configs ?? {}
}

// What the host has been given, for a router guard deciding whether a :game
// route is real. Reading the keys is the whole of "is this a game we have".
export function knownGames() {
    return Object.keys(CONFIG)
}

// The glob-to-registry step, here rather than in each host, because the SHAPE of
// a config folder is core's business and the glob itself cannot be: import.meta
// .glob takes a literal, resolved against the file that writes it, so it has to
// be written in the app that owns the folder.
//
//   provideGameConfigs(gameConfigsFromGlob(
//       import.meta.glob('./data/game/*/config/*.json', { eager: true, import: 'default' })
//   ))
//
// A missing file is a missing key, at build time, and there is nothing to infer.
// fetchSection used to read "this game has no table" off an HTTP 404, which it
// could not tell from a bucket briefly 404ing one.
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

// Track active requests by name to handle rapid dataset switching
const activeRequests = new Map()

export function useGameStore() {
    // Start (or join) the load for `name`. Callers are free not to await this —
    // the route renders straight away and the views fill in as each file lands.
    function loadGame(name) {
        requested = name
        active_game.value = name

        // Single source of truth check
        if (game.value === name) return Promise.resolve()

        // Drop the outgoing game's data now rather than when the new one
        // arrives. Without the guard's await holding the old route in place,
        // keeping it would render the previous game's cards under the new
        // game's route until the fetch returned.
        config.value = null
        manifest.value = null
        game.value = null
        error.value = null
        config_loading.value = true
        loading.value = true

        // Config first, and it lands HERE — no request, no await, no window in
        // which the route is up and the app does not yet know what a card is.
        // The staleness guard the fetch needed is gone with it: nothing can
        // arrive late enough to be for the wrong game.
        applyConfig(name)
        config_loading.value = false

        // Prevent concurrent fetches for the EXACT same dataset
        if (activeRequests.has(name)) return activeRequests.get(name)

        const requestPromise = fetchManifest(name).finally(() => {
            if (requested === name) loading.value = false
            activeRequests.delete(name)
        })

        activeRequests.set(name, requestPromise)

        return requestPromise
    }

    // A missing file under public/ is served as the SPA index.html with a 200,
    // so status alone can't tell us the file is really there. Only the archives
    // come this way now; the config is bundled (see CONFIG).
    async function fetchJson(name, file) {
        const url = gameDataUrl(name, file)
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)

        if (!response.headers.get('content-type')?.includes('json')) {
            throw new Error(`${url} did not return JSON — is the file present?`)
        }

        return response.json()
    }

    // === Three files, one config ===
    //
    // Split so that a project instance can ship only what it is:
    //
    //   game.json       name, dataset, card — who this is and what a card of it is. Required.
    //   deck.json       the deck vocabulary. Absent for a game with no decks at all.
    //   simulator.json  the table. Absent for a deckbox-only instance.
    //
    // Named for what they DESCRIBE rather than for the app that reads them, because the readers
    // do not divide the way the apps do — the table's own deckbox reads deck.filter for its
    // format and theme facets, and card.size is what the simulator derives a card's world size
    // from. "deckbox.json" would be a name that lies to the simulator importing it.
    //
    // Merged back into the one `config` shape everything already reads, so this is plumbing and
    // not a migration: `config.value.card`, `.deck` and `.simulator` all still mean what they
    // meant. The only difference is that the last two can legitimately be undefined.
    //
    // Absent is not an error and not a warning — it is how a project says it does not have that
    // feature, which is the whole reason the config is three files rather than one. It is now
    // also a fact rather than an inference: a game with no table has no simulator.json in its
    // folder, and the glob simply has no key for it.
    function applyConfig(name) {
        const files = CONFIG[name]

        // The one genuine failure: a game the build has never heard of, or one whose folder is
        // missing the file that says what a card is. Broken at build time rather than at 3am,
        // which is most of the point of bundling these.
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
            const data = await fetchJson(name, 'manifest.json')

            // The user moved on while this was downloading. Publishing it now
            // would drop one game's cards into the route for another.
            if (requested !== name) return

            const raw = markRaw(data)

            // The archives are the dicts in array form. Records carry their own
            // `id`, so this is a list of the same objects rather than a copy of
            // them — spreading the key in built a second 100k-object graph and
            // cost ~4x the time and ~7x the heap for nothing.
            raw.card_list = Object.values(raw.card_dict)

            // Published decks record their contents as { group: { id: qty } } and
            // carry no card count. Derive it once, onto the record itself, so a
            // deck reached through either the dict or the list reports the same
            // total — the deck table's "Cards" column reads it, and profile decks
            // (which compute their own) have to line up with them.
            for (const deck of Object.values(raw.deck_dict)) {
                deck.total = deckTotal(deck.list)
            }
            raw.deck_list = Object.values(raw.deck_dict)

            manifest.value = raw
            game.value = name
        } catch (err) {
            console.error(`Failed to load game manifest for ${name}`, err)

            // A stale failure is not this game's problem — leave the state
            // belonging to the request the user is actually waiting on.
            if (requested !== name) return

            // Leave the key unset so a retry isn't short-circuited by the cache
            // check above, and so consumers keyed off it stay inert.
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

// Sum of every quantity across a deck's groups (main / side / commander / …).
function deckTotal(list) {
    return Object.values(list ?? {}).reduce(
        (sum, group) => sum + Object.values(group ?? {}).reduce((n, qty) => n + (qty ?? 0), 0),
        0
    )
}
