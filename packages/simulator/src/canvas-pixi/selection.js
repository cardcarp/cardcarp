// view/table/canvas/selection.js, ported to Pixi. Same public surface, same behaviours, same
// section order — so the diff between the two files IS the answer to "how bad does it get".
//
// === The headline ===
//
// Konva.Transformer was doing four jobs at once, and only here does that become obvious:
//
//   1. holding the selection      — transformer.nodes() is what delete, moveZ, align, the
//                                   toolbar and multiplayer all read the selection from
//   2. drawing the box            — border, 8 anchors, per-anchor enable
//   3. running the resize gesture — grab an anchor, drag, scale the whole set about the
//                                   opposite corner, with an optional aspect lock
//   4. the interior drag target   — shouldOverdrawWholeArea, so dragging inside the box moves
//                                   the selection even where there is nothing under the cursor
//
// Job 1 splits off cleanly and comes out BETTER: a plain array is the honest model, and the
// whole pruneSelection dance — which exists only because Konva keeps destroyed nodes in a
// Transformer and reports zIndex 0 for them — stops being necessary. It is kept below anyway,
// because peers still delete out from under you; it just no longer guards a renderer bug.
//
// Jobs 2, 3 and 4 are the cost, and they are written out longhand here. About 200 lines that
// were previously four constructor options.
//
// === What else did not survive the crossing ===
//
//   - shadowBlur. Konva's piece chrome was a lit edge plus a cast shadow, two Rects with
//     shadowColor/shadowBlur/shadowOpacity. Pixi core has no shadow, and the answer turned out
//     not to be replacing it: chrome should say what is SELECTED, crisply, and the depth it was
//     reaching for belongs on the card as the shadow it casts when picked up (see
//     canvas-pixi/tactility.js). One statement each, instead of one soft ring making neither.
//   - strokeScaleEnabled: false. Free here — the ui layer is unscaled, so anything drawn in it
//     is already screen-space. This one is a genuine win.
//   - hitStrokeWidth. Konva will hit-test a stroke; Pixi will not test a line at all, so the
//     arrow carries a hand-written distance function (see tools/arrow.js).
//   - layer-level drag events. Konva bubbles dragstart/dragmove/dragend to the layer, which is
//     how the original hooks "something moved" without knowing what. pointer.js calls in
//     instead, and publishes the same signal for multiplayer.js.
//
// === What got easier ===
//
// localRect and the whole "screen space → the ui layer's own space" apparatus. In Konva the ui
// layer is a SIBLING of the element layers and the mirror puts a 180° rotation on the element
// layers only, so every measured rect has to be mapped across — and getClientRect's `relativeTo`
// is a trap that silently returns stage coordinates. Here the camera is a container, the ui
// layer sits unscaled at the stage root, and screen space IS the ui layer's space. The mapping
// below is kept and correct, but it is the identity today, and the trap does not exist.

// === Measured ===
//
//   konva selection.js   823 lines, 461 excluding comments
//   pixi  selection.js   ~830 lines, ~520 excluding comments
//   of which the transform box (Transformer's jobs 2-4)   ~140 lines that did not exist before
//
// So the file is not much bigger — but that flatters it, because ~140 lines of NEW machinery
// are offset by things that got shorter or disappeared: localRect collapsing to the identity,
// strokeScaleEnabled going away, pruneSelection no longer guarding a renderer bug, and the
// outlines becoming one Graphics instead of a Group rebuilt with destroyChildren. The honest
// reading is that the port trades ~140 lines of Konva configuration for ~140 lines of gesture
// code you now own and have to keep correct.
//
// It is also where the port's one real bug lived: the endpoint handles captured their index on
// the wrong side of the closure, so both ends of an arrow dragged end 0. Konva never had that
// bug available to write, because Konva owned the drag.
//
// The chrome itself now costs two strokes per object, where the first cut spent twenty-five
// faking a blur. That version measured 0.44 ms per drag frame with forty separate pieces
// selected — affordable, and still the wrong picture. Cheapness was never the argument for it.

import { Container, Graphics, Rectangle } from 'pixi.js'

// Stores
import { uiSelection } from '../store.js'

// Scene
import { getLayers, getStageScale, mirror_view } from './scene.js'
import { getToolForNode } from './tools/index.js'
import { screenRect, nodeBounds } from './node.js'
import { isTextEditing } from './tools/text.js'
import { withRestingPose } from './tactility.js'
import { beginSelectionDrag } from './pointer.js'
import { poofNodes } from './poof.js'
import { emitCanvasAction } from './observer.js'

// Look — every colour the chrome draws is the theme's `selection` (theme.js); the widths, alphas and
// radii below are the chrome's shape, and stay here.
import { theme } from '../theme.js'
import { toPixiColor } from './color.js'

// Local
let selected = []            // replaces transformer.nodes()
let select_rect = null
let is_transforming = false
let ui_timeout = null

// === Where the toolbar hangs ===
// Unchanged in substance from the Konva version: a pile's bounding box steps down on every
// draw, so the toolbar hangs off the base card the fan is laid out from instead. Ported as-is
// because none of it is renderer business — it is arithmetic on measured rects.
let toolbar_anchor = null   // { key, dx, dy } — offset from the base corner, in world units

// === Per-object outlines ===
let outlines = null

