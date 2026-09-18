<script setup>
// Core
import { onMounted, onUnmounted, useTemplateRef, computed } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

// UI
import { AnimatePresence, Motion } from 'motion-v'
import {
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
    TooltipProvider,
    VisuallyHidden
} from 'reka-ui'

// Components
import PreviewCard from '../core/preview-card.vue'

import Header from './header.vue'
import Left from './left.vue'
import Center from './center.vue'
import Right from './right.vue'

import DialogSingle from './dialog-single.vue'
import DialogPrint from './dialog-print.vue'
import DialogProbability from './dialog-probability.vue'
import DialogExport from './dialog-export.vue'
import DialogImport from './dialog-import.vue'
import DialogDetailEdit from './dialog-detail-edit.vue'
import DialogDetailRead from './dialog-detail-read.vue'
import DialogFilterSet from './dialog-filter-set.vue'
import DialogFilterMulti from './dialog-filter-multi.vue'

import { useState } from '@cardcarp/deckbox/state.js'
import { file } from '../core/project.js'
import { drag_item_isActive, drag_item, drag_x, drag_y } from '@cardcarp/core/store/drag.js'

// Assign
const {
    is_desktop,
    panel_left_content,
    panel_right_content,
    deck_dirty,
    guard_build,
    build_unsaved_active,
    build_unsaved_resolve,
    deck_delete_active,
    deck_delete_resolve,
    group_remove_active,
    group_remove_pending,
    group_remove_resolve,
    detail_unsaved_active,
    detail_unsaved_resolve,
    dialog_warning
} = useState()

