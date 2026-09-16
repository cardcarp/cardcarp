// Seat boxes — one per seat, marking out the half of the table that belongs to that player.
//
// Everything the original says about what a chip IS still holds: not an element, no nodeId,
// never in the element bands, skipped by box-select and delete, and its position IS the seat's
// `anchor` field — which is what makes its whole lifecycle free.
//
// Two things the port changed:
//
// 1. The band. Konva put chips on the ui layer, which carried the stage's pan and zoom because
//    a Konva Layer is a stage child. Here layer_ui sits outside the camera, so chips get their
//    own band inside it (see scene.js). Same z, correct transform, and it states the intent
//    rather than borrowing it.
//
// 2. strokeScaleEnabled. Konva kept the outline a hairline at any zoom with one flag. Pixi has
//    no equivalent — a stroke is geometry and geometry scales — so the width is divided by the
//    camera scale and the boxes redraw when the zoom changes. That is the one place this port
//    pays real attention for something that used to be free.
//
// === From a pill to a box ===
//
// This was a name-sized pill sitting at the anchor, which said who a seat was but nothing about
// where it reached. Now that the stage is partitioned into regions (stage.js), a seat HAS an
// extent, and the useful thing to draw is that: the whole region, outlined in the seat's sleeve
// colour with a translucent wash, the player's name in the middle of it.
//
// Two parts, because they answer different questions and want different sizes:
//
//   the box     — where this seat reaches. Big, inert, and hidden by default: it is a setup aid,
//                 and its name sits right where the mat is, so playing over it would be absurd.
//   the anchor  — where this seat IS. Small, and the only draggable part. Keeping the drag on a
//                 handle rather than on the box is not a detail: the box is 1920 x 540, and a
//                 hit area that size would swallow every press on that half of the table the
//                 moment somebody unlocked it.
//
// The exports are still named chip_* — the toggle, its settings row and the barrel all speak
// that name, and renaming the concept through five files buys nothing the header does not.
//
// The container is NOT counter-rotated any more, where the pill was. A pill is symmetric so it
// did not matter; a box is not, and cancelling the mirror on the container would have left it
// hanging off the wrong side of its own anchor. The rotation moved to the label and badge, which
// are the only parts that actually need to stay upright.

// Libraries
import { Container, Graphics, Text, TextStyle } from 'pixi.js'

// Scene
import { getApp, getLayers, mirror_view, getStageScale, onCameraScale } from './scene.js'
import { loadFont } from './font.js'

// Seats — the chip is a view of a seat, so the seat model is the only state it reads.
import { CHIP_BOX, seatFacing, seats, mySeatId, updateSeat } from '../seats.js'
import { derived, store } from '../state/store.js'
import { seatBox } from '../stage.js'

// Pointer — a chip drag is not a node drag: it writes seat state on release, not a stream.
import { screenToWorld } from './scene.js'

// Look — the font is the theme's; a seat's colours are its own sleeve, shaded (see hsl below).
import { theme, themeWebfont } from '../theme.js'
import { toPixiColor } from './color.js'

const CHIP_HEIGHT = CHIP_BOX.height
const CHIP_MIN_WIDTH = CHIP_BOX.width
const CHIP_FONT_SIZE = 44          // read from across the table, not off a pill
// The box: a solid edge and a wash faint enough to read a mat through. Yours is a shade stronger
// on both, which is the only thing distinguishing it at a glance once the names are small.
const BOX_RADIUS = 10
const BOX_FILL_ALPHA = 0.10
const BOX_FILL_ALPHA_MINE = 0.16

// The grab handle at the anchor. Drawn as a bar rather than a dot so it reads as something to
// take hold of, and given the old chip's whole footprint as a hit area so it stays easy to hit
// at any zoom while showing almost nothing.
const ANCHOR_BAR_H = 8

const BADGE_HEIGHT = 26
const BADGE_MIN_WIDTH = 26
const BADGE_PAD_X = 8
const BADGE_FONT_SIZE = 15
const BADGE_DARKEN = -13

const DEG = Math.PI / 180

// seatId → chip Container
const chips = new Map()

// Rebuilding the chips mid-drag would destroy the node under the cursor and strand the drag.
let dragging_seat_id = null
let render_pending = false
let stop_watchers = []
let stop_scale = null

// Seat sleeves are stored as bare HSL triples, in two spellings: '202 80.3% 23.9%' from the theme's
// seat palette and '202 80.3 23.9' from the colour picker. This normalises the spelling and shades the
// lightness; color.js turns the result into the number Pixi wants.
function hsl(sleeve, lighten = 0) {
    const parts = String(sleeve ?? '')
        .split(/[\s,/]+/)
        .map(p => parseFloat(p))
        .filter(n => Number.isFinite(n))
    const [h = 0, s = 0, l = 50] = parts
    return toPixiColor(`hsl(${h}, ${s}%, ${Math.max(0, Math.min(100, l + lighten))}%)`)
}

// === Hide / lock ===
// The same pair of toggles the playmats have, done per chip rather than per band. Locking takes
// away less here than for a mat, because a chip starts out mostly untouchable: only your OWN is
// draggable, everyone else's is inert already.
//
// Neither flag needs to release a selection the way the playmat toggles do — a chip is not an
// element, so there is no way for one to be in the selection when the toggle flips.
export const chip_hidden = store(true)
export const chip_locked = store(true)

function grabbable(mine) {
    return mine && !chip_locked.get()
}

