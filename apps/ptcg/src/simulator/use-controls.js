// What this UI offers (controls.js), handed over once by createSimulatorView (index.js).
//
// A handle rather than an import, for the reasons use-table.js is one and one more: controls.js lists
// the toolbars and panel sections, and those same components ask it for their key hints, so importing
// it from them would be a cycle.
let current = null

export function provideControls(controls) {
    current = controls
}

export function useControls() {
    if (!current) throw new Error('[simulator ui] no controls — call createSimulatorView(table) before mounting the app')
    return current
}

// What an entry's key is called on screen: on the shortcut sheet, and after a tooltip's label. Null when
// this app gives the action no key, so a tooltip that would advertise one says nothing rather than
// something untrue.
export function keyHint(id) {
    const entry = useControls().keys[id]
    if (!entry) return null
    if (entry.hint) return entry.hint
    const name = entry.key ?? entry.keys?.[0]
    return name ? name.split('+').map(keyLabel).join('') : null
}

// useMagicKeys names, as a keycap prints them. Letters and digits come either as codes ('keyS',
// 'digit1') or as bare keys ('v'), and print as the character either way.
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
