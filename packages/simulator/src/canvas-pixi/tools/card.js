// canvas/tools/card.js, ported. The largest file in the migration and the one that decides
// whether the rest is worth doing.
//
// Everything the original says about WHY still stands — the fan geometry, the authoritative
// group sizes, the merge gate, the two-step double tap, the group revision counter. None of
// that was Konva's, and none of it is restated here; read the original for the reasoning. What
// follows is only what the renderer swap actually changed.
//
// === The five things Konva was doing for this file ===
//
// 1. `zIndex()` / `moveToTop()`. Konva kept an explicit z per node and re-sorted on demand.
//    Pixi's child order IS the z order, so z is `parent.getChildIndex(node)` and raise is
//    `setChildIndex(node, last)`. Cheaper, and the two can no longer disagree — which they
//    could in Konva, where a destroyed node still reported zIndex 0 (see selection.js's
//    pruneSelection note).
//
// 2. `layer.getIntersection(point)`. A single-pixel lookup in a hit canvas, used to find the
//    card under a finger THROUGH the transformer covering it. Pixi has no hit canvas, so
//    pointer.js's topElementAt walks the bands instead — which answers the same question and,
//    because the chrome is not in those bands, needs none of the "see through the transformer"
//    apparatus the original carries.
//
// 3. `new Konva.Image({ image, cornerRadius, fill })`. One node that was a rounded rect, a
//    sleeve colour and a bitmap depending on what was loaded. Here it is one Graphics whose
//    fill is either a colour or a texture — see paintFace. The trap: a texture fill is ALREADY
//    normalised to the shape's bounds and `matrix` is an extra transform on top, so passing the
//    fit matrix its name implies squares the scale and papers the card with ~80 copies of
//    itself. Identity is the fit.
//
// 4. `Konva.Tween`, for the shuffle spin. Now Motion's animate.
//
// 5. `node.clone()`. Konva deep-copied a node and its children; nothing in Pixi does. cloneNode
//    rebuilds through addCard instead, which is what the Konva version was really doing anyway
//    once you count the six fields it copied back on by hand and the badge it had to destroy.
//
// === One thing that got genuinely better ===
//
// The hover highlight. Konva reached into each card for `.card-face` and called `.stroke()` on
// it — a mutation of a child the sync path was told never to look at. Here `hover` is a prop
// like any other, so the highlight goes through setProps and the face stays what tactility owns.

import { Assets, Graphics, Text, TextStyle } from 'pixi.js'
import { store } from '../../state/store.js'
import { animate } from 'motion'

// Card art, addressed by the host (see assets.js), and the one card-model rule the table needs.
import { hasCardBack, CARD_BACK_VARIANT } from '@cardcarp/core/card.js'
import { cardArt, cardBack } from '../../assets.js'

// Stores
import { canvasDragging, canvasPressActive } from '../../store.js'
import { emitTableEvent } from '../../events.js'
import { addToHand } from '../../seats.js'

// Scene
import {
    getApp, getLayers, getViewportCenter, mirrorNewNode, getWorldRotation, setWorldRotation,
    mirror_view,
} from '../scene.js'
import { getSelected, setSelection, broadcastSelectionUI } from '../selection.js'
import { emitCanvasAction } from '../observer.js'
import { resolveSpawnPoint } from '../spawn.js'
import { createNode, screenRect } from '../node.js'
import { isDoubleTap, resetDoubleTap } from '../../double-tap.js'
import { tactileSpawn, tactileStack } from '../tactility.js'
import { cardSize } from '../../stage.js'
import { theme } from '../../theme.js'
import { toPixiColor } from '../color.js'

// Tool metadata
export const id = 'card'

// A game piece: the game decides its size, the player doesn't, so it gets no transform box.
// See SELECTION STYLES in canvas-pixi/selection.js.
export const selection_style = 'piece'

const DEG = Math.PI / 180

// A card's colours are the theme's (theme.js `card`): the back with no sleeve of its own, the faint
// edge, and the hover. The alpha and the corner are the card's shape, and stay here.
const CARD_STROKE_ALPHA = 0.12
const CARD_CORNER_RADIUS = 4
const STACK_NUDGE = 8

// The fan geometry, unchanged. See the original for why the fan's HEIGHT is the fixed quantity
// rather than the step — a deck that visibly grows while you draw from it contradicts the only
// thing a pile's silhouette has to say.
const STACK_NUDGE_XS = 10
const STACK_NUDGE_MAX = 2
const STACK_FAN_HEIGHT = 24
const STACK_NUDGE_XS_COUNT = 6
const DECK_ROTATION_JITTER_DEG = 0
const HOVER_MERGE_DELAY_MS = 400
const MERGE_OVERLAP_THRESHOLD = 0.5

const LONG_PRESS_MS = 300
const LONG_PRESS_SLOP = 8

// A card's size in world units — declared by the game, like every other object's (stage.js).
//
// It took a `config` argument until the card's dimensions became declared, because the width had
// to be derived from the game's card.size aspect. Nothing derives now, so nothing is passed: the
// answer is the same for every card on the table and asking with an argument implied otherwise.
export function cardWorldSize() {
    return cardSize()
}

function getCardLayer() {
    return getLayers().card
}

// Every card on the table.
//
// A snapshot rather than the band's live children array, because callers iterate it while cards
// are being created, destroyed and re-parented underneath them — drag_candidates holds onto the
// result for the length of a drag. `kind` is checked for the same reason cardAtGlobal checks it:
// the band is an ordinary Container and nothing stops something else being put in it.
function allCards() {
    return (getCardLayer()?.children ?? []).filter(n => n.kind === 'card')
}

// Konva kept an explicit z per node and re-sorted on demand. Pixi's child order IS the z order,
// so these are the whole of it — and the two can no longer disagree, which they could in Konva,
// where a destroyed node still reported zIndex 0. See the note at the top of this file.
function zIndexOf(node) {
    return node.parent ? node.parent.getChildIndex(node) : -1
}

function moveToTop(node) {
    const parent = node.parent
    if (parent) parent.setChildIndex(node, parent.children.length - 1)
}

function bounds(props) {
    return { x: -props.width / 2, y: -props.height / 2, width: props.width, height: props.height }
}

// Draws whichever side the card is currently on.
//
// One Graphics whose fill is either a colour or a texture (see #3 at the top of this file). The
// back is real art for a flip card and nothing at all for every other card, which is what
// makes the sleeve the fallback here: it stands in both for "this side has no art" and for "the
// art has not loaded yet", and loadArt repaints through here to swap it in.
//
// No fill matrix, deliberately. A texture fill is ALREADY normalised to the shape's bounds and
// `matrix` is an extra transform on top of that — passing the fit matrix its name implies
// squares the scale and papers the card with dozens of copies of itself. Identity is the fit.
//
// The hover highlight is a stroke on this same path rather than a mutation reached into from
// outside: `hover` is an ordinary prop, so it arrives through setProps like any other and the
// face stays the one thing tactility owns.
function paintFace(g, props, node) {
    const texture = props.faceDown ? node.cardBackTexture : node.cardTexture
    const { width, height } = props

    g.roundRect(-width / 2, -height / 2, width, height, CARD_CORNER_RADIUS)

    const colors = theme().card
    if (texture) g.fill({ texture })
    else g.fill(toPixiColor(props.sleeveColor || colors.sleeve))

    g.stroke(props.hover
        ? { width: 2, color: toPixiColor(colors.hover) }
        : { width: 1, color: toPixiColor(colors.edge), alpha: CARD_STROKE_ALPHA })
}

