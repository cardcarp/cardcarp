<script setup>
// Core
import { computed, reactive, ref, watch } from 'vue'

// Libraries
import { AnimatePresence, Motion, motion } from 'motion-v'

// UI
import {
    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport
} from 'reka-ui'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '../core/dialog-scroll.vue'

// State
import { useState } from '@cardcarp/deckbox/state.js'

// Assign
const {
    deck_building,
    deck_save,
    dialog_detail_edit,
    detail_unsaved_confirm
} = useState()

const draft = reactive({
    name: '',
    highlight: '',
    tagline: '',
    notes: '',
})

const first_section = () => deck_building.description?.[0] ?? { title: '', body: '' }
const later_sections = () => (deck_building.description ?? []).slice(1)

watch(() => dialog_detail_edit.active, (open) => {
    if (!open) return
    draft.name = deck_building.name ?? ''
    draft.highlight = deck_building.highlight ?? ''
    draft.tagline = deck_building.tagline ?? ''
    draft.notes = first_section().body ?? ''
})

const dirty = computed(() =>
    draft.name !== (deck_building.name ?? '') ||
    draft.highlight !== (deck_building.highlight ?? '') ||
    draft.tagline !== (deck_building.tagline ?? '') ||
    draft.notes !== (first_section().body ?? '')
)

function commit() {
    deck_building.name = draft.name
    deck_building.highlight = draft.highlight
    deck_building.tagline = draft.tagline

    const rest = later_sections()
    deck_building.description = (draft.notes || rest.length)
        ? [{ ...first_section(), body: draft.notes }, ...rest]
        : []

    deck_save()
}

// Save
const save_active = ref(false)
const save_btn_text = ref('Save')

async function click_save() {
    if (save_active.value) return

    save_active.value = true
    save_btn_text.value = "Saving..."

    commit()

    await new Promise(resolve => setTimeout(resolve, 300))
    save_btn_text.value = "Saved!"

    await new Promise(resolve => setTimeout(resolve, 1000))
    save_btn_text.value = "Save"
    save_active.value = false
    dialog_detail_edit.active = false
}

async function attempt_close() {
    if (!dirty.value) {
        dialog_detail_edit.active = false
        return
    }

    const decision = await detail_unsaved_confirm()
    if (decision === 'save') commit()
    else if (decision !== 'discard') return

    dialog_detail_edit.active = false
}
</script>

