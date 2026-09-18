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
