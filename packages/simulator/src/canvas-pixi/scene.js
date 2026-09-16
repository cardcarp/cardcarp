// The Pixi scene: camera, layers, grid, mirror. The port of canvas/stage.js.
//
// Same exported surface, same constants, same behaviours — so canvas-pixi/index.js can present
// the identical 87-function barrel that canvas/index.js does today, and the Vue layer above it
// never learns which renderer is underneath.
//
// === The tree, and why it differs from Konva's ===
//
//   app.stage
//     ├─ camera          pan = position, zoom = scale
//     │    ├─ layer_bg   grid + centre divider — NEVER mirrored
//     │    └─ mirror     rotation 0 or π
//     │         ├─ layer_table → band_board, band_shape
//     │         └─ layer_piece → band_card, band_accessory
//     └─ layer_ui        selection chrome, screen space, outside the camera
//
// Konva had no camera: the STAGE carried pan and zoom, so the mirror had to be a rotation on
// each element layer, and layer_ui — which holds the transformer and the outlines — had to
// rotate with them. That is what made selection.js map every measured rect back into the ui
// layer's own space, and what made getClientRect's `relativeTo` a trap.
//
// Here the camera is a container and layer_ui sits outside it, so chrome is measured and drawn
// in one space. That mapping collapses to the identity (see canvas-pixi/selection.js).
//
// === What did NOT get simpler ===
//
// The mirror's counter-rotation. A card seen from the far end must be point-reflected in
// POSITION but upright in CONTENT, and that is a property of the requirement, not of Konva —
// so UPRIGHT_NAMES, mirrorNewNode, getWorldRotation and setWorldRotation all survive the port
// essentially unchanged.
//
// What the camera does buy is toWorldPoint. Konva's getPointerPosition ignores layer rotation,
// so every view→world conversion in stage.js had to negate x/y by hand and every one of them
// was a place to forget. Pixi's toLocal walks the whole chain, mirror included, so the four
// conversions below are one call each and the helper is gone.
//
// === batchDraw ===
//
// Gone. Pixi renders on a ticker, so there is nothing to schedule — the ~90 batchDraw() calls
// spread across canvas/ delete rather than port. They are not shimmed: a no-op named after a
// thing that no longer happens is worse than its absence.

import { store } from '../state/store.js'
import { theme } from '../theme.js'
import { toPixiColor } from './color.js'
import { Application, Assets, Container, Graphics, TilingSprite, Texture } from 'pixi.js'

// Pixi builds its uniform-upload and shader-sync routines by string-compiling them with
// `new Function` — genuinely faster, and the reason it does it. Our production CSP says
// `script-src 'self'` with no 'unsafe-eval' (public/_headers), so that call throws and the
// renderer refuses to start:
//
//   Error: Current environment does not allow unsafe-eval, please use the
//          pixi.js/unsafe-eval module to enable support.
//
// This import is Pixi's own answer: it swaps those four generators for interpreted equivalents
// that walk the uniform group per upload instead of compiling a straight-line function for it.
// Strictly slower, and only measurably so on uniform-heavy scenes — which this is not. A table
// of sprites and a handful of Graphics spends its frame in the batcher, not in uniform sync.
//
// The alternative was adding 'unsafe-eval' to script-src, and that trade is not close: _headers
// says in as many words that script-src staying strict is where the real XSS protection lives,
// and it would be bought here to save microseconds nobody can see.
//
// Unconditional rather than production-only, because a renderer path that only ever
// runs in production is a renderer path that is never tested. Dev has no CSP — it would happily
// take the eval route — so pinning both to the polyfill is what makes what you see in dev the
// thing that ships. It must be imported before any renderer is constructed; a static import is,
// since ES modules evaluate their imports before the body that calls app.init().
import 'pixi.js/unsafe-eval'
import { animate } from 'motion'

import { assetUrl } from '../assets.js'
import { surfaceTextureUrl } from './surface.js'
import { cameraInterval, edgeBands, edgeStyle, rubberBand, shakeOffset, stageSize, surfaceStyle, worldRect } from '../stage.js'
import { seats } from '../seats.js'

const INITIAL_SCALE_MAX = 0.9

// Refused a zoom, the table shakes.
//
// Why a shake here when panning past the edge gets a rubber band instead: an elastic zoom would
// have to briefly render past the floor, and the floor exists precisely so that nothing outside
// the world is ever shown. Overshooting it would reveal the very thing it is there to withhold.
// A shake refuses without revealing — and it is a different kind of limit anyway. The pan edge
// is a place you can lean against; the zoom floor is an answer of no.
//
// Screen pixels, so it reads the same at any zoom, and horizontal because that is the gesture a
// no is made with. Three cycles decaying to nothing over a third of a second: long enough to be
// read as deliberate, short enough that holding a pinch against the limit does not become a
// stutter — the cooldown is what actually guarantees that.
const SHAKE_PX = 9
const SHAKE_SECONDS = 0.32
const SHAKE_COOLDOWN_MS = 650

// Letting go springs the camera back. Softer and heavier than the drop a card lands with
// (TRANSITION.drop, stiffness 420) because a table is a bigger thing than a card, but from the
// same family and with the same one-visible-overshoot damping — the camera should have the same
// weight as the objects standing on it.
const SETTLE_SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 1 }

const GRID_SPACING = 30
const GRID_RESOLUTION = 4
const DIVIDER_DARK_H = 2
const DIVIDER_LIGHT_H = 1

