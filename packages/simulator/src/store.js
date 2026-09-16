// The table's shared state: what the canvas publishes for a UI to render from, and the few
// flags the canvas and the hand pass between each other.
//
// Stores rather than refs (see state/store.js), so nothing here needs a framework. The canvas
// writes with set(); a UI reads through whatever binding it renders with — ptcg's Vue one is
// simulator/composable/use-store.js. That UI's own state — which panel sections are open, whether the
// deck panel is showing — lives in the app (table/ui.js), because nothing on the canvas reads it.
// The game being played is handed in separately, through game.js.

import { store } from './state/store.js'
import { flipHandEntry } from './seats.js'

// The canvas tool in use. Written by setTool (canvas-pixi/index.js), the one door every palette
// click and hotkey goes through, so the highlight and the canvas's behaviour cannot disagree.
export const currentTool = store('select')

// === Tactility ===
//
// There is no setting any more, and that is deliberate. The flag existed to answer a question —
// "is giving the table weight the right direction?" — and the answer came back yes, so the
// question stopped being worth carrying. A toggle for it now would be offering players a switch
// labelled "make this feel worse", which is not a preference, it is a bug report.
//
// Reduced motion is still honoured, in canvas-pixi/tactility.js, where it belongs: that is a
// real accessibility need rather than a taste, and it suppresses the ANIMATION while leaving
// the crookedness and the held-card shadow alone.

// True while a card (or selection of cards) is mid-drag on the canvas. Drives DOM-side
// drop affordances like the hand zone that need to know when a canvas drag is happening.
export const canvasDragging = store(false)

// The canvas drag that just ended was thrown off the table rather than put down.
//
// Read by hand.vue, which otherwise treats ANY canvas drag ending while the pointer is over its
// zone as a drop into the hand. The two zones can overlap: the hand's is the bottom band of the
// WINDOW, the table's discard bands run down its left and right edges, and near the bottom
// corners a release satisfies both. One gesture, two destructive readings — the cards filed into
// the hand and destroyed at the same time.
//
// Ordering happens to save it today: the discard clears the selection synchronously and
// hand.vue's watcher runs a microtask later, so its send finds nothing left to send. That is an
// accident of when Vue flushes rather than a decision, it is invisible at both ends, and it
// would break the day either side moved. So the fact is stated rather than inferred.
//
// Set by the canvas at the moment a discard is decided and cleared when the next drag begins —
// it describes the drag that just ended, so it has to outlive the release that ended it.
export const canvasDragDiscarded = store(false)

// A pointer is DOWN on the table — from the press, not from the moment a drag passes the slop.
//
// Distinct from canvasDragging, which means "a card drag is actually under way" and is what the
// hand's dropzone lights up on. This one is the wider window: a player who grabs a card and
// holds it while deciding has not started a drag, but is unmistakably not reading the card
// either.
//
// Set from the press for a mouse or pen, but only from the drag for touch: on a tablet
// press-and-hold IS the read gesture (the long press in tools/card.js), so a touch press on its
// own must not count. See canvas-pixi/pointer.js.
//
// Previews stand down while it is set. The card tool checks it before announcing a card-hover,
// and a UI mirrors it into its own preview overlay — ptcg's table view does, into core's, with a store
// listener, because a pending preview timer has to be cancelled inside the press.
export const canvasPressActive = store(false)

// Discriminated UI overlay state. `type` matches a tool's id and selects which selection
// toolbar renders. Tool-specific extras live as flat fields (e.g. the text edit overlay adds
// text/width/height/fontSize/color).
//
// `units` is how many objects the player would say they are holding, counting a
// pile as one. It is filled in even when `type` is null — a mixed selection has
// no single tool to name, but it still has a count, and alignment only needs the
// count. See selectionUnits in canvas-pixi/selection.js.
//
// Replaced whole on every change, never edited: an edit in place would change what one
// component shows and nothing else. The text overlay's draft is the one thing a UI writes
// here, and it goes through setTextDraft / stageTextColor in canvas-pixi/tools/text.js.
export const uiSelection = store({
    type: null,
    units: 0,
    x: 0,
    y: 0,
})

// handEntryId of the hand card the pointer is on (or is dragging). The hand has no
// transformer/selection of its own, so this is what card-level shortcuts aim at — see the
// keyH rows in shortcuts.js. Cleared on pointerleave and when the entry leaves the hand.
export const handFocusId = store(null)

// The H key's way of flipping a hand card: whichever one the pointer is over. The hand lives on
// the seat, so the flip itself is flipHandEntry in seats.js — which a double tap calls directly.
export function handFlipFocused() {
    flipHandEntry(handFocusId.get())
}
