let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? '  ok  ' : '  FAIL'} ${name}${detail ? `  (${detail})` : ''}`)
}

const backing = new Map([
    ['cardcarp:seats:s2', JSON.stringify([
        { seatId: 's-me', name: 'Ben', sleeve: '202 80.3% 23.9%', mirror: false, anchor: { x: 0, y: 510 }, hand: [] },
    ])],
    ['cardcarp:seat:s2', 's-me'],
])
globalThis.localStorage = {
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => { backing.set(key, String(value)) },
    removeItem: (key) => { backing.delete(key) },
}

const {
    currentTool, uiSelection, canvasDragging, canvasDragDiscarded, canvasPressActive,
    handFocusId, handFlipFocused,
} = await import('./store.js')
const { hand, addToHand } = await import('./seats.js')

console.log('\nstarting values')
ok('the tool starts on select', currentTool.get() === 'select')
ok('nothing is selected', uiSelection.get().type === null && uiSelection.get().units === 0)
ok('no drag, no discard, no press', !canvasDragging.get() && !canvasDragDiscarded.get() && !canvasPressActive.get())

console.log('\nthe hand card under the pointer')
addToHand({ handEntryId: 'h-3', id: 'card-3' })
handFocusId.set('h-3')
handFlipFocused()
ok('H flips the focused card', hand.get()[0]?.faceDown === true)
handFocusId.set(null)
handFlipFocused()
ok('and does nothing with no focus', hand.get()[0]?.faceDown === true)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
