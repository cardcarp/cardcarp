// Properties the piece/annotation split has to hold.
// Run: node src/view/table/canvas-pixi/selection.test.mjs
//
// Static rather than behavioural, deliberately. The thing most likely to rot here is not the
// drawing — that is visible the moment you select something — it is a new tool being added
// without deciding which kind of object it is, and silently inheriting a transform box that
// offers its player a nonsense operation. That failure is invisible until someone drags a
// handle, so it gets a test.

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

// === Every tool in the registry declares what it is ===

const registry = read('./tools/index.js')
const toolFiles = [...registry.matchAll(/import \* as \w+ from '\.\/(\w[\w-]*\.js)'/g)].map(m => m[1])
ok('found the tool registry', toolFiles.length >= 8, toolFiles.join(' '))

const declared = new Map()
for (const file of toolFiles) {
    if (file === 'select.js') continue // a mode, not an object type
    const src = read(`./tools/${file}`)
    const id = src.match(/^export const id = '([^']+)'/m)?.[1]
    const style = src.match(/^export const selection_style = '([^']+)'/m)?.[1]
    ok(`${file} declares a selection_style`, !!style, style ?? 'MISSING')
    ok(`${file} declares a valid one`, style === 'piece' || style === 'annotation', String(style))
    if (id && style) declared.set(id, style)
}

// === and declares the RIGHT one ===
// Authored geometry keeps its handles; given geometry does not.

const EXPECTED = {
    card: 'piece', dice: 'piece', counter: 'piece', marker: 'piece',
    rect: 'annotation', arrow: 'annotation', text: 'annotation', board: 'annotation',
}
for (const [id, want] of Object.entries(EXPECTED)) {
    ok(`${id} is a ${want}`, declared.get(id) === want, declared.get(id) ?? 'undeclared')
}

// === The dispatch actually suppresses the box ===

const selection = strip(read('./selection.js'))

const anchors = selection.split('export function updateTransformerAnchors')[1] ?? ''
const guardAt = anchors.indexOf('selectionHasPiece')
const enableAt = anchors.indexOf('border_enabled = true')
ok('updateTransformerAnchors consults the piece rule', guardAt !== -1)
ok('it does so BEFORE enabling the box, so a piece can never reach the anchors',
    guardAt !== -1 && enableAt !== -1 && guardAt < enableAt)

// ANY piece, not ALL: a mixed selection scales as one box, so one card in it is enough.
ok('a mixed selection is judged by ANY piece, not ALL', /nodes\.some\(isPiece\)/.test(selection))

// === Nothing is left selected-but-unmarked ===
// With the transformer drawing nothing, every object has to draw its own chrome — including the
// annotations caught up in a mixed selection.
const outlines = selection.split('function refreshOutlines')[1]?.split('function addAnnotationOutline')[0] ?? ''
// A piece is marked either way — a ring when it is at rest, a plate when it is being carried.
// The property is that neither branch leaves it unmarked, so both are named here rather than
// only the one that happened to be written first.
ok('a resting piece draws its ring', /if \(!carried\) addPieceChrome/.test(outlines))
ok('a carried piece draws its plate instead', /showPlate\(host, members\)/.test(outlines))
// One plate per OBJECT. Per-node fans them across a pile, and translucent fills stacked on each
// other multiply toward opaque — which is what made a dragged deck look wrong.
ok('and one plate per object, not per node', /const key = node\.groupId \?\? node/.test(outlines))
ok('and the plate goes under the card, not over it', /addChildAt\(plate, node\.getChildIndex\(node\.face\)\)/.test(selection))
// Under the card is not enough on a pile: a plate hosted on the TOP member is under that one
// card and over the twenty-nine below it, which is a gold bar laid across the deck. The host has
// to be the member the whole object sits on.
ok('and hosts on the bottom member, so it passes under the whole pile',
    /childIndex\(n\) < childIndex\(low\)/.test(outlines))
ok('annotations still draw when the transformer has gone quiet',
    /unboxed \|\| boxes\.size >= 2/.test(outlines))
ok('an endpoint object is still drawn by its handles alone', /endpointToolFor\(selected\)/.test(outlines))

// === The piece chrome cannot cover the piece ===
// The ui layer is above the element layers, so a filled shape here would hide the card it is
// meant to be lifting. Both rings must be stroke-only.
const chromeBody = selection.split('function addPieceChrome')[1] ?? ''
const chrome = chromeBody.slice(0, chromeBody.indexOf('\n}\n') + 1)
ok('piece chrome draws a crisp edge, not a faked blur',
    !/for \s*\(/.test(chrome), 'no stroke loop in addPieceChrome')
ok('piece chrome is stroke-only, never filled', !/\bfill\s*:/.test(chrome), 'no fill in addPieceChrome')

// === The other half of the card-resize fix ===

const mp = strip(read('../multiplayer.js'))
const transform = mp.split("case 'nodes:transform'")[1]?.slice(0, 900) ?? ''
ok('an incoming transform cannot scale a card',
    /kind === 'card'\) node\.scale\.set\(1, 1\)/.test(transform))
ok('and still scales everything else', /else node\.scale\.set\(t\.scaleX, t\.scaleY\)/.test(transform))

// === The two selections are told apart by colour as well as shape ===
// Shape alone fails the case that matters most: a mixed selection, where boxes and halos are on
// screen together. WHICH colours is the app's to say (its theme) — but the table's own neutral
// fallback has to keep the rule too, or a table given no theme would quietly lose it.
const look = theme().selection
ok('the fallback keeps pieces and annotations apart',
    look.piece !== look.outline && look.piece !== look.box, `${look.piece} vs ${look.outline} / ${look.box}`)

// === And both give way to one warning colour at the table's edge ===
// The rule is that a colour the chrome draws goes through hinted(), so there is a single place
// that knows what "about to be discarded" looks like. Checked by counting: a bare piece, outline or
// box colour left in a stroke or a fill is a piece of chrome that stays its own colour over the edge,
// which is the exact bug this collapses into one function to avoid.
ok('and the fallback discard colour is neither of the two it replaces',
    look.discard !== look.piece && look.discard !== look.outline)

//
// The hand's landing footprint is excluded, and it is the one honest exception: it is drawn for
// a DOM drag out of the hand rail, which is not a table drag and has no discard state to be in.
const chromePaint = selection.split('export function showDropFootprint')[0]
    + selection.split('export function hideDropFootprint')[1]
const painted = chromePaint.match(/(?:color|fill)\s*[:(]\s*chrome\('(?:piece|outline|box)'\)/g) ?? []
ok('every drawn selection colour goes through the discard hint', painted.length === 0,
    painted.join(', ') || 'none unhinted')
ok('and the hint lands instantly — chrome that answers "what if I release NOW" cannot lag',
    /return discard_hint \? chrome\('discard'\) : color/.test(selection)
    && !/animate\([^)]*discard/.test(selection))

// === Anything measuring a piece for a reason sees through the cosmetics ===
// getClientRect folds in the face child, so a card mid-flutter reports the box of a card still
// in the air. Chrome drawn against that box is drawn where the card is about to no longer be.
// getClientRect is Pixi's getBounds, wrapped as screenRect so every consumer reads one shape.
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
