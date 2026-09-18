<script setup>
// Core
import { onMounted, onBeforeUnmount, ref, watchEffect, nextTick, computed, watch, markRaw } from 'vue'

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

const { clientToWorld } = useTable().view
const { addDeck, buildDeck: buildDeckDict } = useTable().cards

// Assign
const { manifest, card_config } = useGameStore()
const { card_src } = useImage()

// Props
const prop = defineProps({
    list: {
        type: Array,
        default: () => []
    }
})

// Local
const resolve_image_list = ref([])
const resolve_highlight_list = ref([])
const is_image_list_loading = ref(false)

let drag_startX = 0
let drag_startY = 0
let drag_threshold = 6
let drag_listen_isActive = false

let pointer_was_drag = false
let pointer_claimed = false

let dragged_deck_list = null

// Actions
async function click_row(deckList) {
    if (drag_item_isActive.value) return

    if (pointer_was_drag || pointer_claimed) {
        pointer_was_drag = false
        pointer_claimed = false
        return
    }

    addDeck(buildDeckDict(deckList), card_config.value)
}

function onPointerDown(e, deck) {
    if (e.button !== 0) return

    drag_startX = e.clientX
    drag_startY = e.clientY
    drag_item_isActive.value = false
    drag_item.value = manifest.value?.card_dict?.[deck.highlight]
    dragged_deck_list = deck.list

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
        document.body.classList.add('pointer-grab')
    }
}

function onPointerUp(e) {
    document.body.classList.remove('pointer-grab')
    window.removeEventListener('pointermove', onPointerMove)
    drag_listen_isActive = false

    if (!drag_item_isActive.value) {
        dragged_deck_list = null
        return
    }
    pointer_was_drag = true

    const elAtDrop = document.elementFromPoint(e.clientX, e.clientY)
    const onCanvas = elAtDrop?.closest('.canvas')

    if (onCanvas && dragged_deck_list) {
        const { x, y } = clientToWorld(e.clientX, e.clientY)
        addDeck(buildDeckDict(dragged_deck_list), card_config.value, x, y)
    }

    drag_item_isActive.value = false
    dragged_deck_list = null
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
    .item(
        v-for="(deck, index) in prop.list" 
        :key="`${deck.id}`"
        class="relative pl-2 pr-2 py-1.5 w-full flex items-center hover:bg-mauve-800! rounded-sm overflow-hidden touch-none first:bg-mauve-800 first:group-hover/list:bg-transparent"
        @pointerdown="onPointerDown($event, deck)"
        @click="click_row(deck.list)"
        @pointerenter="mouseover_cell_card($event, manifest?.card_dict?.[deck.highlight])"
        @pointerleave="mouseleave_cell_card"
    )
        .text(class="grow min-w-0 text-3.25 text-neutral-200")
            span(class="truncate") {{ deck.name }}
        
        .category(class="flex-none text-3 text-neutral-500")
            span(class="") {{ deck.format?.[0] }}

</template>