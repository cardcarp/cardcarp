// Multiplayer wrapper module. Public API mirrors canvas/index.js but every mutation routes
// through the WebSocket so peers see it. Inbound events call the *raw* canvas APIs and
// suppress the echo via byClientId checks.
//
// Verb coverage:
//   node:create / deck:create / nodes:move / nodes:transform / nodes:patch / nodes:destroy
//   nodes:moveZ / card:merge / card:shuffle / card:setGroupOrder / card:makeGroup / card:draw
//   dice:roll (server picks values)
//   seat:create / seat:claim / seat:control / seat:update / seat:destroy / seat:hand
//   table:reset (an instruction, not state — see the Table reset section)
//
// Identity — two layers, and the split matters (see seats.js):
//   ownClientId   — this browser. Persistent in localStorage, never shown, used only to
//                   arbitrate who is driving which seat.
//   seats         — the table positions themselves. A client sits in one at a time and can
//                   get up and sit somewhere else; seats outlive the clients in them, which
//                   is what an unclaimed goldfish seat *is*.
//
// Hands — this changed when seats arrived, and the change is real:
//   A hand used to be a local-only asset; the server saw a per-player integer and nothing
//   else. Hands are now ordinary replicated room state, held by every client exactly like
//   canvas nodes. Two requirements forced it, and nothing narrower satisfies both: a hand
//   has to follow its seat to whoever takes it over, and a client going offline has to
//   leave holding the entire table — every seat's cards included — or the game it keeps
//   isn't playable.
//
//   Write authority is still per-seat: only the client sitting in a seat may change that
//   seat's hand, enforced by the relay. What's gone is read secrecy, and it was never
//   really there — node:create broadcasts a face-down card's full record, so any client
//   could always read the hidden side of the board. Hidden information in this app is a
//   rendering convention; hands now match the rest of the table instead of pretending
//   otherwise. The about dialog's privacy copy says so.
//
//   Only our own seat's hand is rendered (see hand.vue). The rest sit in the store.

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

// The relay origin, handed in by whatever hosts the table (setRelayUrl below). cardcarp's own builds
// take it from VITE_MULTIPLAYER_WS_URL — a Workers Builds variable, which index.vue reads, since
// Vite inlines import.meta.env at build time and never reads it at runtime.
//
// Everything below appends its own path to this value: `/room/new`, `/token`, and
// `/parties/room/<code>`. So it has to be a bare origin. Pasting the URL of an endpoint —
// `…workers.dev/room/new`, the obvious thing to copy out of a browser or a curl command —
// silently yields `…/room/new/parties/room/ABCDEFG`, which matches no route on the relay.
// The failure mode is a dead multiplayer tab with nothing in the console pointing at the
// cause, so normalise the value instead of trusting it: strip any path, query, hash and
// trailing slash, and accept http(s) in place of ws(s) rather than rejecting it.
function normalizeWsBase(raw) {
    const FALLBACK = 'ws://localhost:8787'
    if (typeof raw !== 'string' || !raw.trim()) return FALLBACK
    try {
        const url = new URL(raw.trim())
        if (url.protocol === 'https:') url.protocol = 'wss:'
        else if (url.protocol === 'http:') url.protocol = 'ws:'
        if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return FALLBACK
        // Built from parts rather than url.origin: keeps the intent explicit, and drops
        // everything after the authority in one step.
        return `${url.protocol}//${url.host}`
    } catch {
        return FALLBACK // not a parseable URL at all
    }
}

// Until a host says otherwise, the local relay that `npm run dev:relay` serves.
let WS_BASE = normalizeWsBase(null)

export function setRelayUrl(raw) {
    WS_BASE = normalizeWsBase(raw)
}

// === Identity ===
// This browser, not this player — the player is a seat (seats.js). Persistent in
// localStorage. Override per tab with ?clientId=… so two tabs of one profile can hold two
// different seats; without it they share the storage key, and the relay treats one client
// holding two sockets as one client, so both tabs would fight over the same seat.
function urlOverride(key) {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get(key)
}

// `playerId` is still honoured — it is what every existing testing bookmark and note uses.
const _idOverride = urlOverride('clientId') ?? urlOverride('playerId')

// Stored as useStorage stored it — a bare string — so a returning browser keeps its identity, and
// with it any seat the relay would reattach it to.
export const ownClientId = _idOverride ? store(_idOverride) : persist(store(newId()), 'cardcarp:playerId')

// === Connection state ===
// Stores (see state/store.js): the panel reads them through the UI's binding, and the table's own
// modules with get().
export const connectionStatus = store('disconnected')
export const roomCode = store('')

// Room codes deliberately never appear in the URL — they are shared by reading out or
// pasting the code itself, so they stay out of browser history, screenshots and link
// previews. Nothing persists them client-side either, so a reload leaves the room behind:
// the table lives on server-side until the idle sweep, but getting back in means having
// the code to hand.

// Why the last attempt ended, when the relay turned us away deliberately. Without this a
// refused join just reads as "nothing happened" — most importantly for 4004, which is the
// expected answer to a code that was never a real room.
export const connectionError = store('')
const CLOSE_MESSAGES = {
    4001: 'That table is full.',
    4002: 'Too many attempts — wait a moment and try again.',
    4003: 'That table closed after sitting idle.',
    4004: "That room code isn't active. Ask the host for a new one.",
}

// === Heartbeat ===
// Must match the pair the relay registers with setWebSocketAutoResponse
// (relay-server/src/room.js) verbatim — the runtime compares the message exactly, and a
// mismatch means every ping wakes the Durable Object instead of being answered for free.
const PING_MESSAGE = 'ping'
const PONG_MESSAGE = 'pong'
// Under the ~60s idle timeout common to home NATs and corporate proxies, which is the thing
// that quietly kills a table nobody has touched for a minute.
const HEARTBEAT_INTERVAL_MS = 25000
// Generous on purpose. A hidden tab has its timers clamped to roughly one tick a minute, so
// the interval and this timeout stretch together; being slow to notice a dead socket in a
// tab nobody is looking at costs nothing, and a false close would cost a reconnect.
const HEARTBEAT_PONG_TIMEOUT_MS = 10000

export const serverSeq = store(0)

