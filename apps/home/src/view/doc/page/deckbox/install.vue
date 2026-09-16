<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'mount-it', name: 'Mount it' },
    { id: 'tailwind-sources', name: 'Tailwind sources' },
    { id: 'chrome', name: 'Chrome' }
]
</script>

<script setup>
// /deckbox/install
import CodeBlock from '@/part/code-block.vue'

const deps = `
{
  "dependencies": {
    "@cardcarp/core": "*",
    "@cardcarp/deckbox": "*",
    "vue": "^3.5.41",
    "vue-router": "^5.2.0"
  }
}
`

const main = `
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { provideGameConfigs, gameConfigsFromGlob, useGameStore } from '@cardcarp/core/composable/game.js'
import { Deckbox } from '@cardcarp/deckbox'

import './style.css'
import App from './app.vue'

// Core is TOLD what exists rather than discovering it — it cannot know which
// games a deployment ships.
provideGameConfigs(gameConfigsFromGlob(
    import.meta.glob('./data/game/*/config/*.json', { eager: true, import: 'default' }),
))

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/deckbox', name: 'deckbox', component: Deckbox },
        { path: '/:pathMatch(.*)*', redirect: '/deckbox' },
    ],
})

// One game, loaded once before the first route resolves.
useGameStore().loadGame('wow')

createApp(App).use(router).mount('#app')
`

const source = `
@import "tailwindcss";

/* Tailwind v4 walks up from this file to find its sources and deliberately
   skips node_modules — which is where a workspace package lives once it is
   symlinked in. Without these two lines the packages' classes vanish from the
   built stylesheet: the build succeeds, dev looks right, and production ships
   unstyled. Nothing warns; the CSS is simply smaller. */
@source "../../../node_modules/@cardcarp/core/src";
@source "../../../node_modules/@cardcarp/deckbox/src";
`

const slot = `
<Deckbox>
    <template #menu><MyMenu /></template>
</Deckbox>
`
</script>

<template lang="pug">
.page
    p The package is unpublished and consumed from this workspace, so a project inside the monorepo depends on it by name and npm links the folder. #[span(class="font-mono text-neutral-300") @cardcarp/core] is a peer dependency and has to be declared alongside it.

    CodeBlock(:code="deps" label="package.json")

    h2#mount-it Mount it
    p Three things happen at boot: core is handed the game configs it should know about, the component is routed, and one game is loaded. #[span(class="font-mono text-neutral-300") apps/wow] in this repo is exactly this file and is the smallest complete example of a host.

    CodeBlock(:code="main" label="src/main.js")

    h2#tailwind-sources Tailwind sources
    p This one is worth reading before you conclude the package is broken. A workspace package is a symlink into #[span(class="font-mono text-neutral-300") node_modules], and Tailwind v4 skips that directory when it scans for class names — so the utility classes used inside the package are never emitted.

    CodeBlock(:code="source" label="src/style.css")

    p The failure is silent in every way that matters: no warning, no build error, and a dev server that looks correct. Production ships an unstyled deckbox and the only visible symptom is a smaller stylesheet.

    h2#chrome Chrome
    p The header carries a #[span(class="font-mono text-neutral-300") #menu] slot for the host's own navigation. It is optional — filling nothing renders a bare deckbox.

    CodeBlock(:code="slot" label="app.vue")
</template>
