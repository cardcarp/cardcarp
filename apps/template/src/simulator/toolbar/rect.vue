<script setup>
import { ref } from 'vue'
import { AnimatePresence, Motion } from 'motion-v'
import {
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,

    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger,
} from 'reka-ui'

import { useStore } from '../composable/use-store.js'

import Swatches from './shared/swatches.vue'
import ToolDelete from './shared/tool-delete.vue'
import { useTable } from '../use-table.js'

const { current: uiSelection } = useTable().selection
const { changeColor: rectChangeColor } = useTable().rects

const ui_selection = useStore(uiSelection)

const popoverColor = ref(false)

function pick_color(color) {
    rectChangeColor(color)
    popoverColor.value = false
}
</script>

<template lang="pug">
AnimatePresence
    Motion(
        v-if="ui_selection.type === 'rect'"
        key="toolbar-rect"
        :initial="{ opacity: 0, y: 0 }"
        :animate="{ opacity: 1, y: -10 }"
        :exit="{ opacity: 0, y: 0 }"
        class="absolute p-2 flex gap-1 bg-neutral-950 border border-white/5 rounded-xl z-50 -translate-x-1/2 -translate-y-full"
        :style="{ left: `${ui_selection.x}px`, top: `${ui_selection.y}px` }"
    )
        PopoverRoot(:modal="false" v-model:open="popoverColor")
            PopoverTrigger
                TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                    TooltipTrigger
                        .tool-color(
                            class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                            :class="{'bg-white!' : popoverColor}"
                        )
                            .chip(
                                class="size-5 rounded-full outline outline-white/20"
                                :style="{ backgroundColor: ui_selection?.data?.fill }"
                            )

                    TooltipPortal
                        AnimatePresence
                            TooltipContent(asChild align="center" side="top" :sideOffset="4")
                                Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                    span Fill Color

            PopoverPortal
                AnimatePresence
                    PopoverContent(
                        asChild 
                        align="center" 
                        side="bottom" 
                        :sideOffset="12"
                        :collisionPadding="12"
                    )
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }"
                            :animate="{ opacity: 1, scale: 1 }"
                            :exit="{ opacity: 0, scale: 0.6 }"
                            class="z-99"
                        )
                            Swatches(:on-pick="pick_color")

        ToolDelete
</template>
