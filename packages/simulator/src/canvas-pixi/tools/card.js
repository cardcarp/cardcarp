import { Assets, Graphics, Text, TextStyle } from 'pixi.js'
import { store } from '../../state/store.js'
import { animate } from 'motion'

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

export const selection_style = 'piece'

const DEG = Math.PI / 180

const CARD_STROKE_ALPHA = 0.12
const CARD_CORNER_RADIUS = 4
const STACK_NUDGE = 8

const STACK_NUDGE_XS = 10
const STACK_NUDGE_MAX = 2
const STACK_FAN_HEIGHT = 24
const STACK_NUDGE_XS_COUNT = 6
const DECK_ROTATION_JITTER_DEG = 0
const HOVER_MERGE_DELAY_MS = 400
const MERGE_OVERLAP_THRESHOLD = 0.5

const LONG_PRESS_MS = 300
const LONG_PRESS_SLOP = 8

export function cardWorldSize() {
    return cardSize()
}

function getCardLayer() {
    return getLayers().card
}

function allCards() {
    return (getCardLayer()?.children ?? []).filter(n => n.kind === 'card')
}

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
    if (canvasPressActive.get()) return

    const showsBackArt = node.props.faceDown && hasCardBack(node.cardData)
    if (node.props.faceDown && !showsBackArt) return
    emitTableEvent('card-hover', {
        card: node.cardData,
        rect: getCardScreenRect(node),
        variant: showsBackArt ? CARD_BACK_VARIANT : '',
    })
}

let press = null

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

    window.addEventListener('touchmove', onLongPressMove)
    window.addEventListener('touchend', endLongPress)
    window.addEventListener('touchcancel', endLongPress)
}

function onLongPressMove(e) {
    if (!press) return
    if (e.touches.length > 1) return endLongPress()
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
    emitTableEvent('card-unhover', { immediate: true })
}

function onCardTap(node, e) {
    if (!node) return resetDoubleTap()
    const point = { x: e.global.x, y: e.global.y }
    if (!isDoubleTap(node, point.x, point.y)) return
    turnOverCard(node)
}

function turnOverCard(node) {
    const rotation = getWorldRotation(node)
    const props = {}

    if (rotation > 0.01 && rotation < 359.99) {
        setWorldRotation(node, 0)
        props.rotation = 0
    } else {
        const faceDown = !node.props.faceDown
        setFaceDown(node, faceDown)
        props.faceDown = faceDown

        bumpGroupRevision()
        broadcastSelectionUI(true)
    }

    if (node.nodeId) emitCanvasAction({ op: 'node:patch', nodeId: node.nodeId, props })
}

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

function nudgeForGroup(groupId, localCount) {
    return nudgeForCount(group_size.get(groupId) ?? localCount)
}

function nudgeForCount(count) {
    if (count <= STACK_NUDGE_XS_COUNT) {
        return { x: STACK_NUDGE_XS, y: STACK_NUDGE_XS }
    }
    return { x: 0, y: -Math.min(STACK_NUDGE_MAX, STACK_FAN_HEIGHT / (count - 1)) }
}

export function selectionPayload(node, allNodes = [node]) {
    const cards = allNodes.filter(n => n.kind === 'card')

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

export function expandToGroup(node) {
    if (node?.kind !== 'card' || !node.groupId) return node ? [node] : []
    return getGroupMembers(node.groupId)
}

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

export function init() {
    const app = getApp()
    if (!app) return

    app.canvas.addEventListener('touchstart', onContainerTouchStart, { passive: true })

    app.stage.on('pointertap', (e) => onCardTap(cardAtGlobal(e.global), e))
}

export function destroy() {
    getApp()?.canvas.removeEventListener('touchstart', onContainerTouchStart)
}

export function onDragStart() {
    resetDoubleTap()
    endLongPress()

    const moving = getMovingCards()
    if (moving.length === 0) return

    canvasDragging.set(true)

    if (drag_candidates) return

    const movingSet = new Set(moving)
    const movingGroupIds = new Set(moving.map(m => m.groupId).filter(Boolean))
    drag_candidates = allCards()
        .filter(c => !movingSet.has(c) && !(c.groupId && movingGroupIds.has(c.groupId)))
        .map(c => ({ node: c, rect: screenRect(c) }))
}

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
        held = false,
    } = options

    const center = getViewportCenter()
    let x = preferredX ?? center.x
    let y = preferredY ?? center.y

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

    node.cardData = card
    node.cardConfig = config
    node.groupId = groupId
    node.badge = null

    getCardLayer().addChild(node)
    mirrorNewNode(node)

    node.on('pointerover', () => previewCard(node))
    node.on('pointerout', () => emitTableEvent('card-unhover'))

    loadArt(cardArt(card), (t) => { node.cardTexture = t }, node)
    loadArt(cardBack(card), (t) => { node.cardBackTexture = t }, node)

    if (mergeTarget) mergeIntoGroup([node], mergeTarget)

    tactileSpawn(node, { held })

    return node
}

