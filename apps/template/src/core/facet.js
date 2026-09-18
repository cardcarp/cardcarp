import { normalizeOptions } from '@cardcarp/core/composable/search.js'

export function availableOptions(def, items, key) {
    if (!def || !Array.isArray(items) || !items.length) return []

    const present = new Set()
    for (const item of items) {
        const value = item?.[key]
        if (value == null) continue
        for (const one of Array.isArray(value) ? value : [value]) {
            present.add(String(one).toLowerCase())
        }
    }

    const seen = new Set()
    return normalizeOptions(def).filter(option => {
        const key = option.value.toLowerCase()
        if (!present.has(key) || seen.has(key)) return false
        seen.add(key)
        return true
    })
}
