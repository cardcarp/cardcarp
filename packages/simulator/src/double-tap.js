export const DOUBLE_TAP_MS = 300

export const DOUBLE_TAP_SLOP = 24

export const TAP_MOVE_SLOP = 8

let last = null

export function isDoubleTap(target, x, y) {
    const now = Date.now()
    const hit = !!last
        && last.target === target
        && now - last.time <= DOUBLE_TAP_MS
        && Math.hypot(x - last.x, y - last.y) <= DOUBLE_TAP_SLOP

    last = hit ? null : { target, time: now, x, y }
    return hit
}

export function resetDoubleTap() {
    last = null
}
