<script setup>
// Core
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

// Libraries
import { saveAs } from 'file-saver'
import { AnimatePresence, Motion, motion } from 'motion-v'
import { orderBy, groupBy, startCase } from 'lodash'

// UI
import {
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuPortal,
    ContextMenuRoot,
    ContextMenuTrigger,

    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport,

    SwitchRoot,
    SwitchThumb
} from 'reka-ui'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '@cardcarp/core/part/dialog-scroll.vue'

// Store
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { downloadName } from './composable/download.js'
const { config } = useGameStore()

import { useState } from './state.js'
const { dialog_export } = useState()

// Assign
const route = useRoute()

// State
const option_sort = ref("quantity")
const option_group = ref("pool")
const option_head = ref(true)

// Constant
const copy_active = ref(false)

const process_active = ref(false)

const SORT_BY = computed(() => ({
    ...(config.value?.card?.sort ?? {}),
    quantity: { label: 'Quantity' }
}))

const GROUP_BY = computed(() => ({
    ...(config.value?.card?.group ?? {}),
    pool: { label: 'Pool' },
    none: { label: 'None' }
}))

const export_text = computed(() => {
    const sorted = orderBy(dialog_export.card_list, option_sort.value, 'asc')

    const formatCard = (card) => {
        const card_index = card.card_index ?? ''
        const set_id = card.set_id ?? ''
        return `${card.quantity} ${card.name} ${set_id} ${card_index}`.trim()
    }

    if (option_group.value === 'none') {
      const total = sorted.reduce((s, c) => s + c.quantity, 0)
      const header = option_head.value ? `Total: ${total}\n` : ''
      return header + sorted.map(formatCard).join('\n')
    }

    const groups = groupBy(sorted, option_group.value === 'pool' ? 'list' : option_group.value)
    return Object.entries(groups)
      .map(([group, cards]) => {
        const total = cards.reduce((s, c) => s + c.quantity, 0)
        const header = option_head.value ? `${startCase(group)}: ${total}\n` : ''
        return header + cards.map(formatCard).join('\n')
      })
      .join(option_head.value ? '\n\n' : '\n')
})

// Actions
function click_copy() {
    if (copy_active.value) return
    copy_active.value = true
    navigator.clipboard.writeText(export_text.value)
    setTimeout(() => {
        copy_active.value = false
    }, 2000)
}

function context_copy() {
    navigator.clipboard.writeText(export_text.value)
}

function click_save() {
    if (process_active.value) return
    process_active.value = true
    const blob = new Blob([export_text.value], {type: "text/plain;charset=utf-8"});
    saveAs(blob, downloadName([route.params.game, 'collection'], 'txt'))
    process_active.value = false
}

function close() {
    dialog_export.active = false
}

// Animations
const motion_dot = {
    jump: {
        transform: "translateY(-30px)",
        transition: {
            duration: 0.8,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut"
        }
    }
}
</script>

