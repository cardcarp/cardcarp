<script setup>
// Core
import { computed, ref } from 'vue'

// Libraries
import { AnimatePresence, motion } from 'motion-v'

// UI
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuTrigger
} from 'reka-ui'

// State
import { useState } from '@cardcarp/deckbox/state.js'
import { useImage } from '@cardcarp/core/composable/image.js'

// Props
const prop = defineProps({
    location: {
        type: String,
        default: 'center'
    }
})

// Assign
const {
    action_card_list,
    deck_building,
    deck_save,
    deck_duplicate,
    deck_save_as,
    deck_delete,
    print,
    probability,
    dialog_export,
    dialog_import,
    dialog_warning,
    dialog_detail_edit,
    dialog_detail_read
} = useState()
const { card_src } = useImage()

const PRINT_MAX = 500
const PROBABILITY_MAX = 100

const card_list = computed(() =>
    prop.location === 'build' ? deck_building.list : action_card_list.value
)

// Local
const menu_active = ref(false)

// Actions
function click_delete() {
    deck_delete()
}

function click_print() {
    const expanded = []
    let card_total_unique = 0

    for (const card of card_list.value) {
        const src = card_src(card)

        if (!src) continue

        card_total_unique ++

        for (let i = 0; i < (card.quantity ?? 1); i++) {
            expanded.push(src)
        }
    }

    if (expanded.length > PRINT_MAX) {
        dialog_warning.title = 'Too many cards to print'
        dialog_warning.message = `Printing is limited to ${PRINT_MAX.toLocaleString()} cards at a time, this list has ${expanded.length.toLocaleString()}. Narrow it down with filters and try again.`
        dialog_warning.active = true
        return
    }

    print.card_list = expanded
    print.card_total_all = expanded.length
    print.card_total_unique = card_total_unique
    print.deck_name = prop.location === 'build' ? deck_building.name : ''
    print.active = true
}

function click_export() {
    const expanded = []
    let card_total_all = 0

    for (const card of card_list.value) {
        card_total_all ++
        for (let i = 0; i < (card.quantity ?? 1); i++) {
            expanded.push(card)
        }
    }

    dialog_export.card_list = [...card_list.value]
    dialog_export.card_total_all = card_total_all
    dialog_export.card_total_unique = expanded.length
    dialog_export.active = true
}

function click_probability() {
    const unique = []
    const expanded = []

    for (const card of card_list.value) {
        if ((card.list ?? "main") === "main") {
            unique.push(card)
            for (let i = 0; i < (card.quantity ?? 1); i++) {
                expanded.push(card)
            }
        }
    }

    if (expanded.length > PROBABILITY_MAX) {
        dialog_warning.title = 'Too many cards for probability'
        dialog_warning.message = `Probability is limited to ${PROBABILITY_MAX.toLocaleString()} cards at a time, this list has ${expanded.length.toLocaleString()}. Narrow it down with filters and try again.`
        dialog_warning.active = true
        return
    }

    probability.card_list_expanded = expanded
    probability.card_list_unique = unique
    probability.card_total_expanded = expanded.length
    probability.card_total_unique = unique.length
    probability.active = true
}

const duplicate_active = ref(false)
const duplicate_text_default = computed(() => prop.location == 'build' ? 'Duplicate' : 'Save as deck')
const duplicate_text = ref(duplicate_text_default.value)

async function click_duplicate() {
    if (duplicate_active.value) return

    if (prop.location !== 'build' && !card_list.value.length) return

    duplicate_active.value = true
    duplicate_text.value = "Creating..."

    prop.location === 'build' ? deck_duplicate() : deck_save_as()

    await new Promise(resolve => setTimeout(resolve, 300))
    duplicate_text.value = "Done!"

    await new Promise(resolve => setTimeout(resolve, 1000))
    duplicate_text.value = duplicate_text_default.value
    duplicate_active.value = false
}

const save_active = ref(false)
const save_text = ref("Save")

async function click_save() {
    if (save_active.value) return

    save_active.value = true
    save_text.value = "Saving..."

    deck_save()

    await new Promise(resolve => setTimeout(resolve, 300))

    save_text.value = "Saved!"

    await new Promise(resolve => setTimeout(resolve, 1000))

    save_text.value = "Save"
    save_active.value = false
}

function click_import() {
    dialog_import.active = true
}

function click_detail() {
    dialog_detail_edit.active = true
}

</script>

