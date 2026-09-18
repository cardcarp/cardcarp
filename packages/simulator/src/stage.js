import { NO_TINT, theme } from './theme.js'

const DEFAULT_STAGE_WIDTH = 1920

const DEFAULT_CARD = Object.freeze({ width: 77, height: 108 })

const DEFAULT_SEAT = Object.freeze({ width: 768, height: 432 })

const SEAM_GAP = 24
const CHIP_GAP = 24
export const CHIP_BOX = Object.freeze({ width: 180, height: 60 })

const LANE_GAP = 128

const DEFAULT_SURFACE = Object.freeze({
    img: '',
    scale: 1,
    alpha: 1,
    tint: NO_TINT,
})

let active = {
    width: DEFAULT_STAGE_WIDTH,
    card: DEFAULT_CARD,
    seat: DEFAULT_SEAT,
    shared: Object.freeze({ width: 0, height: 0 }),
    edge: Object.freeze({ color: theme().table.edge, img: '' }),
}

export function configureStage(config) {
    const sim = config?.simulator
    const table = sim?.table
    const seat = sim?.deal?.player?.seat
    const width = Number(table?.stage?.width)

    const surfaceScale = Number(table?.surface?.scale)
    const surfaceAlpha = Number(table?.surface?.alpha)

    active = {
        width: width > 0 ? width : DEFAULT_STAGE_WIDTH,
        card: sizeOr(sim?.card, DEFAULT_CARD),
        seat: seat ? sizeOr(seat, { width: 0, height: 0 }) : DEFAULT_SEAT,
        shared: sizeOr(sim?.deal?.game?.shared, { width: 0, height: 0 }),
        edge: Object.freeze({
            color: table?.edge?.color ?? theme().table.edge,
            img: typeof table?.edge?.img === 'string' ? table.edge.img : '',
        }),
        surface: Object.freeze({
            color: table?.surface?.color ?? theme().table.surface,
            img: typeof table?.surface?.img === 'string' ? table.surface.img : DEFAULT_SURFACE.img,
            scale: surfaceScale > 0 && Number.isFinite(surfaceScale) ? surfaceScale : DEFAULT_SURFACE.scale,
            alpha: Number.isFinite(surfaceAlpha) ? Math.min(1, Math.max(0, surfaceAlpha)) : DEFAULT_SURFACE.alpha,
            tint: table?.surface?.tint ?? DEFAULT_SURFACE.tint,
        }),
    }
    return active
}

export function edgeStyle() {
    return active.edge
}

export function surfaceStyle() {
    return active.surface
}

function sizeOr(value, fallback) {
    const width = Number(value?.width)
    const height = Number(value?.height)
    return Object.freeze({
        width: width >= 0 && Number.isFinite(width) ? width : fallback.width,
        height: height >= 0 && Number.isFinite(height) ? height : fallback.height,
    })
}

function chrome() {
    return (active.seat.height > 0 ? SEAM_GAP : 0) + CHIP_GAP + CHIP_BOX.height
}

export function chipGap() {
    return CHIP_GAP
}

export function seatDepth() {
    return active.seat.height + chrome()
}

export function stageSize() {
    return {
        width: active.width,
        height: active.shared.height + 2 * seatDepth(),
    }
}

export function cardSize() {
    return active.card
}

export function cardHeight() {
    return active.card.height
}

export function anchorY() {
    return active.shared.height / 2 + seatDepth() - CHIP_BOX.height / 2
}

export function seatBox() {
    const { width, height } = active.seat
    return {
        x: -width / 2,
        y: -(anchorY() - active.shared.height / 2 - SEAM_GAP),
        width,
        height,
    }
}

export function sharedBox() {
    const { width, height } = active.shared
    return {
        x: -(width || active.width) / 2,
        y: -height / 2,
        width: width || active.width,
        height,
    }
}

export function sharedPoint(point) {
    const box = sharedBox()
    return {
        x: box.x + (Number(point?.x) || 0),
        y: box.y + (Number(point?.y) || 0),
    }
}

export function laneStep() {
    return (active.seat.width || CHIP_BOX.width) + LANE_GAP
}

export function lanesPerSide() {
    return Math.max(1, Math.floor((active.width + LANE_GAP) / laneStep()))
}

export function laneX(index, count) {
    return (index - (Math.max(1, count) - 1) / 2) * laneStep()
}

export function worldRect(seatCount = 1) {
    const lanes = Math.max(1, Math.ceil((Number(seatCount) || 1) / 2))
    const span = active.seat.width || CHIP_BOX.width
    const content = lanes * span + (lanes - 1) * LANE_GAP
    const width = Math.max(active.width, content + LANE_GAP * 2)
    return {
        x: -width / 2,
        y: -stageSize().height / 2,
        width,
        height: stageSize().height,
    }
}

export function tableFocus() {
    return { x: 0, y: 0 }
}

export function edgeBands(point, rect, depth = 0) {
    const none = { left: false, right: false, top: false, bottom: false }
    if (!point || !rect) return none
    const d = Math.max(0, Math.min(depth, rect.width / 2, rect.height / 2))
    return {
        left: point.x < rect.x + d,
        right: point.x > rect.x + rect.width - d,
        top: point.y < rect.y + d,
        bottom: point.y > rect.y + rect.height - d,
    }
}

export function cameraInterval(span, from, extent, scale) {
    const min = span - (from + extent) * scale
    const max = -from * scale
    if (min <= max) return { min, max, locked: false }
    const middle = (min + max) / 2
    return { min: middle, max: middle, locked: true }
}

export const RUBBER_C = 0.55

export function rubberBand(overflow, viewport) {
    const d = Math.abs(overflow)
    if (!(viewport > 0) || d === 0) return 0
    return Math.sign(overflow) * ((d * viewport * RUBBER_C) / (viewport + RUBBER_C * d))
}

export const SHAKE_CYCLES = 3

export function shakeOffset(t, amplitude) {
    if (!(t > 0) || t >= 1) return 0
    return Math.sin(t * Math.PI * 2 * SHAKE_CYCLES) * amplitude * (1 - t)
}