// === Preview: hover on a mouse, press and hold on a touchscreen ===

// The preview store reads viewport-space rects.
function getCardScreenRect(node) {
    const app = getApp()
    if (!app) return null
    const canvasRect = app.canvas.getBoundingClientRect()
    const b = screenRect(node)
    return {
        left:   canvasRect.left + b.x,
        top:    canvasRect.top  + b.y,
        right:  canvasRect.left + b.x + b.width,
        bottom: canvasRect.top  + b.y + b.height,
        width:  b.width,
        height: b.height,
    }
}

function previewCard(node) {
    // Nothing is read while the table is being touched. Checked here, against the canvas's OWN
    // press state, rather than relying on preview.is_dragging alone.
    //
    // That flag is a single boolean with three writers — the hand, the scry list, and now the
    // canvas — and no arbitration between them. panel/card.vue clears it whenever uiSelection
    // stops being a card, which is reasonable from its own point of view and catastrophic here:
    // starting a drag calls setTransforming(true), which publishes `{ type: null }`, which fires
    // that watcher, which switched the canvas's own guard off mid-drag. It only happened when a
    // card had been selected first, because that is the only time the panel section — and its
    // watcher — exists at all.
    //
    // So the canvas asks a question only the canvas can answer, and no other module can revoke.
    if (canvasPressActive.get()) return

    // A face-down card is hidden and has nothing to preview — unless its back is real art,
    // which is public and carries rules text the player still needs to read close up.
    const showsBackArt = node.props.faceDown && hasCardBack(node.cardData)
    if (node.props.faceDown && !showsBackArt) return
    emitTableEvent('card-hover', {
        card: node.cardData,
        rect: getCardScreenRect(node),
        variant: showsBackArt ? CARD_BACK_VARIANT : '',
    })
}

// The finger currently down on a card: { node, x, y, timer }. One at a time — a second finger
// is the canvas pinch, which calls the press off.
let press = null

// The card under a point in the canvas's own pixel space. Asked of the card band directly:
// Konva needed this to see THROUGH the transformer covering a selected card, and here the
// chrome is not in the band at all, so the same call is simply the honest question.
function cardAtGlobal(global) {
    const band = getCardLayer()
    if (!band) return null
    for (let i = band.children.length - 1; i >= 0; i--) {
        const node = band.children[i]
        if (node.kind !== 'card' || !node.visible) continue
        const local = node.toLocal(global)
        if (node.hitArea?.contains(local.x, local.y)) return node
    }
    return null
}

function cardAtClientPoint(clientX, clientY) {
    const app = getApp()
    if (!app) return null
    const box = app.canvas.getBoundingClientRect()
    return cardAtGlobal({ x: clientX - box.left, y: clientY - box.top })
}

function onContainerTouchStart(e) {
    if (e.touches.length !== 1) return endLongPress()
    const touch = e.touches[0]
    const node = cardAtClientPoint(touch.clientX, touch.clientY)
    if (!node) return endLongPress()
    startLongPress(node, touch)
}

function startLongPress(node, touch) {
    endLongPress()
    press = { node, x: touch.clientX, y: touch.clientY, timer: null }
    press.timer = setTimeout(() => {
        if (!press) return
        press.timer = null
        previewCard(press.node)
    }, LONG_PRESS_MS)

    // Bound on window rather than on the node: the finger that started here is free to end
    // anywhere, and a press whose end is never heard is a preview that never comes down.
    window.addEventListener('touchmove', onLongPressMove)
    window.addEventListener('touchend', endLongPress)
    window.addEventListener('touchcancel', endLongPress)
}

function onLongPressMove(e) {
    if (!press) return
    if (e.touches.length > 1) return endLongPress()   // second finger — the canvas pinch
    const touch = e.touches[0]
    if (Math.hypot(touch.clientX - press.x, touch.clientY - press.y) <= LONG_PRESS_SLOP) return
    endLongPress()
}

function endLongPress() {
    if (press) {
        clearTimeout(press.timer)
        press = null
        window.removeEventListener('touchmove', onLongPressMove)
        window.removeEventListener('touchend', endLongPress)
        window.removeEventListener('touchcancel', endLongPress)
    }
    // Immediate: the finger has lifted, and there is no card left under it to linger over.
    emitTableEvent('card-unhover', { immediate: true })
}

// === Double tap a card: turn it over ===
// One gesture, two steps: a card lying sideways straightens, and only a card already straight
// turns over. See the original for why rotation gets the first tap.
//
// Konva needed a GHOST_CLICK_MS guard because it fired both `click` and `tap` for the same
// gesture and a compatibility mouse click could arrive behind a real touch. Pixi's federated
// events deliver one `pointertap` per gesture whatever the device, so the guard does not port.
function onCardTap(node, e) {
    if (!node) return resetDoubleTap()
    const point = { x: e.global.x, y: e.global.y }
    if (!isDoubleTap(node, point.x, point.y)) return
    turnOverCard(node)
}

function turnOverCard(node) {
    // getWorldRotation normalises into 0..360, so upright is either end of that range — and the
    // slack absorbs the float dust a mirrored card's +180/-180 round trip leaves behind.
    const rotation = getWorldRotation(node)
    const props = {}

    if (rotation > 0.01 && rotation < 359.99) {
        // Step one: straighten, and stop there. The card keeps whichever face it was showing.
        setWorldRotation(node, 0)
        props.rotation = 0
    } else {
        const faceDown = !node.props.faceDown
        setFaceDown(node, faceDown)
        props.faceDown = faceDown

        // The scry list shows a face-down/face-up marker per row, and this is a third path that
        // changes one without touching membership.
        bumpGroupRevision()
        broadcastSelectionUI(true)
    }

    // No public wrapper to route through — this fires from inside the canvas — so it reaches
    // peers as a node:patch on the observer bus. Solo play has no observer and the emit is a
    // no-op.
    if (node.nodeId) emitCanvasAction({ op: 'node:patch', nodeId: node.nodeId, props })
}

// Topmost card whose untransformed AABB contains (worldX, worldY). Used by hand-drop merge to
// decide if a dropped card should join an existing pile.
function findCardAtWorldPoint(worldX, worldY) {
    const cards = allCards()
    for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i]
        const halfW = card.props.width / 2
        const halfH = card.props.height / 2
        if (
            worldX >= card.x - halfW && worldX <= card.x + halfW &&
            worldY >= card.y - halfH && worldY <= card.y + halfH
        ) return card
    }
    return null
}

// === Authoritative group sizes ===
// Unchanged, and unchangeable by the renderer: the count comes off the wire because local
// membership is a race. See the original for the tablet-shows-tighter-piles bug this fixes.
const group_size = new Map()

export function setGroupSizes(sizes) {
    if (!sizes) return
    for (const [groupId, count] of Object.entries(sizes)) {
        if (!Number.isFinite(count) || count <= 0) group_size.delete(groupId)
        else group_size.set(groupId, count)
    }
}

export function clearGroupSizes() {
    group_size.clear()
}