const art_warned = new Set()

async function loadArt(src, assign, node) {
    if (!src) return
    try {
        const texture = await Assets.load(src)
        if (!node.parent) return
        assign(texture)
        node.repaint()
    } catch (err) {
        if (art_warned.has(src)) return
        art_warned.add(src)
        console.error(`[canvas] card art failed to load: ${src}`, err)
    }
}

export async function addDeck(deck_dict, config, preferredX = null, preferredY = null, options = {}) {
    if (!getApp()) return

    const anchor = (preferredX != null && preferredY != null)
        ? { x: preferredX, y: preferredY }
        : getViewportCenter()

    const PILE_GAP = 20

    const {
        nodeIds = null,
        pileGroupIds = null,
        sleeveColor = undefined,
        revealed = null,
        zones = null,
    } = options
    let nodeIdCursor = 0

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
        setGroupSizes({ [pileGroupId]: totalCount })
        let offsetX = 0
        let offsetY = 0

        for (const entry of cards) {
            const quantity = entry.quantity || 1
            for (let i = 0; i < quantity; i++) {
                const rotation = (Math.random() - 0.5) * 2 * DECK_ROTATION_JITTER_DEG
                addCard(entry, config, pileX + offsetX, pileY + offsetY, {
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

        if (at) {
            const members = at.explode ? ungroup(pileGroupId) : getGroupMembers(pileGroupId)
            anchorCardsAt(members, at, cardW, cardH)
        }
    }
}

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

    if (_emit) adoptLocalGroupSize(groupId)

    relayoutGroup(groupId)

    for (const oldId of oldGroupsToCheck) dissolveOrRefresh(oldId)
    refreshGroupBadges(groupId)

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
    mergeIntoGroup(movingCards, target, { _emit: false, forcedGroupId: groupId })
}

function relayoutGroup(groupId) {
    const members = getGroupMembers(groupId)
    if (members.length === 0) return

    const sorted = [...members].sort((a, b) => zIndexOf(a) - zIndexOf(b))
    const nudge = nudgeForGroup(groupId, sorted.length)

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

    tactileStack(sorted)
}

export function relayoutGroups(groupIds) {
    for (const id of groupIds) {
        if (!id) continue
        const members = getGroupMembers(id)
        if (members.length === 0) continue
        if (members.some(c => c._dragging || c._remoteTween)) continue
        relayoutGroup(id)
        refreshGroupBadges(id)
    }
}

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
    if (moving.length === 0) return

    const members = getGroupMembers(winner)
    const target = members.reduce((top, c) => (zIndexOf(c) > zIndexOf(top) ? c : top))
    mergeIntoGroup(moving, target)
}

const EXPLODE_STACK_SIZE = 5
const EXPLODE_GAP = 10

export function ungroup(groupId = null) {
    const id = groupId ?? getSelectedGroupId()
    if (!id) return []

    const members = getGroupMembers(id)
    if (members.length === 0) return []

    const sorted = [...members].sort((a, b) => zIndexOf(a) - zIndexOf(b))

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

    tactileStack(sorted)

    setGroupSizes({ [id]: 0 })

    broadcastSelectionUI(true)
    return sorted
}

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

export function mergeIntoGroupTop(cards, groupId) {
    const moving = (cards ?? []).filter(c => c?.kind === 'card')
    if (moving.length === 0) return
    const top = getGroupTop(groupId)
    if (!top) return
    mergeIntoGroup(moving, top)
}

export const group_revision = store(0)

function bumpGroupRevision() {
    group_revision.update(n => n + 1)
}

function dissolveOrRefresh(groupId) {
    bumpGroupRevision()
    const remaining = getGroupMembers(groupId)
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

const BADGE_RADIUS = 14
const BADGE_PADDING = 8

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

let hover_target = null
let hover_timer = null
let hover_armed = false
let drag_candidates = null
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

function findMergeCandidate(movingCards) {
    if (!drag_candidates || movingCards.length === 0) return null

    const movingRects = movingCards.map(m => screenRect(m))
    const movingIsDeck = movingCards.some(m => m.groupId)

    let best = null
    let bestPct = 0
    for (const { node, rect } of drag_candidates) {
        if (!node.parent) continue
        if (!node.groupId && !movingIsDeck) continue

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

export function onDragMove() {
    if (!drag_candidates || drag_scan_raf) return
    drag_scan_raf = requestAnimationFrame(() => {
        drag_scan_raf = 0
        if (!drag_candidates) return
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
}

function setFaceDown(node, faceDown) {
    if (node?.kind !== 'card') return
    node.setProps({ faceDown })
    if (faceDown) emitTableEvent('card-unhover')
}

function setSleeveColor(node, color) {
    if (node?.kind !== 'card') return
    node.setProps({ sleeveColor: color })
}

export function refreshAllGroups() {
    const groupIds = new Set()
    for (const c of allCards()) if (c.groupId) groupIds.add(c.groupId)
    for (const id of groupIds) {
        relayoutGroup(id)
        refreshGroupBadges(id)
    }
}

export function applyPatch(node, props) {
    if (node?.kind !== 'card') return
    for (const [key, value] of Object.entries(props)) {
        switch (key) {
            case 'faceDown':    setFaceDown(node, value); break
            case 'sleeveColor': setSleeveColor(node, value); break
            case 'groupId':     node.groupId = value; if (!value) removeBadge(node); break
            case 'rotation':    setWorldRotation(node, value); break
        }
    }
}

export function cloneNode(node) {
    if (node?.kind !== 'card') return null
    return addCard(node.cardData, node.cardConfig, node.x, node.y, {
        faceDown: node.props.faceDown,
        sleeveColor: node.props.sleeveColor,
        rotation: getWorldRotation(node),
        groupId: null,
    })
}

export function flip() {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return null
    const rep = cards.reduce((top, c) => (zIndexOf(c) > zIndexOf(top) ? c : top))
    const target = !rep.props.faceDown
    cards.forEach(node => setFaceDown(node, target))
    bumpGroupRevision()
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
    broadcastSelectionUI(true)
}

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

    setSelection(remaining)
    broadcastSelectionUI(true)
    return { added }
}

function newHandEntryId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `h-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getSelectedGroupId() {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return null
    const ids = new Set(cards.map(c => c.groupId).filter(Boolean))
    if (ids.size !== 1) return null
    return [...ids][0]
}

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

export function setGroupOrder(groupId, orderedIds) {
    const members = getGroupMembers(groupId)
    if (members.length === 0) return
    const byId = new Map(members.map(c => [c.nodeId ?? c.uid, c]))
    const reordered = orderedIds.map(id => byId.get(id)).filter(Boolean)
    if (reordered.length === 0) return

    for (let i = reordered.length - 1; i >= 0; i--) moveToTop(reordered[i])

    relayoutGroup(groupId)
    refreshGroupBadges(groupId)
}

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

const SHUFFLE_MIN_DURATION = 0.1
const SHUFFLE_MAX_DURATION = 2

export function shuffle(groupId = null) {
    if (typeof groupId !== 'string') groupId = getSelectedGroupId()
    if (!groupId) return

    const members = getGroupMembers(groupId)
    if (members.length < 2) return

    const shuffled = [...members]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    for (const card of shuffled) moveToTop(card)
    relayoutGroup(groupId)
    refreshGroupBadges(groupId)
    spinGroup(groupId)
}

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

export function applyShuffle(groupId, orderedIds) {
    setGroupOrder(groupId, orderedIds)
    spinGroup(groupId)
}
