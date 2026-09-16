// ptcg's game config is data, though it is a module.
// Run: node apps/ptcg/src/simulator/config.test.mjs
//
// config.js is JS so it can carry comments and point at its own parts, but what it holds still leaves
// the page: a card's name and size ride inside every card's node, and a die's variants inside its own,
// all as JSON. Anything JSON cannot carry — a function, a class instance, an undefined — would reach a
// peer as something else or as nothing, so the module is round-tripped through JSON here.
//
// And the table resolves a deal's accessory and variant by name, skipping any it cannot find with only
// a console warning. So a name that matches nothing fails here, rather than in a console nobody reads —
// which is how ptcg's opening deal went without its die.

import { isDeepStrictEqual } from 'node:util'

import config from './config.js'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

ok('it has the game, the deck and the simulator', ['game', 'deck', 'simulator'].every(part => config?.[part]))
ok('and holds nothing JSON cannot carry', isDeepStrictEqual(JSON.parse(JSON.stringify(config)), config))

const accessories = new Map((config.simulator?.accessory ?? []).map(item => [item.name, item]))
const entries = ['player', 'game'].flatMap(who => config.simulator?.deal?.[who]?.accessory ?? [])

const unknown = entries.map(entry => entry.accessory).filter(name => !accessories.has(name))
ok('the deal names only accessories the game has', unknown.length === 0, unknown.join(', '))

const noVariant = entries
    .filter(entry => entry.variant != null && accessories.has(entry.accessory))
    .filter(entry => !(accessories.get(entry.accessory).variant ?? []).some(v => v.name === entry.variant))
    .map(entry => `${entry.accessory} → ${entry.variant}`)
ok('and only variants those accessories have', noVariant.length === 0, noVariant.join(', '))

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
