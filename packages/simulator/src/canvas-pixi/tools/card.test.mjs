// A pile has one layout author: relayoutGroup, the only code that knows a mirrored viewer fills a
// pile's slots in reverse. Anything that lays a pile out by itself gets the mirror wrong.
// Run: node packages/simulator/src/canvas-pixi/tools/card.test.mjs
//
// Static, like selection.test.mjs, because card.js needs a renderer to run. What rots here is not
// the arithmetic, which every pile change exercises, but a new path that positions a pile's cards
// by hand. That looks right at an unmirrored table and moves the pile at a mirrored one, so it gets
// a test. It is how the offline shuffle came to move a mirrored pile a fan's length per shuffle.

import { readFileSync } from 'node:fs'

const strip = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
const code = strip(readFileSync(new URL('./card.js', import.meta.url), 'utf8'))

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

// A top-level function's body, from its signature to the line that closes it.
function body(name) {
    const start = code.search(new RegExp(`^(export )?function ${name}\\(`, 'm'))
    if (start === -1) return ''
    const end = code.indexOf('\n}\n', start)
    return code.slice(start, end === -1 ? undefined : end)
}

ok('relayoutGroup fills the slots in reverse for a mirrored viewer',
    /mirror_view\.get\(\) \? last - i : i/.test(body('relayoutGroup')))

// The two shuffles: this client's own (offline) and the order the relay hands back (online).
for (const name of ['shuffle', 'setGroupOrder']) {
    const src = body(name)
    ok(`found ${name}`, src.length > 0)
    ok(`${name} lays the pile out through relayoutGroup`, /relayoutGroup\(groupId\)/.test(src))
    ok(`${name} positions no card itself`, !/\.position\.set\(/.test(src))
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