// Local
let app = null
let stage_container = null
let camera = null
let mirror_pivot = null
let grid_sprite = null
let divider_gfx = null
let surface_gfx = null
let surface_tile = null
let layer_edge = null
let edge_fill = null
let edge_tile = null
let settle_anim = null
let shake_anim = null
let shake_base = null
let shake_ended_at = 0
let layer_bg = null
let layer_table = null
let layer_piece = null
let layer_ui = null
let band_board = null
let band_shape = null
let band_card = null
let band_accessory = null
let band_chip = null
let band_fx = null

// Accessors
export function getApp() {
    return app
}

export function getContainer() {
    return stage_container
}

export function getLayers() {
    return {
        bg: layer_bg,
        // The band's PARENT, not a band. The hand's landing footprint is drawn here at index 0
        // — under every card and accessory, above the mats — and living outside the four element
        // bands is what keeps clearAllElements from destroying it along with the table.
        piece: layer_piece,
        board: band_board,
        shape: band_shape,
        card: band_card,
        accessory: band_accessory,
        chip: band_chip,
        fx: band_fx,
        ui: layer_ui,
    }
}

// === Coordinate conversions ===
// Each is one toLocal/toGlobal. The mirror is a transform in the chain, so it is accounted for
// without any of them knowing it exists — this is the whole of what the camera bought.

export function getRelativePointerPosition() {
    if (!app) return { x: 0, y: 0 }
    const p = app.renderer.events.pointer.global
    return mirror_pivot.toLocal(p)
}

// Viewport (clientX/Y) → world. Used by DOM-side drops, where the cursor is only known in
// viewport space (dragging a card out of the hand onto the table).
export function clientToWorld(clientX, clientY) {
    if (!app || !stage_container) return { x: 0, y: 0 }
    const rect = stage_container.getBoundingClientRect()
    return mirror_pivot.toLocal({ x: clientX - rect.left, y: clientY - rect.top })
}

// Current zoom. Screen px = world units × this — needed by DOM overlays sizing something in
// canvas terms (the hand works out a dropped card's on-screen box from it).
export function getStageScale() {
    return camera?.scale.x ?? 1
}

export function getViewportCenter() {
    if (!app) return { x: 0, y: 0 }
    return mirror_pivot.toLocal({ x: app.screen.width / 2, y: app.screen.height / 2 })
}

// Screen point → world, for callers holding a point already relative to the canvas.
export function screenToWorld(x, y) {
    return mirror_pivot.toLocal({ x, y })
}

// The world's rectangle, as it lands on screen.
//
// Two opposite corners through the same transform the pointer is measured in, then re-bounded —
// the mirror is a 180° rotation, so the corner that comes back as the minimum is not the one
// that went in as the top-left. Which is exactly why this is worth doing rather than assuming:
// the mirror does not change the rectangle, only which of its edges faces the player.
function worldScreenRect() {
    const w = worldBounds()
    const a = worldToScreen({ x: w.x, y: w.y })
    const b = worldToScreen({ x: w.x + w.width, y: w.y + w.height })
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }
}

// Is the pointer off the table?
//
// OFF it, strictly — out on the ground layer_edge paints, past where the felt stops. Not a band
// reaching back inside it, which is what this was first and what made the gesture feel like it
// was guessing: a 40px rim measured inward means the cursor is plainly over the table, on felt
// you could put a card down on, while the chrome says the card is about to be destroyed. The
// player is reading the table and the table is disagreeing with them. Whatever that buys in
// reachability it pays for in trust, and this is a destructive action.
//
// So the rule is the one the eye already sees: the edge is where the surface ends, and the
// pointer is either on the table or it is not.
//
// What that costs, stated because it is a real limit rather than an oversight: the camera keeps
// the viewport inside the world (cameraInterval), so the ground is only ever on screen where
// the world does not fill it — the letterbox at fit zoom, on whichever axis has slack. Zoomed
// in there is no outside and no drag can reach one, which is the honest answer anyway: you
// throw a thing off a table you can see the edge of. The one shape with no reachable edge at
// all is a viewport whose aspect matches the stage's exactly, where fit leaves no letterbox on
// either axis.
//
// Three edges, not four. The bottom of the SCREEN is the hand rail's — hand.vue treats the
// bottom band of the window as its drop zone and sends a card released there into your hand
// (trackDropzone) — and two destructive readings of one release is not a thing to arbitrate, it
// is a thing to not have. So the bottom is the hand's and the other three are the table's.
//
// Note that this is the bottom of the SCREEN rather than the bottom of the world, and under the
// mirror those are opposite edges. Asking in screen space is what makes that automatic: the
// hand is at the player's chin whichever end of the table they are sitting at, and so is the
// edge this declines to claim.
//
// The world asked about is the CURRENT one — worldBounds grows with the seat count — so a table
// that gains a pair does not leave a stale discard region stranded over playable felt.
export function isOverWorldEdge(x, y) {
    if (!app || !mirror_pivot) return false
    const at = edgeBands({ x, y }, worldScreenRect())
    // Checked first and across the full width, because that is how the hand claims it: its zone
    // is decided by clientY alone, so the bottom corners are the hand's too.
    if (at.bottom) return false
    return at.left || at.right || at.top
}

// World point → screen. Konva callers reached for getAbsoluteTransform().point(); this is the
// same thing and is what the endpoint handles in selection.js run on.
export function worldToScreen(point) {
    return mirror_pivot.toGlobal(point)
}

