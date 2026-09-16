// The table's event channel keeps the promises a theme relies on: a listener hears the events it
// asked for and no others, hears them inside the emit, can stop hearing them, and cannot take the
// table — or the next listener — down with it.
// Run: node packages/simulator/src/events.test.mjs

import { emitTableEvent, onTableEvent } from './events.js'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? '  ok  ' : '  FAIL'} ${name}${detail ? `  (${detail})` : ''}`)
}

const heard = []
const off = onTableEvent('deck-link', (detail) => heard.push(detail))
onTableEvent('reset', () => heard.push('reset'))

emitTableEvent('deck-link', { query: 'dandan', deck: null })
ok('a listener hears its event, with the detail', heard.length === 1 && heard[0].query === 'dandan')

let inside = false
onTableEvent('card-unhover', () => { inside = true })
emitTableEvent('card-unhover')
ok('synchronously, inside the emit', inside === true)

const got = []
onTableEvent('card-hover', (detail) => got.push(detail))
emitTableEvent('card-hover')
ok('with an empty detail when none is given', got.length === 1 && typeof got[0] === 'object' && Object.keys(got[0]).length === 0)

emitTableEvent('reset')
ok('and only for the events it asked for', heard.length === 2 && heard[1] === 'reset')

off()
emitTableEvent('deck-link', { deck: null })
ok('a stopped listener hears nothing more', heard.length === 2)

const quiet = console.error
let logged = 0
console.error = () => { logged++ }
const after = []
onTableEvent('deck-hint', () => { throw new Error('listener failure') })
onTableEvent('deck-hint', (detail) => after.push(detail))
let escaped = false
try { emitTableEvent('deck-hint', { open: true }) } catch { escaped = true }
console.error = quiet
ok('a throwing listener neither escapes the emit nor stops the next one', !escaped && after.length === 1 && logged === 1)

let silent = true
try { emitTableEvent('nobody-is-listening') } catch { silent = false }
ok('an event nobody listens to is simply dropped', silent)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
