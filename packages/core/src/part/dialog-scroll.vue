<script setup>
// The corrected Reka ScrollArea, packaged so every dialog scrolls reliably.
//
// Reka's ScrollAreaViewport only sets `overflow` on itself — it gives the
// viewport no height. So the whole chain must hand it a definite, shrinkable
// height. We do that with flexbox (flex-1 + min-h-0 at every level) rather than
// percentage heights, which is why this works regardless of the parent layout.
//
// `min-w-0` rides along with the `min-h-0` for the other axis. A flex item's
// automatic minimum is its CONTENT's minimum rather than zero, so in a parent
// that is a flex ROW — a dialog with a sidebar, the table's panel column — the
// widest thing inside would otherwise hold this open and push it out past the
// edge of whatever contains it. In a flex COLUMN parent, the far commoner case
// here, it changes nothing: the item is stretched to full width regardless.
//
// Place inside a flex-column parent (DialogShell's box, or a flex column). The
// default slot is the scrollable content.
//
// Despite the name this is the app's one scroll area, dialogs and panels alike —
// the table's right panel and deck box scroll through it too, so a scrollbar
// looks the same wherever it turns up.

// Core
import { computed, ref } from 'vue'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

const props = defineProps({
    // Background + corner rounding for the scroll surface. Override per dialog
    // (e.g. 'rounded-b-xl' under a pinned header, or a panel background).
    rootClass: {
        type: String,
        default: ''
    },
    rootStyle: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        default: 'auto'
    },
    rounding: {
        type: String,
        default: 'rounded-r-xl'
    },
    // Minimum scrollbar thumb length (Reka CSS var).
    thumbWidth: { type: String, default: '4px' }
})

// The element that ACTUALLY scrolls, handed back to callers that need to drive or
// measure it — infinite scroll watching for the end, a filter change resetting to
// the top, a drag auto-scrolling at the edges. Reka's ScrollAreaRoot exposes it as
// `viewport`; without passing it on, wrapping the scroll area here would take that
// away from every caller that has one of those jobs.
const scroll_root = ref(null)
const viewport = computed(() => scroll_root.value?.viewport ?? null)

defineExpose({ viewport })
</script>

<template lang="pug">
ScrollAreaRoot(
    ref="scroll_root"
    :class="['group/scroll relative flex-1 min-w-0 min-h-0 flex flex-col z-10', rootClass]"
    :type="type"
    :style="[`--reka-scroll-area-thumb-width: ${thumbWidth};`, rootStyle]"
)
    ScrollAreaViewport(class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3")
        slot

    ScrollAreaScrollbar(
        orientation="vertical"
        class="flex p-1 bg-neutral-800 select-none touch-none"
        :class="rounding"
        style="box-shadow: -2px 0 0 0 hsl(0 0 0), inset 1px 0 0 0 hsl(0 0 100 / 0.08)"
    )
        ScrollAreaThumb(class="flex-1 bg-neutral-600 rounded")
</template>
