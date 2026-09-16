// Seats — the table positions players sit in.
//
// The distinction this module exists to draw:
//
//   client  — a browser. Identity is `ownClientId` in multiplayer.js: persistent per
//             profile, invisible in the UI, used only to arbitrate who controls what.
//   seat    — a position at the table: a name, a sleeve colour, and a hand. Seats outlive
//             the client sitting in them. An unclaimed seat is a goldfish: a hand that
//             plays itself until somebody picks it up.
//
// Before this, the two were the same thing — `players` was derived straight from the live
// sockets, so a seat could not exist without someone in it and a hand could not survive its
// owner closing the tab. Splitting them is what makes "Add Goldfish", seat swapping, and
// hand takeover expressible at all.
//
// Two stores, never merged:
//
//   localSeats — offline truth, localStorage-backed. Goldfishing alone works exactly as it
//                does online; the wire is the only thing that changes.
//   roomSeats  — online truth, replaced wholesale by each snapshot. On disconnect the room
//                seats are adopted into local storage (see adoptRoomSeats) so leaving a
//                table leaves you holding the game you were just playing, matching how the
//                canvas already survives a disconnect.
//
// Hands live on the seat, which is the whole point: claiming a seat hands you its cards.
// Online that means hand contents now reach the relay — see the privacy note in
// multiplayer.js. Peers still only ever receive a count.

import { batch, derived, persist, store } from './state/store.js'
import { CHIP_BOX, anchorY, laneX, seatBox } from './stage.js'
import { theme } from './theme.js'

// The sleeve colours new seats take are the theme's `seats` palette (theme.js), handed out in order.
// Read when a seat is made rather than held, so a theme given after this module loads is the one used.
const seatSleeves = () => theme().seats

export const SEATS_MAX = 8

// === Table geometry ===
//
// Every measurement below is derived from one assumption: a play area is a 960 x 560 playmat.
// A convention rather than a lookup — seats are minted before a game's config has landed (see
// migrate below), so the layout cannot wait on it, and a game that ships a different mat still
// works; its seats are simply spaced for the standard one.
// The geometry all of this is measured in now lives in stage.js, which states the stage once and
// derives the rest. What used to be four constants here — the mat, the two gaps and the lane —
// were the stage in disguise, written as spacing rules because there was nothing to hang them
// on; they moved rather than being duplicated, and this file reads them through accessors
// because the shared region that shapes them arrives with the game's config.
//
// CHIP_BOX is re-exported rather than re-stated: canvas-pixi/chip.js imports it from here, and
// the number the layout is measured against has to be the number on screen.
export { CHIP_BOX }

// Where a seat's chip sits on the table before anyone drags it, in world units. The bartop's
// seam is y = 0 and the mirror reflects through the origin, so the two ends are ±anchorY().
// Seats sharing an end step outward from the middle by one playmat plus its gutter, so two
// players at the same end get their own mat's worth of table rather than overlapping mats.
//
// Deliberately not derived from `mirror`: the chip is a thing on the table that a player can
// pick up and put down, so its position is stored, and this only decides where it starts.
//
// The chip sits a whole playmat back from the seam because it marks where the player IS, not
// what they are looking at — the mat goes between the two.

// Which way a seat faces: toward the seam at y = 0. Taken from the side of the table the seat
// is on rather than from `mirror`, so the two ends never grow into each other — a playmat
// always lies between its player and their opponent, whichever way round that player has
// chosen to look at it.
function seatForward(anchor) {
    return anchor.y >= 0 ? -1 : 1
}

