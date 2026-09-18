<script setup>
// Core
import { computed, markRaw, reactive, ref, watch } from 'vue'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'
import { useInfiniteScroll } from '@vueuse/core'

// Components
import DialogScroll from '../../../core/dialog-scroll.vue'
import ListDeckTable from '../shared/list-deck-table.vue'
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
import { useProfileStore } from '@cardcarp/core/store/profile.js'
import { useCardSearch } from '../../composable/search-card.js'
import { use_search } from '@cardcarp/core/composable/search.js'
import { use_page } from '@cardcarp/core/composable/page.js'

// Toolbar
import { availableOptions } from '../../../core/facet.js'

// Props
const props = defineProps({
    source: {
        type: String,
        default: 'archive'
    }
})

const { manifest, config, active_game: game_id, loading } = useGameStore()
const { gameDecks } = useProfileStore()

const saved_decks = computed(() =>
    gameDecks(game_id.value).filter(deck => deck.id !== 'storage')
)

const filter_config = computed(() => config.value?.deck?.filter ?? {})
const preset = reactive({ filter: {}, sort: 'name', direction: 'asc', group: 'none' })

const { results: preset_decks } = use_search(
    () => manifest.value?.deck_list ?? [],
    filter_config,
    preset
)

const source_decks = computed(() =>
    props.source === 'saved' ? saved_decks.value : preset_decks.value
)

const facet_source = computed(() =>
    props.source === 'saved' ? saved_decks.value : (manifest.value?.deck_list ?? [])
)

const format_option = computed(() =>
    availableOptions(filter_config.value.format, facet_source.value, 'format')
)

const theme_option = computed(() =>
    availableOptions(filter_config.value.theme, facet_source.value, 'theme')
)

const format = computed({
    get: () => preset.filter.format ?? [],
    set: (value) => { preset.filter.format = value },
})

const theme = computed({
    get: () => preset.filter.theme ?? [],
    set: (value) => { preset.filter.theme = value },
})

const has_facets = computed(() => format_option.value.length > 1 || theme_option.value.length > 1)

const show_skeleton = computed(() => loading.value && props.source !== 'saved')

const { searchQuery, filteredData } = useCardSearch(source_decks, 40, 'name')

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

const field_id = `popoverDeckbox_tab_${props.source}_query`
</script>

<template lang="pug">
.field-wrap(class="pt-3 pb-2 flex-none")
    .col(class="flex gap-2")
        .field(class="relative w-full h-8 pl-7 flex items-center text-3.5 text-white font-light leading-none bg-zinc-800 outline outline-black focus-within:outline-yellow-500/50 rounded-sm pointer-text transition-colors")
            label(class="absolute left-1.5 pointer-text" :for="field_id")
                svg(class="size-4 opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="m21 21-4.34-4.34")
                    circle(cx="11" cy="11" r="8")
            input(v-model="searchQuery" :id="field_id" class="size-full placeholder:opacity-50 placeholder:" placeholder="Search Decks" autocomplete="off")

        .facet(v-if="format_option.length > 1" class="h-8 flex-none flex gap-1.5")
            ListFilter(
                v-model="format"
                :label="filter_config.format?.label ?? 'Format'"
                :options="format_option"
            )

        .facet(v-if="theme_option.length > 1" class="h-8 flex-none flex gap-1.5")
            ListFilter(
                v-model="theme"
                :label="filter_config.theme?.label ?? 'Theme'"
                :options="theme_option"
            )

ScrollAreaRoot(
    class="group/scroll relative flex-1 min-h-0 flex flex-col z-10"
    type="always"
    style="--reka-scroll-area-thumb-width: 4px"
)
    ScrollAreaViewport(class="relative flex-1 min-h-0 w-full group-has-data-[state=visible]/scroll:pr-3")
        
        .padding(class="pr-2")
            ListSkeleton(v-if="show_skeleton")
            ListDeckTable(v-else-if="paginated.length" :list="paginated")
            Motion(
                v-else
                :initial="{ opacity: 0, scale: 0 }"
                :animate="{ opacity: 1, scale: 1 }"
                :exit="{ opacity: 0, scale: 0.6 }"
                class="py-4 flex flex-col justify-center items-center gap-2 font-mono text-3"
            )
                template(v-if=" source === 'saved' ")
                    svg(class="size-8 mb-2 text-mist-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M16.005 15.108a5.041 6.52 28.25 00-8.008-6.217 5.041 6.52 28.25 008.008 6.217A11.884 7.288-60.76 014.029 7.001")
                        path(d="M17 21h.01")
                        path(d="M7 3h.01")
                        path(d="M7.997 8.891a11.885 7.288-60.756 0111.977 8.107")
                        circle(cx="12" cy="12" r="1" fill="currentColor")
                    router-link(
                        :to="{ name: 'deckbox' }" 
                        target="_blank" 
                        class="flex items-center gap-1 text-mist-500 hover:text-mist-400"
                    )
                        span Build a deck
                        svg(class="size-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M7 7h10v10")
                            path(d="M7 17 17 7")

                template(v-else)
                    svg(class="size-8 mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
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
