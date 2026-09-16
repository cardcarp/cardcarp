<script setup>
// The right panel — the table's one persistent surface for everything that is not the canvas.
//
// It replaces three separately-positioned floating controls (zoom, flip view, the seats and
// multiplayer flyout) that had drifted into a chain of hand-tuned offsets — `right-65`,
// `right-53`, `right-3` — where adding a fourth meant re-measuring the other three. A stack
// in one box has no such arithmetic.
//
// Floating, not docked: it keeps a margin off every window edge rather than sitting flush,
// matching the rest of the table's chrome. And it OVERLAYS the canvas rather than taking
// layout width — see the note on `panel_open` in ui.js for why the Konva stage makes that
// the cheap and correct choice.
//
// What goes in it, and in what order, is controls.js's — see the note on `panel` there for why
// the contextual sections come first and Settings last.
import { AnimatePresence, Motion } from 'motion-v'

import { useGameStore } from '@cardcarp/core/composable/game.js'

import DialogScroll from '@cardcarp/core/part/dialog-scroll.vue'

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

// Stacking, stated once because the numbers are otherwise arbitrary: the panel sits at 60,
// above the canvas chrome (the tool palette and the floating selection toolbars, both 50) and
// below the dialogs, tooltips and drag ghost (99+). It has to outrank the selection toolbars
// specifically — a deck near the right edge of the window puts its toolbar under the panel,
// and at equal z-index DOM order would hand that overlap to whichever rendered last.
</script>

<template lang="pug">
//- Both branches are `fixed`, so the collapsed rail and the panel can overlap during the
//- crossfade without either of them moving anything. `:initial="false"` keeps the animation
//- off the first paint — on load the panel is simply there.
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
        //- Header. Carries the collapse control and nothing else — every other affordance
        //- belongs to a section, and a header that grew buttons would be a fourth place to
        //- look for one.
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

        //- One scroll column for every section. The stack can outrun the window — a table
        //- with eight seats and a deck selected does — and scrolling the whole column rather
        //- than any one section is what keeps a section's own height honest.
        ScrollAreaRoot(
            class="group/scroll relative flex-1 min-h-0 flex flex-col z-10"
            type="auto"
            style="--reka-scroll-area-thumb-width: 4px"
        )
            ScrollAreaViewport(class="relative flex-1 min-h-0 w-full")

                .sections(class="flex flex-col")

                    //- In controls.js's order: what you selected first, Settings last.
                    component(v-for="(section, id) in panel" :key="id" :is="section")

            ScrollAreaScrollbar(
                orientation="vertical"
                class="absolute flex pr-1 select-none touch-none rounded-full"
            )
                ScrollAreaThumb(class="flex-1 bg-white/30 rounded")        

    //- Collapsed: one pill in the corner the panel came from, so the gesture reverses in
    //- place. Same shape and offset as the panel's own top-right corner.
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
