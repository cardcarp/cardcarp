// Everything that reads a pointer, in one place.
//
// Konva spread this across three mechanisms that never had to know about each other:
//
//   stage.draggable(true)   panned the table
//   node.draggable = true   moved a node, and bubbled dragstart/dragmove/dragend to its layer,
//                           which is how selection.js hooked "something is moving"
//   tools/select.js         marquee, click-to-select, shift-toggle
//
// Pixi has none of the three, so they arrive here together — and that turns out to be the right
// shape rather than a consolation. The three were always one question ("what did this press
// mean?"), and keeping them apart is what made the Konva version need `is_selecting` guards,
// `cancelSelecting` for the two-finger case, and a `dragDistance` on every node individually.
//
// === The workaround that becomes the rule ===
//
// Konva's transformer had shouldOverdrawWholeArea, so you could pick a selection up from
// anywhere inside its box. The cost, quoting the original: "the box then swallows every click
// aimed at whatever sits UNDER it, and for a playmat that box is most of the table: misclick
// the mat, and the decks standing on it become unclickable". tools/select.js carries three
// separate pieces of machinery to dig back out — a 'back'-named hit target, reselectUnderPointer,
// and topElementAt asking the element layers directly so it can see THROUGH the overdraw.
//
// Here the overdraw is ours. A press inside the selection box asks the element bands first and
// only falls back to the box when nothing is under the cursor, so the box never swallows a
// click it should not have. reselectUnderPointer and the 'back' dance do not port; the rule
// they were compensating for is simply written the other way round.

import { getApp, getContainer, getLayers, screenToWorld, isOverWorldEdge, isStageDraggable, panStageBy, zoomStageBy, settleCamera } from './scene.js'
import {
    getSelected, setSelection, getSelectRect, broadcastSelectionUI, setTransforming,
    scheduleChromeRefresh, onPointerMove as selectionMove, onPointerUp as selectionUp,
    isGesturing, setDiscardHint, discardSelection,
} from './selection.js'
import { getActiveTool, getToolForNode, expandToGroup } from './tools/index.js'
import { screenRect } from './node.js'
import { isTextEditing, isTextEditOpening } from './tools/text.js'
import { canvasPressActive, canvasDragDiscarded } from '../store.js'
import { tactileLift, tactileDrop, markLifted } from './tactility.js'
import { theme } from '../theme.js'
import { toPixiColor } from './color.js'

// How far a press may wander before it is a drag rather than a click. Konva spelled this
// `dragDistance` per node and defaulted it to 0, which starts a drag on the first pixel of
// finger tremor — see the card tool's note on why that also broke press-and-hold.
const DRAG_SLOP = 8

let drag = null
let band = null
let pan = null

// === Drag subscription ===
// Konva bubbled dragmove/dragend up to the stage, which is how multiplayer.js hooked the live
// drag stream without knowing what was moving. Nothing bubbles here, so the same signal is
// published explicitly. Two events, because those are the two the relay needs: a throttled
// stream while a drag runs, and one authoritative position when it stops.
const drag_listeners = new Set()

export function onDrag(listener) {
    drag_listeners.add(listener)
    return () => drag_listeners.delete(listener)
}

function emitDrag(phase) {
    for (const listener of drag_listeners) {
        try { listener(phase, drag?.nodes ?? []) } catch (e) { console.error('drag listener error', e) }
    }
}

// === Hit testing ===
// The topmost element under a point, asked of the element bands rather than the whole stage.
// Konva did the same, for the same reason: the stage would answer with the chrome on top.
//
// Pixi has no per-container getIntersection, so this walks the bands in draw order. Pieces
// (cards, accessories) sit above the table (boards, shapes), and within a band the child order
// is the draw order — so the walk is bands top-down, children last-to-first.
export function topElementAt(global) {
    const { card, accessory, shape, board } = getLayers()
    for (const bandContainer of [accessory, card, shape, board]) {
        if (!bandContainer || !bandContainer.visible || bandContainer.eventMode === 'none') continue
        const children = bandContainer.children
        for (let i = children.length - 1; i >= 0; i--) {
            const node = children[i]
            if (!node.visible) continue
            const local = node.toLocal(global)
            if (node.hitArea?.contains(local.x, local.y)) return node
        }
    }
    return null
}

