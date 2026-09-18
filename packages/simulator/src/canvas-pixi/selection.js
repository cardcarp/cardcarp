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

import { theme } from '../theme.js'
import { toPixiColor } from './color.js'

let selected = []
let select_rect = null
let is_transforming = false
let ui_timeout = null

let toolbar_anchor = null

let outlines = null

const OUTLINE_ALPHA = 0.9
const OUTLINE_WIDTH = 1

const PIECE_EDGE_WIDTH = 2
const PIECE_SEPARATOR_ALPHA = 0.85
const PIECE_INFLATE = 2.5
const PIECE_RADIUS = 6

const PLATE_ALPHA = 0.35
const PLATE_RADIUS = 4

let discard_hint = false

function chrome(name) {
    return toPixiColor(theme().selection[name])
}

function hinted(color) {
    return discard_hint ? chrome('discard') : color
}

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
    if (endpointToolFor(selected)) return

    const boxes = new Map()
    for (const node of selected) {
        const key = node.groupId ?? node
        const rect = localRect(withRestingPose(node, () => screenRect(node)))
        const seen = boxes.get(key)
        boxes.set(key, seen
            ? { rect: unionRect(seen.rect, rect), piece: seen.piece }
            : { rect, piece: isPiece(node) })
    }

    const unboxed = selectionHasPiece(selected)

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
        const host = members.reduce((low, n) => (childIndex(n) < childIndex(low) ? n : low))
        for (const node of members) if (node !== host) hidePlate(node)
        showPlate(host, members)
    }

    for (const { rect, piece } of boxes.values()) {
        if (piece) {
            if (!carried) addPieceChrome(rect)
        } else if (unboxed || boxes.size >= 2) {
            addAnnotationOutline(rect)
        }
    }
}

const plated = new Set()

function showPlate(node, members) {
    let plate = node._liftPlate
    if (!plate) {
        plate = new Graphics()
        plate.eventMode = 'none'
        plate.label = 'lift-plate'
        node.addChildAt(plate, node.getChildIndex(node.face))
        node._liftPlate = plate
    }

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

function prunePlates() {
    if (plated.size === 0) return
    const held = new Set(selected)
    for (const node of [...plated]) {
        if (!held.has(node) || !node.parent) hidePlate(node)
    }
}

let footprint = null

export function showDropFootprint(x, y, width, height) {
    const { piece } = getLayers()
    if (!piece) return

    if (!footprint || footprint.destroyed || footprint.parent !== piece) {
        footprint = new Graphics()
        footprint.eventMode = 'none'
        footprint.label = 'drop-footprint'
        piece.addChildAt(footprint, 0)
    }

    footprint.clear()
        .roundRect(x - width / 2, y - height / 2, width, height, PLATE_RADIUS)
        .fill({ color: chrome('piece'), alpha: PLATE_ALPHA })
    footprint.visible = true
}

export function hideDropFootprint() {
    if (footprint && !footprint.destroyed) footprint.visible = false
}

function addAnnotationOutline(box) {
    outlines
        .rect(box.x, box.y, box.width, box.height)
        .stroke({ width: OUTLINE_WIDTH, color: hinted(chrome('outline')), alpha: OUTLINE_ALPHA })
}

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

        handle.on('pointerdown', (e) => {
            handle_dragging = true
            active_handle = index
            setTransforming(true)
            e.stopPropagation()
        })
        handles.addChild(handle)
    }
}

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

    handles.visible = !is_transforming || handle_dragging

    if (!handle_dragging) {
        handles.children.forEach((handle, index) => {
            handle.position.set(points[index].x, points[index].y)
        })
    }
}

const ANCHORS = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right',
]
const CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const ANCHOR_SIZE = 8
const BORDER_WIDTH = 3

let box_border = null
let box_hits = null
let enabled_anchors = ANCHORS
let border_enabled = true
let resize = null

function anchorPoint(box, name) {
    const [row, col] = name.split('-')
    const x = col === 'left' ? box.x : col === 'right' ? box.x + box.width : box.x + box.width / 2
    const y = row === 'top' ? box.y : row === 'bottom' ? box.y + box.height : box.y + box.height / 2
    return { x, y }
}

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

    if (requiresAspectLock(selected) && CORNER_ANCHORS.includes(anchor)) {
        const s = Math.max(Math.abs(sx), Math.abs(sy))
        sx = Math.sign(sx || 1) * s
        sy = Math.sign(sy || 1) * s
    }

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

function requiresAspectLock(nodes) {
    return nodes.some(node => node.kind !== 'rect')
}

export function updateTransformerAnchors() {
    if (selected.length === 0) return

    if (endpointToolFor(selected)) {
        enabled_anchors = []
        border_enabled = false
        return
    }
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

let chrome_raf = 0
export function scheduleChromeRefresh() {
    if (chrome_raf) return
    chrome_raf = requestAnimationFrame(() => {
        chrome_raf = 0
        refreshSelectionChrome()
    })
}

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

let chrome_hidden = false

export function setChromeVisible(visible) {
    chrome_hidden = !visible
    refreshSelectionChrome()
}

export function setTransforming(value) {
    is_transforming = value
    broadcastSelectionUI()
}

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

    outlines = new Graphics()
    ui.addChild(outlines)

    box_border = new Graphics()
    ui.addChild(box_border)

    box_hits = new Container()
    ui.addChild(box_hits)
    buildBoxHits()

    handles = new Container()
    handles.visible = false
    ui.addChild(handles)
}

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

export function selectionDelete() {
    if (selected.length === 0) return
    poofNodes(selected)
    selected.forEach(node => node.destroy())
    selected = []
    setDiscardHint(false)
    broadcastSelectionUI()
}

export function discardSelection() {
    if (selected.length === 0) return
    const nodeIds = selected.map(n => n.nodeId).filter(Boolean)
    selectionDelete()
    if (nodeIds.length) emitCanvasAction({ op: 'nodes:destroy', nodeIds })
}

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
    if (isTextEditing()) return
    if (selected.length === 0) return
    applyMoveZ(selected, direction)
    scheduleChromeRefresh()
}

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
