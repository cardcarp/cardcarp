<script setup>
// Core
import { ref, watch } from 'vue'

// Libraries
import { AnimatePresence, Motion, motion } from 'motion-v'

// UI
import {
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionRoot,
    AccordionTrigger,

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
    SelectViewport
} from 'reka-ui'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '@cardcarp/core/part/dialog-scroll.vue'

// Composables
import { useGameStore } from '@cardcarp/core/composable/game.js'
const { manifest, config } = useGameStore()

// Logic
//
// What a pasted line turns into lives in deck-import.js, where it can be run against a table of
// awkward pastes without a browser or a manifest (see deck-import.test.mjs).
import { mergeIntoBuild, parseDeckList } from './deck-import.js'

// State
import { useState } from './state.js'
const { dialog_import, deck_building } = useState()

// Local
const model_textarea_import = ref('')
const import_active = ref(false)
const import_error = ref([])
const import_btn_text = ref('Import')
const import_select_list = ref('add')

// Start every open with a clean slate: empty textarea, no leftover errors.
watch(() => dialog_import.active, (open) => {
    if (!open) return
    model_textarea_import.value = ''
    import_error.value = []
})

// Actions
async function click_import() {

    if (import_active.value) return

    import_active.value = true
    import_btn_text.value = "Importing..."
    import_error.value = []

    // Reading the paste is deck-import.js's job. What is left here is what only the dialog can
    // decide: that the storage list has no groups to sort into, whether the paste replaces the build
    // or merges into it, and how long "Imported!" stays up.
    const { cards, errors } = parseDeckList(model_textarea_import.value, {
        groups: config.value?.deck?.group?.list ?? [],
        cardDict: manifest.value?.card_dict,
        group: deck_building.id === 'storage' ? 'main' : null,
    })

    import_error.value = errors

    if (cards.length) {

        // 'replace' makes the paste the source of truth: clear the build first,
        // then add. 'add' merges into whatever is already there. Only reached
        // with valid cards in hand, so a bad paste can't wipe the deck.
        if (import_select_list.value === 'replace') {
            deck_building.list = []
        }

        mergeIntoBuild(deck_building.list, cards)

        await new Promise(resolve => setTimeout(resolve, 300))

        import_btn_text.value = "Imported!"

    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    // A clean import (cards added, nothing skipped) closes itself — the delay
    // above kept "Imported!" on screen so the user sees it land first. A partial
    // import stays open so its error list remains visible.
    if (cards.length && !import_error.value.length) {
        close()
    }

    import_btn_text.value = "Import"
    import_active.value = false
}

function context_paste() {
    navigator.clipboard.readText().then((text) => {
        model_textarea_import.value = text
    })
}

function close() {
    dialog_import.active = false
}

</script>

<template lang="pug">
DialogShell(
    :open="dialog_import.active"
    width="w-200"
    title="Import collection"
    @close="close"
)
    .columns(class="flex-1 min-h-0 flex")

        DialogScroll(
            rootClass="md:max-w-90 px-6 py-6 flex flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-l-xl"
            rootStyle="box-shadow: inset -1px 0 0 0 hsl(0 0 8), inset -3px 0 0 0 hsl(0 0 0)"
        )
            .title(class="flex items-end gap-2 text-5 text-white font-light leading-none")
                svg(class="relative size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21")
                    path(d="m14 19.5 3-3 3 3")
                    path(d="M17 22v-5.5")
                    circle(cx="9" cy="9" r="2")
                span Import

            .hint(
                class="px-3 py-2 mt-4 text-3 text-mauve-500 bg-mauve-900"
                style="box-shadow: inset 2px 0 0 0 #594c5b"
            ) Export a pre-constructed deck to review format.


            .divider-dark(class="mt-6 w-full h-0.5 bg-black")
            .divider-light(class="mb-6 w-full h-px bg-white/8")

            .section(class="mt-6")
                .header(class="flex mb-1 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") METHOD
                SelectRoot(v-model="import_select_list")
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
                            SelectValue(class="grow capitalize") {{ import_select_list }}
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
                                SelectItem(v-for="item in ['add', 'replace']" :value="key" class="px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-zinc-500/5 hover:text-white")
                                    SelectItemText(class="grow capitalize") {{ item }}
                                    svg(v-show="item === import_select_list" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        circle(cx="12.1" cy="12.1" r="1")

            .divider-dark(class="mt-6 w-full h-0.5 bg-black")
            .divider-light(class="mb-6 w-full h-px bg-white/8")

            .section(class="")
                .btns(class="grid gap-3")
                    .btn(
                        @click="click_import"
                        class="relative px-6 py-2 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                        style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                    )
                        svg(class="relative flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            AnimatePresence
                                component(:is="motion.g" v-if="import_btn_text === 'Importing...'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                    path(d="M12 2v4"            style="animation: spinner-fade 1s ease-in-out -1s     infinite")
                                    path(d="m16.2 7.8 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.875s infinite")
                                    path(d="M18 12h4"           style="animation: spinner-fade 1s ease-in-out -0.75s  infinite")
                                    path(d="m16.2 16.2 2.9 2.9" style="animation: spinner-fade 1s ease-in-out -0.625s infinite")
                                    path(d="M12 18v4"           style="animation: spinner-fade 1s ease-in-out -0.5s   infinite")
                                    path(d="m4.9 19.1 2.9-2.9"  style="animation: spinner-fade 1s ease-in-out -0.375s infinite")
                                    path(d="M2 12h4"            style="animation: spinner-fade 1s ease-in-out -0.25s  infinite")
                                    path(d="m4.9 4.9 2.9 2.9"   style="animation: spinner-fade 1s ease-in-out -0.125s infinite")
                                component(:is="motion.g" v-else-if="import_btn_text === 'Imported!'" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                    path(d="M20 6 9 17l-5-5")
                                component(:is="motion.g" v-else :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                    path(d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21")
                                    path(d="m14 19.5 3-3 3 3")
                                    path(d="M17 22v-5.5")
                                    circle(cx="9" cy="9" r="2")
                        span(class="relative top-px") {{ import_btn_text }}

            .section(v-show="import_error.length" class="mt-3")
                .box(class="relative px-3 py-2 w-full bg-red-950/50 text-red-400 font-mono text-3 leading-6 outline outline-red-950 rounded")
                    pre(class="text-red-500") Failed to import the following:
                    pre(v-for="error in import_error") {{ error }}
 

        DialogScroll(
            rootClass="relative flex-1 p-3 min-h-0 flex flex-col bg-linear-to-br to-neutral-900 from-neutral-950 rounded-r-xl"
        )
            ContextMenuRoot
                ContextMenuTrigger(asChild)
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
                            v-model="model_textarea_import"
                            spellcheck="false"
                            placeholder="Paste or type your card list here..."
                            class="absolute inset-0 size-full px-4 py-3 text-3 text-white/50 font-mono leading-loose bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
                        )
                    ContextMenuPortal
                        AnimatePresence
                            ContextMenuContent(asChild)
                                Motion(
                                    :initial="{ opacity: 0, scale: 0 }"
                                    :animate="{ opacity: 1, scale: 1 }"
                                    :exit="{ opacity: 0, scale: 0.6 }"
                                    class="p-1.5 bg-black leading-0 border border-white/15 rounded-md z-100"
                                )
                                    ContextMenuItem(class="h-7 pl-2 pr-5 flex items-center gap-2 text-3.5 rounded-md hover:bg-white/10" @click="context_paste")
                                        svg(class="flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="M12 19h8")
                                            path(d="m4 17 6-6-6-6")
                                        span(class="grow capitalize") Paste from Clipboard
</template>
