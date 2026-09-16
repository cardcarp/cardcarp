<script setup>
// Core
import { onMounted, onBeforeUnmount, ref, watchEffect, nextTick, computed, watch } from 'vue'

// Libraries
import { kebabCase } from 'lodash'
import { AnimatePresence, Motion } from 'motion-v'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,
    ScrollAreaCorner
} from 'reka-ui'

// Composables
import { useImage } from '@cardcarp/core/composable/image.js'
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { drag_x, drag_y, drag_item, drag_item_isActive } from '@cardcarp/core/store/drag.js'
import {
    preview_item_isActive,
    mouseover_cell_card,
    mouseleave_cell_card,
} from '@cardcarp/core/store/preview.js'
import { useTable } from '../../use-table.js'

// The table, through its object (see use-table.js).
const { clientToWorld } = useTable().view
const { add: addCard } = useTable().cards

// Assign
const { card_config } = useGameStore()
const { card_src } = useImage()

// Props
const prop = defineProps({
    list: {
        type: Array,
        default: []
    }
})

// Local
let drag_startX = 0
let drag_startY = 0
let drag_threshold = 6
let drag_listen_isActive = false

let pointer_was_drag = false
let pointer_claimed = false

// Actions
function click_row(item) {
    if (drag_item_isActive.value) return

    if (pointer_was_drag || pointer_claimed) {
        pointer_was_drag = false
        pointer_claimed = false
        return
    }

    // Add to Pixi Canvas
    addCard(item, card_config.value)
}

function onPointerDown(e, item) {

    if (e.button !== 0) return

    drag_startX = e.clientX
    drag_startY = e.clientY
    drag_item_isActive.value = false
    drag_item.value = item

    pointer_was_drag = false
    pointer_claimed = false

    preview_item_isActive.value = false

    if (!drag_listen_isActive) {
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp, { once: true })
        drag_listen_isActive = true
    }
}

function onPointerMove(e) {
    drag_x.value = e.clientX
    drag_y.value = e.clientY

    if (drag_item_isActive.value) return

    const dx = e.clientX - drag_startX
    const dy = e.clientY - drag_startY
    const dist = Math.hypot(dx, dy)

    if (dist > drag_threshold) {
        drag_item_isActive.value = true
        document.body.classList.add('pointer-grab');
    }
}

function onPointerUp(e) {
    document.body.classList.remove('pointer-grab')
    window.removeEventListener('pointermove', onPointerMove)
    drag_listen_isActive = false

    if (!drag_item_isActive.value) return
    pointer_was_drag = true

    // The only drop this list supports: onto the canvas. Three further branches
    // used to sit here for dropping into a "collect" panel, but they referenced
    // a `collect_active_collection` that is not defined or imported anywhere and
    // would have thrown on contact. They were unreachable in any case —
    // `.panel-collect` exists only on the deckbox route, and the branches
    // that could fire without it were gated on a `collect_card` id this
    // component is never passed.
    const onCanvas = document.elementFromPoint(e.clientX, e.clientY)?.closest(".canvas")

    if (onCanvas) {
        // Place at the drop point, merging into any pile under the cursor.
        const { x, y } = clientToWorld(e.clientX, e.clientY)
        addCard(drag_item.value, card_config.value, x, y, {
            resolveOverlap: false,
            mergeIfOverlap: true,
        })
    }

    drag_item_isActive.value = false
}

onBeforeUnmount(() => {
    if (drag_listen_isActive) {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
    }
})

</script>

<template lang="pug">
Motion(
    :initial="{ opacity: 0 }" 
    :animate="{ opacity: 1 }" 
    :exit="{ opacity: 0 }" 
    class="group/list relative flex flex-col gap-1 overflow-hidden"
)
    //- Keyed on `id`, not `card_id` — no game has ever published the latter. It rendered as
    //- the string "undefined" on every row, so the whole list shared one key and Vue's keyed
    //- diff had nothing to tell the rows apart. Harmless until a list actually patches, which
    //- is why only mtg fell over: it is the only archive long enough to paginate.
    .item(
        v-for="card in prop.list"
        :key="card.id"
        class="relative pl-2 pr-2 py-1.5 w-full flex items-center hover:bg-mauve-800! rounded-sm overflow-hidden touch-none first:bg-mauve-800 first:group-hover/list:bg-transparent"
        @pointerdown="onPointerDown($event, card)"
        @click="click_row(card)"
        @pointerenter="mouseover_cell_card($event, card)"
        @pointerleave="mouseleave_cell_card"
    )

        .text(class="grow min-w-0 text-3.25 text-neutral-200")
            span(class="truncate") {{ card.name }}
        
        //- Optional chain for the same reason the deck row's format has one: the field is
        //- allowed to be null, and reading [0] off it aborts the row's render — which takes the
        //- whole list with it and then fails again on unmount. Every game populates `category`
        //- today, so this is guarding the shape rather than a break in flight.
        .category(class="flex-none text-3 text-neutral-500")
            span(class="") {{ card.category?.[0] }}

</template>