// === Interaction gating ===
// Konva's stage.draggable() panned for free, and layer.listening() silenced a whole layer.
// Pixi has neither, so panning lives in the pointer machine (see canvas-pixi/pointer.js) and
// this records what the active tool wants; `eventMode: 'none'` is the listening equivalent.
let stage_draggable = false

export function setStageDraggable(draggable) {
    stage_draggable = !!draggable
}

export function isStageDraggable() {
    return stage_draggable
}

export function setLayersListening({ shape, card, board, accessory } = {}) {
    if (band_shape     && shape     !== undefined) band_shape.eventMode     = shape     ? 'passive' : 'none'
    if (band_card      && card      !== undefined) band_card.eventMode      = card      ? 'passive' : 'none'
    if (band_accessory && accessory !== undefined) band_accessory.eventMode = accessory ? 'passive' : 'none'

    // The board band is the one a player can also silence by hand, so the tool's answer is
    // recorded rather than applied and applyPlaymatState settles the two — as in the original.
    if (board !== undefined) {
        board_listening = board
        applyPlaymatState()
    }
}

// === Playmats ===
// Hide and lock, applied to the board BAND rather than to each mat, so a mat dealt after the
// toggle inherits the state. Local view state, like zoom — none of it crosses the wire.
//
// Hide subsumes lock in Konva because it skips invisible subtrees when building a hit canvas.
// Pixi does the same: an invisible container is not hit-tested.
export const playmat_hidden = store(false)
export const playmat_locked = store(true)

let board_listening = true

function applyPlaymatState() {
    if (!band_board) return
    band_board.visible = !playmat_hidden.get()
    band_board.eventMode = (board_listening && !playmat_locked.get()) ? 'passive' : 'none'
}

export function setPlaymatHidden(value) {
    playmat_hidden.set(!!value)
    applyPlaymatState()
}

export function setPlaymatLocked(value) {
    playmat_locked.set(!!value)
    applyPlaymatState()
}

// === Mirror view ===
// "Sit at the opposite end of the table": positions are point-reflected through the world
// origin, but readable content stays upright for the viewer.
//
// Two cooperating transforms, exactly as in Konva:
//   1. the mirror container rotates π — this reflects every node's POSITION, and Pixi's hit
//      testing and getBounds account for it, so clicks and chrome stay glued to the content.
//   2. nodes that must read upright get a local counter-rotation, cancelling the container's
//      rotation for their own face while keeping the reflected position.
//
// So node.rotation is NOT the shared world value while mirrored — it is world + 180. Every
// sync or replay path goes through getWorldRotation / setWorldRotation, and node creation while
// mirrored calls mirrorNewNode. Positions are never touched: they stay canonical world coords,
// which is what keeps multiplayer oblivious to the mirror.
export const mirror_view = store(false)

// Pixi rotation is RADIANS; the wire format, every tool and both helpers below are DEGREES.
// Converted only here and in the two accessors, so no other file has to hold the distinction.
const DEG = Math.PI / 180

const UPRIGHT_NAMES = ['card', 'dice', 'counter', 'marker', 'text']

// The same question asked by NAME, for callers deciding how to create something and holding a
// category rather than a node — see accessory.js. One list, so the two can't drift.
export function nameKeepsUpright(name) {
    return UPRIGHT_NAMES.includes(name)
}

// Konva tagged nodes with space-separated `name`s and asked hasName(). Pixi has no such field,
// so nodes carry an explicit `kind` — which is also what lets multiplayer.js's 23 hasName calls
// become plain string comparisons.
function keepsUpright(node) {
    return UPRIGHT_NAMES.includes(node?.kind)
}

// Text-only: pair the counter-rotation with a pivot of the node's own box so it rotates in
// place rather than swinging around its corner. Must be re-applied when the text content (and
// thus width) changes.
//
// Konva needed `offset` here because its Text draws from the corner. A Pixi Text does too, so
// the fix is the same one, spelled `pivot`.
export function refreshMirrorTextOffset(node) {
    if (node?.kind !== 'text') return
    const on = mirror_view.get()
    node.pivot.set(on ? node.width : 0, on ? node.height : 0)
}

function counterRotate(node, on) {
    node.rotation += (on ? 180 : -180) * DEG
    refreshMirrorTextOffset(node)
}

// Read a node's canonical (shared/world) rotation, in degrees, regardless of mirror state.
export function getWorldRotation(node) {
    const raw = node.rotation / DEG - (mirror_view.get() && keepsUpright(node) ? 180 : 0)
    return ((raw % 360) + 360) % 360
}

// Write a canonical world rotation (degrees) onto a node, adding the counter-rotation if
// mirrored.
export function setWorldRotation(node, deg) {
    node.rotation = (deg + (mirror_view.get() && keepsUpright(node) ? 180 : 0)) * DEG
}

// Convert a freshly-created node (whose rotation was set from world values) into mirror-space.
// Every add* factory calls this last; no-op when the mirror is off.
export function mirrorNewNode(node) {
    if (!mirror_view.get() || !node || !keepsUpright(node)) return
    counterRotate(node, true)
}

// The transform itself, with no state guard. Split out because a scene built while the stored
// preference is already `true` still needs bringing into mirror-space — setMirror would
// correctly refuse, since the store says true while the fresh containers are unrotated.
function applyMirror(value) {
    if (!mirror_pivot) return
    mirror_pivot.rotation = value ? 180 * DEG : 0
    for (const band of [band_board, band_shape, band_card, band_accessory]) {
        if (!band) continue
        for (const node of band.children) {
            if (keepsUpright(node)) counterRotate(node, value)
        }
    }
}

