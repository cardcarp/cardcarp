<script setup>
// Core
import { computed, ref, shallowRef, watch } from 'vue'

// UI
import {
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionRoot,
    AccordionTrigger,

    CheckboxIndicator,
    CheckboxRoot,

    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectViewport,

    TooltipContent,
    TooltipRoot,
    TooltipTrigger
} from 'reka-ui'
import { Motion } from 'motion-v'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '../core/dialog-scroll.vue'

// Stores
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useSetList } from '@cardcarp/deckbox/composable/set-list.js'
import { useState } from '@cardcarp/deckbox/state.js'
import { listDefault } from '@cardcarp/core/composable/search.js'

// Assignments
const { active_game } = useGameStore()

const set_source = shallowRef(null)
watch(active_game, (name) => {
    set_source.value = name ? useSetList(name) : null
}, { immediate: true })
const { search_active, filter_config, dialog_filter_set } = useState()

const filter_key = computed(() => dialog_filter_set.key ?? 'set_id')

const selected = computed({
    get() {
        const v = search_active.value.filter[filter_key.value]
        return Array.isArray(v) ? v : listDefault(filter_config.value[filter_key.value])
    },
    set(v) {
        search_active.value.filter[filter_key.value] = v
    }
})

function collection_ids(collection) {
    return collection.list.map(s => s.id)
}

function category_ids(category) {
    return category.list.flatMap(c => collection_ids(c))
}

function group_state(ids) {
    const count = ids.filter(id => selected.value.includes(id)).length
    if (!count) return false
    return count === ids.length ? true : 'indeterminate'
}

function toggle_set(id, checked) {
    selected.value = checked
        ? [...selected.value, id]
        : selected.value.filter(x => x !== id)
}

function toggle_group(ids, checked) {
    const rest = selected.value.filter(x => !ids.includes(x))
    selected.value = checked === true ? [...rest, ...ids] : rest
}

function clear() {
    selected.value = []
}

const order = ref('asc')

function ordered(list) {
    return order.value === 'desc' ? [...list].reverse() : list
}

const catalog = computed(() =>
    (set_source.value?.value ?? []).map(category => ({
        ...category,
        list: ordered(category.list).map(collection => {
            const list = ordered(collection.list)
            return { ...collection, list, leaf: list.length === 1 ? list[0] : null }
        })
    }))
)

const all_sets = computed(() => catalog.value.flatMap(c => c.list.flatMap(col => col.list)))

function distinct(property) {
    const values = new Set()
    for (const set of all_sets.value) {
        const v = set[property]
        if (v != null && v !== '') values.add(v)
    }
    return [...values].sort((a, b) => String(a).localeCompare(String(b)))
}

const publisher_option = computed(() => distinct('publisher'))
const type_option = computed(() => distinct('type'))

const publisher = ref([])
const type = ref([])

const faceted = computed(() => publisher.value.length > 0 || type.value.length > 0)

function in_facets(set) {
    if (publisher.value.length && !publisher.value.includes(set.publisher)) return false
    if (type.value.length && !type.value.includes(set.type)) return false
    return true
}

function facet_hint(name, selection) {
    if (!selection.length) return name
    return `${name}: ${selection.length === 1 ? selection[0] : `${selection.length} selected`}`
}

const ORDER_LABEL = { desc: 'Newest first', asc: 'Oldest first' }

const query = ref('')

const tree = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q && !faceted.value) return catalog.value

    const out = []
    for (const category of catalog.value) {
        const kept = []
        for (const collection of category.list) {
            let sets = faceted.value ? collection.list.filter(in_facets) : collection.list
            if (!sets.length) continue

            if (q && !collection.name.toLowerCase().includes(q)) {
                sets = sets.filter(set => set.name.toLowerCase().includes(q))
                if (!sets.length) continue
            }

            kept.push(sets.length === collection.list.length ? collection : { ...collection, list: sets })
        }
        if (kept.length) out.push({ ...category, list: kept })
    }
    return out
})

