<script setup>
// Core
import { computed, ref, useTemplateRef } from 'vue'

// Libraries
import { AnimatePresence, motion, Motion } from 'motion-v'

// UI
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuTrigger,

    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

// Components
import DropdownAction from './dropdown-action.vue'
import CellDeck from './table-cell-deck.vue'

// Composables
import { useImage } from '@cardcarp/core/composable/image.js'
import { useState } from './state.js'
import { drag_item_isActive, use_drag } from '@cardcarp/core/store/drag.js'
import { preview_item_isActive, mouseover_cell_card, mouseleave_cell_card } from '@cardcarp/core/store/preview.js'

// Assign
const {
    is_desktop,
    panel_right_content,
    user_decks,
    deck_building,
    deck_building_grouped,
    deck_new,
    deck_load,
    deck_card_move,
    deck_card_increase,
    deck_card_decrease,
    deck_card_remove,
    deck_save,
    dialog_detail_edit,

    groups_available,
    group_is_shown,
    group_card_list,
    group_toggle
} = useState()
const { card_src } = useImage()

// --- Shape -----------------------------------------------------------------
// The panel is a right-hand column at lg and up and a bottom sheet below it
// (index.vue puts it in the matching grid track). Both differences are the
// same one: which edge it meets the center on.
//
// Where it parks when closed — just off whichever edge it came from.
const panel_hidden = computed(() =>
    is_desktop.value ? { x: '100%', y: '0%' } : { x: '0%', y: '100%' }
)

// And the seam it draws against the center on that edge.
const panel_edge = computed(() =>
    is_desktop.value
        ? 'inset 1px 0 0 0 hsl(0 0 100 / 0.15), inset 3px 0 0 0 hsl(0 0 0)'
        : 'inset 0 1px 0 0 hsl(0 0 100 / 0.15), inset 0 3px 0 0 hsl(0 0 0)'
)

// Computed
const build_total = computed(() => ({
    quantity: deck_building.list.reduce((sum, c) => sum + c.quantity, 0),
    unique: deck_building.list.length,
}))

// Local
const menu_deck_group_active = ref(false)
const save_active = ref(false)
const save_text = ref("Save")

// The whole right column — a drop outside its bounds removes the entry.
const right_el = useTemplateRef('right_el')

// --- Row drag: move a build entry between groups, or drop it out -----------
// Dropping past the edge of the right column removes the entry entirely.
// Otherwise, only group lists inside the build panel are valid targets — the
// center table's .list elements carry data-list attributes too.
const { start: row_drag_start } = use_drag((e, item) => {
    const rect = right_el.value?.getBoundingClientRect()
    const outside = rect && (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom
    )

    if (outside) {
        deck_card_remove(item)
        return
    }

    const target = document.elementFromPoint(e.clientX, e.clientY)
    const dropList = target?.closest('.panel-collect')
        ? target.closest('.list')?.dataset.list
        : null

    if (dropList) deck_card_move(item, dropList)
})

function onRowPointerDown(e, item) {
    if (e.target.closest('.collect')) return    // +/- controls, not a drag handle

    preview_item_isActive.value = false

    row_drag_start(e, item)
}

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

function click_deck_building_name() {
    if (deck_building.name === "Storage") return
    dialog_detail_edit.active = true
}
</script>

