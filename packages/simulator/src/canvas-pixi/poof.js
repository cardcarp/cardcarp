// What a deleted object leaves behind.
//
// Deletion was the one table verb with no motion at all: an object was there, and then the
// frame after it was not. That reads as a rendering failure rather than as an action — the eye
// gets no event to attach the disappearance to, so a card that vanishes while you are looking
// somewhere else is indistinguishable from a card that was never dealt, and one that vanishes
// under your own cursor looks like a dropped frame. Every other verb on this table already says
// itself in movement: a card lands, a pile fans, a refused zoom shakes.
//
// So a puff of smoke, at the place the thing was, for a third of a second.
//
// === Why it is a spritesheet and not drawn ===
//
// Everything else this renderer draws is generated — the grid, the shadow texture, the chrome,
// the edge. A dissipating puff is the one thing in that list that is ART rather than geometry:
// its whole job is to look hand-made, and five authored frames do that in 5KB where a particle
// system would be a hundred lines of tuning that still looked like a particle system.
//
// The sheet is 32px frames stacked VERTICALLY, and the frame count is read off the texture
// rather than written down here. That is not defensive coding — it is the one number most
// likely to change (the art can gain or lose a frame at any time) and the only one this file
// cannot check for itself. Deriving it means re-exporting the sheet is the whole edit.
//
// === Where it is drawn ===
//
// band_fx: inside the camera and the mirror, above every element band, outside all four of
// them. See the note in scene.js for why each of those three matters — the short version is
// that a puff marks a PLACE on the table, has to cover what it replaced, and must survive the
// wipe that caused it.
//
// === One per object ===
//
// Not one per node, for the same reason a lifted pile wears one plate and casts one shadow (see
// selection.js, tactility.js): sixty cards deleted together are one object leaving the table,
// and sixty overlapping puffs would be a white square rather than a puff. The union of the
// members' boxes is what places it, so a deck's puff sits over the middle of the deck.

import { AnimatedSprite, Assets, Rectangle, Texture } from 'pixi.js'

import { getApp, getLayers, mirror_view } from './scene.js'
import { nodeBounds } from './node.js'
import { prefersReducedMotion } from './tactility.js'

// The sheet's URL, as the app hands it over (table.setArt's `puff`).
// UI rather than game art, so not an assetUrl() path: the app bundles the file and one sheet serves
// every game. With none given there is no puff — the object still goes, just silently, which is how
// a delete behaved before this file existed.
let sheet_url = null

const FRAME = 32

// Roughly 14 frames a second: the sheet's five frames run in ~360ms. Slow enough to read as a
// puff rather than a flicker, fast enough that it is over before the next thing you do.
const FPS = 14

// The puff draws at the sheet's own size, unscaled — 32 world units square, wherever the
// object was and whatever size it happened to be.
//
// It was scaled to the object first, and that was the wrong instinct twice over. The art is a
// 32px drawing, so a playmat-sized puff is a smear of upscaled pixels rather than a bigger
// version of the same effect; and sizing the mark to the thing it replaces makes it a
// MEASUREMENT of what went, when all it has to say is where. One puff, one size, every delete —
// which also means the eye learns it once.
//
// It still zooms and pans with the table, because it lives inside the camera: 32 units is a
// fixed size on the TABLE, not on the screen, the same as everything else drawn there.

const DEG = Math.PI / 180

let frames = null
let loading = null

// Sliced once, into textures that all share the sheet's single GPU source. Kept for the life of
// the session — five frame descriptors against a 5KB texture, versus re-cutting them on every
// delete for no benefit.
function sliceFrames(sheet) {
    const source = sheet.source
    const count = Math.max(1, Math.floor(sheet.height / FRAME))
    return Array.from({ length: count }, (_, i) => new Texture({
        source,
        frame: new Rectangle(0, i * FRAME, FRAME, Math.min(FRAME, sheet.height - i * FRAME)),
    }))
}

// Started when the canvas is built, so the first object deleted in a session is not the one that
// pays for the fetch. Failure is not fatal and not retried: the object still goes, it just goes
// silently, which is exactly the behaviour that existed before this file.
export function initPoof() {
    if (!sheet_url) return Promise.resolve(null)
    if (frames || loading) return loading
    const url = sheet_url
    loading = Assets.load(url)
        .then((texture) => {
            // A sheet swapped while this one loaded is not this one's to fill in.
            if (url !== sheet_url) return null
            frames = sliceFrames(texture)
            return frames
        })
        .catch((err) => {
            console.error(`[canvas] poof sheet failed to load: ${url}`, err)
            return null
        })
    return loading
}

