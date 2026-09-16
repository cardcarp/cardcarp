// The table UI's own state: which panel sections are open, and whether the deck panel and the
// shortcut sheet are showing.
//
// Not the table's. Nothing on the canvas reads any of it, and a UI written in something else
// would keep its own version in its own framework — which is why it lives apart from store.js,
// whose state is stores the canvas writes. Refs, because this is Vue code; it moves with the Vue
// components when they become their own package.
//
// Nothing on the table reaches in here. The moments that used to open the deck panel directly — a
// reset, a ?deck= link — are announced as table events (events.js), and index.vue decides what
// each one means for this UI's panel.

import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

export const dialogShortcut_open = ref(false)

// === Right panel ===
// The table's one persistent surface for everything that is not the canvas: the view
// controls, the room, the seats, and a section that follows whatever is selected.
//
// It floats OVER the table rather than taking layout width. The Konva stage sizes itself to
// the window (see canvas/stage.js handleResize), so a panel that pushed the canvas would
// leave the stage wider than the box it is drawn into — getViewportCenter, which is where
// click-to-add drops things, would stop being the middle of anything the player can see.
// Overlaying keeps every viewport calculation on the table honest, and costs only the strip
// of felt under the panel.
//
// Open by default, for the reason the seat flyout it replaces was: the roster and the two
// ways online are what a player arrives wanting. Collapsing is the deliberate act.
export const panel_open = useStorage('cardcarp:panel', true)

// Per-section collapse, by section id. One record rather than a flag apiece, so adding a
// section is a line in the default and nothing else — and `mergeDefaults` is what carries
// that new line to a player whose browser already holds the old record, which would
// otherwise come back missing the key and read as collapsed.
//
// Contextual sections share the map with the fixed ones. A player who collapses the card
// section should find it collapsed the next time they select a pile, and a persisted id
// gives that for free where a ref inside the component would be remade on every selection.
export const panel_section = useStorage('cardcarp:panel-sections', {
    card: true,
    multiplayer: true,
    seats: true,
    settings: true,
}, localStorage, { mergeDefaults: true })

// Open the panel AND a named section. The two are one act for every caller there has been:
// the walkthrough pointing at a control needs it on screen, which an un-collapsed section
// inside a shut panel is not.
export function openPanelSection(id) {
    panel_open.value = true
    if (id) panel_section.value[id] = true
}

// The deck panel's open state and which tab it is showing. Lifted out of toolbar/deckbox.vue
// for the same reason the multiplayer flyout was: the UI opens it on the player's behalf at
// the few moments they are looking at a bare mat with nothing to do next.
export const deckbox_open = ref(false)
export const deckbox_tab = ref('Cards')

// Open the deck panel, on Decks unless told otherwise — pointing at the next thing to do.
// Called when the walkthrough ends, when a returning player opens a table, and after a reset.
export function openDeckbox(tab = 'Decks') {
    deckbox_tab.value = tab
    deckbox_open.value = true
}
