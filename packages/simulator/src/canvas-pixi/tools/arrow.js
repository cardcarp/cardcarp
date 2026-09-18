import { getLayers, getRelativePointerPosition, worldToScreen, screenToWorld } from '../scene.js'
import { getSelected, broadcastSelectionUI } from '../selection.js'
import { emitCanvasAction } from '../observer.js'
import { createNode } from '../node.js'
import { theme } from '../../theme.js'
import { toPixiColor } from '../color.js'

// Local
let draw_arrow = null

// Tool metadata
export const id = 'arrow'

export const selection_style = 'annotation'

const MIN_LENGTH = 6

const HIT_WIDTH = 20

export function selectionPayload(node) {
    return { stroke: node.props.stroke }
}

function draw(g, props) {
    const [x1, y1, x2, y2] = props.points
    const color = toPixiColor(props.stroke)
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const len = props.pointerLength
    const halfW = props.pointerWidth / 2

    const shaftX = x2 - Math.cos(angle) * len
    const shaftY = y2 - Math.sin(angle) * len

    g.moveTo(x1, y1).lineTo(shaftX, shaftY)
     .stroke({ width: props.strokeWidth, color, cap: 'round', join: 'round' })

    g.moveTo(x2, y2)
     .lineTo(shaftX - Math.sin(angle) * halfW, shaftY + Math.cos(angle) * halfW)
     .lineTo(shaftX + Math.sin(angle) * halfW, shaftY - Math.cos(angle) * halfW)
     .fill(color)
}

function bounds(props) {
    const [x1, y1, x2, y2] = props.points
    const pad = Math.max(props.strokeWidth, props.pointerWidth) / 2
    return {
        x: Math.min(x1, x2) - pad,
        y: Math.min(y1, y2) - pad,
        width: Math.abs(x2 - x1) + pad * 2,
        height: Math.abs(y2 - y1) + pad * 2,
    }
}

function hitArea(props) {
    const [x1, y1, x2, y2] = props.points
    const shaftReach = HIT_WIDTH / 2
    const headReach = Math.max(shaftReach, props.pointerWidth / 2 + 2)
    const headLen = props.pointerLength
    return {
        contains(px, py) {
            const d = distanceToSegment(px, py, x1, y1, x2, y2)
            if (d > headReach) return false
            if (d <= shaftReach) return true
            return Math.hypot(px - x2, py - y2) <= headLen
        },
    }
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1, vy = y2 - y1
    const len2 = vx * vx + vy * vy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / len2))
    return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy))
}

export function addArrow(params, options = {}) {
    const { x, y, points, stroke, strokeWidth, pointerLength, pointerWidth } = params
    const { nodeId = null } = options

    const node = createNode({
        kind: 'arrow',
        nodeId,
        x, y,
        props: {
            points: points ?? [0, 0, 0, 0],
            stroke: stroke ?? theme().shape.arrow,
            strokeWidth: strokeWidth ?? 4,
            pointerLength: pointerLength ?? 14,
            pointerWidth: pointerWidth ?? 14,
        },
        draw,
        bounds,
        hitArea,
    })

    getLayers().accessory.addChild(node)
    return node
}

// Tool handlers
export const handlers = {
    pointerdown(e) {
        if (e.onNode) return
        const pos = getRelativePointerPosition()
        draw_arrow = addArrow({ x: pos.x, y: pos.y, points: [0, 0, 0, 0] })
    },

    pointermove() {
        if (!draw_arrow) return
        const pos = getRelativePointerPosition()
        draw_arrow.setProps({ points: [0, 0, pos.x - draw_arrow.x, pos.y - draw_arrow.y] })
    },

    pointerup() {
        if (!draw_arrow) return

        const [, , dx, dy] = draw_arrow.props.points
        if (Math.hypot(dx, dy) < MIN_LENGTH) {
            draw_arrow.destroy()
            draw_arrow = null
            return
        }

        emitCanvasAction({
            op: 'arrow:create',
            node: draw_arrow,
            params: { x: draw_arrow.x, y: draw_arrow.y, ...draw_arrow.props },
        })
        draw_arrow = null
    },

    deactivate() {
        if (draw_arrow) {
            draw_arrow.destroy()
            draw_arrow = null
        }
    },
}

export function getEndpoints(node) {
    if (node?.kind !== 'arrow') return null
    const [x1, y1, x2, y2] = node.props.points
    return [
        worldToScreen({ x: node.x + x1, y: node.y + y1 }),
        worldToScreen({ x: node.x + x2, y: node.y + y2 }),
    ]
}

export function moveEndpoint(node, index, screenPoint) {
    if (node?.kind !== 'arrow') return
    const world = screenToWorld(screenPoint.x, screenPoint.y)
    const points = [...node.props.points]
    const local = { x: world.x - node.x, y: world.y - node.y }

    const fixed = { x: points[index === 0 ? 2 : 0], y: points[index === 0 ? 3 : 1] }
    const dx = local.x - fixed.x
    const dy = local.y - fixed.y
    const length = Math.hypot(dx, dy)
    const scale = length < MIN_LENGTH ? MIN_LENGTH / (length || 1) : 1

    points[index * 2] = fixed.x + dx * scale
    points[index * 2 + 1] = fixed.y + dy * scale
    node.setProps({ points })
}

export function commitEndpoints(node) {
    if (node?.kind !== 'arrow' || !node.nodeId) return
    emitCanvasAction({ op: 'node:patch', nodeId: node.nodeId, props: { points: node.props.points } })
}

export function changeColor(color) {
    const arrows = getSelected().filter(n => n.kind === 'arrow')
    if (arrows.length === 0) return
    for (const node of arrows) node.setProps({ stroke: `hsl(${color})` })
    broadcastSelectionUI(true)
}

export function applyPatch(node, props) {
    if (node?.kind !== 'arrow') return
    const { rotation, opacity, ...model } = props
    if (rotation !== undefined) node.rotation = rotation * (Math.PI / 180)
    if (opacity !== undefined) node.alpha = opacity
    node.setProps(model)
}

export function expandToGroup(node) {
    return [node]
}