export function setMirror(value) {
    value = !!value
    if (mirror_view.get() === value) return  // idempotent — a double-apply would skew by 360
    mirror_view.set(value)
    applyMirror(value)
    centerStage()
}

export function toggleMirror() {
    setMirror(!mirror_view.get())
}

// === Camera ===

// The world as it stands: one stage per facing pair. Read from the seat list rather than pushed
// in, because the seat count is the only input and seats.js has no dependency on this module —
// the arrow runs canvas → seats, and chip.js already relies on that.
function worldBounds() {
    return worldRect(seats.get()?.length ?? 1)
}

// The floor is now "the whole world is on screen" rather than "the dots have run out". With one
// pair that is exactly fit-to-stage, so a two-player table cannot be zoomed out past its own
// frame; with four pairs it opens up to an overview of all of them. That seat-count dependence
// is the point — the constraint should loosen only when there is genuinely more to look at.
function minScale() {
    if (!app) return 0
    const world = worldBounds()
    return Math.min(app.screen.width / world.width, app.screen.height / world.height)
}

// === Camera bounds ===
// The arithmetic is in stage.js, where it can be tested without a renderer; this is the part
// that knows what a camera and a viewport are.
function cameraBounds() {
    const world = worldBounds()
    const s = camera.scale.x
    return {
        x: cameraInterval(app.screen.width, world.x, world.width, s),
        y: cameraInterval(app.screen.height, world.y, world.height, s),
    }
}

// Maps a wanted position to a shown one. `elastic` is what tells a drag apart from everything
// else: a pointer drag has a release to spring back from, so it may pull past the edge, while a
// wheel or a zoom has no such moment and would simply stick there.
function withinBounds(value, bound, viewport, elastic) {
    if (value >= bound.min && value <= bound.max) return value
    const edge = value < bound.min ? bound.min : bound.max
    if (!elastic) return edge
    return edge + rubberBand(value - edge, viewport)
}

// Where the drag has ASKED the camera to be, before the band is applied — null whenever no
// elastic gesture is in flight.
//
// This has to be tracked, and it is the whole difficulty of a rubber band. The curve maps how
// far past the edge the gesture has reached, so it must be fed the raw distance; feeding it a
// position it has already curved compounds, and compounding does not merely look wrong, it makes
// the band depend on the SPEED of the drag rather than its distance. Applied per-delta the
// travel converges on a fixed point of resist(x + delta) = x — about 180px for a 200px-a-frame
// drag against a 1280 viewport, when the curve's own limit is 704 — so a flick and a slow pull
// covering identical ground end up in different places.
let pan_raw = null

function applyCameraBounds({ elastic = false } = {}) {
    if (!app || !camera) return
    const bound = cameraBounds()
    camera.position.set(
        withinBounds(camera.position.x, bound.x, app.screen.width, elastic),
        withinBounds(camera.position.y, bound.y, app.screen.height, elastic),
    )
    syncEdge()
}

// The whole world judders while the ground stays put.
//
// camera is the right thing to move: it holds the grid, the surface, the pieces and the seat
// boxes, while layer_edge (the ground beyond the world) and layer_ui (the selection chrome) are
// its siblings outside. So the table visibly hits something that does not move with it, which is
// most of why this reads as a limit rather than as a glitch.
//
// Deliberately does NOT call syncEdge: the backdrop is anchored to camera.position, so syncing it
// would carry the ground along and there would be nothing to shake against.
function shakeTable() {
    if (!camera || shake_anim) return
    if (Date.now() - shake_ended_at < SHAKE_COOLDOWN_MS) return
    if (prefersReducedMotion()) return

    shake_base = { x: camera.position.x, y: camera.position.y }
    const base = shake_base

    shake_anim = animate(0, 1, {
        duration: SHAKE_SECONDS,
        ease: 'linear',
        onUpdate(t) {
            if (!camera) return stopShake({ restore: false })
            // Linear ease because the decay IS the shape — handing Motion a curve as well
            // would ease an easing.
            camera.position.set(base.x + shakeOffset(t, SHAKE_PX), base.y)
        },
        onComplete() {
            shake_anim = null
            shake_ended_at = Date.now()
            camera?.position.set(base.x, base.y)
            shake_base = null
        },
    })
}

// Anything that moves the camera on purpose puts the shake back where it found it first, so the
// offset of an interrupted shake is never inherited as if it were a real position.
function stopShake({ restore = true } = {}) {
    if (!shake_anim) return
    shake_anim.stop?.()
    shake_anim = null
    shake_ended_at = Date.now()
    if (restore && camera && shake_base) camera.position.set(shake_base.x, shake_base.y)
    shake_base = null
}

// Matched to the same query tactility honours, inlined rather than imported so this module keeps
// its one-way dependency on nothing.
function prefersReducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function stopSettle() {
    settle_anim?.stop?.()
    settle_anim = null
}

