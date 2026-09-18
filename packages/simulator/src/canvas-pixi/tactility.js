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

const CARD_CALIBRATION_HEIGHT = cardHeight() / 150

const SHADOW_SCALE = CARD_CALIBRATION_HEIGHT
const SHADOW_PAD = Math.round(24 * SHADOW_SCALE)
const SHADOW_CORE = Math.round(24 * SHADOW_SCALE)
const SHADOW_RADIUS = Math.round(10 * SHADOW_SCALE)
const SHADOW_BLUR = 10 * SHADOW_SCALE
const SHADOW_SLICE = SHADOW_PAD + SHADOW_RADIUS

const SHADOW_DROP_PX = 22 * SHADOW_SCALE
const SHADOW_DRIFT_PX = 5 * SHADOW_SCALE
const SHADOW_ALPHA = 0.62
const SHADOW_SPREAD = 0.55

let shadow_texture = null

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

export function initTactility() {
    buildShadowTexture()
}

export function destroyTactility() {
    shadow_texture?.destroy(true)
    shadow_texture = null
}

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
    node.addChildAt(shadow, 0)
    return shadow
}

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

export function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

const seedOf = (node) => node?.nodeId ?? `local:${node?.uid ?? 0}`

const isStacked = (node) => !!node?.groupId

function stop(node) {
    if (!node?._tactile) return
    node._tactile.stop?.()
    node._tactile = null
}

function upwardSign(node) {
    const deg = ((node.rotation / DEG) % 360 + 360) % 360
    return deg > 90 && deg < 270 ? -1 : 1
}

function orient(pose, sign) {
    return sign === 1 ? pose : { ...pose, x: pose.x * sign, y: pose.y * sign }
}

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

export function tactileSpawn(node, { held = false } = {}) {
    const id = seedOf(node)
    const sign = upwardSign(node)

    node._castsShadow = held || !isStacked(node)

    transition(
        node,
        orient(held ? liftPose(id) : spawnPose(id), sign),
        orient(restingPose(id, isStacked(node)), sign),
        held ? TRANSITION.drop : TRANSITION.flutter,
        () => { node._castsShadow = false },
    )
}

export function tactileLift(nodes) {
    const casters = shadowCasters(nodes)
    for (const node of nodes) {
        node._castsShadow = casters.has(node)
        const id = seedOf(node)
        const sign = upwardSign(node)
        transition(node, currentPose(node), orient(liftPose(id), sign), TRANSITION.lift)
    }
}

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
            () => { node._castsShadow = false },
        )
    }
}

export function markLifted(nodes) {
    for (const node of nodes) node._lifted = true
}

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

export function tactileStack(nodes) {
    for (const node of nodes) {
        if (node._tactile) continue
        applyPose(node, orient(restingPose(seedOf(node), true), upwardSign(node)))
    }
}

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
