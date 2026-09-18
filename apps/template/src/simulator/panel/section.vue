<script setup>
import { computed } from 'vue'

import { AnimatePresence, Motion } from 'motion-v'

import { panel_section } from '../ui.js'

const props = defineProps({
    id: { type: String, required: true },
    title: { type: String, required: true },
    tour: { type: String, default: null },
})

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

        .aside(class="flex-none flex items-center gap-1.5" @click.stop)
            slot(name="aside")

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
