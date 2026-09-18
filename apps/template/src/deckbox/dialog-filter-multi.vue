<script setup>
// Core
import { computed, ref, watch } from 'vue'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '../core/dialog-scroll.vue'

// Stores
import { useState } from '@cardcarp/deckbox/state.js'
import { listDefault, normalizeOptions } from '@cardcarp/core/composable/search.js'

// Assignments
const { search_active, filter_config, dialog_filter_multi } = useState()

const filter_key = computed(() => dialog_filter_multi.key)
const filter = computed(() => filter_config.value[filter_key.value] ?? {})

const selected = computed({
    get() {
        const v = search_active.value.filter[filter_key.value]
        return Array.isArray(v) ? v : listDefault(filter.value)
    },
    set(v) {
        search_active.value.filter[filter_key.value] = v
    }
})

function toggle(value, checked) {
    selected.value = checked
        ? [...selected.value, value]
        : selected.value.filter(x => x !== value)
}

function toggle_group(values, checked) {
    const rest = selected.value.filter(x => !values.includes(x))
    selected.value = checked ? [...rest, ...values] : rest
}

function group_state(values) {
    const count = values.filter(v => selected.value.includes(v)).length
    if (!count) return false
    return count === values.length ? true : 'indeterminate'
}

function clear() {
    selected.value = []
}

const options = computed(() => normalizeOptions(filter.value))

const grouped = computed(() => options.value.some(o => o.group))

const LETTER_MIN = 24

const query = ref('')

const matches = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return options.value
    return options.value.filter(o => o.label.toLowerCase().includes(q))
})

const sections = computed(() => {
    const list = matches.value
    if (!grouped.value && list.length <= LETTER_MIN) {
        return list.length ? [{ label: '', group: false, options: list }] : []
    }

    const map = new Map()
    for (const option of list) {
        const label = grouped.value ? (option.group || '') : initial(option.label)
        if (!map.has(label)) map.set(label, [])
        map.get(label).push(option)
    }
    const out = [...map.entries()].map(([label, options]) => ({ label, group: grouped.value, options }))

    return grouped.value ? out : out.sort((a, b) => a.label.localeCompare(b.label))
})

function initial(label) {
    const c = String(label).trim().charAt(0).toUpperCase()
    return /[A-Z]/.test(c) ? c : '#'
}

const no_results = computed(() => !!query.value.trim() && !matches.value.length)

function values_of(section) {
    return section.options.map(o => o.value)
}

watch(() => dialog_filter_multi.active, (open) => {
    if (open) query.value = ''
})

function close() {
    dialog_filter_multi.active = false
}
</script>

