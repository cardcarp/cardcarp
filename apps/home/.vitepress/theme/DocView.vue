<script setup>
// A documentation page inside the shell: header, breadcrumbs, the page body, the
// pager, and the right rail. Ported from src/view/doc/index.vue.
//
// What changed in the port is mostly what this no longer does:
//
//   - The body is VitePress's <Content />. A converted page is Markdown; a page
//     not converted yet, or a draft, is the dynamic route site/[pkg]/[slug].md,
//     which renders the old component or the placeholder itself.
//   - A slug in no tree never reaches here — there is no HTML file for it, so it
//     is VitePress's 404, and Layout.vue renders NotFound with this tree's way back.
//   - The head is resolved at build time from the tree (see config.mjs), so the
//     title and description are in the HTML rather than set by script.

// Core
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

// Components
import CodeBlock from '@/part/code-block.vue'
import Toc from '@/view/doc/toc.vue'

// Data
import { doc, findPage, neighbours } from '@/view/doc/tree.js'
import { loader } from '@/view/doc/loader.js'
import { pageHref } from './link.js'

const props = defineProps({
    pkg: { type: String, required: true },   // 'deckbox' | 'simulator' | 'compile'
    slug: { type: String, default: '' }      // '' is the package's index page
})

const { page: data, params } = useData()
const route = useRoute()

const tree = computed(() => doc(props.pkg))
const page = computed(() => findPage(props.pkg, props.slug))
const link = computed(() => neighbours(props.pkg, props.slug))

// The doc column's scroll container, handed to the rail so it can measure and
// scroll the right box.
//
// Found by querying inside this view's own root rather than by putting a ref on
// the Reka component: a `ref` on one of those yields a component instance whose
// `$el` is not the scrolling div, so the rail attached its scroll listener to
// nothing and silently never updated — the kind of failure that looks like it
// works, because the first entry is correct until you scroll.
//
// Scoped to `shell` rather than a bare document query, so it cannot pick up
// some other route's scroll area, and written as a getter so the rail always
// re-resolves rather than holding a node across a re-render.
const shell = ref(null)
const viewportEl = () => shell.value?.querySelector('[data-reka-scroll-area-viewport]') ?? null

// The right rail's contents.
//
// A Markdown page's come from its own h2s, extracted at build time — so they are
// in the pre-rendered HTML, and there is no list to keep in step with the
// headings. A page not converted yet still declares `export const toc`, read off
// its module as before, which only happens in the browser.
const legacyToc = shallowRef([])

const toc = computed(() => {
    if (params.value?.kind === 'legacy') return legacyToc.value
    return (data.value.headers ?? []).map((header) => ({ id: header.slug, name: header.title }))
})

watch(() => route.path, async () => {
    legacyToc.value = []
    if (params.value?.kind !== 'legacy') return

    const load = loader(props.pkg, page.value)
    if (!load) return

    const path = route.path
    const mod = await load()

    // The await means another navigation may have landed while this was in
    // flight — a fast click through the tree does exactly that. Drop the result
    // if it is no longer the page being shown.
    if (route.path !== path) return

    legacyToc.value = mod.toc ?? []
}, { immediate: true })

// Where the column lands on arrival: the heading the URL names, or the top.
//
// VitePress scrolls the WINDOW on navigation, and this page scrolls inside its
// own container, so both cases are handled here — a new page would otherwise
// open at the previous page's scroll position, and a /page#heading link would
// open at the top.
function land() {
    const root = viewportEl()
    if (!root) return

    const id = decodeURIComponent(window.location.hash.slice(1))
    const target = id && document.getElementById(id)

    if (target && root.contains(target)) {
        const delta = target.getBoundingClientRect().top - root.getBoundingClientRect().top
        root.scrollTo({ top: root.scrollTop + delta - 24, behavior: 'instant' })
    } else {
        root.scrollTo({ top: 0, behavior: 'instant' })
    }
}

onMounted(land)
watch(() => route.path, () => nextTick(land), { flush: 'post' })

// The install line a package's index page leads with, and the only sample the
// shell owns rather than a page — it belongs to the package rather than to any
// one page of its docs, and the header is where a reader looks for it.
//
// npm unless the tree says otherwise: Compile is Python, installed with pip from
// its git repository, and states its own line in tree.js.
const install = computed(() => tree.value?.install ?? `npm install ${tree.value?.package ?? ''}`)
</script>

