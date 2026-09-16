// The keyboard: binds the keys controls.js lists.
//
// Which keys there are and what each one does is controls.js's. This is only the wiring they share —
// the two guards no key gets past, the keys that fire on a press, and the keys that hold a tool.

import { ref, watch } from 'vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { logicOr } from '@vueuse/math'

import { useControls } from './use-controls.js'
import { useTable } from './use-table.js'

// Guard: typing into an input/textarea (text-edit overlay, search fields) should never
// trigger canvas shortcuts.
function isTyping() {
    const tag = document.activeElement?.tagName
    return tag === 'TEXTAREA' || tag === 'INPUT'
}

// Second guard: a modal is open. It matters because the arrows are canvas keys — they are
// also how you move around inside a dialog, and while one is up, ArrowUp meaning "re-layer
// the selected pile" is never what was meant.
//
// Detected by the OVERLAY, which is the one thing a modal renders and a popover does not:
// reka-ui gives popovers role="dialog" too, so matching on the role would have the colour
// swatch or an open panel stop the table answering the keyboard at all. Verified against the
// shortcut sheet, which matches, and the swatch popover, which does not.
//
// Note that the scry list is NOT covered by this any more — it is a panel section rather than
// a dialog, so the canvas keys stay live while it is on screen. That is the point of it being
// a panel: S shuffles and the number row draws while you are reading the list. Its search
// field is an input, so isTyping() above covers the one case that would have gone wrong.
function inModal() {
    return !!document.querySelector('[data-state="open"][aria-hidden="true"]')
}

export function useKeyboardShortcuts() {
    const keys = useMagicKeys()
    const entries = Object.values(useControls().keys)

    // Press-to-fire: every entry with an action.
    for (const entry of entries) {
        if (!entry.action) continue
        const signal = entry.keys
            ? logicOr(...entry.keys.map(k => keys[k]))
            : keys[entry.key]
        if (!signal) continue
        whenever(signal, () => {
            if (isTyping() || inModal()) return
            // `keys` is passed so a guard can ask about modifiers. It has to come from here:
            // the entries are module scope and useMagicKeys is per-composable, so an entry cannot
            // reach the key state any other way. Guards that don't care simply ignore it.
            if (entry.when && !entry.when(keys)) return
            entry.action()
        })
    }

    // Held: key down puts the entry's tool in hand, key up hands back the one that was there.
    // `swapped` ensures releasing the key after a typing-blocked press doesn't stomp on the
    // selection's tool.
    let pan = ref(false)
    for (const entry of entries) {
        if (!entry.hold) continue
        const held = keys[entry.key]
        let previous = null
        let swapped = false
        watch(held, (down) => {
            if (down) {
                if (isTyping() || inModal()) return
                swapped = true
                previous = useTable().tools.current.get()
                useTable().tools.set(entry.hold)
            } else {
                if (!swapped) return
                swapped = false
                useTable().tools.set(previous)
            }
        })
        if (entry.hold === 'pan') pan = held
    }

    // Returned for cursor styling in the parent: a held pan key and alt drive cursor-grab / cursor-copy.
    return { pan, alt: keys.alt, isTyping }
}
