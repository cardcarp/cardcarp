<script setup>
// Core
import { markRaw, ref, watch } from 'vue'

// Libraries
import { watchDebounced, useMagicKeys } from '@vueuse/core'
import { AnimatePresence, Motion } from 'motion-v'

// Components

// UI
import {
    PopoverArrow,
    PopoverClose,
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,

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

    TooltipContent, 
    TooltipPortal, 
    TooltipRoot, 
    TooltipTrigger
} from 'reka-ui'

// Stores

// Local
const popover = ref(false)
const popover_tab = ref('Coins & Dice')

const counter_list = [
    {
        "name": "2",
        "icon": `circle(cx="12" cy="12" r="10")`
    }
]

// Die
const popover_tab_die_query = ref('')
const popover_tab_die_results = ref(null)
const popover_tab_die_error = ref(null)
const popover_tab_die_loading = ref(false)

</script>

<template lang="pug">
PopoverRoot(:modal="false" v-model:open="popover")
    PopoverTrigger
        TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
            TooltipTrigger
                .tool-load(
                    class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                    :class="{'bg-white! text-black' : popover}"
                )
                    svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        rect(width="12" height="12" x="2" y="10" rx="2" ry="2")
                        path(d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6")
                        path(d="M6 18h.01")
                        path(d="M10 14h.01")
                        path(d="M15 6h.01")
                        path(d="M18 9h.01")

            TooltipPortal
                AnimatePresence
                    TooltipContent(asChild align="center" side="right" :sideOffset="4")
                        Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 flex items-center gap-2 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                            span Counters
                            code(class="flex items-center gap-px font-mono opacity-50") 
                                span C
    PopoverPortal
        AnimatePresence
            PopoverContent(asChild align="center" side="right" :sideOffset="12")
                Motion(
                    :initial="{ opacity: 0, scale: 0 }" 
                    :animate="{ opacity: 1, scale: 1 }" 
                    :exit="{ opacity: 0, scale: 0.6 }" 
                    class="relative bg-black border border-white/15 rounded-xl z-99 overflow-hidden"
                )               
                    .content(class="p-2 grid grid-cols-3 gap-2")
                        .btn(v-for="counter in counter_list" class="group/btn relative size-12 aspect-square flex items-center justify-center hover:bg-white/10 rounded-lg pointer-point")
                            .static(class="flex items-center justify-center")
                                svg(v-html="counter.icon" class="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
</template>