// Point the puff at a sheet, or at none. A previous sheet's frames are dropped; the new one loads with
// the next canvas, or with the first delete that needs it.
export function setPuffSheet(url) {
    const next = url || null
    if (next === sheet_url) return
    sheet_url = next
    frames = null
    loading = null
}

export function destroyPoof() {
    // The frame textures are views on the loaded sheet, which Assets owns and caches across
    // scenes; dropping the references is the whole of the teardown. A destroy here would take
    // the sheet out from under the next table built in this session.
    frames = null
    loading = null
}

// The object's box in world coordinates. Read only for its CENTRE now that the puff draws at a
// fixed size — but still a box rather than a point, because the centre of a fanned pile is the
// centre of the pile and not the position of whichever card happens to be asked first.
//
// Node positions in the element bands ARE world coordinates — the bands carry no transform of
// their own, which is what lets the chips and this share a frame with them — so a node's box is
// its own bounds, scaled, offset by its position.
//
// Rotation is deliberately ignored. A rotated card's true box is a little wider than this says,
// and a puff sized off a box that is a few units narrow is a puff nobody can tell from the
// right one. Carrying the rotation through would mean four corner transforms per node to move
// some smoke.
function worldBox(node) {
    const b = nodeBounds(node)
    const sx = node.scale?.x ?? 1
    const sy = node.scale?.y ?? 1
    return {
        x: node.x + b.x * sx,
        y: node.y + b.y * sy,
        width: b.width * sx,
        height: b.height * sy,
    }
}

function union(a, b) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return {
        x,
        y,
        width: Math.max(a.x + a.width, b.x + b.width) - x,
        height: Math.max(a.y + a.height, b.y + b.height) - y,
    }
}

// Every object in `nodes`, as one box each — grouped by groupId exactly as the selection chrome
// groups, so what gets one puff is what would have got one plate.
function boxesFor(nodes) {
    const boxes = new Map()
    for (const node of nodes ?? []) {
        if (!node || node.destroyed || !node.parent) continue
        const key = node.groupId ?? node
        const box = worldBox(node)
        const seen = boxes.get(key)
        boxes.set(key, seen ? union(seen, box) : box)
    }
    return [...boxes.values()]
}

function spawn(box) {
    const { fx } = getLayers()
    const app = getApp()
    if (!fx || fx.destroyed || !app || !frames?.length) return

    const sprite = new AnimatedSprite(frames, false)   // autoUpdate off — see the ticker below
    sprite.eventMode = 'none'
    sprite.label = 'poof'
    sprite.anchor.set(0.5)
    sprite.loop = false
    sprite.animationSpeed = FPS / 60

    sprite.position.set(box.x + box.width / 2, box.y + box.height / 2)

    // Counter-rotated for a mirrored seat, the same way a card is (see scene.js UPRIGHT_NAMES).
    // Smoke rises, and a sheet played upside down at the far end of the table is smoke falling.
    // Free of any pivot arithmetic because the anchor is already the centre.
    sprite.rotation = mirror_view.get() ? 180 * DEG : 0

    // Driven by the app's own ticker rather than Pixi's autoUpdate, which subscribes to
    // Ticker.shared — a second clock this app does not otherwise run, started and stopped behind
    // the scenes by whether a puff happens to be in flight.
    const tick = (ticker) => sprite.update(ticker)
    app.ticker.add(tick)

    const end = () => {
        app.ticker?.remove(tick)
        if (!sprite.destroyed) sprite.destroy()
    }
    sprite.onComplete = end

    fx.addChild(sprite)
    sprite.gotoAndPlay(0)
}

// The public verb: these nodes are going, mark where they were.
//
// Called BEFORE the destroy, because every measurement it needs — the boxes, the group ids, the
// scales — is gone the moment the nodes are. That ordering is the one thing a caller has to get
// right, and it is why this takes nodes rather than being folded into a destroy helper: the
// callers that delete (selection.js) each already hold the list at the right moment.
export function poofNodes(nodes) {
    // Reduced motion means the puff does not happen at all, rather than a frame of smoke parked
    // on the table for a third of a second. The deletion is still perfectly legible — the object
    // is gone — and this whole file only ever added the motion on top of that.
    if (prefersReducedMotion()) return

    const boxes = boxesFor(nodes)
    if (boxes.length === 0) return

    // The ordinary path: the sheet was loaded when the canvas was built, and the puff goes up in
    // the same frame as the delete. The await is for the first delete of a session that outran
    // the fetch — the boxes are already measured, so a late puff still lands in the right place.
    if (frames) return boxes.forEach(spawn)
    initPoof().then(() => { if (frames) boxes.forEach(spawn) })
}
