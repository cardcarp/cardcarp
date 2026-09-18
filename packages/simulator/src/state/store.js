let strict = false
let batch_depth = 0
let flushing = false

const pending = new Set()

const internals = new WeakMap()

export function setStrict(on) {
    strict = !!on
}

function freeze(value) {
    if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) return value
    Object.freeze(value)
    for (const child of Object.values(value)) freeze(child)
    return value
}

function createNode(read, raw) {
    const node = { read, raw, listeners: new Set(), dependents: new Set(), emitted: undefined, stale: false }
    const api = {
        get: () => (strict && !raw ? freeze(node.read()) : node.read()),
        listen: (fn) => {
            if (node.listeners.size === 0) node.emitted = node.read()
            node.listeners.add(fn)
            return () => { node.listeners.delete(fn) }
        },
        subscribe: (fn) => {
            fn(api.get(), undefined)
            return api.listen(fn)
        },
    }
    internals.set(api, node)
    return { node, api }
}

function touch(origin) {
    const seen = new Set([origin])
    const visit = (node) => {
        pending.add(node)
        for (const dependent of node.dependents) {
            dependent.stale = true
            if (seen.has(dependent)) continue
            seen.add(dependent)
            visit(dependent)
        }
    }
    visit(origin)
}

function flush() {
    if (flushing) return
    flushing = true
    try {
        while (pending.size > 0) {
            const nodes = [...pending]
            pending.clear()
            for (const node of nodes) {
                if (node.listeners.size === 0) continue
                const value = node.read()
                if (Object.is(value, node.emitted)) continue
                const previous = node.emitted
                node.emitted = value
                const out = strict && !node.raw ? freeze(value) : value
                for (const fn of [...node.listeners]) {
                    try {
                        fn(out, previous)
                    } catch (err) {
                        console.error('[store] a listener threw', err)
                    }
                }
            }
        }
    } finally {
        flushing = false
    }
}

export function batch(fn) {
    batch_depth++
    try {
        return fn()
    } finally {
        batch_depth--
        if (batch_depth === 0) flush()
    }
}

export function store(initial, { raw = false } = {}) {
    let value = initial
    const { node, api } = createNode(() => value, raw)
    node.emitted = initial
    api.set = (next) => {
        if (Object.is(next, value)) return
        value = next
        touch(node)
        if (batch_depth === 0) flush()
    }
    api.update = (change) => api.set(change(api.get()))
    return api
}

export function derived(sources, compute, { raw = false } = {}) {
    let value
    const { node, api } = createNode(() => {
        if (node.stale) {
            value = compute(sources.map(source => source.get()))
            node.stale = false
        }
        return value
    }, raw)
    node.stale = true
    for (const source of sources) {
        const upstream = internals.get(source)
        if (!upstream) throw new TypeError('derived() takes stores as its sources')
        upstream.dependents.add(node)
    }
    return api
}

export function when(source, predicate = Boolean) {
    const many = Array.isArray(source)
    const sources = many ? source : [source]
    const read = () => (many ? sources.map(s => s.get()) : source.get())
    return new Promise((resolve) => {
        if (predicate(read())) return resolve(read())
        const stops = sources.map(s => s.listen(() => {
            const values = read()
            if (!predicate(values)) return
            for (const stop of stops) stop()
            resolve(values)
        }))
    })
}

export function readonly(source) {
    return Object.freeze({
        get: () => source.get(),
        listen: (fn) => source.listen(fn),
        subscribe: (fn) => source.subscribe(fn),
    })
}

const SERIALIZERS = {
    string: { read: (raw) => raw, write: (value) => String(value) },
    number: { read: (raw) => Number.parseFloat(raw), write: (value) => String(value) },
    boolean: { read: (raw) => raw === 'true', write: (value) => String(value) },
    object: { read: (raw) => JSON.parse(raw), write: (value) => JSON.stringify(value) },
}

function defaultStorage() {
    try {
        return globalThis.localStorage
    } catch {
        return undefined
    }
}

export function persist(target, key, { storage = defaultStorage(), serializer } = {}) {
    if (!storage) return target

    const initial = target.get()
    const io = serializer ?? SERIALIZERS[typeof initial] ?? SERIALIZERS.object

    const parse = (raw) => {
        if (raw == null) return initial
        try {
            return io.read(raw)
        } catch (err) {
            console.error(`[store] ${key} could not be read; using the default`, err)
            return initial
        }
    }

    try {
        const raw = storage.getItem(key)
        if (raw == null && initial != null) storage.setItem(key, io.write(initial))
        target.set(parse(raw))
    } catch (err) {
        console.error(`[store] ${key} could not be loaded`, err)
    }

    let applying = false
    target.listen((value) => {
        if (applying) return
        try {
            if (value == null) {
                storage.removeItem(key)
                return
            }
            const next = io.write(value)
            if (storage.getItem(key) !== next) storage.setItem(key, next)
        } catch (err) {
            console.error(`[store] ${key} could not be saved`, err)
        }
    })

    if (typeof window !== 'undefined' && storage === defaultStorage()) {
        window.addEventListener('storage', (event) => {
            if (event.key !== key) return
            applying = true
            try {
                target.set(parse(event.newValue))
            } finally {
                applying = false
            }
        })
    }

    return target
}
