<script setup>
import { AnimatePresence, Motion } from 'motion-v'
import {
    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger,
} from 'reka-ui'
import { useTable } from '../../use-table.js'
import { keyHint } from '../../use-controls.js'

const { delete: selectionDelete } = useTable().selection

const delete_hint = keyHint('selection.delete')
</script>

<template lang="pug">
TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
    TooltipTrigger
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
