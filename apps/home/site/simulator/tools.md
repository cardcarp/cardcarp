The table ships no toolbar. It gives a UI the tool ids, what's selected, and a verb for each thing on the table. Which of those a UI offers, and what it calls them, is up to the UI.

## Tools

A tool is what the pointer does on the canvas.

```js [tools]
table.tools.ids                  // ['select', 'rect', 'arrow', 'text', 'pan']
table.tools.set('arrow')
table.tools.current.listen((id) => highlight(id))
```

| Id | Does |
| --- | --- |
| `select` | Picks things up, moves them, and box-selects |
| `rect` | Draws a rectangle |
| `arrow` | Draws an arrow between two points |
| `text` | Places an editable text label |
| `pan` | Drags the view |

Cards, dice, counters, boards and markers aren't tools. They're placed by verbs, or dealt from the config. See [Table layout](/simulator/stage).

## The selection

Most verbs act on what's selected, so a UI usually reads `selection.current` to decide which controls to show.

```js [selection]
table.selection.current.listen((selection) => showToolbarFor(selection))

table.selection.delete()
table.selection.align('left')      // 'left' | 'right' | 'top' | 'bottom'
table.selection.moveZ(1)           // 1 forward, -1 back, or 'bottom'
```

## Cards

```js [cards]
const deck = table.cards.buildDeck(record.list)    // { group: [card, …] } from { group: { id: qty } }
table.cards.addDeck(deck, cardConfig, x, y)         // x, y optional
table.cards.add(card, cardConfig, x, y)

const groupId = table.cards.selectedGroupId()
table.cards.shuffle(groupId)
table.cards.draw({ groupId, count: 7, from: 'top', to: 'hand' })

table.cards.flip()                 // the selected cards
table.cards.rotate('cw')           // or 'ccw'
table.cards.group()                // stack the selection into one pile
table.cards.ungroup()
table.cards.sendToHand()
```

`cardConfig` is core's `card_config`: the game's name and card size, kept small because it travels with every card to the room. A pile is a group, and `groupId` names it. `buildDeck` skips any card the manifest doesn't have, so a deck with a missing card deals short instead of failing.

## Dice, counters and markup

```js [pieces]
table.dice.roll()                  // the selected dice
table.dice.increment()
table.counters.decrement()

table.rects.changeColor(color)
table.arrows.changeColor(color)
table.text.changeColor(color)
```

Online, the relay picks each die's result, so every player sees the same roll.

## Accessories

`accessories.list(config)` returns the game's accessories with their image URLs resolved, ready for a picker. `adderFor(item)` returns the function that places one.

```js [accessories]
for (const item of table.accessories.list(config)) {
    button(item.name, item.thumbnail, () => table.accessories.adderFor(item)(item, x, y))
}
```

## The view

```js [view]
table.view.zoom(1)                          // in; -1 out
const point = table.view.clientToWorld(event.clientX, event.clientY)
table.view.scale()
```

`clientToWorld` is what a UI uses to drop something where the pointer is, like a card dragged in from a list.

## Scenery

Playmats and seat chips can be hidden or locked in place, so they aren't picked up by accident.

```js [scenery]
table.scenery.togglePlaymatsLocked()
table.scenery.playmatsLocked.listen((locked) => render(locked))
```

The same pair exists for chips: `toggleChipsHidden`, `toggleChipsLocked`, `chipsHidden` and `chipsLocked`.

## Resetting

`table.reset()` clears the table and deals every seat's kit again. Online, it resets the table for everyone in the room, and each player's UI hears a `reset` event.
