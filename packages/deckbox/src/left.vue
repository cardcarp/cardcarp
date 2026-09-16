<script setup>
// Core
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Libraries
import { AnimatePresence, Motion, motion } from 'motion-v'

// UI
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
    DialogTrigger,

    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,
    ScrollAreaCorner,

    TabsContent, 
    TabsIndicator, 
    TabsList, 
    TabsRoot, 
    TabsTrigger,

    VisuallyHidden
} from 'reka-ui'

// Parts
import Display from './left-display.vue'
import Filter from './left-filter.vue'

// Stores
import { useState } from './state.js'

// Assign
const {
    panel_left_content,
    panel_center_content,
    reset_filter,
    result_total,
    any_active
} = useState()

</script>

<template lang="pug">
//- Below lg this leaves the grid: absolute, so the panel lies over the center
//- rather than taking a column off a width that has none to give. Out of flow
//- it is also 20rem of pointer-catching nothing whenever it is closed, hence
//- the transparent, click-through shell — only the sliding panel inside it is
//- solid, and only that panel takes clicks.
.left(
    class="relative min-w-0 min-h-0 h-full flex flex-col bg-zinc-950 z-20"
    class="max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:bg-transparent max-lg:pointer-events-none"
)
    Motion(
        :initial="{ x: '-100%' }"
        :animate="{ x: panel_left_content ? 0 : '-100%' }"
        :transition="{ type: 'tween', duration: 0.3, easing: 'easeInOut' }"
        class="flex-none relative p-2 pr-2.75 min-h-0 w-80 h-full flex flex-col font-mono text-3 leading-none z-10 max-lg:bg-zinc-950 max-lg:pointer-events-auto"
        style="box-shadow: inset -1px 0 0 0 hsl(0 0 100 / 0.1), inset -3px 0 0 0 hsl(0 0 0)"
    )
        .box(
            class="flex-1 min-h-0 h-full flex flex-col bg-linear-to-r from-neutral-950 via-neutral-900 to-neutral-950 rounded-2xl"
            style="box-shadow: 2px 0 0 hsl(0 0 0), -2px 0 0 hsl(0 0 0), 2px 0 4px hsl(0 0 0 / 0.5), -2px 0 4px hsl(0 0 0 / 0.5)"
        )

            .title(
                class="h-10 flex items-center justify-center text-white/75 text-shadow bg-linear-to-br from-neutral-900 to-neutral-950 rounded-t-xl"
                style="box-shadow: inset 0 1px 0 0 hsl(0 0 100 / 0.02 ), inset 0 -1px 0 0 hsl(0 0 100 / 0.1 ), inset 0 -2px 0 0 black"
            ) Filter & Display

            ScrollAreaRoot(
                class="group/scroll relative flex-1 min-h-0 w-full flex flex-col z-10" 
                type="auto"
                style="--reka-scroll-area-thumb-width: 4px;"
            )
                ScrollAreaViewport(
                    class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3"
                )

                    Display
                    Filter
                    
                ScrollAreaScrollbar(
                    orientation="vertical" 
                    class="flex p-1 bg-black select-none touch-none"
                    style="box-shadow: -2px 0 0 0 hsl(0 0 0), inset 1px 0 0 0 hsl(0 0 100 / 0.08)"
                )
                    ScrollAreaThumb(class="flex-1 bg-neutral-700 rounded")

            .reset(
                class="flex-none rounded-b-2xl"
                style="box-shadow: 0 -3px 0 0 hsl(0 0 0), 0 -6px 6px 0 hsl(0 0 0 / 0.15)"
            )
                .divider-light(class="w-full h-px bg-white/5")
                .padding(class="px-4 pt-3 pb-3.5 flex flex-col justify-center")
                    .btns(class="p-1.5 flex justify-center items-center gap-1 bg-black rounded-lg" style="box-shadow: 0 1px 0 0 hsl(0 0 100 / 0.075)")
                        .btn(
                            @click="reset_filter()" 
                            class="px-4 w-full h-8 flex items-center justify-center text-white/50 bg-neutral-800 rounded transition-colors"
                            :class="{ 'bg-lime-800! hover:bg-lime-700! hover:text-white' : any_active }"
                            style="box-shadow: inset 0 1px 4px 0 hsl(0 0 100 / 0.15)"
                        ) RESET FILTERS

</template>