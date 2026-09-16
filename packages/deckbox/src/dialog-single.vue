<script setup>
// Core
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

// UI
import {
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionRoot,
    AccordionTrigger
} from 'reka-ui'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '@cardcarp/core/part/dialog-scroll.vue'

// State
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useImage } from '@cardcarp/core/composable/image.js'
import { useState } from './state.js'
import { useProfileStore } from '@cardcarp/core/store/profile.js'
const { profile } = useProfileStore()
const { card_src } = useImage()

// Assign
const {
    dialog_single,
    deck_building,
    panel_right_content
} = useState()
const { config, manifest, card_size, card_ratio, active_game: game_id } = useGameStore()
const route = useRoute()

// Local
const keys = ['ability', 'attack', 'play']

// A rule's `position` names the face it is printed on. Every game has a default
// face that isn't worth labelling — mtg calls it "Standard", wow "Front" — and
// only the others (Transform, Flip, Adventure, Reverse, …) earn a tag.
const RULE_POSITION_DEFAULT = ['standard', 'front']

function rule_position(rule) {
    const position = rule?.position
    return position && !RULE_POSITION_DEFAULT.includes(String(position).toLowerCase())
}

// Computed
// Every printing sharing this card's oracle, itself included — ordered by
// release so the list reads as a history. Records carry their own `id`, which
// the template and click_reprint both need, so the dict's values go through
// untouched.
const reprint_list = computed(() => {
    const oracle_id = dialog_single.card?.oracle_id
    if (!oracle_id) return []

    return Object.values(manifest.value?.card_dict ?? {})
        .filter(card => card.oracle_id === oracle_id)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
})

// Null unless the card actually has variants — an empty `variation` array is
// truthy, and would otherwise render a lone thumbnail of the standard art.
const variant_list = computed(() =>
    dialog_single.card?.variation?.length ? ['', ...dialog_single.card.variation] : null
)

// Actions
function close() {
    dialog_single.active = false
    zoom_active.value = false
}

// Prev, Next
// The walk position in the sibling list, which is not always the shown card:
// reprints collapse to one entry by default, so a reprint usually isn't in the
// list at all and `findIndex` would return -1 — losing the place and sending
// next back to the top. The anchor, captured on the way into a reprint, keeps
// prev/next progressing from wherever the dialog was opened.
const sibling_anchor = ref(-1)

const currentIndex = computed(() => {
    const found = dialog_single.sibling.findIndex(item => item.id === dialog_single.card?.id)
    return found !== -1 ? found : sibling_anchor.value
})

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() =>
    currentIndex.value !== -1 && currentIndex.value < dialog_single.sibling.length - 1
)

function goNext() {
    if (!hasNext.value) return
    dialog_single.card = dialog_single.sibling[currentIndex.value + 1]
}

function goPrev() {
    if (!hasPrev.value) return
    dialog_single.card = dialog_single.sibling[currentIndex.value - 1]
}

// Storage
const storage_count = computed(() => {
    return profile.value.storage[route.params.game].list?.main?.[dialog_single.card?.id] ?? 0
})

function get_storage() {
    return profile.value.storage[route.params.game]
}

function recalculate_storage_total() {
    const storage = get_storage()

    storage.total = Object.values(storage.list.main)
      .reduce((sum, quantity) => sum + quantity, 0)
}

function click_storage_increase(id) {
    const storage = get_storage()
    if (storage.list.main[id]) {
        storage.list.main[id] += 1
    } else {
        storage.list.main[id] = 1
    }
    recalculate_storage_total()
}

function click_storage_decrease(id) {
    const storage = get_storage()
    const current = storage.list.main[id]
    if (!current) return
    if (current > 1) {
        storage.list.main[id] -= 1
    } else {
        delete storage.list.main?.[id]
    }
    recalculate_storage_total()
}

// Active List
const collection = computed(() => {
    if (deck_building?.list.length === 0) return 0

    return deck_building.list
        .filter(c => c.id === dialog_single.card?.id)
        .reduce((sum, c) => sum + (c.quantity ?? 0), 0)
})

function click_list_increase(item) {
    const existingCard = deck_building.list.find(
        (c) => c.id === item.id
    )
    if (existingCard) {
        existingCard.quantity += 1
    } else {
        deck_building.list.push({ quantity: 1, list: 'main', ...item })

        if (!deck_building.name) {
            deck_building.name = 'Draft Collection'
            deck_building.tagline = 'Edit'
        }
    }

    panel_right_content.value = 'build'
}

