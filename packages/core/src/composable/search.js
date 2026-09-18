import { computed, toValue } from 'vue'
import { get, orderBy } from 'lodash'

export function use_search(dataset, filterConfig, state) {
    const results = computed(() => {
        const items = toValue(dataset)
        if (!Array.isArray(items) || !items.length) return []

        const config = toValue(filterConfig) || {}
        const s = toValue(state)

        let out = items
        out = applyFilters(out, s.filter, config)
        const distinct = s.filter?.distinct ?? toggleDefault(config.distinct)
        if (distinct) out = applyDistinct(out)
        out = applySort(out, s)
        return out
    })

    return { results }
}

export function toggleDefault(def) {
    return def?.default === true || def?.default === 'true'
}

const LIST_TYPES = ['combo', 'check', 'set']

function isList(def) {
    return LIST_TYPES.includes(def?.type)
}

export function listDefault(def) {
    const d = def?.default
    if (d == null) return []
    return (Array.isArray(d) ? d : [d]).map(String)
}

export function selectionValue(selections, key, def) {
    const v = selections?.[key]
    if (v !== undefined) return v
    if (def?.type === 'toggle') return toggleDefault(def)
    if (isList(def)) return listDefault(def)
    return v
}

export function isModified(value, def = {}) {
    if (value === undefined) return false
    if (def.type === 'toggle') return value !== toggleDefault(def)
    if (isList(def)) {
        const cur = Array.isArray(value) ? value.map(String) : []
        const base = listDefault(def)
        return cur.length !== base.length || cur.some((v) => !base.includes(v))
    }
    return hasSelection(value, def)
}

export function isFiltering(selections, key, def = {}) {
    const value = selectionValue(selections, key, def)
    if (key === 'distinct') return value === true
    return hasSelection(value, def)
}

function applyFilters(items, selections, config) {
    const keys = new Set([...Object.keys(config || {}), ...Object.keys(selections || {})])

    const active = [...keys]
        .map((key) => {
            const def = config[key] || {}
            return { key, def, value: selectionValue(selections, key, def) }
        })
        .filter(({ key, value, def }) => key !== 'distinct' && hasSelection(value, def))

    if (!active.length) return items

    return items.filter((item) =>
        active.every(({ key, value, def }) => matchFilter(item, key, value, def))
    )
}

export function hasSelection(value, def = {}) {
    const type = def.type
    if (value == null) return false
    if (type === 'toggle') return true
    if (type === 'slide') return Array.isArray(value) && (value[0] != null || value[1] != null)
    if (type === 'input') return String(value).trim() !== ''
    return Array.isArray(value) ? value.length > 0 : value !== ''
}

function matchFilter(item, key, value, def) {
    const itemValue = String(key).includes('.') ? get(item, key) : item[key]

    if (def.type === 'toggle') {
        return Boolean(itemValue) === (value === true)
    }

    // Numeric range
    if (def.type === 'slide' || def.type === 'number') {
        const [min, max] = Array.isArray(value) ? value : [value, value]
        const n = toNumeric(itemValue)
        if (n == null) return false
        return (min == null || n >= min) && (max == null || n <= max)
    }

    if (itemValue == null) return false

    const hay = Array.isArray(itemValue)
        ? itemValue.map((x) => String(x).toLowerCase())
        : [String(itemValue).toLowerCase()]

    if (def.type === 'input' || def.type === 'text') {
        const needle = String(value).trim().toLowerCase()
        return hay.some((h) => h.includes(needle))
    }

    const targets = (Array.isArray(value) ? value : [value]).map((v) => String(v).toLowerCase())
    return targets.some((t) => hay.includes(t))
}

export function normalizeOptions(def) {
    return flattenOptions(def?.option)
}

function flattenOptions(option, groupPath = []) {
    const out = []
    const group = groupPath.join(' / ') || null

    if (Array.isArray(option)) {
        for (const o of option) out.push({ value: String(o), label: String(o), group })
    } else if (option && typeof option === 'object') {
        for (const [k, v] of Object.entries(option)) {
            if (Array.isArray(v)) {
                for (const o of v) {
                    out.push({ value: String(o), label: String(o), group: [...groupPath, k].join(' / ') })
                }
            } else if (v && typeof v === 'object') {
                out.push(...flattenOptions(v, [...groupPath, k]))
            } else {
                out.push({ value: String(k), label: String(v), group })
            }
        }
    }
    return out
}

function applySort(items, state) {
    if (state.sort === 'random') return shuffle(items)

    const group = state.group && state.group !== 'none' ? state.group : null
    const keys = group ? [group, state.sort] : [state.sort]
    const dirs = group ? ['asc', state.direction] : [state.direction]

    return orderBy(items, keys, dirs)
}

function applyDistinct(items) {
    const latest = new Map()
    const unkeyed = []

    for (const item of items) {
        const oracle = item?.oracle_id ?? item?.origin ?? item?.id
        if (oracle == null) {
            unkeyed.push(item)
            continue
        }

        const existing = latest.get(oracle)
        if (!existing || releaseDate(item) > releaseDate(existing)) {
            latest.set(oracle, item)
        }
    }

    return [...latest.values(), ...unkeyed]
}

function releaseDate(item) {
    return String(item?.date || '')
}

function toNumeric(val) {
    if (val == null) return null
    if (val === 'X') return 0
    const n = Number(val)
    return Number.isNaN(n) ? null : n
}

function shuffle(items) {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
}
