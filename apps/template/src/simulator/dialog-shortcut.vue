<script setup>
// Libraries
import { AnimatePresence, Motion } from 'motion-v'

// UI
import {
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,

    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,

    VisuallyHidden
} from 'reka-ui'

// Stores
import { dialogShortcut_open } from './ui.js'
import { keyHint, useControls } from './use-controls.js'

const GROUPS = [
    {
        id: 'navigation',
        label: 'Navigation Tools',
        icon: '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />',
    },
    {
        id: 'table',
        label: 'Table Tools',
        icon: '<circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="19" cy="19" r="1"/><circle cx="5" cy="19" r="1"/>',
    },
    {
        id: 'card',
        label: 'Card Tools',
        icon: '<path d="M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74z"/><path d="m20 14.285 1.5.845a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74l1.5-.845"/>',
    },
    {
        id: 'draw',
        label: 'Draw Tools',
        icon: '<path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />',
    },
]

const entries = Object.entries(useControls().keys)

const list = GROUPS
    .map(group => ({
        ...group,
        list: entries
            .filter(([, entry]) => entry.group === group.id && entry.sheet !== false)
            .map(([id, entry]) => ({
                label: typeof entry.sheet === 'string' ? entry.sheet : entry.label,
                key: keyHint(id),
            })),
    }))
    .filter(group => group.list.length)

</script>

<template lang="pug">
DialogRoot(:modal="true" :open="dialogShortcut_open")
    DialogPortal
        AnimatePresence()
            DialogOverlay(asChild)
                Motion(
                    :initial="{ opacity: 0 }" 
                    :animate="{ opacity: 1 }" 
                    :exit="{ opacity: 0 }"
                    class="fixed inset-0 z-99"
                    @click="dialogShortcut_open = false"
                )
            DialogContent(asChild)
                Motion(
                    :initial="{ opacity: 0, x: '-100%' }" 
                    :animate="{ opacity: 1, x: 0 }" 
                    :exit="{ opacity: 0, x: '-100%' }"
                    :transition="{ type: 'linear' }"
                    class="fixed top-0 left-0 w-64 h-full flex flex-col bg-black z-100" 
                )

                    VisuallyHidden(asChild)
                        DialogTitle
                    VisuallyHidden(asChild)
                        DialogDescription(:aria-describedby="undefined")

                    .header(class="relative flex-none px-2 py-4 flex items-center gap-3 border-b border-neutral-900")
                        .icon(class="text-neutral-500")
                            svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M3 3h6l6 18h6")
                                path(d="M14 3h7")
                        .title(class="grow text-white") Keyboard Shortcuts

                        .close(
                            @click="dialogShortcut_open = false" 
                            class="group/close flex-none size-5 flex justify-center items-center hover:bg-mauve-800 rounded-full pointer-point z-101"
                        )
                            svg(class="flex-none size-3 text-white/50 group-hover/close:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M18 6 6 18")
                                path(d="m6 6 12 12")


                    ScrollAreaRoot(class="relative flex-1 min-h-0 w-full flex flex-col group/scroll" type="auto")
                        ScrollAreaViewport(class="flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-2.5")

                            .sections(class="p-3 flex flex-col gap-8 text-3.25 leading-none")
                                .section(
                                    v-for="group in list"
                                    class="flex flex-col gap-3"
                                )
                                    .row(class="flex items-center gap-2") 
                                        .icon(v-if="group.icon")
                                            svg(class="relative flex-none size-5 text-mauve-500 group-hover/close:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                g(v-html="group.icon")
                                        .span(class="uppercase text-neutral-500 tracking-wider") {{ group.label }}
                                    
                                    .items(class="flex flex-col gap-2")
                                        .row(
                                            v-for="item in group.list"
                                            class="p-1 flex items-center gap-4 rounded hover:bg-neutral-950"
                                        ) 
                                            .span(class="grow text-white/80") {{ item.label }}
                                            .key(class="flex-none text-2.5 font-mono px-2 py-1.5 bg-neutral-900 rounded") {{ item.key }}

                        ScrollAreaScrollbar(orientation="vertical" class="flex justify-center select-none touch-none z-200 bg-transparent w-1 rounded-r")
                            .track(class="absolute w-0.5 h-full bg-white/10 rounded-full")
                            ScrollAreaThumb(class="flex-1 bg-brand-tert rounded-full relative")
                        
</template>