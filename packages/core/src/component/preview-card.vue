<script setup>
// Core
import { computed, ref } from 'vue'

// UI
import { Motion } from 'motion-v'

// Composables
import { useImage } from '../composable/image.js'

// Stores
import { useGameStore } from '../composable/game.js'
import { preview_item_card, preview_item_variant, preview_item_isActive, preview_was_active, preview_x, preview_y, preview_w, preview_h } from '../store/preview.js'

// Assign
const { card_ratio } = useGameStore()
const { card_src } = useImage()

const image_src = (variant = '') => card_src(preview_item_card.value, variant)
const image_main = computed(() => image_src(preview_item_variant.value))
</script>

<template lang="pug">
//- Above every dialog layer. The preview is a hover affordance for whatever is under the
//- cursor, so it has to sit on top of the thing being hovered — including a dialog's own
//- rows (the scry list). At z-100 it tied with DialogShell's box (100, or 102 for a stacked
//- layer) and lost on DOM order, because dialogs portal to the end of body: the preview
//- opened correctly and was painted underneath. z-300 clears the whole range in use (99–200)
//- with room to spare, and costs nothing elsewhere since the preview is pointer-events-none
//- and only ever opens for elements far smaller than itself.
Motion(
    class="fixed top-0 left-0 pointer-events-none z-300"
    :animate="{ x: preview_x, y: preview_y }"
    :transition="preview_was_active ? { type: 'spring', stiffness: 400, damping: 35 } : { duration: 0 }"
)
    Motion(
        class="relative bg-black rounded-[3%] overflow-hidden touch-none"
        :animate="preview_item_isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }"
        :transition="{ duration: 0.15 }"
        :style="{ width: `${preview_w}px`, aspectRatio: card_ratio }"
    )
        img(v-if="preview_item_isActive" class="size-full object-cover" :src="image_main")
    
</template>
