export { createTable } from './table.js'

export function hasSimulator(config) {
    return !!config?.simulator
}

export { foldName } from './fold-name.js'
export { isDoubleTap, resetDoubleTap, TAP_MOVE_SLOP } from './double-tap.js'
export { LIFT_RISE_PX, LIFT_SCALE } from './tactility/core.js'
