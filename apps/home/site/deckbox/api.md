The package root exports one name. Everything else is imported by path: there is no UI to hide behind a root export, and each piece is something a template reaches for directly.

```js [import]
import { hasDeckbox } from '@cardcarp/deckbox'
import { useState } from '@cardcarp/deckbox/state.js'
```

## hasDeckbox(config) {#has-deckbox}

Whether a game's config describes a deckbox at all — true when `config.deck` is present. The counterpart to `@cardcarp/simulator`'s `hasSimulator`, and asked the same way: of a config object, not of a game name.

## What a template imports

| Path | |
|---|---|
| `state.js` | `useState()`: filters, paging, the deck being built, panels and every dialog's open state. One shared instance. |
| `composable/set-list.js` | `useSetList(game)`: the set tree, from the game's declared `sets` location. |
| `composable/card-art.js` | `useCardArt(card, variant)`: a card's art URL, and whether it has loaded. |
| `composable/download.js` | Saving a Blob as a named file. |
| `deck-import.js` | Reading a pasted deck list against the manifest. |
| `probability.js` | Draw odds. |
| `print-sheet.js`, `print-image.js` | Laying out a print sheet and preparing its images. |

The screens in `apps/template/src/deckbox` use all of these, and are the reference for how.

## Navigation guard

`state.js` provides `guard_build()`, which prompts before leaving with an unsaved build. A template installs it itself, with `onBeforeRouteLeave` — the reference template's `index.vue` does. A guard that returns false aborts the navigation without leaving the current route, which is worth knowing if your host does anything in `afterEach`: that hook fires for aborted navigations too.

## Peer dependencies

`@cardcarp/core` and `vue` ^3.5.41. Core is a peer rather than a dependency deliberately: two copies of core would be two registries and two manifests, which is the failure the arrangement exists to make impossible. Whatever the screens are built with — the reference template uses reka-ui, motion-v, jsPDF and JSZip — is the app's to declare.
