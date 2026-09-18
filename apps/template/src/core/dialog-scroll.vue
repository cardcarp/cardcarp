<script setup>
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
    thumbWidth: { type: String, default: '4px' }
})

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
