// What a seat is dealt when it arrives at the table.
//
// A game lists them in `simulator.seat` (see accessory.js), each entry naming an accessory and
// where it goes relative to the seat's chip. The default placement puts a thing directly in
// front of the chip, which for a playmat lands it in the middle of the screen with the chip at
// the bottom edge behind the hand fan.
//
// Two ways in, and keeping them apart is what stops a table dealing itself several playmats:
//
//   a seat is created — fired by the local addSeat only (seats.js hands us the seat), never by
//                       a peer's seat:create arriving over the wire. Online, the node:create
//                       that follows is what puts the mat on everybody else's table; if every
//                       client also spawned its own, the room would get one per player.
//   the table opens   — the seats that already exist when the canvas is built, which is what
//                       puts a mat in front of you the first time you open the route. Offline
//                       only: online the room's canvas is the authority and its boards arrive
//                       in the snapshot.

// Stores
import { derived, when } from './state/store.js'

// The game, as the host handed it in
import { gameConfig } from './game.js'

// Multiplayer
import {
    broadcastTableReset,
    clearTableNodes,
    connectionStatus,
    setTableResetHandler,
} from './multiplayer.js'

// Canvas — the view flags a reset puts back, alongside the table it rebuilds.
import { resetScenery } from './canvas-pixi/index.js'

// Opening deals — the flag that decides whether a deck is laid onto the mat's zones.
import { clearSeatsPlaced } from './deal.js'

// Announced after a reset, for the UI to answer — see events.js.
import { emitTableEvent } from './events.js'

// Seats
import { resetSeatHands, resetSeatLayout, seatFacing, seatLayoutStale, seatPoint, seats } from './seats.js'
import { sharedPoint } from './stage.js'

// Accessories
import { adderFor, facesSeat, gameSpawns, seatSpawns } from './accessory.js'

// Lay a seat's kit out against its chip. Placement is side / align / sideOffset / alignOffset
// read from the seat's own point of view (see seatPoint), so one line of config serves both ends
// of the table.
//
// Entries are placed in the order the config lists them, and the same accessory may appear more
// than once — two dice, a mat and a token pile. Two entries that resolve to the same point are
// stepped apart by the spawn-overlap check (canvas/spawn.js) rather than hidden under each other.
//
// The adders come from multiplayer.js, so each one is stamped with a node id and broadcast —
// offline that send is a no-op, which is what lets one code path serve both.
// A config's x/y is the accessory's TOP-LEFT, not its centre.
//
// Which is the only reading that survives contact with an image editor. An author measuring off
// their playmat art reads corners, not middles — "the deck goes 544 across and 29 down" means the
// corner of the deck, and `{ "x": 0, "y": 0 }` should mean flush in the corner of the seat rather
// than three quarters of the mat hanging outside it.
//
// Converted here rather than inside seatPoint, and BEFORE the seat's turn is applied, because
// the offset belongs to the box's own frame: the far seat is rotated a half turn, so half a
// width added afterwards would move the thing the wrong way.
//
// The canvas nodes are still centre-origin — addBoard and friends take a centre — so this is a
// translation at the boundary, which is where a difference between how a person writes something
// and how the renderer wants it belongs.
function placementCentre(place, size) {
    return {
        x: (Number(place?.x) || 0) + (Number(size?.width) || 0) / 2,
        y: (Number(place?.y) || 0) + (Number(size?.height) || 0) / 2,
    }
}

export function spawnSeatDefaults(seat) {
    const spawns = seatSpawns(gameConfig.get())
    if (spawns.length === 0) return

    // Only the things that keep the table's orientation are turned to face the seat. A die or a
    // marker rights itself for whoever is looking, so turning it as well would land it upside
    // down for everyone but its owner — see facesSeat.
    const facing = seatFacing(seat)
    for (const { item, place, options } of spawns) {
        const { x, y } = seatPoint(seat, placementCentre(place, item.size))
        adderFor(item)(item, x, y, { rotation: facesSeat(item) ? facing : 0, ...options })
    }
}

