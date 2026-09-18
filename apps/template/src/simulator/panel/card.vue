<script setup>
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

import Section from './section.vue'
import ListFilter from '../../core/list-filter.vue'

import { useStore } from '../composable/use-store.js'
import { is_dragging, mouseover_cell_card, mouseleave_cell_card } from '@cardcarp/core/store/preview.js'
import { use_drag, drag_item_isActive, drag_x, drag_y } from '@cardcarp/core/store/drag.js'

import { useImage } from '@cardcarp/core/composable/image.js'
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useTable } from '../use-table.js'

const { current: uiSelection } = useTable().selection
const { groupCards: cardGetGroupCards, setGroupOrder: cardSetGroupOrder, shuffle: cardShuffle, draw: cardDraw, groupRevision: cardGroupRevision } = useTable().cards
const { clientToWorld } = useTable().view

const { config } = useGameStore()
const { card_src } = useImage()
const ui_selection = useStore(uiSelection)

const group = computed(() => ui_selection.value?.data?.group ?? null)
const groupId = computed(() => (group.value ? ui_selection.value?.data?.groupId ?? null : null))
const cardCount = computed(() => ui_selection.value?.data?.cardCount ?? 0)

const single = computed(() => !group.value && ui_selection.value?.units === 1)

const card = computed(() => (single.value ? ui_selection.value?.data?.card ?? null : null))

const title = computed(() => {
    if (group.value) return `Deck · ${group.value.count}`
    return 'Card'
})

const peek_single = ref(false)

watch(() => card.value?.id, () => { peek_single.value = false })

const singleRevealed = computed(() =>
    !(ui_selection.value?.data?.faceDown ?? false) || peek_single.value)

const RULE_POSITION_DEFAULT = ['standard', 'front']

function rulePosition(rule) {
    const position = rule?.position
    return position && !RULE_POSITION_DEFAULT.includes(String(position).toLowerCase())
}

const card_list = ref([])
const search = ref('')
const filter_active = ref([])

const peeked = ref(new Set())

const drag_row = ref(null)

function syncFromCanvas() {
    if (drag_row.value) return

    const id = groupId.value
    if (!id) {
        card_list.value = []
        return
    }

    card_list.value = cardGetGroupCards(id).map((card, index) => ({
        ...card.cardData,
        order: index,
        nodeId: card.nodeId,
        faceDown: card.faceDown,
    }))
}

const group_revision = useStore(cardGroupRevision)
watch([groupId, group_revision], syncFromCanvas, { immediate: true })

watch(groupId, () => {
    search.value = ''
    filter_active.value = []
    peeked.value = new Set()
    actions_row.value = null
})

// Search only matches cards the player can see, or it would leak face-down decks.
function revealed(card) {
    return !card.faceDown || peeked.value.has(card.nodeId)
}

const filteredCards = computed(() => {
    const searchTerm = search.value.toLowerCase().trim()
    const activeFilters = filter_active.value

    return card_list.value.filter((card) => {
        if (!card) return false

        if ((searchTerm || activeFilters.length) && !revealed(card)) return false

        const name = card.name ? card.name.toLowerCase() : ''
        const matchesSearch = searchTerm === '' || name.includes(searchTerm)

        const matchesFilter = activeFilters.length === 0
            || activeFilters.some(value => cardMatchesFilter(card, value))

        return matchesSearch && matchesFilter
    })
})

const isFiltering = computed(() => !!search.value.trim() || filter_active.value.length > 0)

const filter_list = computed(() => {
    const scry = config.value?.simulator?.card?.scry
    if (!Array.isArray(scry)) return []
    return scry.map(value => ({ value, label: value }))
})

function matchesProperty(prop, value) {
    return Array.isArray(prop) ? prop.includes(value) : prop === value
}

function cardMatchesFilter(card, value) {
    return matchesProperty(card.category, value) || matchesProperty(card.trait, value)
}

function reindexCards() {
    card_list.value.forEach((c, index) => { c.order = index })
}

function commitOrder() {
    if (!groupId.value) return
    cardSetGroupOrder(groupId.value, card_list.value.map(c => c.nodeId))
}

function fullIndexForSlot(slot) {
    const rows = filteredCards.value
    if (rows.length === 0) return card_list.value.length
    if (slot >= rows.length) return card_list.value.indexOf(rows[rows.length - 1]) + 1
    return card_list.value.indexOf(rows[slot])
}

