# @cardcarp/simulator 🎴

**The virtual tabletop as one object:** stage geometry, the Pixi canvas, seats, and the multiplayer client that pairs with `cardcarp-relay`.

```sh
npm install @cardcarp/simulator @cardcarp/core
```

A Pixi canvas you play on, seats and hands, dice, counters, arrows and free-form markup, and a multiplayer client. It ships no UI of its own, and it installs on its own — a project that wants a table and no card archive builds its interface on this and nothing else.

<br>

## Usage

`createTable` returns the whole table as one frozen object. A page holds one table; calling it twice throws.

```js
import { createTable } from '@cardcarp/simulator'

const table = createTable({ assets, relay })
await table.mount(element)

table.seats.roster.listen((rows) => render(rows))
table.cards.shuffle(groupId)
```

The object groups its verbs by what they act on — `cards`, `hand`, `seats`, `room`, `tools`, `selection`, `dice`, `counters`, `text`, `view`, `scenery`, `accessories`, `pointer` — alongside `mount`, `setGame`, `on` and `reset`. Readable state is exposed as stores you `listen` to.

<br>

## Rules, or the absence of them

It enforces none. The table moves objects and shares those movements; who may do what, and when, is left to the players. The relay behind multiplayer is a thin echo server holding canonical canvas state per room, with no notion of turns, legality or winning. That is a deliberate ceiling on what this is: a sandbox for games it has never been taught, not an engine for one it has.

<br>

## Your UI

The interface is the app's. The package has no components and imports no framework, so a table can be drawn in whatever the project already uses. `apps/template` in the repo carries a complete one in Vue — the canvas view, the hand, the panels and toolbars, the tutorial and the keyboard — and it reaches the table only through the object `createTable` returns.

Most apps need the root export and nothing else. The Pixi scene, the seat arithmetic, the relay client and the tool registry are reachable by subpath for the case that genuinely needs them:

```js
import { stageSize } from '@cardcarp/simulator/stage.js'
import { tools } from '@cardcarp/simulator/canvas-pixi/tools/index.js'
```

<br>

## Where it sits

Alongside [the deckbox](https://www.npmjs.com/package/@cardcarp/deckbox), over one shared [`@cardcarp/core`](https://www.npmjs.com/package/@cardcarp/core). Install both and they share a config and a manifest, because core is a peer dependency of each rather than a bundled copy inside either.

<br>

## Peer dependencies

`@cardcarp/core` only. Pixi and Motion are regular dependencies of the package, and it needs no framework.

<br>

## Links

- **[Documentation](https://cardcarp.com/simulator)** — stage, seats, tools, rooms and multiplayer
- **[API reference](https://cardcarp.com/simulator/api)**
- **[Discord](https://chat.cardcarp.com)**
- **[Source](https://github.com/cardcarp/cardcarp/tree/main/packages/simulator)**

<br>

## License

[MIT No Attribution](LICENSE.md).
