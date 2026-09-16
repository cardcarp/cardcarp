// canvas/tools/text.js, ported.
//
// Konva.Text was a first-class node with its own attribute API — node.text(), node.fontSize(),
// node.width() — and the tool read and wrote it directly. Here the model is props and the Text
// is what draw() puts on the face, which changes every accessor but nothing about the flow.
//
// The DOM edit overlay is untouched and was never the renderer's business: it is a textarea
// positioned over the canvas, driven entirely through uiSelection. That the whole
// startTextEdit / commitTextEdit dance ports as a rename is the clearest evidence that the
// original's seam between canvas and Vue was in the right place.

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

// An annotation: the player authored its geometry, so a transform box offers a real operation.
export const selection_style = 'annotation'

// Vue toolbar reads this to preview the current colour in its chip. Keyed `color` to match the
// edit-overlay payload startTextEdit builds, so the chip binds one field either way.
export function selectionPayload(node) {
    return { color: node.props.fill }
}

export function init() {
    const webfont = themeWebfont()
    if (webfont) loadFont(webfont)
}

// A Pixi Text is a display object rather than a drawing command, so unlike every other tool
// this one puts a child on the face instead of issuing geometry. The `g` it is handed goes
// unused — which is honest: text is the one thing here that is not a shape.
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

// Measured rather than declared: a text node's box is whatever the glyphs came out as, which is
// exactly why the mirror has to re-read it after every content change.
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
        // Handed the node by createNode. A text box is measured, not declared, so this is the
        // one tool that must read something back off the node to answer.
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
        // Local-only draft — no nodeId yet. The observer assigns one on commit if non-empty.
        text_node = addText({ x: pos.x, y: pos.y, text: '' })
        startTextEdit(text_node)
    },

    pointerup() {
        // The opening press is over; a further press on the table may now commit the edit.
        opening_gesture = false
        if (!text_node) return
        text_node = null
    },
}

// Accessors
export function isTextEditing() {
    return active_editing_node !== null
}

// True only for the gesture that OPENED an edit — set when the overlay is raised, cleared on
// the release of the same press.
//
// It exists for one caller: the canvas's blurDomFocus (see scene.js), which drops DOM focus
// whenever the table is pressed. That rule is right for a stray seat-name field and exactly
// wrong for the text overlay, because the press that raises the overlay is a press on the
// table — so the canvas would blur the field it had just asked for, the overlay would commit an
// empty string, and commitTextEdit would destroy the node it had just created. The tool
// appeared to do nothing at all.
//
// A later press must still blur it: that is how you finish typing. So the guard is scoped to
// the opening gesture rather than to "is an edit open".
let opening_gesture = false

export function isTextEditOpening() {
    return opening_gesture
}

// Edit overlay — transitions the selection from type:'text' to type:'text-edit'.
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
        // Text editing is always one node, so nothing that keys off the object count can be
        // confused by a stale value left over from whatever was selected before.
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

// Commit branches into three observer events depending on what happened:
//   - new node + non-empty text → text:create   (observer assigns nodeId, broadcasts)
//   - existing node + non-empty → text:edit     (broadcasts nodes:patch with props)
//   - existing node + empty     → node:destroy  (broadcasts nodes:destroy)
//   - new node + empty          → silent        (node never got synced, just discard)
export function commitTextEdit(newText) {
    if (!active_editing_node) return
    const node = active_editing_node
    const hadNodeId = !!node.nodeId
    // The colour picker in toolbar/text.vue stages its choice with stageTextColor, for the live
    // textarea preview; pull it here so the choice persists onto the node and ships to peers.
    const stagedColor = uiSelection.get()?.data?.color

    if (newText.trim() === '') {
        const wasNodeId = node.nodeId
        node.destroy()
        setSelection([])
        if (hadNodeId) emitCanvasAction({ op: 'node:destroy', nodeId: wasNodeId })
        // else: brand-new local draft, never broadcast — silent discard.
    } else {
        node.setProps({
            text: newText,
            ...(typeof stagedColor === 'string' ? { fill: stagedColor } : {}),
        })
        refreshMirrorTextOffset(node) // content change resizes the box the mirror rotates around
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

// The overlay's draft as it is typed. It lives in the selection rather than in the toolbar
// because the overlay's sizing mirror renders from it, and it is replaced rather than edited so
// a UI bound to the selection hears every keystroke.
export function setTextDraft(text) {
    patchTextEdit({ text })
}

// A colour picked while the overlay is open: shown in the textarea straight away, and put on the
// node by commitTextEdit when the edit closes.
export function stageTextColor(color) {
    patchTextEdit({ color })
}

function patchTextEdit(patch) {
    uiSelection.update(sel => (sel.type === 'text-edit' ? { ...sel, data: { ...sel.data, ...patch } } : sel))
}

// Recolour every text node in the current selection. Select-mode counterpart to the
// staged-colour path in commitTextEdit.
export function changeColor(color) {
    const texts = getSelected().filter(n => n.kind === 'text')
    if (texts.length === 0) return
    for (const node of texts) node.setProps({ fill: `hsl(${color})` })
    broadcastSelectionUI(true)
}

// Generic prop patch — text / fill / fontSize / fontFamily / lineHeight / rotation
export function applyPatch(node, props) {
    if (node?.kind !== 'text') return
    const { rotation, ...model } = props
    if (rotation !== undefined) setWorldRotation(node, rotation)
    node.setProps(model)
    refreshMirrorTextOffset(node) // text/fontSize patches resize the box the mirror rotates around
}

export function expandToGroup(node) {
    return [node]
}
