A game's config has three parts, merged by core into one `config` object. `simulator` is the table's, and it is optional by design — its absence is how a project says this instance has no table at all. The form the parts take is the app's business, since core is only handed the object: `apps/ptcg` writes all three in one module, `src/simulator/config.js`, with the reasons beside the values, and a host with several games can glob a folder of JSON per game with `gameConfigsFromGlob`. Either way it stays plain data: parts of it travel to the room inside node payloads.

```js [config]
// src/core/config.js — one module, a comment block per part
export default {
    game,        // name, dataset, card — required
    deck,        // the deck vocabulary — absent = no decks
    simulator,   // the table — absent = no table
}
```

The parts are named for what they describe rather than for the app that reads them, and the table is the reason that distinction earns its keep: it reads `card.size` out of `game` to derive a card's world size, and `filter` out of `deck` for its toolbar's format and theme facets. A part called `deckbox` would be a name that lies to the simulator reading it.

```js [app.vue]
import { hasSimulator } from '@cardcarp/simulator'

// Asked of a config, not of a game name: the host holds the registry.
const links = computed(() => [
    hasSimulator(config.value) && { to: '/', label: 'Table' },
].filter(Boolean))
```

## Bundled, not fetched

Config ships with the app. The archives — `sets.json` and `manifest.json`, the latter up to about 25 MB — are fetched at runtime from wherever your storage points (`provideStorage`). The split is by what each thing is rather than by size: a config is the other half of a contract the code defines, and keeping it in the repo is what stops a schema change and its instances drifting apart silently.

## Card art

Card art URLs are built from each card's `dir` inside the `cards` location the host declares — nothing in the packages names a host, which is the reason a third party's game works here at all. That storage must allow cross-origin reads — Pixi's worker fetch and its WebGL texture upload both refuse an opaque response, even where a plain `<img>` would have loaded it happily. A bucket whose CORS allowlist covers your production origin but not your development one is the common shape of this. cardcarp's names both, so development reads storage exactly as production does — and a missing origin shows up before a deploy rather than after it.

## Table textures

The table's surface can wear a texture. Its `img` is either a name the app gave with `table.setArt({ surfaces })`, or the location of a game's own texture with its extension, like `game/wow/asset/felt.avif`, resolved against the storage root. The simulator ships no texture of its own, so a name nobody passed falls back to the flat table colour and says so in the console.

```js [config.js — simulator]
table: {
    surface: {
        color: '#1a1a1a',
        img: 'bg-table',
        scale: 0.5,
        tint: '#6b5f52',
        alpha: 0.5,
    },
},
```
