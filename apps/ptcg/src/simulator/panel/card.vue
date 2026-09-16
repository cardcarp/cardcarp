<script setup>
// The contextual section for a card selection, and the home of the scry list.
//
// The list used to be a modal (view/table/dialog-scry.vue, now gone). Moving it here is not a
// relocation of the same thing: a dialog has an open and a close, and the old one leaned on
// both — it snapshotted the pile on open, collected edits, and wrote them back on Place or on
// dismiss. A section that is simply present for as long as a deck is selected has neither
// moment, so the commit model had to be replaced rather than carried over. Two rules do it:
//
//   Anything that moves a card is immediate. Reorders write through on drag end, and Top /
//   Bottom / Draw / To Table write through on click. There is no Place button because there
//   is nothing left for it to place.
//
//   Peeking is local and never leaves this client. The old dialog kept peeks private while it
//   was open and made them public on Place, which is the one behaviour that could not survive
//   losing its close: live-writing them would broadcast "they looked at card three" to every
//   peer. So a peek now toggles this list's own rendering and touches no canvas node at all,
//   which also means there is nothing to commit and nothing to forget to commit.
//
// The cost, stated plainly: revealing a card here no longer leaves it face-up inside the pile
// on the table, which Place used to do. Inside a face-down pile only the top card's face is
// visible anyway, and turning that one over is what the toolbar's Flip button and H are for.
//
// Cards that are genuinely face-up on the table (a game that deals a zone in the open) render
// revealed here without any peek — `revealed` reads the canvas first and lets the local peek
// set override it, so the list tells the truth about the table by default.
//
// === Dragging ===
// Rows are dragged with the same primitive the deck builder uses (store/drag.js), not with a
// layout-animating list. motion-v's Reorder moved the row itself, which meant every pointer
// move re-laid-out sixty rows and animated the ones that shifted — the choppiness was the
// layout work, not the easing, and no amount of tuning the transition was going to fix it.
//
// Nothing in the list moves during a drag now. The row being carried stays exactly where it
// is and turns blue to say it is in hand; a single line marks where it would land; the only
// thing that follows the pointer is the one ghost element the table view already renders for
// every other drag (see the `drag_item_isActive` block in view/table/index.vue). That is one
// moving element instead of sixty, so the frame cost no longer scales with the deck.
//
// The row rects are measured ONCE, when the drag activates. They are allowed to be stale for
// the length of the drag precisely because nothing reflows any more — which is what makes
// hit-testing sixty rows per pointer move arithmetic on cached numbers rather than sixty
// layout reads.
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

import Section from './section.vue'
import ListFilter from '../toolbar/shared/list-filter.vue'

import { useStore } from '../composable/use-store.js'
import { is_dragging, mouseover_cell_card, mouseleave_cell_card } from '@cardcarp/core/store/preview.js'
import { use_drag, drag_item_isActive, drag_x, drag_y } from '@cardcarp/core/store/drag.js'

import { useImage } from '@cardcarp/core/composable/image.js'
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useTable } from '../use-table.js'

// The table, through its object (see use-table.js).
const { current: uiSelection } = useTable().selection
const { groupCards: cardGetGroupCards, setGroupOrder: cardSetGroupOrder, shuffle: cardShuffle, draw: cardDraw, groupRevision: cardGroupRevision } = useTable().cards
const { clientToWorld } = useTable().view

const { config } = useGameStore()
const { card_src } = useImage()
const ui_selection = useStore(uiSelection)

// One pile, or a set of loose cards. `group` is non-null only when the selection IS exactly
// one pile of two or more (see the card tool's selectionPayload) — the same test the
// deck-only verbs on the floating toolbar use.
const group = computed(() => ui_selection.value?.data?.group ?? null)
const groupId = computed(() => (group.value ? ui_selection.value?.data?.groupId ?? null : null))
const cardCount = computed(() => ui_selection.value?.data?.cardCount ?? 0)

// Exactly one card, not a pile. The other multi-object cases belong to the alignment section
// (see panel/align.vue), so this one renders nothing for them rather than showing a list that
// has no single deck behind it.
const single = computed(() => !group.value && ui_selection.value?.units === 1)

// The record itself, for the readout below. Same fields the deck builder's card dialog shows.
const card = computed(() => (single.value ? ui_selection.value?.data?.card ?? null : null))

