import { ref, getCurrentScope, onScopeDispose } from 'vue'

// Shared drag state — the ghost in the deckbox view renders from these.
const drag_item = ref(null)
const drag_item_isActive = ref(false)
const drag_x = ref(0)
const drag_y = ref(0)

const DRAG_THRESHOLD = 6

// Card drag plumbing shared by every drag source (center table, build rows).
// Owns the listener lifecycle, activation threshold, body cursor class and
// pointercancel recovery; the call site only decides what a drop means.
//
//   const { start } = use_drag((e, item) => { ...resolve drop target... })
//   -> call start(e, item) from @pointerdown after any call-site guards.
//
// `immediate` skips the movement threshold and picks the item up on the spot. It exists for
// gestures that have already asked for the drag some other way — a touch long-press, where
// the hold IS the commitment and making the finger then travel six more pixels would mean
// holding a row that refuses to move.
//
// onDrop fires for every completed drag (pointerup after the threshold),
// whether or not it lands on a valid target — resolving the target is the
// callback's job. A cancelled pointer (touch takeover, focus loss) never
// counts as a drop.
function use_drag(onDrop) {
    let startX = 0
    let startY = 0
    let pointerId = null
    let listening = false

    function start(e, item, { immediate = false } = {}) {
        if (e.button !== 0) return
        if (listening) return    // a second pointer can't steal the drag

        startX = e.clientX
        startY = e.clientY
        pointerId = e.pointerId
        drag_item_isActive.value = immediate
        drag_item.value = item

        if (immediate) document.body.classList.add('pointer-grab')

        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', end)
        window.addEventListener('pointercancel', end)
        listening = true
    }

    function move(e) {
        if (e.pointerId !== pointerId) return

        drag_x.value = e.clientX
        drag_y.value = e.clientY

        if (drag_item_isActive.value) return

        const dist = Math.hypot(e.clientX - startX, e.clientY - startY)
        if (dist > DRAG_THRESHOLD) {
            drag_item_isActive.value = true
            document.body.classList.add('pointer-grab')
        }
    }

    function end(e) {
        if (e.pointerId !== pointerId) return
        cleanup()

        if (drag_item_isActive.value && e.type === 'pointerup') {
            onDrop?.(e, drag_item.value)
        }

        drag_item_isActive.value = false
    }

    function cleanup() {
        document.body.classList.remove('pointer-grab')
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', end)
        window.removeEventListener('pointercancel', end)
        listening = false
        pointerId = null
    }

    if (getCurrentScope()) onScopeDispose(cleanup)

    return { start }
}

export {
  drag_item,
  drag_item_isActive,
  drag_x,
  drag_y,
  use_drag,
}
