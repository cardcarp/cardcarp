// One Room per room code. Dumb relay — no game-rule enforcement. Canvas state is served
// from memory (`this.canvas`) and write-through persisted to Durable Object storage
// (`node:<id>` per node, plus `seq`), so hibernation wakes rebuild the exact table and
// are invisible to players. Storage lives only as long as the room does: the idle sweep's
// deleteAll wipes it once the room empties out.
// Players self-police via Discord — but resource abuse is enforced here: see LIMITS below
// (connection cap, message size, per-connection rate limit, node caps, seat caps, idle sweep).
//
// === Seats vs clients ===
// A connection is a *client* (a browser). A *seat* is a position at the table: name,
// sleeve, and a hand of cards. They are deliberately separate objects with separate
// lifetimes — that separation is what makes an empty seat ("Add Goldfish"), swapping
// seats, and taking over someone's abandoned hand expressible at all.
//
//   seats live in storage (`seat:<id>`) and outlive every connection.
//   control is NOT stored — it is derived from live connections (connection.state.seatId),
//     so a closed tab frees its seat the instant the socket drops rather than locking it
//     for the rest of the room's life. `lastClientId` on the seat is a hint, not a claim:
//     it only lets a reloading client drop back into the chair it just left.
//
// === Hands ===
// Hands used to be local-only, with the server holding a bare integer. They are now full
// room state: stored against the seat and replicated to every client, exactly like nodes.
//
// Two requirements drove that, and only full replication satisfies both. A hand has to
// follow its seat to whoever picks it up, and a client going offline has to leave holding
// the whole table — every seat's cards included — so the game can carry on solo.
//
// What this gives up is nothing that was really there. A face-down card on the table is
// broadcast complete with its card record (see node:create), so any client has always been
// able to read the "hidden" side of the board. Hidden information here is a rendering
// convention, not a security property, and hands now match the rest of the table rather
// than pretending to a secrecy the board never had.
//
// Hands live in room storage rather than connection.state for two reasons: they must
// survive their controller disconnecting, and card records would blow past
// serializeAttachment's 16 KB cap.
//
// Wire protocol:
//
//   client → server
//     { kind: 'hello', clientId }
//     { kind: 'action', op, clientId, ...payload }
//     { kind: 'resync' }  — "I saw a gap in seq, send me the room again"
//
//   server → client (originator after hello, and in answer to resync)
//     { kind: 'snapshot', seq, nodes, seats, clients, yourClientId, yourSeatId }
//
//   server → client (any change)
//     { kind: 'event', seq, op, byClientId, ...payload }
//
//   server → originator only (drag-stream ops, which are not echoed back)
//     { kind: 'seq', seq }  — the sequence number that op consumed
//
//   server → originator only (a message we refused)
//     { kind: 'dropped', reason }  — 'rate' | 'size'; nothing was applied, resync
//
// `seq` is monotonic over canvas events and is the client's only way to notice that it
// missed one. Seat traffic is presence, not canvas state: it carries no seq and never
// bumps it.
//
//   seat:create  — client mints the seatId (like node ids), server stores and echoes.
//   seat:claim   — a *request*; two clients can reach for one chair in the same tick, so
//                  the server arbitrates and answers with seat:control.
//   seat:control — { seatId, clientId } — who is driving, or clientId null for "free".
//   seat:hand    — both directions. Inbound: the controller's hand contents, which only it
//                  may write. Outbound: broadcast, so every client holds every hand and
//                  claiming a seat needs no handoff — the cards are already there.

import { Server } from 'partyserver'

// === Limits (cost safety) ===
// The bill for this Worker is driven by (a) incoming WebSocket messages — billed as
// requests at a 20:1 ratio — and (b) duration, billed as 128 MB × wall-clock whenever
// the DO is awake. Any incoming message wakes a hibernated DO; it re-hibernates after
// ~10s of quiet. Outgoing messages are free. These caps bound the worst case a single
// room or a hostile client can cost us. Tune down freely; tune up with care.
const LIMITS = {
    connectionsPerRoom: 8,        // player-count ceiling; extra sockets are refused
    messageBytes: 512 * 1024,     // biggest legit message is a deck:create; floods get dropped
    nodesPerRoom: 1500,           // two big decks plus accessories fit comfortably
    nodePayloadBytes: 8 * 1024,   // single node payload (a real card is well under 2 KB)
    seatsPerRoom: 8,              // seats are cheap, but each one carries a hand
    handEntries: 200,             // a hand, not a second deck — bounds the array length
    handBytes: 96 * 1024,         // and its serialized size; 200 card records fit inside
    nameChars: 40,
    sleeveChars: 32,
    anchorRange: 4000,            // seat chip coords are clamped to the client's GRID_RANGE
    msgsPerSecond: 15,            // sustained per-connection rate (client sends ≤5/s while dragging)
    msgBurst: 60,                 // bucket depth — allows join bursts (room seeding, deck drops)
    floodCloseAfter: 120,         // consecutive rate-limited drops before the socket is closed
    idleSweepMs: 30 * 60 * 1000,  // sweep interval; also the no-activity window onAlarm requires
}

// === Deferred position writes ===
// The drag stream is the room's dominant write path by an order of magnitude: the client
// sends nodes:move / nodes:transform every DRAG_STREAM_MS (200ms) for every node in the
// selection, so dragging a 60-card pile for three seconds is ~15 packets x 60 nodes = ~900
// row writes — and ~899 of those are intermediate positions that the next packet overwrites
// milliseconds later. Only the last one is ever read back, by onStart after a hibernation
// wake. So position ops mark their nodes dirty instead of writing, and a trailing flush
// persists each node once the drag settles.
//
// The trade, stated plainly: a setTimeout does not survive eviction, so an abrupt eviction
// inside the flush window loses up to POSITION_FLUSH_MAX_WAIT_MS of drag movement. It is bounded and
// cosmetic — connected clients hold their own positions regardless, so the staleness is only
// visible to a client that joins or reconnects in that window — and a DO stays resident for
// ~10s of quiet, which the 1s window clears comfortably. Every durable-worthy action drains
// the queue first (see handleAction), so nothing but in-flight drag state is ever pending.
// Idle delay: the write lands this long after the stream pauses, so an entire drag
// collapses into one row per node however many packets it took.
const POSITION_FLUSH_MS = 400
// Ceiling measured from the first pending write, so a drag that never pauses still
// checkpoints. This — not the idle delay — is the real bound on how much movement an
// abrupt eviction can lose.
const POSITION_FLUSH_MAX_WAIT_MS = 2000
// Ceiling on the queue, so a very large or very long drag cannot grow the pending set (or
// the worst-case loss) without bound. 1500-node rooms make this reachable in one packet.
const POSITION_FLUSH_MAX = 600
const DEFERRED_OPS = new Set(['nodes:move', 'nodes:transform'])

// === Stacking order ===
// Every node carries `ord`, a monotonically increasing stacking stamp: higher ord renders
// on top. Snapshot replay sorts by it, which is what lets deck order (shuffles, scry
// re-orders, merges, z-nudges) survive late joins and hibernation wakes. Client-side,
// nodes live in z-bands (board < shape < card < accessory) — one-step z moves only ever
// swap within a band, so the moveZ mirror below partitions by band too.
const BAND = { board: 0, rect: 1, arrow: 1, text: 1, card: 2, dice: 3, marker: 3 }
const bandOf = (node) => BAND[node.type] ?? 2
const groupIdOf = (node) => node?.payload?.options?.groupId ?? null

