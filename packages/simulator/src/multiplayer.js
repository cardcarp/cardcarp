import { animate } from 'motion'
import * as canvas from './canvas-pixi/index.js'
import { getApp, findNodeById } from './canvas-pixi/index.js'
import { onDrag } from './canvas-pixi/pointer.js'
import { onTransformEnd } from './canvas-pixi/selection.js'
import { broadcastSelectionUI, getSelected, pruneSelection, setSelection, withRemoteApply } from './canvas-pixi/selection.js'
import { onCanvasAction } from './canvas-pixi/observer.js'
import { batch, persist, store } from './state/store.js'
import { createSocket } from './socket.js'
import { spawnsFaceUp } from './flip.js'
import { isOpeningDeal, markSeatPlaced, openingZones, shuffleMain } from './deal.js'
import {
    addSeat,
    adoptRoomSeats,
    applySeatEvent,
    applySeatSnapshot,
    hand,
    localSeatIdForSeeding,
    mySeatId,
    ownSeatSleeve,
    removeFromHand,
    seatsToSeed,
    setSeatTransport,
    setSeatsOnline,
} from './seats.js'

function normalizeWsBase(raw) {
    const FALLBACK = 'ws://localhost:8787'
    if (typeof raw !== 'string' || !raw.trim()) return FALLBACK
    try {
        const url = new URL(raw.trim())
        if (url.protocol === 'https:') url.protocol = 'wss:'
        else if (url.protocol === 'http:') url.protocol = 'ws:'
        if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return FALLBACK
        return `${url.protocol}//${url.host}`
    } catch {
        return FALLBACK
    }
}

let WS_BASE = normalizeWsBase(null)

export function setRelayUrl(raw) {
    WS_BASE = normalizeWsBase(raw)
}

function urlOverride(key) {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get(key)
}

const _idOverride = urlOverride('clientId') ?? urlOverride('playerId')

export const ownClientId = _idOverride ? store(_idOverride) : persist(store(newId()), 'cardcarp:playerId')

export const connectionStatus = store('disconnected')
export const roomCode = store('')

export const connectionError = store('')
const CLOSE_MESSAGES = {
    4001: 'That table is full.',
    4002: 'Too many attempts — wait a moment and try again.',
    4003: 'That table closed after sitting idle.',
    4004: "That room code isn't active. Ask the host for a new one.",
}

// Must match the pair the relay registers with setWebSocketAutoResponse, or every ping wakes the room.
// The heartbeat exists because a NAT can drop an idle socket without closing it.
const PING_MESSAGE = 'ping'
const PONG_MESSAGE = 'pong'
const HEARTBEAT_INTERVAL_MS = 25000
const HEARTBEAT_PONG_TIMEOUT_MS = 10000

export const serverSeq = store(0)

export const resyncCount = store(0)
export const droppedCount = store(0)

let awaitingSnapshot = true
let resyncTimer = null
const RESYNC_RETRY_MS = 5000

function awaitSnapshot(ask) {
    awaitingSnapshot = true
    clearTimeout(resyncTimer)
    const retry = () => {
        if (!_send) { resyncTimer = null; return }
        ask()
        resyncTimer = setTimeout(retry, RESYNC_RETRY_MS)
    }
    resyncTimer = setTimeout(retry, RESYNC_RETRY_MS)
}

function requestResync() {
    if (awaitingSnapshot) return
    resyncCount.update(n => n + 1)
    const ask = () => _send?.(JSON.stringify({ kind: 'resync' }))
    ask()
    awaitSnapshot(ask)
}

function resyncSettled() {
    clearTimeout(resyncTimer)
    resyncTimer = null
    awaitingSnapshot = false
}

function acceptSeq(seq) {
    if (awaitingSnapshot) return false
    if (seq !== serverSeq.get() + 1) {
        requestResync()
        return false
    }
    serverSeq.set(seq)
    return true
}

export const ROOM_CODE_MIN = 7
export const ROOM_CODE_MAX = 32

export function normalizeRoomCode(input) {
    return String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_MAX)
}

export function isValidRoomCode(input) {
    return normalizeRoomCode(input).length >= ROOM_CODE_MIN
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 7
export function generateRoomCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
    let s = ''
    for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length]
    return s
}

let _send = null
let _close = null

let _lastCloseCode = 0

const httpBase = () => WS_BASE.replace(/^ws/, 'http')

function ticketQuery(body) {
    const intent = encodeURIComponent(body?.i ?? 'join')
    if (!body?.t) return `?i=${intent}`
    return `?i=${intent}&e=${encodeURIComponent(body.e)}&t=${encodeURIComponent(body.t)}`
}

