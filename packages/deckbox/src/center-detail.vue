<script setup>
// Core
import { computed, ref } from 'vue'

// Libraries
import { sumBy, countBy } from 'lodash'
import { AnimatePresence, Motion } from 'motion-v'

// UI
import {
    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger
} from 'reka-ui'

// Components
import DropdownAction from './dropdown-action.vue'

// Composables
import { useGameStore } from '@cardcarp/core/composable/game.js'

// State
import { useState } from './state.js'

// Assign
const { config, loading } = useGameStore()
const {
    panel_center_content,
    deck_selected,
    results,
    action_card_list,
    dialog_detail_read
} = useState()

// Local
const color = 'brand-tert'
const switch_total = ref(true)

// Title line for the active center dataset.
const detail = computed(() => {
    switch (panel_center_content.value) {
        case 'deck':
            return config.value?.name ? config.value.name + ': Deck Archive' : ''
        case 'list':
            return deck_selected.value?.name ? deck_selected.value?.name : 'No Deck Selected...'
        default:
            return config.value?.name ? config.value.name + ': Card Archive' : ''
    }
})

// Totals over the search-filtered results (not the full dataset), so the count
// tracks the active filters — matching result_total in the left panel.
const total_list = computed(() => ({
    quantity: sumBy(results.value, item => item.quantity ?? 1),
    unique: results.value.length,
    category: countBy(results.value, item => item.category || 'unknown')
}))

const unit = computed(() => panel_center_content.value === 'deck' ? 'decks' : 'cards')

// Only the deck-list panel ('list') stacks multiple copies of a card, so
// "unique" is meaningful there alone — the card and deck archives list each
// entry once, where unique always equals the total.
const show_unique = computed(() => panel_center_content.value === 'list')

// The Tools menu acts on the center's filtered cards, so show it only when
// there are cards to act on. This covers the deck archive (no card actions) and
// the deck-list panel before a deck is chosen — both expose no cards.
const show_actions = computed(() => action_card_list.value.length > 0)

// The title opens the deck's play-tips dialog, so it's only interactive on the
// deck-list panel with a deck selected. On the card/deck archives (and the
// empty deck-list) it's a plain, non-clickable label.
const title_clickable = computed(() => panel_center_content.value === 'list' && !!deck_selected.value)

// Actions
function click_title() {
    if (!title_clickable.value) return
    dialog_detail_read.active = true
}

</script>

<template lang="pug">
.details(
    class="sticky top-0 w-full text-3 leading-none z-10 bg-black/80 backdrop-blur-sm zoom-[.75] lg:zoom-[1]"
)
    .content(
        class="relative px-2 py-3 w-full grid items-center gap-10"
        style="grid-template-columns: 1fr auto 1fr"
    )

        .col(class="relative min-w-0 flex justify-start")
            .btn(@click="click_title" class="inline-flex items-center h-6 px-2 text-neutral-500 truncate rounded-full" :class="title_clickable ? 'hover:text-neutral-400 hover:bg-white/10' : ''")
                span(class="truncate") {{ detail }}

        .col(class="relative min-w-0 flex items-center justify-center")
            //- Actions target the center's filtered cards (action_card_list in
            //- state.js). Shown only when that list has cards, so it hides on the
            //- deck archive and on the deck-list panel before a deck is chosen.
            //- The empty column keeps the title/count layout aligned.
            DropdownAction(v-if="show_actions")
                template(v-slot="{ open }")
                    .btn(
                        class="relative px-4 w-full h-6 flex items-center justify-center text-white/50 bg-neutral-800 rounded-full hover:text-white hover:bg-neutral-700 transition-colors group-has-data-[state=visible]/scroll:left-1"
                        style="box-shadow: inset 0 1px 4px 0 hsl(0 0 100 / 0.075), 0 2px 1px 0 hsl(0 0 0), 0 2px 20px 0 hsl(0 0 0 / 0.5)"
                        :class="{'text-white! bg-neutral-700!': open}"
                    ) Tools
        .col(class="relative min-w-0 flex justify-end gap-2 whitespace-nowrap text-neutral-500")
            //- Counts are of the loaded archive, so before it lands the honest
            //- reading is "not known yet", not "0 cards" — which on a cold mtg
            //- load is the one number the user is waiting on and the one most
            //- likely to be read as a broken page.
            .placeholder(v-if="loading" class="flex items-center h-6 px-2")
                .skeleton(class="w-24 h-3 rounded")

            .btn(v-else-if="switch_total" @click="switch_total = !switch_total" class="flex gap-3 items-center h-6 px-2 min-w-0 overflow-hidden rounded-full hover:bg-white/10")
                span(class="shrink-0 whitespace-nowrap") {{ total_list.quantity.toLocaleString() }} {{ unit }}
                template(v-if="show_unique")
                    .divider(class="w-px h-4 bg-white/20 shrink-0")
                    span(class="shrink-0 whitespace-nowrap") {{ total_list.unique.toLocaleString() }} unique
            .btn(v-else @click="switch_total = !switch_total" class="min-w-0 overflow-hidden flex gap-3 items-center h-6 px-2 rounded-full hover:bg-white/10")
                template(v-for="(total, category) in total_list.category")
                    TooltipRoot(:delayDuration="100" :disable-closing-trigger="true")
                        TooltipTrigger(asChild)
                            .category(class="h-7 flex items-center gap-1")
                                span(class="truncate font-black") {{ category.charAt(0) }}
                                span(class="truncate") {{ total }}
                        TooltipPortal
                            AnimatePresence
                                TooltipContent(
                                    asChild 
                                    align="center" 
                                    side="bottom" 
                                    :sideOffset="4"
                                )
                                    Motion(
                                        :initial="{ opacity: 0, scale: 0 }" 
                                        :animate="{ opacity: 1, scale: 1 }" 
                                        class="px-2 py-1 text-white bg-black leading-none rounded-full font-mono text-2.5 pointer-events-none z-100"
                                    )
                                        span {{ category }}

</template>
