<script setup>
// The deck's long-form notes. This is the one consumer that genuinely wants
// `description` — the [{ title, body }] sections a publisher writes. The one-
// line `tagline` belongs to the row and the detail bar instead.

// Core
import { computed } from 'vue'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '@cardcarp/core/part/dialog-scroll.vue'

// State
import { useState } from './state.js'

// Assign
const {
    deck_selected,
    dialog_detail_read
} = useState()

// Compute
// Published decks carry sections; nothing else does, and mtg/ptcg have not
// populated them yet — so an absent or empty list is the normal case, not an
// error, and the dialog says so rather than rendering a blank panel.
const sections = computed(() =>
    (deck_selected.value?.description ?? []).filter(part => part?.title || part?.body)
)

// Actions
function close() {
    dialog_detail_read.active = false
}

</script>

<template lang="pug">
DialogShell(
    :open="dialog_detail_read.active"
    width="w-140"
    title="Deck details"
    @close="close"
)

    DialogScroll(rootClass="px-6 py-6 flex flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-l-xl")
        .title(class="flex items-end gap-2 text-5 text-white font-light leading-none")
            svg(class="relative -top-px size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z")
                path(d="M14 2v5a1 1 0 0 0 1 1h5")
                path(d="M10 9H8")
                path(d="M16 13H8")
                path(d="M16 17H8")
            span {{ deck_selected.name }}


        .divider-dark(class="mt-6 w-full h-0.5 bg-black")
        .divider-light(class="mb-6 w-full h-px bg-white/8")

        .section(class="mt-6 prose text-text font-light")
            template(v-if="sections.length")
                .part(v-for="(part, index) in sections" :key="index" :class="index ? 'mt-5' : ''")
                    //- A section's title is optional — wow's decks ship one
                    //- untitled block — so an empty one renders no heading
                    //- rather than an empty line above the body.
                    .part-title(v-if="part.title" class="text-white font-normal") {{ part.title }}
                    .part-body(v-if="part.body") {{ part.body }}

            .empty(v-else class="opacity-50") No notes for this deck.
</template>