// Node ids arrive from the client and are used as keys into `canvas.nodes`, a plain
// object — so they must never be allowed to reach through its prototype chain. A lookup
// of `__proto__` returns Object.prototype, which is truthy, so every "does this node
// exist?" guard passes and the next `node.payload = …` writes onto Object.prototype
// itself. That is not contained to the attacking room: Durable Objects of one class share
// an isolate, so the polluted prototype is visible to other rooms and to the Worker's own
// fetch handler. It also survives a restart — `#persistNode` would write a `node:__proto__`
// row, and onStart's rebuild then reassigns the map's prototype from it.
//
// A blocklist rather than a charset: ids we mint are UUIDs, but deck nodes and groups use
// other shapes, and rejecting a legitimate id would silently desync that client. The three
// reserved names are the entire attack surface here.
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const isNodeId = (key) => (
    typeof key === 'string' && key.length > 0 && key.length <= 64 && !RESERVED_KEYS.has(key)
)

// Every batch verb (moves, patches, transforms, destroys, deck nodes) takes a
// caller-supplied array, and each accepted entry costs a storage write. Nothing about the
// wire format stops a hostile client from repeating one nodeId thousands of times inside
// a single legal-sized message, which would turn one message into thousands of writes —
// so bound every batch before it reaches the persistence layer. A legitimate client never
// addresses a node twice in one action, and can never address more nodes than exist.
// This is also the single choke point every batch verb's ids pass through, which is why
// the isNodeId check lives here rather than being repeated in each case below.
function boundEntries(list, keyOf) {
    if (!Array.isArray(list)) return []
    const seen = new Set()
    const out = []
    for (const item of list) {
        if (out.length >= LIMITS.nodesPerRoom) break
        const key = keyOf(item)
        if (!isNodeId(key) || seen.has(key)) continue
        seen.add(key)
        out.push(item)
    }
    return out
}

// App-level close codes (4000–4999 are application-defined). The client treats any
// 4xxx close as deliberate rejection and does NOT auto-reconnect.
const CLOSE_ROOM_FULL  = 4001
const CLOSE_RATE_LIMIT = 4002
const CLOSE_IDLE       = 4003
const CLOSE_NO_ROOM    = 4004

// === Heartbeat ===
// Registered with setWebSocketAutoResponse in onStart, which means the runtime answers
// these without waking the Durable Object and without billing a request — so a heartbeat
// costs nothing and idle rooms stay free. Must match the pair the client sends verbatim
// (frontend multiplayer.js); the runtime compares the message exactly, and a mismatch
// silently falls through to onMessage instead.
const PING_MESSAGE = 'ping'
const PONG_MESSAGE = 'pong'

// How often at most a real action rewrites the persisted activity stamp (see #markActivity).
// The drag stream is 5Hz per node, so an unthrottled stamp would be a storage write per
// message; against a 30-minute sweep window a stamp up to a minute stale changes nothing.
const ACTIVITY_WRITE_MS = 60 * 1000

export class Room extends Server {
    // Hibernation: keep WebSocket connections open while the DO is evicted from memory.
    // Duration billing stops while hibernated — this is the single biggest cost lever,
    // so nothing in this class may hold timers/intervals or undone work between events.
    // Connection state (set via connection.setState) is persisted by PartyServer.
    static options = { hibernate: true }

    // In-memory only — reset on hibernation wake. The rate limiter getting a fresh bucket
    // after a wake is fine (briefly more permissive, never less safe).
    #rate = new Map() // connection.id → { tokens, last, drops }
    // Mirror of the persisted `lastActivity` stamp, so #markActivity can throttle writes
    // without reading storage. Loaded in onStart, so a wake does not reset the throttle.
    #lastActivityWrite = 0
    // Nodes whose payload has moved in memory but not yet been written — see the deferred
    // write note above. Lost on a wake, which is exactly what makes them "not yet durable".
    #dirtyNodes = new Set()
    #dirtySeq = false
    #flushTimer = null
    #dirtySince = 0

    async onStart() {
        // Rebuild the in-memory canvas from storage. PartyServer runs onStart inside
        // blockConcurrencyWhile, so no message is processed before the rebuild finishes —
        // a hibernation wake is indistinguishable from an always-awake room.
        this.canvas = { seq: (await this.ctx.storage.get('seq')) ?? 0, nodes: {}, ordNext: 1 }
        for (const [key, node] of await this.ctx.storage.list({ prefix: 'node:' })) {
            const nodeId = key.slice(5)
            // Writes are guarded by isNodeId, so no new reserved-name row can appear — but
            // a room persisted before that guard existed could still hold one, and
            // `nodes.__proto__ = node` would reassign the map's prototype on every wake.
            if (!isNodeId(nodeId)) { this.ctx.storage.delete(key); continue }
            this.canvas.nodes[nodeId] = node
            if ((node.ord ?? 0) >= this.canvas.ordNext) this.canvas.ordNext = node.ord + 1
        }

        // Seats rebuild the same way and for the same reason: a hibernation wake must not
        // stand everyone up. `seatOrd` keeps the player list in a stable order rather than
        // whatever order storage.list happens to return.
        this.seats = {}
        this.seatOrd = 1
        for (const [key, seat] of await this.ctx.storage.list({ prefix: 'seat:' })) {
            const seatId = key.slice(5)
            if (!isNodeId(seatId)) { this.ctx.storage.delete(key); continue }
            this.seats[seatId] = seat
            if ((seat.ord ?? 0) >= this.seatOrd) this.seatOrd = seat.ord + 1
        }
        // Set the first time somebody connects with a create ticket, and wiped along with
        // everything else by the idle sweep. Its absence is what lets onConnect tell "this
        // room was never made" apart from "this room is simply quiet right now".
        this.created = (await this.ctx.storage.get('created')) === true
        this.#lastActivityWrite = (await this.ctx.storage.get('lastActivity')) ?? 0

        // Answer the client's heartbeat in the runtime rather than here. This is what makes
        // a keepalive affordable: an auto-responded ping never wakes this object, never
        // reaches onMessage, and never bills a request — so it also never counts as activity
        // for the idle sweep, which is exactly right. A tab left open overnight is still
        // abandoned, and still gets swept.
        try {
            this.ctx.setWebSocketAutoResponse(
                new WebSocketRequestResponsePair(PING_MESSAGE, PONG_MESSAGE),
            )
        } catch {
            // Older runtime without auto-response — onMessage answers pings itself instead.
        }
    }