<template lang="pug">
//- `min-w-0` beside the `min-h-0`: this is a flex item in the home shell's row,
//- so its automatic minimum is its CONTENT's minimum rather than zero. A code
//- sample too wide to shrink would otherwise hold the whole column open and push
//- the page off a narrow screen — which is also why every sample scrolls inside
//- its own box (see part/code-block.vue).
//- The page and its rail are one panel, not two: the rail is chrome for what is
//- beside it, and floating it in its own card would read as a second document.
.doc-view(
    ref="shell"
    class="relative flex-1 min-w-0 min-h-0 flex z-10 bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl"
    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
)
    ScrollAreaRoot(
        class="group/scroll relative flex-1 min-w-0 min-h-0 flex flex-col rounded-xl overflow-hidden"
        type="auto"
        style="--reka-scroll-area-thumb-width: 4px"
    )
        ScrollAreaViewport(class="relative flex-1 min-h-0 w-full")

            .blur-wrapper(class="absolute inset-0 pointer-events-none z-50")
                .blur(class="sticky top-0 w-full h-10 backdrop-blur-3xl mask-b-from-0")

            .header(class="h-15 flex items-center gap-20")
                .title(class="flex-none px-6 flex items-end gap-3 leading-none")


                    svg(v-if="tree.name === 'Compile'" class="relative top-0.5 size-6 text-mist-400 mask-b-from-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M18 19a5 5 0 0 1-5-5v8")
                        path(d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5")
                        circle(cx="13" cy="12" r="2")
                        circle(cx="20" cy="19" r="2")

                    svg(v-else-if="tree.name === 'Deckbox'" class="relative top-0.5 size-6 text-sky-400 mask-b-from-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2")
                        rect(x="14" y="2" width="8" height="8" rx="1")

                    svg(v-else class="relative top-0.5 size-6 text-rose-500 mask-b-from-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z")
                        path(d="M5 3a2 2 0 0 0-2 2")
                        path(d="M19 3a2 2 0 0 1 2 2")
                        path(d="M5 21a2 2 0 0 1-2-2")
                        path(d="M9 3h1")
                        path(d="M9 21h2")
                        path(d="M14 3h1")
                        path(d="M3 9v1")
                        path(d="M21 9v2")
                        path(d="M3 14v1")

                    span(class="relative top-px text-4 text-white font-bold font-stretch-expanded capitalize") {{ tree.name }}
                .graphic(class="relative grow h-full flex items-end")
                    svg(class="absolute right-full bottom-0" width="62" height="63" viewBox="0 0 62 63" fill="none")
                        path(class="stroke-neutral-800" stroke-width="2" transform="translate(0 1)" d="M1.86 1L28.74 46.31C34.15 55.42 43.95 61 54.54 61H62")
                        path(class="stroke-black" stroke-width="2" d="M1.86 1L28.74 46.31C34.15 55.42 43.95 61 54.54 61H62")
                    .dividers(class="relative size-full flex flex-col justify-end z-1")
                        .divider-dark(class="w-full h-0.5 bg-black")
                        .divider-light(class="w-full h-px bg-neutral-800")

            .columns(class="px-6 pt-4 w-full grid grid-cols-[minmax(0,max-content)_1fr] gap-12")

                .column(class="w-full")

                    //- Always three deep: the doc trees are flat, so every page
                    //- sits directly under its package's index.
                    nav.breadcrumbs(aria-label="Breadcrumb" class="flex gap-2 items-center text-3 text-zinc-500 font-stretch-120%")
                        a(
                            href="/"
                            class="group/btn relative hover:text-white"
                        ) Home
                        span(aria-hidden="true" class="relative top-px text-6 font-extralight font-stretch-100% text-neutral-700 cursor-default") /
                        a(
                            :href="`/${pkg}`"
                            class="group/btn relative hover:text-white"
                        ) {{ tree.name }}
                        span(aria-hidden="true" class="relative top-px text-6 font-extralight font-stretch-100% text-neutral-700 cursor-default") /
                        span(aria-current="page" class="group/btn relative text-white cursor-default") {{ page.name }}

                    header(class="mt-3 flex flex-col gap-3 leading-none")
                        h1(class="text-white text-8 font-semibold font-stretch-120%") {{ page.name }}


                    //- The package's own install line, on its index page only.
                    CodeBlock(v-if="!page.slug" :code="install" label="shell")

                    //- The page itself: rendered Markdown, or — from the dynamic route — a
                    //- page not converted yet, or a draft's placeholder.
                    Content(class="block mt-8 prose")

                    //- Prev / next along the flattened tree.
                    .pager(v-if="link.prev || link.next" class="mt-16 flex gap-3")
                        a(
                            v-if="link.prev"
                            :href="pageHref(pkg, link.prev)"
                            class="group/btn flex-1 px-4 py-3 flex flex-col gap-1.5 text-left bg-black/30 rounded-lg leading-none hover:brightness-125"
                            style="box-shadow: inset 0 0 0 1px hsl(0 0 100 / 0.04)"
                        )
                            .label(class="font-mono text-2.5 text-white/25") Previous
                            .name(class="text-3.5 text-neutral-400 font-light truncate group-hover/btn:text-white") {{ link.prev.name }}

                        a(
                            v-if="link.next"
                            :href="pageHref(pkg, link.next)"
                            class="group/btn flex-1 px-4 py-3 flex flex-col gap-1.5 text-right bg-black/30 rounded-lg leading-none hover:brightness-125"
                            style="box-shadow: inset 0 0 0 1px hsl(0 0 100 / 0.04)"
                        )
                            .label(class="font-mono text-2.5 text-white/25") Next
                            .name(class="text-3.5 text-neutral-400 font-light truncate group-hover/btn:text-white") {{ link.next.name }}

                    .tail(class="h-10")

                Toc(
                    v-if="toc.length"
                    :items="toc"
                    :root="viewportEl"
                )

        ScrollAreaScrollbar(
            orientation="vertical"
            class="absolute flex pr-1 py-2 select-none touch-none rounded-full z-51"
        )
            ScrollAreaThumb(class="flex-1 bg-neutral-500 rounded hover:bg-white cursor-grab active:cursor-grabbing")

</template>
