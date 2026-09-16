<script setup>
// The page-top load strip. The app renders before its card data arrives — main.js starts the load
// and mounts straight away — so there is a stretch where the page is up, interactive and still
// filling in. The lists' skeletons say "this region is coming"; this says "the page as a whole is
// still working", on either route, so neither has to own a spinner. It matters most on a ?deck= link:
// the table waits for the data before it can deal, and would otherwise look like nothing is happening.
//
// The bar crawls to 75% over five seconds and parks there. That figure is an estimate, not a
// measurement: fetch reports no progress for the manifest, and streaming the body by hand to get a
// real one would hold a second full copy of it in memory — ptcg's is 28 MB of JSON. So the bar is
// paced to feel like the load and stops short of the end, which is the part it genuinely cannot
// know. Beating the load is fine and expected; it simply waits at 75%.
//
// On the way out it runs the remaining quarter while it fades, so the strip always resolves rather
// than vanishing mid-crawl.
import { ref, computed, watch, onBeforeUnmount, nextTick, useTemplateRef } from 'vue'
import { useGameStore } from '@cardcarp/core/composable/game.js'

const { loading } = useGameStore()

const CRAWL_TO = 0.75
const CRAWL_MS = 5000

// The closing lap and the fade run together, with the fade trailing slightly so
// the bar is seen reaching the end rather than dimming out just before it.
const FINISH_MS = 400
const FADE_OUT_MS = 550
const FADE_IN_MS = 120

// Mounted covers the whole life of one strip, fade-out included — `loading`
// going false starts the exit, it doesn't end it.
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

// Immediate, because ptcg asks for its game before the app mounts (main.js), so the first load is
// already under way by the time this component exists. Watching only for changes would wait for a
// `true` that has already happened, and the one load a visitor is sure to sit through would pass
// without a strip.
watch(loading, async (is_loading) => {
    clear_timer()

    if (is_loading) {
        // Back to zero with transitions off first: a load starting while the
        // previous strip is still fading would otherwise animate backwards from
        // wherever that one had got to.
        duration.value = 0
        progress.value = 0
        mounted.value = true

        await nextTick()

        // A transition needs a computed start value to run from, and a
        // freshly inserted element has none — its first style *is* the zero
        // state, so changing it in the same frame is not a change at all and
        // the bar snaps straight to 75%. Reading a layout property forces the
        // browser to commit that zero state now; the crawl below then lands on
        // the next flush as a genuine change. A rAF would usually do the same
        // job, but only by luck of ordering — this is the part that has to be
        // deterministic.
        void strip_el.value?.offsetWidth

        lit.value = true
        duration.value = CRAWL_MS
        // Fast off the line, then flattening out, so the wait reads as steady
        // progress rather than as a stall at the end.
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
//- `absolute` rather than `fixed`: both routes are dvh shells with overflow-hidden, so the
//- document never scrolls beneath it and the two resolve identically. A scrolling route showing
//- this would want `fixed`.
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
