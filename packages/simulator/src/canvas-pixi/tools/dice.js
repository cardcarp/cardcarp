// canvas/tools/dice.js, ported. A randomiser whose face is an outcome: a spritesheet that
// tumbles and settles, with the value written across the resting frame.
//
// The one place the renderer actually changed the code rather than the spelling. Konva's Image
// takes a `crop` rect and re-crops the SAME bitmap per frame; Pixi has no crop, because a
// texture already IS a rect on a source. So the roll builds one Texture per frame up front and
// swaps between them, which is both the idiomatic answer and a cheaper one — the crop rect was
// recomputed every animation frame, and these are computed once per die.

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

const DEFAULT_FRAME_SIZE = 80
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

// Slice a loaded spritesheet into one Texture per frame. Konva re-cropped a single image on
// every animation frame; a Texture is a view onto a source, so these are made once and the
// roll only swaps which one is current.
function sliceFrames(source, node) {
    const { diceFrameCols: cols, diceFrameW: w, diceFrameH: h, diceFrameTotal: total } = node
    const frames = []
    for (let i = 0; i < total; i++) {
        frames.push(new Texture({
            source: source.source,
            frame: new Rectangle((i % cols) * w, Math.floor(i / cols) * h, w, h),
        }))
    }
    return frames
}

// `item` shape (v1):
//   { name, type: 'dice', size: { width, height, row, col, total }, color, min, max, step, img }
// The image is a spritesheet of cols*width × rows*height. Frame 0 is the first cell; the last
// frame (total - 1) is blank — rendered at rest with the current value overlaid.
export function addDice(item, preferredX, preferredY, options = {}) {
    const frameW = item?.size?.width ?? DEFAULT_FRAME_SIZE
    const frameH = item?.size?.height ?? DEFAULT_FRAME_SIZE
    const cols = item?.size?.col ?? 1
    const rows = item?.size?.row ?? 1
    const totalFrames = item?.size?.total ?? 1

    const min = item?.min ?? 1
    const max = item?.max ?? 6
    const step = item?.step && item.step > 0 ? item.step : 1

    // Variant = pre-rendered coloured spritesheet. First variant is the default.
    const variants = Array.isArray(item?.variant) ? item.variant : []
    const { value = min, variant = variants[0] ?? null, nodeId = null, rotation = 0, resolveOverlap = true } = options

    const node = createAccessory({
        kind: 'dice',
        item, preferredX, preferredY,
        width: frameW, height: frameH,
        nodeId, rotation, resolveOverlap,
        props: { value, min, max, step },
    })
    if (!node) return

    node.diceVariants = variants
    node.diceVariant = variant
    node.diceImgBase = item?.img ?? null
    node.diceFrameCols = cols
    node.diceFrameRows = rows
    node.diceFrameW = frameW
    node.diceFrameH = frameH
    node.diceFrameTotal = totalFrames
    node.diceFrames = null

    const label = new Text({
        text: String(value),
        style: new TextStyle({
            fontFamily: theme().font,
            fontSize: frameH * 0.5,
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

    // Load the chosen variant's sheet, not the bare base: with variants in play there is no
    // variant-less `d6.avif` to fall back on, and the default variant is just variants[0].
    if (item?.img) loadSheet(node, variantArtUrl(item.img, variant))
    return node
}

const sheet_warned = new Set()

async function loadSheet(node, url) {
    if (!url) return
    try {
        const source = await Assets.load(url)
        if (!node.parent) return
        node.diceFrames = sliceFrames(source, node)
        // At rest a die shows the LAST frame, which the sheet leaves blank for the value to sit
        // on. Konva expressed this as restCrop at construction; here it is just which of the
        // pre-sliced textures is current.
        node.texture = node.diceFrames[Math.max(0, node.diceFrameTotal - 1)]
        node.repaint()
    } catch (err) {
        // No sheet means the die draws nothing but its value — which reads as a floating number
        // rather than as a die, so this one is worth saying out loud.
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
    const base = node.diceImgBase
    if (!base) return
    node.diceVariant = variant
    loadSheet(node, variantArtUrl(base, variant))
}

// Cycle the sheet's frames, decelerating, then settle on the rest frame and reveal the new
// value. Per-die rAF loop, so several dice roll at once without contention.
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
        const eased = 1 - Math.pow(1 - t, 3)            // easeOutCubic
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

// Random value in [min, max] respecting step. For a standard D6 this is uniform 1..6; for a
// percentile (min=0, max=100, step=10) it's 0/10/20/.../100.
function rollOne(node) {
    const { min, max, step } = node.props
    const buckets = Math.max(1, Math.floor((max - min) / step) + 1)
    return min + Math.floor(Math.random() * buckets) * step
}

// === Toolbar actions — operate on the current selection ===

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
    // `variant` is part of the selection payload, so the toolbar's colour chip reads from it.
    broadcastSelectionUI(true)
}

// Generic prop patch. Note that `value` here snaps (no animation); for an animated
// roll-then-settle use applyRoll.
export function applyPatch(node, props) {
    if (node?.kind !== 'dice') return
    for (const [key, value] of Object.entries(props)) {
        if (key === 'value')         setValue(node, value)
        else if (key === 'variant')  setVariant(node, value)
        else if (key === 'rotation') setWorldRotation(node, value)
    }
}

// Remote-apply entry for dice:roll events. The server picks the final value so all clients
// agree; each client animates locally to settle on it.
export function applyRoll(node, value) {
    if (node?.kind !== 'dice') return
    animateRoll(node, value)
}

export function expandToGroup(node) {
    return [node]
}
