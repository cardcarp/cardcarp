<script setup>
import { computed, onMounted, ref, watch } from 'vue'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,
    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport
} from 'reka-ui'

import Card from '@/view/home/card.vue'
import { items as sourceItems, linkProps } from '@/view/home/sources.js'

const title = 'Examples'

const items = computed(() => sourceItems())

function scrub(field) {
    const out = {}
    for (const item of items.value)
        for (const value of item[field] ?? [])
            out[value] ??= { label: value }
    return Object.fromEntries(
        Object.entries(out).sort(([a], [b]) => a.localeCompare(b))
    )
}
const option_category = ref([])
const option_category_list = computed(() => scrub('category'))
const option_tag = ref([])
const option_tag_list = computed(() => scrub('tag'))

const query = ref('')

onMounted(() => {
    query.value = new URLSearchParams(window.location.search).get('q') ?? ''

    watch(query, (value) => {
        const url = new URL(window.location.href)
        if (value) url.searchParams.set('q', value)
        else url.searchParams.delete('q')
        window.history.replaceState(window.history.state, '', url)
    })
})

const results = computed(() => {
    const q = query.value.trim().toLowerCase()
    const cats = option_category.value
    const tags = option_tag.value
    return items.value.filter((item) => {
        if (q && !item.name.toLowerCase().includes(q)) return false
        if (cats.length && !(item.category ?? []).some((c) => cats.includes(c))) return false
        if (tags.length && !(item.tag ?? []).some((t) => tags.includes(t))) return false
        return true
    })
})
</script>

<template lang="pug">
ScrollAreaRoot(
    class="group/scroll relative flex-1 min-w-0 min-h-0 flex flex-col z-10 bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl"
    type="auto"
    style="--reka-scroll-area-thumb-width: 4px; box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
)
    ScrollAreaViewport(class="relative flex-1 min-h-0 w-full")
        .header(class="h-15 flex items-center gap-20")
            .title(class="flex-none px-6 flex items-end gap-3 leading-none")

                svg(class="relative size-6 text-purple-400 mask-b-from-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="m16 6 4 14")
                    path(d="M12 6v14")
                    path(d="M8 8v12")
                    path(d="M4 4v16")

                span(class="relative top-px text-4 text-white font-bold font-stretch-expanded") {{ title }}
            .graphic(class="relative grow h-full flex items-end")
                svg(class="absolute right-full bottom-0" width="62" height="63" viewBox="0 0 62 63" fill="none")
                    path(class="stroke-neutral-800" stroke-width="2" transform="translate(0 1)" d="M1.86 1L28.74 46.31C34.15 55.42 43.95 61 54.54 61H62")
                    path(class="stroke-black" stroke-width="2" d="M1.86 1L28.74 46.31C34.15 55.42 43.95 61 54.54 61H62")
                .dividers(class="relative size-full flex flex-col justify-end z-1")
                    .divider-dark(class="w-full h-0.5 bg-black")
                    .divider-light(class="w-full h-px bg-neutral-800")

        .section(class="mt-6 px-6 flex flex-col md:flex-row gap-2")
            SelectRoot(
                v-model="option_category"
                :multiple="true"
            )
                SelectTrigger(
                    class="group/btn p-1.5 pb-1.25 w-full md:max-w-60 bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    .pill(
                        class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                        style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                    )
                        .icon(class="flex-none size-4")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m3 16 4 4 4-4")
                                path(d="M7 20V4")
                                path(d="m21 8-4-4-4 4")
                                path(d="M17 4v16")
                        SelectValue(class="grow capitalize truncate") {{ option_category.length ? option_category.join(', ') : 'Category' }}
                        .chevron(class="w-3")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m6 9 6 6 6-6")

                SelectPortal
                    SelectContent(
                        side="bottom" 
                        position="popper" 
                        :sideOffset="-2"
                        class="min-w-(--reka-select-trigger-width) p-1.5 bg-black rounded-b-lg z-102"
                    )
                        SelectViewport(
                            class="w-full h-full px-2 py-2 text-left text-3 font-light bg-neutral-900 rounded"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            SelectItem(v-for="(item, key) in option_category_list" :value="key" class="px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                SelectItemText(class="grow capitalize") {{ item.label }}
                                svg(v-show="option_category.includes(key)" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    circle(cx="12.1" cy="12.1" r="1")

            SelectRoot(
                v-model="option_tag"
                :multiple="true"
            )
                SelectTrigger(
                    class="group/btn p-1.5 pb-1.25 w-full md:max-w-60 bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    .pill(
                        class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                        style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                    )
                        .icon(class="flex-none size-4")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m3 16 4 4 4-4")
                                path(d="M7 20V4")
                                path(d="m21 8-4-4-4 4")
                                path(d="M17 4v16")
                        SelectValue(class="grow capitalize truncate") {{ option_tag.length ? option_tag.join(', ') : 'Tag' }}
                        .chevron(class="w-3")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m6 9 6 6 6-6")

                SelectPortal
                    SelectContent(
                        side="bottom" 
                        position="popper" 
                        :sideOffset="-2"
                        class="min-w-(--reka-select-trigger-width) p-1.5 bg-black rounded-b-lg z-102"
                    )
                        SelectViewport(
                            class="w-full h-full px-2 py-2 text-left text-3 font-light bg-neutral-900 rounded"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            SelectItem(v-for="(item, key) in option_tag_list" :value="key" class="px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                SelectItemText(class="grow capitalize") {{ item.label }}
                                svg(v-show="option_tag.includes(key)" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    circle(cx="12.1" cy="12.1" r="1")

        .section(class="")
            .search(class="mt-4 px-6")
                .field(
                    class="group/textarea relative flex-1 h-11 flex flex-col bg-neutral-950 rounded-lg leading-none"
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
                    .icon(class="absolute top-1/2 -translate-y-1/2 left-3 opacity-50")
                        svg(class="-translate-y-px size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="m21 21-4.34-4.34")
                            circle(cx="11" cy="11" r="8")
                    input(
                        v-model="query"
                        type="text"
                        spellcheck="false"
                        placeholder="Search examples…"
                        class="absolute inset-0 size-full p-4 pl-9 text-3 text-white/50 font-mono bg-transparent placeholder:text-white/25 resize-none outline-none overflow-auto rounded-lg"
                    )

            .games(class="mx-auto mt-6 pb-8 px-6 w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6")
                template(v-for="item in results" :key="item.id")
                    Card(:game="item" v-bind="linkProps(item, 'project')")

                .empty(v-if="results.length === 0" class="col-span-full pt-5 pb-10 text-neutral-500 text-center font-light") No match for “{{ query }}”.
    
    ScrollAreaScrollbar(
        orientation="vertical"
        class="absolute flex pr-1 py-2 select-none touch-none rounded-full"
    )
        ScrollAreaThumb(class="flex-1 bg-white/30 rounded hover:bg-white")

</template>