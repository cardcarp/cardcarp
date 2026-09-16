// ptcg's simulator: the game it is set up for, and the Vue views that draw a table and wire input to its
// verbs.
//
// The table itself is @cardcarp/simulator's — one object from createTable, with no UI of its own —
// and everything under this folder is this app's: the game's config, the canvas view, the hand, the
// panels and toolbars, the tutorial and the keyboard. main.js hands the config to core, makes the
// table, gives it this app's art, and hands it over here:
//
//   provideGameConfigs({ ptcg: config })
//   const table = createTable({ assets, relay, strict, theme })
//   table.setArt({ puff })
//   const SimulatorView = createSimulatorView(table)
//   routes: [{ path: '/', component: SimulatorView }]
//
// Every part of the UI reaches the table through useTable() (use-table.js) and nothing else, which
// boundary.test.mjs holds it to. What the UI offers — its tools, toolbars, panel sections, Settings
// rows and keys, and the canvas's colours and font — is controls.js, handed over beside the table and
// read through useControls() (use-controls.js).

// First, because everything after it is set up for it: the game. Plain data, re-exported for main.js
// to hand to core — the deckbox reads it too.
import config from './config.js'

import SimulatorView from './index.vue'
import controls from './controls.js'
import { bindTutorial } from './tutorial.js'
import { provideControls } from './use-controls.js'
import { provideTable } from './use-table.js'

export { config }

// The canvas's look, from controls.js. Re-exported for main.js to hand to createTable rather than set
// from createSimulatorView, because the table colours a fresh profile's first seat as it is created —
// before this view exists.
export const { theme } = controls

export function createSimulatorView(table) {
    provideTable(table)
    provideControls(controls)
    bindTutorial(table, controls)

    // controls.js names the table's tools by id, and a name the table does not have fails silently:
    // a rail button that lights nothing, a held key that swaps to nothing. Said once at startup
    // rather than found by clicking.
    if (import.meta.env.DEV) {
        const named = [
            ...Object.keys(controls.palette),
            ...Object.values(controls.keys).map(entry => entry.hold).filter(Boolean),
        ]
        for (const id of named) {
            if (!table.tools.ids.includes(id)) {
                console.warn(`[simulator ui] controls.js names a tool "${id}", and the table has none by that id (it has ${table.tools.ids.join(', ')})`)
            }
        }
    }

    return SimulatorView
}
