<script setup>
// UI
import { AnimatePresence, Motion } from 'motion-v'
import {
    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger,
} from 'reka-ui'

// Stores
import { useStore } from '../composable/use-store.js'
import { useTable } from '../use-table.js'
import { keyHint, useControls } from '../use-controls.js'

const { current: currentTool, set: setTool } = useTable().tools
const { palette, toolbar } = useControls()

const current_tool = useStore(currentTool)

const tools = Object.entries(palette).map(([id, tool]) => ({
    id,
    label: tool.label,
    icon: tool.icon,
    activeWhen: tool.activeWhen ?? [id],
    hint: keyHint(`tool.${id}`),
}))
</script>

<template lang="pug">
.tools(data-tour="toolbar" class="absolute top-13 left-3 p-1 flex flex-col gap-1 items-center justify-center bg-black/40 backdrop-blur-md border border-white/5 rounded-full shadow-lg z-50")

    TooltipRoot(v-for="tool in tools" :key="tool.id" :delayDuration="100" :disable-closing-trigger="false")
        TooltipTrigger
            .tool-pointer(
                @click="setTool(tool.id)"
                class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-full [&.active]:bg-linear-to-b from-emerald-500 to-indigo-500 [&.active]:text-white"
                :class="{ active: tool.activeWhen.includes(current_tool) }"
            )
                svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(v-for="d in tool.icon" :key="d" :d="d")
        TooltipPortal
            AnimatePresence
                TooltipContent(asChild align="center" side="right" :sideOffset="6")
                    Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                        span {{ tool.label }}
                        code(v-if="tool.hint" class="font-mono ml-1 opacity-50") {{ tool.hint }}

    component(v-for="(button, id) in toolbar" :key="id" :is="button")
</template>