function moveCardToSlot(card, slot) {
    const from = card_list.value.indexOf(card)
    if (from === -1) return

    let to = fullIndexForSlot(slot)
    if (to > from) to--
    if (to === from) return

    card_list.value.splice(from, 1)
    card_list.value.splice(to, 0, card)
    reindexCards()
    commitOrder()
}

const drop_slot = ref(null)
const drop_zone = ref(null)

const scroll = useTemplateRef('scroll')
const list_el = computed(() => scroll.value?.viewport ?? null)

let row_bounds = []
let needs_measure = false

function measureRows() {
    const el = list_el.value
    row_bounds = el
        ? [...el.querySelectorAll('[data-scry-row]')].map(node => ({
            top: node.offsetTop,
            mid: node.offsetTop + node.offsetHeight / 2,
        }))
        : []
    needs_measure = false
}

function slotFromPointer(contentY) {
    for (let i = 0; i < row_bounds.length; i++) {
        if (contentY < row_bounds[i].mid) return i
    }
    return row_bounds.length
}

const AUTOSCROLL_EDGE = 28
const AUTOSCROLL_MAX = 12
let autoscroll_frame = null

function autoscrollFor(clientY, rect) {
    const el = list_el.value
    if (!el) return

    let dv = 0
    if (clientY < rect.top + AUTOSCROLL_EDGE) {
        dv = -AUTOSCROLL_MAX * ((rect.top + AUTOSCROLL_EDGE - clientY) / AUTOSCROLL_EDGE)
    } else if (clientY > rect.bottom - AUTOSCROLL_EDGE) {
        dv = AUTOSCROLL_MAX * ((clientY - (rect.bottom - AUTOSCROLL_EDGE)) / AUTOSCROLL_EDGE)
    }

    if (dv === 0) {
        stopAutoscroll()
        return
    }
    if (autoscroll_frame) return

    const step = () => {
        const node = list_el.value
        if (!node || !drag_row.value) { autoscroll_frame = null; return }
        node.scrollTop += dv
        autoscroll_frame = requestAnimationFrame(step)
    }
    autoscroll_frame = requestAnimationFrame(step)
}

function stopAutoscroll() {
    if (autoscroll_frame) cancelAnimationFrame(autoscroll_frame)
    autoscroll_frame = null
}

function updateDropTarget(clientX, clientY) {
    if (needs_measure) measureRows()

    const el = list_el.value
    const rect = el?.getBoundingClientRect()

    if (rect
        && clientX >= rect.left && clientX <= rect.right
        && clientY >= rect.top && clientY <= rect.bottom) {
        drop_zone.value = 'list'
        drop_slot.value = slotFromPointer(clientY - rect.top + el.scrollTop)
        autoscrollFor(clientY, rect)
        return
    }

    stopAutoscroll()
    drop_slot.value = null

    const over = document.elementFromPoint(clientX, clientY)
    drop_zone.value = over?.closest('.canvas') ? 'canvas' : null
}

watch([drag_x, drag_y], () => {
    if (!drag_row.value || !drag_item_isActive.value) return
    updateDropTarget(drag_x.value, drag_y.value)
})

function blockTouchScroll(e) {
    e.preventDefault()
}

function setTouchScrollBlocked(blocked) {
    window.removeEventListener('touchmove', blockTouchScroll, { passive: false })
    if (blocked) window.addEventListener('touchmove', blockTouchScroll, { passive: false })
}

watch(drag_item_isActive, (active) => {
    if (active && drag_row.value) {
        onRowLeave()
        is_dragging.value = true
        actions_row.value = null
        setTouchScrollBlocked(true)
        return
    }
    if (!active) {
        stopAutoscroll()
        setTouchScrollBlocked(false)
        row_bounds = []
        needs_measure = false
        drag_row.value = null
        drop_slot.value = null
        drop_zone.value = null
        is_dragging.value = false
    }
})

onUnmounted(() => {
    endPress()
    setTouchScrollBlocked(false)
})

const { start: rowDragStart } = use_drag((e) => {
    const card = drag_row.value
    const zone = drop_zone.value
    const slot = drop_slot.value

    drag_row.value = null
    drop_zone.value = null
    drop_slot.value = null

    if (!card) return

    if (zone === 'canvas') {
        const { x, y } = clientToWorld(e.clientX, e.clientY)
        cardDraw({ groupId: groupId.value, nodeId: card.nodeId, to: 'board', at: { x, y } })
        return
    }

    if (zone === 'list' && slot !== null) {
        moveCardToSlot(card, slot)
    }
})

const LONG_PRESS_MS = 300
const LONG_PRESS_SLOP = 8

