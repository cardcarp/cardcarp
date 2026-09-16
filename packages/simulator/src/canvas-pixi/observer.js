// Tiny pub-sub bus for canvas-internal actions that the multiplayer wrapper wants to
// observe but can't trigger directly via the public API — chiefly the drag-hover merge,
// which fires from inside card.js's drag handler. Internal code calls `emitCanvasAction`;
// multiplayer.js subscribes via `onCanvasAction`. Keeps the canvas internals oblivious to
// networking while still allowing observability.

const observers = new Set()

export function onCanvasAction(observer) {
    observers.add(observer)
    return () => observers.delete(observer)
}

export function emitCanvasAction(action) {
    for (const obs of observers) {
        try { obs(action) } catch (e) { console.error('canvas action observer error', e) }
    }
}
