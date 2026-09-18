import { isDeepStrictEqual } from 'node:util'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const APPS = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const games = readdirSync(APPS).filter(name => existsSync(resolve(APPS, name, 'src/core/config.js')))
ok('found game configs', games.length > 0, games.join(', '))

for (const name of games) {
    const { default: config } = await import(pathToFileURL(resolve(APPS, name, 'src/core/config.js')))
    console.log(`\n${name}`)
    ok('its id matches its folder', config.id === name)
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
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
