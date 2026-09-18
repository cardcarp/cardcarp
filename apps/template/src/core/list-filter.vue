<script setup>
// UI
import {
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectItemText,
    SelectLabel,
    SelectPortal,
    SelectRoot,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectTrigger,
    SelectValue,
    SelectViewport,
} from 'reka-ui'

import { computed } from 'vue'

const props = defineProps({
    label: { type: String, required: true },
    options: { type: Array, default: () => [] },
})

const selected = defineModel({ type: Array, default: () => [] })

const groups = computed(() => {
    const map = new Map()
    for (const option of props.options) {
        const group = option.group || ''
        if (!map.has(group)) map.set(group, [])
        map.get(group).push(option)
    }
    return [...map.entries()].map(([group, options]) => ({ group, options }))
})


</script>

<template lang="pug">
SelectRoot(v-model="selected" :multiple="true")
    SelectTrigger(
        :aria-label="label"
        class="group/btn flex-none size-8 min-w-0 flex items-center justify-center rounded bg-black outline outline-neutral-800"
        :class="selected.length ? 'text-yellow-500' : 'text-white/50 hover:text-white data-[state=open]:text-white'"

    )
        .icon(class="flex-none size-4")
            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M14 17H5")
                path(d="M19 7h-9")
                circle(cx="17" cy="17" r="3")
                circle(cx="7" cy="7" r="3")

    SelectPortal
        SelectContent(
            side="right"
            align="top"
            position="popper"
            :sideOffset="8"
            :alignOffset="-1"
            class="group/list p-1.5 bg-zinc-950 text-3.25 rounded-lg z-102"
            style="box-shadow: inset 0 0 0 1px hsl(0 0 20)"
        )
            SelectScrollUpButton(class="flex-none h-5 flex items-center justify-center text-white/40 hover:text-white")
                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="m18 15-6-6-6 6")

            SelectViewport(class="flex-1 min-h-0 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden")
                SelectGroup(v-for="group in groups" :key="group.group")
                    SelectLabel(v-if="group.group" class="px-2 pt-2 pb-1 text-2 uppercase tracking-wide opacity-40") {{ group.group }}
                    SelectItem(
                        v-for="option in group.options"
                        :key="option.value"
                        :value="option.value"
                        class="pl-1.5 pr-6 min-w-24 h-6.5 flex items-center gap-2 rounded-sm hover:bg-slate-800! hover:text-white first:bg-slate-800 first:group-hover/list:bg-transparent"
                    )
                        SelectItemText(class="grow capitalize truncate") {{ option.label }}
                        svg(
                            v-show="selected.includes(option.value)" 
                            class="absolute right-0 flex-none size-5 text-white" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            stroke-width="2" 
                            stroke-linecap="round" 
                            stroke-linejoin="round"
                        )
                            circle(cx="12.1" cy="12.1" r="1")

            SelectScrollDownButton(class="flex-none h-5 flex items-center justify-center text-white/40 hover:text-white")
                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="m6 9 6 6 6-6")
</template>
