// canvas/tools/marker.js, ported. A small piece of art a player puts on the table.

import { getLayers, setWorldRotation } from '../scene.js'
import { artUrl } from './art.js'
import { createAccessory, placeAccessory, loadArt } from './accessory.js'

// Tool metadata
export const id = 'marker'

// A game piece: the game decides its size, the player doesn't, so it gets no transform box.
export const selection_style = 'piece'

const DEFAULT_MARKER_WIDTH = 60
const DEFAULT_MARKER_HEIGHT = 60

export function selectionPayload(node) {
    return { itemData: node.itemData ?? null }
}

export function addMarker(item, preferredX, preferredY, options = {}) {
    const { nodeId = null, rotation = 0, resolveOverlap = true } = options

    const node = createAccessory({
        kind: 'marker',
        item, preferredX, preferredY,
        width:  item?.size?.width  ?? DEFAULT_MARKER_WIDTH,
        height: item?.size?.height ?? DEFAULT_MARKER_HEIGHT,
        nodeId, rotation, resolveOverlap,
    })
    if (!node) return

    placeAccessory(node, getLayers().accessory)
    loadArt(node, artUrl(item.img))
    return node
}

// Generic prop patch — marker only handles rotation today; extend as needed.
export function applyPatch(node, props) {
    if (node?.kind !== 'marker') return
    for (const [key, value] of Object.entries(props)) {
        if (key === 'rotation') setWorldRotation(node, value)
    }
}

export function expandToGroup(node) {
    return [node]
}
