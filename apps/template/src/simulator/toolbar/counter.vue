<script setup>
import { computed, ref } from 'vue'
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

import ToolDelete from './shared/tool-delete.vue'
import { useTable } from '../use-table.js'

const { current: uiSelection } = useTable().selection
const { increment: counterIncrement, decrement: counterDecrement, changeVariant: counterChangeVariant } = useTable().counters

const ui_selection = useStore(uiSelection)

const popoverVariant = ref(false)

const variants = computed(() => ui_selection.value?.data?.variants ?? [])
const activeVariant = computed(() => ui_selection.value?.data?.variant ?? null)

const value = computed(() => ui_selection.value?.data?.value ?? 0)

function pick_variant(variant) {
    counterChangeVariant(variant)
    popoverVariant.value = false
}

</script>

<template lang="pug">
AnimatePresence
    Motion(
        v-if="ui_selection.type === 'counter'"
        key="toolbar-counter"
        :initial="{ opacity: 0, y: 0 }"
        :animate="{ opacity: 1, y: -10 }"
        :exit="{ opacity: 0, y: 0 }"
        class="absolute p-2 flex gap-1 bg-neutral-950 border border-white/5 rounded-xl z-50 -translate-x-1/2 -translate-y-full"
        :style="{ left: `${ui_selection.x}px`, top: `${ui_selection.y}px` }"
    )

        .tool-decrement(
            @click="counterDecrement()"
            class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
        )
            svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                <path d="M5 12h14"/>

        .tool-value(class="min-w-8 px-1 flex items-center justify-center text-3.5 font-mono tabular-nums leading-none select-none") {{ value }}

        .tool-increment(
            @click="counterIncrement()"
            class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
        )
            svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>

        PopoverRoot(v-if="variants.length > 1" :modal="false" v-model:open="popoverVariant")
            PopoverTrigger
                TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                    TooltipTrigger
                        .tool-variant(
                            class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                            :class="{'bg-white!' : popoverVariant}"
                        )
                            .chip(
                                class="size-5 rounded-full outline outline-white/20"
                                :style="{ backgroundColor: activeVariant?.color }"
                            )
                    TooltipPortal
                        AnimatePresence
                            TooltipContent(asChild align="center" side="top" :sideOffset="4")
                                Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                    span Counter Color

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
                            class="p-2 flex gap-1 bg-black border border-white/15 rounded-xl z-99"
                        )
                            .btn(
                                v-for="variant in variants"
                                :key="variant.name"
                                @click="pick_variant(variant)"
                                class="size-6 rounded-full outline outline-white/5"
                                :class="{'outline-white/60!' : variant.name === activeVariant?.name}"
                                :style="{ backgroundColor: variant.color }"
                                :title="variant.name"
                            )

        ToolDelete
</template>
