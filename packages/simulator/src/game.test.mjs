let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? '  ok  ' : '  FAIL'} ${name}${detail ? `  (${detail})` : ''}`)
}

const backing = new Map([
    ['cardcarp:seats:s2', JSON.stringify([
        { seatId: 's-me', name: 'Ben', sleeve: '202 80.3% 23.9%', mirror: false, anchor: { x: 0, y: 510 }, hand: [{ handEntryId: 'h-1', id: 'card-1' }] },
    ])],
    ['cardcarp:seat:s2', 's-me'],
])
globalThis.localStorage = {
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => { backing.set(key, String(value)) },
    removeItem: (key) => { backing.delete(key) },
}

const { setStrict, when } = await import('./state/store.js')
const { gameConfig, gameManifest, gameError, cardConfig, setGame } = await import('./game.js')
const { hand, addToHand } = await import('./seats.js')

console.log('\nbefore the host says anything')
ok('nothing is set', gameConfig.get() === null && gameManifest.get() === null && gameError.get() === null && cardConfig.get() === null)
ok('and importing it leaves the hand alone', hand.get().length === 1)

console.log('\nwhat the host hands in')
setStrict(true)
const waitingForArchive = when([gameManifest, gameError], ([manifest, error]) => manifest || error)
const config = { name: 'World of Warcraft TCG', card: { size: { width: 63, height: 88 } }, simulator: { card: { flip: { deck: ['hero'] } } } }
setGame({ id: 'wow', config, cardConfig: { name: config.name, size: config.card.size } })
ok('the config is held as given — the same object', gameConfig.get() === config)
ok('and is never frozen, even in strict mode', !Object.isFrozen(config) && !Object.isFrozen(config.simulator))
ok('the card config comes with it', cardConfig.get()?.size?.width === 63)
ok('an unstamped hand is dropped when the game arrives', hand.get().length === 0)
ok('and the stamp is stored bare, as useStorage wrote it', backing.get('cardcarp:hand-game') === 'wow', JSON.stringify(backing.get('cardcarp:hand-game')))

const manifest = { card_dict: { c1: { id: 'c1' } }, card_list: [{ id: 'c1' }], deck_dict: {}, deck_list: [] }
addToHand({ handEntryId: 'h-2', id: 'card-2' })
setGame({ id: 'wow', config, manifest, cardConfig: cardConfig.get() })
const [landed] = await waitingForArchive
ok('a wait on the archive wakes when the manifest lands', landed === manifest)
ok('the manifest is never frozen either', !Object.isFrozen(manifest) && !Object.isFrozen(manifest.card_list))
ok('the same game keeps the hand', hand.get().length === 1)

setGame({ id: 'ptcg' })
ok('another game drops the hand', hand.get().length === 0 && backing.get('cardcarp:hand-game') === 'ptcg')
ok('and a part not given is absent, not left over from the last game', gameManifest.get() === null && gameConfig.get() === null)

const failed = new Error('HTTP 404')
const waitingAgain = when([gameManifest, gameError], ([m, e]) => m || e)
setGame({ id: 'ptcg', error: failed })
const [none, why] = await waitingAgain
ok('an archive that fails wakes the wait too, with no manifest', none === null && why === failed)
setStrict(false)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
