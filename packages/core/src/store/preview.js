import { ref, computed, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'

import { useGameStore } from '../composable/game.js'

const { width: win_w, height: win_h } = useWindowSize()
// The card's shape comes from the game's own manifest, like every other card surface.
// preview-card.vue already sizes the rendered overlay from `card_ratio`, so a second
// hardcoded ratio here meant the box this module positions and the box the component drew
// were different shapes for any game whose cards are not 63x88 — the preview would clamp
// and centre against a height it did not have.
const { card_size } = useGameStore()

const preview_w = computed(() => clamp(win_w.value * 0.28, 240, 420))
const preview_h = computed(() => {
    const { width, height } = card_size.value
    return preview_w.value * (height / width)
})
const OFFSET = 12
const PREVIEW_ENTER_DELAY = 200
const PREVIEW_LEAVE_DELAY = 150

const preview_item_isActive = ref(false)
const preview_item_card = ref(null)
// Which art variant of preview_item_card to show — '' for the front, or the back's variant
// when the hovered card is turned over to a side that has real art (see composable/image.js).
const preview_item_variant = ref('')
const preview_x = ref(0)
const preview_y = ref(0)
const preview_was_active = ref(false)
const is_dragging = ref(false)

let preview_hover_timeout = null
let preview_leave_timeout = null

// When a drag starts, immediately kill any active preview and cancel pending timers
watch(is_dragging, (now) => {
    if (now) preview_hide()
})

function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v))
}

function should_show_preview(rect) {
    return (
        rect.width * 2 < preview_w.value ||
        rect.height * 2 < preview_h.value
    )
}

function compute_position(rect) {
    const right_x = rect.right + OFFSET
    const left_x = rect.left - preview_w.value - OFFSET

    const right_overflows = right_x + preview_w.value > win_w.value
    const left_overflows = left_x < 0

    if (right_overflows && left_overflows) {
        preview_x.value = (win_w.value - preview_w.value) / 2
        preview_y.value = (win_h.value - preview_h.value) / 2
    } else {
        preview_x.value = right_overflows ? left_x : right_x
        const element_center_y = rect.top + (rect.height / 2)
        const target_y = element_center_y - (preview_h.value / 2)
        preview_y.value = clamp(target_y, OFFSET, win_h.value - preview_h.value - OFFSET)
    }
}

function cancel_preview_timers() {
    if (preview_hover_timeout) {
        clearTimeout(preview_hover_timeout)
        preview_hover_timeout = null
    }
    if (preview_leave_timeout) {
        clearTimeout(preview_leave_timeout)
        preview_leave_timeout = null
    }
}

// Drop the preview now — the open one and any enter still on its timer. For callers whose
// preview is ending because the ELEMENT went away rather than because the pointer left it:
// there is no leave to wait out, and the pending enter would otherwise land a moment later
// on a card that is no longer there. mouseleave_cell_card stays the pointer's route out.
function preview_hide() {
    cancel_preview_timers()
    preview_item_isActive.value = false
    preview_was_active.value = false
}

function schedule_preview_hide() {
    cancel_preview_timers()
    preview_leave_timeout = setTimeout(() => {
        preview_item_isActive.value = false
        preview_was_active.value = false
    }, PREVIEW_LEAVE_DELAY)
}

function mouseover_cell_card(event, item, type, rect = null, variant = '') {
    if (type === 'collection') return
    if (is_dragging.value) return

    const el_rect = rect ?? event?.currentTarget?.getBoundingClientRect()
    if (!el_rect) return
    if (!should_show_preview(el_rect)) return

    if (preview_item_isActive.value) {
        if (preview_leave_timeout) {
            clearTimeout(preview_leave_timeout)
            preview_leave_timeout = null
        }
        compute_position(el_rect)
        preview_item_card.value = item
        preview_item_variant.value = variant
        return
    }

    cancel_preview_timers()
    preview_hover_timeout = setTimeout(() => {
        compute_position(el_rect)
        preview_item_card.value = item
        preview_item_variant.value = variant
        preview_item_isActive.value = true

        if (!preview_was_active.value) {
            setTimeout(() => {
                preview_was_active.value = true
            }, 0)
        }
    }, PREVIEW_ENTER_DELAY)
}

function mouseleave_cell_card() {
    schedule_preview_hide()
}

export {
    preview_item_isActive,
    preview_item_card,
    preview_item_variant,
    preview_x,
    preview_y,
    preview_w,
    preview_h,
    preview_was_active,
    is_dragging,
    mouseover_cell_card,
    mouseleave_cell_card,
    preview_hide
}