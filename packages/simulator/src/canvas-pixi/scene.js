import { store } from '../state/store.js'
import { theme } from '../theme.js'
import { toPixiColor } from './color.js'
import { Application, Assets, Container, Graphics, TilingSprite, Texture } from 'pixi.js'

// Pixi compiles shaders with new Function. This lets it run under a CSP without 'unsafe-eval'.
import 'pixi.js/unsafe-eval'
import { animate } from 'motion'

import { assetUrl } from '../assets.js'
import { surfaceTextureUrl } from './surface.js'
import { cameraInterval, edgeBands, edgeStyle, rubberBand, shakeOffset, stageSize, surfaceStyle, worldRect } from '../stage.js'
import { seats } from '../seats.js'

const INITIAL_SCALE_MAX = 0.9

const SHAKE_PX = 9
const SHAKE_SECONDS = 0.32
const SHAKE_COOLDOWN_MS = 650

const SETTLE_SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 1 }

const GRID_SPACING = 30
const GRID_RESOLUTION = 4
const DIVIDER_DARK_H = 2
const DIVIDER_LIGHT_H = 1

// Local
let app = null
let stage_container = null
let camera = null
let mirror_pivot = null
let grid_sprite = null
let divider_gfx = null
let surface_gfx = null
let surface_tile = null
let layer_edge = null
let edge_fill = null
let edge_tile = null
let settle_anim = null
let shake_anim = null
let shake_base = null
let shake_ended_at = 0
let layer_bg = null
let layer_table = null
let layer_piece = null
let layer_ui = null
let band_board = null
let band_shape = null
let band_card = null
let band_accessory = null
let band_chip = null
let band_fx = null

// Accessors
export function getApp() {
    return app
}

export function getContainer() {
    return stage_container
}

export function getLayers() {
    return {
        bg: layer_bg,
        piece: layer_piece,
        board: band_board,
        shape: band_shape,
        card: band_card,
        accessory: band_accessory,
        chip: band_chip,
        fx: band_fx,
        ui: layer_ui,
    }
}

export function getRelativePointerPosition() {
    if (!app) return { x: 0, y: 0 }
    const p = app.renderer.events.pointer.global
    return mirror_pivot.toLocal(p)
}

export function clientToWorld(clientX, clientY) {
    if (!app || !stage_container) return { x: 0, y: 0 }
    const rect = stage_container.getBoundingClientRect()
    return mirror_pivot.toLocal({ x: clientX - rect.left, y: clientY - rect.top })
}

export function getStageScale() {
    return camera?.scale.x ?? 1
}

export function getViewportCenter() {
    if (!app) return { x: 0, y: 0 }
    return mirror_pivot.toLocal({ x: app.screen.width / 2, y: app.screen.height / 2 })
}

export function screenToWorld(x, y) {
    return mirror_pivot.toLocal({ x, y })
}

function worldScreenRect() {
    const w = worldBounds()
    const a = worldToScreen({ x: w.x, y: w.y })
    const b = worldToScreen({ x: w.x + w.width, y: w.y + w.height })
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }
}

export function isOverWorldEdge(x, y) {
    if (!app || !mirror_pivot) return false
    const at = edgeBands({ x, y }, worldScreenRect())
    if (at.bottom) return false
    return at.left || at.right || at.top
}

export function worldToScreen(point) {
    return mirror_pivot.toGlobal(point)
}

let stage_draggable = false

export function setStageDraggable(draggable) {
    stage_draggable = !!draggable
}

export function isStageDraggable() {
    return stage_draggable
}

export function setLayersListening({ shape, card, board, accessory } = {}) {
    if (band_shape     && shape     !== undefined) band_shape.eventMode     = shape     ? 'passive' : 'none'
    if (band_card      && card      !== undefined) band_card.eventMode      = card      ? 'passive' : 'none'
    if (band_accessory && accessory !== undefined) band_accessory.eventMode = accessory ? 'passive' : 'none'

    if (board !== undefined) {
        board_listening = board
        applyPlaymatState()
    }
}

