// Tactility, bound to Pixi.
//
// tactility/core.js is imported UNCHANGED — not adapted, not copied, not forked. This file is
// the whole cost of binding that vocabulary to a renderer.
//
// The rule the first adapter stated in capitals holds here, and matters more rather than less
// now that there is more to draw: TACTILITY NEVER TOUCHES THE NODE. Not its position, not its
// rotation, not its scale. Motion that moved the node would be motion the relay has to agree
// on — every frame of every settling card becomes a nodes:move, and two players watching one
// pile would need identical float math to stay in step. Motion that moves only the face is a
// local render choice. canvas-pixi/node.js gives every node a `face` child precisely so this
// stays true by construction rather than by discipline.
//
// === What the shadow is for ===
//
// `lift` (see core.js) is the pose field that says how far off the table a card is. This file
// is where that becomes something you can see, and a shadow is the only honest way to draw it:
// scale alone is ambiguous between "nearer" and "bigger", which is why an arriving card used to
// read as zooming rather than falling. A shadow that starts wide and soft and closes on the
// card as it lands is unambiguous — it is the one cue the eye reads as height without being
// told to.
//
// The shadow is a child of the NODE, drawn beneath the face — not a child of the face. If it
// lived inside the face it would tilt and scale with the card, which is exactly backwards: a
// card leaning over its own shadow is what selling weight looks like, and a shadow glued to the
// card's own rotation is just a dark outline.
//
// === Why it is affordable ===
//
// One blurred texture, generated once, worn by every piece as a NineSliceSprite. Not a filter:
// a DropShadowFilter is a render pass per object, and a table holds hundreds. Not a Graphics
// either — a stack of concentric strokes approximating a blur is what the first cut of the
// selection chrome did, and it looked like exactly what it was. A nine-sliced bitmap stretches
// to any card size without distorting the blur, tints and fades for free, and batches with
// every other shadow on the table.

import { NineSliceSprite, Texture } from 'pixi.js'
import { cardHeight } from '../stage.js'
import { theme } from '../theme.js'
import { animate } from 'motion'

import {
    REST_POSE,
    TRANSITION,
    mixPose,
    restingPose,
    liftPose,
    spawnPose,
    settlePose,
} from '../tactility/core.js'

const DEG = Math.PI / 180

// Everything below was calibrated against a card 150 world units tall. The card is stage-derived
// now, so the calibration travels with it — see the long note in tactility/core.js.
const CARD_CALIBRATION_HEIGHT = cardHeight() / 150

// === The shadow texture ===
//
// A blurred rounded rect with room around it for the blur to fall into. SHADOW_PAD is that
// room; CORE is the flat middle the nine-slice stretches, and only has to be big enough to
// exist. The slice border is PAD + RADIUS, so every soft edge sits in a corner tile and is
// never stretched.
// Scaled with the card for the same reason every length in tactility/core.js is: these were
// tuned against a 150-unit card, and the nine-slice's border renders one texture pixel to one
// world unit, so an unscaled texture would put a blur 31% of a card thick around a card that
// used to wear one 23% thick. Rounded to whole pixels because they size a canvas.
const SHADOW_SCALE = CARD_CALIBRATION_HEIGHT
const SHADOW_PAD = Math.round(24 * SHADOW_SCALE)
const SHADOW_CORE = Math.round(24 * SHADOW_SCALE)
const SHADOW_RADIUS = Math.round(10 * SHADOW_SCALE)
const SHADOW_BLUR = 10 * SHADOW_SCALE
const SHADOW_SLICE = SHADOW_PAD + SHADOW_RADIUS

// How a lift reads, at lift = 1. Tuned against a DARK table, which is the hard case: a black
// shadow on a near-black mat has almost no contrast to work with, so it has to be broad and
// committed rather than tight and faint. The width is doing as much work as the darkness.
const SHADOW_DROP_PX = 22 * SHADOW_SCALE   // how far below the card its shadow falls
const SHADOW_DRIFT_PX = 5 * SHADOW_SCALE   // and how far to the side — light comes from up and slightly left
const SHADOW_ALPHA = 0.62      // how dark it gets
const SHADOW_SPREAD = 0.55     // how much wider than the card, as a fraction of the pad