// Applied in place rather than by re-rendering: render() rebuilds every chip from its seat,
// which is far more than a toggle needs, and it refuses to run while one is being dragged.
function applyChipState() {
    if (!getApp()) return
    for (const [seatId, chip] of chips) {
        chip.visible = !chip_hidden.get()
        // The handle, not the container: the box must stay inert whatever the lock says, or
        // unlocking would put a 1920 x 540 hit area over half the table.
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

// The hairline width for a stroke drawn inside the camera. See the header.
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

// The count of cards the seat is holding. Absent at zero rather than showing a 0: it is an
// alert, and a row of chips each announcing nothing is just noise on the table.
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

    // Beneath the name rather than on a corner. It used to sit on the pill's top-right arc,
    // which was the only place a pill had; a box has a middle, and the two things a glance wants
    // — who this is and how much they are holding — belong together in it.
    badge.pivot.set(width / 2, BADGE_HEIGHT / 2)
    badge.position.set(box.cx, box.cy + CHIP_FONT_SIZE)
    badge.rotation = mirror_view.get() ? 180 * DEG : 0
    return badge
}

// Swap a chip's badge for one matching the seat's current hand. Split out so a card drawn only
// redraws this, not the whole chip.
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
    chip.eventMode = 'none'          // the anchor handle listens; the box never does
    chip.seatId = seat.seatId
    chip.seat = seat
    chip.mine = mine

    // The seat's region, turned to the end it is on. seatBox is written for the near seat, so a
    // far one is reflected through the anchor rather than being described twice.
    const box = seatBox()
    const turn = seatFacing(seat) === 180 ? -1 : 1
    const top = turn > 0 ? box.y : -(box.y + box.height)

    const frame = new Graphics()
        .roundRect(box.x, top, box.width, box.height, BOX_RADIUS)
        .fill({ color: hsl(seat.sleeve, mine ? 6 : 0), alpha: mine ? BOX_FILL_ALPHA_MINE : BOX_FILL_ALPHA })
        .stroke({ width: hairline(mine ? 2 : 1), color: hsl(seat.sleeve, mine ? 42 : 16) })
    frame.eventMode = 'none'

    // Upright whichever end the seat is on and whichever way the view is flipped. The container
    // no longer counter-rotates (see the header), so the label carries it — and its pivot is its
    // own middle, so the rotation spins it in place at the box's centre rather than swinging it.
    const label = new Text({ text: seat.name || 'Seat', style: textStyle(CHIP_FONT_SIZE, hsl(seat.sleeve, 52)) })
    label.eventMode = 'none'
    label.anchor.set(0.5)
    label.position.set(box.x + box.width / 2, top + box.height / 2)
    label.rotation = mirror_view.get() ? 180 * DEG : 0

    // The handle. Its hit area is the old chip's footprint — far bigger than the bar it draws —
    // because a bar eight units tall is not something you can reliably put a finger on.
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

    // Keyed on `mine` rather than on grabbable(): a handle built while locked still has to carry
    // its handlers, or unlocking would hand back one that moves without ever writing the anchor
    // it moved to.
    //
    // Konva's `draggable: true` did the moving; here the three listeners are the drag. Written
    // once on release rather than through it, because the anchor is seat state on the same relay
    // path as a rename, not a node position with a drag stream behind it.
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

    // Destroy only what we put there. Konva needed this note because the ui layer was shared
    // with the transformer; here the band is the chips' own, but destroying by reference stays
    // the honest way to say it.
    for (const node of chips.values()) node.destroy()
    chips.clear()

    for (const seat of seats.get()) {
        if (!seat?.anchor) continue
        const chip = buildChip(seat, seat.seatId === mySeatId.get())
        chips.set(seat.seatId, chip)
        band.addChild(chip)
    }
}

// Repoint every chip's badge at its seat's current hand, leaving the chips alone. Safe mid-drag,
// unlike render(): it swaps a child rather than the container being dragged.
function refreshBadges() {
    if (!getApp()) return
    for (const seat of seats.get()) {
        const chip = chips.get(seat.seatId)
        if (!chip) continue
        setBadge(chip, seat, seat.seatId === mySeatId.get())
    }
}

// Redraw every box and bubble outline at the new zoom. Only the strokes change, so this
// re-issues the Graphics rather than rebuilding the chips — and it is safe mid-drag for the
// same reason refreshBadges is.
//
// The handle is not redrawn: it is fill-only, so nothing about it depends on the zoom.
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

// Two signatures rather than one listener on the seat list, because the two halves change at
// wildly different rates. A chip's shape and place move when somebody renames a seat, drags a
// chip or sits somewhere else; its hand moves on every single draw and every card played. Both
// are derived strings, so each announces a change only when its text differs.
const chip_signature = derived([seats, mySeatId], ([list, mine]) => `${mine}#` + list
    .map(s => `${s.seatId}|${s.name}|${s.sleeve}|${s.anchor?.x}|${s.anchor?.y}`)
    .join('~'))

const hand_signature = derived([seats], ([list]) => list
    .map(s => s.hand?.length ?? 0)
    .join(','))

// Lifecycle
export function initChips() {
    // Text is measured with whatever font is resolved at build time, so a chip built before the
    // webfont lands is sized for the fallback. Rebuild once it arrives.
    const webfont = themeWebfont()
    if (webfont) loadFont(webfont).then(render).catch(() => { /* fallback metrics are fine */ })
    stop_watchers = [
        chip_signature.listen(render),
        mirror_view.listen(render),
        // No first call — render() builds the badges as part of the chip.
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
    // The nodes go with the scene; just drop our references so a rebuilt canvas starts clean.
    chips.clear()
    dragging_seat_id = null
    render_pending = false
}