// The title carries the count, so a collapsed section still says what is selected. Never the
// card's NAME: a face-down card would announce itself in a header the player cannot collapse
// away from, which is the one thing the peek model exists to prevent.
const title = computed(() => {
    if (group.value) return `Deck · ${group.value.count}`
    return 'Card'
})

// A single card is face-down until the player says otherwise, exactly as in the list above —
// peeking is local, never touches the canvas node, and never reaches a peer.
const peek_single = ref(false)

watch(() => card.value?.id, () => { peek_single.value = false })

const singleRevealed = computed(() =>
    !(ui_selection.value?.data?.faceDown ?? false) || peek_single.value)

// A rule's `position` names the face it is printed on. Every game has a default face that is
// not worth labelling — mtg calls it "Standard", wow "Front" — and only the others (Transform,
// Flip, Adventure, Reverse, …) earn a tag. Lifted from @cardcarp/deckbox's dialog-single.vue,
// which shows the same records.
const RULE_POSITION_DEFAULT = ['standard', 'front']

function rulePosition(rule) {
    const position = rule?.position
    return position && !RULE_POSITION_DEFAULT.includes(String(position).toLowerCase())
}

// === List state ===
// `card_list` is the working copy: top of deck first, the order the rows are shown in and the
// order a drag rewrites. It is rebuilt from the canvas whenever the pile changes underneath.
const card_list = ref([])
const search = ref('')
const filter_active = ref([])

// nodeIds the player has peeked at. A Set rather than a flag on the row so it survives the
// rebuild below — a draw or a peer's shuffle re-reads every row from the canvas, and peeks
// must not be forgotten just because the pile moved.
const peeked = ref(new Set())

// The card currently in hand, or null. Declared up here rather than with the rest of the drag
// state below because syncFromCanvas guards on it and runs immediately — a `const` further
// down the file would still be in its temporal dead zone when that first watcher fires.
const drag_row = ref(null)

// Re-read the pile from the canvas. Runs on selection change and on every canvas revision,
// which between them cover a draw on the number row, a shuffle from the toolbar, and a
// peer's action arriving over the relay.
function syncFromCanvas() {
    // Not while a row is in hand. A rebuild replaces every row object, so the card being
    // carried would no longer be the one in the list and the drop would quietly do nothing —
    // and it would invalidate the measured rects the drop slot is worked out from.
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

// A different pile is a different scry. Search, filters and peeks are all about the pile you
// were looking at, and carrying them across would silently hide most of the new one.
watch(groupId, () => {
    search.value = ''
    filter_active.value = []
    peeked.value = new Set()
    actions_row.value = null
})

// Whether a row shows its face: the canvas's own state, or a local peek on top of it.
function revealed(card) {
    return !card.faceDown || peeked.value.has(card.nodeId)
}

const filteredCards = computed(() => {
    const searchTerm = search.value.toLowerCase().trim()
    const activeFilters = filter_active.value

    return card_list.value.filter((card) => {
        if (!card) return false

        // A search matches only what the player can already see. Without this, typing a name
        // would answer a question about a face-down deck that nobody is entitled to ask —
        // even rendering the row as "Hidden" leaks it, because its presence is the answer.
        if ((searchTerm || activeFilters.length) && !revealed(card)) return false

        const name = card.name ? card.name.toLowerCase() : ''
        const matchesSearch = searchTerm === '' || name.includes(searchTerm)

        // OR across the selected values, not AND: the list mixes categories with themes, so
        // "Pokémon" + "Trainer" has to mean "show me both" — a card cannot be two categories,
        // and requiring all of them would return an empty deck. Empty selection = no filter.
        const matchesFilter = activeFilters.length === 0
            || activeFilters.some(value => cardMatchesFilter(card, value))

        return matchesSearch && matchesFilter
    })
})

const isFiltering = computed(() => !!search.value.trim() || filter_active.value.length > 0)

// The scry filter's vocabulary, straight from the game's config: simulator.card.scry — a flat list
// of plain strings ("Pokemon", "Trainer", "Energy").
//
// Shaped into list-filter's { value, label } options rather than passed as those bare strings.
// The control reads option.value and option.label off each entry, so a string arrives as a row
// with no text and, worse, no value: reka's SelectItem takes `value` as a required prop, and
// without one every row toggles `undefined` in and out of the selection instead of itself.
//
// No group key, and none wanted. The deckbox facets take their headings from a nested config;
// this vocabulary is flat by construction, so it draws as one unlabelled run of rows.
const filter_list = computed(() => {
    const scry = config.value?.simulator?.card?.scry
    if (!Array.isArray(scry)) return []
    return scry.map(value => ({ value, label: value }))
})

// A scry filter value can name either a card's category (an array: ["Creature"]) or one of
// its themes (an array: ["Human", "Cleric"]) — the published list deliberately mixes the two,
// since what a player wants to pull out of a deck doesn't respect that distinction. Both
// shapes are handled the same way, and neither property is required to exist.
function matchesProperty(prop, value) {
    return Array.isArray(prop) ? prop.includes(value) : prop === value
}

function cardMatchesFilter(card, value) {
    return matchesProperty(card.category, value) || matchesProperty(card.trait, value)
}

// === Reordering ===
function reindexCards() {
    card_list.value.forEach((c, index) => { c.order = index })
}

// Push the working order onto the canvas. Every path that changes the order calls this, so
// there is one place the table learns about a rearrangement.
function commitOrder() {
    if (!groupId.value) return
    cardSetGroupOrder(groupId.value, card_list.value.map(c => c.nodeId))
}

// Move a card to an insertion slot expressed against the RENDERED rows, which under a filter
// are not the deck. Dropping the third Pokémon above the first has to leave the energy cards
// sitting between them exactly where they were, so the slot is resolved to a real deck
// position first and every hidden card keeps its index.
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
    // The splice below removes the card before re-inserting it, so any target past its old
    // seat has already shifted down by one by the time we get there.
    if (to > from) to--
    if (to === from) return

    card_list.value.splice(from, 1)
    card_list.value.splice(to, 0, card)
    reindexCards()
    commitOrder()
}

