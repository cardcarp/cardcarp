import { ref, watch } from 'vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { logicOr } from '@vueuse/math'

import { useControls } from './use-controls.js'
import { useTable } from './use-table.js'

function isTyping() {
    const tag = document.activeElement?.tagName
    return tag === 'TEXTAREA' || tag === 'INPUT'
}

function inModal() {
    return !!document.querySelector('[data-state="open"][aria-hidden="true"]')
}

export function useKeyboardShortcuts() {
    const keys = useMagicKeys()
    const entries = Object.values(useControls().keys)

    for (const entry of entries) {
        if (!entry.action) continue
        const signal = entry.keys
            ? logicOr(...entry.keys.map(k => keys[k]))
            : keys[entry.key]
        if (!signal) continue
        whenever(signal, () => {
            if (isTyping() || inModal()) return
            if (entry.when && !entry.when(keys)) return
            entry.action()
        })
    }

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

    return { pan, alt: keys.alt, isTyping }
}
