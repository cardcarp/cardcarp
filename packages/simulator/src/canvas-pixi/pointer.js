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

const DRAG_SLOP = 8

let drag = null
let band = null
let pan = null

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

export function beginSelectionDrag(e) {
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
        setTransforming(true)

        canvasPressActive.set(true)
        for (const node of drag.nodes) getToolForNode(node)?.onDragStart?.(node)

        const pieces = drag.nodes.filter(isPiece)
        markLifted(pieces)
        tactileLift(pieces)
    }

    const now = screenToWorld(global.x, global.y)
    const mx = now.x - drag.last.x
    const my = now.y - drag.last.y
    for (const node of drag.nodes) node.position.set(node.x + mx, node.y + my)
    drag.last = now

    drag.discarding = isOverWorldEdge(global.x, global.y)
    setDiscardHint(drag.discarding)

    for (const node of drag.nodes) getToolForNode(node)?.onDragMove?.(node)
    scheduleChromeRefresh()
    emitDrag('move')
}

function onDragEnd() {
    if (!drag) return
    if (drag.started && drag.discarding) {
        canvasDragDiscarded.set(true)

        for (const node of drag.nodes) getToolForNode(node)?.onDragEnd?.(node, { discarded: true })

        setTransforming(false)
        discardSelection()
        drag = null
        return
    }
    if (drag.started) {
        for (const node of drag.nodes) getToolForNode(node)?.onDragEnd?.(node)
        tactileDrop(drag.nodes.filter(isPiece))
        setTransforming(false)
        emitDrag('end')
    }
    setDiscardHint(false)
    drag = null
}

function selectFromPress(node, shiftKey) {
    const expanded = expandToGroup(node)
    const current = getSelected()

    if (!shiftKey) {
        setSelection(expanded)
        raise(expanded)
        return
    }

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

    if (r.width < 2 && r.height < 2) return

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

    const expanded = new Set()
    for (const node of hits) for (const member of expandToGroup(node)) expanded.add(member)
    const selected = [...expanded]

    setSelection(shiftKey ? [...new Set([...getSelected(), ...selected])] : selected)
    raise(selected)
}

export function cancelSelecting() {
    if (!band) return
    band = null
    paintBand()
}

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

    if (isStageDraggable() || e.button === 1) {
        pan = { x: e.global.x, y: e.global.y }
        return
    }

    if (tool?.handlers?.pointerdown) {
        tool.handlers.pointerdown({ ...e, onNode })
        if (!onNode) return
    }

    if (onNode) {
        if (e.pointerType !== 'touch') canvasPressActive.set(true)

        selectFromPress(onNode, e.shiftKey)
        beginSelectionDrag(e)
        return
    }

    if (!e.shiftKey) setSelection([])
    band = { x0: e.global.x, y0: e.global.y, x1: e.global.x, y1: e.global.y }
    paintBand()
}

function onMove(e) {
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
    if (pan) settleCamera()
    pan = null

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
        zoomStageBy(Math.pow(0.99, e.deltaY), anchor)
        scheduleChromeRefresh()
    } else {
        panStageBy(e.deltaX, e.deltaY)
        scheduleChromeRefresh()
    }
}