// === Row drag ===
// `drag_row` (declared above, next to the list state it guards) is the card in hand.
// `drop_slot` is the gap the line is drawn in, indexed against the rendered rows: 0 is above
// the first, rows.length is below the last. `drop_zone` says which of the two drops is armed,
// so the pointer leaving both can disarm without either firing on release.
const drop_slot = ref(null)
const drop_zone = ref(null)   // 'list' | 'canvas' | null

// The scroll area, and through it the element that actually scrolls. Everything the
// drag does with the list — measuring the visible box, reading how far it is scrolled, driving
// the auto-scroll — is done to that inner viewport, not to the component wrapping it. Reka
// gives the viewport its own div, so a ref on the wrapper would be measuring the wrong box.
const scroll = useTemplateRef('scroll')
const list_el = computed(() => scroll.value?.viewport ?? null)

// Row geometry in the list's own content space, measured once per drag. Content space rather
// than screen space so it survives the auto-scroll below: only scrollTop changes, and that is
// read live.
//
// Measured on FIRST USE rather than when the drag activates, which is not the same moment and
// was a bug: the pointer crossing the threshold sets drag_x/drag_y and drag_item_isActive in
// one go, so both watchers below flush together — and watchers run in creation order, so the
// one that hit-tests ran before the one that measured. It read an empty array, and an empty
// array makes slotFromPointer return 0, which drew the line above the first row of the deck no
// matter where the pointer was. Measuring behind this flag makes the order irrelevant.
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

// Which gap the pointer is nearest, by comparing against each row's midpoint: past the middle
// of a row means the card is going below it. Walks from the top and takes the first row whose
// midpoint the pointer has not reached, so the answer is the first gap that fits.
function slotFromPointer(contentY) {
    for (let i = 0; i < row_bounds.length; i++) {
        if (contentY < row_bounds[i].mid) return i
    }
    return row_bounds.length
}

// A 60-card deck is several times the height of the bounded list, so without this a drag can
// only ever reach the dozen rows already on screen. Top and Bottom cover the extremes; this
// covers everything in between.
const AUTOSCROLL_EDGE = 28
const AUTOSCROLL_MAX = 12
let autoscroll_frame = null

function autoscrollFor(clientY, rect) {
    const el = list_el.value
    if (!el) return

    // Speed ramps with how far into the edge band the pointer is, so easing off slows the
    // scroll instead of stopping it dead.
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

// Where the card would land, recomputed as the pointer moves. Driven by a watcher on the drag
// store's coordinates rather than a move callback, so store/drag.js stays the small shared
// thing it is and this file owns everything specific to the list.
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

    // Anything over the table itself is a drop onto the canvas. Hit-tested rather than
    // measured, because the panel and the toolbars sit over the canvas element and a card
    // released on one of those should do nothing at all.
    const over = document.elementFromPoint(clientX, clientY)
    drop_zone.value = over?.closest('.canvas') ? 'canvas' : null
}

