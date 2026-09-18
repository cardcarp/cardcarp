<script setup>
// Core
import { markRaw, watch } from 'vue'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'

// Components
import Card from './deckbox/card.vue'
import Deck from './deckbox/deck.vue'

// UI
import {
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,

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

import { deckbox_open as popoverDeckbox_open, deckbox_tab as popoverDeckbox_tab } from '../ui.js'

function setOpen(open) {
    if (open) popoverDeckbox_tab.value = 'Cards'
    popoverDeckbox_open.value = open
}
</script>

<template lang="pug">
PopoverRoot(:modal="false" :open="popoverDeckbox_open" @update:open="setOpen")
    PopoverTrigger
        TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
            TooltipTrigger
                .tool-load(
                    data-tour="deckbox"
                    class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-full"
                    :class="{'bg-white! text-black' : popoverDeckbox_open}"
                )
                    svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/>
                        <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/>
                        <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>

            TooltipPortal
                AnimatePresence
                    TooltipContent(asChild align="center" side="right" :sideOffset="6")
                        Motion(
                            v-if="!popoverDeckbox_open"
                            :initial="{ opacity: 0, scale: 0 }" 
                            :animate="{ opacity: 1, scale: 1 }" 
                            :exit="{ opacity: 0, scale: 0.6 }" 
                            class="px-3 py-1.5 flex items-center gap-2 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99"
                        )
                            span Cards
    PopoverPortal
        PopoverContent(
            asChild
            align="start"
            side="right"
            :sideOffset="12"
            :alignOffset="-8"
            :collisionPadding="12"
            @openAutoFocus="$event.preventDefault()"
        )
            Motion(
                data-tour="deckbox-panel"
                :initial="{ opacity: 0, scale: 0 }" 
                :animate="{ opacity: 1, scale: 1 }"
                class="w-80 max-h-80 flex flex-col rounded-xl z-99 overflow-hidden bg-neutral-950 border border-white/10 shadow-lg"
            )
                
                TabsRoot(orientation="horizontal" v-model="popoverDeckbox_tab" class="relative flex-1 min-h-0 w-full p-3 mx-auto flex flex-col")
                    TabsList(class="flex-none flex gap-2")
                        TabsTrigger(
                            v-for="tab in ['Cards', 'Decks', 'Saved']" 
                            :value="tab" 
                            class="group/tabs px-1.5 h-5.5 data-[state=active]:bg-sky-500 rounded font-bold font-stretch-110% text-3.25 text-white/50 leading-none hover:text-white data-[state=active]:text-white"
                        )
                            .label(class="") {{ tab }}
                                    
                    .content(class="flex-1 min-h-0 w-full flex flex-col")

                        TabsContent(value="Cards" class="flex-1 min-h-0 w-full flex flex-col")
                            Card

                        TabsContent(value="Decks" class="flex-1 min-h-0 w-full flex flex-col")
                            Deck(source="archive")

                        TabsContent(value="Saved" class="flex-1 min-h-0 w-full flex flex-col")
                            Deck(source="saved")

</template>