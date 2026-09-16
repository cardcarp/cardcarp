<script setup>
// The one control every object toolbar carries.
//
// Delete was keyboard-only, which on a tablet meant not at all: an iPad or Android player
// could put a card, a shape, a note or a playmat on the table and then had no way whatsoever
// to take it off again. The key stays for desktop; this is the same verb with something to
// tap. Kept as a shared component rather than pasted into each toolbar so the icon, the
// wording and the destructive styling can't drift apart across five files.
//
// Single tap, no confirmation, because that is what the key does — and the button only
// exists while something is selected, which is already a deliberate act.
import { AnimatePresence, Motion } from 'motion-v'
import {
    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger,
} from 'reka-ui'
import { useTable } from '../../use-table.js'
import { keyHint } from '../../use-controls.js'

// The table, through its object (see use-table.js).
const { delete: selectionDelete } = useTable().selection

// Delete's key in this app, from the list the keyboard binds (controls.js).
const delete_hint = keyHint('selection.delete')

// Wrapper version, not the raw canvas one: peers get nodes:destroy, so the object leaves
// every table rather than just this one.
</script>

<template lang="pug">
TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
    TooltipTrigger
        //- Neutral at rest so it doesn't shout from a toolbar you opened for other reasons,
        //- red under the finger so what is about to happen is never a surprise.
        .tool-delete(
            @click="selectionDelete()"
            class="size-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:text-red-400"
        )
            svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M3 6h18")
                path(d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6")
                path(d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2")
                path(d="M10 11v6")
                path(d="M14 11v6")

    TooltipPortal
        AnimatePresence
            TooltipContent(asChild align="center" side="top" :sideOffset="4")
                Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                    span Delete
                    code(v-if="delete_hint" class="font-mono ml-1 opacity-50") {{ delete_hint }}
</template>
