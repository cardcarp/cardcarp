// canvas/tools/board.js, ported. A playmat: a large image the table is laid out on.

import { getLayers, setWorldRotation } from '../scene.js'
import { artUrl } from './art.js'
import { createAccessory, placeAccessory, loadArt } from './accessory.js'

// Tool metadata
export const id = 'board'

// Authored geometry, so it keeps its box: a playmat is sized to the table during setup. That it
// is nearly always locked is a separate question from what selecting one should offer.
// See SELECTION STYLES in canvas-pixi/selection.js.
export const selection_style = 'annotation'

// Fallback size if item.size is missing. The data shape going forward should always supply
// explicit `size: { width, height }` in world coords — boards are typically large playmats
// where natural aspect alone wouldn't give the right footprint.
const DEFAULT_BOARD_WIDTH = 400
const DEFAULT_BOARD_HEIGHT = 400

export function selectionPayload(node) {
    return { itemData: node.itemData ?? null }
}

export function addBoard(item, preferredX, preferredY, options = {}) {
    const { nodeId = null, rotation = 0, resolveOverlap = true } = options

    const node = createAccessory({
        kind: 'board',
        item, preferredX, preferredY,
        width:  item?.size?.width  ?? DEFAULT_BOARD_WIDTH,
        height: item?.size?.height ?? DEFAULT_BOARD_HEIGHT,
        nodeId, rotation, resolveOverlap,
    })
    if (!node) return

    // No mirrorNewNode via placeAccessory's usual path would be wrong here — but it is a no-op
    // for a board anyway, because 'board' is not in UPRIGHT_NAMES (see scene.js). A playmat's
    // orientation belongs to the table: from the far side you see it upside-down, like a
    // physical mat.
    placeAccessory(node, getLayers().board)
    loadArt(node, artUrl(item.img))
    return node
}

// Generic prop patch — board only handles rotation (resize is via nodes:transform).
export function applyPatch(node, props) {
    if (node?.kind !== 'board') return
    for (const [key, value] of Object.entries(props)) {
        if (key === 'rotation') setWorldRotation(node, value)
    }
}

export function expandToGroup(node) {
    return [node]
}