// A point in the seat's play area, turned into a world position.
//
// The frame is the seat box (stage.js): (0, 0) is its TOP-LEFT corner, +x right, +y down, in the
// seat's own orientation. So the numbers are the ones an author measures off the playmat art in
// an image editor, written once for both ends of the table — the far seat is turned 180°, and
// that inversion happens here rather than in every config.
//
// The point this resolves is a CENTRE, because every canvas node it places is centre-origin (see
// the offset in addBoard / addMarker / addDice). Config coordinates are corners, not centres —
// seat-setup.js's placementCentre translates one to the other before calling in, on the box's
// own axes, so that the far seat's half turn cannot flip the offset.
//
// === One vocabulary, not two ===
//
// This replaces both seatMatPoint and seatPlace, which did the same job in two different
// languages. Deck zones were already points in this frame. The accessory kit was placed with
// popover semantics instead — side / align / sideOffset / alignOffset, the vocabulary a tooltip
// uses to sit BESIDE a button, measured against the seat's chip.
//
// That was the wrong shape for laying out an area. A tooltip is placed relative to the thing it
// belongs to; a board is placed AT A SPOT on a mat. Popover semantics made the simplest possible
// intent — "the deck goes here" — into four fields whose meaning depended on the chip's size, so
// changing the chip moved every accessory on the table. A point does not have that problem, it
// is what the author was measuring anyway, and it makes `deal` and `seat` the same kind of thing.
//
// `turn` comes back with the point because a caller aligning a box to it needs to know which way
// round the seat is: the far seat's top-left is the world's bottom-right.
export function seatPoint(seat, point) {
    const anchor = anchorFrom(seat?.anchor, { x: 0, y: anchorY() })
    const turn = seatForward(anchor) > 0 ? -1 : 1
    const box = seatBox()

    // Box corner → the anchor-relative frame the seat is turned in.
    const localX = box.x + (Number(point?.x) || 0)
    const localY = box.y + (Number(point?.y) || 0)

    return { x: anchor.x + turn * localX, y: anchor.y + turn * localY, turn }
}

// The world rotation something laid out for this seat should carry, so that it faces the
// seat rather than the table's default orientation — 180° for the far end, 0 for the near.
//
// It matters because boards deliberately do NOT counter-rotate under the mirror (see
// stage.js: a playmat seen from across the table is supposed to be upside-down). Without
// this, a player at the far end who flipped their view — which is exactly what the flip is
// for — would be reading their own playmat upside down. With it, each mat reads upright for
// its owner and inverted for their opponent, which is what a mat on a real table does.
export function seatFacing(seat) {
    const anchor = anchorFrom(seat?.anchor, { x: 0, y: anchorY() })
    return seatForward(anchor) > 0 ? 180 : 0
}

// Where the Nth seat of a table of `total` sits: alternating sides, filling lanes outward from
// the middle of each side.
//
// Depends on the TOTAL, which the per-pair version did not, and that dependence is the whole
// change. Lane centres are symmetric about the origin, so one player on a side sits in the
// middle of it and two straddle it — which means every seat on a side shifts when another joins
// it. The table re-centres rather than the newcomer being parked off to one end, and re-centring
// is exactly what makes four players read as one table instead of two.
//
// Slot 0 is near, 1 is far, 2 is near again: pairs still form across the seam, so the first two
// players face each other down the middle before anybody takes a second lane.
function anchorForSlot(slot, total) {
    const near = slot % 2 === 0
    const onSide = near ? Math.ceil(total / 2) : Math.floor(total / 2)
    return {
        x: laneX(Math.floor(slot / 2), onSide),
        y: near ? anchorY() : -anchorY(),
    }
}

// Whether anybody is off the chair the layout would give them.
//
// Asked when a seat is added, because adding one re-centres its side and therefore moves people
// who were already sitting there. Nothing on the table follows an anchor — spawnSeatDefaults
// hands the adders absolute world coordinates once and never revisits them — so a seat cannot be
// moved without laying the table out again. That is why this returns a plain "is it stale" and
// leaves the answer to seat-setup.js, which owns the reset that can actually act on it.
export function seatLayoutStale() {
    const list = seats.get()
    const total = list.length
    return list.some((seat, index) => {
        const want = anchorForSlot(index, total)
        const have = anchorFrom(seat?.anchor, null)
        return !have || have.x !== want.x || have.y !== want.y
    })
}

// Where a new arrival starts: the next slot, measured against the table it is joining.
//
// This used to hunt for the lowest UNOCCUPIED slot, because the count alone put chips on top of
// each other — three seats hold slots 0, 1 and 2, so losing the middle one left a count of two
// and handed the next arrival the chair the third player was still in.
//
// That cannot happen now. A seat's place is its index in the seat list, and adding one re-slots
// the whole table by that index (see seatLayoutStale), so there are no gaps to fall into and no
// vacated chair to reuse — the list closes up on its own.
function nextAnchor(existing) {
    return anchorForSlot(existing.length, existing.length + 1)
}