export function adoptLocalGroupSize(groupId) {
    if (!groupId) return
    const n = getGroupMembers(groupId).length
    if (n > 0) group_size.set(groupId, n)
}

// The count that decides a pile's spacing: the relay's if it has told us, else what we can see.
// Every layout path must go through this — a direct nudgeForCount(members.length) is the bug
// this registry exists to prevent.
function nudgeForGroup(groupId, localCount) {
    return nudgeForCount(group_size.get(groupId) ?? localCount)
}

function nudgeForCount(count) {
    if (count <= STACK_NUDGE_XS_COUNT) {
        return { x: STACK_NUDGE_XS, y: STACK_NUDGE_XS }
    }
    // The height budget split between the gaps, but never a step bigger than MAX: a handful of
    // cards spread over the full height would read as a staircase rather than as a stack.
    return { x: 0, y: -Math.min(STACK_NUDGE_MAX, STACK_FAN_HEIGHT / (count - 1)) }
}

// === Selection contract ===

export function selectionPayload(node, allNodes = [node]) {
    const cards = allNodes.filter(n => n.kind === 'card')

    // How many separate piles the selection spans: each distinct group counts once, each loose
    // card counts as its own. This is the number that decides which controls make sense.
    const units = new Set()
    for (const card of cards) units.add(card.groupId ?? card)

    const groupId = node.groupId
    const count = groupId ? countGroupMembers(groupId) : 1

    return {
        faceDown: node.props.faceDown,
        sleeveColor: node.props.sleeveColor,
        groupId: groupId ?? null,
        card: node.cardData ?? null,
        group: units.size === 1 && count >= 2 ? { count } : null,
        canGroup: units.size >= 2,
        canUngroup: units.size === 1 && count >= 2,
        cardCount: cards.length,
    }
}

// Returns all cards in the same group as `node`, or just [node] if ungrouped. Used by the
// pointer machine to make every grouped card behave as an atomic unit.
export function expandToGroup(node) {
    if (node?.kind !== 'card' || !node.groupId) return node ? [node] : []
    return getGroupMembers(node.groupId)
}

// Free-drop placement: nudge diagonally until a vacant spot is found so duplicate drags from
// the deckbox fan out visually instead of stacking invisibly.
function resolveDropPosition(preferredX, preferredY) {
    let x = preferredX
    let y = preferredY
    const cards = allCards()
    while (cards.some(c => c.x === x && c.y === y)) {
        x += STACK_NUDGE
        y += STACK_NUDGE
    }
    return { x, y }
}

// === Lifecycle ===
export function init() {
    const app = getApp()
    if (!app) return

    // Passive: the press only watches. The container has already opted out of the browser's
    // gestures. Bound to the canvas element rather than through the scene graph for the same
    // reason Konva needed it on the container — a touch that hits nothing must still be heard.
    app.canvas.addEventListener('touchstart', onContainerTouchStart, { passive: true })

    // Double tap to turn over. Konva bound this at stage level because the second tap of a pair
    // landed on the transformer; here the chrome is not in the card band, so the tap can be
    // asked of the band directly — via the same resolver the long press uses.
    app.stage.on('pointertap', (e) => onCardTap(cardAtGlobal(e.global), e))
}

export function destroy() {
    getApp()?.canvas.removeEventListener('touchstart', onContainerTouchStart)
}

// === Drag hooks ===
// Konva bubbled dragstart/dragmove/dragend to the layer and this file listened at stage level.
// pointer.js calls these instead, once per node, at the same three moments.

export function onDragStart() {
    // A press that became a drag is not half of a double tap, and the release that ends it is
    // not a tap — so the pending tap goes with the preview.
    resetDoubleTap()
    endLongPress()

    const moving = getMovingCards()
    if (moving.length === 0) return

    canvasDragging.set(true)

    // pointer.js calls this once per moving node; the first builds the cache, the rest bail.
    if (drag_candidates) return

    // Snapshot every potential merge target with its screen rect ONCE. Targets don't move while
    // we drag, so re-measuring them per frame was pure waste.
    const movingSet = new Set(moving)
    const movingGroupIds = new Set(moving.map(m => m.groupId).filter(Boolean))
    drag_candidates = allCards()
        .filter(c => !movingSet.has(c) && !(c.groupId && movingGroupIds.has(c.groupId)))
        .map(c => ({ node: c, rect: screenRect(c) }))
}

// === Creating cards ===

export function addCard(card, config, preferredX, preferredY, options = {}) {
    if (!getApp()) return

    const {
        faceDown = false,
        sleeveColor = theme().card.sleeve,
        resolveOverlap = true,
        rotation = 0,
        groupId = null,
        mergeIfOverlap = false,
        nodeId = null,
        // Played out of the hand rather than dealt — see tactileSpawn. Only dropFromHand sets
        // it: cardEmptyHand puts a whole hand down at once and is a deal, not a gesture.
        held = false,
    } = options

    const center = getViewportCenter()
    let x = preferredX ?? center.x
    let y = preferredY ?? center.y

    // Hand-drop merge: capture any existing card under the drop point BEFORE placement. Same
    // rule as the drag path — only an existing deck absorbs a card.
    const under = mergeIfOverlap ? findCardAtWorldPoint(x, y) : null
    const mergeTarget = under?.groupId ? under : null
    const shouldResolveOverlap = resolveOverlap && !mergeTarget

    if (shouldResolveOverlap) {
        const resolved = resolveDropPosition(x, y)
        x = resolved.x
        y = resolved.y
    }

    const { width: cardW, height: cardH } = cardWorldSize()

    const node = createNode({
        kind: 'card',
        nodeId,
        x, y,
        rotation,
        props: { width: cardW, height: cardH, faceDown, sleeveColor, hover: false },
        draw: paintFace,
        bounds,
    })

    // Not props: these are the card's identity and its loaded bitmaps, none of which the
    // drawing is derived from by value. Kept on the node exactly as the Konva version kept
    // them, so serializers and clones can rebuild without the original call context.
    node.cardData = card
    node.cardConfig = config
    node.groupId = groupId
    node.badge = null

    getCardLayer().addChild(node)
    mirrorNewNode(node)   // options.rotation was a world value — counter-rotate if mirrored

    // Konva's mouseenter/mouseleave, which Pixi spells pointerover/pointerout.
    node.on('pointerover', () => previewCard(node))
    node.on('pointerout', () => emitTableEvent('card-unhover'))

    // Load art in the background. When a side arrives, store it on the node and repaint —
    // paintFace shows it only if that is the side facing up right now. A card with no art resolves
    // to '' and is skipped outright, leaving the sleeve showing.
    loadArt(cardArt(card), (t) => { node.cardTexture = t }, node)
    // Transform cards carry art on their back too, so flipping one reveals its other face
    // instead of a sleeve. cardBack returns '' for every other card, skipping the load.
    loadArt(cardBack(card), (t) => { node.cardBackTexture = t }, node)

    // Hand-drop merge: now that the node is on the band, fold it into the target's group.
    if (mergeTarget) mergeIntoGroup([node], mergeTarget)

    // Last, so the fall lands on the card's final resting pose: a card merged into a pile above
    // settles crooked, a loose one settles flat, and both were decided by the time we get here.
    tactileSpawn(node, { held })

    return node
}

const art_warned = new Set()