const OUTLINE_ALPHA = 0.9
const OUTLINE_WIDTH = 1

// === SELECTION STYLES ===
// The authored-vs-given rule is unchanged; see the original for why it is that rule and not
// "game object vs editor object". This file only dispatches on it, exactly as before.
// A piece's ring takes the theme's `selection.piece`, where an annotation's outline and box take
// `outline` and `box`. The two selections already differ in SHAPE; a theme that makes them differ
// in COLOUR as well is what makes the rule legible without anyone explaining it — one you can
// reshape, the other you can pick up — and it survives the case shape alone doesn't: a mixed
// selection, where boxes and halos are on screen together and have to be told apart at a glance.
const PIECE_EDGE_WIDTH = 2
// A dark hairline just outside the ring (`selection.separator`). Not a shadow — a separator. Card
// art runs to the edge and is often pale, and a bright ring laid straight onto pale art loses its
// outer boundary and reads as a smudge. One dark pixel gives the ring an edge to be crisp against.
const PIECE_SEPARATOR_ALPHA = 0.85
const PIECE_INFLATE = 2.5
const PIECE_RADIUS = 6

// === The landing plate ===
//
// While a piece is carried, its chrome stops being a ring drawn OVER the card and becomes a
// translucent footprint in the piece colour, drawn UNDER it — a child of the node, between the shadow and the
// face. It says one thing: this is where the card comes down when you let go.
//
// It also fixes a defect the ring had all along. Chrome is measured through withRestingPose,
// i.e. the card's box as it will LIE — but a held card is DRAWN lifted, scaled and raised. So
// the ring sat inside the card's own visual edge and cut across the art rather than bounding
// it. No screen-space ring can fix that: layer_ui is a sibling of the camera and always draws
// over the world, and a layer BELOW the camera would be hidden by the playmat. Inside the node,
// under the face, is the one position that is above the table and below the card.
//
// NOT inflated, and NOT following the lift. Both would break what it is for. The plate is the
// node's own footprint at its own untransformed pose — which is exactly where the card lands,
// because tactility only ever moves the FACE and never the node. Leaving the plate at rest
// while the face floats above it is what makes the card read as hovering over its landing spot
// rather than as a card with a border.
const PLATE_ALPHA = 0.35
const PLATE_RADIUS = 4

// === The discard hint ===
//
// Held out past the edge of the table, a selection turns the theme's discard colour.
//
// It is the same chrome, recoloured — not a second mark laid on top — because the question the
// chrome is already answering is "what am I holding, and what happens when I let go", and off
// the table the second half of that answer changes. A separate warning badge would leave the
// piece colour saying "this lands here" while something else said "this is destroyed", and the player
// would have to reconcile them mid-gesture.
//
// One colour for both styles, deliberately. The piece and annotation colours tell a piece from an
// annotation, which is a fact about the object; off the table the fact that matters is about the
// DROP, and it is the same fact for both. The discard colour is where those two vocabularies are
// allowed to collapse into one.
//
// === Instant, not eased ===
//
// This was a 120ms blend first, on the theory that a hard cut would strobe if a hand wavered on
// the boundary. That theory was wrong twice. The strobe it was guarding against does not happen
// now the edge is the edge rather than a band reaching back over the felt — you are on the
// table or off it, and crossing is a deliberate movement of the whole arm, not a tremor. And
// the cost was the thing that actually matters: a hundred and twenty milliseconds of the ring
// leaning toward the discard colour is a hundred and twenty milliseconds in which the player does not yet know
// what letting go will do. Chrome that answers "what happens if I release NOW" has to be
// correct on the frame the pointer arrives, because releasing on that frame is allowed.
//
// So it is a swap, and it lands on the next painted frame — the same frame that draws the
// pointer's own movement, since the drag's chrome refresh is already coalesced onto that rAF.
let discard_hint = false

// One of the theme's selection colours, as Pixi draws it.
function chrome(name) {
    return toPixiColor(theme().selection[name])
}

// Every colour the chrome draws goes through here, so there is exactly one place that knows
// what "about to be discarded" looks like.
function hinted(color) {
    return discard_hint ? chrome('discard') : color
}

// Driven by the drag (see pointer.js). Called on every pointer move while a drag runs, so it
// does nothing at all when the answer has not changed.
export function setDiscardHint(on) {
    on = !!on
    if (discard_hint === on) return
    discard_hint = on
    scheduleChromeRefresh()
}

function isPiece(node) {
    return getToolForNode(node)?.selection_style === 'piece'
}

function selectionHasPiece(nodes) {
    return nodes.some(isPiece)
}

function unionRect(a, b) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return {
        x,
        y,
        width: Math.max(a.x + a.width, b.x + b.width) - x,
        height: Math.max(a.y + a.height, b.y + b.height) - y,
    }
}

// Konva's getClientRect. Shared with every other geometry consumer — see node.js for why it
// measures the face rather than the node, and what went wrong when it did not.

