// The table's look: the colours and the font its canvas draws with. The app's to choose, handed in
// with table.setTheme(theme) — the package has no look of its own to impose.
//
// It does keep a neutral fallback for every value, in greys, so a table given no theme or an
// incomplete one still draws everything and stays usable. It says so rather than quietly looking
// wrong: whatever a theme leaves out is named in a warning, and so is anything it sets that the table
// has no use for, which is what a misspelled key looks like from here.
//
// Colours are CSS strings — '#7dcdff', 'hsl(0 0% 90%)', 'white' — and stay CSS strings. The canvas
// turns them into the numbers Pixi draws with at the point of drawing (canvas-pixi/color.js), and the
// ones a new shape starts with are stored on it as written, because they go on the wire to peers. Keep
// them opaque: the table draws each with an alpha of its own. The seat palette is the one exception to
// the spelling — bare HSL triples ('202 80.3% 23.9%'), because that is how a seat's sleeve is stored
// and sent.
//
//   font        the family stack for every word the canvas draws: seat names and hand counts, a die's
//               or counter's number, a pile's count, and a new note
//   table       surface (the table, and what the renderer clears to), edge (beyond the world's edge),
//               dots (the grid), seam.dark and seam.light (the halfway line; light is drawn faint). A
//               game's config can still set its own surface and edge colour; these are what it gets
//               when it does not.
//   seats       the sleeve colours new seats take, in order
//   selection   outline (an annotation's own outline), box and anchor (the transform box, and the fill
//               of its anchors), handle (an arrow end: fill and stroke), marquee (the drag-select band),
//               piece and separator (a piece's ring and landing plate, and the hairline that keeps the
//               ring crisp on pale art), discard (either style, held off the table)
//   card        sleeve (a back with no sleeve colour of its own), edge (the hairline round a card, drawn
//               faint), hover, shadow (under a lifted card), count (a pile's number: fill and stroke)
//   piece       value — the number on a die or a counter
//   shape       rect, arrow, text: the colour a new rectangle, arrow or note starts as

const FALLBACK = deepFreeze({
    font: 'system-ui, sans-serif',
    table: {
        surface: '#1a1a1a',
        edge: '#111111',
        dots: '#333333',
        seam: { dark: '#000000', light: '#ffffff' },
    },
    seats: ['0 0% 22%', '0 0% 34%', '0 0% 46%', '0 0% 58%', '0 0% 28%', '0 0% 40%', '0 0% 52%', '0 0% 64%'],
    // Greys, but three different ones: a piece and an annotation still have to be told apart, and a
    // selection held off the table still has to look unlike either (see canvas-pixi/selection.js).
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

// A tint that changes nothing: Pixi multiplies a sprite's colours by its tint, and white leaves them
// as they are. A fact about the renderer rather than a look — kept here only so that this file stays
// the one place in the package a colour is written down.
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

// Said once, by mount, for a table no one gave a theme at all.
export function warnIfUnthemed() {
    if (given || unthemed_warned) return
    unthemed_warned = true
    console.warn('[table] no theme was given (table.setTheme), so the canvas draws in neutral greys')
}

// The font to wait for before measuring text: the first family in the stack, unless it is a generic
// one, which is always there and is not a webfont anyone has to load.
const GENERIC_FAMILIES = new Set([
    'system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji',
    'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
])

export function themeWebfont() {
    const first = String(current.font).split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    return first && !GENERIC_FAMILIES.has(first) ? first : null
}

// The theme laid over the fallback, one value at a time, noting what had to be filled in and what the
// fallback has no place for. A whole group left out is named once rather than value by value.
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
