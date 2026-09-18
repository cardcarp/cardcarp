import { batch, derived, persist, store } from './state/store.js'
import { CHIP_BOX, anchorY, laneX, seatBox } from './stage.js'
import { theme } from './theme.js'

const seatSleeves = () => theme().seats

export const SEATS_MAX = 8

export { CHIP_BOX }

function seatForward(anchor) {
    return anchor.y >= 0 ? -1 : 1
}

export function seatPoint(seat, point) {
    const anchor = anchorFrom(seat?.anchor, { x: 0, y: anchorY() })
    const turn = seatForward(anchor) > 0 ? -1 : 1
    const box = seatBox()

    const localX = box.x + (Number(point?.x) || 0)
    const localY = box.y + (Number(point?.y) || 0)

    return { x: anchor.x + turn * localX, y: anchor.y + turn * localY, turn }
}

export function seatFacing(seat) {
    const anchor = anchorFrom(seat?.anchor, { x: 0, y: anchorY() })
    return seatForward(anchor) > 0 ? 180 : 0
}

function anchorForSlot(slot, total) {
    const near = slot % 2 === 0
    const onSide = near ? Math.ceil(total / 2) : Math.floor(total / 2)
    return {
        x: laneX(Math.floor(slot / 2), onSide),
        y: near ? anchorY() : -anchorY(),
    }
}

export function seatLayoutStale() {
    const list = seats.get()
    const total = list.length
    return list.some((seat, index) => {
        const want = anchorForSlot(index, total)
        const have = anchorFrom(seat?.anchor, null)
        return !have || have.x !== want.x || have.y !== want.y
    })
}

function nextAnchor(existing) {
    return anchorForSlot(existing.length, existing.length + 1)
}

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

function nextSleeve(existing) {
    const used = new Set(existing.map(s => s.sleeve))
    const sleeves = seatSleeves()
    return sleeves.find(c => !used.has(c)) ?? sleeves[existing.length % sleeves.length]
}

function makeSeat({ name, sleeve, anchor, mirror, existing = [] } = {}) {
    const seatAnchor = anchorFrom(anchor, nextAnchor(existing))

    return {
        seatId: newId(),
        name: name ?? 'New Seat',
        sleeve: sleeve ?? nextSleeve(existing),
        anchor: seatAnchor,
        mirror: typeof mirror === 'boolean' ? mirror : seatForward(seatAnchor) > 0,
        hand: [],
    }
}

const localSeats  = persist(store([]), 'cardcarp:seats:s2')
const localSeatId = persist(store(''), 'cardcarp:seat:s2')

const roomSeats  = store([])
const roomSeatId = store('')

const controllers = store({})

const online = store(false)

function migrate() {
    if (localSeats.get().length > 0) return

    let name = 'Player'
    let sleeve = seatSleeves()[0]
    try {
        name   = JSON.parse(localStorage.getItem('cardcarp:playerName') ?? '""') || name
        sleeve = JSON.parse(localStorage.getItem('cardcarp:playerSleeve') ?? '""') || sleeve
    } catch { }

    const seat = makeSeat({ name, sleeve })
    batch(() => {
        localSeats.set([seat])
        localSeatId.set(seat.seatId)
    })
}

function ensureLocalSeat() {
    batch(() => {
        if (localSeats.get().length === 0) {
            const seat = makeSeat({ name: 'Player', sleeve: seatSleeves()[0] })
            localSeats.set([seat])
        }
        if (!localSeats.get().some(s => s.seatId === localSeatId.get())) {
            localSeatId.set(localSeats.get()[0].seatId)
        }
        if (localSeats.get().some(seat => anchorFrom(seat.anchor, null) === null)) {
            localSeats.update(list => list.map((seat, i) => (
                anchorFrom(seat.anchor, null) === null ? { ...seat, anchor: anchorForSlot(i, list.length) } : seat
            )))
        }
    })
}

export const seats    = derived([online, roomSeats, localSeats], ([on, room, local]) => (on ? room : local))
export const mySeatId = derived([online, roomSeatId, localSeatId], ([on, room, local]) => (on ? room : local))
export const mySeat   = derived([seats, mySeatId], ([list, id]) => list.find(s => s.seatId === id) ?? null)

export function seatControllerId(seatId) {
    if (!online.get()) return seatId === localSeatId.get() ? 'local' : null
    return controllers.get()[seatId] ?? null
}

export function isSeatFree(seatId) {
    return seatControllerId(seatId) == null
}

export const seatCount = derived([seats], ([list]) => list.length)
export const canAddSeat = derived([seats], ([list]) => list.length < SEATS_MAX)

export const seatRoster = derived(
    [seats, mySeatId, controllers, online, localSeatId],
    ([list, me]) => list.map(seat => ({
        ...seat,
        mine: seat.seatId === me,
        free: isSeatFree(seat.seatId),
        removable: canRemoveSeat(seat.seatId),
    })),
)

export const ownSeatName   = derived([mySeat], ([seat]) => seat?.name ?? 'Player')
export const ownSeatSleeve = derived([mySeat], ([seat]) => seat?.sleeve ?? seatSleeves()[0])

