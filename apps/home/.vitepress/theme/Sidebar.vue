<script setup>
// The sidebar, which has two levels and shows one at a time.
//
//   root      the sections — Home, Deckbox, Simulator, Compile, Examples
//   <package> that package's documentation tree, under a header that names it
//
// Entering a package REPLACES the section list rather than expanding beneath it.
// A docs tree is fifteen rows deep; hung under three siblings it buries them,
// and the reader who is inside one package is not usually shopping for another.
// The way back is the grid button in the header, which is the only affordance
// the deeper level owes the shallower one.
//
// The level is a pure function of the route — there is no "which level am I on"
// state to fall out of step with the URL, and the grid button is a plain link
// home rather than a toggle. `direction` is the one piece of local state, and it
// exists only so the transition can tell going in from coming back.
//
// It is a fragment on purpose: home docks these blocks straight into a flex
// column and relies on the nav region growing to push the footer down, so
// wrapping them in a root element here would change that layout.
//
// Ported from src/part/sidebar.vue onto VitePress's router: links are plain anchors (VitePress
// intercepts them), and the level is read off the path rather than the route name.
//
// Core
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

// Components
import DocNav from './DocNav.vue'
import DocSearch from './DocSearch.vue'

// Data
import { doc, packages } from '@/view/doc/tree.js'
import { segments } from './link.js'

// State
import { useProfileStore } from '@cardcarp/core/store/profile.js'

// Assign
const route = useRoute()
const { dialog_about_active } = useProfileStore()

// Which level the current route puts us on: a path under one of the tree's
// packages is that package's level, anything else is the root. Read off the
// tree rather than listed again here — a third package needs no edit.
const path = computed(() => segments(route.path))

const level = computed(() => {
    const pkg = packages.find((p) => path.value[0] === p)
    return pkg ?? 'root'
})

const tree = computed(() => (level.value === 'root' ? null : doc(level.value)))

// Which way the panels travel. Anything into a package reads as going deeper
// (including package to package, which is what a cross-link between the two
// trees does); only the return to the section list reads as coming back.
//
// Written in a watcher rather than derived, because it is a fact about the
// TRANSITION and not about either level: the exiting panel and the entering one
// have to agree on it, and the watcher fires before either renders. It picks the
// transition NAME, which is how the two directions get mirrored CSS.
const direction = ref(1)

watch(level, (to) => {
    direction.value = to === 'root' ? -1 : 1
})

// The section list. Home and Examples can be the current page; the three tools
// cannot — entering one changes the level, so a lit pill on this list would mark
// a level you are no longer looking at.
const nav = computed(() => ({
    home: { href: '/', label: 'Home', active: path.value.length === 0 },
    deckbox: { href: '/deckbox', label: 'Deckbox' },
    simulator: { href: '/simulator', label: 'Simulator' },
    compile: { href: '/compile', label: 'Compile' },
    examples: { href: '/examples', label: 'Examples', active: path.value[0] === 'examples' }
}))

// The package level's filter. While it holds a query, the tree below is replaced
// by the matches (see DocSearch.vue). Cleared on the way to another level, so
// entering a package always shows its tree first rather than a search you ran
// somewhere else.
const query = ref('')

watch(level, () => {
    query.value = ''
})

// Start fetching the index as soon as the reader shows intent, so it has usually
// arrived by the first keystroke. The module cache makes repeat calls free.
function preloadSearch() {
    import('./search.data.js')
}

// Dismissing is the host's business — it owns the panel. Only the nav emits:
// the footer deliberately does not, because About opens a dialog over the panel
// and the other two open new tabs.
const emit = defineEmits(['navigate'])

// Only a click that lands on a link closes the panel. The whole nav used to
// emit, which on a phone meant tapping the filter to type into it closed the
// menu before the keyboard came up — and so did a tap on a section heading or
// the space between rows.
function onNavClick(event) {
    if (event.target.closest('a')) emit('navigate')
}
</script>

