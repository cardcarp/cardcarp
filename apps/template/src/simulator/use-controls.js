let current = null

export function provideControls(controls) {
    current = controls
}

export function useControls() {
    if (!current) throw new Error('[simulator ui] no controls — call createSimulatorView(table) before mounting the app')
    return current
}

export function keyHint(id) {
    const entry = useControls().keys[id]
    if (!entry) return null
    if (entry.hint) return entry.hint
    const name = entry.key ?? entry.keys?.[0]
    return name ? name.split('+').map(keyLabel).join('') : null
}

const LABELS = {
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    shift: '⇧',
    alt: 'Alt',
    space: 'Space',
    backspace: 'bksp',
    delete: 'del',
    equal: '=',
    minus: '-',
}

function keyLabel(name) {
    const lower = name.toLowerCase()
    if (LABELS[lower]) return LABELS[lower]
    const code = /^(?:key|digit)(.)$/.exec(lower)
    return (code ? code[1] : lower).toUpperCase()
}
