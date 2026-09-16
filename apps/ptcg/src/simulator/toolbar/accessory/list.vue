<script setup>
// Every accessory in one list, from one manifest array: data.simulator.accessory.
//
// This replaces three near-identical tabs (dice / marker / board — 623 lines between them,
// differing only in which sub-array they read and which add* verb they called). The split
// was also stale: the tabs read data.accessory.mark and data.accessory.board, keys the
// manifests no longer ship, so two of the three rendered nothing at all.
//
// What a thing IS now travels with the item, as `category`, and that single field does two
// jobs: it fills the filter dropdown, and it picks the canvas verb the item is added with.

// Core
import { computed, onBeforeUnmount, ref } from 'vue'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'
import { useFuse } from '@vueuse/integrations/useFuse'

// Components
import ListFilter from '../shared/list-filter.vue'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,
} from 'reka-ui'

// Composables
import { useGameStore } from '@cardcarp/core/composable/game.js'

// Store
import { drag_x, drag_y, drag_item, drag_item_isActive } from '@cardcarp/core/store/drag.js'
import { preview_item_isActive } from '@cardcarp/core/store/preview.js'
import { useTable } from '../../use-table.js'

// The table, through its object (see use-table.js).
const { clientToWorld } = useTable().view
const { list: accessoryList, adderFor } = useTable().accessories

// Accessories — art resolution and the category→verb mapping are shared with the seat's
// opening layout, so they live in one module rather than being restated here.

const { config } = useGameStore()

const accessories = computed(() => accessoryList(config.value))

// Filter vocabulary is derived, not configured: every category actually present in the list,
// so adding an accessory to the manifest extends the dropdown with no second place to edit.
//
// Shaped as list-filter's { value, label } options rather than bare strings. There is no
// group here — the deckbox facets take theirs from a nested config, and a derived vocabulary
// is flat by construction — so the control draws it as one unlabelled run of rows.
const filter_list = computed(() => {
    const seen = new Set()
    for (const item of accessories.value) {
        for (const c of (Array.isArray(item.category) ? item.category : [item.category])) {
            if (c) seen.add(c)
        }
    }
    return [...seen].sort().map(value => ({ value, label: value }))
})

const filter_active = ref([])

// OR across selected values, matching the scry filter: the categories are alternatives, so
// picking dice and board means "show me both", never "things that are somehow both".
const filtered = computed(() => {
    const active = filter_active.value
    if (active.length === 0) return accessories.value
    return accessories.value.filter(item => {
        const categories = Array.isArray(item.category) ? item.category : [item.category]
        return active.some(value => categories.includes(value))
    })
})

// Search runs over whatever the filter left, so the two narrow together rather than fighting.
const fuzzy = ref('')
const { results } = useFuse(fuzzy, filtered, {
    matchAllWhenSearchEmpty: true,
    fuseOptions: { keys: ['name', 'category'], threshold: 0.3 },
})

// === Click vs drag ===
// Unchanged from the tabs this replaces: a press that travels more than a few pixels becomes
// a drag onto the canvas; anything shorter is a click that drops the accessory at the
// viewport centre.
let drag_startX = 0
let drag_startY = 0
const drag_threshold = 6
let drag_listen_isActive = false
let pointer_was_drag = false

function click_row(item) {
    if (drag_item_isActive.value) return
    if (pointer_was_drag) {
        pointer_was_drag = false
        return
    }
    adderFor(item)(item)
}

function onPointerDown(e, item) {
    if (e.button !== 0) return

    drag_startX = e.clientX
    drag_startY = e.clientY
    drag_item_isActive.value = false
    drag_item.value = item
    pointer_was_drag = false
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

    if (Math.hypot(e.clientX - drag_startX, e.clientY - drag_startY) > drag_threshold) {
        drag_item_isActive.value = true
        document.body.classList.add('cursor-grabbing')
    }
}

function onPointerUp(e) {
    document.body.classList.remove('cursor-grabbing')
    window.removeEventListener('pointermove', onPointerMove)
    drag_listen_isActive = false

    if (!drag_item_isActive.value) return
    pointer_was_drag = true

    if (document.elementFromPoint(e.clientX, e.clientY)?.closest('.canvas')) {
        const { x, y } = clientToWorld(e.clientX, e.clientY)
        adderFor(drag_item.value)(drag_item.value, x, y)
    }

    drag_item_isActive.value = false
}

onBeforeUnmount(() => {
    if (!drag_listen_isActive) return
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template lang="pug">
.field-wrap(class="pt-3 pb-2 flex-none flex items-center gap-2")
    .field(class="relative w-full h-8 pl-7 flex items-center text-3.5 text-white font-light leading-none bg-zinc-800 outline outline-black focus-within:outline-yellow-500/50 rounded-sm pointer-text transition-colors")
        label(class="absolute left-1.5 pointer-text")
            svg(class="size-4 opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="m21 21-4.34-4.34")
                circle(cx="11" cy="11" r="8")
        input(v-model="fuzzy" class="size-full placeholder:opacity-50" placeholder="Search Accessories" autocomplete="off")

    //- Only worth showing once there is more than one kind to choose between.
    //- Same control as the deckbox facets, so a category here behaves exactly
    //- like a Format or a Theme there.
    ListFilter(
        v-if="filter_list.length > 1"
        v-model="filter_active"
        label="Category"
        :options="filter_list"
    )

ScrollAreaRoot(
    class="group/scroll relative flex-1 min-h-0 flex flex-col z-10"
    type="always"
    style="--reka-scroll-area-thumb-width: 4px"
)
    ScrollAreaViewport(class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3")
        Motion(
            v-if="results.length"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :exit="{ opacity: 0 }"
            class="group/list relative flex flex-col gap-1 overflow-hidden"
        )
            .item(
                v-for="result in results"
                :key="result.item.name"
                class="relative pl-2 pr-2 py-1.5 w-full flex items-center hover:bg-mauve-800! rounded-sm overflow-hidden touch-none first:bg-mauve-800 first:group-hover/list:bg-transparent"
                @pointerdown="onPointerDown($event, result.item)"
                @click="click_row(result.item)"
            )

                .bg(
                    v-if="result.item.thumbnail"
                    class="absolute top-0 -right-1/12 w-1/2 h-full bg-cover bg-center opacity-0"
                    style="mask-image: linear-gradient(to right, transparent, white); animation: 0.5s linear 0.5s 1 normal both running reveal-fade-2"
                    :style="{ backgroundImage: `url('${result.item.thumbnail}')` }"
                )

                .text(class="grow min-w-0 text-3.25 text-neutral-200")
                    span(class="truncate") {{ result.item.name }}

        Motion(
            v-else
            :initial="{ opacity: 0, scale: 0 }"
            :animate="{ opacity: 1, scale: 1 }"
            :exit="{ opacity: 0, scale: 0.6 }"
            class="py-4 flex flex-col justify-center items-center gap-2"
        )
            svg(class="size-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                circle(cx="11" cy="11" r="8")
                path(d="m21 21-4.3-4.3")
                path(d="M11 7v4")
                path(d="M11 15h.01")
            span No Results...

    ScrollAreaScrollbar(orientation="vertical" class="flex justify-center select-none touch-none z-200 bg-transparent w-1 rounded-r")
        ScrollAreaThumb(class="flex-1 bg-brand-tert rounded-full relative")
        .track(class="absolute w-0.5 h-full bg-white/10 rounded-full")
</template>