async function loadArt(src, assign, node) {
    if (!src) return
    try {
        const texture = await Assets.load(src)
        if (!node.parent) return   // destroyed while the art was in flight
        assign(texture)
        node.repaint()
    } catch (err) {
        // A card at least falls back to its sleeve, so this is not invisible the way a missing
        // accessory is — but it is still a silent wrong answer, and a whole deck rendering as
        // blank sleeves is worth one line in the console. Warned once per URL.
        if (art_warned.has(src)) return
        art_warned.add(src)
        console.error(`[canvas] card art failed to load: ${src}`, err)
    }
}

// === Dealing a deck ===

export async function addDeck(deck_dict, config, preferredX = null, preferredY = null, options = {}) {
    if (!getApp()) return

    const anchor = (preferredX != null && preferredY != null)
        ? { x: preferredX, y: preferredY }
        : getViewportCenter()

    // The space BETWEEN two piles, not the step from one origin to the next.
    const PILE_GAP = 20

    const {
        nodeIds = null,
        pileGroupIds = null,
        sleeveColor = undefined,
        revealed = null,
        zones = null,
    } = options
    let nodeIdCursor = 0

    // Measure the whole deal before placing any of it: a pile's width depends on how many cards
    // it holds, and the row can only be centred once every width is known.
    const { width: cardW, height: cardH } = cardWorldSize()
    const piles = []
    for (const [zone, cards] of Object.entries(deck_dict)) {
        const count = cards.reduce((s, e) => s + (e.quantity || 1), 0)
        if (count === 0) continue
        const nudge = nudgeForCount(count)
        piles.push({
            zone, cards, count, nudge,
            width: cardW + Math.abs(nudge.x) * (count - 1),
            at: zones?.[zone] ?? null,
        })
    }
    if (piles.length === 0) return

    const rowPiles = piles.filter(p => !p.at)
    const rowWidth = rowPiles.reduce((sum, p) => sum + p.width, 0) + PILE_GAP * (rowPiles.length - 1)

    // Step the whole deal off any identical one already lying there. The layout is
    // deterministic from the anchor, so testing where the first card would land recognises it.
    const { x: rowX, y: rowY } = rowPiles.length === 0
        ? { x: anchor.x, y: anchor.y }
        : resolveSpawnPoint(anchor.x, anchor.y, (x, y) => {
            const firstCardX = x - rowWidth / 2 + cardW / 2
            return allCards().some(c => c.x === firstCardX && c.y === y)
        })

    let pileEdge = rowX - rowWidth / 2

    for (const [pileIndex, { zone, cards, count: totalCount, nudge, width, at }] of piles.entries()) {
        const pileX = at ? at.x : pileEdge + cardW / 2
        const pileY = at ? at.y : rowY
        if (!at) pileEdge += width + PILE_GAP

        const pileGroupId = pileGroupIds?.[pileIndex] ?? nextGroupId()
        // The dealer knows this pile's final size before a single card exists, so record it up
        // front: the placement loop and the relayout at the end of it both run while the pile is
        // still half-built, and would otherwise read a growing count.
        setGroupSizes({ [pileGroupId]: totalCount })
        let offsetX = 0
        let offsetY = 0

        for (const entry of cards) {
            const quantity = entry.quantity || 1
            for (let i = 0; i < quantity; i++) {
                const rotation = (Math.random() - 0.5) * 2 * DECK_ROTATION_JITTER_DEG
                addCard(entry, config, pileX + offsetX, pileY + offsetY, {
                    // Face-down means "sleeve showing" for an ordinary card, but for a flip
                    // card it means "flipped to its other side" — there is no sleeve to hide
                    // behind, so those start on their front.
                    faceDown: !hasCardBack(entry) && !revealed?.(entry, zone),
                    resolveOverlap: false,
                    rotation,
                    groupId: pileGroupId,
                    nodeId: nodeIds?.[nodeIdCursor++] ?? null,
                    ...(sleeveColor !== undefined ? { sleeveColor } : {}),
                })
                offsetX += nudge.x
                offsetY += nudge.y
            }
        }
        if (totalCount >= 2) {
            relayoutGroup(pileGroupId)
            refreshGroupBadges(pileGroupId)
        }

        // A zone whose cards are handled one at a time arrives already spread — dealt stacked
        // first and then exploded with the very verb the player has on G, so there is one
        // definition of "laid out one card per column".
        if (at) {
            const members = at.explode ? ungroup(pileGroupId) : getGroupMembers(pileGroupId)
            anchorCardsAt(members, at, cardW, cardH)
        }
    }
}

// Slide a set of cards so the corner of their footprint that the SEAT reads as top-left lands
// on `point`. For a far-end seat the world axes are inverted, which is what `point.turn`
// carries over from seatMatPoint.
function anchorCardsAt(cards, point, cardW, cardH) {
    if (!cards || cards.length === 0) return

    const xs = cards.map(c => c.x)
    const ys = cards.map(c => c.y)
    const corner = point.turn > 0
        ? { x: Math.min(...xs) - cardW / 2, y: Math.min(...ys) - cardH / 2 }
        : { x: Math.max(...xs) + cardW / 2, y: Math.max(...ys) + cardH / 2 }

    const dx = point.x - corner.x
    const dy = point.y - corner.y
    for (const card of cards) card.position.set(card.x + dx, card.y + dy)
}

// === Group state ===

let group_id_counter = 0
function nextGroupId() {
    return `g${++group_id_counter}`
}

function getGroupMembers(groupId) {
    if (!groupId) return []
    return allCards().filter(c => c.groupId === groupId)
}

function countGroupMembers(groupId) {
    return getGroupMembers(groupId).length
}

function getGroupTop(groupId) {
    const members = getGroupMembers(groupId)
    if (members.length === 0) return null
    return members.reduce((top, c) => (zIndexOf(c) > zIndexOf(top) ? c : top))
}

function mergeIntoGroup(movingCards, target, { _emit = true, forcedGroupId = null } = {}) {
    if (movingCards.length === 0) return

    let groupId
    if (forcedGroupId) {
        groupId = forcedGroupId
    } else if (target.groupId) {
        groupId = target.groupId
    } else {
        const movingGroups = new Set(movingCards.map(m => m.groupId).filter(Boolean))
        groupId = movingGroups.size === 1 ? [...movingGroups][0] : nextGroupId()
    }

    const oldGroupsToCheck = new Set()
    for (const m of movingCards) {
        if (m.groupId && m.groupId !== groupId) oldGroupsToCheck.add(m.groupId)
    }

    // Destination members (existing, bottom→top), then moving cards on top in their original
    // relative order.
    const movingSet = new Set(movingCards)
    let destinationMembers = getGroupMembers(groupId).filter(c => !movingSet.has(c))
    if (destinationMembers.length === 0) destinationMembers = [target]
    const sortedDest = destinationMembers.sort((a, b) => zIndexOf(a) - zIndexOf(b))
    const sortedMoving = [...movingCards].sort((a, b) => zIndexOf(a) - zIndexOf(b))
    const finalOrder = [...sortedDest, ...sortedMoving]

    target.groupId = groupId
    for (const card of finalOrder) {
        card.groupId = groupId
        moveToTop(card)
    }

    // Locally-originated merge: the user acted on piles they can see, so this client's
    // membership is complete and becomes the count until the relay confirms it.
    if (_emit) adoptLocalGroupSize(groupId)

    relayoutGroup(groupId)

    for (const oldId of oldGroupsToCheck) dissolveOrRefresh(oldId)
    refreshGroupBadges(groupId)

    // The merge expanded the group beyond what the selection held — re-attach to all members so
    // the next drag moves the whole stack.
    if (setSelection(getGroupMembers(groupId))) {
        broadcastSelectionUI(true)
    }

    if (_emit && target.nodeId) {
        emitCanvasAction({
            op: 'card:merge',
            movingIds: movingCards.map(c => c.nodeId).filter(Boolean),
            targetId: target.nodeId,
            groupId,
        })
    }
}

