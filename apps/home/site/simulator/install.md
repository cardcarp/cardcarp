The package is unpublished and consumed from this workspace. `@cardcarp/core` is a peer dependency and has to be declared alongside it. Pixi and Motion come in as dependencies of the simulator — you do not install them yourself. Whatever your UI is built with is yours to declare: `apps/template` adds vue, vue-router, reka-ui, motion-v and @vueuse.

```json [package.json]
{
  "dependencies": {
    "@cardcarp/core": "*",
    "@cardcarp/simulator": "*"
  }
}
```

## Mount it

`apps/template/src/main.js` in this repo is this file, plus a deckbox route, and is the complete example of a host. `createTable` makes the table and `setArt` hands it this app's art. `createSimulatorView` is ptcg's own, not the package's: it lives in `src/simulator` beside the game's config and the UI it hands the table to, and returns the route component.

```js [src/main.js]
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { provideGameConfigs, useGameStore } from '@cardcarp/core/composable/game.js'
import { useImage } from '@cardcarp/core/composable/image.js'
import { assetUrl, provideStorage } from '@cardcarp/core/storage.js'
import { createTable } from '@cardcarp/simulator'

import './style.css'
import App from './app.vue'
import { config, theme, createSimulatorView } from './simulator/index.js'   // this app's own: its game, its look, its UI

// Furniture. The simulator ships no art, so a project brings the files it wants.
import puffSheet from './asset/ui-poof.avif'

// Where each file is, under a root that is a build variable. See the deckbox's
// Storage section; apps/ptcg declares this in src/core/storage.js.
provideStorage({
    ptcg: {
        root: import.meta.env.VITE_STORAGE_ROOT,
        cards: 'game/ptcg/card',
        manifest: 'game/ptcg/data/manifest.json',
        sets: 'game/ptcg/data/sets.json',
    },
})

// The game (src/core/config.js), which the deckbox reads as well as the table.
provideGameConfigs({ ptcg: config })

const { card_src, card_back_src } = useImage()
const table = createTable({
    assets: {
        assetUrl: (path) => assetUrl('ptcg', path),   // a location from the config, resolved
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
```

## Your UI

The table draws nothing but its canvas. Everything around it — the hand, the panels, the toolbars, the tutorial, the keyboard — is the app's, reading the table's state and calling its verbs in whatever it is written in. ptcg's is Vue, and a test beside it keeps it honest: nothing in `src/simulator` imports past the package root. What it offers — the tools on its rail, its toolbars, its panel sections and the rows of its Settings, every key — is one file, `src/simulator/controls.js`, which the rail, the panel, the keyboard, the shortcut sheet and the walkthrough all read. See [API](/simulator/api) for the object itself.

```js [your UI]
// State is read-only: get, listen and subscribe. Everything else is a verb.
const stop = table.seats.roster.listen((rows) => renderRoster(rows))
addSeatButton.addEventListener('click', () => table.seats.add())

// The moments the table announces, for the UI to answer.
table.on('card-hover', ({ card, rect }) => showPreview(card, rect))

// In Vue, as apps/template binds a store (src/simulator/composable/use-store.js).
const roster = useStore(table.seats.roster)
```

## Tailwind sources

Same trap as the deckbox, same fix, for the core components a UI borrows. Tailwind v4 finds its sources by walking up from the stylesheet and deliberately skips `node_modules`, which is where a symlinked workspace package lives. Miss this and the build succeeds, the dev server looks right, and production ships them unstyled.

```css [src/style.css]
@import "tailwindcss";

/* Tailwind v4 skips node_modules when it scans for classes, and a workspace
   package is a symlink into node_modules. Without this, core's components
   never reach the stylesheet — silently. The simulator needs no line: it has
   no classes, and your UI is already in your own source. */
@source "../../../node_modules/@cardcarp/core/src";
```

## Two things that bite on deploy {#deploy}

Storage on another origin (`VITE_STORAGE_ROOT`) must be reachable cross-origin. An `<img>` with no `crossOrigin` attribute loads from a bucket happily while Pixi's worker fetch and its WebGL upload both refuse it — so a misconfigured CORS allowlist shows up as a table that renders nothing, rather than as a broken image.

And if you ship multiplayer, the relay origin needs a `connect-src` entry wherever your headers are declared. See [The relay](/simulator/multiplayer). `apps/template` writes both as placeholders, which its `vite.js` fills from the build's variables so the file names no host.

```text [public/_headers]
Content-Security-Policy: … connect-src 'self' %origin:VITE_STORAGE_ROOT% https://%host:VITE_MULTIPLAYER_WS_URL% wss://%host:VITE_MULTIPLAYER_WS_URL%; worker-src 'self' blob:; …
```
