// PartyServer-routed Worker entry. `routePartykitRequest` parses URLs of the shape
//   /parties/<lowercased-class-name>/<roomId>
// and routes the WebSocket upgrade to the right Room DO instance.
//
// Clients connect at:  wss://<worker>/parties/room/<code>?e=<expiry>&t=<ticket>
//
// Cost gate: waking a Durable Object bills a request plus active duration, and every
// distinct room code names a distinct DO. Everything rejected in this file is rejected in
// the stateless Worker, where a rejection is nearly free, instead of inside the DO. Three
// gates, cheapest first:
//
//   1. Shape       — junk paths and non-WebSocket requests (scanners, crawlers).
//   2. Rate limit  — per-IP ceiling on room joins, so one host cannot fan out into
//                    thousands of DOs. This is the defence against a bot spinning up
//                    rooms to run up the bill; the DO's own limits are all per-room and
//                    therefore blind to that attack.
//   3. Ticket      — an HMAC over (intent, room, expiry). Two intents exist:
//                      create — issued only by /room/new, only for a code this Worker
//                               generated. The Room DO takes this as permission to bring
//                               a room into existence.
//                      join   — issued by /token for any well-formed code. The Room DO
//                               refuses it when the room was never created.
//                    The intent lives inside the signature, so flipping ?i=join to
//                    ?i=create in the URL simply fails to verify. Together this is what
//                    makes "rooms only come from Start a Table" enforceable: a scripted
//                    client cannot conjure a room at a code of its own choosing.
//
// The rate limit here is the primary cost control, not a backup: the zone is on
// Cloudflare's free plan, where a WAF rate limiting rule is capped at a 10-second window
// and a 10-second block — enough to blunt a flood at the edge, not enough to gate anything.
// None of it stops a distributed botnet either, since many IPs defeat a per-IP limit;
// billing alerts are the backstop for that (see README).

import { routePartykitRequest } from 'partyserver'
export { Room } from './room.js'

// Must stay in sync with the room-code rules in frontend multiplayer.js (ROOM_CODE_MIN /
// normalizeRoomCode). The 7-character floor is load-bearing: connecting to a code is what
// creates the room, so without it a hand-typed `test` mints a permanently public table
// that anyone can walk into. Generated codes are exactly 7 ("ABCDEFG").
//
// Letters and digits only — the old format's dash is gone, and the client strips it from
// typed input rather than passing it through (normalizeRoomCode), so nothing legitimate ever
// arrives here carrying one.
const ROOM_CODE_MIN = 7
const ROOM_PATH = /^\/parties\/room\/([A-Za-z0-9]{7,32})$/

// Long enough that a ticket never expires mid-session — vueuse's autoReconnect replays the
// original URL, so a short TTL would break reconnects after a network blip. The ticket is
// a speed bump on room creation, not a credential guarding anything secret, so buying
// reconnect robustness with a generous lifetime is the right trade.
const TICKET_TTL_MS = 12 * 60 * 60 * 1000

const textRes = (body, status, extra = {}) =>
    new Response(body, { status, headers: { 'content-type': 'text/plain', ...extra } })

const jsonRes = (body, status, extra = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } })

// The mint endpoint is called cross-origin from the game frontend. A ticket is not tied to
// a user or session — it only says "this room code passed through the mint" — so there is
// nothing to protect with an origin allowlist that a direct request could not bypass anyway.
const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
}

// === Ticket signing ===

let cachedKey = { secret: null, key: null }
async function hmacKey(secret) {
    if (cachedKey.secret !== secret) {
        cachedKey = {
            secret,
            key: await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(secret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign', 'verify'],
            ),
        }
    }
    return cachedKey.key
}

const b64url = (buf) => {
    let s = ''
    for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const unb64url = (str) => {
    const s = str.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4))
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

// The intent is inside the signed body, which is what makes the creation gate real: a
// client can flip `?i=join` to `?i=create` in the URL all it likes, but the signature then
// fails to verify and the request never reaches a Durable Object. Only /room/new issues a
// ticket bearing `create`, and only for a code this Worker chose itself.
const INTENTS = new Set(['create', 'join'])
const ticketBody = (intent, room, exp) => new TextEncoder().encode(`${intent}:${room}:${exp}`)

async function mintTicket(secret, intent, room, exp) {
    return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), ticketBody(intent, room, exp)))
}

