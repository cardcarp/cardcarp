import { Text, TextStyle } from 'pixi.js'

// Stores
import { uiSelection } from '../../store.js'

// Scene
import {
    getApp, getLayers, getRelativePointerPosition, mirrorNewNode, setWorldRotation,
    refreshMirrorTextOffset,
} from '../scene.js'
import { getSelected, setSelection, setChromeVisible, broadcastSelectionUI } from '../selection.js'
import { loadFont } from '../font.js'
import { emitCanvasAction } from '../observer.js'
import { createNode, screenRect } from '../node.js'
import { theme, themeWebfont } from '../../theme.js'
import { toPixiColor } from '../color.js'

// Local
let text_node = null
let active_editing_node = null

// Tool metadata
export const id = 'text'

export const selection_style = 'annotation'

export function selectionPayload(node) {
    return { color: node.props.fill }
}

export function init() {
    const webfont = themeWebfont()
    if (webfont) loadFont(webfont)
}

function draw(g, props, node) {
    const label = new Text({
        text: props.text,
        style: new TextStyle({
            fontFamily: props.fontFamily,
            fontSize: props.fontSize,
            fill: toPixiColor(props.fill),
            lineHeight: props.fontSize * props.lineHeight,
            wordWrap: typeof props.width === 'number',
            wordWrapWidth: props.width ?? 0,
        }),
    })
    node.face.addChild(label)
    node.label = label
}

function bounds(props, node) {
    const label = node?.label
    return { x: 0, y: 0, width: label?.width ?? props.width ?? 0, height: label?.height ?? props.fontSize }
}

export function addText(params, options = {}) {
    if (!getApp()) return null
    const {
        x, y,
        text = '',
        fontSize = 24,
        fontFamily = theme().font,
        fill = theme().shape.text,
        lineHeight = 1,
        width,
        height,
    } = params
    const { nodeId = null } = options

    const node = createNode({
        kind: 'text',
        nodeId,
        x, y,
        props: {
            text, fontSize, fontFamily, fill, lineHeight,
            ...(typeof width === 'number' ? { width } : {}),
            ...(typeof height === 'number' ? { height } : {}),
        },
        draw,
        bounds,
    })

    getLayers().shape.addChild(node)
    mirrorNewNode(node)
    refreshMirrorTextOffset(node)
    return node
}

// Tool handlers
export const handlers = {
    pointerdown(e) {
        if (e.onNode) return
        const pos = getRelativePointerPosition()
        text_node = addText({ x: pos.x, y: pos.y, text: '' })
        startTextEdit(text_node)
    },

    pointerup() {
        opening_gesture = false
        if (!text_node) return
        text_node = null
    },
}

// Accessors
export function isTextEditing() {
    return active_editing_node !== null
}

let opening_gesture = false

export function isTextEditOpening() {
    return opening_gesture
}

export function startTextEdit(node) {
    active_editing_node = node
    opening_gesture = true
    node.visible = false
    setChromeVisible(false)

    const box = screenRect(node)
    const effectiveFontSize = node.props.height > 0
        ? box.height / node.props.lineHeight
        : node.props.fontSize

    uiSelection.set({
        type: 'text-edit',
        units: 1,
        x: box.x + (box.width / 2),
        y: box.y,
        data: {
            editX: box.x,
            editY: box.y,
            text: node.props.text,
            width: box.width,
            height: box.height,
            fontSize: effectiveFontSize,
            lineHeight: node.props.lineHeight,
            fontFamily: node.props.fontFamily,
            color: node.props.fill,
        },
    })
}

export function commitTextEdit(newText) {
    if (!active_editing_node) return
    const node = active_editing_node
    const hadNodeId = !!node.nodeId
    const stagedColor = uiSelection.get()?.data?.color

    if (newText.trim() === '') {
        const wasNodeId = node.nodeId
        node.destroy()
        setSelection([])
        if (hadNodeId) emitCanvasAction({ op: 'node:destroy', nodeId: wasNodeId })
    } else {
        node.setProps({
            text: newText,
            ...(typeof stagedColor === 'string' ? { fill: stagedColor } : {}),
        })
        refreshMirrorTextOffset(node)
        node.visible = true

        if (hadNodeId) {
            const props = { text: newText }
            if (typeof stagedColor === 'string') props.fill = stagedColor
            emitCanvasAction({ op: 'text:edit', nodeId: node.nodeId, props })
        } else {
            emitCanvasAction({
                op: 'text:create',
                node,
                params: { x: node.x, y: node.y, ...node.props, text: newText },
            })
        }
    }

    setChromeVisible(true)
    active_editing_node = null
    opening_gesture = false
    broadcastSelectionUI()
}

export function setTextDraft(text) {
    patchTextEdit({ text })
}

export function stageTextColor(color) {
    patchTextEdit({ color })
}

function patchTextEdit(patch) {
    uiSelection.update(sel => (sel.type === 'text-edit' ? { ...sel, data: { ...sel.data, ...patch } } : sel))
}

export function changeColor(color) {
    const texts = getSelected().filter(n => n.kind === 'text')
    if (texts.length === 0) return
    for (const node of texts) node.setProps({ fill: `hsl(${color})` })
    broadcastSelectionUI(true)
}

export function applyPatch(node, props) {
    if (node?.kind !== 'text') return
    const { rotation, ...model } = props
    if (rotation !== undefined) setWorldRotation(node, rotation)
    node.setProps(model)
    refreshMirrorTextOffset(node)
}

export function expandToGroup(node) {
    return [node]
}
