// canvas/tools/rect.js, ported. The smallest complete tool, and so the one that shows the shape
// every other port will take.
//
// What changed, and it is the whole of what changed:
//
//   Konva                              Pixi
//   new Konva.Rect({ x, y, w, h,       createNode({ kind, props, draw, bounds })
//     fill, opacity, draggable })      — the model is `props`, the drawing is `draw`
//   node.fill('red')                   node.setProps({ fill: 'red' })
//   node.width()                       node.props.width
//   node.getLayer().batchDraw()        (gone — Pixi renders on a ticker)
//   node.hasName('shape')              node.kind === 'rect'
//   draggable: true                    the pointer machine (canvas-pixi/pointer.js)
//
// The tool's own logic — draw-drag to create, discard a zero-size draft, emit on completion —
// is untouched, because none of it was ever Konva's.

import { getLayers, getRelativePointerPosition, getApp } from '../scene.js'
import { getSelected, broadcastSelectionUI } from '../selection.js'
import { emitCanvasAction } from '../observer.js'
import { createNode } from '../node.js'
import { theme } from '../../theme.js'
import { toPixiColor } from '../color.js'

// Local
let draw_shape = null
let draw_start_x = 0
let draw_start_y = 0

// Tool metadata
export const id = 'rect'

// An annotation: the player authored its geometry, so a transform box offers a real operation.
// See SELECTION STYLES in canvas-pixi/selection.js.
export const selection_style = 'annotation'

// Vue toolbar reads this to preview the current fill in its color chip. The payload is now the
// model rather than a getter call, which is the same value by a shorter road.
export function selectionPayload(node) {
    return { fill: node.props.fill }
}

// Colours are CSS strings in the model, because the wire and the UI's colour pickers both speak them,
// and are converted at the point of drawing (color.js) — the same place the DEG conversion lives in
// scene.js. A new rectangle starts in the theme's `shape.rect`.

function draw(g, props) {
    g.rect(0, 0, props.width, props.height)
     .fill({ color: toPixiColor(props.fill), alpha: props.opacity })
}

function bounds(props) {
    return { x: 0, y: 0, width: props.width, height: props.height }
}

// Factory used by both the interactive draw and the multiplayer replay path.
// `params`: { x, y, width, height, fill?, opacity? }
// `options`: { nodeId? }
export function addRect(params, options = {}) {
    if (!getApp()) return null
    const { x, y, width, height, fill, opacity } = params
    const { nodeId = null } = options

    const node = createNode({
        kind: 'rect',
        nodeId,
        x, y,
        props: {
            width,
            height,
            fill: fill ?? theme().shape.rect,
            opacity: opacity ?? 0.8,
        },
        draw,
        bounds,
    })

    getLayers().shape.addChild(node)
    return node
}

// Tool handlers
export const handlers = {
    pointerdown(e) {
        if (e.onNode) return

        const pos = getRelativePointerPosition()
        draw_start_x = pos.x
        draw_start_y = pos.y

        // Local-only draft — no nodeId yet. Observer assigns one on completion.
        draw_shape = addRect({ x: draw_start_x, y: draw_start_y, width: 0, height: 0 })
    },

    pointermove() {
        if (!draw_shape) return
        const pos = getRelativePointerPosition()
        // Position is the node's, size is the model's — the one place the port splits an
        // attribute Konva kept together in setAttrs.
        draw_shape.position.set(
            Math.min(draw_start_x, pos.x),
            Math.min(draw_start_y, pos.y),
        )
        draw_shape.setProps({
            width: Math.abs(pos.x - draw_start_x),
            height: Math.abs(pos.y - draw_start_y),
        })
    },

    pointerup() {
        if (!draw_shape) return
        if (draw_shape.props.width === 0 || draw_shape.props.height === 0) {
            draw_shape.destroy()
            draw_shape = null
            return
        }
        // Completion — broadcast to peers. multiplayer.js subscribes and turns this into a
        // node:create event after assigning the canonical nodeId.
        emitCanvasAction({
            op: 'rect:create',
            node: draw_shape,
            params: {
                x: draw_shape.x,
                y: draw_shape.y,
                ...draw_shape.props,
            },
        })
        draw_shape = null
    },

    deactivate() {
        // Tool swap mid-drag: kill the unfinished shape
        if (draw_shape) {
            draw_shape.destroy()
            draw_shape = null
        }
    },
}

// Toolbar action — applies to the current selection
export function changeColor(color) {
    const selected = getSelected()
    if (selected.length === 0) return
    for (const node of selected) {
        if (node.kind !== 'rect') continue
        node.setProps({ fill: `hsl(${color})` })
    }
    // Fill is part of the selection payload — refresh so the toolbar chip tracks it.
    broadcastSelectionUI(true)
}

// Generic prop patch — fill / opacity / rotation.
//
// Konva took each key in turn because each was a different setter. Here fill and opacity are
// both model, so they go through setProps together; rotation is a transform rather than model,
// which is why it is still handled apart.
export function applyPatch(node, props) {
    if (node?.kind !== 'rect') return
    const { rotation, ...model } = props
    if (rotation !== undefined) node.rotation = rotation * (Math.PI / 180)
    node.setProps(model)
}

// A rect is not grouped with anything; it is its own object. Stated rather than omitted so the
// registry's expandToGroup has an answer that reads as a decision.
export function expandToGroup(node) {
    return [node]
}
