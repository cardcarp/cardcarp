<script setup>
import { color_list } from './colors.js'

defineProps({
    onPick: { type: Function, required: true },
})
</script>

<template lang="pug">
.swatches(class="p-2 grid grid-cols-11 gap-1 bg-neutral-950 border border-white/5 rounded-xl")
    .btn(
        v-for="color in color_list"
        :key="color"
        @click="onPick(color)"
        class="size-6 rounded-full outline outline-white/5"
        :style="{ backgroundColor: `hsl(${color})` }"
    )
</template>
