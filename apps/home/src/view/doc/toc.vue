<script setup>
// Core
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'

const props = defineProps({
    items: { type: Array, default: () => [] },
    root: { type: Function, default: null }
})

const active = ref('')

function rootEl() {
    return props.root?.() ?? null
}

function headingEl(root, id) {
    return root.querySelector(`#${CSS.escape(id)}`)
}

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

    const scrolls = root.scrollHeight > root.clientHeight + 4
    if (scrolls && root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
        current = props.items[props.items.length - 1].id
    }

    active.value = current
}

useEventListener(rootEl, 'scroll', () => sync(), { passive: true })

let ro = null

onMounted(() => {
    sync()

    const root = rootEl()
    if (!root || typeof ResizeObserver === 'undefined') return

    const content = root.firstElementChild ?? root
    ro = new ResizeObserver(() => sync())
    ro.observe(content)
})

onBeforeUnmount(() => {
    ro?.disconnect()
    ro = null
})

watch(() => props.items, () => {
    active.value = props.items[0]?.id ?? ''
    sync()
}, { flush: 'post' })

function go(id) {
    const root = rootEl()
    const el = root && headingEl(root, id)
    if (!el) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const delta = el.getBoundingClientRect().top - root.getBoundingClientRect().top
    root.scrollTo({ top: root.scrollTop + delta - 24, behavior: reduced ? 'auto' : 'smooth' })

    active.value = id
}

const show = computed(() => props.items.length > 0)
</script>

<template lang="pug">
nav(
    v-if="show"
    class="sticky top-6 w-64 max-h-full justify-self-start self-start flex-none hidden lg:flex flex-col gap-3 leading-tight overflow-y-auto"
)
    .title(class="pt-2 text-3 text-zinc-500 font-stretch-120%") On this page

    .items(class="relative flex flex-col")
        .divider(class="absolute top-0 left-0 w-px h-full bg-mauve-700")

        .btn(
            v-for="item in items"
            :key="item.id"
            @click="go(item.id)"
            class="group/toc relative py-2 pl-4 pr-2 text-left text-3.25 font-light hover:text-white cursor-pointer"
            :class="active === item.id ? 'text-white!' : 'text-neutral-500'"
        )

            .bar(
                class="absolute left-0 top-0 w-px h-full bg-linear-to-b from-sky-500 to-rose-500"
                :class="active === item.id ? 'opacity-100' : 'opacity-0'"
            )

            span(class="block truncate") {{ item.name }}
</template>