export function applyMerge(movingIds, targetId, groupId = null) {
    const byId = new Map(allCards().filter(n => n.nodeId).map(n => [n.nodeId, n]))
    const target = byId.get(targetId)
    if (!target) return
    const movingCards = movingIds.map(id => byId.get(id)).filter(Boolean)
    if (movingCards.length === 0) return
    // groupId comes from the originator via the server — using it keeps every client's group
    // ids identical, which server-side shuffle and order tracking depend on.
    mergeIntoGroup(movingCards, target, { _emit: false, forcedGroupId: groupId })
}

// Re-lay the entire stack from its base corner with a clean, count-aware nudge.
//
// Mirror-aware: mirrored viewers fill the slots in reverse so the fan still lands BELOW the top
// card on screen. The pile's world footprint is identical either way — the slots are the same
// points, only which card occupies which one changes — so it stays a per-viewer render choice.
function relayoutGroup(groupId) {
    const members = getGroupMembers(groupId)
    if (members.length === 0) return

    const sorted = [...members].sort((a, b) => zIndexOf(a) - zIndexOf(b))
    const nudge = nudgeForGroup(groupId, sorted.length)

    // Anchor on the pile's base corner — the member furthest back along the nudge — rather than
    // on whichever card is bottom-most. That corner is the same world point under either slot
    // assignment, which keeps repeat relayouts idempotent.
    let base = { x: sorted[0].x, y: sorted[0].y }
    let least = Infinity
    for (const c of sorted) {
        const along = c.x * nudge.x + c.y * nudge.y
        if (along < least) { least = along; base = { x: c.x, y: c.y } }
    }

    const last = sorted.length - 1
    for (let i = 0; i <= last; i++) {
        const slot = mirror_view.get() ? last - i : i
        sorted[i].position.set(base.x + slot * nudge.x, base.y + slot * nudge.y)
    }

    // The positions above are the pile's truth and are shared by everyone; this is the lie on
    // top of them that makes it look stacked by hand rather than by arithmetic.
    tactileStack(sorted)
}

export function relayoutGroups(groupIds) {
    for (const id of groupIds) {
        if (!id) continue
        const members = getGroupMembers(id)
        if (members.length === 0) continue
        // Skips groups under an active local drag, or mid-glide from a peer's stream, so it
        // never yanks a pile out from under a cursor or interrupts an animation.
        if (members.some(c => c._dragging || c._remoteTween)) continue
        relayoutGroup(id)
        refreshGroupBadges(id)
    }
}

// Re-project a peer's broadcast card positions onto THIS client's slot assignment, so a
// mirrored viewer's piles do not visibly dance as each packet lands foreign and is corrected.
export function projectGroupMoves(moves) {
    const targets = new Map()
    if (!Array.isArray(moves) || moves.length === 0) return targets

    const byId = new Map()
    for (const c of allCards()) if (c.nodeId) byId.set(c.nodeId, c)

    const byGroup = new Map()
    for (const mv of moves) {
        const groupId = byId.get(mv.nodeId)?.groupId
        if (!groupId) continue
        if (!byGroup.has(groupId)) byGroup.set(groupId, [])
        byGroup.get(groupId).push(mv)
    }

    for (const [groupId, groupMoves] of byGroup) {
        const members = getGroupMembers(groupId)
        // Only project a pile the batch carries in full — a partial batch can't say where the
        // pile's base corner ended up, and guessing would drag the whole stack.
        if (members.length === 0 || groupMoves.length !== members.length) continue

        const sorted = [...members].sort((a, b) => zIndexOf(a) - zIndexOf(b))
        const nudge = nudgeForGroup(groupId, sorted.length)

        let base = null
        let least = Infinity
        for (const mv of groupMoves) {
            const along = mv.x * nudge.x + mv.y * nudge.y
            if (along < least) { least = along; base = { x: mv.x, y: mv.y } }
        }
        if (!base) continue

        const last = sorted.length - 1
        for (let i = 0; i <= last; i++) {
            const node = sorted[i]
            if (!node.nodeId) continue
            const slot = mirror_view.get() ? last - i : i
            targets.set(node.nodeId, {
                x: base.x + slot * nudge.x,
                y: base.y + slot * nudge.y,
            })
        }
    }
    return targets
}

function detachFromGroup(card) {
    const groupId = card.groupId
    if (!groupId) return
    card.groupId = null
    removeBadge(card)
    dissolveOrRefresh(groupId)
}

// === Grouping and exploding ===

// Fold everything in the selection into one pile. The biggest existing pile wins: its groupId
// survives and its position anchors the result, so adding one card to a 60-card deck doesn't
// drag the deck across the table. Ties go to the pile whose top card sits highest.
export function makeGroup() {
    const selected = new Set()
    for (const node of getSelected()) {
        if (node.kind !== 'card') continue
        for (const member of expandToGroup(node)) selected.add(member)
    }
    const cards = [...selected]
    if (cards.length < 2) return

    let winner = null
    let bestCount = 0
    let bestZ = -Infinity
    for (const groupId of new Set(cards.map(c => c.groupId).filter(Boolean))) {
        const members = getGroupMembers(groupId)
        const topZ = members.reduce((z, c) => Math.max(z, zIndexOf(c)), -Infinity)
        if (members.length > bestCount || (members.length === bestCount && topZ > bestZ)) {
            winner = groupId
            bestCount = members.length
            bestZ = topZ
        }
    }

    // Nothing is grouped yet, so there is no id to inherit — mint one. Online this branch is
    // not reached: multiplayer.js routes an all-loose selection to the relay so every client
    // lands on the same id.
    if (!winner) {
        const groupId = nextGroupId()
        const sorted = [...cards].sort((a, b) => zIndexOf(a) - zIndexOf(b))
        for (const card of sorted) {
            card.groupId = groupId
            moveToTop(card)
        }
        adoptLocalGroupSize(groupId)
        relayoutGroup(groupId)
        refreshGroupBadges(groupId)

        setSelection(sorted)
        broadcastSelectionUI(true)
        return
    }

    const moving = cards.filter(c => c.groupId !== winner)
    if (moving.length === 0) return // already a single pile — nothing to do

    const members = getGroupMembers(winner)
    const target = members.reduce((top, c) => (zIndexOf(c) > zIndexOf(top) ? c : top))
    mergeIntoGroup(moving, target)
}

// Explode one pile back into loose cards — the inverse of makeGroup. See the original for why
// the gap is 10 rather than 20 (Naruto's chakra row has to fit inside a printed zone).
const EXPLODE_STACK_SIZE = 5
const EXPLODE_GAP = 10