async function fetchJoinTicket(code) {
    try {
        const res = await fetch(`${httpBase()}/token?room=${encodeURIComponent(code)}`)
        if (!res.ok) return ticketQuery(null)
        return ticketQuery(await res.json())
    } catch {
        return ticketQuery(null)
    }
}

export async function startRoom() {
    connectionError.set('')
    try {
        const res = await fetch(`${httpBase()}/room/new`)
        if (res.ok) {
            const body = await res.json()
            if (body?.code) {
                connect(body.code, ticketQuery(body))
                return body.code
            }
        }
    } catch { }

    const code = generateRoomCode()
    connect(code)
    return code
}

export function connect(code, ticket = null) {
    if (_close) disconnect()
    code = normalizeRoomCode(code)
    if (code.length < ROOM_CODE_MIN) return
    roomCode.set(code)
    connectionStatus.set('connecting')
    connectionError.set('')
    _lastCloseCode = 0
    void openSocket(code, ticket)
}

async function openSocket(code, presetTicket) {
    const ticket = presetTicket ?? await fetchJoinTicket(code)
    if (roomCode.get() !== code || connectionStatus.get() !== 'connecting') return

    const url = `${WS_BASE}/parties/room/${code}${ticket}`
    const { send, close } = createSocket(url, {
        heartbeat: {
            message: PING_MESSAGE,
            responseMessage: PONG_MESSAGE,
            interval: HEARTBEAT_INTERVAL_MS,
            pongTimeout: HEARTBEAT_PONG_TIMEOUT_MS,
        },
        autoReconnect: {
            retries: (retried) => retried < 5 && _lastCloseCode < 4000,
            delay: 2000,
        },
        onConnected() {
            connectionStatus.set('connected')
            sendHello()
            awaitSnapshot(sendHello)
        },
        onDisconnected(_ws, event) {
            _lastCloseCode = event?.code ?? 0
            connectionStatus.set('disconnected')
            if (CLOSE_MESSAGES[_lastCloseCode]) connectionError.set(CLOSE_MESSAGES[_lastCloseCode])
            batch(() => {
                setSeatsOnline(false)
                adoptRoomSeats()
            })
            resyncSettled()
            awaitingSnapshot = true
        },
        onMessage(_ws, event) { handleMessage(event.data) },
    })
    _send = send
    _close = close
}

export function disconnect() {
    if (_close) { _close(); _close = null; _send = null }
    connectionStatus.set('disconnected')
    resyncSettled()
    awaitingSnapshot = true
    serverSeq.set(0)
    canvas.cardClearGroupSizes()
    batch(() => {
        setSeatsOnline(false)
        adoptRoomSeats()
    })
}

function sendHello() {
    if (!_send) return
    _send(JSON.stringify({
        kind: 'hello',
        clientId: ownClientId.get(),
    }))
}

const MAX_MESSAGE_BYTES = 512 * 1024

function sendAction(op, extras = {}) {
    if (!_send) return
    const msg = JSON.stringify({
        kind: 'action',
        op,
        clientId: ownClientId.get(),
        ...extras,
    })
    if (msg.length > MAX_MESSAGE_BYTES) {
        console.warn(`[multiplayer] dropped oversized ${op} (${msg.length} bytes)`)
        return
    }
    _send(msg)
}

export function startMultiplayer() {
    setSeatTransport(sendAction)
}

const nodeRegistry = new Map()
function registerNode(node) {
    if (!node?.nodeId) return
    nodeRegistry.set(node.nodeId, node)
    node.on('destroyed', () => nodeRegistry.delete(node.nodeId))
}
function getNode(nodeId) { return nodeRegistry.get(nodeId) }

