import { store } from './state/store.js'
import { flipHandEntry } from './seats.js'

export const currentTool = store('select')

export const canvasDragging = store(false)

export const canvasDragDiscarded = store(false)

export const canvasPressActive = store(false)

export const uiSelection = store({
    type: null,
    units: 0,
    x: 0,
    y: 0,
})

export const handFocusId = store(null)

export function handFlipFocused() {
    flipHandEntry(handFocusId.get())
}
