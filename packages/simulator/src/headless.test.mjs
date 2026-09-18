import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = dirname(fileURLToPath(import.meta.url))
const PKG = JSON.parse(readFileSync(join(SRC, '..', 'package.json'), 'utf8'))

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
})

const files = walk(SRC).map(p => relative(SRC, p))
const components = files.filter(f => /\.(vue|jsx|tsx|svelte)$/.test(f))
ok('no component files', components.length === 0, components.join(', '))

const UI = /^(vue|vue-router|reka-ui|motion-v|@vueuse\/|lodash|fuse\.js|react|react-dom|svelte)(\/|$)/
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const offenders = files
    .filter(f => /\.(js|mjs)$/.test(f) && !f.includes('.test.'))
    .flatMap(rel => [...strip(readFileSync(join(SRC, rel), 'utf8'))
        .matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)]
        .map(m => m[1] ?? m[2])
        .filter(spec => UI.test(spec))
        .map(spec => `${rel} → ${spec}`))
ok('no module imports a UI framework or UI library', offenders.length === 0, offenders.join(', '))

const declared = Object.keys({ ...PKG.dependencies, ...PKG.peerDependencies })
ok('and the package declares none', !declared.some(d => UI.test(d)), declared.join(' '))

ok('the entry hands out createTable', /export \{ createTable \} from '\.\/table\.js'/.test(readFileSync(join(SRC, 'index.js'), 'utf8')))
const subpaths = Object.keys(PKG.exports ?? {}).filter(k => k !== '.' && k !== './*')
ok('and the package exports no UI subpath', subpaths.length === 0, subpaths.join(' '))

const TOOLS = join(SRC, 'canvas-pixi', 'tools')
const presented = readdirSync(TOOLS)
    .filter(f => f.endsWith('.js') && !f.includes('.test.'))
    .filter(f => /export const (palette|cursor)\b/.test(readFileSync(join(TOOLS, f), 'utf8')))
ok('no tool carries presentation', presented.length === 0, presented.join(', '))
const tableSource = strip(readFileSync(join(SRC, 'table.js'), 'utf8'))
ok('and the table hands out tool ids, not a palette', /ids: toolIds/.test(tableSource) && !/palette|byId/.test(tableSource))

const EXEMPT = new Set(['theme.js', join('canvas-pixi', 'color.js')])
const COLOUR = /\b0x[0-9a-fA-F]{6}\b|['"`]#[0-9a-fA-F]{3,8}['"`]|['"`](?:hsla?|rgba?)\(\s*\d|['"`](?:white|black)['"`]|['"`]\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%['"`]/g
const coloured = files
    .filter(f => /\.(js|mjs)$/.test(f) && !f.includes('.test.') && !EXEMPT.has(f))
    .flatMap(rel => (strip(readFileSync(join(SRC, rel), 'utf8')).match(COLOUR) ?? []).map(hit => `${rel}: ${hit}`))
ok('every colour the package writes down is in theme.js', coloured.length === 0, coloured.slice(0, 8).join(', '))

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
