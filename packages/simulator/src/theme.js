const FALLBACK = deepFreeze({
    font: 'system-ui, sans-serif',
    table: {
        surface: '#1a1a1a',
        edge: '#111111',
        dots: '#333333',
        seam: { dark: '#000000', light: '#ffffff' },
    },
    seats: ['0 0% 22%', '0 0% 34%', '0 0% 46%', '0 0% 58%', '0 0% 28%', '0 0% 40%', '0 0% 52%', '0 0% 64%'],
    selection: {
        outline: '#a3a3a3',
        box: '#a3a3a3',
        anchor: '#ffffff',
        handle: { fill: '#dddddd', stroke: '#666666' },
        marquee: '#a3a3a3',
        piece: '#ffffff',
        separator: '#000000',
        discard: '#737373',
    },
    card: {
        sleeve: '#1a1a1a',
        edge: '#ffffff',
        hover: '#ffffff',
        shadow: '#000000',
        count: { fill: '#ffffff', stroke: '#000000' },
    },
    piece: { value: '#ffffff' },
    shape: { rect: '#0a0a0a', arrow: '#e6e6e6', text: '#ffffff' },
})

export const NO_TINT = 0xffffff

let current = FALLBACK
let given = false
let unthemed_warned = false

export function setTheme(theme) {
    given = true
    const missing = []
    const unknown = []
    current = deepFreeze(merge(FALLBACK, theme ?? {}, '', missing, unknown))
    if (missing.length) {
        console.warn(`[table] the theme leaves out ${missing.join(', ')}, so those draw in neutral greys`)
    }
    if (unknown.length) {
        console.warn(`[table] the theme sets ${unknown.join(', ')}, which the table does not use`)
    }
    return current
}

export function theme() {
    return current
}

export function warnIfUnthemed() {
    if (given || unthemed_warned) return
    unthemed_warned = true
    console.warn('[table] no theme was given (table.setTheme), so the canvas draws in neutral greys')
}

const GENERIC_FAMILIES = new Set([
    'system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji',
    'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
])

export function themeWebfont() {
    const first = String(current.font).split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    return first && !GENERIC_FAMILIES.has(first) ? first : null
}

function merge(fallback, value, path, missing, unknown) {
    if (Array.isArray(fallback)) {
        if (Array.isArray(value) && value.length) return [...value]
        missing.push(path)
        return fallback
    }

    if (fallback && typeof fallback === 'object') {
        if (value === undefined && path) {
            missing.push(path)
            return fallback
        }
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
        const out = {}
        for (const key of Object.keys(fallback)) {
            out[key] = merge(fallback[key], source[key], path ? `${path}.${key}` : key, missing, unknown)
        }
        for (const key of Object.keys(source)) {
            if (!(key in fallback)) unknown.push(path ? `${path}.${key}` : key)
        }
        return out
    }

    if (typeof value === 'string' && value.trim()) return value
    missing.push(path)
    return fallback
}

function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value)
        for (const child of Object.values(value)) deepFreeze(child)
    }
    return value
}
