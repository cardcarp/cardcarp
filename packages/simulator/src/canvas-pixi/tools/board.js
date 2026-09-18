import { getLayers, setWorldRotation } from '../scene.js'
import { artUrl } from './art.js'
import { createAccessory, placeAccessory, loadArt } from './accessory.js'

// Tool metadata
export const id = 'board'

export const selection_style = 'annotation'

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

    placeAccessory(node, getLayers().board)
    loadArt(node, artUrl(item.img))
    return node
}

export function applyPatch(node, props) {
    if (node?.kind !== 'board') return
    for (const [key, value] of Object.entries(props)) {
        if (key === 'rotation') setWorldRotation(node, value)
    }
}

export function expandToGroup(node) {
    return [node]
}
