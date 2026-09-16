// CSS colours, as the numbers Pixi draws with.
//
// Everything that reaches the canvas as a colour is a CSS string — the theme's (theme.js), a seat's
// sleeve, whatever a colour picker chose — because that is what the wire and the UI speak. Pixi wants
// a number. A 2D canvas is the most complete CSS colour parser a page already has, so this hands it
// the string and reads back what it made of it. Remembered per string, because the same few colours
// are asked for at drag rate.
//
// It used to be four copies of the same few lines, one per tool, one of which built a fresh canvas on
// every call.
//
// An opaque colour reads back as '#rrggbb'; one with alpha reads back as rgba(), and its alpha is
// dropped — the canvas draws with alphas of its own. A string the canvas cannot parse leaves the reset
// value in place, which reads back as black; with no DOM (a test in Node) the answer is black too, and
// nothing is drawn there anyway.

const probe = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
const known = new Map()

export function toPixiColor(css) {
    if (typeof css === 'number') return css
    const key = String(css ?? '')
    if (known.has(key)) return known.get(key)
    if (!probe) return 0

    probe.fillStyle = '#000'
    probe.fillStyle = key
    const style = probe.fillStyle
    const value = style.startsWith('#') ? parseInt(style.slice(1), 16) : rgbaToNumber(style)

    known.set(key, value)
    return value
}

function rgbaToNumber(style) {
    const parts = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(style)
    return parts ? (Number(parts[1]) << 16) | (Number(parts[2]) << 8) | Number(parts[3]) : 0
}
