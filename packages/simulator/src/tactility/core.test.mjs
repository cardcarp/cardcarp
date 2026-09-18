import * as core from './core.js'
import { readFileSync } from 'node:fs'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

ok('same id yields an identical pose',
    core.samePose(core.restingPose('node-7f3a', true), core.restingPose('node-7f3a', true)))

ok('different ids yield different poses',
    !core.samePose(core.restingPose('node-7f3a', true), core.restingPose('node-9c11', true)))

ok('a card not in a pile rests flat',
    core.samePose(core.restingPose('node-7f3a', false), core.REST_POSE))

ok('a card in a pile rests crooked',
    !core.samePose(core.restingPose('node-7f3a', true), core.REST_POSE))

let maxRotation = 0
let maxDrift = 0
let tiltSum = 0
const SAMPLES = 20000
for (let i = 0; i < SAMPLES; i++) {
    const pose = core.restingPose('node-' + i.toString(36), true)
    maxRotation = Math.max(maxRotation, Math.abs(pose.rot))
    maxDrift = Math.max(maxDrift, Math.abs(pose.x), Math.abs(pose.y))
    tiltSum += pose.rot
}

ok('stack tilt stays within its bound',
    maxRotation <= core.STACK_ROTATION_DEG,
    `max ${maxRotation.toFixed(3)}° of ${core.STACK_ROTATION_DEG}°`)

ok('stack drift stays within its bound',
    maxDrift <= core.STACK_DRIFT_PX,
    `max ${maxDrift.toFixed(3)}px of ${core.STACK_DRIFT_PX}px`)

ok('tilt is centred, so a pile has no systematic lean',
    Math.abs(tiltSum / SAMPLES) < 0.05,
    `mean ${(tiltSum / SAMPLES).toFixed(4)}°`)

let allAbove = true
for (let i = 0; i < 5000; i++) if (core.spawnPose('n' + i).y >= 0) allAbove = false
ok('an arriving card always starts above where it lands', allAbove)

ok('mixPose extrapolates past t=1 so a spring can overshoot',
    core.mixPose(core.REST_POSE, { rot: 10, x: 0, y: 0, scale: 1, lift: 0 }, 1.08).rot > 10)

for (const [name, pose] of [
    ['rest', core.REST_POSE],
    ['resting (loose)', core.restingPose('a', false)],
    ['resting (stacked)', core.restingPose('a', true)],
    ['spawn', core.spawnPose('a')],
    ['settle', core.settlePose('a')],
    ['lift', core.liftPose('a')],
]) {
    ok(`${name} pose carries a lift`, typeof pose.lift === 'number')
}
ok('a card on the table is at lift 0', core.restingPose('a', false).lift === 0)
ok('a card in a pile is also at lift 0 — the fan is what says there is depth',
    core.restingPose('a', true).lift === 0)
ok('an arriving card starts fully off the table', core.spawnPose('a').lift === 1)
ok('a held card is fully off the table', core.liftPose('a').lift === 1)
ok('mixPose interpolates lift', core.mixPose(core.REST_POSE, core.liftPose('a'), 0.5).lift === 0.5)
ok('samePose notices a difference in lift only',
    !core.samePose(core.REST_POSE, { ...core.REST_POSE, lift: 1 }))

const lifted = core.liftPose('a')
ok('a held card is raised', lifted.y < 0)
ok('a held card is enlarged', lifted.scale > 1)

ok('the drop spring is heavier than the settle spring',
    core.TRANSITION.drop.mass > core.TRANSITION.settle.mass
    && core.TRANSITION.drop.stiffness < core.TRANSITION.settle.stiffness)
ok('picking up is quick and unsprung', core.TRANSITION.lift.duration < 0.2 && !core.TRANSITION.lift.type)

const adapter = readFileSync(new URL('../canvas-pixi/tactility.js', import.meta.url), 'utf8')
const code = adapter.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

ok('adapter never emits a canvas action', !/emitCanvasAction|observer/.test(code))
ok('adapter never imports the multiplayer layer', !/multiplayer/.test(code))

const groupMutations = code.match(/\bnode\.(position|rotation|scale|x|y|offset|move)\s*\(/g) ?? []
ok('adapter never moves, rotates or scales the card Group',
    groupMutations.length === 0,
    groupMutations.join(', ') || 'only the face child is mutated')

ok('reduced motion is still honoured', /prefersReducedMotion\(\)/.test(code))
ok('reduced motion suppresses the animation, not the pose',
    /if \(prefersReducedMotion\(\)\) \{\s*applyPose/.test(code))

ok('the shadow hangs off the node, beneath the face', /node\.addChildAt\(shadow, 0\)/.test(code))
ok('the shadow is never hit-tested', /shadow\.eventMode = 'none'/.test(code))

ok('an arrival can be told it was held', /export function tactileSpawn\(node, \{ held = false \} = \{\}\)/.test(code))
ok('a held card falls from the hold, not from the deal height',
    /held \? liftPose\(id\) : spawnPose\(id\)/.test(code))
ok('and falls on the drop spring, not the flutter ease',
    /held \? TRANSITION\.drop : TRANSITION\.flutter/.test(code))
ok('and casts a shadow even landing on a pile, because it is one card from one gesture',
    /_castsShadow = held \|\| !isStacked\(node\)/.test(code))

const mp = readFileSync(new URL('../multiplayer.js', import.meta.url), 'utf8')
    .replace(/\/\/.*$/gm, '')
const dropFromHand = mp.split('export function dropFromHand')[1]?.slice(0, 700) ?? ''
const emptyHand = mp.split('export function cardEmptyHand')[1]?.slice(0, 900) ?? ''
ok('dropFromHand marks the card as held', /held: true/.test(dropFromHand))
ok('emptying the hand does not — that is a deal', !/held: true/.test(emptyHand))

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