// Let go, and the camera falls back inside the world.
//
// One scalar timeline driving both axes rather than a spring each, for the same reason the card
// poses use one: two springs over the same gesture drift apart, and a diagonal overscroll should
// come back along the line it went out on.
export function settleCamera() {
    if (!app || !camera) return
    stopSettle()
    stopShake()
    pan_raw = null

    const bound = cameraBounds()
    const from = { x: camera.position.x, y: camera.position.y }
    const to = {
        x: Math.min(bound.x.max, Math.max(bound.x.min, from.x)),
        y: Math.min(bound.y.max, Math.max(bound.y.min, from.y)),
    }
    if (from.x === to.x && from.y === to.y) return

    settle_anim = animate(0, 1, {
        ...SETTLE_SPRING,
        onUpdate(t) {
            if (!camera) return stopSettle()
            camera.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
            syncEdge()
        },
        onComplete() {
            settle_anim = null
            camera?.position.set(to.x, to.y)
            syncEdge()
        },
    })
}

// Multiplies the current scale by `factor`, keeping the world point under `anchorPos` (canvas
// pixel coords) fixed on screen. Continuous variant used by trackpad pinch.
export function zoomStageBy(factor, anchorPos = null) {
    if (!app) return

    const anchor = anchorPos || { x: app.screen.width / 2, y: app.screen.height / 2 }
    const before = camera.toLocal(anchor)

    const wanted = camera.scale.x * factor
    const next = Math.max(minScale(), Math.min(10, wanted))

    // Refused. Both ends: the floor is the whole world on screen and the ceiling is as close as
    // the table goes, and "that is as far as it goes" is one fact whichever end you meet it at.
    // Not stopping the running shake first — a wheel held against the limit should not restart
    // it thirty times a second, and shakeTable's own guard is what makes repeating harmless.
    if (next === camera.scale.x) {
        if (wanted !== next) shakeTable()
        return
    }

    stopShake()
    camera.scale.set(next)
    notifyScale()

    // Re-measure after the scale rather than solving for the position: toLocal already knows
    // the whole chain, so the correction is the difference between the two readings.
    const after = camera.toLocal(anchor)
    camera.position.set(
        camera.position.x + (after.x - before.x) * next,
        camera.position.y + (after.y - before.y) * next,
    )

    // Zooming out at the edge would otherwise walk the view off the world: the anchor correction
    // is about keeping a point still, and says nothing about where that leaves the bounds.
    stopSettle()
    pan_raw = null
    applyCameraBounds()
}

export function zoomStage(direction, anchorPos = null) {
    zoomStageBy(direction > 0 ? 1.25 : 1 / 1.25, anchorPos)
}

// Pans by a screen-pixel delta.
//
// `elastic` says the caller is a pointer drag, which is the one path that may pull past the
// world's edge — it has a release to spring back from (settleCamera, called on pointerup). The
// wheel and trackpad go through the same function without it and are simply clamped, because
// there is no moment in a scroll at which a spring-back would be anything but a fight.
export function panStageBy(dx, dy, { elastic = false } = {}) {
    if (!camera || !app) return
    stopSettle()
    stopShake()

    if (!elastic) {
        pan_raw = null
        camera.position.set(camera.position.x - dx, camera.position.y - dy)
        applyCameraBounds()
        return
    }

    // The gesture accumulates against its own unresisted position, and the band is applied to
    // that each frame rather than to what it produced last frame.
    pan_raw ??= { x: camera.position.x, y: camera.position.y }
    pan_raw.x -= dx
    pan_raw.y -= dy

    const bound = cameraBounds()
    camera.position.set(
        withinBounds(pan_raw.x, bound.x, app.screen.width, true),
        withinBounds(pan_raw.y, bound.y, app.screen.height, true),
    )
    syncEdge()
}

// === Screen-space strokes ===
// Konva shapes carry strokeScaleEnabled: false, so a 2px outline on a world-space box stayed a
// 2px outline at any zoom. Pixi has no such flag — a stroke is geometry and geometry scales —
// so anything that wants a hairline has to divide by the camera scale and redraw when the zoom
// changes. The selection chrome sidesteps this by living outside the camera; the seat chips
// cannot, because they sit at world anchors. This is how they hear about it.
const scale_listeners = new Set()

export function onCameraScale(listener) {
    scale_listeners.add(listener)
    return () => scale_listeners.delete(listener)
}

function notifyScale() {
    for (const listener of scale_listeners) {
        try { listener(camera.scale.x) } catch (e) { console.error('camera scale listener error', e) }
    }
}

// === Home point ===
// Where "centred" is. The world origin until something says otherwise, and thereafter the
// active seat's chip — so a resize, a mirror flip and sitting down somewhere else all return to
// the same place. Held here rather than read from the seat model, for the same reason
// mirror_view is: this module is render state and knows nothing about seats.
let home_point = { x: 0, y: 0 }

