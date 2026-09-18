The package is unpublished and consumed from this workspace, so a project inside the monorepo depends on it by name and npm links the folder. `@cardcarp/core` is a peer dependency and has to be declared alongside it. Your screens' own libraries are yours to declare: `apps/template` adds reka-ui, motion-v, @vueuse, jsPDF and JSZip.

```json [package.json]
{
  "dependencies": {
    "@cardcarp/core": "*",
    "@cardcarp/deckbox": "*",
    "vue": "^3.5.41"
  }
}
```

## Mount it

Four things happen at boot: core is told where each game's files are and which game configs it should know about, your deckbox screens are routed, and one game is loaded. `apps/template/src/main.js` is the complete example; its screens are in `src/deckbox`, and `apps/ptcg` supplies only `src/core/config.js` and `src/core/storage.js`.

```js [src/main.js]
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { provideGameConfigs, gameConfigsFromGlob, useGameStore } from '@cardcarp/core/composable/game.js'
import { provideStorage } from '@cardcarp/core/storage.js'

import Deckbox from './deckbox/index.vue'   // your screens

import './style.css'
import App from './app.vue'

// Where each file is, under a root that is a build variable — see Storage below.
const ROOT = import.meta.env.VITE_STORAGE_ROOT

provideStorage({
    wow: {
        root: ROOT,
        cards: 'game/wow/card',
        manifest: 'game/wow/data/manifest.json',
        sets: 'game/wow/data/sets.json',
    },
})

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
```

## Storage {#storage}

Nothing in the packages knows where your files are, or how you lay them out. `provideStorage` takes an entry per game, and each names a location:

| Key | |
|---|---|
| `root` | Required. What every other location resolves against. |
| `cards` | Required. The folder of card art. |
| `manifest` | Required. The archive. |
| `sets` | The set tree, for the set filter. |

The inside of `cards` is the one fixed shape: a card's art is `{dir}.avif` and its variants `{dir}-{variant}.avif`, because `dir` comes from the manifest. Everything else is wherever you say, and so is every `img` in a game's config — an accessory, a card back, a table texture — which resolves against the same `root`, extension included.

A location resolves against `root` unless it already says where it is: a full URL is used as written, and a path starting with `/` is on the page's own origin. Until `provideStorage` is called, or a required key is missing, those URLs are empty and the console says which.

```text [.env]
VITE_STORAGE_ROOT=https://files.example.com
```

Vite inlines the value when it builds, so it is kept out of the source but not out of the built page — a browser has to be told where to fetch from. A root on another origin must allow yours cross-origin, development port included.

### Without a CDN

Set the root to `/` and put the files under your app's `public/` folder, at the paths your locations name. They are served from the page's own origin, so there is no CORS to configure and a `'self'` security policy already allows them. Mind your host's limits on static files: a game with tens of thousands of cards, or a manifest in the tens of megabytes, can exceed what some platforms will serve from a deploy.

### Your own files

Icons, fonts and logos are your screens' business, not the package's. `resolveUrl(root, path)` from `@cardcarp/core/storage.js` resolves one by the same rules as everything above; `apps/ptcg/src/core/storage.js` keeps them in one `file` object.

## Tailwind sources

Nothing to add. The package ships no classes — your screens are in your own `src/`, which Tailwind already scans. If you ever import a component from a package, it needs an `@source` line: Tailwind v4 skips `node_modules`, and a package's classes vanish from the build without a warning.
