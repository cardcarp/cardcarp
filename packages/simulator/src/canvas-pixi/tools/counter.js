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

const GLYPH_RATIO = 0.62
const FILL = 0.82
const MAX_FONT_SCALE = 0.5

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
    const step = item?.step && item.step > 0 ? item.step : 1

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
    loadArt(node, variantArtUrl(item?.img, variant))
    return node
}

function setValue(node, value) {
    if (node?.kind !== 'counter') return
    const clamped = Math.max(node.props.min, Math.min(node.props.max, value))
    node.setProps({ value: clamped })
    if (node.label) node.label.text = String(clamped)
}

function setVariant(node, variant) {
    if (node?.kind !== 'counter' || !variant) return
    node.counterVariant = variant
    loadArt(node, variantArtUrl(node.counterImgBase, variant))
}

function selectedCounters() {
    return getSelected().filter(n => n.kind === 'counter')
}

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
    broadcastSelectionUI(true)
}

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
