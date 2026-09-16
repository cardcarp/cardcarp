<script setup>
// One collapsible row of the right panel: a header that is its own toggle, and a body that
// is whatever the section puts in the default slot.
//
// The open flag lives in the table store's `panel_section` record rather than in a local
// ref, and that placement is the whole design. A contextual section is remounted every time
// the canvas selection changes type, so a local ref would spring back open on every reselect
// — the one place a player most wants their choice to stick. Keying off a plain string id
// also means whoever wants a section open (the walkthrough today, a shortcut tomorrow) names
// it without importing it, exactly as the tour anchors name elements by `data-tour`.
import { computed } from 'vue'

import { AnimatePresence, Motion } from 'motion-v'

import { panel_section } from '../ui.js'

const props = defineProps({
    id: { type: String, required: true },
    title: { type: String, required: true },
    // Copied onto the header so the walkthrough can anchor a step at a whole section.
    tour: { type: String, default: null },
})

// Absent reads as open: a section id that reached this build after the player's stored
// record was written has no entry, and a new section appearing collapsed is the worse
// default — it is invisible, so nothing tells them it arrived.
const open = computed({
    get: () => panel_section.value[props.id] !== false,
    set: (value) => { panel_section.value[props.id] = value },
})
</script>

<template lang="pug">
.section(class="flex-none flex flex-col border-b border-neutral-800 last:border-b-0")

    .header(
        @click="open = !open"
        :data-tour="tour"
        class="group/section flex-none h-8 pl-3 pr-3 flex items-center gap-1.5 select-none"
    )
        svg(
            class="flex-none size-3 text-neutral-500 transition-transform duration-150"
            :class="{ '-rotate-90': !open }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
        )
            path(d="m6 9 6 6 6-6")

        span(class="min-w-0 truncate font-light text-2.75 text-neutral-300 group-hover/section:text-white tracking-wider leading-none") {{ title }}

        //- Status and one-click affordances that belong to the section but must stay usable
        //- while it is collapsed — the connection dot, a count. `.stop` so pressing one is
        //- not also a toggle of the header it sits in.
        .aside(class="flex-none flex items-center gap-1.5" @click.stop)
            slot(name="aside")

    //- Height-to-auto rather than a plain v-if: the sections sit in one scrolling column, so
    //- a section snapping shut jumps every section under it. `:initial="false"` keeps that
    //- animation off the first paint, where there is nothing to animate from.
    AnimatePresence(:initial="false")
        Motion(
            v-if="open"
            key="body"
            :initial="{ height: 0, opacity: 0 }"
            :animate="{ height: 'auto', opacity: 1 }"
            :exit="{ height: 0, opacity: 0 }"
            :transition="{ duration: 0.18, ease: 'easeOut' }"
            class="overflow-hidden"
        )
            .body(class="px-4 pt-0.5 pb-3")
                slot
            .divider(class="h-4")
</template>