function click_list_decrease(item) {
    const existingCard = deck_building.list.find(
        (c) => c.id === item.id
    )
    if (existingCard) {
        if (existingCard.quantity > 1) {
            existingCard.quantity -= 1
        } else {
            deck_building.list = deck_building.list.filter(
                (c) => !(c.id === item.id)
            )
        }
    }
}

// Image
const image_variant = ref('')

// Thin binding of the shared builder to the card on show, so the template can
// ask for a variant without repeating the card each time.
const image_src = (variant = '') => card_src(dialog_single.card, variant)

const image_main = computed(() => image_src(image_variant.value))

// The enlarged view stacks over this dialog and shows whatever variant is
// currently selected, so it needs no state beyond its own open flag.
const zoom_active = ref(false)

// Grow the card to fill the shell, which is the viewport inset by 20px. The
// max-* utilities can only shrink, and a definite height plus a width clamp
// beats `aspect-ratio` and distorts — so drive width off the shorter axis and
// let the ratio derive the height. Both stay within bounds by construction.
const zoom_style = computed(() => {
    const { width, height } = card_size.value
    return {
        aspectRatio: `${width}/${height}`,
        width: `min(100%, calc((100vh - 40px) * ${width} / ${height}))`
    }
})

function click_variant(variant) {
    image_variant.value =
        image_variant.value === variant
            ? ''
            : variant
}

// Takes the record rather than an id: storage, the build list and prev/next all
// key off `id`, which every card record carries.
function click_reprint(card) {
    sibling_anchor.value = currentIndex.value
    dialog_single.card = card
    image_variant.value = ''
}

</script>

