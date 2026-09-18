// Libraries
import { Container, Graphics, Text, TextStyle } from 'pixi.js'

// Scene
import { getApp, getLayers, mirror_view, getStageScale, onCameraScale } from './scene.js'
import { loadFont } from './font.js'

import { CHIP_BOX, seatFacing, seats, mySeatId, updateSeat } from '../seats.js'
import { derived, store } from '../state/store.js'
import { seatBox } from '../stage.js'

import { screenToWorld } from './scene.js'

import { theme, themeWebfont } from '../theme.js'
import { toPixiColor } from './color.js'

const CHIP_HEIGHT = CHIP_BOX.height
const CHIP_MIN_WIDTH = CHIP_BOX.width
const CHIP_FONT_SIZE = 44
const BOX_RADIUS = 10
const BOX_FILL_ALPHA = 0.10
const BOX_FILL_ALPHA_MINE = 0.16

const ANCHOR_BAR_H = 8

const BADGE_HEIGHT = 26
const BADGE_MIN_WIDTH = 26
const BADGE_PAD_X = 8
const BADGE_FONT_SIZE = 15
const BADGE_DARKEN = -13

const DEG = Math.PI / 180

const chips = new Map()

let dragging_seat_id = null
let render_pending = false
let stop_watchers = []
let stop_scale = null

function hsl(sleeve, lighten = 0) {
    const parts = String(sleeve ?? '')
        .split(/[\s,/]+/)
        .map(p => parseFloat(p))
        .filter(n => Number.isFinite(n))
    const [h = 0, s = 0, l = 50] = parts
    return toPixiColor(`hsl(${h}, ${s}%, ${Math.max(0, Math.min(100, l + lighten))}%)`)
}

export const chip_hidden = store(true)
export const chip_locked = store(true)

function grabbable(mine) {
    return mine && !chip_locked.get()
}

function applyChipState() {
    if (!getApp()) return
    for (const [seatId, chip] of chips) {
        chip.visible = !chip_hidden.get()
        if (chip.handle) chip.handle.eventMode = grabbable(seatId === mySeatId.get()) ? 'static' : 'none'
    }
}

export function setChipsHidden(value) {
    chip_hidden.set(!!value)
    applyChipState()
}

export function setChipsLocked(value) {
    chip_locked.set(!!value)
    applyChipState()
}

function hairline(px) {
    return px / (getStageScale() || 1)
}

function textStyle(size, color) {
    return new TextStyle({
        fontFamily: theme().font,
        fontSize: size,
        fill: color,
    })
}

function buildBadge(seat, mine, box) {
    const count = seat.hand?.length ?? 0
    if (count < 1) return null

    const badge = new Container()
    badge.eventMode = 'none'

    const text = new Text({ text: String(count), style: textStyle(BADGE_FONT_SIZE, hsl(seat.sleeve, 55)) })
    const width = Math.max(BADGE_MIN_WIDTH, Math.ceil(text.width) + BADGE_PAD_X * 2)

    const bubble = new Graphics()
        .roundRect(0, 0, width, BADGE_HEIGHT, BADGE_HEIGHT / 2)
        .fill(hsl(seat.sleeve, (mine ? 6 : 0) + BADGE_DARKEN))
        .stroke({ width: hairline(mine ? 2 : 1), color: hsl(seat.sleeve, mine ? 42 : 16) })

    text.position.set((width - text.width) / 2, (BADGE_HEIGHT - text.height) / 2)
    badge.addChild(bubble, text)

    badge.pivot.set(width / 2, BADGE_HEIGHT / 2)
    badge.position.set(box.cx, box.cy + CHIP_FONT_SIZE)
    badge.rotation = mirror_view.get() ? 180 * DEG : 0
    return badge
}

function setBadge(chip, seat, mine) {
    chip.badge?.destroy()
    const b = chip.label
    chip.badge = buildBadge(seat, mine, { cx: b.x, cy: b.y })
    if (chip.badge) chip.addChild(chip.badge)
}

