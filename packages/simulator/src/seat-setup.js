// Stores
import { derived, when } from './state/store.js'

import { gameConfig } from './game.js'

// Multiplayer
import {
    broadcastTableReset,
    clearTableNodes,
    connectionStatus,
    setTableResetHandler,
} from './multiplayer.js'

import { resetScenery } from './canvas-pixi/index.js'

import { clearSeatsPlaced } from './deal.js'

import { emitTableEvent } from './events.js'

// Seats
import { resetSeatHands, resetSeatLayout, seatFacing, seatLayoutStale, seatPoint, seats } from './seats.js'
import { sharedPoint } from './stage.js'

// Accessories
import { adderFor, facesSeat, gameSpawns, seatSpawns } from './accessory.js'

function placementCentre(place, size) {
    return {
        x: (Number(place?.x) || 0) + (Number(size?.width) || 0) / 2,
        y: (Number(place?.y) || 0) + (Number(size?.height) || 0) / 2,
    }
}

export function spawnSeatDefaults(seat) {
    const spawns = seatSpawns(gameConfig.get())
    if (spawns.length === 0) return

    const facing = seatFacing(seat)
    for (const { item, place, options } of spawns) {
        const { x, y } = seatPoint(seat, placementCentre(place, item.size))
        adderFor(item)(item, x, y, { rotation: facesSeat(item) ? facing : 0, ...options })
    }
}

let pending_seat_id = null

export function onSeatAdded(seat) {
    pending_seat_id = seat?.seatId ?? null
    settleNewSeat()
}

function settleNewSeat() {
    if (!pending_seat_id) return
    const seat = seats.get().find(s => s.seatId === pending_seat_id)
    if (!seat) return

    pending_seat_id = null
    if (seatLayoutStale()) resetTable()
    else spawnSeatDefaults(seat)
}

const seat_ids = derived([seats], ([list]) => list.map(s => s.seatId).join(','))

function spawnGameDefaults() {
    for (const { item, place, options } of gameSpawns(gameConfig.get())) {
        const { x, y } = sharedPoint(placementCentre(place, item.size))
        adderFor(item)(item, x, y, { rotation: 0, ...options })
    }
}

function resetOwnTable() {
    resetSeatLayout()
    resetSeatHands()
    clearSeatsPlaced()

    resetScenery()

    emitTableEvent('reset')
}

export function startSeatSetup() {
    setTableResetHandler(resetOwnTable)
    const stop = seat_ids.listen(() => settleNewSeat())
    return () => {
        stop()
        setTableResetHandler(null)
    }
}

export function resetTable() {
    broadcastTableReset()

    clearTableNodes()
    resetOwnTable()

    spawnGameDefaults()
    for (const seat of seats.get()) spawnSeatDefaults(seat)
}

let opening_token = 0

export async function spawnOpeningDefaults() {
    const token = ++opening_token

    if (connectionStatus.get() !== 'disconnected') return

    resetSeatHands()

    await when(gameConfig)
    if (token !== opening_token) return

    clearSeatsPlaced()
    spawnGameDefaults()
    for (const seat of seats.get()) spawnSeatDefaults(seat)
}

export function cancelOpeningDefaults() {
    opening_token++
}
