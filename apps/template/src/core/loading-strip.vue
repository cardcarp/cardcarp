<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick, useTemplateRef } from 'vue'
import { useGameStore } from '@cardcarp/core/composable/game.js'

const { loading } = useGameStore()

const CRAWL_TO = 0.75
const CRAWL_MS = 5000

const FINISH_MS = 400
const FADE_OUT_MS = 550
const FADE_IN_MS = 120

const mounted = ref(false)
const lit = ref(false)

const progress = ref(0)
const duration = ref(0)
const ease = ref('linear')

const strip_el = useTemplateRef('strip')

const bar_style = computed(() => ({
    transform: `scaleX(${progress.value})`,
    transitionDuration: `${duration.value}ms`,
    transitionTimingFunction: ease.value,
}))

let exit_timer = null
function clear_timer() {
    if (exit_timer) {
        clearTimeout(exit_timer)
        exit_timer = null
    }
}

watch(loading, async (is_loading) => {
    clear_timer()

    if (is_loading) {
        duration.value = 0
        progress.value = 0
        mounted.value = true

        await nextTick()

        void strip_el.value?.offsetWidth

        lit.value = true
        duration.value = CRAWL_MS
        ease.value = 'cubic-bezier(0.12, 0.78, 0.28, 0.99)'
        progress.value = CRAWL_TO
        return
    }

    if (!mounted.value) return

    duration.value = FINISH_MS
    ease.value = 'cubic-bezier(0.4, 0, 0.2, 1)'
    progress.value = 1
    lit.value = false

    exit_timer = setTimeout(() => {
        mounted.value = false
        duration.value = 0
        progress.value = 0
        exit_timer = null
    }, Math.max(FINISH_MS, FADE_OUT_MS))
}, { immediate: true })

onBeforeUnmount(clear_timer)
</script>

<template lang="pug">
.loading-strip(
    v-if="mounted"
    ref="strip"
    class="absolute inset-0 w-full h-0.5 overflow-hidden pointer-events-none z-200 transition-opacity"
    :class="lit ? 'opacity-100' : 'opacity-0'"
    :style="{ transitionDuration: `${lit ? FADE_IN_MS : FADE_OUT_MS}ms` }"
    role="progressbar"
    aria-label="Loading game data"
)
    .loading-strip-bar(
        class="absolute inset-0 w-full h-0.5 origin-[0%_50%] transition-transform bg-linear-to-r from-sky-500 via-fuchsia-500 to-rose-500 animate-pulse"
        :style="bar_style"
    )
</template>
