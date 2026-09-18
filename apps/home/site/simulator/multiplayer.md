Multiplayer is a Cloudflare Worker with a Durable Object per room, and the client that talks to it lives in the simulator package. The relay is a thin echo server: it holds canonical canvas state for a room and enforces no game rules whatsoever. Players self-police.

## Pointing at one

The origin is a build-time value. Vite inlines `import.meta.env` and never reads it at runtime, so setting it as a Worker secret or a runtime binding does nothing — it belongs wherever that build's environment variables are set.

```dotenv [.env]
# A BARE origin. No path, no trailing slash.
VITE_MULTIPLAYER_WS_URL=https://cardcarp-relay.example.workers.dev
```

It must be a bare origin, because everything in the table appends its own path to it — `/room/new`, `/token`, `/parties/room/<code>`. Pasting an endpoint URL instead, which is the obvious thing to copy out of a browser or a curl command, silently produces requests that match no route on the relay: a dead multiplayer tab, and nothing in the console to say why. The client normalises the value defensively for exactly that reason.

Unset, it falls back to `ws://localhost:8787` — which is what the relay's own dev server serves, so local development needs no configuration at all.

## Limits

The relay's cost is driven by incoming WebSocket messages (billed as requests at 20:1) and by wall-clock duration whenever the Durable Object is awake — any incoming message wakes a hibernated DO, and it re-hibernates after about ten seconds of quiet. The caps bound what one room, or one hostile client, can cost.

```js [apps/relay/src/room.js]
connectionsPerRoom: 8            // extra sockets are refused
messageBytes:       512 * 1024   // biggest legit message is a deck:create
nodesPerRoom:       1500         // two big decks plus accessories
nodePayloadBytes:   8 * 1024     // ONE node's payload — a real card is under 2 KB
seatsPerRoom:       8
handEntries:        200
msgsPerSecond:      15           // sustained, per connection
```

## The one that will catch you

`nodePayloadBytes` is 8 KB per node, and a payload over it is dropped server-side in silence — no error, no rejection, just a card that exists on the host's table and on nobody else's.

A real card record is well under 2 KB, so this only bites when something oversized gets embedded in a node payload by accident. The known case: a card payload that carried the game's whole set list weighed about 60 KB, and every node built from it vanished on the way out. If an object appears locally and never arrives for the other players, measure the payload first.

## What the relay does not do {#what-it-does-not-do}

It has no notion of turns, legality, hands you may not look at, or winning. It moves objects and shares those movements. Anything resembling a rules engine is the host's to build on top, or the players' to agree between themselves — which is the ceiling this package is deliberately built under.