export function setHomePoint(point) {
    const x = Number(point?.x)
    const y = Number(point?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    home_point = { x, y }
}

// Puts a world point back under the middle of the viewport at the current zoom. This is the
// view every session opens on, and where a resize returns you to.
//
// Konva had to reflect the point by hand when mirrored. Here the point is mapped through the
// mirror container itself, so the reflection is the transform's business rather than this
// function's.
export function centerStage(point = home_point) {
    if (!app || !camera) return
    // Where that world point currently lands on screen, mirror and zoom included, then shift
    // the camera by whatever is left over. Konva had to reflect the point by hand here; asking
    // the transform chain where it actually is means neither the mirror nor the zoom is this
    // function's business.
    const at = mirror_pivot.toGlobal({ x: point.x, y: point.y })
    camera.position.set(
        camera.position.x + (app.screen.width  / 2 - at.x),
        camera.position.y + (app.screen.height / 2 - at.y),
    )
    stopSettle()
    applyCameraBounds()
}

// === Lifecycle ===

// Pixi's Application.init is async, so every caller of initScene must await it — the one shape
// change the port forces on view/table/index.vue's onMounted.
export async function initScene(container) {
    stage_container = container

    app = new Application()
    await app.init({
        resizeTo: container,
        background: toPixiColor(theme().table.surface),
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        preference: 'webgl',
    })
    container.appendChild(app.canvas)

    // The stage must be interactive for globalpointermove to fire at all, and needs a hit area
    // or nothing outside a child's bounds registers. Konva's stage is listening by construction
    // and its container is the hit area.
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen

    camera = new Container()
    app.stage.addChild(camera)

    layer_bg = new Container()
    layer_bg.eventMode = 'none'
    camera.addChild(layer_bg)

    mirror_pivot = new Container()
    camera.addChild(mirror_pivot)

    layer_table = new Container()   // boards (playmats) below rects/text
    layer_piece = new Container()   // cards below dice/markers/arrows
    mirror_pivot.addChild(layer_table, layer_piece)

    band_board     = new Container()
    band_shape     = new Container()
    band_card      = new Container()
    band_accessory = new Container()
    layer_table.addChild(band_board, band_shape)
    layer_piece.addChild(band_card, band_accessory)

    // Seat chips: above every element, inside the camera and the mirror.
    //
    // Konva put these on its ui layer, which worked because a Konva Layer is a stage child and
    // so carried the stage's pan and zoom. Here layer_ui sits OUTSIDE the camera — that is the
    // whole reason selection.js's coordinate mapping collapses — so a chip on it would be
    // pinned to the screen instead of to the table. They get their own band instead, which says
    // what was always meant: draw above everything, move with the table.
    band_chip = new Container()
    mirror_pivot.addChild(band_chip)

    // Effects: what happens ON the table but is not a thing on it — currently the puff a
    // deleted object leaves behind (see canvas-pixi/poof.js).
    //
    // Inside the camera and the mirror, above every band, and never touched by
    // clearAllElements. In the camera because an effect marks a PLACE on the table and has to
    // pan and zoom with it; above the bands because a puff covering the thing it replaced is
    // the entire point; outside the four element bands because it is not an element and a wipe
    // that took it with it would blank the very animation the wipe just caused.
    band_fx = new Container()
    band_fx.eventMode = 'none'
    mirror_pivot.addChild(band_fx)

    // Screen space, and OUTSIDE the camera — the difference that collapses selection.js's
    // coordinate mapping to the identity.
    layer_ui = new Container()
    app.stage.addChild(layer_ui)

    buildEdge()
    drawGridBackground()
    refreshWorldSurface()
    refreshWorldEdge()

    // The seat watcher may have set the perspective and the home point before the scene existed
    // (it runs immediately, during setup, while init happens on mount). Apply whatever it
    // decided. The bands are empty here, so this only rotates the container; nodes added
    // afterwards pick the mirror up via mirrorNewNode.
    applyMirror(mirror_view.get())

    board_listening = true
    applyPlaymatState()

    // Konva's stage did not track its container, so the original grew a ResizeObserver. Pixi's
    // `resizeTo` handles the canvas itself — but it does NOT tell us when it happened, and the
    // opening fit, the min-zoom floor and the recentre all need to know. So the observer stays,
    // doing the half Pixi does not.
    _resizeObserver = new ResizeObserver(handleResize)
    _resizeObserver.observe(container)

    _opening_pending = !(app.screen.width && app.screen.height)
    if (!_opening_pending) applyOpeningView()

    return { app, layers: getLayers() }
}

// A handle onto the live scene, for looking at the running table from outside it: a console, a test,
// a debug overlay. `shake` is a getter rather than a snapshot, so the refusal animation can be
// stepped by hand in a tab that never advances rAF. Where it goes is the host's call — ptcg's
// UI puts it on window in development (its simulator/index.vue).
export function inspectScene() {
    return { app, camera, mirror: mirror_pivot, layers: getLayers(), shake: () => shake_anim }
}

export function destroyScene() {
    _resizeObserver?.disconnect()
    _resizeObserver = null
    if (_resizeFrame) cancelAnimationFrame(_resizeFrame)
    _resizeFrame = null

    // Before destroy: the ticker goes with the app, but syncEdge reads `camera` and a frame
    // already queued would find it null.
    app?.ticker?.remove(syncEdge)
    stopSettle()
    stopShake({ restore: false })

    app?.destroy(true, { children: true, texture: false })
    app = null
    stage_container = null
    camera = mirror_pivot = null
    layer_bg = layer_table = layer_piece = layer_ui = null
    band_board = band_shape = band_card = band_accessory = band_chip = null
    band_fx = null
    grid_sprite = divider_gfx = surface_gfx = surface_tile = null
    layer_edge = edge_fill = edge_tile = null
    pan_raw = null
    scale_listeners.clear()
}

// === Resize ===
let _resizeFrame = null
let _resizeObserver = null
let _opening_pending = false

function handleResize() {
    if (_resizeFrame) return
    _resizeFrame = requestAnimationFrame(() => {
        _resizeFrame = null
        if (!app || !stage_container) return

        // Zero means the container is hidden, not that it collapsed: ResizeObserver reports
        // 0 × 0 whenever an ancestor goes display:none. Sizing to it would drop the canvas to
        // nothing for a measurement that was never real.
        if (!stage_container.clientWidth || !stage_container.clientHeight) return

        if (_opening_pending) {
            _opening_pending = false
            applyOpeningView()
            return
        }

        // Min zoom is derived from the viewport, so growing the window can leave the current
        // scale below the new floor — zoomed out past where the grid stops drawing.
        refreshWorldDecor()
        refreshWorldSurface()
        refreshWorldEdge()

        const floor = minScale()
        if (camera.scale.x < floor) {
            camera.scale.set(floor)
            notifyScale()
        }

        // Recentre rather than trying to preserve the pan, for the reason the original gives:
        // every "keep what you were looking at" rule has to pick an anchor, and snapping back
        // is the one view the player can predict.
        centerStage()
    })
}

// The scale the table opens at: the largest that still shows the whole STAGE — one facing pair,
// which is the frame every game is designed into — never above INITIAL_SCALE_MAX. Only ever
// consulted when the scene is built; a resize recentres but leaves the scale alone, so refitting
// never undoes a zoom the player chose.
function initialScale() {
    const width = app?.screen.width ?? 0
    const height = app?.screen.height ?? 0
    if (!width || !height) return INITIAL_SCALE_MAX
    const stage = stageSize()
    return Math.min(INITIAL_SCALE_MAX, width / stage.width, height / stage.height)
}

function applyOpeningView() {
    camera.scale.set(Math.max(minScale(), initialScale()))
    notifyScale()
    centerStage()
}

// === Grid ===
// Konva drew this as one Rect with a repeating pattern fill, built from an offscreen canvas at
// 4× and scaled down so the dots stay crisp when zoomed in. The same cell is built here and
// handed to a TilingSprite, which owns the wrap.
//
// (Graphics().rect().fill({ texture }) is the closer-looking analogue and is the wrong road: a
// texture fill is already normalised to the shape's bounds and clamps rather than repeats.)
function drawGridBackground() {
    const cell = document.createElement('canvas')
    cell.width = GRID_SPACING * GRID_RESOLUTION
    cell.height = GRID_SPACING * GRID_RESOLUTION
    const ctx = cell.getContext('2d')
    ctx.fillStyle = theme().table.dots
    ctx.beginPath()
    ctx.arc(
        (GRID_SPACING / 2) * GRID_RESOLUTION,
        (GRID_SPACING / 2) * GRID_RESOLUTION,
        1 * GRID_RESOLUTION,
        0, Math.PI * 2,
    )
    ctx.fill()

    // The table's own surface, beneath the dots. It did not need to exist while the plane was
    // unbounded — the renderer cleared the whole canvas to this colour and that WAS the table.
    // Now that there is an outside, the inside has to be painted deliberately or the two would
    // be the same colour and the edge would be invisible.
    surface_gfx = new Graphics()
    layer_bg.addChild(surface_gfx)

    // The grain, between the flat colour and the dots. Empty until a game declares one, so a
    // game that declares nothing pays for an invisible sprite and nothing else.
    //
    // Above the fill because the colour is what shows through a texture with alpha in it —
    // which is what a subtle surface mostly is — and below the dots because the dots are the
    // table's own furniture rather than the game's art, and they have to stay legible over
    // whatever a game lays down.
    surface_tile = new TilingSprite({ texture: Texture.EMPTY, width: 1, height: 1 })
    surface_tile.visible = false
    layer_bg.addChild(surface_tile)

    grid_sprite = new TilingSprite({ texture: Texture.from(cell), width: 1, height: 1 })
    grid_sprite.tileScale.set(1 / GRID_RESOLUTION)
    layer_bg.addChild(grid_sprite)

    divider_gfx = new Graphics()
    layer_bg.addChild(divider_gfx)

    refreshWorldDecor()
}

// Size the surface, the dots and the seam to the world as it currently is. Re-run whenever the
// seat count changes, because a new pair widens the world by a whole stage — the decoration is
// the only thing that has to be told; every layout position is computed from its own anchor.
export function refreshWorldDecor() {
    if (!grid_sprite) return
    const world = worldBounds()

    surface_gfx.clear().rect(world.x, world.y, world.width, world.height).fill(toPixiColor(surfaceStyle().color))

    // Same trick as the dots below, for the same reason: a TilingSprite draws only inside its
    // own box, so setting the box to the world rect clips the pattern to the table with no mask
    // to maintain — and anchoring the tile to the world ORIGIN rather than to the sprite's
    // corner keeps the pattern still when the table grows a lane and the corner moves.
    surface_tile.position.set(world.x, world.y)
    surface_tile.width = world.width
    surface_tile.height = world.height
    surface_tile.tilePosition.set(-world.x, -world.y)

    // The clip IS the sizing: a TilingSprite draws only inside its own box, so setting it to the
    // world rect stops the dots exactly at the edge with no mask to maintain.
    grid_sprite.position.set(world.x, world.y)
    grid_sprite.width = world.width
    grid_sprite.height = world.height

    // Anchoring the pattern to the world ORIGIN rather than to the sprite's corner, which is
    // what tilePosition is for. It also retires GRID_OFFSET_Y: that constant existed to nudge
    // the dot rows so they straddled the divider evenly, and it had to be a magic number because
    // the phase depended on where ±GRID_RANGE happened to fall. Anchored to the origin the rows
    // land on ±half a cell either side of y = 0 by construction, which is what it was reaching
    // for — and the origin IS the divider.
    grid_sprite.tilePosition.set(-world.x, -world.y)

    drawCenterDivider(world.x, world.width)
}

// === Beyond the world ===
//
// Screen space, behind the camera, rather than a big rectangle inside it. The camera can be
// pulled about a viewport past the edge (see rubberBand), and at min zoom a viewport is the whole
// world — so an in-camera backdrop would have to be sized for the worst case and would still have
// a corner someone could find. A screen-sized layer cannot run out.
//
// The tiling still reads as world-locked because tilePosition is driven from the camera each
// frame: the texture is anchored to world coordinates, so the ground moves and scales with the
// table exactly as if it were painted on it. That is what gives the overscroll tug something to
// push against — pull past the edge and the ground slides, rather than a fixed wallpaper sitting
// there proving nothing moved.
function buildEdge() {
    layer_edge = new Container()
    layer_edge.eventMode = 'none'
    app.stage.addChildAt(layer_edge, 0)

    edge_fill = new Graphics()
    edge_tile = new TilingSprite({ texture: Texture.EMPTY, width: 1, height: 1 })
    edge_tile.visible = false
    layer_edge.addChild(edge_fill, edge_tile)
}

let surface_warned = ''

// Adopt the game's surface — the colour immediately, the grain when it arrives.
//
// The twin of refreshWorldEdge below, and split from refreshWorldDecor for the same reason that
// one is split from syncEdge: this ADOPTS an asset and that one places geometry. Decor is
// redrawn every time a seat joins, and re-issuing a texture load on each of those would be
// asking Assets for a cached promise several times a hand for no reason.
export function refreshWorldSurface() {
    if (!surface_tile || surface_tile.destroyed) return
    const { img, scale, alpha, tint } = surfaceStyle()

    // The colour lives on surface_gfx, which refreshWorldDecor paints — so a config carrying a
    // colour and no image needs nothing more than this.
    refreshWorldDecor()

    // Applied before the load rather than after, so a config that only changes the treatment —
    // dimming a wood that was too bright — takes effect on this frame instead of waiting on a
    // texture Assets already has.
    surface_tile.alpha = alpha
    surface_tile.tint = tint

    const url = surfaceTextureUrl(img)
    if (!url) {
        surface_tile.visible = false
        return
    }

    Assets.load(url).then((texture) => {
        if (!surface_tile || surface_tile.destroyed) return
        surface_tile.texture = texture
        // One texture pixel to `scale` world units. The sprite sits inside the camera, so the
        // zoom is already in the chain and must not be applied again here — that is the whole
        // difference between this and the edge's tile, which is outside the camera and has to
        // put the camera back in by hand (see syncEdge).
        surface_tile.tileScale.set(scale, scale)
        surface_tile.visible = true
    }).catch((err) => {
        // The colour is already down, so this degrades to the flat table rather than to a hole.
        // Said out loud once per URL, for the reason the edge's twin gives.
        if (surface_warned === url) return
        surface_warned = url
        console.error(`[canvas] table surface art failed to load: ${url}`, err)
    })
}

let edge_warned = ''

// Adopt the game's edge — colour now, image when it arrives. Called from the same place the
// stage geometry is adopted, so a game that declares neither never waits on anything.
export function refreshWorldEdge() {
    if (!layer_edge) return
    const { color, img } = edgeStyle()

    edge_fill.clear().rect(0, 0, app.screen.width, app.screen.height).fill(toPixiColor(color))
    syncEdge()

    if (!img) {
        edge_tile.visible = false
        return
    }

    const url = assetUrl(img)
    Assets.load(url).then((texture) => {
        if (!edge_tile || edge_tile.destroyed) return
        edge_tile.texture = texture
        edge_tile.visible = true
    }).catch((err) => {
        // The colour is already painted, so this degrades to a plain surround rather than to a
        // hole. Still worth saying out loud: a silent catch here is how the accessory art went
        // missing for a day. Once per URL.
        if (edge_warned === url) return
        edge_warned = url
        console.error(`[canvas] world edge art failed to load: ${url}`, err)
    })
}

// Called from wherever the camera or the viewport moves, rather than from the ticker.
//
// The ticker was the first version and it is the obvious one — but it made the backdrop's
// correctness depend on a frame having run, which is a needless race: every one of these values
// is a pure function of the camera, so it can simply be written when the camera is written. It
// also means the ground is right in the same frame the pan happens rather than the one after,
// which matters at the edge, where the ground sliding IS the feedback.
function syncEdge() {
    if (!layer_edge || !app || !camera) return

    edge_tile.width = app.screen.width
    edge_tile.height = app.screen.height

    // World-locked: a world point w lands at camera.position + w · scale, so sampling the texture
    // at w means offsetting the pattern by exactly the camera's position.
    edge_tile.tileScale.set(camera.scale.x, camera.scale.y)
    edge_tile.tilePosition.set(camera.position.x, camera.position.y)
}

// The halfway line of the bartop — where the two ends of the table meet. On the bg layer, the
// one layer the mirror never rotates, so the divide stays put and reads the same from either
// side. Two bands, straddling y = 0: a dark rule for the seam and a light one beneath it for
// the lip catching the light. World-space thickness, so it scales with the table like the dots.
function drawCenterDivider(left, width) {
    divider_gfx
        .clear()
        .rect(left, -DIVIDER_DARK_H, width, DIVIDER_DARK_H)
        .fill(toPixiColor(theme().table.seam.dark))
        .rect(left, 0, width, DIVIDER_LIGHT_H)
        .fill({ color: toPixiColor(theme().table.seam.light), alpha: 0.08 })
}
