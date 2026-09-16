<script setup>
// The center's loading state: placeholders held in the exact layout the real
// results will land in, so the manifest arriving swaps content in without
// moving anything.
//
// This exists because the route no longer waits for the manifest (see
// router/index.js). The center is mounted and empty for as long as the download
// takes — seconds, on mtg — and an empty grid captioned "No matching cards" is
// a worse lie than a spinner.
//
// The layout comes from ./layout.js, the same spec table.vue renders results
// with. That is what keeps this the same shape as the thing it stands in for:
// padding maintained separately here would drift, and the drift would only ever
// show up as the grid jumping at the moment the data arrives.
import { computed } from 'vue'

import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useState } from './state.js'
import { LAYOUT, ROW_EDGE, gridColumns } from './layout.js'

// Assign
const { card_ratio } = useGameStore()
const { search_active } = useState()

const is_grid = computed(() => search_active.value.layout === 'grid')
const layout = computed(() => LAYOUT[search_active.value.layout] ?? LAYOUT.grid)

// Enough to fill a tall viewport without laying out placeholders nobody will
// scroll to before the real cards replace them.
const count = computed(() => (is_grid.value ? search_active.value.column * 4 : 12))
</script>

<template lang="pug">
//- role/aria-busy on the container is what tells a screen reader to wait; the
//- placeholders themselves are the shape of absent content, not content, so
//- they stay out of the tree entirely.
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
            //- Grid placeholders mirror a card cell's three bands (art, title,
            //- subtitle); rows mirror a row's two.
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
