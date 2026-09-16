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
import PreviewCard from '@cardcarp/core/component/preview-card.vue'
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

// The table, handed to this UI by createSimulatorView (index.js). Everything below reaches it through that
// object, and renders from its state through useStore.
import { useTable } from './use-table.js'
import { useStore } from './composable/use-store.js'

// What this UI offers (controls.js): the rail's tools, and the toolbars that follow a selection.
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
    // Back to Move once a single-use tool has been used: a shape or a note is placed, not painted
    if (!isPressed && palette[current_tool.value]?.once) {
        table.tools.set('select')
    }
})

// The game, handed to the table as each part of it lands; nothing on the table reads core's store
// itself, and the table adopts the game's geometry along with it (table.js setGame). Immediate, so
// the table has its shape before the canvas is built.
//
// `active_game`, not `game`, for the id: it has to arrive as the route changes rather than when the
// new manifest lands, because the table drops a hand dealt from another game on it — and waiting
// would leave the previous game's cards sitting in the hand, the exact staleness that exists to
// prevent, for as long as the download takes.
const { config: game_config, manifest: game_manifest, error: game_error, card_config, active_game } = useGameStore()
watch(
    [active_game, game_config, game_manifest, game_error, card_config],
    ([id, config, manifest, error, cardConfig]) => table.setGame({ id, config, manifest, error, cardConfig }),
    { immediate: true },
)

// === What the table announces, and what this UI does about it ===
// The table says what happened (@cardcarp/simulator's events.js) and leaves the response to whatever
// renders it. These are this UI's responses; each one used to be the table reaching into the UI itself.
//
// The deck panel. A cleared table and a ?deck= link that found nothing both leave the player at a
// bare mat, so the deck list comes up. A link that dealt its deck has already done the next thing,
// so the list goes away.
//
// The card preview. A hover opens core's preview overlay, with its enter delay; an unhover closes
// it, after the leave grace unless there is nothing to linger over. A press or drag on the table
// suppresses previews everywhere — the hand's too — for as long as it lasts. That one is a store
// listener rather than a watcher on purpose: a preview armed by the hover a moment before the
// press is a pending timer, and it has to be cancelled inside the press, not a flush later.
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

// Cursor: the tool in hand's `cursor` (controls.js), with a held pan key and alt (clone) overriding
const cursorClass = computed(() => {
    if (pan.value && !pressed.value) return 'cursor-grab'
    if (pan.value && pressed.value) return 'cursor-grabbing'
    if (alt.value && !isTyping()) return 'cursor-copy'
    const c = palette[current_tool.value]?.cursor
    return c ? `cursor-${c}` : ''
})


// === Context menu ===
// A long press on Android raises a contextmenu, and on a <canvas> or an <img> that is the
// browser offering to save the image — a system dialog over the table, mid-game. Nothing on the
// table wants a context menu, so the table doesn't have one.
//
// Bound on `document` rather than the view's own root because the panels showing card art are
// teleported to body, outside it — and only for the life of the table, so the deck builder is
// left alone; it is a page you might legitimately want to save an image from.
//
// Text fields keep theirs. The room-code field is something people paste into, and trading
// right-click-paste away to stop a long-press save would be a bad bargain.
function onContextMenu(event) {
    if (event.target?.closest?.('input, textarea, [contenteditable]')) return
    event.preventDefault()
}

