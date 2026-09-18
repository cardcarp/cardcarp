<script setup>
import { computed } from 'vue'

import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useState } from '@cardcarp/deckbox/state.js'
import { LAYOUT, ROW_EDGE, gridColumns } from './layout.js'

// Assign
const { card_ratio } = useGameStore()
const { search_active } = useState()

const is_grid = computed(() => search_active.value.layout === 'grid')
const layout = computed(() => LAYOUT[search_active.value.layout] ?? LAYOUT.grid)

const count = computed(() => (is_grid.value ? search_active.value.column * 4 : 12))
</script>

<template lang="pug">
.table-skeleton(role="status" aria-busy="true" class="relative")
    span(class="sr-only") Loading cards

    .placeholders(
        aria-hidden="true"
        class="relative"
        :class="layout.list"
        :style="is_grid ? gridColumns(search_active.column) : null"
    )
        .item(
            v-for="n in count"
            :key="n"
            class="relative w-full overflow-hidden"
            :class="[layout.item, is_grid ? '@container/card rounded-[calc(3cqw+1px)]' : '']"
            :style="is_grid ? { aspectRatio: card_ratio } : ROW_EDGE"
        )
            .bands(
                v-if="is_grid"
                class="absolute inset-0 size-full p-2 grid grid-rows-6 gap-2"
            )
                .skeleton(class="row-span-3 w-full h-full rounded")
                .skeleton(class="row-span-1 w-full h-full rounded")
                .skeleton(class="row-span-1 w-4/6 h-full rounded")

            .bands(v-else class="flex items-center gap-3")
                .skeleton(class="w-3/4 h-3 rounded")
                .skeleton(class="shrink-0 w-1/4 h-3 rounded")
</template>
