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
import { keyHint } from '../use-controls.js'

// The table, through its object (see use-table.js).
const { current: uiSelection } = useTable().selection
const { roll: diceRoll, increment: diceIncrement, decrement: diceDecrement, changeVariant: diceChangeVariant } = useTable().dice

const ui_selection = useStore(uiSelection)

// Roll's key in this app, from the list the keyboard binds (controls.js).
const roll_hint = keyHint('dice.roll')

// Variants are the pre-rendered colour spritesheets an accessory ships with — the dice item
// declares them in the manifest and addDice stashes them on the node, so the selection payload
// already carries both the list and which one is showing. All this has to do is offer them.
//
// Absent or single-entry `variant` means there is nothing to choose between, so the control
// hides itself entirely rather than presenting a picker with one option.
const popoverVariant = ref(false)

const variants = computed(() => ui_selection.value?.data?.variants ?? [])
const activeVariant = computed(() => ui_selection.value?.data?.variant ?? null)

function pick_variant(variant) {
    diceChangeVariant(variant)
    popoverVariant.value = false
}

</script>

<template lang="pug">
AnimatePresence
    Motion(
        v-if="ui_selection.type === 'dice'"
        key="toolbar-dice"
        :initial="{ opacity: 0, y: 0 }"
        :animate="{ opacity: 1, y: -10 }"
        :exit="{ opacity: 0, y: 0 }"
        class="absolute p-2 flex gap-1 bg-neutral-950 border border-white/5 rounded-xl z-50 -translate-x-1/2 -translate-y-full"
        :style="{ left: `${ui_selection.x}px`, top: `${ui_selection.y}px` }"
    )

        .tool-decrement(
            @click="diceDecrement()"
            class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
        )
            svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                <path d="M5 12h14"/>

        .tool-increment(
            @click="diceIncrement"
            class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
        )
            svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>

        TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
            TooltipTrigger
                .tool-roll(
                    @click="diceRoll()"
                    class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                )
                    svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                        <path d="M16 16h5v5"/>
                        <circle cx="12" cy="12" r="1"/>

            TooltipPortal
                AnimatePresence
                    TooltipContent(asChild align="center" side="top" :sideOffset="4")
                        Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                            span Roll
                            code(v-if="roll_hint" class="font-mono ml-1 opacity-50") {{ roll_hint }}


        //- Colour swap. Sits with the value controls because it is a property of this die,
        //- not of the table — and it is broadcast as a nodes:patch, so peers recolour too.
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
                                    span Dice Color

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
