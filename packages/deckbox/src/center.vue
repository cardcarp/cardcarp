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
import { useState } from './state.js'

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

// --- Width ------------------------------------------------------------------
// The grid sizes its cards against the center's full width, so it has to know
// how much of that width the panels are holding (state.js).
//
// Measured on this element rather than the scroll viewport inside it: the
// viewport gains padding when its scrollbar appears, and a width that moved
// with the scrollbar could drop a column, shorten the content, and take the
// scrollbar away again.
const center_el = useTemplateRef('center_el')

function measure() {
    center_width.value = center_el.value?.getBoundingClientRect().width ?? 0
}

// The width changes for two reasons, and they are not observable in the same
// way. A window resize is only knowable after it happens — hence the observer.
// A panel is knowable in advance: its grid track snaps in the same flush that
// opens it, so measuring on the next tick catches the new width before paint.
// Left to the observer, which reports after layout, the grid would draw one
// frame at the old card size and then correct itself.
useResizeObserver(center_el, measure)

watch(
    [panel_left_content, panel_right_content, is_desktop],
    () => nextTick(measure),
    { immediate: true }
)

// --- Infinite scroll --------------------------------------------------------
// Reka's ScrollAreaRoot exposes `viewport`: the div that actually scrolls (the
// root itself doesn't overflow). Handing that element to useInfiniteScroll is
// all the custom scroll area needs — it listens for native scroll on it, which
// Reka leaves untouched.
//
// The results themselves are already in memory; "loading" here just widens the
// render window (page.js), so each step is synchronous and needs no spinner.
const scroll_area = ref(null)
const viewport = computed(() => scroll_area.value?.viewport ?? null)

useInfiniteScroll(
    viewport,
    () => load_more(),
    {
        // Start the next page while the tail is still a screen away.
        distance: 800,
        canLoadMore: () => has_more.value,
    }
)

// A new result set restarts at page 1 (state.js). Scroll back to the top with
// it, or the clamped position would sit at the end of the shortened list and
// immediately pull the next page in.
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