// === Sequence tracking ===
// Every canvas event the relay sends carries a monotonic `seq`. WebSocket delivery is
// ordered, so a number that skips means we missed an event — and missing one is not
// self-correcting here: every handler in applyEvent ignores events about nodes it doesn't
// hold, so a single missed node:create quietly diverges this client for the rest of the
// game. That is the failure mode that made long sessions drift apart. So: notice the gap,
// stop applying canvas events, and ask for a fresh snapshot.
//
// Two counters, because the two causes point at different fixes. `resyncCount` is every
// time we had to rebuild from a snapshot to stay honest; `droppedCount` is how many of
// those were the relay refusing one of OUR messages (rate limit or oversize) rather than
// us missing one of someone else's. Zero is the expected value for both. Nothing depends
// on them; they exist to be read during a real game.
export const resyncCount = store(0)
export const droppedCount = store(0)

// Set whenever we cannot prove we are in step with the sequence: a socket has just opened,
// or a gap was seen. Canvas events are ignored while it is set, because they describe a
// table we have no claim to be tracking. Cleared by the snapshot that re-establishes us.
let awaitingSnapshot = true
let resyncTimer = null
const RESYNC_RETRY_MS = 5000

// Enter the waiting state, re-asking with `ask` until a snapshot lands. The request is an
// ordinary message and takes an ordinary token from the relay's rate limiter, so it can be
// dropped like any other — and a dropped request with nothing behind it would park this
// client out of step for the rest of the game, which is precisely the bug being fixed.
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

// A gap. Ask immediately, then fall back to the retry cadence.
function requestResync() {
    if (awaitingSnapshot) return // already waiting on one
    resyncCount.update(n => n + 1)
    const ask = () => _send?.(JSON.stringify({ kind: 'resync' }))
    ask()
    awaitSnapshot(ask)
}

// Stop waiting — a snapshot arrived, or the transport went away.
function resyncSettled() {
    clearTimeout(resyncTimer)
    resyncTimer = null
    awaitingSnapshot = false
}

// Advance our position in the sequence. Returns false if the caller should ignore this
// message — either because we are mid-resync, or because this is the gap that starts one.
function acceptSeq(seq) {
    if (awaitingSnapshot) return false
    if (seq !== serverSeq.get() + 1) {
        requestResync()
        return false
    }
    serverSeq.set(seq)
    return true
}

// === Room codes ===
// A room code is a bearer capability: anyone holding it is in the game. That makes its
// entropy the only thing standing between a stranger and your table, so the rules live
// here rather than in the UI, and every entry point runs through them.
//
// MIN exists because the relay creates a room on first connect — there is no "join an
// existing room" concept. A hand-typed `test` therefore mints a permanently public room
// that the next person to type `test` walks into. Enforced again in the Worker
// (relay-server/src/index.js ROOM_PATH), which is the boundary that actually matters.
export const ROOM_CODE_MIN = 7
export const ROOM_CODE_MAX = 32

// Generated codes are uppercase and the relay keys rooms case-sensitively, so without
// normalising here, typing `abcdefg` for `ABCDEFG` silently opens a *different*, empty
// room — it connects fine and just looks like everyone vanished.
//
// Letters and digits only. Anything else — spaces, and above all the dash people will type
// out of habit from the old `ABC-DEF` format — is dropped rather than treated as part of the
// code, so `ABC-DEFG` and `abc defg` both resolve to the room the player meant. The relay
// applies the same rule to its own route (see ROOM_PATH in relay-server/src/index.js).
export function normalizeRoomCode(input) {
    return String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_MAX)
}

export function isValidRoomCode(input) {
    return normalizeRoomCode(input).length >= ROOM_CODE_MIN
}

// 32 symbols × 7 picks ≈ 34.4 billion codes (35 bits). Alphabet omits I/O/0/1 so a code
// survives being read aloud or copied off a screen.
//
// No separator: the dash in the old `ABC-DEF` was pure decoration, and on a tablet it means
// leaving the letter keyboard to reach a symbol just to type a 7-character code. Dropping it
// buys a seventh random character for free — same length to type, 32× the keyspace.
//
// The separator is not merely unused, it is actively stripped on input (below) — so a dash
// typed from muscle memory lands in the right room instead of a nonexistent one.
//
// crypto.getRandomValues rather than Math.random: V8's PRNG is seeded per context and its
// internal state is recoverable from a handful of outputs, which is not a property you
// want in the thing gating access to a room. 256 % 32 === 0, so reducing a byte with % 32
// is uniform — no modulo bias.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 7
export function generateRoomCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
    let s = ''
    for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length]
    return s
}

// === Connection ===
let _send = null
let _close = null

let _lastCloseCode = 0

// The relay gates connections behind a short-lived HMAC ticket carrying an intent — see
// relay-server/src/index.js. `create` comes only from /room/new and is what permits a room
// to exist; `join` reaches an already-created room and nothing else. Best-effort by
// design: a relay with no secret answers `enforced: false`, and a mint that fails for any
// reason still lets the connection proceed. The server is the authority on what's
// required, and failing closed here would strand players against an older relay.
const httpBase = () => WS_BASE.replace(/^ws/, 'http')

// The intent always rides along, signature or not — the relay's creation gate reads it
// regardless of whether a secret makes it unforgeable.
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

// Asks the relay to mint a room. The relay picks the code itself, which is the whole
// point: a room cannot be brought into existence at a code we chose. Returns the code, or
// null if we couldn't start one.
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
    } catch { /* fall through to the local fallback */ }

    // Relay predates /room/new — generate locally so the game still works. Such a relay
    // has no creation gate to satisfy either, so nothing is being bypassed.
    const code = generateRoomCode()
    connect(code)
    return code
}