export const playmat_hidden = store(false)
export const playmat_locked = store(true)

let board_listening = true

function applyPlaymatState() {
    if (!band_board) return
    band_board.visible = !playmat_hidden.get()
    band_board.eventMode = (board_listening && !playmat_locked.get()) ? 'passive' : 'none'
}

export function setPlaymatHidden(value) {
    playmat_hidden.set(!!value)
    applyPlaymatState()
}

export function setPlaymatLocked(value) {
    playmat_locked.set(!!value)
    applyPlaymatState()
}

export const mirror_view = store(false)

const DEG = Math.PI / 180

const UPRIGHT_NAMES = ['card', 'dice', 'counter', 'marker', 'text']

export function nameKeepsUpright(name) {
    return UPRIGHT_NAMES.includes(name)
}

function keepsUpright(node) {
    return UPRIGHT_NAMES.includes(node?.kind)
}

export function refreshMirrorTextOffset(node) {
    if (node?.kind !== 'text') return
    const on = mirror_view.get()
    node.pivot.set(on ? node.width : 0, on ? node.height : 0)
}

function counterRotate(node, on) {
    node.rotation += (on ? 180 : -180) * DEG
    refreshMirrorTextOffset(node)
}

export function getWorldRotation(node) {
    const raw = node.rotation / DEG - (mirror_view.get() && keepsUpright(node) ? 180 : 0)
    return ((raw % 360) + 360) % 360
}

export function setWorldRotation(node, deg) {
    node.rotation = (deg + (mirror_view.get() && keepsUpright(node) ? 180 : 0)) * DEG
}

export function mirrorNewNode(node) {
    if (!mirror_view.get() || !node || !keepsUpright(node)) return
    counterRotate(node, true)
}

function applyMirror(value) {
    if (!mirror_pivot) return
    mirror_pivot.rotation = value ? 180 * DEG : 0
    for (const band of [band_board, band_shape, band_card, band_accessory]) {
        if (!band) continue
        for (const node of band.children) {
            if (keepsUpright(node)) counterRotate(node, value)
        }
    }
}

export function setMirror(value) {
    value = !!value
    if (mirror_view.get() === value) return
    mirror_view.set(value)
    applyMirror(value)
    centerStage()
}

export function toggleMirror() {
    setMirror(!mirror_view.get())
}

function worldBounds() {
    return worldRect(seats.get()?.length ?? 1)
}

function minScale() {
    if (!app) return 0
    const world = worldBounds()
    return Math.min(app.screen.width / world.width, app.screen.height / world.height)
}

function cameraBounds() {
    const world = worldBounds()
    const s = camera.scale.x
    return {
        x: cameraInterval(app.screen.width, world.x, world.width, s),
        y: cameraInterval(app.screen.height, world.y, world.height, s),
    }
}

function withinBounds(value, bound, viewport, elastic) {
    if (value >= bound.min && value <= bound.max) return value
    const edge = value < bound.min ? bound.min : bound.max
    if (!elastic) return edge
    return edge + rubberBand(value - edge, viewport)
}

let pan_raw = null

function applyCameraBounds({ elastic = false } = {}) {
    if (!app || !camera) return
    const bound = cameraBounds()
    camera.position.set(
        withinBounds(camera.position.x, bound.x, app.screen.width, elastic),
        withinBounds(camera.position.y, bound.y, app.screen.height, elastic),
    )
    syncEdge()
}

function shakeTable() {
    if (!camera || shake_anim) return
    if (Date.now() - shake_ended_at < SHAKE_COOLDOWN_MS) return
    if (prefersReducedMotion()) return

    shake_base = { x: camera.position.x, y: camera.position.y }
    const base = shake_base

    shake_anim = animate(0, 1, {
        duration: SHAKE_SECONDS,
        ease: 'linear',
        onUpdate(t) {
            if (!camera) return stopShake({ restore: false })
            camera.position.set(base.x + shakeOffset(t, SHAKE_PX), base.y)
        },
        onComplete() {
            shake_anim = null
            shake_ended_at = Date.now()
            camera?.position.set(base.x, base.y)
            shake_base = null
        },
    })
}

