<script setup>
// Core
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'

// Libraries
import { useInfiniteScroll, useResizeObserver } from '@vueuse/core'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

// Components
import Table from './table.vue'
import Detail from './center-detail.vue'
import Actions from './dropdown-action.vue'

// State
import { useState } from '@cardcarp/deckbox/state.js'

// Assign
const {
    results,
    has_more,
    load_more,
    center_width,
    is_desktop,
    panel_left_content,
    panel_right_content
} = useState()

const center_el = useTemplateRef('center_el')

function measure() {
    center_width.value = center_el.value?.getBoundingClientRect().width ?? 0
}

useResizeObserver(center_el, measure)

watch(
    [panel_left_content, panel_right_content, is_desktop],
    () => nextTick(measure),
    { immediate: true }
)

const scroll_area = ref(null)
const viewport = computed(() => scroll_area.value?.viewport ?? null)

useInfiniteScroll(
    viewport,
    () => load_more(),
    {
        distance: 800,
        canLoadMore: () => has_more.value,
    }
)

watch(results, () => viewport.value?.scrollTo({ top: 0 }))
</script>

<template lang="pug">
    .center(ref="center_el" class="relative flex-1 min-h-0 size-full flex flex-col")

        ScrollAreaRoot(
            ref="scroll_area"
            class="group/scroll relative flex-1 min-h-0 w-full flex flex-col z-10"
            type="always"
            style="--reka-scroll-area-thumb-width: 4px;"
        )
            ScrollAreaViewport(
                class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3"
            )

                .content(class="relative")

                    Detail

                    Table

            ScrollAreaScrollbar(
                orientation="vertical"
                class="flex p-1 bg-neutral-800 select-none touch-none"
                style="box-shadow: -2px 0 0 0 hsl(0 0 0), inset 1px 0 0 0 hsl(0 0 100 / 0.08)"
            )
                ScrollAreaThumb(class="flex-1 bg-neutral-600 rounded")
</template>
