import { readFileSync } from 'node:fs'

const strip = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
const code = strip(readFileSync(new URL('./card.js', import.meta.url), 'utf8'))

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

function body(name) {
    const start = code.search(new RegExp(`^(export )?function ${name}\\(`, 'm'))
    if (start === -1) return ''
    const end = code.indexOf('\n}\n', start)
    return code.slice(start, end === -1 ? undefined : end)
}

ok('relayoutGroup fills the slots in reverse for a mirrored viewer',
    /mirror_view\.get\(\) \? last - i : i/.test(body('relayoutGroup')))

for (const name of ['shuffle', 'setGroupOrder']) {
    const src = body(name)
    ok(`found ${name}`, src.length > 0)
    ok(`${name} lays the pile out through relayoutGroup`, /relayoutGroup\(groupId\)/.test(src))
    ok(`${name} positions no card itself`, !/\.position\.set\(/.test(src))
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
