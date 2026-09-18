const SPAWN_NUDGE = 40

const MAX_STEPS = 64

export function resolveSpawnPoint(x, y, occupied) {
    let nx = x
    let ny = y
    for (let step = 0; step < MAX_STEPS && occupied(nx, ny); step++) {
        nx += SPAWN_NUDGE
        ny += SPAWN_NUDGE
    }
    return { x: nx, y: ny }
}

export function occupiedBy(band) {
    return (x, y) => (band?.children ?? []).some(n => n.x === x && n.y === y)
}
