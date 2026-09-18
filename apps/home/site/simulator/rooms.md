A room is a shared table on the relay, reached by a code. The table plays offline by default. Starting or joining a room connects it, and everything on it is shared from then on.

See [The relay](/simulator/multiplayer) for pointing the table at a relay.

## Starting and joining

```js [room]
const code = await table.room.start()      // make a room, and join it
table.room.connect('K7M2QXP')              // join one by code
table.room.disconnect()
```

- **Start** asks the relay for a new room. The relay picks the code, so a room can't be created at a code you chose.
- **Connect** joins a room that already exists.
- **Disconnect** leaves the room. You keep a local copy of the table and its seats, and play on offline.

Joining a room that nothing has happened in yet sends your table up to become the room's. Joining any other room replaces your table with the room's. Unmounting the table also leaves the room.

## Room codes

Codes are 7 characters, from letters and digits that are hard to misread: no `I`, `O`, `0` or `1`.

```js [codes]
table.room.normalizeCode('abc-defg')   // 'ABCDEFG'
table.room.isValidCode('ABC')          // false
table.room.CODE_MIN                    // 7
```

Pass what a player types through `normalizeCode` before showing it back. It uppercases the code and drops spaces and dashes, and `connect` does the same. Without it, `abcdefg` would be a different room from `ABCDEFG`, since the relay treats codes as case-sensitive.

## Connection state

```js [status]
table.room.status.listen((status) => render(status))   // 'disconnected' | 'connecting' | 'connected'
table.room.code.get()
table.room.error.listen((message) => message && toast(message))
```

A dropped connection reconnects on its own. If the relay turns a connection away, like a full room or too many attempts, `error` says why.

## Tickets

When the relay has a secret set, a connection needs a short-lived ticket. The table gets one for you: `start` receives it with the new code, and `connect` fetches one from `/token`. A relay with no secret needs no ticket.

Pass a ticket to `connect` yourself only if your host mints them some other way.

## What's shared

Everything on the canvas, every seat, and every hand. The relay stores the table and hands it to each player who joins. It enforces no rules. See [What the relay does not do](/simulator/multiplayer#what-it-does-not-do).

A room holds up to 8 connections. The other limits, and the one that silently drops oversized cards, are on [The relay](/simulator/multiplayer#limits).
