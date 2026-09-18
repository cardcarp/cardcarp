const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

export function hashSeed(value) {
    let hash = FNV_OFFSET
    const text = String(value ?? '')
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, FNV_PRIME)
    }
    return hash >>> 0
}

export function seededUnit(seed, salt = 0) {
    let hash = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x21f0aaad)
    hash ^= hash >>> 15
    hash = Math.imul(hash, 0x735a2d97)
    hash ^= hash >>> 15
    return (hash >>> 0) / 4294967296
}

function signed(unit) {
    return unit * 2 - 1
}

const CARD = 108

export const STACK_ROTATION_DEG = 1.6
export const STACK_DRIFT_PX = CARD * (1.1 / 150)
export const SPAWN_LIFT_PX = CARD * (26 / 150)
export const SPAWN_ROTATION_DEG = 7
export const SPAWN_SCALE = 1.06
export const SETTLE_KICK_DEG = 3.5
export const SETTLE_KICK_PX = CARD * (4 / 150)

export const LIFT_SCALE = 1.07
export const LIFT_TILT_DEG = 1.2

export const LIFT_RISE_PX = CARD * (16 / 150)

export const REST_POSE = Object.freeze({ rot: 0, x: 0, y: 0, scale: 1, lift: 0 })

export function restingPose(id, stacked) {
    if (!stacked) return REST_POSE
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 1)) * STACK_ROTATION_DEG,
        x: signed(seededUnit(seed, 2)) * STACK_DRIFT_PX,
        y: signed(seededUnit(seed, 3)) * STACK_DRIFT_PX,
        scale: 1,
        lift: 0,
    }
}

export function spawnPose(id) {
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 11)) * SPAWN_ROTATION_DEG,
        x: signed(seededUnit(seed, 12)) * SPAWN_LIFT_PX * 0.4,
        y: -SPAWN_LIFT_PX * (0.7 + seededUnit(seed, 13) * 0.6),
        scale: SPAWN_SCALE,
        lift: 1,
    }
}

export function settlePose(id) {
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 21)) * SETTLE_KICK_DEG,
        x: signed(seededUnit(seed, 22)) * SETTLE_KICK_PX,
        y: -SETTLE_KICK_PX * (0.6 + seededUnit(seed, 23) * 0.8),
        scale: 1.02,
        lift: 0.15,
    }
}

export function liftPose(id) {
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 31)) * LIFT_TILT_DEG,
        x: 0,
        y: -LIFT_RISE_PX,
        scale: LIFT_SCALE,
        lift: 1,
    }
}

export function mixPose(from, to, t) {
    return {
        rot: from.rot + (to.rot - from.rot) * t,
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        scale: from.scale + (to.scale - from.scale) * t,
        lift: from.lift + (to.lift - from.lift) * t,
    }
}

export function samePose(a, b, epsilon = 0.001) {
    return Math.abs(a.rot - b.rot) < epsilon
        && Math.abs(a.x - b.x) < epsilon
        && Math.abs(a.y - b.y) < epsilon
        && Math.abs(a.scale - b.scale) < epsilon
        && Math.abs(a.lift - b.lift) < epsilon
}

export const TRANSITION = Object.freeze({
    flutter: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
    settle: { type: 'spring', stiffness: 520, damping: 26, mass: 0.9 },

    lift: { duration: 0.14, ease: [0.32, 0.72, 0, 1] },

    drop: { type: 'spring', stiffness: 420, damping: 28, mass: 1.2 },
})