// === Adding a seat lays the table out again ===
//
// Seats sharing a side sit in lanes centred on that side, so a new arrival shifts everyone
// already there — one player sits in the middle, two straddle it. Nothing on the table follows
// an anchor: spawnSeatDefaults hands the adders absolute world coordinates once and never
// revisits them, so moving a seat and leaving its mat behind is not an option. The only honest
// way to move a seat is to lay the whole table out again, which is what resetTable does.
//
// So a join tidies and re-deals. That is destructive of a game in progress, and deliberately so:
// the alternative is a fifth player parked off the end of a table that never re-centres, which
// is the arrangement this whole change exists to get rid of.
//
// Waiting for the seat to LAND rather than acting on the one addSeat handed us, because online
// it is still on the wire — `seats` will not contain it, and slotting a roster that is one short
// would put everybody on the wrong lane and then leave the newcomer off its own.
//
// `pending` is also what makes exactly one client do this. Every client sees the roster change,
// but only the one that called addSeat is waiting on a seat, so only it resets — and the reset
// reaches the rest as the table:reset instruction and node traffic they already know how to
// apply. A seat LEAVING is deliberately not handled: nobody acted, so nobody owns the decision,
// and tidying on a disconnect would wipe the room's game without anyone having asked.
let pending_seat_id = null

export function onSeatAdded(seat) {
    pending_seat_id = seat?.seatId ?? null
    settleNewSeat()
}

function settleNewSeat() {
    if (!pending_seat_id) return
    const seat = seats.get().find(s => s.seatId === pending_seat_id)
    if (!seat) return                       // still in flight; the listener below will call back

    pending_seat_id = null
    if (seatLayoutStale()) resetTable()
    else spawnSeatDefaults(seat)
}

const seat_ids = derived([seats], ([list]) => list.map(s => s.seatId).join(','))

// The table's own layout — the shared board and anything else everyone plays on, from
// `deal.game`. Placed in the shared frame (stage.js sharedBox), which needs no seat and no
// turning: it belongs to the table rather than to anybody at it.
//
// Never rotated to face a seat, for the same reason. A shared board read upside-down from one
// end is what a board on a real table does; turning it toward somebody would only pick a winner.
//
// Dealt exactly once, and that falls out of where it is called from rather than needing a rule
// of its own: spawnOpeningDefaults runs only while disconnected (online, the room's canvas is
// the authority and its boards arrive in the snapshot), and resetTable is already the one client
// that deals for the whole room. A player joining a table gets what is already on it.
function spawnGameDefaults() {
    for (const { item, place, options } of gameSpawns(gameConfig.get())) {
        const { x, y } = sharedPoint(placementCentre(place, item.size))
        adderFor(item)(item, x, y, { rotation: 0, ...options })
    }
}

// The half of a reset that every client has to run for itself, wherever the reset came from.
//
// These are the things one client cannot do on another's behalf. A seat and a hand are writable
// only by the client sitting in them (the relay enforces it), and the rest are not room state
// at all — which deal counts as an opening one, which panel is up, and what this player has
// hidden or locked. A peer handed only the node wipe would be left with cards in hand from a
// game that no longer exists and a chip parked wherever they last dragged it.
//
// Hands go with the table. A hand is dealt off the table it is being reset out of, so leaving
// one full is leaving half the session behind, and the cards in it refer to decks that have
// just been destroyed.
function resetOwnTable() {
    resetSeatLayout()
    resetSeatHands()
    // Nothing is on the table again, so the next deck each seat deals is an opening deal.
    clearSeatsPlaced()

    // Hidden mats would answer the wipe with what still looks like an empty table, so this runs
    // for a peer as much as for the player who pressed the button — the mats are being re-dealt
    // onto their canvas too.
    resetScenery()

    // And say so. A cleared table wants the same pointer a fresh one does, so a UI will usually
    // bring its deck list back up — ptcg's does, in its simulator view (index.vue).
    emitTableEvent('reset')
}

