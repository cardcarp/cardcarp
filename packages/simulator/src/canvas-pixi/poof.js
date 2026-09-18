import { AnimatedSprite, Assets, Rectangle, Texture } from 'pixi.js'

import { getApp, getLayers, mirror_view } from './scene.js'
import { nodeBounds } from './node.js'
import { prefersReducedMotion } from './tactility.js'

let sheet_url = null

const FRAME = 32

const FPS = 14

const DEG = Math.PI / 180

let frames = null
let loading = null

function sliceFrames(sheet) {
    const source = sheet.source
    const count = Math.max(1, Math.floor(sheet.height / FRAME))
    return Array.from({ length: count }, (_, i) => new Texture({
        source,
        frame: new Rectangle(0, i * FRAME, FRAME, Math.min(FRAME, sheet.height - i * FRAME)),
    }))
}

export function initPoof() {
    if (!sheet_url) return Promise.resolve(null)
    if (frames || loading) return loading
    const url = sheet_url
    loading = Assets.load(url)
        .then((texture) => {
            if (url !== sheet_url) return null
            frames = sliceFrames(texture)
            return frames
        })
        .catch((err) => {
            console.error(`[canvas] poof sheet failed to load: ${url}`, err)
            return null
        })
    return loading
}

export function setPuffSheet(url) {
    const next = url || null
    if (next === sheet_url) return
    sheet_url = next
    frames = null
    loading = null
}

export function destroyPoof() {
    frames = null
    loading = null
}

function worldBox(node) {
    const b = nodeBounds(node)
    const sx = node.scale?.x ?? 1
    const sy = node.scale?.y ?? 1
    return {
        x: node.x + b.x * sx,
        y: node.y + b.y * sy,
        width: b.width * sx,
        height: b.height * sy,
    }
}

function union(a, b) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return {
        x,
        y,
        width: Math.max(a.x + a.width, b.x + b.width) - x,
        height: Math.max(a.y + a.height, b.y + b.height) - y,
    }
}

function boxesFor(nodes) {
    const boxes = new Map()
    for (const node of nodes ?? []) {
        if (!node || node.destroyed || !node.parent) continue
        const key = node.groupId ?? node
        const box = worldBox(node)
        const seen = boxes.get(key)
        boxes.set(key, seen ? union(seen, box) : box)
    }
    return [...boxes.values()]
}

function spawn(box) {
    const { fx } = getLayers()
    const app = getApp()
    if (!fx || fx.destroyed || !app || !frames?.length) return

    const sprite = new AnimatedSprite(frames, false)
    sprite.eventMode = 'none'
    sprite.label = 'poof'
    sprite.anchor.set(0.5)
    sprite.loop = false
    sprite.animationSpeed = FPS / 60

    sprite.position.set(box.x + box.width / 2, box.y + box.height / 2)

    sprite.rotation = mirror_view.get() ? 180 * DEG : 0

    const tick = (ticker) => sprite.update(ticker)
    app.ticker.add(tick)

    const end = () => {
        app.ticker?.remove(tick)
        if (!sprite.destroyed) sprite.destroy()
    }
    sprite.onComplete = end

    fx.addChild(sprite)
    sprite.gotoAndPlay(0)
}

export function poofNodes(nodes) {
    if (prefersReducedMotion()) return

    const boxes = boxesFor(nodes)
    if (boxes.length === 0) return

    if (frames) return boxes.forEach(spawn)
    initPoof().then(() => { if (frames) boxes.forEach(spawn) })
}
