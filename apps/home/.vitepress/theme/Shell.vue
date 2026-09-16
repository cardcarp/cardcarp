<script setup>
// Home shell: the persistent sidebar (./Sidebar.vue — logo + section nav +
// footer) alongside the page, which Layout.vue passes in through the slot.
// Ported from src/view/home/index.vue; active nav state is still derived from
// the current route rather than local state, so each section is a real,
// deep-linkable URL.
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'

// Components
import DialogAbout from '@/part/dialog-about.vue'
import Sidebar from './Sidebar.vue'

// Below `xl` the sidebar doubles as a floating overlay menu. Crossing back up
// to the desktop layout resets it, so the docked sidebar never inherits the
// open state (and never leaves a stale overlay behind). 80rem is Tailwind's
// `xl` — it has to track the breakpoint the template lays out on.
const menu_active = ref(false)
const is_desktop = useMediaQuery('(min-width: 80rem)')

watch(is_desktop, (desktop) => {
    if (desktop) menu_active.value = false
})

// The sidebar stays mounted at every width so the docked desktop layout never
// depends on the menu — which rules out an enter/exit and makes this a plain
// animated state instead.
//
// It is a CSS transition rather than a <Motion>, and that is not a style
// preference. Wrapping the sidebar in one froze everything inside it: motion-v
// stopped re-rendering its slot on route changes, so the nav's active states —
// and vue-router's own `router-link-active` classes, which are applied from
// inside RouterLink — kept pointing at whichever route first mounted the panel.
// The bug hides from a page reload, because a reload remounts the subtree and
// the first render is always correct; only a client-side navigation shows it.
//
// `visibility` transitions as a discrete step at the end of the duration, which
// is what drops the closed panel out of the tab order and stops it taking
// clicks — but only once the fade has finished, which is what we wanted from it.
//
// Docked-at-`xl` is a CSS breakpoint below (`xl:opacity-100` and friends), not
// `is_desktop` here. The page is pre-rendered, and a media query has no answer
// at build time — `useMediaQuery` reports false, so a JS-driven class would ship
// every desktop page with its sidebar hidden until hydration flipped it on.
// `is_desktop` is left to do the one thing that is genuinely client-side:
// closing the overlay when the window grows past the breakpoint.
const sidebar_visible = computed(() => menu_active.value)

</script>

<template lang="pug">
.home-view(class="relative p-3 w-dvw h-dvh flex gap-3 bg-black overflow-hidden")

    DialogAbout

    .mobile-menu-btn(@click="menu_active = true" class="xl:hidden absolute top-7 right-8 size-6 flex items-center justify-center text-white bg-mauve-700 rounded-lg z-20")
        svg(class="relative size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
            path(d="m15 18-6-6 6-6")

    //- Unmounted rather than faded in place: a full-bleed `backdrop-blur` layer
    //- costs the compositor even at opacity 0, and this one sits over the whole
    //- viewport on phones.
    AnimatePresence
        Motion(
            v-if="menu_active"
            @click="menu_active = false"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :exit="{ opacity: 0 }"
            :transition="{ ease: 'linear', duration: 0.2 }"
            class="overlay absolute inset-0 xl:hidden bg-black/50 backdrop-blur-xs z-20"
        )

    //- Display stays a plain `flex` — toggling `hidden` here would cut the close
    //- animation off at frame one. The closed state parks the panel off to the
    //- right, so a phone-width first paint has it already there rather than
    //- flying in on load.
    //-
    //- `:class` toggling static utility strings, not a reactive `:style`: the
    //- latter is what stalls a transition mid-flight.
    .sidebar(
        class="flex-none absolute top-2 right-2 xl:top-auto xl:right-auto xl:relative flex w-70 min-h-0 flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl z-20 transition-[opacity,transform,visibility] duration-200 ease-out overflow-hidden"
        :class="sidebar_visible ? 'opacity-100 translate-x-0 visible' : 'opacity-0 translate-x-4 invisible xl:opacity-100 xl:translate-x-0 xl:visible'"
        style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
    )

        .bg(class="absolute -top-482 -left-270 size-500 rounded-full bg-radial-[at_25%_25%] from-white to-zinc-900 to-75%")


        .mobile-close(@click="menu_active = false" class="xl:hidden absolute top-1 right-1.25 size-6 flex items-center justify-center text-white bg-mauve-700 rounded-lg")
            svg(class="relative size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M18 6 6 18")
                path(d="m6 6 12 12")

        Sidebar(@navigate="menu_active = false")

    slot
</template>