const localNodes = new Map()
function trackLocal(nodeId, type, node, getPayload) {
    if (!nodeId || !node) return
    localNodes.set(nodeId, { type, getPayload })
    node.on('destroyed', () => localNodes.delete(nodeId))
}
function newId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `n-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

let _listenersInit = false
const _listenerStops = []
let _initPollAttempts = 0
const INIT_POLL_INTERVAL_MS = 50
const INIT_POLL_MAX_ATTEMPTS = 100

export function initMultiplayer() {
    if (_listenersInit) return
    // A child component can connect before the table view has created the scene.
    if (!getApp()) {
        if (++_initPollAttempts > INIT_POLL_MAX_ATTEMPTS) return
        setTimeout(initMultiplayer, INIT_POLL_INTERVAL_MS)
        return
    }
    _initPollAttempts = 0

    const currentMoves = () => getSelected()
        .filter(n => n.nodeId)
        .map(n => ({ nodeId: n.nodeId, x: n.x, y: n.y }))

    const DRAG_STREAM_MS = 200
    let dragStreamLast = 0

    _listenerStops.push(onDrag((phase) => {
        if (phase === 'move') {
            const now = performance.now()
            if (now - dragStreamLast < DRAG_STREAM_MS) return
            dragStreamLast = now
        }
        const moves = currentMoves()
        if (moves.length) sendAction('nodes:move', { moves })
    }))

    let transformEndQueued = false
    _listenerStops.push(onTransformEnd(() => {
        if (transformEndQueued) return
        transformEndQueued = true
        queueMicrotask(() => {
            transformEndQueued = false
            const nodes = getSelected()
            const transforms = nodes.filter(n => n.nodeId).map(n => ({
                nodeId: n.nodeId,
                x: n.x, y: n.y,
                scaleX: n.scale.x, scaleY: n.scale.y,
                rotation: canvas.getWorldRotation(n),
            }))
            if (transforms.length) sendAction('nodes:transform', { transforms })
        })
    }))

    _listenerStops.push(onCanvasAction((action) => {
        if (action.op === 'card:merge') {
            sendAction('card:merge', {
                movingIds: action.movingIds,
                targetId: action.targetId,
                groupId: action.groupId,
            })
            return
        }

        if (action.op === 'rect:create' || action.op === 'arrow:create' || action.op === 'text:create') {
            const type = action.op.split(':')[0]
            const nodeId = newId()
            const node = action.node
            node.nodeId = nodeId
            registerNode(node)
            const baseParams = { ...action.params, nodeId }
            const liveParams = {
                rect:  () => ({ width: node.props.width, height: node.props.height, fill: node.props.fill }),
                arrow: () => ({ points: node.props.points, stroke: node.props.stroke }),
                text:  () => ({ text: node.props.text, fill: node.props.fill }),
            }[type]
            trackLocal(nodeId, type, node, () => ({
                ...baseParams,
                x: node.x, y: node.y,
                rotation: canvas.getWorldRotation(node),
                ...liveParams(),
            }))
            sendAction('node:create', { nodeId, type, payload: baseParams })
            return
        }

        if (action.op === 'node:patch') {
            if (!action.nodeId) return
            sendAction('nodes:patch', {
                patches: [{ nodeId: action.nodeId, props: action.props ?? {} }],
            })
            return
        }

        if (action.op === 'text:edit') {
            sendAction('nodes:patch', {
                patches: [{ nodeId: action.nodeId, props: action.props ?? {} }],
            })
            return
        }

        if (action.op === 'node:destroy') {
            sendAction('nodes:destroy', { nodeIds: [action.nodeId] })
            return
        }

        if (action.op === 'nodes:destroy') {
            sendAction('nodes:destroy', { nodeIds: action.nodeIds })
            return
        }

        if (action.op === 'clones:create') {
            for (const node of action.clones ?? []) {
                if (node.kind !== 'card' || !node.cardData || !node.cardConfig) continue
                const nodeId = newId()
                node.nodeId = nodeId
                registerNode(node)
                const buildPayload = () => ({
                    card: node.cardData, config: slimCardConfig(node.cardConfig),
                    x: node.x, y: node.y,
                    options: {
                        faceDown: node.props.faceDown, sleeveColor: node.props.sleeveColor,
                        groupId: node.groupId, rotation: canvas.getWorldRotation(node), nodeId,
                    },
                })
                trackLocal(nodeId, 'card', node, buildPayload)
                sendAction('node:create', { nodeId, type: 'card', payload: buildPayload() })
            }
            return
        }
    }))

    _listenersInit = true
}

export function detachMultiplayer() {
    for (const stop of _listenerStops.splice(0)) stop()
    _listenersInit = false
    _initPollAttempts = 0
}

function slimCardConfig(config) {
    if (!config || typeof config !== 'object') return config
    const { name, size } = config
    return { name, size }
}

// Cards
export function addCard(card, config, x, y, options = {}) {
    const nodeId = options.nodeId ?? newId()
    const sleeveColor = options.sleeveColor ?? `hsl(${ownSeatSleeve.get()})`
    const effectiveOptions = { ...options, nodeId, sleeveColor }

    const node = canvas.addCard(card, config, x, y, effectiveOptions)
    const wireConfig = slimCardConfig(config)
    if (!node) return node

    const buildPayload = () => ({
        card: node.cardData ?? card, config: wireConfig,
        x: node.x, y: node.y,
        options: {
            ...effectiveOptions,
            rotation: canvas.getWorldRotation(node),
            faceDown: node.props.faceDown,
            sleeveColor: node.props.sleeveColor,
            groupId: node.groupId,
            nodeId,
        },
    })

    registerNode(node)
    trackLocal(nodeId, 'card', node, buildPayload)
    sendAction('node:create', { nodeId, type: 'card', payload: buildPayload() })
    markSeatPlaced(mySeatId.get())
    return node
}

export function addDeck(deck_dict, config, x = null, y = null) {
    if (isOpeningDeal()) deck_dict = shuffleMain(deck_dict)

    const pileCount = Object.keys(deck_dict).length
    const cardCount = Object.values(deck_dict).reduce(
        (sum, cards) => sum + cards.reduce((s, e) => s + (e.quantity || 1), 0),
        0,
    )
    const nodeIds = Array.from({ length: cardCount }, newId)
    const pileGroupIds = Array.from({ length: pileCount }, () => `g-${newId()}`)
    const sleeveColor = `hsl(${ownSeatSleeve.get()})`

    if (x == null || y == null) {
        const center = canvas.getViewportCenter()
        x = center.x
        y = center.y
    }

    const zones = openingZones()

    canvas.addDeck(deck_dict, config, x, y, {
        nodeIds, pileGroupIds, sleeveColor,
        revealed: spawnsFaceUp,
        zones,
    })
    markSeatPlaced(mySeatId.get())

    const wireConfig = slimCardConfig(config)
    const nodeSpecs = []
    for (const id of nodeIds) {
        const node = findNodeById(id)
        if (!node) continue
        registerNode(node)
        const buildPayload = () => ({
            card: node.cardData, config: wireConfig, x: node.x, y: node.y,
            options: {
                faceDown: node.props.faceDown, sleeveColor: node.props.sleeveColor,
                groupId: node.groupId, rotation: canvas.getWorldRotation(node), nodeId: id,
            },
        })
        trackLocal(id, 'card', node, buildPayload)
        nodeSpecs.push({ nodeId: id, type: 'card', payload: buildPayload() })
    }
    sendAction('deck:create', {
        deckArgs: { deck_dict, config: wireConfig, x, y, nodeIds, pileGroupIds, sleeveColor, zones },
        nodes: nodeSpecs,
    })
}

// Accessories
function makeSimpleAdder(type, addFn) {
    return function(item, x, y, options = {}) {
        const nodeId = options.nodeId ?? newId()
        const baseOptions = { ...options, nodeId }
        const node = addFn(item, x, y, baseOptions)
        if (!node) return node

        const buildPayload = () => ({
            item, x: node.x, y: node.y,
            options: {
                ...baseOptions,
                rotation: canvas.getWorldRotation(node),
                ...(type === 'dice'    ? { value: node.props.value, variant: node.diceVariant }    : {}),
                ...(type === 'counter' ? { value: node.props.value, variant: node.counterVariant } : {}),
            },
        })

        registerNode(node)
        trackLocal(nodeId, type, node, buildPayload)
        sendAction('node:create', { nodeId, type, payload: buildPayload() })
        return node
    }
}

export const addBoard   = makeSimpleAdder('board',   canvas.addBoard)
export const addMarker  = makeSimpleAdder('marker',  canvas.addMarker)
export const addDice    = makeSimpleAdder('dice',    canvas.addDice)
export const addCounter = makeSimpleAdder('counter', canvas.addCounter)

export function clearTableNodes() {
    const nodeIds = [...nodeRegistry.keys()]

    canvas.clearAllElements()
    nodeRegistry.clear()
    localNodes.clear()
    canvas.cardClearGroupSizes()

    if (nodeIds.length) sendAction('nodes:destroy', { nodeIds })
}

let _applyTableReset = null

export function setTableResetHandler(fn) {
    _applyTableReset = fn
}

export function broadcastTableReset() {
    sendAction('table:reset')
}

export function selectionDelete() {
    const nodeIds = getSelected().map(n => n.nodeId).filter(Boolean)
    canvas.selectionDelete()
    if (nodeIds.length) sendAction('nodes:destroy', { nodeIds })
}

export function moveZ(direction) {
    const nodeIds = getSelected().map(n => n.nodeId).filter(Boolean)
    canvas.moveZ(direction)
    if (nodeIds.length) sendAction('nodes:moveZ', { nodeIds, direction })
}

export function selectionAlign(edge) {
    const moved = canvas.alignSelection(edge)
    const moves = moved
        .filter(n => n.nodeId)
        .map(n => ({ nodeId: n.nodeId, x: n.x, y: n.y }))
    if (moves.length) sendAction('nodes:move', { moves })
}

// Card patch verbs
function patchesFromSelection(propsForNode) {
    const cards = getSelected().filter(n => n.kind === 'card' && n.nodeId)
    return cards.map(c => ({ nodeId: c.nodeId, props: propsForNode(c) }))
}

export function cardFlip() {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length === 0) return
    const target = canvas.cardFlip()
    if (target == null) return
    const patches = cards.filter(c => c.nodeId).map(c => ({ nodeId: c.nodeId, props: { faceDown: target } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function cardChangeSleeveColor(color) {
    canvas.cardChangeSleeveColor(color)
    const patches = patchesFromSelection(() => ({ sleeveColor: color }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function cardRotate(direction) {
    canvas.cardRotate(direction)
    const patches = patchesFromSelection(c => ({ rotation: canvas.getWorldRotation(c) }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function cardSetFaceDown(groupId, target, faceDown) {
    canvas.cardSetFaceDown(groupId, target, faceDown)
    const ids = target == null
        ? canvas.cardGetGroupCards(groupId).map(c => c.nodeId)
        : (Array.isArray(target) ? target : [target])
    const patches = ids
        .filter(id => typeof id === 'string')
        .map(id => ({ nodeId: id, props: { faceDown } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

// Card group-level verbs
export function cardMakeGroup() {
    const cards = getSelected().filter(n => n.kind === 'card')
    if (cards.length < 2) return

    const hasGroup = cards.some(c => c.groupId)
    const allTracked = cards.every(c => c.nodeId)
    if (!hasGroup && connectionStatus.get() === 'connected' && allTracked) {
        sendAction('card:makeGroup', { nodeIds: cards.map(c => c.nodeId) })
    } else {
        canvas.cardMakeGroup()
    }
}

export function cardUngroup() {
    const groupId = canvas.cardGetSelectedGroupId()
    if (!groupId) return

    const cards = canvas.cardUngroup(groupId)
    const tracked = cards.filter(c => c.nodeId)
    if (tracked.length === 0) return

    sendAction('nodes:patch', { patches: tracked.map(c => ({ nodeId: c.nodeId, props: { groupId: null } })) })
    sendAction('nodes:move', { moves: tracked.map(c => ({ nodeId: c.nodeId, x: c.x, y: c.y })) })
}

export function cardEmptyHand(groupId) {
    if (typeof groupId !== 'string') groupId = canvas.cardGetSelectedGroupId()
    if (!groupId) return

    const entries = [...hand.get()]
    if (entries.length === 0) return

    const placed = []
    for (const entry of entries) {
        const spec = canvas.cardGetGroupDropSpec(groupId, entry)
        if (!spec?.config) break
        const { handEntryId, faceDown: _staged, ...cardData } = entry
        const node = addCard(cardData, spec.config, spec.x, spec.y, {
            faceDown: spec.faceDown,
            resolveOverlap: false,
        })
        if (node) placed.push({ node, handEntryId })
    }
    if (placed.length === 0) return

    canvas.cardMergeIntoGroupTop(placed.map(p => p.node), groupId)

    batch(() => {
        for (const { handEntryId } of placed) removeFromHand(handEntryId)
    })
}

export function cardShuffle(groupId) {
    if (typeof groupId !== 'string') groupId = canvas.cardGetSelectedGroupId()
    if (!groupId) return
    if (connectionStatus.get() === 'connected') {
        sendAction('card:shuffle', { groupId })
    } else {
        canvas.cardShuffle(groupId)
    }
}

export function cardSetGroupOrder(groupId, orderedIds) {
    canvas.cardSetGroupOrder(groupId, orderedIds)
    sendAction('card:setGroupOrder', { groupId, orderedIds })
}

export function cardDraw(args) {
    canvas.cardDraw(args)
    sendAction('card:draw', { args })
}

export function cardSendToHand() {
    const cards = getSelected().filter(n => n.kind === 'card' && n.nodeId)
    const nodeIds = cards.map(c => c.nodeId)
    canvas.cardSendToHand()
    if (nodeIds.length) sendAction('nodes:destroy', { nodeIds })
}

// Dice
export function diceRoll() {
    const dice = getSelected().filter(n => n.kind === 'dice')
    if (dice.length === 0) return
    const allTracked = dice.every(d => d.nodeId)
    if (connectionStatus.get() === 'connected' && allTracked) {
        sendAction('dice:roll', { nodeIds: dice.map(d => d.nodeId) })
    } else {
        canvas.diceRoll()
    }
}

export function diceIncrement() {
    canvas.diceIncrement()
    const dice = getSelected().filter(n => n.kind === 'dice' && n.nodeId)
    const patches = dice.map(d => ({ nodeId: d.nodeId, props: { value: d.props.value } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function diceDecrement() {
    canvas.diceDecrement()
    const dice = getSelected().filter(n => n.kind === 'dice' && n.nodeId)
    const patches = dice.map(d => ({ nodeId: d.nodeId, props: { value: d.props.value } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function counterIncrement() {
    canvas.counterIncrement()
    const counters = getSelected().filter(n => n.kind === 'counter' && n.nodeId)
    const patches = counters.map(c => ({ nodeId: c.nodeId, props: { value: c.props.value } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function counterDecrement() {
    canvas.counterDecrement()
    const counters = getSelected().filter(n => n.kind === 'counter' && n.nodeId)
    const patches = counters.map(c => ({ nodeId: c.nodeId, props: { value: c.props.value } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function counterChangeVariant(variant) {
    canvas.counterChangeVariant(variant)
    const counters = getSelected().filter(n => n.kind === 'counter' && n.nodeId)
    const patches = counters.map(c => ({ nodeId: c.nodeId, props: { variant } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function diceChangeVariant(variant) {
    canvas.diceChangeVariant(variant)
    const dice = getSelected().filter(n => n.kind === 'dice' && n.nodeId)
    const patches = dice.map(d => ({ nodeId: d.nodeId, props: { variant } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function dropFromHand(handEntry, config, x, y) {
    if (!handEntry?.handEntryId) return
    const { handEntryId, faceDown = false, ...cardData } = handEntry
    const node = addCard(cardData, config, x, y, { faceDown, resolveOverlap: false, mergeIfOverlap: true, held: true })
    removeFromHand(handEntryId)

    if (node && !node.groupId) {
        setSelection([node])
        broadcastSelectionUI(true)
    }
}

export function rectChangeColor(color) {
    canvas.rectChangeColor(color)
    const patches = getSelected()
        .filter(n => n.kind === 'shape' && n.nodeId)
        .map(n => ({ nodeId: n.nodeId, props: { fill: `hsl(${color})` } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function arrowChangeColor(color) {
    canvas.arrowChangeColor(color)
    const patches = getSelected()
        .filter(n => n.kind === 'arrow' && n.nodeId)
        .map(n => ({ nodeId: n.nodeId, props: { stroke: `hsl(${color})` } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function textChangeColor(color) {
    canvas.textChangeColor(color)
    const patches = getSelected()
        .filter(n => n.kind === 'text' && n.nodeId)
        .map(n => ({ nodeId: n.nodeId, props: { fill: `hsl(${color})` } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

export function commitTextEdit(newText) {
    canvas.commitTextEdit(newText)
}

export const cardGetSelectedGroupId = canvas.cardGetSelectedGroupId
export const cardGetGroupCards = canvas.cardGetGroupCards

function handleMessage(data) {
    let msg; try { msg = JSON.parse(data) } catch { return }
    if (msg.kind === 'snapshot') {
        applySnapshot(msg)
    } else if (msg.kind === 'seq') {
        if (typeof msg.seq === 'number') acceptSeq(msg.seq)
    } else if (msg.kind === 'dropped') {
        droppedCount.update(n => n + 1)
        requestResync()
    } else if (msg.kind === 'event') {
        withRemoteApply(() => applyEvent(msg))
        pruneSelection()
    }
}

const RELAYOUT_SETTLE_MS = 1200
const pendingRelayout = new Set()
let relayoutTimer = null
function scheduleGroupRelayout(groupIds) {
    if (groupIds.size === 0) return
    for (const id of groupIds) pendingRelayout.add(id)
    clearTimeout(relayoutTimer)
    relayoutTimer = setTimeout(() => {
        relayoutTimer = null
        const ids = [...pendingRelayout]
        pendingRelayout.clear()
        canvas.cardRelayoutGroups(ids)
    }, RELAYOUT_SETTLE_MS)
}

function tweenToPosition(node, x, y) {
    node._remoteTween?.stop?.()
    const from = { x: node.x, y: node.y }
    node._remoteTween = animate(0, 1, {
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
        onUpdate(t) {
            if (!node.parent) return node._remoteTween?.stop?.()
            node.position.set(from.x + (x - from.x) * t, from.y + (y - from.y) * t)
        },
        onComplete() {
            node._remoteTween = null
            if (node.parent) node.position.set(x, y)
        },
    })
}

function applySnapshot(msg) {
    serverSeq.set(msg.seq ?? 0)
    resyncSettled()

    const incomingIds  = Object.keys(msg.nodes ?? {})
    const virginRoom   = (msg.seq ?? 0) === 0 && incomingIds.length === 0
    const haveLocal    = localNodes.size > 0

    seatSnapshot(msg)

    if (virginRoom && haveLocal) {
        seedRoomFromLocal()
        return
    }

    canvas.clearAllElements()
    nodeRegistry.clear()
    localNodes.clear()
    canvas.cardClearGroupSizes()
    incomingIds.sort((a, b) => (msg.nodes[a].ord ?? 0) - (msg.nodes[b].ord ?? 0))
    for (const nodeId of incomingIds) {
        const entry = msg.nodes[nodeId]
        replayCreate(entry.type, nodeId, entry.payload)
    }
    for (const groupId of new Set(incomingIds.map(id => msg.nodes[id]?.payload?.options?.groupId))) {
        canvas.cardAdoptLocalGroupSize(groupId)
    }
    canvas.cardRefreshAllGroups()
}

function seatSnapshot(msg) {
    batch(() => {
        setSeatsOnline(true)
        applySeatSnapshot(msg)
    })

    const roomSeatCount = Object.keys(msg.seats ?? {}).length

    if (roomSeatCount === 0) {
        for (const seat of seatsToSeed()) sendAction('seat:create', { seat })
        sendAction('seat:claim', { seatId: localSeatIdForSeeding() })
        return
    }

    if (!msg.yourSeatId) {
        const seatId = addSeat({ name: 'Player' })
        if (seatId) sendAction('seat:claim', { seatId })
    }
}

const SEED_CHUNK_NODES = 100
const SEED_CHUNK_BYTES = 256 * 1024

function seedRoomFromLocal() {
    let chunk = []
    let bytes = 0
    const flush = () => {
        if (chunk.length === 0) return
        sendAction('nodes:seed', { nodes: chunk })
        chunk = []
        bytes = 0
    }
    for (const [nodeId, entry] of localNodes) {
        let spec
        try { spec = { nodeId, type: entry.type, payload: entry.getPayload() } } catch { continue }
        const size = JSON.stringify(spec).length
        if (chunk.length && (chunk.length >= SEED_CHUNK_NODES || bytes + size > SEED_CHUNK_BYTES)) flush()
        chunk.push(spec)
        bytes += size
    }
    flush()
}

const SEAT_OPS = new Set([
    'seat:create', 'seat:destroy', 'seat:update', 'seat:control', 'seat:hand',
])

function applyEvent(event) {
    if (typeof event.seq === 'number' && !acceptSeq(event.seq)) return
    const isOwn = event.byClientId && event.byClientId === ownClientId.get()

    if (event.op === 'table:reset') {
        _applyTableReset?.()
        return
    }

    if (SEAT_OPS.has(event.op)) {
        applySeatEvent({ ...event, yourClientId: ownClientId.get() })
        return
    }

    if (event.groupSizes) canvas.cardSetGroupSizes(event.groupSizes)

    switch (event.op) {
        case 'node:create': {
            if (getNode(event.nodeId)) return
            replayCreate(event.type, event.nodeId, event.payload)
            break
        }

        case 'nodes:seed': {
            for (const spec of event.nodes ?? []) {
                if (getNode(spec.nodeId)) continue
                replayCreate(spec.type, spec.nodeId, spec.payload)
            }
            canvas.cardRefreshAllGroups()
            break
        }

        case 'deck:create': {
            const allExist = (event.nodeIds ?? []).every(id => getNode(id))
            if (allExist) return

            if (Array.isArray(event.nodes) && event.nodes.length) {
                for (const spec of event.nodes) {
                    if (getNode(spec.nodeId)) continue
                    replayCreate(spec.type, spec.nodeId, spec.payload)
                }
                canvas.cardRefreshAllGroups()
                break
            }

            const { deck_dict, config, x, y, nodeIds, pileGroupIds, sleeveColor, zones } = event.deckArgs ?? {}
            if (!deck_dict) return
            canvas.addDeck(deck_dict, config, x, y, {
                nodeIds, pileGroupIds, sleeveColor, zones,
                revealed: spawnsFaceUp,
            })

            for (const id of nodeIds) {
                const found = findNodeById(id)
                if (found) registerNode(found)
            }
            break
        }

        case 'nodes:move': {
            if (isOwn) return
            const moves = event.moves ?? []
            const projected = canvas.cardProjectGroupMoves(moves)
            const movedGroups = new Set()
            for (const move of moves) {
                const node = getNode(move.nodeId)
                if (!node || node.isDragging()) continue
                const to = projected.get(move.nodeId) ?? move
                tweenToPosition(node, to.x, to.y)
                if (node.groupId) movedGroups.add(node.groupId)
            }
            scheduleGroupRelayout(movedGroups)
            break
        }

        case 'nodes:transform': {
            if (isOwn) return
            for (const t of event.transforms ?? []) {
                const node = getNode(t.nodeId)
                if (!node) continue
                node.position.set(t.x, t.y)
                if (node.kind === 'card') node.scale.set(1, 1)
                else node.scale.set(t.scaleX, t.scaleY)
                canvas.setWorldRotation(node, t.rotation)
            }
            break
        }

        case 'nodes:patch': {
            for (const p of event.patches ?? []) {
                const node = getNode(p.nodeId)
                if (!node) continue
                if      (node.kind === 'card')   canvas.cardApplyPatch(node, p.props)
                else if (node.kind === 'board')  canvas.boardApplyPatch(node, p.props)
                else if (node.kind === 'marker') canvas.markerApplyPatch(node, p.props)
                else if (node.kind === 'dice')   canvas.diceApplyPatch(node, p.props)
                else if (node.kind === 'counter') canvas.counterApplyPatch(node, p.props)
                else if (node.kind === 'shape')  canvas.rectApplyPatch(node, p.props)
                else if (node.kind === 'arrow')  canvas.arrowApplyPatch(node, p.props)
                else if (node.kind === 'text')   canvas.textApplyPatch(node, p.props)
            }
            break
        }

        case 'nodes:destroy': {
            for (const id of event.nodeIds ?? []) {
                const node = getNode(id)
                if (node) node.destroy()
            }
            break
        }

        case 'nodes:moveZ': {
            if (isOwn) return
            const nodes = (event.nodeIds ?? []).map(id => getNode(id)).filter(Boolean)
            if (nodes.length) canvas.applyMoveZ(nodes, event.direction)
            break
        }

        case 'card:merge': {
            if (isOwn) return
            canvas.cardApplyMerge(event.movingIds, event.targetId, event.groupId)
            break
        }

        case 'card:shuffle': {
            canvas.cardApplyShuffle(event.groupId, event.orderedIds)
            break
        }

        case 'card:setGroupOrder': {
            if (isOwn) return
            canvas.cardSetGroupOrder(event.groupId, event.orderedIds)
            break
        }

        case 'card:makeGroup': {
            for (const id of event.nodeIds) {
                const node = getNode(id)
                if (node) canvas.cardApplyPatch(node, { groupId: event.groupId })
            }
            canvas.cardRefreshAllGroups()
            break
        }

        case 'card:draw': {
            if (isOwn) return
            const args = { ...event.args, skipHandPush: event.args?.to === 'hand' }
            canvas.cardDraw(args)
            break
        }

        case 'dice:roll': {
            for (const r of event.rolls ?? []) {
                const node = getNode(r.nodeId)
                if (node) canvas.diceApplyRoll(node, r.value)
            }
            break
        }
    }
}

const REPLAY_PLACEMENT = { resolveOverlap: false, mergeIfOverlap: false }

function replayCreate(type, nodeId, payload) {
    if (type === 'card') {
        const { card, config, x, y, options } = payload
        const node = canvas.addCard(card, config, x, y, { ...options, ...REPLAY_PLACEMENT, nodeId })
        if (node) registerNode(node)
    } else if (type === 'board') {
        const { item, x, y, options } = payload
        const node = canvas.addBoard(item, x, y, { ...options, nodeId, ...REPLAY_PLACEMENT })
        if (node) registerNode(node)
    } else if (type === 'marker') {
        const { item, x, y, options } = payload
        const node = canvas.addMarker(item, x, y, { ...options, nodeId, ...REPLAY_PLACEMENT })
        if (node) registerNode(node)
    } else if (type === 'dice') {
        const { item, x, y, options } = payload
        const node = canvas.addDice(item, x, y, { ...options, nodeId, ...REPLAY_PLACEMENT })
        if (node) registerNode(node)
    } else if (type === 'counter') {
        const { item, x, y, options } = payload
        const node = canvas.addCounter(item, x, y, { ...options, nodeId, ...REPLAY_PLACEMENT })
        if (node) registerNode(node)
    } else if (type === 'rect') {
        const node = canvas.addRect({ ...payload, ...(payload.options ?? {}) }, { nodeId })
        if (node) registerNode(node)
    } else if (type === 'arrow') {
        const node = canvas.addArrow({ ...payload, ...(payload.options ?? {}) }, { nodeId })
        if (node) registerNode(node)
    } else if (type === 'text') {
        const node = canvas.addText({ ...payload, ...(payload.options ?? {}) }, { nodeId })
        if (node) registerNode(node)
    }
}
