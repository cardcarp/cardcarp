<script setup>
// Core
import { markRaw, ref, watch } from 'vue'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'

// Components
import AccessoryList from './accessory/list.vue'

// UI
import {
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,

    TooltipContent, 
    TooltipPortal, 
    TooltipRoot, 
    TooltipTrigger
} from 'reka-ui'

const open = ref(false)
</script>

<template lang="pug">
PopoverRoot(:modal="false" v-model:open="open")
    PopoverTrigger
        TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
            TooltipTrigger
                .tool-load(
                    class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-full"
                    :class="{'bg-white! text-black' : open}"
                )
                    svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M10 15h4")
                        path(d="m14.817 10.995-.971-1.45 1.034-1.232a2 2 0 0 0-2.025-3.238l-1.82.364L9.91 3.885a2 2 0 0 0-3.625.748L6.141 6.55l-1.725.426a2 2 0 0 0-.19 3.756l.657.27")
                        path(d="m18.822 10.995 2.26-5.38a1 1 0 0 0-.557-1.318L16.954 2.9a1 1 0 0 0-1.281.533l-.924 2.122")
                        path(d="M4 12.006A1 1 0 0 1 4.994 11H19a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z")

            TooltipPortal
                AnimatePresence
                    TooltipContent(asChild align="center" side="right" :sideOffset="6")
                        Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 flex items-center gap-2 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                            span Accessories
    PopoverPortal
        AnimatePresence
            PopoverContent(
                asChild
                align="start"
                side="right"
                :sideOffset="12"
                :collisionPadding="12"
                @openAutoFocus="$event.preventDefault()"
            )
                Motion(
                    :initial="{ opacity: 0, scale: 0 }" 
                    :animate="{ opacity: 1, scale: 1 }" 
                    :exit="{ opacity: 0, scale: 0.6 }" 
                    class="w-80 max-h-80 flex flex-col rounded-xl z-99 overflow-hidden bg-neutral-950 border border-white/10 shadow-lg"
                )
                    
                    .body(class="relative flex-1 min-h-0 w-full px-3 pb-3 flex flex-col")
                        AccessoryList

</template>