// crypto.subtle.verify compares in constant time — don't swap this for a string ===.
async function ticketValid(secret, room, url) {
    const intent = url.searchParams.get('i')
    const exp = Number(url.searchParams.get('e'))
    const token = url.searchParams.get('t')
    if (!INTENTS.has(intent)) return false
    if (!token || !Number.isFinite(exp) || exp < Date.now()) return false
    try {
        return await crypto.subtle.verify(
            'HMAC', await hmacKey(secret), unb64url(token), ticketBody(intent, room, exp),
        )
    } catch {
        return false // malformed base64 — treat as a bad ticket, not a 500
    }
}

// === Room codes ===
// Generated here rather than in the browser so a room can only ever exist at a code the
// relay picked. Must stay in sync with normalizeRoomCode in frontend multiplayer.js.
// 256 % 32 === 0, so reducing a byte with % 32 is uniform.
// No separator — see the note in frontend multiplayer.js. 7 picks from 32 symbols is
// ~34.4 billion codes (35 bits), up from ~1.07 billion when one of the seven characters was
// a fixed dash.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 7
function newRoomCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
    let s = ''
    for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length]
    return s
}

// === Rate limiting ===

// Fails open on a missing binding (so `wrangler dev` and any environment without the
// binding still work) and on a limiter error (so a limiter outage cannot take the game
// down). Both are deliberate: this is a cost guard, not an access-control boundary.
async function underLimit(limiter, request) {
    if (!limiter?.limit) return true
    try {
        const { success } = await limiter.limit({
            key: request.headers.get('CF-Connecting-IP') ?? 'unknown',
        })
        return success
    } catch {
        return true
    }
}

// === Routes ===

// Join ticket for an existing room. Freely available for any well-formed code — holding
// one proves nothing about whether the room exists, which is precisely why the Room DO
// still turns a join away when the room was never created.
async function handleMint(request, env, url) {
    // Same floor as ROOM_PATH — minting a ticket the upgrade would reject anyway just
    // trades a clear 400 here for a confusing 403 one round-trip later.
    const room = (url.searchParams.get('room') ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 32)
    if (room.length < ROOM_CODE_MIN) return jsonRes({ error: 'room code too short' }, 400, CORS)
    if (!await underLimit(env.TICKET_LIMITER, request)) return jsonRes({ error: 'rate limited' }, 429, CORS)

    // No secret configured → ticket checks are off. Say so plainly so the client knows to
    // connect without one rather than retrying a mint that will never produce a ticket.
    if (!env.ROOM_TICKET_SECRET) return jsonRes({ enforced: false, i: 'join' }, 200, CORS)

    const exp = Date.now() + TICKET_TTL_MS
    return jsonRes({
        enforced: true, i: 'join', e: exp,
        t: await mintTicket(env.ROOM_TICKET_SECRET, 'join', room, exp),
    }, 200, CORS)
}

// The only source of create tickets, and it picks the code itself — a caller cannot ask
// for one at a code of their choosing. This is what makes "rooms only come from Start a
// Table" enforceable rather than merely conventional.
async function handleNewRoom(request, env) {
    if (!await underLimit(env.TICKET_LIMITER, request)) return jsonRes({ error: 'rate limited' }, 429, CORS)

    const code = newRoomCode()
    if (!env.ROOM_TICKET_SECRET) return jsonRes({ enforced: false, code, i: 'create' }, 200, CORS)

    const exp = Date.now() + TICKET_TTL_MS
    return jsonRes({
        enforced: true, code, i: 'create', e: exp,
        t: await mintTicket(env.ROOM_TICKET_SECRET, 'create', code, exp),
    }, 200, CORS)
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)

        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
        if (url.pathname === '/room/new') return handleNewRoom(request, env)
        if (url.pathname === '/token') return handleMint(request, env, url)

        const match = ROOM_PATH.exec(url.pathname)
        if (!match) {
            return textRes('cardcarp relay — connect via /parties/room/<code>\n', 404)
        }
        if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
            return textRes('WebSocket upgrade required\n', 426)
        }
        if (!await underLimit(env.ROOM_LIMITER, request)) {
            return textRes('rate limited\n', 429)
        }
        // Enforcement is OFF while ROOM_TICKET_SECRET is unset — deploying this file
        // without setting the secret leaves rooms open to anyone, exactly as before.
        if (env.ROOM_TICKET_SECRET && !await ticketValid(env.ROOM_TICKET_SECRET, match[1], url)) {
            return textRes('invalid or expired room ticket\n', 403)
        }

        return (await routePartykitRequest(request, env))
            ?? textRes('not found\n', 404)
    },
}