<template lang="pug">
DialogShell(
    :open="dialog_detail_edit.active"
    width="w-200"
    title="Edit collection"
    @close="attempt_close"
)
    .columns(class="flex-1 min-h-0 flex")
        DialogScroll(
            rootClass="md:max-w-90 px-6 py-6 flex flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-l-xl"
            rootStyle="box-shadow: inset -1px 0 0 0 hsl(0 0 8), inset -3px 0 0 0 hsl(0 0 0)"
        )
            .title(class="flex items-end gap-2 text-5 text-white font-light leading-none")
                svg(class="relative size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7")
                    path(d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z")
                span Details

            .divider-dark(class="mt-6 w-full h-0.5 bg-black")
            .divider-light(class="mb-6 w-full h-px bg-white/8")

            .section(class="mt-6")
                .header(class="flex mb-1.5 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") Name:
                .field(
                    class="group/textarea relative flex-1 h-11 flex flex-col bg-neutral-950 rounded-lg"
                )
                    .d(
                        class="absolute inset-0 size-full rounded-lg"
                        style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                    )
                    .h(
                        class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-0! group-hover/textarea:opacity-15 transition-opacity duration-500"
                        style="box-shadow: inset 0 0 0 1px hsl(0 0 100), inset 0 0 20px 0 hsl(0 0 100 / 0.10)"
                    )
                    .f(
                        class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-50 transition-opacity duration-800"
                        style="box-shadow: inset 0 0 0 1px hsl(45 100 45), inset 0 0 20px 0 hsl(45 100 45 / 0.10)"
                    )
                    input(
                        v-model="draft.name"
                        spellcheck="false"
                        placeholder="..."
                        class="absolute inset-0 size-full p-4 text-3 text-white/50 font-mono leading-relaxed bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
                    )

            .section(class="mt-6")
                .header(class="flex mb-1.5 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") Tagline:
                .field(
                    class="group/textarea relative flex-1 h-11 flex flex-col bg-neutral-950 rounded-lg"
                )
                    .d(
                        class="absolute inset-0 size-full rounded-lg"
                        style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                    )
                    .h(
                        class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-0! group-hover/textarea:opacity-15 transition-opacity duration-500"
                        style="box-shadow: inset 0 0 0 1px hsl(0 0 100), inset 0 0 20px 0 hsl(0 0 100 / 0.10)"
                    )
                    .f(
                        class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-50 transition-opacity duration-800"
                        style="box-shadow: inset 0 0 0 1px hsl(45 100 45), inset 0 0 20px 0 hsl(45 100 45 / 0.10)"
                    )
                    input(
                        v-model="draft.tagline"
                        spellcheck="false"
                        placeholder="..."
                        class="absolute inset-0 size-full p-4 text-3 text-white/50 font-mono leading-relaxed bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
                    )

            .section(class="mt-6")
                .header(class="flex mb-1 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") HIGHLIGHT
                SelectRoot(v-model="draft.highlight")
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
                                    path(d="M11 5h10")
                                    path(d="M11 12h10")
                                    path(d="M11 19h10")
                                    path(d="M4 4h1v5")
                                    path(d="M4 9h2")
                                    path(d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02")
                            SelectValue(class="grow capitalize") {{ highlight_card?.name }}
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
                                class="w-full h-full px-2 py-2 text-left text-4 font-light bg-zinc-900 rounded"
                                style="box-shadow: 0 -1px 2px 0 hsl(0 0 20), 0 0 2px 2px hsl(0 0 0)"
                            )
                                SelectItem(v-for="item in deck_building.list" :key="item.id" :value="item.id" class="px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-zinc-500/5 hover:text-white")
                                    SelectItemText(class="grow capitalize") {{ item.name }}
                                    svg(v-show="item.id === draft.highlight" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        circle(cx="12.1" cy="12.1" r="1")

            .divider-dark(class="mt-6 w-full h-0.5 bg-black")
            .divider-light(class="mb-6 w-full h-px bg-white/8")

            .section(class="")
                .btns(class="grid gap-3")
                    .btn(
                        @click="click_save"
                        class="relative px-6 py-2 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                        style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                    )
                        svg(class="relative flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            AnimatePresence
                                component(:is="motion.g" v-if="save_btn_text === 'Saving...'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                    path(d="M12 2v4"            style="animation: spinner-fade 1s ease-in-out -1s     infinite")
                                    path(d="m16.2 7.8 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.875s infinite")
                                    path(d="M18 12h4"           style="animation: spinner-fade 1s ease-in-out -0.75s  infinite")
                                    path(d="m16.2 16.2 2.9 2.9" style="animation: spinner-fade 1s ease-in-out -0.625s infinite")
                                    path(d="M12 18v4"           style="animation: spinner-fade 1s ease-in-out -0.5s   infinite")
                                    path(d="m4.9 19.1 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.375s infinite")
                                    path(d="M2 12h4"            style="animation: spinner-fade 1s ease-in-out -0.25s  infinite")
                                    path(d="m4.9 4.9 2.9 2.9"   style="animation: spinner-fade 1s ease-in-out -0.125s infinite")
                                component(:is="motion.g" v-else-if="save_btn_text === 'Saved!'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                    path(d="M20 6 9 17l-5-5")
                                component(:is="motion.g" v-else :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                    path(d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z")
                        span(class="relative top-px") {{ save_btn_text }}

        DialogScroll(
            rootClass="relative flex-1 p-3 min-h-0 flex flex-col bg-linear-to-br to-neutral-900 from-neutral-950 rounded-r-xl"
        )
            .field(
                class="group/textarea relative flex-1 min-h-100 flex flex-col bg-neutral-950 rounded-lg"
            )
                .d(
                    class="absolute inset-0 size-full rounded-lg"
                    style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                )
                .h(
                    class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-0! group-hover/textarea:opacity-15 transition-opacity duration-500"
                    style="box-shadow: inset 0 0 0 1px hsl(0 0 100), inset 0 0 20px 0 hsl(0 0 100 / 0.10)"
                )
                .f(
                    class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-50 transition-opacity duration-800"
                    style="box-shadow: inset 0 0 0 1px hsl(45 100 45), inset 0 0 20px 0 hsl(45 100 45 / 0.10)"
                )
                textarea(
                    v-model="draft.notes"
                    spellcheck="false"
                    placeholder="Notes for this deck..."
                    class="absolute inset-0 size-full p-4 text-3 text-white/50 font-mono leading-relaxed bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
                )
</template>