export const ownSeatMirror = derived([mySeat], ([seat]) => seat?.mirror ?? false)

export function setOwnSeatMirror(value) {
    updateSeat(mySeatId.get(), { mirror: !!value })
}

export const ownSeatAnchor = derived([mySeat], ([seat]) => seat?.anchor ?? { x: 0, y: anchorY() })

const NO_HAND = Object.freeze([])

export const hand = derived([mySeat], ([seat]) => seat?.hand ?? NO_HAND)

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

export function flipHandEntry(handEntryId) {
    updateHand(list => (list.some(e => e.handEntryId === handEntryId)
        ? list.map(e => (e.handEntryId === handEntryId ? { ...e, faceDown: !e.faceDown } : e))
        : list))
}

let _send = null
export function setSeatTransport(send) { _send = send }

let _onSeatCreated = null
export function setSeatCreatedHook(fn) { _onSeatCreated = fn }
export function setSeatsOnline(value) { online.set(!!value) }

function send(op, extras) {
    if (online.get() && _send) _send(op, extras)
}

function seatList() {
    return online.get() ? roomSeats : localSeats
}

function replaceSeat(list, seatId, change) {
    list.update(current => current.map(seat => (seat.seatId === seatId ? change(seat) : seat)))
}

function patchSeat(seat, props) {
    const next = { ...seat }
    if (typeof props.name === 'string') next.name = props.name
    if (typeof props.sleeve === 'string') next.sleeve = props.sleeve
    if (typeof props.mirror === 'boolean') next.mirror = props.mirror
    if (props.anchor) next.anchor = anchorFrom(props.anchor, seat.anchor)
    return next
}

export function addSeat({ name, sleeve } = {}) {
    if (!canAddSeat.get()) return null
    const seat = makeSeat({ name, sleeve, existing: seats.get() })
    if (online.get()) {
        send('seat:create', { seat })
    } else {
        localSeats.update(list => [...list, seat])
    }
    _onSeatCreated?.(seat)
    return seat.seatId
}

export function claimSeat(seatId) {
    if (seatId === mySeatId.get()) return
    if (!isSeatFree(seatId)) return
    if (!seats.get().some(s => s.seatId === seatId)) return

    if (online.get()) {
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

export function resetSeatLayout() {
    const writable = online.get()
        ? new Set([mySeatId.get()])
        : new Set(seats.get().map(s => s.seatId))

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

export function resetSeatHands() {
    const writable = online.get()
        ? new Set([mySeatId.get()])
        : new Set(seats.get().map(s => s.seatId))

    seatList().update(list => (list.some(seat => writable.has(seat.seatId) && seat.hand?.length)
        ? list.map(seat => (writable.has(seat.seatId) ? { ...seat, hand: [] } : seat))
        : list))

    pushHand()
}

export function canRemoveSeat(seatId) {
    if (seats.get().length <= 1) return false
    if (seatId === mySeatId.get()) {
        return seats.get().some(s => s.seatId !== seatId && isSeatFree(s.seatId))
    }
    return isSeatFree(seatId)
}

export function removeSeat(seatId) {
    if (!canRemoveSeat(seatId)) return

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

export function clearAllHands() {
    const emptied = list => list.map(seat => (seat.hand?.length ? { ...seat, hand: [] } : seat))
    batch(() => {
        localSeats.update(emptied)
        roomSeats.update(emptied)
    })
    pushHand()
}

function seatFromWire(wire, index, total) {
    return {
        seatId: wire.seatId,
        name: wire.name ?? 'New Seat',
        sleeve: wire.sleeve ?? seatSleeves()[0],
        mirror: wire.mirror === true,
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
        _syncedSig = handSig(mySeat.get())
    })
}

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

        case 'seat:control': {
            const next = { ...controllers.get() }
            if (event.clientId) next[event.seatId] = event.clientId
            else delete next[event.seatId]
            controllers.set(next)

            if (event.clientId === event.yourClientId) {
                roomSeatId.set(event.seatId)
                _syncedSig = handSig(mySeat.get())
            } else if (roomSeatId.get() === event.seatId) {
                roomSeatId.set('')
            }
            break
        }

        case 'seat:hand': {
            if (!roomSeats.get().some(s => s.seatId === event.seatId)) return
            const incoming = Array.isArray(event.hand) ? event.hand : []
            replaceSeat(roomSeats, event.seatId, seat => ({ ...seat, hand: incoming }))
            if (event.seatId === roomSeatId.get()) {
                _syncedSig = handSig(roomSeats.get().find(s => s.seatId === event.seatId))
            }
            break
        }
    }
}

export function seatsToSeed() {
    return localSeats.get().map(s => ({
        seatId: s.seatId, name: s.name, sleeve: s.sleeve, mirror: s.mirror === true,
        anchor: s.anchor, hand: s.hand,
    }))
}

export function seatHandCount(seatId) {
    return seats.get().find(s => s.seatId === seatId)?.hand.length ?? 0
}

export function localSeatIdForSeeding() { return localSeatId.get() }

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
