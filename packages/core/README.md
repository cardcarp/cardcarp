# @cardcarp/core 🎴

**What a deckbox and a table both need:** the game store, the shared UI state, and the card-shaped helpers neither owns.

This is the layer the other two CardCarp packages stand on. [`@cardcarp/deckbox`](https://www.npmjs.com/package/@cardcarp/deckbox) and [`@cardcarp/simulator`](https://www.npmjs.com/package/@cardcarp/simulator) each declare it as a **peer** dependency rather than bundling a copy, which is what lets an app install both and have them share one config, one manifest and one preview state between them.

```sh
npm install @cardcarp/core
```

<br>

## Subpath imports only

Core has no root export. Every module is reached by its path — there is no barrel file to import from, and `import … from '@cardcarp/core'` will not resolve.

```js
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { provideStorage, manifestUrl } from '@cardcarp/core/storage.js'
import { hasCardBack } from '@cardcarp/core/card.js'
```

<br>

## What's inside

| Module | Holds |
| --- | --- |
| `card.js` | Card-shaped helpers — card backs and the flip variant |
| `storage.js` | Asset resolution. `provideStorage` at boot, then `manifestUrl`, `setsUrl`, `cardArtUrl`, `assetUrl` |
| `composable/game.js` | The game store. `provideGameConfigs`, `knownGames`, `useGameStore` |
| `composable/search.js` | Filter and facet vocabulary shared by the archive and the table |
| `composable/image.js` | `useImage` — loading and fallback for card art |
| `composable/page.js` | `use_page` — pagination over a filtered set |
| `store/preview.js` | The card preview a deckbox and a table both open |
| `store/profile.js` | The local player profile |
| `store/drag.js` | Drag state shared across screens |

<br>

## Peer dependencies

Vue 3.5 or newer. Core holds the state, never the screens — an app brings its own UI.

<br>

## Links

- **[Documentation](https://cardcarp.com)** — guides, API reference and live examples
- **[Discord](https://chat.cardcarp.com)** — tabletop architecture and package APIs
- **[Source](https://github.com/cardcarp/cardcarp/tree/main/packages/core)**

<br>

## License

[MIT No Attribution](LICENSE.md).
