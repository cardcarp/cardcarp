import { Assets, Sprite } from 'pixi.js'

import { getApp, getLayers, getViewportCenter, mirrorNewNode } from '../scene.js'
import { occupiedBy, resolveSpawnPoint } from '../spawn.js'
import { createNode } from '../node.js'

function paintArt(g, props, node) {
    const texture = node.texture
    if (!texture) return
    const sprite = new Sprite(texture)
    sprite.width = props.width
    sprite.height = props.height
    sprite.anchor.set(0.5)
    g.parent.addChild(sprite)
}

function artBounds(props) {
    return { x: -props.width / 2, y: -props.height / 2, width: props.width, height: props.height }
}

export function createAccessory({
    kind, item, preferredX, preferredY,
    width, height,
    nodeId = null, rotation = 0, resolveOverlap = true,
    props = {}, draw = paintArt, bounds = artBounds,
}) {
    if (!getApp()) return null

    const center = getViewportCenter()
    const { x, y } = resolveOverlap
        ? resolveSpawnPoint(preferredX ?? center.x, preferredY ?? center.y, occupiedBy(getLayers().accessory))
        : { x: preferredX ?? center.x, y: preferredY ?? center.y }

    const node = createNode({
        kind,
        nodeId,
        x, y,
        rotation,
        props: { width, height, ...props },
        draw,
        bounds,
    })
    node.itemData = item

    return node
}

export function placeAccessory(node, band) {
    band.addChild(node)
    mirrorNewNode(node)
    return node
}

const warned = new Set()

export async function loadArt(node, url, { frame = null } = {}) {
    if (!url) return
    try {
        const texture = await Assets.load(url)
        if (!node.parent) return
        node.texture = frame ? frame(texture) : texture
        node.repaint()
    } catch (err) {
        if (warned.has(url)) return
        warned.add(url)
        console.error(`[canvas] accessory art failed to load: ${url}`, err)
    }
}