<template lang="pug">
DialogShell(
    :open="dialog_single.active"
    width="w-200"
    :title="dialog_single.card?.name"
    @close="close"
)
    .prev(
        @click="goPrev"
        class="absolute -left-12 top-1/2 -translate-y-1/2 size-7 flex justify-center items-center gap-1 bg-white/10 text-white/60 rounded-md"
        :class="hasPrev ? 'hover:text-white hover:bg-white/20 ' : 'opacity-50'"
    )
        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
            path(d="m15 18-6-6 6-6")

    .next(
            @click="goNext"
            class="absolute -right-12 top-1/2 -translate-y-1/2 size-7 flex justify-center items-center gap-1 bg-white/10 text-white/60 rounded-md"
            :class="hasNext ? 'hover:text-white hover:bg-white/20 ' : 'opacity-50'"
        )
            svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="m9 18 6-6-6-6")

    .columns(class="flex-1 min-h-0 flex")

        .left(
            class="flex-1 md:max-w-120 min-h-0 flex flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-l-xl"
            style=""
        )
            DialogScroll(
                rootClass="px-6 pt-6"
                rootStyle=""
                rounding=""
                type="always"
            )
                .title(class="flex items-end gap-2 text-5 text-white font-light leading-none")
                    span {{ dialog_single.card.name }}

                .id(class="mt-2 flex gap-2 text-3.5 opacity-50")
                    .set() {{ dialog_single.card.set_name }}
                    .divider() —
                    .number(v-if="dialog_single.card.card_index") {{ dialog_single.card.card_index }}

                .divider-dark(class="mt-4 w-full h-0.5 bg-black")
                .divider-light(class="w-full h-px bg-white/8")

                .rules(
                    v-for="rule in dialog_single.card.rule"
                    class="mt-7 mb-9 text-text font-light"
                )
                    .tag(class="flex gap-1 font-mono text-3 leading-none")
                        .position(v-if="rule_position(rule)" class="text-mauve-500") {{ rule.position }}
                        .category(v-if="rule.name" class="text-yellow-500") {{ rule.name }}
                    .text(class="mt-2 text-3.5") {{ rule.text }}

                .flavor(class="mt-4 text-3 text-white/30 font-light")
                    .text {{ dialog_single.card.flavor }}

                template(v-if="reprint_list.length > 1")
                    .section(class="")
                        .divider-dark(class="mt-4 w-full h-0.5 bg-black")
                        .divider-light(class="w-full h-px bg-white/8")
                        AccordionRoot(
                            type="single"
                            :collapsible="true"
                            class="mt-5 flex flex-col gap-2 bg-zinc-700 rounded overflow-hidden"
                            style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0 / 0.5)"
                        )
                            AccordionItem(value="item-01")
                                AccordionHeader(as="div")
                                    AccordionTrigger(
                                        as="div"
                                        class="group/trigger px-3 w-full h-7 flex items-center text-2.5 leading-none text-zinc-400 font-medium rounded hover:text-zinc-300 data-[state=open]:rounded-b-none!"
                                    )
                                        .text(class="grow") TOGGLE PRINTINGS <span class="font-mono text-2.5">({{ reprint_list.length }})</span>
                                        .chevron(class="w-3")
                                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                g(class="hidden group-data-[state=closed]/trigger:block")
                                                    path(d="m6 9 6 6 6-6")
                                                g(class="hidden group-data-[state=open]/trigger:block")
                                                    path(d="M5 12h14")

                                AccordionContent(
                                    class="rounded-b bg-black/40"
                                )
                                    .divider-dark(class="w-full h-px bg-black")
                                    .divider-light(class="w-full h-px bg-zinc-700")
                                    .list(class="px-2 pt-2 pb-3 flex flex-col gap-1")
                                        .card(
                                            v-for="card in reprint_list"
                                            @click="click_reprint(card)"
                                            class="group/reprint relative px-1 pr-2 py-1 flex items-center gap-3 font-light text-3.25 rounded-full"
                                            :class="card.id === dialog_single.card.id ? 'text-zinc-500 hover:text-zinc-500' : 'text-zinc-400 hover:text-stone-100 hover:bg-white/10' "

                                        )
                                            .chevron(
                                                class="flex-none"
                                            )
                                                svg(class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                    path(d="m9 18 6-6-6-6")
                                            .set(
                                                class="grow truncate"
                                            ) {{ card.set_name }}
                                            .number(class="flex-none font-mono text-2.75 opacity-50") {{ card.card_index }}

                .section(class="")
                    .divider-dark(class="mt-4 w-full h-0.5 bg-black")
                    .divider-light(class="w-full h-px bg-white/8")
                    .text(class="mt-5 flex items-center gap-2 font-mono text-2.75")
                        .text(class="opacity-30") Notice an error?
                        template(v-if="config.dataset.source == 'cardcarp'")
                            a(
                                :href="['https://github.com/cardcarp', game_id, 'blob/main/data/card', dialog_single.card.dir].join('/') + '.yml'" 
                                target="_blank"
                                class="flex items-center gap-0.5 opacity-30 hover:text-slate-600 hover:opacity-100 underline"
                            ) Fix print
                            .divider(class="opacity-20") |
                            a(
                                :href="['https://github.com/cardcarp', game_id, 'blob/main/data/oracle', dialog_single.card.dir].join('/') + '.yml'" 
                                target="_blank"
                                class="flex items-center gap-0.5 opacity-30 hover:text-slate-600 hover:opacity-100 underline"
                            ) Fix oracle
                        template(v-else)
                            a(
                                :href="config.dataset.link" 
                                target="_blank"
                                class="flex items-center gap-0.5 opacity-30 hover:text-slate-600 hover:opacity-100 underline"
                            ) Submit an issue

                .spacing(class="w-full h-8")

            .btns(
                class="relative flex-none w-full bg-linear-to-br to-zinc-950 from-zinc-900 rounded-bl-xl"
                style="box-shadow: 0 -1px 0 0 hsl(0 0 0), 0 -5px 5px 0 hsl(0 0 0 / 0.15)"
            )
                .divider-light(class="w-full h-px bg-white/5")
                .btns(class="p-4 flex flex-col justify-center items-center gap-2")
                    .btn(v-if="deck_building.name !== 'Storage'" class="w-full flex items-center gap-4 text-3 leading-none rounded-full")
                        .label(class="flex items-center gap-1")
                            svg(class="relative text-green-500/50 size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M10 15h4")
                                path(d="m14.817 10.995-.971-1.45 1.034-1.232a2 2 0 0 0-2.025-3.238l-1.82.364L9.91 3.885a2 2 0 0 0-3.625.748L6.141 6.55l-1.725.426a2 2 0 0 0-.19 3.756l.657.27")
                                path(d="m18.822 10.995 2.26-5.38a1 1 0 0 0-.557-1.318L16.954 2.9a1 1 0 0 0-1.281.533l-.924 2.122")
                                path(d="M4 12.006A1 1 0 0 1 4.994 11H19a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z")
                            .name(class="relative top-px ml-1 text-3.5 text-white font-light") Storage
                        .line(
                            class="relative grow h-1 opacity-60 bg-repeat-x"
                            style="background-size: 8px 4px; background-image: radial-gradient(circle, #333 1px, transparent 1px);"
                        )
                        .actions(class="flex items-center gap-2")
                            .increase(
                                @click="click_storage_increase(dialog_single.card.id)" 
                                class="size-6 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                            )
                                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="M5 12h14")
                                    path(d="M12 5v14")
                            .decrease(
                                @click="click_storage_decrease(dialog_single.card.id)" 
                                class="size-6 flex justify-center items-center gap-2 text-white rounded-full bg-neutral-700 hover:bg-neutral-600 hover:outline-white/40"
                                style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                            )
                                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="M5 12h14")
                        .qty(class="flex-none flex justify-center items-center font-mono text-3.5") {{ storage_count }}

                    .btn(class="pl-0.75 w-full flex items-center gap-4 text-3 leading-none rounded-full")
                        .label(class="flex items-center gap-1")
                            svg(class="relative text-yellow-500/50 size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2")
                                rect(x="14" y="2" width="8" height="8" rx="1")
                            .name(class="relative top-px ml-1 text-3.5 text-white font-light") {{ panel_right_content  ? 'Active List' : 'Start a List' }}
                        .line(
                            class="relative grow h-1 opacity-60 bg-repeat-x"
                            style="background-size: 8px 4px; background-image: radial-gradient(circle, #333 1px, transparent 1px);"
                        )
                        .actions(class="flex items-center gap-2")
                            .increase(
                                @click="click_list_increase(dialog_single.card)" 
                                class="size-6 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                                style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                            )
                                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="M5 12h14")
                                    path(d="M12 5v14")
                            .decrease(
                                @click="click_list_decrease(dialog_single.card)" 
                                class="size-6 flex justify-center items-center gap-2 text-white rounded-full bg-neutral-700 hover:bg-neutral-600 hover:outline-white/40"
                                style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                            )
                                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="M5 12h14")
                        .qty(class="flex-none flex justify-center items-center font-mono text-3.5") {{ collection }}
                        
        DialogScroll(
            rootClass="relative flex-1 p-5 min-h-0 bg-black rounded-r-xl"
            rootStyle="box-shadow: inset 2px 0 0 0 hsl(0 0 0), inset 3px 0 0 0 hsl(0 0 5)"
        )
            .card(
                @click="zoom_active = true"
                class="relative w-full bg-black rounded-[4%] overflow-hidden touch-none "
                :style="{ aspectRatio: card_ratio } "
            )
                img(
                    class="size-full object-cover drag-none" 
                    :alt="dialog_single.card.name" 
                    :src="image_main"
                    draggable="false"
                )

            .variants(v-if="variant_list" class="mt-2 w-full flex flex-wrap gap-2 justify-center items-center")
                .btn(
                    v-for="variant in variant_list" 
                    @click="click_variant(variant)" 
                    class="group/btn flex-[0_1_100px] relative p-px w-full rounded bg-white/5"
                    :style="{ aspectRatio: card_ratio } "
                )
                    .h(
                        class="absolute inset-0 bg-yellow-900 rounded-sm transition-opacity group-hover/btn:opacity-100"
                        :class="variant === image_variant ? 'opacity-100 bg-white' : 'opacity-0'"
                    )
                    img(
                        ref="img_el"
                        :src="image_src(variant)"
                        alt=""
                        class="relative size-full object-cover rounded-sm"
                        @load="loaded = true"
                        @error="loaded = true"
                    )

//- The enlarged card, stacked over the dialog above on layer 1 so its overlay
//- dims that dialog too. No close button — the overlay is the affordance, and
//- it closes only this layer. The image sizes itself: max-w/max-h on a
//- replaced element keeps the box equal to the rendered card, so the rounding
//- lands on the card's own edges.
DialogShell(
    :open="zoom_active"
    size="full"
    :layer="1"
    :title="dialog_single.card?.name"
    @close="zoom_active = false"
)
    .card(class="rounded-[4%] overflow-hidden" :style="zoom_style")
        img(
            class="size-full object-cover drag-none"
            :alt="dialog_single.card?.name"
            :src="image_main"
            draggable="false"
        )
</template>
