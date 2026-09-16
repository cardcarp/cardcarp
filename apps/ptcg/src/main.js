// ptcg.cardcarp.com — an example project.
//
// This is what installing @cardcarp/deckbox and @cardcarp/simulator looks like from outside: one
// game's config, a router, the deckbox's component, and a table drawn by this app's own UI
// (src/simulator). Everything that makes cardcarp.com a multi-game site — the game picker, the landing
// page, the resource articles — is absent, and nothing here works around its absence. That is the
// test this app exists to be.
//
// It is also the shape a third party writes for a game this repo has never heard of. The only
// cardcarp-specific thing left is the card art host, which comes from the config.
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { provideGameConfigs, useGameStore } from '@cardcarp/core/composable/game.js'
import { Deckbox } from '@cardcarp/deckbox'
import { useImage } from '@cardcarp/core/composable/image.js'
import { assetBase, assetUrl } from '@cardcarp/core/config.js'
import { createTable } from '@cardcarp/simulator'

import './style.css'
import App from './app.vue'
import { config, createSimulatorView, theme } from './simulator/index.js'

// This project's table furniture. The simulator ships no art; a project brings the files it wants.
import puffSheet from './asset/ui-poof.avif'

const GAME = 'ptcg'

// One game, handed to core as the object it merges: the setup at the top of src/simulator (config.js),
// which the deckbox reads as well as the table. Core is told what exists rather than discovering it, so
// the form the config takes is this app's business — a host with several games can glob a folder of
// JSON per game (gameConfigsFromGlob), and one game is one module.
provideGameConfigs({ [GAME]: config })

// The table, and this app's UI for it. The table is handed what it cannot know for itself — where card
// art lives, which relay to talk to, how it looks, and the furniture above — and the UI in
// src/simulator is handed the table.
const { card_src, card_back_src } = useImage()
const table = createTable({
    assets: {
        assetUrl,
        assetBase,
        cardArt: (card) => card_src(card),
        cardBack: (card) => card_back_src(card),
    },
    // A build variable (see the README), read here because Vite only inlines it into app code.
    relay: import.meta.env.VITE_MULTIPLAYER_WS_URL,
    // In development every value leaving a table store is frozen, so an edit in place throws.
    strict: import.meta.env.DEV,
    // The canvas's colours and font (src/simulator/controls.js). Given here rather than later because
    // the table colours a fresh profile's first seat as it is created.
    theme,
})
table.setArt({ puff: puffSheet })
const SimulatorView = createSimulatorView(table)

// No :game segment. A single-game project has nothing to switch between, so the game is a
// constant rather than a route param — and both packages read it from the store, not the URL,
// which is why they do not care either way.
const router = createRouter({
    history: createWebHistory(),
    routes: [
        // The table is the root. A project like this one exists to be played on, and the
        // archive is the thing you go and look something up in — so the tabletop gets the bare
        // domain and the deckbox gets a path.
        { path: '/', name: 'simulator', component: SimulatorView },
        { path: '/deckbox', name: 'deckbox', component: Deckbox },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
})

// Load once, before the first route resolves. cardcarp.com does this in a router guard because
// the game can change under it; here it cannot.
useGameStore().loadGame(GAME)

createApp(App).use(router).mount('#app')
