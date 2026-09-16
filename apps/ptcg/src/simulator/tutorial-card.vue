<script setup>
// The walkthrough panel itself. Placement is the orchestrator's problem (tutorial.vue) —
// this only knows how to draw a step, which is what lets the same card sit in a popover
// beside a button and dead centre of the screen without two sets of markup.
//
// Real <button>s rather than the clickable divs used elsewhere on the table: this is the
// one piece of table chrome a player is expected to tab through, and Reka focuses the
// first tabbable child when the popover opens.
defineProps({
    step: { type: Object, required: true },
    index: { type: Number, required: true },
    count: { type: Number, required: true },
    isFirst: { type: Boolean, default: false },
    isLast: { type: Boolean, default: false },
})

defineEmits(['next', 'back', 'skip'])
</script>

<template lang="pug">
.tutorial-card(class="w-74 p-4 flex flex-col gap-2.5 bg-black text-white outline outline-neutral-800 rounded-xl shadow-xl/80")

    .head(class="flex items-center gap-3")
        .dots(class="grow flex items-center gap-1")
            .dot(
                v-for="(_, i) in count"
                :key="i"
                class="h-1 rounded-full transition-all duration-200"
                :class="i === index ? 'w-4 bg-white' : (i < index ? 'w-1 bg-white/50' : 'w-1 bg-white/15')"
            )
        .count(class="flex-none font-mono text-2.5 text-neutral-500 leading-none") {{ index + 1 }}/{{ count }}

    .title(class="text-4 leading-tight") {{ step.title }}

    .body(class="text-3 text-neutral-400 leading-snug") {{ step.body }}

    .foot(class="pt-1 flex items-center gap-2")
        button(
            @click="$emit('skip')"
            class="font-mono text-2.75 text-neutral-500 leading-none hover:text-white"
        ) Skip
        .spacer(class="grow")
        button(
            v-if="!isFirst"
            @click="$emit('back')"
            class="h-7 px-3 flex items-center font-mono text-2.75 text-white leading-none bg-neutral-800 rounded-full hover:bg-neutral-700"
        ) Back
        button(
            @click="$emit('next')"
            class="h-7 px-3 flex items-center font-mono text-2.75 text-black leading-none bg-white rounded-full hover:bg-neutral-200"
        ) {{ isLast ? 'Done' : 'Next' }}
</template>