<template lang="pug">
DropdownMenuRoot(:modal="false" v-model:open="menu_active")
    DropdownMenuTrigger

        slot(:open="menu_active")

    DropdownMenuPortal()
        DropdownMenuContent(
            align="center" 
            side="bottom" 
            :alignOffset="0" 
            :sideOffset="6" 
            class="w-50 font-mono text-3 bg-black border border-neutral-800 rounded-xl z-100 shadow-xl/80 transition-transform animate-pop"
        )
            DropdownMenuGroup(class="p-1.5 flex flex-col gap-1 border-b border-white/10 last:border-none")
                DropdownMenuItem(@click="click_probability" class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25")
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M12 16v5")
                        path(d="M16 14v7")
                        path(d="M20 10v11")
                        path(d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15")
                        path(d="M4 18v3")
                        path(d="M8 14v7")
                    .text(class="") Probability
            
            DropdownMenuGroup(class="p-1.5 flex flex-col gap-1 border-b border-white/10 last:border-none")
                DropdownMenuItem(@click="click_print" class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25")    
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2")
                        path(d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6")
                        rect(x="6" y="14" width="12" height="8" rx="1")
                    .text(class="") Print

                DropdownMenuItem(@click="click_export" class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25")    
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M11 5h10")
                        path(d="M11 12h10")
                        path(d="M11 19h10")
                        path(d="M4 4h1v5")
                        path(d="M4 9h2")
                        path(d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02")
                    .text(class="") Export

            DropdownMenuGroup(class="p-1.5 flex flex-col gap-1 border-b border-white/10 last:border-none")
                DropdownMenuItem(
                    v-if="prop.location == 'build' && deck_building.name !== 'Storage'" 
                    @select.prevent 
                    @click="click_detail" 
                    class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25"
                )
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7")
                        path(d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z")
                    .text(class="") Details

                DropdownMenuItem(v-if="prop.location == 'build'" @click="click_import" class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25")    
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21")
                        path(d="m14 19.5 3-3 3 3")
                        path(d="M17 22v-5.5")
                        circle(cx="9" cy="9" r="2")
                    .text(class="") Import

                DropdownMenuItem(@select.prevent @click="click_duplicate" class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25")
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        AnimatePresence()
                            component(:is="motion.g" v-if="duplicate_text === 'Creating...'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                path(d="M12 2v4"            style="animation: spinner-fade 1s ease-in-out -1s     infinite")
                                path(d="m16.2 7.8 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.875s infinite")
                                path(d="M18 12h4"           style="animation: spinner-fade 1s ease-in-out -0.75s  infinite")
                                path(d="m16.2 16.2 2.9 2.9" style="animation: spinner-fade 1s ease-in-out -0.625s infinite")
                                path(d="M12 18v4"           style="animation: spinner-fade 1s ease-in-out -0.5s   infinite")
                                path(d="m4.9 19.1 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.375s infinite")
                                path(d="M2 12h4"            style="animation: spinner-fade 1s ease-in-out -0.25s  infinite")
                                path(d="m4.9 4.9 2.9 2.9"   style="animation: spinner-fade 1s ease-in-out -0.125s infinite")
                            component(:is="motion.g" v-else-if="duplicate_text === 'Done!'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                path(d="M20 6 9 17l-5-5")
                            component(:is="motion.g" v-else :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                rect(width="14" height="14" x="8" y="8" rx="2" ry="2")
                                path(d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2")
                    .text(class="") {{ duplicate_text }}

            DropdownMenuGroup(v-if="prop.location == 'build'" class="p-1.5 flex flex-col gap-1 border-b border-white/10 last:border-none")
                DropdownMenuItem(@select.prevent @click="click_save" class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25")
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        AnimatePresence()
                            component(:is="motion.g" v-if="save_text === 'Saving...'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                path(d="M12 2v4"            style="animation: spinner-fade 1s ease-in-out -1s     infinite")
                                path(d="m16.2 7.8 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.875s infinite")
                                path(d="M18 12h4"           style="animation: spinner-fade 1s ease-in-out -0.75s  infinite")
                                path(d="m16.2 16.2 2.9 2.9" style="animation: spinner-fade 1s ease-in-out -0.625s infinite")
                                path(d="M12 18v4"           style="animation: spinner-fade 1s ease-in-out -0.5s   infinite")
                                path(d="m4.9 19.1 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.375s infinite")
                                path(d="M2 12h4"            style="animation: spinner-fade 1s ease-in-out -0.25s  infinite")
                                path(d="m4.9 4.9 2.9 2.9"   style="animation: spinner-fade 1s ease-in-out -0.125s infinite")
                            component(:is="motion.g" v-else-if="save_text === 'Saved!'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                path(d="M20 6 9 17l-5-5")
                            component(:is="motion.g" v-else :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                path(d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z")
                    .text(class="") {{ save_text }}

                DropdownMenuItem(@click="click_delete" class="h-7 px-2 flex items-center gap-2 rounded-md hover:bg-white/10 group-hover:opacity-25")    
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6")
                        path(d="M3 6h18")
                        path(d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2")
                    .text(class="") Delete            
</template>