// Mounting
onMounted(async () => {
    // The table builds its canvas into this element, then deals a seat's kit and whatever a ?deck=
    // link asks for (table.js mount). Awaited: Pixi's Application.init is async, so the scene does
    // not exist until this resolves.
    if (canvas.value) {
        await table.mount(canvas.value, { deck: route.query.deck })

        // Development-only handles onto the live table, stripped from production by the DEV guard.
        // A dynamic import() typed at a console gets a SEPARATE module instance with empty state, so
        // these come from the table itself, where they are the instances the running table holds —
        // the trap that otherwise makes a Pixi scene look empty when it plainly is not.
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
    //- reka-ui's tooltips read a provider out of the component tree. The table view carries its own
    //- rather than counting on app.vue to have one: a view whose tooltips work only because some other
    //- component happens to be mounting it once left a table throwing on mount and rendering nothing.
    //- Nesting providers is harmless — app.vue may keep its own, and this one wins inside.

    //- `touch-manipulation` is stated here rather than left to the rule on `body > *` (see
    //- style/main.css). Both say the same thing — no double-tap zoom, pinch kept — but that one
    //- says it about an ancestor, and the whole reason it sits on `body > *` instead of `body` is
    //- that WebKit's answer to "which element's touch-action applies" is not one to lean on. A tap
    //- that lands between two fanned hand cards falls through to this element; naming it here is
    //- what makes the answer that tap gets its own, rather than one two levels up.
    .simulator-view(class="relative w-dvw h-dvh flex bg-linear-to-br from-neutral-900 to-neutral-950 overflow-hidden touch-manipulation")

        //- The app's chrome, not the table view's.
        //-
        //- This view owns WHERE it sits — a fixed corner above the canvas, which is a fact about the
        //- layout — and knows nothing about what goes in it: whatever renders this view fills the
        //- slot. A menu there can start the tutorial (tutorial.js tutorialStart) and open the shortcut
        //- sheet (ui.js dialogShortcut_open) directly, since both live beside this view.
        .menu(class="fixed top-3 left-4 z-10")
            slot(name="menu")

        //- The right panel: view controls, the room, the seats, and a section that follows the
        //- canvas selection. Overlays the table rather than taking layout width — see ui.js.
        Panel

        Toolbar

        //- Selection toolbars, as controls.js lists them; each self-renders based on uiSelection's type
        component(v-for="(toolbar, type) in selectionToolbars" :key="type" :is="toolbar")

        Hand

        //- Canvas Container.
        //-
        //- Capped at 1920 x 1080 and centred, rather than filling the viewport. Konva allocates a
        //- scene canvas and a hit canvas per layer, and every one of them is the full size of this
        //- element — so an uncapped 3840 x 2160 window on a DPR-2 display spends ~600MB on backing
        //- store, and a 3440 x 1440 ultrawide ~360MB, against ~150MB at the cap. Past the cap the
        //- player sees the gradient backdrop around the board instead of more table.
        //-
        //- The stage reads its size from this element (see handleResize in canvas/stage.js), so the
        //- cap is enforced here in CSS and nowhere else. Sized with w/h-full rather than flex-1
        //- because auto margins turn off cross-axis stretch, and the container has no intrinsic
        //- height to fall back on — Konva's own content div is sized FROM this box, so a collapse
        //- here would leave the stage measuring zero and never recovering.
        //-
        //- Keeps the neutral-900 the table has always been drawn on: the Konva background layer
        //- paints dots on transparent, so the board's colour has always come from the element under
        //- it, and letting the gradient show through here would change the table itself, not the
        //- surround.
        .canvas(
            ref="canvas"
            class="w-full h-full max-w-[1920px] max-h-[1080px] m-auto relative bg-neutral-900"
            :class="cursorClass"
        )

        //- Dialogs
        //-
        //- The table's own are below; the slot is for the host's. About is the site's, not the
        //- table's — it describes cardcarp rather than this table — so it comes in from outside
        //- for the same reason the menu does.
        slot(name="dialog")

        DialogShortcut

        //- First-run walkthrough. Mounted unconditionally; it decides for itself whether this
        //- profile has seen it, and draws nothing until it opens.
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

        //- Portrait on a small screen: the one state the table cannot be laid out for. Mounted
        //- last and unconditionally — like the walkthrough, it decides for itself whether this
        //- screen is one it has anything to say to, and draws nothing otherwise.
        DialogRotate
</template>
