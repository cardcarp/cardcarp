// The table this UI draws, handed over once by createSimulatorView (index.js).
//
// A module-level handle rather than provide/inject, because a page holds one table (see
// @cardcarp/simulator's table.js) and not every part of the UI runs inside a component: controls.js
// builds its entries as it loads, tutorial.js answers seat changes, and app.vue's menu can call
// tutorialStart from outside the view. Components take what they need in setup; plain modules
// ask at the moment they act, because they are imported before createSimulatorView has run.
//
// Still useTable rather than useSimulator: what it hands out is the object @cardcarp/simulator's
// createTable makes, and the package calls that the table.
let current = null

export function provideTable(table) {
    current = table
}

export function useTable() {
    if (!current) throw new Error('[simulator ui] no table — call createSimulatorView(table) before mounting the app')
    return current
}
