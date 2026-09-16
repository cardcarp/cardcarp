// ptcg's simulator UI drives the table through its object and the package root, and stays in its
// folder.
// Run: node apps/ptcg/src/simulator/boundary.test.mjs
//
// Static, like the simulator's own tests. This UI was lifted out of @cardcarp/simulator to show that
// an app can own every pixel of a table and still drive it with nothing but createTable's object. The
// shortcut that would quietly undo that is a deep import — `@cardcarp/simulator/seats.js`, because
// the verb was not on the object yet — so a subpath import fails here, and so does a relative import
// that wanders out of this folder into the rest of the app.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))

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

const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const files = walk(DIR).filter(f => /\.(js|vue)$/.test(f))
ok('found the simulator UI', files.length > 40, `${files.length} files`)

const deep = []
const escapes = []
const missing = []
for (const file of files) {
    const rel = relative(DIR, file)
    for (const m of strip(readFileSync(file, 'utf8')).matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const spec = m[1] ?? m[2]
        if (spec.startsWith('@cardcarp/simulator/')) deep.push(`${rel} → ${spec}`)
        if (!spec.startsWith('.')) continue
        const target = resolve(dirname(file), spec)
        if (!target.startsWith(DIR)) escapes.push(`${rel} → ${spec}`)
        else if (!existsSync(target)) missing.push(`${rel} → ${spec}`)
    }
}
ok('no deep import into @cardcarp/simulator', deep.length === 0, deep.join(', '))
ok('no relative import leaves src/simulator', escapes.length === 0, escapes.join(', '))
ok('every relative import resolves', missing.length === 0, missing.join(', '))

// controls.js lists the toolbars and panel sections, and they read their key hints from it, so it is
// handed over by createSimulatorView and reached through useControls. A component importing it would be
// importing itself back (see use-controls.js).
const importsControls = files
    .filter(file => /['"]\.{1,2}\/(?:\.\.\/)*controls\.js['"]/.test(strip(readFileSync(file, 'utf8'))))
    .map(file => relative(DIR, file))
ok('only createSimulatorView imports controls.js', importsControls.join() === 'index.js', importsControls.join(', '))
ok('the UI is handed its table by createSimulatorView', /provideTable\(table\)/.test(readFileSync(join(DIR, 'index.js'), 'utf8')))

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
