<script setup>
// Core
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { onKeyStroke } from '@vueuse/core'

// Libraries
import { Motion } from 'motion-v'

// Stores
import { dialogShortcut_open } from '../simulator/ui.js'
import { tutorialStart } from '../simulator/tutorial.js'

// UI
import {
    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger
} from 'reka-ui'

// Components
import Sidebar from './sidebar.vue'

// Assign
const route = useRoute()

// Local
const dialog_menu_active = ref(false)

onKeyStroke('Escape', () => { dialog_menu_active.value = false })

</script>

<template lang="pug">
.menu()
    TooltipRoot(:delayDuration="100")
        TooltipTrigger
            .btn(
                @click="dialog_menu_active = !dialog_menu_active"
                class="relative size-8 flex items-center justify-center rounded-full hover:bg-linear-to-br from-sky-500 via-fuchsia-500 to-rose-500 hover:text-white"
                :class="{'bg-white text-black': dialog_menu_active}"
            )
                svg(class="flex-none size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M4 5h16")
                    path(d="M4 12h16")
                    path(d="M4 19h16")
        TooltipPortal
            TooltipContent(
                asChild
                align="center"
                :side="route.name === 'deckbox' ? 'bottom' : 'right'"
                :sideOffset="4")
                Motion(
                    :initial="{ opacity: 0, scale: 0 }"
                    :animate="{ opacity: 1, scale: 1 }"
                    class="px-2 py-1.5 text-white bg-black/50 leading-none rounded-full pointer-events-none z-100"
                )
                    .text(class="text-3") Menu

    Teleport(to="body")
        Motion(
            @click="dialog_menu_active = false"
            :initial="false"
            :animate="{ opacity: dialog_menu_active ? 1 : 0, visibility: dialog_menu_active ? 'visible' : 'hidden' }"
            :transition="{ ease: 'linear', duration: 0.2 }"
            class="menu-overlay fixed inset-0 bg-black/50 backdrop-blur-xs z-99"
        )

        Motion(
            :initial="false"
            :animate="{ opacity: dialog_menu_active ? 1 : 0, x: dialog_menu_active ? 0 : -16, visibility: dialog_menu_active ? 'visible' : 'hidden' }"
            :transition="{ ease: 'easeOut', duration: 0.2 }"
            class="menu-panel fixed top-2 left-2 flex w-70 flex-col max-h-[calc(100dvh-5rem)] overflow-y-auto scrollbar-none text-text bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl z-100"
            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
        )

            .menu-close(@click="dialog_menu_active = false" class="absolute top-1 right-1.25 size-6 flex items-center justify-center text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg")
                svg(class="relative size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M18 6 6 18")
                    path(d="m6 6 12 12")

            Sidebar(@navigate="dialog_menu_active = false")

                template(v-if="route.name === 'simulator'")

                    .footer(class="mt-5 px-5")

                        .mask(class="mask-x-from-80% mask-x-to-99%")
                            .divider-dark(class="w-full h-0.5 bg-black")
                            .divider-light(class="w-full h-px bg-white/5")

                        .row(class="mt-3 -mb-2 flex gap-2 font-mono text-3 text-neutral-500")
                            .btn(
                                @click="dialog_menu_active = false; dialogShortcut_open = true"
                                class="flex-1 h-7 px-2 flex items-center justify-center gap-2 bg-linear-to-br from-zinc-800 to-zinc-950 rounded-md hover:brightness-110 hover:text-white"
                                style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
                            )
                                .text(class="") Shortcuts

                            .btn(
                                @click="dialog_menu_active = false; tutorialStart()"
                                class="flex-1 h-7 px-2 flex items-center justify-center gap-2 bg-linear-to-br from-zinc-800 to-zinc-950 rounded-md hover:brightness-110 hover:text-white"
                                style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
                            )
                                .text(class="") Walkthrough
</template>
