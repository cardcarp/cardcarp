<script setup>
defineProps({
    rows: { type: Number, default: 8 }
})
</script>

<template lang="pug">
.list-skeleton(class="relative flex flex-col gap-1" role="status" aria-busy="true")
    span(class="sr-only") Loading
    .item(
        v-for="n in rows"
        :key="n"
        aria-hidden="true"
        class="relative w-full pl-3 pr-4 py-2 bg-white/5 rounded-sm overflow-hidden"
    )
        .skeleton-group(class="flex items-center gap-3")
            .skeleton(class="w-3/4 h-3 rounded")
            .skeleton(class="shrink-0 w-1/4 h-3 rounded")
</template>