function on_before_unload(event) {
    if (!deck_dirty.value) return
    event.preventDefault()
    event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', on_before_unload))
onUnmounted(() => window.removeEventListener('beforeunload', on_before_unload))

onBeforeRouteLeave(async () => await guard_build())
onBeforeRouteUpdate(async () => await guard_build())

const PANEL_W = 'calc(var(--spacing) * 80)'
const PANEL_H = '50%'

const main_cols = computed(() => {
    if (!is_desktop.value) return '1fr'

    const left = panel_left_content.value ? PANEL_W : '0px'
    const right = panel_right_content.value ? PANEL_W : '0px'
    return `${left} 1fr ${right}`
})

const main_rows = computed(() => {
    if (is_desktop.value) return '1fr'

    return `1fr ${panel_right_content.value ? PANEL_H : '0px'}`
})

</script>

<template lang="pug">
TooltipProvider(:disableHoverableContent="true")

    .deckbox-view(class="relative w-dvw h-dvh flex flex-col bg-black overflow-hidden p-3")

        .main(
            class="relative flex-1 min-h-0 size-full grid grid-rows-[auto_1fr] transition-col bg-neutral-800 rounded-2xl"
            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
        )

            Header
                template(#menu)
                    slot(name="menu")

            .main(
                class="relative flex-1 min-h-0 size-full grid overflow-hidden rounded-b-2xl"
                :style="{ gridTemplateColumns: main_cols, gridTemplateRows: main_rows }"
            )
                .bg(class="absolute inset-0 size-full bg-radial-[at_25%_25%] from-neutral-950 to-neutral-800")

                Left
                Center
                Right

        //- Dialogs
        DialogSingle
        DialogPrint
        DialogProbability
        DialogExport
        DialogImport
        DialogDetailEdit
        DialogDetailRead
        DialogFilterSet
        DialogFilterMulti

        DialogRoot(:modal="true" :open="deck_delete_active")
            DialogPortal
                DialogOverlay(asChild class="fixed inset-0 bg-white/20 backdrop-blur-xs z-99")
                    Motion(:initial="{ opacity: 0 }" :animate="{ opacity: 1 }")
                DialogContent(asChild @interact-outside="event => {return event.preventDefault()}")
                    Motion(
                        :initial="{ opacity: 0, y: 0, scale: 0.9 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }"
                        class="fixed top-1/2 left-1/2 p-10 max-w-[85vw] max-h-[85vh] w-120 flex flex-col items-center justify-center text-4 text-center bg-radial-[circle_200px_at_center] to-neutral-950 from-neutral-900 bg-black rounded-xl -translate-x-1/2 -translate-y-1/2 z-100"
                        style="box-shadow: inset 0 1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13);"
                    )
                        VisuallyHidden(asChild)
                            DialogTitle
                        VisuallyHidden(asChild)
                            DialogDescription(:aria-describedby="undefined")
                        img(:src="file.iconDelete" class="mx-auto mb-2 object-contain size-30")
                        .message(class="mb-6 text-balance")
                            p(class="mb-2") Delete this deck?
                            p(class="text-3.5 opacity-70") This action can not be undone.
                        .btn-group(class="flex ")
                            .btn-padding(
                                class="flex-1 p-1 grid grid-cols-2 items-center justify-center gap-2 bg-black rounded-full"
                                style="box-shadow: 0 2px 1px 0 hsl(0 0 8)"
                            )
                                .btn(
                                    @click="deck_delete_resolve(false)" 
                                    class="px-6 py-1.5 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Cancel
                                .btn(
                                    @click="deck_delete_resolve(true)" 
                                    class="px-6 py-1.5 text-white rounded-full bg-red-700 hover:bg-red-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Delete

        DialogRoot(:modal="true" :open="group_remove_active")
            DialogPortal
                DialogOverlay(asChild class="fixed inset-0 bg-white/20 backdrop-blur-xs z-99")
                    Motion(:initial="{ opacity: 0 }" :animate="{ opacity: 1 }")
                DialogContent(asChild @interact-outside="event => {return event.preventDefault()}")
                    Motion(
                        :initial="{ opacity: 0, y: 0, scale: 0.9 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }"
                        class="fixed top-1/2 left-1/2 p-10 max-w-[85vw] max-h-[85vh] w-120 flex flex-col items-center justify-center text-4 text-center bg-radial-[circle_200px_at_center] to-neutral-950 from-neutral-900 bg-black rounded-xl -translate-x-1/2 -translate-y-1/2 z-100"
                        style="box-shadow: inset 0 1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13);"
                    )
                        VisuallyHidden(asChild)
                            DialogTitle
                        VisuallyHidden(asChild)
                            DialogDescription(:aria-describedby="undefined")
                        img(:src="file.iconWarn" class="mx-auto mb-2 object-contain size-30")
                        .message(class="mb-6 text-balance")
                            p(class="mb-2 capitalize") Remove the {{ group_remove_pending?.name }} group?
                            p(class="text-3.5 opacity-70") The {{ group_remove_pending?.count }} {{ group_remove_pending?.count === 1 ? 'card' : 'cards' }} in it will be removed from this deck.
                        .btn-group(class="flex")
                            .btn-padding(
                                class="flex-1 p-1 grid grid-cols-2 items-center justify-center gap-2 bg-black rounded-full"
                                style="box-shadow: 0 2px 1px 0 hsl(0 0 8)"
                            )
                                .btn(
                                    @click="group_remove_resolve(false)"
                                    class="px-6 py-1.5 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Cancel
                                .btn(
                                    @click="group_remove_resolve(true)"
                                    class="px-6 py-1.5 text-white rounded-full bg-red-700 hover:bg-red-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Remove

        DialogRoot(:modal="true" :open="detail_unsaved_active")
            DialogPortal
                DialogOverlay(asChild class="fixed inset-0 bg-white/20 backdrop-blur-xs z-101")
                    Motion(:initial="{ opacity: 0 }" :animate="{ opacity: 1 }")
                DialogContent(asChild @interact-outside="event => {return event.preventDefault()}")
                    Motion(
                        :initial="{ opacity: 0, y: 0, scale: 0.9 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }"
                        class="fixed top-1/2 left-1/2 p-10 max-w-[85vw] max-h-[85vh] w-120 flex flex-col items-center justify-center text-4 text-center bg-radial-[circle_200px_at_center] to-neutral-950 from-neutral-900 bg-black rounded-xl -translate-x-1/2 -translate-y-1/2 z-102"
                        style="box-shadow: inset 0 1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13);"
                    )
                        VisuallyHidden(asChild)
                            DialogTitle
                        VisuallyHidden(asChild)
                            DialogDescription(:aria-describedby="undefined")
                        img(:src="file.iconWarn" class="mx-auto mb-2 object-contain size-30")
                        .message(class="mb-6 text-balance")
                            p(class="mb-2") Save your changes?
                            p(class="text-3.5 opacity-70") You have unsaved edits to this deck's details.
                        .btn-group(class="flex")
                            .btn-padding(
                                class="flex-1 p-1 grid grid-cols-2 items-center justify-center gap-2 bg-black rounded-full"
                                style="box-shadow: 0 2px 1px 0 hsl(0 0 8)"
                            )
                                .btn(
                                    @click="detail_unsaved_resolve('discard')"
                                    class="px-6 py-1.5 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Discard
                                .btn(
                                    @click="detail_unsaved_resolve('save')"
                                    class="px-6 py-1.5 text-white rounded-full bg-green-700 hover:bg-green-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Save

        DialogRoot(:modal="true" :open="build_unsaved_active")
            DialogPortal
                DialogOverlay(asChild class="fixed inset-0 bg-white/20 backdrop-blur-xs z-101")
                    Motion(:initial="{ opacity: 0 }" :animate="{ opacity: 1 }")
                DialogContent(asChild @interact-outside="event => {return event.preventDefault()}")
                    Motion(
                        :initial="{ opacity: 0, y: 0, scale: 0.9 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }"
                        class="fixed top-1/2 left-1/2 p-10 max-w-[85vw] max-h-[85vh] w-120 flex flex-col items-center justify-center text-4 text-center bg-radial-[circle_200px_at_center] to-neutral-950 from-neutral-900 bg-black rounded-xl -translate-x-1/2 -translate-y-1/2 z-102"
                        style="box-shadow: inset 0 1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13);"
                    )
                        VisuallyHidden(asChild)
                            DialogTitle
                        VisuallyHidden(asChild)
                            DialogDescription(:aria-describedby="undefined")
                        img(:src="file.iconWarn" class="mx-auto mb-2 object-contain size-30")
                        .message(class="mb-6 text-balance")
                            p(class="mb-2") Save your deck?
                            p(class="text-3.5 opacity-70") This deck has unsaved changes.
                        .btn-group(class="flex")
                            .btn-padding(
                                class="flex-1 p-1 grid grid-cols-3 items-center justify-center gap-2 bg-black rounded-full"
                                style="box-shadow: 0 2px 1px 0 hsl(0 0 8)"
                            )
                                .btn(
                                    @click="build_unsaved_resolve('cancel')"
                                    class="px-6 py-1.5 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Cancel
                                .btn(
                                    @click="build_unsaved_resolve('discard')"
                                    class="px-6 py-1.5 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Discard
                                .btn(
                                    @click="build_unsaved_resolve('save')"
                                    class="px-6 py-1.5 text-white rounded-full bg-green-700 hover:bg-green-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span Save

        DialogRoot(:modal="true" :open="dialog_warning.active")
            DialogPortal
                DialogOverlay(asChild class="fixed inset-0 bg-white/20 backdrop-blur-xs z-99")
                    Motion(:initial="{ opacity: 0 }" :animate="{ opacity: 1 }")
                DialogContent(asChild @interact-outside="event => {return event.preventDefault()}")
                    Motion(
                        :initial="{ opacity: 0, y: 0, scale: 0.9 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }"
                        class="fixed top-1/2 left-1/2 p-10 max-w-[85vw] max-h-[85vh] w-120 flex flex-col items-center justify-center text-4 text-center bg-radial-[circle_200px_at_center] to-neutral-950 from-neutral-900 bg-black rounded-xl -translate-x-1/2 -translate-y-1/2 z-100"
                        style="box-shadow: inset 0 1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13);"
                    )
                        VisuallyHidden(asChild)
                            DialogTitle
                        VisuallyHidden(asChild)
                            DialogDescription(:aria-describedby="undefined")
                        img(:src="file.iconWarn" class="mx-auto mb-2 object-contain size-30")
                        .message(class="mb-6 text-balance")
                            p(class="mb-2") {{ dialog_warning.title }}
                            p(class="text-3.5 opacity-70") {{ dialog_warning.message }}
                        .btn-group(class="w-full inline-flex items-center justify-center gap-4")
                            .btn(
                                @click="dialog_warning.active = false" 
                                class="flex-1 max-w-40 p-1 flex items-center justify-center bg-black rounded-full"
                                style="box-shadow: 0 2px 1px 0 hsl(0 0 8)"
                            ) 
                                .pill(
                                    class="px-2 py-1.5 w-full text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                    style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1)"
                                )
                                    span OK

        //- Drag
        AnimatePresence
            Motion(
                v-if="drag_item_isActive"
                class="fixed top-0 left-0 w-40 h-10 pointer-events-none z-100"
                :style="{ transform: `translate(calc(${drag_x}px - 50%), calc(${drag_y}px - 50%))` }"
            )
                Motion(
                    class="w-full h-full flex items-center gap-2 bg-black px-2 text-white leading-none outline outline-white/20 rounded-lg"
                    :initial="{ scale: 0.6 }"
                    :animate="{ scale: 1 }"
                )
                    svg(class="w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        circle(cx="9" cy="12" r="1")
                        circle(cx="9" cy="5" r="1")
                        circle(cx="9" cy="19" r="1")
                        circle(cx="15" cy="12" r="1")
                        circle(cx="15" cy="5" r="1")
                        circle(cx="15" cy="19" r="1")
                    span(class="truncate") {{ drag_item?.name }}

        PreviewCard
</template>
