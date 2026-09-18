<script setup>
// Core
import { computed, markRaw, reactive, ref, watch } from 'vue'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'
import { useInfiniteScroll } from '@vueuse/core'

// Components
import DialogScroll from '../../../core/dialog-scroll.vue'
import ListCardTable from '../shared/list-card-table.vue'
import ListFilter from '../../../core/list-filter.vue'
import ListSkeleton from '../../../core/list-skeleton.vue'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

// Composables
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useCardSearch } from '../../composable/search-card.js'
import { use_search } from '@cardcarp/core/composable/search.js'
import { use_page } from '@cardcarp/core/composable/page.js'

// Toolbar
import { availableOptions } from '../../../core/facet.js'

// Assign
const { manifest, config, loading } = useGameStore()

const filter_config = computed(() => config.value?.card?.filter ?? {})
const preset = reactive({ filter: {}, sort: 'name', direction: 'asc', group: 'none' })

const { results: preset_cards } = use_search(
    () => manifest.value?.card_list ?? [],
    filter_config,
    preset
)

const category_option = computed(() =>
    availableOptions(filter_config.value.category, manifest.value?.card_list ?? [], 'category')
)

const category = computed({
    get: () => preset.filter.category ?? [],
    set: (value) => { preset.filter.category = value },
})

const { searchQuery, filteredData } = useCardSearch(preset_cards)

const page_state = reactive({ page: 1, max: 40 })
const { paginated, has_more, load_more, reset_page } = use_page(filteredData, page_state)

const scroll_area = ref(null)
const viewport = computed(() => scroll_area.value?.viewport ?? null)

useInfiniteScroll(
    viewport,
    () => load_more(),
    {
        distance: 200,
        canLoadMore: () => has_more.value,
    }
)

watch(filteredData, () => {
    reset_page()
    viewport.value?.scrollTo({ top: 0 })
})
</script>

<template lang="pug">
.field-wrap(class="pt-3 mb-2 flex-none")
    .col(class="flex gap-2")
        .field(class="relative w-full h-8 pl-7 flex items-center text-3.5 text-white font-light leading-none bg-zinc-800 outline outline-black focus-within:outline-yellow-500/50 rounded-sm pointer-text transition-colors") 
            label(class="absolute left-1.5 pointer-text" for="popoverDeckbox_tab_card_query")
                svg(class="size-4 opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="m21 21-4.34-4.34")
                    circle(cx="11" cy="11" r="8")
            input(v-model="searchQuery" id="popoverDeckbox_tab_card_query" class="size-full placeholder:opacity-50" placeholder="Search Cards" autocomplete="off")

        .facets(v-if="category_option.length > 1" class="h-8 flex-none flex gap-1.5")
            ListFilter(
                v-model="category"
                :label="filter_config.category?.label ?? 'Category'"
                :options="category_option"
            )

ScrollAreaRoot(
    class="group/scroll relative flex-1 min-h-0 flex flex-col z-10"
    type="always"
    style="--reka-scroll-area-thumb-width: 4px"
)
    ScrollAreaViewport(class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3")
        
        .padding(class="pr-2")
            ListSkeleton(v-if="loading")
            ListCardTable(v-else-if="paginated.length" :list="paginated")
            Motion(
                v-else
                :initial="{ opacity: 0, scale: 0 }" 
                :animate="{ opacity: 1, scale: 1 }" 
                :exit="{ opacity: 0, scale: 0.6 }" 
                class="py-4 flex flex-col justify-center items-center gap-2"
            )
                svg(class="size-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    circle(cx="11" cy="11" r="8")
                    path(d="m21 21-4.3-4.3")
                    path(d="M11 7v4")
                    path(d="M11 15h.01")
                span No Results...

    ScrollAreaScrollbar(
        orientation="vertical"
        class="flex p-1 bg-black select-none touch-none rounded-full"
    )
        ScrollAreaThumb(class="flex-1 bg-rose-500 rounded")
</template>