// Anchors come off the wire and out of localStorage, so a malformed one has to fall back
// rather than put a chip at NaN — Konva renders that as a node with no position, which the
// player can then never grab to put right.
function anchorFrom(value, fallback) {
    const x = Number(value?.x)
    const y = Number(value?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback
    return { x, y }
}

function newId(prefix = 's') {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? `${prefix}-${crypto.randomUUID()}`
        : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Pick a sleeve no seat is already wearing. Falls back to the rotation position once every colour
// in the palette is taken.
function nextSleeve(existing) {
    const used = new Set(existing.map(s => s.sleeve))
    const sleeves = seatSleeves()
    return sleeves.find(c => !used.has(c)) ?? sleeves[existing.length % sleeves.length]
}

function makeSeat({ name, sleeve, anchor, mirror, existing = [] } = {}) {
    // Where this seat's chip sits, and so where a player taking the seat has their view
    // centred. A property of the seat for the same reason `mirror` is — the chip is part of
    // the chair, not of whoever is currently in it.
    const seatAnchor = anchorFrom(anchor, nextAnchor(existing))

    return {
        seatId: newId(),
        name: name ?? 'New Seat',
        sleeve: sleeve ?? nextSleeve(existing),
        anchor: seatAnchor,
        // Which end of the bartop this seat looks from. A property of the seat rather than of
        // the client, so a goldfish set facing the far end keeps facing that way for whoever
        // sits down in it next.
        //
        // Far-end seats open flipped, because that IS the end they are looking from: every
        // second seat at the table would otherwise start reading its own half upside down and
        // have to go find the Flip View button. Taken from the anchor rather than from a seat
        // number so it stays right whichever slot the seat ended up in.
        mirror: typeof mirror === 'boolean' ? mirror : seatForward(seatAnchor) > 0,
        hand: [],
    }
}

// === Stores ===

// Bumped when the stage geometry moves, because a seat's ANCHOR is persisted.
//
// The anchor is a world position — it has to be, since a player can pick their chip up and put
// it down somewhere else — so a seat stored under the old table came back sitting at y = 622 on
// a table whose seats now belong at 510. Nothing errors; the mat is simply in the wrong place,
// and the camera focuses on where the mat used to be. Changing the key is the honest fix: those
// coordinates do not mean anything any more, and there is nothing to migrate them to that is
// better than the slot they would be given fresh.
//
// Only the local seats carry this. A room's seats come off the wire from peers who are running
// the same build, and are re-slotted by resetSeatsToSlots when they do not.
const localSeats  = persist(store([]), 'cardcarp:seats:s2')
const localSeatId = persist(store(''), 'cardcarp:seat:s2')

const roomSeats  = store([])
const roomSeatId = store('')

// seatId → clientId currently driving it, or absent/null when the seat is free. Derived
// server-side from live connections rather than persisted, so a closed tab frees its seat
// immediately instead of locking it for the rest of the session.
const controllers = store({})

// Flipped by multiplayer.js as the socket opens and closes. Kept as a plain flag rather
// than importing connectionStatus so this module stays free of a circular import
// (multiplayer.js imports us).
const online = store(false)

// === Migration ===
// Pre-seat installs kept the identity at `cardcarp:playerName` / `cardcarp:playerSleeve`.
// Fold it into a first seat so an old install keeps the name and colour it was playing under.
//
// The legacy hand at `cardcarp:hand` is deliberately NOT carried over. It used to be, to avoid
// stranding cards the player could still see in their fan — but a hand no longer outlives the
// table it was drawn from (see seat-setup.js), and one restored out of a pre-seat install would
// be the oldest stale hand there is.
function migrate() {
    if (localSeats.get().length > 0) return

    let name = 'Player'
    let sleeve = seatSleeves()[0]
    try {
        name   = JSON.parse(localStorage.getItem('cardcarp:playerName') ?? '""') || name
        sleeve = JSON.parse(localStorage.getItem('cardcarp:playerSleeve') ?? '""') || sleeve
    } catch { /* unreadable legacy values — start clean rather than refuse to boot */ }

    const seat = makeSeat({ name, sleeve })
    batch(() => {
        localSeats.set([seat])
        localSeatId.set(seat.seatId)
    })
}

// A seat can go missing under us — another client removed it, or a snapshot arrived
// without it. Falling back to the first seat keeps the player holding *something*; the
// alternative is a seatless client whose draws vanish.
function ensureLocalSeat() {
    batch(() => {
        if (localSeats.get().length === 0) {
            const seat = makeSeat({ name: 'Player', sleeve: seatSleeves()[0] })
            localSeats.set([seat])
        }
        if (!localSeats.get().some(s => s.seatId === localSeatId.get())) {
            localSeatId.set(localSeats.get()[0].seatId)
        }
        // Seats stored before chips existed carry no anchor. Hand them one in list order rather
        // than a shared default, which would stack every chip on the same point.
        if (localSeats.get().some(seat => anchorFrom(seat.anchor, null) === null)) {
            localSeats.update(list => list.map((seat, i) => (
                anchorFrom(seat.anchor, null) === null ? { ...seat, anchor: anchorForSlot(i, list.length) } : seat
            )))
        }
    })
}

// === Reads ===

export const seats    = derived([online, roomSeats, localSeats], ([on, room, local]) => (on ? room : local))
export const mySeatId = derived([online, roomSeatId, localSeatId], ([on, room, local]) => (on ? room : local))
export const mySeat   = derived([seats, mySeatId], ([list, id]) => list.find(s => s.seatId === id) ?? null)

export function seatControllerId(seatId) {
    // Offline there is exactly one client — us — and it drives whichever seat we picked.
    if (!online.get()) return seatId === localSeatId.get() ? 'local' : null
    return controllers.get()[seatId] ?? null
}

// A seat is takeable when nobody is in it. Our own seat reads as not-claimable because
// clicking it is a no-op, not because it is contested.
export function isSeatFree(seatId) {
    return seatControllerId(seatId) == null
}

export const seatCount = derived([seats], ([list]) => list.length)
export const canAddSeat = derived([seats], ([list]) => list.length < SEATS_MAX)

// The roster as a seat list shows it: every seat, plus what this client may do with each one.
// One derived value rather than a function a view calls per row, because the view has to redraw
// when any of these inputs change — and who is driving a seat changes without the seat list
// changing at all.
export const seatRoster = derived(
    [seats, mySeatId, controllers, online, localSeatId],
    ([list, me]) => list.map(seat => ({
        ...seat,
        mine: seat.seatId === me,
        free: isSeatFree(seat.seatId),
        removable: canRemoveSeat(seat.seatId),
    })),
)

// === Own identity, expressed through the seat ===
// Read-only views of the seat this client is sitting in. They follow the seat, so taking over a
// goldfish repaints everything reading them. Writes go through updateSeat, which knows which list
// the seat lives in and whether the room has to hear about it.
export const ownSeatName   = derived([mySeat], ([seat]) => seat?.name ?? 'Player')
export const ownSeatSleeve = derived([mySeat], ([seat]) => seat?.sleeve ?? seatSleeves()[0])

// The seat's viewing orientation. Read by index.vue to drive the canvas whenever the active
// seat changes; written by the mirror button, through setOwnSeatMirror.
export const ownSeatMirror = derived([mySeat], ([seat]) => seat?.mirror ?? false)

export function setOwnSeatMirror(value) {
    updateSeat(mySeatId.get(), { mirror: !!value })
}

// Where our chip sits. Written by dragging the chip on the table (canvas-pixi/chip.js).
export const ownSeatAnchor = derived([mySeat], ([seat]) => seat?.anchor ?? { x: 0, y: anchorY() })

// One shared empty hand for a seatless client, so two reads agree and nothing downstream sees a
// change that isn't one.
const NO_HAND = Object.freeze([])

export const hand = derived([mySeat], ([seat]) => seat?.hand ?? NO_HAND)

// Every change to the hand this client is holding — drawing, playing, the H flip — goes through
// here. It replaces the seat rather than editing its array, which is what lets the listener
// further down notice and send it.
export function updateHand(change) {
    const seat = mySeat.get()
    if (!seat) return
    const next = change(seat.hand)
    if (next === seat.hand) return
    replaceSeat(seatList(), seat.seatId, s => ({ ...s, hand: next }))
}

export function addToHand(entry) {
    updateHand(list => [...list, entry])
}

export function removeFromHand(handEntryId) {
    updateHand(list => (list.some(e => e.handEntryId === handEntryId)
        ? list.filter(e => e.handEntryId !== handEntryId)
        : list))
}

// Flips one hand card's `faceDown` staging flag — how the card is meant to be played, not
// anything the table shows yet. dropFromHand carries the flag onto the canvas card when it lands.
//
// Named by entry id rather than by "the focused one" because there are two ways in: the H key,
// which aims at whatever the pointer is over (store.js handFlipFocused), and a double tap on the
// card itself, which names the card it landed on. A touchscreen has no hover to set a focus,
// which is the whole reason the second way exists.
export function flipHandEntry(handEntryId) {
    updateHand(list => (list.some(e => e.handEntryId === handEntryId)
        ? list.map(e => (e.handEntryId === handEntryId ? { ...e, faceDown: !e.faceDown } : e))
        : list))
}

// === Transport ===
// multiplayer.js injects its sendAction here at init. Inverted rather than imported so the
// dependency runs one way only: multiplayer.js knows about seats, seats knows about a
// function it was handed.
let _send = null
export function setSeatTransport(send) { _send = send }

// What a newly created seat gets dealt — the game's default accessories, laid out in front of
// its chip. Injected by the table view (seat-setup.js) rather than imported, for the same
// reason as the transport above: the dependency runs one way, and this module stays a store
// that knows nothing about the canvas.
//
// Deliberately fired from addSeat and nowhere else, so it runs exactly once per seat, on the
// client that created it. A peer's seat:create arriving through applySeatEvent must NOT
// trigger it: the accessories ride the wire as ordinary nodes, so spawning locally as well
// would deal one playmat per player.
let _onSeatCreated = null
export function setSeatCreatedHook(fn) { _onSeatCreated = fn }
export function setSeatsOnline(value) { online.set(!!value) }

function send(op, extras) {
    if (online.get() && _send) _send(op, extras)
}

// The list a seat lives in right now: the room's while online, this browser's otherwise.
function seatList() {
    return online.get() ? roomSeats : localSeats
}

// Swap one seat for a changed copy. Every other seat keeps its identity, which is how a listener
// can tell whose chip to redraw without comparing fields.
function replaceSeat(list, seatId, change) {
    list.update(current => current.map(seat => (seat.seatId === seatId ? change(seat) : seat)))
}

// The fields a seat:update may carry, applied to a copy. Shared by our own edits and the room's
// echo of everybody else's, so the two cannot accept different things.
function patchSeat(seat, props) {
    const next = { ...seat }
    if (typeof props.name === 'string') next.name = props.name
    if (typeof props.sleeve === 'string') next.sleeve = props.sleeve
    if (typeof props.mirror === 'boolean') next.mirror = props.mirror
    if (props.anchor) next.anchor = anchorFrom(props.anchor, seat.anchor)
    return next
}

// === Writes ===
// Every mutation takes the same shape: offline it lands in localSeats immediately; online
// it is a request the relay arbitrates and echoes back through applySeatEvent. Seat ids are
// minted client-side (like node ids) so seeding an existing solo game into a fresh room is
// the same code path as creating a seat from the button.

export function addSeat({ name, sleeve } = {}) {
    if (!canAddSeat.get()) return null
    const seat = makeSeat({ name, sleeve, existing: seats.get() })
    if (online.get()) {
        send('seat:create', { seat })
    } else {
        localSeats.update(list => [...list, seat])
    }
    // The seat itself rather than its id: online it is still in flight, so it is not in
    // `seats` yet and its anchor could not be looked up.
    _onSeatCreated?.(seat)
    return seat.seatId
}

// Sitting down. Online this is a request — the relay decides, because two clients can reach
// for the same empty seat in the same tick, and it answers with seat:control plus (to us
// alone) the seat's hand. Offline it is immediate: the hand is already in the seat.
export function claimSeat(seatId) {
    if (seatId === mySeatId.get()) return
    if (!isSeatFree(seatId)) return
    if (!seats.get().some(s => s.seatId === seatId)) return

    if (online.get()) {
        // Flush before letting go. The hand sync below is debounced, so the cards drawn in
        // the last fraction of a second are still only local — and once the claim lands the
        // seat is somebody else's to push for.
        pushHand()
        send('seat:claim', { seatId })
    } else {
        localSeatId.set(seatId)
    }
}

export function updateSeat(seatId, props) {
    if (!seats.get().some(s => s.seatId === seatId)) return
    replaceSeat(seatList(), seatId, seat => patchSeat(seat, props))
    send('seat:update', { seatId, ...props })
}

// Put every seat back on its own slot, in creation order, with the orientation that slot
// implies. The seat half of a table reset: chips get dragged around over a session and there is
// otherwise no way back to a tidy table.
//
// Applied to EVERY seat, transmitted only for the ones this client may write. Online the relay
// accepts seat:update for the seat you are sitting in and no other, so the rest are set here
// and left unsent.
//
// That local write used to be refused, on the grounds that touching a seat we cannot send would
// put this client quietly out of step with the room. It no longer can, because a reset now
// travels as an instruction of its own (table:reset — see seat-setup.js): every client runs
// this for itself, each seat's own player transmits the authoritative copy, and the slot is a
// pure function of position in the seat list, so what everyone computes locally is the value
// that comes back to confirm it.
//
// And the local write is what keeps the re-deal honest. One client lays out every seat's kit
// after the wipe, measuring each from that seat's anchor. If a peer's chip only moved when
// their own reset came back, their mat would already have been dealt against the chip they had
// dragged away — which is the exact mess a reset is reached for.
//
// The one seat nobody transmits is a goldfish in an online room: every client tidies it to the
// same place, but the relay's stored copy keeps the old anchor, so a player who joins later
// sees it where it used to be until somebody sits in it.
export function resetSeatLayout() {
    const writable = online.get()
        ? new Set([mySeatId.get()])
        : new Set(seats.get().map(s => s.seatId))

    // Slotted by position in the FULL list, not the writable subset, so the seat you reset
    // online lands exactly where it would have offline.
    const list = seats.get()
    const total = list.length
    batch(() => list.forEach((seat, index) => {
        const anchor = anchorForSlot(index, total)
        const mirror = seatForward(anchor) > 0

        if (writable.has(seat.seatId)) {
            updateSeat(seat.seatId, { anchor, mirror })
            return
        }

        replaceSeat(seatList(), seat.seatId, s => ({ ...s, anchor, mirror }))
    }))
}

// Empty the hands a table reset is allowed to empty — the hand half of resetSeatLayout, and
// writable by exactly the same rule. Offline every seat is ours. Online the relay accepts
// seat:hand only for the seat we are sitting in, so a peer's hand cleared locally would show
// us a table the room does not have, and their next push would put the cards back anyway.
//
// Hands are on the table's side of the line here rather than the player's: a reset is what you
// reach for when the session has wandered, and a fistful of cards from a game that no longer
// exists is part of the wandering. Sitting down in a seat still inherits whatever its owner
// left in it — this clears hands, it does not change who they belong to.
export function resetSeatHands() {
    const writable = online.get()
        ? new Set([mySeatId.get()])
        : new Set(seats.get().map(s => s.seatId))

    seatList().update(list => (list.some(seat => writable.has(seat.seatId) && seat.hand?.length)
        ? list.map(seat => (writable.has(seat.seatId) ? { ...seat, hand: [] } : seat))
        : list))

    // The debounced listener would get here on its own, 400ms later. A reset should reach the
    // room alongside the node wipe rather than trailing behind it.
    pushHand()
}

// Removing a seat destroys its hand with it, so a seat somebody else is holding is never
// ours to bin. Our own is fair game — we just have to sit somewhere first, which means
// there has to be a free seat to move into. The last seat always stays: a table with no
// seats has nowhere to draw to.
export function canRemoveSeat(seatId) {
    if (seats.get().length <= 1) return false
    if (seatId === mySeatId.get()) {
        return seats.get().some(s => s.seatId !== seatId && isSeatFree(s.seatId))
    }
    return isSeatFree(seatId)
}

export function removeSeat(seatId) {
    if (!canRemoveSeat(seatId)) return

    // Stand up before binning the chair. Online this is also what makes the destroy legal:
    // claiming elsewhere frees this seat, and the relay only destroys a free one.
    if (seatId === mySeatId.get()) {
        const fallback = seats.get().find(s => s.seatId !== seatId && isSeatFree(s.seatId))
        claimSeat(fallback.seatId)
    }

    if (online.get()) {
        send('seat:destroy', { seatId })
    } else {
        batch(() => {
            localSeats.update(list => list.filter(s => s.seatId !== seatId))
            ensureLocalSeat()
        })
    }
}

// Push our seat's hand to the relay. This is the message that makes takeover possible and
// the one that changed the privacy model: contents, not a count. The server keeps it
// against the seat and forwards it to exactly one place — whoever claims that seat next.
// A cheap identity for "which cards, staged which way, in which seat". Compared before
// every push so an inbound hand — a snapshot, or the handoff that comes with claiming a
// seat — doesn't wake the listener below and bounce straight back at the relay. Debouncing
// can't prevent that on its own: by the time the debounced callback runs, any "we're
// applying a remote message" flag has long since been cleared.
//
// faceDown is in the signature because the P-flip staging changes no ids but is a real
// change to what the seat is holding.
function handSig(seat) {
    if (!seat) return ''
    return `${seat.seatId}:${seat.hand.map(e => `${e.handEntryId}${e.faceDown ? '1' : '0'}`).join(',')}`
}

let _syncedSig = ''

export function pushHand() {
    if (!online.get()) return
    const seat = mySeat.get()
    if (!seat) return
    const sig = handSig(seat)
    if (sig === _syncedSig) return
    _syncedSig = sig
    send('seat:hand', { seatId: seat.seatId, hand: seat.hand })
}

// Every hand change funnels through updateHand — draw-to-hand, send-to-hand, dropping a card
// on the table, the H flip — and each one is a new hand, so one listener is the single place
// the hand reaches the relay. Debounced because drawing seven cards is seven new hands, each
// one card longer, and the last one is the only one that matters.
//
// Cost note: unlike the old hand:count integer this carries card records, so it is bounded
// server-side (see room.js LIMITS.handEntries / handBytes) and kept off the drag path.
// Started by createTable rather than as this module loads (see table.js), together with migrate
// above, so importing the seat model does nothing until a page asks for a table. Returns the stop.
export function startSeats() {
    migrate()
    return hand.listen(debounce(pushHand, 400))
}

function debounce(fn, ms) {
    let timer = null
    return () => {
        clearTimeout(timer)
        timer = setTimeout(fn, ms)
    }
}

// Drop every hand on the table — the game changed, and a hand of another game's cards
// resolves its art against a manifest with no such ids (see store.js).
export function clearAllHands() {
    const emptied = list => list.map(seat => (seat.hand?.length ? { ...seat, hand: [] } : seat))
    batch(() => {
        localSeats.update(emptied)
        roomSeats.update(emptied)
    })
    pushHand()
}

// === Inbound (online) ===

// Normalises a seat off the wire. Every seat arrives carrying its cards — the relay
// replicates hands in full, so a client always holds the whole table and can both take over
// any seat and walk away from the room with the game intact. Only our own hand is ever
// *rendered*; the rest sit in the store until somebody sits down in them.
function seatFromWire(wire, index, total) {
    return {
        seatId: wire.seatId,
        name: wire.name ?? 'New Seat',
        sleeve: wire.sleeve ?? seatSleeves()[0],
        mirror: wire.mirror === true,
        // `index` and `total` only matter for a room whose seats predate anchors: they spread
        // their chips the way a fresh table would rather than piling them on one point. Both are
        // needed, because a lane is placed by how many seats share its side of the table.
        anchor: anchorFrom(wire.anchor, anchorForSlot(index, total)),
        hand: Array.isArray(wire.hand) ? wire.hand : [],
    }
}

export function applySeatSnapshot({ seats: wireSeats, yourSeatId, controllers: ctl }) {
    batch(() => {
        roomSeatId.set(yourSeatId ?? '')
        roomSeats.set(Object.values(wireSeats ?? {})
            .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
            .map((wire, i, list) => seatFromWire(wire, i, list.length)))
        controllers.set({ ...(ctl ?? {}) })
        // The snapshot is the authority on what we're holding, so don't bounce it back.
        _syncedSig = handSig(mySeat.get())
    })
}

// One event can write two stores (seat:control sets the controllers and our seat id), so the
// whole of it is announced as one change.
export function applySeatEvent(event) {
    batch(() => applySeatEventNow(event))
}

function applySeatEventNow(event) {
    switch (event.op) {
        case 'seat:create': {
            if (!event.seat?.seatId) return
            if (roomSeats.get().some(s => s.seatId === event.seat.seatId)) return
            roomSeats.update(list => [...list, seatFromWire(event.seat, list.length, list.length + 1)])
            break
        }

        case 'seat:destroy': {
            roomSeats.update(list => list.filter(s => s.seatId !== event.seatId))
            if (roomSeatId.get() === event.seatId) roomSeatId.set('')
            break
        }

        case 'seat:update': {
            if (!roomSeats.get().some(s => s.seatId === event.seatId)) return
            replaceSeat(roomSeats, event.seatId, seat => patchSeat(seat, event))
            break
        }

        // Who is driving which seat. Also the moment we learn we've sat down (or been
        // stood up, when our socket's grip on a seat is transferred elsewhere).
        case 'seat:control': {
            const next = { ...controllers.get() }
            if (event.clientId) next[event.seatId] = event.clientId
            else delete next[event.seatId]
            controllers.set(next)

            if (event.clientId === event.yourClientId) {
                roomSeatId.set(event.seatId)
                // Sitting down swaps which hand is "ours" without changing any cards, so
                // mark the new one synced — otherwise the listener would push a hand the
                // relay just told us about straight back at it.
                _syncedSig = handSig(mySeat.get())
            } else if (roomSeatId.get() === event.seatId) {
                // We stood up. The cards stay in the store — they belong to the seat, and
                // we still hold every seat's hand — we simply stop rendering this one.
                roomSeatId.set('')
            }
            break
        }

        // Any seat's cards. Applied wherever they land, not just to our own seat: holding
        // the full table is what lets us take over a seat instantly and keep the game when
        // we go offline.
        case 'seat:hand': {
            if (!roomSeats.get().some(s => s.seatId === event.seatId)) return
            const incoming = Array.isArray(event.hand) ? event.hand : []
            replaceSeat(roomSeats, event.seatId, seat => ({ ...seat, hand: incoming }))
            // These cards came *from* the relay, so pushing them back is a round trip that
            // changes nothing. Only meaningful when the seat is ours.
            if (event.seatId === roomSeatId.get()) {
                _syncedSig = handSig(roomSeats.get().find(s => s.seatId === event.seatId))
            }
            break
        }
    }
}

// Seed a fresh room with the seats we already have. Mirrors the canvas seeding in
// multiplayer.js: when we're the only one here and we arrived with a game in progress, our
// table is the room's table — seats and hands included.
export function seatsToSeed() {
    return localSeats.get().map(s => ({
        seatId: s.seatId, name: s.name, sleeve: s.sleeve, mirror: s.mirror === true,
        anchor: s.anchor, hand: s.hand,
    }))
}

// Hands are room state, so a seat we don't control can change under us. Its cards are still
// in our store — they just aren't in our fan.
export function seatHandCount(seatId) {
    return seats.get().find(s => s.seatId === seatId)?.hand.length ?? 0
}

export function localSeatIdForSeeding() { return localSeatId.get() }

// Going offline. Keep playing the table that's on the canvas, so keep the seats around it —
// every one of them, cards and all, exactly as each player was holding them.
//
// That completeness is the point: the canvas already survives a disconnect, and a table
// where the boards and decks carried over but every hand emptied isn't a game you can pick
// up again. Whoever leaves the room leaves holding the whole thing, and can carry on solo,
// swapping between seats that still hold what their players had.
export function adoptRoomSeats() {
    if (roomSeats.get().length === 0) return
    const keepSeatId = roomSeatId.get()
    batch(() => {
        localSeats.set(roomSeats.get().map(s => ({
            seatId: s.seatId,
            name: s.name,
            sleeve: s.sleeve,
            mirror: s.mirror === true,
            anchor: { ...s.anchor },
            hand: s.hand.map(entry => ({ ...entry })),
        })))
        localSeatId.set(keepSeatId || localSeats.get()[0].seatId)
        roomSeats.set([])
        roomSeatId.set('')
        controllers.set({})
        ensureLocalSeat()
    })
}