<template lang="pug">
DialogShell(
    :open="dialog_filter_multi.active"
    width="w-160"
    :title="`Filter ${filter.label ?? ''}`"
    :description="`Choose which ${filter.label ?? 'values'} the search includes.`"
    @close="close"
)
    .head(
        autofocus
        tabindex="-1"
        class="flex-none pl-4 pr-2.5 pt-2 pb-3 flex items-center gap-6 font-mono text-3 leading-none bg-linear-to-br to-neutral-950 from-neutral-900 rounded-t-xl outline-none"
        style="box-shadow: inset 0 -1px 0 0 hsl(0 0 12), inset 0 -3px 0 0 hsl(0 0 0)"
    )
        .title(class="px-2 flex items-end gap-2 text-5 text-white font-sans font-light leading-none capitalize")
            svg(class="relative size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M13 5h8")
                path(d="M13 12h8")
                path(d="M13 19h8")
                path(d="m3 17 2 2 4-4")
                path(d="m3 7 2 2 4-4")
            span {{ filter.label }}

        .field(
            class="group/textarea relative flex-1 h-11 flex flex-col bg-neutral-950 rounded-lg"
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
            svg(class="absolute top-2.5 left-2 size-5 text-white opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="m21 21-4.34-4.34")
                circle(cx="11" cy="11" r="8")
            input(
                v-model="query"
                type="text"
                spellcheck="false"
                :placeholder="`Search ${filter.label ?? ''}…`"
                class="absolute inset-0 size-full p-4 pl-9 text-3 text-white/50 font-mono leading-relaxed bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
            )

    DialogScroll(
        rootClass="px-4 pt-2 font-mono text-3 leading-none bg-linear-to-br to-zinc-950 from-zinc-900"
        type="auto"
        rounding="rounding-none"
    )
        .empty(
            v-if="no_results"
            class="py-16 flex flex-col items-center justify-center gap-3 text-center"
        )
            .title(class="text-white/50") No options match “{{ query.trim() }}”
            .btn(
                @click="query = ''"
                class="px-5 py-2 text-white/50 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded-full cursor-pointer"
                style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
            ) CLEAR SEARCH

        template(v-else)
            .section(v-for="section in sections" :key="section.label")

                .group(
                    v-if="section.label && section.group"
                    @click="toggle_group(values_of(section), group_state(values_of(section)) !== true)"
                    class="sticky top-0 pl-1 pr-2 py-3 flex items-center gap-3 bg-zinc-950/95 backdrop-blur-xs cursor-pointer z-10"
                )
                    .box(
                        class="p-0.5 flex-none size-6 flex items-center justify-center rounded bg-transparent"
                        style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                    )
                        svg(v-if="group_state(values_of(section)) === true" class="flex-none size-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M20 6 9 17l-5-5")
                        svg(v-else-if="group_state(values_of(section)) === 'indeterminate'" class="flex-none size-3 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round")
                            path(d="M5 12h14")
                    .name(class="text-white text-left truncate capitalize") {{ section.label }}
                    .line(class="relative grow border border-dashed opacity-10")
                    .count(class="text-white opacity-40") {{ section.options.length }}

                .letter(
                    v-else-if="section.label"
                    class="sticky top-0 pl-1 pr-2 py-2 flex items-center gap-3 text-white/60 bg-zinc-950/95 backdrop-blur-xs z-10"
                )
                    .name(class="w-6 text-center") {{ section.label }}
                    .line(class="relative grow border border-dashed opacity-10")

                .options(class="pb-4 columns-1 sm:columns-2 gap-x-4")
                    .option(
                        v-for="option in section.options"
                        :key="option.value"
                        role="checkbox"
                        tabindex="0"
                        :aria-checked="selected.includes(option.value)"
                        :title="option.label"
                        @click="toggle(option.value, !selected.includes(option.value))"
                        @keydown.enter.prevent="toggle(option.value, !selected.includes(option.value))"
                        @keydown.space.prevent="toggle(option.value, !selected.includes(option.value))"
                        class="pl-4 pr-2 py-2.5 flex items-center gap-3 break-inside-avoid hover:bg-yellow-500/5 rounded outline-none focus-visible:bg-yellow-500/10 cursor-pointer"
                    )
                        .box(
                            class="p-0.5 flex-none size-6 flex items-center justify-center rounded bg-transparent"
                            style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                        )
                            svg(v-show="selected.includes(option.value)" class="flex-none size-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M20 6 9 17l-5-5")
                        .name(
                            :class="option.label === option.value ? 'capitalize' : ''"
                            class="text-slate-400 text-left truncate"
                        ) {{ option.label }}

        .space(class="w-full h-10")

    .foot(
        class="flex-none px-4 pt-3.5 pb-3 flex items-center gap-3 font-mono text-3 leading-none bg-linear-to-br to-neutral-950 from-neutral-900 rounded-b-xl"
        style="box-shadow: inset 0 2px 0 0 hsl(0 0 0), inset 0 3px 0 0 hsl(0 0 16)"
    )
        .count(class="grow pl-2 opacity-50") {{ selected.length ? `${selected.length} selected` : 'Any' }}
        .btn(
            @click="clear"
            :class="selected.length ? 'text-white/50 hover:text-white hover:bg-neutral-600' : 'text-white/20 pointer-events-none'"
            class="px-5 py-2 rounded-full bg-neutral-700"
            style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
        ) CLEAR
        .btn(
            @click="close"
            class="px-5 py-2 text-white rounded-full bg-green-900 hover:bg-green-800"
            style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.15), 0 2px 2px 0 hsl(0 0 0)"
        ) DONE
</template>