// === Node drag ===
// Konva's `draggable: true`, written out. The three moments it used to bubble to the layer are
// the three calls into selection.js below.
export function beginSelectionDrag(e) {
    // Whatever the last drag was, this one has not been thrown away yet. Cleared here rather
    // than on release because the flag has to outlive the release for hand.vue to read it.
    canvasDragDiscarded.set(false)

    drag = {
        started: false,
        discarding: false,
        origin: { x: e.global.x, y: e.global.y },
        last: screenToWorld(e.global.x, e.global.y),
        nodes: getSelected(),
    }
}

function onDragMove(global) {
    const dx = global.x - drag.origin.x
    const dy = global.y - drag.origin.y

    if (!drag.started) {
        if (Math.hypot(dx, dy) < DRAG_SLOP) return
        drag.started = true
        setTransforming(true)                       // Konva: layer.on('dragstart')

        // A drag is under way, so previews stand down — for a touch drag as much as a mouse one,
        // which is why this is set again here after the press (see canvasPressActive in store.js).
        // The card tool checks it before announcing a hover, and a UI mirrors it into whatever
        // preview overlay it draws.
        //
        // The symptom this closed was specific: a card lifted off a pile exposes the card beneath
        // it, and dragging back across that spot fired its pointerover and raised a preview. The
        // pointer is captured by the drag, so the matching pointerout never arrived and the
        // preview sat there over the table.
        //
        // Set here rather than in card.js because it is not a card fact. Dragging a die across a
        // deck should not preview the deck either; what suppresses a preview is that a drag is
        // happening at all, which is this module's business.
        canvasPressActive.set(true)
        // A tool may want to know its node has been picked up — a card leaves its pile, an
        // arrow does nothing at all. Konva delivered this as a dragstart on the node.
        for (const node of drag.nodes) getToolForNode(node)?.onDragStart?.(node)

        // And the piece itself is picked UP: raised, enlarged, and given a shadow that falls
        // to the table below it. Only pieces — a playmat being repositioned is furniture being
        // slid, not something lifted, and the authored-vs-given rule that decides its selection
        // chrome answers this question too (see SELECTION STYLES in selection.js).
        const pieces = drag.nodes.filter(isPiece)
        markLifted(pieces)
        tactileLift(pieces)
    }

    const now = screenToWorld(global.x, global.y)
    const mx = now.x - drag.last.x
    const my = now.y - drag.last.y
    for (const node of drag.nodes) node.position.set(node.x + mx, node.y + my)
    drag.last = now

    // Off the table is the discard, and the POINTER is what decides it — nothing about the
    // piece enters into it. A card is 108 units tall, so a bounds-based test would fire while
    // the cursor was still well inside the table and refuse to fire when the cursor was clearly
    // off it but the card had been grabbed by a corner. The pointer is the thing the player is
    // aiming and the thing they can see, so it is the whole of the question.
    //
    // No arming, no memory of where the drag has been: this is a pure function of where the
    // cursor is right now. It used to need arming, because the zone reached inside the table
    // and a thing parked near the rim would have been thrown away by its first nudge. Off the
    // table is off the table, so there is nothing left to protect against and nothing left to
    // explain — which is most of why the gesture reads correctly now.
    drag.discarding = isOverWorldEdge(global.x, global.y)
    setDiscardHint(drag.discarding)

    for (const node of drag.nodes) getToolForNode(node)?.onDragMove?.(node)
    scheduleChromeRefresh()                          // Konva: layer.on('dragmove')
    emitDrag('move')                                 // Konva: stage.on('dragmove')
}

