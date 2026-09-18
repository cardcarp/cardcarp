```sh [shell]
npm install @cardcarp/simulator
```

`@cardcarp/simulator` is the tabletop: a Pixi canvas you play on, seats and hands, dice, counters, arrows and free-form markup, and a multiplayer client that pairs with the relay. It ships as one object with no UI of its own, and installs on its own — a project that wants a table and no card archive builds its interface on this and nothing else.

```js [usage]
import { createTable } from '@cardcarp/simulator'

// The table, as one object. It ships no UI: an app draws its own and wires
// it to the object's state and verbs.
const table = createTable({ assets, relay })
await table.mount(element)

table.seats.roster.listen((rows) => render(rows))
table.cards.shuffle(groupId)
```

## Rules, or the absence of them {#rules}

It enforces none. The table moves objects and shares those movements; who may do what, and when, is left to the players. The relay behind multiplayer is a thin echo server holding canonical canvas state per room, with no notion of turns, legality or winning. That is a deliberate ceiling on what this is: a sandbox for games it has never been taught, not an engine for one it has.

## The surface

The package is roughly 12 thousand lines across 43 files, and almost none of it is anybody else's business. The root hands out `createTable`, which returns the whole table as one object, a predicate, and a few helpers a UI shares with the canvas. The Pixi scene, the seat arithmetic, the relay client and the tool registry are all reachable by subpath for the case that genuinely needs them; see [API](/simulator/api).

## Your UI

The interface is the app's. The package has no components and imports no framework, so a table can be drawn in whatever the project already uses. `apps/template` carries a complete one in Vue under `src/simulator` — the canvas view, the hand, the panels and toolbars, the tutorial and the keyboard — and it reaches the table only through the object `createTable` returns; see [Install](/simulator/install).

## Where it sits

Alongside [the deckbox](/deckbox), over one shared `@cardcarp/core`. Install both and they share a config and a manifest, because core is a peer dependency of each. ptcg's table UI has its own deckbox panel in the toolbar — the same card and deck lists, in the toolbar rather than as a page — and it reads the same `deck.filter` vocabulary the card archive does.
