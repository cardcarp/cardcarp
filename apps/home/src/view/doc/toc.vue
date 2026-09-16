<script setup>
// The right rail — this page's headings, and which one you are looking at.
//
// The contents are hand-written per page (`export const toc` beside the page's
// `h2#id` anchors) rather than scraped out of the rendered template. A page is
// a Vue component and can put anything in its body, so there is no reliable
// "the headings" to scrape; declaring them means a page also gets to leave one
// out, or word an entry differently from the heading it points at.
//
// Everything here works against the doc view's scroll container rather than the
// window — the page scrolls inside a Reka ScrollAreaViewport, so `scrollTop`,
// `scrollIntoView` and any observer rooted at the document would all be
// measuring the wrong box.

// Core
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'

const props = defineProps({
    // [{ id, name }] in document order.
    items: { type: Array, default: () => [] },

    // The scrolling element the headings live in. A function so the parent can
    // hand over a Reka component's `$el` once it exists, without this having to
    // know what a ScrollAreaViewport is.
    root: { type: Function, default: null }
})

const active = ref('')

function rootEl() {
    return props.root?.() ?? null
}

function headingEl(root, id) {
    // CSS.escape because these ids come from a hand-written array, and one that
    // starts with a digit or carries a dot is a valid id but an invalid bare
    // selector — a silent "TOC does nothing" rather than an error.
    return root.querySelector(`#${CSS.escape(id)}`)
}

// The active entry is the last heading that has passed the reading line — a
// third of the way down the container. Computed from rects on each scroll
// rather than tracked with an IntersectionObserver: an observer goes quiet
// between two widely-spaced headings and has to be told what to do about it,
// and this is the arithmetic that answer would have come to anyway.
function sync() {
    const root = rootEl()
    if (!root || !props.items.length) return

    const top = root.getBoundingClientRect().top
    const line = root.clientHeight * 0.3

    let current = props.items[0].id
    for (const item of props.items) {
        const el = headingEl(root, item.id)
        if (el && el.getBoundingClientRect().top - top <= line) current = item.id
    }

    // Scrolled to the very bottom, the last heading may never cross the line —
    // a short final section can sit entirely below it. Whoever is down there is
    // reading the last thing on the page.
    //
    // Guarded on the container actually scrolling. Without that it also fires
    // when there is nothing to scroll YET, which is the state this runs in
    // before the page's body has laid out — and it would light the last entry
    // on a page sitting at the top.
    const scrolls = root.scrollHeight > root.clientHeight + 4
    if (scrolls && root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
        current = props.items[props.items.length - 1].id
    }

    active.value = current
}

// Called straight from the scroll handler, with no requestAnimationFrame
// throttle in front of it. One pass reads a rect per entry, and the entries are
// hand-written per page — a long one has five. That is cheap enough that a
// throttle would be buying nothing, while costing the thing throttles cost
// here: a tab that is not painting gets no frames, so a rAF-gated rail simply
// stops updating and shows whichever section was current when it went away.
useEventListener(rootEl, 'scroll', () => sync(), { passive: true })

// The page body is an async component, so at first paint the container is empty
// and every heading measures as already passed. Rather than guess at a delay,
// watch the content box and re-resolve whenever it changes size — which also
// covers the web font landing and a code block reflowing.
let ro = null

onMounted(() => {
    sync()

    const root = rootEl()
    if (!root || typeof ResizeObserver === 'undefined') return

    // Reka wraps the viewport's children in a content div; that is the box that
    // grows, not the viewport itself.
    const content = root.firstElementChild ?? root
    ro = new ResizeObserver(() => sync())
    ro.observe(content)
})

onBeforeUnmount(() => {
    ro?.disconnect()
    ro = null
})

// A new page arrives with the container already at the top, and its own
// headings — so the rail has to re-resolve rather than keep the last page's
// answer. The DOM is a tick behind the prop, hence the flush.
watch(() => props.items, () => {
    active.value = props.items[0]?.id ?? ''
    sync()
}, { flush: 'post' })

// Scroll the container, not the heading: `scrollIntoView` would also scroll
// every scrollable ancestor, and on a phone-width layout that includes the page
// behind this one.
function go(id) {
    const root = rootEl()
    const el = root && headingEl(root, id)
    if (!el) return

    // Honour a reduced-motion preference: a long smooth scroll is exactly the
    // kind of large-area movement that setting exists to switch off.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const delta = el.getBoundingClientRect().top - root.getBoundingClientRect().top
    root.scrollTo({ top: root.scrollTop + delta - 24, behavior: reduced ? 'auto' : 'smooth' })

    // Set straight away rather than waiting for the scroll to arrive and the
    // handler to work it out: you clicked this entry, so it is the answer, and a
    // rail that lights up a beat later feels broken. The scroll handler will
    // re-derive it when the movement settles.
    active.value = id
}

const show = computed(() => props.items.length > 0)
</script>

<template lang="pug">
nav(
    v-if="show"
    class="sticky top-6 justify-self-start self-start flex-none w-full pr-12 flex flex-col gap-3 leading-none max-h-full overflow-y-auto"
)
    .title(class="pt-3 text-3 text-zinc-500 font-stretch-120%") On this page

    .items(class="flex flex-col")
        button(
            v-for="item in items"
            :key="item.id"
            type="button"
            @click="go(item.id)"
            class="group/toc relative py-2 pl-3 pr-2 text-left text-3.25 font-light hover:text-white"
            :class="active === item.id ? 'text-white!' : 'text-neutral-500'"
        )
            .bar(
                class="absolute left-0 top-1 w-0.5 h-[calc(100%-0.5rem)] rounded-r bg-linear-to-b from-sky-500 to-rose-500"
                :class="active === item.id ? 'opacity-100' : 'opacity-0'"
            )
            span(class="block truncate") {{ item.name }}
</template>