<template lang="pug">
.right(ref="right_el" class="relative min-w-0 min-h-0 h-full flex flex-col overflow-hidden bg-zinc-950")
    Motion(
        :initial="panel_hidden"
        :animate="panel_right_content ? { x: '0%', y: '0%' } : panel_hidden"
        :transition="{ type: 'tween', duration: 0.3, easing: 'easeInOut' }"
        class="flex-none relative p-2 lg:pl-3 max-lg:pt-3 min-h-0 w-full lg:w-80 h-full flex flex-col leading-none z-10"
        :style="{ boxShadow: panel_edge }"
    )

        .box(
            class="flex-1 min-h-0 h-full flex flex-col bg-linear-to-r from-neutral-950 via-neutral-900 to-neutral-950 rounded-2xl"
            style="box-shadow: 2px 0 0 hsl(0 0 0), -2px 0 0 hsl(0 0 0), 2px 0 4px hsl(0 0 0 / 0.5), -2px 0 4px hsl(0 0 0 / 0.5)"
        )

            //- ---- Saved: the user's decks -------------------------------------
            template(v-if="panel_right_content == 'saved'")

                .title(
                    class="h-10 flex items-center justify-center text-white/75 text-3 font-mono text-shadow bg-linear-to-br from-neutral-900 to-neutral-950 rounded-t-xl"
                    style="box-shadow: inset 0 1px 0 0 hsl(0 0 100 / 0.02 ), inset 0 -1px 0 0 hsl(0 0 100 / 0.1 ), inset 0 -2px 0 0 black"
                ) Saved Decks

                ScrollAreaRoot(
                    class="group/scroll relative flex-1 min-h-0 w-full flex flex-col z-10" 
                    type="auto"
                    style="--reka-scroll-area-thumb-width: 4px;"
                )
                    ScrollAreaViewport(
                        class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3"
                    )

                        .deck(
                            v-for="deck in user_decks"
                            :key="deck.id"
                            @click="deck_load(deck)"
                            class="group/item relative pl-3 pr-4 py-3"
                            style="box-shadow: inset 0 -1px 0 0 hsl(0 0 0); border-bottom:  1px solid hsl(0 0 100 / 0.05)"
                        )
                            .hover(class="absolute -inset-px bg-yellow-500/5 opacity-0 transition-opacity group-hover/item:opacity-100")
                            CellDeck(:item="deck")

                        .divider-dark(class="absolute bottom-0 w-full h-1 bg-black")

                    ScrollAreaScrollbar(
                        orientation="vertical" 
                        class="flex p-1 bg-black select-none touch-none"
                        style="box-shadow: -2px 0 0 0 hsl(0 0 0), inset 1px 0 0 0 hsl(0 0 100 / 0.08)"
                    )
                        ScrollAreaThumb(class="flex-1 bg-neutral-700 rounded")

                .reset(class="flex-none rounded-b-2xl text-3 font-mono")
                    .divider-light(class="w-full h-px bg-white/5")
                    .padding(class="px-4 pt-3 pb-3.5 flex flex-col justify-center")
                        .btns(class="p-1.5 flex justify-center items-center gap-1.5 bg-black rounded-lg" style="box-shadow: 0 1px 0 0 hsl(0 0 100 / 0.075)")
                            .btn(
                                @click="deck_new()" 
                                class="px-4 w-full h-8 flex items-center justify-center text-white/50 bg-yellow-700 rounded hover:text-white hover:bg-yellow-600 transition-colors cursor-pointer"
                                style="box-shadow: inset 0 1px 4px 0 hsl(0 0 100 / 0.15)"
                            ) New Deck

            //- ---- Build: the active deck -------------------------------------
            template(v-else)

                .title(
                    @click="click_deck_building_name"
                    class="group/title relative px-2 w-full h-10 grid items-center justify-center gap-2 text-white/75 text-3 font-mono text-shadow bg-linear-to-br from-neutral-900 to-neutral-950 rounded-t-xl z-11"
                    style="grid-template-columns: 1fr auto 1fr; box-shadow: inset 0 1px 0 0 hsl(0 0 100 / 0.02 ), inset 0 -1px 0 0 hsl(0 0 100 / 0.1 ), inset 0 -2px 0 0 black, 0 10px 10px 0 hsl(0 0 0 / 0.4)"
                )
                    .col(class="relative min-w-0 flex justify-start")
                    .col(class="relative min-w-0 flex items-center justify-center") {{ deck_building.name ? deck_building.name : 'New Deck' }}
                    .col(v-show="deck_building.name !== 'Storage'" class="relative min-w-0 flex gap-2 whitespace-nowrap") 
                        .btn(class="size-7 flex items-center justify-center text-white/0 rounded-full group-hover/title:text-white/50 hover:text-white")
                            svg(class="flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7")
                                path(d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z")

                //- .panel-collect is the drag-drop target the center table looks
                //- for; each .list[data-list] inside it is a group drop zone.
                ScrollAreaRoot(
                    class="panel-collect group/scroll relative flex-1 min-h-0 w-full flex flex-col z-10" 
                    type="auto"
                    style="--reka-scroll-area-thumb-width: 4px;"
                )
                    ScrollAreaViewport(
                        class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3"
                    )

                        .list(
                            v-for="group in deck_building_grouped"
                            :key="group.name"
                            :data-list="group.name"
                            class="group/list"
                            :class="{ active: drag_item_isActive }"
                        )
                            .list-title(class="group-hover/list:group-[&.active]/list:text-yellow-500 px-4 h-9 flex items-center gap-3 text-yellow-700 text-left text-3 font-mono leading-none whitespace-nowrap capitalize bg-black")
                                span {{ group.name }}

                            template(v-if="!group.item_list.length")
                                .empty(class="px-4 pb-4 mt-5 text-center opacity-50")
                                    .wrap(class="px-3 py-2.25 flex flex-col gap-1 outline outline-white/20 outline-dashed rounded-sm group-hover/list:group-[&.active]/list:outline-yellow-500/50 group-hover/list:group-[&.active]/list:text-yellow-500/80")
                                        span(class="text-3.25 text-balance font-light leading-tight capitalize") Drag and Drop cards

                            template(v-else)
                                .row(
                                    v-for="item in group.item_list"
                                    :key="`${item.id}-${group.name}`"
                                    class="group/item relative pl-4 pr-4 py-2 flex items-center gap-2 text-3.5 touch-none shadow-[inset_0_-1px_0_0_hsl(0_0%_0%)] border-b border-b-[hsl(0_0%_100%/0.04)] last:shadow-none last:border-none"
                                    @pointerdown="onRowPointerDown($event, item)"
                                    @pointerenter="mouseover_cell_card($event, item)"
                                    @pointerleave="mouseleave_cell_card"
                                )

                                    .bg(
                                        class="absolute top-0 -right-1/12 w-1/2 h-full bg-cover bg-center opacity-10"
                                        style="mask-image: linear-gradient(to right, transparent, white);"
                                        :style="{ backgroundImage: `url('${ card_src(item) }')`}"
                                    )

                                    .hover(
                                        class="absolute -inset-px rounded-lg opacity-0 transition-opacity bg-yellow-500/5 group-hover/item:opacity-100"
                                        :style="drag_item_isActive ? 'opacity: 0' : ''"
                                    )

                                    .text(class="grow min-w-0 flex gap-2")
                                        span(class="truncate") {{ item.name }}

                                    .collect(class="relative flex items-center gap-1 text-right whitespace-nowrap z-20")
                                        .increase(class="flex-none size-7 flex justify-center items-center bg-black text-green-700 rounded-full  hover:text-green-400" @click="deck_card_increase(item)")
                                            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                path(d="M5 12h14")
                                                path(d="M12 5v14")

                                        .decrease(class="flex-none size-7 flex justify-center items-center bg-black text-red-700 rounded-full  hover:text-red-400" @click="deck_card_decrease(item)")
                                            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                path(d="M5 12h14")

                                        .total(class="ml-2 font-mono text-yellow-600") {{ item.quantity }}

                    .divider-dark(class="absolute bottom-0 w-full h-1 bg-black")

                    ScrollAreaScrollbar(
                        orientation="vertical" 
                        class="flex p-1 bg-mauve-900 select-none touch-none"
                        style="box-shadow: -2px 0 0 0 hsl(0 0 0), inset 1px 0 0 0 hsl(0 0 100 / 0.08)"
                    )
                        ScrollAreaThumb(class="flex-1 bg-mauve-700 rounded")

                .toolbar(class="flex-none rounded-b-2xl text-3 font-mono")
                    .divider-light(class="w-full h-px bg-white/5")
                    .padding(class="px-4 pt-3 pb-3.5 flex flex-col justify-center gap-2")
                        .totals(class="my-1 flex items-center justify-center gap-3 text-mauve-500")
                            span {{ build_total.quantity }} cards, {{ build_total.unique }} unique
                        .btns(class="p-1.5 flex justify-center items-center gap-1.5 bg-black rounded-lg" style="box-shadow: 0 1px 0 0 hsl(0 0 100 / 0.075)")
                            DropdownAction(location="build")
                                template(v-slot="{ open }")
                                    .btn(
                                        class="px-4 w-full h-8 flex items-center justify-center text-white/50 bg-slate-800 rounded hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                                        style="box-shadow: inset 0 1px 4px 0 hsl(0 0 100 / 0.15)"
                                        :class="{'text-white! bg-slate-700!': open}"
                                    ) Edit
                            DropdownMenuRoot(:modal="false" v-model:open="menu_deck_group_active")
                                DropdownMenuTrigger

                                    .btn(
                                        class="px-4 w-full h-8 flex items-center justify-center text-white/50 bg-slate-800 rounded hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                                        style="box-shadow: inset 0 1px 4px 0 hsl(0 0 100 / 0.15)"
                                        :class="{'text-white! bg-slate-700!': menu_deck_group_active}"
                                    ) View

                                DropdownMenuPortal()
                                    DropdownMenuContent(
                                        align="center" 
                                        side="bottom" 
                                        :alignOffset="0" 
                                        :sideOffset="6" 
                                        class="font-mono text-3 bg-black border border-neutral-800 rounded-xl z-100 shadow-xl/80 transition-transform animate-pop"
                                    )
                                        //- Every group the game offers, not just the shown
                                        //- ones — turning a hidden group back on is the point
                                        //- of the menu. `main` is listed but disabled rather
                                        //- than omitted: a locked row explains itself, a
                                        //- missing one does not.
                                        DropdownMenuGroup(class="p-1.5 flex flex-col gap-1 border-b border-white/10 last:border-none")
                                            DropdownMenuItem(
                                                v-for="group in groups_available"
                                                :key="group"
                                                :data-list="group"
                                                :disabled="group === 'main'"
                                                class="h-7 pr-3 flex items-center gap-2 rounded-md data-disabled:opacity-40 data-highlighted:bg-white/10 outline-none"
                                                :class="group === 'main' ? '' : 'hover:bg-white/10'"
                                                @select="event => { event.preventDefault(); group_toggle(group) }"
                                            )
                                                svg(:class="group_is_shown(group) ? 'text-green-500' : 'text-neutral-600'" class="flex-none ml-1 size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                    circle(cx="12.1" cy="12.1" r="1")
                                                .text(class="grow capitalize") {{ group }}
                                                //- What hiding this group would cost, shown
                                                //- before the click rather than in the confirm.
                                                .count(v-if="group_card_list(group).length" class="pl-6 tabular-nums opacity-40") {{ group_card_list(group).length }}
                                    
                            .btn(
                                @click="click_save()" 
                                class="px-4 w-full h-8 flex items-center justify-center gap-1.5 text-white/50 bg-green-900 rounded hover:text-white hover:bg-green-800 transition-colors cursor-pointer"
                                style="box-shadow: inset 0 1px 4px 0 hsl(0 0 100 / 0.15)"
                            ) 
                                span {{ save_text }}
</template>
