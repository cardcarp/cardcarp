<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'mount-it', name: 'Mount it' },
    { id: 'your-ui', name: 'Your UI' },
    { id: 'tailwind-sources', name: 'Tailwind sources' },
    { id: 'deploy', name: 'Two things that bite on deploy' }
]
</script>

<script setup>
// /simulator/install
import CodeBlock from '@/part/code-block.vue'

const deps = `
{
  "dependencies": {
    "@cardcarp/core": "*",
    "@cardcarp/simulator": "*"
  }
}
`

const main = `
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { provideGameConfigs, useGameStore } from '@cardcarp/core/composable/game.js'
import { useImage } from '@cardcarp/core/composable/image.js'
import { assetBase, assetUrl } from '@cardcarp/core/config.js'
import { createTable } from '@cardcarp/simulator'

import './style.css'
import App from './app.vue'
import { config, theme, createSimulatorView } from './simulator/index.js'   // this app's own: its game, its look, its UI

// Furniture. The simulator ships no art, so a project brings the files it wants.
import puffSheet from './asset/ui-poof.avif'

// The game (src/simulator/config.js), which the deckbox reads as well as the table.
provideGameConfigs({ ptcg: config })

const { card_src, card_back_src } = useImage()
const table = createTable({
    assets: {
        assetUrl,
        assetBase,
        cardArt: (card) => card_src(card),
        cardBack: (card) => card_back_src(card),
    },
    relay: RELAY_URL,   // your relay's origin; cardcarp's builds read VITE_MULTIPLAYER_WS_URL
    theme,              // the canvas's colours and font (src/simulator/controls.js)
})
table.setArt({ puff: puffSheet })
const SimulatorView = createSimulatorView(table)

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // The table is the root: a project like this exists to be played on.
        { path: '/', name: 'simulator', component: SimulatorView },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
})

useGameStore().loadGame('ptcg')

createApp(App).use(router).mount('#app')
`

const wiring = `
// State is read-only: get, listen and subscribe. Everything else is a verb.
const stop = table.seats.roster.listen((rows) => renderRoster(rows))
addSeatButton.addEventListener('click', () => table.seats.add())

// The moments the table announces, for the UI to answer.
table.on('card-hover', ({ card, rect }) => showPreview(card, rect))

// In Vue, as apps/ptcg binds a store (src/simulator/composable/use-store.js).
const roster = useStore(table.seats.roster)
`

const source = `
@import "tailwindcss";

/* Tailwind v4 skips node_modules when it scans for classes, and a workspace
   package is a symlink into node_modules. Without this, core's components
   never reach the stylesheet — silently. The simulator needs no line: it has
   no classes, and your UI is already in your own source. */
@source "../../../node_modules/@cardcarp/core/src";
`

// The relay is reached over both schemes — https for /room/new and /token, wss
// for the socket itself — so a policy naming only one of them half-works, which
// is worse to diagnose than naming neither.
const headers = `
Content-Security-Policy: … connect-src 'self' https://your-cdn https://your-relay wss://your-relay; worker-src 'self' blob:; …
`
</script>

<template lang="pug">
.page
    p The package is unpublished and consumed from this workspace. #[span(class="font-mono text-neutral-300") @cardcarp/core] is a peer dependency and has to be declared alongside it. Pixi and Motion come in as dependencies of the simulator — you do not install them yourself. Whatever your UI is built with is yours to declare: #[span(class="font-mono text-neutral-300") apps/ptcg] adds vue, vue-router, reka-ui, motion-v and @vueuse.

    CodeBlock(:code="deps" label="package.json")

    h2#mount-it Mount it
    p #[span(class="font-mono text-neutral-300") apps/ptcg] in this repo is this file, plus a deckbox route, and is the complete example of a host. #[span(class="font-mono text-neutral-300") createTable] makes the table and #[span(class="font-mono text-neutral-300") setArt] hands it this app's art. #[span(class="font-mono text-neutral-300") createSimulatorView] is ptcg's own, not the package's: it lives in #[span(class="font-mono text-neutral-300") src/simulator] beside the game's config and the UI it hands the table to, and returns the route component.

    CodeBlock(:code="main" label="src/main.js")

    h2#your-ui Your UI
    p The table draws nothing but its canvas. Everything around it — the hand, the panels, the toolbars, the tutorial, the keyboard — is the app's, reading the table's state and calling its verbs in whatever it is written in. ptcg's is Vue, and a test beside it keeps it honest: nothing in #[span(class="font-mono text-neutral-300") src/simulator] imports past the package root. What it offers — the tools on its rail, its toolbars, its panel sections and the rows of its Settings, every key — is one file, #[span(class="font-mono text-neutral-300") src/simulator/controls.js], which the rail, the panel, the keyboard, the shortcut sheet and the walkthrough all read. See #[router-link(:to="{ name: 'simulator-page', params: { slug: 'api' } }" class="text-mist-500 hover:underline") API] for the object itself.

    CodeBlock(:code="wiring" label="your UI")

    h2#tailwind-sources Tailwind sources
    p Same trap as the deckbox, same fix, for the core components a UI borrows. Tailwind v4 finds its sources by walking up from the stylesheet and deliberately skips #[span(class="font-mono text-neutral-300") node_modules], which is where a symlinked workspace package lives. Miss this and the build succeeds, the dev server looks right, and production ships them unstyled.

    CodeBlock(:code="source" label="src/style.css")

    h2#deploy Two things that bite on deploy
    p The card art host must be reachable cross-origin. An #[span(class="font-mono text-neutral-300") &lt;img&gt;] with no #[span(class="font-mono text-neutral-300") crossOrigin] attribute loads from a bucket happily while Pixi's worker fetch and its WebGL upload both refuse it — so a misconfigured CORS allowlist shows up as a table that renders nothing, rather than as a broken image.

    p And if you ship multiplayer, the relay origin needs a #[span(class="font-mono text-neutral-300") connect-src] entry wherever your headers are declared. See #[router-link(:to="{ name: 'simulator-page', params: { slug: 'multiplayer' } }" class="text-mist-500 hover:underline") The relay].

    CodeBlock(:code="headers" label="public/_headers")
</template>