    // === Write-through persistence ===
    // Mutations update memory first (the serving copy), then mirror to storage. Writes are
    // deliberately not awaited: the runtime's output gate holds outgoing messages until
    // pending writes commit, so ordering is safe without paying latency in the handler.
    // Cost note: the 5Hz drag stream dominates write volume (one row per moved node per
    // packet). At ~$1 per million rows that is fractions of a cent per play session —
    // revisit only if telemetry says otherwise.
    // Node writes carry no seq — handleAction stamps seq once per applied action instead.
    // Writing it per node doubled the row count of every batch verb (a 1500-card drag was
    // 1500 node rows plus 1500 identical seq rows).
    #persistNode(nodeId) {
        // A durable write supersedes any pending one — the row about to be written already
        // carries whatever the drag stream had queued.
        this.#dirtyNodes.delete(nodeId)
        this.ctx.storage.put(`node:${nodeId}`, this.canvas.nodes[nodeId])
    }

    #persistDestroy(nodeIds) {
        // Drop pending writes for these nodes first. A dirty entry surviving the delete
        // would write the row back on the next flush and resurrect the node on the next wake.
        for (const id of nodeIds) this.#dirtyNodes.delete(id)
        // storage.delete() caps batches at 128 keys — chunk (a full-room clear is 1500).
        for (let i = 0; i < nodeIds.length; i += 100) {
            this.ctx.storage.delete(nodeIds.slice(i, i + 100).map(id => `node:${id}`))
        }
    }

    // Queue a node's row instead of writing it. Only position streams use this; see the
    // deferred write note at the top of the file for why, and for what it costs. Callers mark
    // every node in the batch and then call #scheduleFlush once — the timer is per batch, not
    // per node, or a 1500-card drag would re-arm it 1500 times per packet.
    #persistNodeSoon(nodeId) {
        this.#dirtyNodes.add(nodeId)
        if (this.#dirtySince === 0) this.#dirtySince = Date.now()
    }

    #scheduleFlush() {
        if (this.#dirtyNodes.size === 0) return
        // Two independent triggers, whichever comes first: too much pending, or pending for
        // too long. Both exist to bound the loss window, not to save writes.
        if (this.#dirtyNodes.size >= POSITION_FLUSH_MAX) return this.#flushDirty()
        if (Date.now() - this.#dirtySince >= POSITION_FLUSH_MAX_WAIT_MS) return this.#flushDirty()
        // Otherwise debounce on the trailing edge: each packet pushes the write out, so a
        // drag of any length costs one row per node once it settles.
        if (this.#flushTimer !== null) clearTimeout(this.#flushTimer)
        this.#flushTimer = setTimeout(() => {
            this.#flushTimer = null
            this.#flushDirty()
        }, POSITION_FLUSH_MS)
    }

    // Drain the queue. Safe to call at any time and cheap when there is nothing pending, so
    // every durable checkpoint calls it unconditionally.
    #flushDirty() {
        if (this.#flushTimer !== null) {
            clearTimeout(this.#flushTimer)
            this.#flushTimer = null
        }
        if (this.#dirtyNodes.size === 0 && !this.#dirtySeq) return
        // Snapshot and clear before writing: #persistNode mutates the set it would otherwise
        // be iterating.
        const ids = [...this.#dirtyNodes]
        this.#dirtyNodes.clear()
        this.#dirtySince = 0
        for (const nodeId of ids) {
            // Destroyed while dirty by a path that did not route through #persistDestroy —
            // the node is gone from memory, so there is nothing to write.
            if (this.canvas.nodes[nodeId]) this.#persistNode(nodeId)
        }
        if (this.#dirtySeq) {
            this.#dirtySeq = false
            this.#persistSeq()
        }
    }

    #persistSeq() {
        this.ctx.storage.put('seq', this.canvas.seq)
    }

    #persistSeat(seatId) {
        this.ctx.storage.put(`seat:${seatId}`, this.seats[seatId])
    }

    // === Seat control ===
    // Derived from live sockets on every read rather than stored. A stored controller would
    // outlive the socket that set it, and the first crashed tab would leave a seat nobody
    // could ever sit in — the exact failure the seat model exists to avoid.
    #controllerOf(seatId) {
        for (const conn of this.getConnections()) {
            if (conn.state?.seatId === seatId) return conn.state.clientId
        }
        return null
    }

    #controllers() {
        const out = {}
        for (const conn of this.getConnections()) {
            const s = conn.state
            if (s?.seatId && s?.clientId) out[s.seatId] = s.clientId
        }
        return out
    }

    // Seats as every client sees them — cards included. Replicated in full so a client can
    // take over any seat without a handoff, and can walk away from the room still holding
    // the whole table.
    #seatsPublic() {
        const out = {}
        for (const [seatId, seat] of Object.entries(this.seats)) {
            out[seatId] = {
                seatId,
                name: seat.name,
                sleeve: seat.sleeve,
                // Which end of the table this seat views from. Replicated so a goldfish
                // keeps its orientation for whoever claims it next.
                mirror: seat.mirror === true,
                // Where this seat's chip sits on the table, and so where a player who takes
                // the seat has their view centred. Same reasoning as mirror: it belongs to
                // the chair, not to whoever is currently in it.
                anchor: seat.anchor ?? { x: 0, y: 0 },
                ord: seat.ord ?? 0,
                hand: seat.hand ?? [],
            }
        }
        return out
    }

    #broadcastControl(seatId, clientId) {
        this.broadcast(JSON.stringify({
            kind: 'event', op: 'seat:control', byClientId: clientId ?? null,
            seatId, clientId: clientId ?? null,
        }))
    }

    // Stand a connection up, announcing the empty chair. Returns the seat it vacated.
    #releaseSeat(connection, { announce = true } = {}) {
        const me = connection.state
        const seatId = me?.seatId
        if (!seatId) return null
        connection.setState({ ...me, seatId: null })
        // Another socket of the same client may still be holding it — only announce the
        // seat as free once nothing is driving it.
        if (announce && this.#controllerOf(seatId) == null) this.#broadcastControl(seatId, null)
        return seatId
    }

    // Re-stamp `ord` for a top-first id list (orderedIds[0] = top of deck). Walking the
    // list bottom-up hands the highest stamp to the top card. Unknown ids are skipped —
    // the relative order of the known subset is still honored.
    #restampOrder(canvas, orderedIds) {
        for (let i = orderedIds.length - 1; i >= 0; i--) {
            const node = canvas.nodes[orderedIds[i]]
            if (!node) continue
            node.ord = canvas.ordNext++
            this.#persistNode(node.nodeId)
        }
    }

    // === Authoritative group sizes ===
    //
    // A pile's on-table spacing is a step function of how many cards it holds (nudgeForCount
    // in card.js), and the steps are cliffs — one card either side of a boundary is the
    // difference between a 10-unit diagonal fan and a 2-unit vertical stack. Clients used to
    // answer "how many?" from their own Konva layer, i.e. from whatever had finished
    // materialising locally. Mid-deal, mid-snapshot-replay or mid-tween that answer is wrong,
    // and because the client then WRITES the resulting positions, the wrong answer stuck and
    // got broadcast as truth on that client's next drag. Slower devices lost the race
    // consistently, so one tablet in a room would render every pile tighter than the others.
    //
    // This room is the only party that always holds complete membership, so it answers
    // instead: every action that changes a group stamps the resulting size of each group it
    // touched onto the broadcast event. Sizes are counted after the mutation has been applied
    // to canvas.nodes, so they describe the state the event leaves behind.
    #groupSizesFor(canvas, groupIds) {
        const wanted = new Set([...groupIds].filter(Boolean))
        if (wanted.size === 0) return undefined
        // Seed at zero so a group emptied by this action still reports — the client needs the
        // 0 to drop its cached size rather than keep laying out at the old count.
        const sizes = {}
        for (const id of wanted) sizes[id] = 0
        for (const node of Object.values(canvas.nodes)) {
            if (node.type !== 'card') continue
            const g = groupIdOf(node)
            if (g && wanted.has(g)) sizes[g]++
        }
        return sizes
    }

    async onConnect(connection, ctx) {
        // Count OTHER sockets — whether the just-accepted socket already shows up in
        // getConnections() at this point is an implementation detail we don't rely on.
        let others = 0
        for (const conn of this.getConnections()) {
            if (conn.id !== connection.id) others++
        }

        // === Room creation gate ===
        // A room only comes into being for a connection carrying a `create` intent, which
        // the Worker issues solely from /room/new and solely for a code it generated
        // itself (see src/index.js). The intent is covered by the ticket signature, so it
        // arrives here already trustworthy — the Worker rejected anything that didn't
        // verify. A `join` aimed at a room nobody ever created is turned away, which is
        // what stops a scripted client conjuring rooms at codes of its own choosing.
        //
        // Absent intent means the gate is off (no secret configured, or a client from
        // before this shipped), so it is treated as `create` to stay fail-open.
        let intent = 'create'
        try {
            intent = new URL(ctx?.request?.url ?? '').searchParams.get('i') || 'create'
        } catch { /* no request context — leave the gate open rather than lock everyone out */ }

        if (intent === 'create') {
            if (!this.created) {
                this.created = true
                this.ctx.storage.put('created', true)
            }
        } else if (!this.created && others === 0 && Object.keys(this.canvas.nodes).length === 0) {
            // Nothing here, nobody here, never created. Also covers rooms that predate
            // this gate: any room with players or content in it still lets joins through.
            connection.setState({ rejected: true })
            setTimeout(() => { try { connection.close(CLOSE_NO_ROOM, 'room not found') } catch {} }, 100)
            return
        }

        if (others >= LIMITS.connectionsPerRoom) {
            // Mark first so no message from this socket is ever processed, then close
            // after the upgrade completes — a close sent during the handshake itself
            // never reaches the client (observed against workerd).
            connection.setState({ rejected: true })
            setTimeout(() => { try { connection.close(CLOSE_ROOM_FULL, 'room full') } catch {} }, 100)
            return
        }
        this.#markActivity()
        // One sweep alarm per room; onAlarm re-arms it while the room stays active.
        if (await this.ctx.storage.getAlarm() === null) {
            await this.ctx.storage.setAlarm(Date.now() + LIMITS.idleSweepMs)
        }
    }

    // Idle sweep. Closing abandoned sockets frees room slots and guarantees a zombie tab
    // can't wake this DO forever.
    //
    // Activity is read from storage, never from an instance field. A DO hibernates after
    // ~10s of quiet and a wake rebuilds the instance, so any in-memory "has anyone acted?"
    // flag is false by the time an alarm 30 minutes later reads it — which swept busy tables
    // exactly like abandoned ones, and closed them with 4003, which the client treats as
    // deliberate and does not reconnect from. The two-strike counter only halved how often
    // that happened. A persisted stamp measures the thing directly, so the strikes are gone.
    //
    // A room is therefore swept somewhere between one and two sweep intervals after the last
    // real action, never while one is still arriving.
    async onAlarm() {
        // The sweep can end in deleteAll, so this is the last chance for anything still
        // pending to reach storage.
        this.#flushDirty()
        let count = 0
        for (const _ of this.getConnections()) count++
        if (count === 0) {
            await this.ctx.storage.deleteAll() // no re-arm — room goes fully idle
            return
        }

        const last = (await this.ctx.storage.get('lastActivity')) ?? 0
        if (Date.now() - last < LIMITS.idleSweepMs) {
            await this.ctx.storage.setAlarm(Date.now() + LIMITS.idleSweepMs)
            return
        }

        for (const conn of this.getConnections()) {
            try { conn.close(CLOSE_IDLE, 'idle timeout') } catch {}
        }
        await this.ctx.storage.deleteAll()
    }

    // Tell a sender we refused one of its messages.
    //
    // A refusal is invisible to every mechanism the client has. It happens before we parse,
    // so we cannot name the op; it never reaches applyAction, so it never takes a seq, so
    // it leaves no gap for the sequence check to find. The sender meanwhile applied the
    // action locally the moment the player made it. That combination — a change that exists
    // on exactly one client, with nothing anywhere that can notice — is the silent permanent
    // divergence the seq contract is meant to rule out, and it is the one hole the contract
    // cannot cover on its own. Hence this notice: the client answers it with a resync.
    #notifyDropped(connection, reason) {
        try { connection.send(JSON.stringify({ kind: 'dropped', reason })) } catch {}
    }

    // Token bucket per connection. A legit client never gets near the cap, so a drop means
    // either a bug on our side or an attack — either way the sender is told (once per run;
    // `drops` resets on the next accepted message) so a flood is never amplified back at
    // the flooder. Sustained flooding still closes the socket.
    #allowMessage(connection) {
        const now = Date.now()
        let s = this.#rate.get(connection.id)
        if (!s) { s = { tokens: LIMITS.msgBurst, last: now, drops: 0 }; this.#rate.set(connection.id, s) }
        s.tokens = Math.min(LIMITS.msgBurst, s.tokens + ((now - s.last) / 1000) * LIMITS.msgsPerSecond)
        s.last = now
        if (s.tokens >= 1) { s.tokens -= 1; s.drops = 0; return true }
        if (++s.drops >= LIMITS.floodCloseAfter) {
            try { connection.close(CLOSE_RATE_LIMIT, 'rate limit') } catch {}
        } else if (s.drops === 1) {
            this.#notifyDropped(connection, 'rate')
        }
        return false
    }

    // Activity for the idle sweep. Persisted, because onAlarm runs on the far side of a
    // hibernation wake and an instance field would be false by then — see onAlarm.
    #markActivity() {
        const now = Date.now()
        if (now - this.#lastActivityWrite < ACTIVITY_WRITE_MS) return
        this.#lastActivityWrite = now
        this.ctx.storage.put('lastActivity', now)
    }

    onMessage(connection, message) {
        if (connection.state?.rejected) return // over-cap socket awaiting its close
        const size = typeof message === 'string' ? message.length : message.byteLength
        // The client mirrors this cap and refuses to send past it, so reaching here means
        // the two have drifted apart — worth telling the client rather than dropping into
        // the same silence. The reply is 30 bytes against their 512 KB, so answering an
        // oversize flood costs us nothing worth rationing.
        if (size > LIMITS.messageBytes) return this.#notifyDropped(connection, 'size')
        if (!this.#allowMessage(connection)) return

        // Only reached when auto-response is not in effect (see onStart). Answering here
        // costs a wake, but the alternative is worse: an unanswered ping trips the client's
        // pongTimeout and puts it into a permanent reconnect loop. Deliberately before
        // #markActivity — a heartbeat is not a player doing something.
        if (message === PING_MESSAGE) {
            try { connection.send(PONG_MESSAGE) } catch {}
            return
        }

        this.#markActivity()

        let m
        try {
            const text = typeof message === 'string' ? message : new TextDecoder().decode(message)
            m = JSON.parse(text)
        } catch { return }

        if (m.kind === 'hello')  return this.handleHello(connection, m)
        if (m.kind === 'action') return this.handleAction(connection, m)
        if (m.kind === 'resync') return this.handleResync(connection)
    }

    onClose(connection) {
        // Whatever this socket was dragging is over, and it may have been the only thing
        // keeping the room awake.
        this.#flushDirty()
        this.#rate.delete(connection.id)
        const me = connection.state
        if (!me?.seatId) return
        // The seat stays — its hand is still in storage, waiting for whoever sits down next.
        // Only the grip on it is released. #releaseSeat handles the overlapping-socket case
        // (a reconnect can briefly run two sockets for one client).
        this.#releaseSeat(connection)
    }

    handleHello(connection, hello) {
        // Same guard as node ids: clientId and seatId key plain objects, where a reserved
        // name would reassign the object's prototype instead of adding an entry.
        if (!isNodeId(hello.clientId)) return
        // A connection's identity is fixed at first hello. Letting a re-hello switch
        // clientId would leave the old identity holding a seat nothing can release.
        if (connection.state?.clientId && connection.state.clientId !== hello.clientId) return

        const prev = connection.state ?? {}
        connection.setState({ clientId: hello.clientId, seatId: prev.seatId ?? null })

        // Reattachment. A reload is not a new player — it is the same person coming back to
        // a chair they were already in, so hand it back if it's still empty. Without this,
        // every refresh would mint another seat and the table would fill up with the same
        // person's abandoned goldfish.
        if (!connection.state.seatId) {
            for (const seat of Object.values(this.seats)) {
                if (seat.lastClientId !== hello.clientId) continue
                if (this.#controllerOf(seat.seatId) != null) continue
                connection.setState({ clientId: hello.clientId, seatId: seat.seatId })
                break
            }
        }

        const mySeatId = connection.state.seatId ?? null

        this.#sendSnapshot(connection)

        // The snapshot already carried every seat's cards, so reattaching needs nothing but
        // the announcement that this chair is occupied again.
        if (mySeatId) this.#broadcastControl(mySeatId, hello.clientId)
    }

    // The whole room, as of right now. Served from `this.canvas` rather than storage, so it
    // is current even while position writes sit pending in the deferred-write queue.
    #sendSnapshot(connection) {
        connection.send(JSON.stringify({
            kind: 'snapshot',
            seq: this.canvas.seq,
            nodes: this.canvas.nodes,
            seats: this.#seatsPublic(),
            controllers: this.#controllers(),
            clients: this.#clientIds(),
            yourClientId: connection.state?.clientId ?? null,
            yourSeatId: connection.state?.seatId ?? null,
        }))
    }

    // A client noticed a gap in the event sequence and is asking to be put back in step.
    //
    // Every canvas event carries a monotonic `seq`; WebSocket delivery is ordered, so a
    // number that skips means the client missed something. It cannot repair that from
    // events alone — every handler on that side ignores events about nodes it doesn't
    // have, so one missed create silently diverges that client for the rest of the game.
    // A snapshot is the only honest answer.
    //
    // Deliberately NOT exempt from the rate limiter above: a snapshot can be 1500 nodes,
    // which makes it the most expensive thing a client can ask for and the last thing that
    // should be spammable. The client retries instead (see requestResync in multiplayer.js).
    handleResync(connection) {
        if (!connection.state?.clientId) return // hasn't hello'd; nothing to be in step with
        this.#sendSnapshot(connection)
    }

    // Distinct clients currently connected. The client uses this to tell "I am alone in a
    // fresh room, my table is the table" from "I am joining someone else's game".
    #clientIds() {
        const out = new Set()
        for (const conn of this.getConnections()) {
            if (conn.state?.clientId) out.add(conn.state.clientId)
        }
        return [...out]
    }

    handleAction(connection, action) {
        // Identity gate: a socket must hello before acting, and may only act as itself.
        // Everything downstream (event stamps, seat ownership, hand writes) trusts
        // action.clientId, so it must equal the identity bound to this connection.
        const me = connection.state
        if (!me?.clientId) return
        if (action.clientId !== me.clientId) return

        // Seat traffic is presence, not canvas state: no seq bump, and each verb has its
        // own authorisation rule (you may only write the seat you are sitting in).
        switch (action.op) {
            case 'seat:create':  return this.handleSeatCreate(connection, action)
            case 'seat:claim':   return this.handleSeatClaim(connection, action)
            case 'seat:release': return void this.#releaseSeat(connection)
            case 'seat:update':  return this.handleSeatUpdate(connection, action)
            case 'seat:destroy': return this.handleSeatDestroy(connection, action)
            case 'seat:hand':    return this.handleSeatHand(connection, action)
            case 'table:reset':  return this.handleTableReset(connection, action)
        }

        // Everything that is not a position stream is a durable checkpoint: drain whatever the
        // stream left pending before applying it, so storage never sees a later write land on
        // top of an earlier one it never received.
        const deferred = DEFERRED_OPS.has(action.op)
        if (!deferred) this.#flushDirty()

        const event = this.applyAction(this.canvas, action)
        if (!event) return
        // seq rides with the writes it stamps rather than getting ahead of them — a wake that
        // restored 1s-old positions under a current seq would be describing a table that never
        // existed.
        if (deferred) this.#dirtySeq = true
        else this.#persistSeq()
        // Drag-stream ops arrive at ~20Hz while the originator is mid-drag; echoing them
        // back would fight the local drag. The originator already has local truth — only
        // peers need these. Everything else still echoes to everyone.
        const skipSender = action.op === 'nodes:move' || action.op === 'nodes:transform'
        this.broadcast(JSON.stringify(event), skipSender ? [connection.id] : undefined)
        // ...but the sender still has to stay in step with the sequence, or its own drag
        // would read as a run of gaps and trigger a resync on every packet. Send the number
        // without the payload: nothing here can fight the local drag, and outbound messages
        // are free (only inbound ones bill).
        if (skipSender) {
            try { connection.send(JSON.stringify({ kind: 'seq', seq: event.seq })) } catch {}
        }
    }

    // Returns the broadcast event payload, or null if the action was a no-op.
    applyAction(canvas, action) {
        const stamp = { byClientId: action.clientId ?? null }

        switch (action.op) {
            case 'node:create': {
                if (!isNodeId(action.nodeId)) return null
                if (canvas.nodes[action.nodeId]) return null
                if (Object.keys(canvas.nodes).length >= LIMITS.nodesPerRoom) return null
                if (JSON.stringify(action.payload ?? null).length > LIMITS.nodePayloadBytes) return null
                canvas.seq++
                canvas.nodes[action.nodeId] = {
                    nodeId: action.nodeId,
                    type: action.type,
                    payload: action.payload,
                    ord: canvas.ordNext++,
                }
                this.#persistNode(action.nodeId)
                return {
                    kind: 'event', seq: canvas.seq, op: 'node:create', ...stamp,
                    nodeId: action.nodeId, type: action.type, payload: action.payload,
                    groupSizes: this.#groupSizesFor(canvas, [groupIdOf(canvas.nodes[action.nodeId])]),
                }
            }

            // Seeding a whole local table into an empty room. Same shape as deck:create
            // minus the deal arguments — one message carrying many nodes, one seq bump, one
            // broadcast.
            //
            // The client used to seed a node per message, which put a 120-node table into
            // the room as 120 messages in a single tick. Against a 60-token bucket that is
            // sixty accepted and sixty refused, so half the table simply never arrived — the
            // seeder saw a full board and everyone else saw half of one. Batching is what
            // actually fixes that; the dropped notice only makes it visible.
            case 'nodes:seed': {
                const incoming = boundEntries(action.nodes, n => n?.nodeId)
                if (incoming.length === 0) return null
                if (Object.keys(canvas.nodes).length + incoming.length > LIMITS.nodesPerRoom) return null
                const applied = []
                for (const n of incoming) {
                    if (canvas.nodes[n.nodeId]) continue
                    if (JSON.stringify(n.payload ?? null).length > LIMITS.nodePayloadBytes) continue
                    canvas.nodes[n.nodeId] = {
                        nodeId: n.nodeId, type: n.type, payload: n.payload,
                        // Assigned in array order, exactly as the per-message seed did, so
                        // the table's stacking survives the batching unchanged.
                        ord: canvas.ordNext++,
                    }
                    applied.push({ nodeId: n.nodeId, type: n.type, payload: n.payload })
                }
                if (applied.length === 0) return null
                canvas.seq++
                for (const n of applied) this.#persistNode(n.nodeId)
                return {
                    kind: 'event', seq: canvas.seq, op: 'nodes:seed', ...stamp,
                    nodes: applied,
                    groupSizes: this.#groupSizesFor(canvas, applied.map(n => groupIdOf(canvas.nodes[n.nodeId]))),
                }
            }

            case 'deck:create': {
                const incoming = boundEntries(action.nodes, n => n?.nodeId)
                if (incoming.length === 0) return null
                if (Object.keys(canvas.nodes).length + incoming.length > LIMITS.nodesPerRoom) return null
                const applied = []
                for (const n of incoming) {
                    if (!n.nodeId || typeof n.nodeId !== 'string' || canvas.nodes[n.nodeId]) continue
                    if (JSON.stringify(n.payload ?? null).length > LIMITS.nodePayloadBytes) continue
                    canvas.nodes[n.nodeId] = {
                        nodeId: n.nodeId, type: n.type, payload: n.payload,
                        ord: canvas.ordNext++,
                    }
                    applied.push(n)
                }
                if (applied.length === 0) return null
                canvas.seq++
                for (const n of applied) this.#persistNode(n.nodeId)
                return {
                    kind: 'event', seq: canvas.seq, op: 'deck:create', ...stamp,
                    deckArgs: action.deckArgs,
                    nodeIds: applied.map(n => n.nodeId),
                    groupSizes: this.#groupSizesFor(canvas, applied.map(groupIdOf)),
                    // The dealer's actual cards, position and rotation included. Peers replay
                    // these rather than re-running the deal: addDeck jitters each card's angle
                    // with Math.random(), so a re-run produces a visibly different pile. Costs
                    // one deck's worth of payload on the wire — the same data a snapshot ships,
                    // and only on the one message that deals a deck.
                    nodes: applied,
                }
            }

            case 'nodes:move': {
                const moves = boundEntries(action.moves, m => m?.nodeId)
                if (moves.length === 0) return null
                const applied = []
                for (const move of moves) {
                    const node = canvas.nodes[move.nodeId]
                    if (!node) continue
                    node.payload = { ...node.payload, x: move.x, y: move.y }
                    applied.push({ nodeId: move.nodeId, x: move.x, y: move.y })
                }
                if (applied.length === 0) return null
                canvas.seq++
                for (const m of applied) this.#persistNodeSoon(m.nodeId)
                this.#scheduleFlush()
                return { kind: 'event', seq: canvas.seq, op: 'nodes:move', ...stamp, moves: applied }
            }

            case 'nodes:transform': {
                const transforms = boundEntries(action.transforms, t => t?.nodeId)
                if (transforms.length === 0) return null
                const applied = []
                for (const t of transforms) {
                    const node = canvas.nodes[t.nodeId]
                    if (!node) continue
                    node.payload = {
                        ...node.payload,
                        x: t.x, y: t.y, scaleX: t.scaleX, scaleY: t.scaleY, rotation: t.rotation,
                    }
                    applied.push(t)
                }
                if (applied.length === 0) return null
                canvas.seq++
                for (const t of applied) this.#persistNodeSoon(t.nodeId)
                this.#scheduleFlush()
                return { kind: 'event', seq: canvas.seq, op: 'nodes:transform', ...stamp, transforms: applied }
            }

            case 'nodes:patch': {
                const patches = boundEntries(action.patches, p => p?.nodeId)
                if (patches.length === 0) return null
                const applied = []
                for (const p of patches) {
                    const node = canvas.nodes[p.nodeId]
                    if (!node || !p.props) continue
                    // Patch props merge into options and accumulate — without a ceiling,
                    // repeated patches with novel keys grow a node without bound.
                    const options = { ...(node.payload?.options ?? {}), ...p.props }
                    if (JSON.stringify(options).length > LIMITS.nodePayloadBytes) continue
                    node.payload = { ...node.payload, options }
                    applied.push(p)
                }
                if (applied.length === 0) return null
                canvas.seq++
                for (const p of applied) this.#persistNode(p.nodeId)
                return { kind: 'event', seq: canvas.seq, op: 'nodes:patch', ...stamp, patches: applied }
            }

            case 'nodes:destroy': {
                const nodeIds = boundEntries(action.nodeIds, id => id)
                if (nodeIds.length === 0) return null
                const applied = []
                // Collected before the delete — afterwards there is nothing left to ask.
                const bereavedGroups = new Set()
                for (const id of nodeIds) {
                    if (canvas.nodes[id]) {
                        const g = groupIdOf(canvas.nodes[id])
                        if (g) bereavedGroups.add(g)
                        delete canvas.nodes[id]
                        applied.push(id)
                    }
                }
                if (applied.length === 0) return null
                canvas.seq++
                this.#persistDestroy(applied)
                return {
                    kind: 'event', seq: canvas.seq, op: 'nodes:destroy', ...stamp, nodeIds: applied,
                    groupSizes: this.#groupSizesFor(canvas, bereavedGroups),
                }
            }

            case 'nodes:moveZ': {
                const zIds = boundEntries(action.nodeIds, id => id)
                if (zIds.length === 0) return null
                canvas.seq++
                // Mirror the client's one-step moveUp/moveDown in ord-space, per band —
                // same iteration order as applyMoveZ (topmost first going up, bottom-most
                // first going down), so selections shift without leapfrogging each other.
                const moved = zIds.map(id => canvas.nodes[id]).filter(Boolean)
                const dirty = new Set()
                for (const band of new Set(moved.map(bandOf))) {
                    const lane = Object.values(canvas.nodes)
                        .filter(n => bandOf(n) === band)
                        .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
                    const inBand = moved
                        .filter(n => bandOf(n) === band)
                        .sort((a, b) => lane.indexOf(a) - lane.indexOf(b))
                    if (action.direction > 0) inBand.reverse()
                    for (const node of inBand) {
                        const idx = lane.indexOf(node)
                        const swapWith = action.direction > 0 ? lane[idx + 1] : lane[idx - 1]
                        if (!swapWith) continue
                        ;[node.ord, swapWith.ord] = [swapWith.ord, node.ord]
                        ;[lane[idx], lane[idx + (action.direction > 0 ? 1 : -1)]] = [swapWith, node]
                        dirty.add(node.nodeId); dirty.add(swapWith.nodeId)
                    }
                }
                for (const id of dirty) this.#persistNode(id)
                return {
                    kind: 'event', seq: canvas.seq, op: 'nodes:moveZ', ...stamp,
                    nodeIds: zIds, direction: action.direction,
                }
            }

            case 'card:merge': {
                const movingIds = boundEntries(action.movingIds, id => id)
                // targetId is a direct key lookup below, so it needs the same guard the
                // batch ids get from boundEntries.
                if (!isNodeId(action.targetId) || movingIds.length === 0) return null
                // The originator resolves the merged group's id (it may mint a fresh one)
                // and sends it along, so every peer AND the server land on the same id —
                // without it, each client would mint its own and groups would diverge.
                if (typeof action.groupId !== 'string' || !action.groupId || action.groupId.length > 64) return null
                canvas.seq++
                // Mirror the client restack: existing members (bottom→top), then the
                // moving cards on top — the whole pile surfaces above everything else.
                const movingSet = new Set(movingIds)
                const dest = Object.values(canvas.nodes)
                    .filter(n => n.payload?.options?.groupId === action.groupId && !movingSet.has(n.nodeId))
                const target = canvas.nodes[action.targetId]
                if (target && dest.length === 0) dest.push(target)
                const moving = movingIds.map(id => canvas.nodes[id]).filter(Boolean)
                // Where the moving cards came from — those piles shrink by this merge, and a
                // pile emptied entirely needs its 0 reported so clients drop its cached size.
                const vacatedGroups = new Set(moving.map(groupIdOf).filter(g => g && g !== action.groupId))
                const finalOrder = [
                    ...dest.sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0)),
                    ...moving.sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0)),
                ]
                for (const node of finalOrder) {
                    node.payload = {
                        ...node.payload,
                        options: { ...(node.payload?.options ?? {}), groupId: action.groupId },
                    }
                    node.ord = canvas.ordNext++
                    this.#persistNode(node.nodeId)
                }
                return {
                    kind: 'event', seq: canvas.seq, op: 'card:merge', ...stamp,
                    movingIds, targetId: action.targetId, groupId: action.groupId,
                    groupSizes: this.#groupSizesFor(canvas, [action.groupId, ...vacatedGroups]),
                }
            }

            case 'card:shuffle': {
                if (!action.groupId) return null
                const memberIds = Object.values(canvas.nodes)
                    .filter(n => n.type === 'card' && n.payload?.options?.groupId === action.groupId)
                    .map(n => n.nodeId)
                if (memberIds.length < 2) return null
                const orderedIds = [...memberIds]
                for (let i = orderedIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[orderedIds[i], orderedIds[j]] = [orderedIds[j], orderedIds[i]]
                }
                canvas.seq++
                this.#restampOrder(canvas, orderedIds)
                return {
                    kind: 'event', seq: canvas.seq, op: 'card:shuffle', ...stamp,
                    groupId: action.groupId, orderedIds,
                    // Membership is untouched by a shuffle; stamped anyway because it costs one
                    // integer and gives any client that drifted a free chance to re-converge.
                    groupSizes: this.#groupSizesFor(canvas, [action.groupId]),
                }
            }

            case 'card:setGroupOrder': {
                const orderedIds = boundEntries(action.orderedIds, id => id)
                if (!action.groupId || orderedIds.length === 0) return null
                canvas.seq++
                this.#restampOrder(canvas, orderedIds)
                return {
                    kind: 'event', seq: canvas.seq, op: 'card:setGroupOrder', ...stamp,
                    groupId: action.groupId, orderedIds,
                    groupSizes: this.#groupSizesFor(canvas, [action.groupId]),
                }
            }

            case 'card:makeGroup': {
                const memberIds = boundEntries(action.nodeIds, id => id)
                if (memberIds.length < 2) return null
                const groupId = `g${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
                canvas.seq++
                const priorGroups = new Set()
                for (const id of memberIds) {
                    const node = canvas.nodes[id]
                    if (!node) continue
                    const prior = groupIdOf(node)
                    if (prior && prior !== groupId) priorGroups.add(prior)
                    node.payload = {
                        ...node.payload,
                        options: { ...(node.payload?.options ?? {}), groupId },
                    }
                    this.#persistNode(id)
                }
                return {
                    kind: 'event', seq: canvas.seq, op: 'card:makeGroup', ...stamp,
                    groupId, nodeIds: memberIds,
                    groupSizes: this.#groupSizesFor(canvas, [groupId, ...priorGroups]),
                }
            }

            case 'card:draw': {
                const args = action.args ?? {}
                const groupId = typeof args.groupId === 'string' ? args.groupId : null

                // This op used to be a pure pass-through — clients applied the draw locally and
                // the room's node map kept every drawn card, still carrying its old groupId, for
                // the life of the room. That was already wrong for late joiners (a snapshot
                // re-dealt cards drawn hours before) and it makes group sizes unusable, since a
                // pile would be counted at its dealt size forever. So the draw is applied here
                // too, and #groupSizesFor gets something true to count.
                //
                // Membership selection mirrors getDrawContext in card.js: `ord` is this room's
                // copy of z-order (higher = nearer the top of the pile), which is exactly what
                // that function sorts on, so both sides lift the same cards off the same end.
                const drawn = []
                if (groupId) {
                    const members = Object.values(canvas.nodes)
                        .filter(n => n.type === 'card' && groupIdOf(n) === groupId)
                        .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
                    if (args.nodeId != null) {
                        const one = members.find(n => n.nodeId === args.nodeId)
                        if (one) drawn.push(one)
                    } else if (members.length > 0) {
                        // Bounded by the pile itself, so a bogus count can only ever take the
                        // whole pile — never index outside it.
                        const want = Math.max(1, Math.floor(Number(args.count) || 1))
                        const n = Math.min(want, members.length)
                        drawn.push(...(args.from === 'bottom'
                            ? members.slice(0, n)
                            : members.slice(members.length - n)))
                    }
                }

                canvas.seq++

                // to:'hand' takes the card off the table entirely; to:'board' only lifts it out
                // of the pile and leaves it loose. Any other value is not a draw the client
                // applies either, so nothing moves here.
                const drawnDestroyed = []
                for (const node of drawn) {
                    if (args.to === 'hand') {
                        delete canvas.nodes[node.nodeId]
                        drawnDestroyed.push(node.nodeId)
                    } else if (args.to === 'board') {
                        node.payload = {
                            ...node.payload,
                            options: { ...(node.payload?.options ?? {}), groupId: null },
                        }
                        this.#persistNode(node.nodeId)
                    }
                }
                if (drawnDestroyed.length) this.#persistDestroy(drawnDestroyed)

                return {
                    kind: 'event', seq: canvas.seq, op: 'card:draw', ...stamp, args: action.args,
                    groupSizes: this.#groupSizesFor(canvas, [groupId]),
                }
            }

            case 'dice:roll': {
                const diceIds = boundEntries(action.nodeIds, id => id)
                if (diceIds.length === 0) return null
                const rolls = []
                for (const id of diceIds) {
                    const node = canvas.nodes[id]
                    if (!node || node.type !== 'dice') continue
                    const opt = node.payload?.options ?? {}
                    const min = opt.min ?? 1
                    const max = opt.max ?? 6
                    const step = opt.step && opt.step > 0 ? opt.step : 1
                    const buckets = Math.max(1, Math.floor((max - min) / step) + 1)
                    const value = min + Math.floor(Math.random() * buckets) * step
                    rolls.push({ nodeId: id, value })
                    node.payload = { ...node.payload, options: { ...opt, value } }
                }
                if (rolls.length === 0) return null
                canvas.seq++
                for (const r of rolls) this.#persistNode(r.nodeId)
                return { kind: 'event', seq: canvas.seq, op: 'dice:roll', ...stamp, rolls }
            }

            default:
                return null
        }
    }

    // === Seat verbs ===

    // The client mints the seatId, exactly as it does for nodes. That is what lets a solo
    // player's existing seats seed a fresh room through the same code path the "Add
    // Goldfish" button uses — the ids they already have stay the ids the room knows.
    handleSeatCreate(connection, action) {
        const seat = action.seat
        if (!isNodeId(seat?.seatId)) return
        if (this.seats[seat.seatId]) return
        if (Object.keys(this.seats).length >= LIMITS.seatsPerRoom) return

        const hand = this.#sanitizeHand(seat.hand)
        if (hand === null) return

        this.seats[seat.seatId] = {
            seatId: seat.seatId,
            name:   typeof seat.name   === 'string' ? seat.name.slice(0, LIMITS.nameChars)     : 'Goldfish',
            sleeve: typeof seat.sleeve === 'string' ? seat.sleeve.slice(0, LIMITS.sleeveChars) : '0 0 100',
            mirror: seat.mirror === true,
            anchor: this.#sanitizeAnchor(seat.anchor) ?? { x: 0, y: 0 },
            hand,
            lastClientId: null,
            ord: this.seatOrd++,
        }
        this.#persistSeat(seat.seatId)

        // Echoed to the sender too: the client treats the room's seat list as truth while
        // online, so its own new seat arrives the same way everyone else's does.
        this.broadcast(JSON.stringify({
            kind: 'event', op: 'seat:create', byClientId: connection.state.clientId,
            seat: this.#seatsPublic()[seat.seatId],
        }))
    }

    // Sitting down. Arbitrated here rather than optimistically on the client because two
    // people can click the same empty chair in the same tick and exactly one of them can
    // have it. The loser's request is simply dropped — their UI never moved.
    handleSeatClaim(connection, action) {
        const me = connection.state
        const seat = this.seats[action.seatId]
        if (!seat) return
        if (me.seatId === seat.seatId) return

        const holder = this.#controllerOf(seat.seatId)
        if (holder != null && holder !== me.clientId) return // taken

        // Stand up first, quietly — the two control events are announced together below so
        // peers never see this client briefly seated in two places.
        const vacated = this.#releaseSeat(connection, { announce: false })

        connection.setState({ ...me, seatId: seat.seatId })
        seat.lastClientId = me.clientId
        this.#persistSeat(seat.seatId)

        if (vacated && this.#controllerOf(vacated) == null) this.#broadcastControl(vacated, null)
        this.#broadcastControl(seat.seatId, me.clientId)
        // No handoff needed: the cards in this chair were replicated to every client the
        // moment they were played, so the claimer is already holding them.
    }

    // Name and sleeve of the seat you are sitting in, and only that one. An unclaimed
    // goldfish is renamed by sitting in it first — which also stops one client quietly
    // recolouring another player's cards.
    handleSeatUpdate(connection, action) {
        const me = connection.state
        if (me.seatId !== action.seatId) return
        const seat = this.seats[action.seatId]
        if (!seat) return

        let changed = false
        if (typeof action.name   === 'string')  { seat.name   = action.name.slice(0, LIMITS.nameChars);     changed = true }
        if (typeof action.sleeve === 'string')  { seat.sleeve = action.sleeve.slice(0, LIMITS.sleeveChars); changed = true }
        if (typeof action.mirror === 'boolean') { seat.mirror = action.mirror;                              changed = true }
        // Dropped rather than clamped when malformed: a NaN anchor renders as a chip at no
        // position at all, which the player can then never grab to put right.
        const anchor = this.#sanitizeAnchor(action.anchor)
        if (anchor)                             { seat.anchor = anchor;                                     changed = true }
        if (!changed) return
        this.#persistSeat(action.seatId)

        this.broadcast(JSON.stringify({
            kind: 'event', op: 'seat:update', byClientId: me.clientId,
            seatId: seat.seatId, name: seat.name, sleeve: seat.sleeve, mirror: seat.mirror === true,
            anchor: seat.anchor ?? { x: 0, y: 0 },
        }), [connection.id])
    }

    // Removing a seat bins its hand with it, so only a free seat can go — cards somebody is
    // holding are not another client's to discard. The last seat stays: a table with no
    // seats has nowhere to draw to.
    handleSeatDestroy(connection, action) {
        const seat = this.seats[action.seatId]
        if (!seat) return
        if (this.#controllerOf(action.seatId) != null) return
        if (Object.keys(this.seats).length <= 1) return

        delete this.seats[action.seatId]
        this.ctx.storage.delete(`seat:${action.seatId}`)

        this.broadcast(JSON.stringify({
            kind: 'event', op: 'seat:destroy', byClientId: connection.state.clientId,
            seatId: action.seatId,
        }))
    }

    // The controller's hand contents. Only the client sitting in a seat may write that
    // seat's hand — the write gate is where authority lives, not the read path.
    // A reset is one player putting the whole room's table back, so the other players have to
    // hear about it as an INSTRUCTION rather than as state. The canvas half already travels on
    // its own — nodes:destroy, then the re-deal — and this carries the half that cannot: each
    // client's own seat and its own hand, which by the rule above only that client may write.
    //
    // So it changes nothing here. No seq, no persistence, and no place in the snapshot: a
    // client joining afterwards is handed the table the reset produced, which is the entire
    // story. Replaying the instruction at it would only tell it to bin a hand it never held.
    //
    // Not ownership-scoped, like the node wipe it arrives beside: anyone at the table may
    // clear it, the same rule the delete key already follows.
    handleTableReset(connection, action) {
        this.broadcast(JSON.stringify({
            kind: 'event', op: 'table:reset', byClientId: connection.state.clientId,
        }), [connection.id])
    }

    handleSeatHand(connection, action) {
        const me = connection.state
        if (me.seatId !== action.seatId) return // only ever your own hand
        const seat = this.seats[action.seatId]
        if (!seat) return

        const hand = this.#sanitizeHand(action.hand)
        if (hand === null) return
        seat.hand = hand
        this.#persistSeat(action.seatId)

        // Replicated to every client so each one holds the complete table. Not echoed to
        // the sender, whose UI renders from its own array.
        this.broadcast(JSON.stringify({
            kind: 'event', op: 'seat:hand', byClientId: me.clientId,
            seatId: seat.seatId, hand,
        }), [connection.id])
    }

    // Returns the hand to store, or null to reject the message outright. Rejecting rather
    // than truncating is deliberate: a silently shortened hand is a client and server that
    // disagree about which cards a player holds, which is worse than a dropped update.
    // A seat's chip position. Null for anything that isn't a pair of finite numbers, so the
    // caller can leave the stored anchor alone rather than overwrite it with rubbish.
    #sanitizeAnchor(anchor) {
        if (anchor == null) return null
        const x = Number(anchor.x)
        const y = Number(anchor.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null
        const clamp = (n) => Math.max(-LIMITS.anchorRange, Math.min(LIMITS.anchorRange, n))
        return { x: clamp(x), y: clamp(y) }
    }

    #sanitizeHand(hand) {
        if (hand == null) return []
        if (!Array.isArray(hand)) return null
        if (hand.length > LIMITS.handEntries) return null
        if (JSON.stringify(hand).length > LIMITS.handBytes) return null
        return hand
    }
}
