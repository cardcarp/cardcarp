// Locations resolve against the game's root unless they are a full URL or start with /.
// Card art is the one fixed layout: {cards}/{dir}[-{variant}].avif.
const ABSOLUTE = /^([a-z][a-z\d+.-]*:|\/)/i

export function resolveUrl(root, path) {
    if (!path) return ''
    if (ABSOLUTE.test(path)) return path
    if (typeof root !== 'string' || !root) return ''
    return `${root.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`
}

let STORAGE = {}

const REQUIRED = ['root', 'cards', 'manifest']

export function provideStorage(games = {}) {
    STORAGE = {}
    for (const [game, entry] of Object.entries(games ?? {})) {
        const missing = REQUIRED.filter(key => typeof entry?.[key] !== 'string' || !entry[key])
        if (missing.length) {
            console.error(
                `[storage] "${game}" is missing ${missing.join(', ')}.`
                + (missing.includes('root') ? ' Is its root\'s build variable set? For an app\'s own public/ folder, use \'/\'.' : ''),
            )
        }
        STORAGE[game] = { ...entry }
    }
}

const warned = new Set()

function warnOnce(key, message) {
    if (warned.has(key)) return
    warned.add(key)
    console.warn(message)
}

function locate(game, key) {
    const entry = STORAGE[game]
    if (!entry) {
        warnOnce(`game:${game}`, `[storage] no storage for "${game}" — call provideStorage at boot (see @cardcarp/core/storage.js)`)
        return ''
    }
    if (!entry[key]) {
        warnOnce(`${game}:${key}`, `[storage] "${game}" declares no ${key} location`)
        return ''
    }
    return resolveUrl(entry.root, entry[key])
}

export const manifestUrl = (game) => locate(game, 'manifest')
export const setsUrl = (game) => locate(game, 'sets')

export function cardArtUrl(game, file, filetype = 'avif') {
    const cards = locate(game, 'cards')
    return cards && file ? `${cards.replace(/\/+$/, '')}/${file}.${filetype}` : ''
}

export function assetUrl(game, path) {
    if (!path) return ''
    return resolveUrl(STORAGE[game]?.root, path) || (locate(game, 'root'), '')
}