<template lang="pug">
.header(
    class="relative py-3 flex items-center justify-center leading-none bg-linear-to-br to-zinc-950 from-zinc-900"
    style="box-shadow: inset 0 -1px 0 0 black, 0 2px 0 0 hsl(0 0 10)"
)
    img(src="https://storage.cardcarp.com/site/image/logo.png" class="relative w-30 xl:w-40 text-white")

//- One delegated close for every link below, which also catches a tap on the
//- section already showing — that fires no route change. Links only: see
//- onNavClick.
//-
//- `overflow-x-hidden` is what stops a sliding panel widening the sidebar
//- mid-transition; the vertical axis stays scrollable because a docs tree can be
//- taller than a short window.
.nav(
    @click="onNavClick"
    class="relative grow mt-4 xl:mt-4 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none text-3.5 font-light leading-none"
)
    //- Vue's own Transition rather than motion-v, which the rest of this app uses:
    //- AnimatePresence's exit does not reliably complete here, and its `wait` mode
    //- holds the incoming child until it does — so the sidebar sits on the level
    //- you just left.
    //-
    //- Which is the trap this deliberately avoids, and the reason there is no
    //- `mode` here either. Both `wait` and `out-in` gate the new content on the
    //- old content's animation finishing, so WHAT THE SIDEBAR SHOWS depends on an
    //- animation completing — and animations do not always complete. A
    //- backgrounded tab starves requestAnimationFrame, which is enough to strand
    //- the leave halfway and leave the nav on the wrong level.
    //-
    //- So the entering level mounts immediately and in flow, and the leaving one
    //- is lifted out of flow to fade out over it (see style/main.css). Nothing
    //- about correctness waits on a transition; the worst a stalled animation can
    //- now do is leave a ghost that the next navigation clears.
    Transition(:name="direction > 0 ? 'level-in' : 'level-out'")
        .level(:key="level" class="flex flex-col gap-1")

            //- ── Root: the sections ───────────────────────────────────────────
            template(v-if="level === 'root'")
                a(
                    :href="nav.home.href"
                    class="group/btn relative"
                )
                    .tab(
                        class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
                        :class="nav.home.active ? 'block!' : ''"
                    )
                    .padding(class="px-4")
                        .pill(
                            class="px-3 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg"
                            :class="nav.home.active ? 'bg-zinc-800 text-white!' : ''"
                        )
                            svg(class="relative flex-none size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M12 10.189V14")
                                path(d="M12 2v3")
                                path(d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6")
                                path(d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76")
                                path(d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1")
                            span(class="relative block min-w-0 truncate") {{ nav.home.label }}

                //- The two packages. A chevron rather than an active bar: these
                //- lead to a level of their own, which is a different promise
                //- from the pills above and below them.
                a(
                    :href="nav.compile.href"
                    class="group/btn relative"
                )
                    .padding(class="px-4")
                        .pill(class="px-3 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg")
                            svg(class="relative flex-none size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M18 19a5 5 0 0 1-5-5v8")
                                path(d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5")
                                circle(cx="13" cy="12" r="2")
                                circle(cx="20" cy="19" r="2")
                            span(class="relative block grow min-w-0 truncate") {{ nav.compile.label }}
                            svg(class="flex-none size-4 text-white/25 group-hover/btn:text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m9 18 6-6-6-6")
                                
                a(
                    :href="nav.deckbox.href"
                    class="group/btn relative"
                )
                    .padding(class="px-4")
                        .pill(class="px-3 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg")
                            svg(class="relative flex-none size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2")
                                rect(x="14" y="2" width="8" height="8" rx="1")
                            //- `min-w-0` is what lets `truncate` bite: as a flex item this span's
                            //- automatic minimum is its own text width, so it would otherwise push
                            //- the pill wider than the sidebar rather than clip.
                            span(class="relative block grow min-w-0 truncate") {{ nav.deckbox.label }}
                            svg(class="flex-none size-4 text-white/25 group-hover/btn:text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m9 18 6-6-6-6")

                a(
                    :href="nav.simulator.href"
                    class="group/btn relative"
                )
                    .padding(class="px-4")
                        .pill(class="px-3 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg")
                            svg(class="relative flex-none size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
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
                            span(class="relative block grow min-w-0 truncate") {{ nav.simulator.label }}
                            svg(class="flex-none size-4 text-white/25 group-hover/btn:text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m9 18 6-6-6-6")

                a(
                    :href="nav.examples.href"
                    class="group/btn relative"
                )
                    .tab(
                        class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
                        :class="nav.examples.active ? 'block!' : ''"
                    )
                    .padding(class="px-4")
                        .pill(
                            class="px-3 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg"
                            :class="nav.examples.active ? 'bg-zinc-800 text-white!' : ''"
                        )
                            svg(class="relative flex-none size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m16 6 4 14")
                                path(d="M12 6v14")
                                path(d="M8 8v12")
                                path(d="M4 4v16")
                            span(class="relative block min-w-0 truncate") {{ nav.examples.label }}

            //- ── A package: its documentation tree ────────────────────────────
            template(v-else)
                //- Grid back to the sections, then the package's own name linking
                //- to its index — the two-part header the pattern this follows
                //- uses, and the reason the tree below needs no "back" row.
                .head(class="px-4 flex items-center gap-2")
                    a(
                        href="/"
                        aria-label="All sections"
                        class="flex-none p-2 flex items-center justify-center text-white/40 rounded-lg hover:text-white hover:bg-zinc-800"
                    )
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            <path d="M9 14 4 9l5-5"/>
                            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>

                    .divider(class="flex-none w-px h-5 bg-neutral-800")

                    .name( class="min-w-0 px-2 py-2 text-white font-normal font-stretch-120% truncate") {{ tree?.name }}
                
                .filter(class="relative px-5 mt-2")
                    input(
                        v-model="query"
                        type="text"
                        placeholder="Filter..."
                        :aria-label="`Search the ${tree?.name} docs`"
                        autocomplete="off"
                        spellcheck="false"
                        @focus="preloadSearch"
                        @keydown.esc="query = ''"
                        class="w-full min-w-0 h-8 px-2 font-mono text-3 text-white placeholder:text-neutral-600 leading-none bg-zinc-950 rounded truncate placeholder-shown:outline-0 focus:outline-1 focus:outline-emerald-500 outline-1 outline-sky-500 transition-colors"
                        style="box-shadow: inset 0 -1px 0 0 black, 0 2px 0 0 hsl(0 0 10)"
                    )

                DocSearch(v-if="query.trim()" :pkg="level" :query="query" class="mt-4 px-4")
                DocNav(v-else :pkg="level" class="mt-4 px-4")

//- Route-specific actions land above the links every route shares.
slot

.footer(class="mt-5 px-5 pb-5")
    .mask(class="mask-x-from-80% mask-x-to-99%")
        .divider-dark(class="w-full h-0.5 bg-black")
        .divider-light(class="w-full h-px bg-white/5")
    .btns(class="mt-3 flex flex-col gap-2 font-mono text-3 text-neutral-500")

        .row(class="flex gap-2")
            .btn(
                @click="dialog_about_active = true"
                class="flex-1 h-7 px-2 flex items-center justify-center gap-2 bg-linear-to-br from-zinc-800 to-zinc-950 rounded-md hover:brightness-110 hover:text-white cursor-pointer"
                style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
            )
                .text(class="") About

            a(
                href="https://chat.cardcarp.com"
                target="_blank"
                class="flex-1 h-7 px-2 flex items-center justify-center gap-2 bg-linear-to-br from-zinc-800 to-zinc-950 rounded-md hover:brightness-110 hover:text-white"
                style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
            )
                .text(class="") Discord

        a(
            href="https://patronage.cardcarp.com"
            target="_blank"
            class="h-7 px-2 flex items-center justify-center gap-2 bg-linear-to-br from-zinc-800 to-zinc-950 rounded-md hover:brightness-110 hover:text-white"
            style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
        )
            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M10 2v2")
                path(d="M14 2v2")
                path(d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1")
                path(d="M6 2v2")
            .text(class="") Patronage
</template>
