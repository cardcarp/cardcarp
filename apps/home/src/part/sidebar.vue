<script setup>
// Core
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

// Components
import DocNav from '@/view/doc/nav.vue'
import DocSearch from '@/view/doc/search.vue'

// Data
import { doc, packages } from '@/view/doc/tree.js'
import { segments } from '@/link.js'

// State
import { useProfileStore } from '@cardcarp/core/store/profile.js'

// Assign
const route = useRoute()
const { dialog_about_active } = useProfileStore()

const path = computed(() => segments(route.path))

const level = computed(() => {
    const pkg = packages.find((p) => path.value[0] === p)
    return pkg ?? 'root'
})

const tree = computed(() => (level.value === 'root' ? null : doc(level.value)))

const direction = ref(1)

watch(level, (to) => {
    direction.value = to === 'root' ? -1 : 1
})

const nav = computed(() => ({
    home: { href: '/', label: 'Home', active: path.value.length === 0 },
    deckbox: { href: '/deckbox', label: 'Deckbox' },
    simulator: { href: '/simulator', label: 'Simulator' },
    compile: { href: '/compile', label: 'Compile' },
    examples: { href: '/examples', label: 'Examples', active: path.value[0] === 'examples' }
}))

const query = ref('')

watch(level, () => {
    query.value = ''
})

function preloadSearch() {
    import('../../.vitepress/theme/search.data.js')
}

const emit = defineEmits(['navigate'])

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

.nav(
    @click="onNavClick"
    class="relative grow mt-4 xl:mt-4 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none text-3.5 font-light leading-none"
)
    Transition(:name="direction > 0 ? 'level-in' : 'level-out'")
        .level(:key="level" class="flex flex-col gap-1")

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

            template(v-else)
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
                DocNav(v-else :pkg="level" class="mt-4")

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
