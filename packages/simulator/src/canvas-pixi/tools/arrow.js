// canvas/tools/arrow.js, ported. A pointer AT the table.
//
// Konva.Arrow drew the shaft and the head from one `points` array and gave the line a
// `hitStrokeWidth` so a 4px stroke was a 20px click target. Pixi has neither, so both are
// written out: the head is three lineTo's, and the hit area is a point-to-segment distance
// function. Neither is difficult; both are the kind of thing a shape library exists to have
// already done.
//
// The endpoint contract — getEndpoints / moveEndpoint / commitEndpoints — is unchanged, and it
// is the reason the arrow was worth porting early: it is the one tool that exercises
// selection.js's handle path, and nothing in selection.js knows what an arrow is.

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

// An annotation: the player authored its geometry, so a transform box offers a real operation.
export const selection_style = 'annotation'

// Below this the drag reads as a click, not an arrow — drawing one would leave a stub with an
// arrowhead longer than its own shaft sitting under the cursor.
const MIN_LENGTH = 6

// A 4px line is a 4px click target. Konva widened it with hitStrokeWidth; here the hit area is
// stated as a distance from the shaft, which is the same idea spelled arithmetically.
const HIT_WIDTH = 20

// Vue toolbar reads this to preview the current stroke in its colour chip.
export function selectionPayload(node) {
    return { stroke: node.props.stroke }
}

function draw(g, props) {
    const [x1, y1, x2, y2] = props.points
    const color = toPixiColor(props.stroke)
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const len = props.pointerLength
    const halfW = props.pointerWidth / 2

    // The shaft stops short of the head so a thick line does not poke through the triangle's
    // point — Konva's Arrow did this internally.
    const shaftX = x2 - Math.cos(angle) * len
    const shaftY = y2 - Math.sin(angle) * len

    g.moveTo(x1, y1).lineTo(shaftX, shaftY)
     .stroke({ width: props.strokeWidth, color, cap: 'round', join: 'round' })

    g.moveTo(x2, y2)
     .lineTo(shaftX - Math.sin(angle) * halfW, shaftY + Math.cos(angle) * halfW)
     .lineTo(shaftX + Math.sin(angle) * halfW, shaftY - Math.cos(angle) * halfW)
     .fill(color)
}

// The arrow's box, for the selection chrome. Not the hit area — see hitArea below, which is a
// distance test rather than a rectangle, because a diagonal line's bounding box is mostly empty.
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

// Konva's hitStrokeWidth, written out — and the shape the arrow actually occupies.
//
// A CAPSULE: every point within HIT_WIDTH/2 of the shaft, which is a narrow band that turns with
// the line instead of an upright box around it. A bounding rectangle would be the easy answer
// and the wrong one — a diagonal arrow's box is mostly empty, so the arrow would swallow presses
// aimed at whatever sits in the corners near it, and would refuse presses aimed squarely at a
// near-vertical shaft that happens to sit at the edge of a wide box.
//
// The head is fatter than the shaft, so the last pointerLength of the capsule widens to cover
// it — otherwise the one part of an arrow a player actually points at is the part hardest to
// grab.
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
            // Within the head's wider reach but outside the shaft's: only near the tip.
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

// The node's position IS the arrow's tail and `points` are relative to it, so dragging moves the
// whole arrow with an untouched point list — which is what lets the generic nodes:move path
// (position only) replicate an arrow without knowing it is one.
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

    // Accessory band, not shape — an arrow is a pointer AT the table, so it has to draw over the
    // cards it is aiming at the way a die resting on a pile does. It rides with the dice because
    // the two want the same answer to every band-level question.
    getLayers().accessory.addChild(node)
    return node
}

// Tool handlers
export const handlers = {
    pointerdown(e) {
        if (e.onNode) return
        const pos = getRelativePointerPosition()
        // Local-only draft — no nodeId yet. Observer assigns one on completion.
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

// === Endpoint editing ===
//
// A line has ends, not corners. Every handle on a bounding box is a scale, which stretches the
// head out of shape and cannot move one end without dragging the other along.
//
// Screen coordinates on the way in and out. In Konva the caller was the ui LAYER, a sibling of
// the arrow's — neither one's local space meant anything to the other, and absolute was the
// space they shared. Here the ui container sits outside the camera entirely, so screen space is
// not merely the shared frame, it is the frame the handles are already drawn in.
export function getEndpoints(node) {
    if (node?.kind !== 'arrow') return null
    const [x1, y1, x2, y2] = node.props.points
    return [
        worldToScreen({ x: node.x + x1, y: node.y + y1 }),
        worldToScreen({ x: node.x + x2, y: node.y + y2 }),
    ]
}

// Both ends are written the same way — as a point in the arrow's own space — so the node's x/y
// never moves and the OTHER end therefore stays exactly where it was, for free.
//
// This does mean x/y stops being the tail once a tail has been dragged. Nothing depends on that.
// The invariant that matters is that `points` are relative to x/y, which is what lets a whole-
// arrow drag replicate as a position-only nodes:move.
export function moveEndpoint(node, index, screenPoint) {
    if (node?.kind !== 'arrow') return
    const world = screenToWorld(screenPoint.x, screenPoint.y)
    const points = [...node.props.points]
    const local = { x: world.x - node.x, y: world.y - node.y }

    // Same floor the initial draw uses: below it the head is longer than the shaft it sits on,
    // and at zero length the arrow renders as nothing at all — which looks like the player just
    // deleted it. Held off the fixed end along the current heading.
    const fixed = { x: points[index === 0 ? 2 : 0], y: points[index === 0 ? 3 : 1] }
    const dx = local.x - fixed.x
    const dy = local.y - fixed.y
    const length = Math.hypot(dx, dy)
    const scale = length < MIN_LENGTH ? MIN_LENGTH / (length || 1) : 1

    points[index * 2] = fixed.x + dx * scale
    points[index * 2 + 1] = fixed.y + dy * scale
    node.setProps({ points })
}

// Broadcast once, when the drag ends, rather than on every frame of it: the relay persists each
// nodes:patch it applies, so a two-second reshape would be sixty writes to say what the last one
// already says.
export function commitEndpoints(node) {
    if (node?.kind !== 'arrow' || !node.nodeId) return
    emitCanvasAction({ op: 'node:patch', nodeId: node.nodeId, props: { points: node.props.points } })
}

// Toolbar action — applies to the current selection
export function changeColor(color) {
    const arrows = getSelected().filter(n => n.kind === 'arrow')
    if (arrows.length === 0) return
    // Konva kept line and head on separate attributes (stroke and fill) and both had to be set.
    // Here one prop drives both, because draw() reads it twice.
    for (const node of arrows) node.setProps({ stroke: `hsl(${color})` })
    broadcastSelectionUI(true)
}

// Generic prop patch — stroke / strokeWidth / points / opacity / rotation
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
