// Keeping a fresh spawn from landing exactly on top of an identical one.
//
// Exact coincidence is the case worth catching automatically, and the only one. A deck dealt
// twice at the same anchor produces byte-identical positions, so the second deal is completely
// invisible: the player sees one pile, drags it, and discovers another underneath — which is
// how three misclicked decks read as one. Partial overlap is ordinary table use (a card played
// onto a mat, a die resting on a deck) and is left alone.
//
// Cards already had this, on their own diagonal step of 8 — small, because the point there is
// to fan duplicate drops apart. A whole deal or a playmat needs a step you can see across the
// width of the thing being moved, hence the larger one here.

const SPAWN_NUDGE = 40

// Give up rather than spin: `occupied` is caller-supplied, and a predicate that is somehow
// always true would otherwise hang the table. Landing on top after 64 steps is a far better
// failure than a frozen tab.
const MAX_STEPS = 64

// Steps diagonally until `occupied(x, y)` says the point is free. The predicate decides what
// "taken" means — the callers all ask their own layer whether a node sits on that exact point.
export function resolveSpawnPoint(x, y, occupied) {
    let nx = x
    let ny = y
    for (let step = 0; step < MAX_STEPS && occupied(nx, ny); step++) {
        nx += SPAWN_NUDGE
        ny += SPAWN_NUDGE
    }
    return { x: nx, y: ny }
}

// The shape every accessory adder needs: is one of this band's nodes already sitting exactly
// here? Accessories are centre-origin, so comparing positions compares centres.
//
// The only line the port touches: Konva's getChildren()/x()/y() become Pixi's children/x/y.
export function occupiedBy(band) {
    return (x, y) => (band?.children ?? []).some(n => n.x === x && n.y === y)
}
