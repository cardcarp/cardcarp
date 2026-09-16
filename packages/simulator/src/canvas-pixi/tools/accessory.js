// The shape board, marker, counter and dice all have in common.
//
// In Konva these four each spelled out the same fifteen lines: resolve a spawn point, build a
// centre-offset Group, add a Konva.Image, add it to the accessory layer, mirrorNewNode, then
// `new Image()` + onload + batchDraw. The duplication was harmless there because Konva.Image
// WAS the abstraction — one node that took a bitmap and drew it.
//
// Pixi has no such node, so writing it out four times would mean four copies of texture
// loading, four copies of the identity-matrix trap (see card.js), and four places to forget to
// restate the hit area. One helper instead — the same call this file's four callers were
// already making, given a name.

import { Assets, Sprite } from 'pixi.js'

import { getApp, getLayers, getViewportCenter, mirrorNewNode } from '../scene.js'
import { occupiedBy, resolveSpawnPoint } from '../spawn.js'
import { createNode } from '../node.js'

// Draws the accessory's art, or nothing at all while it is still in flight. Unlike a card there
// is no sleeve to fall back to — an accessory with no art is simply not drawn yet, which is
// what the Konva version did too (a Konva.Image with image: null renders nothing).
//
// `frame` crops a spritesheet cell, which is how a die shows one face of its sheet.
// A Sprite, not a Graphics fill — and the difference is not stylistic.
//
// A Graphics texture fill maps the whole SOURCE across the shape and ignores the texture's
// frame. That is invisible for a card, whose texture is the whole image anyway, and it is why
// card.js can fill a rounded rect directly. A die's face is a FRAME on a spritesheet, so filling
// with it drew the entire sheet shrunk into the die's box — a dense grid of tiny die faces,
// which is what shipped before this was caught. A Sprite honours the frame, which is the whole
// job a Sprite has.
//
// Accessories are plain rectangles with no rounded corners, so nothing is lost by not using
// Graphics here; the card is the only thing on this table that needs a fill to be clipped.
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

// `options.resolveOverlap` is off for replays: the sender already stepped clear and broadcast
// where the node actually landed, so re-running the search on a peer would step it again and
// the two copies would drift apart.
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
        rotation,   // world value from the wire format — replays must not lose it
        props: { width, height, ...props },
        draw,
        bounds,
    })
    node.itemData = item

    return node
}

// Place a finished accessory on its band. Split from createAccessory so a tool can add its own
// children (a value overlay) before the node is live.
export function placeAccessory(node, band) {
    band.addChild(node)
    mirrorNewNode(node)
    return node
}

// Load art onto a node and repaint. Every accessory's art arrives this way, and every one of
// them can be destroyed while it is in flight.
// Art that fails to load is REPORTED, not swallowed.
//
// An accessory with no texture draws nothing at all — paintArt returns early — so a failed load
// and a missing item look identical on the table: a die or a playmat that simply is not there.
// The first cut caught and discarded the error on the grounds that there was nothing to
// recover, which is true and beside the point: the person looking at the empty table is the one
// who needs to know, and with the error dropped there was no way for them to tell me anything
// beyond "it isn't rendering".
//
// Warned once per URL, because a table can hold many copies of one accessory and a wall of
// identical errors is its own kind of silence.
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
