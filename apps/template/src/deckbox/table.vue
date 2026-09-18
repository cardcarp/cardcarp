<script setup>
// Core
import { computed } from 'vue'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'

// Components
import CellGrid from './table-cell-grid.vue'
import CellDeck from './table-cell-deck.vue'
import CellCard from './table-cell-card.vue'
import TableSkeleton from './table-skeleton.vue'

// Composables
import { useGameStore } from '@cardcarp/core/composable/game.js'

// State
import { useState } from '@cardcarp/deckbox/state.js'
import { LAYOUT, ROW_EDGE, gridColumns } from './layout.js'

// Stores
import { drag_item_isActive, use_drag } from '@cardcarp/core/store/drag.js'
import {
    preview_item_isActive,
    mouseover_cell_card,
    mouseleave_cell_card,
} from '@cardcarp/core/store/preview.js'

// Assign
const { card_ratio, loading, error } = useGameStore()
const { 
    search_active, 
    active_type, 
    grouped, 
    column_active,
    select_deck, 
    panel_center_content, 
    panel_right_content,
    deck_selected, 
    deck_card_add,
    dialog_single
} = useState()

const empty_state = computed(() => {
    if (loading.value) return null
    if (error.value) return 'error'
    if (panel_center_content.value === 'list' && !deck_selected.value) return 'deck'
    if (!grouped.value.length) return 'results'
    return null
})

const show_skeleton = computed(() => loading.value && !grouped.value.length)

const is_grid = computed(() => search_active.value.layout === 'grid')
const layout = computed(() => LAYOUT[search_active.value.layout] ?? LAYOUT.grid)

const list_style = computed(() =>
    is_grid.value ? gridColumns(column_active.value) : null
)

const item_style = computed(() =>
    is_grid.value ? { aspectRatio: card_ratio.value } : ROW_EDGE
)

const cell = computed(() => {
    if (is_grid.value) return CellGrid
    return active_type.value === 'collection' ? CellDeck : CellCard
})

function show_divider(index) {
    return is_grid.value && index + 1 < grouped.value.length
}

const drag_enabled = computed(() => panel_right_content.value === 'build')

// Local
let pointer_was_drag = false

const { start: drag_start } = use_drag((e, item) => {
    pointer_was_drag = true

    const target = document.elementFromPoint(e.clientX, e.clientY)
    if (target?.closest('.panel-collect')) {
        const dropList = target.closest('.list')?.dataset.list ?? 'main'
        deck_card_add(item, dropList)
    }
})

// Actions
function click_row(item) {
    if (drag_item_isActive.value) return

    if (pointer_was_drag) {
        pointer_was_drag = false
        return
    }

    if (active_type.value === 'collection') {
        select_deck(item)
    } else {
        dialog_single.card = item
        dialog_single.sibling = grouped.value.flatMap(list =>
            list.item_list
        )
        dialog_single.active = true
    }
}

function onPointerDown(e, item) {
    if (active_type.value === 'collection') return

    pointer_was_drag = false
    preview_item_isActive.value = false

    if (!drag_enabled.value) return

    drag_start(e, item)
}

</script>

<template lang="pug">
.lists(class="relative")

    AnimatePresence(mode="popLayout")
        Motion(
            v-if="empty_state"
            class="p-10 flex flex-col justify-center items-center gap-2 text-center opacity-50"
            :initial="{ opacity: 0, y: 0, scale: 0.9 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 0, scale: 0.9 }"
        )
            .wrap(
                v-if="empty_state === 'deck'"
                @click="panel_center_content = 'deck'"
                class="p-3 flex flex-col gap-1 outline outline-white/20 outline-dashed rounded-sm hover:outline-yellow-500/50 hover:text-yellow-500/80"
            )
                .title(class="text-3.5 text-balance font-light leading-tight capitalize") No deck selected
                .description(class="text-3 opacity-60") Choose one from All Decks

            .wrap(
                v-else-if="empty_state === 'error'"
                class="p-3 flex flex-col gap-1 outline outline-white/20 outline-dashed rounded-sm"
            )
                .title(class="text-3.5 text-balance font-light leading-tight capitalize") Couldn't load this game
                .description(class="text-3 opacity-60") Check your connection and reload

            .wrap(
                v-else
                class="p-3 outline outline-white/20 outline-dashed rounded-sm"
            )
                .title(class="text-3.5 text-balance font-light leading-tight capitalize") No matching {{ panel_center_content === 'deck' ? 'decks' : 'cards' }}

    TableSkeleton(v-if="show_skeleton")

    .list(
        v-for="(list, index) in grouped"
        :key="list.name"
        :data-list="list.name"
        class="group/list"
    )
        .list-title(
            v-if="list.name !== 'all'"
            class="group-hover/list:group-[&.active]/list:text-white px-4 h-9 flex items-center gap-3 text-white/25 text-left text-3.5 font-normal leading-none whitespace-nowrap capitalize"
            :class="layout.title"
        )
            span {{ list.name }}

        Motion(
            class="relative"
            :class="layout.list"
            :style="list_style"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
        )
            .wrap(
                v-if="!list.item_list.length"
                class="absolute p-3 outline outline-white/20 outline-dashed rounded-sm group-hover/list:group-[&.active]/list:outline-yellow-500/50 group-hover/list:group-[&.active]/list:text-yellow-500/80"
            )
                .title(class="text-3.5 text-balance font-light leading-tight capitalize") Drag and Drop cards

            .item(
                v-for="item in list.item_list"
                :key="`${search_active.layout}-${item.id}-${list.name}`"
                class="@container/card group/item relative w-full overflow-hidden"
                :class="[layout.item, { 'touch-none': drag_enabled }]"
                :style="item_style"
                :data-id="item.id"
                @pointerdown="onPointerDown($event, item)"
                @click="click_row(item)"
                @pointerenter="mouseover_cell_card($event, item, active_type)"
                @pointerleave="mouseleave_cell_card"
            )
                .hover(
                    class="absolute inset-0 rounded-lg transition-opacity opacity-0 group-hover/item:opacity-100"
                    :class="layout.hover"
                    :style="drag_item_isActive ? 'opacity: 0' : ''"
                )

                component(:is="cell" :item="item")

        template(v-if="show_divider(index)")
            .divider-dark(class="w-full h-0.5 bg-black")
            .divider-light(class="w-full h-px bg-white/5")

</template>