let shadow_texture = null

// Built on a 2D canvas rather than with Pixi's own blur, because this runs once and a canvas
// blur is one line. `filter` is well supported wherever WebGL is.
function buildShadowTexture() {
    if (shadow_texture) return shadow_texture

    const size = SHADOW_PAD * 2 + SHADOW_CORE
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    ctx.filter = `blur(${SHADOW_BLUR}px)`
    ctx.fillStyle = theme().card.shadow
    ctx.beginPath()
    ctx.roundRect(SHADOW_PAD, SHADOW_PAD, SHADOW_CORE, SHADOW_CORE, SHADOW_RADIUS)
    ctx.fill()

    shadow_texture = Texture.from(canvas)
    return shadow_texture
}

// Called once when the scene is built, so the first card to be picked up is not the one that
// pays for generating the texture.
export function initTactility() {
    buildShadowTexture()
}

export function destroyTactility() {
    shadow_texture?.destroy(true)
    shadow_texture = null
}

// Lazily worn. A table can hold hundreds of cards and most are never picked up; a shadow each
// would be hundreds of display objects standing at zero alpha. The first lift builds one, and
// it is hidden rather than destroyed afterwards — a card picked up once tends to be picked up
// again, and an invisible child costs nothing to skip.
function shadowFor(node) {
    if (node._shadow) return node._shadow
    if (!node.props?.width) return null

    const shadow = new NineSliceSprite({
        texture: buildShadowTexture(),
        leftWidth: SHADOW_SLICE,
        topHeight: SHADOW_SLICE,
        rightWidth: SHADOW_SLICE,
        bottomHeight: SHADOW_SLICE,
    })
    shadow.eventMode = 'none'
    shadow.visible = false
    node._shadow = shadow
    // Beneath the face, which node.js put at index 0.
    node.addChildAt(shadow, 0)
    return shadow
}

// The shadow at a given height. Everything about it grows with `lift`: it falls further, spreads
// wider and darkens, which together are what the eye reads as distance from the surface.
// One shadow per OBJECT, not per node — see tactileLift. A card that is part of a lifted pile
// rises and grows with the rest of it but casts nothing: sixty overlapping blurred sprites
// would be sixty times the fill rate to draw one dark smudge, and the smudge would be far
// darker than any real shadow because the alphas compound.
function applyShadow(node, lift) {
    if (!node._castsShadow || lift <= 0.001) {
        if (node._shadow) node._shadow.visible = false
        return
    }
    const shadow = shadowFor(node)
    if (!shadow) return

    const w = node.props.width
    const h = node.props.height
    const spread = SHADOW_PAD * (0.35 + SHADOW_SPREAD * lift)

    shadow.visible = true
    shadow.alpha = SHADOW_ALPHA * lift
    shadow.width = w + spread * 2
    shadow.height = h + spread * 2
    shadow.position.set(
        -(w + spread * 2) / 2 + SHADOW_DRIFT_PX * lift,
        -(h + spread * 2) / 2 + SHADOW_DROP_PX * lift,
    )
}

function applyPose(node, pose) {
    const face = node.face
    if (!face) return
    face.rotation = pose.rot * DEG
    face.position.set(pose.x, pose.y)
    face.scale.set(pose.scale)
    face._tactilePosed = true
    applyShadow(node, pose.lift ?? 0)
}

// Honoured at call time rather than read once, because a player can change it mid-session and
// the answer costs nothing to ask for. Exported because the delete puff (see poof.js) has the
// same question and the same answer, and two copies of a media query is how they drift. Reduced motion suppresses the ANIMATION, not the
// crookedness or the shadow: a stack that sits slightly askew isn't movement, and neither is a
// held card being visibly held.
export function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

// The multiplayer-stable id when there is one, so every player derives the same crookedness for
// the same card. Solo tables fall back to the node's own uid.
const seedOf = (node) => node?.nodeId ?? `local:${node?.uid ?? 0}`

