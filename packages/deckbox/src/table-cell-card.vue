<script setup>
// Table-layout card row: name, set, category, with the card's art washed in
// behind the right-hand edge.
//
// The row's text comes from the manifest already in memory — there is nothing
// to wait for — so the skeleton that used to sit over it was standing in for
// content that was there the whole time, and the 0.5s reveal was delaying real
// text behind an animation. Only the art can be late, so only the art waits.

// Composables
import { useCardArt } from './composable/card-art.js'

// Props
const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

// Assign
const { src, revealed, on_settle, img_ref } = useCardArt(() => props.item)
</script>

<template lang="pug">
//- An <img> rather than a CSS background so the art's arrival is observable:
//- background-image fires no load event, which is what forced the timer this
//- replaces. Rendering is identical — object-cover/object-position stand in for
//- bg-cover/bg-position, and the mask and opacity apply either way.
img(
    v-if="src"
    :ref="img_ref"
    :src="src"
    alt=""
    aria-hidden="true"
    class="absolute top-0 right-0 w-1/2 h-full object-cover object-[50%_25%] mask-l-from-0 pointer-events-none transition-opacity duration-500 motion-reduce:transition-none"
    :class="revealed ? 'opacity-10' : 'opacity-0'"
    draggable="false"
    @load="on_settle"
    @error="on_settle"
)

.row(
    class="relative size-full grid items-center gap-3"
    style="grid-template-columns: minmax(0, 1fr) auto"
)
    .text(class="min-w-0 flex gap-2")
        span(class="truncate") {{ item.name }}
        .description(class="truncate opacity-50") {{ item.set_name }}

    .category(class="text-right whitespace-nowrap") {{ item.category }}
</template>