watch([drag_x, drag_y], () => {
    if (!drag_row.value || !drag_item_isActive.value) return
    updateDropTarget(drag_x.value, drag_y.value)
})

// The drag becoming active is the moment the row is committed to being carried — before the
// threshold it is still an ordinary click, which is why the blue in-hand state keys off this
// rather than off drag_row: a click that never moved should not flash the row.
// Once a held row is up, the finger is dragging it and must not also be scrolling the list.
// The row is touch-action: pan-y — that is what let the swipe scroll in the first place — and
// touch-action is latched for the whole gesture, so it cannot be tightened now that the hold
// has fired. preventDefault on a non-passive touchmove is what actually calls the pan off
// mid-gesture, which is why this is bound as a listener rather than expressed in CSS.
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
        // A row that is being carried has no use for an open strip, and the strip sits exactly
        // where the drop line wants to be read.
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

// A press still counting down, or a scroll still blocked, outlives a section that unmounts
// under it — the pile can be deselected by a peer mid-gesture.
onUnmounted(() => {
    endPress()
    setTouchScrollBlocked(false)
})

// onDrop runs before the store clears `drag_item_isActive`, so the target worked out during
// the move is still standing here.
//
// The card and the target are read into locals and `drag_row` is dropped BEFORE either branch
// acts, which is load-bearing rather than tidy. syncFromCanvas refuses to rebuild while a row
// is in hand, and both branches below change the pile — so acting first meant the rebuild they
// triggered arrived while the guard was still up and was thrown away, leaving a card the
// player had just dragged onto the table still listed in the deck. Nothing is in hand once the
// pointer is up, and saying so here is what lets the rebuild through.
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

// === Touch: tap, hold, or swipe ===
// A mouse can hover to reveal the strip and start a drag on the first pixel, because it can do
// both without either getting in the other's way. A finger has one gesture and three jobs, so
// the row reads its intent from how long it stays put:
//
//   swipe  → the list scrolls. Nothing is picked up; the row is touch-action: pan-y and the
//            browser owns the gesture, which is what makes scrolling feel native rather than
//            re-implemented.
//   tap    → the actions strip opens on that row, standing in for the hover a finger cannot do.
//   hold   → the row comes up and the drag runs exactly as it does on a mouse.
//
// The timing is the canvas's, not a new one: LONG_PRESS_MS and LONG_PRESS_SLOP are what a card
// on the table already uses to tell a press from a drag (@cardcarp/simulator's canvas-pixi/tools/card.js), so a hold means
// the same thing in both places.
const LONG_PRESS_MS = 300
const LONG_PRESS_SLOP = 8

// The row whose actions are open, by nodeId. Touch only — a mouse still uses hover, and a
// pointer that can hover has no use for a strip that has to be dismissed.
const actions_row = ref(null)

// The finger waiting to become a drag: { card, x, y, event }. One at a time.
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

// Past the slop the finger is scrolling, not holding. The browser is already panning by this
// point — pan-y let it — so this only has to stop the hold from firing underneath it.
function onPressMove(e) {
    if (!press) return
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) <= LONG_PRESS_SLOP) return
    endPress()
}

// Lifted before the hold matured: a tap. Opens this row's actions, or closes them if this row
// already had them — tapping the same row twice should put the list back how it was.
function onPressUp(e) {
    if (!press) return
    const card = press.card
    endPress()
    actions_row.value = actions_row.value === card.nodeId ? null : card.nodeId
}

// The browser took the gesture for its own scrolling. Not a tap and not a hold.
function onPressCancel() {
    endPress()
}

function beginRowDrag(e, card, { immediate = false } = {}) {
    drag_row.value = card
    needs_measure = true
    // The ghost is the shared one the table view renders, and it prints `name`. A card the
    // player has chosen not to peek at must not announce itself the moment they pick it up.
    rowDragStart(e, { ...card, name: revealed(card) ? card.name : 'Hidden' }, { immediate })
}

