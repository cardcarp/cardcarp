<script setup>
// Core
import { useMediaQuery } from '@vueuse/core'

// UI
import { Motion } from 'motion-v'

const MAX_WIDTH = '48rem'

const needs_landscape = useMediaQuery(
    `(orientation: portrait) and (max-width: ${MAX_WIDTH}) and (pointer: coarse)`
)
</script>

<template lang="pug">
Teleport(to="body")
    .dialog-rotate(
        v-if="needs_landscape"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rotate-title"
        class="fixed inset-0 p-8 flex flex-col items-center justify-center gap-6 text-center bg-neutral-950 select-none z-400"
    )
        Motion(
            class="text-neutral-500"
            :animate="{ rotate: [0, 0, -90, -90, 0] }"
            :transition="{ duration: 3.2, times: [0, 0.15, 0.45, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }"
        )
            svg(class="size-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                rect(x="6" y="2" width="12" height="20" rx="2.5")
                path(d="M10.5 18.5h3")

        .copy(class="flex flex-col gap-2 max-w-80")
            .title(id="rotate-title" class="text-5 text-white leading-tight") Turn your device sideways
            .body(class="text-3.25 text-neutral-400 leading-snug") The table is a landscape surface — the mat, your hand, and the panels need the long edge of your screen.

        .hint(class="font-mono text-2.75 text-neutral-600 leading-none") Nothing happening? Check rotation lock.
</template>