const actions_row = ref(null)

let press = null
let press_timer = null

function endPress() {
    clearTimeout(press_timer)
    press_timer = null
    press = null
    window.removeEventListener('pointermove', onPressMove)
    window.removeEventListener('pointerup', onPressUp)
    window.removeEventListener('pointercancel', onPressCancel)
}

function onPressMove(e) {
    if (!press) return
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) <= LONG_PRESS_SLOP) return
    endPress()
}

function onPressUp(e) {
    if (!press) return
    const card = press.card
    endPress()
    actions_row.value = actions_row.value === card.nodeId ? null : card.nodeId
}

function onPressCancel() {
    endPress()
}

function beginRowDrag(e, card, { immediate = false } = {}) {
    drag_row.value = card
    needs_measure = true
    rowDragStart(e, { ...card, name: revealed(card) ? card.name : 'Hidden' }, { immediate })
}

function onRowPointerDown(e, card) {
    if (e.target.closest?.('[data-scry-action]')) return

    if (e.pointerType === 'mouse') {
        beginRowDrag(e, card)
        return
    }

    endPress()
    press = { card, x: e.clientX, y: e.clientY, event: e }
    press_timer = setTimeout(() => {
        if (!press) return
        const { card: held, event } = press
        endPress()
        beginRowDrag(event, held, { immediate: true })
    }, LONG_PRESS_MS)

    window.addEventListener('pointermove', onPressMove)
    window.addEventListener('pointerup', onPressUp)
    window.addEventListener('pointercancel', onPressCancel)
}

function handle_cardToTop(card) {
    const index = card_list.value.indexOf(card)
    if (index === -1) return
    card_list.value.splice(index, 1)
    card_list.value.unshift(card)
    reindexCards()
    commitOrder()
}

function handle_cardToBottom(card) {
    const index = card_list.value.indexOf(card)
    if (index === -1) return
    card_list.value.splice(index, 1)
    card_list.value.push(card)
    reindexCards()
    commitOrder()
}

function handle_cardToBoard(card) {
    cardDraw({ groupId: groupId.value, nodeId: card.nodeId, to: 'board' })
}

function handle_cardToHand(card) {
    cardDraw({ groupId: groupId.value, nodeId: card.nodeId, to: 'hand' })
}

function handle_cardPeek(card) {
    const next = new Set(peeked.value)
    if (next.has(card.nodeId)) next.delete(card.nodeId)
    else next.add(card.nodeId)
    peeked.value = next
}

function handle_peekAll() {
    peeked.value = new Set(card_list.value.map(c => c.nodeId))
}

function handle_peekNone() {
    peeked.value = new Set()
}

function handle_shuffle() {
    if (!groupId.value) return
    peeked.value = new Set()
    cardShuffle(groupId.value)
}

function onRowEnter(event, card) {
    if (!revealed(card)) return
    mouseover_cell_card(event, card, null)
}

function onRowLeave() {
    mouseleave_cell_card()
}

watch(() => ui_selection.value.type, (type) => {
    if (type === 'card') return
    onRowLeave()
    if (drag_item_isActive.value) is_dragging.value = false
})
</script>

