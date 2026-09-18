const listeners = new Map()

export function onTableEvent(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set())
    listeners.get(name).add(fn)
    return () => { listeners.get(name)?.delete(fn) }
}

export function emitTableEvent(name, detail = {}) {
    for (const fn of [...(listeners.get(name) ?? [])]) {
        try {
            fn(detail)
        } catch (err) {
            console.error(`[table] a '${name}' listener threw`, err)
        }
    }
}
