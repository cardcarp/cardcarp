One entry point, and no UI. The root is the table — one object with a lifecycle, the facts it is handed, the moments it announces and a verb for everything on it — and it imports no framework. The interface is the app's to build on it; `apps/ptcg` builds one in Vue.

```js [import]
import { createTable, hasSimulator } from '@cardcarp/simulator'
```

## createTable(options) {#create-table}

Makes the table. Called once, before the app mounts: a page holds one table, and a second call is refused. Everything handed in here can be changed later through the table's setters.

```js [src/main.js]
const table = createTable({
    // Where art lives: a URL for a location the game's config declares, and a
    // card's front and back.
    assets: { assetUrl, cardArt, cardBack },
    // The relay's origin, for multiplayer. Left out, it is the local dev relay.
    relay: 'wss://your-relay.example',
    // In development, freeze every value leaving a store so an edit in place throws.
    strict: true,
    // The canvas's colours and font. See setTheme below.
    theme,
})
```

## The table

What `createTable` returns. The lifecycle and the inputs sit at the top; everything on the table has a namespace of its own — `tools`, `selection`, `cards`, `hand`, `seats`, `room`, `dice`, `counters`, `rects`, `arrows`, `text`, `view`, `scenery`, `accessories` and `pointer` — each holding that thing's state and its verbs.

```js [usage]
await table.mount(element, { deck })  // build the canvas, and deal a ?deck= link
table.unmount()                         // take it down again, leaving any room

table.setGame({ id, config, manifest, error, cardConfig })
table.setArt({ surfaces: { 'bg-table': url }, puff: url })
table.setTheme({ font, table, seats, selection, card, piece, shape })

const off = table.on('reset', () => openDeckList())

table.cards.shuffle(groupId)
table.seats.add()
table.room.start()
```

`setArt` is the app's furniture, since the package ships none: textures a game config may name as its surface, and the sprite sheet a delete puffs with. Either may be left out.

`setTheme`, and `createTable`'s `theme` before it, is the app's look. Give the first one to createTable: a fresh profile's first seat is coloured as the table is made. It covers the colours and the font the canvas draws with — the table and its dots, the palette new seats take, the selection chrome, cards, a die's number, and the colour a new shape starts as. The package has no look of its own. It draws anything a theme leaves out in a neutral grey and names it in a warning, and warns once if a table is mounted with no theme at all. `apps/ptcg` keeps a complete one in `src/simulator/controls.js`.

## Wiring a UI

A UI reads the table's state and calls its verbs, and nothing else. State is handed out read-only, so a UI changes the table only through verbs, and the canvas and the room hear about everything that happens. Verbs are plain functions, safe to take off their namespace. The moments `on` listens for are `reset`, `deck-link`, `card-hover` and `card-unhover`.

```js [state]
// Every piece of state is a read-only store.
table.seats.roster.get()                          // the value now
const stop = table.seats.roster.listen(           // each change, not the current value
    (rows, previous) => render(rows),
)
const unsubscribe = table.seats.roster.subscribe( // the current value at once, then each change
    (rows) => render(rows),
)
```

Mount the table when the element it draws into exists, and unmount it when that element goes: unmounting also leaves any room the table was in, because the connection belongs to the table rather than to whichever control opened it.

## hasSimulator(config) {#has-simulator}

True when `config.simulator` is present. The counterpart to `@cardcarp/deckbox`'s `hasDeckbox`, and asked the same way — of a config object, because the package does not own the registry.

## Helpers

A few pure functions and constants a UI shares with the table, so what the UI measures and what the canvas does agree: `foldName`, the name folding card search uses; `isDoubleTap`, `resetDoubleTap` and `TAP_MOVE_SLOP`; and `LIFT_SCALE` and `LIFT_RISE_PX`, how a lifted card rises.

## Subpaths

The package exports `"./*": "./src/*"`, so the Pixi scene, the seat arithmetic, the relay client and the tool registry are all importable. None of it is a supported surface. It is there for the case that genuinely needs it, and it will move.

```js [import]
// Reachable, but not a supported surface.
import { stageSize } from '@cardcarp/simulator/stage.js'
import { tools } from '@cardcarp/simulator/canvas-pixi/tools/index.js'
```

## Peer dependencies

`@cardcarp/core` only. Pixi and Motion are regular dependencies of the package, and it needs no framework.
