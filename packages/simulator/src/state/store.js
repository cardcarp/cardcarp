// Stores — the table's state, for everything that is not a template.
//
// A store is a value you can read, replace, and be told about, and nothing more: no Proxy, no
// dependency tracking, no framework. That is the point of it. The table is meant to be rendered
// by whatever a UI is written in, and each of those already knows how to hold a value that
// changes — React through useSyncExternalStore, Svelte through its store contract, Vue through a
// shallowRef (composable/use-store.js). What they do not share is anybody else's reactivity, so
// the table does not bring one.
//
//   const seats = store([])
//   seats.get()                          the current value
//   seats.set(next)  seats.update(fn)    replace it
//   seats.listen(fn)                     fn(value, previous) on each change; returns a stop function
//   seats.subscribe(fn)                  the same, plus one call straight away (Svelte's contract)
//
// === Replaced, never edited ===
//
// A store knows its value changed when it is handed a different one. `list.push(card)` on a value
// you read changes nothing it can see, so nobody hears about it. Every write is a new value —
// `update(list => [...list, card])` — and that one rule pays for the rest: a listener can tell
// what changed by comparing references, React gets a new snapshot, and a seat whose hand did not
// change is still the same object.
//
// setStrict(true) freezes values on their way out, so an edit in place throws instead of quietly
// going unheard. It is for development; a host turns it on (createTable's strict option).
//
// Except a raw store — store(value, { raw: true }) — whose value belongs to someone else: a game's
// config and manifest, handed in by the host (see game.js). Strict mode leaves those alone,
// because they are not the table's to freeze, and a manifest can be tens of megabytes to walk.
//
// === derived and batch ===
//
// derived([a, b], ([a, b]) => …) is a read-only store worked out from others. It is recomputed on
// the first read after a source changes, so a read is never half-updated, and it announces only
// when its answer changes — a derived string is a change signature for free.
//
// Listeners run synchronously, as the write happens. Writes that belong together go inside
// batch(), which holds every announcement until the outermost batch ends and then makes each one
// once. Without it listeners see the steps in between: joining a room sets `online` before the
// room's seats arrive, and a listener on the player's own seat watches it go null and come back.
//
// A derived store holds on to its sources for good, so make them at module scope beside the state
// they describe, not per component. One table per page makes that the natural shape anyway.
//
// when(source, predicate) is a promise for the first value that passes — for code that has to
// wait on something handed in later, like a game's manifest landing seconds after the table opens.

let strict = false
let batch_depth = 0
let flushing = false

// Nodes with a change to announce, in the order they changed.
const pending = new Set()

// A store's bookkeeping, kept off the object callers hold so the API is the functions above and
// nothing a UI could come to lean on.
const internals = new WeakMap()

export function setStrict(on) {
    strict = !!on
}

// Deep, but only through plain objects and arrays. A class instance — a texture, a DOM node — is
// not table state, and freezing one breaks the library it belongs to. Stops at anything already
// frozen, so a new value that reuses most of the last one only walks what is new.
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
            // A node nobody listens to is not re-read when it changes (see flush), so what it last
            // announced can be out of date. Catch it up before its first listener, or that
            // listener's first `previous` — and whether it hears the change at all — would be wrong.
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

// Mark everything downstream of a change stale now, so any read from here on recomputes, and queue
// all of it to be announced when the batch is over.
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
    // A write made by a listener lands in `pending` and is picked up by the loop below, rather than
    // starting a second flush inside this one.
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
                        // One broken listener must not cost every other one its update.
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

// The first value of `source` that passes `predicate`, as a promise — resolved straight away when
// the current one already does. `source` may be a list of stores, in which case the predicate is
// handed their values together (and has to be given):
//
//   await when(gameConfig)
//   await when([gameManifest, gameError], ([manifest, error]) => manifest || error)
//
// It stops listening the moment it resolves. One that never resolves listens for the life of the
// page, so a caller that can be abandoned (a table closed before its data arrives) checks a token
// once it wakes rather than relying on the wait to be called off.
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

// A store as its readers see it: get, listen and subscribe, and nothing that writes. What the table
// hands a UI (see table.js), so the only way to change table state is through the verbs that own it.
export function readonly(source) {
    return Object.freeze({
        get: () => source.get(),
        listen: (fn) => source.listen(fn),
        subscribe: (fn) => source.subscribe(fn),
    })
}

// === Persistence ===
//
// The formats @vueuse/core's useStorage wrote, so a returning player's seats survive the switch
// away from it: strings bare, numbers and booleans as their text, everything else as JSON. Which
// one is picked from the store's starting value, as it was there.
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
        // Storage is blocked (a sandboxed frame, site data off). The table still works; it forgets.
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
        // Written straight away when missing, as useStorage did.
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

    // Another tab wrote the key. useStorage followed these by default, so two tabs of one profile
    // keep seeing the same local state, as they did before the switch.
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
