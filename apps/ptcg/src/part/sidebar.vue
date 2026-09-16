<script setup>
// The section nav the menu drawer shows (part/menu.vue).
//
// On cardcarp.com this same fragment was docked permanently by the home shell and listed the
// sections of a multi-game site — Home, the deckbuilders, the simulators, the resource articles,
// each rewiring itself around whichever game you were inside. This project is one game and two
// routes, so what survives is the pair of links between the table and the archive.
//
// They are asked of the game's config rather than written down, because a project whose config
// declares no deckbox genuinely has only one of them — the same question app.vue used to ask, moved
// here now that this is the thing that renders the answer.
//
// A fragment on purpose: the drawer sets its own width and padding, and `.btns` growing is what
// pushes the footer to the bottom of the panel, so a root element here would change that layout.
//
// Core
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// State
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { hasSimulator } from '@cardcarp/simulator'
import { hasDeckbox } from '@cardcarp/deckbox'
import { dialog_profile_open } from './profile.js'

// Assign
const route = useRoute()
const { config } = useGameStore()

// Whether each half of this project exists at all. Swapping this project's config for a
// deckbox-only game is a supported thing to do, and the link should go with it.
const has_table = computed(() => hasSimulator(config.value))
const has_cards = computed(() => hasDeckbox(config.value))

// Dismissing is the host's business — it owns the panel. Only the nav emits: the footer's two links
// deliberately do not, because they open a new tab rather than navigating.
const emit = defineEmits(['navigate'])

// Profile is the exception in the footer: it opens a dialog over the page, so the drawer has to get
// out of the way first, the same way a link closes it.
function openProfile() {
    emit('navigate')
    dialog_profile_open.value = true
}

</script>

<template lang="pug">
.header(class="mt-6 xl:mt-6 flex items-center justify-center leading-none")
    img(src="https://storage.cardcarp.com/site/image/logo.png" class="w-30 xl:w-40 mt-1 text-white")

//- One delegated close for every link below, which also catches a tap on the section already
//- showing — that fires no route change, so the drawer would otherwise stay open.
.btns(@click="emit('navigate')" class="group/btns grow mt-4 xl:mt-4 flex flex-col gap-1 text-3.5 font-light leading-none")

    router-link(
        v-if="has_table"
        :to="{ name: 'simulator' }"
        class="group/btn relative"
    )
        .tab(
            class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
            :class="route.name === 'simulator' ? 'block!' : ''"
        )
        .padding(class="px-4")
            .pill(
                class="px-3 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg"
                :class="route.name === 'simulator' ? 'bg-zinc-800 text-white!' : ''"
            )
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
                span(class="relative block") Table

    router-link(
        v-if="has_cards"
        :to="{ name: 'deckbox' }"
        class="group/btn relative"
    )
        .tab(
            class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
            :class="route.name === 'deckbox' ? 'block!' : ''"
        )
        .padding(class="px-4")
            .pill(
                class="px-3 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg"
                :class="route.name === 'deckbox' ? 'bg-zinc-800 text-white!' : ''"
            )
                svg(class="relative flex-none size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2")
                    rect(x="14" y="2" width="8" height="8" rx="1")
                span(class="relative block") Cards

//- Route-specific actions (the table's Shortcuts and Walkthrough) land above the links every
//- route shares.
slot

.footer(class="mt-5 px-5 pb-5")
    .mask(class="mask-x-from-80% mask-x-to-99%")
        .divider-dark(class="w-full h-0.5 bg-black")
        .divider-light(class="w-full h-px bg-white/5")
    .btns(class="mt-3 flex flex-col gap-2 font-mono text-3 text-neutral-500")

        .row(class="flex gap-2")
            .btn(
                @click="openProfile"
                class="flex-1 h-7 px-2 flex items-center justify-center gap-2 bg-linear-to-br from-zinc-800 to-zinc-950 rounded-md hover:brightness-110 hover:text-white"
                style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
            )
                .text(class="") Profile

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
