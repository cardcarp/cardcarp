<script setup>
// The long multi-select picker — the combo/check filters whose option list
// overflows the left panel. mtg ships 684 themes and 871 keywords; both used to
// render as a dropdown taller than the window with no way to search it.
//
// Same shape as dialog-filter-set.vue: a centred dialog, a search field, and
// selections that write straight through to the active dataset's filter state
// (no draft), so results update behind the overlay and close needs no prompt.
// The trigger, and the option count that earns one, live in left-filter.vue.

// Core
import { computed, ref, watch } from 'vue'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '@cardcarp/core/part/dialog-scroll.vue'

// Stores
import { useState } from './state.js'
import { listDefault, normalizeOptions } from '@cardcarp/core/composable/search.js'

// Assignments
const { search_active, filter_config, dialog_filter_multi } = useState()

// The filter this dialog is editing (key-is-property: theme, keyword, ...).
const filter_key = computed(() => dialog_filter_multi.key)
const filter = computed(() => filter_config.value[filter_key.value] ?? {})

// --- Selection --------------------------------------------------------------
// Untouched, the filter reads its config default — same accessor the inline
// controls use, so opening the dialog never seeds state.
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

// Checking a group selects all of its options; unchecking clears them. A click
// on an indeterminate box emits true -> select all.
function toggle_group(values, checked) {
    const rest = selected.value.filter(x => !values.includes(x))
    selected.value = checked ? [...rest, ...values] : rest
}

// true | false | 'indeterminate' for a group of values
function group_state(values) {
    const count = values.filter(v => selected.value.includes(v)).length
    if (!count) return false
    return count === values.length ? true : 'indeterminate'
}

// Back to "Any" — an empty selection filters nothing.
function clear() {
    selected.value = []
}

// --- Options ----------------------------------------------------------------
const options = computed(() => normalizeOptions(filter.value))

// Whether the manifest authored groups for this filter. Authored groups get a
// select-all header; the initial-letter buckets below don't — "select every
// theme starting with A" isn't a thing anyone means.
const grouped = computed(() => options.value.some(o => o.group))

// Below this a flat list is short enough to take in at a glance, so the letter
// headers would be more furniture than help.
const LETTER_MIN = 24

const query = ref('')

const matches = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return options.value
    return options.value.filter(o => o.label.toLowerCase().includes(q))
})

// Sections are the authored groups when there are any. Otherwise a flat list
// long enough to scroll gets initial-letter headers, which is the only
// landmark a single sorted column of 684 names has to offer.
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

    // Authored groups keep the order the manifest put them in. Letter buckets
    // are sorted, so an option list that isn't alphabetical can't produce
    // headers that run A, C, B ('#' sorts ahead of A, which is where the
    // "... Catch" end of mtg's keywords belongs).
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

// Every open starts at the top with no leftover query.
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
    //- `autofocus` (honoured by DialogShell) parks the opening focus here
    //- instead of on the search field, so phones don't pop the keyboard.
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
        //- ---- Empty state: query matched nothing ----------------------------
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

        //- ---- Options ------------------------------------------------------
        //- Two columns from `sm` up: the rows are one line of text each, and a
        //- single column of 684 of them is a needlessly long scroll. CSS
        //- columns rather than a grid so each section stays alphabetical read
        //- *down* a column, the way a list of names is scanned.
        template(v-else)
            .section(v-for="section in sections" :key="section.label")

                //- Authored group: a header that selects the whole group.
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

                //- Initial-letter bucket: a landmark, not a control.
                .letter(
                    v-else-if="section.label"
                    class="sticky top-0 pl-1 pr-2 py-2 flex items-center gap-3 text-white/60 bg-zinc-950/95 backdrop-blur-xs z-10"
                )
                    .name(class="w-6 text-center") {{ section.label }}
                    .line(class="relative grow border border-dashed opacity-10")

                //- Rows are the control themselves (role="checkbox") rather than
                //- a checkbox inside a clickable row — one element per option,
                //- which keeps a 871-row list cheap to mount.
                //-
                //- `capitalize` only where the label *is* the value (an option
                //- authored as a bare list, which can arrive as "instant"). A
                //- manifest that authored value -> label wrote the display name
                //- it wanted, and capitalizing turns "Born of the Gods" into
                //- "Born Of The Gods".
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
