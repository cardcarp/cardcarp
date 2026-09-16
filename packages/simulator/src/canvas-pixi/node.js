// The node contract — the one piece of shared machinery the port earns.
//
// Konva's Shape base class gave every tool an attribute API for free: rect.fill('red'),
// rect.width(), node.opacity(0.8), each one a getter/setter that marked the node dirty and
// redrew it. A Pixi Graphics has none of that — it is a display list you issue drawing commands
// into — so without something here, EVERY tool would grow its own copy of "hold the model, and
// re-issue the drawing when it changes". Nine tools, nine copies, nine chances to forget one.
//
// So a node is:
//   - a Container, which is the drag/selection/sync unit, exactly as the Konva Group was
//   - `kind`, replacing Konva's space-separated `name` (see tools/index.js)
//   - `nodeId`, the multiplayer-stable id, unchanged
//   - `props`, the authored model — the thing the wire format carries
//   - `repaint()`, which re-issues the drawing from props
//   - `hitArea`, restated whenever the geometry changes
//
// That last line is the trap this file exists to close. Konva derived a node's hit region from
// the shape it had drawn, so a resized rect was clickable at its new size automatically. Pixi
// hit-tests against a hitArea you state, and a stale one is invisible: the node draws correctly
// and stops being clickable where it looks. It bit this port twice before this file existed —
// once on card size arriving after config load, once on rect resize — so setProps does both
// halves together and nothing else is allowed to write props.

import { Container, Graphics, Rectangle } from 'pixi.js'

const DEG = Math.PI / 180

// `draw`   (graphics, props, node) — issue the drawing into a cleared, reused Graphics.
//                            Called on create and on every prop change.
// `bounds` (props, node) → { x, y, width, height } in the node's own space. The node's BOX:
//                            what the selection chrome is drawn around, and the default hit area.
// `hitArea` (props, node) → an optional Pixi hit area (anything with contains(x, y)) for a node
//                            whose clickable shape is not its box. Re-derived on every repaint,
//                            exactly like bounds — see applyHitArea.
//
// Both take the node, and `bounds` takes it for a reason worth stating: a tool whose geometry is
// MEASURED rather than declared — text, whose box is whatever the glyphs came out as — has to
// read something off the node to answer. Handing it in is the only way to do that, because the
// node does not exist yet from the caller's point of view: createNode repaints synchronously
// before it returns, so a `bounds` closure written as `(props) => f(props, node)` over the
// caller's own `const node = createNode(...)` hits the temporal dead zone and throws. That is
// not hypothetical — it is exactly how the text tool shipped, dead on first use.
export function createNode({ kind, nodeId = null, x = 0, y = 0, rotation = 0, props = {}, draw, bounds, hitArea }) {
    const node = new Container()
    node.kind = kind
    node.nodeId = nodeId
    node.position.set(x, y)
    node.rotation = rotation * DEG
    node.props = { ...props }

    // The face is a child rather than the node itself, for the reason tactility needs it to be:
    // motion writes to the face and never to the node, so a settling card cannot desync a table.
    // See canvas-pixi/tactility.js.
    //
    // Inside it, ONE persistent Graphics that every repaint clears and re-issues into. Not a
    // fresh Graphics per repaint: a card repaints on every face flip, art arrival and hover
    // change, and the merge-hover scan can drive that at frame rate — churning display objects
    // there would allocate for no reason. Konva got this for free because its attribute setters
    // mutated a node in place; the equivalent here is reusing the drawing surface.
    const face = new Container()
    const gfx = new Graphics()
    face.addChild(gfx)
    node.addChild(face)
    node.face = face
    node.gfx = gfx

    node.__draw = draw
    node.__bounds = bounds
    node.__hitArea = hitArea

    // Clearing the Graphics is not enough on its own: a tool whose face is not pure geometry —
    // text, and anything drawing a framed sprite — adds a child instead of issuing commands, and
    // those would pile up one per repaint. A text node repainted on every keystroke would end
    // the edit with a stack of identical labels.
    //
    // So a repaint returns the face to exactly one child (the Graphics) before it runs.
    node.repaint = () => {
        for (const child of [...face.children]) {
            if (child !== gfx) child.destroy({ children: true })
        }
        gfx.clear()
        draw(gfx, node.props, node)
        applyHitArea(node)
    }

    // The only door onto props. Patches, so callers say what changed rather than restating the
    // model, which is also the shape the wire format's prop patches arrive in.
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

// Re-derived on every repaint, which is the whole reason `hitArea` is part of this contract
// rather than something a tool assigns once after createNode.
//
// The arrow did assign it once, and it worked exactly until the first prop change — every
// setProps repaints, and every repaint came back through here and replaced the arrow's narrow
// capsule with the axis-aligned box of its own bounds. Since drawing an arrow calls setProps on
// every pointermove, the capsule never survived past the first frame. A diagonal line's bounding
// box is mostly empty space, so the arrow was grabbable across a large rectangle it did not
// visually occupy.
function applyHitArea(node) {
    if (node.__hitArea) {
        node.hitArea = node.__hitArea(node.props, node)
        return
    }
    if (!node.__bounds) return
    const b = node.__bounds(node.props, node)
    node.hitArea = new Rectangle(b.x, b.y, b.width, b.height)
}

// A node's own box, in its own space — what the hit area is stated from, and what a tool asks
// for when it needs the geometry without going through a render.
export function nodeBounds(node) {
    return node.__bounds ? node.__bounds(node.props, node) : { x: 0, y: 0, width: 0, height: 0 }
}

// The node's box in SCREEN space — Konva's getClientRect, and the one measurement every
// geometry consumer should use.
//
// Measured off the FACE rather than the node, and that is load-bearing rather than tidy. A node
// carries children that are not the thing itself: a count badge, and — once a piece is picked up
// — the shadow it casts, which by design extends well past the card on every side. Pixi v8's
// getBounds() walks the whole subtree and does NOT skip children merely because they are
// invisible, so a node's own bounds grow by the shadow's spread the moment one is worn, and stay
// grown afterwards.
//
// That is not a cosmetic difference. It silently widened three separate things at once: the
// selection chrome drew a box around the card AND its shadow, the marquee selected cards the
// band never touched, and the drag-hover merge fired against a footprint half again too big.
// All from one lifted card. Measuring the face asks the question that was always meant — how big
// is this object — instead of how much space its subtree happens to occupy.
export function screenRect(node) {
    const b = (node?.face ?? node).getBounds()
    return { x: b.x, y: b.y, width: b.width, height: b.height }
}