const no_results = computed(() => (!!query.value.trim() || faceted.value) && !tree.value.length)

function clear_view() {
    query.value = ''
    publisher.value = []
    type.value = []
}

const open_category = ref([])
const open_collection = ref([])

let before_search = null

watch([tree, query], () => {
    if (query.value.trim()) {
        if (!before_search) {
            before_search = {
                category: [...open_category.value],
                collection: [...open_collection.value]
            }
        }

        const category = tree.value.map(c => c.type)
        const collection = tree.value.flatMap(c => c.list.filter(x => !x.leaf).map(x => x.id))

        open_category.value = [...new Set([...open_category.value, ...category])]
        open_collection.value = [...new Set([...open_collection.value, ...collection])]
        return
    }

    if (before_search) {
        open_category.value = before_search.category
        open_collection.value = before_search.collection
        before_search = null
    }
})

watch(() => dialog_filter_set.active, (open) => {
    if (!open) return
    clear_view()
    open_category.value = []
    open_collection.value = []
    before_search = null
})

function close() {
    dialog_filter_set.active = false
}


</script>

<template lang="pug">
DialogShell(
    :open="dialog_filter_set.active"
    width="w-160"
    title="Filter sets"
    description="Choose which sets the search includes."
    @close="close"
)
    .head(
        autofocus
        tabindex="-1"
        class="relative z-20 flex-none pl-4 pr-2.5 pt-2 pb-3 flex items-center gap-4 font-mono text-3 leading-none bg-linear-to-br to-neutral-950 from-neutral-900 rounded-t-xl outline-none"
        style="box-shadow: inset 0 -1px 0 0 hsl(0 0 12), inset 0 -3px 0 0 hsl(0 0 0)"
    )
        .title(class="px-2 flex items-end gap-2 text-5 text-white font-sans font-light leading-none")
            svg(class="relative size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M8 5h13")
                path(d="M13 12h8")
                path(d="M13 19h8")
                path(d="M3 10a2 2 0 0 0 2 2h3")
                path(d="M3 5v12a2 2 0 0 0 2 2h3")
            span Sets

        .controls(class="flex-1 min-w-0 flex flex-wrap items-center gap-2")

            .field(
                class="group/textarea relative mr-1 h-11 flex-1 min-w-40 flex flex-col bg-neutral-950 rounded-lg"
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
                    :placeholder="`Search Sets…`"
                    class="absolute inset-0 size-full p-4 pl-9 text-3 text-white/50 font-mono leading-relaxed bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
                )

            .facet(v-if="publisher_option.length > 1" class="flex-none")
                SelectRoot(
                    :model-value="publisher"
                    @update:model-value="publisher = $event"
                    :multiple="true"
                )

                    SelectTrigger(
                        aria-label="Publisher"
                        class="relative group/btn flex-none size-11 p-1 flex items-center justify-center bg-black rounded-lg"
                        :class="publisher.length ? 'text-yellow-500' : 'text-white/50 hover:text-white data-[state=open]:text-white'"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                
                        TooltipRoot(:delayDuration="100")
                            TooltipTrigger(asChild)
                                .pill(
                                    class="relative size-full flex items-center justify-center bg-linear-to-b to-neutral-900 from-neutral-800 rounded group-data-[state=open]/btn:rounded-b-none"
                                    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                                )
                                    svg(class="flex-none size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        path(d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z")
                                        path(d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2")
                                        path(d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2")
                                        path(d="M10 6h4")
                                        path(d="M10 10h4")
                                        path(d="M10 14h4")

                            TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                                Motion(
                                    :initial="{ opacity: 0, scale: 0 }"
                                    :animate="{ opacity: 1, scale: 1 }"
                                    class="px-2 py-1.5 text-white bg-black/80 leading-none rounded-full pointer-events-none z-30"
                                )
                                    .text(class="text-3 whitespace-nowrap") {{ facet_hint('Publisher', publisher) }}

                    SelectPortal(disabled)
                        SelectContent(
                            side="bottom"
                            align="end"
                            position="popper"
                            :sideOffset="0"
                            class="min-w-40 p-1.5 bg-linear-to-br to-zinc-900 from-zinc-800 rounded-lg z-50"
                            style="box-shadow: inset 0 0 0 3px black, 0 0 10px 0 hsl(0 0 0 / 0.5)"
                        )
                            .list(
                                class="w-full max-h-(--reka-select-content-available-height) overflow-hidden p-1.5 text-left text-3 font-light text-white/50 rounded"

                            )
                                SelectViewport(class="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")
                                    SelectItem(
                                        v-for="option in publisher_option"
                                        :key="option"
                                        :value="option"
                                        class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white"
                                    )
                                        SelectItemText(class="grow capitalize truncate") {{ option }}
                                        svg(v-show="publisher.includes(option)" class="flex-none size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            circle(cx="12.1" cy="12.1" r="1")

            .facet(v-if="type_option.length > 1" class="flex-none")
                SelectRoot(
                    :model-value="type"
                    @update:model-value="type = $event"
                    :multiple="true"
                )

                    SelectTrigger(
                        aria-label="Type"
                        class="relative group/btn flex-none size-11 p-1 flex items-center justify-center bg-black rounded-lg"
                        :class="type.length ? 'text-yellow-500' : 'text-white/50 hover:text-white data-[state=open]:text-white'"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                
                        TooltipRoot(:delayDuration="100")
                            TooltipTrigger(asChild)
                                .pill(
                                    class="relative size-full flex items-center justify-center bg-linear-to-b to-neutral-900 from-neutral-800 rounded group-data-[state=open]/btn:rounded-b-none"
                                    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                                )
                                    svg(class="flex-none size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        path(d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z")
                                        circle(cx="7.5" cy="7.5" r=".5" fill="currentColor")

                            TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                                Motion(
                                    :initial="{ opacity: 0, scale: 0 }"
                                    :animate="{ opacity: 1, scale: 1 }"
                                    class="px-2 py-1.5 text-white bg-black/80 leading-none rounded-full pointer-events-none z-30"
                                )
                                    .text(class="text-3 whitespace-nowrap") {{ facet_hint('Type', type) }}

                    SelectPortal(disabled)
                        SelectContent(
                            side="bottom"
                            align="end"
                            position="popper"
                            :sideOffset="0"
                            class="min-w-40 p-1.5 bg-linear-to-br to-zinc-900 from-zinc-800 rounded-lg z-50"
                            style="box-shadow: inset 0 0 0 3px black, 0 0 10px 0 hsl(0 0 0 / 0.5)"
                        )
                            .list(
                                class="w-full max-h-(--reka-select-content-available-height) overflow-hidden p-1.5 text-left text-3 font-light text-white/50 rounded"

                            )
                                SelectViewport(class="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")
                                    SelectItem(
                                        v-for="option in type_option"
                                        :key="option"
                                        :value="option"
                                        class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white"
                                    )
                                        SelectItemText(class="grow capitalize truncate") {{ option }}
                                        svg(v-show="type.includes(option)" class="flex-none size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            circle(cx="12.1" cy="12.1" r="1")

            .facet(class="flex-none")
                SelectRoot(v-model="order")

                    SelectTrigger(
                        aria-label="Order"
                        class="relative group/btn flex-none size-11 p-1 flex items-center justify-center bg-black rounded-lg text-white/50 hover:text-white data-[state=open]:text-white"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                
                        TooltipRoot(:delayDuration="100")
                            TooltipTrigger(asChild)
                                .pill(
                                    class="relative size-full flex items-center justify-center bg-linear-to-b to-neutral-900 from-neutral-800 rounded group-data-[state=open]/btn:rounded-b-none"
                                    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                                )
                                    svg(class="flex-none size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        template(v-if="order === 'asc'")
                                            path(d="m3 16 4 4 4-4")
                                            path(d="M7 20V4")
                                            path(d="M20 8h-5")
                                            path(d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10")
                                            path(d="M15 14h5l-5 6h5")
                                        template(v-else)
                                            path(d="m3 16 4 4 4-4")
                                            path(d="M7 4v16")
                                            path(d="M15 4h5l-5 6h5")
                                            path(d="M15 20v-3.5a2.5 2.5 0 0 1 5 0V20")
                                            path(d="M20 18h-5")

                            TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                                Motion(
                                    :initial="{ opacity: 0, scale: 0 }"
                                    :animate="{ opacity: 1, scale: 1 }"
                                    class="px-2 py-1.5 text-white bg-black/80 leading-none rounded-full pointer-events-none z-30"
                                )
                                    .text(class="text-3 whitespace-nowrap") Order: {{ ORDER_LABEL[order] }}

                    SelectPortal(disabled)
                        SelectContent(
                            side="bottom"
                            align="end"
                            position="popper"
                            :sideOffset="0"
                            class="min-w-40 p-1.5 bg-linear-to-br to-zinc-900 from-zinc-800 rounded-lg z-50"
                            style="box-shadow: inset 0 0 0 3px black, 0 0 10px 0 hsl(0 0 0 / 0.5)"
                        )
                            .list(
                                class="w-full max-h-(--reka-select-content-available-height) overflow-hidden p-1.5 text-left text-3 font-light text-white/50 rounded"

                            )
                                SelectViewport(class="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")
                                    SelectItem(
                                        v-for="(text, value) in ORDER_LABEL"
                                        :key="value"
                                        :value="value"
                                        class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white"
                                    )
                                        SelectItemText(class="grow truncate") {{ text }}
                                        svg(v-show="order === value" class="flex-none size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            circle(cx="12.1" cy="12.1" r="1")

    DialogScroll(
        rootClass="px-4 pt-4 font-mono text-3 leading-none bg-linear-to-br to-zinc-950 from-zinc-900"
        type="always"
        rounding="rounding-none"
    )
        .empty(
            v-if="no_results"
            class="py-16 flex flex-col items-center justify-center gap-3 text-center"
        )
            .title(v-if="query.trim()" class="text-white/50") No sets match “{{ query.trim() }}”
            .title(v-else class="text-white/50") No sets match these filters
            .btn(
                @click="clear_view"
                class="px-5 py-2 text-white/50 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded-full cursor-pointer"
                style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
            ) CLEAR FILTERS

        AccordionRoot(
            v-else
            v-model="open_category"
            :collapsible="true"
            type="multiple"
            class="flex flex-col"
        )
            AccordionItem(
                v-for="category in tree"
                :key="category.type"
                :value="category.type"
                class="group/category"
            )
                AccordionHeader(asChild)
                    AccordionTrigger(
                        class="pl-1 pr-2 py-4 w-full flex items-center gap-3 hover:bg-yellow-500/5 rounded"
                    )
                        svg(class="flex-none relative size-4 transition-transform -rotate-90 group-data-[state=open]/category:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="m6 9 6 6 6-6")
                        CheckboxRoot(
                            v-slot="{ state }"
                            :model-value="group_state(category_ids(category))"
                            @update:model-value="toggle_group(category_ids(category), $event === true)"
                            @click.stop
                            class="p-0.5 flex-none size-6 flex items-center justify-center rounded bg-transparent"
                            style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                        )
                            CheckboxIndicator()
                                svg(v-if="state === 'indeterminate'" class="flex-none size-3 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round")
                                    path(d="M5 12h14")
                                svg(v-else class="flex-none size-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="M20 6 9 17l-5-5")

                        .name(class="flex items-center gap-2 text-white text-left truncate capitalize") {{ category.type }}
                        .line(class="relative grow border border-dashed opacity-10")
                        .count(class="text-white opacity-40")
                            span() {{ category.card_total }}

                AccordionContent(class="relative pl-8 pb-8 w-full")

                    AccordionRoot(
                        v-model="open_collection" 
                        :collapsible="true" 
                        type="multiple" 
                        class="flex flex-col"
                    )
                        template(v-for="collection in category.list" :key="collection.id")
                            .expansion(
                                v-if="collection.leaf"
                                @click="toggle_set(collection.leaf.id, !selected.includes(collection.leaf.id))"
                                class="group/expansion relative pl-8 pr-2 py-4 w-full flex items-center gap-3 hover:bg-yellow-500/5 rounded"
                            )
                                CheckboxRoot(
                                    :model-value="selected.includes(collection.leaf.id)"
                                    @update:model-value="toggle_set(collection.leaf.id, $event)"
                                    @click.stop
                                    class="p-0.5 flex-none size-6 flex items-center justify-center rounded bg-transparent"
                                    style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                                )
                                    CheckboxIndicator()
                                        svg(class="flex-none size-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="M20 6 9 17l-5-5")

                                .name(class="text-slate-400 text-left truncate") {{ collection.leaf.name }}
                                .line(class="relative grow border border-slate-500 border-dashed opacity-10")
                                .count(class="text-white opacity-40") {{ collection.leaf.card_total }}

                            AccordionItem(
                                v-else
                                :value="collection.id"
                                class="group/set"
                            )
                                AccordionHeader(asChild)
                                    AccordionTrigger(
                                        class="pl-1 pr-2 py-4 w-full flex items-center gap-3 hover:bg-yellow-500/5 rounded"
                                    )
                                        svg(class="flex-none relative size-4 transition-transform -rotate-90 group-data-[state=open]/set:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="m6 9 6 6 6-6")

                                        CheckboxRoot(
                                            v-slot="{ state }"
                                            :model-value="group_state(collection_ids(collection))"
                                            @update:model-value="toggle_group(collection_ids(collection), $event === true)"
                                            @click.stop
                                            class="p-0.5 flex-none size-6 flex items-center justify-center rounded bg-transparent"
                                            style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                                        )
                                            CheckboxIndicator()
                                                svg(v-if="state === 'indeterminate'" class="flex-none size-3 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round")
                                                    path(d="M5 12h14")
                                                svg(v-else class="flex-none size-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round")
                                                    path(d="M20 6 9 17l-5-5")

                                        .name(class="text-slate-400 text-left truncate") {{ collection.name }}
                                        .line(class="relative grow border border-slate-500 border-dashed opacity-10")
                                        .count(class="text-white opacity-40")
                                            span() {{ collection.card_total }}

                                AccordionContent(class="relative pl-13 pb-8 w-full")

                                    .expansion(
                                        v-for="set in collection.list"
                                        :key="set.id"
                                        @click="toggle_set(set.id, !selected.includes(set.id))"
                                        class="group/expansion relative pl-4 pr-2 py-4 w-full flex items-center gap-3 hover:bg-yellow-500/5 rounded"
                                    )

                                        CheckboxRoot(
                                            :model-value="selected.includes(set.id)"
                                            @update:model-value="toggle_set(set.id, $event)"
                                            @click.stop
                                            class="p-0.5 flex-none size-6 flex items-center justify-center rounded bg-transparent"
                                            style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
                                        )
                                            CheckboxIndicator()
                                                svg(class="flex-none size-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round")
                                                    path(d="M20 6 9 17l-5-5")

                                        .name(class="text-taupe-500 text-left truncate") {{ set.name }}
                                        .line(class="relative grow border border-taupe-500 border-dashed opacity-10")
                                        .count(class="text-white opacity-40") {{ set.card_total }}

        .space(class="w-full h-10")

    .foot(
        class="flex-none px-4 pt-3.5 pb-3 flex items-center gap-3 font-mono text-3 leading-none bg-linear-to-br to-neutral-950 from-neutral-900 rounded-b-xl"
        style="box-shadow: inset 0 2px 0 0 hsl(0 0 0), inset 0 3px 0 0 hsl(0 0 16)"
    )
        .count(class="grow pl-2 opacity-50") {{ selected.length ? `${selected.length} selected` : 'All sets' }}
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
