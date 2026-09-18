import { Texture, Rectangle, Text, TextStyle } from 'pixi.js'

import { getLayers, setWorldRotation } from '../scene.js'
import { getSelected, broadcastSelectionUI } from '../selection.js'
import { variantArtUrl } from './art.js'
import { createAccessory, placeAccessory } from './accessory.js'
import { Assets } from 'pixi.js'
import { theme } from '../../theme.js'
import { toPixiColor } from '../color.js'

// Tool metadata
export const id = 'dice'

export const selection_style = 'piece'

const DEFAULT_DIE_SIZE = 80
const ROLL_DURATION_MS = 900

export function selectionPayload(node) {
    return {
        itemData: node.itemData ?? null,
        value: node.props.value,
        min: node.props.min,
        max: node.props.max,
        step: node.props.step,
        variant: node.diceVariant ?? null,
        variants: node.diceVariants ?? [],
    }
}

// The sheet's own pixels decide where the cuts fall. The item's width and height
// are how big the die is drawn on the table, not how its sheet is laid out.
function sliceFrames(sheet, node) {
    const { diceFrameCols: cols, diceFrameRows: rows, diceFrameTotal: total } = node
    const source = sheet.source
    const w = source.width / cols
    const h = source.height / rows
    const frames = []
    for (let i = 0; i < total; i++) {
        frames.push(new Texture({
            source,
            frame: new Rectangle((i % cols) * w, Math.floor(i / cols) * h, w, h),
        }))
    }
    return frames
}

export function addDice(item, preferredX, preferredY, options = {}) {
    const dieW = item?.size?.width ?? DEFAULT_DIE_SIZE
    const dieH = item?.size?.height ?? DEFAULT_DIE_SIZE
    const cols = Math.max(1, item?.size?.col ?? 1)
    const rows = Math.max(1, item?.size?.row ?? 1)
    const totalFrames = Math.min(cols * rows, Math.max(1, item?.size?.total ?? 1))

    const min = item?.min ?? 1
    const max = item?.max ?? 6
    const step = item?.step && item.step > 0 ? item.step : 1

    const variants = Array.isArray(item?.variant) ? item.variant : []
    const { value = min, variant = variants[0] ?? null, nodeId = null, rotation = 0, resolveOverlap = true } = options

    const node = createAccessory({
        kind: 'dice',
        item, preferredX, preferredY,
        width: dieW, height: dieH,
        nodeId, rotation, resolveOverlap,
        props: { value, min, max, step },
    })
    if (!node) return

    node.diceVariants = variants
    node.diceVariant = variant
    node.diceImgBase = item?.img ?? null
    node.diceFrameCols = cols
    node.diceFrameRows = rows
    node.diceFrameTotal = totalFrames
    node.diceFrames = null

    const label = new Text({
        text: String(value),
        style: new TextStyle({
            fontFamily: theme().font,
            fontSize: dieH * 0.5,
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

    loadSheet(node, variantArtUrl(item?.img, variant))
    return node
}

const sheet_warned = new Set()

async function loadSheet(node, url) {
    if (!url) return
    try {
        const source = await Assets.load(url)
        if (!node.parent) return
        node.diceFrames = sliceFrames(source, node)
        node.texture = node.diceFrames[Math.max(0, node.diceFrameTotal - 1)]
        node.repaint()
    } catch (err) {
        if (sheet_warned.has(url)) return
        sheet_warned.add(url)
        console.error(`[canvas] dice spritesheet failed to load: ${url}`, err)
    }
}

function setValue(node, value) {
    if (node?.kind !== 'dice') return
    const clamped = Math.max(node.props.min, Math.min(node.props.max, value))
    node.setProps({ value: clamped })
    if (node.label) node.label.text = String(clamped)
}

function setVariant(node, variant) {
    if (node?.kind !== 'dice' || !variant) return
    node.diceVariant = variant
    loadSheet(node, variantArtUrl(node.diceImgBase, variant))
}

function animateRoll(node, finalValue) {
    const total = node.diceFrameTotal
    if (total <= 1 || !node.diceFrames) {
        setValue(node, finalValue)
        return
    }

    if (node._rollRaf) {
        cancelAnimationFrame(node._rollRaf)
        node._rollRaf = null
    }

    if (node.label) node.label.visible = false
    const start = performance.now()

    const tick = (now) => {
        if (!node.parent) { node._rollRaf = null; return }
        const t = Math.min(1, (now - start) / ROLL_DURATION_MS)
        const eased = 1 - Math.pow(1 - t, 3)
        const frameIdx = Math.min(total - 1, Math.floor(eased * total))
        node.texture = node.diceFrames[frameIdx]
        node.repaint()

        if (t < 1) {
            node._rollRaf = requestAnimationFrame(tick)
        } else {
            node.texture = node.diceFrames[total - 1]
            node.repaint()
            setValue(node, finalValue)
            if (node.label) node.label.visible = true
            node._rollRaf = null
        }
    }
    node._rollRaf = requestAnimationFrame(tick)
}

function rollOne(node) {
    const { min, max, step } = node.props
    const buckets = Math.max(1, Math.floor((max - min) / step) + 1)
    return min + Math.floor(Math.random() * buckets) * step
}

function selectedDice() {
    return getSelected().filter(n => n.kind === 'dice')
}

export function roll() {
    for (const d of selectedDice()) animateRoll(d, rollOne(d))
}

export function increment() {
    for (const d of selectedDice()) setValue(d, d.props.value + d.props.step)
}

export function decrement() {
    for (const d of selectedDice()) setValue(d, d.props.value - d.props.step)
}

export function changeVariant(variant) {
    const dice = selectedDice()
    if (dice.length === 0) return
    for (const d of dice) setVariant(d, variant)
    broadcastSelectionUI(true)
}

export function applyPatch(node, props) {
    if (node?.kind !== 'dice') return
    for (const [key, value] of Object.entries(props)) {
        if (key === 'value')         setValue(node, value)
        else if (key === 'variant')  setVariant(node, value)
        else if (key === 'rotation') setWorldRotation(node, value)
    }
}

export function applyRoll(node, value) {
    if (node?.kind !== 'dice') return
    animateRoll(node, value)
}

export function expandToGroup(node) {
    return [node]
}