// Screen-space rect → the outline container's own space. Identity today (see the header), but
// written out so it stays correct if the ui layer is ever given a transform of its own.
//
// All four corners then re-bound, for the same reason as the original: a rotation in the chain
// would put a single mapped corner on the wrong side of its own object.
function localRect(rect) {
    const t = outlines.worldTransform
    if (t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1 && t.tx === 0 && t.ty === 0) return rect
    const corners = [
        t.applyInverse({ x: rect.x, y: rect.y }),
        t.applyInverse({ x: rect.x + rect.width, y: rect.y }),
        t.applyInverse({ x: rect.x + rect.width, y: rect.y + rect.height }),
        t.applyInverse({ x: rect.x, y: rect.y + rect.height }),
    ]
    const xs = corners.map(p => p.x)
    const ys = corners.map(p => p.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

function refreshOutlines() {
    if (!outlines) return
    outlines.clear()

    if (selected.length === 0) return
    // An object edited by its ends is drawn entirely by its handles.
    if (endpointToolFor(selected)) return

    const boxes = new Map()
    for (const node of selected) {
        const key = node.groupId ?? node
        // At rest, not as drawn — a card mid-flutter would be ringed where it is leaving.
        const rect = localRect(withRestingPose(node, () => screenRect(node)))
        const seen = boxes.get(key)
        boxes.set(key, seen
            ? { rect: unionRect(seen.rect, rect), piece: seen.piece }
            : { rect, piece: isPiece(node) })
    }

    const unboxed = selectionHasPiece(selected)

    // A carried piece wears its plate instead of a ring; anything at rest gets the ring back.
    //
    // ONE plate per object, not per node. Per-node was the first attempt and it looked wrong on a
    // deck for three compounding reasons: the members are fanned, so their plates stepped instead
    // of forming an edge; sixty translucent fills stacked on each other multiply toward opaque;
    // and each plate is axis-aligned while its card lands with a degree of resting jitter, so the
    // steps did not even line up. One shape over the pile's whole landing area has none of that.
    const carried = is_transforming && !handle_dragging && !resize

    const objects = new Map()
    for (const node of selected) {
        if (!isPiece(node)) { hidePlate(node); continue }
        const key = node.groupId ?? node
        if (!objects.has(key)) objects.set(key, [])
        objects.get(key).push(node)
    }

    for (const members of objects.values()) {
        if (!carried) { members.forEach(hidePlate); continue }
        // Hosted on the BOTTOM member, not the top one. The plate is a footprint, so it has to
        // pass under every card in the pile; hosted on top it painted over the twenty-nine
        // fanned edges below it and read as a gold bar laid across the deck.
        const host = members.reduce((low, n) => (childIndex(n) < childIndex(low) ? n : low))
        for (const node of members) if (node !== host) hidePlate(node)
        showPlate(host, members)
    }

    for (const { rect, piece } of boxes.values()) {
        // A carried piece is already said by its plate, and saying it twice would put the ring
        // back over the card — the exact thing the plate exists to stop.
        if (piece) {
            if (!carried) addPieceChrome(rect)
        } else if (unboxed || boxes.size >= 2) {
            addAnnotationOutline(rect)
        }
    }
}

// Nodes currently wearing a plate, so one can be taken off a node that has since been dropped,
// deselected, or destroyed without walking the whole table to find it.
const plated = new Set()

function showPlate(node, members) {
    let plate = node._liftPlate
    if (!plate) {
        plate = new Graphics()
        plate.eventMode = 'none'
        plate.label = 'lift-plate'
        // Between the shadow (index 0 once tactility has worn one) and the face. Inserting at
        // the face's index puts it directly beneath the card and above anything below.
        node.addChildAt(plate, node.getChildIndex(node.face))
        node._liftPlate = plate
    }

    // Deliberately untransformed. The node's own pose IS the landing spot — tactility lifts the
    // FACE and never the node — so a plate that copied the face's lift would travel with the
    // card and mark nothing. Left at rest, it stays put beneath the floating card and shows the
    // place the card is about to occupy.
    //
    // Sized to the whole OBJECT: the union of every member's box, expressed in the host's own
    // space. Members share a parent and differ only by position, so the offset from host to
    // member is just the difference of their positions — no transform walking required.
    let box = null
    for (const member of members) {
        const b = nodeBounds(member)
        const dx = member.x - node.x
        const dy = member.y - node.y
        const at = { x: b.x + dx, y: b.y + dy, width: b.width, height: b.height }
        box = box ? unionRect(box, at) : at
    }

    plate.clear()
        .roundRect(box.x, box.y, box.width, box.height, PLATE_RADIUS)
        .fill({ color: hinted(chrome('piece')), alpha: PLATE_ALPHA })
    plate.visible = true
    plated.add(node)
}

function hidePlate(node) {
    if (!node._liftPlate) return
    node._liftPlate.visible = false
    plated.delete(node)
}

// Anything still wearing a plate that is no longer selected — a peer's delete, a snapshot wipe,
// a plain deselect mid-drag — loses it here rather than keeping a plate on the table.
function prunePlates() {
    if (plated.size === 0) return
    const held = new Set(selected)
    for (const node of [...plated]) {
        if (!held.has(node) || !node.parent) hidePlate(node)
    }
}

// === The hand's landing footprint ===
//
// The same mark as a carried card's plate, for the one drag that has no node to hang it on.
// A card being dragged out of the hand is a DOM element floating over the canvas; there is
// nothing on the table yet to wear a plate, and the player is aiming at a spot they cannot see
// the outline of. So the footprint is drawn free-standing, at the place addCard is going to put
// the card if they let go now.
//
// Deliberately the same colour, alpha and radius as the plate rather than a look of its own:
// they answer the identical question — "where does this land?" — and a second plate-ish shape
// with slightly different manners would read as a different kind of answer.
//
// Parented to layer_piece at index 0, so it passes under every card the way a plate does, and
// so it inherits the mirror. It is created once and hidden, not built and destroyed per drag.
let footprint = null

export function showDropFootprint(x, y, width, height) {
    const { piece } = getLayers()
    if (!piece) return

    // Rebuilt if it is missing, destroyed, or still parented to a PREVIOUS scene's layer —
    // destroyCanvas/initCanvas hands out a whole new tree, and a Graphics left pointing at the
    // old one would be drawn nowhere while reporting itself perfectly healthy.
    if (!footprint || footprint.destroyed || footprint.parent !== piece) {
        footprint = new Graphics()
        footprint.eventMode = 'none'
        footprint.label = 'drop-footprint'
        piece.addChildAt(footprint, 0)
    }

    // x/y is the card's CENTRE, matching addCard — the hand hands over the same point it is
    // about to place with, so the mark and the card cannot disagree.
    footprint.clear()
        .roundRect(x - width / 2, y - height / 2, width, height, PLATE_RADIUS)
        .fill({ color: chrome('piece'), alpha: PLATE_ALPHA })
    footprint.visible = true
}

export function hideDropFootprint() {
    if (footprint && !footprint.destroyed) footprint.visible = false
}

// One Graphics for all of them rather than a node each: Konva's outlines Group is rebuilt with
// destroyChildren() every refresh, which on a Pixi Container would churn objects at drag rate.
// A Graphics is cleared and re-issued instead, which is cheaper and is what the renderer wants.
function addAnnotationOutline(box) {
    outlines
        .rect(box.x, box.y, box.width, box.height)
        .stroke({ width: OUTLINE_WIDTH, color: hinted(chrome('outline')), alpha: OUTLINE_ALPHA })
}

// Held, not boxed — a crisp lit edge, and nothing else.
//
// The first cut of this faked a soft glow with twenty-four concentric strokes of falling alpha,
// because Pixi core has no shadow and the Konva original used shadowBlur. It was cheap enough to
// run and wrong to look at: a blurred ring around a card is mush at any zoom, it fights the
// card's art instead of bounding it, and where the alpha ramp ends it leaves a visible band.
// Selection chrome has one job — say exactly which pixels are picked up — and blur is the
// opposite of that.
//
// So: two strokes. A dark hairline for the ring to be crisp against, and the ring itself.
// Both screen-space, because the ui layer sits outside the camera, so this stays a 2px edge at
// every zoom instead of swelling into a border as you zoom in.
//
// The DEPTH the glow was reaching for is real now, and lives where it belongs: on the card, as
// the shadow tactility gives a lifted piece (see canvas-pixi/tactility.js). Chrome says what is
// selected; the card itself says how far off the table it is. Those are two different statements
// and drawing both with one soft ring said neither.
function addPieceChrome(box) {
    const x = box.x - PIECE_INFLATE
    const y = box.y - PIECE_INFLATE
    const w = box.width + PIECE_INFLATE * 2
    const h = box.height + PIECE_INFLATE * 2

    outlines
        .roundRect(x - 1, y - 1, w + 2, h + 2, PIECE_RADIUS + 1)
        .stroke({ width: 1, color: chrome('separator'), alpha: PIECE_SEPARATOR_ALPHA })

    outlines
        .roundRect(x, y, w, h, PIECE_RADIUS)
        .stroke({ width: PIECE_EDGE_WIDTH, color: hinted(chrome('piece')) })
}

// === Endpoint handles ===
// Same contract as the original: a tool may declare getEndpoints / moveEndpoint /
// commitEndpoints, and a lone selected node whose tool does gets one draggable handle per end
// and no box. The handles themselves are hand-rolled, since Pixi has no draggable.
const HANDLE_RADIUS = 6
const HANDLE_STROKE_WIDTH = 2

let handles = null
let handle_target = null
let handle_dragging = false

function endpointToolFor(nodes) {
    if (nodes.length !== 1) return null
    const tool = getToolForNode(nodes[0])
    return tool?.getEndpoints ? tool : null
}

function buildHandles(count) {
    handles.removeChildren().forEach(child => child.destroy())

    for (let index = 0; index < count; index++) {
        const handle = new Graphics()
            .circle(0, 0, HANDLE_RADIUS)
            .fill(toPixiColor(theme().selection.handle.fill))
            .stroke({ width: HANDLE_STROKE_WIDTH, color: toPixiColor(theme().selection.handle.stroke) })
        handle.eventMode = 'static'
        handle.cursor = 'pointer'
        handle.hitArea = new Rectangle(-HANDLE_RADIUS * 2, -HANDLE_RADIUS * 2, HANDLE_RADIUS * 4, HANDLE_RADIUS * 4)

        // Konva: draggable:true plus dragstart/dragmove/dragend. Here, three listeners and a
        // module-level flag, because the move and up have to be caught on the stage — a pointer
        // that leaves a 12px circle mid-drag would otherwise drop it.
        handle.on('pointerdown', (e) => {
            handle_dragging = true
            active_handle = index
            setTransforming(true)
            e.stopPropagation()
        })
        handles.addChild(handle)
    }
}

// The stage-level half of the handle drag. Bound once in initSelection rather than per handle,
// which is also how it stays correct when the pointer outruns the circle.
function onHandleMove(global) {
    if (!handle_dragging || !handle_target) return
    getToolForNode(handle_target)?.moveEndpoint?.(handle_target, active_handle, global)
    refreshHandles()
}

function onHandleUp() {
    if (!handle_dragging) return
    handle_dragging = false
    if (handle_target) getToolForNode(handle_target)?.commitEndpoints?.(handle_target)
    refreshHandles()
    setTransforming(false)
}

let active_handle = 0

function refreshHandles() {
    if (!handles) return
    const tool = endpointToolFor(selected)
    const points = tool?.getEndpoints(selected[0]) ?? null

    if (!points) {
        handle_target = null
        handles.visible = false
        return
    }

    if (handle_target !== selected[0] || handles.children.length !== points.length) {
        buildHandles(points.length)
        handle_target = selected[0]
    }

    // Hidden while the object is being MOVED, shown while an end is being dragged.
    //
    // The two are different gestures wearing the same flag. Dragging an arrow bodily is not an
    // operation on its ends, so two dots skidding along beside it are pure noise — they read as
    // something being manipulated when nothing is. Dragging one END is the opposite: the handle
    // under the cursor is the thing being manipulated, and the other one marks the pivot it is
    // turning about, so both earn their place.
    //
    // This is the same distinction the outlines already make against the toolbar (see
    // broadcastSelectionUI): chrome that is IN THE WAY of a gesture hides for it, chrome that is
    // THE SUBJECT of one does not.
    handles.visible = !is_transforming || handle_dragging

    // Screen space already (see localRect), and no per-handle rescale needed: the ui layer is
    // unscaled, so a handle is 6px at every zoom for free. Konva needs strokeScaleEnabled plus
    // an explicit radius / scale on every refresh to get the same thing.
    if (!handle_dragging) {
        handles.children.forEach((handle, index) => {
            handle.position.set(points[index].x, points[index].y)
        })
    }
}

// === The transform box ===
// Konva.Transformer's jobs 2, 3 and 4. This is the part of the port that is simply gone and
// has to be rebuilt.
const ANCHORS = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right',
]
const CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const ANCHOR_SIZE = 8
const BORDER_WIDTH = 3

let box_border = null      // the border + anchors, drawn
let box_hits = null        // one invisible hit target per anchor, plus the interior overdraw
let enabled_anchors = ANCHORS
let border_enabled = true
let resize = null          // { anchor, fixed, box, nodes: [{node, screen, scale}] }

// Where each anchor sits on a box.
function anchorPoint(box, name) {
    const [row, col] = name.split('-')
    const x = col === 'left' ? box.x : col === 'right' ? box.x + box.width : box.x + box.width / 2
    const y = row === 'top' ? box.y : row === 'bottom' ? box.y + box.height : box.y + box.height / 2
    return { x, y }
}

// The point that stays put while an anchor is dragged: the one diagonally opposite.
function oppositePoint(box, name) {
    const [row, col] = name.split('-')
    const flip = { left: 'right', right: 'left', top: 'bottom', bottom: 'top', center: 'center', middle: 'middle' }
    return anchorPoint(box, `${flip[row]}-${flip[col]}`)
}

function selectionBox() {
    if (selected.length === 0) return null
    return selected
        .map(n => localRect(withRestingPose(n, () => screenRect(n))))
        .reduce(unionRect)
}

function refreshTransformBox() {
    if (!box_border) return
    box_border.clear()
    for (const hit of box_hits.children) hit.visible = false

    if (selected.length === 0 || !border_enabled) return
    const box = selectionBox()
    if (!box) return

    box_border.rect(box.x, box.y, box.width, box.height)
        .stroke({ width: BORDER_WIDTH, color: hinted(chrome('box')) })

    // shouldOverdrawWholeArea: the interior is a drag target, so dragging the middle of a
    // multi-node selection moves it even where there is nothing under the cursor.
    const overdraw = box_hits.children[0]
    overdraw.visible = true
    overdraw.position.set(box.x, box.y)
    overdraw.hitArea = new Rectangle(0, 0, box.width, box.height)

    enabled_anchors.forEach((name, i) => {
        const p = anchorPoint(box, name)
        box_border.rect(p.x - ANCHOR_SIZE / 2, p.y - ANCHOR_SIZE / 2, ANCHOR_SIZE, ANCHOR_SIZE)
            .fill(chrome('anchor'))
            .stroke({ width: 2, color: hinted(chrome('box')) })

        const hit = box_hits.children[i + 1]
        if (!hit) return
        hit.visible = true
        hit.position.set(p.x, p.y)
        hit.__anchor = name
    })
}

function buildBoxHits() {
    // One reusable pool: an interior overdraw plus one target per anchor. Rebuilding these per
    // refresh would allocate at drag rate.
    const overdraw = new Container()
    overdraw.eventMode = 'static'
    overdraw.cursor = 'move'
    overdraw.on('pointerdown', (e) => {
        if (selected.length === 0) return
        beginSelectionDrag(e)
        e.stopPropagation()
    })
    box_hits.addChild(overdraw)

    for (const name of ANCHORS) {
        const hit = new Container()
        hit.eventMode = 'static'
        hit.hitArea = new Rectangle(-ANCHOR_SIZE, -ANCHOR_SIZE, ANCHOR_SIZE * 2, ANCHOR_SIZE * 2)
        hit.cursor = 'nwse-resize'
        hit.on('pointerdown', (e) => {
            beginResize(hit.__anchor ?? name, e)
            e.stopPropagation()
        })
        box_hits.addChild(hit)
    }
}

function beginResize(anchor, e) {
    const box = selectionBox()
    if (!box) return
    resize = {
        anchor,
        fixed: oppositePoint(box, anchor),
        box,
        // Each node's screen position and current scale, captured once so every frame of the
        // drag is computed from the start state rather than compounding rounding.
        nodes: selected.map(node => ({
            node,
            screen: node.parent.toGlobal(node.position),
            scale: { x: node.scale.x, y: node.scale.y },
        })),
    }
    setTransforming(true)
}

function moveResize(global) {
    if (!resize) return
    const { anchor, fixed, box } = resize
    const [row, col] = anchor.split('-')

    let sx = col === 'center' ? 1 : (global.x - fixed.x) / ((anchorPoint(box, anchor).x - fixed.x) || 1)
    let sy = row === 'middle' ? 1 : (global.y - fixed.y) / ((anchorPoint(box, anchor).y - fixed.y) || 1)

    // keepRatio, for everything whose two axes are not independent. Konva: one boolean.
    if (requiresAspectLock(selected) && CORNER_ANCHORS.includes(anchor)) {
        const s = Math.max(Math.abs(sx), Math.abs(sy))
        sx = Math.sign(sx || 1) * s
        sy = Math.sign(sy || 1) * s
    }

    // A boundBoxFunc's job, done by hand: without a floor the box inverts through zero and the
    // selection turns inside out.
    if (!Number.isFinite(sx) || Math.abs(sx) < 0.05) sx = 0.05 * Math.sign(sx || 1)
    if (!Number.isFinite(sy) || Math.abs(sy) < 0.05) sy = 0.05 * Math.sign(sy || 1)

    for (const entry of resize.nodes) {
        const { node, screen, scale } = entry
        const nx = fixed.x + (screen.x - fixed.x) * sx
        const ny = fixed.y + (screen.y - fixed.y) * sy
        const local = node.parent.toLocal({ x: nx, y: ny })
        node.position.set(local.x, local.y)
        node.scale.set(scale.x * sx, scale.y * sy)
        node.resized?.()
    }
    refreshSelectionChrome()
}

// Konva's transformer emitted transformend at stage level, which is how multiplayer.js heard
// that a resize had finished without knowing what had been resized. Published explicitly here,
// for the same reason pointer.js publishes the drag.
const transform_listeners = new Set()

export function onTransformEnd(listener) {
    transform_listeners.add(listener)
    return () => transform_listeners.delete(listener)
}

function endResize() {
    if (!resize) return
    resize = null
    setTransforming(false)
    refreshSelectionChrome()
    for (const listener of transform_listeners) {
        try { listener() } catch (e) { console.error('transform listener error', e) }
    }
}

// Annotations only, now that pieces never reach here. Text and boards scale about their own box
// and have to keep their proportions; a rect is the one thing whose two axes are independent.
function requiresAspectLock(nodes) {
    // Text and boards scale about their own box and must keep their proportions; a rect is the
    // one thing left whose two axes are independent.
    return nodes.some(node => node.kind !== 'rect')
}

// Konva's updateTransformerAnchors: which anchors the box offers, or whether it draws at all.
export function updateTransformerAnchors() {
    if (selected.length === 0) return

    if (endpointToolFor(selected)) {
        enabled_anchors = []
        border_enabled = false
        return
    }
    // Any piece and the box goes away entirely. ANY rather than ALL, for the reason the
    // original gives: a mixed selection scales as one box, so a handle reaching a card is the
    // same nonsense operation whatever got picked up alongside it.
    if (selectionHasPiece(selected)) {
        enabled_anchors = []
        border_enabled = false
        return
    }

    border_enabled = true
    enabled_anchors = requiresAspectLock(selected) ? CORNER_ANCHORS : ANCHORS
}

function refreshSelectionChrome() {
    prunePlates()
    if (chrome_hidden) {
        for (const node of [...plated]) hidePlate(node)
        box_border?.clear()
        outlines?.clear()
        if (handles) handles.visible = false
        if (box_hits) for (const hit of box_hits.children) hit.visible = false
        return
    }
    updateTransformerAnchors()
    refreshTransformBox()
    refreshOutlines()
    refreshHandles()
}

// Dragging a multi-node selection re-measures every node. Coalescing onto a frame turns a
// per-node-per-frame storm back into one pass — same reason as the original, though here the
// storm is smaller because table.js drives one drag rather than Konva firing per node.
let chrome_raf = 0
export function scheduleChromeRefresh() {
    if (chrome_raf) return
    chrome_raf = requestAnimationFrame(() => {
        chrome_raf = 0
        refreshSelectionChrome()
    })
}

// === Remote-apply guard ===
// Unchanged. Nothing about it was ever renderer business.
let applying_remote = false

export function withRemoteApply(fn) {
    const prev = applying_remote
    applying_remote = true
    try { return fn() } finally { applying_remote = prev }
}

export function setSelection(nodes) {
    if (applying_remote) return false
    selected = [...nodes]
    refreshSelectionChrome()
    return true
}

export function getSelected() {
    return selected
}

// The original's note about Konva keeping destroyed nodes in a Transformer no longer applies —
// a plain array holds what it is given. Still needed, because a peer deleting out of the pile
// you are holding leaves a node with no parent either way.
export function pruneSelection() {
    const live = selected.filter(n => n.parent)
    if (live.length === selected.length) return
    selected = live
    broadcastSelectionUI(true)
}

export function dropFromSelection(match) {
    const kept = selected.filter(node => !match(node))
    if (kept.length === selected.length) return
    selected = kept
    broadcastSelectionUI(true)
}

export function getSelectRect() {
    return select_rect
}

// Konva's transformer.hide() / .show(), which the text tool uses to get its own chrome out of
// the way while the DOM edit overlay stands where the text is. The selection itself is
// untouched — this hides the drawing, not the holding.
let chrome_hidden = false

export function setChromeVisible(visible) {
    chrome_hidden = !visible
    refreshSelectionChrome()
}

export function setTransforming(value) {
    is_transforming = value
    broadcastSelectionUI()
}

// === Toolbar anchor ===
// Ported unchanged in substance: a pile's box steps down on every draw, so the toolbar hangs
// off the base card the fan is laid out from. zIndex() becomes the layer's own child order,
// which is what Konva's zIndex was reporting anyway.
function childIndex(node) {
    return node.parent ? node.parent.getChildIndex(node) : 0
}

function pileAnchorKey(nodes) {
    if (nodes.length === 0) return null
    let groupId = null
    for (const node of nodes) {
        if (node.kind !== 'card' || !node.groupId) return null
        if (groupId && node.groupId !== groupId) return null
        groupId = node.groupId
    }
    return `${groupId}|${mirror_view.get() ? 'mirror' : 'normal'}`
}

function baseCardCorner(nodes) {
    const base = mirror_view.get()
        ? nodes.reduce((held, node) => (childIndex(node) > childIndex(held) ? node : held))
        : nodes.reduce((held, node) => (childIndex(node) < childIndex(held) ? node : held))
    const rect = screenRect(base)
    return { x: rect.x, y: rect.y }
}

function toolbarAnchor(nodes, live) {
    const key = pileAnchorKey(nodes)
    if (!key) return live

    const corner = baseCardCorner(nodes)
    const scale = getStageScale() || 1

    if (toolbar_anchor?.key !== key) {
        toolbar_anchor = { key, dx: (live.x - corner.x) / scale, dy: (live.y - corner.y) / scale }
        return live
    }
    return { x: corner.x + toolbar_anchor.dx * scale, y: corner.y + toolbar_anchor.dy * scale }
}

// Lifecycle
export function initSelection() {
    const { ui } = getLayers()

    select_rect = new Graphics()
    ui.addChild(select_rect)

    // Between the marquee and the box: above the table, below the handles you grab.
    outlines = new Graphics()
    ui.addChild(outlines)

    box_border = new Graphics()
    ui.addChild(box_border)

    box_hits = new Container()
    ui.addChild(box_hits)
    buildBoxHits()

    // Above the box, so a press that lands on an endpoint grabs the handle rather than the
    // overdraw rect underneath it.
    handles = new Container()
    handles.visible = false
    ui.addChild(handles)

    // Konva's transformer emitted transformstart/transform/transformend and ran the gesture
    // itself. Here the gesture is ours, so the move and the up are handed in by the pointer
    // machine — see canvas-pixi/pointer.js, which is the single place a pointer is read.
}

// Driven by pointer.js: the resize gesture and the endpoint-handle drag both need the move and
// the up, and neither can own the pointer itself — a resize that let go the moment the cursor
// left an 8px anchor would be unusable.
export function onPointerMove(global) {
    if (resize) return moveResize(global)
    if (handle_dragging) return onHandleMove(global)
    return false
}

export function onPointerUp() {
    endResize()
    onHandleUp()
}

export function isGesturing() {
    return !!resize || handle_dragging
}

export function broadcastSelectionUI(immediate) {
    refreshSelectionChrome()

    if (ui_timeout) {
        clearTimeout(ui_timeout)
        ui_timeout = null
    }

    if (selected.length === 0 || is_transforming) {
        uiSelection.set({ type: null, units: 0, x: 0, y: 0 })
        return
    }

    const triggerShow = () => {
        if (is_transforming) return
        if (selected.length === 0) {
            uiSelection.set({ type: null, units: 0, x: 0, y: 0 })
            return
        }

        const rects = selected.map(n => screenRect(n))
        const minX = Math.min(...rects.map(r => r.x))
        const minY = Math.min(...rects.map(r => r.y))
        const maxX = Math.max(...rects.map(r => r.x + r.width))

        const units = selectionUnits(selected).length
        const rep = getToolbarRepresentative(selected)
        const tool = rep ? getToolForNode(rep) : null
        const claimed = !!tool

        const at = toolbarAnchor(selected, { x: (minX + maxX) / 2, y: minY })

        uiSelection.set({
            type: claimed ? tool.id : null,
            units,
            x: at.x,
            y: at.y,
            data: claimed ? (tool.selectionPayload?.(rep, selected) ?? {}) : {},
        })
    }

    if (immediate) triggerShow()
    else ui_timeout = setTimeout(triggerShow, 200)
}

function getToolbarRepresentative(nodes) {
    if (nodes.length === 0) return null
    if (nodes.length === 1) return nodes[0]
    if (!nodes.every(n => n.kind === 'card')) return null
    return nodes.reduce((top, c) => (childIndex(c) > childIndex(top) ? c : top))
}

// Every local delete funnels through here — the Delete key, the toolbar's bin, and the drag
// that lets go over the edge — which is what makes one call to poofNodes cover all three.
//
// The puff is raised BEFORE the destroy, because it is measured off the nodes: their boxes,
// their scales and their group ids all go with them. See poof.js.
export function selectionDelete() {
    if (selected.length === 0) return
    poofNodes(selected)
    selected.forEach(node => node.destroy())
    selected = []
    // Held out over the edge and released, the hint has done its job — and the next drag must
    // not start already red. Cleared here rather than in the drag so a delete by any route
    // leaves the same state behind.
    setDiscardHint(false)
    broadcastSelectionUI()
}

// The same delete, told to the room.
//
// The keyboard and the toolbar route through multiplayer.js's own selectionDelete, which
// broadcasts and then calls the canvas. A drag cannot: pointer.js is inside the canvas, and
// importing the wrapper would close the loop multiplayer.js → canvas → multiplayer.js. So it
// goes out on the observer bus instead, which is exactly what that bus is for — and lands on a
// `nodes:destroy` case multiplayer.js already handles.
export function discardSelection() {
    if (selected.length === 0) return
    const nodeIds = selected.map(n => n.nodeId).filter(Boolean)
    selectionDelete()
    if (nodeIds.length) emitCanvasAction({ op: 'nodes:destroy', nodeIds })
}

// === Z order ===
// Konva has moveUp / moveDown / moveToBottom on every node. Pixi has setChildIndex and the
// child order IS the z order, so each of the three is one line of index arithmetic — but they
// have to be written, and the sort-then-walk ordering rules from the original still apply for
// exactly the same reason.
export function applyMoveZ(nodes, direction) {
    if (!nodes || nodes.length === 0) return

    const sorted = [...nodes].sort((a, b) => childIndex(a) - childIndex(b))

    const moveTo = (node, index) => {
        const parent = node.parent
        if (!parent) return
        parent.setChildIndex(node, Math.max(0, Math.min(parent.children.length - 1, index)))
    }

    if (direction === 'bottom') {
        ;[...sorted].reverse().forEach(node => moveTo(node, 0))
    } else if (direction > 0) {
        sorted.reverse().forEach(node => moveTo(node, childIndex(node) + 1))
    } else {
        sorted.forEach(node => moveTo(node, childIndex(node) - 1))
    }
}

export function moveZ(direction) {
    // The bracket keys move z-order, and they are also two perfectly ordinary characters to
    // type. Block while the text overlay has focus, or writing "[2]" on a note reorders the
    // table behind it.
    if (isTextEditing()) return
    if (selected.length === 0) return
    applyMoveZ(selected, direction)
    scheduleChromeRefresh()
}

// === Alignment ===
// Ported unchanged. It was always arithmetic on screen-space rects plus a scale and a sign
// flip, and none of that was Konva's.
const ALIGN_EDGES = new Set(['left', 'centerX', 'right', 'top', 'middleY', 'bottom'])

export function selectionUnits(nodes) {
    const units = new Map()
    for (const node of nodes ?? []) {
        const key = node.groupId ?? node
        const rect = withRestingPose(node, () => screenRect(node))
        const seen = units.get(key)
        units.set(key, seen
            ? { nodes: [...seen.nodes, node], box: unionRect(seen.box, rect) }
            : { nodes: [node], box: rect })
    }
    return [...units.values()]
}

export function applyAlign(nodes, edge) {
    if (!ALIGN_EDGES.has(edge)) return []

    const units = selectionUnits(nodes)
    if (units.length < 2) return []

    const bounds = units.reduce((acc, unit) => unionRect(acc, unit.box), units[0].box)
    const scale = getStageScale() || 1
    const flip = mirror_view.get() ? -1 : 1
    const moved = []

    for (const unit of units) {
        const { box } = unit
        let dx = 0
        let dy = 0
        switch (edge) {
            case 'left':    dx = bounds.x - box.x; break
            case 'centerX': dx = (bounds.x + bounds.width / 2) - (box.x + box.width / 2); break
            case 'right':   dx = (bounds.x + bounds.width) - (box.x + box.width); break
            case 'top':     dy = bounds.y - box.y; break
            case 'middleY': dy = (bounds.y + bounds.height / 2) - (box.y + box.height / 2); break
            case 'bottom':  dy = (bounds.y + bounds.height) - (box.y + box.height); break
        }
        if (dx === 0 && dy === 0) continue

        const lx = (dx / scale) * flip
        const ly = (dy / scale) * flip
        for (const node of unit.nodes) {
            node.position.set(node.x + lx, node.y + ly)
            moved.push(node)
        }
    }

    if (moved.length) refreshSelectionChrome()
    return moved
}

export function alignSelection(edge) {
    if (selected.length === 0) return []
    return applyAlign(selected, edge)
}
