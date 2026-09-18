<script setup>
// Core
import { computed, ref } from 'vue'

// UI
import { Motion } from 'motion-v'

// Composables
import { useImage } from '@cardcarp/core/composable/image.js'

// Stores
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { preview_item_card, preview_item_variant, preview_item_isActive, preview_was_active, preview_x, preview_y, preview_w, preview_h } from '@cardcarp/core/store/preview.js'

// Assign
const { card_ratio } = useGameStore()
const { card_src } = useImage()

const image_src = (variant = '') => card_src(preview_item_card.value, variant)
const image_main = computed(() => image_src(preview_item_variant.value))
</script>

<template lang="pug">
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
