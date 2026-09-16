// Double tap / double click, recognised by hand rather than left to the platform.
//
// Neither card surface can use the built-in event, and for different reasons:
//
//   the table — the first tap SELECTS the card, which raises the transformer, and the
//     transformer's overdraw rect then covers it (see shouldOverdrawWholeArea in
//     selection.js). Konva keys dblclick/dbltap on the shape the taps actually hit, so the
//     second one lands on the transformer instead and the card never sees a double tap. It
//     is the same reason cardUnderTouch in canvas/tools/card.js resolves the card off the
//     card layer instead of off the event.
//
//   the hand — a Motion element with `touch-action: none` under an implicit pointer
//     capture, on a surface where a browser-synthesised dblclick from a touch is not
//     something to rely on.
//
// So both surfaces resolve "what was tapped" their own way and ask here whether this tap
// completes a double. One module-level `last` is shared between them deliberately: a tap on
// the table followed by a tap in the hand is two different targets and so is not a double
// tap, which is exactly the answer a shared slot gives.

// Short enough that it reads as a deliberate quick double rather than two separate taps a
// beat apart. That matters more here than the usual 400ms platform window does, because the
// action on the other side of it turns a card over — in a room with other players watching.
export const DOUBLE_TAP_MS = 300

// How far the two taps may land apart and still count as the same one. Generous, because a
// finger is not a mouse: the same intended spot moves several pixels between taps.
export const DOUBLE_TAP_SLOP = 24

// How far a single pointer may travel between down and up and still be a tap at all, rather
// than the beginning of a drag. Matches the canvas's LONG_PRESS_SLOP / Konva dragDistance —
// the same tremor-in-a-resting-finger threshold, asked the same way.
export const TAP_MOVE_SLOP = 8

let last = null

// `target` is whatever identifies the thing tapped — a Konva node on the table, a hand
// entry's id in the hand. Compared by identity, so the two surfaces cannot collide.
//
// Returns true exactly once per double tap: the stored tap is consumed on a hit, so a third
// tap starts a fresh pair rather than firing again.
export function isDoubleTap(target, x, y) {
    const now = Date.now()
    const hit = !!last
        && last.target === target
        && now - last.time <= DOUBLE_TAP_MS
        && Math.hypot(x - last.x, y - last.y) <= DOUBLE_TAP_SLOP

    last = hit ? null : { target, time: now, x, y }
    return hit
}

// Forget the pending tap. Called when a gesture happens that a double tap cannot span — a
// tap on empty table, or a press that turned into a drag — so the tap after it starts clean
// instead of pairing with something from before the interruption.
export function resetDoubleTap() {
    last = null
}
