<script setup>
// Core
import { computed } from 'vue'

// Components
import FilterText from './left-filter-text.vue'

// Stores
import { useState } from '@cardcarp/deckbox/state.js'
import { normalizeOptions, isFiltering, listDefault, toggleDefault } from '@cardcarp/core/composable/search.js'

// UI
import {
    CheckboxIndicator,
    CheckboxRoot,

    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,
    ScrollAreaCorner,

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

    SliderRange,
    SliderRoot,
    SliderThumb,
    SliderTrack,

    SwitchRoot,
    SwitchThumb
} from 'reka-ui'

// Assignments
const { search_active, filter_config, dialog_filter_set, open_filter_set, dialog_filter_multi, open_filter_multi } = useState()

function isActive(key, def) {
    return isFiltering(search_active.value.filter, key, def)
}

const filter_count = computed(() => Object.keys(filter_config.value).length)

const OPTION_LIMIT = 6

function needsDialog(def) {
    if (def?.type !== 'combo' && def?.type !== 'check') return false
    return normalizeOptions(def).length > OPTION_LIMIT
}

function groups(def) {
    const map = new Map()
    for (const opt of normalizeOptions(def)) {
        const g = opt.group || ''
        if (!map.has(g)) map.set(g, [])
        map.get(g).push(opt)
    }
    return [...map.entries()].map(([group, options]) => ({ group, options }))
}

function arr(key, def) {
    const v = search_active.value.filter[key]
    return Array.isArray(v) ? v : listDefault(def)
}

function setArr(key, value) {
    search_active.value.filter[key] = value
}

function toggle(key, def, value, checked) {
    const cur = arr(key, def)
    setArr(key, checked ? [...cur, value] : cur.filter((x) => x !== value))
}

function range(key, def) {
    const v = search_active.value.filter[key]
    return Array.isArray(v) ? v : [def.min ?? 0, def.max ?? 0]
}

function setRange(key, value) {
    search_active.value.filter[key] = value
}

function text(key) {
    const v = search_active.value.filter[key]
    return typeof v === 'string' ? v : ''
}

function setText(key, value) {
    search_active.value.filter[key] = value
}

function bool(key, def) {
    const v = search_active.value.filter[key]
    return typeof v === 'boolean' ? v : toggleDefault(def)
}

function setBool(key, value) {
    search_active.value.filter[key] = value === true
}
</script>

