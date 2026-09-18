A seat is a place at the table: a name, a sleeve color, a position, and a hand. A player sits in one seat at a time. Seats outlive whoever is sitting in them, so a hand stays put when its player leaves.

## Seats and players

- **A seat** is part of the table. It's saved with the table and shared with the room.
- **A player** is a browser, with an id kept in `localStorage`. It's never shown and is only used to settle who controls which seat.

A seat nobody is sitting in is a **goldfish**: its hand and cards stay on the table for anyone to pick up. That's how one person can play both sides, and how a player can take over a hand someone else left.

## Reading seats

```js [seats]
table.seats.roster.listen((rows) => renderSeatList(rows))
table.seats.myId.get()
table.seats.count.get()
table.seats.canAdd.get()          // false at 8 seats
```

Each row of `roster` is a seat plus what this player can do with it:

| Field | What it is |
| --- | --- |
| `seatId` | The seat's id |
| `name`, `sleeve` | Its name and card sleeve color |
| `anchor` | Where its chip sits on the table |
| `mirror` | Whether it views the table from the far end |
| `hand` | Its hand entries |
| `mine` | This player is sitting here |
| `free` | Nobody is sitting here |
| `removable` | This player may remove it |

`mySleeve` and `myMirror` are shortcuts for the seat you're sitting in.

## Changing seats

```js [seats]
const seatId = table.seats.add({ name: 'Goldfish' })   // name and sleeve optional
table.seats.claim(seatId)                               // sit down
table.seats.update(seatId, { name: 'Ash', sleeve: '#c0392b' })
table.seats.setMyMirror(true)                           // view from the far end
table.seats.remove(seatId)
```

- **Adding** a seat deals it the game's kit, like its playmat and dice. New seats take the next color from the theme's `seats` palette and alternate ends of the table.
- **Claiming** a seat gives you its hand. Online, the relay decides, so two players reaching for the same seat can't both get it.
- **Updating** works on any seat offline. Online, the relay only accepts changes to the seat you're in.
- **Removing** a seat destroys its hand, so you can only remove a free seat, or your own when there's a free one to move to. The last seat can't be removed.

The view follows your seat. Claiming a seat at the other end flips the table and centers it on that seat's chip.

## The hand

The hand belongs to the seat you're in. The table stores it. Drawing the hand is the UI's job.

```js [hand]
table.hand.cards.listen((entries) => renderHand(entries))

table.hand.setFocus(entry.handEntryId)     // the card the pointer is over
table.hand.flip(entry.handEntryId)         // play it face down, or face up
table.hand.flipFocused()

const { x, y } = table.view.clientToWorld(event.clientX, event.clientY)
table.hand.drop(entry, cardConfig, x, y)   // play it onto the table
```

A hand entry is the card's record plus `handEntryId` and `faceDown`. Flipping only changes how the card will land. The flag is carried onto the table when it's dropped.

`showFootprint` and `hideFootprint` draw the card's outline on the table while it's being dragged out of the hand.

## Offline and online

Offline, seats are saved in `localStorage` and every change applies right away. Online, each change is a request the relay applies and sends to everyone. When you leave a room, its seats are copied into local storage, so you keep the game you were playing.

**Hands aren't secret.** Online, every player's browser holds every seat's hand, so a hand can follow its seat to whoever claims it. Only your own is drawn, but anyone who opens the dev tools can read the rest. Face-down cards on the table work the same way. Hidden information is a display convention, not a guarantee.
