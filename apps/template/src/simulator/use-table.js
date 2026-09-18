let current = null

export function provideTable(table) {
    current = table
}

export function useTable() {
    if (!current) throw new Error('[simulator ui] no table — call createSimulatorView(table) before mounting the app')
    return current
}