export function ungroup(groupId = null) {
    const id = groupId ?? getSelectedGroupId()
    if (!id) return []

    const members = getGroupMembers(id)
    if (members.length === 0) return []

    const sorted = [...members].sort((a, b) => zIndexOf(a) - zIndexOf(b))

    // Anchor on the pile's top-left footprint corner and grow right/down, so the explosion
    // opens out of where the pile visually sat. Mirrored viewers grow the other way in world
    // space, which is the same direction on their screen.
    const dir = mirror_view.get() ? -1 : 1
    const xs = sorted.map(c => c.x)
    const ys = sorted.map(c => c.y)
    const anchor = dir > 0
        ? { x: Math.min(...xs), y: Math.min(...ys) }
        : { x: Math.max(...xs), y: Math.max(...ys) }

    const depth = sorted.length <= EXPLODE_STACK_SIZE ? 1 : EXPLODE_STACK_SIZE
    const cardW = sorted.reduce((w, c) => Math.max(w, c.props.width), 0)
    const pitch = cardW + (depth - 1) * STACK_NUDGE_XS + EXPLODE_GAP

    sorted.forEach((card, i) => {
        const stack = Math.floor(i / depth)
        const slot = i % depth
        card.position.set(
            anchor.x + dir * (stack * pitch + slot * STACK_NUDGE_XS),
            anchor.y + dir * (slot * STACK_NUDGE_XS),
        )
        card.groupId = null
        removeBadge(card)
    })

    // No longer stacked, so no longer crooked.
    tactileStack(sorted)

    // The pile is gone: drop its authoritative size rather than leave a count in force for a
    // groupId nothing carries any more.
    setGroupSizes({ [id]: 0 })

    broadcastSelectionUI(true)
    return sorted
}

// Where a card joining this pile should land, and how it should sit. The pile's top card
// answers all three.
export function getGroupDropSpec(groupId, card = null) {
    const top = getGroupTop(groupId)
    if (!top) return null
    return {
        x: top.x,
        y: top.y,
        config: top.cardConfig,
        faceDown: top.props.faceDown && !(card && hasCardBack(card)),
    }
}

// Fold loose cards into an existing pile. Exported for bulk arrivals — chiefly emptying a hand
// — which want the cards created first and merged once.
export function mergeIntoGroupTop(cards, groupId) {
    const moving = (cards ?? []).filter(c => c?.kind === 'card')
    if (moving.length === 0) return
    const top = getGroupTop(groupId)
    if (!top) return
    mergeIntoGroup(moving, top)
}

// === Group revision ===
// A counter the DOM side watches to learn that a pile's contents changed under it. Nodes are
// not reactive and this module has no business knowing who is watching, so it publishes one
// number: bump it, and every watcher re-reads with getGroupCards.
export const group_revision = store(0)

function bumpGroupRevision() {
    group_revision.update(n => n + 1)
}

function dissolveOrRefresh(groupId) {
    bumpGroupRevision()
    const remaining = getGroupMembers(groupId)
    // Reached only when this client has just pulled a card out of the pile, so it demonstrably
    // holds the pile and the local count is good.
    setGroupSizes({ [groupId]: remaining.length <= 1 ? 0 : remaining.length })
    if (remaining.length <= 1) {
        remaining.forEach(c => { c.groupId = null; removeBadge(c) })
    } else {
        relayoutGroup(groupId)
        refreshGroupBadges(groupId)
    }
}

function refreshGroupBadges(groupId) {
    bumpGroupRevision()
    const members = getGroupMembers(groupId)
    const count = members.length
    const top = getGroupTop(groupId)
    for (const m of members) {
        if (m === top && count >= 2) setBadge(m, count)
        else removeBadge(m)
    }
}

// === Badge rendering ===
// A child of the NODE, sibling of the face — as in Konva, and for the reason that matters here:
// tactility owns the face, so a badge inside it would tilt and drift with the card's crookedness
// instead of sitting square on the pile.

const BADGE_RADIUS = 14
const BADGE_PADDING = 8

// Shared, not built per pile. Konva rebuilt a Text's font metrics per node; a Pixi TextStyle is a
// heavier object and a table can hold a badge per pile, so there is no reason for each to own its
// own copy of the same style. Rebuilt only when the theme it was made from is replaced.
let badge_style = null
let badge_theme = null

function badgeStyle() {
    const current = theme()
    if (badge_style && badge_theme === current) return badge_style
    badge_theme = current
    badge_style = new TextStyle({
        fontFamily: current.font,
        fontSize: 17,
        fill: toPixiColor(current.card.count.fill),
        stroke: { color: toPixiColor(current.card.count.stroke), width: 10 },
        align: 'center',
    })
    return badge_style
}

function setBadge(card, count) {
    if (card.badge) {
        card.badge.text = String(count)
        return
    }
    const badge = new Text({ text: String(count), style: badgeStyle() })
    badge.anchor.set(0.5)
    badge.position.set(
        card.props.width / 2 - BADGE_PADDING - BADGE_RADIUS,
        -card.props.height / 2 + BADGE_PADDING + BADGE_RADIUS,
    )
    badge.eventMode = 'none'
    card.badge = badge
    card.addChild(badge)
}

function removeBadge(card) {
    if (!card.badge) return
    card.badge.destroy()
    card.badge = null
}

// === Drag / hover-to-group interaction ===

let hover_target = null
let hover_timer = null
let hover_armed = false
let drag_candidates = null   // [{ node, rect }] — non-moving cards, cached at drag start
let drag_scan_raf = 0

function rectOverlapAreaPct(a, b) {
    const ix = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    const iy = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
    const intersect = ix * iy
    const aArea = a.width * a.height
    return aArea > 0 ? intersect / aArea : 0
}

function getMovingCards() {
    return getSelected().filter(n => n.kind === 'card')
}

// A merge has to involve a deck that already exists. Two loose cards overlapping used to mint a
// group, which meant cards clumped into decks just from being pushed around the table.
// Deliberately gates the CANDIDATE, not the drop, so the highlight never appears in the cases
// that no longer merge.
function findMergeCandidate(movingCards) {
    if (!drag_candidates || movingCards.length === 0) return null

    const movingRects = movingCards.map(m => screenRect(m))
    const movingIsDeck = movingCards.some(m => m.groupId)

    let best = null
    let bestPct = 0
    for (const { node, rect } of drag_candidates) {
        if (!node.parent) continue                    // destroyed mid-drag (a peer removed it)
        if (!node.groupId && !movingIsDeck) continue  // neither side is a deck — no stacking

        let maxPct = 0
        for (const mRect of movingRects) {
            const pct = rectOverlapAreaPct(mRect, rect)
            if (pct > maxPct) maxPct = pct
        }
        if (maxPct > bestPct) {
            best = node
            bestPct = maxPct
        }
    }
    return bestPct > MERGE_OVERLAP_THRESHOLD ? best : null
}

// Strokes every member of the target's group so a merge-ready deck shows the highlight on every
// visible sliver, not only the card that captured the hit.
function highlightTargets(card) {
    return card.groupId ? getGroupMembers(card.groupId) : [card]
}

function setHover(card, on) {
    for (const c of highlightTargets(card)) c.setProps({ hover: on })
}

function clearHoverState() {
    if (hover_target) setHover(hover_target, false)
    if (hover_timer) clearTimeout(hover_timer)
    hover_target = null
    hover_timer = null
    hover_armed = false
}

