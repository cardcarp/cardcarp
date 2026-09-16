// The relay socket keeps the promises multiplayer.js leans on — the ones @vueuse/core's
// useWebSocket kept before it: a heartbeat that notices a dead line, reconnection that knows when
// to stop, sends that wait for the socket, and a close that stays closed.
// Run: node packages/simulator/src/socket.test.mjs

import { createSocket } from './socket.js'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? '  ok  ' : '  FAIL'} ${name}${detail ? `  (${detail})` : ''}`)
}

// A clock the test moves by hand.
function manualClock() {
    let now = 0
    let nextId = 1
    const pending = new Map()
    const add = (fn, ms, every) => {
        const id = nextId++
        pending.set(id, { at: now + ms, fn, every })
        return id
    }
    return {
        setTimeout: (fn, ms) => add(fn, ms, 0),
        clearTimeout: (id) => { pending.delete(id) },
        setInterval: (fn, ms) => add(fn, ms, ms),
        clearInterval: (id) => { pending.delete(id) },
        tick(ms) {
            const until = now + ms
            for (;;) {
                let due = null
                for (const [id, t] of pending) if (t.at <= until && (!due || t.at < due[1].at)) due = [id, t]
                if (!due) break
                const [id, t] = due
                now = t.at
                if (t.every) t.at += t.every
                else pending.delete(id)
                t.fn()
            }
            now = until
        },
    }
}

// A WebSocket the test plays the relay for.
function fakeSockets() {
    const made = []
    class FakeSocket {
        constructor(url) { this.url = url; this.sent = []; this.closedWith = null; made.push(this) }
        send(data) { this.sent.push(data) }
        close(code = 1000) { this.closedWith = code }
        accept() { this.onopen?.() }
        say(data) { this.onmessage?.({ data }) }
        drop(code = 1006) { this.onclose?.({ code }) }
    }
    return { FakeSocket, made }
}

// Wired the way multiplayer.js wires it: hello on connect, 4xxx closes never retried.
function relayClient({ unloadTarget = null } = {}) {
    const clock = manualClock()
    const { FakeSocket, made } = fakeSockets()
    const log = []
    let lastCode = 0
    const socket = createSocket('ws://relay/parties/room/ABCDEFG', {
        heartbeat: { message: 'ping', responseMessage: 'pong', interval: 25000, pongTimeout: 10000 },
        autoReconnect: { retries: (retried) => retried < 5 && lastCode < 4000, delay: 2000 },
        onConnected: () => { log.push('connected'); socket.send('hello') },
        onDisconnected: (_ws, event) => { lastCode = event?.code ?? 0; log.push(`disconnected ${lastCode}`) },
        onMessage: (_ws, event) => log.push(`message ${event.data}`),
        WebSocket: FakeSocket,
        timers: clock,
        unloadTarget,
    })
    return { socket, clock, made, log }
}

console.log('\nopening')
{
    const { socket, made, log } = relayClient()
    ok('opens straight away', made.length === 1 && made[0].url.endsWith('/ABCDEFG'))
    socket.send('early action')
    ok('a send before the socket opens waits', made[0].sent.length === 0)
    made[0].accept()
    ok('and goes out first once it does, ahead even of the hello', JSON.stringify(made[0].sent) === '["early action","hello"]', JSON.stringify(made[0].sent))
    ok('onConnected ran', log.includes('connected'))
}

console.log('\nheartbeat')
{
    const { clock, made, log } = relayClient()
    made[0].accept()
    clock.tick(25000)
    ok('pings once the interval passes', made[0].sent.at(-1) === 'ping')
    made[0].say('pong')
    ok('the pong is swallowed, not handed on', !log.includes('message pong'))
    clock.tick(10000)
    ok('an answered ping keeps the socket', made[0].closedWith === null)
    made[0].say('{"kind":"seq"}')
    ok('ordinary messages are handed on', log.includes('message {"kind":"seq"}'))

    clock.tick(15000)   // t=50s: the next ping, which nobody answers
    clock.tick(9999)
    ok('an unanswered ping waits out the timeout', made[0].closedWith === null)
    clock.tick(1)
    ok('then closes the socket cleanly', made[0].closedWith === 1000)
    made[0].drop(1000)
    clock.tick(2000)
    ok('and reconnects after the delay, like any blip', made.length === 2)
}
{
    const { clock, made } = relayClient()
    made[0].accept()
    clock.tick(25000)   // ping; the pong timer is armed
    clock.tick(5000)
    made[0].say('{"kind":"event"}')
    clock.tick(9000)
    ok('table traffic counts as a sign of life', made[0].closedWith === null)
}

console.log('\nreconnecting')
{
    const { clock, made } = relayClient()
    made[0].accept()
    for (let i = 0; i < 6; i++) { made.at(-1).drop(1006); clock.tick(2000) }
    ok('a line that keeps dropping is retried five times, then left', made.length === 6, `${made.length} sockets`)
}
{
    const { clock, made } = relayClient()
    made[0].accept()
    made[0].drop(1006)
    clock.tick(2000)
    made[1].accept()
    for (let i = 0; i < 6; i++) { made.at(-1).drop(1006); clock.tick(2000) }
    ok('a successful reopen resets the count', made.length === 7, `${made.length} sockets`)
}
{
    const { clock, made, log } = relayClient()
    made[0].accept()
    made[0].drop(4004)
    clock.tick(10000)
    ok('a deliberate refusal (4xxx) is not retried', made.length === 1 && log.includes('disconnected 4004'))
}

console.log('\nclosing')
{
    const { socket, clock, made } = relayClient()
    made[0].accept()
    socket.close()
    ok('close() closes cleanly', made[0].closedWith === 1000)
    made[0].drop(1000)
    clock.tick(10000)
    ok('and nothing reconnects after it', made.length === 1)
}
{
    const { socket, clock, made } = relayClient()
    made[0].accept()
    made[0].drop(1006)   // a blip — a retry is now waiting
    socket.close()       // the player goes offline in the gap
    clock.tick(10000)
    ok('close() in the gap cancels the waiting retry', made.length === 1)
}
{
    const listeners = {}
    const unloadTarget = {
        addEventListener: (name, fn) => { listeners[name] = fn },
        removeEventListener: (name, fn) => { if (listeners[name] === fn) delete listeners[name] },
    }
    const { socket, clock, made } = relayClient({ unloadTarget })
    made[0].accept()
    clock.tick(35000)    // ping, no answer, closed by the heartbeat
    made[0].drop(1000)
    clock.tick(2000)
    made[1].accept()
    ok('a heartbeat close keeps listening for the page unloading', typeof listeners.beforeunload === 'function')
    listeners.beforeunload()
    ok('and the page unloading closes the socket', made[1].closedWith === 1000)
    ok('which is final, so it stops listening', listeners.beforeunload === undefined)
    socket.close()
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