function onDragEnd() {
    if (!drag) return
    if (drag.started && drag.discarding) {
        // Let go over the edge: the selection is thrown away rather than dropped.
        //
        // Said first, because the hand rail is listening for this drag to end and its zone —
        // the bottom band of the window — overlaps the table's left and right discard bands
        // near the bottom corners. Without it a release there reads as a drop into the hand as
        // well as a throw off the table.
        canvasDragDiscarded.set(true)

        // The tool's drag-end still runs, and it MUST. Skipping it wholesale was this feature's
        // one real defect, and it is worth stating plainly because the reasoning that produced
        // it was so nearly right: a discarded card should not merge into a pile it passed over,
        // therefore — wrongly — skip the hook that does the merging. But that hook is also where
        // a tool takes down everything the drag stood up. card.js raises canvasDragging on
        // drag start and lowers it there, so a discard left the hand rail's dropzone armed for
        // the rest of the session — the blue bar rising on a hover with nothing in hand — and
        // left a stale merge-candidate cache pointing at destroyed nodes behind it.
        //
        // So the hook is told WHY instead of being skipped: `discarded` suppresses the commit
        // and nothing else. One hook with a reason rather than two hooks, so teardown added to
        // it later cannot silently go missing from this path again.
        for (const node of drag.nodes) getToolForNode(node)?.onDragEnd?.(node, { discarded: true })

        // Two things genuinely do not belong here. tactileDrop, because a landing spring would
        // animate a node into a pose it will not live to hold — and every scrap of state it
        // touches is a property of a node about to be destroyed, so there is nothing to unwind.
        // And emitDrag, because its only subscriber answers with a final nodes:move: a move to
        // the spot a piece was destroyed at is a message the destroy immediately contradicts,
        // and peers would see the selection jump to the edge before vanishing.
        //
        // setTransforming does fire — the gesture has ended either way, and the toolbar has to
        // be let back out.
        setTransforming(false)
        discardSelection()
        drag = null
        return
    }
    if (drag.started) {
        // Tools first: a card may merge into a pile here, and the drop should fall onto the
        // pose that merge decided rather than to flat and get re-crooked a frame later.
        for (const node of drag.nodes) getToolForNode(node)?.onDragEnd?.(node)
        tactileDrop(drag.nodes.filter(isPiece))
        setTransforming(false)                       // Konva: layer.on('dragend')
        emitDrag('end')                              // Konva: stage.on('dragend')
    }
    // A drag that ended anywhere else leaves the chrome its own colour again — including one
    // abandoned outside the window, which arrives here through pointerupoutside.
    setDiscardHint(false)
    drag = null
}

// === Selection from a press ===
function selectFromPress(node, shiftKey) {
    const expanded = expandToGroup(node)
    const current = getSelected()

    if (!shiftKey) {
        setSelection(expanded)
        raise(expanded)
        return
    }

    // Shift-click toggles: an object already fully in the selection comes out, anything else
    // goes in. Partly selected counts as "not in" — a box-select that clipped half a pile is
    // completed by the first shift-click and removed by the second, which is the order those
    // two clicks read in. Raising is part of picking a thing up and has no business happening
    // as you put one down.
    const alreadyIn = expanded.every(n => current.includes(n))
    setSelection(alreadyIn
        ? current.filter(n => !expanded.includes(n))
        : [...current, ...expanded.filter(n => !current.includes(n))])
    if (!alreadyIn) raise(expanded)
}

function isPiece(node) {
    return getToolForNode(node)?.selection_style === 'piece'
}

function raise(nodes) {
    for (const node of nodes) {
        node.parent?.setChildIndex(node, node.parent.children.length - 1)
    }
}

// === Marquee ===
function bandRect() {
    return {
        x: Math.min(band.x0, band.x1),
        y: Math.min(band.y0, band.y1),
        width: Math.abs(band.x1 - band.x0),
        height: Math.abs(band.y1 - band.y0),
    }
}

function paintBand() {
    const rect = getSelectRect()
    if (!rect) return
    rect.clear()
    if (!band) return
    const r = bandRect()
    const marquee = toPixiColor(theme().selection.marquee)
    rect.rect(r.x, r.y, r.width, r.height)
        .fill({ color: marquee, alpha: 0.3 })
        .stroke({ width: 1, color: marquee })
}