<template lang="pug">
Section(v-if="ui_selection.type === 'card' && (group || single)" id="card" :title="title")

    template(v-if="group")
        .scry(class="flex flex-col")

            .controls(class="flex items-center gap-2")
                .field(class="relative grow")
                    input(
                        v-model="search" 
                        autocomplete="off"
                        spellcheck="false"
                        class="relative w-full h-7 pl-2 tracking-wide flex items-center text-3 text-white font-light leading-none bg-zinc-800 outline outline-black focus-within:outline-yellow-500/50 rounded-sm pointer-text transition-colors" 
                        placeholder="Search..."
                    )

                ListFilter(
                    v-if="filter_list.length > 1"
                    v-model="filter_active"
                    label="Filter"
                    :options="filter_list"
                )

                .btn(
                    @click="peeked.size ? handle_peekNone() : handle_peekAll()"
                    :title="peeked.size ? 'Stop peeking' : 'Peek at every card'"
                    :class="peeked.size ? 'bg-white text-black' : 'text-neutral-300 outline outline-neutral-700 bg-neutral-800 hover:bg-neutral-700'"
                    class="flex-none size-7 flex items-center justify-center rounded-lg"
                )
                    svg(class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        template(v-if="peeked.size")
                            path(d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49")
                            path(d="M14.084 14.158a3 3 0 0 1-4.242-4.242")
                            path(d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143")
                            path(d="m2 2 20 20")
                        template(v-else)
                            path(d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0")
                            circle(cx="12" cy="12" r="3")

            .list-box(class="relative max-h-[25vh] mt-2 flex flex-col")

                ScrollAreaRoot(
                    ref="scroll"
                    class="group/scroll relative flex-1 min-h-0 flex flex-col z-10"
                    type="auto"
                    style="--reka-scroll-area-thumb-width: 6px"
                )
                    ScrollAreaViewport(class="relative flex-1 min-h-0 w-full")

                        .rows(class="group/list relative pt-1 flex flex-col gap-1.5")
                            .slot(
                                v-for="(card, index) in filteredCards"
                                :key="card.nodeId"
                                data-scry-row
                                class="group/row relative flex-none flex items-center gap-2"
                            )
                                .drop-line(
                                    v-if="drop_zone === 'list' && drop_slot === index"
                                    class="absolute left-0 right-0 -top-1 w-full h-0.5 bg-blue-400 rounded-full z-10"
                                )

                                .order(class="relative flex-none font-mono text-2.5 text-neutral-600 tabular-nums leading-none") {{ card.order + 1 }}

                                .row(
                                    @pointerdown="onRowPointerDown($event, card)"
                                    @pointerenter="onRowEnter($event, card)"
                                    @pointerleave="onRowLeave"
                                    :class="[drag_item_isActive ? (drag_row === card ? 'bg-blue-500/25' : '') : 'group-hover/row:bg-mauve-800! group-first/row:bg-mauve-800 group-first/row:group-hover/list:bg-transparent', !drag_item_isActive && actions_row === card.nodeId ? 'bg-mauve-800' : '']"
                                    class="relative pl-2 pr-2 h-6 w-full flex items-center font-extralight rounded-sm overflow-hidden touch-pan-y"
                                    style="touch-action: pan-y"
                                )

                                    template(v-if="revealed(card)") 
                                        .name(class="grow min-w-0 text-3.25 text-neutral-200")
                                            span(class="truncate") {{ card.name }}
                                    template(v-else)
                                        .name(class="grow min-w-0 text-3.25 text-neutral-200")
                                            span(class="truncate opacity-50") Hidden

                                    .actions(
                                        v-show="!drag_item_isActive"
                                        :class="actions_row === card.nodeId ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto'"
                                        class="absolute right-0 top-0 h-full pr-2.5 flex items-center bg-mauve-800"
                                    )
                                        .btn(
                                            data-scry-action
                                            @click.stop="handle_cardPeek(card)"
                                            :title="peeked.has(card.nodeId) ? 'Stop peeking' : 'Peek'"
                                            class="size-6 flex items-center justify-center rounded-sm hover:bg-white/20 hover:text-white"
                                        )
                                            svg(class="size-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                template(v-if="revealed(card)")
                                                    path(d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49")
                                                    path(d="M14.084 14.158a3 3 0 0 1-4.242-4.242")
                                                    path(d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143")
                                                    path(d="m2 2 20 20")
                                                template(v-else)
                                                    path(d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0")
                                                    circle(cx="12" cy="12" r="3")

                                        .btn(
                                            data-scry-action
                                            @click.stop="handle_cardToHand(card)"
                                            title="Draw to hand"
                                            class="size-6 flex items-center justify-center rounded-sm hover:bg-white/20 hover:text-white"
                                        )
                                            svg(class="size-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                path(d="M12.65 7.65a2 2 0 012.629-1.046l5.51 2.374a2 2 0 011.046 2.628l-3.957 9.184a2 2 0 01-2.628 1.046l-5.51-2.374a2 2 0 01-1.046-2.628z")
                                                path(d="M18 7.777V4a2 2 0 00-2-2h-6a2 2 0 00-2 2v10a2 2 0 001.137 1.805")
                                                path(d="m8 4.389-4.364.809a2 2 0 00-1.602 2.33l1.822 9.833a2 2 0 002.331 1.602l2.542-.47")
                                        
                                        .btn(
                                            data-scry-action
                                            @click.stop="handle_cardToBoard(card)"
                                            title="Put onto the table"
                                            class="size-6 flex items-center justify-center rounded-sm hover:bg-white/20 hover:text-white"
                                        )
                                            svg(class="size-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                circle(cx="12" cy="5" r="1")
                                                circle(cx="19" cy="5" r="1")
                                                circle(cx="5" cy="5" r="1")
                                                circle(cx="12" cy="12" r="1")
                                                circle(cx="19" cy="12" r="1")
                                                circle(cx="5" cy="12" r="1")
                                                circle(cx="12" cy="19" r="1")
                                                circle(cx="19" cy="19" r="1")
                                                circle(cx="5" cy="19" r="1")

                                        .btn(
                                            data-scry-action
                                            @click.stop="handle_cardToTop(card)"
                                            title="To top of deck"
                                            class="size-6 flex items-center justify-center rounded-sm hover:bg-white/20 hover:text-white"
                                        )
                                            svg(class="size-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                path(d="M5 3h14")
                                                path(d="m18 13-6-6-6 6")
                                                path(d="M12 7v14")

                                        .btn(
                                            data-scry-action
                                            @click.stop="handle_cardToBottom(card)"
                                            title="To bottom of deck"
                                            class="size-6 flex items-center justify-center rounded-sm hover:bg-white/20 hover:text-white"
                                        )
                                            svg(class="size-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                                path(d="M12 17V3")
                                                path(d="m6 11 6 6 6-6")
                                                path(d="M19 21H5")

                            .tail(
                                v-if="drop_zone === 'list' && drop_slot === filteredCards.length && filteredCards.length"
                                class="relative flex-none h-0"
                            )
                                .drop-line(class="absolute left-0 right-0 -top-1 h-0.5 bg-blue-400 rounded-full z-10")

                    ScrollAreaScrollbar(
                        orientation="vertical"
                        class="absolute flex select-none touch-none rounded-full"
                    )
                        ScrollAreaThumb(class="flex-1 bg-white/30 rounded")
            .none(v-if="filteredCards.length === 0" class="py-3 text-center text-neutral-600 bg-black rounded-lg font-mono text-3")
                svg(class="size-8 mx-auto mb-2 text-mist-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M16.005 15.108a5.041 6.52 28.25 00-8.008-6.217 5.041 6.52 28.25 008.008 6.217A11.884 7.288-60.76 014.029 7.001")
                    path(d="M17 21h.01")
                    path(d="M7 3h.01")
                    path(d="M7.997 8.891a11.885 7.288-60.756 0111.977 8.107")
                    circle(cx="12" cy="12" r="1" fill="currentColor")
                template(v-if="isFiltering") No cards match
                template(v-else) Empty

            .footer(class="mt-3 flex items-center gap-2 font-mono text-2.75")
                .count(class="grow min-w-0 truncate text-neutral-400")
                    template(v-if="isFiltering") {{ filteredCards.length }} of {{ card_list.length }}
                    template(v-else) {{ card_list.length }} cards
                .btn(
                    @click="handle_shuffle"
                    class="flex-none px-3 h-6 flex items-center justify-center font-light rounded text-neutral-300 outline outline-neutral-700 bg-neutral-800 hover:bg-neutral-700"
                )
                    span Shuffle

    .detail(v-else-if="single" class="flex flex-col gap-1")

        template(v-if="!singleRevealed")
            .facedown(class="flex items-center gap-2 font-mono text-2.75")
                span(class="grow min-w-0 truncate text-neutral-400") Face down
                .btn(
                    @click="peek_single = true"
                    title="Peek"
                    class="flex-none w-17 h-7 flex items-center justify-center gap-2 rounded text-neutral-300 outline outline-neutral-700 bg-neutral-800 hover:bg-neutral-700"
                )
                    svg(class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0")
                        circle(cx="12" cy="12" r="3")
                    span Peek

        template(v-else-if="card")
            .name(class="text-3.5 text-yellow-500 font-extralight leading-snug") {{ card.name }}

            .id(class="flex gap-1.5 font-mono text-2.75 text-mauve-500")
                span(class="min-w-0 truncate") {{ card.set_name }}
                template(v-if="card.card_index")
                    span ·
                    span(class="flex-none") {{ card.card_index }}

            .rules(v-if="card.rule?.length" class="flex flex-col gap-3")
                .rule(v-for="(rule, i) in card.rule" :key="i" class="flex flex-col gap-1")
                    .tag(v-if="rulePosition(rule) || rule.name" class="flex gap-1.5 font-mono text-2.5 leading-none")
                        span(v-if="rulePosition(rule)" class="text-mist-500") {{ rule.position }}
                        span(v-if="rule.name" class="text-olive-500") {{ rule.name }}
                    .text(class="text-3 text-neutral-400 font-light leading-relaxed whitespace-pre-line") {{ rule.text }}

            .flavor(v-if="card.flavor" class="text-2.75 text-white/30 font-light italic leading-relaxed") {{ card.flavor }}
</template>
