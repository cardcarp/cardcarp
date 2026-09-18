import { Server } from 'partyserver'

const LIMITS = {
    connectionsPerRoom: 8,
    messageBytes: 512 * 1024,
    nodesPerRoom: 1500,
    nodePayloadBytes: 8 * 1024,
    seatsPerRoom: 8,
    handEntries: 200,
    handBytes: 96 * 1024,
    nameChars: 40,
    sleeveChars: 32,
    anchorRange: 4000,
    msgsPerSecond: 15,
    msgBurst: 60,
    floodCloseAfter: 120,
    idleSweepMs: 30 * 60 * 1000,
}

const POSITION_FLUSH_MS = 400
const POSITION_FLUSH_MAX_WAIT_MS = 2000
const POSITION_FLUSH_MAX = 600
const DEFERRED_OPS = new Set(['nodes:move', 'nodes:transform'])

const BAND = { board: 0, rect: 1, arrow: 1, text: 1, card: 2, dice: 3, marker: 3 }
const bandOf = (node) => BAND[node.type] ?? 2
const groupIdOf = (node) => node?.payload?.options?.groupId ?? null

// Node ids come from clients and key a plain object.
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const isNodeId = (key) => (
    typeof key === 'string' && key.length > 0 && key.length <= 64 && !RESERVED_KEYS.has(key)
)

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

const CLOSE_ROOM_FULL  = 4001
const CLOSE_RATE_LIMIT = 4002
const CLOSE_IDLE       = 4003
const CLOSE_NO_ROOM    = 4004

const PING_MESSAGE = 'ping'
const PONG_MESSAGE = 'pong'

const ACTIVITY_WRITE_MS = 60 * 1000

export class Room extends Server {
    // Hibernation stops duration billing, so nothing here may hold a timer between events.
    static options = { hibernate: true }

    #rate = new Map()
    #lastActivityWrite = 0
    #dirtyNodes = new Set()
    #dirtySeq = false
    #flushTimer = null
    #dirtySince = 0

    async onStart() {
        this.canvas = { seq: (await this.ctx.storage.get('seq')) ?? 0, nodes: {}, ordNext: 1 }
        for (const [key, node] of await this.ctx.storage.list({ prefix: 'node:' })) {
            const nodeId = key.slice(5)
            if (!isNodeId(nodeId)) { this.ctx.storage.delete(key); continue }
            this.canvas.nodes[nodeId] = node
            if ((node.ord ?? 0) >= this.canvas.ordNext) this.canvas.ordNext = node.ord + 1
        }

        this.seats = {}
        this.seatOrd = 1
        for (const [key, seat] of await this.ctx.storage.list({ prefix: 'seat:' })) {
            const seatId = key.slice(5)
            if (!isNodeId(seatId)) { this.ctx.storage.delete(key); continue }
            this.seats[seatId] = seat
            if ((seat.ord ?? 0) >= this.seatOrd) this.seatOrd = seat.ord + 1
        }
        this.created = (await this.ctx.storage.get('created')) === true
        this.#lastActivityWrite = (await this.ctx.storage.get('lastActivity')) ?? 0

        try {
            this.ctx.setWebSocketAutoResponse(
                new WebSocketRequestResponsePair(PING_MESSAGE, PONG_MESSAGE),
            )
        } catch {
            // Older runtimes lack auto-response; onMessage answers pings instead.
        }
    }