function buildChip(seat, mine) {
    const chip = new Container()
    chip.position.set(seat.anchor.x, seat.anchor.y)
    chip.visible = !chip_hidden.get()
    chip.eventMode = 'none'
    chip.seatId = seat.seatId
    chip.seat = seat
    chip.mine = mine

    const box = seatBox()
    const turn = seatFacing(seat) === 180 ? -1 : 1
    const top = turn > 0 ? box.y : -(box.y + box.height)

    const frame = new Graphics()
        .roundRect(box.x, top, box.width, box.height, BOX_RADIUS)
        .fill({ color: hsl(seat.sleeve, mine ? 6 : 0), alpha: mine ? BOX_FILL_ALPHA_MINE : BOX_FILL_ALPHA })
        .stroke({ width: hairline(mine ? 2 : 1), color: hsl(seat.sleeve, mine ? 42 : 16) })
    frame.eventMode = 'none'

    const label = new Text({ text: seat.name || 'Seat', style: textStyle(CHIP_FONT_SIZE, hsl(seat.sleeve, 52)) })
    label.eventMode = 'none'
    label.anchor.set(0.5)
    label.position.set(box.x + box.width / 2, top + box.height / 2)
    label.rotation = mirror_view.get() ? 180 * DEG : 0

    const handle = new Graphics()
        .roundRect(-CHIP_MIN_WIDTH / 2, -ANCHOR_BAR_H / 2, CHIP_MIN_WIDTH, ANCHOR_BAR_H, ANCHOR_BAR_H / 2)
        .fill(hsl(seat.sleeve, mine ? 42 : 16))
    handle.eventMode = grabbable(mine) ? 'static' : 'none'
    handle.cursor = 'grab'
    handle.hitArea = {
        contains: (x, y) => Math.abs(x) <= CHIP_MIN_WIDTH / 2 && Math.abs(y) <= CHIP_HEIGHT / 2,
    }

    chip.addChild(frame, label, handle)
    chip.frame = frame
    chip.label = label
    chip.handle = handle

    setBadge(chip, seat, mine)

    if (mine) attachDrag(chip, seat)

    return chip
}

function attachDrag(chip, seat) {
    let offset = null

    chip.handle.on('pointerdown', (e) => {
        if (!grabbable(true)) return
        dragging_seat_id = seat.seatId
        const world = screenToWorld(e.global.x, e.global.y)
        offset = { x: chip.x - world.x, y: chip.y - world.y }
        e.stopPropagation()
        getApp()?.stage.on('globalpointermove', onMove)
        getApp()?.stage.on('pointerup', onUp)
        getApp()?.stage.on('pointerupoutside', onUp)
    })

    function onMove(e) {
        if (!offset) return
        const world = screenToWorld(e.global.x, e.global.y)
        chip.position.set(world.x + offset.x, world.y + offset.y)
    }

    function onUp() {
        if (!offset) return
        offset = null
        getApp()?.stage.off('globalpointermove', onMove)
        getApp()?.stage.off('pointerup', onUp)
        getApp()?.stage.off('pointerupoutside', onUp)

        updateSeat(seat.seatId, { anchor: { x: chip.x, y: chip.y } })
        dragging_seat_id = null
        if (render_pending) {
            render_pending = false
            render()
        }
    }
}

function render() {
    if (!getApp()) return
    if (dragging_seat_id) {
        render_pending = true
        return
    }

    const { chip: band } = getLayers()
    if (!band) return

    for (const node of chips.values()) node.destroy()
    chips.clear()

    for (const seat of seats.get()) {
        if (!seat?.anchor) continue
        const chip = buildChip(seat, seat.seatId === mySeatId.get())
        chips.set(seat.seatId, chip)
        band.addChild(chip)
    }
}

function refreshBadges() {
    if (!getApp()) return
    for (const seat of seats.get()) {
        const chip = chips.get(seat.seatId)
        if (!chip) continue
        setBadge(chip, seat, seat.seatId === mySeatId.get())
    }
}

function refreshStrokes() {
    for (const chip of chips.values()) {
        const { seat, mine, frame } = chip
        if (!frame) continue
        const box = seatBox()
        const turn = seatFacing(seat) === 180 ? -1 : 1
        const top = turn > 0 ? box.y : -(box.y + box.height)
        frame.clear()
            .roundRect(box.x, top, box.width, box.height, BOX_RADIUS)
            .fill({ color: hsl(seat.sleeve, mine ? 6 : 0), alpha: mine ? BOX_FILL_ALPHA_MINE : BOX_FILL_ALPHA })
            .stroke({ width: hairline(mine ? 2 : 1), color: hsl(seat.sleeve, mine ? 42 : 16) })
        setBadge(chip, seat, mine)
    }
}

const chip_signature = derived([seats, mySeatId], ([list, mine]) => `${mine}#` + list
    .map(s => `${s.seatId}|${s.name}|${s.sleeve}|${s.anchor?.x}|${s.anchor?.y}`)
    .join('~'))

const hand_signature = derived([seats], ([list]) => list
    .map(s => s.hand?.length ?? 0)
    .join(','))

// Lifecycle
export function initChips() {
    const webfont = themeWebfont()
    if (webfont) loadFont(webfont).then(render).catch(() => { })
    stop_watchers = [
        chip_signature.listen(render),
        mirror_view.listen(render),
        hand_signature.listen(refreshBadges),
    ]
    render()
    stop_scale = onCameraScale(refreshStrokes)
}

export function destroyChips() {
    for (const stop of stop_watchers) stop()
    stop_watchers = []
    stop_scale?.()
    stop_scale = null
    chips.clear()
    dragging_seat_id = null
    render_pending = false
}
