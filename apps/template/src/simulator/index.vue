<script setup>
// Core
import { onMounted, onUnmounted, watch, useTemplateRef, computed } from 'vue'
import { TooltipProvider } from 'reka-ui'
import { useRoute } from 'vue-router'

// Libraries
import { useMousePressed } from '@vueuse/core'

// UI
import { AnimatePresence, Motion } from 'motion-v'

// Components
import PreviewCard from '../core/preview-card.vue'
import Toolbar from './toolbar/main.vue'
import Hand from './hand.vue'
import Panel from './panel/main.vue'
import DialogShortcut from './dialog-shortcut.vue'
import Tutorial from './tutorial.vue'
import DialogRotate from './dialog-rotate.vue'

// Composables
import { useKeyboardShortcuts } from './shortcuts.js'

// Stores
import { drag_item_isActive, drag_item, drag_x, drag_y } from '@cardcarp/core/store/drag.js'
import { is_dragging as preview_dragging, mouseover_cell_card, mouseleave_cell_card, preview_hide } from '@cardcarp/core/store/preview.js'
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { deckbox_open, openDeckbox } from './ui.js'

import { useTable } from './use-table.js'
import { useStore } from './composable/use-store.js'

import { useControls } from './use-controls.js'

// Assign
const table = useTable()
const { palette, selectionToolbars } = useControls()
const { pan, alt, isTyping } = useKeyboardShortcuts()
const { pressed } = useMousePressed()
const route = useRoute()
// El
const canvas = useTemplateRef('canvas')

const current_tool = useStore(table.tools.current)

watch(pressed, (isPressed) => {
    if (!isPressed && palette[current_tool.value]?.once) {
        table.tools.set('select')
    }
})

const { config: game_config, manifest: game_manifest, error: game_error, card_config, active_game } = useGameStore()
watch(
    [active_game, game_config, game_manifest, game_error, card_config],
    ([id, config, manifest, error, cardConfig]) => table.setGame({ id, config, manifest, error, cardConfig }),
    { immediate: true },
)

const stop_table_events = [
    table.on('reset', () => openDeckbox()),
    table.on('deck-link', ({ deck }) => {
        if (deck) deckbox_open.value = false
        else openDeckbox()
    }),
    table.on('card-hover', ({ card, rect, variant }) => mouseover_cell_card(null, card, null, rect, variant)),
    table.on('card-unhover', ({ immediate }) => (immediate ? preview_hide() : mouseleave_cell_card())),
    table.pointer.pressed.listen((active) => {
        preview_dragging.value = active
        if (active) preview_hide()
    }),
]

const cursorClass = computed(() => {
    if (pan.value && !pressed.value) return 'cursor-grab'
    if (pan.value && pressed.value) return 'cursor-grabbing'
    if (alt.value && !isTyping()) return 'cursor-copy'
    const c = palette[current_tool.value]?.cursor
    return c ? `cursor-${c}` : ''
})


function onContextMenu(event) {
    if (event.target?.closest?.('input, textarea, [contenteditable]')) return
    event.preventDefault()
}

// Mounting
onMounted(async () => {
    if (canvas.value) {
        await table.mount(canvas.value, { deck: route.query.deck })

        if (import.meta.env.DEV) {
            const { modules, ...scene } = table.inspect()
            window.__table = scene
            window.__canvas = modules.canvas
            window.__tactility = modules.tactility
        }
    }

    document.addEventListener('contextmenu', onContextMenu)
})

onUnmounted(() => {
    document.removeEventListener('contextmenu', onContextMenu)
    table.unmount()
    for (const stop of stop_table_events) stop()
})
</script>

<template lang="pug">
TooltipProvider(:disableHoverableContent="true")

    .simulator-view(class="relative w-dvw h-dvh flex bg-linear-to-br from-neutral-900 to-neutral-950 overflow-hidden touch-manipulation")

        .menu(class="fixed top-3 left-4 z-10")
            slot(name="menu")

        Panel

        Toolbar

        component(v-for="(toolbar, type) in selectionToolbars" :key="type" :is="toolbar")

        Hand

        .canvas(
            ref="canvas"
            class="w-full h-full max-w-[1920px] max-h-[1080px] m-auto relative bg-neutral-900"
            :class="cursorClass"
        )

        slot(name="dialog")

        DialogShortcut

        Tutorial

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

        DialogRotate
</template>
