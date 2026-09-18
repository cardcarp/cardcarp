<script setup>
// Core
import { computed, ref } from 'vue'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'
import { orderBy } from 'lodash'

// UI
import {
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
    DialogTrigger,

    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,

    SelectContent,
    SelectGroup,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectLabel,
    SelectPortal,
    SelectRoot,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
    SelectViewport,

    SliderRange, 
    SliderRoot, 
    SliderThumb, 
    SliderTrack,

    VisuallyHidden
} from 'reka-ui'

// Composables
import { useState } from '@cardcarp/deckbox/state.js'
import { useImage } from '@cardcarp/core/composable/image.js'
import { useGameStore } from '@cardcarp/core/composable/game.js'

import { drawChance, shuffle } from '@cardcarp/deckbox/probability.js'

// Assign
const { card_ratio } = useGameStore()
const { card_src } = useImage()
const { probability } = useState()

// Local
const draw_seed = ref(0)
const option_draw = ref([7])
const deck = computed(() => {
    draw_seed.value
    return shuffle(probability.card_list_expanded)
})
const hand = ref(deck.value.slice(0, option_draw.value[0]))

// Actions
function close() {
    probability.active = false
    probability.card_list_expanded = []
    probability.card_list_unique = []
}

function click_hand_redraw() {
    draw_seed.value++
    hand.value = deck.value.slice(0, option_draw.value[0])
}

function click_hand_next() {
    const next_index = hand.value.length
    const next_card = deck.value[next_index]
    if (next_card) hand.value.push(next_card)
}

const datatable_draw_col = [
    { label: "Card", data: "name", class: "truncate" },
    { label: "Type", data: "category", class: "hidden @[40rem]/dialog:block" },
    { label: "Deck Count", data: "quantity", class: "hidden @[40rem]/dialog:block" },
    { label: "% of Deck", data: "percent", class: "hidden @[40rem]/dialog:block" },
    { label: "Probability", data: "probability", class: "" }
]

const datatable_draw_data = computed(() => {
    const deck_size = probability.card_total_expanded
    const draw_count = option_draw.value[0]

    const rows = probability.card_list_unique.map(card => ({
        ...card,
        percent: ((card.quantity / deck_size) * 100).toFixed(1),
        probability: (drawChance(deck_size, card.quantity, draw_count) * 100).toFixed(1)
    }))

    return orderBy(rows, ['probability'], ['desc'])
})

</script>