function stopShake({ restore = true } = {}) {
    if (!shake_anim) return
    shake_anim.stop?.()
    shake_anim = null
    shake_ended_at = Date.now()
    if (restore && camera && shake_base) camera.position.set(shake_base.x, shake_base.y)
    shake_base = null
}

function prefersReducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function stopSettle() {
    settle_anim?.stop?.()
    settle_anim = null
}

export function settleCamera() {
    if (!app || !camera) return
    stopSettle()
    stopShake()
    pan_raw = null

    const bound = cameraBounds()
    const from = { x: camera.position.x, y: camera.position.y }
    const to = {
        x: Math.min(bound.x.max, Math.max(bound.x.min, from.x)),
        y: Math.min(bound.y.max, Math.max(bound.y.min, from.y)),
    }
    if (from.x === to.x && from.y === to.y) return

    settle_anim = animate(0, 1, {
        ...SETTLE_SPRING,
        onUpdate(t) {
            if (!camera) return stopSettle()
            camera.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
            syncEdge()
        },
        onComplete() {
            settle_anim = null
            camera?.position.set(to.x, to.y)
            syncEdge()
        },
    })
}

export function zoomStageBy(factor, anchorPos = null) {
    if (!app) return

    const anchor = anchorPos || { x: app.screen.width / 2, y: app.screen.height / 2 }
    const before = camera.toLocal(anchor)

    const wanted = camera.scale.x * factor
    const next = Math.max(minScale(), Math.min(10, wanted))

    if (next === camera.scale.x) {
        if (wanted !== next) shakeTable()
        return
    }

    stopShake()
    camera.scale.set(next)
    notifyScale()

    const after = camera.toLocal(anchor)
    camera.position.set(
        camera.position.x + (after.x - before.x) * next,
        camera.position.y + (after.y - before.y) * next,
    )

    stopSettle()
    pan_raw = null
    applyCameraBounds()
}

export function zoomStage(direction, anchorPos = null) {
    zoomStageBy(direction > 0 ? 1.25 : 1 / 1.25, anchorPos)
}

export function panStageBy(dx, dy, { elastic = false } = {}) {
    if (!camera || !app) return
    stopSettle()
    stopShake()

    if (!elastic) {
        pan_raw = null
        camera.position.set(camera.position.x - dx, camera.position.y - dy)
        applyCameraBounds()
        return
    }

    pan_raw ??= { x: camera.position.x, y: camera.position.y }
    pan_raw.x -= dx
    pan_raw.y -= dy

    const bound = cameraBounds()
    camera.position.set(
        withinBounds(pan_raw.x, bound.x, app.screen.width, true),
        withinBounds(pan_raw.y, bound.y, app.screen.height, true),
    )
    syncEdge()
}

const scale_listeners = new Set()

export function onCameraScale(listener) {
    scale_listeners.add(listener)
    return () => scale_listeners.delete(listener)
}

function notifyScale() {
    for (const listener of scale_listeners) {
        try { listener(camera.scale.x) } catch (e) { console.error('camera scale listener error', e) }
    }
}

let home_point = { x: 0, y: 0 }