function onRowPointerDown(e, card) {
    // The hover strip is buttons, not a grab handle — starting a drag from one would make
    // every peek and every Top a failed drag.
    if (e.target.closest?.('[data-scry-action]')) return

    // A mouse commits on movement, as it always has: there is nothing to disambiguate, because
    // a mouse does not scroll by dragging.
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
        // The hold has already asked for the drag, so it starts picked up rather than waiting
        // for another six pixels the finger has no reason to travel.
        beginRowDrag(event, held, { immediate: true })
    }, LONG_PRESS_MS)

    // On window, not the row: the finger is free to end anywhere, and a press whose end is
    // never heard is a timer that fires into a gesture the player has already abandoned.
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

// === Card actions ===
// Draw and To Table remove the card from the pile, so the canvas revision they raise rebuilds
// this list on its own — no local splice needed.
function handle_cardToBoard(card) {
    cardDraw({ groupId: groupId.value, nodeId: card.nodeId, to: 'board' })
}

function handle_cardToHand(card) {
    cardDraw({ groupId: groupId.value, nodeId: card.nodeId, to: 'hand' })
}

// Local only, in both directions — see the note at the top of this file.
function handle_cardPeek(card) {
    const next = new Set(peeked.value)
    if (next.has(card.nodeId)) next.delete(card.nodeId)
    else next.add(card.nodeId)
    peeked.value = next
}

function handle_peekAll() {
    peeked.value = new Set(card_list.value.map(c => c.nodeId))
}

// Back to the table's own truth: cards genuinely face-up stay revealed, peeks drop away.
function handle_peekNone() {
    peeked.value = new Set()
}

// Shuffling ends the scry, so the peeks go with it — you no longer know where anything is.
// It does NOT force the pile face-down the way the old dialog's Shuffle did; that existed to
// undo peeks it had committed to the canvas, and nothing is committed any more.
function handle_shuffle() {
    if (!groupId.value) return
    peeked.value = new Set()
    cardShuffle(groupId.value)
}

// Hovering a row raises the shared card preview, the same affordance the deck builder's table
// rows have. Face-down cards are skipped: the row already renders as "Hidden", and previewing
// the face would hand back exactly what the player has not chosen to look at.
function onRowEnter(event, card) {
    if (!revealed(card)) return
    mouseover_cell_card(event, card, null)
}

function onRowLeave() {
    mouseleave_cell_card()
}

// A section that unmounts while a row is hovered fires no pointerleave, so the preview would
// be left floating over the table with its list gone.
//
// The is_dragging clear is scoped to a drag THIS section actually owns. It is a single boolean
// shared with the hand and the canvas, and clearing it unconditionally here reached across and
// switched off somebody else's guard: starting a canvas drag publishes uiSelection as
// { type: null } (see setTransforming), which lands in this watcher, which turned the canvas's
// own preview suppression off in the middle of the drag. It only showed up when a card had been
// selected first, because that is the only time this section is mounted to hear it.
watch(() => ui_selection.value.type, (type) => {
    if (type === 'card') return
    onRowLeave()
    if (drag_item_isActive.value) is_dragging.value = false
})
</script>