const isStacked = (node) => !!node?.groupId

function stop(node) {
    if (!node?._tactile) return
    node._tactile.stop?.()
    node._tactile = null
}

// Which way is up, for THIS node, right now. A mirrored seat renders cards counter-rotated 180°
// (see scene.js), and a player can rotate a card by hand on top of that. Either way the face's
// local -y stops pointing at the top of the screen, and an arriving card would appear to fall
// upward. Reading the accumulated rotation covers both causes without this file needing to know
// that either exists.
function upwardSign(node) {
    const deg = ((node.rotation / DEG) % 360 + 360) % 360
    return deg > 90 && deg < 270 ? -1 : 1
}

// `lift` and `scale` are unsigned — a card is not held less high for being seen upside down —
// so only the displacements flip.
function orient(pose, sign) {
    return sign === 1 ? pose : { ...pose, x: pose.x * sign, y: pose.y * sign }
}

// The scalar form of Motion's animate (0 → 1, read through onUpdate) rather than handing it the
// face as a subject: Motion's object path retains every subject in a module-level store, and a
// table churns through thousands of nodes. A number is not retained by anything. It also lets
// one timeline drive rotation, position, scale and the shadow together, which is what makes the
// drop's overshoot land on all four at once instead of four springs drifting apart.
function transition(node, from, to, config, onSettled) {
    if (!node.face) return
    stop(node)

    if (prefersReducedMotion()) {
        applyPose(node, to)
        onSettled?.()
        return
    }

    applyPose(node, from)
    node._tactile = animate(0, 1, {
        ...config,
        onUpdate(t) {
            // Destroyed, cleared by a snapshot replay, or the table was torn down mid-flight.
            if (!node.parent) return stop(node)
            applyPose(node, mixPose(from, to, t))
        },
        onComplete() {
            node._tactile = null
            if (!node.parent) return
            applyPose(node, to)
            onSettled?.()
        },
    })
}

// A card arriving on the table: it comes in high, tilted and a shade too big, and falls to rest.
// Cards that simply appear read as data; cards that land read as objects.
//
// `held` says the card is arriving out of somebody's hand — dragged out of the hand rail and
// released — rather than being dealt. That is not a variation on an arrival, it is the SAME
// event as letting go of a card already on the table, and it gets the same motion: it starts
// from the held pose and falls with `drop`, the one spring in the vocabulary.
//
// It matters because the two transitions read completely differently. `flutter` is an ease with
// a near-vertical start (cubic-bezier(0.16, 1, 0.3, 1) covers most of its distance in the first
// tenth of its duration), so a card arriving from seven degrees and twenty-six pixels up snaps
// into place and then creeps — which is exactly the twitch a played card should not have. It is
// the right curve for a DEALT card, where a hand has already slowed the placement, and the
// wrong one for a card the player was holding a frame ago and has just released.
export function tactileSpawn(node, { held = false } = {}) {
    const id = seedOf(node)
    const sign = upwardSign(node)

    // A card arriving alone casts a shadow on the way down, which is what turns the arrival
    // from a zoom into a fall. A card dealt INTO a pile does not: sixty cards landing in the
    // same second would be sixty overlapping blurs for one pile, and the pile's own fan is
    // already saying there is depth there. Same rule as a lifted pile — one shadow per object.
    //
    // A played card is exempt from that: it is one card, from one gesture, and the shadow
    // closing on it as it falls is most of what sells the weight. Sixty of those never happen.
    node._castsShadow = held || !isStacked(node)

    transition(
        node,
        orient(held ? liftPose(id) : spawnPose(id), sign),
        orient(restingPose(id, isStacked(node)), sign),
        held ? TRANSITION.drop : TRANSITION.flutter,
        () => { node._castsShadow = false },
    )
}