function commitBand(shiftKey) {
    const r = bandRect()

    // Treat micro-drags as plain clicks — already handled on the press.
    if (r.width < 2 && r.height < 2) return

    // Reachable elements only. Every other path into the selection goes through a hit test,
    // which already skips whatever is hidden or silenced — the marquee measures rectangles
    // instead, so it is the one place that has to ask. Without this, dragging a box across the
    // table picks up the playmats a player has just hidden or locked.
    const { card, accessory, shape, board } = getLayers()
    const hits = []
    for (const bandContainer of [board, shape, card, accessory]) {
        if (!bandContainer || !bandContainer.visible || bandContainer.eventMode === 'none') continue
        for (const node of bandContainer.children) {
            if (!node.visible) continue
            const b = screenRect(node)
            if (b.x < r.x + r.width && b.x + b.width > r.x && b.y < r.y + r.height && b.y + b.height > r.y) {
                hits.push(node)
            }
        }
    }

    // Atomic-group selection: any hit grouped card pulls in all its groupmates.
    const expanded = new Set()
    for (const node of hits) for (const member of expandToGroup(node)) expanded.add(member)
    const selected = [...expanded]

    setSelection(shiftKey ? [...new Set([...getSelected(), ...selected])] : selected)
    raise(selected)
}

// Abandon an in-progress box-select without acting on it. Called when a second finger lands:
// one finger dragging empty canvas is a box-select, but the moment it becomes a two-finger
// gesture the intent is to move the table, and the half-drawn marquee has to be called off
// rather than committed on release.
export function cancelSelecting() {
    if (!band) return
    band = null
    paintBand()
}

