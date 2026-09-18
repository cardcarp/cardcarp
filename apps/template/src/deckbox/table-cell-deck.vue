<script setup>
// Core
import { computed } from 'vue'

// Composables
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useCardArt } from '@cardcarp/deckbox/composable/card-art.js'

// Stores
import { mouseover_cell_card, mouseleave_cell_card } from '@cardcarp/core/store/preview.js'

// Assign
const { manifest } = useGameStore()

// Props
const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

const highlight_card = computed(() => manifest.value?.card_dict?.[props.item.highlight])

const { src: thumb_src, revealed, on_settle, img_ref } = useCardArt(highlight_card)
</script>

<template lang="pug">
.deck(class="relative")

    Transition(
        enter-active-class="transition-opacity duration-500 motion-reduce:transition-none"
        leave-active-class="transition-opacity duration-500 motion-reduce:transition-none"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
    )
        .bands(
            v-if="!revealed"
            aria-hidden="true"
            class="absolute inset-0 flex items-center gap-3 pointer-events-none"
        )
            .skeleton(class="flex-none size-8 rounded-sm")
            .lines(class="grow min-w-0 flex flex-col gap-1.5")
                .skeleton(class="w-2/5 h-3 rounded")
            .skeleton(class="shrink-0 w-14 h-3 rounded")

    .row(
        class="relative flex items-center gap-3 transition-opacity duration-500 motion-reduce:transition-none"
        :class="revealed ? 'opacity-100' : 'opacity-0'"
    )
        .highlight(
            v-if="thumb_src"
            class="relative flex-none size-8 rounded-sm overflow-hidden bg-white/5"
            @pointerenter="mouseover_cell_card($event, highlight_card)"
            @pointerleave="mouseleave_cell_card"
        )
            img(
                :ref="img_ref"
                :src="thumb_src"
                alt=""
                class="size-full object-cover"
                @load="on_settle"
                @error="on_settle"
            )

        .highlight(v-else class="relative flex-none flex justify-center items-center bg-white/5 size-8 rounded-sm")
            svg(class="size-5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                template(v-if="item.name === 'Storage'")
                    path(d="M10 15h4")
                    path(d="m14.817 10.995-.971-1.45 1.034-1.232a2 2 0 0 0-2.025-3.238l-1.82.364L9.91 3.885a2 2 0 0 0-3.625.748L6.141 6.55l-1.725.426a2 2 0 0 0-.19 3.756l.657.27")
                    path(d="m18.822 10.995 2.26-5.38a1 1 0 0 0-.557-1.318L16.954 2.9a1 1 0 0 0-1.281.533l-.924 2.122")
                    path(d="M4 12.006A1 1 0 0 1 4.994 11H19a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z")
                template(v-else)
                    path(d="m12.99 6.74 1.93 3.44")
                    path(d="M19.136 12a10 10 0 0 1-14.271 0")
                    path(d="m21 21-2.16-3.84")
                    path(d="m3 21 8.02-14.26")
                    circle(cx="12" cy="5" r="2")

        .text(class="grow min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 leading-none")
            span(class="text-3") {{ item.name }}
            span(class="opacity-50 text-2.75 truncate") {{ item.tagline }}

        .total(class="shrink-0 text-3 font-mono text-right") {{ item.total }}
</template>
