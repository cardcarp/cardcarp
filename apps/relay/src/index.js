import { routePartykitRequest } from 'partyserver'
export { Room } from './room.js'

const ROOM_CODE_MIN = 7
const ROOM_PATH = /^\/parties\/room\/([A-Za-z0-9]{7,32})$/

const TICKET_TTL_MS = 12 * 60 * 60 * 1000

const textRes = (body, status, extra = {}) =>
    new Response(body, { status, headers: { 'content-type': 'text/plain', ...extra } })

const jsonRes = (body, status, extra = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } })

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
}

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

const INTENTS = new Set(['create', 'join'])
const ticketBody = (intent, room, exp) => new TextEncoder().encode(`${intent}:${room}:${exp}`)

async function mintTicket(secret, intent, room, exp) {
    return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), ticketBody(intent, room, exp)))
}

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
        return false
    }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 7
function newRoomCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
    let s = ''
    for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length]
    return s
}

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

async function handleMint(request, env, url) {
    const room = (url.searchParams.get('room') ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 32)
    if (room.length < ROOM_CODE_MIN) return jsonRes({ error: 'room code too short' }, 400, CORS)
    if (!await underLimit(env.TICKET_LIMITER, request)) return jsonRes({ error: 'rate limited' }, 429, CORS)

    if (!env.ROOM_TICKET_SECRET) return jsonRes({ enforced: false, i: 'join' }, 200, CORS)

    const exp = Date.now() + TICKET_TTL_MS
    return jsonRes({
        enforced: true, i: 'join', e: exp,
        t: await mintTicket(env.ROOM_TICKET_SECRET, 'join', room, exp),
    }, 200, CORS)
}

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
        if (env.ROOM_TICKET_SECRET && !await ticketValid(env.ROOM_TICKET_SECRET, match[1], url)) {
            return textRes('invalid or expired room ticket\n', 403)
        }

        return (await routePartykitRequest(request, env))
            ?? textRes('not found\n', 404)
    },
}