// pointer.js calls this per moving node per frame — gate the actual scan to one run per
// animation frame regardless of how many cards are in flight.
export function onDragMove() {
    if (!drag_candidates || drag_scan_raf) return
    drag_scan_raf = requestAnimationFrame(() => {
        drag_scan_raf = 0
        if (!drag_candidates) return   // drag ended before this frame fired
        runMergeScan()
    })
}

function runMergeScan() {
    const cards = getMovingCards()
    if (cards.length === 0) return

    const target = findMergeCandidate(cards)
    if (target === hover_target) return

    if (hover_target) setHover(hover_target, false)
    if (hover_timer) clearTimeout(hover_timer)
    hover_target = target
    hover_timer = null
    hover_armed = false

    if (target) {
        hover_timer = setTimeout(() => {
            if (hover_target === target) {
                setHover(target, true)
                hover_armed = true
            }
            hover_timer = null
        }, HOVER_MERGE_DELAY_MS)
    }
}

// `discarded` says these cards are being thrown off the table rather than put down — the drag
// was released over the edge and they are about to be destroyed (see the discard branch in
// pointer.js).
//
// Everything else here still runs, and that is the point of a flag rather than a second hook:
// this function is where a drag's machinery is TAKEN DOWN, and none of that stops being
// necessary because the cards are going in the bin. The one thing that does is the merge — a
// card passing over a pile on its way off the table has not been played onto it, and merging it
// in would file it into a group a moment before destroying it, leaving the group's size
// authority describing a card that no longer exists.
export function onDragEnd(node, { discarded = false } = {}) {
    if (drag_scan_raf) {
        cancelAnimationFrame(drag_scan_raf)
        drag_scan_raf = 0
    }
    drag_candidates = null

    const cards = getMovingCards()
    if (cards.length === 0) {
        clearHoverState()
        canvasDragging.set(false)
        return
    }

    if (!discarded && hover_target && hover_armed) {
        mergeIntoGroup(cards, hover_target)
    }
    clearHoverState()
    canvasDragging.set(false)

    // The drop itself is the pointer machine's — it runs after this, so a card merged into a
    // pile here falls onto its crooked slot rather than to flat and getting re-crooked a frame
    // later. See onDragEnd in canvas-pixi/pointer.js.
}

// === Per-node mutators ===

function setFaceDown(node, faceDown) {
    if (node?.kind !== 'card') return
    node.setProps({ faceDown })
    // The preview is showing the side that just turned over — drop it rather than leave the
    // wrong face hanging over the table.
    if (faceDown) emitTableEvent('card-unhover')
}

function setSleeveColor(node, color) {
    if (node?.kind !== 'card') return
    // Konva had to guard this: a face-down flip card is showing art, not the sleeve, so
    // repainting would paint the new colour over it. Here the colour is a prop and paintFace
    // already prefers the texture when there is one, so the guard is the drawing's business
    // rather than the setter's and the special case disappears.
    node.setProps({ sleeveColor: color })
}

// After a snapshot replay or any bulk reconstruction, walk every grouped card and re-run
// relayout + badge refresh per group. Individual addCard calls don't rebuild stacks or badges.
export function refreshAllGroups() {
    const groupIds = new Set()
    for (const c of allCards()) if (c.groupId) groupIds.add(c.groupId)
    for (const id of groupIds) {
        relayoutGroup(id)
        refreshGroupBadges(id)
    }
}

// Generic prop patch — multiplayer.js calls this when a nodes:patch event targets a card.
// Unknown props are no-ops so the payload shape can evolve without breaking older clients.
export function applyPatch(node, props) {
    if (node?.kind !== 'card') return
    for (const [key, value] of Object.entries(props)) {
        switch (key) {
            case 'faceDown':    setFaceDown(node, value); break
            case 'sleeveColor': setSleeveColor(node, value); break
            // A card leaving its group takes its count badge with it — the badge belongs to the
            // pile's top card, so a peer applying the clear would otherwise be left with a
            // number floating over a loose card.
            case 'groupId':     node.groupId = value; if (!value) removeBadge(node); break
            case 'rotation':    setWorldRotation(node, value); break
        }
    }
}

// === Clone ===
// Konva.clone deep-copied the node and its children, which meant copying six fields back on by
// hand and destroying the badge that came along uninvited. Rebuilding through addCard is both
// shorter and the thing that was actually meant.
export function cloneNode(node) {
    if (node?.kind !== 'card') return null
    return addCard(node.cardData, node.cardConfig, node.x, node.y, {
        faceDown: node.props.faceDown,
        sleeveColor: node.props.sleeveColor,
        rotation: getWorldRotation(node),
        groupId: null,
    })
}

// === Toolbar actions — operate on the current selection ===

// Flips the whole selection to one state, and returns it so the multiplayer wrapper can
// broadcast the same answer instead of working it out a second time.
//
// The direction is keyed on the TOP card by z, not cards[0]: the selection holds a group in z
// order, so cards[0] is the card at the BOTTOM. A deck whose top card had been turned over by a
// scry therefore offered "Hide" and answered by turning the entire deck face-up.
export function flip() {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return null
    const rep = cards.reduce((top, c) => (zIndexOf(c) > zIndexOf(top) ? c : top))
    const target = !rep.props.faceDown
    cards.forEach(node => setFaceDown(node, target))
    bumpGroupRevision()
    // The toolbar's eye icon and its Show/Hide label are read off the payload, so without this
    // the button that just turned a deck face-up still offers to reveal it.
    broadcastSelectionUI(true)
    return target
}

export function rotate(direction) {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return
    const step = (direction === 'ccw' ? -45 : 45) * DEG
    cards.forEach(node => { node.rotation += step })
}

export function changeSleeveColor(color) {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return
    cards.forEach(node => setSleeveColor(node, color))
    // sleeveColor is part of the selection payload — refresh it so the toolbar's colour chip
    // shows the new colour instead of the one the selection was made with.
    broadcastSelectionUI(true)
}

// === Drawing from a pile ===

// Targeting precedence: explicit groupId, else the current selection's group; an explicit
// nodeId overrides count/from.
function getDrawContext({ count = 1, from = 'top', nodeId = null, groupId = null } = {}) {
    if (!groupId) groupId = getSelectedGroupId()
    if (!groupId) return null

    const members = getGroupMembers(groupId)
    if (members.length === 0) return null

    let drawn
    if (nodeId != null) {
        const card = members.find(c => (c.nodeId ?? c.uid) === nodeId)
        if (!card) return null
        drawn = [card]
    } else {
        const sorted = [...members].sort((a, b) => zIndexOf(a) - zIndexOf(b))
        const n = Math.min(count, sorted.length)
        // drawn[0] is always the first card to come off — top of the deck for 'top'.
        drawn = from === 'bottom' ? sorted.slice(0, n) : sorted.slice(-n).reverse()
    }

    const drawnSet = new Set(drawn)
    const remaining = members.filter(c => !drawnSet.has(c))
    return { drawn, remaining }
}

const DRAW_OFFSET_X = 20

