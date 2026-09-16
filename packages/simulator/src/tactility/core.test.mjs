// Properties the tactility vocabulary has to hold, checked without a browser, a bundler or a
// test runner: `node src/view/table/tactility/core.test.mjs`.
//
// Zero dependencies on purpose. This module is meant to be liftable into a library, and a
// library's core should be testable by anyone who has node and the folder.
//
// These are not unit tests of arithmetic. Each one pins a claim the feature rests on — that
// peers agree without exchanging anything, that the motion stays under the threshold where it
// would read as a bug, and that nothing here can reach the relay or move a card.

import * as core from './core.js'
import { readFileSync } from 'node:fs'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

// === Agreement ===
// The whole reason crookedness is derived from the card id: every player has to see the same
// pile, and the wire must not have to carry a single byte to make that true.

ok('same id yields an identical pose',
    core.samePose(core.restingPose('node-7f3a', true), core.restingPose('node-7f3a', true)))

ok('different ids yield different poses',
    !core.samePose(core.restingPose('node-7f3a', true), core.restingPose('node-9c11', true)))

ok('a card not in a pile rests flat',
    core.samePose(core.restingPose('node-7f3a', false), core.REST_POSE))

ok('a card in a pile rests crooked',
    !core.samePose(core.restingPose('node-7f3a', true), core.REST_POSE))

// === Restraint ===
// Tactility reads as quality until someone notices it, and then it reads as a bug. These
// bounds are the difference.

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

// A biased hash would tilt every card in a pile the same way, which looks like a skewed pile
// rather than a hand-stacked one — a bug that would survive every bound above.
ok('tilt is centred, so a pile has no systematic lean',
    Math.abs(tiltSum / SAMPLES) < 0.05,
    `mean ${(tiltSum / SAMPLES).toFixed(4)}°`)

let allAbove = true
for (let i = 0; i < 5000; i++) if (core.spawnPose('n' + i).y >= 0) allAbove = false
ok('an arriving card always starts above where it lands', allAbove)

// === Overshoot ===
// The settle spring runs over a 0→1 scalar and overshoots it. Clamping mixPose would quietly
// turn the one spring in the feature back into an ease, and nothing would look broken.
ok('mixPose extrapolates past t=1 so a spring can overshoot',
    core.mixPose(core.REST_POSE, { rot: 10, x: 0, y: 0, scale: 1, lift: 0 }, 1.08).rot > 10)

// === Height ===
// `lift` is what makes an arrival read as a fall rather than a zoom, and what the adapter turns
// into a shadow. A pose that forgets it is a pose the adapter cannot draw depth for.
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

// A held card is raised and enlarged, not merely shadowed — the shadow alone would read as the
// card sinking into the table rather than coming off it.
const lifted = core.liftPose('a')
ok('a held card is raised', lifted.y < 0)
ok('a held card is enlarged', lifted.scale > 1)

// The drop is the heavier of the two springs: it is a card falling from a hand, where settle is
// one that never left the surface.
ok('the drop spring is heavier than the settle spring',
    core.TRANSITION.drop.mass > core.TRANSITION.settle.mass
    && core.TRANSITION.drop.stiffness < core.TRANSITION.settle.stiffness)
ok('picking up is quick and unsprung', core.TRANSITION.lift.duration < 0.2 && !core.TRANSITION.lift.type)

// === Containment ===
// Static guarantees about the adapter, which is where a well-meaning change is most likely to
// turn a render-only effect into a synchronisation problem.

const adapter = readFileSync(new URL('../canvas-pixi/tactility.js', import.meta.url), 'utf8')
const code = adapter.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

ok('adapter never emits a canvas action', !/emitCanvasAction|observer/.test(code))
ok('adapter never imports the multiplayer layer', !/multiplayer/.test(code))

const groupMutations = code.match(/\bnode\.(position|rotation|scale|x|y|offset|move)\s*\(/g) ?? []
ok('adapter never moves, rotates or scales the card Group',
    groupMutations.length === 0,
    groupMutations.join(', ') || 'only the face child is mutated')

// The enabled flag is gone — tactility is what the table is now, not a setting (see store.js).
// What those three checks were really protecting is unchanged and stated directly instead: the
// vocabulary only ever writes to the face, and reduced motion is still honoured.
ok('reduced motion is still honoured', /prefersReducedMotion\(\)/.test(code))
ok('reduced motion suppresses the animation, not the pose',
    /if \(prefersReducedMotion\(\)\) \{\s*applyPose/.test(code))

// The shadow is the one thing here that is NOT on the face — it must not be, or it would tilt
// and scale with the card instead of lying on the table under it. So it is a child of the node,
// which is the single exception, and it is added rather than transformed.
ok('the shadow hangs off the node, beneath the face', /node\.addChildAt\(shadow, 0\)/.test(code))
ok('the shadow is never hit-tested', /shadow\.eventMode = 'none'/.test(code))

// === A card played from the hand lands; it does not flutter ===
//
// The two arrivals share one function and differ only in where they fall from and what curve
// they fall on, which is exactly the kind of pair a later simplification collapses back into
// one. `flutter` is an ease that covers most of its distance in the first tenth of its
// duration — right for a card being DEALT, and a twitch on a card the player was holding a
// frame ago. So the held path is named here, both halves of it.
ok('an arrival can be told it was held', /export function tactileSpawn\(node, \{ held = false \} = \{\}\)/.test(code))
ok('a held card falls from the hold, not from the deal height',
    /held \? liftPose\(id\) : spawnPose\(id\)/.test(code))
ok('and falls on the drop spring, not the flutter ease',
    /held \? TRANSITION\.drop : TRANSITION\.flutter/.test(code))
ok('and casts a shadow even landing on a pile, because it is one card from one gesture',
    /_castsShadow = held \|\| !isStacked\(node\)/.test(code))

// The other end of it: only the hand's own drop says held. cardEmptyHand puts a whole hand
// down at once and is a deal, so it must NOT — sixty simultaneous springs and sixty shadows
// is the thing the flutter path exists to avoid.
const mp = readFileSync(new URL('../multiplayer.js', import.meta.url), 'utf8')
    .replace(/\/\/.*$/gm, '')
const dropFromHand = mp.split('export function dropFromHand')[1]?.slice(0, 700) ?? ''
const emptyHand = mp.split('export function cardEmptyHand')[1]?.slice(0, 900) ?? ''
ok('dropFromHand marks the card as held', /held: true/.test(dropFromHand))
ok('emptying the hand does not — that is a deal', !/held: true/.test(emptyHand))

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