export function setHomePoint(point) {
    const x = Number(point?.x)
    const y = Number(point?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    home_point = { x, y }
}

export function centerStage(point = home_point) {
    if (!app || !camera) return
    const at = mirror_pivot.toGlobal({ x: point.x, y: point.y })
    camera.position.set(
        camera.position.x + (app.screen.width  / 2 - at.x),
        camera.position.y + (app.screen.height / 2 - at.y),
    )
    stopSettle()
    applyCameraBounds()
}

export async function initScene(container) {
    stage_container = container

    app = new Application()
    await app.init({
        resizeTo: container,
        background: toPixiColor(theme().table.surface),
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        preference: 'webgl',
    })
    container.appendChild(app.canvas)

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen

    camera = new Container()
    app.stage.addChild(camera)

    layer_bg = new Container()
    layer_bg.eventMode = 'none'
    camera.addChild(layer_bg)

    mirror_pivot = new Container()
    camera.addChild(mirror_pivot)

    layer_table = new Container()
    layer_piece = new Container()
    mirror_pivot.addChild(layer_table, layer_piece)

    band_board     = new Container()
    band_shape     = new Container()
    band_card      = new Container()
    band_accessory = new Container()
    layer_table.addChild(band_board, band_shape)
    layer_piece.addChild(band_card, band_accessory)

    band_chip = new Container()
    mirror_pivot.addChild(band_chip)

    band_fx = new Container()
    band_fx.eventMode = 'none'
    mirror_pivot.addChild(band_fx)

    layer_ui = new Container()
    app.stage.addChild(layer_ui)

    buildEdge()
    drawGridBackground()
    refreshWorldSurface()
    refreshWorldEdge()

    applyMirror(mirror_view.get())

    board_listening = true
    applyPlaymatState()

    _resizeObserver = new ResizeObserver(handleResize)
    _resizeObserver.observe(container)

    _opening_pending = !(app.screen.width && app.screen.height)
    if (!_opening_pending) applyOpeningView()

    return { app, layers: getLayers() }
}

export function inspectScene() {
    return { app, camera, mirror: mirror_pivot, layers: getLayers(), shake: () => shake_anim }
}

export function destroyScene() {
    _resizeObserver?.disconnect()
    _resizeObserver = null
    if (_resizeFrame) cancelAnimationFrame(_resizeFrame)
    _resizeFrame = null

    app?.ticker?.remove(syncEdge)
    stopSettle()
    stopShake({ restore: false })

    app?.destroy(true, { children: true, texture: false })
    app = null
    stage_container = null
    camera = mirror_pivot = null
    layer_bg = layer_table = layer_piece = layer_ui = null
    band_board = band_shape = band_card = band_accessory = band_chip = null
    band_fx = null
    grid_sprite = divider_gfx = surface_gfx = surface_tile = null
    layer_edge = edge_fill = edge_tile = null
    pan_raw = null
    scale_listeners.clear()
}

let _resizeFrame = null
let _resizeObserver = null
let _opening_pending = false

function handleResize() {
    if (_resizeFrame) return
    _resizeFrame = requestAnimationFrame(() => {
        _resizeFrame = null
        if (!app || !stage_container) return

        if (!stage_container.clientWidth || !stage_container.clientHeight) return

        if (_opening_pending) {
            _opening_pending = false
            applyOpeningView()
            return
        }

        refreshWorldDecor()
        refreshWorldSurface()
        refreshWorldEdge()

        const floor = minScale()
        if (camera.scale.x < floor) {
            camera.scale.set(floor)
            notifyScale()
        }

        centerStage()
    })
}

function initialScale() {
    const width = app?.screen.width ?? 0
    const height = app?.screen.height ?? 0
    if (!width || !height) return INITIAL_SCALE_MAX
    const stage = stageSize()
    return Math.min(INITIAL_SCALE_MAX, width / stage.width, height / stage.height)
}

function applyOpeningView() {
    camera.scale.set(Math.max(minScale(), initialScale()))
    notifyScale()
    centerStage()
}

function drawGridBackground() {
    const cell = document.createElement('canvas')
    cell.width = GRID_SPACING * GRID_RESOLUTION
    cell.height = GRID_SPACING * GRID_RESOLUTION
    const ctx = cell.getContext('2d')
    ctx.fillStyle = theme().table.dots
    ctx.beginPath()
    ctx.arc(
        (GRID_SPACING / 2) * GRID_RESOLUTION,
        (GRID_SPACING / 2) * GRID_RESOLUTION,
        1 * GRID_RESOLUTION,
        0, Math.PI * 2,
    )
    ctx.fill()

    surface_gfx = new Graphics()
    layer_bg.addChild(surface_gfx)

    surface_tile = new TilingSprite({ texture: Texture.EMPTY, width: 1, height: 1 })
    surface_tile.visible = false
    layer_bg.addChild(surface_tile)

    grid_sprite = new TilingSprite({ texture: Texture.from(cell), width: 1, height: 1 })
    grid_sprite.tileScale.set(1 / GRID_RESOLUTION)
    layer_bg.addChild(grid_sprite)

    divider_gfx = new Graphics()
    layer_bg.addChild(divider_gfx)

    refreshWorldDecor()
}

export function refreshWorldDecor() {
    if (!grid_sprite) return
    const world = worldBounds()

    surface_gfx.clear().rect(world.x, world.y, world.width, world.height).fill(toPixiColor(surfaceStyle().color))

    surface_tile.position.set(world.x, world.y)
    surface_tile.width = world.width
    surface_tile.height = world.height
    surface_tile.tilePosition.set(-world.x, -world.y)

    grid_sprite.position.set(world.x, world.y)
    grid_sprite.width = world.width
    grid_sprite.height = world.height

    grid_sprite.tilePosition.set(-world.x, -world.y)

    drawCenterDivider(world.x, world.width)
}

function buildEdge() {
    layer_edge = new Container()
    layer_edge.eventMode = 'none'
    app.stage.addChildAt(layer_edge, 0)

    edge_fill = new Graphics()
    edge_tile = new TilingSprite({ texture: Texture.EMPTY, width: 1, height: 1 })
    edge_tile.visible = false
    layer_edge.addChild(edge_fill, edge_tile)
}

let surface_warned = ''

export function refreshWorldSurface() {
    if (!surface_tile || surface_tile.destroyed) return
    const { img, scale, alpha, tint } = surfaceStyle()

    refreshWorldDecor()

    surface_tile.alpha = alpha
    surface_tile.tint = tint

    const url = surfaceTextureUrl(img)
    if (!url) {
        surface_tile.visible = false
        return
    }

    Assets.load(url).then((texture) => {
        if (!surface_tile || surface_tile.destroyed) return
        surface_tile.texture = texture
        surface_tile.tileScale.set(scale, scale)
        surface_tile.visible = true
    }).catch((err) => {
        if (surface_warned === url) return
        surface_warned = url
        console.error(`[canvas] table surface art failed to load: ${url}`, err)
    })
}

let edge_warned = ''

export function refreshWorldEdge() {
    if (!layer_edge) return
    const { color, img } = edgeStyle()

    edge_fill.clear().rect(0, 0, app.screen.width, app.screen.height).fill(toPixiColor(color))
    syncEdge()

    if (!img) {
        edge_tile.visible = false
        return
    }

    const url = assetUrl(img)
    Assets.load(url).then((texture) => {
        if (!edge_tile || edge_tile.destroyed) return
        edge_tile.texture = texture
        edge_tile.visible = true
    }).catch((err) => {
        if (edge_warned === url) return
        edge_warned = url
        console.error(`[canvas] world edge art failed to load: ${url}`, err)
    })
}

function syncEdge() {
    if (!layer_edge || !app || !camera) return

    edge_tile.width = app.screen.width
    edge_tile.height = app.screen.height

    edge_tile.tileScale.set(camera.scale.x, camera.scale.y)
    edge_tile.tilePosition.set(camera.position.x, camera.position.y)
}

function drawCenterDivider(left, width) {
    divider_gfx
        .clear()
        .rect(left, -DIVIDER_DARK_H, width, DIVIDER_DARK_H)
        .fill(toPixiColor(theme().table.seam.dark))
        .rect(left, 0, width, DIVIDER_LIGHT_H)
        .fill({ color: toPixiColor(theme().table.seam.light), alpha: 0.08 })
}
