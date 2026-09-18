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

export const selection_style = 'annotation'

export function selectionPayload(node) {
    return { fill: node.props.fill }
}

function draw(g, props) {
    g.rect(0, 0, props.width, props.height)
     .fill({ color: toPixiColor(props.fill), alpha: props.opacity })
}

function bounds(props) {
    return { x: 0, y: 0, width: props.width, height: props.height }
}

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

        draw_shape = addRect({ x: draw_start_x, y: draw_start_y, width: 0, height: 0 })
    },

    pointermove() {
        if (!draw_shape) return
        const pos = getRelativePointerPosition()
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
        if (draw_shape) {
            draw_shape.destroy()
            draw_shape = null
        }
    },
}

export function changeColor(color) {
    const selected = getSelected()
    if (selected.length === 0) return
    for (const node of selected) {
        if (node.kind !== 'rect') continue
        node.setProps({ fill: `hsl(${color})` })
    }
    broadcastSelectionUI(true)
}

export function applyPatch(node, props) {
    if (node?.kind !== 'rect') return
    const { rotation, ...model } = props
    if (rotation !== undefined) node.rotation = rotation * (Math.PI / 180)
    node.setProps(model)
}

export function expandToGroup(node) {
    return [node]
}
