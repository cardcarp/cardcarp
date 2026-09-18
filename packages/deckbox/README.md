# @cardcarp/deckbox 🎴

**The card half of the toolkit:** an archive you can search and filter, a deck you can edit beside it, and export to print, PDF or file.

```sh
npm install @cardcarp/deckbox @cardcarp/core
```

Like [the simulator](https://www.npmjs.com/package/@cardcarp/simulator), it ships no UI. The package is the deckbox's state and logic — filters, pages, the deck being built, import, draw odds, print layout — and each project draws its own screens on top of it.

That is what lets two projects look nothing alike. A fantasy archive and a pokédex want different type, colour and furniture, and a component with a theme baked in would give both the same one. `apps/template/src/deckbox` in the repo is a complete deckbox to copy and restyle.

<br>

## Usage

`useState` is the deckbox — the archive, the filters, the pages and the deck being edited, as one reactive surface your screens read.

```js
import { useState } from '@cardcarp/deckbox/state.js'

const deckbox = useState()
```

Then route your own screens at whatever path suits the app:

```js
import Deckbox from './deckbox/index.vue'   // this app's own screens

{ path: '/deckbox', name: 'deckbox', component: Deckbox }
```

<br>

## What's inside

| Module | Holds |
| --- | --- |
| `state.js` | `useState` — the archive, filters, facets, pages and the deck being edited |
| `deck-import.js` | Parsing decklists from text and file |
| `probability.js` | Draw odds for the deck as built |
| `print-sheet.js` | Proxy sheet layout |
| `print-image.js` | Card image composition for print |
| `composable/card-art.js` | Card art resolution over core's storage |
| `composable/set-list.js` | The game's set list |
| `composable/download.js` | Export to file |

The root export carries `hasDeckbox(config)`, the predicate an app uses to decide whether a game has an archive at all.

<br>

## What it is not

It holds no games. Every label, filter, facet and card field comes from the game config the host hands to [`@cardcarp/core`](https://www.npmjs.com/package/@cardcarp/core), which is what lets the same state drive a Pokémon archive and a Warcraft one without knowing either exists.

<br>

## Where it sits

Two packages, one core. `@cardcarp/core` owns the game store, the config shape and the manifest; the deckbox and the simulator are peers that both read it. Installing both gives you one config and one manifest between them.

In an app that has both, the UI they share — the scroll area, the card preview, a filter pill — lives in the app's `src/core`, beside `src/deckbox` and `src/simulator`.

<br>

## Peer dependencies

`@cardcarp/core` and Vue 3.5 or newer.

<br>

## Links

- **[Documentation](https://cardcarp.com/deckbox)** — card model, filters, decks, export and configuration
- **[API reference](https://cardcarp.com/deckbox/api)**
- **[Discord](https://chat.cardcarp.com)**
- **[Source](https://github.com/cardcarp/cardcarp/tree/main/packages/deckbox)**

<br>

## License

[MIT No Attribution](LICENSE.md).
