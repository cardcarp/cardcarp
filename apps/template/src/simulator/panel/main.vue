<script setup>
import { AnimatePresence, Motion } from 'motion-v'

import { useGameStore } from '@cardcarp/core/composable/game.js'

import DialogScroll from '../../core/dialog-scroll.vue'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

import { panel_open } from '../ui.js'
import { useControls } from '../use-controls.js'

const { config } = useGameStore()
const { panel } = useControls()
</script>

<template lang="pug">
AnimatePresence(:initial="false")

    Motion(
        v-if="panel_open"
        key="panel"
        :initial="{ opacity: 0, x: 24 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: 24 }"
        :transition="{ duration: 0.18, ease: 'easeOut' }"
        class="fixed top-3 right-3 bottom-3 w-64 flex flex-col rounded-xl z-60 overflow-hidden bg-neutral-950/80 border border-white/10 backdrop-blur-md shadow-lg"
    )
        .header(class="flex-none h-9 pl-3 pr-1.5 flex items-center gap-2 border-b border-white/8")
            span(class="grow min-w-0 truncate font-light text-2.75 text-neutral-500 tracking-wider leading-none") {{ config?.name }}
            .btn(
                @click="panel_open = false"
                title="Collapse panel"
                class="flex-none size-6 flex items-center justify-center text-neutral-400 rounded-md hover:bg-white/8 hover:text-white"
            )
                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="m6 17 5-5-5-5")
                    path(d="m13 17 5-5-5-5")

        ScrollAreaRoot(
            class="group/scroll relative flex-1 min-h-0 flex flex-col z-10"
            type="auto"
            style="--reka-scroll-area-thumb-width: 4px"
        )
            ScrollAreaViewport(class="relative flex-1 min-h-0 w-full")

                .sections(class="flex flex-col")

                    component(v-for="(section, id) in panel" :key="id" :is="section")

            ScrollAreaScrollbar(
                orientation="vertical"
                class="absolute flex pr-1 select-none touch-none rounded-full"
            )
                ScrollAreaThumb(class="flex-1 bg-white/30 rounded")        

    Motion(
        v-else
        key="rail"
        :initial="{ opacity: 0, x: 24 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: 24 }"
        :transition="{ duration: 0.18, ease: 'easeOut' }"
        class="fixed top-4.5 right-3 z-60"
    )
        .btn(
            @click="panel_open = true"
            title="Expand panel"
            data-tour="panel"
            class="w-10 h-7 flex items-center justify-center text-white bg-black/40 backdrop-blur-md border border-neutral-700 rounded-full shadow-lg hover:bg-black"
        )
            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="m11 17-5-5 5-5")
                path(d="m18 17-5-5 5-5")
</template>