export function draw({ count = 1, from = 'top', to = 'board', nodeId = null, groupId = null, skipHandPush = false, at = null } = {}) {
    const ctx = getDrawContext({ count, from, nodeId, groupId })
    if (!ctx) return { added: [] }
    const { drawn, remaining } = ctx
    const added = []

    if (to === 'board') {
        const cardW = drawn[0].props.width
        const placed = at && Number.isFinite(at.x) && Number.isFinite(at.y)
        let baseX, baseY
        if (placed) {
            baseX = at.x
            baseY = at.y
        } else if (remaining.length > 0) {
            const remBottom = remaining.reduce((bot, c) => (zIndexOf(c) < zIndexOf(bot) ? c : bot))
            baseX = remBottom.x + cardW + DRAW_OFFSET_X
            baseY = remBottom.y
        } else {
            baseX = drawn[0].x + cardW + DRAW_OFFSET_X
            baseY = drawn[0].y
        }

        for (const card of drawn) {
            // A point the player picked with the pointer is exact. resolveDropPosition exists to
            // keep an AUTOMATIC placement off something already there, which is the opposite of
            // what a deliberate drop wants.
            const pos = placed ? { x: baseX, y: baseY } : resolveDropPosition(baseX, baseY)
            detachFromGroup(card)
            card.position.set(pos.x, pos.y)
            moveToTop(card)
        }
    } else if (to === 'hand') {
        for (const card of drawn) {
            if (card.cardData) {
                const entry = { handEntryId: newHandEntryId(), ...card.cardData }
                if (!skipHandPush) addToHand(entry)
                added.push(entry)
            }
            detachFromGroup(card)
            card.destroy()
        }
    } else {
        return { added: [] }
    }

    // The pile is left exactly where it lies: relayoutGroup anchors what remains on its base
    // corner, so a draw costs the fan its topmost sliver and moves nothing else.
    //
    // Local draw leaves you holding what's left. A replayed peer draw must not — setSelection
    // refuses while a remote apply is in flight (see selection.js).
    setSelection(remaining)
    broadcastSelectionUI(true)
    return { added }
}

function newHandEntryId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `h-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Returns the groupId of the current selection if it's a single card group, else null.
export function getSelectedGroupId() {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return null
    const ids = new Set(cards.map(c => c.groupId).filter(Boolean))
    if (ids.size !== 1) return null
    return [...ids][0]
}

// Snapshot of a group's cards, ordered top-of-deck first.
//
// In multiplayer `nodeId` is the wrapper-assigned UUID, which is what peers and the server key
// on. Pixi's `uid` is only a solo-mode fallback and MUST NOT reach the wire — each client
// numbers its own nodes, so uids never agree across peers. (Konva's `_id` had the same rule.)
export function getGroupCards(groupId) {
    const members = getGroupMembers(groupId)
    if (members.length === 0) return []
    return [...members]
        .sort((a, b) => zIndexOf(b) - zIndexOf(a))
        .map(c => ({
            nodeId: c.nodeId ?? c.uid,
            cardData: c.cardData,
            faceDown: c.props.faceDown,
        }))
}

// Flips card(s) in a group without removing them. `target` is a nodeId, an array of them, or
// null for every member.
export function setCardFaceDown(groupId, target, faceDown) {
    const members = getGroupMembers(groupId)
    let cards
    if (target == null) {
        cards = members
    } else {
        const ids = Array.isArray(target) ? new Set(target) : new Set([target])
        cards = members.filter(c => ids.has(c.nodeId ?? c.uid))
    }
    if (cards.length === 0) return
    for (const c of cards) setFaceDown(c, faceDown)
    bumpGroupRevision()
}

// Applies a new top-first order to the group. Cards whose id isn't found are skipped.
export function setGroupOrder(groupId, orderedIds) {
    const members = getGroupMembers(groupId)
    if (members.length === 0) return
    const byId = new Map(members.map(c => [c.nodeId ?? c.uid, c]))
    const reordered = orderedIds.map(id => byId.get(id)).filter(Boolean)
    if (reordered.length === 0) return

    // Raise in reverse — orderedIds[0] is the desired top of the deck, so it should end up
    // highest (last raise wins).
    for (let i = reordered.length - 1; i >= 0; i--) moveToTop(reordered[i])

    relayoutGroup(groupId)
    refreshGroupBadges(groupId)
}

// Drains every card in the current selection into the seat's hand and removes the nodes.
export function sendToHand({ skipHandPush = false } = {}) {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return { added: [] }

    const affectedGroups = new Set(cards.map(c => c.groupId).filter(Boolean))
    const added = []

    for (const card of cards) {
        if (card.cardData) {
            const entry = { handEntryId: newHandEntryId(), ...card.cardData }
            if (!skipHandPush) addToHand(entry)
            added.push(entry)
        }
        card.groupId = null
        card.destroy()
    }

    for (const id of affectedGroups) dissolveOrRefresh(id)

    setSelection([])
    broadcastSelectionUI(true)
    return { added }
}

// === Shuffle ===
// Randomly reorders a group and plays a 360° spin per card at a random speed. The deck's anchor
// stays put; only the order and positions change.
const SHUFFLE_MIN_DURATION = 0.1
const SHUFFLE_MAX_DURATION = 2

export function shuffle(groupId = null) {
    // Defensive: Vue's @click passes $event by default, so a stray PointerEvent could land here.
    if (typeof groupId !== 'string') groupId = getSelectedGroupId()
    if (!groupId) return

    const members = getGroupMembers(groupId)
    if (members.length < 2) return

    // Fisher-Yates
    const shuffled = [...members]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Stacked in the new order, then laid out by relayoutGroup, exactly as a shuffle from the relay
    // is (setGroupOrder). Laying the cards out here from the bottom card's corner was only right
    // unmirrored: a mirrored viewer's bottom card sits at the far end of the fan, so every shuffle
    // moved the pile a whole fan's length across the table.
    for (const card of shuffled) moveToTop(card)
    relayoutGroup(groupId)
    refreshGroupBadges(groupId)
    spinGroup(groupId)
}

// Each card spins 360° at its own random speed, snapping back to its original rotation on
// finish so repeated shuffles don't accumulate huge numbers — and because the original is
// whatever the node currently holds, this stays correct under mirror view, where a card's raw
// rotation is world+180.
//
// Konva.Tween becomes Motion's animate. Note this is the ONE place motion touches the node rather
// than the face: a spin is not tactility, the node's own rotation is what the wire format carries,
// and it lands back exactly where it started. See tactility.js for why everything else stays off
// the node.
function spinGroup(groupId) {
    for (const card of getGroupMembers(groupId)) {
        card._shuffleSpin?.stop?.()
        const originalRotation = card.rotation
        const duration = SHUFFLE_MIN_DURATION + Math.random() * (SHUFFLE_MAX_DURATION - SHUFFLE_MIN_DURATION)
        card._shuffleSpin = animate(0, 1, {
            duration,
            ease: 'linear',
            onUpdate(t) {
                if (!card.parent) return card._shuffleSpin?.stop?.()
                card.rotation = originalRotation + t * 360 * DEG
            },
            onComplete() {
                card._shuffleSpin = null
                if (card.parent) card.rotation = originalRotation
            },
        })
    }
}

// Server-authoritative shuffle: adopt the relay's order, then play the same spin the solo path
// does — every client runs this, the originator included, since online it never ran a local
// shuffle to animate.
export function applyShuffle(groupId, orderedIds) {
    setGroupOrder(groupId, orderedIds)
    spinGroup(groupId)
}
