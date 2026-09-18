import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { provideGameConfigs, useGameStore } from '@cardcarp/core/composable/game.js'
import { useImage } from '@cardcarp/core/composable/image.js'
import { assetUrl, provideStorage } from '@cardcarp/core/storage.js'
import { createTable, hasSimulator } from '@cardcarp/simulator'

import './style.css'
import App from './app.vue'
import { file, setProject } from './core/project.js'
import { createSimulatorView, theme } from './simulator/index.js'
import Deckbox from './deckbox/index.vue'

import puffSheet from './asset/ui-poof.avif'
import bgTable from './asset/bg-table.avif'

export function mountGame({ config, storage }) {
    const GAME = config.id
    const { root, cards, manifest, sets } = storage

    provideStorage({ [GAME]: { root, cards, manifest, sets } })
    provideGameConfigs({ [GAME]: config })
    setProject({ config, storage })
    injectFonts()

    const routes = [{ path: '/deckbox', name: 'deckbox', component: Deckbox }]

    if (hasSimulator(config)) {
        const { card_src, card_back_src } = useImage()
        const table = createTable({
            assets: {
                assetUrl: (path) => assetUrl(GAME, path),
                cardArt: (card) => card_src(card),
                cardBack: (card) => card_back_src(card),
            },
            relay: import.meta.env.VITE_MULTIPLAYER_WS_URL,
            strict: import.meta.env.DEV,
            theme,
        })
        table.setArt({ puff: puffSheet, surfaces: { 'bg-table': bgTable } })
        routes.unshift({ path: '/', name: 'simulator', component: createSimulatorView(table) })
    } else {
        routes.unshift({ path: '/', redirect: '/deckbox' })
    }
    routes.push({ path: '/:pathMatch(.*)*', redirect: '/' })

    const router = createRouter({ history: createWebHistory(), routes })

    useGameStore().loadGame(GAME)

    createApp(App).use(router).mount('#app')
}

// CSS can't read the storage root, so the fonts and cursor are written here.
function injectFonts() {
    const style = document.createElement('style')
    style.textContent = `
@font-face {
    font-family: "Google Sans Flex";
    src: url("${file.fontFlex}") format("woff2");
    font-weight: 1 1000;
    font-stretch: 25% 151%;
    font-style: oblique 0deg 10deg;
    font-optical-sizing: auto;
}

@font-face {
    font-family: "Google Sans Code";
    src: url("${file.fontCode}") format("woff2");
    font-weight: 300 800;
    font-style: normal;
}

:root {
    --pointer-default: url("${file.pointer}") 8 8, auto;
}
`
    document.head.append(style)
}