<template lang="pug">
.filter(class="relative pb-10 flex flex-col")

    .divider-dark(class="w-full h-0.5 bg-black/50")
    .divider-light(class="w-full h-px bg-white/5")

    .models(class="px-2 pt-4 flex flex-col gap-4")

        .field(
            v-for="(filter, key, index) in filter_config"
            :key="key"
            class="flex flex-col gap-2"
            :style="[{ zIndex: filter_count - index }]"
        )
            .row(class="relative pl-2 h-10 flex items-center hover:bg-neutral-900 rounded")
                .label(class="flex-1 flex items-center") 
                    span {{ filter.label }}
                    svg(v-show="isActive(key, filter)" class="flex-none ml-1 size-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        circle(cx="12.1" cy="12.1" r="1")

                template(v-if="needsDialog(filter)")
                    .multi-trigger(
                        @click="open_filter_multi(key)"
                        class="group/btn flex-1 min-w-0 px-1 pt-1.25 pb-1 bg-black rounded-lg hover:text-white cursor-pointer"
                        :class="{ 'text-white!': dialog_filter_multi.active && dialog_filter_multi.key === key }"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                        .pill(
                            class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            .icon(class="flex-none size-4")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="M13 5h8")
                                    path(d="M13 12h8")
                                    path(d="M13 19h8")
                                    path(d="m3 17 2 2 4-4")
                                    path(d="m3 7 2 2 4-4")
                            .label(class="grow capitalize truncate") {{ arr(key, filter).length ? `${arr(key, filter).length} selected` : 'Any' }}
                            .chevron(class="w-3 -rotate-90")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="m6 9 6 6 6-6")

                template(v-else-if="filter.type === 'combo'")
                    SelectRoot(
                        :model-value="arr(key, filter)"
                        @update:model-value="setArr(key, $event)"
                        :multiple="true"
                    )
                        SelectTrigger(
                            class="group/btn flex-1 min-w-0 px-1 pt-1.25 pb-1 bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                            style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                        )
                            .pill(
                                class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                                style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                            )
                                .icon(class="flex-none size-4")
                                    svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        template(v-if="filter?.icon")
                                        template(v-else)
                                            path(d="M13 5h8")
                                            path(d="M13 12h8")
                                            path(d="M13 19h8")
                                            path(d="m3 17 2 2 4-4")
                                            path(d="m3 7 2 2 4-4")
                                SelectValue(class="grow capitalize truncate") {{ arr(key, filter).length ? `${arr(key, filter).length} selected` : 'Any' }}
                                .chevron(class="w-3")
                                    svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        path(d="m6 9 6 6 6-6")
                        SelectPortal()
                            SelectContent(
                                side="bottom"
                                position="popper"
                                :sideOffset="-2"
                                class="min-w-(--reka-select-trigger-width) p-1.5 bg-black rounded-b-lg z-50"
                            )
                                .list(
                                    class="w-full max-h-(--reka-select-content-available-height) overflow-hidden p-1.5 text-left text-3 font-light bg-neutral-900 rounded"
                                    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                                )
                                    SelectScrollUpButton(class="flex-none h-5 flex items-center justify-center text-white/40 hover:text-white")
                                        svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="m18 15-6-6-6 6")

                                    SelectViewport(class="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")
                                        SelectGroup(v-for="grp in groups(filter)" :key="grp.group")
                                            SelectLabel(v-if="grp.group" class="px-2 pt-2 pb-1 text-2 uppercase tracking-wide opacity-40") {{ grp.group }}
                                            SelectItem(
                                                v-for="option in grp.options"
                                                :key="option.value"
                                                :value="option.value"
                                                class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white"
                                            )
                                                SelectItemText(class="grow capitalize") {{ option.label }}
                                                svg(v-show="arr(key, filter).includes(option.value)" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                    circle(cx="12.1" cy="12.1" r="1")

                                    SelectScrollDownButton(class="flex-none h-5 flex items-center justify-center text-white/40 hover:text-white")
                                        svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="m6 9 6 6 6-6")

                template(v-else-if="filter.type === 'check'")
                    .options(class="flex flex-col gap-1")
                        template(v-for="grp in groups(filter)" :key="grp.group")
                            .group-label(v-if="grp.group" class="px-1 pt-2 pb-1 text-2 uppercase tracking-wide opacity-40") {{ grp.group }}
                            label(
                                v-for="option in grp.options"
                                :key="option.value"
                                class="h-8 px-1 flex items-center gap-2 rounded hover:bg-neutral-900"
                            )
                                CheckboxRoot(
                                    :model-value="arr(key, filter).includes(option.value)"
                                    @update:model-value="toggle(key, filter, option.value, $event)"
                                    class="p-px flex-none size-5 flex items-center justify-center bg-transparent border-2 border-white"
                                )
                                    CheckboxIndicator(class="size-full bg-white")
                                .text(class="grow capitalize") {{ option.label }}

                template(v-else-if="filter.type === 'slide'")
                    SliderRoot(
                        :model-value="range(key, filter)"
                        @update:model-value="setRange(key, $event)"
                        :min="filter.min ?? 0"
                        :max="filter.max ?? 10"
                        :step="filter.step ?? 1"
                        :minStepsBetweenThumbs="0"
                        class="relative px-2 py-1.75 pb-1.5 flex items-center select-none touch-none w-full bg-black rounded-full"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                        SliderTrack(class="bg-neutral-800 relative grow rounded-full h-1")
                            SliderRange(class="absolute bg-yellow-500 rounded-full h-full")
                        SliderThumb(class="block size-5 bg-white rounded-full outline-none")
                        SliderThumb(class="block size-5 bg-white rounded-full outline-none")

                template(v-else-if="filter.type === 'input'")
                    FilterText(
                        :model-value="text(key)"
                        @update:model-value="setText(key, $event)"
                    )

                template(v-else-if="filter.type === 'toggle'")
                    .value(class="flex-1 pl-2 pr-1 flex items-center justify-end gap-2")
                        .label(class="text-3 capitalize opacity-50") {{ bool(key, filter) ? filter.label_true : filter.label_false }}
                        .switch(
                            class="flex-none relative px-2 py-1.75 pb-1.5 flex items-center select-none touch-none bg-black rounded-full"
                            style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                        )
                            SwitchRoot(
                                :model-value="bool(key, filter)"
                                @update:model-value="setBool(key, $event)"
                                class="w-9 h-5 flex items-center data-[state=unchecked]:bg-white/10 data-[state=checked]:bg-green-950 rounded-full relative transition-color focus-within:outline-none"
                            )
                                SwitchThumb(class="size-5 bg-white rounded-full transition-transform will-change-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-green-500")

                template(v-else-if="filter.type === 'set'")
                    .set-trigger(
                        @click="open_filter_set(key)"
                        class="group/btn flex-1 min-w-0 px-1 pt-1.25 pb-1 bg-black rounded-lg hover:text-white cursor-pointer"
                        :class="{ 'text-white!': dialog_filter_set.active && dialog_filter_set.key === key }"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                        .pill(
                            class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            .icon(class="flex-none size-4")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    <path d="M8 5h13"/>
                                    <path d="M13 12h8"/>
                                    <path d="M13 19h8"/>
                                    <path d="M3 10a2 2 0 0 0 2 2h3"/>
                                    <path d="M3 5v12a2 2 0 0 0 2 2h3"/>
                            .label(class="grow capitalize truncate") {{ arr(key, filter).length ? `${arr(key, filter).length} selected` : 'All' }}
                            .chevron(class="w-3 -rotate-90")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="m6 9 6 6 6-6")

</template>
