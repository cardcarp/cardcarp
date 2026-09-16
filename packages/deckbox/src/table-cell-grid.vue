<script setup>
// Grid cell: the card's art is the content, so the skeleton stands in until the
// art is actually there. Previously it revealed on a fixed 1s CSS delay, which
// meant cached art was held back for a second and slow art appeared over a
// skeleton that had already gone.

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
.card(class="relative flex-1 min-h-0 size-full flex items-center justify-center rounded-[calc(3cqw+1px)] overflow-hidden")

    //- Three bands standing in for art, title and subtitle. Left mounted under
    //- the image rather than toggled: it is what shows through while the art
    //- fades in, so removing it would flash the black backing.
    .bands(aria-hidden="true" class="absolute inset-0 size-full p-2 grid grid-rows-6 gap-2")
        .skeleton(class="row-span-3 w-full h-full rounded")
        .skeleton(class="row-span-1 w-full h-full rounded")
        .skeleton(class="row-span-1 w-4/6 h-full rounded")

    img(
        :ref="img_ref"
        :src="src"
        :alt="item.name"
        class="relative size-full bg-black object-cover drag-none z-2 transition-opacity duration-500 motion-reduce:transition-none"
        :class="revealed ? 'opacity-100' : 'opacity-0'"
        draggable="false"
        @load="on_settle"
        @error="on_settle"
    )

    .quantity(
        v-if="Object.hasOwn(item, 'quantity')"
        class="absolute z-3 left-1/2 -translate-x-1/2 bottom-1/100 px-3 py-1.5 flex items-center justify-center font-mono font-light text-[calc(3cqw+10px)] text-yellow-600 text-center leading-none bg-black rounded-full"
    )
        span {{ String(item.quantity).padStart(2, ' ') }}
</template>
