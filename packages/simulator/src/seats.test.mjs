// The seat model, run for real under Node — no browser, no Vue. seats.js stopped needing either
// when it moved onto stores (state/store.js), and this is that claim checked: the module under
// test is the one the table imports, not a copy of its logic.
// Run: node packages/simulator/src/seats.test.mjs

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? '  ok  ' : '  FAIL'} ${name}${detail ? `  (${detail})` : ''}`)
}

// Seeded before the import, because seats.js reads storage as it loads, exactly as a returning
// player's browser does. These are the formats @vueuse's useStorage wrote: the list as JSON, the
// seat id as a bare string. Misreading either would hand every returning player a fresh seat and
// lose their name, sleeve and hand.
const backing = new Map([
    ['cardcarp:seats:s2', JSON.stringify([
        { seatId: 's-me', name: 'Ben', sleeve: '202 80.3% 23.9%', mirror: false, anchor: { x: 0, y: 510 }, hand: [] },
        // Stored before chips existed, so it has no anchor at all.
        { seatId: 's-old', name: 'Old', sleeve: '0 62.8% 30.6%', mirror: true, hand: [] },
    ])],
    ['cardcarp:seat:s2', 's-me'],
])
globalThis.localStorage = {
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => { backing.set(key, String(value)) },
    removeItem: (key) => { backing.delete(key) },
}
const stored = (key) => backing.get(key)

const { batch, setStrict } = await import('./state/store.js')
const { anchorY, laneX } = await import('./stage.js')
const {
    seats, mySeat, mySeatId, hand, seatRoster, canAddSeat, ownSeatMirror,
    addSeat, claimSeat, removeSeat, updateSeat, setOwnSeatMirror,
    addToHand, removeFromHand, flipHandEntry, clearAllHands,
    setSeatTransport, setSeatsOnline, applySeatSnapshot, applySeatEvent, adoptRoomSeats, pushHand, startSeats,
} = await import('./seats.js')

// What createTable does before anything reads the seats: the migration, and the listener that pushes
// the hand to the room (see table.js).
startSeats()

console.log('\nloading what useStorage wrote')
ok('the stored seat is ours', mySeat.get()?.name === 'Ben', JSON.stringify(mySeat.get()?.name))
ok('the stored seat id was read bare, not as JSON', mySeatId.get() === 's-me', JSON.stringify(mySeatId.get()))

console.log('\nhands and seats, offline')
addToHand({ handEntryId: 'h-1', id: 'card-1' })
ok('a card added to the hand is in it', hand.get().length === 1)
ok('and persisted with the seat', JSON.parse(stored('cardcarp:seats:s2'))[0].hand.length === 1)

const second = addSeat({ name: 'Goldfish' })
ok('an offline seat is added straight away', seats.get().length === 3 && canAddSeat.get())

const before = seats.get()
flipHandEntry('h-1')
const after = seats.get()
ok('flipping a hand card replaces our seat', after[0] !== before[0] && after[0].hand[0].faceDown === true)
ok('and leaves every other seat the same object', after[1] === before[1])
flipHandEntry('no-such-entry')
ok('flipping a card that is not there changes nothing', seats.get() === after)

claimSeat(second)
ok('sitting in the goldfish swaps the hand under us', mySeatId.get() === second && hand.get().length === 0)
ok('the seat id is persisted bare', stored('cardcarp:seat:s2') === second, JSON.stringify(stored('cardcarp:seat:s2')))
claimSeat('s-me')
removeFromHand('h-1')
ok('a card removed from the hand is gone', hand.get().length === 0)

// Removing a seat runs the backfill for seats stored without an anchor. The fallback slot has to
// be measured against the table it is on, or its lane comes out NaN — which JSON stores as null.
removeSeat(second)
const old = seats.get().find(s => s.seatId === 's-old')
ok('a stored seat with no anchor is given its slot, not NaN', old?.anchor?.x === laneX(0, 1) && old?.anchor?.y === -anchorY(), JSON.stringify(old?.anchor))
const oldStored = JSON.parse(stored('cardcarp:seats:s2')).find(s => s.seatId === 's-old')
ok('and that anchor is persisted as numbers', oldStored?.anchor?.x === 0, JSON.stringify(oldStored?.anchor))

updateSeat('s-me', { name: 'Ben R' })
setOwnSeatMirror(true)
ok('seat edits land and persist', JSON.parse(stored('cardcarp:seats:s2'))[0].name === 'Ben R' && ownSeatMirror.get() === true)

console.log('\ngoing online')
const sent = []
setSeatTransport((op, extras) => sent.push({ op, ...extras }))
const heard = []
mySeat.listen(seat => heard.push(seat?.seatId ?? null))

batch(() => {
    setSeatsOnline(true)
    applySeatSnapshot({
        yourSeatId: 'R2',
        controllers: { R2: 'me' },
        seats: {
            // A room seat that predates anchors, so it has to be placed from its slot.
            R1: { seatId: 'R1', ord: 0, name: 'Host', hand: [] },
            R2: { seatId: 'R2', ord: 1, name: 'Ben', anchor: { x: 0, y: 510 }, hand: [{ handEntryId: 'h-9', id: 'card-9' }] },
        },
    })
})
ok('joining in one batch announces our seat once, already right', JSON.stringify(heard) === '["R2"]', JSON.stringify(heard))
ok("the room's hand is the one we hold", hand.get()[0]?.handEntryId === 'h-9')
const host = seats.get().find(s => s.seatId === 'R1')
ok('a snapshot seat with no anchor is placed in its slot, not at NaN', host?.anchor?.x === laneX(0, 1) && host?.anchor?.y === anchorY(), JSON.stringify(host?.anchor))
pushHand()
ok('the hand the snapshot gave us is not sent back', !sent.some(m => m.op === 'seat:hand'))

const roomList = seats.get()
const freeBefore = seatRoster.get().find(r => r.seatId === 'R1')?.free
applySeatEvent({ op: 'seat:control', seatId: 'R1', clientId: 'other', yourClientId: 'me' })
ok('someone sitting down changes the roster', freeBefore === true && seatRoster.get().find(r => r.seatId === 'R1')?.free === false)
ok('without the seat list changing', seats.get() === roomList)

// No pushHand() here: the listener in seats.js is what has to send it, once the hand settles.
addToHand({ handEntryId: 'h-10', id: 'card-10' })
ok('the push waits for the hand to settle rather than going per card', !sent.some(m => m.op === 'seat:hand'))
await new Promise(resolve => setTimeout(resolve, 450))
const push = sent.find(m => m.op === 'seat:hand')
ok('a card drawn online reaches the room on its own', push?.seatId === 'R2' && push.hand.length === 2, JSON.stringify(push?.hand?.length))

applySeatEvent({ op: 'seat:update', seatId: 'R1', name: 'Host 2' })
ok("a peer's seat edit lands", seats.get().find(s => s.seatId === 'R1')?.name === 'Host 2')

applySeatEvent({ op: 'seat:create', seat: { seatId: 'R3', name: 'Late', hand: [] } })
const late = seats.get().find(s => s.seatId === 'R3')
ok('a seat created without an anchor takes the next slot, not NaN', late?.anchor?.x === laneX(1, 2) && late?.anchor?.y === anchorY(), JSON.stringify(late?.anchor))
applySeatEvent({ op: 'seat:destroy', seatId: 'R3' })

console.log('\nleaving')
heard.length = 0
batch(() => {
    setSeatsOnline(false)
    adoptRoomSeats()
})
ok('leaving in one batch announces our seat once, still R2', JSON.stringify(heard) === '["R2"]', JSON.stringify(heard))
ok("the room's seats come home with us", seats.get().map(s => s.seatId).join() === 'R1,R2' && hand.get().length === 2)
ok('and are persisted as ours', JSON.parse(stored('cardcarp:seats:s2')).length === 2 && stored('cardcarp:seat:s2') === 'R2')

clearAllHands()
ok('clearing hands empties every seat', seats.get().every(s => s.hand.length === 0))

console.log('\nstrict')
setStrict(true)
let threw = false
try { seats.get()[0].name = 'edited in place' } catch { threw = true }
ok('an edit in place throws once strict is on', threw)
setStrict(false)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
