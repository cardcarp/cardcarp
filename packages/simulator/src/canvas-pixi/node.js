import { Container, Graphics, Rectangle } from 'pixi.js'

const DEG = Math.PI / 180

export function createNode({ kind, nodeId = null, x = 0, y = 0, rotation = 0, props = {}, draw, bounds, hitArea }) {
    const node = new Container()
    node.kind = kind
    node.nodeId = nodeId
    node.position.set(x, y)
    node.rotation = rotation * DEG
    node.props = { ...props }

    const face = new Container()
    const gfx = new Graphics()
    face.addChild(gfx)
    node.addChild(face)
    node.face = face
    node.gfx = gfx

    node.__draw = draw
    node.__bounds = bounds
    node.__hitArea = hitArea

    node.repaint = () => {
        for (const child of [...face.children]) {
            if (child !== gfx) child.destroy({ children: true })
        }
        gfx.clear()
        draw(gfx, node.props, node)
        applyHitArea(node)
    }

    node.setProps = (patch) => {
        let changed = false
        for (const [key, value] of Object.entries(patch)) {
            if (node.props[key] === value) continue
            node.props[key] = value
            changed = true
        }
        if (changed) node.repaint()
        return changed
    }

    node.eventMode = 'static'
    node.repaint()
    return node
}

function applyHitArea(node) {
    if (node.__hitArea) {
        node.hitArea = node.__hitArea(node.props, node)
        return
    }
    if (!node.__bounds) return
    const b = node.__bounds(node.props, node)
    node.hitArea = new Rectangle(b.x, b.y, b.width, b.height)
}

export function nodeBounds(node) {
    return node.__bounds ? node.__bounds(node.props, node) : { x: 0, y: 0, width: 0, height: 0 }
}

export function screenRect(node) {
    const b = (node?.face ?? node).getBounds()
    return { x: b.x, y: b.y, width: b.width, height: b.height }
}
