import { readFileSync } from 'node:fs'
import { theme } from '../theme.js'

const here = (rel) => new URL(rel, import.meta.url)
const read = (rel) => readFileSync(here(rel), 'utf8')
const strip = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const registry = read('./tools/index.js')
const toolFiles = [...registry.matchAll(/import \* as \w+ from '\.\/(\w[\w-]*\.js)'/g)].map(m => m[1])
ok('found the tool registry', toolFiles.length >= 8, toolFiles.join(' '))

const declared = new Map()
for (const file of toolFiles) {
    if (file === 'select.js') continue
    const src = read(`./tools/${file}`)
    const id = src.match(/^export const id = '([^']+)'/m)?.[1]
    const style = src.match(/^export const selection_style = '([^']+)'/m)?.[1]
    ok(`${file} declares a selection_style`, !!style, style ?? 'MISSING')
    ok(`${file} declares a valid one`, style === 'piece' || style === 'annotation', String(style))
    if (id && style) declared.set(id, style)
}

const EXPECTED = {
    card: 'piece', dice: 'piece', counter: 'piece', marker: 'piece',
    rect: 'annotation', arrow: 'annotation', text: 'annotation', board: 'annotation',
}
for (const [id, want] of Object.entries(EXPECTED)) {
    ok(`${id} is a ${want}`, declared.get(id) === want, declared.get(id) ?? 'undeclared')
}

const selection = strip(read('./selection.js'))

const anchors = selection.split('export function updateTransformerAnchors')[1] ?? ''
const guardAt = anchors.indexOf('selectionHasPiece')
const enableAt = anchors.indexOf('border_enabled = true')
ok('updateTransformerAnchors consults the piece rule', guardAt !== -1)
ok('it does so BEFORE enabling the box, so a piece can never reach the anchors',
    guardAt !== -1 && enableAt !== -1 && guardAt < enableAt)

ok('a mixed selection is judged by ANY piece, not ALL', /nodes\.some\(isPiece\)/.test(selection))

const outlines = selection.split('function refreshOutlines')[1]?.split('function addAnnotationOutline')[0] ?? ''
ok('a resting piece draws its ring', /if \(!carried\) addPieceChrome/.test(outlines))
ok('a carried piece draws its plate instead', /showPlate\(host, members\)/.test(outlines))
ok('and one plate per object, not per node', /const key = node\.groupId \?\? node/.test(outlines))
ok('and the plate goes under the card, not over it', /addChildAt\(plate, node\.getChildIndex\(node\.face\)\)/.test(selection))
ok('and hosts on the bottom member, so it passes under the whole pile',
    /childIndex\(n\) < childIndex\(low\)/.test(outlines))
ok('annotations still draw when the transformer has gone quiet',
    /unboxed \|\| boxes\.size >= 2/.test(outlines))
ok('an endpoint object is still drawn by its handles alone', /endpointToolFor\(selected\)/.test(outlines))

const chromeBody = selection.split('function addPieceChrome')[1] ?? ''
const chrome = chromeBody.slice(0, chromeBody.indexOf('\n}\n') + 1)
ok('piece chrome draws a crisp edge, not a faked blur',
    !/for \s*\(/.test(chrome), 'no stroke loop in addPieceChrome')
ok('piece chrome is stroke-only, never filled', !/\bfill\s*:/.test(chrome), 'no fill in addPieceChrome')

const mp = strip(read('../multiplayer.js'))
const transform = mp.split("case 'nodes:transform'")[1]?.slice(0, 900) ?? ''
ok('an incoming transform cannot scale a card',
    /kind === 'card'\) node\.scale\.set\(1, 1\)/.test(transform))
ok('and still scales everything else', /else node\.scale\.set\(t\.scaleX, t\.scaleY\)/.test(transform))

const look = theme().selection
ok('the fallback keeps pieces and annotations apart',
    look.piece !== look.outline && look.piece !== look.box, `${look.piece} vs ${look.outline} / ${look.box}`)

ok('and the fallback discard colour is neither of the two it replaces',
    look.discard !== look.piece && look.discard !== look.outline)

const chromePaint = selection.split('export function showDropFootprint')[0]
    + selection.split('export function hideDropFootprint')[1]
const painted = chromePaint.match(/(?:color|fill)\s*[:(]\s*chrome\('(?:piece|outline|box)'\)/g) ?? []
ok('every drawn selection colour goes through the discard hint', painted.length === 0,
    painted.join(', ') || 'none unhinted')
ok('and the hint lands instantly — chrome that answers "what if I release NOW" cannot lag',
    /return discard_hint \? chrome\('discard'\) : color/.test(selection)
    && !/animate\([^)]*discard/.test(selection))

ok('selection chrome measures the resting box',
    /withRestingPose\(node, \(\) => screenRect\(node\)\)/.test(
        selection.split('function refreshOutlines')[1]?.split('function addAnnotationOutline')[0] ?? ''))
ok('alignment measures the resting box',
    /withRestingPose\(node, \(\) => screenRect\(node\)\)/.test(
        selection.split('export function selectionUnits')[1]?.slice(0, 700) ?? ''))

const tact = strip(readFileSync(here('./tactility.js'), 'utf8'))
ok('withRestingPose restores what it borrowed', /finally \{/.test(
    tact.split('export function withRestingPose')[1]?.slice(0, 600) ?? ''))
ok('and is a pass-through for a node that was never posed',
    /if \(!face\?\._tactilePosed\) return measure\(\)/.test(tact))

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
