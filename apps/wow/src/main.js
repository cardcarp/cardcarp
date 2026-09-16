// wow.cardcarp.com — an example project.
//
// This is what installing @cardcarp/deckbox looks like from outside: one game's config, a router,
// and the deckbox's component. Everything that makes cardcarp.com a multi-game site — the game
// picker, the landing page, the resource articles — is absent, and nothing here works around its
// absence. That is the test this app exists to be.
//
// No table for now. @cardcarp/simulator ships no UI, so an app draws its own, and ptcg's is being
// shaped first (apps/ptcg/src/simulator); wow gets one once that settles. Its table art is already here
// (src/asset) for when it does.
//
// It is also the shape a third party writes for a game this repo has never heard of. The only
// cardcarp-specific thing left is the card art host, which comes from the config.
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { provideGameConfigs, gameConfigsFromGlob, useGameStore } from '@cardcarp/core/composable/game.js'
import { Deckbox } from '@cardcarp/deckbox'

import './style.css'
import App from './app.vue'

// One game, and the same call cardcarp.com makes against its four. Core is told what exists
// rather than discovering it, which is what lets this app ship a single config folder.
provideGameConfigs(gameConfigsFromGlob(
    import.meta.glob('./data/game/*/config/*.json', { eager: true, import: 'default' }),
))

const GAME = 'wow'

// No :game segment. A single-game project has nothing to switch between, so the game is a
// constant rather than a route param — and the deckbox reads it from the store, not the URL.
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/deckbox' },
        { path: '/deckbox', name: 'deckbox', component: Deckbox },
        { path: '/:pathMatch(.*)*', redirect: '/deckbox' },
    ],
})

// Load once, before the first route resolves. cardcarp.com does this in a router guard because
// the game can change under it; here it cannot.
useGameStore().loadGame(GAME)

createApp(App).use(router).mount('#app')
