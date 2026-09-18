import SimulatorView from './index.vue'
import controls from './controls.js'
import { bindTutorial } from './tutorial.js'
import { provideControls } from './use-controls.js'
import { provideTable } from './use-table.js'

export const { theme } = controls

export function createSimulatorView(table) {
    provideTable(table)
    provideControls(controls)
    bindTutorial(table, controls)

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