// Picked up. Fast, because the hand has already decided.
//
// Takes the whole set rather than one node, because a drag always IS a set and because the
// shadow is a property of the object being carried rather than of each card in it. A pile goes
// up as one thing and casts one shadow; that decision needs to see all of them at once.
export function tactileLift(nodes) {
    const casters = shadowCasters(nodes)
    for (const node of nodes) {
        node._castsShadow = casters.has(node)
        const id = seedOf(node)
        const sign = upwardSign(node)
        transition(node, currentPose(node), orient(liftPose(id), sign), TRANSITION.lift)
    }
}

// One per group, plus every ungrouped node. The topmost card of a pile is the one the eye reads
// as the pile, so its shadow is the one that looks like the pile's.
function shadowCasters(nodes) {
    const casters = new Set()
    const byGroup = new Map()
    for (const node of nodes) {
        if (!node.groupId) { casters.add(node); continue }
        const held = byGroup.get(node.groupId)
        if (!held || childIndex(node) > childIndex(held)) byGroup.set(node.groupId, node)
    }
    for (const node of byGroup.values()) casters.add(node)
    return casters
}

function childIndex(node) {
    return node.parent ? node.parent.getChildIndex(node) : -1
}

// Let go of. The card falls from wherever it was being held, meets the table, and is brought up
// short by it — the spring's overshoot IS the weight, so it is deliberately visible.
//
// A card that was never lifted (dropped by a verb rather than a hand — a draw, a peer's move)
// still gets a small kick, which is what settlePose is for. A card that WAS lifted falls from
// its held pose instead, which is a longer way down and reads heavier.
export function tactileDrop(nodes) {
    for (const node of nodes) {
        const id = seedOf(node)
        const sign = upwardSign(node)
        const held = node._lifted ?? false
        node._lifted = false
        transition(
            node,
            held ? currentPose(node) : orient(settlePose(id), sign),
            orient(restingPose(id, isStacked(node)), sign),
            TRANSITION.drop,
            // The shadow is only released once the card has actually landed, so it shrinks with
            // the fall rather than vanishing the instant the pointer comes up.
            () => { node._castsShadow = false },
        )
    }
}

// Marks a node as being carried, so tactileDrop knows it is falling from a hand rather than
// merely being nudged. Set by the pointer machine, which is the only thing that knows.
export function markLifted(nodes) {
    for (const node of nodes) node._lifted = true
}

// Where the face actually is right now, as a pose. Read rather than assumed, so a lift
// interrupted mid-flight — picked up, put down, picked up again — starts from where the card
// visibly is instead of snapping back to rest first.
function currentPose(node) {
    const face = node.face
    if (!face?._tactilePosed) return REST_POSE
    return {
        rot: face.rotation / DEG,
        x: face.position.x,
        y: face.position.y,
        scale: face.scale.x,
        lift: node._shadow?.visible ? (node._shadow.alpha / SHADOW_ALPHA) : 0,
    }
}

// Cards in a pile sit a fraction crooked. A perfectly aligned stack is the single clearest tell
// that a table is rendered rather than dealt.
export function tactileStack(nodes) {
    for (const node of nodes) {
        if (node._tactile) continue   // a mid-flight animation owns the face
        applyPose(node, orient(restingPose(seedOf(node), true), upwardSign(node)))
    }
}

// Measure a node as it will LIE, not as it is drawn right now. A card dropped from the hand is
// mid-flutter at the moment the selection is pointed at it, so its live box is the box of a
// card still in the air; the chrome would be drawn around a place the card is leaving.
//
// The shadow is hidden for the measurement too — it extends well past the card, and chrome
// drawn around a card's shadow is chrome drawn around nothing.
export function withRestingPose(node, measure) {
    const face = node?.face
    if (!face?._tactilePosed) return measure()

    const rotation = face.rotation
    const position = { x: face.position.x, y: face.position.y }
    const scale = face.scale.x
    const shadowVisible = node._shadow?.visible ?? false

    applyPose(node, REST_POSE)
    try {
        return measure()
    } finally {
        face.rotation = rotation
        face.position.set(position.x, position.y)
        face.scale.set(scale)
        if (node._shadow) node._shadow.visible = shadowVisible
    }
}
