// composable/search.js
import { computed, toValue } from 'vue'
import { get, orderBy } from 'lodash'

// use_search(dataset, filterConfig, state)
//   dataset      : array | ref/getter -> array of items
//   filterConfig : manifest filter object | ref/getter
//                  ({ [property]: { type, option } }) — the key IS the item property
//   state        : reactive search state from @cardcarp/deckbox's state.js
//                  (filter, sort, direction, group)
//
// Returns the filtered + sorted list. Pagination is handled separately by
// use_page so each can recompute independently.
//
// `distinct` is a reserved filter key: a `toggle` filter that drives the
// dedupe stage below instead of matching an item property. It runs *after* the
// other filters, so the surviving printing is picked from what the user is
// actually looking at — deduping first would drop a card from the set on
// screen because some other set holds a newer printing of it.
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

// Manifest `default` for toggle filters (authored as boolean or "true"/"false").
export function toggleDefault(def) {
    return def?.default === true || def?.default === 'true'
}

// Filter types whose selection is an array of values.
const LIST_TYPES = ['combo', 'check', 'set']

function isList(def) {
    return LIST_TYPES.includes(def?.type)
}

// Manifest `default` for multi-select filters, normalized to an array of
// values (a bare value is accepted as a single-item default).
export function listDefault(def) {
    const d = def?.default
    if (d == null) return []
    return (Array.isArray(d) ? d : [d]).map(String)
}

// The effective selection for a filter: what the user picked, or the manifest
// default while they haven't touched it. State is never seeded, so clearing a
// dataset's filters (reset_filter) restores the defaults.
export function selectionValue(selections, key, def) {
    const v = selections?.[key]
    if (v !== undefined) return v
    if (def?.type === 'toggle') return toggleDefault(def)
    if (isList(def)) return listDefault(def)
    return v
}

// Whether a selection differs from the filter's manifest default — drives the
// in-use indicator and the reset button, so a filter sitting at its default
// doesn't read as "in use" even when it is narrowing results.
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

// Whether a filter is currently narrowing results — drives the in-use
// indicator in filter.vue. Resolves the effective selection first, so a filter
// sitting at a manifest default still reads as in use (the archive really is
// narrowed on load). `distinct` is the one filter with an inert position:
// hiding reprints narrows, showing them does nothing.
export function isFiltering(selections, key, def = {}) {
    const value = selectionValue(selections, key, def)
    if (key === 'distinct') return value === true
    return hasSelection(value, def)
}

// --- Structured filters (from the filter.vue UI) -------------------------
// Selection shape by filter type:
//   combo / check / set -> array of selected values   (is-one-of: OR within)
//   slide               -> [min, max] range tuple
//   input               -> string                       (substring contains)
//   toggle              -> boolean
// Different filters combine with AND; a filter with no selection is skipped.
// `distinct` is skipped here — it's consumed by the dedupe stage in use_search.
function applyFilters(items, selections, config) {
    // Config keys are included even when untouched so manifest defaults apply.
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

// Whether a selection actually constrains the result set. A toggle constrains
// in either position — both states partition the dataset — so it counts as in
// use wherever it sits, including at its manifest default. The reserved
// `distinct` toggle is the exception (see isFiltering): it is a stage, not a
// property match, and showing reprints removes nothing.
export function hasSelection(value, def = {}) {
    const type = def.type
    if (value == null) return false
    if (type === 'toggle') return true
    if (type === 'slide') return Array.isArray(value) && (value[0] != null || value[1] != null)
    if (type === 'input') return String(value).trim() !== ''
    return Array.isArray(value) ? value.length > 0 : value !== ''
}

function matchFilter(item, key, value, def) {
    // The filter key is the item property it targets (dotted paths supported).
    const itemValue = String(key).includes('.') ? get(item, key) : item[key]

    // Boolean property (absent counts as false)
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

    // Free-text contains
    if (def.type === 'input' || def.type === 'text') {
        const needle = String(value).trim().toLowerCase()
        return hay.some((h) => h.includes(needle))
    }

    // Membership (combo / check / select) — is-one-of
    const targets = (Array.isArray(value) ? value : [value]).map((v) => String(v).toLowerCase())
    return targets.some((t) => hay.includes(t))
}

// --- Option normalization (shared with filter.vue) ------------------------
// Flattens a filter's choices into [{ value, label, group }].
// Accepts `option` as an array, a { value: label } map, or nested groups
// ({ group: [...] } / { group: { value: label } }).
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

// --- Sort -----------------------------------------------------------------
function applySort(items, state) {
    if (state.sort === 'random') return shuffle(items)

    const group = state.group && state.group !== 'none' ? state.group : null
    const keys = group ? [group, state.sort] : [state.sort]
    const dirs = group ? ['asc', state.direction] : [state.direction]

    return orderBy(items, keys, dirs)
}

// --- Distinct (latest printing per oracle) --------------------------------
// Cards reprint across sets: same card, new set / number / art. `oracle_id` is
// the identity every printing of a card shares — names are not, and only look
// like they are in a small catalogue. PTCG has 29 printings named "Charizard"
// spanning 17 mechanically different cards, so deduping on name would hide 16
// of them. `origin` (the first printing's id) and `id` are fallbacks so an item
// without an oracle can never slip past the dedupe unnoticed.
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

// `date` is a zero-padded ISO prefix at whatever precision the game knows
// (1993-08-05, 2006-10), so a string compare orders them, and the empty
// fallback loses to any real date — a dated printing always wins.
function releaseDate(item) {
    return String(item?.date || '')
}

// --- Helpers --------------------------------------------------------------
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
