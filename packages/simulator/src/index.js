// What a host gets when it installs @cardcarp/simulator: the table, and nothing that draws it.
//
//   import { createTable } from '@cardcarp/simulator'
//
//   const table = createTable({ assets, relay, strict })
//   await table.mount(element)
//   table.cards.shuffle(groupId)
//
// createTable is the whole of the table: its lifecycle, what it is handed, what it announces, and a
// verb for everything on it (see table.js). The UI is the app's own. This package has no components,
// imports no framework, and draws nothing outside its canvas — apps/ptcg builds one in Vue
// (src/simulator), and an app on anything else wires its own to the same object.

export { createTable } from './table.js'

// Whether a game's config describes a table at all.
//
// `simulator` is optional by design — it is how a project says "this instance has no table"
// (see @cardcarp/core's applyConfig) — so a host that offers both a deckbox and a table has
// to be able to ask before it offers a link to one. Asked of a config rather than of a game
// name, because the host holds the config and this package does not own the registry.
export function hasSimulator(config) {
    return !!config?.simulator
}

// Small pure helpers an app's UI shares with the table, so what the UI measures and what the canvas
// does agree: the name folding card search uses, the tolerances of a double tap, and how a lifted
// card rises. No state, and nothing to create.
export { foldName } from './fold-name.js'
export { isDoubleTap, resetDoubleTap, TAP_MOVE_SLOP } from './double-tap.js'
export { LIFT_RISE_PX, LIFT_SCALE } from './tactility/core.js'