    #persistNode(nodeId) {
        this.#dirtyNodes.delete(nodeId)
        this.ctx.storage.put(`node:${nodeId}`, this.canvas.nodes[nodeId])
    }

    #persistDestroy(nodeIds) {
        for (const id of nodeIds) this.#dirtyNodes.delete(id)
        for (let i = 0; i < nodeIds.length; i += 100) {
            this.ctx.storage.delete(nodeIds.slice(i, i + 100).map(id => `node:${id}`))
        }
    }

    #persistNodeSoon(nodeId) {
        this.#dirtyNodes.add(nodeId)
        if (this.#dirtySince === 0) this.#dirtySince = Date.now()
    }

    #scheduleFlush() {
        if (this.#dirtyNodes.size === 0) return
        if (this.#dirtyNodes.size >= POSITION_FLUSH_MAX) return this.#flushDirty()
        if (Date.now() - this.#dirtySince >= POSITION_FLUSH_MAX_WAIT_MS) return this.#flushDirty()
        if (this.#flushTimer !== null) clearTimeout(this.#flushTimer)
        this.#flushTimer = setTimeout(() => {
            this.#flushTimer = null
            this.#flushDirty()
        }, POSITION_FLUSH_MS)
    }

    #flushDirty() {
        if (this.#flushTimer !== null) {
            clearTimeout(this.#flushTimer)
            this.#flushTimer = null
        }
        if (this.#dirtyNodes.size === 0 && !this.#dirtySeq) return
        const ids = [...this.#dirtyNodes]
        this.#dirtyNodes.clear()
        this.#dirtySince = 0
        for (const nodeId of ids) {
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

    #seatsPublic() {
        const out = {}
        for (const [seatId, seat] of Object.entries(this.seats)) {
            out[seatId] = {
                seatId,
                name: seat.name,
                sleeve: seat.sleeve,
                mirror: seat.mirror === true,
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

    #releaseSeat(connection, { announce = true } = {}) {
        const me = connection.state
        const seatId = me?.seatId
        if (!seatId) return null
        connection.setState({ ...me, seatId: null })
        if (announce && this.#controllerOf(seatId) == null) this.#broadcastControl(seatId, null)
        return seatId
    }

    #restampOrder(canvas, orderedIds) {
        for (let i = orderedIds.length - 1; i >= 0; i--) {
            const node = canvas.nodes[orderedIds[i]]
            if (!node) continue
            node.ord = canvas.ordNext++
            this.#persistNode(node.nodeId)
        }
    }

    #groupSizesFor(canvas, groupIds) {
        const wanted = new Set([...groupIds].filter(Boolean))
        if (wanted.size === 0) return undefined
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
        let others = 0
        for (const conn of this.getConnections()) {
            if (conn.id !== connection.id) others++
        }

        let intent = 'create'
        try {
            intent = new URL(ctx?.request?.url ?? '').searchParams.get('i') || 'create'
        } catch { }

        if (intent === 'create') {
            if (!this.created) {
                this.created = true
                this.ctx.storage.put('created', true)
            }
        } else if (!this.created && others === 0 && Object.keys(this.canvas.nodes).length === 0) {
            connection.setState({ rejected: true })
            setTimeout(() => { try { connection.close(CLOSE_NO_ROOM, 'room not found') } catch {} }, 100)
            return
        }

        if (others >= LIMITS.connectionsPerRoom) {
            connection.setState({ rejected: true })
            setTimeout(() => { try { connection.close(CLOSE_ROOM_FULL, 'room full') } catch {} }, 100)
            return
        }
        this.#markActivity()
        if (await this.ctx.storage.getAlarm() === null) {
            await this.ctx.storage.setAlarm(Date.now() + LIMITS.idleSweepMs)
        }
    }

    async onAlarm() {
        this.#flushDirty()
        let count = 0
        for (const _ of this.getConnections()) count++
        if (count === 0) {
            await this.ctx.storage.deleteAll()
            return
        }

        // Read from storage: instance fields don't survive a hibernation wake.
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

    #notifyDropped(connection, reason) {
        try { connection.send(JSON.stringify({ kind: 'dropped', reason })) } catch {}
    }

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

    #markActivity() {
        const now = Date.now()
        if (now - this.#lastActivityWrite < ACTIVITY_WRITE_MS) return
        this.#lastActivityWrite = now
        this.ctx.storage.put('lastActivity', now)
    }

    onMessage(connection, message) {
        if (connection.state?.rejected) return
        const size = typeof message === 'string' ? message.length : message.byteLength
        if (size > LIMITS.messageBytes) return this.#notifyDropped(connection, 'size')
        if (!this.#allowMessage(connection)) return

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
        this.#flushDirty()
        this.#rate.delete(connection.id)
        const me = connection.state
        if (!me?.seatId) return
        this.#releaseSeat(connection)
    }

    handleHello(connection, hello) {
        if (!isNodeId(hello.clientId)) return
        if (connection.state?.clientId && connection.state.clientId !== hello.clientId) return

        const prev = connection.state ?? {}
        connection.setState({ clientId: hello.clientId, seatId: prev.seatId ?? null })

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

        if (mySeatId) this.#broadcastControl(mySeatId, hello.clientId)
    }

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

    handleResync(connection) {
        if (!connection.state?.clientId) return
        this.#sendSnapshot(connection)
    }

    #clientIds() {
        const out = new Set()
        for (const conn of this.getConnections()) {
            if (conn.state?.clientId) out.add(conn.state.clientId)
        }
        return [...out]
    }

    handleAction(connection, action) {
        const me = connection.state
        if (!me?.clientId) return
        if (action.clientId !== me.clientId) return

        switch (action.op) {
            case 'seat:create':  return this.handleSeatCreate(connection, action)
            case 'seat:claim':   return this.handleSeatClaim(connection, action)
            case 'seat:release': return void this.#releaseSeat(connection)
            case 'seat:update':  return this.handleSeatUpdate(connection, action)
            case 'seat:destroy': return this.handleSeatDestroy(connection, action)
            case 'seat:hand':    return this.handleSeatHand(connection, action)
            case 'table:reset':  return this.handleTableReset(connection, action)
        }

        const deferred = DEFERRED_OPS.has(action.op)
        if (!deferred) this.#flushDirty()

        const event = this.applyAction(this.canvas, action)
        if (!event) return
        if (deferred) this.#dirtySeq = true
        else this.#persistSeq()
        const skipSender = action.op === 'nodes:move' || action.op === 'nodes:transform'
        this.broadcast(JSON.stringify(event), skipSender ? [connection.id] : undefined)
        if (skipSender) {
            try { connection.send(JSON.stringify({ kind: 'seq', seq: event.seq })) } catch {}
        }
    }

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
                if (!isNodeId(action.targetId) || movingIds.length === 0) return null
                if (typeof action.groupId !== 'string' || !action.groupId || action.groupId.length > 64) return null
                canvas.seq++
                const movingSet = new Set(movingIds)
                const dest = Object.values(canvas.nodes)
                    .filter(n => n.payload?.options?.groupId === action.groupId && !movingSet.has(n.nodeId))
                const target = canvas.nodes[action.targetId]
                if (target && dest.length === 0) dest.push(target)
                const moving = movingIds.map(id => canvas.nodes[id]).filter(Boolean)
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

                const drawn = []
                if (groupId) {
                    const members = Object.values(canvas.nodes)
                        .filter(n => n.type === 'card' && groupIdOf(n) === groupId)
                        .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
                    if (args.nodeId != null) {
                        const one = members.find(n => n.nodeId === args.nodeId)
                        if (one) drawn.push(one)
                    } else if (members.length > 0) {
                        const want = Math.max(1, Math.floor(Number(args.count) || 1))
                        const n = Math.min(want, members.length)
                        drawn.push(...(args.from === 'bottom'
                            ? members.slice(0, n)
                            : members.slice(members.length - n)))
                    }
                }

                canvas.seq++

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

        this.broadcast(JSON.stringify({
            kind: 'event', op: 'seat:create', byClientId: connection.state.clientId,
            seat: this.#seatsPublic()[seat.seatId],
        }))
    }

    handleSeatClaim(connection, action) {
        const me = connection.state
        const seat = this.seats[action.seatId]
        if (!seat) return
        if (me.seatId === seat.seatId) return

        const holder = this.#controllerOf(seat.seatId)
        if (holder != null && holder !== me.clientId) return

        const vacated = this.#releaseSeat(connection, { announce: false })

        connection.setState({ ...me, seatId: seat.seatId })
        seat.lastClientId = me.clientId
        this.#persistSeat(seat.seatId)

        if (vacated && this.#controllerOf(vacated) == null) this.#broadcastControl(vacated, null)
        this.#broadcastControl(seat.seatId, me.clientId)
    }

    handleSeatUpdate(connection, action) {
        const me = connection.state
        if (me.seatId !== action.seatId) return
        const seat = this.seats[action.seatId]
        if (!seat) return

        let changed = false
        if (typeof action.name   === 'string')  { seat.name   = action.name.slice(0, LIMITS.nameChars);     changed = true }
        if (typeof action.sleeve === 'string')  { seat.sleeve = action.sleeve.slice(0, LIMITS.sleeveChars); changed = true }
        if (typeof action.mirror === 'boolean') { seat.mirror = action.mirror;                              changed = true }
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

    handleTableReset(connection, action) {
        this.broadcast(JSON.stringify({
            kind: 'event', op: 'table:reset', byClientId: connection.state.clientId,
        }), [connection.id])
    }

    handleSeatHand(connection, action) {
        const me = connection.state
        if (me.seatId !== action.seatId) return
        const seat = this.seats[action.seatId]
        if (!seat) return

        const hand = this.#sanitizeHand(action.hand)
        if (hand === null) return
        seat.hand = hand
        this.#persistSeat(action.seatId)

        this.broadcast(JSON.stringify({
            kind: 'event', op: 'seat:hand', byClientId: me.clientId,
            seatId: seat.seatId, hand,
        }), [connection.id])
    }

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
