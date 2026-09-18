The right panel is where a player keeps decks. **Saved** lists them. **Build** is the one being edited.

## Where decks are kept

Decks live in the browser, in the `profile` key of `localStorage`, separately for each game. Nothing is sent to a server, and nothing is shared between browsers.

Every game starts with one deck, **Storage**. It's meant for tracking a whole collection: it's always listed first, can't be deleted, and has no details.

```js [profile — localStorage]
{
    storage: { wow: { id: 'storage', name: 'Storage', total: 0, list: { main: {} } } },
    game:    { wow: [{ id: 1, name: 'Emerald Dream', total: 60, list: { hero: {…}, main: {…} } }] },
}
```

A saved deck has the same shape as a published one: `list` maps each deck group to card ids and quantities. To make a published deck your own, open it under Deck List and use **Save as deck**.

## Building

- **Add cards** by dragging them from the center onto a group in the build. Dragging is only on while the build is open, so on a phone the grid scrolls normally the rest of the time.
- **Change quantities, move cards between groups, or remove them** from the build list.
- **Load a deck** by picking it under Saved. If the current build has unsaved changes, you're asked to save, discard or cancel first.
- **Start from the center's results.** **Save as deck** turns the filtered cards into a new deck.
- **Duplicate** copies the build into a new saved deck. **Save** writes the build over its own record.

## Deck groups

Groups are the parts of a deck, like hero, main and side. A game declares them in `deck.json`.

```json [deck.json]
"group": {
    "list":    ["hero", "main", "side", "draft"],
    "default": ["hero", "main"]
}
```

- **`list`** is every group, in display order.
- **`default`** is what a new deck shows.
- **`main`** is where a card goes when no group is named. It's always shown.

A loaded deck shows the groups its cards use. Others can be turned on from the build's View menu. Turning off a group that still has cards removes those cards, so it asks first.

## Details

A saved deck has a name, a tagline, a highlight card for its thumbnail, and notes. They're edited in the Details dialog, which asks before closing with unsaved edits.

## Import

Import reads the same text Export writes, one card per line. Group headers put the following cards into that group.

```text [deck list]
Main: 4
4 Pikachu base 058

Side: 1
1 Jirachi xy-black-star 067a
```

A line that doesn't match a card is skipped and listed afterwards, so a list with two typos still imports the rest. Cards the build already has are added to, not duplicated. See [Card data](/deckbox/card-model) for how a line finds its card.