// === Wiring ===
// === What a press does to DOM focus ===
//
// Two rules, and they used to live in scene.js until a cycle proved they belong here: this is
// the module that decides what a press MEANS, and both of these are answers to that.
//
// 1. Dropping focus from a stray field. Every keyboard shortcut is gated on isTyping() (see
//    shortcuts.js), so a seat-name field left holding focus silently disables Q, S, F and the
//    rest until the player clicks some other input. Clicking the table has to release it.
//
//    But NOT the field this very press just opened. The text tool's press raises a DOM textarea
//    over the canvas — a press on the table — so the unguarded rule blurred the field it had
//    just asked for, the overlay committed an empty string, and commitTextEdit destroyed the
//    node it had just created. The tool appeared to do nothing at all. isTextEditOpening is
//    scoped to that one gesture; a LATER press still blurs, which is how you finish typing.
//
// 2. preventDefault on mousedown. Stops the browser starting a text selection or a native drag
//    from the canvas, and stops it moving focus on its own. On MOUSEDOWN rather than pointerdown
//    because Chrome treats a prevented pointerdown as licence to suppress the compatibility
//    mouse events entirely — and useMousePressed reads those, for the space-bar pan cursor and
//    the auto-revert that returns a one-shot drawing tool to Select. Both went silent when this
//    was tried a level up.
function onContainerPointerDown() {
    const el = document.activeElement
    if (!el || el === document.body) return
    if (!(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
    if (isTextEditOpening()) return
    el.blur()
}

function onContainerMouseDown(event) {
    event.preventDefault()
}

export function initPointer() {
    const app = getApp()
    const stage = app.stage

    const container = getContainer()
    container?.addEventListener('pointerdown', onContainerPointerDown)
    container?.addEventListener('mousedown', onContainerMouseDown)

    stage.on('pointerdown', onDown)
    stage.on('globalpointermove', onMove)
    stage.on('pointerup', onUp)
    stage.on('pointerupoutside', onUp)

    // Pixi's federated events carry 'wheel', but only to a hit target, and panning has to work
    // over empty table as well as over a card — so this stays a native listener, as it was.
    app.canvas.addEventListener('wheel', onWheel, { passive: false })
}

export function destroyPointer() {
    const container = getContainer()
    container?.removeEventListener('pointerdown', onContainerPointerDown)
    container?.removeEventListener('mousedown', onContainerMouseDown)
    getApp()?.canvas.removeEventListener('wheel', onWheel)
    setDiscardHint(false)
    drag = band = pan = null
    drag_listeners.clear()
}

function onDown(e) {
    const tool = getActiveTool()
    const onNode = topElementAt(e.global)

    // Pan outranks everything: space is held, or the pan tool is active.
    if (isStageDraggable() || e.button === 1) {
        pan = { x: e.global.x, y: e.global.y }
        return
    }

    // A drawing tool owns the empty table. It is told whether the press landed on something, so
    // it can decline — the Konva version asked `e.target !== stage`, which is the same question
    // through the renderer.
    if (tool?.handlers?.pointerdown) {
        tool.handlers.pointerdown({ ...e, onNode })
        if (!onNode) return
    }

    if (onNode) {
        // A pointer held down on a piece is a HELD piece. Suppress the preview for the whole
        // press, not from the moment the drag passes the slop — pondering a move with the
        // button down never passes it, and that is precisely when the preview used to appear
        // over the board.
        //
        // The sequence it closes: hover a card (which arms the preview's enter timer), press,
        // then hold still while deciding. Nothing cancelled that timer, so it fired mid-press
        // and the preview sat over the table until the player moved far enough to start a drag.
        //
        // Mouse and pen only. On a touchscreen press-and-hold IS the read gesture — the
        // tablet's replacement for hover (see the long press in tools/card.js) — so suppressing
        // on touch here would delete the only way to read a card on a tablet. A touch DRAG is
        // still covered: the slop-crossing below sets the same flag, and card.js's onDragStart
        // cancels the pending long press.
        //
        // A preview armed by the hover a few milliseconds before the press is a pending TIMER,
        // and it has to be cancelled now rather than behind a reactive flush. Store listeners run
        // inside set(), so a UI mirroring this flag (ptcg's table view) cancels it right here.
        if (e.pointerType !== 'touch') canvasPressActive.set(true)

        selectFromPress(onNode, e.shiftKey)
        beginSelectionDrag(e)
        return
    }

    // Bare table: start a marquee. A selection is only cleared when shift is not held, for the
    // reason the original gives — silently dropping a selection is the worse surprise.
    if (!e.shiftKey) setSelection([])
    band = { x0: e.global.x, y0: e.global.y, x1: e.global.x, y1: e.global.y }
    paintBand()
}

function onMove(e) {
    // A resize or an endpoint drag owns the pointer outright.
    if (isGesturing()) return selectionMove(e.global)

    if (pan) {
        panStageBy(pan.x - e.global.x, pan.y - e.global.y, { elastic: true })
        pan = { x: e.global.x, y: e.global.y }
        scheduleChromeRefresh()
        return
    }
    if (drag) return onDragMove(e.global)
    if (band) {
        band.x1 = e.global.x
        band.y1 = e.global.y
        paintBand()
        return
    }
    getActiveTool()?.handlers?.pointermove?.(e)
}

function onUp(e) {
    // The press is over however it ends — dragged, clicked, or abandoned — so the preview is
    // allowed again. Cleared before anything else so no early return can strand it true and
    // leave previews suppressed for the rest of the session.
    canvasPressActive.set(false)

    if (isGesturing()) {
        selectionUp()
        return
    }
    getActiveTool()?.handlers?.pointerup?.(e)
    onDragEnd()
    if (band) {
        commitBand(e.shiftKey)
        band = null
        paintBand()
    }
    // A pan that pulled past the world's edge springs back from wherever it was let go.
    if (pan) settleCamera()
    pan = null

    // NOT while a text edit is open. The text tool's press opens the DOM overlay by publishing
    // uiSelection as { type: 'text-edit', ... }, and broadcastSelectionUI would immediately
    // overwrite that with the ordinary selection payload — which, for a brand-new empty text
    // node nothing has selected, is `{ type: null }`. The overlay would be dismissed by the
    // same gesture that asked for it, which is why the text tool appeared to do nothing at all.
    //
    // Konva never hit this because the broadcast lived in tools/select.js and only ran when a
    // marquee had actually been in progress. Folding the gestures into one machine (see the
    // header) is what put an unconditional broadcast on every release.
    if (isTextEditing()) return
    broadcastSelectionUI(true)
}

function onWheel(e) {
    e.preventDefault()
    const app = getApp()
    if (!app) return
    const rect = app.canvas.getBoundingClientRect()
    const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    if (e.ctrlKey) {
        // Trackpad pinch arrives as ctrl+wheel.
        zoomStageBy(Math.pow(0.99, e.deltaY), anchor)
        scheduleChromeRefresh()
    } else {
        panStageBy(e.deltaX, e.deltaY)
        scheduleChromeRefresh()
    }
}