// A reset arriving from another player: our own half of it, and nothing else. The canvas is not
// touched here — the client that reset broadcast the wipe and the re-deal as ordinary node
// traffic, and running either again would be one client trying to clear a table twice and deal
// the room a second set of mats.
//
// Started by createTable rather than as this module loads (see table.js), together with the listener
// that settles a new seat once it lands. Returns the stop.
export function startSeatSetup() {
    setTableResetHandler(resetOwnTable)
    const stop = seat_ids.listen(() => settleNewSeat())
    return () => {
        stop()
        setTableResetHandler(null)
    }
}

// Clear the table and set it out again: everything on it destroyed, every seat put back on its
// slot and facing the right way, and each seat dealt the game's kit afresh. What you reach for
// when a session has wandered — decks everywhere, mats dragged off, chips scattered — rather
// than reloading and losing the room.
//
// Online it resets the room, not just this screen. Two things carry it: the node traffic below,
// which every client applies as it always has, and one table:reset instruction telling each of
// them to run resetOwnTable for the seat and hand nobody else may write. Anyone at the table may
// do this, the same rule the wipe itself follows.
export function resetTable() {
    // First, so a peer is tidying its own chair while the wipe and the re-deal are still on the
    // wire. Ours is run directly — the relay does not echo the instruction back to its sender.
    broadcastTableReset()

    clearTableNodes()
    resetOwnTable()

    // Every seat, not just our own: the kit is ordinary canvas nodes, which are anybody's to
    // create, and the wipe took the whole table's away. One client deals for the room and the
    // creates reach everyone — which is why this is the one part of a reset peers do NOT repeat.
    //
    // After resetOwnTable, so every seat is already back on its slot: each seat's kit is placed
    // against that seat's own box, and dealing first would lay a mat where a chip used to be.
    spawnGameDefaults()
    for (const seat of seats.get()) spawnSeatDefaults(seat)
}

// Bumped on every open and on teardown, so a table left behind while its config was still in
// flight can tell that it is no longer the one on screen. Without it, opening one game's table
// and switching to another before the first config lands deals the second table two sets.
let opening_token = 0

export async function spawnOpeningDefaults() {
    const token = ++opening_token

    // The room's table is the authority when online — its boards come down in the snapshot.
    // Entering the route is always offline (nothing auto-connects, see multiplayer.vue), so
    // this only guards a re-entry while a connection is somehow still up.
    if (connectionStatus.get() !== 'disconnected') return

    // The canvas the hand was drawn off is gone — offline it does not survive the route, let
    // alone a reload — so the hand goes with it. It only persisted in the first place because
    // hands live on the seat and seats are localStorage-backed (see seats.js); nobody chose to
    // keep a fan of cards alive across a reload, it rode along with the names and sleeves that
    // should. What players actually got was seven cards floating over an empty table, drawn
    // from a deck that no longer exists, to be binned by hand before they could start.
    //
    // Before the config await, not after it: waiting would show the stale fan for as long as
    // the manifest takes to land. Offline only, per the guard above — online the hand is the
    // relay's (the room's seats carry it), a rejoin brings it back, and it is the one case
    // where the cards outlive the page for a reason.
    resetSeatHands()

    // Config lands a moment after the route does, so wait for it rather than laying out an
    // empty accessory list. It is nulled on a game change, so this can never resolve against
    // the outgoing game's accessories.
    await when(gameConfig)
    if (token !== opening_token) return

    // A freshly built canvas is an empty table, whatever a previous one held.
    clearSeatsPlaced()
    spawnGameDefaults()
    for (const seat of seats.get()) spawnSeatDefaults(seat)
}

export function cancelOpeningDefaults() {
    opening_token++
}
