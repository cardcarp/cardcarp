<script setup>
import { ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

const props = defineProps({
    modelValue: { type: String, default: '' },
    debounce: { type: Number, default: 250 },
})

const emit = defineEmits(['update:modelValue'])

const local = ref(props.modelValue)

watch(
    () => props.modelValue,
    (v) => { if (v !== local.value) local.value = v }
)

watchDebounced(
    local,
    (v) => { if (v !== props.modelValue) emit('update:modelValue', v) },
    { debounce: () => props.debounce }
)
</script>

<template lang="pug">
.field(
    class="group/textarea relative flex-1 h-9 flex flex-col bg-neutral-950 rounded-lg"
)
    .d(
        class="absolute inset-0 size-full rounded-lg"
        style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
    )
    .h(
        class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-0! group-hover/textarea:opacity-15 transition-opacity duration-500"
        style="box-shadow: inset 0 0 0 1px hsl(0 0 100), inset 0 0 20px 0 hsl(0 0 100 / 0.10)"
    )
    .f(
        class="absolute inset-0 size-full rounded-lg opacity-0 group-focus-within/textarea:opacity-50 transition-opacity duration-800"
        style="box-shadow: inset 0 0 0 1px hsl(45 100 45), inset 0 0 20px 0 hsl(45 100 45 / 0.10)"
    )
    input(
        v-model="local"
        type="text"
        spellcheck="false"
        :placeholder="`Search…`"
        class="absolute inset-0 size-full px-2 py-4 text-3 text-white/50 font-mono leading-relaxed bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
    )
</template>
