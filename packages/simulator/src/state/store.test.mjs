// The store primitive has to keep its promises, because every state module on the table is built
// on them: a listener hears each real change once, a derived value is never half-updated, a batch
// hides the steps in between, and a stored value comes back in the format it was written in.
// Run: node packages/simulator/src/state/store.test.mjs

import { batch, derived, persist, readonly, setStrict, store, when } from './store.js'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? '  ok  ' : '  FAIL'} ${name}${detail ? `  (${detail})` : ''}`)
}

const json = (value) => JSON.stringify(value)

console.log('\nstore')
{
    const count = store(1)
    const heard = []
    const stop = count.listen((value, previous) => heard.push([value, previous]))
    count.set(2)
    count.set(2)
    count.update(n => n + 1)
    ok('listen hears each change once, with the value before it', json(heard) === '[[2,1],[3,2]]', json(heard))
    stop()
    count.set(9)
    ok('a stopped listener hears nothing more', heard.length === 2)
    const got = []
    count.subscribe(value => got.push(value))
    count.set(10)
    ok('subscribe is called straight away, then on change', json(got) === '[9,10]', json(got))
}

console.log('\nderived')
{
    const a = store(2)
    const b = store(3)
    let runs = 0
    const sum = derived([a, b], ([x, y]) => { runs++; return x + y })
    ok('is not computed until read', runs === 0)
    ok('reads its sources', sum.get() === 5)
    sum.get()
    ok('and is cached until one of them changes', runs === 1, `${runs} runs`)

    const parity = derived([sum], ([n]) => (n % 2 ? 'odd' : 'even'))
    const heard = []
    parity.listen(value => heard.push(value))
    a.set(3)   // 6: was odd, now even, announced
    b.set(5)   // 8: still even, not
    ok('only announces a change of answer', json(heard) === '["even"]', json(heard))
}
{
    const n = store(0)
    const label = derived([n], ([v]) => (v > 0 ? 'on' : 'off'))
    label.get()
    n.set(1)   // nobody listening yet
    const heard = []
    label.listen((value, previous) => heard.push(`${previous}→${value}`))
    n.set(0)
    ok('a listener that arrives after unheard changes starts from the current value', json(heard) === '["on→off"]', json(heard))
}

console.log('\nbatch')
// The seat model reduced to its three derivations, written in the order multiplayer.js writes a
// room join: `online` first, then the room's seat id, then its seats.
function seatGraph() {
    const online = store(false)
    const localSeats = store([{ seatId: 'L1' }])
    const localSeatId = store('L1')
    const roomSeats = store([])
    const roomSeatId = store('')
    const seats = derived([online, roomSeats, localSeats], ([on, room, local]) => (on ? room : local))
    const mySeatId = derived([online, roomSeatId, localSeatId], ([on, room, local]) => (on ? room : local))
    const mySeat = derived([seats, mySeatId], ([list, id]) => list.find(s => s.seatId === id) ?? null)
    const heard = []
    mySeat.listen(seat => heard.push(seat?.seatId ?? null))
    const join = () => {
        online.set(true)
        roomSeatId.set('R2')
        roomSeats.set([{ seatId: 'R1' }, { seatId: 'R2' }])
    }
    return { heard, join }
}
{
    const loose = seatGraph()
    loose.join()
    ok('unbatched, a listener sees the steps in between', json(loose.heard) === '[null,"R2"]', json(loose.heard))
    const held = seatGraph()
    batch(held.join)
    ok('batched, it hears only where things ended up', json(held.heard) === '["R2"]', json(held.heard))
}
{
    const a = store(1)
    const b = store(1)
    const sum = derived([a, b], ([x, y]) => x + y)
    const heard = []
    sum.listen(value => heard.push(value))
    let middle
    batch(() => {
        a.set(2)
        middle = sum.get()
        b.set(5)
    })
    ok('a read inside a batch sees the writes made so far', middle === 3, `${middle}`)
    ok('a read after that still sees the later writes', sum.get() === 7, `${sum.get()}`)
    ok('and the listener hears the end of it once', json(heard) === '[7]', json(heard))
}
{
    const s = store(0)
    const heard = []
    s.listen(value => heard.push(value))
    let early
    batch(() => {
        s.set(1)
        batch(() => s.set(2))
        early = heard.length
        s.set(3)
    })
    ok('an inner batch does not flush the outer one', early === 0)
    ok('the outer batch flushes once', json(heard) === '[3]', json(heard))
}
{
    const a = store(0)
    const b = store(0)
    const heard = []
    a.listen(value => b.set(value * 10))
    b.listen(value => heard.push(value))
    a.set(1)
    ok('a write made by a listener is announced before the first write returns', json(heard) === '[10]', json(heard))
}
{
    const s = store(0)
    const heard = []
    const quiet = console.error
    let logged = 0
    console.error = () => { logged++ }
    s.listen(() => { throw new Error('listener failure') })
    s.listen(value => heard.push(value))
    s.set(1)
    console.error = quiet
    ok('one listener throwing does not cost the next its update', json(heard) === '[1]' && logged === 1)
}

console.log('\nstrict')
{
    setStrict(true)
    const seats = store([{ seatId: 'a', hand: [] }])
    let threw = false
    try { seats.get()[0].hand.push('card') } catch { threw = true }
    ok('an edit in place throws', threw)

    class Texture { constructor() { this.width = 1 } }
    const texture = new Texture()
    store({ texture }).get()
    ok('a class instance inside a value is left alone', !Object.isFrozen(texture))

    const kept = seats.get()[0]
    seats.update(list => [...list, { seatId: 'b', hand: [] }])
    ok('a new value is frozen through, reusing what was already frozen', Object.isFrozen(seats.get()[1].hand) && seats.get()[0] === kept)
    setStrict(false)
}

console.log('\nraw')
{
    setStrict(true)
    const manifest = { card_list: [{ id: 'a' }] }
    const held = store(manifest, { raw: true })
    ok('a raw store hands its value back untouched in strict mode', held.get() === manifest && !Object.isFrozen(manifest) && !Object.isFrozen(manifest.card_list))
    let heardFrozen = null
    held.listen(value => { heardFrozen = Object.isFrozen(value) })
    held.set({ card_list: [] })
    ok('and to its listeners', heardFrozen === false)
    const list = derived([held], ([m]) => m.card_list, { raw: true })
    ok('a raw derived store passes borrowed data through unfrozen too', !Object.isFrozen(list.get()))
    setStrict(false)
}

console.log('\nwhen')
{
    const config = store(null)
    let resolved = null
    const waiting = when(config).then(value => { resolved = value })
    await Promise.resolve()
    ok('waits while the value does not pass', resolved === null)
    config.set({ name: 'wow' })
    await waiting
    ok('resolves with the first value that does', resolved?.name === 'wow')
    ok('resolves at once when the current value already passes', (await when(config)).name === 'wow')

    const manifest = store(null)
    const error = store(null)
    const either = when([manifest, error], ([m, e]) => m || e)
    error.set(new Error('HTTP 404'))
    const [m, e] = await either
    ok('waits on several stores at once, with their values together', m === null && e?.message === 'HTTP 404')

    const count = store(0)
    let wakes = 0
    const past = when(count, v => { wakes++; return v >= 2 })
    count.set(1)
    count.set(2)
    await past
    const before = wakes
    count.set(3)
    ok('and stops listening once it has resolved', wakes === before, `${before} checks, then ${wakes}`)
}

console.log('\npersist')
function memoryStorage(entries = {}) {
    const map = new Map(Object.entries(entries))
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => { map.set(key, String(value)) },
        removeItem: (key) => { map.delete(key) },
        dump: () => Object.fromEntries(map),
    }
}
{
    // What @vueuse/core's useStorage wrote before the switch: JSON for a list, a bare string for an id.
    const storage = memoryStorage({ seats: '[{"seatId":"s-1","name":"Ben"}]', seat: 's-1' })
    const seats = persist(store([]), 'seats', { storage })
    const seat = persist(store(''), 'seat', { storage })
    ok('reads a list useStorage wrote', seats.get()[0]?.name === 'Ben')
    ok('reads a string useStorage wrote, unquoted', seat.get() === 's-1', json(seat.get()))
    seat.set('s-2')
    seats.update(list => [...list, { seatId: 's-2' }])
    const written = storage.dump()
    ok('writes both back in the same formats', written.seat === 's-2' && JSON.parse(written.seats).length === 2, json(written))
}
{
    const storage = memoryStorage({ broken: '{not json' })
    const quiet = console.error
    console.error = () => {}
    const s = persist(store(['fallback']), 'broken', { storage })
    console.error = quiet
    ok('an unreadable value falls back to the default', s.get()[0] === 'fallback')

    const fresh = memoryStorage()
    persist(store(true), 'flag', { storage: fresh })
    ok('a missing key is written with the default, as useStorage did', fresh.dump().flag === 'true', json(fresh.dump()))
}

console.log('\nreadonly')
{
    const source = store(1)
    const view = readonly(source)
    const heard = []
    const stop = view.listen((value, previous) => heard.push([value, previous]))
    source.set(2)
    ok('a read-only view reads the store', view.get() === 2)
    ok('and hears it change, with the value before', JSON.stringify(heard) === '[[2,1]]', JSON.stringify(heard))
    ok('but has nothing that writes', !('set' in view) && !('update' in view) && Object.isFrozen(view))
    stop()
    source.set(3)
    ok('and stops hearing when told to', heard.length === 1)
    let seen = null
    const unsubscribe = view.subscribe((value) => { seen = value })
    ok('subscribe hands over the current value at once, as the store does', seen === 3)
    unsubscribe()
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
