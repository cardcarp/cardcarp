```sh [shell]
npm install @cardcarp/deckbox
```

`@cardcarp/deckbox` is the card half of the toolkit: an archive you can search and filter, a deck you can edit beside it, and export to print, PDF or file. Like [the simulator](/simulator), it ships no UI. The package is the deckbox's state and logic — filters, pages, the deck being built, import, draw odds, print layout — and each project draws its own screens on top of it.

That is what lets two projects look nothing alike. A fantasy archive and a pokédex want different type, colour and furniture, and a component with a theme baked in would give both the same one. `apps/template/src/deckbox` in this repo is a complete deckbox to copy and restyle.

```js [src/main.js]
import Deckbox from './deckbox/index.vue'   // this app's own screens

{ path: '/deckbox', name: 'deckbox', component: Deckbox }
```

## What it is not

It holds no games. Every label, filter, facet and card field comes from the game config the host hands to `@cardcarp/core`, which is what lets the same state drive a Pokémon archive and a Warcraft one without knowing either exists. See [Configuration](/deckbox/configuration).

## Where it sits

Two packages, one core. `@cardcarp/core` owns the game store, the config shape and the manifest; the deckbox and [the simulator](/simulator) are peers that both read it. Installing both gives you one config and one manifest between them, because core is a peer dependency of each rather than a bundled copy inside either.

In an app that has both, the UI they share — the scroll area, the card preview, a filter pill — lives in the app's `src/core`, beside `src/deckbox` and `src/simulator`.

The convention across this repo's own projects is that a game's site routes the table at `/` and the deckbox at `/deckbox` — the tabletop is what a project exists to be played on, and the archive is what you go and look something up in.
