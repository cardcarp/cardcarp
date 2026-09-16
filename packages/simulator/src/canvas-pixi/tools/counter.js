// canvas/tools/counter.js, ported. A standalone number on the table: an image with a value
// written across it that players step up and down by hand.
//
// Deliberately NOT the dice tool with the roll taken out — see the original's header for why a
// life total that re-rolls itself is the bug keeping them apart prevents.

import { Text, TextStyle } from 'pixi.js'

import { getLayers, setWorldRotation } from '../scene.js'
import { getSelected, broadcastSelectionUI } from '../selection.js'
import { variantArtUrl } from './art.js'
import { createAccessory, placeAccessory, loadArt } from './accessory.js'
import { theme } from '../../theme.js'
import { toPixiColor } from '../color.js'

// Tool metadata
export const id = 'counter'

export const selection_style = 'piece'

const DEFAULT_SIZE = 80

// Type sizing. A die shows one glyph and can hard-code a fraction of its box; a counter's
// widest value is whatever `max` says, and a life total three digits wide at a die's type size
// runs off both edges of the art. So the size is derived.
const GLYPH_RATIO = 0.62        // bold advance width ÷ font size, for the family above
const FILL = 0.82               // share of the counter's width the number may occupy
const MAX_FONT_SCALE = 0.5      // ceiling, as a fraction of height — matches dice.js

function fontSizeFor(width, height, min, max) {
    const digits = Math.max(String(min).length, String(max).length, 1)
    return Math.min(height * MAX_FONT_SCALE, (width * FILL) / (digits * GLYPH_RATIO))
}

export function selectionPayload(node) {
    return {
        itemData: node.itemData ?? null,
        value: node.props.value,
        min: node.props.min,
        max: node.props.max,
        step: node.props.step,
        variant: node.counterVariant ?? null,
        variants: node.counterVariants ?? [],
    }
}

export function addCounter(item, preferredX, preferredY, options = {}) {
    const w = item?.size?.width  ?? DEFAULT_SIZE
    const h = item?.size?.height ?? DEFAULT_SIZE

    const min = item?.min ?? 0
    const max = item?.max ?? 99
    // step 0 (or missing) means "no special stepping" — treat manual ± as ±1, as dice does.
    const step = item?.step && item.step > 0 ? item.step : 1

    // Where a counter dropped by hand starts. A die at rest sensibly shows its minimum; a life
    // counter showing 1 is a counter you have to click 39 times before it is any use.
    const start = Number.isFinite(Number(item?.start)) ? Number(item.start) : min

    const variants = Array.isArray(item?.variant) ? item.variant : []
    const {
        value = start,
        variant = variants[0] ?? null,
        nodeId = null,
        rotation = 0,
        resolveOverlap = true,
    } = options

    const node = createAccessory({
        kind: 'counter',
        item, preferredX, preferredY,
        width: w, height: h,
        nodeId, rotation, resolveOverlap,
        props: {
            value: Math.max(min, Math.min(max, value)),
            min, max, step,
        },
    })
    if (!node) return

    node.counterVariants = variants
    node.counterVariant = variant
    node.counterImgBase = item?.img ?? null

    // The value overlay is a child of the NODE, not of the face — the same placement the card's
    // badge takes, and for the same reason: the face is what motion is allowed to move.
    const label = new Text({
        text: String(node.props.value),
        style: new TextStyle({
            fontFamily: theme().font,
            fontSize: fontSizeFor(w, h, min, max),
            fontWeight: 'bold',
            fill: toPixiColor(theme().piece.value),
            align: 'center',
        }),
    })
    label.anchor.set(0.5)
    label.eventMode = 'none'
    node.addChild(label)
    node.label = label

    placeAccessory(node, getLayers().accessory)
    if (item?.img) loadArt(node, variantArtUrl(item.img, variant))
    return node
}

// Per-node mutator — clamps to [min, max] and refreshes the overlay text.
//
// The value lives in props so the payload can read it, but the TEXT is a sibling node rather
// than part of the drawing, so this writes both. Konva had the same split; it just spelled the
// second half as findOne('.counter-value').text().
function setValue(node, value) {
    if (node?.kind !== 'counter') return
    const clamped = Math.max(node.props.min, Math.min(node.props.max, value))
    node.setProps({ value: clamped })
    if (node.label) node.label.text = String(clamped)
}

// Per-node mutator — swaps the art to the named variant, exactly as dice does.
function setVariant(node, variant) {
    if (node?.kind !== 'counter' || !variant) return
    const base = node.counterImgBase
    if (!base) return
    node.counterVariant = variant
    loadArt(node, variantArtUrl(base, variant))
}

// === Toolbar actions — operate on the current selection ===

function selectedCounters() {
    return getSelected().filter(n => n.kind === 'counter')
}

// `value` is part of the selection payload — the toolbar prints the running total between its
// two steppers — so a step has to refresh it or the number on the table and the number under
// the cursor disagree from the first click.
function step(direction) {
    const counters = selectedCounters()
    if (counters.length === 0) return
    for (const c of counters) setValue(c, c.props.value + direction * c.props.step)
    broadcastSelectionUI(true)
}

export function increment() {
    step(1)
}

export function decrement() {
    step(-1)
}

export function changeVariant(variant) {
    const counters = selectedCounters()
    if (counters.length === 0) return
    for (const c of counters) setVariant(c, variant)
    // `variant` is part of the selection payload — refresh so the toolbar's colour chip follows
    // the swap rather than showing the colour the selection was made at.
    broadcastSelectionUI(true)
}

// Generic prop patch — multiplayer.js uses this for value/variant/rotation sync.
//
// Two players can have the same counter selected at once — a life total is exactly the thing
// both of them are watching — so a patch that lands on a selected node has to refresh the
// selection payload as well as the node.
export function applyPatch(node, props) {
    if (node?.kind !== 'counter') return
    let refresh = false
    for (const [key, value] of Object.entries(props)) {
        if (key === 'value')         { setValue(node, value);   refresh = true }
        else if (key === 'variant')  { setVariant(node, value); refresh = true }
        else if (key === 'rotation') setWorldRotation(node, value)
    }
    if (refresh) broadcastSelectionUI(true)
}

export function expandToGroup(node) {
    return [node]
}
