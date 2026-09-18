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