<template lang="pug">
DialogRoot(:modal="true" :open="probability.active")
    DialogPortal
        DialogOverlay(asChild)
            Motion(
                :initial="{ opacity: 0 }" 
                :animate="{ opacity: 1 }"
                :transition="{  ease: 'linear',  duration: 0.2 }"
                class="fixed inset-0 bg-black/80 backdrop-blur-xs z-99"
                @click="probability.active = false"
            )
        DialogContent(asChild @interact-outside="event => {return event.preventDefault()}")
            Motion( 
                :initial="{ opacity: 0, y: 0, scale: 0.9 }" 
                :animate="{ opacity: 1, y: 0, scale: 1 }" 
                :transition="{ ease: 'inertia', delay: 0.1 }"
                class="@container/dialog fixed top-1/2 left-1/2 w-180 max-w-[85vw] max-h-[85vh] flex flex-col text-4 rounded-xl -translate-x-1/2 -translate-y-1/2 z-100"
                style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13);"
            )
                VisuallyHidden(asChild)
                    DialogTitle
                VisuallyHidden(asChild)
                    DialogDescription(:aria-describedby="undefined")

                ScrollAreaRoot(
                    class="panel-collect group/scroll relative flex-1 min-h-0 w-full flex flex-col bg-linear-to-br to-neutral-950 from-neutral-900 bg-black rounded-xl z-10" 
                    type="auto"
                    style="--reka-scroll-area-thumb-width: 4px;"
                )
                    ScrollAreaViewport(
                        class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3"
                    )

                        .content(class="")

                            .section(class="p-6")
                                .title(class="flex items-end gap-2 text-5 text-white font-light leading-none")
                                    svg(class="relative -top-px size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        path(d="M5 21v-6")
                                        path(d="M12 21V3")
                                        path(d="M19 21V9")
                                    span Draw Simulator
                                    span(class="text-3 opacity-50") {{ probability.card_total_expanded }} Cards, {{ probability.card_total_unique }} Unique

                                .text(class="mt-3 text-3.5") Adjust draw count, then draw to simulate an opening hand from a shuffled deck.

                                .field(class="mt-6")
                                    .header(class="flex")
                                        .label(class="grow mb-2.5 text-white text-3 tracking-wider") DRAW COUNT
                                        .value(class="text-brand-tert text-3.5") {{ option_draw[0] }} cards
                                    SliderRoot(v-model="option_draw" :min="1" :max="15" :step="1" class="relative flex items-center select-none touch-none w-full h-5")
                                        SliderTrack(class="bg-white/20 relative grow rounded-full h-1")
                                            SliderRange(class="absolute bg-brand-tert rounded-full h-full")
                                        SliderThumb(class="block size-5 bg-white border-2 border-black rounded-full outline-none")

                                .btn-group(class="mt-6 flex gap-3")
                                    .btn(class="flex-1 px-2 py-3 flex justify-center items-center gap-2 bg-black text-white leading-none outline outline-white/20 rounded-lg pointer-point hover:bg-black/50 hover:outline-white/40" @click="click_hand_redraw")
                                        svg(class="flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8")
                                            path(d="M3 3v5h5")
                                        span Redraw {{ option_draw[0] }}
                                    .btn(class="flex-1 px-2 py-3 flex justify-center items-center gap-2 bg-black text-white leading-none outline outline-white/20 rounded-lg pointer-point hover:bg-black/50 hover:outline-white/40" @click="click_hand_next")
                                        svg(class="relative -top-px flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            circle(cx="12" cy="17" r="1")
                                            path(d="M21 7v6h-6")
                                            path(d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7")
                                        span Draw 1
                                
                                .cards(class="@container/card relative mt-3 p-3 w-full bg-white/5 rounded-2xl")
                                    .card(class="w-40 opacity-0" :style="{ aspectRatio: card_ratio }")
                                    .card(
                                        v-for="(card, card_index) in hand" 
                                        :key="`${card.id}-${card_index}-${draw_seed}`"
                                        class="absolute top-3 left-3 w-40 outline outline-white/20 rounded-lg overflow-hidden"
                                        :style="{ transform: `translateX(calc(${card_index} * (100cqw - 100%) / ${hand.length - 1}))`, aspectRatio: card_ratio }"
                                    )
                                        img(class="size-full object-cover" :src="card_src(card)")

                            .divider-dark(class="w-full h-0.5 bg-black")
                            .divider-light(class="w-full h-px bg-white/5")

                            .section(class="p-6")
                                .title(class="flex items-center gap-2 text-5 text-white font-light leading-none")
                                    svg(class="relative size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        path(d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z")
                                        path(d="M21.21 15.89A10 10 0 1 1 8 2.83")
                                    span Probability Table
                                .text(class="mt-3 text-3.5") Percentage breakdown for each card at draw size {{ option_draw[0] }} of {{ probability.card_total_expanded }} Cards  

                                .box(
                                    class="mt-4 grid text-sm bg-black rounded-lg outline outline-white/5 grid-cols-2 @[40rem]/dialog:grid-cols-[1fr_max-content_max-content_max-content_max-content]"
                                )
                                    .head-row(class="hidden col-span-full @[40rem]/dialog:grid grid-cols-subgrid border-b-2 border-zinc-700")
                                        .cell(v-for="col in datatable_draw_col" class="px-3 py-3 text-left text-3 text-white font-medium leading-none whitespace-nowrap opacity-75 last:text-right")
                                            span {{ col.label }}

                                    .row(
                                        v-for="(card, card_index) in datatable_draw_data"
                                        :key="`${card.id}-${card_index}`"
                                        class="relative col-span-full grid grid-cols-subgrid items-center hover:bg-white/5 touch-none border-b border-zinc-800 last:border-0"
                                    )
                                        .cell(
                                            v-for="col in datatable_draw_col"
                                            class="relative px-3 py-3 flex items-center gap-3 last:justify-end"
                                            :class="col.class"
                                        )
                                            .skeleton(class="absolute w-3/4 h-1/4 rounded opacity-0" style="animation: 0.5s linear 0.5s 1 reverse backwards running reveal-fade")
                                            .real(class="flex justify-end items-center gap-3 text-left text-3.5 font-normal whitespace-nowrap" style="animation: 0.5s linear 0.5s 1 normal both running reveal-fade")

                                                template(v-if="col.data === 'probability'")
                                                    .layout(class="flex items-center gap-4")
                                                        .bar(class="relative w-30 h-2 rounded-full bg-white/5")
                                                            .fill(class="absolute right-0 h-full rounded-full bg-red-500" :style="{width: `${card[col.data]}%`, backgroundColor: `hsl(${30 * (card[col.data])} 40 60)`}")
                                                        span() {{ card[col.data] }}%

                                                template(v-else)
                                                    span(class="") {{ card[col.data] }}

                    ScrollAreaScrollbar(
                        orientation="vertical" 
                        class="flex p-1 bg-mauve-900 select-none touch-none rounded-r-xl"
                        style="box-shadow: -2px 0 0 0 hsl(0 0 0), inset 1px 0 0 0 hsl(0 0 100 / 0.08)"
                    )
                        ScrollAreaThumb(class="flex-1 bg-mauve-700 rounded")
</template>