export function connect(code, ticket = null) {
    if (_close) disconnect()
    // Single choke point: Start, Join and Rejoin all land here, so normalising and
    // validating once covers every path. A code the Worker would reject is dropped rather
    // than sent — otherwise it burns 5 reconnect attempts discovering that.
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
    // The mint is a network round-trip, so the player may have hit Go Offline or switched
    // rooms while it was in flight. Opening the socket now would leave a connection nobody
    // asked for, holding one of the room's 8 slots.
    if (roomCode.get() !== code || connectionStatus.get() !== 'connecting') return

    // PartyServer route shape: /parties/<lowercased-class-name>/<roomId>
    const url = `${WS_BASE}/parties/room/${code}${ticket}`
    // Heartbeat. Browsers cannot send protocol-level ping frames from JS, so without an
    // app-level one nothing in the path ever proves this socket is alive — and a NAT or
    // firewall that drops an idle TCP connection leaves it half-open: readyState stays OPEN,
    // close never fires, autoReconnect never runs, and delivery simply stops. The sequence
    // contract cannot catch that either, because a socket receiving nothing never sees a gap
    // to report. The player sits at a frozen table that still says connected. That is the
    // silent drop.
    //
    // It is free: the relay registers this exact pair with setWebSocketAutoResponse, so the
    // runtime answers each ping without waking the Durable Object and without billing a
    // request. Pings also deliberately do not count as activity for the relay's idle sweep.
    //
    // On a pong timeout the socket is closed and left free to reconnect (see socket.js), so the
    // close arrives as 1000 and autoReconnect below picks it up like any other blip. Any inbound
    // message resets the timer, so ordinary table traffic never trips it.
    const { send, close } = createSocket(url, {
        heartbeat: {
            message: PING_MESSAGE,
            responseMessage: PONG_MESSAGE,
            interval: HEARTBEAT_INTERVAL_MS,
            pongTimeout: HEARTBEAT_PONG_TIMEOUT_MS,
        },
        // 4xxx closes are deliberate server rejections (room full / rate limited / idle
        // sweep) — reconnecting would just get kicked again, so don't.
        autoReconnect: {
            retries: (retried) => retried < 5 && _lastCloseCode < 4000,
            delay: 2000,
        },
        onConnected() {
            connectionStatus.set('connected')
            // Out of step until the snapshot lands. hello is what asks for it, so that is
            // what gets retried if the answer never comes — a resync would be ignored by a
            // relay that never saw our hello.
            sendHello()
            awaitSnapshot(sendHello)
        },
        onDisconnected(_ws, event) {
            _lastCloseCode = event?.code ?? 0
            connectionStatus.set('disconnected')
            if (CLOSE_MESSAGES[_lastCloseCode]) connectionError.set(CLOSE_MESSAGES[_lastCloseCode])
            // Seats go local the moment the socket does, including on a blip that
            // autoReconnect will heal. Leaving them "online" without a transport is the
            // worse failure: seat clicks would go nowhere and cards drawn during the gap
            // would never be persisted anywhere. A reconnect re-snapshots and the relay
            // reattaches us to the same seat, so the round trip is invisible.
            // One batch, so nothing listening to our seat sees it go missing on the way out.
            batch(() => {
                setSeatsOnline(false)
                adoptRoomSeats()
            })
            // No transport, so nothing to retry against; onConnected re-arms the wait.
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
    // No relay means no authority, and the table we keep is complete — every pile is fully
    // materialised here — so the local count is the right answer again. Holding on to the
    // server's last numbers would let them outrank it as the table changes offline.
    canvas.cardClearGroupSizes()
    // Take the table with us. The canvas already survives a disconnect, so the seats sitting
    // around it should too — see adoptRoomSeats for what carries over and what doesn't.
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

// Mirror of the server's messageBytes cap — the server silently drops anything larger,
// which desyncs peers; better to refuse to send and log it.
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

// seats.js owns seat state but not the socket — hand it the one function it needs. The
// dependency runs one way (we import seats, seats imports nothing of ours), which is what
// lets the seat model work identically offline with the transport simply absent.
//
// Called by createTable rather than as this module loads (see table.js).
export function startMultiplayer() {
    setSeatTransport(sendAction)
}

// === Node registry ===
const nodeRegistry = new Map()
function registerNode(node) {
    if (!node?.nodeId) return
    nodeRegistry.set(node.nodeId, node)
    node.on('destroyed', () => nodeRegistry.delete(node.nodeId))
}
function getNode(nodeId) { return nodeRegistry.get(nodeId) }

// === Local-canvas shadow (for seeding empty rooms) ===
// Every node created via the wrappers below registers a `getPayload()` thunk that reads
// live Konva state and returns the exact `node:create` payload needed to reconstruct it.
// When we connect to an empty room (server.seq === 0, no nodes), `applySnapshot` walks
// this map and re-emits each entry as a node:create action so the host's existing canvas
// becomes the room's initial state instead of being wiped by the empty snapshot.
const localNodes = new Map() // nodeId → { type, getPayload }
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

// === Lifecycle ===
let _listenersInit = false
// What initMultiplayer attached, so a table leaving the page can take it back off (detachMultiplayer).
const _listenerStops = []
let _initPollAttempts = 0
const INIT_POLL_INTERVAL_MS = 50
const INIT_POLL_MAX_ATTEMPTS = 100   // 5s ceiling — initCanvas should land within a frame or two

// === Sleeve color ===
// A player's sleeve is the *default* applied to cards they create — a snapshot taken at
// creation, not an ownership link. Changing your color afterwards leaves existing cards
// alone, so one player can run several decks in different colors. Recoloring after the
// fact is an explicit act via the card toolbar's color picker (cardChangeSleeveColor),
// which broadcasts a nodes:patch like any other card mutation.

export function initMultiplayer() {
    if (_listenersInit) return
    if (!getApp()) {
        // Mount-order race: Vue 3 mounts children before parents, so a connect triggered
        // from multiplayer.vue can fire before the table view's initCanvas creates the
        // scene. Poll until it exists; once attached, _listenersInit gates re-entry.
        //
        // The race is WIDER now than it was: Pixi's Application.init is async, so initCanvas
        // resolves a tick or more after it is called rather than synchronously. The poll was
        // already the right shape for that; it just does more work now than it used to.
        if (++_initPollAttempts > INIT_POLL_MAX_ATTEMPTS) return
        setTimeout(initMultiplayer, INIT_POLL_INTERVAL_MS)
        return
    }
    _initPollAttempts = 0

    const currentMoves = () => getSelected()
        .filter(n => n.nodeId)
        .map(n => ({ nodeId: n.nodeId, x: n.x, y: n.y }))

    // Live drag stream — peers see cards glide instead of teleporting at drop. Konva fires
    // dragmove once per moving node per frame; the timestamp throttle collapses that to one
    // message per interval regardless of how many cards are in flight. The server relays
    // these to everyone EXCEPT us, so the stream never fights our local drag.
    //
    // Cost note: this stream is the app's dominant message source, and every incoming
    // message bills the Durable Object (20 messages = 1 request) AND keeps it awake, which
    // bills duration. 200ms (5Hz) is deliberately chosen over silky 50ms — peers tween
    // between packets (see tweenToPosition), so motion stays legible, just less fluid.
    const DRAG_STREAM_MS = 200
    let dragStreamLast = 0

    // Konva bubbled dragmove/dragend to the stage, once per moving node per frame — which is
    // why the original needed both a timestamp throttle AND a microtask coalesce, the second
    // purely to undo the per-node duplication (dropping a 60-card deck sent 60 identical
    // messages). pointer.js drives ONE drag for the whole selection, so 'end' now fires once
    // by construction and the coalesce has nothing left to collapse. The throttle stays: it is
    // about the relay's bill, not about Konva.
    //
    // Cost note, unchanged: this stream is the app's dominant message source, and every
    // incoming message bills the Durable Object (20 messages = 1 request) AND keeps it awake.
    // 200ms (5Hz) is deliberately chosen over silky 50ms — peers tween between packets (see
    // tweenToPosition), so motion stays legible, just less fluid.
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

        // Rect/Arrow/Text tool completion — assign canonical nodeId, register, broadcast as
        // node:create.
        if (action.op === 'rect:create' || action.op === 'arrow:create' || action.op === 'text:create') {
            const type = action.op.split(':')[0]
            const nodeId = newId()
            const node = action.node
            node.nodeId = nodeId
            registerNode(node)
            const baseParams = { ...action.params, nodeId }
            // The mutable fields, re-read at hand-off time: a late joiner is caught up from
            // this closure, not from the params captured when the shape was drawn.
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

        // A property change on an existing node, from canvas code that has no public wrapper
        // to route through — currently the arrow endpoint drag, which is driven from the
        // selection layer rather than from a toolbar button. Same wire shape as text:edit
        // below; that one keeps its own name because the observer is also its create path.
        if (action.op === 'node:patch') {
            if (!action.nodeId) return
            sendAction('nodes:patch', {
                patches: [{ nodeId: action.nodeId, props: action.props ?? {} }],
            })
            return
        }

        // Text content (and optional fill) change on an existing node → nodes:patch
        if (action.op === 'text:edit') {
            sendAction('nodes:patch', {
                patches: [{ nodeId: action.nodeId, props: action.props ?? {} }],
            })
            return
        }

        // Empty-commit on an existing text node → destroy
        if (action.op === 'node:destroy') {
            sendAction('nodes:destroy', { nodeIds: [action.nodeId] })
            return
        }

        // Batch destroy (alt-drag clone retraction when Alt is released mid-drag)
        if (action.op === 'nodes:destroy') {
            sendAction('nodes:destroy', { nodeIds: action.nodeIds })
            return
        }

        // Alt-drag clones — canvas creates them internally, so they arrive without nodeIds.
        // Assign ids, track, and broadcast so peers see the duplicates. Only cards carry
        // enough state (cardData/cardConfig) to replicate; other clone types stay local.
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

// The other half of initMultiplayer, for a table being unmounted (see table.js). The canvas clears its
// own drag listeners as it goes, so without this the flag above stayed set and a table mounted again
// never re-attached them: a room hosted after coming back to the table stopped streaming drags.
export function detachMultiplayer() {
    for (const stop of _listenerStops.splice(0)) stop()
    _listenersInit = false
    _initPollAttempts = 0
}

// === Public wrappers ===

// Callers now hand us `card_config` (composable/game.js) — { name, size } and nothing
// else — so this is a belt-and-braces narrowing rather than the load-bearing one it used
// to be. It mattered when the argument was the whole manifest.data: that carried
// set_list and weighed ~60 KB as JSON, far past the relay's 8 KB nodePayloadBytes cap,
// and any payload embedding it was silently dropped server-side. Keep it anyway — it is
// the only thing standing between a future caller passing something fat and a failure
// mode with no error message. Rebuilding a card on a peer needs `size` (aspect ratio);
// the game's display name rides along for debuggability.
function slimCardConfig(config) {
    if (!config || typeof config !== 'object') return config
    const { name, size } = config
    return { name, size }
}

// Cards
export function addCard(card, config, x, y, options = {}) {
    const nodeId = options.nodeId ?? newId()
    // Snapshot of the creator's current color — see the sleeve-color note above.
    const sleeveColor = options.sleeveColor ?? `hsl(${ownSeatSleeve.get()})`
    const effectiveOptions = { ...options, nodeId, sleeveColor }

    const node = canvas.addCard(card, config, x, y, effectiveOptions)
    const wireConfig = slimCardConfig(config)
    if (!node) return node

    // Broadcast where the card ACTUALLY landed, not where it was asked to go. The two differ
    // constantly and the gap is silent:
    //   - resolveDropPosition nudges a drop off an occupied spot (100,100 → 108,108)
    //   - a hand-drop merge folds the card into a group and restacks it
    //   - x/y arrive null from click-to-add, and canvas.addCard fills them from THIS client's
    //     viewport centre — a value that depends on window size and current pan
    // Sending the request meant every peer resolved it against their own canvas and their own
    // viewport, so the same card sat at a different world position for each player.
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
    // The seat has put something on the table, so its next deck lands where the player asks
    // rather than being laid out onto the mat's zones. See deal.js.
    markSeatPlaced(mySeatId.get())
    return node
}

export function addDeck(deck_dict, config, x = null, y = null) {
    // Before anything is counted or laid out, because the shuffle is what decides which card
    // each of the nodeIds below ends up being. An opening deal arrives shuffled; a deck added
    // to a game already in progress is left in the order it was handed over. See deal.js.
    if (isOpeningDeal()) deck_dict = shuffleMain(deck_dict)

    const pileCount = Object.keys(deck_dict).length
    const cardCount = Object.values(deck_dict).reduce(
        (sum, cards) => sum + cards.reduce((s, e) => s + (e.quantity || 1), 0),
        0,
    )
    const nodeIds = Array.from({ length: cardCount }, newId)
    const pileGroupIds = Array.from({ length: pileCount }, () => `g-${newId()}`)
    // Snapshot of the dealer's current color — see the sleeve-color note above.
    const sleeveColor = `hsl(${ownSeatSleeve.get()})`

    // Resolve the anchor HERE rather than letting each client resolve it. Click-to-add passes
    // no coordinates, and canvas.addDeck answers that with getViewportCenter() — so peers
    // replaying the same call dealt the deck at *their* viewport centre, which depends on
    // window size and current pan. That is the biggest of the "we're not looking at the same
    // table" bugs: whole decks landing in different places for different players.
    if (x == null || y == null) {
        const center = canvas.getViewportCenter()
        x = center.x
        y = center.y
    }

    // Resolved before the deal, because dealing is what ends it: an opening deal goes onto the
    // mat's named zones, everything after lands where it was asked to.
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

        // Resolved position, for the same reason as addCard above — these adders also fall
        // back to the local viewport centre when x/y are omitted.
        const buildPayload = () => ({
            item, x: node.x, y: node.y,
            options: {
                ...baseOptions,
                rotation: canvas.getWorldRotation(node),
                // Dice and counters carry a value that needs to round-trip — a peer
                // rebuilds from the payload alone, and a life total that arrives back at
                // its opening value is a table that disagrees with itself.
                // The VALUE lives on the model (node.props); the VARIANT is which art file the
                // node is wearing, which is node state rather than model — see tools/dice.js.
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

// Wipe every element off the table, locally and for every peer.
//
// One nodes:destroy carrying the lot rather than a per-node message: the relay applies them in
// a single pass, and a table at the node cap would otherwise be 1500 packets against a rate
// limiter that closes the socket at 120 drops.
//
// Not ownership-scoped, unlike seats — anyone at the table may clear it, which is the same rule
// the delete key already follows.
export function clearTableNodes() {
    const nodeIds = [...nodeRegistry.keys()]

    canvas.clearAllElements()
    nodeRegistry.clear()
    localNodes.clear()
    // Pile sizes describe a table that no longer exists; a stale entry would outrank the real
    // count of whatever gets dealt next. Same reasoning as the snapshot replay.
    canvas.cardClearGroupSizes()

    if (nodeIds.length) sendAction('nodes:destroy', { nodeIds })
}

// === Table reset ===
// The canvas half of a reset already reaches the room on its own: clearTableNodes broadcasts
// the wipe and the re-deal that follows broadcasts its creates. What cannot travel that way is
// each client's own seat, its own hand, and the local flags that say the table is fresh — the
// relay accepts those writes only from the client they belong to. So the reset goes out as an
// instruction and every client carries out its own half.
//
// The handler is injected rather than imported, the same way seats.js is handed its transport:
// seat-setup.js owns what a reset MEANS and already imports this module for the wipe, so the
// dependency has to run one way. Absent (nothing registered yet) the event is simply ignored,
// which is the right answer for a reset arriving before the table view is up.
let _applyTableReset = null

export function setTableResetHandler(fn) {
    _applyTableReset = fn
}

export function broadcastTableReset() {
    sendAction('table:reset')
}

// Selection-wide
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

// Alignment rides nodes:move rather than getting a verb of its own: the result IS a set of
// final positions, which is exactly what that message already carries and what peers already
// know how to apply. Sending the edge instead would ask every client to recompute the layout
// from its own copy of the selection — and each one measures in ITS OWN screen space, which
// under the mirror is upside down relative to the player who pressed the button.
//
// Positions are read AFTER the local apply, from the nodes it reports having moved.
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
    // The canvas decides which way the flip goes — it keys on the same card the toolbar shows
    // — and hands the answer back. Deriving it a second time here is how the two drift apart.
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

// `target` mirrors the canvas signature: a single nodeId, an array of nodeIds, or
// null/undefined for the whole group (the scry dialog uses all three). The wire always
// carries explicit per-node patches; numeric ids are solo-mode Konva _ids that mean
// nothing to peers, so they stay local.
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

    // Only an ALL-LOOSE selection needs the relay: there is no existing id to inherit, so the
    // server mints one and every client lands on the same value.
    //
    // The moment the selection already contains a deck, the merged pile inherits that deck's
    // id — a value every client already agrees on — so the canvas resolves it locally and
    // broadcasts card:merge through the observer. That path works identically online and off,
    // and it is what makes "combine these two decks" possible at all: the server-authoritative
    // branch has no local fallback, so a relay that never answers leaves the action silently
    // dropped (see the makeGroup notes in canvas/tools/card.js).
    const hasGroup = cards.some(c => c.groupId)
    const allTracked = cards.every(c => c.nodeId)
    if (!hasGroup && connectionStatus.get() === 'connected' && allTracked) {
        sendAction('card:makeGroup', { nodeIds: cards.map(c => c.nodeId) })
    } else {
        canvas.cardMakeGroup()
    }
}

// Explodes the selected pile into loose cards. Unlike makeGroup there is nothing to mint —
// the groupId being cleared is one every client already agrees on — so this resolves locally
// on every client and rides the two verbs that already exist: the clear as a nodes:patch,
// the landing spots as a nodes:move.
//
// Patch first, and in that order on the wire: a peer that learned the positions while still
// believing the cards were a pile would run them through projectGroupMoves and re-stack them
// into slots (see the nodes:move case).
export function cardUngroup() {
    const groupId = canvas.cardGetSelectedGroupId()
    if (!groupId) return

    const cards = canvas.cardUngroup(groupId)
    const tracked = cards.filter(c => c.nodeId)
    if (tracked.length === 0) return

    sendAction('nodes:patch', { patches: tracked.map(c => ({ nodeId: c.nodeId, props: { groupId: null } })) })
    sendAction('nodes:move', { moves: tracked.map(c => ({ nodeId: c.nodeId, x: c.x, y: c.y })) })
}

// Puts every card in hand back onto one pile, in hand order, the last one on top. The bulk
// inverse of Draw, and the reason the pile has to be the *selected* one: it is the only pile
// the player has said anything about.
//
// Deliberately not a loop over dropFromHand. That merges each card as it arrives, which is a
// card:merge per card on top of its node:create — a seven-card hand is fourteen messages
// against a burst of sixty (see LIMITS in the relay), each one relayouting the pile. Creating
// the cards loose and folding them in with one merge is also the ordering peers want: every
// node exists before the merge that names it arrives.
export function cardEmptyHand(groupId) {
    if (typeof groupId !== 'string') groupId = canvas.cardGetSelectedGroupId()
    if (!groupId) return

    // Snapshot: the hand is spliced below, and a card that fails to place stays in it.
    const entries = [...hand.get()]
    if (entries.length === 0) return

    const placed = []
    for (const entry of entries) {
        // The cards land stacked on the pile's top card and the merge restacks them properly,
        // so this only has to put them inside the pile's footprint.
        const spec = canvas.cardGetGroupDropSpec(groupId, entry)
        if (!spec?.config) break
        // The entry's own faceDown is dropped on purpose: staging a card face-down in hand
        // says how you meant to PLAY it, and it isn't being played — the pile it joins
        // decides which way up it sits (see getGroupDropSpec).
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
        // Server picks values, broadcasts rolls. Originator + peers animate to the same result.
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

// Counters
//
// Value changes only — a counter has no rolled outcome for the server to arbitrate, so unlike
// diceRoll these never need a round trip. Mutate locally, then report as nodes:patch, which is
// also what makes them work offline unchanged.
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

// Hand sync lives in seats.js — the hand belongs to a seat, so the listener that pushes it
// to the relay belongs beside the seat that owns it. `hand` here is that seat's hand, and
// removeFromHand is how a card leaves it.

// Pulls a card out of the hand and drops it on the canvas at world (x, y). Emits
// node:create for the new canvas card; the seat's hand listener reports the shrunken hand.
//
// `faceDown` is the hand's staging flag (toggled with H — see store.js handFlipFocused), not
// card data: destructured out so it can't ride along inside the card record, and handed to
// addCard as an option instead. This is the moment the choice becomes visible to peers — the
// card lands on the table showing its sleeve, which is the point of setting a trap.
export function dropFromHand(handEntry, config, x, y) {
    if (!handEntry?.handEntryId) return
    const { handEntryId, faceDown = false, ...cardData } = handEntry
    // held: this card was in the player's hand a frame ago, so it lands the way a card let go
    // of on the table lands rather than fluttering in like a dealt one.
    const node = addCard(cardData, config, x, y, { faceDown, resolveOverlap: false, mergeIfOverlap: true, held: true })
    removeFromHand(handEntryId)

    // The card lands selected, so whatever the player means to do to it next is already aimed.
    // Playing an energy onto a Pokemon and sending it under is the case this is for: the card
    // has to go down before it can go behind, and without this those are two gestures with a
    // hunt between them — on a tablet, a hunt for a card now sitting under the one just
    // dropped, which is the hardest thing on the table to tap.
    //
    // A merged card is left alone. It went into a pile, and mergeIntoGroup has already pointed
    // the selection at every member so the next drag takes the whole stack rather than peeling
    // the top card straight back off it.
    if (node && !node.groupId) {
        setSelection([node])
        broadcastSelectionUI(true)
    }
}

// Rect / Arrow / Text toolbar verbs
export function rectChangeColor(color) {
    canvas.rectChangeColor(color)
    const patches = getSelected()
        .filter(n => n.kind === 'shape' && n.nodeId)
        .map(n => ({ nodeId: n.nodeId, props: { fill: `hsl(${color})` } }))
    if (patches.length) sendAction('nodes:patch', { patches })
}

// The arrow's head is a filled triangle on the same colour as its line, so the patch carries
// both — arrowApplyPatch keys the pair off `stroke` and sets the fill with it.
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

// Text-edit committal — pass through. text.js's commitTextEdit emits the right canvas
// observer action (text:create / text:edit / node:destroy) which the observer above turns
// into the matching wire-format event.
export function commitTextEdit(newText) {
    canvas.commitTextEdit(newText)
}

// Pass-throughs
export const cardGetSelectedGroupId = canvas.cardGetSelectedGroupId
export const cardGetGroupCards = canvas.cardGetGroupCards

// === Inbound apply ===

// The single door every inbound message comes through, and therefore the right place to arm
// the remote-apply guard (see selection.js). Inside it, canvas verbs replay a peer's action
// without being allowed to re-aim this client's selection — the bug that made two players
// touching one deck fight over a toolbar that looked shared but was only ever local.
//
// A snapshot is deliberately NOT guarded: it wipes and rebuilds the whole canvas, so
// clearing the selection is correct rather than a hijack.
function handleMessage(data) {
    let msg; try { msg = JSON.parse(data) } catch { return }
    if (msg.kind === 'snapshot') {
        applySnapshot(msg)
    } else if (msg.kind === 'seq') {
        // Bare sequence bump for a drag-stream op of ours that the relay deliberately did
        // not echo back. Carries no state — it exists only to keep us in step.
        if (typeof msg.seq === 'number') acceptSeq(msg.seq)
    } else if (msg.kind === 'dropped') {
        // The relay refused a message of ours and applied nothing. It took no seq, so there
        // is no gap for acceptSeq to find — this notice is the only evidence it ever
        // existed. We already applied the action locally when the player made it, so we are
        // now holding a change the room has never heard of. Resync: the snapshot may visibly
        // undo what we just did, which is the correct outcome — it genuinely did not happen.
        droppedCount.update(n => n + 1)
        requestResync()
    } else if (msg.kind === 'event') {
        withRemoteApply(() => applyEvent(msg))
        // Peers draw and delete out from under whatever we're holding. Konva keeps the
        // destroyed nodes in the transformer, so drop them before anything ranks the
        // selection by zIndex — a destroyed node reports 0 and wins the "top card" pick.
        pruneSelection()
    }
}

// Glide a node to a streamed position instead of snapping. The drag stream arrives at
// ~5Hz (DRAG_STREAM_MS); a tween slightly longer than the packet interval bridges the
// gap so peer drags render smoothly. Each new packet retargets the in-flight tween.
// Backstop for piles that arrive from the opposite perspective without a full batch for
// projectGroupMoves to work with (see the nodes:move case). Deliberately slow: the
// projection already handles live drags, so this only needs to catch stragglers once
// everything has settled, and firing it eagerly mid-drag is what made cards dance.
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

// Konva.Tween, replaced with Motion's animate — the same one tactility and the shuffle spin
// already use. Written as a scalar 0 → 1 read through onUpdate rather than handing motion the
// node: motion's object path retains every subject it is given in a module-level store, and a
// busy room streams positions for thousands of nodes over a session.
//
// `_remoteTween` keeps its name and its meaning: card.js's relayoutGroups skips a pile that has
// one in flight, so a peer's glide is never interrupted by a local re-lay.
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
    // Back in step, whatever put us out of it.
    resyncSettled()

    const incomingIds  = Object.keys(msg.nodes ?? {})
    // A room nobody has ever acted in: seq still 0 and not a node in it. That — not who
    // happens to be connected at this instant — is what "this room is brand new" means.
    //
    // This used to ask whether `msg.clients` held anyone but us, and treat being alone as
    // licence to destroy the room's nodes and reseed from our local copy. But that list is
    // derived from live connections that have completed their hello and whose socket reads
    // OPEN, so it goes empty during any blip: two players dropping together and reconnecting
    // in sequence would each briefly look alone, and the first one back would wipe the
    // table and replace it with its own. seq is monotonic and persisted, so a room that has
    // ever had an action in it can never look virgin — which is the property the old test
    // lacked and this one has.
    const virginRoom   = (msg.seq ?? 0) === 0 && incomingIds.length === 0
    // Only live canvas nodes count as seedable local state. The hand deliberately does not:
    // it lives on the seat, not on the canvas, and a hand held with nothing on the table is
    // not a table worth seeding — counting it here would let a client holding cards and
    // nothing else destroy the server's persisted table and seed nothing back.
    const haveLocal    = localNodes.size > 0

    // Seats before nodes, and before the early return below: whichever branch the canvas
    // takes, this connection needs a seat to draw into, and the sleeve stamped on every
    // card created from here on comes off it.
    seatSnapshot(msg)

    if (virginRoom && haveLocal) {
        // Nothing here yet and I have a canvas going: my table becomes the room's table.
        // No nodes:destroy first — there is provably nothing to clear, which is the whole
        // point of gating on an empty room rather than an empty peer list.
        seedRoomFromLocal()
        return
    }

    // Normal path: trust the server, wipe + replay. Replay in ascending `ord` (the
    // server's stacking stamp) — creation order alone would lose shuffles, scry
    // re-orders, and z-nudges that happened before we joined.
    canvas.clearAllElements()
    nodeRegistry.clear()
    localNodes.clear()
    // Sizes from before the wipe describe a table that no longer exists, and a stale entry
    // outranks the local count that is about to become correct. Drop them; the replay below
    // carries every node in the room, so counting the result is exact and re-seeds the
    // registry for groups no later event happens to mention.
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

// Sit this client down, and decide whether the room's seats or ours are canonical.
//
// Two cases, and the difference is the whole seat model in miniature:
//
//   Empty room — nobody has ever sat here, so our table is the table. Push every local seat
//     up (names, sleeves, hands included) and reclaim the one we were already in. This is
//     what makes "play solo, then Go Online" continuous: the goldfish seats you set up
//     offline are still there, still holding their cards.
//
//   Existing room — the room's seats win, and we get a brand new empty one, per the rule
//     that a new arrival never lands in someone else's chair. Our local seats aren't lost;
//     they're still in localStorage waiting for us to go offline again.
//
// A reload is neither: the relay reattaches us to the seat our clientId last held (see
// room.js), so `yourSeatId` comes back already filled in and we mint nothing.
function seatSnapshot(msg) {
    // One batch: `online` flips before the room's seats land, and anything listening to our own
    // seat would otherwise watch it go null and come back in between.
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

// Chunk bounds for the seed below. Twice-bounded on purpose: by count, so a full 1500-node
// room leaves as ~15 messages rather than 1500; and by serialized size, because the relay
// refuses anything past its 512 KB message cap and a table of unusually fat payloads could
// otherwise push a full-count chunk over it. Half the cap leaves ample room for the envelope.
const SEED_CHUNK_NODES = 100
const SEED_CHUNK_BYTES = 256 * 1024

// Push every locally-tracked node to the (empty) server. Called when the host connects to
// a brand-new room and we want their existing canvas to become the room's initial state
// instead of being clobbered by the empty snapshot. Seats are seeded separately, in
// seatSnapshot — they're room state now, not a local asset.
//
// Batched, and that is the whole point. A node per message meant a 120-node table hit the
// relay as 120 messages in one tick; the token bucket is 60 deep and refills at 15/s, so
// roughly half were refused and the room came up holding half a table while this client
// showed a whole one. Iteration order is unchanged, so the relay stamps `ord` in exactly
// the sequence the per-message version did and the table's stacking is untouched.
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
        // getPayload reads live Konva state and can throw on a node that is mid-teardown.
        // Skip that one rather than losing the rest of the table with it.
        try { spec = { nodeId, type: entry.type, payload: entry.getPayload() } } catch { continue }
        const size = JSON.stringify(spec).length
        if (chunk.length && (chunk.length >= SEED_CHUNK_NODES || bytes + size > SEED_CHUNK_BYTES)) flush()
        chunk.push(spec)
        bytes += size
    }
    flush()
}

// Seat traffic is presence, not canvas state, so it is handed straight to seats.js rather
// than threaded through the node machinery below.
const SEAT_OPS = new Set([
    'seat:create', 'seat:destroy', 'seat:update', 'seat:control', 'seat:hand',
])

function applyEvent(event) {
    // Canvas events are sequenced; seat events are presence and carry no seq, so they keep
    // flowing even while we are waiting on a snapshot (which will carry the seats anyway).
    if (typeof event.seq === 'number' && !acceptSeq(event.seq)) return
    const isOwn = event.byClientId && event.byClientId === ownClientId.get()

    // Unsequenced, like seat traffic: it carries no canvas state, only the instruction to
    // reset what this client alone can write. The relay never echoes it to the sender, which
    // has already done its own half directly.
    if (event.op === 'table:reset') {
        _applyTableReset?.()
        return
    }

    if (SEAT_OPS.has(event.op)) {
        // seat:control is the one seat event whose meaning depends on who we are — it is
        // how we learn we've sat down. seats.js has no notion of client identity, so pass
        // ours in rather than giving it the import.
        applySeatEvent({ ...event, yourClientId: ownClientId.get() })
        return
    }

    // Install the relay's group sizes BEFORE the handler runs, because the handlers relayout
    // and a relayout that reads a stale size writes the wrong spacing to the layer. The relay
    // stamps these on every op that changes a group's membership; see #groupSizesFor in
    // room.js for why the count cannot be derived from what this client happens to hold.
    // Applies to our own echoes too — we may have adopted a local count optimistically, and
    // the server's number is the one every peer is using.
    if (event.groupSizes) canvas.cardSetGroupSizes(event.groupSizes)

    switch (event.op) {
        case 'node:create': {
            if (getNode(event.nodeId)) return
            replayCreate(event.type, event.nodeId, event.payload)
            break
        }

        // Someone's local table arriving as the room's opening state. Idempotent like every
        // create path here: the seeder gets this echoed back for nodes it already holds, so
        // the guard is what stops it rebuilding its own table underneath itself.
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

            // Replay the dealer's exact cards. Re-running addDeck instead would re-roll every
            // card's random rotation jitter and, before the anchor fix, re-resolve the pile's
            // position against this client's viewport — two independent ways for the same deck
            // to look different to each player. This is the same path snapshot replay uses,
            // which is why rejoining a room always looked right when the live deal didn't.
            if (Array.isArray(event.nodes) && event.nodes.length) {
                for (const spec of event.nodes) {
                    if (getNode(spec.nodeId)) continue
                    replayCreate(spec.type, spec.nodeId, spec.payload)
                }
                canvas.cardRefreshAllGroups()
                break
            }

            // Relay predating the `nodes` echo: rebuild from the deal arguments. Positions are
            // right (the dealer resolves the anchor before sending now) but rotation jitter
            // will differ per client.
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
            if (isOwn) return // our own stream — server filters this, guard is belt-and-braces
            const moves = event.moves ?? []
            // A peer dragging a pile sends a position per card in THEIR slot order, which
            // is perspective-dependent (see card.js relayoutGroup). Re-project whole piles
            // onto our own slots so the glide targets the right places to begin with —
            // landing them foreign and correcting after the fact made the cards dance.
            // Same-perspective peers project to their own positions, so this is a no-op.
            const projected = canvas.cardProjectGroupMoves(moves)
            const movedGroups = new Set()
            for (const move of moves) {
                const node = getNode(move.nodeId)
                if (!node || node.isDragging()) continue // local drag wins a tug-of-war
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
                // A card's size is the game's, not the player's: `cardW`/`cardH` are stamped
                // once at creation and every geometry consumer reads those rather than the
                // rendered bounds — hit testing, the pile nudge, relayoutGroup, merge detection,
                // the explode pitch. A scaled card therefore drew at one size and was reasoned
                // about at another, and since nothing restores scale from a snapshot it also
                // sprang back on the next reload. Cards lost their resize handles with the
                // piece/annotation split (see SELECTION STYLES in canvas-pixi/selection.js); this is
                // the half that covers a scale from an older client, or one already sitting in a
                // room saved before the split.
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
            // Relay verb — originator already applied locally, others apply now. Resolve
            // the originator's nodeIds; applying to our own selection would re-stack
            // whatever WE happen to have selected.
            if (isOwn) return
            const nodes = (event.nodeIds ?? []).map(id => getNode(id)).filter(Boolean)
            if (nodes.length) canvas.applyMoveZ(nodes, event.direction)
            break
        }

        case 'card:merge': {
            if (isOwn) return // already applied locally
            canvas.cardApplyMerge(event.movingIds, event.targetId, event.groupId)
            break
        }

        case 'card:shuffle': {
            // Server-authoritative — apply on every client (originator included). Goes
            // through applyShuffle rather than setGroupOrder so the spin animation plays:
            // online, cardShuffle only sends the action, so nothing ever animated locally.
            canvas.cardApplyShuffle(event.groupId, event.orderedIds)
            break
        }

        case 'card:setGroupOrder': {
            if (isOwn) return
            canvas.cardSetGroupOrder(event.groupId, event.orderedIds)
            break
        }

        case 'card:makeGroup': {
            // Server-assigned groupId — apply on every client (originator hadn't applied locally)
            for (const id of event.nodeIds) {
                const node = getNode(id)
                if (node) canvas.cardApplyPatch(node, { groupId: event.groupId })
            }
            canvas.cardRefreshAllGroups()
            break
        }

        case 'card:draw': {
            if (isOwn) return // already applied locally
            // For to='hand', non-owners should destroy without growing their own hand
            const args = { ...event.args, skipHandPush: event.args?.to === 'hand' }
            canvas.cardDraw(args)
            break
        }

        case 'dice:roll': {
            // Server-authoritative — every client (originator included) animates to the value
            for (const r of event.rolls ?? []) {
                const node = getNode(r.nodeId)
                if (node) canvas.diceApplyRoll(node, r.value)
            }
            break
        }
    }
}

// Rebuild a node from a payload that already describes a settled card. Replay is a
// *transcription*, never a placement decision — the sender resolved all of that and the
// answer is in the payload.
//
// Both flags below arrive from the sender's own options and must not be honoured here:
//
//   resolveOverlap — the sender already nudged off the occupied spot and sent the landing
//     position. Re-running the search from there finds the very card it was nudged away
//     from and nudges AGAIN, so the peer's copy drifts one step further with each hop.
//   mergeIfOverlap — a hand-drop merge is already broadcast as its own card:merge, and the
//     payload now carries the resolved groupId, so the card arrives in the right pile.
//     Letting the peer merge as well applies it twice.
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
        // Rect/arrow/text payloads are flat params, but server-side nodes:patch accumulates
        // props under payload.options — overlay them so patched fills/text survive replay.
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
