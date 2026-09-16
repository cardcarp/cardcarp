# cardcarp relay

WebSocket relay for the table view. One Durable Object per room code; canvas state is
write-through persisted so hibernation wakes are invisible. Wire protocol is documented at
the top of [`src/room.js`](src/room.js); the request gates are documented at the top of
[`src/index.js`](src/index.js).

```bash
npm run dev      # wrangler dev on :8787
npm run deploy
npm run tail     # live logs
```

## Abuse & cost posture

The thing that can actually hurt is **room fan-out**. Every distinct room code names a
distinct Durable Object, DO duration is billed at 128 MB × wall-clock, and *every limit
inside `room.js` is per-room* — so a bot opening thousands of rooms, or holding thousands
of sockets barely-awake, walks straight past all of them. The mitigations below are
layered cheapest-first, so abuse is rejected before it can instantiate a DO.

Note the two plans in play: Durable Objects require **Workers Paid**, while the zone sits
on the **free plan**. That split is why the Worker-side limiter carries this rather than the
WAF — zone features are the constrained half, and Workers spend is the exposed half.

### 1. Billing notifications (do this first)

Cloudflare has no hard spend cap on Workers — an unattended attack bills until someone
notices. Dashboard → Manage Account → **Notifications** → add a *Billing usage* alert.
This is what converts a bad weekend into a text message, and it is the only mitigation
here that works against a distributed botnet.

### 2. Per-IP rate limiting in the Worker — the primary control

Already wired: the `ROOM_LIMITER` (60/min) and `TICKET_LIMITER` (120/min) bindings in
[`wrangler.jsonc`](wrangler.jsonc), checked in `src/index.js` before anything routes to a
Durable Object. This is where the real work happens, and it is plan-independent — it comes
with Workers, not with the zone.

Both limiters **fail open**: a missing binding or a limiter error lets the request through.
That is deliberate — a cost guard should never be able to take the game down — but since
this is the load-bearing control, it is worth knowing.

Tune the numbers there; see the sizing note in the config for the shared-NAT tradeoff.

### 3. One WAF rate limiting rule (dashboard — not in this repo)

On the **free plan** this is a coarse outer net, not the main defence: you get one Domain
rule, a fixed 10-second window, and a fixed 10-second block. Set it above what the Worker
already permits, so it only ever fires on traffic the Worker was rejecting anyway — pure
saved invocations, no new false positives.

Dashboard → your zone → **Security → WAF → Rate limiting rules** → Create:

| Field | Value |
| --- | --- |
| Expression | `(http.request.uri.path contains "/parties/room/") or (http.request.uri.path eq "/room/new") or (http.request.uri.path eq "/token")` |
| Characteristics | *IP* (NAT-aware keys are a paid feature) |
| Period | 10 seconds |
| Requests | 50 |
| Action | Block |
| Duration | 10 seconds |

If the relay lives on its own hostname, `http.host eq "relay.example.com"` is a simpler
expression that covers every route at once. And if the free-plan rule builder won't take a
compound expression, drop the `or` clauses and keep only `/parties/room/` — that is the
path that instantiates Durable Objects, so it is the one worth the single rule.

**Why 50.** The Worker's own ceilings are ~10 upgrades and ~20 mints per 10 seconds, so a
client the Worker tolerates never exceeds ~30. Fifty leaves headroom above that while still
catching a genuine flood. Worst legitimate burst is a reconnect storm — vueuse retries a
dropped socket 5 times at 2-second intervals — which is nowhere near it.

**Use Block, not Managed Challenge.** A WebSocket handshake cannot complete a challenge, so
challenging this route just breaks real players.

A 10-second block does not stop a determined attacker; it halves their throughput and costs
them nothing to wait out. That is fine — its job here is to blunt large floods at the edge
for free, while the Worker limiter does the precise work and billing alerts catch anything
that slips past both.

On a paid plan, revisit this: a 1-minute window at 60 requests with a 10-minute block turns
this from a speed bump into a real gate, and a second rule can cover the mint endpoints
separately.

### 4. Batch bounding

`boundEntries` in `room.js` caps and de-duplicates every caller-supplied array before it
reaches storage. Without it, one legal-sized message repeating a single `nodeId` thousands
of times became thousands of storage writes. Also halves normal-play write volume, since
`seq` is now stamped once per action instead of once per node.

### 5. Signed tickets and the room creation gate

Rooms can only be created by the app's own *Start a Table*, and only at a code the relay
picked. Two endpoints, two intents, both covered by the signature:

| | Issued by | Room code chosen by | Lets you |
| --- | --- | --- | --- |
| `create` | `GET /room/new` | the relay | bring a room into existence |
| `join` | `GET /token?room=…` | the caller | enter a room that already exists |

The intent sits *inside* the signed body, so editing `?i=join` to `?i=create` in the URL
simply fails to verify and never reaches a Durable Object. The Room DO keeps a `created`
marker in storage; a `join` arriving at a room with no marker, no players and no canvas is
closed with **4004**, which the client surfaces as *"That room code isn't active."*

The marker lives and dies with the room — the idle sweep's `deleteAll` clears it, so a
swept code stops existing rather than lingering as a joinable ghost.

What this does **not** stop is calling `/room/new` in a loop; that is bounded by rate
limiting, not by this. What it stops is creating a room at a code of your choosing.

Enable by setting the secret:

```bash
npx wrangler secret put ROOM_TICKET_SECRET
```

For local dev, put it in `relay-server/.dev.vars` (gitignored):

```
ROOM_TICKET_SECRET=local-dev-only-not-a-real-secret
```

**Signature checking is off while the secret is unset** — `src/index.js` skips it entirely,
so deploying without setting it leaves rooms open exactly as before. That fail-open is
intentional (it lets the code ship before the secret, and keeps older clients working), but
it means *setting the secret is the step that actually turns this on.*

The creation gate still functions without a secret, because the DO reads the intent either
way — it is simply forgeable then, since nothing proves the intent wasn't edited. The
secret is what makes it unforgeable.

Tickets last 12 hours. That is deliberately generous: vueuse's `autoReconnect` replays the
original URL, so a short TTL would break reconnects after a network blip. A ticket is a
speed bump on room creation, not a credential guarding anything secret.

This raises the bar rather than closing the door — an attacker can still mint tickets, they
just have to pay a rate-limited round-trip per room to do it.

### What this does not cover

- **Distributed botnets.** Per-IP limits are per-IP. Billing alerts are the backstop.
- **Hibernation denial.** A slow drip (one message every ~9s) keeps a DO awake without ever
  tripping the 15 msg/s bucket. The room limiter caps how many rooms one IP can open, which
  bounds it, but it is not directly defended against.

## Testing with enforcement on

Anything that opens a bare WebSocket (protocol test scripts, `websocat`, etc.) needs a
ticket once the secret is set. Create a room and connect with what it hands back:

```bash
curl -s localhost:8787/room/new
# {"enforced":true,"code":"ABC-DEF","i":"create","e":1234567890,"t":"…"}
# then connect to  /parties/room/ABC-DEF?i=create&e=…&t=…
```

Joining an existing room uses `GET /token?room=ABC-DEF` the same way. Note the intent must
be in the query too — a ticket without `?i=` fails to verify. Or drop `.dev.vars` to test
against an unenforcing relay.
