<script setup>
// The whole shell: a router view, and a link between the halves once there is more than one.
//
// The deckbox is given no #menu slot here, which is the point — it renders perfectly well without
// one, and a project that wants no chrome writes no chrome.
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { hasDeckbox } from '@cardcarp/deckbox'

const route = useRoute()
const { config } = useGameStore()

// Asked of the config rather than assumed, because that is the contract. This project has no table
// for now (see main.js), so the deckbox is the only half and the nav stays hidden until there is a
// second.
const links = computed(() => [
    hasDeckbox(config.value) && { to: '/deckbox', label: 'Cards' },
].filter(Boolean))
</script>

<template lang="pug">
.app(class="relative h-full")
    nav(
        v-if="links.length > 1"
        class="fixed top-3 right-4 z-50 flex gap-1 p-1 bg-neutral-900/80 backdrop-blur rounded-full"
    )
        RouterLink(
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="px-3 py-1 text-3.5 rounded-full hover:text-white"
            :class="route.path === l.to ? 'bg-white text-black' : 'text-neutral-400'"
        ) {{ l.label }}

    RouterView
</template>