<template lang="pug">
//- Self-guarding on the selection type, the same contract the floating toolbars have (see
//- controls.js): the panel mounts every section it lists and each decides for itself whether
//- the current selection is its own.
Section(v-if="ui_selection.type === 'card' && (group || single)" id="card" :title="title")

    template(v-if="group")
        .scry(class="flex flex-col")

            //- Search, filter, and the two bulk peeks. One row, because the list below is the
            //- section and everything here is in service of finding a row in it.
            .controls(class="flex items-center gap-2")
                .field(class="relative grow")
                    input(
                        v-model="search" 
                        autocomplete="off"
                        spellcheck="false"
                        class="relative w-full h-7 pl-2 tracking-wide flex items-center text-3 text-white font-light leading-none bg-zinc-800 outline outline-black focus-within:outline-yellow-500/50 rounded-sm pointer-text transition-colors" 
                        placeholder="Search..."
                    )

                //- Same control as the deckbox facets, so a scry category behaves exactly
                //- like a Format or a Theme there. Empty means unfiltered, which is what the
                //- filter below already does with an empty array.
                ListFilter(
                    v-if="filter_list.length > 1"
                    v-model="filter_active"
                    label="Filter"
                    :options="filter_list"
                )

                //- Peek all / back to the table's truth. Deliberately NOT the pile-wide reveal
                //- — that changes what everyone sees and lives on the floating toolbar's Flip.
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

            //- The list scrolls inside its own bounded box rather than growing the panel's
            //- column. A sixty-row section would push View, Multiplayer and Seats a screen and
            //- a half down, which is the same as losing them.
            //-
            //- The cap lives on this wrapper and the scroll area fills it: it sizes itself with
            //- flex-1 + min-h-0, which needs a parent whose height is settled. max-h alone gives
            //- it one — the wrapper is content-height until the list outgrows the cap, and
            //- pinned at the cap after that, so short decks do not scroll and long ones do.
            .list-box(class="relative max-h-[25vh] mt-2 flex flex-col")

                //- `ref="scroll"` is load-bearing, not decoration: list_el reads the scrolling
                //- viewport through it, and every part of the drag — the box the pointer is
                //- tested against, the scroll offset, the auto-scroll — is measured on that
                //- element. Without the ref the drop zone can never resolve to 'list', which
                //- shows up as a drop line that never appears and a reorder that never lands.
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
                                //- The insertion line, drawn in the 4px gap ABOVE this row. Absolutely
                                //- positioned on purpose: a line that took up space would push every
                                //- row below it down by its own height each time the pointer crossed a
                                //- boundary, which is the twitching this rewrite exists to remove.
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

                                    //- Five verbs is more than a 256px row can show at rest, so they
                                    //- ride in on hover over the name's tail. Hidden while anything is
                                    //- being dragged: the strip sits under the pointer on the way past
                                    //- and would flicker across every row the drag crosses.
                                    //-
                                    //- A tap opens the same strip where there is no hover to open it
                                    //- with, and the hover rule is kept alongside rather than replaced:
                                    //- a mouse should not have to click a row to reach verbs it can
                                    //- already see, and a hybrid laptop gets whichever it reaches for.
                                    //-
                                    //- pointer-events tracks the opacity, and that pairing is the whole
                                    //- point rather than tidiness. Tailwind gates group-hover behind
                                    //- `@media (hover: hover)`, so on a phone the strip is never drawn —
                                    //- but an opacity-0 element is still hit-tested, so the right-hand
                                    //- third of every row was five invisible buttons, and a finger
                                    //- reaching for a row drew a card or sent it to the bottom of the
                                    //- deck instead. Unreachable until it is visible: the first tap
                                    //- lands on the row and opens the strip, the second reaches a verb.
                                    //-
                                    //- The tap that opens it cannot also press a button. A click's
                                    //- target is the common ancestor of its down and up targets, and
                                    //- both of those were hit-tested while the strip was still
                                    //- pointer-events: none — so the click resolves to the row, not to
                                    //- whichever verb the strip has since placed under the finger.
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

                            //- The last gap has no row under it to hang from, so it gets its own.
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
            //- A filter that matches nothing is the one case where an empty list is a result
            //- rather than a failure, so it says which it is. Outside the scroll area: there is
            //- nothing to scroll, and a scrollbar track beside one line of text reads as a bug.
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

    //- One card: what it is, rather than what to do with it. The verbs for a single card —
    //- rotate, flip, recolour, delete — are on the floating toolbar beside the card itself,
    //- which is where anything about an object's place on the table belongs. This is the other
    //- half: the printed text, which needs room the toolbar has not got.
    .detail(v-else-if="single" class="flex flex-col gap-1")

        //- Face-down stays face-down. Selecting a card is not a decision to look at it, and on
        //- a table with prizes and set cards the difference matters — so the readout offers the
        //- same local peek the deck list does rather than simply printing the card.
        template(v-if="!singleRevealed")
            //- NOT `.hidden`: pug turns a bare class name into a real class, and Tailwind's
            //- `hidden` utility is display:none — the row rendered correctly and then hid itself.
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

            //- The rules array, one block per printed face. `position` is only shown when it is
            //- not the game's default face, so an ordinary card carries no redundant tag.
            .rules(v-if="card.rule?.length" class="flex flex-col gap-3")
                .rule(v-for="(rule, i) in card.rule" :key="i" class="flex flex-col gap-1")
                    .tag(v-if="rulePosition(rule) || rule.name" class="flex gap-1.5 font-mono text-2.5 leading-none")
                        span(v-if="rulePosition(rule)" class="text-mist-500") {{ rule.position }}
                        span(v-if="rule.name" class="text-olive-500") {{ rule.name }}
                    .text(class="text-3 text-neutral-400 font-light leading-relaxed whitespace-pre-line") {{ rule.text }}

            .flavor(v-if="card.flavor" class="text-2.75 text-white/30 font-light italic leading-relaxed") {{ card.flavor }}
</template>
