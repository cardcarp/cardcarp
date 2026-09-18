<script setup>
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'

// Libraries
import { AnimatePresence, Motion } from 'motion-v'

// Components
import DialogAbout from '@/part/dialog-about.vue'
import Sidebar from './sidebar.vue'

const menu_active = ref(false)
const is_desktop = useMediaQuery('(min-width: 80rem)')

watch(is_desktop, (desktop) => {
    if (desktop) menu_active.value = false
})

const sidebar_visible = computed(() => menu_active.value)

</script>

<template lang="pug">
.home-view(class="relative p-3 w-dvw h-dvh flex gap-3 bg-black overflow-hidden")

    DialogAbout

    .mobile-menu-btn(@click="menu_active = true" class="xl:hidden absolute top-7.5 left-6.5 size-8 flex items-center justify-center text-white bg-linear-to-br from-sky-500 to-rose-500 rounded-full z-20")
        svg(class="relative size-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
            path(d="M4 5h16")
            path(d="M4 12h16")
            path(d="M4 19h16")

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

    .sidebar(
        class="flex-none absolute top-4 left-4 xl:top-auto xl:left-auto xl:relative flex w-70 min-h-0 flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl z-20 transition-[opacity,transform,visibility] duration-200 ease-out overflow-hidden"
        :class="sidebar_visible ? 'opacity-100 translate-x-0 visible' : 'opacity-0 -translate-x-4 invisible xl:opacity-100 xl:translate-x-0 xl:visible'"
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