<template lang="pug">
DialogShell(
    :open="dialog_export.active"
    width="w-200"
    title="Export Collection"
    @close="close"
)

    .columns(class="flex-1 min-h-0 flex")

        DialogScroll(
            rootClass="md:max-w-90 px-6 py-6 flex flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-l-xl"
            rootStyle="box-shadow: inset -1px 0 0 0 hsl(0 0 8), inset -3px 0 0 0 hsl(0 0 0)"
        )
            .title(class="flex items-end gap-2 text-5 text-white font-light leading-none")
                svg(class="relative -top-px size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M11 5h10")
                    path(d="M11 12h10")
                    path(d="M11 19h10")
                    path(d="M4 4h1v5")
                    path(d="M4 9h2")
                    path(d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02")
                span Export
                span(class="text-3.5 opacity-50") {{ dialog_export.card_total_unique }} Cards, {{ dialog_export.card_total_all }} Unique

            .divider-dark(class="mt-6 w-full h-0.5 bg-black")
            .divider-light(class="mb-6 w-full h-px bg-white/8")

            .section(class="mt-6")
                .header(class="flex mb-1 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") SORT BY
                SelectRoot(v-model="option_sort")
                    SelectTrigger(
                        class="group/btn p-1.5 pb-1.25 w-full bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                        .pill(
                            class="relative px-2 py-2 flex items-center gap-2 text-left text-4 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            .icon(class="flex-none size-4")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="m3 16 4 4 4-4")
                                    path(d="M7 20V4")
                                    path(d="m21 8-4-4-4 4")
                                    path(d="M17 4v16")
                            SelectValue(class="grow capitalize") {{ option_sort }}
                            .chevron(class="w-3")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="m6 9 6 6 6-6")

                    SelectPortal
                        SelectContent(
                            side="bottom" 
                            position="popper" 
                            :sideOffset="-2"
                            class="min-w-(--reka-select-trigger-width) p-1.5 bg-black rounded-b-lg z-102"
                        )
                            SelectViewport(
                                class="w-full h-full px-2 py-2 text-left text-4 font-light bg-neutral-900 rounded"
                                style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                            )
                                SelectItem(v-for="(item, key) in SORT_BY" :value="key" class="px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                    SelectItemText(class="grow capitalize") {{ item.label }}
                                    svg(v-show="key === option_sort" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        circle(cx="12.1" cy="12.1" r="1")

            .section(class="mt-6")
                .header(class="flex mb-1 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") GROUP BY
                SelectRoot(v-model="option_group")
                    SelectTrigger(
                        class="group/btn p-1.5 pb-1.25 w-full bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                        .pill(
                            class="relative px-2 py-2 flex items-center gap-2 text-left text-4 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            .icon(class="flex-none size-4")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="m3 16 4 4 4-4")
                                    path(d="M7 20V4")
                                    path(d="m21 8-4-4-4 4")
                                    path(d="M17 4v16")
                            SelectValue(class="grow capitalize") {{ option_group }}
                            .chevron(class="w-3")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="m6 9 6 6 6-6")

                    SelectPortal
                        SelectContent(
                            side="bottom" 
                            position="popper" 
                            :sideOffset="-2"
                            class="min-w-(--reka-select-trigger-width) p-1.5 bg-black rounded-b-lg z-102"
                        )
                            SelectViewport(
                                class="w-full h-full px-2 py-2 text-left text-4 font-light bg-neutral-900 rounded"
                                style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                            )
                                SelectItem(v-for="(item, key) in GROUP_BY" :value="key" class="px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                    SelectItemText(class="grow capitalize") {{ item.label }}
                                    svg(v-show="key === option_group" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        circle(cx="12.1" cy="12.1" r="1")


                .section(class="mt-8 flex items-center")
                    .header(class="grow flex px-2 font-mono text-3 tracking-wider opacity-50")
                        .label(class="grow") INCLUDE HEADINGS
                    .switch(
                        class="flex-none relative px-2 py-1.75 pb-1.5 flex items-center select-none touch-none bg-black rounded-full"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                        SwitchRoot(
                            v-model="option_head" 
                            class="w-9 h-5 flex items-center data-[state=unchecked]:bg-white/10 data-[state=checked]:bg-green-950 rounded-full relative transition-color focus-within:outline-none pointer-point"
                        )
                            SwitchThumb(class="size-5 bg-white rounded-full transition-transform will-change-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-green-500")

                .divider-dark(class="mt-6 w-full h-0.5 bg-black")
                .divider-light(class="mb-6 w-full h-px bg-white/8")

                .section(class="")
                    .btns(class="grid gap-3")
                        .btn(
                            @click="click_copy"
                            class="relative px-6 py-2 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                            style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                        )
                            svg(class="relative flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                AnimatePresence()
                                    component(:is="motion.g" v-if="copy_active" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                        path(d="M20 6 9 17l-5-5")
                                    component(:is="motion.g" v-else :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                        path(d="M12 19h8")
                                        path(d="m4 17 6-6-6-6")
                            span(class="relative top-px") Copy to Clipboard
                            Motion(
                                v-if="copy_active"
                                :initial="{ opacity: 0, y: 0 }"
                                :animate="{ opacity: [0, 1], y: [0, -15] }"
                                :transition="{ duration: 0.3, times: [0, 1] }"
                                class="absolute bottom-full text-green-400 -rotate-15"
                            ) Copied!

                        .btn(
                            @click="click_save"
                            class="px-6 py-2 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                            style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                        )
                            svg(class="relative flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35")
                                path(d="M14 2v5a1 1 0 0 0 1 1h5")
                                path(d="m5 16-3 3 3 3")
                                path(d="m9 22 3-3-3-3")
                            span(class="relative top-px") Save as .txt

        DialogScroll(rootClass="" rootStyle="background-color: #000; opacity: 0.8; background-image:  repeating-linear-gradient(to right, transparent 0, transparent 1.6666666666666667px, #000 1.6666666666666667px, #000 5px, transparent 5px, transparent 6.666666666666667px), repeating-linear-gradient(to bottom, transparent 0, transparent 1.6666666666666667px, #000 1.6666666666666667px, #000 5px, transparent 5px, transparent 6.666666666666667px), linear-gradient(to bottom, #282828 0.6px, transparent 0.6px), linear-gradient(to right, #282828 0.6px, transparent 0.6px) ; background-size: 100% 100%, 100% 100%, 20px 20px, 20px 20px; background-position: 0 0, 0 0, 0 -0.2px, -0.2px 0;")
            ContextMenuRoot
                ContextMenuTrigger
                    .layout(class="p-5 size-full grid place-content-center")
                        p(class="p-5 whitespace-pre font-mono text-3 text-white/80 leading-loose truncate") {{ export_text }}

                ContextMenuPortal
                    AnimatePresence
                        ContextMenuContent(asChild)
                            Motion(
                                :initial="{ opacity: 0, scale: 0 }"
                                :animate="{ opacity: 1, scale: 1 }"
                                :exit="{ opacity: 0, scale: 0.6 }"
                                class="p-1.5 bg-black leading-0 border border-white/15 rounded-md z-100"
                            )
                                ContextMenuItem(class="h-7 pl-2 pr-5 flex items-center gap-2 text-3.5 rounded-md hover:bg-white/10" @click="context_copy")
                                    svg(class="flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        path(d="M12 19h8")
                                        path(d="m4 17 6-6-6-6")
                                    span(class="grow capitalize") Copy to Clipboard

AnimatePresence
    Motion(
        v-if="process_active"
        :initial="{ opacity: 0, scale: 0.8 }"
        :animate="{ opacity: 1, scale: 1 }"
        :exit="{ opacity: 0, scale: 0.8 }"
        class="fixed inset-0 size-full grid place-content-center bg-black/80 backdrop-blur-lg z-9999"
    )
        .flex(class="gap-4")
            Motion(animate="jump" :transition="{ staggerChildren: -0.2, staggerDirection: -1 }" class="flex justify-center items-center gap-2")
                Motion(:variants="motion_dot" class="size-2 bg-brand-tert/50 rounded-full")
                Motion(:variants="motion_dot" class="size-2 bg-brand-tert/50 rounded-full")
                Motion(:variants="motion_dot" class="size-2 bg-brand-tert/50 rounded-full")
            .text(class="text-brand-tert/80 font-light tracking-widest -translate-y-3") Downloading...
</template>
